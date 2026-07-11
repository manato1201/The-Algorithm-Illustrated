# The-Algorithm-Illustrated

状態分離型 インタラクティブ・アルゴリズム図鑑 — アルゴリズムがどのような目的で生まれ、どう動くのかを可視化・時間巻き戻し可能な形で学べる学習ダッシュボード。速さを競うランキングではなく、なぜ生まれ・どう動き・どこで報われるのかを理解することを目的とする。

## ドキュメント

| ドキュメント                                           | 内容                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [docs/design/ui-design.md](docs/design/ui-design.md)   | UI/デザインシステム仕様(ダーク×発光/サイバーHUDトーン、デザイントークン、画面構成) |
| [docs/design/design-log.md](docs/design/design-log.md) | デザイン方向の決定ログ(反復防止用)                                                 |
| [docs/progress.md](docs/progress.md)                   | 実装状況ノート(何が実装済みで何がプレースホルダか、次にやること)                   |

## 技術スタック

- **フロントエンド**: Next.js (App Router + TypeScript)
- **ホスティング/BFF**: Vercel(Edge Functionsで外部RSS/API中継、未実装)
- **並列処理**: Web Workers(可視化のステップ列生成に導入済み。状態のdiffベース記録は未実装)
- **描画**: Canvas API(ソート・経路探索)、HTML+CSSトランジション(DPテーブル)
- **状態キャッシュ**: IndexedDB(未実装)

現時点ではNext.jsのスキャフォールド・デザインシステム・カタログ画面・アルゴリズム詳細ページ(ソート6種+経路探索3種(BFS/DFS/ダイクストラ法)+DP1種が可視化対応、Web Worker経由)・Markdownベースの実データモデル(163件)が実装済み。詳細は [docs/progress.md](docs/progress.md) を参照。

## セットアップ

```bash
npm install
```

Node.js v20以降を推奨(動作確認環境: v22)。

## 実行・動作手順

| コマンド           | 内容                                                               |
| ------------------ | ------------------------------------------------------------------ |
| `npm run dev`      | 開発サーバーを起動([http://localhost:3000](http://localhost:3000)) |
| `npm run build`    | 本番ビルドを作成                                                   |
| `npm run start`    | `npm run build` 後、本番ビルドをローカルで起動                     |
| `npm run lint`     | ESLintを実行                                                       |
| `npx tsc --noEmit` | 型チェックのみ実行(ビルドなし)                                     |

開発中の変更確認は `npm run dev` → ブラウザで `http://localhost:3000` を開く、が基本フロー。コードを変更するたびに以下を通しておくと安全:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

## プロジェクト構成

```
content/
  algorithms/           アルゴリズム記事(実データモデル本体)。<id>.md × 163件、frontmatter+Markdown本文
src/
  app/
    layout.tsx        ルートレイアウト。フォント読み込み+AppShellでラップ
    page.tsx           トップページ(カタログ画面を呼び出すだけ)
    globals.css         デザイントークン(:root)とベーススタイル
    algorithms/[id]/    アルゴリズム詳細ページ(動的ルート、163件を静的生成)
  components/
    hud/                全画面共通のHUD装飾コンポーネント群
    catalog/            カタログ画面(検索・カテゴリ別一覧)
    visualizer/          可視化コンポーネント一式。ソート6種+経路探索3種(BFS/DFS/ダイクストラ法)+DP1種+再生コントロール共通部品(useStepPlayer/PlaybackControls)+Web Worker連携フック(useWorkerFrames)
  lib/
    design-tokens.ts    デザイントークンのTS版(Canvas/D3/Worker用)
    algorithm-categories.ts  カタログのカテゴリ表示順
    content/algorithms.ts  content/algorithms/*.md の読み込みロジック(gray-matter + marked)
    sort-visualizers.ts    ソートのステップ列生成ロジック
    pathfinding-visualizers.ts  BFS/DFS/ダイクストラ法のステップ列生成ロジック(固定迷路+地形コスト)
    dp-visualizers.ts      DP(0-1ナップサック)のステップ列生成ロジック
  workers/
    algorithm-worker.ts  可視化のステップ列生成を実行するWeb Worker
docs/
  design/               デザイン仕様・決定ログ
  progress.md            実装状況ノート
web-production-skill/    参考にしたClaude Codeスキル一式(gitignore対象、pushされない)
```

## 現在の実装状況(サマリ)

- ✅ Next.jsプロジェクトのスキャフォールド、デザイントークン、フォント設定
- ✅ HUD共通コンポーネント(コーナーブラケット・ステータスチップ・ライブ時計・ログフィード等)
- ✅ カタログ画面(検索・カテゴリ別一覧、163件)
- ✅ アルゴリズム詳細ページ(163件を静的生成。可視化はソート6種(バブル/選択/挿入/マージ/ヒープ/クイック)+経路探索3種(BFS/DFS/ダイクストラ法)+DP1種(0-1ナップサック)、他153件は準備中表示)
- ✅ 可視化のステップ列生成をWeb Worker化(algorithm-worker.ts)
- ✅ Markdownベースの実データモデル(content/algorithms/)。ソート・探索の2カテゴリ(計28件)は概要・仕組み・特性トレードオフを充実化済み、残り13カテゴリ128件は簡易生成のまま
- ⬜ 比較画面・更新情報(RSS)画面
- ⬜ 状態スナップショットのdiffベース記録・IndexedDBキャッシュ(Event Sourcing的な差分記録は未実装)
- ⬜ Vercel Edge Functions(BFF)
- ⬜ 残り13カテゴリ128件のコンテンツ充実化
- ⬜ 残りアルゴリズムの可視化拡張、three.js/pixi.js等によるショーケース級演出

詳細・既知の制約は [docs/progress.md](docs/progress.md) を参照。
