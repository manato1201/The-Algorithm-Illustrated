---
name: ノームソート(Gnome Sort)
category: ソート
subcategory: 比較ベース
complexity: O(n²)
summary: 前の要素と比較して大小関係が崩れていたら交換して1歩下がる、庭師(ノーム)が植木鉢を並び替える様子になぞらえた極めてシンプルな比較ソート。
---

## 概要

ノームソートは、庭のノーム(小人)が植木鉢の列を前から順に見ていき、「今見ている鉢が前の鉢より小さければ交換して1歩下がる、そうでなければ1歩前に進む」というルールだけで最終的に鉢を大きさ順に並べ替える、という比喩から名付けられた2000年ごろに考案されたソートアルゴリズムである。[挿入ソート](/algorithms/insertion-sort)と同じ最終結果に到達するが、内側と外側の2重ループを使わず、単一のポインタの前進・後退だけで実装できる点が特徴的である。

## 仕組み

1. ポインタ`i`を0で初期化する
2. `i`が配列の末尾に達するまで以下を繰り返す: (a) `i=0`、または`array[i] >= array[i-1]`(順序が正しい)なら、`i`を1つ進める、(b) そうでなければ(順序が崩れていれば)、`array[i]`と`array[i-1]`を交換し、`i`を1つ戻す
3. `i`が配列の末尾に達したら整列完了

`i`が戻る動作が、挿入ソートにおける「正しい位置まで要素を後ろへずらしながら挿入する」内側ループと本質的に同じ効果を持つ。

## 特性・トレードオフ

- **計算量**: 最悪・平均ともに`O(n²)`。[挿入ソート](/algorithms/insertion-sort)と同程度の効率で、ほぼソート済みのデータに対しては`O(n)`に近づく
- **実装の単純さ**: ループが1つだけで、特別なデータ構造もいらないため、教育目的やごく小規模なデータの用途で好まれる
- **安定ソート**: 同じ値を持つ要素同士の相対順序が保たれる
- **使いどころ**: 実務での利用よりも、アルゴリズムの教育・アルゴリズム設計の考え方(単純な局所ルールの繰り返しから大域的な整列が生まれる)を示す例として使われることが多い

## 実装例

```python
def gnome_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    i = 0
    while i < n:
        if i == 0 or arr[i] >= arr[i - 1]:
            i += 1
        else:
            arr[i], arr[i - 1] = arr[i - 1], arr[i]
            i -= 1
    return arr
```

```typescript
function gnomeSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  let i = 0;
  while (i < n) {
    if (i === 0 || result[i] >= result[i - 1]) {
      i++;
    } else {
      [result[i], result[i - 1]] = [result[i - 1], result[i]];
      i--;
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

std::vector<int> gnomeSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    int i = 0;
    while (i < n) {
        if (i == 0 || arr[i] >= arr[i - 1]) {
            i++;
        } else {
            std::swap(arr[i], arr[i - 1]);
            i--;
        }
    }
    return arr;
}
```

```rust
fn gnome_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    let mut i = 0;
    while i < n {
        if i == 0 || arr[i] >= arr[i - 1] {
            i += 1;
        } else {
            arr.swap(i, i - 1);
            i -= 1;
        }
    }
    arr
}
```

```csharp
static int[] GnomeSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    int i = 0;
    while (i < n)
    {
        if (i == 0 || result[i] >= result[i - 1])
        {
            i++;
        }
        else
        {
            (result[i], result[i - 1]) = (result[i - 1], result[i]);
            i--;
        }
    }
    return result;
}
```
