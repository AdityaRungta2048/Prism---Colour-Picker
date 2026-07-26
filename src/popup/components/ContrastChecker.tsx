import { useState } from 'preact/hooks';
import type { PickedColor } from '../../types';
import { contrastRatio, wcagLevel } from '../../lib/color-utils';

interface Props {
  color: PickedColor;
  pinnedBg: string;
  onSetPinnedBg: (hex: string) => void;
}

interface RatioRowProps {
  label: string;
  bg: string;
  fg: string;
  ratio: number;
}

function RatioRow({ label, bg, fg, ratio }: RatioRowProps) {
  const { aa, aaa } = wcagLevel(ratio);
  const { aa: aaLg, aaa: aaaLg } = wcagLevel(ratio, true);

  return (
    <div class="ratio-row">
      <div class="ratio-preview" style={{ background: bg, color: fg }}>
        <span class="ratio-sample">Aa</span>
      </div>
      <div class="ratio-info">
        <span class="ratio-label">{label}</span>
        <span class="ratio-value">{ratio}:1</span>
      </div>
      <div class="badges">
        <span class={`badge ${aa ? 'pass' : 'fail'}`} title="Normal text (≥4.5:1)">AA</span>
        <span class={`badge ${aaa ? 'pass' : 'fail'}`} title="Normal text (≥7:1)">AAA</span>
        <span class={`badge sm ${aaLg ? 'pass' : 'fail'}`} title="Large text (≥3:1)">AA lg</span>
        <span class={`badge sm ${aaaLg ? 'pass' : 'fail'}`} title="Large text (≥4.5:1)">AAA lg</span>
      </div>
    </div>
  );
}

export function ContrastChecker({ color, pinnedBg, onSetPinnedBg }: Props) {
  const [editingBg, setEditingBg] = useState(false);
  const [bgInput, setBgInput] = useState(pinnedBg);

  const vsWhite = contrastRatio(color.hex, '#ffffff');
  const vsBlack = contrastRatio(color.hex, '#000000');
  const vsCustom = contrastRatio(color.hex, pinnedBg);

  const handleBgSubmit = () => {
    const clean = bgInput.startsWith('#') ? bgInput : '#' + bgInput;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      onSetPinnedBg(clean);
    }
    setEditingBg(false);
  };

  return (
    <div class="contrast-checker">
      <div class="section-title">WCAG Contrast</div>

      <RatioRow label="vs White" bg="#ffffff" fg={color.hex} ratio={vsWhite} />
      <RatioRow label="vs Black" bg="#000000" fg={color.hex} ratio={vsBlack} />

      <div class="custom-bg-row">
        <RatioRow label="vs Custom" bg={pinnedBg} fg={color.hex} ratio={vsCustom} />
        {editingBg ? (
          <div class="bg-edit">
            <input
              class="hex-input"
              value={bgInput}
              onInput={e => setBgInput((e.target as HTMLInputElement).value)}
              onKeyDown={e => { if (e.key === 'Enter') handleBgSubmit(); if (e.key === 'Escape') setEditingBg(false); }}
              placeholder="#ffffff"
              maxLength={7}
              autoFocus
            />
            <button class="small-btn" onClick={handleBgSubmit}>Set</button>
            <button class="small-btn ghost" onClick={() => setEditingBg(false)}>×</button>
          </div>
        ) : (
          <button class="pin-btn" onClick={() => { setBgInput(pinnedBg); setEditingBg(true); }}>
            Change background
          </button>
        )}
      </div>
    </div>
  );
}
