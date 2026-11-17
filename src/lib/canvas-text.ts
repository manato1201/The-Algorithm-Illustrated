/**
 * canvas の文字を、枠に収まる大きさに測って描く小さな共通関数。
 * canvas の ctx.font には CSS 変数が使えないため、フォントは固定の等幅スタックを使う
 * (CSS 側の --font-mono と同じ並び)。
 */
export const CANVAS_FONT_FAMILY =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export function canvasFont(size: number): string {
  return `${size}px ${CANVAS_FONT_FAMILY}`;
}

export type FittedText = { text: string; size: number; width: number };

/**
 * `text` を `maxWidth` に収める。まず文字サイズを `minSize` まで縮め、それでも入らなければ末尾を「…」で省く。
 * 呼び出し後、ctx.font は決まったサイズに設定されている(描画し終えたら呼び出し側が戻す)。
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  minSize = 8,
): FittedText {
  ctx.font = canvasFont(size);
  let width = ctx.measureText(text).width;
  if (width <= maxWidth || maxWidth <= 0) return { text, size, width };

  const fitted = Math.max(minSize, Math.floor(size * (maxWidth / width)));
  if (fitted !== size) {
    size = fitted;
    ctx.font = canvasFont(size);
    width = ctx.measureText(text).width;
    if (width <= maxWidth) return { text, size, width };
  }

  // 最小サイズでも入らない: 末尾を省く
  let cut = Array.from(text);
  while (cut.length > 1) {
    cut = cut.slice(0, -1);
    const candidate = `${cut.join("")}…`;
    width = ctx.measureText(candidate).width;
    if (width <= maxWidth) return { text: candidate, size, width };
  }
  return {
    text: `${cut.join("")}…`,
    size,
    width: ctx.measureText(`${cut.join("")}…`).width,
  };
}

/**
 * `fitText` で収めた文字を (x, y) に描き、フォントを描く前のサイズへ戻す。
 * textAlign / textBaseline / fillStyle は呼び出し側の設定をそのまま使う。
 */
export function fillFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  minSize = 8,
): FittedText {
  const fitted = fitText(ctx, text, maxWidth, size, minSize);
  ctx.fillText(fitted.text, x, y);
  ctx.font = canvasFont(size);
  return fitted;
}
