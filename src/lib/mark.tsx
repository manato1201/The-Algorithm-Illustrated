// サイトのマーク(ソートの棒 4 本 + 強調の 1 本(琥珀))。icon.svg と同じ図形を、ImageResponse(apple-icon・PWA・OGP)でも使う。
// 図形を変えるときは icon.svg も同じにする(DESIGN.md「アイコン」)。

export const MARK_COLORS = { tile: "#06070a", ink: "#edf0f5", accent: "#ffa733" } as const;

/**
 * 32x32 の格子で描いたマーク。`rx` はタイルの角丸。
 * `inset` は、全面を塗るアイコン(iOS・maskable)で、マークを内側へ縮める割合(0〜0.3)。
 */
export function MarkSvg({
  size,
  rx = 7,
  inset = 0,
  colors = MARK_COLORS,
}: {
  size: number;
  rx?: number;
  inset?: number;
  colors?: { tile: string; ink: string; accent: string };
}) {
  const s = 1 - inset * 2;
  const t = 16 * (1 - s);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx={rx} fill={colors.tile} />
      <g transform={`translate(${t} ${t}) scale(${s})`}>
        <rect x="6.5" y="16" width="3.6" height="10" rx="1.2" fill={colors.ink} />
        <rect x="12.1" y="9" width="3.6" height="17" rx="1.2" fill={colors.ink} />
        <rect x="17.7" y="5" width="3.6" height="21" rx="1.2" fill={colors.accent} />
        <rect x="23.3" y="13" width="3.6" height="13" rx="1.2" fill={colors.ink} />
      </g>
    </svg>
  );
}
