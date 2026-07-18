---
name: サイクルソート
category: ソート
subcategory: 比較ベース
complexity: O(n²)
summary: 書き込み回数を理論上の最小(各要素1回)に抑える、書き込みコストが高い記憶媒体向けの特殊ソート。
---

## 概要

ほとんどのソートアルゴリズムは「比較回数」の最小化を目指すが、サイクルソートは発想が異なり、**メモリへの書き込み回数**を理論上の最小値まで削り込むことに特化している。整列済みの配列では、各要素はちょうど1回の書き込みで最終位置に収まる——サイクルソートはこの理論的下限を実際に達成する、数少ないアルゴリズムのひとつ。

## 仕組み

1. 配列の先頭から要素を1つ取り出し、それが最終的に収まるべき位置(その値より小さい要素の個数から計算できる)を求める
2. その位置に既にある要素を追い出し、取り出しておいた要素をそこに書き込む
3. 追い出した要素についても同様に、収まるべき位置を求めて書き込む——という「玉突き」を、最初に取り出した要素の位置に戻ってくるまで繰り返す(この一連の玉突きを「サイクル」と呼ぶ)
4. 1つのサイクルが閉じたら、まだ処理していない先頭位置に移り、同じ手順を繰り返す

各要素は自分の最終位置が確定した瞬間に一度だけ書き込まれ、二度と動かされない。これが「書き込み回数が要素数と等しい(n回)」という最小性の根拠になっている。

## 特性・トレードオフ

- **計算量**: 比較回数はO(n²)で、他のO(n²)ソートと比べて特別速いわけではない。**書き込み回数だけがO(n)に抑えられる**という、比較と書き込みのトレードオフが際立つ特殊な性質を持つ
- **不安定ソート**: 玉突きの過程で要素が大きく飛び移るため、同じ値の相対順序は保たれない
- **追加メモリ不要**: in-placeで動作する
- **使いどころ**: フラッシュメモリやEEPROMのように「書き込み回数に上限がある、または書き込みコストが読み込みよりずっと高い」記憶媒体を扱う組み込みシステムなど、通常のソートでは考慮しない指標が重要になる特殊な場面

## 実装例(書き込み回数を最小化するサイクル単位の配置)

```python
def cycle_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    for cycle_start in range(n - 1):
        item = arr[cycle_start]
        pos = cycle_start
        for i in range(cycle_start + 1, n):
            if arr[i] < item:
                pos += 1
        if pos == cycle_start:
            continue
        while item == arr[pos]:
            pos += 1
        arr[pos], item = item, arr[pos]
        while pos != cycle_start:
            pos = cycle_start
            for i in range(cycle_start + 1, n):
                if arr[i] < item:
                    pos += 1
            while item == arr[pos]:
                pos += 1
            arr[pos], item = item, arr[pos]
    return arr
```

```typescript
function cycleSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  for (let cycleStart = 0; cycleStart < n - 1; cycleStart++) {
    let item = result[cycleStart];
    let pos = cycleStart;
    for (let i = cycleStart + 1; i < n; i++) {
      if (result[i] < item) pos++;
    }
    if (pos === cycleStart) continue;
    while (item === result[pos]) pos++;
    [result[pos], item] = [item, result[pos]];
    while (pos !== cycleStart) {
      pos = cycleStart;
      for (let i = cycleStart + 1; i < n; i++) {
        if (result[i] < item) pos++;
      }
      while (item === result[pos]) pos++;
      [result[pos], item] = [item, result[pos]];
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

std::vector<int> cycleSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    for (int cycleStart = 0; cycleStart < n - 1; cycleStart++) {
        int item = arr[cycleStart];
        int pos = cycleStart;
        for (int i = cycleStart + 1; i < n; i++) {
            if (arr[i] < item) pos++;
        }
        if (pos == cycleStart) continue;
        while (item == arr[pos]) pos++;
        std::swap(item, arr[pos]);
        while (pos != cycleStart) {
            pos = cycleStart;
            for (int i = cycleStart + 1; i < n; i++) {
                if (arr[i] < item) pos++;
            }
            while (item == arr[pos]) pos++;
            std::swap(item, arr[pos]);
        }
    }
    return arr;
}
```

```rust
fn cycle_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    if n < 2 {
        return arr;
    }
    for cycle_start in 0..n - 1 {
        let mut item = arr[cycle_start];
        let mut pos = cycle_start;
        for i in (cycle_start + 1)..n {
            if arr[i] < item {
                pos += 1;
            }
        }
        if pos == cycle_start {
            continue;
        }
        while item == arr[pos] {
            pos += 1;
        }
        std::mem::swap(&mut item, &mut arr[pos]);
        while pos != cycle_start {
            pos = cycle_start;
            for i in (cycle_start + 1)..n {
                if arr[i] < item {
                    pos += 1;
                }
            }
            while item == arr[pos] {
                pos += 1;
            }
            std::mem::swap(&mut item, &mut arr[pos]);
        }
    }
    arr
}
```

```csharp
static int[] CycleSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    for (int cycleStart = 0; cycleStart < n - 1; cycleStart++)
    {
        int item = result[cycleStart];
        int pos = cycleStart;
        for (int i = cycleStart + 1; i < n; i++)
        {
            if (result[i] < item) pos++;
        }
        if (pos == cycleStart) continue;
        while (item == result[pos]) pos++;
        (result[pos], item) = (item, result[pos]);
        while (pos != cycleStart)
        {
            pos = cycleStart;
            for (int i = cycleStart + 1; i < n; i++)
            {
                if (result[i] < item) pos++;
            }
            while (item == result[pos]) pos++;
            (result[pos], item) = (item, result[pos]);
        }
    }
    return result;
}
```
