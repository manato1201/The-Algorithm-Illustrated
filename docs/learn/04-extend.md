# 4. 拡張のレシピ

どのレシピも、**同じ順**で進めます: ①何を足すか決める → ②データ・関数を書く → ③**検証を足す** → ④`verify` 系を通す → ⑤README の集計・文書。

## レシピ A: 記事を 1 件足す

1. `content/algorithms/<id>.md` を作る。`<id>` は**英数字・ハイフン**(URL になる)。
2. frontmatter は **5 項目だけ**: `name`・`category`・`subcategory`・`complexity`・`summary`。
   - `category`・`subcategory` は、`CATEGORY_TAXONOMY` と**一字一句一致**。
   - **`summary` の先頭を `[` にしない**(YAML が配列と解釈してビルドが壊れる)。
   - **`hasVisualizer` は書かない**。
3. 本文は 4 見出し: `## 概要`・`## 仕組み`・`## 特性・トレードオフ`・`## 実装例`。「**なぜ生まれたか**」を概要に書く。見出しの補足(`## 実装例(Lomuto分割方式)`)は可。
4. 任意で `## 使うときの注意`・`## よくある誤解`(実装例の前)。**全記事に共通する内容は、詳細ページが自動で出す**ので書かない。
5. `npm run verify:categories`。集計を `npm run stats:categories` で出し、**README のカテゴリ表を貼り直す**(手で書き換えない)。

## レシピ B: カテゴリ・サブカテゴリを足す

`src/lib/algorithm-categories.ts` の `CATEGORY_TAXONOMY` に**追記するだけ**(唯一の情報源)。コンポーネント側に名前の配列を**重複して持たない**。

## レシピ C: 可視化を足す(既存の種類に)

1. `src/lib/*-visualizers.ts` に、**ステップ列を作る関数**を書く。**実際の計算をシミュレート**し、**乱数は固定シード**、入力は書き換えない。
2. その種類の**登録表**に `id → 関数` を足す(`hasVisualizer` と詳細ページが自動で対応する)。
3. **検証を足す**(下のレシピ E)。
4. 擬似コードを出すなら `pseudo-code.ts` の `PSEUDO_CODE` に足す(各行が光る状態種別を持つ)。
5. `npm run stats:categories` で、対応数が増えたことを確認する。

```javascript
// 実行できる
(async () => {
  const { SORT_VISUALIZERS: V } = await import("./src/lib/sort-visualizers.ts");
  const { stateColors } = await import("./src/lib/design-tokens.ts");

  // 新しい可視化の「最低限の構造チェック」の型: 登録した id の関数を呼び、フレーム列が壊れていないか見る
  const input = [4, 3, 2, 1];
  const problems = [];
  for (const [id, fn] of Object.entries(V)) {
    if (id === "bogosort") continue;
    const frames = fn(input);
    if (!Array.isArray(frames) || frames.length < 2) problems.push(`${id}: コマが少ない`);
    for (const f of frames) {
      if (typeof f.description !== "string" || f.description === "") problems.push(`${id}: description が空`);
      for (const kind of Object.values(f.highlight)) if (!(kind in stateColors)) problems.push(`${id}: 未知の状態色 ${kind}`);
    }
  }
  console.log("構造の問題:", problems.length, problems.slice(0, 3));
})();
```

```text
# 出力
構造の問題: 0 []
```

## レシピ D: 新しい「種類」(レジストリ)を作る

**まず、既存の種類で足りないか**を考える(棒グラフ + 状態色なら `BAR_GROUPS`・時系列なら `seriesFrames`・3 次元なら `scene3d-*.ts`)。足りなければ、**4 か所**(`has-visualizer.ts`・`algorithm-worker.ts`・`AlgorithmVisualizer.tsx`・`category-stats.mjs`)に追記し、`step-timeline.ts` に状態種別のアダプタを足す(学習資料 3)。既存のレジストリと**id が重複**すると片方が呼ばれない(verify が検出する)。

## レシピ E: 検証を足す(`verify-visualizations.mjs`)

1. **独立した正解**を決める(標準の関数・総当たり・既知の値・別のアルゴリズム)。無ければ、**最低限の構造チェック**(クラッシュしない・フレーム列が壊れていない)。
2. 検証のブロックを**追記する**(積み上げる。消さない)。
3. わざと壊して、**落ちる**ことを確かめる。
4. `npm run verify`。

## レシピ F: 左ペインの見た目を直す

`position: sticky` を壊さないため、**`html`/`body` や祖先要素に `overflow: hidden/auto` を付けない**(横のはみ出しは `overflow-x: clip`)。

## 足したら、必ずやること

```bash
npx tsc --noEmit && npm run lint && npm run verify && npm run verify:categories && npm run build
```

+ `python tools/check_docs.py`(文書の検査)。
