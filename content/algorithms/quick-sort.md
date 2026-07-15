---
name: クイックソート
category: ソート
subcategory: 比較ベース
complexity: O(n log n)
summary: ピボットを軸に分割統治する。平均は非常に高速だが、ピボット選択次第で最悪ケースに落ち込む。
---

## 概要

配列から「ピボット」と呼ぶ基準値を1つ選び、それより小さい要素と大きい要素に配列を分割してから、それぞれを再帰的に同じ手順で整列させる。1960年にトニー・ホーアが考案して以来、実務で最も広く使われてきたソートアルゴリズムのひとつで、多くの言語の標準ライブラリの内部実装(の一部)にも採用されている。

## 仕組み(Lomuto分割方式)

1. 区間の末尾要素をピボットとして選ぶ
2. 区間の先頭からピボットの手前までを1つずつ調べ、ピボットより小さい値を前方に集めていく
3. 走査が終わったら、ピボットを「小さい値の集まり」の直後に移動する。これでピボットは最終的な位置に確定する
4. ピボットの左側の区間・右側の区間それぞれに対して、同じ手順を再帰的に適用する

この可視化では、選ばれたピボットを「基準/ポインタ」、比較中の要素を「比較中」、実際の交換を「交換中」、位置が確定したピボットを「確定」で示している。

## 特性・トレードオフ

- **計算量**: 平均O(n log n)で、定数倍が小さく実測は非常に速い。ただし**ピボットの選び方が悪いと最悪O(n²)まで悪化する**(既にソート済みの配列に対して常に末尾をピボットに選ぶ、などが典型例)
- **不安定ソート**: 分割の過程で遠く離れた要素を交換するため、同じ値の相対順序は保たれない
- **in-place**: 追加のバッファをほぼ必要とせず、メモリ効率が良い(再帰呼び出しのスタック分は必要)
- **実務での立ち位置**: 平均性能の良さから広く使われる一方、最悪ケースのリスクを避けるため、実際の標準ライブラリでは「再帰が深くなったらヒープソートに切り替える(Introsort)」「ピボットをランダムに選ぶ」といった工夫が加えられていることが多い

## 実装例(Lomuto分割方式)

```python
def quick_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    _quick_sort(arr, 0, len(arr) - 1)
    return arr

def _quick_sort(arr: list[int], lo: int, hi: int) -> None:
    if lo >= hi:
        return
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] < pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    _quick_sort(arr, lo, i - 1)
    _quick_sort(arr, i + 1, hi)
```

```typescript
function quickSort(arr: number[]): number[] {
  const result = [...arr];
  sortRange(result, 0, result.length - 1);
  return result;
}

function sortRange(arr: number[], lo: number, hi: number): void {
  if (lo >= hi) return;
  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  sortRange(arr, lo, i - 1);
  sortRange(arr, i + 1, hi);
}
```

```cpp
#include <vector>
#include <utility>

void quickSortRange(std::vector<int>& arr, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = arr[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (arr[j] < pivot) {
            std::swap(arr[i], arr[j]);
            i++;
        }
    }
    std::swap(arr[i], arr[hi]);
    quickSortRange(arr, lo, i - 1);
    quickSortRange(arr, i + 1, hi);
}

std::vector<int> quickSort(std::vector<int> arr) {
    quickSortRange(arr, 0, static_cast<int>(arr.size()) - 1);
    return arr;
}
```

```rust
fn sort_range(arr: &mut [i32], lo: isize, hi: isize) {
    if lo >= hi {
        return;
    }
    let pivot = arr[hi as usize];
    let mut i = lo;
    for j in lo..hi {
        if arr[j as usize] < pivot {
            arr.swap(i as usize, j as usize);
            i += 1;
        }
    }
    arr.swap(i as usize, hi as usize);
    sort_range(arr, lo, i - 1);
    sort_range(arr, i + 1, hi);
}

fn quick_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let hi = arr.len() as isize - 1;
    sort_range(&mut arr, 0, hi);
    arr
}
```

```csharp
static void SortRange(int[] arr, int lo, int hi)
{
    if (lo >= hi) return;
    int pivot = arr[hi];
    int i = lo;
    for (int j = lo; j < hi; j++)
    {
        if (arr[j] < pivot)
        {
            (arr[i], arr[j]) = (arr[j], arr[i]);
            i++;
        }
    }
    (arr[i], arr[hi]) = (arr[hi], arr[i]);
    SortRange(arr, lo, i - 1);
    SortRange(arr, i + 1, hi);
}

static int[] QuickSort(int[] arr)
{
    var result = (int[])arr.Clone();
    SortRange(result, 0, result.Length - 1);
    return result;
}
```
