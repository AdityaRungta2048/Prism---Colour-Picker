import type { StoredColor, PaletteSession, AppSettings, AppState } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  pinnedBg: '#ffffff',
  isFirstInstall: true,
  colorBlindnessMode: 'none',
};

const DEFAULT_STATE: AppState = {
  currentColor: null,
  history: [],
  sessions: [],
  activeSessionId: null,
  settings: DEFAULT_SETTINGS,
};

function get<T>(key: string, fallback: T): Promise<T> {
  return new Promise(resolve => {
    chrome.storage.local.get(key, result => {
      resolve(key in result ? result[key] as T : fallback);
    });
  });
}

function set(key: string, value: unknown): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve));
}

export const storage = {
  async getState(): Promise<AppState> {
    const [history, sessions, activeSessionId, settings, currentColor] = await Promise.all([
      get<StoredColor[]>('history', []),
      get<PaletteSession[]>('sessions', []),
      get<string | null>('activeSessionId', null),
      get<AppSettings>('settings', DEFAULT_SETTINGS),
      get<AppState['currentColor']>('currentColor', null),
    ]);
    return { history, sessions, activeSessionId, settings: { ...DEFAULT_SETTINGS, ...settings }, currentColor };
  },

  async saveColor(color: StoredColor): Promise<void> {
    const history = await get<StoredColor[]>('history', []);
    // Cap history at 200 items
    const updated = [color, ...history].slice(0, 200);
    await set('history', updated);
    await set('currentColor', color);
  },

  async deleteHistoryItem(id: string): Promise<void> {
    const history = await get<StoredColor[]>('history', []);
    await set('history', history.filter(c => c.id !== id));
  },

  async updateHistoryItem(id: string, patch: { tag?: string; label?: string }): Promise<void> {
    const history = await get<StoredColor[]>('history', []);
    await set('history', history.map(c => c.id === id ? { ...c, ...patch } : c));
  },

  async startSession(name: string): Promise<PaletteSession> {
    const sessions = await get<PaletteSession[]>('sessions', []);
    const session: PaletteSession = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      colors: [],
      createdAt: Date.now(),
    };
    await set('sessions', [session, ...sessions]);
    await set('activeSessionId', session.id);
    return session;
  },

  async addColorToSession(color: StoredColor): Promise<void> {
    const [sessions, activeId] = await Promise.all([
      get<PaletteSession[]>('sessions', []),
      get<string | null>('activeSessionId', null),
    ]);
    if (!activeId) return;
    await set('sessions', sessions.map(s =>
      s.id === activeId ? { ...s, colors: [...s.colors, color] } : s
    ));
  },

  async endSession(): Promise<void> {
    await set('activeSessionId', null);
  },

  async deleteSession(id: string): Promise<void> {
    const sessions = await get<PaletteSession[]>('sessions', []);
    await set('sessions', sessions.filter(s => s.id !== id));
    const activeId = await get<string | null>('activeSessionId', null);
    if (activeId === id) await set('activeSessionId', null);
  },

  async updateSettings(patch: Partial<AppSettings>): Promise<void> {
    const settings = await get<AppSettings>('settings', DEFAULT_SETTINGS);
    await set('settings', { ...settings, ...patch });
  },

  async getActiveSessionId(): Promise<string | null> {
    return get<string | null>('activeSessionId', null);
  },
};
