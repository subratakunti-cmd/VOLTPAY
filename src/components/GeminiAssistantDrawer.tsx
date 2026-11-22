import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { ChatTurnMessage } from '../types/recharge';

type AssistantModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

const QUICK_PROMPTS = [
  'Best Jio 5G plan under ₹400',
  'Compare 365-day annual packs',
  'How much do I save on ₹859 with promos?',
];

export function GeminiAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [model, setModel] = useState<AssistantModel>('gemini-4-hydrogen');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatTurnMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages, isSending]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isSending) return;

    setErrorText(null);
    const userTurn: ChatTurnMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const historyPayload = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          model,
        }),
      });

      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !data.text) {
        setErrorText(data.error || 'Unable to get a response right now.');
        setIsSending(false);
        return;
      }

      const modelTurn: ChatTurnMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.text,
      };
      setMessages((prev) => [...prev, modelTurn]);
    } catch {
      setErrorText('Network issue while contacting VoltPay Assistant. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open VoltPay Plan Assistant"
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-semibold shadow-lg border border-slate-700/60 transition-all cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-sky-400" aria-hidden="true" />
        <span>Plan Assistant</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="VoltPay Plan Assistant"
        >
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-slate-200">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-slate-900 truncate">
                    VoltPay Plan Assistant
                  </h2>
                  <p className="text-xs text-slate-500 truncate">
                    India prepaid plan &amp; promo helper
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setErrorText(null);
                    }}
                    title="New conversation"
                    className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close assistant"
                  className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 font-medium">Response Mode</span>
              <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setModel('gemini-4-hydrogen')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    model === 'gemini-4-hydrogen'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Balanced
                </button>
                <button
                  type="button"
                  onClick={() => setModel('gemini-3.1-flash-lite')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    model === 'gemini-3.1-flash-lite'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fast
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60">
              {messages.length === 0 ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed">
                    Ask me to compare Jio, Airtel, Vi, or BSNL prepaid packs, calculate promo
                    code savings (<span className="font-mono text-xs font-semibold">SAVE20</span>,{' '}
                    <span className="font-mono text-xs font-semibold">FIRST50</span>,{' '}
                    <span className="font-mono text-xs font-semibold">VOLT10</span>), or find the
                    right roaming or annual pack.
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 px-1">
                      Suggested questions
                    </div>
                    <div className="flex flex-col gap-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void sendMessage(prompt)}
                          className="text-left px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-blue-700 text-white rounded-br-md'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md px-3.5 py-2.5 bg-white border border-slate-200 text-xs font-medium text-slate-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" aria-hidden="true" />
                    <span>Comparing plans...</span>
                  </div>
                </div>
              )}

              {errorText && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-800">
                  {errorText}
                </div>
              )}

              <div ref={threadEndRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about plans, 5G packs, or promos..."
                disabled={isSending}
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                aria-label="Send message"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-45 text-white transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
