/**
 * デザイントークン(TS版)。docs/design/ui-design.md 2節と同期させる。
 * CSS変数を直接読めない文脈(Canvas 2D描画・D3のカラースケール・Web WorkerへのpostMessage等)で使用する。
 * app/globals.css の :root と値は必ず一致させること(6節: 当面は手動同期)。
 */

export const coreColors = {
  bgVoid: "#06070A",
  bgSurface: "#12141B",
  bgSurface2: "#191C26",
  text: "#EDF0F5",
  textMuted: "#8B93A7",
  accentGreen: "#4DFFB0",
  accentAmber: "#FFA733",
} as const;

/** アルゴリズム状態パレット(可視化専用) */
export const stateColors = {
  idle: "#3A3F4D",
  comparing: "#FFD23F",
  swapping: "#FF5470",
  pivot: "#7DD3FF",
  settled: coreColors.accentGreen,
} as const;

export const lineColors = {
  amber: "rgba(255,167,51,0.14)",
  amberGlow: "rgba(255,167,51,0.35)",
  greenGlow: "rgba(77,255,176,0.35)",
} as const;

export type StateColorKey = keyof typeof stateColors;
