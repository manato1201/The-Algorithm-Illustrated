---
name: バケットソート
category: ソート
subcategory: 非比較ベース
complexity: O(n + k)
summary: 値域をバケットに分けて個別に整列する。一様分布のデータで威力を発揮する。
---

## 概要

値の範囲をいくつかの「バケット(バケツ)」に区切り、各要素を対応するバケットに振り分けてから、バケットごとに小さく整列し、最後にバケットを順番に連結する。「大きな問題を、独立した小さな問題に分けて解く」という発想は分割統治法に近いが、分け方が値の大小そのものに基づいている点が特徴的。

## 仕組み

1. 値の範囲をk個のバケットに均等に区切る(例: 0〜1の実数をk個の区間に分割)
2. 各要素を、値に応じて対応するバケットに振り分ける
3. 各バケット内を個別に整列する(要素数が少なければ挿入ソートなど、素朴な方法で十分)
4. バケットを順番(値の小さい順)に連結すれば、全体が整列済みになる

データが値域全体に**一様に(均等に)分布している**ことが前提になる。もし全ての要素が特定の範囲に偏っていれば、1つのバケットに要素が集中してしまい、そのバケット内の整列コストが支配的になって性能が悪化する。

## 特性・トレードオフ

- **計算量**: 一様分布を仮定できればO(n + k)に近い性能が出せる。ただし最悪ケース(全要素が1つのバケットに集中)ではバケット内の整列アルゴリズムの計算量(例: O(n²))がそのまま出てしまう
- **実数データに強い**: 計数ソート・基数ソートが整数向けなのに対し、バケットソートは実数の一様分布データにも自然に適用できる
- **安定性**: バケット内の整列アルゴリズムが安定であれば、全体としても安定にできる
- **使いどころ**: 0〜1の乱数、テストの得点分布のような「値域が分かっていて、かつ偏りが少ない」とわかっているデータ

## 実装例(バケット数=要素数の単純な分割)

```python
def bucket_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    n = len(arr)
    if n <= 1:
        return arr
    lo, hi = min(arr), max(arr)
    if lo == hi:
        return arr
    bucket_count = n
    buckets: list[list[int]] = [[] for _ in range(bucket_count)]
    span = hi - lo + 1
    for v in arr:
        idx = (v - lo) * bucket_count // span
        if idx >= bucket_count:
            idx = bucket_count - 1
        buckets[idx].append(v)
    result = []
    for bucket in buckets:
        _insertion_sort_in_place(bucket)
        result.extend(bucket)
    return result

def _insertion_sort_in_place(bucket: list[int]) -> None:
    for i in range(1, len(bucket)):
        key = bucket[i]
        j = i - 1
        while j >= 0 and bucket[j] > key:
            bucket[j + 1] = bucket[j]
            j -= 1
        bucket[j + 1] = key
```

```typescript
function bucketSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  if (n <= 1) return result;
  const lo = Math.min(...result);
  const hi = Math.max(...result);
  if (lo === hi) return result;
  const bucketCount = n;
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  const span = hi - lo + 1;
  for (const v of result) {
    let idx = Math.floor(((v - lo) * bucketCount) / span);
    if (idx >= bucketCount) idx = bucketCount - 1;
    buckets[idx].push(v);
  }
  const out: number[] = [];
  for (const bucket of buckets) {
    insertionSortInPlace(bucket);
    out.push(...bucket);
  }
  return out;
}

function insertionSortInPlace(bucket: number[]): void {
  for (let i = 1; i < bucket.length; i++) {
    const key = bucket[i];
    let j = i - 1;
    while (j >= 0 && bucket[j] > key) {
      bucket[j + 1] = bucket[j];
      j--;
    }
    bucket[j + 1] = key;
  }
}
```

```cpp
#include <vector>
#include <algorithm>

void insertionSortInPlace(std::vector<int>& bucket) {
    for (size_t i = 1; i < bucket.size(); i++) {
        int key = bucket[i];
        int j = static_cast<int>(i) - 1;
        while (j >= 0 && bucket[j] > key) {
            bucket[j + 1] = bucket[j];
            j--;
        }
        bucket[j + 1] = key;
    }
}

std::vector<int> bucketSort(std::vector<int> arr) {
    int n = static_cast<int>(arr.size());
    if (n <= 1) return arr;
    int lo = *std::min_element(arr.begin(), arr.end());
    int hi = *std::max_element(arr.begin(), arr.end());
    if (lo == hi) return arr;
    int bucketCount = n;
    std::vector<std::vector<int>> buckets(bucketCount);
    int span = hi - lo + 1;
    for (int v : arr) {
        int idx = (v - lo) * bucketCount / span;
        if (idx >= bucketCount) idx = bucketCount - 1;
        buckets[idx].push_back(v);
    }
    std::vector<int> result;
    result.reserve(n);
    for (auto& bucket : buckets) {
        insertionSortInPlace(bucket);
        result.insert(result.end(), bucket.begin(), bucket.end());
    }
    return result;
}
```

```rust
fn insertion_sort_in_place(bucket: &mut Vec<i32>) {
    for i in 1..bucket.len() {
        let key = bucket[i];
        let mut j = i as isize - 1;
        while j >= 0 && bucket[j as usize] > key {
            bucket[(j + 1) as usize] = bucket[j as usize];
            j -= 1;
        }
        bucket[(j + 1) as usize] = key;
    }
}

fn bucket_sort(arr: &[i32]) -> Vec<i32> {
    let n = arr.len();
    if n <= 1 {
        return arr.to_vec();
    }
    let lo = *arr.iter().min().unwrap();
    let hi = *arr.iter().max().unwrap();
    if lo == hi {
        return arr.to_vec();
    }
    let bucket_count = n;
    let mut buckets: Vec<Vec<i32>> = vec![Vec::new(); bucket_count];
    let span = hi - lo + 1;
    for &v in arr {
        let mut idx = ((v - lo) as i64 * bucket_count as i64 / span as i64) as usize;
        if idx >= bucket_count {
            idx = bucket_count - 1;
        }
        buckets[idx].push(v);
    }
    let mut result = Vec::with_capacity(n);
    for mut bucket in buckets {
        insertion_sort_in_place(&mut bucket);
        result.extend(bucket);
    }
    result
}
```

```csharp
static void InsertionSortInPlace(List<int> bucket)
{
    for (int i = 1; i < bucket.Count; i++)
    {
        int key = bucket[i];
        int j = i - 1;
        while (j >= 0 && bucket[j] > key)
        {
            bucket[j + 1] = bucket[j];
            j--;
        }
        bucket[j + 1] = key;
    }
}

static int[] BucketSort(int[] arr)
{
    var result = (int[])arr.Clone();
    int n = result.Length;
    if (n <= 1) return result;
    int lo = result.Min(), hi = result.Max();
    if (lo == hi) return result;
    int bucketCount = n;
    var buckets = new List<int>[bucketCount];
    for (int i = 0; i < bucketCount; i++) buckets[i] = new List<int>();
    int span = hi - lo + 1;
    foreach (int v in result)
    {
        int idx = (v - lo) * bucketCount / span;
        if (idx >= bucketCount) idx = bucketCount - 1;
        buckets[idx].Add(v);
    }
    var output = new List<int>(n);
    foreach (var bucket in buckets)
    {
        InsertionSortInPlace(bucket);
        output.AddRange(bucket);
    }
    return output.ToArray();
}
```
