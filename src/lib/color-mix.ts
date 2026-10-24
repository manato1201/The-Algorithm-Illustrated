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

/**
 * 溜め(Anticipation)と余韻(Follow-through)つきのイージング。動き出す前にわずかに逆へ引き、
 * 目標を少し行き過ぎてから戻る。振れ幅は数%に抑えてあり、棒の入れ替えなど「物が動く」場面にだけ使う。
 * 色の補間には使わない(0〜1の外に出るため)。端点は必ず0と1に一致する。
 */
export function easeSpring(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const c1 = 0.7;
  const c2 = c1 * 1.525;
  return clamped < 0.5
    ? (Math.pow(2 * clamped, 2) * ((c2 + 1) * 2 * clamped - c2)) / 2
    : (Math.pow(2 * clamped - 2, 2) * ((c2 + 1) * (clamped * 2 - 2) + c2) + 2) / 2;
}
