---
name: トーナメントソート(Tournament Sort)
category: ソート
subcategory: 比較ベース
complexity: O(n log n)
summary: 要素同士をスポーツのトーナメント戦のように対戦させ、勝者(最小値)を決定木の根に押し上げる操作を繰り返して整列する、選択ソートを対戦木で高速化した比較ソート。
---

## 概要

[選択ソート](/algorithms/selection-sort)は「残りの要素の中から最小値を探す」ことを毎回`O(n)`かけて行うため全体で`O(n²)`かかるが、この「最小値探し」を1回ごとにゼロからやり直すのは無駄が多い。トーナメントソートは、スポーツのトーナメント戦のように要素同士を1対1で対戦(比較)させ、勝ち上がった要素を決定木の形で記録しておくことで、最小値を取り出した後の「次の最小値探し」を、対戦の記録を再利用しながら`O(log n)`で済ませる、選択ソートの高速化版と位置づけられるアルゴリズムである。

## 仕組み

1. `n`個の要素を決定木(トーナメント表)の葉に配置する。各内部ノードは、その2つの子のうち小さい方(勝者)を保持する——これを木の根まで繰り返すと、根には全体の最小値が入る
2. 根の値(全体の最小値)を出力し、その値があった葉を`+∞`(番兵)に置き換える
3. その葉から根まで、対戦結果を再計算し直す(1回の再計算は木の高さ`log n`回の比較で済む——ここが選択ソートの`O(n)`の最小値探しより高速な理由)
4. 根に新しい最小値が上がってくるので、それを出力する。これを全要素を出力し終えるまで繰り返す

トーナメント木の各内部ノードが「そのノード配下での現在の最小値」を保持し続けるため、1要素を取り出すごとの更新コストが、選択ソートの`O(n)`から`O(log n)`へと大幅に改善される。

## 特性・トレードオフ

- **計算量**: 木の構築に`O(n)`、以降`n`回の取り出しがそれぞれ`O(log n)`かかるため、全体で`O(n log n)`——[選択ソート](/algorithms/selection-sort)の`O(n²)`から計算量のクラスが改善されている
- **[ヒープソート](/algorithms/heap-sort)との類似性**: どちらも「木構造を使って最小値(または最大値)の取り出しを高速化する」という発想を共有しているが、ヒープソートが1つの配列内でヒープ構造を維持するのに対し、トーナメントソートは明示的な決定木(対戦表)を使う点が異なる。実務ではメモリ効率に優れる[ヒープソート](/algorithms/heap-sort)が選ばれることが多い
- **外部ソートとの相性**: メモリに乗り切らない大量データを複数のソート済みチャンクからマージする「外部ソート」において、各チャンクの先頭要素同士を比較する「k-way merge」の高速化にトーナメント木(勝者木)の考え方がそのまま応用できる
- **使いどころ**: データベースの外部ソート(k個のソート済みファイルのマージ)、スポーツのトーナメント表の順位付けと同じ構造を持つ順位計算全般、[ヒープソート](/algorithms/heap-sort)の理解を深めるための対比対象

## 実装例(配列で表現したトーナメント木、番兵に無限大を使用)

```python
import math

def tournament_sort(arr: list[int]) -> list[int]:
    if not arr:
        return []
    n = len(arr)
    size = 1
    while size < n:
        size *= 2
    inf = math.inf
    leaves = arr + [inf] * (size - n)
    tree = [0] * (2 * size)
    for i in range(size):
        tree[size + i] = i
    for i in range(size - 1, 0, -1):
        left, right = tree[2 * i], tree[2 * i + 1]
        tree[i] = left if leaves[left] <= leaves[right] else right

    result = []
    for _ in range(n):
        winner = tree[1]
        result.append(leaves[winner])
        leaves[winner] = inf
        i = (size + winner) // 2
        while i >= 1:
            left, right = tree[2 * i], tree[2 * i + 1]
            tree[i] = left if leaves[left] <= leaves[right] else right
            i //= 2
    return result
```

```typescript
function tournamentSort(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const n = arr.length;
  let size = 1;
  while (size < n) size *= 2;
  const INF = Infinity;
  const leaves = [...arr, ...new Array(size - n).fill(INF)];
  const tree = new Array(2 * size).fill(0);
  for (let i = 0; i < size; i++) tree[size + i] = i;
  for (let i = size - 1; i >= 1; i--) {
    const left = tree[2 * i];
    const right = tree[2 * i + 1];
    tree[i] = leaves[left] <= leaves[right] ? left : right;
  }

  const result: number[] = [];
  for (let c = 0; c < n; c++) {
    const winner = tree[1];
    result.push(leaves[winner]);
    leaves[winner] = INF;
    let i = Math.floor((size + winner) / 2);
    while (i >= 1) {
      const left = tree[2 * i];
      const right = tree[2 * i + 1];
      tree[i] = leaves[left] <= leaves[right] ? left : right;
      i = Math.floor(i / 2);
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <limits>

std::vector<int> tournamentSort(const std::vector<int>& arr) {
    if (arr.empty()) return {};
    int n = static_cast<int>(arr.size());
    int size = 1;
    while (size < n) size *= 2;
    const double INF = std::numeric_limits<double>::infinity();

    std::vector<double> leaves(size, INF);
    for (int i = 0; i < n; i++) leaves[i] = arr[i];

    std::vector<int> tree(2 * size);
    for (int i = 0; i < size; i++) tree[size + i] = i;
    for (int i = size - 1; i >= 1; i--) {
        int left = tree[2 * i], right = tree[2 * i + 1];
        tree[i] = (leaves[left] <= leaves[right]) ? left : right;
    }

    std::vector<int> result;
    result.reserve(n);
    for (int c = 0; c < n; c++) {
        int winner = tree[1];
        result.push_back(static_cast<int>(leaves[winner]));
        leaves[winner] = INF;
        int i = (size + winner) / 2;
        while (i >= 1) {
            int left = tree[2 * i], right = tree[2 * i + 1];
            tree[i] = (leaves[left] <= leaves[right]) ? left : right;
            i /= 2;
        }
    }
    return result;
}
```

```rust
fn tournament_sort(arr: &[i32]) -> Vec<i32> {
    if arr.is_empty() {
        return Vec::new();
    }
    let n = arr.len();
    let mut size = 1usize;
    while size < n {
        size *= 2;
    }
    let inf = f64::INFINITY;

    let mut leaves = vec![inf; size];
    for i in 0..n {
        leaves[i] = arr[i] as f64;
    }

    let mut tree = vec![0usize; 2 * size];
    for i in 0..size {
        tree[size + i] = i;
    }
    for i in (1..size).rev() {
        let left = tree[2 * i];
        let right = tree[2 * i + 1];
        tree[i] = if leaves[left] <= leaves[right] { left } else { right };
    }

    let mut result = Vec::with_capacity(n);
    for _ in 0..n {
        let winner = tree[1];
        result.push(leaves[winner] as i32);
        leaves[winner] = inf;
        let mut i = (size + winner) / 2;
        while i >= 1 {
            let left = tree[2 * i];
            let right = tree[2 * i + 1];
            tree[i] = if leaves[left] <= leaves[right] { left } else { right };
            i /= 2;
        }
    }
    result
}
```

```csharp
static int[] TournamentSort(int[] arr)
{
    if (arr.Length == 0) return Array.Empty<int>();
    int n = arr.Length;
    int size = 1;
    while (size < n) size *= 2;
    const double Inf = double.PositiveInfinity;
    var leaves = new double[size];
    for (int i = 0; i < n; i++) leaves[i] = arr[i];
    for (int i = n; i < size; i++) leaves[i] = Inf;

    var tree = new int[2 * size];
    for (int i = 0; i < size; i++) tree[size + i] = i;
    for (int i = size - 1; i >= 1; i--)
    {
        int left = tree[2 * i], right = tree[2 * i + 1];
        tree[i] = leaves[left] <= leaves[right] ? left : right;
    }

    var result = new int[n];
    for (int c = 0; c < n; c++)
    {
        int winner = tree[1];
        result[c] = (int)leaves[winner];
        leaves[winner] = Inf;
        int i = (size + winner) / 2;
        while (i >= 1)
        {
            int left = tree[2 * i], right = tree[2 * i + 1];
            tree[i] = leaves[left] <= leaves[right] ? left : right;
            i /= 2;
        }
    }
    return result;
}
```
