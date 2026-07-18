---
name: パンケーキソート
category: ソート
subcategory: 比較ベース
complexity: O(n²)
summary: 先頭からのひっくり返し操作だけで整列する。比較よりも「操作回数」の最小化という制約付き設定のおもしろさが本質。
---

## 概要

積み重なったパンケーキを、大きさの順に並べ替えたい。ただし使えるのは「上からk枚をまとめてひっくり返す(フリップする)」という操作だけ——という、一風変わった制約のもとで整列を行う問題。実務で使われることはまずないが、「限られた操作だけでどう目的を達成するか」を考えさせる、計算機科学の楽しいパズルとして有名(かつてスティーブ・ジョブズが関わった論文があることでも知られる)。

## 仕組み

1. 未整列部分の中から最大の要素を探す
2. その要素が先頭に来るように、最大要素の位置までを1回フリップする
3. 続けて、未整列部分全体をフリップする。これにより、先頭にあった最大要素が未整列部分の末尾(=正しい位置)に移動する
4. 未整列部分の範囲を1つ縮めて、1〜3を繰り返す

比較の回数ではなく「フリップの回数」を数えるのがこの問題の特徴で、最小のフリップ回数で並べ替える問題(パンケーキ数)は今なお完全には解明されていない研究対象でもある。

## 特性・トレードオフ

- **計算量**: この単純な手法ではO(n²)回のフリップで整列できる。最小フリップ回数を求める最適化はNP困難に近い難しさを持つとされる
- **制約付きの操作モデル**: 「任意の2要素を交換する」のではなく「先頭からk枚をひっくり返す」という限定的な操作しか使えない点が、通常のソートと本質的に異なる
- **実務での立ち位置**: ネットワーク設計(トポロジーの再構成コスト最小化)やゲノム学(染色体の逆位変異のモデル化)など、「連続する範囲を丸ごと反転する」操作が現実の制約と対応する分野で類似の問題設定が登場する

## 実装例

```python
def pancake_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    for size in range(n, 1, -1):
        max_idx = _max_index(arr, size)
        if max_idx != size - 1:
            _flip(arr, max_idx)
            _flip(arr, size - 1)
    return arr

def _max_index(arr: list[int], size: int) -> int:
    max_idx = 0
    for i in range(1, size):
        if arr[i] > arr[max_idx]:
            max_idx = i
    return max_idx

def _flip(arr: list[int], k: int) -> None:
    lo, hi = 0, k
    while lo < hi:
        arr[lo], arr[hi] = arr[hi], arr[lo]
        lo += 1
        hi -= 1
```

```typescript
function pancakeSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  for (let size = n; size > 1; size--) {
    const idx = maxIndex(result, size);
    if (idx !== size - 1) {
      flip(result, idx);
      flip(result, size - 1);
    }
  }
  return result;
}

function maxIndex(arr: number[], size: number): number {
  let maxIdx = 0;
  for (let i = 1; i < size; i++) {
    if (arr[i] > arr[maxIdx]) maxIdx = i;
  }
  return maxIdx;
}

function flip(arr: number[], k: number): void {
  let lo = 0;
  let hi = k;
  while (lo < hi) {
    [arr[lo], arr[hi]] = [arr[hi], arr[lo]];
    lo++;
    hi--;
  }
}
```

```cpp
#include <vector>
#include <utility>

int maxIndex(const std::vector<int>& arr, int size) {
    int maxIdx = 0;
    for (int i = 1; i < size; i++) {
        if (arr[i] > arr[maxIdx]) maxIdx = i;
    }
    return maxIdx;
}

void flip(std::vector<int>& arr, int k) {
    int lo = 0, hi = k;
    while (lo < hi) {
        std::swap(arr[lo], arr[hi]);
        lo++;
        hi--;
    }
}

std::vector<int> pancakeSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    for (int size = n; size > 1; size--) {
        int idx = maxIndex(arr, size);
        if (idx != size - 1) {
            flip(arr, idx);
            flip(arr, size - 1);
        }
    }
    return arr;
}
```

```rust
fn max_index(arr: &[i32], size: usize) -> usize {
    let mut max_idx = 0;
    for i in 1..size {
        if arr[i] > arr[max_idx] {
            max_idx = i;
        }
    }
    max_idx
}

fn flip(arr: &mut [i32], k: usize) {
    let mut lo = 0;
    let mut hi = k;
    while lo < hi {
        arr.swap(lo, hi);
        lo += 1;
        hi -= 1;
    }
}

fn pancake_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let mut size = arr.len();
    while size > 1 {
        let idx = max_index(&arr, size);
        if idx != size - 1 {
            flip(&mut arr, idx);
            flip(&mut arr, size - 1);
        }
        size -= 1;
    }
    arr
}
```

```csharp
static int MaxIndex(int[] arr, int size)
{
    int maxIdx = 0;
    for (int i = 1; i < size; i++)
    {
        if (arr[i] > arr[maxIdx]) maxIdx = i;
    }
    return maxIdx;
}

static void Flip(int[] arr, int k)
{
    int lo = 0, hi = k;
    while (lo < hi)
    {
        (arr[lo], arr[hi]) = (arr[hi], arr[lo]);
        lo++;
        hi--;
    }
}

static int[] PancakeSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    for (int size = n; size > 1; size--)
    {
        int idx = MaxIndex(result, size);
        if (idx != size - 1)
        {
            Flip(result, idx);
            Flip(result, size - 1);
        }
    }
    return result;
}
```
