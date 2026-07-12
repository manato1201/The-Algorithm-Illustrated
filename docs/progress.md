# 実装状況ノート

最終更新: 2026-07-12(比較画面(/compare)に可視化グリッドを追加し、課題c「比較画面での可視化表示」に対応。7種類の可視化ディスパッチを`AlgorithmVisualizer`共通コンポーネントに集約し、詳細ページ・比較画面の両方から使う構成にリファクタリング。可視化対応アルゴリズムは53件のまま(コンテンツ充実化ではなく既存可視化の見せ方を拡張したフェーズ)。直前のフェーズで可視化対応を16件→53件に大幅拡張済み(ソート17種/配列探索7種/経路探索4種/グラフ6種/DP12種/木構造3種/文字列4種)。更新情報(RSS)画面+Vercel Edge Functions BFF、比較画面、Aboutページ、Worker使い回し最適化、pixi.jsパーティクル演出も追加済み)

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

- ステップ(フレーム)列の生成をWeb Workerに委譲するようにした。`{ kind: "sort" | "pathfinding" | "dp" | "graph" | "search" | "tree" | "string", algorithmId, input? }` をpostMessageすると、workerが対応する生成関数(`sort-visualizers.ts`/`pathfinding-visualizers.ts`/`dp-visualizers.ts`/`graph-visualizers.ts`/`search-visualizers.ts`/`tree-visualizers.ts`/`string-visualizers.ts`)を実行し `{ request, frames }` を返す
- `new Worker(new URL("../../workers/algorithm-worker.ts", import.meta.url))` というTurbopack/Webpack互換の書き方を使用。Turbopackが実際に専用のworkerチャンクを生成することを `.next/static/chunks/turbopack-worker-*.js` の存在とその中身(`onmessage`・`bubbleSortSteps`等を含む)で確認済み
- **Worker使い回し最適化(2026-07-12)**: 以前は`request`が変わるたびに新規`Worker`を生成・破棄していたが、`useWorkerFrames`をコンポーネントのマウント中1つのWorkerだけを生成・使い回す設計に変更した。Worker生成用のeffect(依存配列`[]`)とpostMessage送信用のeffect(依存配列`[request]`)を分離している
  - postMessageは構造化クローンを経由するため、返ってきた`request`は元のオブジェクトと参照が一致しない。そのため結果の相関は参照比較(`===`)ではなく`sameRequest()`による値比較で行う(`WorkerResponse`に`request`をエコーバックさせている)
- `useWorkerFrames<T>(request)` フック: `request`はkindに応じた判別可能ユニオン型で、呼び出し側で`useMemo`により参照を安定させる。isComputingは`useState`で持たず、「結果に紐づくrequest」と「現在のrequest」を値比較して導出することで、effect内での同期的setStateを回避している
- **これは「Web Workers上でアルゴリズムを実行する」という当初の設計方針を反映したものだが、状態スナップショットのdiffベース記録・IndexedDBキャッシュはまだ実装していない**。現状のフレームは配列/グリッド/テーブルの全体スナップショットをステップごとに丸ごと保持する方式(小規模な入力=配列20要素・迷路160マス・DPテーブル最大7×8なのでメモリ上は問題にならないが、当初の設計ドキュメントが懸念していた「複雑なアルゴリズムでのメモリ逼迫」への対処そのものではない)

### ソート可視化(`src/components/visualizer/SortVisualizer.tsx` + `src/lib/sort-visualizers.ts`)

- **対応アルゴリズム: 17種類**(バブル/選択/挿入/マージ/ヒープ/クイック/シェル/コム/カクテルシェイカー/カウンティング/基数/バケット/サイクル/パンケーキ/イントロ/ボゴ/TimSort)。2026-07-12に基本6種から残り11種を追加し、ソートカテゴリの可視化対応を完了させた
- `sort-visualizers.ts` が配列と操作からステップ(フレーム)列を事前に全て生成する(`{ array, highlight, description }[]`)。生成自体はWeb Worker内で実行される
- 描画はCanvas 2D。バーの色は `design-tokens.ts` の `stateColors`(idle/comparing/swapping/pivot/settled)をそのまま使用し、ui-design.md 2.2節のトークンをコードで初めて実利用した
- 操作: 再生/一時停止、1ステップ戻る/進む、シャッフル(配列を再生成)
- **パーティクル演出(2026-07-12追加)**: `ParticleBurstLayer`(pixi.js製、WebGLレンダリング)をCanvas 2Dの上に絶対配置で重ね、要素の交換(swapping)・確定(settled)への遷移時に発光パーティクルのバーストを再生する。詳細は後述の「three.js/pixi.js」節を参照
- **新規11種の実装メモ(2026-07-12)**:
  - カウンティングソート・基数ソート・バケットソートは比較を使わないため、出力配列を0(未配置)で初期化してから要素が確定するごとにバーが「現れる」形で表現している
  - ボゴソートは要素数20の配列を偶然整列させるのは期待計算量O((n+1)!)的に非現実的なため、試行回数の上限(100回)を設けて打ち切り、最後にデモ用の直接整列を挟む実装にしている(「なぜこのアルゴリズムを使ってはいけないか」を可視化そのもので示す)
  - イントロソート(簡略版)はクイックソートを基本に、再帰深さが`2×⌊log2(n)⌋`を超えたらヒープソート、区間サイズが8以下になったら挿入ソートに切り替える3方式ハイブリッドとして実装
  - TimSort(簡略版)は実際のギャロップモード等の高度な最適化を省略し、「小さな区間(ラン、サイズ4)を挿入ソート→マージソートで統合する」という核となる発想のみを可視化している
  - サイクルソート・イントロソート・ボゴソート・パンケーキソート等の正しさは`node --experimental-strip-types`で直接実行し、全11種とも最終フレームが正しくソート済みであることを確認済み

### 配列探索の可視化(`src/components/visualizer/SearchVisualizer.tsx` + `src/lib/search-visualizers.ts`、2026-07-12新規追加)

- **対応アルゴリズム: 線形/二分/三分/ジャンプ/補間/指数/フィボナッチ探索の7つ**
- BFS/DFS等が固定迷路のグリッドを使うのに対し、こちらは`SortVisualizer`と同じバーチャート描画(Canvas 2D)を流用し、ソート済み固定配列(`SEARCH_ARRAY`、20要素)から固定値`SEARCH_TARGET`(=62、14番目)を探す様子を可視化する
- 線形探索以外は「ソート済みであること」を前提とするため、同じ配列を全アルゴリズムで共有している
- 発見(settled)時に`ParticleBurstLayer`でパーティクルバーストを再生する(SortVisualizerと同じ演出コンポーネントを再利用)
- フィボナッチ探索・補間探索・指数探索を含む全7種は`node --experimental-strip-types`で直接実行し、いずれも正しく14番目(値62)を発見することを確認済み

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

- **対応アルゴリズム: 12種類**(0-1ナップサック問題/LCS/編集距離/硬貨両替/棒の切り出し/部分和問題/最長増加部分列(LIS)/最長回文部分列/フロイド・ワーシャル法/Sparse Table/行列連鎖乗算/卵落とし問題)。2026-07-12に9種を追加
- **行列連鎖乗算**は最長回文部分列と同じ区間DPの骨格(`dp[i][j]`)だが、参照するのは「内側区間」ではなく「分割点kで割った左右区間+その分割コスト」という点が異なる。CLRSの教科書的な次元列(6行列)を使用し、ブルートフォース(全括弧付けパターンの再帰探索)と最小コスト(15125)が一致することを検証済み
- **卵落とし問題**は`dp[卵の数][階数]`=最悪ケース最小試行回数。「x階から落として割れた場合(卵が減り下の階を探索)/割れなかった場合(卵は減らず上の階を探索)の悪い方を最小化するxを選ぶ」という最小最大化の発想をテーブルの参照関係で可視化する。卵2個・床10階の設定でブルートフォースと一致(4回)することを検証済み
- **Sparse Table**(区間最小値クエリ用の前計算テーブル)は`k×i`の2次元DPとして表現: `dp[k][i]`=開始位置iから長さ2^kの区間の最小値。長さ2^kの区間は長さ2^(k-1)の2つの区間の最小値比較だけで求まる(区間が重なっていても正しい、というべき乗区間分割特有の性質)。ブルートフォースの区間最小値計算と全セルが一致することを検証済み
- 他の可視化と異なり**Canvasではなく素のHTML `<table>` + CSSトランジション**で実装。`data-state`属性(idle/comparing/pivot/settled)に応じて`background-color`/`box-shadow`を`transition`で滑らかに切り替える
- 状態色は`color-mix(in srgb, ...)`でトークンの色を背景に混ぜ込む形で表現(モダンCSS関数。主要ブラウザ2024年以降のバージョンで対応)
- **`DPTableVisualizer`は`DP_TABLE_META`(問題ごとのchips/cornerLabel/rowHeaders/colHeaders)経由で汎用化されている**ため、1次元DP(硬貨両替・棒の切り出し・LIS、1行のテーブルとして表示)・2次元DP(0-1ナップサック・LCS・編集距離・部分和問題)・区間DP(最長回文部分列、同一文字列の区間dp[i][j])・全頂点対DP(フロイド・ワーシャル法、N×Nの距離行列)のいずれも同じコンポーネントで表示できる
- **硬貨両替**はcoins=[1,3,4]・amount=6という「貪欲法(4+1+1=3枚)では最適解(3+3=2枚)に届かない」古典的な反例を採用し、DPが必要な理由を示している
- **フロイド・ワーシャル法**は`graph-visualizers.ts`の`SHORTEST_PATH_NODES`/`SHORTEST_PATH_EDGES`(ベルマン・フォード法と同じ負の辺1本を含む有向グラフ)を再利用し、経由地kごとの全頂点対距離更新をDPテーブルとして可視化する(dpのnullは「未到達=∞」を意味し、テーブル上は空欄として表示)
- 新規6種は全て`node --experimental-strip-types`で直接実行し、既知の正解値(硬貨両替=2枚、棒の切り出し=22、部分和=達成可能、LIS長=4、最長回文部分列=7、フロイド・ワーシャル法のdist[A][F]=5)と一致することを確認済み

### グラフ可視化(`src/components/visualizer/GraphVisualizer.tsx` + `src/lib/graph-visualizers.ts`)

- **対応アルゴリズム: 6種類**(ベルマン・フォード法/プリム法/クラスカル法/トポロジカルソート/ボルーフカ法/Union-Find)。2026-07-12にトポロジカルソート・ボルーフカ法・Union-Findを追加
- **Union-Find(素集合データ構造)**は8要素・7回のunion操作の専用データセットを新設し、find()でたどる経路をハイライトしつつ、union by rank(ランクの低い根を高い方につなぐ)で木の高さを抑えながら集合を統合する様子を可視化する。経路圧縮は簡略化のため未実装。全操作後に8要素が1つの集合へ収束することを検証済み
- BFS/DFS/ダイクストラ法/A*探索が固定迷路(グリッドグラフ)を使うのに対し、こちらは一般的な頂点+重み付き辺のグラフを円形レイアウトでCanvas 2D描画する(ノードリンク図)
- ベルマン・フォード法は負の辺(D→E: 重み-3)を1本含む有向グラフを使い、ダイクストラ法では正しく解けない例を可視化する。全辺を頂点数-1回緩和し、各頂点の現在の距離をノード下に表示する
- プリム法・クラスカル法・ボルーフカ法は正の重みのみの無向グラフ(最小全域木用)を共有し、採用された辺(tree)・棄却された辺(rejected、クラスカル法のみ)・検討中の辺(checking)を色分けする。3アルゴリズムとも同じMST(総重量14: DE+BC+AC+EF+BD)に収束することを検証済み
- **ボルーフカ法**はプリム法(頂点を1つずつ広げる)・クラスカル法(辺をコスト順に見る)と異なり、「全ての木が同時に、他の木へ出る最小コストの辺を選んで一斉に統合する」というラウンド制の進め方を可視化する
- **トポロジカルソート**はベルマン・フォード法と同じ有向グラフ(DAG)を再利用し、DFSベース(帰りがけ順の逆順)で実装。生成された順序が全ての辺の向きを尊重していることを検証済み
- 辺の状態パレット(idle/checking/relaxed/rejected/tree)・頂点の状態パレット(idle/visited/settled)は`stateColors`を再利用しつつグラフ用に意味を再定義している

### 木構造の可視化(`src/components/visualizer/TreeVisualizer.tsx` + `src/lib/tree-visualizers.ts`、2026-07-12新規追加)

- **対応アルゴリズム: 二分探索木(BST)・AVL木・Treapの3つ**。データ構造カテゴリ(16件)で初めて可視化対応したアルゴリズム群
- ノード集合・木の形そのものがフレームごとに変化するため、`GraphVisualizer`(固定ノード位置)とは異なり、**座標をフレームごとに再計算する**簡易tidy tree layoutを実装した(in-order走査の順番でx座標、深さでy座標を決める)
- **BST**は回転を行わないため、挿入順序によっては木が偏りうる(`[50,30,70,20,40,60,80,10]`という比較的バランスの取れた順序を採用)
- **AVL木**は挿入のたびに各頂点の平衡係数(左右部分木の高さ差)を確認し、±2以上になったらLL/RR/LR/RLいずれかの回転で高さ差を1以内に戻す。挿入順序`[10,20,30,40,50,25]`はRR回転・LR回転の両方が発生する古典的な例
- **Treap**は乱数の代わりに固定の優先度を割り当て、BSTとしての順序(値)とヒープとしての順序(優先度)を両立するよう回転する(本来は乱数を使うが、再現性のあるデモにするため固定値にしている旨をdescriptionで明示)
- BST/AVL木ともBSTの性質(左部分木<親<右部分木)を、AVL木は追加で全頂点の平衡係数が±1以内であることを、Treapはヒープ条件(親の優先度≥子の優先度)を`node --experimental-strip-types`で直接検証済み

### 文字列パターンマッチングの可視化(`src/components/visualizer/StringMatchVisualizer.tsx` + `src/lib/string-visualizers.ts`、2026-07-12新規追加)

- **対応アルゴリズム: KMP法・ラビン-カープ法・Z algorithm・ボイヤー・ムーア法の4つ**(2026-07-12にボイヤー・ムーア法を追加)。文字列カテゴリ(11件)で初めて可視化対応したアルゴリズム群
- **ボイヤー・ムーア法**は不良文字則のみの簡略版(good suffix則は省略)。他の3アルゴリズムが左から右へ1文字ずつ比較するのに対し、パターンを右から左へ比較し、不一致時に「その文字がパターン内で最後に現れる位置」を見て一気に複数文字分スキップする対照的な戦略を可視化する
- 3アルゴリズム共通で`TEXT="ABABDABACDABABCABAB"`・`PATTERN="ABABCABAB"`(位置10に1回だけ出現、CLRSの教科書的な例)を使用
- 描画は**Canvasではなくテキスト行+CSSトランジション**(DPTableVisualizerと同じ技術選択)。text行とpattern行を整列表示し、pattern行は`marginLeft`をCSS transitionで滑らかにスライドさせることで、パターンがテキストに沿って移動する様子を表現する
- **KMP法**は失敗関数(LPS配列)を事前計算し、不一致時にテキスト側を巻き戻さずパターン側だけをスキップする様子を可視化する
- **ラビン-カープ法**はローリングハッシュで窓ごとのハッシュ値を比較し、一致した場合のみ1文字ずつ検証する(ハッシュ衝突時に「一致に見えたが実際は不一致」という展開も明示的に示す)
- **Z algorithm**は「パターン+区切り文字+テキスト」を連結した文字列のZ配列を計算し、Z値がパターン長と一致する位置がそのままテキスト中の一致位置になることを可視化する
- 3アルゴリズムとも`node --experimental-strip-types`で直接実行し、いずれも正しく位置10で完全一致を発見することを確認済み

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
- **可視化グリッドを追加(2026-07-12、課題c対応)**。比較表の下に「■ VISUALIZE 実行の可視化を見比べる」セクションを新設し、選択したアルゴリズムのうち可視化対応済みのものを`grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr))`で並べて同時表示する。可視化未対応のアルゴリズムが選択されている場合は、その名前を一覧表示して明示する(無言で消えるのではなく理由が分かるように)
- 選択されたアルゴリズムの数だけ`AlgorithmVisualizer`(≒Web Worker)インスタンスが同時に生成される(最大4つ)。各`useWorkerFrames`はコンポーネントのマウント中1つのWorkerを使い回す設計のため、4件同時表示でもWorker数は最大4つに収まる

### 可視化ディスパッチの共通化(`src/components/visualizer/AlgorithmVisualizer.tsx`、2026-07-12新規追加)

- アルゴリズム詳細ページ(`page.tsx`)と比較画面(`CompareView.tsx`)の両方が同じ「idから7種類の可視化コンポーネントのどれを使うか判定する」ロジックを必要としたため、`hasVisualizer(id)`と`<AlgorithmVisualizer algorithmId={id} />`として1箇所に集約した
- 詳細ページ側はこのリファクタリングで、7つのif-else三項演算子の連鎖から`hasVisualizer(id) ? <AlgorithmVisualizer .../> : <プレースホルダ/>`という2行に簡略化された。可視化の種類が今後増えても、この共通コンポーネントだけを直せば両画面に反映される

### Aboutページ(`src/app/about/page.tsx`)

- **ui-design.md 3節#5(優先度低)を実装(2026-07-12)**。プロジェクトのコンセプト・技術スタック・GitHubリポジトリへのリンクを静的に表示する。装飾を持たない実務モードのページ

### ナビゲーション(`src/components/hud/AppShell.tsx`)

- ヘッダーに「カタログ/比較/更新情報/About」への`<nav>`を追加(2026-07-12)。ブランド名とヘッダー右側(StatusChip+LiveClock)の間に配置

## 既知の制約・プレースホルダ

実装時点でスコープ外にしたもの、または仮実装のままのものを列挙する。

- **content/algorithms/の全163件(15カテゴリ全て)がコンテンツ充実化済み**。デザインパターン(GoF23種)を含む全カテゴリが`## 概要`・`## 仕組み`・`## 特性・トレードオフ`の3見出し構成になった(2026-07-12完了)。デザインパターンの`## 特性・トレードオフ`は他カテゴリのBig-O計算量ではなく、パターン固有のトレードオフ(拡張性とクラス数増加の綱引き、カプセル化との緊張関係など)を軸に記述している
- **可視化はソート17種+配列探索7種+グリッド経路探索4種+グラフ6種+DP12種+木構造3種+文字列パターンマッチング4種の計53件**(2026-07-12、16件から大幅拡張)。残り110件は詳細ページを開いても「準備中」の破線パネルが表示されるだけ(コンテンツの充実化と可視化対応は別軸)
- **データ構造カテゴリ(16件)は3件(BST/AVL木/Treap)のみ可視化対応。残り13件(b-tree/bloom-filter/fenwick-tree/interval-tree/kd-tree/lru-cache/quad-tree/red-black-tree/segment-tree/skip-list/trie等)は未対応**。赤黒木はAVL木と同様のツリーの回転+再彩色が必要でTreeVisualizerを拡張すれば対応できる見込みだが、kd-tree/quad-tree(2次元空間分割)・skip-list(多段リンクリスト)・lru-cache(双方向リスト+ハッシュマップ)は既存のいずれのビジュアライザとも構造が異なり、それぞれ専用の可視化コンポーネントが必要になる
- **文字列カテゴリ(11件)は4件(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法)が可視化対応。残り7件(aho-corasick/burrows-wheeler-transform/longest-common-substring/manacher/run-length-encoding/suffix-array/suffix-automaton)は未対応**。suffix-array/suffix-automaton/aho-corasichは構造が大きく異なるため専用実装が必要になる
- **配列探索(SearchVisualizer)・DPの1次元/区間/全頂点対バリエーション・グラフのUnion-Findはいずれも既存コンポーネント(SortVisualizer型のバーチャート、DPTableVisualizer、GraphVisualizer)を流用**。新規に増えたUIコンポーネントはSearchVisualizer・TreeVisualizer・StringMatchVisualizerの3つのみ
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

続く可視化対応アルゴリズムの大幅拡張(16件→42件、同じく2026-07-12)では、新規26アルゴリズム全ての詳細ページがHTTP 200を返しcanvas/tableを含むことをcurlで確認した上で、`node --experimental-strip-types`によるロジックの直接実行検証を重点的に行った: 新規ソート11種は全て最終フレームが`Array.prototype.sort`の結果と一致(サイクルソート・イントロソート・ボゴソート等の複雑なものを含む)、新規探索7種は全て固定配列内の値62(14番目)を正しく発見、新規DP6種は既知の正解値(硬貨両替=2枚・棒の切り出し=22・部分和=達成可能・LIS長=4・最長回文部分列=7・フロイド-ワーシャル法のdist[A][F]=5)と一致、新規グラフ2種はトポロジカルソートの順序が全辺の向きを尊重すること・ボルーフカ法が採用した5辺の総重量14がクラスカル法の結果と一致することを確認した。node実行時、`dp-visualizers.ts`が`graph-visualizers.ts`を拡張子なしでimportしている箇所はNode ESMローダーが素では解決できない(Next.js/TypeScriptの`moduleResolution: bundler`前提のコードのため)ため、検証用に一時的に拡張子付きimportへ書き換えたコピーを作って実行し、検証後に削除している(本体のソースコードは変更していない)。

続く木構造ビジュアライザの新設(42件→46件、同じく2026-07-12)では、`node --experimental-strip-types`でBST・AVL木・Treapそれぞれの最終フレームに対し、BST性質(左部分木<親<右部分木を再帰検証)・AVL木の平衡条件(全頂点で|左部分木の高さ-右部分木の高さ|≤1)・Treapのヒープ条件(親の優先度≥子の優先度)をコードで直接検証し、いずれも成立することを確認した。Sparse Tableはブルートフォースの区間最小値計算(`Math.min(...arr.slice(i, i+len))`)と全セルの値が一致することを検証した。加えて`npm run build`成功・dev server起動+curlで4アルゴリズム全ての詳細ページがcanvas/tableを含むことを確認した。

続く文字列パターンマッチングの可視化(46件→49件、同じく2026-07-12)では、`node --experimental-strip-types`でKMP法・ラビン-カープ法・Z algorithmそれぞれを直接実行し、いずれも`TEXT.indexOf(PATTERN)`の結果(位置10)と一致する位置で「完全一致を発見」というdescriptionのフレームが生成されることを確認した。加えて`npm run build`成功・dev server起動+curlで3アルゴリズム全ての詳細ページがtext/pattern両方の文字列を含むことを確認した。

続く既存ビジュアライザの拡張(49件→53件、同じく2026-07-12、新規コンポーネントなし)では、`node --experimental-strip-types`でボイヤー・ムーア法が位置10で一致を発見すること、行列連鎖乗算・卵落とし問題がそれぞれ独立実装したブルートフォース(全括弧付けパターンの再帰探索/全試行階xの再帰探索)と完全一致すること(15125・4)、Union-Findが7回のunion操作全てで実際に集合統合(no-opなし)を起こし最終的に8要素が1つの集合に収束することを確認した。加えて`npm run build`成功・dev server起動+curlで4アルゴリズム全ての詳細ページが期待する要素(text/table/canvas)を含むことを確認した。

続く比較画面への可視化統合(53件のまま、同じく2026-07-12、課題c対応)では、7種類の可視化ディスパッチを`AlgorithmVisualizer`共通コンポーネントに集約するリファクタリングを行った上で、`npm run build`成功、dev server起動+curlで(1)詳細ページのリファクタリング後も回帰なく6サンプル全て200を返すこと、(2)`/compare`ページが200を返し初期状態(未選択)では検索欄のみでVISUALIZEセクションが出ない(条件分岐が正しく機能している)ことを確認した。さらに`.next/dev/static/chunks/`のビルド成果物を直接grepし、`hasVisualizer`関数が実際にクライアントバンドルへ含まれていることを確認した(クライアント側の選択操作自体はブラウザでの目視確認ができておらず未検証、既知の制約参照)。

## 次にやること候補

優先度順ではなく、思いついた順のメモ。着手時にあらためて相談・計画すること。

**ユーザーとの合意事項(2026-07-12)**: 3課題(a. アルゴリズム数を文字通り10倍の約1630件にする、b. 未可視化アルゴリズムの可視化実装、c. 比較画面での可視化表示)のうち**bを最優先**として着手し、可視化対応を16件→42件→46件→49件→53件と段階的に拡張。**cも完了**(比較画面に可視化グリッドを追加)。残るはaと、bのさらなる継続。

1. **可視化対応アルゴリズムのさらなる拡張(現在53件/163件、bの継続)**。
   - データ構造カテゴリは16件中3件(BST/AVL木/Treap)が対応済み、残り13件が未対応。`TreeVisualizer`を拡張すれば対応できる見込み: 赤黒木(回転+再彩色)、トライ木(n分木、既存の二分木前提のレイアウトを拡張要)。専用の新規ビジュアライザが必要: kd-tree/quad-tree(2次元空間分割)、skip-list(多段リンクリスト)、lru-cache(双方向リスト+ハッシュマップ)、b-tree(多分木)、bloom-filter(ビット配列+複数ハッシュ関数)、interval-tree(区間集合)
   - 文字列カテゴリは11件中4件(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法)が対応済み、残り7件が未対応。専用実装が必要: aho-corasick(複数パターン同時探索、トライ木+失敗リンク)、suffix-array/suffix-automaton(接尾辞構造)、manacher(回文専用)、burrows-wheeler-transform/run-length-encoding(圧縮系、テキスト変換のビフォーアフター表示が必要)
   - グラフの残り(tarjan-scc/最大流系(dinic/ford-fulkerson/edmonds-karp)/二部マッチング(hopcroft-karp)/johnson法)、DP残り(tsp-bitdp、ビットマスクDPで既存のDPTableVisualizerには収まりにくいため専用検討が必要)
   - 比較画面の可視化グリッドで実際にブラウザから4件同時選択して見比べる操作フローの手動確認(次回ブラウザ確認できる環境で最優先)
2. **アルゴリズム数を10倍(約1630件)に拡大する**(課題a、未着手)。163件時点でも既にカテゴリを相当網羅しているため、実現には新カテゴリの新設(既存15カテゴリの深掘りだけでは限界がある)や、より粒度の細かいバリエーション(同じアルゴリズムの派生・変種)を含めるかの方針検討が必要。着手前に改めて相談すること
3. 状態スナップショットのdiffベース記録・IndexedDBキャッシュの設計・実装(Worker使い回し最適化は完了、Event Sourcing的な差分記録が残作業)
4. モーション停止ポリシー(ui-design.md 2.5節)の「停止ボタン」UI自体の実装。現状は`prefers-reduced-motion`メディアクエリでの自動無効化のみ
5. 比較画面をMarkdown本文の`## 特性・トレードオフ`セクションまで踏み込んだ比較に拡張する
6. 更新情報画面のデータソースを複数フィードに拡張する、フィード選択UIを追加する
7. パーティクル演出(pixi.js)をソート可視化以外(グラフ・経路探索・探索・木構造)にも展開するか検討する
8. `web-production-skill` の `scripts/qa_check.py` / `scripts/visual_qa.py` を、実際に見せられる画面が増えた段階で回す
