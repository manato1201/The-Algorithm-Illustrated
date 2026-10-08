# The-Algorithm-Illustrated

状態分離型 インタラクティブ・アルゴリズム図鑑 — アルゴリズムがどのような目的で生まれ、どう動くのかを可視化・時間巻き戻し可能な形で学べる学習ダッシュボード。速さを競うランキングではなく、なぜ生まれ・どう動き・どこで報われるのかを理解することを目的とする。

**公開URL**: [the-algorithm-illustrated.vercel.app](https://the-algorithm-illustrated.vercel.app)(誰でもアクセス可能、`git push`のたびに自動再デプロイ)

## ドキュメント

| ドキュメント                                                                   | 内容                                                                                                     |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [docs/technical-guide.md](docs/technical-guide.md)                             | 技術解説書。データモデル・可視化アーキテクチャ・カテゴリ分類・検証体制などを項目別に整理したリファレンス |
| [docs/architecture.md](docs/architecture.md)                                   | アーキテクチャ図解(Mermaid記法、GitHub上でそのままレンダリングされる)                                    |
| [docs/report.html](docs/report.html)                                           | ブラウザで直接開けるスタンドアロンHTML版サマリーレポート(統計・図解・実装状況)                           |
| [docs/design/ui-design.md](docs/design/ui-design.md)                           | UI/デザインシステム仕様(ダーク×サイバーHUDトーン、デザイントークン、決めごと表、ライトテーマ、画面構成)  |
| [docs/design/design-log.md](docs/design/design-log.md)                         | デザイン方向の決定ログ(反復防止用)                                                                       |
| [docs/progress.md](docs/progress.md)                                           | 実装状況ノート(セッションごとの来歴。何が実装済みで何がプレースホルダか、次にやること)                   |
| [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md)                                     | 改善・リファクタリング計画書(グリッド化・新カテゴリ・CI・可視化拡大・UI強化。Phaseごとの進捗つき)        |
| [IMPROVEMENT_PLAN_2026-10.md](IMPROVEMENT_PLAN_2026-10.md)                     | 2026-10の改善書(3方式レーン比較・補間/誘導系・年表Atlas・ステップ再生の演出・UI/デザイン改善)            |
| [IMPROVEMENT_DESIGN_2026-10.md](IMPROVEMENT_DESIGN_2026-10.md)                 | 上記のUI/デザイン改善の設計書(決めごと表・画面設計・実装フェーズ)                                        |

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router + TypeScript、静的生成)。このNext.jsは従来と異なる点があるため、コードを書く前に `node_modules/next/dist/docs/` を確認すること(`AGENTS.md`参照)
- **ホスティング/BFF**: Vercel(Edge Functionsで外部RSSを中継。`/api/updates`で実装済み)
- **並列処理**: Web Workers(可視化のステップ列生成に導入済み、単一Workerを使い回す設計。状態のdiffベース記録は未実装)
- **描画**: Canvas API(ソート・経路探索・グラフ・木構造・計算幾何)、HTML+CSS(DPテーブル・文字列照合・レーン比較)、pixi.js/WebGL(状態確定時のパーティクル演出)
- **コンテンツ**: `content/algorithms/*.md`(gray-matter + marked)。年表データは `content/atlas/milestones.json`
- **状態キャッシュ**: IndexedDB(未実装)

## セットアップ

```bash
npm install
```

Node.js v20以降を推奨(動作確認環境: v22)。

## 実行・動作手順

| コマンド                   | 内容                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`              | 開発サーバーを起動([http://localhost:3000](http://localhost:3000))                                                                    |
| `npm run build`            | 本番ビルドを作成                                                                                                                      |
| `npm run start`            | `npm run build` 後、本番ビルドをローカルで起動                                                                                        |
| `npm run lint`             | ESLintを実行                                                                                                                          |
| `npm run verify`           | 可視化の正しさを、独立実装のbrute-force・既知の正解値と突き合わせて検証(`scripts/verify-visualizations.mjs`。計算幾何の構造チェック・レーン比較の正解照合を含む) |
| `npm run verify:categories`| 全記事のfrontmatterが `CATEGORY_TAXONOMY` と一致するか検証(`scripts/verify-categories.mjs`)                                           |
| `npm run stats:categories` | カテゴリ別の収録数・可視化対応数を実データから集計してMarkdown表で出力(`scripts/category-stats.mjs`)                                  |
| `npx tsc --noEmit`         | 型チェックのみ実行(ビルドなし)                                                                                                        |

開発中の変更確認は `npm run dev` → ブラウザで `http://localhost:3000` を開く、が基本フロー。コードを変更するたびに以下を通しておくと安全(CIも同じ検証を実行する):

```bash
npx tsc --noEmit && npm run lint && npm run verify && npm run verify:categories && npm run build
```

## カテゴリ別の収録状況

`npm run stats:categories` の出力(2026-10-09時点)。数値は実データから集計されるので、手で書き換えず再実行して貼り直す。

| カテゴリ | 収録数 | 可視化対応 | 対応率 |
| --- | ---: | ---: | ---: |
| ソート | 24 | 23 | 96% |
| 探索 | 38 | 14 | 37% |
| グラフ | 25 | 25 | 100% |
| 動的計画法 | 24 | 18 | 75% |
| 貪欲法 | 24 | 4 | 17% |
| 文字列 | 23 | 15 | 65% |
| データ構造 | 25 | 18 | 72% |
| 数論・暗号 | 24 | 21 | 88% |
| 計算幾何 | 23 | 10 | 43% |
| 最適化・確率的手法 | 25 | 7 | 28% |
| 情報検索・ランキング | 38 | 6 | 16% |
| 機械学習 | 23 | 6 | 26% |
| デザインパターン | 23 | 8 | 35% |
| シミュレーション・群知能 | 25 | 12 | 48% |
| 分散システム | 25 | 10 | 40% |
| ゲーム | 38 | 6 | 16% |
| 数値計算 | 24 | 15 | 63% |
| コンピュータビジョン | 24 | 10 | 42% |
| 自然言語処理 | 23 | 10 | 43% |
| コンパイラ・構文解析 | 23 | 4 | 17% |
| バイオインフォマティクス | 25 | 8 | 32% |
| 並行処理・並列アルゴリズム | 39 | 14 | 36% |
| スケジューリング | 25 | 14 | 56% |
| 制御・ロボティクス | 26 | 7 | 27% |
| 音響・信号処理 | 25 | 0 | 0% |
| ゲーム/競技プログラミング | 24 | 6 | 25% |
| キャラクターAI・空間AI | 25 | 18 | 72% |
| 強化学習 | 24 | 7 | 29% |
| CG・3Dレンダリング | 24 | 5 | 21% |
| **合計(29カテゴリ)** | **758** | **321** | **42%** |

音響・信号処理は、波形・スペクトログラムを描く新しい可視化kindが前提になるため未着手。

## プロジェクト構成

```
content/
  algorithms/           アルゴリズム記事(実データモデル本体)。<id>.md × 758件、frontmatter+Markdown本文
  atlas/                年表Atlasのデータ(milestones.json。各項目に出典と「生まれた目的」が必須)
src/
  app/
    layout.tsx          ルートレイアウト。フォント読み込み+AppShell+テーマ初期化スクリプト
    page.tsx            トップページ(カタログ画面を呼び出すだけ)
    globals.css         デザイントークン(:root=ダーク、:root[data-theme="light"]=ライト)とベーススタイル
    not-found.tsx       404ページ(迷子の点が幅優先探索で出口を探す小さな遊び)
    algorithms/[id]/    アルゴリズム詳細ページ(動的ルート、静的生成。関連アルゴリズム・お気に入り・コードコピー付き)
    atlas/              アルゴリズム年表(時間軸/分野の輪の2ビュー)
    basics/             「アルゴリズムとは/Big-O記法とは」入門ページ
    compare/            比較画面(最大4件を並べて比較、可視化対応なら実行の可視化も並べて表示)
    updates/            更新情報画面(RSSフィードのカード表示)
    about/              Aboutページ
    api/updates/        更新情報画面向けのEdge Function BFF(RSS取得・整形)
  components/
    hud/                全画面共通のHUD(ナビゲーション・選択中ピル・テーマ切替・お気に入りボタン等)
    catalog/            カタログ画面(検索・リキッドタブ・カテゴリ絞り込み・スタックブラウザ)
    atlas/              年表Atlasの表示(時間軸・分野の輪)
    not-found/          404の迷路アニメーション
    compare/            比較画面のUI
    updates/            更新情報画面のフィード表示
    visualizer/         可視化コンポーネント一式(ソート/探索/経路探索/グラフ/DP/木/トライ/文字列/計算幾何/レーン比較)
                        +再生コントロール(useStepPlayer/PlaybackControls: 状態色のタイムライン・速度・累計カウンタ)
                        +step-timeline.ts(フレーム→ステップごとの状態種別)+Web Worker連携(useWorkerFrames)
                        +パーティクル演出(ParticleBurstLayer)+ディスパッチャ(AlgorithmVisualizer)
  lib/
    design-tokens.ts    デザイントークンのTS版(Canvas用)。shouldGlow(発光は確定/比較中のみ)・readableTextColor(文字色)
    algorithm-categories.ts  カテゴリ→サブカテゴリの階層定義(CATEGORY_TAXONOMY)。カテゴリ一覧の唯一の情報源
    content/            記事・年表の読み込み(gray-matter + marked)
    has-visualizer.ts   idに可視化があるかの判定(各 *_VISUALIZERS レジストリを照合)
    *-visualizers.ts    可視化kindごとのステップ列生成(sort/search/pathfinding/graph/dp/tree/string/geometry/lane)
    use-favorites.ts, recently-viewed.ts, use-media-query.ts  localStorage・メディアクエリ連携フック
  workers/
    algorithm-worker.ts 可視化のステップ列生成を実行するWeb Worker(単一インスタンスを使い回す設計)
scripts/
  verify-visualizations.mjs  可視化の正しさの検証
  verify-categories.mjs      frontmatterとCATEGORY_TAXONOMYの整合性検証
  category-stats.mjs         カテゴリ別の収録数・可視化対応数の集計
docs/
  design/               デザイン仕様・決定ログ
  progress.md           実装状況ノート(セッションごとの来歴)
  technical-guide.md    技術解説書(項目別リファレンス)
  architecture.md       アーキテクチャ図解(Mermaid記法)
  report.html           スタンドアロンHTML版サマリーレポート
```

## 現在の実装状況(サマリ)

- ✅ 収録758件・29カテゴリ(category→subcategoryの2階層)。各記事に概要・仕組み・特性/トレードオフ・実装例(Python/TypeScript中心)
- ✅ 可視化321件(42%)。9種のステップ再生kind(ソート/探索/経路探索/グラフ/DP/木/トライ/文字列/計算幾何)+同じ計算を3方式で並べるレーン比較。ステップ生成はWeb Worker
- ✅ 再生コントロール: 状態色のタイムライン(クリック・ドラッグで任意ステップへ)、速度切替、キーボード操作、累計カウンタ。巻き戻すと数値も同じ時点に戻る
- ✅ カタログ: 検索・カテゴリ/サブカテゴリ/可視化対応/お気に入りの絞り込み、リキッドタブ、モバイルのスタック表示、最近見た履歴
- ✅ 詳細ページ: コードのコピー、お気に入り、関連アルゴリズム
- ✅ アルゴリズム年表Atlas(`/atlas`): 時間軸/分野の輪の2ビュー。全項目に出典と生まれた目的
- ✅ ダーク/ライトのテーマ切替(可視化ステージは常にダーク)。発光は確定・比較中の状態色だけに限定
- ✅ 404ページ、比較画面、更新情報(RSS)、About、入門(/basics)
- ✅ CI(`.github/workflows/ci.yml`): lint → tsc → verify → verify:categories → build
- ⬜ 状態スナップショットのdiffベース記録・IndexedDBキャッシュ(未実装)
- ⬜ 音響・信号処理カテゴリの可視化(新しい可視化kindが前提)
- ⬜ 収録数1500件の目標に向けた拡充(現在758件)

過去の来歴(いつ何を追加したか)は [docs/progress.md](docs/progress.md) を参照。
