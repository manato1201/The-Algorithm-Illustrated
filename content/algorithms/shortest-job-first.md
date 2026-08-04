---
name: 最短ジョブ優先(SJF)スケジューリング
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(log n)(優先度キューでの挿入・取り出し、n待機プロセス数)
summary: 実行時間が最も短いプロセスから優先的に処理することで、全プロセスの平均待ち時間を数学的に最小化することが証明されているスケジューリング方式。
---

## 概要

複数のプロセスがCPUを待っているとき、どの順番で処理すれば「みんなの平均待ち時間」を最も短くできるだろうか。最短ジョブ優先(SJF)スケジューリングは、この問いに対する数学的に最適な答えを与える——各プロセスの必要な実行時間があらかじめ分かっているという理想的な前提のもとで、実行時間の短いプロセスから順に処理することが、全プロセスの平均待ち時間を最小化することが証明されている。[ラウンドロビン](/algorithms/round-robin-scheduling)が公平性(誰も長く待たせすぎない)を重視するのに対し、SJFは全体最適(平均待ち時間の最小化)を追求する対照的な設計思想を持つ。

## 仕組み

1. 各プロセスの必要な実行時間(バースト時間)が既知であると仮定する(実際のシステムでは、過去の実行履歴から統計的に予測することが多い)
2. 全ての待機プロセスを、必要な実行時間の短い順に並べる優先度キューで管理する
3. CPUが空いたら、キューの中から実行時間が最も短いプロセスを取り出して実行する
4. **非プリエンプティブ版**では、一度実行を始めたプロセスは完了まで中断されない。**プリエンプティブ版(最短残り時間優先、SRTF)**では、新しく到着したプロセスの実行時間が、現在実行中のプロセスの残り実行時間より短ければ、即座に実行を中断して新しいプロセスに切り替える
5. これを全プロセスが完了するまで繰り返す——短いプロセスから片付けていくことで、多くのプロセスが早く完了し、結果として全体の平均待ち時間が短くなる

## 特性・トレードオフ

- **計算量**: 優先度キュー(ヒープ)を使えば、プロセスの追加・取り出しがそれぞれ`O(log n)`。実行時間による比較さえできれば効率的に実装できる
- **平均待ち時間の最適性**: 全プロセスの実行時間が既知であるという理想化された設定のもとでは、SJFが平均待ち時間を最小化する最適なスケジューリングであることが数学的に証明されている——これはこのアルゴリズムの理論的な魅力の核心である
- **長いプロセスの飢餓リスク**: 短いプロセスが次々に到着し続けると、実行時間の長いプロセスがいつまでも後回しにされ続ける「飢餓(starvation)」が起こりうる。[ラウンドロビン](/algorithms/round-robin-scheduling)のような公平性の保証がない点が、SJFの実用上の大きな弱点になる
- **実行時間の予測という現実的な壁**: 理論上の最適性は「実行時間が事前に分かっている」ことに強く依存するが、実際のシステムでは将来の実行時間を正確に知ることは通常できない。実務では過去の実行時間の指数移動平均などで予測値を推定して近似的に適用するか、[マルチレベルフィードバックキュー](/algorithms/multilevel-feedback-queue)のように「実測の実行パターンから優先度を動的に調整する」より実用的な方式が好まれる
- **使いどころ**: バッチ処理システムにおけるジョブスケジューリング(実行時間の見積もりが可能な場合)、理論的な最適性の基準としてのベンチマーク(他のスケジューリング方式の平均待ち時間と比較する際の理論的下限として使われる)

## 実装例

非プリエンプティブ版のSJF(実行を始めたプロセスは完了まで中断されない)を実装する。

```python
import heapq


def sjf_non_preemptive(processes: list[dict]) -> dict[str, int]:
    """processes: [{"name", "arrival", "burst"}, ...]。戻り値は各プロセス名 -> 完了時刻。"""
    procs = sorted(processes, key=lambda p: p["arrival"])
    n = len(procs)
    completion: dict[str, int] = {}
    ready: list[tuple[int, int, str]] = []  # (burst, arrival, name) のヒープ
    i = 0
    time = procs[0]["arrival"]

    def admit(up_to: int) -> None:
        nonlocal i
        while i < n and procs[i]["arrival"] <= up_to:
            heapq.heappush(ready, (procs[i]["burst"], procs[i]["arrival"], procs[i]["name"]))
            i += 1

    admit(time)
    while ready or i < n:
        if not ready:
            time = procs[i]["arrival"]
            admit(time)
        burst, _, name = heapq.heappop(ready)  # 実行時間が最も短いプロセスを選ぶ
        time += burst
        completion[name] = time
        admit(time)
    return completion
```

```typescript
interface Proc { name: string; arrival: number; burst: number; }

function sjfNonPreemptive(processes: Proc[]): Map<string, number> {
  const procs = [...processes].sort((a, b) => a.arrival - b.arrival);
  const n = procs.length;
  const completion = new Map<string, number>();
  const ready: Proc[] = [];
  let i = 0;
  let time = procs[0].arrival;

  const admit = (upTo: number) => {
    while (i < n && procs[i].arrival <= upTo) { ready.push(procs[i]); i++; }
  };
  const popShortest = (): Proc => {
    let bestIdx = 0;
    for (let k = 1; k < ready.length; k++) {
      if (ready[k].burst < ready[bestIdx].burst ||
          (ready[k].burst === ready[bestIdx].burst && ready[k].arrival < ready[bestIdx].arrival)) {
        bestIdx = k;
      }
    }
    return ready.splice(bestIdx, 1)[0];
  };

  admit(time);
  while (ready.length > 0 || i < n) {
    if (ready.length === 0) { time = procs[i].arrival; admit(time); }
    const p = popShortest();
    time += p.burst;
    completion.set(p.name, time);
    admit(time);
  }
  return completion;
}
```

```cpp
#include <string>
#include <vector>
#include <map>
#include <algorithm>

struct Proc { std::string name; int arrival; int burst; };

std::map<std::string, int> sjfNonPreemptive(std::vector<Proc> processes) {
    std::sort(processes.begin(), processes.end(), [](const Proc& a, const Proc& b) { return a.arrival < b.arrival; });
    size_t n = processes.size();
    std::map<std::string, int> completion;
    std::vector<Proc> ready;
    size_t i = 0;

    auto admit = [&](int upTo) {
        while (i < n && processes[i].arrival <= upTo) { ready.push_back(processes[i]); i++; }
    };

    int time = processes[0].arrival;
    admit(time);
    while (!ready.empty() || i < n) {
        if (ready.empty()) { time = processes[i].arrival; admit(time); }
        size_t bestIdx = 0;
        for (size_t k = 1; k < ready.size(); k++) {
            if (ready[k].burst < ready[bestIdx].burst ||
                (ready[k].burst == ready[bestIdx].burst && ready[k].arrival < ready[bestIdx].arrival)) {
                bestIdx = k;
            }
        }
        Proc p = ready[bestIdx];
        ready.erase(ready.begin() + bestIdx);
        time += p.burst;
        completion[p.name] = time;
        admit(time);
    }
    return completion;
}
```

```rust
use std::collections::HashMap;

struct Proc { name: String, arrival: i32, burst: i32 }

fn sjf_non_preemptive(processes: &[Proc]) -> HashMap<String, i32> {
    let mut procs: Vec<&Proc> = processes.iter().collect();
    procs.sort_by_key(|p| p.arrival);
    let n = procs.len();
    let mut completion: HashMap<String, i32> = HashMap::new();
    let mut ready: Vec<&Proc> = Vec::new();
    let mut i = 0;

    let mut admit = |up_to: i32, i: &mut usize, ready: &mut Vec<&Proc>| {
        while *i < n && procs[*i].arrival <= up_to {
            ready.push(procs[*i]);
            *i += 1;
        }
    };

    let mut time = procs[0].arrival;
    admit(time, &mut i, &mut ready);

    while !ready.is_empty() || i < n {
        if ready.is_empty() {
            time = procs[i].arrival;
            admit(time, &mut i, &mut ready);
        }
        let mut best_idx = 0;
        for k in 1..ready.len() {
            if ready[k].burst < ready[best_idx].burst
                || (ready[k].burst == ready[best_idx].burst && ready[k].arrival < ready[best_idx].arrival)
            {
                best_idx = k;
            }
        }
        let p = ready.remove(best_idx);
        time += p.burst;
        completion.insert(p.name.clone(), time);
        admit(time, &mut i, &mut ready);
    }
    completion
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

class SjfProc { public string Name = ""; public int Arrival; public int Burst; }

static class Sjf
{
    public static Dictionary<string, int> NonPreemptive(List<SjfProc> processes)
    {
        var procs = processes.OrderBy(p => p.Arrival).ToList();
        int n = procs.Count;
        var completion = new Dictionary<string, int>();
        var ready = new List<SjfProc>();
        int i = 0;
        int time = procs[0].Arrival;

        void Admit(int upTo)
        {
            while (i < n && procs[i].Arrival <= upTo) { ready.Add(procs[i]); i++; }
        }
        SjfProc PopShortest()
        {
            int bestIdx = 0;
            for (int k = 1; k < ready.Count; k++)
            {
                if (ready[k].Burst < ready[bestIdx].Burst ||
                    (ready[k].Burst == ready[bestIdx].Burst && ready[k].Arrival < ready[bestIdx].Arrival))
                    bestIdx = k;
            }
            var p = ready[bestIdx];
            ready.RemoveAt(bestIdx);
            return p;
        }

        Admit(time);
        while (ready.Count > 0 || i < n)
        {
            if (ready.Count == 0) { time = procs[i].Arrival; Admit(time); }
            var p = PopShortest();
            time += p.Burst;
            completion[p.Name] = time;
            Admit(time);
        }
        return completion;
    }
}
```
