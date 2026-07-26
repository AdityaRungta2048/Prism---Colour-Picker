export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }
export interface HSB { h: number; s: number; b: number }
export interface OKLCH { l: number; c: number; h: number }
export interface Lab { L: number; a: number; b: number }

export interface ColorMatch {
  name: string;
  hex: string;
  distance: number;
}

export interface PickedColor {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  hsb: HSB;
  oklch: OKLCH;
  namedColor: ColorMatch | null;
  tailwindColor: (ColorMatch & { class: string }) | null;
}

export interface StoredColor extends PickedColor {
  id: string;
  timestamp: number;
  tag?: string;
  label?: string;
}

export interface PaletteSession {
  id: string;
  name: string;
  colors: StoredColor[];
  createdAt: number;
}

export type ColorBlindnessMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AppSettings {
  pinnedBg: string;
  isFirstInstall: boolean;
  colorBlindnessMode: ColorBlindnessMode;
}

export interface AppState {
  currentColor: PickedColor | null;
  history: StoredColor[];
  sessions: PaletteSession[];
  activeSessionId: string | null;
  settings: AppSettings;
}

// Messages between extension components
export type ExtMessage =
  | { type: 'ACTIVATE_PICKER' }
  | { type: 'COLOR_PICKED'; hex: string }
  | { type: 'PICKER_CANCELLED' }
  | { type: 'GET_STATE' }
  | { type: 'STATE_UPDATE'; state: Partial<AppState> }
  | { type: 'COPY_TO_CLIPBOARD'; text: string }
  | { type: 'SAVE_COLOR'; color: StoredColor }
  | { type: 'DELETE_HISTORY_ITEM'; id: string }
  | { type: 'UPDATE_HISTORY_ITEM'; id: string; tag?: string; label?: string }
  | { type: 'START_SESSION'; name: string }
  | { type: 'END_SESSION' }
  | { type: 'DELETE_SESSION'; id: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> };
