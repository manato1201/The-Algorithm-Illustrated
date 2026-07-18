---
name: 線形探索
category: 探索
subcategory: 配列探索
complexity: O(n)
summary: 先頭から順に調べる最も単純な探索。前処理不要でどんなデータにも使える。
---

## 概要

配列の先頭から末尾に向かって、目的の値が見つかるまで1つずつ確認していく——探索アルゴリズムの中で最も直感的で、最も制約が少ない手法。ソートされている必要も、特別なデータ構造も要らない。「何も工夫しなければどうなるか」の基準点であり、他の探索アルゴリズムの速さを測る物差しでもある。

## 仕組み

1. 配列の先頭(インデックス0)から確認を始める
2. 現在の要素が目的の値と一致するか調べる
3. 一致すればそのインデックスを返して終了
4. 一致しなければ次の要素に進み、2〜3を繰り返す
5. 末尾まで調べても見つからなければ「存在しない」と判定する

## 特性・トレードオフ

- **計算量**: 最悪・平均ともにO(n)。目的の値が末尾近くにある場合や存在しない場合は、配列全体を調べることになる
- **前提条件がない**: データがソートされている必要がなく、どんな配列にもそのまま適用できる。二分探索のように「事前にソートしておくコスト」を払う必要がない
- **逐次アクセスに強い**: 配列だけでなく、連結リストのように「先頭から順にしかアクセスできない」データ構造にも適用できる
- **使いどころ**: データ量が少ない場合、ソートされていないデータ、あるいは1回しか探索しないため事前ソートのコストが見合わない場合。データ量が多く繰り返し探索するなら、二分探索やハッシュテーブルへの切り替えを検討すべき

## 実装例

```python
def linear_search(arr: list[int], target: int) -> int:
    for i, value in enumerate(arr):
        if value == target:
            return i
    return -1
```

```typescript
function linearSearch(arr: number[], target: number): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}
```

```cpp
#include <vector>

int linearSearch(const std::vector<int>& arr, int target) {
    for (int i = 0; i < static_cast<int>(arr.size()); i++) {
        if (arr[i] == target) return i;
    }
    return -1;
}
```

```rust
fn linear_search(arr: &[i32], target: i32) -> Option<usize> {
    for (i, &value) in arr.iter().enumerate() {
        if value == target {
            return Some(i);
        }
    }
    None
}
```

```csharp
static int LinearSearch(int[] arr, int target)
{
    for (int i = 0; i < arr.Length; i++)
    {
        if (arr[i] == target) return i;
    }
    return -1;
}
```
