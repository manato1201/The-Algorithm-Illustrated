import type { StateColorKey } from "@/lib/design-tokens";

/**
 * 操作の列を譜面のように見せる表示(IMPROVEMENT_DESIGN_2026-10 Z25)の、音の高さ。
 * 状態の種類ごとに音(Hz)と段(譜面の縦位置)を決める。待機(idle)は鳴らさない。
 * 音は既定でオフで、利用者が「音」を押したときだけ鳴らす(音量も小さく、短い)。
 */
export const STEP_TONE: Record<StateColorKey, { hz: number | null; rank: number }> = {
  idle: { hz: null, rank: 0 },
  pivot: { hz: 392, rank: 1 },
  comparing: { hz: 523.25, rank: 2 },
  settled: { hz: 659.25, rank: 3 },
  swapping: { hz: 783.99, rank: 4 },
};

export const STEP_TONE_MAX_RANK = 4;

let audioContext: AudioContext | null = null;

/** 状態に対応する短い音を1つ鳴らす。対応していない環境・待機状態では何もしない。 */
export function playStepTone(kind: StateColorKey): void {
  const hz = STEP_TONE[kind].hz;
  if (hz === null || typeof window === "undefined" || !("AudioContext" in window)) return;
  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    if (ctx.state === "suspended") void ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.12);
  } catch {
    // 音が出せない環境では黙って何もしない(表示だけで成立する機能)
  }
}
