---
name: 最早期限順(EDF)スケジューリング
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(log n)(優先度キューでの挿入・取り出し、n待機タスク数)
summary: 締め切りが最も近いタスクを常に最優先で実行することで、動的な優先度スケジューリングとしては理論上最も多くのタスクを締め切り内に処理できる、リアルタイムシステムの基幹アルゴリズム。
---

## 概要

自動運転車のブレーキ制御や産業ロボットの動作制御のようなリアルタイムシステムでは、「速く処理すること」よりも「決められた締め切り(デッドライン)までに必ず処理を終えること」が本質的に重要になる。最早期限順(EDF)スケジューリングは、各タスクに与えられた締め切りが最も近いものから優先的に実行するという、直感的でありながら理論的に強力な性質を持つスケジューリング方式である。1973年にリューとレイランドが発表した理論的な結果により、動的な優先度付け(実行のたびに優先度を再評価する方式)の中では、EDFが締め切りを守れるタスクの割合を理論的に最大化することが証明されている。

## 仕組み

1. 各タスクには、到着時刻・実行に必要な時間・締め切り(デッドライン)の3つの情報が与えられる
2. 全ての待機タスクを、締め切りの近い順に並べた優先度キューで管理する
3. CPUが空くたび(またはプリエンプティブに、新しいタスクが到着するたび)、キューの中で締め切りが最も近いタスクを選んで実行する
4. 新しいタスクが到着し、その締め切りが現在実行中のタスクの締め切りより近ければ、実行中のタスクを中断して新しいタスクに切り替える(動的優先度: [優先度スケジューリング](/algorithms/priority-scheduling)の固定優先度とは異なり、時間の経過とともに「締め切りまでの残り時間」という優先度の基準そのものが変化し続ける)
5. スケジュール可能性(全タスクが本当に締め切りに間に合うか)は、各タスクのCPU利用率(実行時間/周期)の合計が1(CPU使用率100%)を超えないかという単純な条件でおおよそ判定できる、というのがEDFの理論の実用上の強みである

## 特性・トレードオフ

- **計算量**: 優先度キューの操作として`O(log n)`。実装自体は[優先度スケジューリング](/algorithms/priority-scheduling)とほぼ同じ枠組みで実現できる
- **理論的な最適性**: 単一プロセッサ上で動的優先度スケジューリングを行う場合、CPU利用率が100%以下に収まるタスク集合であれば、EDFは必ず全てのタスクを締め切り内に完了できることが数学的に証明されている——これは動的優先度方式の中では最も強い理論的保証であり、リアルタイムシステム理論における重要な結果になっている
- **過負荷時の予測困難な崩壊**: CPU利用率が100%を超えてしまう(そもそも全タスクを間に合わせることが不可能な)過負荷状態になると、EDFはどのタスクが締め切りに遅れるかを予測しにくい形で、複数のタスクが連鎖的に遅延する「ドミノ効果」を起こすことがある。固定優先度方式([優先度スケジューリング](/algorithms/priority-scheduling)を静的に適用する方式)は、過負荷時にどのタスクが犠牲になるかがより予測しやすいという対照的な利点を持つ
- **使いどころ**: リアルタイムオペレーティングシステムにおけるタスクスケジューリング(航空機の制御システム、産業用ロボット制御)、ネットワークのパケットスケジューリング(締め切りのあるストリーミングデータの配信保証)、マルチメディア処理における一定のフレームレート保証

## 実装例

```python
def edf_schedule(tasks: list[dict], horizon: int) -> list[str | None]:
    remaining = {t["id"]: t["burst"] for t in tasks}
    timeline: list[str | None] = []
    for now in range(horizon):
        available = [t for t in tasks if t["arrival"] <= now and remaining[t["id"]] > 0]
        if not available:
            timeline.append(None)
            continue
        current = min(available, key=lambda t: t["deadline"])
        remaining[current["id"]] -= 1
        timeline.append(current["id"])
    return timeline
```

```typescript
interface Task {
  id: string;
  arrival: number;
  burst: number;
  deadline: number;
}

function edfSchedule(tasks: Task[], horizon: number): (string | null)[] {
  const remaining = new Map(tasks.map((t) => [t.id, t.burst]));
  const timeline: (string | null)[] = [];
  for (let now = 0; now < horizon; now++) {
    const available = tasks.filter((t) => t.arrival <= now && (remaining.get(t.id) ?? 0) > 0);
    if (available.length === 0) {
      timeline.push(null);
      continue;
    }
    const current = available.reduce((a, b) => (b.deadline < a.deadline ? b : a));
    remaining.set(current.id, (remaining.get(current.id) ?? 0) - 1);
    timeline.push(current.id);
  }
  return timeline;
}
```

```cpp
#include <vector>
#include <string>
#include <optional>
#include <unordered_map>
#include <limits>

struct Task {
    std::string id;
    int arrival;
    int burst;
    int deadline;
};

std::vector<std::optional<std::string>> edfSchedule(const std::vector<Task>& tasks, int horizon) {
    std::unordered_map<std::string, int> remaining;
    for (const auto& t : tasks) remaining[t.id] = t.burst;

    std::vector<std::optional<std::string>> timeline;
    for (int now = 0; now < horizon; now++) {
        const Task* current = nullptr;
        int bestDeadline = std::numeric_limits<int>::max();
        for (const auto& t : tasks) {
            if (t.arrival <= now && remaining[t.id] > 0 && t.deadline < bestDeadline) {
                bestDeadline = t.deadline;
                current = &t;
            }
        }
        if (current == nullptr) {
            timeline.push_back(std::nullopt);
            continue;
        }
        remaining[current->id]--;
        timeline.push_back(current->id);
    }
    return timeline;
}
```

```rust
use std::collections::HashMap;

struct Task {
    id: &'static str,
    arrival: i32,
    burst: i32,
    deadline: i32,
}

fn edf_schedule(tasks: &[Task], horizon: i32) -> Vec<Option<&'static str>> {
    let mut remaining: HashMap<&str, i32> = tasks.iter().map(|t| (t.id, t.burst)).collect();
    let mut timeline = Vec::new();

    for now in 0..horizon {
        let current = tasks
            .iter()
            .filter(|t| t.arrival <= now && remaining[t.id] > 0)
            .min_by_key(|t| t.deadline);

        match current {
            Some(t) => {
                *remaining.get_mut(t.id).unwrap() -= 1;
                timeline.push(Some(t.id));
            }
            None => timeline.push(None),
        }
    }
    timeline
}
```

```csharp
using System.Linq;

class EdfTask
{
    public string Id = "";
    public int Arrival;
    public int Burst;
    public int Deadline;
}

static List<string?> EdfSchedule(List<EdfTask> tasks, int horizon)
{
    var remaining = tasks.ToDictionary(t => t.Id, t => t.Burst);
    var timeline = new List<string?>();

    for (int now = 0; now < horizon; now++)
    {
        var available = tasks.Where(t => t.Arrival <= now && remaining[t.Id] > 0).ToList();
        if (available.Count == 0)
        {
            timeline.Add(null);
            continue;
        }
        var current = available.OrderBy(t => t.Deadline).First();
        remaining[current.Id]--;
        timeline.Add(current.Id);
    }
    return timeline;
}
```
