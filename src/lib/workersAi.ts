type WorkersAiRunner = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

const SYSTEM_PROMPT = `You are an Islamic education quality reviewer at Ilmvers, an online Quran school.
Analyze a live class transcript (Arabic, English, or mixed) and return ONLY valid JSON:
{
  "overallScore": <number 0-100>,
  "sentiment": "<Positive|Neutral|Negative>",
  "classEngagement": "<High|Medium|Low>",
  "detectedKeywords": {
    "quranRecitation": [],
    "arabicVocabulary": [],
    "correctiveFeedback": []
  },
  "redFlags": [],
  "strengths": [],
  "teacherPerformanceSummary": "<2-3 sentences>",
  "recommendedFollowUp": "<1-2 sentences>"
}`;

export type TranscriptAnalysis = {
  overallScore: number;
  sentiment: string;
  classEngagement: string;
  detectedKeywords: {
    quranRecitation: string[];
    arabicVocabulary: string[];
    correctiveFeedback: string[];
  };
  redFlags: string[];
  strengths: string[];
  teacherPerformanceSummary: string;
  recommendedFollowUp: string;
  source?: 'workers-ai' | 'preview';
};

function parseAnalysisJson(text: string): TranscriptAnalysis | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as TranscriptAnalysis;
    if (typeof parsed.overallScore !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractText(result: unknown): string {
  if (!result) return '';
  if (typeof result === 'string') return result;
  const rec = result as Record<string, unknown>;
  if (typeof rec.response === 'string') return rec.response;
  if (typeof rec.result === 'string') return rec.result;
  const nested = rec.result as Record<string, unknown> | undefined;
  if (nested && typeof nested.response === 'string') return nested.response;
  const choices = rec.choices as Array<{ message?: { content?: string } }> | undefined;
  if (choices?.[0]?.message?.content) return choices[0].message.content;
  return '';
}

const WORKERS_AI_MODELS = [
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/meta/llama-3-8b-instruct',
];

async function runViaBinding(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const ai = (ctx.env as { AI?: WorkersAiRunner }).AI;
    if (!ai?.run) return null;
    for (const model of WORKERS_AI_MODELS) {
      try {
        const result = await ai.run(model, {
          messages,
          max_tokens: 1024,
          stream: false,
        });
        const text = extractText(result);
        if (text) return text;
      } catch (err) {
        console.warn('[workers-ai] binding model failed:', model, err);
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function runViaRest(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  if (!accountId || !token) return null;

  for (const model of WORKERS_AI_MODELS) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, max_tokens: 1024, stream: false }),
      }
    );
    if (!res.ok) {
      console.warn('[workers-ai] REST failed:', model, res.status, await res.text());
      continue;
    }
    const data = await res.json();
    const text = extractText(data.result ?? data);
    if (text) return text;
  }
  return null;
}

function previewAnalysis(transcript: string, roomName: string): TranscriptAnalysis {
  const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean);
  const arabic = transcript.match(/[\u0600-\u06FF]+/g) || [];
  const corrections = transcript.match(/again|repeat|tajweed|madd|ghunnah|makhraj|صحح|أعد/gi) || [];
  const questions = transcript.match(/\?|؟/g) || [];
  const engagement = lines.length > 20 || questions.length > 3 ? 'High' : lines.length > 8 ? 'Medium' : 'Low';
  const score = Math.min(92, 55 + Math.min(arabic.length, 20) + Math.min(corrections.length * 3, 15));

  return {
    overallScore: score,
    sentiment: corrections.length > 8 ? 'Neutral' : 'Positive',
    classEngagement: engagement,
    detectedKeywords: {
      quranRecitation: arabic.slice(0, 5),
      arabicVocabulary: [...new Set(arabic)].slice(0, 5),
      correctiveFeedback: [...new Set(corrections.map((c) => c.toLowerCase()))].slice(0, 5),
    },
    redFlags: lines.length < 4 ? ['Very short transcript — class may not have been captured fully.'] : [],
    strengths: [
      arabic.length ? 'Arabic recitation appears in the transcript.' : 'Session audio was captured.',
      questions.length ? 'Instructor asked questions during class.' : 'Lesson dialogue was recorded.',
    ],
    teacherPerformanceSummary: `Preview of room ${roomName || 'unknown'}: ${lines.length} captured lines, ${arabic.length} Arabic tokens. Connect Cloudflare Workers AI for a full Llama review.`,
    recommendedFollowUp: 'Open this class again after deploy so Workers AI can score teaching quality.',
    source: 'preview',
  };
}

export async function analyzeClassTranscript(transcript: string, roomName: string): Promise<TranscriptAnalysis> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Room: ${roomName || 'unknown'}\n\nTranscript:\n${transcript.slice(0, 8000)}` },
  ];

  const raw = (await runViaBinding(messages)) || (await runViaRest(messages));
  if (raw) {
    const parsed = parseAnalysisJson(raw);
    if (parsed) return { ...parsed, source: 'workers-ai' };
  }

  return previewAnalysis(transcript, roomName);
}
