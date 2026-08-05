# アーキテクチャ図解

このドキュメントは、[docs/progress.md](progress.md)(実装の来歴を追う台帳)や[docs/technical-guide.md](technical-guide.md)(項目別の技術解説書)を補完する、**図解による全体像の把握**を目的としたドキュメントです。GitHub上で開くとMermaid記法の図がそのままレンダリングされます。

## 1. システム全体像

コンテンツ(Markdown)からブラウザ表示までの流れです。DB/CMSを持たず、リポジトリ内のMarkdownファイルを`next build`時にファイルシステム経由で読み込む構成が特徴です。

```mermaid
flowchart LR
    subgraph Repo["リポジトリ (GitHub)"]
        MD["content/algorithms/*.md<br/>367件・frontmatter+本文"]
        SRC["src/**<br/>App Router・可視化コンポーネント"]
    end

    subgraph Build["ビルド (next build, Vercel)"]
        LOADER["src/lib/content/algorithms.ts<br/>gray-matter + marked"]
        SSG["generateStaticParams<br/>367詳細ページを静的生成"]
    end

    subgraph Runtime["ランタイム (ブラウザ)"]
        PAGE["/algorithms/[id]<br/>説明文 + 可視化キャンバス"]
        WORKER["Web Worker<br/>ステップ列を非同期生成"]
    end

    MD --> LOADER --> SSG --> PAGE
    SRC --> SSG
    PAGE <--> WORKER

    Repo -->|git push| VERCEL["Vercel<br/>GitHub連携・自動デプロイ"]
    VERCEL --> CDN["本番URL<br/>the-algorithm-illustrated.vercel.app"]
```

## 2. コンテンツパイプライン(1記事が表示されるまで)

各記事は `## 概要` `## 仕組み` `## 特性・トレードオフ` `## 実装例` の4見出し構成のMarkdown本文と、検索・分類に使うfrontmatterで構成されます。

```mermaid
sequenceDiagram
    participant FS as content/algorithms/bubble-sort.md
    participant GM as gray-matter
    participant MK as marked(カスタムrenderer)
    participant PAGE as /algorithms/[id]/page.tsx
    participant USER as ブラウザ

    FS->>GM: frontmatter + Markdown本文を読み込み
    GM-->>PAGE: { name, category, complexity, summary }
    PAGE->>MK: Markdown本文をHTML化
    Note over MK: コードフェンスを<br/>&lt;div class="codeBlock"&gt;に変換<br/>(言語ラベル付き)
    MK-->>PAGE: HTML文字列
    PAGE->>USER: SSGされた静的HTMLを配信
    USER->>USER: 可視化対応アルゴリズムなら<br/>Canvas/DOM描画エリアを表示
```

## 3. 可視化(ビジュアライザ)アーキテクチャ

可視化対応済み190件は、アルゴリズムの種類に応じて8種類のビジュアライザコンポーネントのいずれかにディスパッチされます。ステップ列の生成はUIをブロックしないようWeb Workerで行います。

```mermaid
flowchart TD
    ID["algorithmId"] --> HAS{"hasVisualizer(id)?<br/>src/lib/has-visualizer.ts"}
    HAS -->|false| PLACEHOLDER["「準備中」プレースホルダ表示"]
    HAS -->|true| DISPATCH["AlgorithmVisualizer<br/>(共通ディスパッチャ)"]

    DISPATCH --> SORT["SortVisualizer<br/>Canvas・棒グラフ"]
    DISPATCH --> PATH["PathfindingVisualizer<br/>Canvas・グリッド"]
    DISPATCH --> SEARCH["SearchVisualizer<br/>Canvas・配列/地形"]
    DISPATCH --> GRAPH["GraphVisualizer<br/>Canvas・頂点/辺"]
    DISPATCH --> DP["DPTableVisualizer<br/>HTML+CSS・表"]
    DISPATCH --> TREE["TreeVisualizer<br/>Canvas・木構造"]
    DISPATCH --> TRIE["TrieVisualizer<br/>Canvas・トライ木"]
    DISPATCH --> STRING["StringMatchVisualizer<br/>Canvas・文字列照合"]

    SORT & PATH & SEARCH & GRAPH & DP & TREE & TRIE & STRING --> STEPGEN["各*-visualizers.tsの<br/>ステップ列生成関数"]
    STEPGEN --> WORKER["algorithm-worker.ts<br/>(Web Worker)"]
    WORKER --> HOOK["useWorkerFrames<br/>(再生制御フック)"]
    HOOK --> RENDER["Canvas/DOM描画<br/>再生・一時停止・巻き戻し"]
```

## 4. カテゴリ分類(CATEGORY_TAXONOMY)

`category → subcategory[]` の2階層構造で、カタログ画面の絞り込みチップの元データになっています。367件は24カテゴリに分類され、件数の多い上位6カテゴリは以下の通りです(全カテゴリの一覧は[技術解説書](technical-guide.md#4-カテゴリ分類)を参照)。

```mermaid
graph LR
    ROOT["367件<br/>24カテゴリ"]
    ROOT --> C1["グラフ (25)"]
    ROOT --> C2["データ構造 (25)"]
    ROOT --> C3["ソート (24)"]
    ROOT --> C4["デザインパターン (23)"]
    ROOT --> C5["数論・暗号 (22)"]
    ROOT --> C6["動的計画法 (18)"]
    ROOT --> C7["他18カテゴリ<br/>(230件)"]
```

## 5. 実装例(課題d)の検証フロー

各記事の`## 実装例`セクション(Python/TypeScript/C++/Rust/C#)は、言語ごとに異なる方法で正しさを検証しています(環境にC++/Rustのコンパイラがないという制約への対応)。

```mermaid
flowchart LR
    LOGIC["検証済みの<br/>アルゴリズムロジック"] --> PY["Python<br/>python3で実行"]
    LOGIC --> TS["TypeScript<br/>node --experimental-strip-typesで実行"]
    LOGIC --> CS["C#<br/>dotnet new console + dotnet runで実行"]
    PY & TS & CS --> COMPARE{"既知の正解値・<br/>brute-force参照実装と一致?"}
    COMPARE -->|Yes| VERIFIED["Python/TS/C#: 実行検証OK"]
    LOGIC --> CPP["C++<br/>コンパイラなし"]
    LOGIC --> RUST["Rust<br/>コンパイラなし"]
    CPP & RUST --> REVIEW["1行ずつの手動コードレビュー<br/>(配列境界・オーバーフロー・<br/>Rust usizeアンダーフローに注意)"]
    VERIFIED --> MD["Markdownに5言語分を追記"]
    REVIEW --> MD
```

## 6. デプロイフロー

```mermaid
flowchart LR
    DEV["ローカル / エージェント<br/>git commit"] -->|git push| GH["GitHub<br/>manato1201/The-Algorithm-Illustrated"]
    GH -->|Webhook| VERCEL["Vercel<br/>GitHub連携ビルド"]
    VERCEL --> BUILD["next build<br/>375ルートを静的生成"]
    BUILD --> DEPLOY["本番デプロイ"]
    DEPLOY --> DOMAIN["the-algorithm-illustrated.vercel.app<br/>(認証なしで誰でもアクセス可)"]
```

---

図の元データ・詳細な数値は[docs/technical-guide.md](technical-guide.md)、実装の来歴(いつ・何を・なぜ)は[docs/progress.md](progress.md)を参照してください。
