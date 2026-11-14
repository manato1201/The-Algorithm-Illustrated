# 第 3 回 登録表と分類

> 所要時間の目安: 2 時間 / 前提: 第 2 回

## この回のゴール

- 「この記事に可視化があるか」を、**登録表**(`id in 表`)で持つ理由を説明できる。
- **分類表**(`CATEGORY_TAXONOMY`)と記事の分類を、機械で突き合わせられる。
- 登録表を**複数の場所に書き写している**ことの危うさを説明できる。

## 1. 登録表

```typescript
// 抜粋ファイル: src/lib/has-visualizer.ts
export function hasVisualizer(algorithmId: string): boolean {
algorithmId in SORT_VISUALIZERS ||
algorithmId in PATHFINDING_VISUALIZERS ||
```

- 可視化の種類ごとに**表**(`SORT_VISUALIZERS` など)があり、`id → ステップ列を作る関数`。
- `hasVisualizer(id)` は、**どれかの表に id があるか**を返す。**React に依存しない**ので、ビルド時(一覧)・詳細ページ・比較画面のどこからでも使える。
- **frontmatter に `hasVisualizer: true` と書かない**(記事とコードの 2 か所で食い違うため)。表に足せば、対応が決まる。

## 2. 分類表と記事の一致

`CATEGORY_TAXONOMY` は、カテゴリ → サブカテゴリの**唯一の表**。記事の `category`・`subcategory` は、この表の組み合わせと一致させる。`npm run verify:categories` が全記事を検査する。

```javascript
// 実行できる
(async () => {
  const fs = require("fs");
  const path = require("path");
  const matter = (await import("gray-matter")).default;
  const { CATEGORY_TAXONOMY } = await import("./src/lib/algorithm-categories.ts");
  const { SORT_VISUALIZERS, } = await import("./src/lib/sort-visualizers.ts");

  const valid = new Set(CATEGORY_TAXONOMY.flatMap((c) => c.subcategories.map((s) => `${c.category}::${s}`)));
  const dir = "content/algorithms";
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const bad = [];
  const ids = new Set();
  for (const file of files) {
    ids.add(file.replace(/\.md$/, ""));
    const { data } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!valid.has(`${data.category}::${data.subcategory}`)) bad.push(file);
  }
  console.log("分類が表と一致しない記事:", bad.length);

  // 登録表の id は、実在する記事を指しているか
  const missing = Object.keys(SORT_VISUALIZERS).filter((id) => !ids.has(id));
  console.log("ソートの登録表で、記事が無い id:", missing);
  console.log("カテゴリの数が表の長さと同じ:", CATEGORY_TAXONOMY.length === new Set(CATEGORY_TAXONOMY.map((c) => c.category)).size);
})();
```

```text
# 出力
分類が表と一致しない記事: 0
ソートの登録表で、記事が無い id: []
カテゴリの数が表の長さと同じ: true
```

## 3. 書き写しの危うさ

可視化の種類を**1 つ足す**ときに、**同じ内容を、複数の場所に足す**必要があります。

| 場所 | 役割 |
|---|---|
| `src/lib/has-visualizer.ts` | 「可視化があるか」の判定 |
| `src/workers/algorithm-worker.ts` | ステップ列の生成(Worker) |
| `src/components/visualizer/AlgorithmVisualizer.tsx` | 種類ごとの描画の振り分け |
| `scripts/category-stats.mjs` | 集計(コメントに「同じ判定」と書いて、**書き写してある**) |

**どれかに足し忘れる**と、「対応ありと出るのに描けない」「集計だけ合わない」などが起きる。コードのコメントにも、足す場所が書いてある(→ [学習資料 3](../learn/03-internals.md))。**対応は、1 つの表から導く**のが理想だが、いまは、複数に書き写している。

## 確認問題

1. 可視化の有無を、frontmatter ではなく登録表で持つ利点は何ですか。
2. 分類表と記事の分類を機械で突き合わせるのは、なぜですか。
3. 可視化の種類を足すとき、足し忘れると何が起きますか。

## 解答

1. 対応の情報が 1 か所に集まり、記事とコードで食い違わない。
2. 打ち間違い・分類表にない組み合わせを、目で探さずに見つけるため。
3. 「あると判定されるのに描けない」「集計だけ合わない」など、場所ごとに食い違う。

## まとめ

- **登録表**(`id in 表`)で可視化の有無を決める。分類は**唯一の表**と機械で突き合わせる。
- 登録表の書き写しは**足し忘れの元**。足す場所を、文書とコメントに残す。
- 次の回は、**擬似コードと状態色**。
