/**
 * Zero-dependency Web Audio API Hospitality Bell / Chime Synthesizer.
 * Generates warm, unmistakable fine-dining service bell chimes natively in the browser.
 * Safe across all desktop and mobile browsers (Chrome, Safari, Firefox, Edge).
 */

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!globalAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a resonant, dual-tone brass hospitality service bell.
 * Tone: G5 (784 Hz) + D6 (1174.66 Hz) harmonic with natural acoustic decay.
 */
export function playHospitalityChime(type: "order" | "enquiry" | "urgent" = "order"): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === "urgent") {
      // Rapid two-strike chime for urgent calls
      playBellStrike(ctx, now, 880, 0.35, 0.45); // A5
      playBellStrike(ctx, now + 0.18, 1046.5, 0.4, 0.7); // C6
    } else if (type === "enquiry") {
      // Soft ascending dual chime for guest enquiries
      playBellStrike(ctx, now, 659.25, 0.25, 0.5); // E5
      playBellStrike(ctx, now + 0.15, 880, 0.3, 0.8); // A5
    } else {
      // Classic fine-dining brass counter bell: G5 + D6 harmonic
      playBellStrike(ctx, now, 783.99, 0.35, 1.1); // G5 root
      playBellStrike(ctx, now, 1174.66, 0.2, 0.8); // D6 fifth harmonic
      playBellStrike(ctx, now, 1567.98, 0.08, 0.4); // G6 shimmer
    }
  } catch {
    // Graceful handling of browser autoplay restrictions
  }
}

function playBellStrike(
  ctx: AudioContext,
  startTime: number,
  frequency: number,
  peakGain: number,
  decaySeconds: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startTime);

  // Instant bell strike attack, followed by smooth exponential decay
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decaySeconds);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + decaySeconds + 0.05);
}

/**
 * Triggers a test chime and ensures the browser AudioContext is unlocked.
 */
export function testHospitalityChime(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().then(() => {
      playHospitalityChime("order");
    });
  } else {
    playHospitalityChime("order");
  }
}
