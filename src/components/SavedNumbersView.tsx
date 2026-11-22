import { useState } from 'react';
import { Bell, BellOff, Plus, Smartphone, Trash2 } from 'lucide-react';
import { RegionCode, SavedContact } from '../types/recharge';
import { CARRIERS, REGIONS } from '../data/carriersAndPlans';
import { formatPhoneDisplay } from '../utils/formatters';
import { CarrierBadge } from './CarrierBadge';

interface SavedNumbersViewProps {
  contacts: SavedContact[];
  onAddContact: (contact: Omit<SavedContact, 'id'>) => void;
  onToggleReminder: (id: string) => void;
  onDeleteContact: (id: string) => void;
  onRechargeContact: (contact: SavedContact) => void;
}

export function SavedNumbersView({
  contacts,
  onAddContact,
  onToggleReminder,
  onDeleteContact,
  onRechargeContact,
}: SavedNumbersViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [nickname, setNickname] = useState('');
  const [label, setLabel] = useState<SavedContact['label']>('Personal');
  const region: RegionCode = 'IN';
  const [phoneNumber, setPhoneNumber] = useState('');
  const [carrierId, setCarrierId] = useState('airtel');
  const [circle, setCircle] = useState(REGIONS.IN.circles[0]);
  const [error, setError] = useState<string | null>(null);

  const regionCfg = REGIONS[region];
  const regionCarriers = CARRIERS.filter((c) => c.region === region);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Enter a nickname for this line.');
      return;
    }
    if (phoneNumber.length !== regionCfg.phoneDigits) {
      setError(`Enter a valid ${regionCfg.phoneDigits}-digit mobile number.`);
      return;
    }
    onAddContact({
      nickname: nickname.trim(),
      label,
      phoneNumber,
      region,
      carrierId,
      circle,
      autoReminder: true,
    });
    setNickname('');
    setPhoneNumber('');
    setError(null);
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Saved Mobile Lines</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage family, personal, and travel numbers for one-tap top-ups
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((v) => !v)}
          className="h-10 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{isAdding ? 'Close Form' : 'Add Number'}</span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900">Add a New Prepaid Line</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="new-nickname" className="block text-xs font-medium text-slate-700 mb-1">
                Nickname
              </label>
              <input
                id="new-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Mom's Airtel"
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="new-group" className="block text-xs font-medium text-slate-700 mb-1">
                Group
              </label>
              <select
                id="new-group"
                value={label}
                onChange={(e) => setLabel(e.target.value as SavedContact['label'])}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white focus:border-blue-700 focus:outline-none"
              >
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Family">Family</option>
                <option value="Data SIM">Data SIM</option>
              </select>
            </div>

            <div>
              <label htmlFor="new-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Mobile Number (+91)
              </label>
              <input
                id="new-phone"
                type="tel"
                inputMode="numeric"
                value={formatPhoneDisplay(phoneNumber, region)}
                onChange={(e) =>
                  setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, regionCfg.phoneDigits))
                }
                placeholder={regionCfg.placeholder}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 font-mono text-sm tabular-nums focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="new-carrier" className="block text-xs font-medium text-slate-700 mb-1">
                Operator
              </label>
              <select
                id="new-carrier"
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white focus:border-blue-700 focus:outline-none"
              >
                {regionCarriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-circle" className="block text-xs font-medium text-slate-700 mb-1">
                Circle / State
              </label>
              <select
                id="new-circle"
                value={circle}
                onChange={(e) => setCircle(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white focus:border-blue-700 focus:outline-none"
              >
                {regionCfg.circles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="h-10 px-4 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium cursor-pointer"
            >
              Save Line
            </button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-sm font-medium text-slate-800">No saved numbers yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Add your personal or family prepaid numbers for instant one-tap recharges.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => {
            const carrier = CARRIERS.find((c) => c.id === contact.carrierId);
            const cfg = REGIONS[contact.region];
            return (
              <div
                key={contact.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CarrierBadge carrier={carrier} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {contact.nickname}
                        </h3>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          · {contact.label}
                        </span>
                      </div>
                      <div className="font-mono text-sm font-medium text-slate-700 mt-0.5 tabular-nums">
                        {cfg.dialCode} {formatPhoneDisplay(contact.phoneNumber, contact.region)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {carrier?.name ?? contact.carrierId} · {contact.circle}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteContact(contact.id)}
                    aria-label={`Remove ${contact.nickname}`}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleReminder(contact.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                      contact.autoReminder ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {contact.autoReminder ? (
                      <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {contact.autoReminder ? 'Expiry reminder on' : 'Reminder off'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRechargeContact(contact)}
                    className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Recharge Now</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
