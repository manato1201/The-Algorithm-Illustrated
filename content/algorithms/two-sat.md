---
name: 2-SAT問題
category: グラフ
subcategory: 連結性・順序
complexity: O(V+E)(V変数数、E制約数)
summary: 「各変数が2値のうちどちらかを選ぶ」制約充足問題を、変数とその否定を頂点とする含意グラフに変換し、強連結成分分解を使って多項式時間で解く古典的なアルゴリズム。
---

## 概要

「AとBの少なくとも一方は真でなければならない」という形の制約(節、clause)が複数与えられたとき、全ての制約を満たす変数の真偽の割り当てが存在するかを判定する充足可能性問題(SAT)は、一般には[NP完全](/algorithms/branch-and-bound)で効率的な解法が知られていない。しかし各節がちょうど2つの変数(の否定を含む)だけからなる特殊ケース「2-SAT」に限れば、事情は劇的に変わる——各節`(a ∨ b)`を「¬aならbが真でなければならない」「¬bならaが真でなければならない」という2つの含意(implication)として捉え直し、[Tarjanの強連結成分分解](/algorithms/tarjan-scc)を応用することで、多項式時間で厳密に解けることが知られている。

## 仕組み

1. 各変数`x`について、「`x`が真」と「`x`が偽(¬x)」の2つの頂点を持つ含意グラフを構築する
2. 各節`(a ∨ b)`(`a`、`b`はそれぞれ変数またはその否定)を、「¬a → b」(aが偽ならbは真でなければならない)と「¬b → a」(bが偽ならaは真でなければならない)という2本の有向辺として追加する——これが2-SAT特有の、節を含意グラフへ機械的に変換する規則である
3. 構築した含意グラフに対して[Tarjanの強連結成分分解](/algorithms/tarjan-scc)を実行する
4. **充足不可能性の判定**: ある変数`x`について、「`x`が真」の頂点と「`x`が偽」の頂点が同じ強連結成分に属していたら、充足不可能(解なし)である——これは「xが真ならxは偽でなければならず、xが偽ならxは真でなければならない」という矛盾したループが存在することを意味する
5. どの変数についてもそのような矛盾がなければ充足可能であり、具体的な割り当ては、[トポロジカルソート](/algorithms/topological-sort)の順序で「後に来る成分に属する方」を真とすることで復元できる(強連結成分分解の結果はDAGの逆トポロジカル順序に対応する性質を利用する)

## 特性・トレードオフ

- **計算量**: 含意グラフの構築が`O(V+E)`、[Tarjanの強連結成分分解](/algorithms/tarjan-scc)も`O(V+E)`のため、全体で`O(V+E)`という線形時間で解ける——一般のSATが指数時間を要することが多いのとは対照的に、2つの変数だけの節という制約が問題の構造を劇的に単純化している
- **一般のSATとの計算量の断絶**: 3つ以上の変数を持つ節を許す「3-SAT」は最初に[NP完全](/algorithms/branch-and-bound)であることが証明された問題であり、2-SATとの間には「多項式時間で解けるか、指数時間が必要になるか」という計算複雑性理論上の大きな断絶がある。この対比は計算複雑性理論の教育において頻繁に引用される
- **強連結成分分解という異分野ツールの応用**: 論理式の充足可能性というブール論理の問題を、グラフの連結性という全く異なる分野の道具([Tarjanの強連結成分分解](/algorithms/tarjan-scc))で解くという、アルゴリズム設計における「問題の見方を変える」ことの威力を示す好例になっている
- **使いどころ**: スケジューリング制約(2つの選択肢からの排他的選択)の充足可能性判定、パズルゲーム(数独の変種、論理パズル)の解法、回路設計における論理制約の検証、コンパイラのレジスタ割り当てにおける制約解決の一部

## 実装例

```python
class TwoSat:
    def __init__(self, n: int):
        self.n = n
        self.graph: list[list[int]] = [[] for _ in range(2 * n)]

    def _lit(self, x: int, negate: bool) -> int:
        return 2 * x + (1 if negate else 0)

    def add_clause(self, x: int, neg_x: bool, y: int, neg_y: bool) -> None:
        # (¬x if neg_x else x) OR (¬y if neg_y else y)
        a = self._lit(x, neg_x)
        b = self._lit(y, neg_y)
        self.graph[a ^ 1].append(b)  # ¬a -> b
        self.graph[b ^ 1].append(a)  # ¬b -> a

    def solve(self) -> list[bool] | None:
        order: list[int] = []
        visited = [False] * (2 * self.n)

        def dfs_order(start: int) -> None:
            stack = [(start, 0)]
            visited[start] = True
            while stack:
                node, i = stack.pop()
                if i < len(self.graph[node]):
                    stack.append((node, i + 1))
                    v = self.graph[node][i]
                    if not visited[v]:
                        visited[v] = True
                        stack.append((v, 0))
                else:
                    order.append(node)

        for u in range(2 * self.n):
            if not visited[u]:
                dfs_order(u)

        reverse_graph: list[list[int]] = [[] for _ in range(2 * self.n)]
        for u in range(2 * self.n):
            for v in self.graph[u]:
                reverse_graph[v].append(u)

        component = [-1] * (2 * self.n)
        current = 0
        for u in reversed(order):
            if component[u] != -1:
                continue
            stack = [u]
            component[u] = current
            while stack:
                node = stack.pop()
                for v in reverse_graph[node]:
                    if component[v] == -1:
                        component[v] = current
                        stack.append(v)
            current += 1

        assignment = [False] * self.n
        for i in range(self.n):
            if component[2 * i] == component[2 * i + 1]:
                return None  # x and ¬x in the same SCC: unsatisfiable
            assignment[i] = component[2 * i] > component[2 * i + 1]
        return assignment
```

```typescript
class TwoSat {
  private n: number;
  private graph: number[][];

  constructor(n: number) {
    this.n = n;
    this.graph = Array.from({ length: 2 * n }, () => []);
  }

  private lit(x: number, negate: boolean): number {
    return 2 * x + (negate ? 1 : 0);
  }

  addClause(x: number, negX: boolean, y: number, negY: boolean): void {
    const a = this.lit(x, negX);
    const b = this.lit(y, negY);
    this.graph[a ^ 1].push(b);
    this.graph[b ^ 1].push(a);
  }

  solve(): boolean[] | null {
    const size = 2 * this.n;
    const visited = new Array(size).fill(false);
    const order: number[] = [];

    for (let start = 0; start < size; start++) {
      if (visited[start]) continue;
      const stack: [number, number][] = [[start, 0]];
      visited[start] = true;
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top[1] < this.graph[top[0]].length) {
          const v = this.graph[top[0]][top[1]];
          top[1]++;
          if (!visited[v]) {
            visited[v] = true;
            stack.push([v, 0]);
          }
        } else {
          order.push(top[0]);
          stack.pop();
        }
      }
    }

    const reverseGraph: number[][] = Array.from({ length: size }, () => []);
    for (let u = 0; u < size; u++) {
      for (const v of this.graph[u]) reverseGraph[v].push(u);
    }

    const component = new Array(size).fill(-1);
    let current = 0;
    for (let idx = order.length - 1; idx >= 0; idx--) {
      const u = order[idx];
      if (component[u] !== -1) continue;
      const stack = [u];
      component[u] = current;
      while (stack.length > 0) {
        const node = stack.pop()!;
        for (const v of reverseGraph[node]) {
          if (component[v] === -1) {
            component[v] = current;
            stack.push(v);
          }
        }
      }
      current++;
    }

    const assignment = new Array(this.n).fill(false);
    for (let i = 0; i < this.n; i++) {
      if (component[2 * i] === component[2 * i + 1]) return null;
      assignment[i] = component[2 * i] > component[2 * i + 1];
    }
    return assignment;
  }
}
```

```cpp
#include <vector>
#include <optional>

class TwoSat {
public:
    explicit TwoSat(int n) : n(n), graph(2 * n) {}

    void addClause(int x, bool negX, int y, bool negY) {
        int a = lit(x, negX);
        int b = lit(y, negY);
        graph[a ^ 1].push_back(b);
        graph[b ^ 1].push_back(a);
    }

    std::optional<std::vector<bool>> solve() {
        int size = 2 * n;
        std::vector<bool> visited(size, false);
        std::vector<int> order;

        for (int start = 0; start < size; start++) {
            if (visited[start]) continue;
            std::vector<std::pair<int, int>> stack{{start, 0}};
            visited[start] = true;
            while (!stack.empty()) {
                auto& [node, i] = stack.back();
                if (i < static_cast<int>(graph[node].size())) {
                    int v = graph[node][i];
                    i++;
                    if (!visited[v]) {
                        visited[v] = true;
                        stack.push_back({v, 0});
                    }
                } else {
                    order.push_back(node);
                    stack.pop_back();
                }
            }
        }

        std::vector<std::vector<int>> reverseGraph(size);
        for (int u = 0; u < size; u++) {
            for (int v : graph[u]) reverseGraph[v].push_back(u);
        }

        std::vector<int> component(size, -1);
        int current = 0;
        for (int idx = static_cast<int>(order.size()) - 1; idx >= 0; idx--) {
            int u = order[idx];
            if (component[u] != -1) continue;
            std::vector<int> stack{u};
            component[u] = current;
            while (!stack.empty()) {
                int node = stack.back();
                stack.pop_back();
                for (int v : reverseGraph[node]) {
                    if (component[v] == -1) {
                        component[v] = current;
                        stack.push_back(v);
                    }
                }
            }
            current++;
        }

        std::vector<bool> assignment(n, false);
        for (int i = 0; i < n; i++) {
            if (component[2 * i] == component[2 * i + 1]) {
                return std::nullopt;
            }
            assignment[i] = component[2 * i] > component[2 * i + 1];
        }
        return assignment;
    }

private:
    int n;
    std::vector<std::vector<int>> graph;

    int lit(int x, bool negate) const { return 2 * x + (negate ? 1 : 0); }
};
```

```rust
struct TwoSat {
    n: usize,
    graph: Vec<Vec<usize>>,
}

impl TwoSat {
    fn new(n: usize) -> Self {
        TwoSat { n, graph: vec![Vec::new(); 2 * n] }
    }

    fn lit(x: usize, negate: bool) -> usize {
        2 * x + if negate { 1 } else { 0 }
    }

    fn add_clause(&mut self, x: usize, neg_x: bool, y: usize, neg_y: bool) {
        let a = Self::lit(x, neg_x);
        let b = Self::lit(y, neg_y);
        self.graph[a ^ 1].push(b);
        self.graph[b ^ 1].push(a);
    }

    fn solve(&self) -> Option<Vec<bool>> {
        let size = 2 * self.n;
        let mut visited = vec![false; size];
        let mut order = Vec::new();

        for start in 0..size {
            if visited[start] {
                continue;
            }
            let mut stack: Vec<(usize, usize)> = vec![(start, 0)];
            visited[start] = true;
            while let Some(&(node, i)) = stack.last() {
                if i < self.graph[node].len() {
                    let v = self.graph[node][i];
                    stack.last_mut().unwrap().1 += 1;
                    if !visited[v] {
                        visited[v] = true;
                        stack.push((v, 0));
                    }
                } else {
                    order.push(node);
                    stack.pop();
                }
            }
        }

        let mut reverse_graph: Vec<Vec<usize>> = vec![Vec::new(); size];
        for u in 0..size {
            for &v in &self.graph[u] {
                reverse_graph[v].push(u);
            }
        }

        let mut component = vec![usize::MAX; size];
        let mut current = 0usize;
        for &u in order.iter().rev() {
            if component[u] != usize::MAX {
                continue;
            }
            let mut stack = vec![u];
            component[u] = current;
            while let Some(node) = stack.pop() {
                for &v in &reverse_graph[node] {
                    if component[v] == usize::MAX {
                        component[v] = current;
                        stack.push(v);
                    }
                }
            }
            current += 1;
        }

        let mut assignment = vec![false; self.n];
        for i in 0..self.n {
            if component[2 * i] == component[2 * i + 1] {
                return None;
            }
            assignment[i] = component[2 * i] > component[2 * i + 1];
        }
        Some(assignment)
    }
}
```

```csharp
class TwoSat
{
    private readonly int n;
    private readonly List<int>[] graph;

    public TwoSat(int n)
    {
        this.n = n;
        graph = new List<int>[2 * n];
        for (int i = 0; i < 2 * n; i++) graph[i] = new List<int>();
    }

    private int Lit(int x, bool negate) => 2 * x + (negate ? 1 : 0);

    public void AddClause(int x, bool negX, int y, bool negY)
    {
        int a = Lit(x, negX);
        int b = Lit(y, negY);
        graph[a ^ 1].Add(b);
        graph[b ^ 1].Add(a);
    }

    public bool[]? Solve()
    {
        int size = 2 * n;
        var visited = new bool[size];
        var order = new List<int>();

        for (int start = 0; start < size; start++)
        {
            if (visited[start]) continue;
            var stack = new Stack<(int node, int idx)>();
            stack.Push((start, 0));
            visited[start] = true;
            while (stack.Count > 0)
            {
                var (node, idx) = stack.Pop();
                if (idx < graph[node].Count)
                {
                    stack.Push((node, idx + 1));
                    int v = graph[node][idx];
                    if (!visited[v])
                    {
                        visited[v] = true;
                        stack.Push((v, 0));
                    }
                }
                else
                {
                    order.Add(node);
                }
            }
        }

        var reverseGraph = new List<int>[size];
        for (int i = 0; i < size; i++) reverseGraph[i] = new List<int>();
        for (int u = 0; u < size; u++)
            foreach (var v in graph[u]) reverseGraph[v].Add(u);

        var component = new int[size];
        Array.Fill(component, -1);
        int current = 0;
        for (int idx = order.Count - 1; idx >= 0; idx--)
        {
            int u = order[idx];
            if (component[u] != -1) continue;
            var stack = new Stack<int>();
            stack.Push(u);
            component[u] = current;
            while (stack.Count > 0)
            {
                int node = stack.Pop();
                foreach (var v in reverseGraph[node])
                {
                    if (component[v] == -1)
                    {
                        component[v] = current;
                        stack.Push(v);
                    }
                }
            }
            current++;
        }

        var assignment = new bool[n];
        for (int i = 0; i < n; i++)
        {
            if (component[2 * i] == component[2 * i + 1]) return null;
            assignment[i] = component[2 * i] > component[2 * i + 1];
        }
        return assignment;
    }
}
```
