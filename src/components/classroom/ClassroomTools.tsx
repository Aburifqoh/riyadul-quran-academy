'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, FileText, FolderOpen, Headphones, Link as LinkIcon, Video, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getResources, getTeacherStudents } from '@/lib/db';
import { fetchSurahVerses, QURAN_CHAPTERS, type Ayah } from '@/lib/quran';
import { rememberClassroomLesson } from '@/lib/classroomLesson';
import { cn } from '@/lib/utils';
import type { LibraryResource } from '@/types/content';
import type { UserData } from '@/types/user';

type PanelTab = 'quran' | 'materials';

type SyncPayload =
  | { kind: 'quran'; surah: number; ayah: number; open: boolean }
  | { kind: 'material'; url: string; title: string; type?: string; open: boolean }
  | { kind: 'close' };

type CursorPayload = {
  visible: boolean;
  ayahId?: string;
  /** Index of the word inside the ayah the teacher is pointing at. */
  wordIndex?: number;
  offsetX?: number;
  offsetY?: number;
  x?: number;
  y?: number;
};

const AYAH_ID_RE = /^\d+:\d+$/;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function offsetInBox(clientX: number, clientY: number, box: DOMRect): { offsetX: number; offsetY: number } {
  return {
    offsetX: clamp01(box.width > 0 ? (clientX - box.left) / box.width : 0.5),
    offsetY: clamp01(box.height > 0 ? (clientY - box.top) / box.height : 0.5),
  };
}

export function splitVerseWords(text: string): string[] {
  return (text || '').split(/\s+/).filter(Boolean);
}

function nearestIn(nodes: ArrayLike<HTMLElement>, clientX: number, clientY: number): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const r = node.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const cx = Math.min(Math.max(clientX, r.left), r.right);
    const cy = Math.min(Math.max(clientY, r.top), r.bottom);
    const dist = (clientX - cx) ** 2 + (clientY - cy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  }
  return best;
}

/** The word span the teacher is over, or the closest one in the same ayah. */
function wordElAt(ayahEl: HTMLElement, clientX: number, clientY: number): HTMLElement | null {
  const words = ayahEl.querySelectorAll<HTMLElement>('[data-w]');
  if (!words.length) return null;
  return nearestIn(words, clientX, clientY);
}

function nearestAyahEl(root: HTMLElement, clientX: number, clientY: number): HTMLElement | null {
  return nearestIn(root.querySelectorAll<HTMLElement>('[data-ayah-id]'), clientX, clientY);
}

function findAyahEl(root: HTMLElement, clientX: number, clientY: number, eventTarget?: EventTarget | null): HTMLElement | null {
  const fromTarget = eventTarget instanceof Element ? eventTarget.closest<HTMLElement>('[data-ayah-id]') : null;
  if (fromTarget && root.contains(fromTarget)) return fromTarget;
  const underPoint = document.elementFromPoint(clientX, clientY);
  const fromPoint = underPoint instanceof Element ? underPoint.closest<HTMLElement>('[data-ayah-id]') : null;
  if (fromPoint && root.contains(fromPoint)) return fromPoint;
  return nearestAyahEl(root, clientX, clientY);
}

function ayahSelector(ayahId: string): string | null {
  if (!AYAH_ID_RE.test(ayahId)) return null;
  return `[data-ayah-id="${ayahId}"]`;
}

function wordIn(ayah: HTMLElement, wordIndex?: number): HTMLElement | null {
  if (!Number.isInteger(wordIndex)) return null;
  return ayah.querySelector<HTMLElement>(`[data-w="${wordIndex}"]`);
}

function revealAyah(workspace: HTMLElement, ayahId: string, wordIndex?: number) {
  const sel = ayahSelector(ayahId);
  if (!sel) return;
  const ayah = workspace.querySelector<HTMLElement>(sel);
  if (!ayah) return;
  const target = wordIn(ayah, wordIndex) || ayah;
  const wr = workspace.getBoundingClientRect();
  const ar = target.getBoundingClientRect();
  if (ar.bottom < wr.top + 8 || ar.top > wr.bottom - 8) {
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function assignedIds(user?: UserData | null): string[] {
  const raw = user?.assignedResources;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function resourceIcon(type?: string) {
  const key = (type || '').toLowerCase();
  if (key === 'audio') return <Headphones className="w-4 h-4" />;
  if (key === 'video') return <Video className="w-4 h-4" />;
  if (key === 'link') return <LinkIcon className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

export function ClassroomTools({
  roomName,
  isTeacher,
  userData,
}: {
  roomName: string;
  isTeacher: boolean;
  userData: UserData | null;
}) {
  const [tab, setTab] = useState<PanelTab | null>(null);
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [verses, setVerses] = useState<Ayah[]>([]);
  const [loadedSurah, setLoadedSurah] = useState<number | null>(null);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [students, setStudents] = useState<UserData[]>([]);
  const [preview, setPreview] = useState<{ url: string; title: string; type?: string } | null>(null);
  const [following, setFollowing] = useState(false);
  const [remoteCursor, setRemoteCursor] = useState<CursorPayload | null>(null);
  const [localCursor, setLocalCursor] = useState<CursorPayload | null>(null);
  const workspaceRef = React.useRef<HTMLDivElement | null>(null);
  const lastCursorSent = React.useRef(0);
  const lastPointRef = React.useRef<CursorPayload>({ visible: false });

  const channelName = `classroom-tools-${roomName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const channelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

  const broadcast = useCallback(async (payload: SyncPayload) => {
    if (!isTeacher) return;
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'classroom-tools',
      payload,
    });
  }, [isTeacher]);

  const sendCursor = useCallback((payload: CursorPayload) => {
    if (!isTeacher) return;
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'classroom-cursor',
      payload,
    });
  }, [isTeacher]);

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'classroom-tools' }, ({ payload }) => {
        const data = payload as SyncPayload;
        if (!data || isTeacher) return;
        if (data.kind === 'close') {
          setTab(null);
          setPreview(null);
          setFollowing(false);
          setRemoteCursor(null);
          return;
        }
        if (data.kind === 'quran') {
          setFollowing(true);
          setTab('quran');
          setSurah(data.surah);
          setAyah(data.ayah);
          setPreview(null);
        }
        if (data.kind === 'material' && data.open) {
          setFollowing(true);
          setTab('materials');
          setPreview({ url: data.url, title: data.title, type: data.type });
        }
      })
      .on('broadcast', { event: 'classroom-cursor' }, ({ payload }) => {
        if (isTeacher) return;
        const data = payload as CursorPayload;
        if (!data?.visible) {
          setRemoteCursor(null);
          return;
        }
        const el = workspaceRef.current;
        if (el && data.ayahId) revealAyah(el, data.ayahId, data.wordIndex);
        setRemoteCursor(data);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [channelName, isTeacher]);

  useEffect(() => {
    let cancelled = false;
    fetchSurahVerses(surah).then((rows) => {
      if (!cancelled) {
        setVerses(rows);
        setLoadedSurah(surah);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [surah]);

  const quranLoading = loadedSurah !== surah;

  useEffect(() => {
    if (isTeacher || !remoteCursor?.ayahId || quranLoading) return;
    const el = workspaceRef.current;
    if (el) revealAyah(el, remoteCursor.ayahId, remoteCursor.wordIndex);
  }, [isTeacher, remoteCursor?.ayahId, remoteCursor?.wordIndex, quranLoading, verses.length, surah]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getResources();
      if (cancelled) return;
      setResources(all || []);
      if (isTeacher && userData) {
        const roster = await getTeacherStudents({ id: userData.id, email: userData.email });
        if (!cancelled) setStudents(roster);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTeacher, userData]);

  const chapter = QURAN_CHAPTERS.find((c) => c.id === surah) || QURAN_CHAPTERS[0];
  const locked = !isTeacher && following;

  const groupedMaterials = useMemo(() => {
    const byId = new Map(resources.map((r) => [r.id, r]));
    if (isTeacher) {
      const groups = students.map((student) => ({
        studentId: student.id,
        studentName: student.name || 'Student',
        items: assignedIds(student).map((id) => byId.get(id)).filter(Boolean) as LibraryResource[],
      })).filter((g) => g.items.length > 0);
      const own = resources.filter((r) => r.submitted_by === userData?.id);
      return { groups, own };
    }
    const mine = assignedIds(userData)
      .map((id) => byId.get(id))
      .filter(Boolean) as LibraryResource[];
    return { groups: mine.length ? [{ studentId: userData?.id || 'me', studentName: 'Assigned to you', items: mine }] : [], own: [] as LibraryResource[] };
  }, [isTeacher, resources, students, userData]);

  const openPanel = (next: PanelTab) => {
    if (locked && next !== tab) return;
    setTab(next);
    if (next === 'quran' && isTeacher) {
      rememberClassroomLesson({ surah, ayah, chapterName: chapter.name });
      void broadcast({ kind: 'quran', surah, ayah, open: true });
    }
  };

  const closePanel = () => {
    if (locked) return;
    setTab(null);
    setPreview(null);
    if (isTeacher) void broadcast({ kind: 'close' });
  };

  const goAyah = (nextAyah: number, nextSurah = surah) => {
    const target = QURAN_CHAPTERS.find((c) => c.id === nextSurah) || chapter;
    const clamped = Math.min(Math.max(1, nextAyah), target.ayahs);
    if (nextSurah !== surah) setSurah(nextSurah);
    setAyah(clamped);
    if (isTeacher) {
      rememberClassroomLesson({
        surah: nextSurah,
        ayah: clamped,
        chapterName: (QURAN_CHAPTERS.find((c) => c.id === nextSurah) || chapter).name,
      });
      void broadcast({ kind: 'quran', surah: nextSurah, ayah: clamped, open: true });
    }
  };

  const nextAyah = () => {
    if (ayah < chapter.ayahs) goAyah(ayah + 1);
    else if (surah < 114) goAyah(1, surah + 1);
  };

  const prevAyah = () => {
    if (ayah > 1) goAyah(ayah - 1);
    else if (surah > 1) {
      const prev = QURAN_CHAPTERS[surah - 2];
      goAyah(prev.ayahs, prev.id);
    }
  };

  const goAyahRef = React.useRef(goAyah);
  useEffect(() => {
    goAyahRef.current = goAyah;
  });

  /**
   * Every word gets its own box so the shared pointer can name one. Memoised on the
   * verse data alone: without this, each pointer move re-rendered every ayah of the
   * surah, which is thousands of nodes 25 times a second.
   */
  const mushaf = useMemo(() => {
    if (quranLoading) return <p className="text-center text-gray-400 font-medium">Loading mushaf…</p>;
    return (
      <div className="space-y-4 font-[family-name:var(--font-amiri-quran)] text-[28px] leading-[2.2] text-[#2c1810]">
        {verses.map((verse, index) => {
          const n = index + 1;
          return (
            <button
              key={verse.verse_key || n}
              type="button"
              data-ayah-id={`${surah}:${n}`}
              onClick={() => isTeacher && goAyahRef.current(n)}
              disabled={locked}
              className={cn(
                'w-full text-right px-3 py-2 rounded-2xl transition-colors disabled:pointer-events-none',
                n === ayah ? 'bg-amber-100 ring-2 ring-amber-400' : 'hover:bg-amber-50'
              )}
            >
              {splitVerseWords(verse.text_uthmani).map((word, wordIndex) => (
                <React.Fragment key={wordIndex}>
                  {wordIndex > 0 ? ' ' : null}
                  <span data-w={wordIndex} className="inline-block">{word}</span>
                </React.Fragment>
              ))}
              <span className="inline-flex items-center justify-center mx-2 w-7 h-7 rounded-full border border-amber-400 text-xs font-bold text-amber-700 align-middle">
                {n}
              </span>
            </button>
          );
        })}
      </div>
    );
  }, [verses, surah, ayah, locked, isTeacher, quranLoading]);

  const pointFromEvent = (e: React.MouseEvent<HTMLDivElement>): CursorPayload | null => {
    const el = workspaceRef.current;
    if (!el) return null;
    const ayahEl = findAyahEl(el, e.clientX, e.clientY, e.target);
    if (ayahEl) {
      const ayahId = ayahEl.getAttribute('data-ayah-id') || '';
      if (AYAH_ID_RE.test(ayahId)) {
        // Anchor to a word rather than to a fraction of the whole ayah. The same
        // verse wraps over a different number of lines on the student's narrower
        // panel, so a normalised box offset lands on the wrong line entirely; a
        // word index lands on the same word whatever the layout does.
        const wordEl = wordElAt(ayahEl, e.clientX, e.clientY);
        const wordIndex = wordEl ? Number(wordEl.getAttribute('data-w')) : NaN;
        if (wordEl && Number.isInteger(wordIndex)) {
          return {
            visible: true,
            ayahId,
            wordIndex,
            ...offsetInBox(e.clientX, e.clientY, wordEl.getBoundingClientRect()),
          };
        }
        return { visible: true, ayahId, ...offsetInBox(e.clientX, e.clientY, ayahEl.getBoundingClientRect()) };
      }
    }
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    return {
      visible: true,
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  };

  const handleWorkspaceMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTeacher) return;
    // 25 Hz is smooth to the eye and keeps the mushaf off React's render path on
    // every mouse event, which is what made the pointer feel like it lagged.
    const now = Date.now();
    if (now - lastCursorSent.current < 40) return;
    lastCursorSent.current = now;
    const next = pointFromEvent(e);
    if (!next) return;
    lastPointRef.current = next;
    setLocalCursor(next);
    sendCursor(next);
  };

  const handleWorkspaceLeave = () => {
    if (!isTeacher) return;
    setLocalCursor(null);
    lastPointRef.current = { visible: false };
    sendCursor({ visible: false });
  };

  const handleWorkspaceScroll = () => {
    if (!isTeacher) return;
    const next = lastPointRef.current;
    if (!next.visible) return;
    setLocalCursor(next);
    sendCursor(next);
  };

  const openMaterial = (item: LibraryResource, share: boolean) => {
    if (!item.url) return;
    setPreview({ url: item.url, title: item.title || 'Material', type: item.type });
    setTab('materials');
    if (share && isTeacher) {
      rememberClassroomLesson({ materialTitle: item.title || 'Material', materialUrl: item.url });
      void broadcast({ kind: 'material', url: item.url, title: item.title || 'Material', type: item.type, open: true });
    }
  };

  return (
    <>
      <div className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 z-[45] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => (tab === 'quran' ? closePanel() : openPanel('quran'))}
          className={cn(
            'w-12 h-12 rounded-2xl shadow-lg border flex items-center justify-center',
            tab === 'quran' ? 'bg-primary text-white border-primary' : 'bg-white/95 text-secondary border-gray-200'
          )}
          title="Classroom Quran"
        >
          <BookOpen className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => (tab === 'materials' ? closePanel() : openPanel('materials'))}
          className={cn(
            'w-12 h-12 rounded-2xl shadow-lg border flex items-center justify-center',
            tab === 'materials' ? 'bg-primary text-white border-primary' : 'bg-white/95 text-secondary border-gray-200'
          )}
          title="Student materials"
        >
          <FolderOpen className="w-5 h-5" />
        </button>
      </div>

      {tab && (
        <div className="pointer-events-auto absolute inset-y-0 left-0 z-[46] w-full max-w-[440px] bg-[#FBF6EE] shadow-2xl border-r border-amber-100 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-white/80">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openPanel('quran')}
                disabled={locked && tab !== 'quran'}
                className={cn('px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-40', tab === 'quran' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600')}
              >
                Quran
              </button>
              <button
                type="button"
                onClick={() => openPanel('materials')}
                disabled={locked && tab !== 'materials'}
                className={cn('px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-40', tab === 'materials' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600')}
              >
                Materials
              </button>
            </div>
            <button type="button" onClick={closePanel} disabled={locked} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30" aria-label="Close panel">
              <X className="w-4 h-4" />
            </button>
          </div>

          {locked && (
            <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border-b border-amber-100">
              Instructor has locked the page · watch the green pointer
            </p>
          )}

          {tab === 'quran' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="p-3 border-b border-amber-100 bg-white/60 flex items-center gap-2">
                <select
                  value={surah}
                  disabled={locked}
                  onChange={(e) => goAyah(1, Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-xl border border-amber-200 bg-white text-sm font-bold text-secondary"
                >
                  {QURAN_CHAPTERS.map((c) => (
                    <option key={c.id} value={c.id}>{c.id}. {c.name}</option>
                  ))}
                </select>
                <button type="button" onClick={prevAyah} disabled={locked} className="p-2 rounded-xl bg-white border border-amber-200 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={nextAyah} disabled={locked} className="p-2 rounded-xl bg-white border border-amber-200 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <LessonStage
                workspaceRef={workspaceRef}
                isTeacher={isTeacher}
                cursor={isTeacher ? localCursor : remoteCursor}
                layoutKey={`${surah}:${verses.length}:${quranLoading ? '1' : '0'}`}
                onMove={handleWorkspaceMove}
                onLeave={handleWorkspaceLeave}
                onScroll={handleWorkspaceScroll}
                dir="rtl"
                className="px-5 py-6"
              >
                {mushaf}
              </LessonStage>
              <p className="px-4 py-3 text-xs text-center text-gray-500 bg-white/70 border-t border-amber-100">
                {chapter.name} · ayah {ayah} of {chapter.ayahs}
                {isTeacher ? ' · students see this page with you' : ''}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              {preview ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-amber-100 bg-white/70">
                    <p className="text-sm font-bold text-secondary truncate pr-3">{preview.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={preview.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </a>
                      {!locked && (
                        <button type="button" onClick={() => setPreview(null)} className="text-xs font-bold text-gray-500">Back</button>
                      )}
                    </div>
                  </div>
                  <LessonStage
                    workspaceRef={workspaceRef}
                    isTeacher={isTeacher}
                    cursor={isTeacher ? localCursor : remoteCursor}
                    layoutKey={preview.url}
                    onMove={handleWorkspaceMove}
                    onLeave={handleWorkspaceLeave}
                    onScroll={handleWorkspaceScroll}
                    overflow="hidden"
                  >
                    {(preview.type || '').toLowerCase() === 'audio' ? (
                      <div className="p-6"><audio src={preview.url} controls className="w-full" /></div>
                    ) : (
                      <>
                        <iframe title={preview.title} src={preview.url} className="absolute inset-0 w-full h-full bg-white pointer-events-none" />
                        <div className="absolute inset-0" />
                      </>
                    )}
                  </LessonStage>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {groupedMaterials.groups.length === 0 && groupedMaterials.own.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-10">
                      {isTeacher ? 'No materials assigned to your students yet.' : 'No materials assigned to you yet.'}
                    </p>
                  )}
                  {groupedMaterials.groups.map((group) => (
                    <div key={group.studentId}>
                      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">{group.studentName}</p>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <MaterialRow
                            key={item.id}
                            item={item}
                            isTeacher={isTeacher}
                            onOpen={() => openMaterial(item, false)}
                            onShare={() => openMaterial(item, true)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {isTeacher && groupedMaterials.own.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Your uploads</p>
                      <div className="space-y-2">
                        {groupedMaterials.own.map((item) => (
                          <MaterialRow
                            key={item.id}
                            item={item}
                            isTeacher
                            onOpen={() => openMaterial(item, false)}
                            onShare={() => openMaterial(item, true)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function LessonStage({
  workspaceRef,
  isTeacher,
  cursor,
  layoutKey,
  onMove,
  onLeave,
  onScroll,
  dir,
  className,
  overflow = 'auto',
  children,
}: {
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  isTeacher: boolean;
  cursor: CursorPayload | null;
  layoutKey?: string;
  onMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
  onScroll: () => void;
  dir?: 'rtl' | 'ltr';
  className?: string;
  overflow?: 'auto' | 'hidden';
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={workspaceRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onScroll={onScroll}
        dir={dir}
        className={cn(
          'h-full relative',
          overflow === 'hidden' ? 'overflow-hidden' : 'overflow-y-auto',
          isTeacher && 'cursor-none',
          className
        )}
      >
        {children}
      </div>
      <TeacherCursor cursor={cursor} workspaceRef={workspaceRef} layoutKey={layoutKey} />
    </div>
  );
}

function TeacherCursor({
  cursor,
  workspaceRef,
  layoutKey,
}: {
  cursor: CursorPayload | null;
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  layoutKey?: string;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null);

  const place = useCallback(() => {
    if (!cursor?.visible) {
      setPos(null);
      return;
    }
    const host = hostRef.current;
    const workspace = workspaceRef.current;
    if (!host) return;

    if (cursor.ayahId && workspace) {
      const sel = ayahSelector(cursor.ayahId);
      const ayah = sel ? workspace.querySelector<HTMLElement>(sel) : null;
      if (ayah) {
        const target = wordIn(ayah, cursor.wordIndex) || ayah;
        const ar = target.getBoundingClientRect();
        const hr = host.getBoundingClientRect();
        const ox = Number.isFinite(cursor.offsetX) ? cursor.offsetX! : 0.5;
        const oy = Number.isFinite(cursor.offsetY) ? cursor.offsetY! : 0.5;
        setPos({
          left: ar.left - hr.left + ox * ar.width,
          top: ar.top - hr.top + oy * ar.height,
        });
        return;
      }
    }

    if (workspace && cursor.x != null && cursor.y != null) {
      const wr = workspace.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      setPos({
        left: wr.left - hr.left + cursor.x * wr.width,
        top: wr.top - hr.top + cursor.y * wr.height,
      });
    }
  }, [cursor, workspaceRef]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(place);
    const workspace = workspaceRef.current;
    workspace?.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      workspace?.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [place, workspaceRef, layoutKey]);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {pos && cursor?.visible && (
        <div className="absolute" style={{ left: pos.left, top: pos.top }}>
          <svg width="26" height="26" viewBox="0 0 24 24" className="-translate-x-1 -translate-y-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
            <path d="M4 3.2l15.2 9.1-7.1 1.5L9.8 21 4 3.2z" fill="#84cc16" stroke="#3f6212" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span className="absolute left-5 top-4 whitespace-nowrap rounded bg-lime-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow">
            Instructor
          </span>
        </div>
      )}
    </div>
  );
}

function MaterialRow({
  item,
  isTeacher,
  onOpen,
  onShare,
}: {
  item: LibraryResource;
  isTeacher: boolean;
  onOpen: () => void;
  onShare: () => void;
}) {
  return (
    <div className="bg-white border border-amber-100 rounded-2xl p-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
        {resourceIcon(item.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-secondary m-0 truncate">{item.title || 'Untitled'}</p>
        <p className="text-[11px] text-gray-400 m-0">{item.type || 'File'}{item.category ? ` · ${item.category}` : ''}</p>
        <div className="flex gap-2 mt-2">
          <button type="button" onClick={onOpen} className="text-xs font-bold text-primary">Open</button>
          {isTeacher && (
            <button type="button" onClick={onShare} className="text-xs font-bold text-amber-700">Show to class</button>
          )}
        </div>
      </div>
    </div>
  );
}
