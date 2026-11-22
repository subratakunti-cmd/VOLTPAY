import { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Bookmark,
  ChevronDown,
  Compass,
  History,
  LayoutGrid,
  LogIn,
  LogOut,
  Plus,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { ActiveTab } from '../types/recharge';
import { formatCurrency } from '../utils/formatters';
import { VoltPayLogo } from './VoltPayLogo';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  user: User | null;
  authReady: boolean;
  walletBalance: number;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenAddBalance: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string; mobileLabel: string; icon: typeof Smartphone }[] = [
  { id: 'recharge', label: 'Recharge', mobileLabel: 'Recharge', icon: Smartphone },
  { id: 'plans', label: 'Browse Plans', mobileLabel: 'Plans', icon: LayoutGrid },
  { id: 'history', label: 'History', mobileLabel: 'History', icon: History },
  { id: 'saved', label: 'Saved Numbers', mobileLabel: 'Saved', icon: Bookmark },
  { id: 'explore', label: 'Stores & 3D', mobileLabel: 'Explore', icon: Compass },
];

export function Header({
  activeTab,
  onSelectTab,
  user,
  authReady,
  walletBalance,
  onOpenAuth,
  onSignOut,
  onOpenAddBalance,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Account';
  const firstName = displayName.split(' ')[0];
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onSelectTab('recharge')}
            className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 rounded-lg cursor-pointer"
          >
            <VoltPayLogo size={32} />
            <span>VoltPay</span>
          </button>

          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 rounded cursor-pointer ${
                    isActive
                      ? 'text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div ref={menuRef} className="relative flex items-center shrink-0">
            {!authReady ? (
              <div className="w-24 h-10 rounded-xl bg-slate-100 animate-pulse" />
            ) : !user ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 active:scale-[0.98] rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign In</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 min-h-[40px] pl-1.5 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-lg bg-blue-700 text-white text-xs font-semibold flex items-center justify-center">
                      {initials}
                    </span>
                  )}
                  <span className="text-sm font-medium text-slate-900 max-w-[110px] truncate">
                    {firstName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 z-50 space-y-2"
                  >
                    <div className="px-2 py-1.5 border-b border-slate-100">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {displayName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      {!user.emailVerified && (
                        <div className="text-[11px] font-medium text-amber-700 mt-0.5">
                          Email verification pending
                        </div>
                      )}
                    </div>

                    <div className="px-2 py-2 rounded-xl bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Wallet className="w-4 h-4 text-blue-700" aria-hidden="true" />
                        <span>Wallet</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {formatCurrency(walletBalance, 'IN')}
                      </span>
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenAddBalance();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>Add Wallet Balance</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors cursor-pointer ${
                  isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
