---
name: バブルソート
category: ソート
subcategory: 比較ベース
complexity: O(n²)
summary: 隣接要素の比較・交換を繰り返す最も素朴な手法。仕組みの理解に最適だが実務での採用は少ない。
---

## 概要

隣り合う2つの要素を比較し、順序が逆であれば交換する——これだけを繰り返して配列全体を整列させる、最も古典的なソートアルゴリズムのひとつ。大きな値が1回のパスごとに配列の端まで「泡のように浮き上がっていく」様子からこの名がついた。実務での採用は少ないが、「ソートとは何をしている操作なのか」を体感するための最初の一歩として今も広く教えられている。

## 仕組み

1. 配列の先頭から順に隣接ペア(i番目とi+1番目)を比較する
2. 順序が逆であれば交換する
3. 末尾まで1周(1パス)すると、その時点での最大値が必ず末尾に確定する
4. 確定した末尾を除いた範囲で同じ操作を繰り返す
5. 1パスの中で1度も交換が起きなければ、その時点で整列は完了している

この可視化では、比較中のペアを「比較中」、実際に交換が起きた瞬間を「交換中」、そのパスで確定した位置を「確定」の色で示している。

## 特性・トレードオフ

- **計算量**: 最悪・平均ともにO(n²)。要素数が増えると急激に遅くなる
- **安定ソート**: 同じ値の要素同士の相対順序が保たれる(隣接要素しか交換しないため)
- **追加メモリ不要**: 配列そのものを書き換えるin-placeなアルゴリズム
- **早期終了が可能**: 交換が起きなかったパスがあれば、そこで打ち切れる(ほぼ整列済みのデータには強い)
- **実務での立ち位置**: クイックソートやTimsortなど、より高速なアルゴリズムに比べて実用性は低い。教育目的、あるいは「配列が数要素しかない」ことが保証されている極小データ向け

## 実装例

```python
def bubble_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr
```

```typescript
function bubbleSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (result[j] > result[j + 1]) {
        [result[j], result[j + 1]] = [result[j + 1], result[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

std::vector<int> bubbleSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                std::swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return arr;
}
```

```rust
fn bubble_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    for i in 0..n.saturating_sub(1) {
        let mut swapped = false;
        for j in 0..n - 1 - i {
            if arr[j] > arr[j + 1] {
                arr.swap(j, j + 1);
                swapped = true;
            }
        }
        if !swapped {
            break;
        }
    }
    arr
}
```

```csharp
static int[] BubbleSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    for (int i = 0; i < n - 1; i++)
    {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; j++)
        {
            if (result[j] > result[j + 1])
            {
                (result[j], result[j + 1]) = (result[j + 1], result[j]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
    return result;
}
```
