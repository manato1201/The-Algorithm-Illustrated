# 実装状況ノート

最終更新: 2026-07-13(可視化対応アルゴリズムを61件→73件に一括拡張(12件バッチ)。既存4コンポーネント(SearchVisualizer/GraphVisualizer/DPTableVisualizer)を新規カテゴリのアルゴリズムに再利用する形で、探索系2種(カダンのアルゴリズム/エラトステネスの篩)・グラフ2種(カーンのアルゴリズム/ジョンソンのアルゴリズム)・DP系8種(最長共通部分文字列/区間スケジューリング/ユークリッドの互除法/拡張ユークリッドの互除法/繰り返し二乗法/ロシア農民の乗算法/中国剰余定理/ディフィー・ヘルマン鍵共有)を追加した。全12件をnode --experimental-strip-typesで独立実装(brute-force・別アルゴリズムでの再計算)と突き合わせて検証済み。可視化拡張の経緯: 16件→42件→46件→49件→53件→54件→55件→56件→57件→58件→59件→60件→61件→73件。更新情報(RSS)画面+Vercel Edge Functions BFF、比較画面(可視化グリッド付き)、Aboutページ、Worker使い回し最適化、pixi.jsパーティクル演出も追加済み)

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

- **対応アルゴリズム: 9種類**(線形/二分/三分/ジャンプ/補間/指数/フィボナッチ探索/カダンのアルゴリズム/エラトステネスの篩)。2026-07-13にカダンのアルゴリズム・エラトステネスの篩を追加
- BFS/DFS等が固定迷路のグリッドを使うのに対し、こちらは`SortVisualizer`と同じバーチャート描画(Canvas 2D)を流用し、ソート済み固定配列(`SEARCH_ARRAY`、20要素)から固定値`SEARCH_TARGET`(=62、14番目)を探す様子を可視化する
- 線形探索以外は「ソート済みであること」を前提とするため、同じ配列を全アルゴリズムで共有している
- 発見(settled)時に`ParticleBurstLayer`でパーティクルバーストを再生する(SortVisualizerと同じ演出コンポーネントを再利用)
- フィボナッチ探索・補間探索・指数探索を含む全7種は`node --experimental-strip-types`で直接実行し、いずれも正しく14番目(値62)を発見することを確認済み
- **カダンのアルゴリズム(最大部分配列問題)・エラトステネスの篩は「探索」ではないが、SearchFrame型(array+highlight+description)がそのまま再利用できたため`SEARCH_VISUALIZERS`に相乗りさせた**。カダンのアルゴリズムは負の値を含む配列(`KADANE_ARRAY`)を扱うため、`SearchVisualizer`のCanvas描画を0を基準線とした上下対称スケールに変更(`Math.min(0,...)`〜`Math.max(0,...)`の範囲で正の値は上、負の値は下に伸びる棒グラフ)。既存の正の値のみの配列では基準線が0のままなので挙動は変わらない(回帰なし)。`SEARCH_TARGET`ラベル表示・凡例もアルゴリズムごとに出し分けるよう条件分岐した
- カダンのアルゴリズムはbrute-force全区間和探索との突き合わせで最大値6(区間[3,6])が一致、エラトステネスの篩は`Array.from`で書いた素朴な素数判定関数との突き合わせで2〜30の素数10個が完全一致することを`node --experimental-strip-types`で確認済み

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

- **対応アルゴリズム: 20種類**(0-1ナップサック問題/LCS/編集距離/硬貨両替/棒の切り出し/部分和問題/最長増加部分列(LIS)/最長回文部分列/フロイド・ワーシャル法/Sparse Table/行列連鎖乗算/卵落とし問題/最長共通部分文字列/区間スケジューリング/ユークリッドの互除法/拡張ユークリッドの互除法/繰り返し二乗法/ロシア農民の乗算法/中国剰余定理/ディフィー・ヘルマン鍵共有)。2026-07-12に9種、2026-07-13にさらに8種を追加
- **`DPTableVisualizer`は古典的な2次元DPだけでなく「値が段階的に埋まっていく表」全般の汎用表示器として再利用している**(既にSparse Table・行列連鎖乗算で前例あり)。2026-07-13追加分では: 最長共通部分文字列(LCSと同じ2次元DPだが不一致で0リセット)、区間スケジューリング(貪欲法、3行×区間数の表)、ユークリッドの互除法・拡張ユークリッドの互除法・繰り返し二乗法・ロシア農民の乗算法(いずれも数論アルゴリズムの反復列を「変数×反復回数」の表として表示)、中国剰余定理(6行×合同式数の表)、ディフィー・ヘルマン鍵共有(2行(Alice/Bob)×3列(秘密鍵/公開鍵/共有鍵)の表)。列数(反復回数)はアルゴリズムを一度先に実行してから決めるため、`DP_TABLE_META`内で同じ再帰を再計算する小さなIIFEを使っている
- 8種全てを`node --experimental-strip-types`で、それぞれ独立した検証方法(brute-force全区間探索・brute-force全部分集合探索・別実装のgcd/modpow関数・逆元付き合同式の直接検算など)と突き合わせて正しい結果に到達することを確認済み(詳細は下部の動作確認手順・実績を参照)
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

- **対応アルゴリズム: 13種類**(ベルマン・フォード法/プリム法/クラスカル法/トポロジカルソート/ボルーフカ法/Union-Find/Tarjanの強連結成分分解/Edmonds-Karp法/Dinic法/Ford-Fulkerson法/ホップクロフト・カープ法/カーンのアルゴリズム/ジョンソンのアルゴリズム)。2026-07-12にトポロジカルソート・ボルーフカ法・Union-Find・Tarjanの強連結成分分解・Edmonds-Karp法・Dinic法・Ford-Fulkerson法・ホップクロフト・カープ法、2026-07-13にカーンのアルゴリズム・ジョンソンのアルゴリズムを追加
- **カーンのアルゴリズム**は`topologicalSortSteps`(DFSの帰りがけ順)と同じDAGを使い回すが、入次数(indegree)をBFS的にキューで処理する対照的な実装。`distances`フィールドを入次数表示に流用(頂点下の数字が入次数)
- **ジョンソンのアルゴリズム**もbellman-ford.mdと同じグラフ(負の辺1本を含む)を使い、フロイド・ワーシャル法と同じ全点対最短経路を求めるが、アプローチが全く異なる: 仮想始点からのベルマン・フォード法でh(v)を計算→各辺をw'=w+h(u)-h(v)で再重み付け(非負になる)→全頂点を始点にダイクストラ法を実行、という3フェーズを可視化。得られた全点対最短距離は、同じグラフに対する独立実装のフロイド・ワーシャル法(3重ループ)と完全に一致することを確認済み
- **ホップクロフト・カープ法(二部マッチング)のみ`GraphNode.x/y`を左列(x=0.22)・右列(x=0.78)に配置する専用レイアウトを使う**。他のグラフアルゴリズムは`circleLayout()`(円形配置)を使うが、`GraphVisualizer`自体はノード座標をそのまま使うだけの汎用実装のため、データセット側の座標を変えるだけで新しいレイアウトに対応できた(コンポーネント側の変更は不要)
- **Dinic法**はEdmonds-Karp法と同じ最大流ネットワーク(既知の最大流=23)・同じ`GraphFrame.edgeLabels`基盤を再利用。Edmonds-Karp法が「BFS1回につき増加パス1本」なのに対し、Dinic法は「BFSでレベルグラフ(ソースからの距離)を1回構築したら、そのレベルが1ずつ増える辺だけをDFSでたどって複数の増加パスを一気に(ブロッキングフローとして)流す」という2段階を繰り返す、より高速な手法。同じ最大流23に到達すること、流量保存則・容量制約が成立することを検証済み
- **Edmonds-Karp法(最大流)**はCLRS教科書の古典的な最大流ネットワーク例(頂点S,V1〜V4,T、既知の最大流=23)を使用。GraphFrame型に`edgeLabels`(辺の表示ラベルを動的に上書きするオプショナルフィールド)を新設し、各辺を「現在の流量/容量」表示に切り替えた——他アルゴリズムは引き続き固定の`weight`表示のまま。BFSで最短の増加パスを探すたびに、残余容量(まだ流せる分+今までの流れを打ち消せる分)を使ってボトルネック容量を求め、流量を更新する。独立検証で、最大流23・流量保存則(各中間頂点で流入=流出)・容量制約(0≤流量≤容量)・S/T端点の流量一致(23=23)を全て確認済み。このデータセット・このBFS順序では、たまたま全ての増加パスが順方向の辺だけで構成され、逆向きの残余辺(既存の流れを打ち消す操作)は実際には使われずに最大流が求まることも確認した
- **Union-Find(素集合データ構造)**は8要素・7回のunion操作の専用データセットを新設し、find()でたどる経路をハイライトしつつ、union by rank(ランクの低い根を高い方につなぐ)で木の高さを抑えながら集合を統合する様子を可視化する。経路圧縮は簡略化のため未実装。全操作後に8要素が1つの集合へ収束することを検証済み
- **Tarjanの強連結成分分解(SCC)**は3つの強連結成分({A,B,C}の3頂点サイクル、{D,E}の2頂点サイクル、{F}の単独)を含む有向グラフを新設し、DFS1回で全SCCを求める様子を可視化する。各頂点に発見時刻(index)とlow-link値(後退辺でたどり着ける最小の発見時刻)を割り当て、low-link=発見時刻となった頂点をSCCの根としてスタックから同じSCCの仲間を全て取り出す。ブルートフォースの相互到達可能性判定(全頂点対の到達可能性を推移閉包で計算し、互いに到達できる頂点同士をグループ化)と完全に一致する結果が得られることを検証済み
- BFS/DFS/ダイクストラ法/A*探索が固定迷路(グリッドグラフ)を使うのに対し、こちらは一般的な頂点+重み付き辺のグラフを円形レイアウトでCanvas 2D描画する(ノードリンク図)
- ベルマン・フォード法は負の辺(D→E: 重み-3)を1本含む有向グラフを使い、ダイクストラ法では正しく解けない例を可視化する。全辺を頂点数-1回緩和し、各頂点の現在の距離をノード下に表示する
- プリム法・クラスカル法・ボルーフカ法は正の重みのみの無向グラフ(最小全域木用)を共有し、採用された辺(tree)・棄却された辺(rejected、クラスカル法のみ)・検討中の辺(checking)を色分けする。3アルゴリズムとも同じMST(総重量14: DE+BC+AC+EF+BD)に収束することを検証済み
- **ボルーフカ法**はプリム法(頂点を1つずつ広げる)・クラスカル法(辺をコスト順に見る)と異なり、「全ての木が同時に、他の木へ出る最小コストの辺を選んで一斉に統合する」というラウンド制の進め方を可視化する
- **トポロジカルソート**はベルマン・フォード法と同じ有向グラフ(DAG)を再利用し、DFSベース(帰りがけ順の逆順)で実装。生成された順序が全ての辺の向きを尊重していることを検証済み
- 辺の状態パレット(idle/checking/relaxed/rejected/tree)・頂点の状態パレット(idle/visited/settled)は`stateColors`を再利用しつつグラフ用に意味を再定義している

### 木構造の可視化(`src/components/visualizer/TreeVisualizer.tsx` + `src/lib/tree-visualizers.ts`、2026-07-12新規追加)

- **対応アルゴリズム: 二分探索木(BST)・AVL木・Treap・赤黒木の4つ**(2026-07-12に赤黒木を追加)。データ構造カテゴリ(16件)で初めて可視化対応したアルゴリズム群
- ノード集合・木の形そのものがフレームごとに変化するため、`GraphVisualizer`(固定ノード位置)とは異なり、**座標をフレームごとに再計算する**簡易tidy tree layoutを実装した(in-order走査の順番でx座標、深さでy座標を決める)
- **BST**は回転を行わないため、挿入順序によっては木が偏りうる(`[50,30,70,20,40,60,80,10]`という比較的バランスの取れた順序を採用)
- **AVL木**は挿入のたびに各頂点の平衡係数(左右部分木の高さ差)を確認し、±2以上になったらLL/RR/LR/RLいずれかの回転で高さ差を1以内に戻す。挿入順序`[10,20,30,40,50,25]`はRR回転・LR回転の両方が発生する古典的な例
- **Treap**は乱数の代わりに固定の優先度を割り当て、BSTとしての順序(値)とヒープとしての順序(優先度)を両立するよう回転する(本来は乱数を使うが、再現性のあるデモにするため固定値にしている旨をdescriptionで明示)
- **赤黒木(CLRS方式)**は新頂点を必ず赤として挿入し、赤黒木の4性質(根は黒/赤の子は必ず黒/根から葉までの黒頂点数が均一/BST順序)が崩れたら叔父の色で場合分けして修正する(叔父も赤なら再彩色して問題を上に伝播、叔父が黒ならジグザグを回転で直線に整形してから再彩色+回転)。回転で親をたどる必要があるため、`TreeNode`型に`parent`/`color`フィールドを追加した(他の3アルゴリズムでは未設定のまま、描画側は既存の状態パレットにフォールバックする)。`TreeVisualizer`も拡張し、`node.color`が設定されている頂点は赤/黒の実際の色を塗り、探索中・回転中の遷移だけをグロー(発光)で重ねて示す
- BST/AVL木ともBSTの性質(左部分木<親<右部分木)を、AVL木は追加で全頂点の平衡係数が±1以内であることを、Treapはヒープ条件(親の優先度≥子の優先度)を、赤黒木は上記4性質全てを`node --experimental-strip-types`で直接検証済み

### 文字列パターンマッチングの可視化(`src/components/visualizer/StringMatchVisualizer.tsx` + `src/lib/string-visualizers.ts`、2026-07-12新規追加)

- **対応アルゴリズム: KMP法・ラビン-カープ法・Z algorithm・ボイヤー・ムーア法の4つ**(2026-07-12にボイヤー・ムーア法を追加)。文字列カテゴリ(11件)で初めて可視化対応したアルゴリズム群
- **ボイヤー・ムーア法**は不良文字則のみの簡略版(good suffix則は省略)。他の3アルゴリズムが左から右へ1文字ずつ比較するのに対し、パターンを右から左へ比較し、不一致時に「その文字がパターン内で最後に現れる位置」を見て一気に複数文字分スキップする対照的な戦略を可視化する
- 3アルゴリズム共通で`TEXT="ABABDABACDABABCABAB"`・`PATTERN="ABABCABAB"`(位置10に1回だけ出現、CLRSの教科書的な例)を使用
- 描画は**Canvasではなくテキスト行+CSSトランジション**(DPTableVisualizerと同じ技術選択)。text行とpattern行を整列表示し、pattern行は`marginLeft`をCSS transitionで滑らかにスライドさせることで、パターンがテキストに沿って移動する様子を表現する
- **KMP法**は失敗関数(LPS配列)を事前計算し、不一致時にテキスト側を巻き戻さずパターン側だけをスキップする様子を可視化する
- **ラビン-カープ法**はローリングハッシュで窓ごとのハッシュ値を比較し、一致した場合のみ1文字ずつ検証する(ハッシュ衝突時に「一致に見えたが実際は不一致」という展開も明示的に示す)
- **Z algorithm**は「パターン+区切り文字+テキスト」を連結した文字列のZ配列を計算し、Z値がパターン長と一致する位置がそのままテキスト中の一致位置になることを可視化する
- 3アルゴリズムとも`node --experimental-strip-types`で直接実行し、いずれも正しく位置10で完全一致を発見することを確認済み

### トライ木の可視化(`src/components/visualizer/TrieVisualizer.tsx` + `src/lib/trie-visualizer.ts`、2026-07-12新規追加)

- **対応アルゴリズム: トライ木(接頭辞木)/Aho-Corasick法の2つ**。データ構造カテゴリ(16件)で5件目の可視化対応(トライ木)+文字列カテゴリ(11件)で5件目の可視化対応(Aho-Corasick法)
- `TreeVisualizer`(二分木前提)とは別コンポーネントとして新設した。トライ木は1頂点が持てる子の数が可変(二分木のような`left`/`right`ではなく`children: Record<文字, 子ID>`)なため、既存のin-order走査ベースのレイアウトが使えず、**children-first(帰りがけ)の集約**で座標を決める一般化tidy tree layoutを実装した: 葉は左から順に1スロットずつ、内部頂点のx座標は自分の子たちのx座標の平均
- `["CAT","CAR","CARD","CARE","DOG"]`の順に1文字ずつ挿入する。既存の子があればそのままたどり、なければ新規頂点を作成する。"CAT"→"CAR"の挿入で"CA"までの経路が共有され、新規に必要なのは"T"→なし"R"の1頂点だけになる様子が可視化できる
- 単語の終端頂点は二重丸(circle+ストローク)で区別して描画する
- `node --experimental-strip-types`で、挿入した全5単語がトライ木から正しく復元できること、共有接頭辞("CA")が実際に1つの頂点にまとまっていること(頂点数10、内訳: root+C+A+T+R+D+E+D+O+G)、未挿入の接頭辞("CA"単体)が単語として誤検出されないことを検証済み
- **Aho-Corasick法(`ahoCorasickSteps`)**は同じトライ木基盤(`children-first`レイアウト)を再利用し、`TrieNode`/`TrieFrame`型を後方互換に拡張(`word`/`fail`/`failEdges`は全てoptional)して実装した。複数パターン`["HE","SHE","HIS","HERS"]`を1本のトライ木にまとめて挿入した後、各頂点の失敗リンク(マッチ失敗時に飛ぶ先)をBFSで構築し、Canvas上に点線の辺として重ね描画する。続けてテキスト`"USHERS"`を1回だけ走査し、失敗リンクを辿りながら登録した全パターンの出現を同時に検出する(各パターンごとに個別のKMP法を走らせる必要がないのが利点)。頂点の新状態`"matched"`(pivot色)で検出済みパターンの終端頂点をハイライトする
- 独立実装(`String.prototype.indexOf`によるbrute-force全件検索)との突き合わせで、検出結果("SHE"終端インデックス3、"HE"終端インデックス3、"HERS"終端インデックス5)が完全一致することを`node --experimental-strip-types`で確認済み

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
- **可視化はソート17種+配列探索9種+グリッド経路探索4種+グラフ13種+DP20種+木構造4種+トライ木2種(トライ木/Aho-Corasick法)+文字列パターンマッチング4種の計73件**(2026-07-13、16件から大幅拡張)。残り90件は詳細ページを開いても「準備中」の破線パネルが表示されるだけ(コンテンツの充実化と可視化対応は別軸)
- **データ構造カテゴリ(16件)は5件(BST/AVL木/Treap/赤黒木/トライ木)が可視化対応。残り11件(b-tree/bloom-filter/fenwick-tree/interval-tree/kd-tree/lru-cache/quad-tree/segment-tree/skip-list等)は未対応**。kd-tree/quad-tree(2次元空間分割)・skip-list(多段リンクリスト)・lru-cache(双方向リスト+ハッシュマップ)は既存のいずれのビジュアライザとも構造が異なり、それぞれ専用の可視化コンポーネントが必要になる
- **文字列カテゴリ(11件)は4件(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法)が可視化対応。残り7件(aho-corasick/burrows-wheeler-transform/longest-common-substring/manacher/run-length-encoding/suffix-array/suffix-automaton)は未対応**。aho-corasickは今回作ったトライ木の`children: Record<文字,ID>`構造+失敗リンクの追加で`TrieVisualizer`を拡張すれば対応できる見込み。suffix-array/suffix-automatonは構造が大きく異なるため専用実装が必要になる
- **配列探索(SearchVisualizer)・DPの1次元/区間/全頂点対バリエーション・グラフのUnion-Find/Tarjanのアルゴリズムはいずれも既存コンポーネント(SortVisualizer型のバーチャート、DPTableVisualizer、GraphVisualizer)を流用**。新規に増えたUIコンポーネントはSearchVisualizer・TreeVisualizer・StringMatchVisualizer・TrieVisualizerの4つのみ
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

続く赤黒木の可視化(53件→54件、同じく2026-07-12)では、`node --experimental-strip-types`で赤黒木の4性質(根は黒/赤の子は必ず黒/根から葉までの黒頂点数が均一/BST順序)を全て再帰的に検証し、7個の値を挿入した最終状態でいずれも成立することを確認した(黒高さは全経路で2に統一)。加えて`npm run build`成功、dev server起動+curlで赤黒木ページが200・canvas要素を含むこと、既存の3木構造アルゴリズム(BST/AVL木/Treap)に回帰がないことを確認した。

続くTarjanの強連結成分分解の可視化(54件→55件、同じく2026-07-12)では、`node --experimental-strip-types`で、独立実装したブルートフォース(全頂点対の到達可能性を推移閉包で計算し、互いに到達できる頂点同士をグループ化)と、Tarjanのアルゴリズムが求めたSCC({A,B,C}|{D,E}|{F})が完全に一致することを確認した。加えて`npm run build`成功、dev server起動+curlでtarjan-sccページが200・canvas要素を含むこと、既存の6グラフアルゴリズムに回帰がないことを確認した。

続くトライ木の可視化(55件→56件、同じく2026-07-12)では、`node --experimental-strip-types`で、挿入した5単語("CAT","CAR","CARD","CARE","DOG")が全てトライ木から正しく復元できること、共有接頭辞("CA")が実際に1つの頂点にまとまっていること(最終頂点数10)、未挿入の接頭辞が単語として誤検出されないことを確認した。加えて`npm run build`成功、dev server起動+curlでtrieページが200・canvas要素を含むこと、既存の木構造・グラフアルゴリズムに回帰がないことを確認した。

続くEdmonds-Karp法の可視化(56件→57件、同じく2026-07-12)では、`node --experimental-strip-types`で、最大流が既知の正解値23と一致すること、各辺で0≤流量≤容量が守られていること、各中間頂点で流入=流出(流量保存則)が成立すること、S(source)から出る流量とT(sink)へ入る流量が両方とも23で一致することを確認した。加えて`npm run build`成功、dev server起動+curlでedmonds-karpページが200・canvas要素を含むこと、既存の7グラフアルゴリズムに回帰がないことを確認した。

続くDinic法の可視化(57件→58件、同じく2026-07-12)では、Edmonds-Karp法と同じ検証項目(最大流23・容量制約・流量保存則・S/T端点の流量一致)を`node --experimental-strip-types`で確認し、いずれもEdmonds-Karp法と同じ結果に到達することを確認した。加えて`npm run build`成功、dev server起動+curlでdinicページが200・canvas要素を含むこと、既存の8グラフアルゴリズムに回帰がないことを確認した。

続くFord-Fulkerson法の可視化(58件→59件、同じく2026-07-12)では、Edmonds-Karp法・Dinic法と同じ検証項目(最大流23・容量制約・流量保存則・S/T端点の流量一致)を`node --experimental-strip-types`で確認した。加えて、増加パスをBFSではなくDFSで探すため一般に最短パスとは限らないことを示す指標として、同じネットワーク上でEdmonds-Karp法が3ラウンドで収束するのに対しFord-Fulkerson法は5ラウンドかかることを直接比較・確認した。`npm run build`成功、dev server起動+curlでford-fulkersonページが200・canvas要素を含むこと、既存の9グラフアルゴリズムに回帰がないことを確認した。

続くAho-Corasick法の可視化(59件→60件、同じく2026-07-12)では、`node --experimental-strip-types`で、`String.prototype.indexOf`によるbrute-force全件検索(独立実装)との突き合わせにより、パターン`["HE","SHE","HIS","HERS"]`をテキスト`"USHERS"`に対して検出した一致結果("SHE"終端インデックス3、"HE"終端インデックス3、"HERS"終端インデックス5)が完全一致することを確認した。加えて全10頂点に失敗リンクが漏れなく設定されていることも確認した。`npm run build`成功、dev server起動+curlでaho-corasickページが200・canvas要素を含むこと、既存のトライ木・グラフアルゴリズムに回帰がないことを確認した。

続くホップクロフト・カープ法の可視化(60件→61件、同じく2026-07-12)では、`node --experimental-strip-types`で、CLRS例題(L1-R1,L1-R2,L2-R1,L3-R2,L3-R3)に対するbrute-force全探索(辺の部分集合2^5=32通りを総当たりし、頂点が重複しない最大サイズを求める独立実装)との突き合わせにより、アルゴリズムが求めた最大マッチングサイズ3が一致すること、実際に得られたマッチング(L1-R2,L2-R1,L3-R3)が頂点重複のない妥当なマッチングであることを確認した。`npm run build`成功、dev server起動+curlでhopcroft-karpページが200・canvas要素を含むこと、既存のグラフ・トライ木アルゴリズムに回帰がないことを確認した。

続く12件バッチ(61件→73件、2026-07-13、ユーザーから「10〜20件ずつ進めて」と指示を受けて着手)では、新規コンポーネントを作らず既存4種(SearchVisualizer/GraphVisualizer/DPTableVisualizer)を新しいアルゴリズムに再利用する方針で一気に拡張した。各アルゴリズムを`node --experimental-strip-types`で以下のように検証した:
- カダンのアルゴリズム: brute-force全区間和探索との突き合わせで最大値6(区間[3,6])が一致
- エラトステネスの篩: 素朴な試し割り判定関数で求めた2〜30の素数10個と完全一致
- カーンのアルゴリズム: 求めた順序が全ての辺について「起点の位置<終点の位置」を満たす妥当なトポロジカル順序であることを確認
- ジョンソンのアルゴリズム: 独立実装した3重ループのフロイド・ワーシャル法との突き合わせで全点対最短距離が完全一致
- 最長共通部分文字列: brute-force全部分文字列探索との突き合わせで"BABC"(長さ4)が一致
- 区間スケジューリング: brute-force全部分集合探索(2^6通り)との突き合わせで最大3件が両立可能という結果が一致
- ユークリッドの互除法: gcd(48,18)=6が別実装の再帰的gcd関数と一致
- 拡張ユークリッドの互除法: 得られた(s,t)が実際に35×s+15×t=gcd(35,15)=5を満たすことを直接検算
- 繰り返し二乗法: 7^13 mod 11=2が別実装のmodpow関数と一致
- ロシア農民の乗算法: 17×34=578が単純な掛け算と一致
- 中国剰余定理: 求めたx=23が全ての合同式(mod3=2、mod5=3、mod7=2)を実際に満たすことを直接検算
- ディフィー・ヘルマン鍵共有: Alice側の計算(B^a mod p)とBob側の計算(A^b mod p)が独立実装でも同じ共有鍵2に一致

加えて`npx tsc --noEmit`(johnsonSteps内のdistPrime.get()が`number|null|undefined`型になる箇所を`typeof d === "number"`で明示的に絞り込むよう修正)・`npx eslint .`・`npm run build`(170ルート)成功、dev server起動+curlで12ページ全てが200・canvas/table要素を含むこと、既存の探索・グラフ・DPアルゴリズム(linear-search/hopcroft-karp/lcs)に回帰がないことを確認した。カダンのアルゴリズムが負の値を含む配列を扱うため、`SearchVisualizer`のCanvas描画を0基準線の上下対称スケールに変更したが、既存の正の値のみの配列(SEARCH_ARRAY等)では挙動が変わらないことも確認済み。

## 次にやること候補

優先度順ではなく、思いついた順のメモ。着手時にあらためて相談・計画すること。

**ユーザーとの合意事項(2026-07-12)**: 3課題(a. アルゴリズム数を文字通り10倍の約1630件にする、b. 未可視化アルゴリズムの可視化実装、c. 比較画面での可視化表示)のうち**bを最優先**として着手し、可視化対応を16件→42件→46件→49件→53件→54件→55件→56件→57件→58件→59件→60件→61件→73件と段階的に拡張。**cも完了**(比較画面に可視化グリッドを追加)。残るはaと、bのさらなる継続。2026-07-13にユーザーから「10〜20件ずつ進めて」と明示指示があり、以降はこのペースでバッチ処理する。

1. **可視化対応アルゴリズムのさらなる拡張(現在73件/163件、bの継続)**。
   - データ構造カテゴリは16件中5件(BST/AVL木/Treap/赤黒木/トライ木)が対応済み、残り11件が未対応。専用の新規ビジュアライザが必要: kd-tree/quad-tree(2次元空間分割)、skip-list(多段リンクリスト)、lru-cache(双方向リスト+ハッシュマップ)、b-tree(多分木)、bloom-filter(ビット配列+複数ハッシュ関数)、interval-tree(区間集合)、fenwick-tree/segment-tree(区間クエリ木、TreeVisualizerとは異なる完全二分木レイアウトが必要)、splay-tree
   - 文字列カテゴリは11件中6件(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法/Aho-Corasick法/最長共通部分文字列)が対応済み、残り5件が未対応。専用実装が必要: suffix-array/suffix-automaton(接尾辞構造)、manacher(回文専用)、burrows-wheeler-transform/run-length-encoding(圧縮系、テキスト変換のビフォーアフター表示が必要。run-length-encodingはDPCell.valueがnumber|nullのみでテキストを直接置けないため今回は見送った)
   - DP残り(tsp-bitdp、ビットマスクDPで既存のDPTableVisualizerには収まりにくいため専用検討が必要)
   - 数論・暗号カテゴリ14件中7件(エラトステネスの篩/ユークリッドの互除法/拡張ユークリッドの互除法/繰り返し二乗法/ロシア農民の乗算法/中国剰余定理/ディフィー・ヘルマン鍵共有)が対応済み、残り7件が未対応: baby-step-giant-step、chinese-remainder-theorem(実装済み)以外にmiller-rabin/pollards-rho/lucas-lehmer/karatsuba/rsa等
   - 貪欲法カテゴリ3件中2件(kadane/interval-scheduling)が対応済み、残り1件
   - 比較画面の可視化グリッドで実際にブラウザから4件同時選択して見比べる操作フローの手動確認(次回ブラウザ確認できる環境で最優先)
2. **アルゴリズム数を10倍(約1630件)に拡大する**(課題a、未着手)。163件時点でも既にカテゴリを相当網羅しているため、実現には新カテゴリの新設(既存15カテゴリの深掘りだけでは限界がある)や、より粒度の細かいバリエーション(同じアルゴリズムの派生・変種)を含めるかの方針検討が必要。着手前に改めて相談すること
3. 状態スナップショットのdiffベース記録・IndexedDBキャッシュの設計・実装(Worker使い回し最適化は完了、Event Sourcing的な差分記録が残作業)
4. モーション停止ポリシー(ui-design.md 2.5節)の「停止ボタン」UI自体の実装。現状は`prefers-reduced-motion`メディアクエリでの自動無効化のみ
5. 比較画面をMarkdown本文の`## 特性・トレードオフ`セクションまで踏み込んだ比較に拡張する
6. 更新情報画面のデータソースを複数フィードに拡張する、フィード選択UIを追加する
7. パーティクル演出(pixi.js)をソート可視化以外(グラフ・経路探索・探索・木構造)にも展開するか検討する
8. `web-production-skill` の `scripts/qa_check.py` / `scripts/visual_qa.py` を、実際に見せられる画面が増えた段階で回す
