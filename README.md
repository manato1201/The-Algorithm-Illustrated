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

現時点ではNext.jsのスキャフォールド・デザインシステム・カタログ画面・アルゴリズム詳細ページ(ソート23種+配列探索26種+グリッド経路探索9種+グラフ49種(negamax/expectimax/iterative-deepening-minimax/stable-marriage-problem/push-relabel-max-flow/hierholzer-algorithm/two-sat/textrank/register-allocation-graph-coloring/de-bruijn-graph-assembly/suffix-automaton含む)+DP70種(hungarian-algorithmほか多数)+木構造6種(BST/AVL木/Treap/赤黒木/スプレー木/区間木)+トライ木2種(トライ木/Aho-Corasick法)+文字列パターンマッチング5種(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法/連長圧縮)の計190件が可視化対応、Web Worker経由)・比較画面(可視化グリッド付き)・更新情報(RSS)画面・Aboutページ・Markdownベースの実データモデル(367件、全24カテゴリ。category→subcategoryの2階層分類+カタログの絞り込みチップUI(可視化対応のみ絞り込みも含む)に対応、新設9カテゴリ計100件(ゲーム/数値計算/コンピュータビジョン/自然言語処理/コンパイラ・構文解析/バイオインフォマティクス/並行処理・並列アルゴリズム/スケジューリング/制御・ロボティクス)+深堀りバッチ1・2(既存カテゴリに計104件)を含む)が実装済み。アルゴリズム総数を10倍規模(約1600件超)に拡大する取り組みに着手済み(新カテゴリ追加フェーズは一区切り、以降は深堀り・可視化の2軸を反復)。さらに各記事へPython/TypeScript/C++/Rust/C#の5言語実装例(`## 実装例`セクション)を追加する取り組みにも着手済み(ソート8種完了)。詳細は [docs/progress.md](docs/progress.md) を参照。

## セットアップ

```bash
npm install
```

Node.js v20以降を推奨(動作確認環境: v22)。

## 実行・動作手順

| コマンド           | 内容                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `npm run dev`      | 開発サーバーを起動([http://localhost:3000](http://localhost:3000))                                                |
| `npm run build`    | 本番ビルドを作成                                                                                                  |
| `npm run start`    | `npm run build` 後、本番ビルドをローカルで起動                                                                    |
| `npm run lint`     | ESLintを実行                                                                                                      |
| `npm run verify`   | 可視化(190件)の正しさを独立実装のbrute-force・既知の正解値と突き合わせて検証(`scripts/verify-visualizations.mjs`) |
| `npx tsc --noEmit` | 型チェックのみ実行(ビルドなし)                                                                                    |

開発中の変更確認は `npm run dev` → ブラウザで `http://localhost:3000` を開く、が基本フロー。コードを変更するたびに以下を通しておくと安全:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

## プロジェクト構成

```
content/
  algorithms/           アルゴリズム記事(実データモデル本体)。<id>.md × 367件、frontmatter+Markdown本文
src/
  app/
    layout.tsx        ルートレイアウト。フォント読み込み+AppShellでラップ
    page.tsx           トップページ(カタログ画面を呼び出すだけ)
    globals.css         デザイントークン(:root)とベーススタイル
    algorithms/[id]/    アルゴリズム詳細ページ(動的ルート、367件を静的生成)
    compare/            比較画面(最大4件のアルゴリズムを並べて比較、可視化対応済みなら実行の可視化も並べて表示)
    updates/            更新情報画面(RSSフィードのカード表示)
    about/               Aboutページ
    api/updates/        更新情報画面向けのEdge Function BFF(RSS取得・整形)
  components/
    hud/                全画面共通のHUD装飾コンポーネント群(ナビゲーション含む)
    catalog/            カタログ画面(検索・カテゴリ別一覧)
    compare/            比較画面のUI(検索・選択・比較表)
    updates/            更新情報画面のフィード表示コンポーネント
    visualizer/          可視化コンポーネント一式。ソート17種+配列探索15種+グリッド経路探索4種+グラフ26種+DP33種+木構造6種+トライ木2種+文字列パターンマッチング4種+再生コントロール共通部品(useStepPlayer/PlaybackControls)+Web Worker連携フック(useWorkerFrames)+パーティクル演出(ParticleBurstLayer、pixi.js)+idから可視化コンポーネントを振り分ける共通ディスパッチャ(AlgorithmVisualizer、詳細ページ・比較画面の両方から使用)
  lib/
    design-tokens.ts    デザイントークンのTS版(Canvas/D3/Worker用)
    algorithm-categories.ts  カテゴリ→サブカテゴリの階層定義(CATEGORY_TAXONOMY)。カタログの絞り込みチップ・表示順の元データ
    content/algorithms.ts  content/algorithms/*.md の読み込みロジック(gray-matter + marked)
    sort-visualizers.ts    ソート17種のステップ列生成ロジック
    search-visualizers.ts  配列探索15種(線形/二分/三分/ジャンプ/補間/指数/フィボナッチ/カダンのアルゴリズム/エラトステネスの篩/フェニック木/ブルームフィルタ/山登り法/焼きなまし法/勾配降下法/k近傍法)のステップ列生成ロジック(フェニック木・ブルームフィルタはSearchFrame型のarray+highlightをビット配列/内部配列の表示に転用、山登り法・焼きなまし法・勾配降下法は数値の「地形」として同じ仕組みを再利用)
    pathfinding-visualizers.ts  BFS/DFS/ダイクストラ法/A*探索のステップ列生成ロジック(固定迷路+地形コスト)
    graph-visualizers.ts    グラフ26種(ベルマン・フォード法/プリム法/クラスカル法/トポロジカルソート/ボルーフカ法/Union-Find/Tarjanの強連結成分分解/Edmonds-Karp法/Dinic法/Ford-Fulkerson法/ホップクロフト・カープ法/カーンのアルゴリズム/ジョンソンのアルゴリズム/ハフマン符号化/フロイドの循環検出法/セグメント木/スキップリスト/PageRank/HITS/一貫性ハッシュ法/ブリー・アルゴリズム/二相コミット/Raft/Paxos/ベクタークロック/決定木)のステップ列生成ロジック(ノードリンク図。ホップクロフト・カープ法・一貫性ハッシュ法は専用レイアウト(左列/右列、リング状)、ハフマン符号化・セグメント木・スキップリスト・決定木はアルゴリズムの実行結果である木/グラフ構造を事前構築して固定レイアウトに使用、PageRank・HITSはGraphFrame.distancesフィールドをランクスコア表示に転用、分散システム系5種はedgeLabelsでメッセージ種別をフェーズごとに切り替える表現に統一)
    dp-visualizers.ts      DP33種(0-1ナップサック/LCS/編集距離/硬貨両替/棒の切り出し/部分和/LIS/最長回文部分列/フロイド-ワーシャル法/Sparse Table/行列連鎖乗算/卵落とし問題/最長共通部分文字列/区間スケジューリング/ユークリッドの互除法/拡張ユークリッドの互除法/繰り返し二乗法/ロシア農民の乗算法/中国剰余定理/ディフィー・ヘルマン鍵共有/ミラー・ラビン素数判定法/ポラードのロー法/カラツバ法/RSA暗号/ルーカス・レーマー・テスト/Baby-step Giant-step法/LRUキャッシュ/TF-IDF/BM25/RRF/パーセプトロン/誤差逆伝播法/ナイーブベイズ)のステップ列生成ロジック(古典的な2次元DPだけでなく、数論アルゴリズムの反復列・LRUキャッシュのキー順序・情報検索のスコア表・機械学習の重み更新表等も「値が段階的に埋まっていく表」として汎用的に表示)
    tree-visualizers.ts    木構造6種(二分探索木/AVL木/Treap/赤黒木/スプレー木/区間木)のステップ列生成ロジック(挿入シーケンス+回転。区間木のみTreeNode型にhi/maxHighのoptionalフィールドを追加)
    trie-visualizer.ts      トライ木/Aho-Corasick法のステップ列生成ロジック(多分木、children-first集約レイアウト。Aho-Corasick法は失敗リンクのBFS構築+テキスト走査での複数パターン同時検出を追加)
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
- ✅ カタログ画面(検索・カテゴリ/サブカテゴリ絞り込みチップ・可視化対応のみ絞り込み、367件)
- ✅ アルゴリズム詳細ページ(367件を静的生成。可視化はソート23種+配列探索26種+グリッド経路探索9種+グラフ49種(negamax/expectimax/iterative-deepening-minimax/stable-marriage-problem/push-relabel-max-flow/hierholzer-algorithm/two-sat/textrank/register-allocation-graph-coloring/de-bruijn-graph-assembly/suffix-automaton含む)+DP70種(hungarian-algorithm含む)+木構造6種(二分探索木/AVL木/Treap/赤黒木/スプレー木/区間木)+トライ木2種(トライ木/Aho-Corasick法)+文字列パターンマッチング5種(KMP法/ラビン-カープ法/Z algorithm/ボイヤー・ムーア法/連長圧縮)の計190件、他177件は準備中表示)
- ✅ 可視化のステップ列生成をWeb Worker化(algorithm-worker.ts、単一Workerを使い回す設計)
- ✅ Markdownベースの実データモデル(content/algorithms/)。全24カテゴリ・367件全てで概要・仕組み・特性トレードオフを充実化済み(デザインパターン(GoF23種)、新設9カテゴリ計100件、深堀りバッチ1・2(既存カテゴリに計104件)を含めて完了)。category→subcategoryの2階層分類(CATEGORY_TAXONOMY)に対応
- ✅ 比較画面(/compare、選択したアルゴリズムのうち可視化対応済みのものは実行の可視化も並べて表示)・更新情報(RSS)画面(/updates + /api/updates)・Aboutページ(/about)
- ✅ Vercel Edge Functions(BFF、/api/updatesでQiita人気記事フィードを中継)
- ✅ pixi.js(WebGL)によるパーティクル演出(ソート可視化の交換/確定イベント)
- ⬜ 状態スナップショットのdiffベース記録・IndexedDBキャッシュ(Event Sourcing的な差分記録は未実装)
- ⬜ 残りアルゴリズム(177件)の可視化拡張(2026-07-14に42件追加(数論・暗号7件/数値計算・線形代数12件/配列アラインメントDP4件/系列タグ付けDP4件/区間・ナップサックDP3件/ゲーム木3件/グラフ系9件)、148件→190件。次の候補: 分散・並行処理17件(dining-philosophers等10件+lock-free-stack-cas等7件)、スケジューリング14件、データ構造・文字列圧縮13件、系統樹3件。デザインパターン23件・計算幾何7件・機械学習の多次元手法4件等は新規2Dコンポーネントが必要なため引き続き優先度低)
- ⬜ アルゴリズム数を10倍規模(約1600件超)に拡大(課題a、着手済み・367件。新カテゴリ追加フェーズ(全24カテゴリ)は一区切り、深堀りバッチ1・2(既存カテゴリに計104件)完了、デザインパターンを除く23カテゴリ全てに最低1回は深堀りが入った。以降は既存カテゴリの深堀り2巡目と可視化(課題b)の2軸を反復。詳細は[docs/progress.md](docs/progress.md)のロードマップ参照)
- ⬜ 各アルゴリズム記事に`## 実装例`(Python/TypeScript/C++/Rust/C#の5言語)を追加(課題d、2026-07-14着手)。可視化対応済み190件から順に着手し、ソート8種(40スニペット)完了・残り182件。Python/TypeScript/C#は実行検証、C++/Rustはコンパイラ未インストールのため手動レビューのみ(既知の制約)
- ⬜ モーション停止ボタンUI、比較画面の特性トレードオフ深掘り

詳細・既知の制約は [docs/progress.md](docs/progress.md) を参照。
