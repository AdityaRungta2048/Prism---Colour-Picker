import type { PickedColor, ColorBlindnessMode } from '../../types';
import { formatRgb, formatHsl, formatHsb, formatOklch } from '../../lib/color-utils';

interface Props {
  color: PickedColor;
  onCopy: (text: string, label: string) => void;
  copied: string;
  cbMode: ColorBlindnessMode;
}

function luminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function ColorDisplay({ color, onCopy, copied, cbMode }: Props) {
  const isLight = luminance(color.hex) > 0.4;
  const textColor = isLight ? '#111' : '#fff';

  const formats = [
    { key: 'HEX', value: color.hex.toUpperCase(), display: color.hex.toUpperCase() },
    { key: 'RGB', value: formatRgb(color.rgb), display: formatRgb(color.rgb) },
    { key: 'HSL', value: formatHsl(color.hsl), display: formatHsl(color.hsl) },
    { key: 'HSB', value: formatHsb(color.hsb), display: formatHsb(color.hsb) },
    { key: 'OKLCH', value: formatOklch(color.oklch), display: formatOklch(color.oklch) },
  ];

  return (
    <div class="color-display">
      {/* Large swatch */}
      <div
        class="color-swatch"
        style={{ background: color.hex }}
        onClick={() => onCopy(color.hex.toUpperCase(), 'HEX')}
        title="Click to copy HEX"
      >
        <div class="swatch-hex" style={{ color: textColor }}>
          {color.hex.toUpperCase()}
        </div>
        {cbMode !== 'none' && (
          <div class="cb-badge" style={{ color: textColor }}>
            {cbMode === 'protanopia' ? 'Protanopia' : cbMode === 'deuteranopia' ? 'Deuteranopia' : 'Tritanopia'} simulation
          </div>
        )}
      </div>

      {/* Format chips */}
      <div class="format-grid">
        {formats.map(({ key, value, display }) => (
          <button
            key={key}
            class={`format-chip ${copied === key ? 'copied' : ''}`}
            onClick={() => onCopy(value, key)}
            title={`Copy ${key}`}
          >
            <span class="format-label">{key}</span>
            <span class="format-value">{display}</span>
            <span class="copy-indicator">{copied === key ? '✓' : ''}</span>
          </button>
        ))}
      </div>

      {/* Named color + Tailwind match */}
      <div class="match-row">
        {color.namedColor && (
          <button
            class="match-chip"
            onClick={() => onCopy(color.namedColor!.hex, 'named')}
            title={`Closest CSS color: ${color.namedColor.name} (ΔE ${color.namedColor.distance})`}
          >
            <span
              class="match-swatch"
              style={{ background: color.namedColor.hex }}
            />
            <span class="match-name">{color.namedColor.name}</span>
            <span class="match-delta">ΔE {color.namedColor.distance}</span>
          </button>
        )}
        {color.tailwindColor && (
          <button
            class="match-chip"
            onClick={() => onCopy(color.tailwindColor!.class, 'tailwind')}
            title={`Closest Tailwind: ${color.tailwindColor.class} (ΔE ${color.tailwindColor.distance})`}
          >
            <span
              class="match-swatch tw-logo"
              style={{ background: color.tailwindColor.hex }}
            />
            <span class="match-name tw">{color.tailwindColor.class}</span>
            <span class="match-delta">ΔE {color.tailwindColor.distance}</span>
          </button>
        )}
      </div>
    </div>
  );
}
