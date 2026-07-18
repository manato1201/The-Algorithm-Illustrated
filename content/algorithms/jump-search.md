---
name: ジャンプ探索
category: 探索
subcategory: 配列探索
complexity: O(√n)
summary: 一定間隔で飛び飛びに調べてから線形探索する。ジャンプコストが低い環境で二分探索より有利な場合がある。
---

## 概要

二分探索と線形探索の中間に位置するアルゴリズム。ソート済み配列を一定間隔で「飛び飛びに」確認していき、目的の値が含まれていそうな区間を特定してから、その区間内だけを線形探索する。二分探索ほど賢くはないが、「後ろに戻れない」「ジャンプにコストがかかる」といった特殊な環境では、この単純さがかえって有利に働くことがある。

## 仕組み

1. ジャンプする間隔を決める(理論上は√nが最適)
2. 配列の先頭から間隔ごとに値を確認していき、「目的の値より大きい値」が現れる直前のブロックまで進む
3. そのブロック(直前のジャンプ位置から現在位置まで)を線形探索し、目的の値を探す
4. 見つかればそのインデックスを返し、見つからなければ「存在しない」と判定する

間隔を√nに設定すると、「ジャンプの回数」と「最後に線形探索する範囲の長さ」がちょうど釣り合い、全体としてO(√n)という計算量になる。

## 特性・トレードオフ

- **計算量**: O(√n)。二分探索のO(log n)より遅いが、線形探索のO(n)よりは大幅に速い
- **前提条件**: 二分探索と同じくソート済み配列が必要
- **「戻れない」環境に強い**: 二分探索は前後に自由にジャンプする必要があるが、ジャンプ探索は基本的に前方への移動のみで完結する。テープ装置のように「後方へのシークコストが非常に高い」記憶媒体では、この一方向性が有利に働く
- **使いどころ**: 磁気テープのような逐次アクセス寄りの記憶装置、あるいは「ジャンプ操作自体にコストがかかり、そのコストが二分探索の分岐回数の多さと見合わない」特殊な環境

## 実装例

```python
import math


def jump_search(arr: list[int], target: int) -> int:
    n = len(arr)
    if n == 0:
        return -1
    block = math.isqrt(n) or 1
    prev = 0
    curr = block
    while prev < n and arr[min(curr, n) - 1] < target:
        prev = curr
        curr += block
    for i in range(prev, min(curr, n)):
        if arr[i] == target:
            return i
    return -1
```

```typescript
function jumpSearch(arr: number[], target: number): number {
  const n = arr.length;
  if (n === 0) return -1;
  const block = Math.floor(Math.sqrt(n)) || 1;
  let prev = 0;
  let curr = block;
  while (prev < n && arr[Math.min(curr, n) - 1] < target) {
    prev = curr;
    curr += block;
  }
  for (let i = prev; i < Math.min(curr, n); i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

int jumpSearch(const std::vector<int>& arr, int target) {
    int n = static_cast<int>(arr.size());
    if (n == 0) return -1;
    int block = static_cast<int>(std::sqrt(static_cast<double>(n)));
    if (block == 0) block = 1;
    int prev = 0;
    int curr = block;
    while (prev < n && arr[std::min(curr, n) - 1] < target) {
        prev = curr;
        curr += block;
    }
    for (int i = prev; i < std::min(curr, n); i++) {
        if (arr[i] == target) return i;
    }
    return -1;
}
```

```rust
fn jump_search(arr: &[i32], target: i32) -> Option<usize> {
    let n = arr.len();
    if n == 0 {
        return None;
    }
    let block = ((n as f64).sqrt() as usize).max(1);
    let mut prev = 0;
    let mut curr = block;
    while prev < n && arr[curr.min(n) - 1] < target {
        prev = curr;
        curr += block;
    }
    for i in prev..curr.min(n) {
        if arr[i] == target {
            return Some(i);
        }
    }
    None
}
```

```csharp
static int JumpSearch(int[] arr, int target)
{
    int n = arr.Length;
    if (n == 0) return -1;
    int block = (int)Math.Sqrt(n);
    if (block == 0) block = 1;
    int prev = 0;
    int curr = block;
    while (prev < n && arr[Math.Min(curr, n) - 1] < target)
    {
        prev = curr;
        curr += block;
    }
    for (int i = prev; i < Math.Min(curr, n); i++)
    {
        if (arr[i] == target) return i;
    }
    return -1;
}
```
