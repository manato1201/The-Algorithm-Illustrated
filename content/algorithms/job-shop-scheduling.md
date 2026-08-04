---
name: ジョブショップスケジューリング
category: スケジューリング
subcategory: タスク・ジョブスケジューリング
complexity: O(n!)(厳密解、n作業数)、ヒューリスティックはO(n log n)程度
summary: 複数の機械を経由する複数のジョブの処理順序を決め、全ジョブが完了するまでの総所要時間(メイクスパン)を最小化する、製造業の生産計画で古くから研究される組合せ最適化問題。
---

## 概要

工場で複数の製品(ジョブ)を製造する際、各ジョブは複数の工程(機械での処理)を決まった順序で経なければならず、複数のジョブが同じ機械を取り合う。ジョブショップスケジューリングは、「各機械がどのジョブをどの順番で処理すれば、全てのジョブが完了するまでの総時間(メイクスパン)を最小化できるか」を決める、製造業のオペレーションズリサーチにおいて最も古典的かつ難解な組合せ最適化問題のひとつである。[CPUスケジューリング](/algorithms/round-robin-scheduling)が単一の資源(CPU)を対象にするのに対し、この問題は複数の資源(機械)と、ジョブごとに異なる処理順序の制約が絡み合う、より複雑な構造を持つ。

## 仕組み

1. `n`個のジョブと`m`台の機械があり、各ジョブは特定の順序で特定の機械を通過する必要がある(ジョブごとに機械の順序が異なってよい、というのがジョブショップの特徴——全ジョブが同じ順序を通る「フローショップ」というより単純な特殊ケースもある)
2. 厳密な最適解は、各機械での各ジョブの処理順序という組み合わせを全て試す必要があり、この問題は一般に[NP困難](/algorithms/branch-and-bound)であることが知られている。小規模な問題であれば、[分枝限定法](/algorithms/branch-and-bound)のような厳密探索で最適解を求められる
3. 実用上の規模の問題には、ディスパッチングルール(各機械が空いたとき、待っているジョブの中からどれを選ぶかの単純なルール、例えば「最も処理時間が短いジョブを優先する」([最短ジョブ優先](/algorithms/shortest-job-first)と同じ発想)、「残りの工程数が多いジョブを優先する」等)によるヒューリスティックがよく使われる
4. より高度なアプローチとして、[遺伝的アルゴリズム](/algorithms/genetic-algorithm)や[焼きなまし法](/algorithms/simulated-annealing)のようなメタヒューリスティックで、ジョブの処理順序の組み合わせ空間を探索し、局所最適に陥りにくい良質な解を探すことも広く行われる
5. どのアプローチでも、得られた処理順序をガントチャート(各機械が時間軸上でどのジョブをいつ処理するかを表す図)として可視化し、実際の生産計画に落とし込む

## 特性・トレードオフ

- **計算量**: 厳密な最適解の探索は組み合わせ爆発するため、実用規模では現実的ではない。実務ではヒューリスティック(高速だが最適性の保証はない)かメタヒューリスティック(時間をかければより良い解に近づくが、依然として最適性の保証はない)が主流になる
- **フローショップとの違い**: 全ジョブが同じ順序で機械を通過する「フローショップ」問題は、ジョブショップよりも構造が単純で、限定的なケース([ジョンソンのアルゴリズム](/algorithms/johnson)による2機械フローショップの厳密解法等)では効率的な厳密解法が存在するが、ジョブショップ一般には成り立たない
- **NP困難性という理論的な壁**: 3台以上の機械が絡むジョブショップスケジューリングは一般にNP困難であり、問題規模が大きくなると厳密な最適解を求めること自体が計算量的に非現実的になる——実務での意思決定は、常に「最適解」ではなく「十分によい解を、実用的な時間内に」という現実的な妥協のもとで行われる
- **使いどころ**: 製造業の生産スケジューリング(部品加工工場、半導体製造)、プロジェクト管理における複数タスク・複数リソースの割り当て、クラウドコンピューティングにおける複数ジョブの複数サーバーへの割り当て

## 実装例

以下は「最短処理時間優先(SPT)」ディスパッチングルールで各ジョブの次の工程を貪欲にスケジューリングし、メイクスパン(全ジョブの完了時刻の最大値)を求める実装。

```python
def schedule_job_shop(jobs: list[list[tuple[int, int]]]) -> tuple[list[tuple[int, int, int, int]], int]:
    """jobs[j] は job j が経由する (machine, duration) の順序付きリスト"""
    n_jobs = len(jobs)
    n_machines = max(machine for job in jobs for machine, _ in job) + 1

    job_op_index = [0] * n_jobs      # jobごとに次に処理すべき工程のインデックス
    job_ready_time = [0] * n_jobs    # jobが次の工程に着手可能になる時刻
    machine_ready_time = [0] * n_machines

    remaining_ops = sum(len(job) for job in jobs)
    schedule: list[tuple[int, int, int, int]] = []  # (job, machine, start, end)

    while remaining_ops > 0:
        candidates = [j for j in range(n_jobs) if job_op_index[j] < len(jobs[j])]
        # SPTルール: 次の工程の処理時間が最短のジョブを優先する
        best = None
        for j in candidates:
            machine, duration = jobs[j][job_op_index[j]]
            start = max(job_ready_time[j], machine_ready_time[machine])
            key = (duration, start, j)
            if best is None or key < best[0]:
                best = (key, j, machine, duration, start)
        _, j, machine, duration, start = best
        end = start + duration
        schedule.append((j, machine, start, end))
        job_ready_time[j] = end
        machine_ready_time[machine] = end
        job_op_index[j] += 1
        remaining_ops -= 1

    makespan = max(e for (_, _, _, e) in schedule)
    return schedule, makespan
```

```typescript
type Op = [number, number]; // machine, duration

function scheduleJobShop(jobs: Op[][]): { schedule: [number, number, number, number][]; makespan: number } {
  const nJobs = jobs.length;
  const nMachines = Math.max(...jobs.flatMap((job) => job.map((op) => op[0]))) + 1;

  const jobOpIndex = new Array(nJobs).fill(0);
  const jobReadyTime = new Array(nJobs).fill(0);
  const machineReadyTime = new Array(nMachines).fill(0);

  let remainingOps = jobs.reduce((s, j) => s + j.length, 0);
  const schedule: [number, number, number, number][] = [];

  while (remainingOps > 0) {
    const candidates: number[] = [];
    for (let j = 0; j < nJobs; j++) if (jobOpIndex[j] < jobs[j].length) candidates.push(j);

    let bestKey: [number, number, number] | null = null;
    let bestJ = -1,
      bestMachine = -1,
      bestDuration = -1,
      bestStart = -1;
    for (const j of candidates) {
      const [machine, duration] = jobs[j][jobOpIndex[j]];
      const start = Math.max(jobReadyTime[j], machineReadyTime[machine]);
      const key: [number, number, number] = [duration, start, j];
      if (
        bestKey === null ||
        key[0] < bestKey[0] ||
        (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))
      ) {
        bestKey = key;
        bestJ = j;
        bestMachine = machine;
        bestDuration = duration;
        bestStart = start;
      }
    }
    const end = bestStart + bestDuration;
    schedule.push([bestJ, bestMachine, bestStart, end]);
    jobReadyTime[bestJ] = end;
    machineReadyTime[bestMachine] = end;
    jobOpIndex[bestJ]++;
    remainingOps--;
  }

  const makespan = Math.max(...schedule.map((s) => s[3]));
  return { schedule, makespan };
}
```

```cpp
#include <vector>
#include <algorithm>
#include <tuple>
#include <limits>

using Op = std::pair<int, int>; // machine, duration
using ScheduleEntry = std::tuple<int, int, int, int>; // job, machine, start, end

std::pair<std::vector<ScheduleEntry>, int> scheduleJobShop(const std::vector<std::vector<Op>>& jobs) {
    int nJobs = static_cast<int>(jobs.size());
    int nMachines = 0;
    for (const auto& job : jobs)
        for (const auto& op : job) nMachines = std::max(nMachines, op.first + 1);

    std::vector<int> jobOpIndex(nJobs, 0);
    std::vector<int> jobReadyTime(nJobs, 0);
    std::vector<int> machineReadyTime(nMachines, 0);

    int remainingOps = 0;
    for (const auto& job : jobs) remainingOps += static_cast<int>(job.size());
    std::vector<ScheduleEntry> schedule;

    while (remainingOps > 0) {
        int bestJ = -1, bestMachine = -1, bestDuration = -1, bestStart = -1;
        std::tuple<int, int, int> bestKey{std::numeric_limits<int>::max(), 0, 0};
        bool found = false;
        for (int j = 0; j < nJobs; j++) {
            if (jobOpIndex[j] >= static_cast<int>(jobs[j].size())) continue;
            auto [machine, duration] = jobs[j][jobOpIndex[j]];
            int start = std::max(jobReadyTime[j], machineReadyTime[machine]);
            std::tuple<int, int, int> key{duration, start, j};
            if (!found || key < bestKey) {
                found = true;
                bestKey = key;
                bestJ = j; bestMachine = machine; bestDuration = duration; bestStart = start;
            }
        }
        int end = bestStart + bestDuration;
        schedule.emplace_back(bestJ, bestMachine, bestStart, end);
        jobReadyTime[bestJ] = end;
        machineReadyTime[bestMachine] = end;
        jobOpIndex[bestJ]++;
        remainingOps--;
    }

    int makespan = 0;
    for (const auto& [j, m, s, e] : schedule) makespan = std::max(makespan, e);
    return {schedule, makespan};
}
```

```rust
type Op = (usize, i64); // machine, duration
type ScheduleEntry = (usize, usize, i64, i64); // job, machine, start, end

fn schedule_job_shop(jobs: &[Vec<Op>]) -> (Vec<ScheduleEntry>, i64) {
    let n_jobs = jobs.len();
    let n_machines = jobs.iter().flatten().map(|op| op.0).max().unwrap_or(0) + 1;

    let mut job_op_index = vec![0usize; n_jobs];
    let mut job_ready_time = vec![0i64; n_jobs];
    let mut machine_ready_time = vec![0i64; n_machines];

    let mut remaining_ops: usize = jobs.iter().map(|j| j.len()).sum();
    let mut schedule: Vec<ScheduleEntry> = Vec::new();

    while remaining_ops > 0 {
        // (duration, start, job) の辞書式順序が最小のものをSPTルールで選ぶ
        let mut best_key: Option<(i64, i64, usize)> = None;
        let mut best_machine = 0usize;
        for j in 0..n_jobs {
            if job_op_index[j] >= jobs[j].len() {
                continue;
            }
            let (machine, duration) = jobs[j][job_op_index[j]];
            let start = job_ready_time[j].max(machine_ready_time[machine]);
            let key = (duration, start, j);
            if best_key.is_none() || key < best_key.unwrap() {
                best_key = Some(key);
                best_machine = machine;
            }
        }
        let (duration, start, j) = best_key.unwrap();
        let machine = best_machine;
        let end = start + duration;
        schedule.push((j, machine, start, end));
        job_ready_time[j] = end;
        machine_ready_time[machine] = end;
        job_op_index[j] += 1;
        remaining_ops -= 1;
    }

    let makespan = schedule.iter().map(|&(_, _, _, e)| e).max().unwrap_or(0);
    (schedule, makespan)
}
```

```csharp
static (List<(int job, int machine, int start, int end)> schedule, int makespan) ScheduleJobShop(List<List<(int machine, int duration)>> jobs)
{
    int nJobs = jobs.Count;
    int nMachines = jobs.SelectMany(j => j).Max(op => op.machine) + 1;
    var jobOpIndex = new int[nJobs];
    var jobReadyTime = new int[nJobs];
    var machineReadyTime = new int[nMachines];
    int remainingOps = jobs.Sum(j => j.Count);
    var schedule = new List<(int, int, int, int)>();

    while (remainingOps > 0)
    {
        var candidates = Enumerable.Range(0, nJobs).Where(j => jobOpIndex[j] < jobs[j].Count).ToList();
        int bestJ = -1, bestMachine = -1, bestDuration = -1, bestStart = -1;
        (int duration, int start, int j)? bestKey = null;
        foreach (var j in candidates)
        {
            var (machine, duration) = jobs[j][jobOpIndex[j]];
            int start = Math.Max(jobReadyTime[j], machineReadyTime[machine]);
            var key = (duration, start, j);
            if (bestKey == null || key.CompareTo(bestKey.Value) < 0)
            {
                bestKey = key;
                bestJ = j; bestMachine = machine; bestDuration = duration; bestStart = start;
            }
        }
        int end = bestStart + bestDuration;
        schedule.Add((bestJ, bestMachine, bestStart, end));
        jobReadyTime[bestJ] = end;
        machineReadyTime[bestMachine] = end;
        jobOpIndex[bestJ]++;
        remainingOps--;
    }
    int makespan = schedule.Max(s => s.Item4);
    return (schedule, makespan);
}
```
