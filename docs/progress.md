# 実装状況ノート

最終更新: 2026-07-09(索引拡充+アルゴリズム詳細ページ・ソート可視化を追加)

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
- データソースは [src/lib/sample-algorithms.ts](../src/lib/sample-algorithms.ts)(後述の仮データ、163件)
- 検索は完全にクライアントサイドの `Array.prototype.filter`。データ量が今後大きく増える場合はサーバーサイド検索や仮想スクロールへの切り替えを検討する
- カタログの代表カード・一覧行は `/algorithms/[id]` へのリンクになっている

### アルゴリズム索引データ(`src/lib/sample-algorithms.ts`)

68件→**163件**に拡充。カテゴリを10→15に拡張し、以下を新設した:

- **情報検索・ランキング**: BM25、TF-IDF、RRF(Reciprocal Rank Fusion)、PageRank、HITS、MinHash/LSH
- **機械学習**: k-means法、k近傍法、決定木、ナイーブベイズ、勾配降下法、バックプロパゲーション、パーセプトロン、ランダムフォレスト、SVM、PCA
- **デザインパターン**: GoF(Gang of Four)の23パターン全て(生成5+構造7+振る舞い11)。`complexity` フィールドは計算量ではなく「生成/構造/振る舞いに関するパターン」という分類文字列を流用表示している(`ComplexityBadge` は任意の文字列を表示できる汎用コンポーネントのため転用可能だった)
- **シミュレーション・群知能**: Boids、ライフゲーム、蟻コロニー最適化、粒子群最適化、ラングトンのアリ
- **分散システム**: Paxos、Raft、二相コミット、ベクタークロック、一貫性ハッシュ法、ブリー・アルゴリズム

既存カテゴリ(ソート・探索・グラフ・動的計画法・文字列・データ構造・数論暗号・計算幾何・最適化確率的手法)にもマニアックな項目を追加(ボゴソート、イントロソート、Burrows-Wheeler変換、AVL木・B木・Treap・スプレー木、ロシア農民の乗算法、ドロネー三角形分割など)。

### アルゴリズム詳細ページ(`src/app/algorithms/[id]/page.tsx`)

- `generateStaticParams` で163件すべてを静的生成(SSG)
- レイアウトはスティッキーサイド(ui-design.md 4.1節の転用): 左固定=可視化キャンバス+コントロール、右スクロール=説明文
- 可視化ロジックがある(`SORT_VISUALIZERS` に登録された)アルゴリズムのみ `SortVisualizer` を表示。それ以外は破線パネルで「準備中」を表示

### ソート可視化(`src/components/visualizer/SortVisualizer.tsx` + `src/lib/sort-visualizers.ts`)

- **対応アルゴリズム: バブルソート・クイックソートの2つのみ**(現時点)
- `sort-visualizers.ts` が配列と操作からステップ(フレーム)列を事前に全て生成する(`{ array, highlight, description }[]`)。Web Worker/diffベースの状態記録ではなく、**クライアント側で全ステップを一括生成してから再生する簡易実装**(本来のアーキテクチャ設計とは異なる暫定版)
- 描画はCanvas 2D。バーの色は `design-tokens.ts` の `stateColors`(idle/comparing/swapping/pivot/settled)をそのまま使用し、ui-design.md 2.2節のトークンをコードで初めて実利用した
- 操作: 再生/一時停止、1ステップ戻る/進む、シャッフル(配列を再生成)
- three.js/pixi.jsは未導入。design-directions.mdの「ショーケースティアはWebGL適性◎」という記述はあるが、まずは追加依存なしのCanvas 2D + CSSで様子を見る方針(ユーザーとの合意事項)。パーティクル演出等が必要になったタイミングで再検討する

## 既知の制約・プレースホルダ

実装時点でスコープ外にしたもの、または仮実装のままのものを列挙する。

- **`sample-algorithms.ts` は仮データ**(163件)。実データモデル・コンテンツ管理方法(Markdownファイル化するかCMS化するか等)は未設計
- **可視化はバブルソート・クイックソートの2件のみ**。残り161件は詳細ページを開いても「準備中」の破線パネルが表示されるだけ
- **Web Worker上でのアルゴリズム実行、状態スナップショット/diffベースの記録、IndexedDBキャッシュは未実装**。現状のソート可視化は本来のアーキテクチャ設計(Web Worker + diff記録)を通さない暫定実装
- **Vercel Edge Functions(RSS等のBFF)は未実装**。「更新情報」画面(ui-design.md 3節の#4)自体も未着手
- **比較画面**(ui-design.md 3節の#3)・**Aboutページ**(#5)は未着手
- **モーション停止ポリシー未実装**: ui-design.md 2.5節は「デフォルト全員フル演出、reduced-motion環境の閲覧者にのみ明示的な停止ボタンを表示する」という独自ポリシーを定めているが、現状はヒーロー見出しのアニメーションに標準の `prefers-reduced-motion` メディアクエリでの無効化のみを適用している(暫定対応)。ソート可視化のアニメーション(再生ループ)には停止ポリシーが未適用
- `npm audit` で moderate 2件の既知脆弱性あり(`create-next-app` 標準依存関係由来)。未対応・未調査
- ESLintの `globalIgnores` に `web-production-skill/**` を追加済み(この配下のファイルを誤って静的解析対象にしないため)
- ESLint(React Compiler由来のルール)が effect内での同期的な `setState` 呼び出しを禁止する。`SortVisualizer` の再生ループ実装で踏んだため、今後同様のuseEffectを書く際は「effect内で直接setStateする」のではなく「setTimeout/イベントハンドラなど非同期コールバック内でsetStateする」形に倒すこと

## 動作確認手順・実績

以下を実行し、いずれもエラーなしであることを確認済み(2026-07-09時点、最終コミット時点のコードに対して):

```bash
npm install
npx tsc --noEmit      # 型エラーなし
npm run lint           # ESLintエラーなし(web-production-skill配下は除外設定済み)
npm run build           # 本番ビルド成功(163件の詳細ページを含む167ルートを静的プリレンダリング)
npm run dev             # 起動確認、curlでHTTPレスポンス200・想定コンテンツ(件数163・可視化canvas・プレースホルダ表示)を確認
```

**ブラウザでの目視確認は、この環境でChrome拡張が接続できず未実施**。UIを変更した際は、都度 `npm run dev` を起動しユーザー自身の目で確認すること(型チェック・ビルド成功はコードの正しさを保証するが、見た目の崩れやインタラクションの実際の挙動までは保証しない)。

## 次にやること候補

優先度順ではなく、思いついた順のメモ。着手時にあらためて相談・計画すること。

1. Web Worker + 状態スナップショット(diffベース)の設計・実装。現状のソート可視化(クライアント側で全ステップ事前生成)を本来のアーキテクチャに置き換える
2. ソート以外(グラフ探索・DP等)の可視化ロジックを追加し、`SORT_VISUALIZERS` 的な仕組みを一般化する
3. `sample-algorithms.ts` を実データモデルに置き換え、コンテンツの管理方法(Markdown化・別リポジトリ化・CMS化など)を決める
4. 更新情報(RSS)画面 + Vercel Edge Functions BFFの実装
5. モーション停止ポリシー(ui-design.md 2.5節)の実装。可視化が増えるほど後回しにしづらくなる
6. `web-production-skill` の `scripts/qa_check.py` / `scripts/visual_qa.py` を、実際に見せられる画面が増えた段階で回す
