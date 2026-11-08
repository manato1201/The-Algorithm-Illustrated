import { isInputAdjustable, type VisualKind } from "./visual-kind.ts";

/**
 * 値の出どころの札(IMPROVEMENT_DESIGN_2026-10 第6弾・P9「誠実な注記」)。
 * 画面に出ている値・図が「どうやって得られたか」を、次の4語の共通の語彙で明示する。
 *   読んだ: 人が書いた解説の文章から取ったもの(ここで計算した値ではない)
 *   再生  : この図鑑のコードが、固定の入力・固定シードで計算した手順を、そのまま再生している
 *   模擬  : 実物を簡略化したモデル。考え方は示すが、実物の挙動や実測値ではない
 *   実行  : 閲覧者が入力を変えると、その場で計算し直している
 * 「測定」は扱わない(この図鑑に実測値は無い)。上流の実装の結果を再現した、とも主張しない。
 */
export type Provenance = "read" | "replay" | "simulated" | "executed";

export const PROVENANCE_ORDER: readonly Provenance[] = ["read", "replay", "simulated", "executed"];

/** 色に頼らず、記号と語でも区別する(状態色の記号 ○●▲◆■ とは重ならない記号を使う)。 */
export const PROVENANCE_LABELS: Record<Provenance, { glyph: string; ja: string; meaning: string }> = {
  read: { glyph: "§", ja: "読んだ", meaning: "人が書いた解説の文章から取ったもの。ここで計算した値ではない" },
  replay: { glyph: "▷", ja: "再生", meaning: "この図鑑のコードが、固定の入力・固定シードで計算した手順をそのまま再生している" },
  simulated: { glyph: "≈", ja: "模擬", meaning: "実物を簡略化したモデル。考え方は示すが、実物の挙動や実測値ではない" },
  executed: { glyph: "↻", ja: "実行", meaning: "入力を変えると、ブラウザの中でその場で計算し直している" },
};

/** 簡略化したモデルであるものと、その理由(実装の注釈から書き起こした)。 */
export const SIMULATED_NOTES: Record<string, string> = {
  "matrix-multiplication-three-ways": "電力の目安はメモリ読み出し量にもとづく定性的なもので、実測値ではない。専用回路(NPUなど)は考え方を示す簡略モデル",
  "intro-sort": "本物のイントロソートを簡略化した版",
  "tim-sort": "本物のTimSortを簡略化した版(小さなランを挿入ソートし、マージする流れを示す)",
  karatsuba: "4桁×4桁を、分割を1段だけ行う簡略デモ",
  "union-find": "経路圧縮は行わず、union by rank だけを示す簡略デモ",
  raft: "リーダー選出だけを簡略化して示す(ログの複製などは含まない)",
  "navmesh-generation": "2次元の簡略版",
  "watershed-algorithm": "実際の画像の輝度地形ではなく、簡略化した例で示している",
  "multiple-sequence-alignment": "段階的アラインメントの簡略版",
  "pid-control": "制御対象は簡単な1次遅れのモデル。実機の応答ではない",
  "bang-bang-control": "部屋の温度は簡単な熱モデル。実際の部屋の応答ではない",
  "complementary-filter": "センサの雑音とジャイロの偏りは、固定シードの擬似乱数で作った模擬データ(実機のセンサ値ではない)",
  "kalman-filter": "測定値は、固定シードの擬似乱数で作った模擬データ(実機のセンサ値ではない)",
  "curl-noise": "ポテンシャルにノイズ関数ではなく周期関数を使った簡略版(発散が0という性質は同じ)",
  "skeletal-animation-slerp-blending": "1本の関節の向きを、球面上の点で表した簡略図",
  "momentum-sgd": "損失は2次関数の谷という最も単純な例(実際のニューラルネットの損失ではない)",
  rmsprop: "損失は2次関数の谷という最も単純な例(実際のニューラルネットの損失ではない)",
  "adagrad-optimizer": "損失は2次関数の谷という最も単純な例(実際のニューラルネットの損失ではない)",
  "adam-optimizer": "損失は2次関数の谷という最も単純な例(実際のニューラルネットの損失ではない)",
};

export type ProvenanceInfo = {
  /** 当てはまる札(先頭が主。「読んだ」は図ではなく解説の札なので、ここには含めない)。 */
  kinds: Provenance[];
  /** 札ごとの補足(kinds と同じ並び)。 */
  notes: string[];
};

const REPLAY_NOTE = "この図鑑のコードが、固定の入力・固定シードで計算した手順を再生している(入力は変えられない)";
const EXECUTED_NOTE = "入力(配列の並び・要素数・行列サイズなど)を変えると、ブラウザ内のWeb Workerがその場で計算し直す";

/** 図(可視化)の値の出どころ。 */
export function visualizationProvenance(algorithmId: string, kind: VisualKind): ProvenanceInfo {
  const kinds: Provenance[] = [];
  const notes: string[] = [];
  if (isInputAdjustable(kind)) {
    kinds.push("executed");
    notes.push(EXECUTED_NOTE);
  }
  const simulated = SIMULATED_NOTES[algorithmId];
  if (simulated) {
    kinds.push("simulated");
    notes.push(simulated);
  }
  if (kinds.length === 0) {
    kinds.push("replay");
    notes.push(REPLAY_NOTE);
  }
  return { kinds, notes };
}
