---
name: 奇偶転置ソート(Odd-Even Sort)
category: ソート
subcategory: 比較ベース
complexity: O(n²)(逐次実行)、O(n)(n個のプロセッサによる並列実行)
summary: 奇数番目と偶数番目のペアの比較・交換を交互に繰り返す、並列計算機での実装を念頭に設計された比較ソート。
---

## 概要

奇偶転置ソート(ブリックソートとも呼ばれる)は、[バブルソート](/algorithms/bubble-sort)の隣接要素比較という発想を保ちながら、「奇数番目の要素とその次の要素」「偶数番目の要素とその次の要素」という2種類の比較・交換フェーズを交互に繰り返すよう再構成したアルゴリズムである。同じフェーズ内の比較・交換は互いに独立している(隣接ペアが重ならない)ため、複数のプロセッサに1つずつペアを割り当てて同時に処理できる、並列計算を念頭に置いた設計になっている。

## 仕組み

1. 配列がソート済みでない間、以下の2つのフェーズを交互に繰り返す
2. **奇数フェーズ**: インデックス1,3,5,...(奇数位置)を起点に、`array[i]`と`array[i+1]`を比較し、順序が逆なら交換する。これを配列全体に対して行う
3. **偶数フェーズ**: インデックス0,2,4,...(偶数位置)を起点に、同様の比較・交換を行う
4. どちらのフェーズでも1回も交換が発生しなかったら、配列がソート済みであることが確定し終了する

各フェーズ内の比較・交換対象のペアは互いに重ならない(添字が衝突しない)ため、逐次実行でも並列実行でも同じ結果になることが保証される。

## 特性・トレードオフ

- **計算量**: 逐次実行では最悪`O(n²)`(バブルソートと同程度)だが、`n`個のプロセッサを使った並列実行では`O(n)`フェーズで完了する——同じフェーズ内の全ペアが独立して同時に処理できるためである
- **並列化のしやすさ**: 比較のたびに前の結果を待つ必要がある通常のバブルソートと異なり、フェーズ内の全比較が独立しているため、SIMD命令やGPU、専用ハードウェア(ソーティングネットワーク)への実装に適している
- **安定ソート**: 同じ値を持つ要素同士の相対順序が保たれる
- **使いどころ**: 並列計算環境(GPU、FPGA、専用ハードウェアのソーティングネットワーク)における小〜中規模データのソート、[並列マージソート](/algorithms/parallel-merge-sort)ほど複雑な実装を必要としない並列ソートの入門的な例

## 実装例

```python
def odd_even_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    is_sorted = False
    while not is_sorted:
        is_sorted = True
        for i in range(1, n - 1, 2):
            if arr[i] > arr[i + 1]:
                arr[i], arr[i + 1] = arr[i + 1], arr[i]
                is_sorted = False
        for i in range(0, n - 1, 2):
            if arr[i] > arr[i + 1]:
                arr[i], arr[i + 1] = arr[i + 1], arr[i]
                is_sorted = False
    return arr
```

```typescript
function oddEvenSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  let sorted = false;
  while (!sorted) {
    sorted = true;
    for (let i = 1; i < n - 1; i += 2) {
      if (result[i] > result[i + 1]) {
        [result[i], result[i + 1]] = [result[i + 1], result[i]];
        sorted = false;
      }
    }
    for (let i = 0; i < n - 1; i += 2) {
      if (result[i] > result[i + 1]) {
        [result[i], result[i + 1]] = [result[i + 1], result[i]];
        sorted = false;
      }
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

std::vector<int> oddEvenSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    bool sorted = false;
    while (!sorted) {
        sorted = true;
        for (int i = 1; i < n - 1; i += 2) {
            if (arr[i] > arr[i + 1]) {
                std::swap(arr[i], arr[i + 1]);
                sorted = false;
            }
        }
        for (int i = 0; i < n - 1; i += 2) {
            if (arr[i] > arr[i + 1]) {
                std::swap(arr[i], arr[i + 1]);
                sorted = false;
            }
        }
    }
    return arr;
}
```

```rust
fn odd_even_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    if n < 2 {
        return arr;
    }
    let mut sorted = false;
    while !sorted {
        sorted = true;
        let mut i = 1;
        while i < n - 1 {
            if arr[i] > arr[i + 1] {
                arr.swap(i, i + 1);
                sorted = false;
            }
            i += 2;
        }
        let mut i = 0;
        while i < n - 1 {
            if arr[i] > arr[i + 1] {
                arr.swap(i, i + 1);
                sorted = false;
            }
            i += 2;
        }
    }
    arr
}
```

```csharp
static int[] OddEvenSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    bool sorted = false;
    while (!sorted)
    {
        sorted = true;
        for (int i = 1; i < n - 1; i += 2)
        {
            if (result[i] > result[i + 1])
            {
                (result[i], result[i + 1]) = (result[i + 1], result[i]);
                sorted = false;
            }
        }
        for (int i = 0; i < n - 1; i += 2)
        {
            if (result[i] > result[i + 1])
            {
                (result[i], result[i + 1]) = (result[i + 1], result[i]);
                sorted = false;
            }
        }
    }
    return result;
}
```
