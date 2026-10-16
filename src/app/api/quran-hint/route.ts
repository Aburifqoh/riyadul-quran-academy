import { NextRequest, NextResponse } from 'next/server';



export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let query = url.searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    // Strip out common preambles to avoid confusing the search
    query = query.replace(/اعوذ بالله من الشيطان الرجيم/g, '').replace(/بسم الله الرحمن الرحيم/g, '').trim();

    // 1. Search Quran.com with the transcript to find the approximate starting Ayah
    const searchRes = await fetch(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}`);
    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const searchData = await searchRes.json();
    const results = searchData.search?.results;

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'No match found' }, { status: 404 });
    }

    // 2. We get the top match (e.g. "6:83")
    const topMatch = results[0].verse_key;
    const [chapterStr, verseStr] = topMatch.split(':');
    const chapter = parseInt(chapterStr);
    const startVerse = parseInt(verseStr);

    // 3. Since the user might have recited into the NEXT ayah (e.g. 6:84), 
    // the top match might be 6:83 because most of the query words are in 6:83.
    // We must fetch a window of verses (e.g. from startVerse to startVerse + 2)
    const quranRes = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapter}`);
    if (!quranRes.ok) {
       return NextResponse.json({ error: 'Failed to fetch canonical verse' }, { status: 500 });
    }

    const quranData = await quranRes.json();
    const allVerses = quranData.verses || [];
    
    // Get a window of 3 verses (current, next, and next-next)
    const windowVerses = allVerses.filter((v: any) => {
      const vNum = parseInt(v.verse_key.split(':')[1]);
      return vNum >= startVerse && vNum <= startVerse + 2;
    });

    const canonicalText = windowVerses.map((v: any) => v.text_uthmani).join(' ');

    // 4. Find the last word of the user's transcript inside this canonical text window
    const queryWords = query.split(/\s+/);
    // Take the last word. If it's too short (like "و"), take the last two words for a better match.
    let lastQueryWords = [queryWords[queryWords.length - 1]];
    if (queryWords.length > 1 && lastQueryWords[0].length <= 2) {
      lastQueryWords = [queryWords[queryWords.length - 2], queryWords[queryWords.length - 1]];
    }
    
    // Basic normalization for matching (remove harakat)
    const normalize = (str: string) => str.replace(/[\u064B-\u065F]/g, ''); 
    const normalizedCanonical = normalize(canonicalText).split(/\s+/);
    
    const targetPhrase = normalize(lastQueryWords.join(' '));
    const targetWords = targetPhrase.split(/\s+/);

    let nextWord = '';
    const canonicalWords = canonicalText.split(/\s+/);

    // Scan through the canonical words to find where the target phrase ends
    for (let i = 0; i < normalizedCanonical.length - targetWords.length; i++) {
      let match = true;
      for (let j = 0; j < targetWords.length; j++) {
        if (!normalizedCanonical[i + j].includes(targetWords[j])) {
          match = false;
          break;
        }
      }
      
      if (match) {
        // We found the end of the user's recitation!
        // Return the next 3 words
        const nextIndex = i + targetWords.length;
        nextWord = canonicalWords.slice(nextIndex, nextIndex + 3).join(' ');
        
        // If we found a match, we can stop
        break;
      }
    }

    // If we couldn't match the exact word (maybe severe typo in the last word), fallback to the next verse
    if (!nextWord && windowVerses.length > 1) {
      nextWord = windowVerses[1].text_uthmani.split(/\s+/).slice(0, 3).join(' ') + '...';
    }

    return NextResponse.json({ 
      verseKey: topMatch,
      nextWord: nextWord || '...' 
    });

  } catch (error: any) {
    console.error('Quran Search Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

