import { POPULAR_LANGUAGE_PACKS, OfflineLanguagePack, SignboardItem } from '../data/offlineLanguagePacksData';
import { getDownloadedPacks, isPackDownloaded } from './languagePackStorage';
import { VisionTranslationResult, DetectedItem } from '../types';

export interface OfflineMatchResult {
  original: string;
  vietnamese: string;
  pinyinOrRomaji?: string;
  category: string;
  sourceLangName: string;
  note?: string;
  confidence: number;
}

// Search across all downloaded offline language packs for matching signs, phrases, or words
export function searchOfflineVocabulary(
  query: string,
  preferredLangId?: string
): OfflineMatchResult[] {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim().toLowerCase();

  // Prefer downloaded packs first, fallback to all popular packs if none downloaded yet
  let packs = getDownloadedPacks();
  if (packs.length === 0) {
    packs = POPULAR_LANGUAGE_PACKS;
  }

  if (preferredLangId) {
    const specific = packs.filter(p => p.id === preferredLangId);
    if (specific.length > 0) packs = specific;
  }

  const results: OfflineMatchResult[] = [];
  const seen = new Set<string>();

  for (const pack of packs) {
    // 1. Check exact signboard matches
    for (const sb of pack.signboards) {
      const origLower = sb.original.toLowerCase();
      const vnLower = sb.vietnamese.toLowerCase();
      const pinyinLower = (sb.pinyinOrRomaji || '').toLowerCase();

      let match = false;
      let score = 0;

      if (origLower === cleanQuery) {
        match = true;
        score = 1.0;
      } else if (cleanQuery.includes(origLower) || origLower.includes(cleanQuery)) {
        match = true;
        score = 0.85;
      } else if (vnLower.includes(cleanQuery) || pinyinLower.includes(cleanQuery)) {
        match = true;
        score = 0.75;
      }

      if (match) {
        const key = sb.original + '->' + sb.vietnamese;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            original: sb.original,
            vietnamese: sb.vietnamese,
            pinyinOrRomaji: sb.pinyinOrRomaji,
            category: sb.category,
            sourceLangName: pack.shortName,
            note: sb.note,
            confidence: score,
          });
        }
      }
    }

    // 2. Check common phrases
    for (const phrase of pack.commonPhrases) {
      const origLower = phrase.original.toLowerCase();
      const vnLower = phrase.vietnamese.toLowerCase();
      const pronLower = phrase.pronunciation.toLowerCase();

      let match = false;
      let score = 0;

      if (origLower === cleanQuery) {
        match = true;
        score = 0.95;
      } else if (cleanQuery.includes(origLower) || origLower.includes(cleanQuery)) {
        match = true;
        score = 0.8;
      } else if (vnLower.includes(cleanQuery) || pronLower.includes(cleanQuery)) {
        match = true;
        score = 0.7;
      }

      if (match) {
        const key = phrase.original + '->' + phrase.vietnamese;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            original: phrase.original,
            vietnamese: phrase.vietnamese,
            pinyinOrRomaji: phrase.pronunciation,
            category: phrase.category,
            sourceLangName: pack.shortName,
            confidence: score,
          });
        }
      }
    }

    // 3. Check single dictionary keywords
    for (const [k, v] of Object.entries(pack.dictionary)) {
      if (cleanQuery.includes(k.toLowerCase()) || v.toLowerCase().includes(cleanQuery)) {
        const key = k + '->' + v;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            original: k,
            vietnamese: v,
            category: 'sign',
            sourceLangName: pack.shortName,
            confidence: 0.6,
          });
        }
      }
    }
  }

  // Sort by highest confidence and relevance
  return results.sort((a, b) => b.confidence - a.confidence);
}

// Generate an offline translation result from text or offline dictionary search
export function translateOfflineSnapshot(
  contextTextHint?: string,
  preferredLangId: string = 'zh'
): VisionTranslationResult {
  const pack = POPULAR_LANGUAGE_PACKS.find(p => p.id === preferredLangId) || POPULAR_LANGUAGE_PACKS[0];
  const downloaded = isPackDownloaded(pack.id);

  const matchedItems: DetectedItem[] = [];

  if (contextTextHint && contextTextHint.trim()) {
    const matches = searchOfflineVocabulary(contextTextHint, pack.id);
    matches.slice(0, 4).forEach((m, idx) => {
      matchedItems.push({
        box_2d: [200 + idx * 140, 80, 310 + idx * 140, 920],
        original_text: m.original,
        translated_text: m.vietnamese,
        pronunciation: m.pinyinOrRomaji,
        category: m.category,
        cultural_tip: m.note || `Từ điển ngoại tuyến ${pack.shortName}`,
      });
    });
  }

  if (matchedItems.length === 0 && pack.signboards && pack.signboards.length > 0) {
    pack.signboards.slice(0, 4).forEach((sb, idx) => {
      matchedItems.push({
        box_2d: [180 + idx * 150, 100, 290 + idx * 150, 900],
        original_text: sb.original,
        translated_text: sb.vietnamese,
        pronunciation: sb.pinyinOrRomaji,
        category: sb.category,
        cultural_tip: sb.note || `Gói ngoại tuyến ${pack.shortName}`,
      });
    });
  }

  const summary = matchedItems.length > 0
    ? `[Gói ngoại tuyến ${pack.shortName}] Đã đối chiếu ${matchedItems.length} biển báo & cụm từ thông dụng từ bộ nhớ.`
    : `[Dịch ngoại tuyến ${pack.shortName}] Chưa tìm thấy từ phù hợp trong bộ từ điển ngoại tuyến.`;

  return {
    detected_language: pack.shortName,
    language_code: pack.id,
    summary_translation: summary,
    travel_advice: downloaded
      ? `Đang hoạt động ngoại tuyến với gói ${pack.name}.`
      : `Đang dùng bản xem trước ngoại tuyến.`,
    items: matchedItems,
  };
}
