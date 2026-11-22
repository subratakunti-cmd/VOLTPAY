import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Smartphone,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Carrier, PlanCategory, RechargePlan } from '../types/recharge';
import { CARRIERS, RECHARGE_PLANS } from '../data/carriersAndPlans';
import { formatCurrency } from '../utils/formatters';
import { CarrierBadge } from './CarrierBadge';
import { PWAInstallControl } from './PWAInstallControl';

interface FrontHeroSectionProps {
  activeCarrierId: string;
  walletBalance: number;
  onSelectCarrier: (carrierId: string) => void;
  onFocusRechargeForm: () => void;
  onJumpToCategory: (category: PlanCategory) => void;
  onBrowseAllPlans: () => void;
  onOpenAddBalance: () => void;
}

interface HeroSlide {
  id: string;
  kicker: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  imageSrc: string;
  imageAlt: string;
  overlayTitle: string;
  overlaySubtitle: string;
  actionType: 'focus-form' | 'category-5g' | 'promo' | 'category-annual' | 'category-roaming';
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'instant-recharge',
    kicker: '01. Prepaid Mobile Top-Up · India (+91)',
    title: 'Instant Mobile Recharge Without Extra Fees',
    description:
      'Compare Jio, Airtel, Vi, and BSNL prepaid packs, apply promo savings at checkout, and get an operator-verified digital receipt in seconds.',
    primaryLabel: 'Recharge Now',
    secondaryLabel: 'Compare All Plans',
    imageSrc: '/src/assets/images/hero_mobile_recharge_1795092795300.jpg',
    imageAlt: 'Smartphone, metallic SIM tray, and payment card on stone surface',
    overlayTitle: 'Zero Convenience Fee',
    overlaySubtitle: 'Instant UPI, Card & VoltPay Wallet settlement',
    actionType: 'focus-form',
  },
  {
    id: 'unlimited-5g',
    kicker: '02. True 5G High-Speed Packs',
    title: 'Unlimited 5G Data Starting From ₹299',
    description:
      'Upgrade to 2 GB/day and 2.5 GB/day True 5G plans with unlimited voice calls, 100 SMS/day, and OTT streaming perks across major circles.',
    primaryLabel: 'View 5G Plans',
    secondaryLabel: 'Browse Operators',
    imageSrc: '/src/assets/images/slide_5g_network_1795092946163.jpg',
    imageAlt: '5G smartphone on aluminum stand with glass prism light refraction',
    overlayTitle: 'True 5G Coverage',
    overlaySubtitle: '28-day, 72-day & 90-day high-speed bundles',
    actionType: 'category-5g',
  },
  {
    id: 'promo-savings',
    kicker: '03. Wallet & Promo Rewards',
    title: 'Save Flat ₹50 On Recharges Above ₹499',
    description:
      'Apply FIRST50 at checkout for ₹50 instant off, SAVE20 for ₹20 off on ₹199+, or VOLT10 for 10% instant savings with zero hidden charges.',
    primaryLabel: 'Apply Offer & Recharge',
    secondaryLabel: 'Top Up Wallet',
    imageSrc: '/src/assets/images/slide_wallet_promo_1795092945796.jpg',
    imageAlt: 'Matte navy payment card resting on a metallic smartphone',
    overlayTitle: 'Codes: FIRST50 · SAVE20 · VOLT10',
    overlaySubtitle: 'Instant checkout discount applied before payment',
    actionType: 'promo',
  },
  {
    id: 'annual-validity',
    kicker: '04. 365-Day Annual Freedom',
    title: 'Recharge Once For A Full Year Of Connectivity',
    description:
      'Skip monthly reminders with 365-day annual packs from Jio, Airtel, Vi, and BSNL — offering up to 2.5 GB/day and bundled streaming subscriptions.',
    primaryLabel: 'Explore Annual Packs',
    secondaryLabel: 'Compare All Plans',
    imageSrc: '/src/assets/images/slide_annual_pack_1795092946159.jpg',
    imageAlt: 'Anodized aluminum desk calendar cube beside smartphone and SIM pin',
    overlayTitle: '365-Day Continuous Validity',
    overlaySubtitle: 'Lower daily cost with year-long peace of mind',
    actionType: 'category-annual',
  },
  {
    id: 'roaming-boosters',
    kicker: '05. Travel Roaming & Data Boosters',
    title: 'Stay Connected Abroad With Global Roaming Packs',
    description:
      'Activate 1-day to 28-day international roaming passes covering 170+ destinations or top up extra 4G/5G data boosters starting at ₹69.',
    primaryLabel: 'Check Roaming Packs',
    secondaryLabel: 'Browse All Plans',
    imageSrc: '/src/assets/images/slide_roaming_travel_1795092946328.jpg',
    imageAlt: 'Travel wallet, dual-SIM tray, and smartphone on sunlit stone surface',
    overlayTitle: '170+ Country Roaming',
    overlaySubtitle: 'Plus instant data add-ons starting at ₹69',
    actionType: 'category-roaming',
  },
];

export function FrontHeroSection({
  activeCarrierId,
  walletBalance,
  onSelectCarrier,
  onFocusRechargeForm,
  onJumpToCategory,
  onBrowseAllPlans,
  onOpenAddBalance,
}: FrontHeroSectionProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState(false);

  const indiaCarriers: Carrier[] = CARRIERS.filter((c) => c.region === 'IN');
  const currentSlide = HERO_SLIDES[activeSlideIndex];

  useEffect(() => {
    if (isPaused) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const getStartingPrice = (carrierId: string): number => {
    const carrierPlans: RechargePlan[] = RECHARGE_PLANS.filter((p) => p.carrierId === carrierId);
    if (carrierPlans.length === 0) return 199;
    return Math.min(...carrierPlans.map((p) => p.price));
  };

  const getPlanCount = (carrierId: string): number =>
    RECHARGE_PLANS.filter((p) => p.carrierId === carrierId).length;

  const handleCopyPromo = async () => {
    try {
      await navigator.clipboard.writeText('FIRST50');
    } catch {
      // clipboard unavailable in restricted frames
    }
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrimaryAction = () => {
    switch (currentSlide.actionType) {
      case 'focus-form':
      case 'promo':
        onFocusRechargeForm();
        break;
      case 'category-5g':
        onJumpToCategory('unlimited5g');
        break;
      case 'category-annual':
        onJumpToCategory('annual');
        break;
      case 'category-roaming':
        onJumpToCategory('roaming');
        break;
    }
  };

  const handleSecondaryAction = () => {
    if (currentSlide.actionType === 'promo') {
      onOpenAddBalance();
    } else {
      onBrowseAllPlans();
    }
  };

  const goPrev = () => {
    setActiveSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const goNext = () => {
    setActiveSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  return (
    <div className="space-y-5">
      {/* 5-Slide Interactive Hero Showcase */}
      <section
        aria-roledescription="carousel"
        aria-label="Featured Prepaid Recharge Highlights"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        className="space-y-3"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-xs font-medium text-blue-700 tracking-tight">
                  {currentSlide.kicker}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance mt-2 leading-[1.15]">
                  {currentSlide.title}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-xl leading-relaxed">
                  {currentSlide.description}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>{currentSlide.primaryLabel}</span>
                    <ArrowDown className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSecondaryAction}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>{currentSlide.secondaryLabel}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <PWAInstallControl />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <span className="block text-xs text-slate-500">VoltPay Wallet</span>
                  <span className="font-display text-lg font-bold text-slate-900 tabular-nums">
                    {formatCurrency(walletBalance, 'IN')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenAddBalance}
                  className="inline-flex items-center gap-1 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Top Up</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <span>
                  Promo: <strong className="font-mono text-slate-900">FIRST50</strong> for ₹50 off
                </span>
                <button
                  type="button"
                  onClick={handleCopyPromo}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-blue-700 cursor-pointer whitespace-nowrap"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[260px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                {!failedImages[currentSlide.id] ? (
                  <img
                    src={currentSlide.imageSrc}
                    alt={currentSlide.imageAlt}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [currentSlide.id]: true }))
                    }
                    className="w-full h-full lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[260px] bg-gradient-to-br from-slate-800 to-blue-950 flex flex-col items-center justify-center p-6 text-white">
                    <Smartphone className="w-10 h-10 text-blue-300 mb-3" aria-hidden="true" />
                    <p className="font-display text-base font-semibold">
                      {currentSlide.overlayTitle}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent pointer-events-none"
            />

            <div className="absolute top-4 right-4 font-mono text-xs font-medium text-white/90 bg-slate-950/55 backdrop-blur-xs px-2.5 py-1 rounded-lg tabular-nums">
              0{activeSlideIndex + 1} / 0{HERO_SLIDES.length}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white">
              <div className="font-display text-base sm:text-lg font-semibold">
                {currentSlide.overlayTitle}
              </div>
              <p className="text-xs text-slate-200 mt-1">{currentSlide.overlaySubtitle}</p>
            </div>
          </div>
        </div>

        {/* Slide Controls Bar (5 Interactive Slides + Prev/Next) */}
        <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-3 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1">
            {HERO_SLIDES.map((slide, idx) => {
              const isActive = idx === activeSlideIndex;
              const shortLabels = ['Instant Top-Up', 'True 5G', 'Promo ₹50', 'Annual 365d', 'Roaming'];
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveSlideIndex(idx)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-2 min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="font-mono text-[11px] opacity-75 tabular-nums">0{idx + 1}</span>
                  <span>{shortLabels[idx]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Operator Strip */}
      <section aria-label="Select Telecom Operator" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {indiaCarriers.map((carrier) => {
          const isSelected = activeCarrierId === carrier.id;
          const starting = getStartingPrice(carrier.id);
          const count = getPlanCount(carrier.id);
          return (
            <button
              key={carrier.id}
              type="button"
              onClick={() => onSelectCarrier(carrier.id)}
              className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all cursor-pointer min-h-[72px] ${
                isSelected
                  ? 'border-blue-700 bg-blue-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <CarrierBadge carrier={carrier} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 truncate">{carrier.name}</div>
                <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  From {formatCurrency(starting, 'IN')} · {count} plans
                </div>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
