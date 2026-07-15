---
name: 選択ソート
category: ソート
subcategory: 比較ベース
complexity: O(n²)
summary: 未整列部分から最小値を選んで確定させていく。交換回数が少なく書き込みコストが高い場面で有利。
---

## 概要

未整列部分の中から最小値を探し、それを未整列部分の先頭に確定させる——これを繰り返して配列全体を整列させる。バブルソートが「隣接要素をこまめに交換する」のに対し、選択ソートは「1周につき交換は最大1回だけ」という点が対照的で、書き込み回数を最小限に抑えたいときに意味を持つ。

## 仕組み

1. 未整列部分(最初は配列全体)の先頭を「現時点の最小値」の候補とする
2. 未整列部分を末尾まで走査し、より小さい値が見つかるたびに候補を更新する
3. 走査が終わったら、候補の値を未整列部分の先頭と交換する
4. 未整列部分の範囲を1つ縮めて、同じ操作を繰り返す

この可視化では、探索中の候補を「基準/ポインタ」、比較対象を「比較中」、実際に交換した瞬間を「交換中」で示している。

## 特性・トレードオフ

- **計算量**: 比較回数は常にO(n²)で、データがどんな順序でも変わらない(最良ケースでも高速化しない)
- **交換回数が少ない**: 1周につき交換は高々1回。フラッシュメモリのように書き込みコストが高い媒体では有利になりうる
- **不安定ソート**: 遠く離れた要素同士を交換するため、同じ値の相対順序が崩れることがある
- **実務での立ち位置**: 単純さと引き換えに性能は低い。教育用途、あるいは「書き込み回数の最小化」が明確な要件になっている特殊な場面向け

## 実装例

```python
def selection_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr
```

```typescript
function selectionSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (result[j] < result[minIdx]) minIdx = j;
    }
    if (minIdx !== i) {
      [result[i], result[minIdx]] = [result[minIdx], result[i]];
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

std::vector<int> selectionSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) minIdx = j;
        }
        if (minIdx != i) std::swap(arr[i], arr[minIdx]);
    }
    return arr;
}
```

```rust
fn selection_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    for i in 0..n.saturating_sub(1) {
        let mut min_idx = i;
        for j in (i + 1)..n {
            if arr[j] < arr[min_idx] {
                min_idx = j;
            }
        }
        if min_idx != i {
            arr.swap(i, min_idx);
        }
    }
    arr
}
```

```csharp
static int[] SelectionSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    for (int i = 0; i < n - 1; i++)
    {
        int minIdx = i;
        for (int j = i + 1; j < n; j++)
        {
            if (result[j] < result[minIdx]) minIdx = j;
        }
        if (minIdx != i) (result[i], result[minIdx]) = (result[minIdx], result[i]);
    }
    return result;
}
```
