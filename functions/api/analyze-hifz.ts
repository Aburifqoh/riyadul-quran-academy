export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const targetSurah = formData.get('surah') || 'Al-Fatihah';
    const studentId = formData.get('studentId') || 'anonymous';
    const studentName = formData.get('studentName') || 'Anonymous';

    const transcribedTextProvided = formData.get('transcribedText');
    let transcribedText = transcribedTextProvided ? String(transcribedTextProvided) : "";
    let tajweedFeedback = "";

    // --- Database: Get Mode ---
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    let mode = 'free';
    try {
      const dbRes = await fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.hifz_mode&select=value`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData && dbData.length > 0) {
          mode = dbData[0].value.replace(/"/g, '');
        }
      }
    } catch(e) {
      console.warn("Failed to fetch mode, defaulting to free");
    }

    // Only do Whisper transcription if we don't already have the transcribed text
    if (!transcribedText) {
      if (!audioFile) {
        return new Response(JSON.stringify({ error: 'No audio file or transcript provided.' }), { status: 400 });
      }

      if (mode === 'premium') {
        // PREMIUM MODE: OpenAI Whisper + GPT-4o-mini
        const openAiKey = env.OPENAI_API_KEY;
        if (!openAiKey) return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500 });

        const whisperFormData = new FormData();
        whisperFormData.append('file', audioFile, 'recording.webm');
        whisperFormData.append('model', 'whisper-1');
        whisperFormData.append('language', 'ar');

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openAiKey}` },
          body: whisperFormData
        });

        if (!whisperRes.ok) return new Response(JSON.stringify({ error: 'OpenAI Whisper failed' }), { status: 500 });
        transcribedText = (await whisperRes.json()).text;

      } else {
        // FREE MODE: Cloudflare Native Whisper
        if (!env.AI) {
          return new Response(JSON.stringify({ error: 'Cloudflare AI Binding not configured.' }), { status: 500 });
        }

        try {
          const audioData = await (audioFile as File).arrayBuffer();
          const whisperRes = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
            audio: [...new Uint8Array(audioData)]
          });
          transcribedText = whisperRes.text || "";
        } catch (err: any) {
          return new Response(JSON.stringify({ error: `Cloudflare AI failed: ${err.message}` }), { status: 500 });
        }
      }
    }

    if (!transcribedText || transcribedText.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No speech detected.' }), { status: 400 });
    }

    // -----------------------------------------------------
    // COMMON: Diffing Logic & Canonical Text (Quran.com)
    // -----------------------------------------------------
    const getSurahId = (name: string) => {
       const map: any = { "Al-Fatihah": 1, "Al-Baqarah": 2, "Aal-E-Imran": 3, "An-Nisa": 4, "Al-Ma'idah": 5, "Al-An'am": 6, "Al-A'raf": 7, "Al-Anfal": 8, "At-Tawbah": 9, "Yunus": 10, "Hud": 11, "Yusuf": 12, "Ar-Ra'd": 13, "Ibrahim": 14, "Al-Hijr": 15, "An-Nahl": 16, "Al-Isra": 17, "Al-Kahf": 18, "Maryam": 19, "Ta-Ha": 20, "Al-Anbiya": 21, "Al-Hajj": 22, "Al-Mu'minun": 23, "An-Nur": 24, "Al-Furqan": 25, "Ash-Shu'ara": 26, "An-Naml": 27, "Al-Qasas": 28, "Al-Ankabut": 29, "Ar-Rum": 30, "Luqman": 31, "As-Sajdah": 32, "Al-Ahzab": 33, "Saba": 34, "Fatir": 35, "Ya-Sin": 36, "As-Saffat": 37, "Sad": 38, "Az-Zumar": 39, "Ghafir": 40, "Fussilat": 41, "Ash-Shura": 42, "Az-Zukhruf": 43, "Ad-Dukhan": 44, "Al-Jathiyah": 45, "Al-Ahqaf": 46, "Muhammad": 47, "Al-Fath": 48, "Al-Hujurat": 49, "Qaf": 50, "Ad-Dhariyat": 51, "At-Tur": 52, "An-Najm": 53, "Al-Qamar": 54, "Ar-Rahman": 55, "Al-Waqi'ah": 56, "Al-Hadid": 57, "Al-Mujadila": 58, "Al-Hashr": 59, "Al-Mumtahanah": 60, "As-Saff": 61, "Al-Jumu'ah": 62, "Al-Munafiqun": 63, "At-Taghabun": 64, "At-Talaq": 65, "At-Tahrim": 66, "Al-Mulk": 67, "Al-Qalam": 68, "Al-Haaqqah": 69, "Al-Ma'arij": 70, "Nuh": 71, "Al-Jinn": 72, "Al-Muzzammil": 73, "Al-Muddaththir": 74, "Al-Qiyamah": 75, "Al-Insan": 76, "Al-Mursalat": 77, "An-Naba": 78, "An-Nazi'at": 79, "Abasa": 80, "At-Takwir": 81, "Al-Infitar": 82, "Al-Mutaffifin": 83, "Al-Inshiqaq": 84, "Al-Buruj": 85, "At-Tariq": 86, "Al-A'la": 87, "Al-Ghashiyah": 88, "Al-Fajr": 89, "Al-Balad": 90, "Ash-Shams": 91, "Al-Layl": 92, "Ad-Duhaa": 93, "Ash-Sharh": 94, "At-Tin": 95, "Al-Alaq": 96, "Al-Qadr": 97, "Al-Bayyinah": 98, "Az-Zalzalah": 99, "Al-Adiyat": 100, "Al-Qari'ah": 101, "At-Takathur": 102, "Al-Asr": 103, "Al-Humazah": 104, "Al-Fil": 105, "Quraysh": 106, "Al-Ma'un": 107, "Al-Kawthar": 108, "Al-Kafirun": 109, "An-Nasr": 110, "Al-Masad": 111, "Al-Ikhlas": 112, "Al-Falaq": 113, "An-Nas": 114 };
       return map[name] || parseInt(name as string) || 1;
    };
    
    const normalizeArabic = (text: string) => {
      return text.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
                 .replace(/ٱ/g, 'ا').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
    };

    // Fetch canonical
    const surahId = getSurahId(targetSurah as string);
    const quranRes = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahId}`);
    const quranData = await quranRes.json();
    const verses = quranData.verses || [];

    // Detect recited ayahs
    const normTranscribed = normalizeArabic(transcribedText);
    const matchingVerses = verses.filter((verse: any) => {
      const normVerse = normalizeArabic(verse.text_uthmani);
      const words = normVerse.split(/\s+/);
      let matchCount = 0;
      words.forEach((w: string) => {
        if (w.length > 2 && normTranscribed.includes(w)) matchCount++;
      });
      return matchCount > Math.max(1, words.length * 0.3);
    });

    const recitedAyahs = matchingVerses.length > 0 ? matchingVerses : verses.slice(0, 3);
    const canonicalText = recitedAyahs.map((a: any) => a.text_uthmani).join(' ۝ ') + ' ۝';
    const ayahRange = `${recitedAyahs[0]?.verse_key} to ${recitedAyahs[recitedAyahs.length - 1]?.verse_key}`;

    // Diff Logic
    const whisperWords = transcribedText.trim().split(/\s+/).filter(Boolean);
    const canonicalWords = canonicalText.trim().split(/\s+/).filter(Boolean);
    const n = whisperWords.length;
    const m = canonicalWords.length;
    const dp: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (normalizeArabic(whisperWords[i - 1]) === normalizeArabic(canonicalWords[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const diff: any[] = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && normalizeArabic(whisperWords[i - 1]) === normalizeArabic(canonicalWords[j - 1])) {
        diff.unshift({ word: whisperWords[i - 1], canonical: canonicalWords[j - 1], status: 'correct' });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({ word: '', canonical: canonicalWords[j - 1], status: 'missing' });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        diff.unshift({ word: whisperWords[i - 1], canonical: '', status: 'extra' });
        i--;
      }
    }

    const correctCount = diff.filter(d => d.status === 'correct').length;
    const accuracyScore = diff.length > 0 ? Math.round((correctCount / diff.length) * 100) : 0;

    // -----------------------------------------------------
    // COMMON: LLM Feedback Generation
    // -----------------------------------------------------
    const prompt = `You are an expert Quranic teacher. A student recited ${targetSurah} (Ayahs ${ayahRange}).
    Canonical: "${canonicalText}"
    Student: "${transcribedText}"
    Accuracy: ${accuracyScore}%
    Provide constructive feedback on their recitation, mentioning specifically if words were missing or mispronounced based on the transcript. Keep it encouraging. Maximum 2 short paragraphs. Do not format with markdown titles.`;

    if (mode === 'premium') {
      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 250, temperature: 0.3 })
      });
      if (gptRes.ok) tajweedFeedback = (await gptRes.json()).choices?.[0]?.message?.content || "";
    } else {
      if (!env.AI) {
         tajweedFeedback = "Cloudflare AI Binding not configured. But your recitation accuracy is " + accuracyScore + "%.";
      } else {
         const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
           messages: [{ role: 'user', content: prompt }]
         });
         tajweedFeedback = aiRes.response || "";
      }
    }

    // -----------------------------------------------------
    // Save to Supabase (if not anonymous)
    // -----------------------------------------------------
    if (studentId !== 'anonymous') {
      await fetch(`${supabaseUrl}/rest/v1/hifz_sessions`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          student_id: studentId, student_name: studentName, surah_name: targetSurah, surah_number: surahId, ayah_range: ayahRange,
          whisper_text: transcribedText, canonical_text: canonicalText, mistakes: diff, tajweed_feedback: tajweedFeedback, accuracy_score: accuracyScore
        })
      });
    }

    return new Response(JSON.stringify({
      transcription: transcribedText, canonical: canonicalText, ayahRange, diff, tajweedFeedback, score: accuracyScore, mode
    }), { headers: { 'Content-Type': 'application/json' }});

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
