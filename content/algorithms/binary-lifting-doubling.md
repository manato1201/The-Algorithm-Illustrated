---
name: ダブリング(Binary Lifting)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n log n)(前処理)、O(log n)(1クエリあたり)
summary: 「k回先の状態」を求めるクエリを、2^i歩先へのジャンプテーブルを前計算しておき、kの二進展開に沿ってジャンプを合成することでO(log n)に高速化する典型テクニック。木の親ポインタに適用すればk番目祖先クエリやLCA(最近共通祖先)が高速に求まる。
---

## 概要

木の各頂点から「k個上の祖先はどれか」を何度も問われる、あるいは根付き木上で2頂点の最近共通祖先(LCA)を高速に求めたい、という場面は競技プログラミングで頻出する。愚直に親ポインタを1個ずつ辿ると1クエリあたりO(k)(最悪O(n))かかり、クエリがq回あればO(nq)に膨れ上がってしまう。ダブリング(Binary Lifting、二進リフティング)は、「1個先」の遷移だけでなく「2個先」「4個先」「8個先」…と**2のべき乗個先へのジャンプ**をあらかじめ全頂点分計算しておくことで、任意の`k`を二進展開し、立っているビットに対応するジャンプを合成するだけでO(log n)にクエリを高速化する。木の祖先だけでなく、「同じ遷移関数を繰り返し`k`回適用した結果」を求める一般の関数グラフ(functional graph)上のシミュレーションにも同じ発想がそのまま使える汎用性の高い前処理テクニックである。

## 仕組み

**前処理(ジャンプテーブルの構築)**:
1. `up[0][v]`を「頂点`v`の1個上の祖先(親)」として初期化する(根は自分自身、または番兵として`-1`を入れる)
2. `LOG = ⌈log2(n)⌉`として、`i = 1, 2, ..., LOG-1`の順に、`up[i][v] = up[i-1][up[i-1][v]]`という漸化式で埋めていく。これは「2^(i-1)個先へのジャンプを2回合成すれば2^i個先へのジャンプになる」という単純な事実に基づく
3. このテーブル`up[i][v]`(サイズ`O(n log n)`)がO(n log n)時間で構築できる

**k番目祖先クエリ**:
1. 求めたい`k`を二進展開する
2. `k`のビットが立っている位置`i`ごとに、現在の頂点を`up[i][現在の頂点]`へジャンプさせる(高々`log2(k)`回のジャンプで済む)
3. 最終的な頂点が「`k`個上の祖先」

**LCA(u, v)クエリ**:
1. 各頂点の根からの深さ`depth[v]`を前計算しておく
2. 深い方の頂点を、ダブリングを使って浅い方と同じ深さまで引き上げる(`depth[u] - depth[v]`を二進展開してジャンプ)
3. 深さが揃った状態で`u == v`ならそれがLCA
4. そうでなければ、ビット`i`を大きい方から順に試し、「`up[i][u] != up[i][v]`である限り、両方を`up[i]`だけ同時にジャンプさせる」という操作を繰り返す(一致しない範囲で最大限進める)。最後に`u, v`の1個上の親がLCAになる
5. 全体を通してO(log n)で1回のLCAクエリに答えられる

## 特性・トレードオフ

- **前処理と1クエリの計算量**: 前処理O(n log n)時間・空間、1クエリO(log n)。素朴な「1個ずつ親を辿る」方式のO(k)や、複数クエリを捌く場合の最悪O(nq)と比べて大幅に高速
- **他のLCA手法との比較**: オイラーツアー+[疎表(Sparse Table)](/algorithms/sparse-table)を使うRMQ帰着法も前処理O(n log n)・クエリO(1)を達成できるが、実装がやや複雑になる。オフラインで全クエリが事前に分かっている場合は、[Union-Find](/algorithms/union-find)を使うTarjanのオフラインLCA(O(n + q・α(n)))というさらに軽量な選択肢もある。ダブリングはオンラインクエリにも対応でき、実装の見通しの良さとのバランスが取れた選択肢
- **関数グラフ全般への応用**: 「頂点`v`から`f(v)`への辺が1本だけ出ている」functional graph上で「`v`から`k`回`f`を適用した先はどこか」を問うクエリにもそのまま使える。ゲームで「毎ターン決まった規則で状態遷移するNPCの`k`ターン後の状態」を求める、周期性を検出するといった用途にも転用できる
- **使いどころ**: 木のk番目祖先クエリ・LCAクエリ、セグメント木上の二分探索の高速化、functional graph上のサイクル検出・k回反復後の状態計算、木上の距離クエリ(`dist(u,v) = depth[u] + depth[v] - 2*depth[LCA(u,v)]`)

## 実装例

```python
import math


class BinaryLifting:
    def __init__(self, n: int, parent: list[int], root: int = 0) -> None:
        """parent[v]はvの親(rootの親はroot自身とする)。0-indexed。"""
        self.n = n
        self.log = max(1, math.ceil(math.log2(n))) if n > 1 else 1
        self.up = [[0] * n for _ in range(self.log)]
        self.up[0] = parent[:]
        for i in range(1, self.log):
            for v in range(n):
                self.up[i][v] = self.up[i - 1][self.up[i - 1][v]]

        self.depth = [0] * n
        self._build_depth(root, parent)

    def _build_depth(self, root: int, parent: list[int]) -> None:
        order = [root]
        visited = [False] * self.n
        visited[root] = True
        children: list[list[int]] = [[] for _ in range(self.n)]
        for v in range(self.n):
            if v != root:
                children[parent[v]].append(v)
        stack = [root]
        while stack:
            u = stack.pop()
            for c in children[u]:
                self.depth[c] = self.depth[u] + 1
                stack.append(c)

    def kth_ancestor(self, v: int, k: int) -> int:
        for i in range(self.log):
            if (k >> i) & 1:
                v = self.up[i][v]
        return v

    def lca(self, u: int, v: int) -> int:
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        u = self.kth_ancestor(u, self.depth[u] - self.depth[v])
        if u == v:
            return u
        for i in range(self.log - 1, -1, -1):
            if self.up[i][u] != self.up[i][v]:
                u = self.up[i][u]
                v = self.up[i][v]
        return self.up[0][u]
```

```typescript
class BinaryLifting {
  private up: number[][];
  private depth: number[];
  private log: number;

  constructor(
    private n: number,
    parent: number[],
    root = 0,
  ) {
    this.log = n > 1 ? Math.max(1, Math.ceil(Math.log2(n))) : 1;
    this.up = Array.from({ length: this.log }, () => new Array(n).fill(0));
    this.up[0] = [...parent];
    for (let i = 1; i < this.log; i++) {
      for (let v = 0; v < n; v++) {
        this.up[i][v] = this.up[i - 1][this.up[i - 1][v]];
      }
    }

    this.depth = new Array(n).fill(0);
    const children: number[][] = Array.from({ length: n }, () => []);
    for (let v = 0; v < n; v++) {
      if (v !== root) children[parent[v]].push(v);
    }
    const stack = [root];
    while (stack.length > 0) {
      const u = stack.pop()!;
      for (const c of children[u]) {
        this.depth[c] = this.depth[u] + 1;
        stack.push(c);
      }
    }
  }

  kthAncestor(v: number, k: number): number {
    for (let i = 0; i < this.log; i++) {
      if ((k >> i) & 1) v = this.up[i][v];
    }
    return v;
  }

  lca(u: number, v: number): number {
    if (this.depth[u] < this.depth[v]) [u, v] = [v, u];
    u = this.kthAncestor(u, this.depth[u] - this.depth[v]);
    if (u === v) return u;
    for (let i = this.log - 1; i >= 0; i--) {
      if (this.up[i][u] !== this.up[i][v]) {
        u = this.up[i][u];
        v = this.up[i][v];
      }
    }
    return this.up[0][u];
  }
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

class BinaryLifting {
    int n, logN;
    std::vector<std::vector<int>> up;
    std::vector<int> depth;

public:
    BinaryLifting(int n_, const std::vector<int>& parent, int root = 0) : n(n_) {
        logN = std::max(1, (int)std::ceil(std::log2(std::max(n, 2))));
        up.assign(logN, std::vector<int>(n));
        up[0] = parent;
        for (int i = 1; i < logN; i++)
            for (int v = 0; v < n; v++)
                up[i][v] = up[i - 1][up[i - 1][v]];

        depth.assign(n, 0);
        std::vector<std::vector<int>> children(n);
        for (int v = 0; v < n; v++) if (v != root) children[parent[v]].push_back(v);
        std::vector<int> stack = {root};
        while (!stack.empty()) {
            int u = stack.back(); stack.pop_back();
            for (int c : children[u]) { depth[c] = depth[u] + 1; stack.push_back(c); }
        }
    }

    int kthAncestor(int v, int k) const {
        for (int i = 0; i < logN; i++) if ((k >> i) & 1) v = up[i][v];
        return v;
    }

    int lca(int u, int v) const {
        if (depth[u] < depth[v]) std::swap(u, v);
        u = kthAncestor(u, depth[u] - depth[v]);
        if (u == v) return u;
        for (int i = logN - 1; i >= 0; i--) {
            if (up[i][u] != up[i][v]) { u = up[i][u]; v = up[i][v]; }
        }
        return up[0][u];
    }
};
```

```rust
struct BinaryLifting {
    up: Vec<Vec<usize>>,
    depth: Vec<usize>,
    log: usize,
}

impl BinaryLifting {
    fn new(n: usize, parent: &[usize], root: usize) -> Self {
        let log = if n > 1 { (usize::BITS - (n as u32).leading_zeros()) as usize + 1 } else { 1 };
        let mut up = vec![vec![0usize; n]; log];
        up[0] = parent.to_vec();
        for i in 1..log {
            for v in 0..n {
                up[i][v] = up[i - 1][up[i - 1][v]];
            }
        }

        let mut depth = vec![0usize; n];
        let mut children: Vec<Vec<usize>> = vec![Vec::new(); n];
        for v in 0..n {
            if v != root {
                children[parent[v]].push(v);
            }
        }
        let mut stack = vec![root];
        while let Some(u) = stack.pop() {
            for &c in &children[u] {
                depth[c] = depth[u] + 1;
                stack.push(c);
            }
        }

        BinaryLifting { up, depth, log }
    }

    fn kth_ancestor(&self, mut v: usize, k: usize) -> usize {
        for i in 0..self.log {
            if (k >> i) & 1 == 1 {
                v = self.up[i][v];
            }
        }
        v
    }

    fn lca(&self, mut u: usize, mut v: usize) -> usize {
        if self.depth[u] < self.depth[v] {
            std::mem::swap(&mut u, &mut v);
        }
        u = self.kth_ancestor(u, self.depth[u] - self.depth[v]);
        if u == v {
            return u;
        }
        for i in (0..self.log).rev() {
            if self.up[i][u] != self.up[i][v] {
                u = self.up[i][u];
                v = self.up[i][v];
            }
        }
        self.up[0][u]
    }
}
```

```csharp
class BinaryLifting
{
    readonly int[][] up;
    readonly int[] depth;
    readonly int log;

    public BinaryLifting(int n, int[] parent, int root = 0)
    {
        log = n > 1 ? Math.Max(1, (int)Math.Ceiling(Math.Log2(n))) : 1;
        up = new int[log][];
        up[0] = (int[])parent.Clone();
        for (int i = 1; i < log; i++)
        {
            up[i] = new int[n];
            for (int v = 0; v < n; v++) up[i][v] = up[i - 1][up[i - 1][v]];
        }

        depth = new int[n];
        var children = new List<int>[n];
        for (int v = 0; v < n; v++) children[v] = new List<int>();
        for (int v = 0; v < n; v++) if (v != root) children[parent[v]].Add(v);
        var stack = new Stack<int>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            int u = stack.Pop();
            foreach (int c in children[u]) { depth[c] = depth[u] + 1; stack.Push(c); }
        }
    }

    public int KthAncestor(int v, int k)
    {
        for (int i = 0; i < log; i++) if (((k >> i) & 1) != 0) v = up[i][v];
        return v;
    }

    public int Lca(int u, int v)
    {
        if (depth[u] < depth[v]) (u, v) = (v, u);
        u = KthAncestor(u, depth[u] - depth[v]);
        if (u == v) return u;
        for (int i = log - 1; i >= 0; i--)
        {
            if (up[i][u] != up[i][v]) { u = up[i][u]; v = up[i][v]; }
        }
        return up[0][u];
    }
}
```
