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
- **ホスティング/BFF**: Vercel(Edge Functionsで外部RSSを中継。`/api/updates`で実装済み)
- **並列処理**: Web Workers(可視化のステップ列生成に導入済み、単一Workerを使い回す設計。状態のdiffベース記録は未実装)
- **描画**: Canvas API(ソート・経路探索・グラフ・木構造)、HTML+CSSトランジション(DPテーブル)、pixi.js/WebGL(ソート可視化のパーティクル演出)
- **状態キャッシュ**: IndexedDB(未実装)

現時点ではNext.jsのスキャフォールド・デザインシステム・カタログ画面・アルゴリズム詳細ページ(ソート17種+配列探索7種+グリッド経路探索4種(BFS/DFS/ダイクストラ法/A*探索)+グラフ7種+DP12種+木構造4種(BST/AVL木/Treap/赤黒木)+トライ木+文字列パターンマッチング4種(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法)の計56件が可視化対応、Web Worker経由)・比較画面(可視化グリッド付き)・更新情報(RSS)画面・Aboutページ・Markdownベースの実データモデル(163件、全15カテゴリのコンテンツ充実化完了)が実装済み。詳細は [docs/progress.md](docs/progress.md) を参照。

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
    compare/            比較画面(最大4件のアルゴリズムを並べて比較、可視化対応済みなら実行の可視化も並べて表示)
    updates/            更新情報画面(RSSフィードのカード表示)
    about/               Aboutページ
    api/updates/        更新情報画面向けのEdge Function BFF(RSS取得・整形)
  components/
    hud/                全画面共通のHUD装飾コンポーネント群(ナビゲーション含む)
    catalog/            カタログ画面(検索・カテゴリ別一覧)
    compare/            比較画面のUI(検索・選択・比較表)
    updates/            更新情報画面のフィード表示コンポーネント
    visualizer/          可視化コンポーネント一式。ソート17種+配列探索7種+グリッド経路探索4種+グラフ7種+DP12種+木構造4種+トライ木+文字列パターンマッチング4種+再生コントロール共通部品(useStepPlayer/PlaybackControls)+Web Worker連携フック(useWorkerFrames)+パーティクル演出(ParticleBurstLayer、pixi.js)+idから可視化コンポーネントを振り分ける共通ディスパッチャ(AlgorithmVisualizer、詳細ページ・比較画面の両方から使用)
  lib/
    design-tokens.ts    デザイントークンのTS版(Canvas/D3/Worker用)
    algorithm-categories.ts  カタログのカテゴリ表示順
    content/algorithms.ts  content/algorithms/*.md の読み込みロジック(gray-matter + marked)
    sort-visualizers.ts    ソート17種のステップ列生成ロジック
    search-visualizers.ts  配列探索7種(線形/二分/三分/ジャンプ/補間/指数/フィボナッチ)のステップ列生成ロジック
    pathfinding-visualizers.ts  BFS/DFS/ダイクストラ法/A*探索のステップ列生成ロジック(固定迷路+地形コスト)
    graph-visualizers.ts    グラフ7種(ベルマン・フォード法/プリム法/クラスカル法/トポロジカルソート/ボルーフカ法/Union-Find/Tarjanの強連結成分分解)のステップ列生成ロジック(ノードリンク図)
    dp-visualizers.ts      DP12種(0-1ナップサック/LCS/編集距離/硬貨両替/棒の切り出し/部分和/LIS/最長回文部分列/フロイド-ワーシャル法/Sparse Table/行列連鎖乗算/卵落とし問題)のステップ列生成ロジック
    tree-visualizers.ts    木構造4種(二分探索木/AVL木/Treap/赤黒木)のステップ列生成ロジック(挿入シーケンス+回転)
    trie-visualizer.ts      トライ木のステップ列生成ロジック(多分木、children-first集約レイアウト)
    string-visualizers.ts  文字列パターンマッチング4種(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法)のステップ列生成ロジック
    updates.ts              更新情報画面向けのRSS取得・パース処理(api/updates/route.tsから呼ばれる)
  workers/
    algorithm-worker.ts  可視化のステップ列生成を実行するWeb Worker(単一インスタンスを使い回す設計)
docs/
  design/               デザイン仕様・決定ログ
  progress.md            実装状況ノート
web-production-skill/    参考にしたClaude Codeスキル一式(gitignore対象、pushされない)
```

## 現在の実装状況(サマリ)

- ✅ Next.jsプロジェクトのスキャフォールド、デザイントークン、フォント設定
- ✅ HUD共通コンポーネント(コーナーブラケット・ステータスチップ・ライブ時計・ログフィード・ナビゲーション等)
- ✅ カタログ画面(検索・カテゴリ別一覧、163件)
- ✅ アルゴリズム詳細ページ(163件を静的生成。可視化はソート17種+配列探索7種+グリッド経路探索4種(BFS/DFS/ダイクストラ法/A*探索)+グラフ7種(ベルマン・フォード法/プリム法/クラスカル法/トポロジカルソート/ボルーフカ法/Union-Find/Tarjanの強連結成分分解)+DP12種+木構造4種(二分探索木/AVL木/Treap/赤黒木)+トライ木+文字列パターンマッチング4種(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法)の計56件、他107件は準備中表示)
- ✅ 可視化のステップ列生成をWeb Worker化(algorithm-worker.ts、単一Workerを使い回す設計)
- ✅ Markdownベースの実データモデル(content/algorithms/)。全15カテゴリ・163件全てで概要・仕組み・特性トレードオフを充実化済み(デザインパターン(GoF23種)を含めて完了)
- ✅ 比較画面(/compare、選択したアルゴリズムのうち可視化対応済みのものは実行の可視化も並べて表示)・更新情報(RSS)画面(/updates + /api/updates)・Aboutページ(/about)
- ✅ Vercel Edge Functions(BFF、/api/updatesでQiita人気記事フィードを中継)
- ✅ pixi.js(WebGL)によるパーティクル演出(ソート可視化の交換/確定イベント)
- ⬜ 状態スナップショットのdiffベース記録・IndexedDBキャッシュ(Event Sourcing的な差分記録は未実装)
- ⬜ 残りアルゴリズム(107件)の可視化拡張(データ構造カテゴリは16件中5件、文字列カテゴリは11件中4件のみ対応)、アルゴリズム数の10倍化(次フェーズの計画中)、モーション停止ボタンUI、比較画面の特性トレードオフ深掘り

詳細・既知の制約は [docs/progress.md](docs/progress.md) を参照。
