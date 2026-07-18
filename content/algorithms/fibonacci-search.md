---
name: フィボナッチ探索
category: 探索
subcategory: 配列探索
complexity: O(log n)
summary: フィボナッチ数列の比率で分割点を決める、除算を使わずに実装できる二分探索の派生形。
---

## 概要

二分探索は探索範囲を「2で割る」ことで進むが、除算(特に一般的な除算命令)が高コストなハードウェアでは、これがボトルネックになることがある。フィボナッチ探索は、範囲の分割点をフィボナッチ数列(1, 1, 2, 3, 5, 8, 13...)の性質から決めることで、**除算を使わず加算と減算だけ**で二分探索とほぼ同等の探索を実現する。

## 仕組み

1. 配列の長さ以上になる最小のフィボナッチ数 `F(k)` を求める
2. 分割点を `F(k-2)` を使ったオフセットで決める(隣り合うフィボナッチ数の比が黄金比に近づく性質を利用する)
3. 分割点の値と目的の値を比較する
4. 一致すれば終了
5. 目的の値の方が大きければ、探索範囲を右側に移し、使うフィボナッチ数を1段階小さくする(`F(k-1)`基準に切り替える)
6. 目的の値の方が小さければ、探索範囲を左側に絞り、使うフィボナッチ数をさらに1段階小さくする(`F(k-2)`基準に切り替える)
7. 範囲が十分小さくなるまで3〜6を繰り返す

分割点の計算がフィボナッチ数列の足し引きだけで完結するため、除算命令を使わずに実装できるのが最大の特徴。

## 特性・トレードオフ

- **計算量**: O(log n)で二分探索と同じオーダー。ただし比較回数はやや多くなる傾向がある
- **除算不要**: 除算命令が遅い、あるいは存在しない古い/組み込み系のハードウェアで有利になる歴史的背景を持つ手法
- **メモリアクセスの局所性**: 分割が均等な二分探索よりも、隣接する要素へのアクセスが増える場面があり、キャッシュの効き方が変わることがある(ハードウェアやデータサイズに依存)
- **使いどころ**: 現代の一般的なCPUでは除算のコストが二分探索と大差ないため実用上の優位性は薄いが、除算命令が高コストな組み込みシステムや、教育目的で「フィボナッチ数列の黄金比に近い性質」を探索アルゴリズムに応用する例として紹介されることが多い

## 実装例

```python
def fibonacci_search(arr: list[int], target: int) -> int:
    n = len(arr)
    if n == 0:
        return -1
    fib2, fib1 = 0, 1
    fib = fib1 + fib2
    while fib < n:
        fib2 = fib1
        fib1 = fib
        fib = fib1 + fib2
    offset = -1
    while fib > 1:
        i = min(offset + fib2, n - 1)
        if arr[i] < target:
            fib = fib1
            fib1 = fib2
            fib2 = fib - fib1
            offset = i
        elif arr[i] > target:
            fib = fib2
            fib1 = fib1 - fib2
            fib2 = fib - fib1
        else:
            return i
    if fib1 == 1 and offset + 1 < n and arr[offset + 1] == target:
        return offset + 1
    return -1
```

```typescript
function fibonacciSearch(arr: number[], target: number): number {
  const n = arr.length;
  if (n === 0) return -1;
  let fib2 = 0;
  let fib1 = 1;
  let fib = fib1 + fib2;
  while (fib < n) {
    fib2 = fib1;
    fib1 = fib;
    fib = fib1 + fib2;
  }
  let offset = -1;
  while (fib > 1) {
    const i = Math.min(offset + fib2, n - 1);
    if (arr[i] < target) {
      fib = fib1;
      fib1 = fib2;
      fib2 = fib - fib1;
      offset = i;
    } else if (arr[i] > target) {
      fib = fib2;
      fib1 = fib1 - fib2;
      fib2 = fib - fib1;
    } else {
      return i;
    }
  }
  if (fib1 === 1 && offset + 1 < n && arr[offset + 1] === target) return offset + 1;
  return -1;
}
```

```cpp
#include <vector>
#include <algorithm>

int fibonacciSearch(const std::vector<int>& arr, int target) {
    int n = static_cast<int>(arr.size());
    if (n == 0) return -1;
    int fib2 = 0, fib1 = 1;
    int fib = fib1 + fib2;
    while (fib < n) {
        fib2 = fib1;
        fib1 = fib;
        fib = fib1 + fib2;
    }
    int offset = -1;
    while (fib > 1) {
        int i = std::min(offset + fib2, n - 1);
        if (arr[i] < target) {
            fib = fib1;
            fib1 = fib2;
            fib2 = fib - fib1;
            offset = i;
        } else if (arr[i] > target) {
            fib = fib2;
            fib1 = fib1 - fib2;
            fib2 = fib - fib1;
        } else {
            return i;
        }
    }
    if (fib1 == 1 && offset + 1 < n && arr[offset + 1] == target) return offset + 1;
    return -1;
}
```

```rust
fn fibonacci_search(arr: &[i32], target: i32) -> Option<usize> {
    let n = arr.len() as isize;
    if n == 0 {
        return None;
    }
    let mut fib2: isize = 0;
    let mut fib1: isize = 1;
    let mut fib = fib1 + fib2;
    while fib < n {
        fib2 = fib1;
        fib1 = fib;
        fib = fib1 + fib2;
    }
    let mut offset: isize = -1;
    while fib > 1 {
        let i = (offset + fib2).min(n - 1);
        let value = arr[i as usize];
        if value < target {
            fib = fib1;
            fib1 = fib2;
            fib2 = fib - fib1;
            offset = i;
        } else if value > target {
            fib = fib2;
            fib1 -= fib2;
            fib2 = fib - fib1;
        } else {
            return Some(i as usize);
        }
    }
    if fib1 == 1 && offset + 1 < n && arr[(offset + 1) as usize] == target {
        return Some((offset + 1) as usize);
    }
    None
}
```

```csharp
static int FibonacciSearch(int[] arr, int target)
{
    int n = arr.Length;
    if (n == 0) return -1;
    int fib2 = 0, fib1 = 1;
    int fib = fib1 + fib2;
    while (fib < n)
    {
        fib2 = fib1;
        fib1 = fib;
        fib = fib1 + fib2;
    }
    int offset = -1;
    while (fib > 1)
    {
        int i = Math.Min(offset + fib2, n - 1);
        if (arr[i] < target)
        {
            fib = fib1;
            fib1 = fib2;
            fib2 = fib - fib1;
            offset = i;
        }
        else if (arr[i] > target)
        {
            fib = fib2;
            fib1 = fib1 - fib2;
            fib2 = fib - fib1;
        }
        else
        {
            return i;
        }
    }
    if (fib1 == 1 && offset + 1 < n && arr[offset + 1] == target) return offset + 1;
    return -1;
}
```
