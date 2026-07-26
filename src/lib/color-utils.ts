import type { RGB, HSL, HSB, OKLCH, Lab, ColorMatch, PickedColor } from '../types';

// ─── HEX ↔ RGB ───────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex(rgb: RGB): string {
  return '#' + [rgb.r, rgb.g, rgb.b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

// ─── RGB ↔ HSL ────────────────────────────────────────────────────────────────

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / delta + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / delta + 2) / 6; break;
      case b: h = ((r - g) / delta + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360, s = hsl.s / 100, l = hsl.l / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(hue2rgb(h + 1/3) * 255),
    g: Math.round(hue2rgb(h) * 255),
    b: Math.round(hue2rgb(h - 1/3) * 255),
  };
}

// ─── RGB ↔ HSB (HSV) ─────────────────────────────────────────────────────────

export function rgbToHsb(rgb: RGB): HSB {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  const s = max === 0 ? 0 : delta / max;
  const bv = max;

  if (delta !== 0) {
    switch (max) {
      case r: h = ((g - b) / delta + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / delta + 2) / 6; break;
      case b: h = ((r - g) / delta + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    b: Math.round(bv * 100),
  };
}

// ─── RGB → OKLCH ─────────────────────────────────────────────────────────────

function linearize(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function rgbToOklch(rgb: RGB): OKLCH {
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  // Linear sRGB → XYZ D65
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;

  // XYZ → LMS (OKLab)
  const l0 = 0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z;
  const m0 = 0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z;
  const s0 = 0.0482003018 * X + 0.2643662691 * Y + 0.6338517070 * Z;

  const l1 = Math.cbrt(l0);
  const m1 = Math.cbrt(m0);
  const s1 = Math.cbrt(s0);

  // LMS → OKLab
  const L = 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1;
  const bk = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1;

  const C = Math.sqrt(a * a + bk * bk);
  let H = Math.atan2(bk, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return {
    l: Math.round(L * 1000) / 10,
    c: Math.round(C * 10000) / 10000,
    h: Math.round(H * 10) / 10,
  };
}

export function formatOklch(oklch: OKLCH): string {
  return `oklch(${oklch.l}% ${oklch.c.toFixed(4)} ${oklch.h}deg)`;
}

// ─── CIE Lab (for perceptual distance) ────────────────────────────────────────

function xyzToLab(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

export function rgbToLab(rgb: RGB): Lab {
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / 1.00000;
  const Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;

  const fx = xyzToLab(X), fy = xyzToLab(Y), fz = xyzToLab(Z);
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function labDistance(a: Lab, b: Lab): number {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

// ─── WCAG Contrast Ratio ──────────────────────────────────────────────────────

function relativeLuminance(rgb: RGB): number {
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const L1 = relativeLuminance(hexToRgb(hex1));
  const L2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function wcagLevel(ratio: number, isLargeText = false): { aa: boolean; aaa: boolean } {
  return {
    aa: ratio >= (isLargeText ? 3 : 4.5),
    aaa: ratio >= (isLargeText ? 4.5 : 7),
  };
}

// ─── Color Blindness Simulation ───────────────────────────────────────────────

// Machado et al. (2009) severity=1.0 matrices
const CB_MATRICES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900],
  ],
} as const;

export function simulateColorBlindness(
  rgb: RGB,
  type: 'protanopia' | 'deuteranopia' | 'tritanopia'
): RGB {
  const m = CB_MATRICES[type];
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  return {
    r: Math.round(Math.max(0, Math.min(255, (m[0][0] * r + m[0][1] * g + m[0][2] * b) * 255))),
    g: Math.round(Math.max(0, Math.min(255, (m[1][0] * r + m[1][1] * g + m[1][2] * b) * 255))),
    b: Math.round(Math.max(0, Math.min(255, (m[2][0] * r + m[2][1] * g + m[2][2] * b) * 255))),
  };
}

// ─── CSS Named Colors ──────────────────────────────────────────────────────────

const NAMED_COLORS: [string, string][] = [
  ['aliceblue','#f0f8ff'],['antiquewhite','#faebd7'],['aqua','#00ffff'],
  ['aquamarine','#7fffd4'],['azure','#f0ffff'],['beige','#f5f5dc'],
  ['bisque','#ffe4c4'],['black','#000000'],['blanchedalmond','#ffebcd'],
  ['blue','#0000ff'],['blueviolet','#8a2be2'],['brown','#a52a2a'],
  ['burlywood','#deb887'],['cadetblue','#5f9ea0'],['chartreuse','#7fff00'],
  ['chocolate','#d2691e'],['coral','#ff7f50'],['cornflowerblue','#6495ed'],
  ['cornsilk','#fff8dc'],['crimson','#dc143c'],['cyan','#00ffff'],
  ['darkblue','#00008b'],['darkcyan','#008b8b'],['darkgoldenrod','#b8860b'],
  ['darkgray','#a9a9a9'],['darkgreen','#006400'],['darkkhaki','#bdb76b'],
  ['darkmagenta','#8b008b'],['darkolivegreen','#556b2f'],['darkorange','#ff8c00'],
  ['darkorchid','#9932cc'],['darkred','#8b0000'],['darksalmon','#e9967a'],
  ['darkseagreen','#8fbc8f'],['darkslateblue','#483d8b'],['darkslategray','#2f4f4f'],
  ['darkturquoise','#00ced1'],['darkviolet','#9400d3'],['deeppink','#ff1493'],
  ['deepskyblue','#00bfff'],['dimgray','#696969'],['dodgerblue','#1e90ff'],
  ['firebrick','#b22222'],['floralwhite','#fffaf0'],['forestgreen','#228b22'],
  ['fuchsia','#ff00ff'],['gainsboro','#dcdcdc'],['ghostwhite','#f8f8ff'],
  ['gold','#ffd700'],['goldenrod','#daa520'],['gray','#808080'],
  ['green','#008000'],['greenyellow','#adff2f'],['honeydew','#f0fff0'],
  ['hotpink','#ff69b4'],['indianred','#cd5c5c'],['indigo','#4b0082'],
  ['ivory','#fffff0'],['khaki','#f0e68c'],['lavender','#e6e6fa'],
  ['lavenderblush','#fff0f5'],['lawngreen','#7cfc00'],['lemonchiffon','#fffacd'],
  ['lightblue','#add8e6'],['lightcoral','#f08080'],['lightcyan','#e0ffff'],
  ['lightgoldenrodyellow','#fafad2'],['lightgray','#d3d3d3'],['lightgreen','#90ee90'],
  ['lightpink','#ffb6c1'],['lightsalmon','#ffa07a'],['lightseagreen','#20b2aa'],
  ['lightskyblue','#87cefa'],['lightslategray','#778899'],['lightsteelblue','#b0c4de'],
  ['lightyellow','#ffffe0'],['lime','#00ff00'],['limegreen','#32cd32'],
  ['linen','#faf0e6'],['magenta','#ff00ff'],['maroon','#800000'],
  ['mediumaquamarine','#66cdaa'],['mediumblue','#0000cd'],['mediumorchid','#ba55d3'],
  ['mediumpurple','#9370db'],['mediumseagreen','#3cb371'],['mediumslateblue','#7b68ee'],
  ['mediumspringgreen','#00fa9a'],['mediumturquoise','#48d1cc'],['mediumvioletred','#c71585'],
  ['midnightblue','#191970'],['mintcream','#f5fffa'],['mistyrose','#ffe4e1'],
  ['moccasin','#ffe4b5'],['navajowhite','#ffdead'],['navy','#000080'],
  ['oldlace','#fdf5e6'],['olive','#808000'],['olivedrab','#6b8e23'],
  ['orange','#ffa500'],['orangered','#ff4500'],['orchid','#da70d6'],
  ['palegoldenrod','#eee8aa'],['palegreen','#98fb98'],['paleturquoise','#afeeee'],
  ['palevioletred','#db7093'],['papayawhip','#ffefd5'],['peachpuff','#ffdab9'],
  ['peru','#cd853f'],['pink','#ffc0cb'],['plum','#dda0dd'],
  ['powderblue','#b0e0e6'],['purple','#800080'],['rebeccapurple','#663399'],
  ['red','#ff0000'],['rosybrown','#bc8f8f'],['royalblue','#4169e1'],
  ['saddlebrown','#8b4513'],['salmon','#fa8072'],['sandybrown','#f4a460'],
  ['seagreen','#2e8b57'],['seashell','#fff5ee'],['sienna','#a0522d'],
  ['silver','#c0c0c0'],['skyblue','#87ceeb'],['slateblue','#6a5acd'],
  ['slategray','#708090'],['snow','#fffafa'],['springgreen','#00ff7f'],
  ['steelblue','#4682b4'],['tan','#d2b48c'],['teal','#008080'],
  ['thistle','#d8bfd8'],['tomato','#ff6347'],['turquoise','#40e0d0'],
  ['violet','#ee82ee'],['wheat','#f5deb3'],['white','#ffffff'],
  ['whitesmoke','#f5f5f5'],['yellow','#ffff00'],['yellowgreen','#9acd32'],
];

// ─── Tailwind Colors ───────────────────────────────────────────────────────────

const TW_COLORS: [string, string, string][] = [
  // [prefix, shade, hex]
  ['slate','50','#f8fafc'],['slate','100','#f1f5f9'],['slate','200','#e2e8f0'],
  ['slate','300','#cbd5e1'],['slate','400','#94a3b8'],['slate','500','#64748b'],
  ['slate','600','#475569'],['slate','700','#334155'],['slate','800','#1e293b'],
  ['slate','900','#0f172a'],['slate','950','#020617'],
  ['gray','50','#f9fafb'],['gray','100','#f3f4f6'],['gray','200','#e5e7eb'],
  ['gray','300','#d1d5db'],['gray','400','#9ca3af'],['gray','500','#6b7280'],
  ['gray','600','#4b5563'],['gray','700','#374151'],['gray','800','#1f2937'],
  ['gray','900','#111827'],['gray','950','#030712'],
  ['zinc','50','#fafafa'],['zinc','100','#f4f4f5'],['zinc','200','#e4e4e7'],
  ['zinc','300','#d4d4d8'],['zinc','400','#a1a1aa'],['zinc','500','#71717a'],
  ['zinc','600','#52525b'],['zinc','700','#3f3f46'],['zinc','800','#27272a'],
  ['zinc','900','#18181b'],['zinc','950','#09090b'],
  ['neutral','50','#fafafa'],['neutral','100','#f5f5f5'],['neutral','200','#e5e5e5'],
  ['neutral','300','#d4d4d4'],['neutral','400','#a3a3a3'],['neutral','500','#737373'],
  ['neutral','600','#525252'],['neutral','700','#404040'],['neutral','800','#262626'],
  ['neutral','900','#171717'],['neutral','950','#0a0a0a'],
  ['stone','50','#fafaf9'],['stone','100','#f5f5f4'],['stone','200','#e7e5e4'],
  ['stone','300','#d6d3d1'],['stone','400','#a8a29e'],['stone','500','#78716c'],
  ['stone','600','#57534e'],['stone','700','#44403c'],['stone','800','#292524'],
  ['stone','900','#1c1917'],['stone','950','#0c0a09'],
  ['red','50','#fef2f2'],['red','100','#fee2e2'],['red','200','#fecaca'],
  ['red','300','#fca5a5'],['red','400','#f87171'],['red','500','#ef4444'],
  ['red','600','#dc2626'],['red','700','#b91c1c'],['red','800','#991b1b'],
  ['red','900','#7f1d1d'],['red','950','#450a0a'],
  ['orange','50','#fff7ed'],['orange','100','#ffedd5'],['orange','200','#fed7aa'],
  ['orange','300','#fdba74'],['orange','400','#fb923c'],['orange','500','#f97316'],
  ['orange','600','#ea580c'],['orange','700','#c2410c'],['orange','800','#9a3412'],
  ['orange','900','#7c2d12'],['orange','950','#431407'],
  ['amber','50','#fffbeb'],['amber','100','#fef3c7'],['amber','200','#fde68a'],
  ['amber','300','#fcd34d'],['amber','400','#fbbf24'],['amber','500','#f59e0b'],
  ['amber','600','#d97706'],['amber','700','#b45309'],['amber','800','#92400e'],
  ['amber','900','#78350f'],['amber','950','#451a03'],
  ['yellow','50','#fefce8'],['yellow','100','#fef9c3'],['yellow','200','#fef08a'],
  ['yellow','300','#fde047'],['yellow','400','#facc15'],['yellow','500','#eab308'],
  ['yellow','600','#ca8a04'],['yellow','700','#a16207'],['yellow','800','#854d0e'],
  ['yellow','900','#713f12'],['yellow','950','#422006'],
  ['lime','50','#f7fee7'],['lime','100','#ecfccb'],['lime','200','#d9f99d'],
  ['lime','300','#bef264'],['lime','400','#a3e635'],['lime','500','#84cc16'],
  ['lime','600','#65a30d'],['lime','700','#4d7c0f'],['lime','800','#3f6212'],
  ['lime','900','#365314'],['lime','950','#1a2e05'],
  ['green','50','#f0fdf4'],['green','100','#dcfce7'],['green','200','#bbf7d0'],
  ['green','300','#86efac'],['green','400','#4ade80'],['green','500','#22c55e'],
  ['green','600','#16a34a'],['green','700','#15803d'],['green','800','#166534'],
  ['green','900','#14532d'],['green','950','#052e16'],
  ['emerald','50','#ecfdf5'],['emerald','100','#d1fae5'],['emerald','200','#a7f3d0'],
  ['emerald','300','#6ee7b7'],['emerald','400','#34d399'],['emerald','500','#10b981'],
  ['emerald','600','#059669'],['emerald','700','#047857'],['emerald','800','#065f46'],
  ['emerald','900','#064e3b'],['emerald','950','#022c22'],
  ['teal','50','#f0fdfa'],['teal','100','#ccfbf1'],['teal','200','#99f6e4'],
  ['teal','300','#5eead4'],['teal','400','#2dd4bf'],['teal','500','#14b8a6'],
  ['teal','600','#0d9488'],['teal','700','#0f766e'],['teal','800','#115e59'],
  ['teal','900','#134e4a'],['teal','950','#042f2e'],
  ['cyan','50','#ecfeff'],['cyan','100','#cffafe'],['cyan','200','#a5f3fc'],
  ['cyan','300','#67e8f9'],['cyan','400','#22d3ee'],['cyan','500','#06b6d4'],
  ['cyan','600','#0891b2'],['cyan','700','#0e7490'],['cyan','800','#155e75'],
  ['cyan','900','#164e63'],['cyan','950','#083344'],
  ['sky','50','#f0f9ff'],['sky','100','#e0f2fe'],['sky','200','#bae6fd'],
  ['sky','300','#7dd3fc'],['sky','400','#38bdf8'],['sky','500','#0ea5e9'],
  ['sky','600','#0284c7'],['sky','700','#0369a1'],['sky','800','#075985'],
  ['sky','900','#0c4a6e'],['sky','950','#082f49'],
  ['blue','50','#eff6ff'],['blue','100','#dbeafe'],['blue','200','#bfdbfe'],
  ['blue','300','#93c5fd'],['blue','400','#60a5fa'],['blue','500','#3b82f6'],
  ['blue','600','#2563eb'],['blue','700','#1d4ed8'],['blue','800','#1e40af'],
  ['blue','900','#1e3a8a'],['blue','950','#172554'],
  ['indigo','50','#eef2ff'],['indigo','100','#e0e7ff'],['indigo','200','#c7d2fe'],
  ['indigo','300','#a5b4fc'],['indigo','400','#818cf8'],['indigo','500','#6366f1'],
  ['indigo','600','#4f46e5'],['indigo','700','#4338ca'],['indigo','800','#3730a3'],
  ['indigo','900','#312e81'],['indigo','950','#1e1b4b'],
  ['violet','50','#f5f3ff'],['violet','100','#ede9fe'],['violet','200','#ddd6fe'],
  ['violet','300','#c4b5fd'],['violet','400','#a78bfa'],['violet','500','#8b5cf6'],
  ['violet','600','#7c3aed'],['violet','700','#6d28d9'],['violet','800','#5b21b6'],
  ['violet','900','#4c1d95'],['violet','950','#2e1065'],
  ['purple','50','#faf5ff'],['purple','100','#f3e8ff'],['purple','200','#e9d5ff'],
  ['purple','300','#d8b4fe'],['purple','400','#c084fc'],['purple','500','#a855f7'],
  ['purple','600','#9333ea'],['purple','700','#7e22ce'],['purple','800','#6b21a8'],
  ['purple','900','#581c87'],['purple','950','#3b0764'],
  ['fuchsia','50','#fdf4ff'],['fuchsia','100','#fae8ff'],['fuchsia','200','#f5d0fe'],
  ['fuchsia','300','#f0abfc'],['fuchsia','400','#e879f9'],['fuchsia','500','#d946ef'],
  ['fuchsia','600','#c026d3'],['fuchsia','700','#a21caf'],['fuchsia','800','#86198f'],
  ['fuchsia','900','#701a75'],['fuchsia','950','#4a044e'],
  ['pink','50','#fdf2f8'],['pink','100','#fce7f3'],['pink','200','#fbcfe8'],
  ['pink','300','#f9a8d4'],['pink','400','#f472b6'],['pink','500','#ec4899'],
  ['pink','600','#db2777'],['pink','700','#be185d'],['pink','800','#9d174d'],
  ['pink','900','#831843'],['pink','950','#500724'],
  ['rose','50','#fff1f2'],['rose','100','#ffe4e6'],['rose','200','#fecdd3'],
  ['rose','300','#fda4af'],['rose','400','#fb7185'],['rose','500','#f43f5e'],
  ['rose','600','#e11d48'],['rose','700','#be123c'],['rose','800','#9f1239'],
  ['rose','900','#881337'],['rose','950','#4c0519'],
];

// ─── Nearest Color Finders ────────────────────────────────────────────────────

let _namedLabCache: { lab: Lab; hex: string; name: string }[] | null = null;
let _twLabCache: { lab: Lab; hex: string; name: string; class: string }[] | null = null;

function getNamedLabCache() {
  if (!_namedLabCache) {
    _namedLabCache = NAMED_COLORS.map(([name, hex]) => ({
      lab: rgbToLab(hexToRgb(hex)),
      hex,
      name,
    }));
  }
  return _namedLabCache;
}

function getTwLabCache() {
  if (!_twLabCache) {
    _twLabCache = TW_COLORS.map(([prefix, shade, hex]) => ({
      lab: rgbToLab(hexToRgb(hex)),
      hex,
      name: `${prefix}-${shade}`,
      class: `bg-${prefix}-${shade}`,
    }));
  }
  return _twLabCache;
}

export function nearestNamedColor(hex: string): ColorMatch {
  const lab = rgbToLab(hexToRgb(hex));
  const cache = getNamedLabCache();
  let best = cache[0];
  let bestDist = labDistance(lab, best.lab);
  for (const entry of cache) {
    const d = labDistance(lab, entry.lab);
    if (d < bestDist) { bestDist = d; best = entry; }
  }
  return { name: best.name, hex: best.hex, distance: Math.round(bestDist * 10) / 10 };
}

export function nearestTailwindColor(hex: string): ColorMatch & { class: string } {
  const lab = rgbToLab(hexToRgb(hex));
  const cache = getTwLabCache();
  let best = cache[0];
  let bestDist = labDistance(lab, best.lab);
  for (const entry of cache) {
    const d = labDistance(lab, entry.lab);
    if (d < bestDist) { bestDist = d; best = entry; }
  }
  return { name: best.name, hex: best.hex, class: best.class, distance: Math.round(bestDist * 10) / 10 };
}

// ─── Full Color Analysis ──────────────────────────────────────────────────────

export function analyzeColor(hex: string): PickedColor {
  const normalized = hex.startsWith('#') ? hex : '#' + hex;
  const rgb = hexToRgb(normalized);
  return {
    hex: rgbToHex(rgb),
    rgb,
    hsl: rgbToHsl(rgb),
    hsb: rgbToHsb(rgb),
    oklch: rgbToOklch(rgb),
    namedColor: nearestNamedColor(normalized),
    tailwindColor: nearestTailwindColor(normalized),
  };
}

// ─── Format Strings ───────────────────────────────────────────────────────────

export function formatHex(hex: string): string {
  return hex.toUpperCase();
}

export function formatRgb(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function formatHsl(hsl: HSL): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

export function formatHsb(hsb: HSB): string {
  return `hsb(${hsb.h}, ${hsb.s}%, ${hsb.b}%)`;
}

export function isValidHex(hex: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}
