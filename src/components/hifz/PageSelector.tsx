'use client';

// ─────────────────────────────────────────────
// components/hifz/PageSelector.tsx
// 604-page Quran progress grid + Juz navigation
// ─────────────────────────────────────────────
import { useState } from 'react';

export type PageStatus = 'not_started' | 'in_progress' | 'memorized';

interface Props {
  currentPage: number;
  progress: Record<number, { status: PageStatus; bestScore: number }>;
  assignedRange?: { start: number; end: number };
  onSelect: (page: number) => void;
}

// Juz start pages (standard Uthmani mushaf)
const JUZ_START_PAGES = [
  1,22,42,62,82,102,122,142,162,182,
  202,222,242,262,282,302,322,342,362,382,
  402,422,442,462,482,502,522,542,562,582,
];

export function PageSelector({ currentPage, progress, assignedRange, onSelect }: Props) {
  const [activeJuz, setActiveJuz] = useState<number>(() => {
    // find which juz the current page belongs to
    for (let i = JUZ_START_PAGES.length - 1; i >= 0; i--) {
      if (currentPage >= JUZ_START_PAGES[i]) return i + 1;
    }
    return 1;
  });

  const getPageStatus = (page: number): PageStatus => {
    return progress[page]?.status || 'not_started';
  };

  const getPageColor = (status: PageStatus, isAssigned: boolean, isCurrent: boolean) => {
    if (isCurrent) return 'bg-stone-800 text-white ring-2 ring-stone-800 ring-offset-2';
    if (status === 'memorized') return 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 border-emerald-600';
    if (status === 'in_progress') return 'bg-amber-100 text-amber-900 border-amber-300';
    if (isAssigned) return 'bg-white text-stone-600 border-stone-200 hover:border-stone-400';
    return 'bg-stone-50 text-stone-400 border-transparent opacity-50';
  };

  // Calculate pages to show for active juz
  const startIndex = JUZ_START_PAGES[activeJuz - 1];
  const endIndex = activeJuz === 30 ? 604 : JUZ_START_PAGES[activeJuz] - 1;
  const pages = Array.from({ length: endIndex - startIndex + 1 }, (_, i) => startIndex + i);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[400px]">

      {/* Juz Sidebar */}
      <div className="w-full md:w-48 overflow-y-auto border-r border-stone-100 pr-2 pb-4 scrollbar-thin">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">
          Select Juz
        </h3>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 30 }, (_, i) => {
            const juz = i + 1;
            const isActive = juz === activeJuz;

            // Calc progress for this juz
            const jStart = JUZ_START_PAGES[i];
            const jEnd = i === 29 ? 604 : JUZ_START_PAGES[i+1] - 1;
            let memorizedInJuz = 0;
            for (let p = jStart; p <= jEnd; p++) {
              if (progress[p]?.status === 'memorized') memorizedInJuz++;
            }
            const juzTotal = jEnd - jStart + 1;
            const pct = Math.round((memorizedInJuz / juzTotal) * 100);

            return (
              <button
                key={juz}
                onClick={() => setActiveJuz(juz)}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors
                  ${isActive ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'hover:bg-stone-50 text-stone-600'}
                `}
              >
                <span>Juz {juz}</span>
                {pct > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-stone-200 text-stone-600'}`}>
                    {pct}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page Grid */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white py-1 z-10">
          <h3 className="text-sm font-semibold text-stone-800">
            Juz {activeJuz} <span className="text-stone-400 font-normal ml-1">(Pages {startIndex} - {endIndex})</span>
          </h3>

          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Memorized</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-200" /> In Progress</span>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2" dir="rtl">
          {pages.map(page => {
            const status = getPageStatus(page);
            const isAssigned = assignedRange ? (page >= assignedRange.start && page <= assignedRange.end) : true;
            const isCurrent = page === currentPage;

            return (
              <button
                key={page}
                onClick={() => onSelect(page)}
                className={`
                  relative aspect-square rounded-xl border flex flex-col items-center justify-center
                  transition-all duration-200 text-sm font-semibold group
                  ${getPageColor(status, isAssigned, isCurrent)}
                  ${!isAssigned && status === 'not_started' ? 'cursor-default' : 'hover:scale-105 hover:shadow-md cursor-pointer'}
                `}
                disabled={!isAssigned && status === 'not_started'}
              >
                {page}

                {/* Score tooltip on hover */}
                {status !== 'not_started' && !isCurrent && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {progress[page]?.bestScore}% Match
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
