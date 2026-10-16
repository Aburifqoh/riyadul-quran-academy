'use client';

// ─────────────────────────────────────────────
// components/hifz/RecordButton.tsx
// Hold-to-record button with live waveform
// ─────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { RecorderState } from '@/hooks/useHifzRecorder';

interface Props {
  recorderState: RecorderState;
  waveform: number[];
  duration: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function RecordButton({ recorderState, waveform, duration, onStart, onStop, disabled }: Props) {
  /**
   * Tap to start, tap to finish -- not press-and-hold.
   *
   * Holding was wrong in three separate ways. `onMouseLeave` ended the take, so
   * drifting the pointer off a 96px circle mid-ayah silently cut the recording.
   * Holding a mouse button or a finger still for up to 29 seconds is tiring on a
   * touchscreen laptop and hostile to anyone with a motor impairment. And it
   * fights the thing being recorded: reciting well needs posture and breath, not
   * a hand pinned to a button.
   *
   * A plain <button> toggle also gets keyboard and screen-reader support for
   * free, which the pointer-event handlers never had.
   */
  const toggle = useCallback(() => {
    if (recorderState === 'recording') {
      onStop();
      return;
    }
    if (disabled || recorderState === 'processing') return;
    onStart();
  }, [recorderState, disabled, onStart, onStop]);

  const isRecording = recorderState === 'recording';
  const isProcessing = recorderState === 'processing';

  // Grading runs two models over the clip and measurably takes tens of seconds.
  // A bare hourglass for that long reads as a hang, so show the clock.
  const [gradingSeconds, setGradingSeconds] = useState(0);
  useEffect(() => {
    if (!isProcessing) return;
    const started = Date.now();
    const timer = window.setInterval(
      () => setGradingSeconds(Math.floor((Date.now() - started) / 1000)),
      1000
    );
    return () => {
      window.clearInterval(timer);
      setGradingSeconds(0);
    };
  }, [isProcessing]);
  const isDone = recorderState === 'done';

  return (
    // A ROW, not a column. Stacked, the waveform and timer sat above the button
    // and grew the recite bar by ~80px the moment recording started -- so the
    // mushaf lost height exactly when the reciter needed to read it. Beside the
    // button they cost nothing: the bar is as tall as the button, always.
    <div className="flex items-center justify-center gap-3 select-none">

      {/* Waveform bars -- only while recording. At rest this was a row of 24 flat
          grey dots sitting in the middle of an empty card, which read as a broken
          element rather than an affordance. */}
      {isRecording && (
        <div className="flex items-end gap-[2px] h-8 w-20 sm:w-28" aria-hidden>
          {waveform.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(3, (v / 255) * 30)}px`,
                background: `hsl(${152 - (v / 255) * 30}, 60%, ${45 - (v / 255) * 10}%)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Duration */}
      {isRecording && (
        <div className="flex items-center gap-1.5 text-red-600 text-xs font-mono font-medium tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          {formatDuration(duration)}
        </div>
      )}

      {/* Main button */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={toggle}
          disabled={(disabled && !isRecording) || isProcessing}
          aria-pressed={isRecording}
          aria-label={isRecording ? 'Finish and grade this recitation' : 'Start reciting'}
          className={`
            relative w-16 h-16 rounded-full font-bold text-white text-sm
            transition-all duration-200 outline-none
            focus-visible:ring-4 focus-visible:ring-offset-2
            ${isRecording
              ? 'bg-red-500 scale-110 shadow-2xl shadow-red-200 focus-visible:ring-red-400'
              : isProcessing
              ? 'bg-amber-400 cursor-wait scale-100'
              : isDone
              ? 'bg-[#5D2E17] hover:bg-[#4a2412] active:scale-95 focus-visible:ring-[#F59A23]'
              : disabled
              ? 'bg-stone-300 cursor-not-allowed'
              : 'bg-gradient-to-br from-[#F59A23] to-[#ffb44d] hover:brightness-110 active:scale-95 shadow-lg shadow-[#F59A23]/30 focus-visible:ring-[#F59A23]'
            }
          `}
        >
          {/* Ripple ring when recording */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              <span className="absolute inset-[-8px] rounded-full border-2 border-red-300 animate-pulse" />
            </>
          )}

          <span className="relative flex flex-col items-center leading-tight">
            {isRecording ? (
              <>
                <span className="text-xl leading-none">⏹</span>
                <span className="text-[10px] mt-0.5">Finish</span>
              </>
            ) : isProcessing ? (
              <>
                <span className="text-xl leading-none">⏳</span>
                <span className="text-[10px] mt-0.5">{gradingSeconds > 2 ? `${gradingSeconds}s` : 'Grading'}</span>
              </>
            ) : isDone ? (
              <>
                <span className="text-xl leading-none">🔄</span>
                <span className="text-[10px] mt-0.5">Retry</span>
              </>
            ) : (
              <>
                <span className="text-xl leading-none">🎙️</span>
                <span className="text-[10px] mt-0.5">Recite</span>
              </>
            )}
          </span>
        </button>

      </div>
    </div>
  );
}
