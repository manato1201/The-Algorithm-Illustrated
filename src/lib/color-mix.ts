/**
 * 2色(#RRGGBB)の線形補間。ステップ間の状態色の移り変わりを滑らかに描くためのCanvas用ユーティリティ。
 * #RRGGBB以外(rgba()など)は補間できないので、tが半分を超えたら移行先の色に切り替える。
 */
function parseHex(color: string): [number, number, number] | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function mixColor(from: string, to: string, t: number): string {
  if (t <= 0 || from === to) return from;
  if (t >= 1) return to;
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return t < 0.5 ? from : to;
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** 動きの終わりを滑らかにする(速く動き出して、ゆっくり止まる)。 */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}
