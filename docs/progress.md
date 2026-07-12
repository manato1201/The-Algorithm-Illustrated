# 実装状況ノート

最終更新: 2026-07-12(可視化対応アルゴリズムの拡張(グラフ3種+DP2種)、更新情報(RSS)画面+Vercel Edge Functions BFF、比較画面、Aboutページ、Worker使い回し最適化、pixi.jsパーティクル演出を追加)

このドキュメントは、後日どのセッションからでも作業を再開できるように、実装済みの内容・意思決定の理由・既知の制約をまとめたものです。デザインの意思決定そのものは [docs/design/ui-design.md](design/ui-design.md) を参照してください。

## セットアップ済みの基盤

### Next.jsプロジェクト

- `create-next-app` でスキャフォールド(App Router / TypeScript / ESLint / Tailwindなし)
- 動作確認環境: Next.js 16.2.10 / React 19.2.4 / Node.js v22系 / npm 10系
- `package.json` の `name` は `the-algorithm-illustrated`(npmの命名規則上、リポジトリ名の大文字を使えないため)
- Tailwind導入は未決定のまま保留中(ui-design.md 6節)。現状はCSS Modules + CSSカスタムプロパティのみ

### デザイントークン

- [src/app/globals.css](../src/app/globals.css) の `:root` にCSSカスタムプロパティとして実装
- [src/lib/design-tokens.ts](../src/lib/design-tokens.ts) に同じ値をTS定数としてエクスポート(Canvas 2D描画・D3のカラースケール・Web WorkerへのpostMessageなど、CSS変数を直接読めない文脈での利用を想定。まだ実際には未使用)
- 値は ui-design.md 2節と同期させること。**両方を手動更新する運用**(6節の通り、プロジェクト規模的にトークン生成スクリプトは導入していない)

### フォント

`next/font/google` で以下を読み込み、`layout.tsx` でCSS変数として注入した上で、`globals.css` 側でプロジェクト固有のフォールバックを足した最終トークンにラップしている(循環参照を避けるため、next/font側の変数名には `-raw` サフィックスを付けている):

| 用途                          | フォント                                                                       | next/font変数名(raw)    | 最終トークン名      |
| ----------------------------- | ------------------------------------------------------------------------------ | ----------------------- | ------------------- |
| 見出し(和文)                  | Zen Kaku Gothic New(weight: 500/700/900、variableフォント非対応のため明示指定) | `--font-display-raw`    | `--font-display`    |
| 見出し補助(英数字・Big-O表記) | Space Grotesk(variable)                                                        | `--font-display-en-raw` | `--font-display-en` |
| 本文                          | Noto Sans JP(variable)                                                         | `--font-body-raw`       | `--font-body`       |
| コード・データ・状態値        | JetBrains Mono(variable)                                                       | `--font-mono-raw`       | `--font-mono`       |

> **メモ**: `next/font/google` の `subsets` オプションにNoto Sans JP・Zen Kaku Gothic Newとも `"japanese"` は存在しない(cyrillic/latin/latin-ext/vietnamese等のみ)。これは `<link rel="preload">` ヒントの対象を絞るためのオプションであり、フォント自体はGoogle Fonts側が生成する各Unicode Rangeの `@font-face` を全て含むため、`subsets: ["latin"]` のままでも和文の表示自体には影響しない。

### HUD共通コンポーネント(`src/components/hud/`)

全画面で共有する構造的な視覚語彙(ui-design.md 2.6節)。

| コンポーネント    | 役割・実装メモ                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`        | 全画面共通フレーム。ヘッダー(ブランド名+StatusChip+LiveClock)と`CornerBrackets`を提供し、`layout.tsx` で全ページをラップしている                                                                                                    |
| `CornerBrackets`  | 四隅のL字罫線装飾。4つの`<span>`を絶対配置する実装(CSSの多重background-gradientハックではなく、可読性・保守性を優先)                                                                                                                |
| `StatusChip`      | ステータスチップ。`online`(green・発光)/`active`(amber・発光)/`idle`(muted・発光なし)の3状態。**greenは「オンライン・完了・確定」の意味に限定使用**というui-design.md 2.1節の用途分離ルールをコード上のバリアントとしても守っている |
| `LiveClock`       | JST表示のライブ時計(1秒ごと更新)。SSRとCSR初回描画を一致させるため、`useState(null)`で初期化し`useEffect`後にのみ時刻を反映(hydration mismatch回避)                                                                                 |
| `LogFeed`         | タイムスタンプ+タグ+説明のログ表示。**実装済みだが、現状どの画面からも呼び出されていない**(将来、詳細画面の実行履歴・更新情報画面のフィードに転用する想定)                                                                          |
| `ComplexityBadge` | Big-O表記バッジ。等幅フォント+amber                                                                                                                                                                                                 |

### カタログ画面(`src/components/catalog/AlgorithmCatalog.tsx`)

- クライアントコンポーネント(`"use client"`)。検索クエリの有無で表示を切り替える:
  - **未検索時**: ヒーロー(タイポグラフィック導入+収録件数)+ 代表アルゴリズム1件のショーケースカード + カテゴリ別一覧(`CATEGORY_ORDER` の順で10カテゴリ)
  - **検索時**: 名前・カテゴリ・説明文を対象に部分一致フィルタした結果をフラットに一覧表示。0件時は破線パネル(ui-design.md 2.6節の「破線パネル=プレースホルダ領域」の語彙を転用)で「該当なし」を表示
- データソースは [content/algorithms/](../content/algorithms/)(後述の実データモデル、163件)経由の `getAllAlgorithmsMeta()`
- 検索は完全にクライアントサイドの `Array.prototype.filter`。データ量が今後大きく増える場合はサーバーサイド検索や仮想スクロールへの切り替えを検討する
- カタログの代表カード・一覧行は `/algorithms/[id]` へのリンクになっている

### アルゴリズム索引データ(`content/algorithms/*.md` + `src/lib/content/algorithms.ts`)

**旧`src/lib/sample-algorithms.ts`(インメモリ配列)は廃止し、リポジトリ内Markdownファイルを実データモデルとして採用した。**

- 各アルゴリズム1ファイル: `content/algorithms/<id>.md`。frontmatter(`name`/`category`/`complexity`/`summary`)+ Markdown本文(`## 概要` `## 仕組み` `## 特性・トレードオフ` 等の見出し構成)
- `src/lib/content/algorithms.ts` が読み込みを担当:
  - `getAllAlgorithmIds()`: ファイル名一覧(`generateStaticParams`用)
  - `getAllAlgorithmsMeta()`: frontmatterのみ読む軽量版(カタログ一覧用、Markdown本文のHTML変換はしない)
  - `getAlgorithmDetail(id)`: frontmatter + 本文を`marked`でHTML化したものを返す(詳細ページ用)
- 依存関係として `gray-matter`(frontmatter解析)と `marked`(Markdown→HTML変換)を追加
- **DB/CMSではなくリポジトリ内Markdownを選んだ理由**: 個人開発の学習用サイトにDB/CMSは過剰。`next build`時にfsで読み込むだけで完結し、Gitで差分管理・レビューでき、既存のSSG(`generateStaticParams`)ともそのまま噛み合うため
- 詳細ページでは `dangerouslySetInnerHTML` でMarkdown由来のHTMLを描画している。コンテンツは全てリポジトリ内で管理する信頼済みデータ(外部入力なし)なのでXSSリスクは実質的にない、という前提を明記しておく
- カテゴリの表示順(`CATEGORY_ORDER`)は `src/lib/algorithm-categories.ts` に切り出し、コンテンツローダーからは独立させた

**移行内容**: 68件→163件に拡充する際に新設したカテゴリ・項目(情報検索・ランキング/機械学習/デザインパターン23種/シミュレーション・群知能/分散システムなど)はそのまま引き継いだ。全163件をMarkdownへ変換する一時スクリプトを実行し(スクリプト自体は使い捨てのため削除済み)、可視化対応済みの9件(バブル/選択/挿入/マージ/ヒープ/クイックソート・BFS・DFS・0-1ナップサック問題)は「概要・仕組み・特性トレードオフ」の3段構成で手動で書き込みを充実させた。**続けて1カテゴリずつ完全充実化を進めており、現在14カテゴリ・計140件が充実済み**(機械学習を含む。各カテゴリの完了経緯は git log を参照。同じ3段構成で執筆している)。**残るはデザインパターン1カテゴリ・23件のみ**で、これは `summary` から生成した簡易な本文(概要のみ+特性トレードオフはTODOコメント)のままで、今後の拡充対象。

### アルゴリズム詳細ページ(`src/app/algorithms/[id]/page.tsx`)

- `generateStaticParams` で163件すべてを静的生成(SSG)。ID一覧は `getAllAlgorithmIds()` から取得
- レイアウトはスティッキーサイド(ui-design.md 4.1節の転用): 左固定=可視化キャンバス+コントロール、右スクロール=説明文(Markdown本文をレンダリング)
- `id in SORT_VISUALIZERS` → `SortVisualizer`、`id in PATHFINDING_VISUALIZERS` → `PathfindingVisualizer`、`id in DP_VISUALIZERS` → `DPTableVisualizer`、`id in GRAPH_VISUALIZERS` → `GraphVisualizer`、どれでもなければ破線パネルで「準備中」を表示、の順で判定する簡易ディスパッチ

### 再生コントロールの共通化(`src/components/visualizer/useStepPlayer.ts` + `PlaybackControls.tsx`)

- `stepIndex`/`isPlaying`の管理・再生タイマー・戻る/進む/リセットのハンドラを`useStepPlayer`フックに集約し、ボタン行のUIを`PlaybackControls`コンポーネントに切り出した
- `SortVisualizer`・`PathfindingVisualizer`・`DPTableVisualizer`の3つがこの2つを共用し、描画ロジックだけを個別に持つ構成
- effect内で同期的に`setState`を呼ぶとESLint(react-hooks/set-state-in-effect)にひっかかるため、`setTimeout`コールバック内でのみ呼ぶ設計にしている(既知の制約参照)

### Web Worker化(`src/workers/algorithm-worker.ts` + `src/components/visualizer/useWorkerFrames.ts`)

- ステップ(フレーム)列の生成をWeb Workerに委譲するようにした。`{ kind: "sort" | "pathfinding" | "dp" | "graph", algorithmId, input? }` をpostMessageすると、workerが対応する生成関数(`sort-visualizers.ts`/`pathfinding-visualizers.ts`/`dp-visualizers.ts`/`graph-visualizers.ts`)を実行し `{ request, frames }` を返す
- `new Worker(new URL("../../workers/algorithm-worker.ts", import.meta.url))` というTurbopack/Webpack互換の書き方を使用。Turbopackが実際に専用のworkerチャンクを生成することを `.next/static/chunks/turbopack-worker-*.js` の存在とその中身(`onmessage`・`bubbleSortSteps`等を含む)で確認済み
- **Worker使い回し最適化(2026-07-12)**: 以前は`request`が変わるたびに新規`Worker`を生成・破棄していたが、`useWorkerFrames`をコンポーネントのマウント中1つのWorkerだけを生成・使い回す設計に変更した。Worker生成用のeffect(依存配列`[]`)とpostMessage送信用のeffect(依存配列`[request]`)を分離している
  - postMessageは構造化クローンを経由するため、返ってきた`request`は元のオブジェクトと参照が一致しない。そのため結果の相関は参照比較(`===`)ではなく`sameRequest()`による値比較で行う(`WorkerResponse`に`request`をエコーバックさせている)
- `useWorkerFrames<T>(request)` フック: `request`はkindに応じた判別可能ユニオン型で、呼び出し側で`useMemo`により参照を安定させる。isComputingは`useState`で持たず、「結果に紐づくrequest」と「現在のrequest」を値比較して導出することで、effect内での同期的setStateを回避している
- **これは「Web Workers上でアルゴリズムを実行する」という当初の設計方針を反映したものだが、状態スナップショットのdiffベース記録・IndexedDBキャッシュはまだ実装していない**。現状のフレームは配列/グリッド/テーブルの全体スナップショットをステップごとに丸ごと保持する方式(小規模な入力=配列20要素・迷路160マス・DPテーブル最大7×8なのでメモリ上は問題にならないが、当初の設計ドキュメントが懸念していた「複雑なアルゴリズムでのメモリ逼迫」への対処そのものではない)

### ソート可視化(`src/components/visualizer/SortVisualizer.tsx` + `src/lib/sort-visualizers.ts`)

- **対応アルゴリズム: バブル・選択・挿入・マージ・ヒープ・クイックソートの6つ**
- `sort-visualizers.ts` が配列と操作からステップ(フレーム)列を事前に全て生成する(`{ array, highlight, description }[]`)。生成自体はWeb Worker内で実行される
- 描画はCanvas 2D。バーの色は `design-tokens.ts` の `stateColors`(idle/comparing/swapping/pivot/settled)をそのまま使用し、ui-design.md 2.2節のトークンをコードで初めて実利用した
- 操作: 再生/一時停止、1ステップ戻る/進む、シャッフル(配列を再生成)
- **パーティクル演出(2026-07-12追加)**: `ParticleBurstLayer`(pixi.js製、WebGLレンダリング)をCanvas 2Dの上に絶対配置で重ね、要素の交換(swapping)・確定(settled)への遷移時に発光パーティクルのバーストを再生する。詳細は後述の「three.js/pixi.js」節を参照

### 経路探索の可視化(`src/components/visualizer/PathfindingVisualizer.tsx` + `src/lib/pathfinding-visualizers.ts`)

- **対応アルゴリズム: 幅優先探索(BFS)・深さ優先探索(DFS)・ダイクストラ法・A*探索の4つ**
- 10行×16列の固定迷路(壁ブロックを内部に6個配置、外周は必ず開けることでstart→goalの経路を構造的に保証)上で4アルゴリズムを実行し、`{ cellStates, description }[]` のフレーム列を生成する
- セルの色分けはソート可視化と同じ`stateColors`を再利用: 次の候補=pivot(電光青)、探索済み=comparing(amber-yellow)、最短/最小コスト経路=settled(green)。スタート/ゴールのみ`coreColors.accentAmber`/`accentGreen`の専用色
- **地形コスト(重み)を導入**(`WEIGHT_MAP`)。row9の大部分を重み5の「地形コスト高」(`difficult`状態、`stateColors.swapping`のコーラル色)にし、既定は重み1。BFS/DFSはコストを無視してその上をそのまま突っ切るが、**ダイクストラ法・A*探索はコストの低いrow8を迂回する**——この違いが再生比較で視覚的にわかることを`node --experimental-strip-types`での直接実行で確認済み(BFS/DFSは重い地形を通過する25マスの経路、ダイクストラ法・A*探索は迂回する25マス・総コスト24の経路を選択)
- **A*探索はダイクストラ法とほぼ同じ実装で、優先度を「累積コストg」から「g+マンハッタン距離ヒューリスティックh」に変えただけ**(`aStarSteps`)。同じ総コスト24の最適経路を、ダイクストラ法(探索101マス)より少ない探索マス数(90マス)で発見することを直接実行で確認済み——ヒューリスティックがゴール方向を優先させる効果が定量的に示せている
- BFSは歩数最短を保証、DFSは行き止まりまで掘ってから戻る、ダイクストラ法は累積コスト最小を保証、A*探索はダイクストラ法と同じ最適性を保ちながら探索範囲を絞り込む——という4アルゴリズムの性質の違いが同じUIで比較できる
- 迷路・地形コストは固定のため、シャッフルに相当する操作はなく「最初から」ボタンでリセットのみ
- `node --experimental-strip-types` で直接実行し、BFS(234フレーム)・DFS(273フレーム)ともにゴールへの経路を発見することを確認済み

### DP(動的計画法)可視化(`src/components/visualizer/DPTableVisualizer.tsx` + `src/lib/dp-visualizers.ts`)

- **対応アルゴリズム: 0-1ナップサック問題・最長共通部分列(LCS)・編集距離の3つ**(2026-07-12にLCS・編集距離を追加)
- 他の可視化と異なり**Canvasではなく素のHTML `<table>` + CSSトランジション**で実装。`data-state`属性(idle/comparing/pivot/settled)に応じて`background-color`/`box-shadow`を`transition`で滑らかに切り替える。CSSアニメーションによる可視化改善というユーザー要望に、Canvasとは別の技術で応えた
- 状態色は`color-mix(in srgb, ...)`でトークンの色を背景に混ぜ込む形で表現(モダンCSS関数。主要ブラウザ2024年以降のバージョンで対応)
- dp[i][w]テーブルを埋めていく過程で、参照する前段のセル(comparing)・計算中のセル(pivot)・確定済みのセル(settled)を色分け
- **`DPTableVisualizer`は`DP_TABLE_META`(問題ごとのchips/cornerLabel/rowHeaders/colHeaders)経由で汎用化した**。以前は0-1ナップサック専用に`KNAPSACK_ITEMS`/`KNAPSACK_CAPACITY`をハードコードしていたが、LCS(文字列2本を行・列ヘッダーに展開)・編集距離(同様)にも対応できるよう抽象化した
- LCSは`content/algorithms/lcs.md`の例文と同じ文字列("ABCBDAB"/"BDCABA")、編集距離は教科書的な例("KITTEN"→"SITTING"、距離3)を固定データとして使用

### グラフ可視化(`src/components/visualizer/GraphVisualizer.tsx` + `src/lib/graph-visualizers.ts`)

- **対応アルゴリズム: ベルマン・フォード法・プリム法・クラスカル法の3つ**(2026-07-12新規追加)
- BFS/DFS/ダイクストラ法/A*探索が固定迷路(グリッドグラフ)を使うのに対し、こちらは一般的な頂点+重み付き辺のグラフを円形レイアウトでCanvas 2D描画する(ノードリンク図)
- ベルマン・フォード法は負の辺(D→E: 重み-3)を1本含む有向グラフを使い、ダイクストラ法では正しく解けない例を可視化する。全辺を頂点数-1回緩和し、各頂点の現在の距離をノード下に表示する
- プリム法・クラスカル法は正の重みのみの無向グラフ(最小全域木用)を共有し、採用された辺(tree)・棄却された辺(rejected、クラスカル法のみ)・検討中の辺(checking)を色分けする
- 辺の状態パレット(idle/checking/relaxed/rejected/tree)・頂点の状態パレット(idle/visited/settled)は`stateColors`を再利用しつつグラフ用に意味を再定義している

### three.js/pixi.jsによるショーケース演出(`src/components/visualizer/ParticleBurstLayer.tsx`)

- **2026-07-12、pixi.js(v8、WebGLベース)を導入し、ソート可視化にパーティクルバースト演出を追加した**。プロジェクト初のWebGLベース演出で、それ以外の可視化(グラフ・経路探索・DP)は引き続きCanvas 2D/HTML+CSSのまま
- `ParticleBurstLayer`は`SortVisualizer`のCanvas 2D描画の上に絶対配置で重ねる別レイヤー。`pixi.Application`をコンポーネントのマウント中1つだけ生成し(非同期`init()`のPromiseが解決する前にアンマウントされた場合は`cancelled`フラグで即破棄する)、`stepIndex`が進むたびに「新規に交換(swapping)状態になった位置」「新規に確定(settled)状態になった位置」を検出してパーティクルのバーストを1回だけ発火する(同じstepIndex×indexの組み合わせのイベントIDで重複発火を防止)
- `window.matchMedia("(prefers-reduced-motion: reduce)")`が真の環境では、pixi.Applicationの生成自体をスキップしパーティクルを一切出さない(パーティクルは装飾であり情報を担わないため、停止しても情報は失われない設計)
- ベルマン・フォード法等の新規グラフ可視化・LCS等の新規DP可視化には、スコープ限定のため今回は演出を追加していない(ソート可視化のみが「主戦場」としてのショーケース対象という既存方針を踏襲)

### 更新情報画面(`src/app/updates/page.tsx` + `src/app/api/updates/route.ts` + `src/lib/updates.ts`)

- **ui-design.md 3節#4「更新情報(RSSフィード)」を実装(2026-07-12)**。データソースはQiitaの人気記事フィード(`https://qiita.com/popular-items/feed`、Atom形式)。事前にcurlでHTTP 200・Atom XMLが返ることを確認済み(Zennの`https://zenn.dev/feed`は本開発環境からは接続できなかったため不採用)
- `src/app/api/updates/route.ts`が`export const runtime = "edge"`のRoute Handler(Vercel Edge Functions BFF)。外部フィードの取得・整形をここに閉じ込め、ブラウザには整形済みJSON(`{ items: UpdateItem[] }`)だけを返す
- `src/lib/updates.ts`の`fetchUpdates()`がXMLパース本体。**Edge RuntimeではブラウザのDOMParserが使えない**ため、`<entry>...</entry>`ブロックを正規表現で切り出し、`<title>`/`<link rel="alternate">`/`<published>`/`<content>`/`<author><name>`を個別に正規表現抽出する簡易パーサーを自作した(信頼できる自社データではなく外部フィードが相手なので、抽出結果はテキストとしてのみ扱い、HTMLとして描画しない)
- `src/components/updates/UpdatesFeed.tsx`はクライアントコンポーネントで、マウント時に`fetch("/api/updates")`を呼びカード一覧を表示する(BFFパターン: ブラウザ→Edge Function→外部フィード→JSON→ブラウザ描画)
- レスポンスに`Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600`を付与

### 比較画面(`src/app/compare/page.tsx` + `src/components/compare/CompareView.tsx`)

- **ui-design.md 3節#3「比較ビュー」を実装(2026-07-12)**。速さのランキングではなく、選択した最大4件のアルゴリズムのカテゴリ・計算量・概要を並べたテーブルを表示する
- v1スコープとして、比較対象はfrontmatterの`category`/`complexity`/`summary`のみ(Markdown本文の`## 特性・トレードオフ`セクションの構造化抽出は行っていない)。将来、より深いトレードオフ比較をしたい場合はMarkdown本文のセクションパースが必要になる
- 選択状態はこの画面内だけのローカルUI状態で、URLクエリへの永続化(共有可能なリンク化)は未対応

### Aboutページ(`src/app/about/page.tsx`)

- **ui-design.md 3節#5(優先度低)を実装(2026-07-12)**。プロジェクトのコンセプト・技術スタック・GitHubリポジトリへのリンクを静的に表示する。装飾を持たない実務モードのページ

### ナビゲーション(`src/components/hud/AppShell.tsx`)

- ヘッダーに「カタログ/比較/更新情報/About」への`<nav>`を追加(2026-07-12)。ブランド名とヘッダー右側(StatusChip+LiveClock)の間に配置

## 既知の制約・プレースホルダ

実装時点でスコープ外にしたもの、または仮実装のままのものを列挙する。

- **content/algorithms/の全163件(15カテゴリ全て)がコンテンツ充実化済み**。デザインパターン(GoF23種)を含む全カテゴリが`## 概要`・`## 仕組み`・`## 特性・トレードオフ`の3見出し構成になった(2026-07-12完了)。デザインパターンの`## 特性・トレードオフ`は他カテゴリのBig-O計算量ではなく、パターン固有のトレードオフ(拡張性とクラス数増加の綱引き、カプセル化との緊張関係など)を軸に記述している
- **可視化はソート6種+経路探索4種(BFS/DFS/ダイクストラ法/A*探索)+グラフ3種(ベルマン・フォード法/プリム法/クラスカル法)+DP3種(0-1ナップサック問題/LCS/編集距離)の計16件のみ**。残り147件は詳細ページを開いても「準備中」の破線パネルが表示されるだけ(コンテンツの充実化と可視化対応は別軸)
- **Web Worker化は「計算をworkerに移す」ところまで**。状態スナップショットのdiffベース記録・IndexedDBキャッシュは未実装。現状のworkerは`postMessage`1往復で全フレームを返すだけで、Event Sourcing的な差分記録・再生の仕組みにはなっていない(Workerインスタンス自体の使い回しは2026-07-12に対応済み、後述)
- **モーション停止ポリシー未実装**: ui-design.md 2.5節は「デフォルト全員フル演出、reduced-motion環境の閲覧者にのみ明示的な停止ボタンを表示する」という独自ポリシーを定めているが、現状はヒーロー見出しのアニメーションとpixi.jsパーティクル演出に標準の `prefers-reduced-motion` メディアクエリでの無効化のみを適用している(暫定対応。「停止ボタン」というUIそのものは未実装)。ソート可視化本体のアニメーション(再生ループ)には停止ポリシーが未適用
- **比較画面はfrontmatterのみを比較対象とする**。Markdown本文の`## 特性・トレードオフ`セクションを構造化して比較表に含める、という深い比較機能は未実装
- **更新情報画面のデータソースはQiitaの人気記事フィード1つのみ**。フィードの選択切り替え・複数フィードの合成などは未実装
- `npm audit` で moderate 2件の既知脆弱性あり(`create-next-app` 標準依存関係由来)。未対応・未調査
- ESLintの `globalIgnores` に `web-production-skill/**` を追加済み(この配下のファイルを誤って静的解析対象にしないため)
- ESLint(React Compiler由来のルール)が effect内での同期的な `setState` 呼び出しを禁止する。`SortVisualizer` の再生ループ、`useWorkerFrames` のcomputing判定の両方でこの制約を踏んだ。今後同様のuseEffectを書く際は「effect内で直接setStateする」のではなく「非同期コールバック内でのみsetStateする」か「他の値から導出する」形に倒すこと

## 動作確認手順・実績

以下を実行し、いずれもエラーなしであることを確認済み(2026-07-09時点、最終コミット時点のコードに対して):

```bash
npm install
npx tsc --noEmit      # 型エラーなし
npm run lint           # ESLintエラーなし(web-production-skill配下は除外設定済み)
npm run build           # 本番ビルド成功(163件の詳細ページを含む167ルートを静的プリレンダリング)
npm run dev             # 起動確認、curlでHTTPレスポンス200・想定コンテンツ(件数163・可視化canvas・プレースホルダ表示)を確認
node --experimental-strip-types -e "..." # BFS/DFSが実際にゴールへの経路を発見することを直接実行して確認(234/273フレーム、両方成功)
```

Markdownコンテンツ移行後は、`curl`でカタログの件数(163)・充実化したbubble-sortページの本文(「実務での立ち位置」等の見出し)・未対応アルゴリズム(rrf等)でも`## 概要`見出しが正しくレンダリングされることをHTMLレスポンスから直接確認した。

Web Worker化の確認は、`.next/static(または/dev)/chunks/turbopack-worker-*.js` が実際に生成され、その中に `onmessage`・`bubbleSortSteps`・`knapsackSteps`・`bfsSteps` 等が含まれていることをビルド成果物に対して直接grepして確認した(ビルド成果物確認であり、ブラウザでの実行確認ではない点に注意)。

**ブラウザでの目視確認は、この環境でChrome拡張が接続できず未実施**。UIを変更した際は、都度 `npm run dev` を起動しユーザー自身の目で確認すること(型チェック・ビルド成功はコードの正しさを保証するが、見た目の崩れやインタラクションの実際の挙動までは保証しない)。特にWeb Worker周りは「ビルドが通る」ことと「ブラウザで実際にメッセージのやり取りが動く」ことは別物なので、**次回ブラウザ確認できる環境で最優先に手動確認すること**。pixi.jsのパーティクル演出も同様に、WebGLコンテキストの実際の生成・描画はブラウザでの目視確認ができていない。

2026-07-12の可視化拡張・RSS・比較/Aboutページ・Worker最適化・pixi.js演出の追加では、上記に加えて以下を確認した: `npm run build`成功(170ルート、`/api/updates`がEdge Runtimeとして認識されることを確認)、`npm run dev`+curlで`/api/updates`が実際にQiitaのAtomフィードを整形したJSONを返すこと、`/compare`・`/about`・`/updates`の各ページが期待する`<h1>`を含むこと、`bellman-ford`/`prim`/`kruskal`/`lcs`/`edit-distance`の詳細ページがそれぞれcanvas/tableを含むこと、ホームのナビゲーションリンク(`/compare`・`/updates`・`/about`)が存在すること。

## 次にやること候補

優先度順ではなく、思いついた順のメモ。着手時にあらためて相談・計画すること。

1. 状態スナップショットのdiffベース記録・IndexedDBキャッシュの設計・実装(Worker使い回し最適化・複数種の可視化拡張は完了、Event Sourcing的な差分記録が残作業)
2. 可視化対応アルゴリズムのさらなる拡張(現在16件。DFS系の他探索、他のDP問題、他のグラフアルゴリズムなど)
3. モーション停止ポリシー(ui-design.md 2.5節)の「停止ボタン」UI自体の実装。現状は`prefers-reduced-motion`メディアクエリでの自動無効化のみ
4. 比較画面をMarkdown本文の`## 特性・トレードオフ`セクションまで踏み込んだ比較に拡張する
5. 更新情報画面のデータソースを複数フィードに拡張する、フィード選択UIを追加する
6. パーティクル演出(pixi.js)をソート可視化以外(グラフ・経路探索)にも展開するか検討する
7. `web-production-skill` の `scripts/qa_check.py` / `scripts/visual_qa.py` を、実際に見せられる画面が増えた段階で回す
