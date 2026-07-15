---
name: 挿入ソート
category: ソート
subcategory: 比較ベース
complexity: O(n²)
summary: 整列済み部分に1つずつ挿入していく。ほぼ整列済みのデータに対しては高速に動く。
---

## 概要

トランプの手札を並べ替えるときの動きに近い。整列済みの部分を左側に育てていき、右側から取り出した1枚を、整列済み部分の適切な位置に差し込む——これを配列の末尾まで繰り返す。素朴な見た目とは裏腹に、データがほぼ整列済みの場合には非常に高速に動く実用的な性質を持つ。

## 仕組み

1. 配列の2番目の要素から処理を始める(1要素だけの配列は常に整列済みとみなせる)
2. 処理対象の要素を取り出す
3. 整列済み部分(その左側)を右から左へ走査し、取り出した値より大きい要素を1つずつ右にずらす
4. 取り出した値より小さい(または等しい)要素が見つかったら、その直後に挿入する
5. 末尾まで繰り返す

この可視化では、取り出した要素を「基準/ポインタ」、比較している要素を「比較中」、ずらす(交換する)瞬間を「交換中」で示している。

## 特性・トレードオフ

- **計算量**: 最悪・平均はO(n²)だが、**ほぼ整列済みのデータではO(n)に近づく**(ずらす回数が少なくて済むため)
- **安定ソート**: 同じ値の要素同士の相対順序が保たれる
- **オンラインアルゴリズム**: データを1つずつ受け取りながら逐次整列できる(配列全体が最初から揃っている必要がない)
- **実務での立ち位置**: 単体では大規模データに向かないが、この性質を活かして**Timsortなど高速ソートの内部で「小さな区間の仕上げ」として使われる**ことが多い

## 実装例

```python
def insertion_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr
```

```typescript
function insertionSort(arr: number[]): number[] {
  const result = [...arr];
  for (let i = 1; i < result.length; i++) {
    const key = result[i];
    let j = i - 1;
    while (j >= 0 && result[j] > key) {
      result[j + 1] = result[j];
      j--;
    }
    result[j + 1] = key;
  }
  return result;
}
```

```cpp
#include <vector>

std::vector<int> insertionSort(std::vector<int> arr) {
    for (size_t i = 1; i < arr.size(); i++) {
        int key = arr[i];
        int j = static_cast<int>(i) - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
    return arr;
}
```

```rust
fn insertion_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    for i in 1..arr.len() {
        let key = arr[i];
        let mut j = i as isize - 1;
        while j >= 0 && arr[j as usize] > key {
            arr[(j + 1) as usize] = arr[j as usize];
            j -= 1;
        }
        arr[(j + 1) as usize] = key;
    }
    arr
}
```

```csharp
static int[] InsertionSort(int[] arr)
{
    var result = (int[])arr.Clone();
    for (int i = 1; i < result.Length; i++)
    {
        int key = result[i];
        int j = i - 1;
        while (j >= 0 && result[j] > key)
        {
            result[j + 1] = result[j];
            j--;
        }
        result[j + 1] = key;
    }
    return result;
}
```
