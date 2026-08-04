---
name: 並列マージソート
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(n log n)(処理量、work)、O(log² n)(並列実行時間、span、十分なプロセッサ数の場合)
summary: 分割統治の再帰呼び出し自体を並列に実行し、さらにマージ処理そのものも並列化することで、逐次マージソートの計算時間を対数の2乗まで短縮する並列アルゴリズム。
---

## 概要

逐次版の[マージソート](/algorithms/merge-sort)は、配列を半分に分割し、それぞれを再帰的にソートしてからマージするという分割統治の構造を持つ。分割された2つの半分の再帰呼び出しは互いに独立しているため、これらを異なるプロセッサで同時に実行するのは自然な発想である。しかし単に再帰呼び出しを並列化するだけでは、最後の「マージ」ステップ(2つのソート済み配列を1つに統合する処理)がボトルネックとして残ってしまう——素朴なマージは2つのポインタを進めるだけの逐次処理だからである。並列マージソートは、この最後のマージ処理自体も並列化することで、理論上`O(log² n)`という非常に高速な並列実行時間を達成する。

## 仕組み

1. **並列な分割統治**: 配列を半分に分割し、左半分と右半分の再帰的なソートを、異なるプロセッサ(タスク)に割り当てて並列に実行する。再帰の各階層で、独立したサブ問題の数が倍々に増えていく
2. **並列マージ**: 2つのソート済み配列`A`(長さ`m`)と`B`(長さ`n`)をマージする際、通常の逐次マージのように先頭から順番に処理するのではなく、まず`A`の中央の要素`A[m/2]`が、`B`の中でどの位置に挿入されるべきかを[二分探索](/algorithms/binary-search)で特定する
3. この挿入位置によって、問題全体が「`A`の前半と`B`のその位置より前」「`A`の後半と`B`のその位置より後」という2つの独立した部分マージ問題に分割できる——この2つの部分マージは互いに完全に独立しているため、別々のプロセッサで並列に処理できる
4. この分割を再帰的に繰り返すことで、マージ処理自体も対数的な深さの並列な木構造に分解でき、`O(log(m+n))`の並列実行時間で2つの配列をマージできる

## 特性・トレードオフ

- **計算量**: 全体の処理量(work)は逐次版と変わらず`O(n log n)`だが、並列実行時間(span)は、外側の分割統治の`O(log n)`階層それぞれで並列マージに`O(log n)`かかるため、合計`O(log² n)`まで短縮される——[並列プレフィックス和](/algorithms/parallel-prefix-sum)の`O(log n)`よりは深いが、逐次の`O(n log n)`と比べれば劇的な高速化になる
- **並列マージの追加コスト**: 各マージステップで[二分探索](/algorithms/binary-search)による分割点の特定という追加の処理が必要になるため、実用上はプロセッサ数が十分多い場合にのみこの並列マージの恩恵が計算量の理論通りに現れる。小規模なデータやプロセッサ数が少ない環境では、単純に再帰呼び出しだけを並列化し、マージ自体は逐次処理する方が実装がシンプルで十分高速なことも多い
- **タスクの粒度の調整**: 再帰の末端まで並列化すると、小さすぎるタスクの生成・管理オーバーヘッドが計算そのもののコストを上回ってしまう。実用の並列ソートライブラリでは、ある閾値以下のサイズになったら逐次のソートアルゴリズムに切り替える、というハイブリッドな設計が一般的である
- **使いどころ**: マルチコアCPU・分散システムにおける大規模データのソート、並列計算フレームワーク(OpenMP、Intel TBB、Javaのfork/joinフレームワーク等)の標準的な実装例、[MapReduce](/algorithms/mapreduce)のシャッフル・ソートフェーズの内部実装の理論的基盤

## 実装例

分割統治の再帰と、[二分探索](/algorithms/binary-search)による分割点特定を使った並列マージを、決定論的な逐次シミュレーションとして実装する。実際の並列実行では左右の再帰やマージの左右部分問題を別スレッドに割り当てるが、ここではその構造を保ったまま逐次実行し、結果が標準ソートと一致することを検証する。

```python
def binary_search_insert_pos(a: list[int], x: int) -> int:
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo


def parallel_merge(a: list[int], b: list[int]) -> list[int]:
    if len(a) < len(b):
        a, b = b, a
    if len(a) == 0:
        return []
    # aの中央要素の挿入位置をbの中で二分探索することで、マージを2つの独立した部分問題に分割する
    mid_a = len(a) // 2
    pivot = a[mid_a]
    mid_b = binary_search_insert_pos(b, pivot)
    left = parallel_merge(a[:mid_a], b[:mid_b])   # 実際の並列実行では別スレッドに割り当て可能
    right = parallel_merge(a[mid_a + 1:], b[mid_b:])  # 同上
    return left + [pivot] + right


def parallel_merge_sort(arr: list[int]) -> list[int]:
    if len(arr) <= 1:
        return list(arr)
    mid = len(arr) // 2
    left = parallel_merge_sort(arr[:mid])   # 実際の並列実行では別スレッドに割り当て可能
    right = parallel_merge_sort(arr[mid:])  # 同上
    return parallel_merge(left, right)
```

```typescript
function binarySearchInsertPos(a: number[], x: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function parallelMerge(a: number[], b: number[]): number[] {
  if (a.length < b.length) [a, b] = [b, a];
  if (a.length === 0) return [];
  // aの中央要素の挿入位置をbの中で二分探索することで、マージを2つの独立した部分問題に分割する
  const midA = Math.floor(a.length / 2);
  const pivot = a[midA];
  const midB = binarySearchInsertPos(b, pivot);
  const left = parallelMerge(a.slice(0, midA), b.slice(0, midB));
  const right = parallelMerge(a.slice(midA + 1), b.slice(midB));
  return [...left, pivot, ...right];
}

function parallelMergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return [...arr];
  const mid = Math.floor(arr.length / 2);
  const left = parallelMergeSort(arr.slice(0, mid));
  const right = parallelMergeSort(arr.slice(mid));
  return parallelMerge(left, right);
}
```

```cpp
#include <vector>
#include <algorithm>

int binarySearchInsertPos(const std::vector<int>& a, int x) {
    int lo = 0, hi = static_cast<int>(a.size());
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

std::vector<int> parallelMerge(std::vector<int> a, std::vector<int> b) {
    if (a.size() < b.size()) std::swap(a, b);
    if (a.empty()) return {};
    int midA = static_cast<int>(a.size()) / 2;
    int pivot = a[midA];
    int midB = binarySearchInsertPos(b, pivot);

    std::vector<int> aLeft(a.begin(), a.begin() + midA);
    std::vector<int> bLeft(b.begin(), b.begin() + midB);
    std::vector<int> aRight(a.begin() + midA + 1, a.end());
    std::vector<int> bRight(b.begin() + midB, b.end());

    auto left = parallelMerge(aLeft, bLeft);
    auto right = parallelMerge(aRight, bRight);

    std::vector<int> result;
    result.reserve(left.size() + 1 + right.size());
    result.insert(result.end(), left.begin(), left.end());
    result.push_back(pivot);
    result.insert(result.end(), right.begin(), right.end());
    return result;
}

std::vector<int> parallelMergeSort(const std::vector<int>& arr) {
    if (arr.size() <= 1) return arr;
    size_t mid = arr.size() / 2;
    std::vector<int> left(arr.begin(), arr.begin() + mid);
    std::vector<int> right(arr.begin() + mid, arr.end());
    return parallelMerge(parallelMergeSort(left), parallelMergeSort(right));
}
```

```rust
fn binary_search_insert_pos(a: &[i32], x: i32) -> usize {
    let mut lo = 0;
    let mut hi = a.len();
    while lo < hi {
        let mid = (lo + hi) / 2;
        if a[mid] < x {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    lo
}

fn parallel_merge(a: &[i32], b: &[i32]) -> Vec<i32> {
    let (a, b) = if a.len() < b.len() { (b, a) } else { (a, b) };
    if a.is_empty() {
        return Vec::new();
    }
    // aの中央要素の挿入位置をbの中で二分探索することで、マージを2つの独立した部分問題に分割する
    let mid_a = a.len() / 2;
    let pivot = a[mid_a];
    let mid_b = binary_search_insert_pos(b, pivot);

    let mut result = parallel_merge(&a[..mid_a], &b[..mid_b]);
    result.push(pivot);
    result.extend(parallel_merge(&a[mid_a + 1..], &b[mid_b..]));
    result
}

fn parallel_merge_sort(arr: &[i32]) -> Vec<i32> {
    if arr.len() <= 1 {
        return arr.to_vec();
    }
    let mid = arr.len() / 2;
    let left = parallel_merge_sort(&arr[..mid]);
    let right = parallel_merge_sort(&arr[mid..]);
    parallel_merge(&left, &right)
}
```

```csharp
static int BinarySearchInsertPos(List<int> a, int x)
{
    int lo = 0, hi = a.Count;
    while (lo < hi)
    {
        int mid = (lo + hi) / 2;
        if (a[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
}

static List<int> ParallelMerge(List<int> a, List<int> b)
{
    if (a.Count < b.Count) (a, b) = (b, a);
    if (a.Count == 0) return new List<int>();
    // aの中央要素の挿入位置をbの中で二分探索することで、マージを2つの独立した部分問題に分割する
    int midA = a.Count / 2;
    int pivot = a[midA];
    int midB = BinarySearchInsertPos(b, pivot);

    var left = ParallelMerge(a.GetRange(0, midA), b.GetRange(0, midB));
    var right = ParallelMerge(a.GetRange(midA + 1, a.Count - midA - 1), b.GetRange(midB, b.Count - midB));

    var result = new List<int>(left);
    result.Add(pivot);
    result.AddRange(right);
    return result;
}

static List<int> ParallelMergeSort(List<int> arr)
{
    if (arr.Count <= 1) return new List<int>(arr);
    int mid = arr.Count / 2;
    var left = ParallelMergeSort(arr.GetRange(0, mid));
    var right = ParallelMergeSort(arr.GetRange(mid, arr.Count - mid));
    return ParallelMerge(left, right);
}
```
