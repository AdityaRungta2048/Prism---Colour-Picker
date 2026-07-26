import type { ColorBlindnessMode } from '../../types';

interface Props {
  mode: ColorBlindnessMode;
  onChange: (mode: ColorBlindnessMode) => void;
}

const MODES: { value: ColorBlindnessMode; label: string; title: string }[] = [
  { value: 'none', label: 'Normal', title: 'Normal vision' },
  { value: 'protanopia', label: 'Prot.', title: 'Protanopia (red-blind)' },
  { value: 'deuteranopia', label: 'Deut.', title: 'Deuteranopia (green-blind)' },
  { value: 'tritanopia', label: 'Trit.', title: 'Tritanopia (blue-blind)' },
];

export function ColorBlindnessBar({ mode, onChange }: Props) {
  return (
    <div class="cb-bar">
      <span class="cb-label">Vision</span>
      <div class="cb-modes">
        {MODES.map(m => (
          <button
            key={m.value}
            class={`cb-btn ${mode === m.value ? 'active' : ''}`}
            onClick={() => onChange(m.value)}
            title={m.title}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
