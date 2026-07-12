# 実装状況ノート

最終更新: 2026-07-12(数論・暗号カテゴリ14件のコンテンツを完全充実化)

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

**移行内容**: 68件→163件に拡充する際に新設したカテゴリ・項目(情報検索・ランキング/機械学習/デザインパターン23種/シミュレーション・群知能/分散システムなど)はそのまま引き継いだ。全163件をMarkdownへ変換する一時スクリプトを実行し(スクリプト自体は使い捨てのため削除済み)、可視化対応済みの9件(バブル/選択/挿入/マージ/ヒープ/クイックソート・BFS・DFS・0-1ナップサック問題)は「概要・仕組み・特性トレードオフ」の3段構成で手動で書き込みを充実させた。**続けて1カテゴリずつ完全充実化を進めており、現在ソート(17件)・探索(11件)・動的計画法(11件)・グラフ(16件)・文字列(11件)・データ構造(16件)・数論暗号(14件)の7カテゴリ・計96件が充実済み**(各カテゴリの完了経緯は git log を参照。同じ3段構成で執筆している)。残り8カテゴリ・67件は `summary` から生成した簡易な本文(概要のみ+特性トレードオフはTODOコメント)のままで、今後の拡充対象。

### アルゴリズム詳細ページ(`src/app/algorithms/[id]/page.tsx`)

- `generateStaticParams` で163件すべてを静的生成(SSG)。ID一覧は `getAllAlgorithmIds()` から取得
- レイアウトはスティッキーサイド(ui-design.md 4.1節の転用): 左固定=可視化キャンバス+コントロール、右スクロール=説明文(Markdown本文をレンダリング)
- `id in SORT_VISUALIZERS` → `SortVisualizer`、`id in PATHFINDING_VISUALIZERS` → `PathfindingVisualizer`、`id in DP_VISUALIZERS` → `DPTableVisualizer`、どれでもなければ破線パネルで「準備中」を表示、の順で判定する簡易ディスパッチ

### 再生コントロールの共通化(`src/components/visualizer/useStepPlayer.ts` + `PlaybackControls.tsx`)

- `stepIndex`/`isPlaying`の管理・再生タイマー・戻る/進む/リセットのハンドラを`useStepPlayer`フックに集約し、ボタン行のUIを`PlaybackControls`コンポーネントに切り出した
- `SortVisualizer`・`PathfindingVisualizer`・`DPTableVisualizer`の3つがこの2つを共用し、描画ロジックだけを個別に持つ構成
- effect内で同期的に`setState`を呼ぶとESLint(react-hooks/set-state-in-effect)にひっかかるため、`setTimeout`コールバック内でのみ呼ぶ設計にしている(既知の制約参照)

### Web Worker化(`src/workers/algorithm-worker.ts` + `src/components/visualizer/useWorkerFrames.ts`)

- ステップ(フレーム)列の生成をWeb Workerに委譲するようにした。`{ kind: "sort" | "pathfinding" | "dp", algorithmId, input? }` をpostMessageすると、workerが対応する生成関数(`sort-visualizers.ts`/`pathfinding-visualizers.ts`/`dp-visualizers.ts`)を実行し `{ frames }` を返す
- `new Worker(new URL("../../workers/algorithm-worker.ts", import.meta.url))` というTurbopack/Webpack互換の書き方を使用。Turbopackが実際に専用のworkerチャンクを生成することを `.next/static/chunks/turbopack-worker-*.js` の存在とその中身(`onmessage`・`bubbleSortSteps`等を含む)で確認済み
- `useWorkerFrames<T>(request)` フック: `request`はkindに応じた判別可能ユニオン型で、呼び出し側で`useMemo`により参照を安定させる(参照が変わるたびworkerを起動し直す設計)。isComputingは`useState`で持たず、「結果に紐づくrequest」と「現在のrequest」を参照比較して導出することで、effect内での同期的setStateを回避している
- **これは「Web Workers上でアルゴリズムを実行する」という当初の設計方針を反映したものだが、状態スナップショットのdiffベース記録・IndexedDBキャッシュはまだ実装していない**。現状のフレームは配列/グリッド/テーブルの全体スナップショットをステップごとに丸ごと保持する方式(小規模な入力=配列20要素・迷路160マス・DPテーブル5×9なのでメモリ上は問題にならないが、当初の設計ドキュメントが懸念していた「複雑なアルゴリズムでのメモリ逼迫」への対処そのものではない)

### ソート可視化(`src/components/visualizer/SortVisualizer.tsx` + `src/lib/sort-visualizers.ts`)

- **対応アルゴリズム: バブル・選択・挿入・マージ・ヒープ・クイックソートの6つ**
- `sort-visualizers.ts` が配列と操作からステップ(フレーム)列を事前に全て生成する(`{ array, highlight, description }[]`)。生成自体はWeb Worker内で実行される
- 描画はCanvas 2D。バーの色は `design-tokens.ts` の `stateColors`(idle/comparing/swapping/pivot/settled)をそのまま使用し、ui-design.md 2.2節のトークンをコードで初めて実利用した
- 操作: 再生/一時停止、1ステップ戻る/進む、シャッフル(配列を再生成)

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

- **対応アルゴリズム: 0-1ナップサック問題の1つのみ**(品物4種・容量8の固定データ)
- 他の可視化と異なり**Canvasではなく素のHTML `<table>` + CSSトランジション**で実装。`data-state`属性(idle/comparing/pivot/settled)に応じて`background-color`/`box-shadow`を`transition`で滑らかに切り替える。CSSアニメーションによる可視化改善というユーザー要望に、Canvasとは別の技術で応えた
- 状態色は`color-mix(in srgb, ...)`でトークンの色を背景に混ぜ込む形で表現(モダンCSS関数。主要ブラウザ2024年以降のバージョンで対応)
- dp[i][w]テーブルを埋めていく過程で、参照する前段のセル(comparing)・計算中のセル(pivot)・確定済みのセル(settled)を色分け

**three.js/pixi.jsは全可視化とも未導入。** design-directions.mdの「ショーケースティアはWebGL適性◎」という記述はあるが、まずは追加依存なしのCanvas 2D/HTML+CSSで様子を見る方針(ユーザーとの合意事項)。パーティクル演出等が必要になったタイミングで再検討する

## 既知の制約・プレースホルダ

実装時点でスコープ外にしたもの、または仮実装のままのものを列挙する。

- **content/algorithms/の67件(充実化済み7カテゴリ以外)はMarkdown移行時の簡易生成のまま**。`## 概要`(=元のsummary)と`## 特性・トレードオフ`(TODOコメントのみ)の2見出ししかなく、`## 仕組み`セクションが存在しない。ソート・探索・動的計画法・グラフ・文字列・データ構造・数論暗号の7カテゴリ(計96件)は全て充実化済み
- **可視化はソート6種+経路探索4種(BFS/DFS/ダイクストラ法/A*探索)+DP1種の計11件のみ**。残り152件は詳細ページを開いても「準備中」の破線パネルが表示されるだけ(コンテンツの充実化と可視化対応は別軸で、動的計画法カテゴリは11件全て充実化済みでも可視化対応は0-1ナップサック問題1件のみ)
- **Web Worker化は「計算をworkerに移す」ところまで**。状態スナップショットのdiffベース記録・IndexedDBキャッシュは未実装。現状のworkerは`postMessage`1往復で全フレームを返すだけで、Event Sourcing的な差分記録・再生の仕組みにはなっていない
- 現在のworker実装は`request`が変わるたびに新しい`Worker`インスタンスを生成・破棄している(`useWorkerFrames`)。ワーカー起動コストは小さいが、頻繁な切り替えが発生する画面では単一の永続ワーカーを使い回す設計に見直す余地がある
- **Vercel Edge Functions(RSS等のBFF)は未実装**。「更新情報」画面(ui-design.md 3節の#4)自体も未着手
- **比較画面**(ui-design.md 3節の#3)・**Aboutページ**(#5)は未着手
- **モーション停止ポリシー未実装**: ui-design.md 2.5節は「デフォルト全員フル演出、reduced-motion環境の閲覧者にのみ明示的な停止ボタンを表示する」という独自ポリシーを定めているが、現状はヒーロー見出しのアニメーションに標準の `prefers-reduced-motion` メディアクエリでの無効化のみを適用している(暫定対応)。ソート可視化のアニメーション(再生ループ)には停止ポリシーが未適用
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

**ブラウザでの目視確認は、この環境でChrome拡張が接続できず未実施**。UIを変更した際は、都度 `npm run dev` を起動しユーザー自身の目で確認すること(型チェック・ビルド成功はコードの正しさを保証するが、見た目の崩れやインタラクションの実際の挙動までは保証しない)。特にWeb Worker周りは「ビルドが通る」ことと「ブラウザで実際にメッセージのやり取りが動く」ことは別物なので、**次回ブラウザ確認できる環境で最優先に手動確認すること**。

## 次にやること候補

優先度順ではなく、思いついた順のメモ。着手時にあらためて相談・計画すること。

1. content/algorithms/の残り67件(貪欲法・計算幾何・最適化確率的手法・情報検索ランキング・機械学習・デザインパターン・シミュレーション群知能・分散システムの8カテゴリ)のコンテンツ充実化。充実化済み7カテゴリ(計96件)が雛形になる
2. 状態スナップショットのdiffベース記録・IndexedDBキャッシュの設計・実装(Web Worker化自体は完了、Event Sourcing的な差分記録が残作業)
3. ベルマン・フォード法(負の辺対応)・プリム法/クラスカル法(最小全域木)など他のグラフアルゴリズム、DP(LCS等)など、可視化対応アルゴリズムをさらに拡張する
4. 更新情報(RSS)画面 + Vercel Edge Functions BFFの実装
5. モーション停止ポリシー(ui-design.md 2.5節)の実装。可視化が増えるほど後回しにしづらくなる
6. three.js/pixi.jsによるショーケース級演出の検討(現状はCanvas 2D/HTML+CSSのみ)
7. `useWorkerFrames` が毎回新規Workerを生成・破棄している点の見直し(単一の永続ワーカーを使い回す設計への変更)
8. `web-production-skill` の `scripts/qa_check.py` / `scripts/visual_qa.py` を、実際に見せられる画面が増えた段階で回す
