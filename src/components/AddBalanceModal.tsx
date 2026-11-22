import { useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { RegionCode } from '../types/recharge';
import { REGIONS } from '../data/carriersAndPlans';
import { formatCurrency } from '../utils/formatters';

interface AddBalanceModalProps {
  isOpen: boolean;
  region: RegionCode;
  walletBalances: Record<RegionCode, number>;
  onClose: () => void;
  onAddFunds: (region: RegionCode, amount: number) => void;
}

const PRESETS = [500, 1000, 2000, 5000];

export function AddBalanceModal({
  isOpen,
  region,
  walletBalances,
  onClose,
  onAddFunds,
}: AddBalanceModalProps) {
  const [amountInput, setAmountInput] = useState<string>(String(PRESETS[1]));
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const regionCfg = REGIONS[region];
  const activeBalance = walletBalances[region];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amountInput);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 50000) {
      setError('Enter a valid top-up amount.');
      return;
    }
    onAddFunds(region, Math.round(parsed * 100) / 100);
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-balance-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-blue-700" aria-hidden="true" />
            <h2 id="add-balance-title" className="text-base font-semibold text-slate-900">
              Add Balance to VoltPay Wallet
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500">Current INR Wallet Balance</span>
            <span className="font-display text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(activeBalance, region)}
            </span>
          </div>

          <div>
            <label htmlFor="wallet-topup-amount" className="block text-xs font-medium text-slate-700 mb-1.5">
              Top-Up Amount ({regionCfg.currencyCode})
            </label>
            <div className="flex items-center h-12 rounded-xl border border-slate-300 px-3.5 focus-within:border-blue-700">
              <span className="font-mono text-base font-semibold text-slate-500 mr-2">
                {regionCfg.currencySymbol}
              </span>
              <input
                id="wallet-topup-amount"
                type="number"
                min="1"
                step="1"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setError(null);
                }}
                className="w-full font-mono text-lg font-semibold text-slate-900 focus:outline-none tabular-nums"
              />
            </div>
            {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmountInput(String(preset));
                  setError(null);
                }}
                className={`py-2.5 rounded-xl border font-mono text-xs font-semibold tabular-nums cursor-pointer transition-colors ${
                  Number(amountInput) === preset
                    ? 'border-blue-700 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                +{formatCurrency(preset, region)}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Add {amountInput ? formatCurrency(Number(amountInput) || 0, region) : 'Balance'} Now
          </button>
        </form>
      </div>
    </div>
  );
}
