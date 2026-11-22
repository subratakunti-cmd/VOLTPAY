import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { PlanCategory, RechargePlan, RegionCode } from '../types/recharge';
import { CARRIERS, RECHARGE_PLANS, REGIONS } from '../data/carriersAndPlans';
import { formatCurrency } from '../utils/formatters';
import { CarrierBadge } from './CarrierBadge';

interface PlansBrowserViewProps {
  region: RegionCode;
  onChoosePlan: (plan: RechargePlan) => void;
}

export function PlansBrowserView({
  region,
  onChoosePlan,
}: PlansBrowserViewProps) {
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [category, setCategory] = useState<Exclude<PlanCategory, 'custom'>>('all');
  const [query, setQuery] = useState('');

  const regionCarriers = CARRIERS.filter((c) => c.region === region);

  const plans = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECHARGE_PLANS.filter((p) => {
      if (p.region !== region) return false;
      if (selectedCarrier !== 'all' && p.carrierId !== selectedCarrier) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        String(p.price).includes(q) ||
        p.dataAllowance.toLowerCase().includes(q) ||
        (p.extras?.toLowerCase().includes(q) ?? false)
      );
    }).sort((a, b) => a.price - b.price);
  }, [region, selectedCarrier, category, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Compare Prepaid Plans</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Browse Jio, Airtel, Vi, and BSNL plans side-by-side and pick a plan to recharge
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedCarrier('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                selectedCarrier === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Operators
            </button>
            {regionCarriers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCarrier(c.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                  selectedCarrier === c.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                ['all', 'All Types'],
                ['unlimited5g', 'Unlimited 5G'],
                ['data', 'Data Packs'],
                ['annual', 'Annual'],
                ['roaming', 'Roaming'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap ${
                  category === id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-64 shrink-0">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by price, GB, perk..."
            aria-label="Filter plans"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-700 focus:outline-none"
          />
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-sm font-medium text-slate-800">No plans match those filters</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCarrier('all');
              setCategory('all');
              setQuery('');
            }}
            className="mt-3 px-4 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const carrier = CARRIERS.find((c) => c.id === plan.carrierId);
            return (
              <article
                key={plan.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CarrierBadge carrier={carrier} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-500 truncate">
                          {carrier?.name}
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {plan.title}
                        </h3>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-xl font-bold text-slate-900 tabular-nums">
                        {formatCurrency(plan.price, region)}
                      </div>
                      <div className="text-xs text-slate-500">{plan.validity}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700 tabular-nums">
                    <span className="font-semibold text-slate-900">{plan.dataAllowance}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span>{plan.calls}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span>{plan.sms}</span>
                  </div>

                  {plan.extras && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{plan.extras}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onChoosePlan(plan)}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white hover:border-blue-700 hover:text-blue-700 text-xs font-semibold text-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Recharge with this Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
