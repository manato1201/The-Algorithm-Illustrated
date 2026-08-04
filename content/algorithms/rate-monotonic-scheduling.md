---
name: レートモノトニックスケジューリング(RMS)
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(n log n)(nタスクの優先度ソート)、スケジューラビリティ判定はO(n)
summary: 一定周期で繰り返し実行される複数のタスクに対し、周期が短い(頻繁に実行される)タスクほど高い優先度を静的に割り当てるだけで、リアルタイムシステムにおける締切遵守が理論的に保証される、組み込みシステムで広く使われる固定優先度スケジューリング方式。
---

## 概要

[最早締切優先(EDF)](/algorithms/earliest-deadline-first)は締切が近いタスクを動的に(実行のたびに再評価して)優先するのに対し、レートモノトニックスケジューリング(RMS)はより単純な発想を取る——航空機の制御システムや自動車のエンジン制御のように、複数のタスクがそれぞれ決まった周期(例えばタスクAは10ミリ秒ごと、タスクBは50ミリ秒ごと)で繰り返し実行される場合、「周期が短い(=頻度が高い)タスクほど高い優先度を、システム起動時に一度だけ静的に割り当てる」というシンプルなルールを使う。1973年にリュー(Liu)とレイランド(Layland)によって理論的に確立されたこの手法は、優先度を実行時に動的に変更する必要がないという実装の単純さを持ちながら、一定の条件下では全タスクの締切遵守を数学的に保証できる、組み込みリアルタイムシステムで広く採用されている手法である。

## 仕組み

1. 各タスク`τᵢ`について、周期`Tᵢ`(そのタスクが繰り返される間隔)とその周期内での実行時間`Cᵢ`(1回あたりの処理にかかる時間)があらかじめ分かっているとする
2. 各タスクの優先度を、周期`Tᵢ`が短いほど高くなるよう、システム起動時に静的に(実行中に変更せず)割り当てる——「周期に単調に対応する」優先度付けであることからレートモノトニックと呼ばれる
3. 実行時には、常に到着済みのタスクの中で最も優先度の高い(周期が最も短い)タスクをCPUに割り当てる、通常の優先度プリエンプティブスケジューリングを行う
4. **スケジューラビリティ判定**: 全タスクが締切(通常は次の周期の開始まで)を守れるかどうかを、実行前に理論的に判定できる。CPU使用率の合計`ΣCᵢ/Tᵢ`が、リューとレイランドが示した境界値`n(2^(1/n) - 1)`(タスク数`n`が増えるにつれて約69.3%に漸近する)以下であれば、全タスクの締切遵守が保証される
5. この境界値を超えていても実際には破綻しない場合もあるため、より精密な「応答時間解析」という別の判定手法を使って、境界値ぎりぎりのケースでもスケジューラビリティを確認することもある

## 特性・トレードオフ

- **計算量**: 優先度の割り当て自体は周期でソートするだけなので`O(n log n)`、スケジューラビリティ判定(使用率の合計計算)は`O(n)`——実行時のスケジューリング自体は通常の優先度付きキューと同じ`O(log n)`per操作で軽量
- **[最早締切優先(EDF)](/algorithms/earliest-deadline-first)との対比**: [EDF](/algorithms/earliest-deadline-first)は動的優先度方式でCPU使用率100%まで理論上スケジュール可能という最適性を持つが、実装が複雑(締切を都度再評価する必要がある)でオーバーヘッドも大きい。RMSは優先度が静的で実装が単純な分、保証できる使用率の上限(タスク数が多いと約69.3%)がEDFより低い——「実装の単純さ」と「理論的な最適性」のトレードオフを示す好対照な2つの手法になっている
- **静的優先度であることの実務上の利点**: 優先度を実行中に再計算する必要がないため、割り込み処理のオーバーヘッドが小さく、動作の予測可能性が高い——航空宇宙・自動車のような、動作の決定論的な予測可能性(いつ何が起こるか事前に完全に把握できること)が安全性認証上重要視される分野で好まれる理由になっている
- **周期が固定であるという前提**: RMSは「各タスクの周期が実行中に変化しない」ことを前提としている。実行時に新しいタスクが動的に追加されたり周期が変わったりする、より動的なシステムには適用が難しく、そのような場合は[EDF](/algorithms/earliest-deadline-first)や他の動的スケジューリング方式が必要になる
- **使いどころ**: 航空機・自動車の組み込み制御システム(エンジン制御、飛行制御コンピュータ)、産業用ロボットのリアルタイム制御、医療機器の組み込みソフトウェア、リアルタイムオペレーティングシステム(RTOS)のデフォルトスケジューリングポリシー

## 実装例

```python
import math
from functools import reduce


def lcm(a: int, b: int) -> int:
    return a * b // math.gcd(a, b)


def hyperperiod(tasks: list[dict]) -> int:
    return reduce(lcm, (t["period"] for t in tasks), 1)


def liu_layland_bound(n: int) -> float:
    return n * (2 ** (1 / n) - 1)  # nタスクの場合の十分条件の使用率上限


def is_schedulable_by_bound(tasks: list[dict]) -> tuple[bool, float]:
    utilization = sum(t["exec"] / t["period"] for t in tasks)
    return utilization <= liu_layland_bound(len(tasks)), utilization


def simulate_rms(tasks: list[dict]):
    """tasks: [{"name", "exec", "period"}, ...]。優先度は周期が短いほど高い(静的優先度)。"""
    ordered = sorted(tasks, key=lambda t: t["period"])
    horizon = hyperperiod(tasks)
    remaining: dict[tuple[str, int], int] = {}
    jobs = []
    for t in ordered:
        release = 0
        while release < horizon:
            remaining[(t["name"], release)] = t["exec"]
            jobs.append((t["name"], release, release + t["period"]))
            release += t["period"]

    finish_times: dict[tuple[str, int], int] = {}
    for time in range(horizon):
        chosen = None
        for t in ordered:  # 周期が短い順に見て、実行中の最高優先度タスクを選ぶ
            release = (time // t["period"]) * t["period"]
            key = (t["name"], release)
            if remaining.get(key, 0) > 0:
                chosen = key
                break
        if chosen is not None:
            remaining[chosen] -= 1
            if remaining[chosen] == 0:
                finish_times[chosen] = time + 1

    results = []
    for name, release, deadline in jobs:
        finish = finish_times.get((name, release))
        met = finish is not None and finish <= deadline
        results.append((name, release, finish, deadline, met))
    return results
```

```typescript
interface Task { name: string; exec: number; period: number; }

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function lcm(a: number, b: number): number { return (a * b) / gcd(a, b); }
function hyperperiod(tasks: Task[]): number { return tasks.reduce((h, t) => lcm(h, t.period), 1); }
function liuLaylandBound(n: number): number { return n * (2 ** (1 / n) - 1); }
function isSchedulableByBound(tasks: Task[]): { schedulable: boolean; utilization: number } {
  const utilization = tasks.reduce((s, t) => s + t.exec / t.period, 0);
  return { schedulable: utilization <= liuLaylandBound(tasks.length), utilization };
}

function simulateRMS(tasks: Task[]) {
  const ordered = [...tasks].sort((a, b) => a.period - b.period); // 静的優先度: 周期が短いほど高優先度
  const horizon = hyperperiod(tasks);
  const remaining = new Map<string, number>();
  const jobs: { name: string; release: number; deadline: number }[] = [];
  for (const t of ordered) {
    for (let release = 0; release < horizon; release += t.period) {
      remaining.set(`${t.name}:${release}`, t.exec);
      jobs.push({ name: t.name, release, deadline: release + t.period });
    }
  }
  const finishTimes = new Map<string, number>();
  for (let time = 0; time < horizon; time++) {
    let chosenKey: string | null = null;
    for (const t of ordered) {
      const release = Math.floor(time / t.period) * t.period;
      const key = `${t.name}:${release}`;
      if ((remaining.get(key) ?? 0) > 0) { chosenKey = key; break; }
    }
    if (chosenKey) {
      remaining.set(chosenKey, remaining.get(chosenKey)! - 1);
      if (remaining.get(chosenKey) === 0) finishTimes.set(chosenKey, time + 1);
    }
  }
  return jobs.map((j) => {
    const key = `${j.name}:${j.release}`;
    const finish = finishTimes.get(key) ?? null;
    return { ...j, finish, met: finish !== null && finish <= j.deadline };
  });
}
```

```cpp
#include <vector>
#include <string>
#include <map>
#include <algorithm>
#include <numeric>
#include <cmath>

struct Task { std::string name; int exec; int period; };

int gcdInt(int a, int b) { return b == 0 ? a : gcdInt(b, a % b); }
int lcmInt(int a, int b) { return a / gcdInt(a, b) * b; }

int hyperperiod(const std::vector<Task>& tasks) {
    int h = 1;
    for (auto& t : tasks) h = lcmInt(h, t.period);
    return h;
}
double liuLaylandBound(int n) { return n * (std::pow(2.0, 1.0 / n) - 1); }

bool isSchedulableByBound(const std::vector<Task>& tasks, double& utilizationOut) {
    double u = 0;
    for (auto& t : tasks) u += static_cast<double>(t.exec) / t.period;
    utilizationOut = u;
    return u <= liuLaylandBound(static_cast<int>(tasks.size()));
}

struct JobResult { std::string name; int release; int finish; int deadline; bool met; };

std::vector<JobResult> simulateRMS(std::vector<Task> tasks) {
    auto ordered = tasks;
    std::sort(ordered.begin(), ordered.end(), [](const Task& a, const Task& b) { return a.period < b.period; });
    int horizon = hyperperiod(tasks);

    std::map<std::pair<std::string, int>, int> remaining;
    std::vector<std::tuple<std::string, int, int>> jobs;
    for (auto& t : ordered) {
        for (int release = 0; release < horizon; release += t.period) {
            remaining[{t.name, release}] = t.exec;
            jobs.push_back({ t.name, release, release + t.period });
        }
    }

    std::map<std::pair<std::string, int>, int> finishTimes;
    for (int time = 0; time < horizon; time++) {
        std::pair<std::string, int>* chosen = nullptr;
        std::pair<std::string, int> chosenKey;
        for (auto& t : ordered) {
            int release = (time / t.period) * t.period;
            auto key = std::make_pair(t.name, release);
            if (remaining.count(key) && remaining[key] > 0) { chosenKey = key; chosen = &chosenKey; break; }
        }
        if (chosen) {
            remaining[chosenKey]--;
            if (remaining[chosenKey] == 0) finishTimes[chosenKey] = time + 1;
        }
    }

    std::vector<JobResult> results;
    for (auto& [name, release, deadline] : jobs) {
        auto key = std::make_pair(name, release);
        bool has = finishTimes.count(key) > 0;
        int finish = has ? finishTimes[key] : -1;
        results.push_back({ name, release, finish, deadline, has && finish <= deadline });
    }
    return results;
}
```

```rust
use std::collections::HashMap;

struct Task { name: String, exec: u32, period: u32 }

fn gcd(a: u32, b: u32) -> u32 { if b == 0 { a } else { gcd(b, a % b) } }
fn lcm(a: u32, b: u32) -> u32 { a / gcd(a, b) * b }
fn hyperperiod(tasks: &[Task]) -> u32 { tasks.iter().fold(1, |h, t| lcm(h, t.period)) }
fn liu_layland_bound(n: usize) -> f64 { n as f64 * (2f64.powf(1.0 / n as f64) - 1.0) }

fn is_schedulable_by_bound(tasks: &[Task]) -> (bool, f64) {
    let utilization: f64 = tasks.iter().map(|t| t.exec as f64 / t.period as f64).sum();
    (utilization <= liu_layland_bound(tasks.len()), utilization)
}

struct JobResult { name: String, release: u32, finish: Option<u32>, deadline: u32, met: bool }

fn simulate_rms(tasks: &[Task]) -> Vec<JobResult> {
    let mut ordered: Vec<&Task> = tasks.iter().collect();
    ordered.sort_by_key(|t| t.period);
    let horizon = hyperperiod(tasks);

    let mut remaining: HashMap<(String, u32), u32> = HashMap::new();
    let mut jobs: Vec<(String, u32, u32)> = Vec::new();
    for t in &ordered {
        let mut release = 0;
        while release < horizon {
            remaining.insert((t.name.clone(), release), t.exec);
            jobs.push((t.name.clone(), release, release + t.period));
            release += t.period;
        }
    }

    let mut finish_times: HashMap<(String, u32), u32> = HashMap::new();
    for time in 0..horizon {
        let mut chosen: Option<(String, u32)> = None;
        for t in &ordered {
            let release = (time / t.period) * t.period;
            let key = (t.name.clone(), release);
            if *remaining.get(&key).unwrap_or(&0) > 0 {
                chosen = Some(key);
                break;
            }
        }
        if let Some(key) = chosen {
            let rem = remaining.get_mut(&key).unwrap();
            *rem -= 1;
            if *rem == 0 {
                finish_times.insert(key, time + 1);
            }
        }
    }

    jobs.into_iter().map(|(name, release, deadline)| {
        let finish = finish_times.get(&(name.clone(), release)).copied();
        let met = finish.map_or(false, |f| f <= deadline);
        JobResult { name, release, finish, deadline, met }
    }).collect()
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

class RmsTask { public string Name = ""; public int Exec; public int Period; }

static class Rms
{
    static int Gcd(int a, int b) => b == 0 ? a : Gcd(b, a % b);
    static int Lcm(int a, int b) => a / Gcd(a, b) * b;
    public static int Hyperperiod(List<RmsTask> tasks) => tasks.Aggregate(1, (h, t) => Lcm(h, t.Period));
    public static double LiuLaylandBound(int n) => n * (Math.Pow(2, 1.0 / n) - 1);

    public static (bool Schedulable, double Utilization) IsSchedulableByBound(List<RmsTask> tasks)
    {
        double utilization = tasks.Sum(t => (double)t.Exec / t.Period);
        return (utilization <= LiuLaylandBound(tasks.Count), utilization);
    }

    public static List<(string Name, int Release, int? Finish, int Deadline, bool Met)> Simulate(List<RmsTask> tasks)
    {
        var ordered = tasks.OrderBy(t => t.Period).ToList(); // 静的優先度: 周期が短いほど高優先度
        int horizon = Hyperperiod(tasks);
        var remaining = new Dictionary<(string, int), int>();
        var jobs = new List<(string Name, int Release, int Deadline)>();
        foreach (var t in ordered)
            for (int release = 0; release < horizon; release += t.Period)
            {
                remaining[(t.Name, release)] = t.Exec;
                jobs.Add((t.Name, release, release + t.Period));
            }

        var finishTimes = new Dictionary<(string, int), int>();
        for (int time = 0; time < horizon; time++)
        {
            (string, int)? chosen = null;
            foreach (var t in ordered)
            {
                int release = (time / t.Period) * t.Period;
                var key = (t.Name, release);
                if (remaining.TryGetValue(key, out var rem) && rem > 0) { chosen = key; break; }
            }
            if (chosen != null)
            {
                remaining[chosen.Value]--;
                if (remaining[chosen.Value] == 0) finishTimes[chosen.Value] = time + 1;
            }
        }

        var results = new List<(string, int, int?, int, bool)>();
        foreach (var (name, release, deadline) in jobs)
        {
            bool has = finishTimes.TryGetValue((name, release), out var finish);
            results.Add((name, release, has ? finish : null, deadline, has && finish <= deadline));
        }
        return results;
    }
}
```
