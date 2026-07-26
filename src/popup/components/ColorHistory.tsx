import { useState } from 'preact/hooks';
import type { StoredColor } from '../../types';

interface Props {
  history: StoredColor[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, tag?: string, label?: string) => void;
  onPick: (color: StoredColor) => void;
  onCopy: (text: string, label: string) => void;
}

export function HistoryView({ history, onDelete, onUpdate, onPick, onCopy }: Props) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTag, setEditTag] = useState('');

  const filtered = history.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.hex.toLowerCase().includes(q) ||
      (c.label?.toLowerCase().includes(q) ?? false) ||
      (c.tag?.toLowerCase().includes(q) ?? false) ||
      (c.namedColor?.name.toLowerCase().includes(q) ?? false)
    );
  });

  function startEdit(c: StoredColor) {
    setEditingId(c.id);
    setEditLabel(c.label ?? '');
    setEditTag(c.tag ?? '');
  }

  function saveEdit(id: string) {
    onUpdate(id, editTag || undefined, editLabel || undefined);
    setEditingId(null);
  }

  return (
    <div class="history-view">
      <div class="search-row">
        <input
          class="search-input"
          placeholder="Search by hex, name, or tag…"
          value={search}
          onInput={e => setSearch((e.target as HTMLInputElement).value)}
        />
        {search && (
          <button class="clear-search" onClick={() => setSearch('')}>×</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p class="empty-hint">{search ? 'No matches.' : 'No colors picked yet.'}</p>
      ) : (
        <div class="history-list">
          {filtered.map(c => (
            <div key={c.id} class="history-item">
              {editingId === c.id ? (
                <div class="history-edit">
                  <div
                    class="history-swatch-edit"
                    style={{ background: c.hex }}
                  />
                  <div class="edit-fields">
                    <input
                      class="hex-input sm"
                      placeholder="Label…"
                      value={editLabel}
                      onInput={e => setEditLabel((e.target as HTMLInputElement).value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                    />
                    <input
                      class="hex-input sm"
                      placeholder="Tag…"
                      value={editTag}
                      onInput={e => setEditTag((e.target as HTMLInputElement).value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditingId(null); }}
                    />
                  </div>
                  <button class="small-btn" onClick={() => saveEdit(c.id)}>Save</button>
                  <button class="small-btn ghost" onClick={() => setEditingId(null)}>×</button>
                </div>
              ) : (
                <>
                  <button
                    class="history-swatch"
                    style={{ background: c.hex }}
                    onClick={() => onPick(c)}
                    title="Use this color"
                  />
                  <div class="history-meta" onClick={() => onCopy(c.hex.toUpperCase(), 'HEX')}>
                    <span class="history-hex">{c.hex.toUpperCase()}</span>
                    {(c.label || c.tag) && (
                      <span class="history-labels">
                        {c.label && <span class="history-label">{c.label}</span>}
                        {c.tag && <span class="history-tag">#{c.tag}</span>}
                      </span>
                    )}
                    {!c.label && c.namedColor && (
                      <span class="history-named">{c.namedColor.name}</span>
                    )}
                  </div>
                  <div class="history-actions">
                    <button
                      class="icon-btn"
                      onClick={() => startEdit(c)}
                      title="Label / tag"
                    >
                      ✎
                    </button>
                    <button
                      class="icon-btn danger"
                      onClick={() => onDelete(c.id)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
