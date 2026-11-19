'use client';

import { RECORDING_CAP_SECONDS } from '@/lib/hifzTiming';

import { getErrorMessage } from '@/lib/errors';
// ─────────────────────────────────────────────
// hooks/useHifzRecorder.ts
// Hold-to-record with waveform visualizer
// ─────────────────────────────────────────────
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { PhonemeAlignment } from '@/types/globals';

export interface GradeResult {
  alignment: PhonemeAlignment[];
  score: number;
  tajweedFeedback: string;
  /** What Whisper actually heard -- this used to be the EXPECTED text, so the
   *  panel showed the student their own reference back and called it their
   *  recitation. */
  transcript: string;
  /** Reference words with no counterpart in the transcript, i.e. skipped.
   *  Empty whenever the transcript is too poor to make the claim safely. */
  omittedWords?: { index: number; word: string }[];
  /** Mistakes split by what the student should actually go and practise.
   *  Computed server-side so omitted words are not double-counted: a word that
   *  was never said has no makhraj to get wrong. */
  tashkeelMistakes?: number;
  makhrajMistakes?: number;
  tajweedMistakes?: number;
  ayahRange: string;
}

export type RecorderState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

/**
 * Longest single take.
 *
 * This used to be 29s, and that was not a UI choice: Whisper's feature
 * extractor pads or truncates to a 30-second window, so the sanity gate only
 * ever saw the first 30s and rejected anything longer as a gross mismatch.
 * hifz-api now chunks the audio for that gate (the Wav2Vec2 forced alignment
 * never had a 30s limit), so the real constraint is just how long a student can
 * hold their breath and how long they are willing to wait for grading.
 */
// Re-exported, not redeclared. The number itself lives in lib/hifzTiming.ts
// alongside the two timeouts that must stay above it -- see the invariant
// there. Everything already importing MAX_RECITATION_SECONDS from this hook
// keeps working.
export const MAX_RECITATION_SECONDS = RECORDING_CAP_SECONDS;

export function useHifzRecorder(onDurationLimit?: () => void) {
  const [state, setState] = useState<RecorderState>('idle');
  const [waveform, setWaveform] = useState<number[]>(new Array(24).fill(0));
  const [result, setResult] = useState<GradeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [duration, setDuration] = useState(0);

  const durationRef = useRef(0);
  const onDurationLimitRef = useRef(onDurationLimit);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  // Being told "the w was wrong" is not actionable if you cannot hear what you
  // actually said. The blob already exists; it was simply thrown away after
  // upload. Kept as an object URL and revoked when it is replaced.
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const recordingUrlRef = useRef<string | null>(null);

  const setRecording = useCallback((blob: Blob | null) => {
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    const url = blob ? URL.createObjectURL(blob) : null;
    recordingUrlRef.current = url;
    setRecordingUrl(url);
  }, []);

  // Revoke on unmount so a long session does not leak every take.
  useEffect(() => () => {
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
  }, []);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrame = useRef<number | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    onDurationLimitRef.current = onDurationLimit;
  }, [onDurationLimit]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = mr;
      audioChunks.current = [];

      // Audio analysis for waveform
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWaveform = () => {
        if (analyserRef.current && mr.state === 'recording') {
          analyserRef.current.getByteFrequencyData(dataArray);
          // take a subset for visualizer
          const snapshot = Array.from(dataArray.slice(0, 24));
          setWaveform(snapshot);
          animFrame.current = requestAnimationFrame(updateWaveform);
        }
      };

      mr.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mr.start(100);
      setState('recording');
      setErrorMsg('');
      setDuration(0);
      durationRef.current = 0;
      setResult(null);

      timerInterval.current = setInterval(() => {
        setDuration(d => {
          const newD = d + 1;
          durationRef.current = newD;
          if (newD >= MAX_RECITATION_SECONDS) {
            onDurationLimitRef.current?.();
          }
          return newD;
        });
      }, 1000);

      updateWaveform();
    } catch (err) {
      console.error(err);
      setState('error');
      setErrorMsg('Microphone access denied or unavailable.');
    }
  }, []);

  const stopAndGrade = useCallback(async (
    referenceWords: string[],
    referenceText: string,
    pageNumber: number,
    verseKey: string,
    studentId: string,
    /** Each ayah separately. The grader applies waqf at the end of every ayah,
     *  which it cannot do from one joined string. */
    referenceAyahs?: string[]
  ): Promise<GradeResult | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorder.current;
      if (!mr || mr.state === 'inactive') {
        resolve(null);
        return;
      }

      mr.onstop = async () => {
        if (timerInterval.current) clearInterval(timerInterval.current);
        if (animFrame.current) cancelAnimationFrame(animFrame.current);
        
        // Stop all tracks
        streamRef.current?.getTracks().forEach(t => t.stop());
        
        setWaveform(new Array(24).fill(0));
        
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setRecording(audioBlob);
        
        const currentDuration = durationRef.current;
        if (audioBlob.size < 500 || currentDuration < 1) {
          setState('error');
          setErrorMsg('Recording too short. Hold the button to recite.');
          resolve(null);
          return;
        }

        setState('processing');

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recitation.webm');
          formData.append('referenceWords', JSON.stringify(referenceWords));
          formData.append('referenceText', referenceText);
          formData.append('referenceAyahs', JSON.stringify(referenceAyahs ?? [referenceText]));
          formData.append('pageNumber', pageNumber.toString());
          formData.append('verseKey', verseKey);
          formData.append('studentId', studentId);
          formData.append('duration', currentDuration.toString());

          // Not authFetch: that forces Content-Type: application/json, which
          // would strip the multipart boundary the browser has to set itself.
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Your session expired. Please sign in again.');

          const res = await fetch('/api/hifz-review', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Server error: ${res.status}`);
          }

          const data = await res.json();
          if (data.error) throw new Error(data.error);

          setResult(data);
          setState('done');
          resolve(data);
        } catch (err: unknown) {
          console.error(err);
          setState('error');
          setErrorMsg(getErrorMessage(err) || 'Failed to analyze recording.');
          resolve(null);
        }
      };

      mr.stop();
    });
  }, [setRecording]);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setWaveform(new Array(24).fill(0));
    setDuration(0);
    setErrorMsg('');
    setRecording(null);
  }, [setRecording]);

  return {
    state,
    waveform,
    duration,
    result,
    errorMsg,
    recordingUrl,
    startRecording,
    stopAndGrade,
    reset,
  };
}
