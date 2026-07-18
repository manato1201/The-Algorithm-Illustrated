---
name: Timsort
category: ソート
subcategory: 比較ベース
complexity: O(n log n)
summary: 挿入ソートとマージソートを組み合わせた実用重視のハイブリッド。Python/Javaの標準ソートに採用。
---

## 概要

「現実のデータには、既に部分的に整列された区間(ラン)が含まれていることが多い」という観察から出発した、実用性を突き詰めたソートアルゴリズム。2002年にTim Petersが考案し、Pythonの標準ソート(`list.sort()`)として採用されたのを皮切りに、Java・Android・V8(JavaScript)など多くの実行環境で標準ソートの座を占めている。

## 仕組み

1. 配列を「ラン(run)」と呼ぶ小さな区間に分割する。既に整列済みの連続部分があればそれを1つのランとして扱い、短すぎるランは挿入ソートで一定の最小長まで整列してから使う(挿入ソートは小さいデータやほぼ整列済みのデータに強いという性質を利用している)
2. できあがった複数のランを、マージソートと同じ要領で2つずつマージしていく
3. マージする順序は「安定性を保ちながら、なるべく効率よく」なるよう工夫されたルール(スタックベースの不変条件)に従う
4. 最終的に1本のランになったら整列完了

つまりTimsortは「マージソートの安定性・最悪ケース保証」と「挿入ソートの、部分整列済みデータへの強さ」を、現実のデータ特性を前提に組み合わせたハイブリッドと言える。

## 特性・トレードオフ

- **計算量**: 最悪でもO(n log n)を保証しつつ、**既に整列済み・部分的に整列済みのデータではほぼO(n)まで高速化する**適応的(adaptive)なアルゴリズム
- **安定ソート**: マージソートの性質を引き継ぎ、同じ値の相対順序を保つ
- **追加メモリ**: マージのための一時バッファが必要(マージソートと同様)
- **実務での立ち位置**: 「理論上最速」ではなく「現実のデータに対して最も実用的」を追求した設計思想が特徴。実務で最もよく使われるソートの一つであり、実装の複雑さと引き換えに高い実測性能を実現している

## 実装例(簡略化したランベースの実装。ギャロッピング等の最適化は省略)

```python
MIN_RUN = 32

def tim_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    if n <= 1:
        return arr
    min_run = _min_run_length(n)
    for start in range(0, n, min_run):
        end = min(start + min_run - 1, n - 1)
        _insertion_sort_range(arr, start, end)
    size = min_run
    while size < n:
        for left in range(0, n, size * 2):
            mid = min(left + size - 1, n - 1)
            right = min(left + 2 * size - 1, n - 1)
            if mid < right:
                _merge(arr, left, mid, right)
        size *= 2
    return arr

def _min_run_length(n: int) -> int:
    r = 0
    while n >= MIN_RUN:
        r |= n & 1
        n >>= 1
    return n + r

def _insertion_sort_range(arr: list[int], lo: int, hi: int) -> None:
    for i in range(lo + 1, hi + 1):
        key = arr[i]
        j = i - 1
        while j >= lo and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key

def _merge(arr: list[int], lo: int, mid: int, hi: int) -> None:
    left = arr[lo:mid + 1]
    right = arr[mid + 1:hi + 1]
    i = j = 0
    k = lo
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            arr[k] = left[i]
            i += 1
        else:
            arr[k] = right[j]
            j += 1
        k += 1
    while i < len(left):
        arr[k] = left[i]
        i += 1
        k += 1
    while j < len(right):
        arr[k] = right[j]
        j += 1
        k += 1
```

```typescript
const MIN_RUN = 32;

function timSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  if (n <= 1) return result;
  const minRun = minRunLength(n);
  for (let start = 0; start < n; start += minRun) {
    const end = Math.min(start + minRun - 1, n - 1);
    insertionSortRange(result, start, end);
  }
  let size = minRun;
  while (size < n) {
    for (let left = 0; left < n; left += size * 2) {
      const mid = Math.min(left + size - 1, n - 1);
      const right = Math.min(left + 2 * size - 1, n - 1);
      if (mid < right) timMerge(result, left, mid, right);
    }
    size *= 2;
  }
  return result;
}

function minRunLength(n: number): number {
  let r = 0;
  while (n >= MIN_RUN) {
    r |= n & 1;
    n >>= 1;
  }
  return n + r;
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

function timMerge(arr: number[], lo: number, mid: number, hi: number): void {
  const left = arr.slice(lo, mid + 1);
  const right = arr.slice(mid + 1, hi + 1);
  let i = 0;
  let j = 0;
  let k = lo;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) arr[k++] = left[i++];
    else arr[k++] = right[j++];
  }
  while (i < left.length) arr[k++] = left[i++];
  while (j < right.length) arr[k++] = right[j++];
}
```

```cpp
#include <vector>
#include <algorithm>

const int MIN_RUN = 32;

int minRunLength(int n) {
    int r = 0;
    while (n >= MIN_RUN) {
        r |= n & 1;
        n >>= 1;
    }
    return n + r;
}

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

void timMerge(std::vector<int>& arr, int lo, int mid, int hi) {
    std::vector<int> left(arr.begin() + lo, arr.begin() + mid + 1);
    std::vector<int> right(arr.begin() + mid + 1, arr.begin() + hi + 1);
    size_t i = 0, j = 0;
    int k = lo;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) arr[k++] = left[i++];
        else arr[k++] = right[j++];
    }
    while (i < left.size()) arr[k++] = left[i++];
    while (j < right.size()) arr[k++] = right[j++];
}

std::vector<int> timSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    if (n <= 1) return arr;
    int minRun = minRunLength(n);
    for (int start = 0; start < n; start += minRun) {
        int end = std::min(start + minRun - 1, n - 1);
        insertionSortRange(arr, start, end);
    }
    int size = minRun;
    while (size < n) {
        for (int left = 0; left < n; left += size * 2) {
            int mid = std::min(left + size - 1, n - 1);
            int right = std::min(left + 2 * size - 1, n - 1);
            if (mid < right) timMerge(arr, left, mid, right);
        }
        size *= 2;
    }
    return arr;
}
```

```rust
const MIN_RUN: usize = 32;

fn min_run_length(mut n: usize) -> usize {
    let mut r = 0;
    while n >= MIN_RUN {
        r |= n & 1;
        n >>= 1;
    }
    n + r
}

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

fn tim_merge(arr: &mut [i32], lo: usize, mid: usize, hi: usize) {
    let left = arr[lo..=mid].to_vec();
    let right = arr[mid + 1..=hi].to_vec();
    let (mut i, mut j, mut k) = (0, 0, lo);
    while i < left.len() && j < right.len() {
        if left[i] <= right[j] {
            arr[k] = left[i];
            i += 1;
        } else {
            arr[k] = right[j];
            j += 1;
        }
        k += 1;
    }
    while i < left.len() {
        arr[k] = left[i];
        i += 1;
        k += 1;
    }
    while j < right.len() {
        arr[k] = right[j];
        j += 1;
        k += 1;
    }
}

fn tim_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    if n <= 1 {
        return arr;
    }
    let min_run = min_run_length(n);
    let mut start = 0;
    while start < n {
        let end = (start + min_run - 1).min(n - 1);
        insertion_sort_range(&mut arr, start, end);
        start += min_run;
    }
    let mut size = min_run;
    while size < n {
        let mut left = 0;
        while left < n {
            let mid = (left + size - 1).min(n - 1);
            let right = (left + 2 * size - 1).min(n - 1);
            if mid < right {
                tim_merge(&mut arr, left, mid, right);
            }
            left += size * 2;
        }
        size *= 2;
    }
    arr
}
```

```csharp
const int MinRun = 32;

static int MinRunLength(int n)
{
    int r = 0;
    while (n >= MinRun)
    {
        r |= n & 1;
        n >>= 1;
    }
    return n + r;
}

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

static void TimMerge(int[] arr, int lo, int mid, int hi)
{
    int n1 = mid - lo + 1, n2 = hi - mid;
    var left = new int[n1];
    var right = new int[n2];
    Array.Copy(arr, lo, left, 0, n1);
    Array.Copy(arr, mid + 1, right, 0, n2);
    int i = 0, j = 0, k = lo;
    while (i < n1 && j < n2)
    {
        if (left[i] <= right[j]) arr[k++] = left[i++];
        else arr[k++] = right[j++];
    }
    while (i < n1) arr[k++] = left[i++];
    while (j < n2) arr[k++] = right[j++];
}

static int[] TimSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    if (n <= 1) return result;
    int minRun = MinRunLength(n);
    for (int start = 0; start < n; start += minRun)
    {
        int end = Math.Min(start + minRun - 1, n - 1);
        InsertionSortRange(result, start, end);
    }
    int size = minRun;
    while (size < n)
    {
        for (int left = 0; left < n; left += size * 2)
        {
            int mid = Math.Min(left + size - 1, n - 1);
            int right = Math.Min(left + 2 * size - 1, n - 1);
            if (mid < right) TimMerge(result, left, mid, right);
        }
        size *= 2;
    }
    return result;
}
```
