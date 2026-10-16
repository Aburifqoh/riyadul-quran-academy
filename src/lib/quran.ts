export interface Ayah {
  id: number;
  verse_key: string;
  text_uthmani: string;
}

// Maps our English surah names or numbers to the correct Surah ID
const surahMap: Record<string, number> = {
  "Al-Fatihah": 1, "Al-Baqarah": 2, "Aal-E-Imran": 3, "An-Nisa": 4, "Al-Ma'idah": 5, "Al-An'am": 6,
  "Al-A'raf": 7, "Al-Anfal": 8, "At-Tawbah": 9, "Yunus": 10, "Hud": 11, "Yusuf": 12, "Ar-Ra'd": 13, "Ibrahim": 14,
  "Al-Hijr": 15, "An-Nahl": 16, "Al-Isra": 17, "Al-Kahf": 18, "Maryam": 19, "Ta-Ha": 20, "Al-Anbiya": 21,
  "Al-Hajj": 22, "Al-Mu'minun": 23, "An-Nur": 24, "Al-Furqan": 25, "Ash-Shu'ara": 26, "An-Naml": 27,
  "Al-Qasas": 28, "Al-Ankabut": 29, "Ar-Rum": 30, "Luqman": 31, "As-Sajdah": 32, "Al-Ahzab": 33, "Saba": 34,
  "Fatir": 35, "Ya-Sin": 36, "As-Saffat": 37, "Sad": 38, "Az-Zumar": 39, "Ghafir": 40, "Fussilat": 41, "Ash-Shura": 42,
  "Az-Zukhruf": 43, "Ad-Dukhan": 44, "Al-Jathiyah": 45, "Al-Ahqaf": 46, "Muhammad": 47, "Al-Fath": 48,
  "Al-Hujurat": 49, "Qaf": 50, "Ad-Dhariyat": 51, "At-Tur": 52, "An-Najm": 53, "Al-Qamar": 54, "Ar-Rahman": 55,
  "Al-Waqi'ah": 56, "Al-Hadid": 57, "Al-Mujadila": 58, "Al-Hashr": 59, "Al-Mumtahanah": 60, "As-Saff": 61,
  "Al-Jumu'ah": 62, "Al-Munafiqun": 63, "At-Taghabun": 64, "At-Talaq": 65, "At-Tahrim": 66, "Al-Mulk": 67,
  "Al-Qalam": 68, "Al-Haaqqah": 69, "Al-Ma'arij": 70, "Nuh": 71, "Al-Jinn": 72, "Al-Muzzammil": 73,
  "Al-Muddaththir": 74, "Al-Qiyamah": 75, "Al-Insan": 76, "Al-Mursalat": 77, "An-Naba": 78, "An-Nazi'at": 79,
  "Abasa": 80, "At-Takwir": 81, "Al-Infitar": 82, "Al-Mutaffifin": 83, "Al-Inshiqaq": 84, "Al-Buruj": 85,
  "At-Tariq": 86, "Al-A'la": 87, "Al-Ghashiyah": 88, "Al-Fajr": 89, "Al-Balad": 90, "Ash-Shams": 91,
  "Al-Layl": 92, "Ad-Duhaa": 93, "Ash-Sharh": 94, "At-Tin": 95, "Al-Alaq": 96, "Al-Qadr": 97, "Al-Bayyinah": 98,
  "Az-Zalzalah": 99, "Al-Adiyat": 100, "Al-Qari'ah": 101, "At-Takathur": 102, "Al-Asr": 103, "Al-Humazah": 104,
  "Al-Fil": 105, "Quraysh": 106, "Al-Ma'un": 107, "Al-Kawthar": 108, "Al-Kafirun": 109, "An-Nasr": 110, "Al-Masad": 111,
  "Al-Ikhlas": 112, "Al-Falaq": 113, "An-Nas": 114
};

const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const;

const SURAH_NAMES_BY_ID = Object.entries(surahMap)
  .sort((a, b) => a[1] - b[1])
  .map(([name]) => name);

export const QURAN_CHAPTERS = AYAH_COUNTS.map((ayahs, index) => ({
  id: index + 1,
  name: SURAH_NAMES_BY_ID[index] || `Surah ${index + 1}`,
  ayahs,
}));

export const getSurahId = (surahName: string): number => {
  return surahMap[surahName] || parseInt(surahName) || 1;
};

export const fetchSurahVerses = async (surahId: number): Promise<Ayah[]> => {
  try {
    const response = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahId}`);
    if (!response.ok) throw new Error('Failed to fetch from Quran.com API');
    const data = await response.json();
    return data.verses || [];
  } catch (error) {
    console.error("Error fetching surah verses:", error);
    return [];
  }
};

// Normalize Arabic text to make simple string comparisons easier (strips diacritics/harakat)
export const normalizeArabic = (text: string): string => {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '') // Remove tashkeel/harakat
    .replace(/ٱ/g, 'ا') // Normalize Alif Waslah
    .replace(/[إأآ]/g, 'ا') // Normalize Alif with Hamza
    .replace(/ى/g, 'ي') // Normalize Alif Maqsura
    .replace(/ة/g, 'ه'); // Normalize Ta Marbuta
};

// Simplified auto-detection to find which ayahs might have been recited based on the whisper output
export const detectRecitedAyahs = (transcribedText: string, verses: Ayah[]): Ayah[] => {
  const normTranscribed = normalizeArabic(transcribedText);
  if (!normTranscribed) return verses.slice(0, 3); // Fallback: just return first 3 ayahs

  // For simplicity, we match chunks of the transcribed text against normalized verses.
  const matchingVerses = verses.filter(verse => {
    const normVerse = normalizeArabic(verse.text_uthmani);
    // If the transcribed text contains a significant portion of the verse, or vice versa
    const words = normVerse.split(/\s+/);
    let matchCount = 0;
    words.forEach(w => {
      if (w.length > 2 && normTranscribed.includes(w)) matchCount++;
    });
    return matchCount > Math.max(1, words.length * 0.3); // If 30%+ of words match loosely
  });

  return matchingVerses.length > 0 ? matchingVerses : verses.slice(0, 3); // Return matches or fallback
};
