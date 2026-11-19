export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { transcript, roomName } = body;

    if (!transcript || typeof transcript !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid transcript text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!context.env.AI) {
      return new Response(JSON.stringify({ error: 'Cloudflare AI binding not configured. Please add AI binding in Dashboard -> Settings -> Functions.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `You are an expert Islamic education quality reviewer at Ilmvers Institute, an online Quran and Arabic learning platform.

Your task is to analyze a live class transcript and produce a structured quality report.

The transcript may be in Arabic, English, or a mix of both.

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "sentiment": "<Positive|Neutral|Negative>",
  "classEngagement": "<High|Medium|Low>",
  "detectedKeywords": {
    "quranRecitation": ["<keyword1>", ...],
    "arabicVocabulary": ["<keyword1>", ...],
    "correctiveFeedback": ["<phrase1>", ...]
  },
  "redFlags": ["<concern1>", ...],
  "strengths": ["<strength1>", ...],
  "teacherPerformanceSummary": "<2-3 sentence summary>",
  "recommendedFollowUp": "<1-2 sentence recommendation>"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Please analyze this class transcript for room "${roomName || 'Unknown'}":\n\n${transcript.slice(0, 8000)}` }
    ];

    const aiResponse = await context.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages,
      max_tokens: 1024,
      stream: false
    });

    let analysisText = aiResponse?.response || aiResponse?.result?.response || '';

    // Extract JSON from the response (the model sometimes wraps it)
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'AI returned unexpected format', raw: analysisText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
