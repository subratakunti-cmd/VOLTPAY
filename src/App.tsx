/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, sendEmailVerification, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ActiveTab,
  PaymentMethodType,
  PlanCategory,
  RechargePlan,
  RechargeTransaction,
  RegionCode,
  SavedContact,
} from './types/recharge';
import {
  CARRIERS,
  detectCarrierForNumber,
  INITIAL_SAVED_CONTACTS,
  INITIAL_TRANSACTIONS,
  RECHARGE_PLANS,
  REGIONS,
} from './data/carriersAndPlans';
import { formatCurrency, formatPhoneDisplay } from './utils/formatters';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { Header } from './components/Header';
import { FrontHeroSection } from './components/FrontHeroSection';
import { CarrierBadge } from './components/CarrierBadge';
import { RechargeFormCard } from './components/RechargeFormCard';
import { PlanCatalog } from './components/PlanCatalog';
import { CheckoutPanel } from './components/CheckoutPanel';
import { ReceiptModal } from './components/ReceiptModal';
import { AddBalanceModal } from './components/AddBalanceModal';
import { HistoryView } from './components/HistoryView';
import { SavedNumbersView } from './components/SavedNumbersView';
import { PlansBrowserView } from './components/PlansBrowserView';
import { OfflineIndicator, PWAInstallControl } from './components/PWAInstallControl';
import { AuthModal } from './components/AuthModal';
import { PromotionalBanner, PromotionalOffer } from './components/PromotionalBanner';
import { ExploreHubView } from './components/ExploreHubView';
import { GeminiAssistantDrawer } from './components/GeminiAssistantDrawer';
import { ArrowRight, LogIn, RotateCcw } from 'lucide-react';

const STORAGE_KEYS = {
  wallet: 'voltpay_wallet_v1',
  contacts: 'voltpay_contacts_v1',
  transactions: 'voltpay_transactions_v1',
};

const DEFAULT_WALLETS: Record<RegionCode, number> = {
  IN: 2450,
};

function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('recharge');

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [verificationTick, setVerificationTick] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  const [guestWallets, setGuestWallets] = useState<Record<RegionCode, number>>(() => {
    const stored = loadStoredJson<Partial<Record<RegionCode, number>>>(
      STORAGE_KEYS.wallet,
      DEFAULT_WALLETS
    );
    return { IN: typeof stored.IN === 'number' ? stored.IN : DEFAULT_WALLETS.IN };
  });
  const [guestContacts, setGuestContacts] = useState<SavedContact[]>(() =>
    loadStoredJson<SavedContact[]>(STORAGE_KEYS.contacts, INITIAL_SAVED_CONTACTS).filter(
      (c) => c.region === 'IN'
    )
  );
  const [guestTransactions, setGuestTransactions] = useState<RechargeTransaction[]>(() =>
    loadStoredJson<RechargeTransaction[]>(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS).filter(
      (t) => t.region === 'IN'
    )
  );

  const [cloudWallet, setCloudWallet] = useState<number>(DEFAULT_WALLETS.IN);
  const [cloudContacts, setCloudContacts] = useState<SavedContact[]>([]);
  const [cloudTransactions, setCloudTransactions] = useState<RechargeTransaction[]>([]);

  const region: RegionCode = 'IN';
  const [phoneNumber, setPhoneNumber] = useState<string>('9876543210');
  const [carrierId, setCarrierId] = useState<string>('airtel');
  const [circle, setCircle] = useState<string>(REGIONS.IN.circles[0]);
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(() => {
    return RECHARGE_PLANS.find((p) => p.id === 'airtel-379') ?? null;
  });
  const [planCategory, setPlanCategory] = useState<PlanCategory>('all');
  const [customAmount, setCustomAmount] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<RechargeTransaction | null>(null);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [externalPromo, setExternalPromo] = useState<{ code: string; requestId: number } | null>(
    null
  );
  const [activePromoCode, setActivePromoCode] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  const checkoutRef = useRef<HTMLDivElement | null>(null);
  const rechargeFormRef = useRef<HTMLDivElement | null>(null);
  const planCatalogRef = useRef<HTMLDivElement | null>(null);

  const isCloudSynced = Boolean(user && user.emailVerified);

  const walletBalances: Record<RegionCode, number> = isCloudSynced
    ? { IN: cloudWallet }
    : guestWallets;
  const savedContacts = isCloudSynced ? cloudContacts : guestContacts;
  const transactions = isCloudSynced ? cloudTransactions : guestTransactions;

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    window.setTimeout(() => {
      setNoticeMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const handleApplyBannerOffer = (offer: PromotionalOffer) => {
    const currentAmount = selectedPlan ? selectedPlan.price : customAmount ?? 0;
    let upgradedPlan: RechargePlan | null = null;

    if (currentAmount < offer.minAmount) {
      const eligible = RECHARGE_PLANS.filter(
        (p) => p.carrierId === carrierId && p.price >= offer.minAmount
      ).sort((a, b) => a.price - b.price);
      if (eligible.length > 0) {
        upgradedPlan = eligible[0];
        setSelectedPlan(upgradedPlan);
        setCustomAmount(null);
        setPlanCategory(upgradedPlan.category);
      }
    }

    setExternalPromo((prev) => ({
      code: offer.code,
      requestId: (prev?.requestId ?? 0) + 1,
    }));

    if (upgradedPlan) {
      showNotice(
        `Selected ${upgradedPlan.title} (${formatCurrency(upgradedPlan.price, region)}) and applied ${offer.code}.`
      );
    } else {
      showNotice(`Applied promo code ${offer.code} to your recharge summary.`);
    }

    window.setTimeout(() => {
      checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.wallet, JSON.stringify(guestWallets));
    } catch {
      // ignore storage errors
    }
  }, [guestWallets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(guestContacts));
    } catch {
      // ignore storage errors
    }
  }, [guestContacts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(guestTransactions));
    } catch {
      // ignore storage errors
    }
  }, [guestTransactions]);

  // Listen for Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Listen for Google Maps Platform quota / auth exhaustion events
  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Bootstrap Firestore profile and subscribe to real-time updates when verified
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setCloudContacts([]);
      setCloudTransactions([]);
      setCloudWallet(DEFAULT_WALLETS.IN);
      return;
    }

    let cancelled = false;
    const userRef = doc(db, 'users', user.uid);
    const contactsCol = collection(db, 'users', user.uid, 'contacts');
    const txCol = collection(db, 'users', user.uid, 'transactions');

    const ensureUserProfile = async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists() && !cancelled) {
          const safeDisplayName = (
            user.displayName ||
            user.email?.split('@')[0] ||
            'VoltPay User'
          ).slice(0, 100);
          await setDoc(userRef, {
            uid: user.uid,
            email: (user.email || 'user@voltpay.app').slice(0, 254),
            displayName: safeDisplayName,
            walletBalance: DEFAULT_WALLETS.IN,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Seed initial India contacts after user document exists
          for (const starter of INITIAL_SAVED_CONTACTS) {
            const cRef = doc(contactsCol);
            const payload: Record<string, unknown> = {
              userId: user.uid,
              nickname: starter.nickname.slice(0, 40),
              label: starter.label,
              phoneNumber: starter.phoneNumber,
              region: 'IN',
              carrierId: starter.carrierId,
              circle: starter.circle.slice(0, 60),
              autoReminder: starter.autoReminder,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            if (starter.lastRechargedAt) {
              payload.lastRechargedAt = starter.lastRechargedAt.slice(0, 40);
            }
            await setDoc(cRef, payload);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
    };

    void ensureUserProfile();

    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.walletBalance === 'number') {
            setCloudWallet(data.walletBalance);
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`)
    );

    const contactsQuery = query(contactsCol, where('userId', '==', user.uid));
    const unsubContacts = onSnapshot(
      contactsQuery,
      (snapshot) => {
        const listWithTime = snapshot.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt as { toMillis?: () => number } | undefined;
          const createdAtMs = typeof ts?.toMillis === 'function' ? ts.toMillis() : 0;
          const contact: SavedContact = {
            id: d.id,
            nickname: String(data.nickname ?? ''),
            label: (data.label as SavedContact['label']) ?? 'Personal',
            phoneNumber: String(data.phoneNumber ?? ''),
            region: 'IN',
            carrierId: String(data.carrierId ?? 'airtel'),
            circle: String(data.circle ?? REGIONS.IN.circles[0]),
            autoReminder: Boolean(data.autoReminder),
            lastRechargedAt:
              typeof data.lastRechargedAt === 'string' ? data.lastRechargedAt : undefined,
          };
          return { contact, createdAtMs };
        });
        listWithTime.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setCloudContacts(listWithTime.map((item) => item.contact));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/contacts`)
    );

    const txQuery = query(txCol, where('userId', '==', user.uid));
    const unsubTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const list: RechargeTransaction[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            referenceCode: String(data.referenceCode ?? ''),
            carrierAuthCode: String(data.carrierAuthCode ?? ''),
            phoneNumber: String(data.phoneNumber ?? ''),
            region: 'IN',
            carrierId: String(data.carrierId ?? 'airtel'),
            circle: String(data.circle ?? REGIONS.IN.circles[0]),
            planTitle: String(data.planTitle ?? ''),
            planMeta: String(data.planMeta ?? ''),
            amount: Number(data.amount ?? 0),
            discount: Number(data.discount ?? 0),
            totalPaid: Number(data.totalPaid ?? 0),
            promoApplied:
              typeof data.promoApplied === 'string' ? data.promoApplied : undefined,
            paymentMethod: (data.paymentMethod as PaymentMethodType) ?? 'wallet',
            paymentLabel: String(data.paymentLabel ?? ''),
            status: (data.status as RechargeTransaction['status']) ?? 'Success',
            createdAt: String(data.createdAtIso ?? new Date().toISOString()),
          };
        });
        list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        setCloudTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/transactions`)
    );

    return () => {
      cancelled = true;
      unsubUser();
      unsubContacts();
      unsubTx();
    };
  }, [authReady, user, verificationTick]);

  const activeCarrier = useMemo(
    () => CARRIERS.find((c) => c.id === carrierId),
    [carrierId]
  );

  const handlePhoneChange = (digits: string) => {
    setPhoneNumber(digits);
    if (digits.length >= 2) {
      const detected = detectCarrierForNumber(digits, region);
      if (detected && detected.id !== carrierId) {
        setCarrierId(detected.id);
        const defaultPlan =
          RECHARGE_PLANS.find((p) => p.carrierId === detected.id && p.recommended) ??
          RECHARGE_PLANS.find((p) => p.carrierId === detected.id) ??
          null;
        setSelectedPlan(defaultPlan);
        setCustomAmount(null);
      }
    }
  };

  const handleCarrierChange = (nextCarrierId: string) => {
    setCarrierId(nextCarrierId);
    const firstPlan =
      RECHARGE_PLANS.find((p) => p.carrierId === nextCarrierId && p.recommended) ??
      RECHARGE_PLANS.find((p) => p.carrierId === nextCarrierId) ??
      null;
    setSelectedPlan(firstPlan);
    setCustomAmount(null);
  };

  const handleSelectContact = (contact: SavedContact) => {
    setPhoneNumber(contact.phoneNumber);
    setCarrierId(contact.carrierId);
    setCircle(contact.circle);
    const defaultPlan =
      RECHARGE_PLANS.find((p) => p.carrierId === contact.carrierId && p.recommended) ??
      RECHARGE_PLANS.find((p) => p.carrierId === contact.carrierId) ??
      null;
    setSelectedPlan(defaultPlan);
    setCustomAmount(null);
  };

  const createContactRecord = async (contact: Omit<SavedContact, 'id'>) => {
    if (user && user.emailVerified) {
      const contactsCol = collection(db, 'users', user.uid, 'contacts');
      const newRef = doc(contactsCol);
      try {
        await setDoc(newRef, {
          userId: user.uid,
          nickname: contact.nickname.slice(0, 40),
          label: contact.label,
          phoneNumber: contact.phoneNumber,
          region: 'IN',
          carrierId: contact.carrierId,
          circle: contact.circle.slice(0, 60),
          autoReminder: contact.autoReminder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/contacts/${newRef.id}`);
      }
    } else {
      setGuestContacts((prev) => [{ ...contact, id: `c-${Date.now()}` }, ...prev]);
    }
  };

  const handleSaveCurrentContact = (nickname: string, label: SavedContact['label']) => {
    void createContactRecord({
      nickname,
      label,
      phoneNumber,
      region,
      carrierId,
      circle,
      autoReminder: true,
    });
    showNotice(`Saved "${nickname}" to your contacts.`);
  };

  const handleSelectPlan = (plan: RechargePlan) => {
    setSelectedPlan(plan);
    setCustomAmount(null);
  };

  const handleSelectCustomAmount = (amount: number) => {
    setSelectedPlan(null);
    setCustomAmount(amount);
  };

  const handleConfirmPayment = ({
    paymentMethod,
    paymentLabel,
    promoCode,
    discount,
    totalPaid,
  }: {
    paymentMethod: PaymentMethodType;
    paymentLabel: string;
    promoCode?: string;
    discount: number;
    totalPaid: number;
  }) => {
    setIsProcessing(true);

    window.setTimeout(() => {
      void (async () => {
        const amount = selectedPlan ? selectedPlan.price : customAmount ?? 0;
        const refNum = Math.floor(100000 + Math.random() * 899999);
        const authNum = Math.floor(1000000 + Math.random() * 8999999);
        const prefix = activeCarrier?.shortName ?? 'OP';
        const nowIso = new Date().toISOString();

        const txBase: Omit<RechargeTransaction, 'id'> = {
          referenceCode: `VP-${refNum}`,
          carrierAuthCode: `${prefix}${authNum}`,
          phoneNumber,
          region,
          carrierId,
          circle: circle.slice(0, 60),
          planTitle: (selectedPlan ? selectedPlan.title : 'Custom Talktime Top-Up').slice(0, 80),
          planMeta: (
            selectedPlan
              ? `${selectedPlan.dataAllowance} · ${selectedPlan.validity} · ${selectedPlan.calls}`
              : `Instant balance credit (${formatCurrency(amount, region)})`
          ).slice(0, 160),
          amount,
          discount,
          totalPaid,
          promoApplied: promoCode ? promoCode.slice(0, 24) : undefined,
          paymentMethod,
          paymentLabel: paymentLabel.slice(0, 80),
          status: 'Success',
          createdAt: nowIso,
        };

        let createdTx: RechargeTransaction;

        if (user && user.emailVerified) {
          const txCol = collection(db, 'users', user.uid, 'transactions');
          const txRef = doc(txCol);
          const payload: Record<string, unknown> = {
            userId: user.uid,
            referenceCode: txBase.referenceCode,
            carrierAuthCode: txBase.carrierAuthCode,
            phoneNumber: txBase.phoneNumber,
            region: txBase.region,
            carrierId: txBase.carrierId,
            circle: txBase.circle,
            planTitle: txBase.planTitle,
            planMeta: txBase.planMeta,
            amount: txBase.amount,
            discount: txBase.discount,
            totalPaid: txBase.totalPaid,
            paymentMethod: txBase.paymentMethod,
            paymentLabel: txBase.paymentLabel,
            status: txBase.status,
            createdAtIso: nowIso,
            createdAt: serverTimestamp(),
          };
          if (txBase.promoApplied) {
            payload.promoApplied = txBase.promoApplied;
          }

          try {
            await setDoc(txRef, payload);

            if (paymentMethod === 'wallet') {
              const nextWallet = Math.max(
                0,
                Math.round((cloudWallet - totalPaid) * 100) / 100
              );
              await updateDoc(doc(db, 'users', user.uid), {
                walletBalance: nextWallet,
                updatedAt: serverTimestamp(),
              });
            }

            const matchingContact = cloudContacts.find(
              (c) => c.phoneNumber === phoneNumber && c.region === region
            );
            if (matchingContact) {
              await updateDoc(doc(db, 'users', user.uid, 'contacts', matchingContact.id), {
                lastRechargedAt: nowIso,
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            setIsProcessing(false);
            handleFirestoreError(
              err,
              OperationType.WRITE,
              `users/${user.uid}/transactions/${txRef.id}`
            );
          }

          createdTx = { ...txBase, id: txRef.id };

          // Persist verified recharge record to Cloud SQL ledger silently
          try {
            const idToken = await user.getIdToken();
            void fetch('/api/ledger', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                referenceCode: txBase.referenceCode,
                carrierId: txBase.carrierId,
                circle: txBase.circle,
                phoneNumber: txBase.phoneNumber,
                planTitle: txBase.planTitle,
                amount: txBase.amount,
                discount: txBase.discount,
                totalPaid: txBase.totalPaid,
                promoApplied: txBase.promoApplied,
                paymentMethod: txBase.paymentMethod,
                status: txBase.status,
              }),
            });
          } catch {
            // Do not interrupt user receipt flow if relational sync is unavailable
          }
        } else {
          createdTx = { ...txBase, id: `tx-${Date.now()}` };
          if (paymentMethod === 'wallet') {
            setGuestWallets((prev) => ({
              ...prev,
              [region]: Math.max(0, Math.round((prev[region] - totalPaid) * 100) / 100),
            }));
          }
          setGuestTransactions((prev) => [createdTx, ...prev]);
          setGuestContacts((prev) =>
            prev.map((c) =>
              c.phoneNumber === phoneNumber && c.region === region
                ? { ...c, lastRechargedAt: nowIso }
                : c
            )
          );
        }

        setIsProcessing(false);
        setActiveReceipt(createdTx);
      })();
    }, 650);
  };

  const handleAddFunds = (targetRegion: RegionCode, amount: number) => {
    if (user && user.emailVerified) {
      const nextWallet = Math.min(
        1000000,
        Math.round((cloudWallet + amount) * 100) / 100
      );
      void updateDoc(doc(db, 'users', user.uid), {
        walletBalance: nextWallet,
        updatedAt: serverTimestamp(),
      }).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`)
      );
    } else {
      setGuestWallets((prev) => ({
        ...prev,
        [targetRegion]: Math.round((prev[targetRegion] + amount) * 100) / 100,
      }));
    }
    showNotice(
      `Added ${formatCurrency(amount, targetRegion)} to your ${REGIONS[targetRegion].currencyCode} wallet.`
    );
  };

  const handleRepeatRecharge = (tx: RechargeTransaction) => {
    setPhoneNumber(tx.phoneNumber);
    setCarrierId(tx.carrierId);
    setCircle(tx.circle);

    const matchingPlan = RECHARGE_PLANS.find(
      (p) => p.carrierId === tx.carrierId && p.title === tx.planTitle && p.price === tx.amount
    );
    if (matchingPlan) {
      setSelectedPlan(matchingPlan);
      setCustomAmount(null);
    } else {
      setSelectedPlan(null);
      setCustomAmount(tx.amount);
    }

    setActiveTab('recharge');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotice(`Loaded ${tx.planTitle} for ${REGIONS[tx.region].dialCode} ${tx.phoneNumber}.`);
  };

  const handleChooseFromBrowser = (plan: RechargePlan) => {
    setCarrierId(plan.carrierId);
    setCircle(REGIONS[plan.region].circles[0]);
    setSelectedPlan(plan);
    setCustomAmount(null);
    setActiveTab('recharge');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showNotice('Signed out of VoltPay.');
    } catch {
      showNotice('Could not sign out. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        authReady={authReady}
        walletBalance={walletBalances[region]}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={() => void handleSignOut()}
        onOpenAddBalance={() => setIsAddBalanceOpen(true)}
      />

      <OfflineIndicator />

      {authReady && !user && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-600">
              Sign in with username/email &amp; password or Google to sync your wallet, contacts,
              and receipts across mobile &amp; computer.
            </span>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign In / Register</span>
            </button>
          </div>
        </div>
      )}

      {authReady && user && !user.emailVerified && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-amber-900">
              Verify <strong className="font-semibold">{user.email}</strong> via the link in your
              inbox to activate cloud sync across devices.
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={isCheckingVerification}
                onClick={() => {
                  void (async () => {
                    try {
                      await sendEmailVerification(user);
                      showNotice(`Verification email resent to ${user.email}.`);
                    } catch {
                      showNotice('Please wait a moment before requesting another verification email.');
                    }
                  })();
                }}
                className="font-semibold text-amber-800 hover:underline cursor-pointer"
              >
                Resend Email
              </button>
              <button
                type="button"
                disabled={isCheckingVerification}
                onClick={() => {
                  void (async () => {
                    setIsCheckingVerification(true);
                    try {
                      await user.reload();
                      await user.getIdToken(true);
                      setVerificationTick((n) => n + 1);
                      if (user.emailVerified) {
                        showNotice('Email verified — cloud sync is now active!');
                      } else {
                        showNotice('Still waiting on email verification. Check your inbox and spam folder.');
                      }
                    } catch {
                      showNotice('Could not refresh verification status right now.');
                    } finally {
                      setIsCheckingVerification(false);
                    }
                  })();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white font-semibold cursor-pointer"
              >
                {isCheckingVerification ? 'Checking...' : "I've Verified"}
              </button>
            </div>
          </div>
        </div>
      )}

      {noticeMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div
            role="status"
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center justify-between"
          >
            <span>{noticeMessage}</span>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              className="text-slate-300 hover:text-white ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'recharge' && (
          <div className="space-y-6">
            <PromotionalBanner
              activePromoCode={activePromoCode}
              onApplyOffer={handleApplyBannerOffer}
            />

            <FrontHeroSection
              activeCarrierId={carrierId}
              walletBalance={walletBalances[region]}
              onSelectCarrier={(nextCarrierId) => {
                handleCarrierChange(nextCarrierId);
                setPlanCategory('all');
                rechargeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              onFocusRechargeForm={() => {
                rechargeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                window.setTimeout(() => {
                  const input = document.getElementById('mobile-number-input');
                  input?.focus();
                }, 250);
              }}
              onJumpToCategory={(nextCategory) => {
                setPlanCategory(nextCategory);
                planCatalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              onBrowseAllPlans={() => setActiveTab('plans')}
              onOpenAddBalance={() => setIsAddBalanceOpen(true)}
            />

            <div ref={rechargeFormRef} className="scroll-mt-20 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Quick Recharge &amp; Plan Selection
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    checkoutRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="lg:hidden text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Jump to Order Summary
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-6">
                  <RechargeFormCard
                    region={region}
                    phoneNumber={phoneNumber}
                    carrierId={carrierId}
                    circle={circle}
                    savedContacts={savedContacts}
                    onPhoneChange={handlePhoneChange}
                    onCarrierChange={handleCarrierChange}
                    onCircleChange={setCircle}
                    onSelectContact={handleSelectContact}
                    onSaveCurrentContact={handleSaveCurrentContact}
                  />

                  <div ref={planCatalogRef} className="scroll-mt-20">
                    <PlanCatalog
                      region={region}
                      carrierId={carrierId}
                      category={planCategory}
                      onCategoryChange={setPlanCategory}
                      selectedPlanId={selectedPlan?.id ?? null}
                      customAmount={customAmount}
                      onSelectPlan={handleSelectPlan}
                      onSelectCustomAmount={handleSelectCustomAmount}
                    />
                  </div>
                </div>

                <div ref={checkoutRef} className="lg:col-span-4">
                  <CheckoutPanel
                    region={region}
                    phoneNumber={phoneNumber}
                    carrier={activeCarrier}
                    circle={circle}
                    selectedPlan={selectedPlan}
                    customAmount={customAmount}
                    walletBalances={walletBalances}
                    isProcessing={isProcessing}
                    externalPromo={externalPromo}
                    onAppliedPromoChange={setActivePromoCode}
                    onOpenAddBalance={() => setIsAddBalanceOpen(true)}
                    onConfirmPayment={handleConfirmPayment}
                  />
                </div>
              </div>
            </div>

            {transactions.length > 0 && (
              <section aria-label="Recent Recharges" className="pt-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-slate-900">
                      Recent Recharges
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      One-click repeat for your latest completed top-ups
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    <span>View All History</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {transactions.slice(0, 3).map((tx) => {
                    const carrier = CARRIERS.find((c) => c.id === tx.carrierId);
                    return (
                      <div
                        key={tx.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CarrierBadge carrier={carrier} size="sm" />
                            <div className="min-w-0">
                              <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums truncate">
                                +91 {formatPhoneDisplay(tx.phoneNumber, tx.region)}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {carrier?.name ?? tx.carrierId} · {tx.planTitle}
                              </div>
                            </div>
                          </div>
                          <span className="font-display text-base font-bold text-slate-900 tabular-nums shrink-0">
                            {formatCurrency(tx.totalPaid, tx.region)}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveReceipt(tx)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            View Receipt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRepeatRecharge(tx)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" aria-hidden="true" />
                            <span>Repeat</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <PlansBrowserView region={region} onChoosePlan={handleChooseFromBrowser} />
        )}

        {activeTab === 'history' && (
          <HistoryView
            transactions={transactions}
            onViewReceipt={(tx) => setActiveReceipt(tx)}
            onRepeatRecharge={handleRepeatRecharge}
            onGoToRecharge={() => setActiveTab('recharge')}
          />
        )}

        {activeTab === 'saved' && (
          <SavedNumbersView
            contacts={savedContacts}
            onAddContact={(contact) => {
              void createContactRecord(contact);
              showNotice(`Added "${contact.nickname}" to saved numbers.`);
            }}
            onToggleReminder={(id) => {
              const current = savedContacts.find((c) => c.id === id);
              if (!current) return;
              if (user && user.emailVerified) {
                void updateDoc(doc(db, 'users', user.uid, 'contacts', id), {
                  autoReminder: !current.autoReminder,
                  updatedAt: serverTimestamp(),
                }).catch((err) =>
                  handleFirestoreError(
                    err,
                    OperationType.UPDATE,
                    `users/${user.uid}/contacts/${id}`
                  )
                );
              } else {
                setGuestContacts((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, autoReminder: !c.autoReminder } : c))
                );
              }
            }}
            onDeleteContact={(id) => {
              if (user && user.emailVerified) {
                void deleteDoc(doc(db, 'users', user.uid, 'contacts', id)).catch((err) =>
                  handleFirestoreError(
                    err,
                    OperationType.DELETE,
                    `users/${user.uid}/contacts/${id}`
                  )
                );
              } else {
                setGuestContacts((prev) => prev.filter((c) => c.id !== id));
              }
              showNotice('Removed saved number.');
            }}
            onRechargeContact={(contact) => {
              handleSelectContact(contact);
              setActiveTab('recharge');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreHubView
            user={user}
            isCloudSynced={isCloudSynced}
            onRequireAuth={() => setIsAuthModalOpen(true)}
            onNotice={showNotice}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>VoltPay Prepaid Services · Instant Operator Top-Up</span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Prepaid Plans
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Receipts &amp; History
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Saved Lines
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Stores &amp; 3D
            </button>
            <PWAInstallControl />
          </div>
        </div>
      </footer>

      <ReceiptModal
        transaction={activeReceipt}
        onClose={() => setActiveReceipt(null)}
        onRepeatRecharge={handleRepeatRecharge}
      />

      <AddBalanceModal
        isOpen={isAddBalanceOpen}
        region={region}
        walletBalances={walletBalances}
        onClose={() => setIsAddBalanceOpen(false)}
        onAddFunds={handleAddFunds}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(msg) => showNotice(msg || 'Signed in — your account is synced.')}
      />

      <GeminiAssistantDrawer />
    </div>
  );
}
