import { useState } from 'react';
import { Download, MonitorSmartphone, Share, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function PWAInstallControl() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleTrigger = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTrigger}
        className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
        <span>{isInstallable ? 'Install App' : isIOS ? 'Install on iPhone' : 'Install App'}</span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MonitorSmartphone className="w-5 h-5 text-blue-700" aria-hidden="true" />
                <h2 id="pwa-install-guide-title" className="text-base font-semibold text-slate-900">
                  Install VoltPay on Mobile &amp; Computer
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close install instructions"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-600">
              {isIOS ? (
                <div className="space-y-2.5">
                  <p className="font-medium text-slate-900">On iPhone &amp; iPad (Safari):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed">
                    <li>
                      Tap the{' '}
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        <Share className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" /> Share
                      </span>{' '}
                      button in Safari&apos;s toolbar.
                    </li>
                    <li>
                      Scroll down and select <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong> to launch VoltPay like a native mobile app.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3 text-xs leading-relaxed">
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">
                      On Android (Chrome / Edge):
                    </p>
                    <p>
                      Open the browser menu (⋮) and tap <strong>Install app</strong> or{' '}
                      <strong>Add to Home screen</strong>.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="font-semibold text-slate-900 mb-1">
                      On Computer (Windows / Mac / Linux):
                    </p>
                    <p>
                      Click the <strong>Install VoltPay</strong> icon in your browser&apos;s address
                      bar (Chrome or Edge) to run it as a standalone desktop window.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3"
    >
      <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
        <span>Offline Mode — Saved numbers, plans, and recent receipts remain available.</span>
      </div>
    </div>
  );
}
