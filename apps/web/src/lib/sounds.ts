/**
 * Sound effects for tactile feedback.
 * Uses the Web Audio API to generate short tonal sounds,
 * avoiding the need to ship audio files.
 */

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  return new AC();
}

function playTone(frequency: number, duration: number, gain: number, type: OscillatorType = "sine") {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const vol = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  vol.gain.value = gain;
  vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);

  // Cleanup
  osc.onended = () => {
    osc.disconnect();
    vol.disconnect();
    void ctx.close();
  };
}

/** Bright ascending tone — played on task creation */
export function playCreate() {
  playTone(880, 0.12, 0.15, "sine");
  setTimeout(() => playTone(1100, 0.1, 0.12, "sine"), 60);
}

/** Satisfying completion ping */
export function playComplete() {
  playTone(660, 0.08, 0.12, "sine");
  setTimeout(() => playTone(990, 0.15, 0.1, "sine"), 50);
}

/** Reverse completion — soft descending tone */
export function playUncomplete() {
  playTone(990, 0.08, 0.1, "sine");
  setTimeout(() => playTone(660, 0.12, 0.08, "sine"), 50);
}

/** Soft delete/dismiss sound */
export function playDelete() {
  playTone(440, 0.1, 0.08, "triangle");
}
