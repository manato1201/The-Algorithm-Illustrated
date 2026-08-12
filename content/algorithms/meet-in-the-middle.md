---
name: 半分全列挙(Meet in the Middle)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(2^(n/2) log(2^(n/2)))(nは要素数、全探索のO(2^n)から指数を半分に削減)
summary: 「全ての部分集合を試す」というO(2^n)の全探索を、要素を半分ずつの2グループに分けてそれぞれ独立に全列挙し、片方をソートしてもう片方から二分探索で組み合わせを探すことで、指数関数の肩を半分にまで軽減する。
---

## 概要

`n`個の要素から作れる全ての部分集合を試す全探索は`2^n`通りかかり、`n`が40を超えるあたりから現実的な時間では終わらなくなる。半分全列挙(Meet in the Middle)は、この指数関数的な爆発を根本的に減らすことはできないものの、**要素を前半と後半の2グループに分割し、それぞれのグループ内だけで全列挙を行う**ことで、`2^n`だった計算量を`2 × 2^(n/2)`まで削減する。例えば`n=40`なら、素朴な全探索の`2^40`(約1兆通り)に対し、半分全列挙は前半・後半それぞれ`2^20`(約100万通り)ずつの列挙で済み、実行時間が現実的な範囲に収まる。「大きな問題を半分に割り、それぞれを解いてから中間地点で組み合わせる」という発想から、この名前が付いている。

## 仕組み

1. `n`個の要素を、前半`n/2`個のグループAと、後半`n/2`個のグループBに分割する
2. グループA内の**全ての部分集合**(`2^(n/2)`通り)について、その部分集合の何らかの集約値(合計値など、問題による)を計算し、リストに列挙する
3. 同様に、グループB内の**全ての部分集合**についても、集約値を列挙する
4. 求めたい答えが「グループAの部分集合とグループBの部分集合を組み合わせて、ある条件(合計がちょうど`K`になる、など)を満たす組が存在するか」というものであれば、**片方のリスト(例えばBの列挙結果)をソート**しておき、もう片方(Aの各要素)について、条件を満たす相手が存在するかを**二分探索**で高速に確認する
5. 各Aの要素についてO(log(2^(n/2)))の二分探索を行うので、全体でO(2^(n/2) log(2^(n/2)))となり、素朴な全探索のO(2^n)から大幅に改善される

## 特性・トレードオフ

- **指数関数の「肩」を半分にする効果の大きさ**: `2^n`から`2^(n/2)`への変化は、見た目の式の変化以上に実行時間に劇的な差を生む(`n=40`なら約1兆倍から約100万倍への削減に相当)。全探索が唯一の解法に見える問題でも、半分全列挙が使える構造(要素を独立な2グループに分けても答えの性質が保たれる)であれば、扱える問題サイズが大きく広がる
- **適用できる問題の構造が限定される**: 半分全列挙が使えるのは、「答えが、2つの独立したグループそれぞれの部分集合の組み合わせとして表現でき、かつグループ間の組み合わせ判定が(ソート+二分探索のような)高速な方法でできる」という構造を持つ問題に限られる。ナップサック問題の一種(個数が少なく重さの上限が大きい場合)、部分和問題、特定の組合せ最適化問題などが典型例である
- **メモリ使用量とのトレードオフ**: 前半・後半それぞれの全列挙結果を保持する必要があり、`2^(n/2)`個のデータをメモリに載せる必要がある。時間計算量は改善されても、メモリ使用量が別のボトルネックになることがあるため、`n`の大きさによってはメモリ制約も考慮する必要がある
- **使いどころ**: 部分和問題・部分集合の個数制約付きナップサック問題(要素数は多いが40程度までに収まる場合)、競技プログラミングにおける「n≤40程度」という制約を見たときの典型的な解法選択肢、暗号解析における鍵探索の高速化(中間一致攻撃、Meet-in-the-Middle攻撃という同じ発想の暗号学的応用もある)

## 実装例

部分和問題(与えられた数の集合から、合計がちょうど`target`になる部分集合が存在するか)を例に示す。

```python
from bisect import bisect_left

def all_subset_sums(arr: list[int]) -> list[int]:
    sums = [0]
    for x in arr:
        sums += [s + x for s in sums]
    return sums

def meet_in_the_middle_subset_sum(arr: list[int], target: int) -> bool:
    n = len(arr)
    left, right = arr[: n // 2], arr[n // 2 :]

    left_sums = all_subset_sums(left)
    right_sums = sorted(all_subset_sums(right))

    for ls in left_sums:
        needed = target - ls
        idx = bisect_left(right_sums, needed)
        if idx < len(right_sums) and right_sums[idx] == needed:
            return True
    return False
```

```typescript
function allSubsetSums(arr: number[]): number[] {
  let sums = [0];
  for (const x of arr) {
    sums = sums.concat(sums.map((s) => s + x));
  }
  return sums;
}

function binarySearchExact(sortedArr: number[], target: number): boolean {
  let lo = 0,
    hi = sortedArr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedArr[mid] === target) return true;
    if (sortedArr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

function meetInTheMiddleSubsetSum(arr: number[], target: number): boolean {
  const n = arr.length;
  const left = arr.slice(0, Math.floor(n / 2));
  const right = arr.slice(Math.floor(n / 2));

  const leftSums = allSubsetSums(left);
  const rightSums = allSubsetSums(right).sort((a, b) => a - b);

  return leftSums.some((ls) => binarySearchExact(rightSums, target - ls));
}
```

```cpp
#include <vector>
#include <algorithm>

std::vector<long long> allSubsetSums(const std::vector<int>& arr) {
    std::vector<long long> sums = {0};
    for (int x : arr) {
        size_t currentSize = sums.size();
        for (size_t i = 0; i < currentSize; i++) sums.push_back(sums[i] + x);
    }
    return sums;
}

bool meetInTheMiddleSubsetSum(const std::vector<int>& arr, long long target) {
    int n = static_cast<int>(arr.size());
    std::vector<int> left(arr.begin(), arr.begin() + n / 2);
    std::vector<int> right(arr.begin() + n / 2, arr.end());

    auto leftSums = allSubsetSums(left);
    auto rightSums = allSubsetSums(right);
    std::sort(rightSums.begin(), rightSums.end());

    for (long long ls : leftSums) {
        long long needed = target - ls;
        if (std::binary_search(rightSums.begin(), rightSums.end(), needed)) return true;
    }
    return false;
}
```

```rust
fn all_subset_sums(arr: &[i64]) -> Vec<i64> {
    let mut sums = vec![0i64];
    for &x in arr {
        let current_len = sums.len();
        for i in 0..current_len {
            sums.push(sums[i] + x);
        }
    }
    sums
}

fn meet_in_the_middle_subset_sum(arr: &[i64], target: i64) -> bool {
    let n = arr.len();
    let (left, right) = arr.split_at(n / 2);

    let left_sums = all_subset_sums(left);
    let mut right_sums = all_subset_sums(right);
    right_sums.sort();

    left_sums.iter().any(|&ls| right_sums.binary_search(&(target - ls)).is_ok())
}
```

```csharp
static List<long> AllSubsetSums(int[] arr)
{
    var sums = new List<long> { 0 };
    foreach (int x in arr)
    {
        int currentCount = sums.Count;
        for (int i = 0; i < currentCount; i++) sums.Add(sums[i] + x);
    }
    return sums;
}

static bool MeetInTheMiddleSubsetSum(int[] arr, long target)
{
    int n = arr.Length;
    var left = arr[..(n / 2)];
    var right = arr[(n / 2)..];

    var leftSums = AllSubsetSums(left);
    var rightSums = AllSubsetSums(right);
    rightSums.Sort();

    foreach (long ls in leftSums)
    {
        long needed = target - ls;
        if (rightSums.BinarySearch(needed) >= 0) return true;
    }
    return false;
}
```
