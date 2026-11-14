# 第 1 回 アルゴリズムを「コマ」にする

> 所要時間の目安: 2.5 時間 / 前提: 第 0 回・バブルソート

## この回のゴール

- **フレーム**(配列・ハイライト・説明)の形を説明できる。
- 状態色(`idle`・`comparing`・`swapping`・`pivot`・`settled`)の使い分けを説明できる。
- 1 つのアルゴリズムのステップ列を、**自分で読んで**確かめられる。

## 1. フレームの形

```typescript
// 抜粋ファイル: src/lib/sort-visualizers.ts
export type SortFrame = {
  array: number[];
  highlight: Partial<Record<number, StateColorKey>>;
  description: string;
};
```

- `array`: **その時点の配列**(毎回**コピー**して持つ。後で配列が変わっても、過去のコマが変わらない)。
- `highlight`: **位置 → 状態色**。書かれていない位置は、ふつうの色。
- `description`: そのコマの**説明文**(「1番目と2番目を比較」)。

| 状態色 | 意味 |
|---|---|
| `idle` | 何もしていない |
| `comparing` | 比べている |
| `swapping` | 入れ替えている |
| `pivot` | 基準(クイックソートの軸など) |
| `settled` | 確定した |

## 2. バブルソートのコマを見る

```javascript
// 実行できる
(async () => {
  const { bubbleSortSteps } = await import("./src/lib/sort-visualizers.ts");

  const frames = bubbleSortSteps([2, 1]);
  console.log("コマ数:", frames.length);
  for (const f of frames) console.log(JSON.stringify(f.array), JSON.stringify(f.highlight), f.description);

  const input = [5, 2, 9, 1, 5, 6, 3];
  const big = bubbleSortSteps(input);
  console.log("最初のコマ:", big[0].description, JSON.stringify(big[0].array));
  console.log("最後のコマ:", big[big.length - 1].description, JSON.stringify(big[big.length - 1].array));
  console.log("入力の配列は変わらない:", JSON.stringify(input));
  console.log("最初の 3 コマの説明:", big.slice(1, 4).map((f) => f.description).join(" / "));
})();
```

```text
# 出力
コマ数: 5
[2,1] {} 初期状態
[2,1] {"0":"comparing","1":"comparing"} 1番目と2番目を比較
[1,2] {"0":"swapping","1":"swapping"} 1番目と2番目を交換
[1,2] {"1":"settled"} 末尾から1個が確定
[1,2] {"0":"settled","1":"settled"} ソート完了
最初のコマ: 初期状態 [5,2,9,1,5,6,3]
最後のコマ: ソート完了 [1,2,3,5,5,6,9]
入力の配列は変わらない: [5,2,9,1,5,6,3]
最初の 3 コマの説明: 1番目と2番目を比較 / 1番目と2番目を交換 / 2番目と3番目を比較
```

- 最初のコマは「**初期状態**」、最後は「**ソート完了**」(全位置が `settled`)。
- **入力の配列を書き換えない**(関数の中でコピーして使う)。
- 外側のループが 1 周するたびに、「末尾から k 個が確定」のコマが入る。

## 3. 規模とコマ数

同じ長さの入力でも、アルゴリズムでコマ数が違う(**比較の回数の違いが、コマ数に出る**)。

```javascript
// 実行できる
(async () => {
  const { SORT_VISUALIZERS: V } = await import("./src/lib/sort-visualizers.ts");
  const input = Array.from({ length: 16 }, (_, i) => (i * 7 + 3) % 16);
  for (const id of ["bubble-sort", "insertion-sort", "merge-sort", "quick-sort", "heap-sort"]) {
    console.log(id.padEnd(16), V[id](input).length);
  }
})();
```

```text
# 出力
bubble-sort      193
insertion-sort   144
merge-sort       128
quick-sort       92
heap-sort        142
```

- コマ数は**実装の細かい選び方**(何を 1 コマにするか)で変わる。**計算量の厳密な測定ではなく、見せ方の都合**として読む。

## 確認問題

1. フレームの `array` を、毎回コピーして持つのは、なぜですか。
2. `highlight` に書かれていない位置は、どう描かれますか。
3. コマ数は、計算量の測定として使えますか。

## 解答

1. 後で配列が書き換わっても、過去のコマ(巻き戻しで見るコマ)が変わらないようにするため。
2. ふつうの色(状態色を付けない)。
3. 厳密には使えない。何を 1 コマにするかの見せ方で変わるため。

## まとめ

- フレーム = **配列のコピー + ハイライト + 説明**。最初は「初期状態」、最後は「完了」。
- 入力は書き換えない。状態色は 5 種類。
- 次の回は、**ステップ列が正しいか**を、別の方法で確かめる。
