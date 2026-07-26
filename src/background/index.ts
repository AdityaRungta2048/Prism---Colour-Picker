import { analyzeColor } from '../lib/color-utils';
import { storage } from '../lib/storage';
import type { ExtMessage, StoredColor } from '../types';

// Keyboard shortcut handler — open the popup so the user can click Pick Color
// (EyeDropper requires user activation from a real click; a message from SW has none)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'activate-eyedropper') {
    try {
      await (chrome.action as typeof chrome.action & { openPopup?: () => Promise<void> }).openPopup?.();
    } catch {
      // openPopup not available (pre-Chrome 127) — fall back to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await triggerPicker(tab.id);
    }
  }
});

// Message hub
chrome.runtime.onMessage.addListener((msg: ExtMessage, sender, sendResponse) => {
  handleMessage(msg, sender, sendResponse);
  return true; // keep channel open for async
});

async function handleMessage(
  msg: ExtMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (r: unknown) => void
) {
  switch (msg.type) {
    case 'ACTIVATE_PICKER': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      sendResponse({ ok: true }); // respond immediately so popup can close
      if (tab?.id) {
        // Small delay so the popup finishes closing before EyeDropper activates.
        // EyeDropper requires the page to have focus, which it gets after popup closes.
        setTimeout(() => triggerPicker(tab.id!), 200);
      }
      break;
    }

    case 'COLOR_PICKED': {
      const color = analyzeColor(msg.hex);
      const stored: StoredColor = {
        ...color,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: Date.now(),
      };
      await storage.saveColor(stored);
      const activeSessionId = await storage.getActiveSessionId();
      if (activeSessionId) await storage.addColorToSession(stored);
      sendResponse({ ok: true, color: stored });
      // Auto-reopen popup to show the picked color (Chrome 127+)
      try {
        await (chrome.action as typeof chrome.action & { openPopup?: () => Promise<void> }).openPopup?.();
      } catch { /* openPopup may not be available in all builds */ }
      break;
    }

    case 'GET_STATE': {
      const state = await storage.getState();
      sendResponse(state);
      break;
    }

    case 'SAVE_COLOR': {
      await storage.saveColor(msg.color);
      sendResponse({ ok: true });
      break;
    }

    case 'DELETE_HISTORY_ITEM': {
      await storage.deleteHistoryItem(msg.id);
      sendResponse({ ok: true });
      break;
    }

    case 'UPDATE_HISTORY_ITEM': {
      await storage.updateHistoryItem(msg.id, { tag: msg.tag, label: msg.label });
      sendResponse({ ok: true });
      break;
    }

    case 'START_SESSION': {
      const session = await storage.startSession(msg.name);
      sendResponse({ ok: true, session });
      break;
    }

    case 'END_SESSION': {
      await storage.endSession();
      sendResponse({ ok: true });
      break;
    }

    case 'DELETE_SESSION': {
      await storage.deleteSession(msg.id);
      sendResponse({ ok: true });
      break;
    }

    case 'UPDATE_SETTINGS': {
      await storage.updateSettings(msg.settings);
      sendResponse({ ok: true });
      break;
    }

    case 'COPY_TO_CLIPBOARD': {
      sendResponse({ ok: true });
      break;
    }

    default:
      sendResponse({ ok: false });
  }
}

// ── Inject content script if needed, then tell it to start the picker ─────────
async function triggerPicker(tabId: number) {
  const sent = await sendToTab(tabId, { type: 'ACTIVATE_PICKER' });
  if (!sent) {
    const ok = await injectContentScript(tabId);
    if (ok) await sendToTab(tabId, { type: 'ACTIVATE_PICKER' });
  }
}

async function sendToTab(tabId: number, msg: ExtMessage): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, msg);
    return true;
  } catch {
    return false;
  }
}

async function injectContentScript(tabId: number): Promise<boolean> {
  // Read hashed filename from our own manifest (changes each build)
  try {
    const manifest = chrome.runtime.getManifest();
    const csFile = (manifest as chrome.runtime.Manifest & {
      content_scripts?: { js?: string[] }[]
    }).content_scripts?.[0]?.js?.[0];

    if (csFile) {
      await chrome.scripting.executeScript({ target: { tabId }, files: [csFile] });
      await new Promise(r => setTimeout(r, 150));
      return true;
    }
  } catch { /* restricted page: chrome://, file://, Web Store, etc. */ }
  return false;
}
