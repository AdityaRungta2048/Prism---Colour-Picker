import type { ExtMessage } from '../types';

if (!(window as unknown as Record<string, boolean>).__prismInjected) {
  (window as unknown as Record<string, boolean>).__prismInjected = true;
  init();
}

function init() {
  chrome.runtime.onMessage.addListener((msg: ExtMessage) => {
    if (msg.type === 'ACTIVATE_PICKER') {
      startPicker();
    }
  });
}

// ── Primary: native EyeDropper API ───────────────────────────────────────────
// Works on the entire screen (other tabs, apps, taskbar, etc.)
// Chrome shows its own accurate magnifier — no coordinate issues.
async function startPicker() {
  if ('EyeDropper' in window) {
    try {
      type ED = { open(opts?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }> };
      const dropper = new (window as unknown as { EyeDropper: new () => ED }).EyeDropper();
      const result  = await dropper.open();
      chrome.runtime.sendMessage({ type: 'COLOR_PICKED', hex: result.sRGBHex } satisfies ExtMessage);
    } catch {
      // User pressed Esc or cancelled — do nothing
    }
    return;
  }

  // ── Fallback: canvas overlay (for browsers without EyeDropper support) ─────
  chrome.runtime.sendMessage(
    { type: 'ACTIVATE_PICKER' } satisfies ExtMessage,
    (resp: { dataUrl?: string }) => {
      if (resp?.dataUrl) {
        const img = new Image();
        img.onload = () => buildCanvasPicker(img);
        img.src = resp.dataUrl;
      }
    }
  );
}

// ── Canvas picker fallback (no EyeDropper) ────────────────────────────────────
function buildCanvasPicker(img: HTMLImageElement) {
  if (document.getElementById('__prism-overlay')) return;

  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  const DPR  = window.devicePixelRatio || 1;

  const overlay = document.createElement('div');
  overlay.id = '__prism-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0',
    width: cssW + 'px', height: cssH + 'px',
    zIndex: '2147483647', cursor: 'crosshair',
    userSelect: 'none', overflow: 'hidden',
  });

  const canvas = document.createElement('canvas');
  canvas.width = cssW; canvas.height = cssH;
  Object.assign(canvas.style, { display: 'block', width: cssW + 'px', height: cssH + 'px' });
  overlay.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, cssW, cssH);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 0, cssW, cssH);

  // Offscreen at physical resolution for accurate sampling
  const physCanvas = document.createElement('canvas');
  physCanvas.width  = Math.round(cssW * DPR);
  physCanvas.height = Math.round(cssH * DPR);
  const pCtx = physCanvas.getContext('2d', { willReadFrequently: true })!;
  pCtx.drawImage(img, 0, 0);

  const LOUPE = 160, GRID = 15, CELL = LOUPE / GRID, HALF = Math.floor(GRID / 2);
  const loupe = document.createElement('canvas');
  loupe.width = LOUPE; loupe.height = LOUPE;
  Object.assign(loupe.style, {
    position: 'fixed', pointerEvents: 'none', borderRadius: '50%',
    zIndex: '2147483647', display: 'none',
    boxShadow: '0 4px 24px rgba(0,0,0,0.55), 0 0 0 2.5px #7c6ef4',
  });
  overlay.appendChild(loupe);
  const lCtx = loupe.getContext('2d')!;

  const info = document.createElement('div');
  Object.assign(info.style, {
    position: 'fixed', pointerEvents: 'none', zIndex: '2147483647',
    background: 'rgba(15,15,19,0.95)', color: '#e8e8f0', display: 'none',
    padding: '4px 10px', borderRadius: '6px',
    fontFamily: 'ui-monospace,monospace', fontSize: '12px', whiteSpace: 'nowrap',
    boxShadow: '0 2px 12px rgba(0,0,0,0.5)', border: '1px solid rgba(124,110,244,0.4)',
  });
  overlay.appendChild(info);

  const hint = document.createElement('div');
  Object.assign(hint.style, {
    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(15,15,19,0.88)', color: '#9b99b0',
    padding: '6px 16px', borderRadius: '20px', fontSize: '12px',
    fontFamily: 'ui-sans-serif,sans-serif', zIndex: '2147483647',
    pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.1)',
  });
  hint.textContent = '↑↓←→ nudge · Enter pick · Esc cancel';
  overlay.appendChild(hint);

  document.body.appendChild(overlay);

  let mx = Math.round(cssW / 2), my = Math.round(cssH / 2), rafPending = false;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  function sampleHex(cx: number, cy: number) {
    const px = clamp(Math.round(cx * DPR), 0, physCanvas.width - 1);
    const py = clamp(Math.round(cy * DPR), 0, physCanvas.height - 1);
    const d  = pCtx.getImageData(px, py, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function frame(x: number, y: number) {
    const rx = clamp(x - HALF, 0, cssW-1), ry = clamp(y - HALF, 0, cssH-1);
    const rw = clamp(x + HALF, 0, cssW-1) - rx + 1, rh = clamp(y + HALF, 0, cssH-1) - ry + 1;
    const reg = ctx.getImageData(rx, ry, rw, rh);
    lCtx.clearRect(0, 0, LOUPE, LOUPE);
    lCtx.save(); lCtx.beginPath(); lCtx.arc(LOUPE/2, LOUPE/2, LOUPE/2, 0, Math.PI*2); lCtx.clip();
    for (let dy = -HALF; dy <= HALF; dy++) {
      for (let dx = -HALF; dx <= HALF; dx++) {
        const px = clamp(x+dx,0,cssW-1)-rx, py = clamp(y+dy,0,cssH-1)-ry;
        const i  = (py*reg.width+px)*4;
        lCtx.fillStyle = `rgb(${reg.data[i]},${reg.data[i+1]},${reg.data[i+2]})`;
        lCtx.fillRect((dx+HALF)*CELL, (dy+HALF)*CELL, CELL+0.5, CELL+0.5);
      }
    }
    lCtx.strokeStyle='rgba(0,0,0,0.15)'; lCtx.lineWidth=0.5;
    for (let i = 0; i <= GRID; i++) {
      lCtx.beginPath(); lCtx.moveTo(i*CELL,0); lCtx.lineTo(i*CELL,LOUPE); lCtx.stroke();
      lCtx.beginPath(); lCtx.moveTo(0,i*CELL); lCtx.lineTo(LOUPE,i*CELL); lCtx.stroke();
    }
    lCtx.restore();
    const cx2=LOUPE/2, cy2=LOUPE/2;
    lCtx.strokeStyle='rgba(255,255,255,0.9)'; lCtx.lineWidth=1.5;
    lCtx.beginPath(); lCtx.moveTo(cx2-CELL,cy2); lCtx.lineTo(cx2+CELL,cy2); lCtx.stroke();
    lCtx.beginPath(); lCtx.moveTo(cx2,cy2-CELL); lCtx.lineTo(cx2,cy2+CELL); lCtx.stroke();
    lCtx.restore();

    const OFF=22; let lx=x+OFF, ly=y-LOUPE-OFF;
    if (lx+LOUPE>cssW-8) lx=x-LOUPE-OFF;
    if (ly<8) ly=y+OFF;
    loupe.style.left=lx+'px'; loupe.style.top=ly+'px'; loupe.style.display='block';

    const hex=sampleHex(x,y), [r,g,b]=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
    info.textContent=`${hex.toUpperCase()}   rgb(${r}, ${g}, ${b})`;
    info.style.left=lx+'px'; info.style.top=(ly+LOUPE+8)+'px'; info.style.display='block';
    if (ly+LOUPE+44>cssH) info.style.top=(ly-34)+'px';
  }

  function scheduleFrame() {
    if (rafPending) return; rafPending=true;
    requestAnimationFrame(()=>{ rafPending=false; frame(mx,my); });
  }

  function confirmPick() {
    const hex=sampleHex(mx,my); cleanup();
    chrome.runtime.sendMessage({ type:'COLOR_PICKED', hex } satisfies ExtMessage);
  }
  function cleanup() { overlay.remove(); document.removeEventListener('keydown',onKey,true); }

  overlay.addEventListener('mousemove', e=>{ mx=Math.round(e.clientX); my=Math.round(e.clientY); scheduleFrame(); });
  overlay.addEventListener('click', e=>{ mx=Math.round(e.clientX); my=Math.round(e.clientY); confirmPick(); });

  function onKey(e: KeyboardEvent) {
    if (e.key==='Escape')     { e.preventDefault(); cleanup(); return; }
    if (e.key==='Enter')      { e.preventDefault(); confirmPick(); return; }
    if (e.key==='ArrowLeft')  { e.preventDefault(); mx=clamp(mx-1,0,cssW-1); scheduleFrame(); return; }
    if (e.key==='ArrowRight') { e.preventDefault(); mx=clamp(mx+1,0,cssW-1); scheduleFrame(); return; }
    if (e.key==='ArrowUp')    { e.preventDefault(); my=clamp(my-1,0,cssH-1); scheduleFrame(); return; }
    if (e.key==='ArrowDown')  { e.preventDefault(); my=clamp(my+1,0,cssH-1); scheduleFrame(); return; }
  }
  document.addEventListener('keydown', onKey, true);
  scheduleFrame();
}
