# Pick any pixel. Copy HEX, RGB, HSL, HSB & OKLCH instantly.

# Built for designers, developers & creators.

A production-ready Chrome Extension (Manifest V3) for developers and designers. Picks any pixel, shows it in five formats simultaneously, checks WCAG contrast, builds palettes, and exports them — all locally, no network calls.

## Features

| Feature | Details |
|---|---|
| **Custom eyedropper** | Canvas-based overlay with magnifier loupe + pixel grid |
| **Magnifier loupe** | 15×15 pixel grid, 10× zoom, real-time crosshair |
| **Arrow-key nudging** | ↑↓←→ moves cursor 1 px, Enter confirms, Esc cancels |
| **Multi-format output** | HEX · RGB · HSL · HSB · CSS `oklch()` — all at once, one-click copy |
| **Named color match** | Nearest CSS named color with perceptual ΔE distance |
| **Tailwind match** | Nearest `bg-{color}-{shade}` class from the full Tailwind v3 palette |
| **WCAG contrast** | AA / AAA badges vs white, black, and a pinnable custom background |
| **Palette sessions** | Pick multiple colors; export as CSS vars, SCSS, Tailwind config, JSON, or PNG |
| **Color blindness preview** | Protanopia / Deuteranopia / Tritanopia simulation (Machado matrices) |
| **Searchable history** | Tag, label, and search past picks by hex, name, or tag |
| **Keyboard shortcut** | `Alt+Shift+C` launches the eyedropper without opening the popup |
| **100% local** | Zero network requests, zero analytics, zero data collection |

## How to use

| Action | Gesture |
|---|---|
| Pick from any page | Click **Pick Color** in the popup *or* press `Alt+Shift+C` |
| Nudge pixel | While loupe is active: `↑ ↓ ← →` |
| Confirm pick | `Enter` or mouse click |
| Cancel | `Esc` |
| Copy a format | Click any HEX / RGB / HSL / HSB / OKLCH chip |
| Start a palette session | **Palette** tab → **+ New Palette Session** |
| Export palette | Session → CSS / SCSS / Tailwind / JSON / PNG |
| Toggle color-blind view | **Vision** bar below the color swatch |

### Store listing draft

**Name:** Prism - Colour Picker

**Short description (132 chars):**
Pick any pixel. Get HEX, RGB, HSL, HSB & oklch instantly. WCAG contrast, Tailwind matches, palette export. 100% local.

**Full description:**
Prism - Colour Picker is the color picker for developers and designers who want more than a hex code.

**Pick**
Activate the precision eyedropper with one click or Alt+Shift+C. A magnifier loupe with a pixel grid appears so you can pick exact pixels — even on anti-aliased edges. Nudge the cursor 1 px at a time with arrow keys before confirming.

**Instant multi-format output**
Every picked color shows HEX, RGB, HSL, HSB, and CSS oklch() simultaneously. Click any format to copy it.

**Design-system matching**
Prism - Colour Picker shows the closest CSS named color and the nearest Tailwind v3 utility class (bg-rose-500, etc.) with a perceptual ΔE distance, so you can map scraped colors into your design system without guessing.

**WCAG contrast, built in**
The Contrast tab shows the 4:1 contrast ratio against white and black with AA/AAA pass/fail badges — and lets you pin your own background color. No more switching to a separate contrast checker.

**Palette sessions**
Start a session and every color you pick is appended to a running palette. When you're done, export the whole palette as CSS custom properties, SCSS variables, a Tailwind config snippet, raw JSON, or a PNG swatch image.

**Color blindness preview**
Toggle Protanopia, Deuteranopia, or Tritanopia simulation to check how your picked color appears to color-blind users — without leaving the popup.

**Searchable history**
Every pick is saved locally. Label and tag colors (e.g. "brand-primary", #marketing) and search by hex, name, or tag.

**Privacy first**
Prism - Colour Picker is 100% local. It makes zero network requests and collects no analytics or personal data.

### Privacy policy text

Host this at a public URL (e.g. a GitHub Pages page or a Notion page set to public):

---

**Prism - Colour Picker Privacy Policy**

Prism - Colour Picker ("the extension") is a browser tool for picking and analyzing colors.

**Data collection:** Prism - Colour Picker does not collect, transmit, or share any personal data, browsing data, or usage analytics. All color history, palette sessions, and settings are stored exclusively in your browser's local storage (`chrome.storage.local`) and never leave your device.

**Network requests:** Prism - Colour Picker makes zero outbound network requests. It has no backend server, no telemetry, and no third-party integrations.

**Screenshots:** Prism - Colour Picker temporarily captures a screenshot of the currently visible tab when you activate the eyedropper. This screenshot is used only within the extension to render the magnifier loupe and sample pixel colors. It is never stored or transmitted.

**Permissions:**
- `storage` — saves your color history, palette sessions, and settings locally.
- `activeTab` — required to capture a screenshot of the tab you are picking from.
- `clipboardWrite` — allows copying color codes when you click a format chip.
- `scripting` — injects the eyedropper overlay into the active tab.
- `downloads` — used when you export a palette as a PNG image.
- `<all_urls>` (host permission) — required so the eyedropper content script can run on any page you visit.

**Contact:** adityarungta2048@gmail.com
