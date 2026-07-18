---
name: ホップクロフト・カープ法
category: グラフ
subcategory: 最大流・マッチング
complexity: O(E√V)
summary: 二部グラフの最大マッチングを高速に求める。
---

## 概要

「学生と学校」「求職者と求人」「男性と女性」のように、2つのグループの要素同士をペアにする「二部グラフ」において、できるだけ多くのペアを作る(最大マッチング)問題を高速に解くアルゴリズム。最大フロー問題の特殊ケースとして解くこともできるが、ホップクロフト・カープ法は二部グラフのマッチングという構造に特化することで、汎用の最大フローアルゴリズムより高速な理論計算量を実現している。

## 仕組み

「増加パス(augmenting path)」を1本ずつ見つけてマッチングを1組ずつ増やす、という発想自体はフォード・ファルカーソン法と同じだが、ホップクロフト・カープ法は**一度に複数の増加パスをまとめて見つける**ことで高速化する。

1. BFSを行い、まだマッチしていない頂点から始まる**最短の増加パスの長さ**を求める
2. その最短の長さと同じ長さを持つ増加パスを、DFSで**互いに頂点が重ならないように、できるだけ多く**同時に見つける
3. 見つけた全ての増加パスに沿ってマッチングを反転させる(未マッチだった辺をマッチさせ、マッチしていた辺を未マッチに戻す)
4. これ以上増加パスが見つからなくなるまで1〜3を繰り返す

「1回のフェーズで複数の増加パスをまとめて処理する」ことにより、フェーズの繰り返し回数がO(√V)回程度に抑えられることが理論的に示されており、これが全体の高速化の根拠になっている。

## 特性・トレードオフ

- **計算量**: O(E√V)。二部グラフの最大マッチングを、汎用の最大フローアルゴリズム(エドモンズ・カープ法のO(VE²)など)よりも高速に解ける
- **二部グラフ専用**: 一般のグラフ(二部でない)の最大マッチングには、また別のアルゴリズム(ブロッサムアルゴリズムなど)が必要になる。二部グラフという構造の良さを最大限利用している
- **最大フロー問題との関係**: 二部マッチングは「始点→左側の全頂点→(マッチング候補の辺)→右側の全頂点→終点」という形のネットワークの最大フロー問題として定式化できるが、ホップクロフト・カープ法はその特殊構造を活かした専用アルゴリズムとして、より高速に動作する
- **使いどころ**: 求人と求職者のマッチング、学生の部活動・研究室配属の割り当て、オンラインデーティングサービスのマッチングなど、「2つのグループ間の最適な組み合わせ数」を求めるあらゆる場面

## 実装例

```python
from collections import deque


def hopcroft_karp(adj: list[list[int]], n_left: int, n_right: int) -> tuple[int, list[int]]:
    INF = float("inf")
    match_left = [-1] * n_left
    match_right = [-1] * n_right
    dist = [0] * n_left

    def bfs() -> bool:
        queue = deque()
        for u in range(n_left):
            if match_left[u] == -1:
                dist[u] = 0
                queue.append(u)
            else:
                dist[u] = INF
        found = False
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                w = match_right[v]
                if w == -1:
                    found = True
                elif dist[w] == INF:
                    dist[w] = dist[u] + 1
                    queue.append(w)
        return found

    def dfs(u: int) -> bool:
        for v in adj[u]:
            w = match_right[v]
            if w == -1 or (dist[w] == dist[u] + 1 and dfs(w)):
                match_left[u] = v
                match_right[v] = u
                return True
        dist[u] = INF
        return False

    matching = 0
    while bfs():
        for u in range(n_left):
            if match_left[u] == -1 and dfs(u):
                matching += 1
    return matching, match_left
```

```typescript
function hopcroftKarp(
  adj: number[][],
  nLeft: number,
  nRight: number,
): { matching: number; matchLeft: number[] } {
  const INF = Infinity;
  const matchLeft = new Array(nLeft).fill(-1);
  const matchRight = new Array(nRight).fill(-1);
  const dist = new Array(nLeft).fill(0);

  function bfs(): boolean {
    const queue: number[] = [];
    for (let u = 0; u < nLeft; u++) {
      if (matchLeft[u] === -1) {
        dist[u] = 0;
        queue.push(u);
      } else {
        dist[u] = INF;
      }
    }
    let found = false;
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      for (const v of adj[u]) {
        const w = matchRight[v];
        if (w === -1) {
          found = true;
        } else if (dist[w] === INF) {
          dist[w] = dist[u] + 1;
          queue.push(w);
        }
      }
    }
    return found;
  }

  function dfs(u: number): boolean {
    for (const v of adj[u]) {
      const w = matchRight[v];
      if (w === -1 || (dist[w] === dist[u] + 1 && dfs(w))) {
        matchLeft[u] = v;
        matchRight[v] = u;
        return true;
      }
    }
    dist[u] = INF;
    return false;
  }

  let matching = 0;
  while (bfs()) {
    for (let u = 0; u < nLeft; u++) {
      if (matchLeft[u] === -1 && dfs(u)) matching++;
    }
  }
  return { matching, matchLeft };
}
```

```cpp
#include <vector>
#include <queue>
#include <limits>
#include <functional>

std::pair<int, std::vector<int>> hopcroftKarp(const std::vector<std::vector<int>>& adj, int nLeft, int nRight) {
    const int INF = std::numeric_limits<int>::max();
    std::vector<int> matchLeft(nLeft, -1);
    std::vector<int> matchRight(nRight, -1);
    std::vector<int> dist(nLeft);

    auto bfs = [&]() -> bool {
        std::queue<int> queue;
        for (int u = 0; u < nLeft; u++) {
            if (matchLeft[u] == -1) {
                dist[u] = 0;
                queue.push(u);
            } else {
                dist[u] = INF;
            }
        }
        bool found = false;
        while (!queue.empty()) {
            int u = queue.front();
            queue.pop();
            for (int v : adj[u]) {
                int w = matchRight[v];
                if (w == -1) {
                    found = true;
                } else if (dist[w] == INF) {
                    dist[w] = dist[u] + 1;
                    queue.push(w);
                }
            }
        }
        return found;
    };

    std::function<bool(int)> dfs = [&](int u) -> bool {
        for (int v : adj[u]) {
            int w = matchRight[v];
            if (w == -1 || (dist[w] == dist[u] + 1 && dfs(w))) {
                matchLeft[u] = v;
                matchRight[v] = u;
                return true;
            }
        }
        dist[u] = INF;
        return false;
    };

    int matching = 0;
    while (bfs()) {
        for (int u = 0; u < nLeft; u++) {
            if (matchLeft[u] == -1 && dfs(u)) matching++;
        }
    }
    return {matching, matchLeft};
}
```

```rust
use std::collections::VecDeque;

fn hopcroft_karp(adj: &[Vec<usize>], n_left: usize, n_right: usize) -> (usize, Vec<i32>) {
    const INF: i32 = i32::MAX;
    let mut match_left: Vec<i32> = vec![-1; n_left];
    let mut match_right: Vec<i32> = vec![-1; n_right];
    let mut dist: Vec<i32> = vec![0; n_left];

    fn bfs(adj: &[Vec<usize>], match_left: &[i32], match_right: &[i32], dist: &mut [i32], n_left: usize) -> bool {
        let mut queue: VecDeque<usize> = VecDeque::new();
        for u in 0..n_left {
            if match_left[u] == -1 {
                dist[u] = 0;
                queue.push_back(u);
            } else {
                dist[u] = INF;
            }
        }
        let mut found = false;
        while let Some(u) = queue.pop_front() {
            for &v in &adj[u] {
                let w = match_right[v];
                if w == -1 {
                    found = true;
                } else if dist[w as usize] == INF {
                    dist[w as usize] = dist[u] + 1;
                    queue.push_back(w as usize);
                }
            }
        }
        found
    }

    fn dfs(u: usize, adj: &[Vec<usize>], match_left: &mut [i32], match_right: &mut [i32], dist: &mut [i32]) -> bool {
        for &v in &adj[u] {
            let w = match_right[v];
            if w == -1 || (dist[w as usize] == dist[u] + 1 && dfs(w as usize, adj, match_left, match_right, dist)) {
                match_left[u] = v as i32;
                match_right[v] = u as i32;
                return true;
            }
        }
        dist[u] = INF;
        false
    }

    let mut matching = 0;
    while bfs(adj, &match_left, &match_right, &mut dist, n_left) {
        for u in 0..n_left {
            if match_left[u] == -1 && dfs(u, adj, &mut match_left, &mut match_right, &mut dist) {
                matching += 1;
            }
        }
    }
    (matching, match_left)
}
```

```csharp
static (int matching, int[] matchLeft) HopcroftKarp(List<int>[] adj, int nLeft, int nRight)
{
    const int INF = int.MaxValue;
    var matchLeft = Enumerable.Repeat(-1, nLeft).ToArray();
    var matchRight = Enumerable.Repeat(-1, nRight).ToArray();
    var dist = new int[nLeft];

    bool Bfs()
    {
        var queue = new Queue<int>();
        for (int u = 0; u < nLeft; u++)
        {
            if (matchLeft[u] == -1) { dist[u] = 0; queue.Enqueue(u); }
            else dist[u] = INF;
        }
        bool found = false;
        while (queue.Count > 0)
        {
            int u = queue.Dequeue();
            foreach (var v in adj[u])
            {
                int w = matchRight[v];
                if (w == -1) found = true;
                else if (dist[w] == INF) { dist[w] = dist[u] + 1; queue.Enqueue(w); }
            }
        }
        return found;
    }

    bool Dfs(int u)
    {
        foreach (var v in adj[u])
        {
            int w = matchRight[v];
            if (w == -1 || (dist[w] == dist[u] + 1 && Dfs(w)))
            {
                matchLeft[u] = v;
                matchRight[v] = u;
                return true;
            }
        }
        dist[u] = INF;
        return false;
    }

    int matching = 0;
    while (Bfs())
    {
        for (int u = 0; u < nLeft; u++)
            if (matchLeft[u] == -1 && Dfs(u)) matching++;
    }
    return (matching, matchLeft);
}
```
