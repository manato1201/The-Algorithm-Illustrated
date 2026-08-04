---
name: クリティカルパス法(CPM/PERT)
category: スケジューリング
subcategory: タスク・ジョブスケジューリング
complexity: O(V+E)(V作業数、E依存関係数)
summary: 作業間の依存関係をDAG(有向非巡回グラフ)として表現し、プロジェクト全体の最短完了時間を決める「これ以上遅れられない作業の連鎖」を特定するプロジェクト管理の基礎技法。
---

## 概要

大規模プロジェクト(建設、ソフトウェア開発、製品開発)では、多数の作業がそれぞれ他の作業の完了を前提として進む(基礎工事が終わらないと壁を建てられない、設計が終わらないと実装できない、など)。クリティカルパス法(CPM)は、1950年代に化学プラント建設のプロジェクト管理として考案された技法で、作業間の依存関係を有向非巡回グラフ(DAG)として表現し、[トポロジカルソート](/algorithms/topological-sort)と同じグラフ走査の考え方で、「プロジェクト全体の完了時期を決定づける、1日も遅れが許されない作業の連鎖(クリティカルパス)」を特定する。ほぼ同時期に開発されたPERT(Program Evaluation and Review Technique)は、各作業の所要時間に不確実性(楽観値・悲観値・最頻値からの見積もり)を組み込んだ発展版として知られる。

## 仕組み

1. 各作業をノード、依存関係(「作業Aが終わらないと作業Bを始められない」)を有向辺とするDAGを構築する。各ノードには、その作業の所要時間が付与される
2. **前進パス計算(最早開始・最早終了時刻)**: [トポロジカルソート](/algorithms/topological-sort)の順序でグラフを走査し、各作業の「最も早く開始できる時刻」を、その作業に依存する全ての先行作業の「最も早く終了できる時刻」の最大値として計算する([Kahnのアルゴリズム](/algorithms/kahn)や[DFS](/algorithms/dfs)ベースのトポロジカルソートがこの走査順序を提供する)
3. **後退パス計算(最遅開始・最遅終了時刻)**: グラフを逆向きに(プロジェクト全体の終了時点から開始点へ向かって)走査し、各作業について「全体の完了時期に影響を与えずに、最も遅く開始・終了できる時刻」を計算する
4. 各作業について、「最も遅く開始できる時刻 - 最も早く開始できる時刻」を計算する。これが0(全く余裕がない)作業だけを繋いだ経路が**クリティカルパス**であり、プロジェクト全体の最短完了時間を直接決定づける「ボトルネックの連鎖」になる
5. クリティカルパス上にない作業は、ある程度のスケジュールの余裕(フロート、スラック)を持っており、多少遅れてもプロジェクト全体の完了には影響しない

## 特性・トレードオフ

- **計算量**: [トポロジカルソート](/algorithms/topological-sort)ベースの2回の走査(前進・後退)で済むため、`O(V+E)`(`V`作業数、`E`依存関係の辺数)。作業数が多い大規模プロジェクトでも効率的に計算できる
- **プロジェクトの優先管理への示唆**: クリティカルパス上の作業に遅れが生じると、プロジェクト全体の完了時期が確実に遅れる一方、余裕(フロート)のある作業は多少の遅延を吸収できる——この区別により、プロジェクトマネージャーはリソース(人員・予算)をクリティカルパス上の作業へ優先的に投入すべきだという明確な指針が得られる
- **DAGであることが前提**: この手法は作業間の依存関係が循環しない(DAGである)ことを前提としている。もし依存関係に循環が生じている場合([トポロジカルソート](/algorithms/topological-sort)が不可能な場合と同じ状況)、それはプロジェクト計画そのものに矛盾があることを意味し、計画の見直しが必要になる
- **使いどころ**: 建設プロジェクト・ソフトウェア開発プロジェクトの工程管理、[ジョブショップスケジューリング](/algorithms/job-shop-scheduling)と組み合わせた製造工程の最適化、ガントチャートツール(Microsoft Project等)の内部計算ロジック

## 実装例

```python
from collections import deque, defaultdict


def critical_path(tasks: dict[str, int], edges: list[tuple[str, str]]) -> dict:
    graph = defaultdict(list)
    reverse = defaultdict(list)
    indegree = {t: 0 for t in tasks}
    for u, v in edges:
        graph[u].append(v)
        reverse[v].append(u)
        indegree[v] += 1

    queue = deque([t for t in tasks if indegree[t] == 0])
    indeg = dict(indegree)
    order = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)

    es = {t: 0 for t in tasks}
    ef = {t: 0 for t in tasks}
    for u in order:
        es[u] = max((ef[p] for p in reverse[u]), default=0)
        ef[u] = es[u] + tasks[u]

    duration = max(ef.values())
    lf = {t: duration for t in tasks}
    ls = {t: 0 for t in tasks}
    for u in reversed(order):
        lf[u] = min((ls[s] for s in graph[u]), default=duration)
        ls[u] = lf[u] - tasks[u]

    floats = {t: ls[t] - es[t] for t in tasks}
    crit = [t for t in order if floats[t] == 0]
    return {"es": es, "ef": ef, "ls": ls, "lf": lf, "float": floats, "critical_path": crit, "duration": duration}
```

```typescript
interface CpmResult {
  es: Record<string, number>;
  ef: Record<string, number>;
  ls: Record<string, number>;
  lf: Record<string, number>;
  floatTime: Record<string, number>;
  criticalPath: string[];
  duration: number;
}

function criticalPath(tasks: Record<string, number>, edges: [string, string][]): CpmResult {
  const graph: Record<string, string[]> = {};
  const reverse: Record<string, string[]> = {};
  const indegree: Record<string, number> = {};
  for (const t in tasks) { graph[t] = []; reverse[t] = []; indegree[t] = 0; }
  for (const [u, v] of edges) {
    graph[u].push(v);
    reverse[v].push(u);
    indegree[v] += 1;
  }

  const queue: string[] = Object.keys(tasks).filter((t) => indegree[t] === 0);
  const order: string[] = [];
  const indeg = { ...indegree };
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of graph[u]) {
      indeg[v] -= 1;
      if (indeg[v] === 0) queue.push(v);
    }
  }

  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};
  for (const t in tasks) { es[t] = 0; ef[t] = 0; }
  for (const u of order) {
    es[u] = reverse[u].length > 0 ? Math.max(...reverse[u].map((p) => ef[p])) : 0;
    ef[u] = es[u] + tasks[u];
  }

  const duration = Math.max(...Object.values(ef));
  const lf: Record<string, number> = {};
  const ls: Record<string, number> = {};
  for (const t in tasks) lf[t] = duration;
  for (let i = order.length - 1; i >= 0; i--) {
    const u = order[i];
    lf[u] = graph[u].length > 0 ? Math.min(...graph[u].map((s) => ls[s])) : duration;
    ls[u] = lf[u] - tasks[u];
  }

  const floatTime: Record<string, number> = {};
  for (const t in tasks) floatTime[t] = ls[t] - es[t];
  const criticalPathList = order.filter((t) => floatTime[t] === 0);

  return { es, ef, ls, lf, floatTime, criticalPath: criticalPathList, duration };
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <queue>
#include <algorithm>
#include <limits>

struct CpmResult {
    std::unordered_map<std::string, int> es, ef, ls, lf, floatTime;
    std::vector<std::string> criticalPath;
    int duration;
};

CpmResult criticalPath(const std::unordered_map<std::string, int>& tasks,
                        const std::vector<std::pair<std::string, std::string>>& edges) {
    std::unordered_map<std::string, std::vector<std::string>> graph, reverse;
    std::unordered_map<std::string, int> indegree;
    for (const auto& [t, _] : tasks) { graph[t]; reverse[t]; indegree[t] = 0; }
    for (const auto& [u, v] : edges) {
        graph[u].push_back(v);
        reverse[v].push_back(u);
        indegree[v]++;
    }

    std::queue<std::string> q;
    for (const auto& [t, d] : indegree) if (d == 0) q.push(t);
    auto indeg = indegree;
    std::vector<std::string> order;
    while (!q.empty()) {
        auto u = q.front(); q.pop();
        order.push_back(u);
        for (const auto& v : graph[u]) {
            if (--indeg[v] == 0) q.push(v);
        }
    }

    std::unordered_map<std::string, int> es, ef;
    for (const auto& t : order) {
        int maxEf = 0;
        for (const auto& p : reverse[t]) maxEf = std::max(maxEf, ef[p]);
        es[t] = maxEf;
        ef[t] = es[t] + tasks.at(t);
    }

    int duration = 0;
    for (const auto& [t, v] : ef) duration = std::max(duration, v);

    std::unordered_map<std::string, int> lf, ls;
    for (const auto& [t, _] : tasks) lf[t] = duration;
    for (auto it = order.rbegin(); it != order.rend(); ++it) {
        const auto& u = *it;
        if (graph[u].empty()) {
            lf[u] = duration;
        } else {
            int minLs = std::numeric_limits<int>::max();
            for (const auto& s : graph[u]) minLs = std::min(minLs, ls[s]);
            lf[u] = minLs;
        }
        ls[u] = lf[u] - tasks.at(u);
    }

    std::unordered_map<std::string, int> floatTime;
    std::vector<std::string> critical;
    for (const auto& t : order) {
        floatTime[t] = ls[t] - es[t];
        if (floatTime[t] == 0) critical.push_back(t);
    }

    return { es, ef, ls, lf, floatTime, critical, duration };
}
```

```rust
use std::collections::{HashMap, VecDeque};

struct CpmResult {
    es: HashMap<String, i64>,
    ef: HashMap<String, i64>,
    ls: HashMap<String, i64>,
    lf: HashMap<String, i64>,
    float_time: HashMap<String, i64>,
    critical_path: Vec<String>,
    duration: i64,
}

fn critical_path(tasks: &HashMap<String, i64>, edges: &[(String, String)]) -> CpmResult {
    let mut graph: HashMap<String, Vec<String>> = HashMap::new();
    let mut reverse: HashMap<String, Vec<String>> = HashMap::new();
    let mut indegree: HashMap<String, i64> = tasks.keys().map(|t| (t.clone(), 0)).collect();
    for t in tasks.keys() {
        graph.entry(t.clone()).or_default();
        reverse.entry(t.clone()).or_default();
    }
    for (u, v) in edges {
        graph.get_mut(u).unwrap().push(v.clone());
        reverse.get_mut(v).unwrap().push(u.clone());
        *indegree.get_mut(v).unwrap() += 1;
    }

    let mut indeg = indegree.clone();
    let mut queue: VecDeque<String> = tasks.keys().filter(|t| indegree[*t] == 0).cloned().collect();
    let mut order = Vec::new();
    while let Some(u) = queue.pop_front() {
        order.push(u.clone());
        for v in &graph[&u] {
            let d = indeg.get_mut(v).unwrap();
            *d -= 1;
            if *d == 0 {
                queue.push_back(v.clone());
            }
        }
    }

    let mut es: HashMap<String, i64> = HashMap::new();
    let mut ef: HashMap<String, i64> = HashMap::new();
    for u in &order {
        let max_ef = reverse[u].iter().map(|p| ef[p]).max().unwrap_or(0);
        es.insert(u.clone(), max_ef);
        ef.insert(u.clone(), max_ef + tasks[u]);
    }

    let duration = ef.values().copied().max().unwrap_or(0);
    let mut lf: HashMap<String, i64> = tasks.keys().map(|t| (t.clone(), duration)).collect();
    let mut ls: HashMap<String, i64> = HashMap::new();
    for u in order.iter().rev() {
        let min_ls = graph[u].iter().map(|s| ls[s]).min().unwrap_or(duration);
        lf.insert(u.clone(), min_ls);
        ls.insert(u.clone(), min_ls - tasks[u]);
    }

    let mut float_time: HashMap<String, i64> = HashMap::new();
    let mut critical = Vec::new();
    for u in &order {
        let f = ls[u] - es[u];
        float_time.insert(u.clone(), f);
        if f == 0 {
            critical.push(u.clone());
        }
    }

    CpmResult { es, ef, ls, lf, float_time, critical_path: critical, duration }
}
```

```csharp
class CpmResult
{
    public Dictionary<string, int> Es = new();
    public Dictionary<string, int> Ef = new();
    public Dictionary<string, int> Ls = new();
    public Dictionary<string, int> Lf = new();
    public Dictionary<string, int> FloatTime = new();
    public List<string> CriticalPathList = new();
    public int Duration;
}

static class CriticalPathMethod
{
    public static CpmResult Compute(Dictionary<string, int> tasks, List<(string, string)> edges)
    {
        var graph = tasks.Keys.ToDictionary(t => t, t => new List<string>());
        var reverse = tasks.Keys.ToDictionary(t => t, t => new List<string>());
        var indegree = tasks.Keys.ToDictionary(t => t, t => 0);
        foreach (var (u, v) in edges)
        {
            graph[u].Add(v);
            reverse[v].Add(u);
            indegree[v] += 1;
        }

        var queue = new Queue<string>(tasks.Keys.Where(t => indegree[t] == 0));
        var indeg = new Dictionary<string, int>(indegree);
        var order = new List<string>();
        while (queue.Count > 0)
        {
            var u = queue.Dequeue();
            order.Add(u);
            foreach (var v in graph[u])
            {
                indeg[v] -= 1;
                if (indeg[v] == 0) queue.Enqueue(v);
            }
        }

        var es = tasks.Keys.ToDictionary(t => t, t => 0);
        var ef = tasks.Keys.ToDictionary(t => t, t => 0);
        foreach (var u in order)
        {
            es[u] = reverse[u].Count > 0 ? reverse[u].Max(p => ef[p]) : 0;
            ef[u] = es[u] + tasks[u];
        }

        int duration = ef.Values.Max();
        var lf = tasks.Keys.ToDictionary(t => t, t => duration);
        var ls = tasks.Keys.ToDictionary(t => t, t => 0);
        for (int i = order.Count - 1; i >= 0; i--)
        {
            var u = order[i];
            lf[u] = graph[u].Count > 0 ? graph[u].Min(s => ls[s]) : duration;
            ls[u] = lf[u] - tasks[u];
        }

        var floatTime = tasks.Keys.ToDictionary(t => t, t => ls[t] - es[t]);
        var critical = order.Where(t => floatTime[t] == 0).ToList();

        return new CpmResult { Es = es, Ef = ef, Ls = ls, Lf = lf, FloatTime = floatTime, CriticalPathList = critical, Duration = duration };
    }
}
```
