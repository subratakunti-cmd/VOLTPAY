import { RegionCode, RechargeTransaction } from '../types/recharge';
import { REGIONS, CARRIERS } from '../data/carriersAndPlans';

export function formatCurrency(amount: number, _region: RegionCode = 'IN'): string {
  const cfg = REGIONS.IN;
  return `${cfg.currencySymbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPhoneDisplay(digits: string, _region: RegionCode = 'IN'): string {
  const clean = digits.replace(/\D/g, '');
  if (!clean) return '';
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)} ${clean.slice(5, 10)}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function downloadReceiptFile(tx: RechargeTransaction): void {
  const regionCfg = REGIONS[tx.region];
  const carrier = CARRIERS.find((c) => c.id === tx.carrierId);
  const lines = [
    '========================================',
    '           VOLTPAY RECHARGE RECEIPT     ',
    '========================================',
    `Transaction ID : ${tx.referenceCode}`,
    `Carrier Ref    : ${tx.carrierAuthCode}`,
    `Date & Time    : ${formatDateTime(tx.createdAt)}`,
    `Status         : ${tx.status.toUpperCase()}`,
    '----------------------------------------',
    `Mobile Number  : ${regionCfg.dialCode} ${formatPhoneDisplay(tx.phoneNumber, tx.region)}`,
    `Operator       : ${carrier?.name ?? tx.carrierId} (${tx.circle})`,
    `Plan           : ${tx.planTitle}`,
    `Details        : ${tx.planMeta}`,
    '----------------------------------------',
    `Plan Amount    : ${formatCurrency(tx.amount, tx.region)}`,
    `Promo Discount : -${formatCurrency(tx.discount, tx.region)}${tx.promoApplied ? ` (${tx.promoApplied})` : ''}`,
    `Platform Fee   : ${formatCurrency(0, tx.region)}`,
    `Total Paid     : ${formatCurrency(tx.totalPaid, tx.region)}`,
    `Payment Method : ${tx.paymentLabel}`,
    '========================================',
    'Thank you for recharging with VoltPay.',
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `VoltPay-Receipt-${tx.referenceCode}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
