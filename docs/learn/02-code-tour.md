# 2. コードの読み方

## どこから読むか(おすすめの順)

| 順 | ファイル | 見るところ |
|---|---|---|
| 1 | `AGENTS.md` | 足すときの規則(記事・カテゴリ・可視化) |
| 2 | `src/lib/algorithm-categories.ts` | 分類表(唯一の情報源) |
| 3 | `content/algorithms/bubble-sort.md` | 記事の書き方(4 見出し) |
| 4 | `src/lib/sort-visualizers.ts`(先頭の 100 行) | フレームの形・バブル / クイック |
| 5 | `src/lib/design-tokens.ts` | 状態色・`shouldGlow` |
| 6 | `src/lib/has-visualizer.ts` → `src/workers/algorithm-worker.ts` | 登録表と Worker |
| 7 | `src/components/visualizer/AlgorithmVisualizer.tsx` | 種類ごとの振り分け |
| 8 | `src/components/visualizer/step-timeline.ts`・`PlaybackControls.tsx` | フレーム → ステップごとの状態種別・再生 |
| 9 | `scripts/verify-visualizations.mjs` | **何が、どう検証されているか**(先頭のコメント) |
| 10 | `src/lib/bar-visualizers.ts`・`series-frames.ts`・`scene3d-*.ts` | 共通部品・時系列・3D |

## 詳細ページで 1 回の再生が動くまで

1. 記事のメタ(`getAllAlgorithmsMeta`)が、`hasVisualizer(id)` で「可視化あり」を持つ。
2. 詳細ページが、`AlgorithmVisualizer` に id を渡す。
3. id に対応する**種類**(`SORT_VISUALIZERS` など)を引き、**Web Worker** にステップ列の生成を頼む(単一の Worker を使い回す)。
4. 返ってきた**フレーム列**を、再生コントロール(`useStepPlayer`)が 1 コマずつ進める。巻き戻し・速度・タイムライン(状態色)は、フレームから導く。
5. 擬似コードの現在行は、フレームの**状態種別**から引く(`activePseudoLines`)。

## 流儀(このコードの約束)

- **ステップ生成は、実際のアルゴリズムの計算をシミュレートする**(見た目だけのアニメーションにしない)。
- **乱数は固定シード**(`AGENTS.md`)。
- **状態色は機能的な意味を持つ**ので変えない。発光は `shouldGlow()` が許す色(確定・比較中)だけ。**色だけで区別せず、形・ラベルも併用する**。
- **登録するだけで対応する**作り(新しい記事・可視化は、表に足す)。新しい**種類**を作るときは、足す 4 か所(学習資料 3)。
- **記事の frontmatter に `hasVisualizer` を書かない**。`summary` の先頭を `[` にしない(YAML が配列と解釈してビルドが壊れる)。
- **検証を積み上げる**(書いて確認して消さない)。
