---
name: グラフ彩色によるレジスタ割り当て
category: コンパイラ・構文解析
subcategory: コード生成・最適化
complexity: O(V+E)(彩色の簡略化フェーズ、V・Eは干渉グラフの頂点・辺数)
summary: 同時に値を保持している一時変数同士を辺で結んだ「干渉グラフ」を作り、隣接する頂点が同じ色にならないように彩色する問題として、無数の一時変数を有限個のレジスタへ割り当てる。
---

## 概要

[3番地コード生成](/algorithms/three-address-code-generation)で得られる中間表現は、無制限に一時変数を使うことを許すが、実際のCPUが持つレジスタの数はごく少数(数個〜数十個)に限られる。この「無数の一時変数」を「有限個の実レジスタ」へ、意味を変えずに詰め込むレジスタ割り当ては、1981年にチェイティンらによって、グラフ理論の**グラフ彩色問題**(隣接する頂点が同じ色にならないように、できるだけ少ない色数で全頂点を彩色する問題)として定式化された。この定式化により、コンパイラのレジスタ割り当てという実務的な問題に、グラフ理論の豊富な既存の知見を応用できるようになった。

## 仕組み

1. プログラム中の各一時変数・変数について、[生存変数解析](/algorithms/dead-code-elimination)を行い、「どの命令区間でその変数の値が生きている(後で読まれる)か」を特定する
2. 2つの変数の生存区間が重なっている(同時に値を保持している必要がある)なら、その2つの変数は同時に別々のレジスタに置かれる必要がある——これを「干渉している」と呼び、干渉している変数のペアを辺で結んだ**干渉グラフ**を構築する
3. 干渉グラフに対して、利用可能なレジスタ数`k`色でのグラフ彩色を試みる。彩色の代表的な手法は、「次数(隣接する頂点の数)が`k`未満の頂点を見つけ、それをグラフから一時的に取り除いてスタックに積む」ことを繰り返す**簡略化(simplify)**フェーズと、取り除いた頂点をスタックから逆順に戻しながら、既に彩色済みの隣接頂点と被らない色を割り当てていく**選択(select)**フェーズからなる
4. 次数が`k`未満の頂点が見つからなくなった場合(全頂点が`k`個以上の隣接頂点を持つ)、どれか1つの頂点を「スピル候補」(レジスタではなくメモリに一時的に退避させる変数)として選び、グラフから取り除いて簡略化を続行する
5. 全頂点の彩色が完了すれば、同じ色が割り当てられた変数は同じレジスタを共有してよいことになり、干渉していない(生存区間が重ならない)変数同士でレジスタを使い回すことで、少ないレジスタ数でプログラム全体を実行できる

## 特性・トレードオフ

- **計算量**: グラフ彩色問題は一般には[NP完全](/algorithms/branch-and-bound)(厳密な最適解を求めるのは計算量的に困難)だが、コンパイラの実装では簡略化・選択のヒューリスティックを使い、`O(V+E)`程度の実用的な時間で「十分よい」割り当てを見つける近似的なアプローチを取る
- **スピルのコスト**: レジスタが足りず一部の変数をメモリに退避させる(スピルする)必要が生じると、そのたびにメモリの読み書き命令が追加され、実行速度が低下する。どの変数をスピルさせるかの選択(頻繁にアクセスされる変数を避ける等)が、生成されるコードの性能を大きく左右する
- **[DFA最小化](/algorithms/dfa-minimization)との類似性**: どちらも「本質的に同じ役割を持つ要素同士をグループ化(彩色/状態統合)して数を減らす」という抽象化のレベルでは似た構造を持つが、DFA最小化は「区別できない状態の統合」、レジスタ割り当ては「干渉しない変数への同じ色の割り当て」と、判定基準が対照的になっている
- **使いどころ**: ほぼ全ての最適化コンパイラのバックエンド(コード生成)における標準的な設計。組み込みシステムのようにレジスタ数が非常に少ない環境や、多数のローカル変数を持つ関数のコンパイルで、この最適化の効果が特に顕著になる

## 実装例

```python
def color_interference_graph(n: int, edges: list[tuple[int, int]], k: int) -> tuple[list[int], list[int]]:
    """干渉グラフをk色で彩色する。戻り値は(color, spilled)で、
    color[v]は頂点vの色(0..k-1)、spillはどうしても彩色できなかった頂点のリスト。"""
    adj: list[set[int]] = [set() for _ in range(n)]
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)

    remaining = set(range(n))
    stack: list[int] = []
    removed = [False] * n

    def current_degree(v: int) -> int:
        return sum(1 for u in adj[v] if not removed[u])

    # 簡略化フェーズ: 次数がk未満の頂点をスタックに積んで取り除く。
    # なければ(スピル候補として)最も次数が高い頂点を積む。
    while remaining:
        candidate = next((v for v in remaining if current_degree(v) < k), None)
        if candidate is None:
            candidate = max(remaining, key=current_degree)
        stack.append(candidate)
        removed[candidate] = True
        remaining.remove(candidate)

    # 選択フェーズ: スタックを逆順に取り出し、隣接色と被らない色を割り当てる。
    color = [-1] * n
    spilled: list[int] = []
    for v in reversed(stack):
        used = {color[u] for u in adj[v] if color[u] != -1}
        available = next((c for c in range(k) if c not in used), None)
        if available is None:
            spilled.append(v)  # 実際にスピルが必要
        else:
            color[v] = available

    return color, spilled
```

```typescript
function colorInterferenceGraph(
  n: number,
  edges: [number, number][],
  k: number
): { color: number[]; spilled: number[] } {
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (const [u, v] of edges) {
    adj[u].add(v);
    adj[v].add(u);
  }

  const remaining = new Set<number>(Array.from({ length: n }, (_, i) => i));
  const stack: number[] = [];
  const removed = new Array(n).fill(false);
  const currentDegree = (v: number): number => {
    let d = 0;
    for (const u of adj[v]) if (!removed[u]) d++;
    return d;
  };

  while (remaining.size > 0) {
    let candidate: number | null = null;
    for (const v of remaining) {
      if (currentDegree(v) < k) { candidate = v; break; }
    }
    if (candidate === null) {
      let bestDeg = -1;
      for (const v of remaining) {
        const d = currentDegree(v);
        if (d > bestDeg) { bestDeg = d; candidate = v; }
      }
    }
    stack.push(candidate!);
    removed[candidate!] = true;
    remaining.delete(candidate!);
  }

  const color = new Array(n).fill(-1);
  const spilled: number[] = [];
  for (let i = stack.length - 1; i >= 0; i--) {
    const v = stack[i];
    const used = new Set<number>();
    for (const u of adj[v]) if (color[u] !== -1) used.add(color[u]);
    let available = -1;
    for (let c = 0; c < k; c++) {
      if (!used.has(c)) { available = c; break; }
    }
    if (available === -1) spilled.push(v);
    else color[v] = available;
  }

  return { color, spilled };
}
```

```cpp
#include <vector>
#include <set>
#include <algorithm>

struct ColoringResult {
    std::vector<int> color;
    std::vector<int> spilled;
};

ColoringResult colorInterferenceGraph(int n, const std::vector<std::pair<int, int>>& edges, int k) {
    std::vector<std::set<int>> adj(n);
    for (auto [u, v] : edges) {
        adj[u].insert(v);
        adj[v].insert(u);
    }

    std::vector<bool> removed(n, false);
    auto currentDegree = [&](int v) {
        int d = 0;
        for (int u : adj[v]) if (!removed[u]) d++;
        return d;
    };

    std::vector<int> remaining(n);
    for (int i = 0; i < n; i++) remaining[i] = i;
    std::vector<int> stack;

    while (!remaining.empty()) {
        auto it = std::find_if(remaining.begin(), remaining.end(),
                                [&](int v) { return currentDegree(v) < k; });
        int candidate;
        if (it != remaining.end()) {
            candidate = *it;
        } else {
            candidate = *std::max_element(remaining.begin(), remaining.end(),
                                           [&](int a, int b) { return currentDegree(a) < currentDegree(b); });
        }
        stack.push_back(candidate);
        removed[candidate] = true;
        remaining.erase(std::find(remaining.begin(), remaining.end(), candidate));
    }

    std::vector<int> color(n, -1);
    std::vector<int> spilled;
    for (auto it = stack.rbegin(); it != stack.rend(); ++it) {
        int v = *it;
        std::set<int> used;
        for (int u : adj[v]) if (color[u] != -1) used.insert(color[u]);
        int available = -1;
        for (int c = 0; c < k; c++) {
            if (used.find(c) == used.end()) { available = c; break; }
        }
        if (available == -1) spilled.push_back(v);
        else color[v] = available;
    }

    return {color, spilled};
}
```

```rust
use std::collections::HashSet;

struct ColoringResult {
    color: Vec<i32>,
    spilled: Vec<usize>,
}

fn color_interference_graph(n: usize, edges: &[(usize, usize)], k: usize) -> ColoringResult {
    let mut adj: Vec<HashSet<usize>> = vec![HashSet::new(); n];
    for &(u, v) in edges {
        adj[u].insert(v);
        adj[v].insert(u);
    }

    let mut removed = vec![false; n];
    let current_degree = |v: usize, removed: &Vec<bool>| -> usize {
        adj[v].iter().filter(|&&u| !removed[u]).count()
    };

    let mut remaining: Vec<usize> = (0..n).collect();
    let mut stack = Vec::new();

    while !remaining.is_empty() {
        let candidate = remaining
            .iter()
            .copied()
            .find(|&v| current_degree(v, &removed) < k)
            .unwrap_or_else(|| {
                *remaining
                    .iter()
                    .max_by_key(|&&v| current_degree(v, &removed))
                    .unwrap()
            });
        stack.push(candidate);
        removed[candidate] = true;
        remaining.retain(|&v| v != candidate);
    }

    let mut color = vec![-1i32; n];
    let mut spilled = Vec::new();
    for &v in stack.iter().rev() {
        let used: HashSet<i32> = adj[v].iter().filter_map(|&u| {
            if color[u] != -1 { Some(color[u]) } else { None }
        }).collect();
        let available = (0..k as i32).find(|c| !used.contains(c));
        match available {
            Some(c) => color[v] = c,
            None => spilled.push(v),
        }
    }

    ColoringResult { color, spilled }
}
```

```csharp
static (int[] Color, List<int> Spilled) ColorInterferenceGraph(int n, (int, int)[] edges, int k)
{
    var adj = new HashSet<int>[n];
    for (int i = 0; i < n; i++) adj[i] = new HashSet<int>();
    foreach (var (u, v) in edges)
    {
        adj[u].Add(v);
        adj[v].Add(u);
    }

    var removed = new bool[n];
    int CurrentDegree(int v) => adj[v].Count(u => !removed[u]);

    var remaining = new HashSet<int>(Enumerable.Range(0, n));
    var stack = new List<int>();

    while (remaining.Count > 0)
    {
        int candidate = -1;
        foreach (var v in remaining)
        {
            if (CurrentDegree(v) < k) { candidate = v; break; }
        }
        if (candidate == -1)
        {
            int bestDeg = -1;
            foreach (var v in remaining)
            {
                int d = CurrentDegree(v);
                if (d > bestDeg) { bestDeg = d; candidate = v; }
            }
        }
        stack.Add(candidate);
        removed[candidate] = true;
        remaining.Remove(candidate);
    }

    var color = new int[n];
    Array.Fill(color, -1);
    var spilled = new List<int>();
    for (int i = stack.Count - 1; i >= 0; i--)
    {
        int v = stack[i];
        var used = new HashSet<int>(adj[v].Where(u => color[u] != -1).Select(u => color[u]));
        int available = -1;
        for (int c = 0; c < k; c++)
        {
            if (!used.Contains(c)) { available = c; break; }
        }
        if (available == -1) spilled.Add(v);
        else color[v] = available;
    }

    return (color, spilled);
}
```
