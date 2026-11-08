<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# このリポジトリでの追加ルール

## 新しいカテゴリ・サブカテゴリを足すとき

- `src/lib/algorithm-categories.ts` の `CATEGORY_TAXONOMY` に追記する。これが唯一の情報源で、カタログのチップ・表示順・READMEの集計はここから導出される。コンポーネント側にカテゴリ名の配列を重複して持たない。
- 記事(`content/algorithms/<id>.md`)の frontmatter は `name` / `category` / `subcategory` / `complexity` / `summary` の5項目のみ。`category`/`subcategory` は `CATEGORY_TAXONOMY` の文字列と一字一句一致させる。`summary` の先頭を `[` にしない(YAMLが配列と解釈してビルドが壊れる)。`hasVisualizer` はfrontmatterに書かない。
- 本文は `## 概要` / `## 仕組み` / `## 特性・トレードオフ` / `## 実装例` の4見出し。「なぜ生まれたか」を概要に書く(図鑑の方針)。
  - 見出しに補足を付けてよい(`## 実装例(Lomuto分割方式)` など。前方一致で扱う)。詳細ページでは「特性・トレードオフ」は開、「実装例」は閉のアコーディオンになる。
  - 任意の追加節として `## 使うときの注意` / `## よくある誤解` を、実装例の前に置ける(定型項目。全記事に共通する内容は詳細ページ側が自動で出すので書かない)。
- 追加したら `npm run verify:categories` を通し、`npm run stats:categories` の出力でREADMEのカテゴリ表を更新する。

## 可視化を足すとき

- 各 `src/lib/*-visualizers.ts` のレジストリ(`*_VISUALIZERS`)にキーを登録するだけで、`hasVisualizer` と詳細ページが自動的に対応する。描画コンポーネントはidからデータを引く汎用実装なので、通常は編集しない。
- 新しい可視化kind(レジストリ)を作る場合は、`src/lib/has-visualizer.ts`・`src/workers/algorithm-worker.ts`(`WorkerRequest`)・`src/components/visualizer/AlgorithmVisualizer.tsx`・`scripts/category-stats.mjs` の4か所に必ず追記する。再生コントロールには、フレームから「ステップごとの状態種別」を求めるアダプタを `step-timeline.ts` に足して `stepKinds` を渡す。
- 「配列の棒グラフ+状態色」で足りる可視化は、新しいkindを作らず `src/lib/*-visualizers.ts` に `SearchFrame` を返す関数を書き、`src/lib/bar-visualizers.ts` の `BAR_GROUPS` に登録する(hasVisualizer・Worker・描画・集計は自動対応。凡例は `SearchVisualizer.tsx` の `BAR_GROUP_LEGENDS` にグループ分を足す)。既存レジストリとidが重複すると片方が呼ばれないので、verifyが重複を検出する。
- 時刻を1つずつ進める時系列(制御・オプティマイザの値・補間など)は、信号kind(`SIGNAL_VISUALIZERS`)のパネル列として書く。`src/lib/series-frames.ts` の `seriesFrames` が時刻ごとのフレームを作る(`control-series.ts` が例)。
- 3次元で見せる意味がある題材(曲面の上を動く点・球面・流れ・視錐台・点群)は、`src/lib/scene3d-*.ts` に `Scene3DFrame` を返す関数とメタ情報(カメラ・軸の意味)を書き、`scene3d-visualizers.ts` に登録する(描画は three.js の `Scene3DVisualizer`。three.js は他のページには読み込まれない)。
- 左ペインの `position: sticky` を壊さないため、`html`/`body` や祖先要素に `overflow: hidden/auto` を付けない(横のはみ出しは `overflow-x: clip`)。
- ステップ生成は実際のアルゴリズムの計算をシミュレートする(見た目だけのアニメーションにしない)。乱数は固定シードにする。`npm run verify` に、独立に計算した正解との照合(または最低限の構造チェック)を足す。
- 状態色(idle/comparing/swapping/pivot/settled)は機能的な意味を持つので変えない。発光は `shouldGlow()` が許す色(確定・比較中)だけ。色だけで区別せず、形・ラベルも併用する(`docs/design/ui-design.md` 2.7節の決めごと表)。

## 変更後の確認

`npx tsc --noEmit && npm run lint && npm run verify && npm run verify:categories && npm run build` を通す(CIと同じ)。

