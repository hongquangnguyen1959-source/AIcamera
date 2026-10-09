const STORAGE_KEY = 'gemini_user_api_key';

export function getUserApiKey(): string | null {
  try {
    const key = localStorage.getItem(STORAGE_KEY);
    return key && key.trim().length > 0 ? key.trim() : null;
  } catch {
    return null;
  }
}

export function setUserApiKey(key: string): void {
  try {
    if (key && key.trim().length > 0) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save API key to localStorage', e);
  }
}

export function removeUserApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to remove API key', e);
  }
}

export function hasUserApiKey(): boolean {
  return Boolean(getUserApiKey());
}
