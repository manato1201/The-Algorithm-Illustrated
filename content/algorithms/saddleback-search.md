---
name: 鞍点探索法(Saddleback Search)
category: 探索
subcategory: 配列探索
complexity: O(m+n)
summary: 各行・各列がソート済みの2次元配列に対して右上(または左下)の角から出発し、値の大小比較だけでO(m+n)で目的値を探す探索手法。
---

## 概要

行方向にも列方向にもソート済みの2次元配列(m行n列)から特定の値を探したいとき、各行に対して[二分探索](/algorithms/binary-search)を行えばO(m log n)で済むが、実は行・列両方向のソート済みという性質をもっと積極的に使うと、さらに単純な比較の繰り返しだけでO(m+n)まで計算量を落とせる。鞍点探索法(Saddleback Search、Young's Tableauの探索とも呼ばれる)は、配列の右上の角(または左下の角)から探索を始め、「現在地の値が目的値より大きいか小さいか」という1回の比較だけで毎回確実に探索範囲を1行または1列狭めていく手法である。名前の「鞍点(saddleback、馬の鞍の形)」は、この配列を3次元的な地形として見たときに値が右上がり・下がりに交差する様子に由来する。

## 仕組み

配列`A`が「各行は左から右へ昇順」「各列は上から下へ昇順」にソートされているとする。

1. 開始位置を右上の角、すなわち行`row = 0`、列`col = n - 1`に置く
2. `A[row][col]`と目的値`target`を比較する
   - 一致すれば発見、位置`(row, col)`を返して終了
   - `A[row][col] > target`なら、その列全体(現在行より下)は目的値より大きいことが確定するので、列を1つ左に移動する(`col -= 1`)
   - `A[row][col] < target`なら、その行全体(現在列より左)は目的値より小さいことが確定するので、行を1つ下に移動する(`row += 1`)
3. `row`が配列の範囲を超える、または`col`が負になるまで2を繰り返す。範囲外に出たら「見つからない」と判定する

なぜ右上の角から始めると常に安全に1行または1列を切り捨てられるのか。右上の角にいる要素は「その行の中では最大」かつ「その列の中では最小」という特殊な位置にある。目的値より大きければ、その列の他の要素(現在行より下)は今見ている要素以上、つまり全て目的値より大きいため列ごと除外してよい。目的値より小さければ、その行の他の要素(現在列より左)は今見ている要素以下、つまり全て目的値より小さいため行ごと除外してよい。左上や右下の角では両方向とも「大きい方に動くべきか小さい方に動くべきか」を一意に決められないため、この性質が成り立つのは右上(または対称的に左下)の角に限られる。

## 特性・トレードオフ

- **計算量**: O(m+n)。各ステップで行または列のどちらかを必ず1つ消費するため、最悪でも行数+列数の回数だけ比較すれば終了する。各行に対して個別に[二分探索](/algorithms/binary-search)を行うO(m log n)よりも、行数・列数が近い正方形に近い配列では有利になりやすい
- **前提条件が厳しい**: 単に配列がソートされているだけでなく、「各行かつ各列」がソート済みという2次元的な整列を必要とする。1次元配列の[二分探索](/algorithms/binary-search)に比べると適用できる場面はかなり限られる
- **追加のメモリを使わない**: 現在位置を表す2つの添字だけで探索が進み、追加のデータ構造は不要
- **応用**: 単なる値の探索だけでなく、この2次元配列全体を昇順に1列に並べ直す(k番目に小さい要素を求める)問題や、2つのソート済み配列の全ペア和から特定の値を探す問題など、行・列双方向の単調性を持つ問題全般に同じ発想を応用できる
- **使いどころ**: 行列形式で行・列ともにソートされているデータ(例えば価格表や距離行列のように単調性が保証されているデータ)から特定の値を探す場面。単純な1次元配列であれば素直に[二分探索](/algorithms/binary-search)を使う方が適している

## 実装例

```python
from typing import List, Optional, Tuple


def saddleback_search(matrix: List[List[int]], target: int) -> Optional[Tuple[int, int]]:
    """各行・各列がソート済みの2次元配列からtargetを探す。右上の角から開始する"""
    if not matrix or not matrix[0]:
        return None

    row, col = 0, len(matrix[0]) - 1  # 右上の角からスタート

    while row < len(matrix) and col >= 0:
        current = matrix[row][col]
        if current == target:
            return (row, col)
        elif current > target:
            col -= 1  # 列全体が大きすぎるので左へ
        else:
            row += 1  # 行全体が小さすぎるので下へ

    return None
```

```typescript
function saddlebackSearch(matrix: number[][], target: number): [number, number] | null {
  if (matrix.length === 0 || matrix[0].length === 0) return null;

  let row = 0;
  let col = matrix[0].length - 1; // 右上の角からスタート

  while (row < matrix.length && col >= 0) {
    const current = matrix[row][col];
    if (current === target) {
      return [row, col];
    } else if (current > target) {
      col--; // 列全体が大きすぎるので左へ
    } else {
      row++; // 行全体が小さすぎるので下へ
    }
  }

  return null;
}
```
