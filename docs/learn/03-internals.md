# 3. 内側のしくみ

講義(第 1〜5 回)で扱った「フレーム」「独立した検証」「登録表と分類」「擬似コードと状態色」「入力の前提と乱数」は、繰り返しません。ここでは、**講義に出ない部分**を読みます。

## 可視化の種類と描画

| 種類(レジストリ) | 題材 | 描画 |
|---|---|---|
| `SORT_VISUALIZERS` | ソート | 棒グラフ + 状態色 |
| `SEARCH_VISUALIZERS`・`BAR_VISUALIZERS` | 探索・数値の列 | 棒グラフ(`SearchFrame`) |
| `PATHFINDING_VISUALIZERS` | 経路探索 | Canvas |
| `GRAPH_VISUALIZERS`・`TREE_VISUALIZERS`・`TRIE_VISUALIZERS` | グラフ・木・トライ | Canvas |
| `DP_VISUALIZERS` | 動的計画法 | HTML + CSS(テーブル) |
| `STRING_VISUALIZERS` | 文字列照合 | HTML + CSS |
| `GEOMETRY_VISUALIZERS` | 計算幾何 | Canvas |
| `LANE_VISUALIZERS` | 3 方式のレーン比較 | HTML + CSS |
| `SIGNAL_VISUALIZERS` | 波形・スペクトル・時系列 | パネル |
| `SCENE3D_VISUALIZERS` | 3 次元(曲面・球面・流れ・視錐台・点群) | three.js(他のページには読み込まない) |

- **棒グラフ + 状態色**で足りる題材は、新しい種類を作らず、`SearchFrame` を返す関数を書いて `BAR_GROUPS` に登録する(hasVisualizer・Worker・描画・集計が自動で対応する)。
- **時刻を 1 つずつ進める時系列**(制御・補間・オプティマイザの値)は、信号の種類のパネル列で書く(`seriesFrames`)。
- 粒子の演出(`ParticleBurstLayer`・pixi.js / WebGL)は、状態が「確定」したときの演出。

## 書き写している 4 か所

新しい**種類**(レジストリ)を作るときは、次の 4 か所に**同じ内容**を足す(`AGENTS.md` にも書いてある)。

| 場所 | 足すもの |
|---|---|
| `src/lib/has-visualizer.ts` | `id in 新しい表` |
| `src/workers/algorithm-worker.ts` | `WorkerRequest` の種類と、呼び出し |
| `src/components/visualizer/AlgorithmVisualizer.tsx` | 種類に対応する描画 |
| `scripts/category-stats.mjs` | 集計の判定(`has-visualizer.ts` と**同じ判定を書き写している**) |

さらに、再生コントロールのために、`step-timeline.ts` に**フレームから「ステップごとの状態種別」を求めるアダプタ**を足す。**足し忘れが起きやすい**ので、新しい種類を作る前に、**既存の種類で足りないか**を考える。

## 検証(`verify-visualizations.mjs`)の書き方

- 先頭のコメントに、**運用の方針**(使い捨ての検証を積み上げ式にした理由)が書いてある。
- 各ブロックは、「**①独立に実装した参照計算・総当たり・既知の正解値と比べる**」か「**②既存の別アルゴリズムの結果と突き合わせる**」。難しいもの(プロトコルのシミュレーションなど)は、**最低限、クラッシュしない・フレーム列が壊れていない**ことだけ、全件に当てる。
- 結果は「N 件成功 / M 件失敗」。**失敗が 1 件でもあれば、終了コードで落とす**。
- 新しいバッチを足すたびに、**検証のブロックを追記する**。

## 記事の読み込み

`src/lib/content/algorithms.ts`(gray-matter + marked)。**本文の HTML は、リポジトリの中の信頼できる Markdown** を変換したもの。詳細ページでは、「特性・トレードオフ」は開、「実装例」は閉のアコーディオン。見出しは**前方一致**で扱う(`## 実装例(Lomuto分割方式)` など)。

## 依存の地図・年表

- 依存の地図(`dependency-map.ts`): **記事本文のリンク**から、つながりを読み取る(「前提」とは断定しない)。
- 年表 Atlas(`atlas-format.ts`): `milestones.json`。**出典と「生まれた目的」が必須**。

## 更新情報

`/api/updates` は、外部の RSS を **Edge Function** で取得・整形して返す(BFF)。外部のフィードが落ちると、更新情報の画面だけが影響を受ける。
