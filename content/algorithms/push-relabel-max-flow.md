---
name: プッシュ・リレーベル法(最大流)
category: グラフ
subcategory: 最大流・マッチング
complexity: O(V²×E)(汎用実装)、O(V³)(FIFO選択則使用時)
summary: 「増加パスを1本ずつ探す」のではなく、各頂点に余剰フローを一時的に溜め込みながら局所的にプッシュ・高さ調整を繰り返すことで最大流を求める、Edmonds-Karp法やDinic法とは異なる発想の最大流アルゴリズム。
---

## 概要

[Edmonds-Karp法](/algorithms/edmonds-karp)や[Dinic法](/algorithms/dinic)は「ソースからシンクまでの増加パスを1本ずつ(または層ごとに)見つけてフローを流す」という考え方を共有しているが、1974年に着想され1988年にゴールドバーグとタージャンによって洗練されたプッシュ・リレーベル法は、全く異なる発想を取る——各頂点が一時的に「入ってきた量より多くのフローを溜め込む(余剰)」ことを許容し、水があふれるように余剰分を隣接頂点へ局所的に「押し出す(プッシュ)」ことを繰り返しながら、押し出せなくなったら頂点の「高さ」を上げて別の方向へ押し出せるようにする、という局所的な操作の繰り返しだけで最終的に大域的な最大流を実現する。

## 仕組み

1. 各頂点に「高さ」(ラベル)を割り当てる。ソースの高さは頂点数`V`、他の全頂点の高さは0で初期化する
2. ソースから隣接する全ての辺に、容量いっぱいまでフローを「プレフロー」として流し込む(通常のフロー保存則を一時的に破り、頂点に余剰を溜め込む)
3. 余剰(入ってきた量より出ていった量が少ない)を持つ頂点`u`がある限り、以下を繰り返す: (a) `u`より高さが1低く、かつ残余容量がある隣接頂点`v`があれば、`u`から`v`へ可能な限りプッシュする、(b) そのような`v`がなければ、`u`の高さを「`u`から残余容量のある辺で繋がる頂点の中で最も低い高さ+1」に引き上げる(リレーベル)
4. どの頂点にも余剰がなくなったら(ソースとシンクを除く)、そのときのフローが最大流になる

「高さ」は水位のようなもので、フローは常に高いところから低いところへ流れようとする。行き詰まったら自分の高さを上げて新しい流出先を作る、という単純な局所ルールだけで、大域的な最大流に収束する。

## 特性・トレードオフ

- **計算量**: 汎用の実装で`O(V²×E)`、余剰を持つ頂点の選択則を工夫する(FIFO順に処理する等)と`O(V³)`まで改善できる。密なグラフ(辺の数が多いグラフ)では、増加パスを探す[Dinic法](/algorithms/dinic)より高速に動作することが多い
- **局所的な操作だけで大域的最適に到達する**: [Edmonds-Karp法](/algorithms/edmonds-karp)や[Dinic法](/algorithms/dinic)がグラフ全体を見渡す探索([BFS](/algorithms/bfs))を繰り返すのに対し、プッシュ・リレーベル法は各頂点が自分の周辺情報だけで判断する局所的な操作の繰り返しで最大流に到達する——この性質から並列化・分散実装がしやすいという利点がある
- **一時的なフロー保存則の違反を許容する設計**: 「プレフロー」という、途中経過では中間頂点に余剰が溜まっていてもよいとする緩和されたフローの概念を導入したことが、このアルゴリズムの本質的な独創性であり、増加パスベースの手法とは異なる証明のアプローチ(高さの単調性を使った停止性の証明)を必要とする
- **使いどころ**: 密なグラフに対する最大流計算(画像セグメンテーションのグラフカット、大規模な二部マッチングの重み付き版)、並列・分散環境での最大流計算(GPUベースの実装が研究されている)、[Edmonds-Karp法](/algorithms/edmonds-karp)・[Dinic法](/algorithms/dinic)と並ぶ最大流問題の3つの代表的アプローチのひとつとして理論的に重要

## 実装例

```python
def push_relabel_max_flow(n: int, capacity: list[list[int]], source: int, sink: int) -> int:
    height = [0] * n
    excess = [0] * n
    flow = [[0] * n for _ in range(n)]

    height[source] = n
    for v in range(n):
        c = capacity[source][v]
        if c > 0:
            flow[source][v] = c
            flow[v][source] = -c
            excess[v] += c
            excess[source] -= c

    def residual(u: int, v: int) -> int:
        return capacity[u][v] - flow[u][v]

    while True:
        u = next((x for x in range(n) if x != source and x != sink and excess[x] > 0), None)
        if u is None:
            break
        pushed_any = False
        for v in range(n):
            if excess[u] == 0:
                break
            if residual(u, v) > 0 and height[u] == height[v] + 1:
                delta = min(excess[u], residual(u, v))
                flow[u][v] += delta
                flow[v][u] -= delta
                excess[u] -= delta
                excess[v] += delta
                pushed_any = True
        if not pushed_any:
            # 押し出せる隣接頂点がない: 高さを最小限だけ引き上げる(リレーベル)
            reachable_heights = [height[v] for v in range(n) if residual(u, v) > 0]
            height[u] = min(reachable_heights) + 1

    return sum(flow[source][v] for v in range(n))
```

```typescript
function pushRelabelMaxFlow(n: number, capacity: number[][], source: number, sink: number): number {
  const height = new Array(n).fill(0);
  const excess = new Array(n).fill(0);
  const flow: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  height[source] = n;
  for (let v = 0; v < n; v++) {
    const c = capacity[source][v];
    if (c > 0) {
      flow[source][v] = c;
      flow[v][source] = -c;
      excess[v] += c;
      excess[source] -= c;
    }
  }

  const residual = (u: number, v: number) => capacity[u][v] - flow[u][v];

  while (true) {
    let u = -1;
    for (let x = 0; x < n; x++) {
      if (x !== source && x !== sink && excess[x] > 0) { u = x; break; }
    }
    if (u === -1) break;

    let pushedAny = false;
    for (let v = 0; v < n; v++) {
      if (excess[u] === 0) break;
      if (residual(u, v) > 0 && height[u] === height[v] + 1) {
        const delta = Math.min(excess[u], residual(u, v));
        flow[u][v] += delta;
        flow[v][u] -= delta;
        excess[u] -= delta;
        excess[v] += delta;
        pushedAny = true;
      }
    }
    if (!pushedAny) {
      let minHeight = Infinity;
      for (let v = 0; v < n; v++) {
        if (residual(u, v) > 0) minHeight = Math.min(minHeight, height[v]);
      }
      height[u] = minHeight + 1;
    }
  }

  let total = 0;
  for (let v = 0; v < n; v++) total += flow[source][v];
  return total;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <limits>

int pushRelabelMaxFlow(int n, std::vector<std::vector<int>>& capacity, int source, int sink) {
    std::vector<int> height(n, 0), excess(n, 0);
    std::vector<std::vector<int>> flow(n, std::vector<int>(n, 0));

    height[source] = n;
    for (int v = 0; v < n; v++) {
        int c = capacity[source][v];
        if (c > 0) {
            flow[source][v] = c;
            flow[v][source] = -c;
            excess[v] += c;
            excess[source] -= c;
        }
    }

    auto residual = [&](int u, int v) { return capacity[u][v] - flow[u][v]; };

    while (true) {
        int u = -1;
        for (int x = 0; x < n; x++) {
            if (x != source && x != sink && excess[x] > 0) { u = x; break; }
        }
        if (u == -1) break;

        bool pushedAny = false;
        for (int v = 0; v < n && excess[u] > 0; v++) {
            if (residual(u, v) > 0 && height[u] == height[v] + 1) {
                int delta = std::min(excess[u], residual(u, v));
                flow[u][v] += delta;
                flow[v][u] -= delta;
                excess[u] -= delta;
                excess[v] += delta;
                pushedAny = true;
            }
        }
        if (!pushedAny) {
            int minHeight = std::numeric_limits<int>::max();
            for (int v = 0; v < n; v++) {
                if (residual(u, v) > 0) minHeight = std::min(minHeight, height[v]);
            }
            height[u] = minHeight + 1;
        }
    }

    int total = 0;
    for (int v = 0; v < n; v++) total += flow[source][v];
    return total;
}
```

```rust
fn push_relabel_max_flow(n: usize, capacity: &Vec<Vec<i32>>, source: usize, sink: usize) -> i32 {
    let mut height = vec![0i32; n];
    let mut excess = vec![0i32; n];
    let mut flow = vec![vec![0i32; n]; n];

    height[source] = n as i32;
    for v in 0..n {
        let c = capacity[source][v];
        if c > 0 {
            flow[source][v] = c;
            flow[v][source] = -c;
            excess[v] += c;
            excess[source] -= c;
        }
    }

    let residual = |flow: &Vec<Vec<i32>>, u: usize, v: usize| capacity[u][v] - flow[u][v];

    loop {
        let u = (0..n).find(|&x| x != source && x != sink && excess[x] > 0);
        let u = match u {
            Some(u) => u,
            None => break,
        };

        let mut pushed_any = false;
        for v in 0..n {
            if excess[u] == 0 {
                break;
            }
            if residual(&flow, u, v) > 0 && height[u] == height[v] + 1 {
                let delta = excess[u].min(residual(&flow, u, v));
                flow[u][v] += delta;
                flow[v][u] -= delta;
                excess[u] -= delta;
                excess[v] += delta;
                pushed_any = true;
            }
        }
        if !pushed_any {
            let min_height = (0..n)
                .filter(|&v| residual(&flow, u, v) > 0)
                .map(|v| height[v])
                .min()
                .unwrap();
            height[u] = min_height + 1;
        }
    }

    (0..n).map(|v| flow[source][v]).sum()
}
```

```csharp
static int PushRelabelMaxFlow(int n, int[,] capacity, int source, int sink)
{
    var height = new int[n];
    var excess = new int[n];
    var flow = new int[n, n];

    height[source] = n;
    for (int v = 0; v < n; v++)
    {
        int c = capacity[source, v];
        if (c > 0)
        {
            flow[source, v] = c;
            flow[v, source] = -c;
            excess[v] += c;
            excess[source] -= c;
        }
    }

    int Residual(int u, int v) => capacity[u, v] - flow[u, v];

    while (true)
    {
        int u = -1;
        for (int x = 0; x < n; x++)
        {
            if (x != source && x != sink && excess[x] > 0) { u = x; break; }
        }
        if (u == -1) break;

        bool pushedAny = false;
        for (int v = 0; v < n; v++)
        {
            if (excess[u] == 0) break;
            if (Residual(u, v) > 0 && height[u] == height[v] + 1)
            {
                int delta = Math.Min(excess[u], Residual(u, v));
                flow[u, v] += delta;
                flow[v, u] -= delta;
                excess[u] -= delta;
                excess[v] += delta;
                pushedAny = true;
            }
        }
        if (!pushedAny)
        {
            int minHeight = int.MaxValue;
            for (int v = 0; v < n; v++)
            {
                if (Residual(u, v) > 0) minHeight = Math.Min(minHeight, height[v]);
            }
            height[u] = minHeight + 1;
        }
    }

    int total = 0;
    for (int v = 0; v < n; v++) total += flow[source, v];
    return total;
}
```
