import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Tag, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface PromotionalOffer {
  id: string;
  seasonLabel: string;
  code: string;
  headline: string;
  detail: string;
  discountText: string;
  minAmount: number;
  targetCategory?: 'unlimited5g' | 'annual';
}

export const FEATURED_OFFERS: PromotionalOffer[] = [
  {
    id: 'winter-5g-50',
    seasonLabel: 'Seasonal 5G Offer · Valid through Dec 2026',
    code: 'FIRST50',
    headline: 'Flat ₹50 Off on 84-Day & Annual Recharges',
    detail: 'Applicable on Jio, Airtel, Vi & BSNL plans of ₹499 and above',
    discountText: '₹50 OFF',
    minAmount: 499,
    targetCategory: 'unlimited5g',
  },
  {
    id: 'monthly-saver-20',
    seasonLabel: 'Featured Pack Discount · Instant Checkout',
    code: 'SAVE20',
    headline: 'Save ₹20 Instantly on Monthly 5G Packs',
    detail: 'Use on popular 28-day and 30-day unlimited plans from ₹199+',
    discountText: '₹20 OFF',
    minAmount: 199,
    targetCategory: 'unlimited5g',
  },
  {
    id: 'festive-volt-10',
    seasonLabel: 'All-Packs Offer · Wallet, UPI & Cards',
    code: 'VOLT10',
    headline: '10% Instant Discount Up to ₹75 on Every Top-Up',
    detail: 'Valid on data boosters, annual packs & custom talktime from ₹15+',
    discountText: '10% OFF',
    minAmount: 15,
  },
];

interface PromotionalBannerProps {
  activePromoCode: string | null;
  onApplyOffer: (offer: PromotionalOffer) => void;
}

export function PromotionalBanner({
  activePromoCode,
  onApplyOffer,
}: PromotionalBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isPaused || isDismissed) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURED_OFFERS.length);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [isPaused, isDismissed]);

  if (isDismissed) {
    return null;
  }

  const currentOffer = FEATURED_OFFERS[activeIndex];
  const isAlreadyApplied = activePromoCode === currentOffer.code;
  const isCopied = copiedCode === currentOffer.code;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentOffer.code);
    } catch {
      // Clipboard may be blocked inside embedded frames
    }
    setCopiedCode(currentOffer.code);
    window.setTimeout(() => {
      setCopiedCode((prev) => (prev === currentOffer.code ? null : prev));
    }, 2000);
  };

  return (
    <section
      aria-label="Featured Discounts and Seasonal Offers"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white border border-slate-800 px-4 py-4 sm:px-6 sm:py-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pr-8 lg:pr-0">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 text-blue-300" aria-hidden="true" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentOffer.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0 flex-1"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-blue-200 tracking-wide">
                <span className="font-semibold text-white tabular-nums">
                  {currentOffer.discountText}
                </span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span>{currentOffer.seasonLabel}</span>
              </div>

              <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-tight mt-0.5 leading-snug">
                {currentOffer.headline}
              </h2>

              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {currentOffer.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          {/* Offer Switcher Tabs */}
          <div
            role="tablist"
            aria-label="Select featured offer"
            className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/90 border border-slate-700/80"
          >
            {FEATURED_OFFERS.map((offer, idx) => {
              const selected = idx === activeIndex;
              return (
                <button
                  key={offer.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveIndex(idx)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    selected
                      ? 'bg-white text-slate-900'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {offer.code}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                <span className="font-mono">{currentOffer.code}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onApplyOffer(currentOffer)}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isAlreadyApplied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isAlreadyApplied ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Applied</span>
              </>
            ) : (
              <>
                <span>Apply Offer</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss promotional banner"
            className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss promotional banner"
        className="lg:hidden absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </section>
  );
}
