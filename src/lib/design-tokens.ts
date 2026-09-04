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

/**
 * 背景色(hex)の上に置く文字色を、WCAG相対輝度から機械的に選ぶ。
 * 「idleだけ暗いから特別扱いする」という決め打ちだと、状態色が増えたときに
 * 同じ視認性バグ(黒文字が暗い背景に同化)を再発させかねないため、
 * 任意の背景色に対して安全な文字色を計算で保証する。
 * しきい値0.179は、黒文字との contrast と 白文字との contrast が釣り合う相対輝度(WCAG公式から導出)。
 */
export function readableTextColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminance > 0.179 ? "#06070a" : coreColors.text;
}
