---
name: マルチレベルフィードバックキュー
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(log n)(キュー間の移動含む、優先度キュー操作)
summary: プロセスの過去の振る舞い(CPUをどれだけ長く使ったか)を観察して自動的にキュー間を移動させることで、事前情報なしにI/O中心と計算中心のプロセスを動的に区別する実用的なスケジューリング方式。
---

## 概要

[最短ジョブ優先](/algorithms/shortest-job-first)は「実行時間が事前に分かっている」という非現実的な仮定に依存し、[優先度スケジューリング](/algorithms/priority-scheduling)は「適切な優先度をどう決めるか」という別の難問を残す。マルチレベルフィードバックキューは、これらの理論的なアルゴリズムが抱える「事前情報が必要」という弱点を、「プロセスの過去の振る舞いを観察して優先度を動的に調整する」という実用的なアプローチで回避する、現代の汎用OSのCPUスケジューラの基盤となっている設計である。

## 仕組み

1. 優先度の異なる複数のキュー(レベル0が最高優先度、レベルが上がるほど優先度が下がる)を用意する。各レベルには、それぞれ異なる長さのタイムスライスが割り当てられる(高優先度のキューほど短いタイムスライス、低優先度のキューほど長いタイムスライス、というのが典型的な設計)
2. 新しいプロセスは、まず最高優先度のキュー(レベル0)に入る
3. スケジューラは常に、空でない中で最も優先度の高いキューからプロセスを選んで実行する([優先度スケジューリング](/algorithms/priority-scheduling)と同様、各レベル内では通常[ラウンドロビン](/algorithms/round-robin-scheduling)で処理する)
4. プロセスがタイムスライスを使い切っても処理が終わらなければ(CPUを長く使い続ける「計算中心」の振る舞いを示したことになるので)、そのプロセスを1つ下のレベル(より低い優先度、より長いタイムスライス)のキューへ降格させる
5. 逆に、プロセスがタイムスライスを使い切る前にI/O待ちなどで自発的にCPUを手放した場合(対話的な処理や「I/O中心」の振る舞いを示したことになるので)、そのプロセスの優先度を維持するか、上のレベルへ昇格させることもある——こうして、対話的な応答性が重要なプロセスは自動的に高優先度に留まり、バッチ的な計算処理は自動的に低優先度へ移っていく

## 特性・トレードオフ

- **計算量**: 各キューを優先度キューまたは単純なリストで実装すれば、レベル間の移動を含めても`O(log n)`程度に抑えられる
- **事前情報なしでの適応的な優先度調整**: [最短ジョブ優先](/algorithms/shortest-job-first)や[優先度スケジューリング](/algorithms/priority-scheduling)が必要とする「実行時間の予測」や「手動での優先度設定」を一切必要とせず、プロセスの実際の振る舞い(タイムスライスを使い切るかどうか)だけから、対話的なプロセスと計算集約的なプロセスを自動的に区別できる——これがこの方式の最大の実用的価値である
- **飢餓への対策とエイジング**: 低いレベルに沈んだプロセスがいつまでも上位レベルのプロセスに邪魔されて実行されない飢餓を防ぐため、[優先度スケジューリング](/algorithms/priority-scheduling)と同様のエイジング(一定時間ごとに全プロセスを最高優先度レベルへ引き上げる、といった処置)が組み合わされることが多い
- **パラメータ調整の複雑さ**: レベル数、各レベルのタイムスライス長、昇格・降格の条件など、調整すべきパラメータが多く、これらの設計次第でシステム全体の応答性・公平性のバランスが変わる——「事前情報が不要」という利点と引き換えに、システム設計者はこれらのパラメータチューニングという別の複雑さを引き受けることになる
- **使いどころ**: Windows、Linux、macOSといった現代の汎用OSのCPUスケジューラの基本設計、対話的なデスクトップ環境とバックグラウンドのバッチ処理が混在する典型的な計算環境

## 実装例

複数レベルのキューを持つスケジューラをシミュレートし、タイムスライスを使い切ったプロセスが降格され、短いバースト時間で完了するプロセスは降格されないことを検証する。

```python
class Process:
    def __init__(self, pid: str, burst: int):
        self.pid = pid
        self.remaining = burst


def run_mlfq(processes: list[Process], time_slices: list[int]) -> list[tuple[str, int, int]]:
    """マルチレベルフィードバックキューのシミュレーション。
    各レベルのタイムスライスに従って実行し、使い切ったら1つ下のレベルへ降格する。
    戻り値: (プロセスID, 実行したレベル, そのスライスでの実行時間) のログ。
    """
    queues: list[list[Process]] = [[] for _ in time_slices]
    for p in processes:
        queues[0].append(p)

    log: list[tuple[str, int, int]] = []
    max_level = len(time_slices) - 1

    while any(queues):
        level = next(i for i, q in enumerate(queues) if q)
        proc = queues[level].pop(0)
        slice_len = time_slices[level]
        run_time = min(slice_len, proc.remaining)
        proc.remaining -= run_time
        log.append((proc.pid, level, run_time))

        if proc.remaining > 0:
            if run_time >= slice_len and level < max_level:
                queues[level + 1].append(proc)  # タイムスライスを使い切った: 降格
            else:
                queues[level].append(proc)
        # remaining == 0 -> 完了、どのキューにも戻さない
    return log
```

```typescript
class MLFQProcess {
  pid: string;
  remaining: number;
  constructor(pid: string, burst: number) {
    this.pid = pid;
    this.remaining = burst;
  }
}

function runMlfq(processes: MLFQProcess[], timeSlices: number[]): [string, number, number][] {
  const queues: MLFQProcess[][] = timeSlices.map(() => []);
  for (const p of processes) queues[0].push(p);
  const log: [string, number, number][] = [];
  const maxLevel = timeSlices.length - 1;

  while (queues.some((q) => q.length)) {
    const level = queues.findIndex((q) => q.length);
    const proc = queues[level].shift()!;
    const sliceLen = timeSlices[level];
    const runTime = Math.min(sliceLen, proc.remaining);
    proc.remaining -= runTime;
    log.push([proc.pid, level, runTime]);

    if (proc.remaining > 0) {
      if (runTime >= sliceLen && level < maxLevel) {
        queues[level + 1].push(proc); // タイムスライスを使い切った: 降格
      } else {
        queues[level].push(proc);
      }
    }
  }
  return log;
}
```

```cpp
#include <string>
#include <vector>
#include <tuple>
#include <algorithm>

struct MlfqProcess {
    std::string pid;
    int remaining;
};

std::vector<std::tuple<std::string, int, int>> runMlfq(std::vector<MlfqProcess> processes,
                                                         const std::vector<int>& timeSlices) {
    std::vector<std::vector<MlfqProcess>> queues(timeSlices.size());
    for (auto& p : processes) queues[0].push_back(p);

    std::vector<std::tuple<std::string, int, int>> log;
    int maxLevel = static_cast<int>(timeSlices.size()) - 1;

    auto anyNonEmpty = [&]() {
        for (auto& q : queues) if (!q.empty()) return true;
        return false;
    };

    while (anyNonEmpty()) {
        int level = 0;
        while (queues[level].empty()) level++;
        MlfqProcess proc = queues[level].front();
        queues[level].erase(queues[level].begin());

        int sliceLen = timeSlices[level];
        int runTime = std::min(sliceLen, proc.remaining);
        proc.remaining -= runTime;
        log.push_back({proc.pid, level, runTime});

        if (proc.remaining > 0) {
            if (runTime >= sliceLen && level < maxLevel) {
                queues[level + 1].push_back(proc);  // タイムスライスを使い切った: 降格
            } else {
                queues[level].push_back(proc);
            }
        }
    }
    return log;
}
```

```rust
struct MlfqProcess {
    pid: String,
    remaining: i32,
}

fn run_mlfq(processes: Vec<MlfqProcess>, time_slices: &[i32]) -> Vec<(String, usize, i32)> {
    let mut queues: Vec<Vec<MlfqProcess>> = time_slices.iter().map(|_| Vec::new()).collect();
    for p in processes {
        queues[0].push(p);
    }
    let mut log = Vec::new();
    let max_level = time_slices.len() - 1;

    loop {
        let level_opt = queues.iter().position(|q| !q.is_empty());
        let level = match level_opt {
            Some(l) => l,
            None => break,
        };
        let mut proc = queues[level].remove(0);
        let slice_len = time_slices[level];
        let run_time = slice_len.min(proc.remaining);
        proc.remaining -= run_time;
        log.push((proc.pid.clone(), level, run_time));

        if proc.remaining > 0 {
            if run_time >= slice_len && level < max_level {
                queues[level + 1].push(proc); // タイムスライスを使い切った: 降格
            } else {
                queues[level].push(proc);
            }
        }
    }
    log
}
```

```csharp
class MlfqProcess
{
    public string Pid;
    public int Remaining;
    public MlfqProcess(string pid, int burst) { Pid = pid; Remaining = burst; }
}

static List<(string, int, int)> RunMlfq(List<MlfqProcess> processes, List<int> timeSlices)
{
    var queues = timeSlices.Select(_ => new List<MlfqProcess>()).ToList();
    foreach (var p in processes) queues[0].Add(p);
    var log = new List<(string, int, int)>();
    int maxLevel = timeSlices.Count - 1;

    while (queues.Any(q => q.Count > 0))
    {
        int level = queues.FindIndex(q => q.Count > 0);
        var proc = queues[level][0];
        queues[level].RemoveAt(0);
        int sliceLen = timeSlices[level];
        int runTime = Math.Min(sliceLen, proc.Remaining);
        proc.Remaining -= runTime;
        log.Add((proc.Pid, level, runTime));

        if (proc.Remaining > 0)
        {
            if (runTime >= sliceLen && level < maxLevel) queues[level + 1].Add(proc); // 降格
            else queues[level].Add(proc);
        }
    }
    return log;
}
```
