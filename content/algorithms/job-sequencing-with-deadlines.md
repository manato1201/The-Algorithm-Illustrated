---
name: 締切付きジョブスケジューリング(Job Sequencing with Deadlines)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n²)(素朴な実装)、O(n log n)(Union-Findによる高速化)
summary: 各ジョブに締切と利益が設定されているとき、それぞれ1単位時間かかるジョブを締切内に実行して総利益を最大化する問題で、利益の高い順に貪欲に選び、Union-Findで割り当て可能な最も遅いスロットを高速に探す組み合わせが有効。
---

## 概要

`n`個のジョブがあり、それぞれが完了までに1単位時間かかり、締切`deadline[i]`(このジョブはこの時刻までに完了しなければならない)と、完了させた場合に得られる利益`profit[i]`が設定されている。使える時間スロットには限りがあり(締切に間に合うスロットしか使えない)、全てのジョブを実行できるとは限らないとき、実行するジョブの組み合わせを選んで総利益を最大化したい。この問題は、利益の高いジョブから順に貪欲に選び、そのジョブの締切以前で使用可能な**最も遅い**スロットに割り当てるという、直感的で証明可能な貪欲戦略で最適解が得られる、貪欲法とデータ構造(Union-Find)を組み合わせる好例としても知られている。

## 仕組み

1. 全ジョブを利益の降順にソートする
2. 利益の高いジョブから順に処理する。各ジョブについて、そのジョブの締切`deadline[i]`以前のスロットの中で、まだ空いている最も遅い(締切に近い)スロットを探す
3. 空きスロットが見つかれば、そのジョブをそのスロットに割り当て利益に加算する。見つからなければ(締切までの全スロットが既に埋まっている)、そのジョブは実行を諦める
4. **なぜ「最も遅い」空きスロットを選ぶのか**: あるジョブを早いスロットに割り当ててしまうと、締切がより厳しい別の(まだ処理していない、利益が低いために後回しになる)ジョブがそのスロットを使えたはずの機会を潰してしまう。締切内で最も遅いスロットに割り当てておけば、より早いスロットは締切のより厳しい他のジョブのために温存される
5. **高速化**: 空きスロットの探索を毎回線形にスキャンすると`O(n²)`だが、[Union-Find(素集合データ構造)](/algorithms/union-find)を使い、「あるスロットが埋まったら、そのスロットの`find`結果を1つ前の空きスロットへ繋ぎ変える」という工夫をすることで、各ジョブの空きスロット探索がほぼ定数時間になり、全体を`O(n log n)`(ソートが支配的)まで高速化できる

## 特性・トレードオフ

- **計算量**: ソートに`O(n log n)`、素朴なスロット探索を使うと全体で`O(n²)`(スロット数が最大`n`のため)。[Union-Find](/algorithms/union-find)による高速化を使えば経路圧縮込みでほぼ`O(n log n)`(ソートが支配的)に改善できる
- **貪欲選択の正当性**: 利益の高い順に選び、かつ各ジョブを「割り当て可能な最も遅いスロット」に置くという2つの貪欲判断の組み合わせが最適性を保証する——交換論法により、利益の高いジョブを後回しにしたり、より早いスロットに割り当てたりする解は、常に今回の貪欲戦略の解以下の利益しか得られないことが示せる
- **[Union-Find](/algorithms/union-find)を貪欲法の高速化に応用する好例**: 一見グラフの連結性判定のためのデータ構造に見える[Union-Find](/algorithms/union-find)が、「使用可能な最大のスロット番号を素早く見つける」という全く異なる目的にも応用できる点は、データ構造の汎用性を示す興味深い応用例になっている
- **使いどころ**: 締切のあるタスクの優先度スケジューリング、CPUの単一プロセッサジョブスケジューリング、広告枠のような限られた時間スロットへの入札案件の割り当て最適化

## 実装例

```python
def job_sequencing(jobs: list[tuple[str, int, int]]) -> tuple[list[str], int]:
    """jobs: (id, deadline, profit) のリスト。利益降順に処理し、締切以前の最も遅い空きスロットに割り当てる"""
    jobs_sorted = sorted(jobs, key=lambda j: j[2], reverse=True)
    max_deadline = max(j[1] for j in jobs) if jobs else 0
    slots: list[str | None] = [None] * (max_deadline + 1)  # 1-indexed、slots[0]は未使用
    total_profit = 0
    scheduled = []
    for job_id, deadline, profit in jobs_sorted:
        for slot in range(min(deadline, max_deadline), 0, -1):
            if slots[slot] is None:
                slots[slot] = job_id
                total_profit += profit
                scheduled.append(job_id)
                break
    return scheduled, total_profit
```

```typescript
type Job = [string, number, number]; // id, deadline, profit

function jobSequencing(jobs: Job[]): { scheduled: string[]; totalProfit: number } {
  const sorted = [...jobs].sort((a, b) => b[2] - a[2]);
  const maxDeadline = Math.max(...jobs.map((j) => j[1]));
  const slots: (string | null)[] = new Array(maxDeadline + 1).fill(null);
  let totalProfit = 0;
  const scheduled: string[] = [];
  for (const [id, deadline, profit] of sorted) {
    for (let slot = Math.min(deadline, maxDeadline); slot > 0; slot--) {
      if (slots[slot] === null) {
        slots[slot] = id;
        totalProfit += profit;
        scheduled.push(id);
        break;
      }
    }
  }
  return { scheduled, totalProfit };
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>
#include <tuple>
#include <optional>

struct Job { std::string id; int deadline; int profit; };

std::pair<std::vector<std::string>, int> jobSequencing(std::vector<Job> jobs) {
    std::sort(jobs.begin(), jobs.end(), [](const Job& a, const Job& b) { return a.profit > b.profit; });
    int maxDeadline = 0;
    for (const auto& j : jobs) maxDeadline = std::max(maxDeadline, j.deadline);
    std::vector<std::optional<std::string>> slots(maxDeadline + 1);
    int totalProfit = 0;
    std::vector<std::string> scheduled;
    for (const auto& job : jobs) {
        for (int slot = std::min(job.deadline, maxDeadline); slot > 0; slot--) {
            if (!slots[slot].has_value()) {
                slots[slot] = job.id;
                totalProfit += job.profit;
                scheduled.push_back(job.id);
                break;
            }
        }
    }
    return {scheduled, totalProfit};
}
```

```rust
struct Job {
    id: String,
    deadline: usize,
    profit: i32,
}

fn job_sequencing(jobs: &[Job]) -> (Vec<String>, i32) {
    let mut sorted: Vec<&Job> = jobs.iter().collect();
    sorted.sort_by(|a, b| b.profit.cmp(&a.profit));
    let max_deadline = jobs.iter().map(|j| j.deadline).max().unwrap_or(0);
    let mut slots: Vec<Option<String>> = vec![None; max_deadline + 1];
    let mut total_profit = 0;
    let mut scheduled = Vec::new();
    for job in sorted {
        let mut slot = job.deadline.min(max_deadline);
        while slot > 0 {
            if slots[slot].is_none() {
                slots[slot] = Some(job.id.clone());
                total_profit += job.profit;
                scheduled.push(job.id.clone());
                break;
            }
            slot -= 1;
        }
    }
    (scheduled, total_profit)
}
```

```csharp
static (List<string> scheduled, int totalProfit) JobSequencing(List<(string id, int deadline, int profit)> jobs)
{
    var sorted = jobs.OrderByDescending(j => j.profit).ToList();
    int maxDeadline = jobs.Max(j => j.deadline);
    var slots = new string?[maxDeadline + 1];
    int totalProfit = 0;
    var scheduled = new List<string>();
    foreach (var (id, deadline, profit) in sorted)
    {
        for (int slot = Math.Min(deadline, maxDeadline); slot > 0; slot--)
        {
            if (slots[slot] == null)
            {
                slots[slot] = id;
                totalProfit += profit;
                scheduled.Add(id);
                break;
            }
        }
    }
    return (scheduled, totalProfit);
}
```
