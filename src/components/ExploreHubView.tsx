import { useState } from 'react';
import { User } from 'firebase/auth';
import { Box, MapPin } from 'lucide-react';
import { StoreLocatorView } from './StoreLocatorView';
import { ThreeNetworkScene } from './ThreeNetworkScene';

interface ExploreHubViewProps {
  user: User | null;
  isCloudSynced: boolean;
  onRequireAuth: () => void;
  onNotice: (msg: string) => void;
}

export function ExploreHubView({
  user,
  isCloudSynced,
  onRequireAuth,
  onNotice,
}: ExploreHubViewProps) {
  const [subTab, setSubTab] = useState<'stores' | 'studio'>('stores');

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
            5G Stores &amp; Hardware Studio
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Find official Jio, Airtel, Vi &amp; BSNL centers nearby or inspect our interactive 3D
            5G SIM &amp; tower hardware.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('stores')}
            className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'stores'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <span>Store Locator</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('studio')}
            className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'studio'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <span>3D 5G Studio</span>
          </button>
        </div>
      </div>

      {subTab === 'stores' ? (
        <StoreLocatorView
          user={user}
          isCloudSynced={isCloudSynced}
          onRequireAuth={onRequireAuth}
          onNotice={onNotice}
        />
      ) : (
        <ThreeNetworkScene />
      )}
    </div>
  );
}
