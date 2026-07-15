---
name: シェルソート
category: ソート
subcategory: 比較ベース
complexity: O(n log n) 〜 O(n²)
summary: 挿入ソートを間隔を空けて繰り返し適用し、徐々に間隔を詰めていく改良版。
---

## 概要

挿入ソートは「ほぼ整列済みのデータ」には強いが、要素が大きく離れた位置にある場合は1つずつしかずらせず遅い。シェルソートはこの弱点を、まず離れた要素同士を先に整列させておくことで補う。1959年にドナルド・シェルが考案した、挿入ソートの直系の改良版。

## 仕組み

1. 適当な「間隔(gap)」を決める(配列の長さの半分など)
2. その間隔だけ離れた要素同士のグループに対して、挿入ソートを適用する
3. 間隔を徐々に狭めながら(例: 半分ずつ)同じ操作を繰り返す
4. 最終的に間隔が1になったとき、通常の挿入ソートを1回行うのと同じ状態になるが、この時点で配列はほぼ整列済みに近づいているため非常に高速に終わる

間隔の縮め方(gap sequence)には複数の流派があり、選び方によって計算量の理論値が変わる。単純な「半分ずつ」は実装が簡単な反面、性能面ではより工夫されたシーケンス(Knuth列など)に劣る。

## 特性・トレードオフ

- **計算量**: gap sequenceの選び方次第でO(n log n)からO(n²)まで変動する。挿入ソートのO(n²)より確実に改善するが、クイックソートやマージソートのような安定したO(n log n)の保証はない
- **不安定ソート**: 離れた要素同士を先に交換するため、同じ値の相対順序が保たれない
- **追加メモリ不要**: in-placeで動作する
- **実務での立ち位置**: 単純な実装のわりに実測は速く、ライブラリの依存を避けたい組み込み環境や、中規模データのソートに使われることがある。データ量が大きい場面ではクイックソートやTimsortに譲る

## 実装例(gap = n/2 ずつ縮める単純な方式)

```python
def shell_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    gap = n // 2
    while gap > 0:
        for i in range(gap, n):
            temp = arr[i]
            j = i
            while j >= gap and arr[j - gap] > temp:
                arr[j] = arr[j - gap]
                j -= gap
            arr[j] = temp
        gap //= 2
    return arr
```

```typescript
function shellSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  let gap = Math.floor(n / 2);
  while (gap > 0) {
    for (let i = gap; i < n; i++) {
      const temp = result[i];
      let j = i;
      while (j >= gap && result[j - gap] > temp) {
        result[j] = result[j - gap];
        j -= gap;
      }
      result[j] = temp;
    }
    gap = Math.floor(gap / 2);
  }
  return result;
}
```

```cpp
#include <vector>

std::vector<int> shellSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    for (int gap = n / 2; gap > 0; gap /= 2) {
        for (int i = gap; i < n; i++) {
            int temp = arr[i];
            int j = i;
            while (j >= gap && arr[j - gap] > temp) {
                arr[j] = arr[j - gap];
                j -= gap;
            }
            arr[j] = temp;
        }
    }
    return arr;
}
```

```rust
fn shell_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    let mut gap = n / 2;
    while gap > 0 {
        for i in gap..n {
            let temp = arr[i];
            let mut j = i;
            while j >= gap && arr[j - gap] > temp {
                arr[j] = arr[j - gap];
                j -= gap;
            }
            arr[j] = temp;
        }
        gap /= 2;
    }
    arr
}
```

```csharp
static int[] ShellSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    for (int gap = n / 2; gap > 0; gap /= 2)
    {
        for (int i = gap; i < n; i++)
        {
            int temp = result[i];
            int j = i;
            while (j >= gap && result[j - gap] > temp)
            {
                result[j] = result[j - gap];
                j -= gap;
            }
            result[j] = temp;
        }
    }
    return result;
}
```
