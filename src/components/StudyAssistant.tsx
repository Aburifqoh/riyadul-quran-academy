'use client';

import { FormEvent, useState } from 'react';

type Turn = { role: 'user' | 'assistant'; content: string };

export function StudyAssistant() {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: 'assistant',
      content: 'Assalamu Alaikum. Ask me about Tajweed, Arabic practice, or how classes work at Ilmvers. I help you study. I do not give a fatwa.',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = async (event: FormEvent) => {
    event.preventDefault();
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
        body: JSON.stringify({ messages: next.filter((turn) => turn.role === 'user' || turn.role === 'assistant').slice(-8) }),
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
    <div className="bg-white border border-[#E2E9E7] rounded-3xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E9E7] bg-[#FAF9F6]">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#D4AF37]">Study assistant</p>
        <h3 className="text-xl font-headers font-bold text-[#004D4A]">Ilmvers AI</h3>
        <p className="text-sm text-[#5A6E6C] mt-1">For practice and portal questions. Not a fatwa, and not medical or financial advice.</p>
      </div>
      <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
        {turns.map((turn, index) => (
          <p
            key={`${turn.role}-${index}`}
            className={`text-sm leading-relaxed rounded-2xl px-4 py-3 ${
              turn.role === 'user' ? 'bg-[#004D4A] text-white ml-8' : 'bg-[#F0F4F2] text-[#2E2E2E] mr-8'
            }`}
          >
            {turn.content}
          </p>
        ))}
        {busy ? <p className="text-sm text-[#5A6E6C]">Thinking...</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
      <form onSubmit={ask} className="flex gap-2 p-4 border-t border-[#E2E9E7]">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a study question"
          className="flex-1 rounded-full border border-[#E2E9E7] px-4 py-3 text-sm outline-none focus:border-[#004D4A]"
          maxLength={800}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#004D4A] text-white px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
