import { useState, useEffect, useCallback } from 'preact/hooks';
import type { AppState, PickedColor, StoredColor, PaletteSession, ColorBlindnessMode, ExtMessage } from '../types';
import { analyzeColor, simulateColorBlindness, rgbToHex, contrastRatio, wcagLevel, formatRgb, formatHsl, formatHsb, formatOklch } from '../lib/color-utils';
import { ColorDisplay } from './components/ColorDisplay';
import { ContrastChecker } from './components/ContrastChecker';
import { PaletteSessionView } from './components/PaletteSession';
import { HistoryView } from './components/ColorHistory';
import { ColorBlindnessBar } from './components/ColorBlindnessPreview';
import { Onboarding } from './components/Onboarding';

type Tab = 'contrast' | 'palette' | 'history';

const DEFAULT_STATE: AppState = {
  currentColor: null,
  history: [],
  sessions: [],
  activeSessionId: null,
  settings: { pinnedBg: '#ffffff', isFirstInstall: true, colorBlindnessMode: 'none' },
};

function sendMsg(msg: ExtMessage): Promise<unknown> {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

export function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState<Tab>('contrast');
  const [picking, setPicking] = useState(false);
  const [copied, setCopied] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Load state on mount
  useEffect(() => {
    sendMsg({ type: 'GET_STATE' }).then(s => {
      const loaded = s as AppState;
      setState(loaded);
      if (loaded.settings.isFirstInstall) setShowOnboarding(true);
    });

    // Listen for color picks while popup is open
    const listener = (msg: ExtMessage) => {
      if (msg.type === 'COLOR_PICKED') {
        sendMsg({ type: 'GET_STATE' }).then(s => setState(s as AppState));
        setPicking(false);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handlePickColor = useCallback(async () => {
    if (!('EyeDropper' in window)) {
      // No native EyeDropper — send to background which injects canvas picker
      setPicking(true);
      chrome.runtime.sendMessage({ type: 'ACTIVATE_PICKER' } satisfies ExtMessage, () => window.close());
      return;
    }

    // EyeDropper MUST be called here in the popup context — it requires the user
    // activation from the button click. Calling it from a content-script message
    // listener has no gesture and throws NotAllowedError.
    setPicking(true);
    try {
      type ED = { open(): Promise<{ sRGBHex: string }> };
      const dropper = new (window as unknown as { EyeDropper: new () => ED }).EyeDropper();
      const result = await dropper.open(); // Chrome's native full-screen picker
      await sendMsg({ type: 'COLOR_PICKED', hex: result.sRGBHex });
      const s = await sendMsg({ type: 'GET_STATE' });
      setState(s as AppState);
    } catch {
      // User pressed Esc — do nothing
    }
    setPicking(false);
  }, []);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    });
  }, []);

  const handleDismissOnboarding = useCallback(async () => {
    setShowOnboarding(false);
    await sendMsg({ type: 'UPDATE_SETTINGS', settings: { isFirstInstall: false } });
    setState(prev => ({ ...prev, settings: { ...prev.settings, isFirstInstall: false } }));
  }, []);

  const handleSetPinnedBg = useCallback(async (hex: string) => {
    await sendMsg({ type: 'UPDATE_SETTINGS', settings: { pinnedBg: hex } });
    setState(prev => ({ ...prev, settings: { ...prev.settings, pinnedBg: hex } }));
  }, []);

  const handleCbMode = useCallback(async (mode: ColorBlindnessMode) => {
    await sendMsg({ type: 'UPDATE_SETTINGS', settings: { colorBlindnessMode: mode } });
    setState(prev => ({ ...prev, settings: { ...prev.settings, colorBlindnessMode: mode } }));
  }, []);

  const handleDeleteHistory = useCallback(async (id: string) => {
    await sendMsg({ type: 'DELETE_HISTORY_ITEM', id });
    setState(prev => ({ ...prev, history: prev.history.filter(c => c.id !== id) }));
  }, []);

  const handleUpdateHistoryItem = useCallback(async (id: string, tag?: string, label?: string) => {
    await sendMsg({ type: 'UPDATE_HISTORY_ITEM', id, tag, label });
    setState(prev => ({
      ...prev,
      history: prev.history.map(c => c.id === id ? { ...c, tag, label } : c),
    }));
  }, []);

  const handleStartSession = useCallback(async (name: string) => {
    const resp = await sendMsg({ type: 'START_SESSION', name }) as { session: PaletteSession };
    setState(prev => ({
      ...prev,
      sessions: [resp.session, ...prev.sessions],
      activeSessionId: resp.session.id,
    }));
  }, []);

  const handleEndSession = useCallback(async () => {
    await sendMsg({ type: 'END_SESSION' });
    setState(prev => ({ ...prev, activeSessionId: null }));
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    await sendMsg({ type: 'DELETE_SESSION', id });
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.filter(s => s.id !== id),
      activeSessionId: prev.activeSessionId === id ? null : prev.activeSessionId,
    }));
  }, []);

  const handlePickFromHistory = useCallback((color: StoredColor) => {
    setState(prev => ({ ...prev, currentColor: color }));
    setActiveTab('contrast');
  }, []);

  // Derive display color (apply CB simulation if needed)
  const displayColor = useCallback((): PickedColor | null => {
    const c = state.currentColor;
    if (!c) return null;
    const mode = state.settings.colorBlindnessMode;
    if (mode === 'none') return c;
    const simRgb = simulateColorBlindness(c.rgb, mode);
    const simHex = rgbToHex(simRgb);
    return analyzeColor(simHex);
  }, [state.currentColor, state.settings.colorBlindnessMode]);

  const dc = displayColor();

  // Active session data
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) ?? null;

  return (
    <div class="app">
      {/* Header */}
      <header class="header">
        <div class="logo">
          <img src="/icons/icon48.png" width="22" height="22" alt="" />
          <span>Prism</span>
        </div>
        <button
          class={`pick-btn ${picking ? 'picking' : ''}`}
          onClick={handlePickColor}
          title="Pick color from anywhere on screen (Alt+Shift+C)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 22 1-1h3l9-9"/>
            <path d="M3 21v-3l9-9"/>
            <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8-2.2 2.2"/>
          </svg>
          {picking ? 'Picking…' : 'Pick Color'}
        </button>
      </header>

      {showOnboarding && (
        <Onboarding onDismiss={handleDismissOnboarding} />
      )}

      {/* Color display */}
      {dc ? (
        <>
          <ColorDisplay
            color={dc}
            onCopy={handleCopy}
            copied={copied}
            cbMode={state.settings.colorBlindnessMode}
          />

          <ColorBlindnessBar mode={state.settings.colorBlindnessMode} onChange={handleCbMode} />

          {/* Tab bar */}
          <div class="tab-bar">
            {(['contrast', 'palette', 'history'] as Tab[]).map(tab => (
              <button
                key={tab}
                class={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'contrast' && 'Contrast'}
                {tab === 'palette' && (
                  <>
                    Palette
                    {state.activeSessionId && <span class="session-dot" />}
                  </>
                )}
                {tab === 'history' && `History${state.history.length > 0 ? ` (${state.history.length})` : ''}`}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div class="tab-content">
            {activeTab === 'contrast' && (
              <ContrastChecker
                color={dc}
                pinnedBg={state.settings.pinnedBg}
                onSetPinnedBg={handleSetPinnedBg}
              />
            )}
            {activeTab === 'palette' && (
              <PaletteSessionView
                sessions={state.sessions}
                activeSessionId={state.activeSessionId}
                currentColor={state.currentColor}
                onStartSession={handleStartSession}
                onEndSession={handleEndSession}
                onDeleteSession={handleDeleteSession}
                onCopy={handleCopy}
              />
            )}
            {activeTab === 'history' && (
              <HistoryView
                history={state.history}
                onDelete={handleDeleteHistory}
                onUpdate={handleUpdateHistoryItem}
                onPick={handlePickFromHistory}
                onCopy={handleCopy}
              />
            )}
          </div>
        </>
      ) : (
        <div class="empty-state">
          <button class="pick-hero-btn" onClick={handlePickColor} disabled={picking}>
            <div class="pick-hero-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#g1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#9580ff" />
                    <stop offset="100%" stop-color="#a855f7" />
                  </linearGradient>
                </defs>
                <path d="M2 13.5 L10.5 5 L19 13.5" />
                <path d="M10.5 5 L10.5 21" />
                <circle cx="10.5" cy="21" r="2.5" />
                <path d="M14 17.5 L21 17.5" />
                <path d="M17.5 14 L17.5 21" />
              </svg>
            </div>
            <span class="pick-hero-label">{picking ? 'Picking…' : 'Pick a Color'}</span>
            <span class="pick-hero-sub">from anywhere on your screen</span>
          </button>

          <div class="empty-shortcut">
            or press <kbd>Alt+Shift+C</kbd>
          </div>

          {state.history.length > 0 && (
            <div class="recent-strip">
              <span class="recent-label">Recent</span>
              <div class="swatches">
                {state.history.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    class="swatch-mini"
                    style={{ background: c.hex }}
                    title={c.hex}
                    onClick={() => handlePickFromHistory(c)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
