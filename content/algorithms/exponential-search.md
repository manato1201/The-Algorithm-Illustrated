---
name: 指数探索
category: 探索
subcategory: 配列探索
complexity: O(log n)
summary: 範囲を倍々に広げて対象区間を見つけてから二分探索する。先頭に値が集中する無限長データに強い。
---

## 概要

「配列の長さが事前にわからない」あるいは「実質的に無限に長い」場合、通常の二分探索はそのままでは使えない(探索範囲の右端がわからないため)。指数探索は、まず範囲を1, 2, 4, 8, 16...と倍々に広げていくことで「目的の値が含まれる区間」を素早く特定し、その区間に対して通常の二分探索を適用する二段構えの手法。

## 仕組み

1. インデックス1から始め、値を確認する
2. 目的の値がまだ見つからず、現在位置の値が目的の値より小さければ、インデックスを2倍にする(1→2→4→8→16...)
3. 現在位置の値が目的の値以上になるか、配列の終端に達したら、範囲拡大を止める
4. 「1つ前に確認した位置」から「現在の位置」までの区間に対して、通常の二分探索を行う

範囲を倍々にすることで、目的の値が先頭からk番目にあるとすると、範囲を特定するまでにかかる回数はO(log k)で済む。その後の二分探索もO(log k)なので、全体としてO(log n)(nは実際に値が見つかった位置)に収まる。

## 特性・トレードオフ

- **計算量**: O(log n)。通常の二分探索と同じオーダーだが、**配列の長さが未知・巨大な場合でも、目的の値が先頭に近ければ近いほど高速**という適応的な性質を持つ
- **前提条件**: 二分探索と同じくソート済みであることが必要
- **無限長・未知長データに強い**: 配列の長さが事前にわからない、あるいはストリームのように動的に伸びていくデータに対して、通常の二分探索より自然に適用できる
- **使いどころ**: サイズ不明の巨大な配列やファイル、無限に続く数列に対する探索。値が先頭付近に偏って出現することが多いデータ(頻度順に並んだデータなど)では特に効果的

## 実装例

```python
def exponential_search(arr: list[int], target: int) -> int:
    n = len(arr)
    if n == 0:
        return -1
    if arr[0] == target:
        return 0
    index = 1
    while index < n and arr[index] < target:
        index *= 2
    low = index // 2
    high = min(index, n - 1)
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
```

```typescript
function exponentialSearch(arr: number[], target: number): number {
  const n = arr.length;
  if (n === 0) return -1;
  if (arr[0] === target) return 0;
  let index = 1;
  while (index < n && arr[index] < target) index *= 2;
  let low = Math.floor(index / 2);
  let high = Math.min(index, n - 1);
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}
```

```cpp
#include <vector>
#include <algorithm>

int exponentialSearch(const std::vector<int>& arr, int target) {
    int n = static_cast<int>(arr.size());
    if (n == 0) return -1;
    if (arr[0] == target) return 0;
    int index = 1;
    while (index < n && arr[index] < target) index *= 2;
    int low = index / 2;
    int high = std::min(index, n - 1);
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}
```

```rust
fn exponential_search(arr: &[i32], target: i32) -> Option<usize> {
    let n = arr.len();
    if n == 0 {
        return None;
    }
    if arr[0] == target {
        return Some(0);
    }
    let mut index = 1;
    while index < n && arr[index] < target {
        index *= 2;
    }
    let mut low = index / 2;
    let mut high = index.min(n - 1);
    while low <= high {
        let mid = low + (high - low) / 2;
        if arr[mid] == target {
            return Some(mid);
        } else if arr[mid] < target {
            low = mid + 1;
        } else if mid == 0 {
            break;
        } else {
            high = mid - 1;
        }
    }
    None
}
```

```csharp
static int ExponentialSearch(int[] arr, int target)
{
    int n = arr.Length;
    if (n == 0) return -1;
    if (arr[0] == target) return 0;
    int index = 1;
    while (index < n && arr[index] < target) index *= 2;
    int low = index / 2;
    int high = Math.Min(index, n - 1);
    while (low <= high)
    {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}
```
