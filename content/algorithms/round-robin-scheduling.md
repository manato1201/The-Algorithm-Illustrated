---
name: ラウンドロビンスケジューリング
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(1)(1回のスケジューリング判定あたり、キュー操作)
summary: 全プロセスに固定の持ち時間(タイムスライス)を順番に割り当てることで、特定のプロセスがCPUを独占せず、体感的な応答性を公平に保つ最も基本的なCPUスケジューリング方式。
---

## 概要

複数のプロセスが1つのCPUを取り合う状況で、「先に来たプロセスを最後まで実行してから次へ」という単純な先着順(FCFS)の方式を取ると、実行時間の長いプロセスが後続の短いプロセスを長時間ブロックしてしまい、対話的な操作への応答性が悪化する。ラウンドロビンスケジューリングは、各プロセスに固定の持ち時間(タイムスライス、クオンタム)だけCPUを割り当て、時間切れになったら強制的に次のプロセスへ切り替える、時分割システムの基本となる方式である。全プロセスが順番に少しずつ実行される様子が、円卓を回る(ラウンドロビン)ようであることからこの名がついた。

## 仕組み

1. 実行待ちの全プロセスを、単純なFIFO(先入れ先出し)キューで管理する
2. スケジューラは、キューの先頭からプロセスを1つ取り出し、固定長のタイムスライス`q`だけCPUを割り当てて実行する
3. そのプロセスが`q`時間以内に処理を完了すればそのまま終了する。完了しなければ、タイムスライスが尽きた時点で強制的に実行を中断し(プリエンプション)、そのプロセスをキューの**末尾**に戻す
4. スケジューラは次にキューの先頭にあるプロセス(次の順番のプロセス)へ切り替え、2〜3を繰り返す
5. 全プロセスがキューを一巡するまでの時間は、おおよそ「待機プロセス数×タイムスライス」程度になり、この巡回を繰り返すことで、全プロセスが少しずつ着実に進行していく

## 特性・トレードオフ

- **計算量**: プロセスの追加・取り出しは単純なキュー操作なので`O(1)`。実装がシンプルで、リアルタイム性の判断も予測しやすい
- **タイムスライスの長さのトレードオフ**: タイムスライス`q`が長すぎると、プロセス切り替えの頻度が下がり応答性が悪化し(先着順に近づく)、短すぎると、プロセス切り替え自体のオーバーヘッド(コンテキストスイッチのコスト)が相対的に増えてスループットが落ちる——実用的な`q`の値の選定は、システムの応答性要件と切り替えコストのバランスを取る典型的なチューニング課題になる
- **公平性の保証**: 全プロセスが平等にタイムスライスを受け取るため、極端な待機(飢餓、starvation)が起こりにくい。ただし全プロセスの重要度が同じであるとは限らないため、優先度の概念を組み込みたい場合は[優先度スケジューリング](/algorithms/priority-scheduling)や[マルチレベルフィードバックキュー](/algorithms/multilevel-feedback-queue)のような拡張が必要になる
- **使いどころ**: 汎用OSの時分割システムにおけるCPUスケジューリングの基本方式、ネットワークルーターにおけるパケットの公平なキューイング(ラウンドロビンキューイング)、複数クライアントへのリクエストの均等な分配(ロードバランシング)

## 実装例

```python
from collections import deque


def round_robin(processes: list[dict], quantum: int) -> dict[str, int]:
    """processes: [{"name", "arrival", "burst"}, ...]。戻り値は各プロセス名 -> 完了時刻。"""
    procs = sorted(processes, key=lambda p: p["arrival"])
    remaining = {p["name"]: p["burst"] for p in procs}
    completion: dict[str, int] = {}
    queue: deque[str] = deque()
    i = 0
    n = len(procs)

    def admit_arrivals(up_to_time: int) -> None:
        nonlocal i
        while i < n and procs[i]["arrival"] <= up_to_time:
            queue.append(procs[i]["name"])
            i += 1

    time = procs[0]["arrival"]
    admit_arrivals(time)

    while queue:
        name = queue.popleft()
        run = min(quantum, remaining[name])
        time += run
        remaining[name] -= run
        admit_arrivals(time)  # このタイムスライス中に到着した分を先にキューへ入れる
        if remaining[name] > 0:
            queue.append(name)  # 未完了ならキューの末尾に戻す
        else:
            completion[name] = time
        if not queue and i < n:
            time = max(time, procs[i]["arrival"])
            admit_arrivals(time)

    return completion
```

```typescript
interface Proc { name: string; arrival: number; burst: number; }

function roundRobin(processes: Proc[], quantum: number): Map<string, number> {
  const procs = [...processes].sort((a, b) => a.arrival - b.arrival);
  const remaining = new Map(procs.map((p) => [p.name, p.burst]));
  const completion = new Map<string, number>();
  const queue: string[] = [];
  let i = 0;
  const n = procs.length;

  const admitArrivals = (upToTime: number) => {
    while (i < n && procs[i].arrival <= upToTime) { queue.push(procs[i].name); i++; }
  };

  let time = procs[0].arrival;
  admitArrivals(time);

  while (queue.length > 0) {
    const name = queue.shift()!;
    const run = Math.min(quantum, remaining.get(name)!);
    time += run;
    remaining.set(name, remaining.get(name)! - run);
    admitArrivals(time);
    if (remaining.get(name)! > 0) queue.push(name);
    else completion.set(name, time);
    if (queue.length === 0 && i < n) {
      time = Math.max(time, procs[i].arrival);
      admitArrivals(time);
    }
  }
  return completion;
}
```

```cpp
#include <string>
#include <vector>
#include <deque>
#include <map>
#include <algorithm>

struct Proc { std::string name; int arrival; int burst; };

std::map<std::string, int> roundRobin(std::vector<Proc> processes, int quantum) {
    std::sort(processes.begin(), processes.end(), [](const Proc& a, const Proc& b) { return a.arrival < b.arrival; });
    std::map<std::string, int> remaining;
    for (auto& p : processes) remaining[p.name] = p.burst;
    std::map<std::string, int> completion;
    std::deque<std::string> queue;
    size_t i = 0;
    size_t n = processes.size();

    auto admitArrivals = [&](int upToTime) {
        while (i < n && processes[i].arrival <= upToTime) { queue.push_back(processes[i].name); i++; }
    };

    int time = processes[0].arrival;
    admitArrivals(time);

    while (!queue.empty()) {
        std::string name = queue.front();
        queue.pop_front();
        int run = std::min(quantum, remaining[name]);
        time += run;
        remaining[name] -= run;
        admitArrivals(time);
        if (remaining[name] > 0) queue.push_back(name);
        else completion[name] = time;
        if (queue.empty() && i < n) {
            time = std::max(time, processes[i].arrival);
            admitArrivals(time);
        }
    }
    return completion;
}
```

```rust
use std::collections::{HashMap, VecDeque};

struct Proc { name: String, arrival: i32, burst: i32 }

fn round_robin(processes: &[Proc], quantum: i32) -> HashMap<String, i32> {
    let mut procs: Vec<&Proc> = processes.iter().collect();
    procs.sort_by_key(|p| p.arrival);
    let mut remaining: HashMap<String, i32> = procs.iter().map(|p| (p.name.clone(), p.burst)).collect();
    let mut completion: HashMap<String, i32> = HashMap::new();
    let mut queue: VecDeque<String> = VecDeque::new();
    let mut i = 0;
    let n = procs.len();

    let admit_arrivals = |up_to_time: i32, i: &mut usize, queue: &mut VecDeque<String>| {
        while *i < n && procs[*i].arrival <= up_to_time {
            queue.push_back(procs[*i].name.clone());
            *i += 1;
        }
    };

    let mut time = procs[0].arrival;
    admit_arrivals(time, &mut i, &mut queue);

    while let Some(name) = queue.pop_front() {
        let run = quantum.min(remaining[&name]);
        time += run;
        *remaining.get_mut(&name).unwrap() -= run;
        admit_arrivals(time, &mut i, &mut queue);
        if remaining[&name] > 0 {
            queue.push_back(name);
        } else {
            completion.insert(name, time);
        }
        if queue.is_empty() && i < n {
            time = time.max(procs[i].arrival);
            admit_arrivals(time, &mut i, &mut queue);
        }
    }
    completion
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

class RRProc { public string Name = ""; public int Arrival; public int Burst; }

static class RoundRobin
{
    public static Dictionary<string, int> Schedule(List<RRProc> processes, int quantum)
    {
        var procs = processes.OrderBy(p => p.Arrival).ToList();
        var remaining = procs.ToDictionary(p => p.Name, p => p.Burst);
        var completion = new Dictionary<string, int>();
        var queue = new Queue<string>();
        int i = 0;
        int n = procs.Count;

        void Admit(int upTo)
        {
            while (i < n && procs[i].Arrival <= upTo) { queue.Enqueue(procs[i].Name); i++; }
        }

        int time = procs[0].Arrival;
        Admit(time);
        while (queue.Count > 0)
        {
            var name = queue.Dequeue();
            int run = Math.Min(quantum, remaining[name]);
            time += run;
            remaining[name] -= run;
            Admit(time);
            if (remaining[name] > 0) queue.Enqueue(name);
            else completion[name] = time;
            if (queue.Count == 0 && i < n)
            {
                time = Math.Max(time, procs[i].Arrival);
                Admit(time);
            }
        }
        return completion;
    }
}
```
