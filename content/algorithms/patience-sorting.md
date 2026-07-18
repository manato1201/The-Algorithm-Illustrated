---
name: 患者ソート(Patience Sorting)
category: ソート
subcategory: 比較ベース
complexity: O(n log n)
summary: トランプの「ペイシェンス(ソリティア)」の山札構築ルールを応用し、複数の山に振り分けてから統合する過程で整列を行う、最長増加部分列の計算にも直結する比較ソート。
---

## 概要

患者ソート(ペイシェンスソート)は、トランプの一人遊び「ペイシェンス」(ソリティアの一種)で山札を積んでいく手順をそのままソートアルゴリズムに応用したもので、単なる整列だけでなく、[最長増加部分列(LIS)](/algorithms/lis)を`O(n log n)`で求める手法としても知られる、2つの顔を持つアルゴリズムである。カードを「今の山の一番上より小さいカードだけ積める」というルールで複数の山に振り分けていくと、山の数がちょうど最長増加部分列の長さに一致するという美しい性質があり、この構築過程を使ってソートも増加部分列の計算もできる。

## 仕組み

1. 配列の要素を先頭から順に処理し、各要素を「今ある山の中で、一番上のカードがその要素以上になっている山のうち、最も左側の山」の上に置く。該当する山がなければ、新しい山を右端に作る(この山選びを[二分探索](/algorithms/binary-search)で高速化できるのが、`O(n log n)`という計算量の鍵になる)
2. 全要素を処理し終えると、複数の山ができあがる。各山の中身は上から下に向かって増加する順序になっている
3. **ソートとして使う場合**: 全ての山の一番上のカードを比較し、最小のものを取り出す、という操作を繰り返す(この部分は[k個のソート済みリストのマージ](/algorithms/merge-sort)と同じ考え方で、優先度付きキューを使うと効率的に実装できる)
4. **最長増加部分列として使う場合**: できあがった山の数がそのままLISの長さになる。実際の部分列を復元するには、各カードを積んだときにその下(直前の山の一番上だったカード)へのポインタを記録しておき、最後の山の一番上から逆に辿ればよい

## 特性・トレードオフ

- **計算量**: 山選びに[二分探索](/algorithms/binary-search)を使うことで`O(n log n)`。ソートとしての最終的なマージ段階も`O(n log n)`に収まる
- **[最長増加部分列(LIS)](/algorithms/lis)との二重性**: 山を作る過程そのものがLISを`O(n log n)`で求めるアルゴリズムの核心部分であり、患者ソートを理解することはLIS問題の高速解法を理解することと表裏一体になっている——ソートアルゴリズムと数列問題のアルゴリズムが同じ構造を共有する興味深い例である
- **実務でのソート用途は限定的**: ソートとしての実用上の効率は他の`O(n log n)`アルゴリズム([マージソート](/algorithms/merge-sort)、[クイックソート](/algorithms/quick-sort))と同程度かそれ以下で、実務ではあまり使われない。むしろLIS計算アルゴリズムとしての価値の方が高い
- **使いどころ**: 競技プログラミングにおけるLIS問題の標準解法、株価の変動パターンや部分列の解析、アルゴリズム設計における「一見無関係な2つの問題が同じ構造を共有する」ことを学ぶ教育的な題材

## 実装例(二分探索で山を選び、最小ヒープでk-wayマージ)

```python
import heapq

def patience_sort(arr: list[int]) -> list[int]:
    arr = arr.copy()
    if not arr:
        return arr
    piles: list[list[int]] = []
    pile_tops: list[int] = []
    for v in arr:
        idx = _bisect_left(pile_tops, v)
        if idx == len(piles):
            piles.append([v])
            pile_tops.append(v)
        else:
            piles[idx].append(v)
            pile_tops[idx] = v

    heap = [(piles[i][-1], i, len(piles[i]) - 1) for i in range(len(piles))]
    heapq.heapify(heap)
    result = []
    while heap:
        val, pi, ei = heapq.heappop(heap)
        result.append(val)
        if ei > 0:
            heapq.heappush(heap, (piles[pi][ei - 1], pi, ei - 1))
    return result

def _bisect_left(tops: list[int], v: int) -> int:
    lo, hi = 0, len(tops)
    while lo < hi:
        mid = (lo + hi) // 2
        if tops[mid] < v:
            lo = mid + 1
        else:
            hi = mid
    return lo
```

```typescript
function patienceSort(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const piles: number[][] = [];
  const pileTops: number[] = [];
  for (const v of arr) {
    const idx = bisectLeft(pileTops, v);
    if (idx === piles.length) {
      piles.push([v]);
      pileTops.push(v);
    } else {
      piles[idx].push(v);
      pileTops[idx] = v;
    }
  }

  type HeapEntry = [number, number, number]; // value, pileIndex, elementIndex
  const heap: HeapEntry[] = [];

  function heapPush(entry: HeapEntry): void {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  }

  function heapPop(): HeapEntry {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < heap.length && heap[left][0] < heap[smallest][0]) smallest = left;
        if (right < heap.length && heap[right][0] < heap[smallest][0]) smallest = right;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  }

  function bisectLeft(tops: number[], v: number): number {
    let lo = 0;
    let hi = tops.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (tops[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  for (let i = 0; i < piles.length; i++) {
    heapPush([piles[i][piles[i].length - 1], i, piles[i].length - 1]);
  }

  const result: number[] = [];
  while (heap.length > 0) {
    const [val, pi, ei] = heapPop();
    result.push(val);
    if (ei > 0) {
      heapPush([piles[pi][ei - 1], pi, ei - 1]);
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <queue>
#include <tuple>

int bisectLeft(const std::vector<int>& tops, int v) {
    int lo = 0, hi = static_cast<int>(tops.size());
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (tops[mid] < v) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

std::vector<int> patienceSort(const std::vector<int>& arr) {
    if (arr.empty()) return {};
    std::vector<std::vector<int>> piles;
    std::vector<int> pileTops;
    for (int v : arr) {
        int idx = bisectLeft(pileTops, v);
        if (idx == static_cast<int>(piles.size())) {
            piles.push_back({v});
            pileTops.push_back(v);
        } else {
            piles[idx].push_back(v);
            pileTops[idx] = v;
        }
    }

    using Entry = std::tuple<int, int, int>; // value, pileIndex, elementIndex
    std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> heap;
    for (int i = 0; i < static_cast<int>(piles.size()); i++) {
        heap.push({piles[i].back(), i, static_cast<int>(piles[i].size()) - 1});
    }

    std::vector<int> result;
    result.reserve(arr.size());
    while (!heap.empty()) {
        auto [val, pi, ei] = heap.top();
        heap.pop();
        result.push_back(val);
        if (ei > 0) {
            heap.push({piles[pi][ei - 1], pi, ei - 1});
        }
    }
    return result;
}
```

```rust
use std::cmp::Reverse;
use std::collections::BinaryHeap;

fn bisect_left(tops: &[i32], v: i32) -> usize {
    let mut lo = 0;
    let mut hi = tops.len();
    while lo < hi {
        let mid = (lo + hi) / 2;
        if tops[mid] < v {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    lo
}

fn patience_sort(arr: &[i32]) -> Vec<i32> {
    if arr.is_empty() {
        return Vec::new();
    }
    let mut piles: Vec<Vec<i32>> = Vec::new();
    let mut pile_tops: Vec<i32> = Vec::new();
    for &v in arr {
        let idx = bisect_left(&pile_tops, v);
        if idx == piles.len() {
            piles.push(vec![v]);
            pile_tops.push(v);
        } else {
            piles[idx].push(v);
            pile_tops[idx] = v;
        }
    }

    // value, pile index, element index の3つ組を最小ヒープで管理する
    let mut heap: BinaryHeap<Reverse<(i32, usize, usize)>> = BinaryHeap::new();
    for (i, pile) in piles.iter().enumerate() {
        heap.push(Reverse((pile[pile.len() - 1], i, pile.len() - 1)));
    }

    let mut result = Vec::with_capacity(arr.len());
    while let Some(Reverse((val, pi, ei))) = heap.pop() {
        result.push(val);
        if ei > 0 {
            heap.push(Reverse((piles[pi][ei - 1], pi, ei - 1)));
        }
    }
    result
}
```

```csharp
static int BisectLeft(List<int> tops, int v)
{
    int lo = 0, hi = tops.Count;
    while (lo < hi)
    {
        int mid = (lo + hi) / 2;
        if (tops[mid] < v) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

static int[] PatienceSort(int[] arr)
{
    if (arr.Length == 0) return Array.Empty<int>();
    var piles = new List<List<int>>();
    var pileTops = new List<int>();
    foreach (int v in arr)
    {
        int idx = BisectLeft(pileTops, v);
        if (idx == piles.Count)
        {
            piles.Add(new List<int> { v });
            pileTops.Add(v);
        }
        else
        {
            piles[idx].Add(v);
            pileTops[idx] = v;
        }
    }

    var heap = new List<(int val, int pi, int ei)>();
    void HeapPush((int val, int pi, int ei) entry)
    {
        heap.Add(entry);
        int i = heap.Count - 1;
        while (i > 0)
        {
            int parent = (i - 1) / 2;
            if (heap[parent].val <= heap[i].val) break;
            (heap[parent], heap[i]) = (heap[i], heap[parent]);
            i = parent;
        }
    }
    (int val, int pi, int ei) HeapPop()
    {
        var top = heap[0];
        var last = heap[^1];
        heap.RemoveAt(heap.Count - 1);
        if (heap.Count > 0)
        {
            heap[0] = last;
            int i = 0;
            while (true)
            {
                int left = 2 * i + 1, right = 2 * i + 2;
                int smallest = i;
                if (left < heap.Count && heap[left].val < heap[smallest].val) smallest = left;
                if (right < heap.Count && heap[right].val < heap[smallest].val) smallest = right;
                if (smallest == i) break;
                (heap[i], heap[smallest]) = (heap[smallest], heap[i]);
                i = smallest;
            }
        }
        return top;
    }

    for (int i = 0; i < piles.Count; i++)
    {
        HeapPush((piles[i][^1], i, piles[i].Count - 1));
    }

    var result = new List<int>(arr.Length);
    while (heap.Count > 0)
    {
        var (val, pi, ei) = HeapPop();
        result.Add(val);
        if (ei > 0)
        {
            HeapPush((piles[pi][ei - 1], pi, ei - 1));
        }
    }
    return result.ToArray();
}
```
