---
name: カダンのアルゴリズム(最大部分配列問題)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n)
summary: 局所最適な部分和を更新し続けるだけで全体最適に到達する、貪欲法とDPの境界にある手法。
---

## 概要

正負が入り混じった数列から、**連続する**部分列を選んで合計を最大化したいとき、どこからどこまでを選べば最も大きくなるか——という問題を、配列をたった1回走査するだけのO(n)で解く、驚くほどシンプルなアルゴリズム。1977年にジェイ・カダンが考案した。貪欲法にも動的計画法にも分類できる、両者の境界的な性質を持つ点が、アルゴリズム学習における面白いポイントになっている。

## 仕組み

「今の位置で終わる部分配列の最大和」を1つの変数で追跡しながら、配列を左から右へなめていく。

1. 「現在位置で終わる最大の部分和」と「これまでに見た中での全体の最大値」の2つの変数を用意する
2. 各要素を見るたびに、「現在位置で終わる最大の部分和」を `max(その要素単体, これまでの部分和 + その要素)` で更新する(**それまでの部分和が負であれば、引きずるより新しくそこから始めた方が得**、という判断がここに現れる)
3. 更新後の値が、全体の最大値より大きければ、全体の最大値も更新する
4. 配列の末尾まで1〜3を繰り返せば、全体の最大値が答え

「それまでの累積が足を引っ張るなら、思い切って今の位置からやり直す」という、局所的な判断だけを積み重ねているにもかかわらず、結果として大域的な最適解にたどり着く——この性質こそがカダンのアルゴリズムの本質的な面白さ。

## 特性・トレードオフ

- **計算量**: O(n)。配列を1回走査するだけで済み、追加メモリもO(1)
- **DPとしての解釈**: 「現在位置で終わる部分配列の最大和」という状態を1つ前の状態から更新している、という見方をすればこれは1次元DPの一種とも言える。一方で「悪化したら即座に切り捨てる」という判断は貪欲法的でもあり、両方の見方ができる境界的なアルゴリズムとして紹介されることが多い
- **拡張のしやすさ**: 「最大値だけでなく、実際の区間(開始・終了インデックス)も知りたい」「2次元配列(部分行列)の最大和を求めたい」といった派生問題にも、この考え方は自然に拡張できる
- **使いどころ**: 株価データにおける「最大の利益が出る売買区間」の発見、画像処理における最も明るい(あるいは特徴的な)矩形領域の検出、時系列データにおける異常に高い/低い区間の特定など

## 実装例

```python
def kadane(arr: list[int]) -> int:
    if not arr:
        return 0
    best_ending_here = arr[0]
    best_overall = arr[0]
    for x in arr[1:]:
        best_ending_here = max(x, best_ending_here + x)
        best_overall = max(best_overall, best_ending_here)
    return best_overall
```

```typescript
function kadane(arr: number[]): number {
  if (arr.length === 0) return 0;
  let bestEndingHere = arr[0];
  let bestOverall = arr[0];
  for (let i = 1; i < arr.length; i++) {
    bestEndingHere = Math.max(arr[i], bestEndingHere + arr[i]);
    bestOverall = Math.max(bestOverall, bestEndingHere);
  }
  return bestOverall;
}
```

```cpp
#include <vector>
#include <algorithm>

int kadane(const std::vector<int>& arr) {
    if (arr.empty()) return 0;
    int bestEndingHere = arr[0];
    int bestOverall = arr[0];
    for (std::size_t i = 1; i < arr.size(); i++) {
        bestEndingHere = std::max(arr[i], bestEndingHere + arr[i]);
        bestOverall = std::max(bestOverall, bestEndingHere);
    }
    return bestOverall;
}
```

```rust
fn kadane(arr: &[i32]) -> i32 {
    if arr.is_empty() {
        return 0;
    }
    let mut best_ending_here = arr[0];
    let mut best_overall = arr[0];
    for &x in &arr[1..] {
        best_ending_here = x.max(best_ending_here + x);
        best_overall = best_overall.max(best_ending_here);
    }
    best_overall
}
```

```csharp
static int Kadane(int[] arr)
{
    if (arr.Length == 0) return 0;
    int bestEndingHere = arr[0];
    int bestOverall = arr[0];
    for (int i = 1; i < arr.Length; i++)
    {
        bestEndingHere = Math.Max(arr[i], bestEndingHere + arr[i]);
        bestOverall = Math.Max(bestOverall, bestEndingHere);
    }
    return bestOverall;
}
```
