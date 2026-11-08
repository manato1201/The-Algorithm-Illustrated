import type { SearchFrame } from "./search-visualizers.ts";
import { RANKING_VISUALIZERS } from "./ranking-visualizers.ts";
import { PROCEDURAL_VISUALIZERS } from "./procedural-visualizers.ts";
import { CONTEST_VISUALIZERS } from "./contest-visualizers.ts";

/**
 * 「配列の棒グラフ+状態色」で描く可視化のうち、探索系(SEARCH_VISUALIZERS)・DPテーブル型(DP_VISUALIZERS)以外のグループ。
 * 描画は SearchVisualizer を共用し、フレーム生成は search kind と同じWorker経路を通る。
 * 棒グラフで足りるジャンルの可視化を足すときは、ここに登録するだけで
 * hasVisualizer・Worker・ディスパッチャ・集計スクリプトが自動で対応する。
 * ※ 相対importに拡張子(.ts)を付けているのは、Node の型除去実行(scripts/*.mjs)からも直接読めるようにするため。
 */
export const BAR_GROUPS = {
  ranking: RANKING_VISUALIZERS,
  procedural: PROCEDURAL_VISUALIZERS,
  contest: CONTEST_VISUALIZERS,
} as const;

export type BarGroup = keyof typeof BAR_GROUPS;

export const BAR_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  ...RANKING_VISUALIZERS,
  ...PROCEDURAL_VISUALIZERS,
  ...CONTEST_VISUALIZERS,
};

/** このidが属する棒グラフ可視化のグループ(凡例の出し分けに使う)。無ければ null。 */
export function barGroupOf(algorithmId: string): BarGroup | null {
  for (const [group, registry] of Object.entries(BAR_GROUPS)) {
    if (algorithmId in registry) return group as BarGroup;
  }
  return null;
}
