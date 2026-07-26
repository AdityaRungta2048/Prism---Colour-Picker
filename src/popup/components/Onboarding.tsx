interface Props {
  onDismiss: () => void;
}

export function Onboarding({ onDismiss }: Props) {
  return (
    <div class="onboarding-banner">
      <div class="onboarding-header">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="url(#olg2)" />
          <circle cx="10" cy="10" r="4" fill="white" opacity="0.9" />
          <defs>
            <linearGradient id="olg2" x1="0" y1="0" x2="20" y2="20">
              <stop offset="0%" stop-color="#a78bfa" />
              <stop offset="100%" stop-color="#7c6ef4" />
            </linearGradient>
          </defs>
        </svg>
        <span class="onboarding-title">Welcome to Prism</span>
        <button class="onboarding-close" onClick={onDismiss} title="Dismiss">×</button>
      </div>

      <div class="onboarding-grid">
        <div class="ob-tip">
          <span class="ob-key">Alt+Shift+C</span>
          <span>launches eyedropper without opening popup</span>
        </div>
        <div class="ob-tip">
          <span class="ob-key">Esc to cancel</span>
          <span>press Escape while eyedropper is active</span>
        </div>
        <div class="ob-tip">
          <span class="ob-key">Palette tab</span>
          <span>record a session → export CSS / SCSS / JSON / PNG</span>
        </div>
        <div class="ob-tip">
          <span class="ob-key">Contrast tab</span>
          <span>instant WCAG AA/AAA badges</span>
        </div>
      </div>

      <div class="onboarding-footer">
        <span>Reload open tabs once so the eyedropper works on them.</span>
        <button class="onboarding-dismiss" onClick={onDismiss}>Got it →</button>
      </div>
    </div>
  );
}
