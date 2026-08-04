---
name: 優先度スケジューリング
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(log n)(優先度キューでの挿入・取り出し、n待機プロセス数)
summary: 各プロセスに割り当てられた優先度の高い順にCPUを割り当てる、実行時間ではなく重要度に基づく汎用的なスケジューリング方式とその餓死問題への対処。
---

## 概要

[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)は「実行時間」という単一の基準に基づいてスケジューリングを最適化するが、実際のシステムでは「このプロセスは緊急性が高いから最優先で処理したい」「このプロセスはシステムの根幹に関わるから他より優先すべき」といった、実行時間とは独立した重要度に基づく判断が必要になることが多い。優先度スケジューリングは、各プロセスに割り当てられた数値の優先度に従ってCPUを割り当てる、最も汎用的なスケジューリングの枠組みであり、実は[最短ジョブ優先](/algorithms/shortest-job-first)自体も「実行時間の逆数を優先度とする優先度スケジューリングの特殊ケース」として位置づけられる。

## 仕組み

1. 各プロセスに、システム管理者や種別(システムプロセスかユーザープロセスか)、あるいは待機時間などに基づいた優先度の数値を割り当てる
2. 全ての待機プロセスを優先度に基づいた優先度キューで管理する(実装は`heap-sort`や[二分ヒープ](/algorithms/heap-sort)のようなヒープ構造が典型的)
3. CPUが空いたら、キューの中から最も優先度の高いプロセスを取り出して実行する
4. **プリエンプティブ版**では、新しく到着したプロセスの優先度が現在実行中のプロセスより高ければ、即座に実行中のプロセスを中断して新しいプロセスに切り替える。**非プリエンプティブ版**では、一度実行を始めたプロセスは完了まで中断されない
5. **エイジング**という補正技法を組み合わせることが多い: キューで待たされている時間が長くなるにつれて、そのプロセスの優先度を徐々に引き上げていく。これにより、優先度の低いプロセスもいずれは実行される機会が保証される

## 特性・トレードオフ

- **計算量**: 優先度付きキュー(ヒープ)を使えば、追加・取り出しがそれぞれ`O(log n)`。[最短ジョブ優先](/algorithms/shortest-job-first)と同じ実装基盤を共有できる
- **飢餓(starvation)問題とエイジングによる対処**: 優先度の低いプロセスが、優先度の高いプロセスが次々に到着することで永遠に実行されない飢餓は、[最短ジョブ優先](/algorithms/shortest-job-first)における長いジョブの飢餓と同じ構造の問題である。エイジングは、この問題に対する古典的かつ実務的な解決策で、時間経過という別の軸を優先度計算に組み込むことで、いずれ必ず実行される保証を与える
- **優先度の設計という難しさ**: このアルゴリズム自体は単純だが、実際に「何をどう優先度として数値化するか」という設計判断が、システム全体の振る舞いを大きく左右する。優先度の逆転(低優先度プロセスがロックを保持していて高優先度プロセスをブロックしてしまう「優先度逆転」問題)のような、優先度ベースの設計に固有の落とし穴もある
- **使いどころ**: リアルタイムOSにおけるタスクの緊急度に基づくスケジューリング、[マルチレベルフィードバックキュー](/algorithms/multilevel-feedback-queue)の内部構成要素、ネットワークQoS(サービス品質)におけるトラフィックの優先制御、タスク管理システムにおける緊急タスクの優先処理

## 実装例

1ティックずつ時間を進め、到着済みプロセスの中から実効優先度(数値が小さいほど高優先度)最小のものを選んでCPUを割り当てるプリエンプティブなシミュレーション。長時間待たされたプロセスの実効優先度をエイジングで引き上げ、低優先度プロセスの飢餓を防ぐ様子を検証する。

```python
from dataclasses import dataclass


@dataclass
class Process:
    pid: str
    arrival: int
    burst: int
    priority: int
    remaining: int = 0
    waiting_ticks: int = 0

    def __post_init__(self) -> None:
        self.remaining = self.burst
        self.effective_priority = self.priority


def schedule(processes: list[Process], aging_step: int = 5, aging_amount: int = 1) -> list[str]:
    timeline: list[str] = []
    time = 0
    remaining_procs = {p.pid for p in processes}

    while remaining_procs:
        arrived = [p for p in processes if p.arrival <= time and p.remaining > 0]
        if not arrived:
            timeline.append("idle")
            time += 1
            continue

        current = min(arrived, key=lambda p: (p.effective_priority, p.pid))
        timeline.append(current.pid)
        current.remaining -= 1
        time += 1
        if current.remaining == 0:
            remaining_procs.discard(current.pid)

        # エイジング: 実行できなかった到着済みプロセスの待機時間を積み上げ、
        # 一定ティックごとに実効優先度を引き上げる(数値を下げる=優先度を上げる)
        for p in arrived:
            if p.pid == current.pid or p.remaining == 0:
                continue
            p.waiting_ticks += 1
            if p.waiting_ticks % aging_step == 0:
                p.effective_priority = max(0, p.effective_priority - aging_amount)

    return timeline
```

```typescript
interface Proc {
  pid: string;
  arrival: number;
  burst: number;
  remaining: number;
  effectivePriority: number;
  waitingTicks: number;
}

function makeProc(pid: string, arrival: number, burst: number, priority: number): Proc {
  return { pid, arrival, burst, remaining: burst, effectivePriority: priority, waitingTicks: 0 };
}

function schedule(processes: Proc[], agingStep = 5, agingAmount = 1): string[] {
  const timeline: string[] = [];
  let time = 0;
  const remaining = new Set(processes.map((p) => p.pid));

  while (remaining.size > 0) {
    const arrived = processes.filter((p) => p.arrival <= time && p.remaining > 0);
    if (arrived.length === 0) {
      timeline.push("idle");
      time++;
      continue;
    }
    const current = arrived.reduce((best, p) =>
      p.effectivePriority < best.effectivePriority ||
      (p.effectivePriority === best.effectivePriority && p.pid < best.pid)
        ? p
        : best
    );
    timeline.push(current.pid);
    current.remaining--;
    time++;
    if (current.remaining === 0) remaining.delete(current.pid);

    for (const p of arrived) {
      if (p.pid === current.pid || p.remaining === 0) continue;
      p.waitingTicks++;
      if (p.waitingTicks % agingStep === 0) {
        p.effectivePriority = Math.max(0, p.effectivePriority - agingAmount);
      }
    }
  }
  return timeline;
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <algorithm>

struct Proc {
    std::string pid;
    int arrival, burst, remaining, effectivePriority, waitingTicks = 0;
};

std::vector<std::string> schedule(std::vector<Proc> processes, int agingStep = 5, int agingAmount = 1) {
    std::vector<std::string> timeline;
    int time = 0;
    std::set<std::string> remaining;
    for (auto& p : processes) remaining.insert(p.pid);

    while (!remaining.empty()) {
        std::vector<Proc*> arrived;
        for (auto& p : processes) if (p.arrival <= time && p.remaining > 0) arrived.push_back(&p);

        if (arrived.empty()) { timeline.push_back("idle"); time++; continue; }

        Proc* current = *std::min_element(arrived.begin(), arrived.end(), [](Proc* a, Proc* b) {
            if (a->effectivePriority != b->effectivePriority) return a->effectivePriority < b->effectivePriority;
            return a->pid < b->pid;
        });

        timeline.push_back(current->pid);
        current->remaining--;
        time++;
        if (current->remaining == 0) remaining.erase(current->pid);

        for (auto* p : arrived) {
            if (p->pid == current->pid || p->remaining == 0) continue;
            p->waitingTicks++;
            if (p->waitingTicks % agingStep == 0) p->effectivePriority = std::max(0, p->effectivePriority - agingAmount);
        }
    }
    return timeline;
}
```

```rust
struct Proc {
    pid: String,
    arrival: i32,
    remaining: i32,
    effective_priority: i32,
    waiting_ticks: i32,
}

fn schedule(mut processes: Vec<Proc>, aging_step: i32, aging_amount: i32) -> Vec<String> {
    let mut timeline = Vec::new();
    let mut time = 0;

    while processes.iter().any(|p| p.remaining > 0) {
        let arrived_indices: Vec<usize> = (0..processes.len())
            .filter(|&i| processes[i].arrival <= time && processes[i].remaining > 0)
            .collect();

        if arrived_indices.is_empty() {
            timeline.push("idle".to_string());
            time += 1;
            continue;
        }

        let current_idx = *arrived_indices
            .iter()
            .min_by_key(|&&i| (processes[i].effective_priority, processes[i].pid.clone()))
            .unwrap();

        timeline.push(processes[current_idx].pid.clone());
        processes[current_idx].remaining -= 1;
        time += 1;

        for &i in &arrived_indices {
            if i == current_idx || processes[i].remaining == 0 {
                continue;
            }
            processes[i].waiting_ticks += 1;
            if processes[i].waiting_ticks % aging_step == 0 {
                processes[i].effective_priority = (processes[i].effective_priority - aging_amount).max(0);
            }
        }
    }
    timeline
}
```

```csharp
class Proc
{
    public string Pid; public int Arrival, Burst, Priority, Remaining, EffectivePriority, WaitingTicks;
    public Proc(string pid, int arrival, int burst, int priority)
    {
        Pid = pid; Arrival = arrival; Burst = burst; Priority = priority;
        Remaining = burst; EffectivePriority = priority;
    }
}

static class PriorityScheduling
{
    public static List<string> Schedule(List<(string pid, int arrival, int burst, int priority)> input, int agingStep = 5, int agingAmount = 1)
    {
        var processes = input.Select(p => new Proc(p.pid, p.arrival, p.burst, p.priority)).ToList();
        var timeline = new List<string>();
        int time = 0;
        var remaining = new HashSet<string>(processes.Select(p => p.Pid));

        while (remaining.Count > 0)
        {
            var arrived = processes.Where(p => p.Arrival <= time && p.Remaining > 0).ToList();
            if (arrived.Count == 0) { timeline.Add("idle"); time++; continue; }

            var current = arrived.OrderBy(p => p.EffectivePriority).ThenBy(p => p.Pid).First();
            timeline.Add(current.Pid);
            current.Remaining--;
            time++;
            if (current.Remaining == 0) remaining.Remove(current.Pid);

            foreach (var p in arrived)
            {
                if (p.Pid == current.Pid || p.Remaining == 0) continue;
                p.WaitingTicks++;
                if (p.WaitingTicks % agingStep == 0) p.EffectivePriority = Math.Max(0, p.EffectivePriority - agingAmount);
            }
        }
        return timeline;
    }
}
```
