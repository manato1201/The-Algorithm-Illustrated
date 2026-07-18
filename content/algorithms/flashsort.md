---
name: フラッシュソート(Flashsort)
category: ソート
subcategory: 非比較ベース
complexity: O(n)(データがほぼ一様分布の場合)、O(n²)(最悪ケース)
summary: データの分布がほぼ一様であるという仮定のもとで、各要素の値からその要素が収まるべき大まかな区画を直接計算し、区画分けと区画内の仕上げソートの2段階で整列する非比較ソート。
---

## 概要

1998年にカール=ディートリッヒ・ノイバートが発表したフラッシュソートは、[バケットソート](/algorithms/bucket-sort)と同じ「値からおおよその位置を直接計算する」という発想をさらに推し進め、データが(ほぼ)一様分布していることを前提に、追加のメモリをほとんど使わずに、実測でしばしば線形時間に近い速度で動作する非比較ソートである。名前の「フラッシュ」は、一瞬(flash)で大まかな整列が完了することに由来する。

## 仕組み

1. データの最小値・最大値を求め、値の範囲を`m`個のクラス(区画)に分割する線形写像を定義する(`class(x) = floor((m-1) × (x - min) / (max - min))`、これは[バケットソート](/algorithms/bucket-sort)の区画割り当てと同じ考え方)
2. 各要素がどのクラスに属するかを数え上げ(カウンティングソートの前半と同様)、各クラスの累積個数から、配列内でそのクラスが占めるべき位置範囲を計算する
3. **並べ替え(permutation)フェーズ**: 通常のソートのように新しい配列へコピーするのではなく、各要素を計算した位置範囲へ**その場で(in-place)**移動させるサイクリックな並べ替えを行う。この段階で、配列全体が「クラスごとに固まった、クラス間では正しい順序の」状態になる
4. **仕上げソート**: 各クラス内部はまだ整列されていないため、クラスごとに[挿入ソート](/algorithms/insertion-sort)のような単純なソートを適用して最終的に整列を完了する(各クラスが十分小さければ挿入ソートの`O(k²)`コストも全体では無視できる)

## 特性・トレードオフ

- **計算量**: データがほぼ一様分布していれば、各クラスのサイズが小さく揃うため実測で`O(n)`に近い速度が出る。ただしデータの分布が偏っている(一部の値に極端に集中している)場合、特定のクラスが肥大化し最悪`O(n²)`まで悪化する——[クイックソート](/algorithms/quick-sort)がピボット選択に敏感なのと同種の弱点を持つ
- **追加メモリの少なさ**: 並べ替えフェーズをin-placeのサイクリック移動で行うため、[バケットソート](/algorithms/bucket-sort)のように各バケットに別々のリストを用意する方式と比べてメモリ使用量が少ない
- **分布への強い依存**: アルゴリズムの効率がデータの分布特性(一様性)に強く依存するため、汎用のソートライブラリとしてよりも、扱うデータの分布があらかじめ分かっている専門的な用途で採用されることが多い
- **使いどころ**: 大規模な数値データ(センサーデータ、測定値など、分布が既知でほぼ一様な場合)の高速ソート、メモリ制約が厳しい組み込み環境での大量データ処理

## 実装例(クラス境界へのサイクリックな配置+クラスごとの仕上げ挿入ソート)

```python
def flash_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    if n <= 1:
        return arr
    lo, hi = min(arr), max(arr)
    if lo == hi:
        return arr
    m = max(1, n // 2)

    def klass(x: int) -> int:
        idx = ((m - 1) * (x - lo)) // (hi - lo)
        if idx >= m:
            idx = m - 1
        if idx < 0:
            idx = 0
        return idx

    counts = [0] * m
    for v in arr:
        counts[klass(v)] += 1
    starts = [0] * m
    for k in range(1, m):
        starts[k] = starts[k - 1] + counts[k - 1]

    cursor = starts.copy()
    ends = [starts[k] + counts[k] for k in range(m)]

    for k in range(m):
        while cursor[k] < ends[k]:
            i = cursor[k]
            v = arr[i]
            kv = klass(v)
            if kv == k:
                cursor[k] += 1
            else:
                j = cursor[kv]
                arr[i], arr[j] = arr[j], arr[i]
                cursor[kv] += 1

    for k in range(m):
        _insertion_sort_range(arr, starts[k], ends[k] - 1)
    return arr

def _insertion_sort_range(arr: list[int], lo: int, hi: int) -> None:
    for i in range(lo + 1, hi + 1):
        key = arr[i]
        j = i - 1
        while j >= lo and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
```

```typescript
function flashSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  if (n <= 1) return result;
  const lo = Math.min(...result);
  const hi = Math.max(...result);
  if (lo === hi) return result;
  const m = Math.max(1, Math.floor(n / 2));

  function klass(x: number): number {
    let idx = Math.floor(((m - 1) * (x - lo)) / (hi - lo));
    if (idx >= m) idx = m - 1;
    if (idx < 0) idx = 0;
    return idx;
  }

  const counts = new Array(m).fill(0);
  for (const v of result) counts[klass(v)]++;
  const starts = new Array(m).fill(0);
  for (let k = 1; k < m; k++) starts[k] = starts[k - 1] + counts[k - 1];

  const cursor = [...starts];
  const ends = starts.map((s: number, k: number) => s + counts[k]);

  for (let k = 0; k < m; k++) {
    while (cursor[k] < ends[k]) {
      const i = cursor[k];
      const v = result[i];
      const kv = klass(v);
      if (kv === k) {
        cursor[k]++;
      } else {
        const j = cursor[kv];
        [result[i], result[j]] = [result[j], result[i]];
        cursor[kv]++;
      }
    }
  }

  for (let k = 0; k < m; k++) {
    insertionSortRange(result, starts[k], ends[k] - 1);
  }
  return result;
}

function insertionSortRange(arr: number[], lo: number, hi: number): void {
  for (let i = lo + 1; i <= hi; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= lo && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
}
```

```cpp
#include <vector>
#include <algorithm>

void insertionSortRange(std::vector<int>& arr, int lo, int hi) {
    for (int i = lo + 1; i <= hi; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= lo && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

std::vector<int> flashSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    if (n <= 1) return arr;
    int lo = *std::min_element(arr.begin(), arr.end());
    int hi = *std::max_element(arr.begin(), arr.end());
    if (lo == hi) return arr;
    int m = std::max(1, n / 2);

    auto klass = [&](int x) {
        int idx = (m - 1) * (x - lo) / (hi - lo);
        if (idx >= m) idx = m - 1;
        if (idx < 0) idx = 0;
        return idx;
    };

    std::vector<int> counts(m, 0);
    for (int v : arr) counts[klass(v)]++;
    std::vector<int> starts(m, 0);
    for (int k = 1; k < m; k++) starts[k] = starts[k - 1] + counts[k - 1];

    std::vector<int> cursor = starts;
    std::vector<int> ends(m);
    for (int k = 0; k < m; k++) ends[k] = starts[k] + counts[k];

    for (int k = 0; k < m; k++) {
        while (cursor[k] < ends[k]) {
            int i = cursor[k];
            int v = arr[i];
            int kv = klass(v);
            if (kv == k) {
                cursor[k]++;
            } else {
                int j = cursor[kv];
                std::swap(arr[i], arr[j]);
                cursor[kv]++;
            }
        }
    }

    for (int k = 0; k < m; k++) {
        insertionSortRange(arr, starts[k], ends[k] - 1);
    }
    return arr;
}
```

```rust
fn insertion_sort_range(arr: &mut [i32], lo: usize, hi: usize) {
    for i in (lo + 1)..=hi {
        let key = arr[i];
        let mut j = i;
        while j > lo && arr[j - 1] > key {
            arr[j] = arr[j - 1];
            j -= 1;
        }
        arr[j] = key;
    }
}

fn flash_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    if n <= 1 {
        return arr;
    }
    let lo = *arr.iter().min().unwrap();
    let hi = *arr.iter().max().unwrap();
    if lo == hi {
        return arr;
    }
    let m = std::cmp::max(1, n / 2);

    let klass = |x: i32| -> usize {
        let idx = (m as i32 - 1) * (x - lo) / (hi - lo);
        idx.clamp(0, m as i32 - 1) as usize
    };

    let mut counts = vec![0usize; m];
    for &v in &arr {
        counts[klass(v)] += 1;
    }
    let mut starts = vec![0usize; m];
    for k in 1..m {
        starts[k] = starts[k - 1] + counts[k - 1];
    }

    let mut cursor = starts.clone();
    let mut ends = vec![0usize; m];
    for k in 0..m {
        ends[k] = starts[k] + counts[k];
    }

    for k in 0..m {
        while cursor[k] < ends[k] {
            let i = cursor[k];
            let v = arr[i];
            let kv = klass(v);
            if kv == k {
                cursor[k] += 1;
            } else {
                let j = cursor[kv];
                arr.swap(i, j);
                cursor[kv] += 1;
            }
        }
    }

    for k in 0..m {
        if ends[k] > starts[k] {
            insertion_sort_range(&mut arr, starts[k], ends[k] - 1);
        }
    }
    arr
}
```

```csharp
static void InsertionSortRange(int[] arr, int lo, int hi)
{
    for (int i = lo + 1; i <= hi; i++)
    {
        int key = arr[i];
        int j = i - 1;
        while (j >= lo && arr[j] > key)
        {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

static int[] FlashSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    if (n <= 1) return result;
    int lo = result.Min(), hi = result.Max();
    if (lo == hi) return result;
    int m = Math.Max(1, n / 2);

    int Klass(int x)
    {
        int idx = (m - 1) * (x - lo) / (hi - lo);
        if (idx >= m) idx = m - 1;
        if (idx < 0) idx = 0;
        return idx;
    }

    var counts = new int[m];
    foreach (int v in result) counts[Klass(v)]++;
    var starts = new int[m];
    for (int k = 1; k < m; k++) starts[k] = starts[k - 1] + counts[k - 1];

    var cursor = (int[])starts.Clone();
    var ends = new int[m];
    for (int k = 0; k < m; k++) ends[k] = starts[k] + counts[k];

    for (int k = 0; k < m; k++)
    {
        while (cursor[k] < ends[k])
        {
            int i = cursor[k];
            int v = result[i];
            int kv = Klass(v);
            if (kv == k)
            {
                cursor[k]++;
            }
            else
            {
                int j = cursor[kv];
                (result[i], result[j]) = (result[j], result[i]);
                cursor[kv]++;
            }
        }
    }

    for (int k = 0; k < m; k++)
    {
        InsertionSortRange(result, starts[k], ends[k] - 1);
    }
    return result;
}
```
