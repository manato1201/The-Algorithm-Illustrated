---
name: カーンのアルゴリズム(トポロジカルソート)
category: グラフ
subcategory: 連結性・順序
complexity: O(V + E)
summary: 入次数0の頂点から順に取り除いていく、DFSを使わないトポロジカルソートの実装。
---

## 概要

トポロジカルソート(依存関係のあるタスクを実行可能な順序に並べる)を、DFSではなく**BFS的な発想**で実現する方法。「まだ誰にも依存されていない(=入次数が0の)タスクから、片っ端から片付けていく」という、より直感的で日常の感覚に近いアプローチを取る。DFSベースの実装(帰りがけ順にリストへ追加する)と結果は同じだが、考え方の筋道が異なる。

## 仕組み

「入次数」とは、その頂点に向かう辺(依存元)の本数のこと。

1. 全ての頂点について入次数を数える
2. 入次数が0の頂点(=誰にも依存されていない、今すぐ着手できるタスク)を全てキューに入れる
3. キューから頂点を1つ取り出し、結果リストに追加する
4. その頂点から出る全ての辺について、辺の先の頂点の入次数を1減らす(その依存が解消されたことを表す)。入次数が0になった頂点があれば、キューに追加する
5. キューが空になるまで3〜4を繰り返す

処理の様子は、まさに「今すぐできるタスクから順に片付け、それによって新しく着手可能になったタスクをどんどん追加していく」という、日々のタスク管理そのものに近い。

## 特性・トレードオフ

- **計算量**: O(V + E)。DFSベースの実装と同じオーダーで、実用上の速度もほぼ同等
- **閉路検出が自然にできる**: 全頂点を処理し終える前にキューが空になってしまった場合、それは処理できずに残った頂点が存在する=依存関係に循環(閉路)があるということを意味する。DFSベースの実装(訪問中フラグでの検出)とは異なる形で、同じく閉路を検出できる
- **BFS的な発想の利点**: 実行のイメージが「今できることから順にこなす」という直感に合いやすく、教育的にも理解しやすいとされる。並列実行可能なタスク(同時にキューに入っている複数のタスク)を見つけやすいという実務上の利点もある
- **使いどころ**: DFSベースのトポロジカルソートと同じ、ビルドシステムのタスク実行順序決定、依存関係のある処理のスケジューリングなど。「同時に実行できるタスク群」を知りたい場合はこちらの方が扱いやすいことが多い

## 実装例

```python
from collections import deque


def kahn_topological_sort(n: int, adj: list[list[int]]) -> list[int] | None:
    indeg = [0] * n
    for u in range(n):
        for v in adj[u]:
            indeg[v] += 1

    queue = deque(u for u in range(n) if indeg[u] == 0)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)

    if len(order) != n:
        return None  # 閉路が存在し、全頂点を処理しきれなかった
    return order
```

```typescript
function kahnTopologicalSort(n: number, adj: number[][]): number[] | null {
  const indeg = new Array(n).fill(0);
  for (let u = 0; u < n; u++) for (const v of adj[u]) indeg[v]++;

  const queue: number[] = [];
  for (let u = 0; u < n; u++) if (indeg[u] === 0) queue.push(u);

  const order: number[] = [];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of adj[u]) {
      indeg[v]--;
      if (indeg[v] === 0) queue.push(v);
    }
  }

  // 閉路が存在すると全頂点を処理しきれず、順序長が頂点数に満たない
  return order.length === n ? order : null;
}
```

```cpp
#include <vector>
#include <queue>
#include <optional>

std::optional<std::vector<int>> kahnTopologicalSort(int n, const std::vector<std::vector<int>>& adj) {
    std::vector<int> indeg(n, 0);
    for (int u = 0; u < n; u++)
        for (int v : adj[u]) indeg[v]++;

    std::queue<int> queue;
    for (int u = 0; u < n; u++)
        if (indeg[u] == 0) queue.push(u);

    std::vector<int> order;
    while (!queue.empty()) {
        int u = queue.front();
        queue.pop();
        order.push_back(u);
        for (int v : adj[u]) {
            if (--indeg[v] == 0) queue.push(v);
        }
    }

    if (static_cast<int>(order.size()) != n) {
        return std::nullopt;  // 閉路が存在する
    }
    return order;
}
```

```rust
use std::collections::VecDeque;

fn kahn_topological_sort(n: usize, adj: &[Vec<usize>]) -> Option<Vec<usize>> {
    let mut indeg = vec![0usize; n];
    for u in 0..n {
        for &v in &adj[u] {
            indeg[v] += 1;
        }
    }

    let mut queue: VecDeque<usize> = (0..n).filter(|&u| indeg[u] == 0).collect();
    let mut order = Vec::with_capacity(n);
    while let Some(u) = queue.pop_front() {
        order.push(u);
        for &v in &adj[u] {
            indeg[v] -= 1;
            if indeg[v] == 0 {
                queue.push_back(v);
            }
        }
    }

    if order.len() != n {
        None // 閉路が存在する
    } else {
        Some(order)
    }
}
```

```csharp
static List<int>? KahnTopologicalSort(int n, List<int>[] adj)
{
    var indeg = new int[n];
    for (int u = 0; u < n; u++)
        foreach (var v in adj[u]) indeg[v]++;

    var queue = new Queue<int>();
    for (int u = 0; u < n; u++)
        if (indeg[u] == 0) queue.Enqueue(u);

    var order = new List<int>();
    while (queue.Count > 0)
    {
        int u = queue.Dequeue();
        order.Add(u);
        foreach (var v in adj[u])
        {
            indeg[v]--;
            if (indeg[v] == 0) queue.Enqueue(v);
        }
    }

    // 閉路が存在すると全頂点を処理しきれない
    return order.Count == n ? order : null;
}
```
