import { useState } from 'react';
import { BookmarkPlus, Check, ChevronDown, Phone } from 'lucide-react';
import { Carrier, RegionCode, SavedContact } from '../types/recharge';
import { CARRIERS, REGIONS } from '../data/carriersAndPlans';
import { formatPhoneDisplay } from '../utils/formatters';
import { CarrierBadge } from './CarrierBadge';

interface RechargeFormCardProps {
  region: RegionCode;
  phoneNumber: string;
  carrierId: string;
  circle: string;
  savedContacts: SavedContact[];
  onPhoneChange: (digits: string) => void;
  onCarrierChange: (carrierId: string) => void;
  onCircleChange: (circle: string) => void;
  onSelectContact: (contact: SavedContact) => void;
  onSaveCurrentContact: (nickname: string, label: SavedContact['label']) => void;
}

export function RechargeFormCard({
  region,
  phoneNumber,
  carrierId,
  circle,
  savedContacts,
  onPhoneChange,
  onCarrierChange,
  onCircleChange,
  onSelectContact,
  onSaveCurrentContact,
}: RechargeFormCardProps) {
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [nickname, setNickname] = useState('');
  const [contactLabel, setContactLabel] = useState<SavedContact['label']>('Personal');

  const regionConfig = REGIONS[region];
  const regionCarriers = CARRIERS.filter((c) => c.region === region);
  const activeCarrier: Carrier | undefined =
    regionCarriers.find((c) => c.id === carrierId) ?? regionCarriers[0];

  const isPhoneComplete = phoneNumber.length === regionConfig.phoneDigits;
  const isAlreadySaved = savedContacts.some(
    (c) => c.phoneNumber === phoneNumber && c.region === region
  );

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !isPhoneComplete) return;
    onSaveCurrentContact(nickname.trim(), contactLabel);
    setNickname('');
    setShowSavePrompt(false);
  };

  return (
    <section
      aria-labelledby="recharge-number-heading"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-5">
        <h2 id="recharge-number-heading" className="text-lg font-semibold text-slate-900">
          Mobile Number &amp; Operator
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Enter a {regionConfig.phoneDigits}-digit Indian prepaid mobile number to view plans
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <label htmlFor="mobile-number-input" className="block text-xs font-medium text-slate-700 mb-1.5">
            Prepaid Mobile Number
          </label>
          <div
            className={`flex items-center h-12 rounded-xl border bg-white px-3.5 transition-colors ${
              phoneNumber.length > 0 && !isPhoneComplete
                ? 'border-amber-400 focus-within:border-amber-500'
                : 'border-slate-300 focus-within:border-blue-700'
            }`}
          >
            <span className="font-mono text-sm font-medium text-slate-500 pr-2.5 border-r border-slate-200 select-none">
              {regionConfig.dialCode}
            </span>
            <input
              id="mobile-number-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={formatPhoneDisplay(phoneNumber, region)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, regionConfig.phoneDigits);
                onPhoneChange(digits);
              }}
              placeholder={regionConfig.placeholder}
              className="w-full pl-3 bg-transparent font-mono text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none tabular-nums"
            />
            {isPhoneComplete && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 shrink-0">
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Valid</span>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5 min-h-[20px]">
            <span className="text-xs text-slate-500 tabular-nums">
              {phoneNumber.length}/{regionConfig.phoneDigits} digits
            </span>
            {isPhoneComplete && !isAlreadySaved && !showSavePrompt && (
              <button
                type="button"
                onClick={() => setShowSavePrompt(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Save this number</span>
              </button>
            )}
            {isPhoneComplete && isAlreadySaved && (
              <span className="text-xs text-slate-500">Saved in your contacts</span>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          <label htmlFor="carrier-select" className="block text-xs font-medium text-slate-700 mb-1.5">
            Operator
          </label>
          <div className="relative flex items-center h-12 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-700">
            <CarrierBadge carrier={activeCarrier} size="sm" />
            <select
              id="carrier-select"
              value={activeCarrier?.id ?? ''}
              onChange={(e) => onCarrierChange(e.target.value)}
              className="w-full pl-2.5 pr-6 bg-transparent text-sm font-medium text-slate-900 appearance-none focus:outline-none cursor-pointer truncate"
            >
              {regionCarriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <label htmlFor="circle-select" className="block text-xs font-medium text-slate-700 mb-1.5">
            Region / Circle
          </label>
          <div className="relative flex items-center h-12 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-700">
            <select
              id="circle-select"
              value={circle}
              onChange={(e) => onCircleChange(e.target.value)}
              className="w-full pr-6 bg-transparent text-sm font-medium text-slate-900 appearance-none focus:outline-none cursor-pointer truncate"
            >
              {regionConfig.circles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {showSavePrompt && (
        <form
          onSubmit={handleSaveSubmit}
          className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="save-nickname" className="block text-xs font-medium text-slate-700 mb-1">
              Contact Nickname
            </label>
            <input
              id="save-nickname"
              type="text"
              required
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Mom's Phone"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:border-blue-700 focus:outline-none"
            />
          </div>
          <div className="w-36">
            <label htmlFor="save-label" className="block text-xs font-medium text-slate-700 mb-1">
              Group
            </label>
            <select
              id="save-label"
              value={contactLabel}
              onChange={(e) => setContactLabel(e.target.value as SavedContact['label'])}
              className="w-full h-10 px-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:border-blue-700 focus:outline-none"
            >
              <option value="Personal">Personal</option>
              <option value="Work">Work</option>
              <option value="Family">Family</option>
              <option value="Data SIM">Data SIM</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              Save Contact
            </button>
            <button
              type="button"
              onClick={() => setShowSavePrompt(false)}
              className="h-10 px-3 rounded-lg border border-slate-300 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {savedContacts.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-500">Quick Select Saved Lines</span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {savedContacts.map((contact) => {
              const contactCarrier = CARRIERS.find((c) => c.id === contact.carrierId);
              const isSelected =
                contact.phoneNumber === phoneNumber && contact.region === region;
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onSelectContact(contact)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-colors shrink-0 min-h-[44px] cursor-pointer ${
                    isSelected
                      ? 'border-blue-700 bg-blue-50/70'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80'
                  }`}
                >
                  <Phone
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-blue-700' : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">
                      {contact.nickname}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums whitespace-nowrap">
                      {REGIONS[contact.region].dialCode}{' '}
                      {formatPhoneDisplay(contact.phoneNumber, contact.region)} ·{' '}
                      {contactCarrier?.shortName ?? contact.carrierId}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
