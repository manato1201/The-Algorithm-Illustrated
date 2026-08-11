---
name: 尺取り法(Two Pointers / Sliding Window)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n)
summary: 単調性を持つ条件のもとで、区間の左右の端を「後戻りさせない」2本の指針だけを動かし、全区間探索のO(n²)をO(n)に落とす競技プログラミングの定番テクニック。
---

## 概要

「和がK以下になる最長の連続部分列を求めよ」のような問題を素朴に解くと、すべての区間の開始・終了の組をO(n²)通り試すことになる。しかし、区間の右端を伸ばすほど条件が悪化する方向に単調に変化する(例: 和が単調に増える)という性質があれば、右端を1つ進めるたびに「条件を満たさなくなるまで」左端も単調に進めればよく、**左右のポインタが合わせて高々2n回しか動かない**ため全体でO(n)になる。この「区間の左右の端を後戻りさせずに動かす」という発想が尺取り法(いもむしのように区間が伸び縮みしながら前進する様子から命名)であり、AtCoder・競技プログラミングで頻出する基本テクニックの一つ。

## 仕組み

1. 左端`l`・右端`r`をともに0で初期化し、区間`[l, r)`の状態(和など)を管理する変数を用意する
2. `r`を1つずつ右に伸ばしながら、区間の状態を更新する(要素を区間に追加する)
3. 区間が条件を満たさなくなったら(例: 和がKを超えたら)、条件を満たすようになるまで`l`を1つずつ右に進めて要素を区間から除く
4. 各`r`について、その時点で条件を満たす区間の中での最長(または個数など、問題に応じた集計)を記録する
5. `r`が末尾に達するまで2〜4を繰り返す。`l`・`r`はどちらも0からnまでの間しか動かず後戻りしないため、ループ全体の計算量はO(n)

## 特性・トレードオフ

- **前提条件は「単調性」**: 尺取り法が使えるのは「区間を広げると条件が悪化する方向にしか変化しない」場合に限られる。例えば要素に負の数が混じる和の問題では単調性が崩れ、尺取り法はそのままでは使えない(累積和+二分探索など別の手法が必要)
- **O(n²)からO(n)への劇的な改善**: 全区間探索がボトルネックになる問題で、単調性さえ確認できれば実装量をほとんど増やさずに計算量を1段落とせる。競技プログラミングで「まず尺取り法が使えないか」を検討するのが定石になっている理由
- **応用範囲の広さ**: 「和がK以下の最長区間」だけでなく、「重複なしの最長部分文字列」「特定の文字をちょうどK種類含む最短区間」など、区間の追加・削除で状態を差分更新できる問題全般に適用できる
- **使いどころ**: 競技プログラミングの区間問題全般、文字列のスライディングウィンドウ探索、ネットワークパケットの流量制御(TCPのスライディングウィンドウとは別概念だが着想は近い)

## 実装例

和がK以下になる最長の連続部分列の長さを求める例。

```python
def longest_subarray_with_sum_at_most_k(a: list[int], k: int) -> int:
    l = 0
    total = 0
    best = 0
    for r in range(len(a)):
        total += a[r]
        while total > k:
            total -= a[l]
            l += 1
        best = max(best, r - l + 1)
    return best
```

```typescript
function longestSubarrayWithSumAtMostK(a: number[], k: number): number {
  let l = 0;
  let total = 0;
  let best = 0;
  for (let r = 0; r < a.length; r++) {
    total += a[r];
    while (total > k) {
      total -= a[l];
      l++;
    }
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```

```cpp
#include <vector>
#include <algorithm>

int longestSubarrayWithSumAtMostK(const std::vector<int>& a, int k) {
    int l = 0;
    long long total = 0;
    int best = 0;
    for (int r = 0; r < static_cast<int>(a.size()); r++) {
        total += a[r];
        while (total > k) {
            total -= a[l];
            l++;
        }
        best = std::max(best, r - l + 1);
    }
    return best;
}
```

```rust
fn longest_subarray_with_sum_at_most_k(a: &[i64], k: i64) -> usize {
    let mut l = 0usize;
    let mut total = 0i64;
    let mut best = 0usize;
    for r in 0..a.len() {
        total += a[r];
        while total > k {
            total -= a[l];
            l += 1;
        }
        best = best.max(r - l + 1);
    }
    best
}
```

```csharp
static int LongestSubarrayWithSumAtMostK(int[] a, int k)
{
    int l = 0;
    long total = 0;
    int best = 0;
    for (int r = 0; r < a.Length; r++)
    {
        total += a[r];
        while (total > k)
        {
            total -= a[l];
            l++;
        }
        best = Math.Max(best, r - l + 1);
    }
    return best;
}
```
