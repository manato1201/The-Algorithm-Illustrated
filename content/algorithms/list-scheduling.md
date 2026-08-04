---
name: リストスケジューリング
category: スケジューリング
subcategory: タスク・ジョブスケジューリング
complexity: O(n log n)(n作業数、優先度リストのソート込み)
summary: 依存関係を尊重した優先順位リストに従い、空いたプロセッサへ次のタスクを次々に割り当てていく、並列タスクスケジューリングの単純だが理論的な性能保証を持つ貪欲な手法。
---

## 概要

[ジョブショップスケジューリング](/algorithms/job-shop-scheduling)が機械ごとの処理順序を扱うのに対し、複数のプロセッサ(または作業者)に、依存関係を持つタスク群をどう割り振れば全体の完了時間を最小化できるか、という問題も並列計算やプロジェクト管理で頻繁に現れる。リストスケジューリングは、「実行可能になったタスク(依存する全ての先行タスクが完了したタスク)の優先順位リストを用意し、プロセッサが空くたびにリストの先頭から実行可能なタスクを割り当てる」という単純な貪欲戦略でありながら、[グラハムの境界](/algorithms/branch-and-bound)として知られる理論的な性能保証(最適解の2倍以内に収まることが保証される)を持つ、実務でも理論でも重要な位置を占めるアルゴリズムである。

## 仕組み

1. タスク間の依存関係を有向非巡回グラフ(DAG、[クリティカルパス法](/algorithms/critical-path-method)と同じ表現)として与える
2. 何らかの基準(タスクの処理時間の長い順、[クリティカルパス法](/algorithms/critical-path-method)で計算した「そのタスクから完了までの最長経路長」の長い順など)で、全タスクの優先順位リストを事前に構築する
3. 各プロセッサが空くたびに、優先順位リストを先頭から走査し、「まだ実行されておらず、かつ全ての先行タスクが完了している」最初のタスクをそのプロセッサに割り当てる
4. これを全タスクが完了するまで繰り返す——リストの優先順位に従いながらも、実際にどのタスクがいつ実行できるかは依存関係とプロセッサの空き状況によって動的に決まる、という点が単なる固定的な割り当てとは異なる
5. 得られたスケジュールの完了時間(メイクスパン)を評価する

## 特性・トレードオフ

- **計算量**: 優先順位リストの構築(ソート)に`O(n log n)`、その後の割り当て処理はタスク数とプロセッサ数に比例する程度で済むため、全体として効率的に計算できる
- **グラハムの境界という理論的保証**: 1966年にロナルド・グラハムが示した結果により、任意の(素朴な)優先順位リストを使うリストスケジューリングでも、得られるスケジュールの完了時間は、理論的な最適スケジュールの完了時間の高々2倍(より正確には`2 - 1/m`倍、`m`はプロセッサ数)に収まることが保証されている——単純な貪欲戦略に、驚くほど強い最悪ケースの性能保証が付随する稀有な例になっている
- **「アナーキー現象」という直感に反する性質**: 興味深いことに、タスクの処理時間を短縮したり、プロセッサ数を増やしたり、依存関係の制約を緩めたりしても、リストスケジューリングの結果としての完了時間がかえって**悪化**することがありうる(リチャードソンのアナーキー現象)——優先順位リストに従う貪欲な割り当てが、局所的には合理的でも大域的には非直感的な結果を生むことがある、並列スケジューリングの興味深い性質を示している
- **使いどころ**: 並列コンパイラにおけるタスクの依存グラフからのプロセッサ割り当て、マルチコアシステムにおけるジョブスケジューリング、[並列マージソート](/algorithms/parallel-merge-sort)のような並列アルゴリズムのタスク分割の実装基盤、プロジェクト管理における複数作業者へのタスク割り当ての理論的枠組み

## 実装例

事前に構築した優先順位リストの順に、空いたプロセッサへ実行可能な(依存タスクが全て完了した)タスクを割り当て続ける。

```python
def list_scheduling(tasks, deps, durations, priority, m):
    """優先順位リストpriorityの順に、プロセッサが空くたびに実行可能なタスクを割り当てる貪欲スケジューリング。
    戻り値: (start, completion, makespan)
    """
    completion = {}
    start = {}
    free_at = [0.0] * m
    remaining = set(tasks)

    while remaining:
        ready = [t for t in priority if t in remaining and all(d in completion for d in deps[t])]
        if not ready:
            raise ValueError("循環依存または矛盾した依存関係のため実行可能なタスクがない")
        p = min(range(m), key=lambda i: free_at[i])  # 最も早く空くプロセッサ
        t = ready[0]
        s = free_at[p]
        if deps[t]:
            s = max(s, max(completion[d] for d in deps[t]))
        e = s + durations[t]
        start[t] = s
        completion[t] = e
        free_at[p] = e
        remaining.remove(t)

    makespan = max(completion.values()) if completion else 0.0
    return start, completion, makespan
```

```typescript
type TaskId = number;

interface ScheduleResult {
  start: Map<TaskId, number>;
  completion: Map<TaskId, number>;
  makespan: number;
}

// 優先順位リストpriorityの順に、プロセッサが空くたびに実行可能なタスクを割り当てる貪欲スケジューリング
function listScheduling(
  tasks: TaskId[],
  deps: Map<TaskId, TaskId[]>,
  durations: Map<TaskId, number>,
  priority: TaskId[],
  m: number
): ScheduleResult {
  const completion = new Map<TaskId, number>();
  const start = new Map<TaskId, number>();
  const freeAt = new Array(m).fill(0);
  const remaining = new Set(tasks);

  while (remaining.size > 0) {
    const ready = priority.filter((t) => remaining.has(t) && deps.get(t)!.every((d) => completion.has(d)));
    if (ready.length === 0) throw new Error("循環依存または矛盾した依存関係のため実行可能なタスクがない");
    let p = 0;
    for (let i = 1; i < m; i++) if (freeAt[i] < freeAt[p]) p = i; // 最も早く空くプロセッサ
    const t = ready[0];
    let s = freeAt[p];
    const tDeps = deps.get(t)!;
    if (tDeps.length > 0) s = Math.max(s, Math.max(...tDeps.map((d) => completion.get(d)!)));
    const e = s + durations.get(t)!;
    start.set(t, s);
    completion.set(t, e);
    freeAt[p] = e;
    remaining.delete(t);
  }

  const makespan = completion.size > 0 ? Math.max(...completion.values()) : 0;
  return { start, completion, makespan };
}
```

```cpp
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <stdexcept>
#include <limits>

struct ScheduleResult {
    std::unordered_map<int, double> start;
    std::unordered_map<int, double> completion;
    double makespan;
};

// 優先順位リストpriorityの順に、プロセッサが空くたびに実行可能なタスクを割り当てる貪欲スケジューリング
ScheduleResult listScheduling(
    const std::vector<int>& tasks,
    const std::unordered_map<int, std::vector<int>>& deps,
    const std::unordered_map<int, double>& durations,
    const std::vector<int>& priority,
    int m) {
    std::unordered_map<int, double> completion, start;
    std::vector<double> freeAt(m, 0.0);
    std::unordered_set<int> remaining(tasks.begin(), tasks.end());

    while (!remaining.empty()) {
        int chosen = -1;
        for (int t : priority) {
            if (!remaining.count(t)) continue;
            bool allDone = true;
            for (int d : deps.at(t)) {
                if (!completion.count(d)) { allDone = false; break; }
            }
            if (allDone) { chosen = t; break; }
        }
        if (chosen == -1) throw std::runtime_error("循環依存または矛盾した依存関係のため実行可能なタスクがない");

        int p = 0; // 最も早く空くプロセッサ
        for (int i = 1; i < m; i++) if (freeAt[i] < freeAt[p]) p = i;

        double s = freeAt[p];
        for (int d : deps.at(chosen)) s = std::max(s, completion.at(d));
        double e = s + durations.at(chosen);
        start[chosen] = s;
        completion[chosen] = e;
        freeAt[p] = e;
        remaining.erase(chosen);
    }

    double makespan = 0.0;
    for (auto& [_, c] : completion) makespan = std::max(makespan, c);
    return {start, completion, makespan};
}
```

```rust
use std::collections::{HashMap, HashSet};

struct ScheduleResult {
    start: HashMap<i32, f64>,
    completion: HashMap<i32, f64>,
    makespan: f64,
}

// 優先順位リストpriorityの順に、プロセッサが空くたびに実行可能なタスクを割り当てる貪欲スケジューリング
fn list_scheduling(
    tasks: &[i32],
    deps: &HashMap<i32, Vec<i32>>,
    durations: &HashMap<i32, f64>,
    priority: &[i32],
    m: usize,
) -> ScheduleResult {
    let mut completion: HashMap<i32, f64> = HashMap::new();
    let mut start: HashMap<i32, f64> = HashMap::new();
    let mut free_at = vec![0.0_f64; m];
    let mut remaining: HashSet<i32> = tasks.iter().copied().collect();

    while !remaining.is_empty() {
        let chosen = priority
            .iter()
            .copied()
            .find(|t| remaining.contains(t) && deps[t].iter().all(|d| completion.contains_key(d)))
            .expect("循環依存または矛盾した依存関係のため実行可能なタスクがない");

        let p = (0..m).min_by(|&a, &b| free_at[a].partial_cmp(&free_at[b]).unwrap()).unwrap();

        let mut s = free_at[p];
        for d in &deps[&chosen] {
            s = s.max(completion[d]);
        }
        let e = s + durations[&chosen];
        start.insert(chosen, s);
        completion.insert(chosen, e);
        free_at[p] = e;
        remaining.remove(&chosen);
    }

    let makespan = completion.values().cloned().fold(0.0_f64, f64::max);
    ScheduleResult { start, completion, makespan }
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

record ScheduleResult(Dictionary<int, double> Start, Dictionary<int, double> Completion, double Makespan);

static class ListScheduling
{
    // 優先順位リストpriorityの順に、プロセッサが空くたびに実行可能なタスクを割り当てる貪欲スケジューリング
    public static ScheduleResult Run(
        List<int> tasks, Dictionary<int, List<int>> deps, Dictionary<int, double> durations,
        List<int> priority, int m)
    {
        var completion = new Dictionary<int, double>();
        var start = new Dictionary<int, double>();
        var freeAt = new double[m];
        var remaining = new HashSet<int>(tasks);

        while (remaining.Count > 0)
        {
            int chosen = priority.First(t => remaining.Contains(t) && deps[t].All(completion.ContainsKey));

            int p = 0; // 最も早く空くプロセッサ
            for (int i = 1; i < m; i++) if (freeAt[i] < freeAt[p]) p = i;

            double s = freeAt[p];
            foreach (var d in deps[chosen]) s = Math.Max(s, completion[d]);
            double e = s + durations[chosen];
            start[chosen] = s;
            completion[chosen] = e;
            freeAt[p] = e;
            remaining.Remove(chosen);
        }

        double makespan = completion.Count > 0 ? completion.Values.Max() : 0.0;
        return new ScheduleResult(start, completion, makespan);
    }
}
```
