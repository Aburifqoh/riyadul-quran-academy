// ─────────────────────────────────────────────
// app/api/hifz-review/route.ts
// Whisper transcription + GPT-4o-mini feedback
// Reference text pre-loaded — no ayah guessing
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeArabic,
  stripPreamble,
  splitMergedWords,
  diffWords,
  calculateAccuracy,
  WordResult,
} from '@/lib/arabicUtils';


export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_HIFZ_LAB_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Hifz Lab is not enabled.' }, { status: 404 });
  }
  try {
    const formData = await req.formData();

    const audioFile = formData.get('audio') as File | null;
    const referenceText = formData.get('referenceText') as string;
    const referenceWordsRaw = formData.get('referenceWords') as string;
    const pageNumber = parseInt(formData.get('pageNumber') as string);
    const verseKey = formData.get('verseKey') as string;
    const studentId = formData.get('studentId') as string;
    const duration = parseInt(formData.get('duration') as string) || 0;

    if (!audioFile || !referenceText || !referenceWordsRaw || !verseKey || !studentId) {
      console.error('Missing fields:', {
        hasAudio: !!audioFile,
        referenceText,
        referenceWordsRaw,
        verseKey,
        studentId
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const referenceWords: string[] = JSON.parse(referenceWordsRaw);

    // 1. Transcribe with Whisper
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'ar');
    whisperFormData.append('prompt', referenceText); // Force whisper to favor these words

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      console.error('Whisper API Error:', err);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }

    const whisperData = await whisperRes.json();
    const transcript = whisperData.text || '';

    // 2. Diff engine
    const diff = diffWords(referenceWords, transcript);
    const score = calculateAccuracy(diff);
    const errors = diff.filter(d => d.status !== 'correct').map(d => d.word);

    let tajweedFeedback = '';

    // 3. GPT-4o-mini Teacher Feedback (ONLY if there are errors)
    if (score < 100 && errors.length > 0) {
      const sysPrompt = `
You are a strict but encouraging Quran Hifz teacher (Muqri).
The student was reciting Ayah ${verseKey}.
Reference text: "${referenceText}"
Student said: "${transcript}"

The following words were missed or pronounced wrong:
${errors.join(', ')}

Provide a very short, encouraging 1-3 sentence feedback in English. 
Point out the specific mistake briefly. Do not grade out of 100, the system already does that.
      `.trim();

      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: sysPrompt }],
          max_tokens: 100,
          temperature: 0.3,
        }),
      });

      if (gptRes.ok) {
        const gptData = await gptRes.json();
        tajweedFeedback = gptData.choices[0]?.message?.content || '';
      }
    } else {
      tajweedFeedback = "Perfectly recited! Masha'Allah. Keep up the excellent work.";
    }

    // 4. Save to Supabase (Background / Non-blocking)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const wordCount = referenceWords.length;
    const correctCount = diff.filter(d => d.status === 'correct').length;

    // We do not await these to speed up the response to the user
    Promise.all([
      supabase.from('hifz_sessions').insert({
        student_id: studentId,
        page_number: pageNumber,
        verse_key: verseKey,
        score,
        errors,
        transcript,
        feedback: tajweedFeedback,
        word_count: wordCount,
        correct_count: correctCount,
        duration_seconds: duration,
      }),
      supabase.rpc('upsert_hifz_progress', {
        p_student_id: studentId,
        p_page_number: pageNumber,
        p_score: score,
      })
    ]).catch(e => console.error('Supabase logging failed:', e));

    return NextResponse.json({
      diff,
      score,
      tajweedFeedback,
      transcript,
      ayahRange: `Ayah ${verseKey}`
    });

  } catch (error: any) {
    console.error('Hifz Review Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
