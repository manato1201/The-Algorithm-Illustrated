---
name: 二分探索
category: 探索
subcategory: 配列探索
complexity: O(log n)
summary: ソート済み配列を半分ずつ絞り込みながら目的の値を探す。前提条件(整列済み)が鍵。
---

## 概要

辞書で単語を探すとき、最初のページから1枚ずつめくる人はいない。だいたい真ん中あたりを開き、目的の単語がそれより前か後かで探す範囲を半分に絞り込む——この直感的な戦略をアルゴリズムとして定式化したのが二分探索。**配列がソート済みである**という前提さえ満たせば、線形探索のO(n)をO(log n)まで劇的に短縮できる。

## 仕組み

1. 探索範囲を配列全体(先頭〜末尾)に設定する
2. 範囲の中央のインデックスを求め、その値を確認する
3. 中央の値が目的の値と一致すれば終了
4. 目的の値が中央より小さければ、探索範囲を「先頭〜中央の1つ手前」に絞る
5. 目的の値が中央より大きければ、探索範囲を「中央の1つ後〜末尾」に絞る
6. 範囲が空になるまで2〜5を繰り返す。空になっても見つからなければ「存在しない」と判定する

1回の比較のたびに探索範囲がちょうど半分になるため、n個の要素からでもたかだかlog₂n回の比較で答えにたどり着ける。

## 特性・トレードオフ

- **計算量**: O(log n)。100万件のデータでもわずか20回程度の比較で探索が完了する
- **前提条件が厳しい**: 配列がソート済みであることが絶対条件。ソートされていないデータに対しては使えず、頻繁に要素が追加・削除される配列では、ソート状態を維持するコストが探索の高速化分を上回ることもある
- **ランダムアクセスが必要**: 配列のように「中央の要素に一瞬でアクセスできる」データ構造が前提。連結リストのような逐次アクセスしかできない構造には向かない
- **使いどころ**: 一度ソートしてしまえば何度も検索するようなデータ(辞書、社員名簿、ログの二分探索によるバージョン特定など)。ソートのコストを1回払うだけで、以降の全ての検索がO(log n)になる恩恵は大きい

## 実装例

```python
def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1
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
function binarySearch(arr: number[], target: number): number {
  let low = 0;
  let high = arr.length - 1;
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

int binarySearch(const std::vector<int>& arr, int target) {
    int low = 0;
    int high = static_cast<int>(arr.size()) - 1;
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
fn binary_search(arr: &[i32], target: i32) -> Option<usize> {
    if arr.is_empty() {
        return None;
    }
    let mut low: isize = 0;
    let mut high: isize = arr.len() as isize - 1;
    while low <= high {
        let mid = low + (high - low) / 2;
        let value = arr[mid as usize];
        if value == target {
            return Some(mid as usize);
        } else if value < target {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    None
}
```

```csharp
static int BinarySearch(int[] arr, int target)
{
    int low = 0;
    int high = arr.Length - 1;
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
