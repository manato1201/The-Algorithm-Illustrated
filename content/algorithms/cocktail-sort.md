---
name: カクテルシェイカーソート
category: ソート
subcategory: 比較ベース
complexity: O(n²)
summary: バブルソートを双方向に行う改良版。両端から交換していくことで偏った未整列要素の移動を速める。
---

## 概要

バブルソートは常に配列の先頭から末尾へ一方向に走査するため、「小さい値が末尾近くに取り残される」ケース(通称「亀」)の移動に時間がかかる。カクテルシェイカーソート(バイディレクショナルバブルソート)は、走査の向きを毎回反転させることでこの弱点を緩和する。シェイカーでカクテルを混ぜるように、行き来しながら整列していく様子が名前の由来。

## 仕組み

1. 配列の先頭から末尾に向かって、通常のバブルソートと同様に隣接比較・交換を行う(この1周で最大値が末尾に確定する)
2. 続けて、末尾から先頭に向かって同じく隣接比較・交換を行う(この1周で最小値が先頭に確定する)
3. 両端から1つずつ範囲を狭めながら、1と2を交互に繰り返す
4. どちらかの方向で1度も交換が起きなければ、その時点で整列は完了している

「大きい値を右に運ぶパス」と「小さい値を左に運ぶパス」を交互に行うことで、片方向だけのバブルソートより早く極端な値を正しい位置に届けられる。

## 特性・トレードオフ

- **計算量**: 最悪・平均ともにO(n²)で、漸近的な計算量クラスはバブルソートと変わらない。ただし**定数倍の実測パフォーマンスは、亀が多いデータに対して改善する**ことがある
- **安定ソート**: 隣接要素同士しか交換しないため、同じ値の相対順序は保たれる
- **実務での立ち位置**: 教育的な位置づけが中心。バブルソートの直感的な改良例として、「なぜ走査方向が性能に影響するのか」を考える教材になる

## 実装例

```python
def cocktail_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    start, end = 0, n - 1
    swapped = True
    while swapped and start < end:
        swapped = False
        for i in range(start, end):
            if arr[i] > arr[i + 1]:
                arr[i], arr[i + 1] = arr[i + 1], arr[i]
                swapped = True
        end -= 1
        if not swapped:
            break
        swapped = False
        for i in range(end, start, -1):
            if arr[i - 1] > arr[i]:
                arr[i - 1], arr[i] = arr[i], arr[i - 1]
                swapped = True
        start += 1
    return arr
```

```typescript
function cocktailSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  let start = 0;
  let end = n - 1;
  let swapped = true;
  while (swapped && start < end) {
    swapped = false;
    for (let i = start; i < end; i++) {
      if (result[i] > result[i + 1]) {
        [result[i], result[i + 1]] = [result[i + 1], result[i]];
        swapped = true;
      }
    }
    end--;
    if (!swapped) break;
    swapped = false;
    for (let i = end; i > start; i--) {
      if (result[i - 1] > result[i]) {
        [result[i - 1], result[i]] = [result[i], result[i - 1]];
        swapped = true;
      }
    }
    start++;
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

std::vector<int> cocktailSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    int start = 0, end = n - 1;
    bool swapped = true;
    while (swapped && start < end) {
        swapped = false;
        for (int i = start; i < end; i++) {
            if (arr[i] > arr[i + 1]) {
                std::swap(arr[i], arr[i + 1]);
                swapped = true;
            }
        }
        end--;
        if (!swapped) break;
        swapped = false;
        for (int i = end; i > start; i--) {
            if (arr[i - 1] > arr[i]) {
                std::swap(arr[i - 1], arr[i]);
                swapped = true;
            }
        }
        start++;
    }
    return arr;
}
```

```rust
fn cocktail_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    if n < 2 {
        return arr;
    }
    let mut start = 0usize;
    let mut end = n - 1;
    let mut swapped = true;
    while swapped && start < end {
        swapped = false;
        for i in start..end {
            if arr[i] > arr[i + 1] {
                arr.swap(i, i + 1);
                swapped = true;
            }
        }
        end -= 1;
        if !swapped {
            break;
        }
        swapped = false;
        for i in (start + 1..=end).rev() {
            if arr[i - 1] > arr[i] {
                arr.swap(i - 1, i);
                swapped = true;
            }
        }
        start += 1;
    }
    arr
}
```

```csharp
static int[] CocktailSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    int start = 0, end = n - 1;
    bool swapped = true;
    while (swapped && start < end)
    {
        swapped = false;
        for (int i = start; i < end; i++)
        {
            if (result[i] > result[i + 1])
            {
                (result[i], result[i + 1]) = (result[i + 1], result[i]);
                swapped = true;
            }
        }
        end--;
        if (!swapped) break;
        swapped = false;
        for (int i = end; i > start; i--)
        {
            if (result[i - 1] > result[i])
            {
                (result[i - 1], result[i]) = (result[i], result[i - 1]);
                swapped = true;
            }
        }
        start++;
    }
    return result;
}
```
