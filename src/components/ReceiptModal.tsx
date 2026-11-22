import { CheckCircle2, Download, Printer, RotateCcw, X } from 'lucide-react';
import { RechargeTransaction } from '../types/recharge';
import { CARRIERS, REGIONS } from '../data/carriersAndPlans';
import {
  downloadReceiptFile,
  formatCurrency,
  formatDateTime,
  formatPhoneDisplay,
} from '../utils/formatters';
import { CarrierBadge } from './CarrierBadge';

interface ReceiptModalProps {
  transaction: RechargeTransaction | null;
  onClose: () => void;
  onRepeatRecharge: (tx: RechargeTransaction) => void;
}

export function ReceiptModal({
  transaction,
  onClose,
  onRepeatRecharge,
}: ReceiptModalProps) {
  if (!transaction) return null;

  const regionCfg = REGIONS[transaction.region];
  const carrier = CARRIERS.find((c) => c.id === transaction.carrierId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="receipt-modal-title" className="text-base font-semibold text-slate-900">
                Recharge {transaction.status}
              </h2>
              <p className="text-xs text-slate-500">{formatDateTime(transaction.createdAt)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <CarrierBadge carrier={carrier} size="md" />
              <div className="min-w-0">
                <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                  {regionCfg.dialCode} {formatPhoneDisplay(transaction.phoneNumber, transaction.region)}
                </div>
                <div className="text-xs text-slate-500">
                  {carrier?.name ?? transaction.carrierId} · {transaction.circle}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(transaction.totalPaid, transaction.region)}
              </div>
              <div className="text-[11px] font-medium text-emerald-700">Paid</div>
            </div>
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-medium text-slate-900 text-right">{transaction.planTitle}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Benefits</dt>
              <dd className="text-xs text-slate-700 text-right">{transaction.planMeta}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Transaction ID</dt>
              <dd className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                {transaction.referenceCode}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Operator Reference</dt>
              <dd className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                {transaction.carrierAuthCode}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Payment Method</dt>
              <dd className="text-xs font-medium text-slate-900">{transaction.paymentLabel}</dd>
            </div>
            {transaction.discount > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <dt>Promo Discount ({transaction.promoApplied})</dt>
                <dd className="font-mono font-medium tabular-nums">
                  -{formatCurrency(transaction.discount, transaction.region)}
                </dd>
              </div>
            )}
          </dl>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => downloadReceiptFile(transaction)}
              className="h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Print Copy</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onRepeatRecharge(transaction);
              onClose();
            }}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Repeat This Recharge</span>
          </button>
        </div>
      </div>
    </div>
  );
}
