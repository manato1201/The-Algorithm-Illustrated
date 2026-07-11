# The-Algorithm-Illustrated

状態分離型 インタラクティブ・アルゴリズム図鑑 — アルゴリズムがどのような目的で生まれ、どう動くのかを可視化・時間巻き戻し可能な形で学べる学習ダッシュボード。速さを競うランキングではなく、なぜ生まれ・どう動き・どこで報われるのかを理解することを目的とする。

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/design/ui-design.md](docs/design/ui-design.md) | UI/デザインシステム仕様(ダーク×発光/サイバーHUDトーン、デザイントークン、画面構成) |
| [docs/design/design-log.md](docs/design/design-log.md) | デザイン方向の決定ログ(反復防止用) |
| [docs/progress.md](docs/progress.md) | 実装状況ノート(何が実装済みで何がプレースホルダか、次にやること) |

## 技術スタック

- **フロントエンド**: Next.js (App Router + TypeScript)
- **ホスティング/BFF**: Vercel(Edge Functionsで外部RSS/API中継、未実装)
- **並列処理**: Web Workers(アルゴリズム実行、未実装)
- **描画**: D3.js または Canvas API(未実装)
- **状態キャッシュ**: IndexedDB(未実装)

現時点ではNext.jsのスキャフォールド・デザインシステム・カタログ画面・アルゴリズム詳細ページ(ソートのみ可視化対応)が実装済み。詳細は [docs/progress.md](docs/progress.md) を参照。

## セットアップ

```bash
npm install
```

Node.js v20以降を推奨(動作確認環境: v22)。

## 実行・動作手順

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバーを起動([http://localhost:3000](http://localhost:3000)) |
| `npm run build` | 本番ビルドを作成 |
| `npm run start` | `npm run build` 後、本番ビルドをローカルで起動 |
| `npm run lint` | ESLintを実行 |
| `npx tsc --noEmit` | 型チェックのみ実行(ビルドなし) |

開発中の変更確認は `npm run dev` → ブラウザで `http://localhost:3000` を開く、が基本フロー。コードを変更するたびに以下を通しておくと安全:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

## プロジェクト構成

```
src/
  app/
    layout.tsx        ルートレイアウト。フォント読み込み+AppShellでラップ
    page.tsx           トップページ(カタログ画面を呼び出すだけ)
    globals.css         デザイントークン(:root)とベーススタイル
    algorithms/[id]/    アルゴリズム詳細ページ(動的ルート、163件を静的生成)
  components/
    hud/                全画面共通のHUD装飾コンポーネント群
    catalog/            カタログ画面(検索・カテゴリ別一覧)
    visualizer/          ソート可視化(Canvas 2D、バブルソート・クイックソートのみ対応)
  lib/
    design-tokens.ts    デザイントークンのTS版(Canvas/D3/Worker用)
    sample-algorithms.ts  アルゴリズムの仮データ(163件)
    sort-visualizers.ts    ソートのステップ列生成ロジック
docs/
  design/               デザイン仕様・決定ログ
  progress.md            実装状況ノート
web-production-skill/    参考にしたClaude Codeスキル一式(gitignore対象、pushされない)
```

## 現在の実装状況(サマリ)

- ✅ Next.jsプロジェクトのスキャフォールド、デザイントークン、フォント設定
- ✅ HUD共通コンポーネント(コーナーブラケット・ステータスチップ・ライブ時計・ログフィード等)
- ✅ カタログ画面(検索・カテゴリ別一覧、仮データ163件)
- ✅ アルゴリズム詳細ページ(163件を静的生成。可視化はバブルソート・クイックソートのみ対応、他は準備中表示)
- ⬜ 比較画面・更新情報(RSS)画面
- ⬜ Web Worker上での状態スナップショット/diff記録・IndexedDBキャッシュ(現状のソート可視化はクライアント側の簡易実装で代用)
- ⬜ Vercel Edge Functions(BFF)
- ⬜ 実データモデルへの置き換え(現状はsample-algorithms.tsの仮データ)
- ⬜ ソート以外の可視化ロジック、three.js/pixi.js等によるショーケース級演出

詳細・既知の制約は [docs/progress.md](docs/progress.md) を参照。
