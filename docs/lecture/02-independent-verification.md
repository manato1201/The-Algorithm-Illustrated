# 第 2 回 独立した検証

> 所要時間の目安: 3 時間 / 前提: 第 1 回

## この回のゴール

- 「**独立した**」検証(別の方法で作った正解と比べる)の意味を説明できる。
- **性質**(不変条件)で、ステップ列を守る方法を説明できる。
- 自分で、**全アルゴリズムに当てる検査**を書ける。

## 1. 可視化を信用しない

ステップ列の関数は、**自分で**ソートしているので、同じ関数の出力を同じ関数と比べても、間違いに気づけません。そこで、**別の方法**で作った正解と比べます。

| 比べ先 | 例 |
|---|---|
| **標準の関数** | `Array.prototype.sort` の結果 |
| **総当たり(brute-force)** | 全部を試して作った答え |
| **既知の正解値** | 教科書の例の答え |
| **別のアルゴリズム** | 別の方法で出した同じ答え |

`scripts/verify-visualizations.mjs` は、これらを積み上げた検証(**1508 件**のアサーション)です。**新しい可視化を足すたびに、検証を足す**運用です(書いて確認して消す、ではなく、積み上げる)。

## 2. 性質で守る

正解を持たなくても、**常に成り立つ性質**を確かめられます。ソートなら:

1. **最後のコマの配列が、整列している**(標準の `sort` の結果と一致)。
2. **最初のコマの配列が、入力と同じ**。
3. その場で入れ替える方式なら、**どのコマも、入力の並べ替え**(要素の集合が変わらない)。
4. ハイライトの位置が、**配列の範囲内**。

```javascript
// 実行できる
(async () => {
  const { SORT_VISUALIZERS: V } = await import("./src/lib/sort-visualizers.ts");
  const input = [5, 2, 9, 1, 5, 6, 3];
  const sorted = JSON.stringify([...input].sort((a, b) => a - b));
  const key = (a) => JSON.stringify([...a].sort((x, y) => x - y));

  const ok = { last: [], first: [], range: [] };
  const inPlace = [];
  const notInPlace = [];
  for (const [id, fn] of Object.entries(V)) {
    if (id === "bogosort") continue; // 乱数を使う(第 5 回)
    const frames = fn(input);
    if (JSON.stringify(frames[frames.length - 1].array) === sorted) ok.last.push(id);
    if (JSON.stringify(frames[0].array) === JSON.stringify(input)) ok.first.push(id);
    if (frames.every((f) => Object.keys(f.highlight).every((k) => +k >= 0 && +k < input.length))) ok.range.push(id);
    (frames.every((f) => f.array.length === input.length && key(f.array) === key(input)) ? inPlace : notInPlace).push(id);
  }
  const total = Object.keys(V).length - 1;
  console.log("最後のコマが整列(標準の sort と一致):", ok.last.length === total);
  console.log("最初のコマが入力と同じ:", ok.first.length === total);
  console.log("ハイライトが範囲内:", ok.range.length === total);
  console.log("全コマが入力の並べ替え(その場で入れ替える方式):", inPlace.includes("bubble-sort"), inPlace.includes("heap-sort"));
  console.log("途中で別の置き場を使う方式(全コマは並べ替えにならない):", notInPlace.includes("merge-sort"), notInPlace.includes("counting-sort"));
})();
```

```text
# 出力
最後のコマが整列(標準の sort と一致): true
最初のコマが入力と同じ: true
ハイライトが範囲内: true
全コマが入力の並べ替え(その場で入れ替える方式): true true
途中で別の置き場を使う方式(全コマは並べ替えにならない): true true
```

- 性質 1〜2・4 は**全アルゴリズム**で成り立つ。性質 3 は、**方式による**(マージソートなどは、途中で別の置き場に要素を置くので、そのコマでは要素が欠けて見える)。
- **「全部に成り立つ性質」と「方式による性質」を分ける**。性質を**強すぎる形**で書くと、正しい実装まで落ちる。

## 3. わざと壊して確かめる

検査が働くかは、**壊した入力**で確かめる。

```javascript
// 実行できる
(async () => {
  const { bubbleSortSteps } = await import("./src/lib/sort-visualizers.ts");
  const input = [3, 1, 2];
  const frames = bubbleSortSteps(input);
  const lastIsSorted = (fs) => JSON.stringify(fs[fs.length - 1].array) === JSON.stringify([...input].sort((a, b) => a - b));
  console.log("正しい実装で通る:", lastIsSorted(frames));

  // 最後のコマを、わざと壊す(入れ替え忘れを想定)
  const broken = frames.map((f, i) => (i === frames.length - 1 ? { ...f, array: [3, 1, 2] } : f));
  console.log("壊した最後のコマを、検査は見つけるか:", !lastIsSorted(broken));
})();
```

```text
# 出力
正しい実装で通る: true
壊した最後のコマを、検査は見つけるか: true
```

## 確認問題

1. ステップ列の関数が出した答えを、同じ関数の別の出力と比べても、なぜ意味が薄いのですか。
2. 性質 3(全コマが入力の並べ替え)を、全アルゴリズムに要求してはいけないのは、なぜですか。
3. 検査を書いたら、わざと壊したデータで試すのは、なぜですか。

## 解答

1. 同じ間違いを両方が持っていれば、一致してしまい、間違いに気づけないから。
2. マージソートなどは、途中で別の置き場に要素を置くので、正しい実装でも成り立たないから。
3. 何があっても通る検査(何も守らない検査)を見つけるため。

## まとめ

- **独立した正解**(標準の関数・総当たり・既知の値)と比べる。
- **全部に成り立つ性質**と**方式による性質**を分けて、検査を書く。
- 次の回は、**登録表と分類**。
