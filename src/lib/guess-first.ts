import type { StateColorKey } from "./design-tokens";

/**
 * 先に予想させる(Guess first)(IMPROVEMENT_DESIGN_2026-10 第6弾)。
 * 「進む」を押したとき、次の1手の種類(比較・入れ替え・基準・確定)を先に選ばせてから進める。
 * ただし問いすぎない(LearnHarness の感想は「教わるというより試されている感じ」): 既定はオフ、採点しない、
 * 手動の「進む」だけが対象(再生中は問わない)、種類が変わる場面だけ、前の問いから一定ステップは空ける、いつでもスキップできる。
 */

/** 次の問いまでに空けるステップ数。 */
export const GUESS_COOLDOWN = 3;

/** 予想の選択肢に並べる順(状態の語彙の並びと同じ)。待機は選択肢にしない。 */
export const GUESS_KIND_ORDER: readonly Exclude<StateColorKey, "idle">[] = [
  "comparing",
  "swapping",
  "pivot",
  "settled",
];

/** この再生に現れる種類だけを、選択肢にする。 */
export function guessChoices(
  kinds: readonly StateColorKey[],
): Exclude<StateColorKey, "idle">[] {
  return GUESS_KIND_ORDER.filter((kind) => kinds.includes(kind));
}

/**
 * index のステップから「進む」を押したとき、予想を問うか。
 * 次のステップが待機でなく、いまの種類と違い(=変わり目)、前の問い(lastAsked)から GUESS_COOLDOWN ステップ以上空いていて、
 * 選択肢が2つ以上あるときだけ問う。
 */
export function shouldAskGuess(
  kinds: readonly StateColorKey[],
  index: number,
  lastAsked: number | null,
): boolean {
  const current = kinds[index];
  const next = kinds[index + 1];
  if (current === undefined || next === undefined) return false;
  if (next === "idle" || next === current) return false;
  if (lastAsked !== null && index - lastAsked < GUESS_COOLDOWN) return false;
  return guessChoices(kinds).length >= 2;
}
