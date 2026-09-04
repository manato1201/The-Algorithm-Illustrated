---
name: 並列クイックソート(Parallel Quicksort)
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: 期待O((n log n)/p + log^2 n)(pプロセッサ、ランダムピボット選択時)、最悪O(n^2)
summary: クイックソートの「ピボットで分割してから両側を再帰的にソートする」という分割統治構造をフォーク・ジョインモデルに載せ、左右の再帰呼び出しを独立した並列タスクとして同時実行することで、逐次O(n log n)のソートをマルチコア環境で高速化する。
---

## 概要

クイックソートは、パーティション(ピボットを基準にした分割)処理後の2つの部分列が互いに独立しているため、その再帰呼び出しを[フォーク・ジョインモデル](/algorithms/fork-join-model)にそのまま乗せることができる。逐次版との構造的な違いは、パーティション処理後に左右の再帰呼び出しを別々の並列タスクとしてフォークし、両方の完了をジョインで待ち合わせる点だけである。ただし、パーティション処理そのもの(ピボットを基準に配列の要素を並べ替える工程)は本質的に逐次的な操作であり、これを並列化するには追加の工夫(並列パーティション)が必要になる——単純な並列クイックソートでは、この逐次パーティションの部分がボトルネックとして残る。

## 仕組み

1. 配列の要素数が閾値以下、または並列化の恩恵が薄い小さな区間であれば、逐次クイックソートに切り替える([フォーク・ジョインモデル](/algorithms/fork-join-model)に共通する粒度制御)
2. ピボットを選択する(ランダム選択などにより、常に偏った分割が続く最悪ケースを避ける工夫が実務では重要)
3. ピボットを基準に配列を「ピボットより小さい部分」と「大きい部分」に分割する(パーティション処理、通常は逐次でO(n))
4. 左側の部分列のソートを新しい並列タスクとしてフォークする
5. 右側の部分列は自スレッドがそのまま再帰的にソートを続ける
6. 両方のタスクの完了をジョインで待ち合わせれば、配列全体のソートが完了する(クイックソートはin-placeで結果を書き込むため、マージソートのような明示的な統合ステップ自体は不要)

## 特性・トレードオフ

- **計算量**: 期待実行時間は`O((n log n)/p + log^2 n)`程度(ランダムピボットで分割がバランスする場合)。パーティション自体を逐次で行う単純な実装では、最も大きな部分列のパーティション処理がクリティカルパスに残るため、[parallel-merge-sort](/algorithms/parallel-merge-sort)ほど理論的にきれいなスケーラビリティは得にくい
- **最悪ケース**: 逐次版と同様、常に偏ったピボットが選ばれ続けるとO(n^2)に劣化する。ランダム化ピボットや中央値推定によるピボット選択が対策として重要になる
- **in-placeという利点**: [parallel-merge-sort](/algorithms/parallel-merge-sort)は通常マージ用の追加メモリを必要とするのに対し、クイックソートはin-placeで動作するためメモリ使用量が少なくて済む
- **パーティションの並列化という発展**: 実務で高いスケーラビリティを狙う実装では、パーティション処理自体も複数プロセッサで並列に行う(BlockQuicksortのような並列パーティション手法)ことでボトルネックを緩和する
- **使いどころ**: マルチコア環境での大規模配列のインプレースソート、C++標準ライブラリの並列実行ポリシー付き`std::sort`、追加メモリを節約したい状況でのソート処理

## 実装例

```python
from concurrent.futures import ThreadPoolExecutor
import random

THRESHOLD = 2000


def _partition(arr: list[int], lo: int, hi: int) -> int:
    pivot_idx = random.randint(lo, hi)
    arr[pivot_idx], arr[hi] = arr[hi], arr[pivot_idx]
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] < pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    return i


def _parallel_quicksort(arr: list[int], lo: int, hi: int, executor: ThreadPoolExecutor) -> None:
    if hi <= lo:
        return
    if hi - lo <= THRESHOLD:
        arr[lo : hi + 1] = sorted(arr[lo : hi + 1])  # 基底ケース: 逐次ソートに切り替える
        return
    p = _partition(arr, lo, hi)
    left_future = executor.submit(_parallel_quicksort, arr, lo, p - 1, executor)  # フォーク
    _parallel_quicksort(arr, p + 1, hi, executor)  # 自スレッドは右側を担当
    left_future.result()  # ジョイン


def parallel_quicksort(arr: list[int]) -> list[int]:
    result = arr[:]
    with ThreadPoolExecutor() as executor:
        _parallel_quicksort(result, 0, len(result) - 1, executor)
    return result
```

```typescript
const THRESHOLD = 2000;

function partition(arr: number[], lo: number, hi: number): number {
  const pivotIdx = lo + Math.floor(Math.random() * (hi - lo + 1));
  [arr[pivotIdx], arr[hi]] = [arr[hi], arr[pivotIdx]];
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

async function parallelQuicksortRange(
  arr: number[],
  lo: number,
  hi: number,
): Promise<void> {
  if (hi <= lo) return;
  if (hi - lo <= THRESHOLD) {
    const sorted = arr.slice(lo, hi + 1).sort((a, b) => a - b); // 基底ケース: 逐次ソート
    for (let k = 0; k < sorted.length; k++) arr[lo + k] = sorted[k];
    return;
  }
  const p = partition(arr, lo, hi);
  const leftTask = parallelQuicksortRange(arr, lo, p - 1); // フォーク
  const rightTask = parallelQuicksortRange(arr, p + 1, hi); // フォーク
  await Promise.all([leftTask, rightTask]); // ジョイン
}

async function parallelQuicksort(arr: number[]): Promise<number[]> {
  const result = [...arr];
  await parallelQuicksortRange(result, 0, result.length - 1);
  return result;
}
```
