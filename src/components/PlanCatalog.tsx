import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { PlanCategory, RechargePlan, RegionCode } from '../types/recharge';
import { CARRIERS, RECHARGE_PLANS, REGIONS } from '../data/carriersAndPlans';
import { formatCurrency } from '../utils/formatters';

interface PlanCatalogProps {
  region: RegionCode;
  carrierId: string;
  category: PlanCategory;
  onCategoryChange: (category: PlanCategory) => void;
  selectedPlanId: string | null;
  customAmount: number | null;
  onSelectPlan: (plan: RechargePlan) => void;
  onSelectCustomAmount: (amount: number) => void;
}

type SortOrder = 'recommended' | 'price-asc' | 'validity-desc';

const CATEGORY_TABS: { id: PlanCategory; label: string }[] = [
  { id: 'all', label: 'All Plans' },
  { id: 'unlimited5g', label: 'Unlimited 5G' },
  { id: 'data', label: 'Data Add-On' },
  { id: 'annual', label: 'Annual' },
  { id: 'roaming', label: 'Roaming' },
  { id: 'custom', label: 'Custom Top-Up' },
];

export function PlanCatalog({
  region,
  carrierId,
  category,
  onCategoryChange: setCategory,
  selectedPlanId,
  customAmount,
  onSelectPlan,
  onSelectCustomAmount,
}: PlanCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recommended');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<string>(
    customAmount ? String(customAmount) : ''
  );
  const [customError, setCustomError] = useState<string | null>(null);

  const regionConfig = REGIONS[region];
  const carrier = CARRIERS.find((c) => c.id === carrierId);

  const filteredPlans = useMemo(() => {
    if (category === 'custom') return [];

    const query = searchQuery.trim().toLowerCase();
    const list = RECHARGE_PLANS.filter((plan) => {
      if (plan.region !== region || plan.carrierId !== carrierId) return false;
      if (category !== 'all' && plan.category !== category) return false;
      if (!query) return true;
      return (
        plan.title.toLowerCase().includes(query) ||
        String(plan.price).includes(query) ||
        plan.dataAllowance.toLowerCase().includes(query) ||
        plan.validity.toLowerCase().includes(query) ||
        (plan.extras?.toLowerCase().includes(query) ?? false)
      );
    });

    return [...list].sort((a, b) => {
      if (sortOrder === 'price-asc') return a.price - b.price;
      if (sortOrder === 'validity-desc') return b.validityDays - a.validityDays;
      return (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0) || a.price - b.price;
    });
  }, [region, carrierId, category, searchQuery, sortOrder]);

  const handleApplyCustomAmount = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(customInput);
    if (
      Number.isNaN(parsed) ||
      parsed < regionConfig.minCustomAmount ||
      parsed > regionConfig.maxCustomAmount
    ) {
      setCustomError(
        `Enter an amount between ${formatCurrency(
          regionConfig.minCustomAmount,
          region
        )} and ${formatCurrency(regionConfig.maxCustomAmount, region)}.`
      );
      return;
    }
    setCustomError(null);
    onSelectCustomAmount(Math.round(parsed * 100) / 100);
  };

  return (
    <section
      aria-labelledby="plan-catalog-heading"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="plan-catalog-heading" className="text-lg font-semibold text-slate-900">
            {carrier?.name ?? 'Carrier'} Prepaid Plans
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Compare data allowances, validity, and perks before checkout
          </p>
        </div>

        {category !== 'custom' && (
          <div className="flex items-center gap-2">
            <label htmlFor="plan-sort" className="text-xs font-medium text-slate-500">
              Sort
            </label>
            <select
              id="plan-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="validity-desc">Validity: Longest</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {category !== 'custom' && (
          <div className="relative sm:w-56 shrink-0">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search price, GB, days..."
              aria-label="Search prepaid plans"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none"
            />
          </div>
        )}
      </div>

      {category === 'custom' ? (
        <div className="pt-6">
          <form onSubmit={handleApplyCustomAmount} className="max-w-md space-y-4">
            <div>
              <label
                htmlFor="custom-amount-input"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                Enter Custom Talktime / Top-Up Amount
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center h-12 rounded-xl border border-slate-300 bg-white px-3.5 focus-within:border-blue-700">
                  <span className="font-mono text-base font-semibold text-slate-500 mr-2">
                    {regionConfig.currencySymbol}
                  </span>
                  <input
                    id="custom-amount-input"
                    type="number"
                    min={regionConfig.minCustomAmount}
                    max={regionConfig.maxCustomAmount}
                    step="1"
                    value={customInput}
                    onChange={(e) => {
                      setCustomInput(e.target.value);
                      setCustomError(null);
                    }}
                    placeholder={String(regionConfig.quickCustomAmounts[1])}
                    className="w-full font-mono text-base font-semibold text-slate-900 focus:outline-none tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
                >
                  Apply Amount
                </button>
              </div>
              {customError && <p className="text-xs text-red-600 mt-1.5">{customError}</p>}
              <p className="text-xs text-slate-500 mt-1.5">
                Allowed range: {formatCurrency(regionConfig.minCustomAmount, region)} –{' '}
                {formatCurrency(regionConfig.maxCustomAmount, region)} · Instant talktime credit
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-500 mb-2">
                Quick Amounts
              </span>
              <div className="flex flex-wrap gap-2">
                {regionConfig.quickCustomAmounts.map((amt) => {
                  const isActive = customAmount === amt && !selectedPlanId;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setCustomInput(String(amt));
                        setCustomError(null);
                        onSelectCustomAmount(amt);
                      }}
                      className={`px-4 py-2 rounded-xl border font-mono text-sm font-semibold tabular-nums transition-colors cursor-pointer ${
                        isActive
                          ? 'border-blue-700 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {formatCurrency(amt, region)}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-slate-800">No matching plans found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try clearing your search filter or switching to another plan category.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Show All Plans
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isExpanded = expandedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`py-4 transition-colors ${
                  isSelected ? 'bg-blue-50/40 -mx-5 sm:-mx-6 px-5 sm:px-6' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="w-24 shrink-0">
                      <div className="font-display text-2xl font-bold text-slate-900 tabular-nums">
                        {formatCurrency(plan.price, region)}
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">
                        {plan.validity}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {plan.title}
                        </h3>
                        {plan.recommended && (
                          <span className="text-xs font-medium text-blue-700 whitespace-nowrap">
                            · Popular Choice
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-700 mt-1 tabular-nums">
                        <span className="font-medium text-slate-900">{plan.dataAllowance}</span>
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
                        <p className="text-xs text-slate-500 mt-1">{plan.extras}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      className="inline-flex items-center gap-1 min-h-[40px] px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>Details</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectPlan(plan)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'bg-blue-700 text-white'
                          : 'border border-slate-300 bg-white text-slate-900 hover:border-blue-700 hover:text-blue-700'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" aria-hidden="true" />}
                      <span>{isSelected ? 'Selected' : 'Select Plan'}</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 sm:ml-28 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                    <div>
                      <span className="block text-slate-400">Validity Period</span>
                      <span className="font-medium text-slate-800">{plan.validity}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Post-Limit Speed</span>
                      <span className="font-medium text-slate-800">
                        {plan.speedAfterCap ?? 'Standard carrier FUP applies'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Messaging &amp; Voice</span>
                      <span className="font-medium text-slate-800">
                        {plan.calls} · {plan.sms}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
