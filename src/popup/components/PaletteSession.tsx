import { useState, useRef } from 'preact/hooks';
import type { PaletteSession, StoredColor, PickedColor } from '../../types';

interface Props {
  sessions: PaletteSession[];
  activeSessionId: string | null;
  currentColor: PickedColor | null;
  onStartSession: (name: string) => void;
  onEndSession: () => void;
  onDeleteSession: (id: string) => void;
  onCopy: (text: string, label: string) => void;
}

function exportCSS(colors: StoredColor[]): string {
  return ':root {\n' + colors.map((c, i) =>
    `  --color-${i + 1}: ${c.hex}; /* ${c.label ?? c.hex} */`
  ).join('\n') + '\n}';
}

function exportSCSS(colors: StoredColor[]): string {
  return colors.map((c, i) =>
    `$color-${i + 1}: ${c.hex}; // ${c.label ?? c.hex}`
  ).join('\n');
}

function exportTailwind(colors: StoredColor[]): string {
  const entries = colors.map((c, i) =>
    `    '${c.label ?? `color-${i + 1}`}': '${c.hex}',`
  ).join('\n');
  return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${entries}\n      },\n    },\n  },\n};`;
}

function exportJSON(colors: StoredColor[]): string {
  return JSON.stringify(colors.map(c => ({
    hex: c.hex,
    rgb: `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`,
    hsl: `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`,
    label: c.label,
    tag: c.tag,
  })), null, 2);
}

function exportPNG(colors: StoredColor[]): void {
  const W = 80, H = 80;
  const canvas = document.createElement('canvas');
  canvas.width = colors.length * W;
  canvas.height = H + 24;
  const ctx = canvas.getContext('2d')!;

  colors.forEach((c, i) => {
    ctx.fillStyle = c.hex;
    ctx.fillRect(i * W, 0, W, H);
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(i * W, H, W, 24);
    ctx.fillStyle = '#e8e8f0';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(c.hex.toUpperCase(), i * W + W / 2, H + 15);
  });

  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'palette.png', saveAs: true });
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

type ExportFormat = 'CSS' | 'SCSS' | 'Tailwind' | 'JSON' | 'PNG';

export function PaletteSessionView({ sessions, activeSessionId, onStartSession, onEndSession, onDeleteSession, onCopy }: Props) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  function handleExport(session: PaletteSession, fmt: ExportFormat) {
    if (fmt === 'PNG') { exportPNG(session.colors); return; }
    const text = fmt === 'CSS' ? exportCSS(session.colors)
      : fmt === 'SCSS' ? exportSCSS(session.colors)
      : fmt === 'Tailwind' ? exportTailwind(session.colors)
      : exportJSON(session.colors);
    onCopy(text, fmt);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    onStartSession(newName.trim());
    setNewName('');
    setCreating(false);
  }

  return (
    <div class="palette-view">
      {/* Active session banner */}
      {activeSession ? (
        <div class="active-session-banner">
          <div class="active-session-info">
            <span class="session-recording-dot" />
            <span class="session-name">{activeSession.name}</span>
            <span class="session-count">{activeSession.colors.length} colors</span>
          </div>
          <button class="small-btn danger" onClick={onEndSession}>Stop</button>
        </div>
      ) : (
        <div class="session-start">
          {creating ? (
            <div class="session-create-row">
              <input
                ref={nameRef}
                class="hex-input"
                placeholder="Session name…"
                value={newName}
                onInput={e => setNewName((e.target as HTMLInputElement).value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                autoFocus
              />
              <button class="small-btn" onClick={handleCreate}>Start</button>
              <button class="small-btn ghost" onClick={() => setCreating(false)}>×</button>
            </div>
          ) : (
            <button class="start-session-btn" onClick={() => setCreating(true)}>
              + New Palette Session
            </button>
          )}
        </div>
      )}

      {/* Active session color strip */}
      {activeSession && activeSession.colors.length > 0 && (
        <div class="palette-strip">
          {activeSession.colors.map(c => (
            <div
              key={c.id}
              class="palette-swatch"
              style={{ background: c.hex }}
              title={`${c.hex}${c.label ? ' — ' + c.label : ''}`}
            />
          ))}
        </div>
      )}

      {/* Export active session */}
      {activeSession && activeSession.colors.length > 0 && (
        <div class="export-row">
          <span class="export-label">Export as</span>
          {(['CSS', 'SCSS', 'Tailwind', 'JSON', 'PNG'] as ExportFormat[]).map(fmt => (
            <button key={fmt} class="export-btn" onClick={() => handleExport(activeSession, fmt)}>
              {fmt}
            </button>
          ))}
        </div>
      )}

      {/* Past sessions */}
      {sessions.filter(s => s.id !== activeSessionId).length > 0 && (
        <div class="past-sessions">
          <div class="section-title">Past Sessions</div>
          {sessions.filter(s => s.id !== activeSessionId).map(session => (
            <div key={session.id} class="session-item">
              <div class="session-header" onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}>
                <div class="session-meta">
                  <span class="session-name">{session.name}</span>
                  <span class="session-count">{session.colors.length} colors</span>
                </div>
                <div class="session-actions">
                  <button class="small-btn ghost" onClick={e => { e.stopPropagation(); onDeleteSession(session.id); }}>×</button>
                </div>
              </div>

              {expandedId === session.id && (
                <div class="session-expanded">
                  <div class="palette-strip sm">
                    {session.colors.map(c => (
                      <div
                        key={c.id}
                        class="palette-swatch"
                        style={{ background: c.hex }}
                        title={c.hex}
                      />
                    ))}
                  </div>
                  {session.colors.length > 0 && (
                    <div class="export-row">
                      {(['CSS', 'SCSS', 'Tailwind', 'JSON', 'PNG'] as ExportFormat[]).map(fmt => (
                        <button key={fmt} class="export-btn" onClick={() => handleExport(session, fmt)}>
                          {fmt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && !creating && (
        <p class="empty-hint">Start a session to build a palette — each color you pick gets appended automatically.</p>
      )}
    </div>
  );
}
