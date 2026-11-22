import { Carrier } from '../types/recharge';

interface CarrierBadgeProps {
  carrier?: Carrier;
  size?: 'sm' | 'md';
}

export function CarrierBadge({ carrier, size = 'md' }: CarrierBadgeProps) {
  const dimensions = size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-10 h-10 text-xs';
  const color = carrier?.brandColor ?? '#1E293B';
  const bg = carrier?.accentBg ?? '#F1F5F9';
  const label = carrier?.shortName ?? 'SIM';

  return (
    <div
      className={`${dimensions} rounded-xl flex items-center justify-center font-display font-bold tracking-tight shrink-0 border border-slate-200/80 select-none`}
      style={{ backgroundColor: bg, color }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}
