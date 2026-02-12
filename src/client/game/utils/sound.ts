/**
 * GameMaker-style juice: Web Audio feedback for arcade reward timing.
 * All sounds are procedural (oscillator + gain), no files. Optional-safe.
 */

const MAX_VOLUME = 0.25;
const DURATION_MS = 280;

let ctx: AudioContext | null = null;
let resumed = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

/** Resume AudioContext on first user interaction (required by browsers). */
export function resumeAudioOnInteraction(): void {
  if (resumed) return;
  const c = getContext();
  if (!c) return;
  try {
    c.resume().then(() => { resumed = true; }).catch(() => {});
  } catch {
    // ignore
  }
}

if (typeof document !== "undefined") {
  const once = (): void => {
    resumeAudioOnInteraction();
    document.removeEventListener("click", once);
    document.removeEventListener("touchstart", once);
  };
  document.addEventListener("click", once, { passive: true });
  document.addEventListener("touchstart", once, { passive: true });
}

/** Safe gain for mobile; clamp to avoid harsh levels. */
function clampGain(gain: number): number {
  return Math.max(0, Math.min(MAX_VOLUME, gain));
}

/**
 * Correct answer: soft chime / bell — player reward timing.
 * Short (<300ms), pleasant.
 */
export function playCorrectSound(): void {
  try {
    const c = getContext();
    if (!c) return;
    resumeAudioOnInteraction();

    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.06);
    osc.frequency.setValueAtTime(783.99, now + 0.12);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(clampGain(0.2), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + DURATION_MS / 1000);

    osc.start(now);
    osc.stop(now + DURATION_MS / 1000);
  } catch {
    // Optional-safe: game still works if audio fails
  }
}

/**
 * Wrong answer: muted thud — not harsh, arcade feedback loop.
 */
export function playWrongSound(): void {
  try {
    const c = getContext();
    if (!c) return;
    resumeAudioOnInteraction();

    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    gain.gain.setValueAtTime(clampGain(0.12), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    // Optional-safe
  }
}

/**
 * Puzzle completion: rising chord / sparkle — achievement moment.
 */
export function playCompletionSound(): void {
  try {
    const c = getContext();
    if (!c) return;
    resumeAudioOnInteraction();

    const now = c.currentTime;
    const freqs = [523.25, 659.25, 783.99];
    const gainNode = c.createGain();
    gainNode.connect(c.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(clampGain(0.18), now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    freqs.forEach((f, i) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 1.2, now + 0.35);
      osc.connect(gainNode);
      osc.start(now + i * 0.04);
      osc.stop(now + 0.5);
    });
  } catch {
    // Optional-safe
  }
}
