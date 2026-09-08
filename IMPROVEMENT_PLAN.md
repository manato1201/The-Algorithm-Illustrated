# The-Algorithm-Illustrated 改善・リファクタリング計画書

**改善指標: 収録カテゴリの拡充と検索性・保守自動化の強化**
作成日: 2026-08-11 / 調査範囲: `content/algorithms/*.md`(367件・24カテゴリ)、Next.js 16.2.10(React 19.2.4 / App Router / 静的生成)

## 進捗状況(2026-09-09更新)

作成時(367件・24カテゴリ)から現在(754件・29カテゴリ)まで進んだ状態での棚卸し。Phase 0の数値は作成時点のまま残すが、各Phaseの実装状況は以下の通り。

| Phase | 状態 | 備考 |
|---|---|---|
| 1. グリッド化 | ✅ 完了 | `AlgorithmCatalog.module.css`の`.listItems`は`repeat(auto-fill, minmax(22rem, 1fr))`のグリッド、`.listRow`はカード境界+ホバーglow済み |
| 2. 新カテゴリ追加(5カテゴリ) | ✅ 完了 | 音響・信号処理/ゲーム競技プログラミング/キャラクターAI・空間AI/強化学習/CG・3Dレンダリングとも`CATEGORY_TAXONOMY`に登録済み |
| 3. CI/CD導入 | ✅ 完了 | `.github/workflows/ci.yml`(lint→tsc→verify→verify:categories→build)、`scripts/verify-categories.mjs`とも稼働中 |
| 4. 可視化カバレッジ拡大 | 🔶 一部完了 | 全体243/754件(約32%)。Phase2新設5カテゴリの内訳: キャラクターAI・空間AI 16/24、ゲーム/競技プログラミング 6/24、CG・3Dレンダリング 5/23、強化学習 1/24、**音響・信号処理 0/25(未着手)**。音響系は既存9種の可視化kindでは自然に表現できず(波形/スペクトログラム表示という新kindが要る)、着手見送りが妥当 |
| 5. UI/アニメーション強化(リキッドタブ+スタックブラウザ) | ✅ 完了 | `.chipIndicator`(カテゴリチップの液体的ハイライト移動)と`AlgorithmStackBrowser.tsx`(モバイル640px未満限定のスワイプ閲覧、トグルで切替)を実装 |

**残タスク**: Phase 4の強化学習(1/24)・CG・3Dレンダリング(5/23)・ゲーム/競技プログラミング(6/24)は伸びしろが大きい。音響・信号処理は新規可視化kind(波形/スペクトログラム)が前提になるため別途スコープを切るべき。

---

## Phase 0: 現状分析(調査済み)

### スタックとコンテンツモデル
- Next.js 16.2.10 + React 19.2.4 + TypeScript。依存は`next`/`react`/`gray-matter`/`marked`/`pixi.js`(可視化canvas描画)の5点のみ。パッケージマネージャは`package-lock.json`からnpm(pnpmではない)。
- コンテンツは`content/algorithms/*.md`にフラットに367ファイル。frontmatterは`name`/`category`/`subcategory`/`complexity`/`summary`の5項目固定(`src/lib/content/algorithms.ts`の`AlgorithmFrontmatter`型)。本文は`## 概要` / `## 仕組み` / `## 特性・トレードオフ` / `## 実装例`の4見出し構成。
- `src/lib/content/algorithms.ts`(102行)がNode `fs` + `gray-matter` + `marked`でビルド時ロードする(`getAllAlgorithmsMeta` / `getAlgorithmDetail`)。**`hasVisualizer`はfrontmatterの項目ではない。** `src/lib/has-visualizer.ts`がアルゴリズムidを9本の`*_VISUALIZERS`レジストリ(`SORT`/`PATHFINDING`/`DP`/`GRAPH`/`SEARCH`/`TREE`/`STRING`/`TRIE`/`GEOMETRY`、各`src/lib/*-visualizers.ts`)に対し`in`演算子で照合し、ビルド時に真偽値を計算する。367件中241件が可視化対応。

### カテゴリ階層: CATEGORY_TAXONOMY一元管理
`src/lib/algorithm-categories.ts`の`CATEGORY_TAXONOMY`配列がカテゴリ階層の単一の情報源(24カテゴリ、各1〜4サブカテゴリ)。`CATEGORY_ORDER`/`SUBCATEGORIES_BY_CATEGORY`はこの配列からの導出値であり、配列コメント自身に「新カテゴリ・新サブカテゴリの追加はこの配列への追記だけで完結する」と明記されている。

`docs/progress.md`(206KB、2026-07-13時点の記録)には「新カテゴリ追加フェーズは一区切り(全24カテゴリ、ロードマップに挙げていた候補は出し尽くした)」との記載がある。ただし同記録は「協力ゲーム理論・量子計算基礎」等の局所的な追加候補が残る一方、深堀り(既存サブカテゴリ内のバリエーション追加)と可視化対応を優先する運用判断だったことも示している。本計画のPhase 2で扱う音響・ゲームAI/空間AI・CG/レンダリング系は、この「出し尽くした」候補リストに含まれていなかった未開拓領域であり、既存の優先順位判断を覆すものではなく空白地帯を埋める提案として位置づける。

### カタログUIの絞り込み結果レイアウト
`src/app/page.tsx`が`src/components/catalog/AlgorithmCatalog.tsx`(347行)+`AlgorithmCatalog.module.css`(361行)を描画。自由テキスト検索+カテゴリ/サブカテゴリ絞り込みチップ+「可視化対応のみ」チップは実装済みで、コード内コメント(L18-23)に「1600件規模を見据え、カテゴリ単体での絞り込みだけでも一覧を発見しやすくする」設計意図が明記されている。絞り込み結果表示部の`isFiltering`分岐(L245-265)は`<ul className={styles.listItems}>`の`<li className={styles.listRow}>`(`AlgorithmRow`ヘルパー、L315-337)で描画するが、`.listItems`(CSS L306-309)/`.listRow`(L311-314)に`grid-template-columns`は存在せず単一列の素朴なリスト。絞り込みなし時の`groupedByCategory`(L118-132、カテゴリ別セクション表示・L291-308)も同じ`.listItems`/`AlgorithmRow`を共有する。なお同プロジェクト内の`UpdatesFeed.module.css`は`display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));`という既存グリッドパターンを既に持っている。

### CI/CDと検証体制
`.github`ディレクトリ自体が存在せず、CI/CDは皆無。`package.json`の`scripts`に`lint`(`eslint`)・`build`(`next build`)・`verify`(`node --experimental-strip-types scripts/verify-visualizations.mjs`、1346行)はあるが、いずれも手元実行任せで自動実行の仕組みがない。`AGENTS.md`には「これはあなたの知っているNext.jsではない、`node_modules/next/dist/docs/`を読んでから書け」という破壊的変更への注記があり、CIなしでビルドが壊れても気づく手段がない状態が続いている。463トラックファイル、活発な日本語コミット履歴。

### アンチパターン(全フェーズ共通)
- 新カテゴリ・新サブカテゴリの追加は`CATEGORY_TAXONOMY`への追記のみで完結する設計。それ以外の場所(コンポーネント側の決め打ち配列など)にカテゴリ一覧を重複させない。
- Next.js 16の挙動を旧バージョンの知識で推測実装しない。`AGENTS.md`の指示通り`node_modules/next/dist/docs/`を確認してから着手する。
- `hasVisualizer`をfrontmatterに書き込もうとしない。frontmatterに書くのは`name`/`category`/`subcategory`/`complexity`/`summary`の5項目のみで、可視化対応は`*-visualizers.ts`のレジストリキー登録で表現する。
- デザインパターン(GoF23種)は「実行状態の時系列可視化」という本プロジェクトの可視化の枠組みに構造的に馴染まないという既存の作業判断がある。新規カテゴリでも「動きが本質を説明しない」ものを無理に可視化対象へ含めない。

---

## Phase 1: カタログ結果一覧のグリッド化(最優先・検索性改善)

**現状:** `.listItems`/`.listRow`はグリッドを一切使わない単一列`<ul>/<li>`(Phase 0参照)。367件規模の絞り込み結果でも、複雑度バッジ・可視化バッジ・要約文が縦一列に並ぶため視認性が落ちる。

**実装内容:**
1. `.listItems`をレスポンシブグリッド化する。`UpdatesFeed.module.css`の`repeat(auto-fill, minmax(...), 1fr)`パターンを踏襲しつつ、一覧行は要約文を含みカードより情報密度が高いため、より広めのminmaxで2〜3列に収める。
   ```css
   /* AlgorithmCatalog.module.css */
   .listItems {
     list-style: none;
     border-top: 1px solid var(--color-line);
     display: grid;
     grid-template-columns: 1fr; /* モバイル: 1列 */
     gap: var(--space-4);
     padding-top: var(--space-4);
   }

   @media (min-width: 640px) {
     .listItems {
       grid-template-columns: repeat(2, 1fr); /* タブレット: 2列 */
     }
   }

   @media (min-width: 1024px) {
     .listItems {
       /* auto-fillで367件+将来1600件でも列数が可変に追従する */
       grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
     }
   }
   ```
2. `AlgorithmRow`(L315-337)をカード化する。`.listRow`の`border-bottom`区切り(横一列前提)を`border: 1px solid var(--color-line); border-radius: 8px; padding: var(--space-4);`のカード境界に置き換え、`.featuredCard`(L226-241)のホバー/フォーカス時の`border-color: var(--color-accent-amber); box-shadow: var(--glow-amber);`パターンを流用して一貫性を保つ。
3. `groupedByCategory`(L118-132)のカテゴリ別セクション構造自体は維持し、各`categoryGroup`内の`.listItems`だけをグリッド化する。カテゴリ見出し(`categoryHeading`)の縦積みレイアウトは変更しない。
4. `isFiltering`分岐の両側(絞り込み結果 L245-265、Featured+Index表示 L291-308)は同じ`.listItems`/`AlgorithmRow`を共有するため、CSS変更1箇所で両方に反映される。ただし絞り込み結果側は`showCategory`が`true`(L260)でカテゴリラベルが追加表示される分、カード内の情報量が増える点を目視確認する。

**検証チェックリスト:**
- [ ] 367件の絞り込み結果(例: カテゴリ「ゲーム」)でグリッドが3列→2列→1列にブレークポイント通り追従する
- [ ] `groupedByCategory`側(Featured+Index表示)でもカテゴリ見出しの縦構造を保ったままグリッド化されている
- [ ] `AlgorithmRow`カード化後も`showCategory`分岐(絞り込み結果のみカテゴリラベル表示)が崩れていない
- [ ] キーボードフォーカス(`focus-visible`)がグリッド内でも自然なTab順で移動する
- [ ] `prefers-reduced-motion`環境でホバートランジションが`.featuredCard`同様に無効化される

---

## Phase 2: 新カテゴリ追加(音響・ゲームAI・CG/レンダリング等)

**方針:** `CATEGORY_TAXONOMY`への追記のみで完結させる設計を厳守する(Phase 0参照)。音響・信号処理系、ゲーム/競技プログラミング系、キャラクターAI/空間AI/メタAI、強化学習、CG/3Dレンダリング系を一括りにせず、既存24カテゴリの粒度(1カテゴリ=2〜4サブカテゴリ)に合わせてサブカテゴリで整理する。

**実装内容:**
1. `src/lib/algorithm-categories.ts`の`CATEGORY_TAXONOMY`配列末尾に5カテゴリを追記する。
   ```typescript
   export const CATEGORY_TAXONOMY = [
     // ...既存24カテゴリ(変更しない)...
     {
       category: "音響・信号処理",
       subcategories: ["音声合成・分析", "音響効果・DSP", "オーディオ圧縮・符号化"],
     },
     {
       category: "ゲーム/競技プログラミング",
       subcategories: ["競技プログラミング典型", "ゲームバランス・乱数制御"],
     },
     {
       category: "キャラクターAI・空間AI",
       subcategories: ["ビヘイビア制御", "空間認識・知覚", "群衆・マルチエージェント", "メタAI・ペーシング制御"],
     },
     {
       category: "強化学習",
       subcategories: ["価値ベース手法", "方策勾配法", "モデルベース・探索"],
     },
     {
       category: "CG・3Dレンダリング",
       subcategories: [
         "ジオメトリ処理",             // スキニング、LOD
         "可視性・最適化",             // カリング、オクルージョン、VRS(Variable Rate Shading)
         "ライティング・シェーディング", // DDGI、ライティング全般、ブルーム、バンディング/ディザリング対策
         "アニメーション",             // スケルタルアニメーション、VAT(Vertex Animation Texture)
       ],
     },
   ] as const;
   ```
   既存の「ゲーム」カテゴリ(ゲームAI・意思決定/手続き型コンテンツ生成/数理ゲーム理論)への無秩序な追記を避け、「キャラクターAI・空間AI」「ゲーム/競技プログラミング」を独立カテゴリとして切り出す。
   **粒度の不一致に関する注記:** 既存`数値計算`カテゴリには既に`信号処理`サブカテゴリがあるが、現状は`discrete-convolution.md`(離散畳み込み)1件のみで、汎用数学的DSP理論を扱う枠。新設する「音響・信号処理」はオーディオドメイン応用(音声合成/音響効果/コーデック)に限定し、役割が重複しないことをPhase 3の整合性チェックで継続確認する。
2. 各新規`.md`エントリのfrontmatterテンプレート(既存367件と同一の5項目、`AlgorithmFrontmatter`型に準拠)。
   ```markdown
   ---
   name: 線形ブレンドスキニング(Linear Blend Skinning)
   category: CG・3Dレンダリング
   subcategory: ジオメトリ処理
   complexity: O(V・B)
   summary: 各頂点をボーン行列の加重平均で変形し、スケルタルアニメーションを安価に実現する。
   ---
   ## 概要
   ## 仕組み
   ## 特性・トレードオフ
   ## 実装例(コード)
   ```
   `hasVisualizer`はfrontmatterに書かない(Phase 0のアンチパターン)。可視化を追加する場合は新規`*-visualizers.ts`(例: `src/lib/rendering-visualizers.ts`)にエントリidをキー登録し、`has-visualizer.ts`のOR条件に追記する(Phase 4)。
3. `category`/`subcategory`の値は`CATEGORY_TAXONOMY`の文字列と完全一致させる(全角/半角・中点「・」の表記ゆれに注意)。Phase 3の整合性チェックスクリプトがこれを機械的に検出する。

**検証チェックリスト:**
- [ ] 新規5カテゴリが`CATEGORY_TAXONOMY`にのみ追記され、他ファイルにカテゴリ一覧の重複がない(該当カテゴリ名でgrepし1箇所のみヒット)
- [ ] 新規`.md`各件のfrontmatterが5項目(`name`/`category`/`subcategory`/`complexity`/`summary`)を過不足なく持つ
- [ ] `npm run build`時、カタログの新カテゴリチップ(`CATEGORY_ORDER`由来)がコード変更なしに自動表示される
- [ ] 各新カテゴリのサブカテゴリ数が既存の粒度(2〜4件)の範囲に収まっている
- [ ] 新設「音響・信号処理」と既存「数値計算 > 信号処理」でfrontmatterの割り当てが重複していない

---

## Phase 3: CI/CD導入(ゼロから)

**現状:** `.github`ディレクトリ自体が存在せず、lint/typecheck/buildはすべて手元実行任せ(Phase 0参照)。`AGENTS.md`の破壊的変更注記があるため、ビルド破壊を早期検出する価値が特に高い。

**実装内容:**
1. `.github/workflows/ci.yml`を新設する。push/pull_request契機でlint→typecheck→verify→buildを直列実行する。
   ```yaml
   name: CI
   on:
     push:
       branches: [main]
     pull_request:
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
             cache: npm
         - run: npm ci
         - run: npm run lint
         - run: npx tsc --noEmit
         - run: npm run verify
         - name: build (with timing)
           run: |
             START=$(date +%s)
             npm run build
             echo "build_seconds=$(( $(date +%s) - START ))" >> "$GITHUB_STEP_SUMMARY"
   ```
   `verify`(`scripts/verify-visualizations.mjs`)は既存の可視化正しさ検証スクリプトをそのままCIゲート化するだけで、新規ロジックは不要。
2. frontmatter⇔`CATEGORY_TAXONOMY`整合性チェックスクリプトを新設する(`scripts/verify-categories.mjs`)。全`.md`の`category`/`subcategory`が`CATEGORY_TAXONOMY`に存在しない組み合わせを検出する。
   ```javascript
   // scripts/verify-categories.mjs
   import fs from "node:fs";
   import path from "node:path";
   import matter from "gray-matter";
   import { CATEGORY_TAXONOMY } from "../src/lib/algorithm-categories.ts";
   const CONTENT_DIR = path.join(process.cwd(), "content", "algorithms");
   const validPairs = new Set(
     CATEGORY_TAXONOMY.flatMap((c) => c.subcategories.map((sub) => `${c.category}::${sub}`)),
   );
   let errors = 0;
   const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
   for (const file of files) {
     const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"));
     if (!validPairs.has(`${data.category}::${data.subcategory}`)) {
       console.error(`[NG] ${file}: "${data.category} / ${data.subcategory}" not in CATEGORY_TAXONOMY`);
       errors++;
     }
   }
   if (errors > 0) {
     console.error(`${errors}件の frontmatter が CATEGORY_TAXONOMY と不一致`);
     process.exit(1);
   }
   console.log(`OK: 全${files.length}件のfrontmatterがCATEGORY_TAXONOMYと一致`);
   ```
   `package.json`に`"verify:categories": "node --experimental-strip-types scripts/verify-categories.mjs"`を追加し、CIワークフローの`verify`ステップに並べて組み込む。
3. ビルド時間計測: 367件時点の`next build`所要時間を`GITHUB_STEP_SUMMARY`に記録する(上記yaml例)。`docs/progress.md`記載の目標値である1630件規模に到達した際、静的生成コストがどう伸びるかを継続観測するための布石であり、Phase 3時点では閾値アラートまでは求めない。

**検証チェックリスト:**
- [ ] `.github/workflows/ci.yml`がpush時に起動し、lint/typecheck/verify/buildの4ステップが全て緑になる
- [ ] 意図的にfrontmatterへ存在しないcategoryを1件混入させ、`verify:categories`がCIを赤くすることを確認する(fail-fastの動作確認)
- [ ] `npm ci`が`package-lock.json`と矛盾なくキャッシュ有効の状態で完了する
- [ ] ビルド時間が`GITHUB_STEP_SUMMARY`に記録される

---

## Phase 4: 可視化(hasVisualizer)カバレッジ拡大

**現状:** 367件中241件が可視化対応(`has-visualizer.ts`の9レジストリ経由、Phase 0参照)。Phase 2で追加する新カテゴリはいずれの`*-visualizers.ts`にも未登録の状態でスタートする。

**実装内容:**
1. 既存の`visualizedCount`ロジック(`AlgorithmCatalog.tsx` L38-41、`hasVisualizer`フラグの単純合計)を流用し、カテゴリ別の可視化カバレッジ率を集計するダッシュボードを追加する(カタログUI上の追加表示、または`scripts/verify-visualizations.mjs`側でのカテゴリ別集計出力)。
2. 優先着手順は「動きが本質的に理解を助ける」カテゴリから(Phase 0の作業判断=デザインパターンは対象外、と対称的な基準)。
   - **キャラクターAI・空間AI**(Phase 2新設): ビヘイビアツリー/ステートマシン遷移や索敵範囲の可視化は`GraphVisualizer`/`PathfindingVisualizer`の流用が効きやすい
   - **強化学習**(Phase 2新設): Q値更新やエピソード内の状態遷移は`DPTableVisualizer`(グリッド更新表示)の流用候補
   - **CG・3Dレンダリング**: LOD切り替え・カリングは`PathfindingVisualizer`のグリッド表現と親和性があるが、シェーディング系(DDGI等)は新規2D/3D描画コンポーネントが必要になりやすく、`docs/progress.md`が既に指摘する「計算幾何・機械学習の多次元手法」と同様に後回し候補として扱う
3. 新規`*-visualizers.ts`を追加した場合は`has-visualizer.ts`のOR条件に必ず追記する(frontmatterへの直書きはしない、Phase 0のアンチパターン)。

**検証チェックリスト:**
- [ ] カテゴリ別可視化カバレッジ率が`verify`実行時にコンソール出力または既存ダッシュボードで確認できる
- [ ] 新規`*-visualizers.ts`追加時、`has-visualizer.ts`のOR条件漏れがない(新規レジストリ名でgrepしてヒットすることを確認)
- [ ] `scripts/verify-visualizations.mjs`の既存方針(独立実装・brute-force比較による検証)を新規可視化にも適用している

---

## Final Phase: 統合検証

- [ ] `npm run build` / `npm run lint` / `npx tsc --noEmit`が全パス
- [ ] 新規カテゴリのfrontmatterが`CATEGORY_TAXONOMY`と1件残らず一致している(`verify:categories`スクリプトで確認)
- [ ] グリッドレイアウト(Phase 1)が367件+新規エントリ全件で崩れない(絞り込み結果・Featured+Index表示の両方)
- [ ] CI(`.github/workflows/ci.yml`)が初回グリーン実行を達成している
- [ ] 可視化カバレッジ率がPhase 4着手前の水準(241/367 ≒ 66%)から後退していない
  - 2026-09-09時点の実数は243/754(≒32%)。数値は下がっているが後退ではなく、Phase 2で追加した5カテゴリ(合計120件、可視化28件)が分母に加わったことが主因。既存367件側のカバレッジ自体は維持されている。

---

## 相互参照ドキュメント

別文書「ColorEncyclopedia設計書」は、本プロジェクトのスタック(Next.js 16 + `gray-matter` + `marked` + `pixi.js`)・コンテンツモデル(`CATEGORY_TAXONOMY`方式)・カタログUIコンポーネント・`verify-visualizations.mjs`検証スクリプトを直接の移植元として全面的に流用する予定である。本計画のPhase 1(グリッド化)・Phase 3(CI/CD)で確定する設計は、ColorEncyclopedia側の初期実装にもそのまま持ち越されることを想定する。

**優先度注記:** 全13件中スコープ最小・対象ファイルは特定済み。CI新設(Phase 3)以外はほぼ機械的な拡張作業であり、リスクは低い。

---

## Phase 5: UI/アニメーション強化(2026-09-08追記)

**背景**: X上の@ozwxy氏の実演(GPT-6 Astraによる金属反射・ガラス質感・ホログラム・カードめくれ等30種のUIコンポーネント生成デモ、2026年9月7日投稿)を受け、ユーザーがUI/アニメーション面の強化を明示的に要望。本プロジェクトはencyclopedia系3姉妹プロジェクトの移植元であるため、ここに実装した2種のコンポーネントは`ColorEncyclopedia`・`FoundationsEncyclopedia`へも同様に移植提案する。

### リキッドタブ(Liquid Tab): カテゴリ絞り込みチップへの適用
`AlgorithmCatalog.tsx`の`.chipRow`(L186-218)は`CATEGORY_ORDER`をループしてボタンを並べるだけで、選択状態は各`<button>`個別の`chipActive`クラス切り替え(枠線色のみ、`AlgorithmCatalog.module.css` L171-174)で表現しており、選択枠が移動する演出は存在しない。選択中チップを`getBoundingClientRect()`で測定し、絶対配置したインジケーター要素(`.chipIndicator`)の`transform`/`width`をトランジションさせることで、タブ切り替え時に次のチップへ伸縮しながら液体的に移動する見た目を実現する。
```tsx
// AlgorithmCatalog.tsx: chipRow の親に追加
const chipRowRef = useRef<HTMLDivElement>(null);
const [indicator, setIndicator] = useState({ left: 0, width: 0 });
useEffect(() => {
  const activeEl = chipRowRef.current?.querySelector<HTMLElement>(`.${styles.chipActive}`);
  if (!activeEl || !chipRowRef.current) return;
  const rowRect = chipRowRef.current.getBoundingClientRect();
  const elRect = activeEl.getBoundingClientRect();
  setIndicator({ left: elRect.left - rowRect.left, width: elRect.width });
}, [activeCategory]);
```
```css
/* AlgorithmCatalog.module.css: .chipRow に position: relative を追記 */
.chipIndicator {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 999px;
  background: var(--color-accent-amber);
  opacity: 0.12;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}
```
`.chipRow`は`flex-wrap: wrap`(L131)のため折り返し発生時は縦位置がずれる。その場合は`transform`追従をやめ、インジケーターを一旦フェードアウトしてから新位置でフェードインするフォールバックに切り替える。

### スタックブラウザ(Stack Browser): モバイル向けカード閲覧モード
`.listItems`(L360-379)は640px未満で1列グリッド(実質リスト)に折りたたまれる。367件規模のモバイル閲覧をより発見的にするため、絞り込み結果表示に「スタック表示」トグルを追加し、有効時は`AlgorithmRow`の代わりに新規`AlgorithmStackBrowser.tsx`をレンダリングする。横スクロール+`scroll-snap-type: x mandatory`をベースに、`IntersectionObserver`のintersectionRatioに応じて非アクティブカードを`scale`/`translateY`で段階的に縮小し、スワイプで次カードが手前にめくれてくる重なりを表現する。
```css
/* AlgorithmStackBrowser.module.css */
.stackTrack {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: var(--space-4);
  padding: var(--space-8) 40%; /* 両端余白で中央カードだけ手前に見せる */
}
.stackCard {
  scroll-snap-align: center;
  flex: 0 0 80vw;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.stackCard[data-peek="true"] {
  transform: scale(0.9) translateY(var(--space-2));
  opacity: 0.6;
}
```
`data-peek`は`IntersectionObserver`コールバックで`intersectionRatio < 0.9`のカードに付与する。表示トグル自体は既存ブレークポイント(`AlgorithmCatalog.module.css` L369 `@media (min-width: 640px)`)を流用し、`max-width: 639px`でのみ出す。

**検証チェックリスト:**
- [ ] カテゴリチップ切り替え時、`.chipIndicator`が前のチップ位置から次のチップ位置へ`transform`/`width`のトランジションで滑らかに移動する(瞬間移動しない)
- [ ] `.chipRow`折り返し発生時(多カテゴリ表示のモバイル幅)もインジケーターが縦位置ズレなくフェード切り替えできている
- [ ] スタックブラウザが639px以下でのみ表示され、640px以上ではPhase 1実装済みの既存グリッド表示のまま
- [ ] `prefers-reduced-motion`環境で`.chipIndicator`のトランジションと`.stackCard`のスケールアニメーションが両方無効化される

**姉妹プロジェクトへの伝播**: `ColorEncyclopedia`・`FoundationsEncyclopedia`は本プロジェクトのカタログUIコンポーネントを直接移植しているため、対応する`ColorCatalog.tsx`・`FoundationsCatalog.tsx`のカテゴリ絞り込みチップにリキッドタブを、モバイル閲覧モードにスタックブラウザを同様に移植提案する。相互参照ドキュメントに記載の通りPhase 1のグリッド化がColorEncyclopedia初期実装に持ち越される経路と同じく、本Phase 5の`.chipIndicator`パターンおよび`AlgorithmStackBrowser`コンポーネント設計も横展開する。
