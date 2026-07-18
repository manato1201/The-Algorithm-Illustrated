---
name: コムソート
category: ソート
subcategory: 比較ベース
complexity: O(n log n)(平均)
summary: 間隔を1.3倍ずつ縮めながらバブルソートを行い、小さい値が末尾に残る「亀」問題を解消する。
---

## 概要

バブルソートの弱点である「亀」問題(小さい値が末尾近くに取り残され、1歩ずつしか前進できない現象)に対して、カクテルシェイカーソートとは異なるアプローチで挑む。隣接要素だけを比較するのではなく、最初は大きく離れた要素同士を比較し、徐々にその間隔を狭めていく——シェルソートの発想を、挿入ソートではなくバブルソートに応用したものと言える。

## 仕組み

1. 比較する間隔(gap)を、配列の長さから始める
2. 間隔を約1.3(縮小係数)で割り、次の間隔を決める(最小でも1にする)
3. その間隔だけ離れた要素同士を配列全体にわたって比較し、順序が逆なら交換する
4. 間隔が1になり、かつそのパスで1度も交換が起きなくなるまで、2〜3を繰り返す

縮小係数として1.3という値が実験的に最も良い性能を示すことが知られており、コムソートの実装ではほぼ必ずこの値(またはその近似値)が使われる。「亀」となる要素が、間隔の大きい初期のパスで一気に正しい位置近くまで移動できるのが最大の工夫。

## 特性・トレードオフ

- **計算量**: 平均的にはO(n log n)に近い性能が出るが、最悪ケースの理論保証はバブルソートと同じO(n²)にとどまる
- **不安定ソート**: 離れた要素同士を交換するため、同じ値の相対順序は保たれない
- **実装の単純さ**: バブルソートにわずかな変更(間隔の導入)を加えるだけで、実測性能を大きく改善できる好例
- **実務での立ち位置**: シンプルな実装で相応の性能を得たい場面や、教育目的で「小さな工夫がアルゴリズムの実測性能をどれだけ変えるか」を示す題材として使われる

## 実装例(縮小係数1.3)

```python
def comb_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    gap = n
    shrink = 1.3
    swapped = True
    while gap > 1 or swapped:
        gap = int(gap / shrink)
        if gap < 1:
            gap = 1
        swapped = False
        for i in range(n - gap):
            if arr[i] > arr[i + gap]:
                arr[i], arr[i + gap] = arr[i + gap], arr[i]
                swapped = True
    return arr
```

```typescript
function combSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  let gap = n;
  const shrink = 1.3;
  let swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.floor(gap / shrink);
    if (gap < 1) gap = 1;
    swapped = false;
    for (let i = 0; i < n - gap; i++) {
      if (result[i] > result[i + gap]) {
        [result[i], result[i + gap]] = [result[i + gap], result[i]];
        swapped = true;
      }
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

std::vector<int> combSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    int gap = n;
    double shrink = 1.3;
    bool swapped = true;
    while (gap > 1 || swapped) {
        gap = static_cast<int>(gap / shrink);
        if (gap < 1) gap = 1;
        swapped = false;
        for (int i = 0; i < n - gap; i++) {
            if (arr[i] > arr[i + gap]) {
                std::swap(arr[i], arr[i + gap]);
                swapped = true;
            }
        }
    }
    return arr;
}
```

```rust
fn comb_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    let mut gap = n;
    let shrink = 1.3;
    let mut swapped = true;
    while gap > 1 || swapped {
        gap = ((gap as f64) / shrink) as usize;
        if gap < 1 {
            gap = 1;
        }
        swapped = false;
        if gap < n {
            for i in 0..n - gap {
                if arr[i] > arr[i + gap] {
                    arr.swap(i, i + gap);
                    swapped = true;
                }
            }
        }
    }
    arr
}
```

```csharp
static int[] CombSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    int gap = n;
    double shrink = 1.3;
    bool swapped = true;
    while (gap > 1 || swapped)
    {
        gap = (int)(gap / shrink);
        if (gap < 1) gap = 1;
        swapped = false;
        for (int i = 0; i < n - gap; i++)
        {
            if (result[i] > result[i + gap])
            {
                (result[i], result[i + gap]) = (result[i + gap], result[i]);
                swapped = true;
            }
        }
    }
    return result;
}
```
