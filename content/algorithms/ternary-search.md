---
name: 三分探索
category: 探索
subcategory: 配列探索
complexity: O(log n)
summary: 単峰関数の極値探索に使う、二分探索の派生形。
---

## 概要

二分探索が「ソート済み配列から特定の値を探す」のに対し、三分探索は少し目的が異なる——**単峰関数(unimodal function、山が1つだけの関数)の最大値・最小値を探す**ために使われる。範囲を2つではなく3つに分割することからこの名がついた。

## 仕組み

1. 探索範囲(左端・右端)を関数の定義域全体に設定する
2. 範囲を三等分する2点(m1, m2)を求め、それぞれの関数値を計算する
3. f(m1) < f(m2) であれば、最大値はm1より左には存在しないので、探索範囲を「m1〜右端」に絞る(最小値を探す場合は不等号が逆になる)
4. f(m1) ≥ f(m2) であれば、探索範囲を「左端〜m2」に絞る
5. 範囲が十分小さくなるまで2〜4を繰り返す

「山が1つしかない」という単峰性が成り立っていれば、どちらの方向に極値があるかを2点の比較だけで判定できる。これが三分探索の前提条件であり、同時に適用範囲を限定する制約でもある。

## 特性・トレードオフ

- **計算量**: O(log n)だが、1回の絞り込みで2点の関数評価が必要なため、**同じ精度を得るのに必要な関数評価の回数は二分探索より多くなる**(黄金分割探索など、評価回数を減らす改良版も存在する)
- **前提条件**: 対象の関数が単峰であること(増加してから減少する、あるいはその逆、という形が保証されていること)。単峰でない関数(山が複数ある)には正しく適用できない
- **離散版と連続版**: 整数のインデックスに対する離散的な三分探索と、実数の範囲に対する連続的な三分探索の両方が存在し、境界条件の扱いが微妙に異なる
- **使いどころ**: 「ある値を境に増加から減少に転じる」ことがわかっている最適化問題(競技プログラミングでの凸関数の最適化、物理シミュレーションでの極値探索など)

## 実装例

ここでは、ソート済み配列を3分割して探索する版(範囲を三等分する2点で目的の値との大小を比較し、範囲を絞り込む)として実装する。

```python
def ternary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1
    while low <= high:
        if low == high:
            return low if arr[low] == target else -1
        third = (high - low) // 3
        m1 = low + third
        m2 = high - third
        if arr[m1] == target:
            return m1
        if arr[m2] == target:
            return m2
        if target < arr[m1]:
            high = m1 - 1
        elif target > arr[m2]:
            low = m2 + 1
        else:
            low = m1 + 1
            high = m2 - 1
    return -1
```

```typescript
function ternarySearch(arr: number[], target: number): number {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    if (low === high) {
      return arr[low] === target ? low : -1;
    }
    const third = Math.floor((high - low) / 3);
    const m1 = low + third;
    const m2 = high - third;
    if (arr[m1] === target) return m1;
    if (arr[m2] === target) return m2;
    if (target < arr[m1]) high = m1 - 1;
    else if (target > arr[m2]) low = m2 + 1;
    else {
      low = m1 + 1;
      high = m2 - 1;
    }
  }
  return -1;
}
```

```cpp
#include <vector>

int ternarySearch(const std::vector<int>& arr, int target) {
    int low = 0;
    int high = static_cast<int>(arr.size()) - 1;
    while (low <= high) {
        if (low == high) {
            return arr[low] == target ? low : -1;
        }
        int third = (high - low) / 3;
        int m1 = low + third;
        int m2 = high - third;
        if (arr[m1] == target) return m1;
        if (arr[m2] == target) return m2;
        if (target < arr[m1]) high = m1 - 1;
        else if (target > arr[m2]) low = m2 + 1;
        else {
            low = m1 + 1;
            high = m2 - 1;
        }
    }
    return -1;
}
```

```rust
fn ternary_search(arr: &[i32], target: i32) -> Option<usize> {
    if arr.is_empty() {
        return None;
    }
    let mut low: isize = 0;
    let mut high: isize = arr.len() as isize - 1;
    while low <= high {
        if low == high {
            return if arr[low as usize] == target { Some(low as usize) } else { None };
        }
        let third = (high - low) / 3;
        let m1 = low + third;
        let m2 = high - third;
        if arr[m1 as usize] == target {
            return Some(m1 as usize);
        }
        if arr[m2 as usize] == target {
            return Some(m2 as usize);
        }
        if target < arr[m1 as usize] {
            high = m1 - 1;
        } else if target > arr[m2 as usize] {
            low = m2 + 1;
        } else {
            low = m1 + 1;
            high = m2 - 1;
        }
    }
    None
}
```

```csharp
static int TernarySearch(int[] arr, int target)
{
    int low = 0;
    int high = arr.Length - 1;
    while (low <= high)
    {
        if (low == high)
        {
            return arr[low] == target ? low : -1;
        }
        int third = (high - low) / 3;
        int m1 = low + third;
        int m2 = high - third;
        if (arr[m1] == target) return m1;
        if (arr[m2] == target) return m2;
        if (target < arr[m1]) high = m1 - 1;
        else if (target > arr[m2]) low = m2 + 1;
        else
        {
            low = m1 + 1;
            high = m2 - 1;
        }
    }
    return -1;
}
```
