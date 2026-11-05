import type { SearchFrame } from "./search-visualizers.ts";
import { GREEDY_VISUALIZERS } from "./greedy-visualizers.ts";
import { RANKING_VISUALIZERS } from "./ranking-visualizers.ts";
import { GAME_VISUALIZERS } from "./game-visualizers.ts";

/**
 * 「配列の棒グラフ+状態色」で描く可視化のうち、探索系(SEARCH_VISUALIZERS)以外のグループをまとめたレジストリ。
 * 描画は SearchVisualizer を共用し、フレーム生成は search kind と同じWorker経路を通る。
 * 新しいグループ(別のジャンルの棒グラフ可視化)を足すときは、ここに登録するだけで
 * hasVisualizer・Worker・ディスパッチャ・集計スクリプトが自動で対応する。
 * ※ 相対importに拡張子(.ts)を付けているのは、Node の型除去実行(scripts/*.mjs)からも直接読めるようにするため。
 */
export const BAR_GROUPS = {
  greedy: GREEDY_VISUALIZERS,
  ranking: RANKING_VISUALIZERS,
  game: GAME_VISUALIZERS,
} as const;

export type BarGroup = keyof typeof BAR_GROUPS;

export const BAR_VISUALIZERS: Record<string, () => SearchFrame[]> = {
  ...GREEDY_VISUALIZERS,
  ...RANKING_VISUALIZERS,
  ...GAME_VISUALIZERS,
};

/** このidが属する棒グラフ可視化のグループ(凡例の出し分けに使う)。無ければ null。 */
export function barGroupOf(algorithmId: string): BarGroup | null {
  for (const [group, registry] of Object.entries(BAR_GROUPS)) {
    if (algorithmId in registry) return group as BarGroup;
  }
  return null;
}
