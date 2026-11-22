import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import {
  Carrier,
  PaymentMethodType,
  PromoCode,
  RechargePlan,
  RegionCode,
} from '../types/recharge';
import { PROMO_CODES, REGIONS } from '../data/carriersAndPlans';
import { formatCurrency, formatPhoneDisplay } from '../utils/formatters';
import { CarrierBadge } from './CarrierBadge';

interface CheckoutPanelProps {
  region: RegionCode;
  phoneNumber: string;
  carrier?: Carrier;
  circle: string;
  selectedPlan: RechargePlan | null;
  customAmount: number | null;
  walletBalances: Record<RegionCode, number>;
  isProcessing: boolean;
  externalPromo?: { code: string; requestId: number } | null;
  onAppliedPromoChange?: (code: string | null) => void;
  onOpenAddBalance: () => void;
  onConfirmPayment: (params: {
    paymentMethod: PaymentMethodType;
    paymentLabel: string;
    promoCode?: string;
    discount: number;
    totalPaid: number;
  }) => void;
}

export function CheckoutPanel({
  region,
  phoneNumber,
  carrier,
  circle,
  selectedPlan,
  customAmount,
  walletBalances,
  isProcessing,
  externalPromo,
  onAppliedPromoChange,
  onOpenAddBalance,
  onConfirmPayment,
}: CheckoutPanelProps) {
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'error' | 'ok'; text: string } | null>(
    null
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('wallet');
  const [upiId, setUpiId] = useState('subrata@okaxis');
  const [cardLast4, setCardLast4] = useState('4821');
  const [validationError, setValidationError] = useState<string | null>(null);

  const regionConfig = REGIONS[region];
  const baseAmount = selectedPlan ? selectedPlan.price : customAmount ?? 0;
  const hasSelection = baseAmount > 0;
  const isPhoneValid = phoneNumber.length === regionConfig.phoneDigits;
  const walletBalance = walletBalances[region];

  const computeDiscount = (promo: PromoCode | null, amount: number): number => {
    if (!promo || amount < promo.minAmount) return 0;
    if (promo.type === 'flat') {
      return Math.min(promo.value, amount);
    }
    const pct = Math.round((amount * promo.value) / 100);
    return promo.maxDiscount ? Math.min(pct, promo.maxDiscount) : pct;
  };

  const discount = computeDiscount(appliedPromo, baseAmount);
  const totalPayable = Math.max(0, baseAmount - discount);
  const walletInsufficient = paymentMethod === 'wallet' && totalPayable > walletBalance;

  const livePromoFeedback =
    appliedPromo && baseAmount < appliedPromo.minAmount
      ? {
          type: 'error' as const,
          text: `${appliedPromo.code} requires at least ${formatCurrency(
            appliedPromo.minAmount,
            region
          )}.`,
        }
      : appliedPromo && discount > 0
      ? {
          type: 'ok' as const,
          text: `${appliedPromo.code} applied — you save ${formatCurrency(discount, region)}.`,
        }
      : promoFeedback;

  const lastHandledRequestIdRef = useRef<number>(0);

  useEffect(() => {
    if (!externalPromo || externalPromo.requestId === 0) return;
    if (lastHandledRequestIdRef.current === externalPromo.requestId) return;
    lastHandledRequestIdRef.current = externalPromo.requestId;

    const normalized = externalPromo.code.trim().toUpperCase();
    const found = PROMO_CODES.find((p) => p.code === normalized);
    if (!found) return;
    if (baseAmount >= found.minAmount) {
      setAppliedPromo(found);
      setPromoInput(found.code);
      setPromoFeedback(null);
      onAppliedPromoChange?.(found.code);
    } else {
      setPromoInput(found.code);
      setPromoFeedback({
        type: 'error',
        text: `${found.code} requires a minimum recharge of ${formatCurrency(
          found.minAmount,
          region
        )}.`,
      });
    }
  }, [externalPromo, baseAmount, region, onAppliedPromoChange]);

  const handleApplyPromo = (codeText: string) => {
    const normalized = codeText.trim().toUpperCase();
    if (!normalized) {
      setPromoFeedback({ type: 'error', text: 'Enter a promo code to apply.' });
      return;
    }
    const found = PROMO_CODES.find((p) => p.code === normalized);
    if (!found) {
      setPromoFeedback({ type: 'error', text: `Promo code "${normalized}" is not valid.` });
      return;
    }
    if (baseAmount < found.minAmount) {
      setPromoFeedback({
        type: 'error',
        text: `${found.code} requires a minimum recharge of ${formatCurrency(
          found.minAmount,
          region
        )}.`,
      });
      return;
    }
    setAppliedPromo(found);
    setPromoInput(found.code);
    setPromoFeedback(null);
    onAppliedPromoChange?.(found.code);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoFeedback(null);
    onAppliedPromoChange?.(null);
  };

  const handlePay = () => {
    if (!isPhoneValid) {
      setValidationError(
        `Please enter a valid ${regionConfig.phoneDigits}-digit mobile number first.`
      );
      return;
    }
    if (!hasSelection) {
      setValidationError('Select a prepaid plan or enter a custom amount to continue.');
      return;
    }
    if (walletInsufficient) {
      setValidationError(
        'Insufficient wallet balance. Add balance or pick UPI / Card.'
      );
      return;
    }
    if (paymentMethod === 'upi' && !upiId.includes('@')) {
      setValidationError('Enter a valid UPI ID (e.g. name@bank).');
      return;
    }
    setValidationError(null);

    const paymentLabel =
      paymentMethod === 'wallet'
        ? 'VoltPay Wallet'
        : paymentMethod === 'upi'
        ? `UPI (${upiId.trim()})`
        : `Card •••• ${cardLast4}`;

    onConfirmPayment({
      paymentMethod,
      paymentLabel,
      promoCode: discount > 0 ? appliedPromo?.code : undefined,
      discount,
      totalPaid: totalPayable,
    });
  };

  return (
    <aside
      aria-labelledby="checkout-summary-heading"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 lg:sticky lg:top-24"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 id="checkout-summary-heading" className="text-lg font-semibold text-slate-900">
            Order Summary
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Instant carrier activation · Zero fee</p>
        </div>
        <div className="text-right">
          <span className="block text-[11px] text-slate-500">Wallet Balance</span>
          <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
            {formatCurrency(walletBalance, region)}
          </span>
        </div>
      </div>

      {/* Target Line */}
      <div className="py-4 border-b border-slate-100 flex items-center gap-3">
        <CarrierBadge carrier={carrier} size="md" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums truncate">
            {phoneNumber
              ? `${regionConfig.dialCode} ${formatPhoneDisplay(phoneNumber, region)}`
              : 'No number entered'}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {carrier?.name ?? 'Select Operator'} · {circle}
          </div>
        </div>
      </div>

      {/* Plan Breakdown */}
      {hasSelection ? (
        <div className="py-4 border-b border-slate-100 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {selectedPlan ? selectedPlan.title : 'Custom Talktime Top-Up'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {selectedPlan
                  ? `${selectedPlan.dataAllowance} · ${selectedPlan.validity}`
                  : 'Direct prepaid balance credit'}
              </div>
            </div>
            <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums shrink-0">
              {formatCurrency(baseAmount, region)}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-700">
              <span>Promo ({appliedPromo?.code})</span>
              <span className="font-mono font-medium tabular-nums">
                -{formatCurrency(discount, region)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Platform Convenience Fee</span>
            <span className="font-mono tabular-nums">{formatCurrency(0, region)}</span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Total Payable</span>
            <span className="font-display text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(totalPayable, region)}
            </span>
          </div>
        </div>
      ) : (
        <div className="py-6 border-b border-slate-100 text-center">
          <p className="text-sm font-medium text-slate-700">No plan selected yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Pick a plan from the list or enter a custom top-up amount.
          </p>
        </div>
      )}

      {/* Promo Code */}
      <div className="py-4 border-b border-slate-100">
        <label htmlFor="promo-code-input" className="block text-xs font-medium text-slate-700 mb-2">
          Promo Code
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Tag
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="promo-code-input"
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="SAVE20 or VOLT10"
              disabled={Boolean(appliedPromo)}
              className="w-full h-10 pl-8 pr-8 rounded-xl border border-slate-300 bg-white font-mono text-xs font-medium text-slate-900 uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:border-blue-700 focus:outline-none disabled:bg-slate-50"
            />
            {appliedPromo && (
              <button
                type="button"
                onClick={handleRemovePromo}
                aria-label="Remove promo code"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          {!appliedPromo && (
            <button
              type="button"
              onClick={() => handleApplyPromo(promoInput)}
              className="h-10 px-3.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Apply
            </button>
          )}
        </div>

        {livePromoFeedback && (
          <p
            className={`text-xs mt-1.5 flex items-center gap-1 ${
              livePromoFeedback.type === 'ok' ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {livePromoFeedback.type === 'ok' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{livePromoFeedback.text}</span>
          </p>
        )}

        {!appliedPromo && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>Available:</span>
            {PROMO_CODES.map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => handleApplyPromo(p.code)}
                className="font-mono font-medium text-blue-700 hover:underline cursor-pointer"
              >
                {p.code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="py-4 space-y-2.5">
        <span className="block text-xs font-medium text-slate-700">Payment Method</span>

        <button
          type="button"
          onClick={() => setPaymentMethod('wallet')}
          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[48px] ${
            paymentMethod === 'wallet'
              ? 'border-blue-700 bg-blue-50/50'
              : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Wallet
              className={`w-4 h-4 ${
                paymentMethod === 'wallet' ? 'text-blue-700' : 'text-slate-500'
              }`}
              aria-hidden="true"
            />
            <div>
              <div className="text-xs font-semibold text-slate-900">VoltPay Wallet</div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                Available: {formatCurrency(walletBalance, region)}
              </div>
            </div>
          </div>
          {walletInsufficient && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddBalance();
              }}
              className="text-[11px] font-semibold text-blue-700 hover:underline"
            >
              Add Funds
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setPaymentMethod('upi')}
          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[48px] ${
            paymentMethod === 'upi'
              ? 'border-blue-700 bg-blue-50/50'
              : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Landmark
              className={`w-4 h-4 ${paymentMethod === 'upi' ? 'text-blue-700' : 'text-slate-500'}`}
              aria-hidden="true"
            />
            <div>
              <div className="text-xs font-semibold text-slate-900">UPI / Instant Bank</div>
              <div className="text-[11px] text-slate-500">Zero surcharge · Direct debit</div>
            </div>
          </div>
        </button>

        {paymentMethod === 'upi' && (
          <div className="pl-2 pt-1">
            <label htmlFor="upi-input" className="sr-only">
              UPI ID
            </label>
            <input
              id="upi-input"
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@okaxis"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setPaymentMethod('card')}
          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[48px] ${
            paymentMethod === 'card'
              ? 'border-blue-700 bg-blue-50/50'
              : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CreditCard
              className={`w-4 h-4 ${paymentMethod === 'card' ? 'text-blue-700' : 'text-slate-500'}`}
              aria-hidden="true"
            />
            <div>
              <div className="text-xs font-semibold text-slate-900">Debit / Credit Card</div>
              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                Visa •••• {cardLast4}
              </div>
            </div>
          </div>
        </button>

        {paymentMethod === 'card' && (
          <div className="pl-2 pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCardLast4('4821')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer ${
                cardLast4 === '4821'
                  ? 'border-blue-700 bg-blue-50 text-blue-800'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Visa ••4821
            </button>
            <button
              type="button"
              onClick={() => setCardLast4('9014')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer ${
                cardLast4 === '9014'
                  ? 'border-blue-700 bg-blue-50 text-blue-800'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Mastercard ••9014
            </button>
          </div>
        )}
      </div>

      {validationError && (
        <div
          role="alert"
          className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      <button
        type="button"
        disabled={isProcessing}
        onClick={handlePay}
        className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Processing Recharge...</span>
          </>
        ) : (
          <>
            <span>
              {hasSelection
                ? `Pay ${formatCurrency(totalPayable, region)}`
                : 'Select a Plan to Pay'}
            </span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </>
        )}
      </button>
    </aside>
  );
}
