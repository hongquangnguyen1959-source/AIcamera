import { POPULAR_LANGUAGE_PACKS, OfflineLanguagePack } from '../data/offlineLanguagePacksData';

const PACKS_STORAGE_KEY = 'offline_language_packs_state_v1';
const ACTIVE_PACK_KEY = 'offline_active_pack_id_v1';

export interface StoredPackState {
  id: string;
  downloaded: boolean;
  downloadedAt?: number;
  sizeMB: number;
}

// Active language pack for offline camera scanning
export function getActivePackId(): string {
  try {
    const val = localStorage.getItem(ACTIVE_PACK_KEY);
    if (val && POPULAR_LANGUAGE_PACKS.some((p) => p.id === val)) {
      return val;
    }
  } catch {}
  return 'zh';
}

export function setActivePackId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PACK_KEY, id);
  } catch (e) {
    console.warn('Failed to save active pack ID', e);
  }
}

// Real file download: saves .json file directly to user device's Downloads folder
export function downloadPackAsJsonFile(pack: OfflineLanguagePack): void {
  try {
    const exportData = {
      app: 'AR_Camera_Translator',
      pack_id: pack.id,
      pack_name: pack.name,
      version: pack.version,
      exported_at: new Date().toISOString(),
      signboards: pack.signboards,
      common_phrases: pack.commonPhrases,
      dictionary: pack.dictionary,
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goi_ngon_ngu_${pack.id}_tieng_viet.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Also mark as saved in storage
    savePackState(pack.id, true);
  } catch (err) {
    console.warn('Error downloading JSON pack file:', err);
  }
}

// Get raw state from localStorage
export function getSavedPacksState(): Record<string, StoredPackState> {
  try {
    const raw = localStorage.getItem(PACKS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse offline packs state:', e);
  }

  // Default initial state: Gói Tiếng Trung (zh) và Tiếng Anh (en) được cấu hình sẵn để người dùng có thể dùng ngay
  const defaultState: Record<string, StoredPackState> = {
    zh: { id: 'zh', downloaded: true, downloadedAt: Date.now() - 3600000, sizeMB: 2.1 },
    en: { id: 'en', downloaded: true, downloadedAt: Date.now() - 7200000, sizeMB: 1.8 },
  };

  try {
    localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(defaultState));
  } catch {}

  return defaultState;
}

// Save pack state
export function savePackState(id: string, downloaded: boolean): void {
  try {
    const current = getSavedPacksState();
    const packDef = POPULAR_LANGUAGE_PACKS.find(p => p.id === id);
    if (downloaded) {
      current[id] = {
        id,
        downloaded: true,
        downloadedAt: Date.now(),
        sizeMB: packDef ? packDef.sizeMB : 2.0,
      };
    } else {
      delete current[id];
    }
    localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save pack state:', e);
  }
}

// Check if a pack is downloaded
export function isPackDownloaded(packId: string): boolean {
  const state = getSavedPacksState();
  return Boolean(state[packId]?.downloaded);
}

// Get all downloaded packs
export function getDownloadedPacks(): OfflineLanguagePack[] {
  const state = getSavedPacksState();
  return POPULAR_LANGUAGE_PACKS.filter(pack => Boolean(state[pack.id]?.downloaded));
}

// Get total downloaded size in MB
export function getTotalDownloadedSizeMB(): number {
  const state = getSavedPacksState();
  let total = 0;
  for (const key of Object.keys(state)) {
    if (state[key]?.downloaded) {
      total += state[key].sizeMB || 0;
    }
  }
  return Number(total.toFixed(1));
}
