/**
 * 文字のマスで表す別表示(IMPROVEMENT_DESIGN_2026-10 D1)用の、棒グラフの段データ。
 * 値を 0〜levels の段数に丸め、上の段から順に「その段まで棒が届いているか」を返す。
 * 描画(AsciiStage)から切り離した純粋関数にして、npm run verify で単体検証できるようにしている。
 */
export const ASCII_LEVELS = 8;

/** 各値の段数(0〜levels)。最大値の棒がちょうどlevels段になる。正の値は最低1段残す。 */
export function asciiBarLevels(
  values: readonly number[],
  levels = ASCII_LEVELS,
): number[] {
  const max = Math.max(0, ...values);
  if (max === 0) return values.map(() => 0);
  return values.map((value) =>
    value <= 0
      ? 0
      : Math.min(levels, Math.max(1, Math.round((value / max) * levels))),
  );
}

/** 上の段から順の行列。rows[r][c] は、c番目の棒が (levels - r) 段目に届いていれば true。 */
export function asciiBarRows(
  values: readonly number[],
  levels = ASCII_LEVELS,
): boolean[][] {
  const barLevels = asciiBarLevels(values, levels);
  return Array.from({ length: levels }, (_, r) =>
    barLevels.map((level) => level >= levels - r),
  );
}
