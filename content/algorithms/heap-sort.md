---
name: ヒープソート
category: ソート
subcategory: 比較ベース
complexity: O(n log n)
summary: 二分ヒープを使い、追加メモリなしで整列できる。安定性はないが最悪ケースも保証される。
---

## 概要

配列を「二分ヒープ」というデータ構造とみなして整列させる手法。二分ヒープは「親が子より必ず大きい(または小さい)」という性質を持つ木構造で、この性質を利用すると最大値を効率よく取り出し続けることができる。マージソートのような追加メモリを必要とせず、それでいて最悪ケースでもO(n log n)を保証できるのが最大の特徴。

## 仕組み

**フェーズ1: 最大ヒープの構築**
1. 配列を二分木とみなす(i番目の要素の子はおおよそ2i+1番目・2i+2番目)
2. 末尾に近い「葉に近いノード」から順に、親と子を比較し、子の方が大きければ交換する(sift down)
3. これを根に向かって繰り返すと、配列全体が「親は必ず子以上」という最大ヒープになる

**フェーズ2: 抽出**
1. ヒープの根(=配列の先頭=全体の最大値)を、ヒープの末尾要素と交換する
2. ヒープの範囲を1つ縮める(交換で末尾に来た最大値はもうヒープの一部として扱わない)
3. 根に対して再びsift downを行い、ヒープの性質を回復する
4. ヒープの範囲が1になるまで繰り返す

この可視化では、親子の比較を「比較中」、値の交換を「交換中」、抽出されて最終位置に確定した要素を「確定」で示している。

## 特性・トレードオフ

- **計算量**: 構築・抽出ともにO(n log n)で、**最悪ケースでも崩れない**(クイックソートのような偏りによる劣化がない)
- **追加メモリ不要**: 配列自体をヒープとして扱うため、マージソートのような追加バッファが不要
- **不安定ソート**: 遠く離れた要素を交換するため、同じ値の相対順序は保たれない
- **実務での立ち位置**: 「最悪ケースの保証」と「省メモリ」を両立できるため、組み込み環境やIntrosort(クイックソート+ヒープソートのハイブリッド)の安全弁として使われる。一方でキャッシュ局所性(メモリ上の近い場所に順にアクセスする性質)がクイックソートより劣るため、平均速度では劣ることが多い

## 実装例

```python
def heap_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)

    def sift_down(size: int, root: int) -> None:
        largest = root
        left, right = 2 * root + 1, 2 * root + 2
        if left < size and arr[left] > arr[largest]:
            largest = left
        if right < size and arr[right] > arr[largest]:
            largest = right
        if largest != root:
            arr[root], arr[largest] = arr[largest], arr[root]
            sift_down(size, largest)

    for i in range(n // 2 - 1, -1, -1):
        sift_down(n, i)
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]
        sift_down(end, 0)
    return arr
```

```typescript
function heapSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;

  function siftDown(size: number, root: number): void {
    let largest = root;
    const left = 2 * root + 1;
    const right = 2 * root + 2;
    if (left < size && result[left] > result[largest]) largest = left;
    if (right < size && result[right] > result[largest]) largest = right;
    if (largest !== root) {
      [result[root], result[largest]] = [result[largest], result[root]];
      siftDown(size, largest);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(n, i);
  for (let end = n - 1; end > 0; end--) {
    [result[0], result[end]] = [result[end], result[0]];
    siftDown(end, 0);
  }
  return result;
}
```

```cpp
#include <vector>
#include <utility>

void siftDown(std::vector<int>& arr, int size, int root) {
    int largest = root;
    int left = 2 * root + 1, right = 2 * root + 2;
    if (left < size && arr[left] > arr[largest]) largest = left;
    if (right < size && arr[right] > arr[largest]) largest = right;
    if (largest != root) {
        std::swap(arr[root], arr[largest]);
        siftDown(arr, size, largest);
    }
}

std::vector<int> heapSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    for (int i = n / 2 - 1; i >= 0; i--) siftDown(arr, n, i);
    for (int end = n - 1; end > 0; end--) {
        std::swap(arr[0], arr[end]);
        siftDown(arr, end, 0);
    }
    return arr;
}
```

```rust
fn sift_down(arr: &mut [i32], size: usize, root: usize) {
    let mut largest = root;
    let left = 2 * root + 1;
    let right = 2 * root + 2;
    if left < size && arr[left] > arr[largest] {
        largest = left;
    }
    if right < size && arr[right] > arr[largest] {
        largest = right;
    }
    if largest != root {
        arr.swap(root, largest);
        sift_down(arr, size, largest);
    }
}

fn heap_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    for i in (0..n / 2).rev() {
        sift_down(&mut arr, n, i);
    }
    for end in (1..n).rev() {
        arr.swap(0, end);
        sift_down(&mut arr, end, 0);
    }
    arr
}
```

```csharp
static void SiftDown(int[] arr, int size, int root)
{
    int largest = root;
    int left = 2 * root + 1, right = 2 * root + 2;
    if (left < size && arr[left] > arr[largest]) largest = left;
    if (right < size && arr[right] > arr[largest]) largest = right;
    if (largest != root)
    {
        (arr[root], arr[largest]) = (arr[largest], arr[root]);
        SiftDown(arr, size, largest);
    }
}

static int[] HeapSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    for (int i = n / 2 - 1; i >= 0; i--) SiftDown(result, n, i);
    for (int end = n - 1; end > 0; end--)
    {
        (result[0], result[end]) = (result[end], result[0]);
        SiftDown(result, end, 0);
    }
    return result;
}
```
