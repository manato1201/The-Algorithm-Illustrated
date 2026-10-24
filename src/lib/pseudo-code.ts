import type { StateColorKey } from "@/lib/design-tokens";

/**
 * 擬似コードの現在行(IMPROVEMENT_DESIGN_2026-10 X11④「内部が見える窓」)。
 * 各行は「どの状態種別のステップで光らせるか」を持ち、再生中のステップの状態種別(step-timeline.ts)から
 * 現在行を引く。状態種別はフレームから導いたものなので、巻き戻しても現在行が食い違わない。
 * 擬似コードはこの図鑑のために書き起こした言語非依存の記述で、実装例の節のコードとは独立している。
 */
export type PseudoLine = {
  text: string;
  indent: number;
  /** この行が実行中として光る状態種別。空なら説明用の行(光らない)。 */
  kinds: readonly StateColorKey[];
};

export const PSEUDO_CODE: Record<string, readonly PseudoLine[]> = {
  "bubble-sort": [
    { indent: 0, text: "未整列の範囲が残っている間、繰り返す", kinds: ["idle"] },
    { indent: 1, text: "隣り合う a[j] と a[j+1] を比べる", kinds: ["comparing"] },
    { indent: 2, text: "a[j] > a[j+1] なら入れ替える", kinds: ["swapping"] },
    { indent: 1, text: "範囲の末尾の1つが確定する", kinds: ["settled"] },
  ],
  "insertion-sort": [
    { indent: 0, text: "2番目から末尾まで、i を進めながら繰り返す", kinds: ["idle"] },
    { indent: 1, text: "key = a[i] を取り出す", kinds: ["pivot"] },
    { indent: 1, text: "左隣の要素を key と比べる", kinds: ["comparing"] },
    { indent: 2, text: "key より大きければ右へずらす(入れ替え)", kinds: ["swapping"] },
    { indent: 1, text: "先頭から i 個が整列済みになる", kinds: ["settled"] },
  ],
  "selection-sort": [
    { indent: 0, text: "未整列の範囲が残っている間、繰り返す", kinds: ["idle"] },
    { indent: 1, text: "最小値の候補を決める(より小さい要素があれば更新)", kinds: ["pivot"] },
    { indent: 1, text: "残りの要素を順に候補と比べる", kinds: ["comparing"] },
    { indent: 1, text: "範囲の先頭と最小値を入れ替える", kinds: ["swapping"] },
    { indent: 1, text: "範囲の先頭の1つが確定する", kinds: ["settled"] },
  ],
  "linear-search": [
    { indent: 0, text: "先頭から順に、末尾まで調べる", kinds: ["idle"] },
    { indent: 1, text: "a[i] が目標と等しいか比べる", kinds: ["comparing"] },
    { indent: 1, text: "等しければ i を返して終わる", kinds: ["settled"] },
  ],
  "binary-search": [
    { indent: 0, text: "探索範囲を [lo, hi] とする(整列済みが前提)", kinds: ["idle"] },
    { indent: 1, text: "中央 mid = (lo + hi) / 2 の値を目標と比べる", kinds: ["comparing", "pivot"] },
    { indent: 2, text: "目標が大きければ右半分、小さければ左半分に絞る", kinds: [] },
    { indent: 1, text: "等しければ mid を返して終わる", kinds: ["settled"] },
  ],
};

export function hasPseudoCode(algorithmId: string): boolean {
  return algorithmId in PSEUDO_CODE;
}

/** 状態種別に対応する行番号(0始まり)。該当する行が無ければ空。 */
export function activePseudoLines(algorithmId: string, kind: StateColorKey): number[] {
  const lines = PSEUDO_CODE[algorithmId] ?? [];
  const result: number[] = [];
  lines.forEach((line, index) => {
    if (line.kinds.includes(kind)) result.push(index);
  });
  return result;
}
