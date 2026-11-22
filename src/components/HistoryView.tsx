import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileText, RotateCcw, Search, XCircle } from 'lucide-react';
import { RechargeTransaction, TransactionStatus } from '../types/recharge';
import { CARRIERS, REGIONS } from '../data/carriersAndPlans';
import { formatCurrency, formatDateTime, formatPhoneDisplay } from '../utils/formatters';
import { CarrierBadge } from './CarrierBadge';

interface HistoryViewProps {
  transactions: RechargeTransaction[];
  onViewReceipt: (tx: RechargeTransaction) => void;
  onRepeatRecharge: (tx: RechargeTransaction) => void;
  onGoToRecharge: () => void;
}

export function HistoryView({
  transactions,
  onViewReceipt,
  onRepeatRecharge,
  onGoToRecharge,
}: HistoryViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TransactionStatus>('All');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (statusFilter !== 'All' && tx.status !== statusFilter) return false;
      if (!q) return true;
      const carrier = CARRIERS.find((c) => c.id === tx.carrierId);
      return (
        tx.phoneNumber.includes(q) ||
        tx.referenceCode.toLowerCase().includes(q) ||
        tx.planTitle.toLowerCase().includes(q) ||
        (carrier?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [transactions, search, statusFilter]);

  const totalCount = transactions.length;
  const successCount = transactions.filter((t) => t.status === 'Success').length;
  const totalDiscountIN = transactions
    .filter((t) => t.region === 'IN')
    .reduce((acc, t) => acc + t.discount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-500">Total Recharges</span>
          <div className="font-display text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {totalCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Across all saved prepaid lines</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-500">Completed Orders</span>
          <div className="font-display text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
            {successCount}
          </div>
          <p className="text-xs text-slate-500 mt-1">Instant operator confirmation</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-500">Promo Savings (INR)</span>
          <div className="font-display text-2xl font-bold text-blue-700 mt-1 tabular-nums">
            {formatCurrency(totalDiscountIN, 'IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">Saved using VoltPay promo codes</p>
        </div>
      </div>

      {/* Ledger */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Recharge History</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect digital receipts or repeat any previous top-up in one click
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(['All', 'Success', 'Pending', 'Failed'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search number, ID, plan..."
                aria-label="Search transaction history"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <p className="text-sm font-medium text-slate-800">No recharge records match your filter</p>
            <p className="text-xs text-slate-500 mt-1">
              Complete a mobile recharge or clear your search filter to see activity here.
            </p>
            <button
              type="button"
              onClick={onGoToRecharge}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 cursor-pointer"
            >
              Start New Recharge
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((tx) => {
              const carrier = CARRIERS.find((c) => c.id === tx.carrierId);
              const regionCfg = REGIONS[tx.region];
              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <CarrierBadge carrier={carrier} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                          {regionCfg.dialCode} {formatPhoneDisplay(tx.phoneNumber, tx.region)}
                        </span>
                        <span className="text-xs text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          {carrier?.name ?? tx.carrierId}
                        </span>
                        <span className="text-xs text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{tx.referenceCode}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-800 mt-0.5 truncate">
                        {tx.planTitle}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDateTime(tx.createdAt)} · {tx.paymentLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-5 shrink-0">
                    <div className="text-left md:text-right">
                      <div className="font-display text-base font-bold text-slate-900 tabular-nums">
                        {formatCurrency(tx.totalPaid, tx.region)}
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          tx.status === 'Success'
                            ? 'text-emerald-700'
                            : tx.status === 'Pending'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {tx.status === 'Success' && (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {tx.status === 'Pending' && (
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {tx.status === 'Failed' && (
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{tx.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onViewReceipt(tx)}
                        className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Receipt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRepeatRecharge(tx)}
                        className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Repeat</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
