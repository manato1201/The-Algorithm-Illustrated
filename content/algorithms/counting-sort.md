---
name: 計数ソート(カウンティングソート)
category: ソート
subcategory: 非比較ベース
complexity: O(n + k)
summary: 値の出現回数を数えて並べる。値域が小さい整数データに強い非比較ソート。
---

## 概要

これまでのソートが「要素同士を比較して」順序を決めるのに対し、計数ソートは要素を比較しない。代わりに「値がいくつ存在するか」を数え上げ、その集計結果から直接、整列済みの配列を組み立てる。値の範囲(k)が要素数(n)に対して十分小さいときに真価を発揮する。

## 仕組み

1. 出現しうる値の範囲(0からkまでなど)に対応する「カウント配列」を用意し、全て0で初期化する
2. 元の配列を1回走査し、各値が出現するたびにカウント配列の対応する位置を1つ増やす
3. カウント配列の累積和を取る(「その値以下がいくつあるか」がわかるようにする)
4. 元の配列を末尾から走査し、各要素を累積和が示す位置に配置してから、その累積和を1つ減らす(末尾から処理するのは安定性を保つため)

比較を1回も行わずに整列できるのが最大の特徴で、これは「比較ベースのソートはΩ(n log n)より速くならない」という理論的な下限を、比較を使わないことで回避している。

## 特性・トレードオフ

- **計算量**: O(n + k)。kが小さければ非常に高速だが、**kが極端に大きいと(例: 値の範囲が0〜10億)メモリも時間も莫大になる**
- **安定ソート**: 累積和を使って末尾から配置することで、同じ値同士の相対順序を保てる
- **整数(または離散値)専用**: 実数のような連続値にはそのままでは使えない
- **使いどころ**: 年齢・得点・成績のような値域が限定された整数データ。基数ソートの内部処理としても使われる(桁ごとのソートに計数ソートを使う)

## 実装例(非負整数、値域0〜kを仮定)

```python
def counting_sort(arr: list[int]) -> list[int]:
    if not arr:
        return []
    k = max(arr)
    count = [0] * (k + 1)
    for v in arr:
        count[v] += 1
    for i in range(1, k + 1):
        count[i] += count[i - 1]
    result = [0] * len(arr)
    for v in reversed(arr):
        count[v] -= 1
        result[count[v]] = v
    return result
```

```typescript
function countingSort(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const k = Math.max(...arr);
  const count = new Array(k + 1).fill(0);
  for (const v of arr) count[v]++;
  for (let i = 1; i <= k; i++) count[i] += count[i - 1];
  const result = new Array(arr.length).fill(0);
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    count[v]--;
    result[count[v]] = v;
  }
  return result;
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<int> countingSort(const std::vector<int>& arr) {
    if (arr.empty()) return {};
    int k = *std::max_element(arr.begin(), arr.end());
    std::vector<int> count(k + 1, 0);
    for (int v : arr) count[v]++;
    for (int i = 1; i <= k; i++) count[i] += count[i - 1];
    std::vector<int> result(arr.size());
    for (auto it = arr.rbegin(); it != arr.rend(); ++it) {
        count[*it]--;
        result[count[*it]] = *it;
    }
    return result;
}
```

```rust
fn counting_sort(arr: &[i32]) -> Vec<i32> {
    if arr.is_empty() {
        return Vec::new();
    }
    let k = *arr.iter().max().unwrap() as usize;
    let mut count = vec![0usize; k + 1];
    for &v in arr {
        count[v as usize] += 1;
    }
    for i in 1..=k {
        count[i] += count[i - 1];
    }
    let mut result = vec![0; arr.len()];
    for &v in arr.iter().rev() {
        count[v as usize] -= 1;
        result[count[v as usize]] = v;
    }
    result
}
```

```csharp
static int[] CountingSort(int[] arr)
{
    if (arr.Length == 0) return Array.Empty<int>();
    int k = arr.Max();
    var count = new int[k + 1];
    foreach (int v in arr) count[v]++;
    for (int i = 1; i <= k; i++) count[i] += count[i - 1];
    var result = new int[arr.Length];
    for (int i = arr.Length - 1; i >= 0; i--)
    {
        int v = arr[i];
        count[v]--;
        result[count[v]] = v;
    }
    return result;
}
```
