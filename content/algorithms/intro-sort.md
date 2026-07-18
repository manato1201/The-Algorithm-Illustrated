---
name: イントロソート(Introsort)
category: ソート
subcategory: 比較ベース
complexity: O(n log n)
summary: 'クイックソートを基本にしつつ再帰が深くなるとヒープソートに切り替える実用重視のハイブリッド。C++標準ライブラリのstd::sortに採用。'
---

## 概要

クイックソートは平均的には非常に速いが、ピボットの選び方が悪いデータに当たると最悪O(n²)まで劣化するリスクを常に抱えている。イントロソート(Introspective Sort)は、この弱点を「実行時に自分自身を監視し、危険な兆候が見えたら別の戦略に切り替える」ことで解決する。1997年にDavid Musserが考案し、C++標準ライブラリの`std::sort`をはじめ多くの実装に採用されている。

## 仕組み

1. 通常はクイックソートとして動作する
2. 再帰の深さを追跡し、**理論上あるべき深さ(おおよそlog₂nの定数倍)を超えたら**、そのデータがクイックソートにとって最悪ケースに近いと判断する
3. 最悪ケースが疑われた区間については、クイックソートを打ち切り、**最悪ケースでもO(n log n)を保証できるヒープソートに切り替えて**その区間を仕上げる
4. 区間が十分小さくなったら(要素数十個程度)、オーバーヘッドの少ない**挿入ソートに切り替える**

つまりイントロソートは「平均: クイックソート」「最悪: ヒープソート」「小区間: 挿入ソート」という3つのアルゴリズムを、状況に応じて自動的に使い分けるメタアルゴリズムと言える。

## 特性・トレードオフ

- **計算量**: 平均・最悪ともにO(n log n)を達成する。クイックソートの実測速度の速さと、ヒープソートの最悪ケース保証を両取りしている
- **不安定ソート**: 内部で使うクイックソート・ヒープソートがいずれも不安定なため、全体としても不安定
- **実務での立ち位置**: 「理論的な最悪ケース保証」と「実測での平均性能」を同時に満たす必要がある標準ライブラリのソート実装として、まさに理想的な設計。**マージソート・ヒープソート・クイックソートという3つの可視化がこのサイトに揃っているのは、イントロソートがこれらすべての長所を組み合わせている**ことの裏返しでもある

## 実装例(閾値16要素以下で挿入ソート、再帰深さ超過でヒープソートに切り替え)

```python
import math

def intro_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    if n <= 1:
        return arr
    depth_limit = 2 * int(math.log2(n))
    _intro_sort(arr, 0, n - 1, depth_limit)
    return arr

def _intro_sort(arr: list[int], lo: int, hi: int, depth_limit: int) -> None:
    size = hi - lo + 1
    if size <= 16:
        _insertion_sort_range(arr, lo, hi)
        return
    if depth_limit == 0:
        _heap_sort_range(arr, lo, hi)
        return
    p = _partition(arr, lo, hi)
    _intro_sort(arr, lo, p - 1, depth_limit - 1)
    _intro_sort(arr, p + 1, hi, depth_limit - 1)

def _partition(arr: list[int], lo: int, hi: int) -> int:
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] < pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    return i

def _insertion_sort_range(arr: list[int], lo: int, hi: int) -> None:
    for i in range(lo + 1, hi + 1):
        key = arr[i]
        j = i - 1
        while j >= lo and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key

def _heap_sort_range(arr: list[int], lo: int, hi: int) -> None:
    n = hi - lo + 1

    def sift_down(root: int, size: int) -> None:
        while True:
            left, right = 2 * root + 1, 2 * root + 2
            largest = root
            if left < size and arr[lo + left] > arr[lo + largest]:
                largest = left
            if right < size and arr[lo + right] > arr[lo + largest]:
                largest = right
            if largest == root:
                return
            arr[lo + root], arr[lo + largest] = arr[lo + largest], arr[lo + root]
            root = largest

    for i in range(n // 2 - 1, -1, -1):
        sift_down(i, n)
    for end in range(n - 1, 0, -1):
        arr[lo], arr[lo + end] = arr[lo + end], arr[lo]
        sift_down(0, end)
```

```typescript
function introSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  if (n <= 1) return result;
  const depthLimit = 2 * Math.floor(Math.log2(n));
  introSortRange(result, 0, n - 1, depthLimit);
  return result;
}

function introSortRange(arr: number[], lo: number, hi: number, depthLimit: number): void {
  const size = hi - lo + 1;
  if (size <= 16) {
    insertionSortRange(arr, lo, hi);
    return;
  }
  if (depthLimit === 0) {
    heapSortRange(arr, lo, hi);
    return;
  }
  const p = partition(arr, lo, hi);
  introSortRange(arr, lo, p - 1, depthLimit - 1);
  introSortRange(arr, p + 1, hi, depthLimit - 1);
}

function partition(arr: number[], lo: number, hi: number): number {
  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  return i;
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

function heapSortRange(arr: number[], lo: number, hi: number): void {
  const n = hi - lo + 1;

  function siftDown(root: number, size: number): void {
    while (true) {
      const left = 2 * root + 1;
      const right = 2 * root + 2;
      let largest = root;
      if (left < size && arr[lo + left] > arr[lo + largest]) largest = left;
      if (right < size && arr[lo + right] > arr[lo + largest]) largest = right;
      if (largest === root) return;
      [arr[lo + root], arr[lo + largest]] = [arr[lo + largest], arr[lo + root]];
      root = largest;
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(i, n);
  for (let end = n - 1; end > 0; end--) {
    [arr[lo], arr[lo + end]] = [arr[lo + end], arr[lo]];
    siftDown(0, end);
  }
}
```

```cpp
#include <vector>
#include <utility>
#include <cmath>

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

int partition(std::vector<int>& arr, int lo, int hi) {
    int pivot = arr[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (arr[j] < pivot) {
            std::swap(arr[i], arr[j]);
            i++;
        }
    }
    std::swap(arr[i], arr[hi]);
    return i;
}

void siftDownRange(std::vector<int>& arr, int lo, int root, int size) {
    while (true) {
        int left = 2 * root + 1;
        int right = 2 * root + 2;
        int largest = root;
        if (left < size && arr[lo + left] > arr[lo + largest]) largest = left;
        if (right < size && arr[lo + right] > arr[lo + largest]) largest = right;
        if (largest == root) return;
        std::swap(arr[lo + root], arr[lo + largest]);
        root = largest;
    }
}

void heapSortRange(std::vector<int>& arr, int lo, int hi) {
    int n = hi - lo + 1;
    for (int i = n / 2 - 1; i >= 0; i--) siftDownRange(arr, lo, i, n);
    for (int end = n - 1; end > 0; end--) {
        std::swap(arr[lo], arr[lo + end]);
        siftDownRange(arr, lo, 0, end);
    }
}

void introSortRange(std::vector<int>& arr, int lo, int hi, int depthLimit) {
    int size = hi - lo + 1;
    if (size <= 16) {
        insertionSortRange(arr, lo, hi);
        return;
    }
    if (depthLimit == 0) {
        heapSortRange(arr, lo, hi);
        return;
    }
    int p = partition(arr, lo, hi);
    introSortRange(arr, lo, p - 1, depthLimit - 1);
    introSortRange(arr, p + 1, hi, depthLimit - 1);
}

std::vector<int> introSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    if (n <= 1) return arr;
    int depthLimit = 2 * static_cast<int>(std::log2(n));
    introSortRange(arr, 0, n - 1, depthLimit);
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

fn partition(arr: &mut [i32], lo: usize, hi: usize) -> usize {
    let pivot = arr[hi];
    let mut i = lo;
    for j in lo..hi {
        if arr[j] < pivot {
            arr.swap(i, j);
            i += 1;
        }
    }
    arr.swap(i, hi);
    i
}

fn sift_down_range(arr: &mut [i32], lo: usize, root: usize, size: usize) {
    let mut root = root;
    loop {
        let left = 2 * root + 1;
        let right = 2 * root + 2;
        let mut largest = root;
        if left < size && arr[lo + left] > arr[lo + largest] {
            largest = left;
        }
        if right < size && arr[lo + right] > arr[lo + largest] {
            largest = right;
        }
        if largest == root {
            return;
        }
        arr.swap(lo + root, lo + largest);
        root = largest;
    }
}

fn heap_sort_range(arr: &mut [i32], lo: usize, hi: usize) {
    let n = hi - lo + 1;
    for i in (0..n / 2).rev() {
        sift_down_range(arr, lo, i, n);
    }
    for end in (1..n).rev() {
        arr.swap(lo, lo + end);
        sift_down_range(arr, lo, 0, end);
    }
}

fn intro_sort_range(arr: &mut [i32], lo: usize, hi: usize, depth_limit: u32) {
    let size = hi - lo + 1;
    if size <= 16 {
        insertion_sort_range(arr, lo, hi);
        return;
    }
    if depth_limit == 0 {
        heap_sort_range(arr, lo, hi);
        return;
    }
    let p = partition(arr, lo, hi);
    if p > lo {
        intro_sort_range(arr, lo, p - 1, depth_limit - 1);
    }
    if p < hi {
        intro_sort_range(arr, p + 1, hi, depth_limit - 1);
    }
}

fn intro_sort(arr: &[i32]) -> Vec<i32> {
    let mut arr = arr.to_vec();
    let n = arr.len();
    if n <= 1 {
        return arr;
    }
    let depth_limit = 2 * (n as f64).log2() as u32;
    intro_sort_range(&mut arr, 0, n - 1, depth_limit);
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

static int Partition(int[] arr, int lo, int hi)
{
    int pivot = arr[hi];
    int i = lo;
    for (int j = lo; j < hi; j++)
    {
        if (arr[j] < pivot)
        {
            (arr[i], arr[j]) = (arr[j], arr[i]);
            i++;
        }
    }
    (arr[i], arr[hi]) = (arr[hi], arr[i]);
    return i;
}

static void SiftDownRange(int[] arr, int lo, int root, int size)
{
    while (true)
    {
        int left = 2 * root + 1, right = 2 * root + 2;
        int largest = root;
        if (left < size && arr[lo + left] > arr[lo + largest]) largest = left;
        if (right < size && arr[lo + right] > arr[lo + largest]) largest = right;
        if (largest == root) return;
        (arr[lo + root], arr[lo + largest]) = (arr[lo + largest], arr[lo + root]);
        root = largest;
    }
}

static void HeapSortRange(int[] arr, int lo, int hi)
{
    int n = hi - lo + 1;
    for (int i = n / 2 - 1; i >= 0; i--) SiftDownRange(arr, lo, i, n);
    for (int end = n - 1; end > 0; end--)
    {
        (arr[lo], arr[lo + end]) = (arr[lo + end], arr[lo]);
        SiftDownRange(arr, lo, 0, end);
    }
}

static void IntroSortRange(int[] arr, int lo, int hi, int depthLimit)
{
    int size = hi - lo + 1;
    if (size <= 16)
    {
        InsertionSortRange(arr, lo, hi);
        return;
    }
    if (depthLimit == 0)
    {
        HeapSortRange(arr, lo, hi);
        return;
    }
    int p = Partition(arr, lo, hi);
    IntroSortRange(arr, lo, p - 1, depthLimit - 1);
    IntroSortRange(arr, p + 1, hi, depthLimit - 1);
}

static int[] IntroSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    if (n <= 1) return result;
    int depthLimit = 2 * (int)Math.Log2(n);
    IntroSortRange(result, 0, n - 1, depthLimit);
    return result;
}
```
