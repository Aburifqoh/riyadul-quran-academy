'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';

type Turn = { role: 'user' | 'assistant'; content: string };

const WELCOME: Turn = {
  role: 'assistant',
  content:
    'Assalamu Alaikum. I am Ilmvers AI. Ask me about Tajweed, Arabic practice, or how classes work at Ilmvers. I help you study. I do not give a fatwa.',
};

export default function FloatingIlmversAI({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([WELCOME]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, open, busy]);

  const ask = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
    const next = [...turns, { role: 'user' as const, content: question }];
    setTurns(next);
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next
            .filter((turn) => turn.role === 'user' || turn.role === 'assistant')
            .slice(-8),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.reply !== 'string') {
        setError(typeof data.error === 'string' ? data.error : 'The assistant could not answer.');
        return;
      }
      setTurns((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('The assistant could not answer. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`z-[1001] flex flex-col items-end ${className}`}>
      {open ? (
        <div className="mb-3 w-[min(380px,calc(100vw-32px))] h-[min(500px,calc(100vh-180px))] bg-white/95 backdrop-blur-xl border border-[#E2E9E7] shadow-2xl rounded-2xl flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-[#004D4A] to-[#0A6B66] px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                  <path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 15.3 7.1 17.5 8 11.9 4 8l5.6-1.1L12 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">Ilmvers AI</p>
                <p className="text-[11px] text-white/80">Study assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10"
              aria-label="Close Ilmvers AI"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F6]">
            {turns.map((turn, index) => (
              <p
                key={`${turn.role}-${index}`}
                className={`text-sm leading-relaxed rounded-2xl px-4 py-3 max-w-[85%] ${
                  turn.role === 'user'
                    ? 'bg-[#004D4A] text-white ml-auto rounded-br-sm'
                    : 'bg-white border border-[#E2E9E7] text-[#2E2E2E] rounded-bl-sm'
                }`}
              >
                {turn.content}
              </p>
            ))}
            {busy ? <p className="text-sm text-[#5A6E6C]">Thinking...</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <div ref={endRef} />
          </div>

          <form onSubmit={ask} className="p-3 border-t border-[#E2E9E7] bg-white flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 800))}
              placeholder="Ask a study question"
              className="flex-1 rounded-xl border border-[#E2E9E7] px-3 py-2.5 text-sm outline-none focus:border-[#004D4A]"
              aria-label="Message Ilmvers AI"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="rounded-xl bg-[#004D4A] text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-[50px] h-[50px] md:w-[55px] md:h-[55px] rounded-full bg-gradient-to-tr from-[#004D4A] to-[#0A6B66] text-white shadow-[0_4px_15px_rgba(0,77,74,0.35)] flex items-center justify-center border border-[#D4AF37]/40 transition-transform hover:scale-110"
        title="Ilmvers AI"
        aria-label={open ? 'Close Ilmvers AI' : 'Open Ilmvers AI'}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
            <path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 15.3 7.1 17.5 8 11.9 4 8l5.6-1.1L12 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
