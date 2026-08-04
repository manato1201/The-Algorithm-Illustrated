---
name: スムーズソート(Smoothsort)
category: ソート
subcategory: 比較ベース
complexity: O(n log n)(最悪)、O(n)(ほぼソート済みの入力に対して最良)
summary: ヒープの構造をレオナルド数に基づく複数の木の森として構成することで、ヒープソートと同じ最悪計算量を保ちながらほぼソート済みのデータでは線形時間に近づく比較ソート。
---

## 概要

[ヒープソート](/algorithms/heap-sort)は最悪`O(n log n)`を保証する優れたソートだが、既にほぼ整列済みのデータに対しても常に同じだけの計算コストがかかってしまう(入力の「良さ」を活かせない)という弱点がある。1981年にエドガー・ダイクストラが発表したスムーズソートは、通常の二分ヒープの代わりに「レオナルド数」(フィボナッチ数に似た漸化式で定義される数列)に基づくサイズの複数の木からなる森(フォレスト)を使ってヒープ構造を構成することで、最悪計算量`O(n log n)`を保ちながら、入力がほぼソート済みであれば実行時間が線形`O(n)`に近づく、適応的な比較ソートを実現した。

## 仕組み

1. レオナルド数`L(0)=1, L(1)=1, L(k)=L(k-1)+L(k-2)+1`で定義されるサイズを持つ複数の「レオナルドの木」(各木はヒープ条件を満たす)の森として、配列を仮想的に管理する
2. 要素を1つずつ配列の先頭から末尾へ処理し、各要素を新しい木として森に追加する。追加のたびに、森の中の木のサイズの並び(レオナルド数の並び)を保つための木の統合・調整を行い、ヒープ条件を維持する(この段階が[ヒープソート](/algorithms/heap-sort)の「ヒープ構築」フェーズに相当する)
3. 全要素を森に組み込んだら、森全体の最大値(必ずいずれかの木の根にある)を末尾から順に取り出していく。取り出すたびに、その木を2つの子の木に分解し、森の構造を再調整する(これが[ヒープソート](/algorithms/heap-sort)の「取り出し」フェーズに相当する)
4. 全要素を取り出し終えると、配列が昇順に整列される

## 特性・トレードオフ

- **計算量**: 最悪`O(n log n)`で[ヒープソート](/algorithms/heap-sort)と同じ保証を持ちながら、入力がほぼソート済みの場合は`O(n)`に近づく適応性を持つ——これは[挿入ソート](/algorithms/insertion-sort)の適応性と[ヒープソート](/algorithms/heap-sort)の最悪保証を両立させようとした設計意図の表れである
- **実装の複雑さ**: レオナルド数に基づく森の管理・木の統合と分解のロジックは、通常の二分ヒープよりも大幅に複雑で、実装・デバッグの難易度が高い。この複雑さが実務での採用を妨げる主な要因になっている
- **追加のメモリを必要としない**: [ヒープソート](/algorithms/heap-sort)と同様、配列内でのin-place実行が可能で、追加のメモリ領域をほとんど必要としない
- **使いどころ**: ほぼソート済みのデータが頻繁に発生する状況(既に整列済みのログファイルへの少数の追加要素の挿入等)での理論的に興味深い選択肢。実装の複雑さから実務での採用例は少なく、主にアルゴリズム理論・適応的ソートの設計研究における重要な事例として知られる

## 実装例

レオナルド数のサイズを持つ木の森として配列を管理し、構築フェーズで各要素を追加しては`trinkle`(新しい根を、自身の子および手前の木の根と比較しながら適切な位置まで浮かび上がらせる操作)で調整し、抽出フェーズで最大の木を2つの子の木に分解しながら末尾から取り出していく。ランダムな配列に対して`Array.prototype.sort`(や各言語の標準ソート)の結果と一致することを検証している。

```python
_leonardo_cache = [1, 1]


def leonardo(k: int) -> int:
    while len(_leonardo_cache) <= k:
        _leonardo_cache.append(_leonardo_cache[-1] + _leonardo_cache[-2] + 1)
    return _leonardo_cache[k]


def _sift_down(a: list[int], root: int, order: int) -> None:
    while order >= 2:
        right_root = root - 1
        left_root = root - 1 - leonardo(order - 1)
        if a[left_root] <= a[root] and a[right_root] <= a[root]:
            return
        if a[left_root] >= a[right_root]:
            a[root], a[left_root] = a[left_root], a[root]
            root, order = left_root, order - 2
        else:
            a[root], a[right_root] = a[right_root], a[root]
            root, order = right_root, order - 1


def _trinkle(a: list[int], root: int, order: int, orders: list[int], stack_index: int) -> None:
    while True:
        best_root = root
        best_is_prev = False
        prev_root = prev_order = -1
        if stack_index > 0:
            prev_order = orders[stack_index - 1]
            prev_root = root - leonardo(order)
            if a[prev_root] > a[best_root]:
                best_root, best_is_prev = prev_root, True
        if order >= 2:
            right_root = root - 1
            left_root = root - 1 - leonardo(order - 1)
            if a[left_root] > a[best_root]:
                best_root, best_is_prev = left_root, False
            if a[right_root] > a[best_root]:
                best_root, best_is_prev = right_root, False
        if best_root == root:
            return
        if best_is_prev:
            a[root], a[prev_root] = a[prev_root], a[root]
            root, order, stack_index = prev_root, prev_order, stack_index - 1
        else:
            _sift_down(a, root, order)
            return


def smooth_sort(arr: list[int]) -> list[int]:
    a = arr.copy()
    n = len(a)
    if n <= 1:
        return a

    orders: list[int] = []  # 森を構成する木の次数(左から右へ)

    # --- 構築フェーズ: 各要素を新しい木として追加し、trinkleで調整する ---
    for i in range(n):
        if len(orders) >= 2 and orders[-2] == orders[-1] - 1:
            orders[-2:] = [orders[-1] + 1]  # 隣接する2本の木を1本に統合
        elif orders and orders[-1] == 1:
            orders.append(0)
        else:
            orders.append(1)
        _trinkle(a, i, orders[-1], orders, len(orders) - 1)

    # --- 抽出フェーズ: 末尾の木を2つの子の木に分解しながら取り出す ---
    for end in range(n - 1, 0, -1):
        order = orders[-1]
        if order <= 1:
            orders.pop()
            continue
        right_order, left_order = order - 1, order - 2
        right_root = end - 1
        left_root = end - 1 - leonardo(right_order)
        orders[-1:] = [left_order, right_order]
        _trinkle(a, left_root, left_order, orders, len(orders) - 2)
        _trinkle(a, right_root, right_order, orders, len(orders) - 1)

    return a
```

```typescript
const leonardoCache: number[] = [1, 1];

function leonardo(k: number): number {
  while (leonardoCache.length <= k) {
    leonardoCache.push(leonardoCache[leonardoCache.length - 1] + leonardoCache[leonardoCache.length - 2] + 1);
  }
  return leonardoCache[k];
}

function siftDown(a: number[], root: number, order: number): void {
  while (order >= 2) {
    const rightRoot = root - 1;
    const leftRoot = root - 1 - leonardo(order - 1);
    if (a[leftRoot] <= a[root] && a[rightRoot] <= a[root]) return;
    if (a[leftRoot] >= a[rightRoot]) {
      [a[root], a[leftRoot]] = [a[leftRoot], a[root]];
      root = leftRoot;
      order -= 2;
    } else {
      [a[root], a[rightRoot]] = [a[rightRoot], a[root]];
      root = rightRoot;
      order -= 1;
    }
  }
}

function trinkle(a: number[], root: number, order: number, orders: number[], stackIndex: number): void {
  for (;;) {
    let bestRoot = root;
    let bestIsPrev = false;
    let prevRoot = -1;
    let prevOrder = -1;
    if (stackIndex > 0) {
      prevOrder = orders[stackIndex - 1];
      prevRoot = root - leonardo(order);
      if (a[prevRoot] > a[bestRoot]) {
        bestRoot = prevRoot;
        bestIsPrev = true;
      }
    }
    if (order >= 2) {
      const rightRoot = root - 1;
      const leftRoot = root - 1 - leonardo(order - 1);
      if (a[leftRoot] > a[bestRoot]) {
        bestRoot = leftRoot;
        bestIsPrev = false;
      }
      if (a[rightRoot] > a[bestRoot]) {
        bestRoot = rightRoot;
        bestIsPrev = false;
      }
    }
    if (bestRoot === root) return;
    if (bestIsPrev) {
      [a[root], a[prevRoot]] = [a[prevRoot], a[root]];
      root = prevRoot;
      order = prevOrder;
      stackIndex -= 1;
    } else {
      siftDown(a, root, order);
      return;
    }
  }
}

function smoothSort(arr: number[]): number[] {
  const a = [...arr];
  const n = a.length;
  if (n <= 1) return a;

  const orders: number[] = [];

  for (let i = 0; i < n; i++) {
    if (orders.length >= 2 && orders[orders.length - 2] === orders[orders.length - 1] - 1) {
      const newOrder = orders[orders.length - 1] + 1;
      orders.pop();
      orders.pop();
      orders.push(newOrder);
    } else if (orders.length > 0 && orders[orders.length - 1] === 1) {
      orders.push(0);
    } else {
      orders.push(1);
    }
    trinkle(a, i, orders[orders.length - 1], orders, orders.length - 1);
  }

  for (let end = n - 1; end > 0; end--) {
    const order = orders[orders.length - 1];
    if (order <= 1) {
      orders.pop();
      continue;
    }
    const rightOrder = order - 1;
    const leftOrder = order - 2;
    const rightRoot = end - 1;
    const leftRoot = end - 1 - leonardo(rightOrder);
    orders.pop();
    orders.push(leftOrder);
    orders.push(rightOrder);
    trinkle(a, leftRoot, leftOrder, orders, orders.length - 2);
    trinkle(a, rightRoot, rightOrder, orders, orders.length - 1);
  }

  return a;
}
```

```cpp
#include <vector>
#include <utility>

namespace {

std::vector<int> leonardoCache = {1, 1};

int leonardo(int k) {
    while (static_cast<int>(leonardoCache.size()) <= k) {
        int s = static_cast<int>(leonardoCache.size());
        leonardoCache.push_back(leonardoCache[s - 1] + leonardoCache[s - 2] + 1);
    }
    return leonardoCache[k];
}

void siftDown(std::vector<int>& a, int root, int order) {
    while (order >= 2) {
        int rightRoot = root - 1;
        int leftRoot = root - 1 - leonardo(order - 1);
        if (a[leftRoot] <= a[root] && a[rightRoot] <= a[root]) return;
        if (a[leftRoot] >= a[rightRoot]) {
            std::swap(a[root], a[leftRoot]);
            root = leftRoot;
            order -= 2;
        } else {
            std::swap(a[root], a[rightRoot]);
            root = rightRoot;
            order -= 1;
        }
    }
}

void trinkle(std::vector<int>& a, int root, int order, std::vector<int>& orders, int stackIndex) {
    while (true) {
        int bestRoot = root;
        bool bestIsPrev = false;
        int prevRoot = -1;
        int prevOrder = -1;
        if (stackIndex > 0) {
            prevOrder = orders[stackIndex - 1];
            prevRoot = root - leonardo(order);
            if (a[prevRoot] > a[bestRoot]) {
                bestRoot = prevRoot;
                bestIsPrev = true;
            }
        }
        if (order >= 2) {
            int rightRoot = root - 1;
            int leftRoot = root - 1 - leonardo(order - 1);
            if (a[leftRoot] > a[bestRoot]) {
                bestRoot = leftRoot;
                bestIsPrev = false;
            }
            if (a[rightRoot] > a[bestRoot]) {
                bestRoot = rightRoot;
                bestIsPrev = false;
            }
        }
        if (bestRoot == root) return;
        if (bestIsPrev) {
            std::swap(a[root], a[prevRoot]);
            root = prevRoot;
            order = prevOrder;
            stackIndex -= 1;
        } else {
            siftDown(a, root, order);
            return;
        }
    }
}

}  // namespace

std::vector<int> smoothSort(std::vector<int> arr) {
    std::vector<int> a = arr;
    int n = static_cast<int>(a.size());
    if (n <= 1) return a;

    std::vector<int> orders;

    for (int i = 0; i < n; i++) {
        if (orders.size() >= 2 && orders[orders.size() - 2] == orders[orders.size() - 1] - 1) {
            int newOrder = orders.back() + 1;
            orders.pop_back();
            orders.pop_back();
            orders.push_back(newOrder);
        } else if (!orders.empty() && orders.back() == 1) {
            orders.push_back(0);
        } else {
            orders.push_back(1);
        }
        trinkle(a, i, orders.back(), orders, static_cast<int>(orders.size()) - 1);
    }

    for (int end = n - 1; end > 0; end--) {
        int order = orders.back();
        if (order <= 1) {
            orders.pop_back();
            continue;
        }
        int rightOrder = order - 1;
        int leftOrder = order - 2;
        int rightRoot = end - 1;
        int leftRoot = end - 1 - leonardo(rightOrder);
        orders.pop_back();
        orders.push_back(leftOrder);
        orders.push_back(rightOrder);
        trinkle(a, leftRoot, leftOrder, orders, static_cast<int>(orders.size()) - 2);
        trinkle(a, rightRoot, rightOrder, orders, static_cast<int>(orders.size()) - 1);
    }

    return a;
}
```

```rust
fn leonardo(k: i32) -> i64 {
    let (mut a, mut b): (i64, i64) = (1, 1);
    for _ in 0..k {
        let c = a + b + 1;
        a = b;
        b = c;
    }
    a
}

fn sift_down(a: &mut [i32], mut root: usize, mut order: i32) {
    while order >= 2 {
        let right_root = root - 1;
        let left_root = root - 1 - leonardo(order - 1) as usize;
        if a[left_root] <= a[root] && a[right_root] <= a[root] {
            return;
        }
        if a[left_root] >= a[right_root] {
            a.swap(root, left_root);
            root = left_root;
            order -= 2;
        } else {
            a.swap(root, right_root);
            root = right_root;
            order -= 1;
        }
    }
}

fn trinkle(a: &mut [i32], mut root: usize, mut order: i32, orders: &[i32], mut stack_index: usize) {
    loop {
        let mut best_root = root;
        let mut best_is_prev = false;
        let mut prev_root = 0usize;
        let mut prev_order = 0i32;
        if stack_index > 0 {
            prev_order = orders[stack_index - 1];
            prev_root = root - leonardo(order) as usize;
            if a[prev_root] > a[best_root] {
                best_root = prev_root;
                best_is_prev = true;
            }
        }
        if order >= 2 {
            let right_root = root - 1;
            let left_root = root - 1 - leonardo(order - 1) as usize;
            if a[left_root] > a[best_root] {
                best_root = left_root;
                best_is_prev = false;
            }
            if a[right_root] > a[best_root] {
                best_root = right_root;
                best_is_prev = false;
            }
        }
        if best_root == root {
            return;
        }
        if best_is_prev {
            a.swap(root, prev_root);
            root = prev_root;
            order = prev_order;
            stack_index -= 1;
        } else {
            sift_down(a, root, order);
            return;
        }
    }
}

fn smooth_sort(arr: &[i32]) -> Vec<i32> {
    let mut a = arr.to_vec();
    let n = a.len();
    if n <= 1 {
        return a;
    }

    let mut orders: Vec<i32> = Vec::new();

    for i in 0..n {
        if orders.len() >= 2 && orders[orders.len() - 2] == orders[orders.len() - 1] - 1 {
            let new_order = orders[orders.len() - 1] + 1;
            orders.pop();
            orders.pop();
            orders.push(new_order);
        } else if orders.last() == Some(&1) {
            orders.push(0);
        } else {
            orders.push(1);
        }
        let last_order = *orders.last().unwrap();
        trinkle(&mut a, i, last_order, &orders, orders.len() - 1);
    }

    for end in (1..n).rev() {
        let order = *orders.last().unwrap();
        if order <= 1 {
            orders.pop();
            continue;
        }
        let right_order = order - 1;
        let left_order = order - 2;
        let right_root = end - 1;
        let left_root = end - 1 - leonardo(right_order) as usize;
        orders.pop();
        orders.push(left_order);
        orders.push(right_order);
        let idx_left = orders.len() - 2;
        trinkle(&mut a, left_root, left_order, &orders, idx_left);
        let idx_right = orders.len() - 1;
        trinkle(&mut a, right_root, right_order, &orders, idx_right);
    }

    a
}
```

```csharp
static class SmoothSort
{
    private static readonly List<long> LeonardoCache = new() { 1, 1 };

    private static long Leonardo(int k)
    {
        while (LeonardoCache.Count <= k)
        {
            LeonardoCache.Add(LeonardoCache[^1] + LeonardoCache[^2] + 1);
        }
        return LeonardoCache[k];
    }

    private static void SiftDown(int[] a, int root, int order)
    {
        while (order >= 2)
        {
            int rightRoot = root - 1;
            int leftRoot = (int)(root - 1 - Leonardo(order - 1));
            if (a[leftRoot] <= a[root] && a[rightRoot] <= a[root]) return;
            if (a[leftRoot] >= a[rightRoot])
            {
                (a[root], a[leftRoot]) = (a[leftRoot], a[root]);
                root = leftRoot;
                order -= 2;
            }
            else
            {
                (a[root], a[rightRoot]) = (a[rightRoot], a[root]);
                root = rightRoot;
                order -= 1;
            }
        }
    }

    private static void Trinkle(int[] a, int root, int order, List<int> orders, int stackIndex)
    {
        while (true)
        {
            int bestRoot = root;
            bool bestIsPrev = false;
            int prevRoot = -1, prevOrder = -1;
            if (stackIndex > 0)
            {
                prevOrder = orders[stackIndex - 1];
                prevRoot = (int)(root - Leonardo(order));
                if (a[prevRoot] > a[bestRoot]) { bestRoot = prevRoot; bestIsPrev = true; }
            }
            if (order >= 2)
            {
                int rightRoot = root - 1;
                int leftRoot = (int)(root - 1 - Leonardo(order - 1));
                if (a[leftRoot] > a[bestRoot]) { bestRoot = leftRoot; bestIsPrev = false; }
                if (a[rightRoot] > a[bestRoot]) { bestRoot = rightRoot; bestIsPrev = false; }
            }
            if (bestRoot == root) return;
            if (bestIsPrev)
            {
                (a[root], a[prevRoot]) = (a[prevRoot], a[root]);
                root = prevRoot;
                order = prevOrder;
                stackIndex -= 1;
            }
            else
            {
                SiftDown(a, root, order);
                return;
            }
        }
    }

    public static int[] Sort(int[] arr)
    {
        var a = (int[])arr.Clone();
        int n = a.Length;
        if (n <= 1) return a;

        var orders = new List<int>();

        for (int i = 0; i < n; i++)
        {
            if (orders.Count >= 2 && orders[^2] == orders[^1] - 1)
            {
                int newOrder = orders[^1] + 1;
                orders.RemoveAt(orders.Count - 1);
                orders.RemoveAt(orders.Count - 1);
                orders.Add(newOrder);
            }
            else if (orders.Count > 0 && orders[^1] == 1)
            {
                orders.Add(0);
            }
            else
            {
                orders.Add(1);
            }
            Trinkle(a, i, orders[^1], orders, orders.Count - 1);
        }

        for (int end = n - 1; end > 0; end--)
        {
            int order = orders[^1];
            if (order <= 1)
            {
                orders.RemoveAt(orders.Count - 1);
                continue;
            }
            int rightOrder = order - 1;
            int leftOrder = order - 2;
            int rightRoot = end - 1;
            int leftRoot = (int)(end - 1 - Leonardo(rightOrder));
            orders.RemoveAt(orders.Count - 1);
            orders.Add(leftOrder);
            orders.Add(rightOrder);
            Trinkle(a, leftRoot, leftOrder, orders, orders.Count - 2);
            Trinkle(a, rightRoot, rightOrder, orders, orders.Count - 1);
        }

        return a;
    }
}
```
