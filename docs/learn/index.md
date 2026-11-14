# The-Algorithm-Illustrated 学習資料(保守・拡張の実務編)

このフォルダは、**この図鑑を直す・足す人**のための資料です。基礎から順に学ぶ講義は [../lecture/index.md](../lecture/index.md)(第 0〜5 回・実行できる例つき)。技術解説書は [../technical-guide.md](../technical-guide.md)、UI の決めごとは [../design/ui-design.md](../design/ui-design.md)、リポジトリ固有の規則は [AGENTS.md](../../AGENTS.md)(新しいカテゴリ・可視化を足すときの手順)。

| # | 資料 | いつ読むか |
|---|---|---|
| 1 | [全体像](01-overview.md) | 部品・ページ・データ・コマンド |
| 2 | [コードの読み方](02-code-tour.md) | どのファイルから読むか |
| 3 | [内側のしくみ](03-internals.md) | 登録表・Worker・再生・擬似コード・3D・書き写している 4 か所 |
| 4 | [拡張のレシピ](04-extend.md) | 記事・カテゴリ・可視化・検証を**足したい** |
| 5 | [テストの書き方と実行](05-testing.md) | `verify` を回す・足す・文書の検査・**確かめていないこと** |
| 6 | [トラブルと保守](06-troubleshooting-maintenance.md) | 動かない・**既知の問題**・定期の保守 |
| 7 | [基礎の補強](07-foundations.md) | TypeScript の型・Worker・**アルゴリズムの基礎(Big-O・整列・探索・再帰・DP・グラフ)**・設計思想・用語を補強したい |
| – | [用語集](glossary.md) | 分からない言葉が出た |

## 最初の 15 分

1. `npm install` のあと `npx tsc --noEmit && npm run lint && npm run verify && npm run verify:categories`(CI と同じ検証)。
2. `npm run dev` で、`/algorithms/bubble-sort` を開き、再生・巻き戻しを試す。
3. [構成図](../diagrams/architecture.svg)を見ながら、[全体像](01-overview.md)を読む。

## コードの地図

| 場所 | 役割 |
|---|---|
| `content/algorithms/` | 記事(Markdown。758 件)・`content/atlas/milestones.json`(年表) |
| `src/lib/*-visualizers.ts` | 可視化の種類ごとの**ステップ列を作る純粋関数**と登録表(`*_VISUALIZERS`) |
| `src/lib/has-visualizer.ts` | 「可視化があるか」の判定 |
| `src/lib/algorithm-categories.ts` | 分類表 `CATEGORY_TAXONOMY`(唯一の情報源) |
| `src/lib/pseudo-code.ts`・`design-tokens.ts` | 擬似コードの現在行・状態色 |
| `src/lib/bar-visualizers.ts`・`series-frames.ts` | 棒グラフ型・時系列型の共通部品 |
| `src/lib/scene3d*.ts` | 3D の可視化(three.js) |
| `src/workers/algorithm-worker.ts` | ステップ列を作る Web Worker |
| `src/components/visualizer/` | 描画・再生(`AlgorithmVisualizer`・`PlaybackControls`・`step-timeline.ts` ほか) |
| `src/app/` | ページ(`algorithms/[id]`・`compare`・`atlas`・`map`・`updates`・`basics`・`about`・`api/updates`) |
| `scripts/` | `verify-visualizations.mjs`・`verify-categories.mjs`・`category-stats.mjs` |
