---
name: クールダウン付きタスクスケジューラ(貪欲+優先度キュー)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log k)(nはタスク総数、kはタスクの種類数)
summary: 同じ種類のタスクを実行した後、一定時間(クールダウン)は同じ種類を再実行できないという制約のもとで、「残り件数が最も多い種類のタスクを常に優先する」貪欲法により、全タスクを終えるまでの最短時間を求める。
---

## 概要

CPUのタスクスケジューリングで、「同じ種類のタスクAを実行した後、`n`単位時間はタスクAを再度実行できない(クールダウン)」という制約があるとき、与えられた全タスクを実行し終えるための最短の総時間を求めたい。素朴に考えると、クールダウン制約をどう避けるかという組み合わせの問題に見えるが、**「その時点で残っている件数が最も多い種類のタスクを常に優先して実行する」**という貪欲な戦略を取ると、アイドル時間(何も実行できず待つしかない時間)を最小限に抑えられることが直感的にも証明的にも分かる。件数が多いタスクを先に消化しておくことで、後半になってそのタスクのクールダウンだけが足かせになる事態を避けられる、という発想である。

## 仕組み

1. 各タスクの種類ごとに、残りの実行回数を数え上げる
2. 残り実行回数を**優先度キュー(最大ヒープ)** で管理する(常に「残り件数が最も多い種類」を効率的に取り出せるようにする)
3. 各時間単位(サイクル)ごとに、以下を繰り返す:
   - 優先度キューから、残り件数が多い順に、クールダウン制約に違反しない範囲で最大`n+1`種類のタスクを選んで実行する(選んだ各タスクの残り件数を1減らす)
   - 選んだタスクのうち、まだ残り件数が0になっていないものは、クールダウン期間の管理リストに戻す(`n`単位時間後に再びキューに戻せるようにする)
   - このサイクルで実行できるタスクが1つもなければ(全てクールダウン中)、その時間はアイドル(何もしない)として消費する
4. 全タスクの残り件数が0になるまで3を繰り返し、消費した総時間(実行+アイドル)をカウントする
5. 実務ではこの過程をシミュレーションせずに、**「最も多い種類の件数`f_max`」と「同じ最大件数を持つ種類の数`n_max`」**から、直接式`max(タスク総数, (f_max - 1) × (n + 1) + n_max)`で最短時間を計算できることが知られている(最も件数の多いタスクを軸に、クールダウン期間を他の種類のタスクで埋めていくと考えると導出できる)

## 特性・トレードオフ

- **「最も残りが多いものを優先する」という貪欲原則の直感的な正しさ**: 件数の多いタスクを後回しにすると、終盤にそのタスクのクールダウン待ちだけがボトルネックになり、全体のアイドル時間が増えてしまう。逆に早めに消化しておけば、他の種類のタスクをクールダウン期間の「穴埋め」として活用でき、アイドル時間を最小化できる、という直感が、実際に最適性の証明の骨子になっている
- **シミュレーションと閉じた式の2通りのアプローチ**: 優先度キューを使ったシミュレーションはO(n log k)で正確に最短時間(および実際のスケジュール順序)を求められるが、「最短時間の値だけ」が欲しい場合は、最頻タスクの件数から直接計算する閉じた式の方がO(n)(タスクの集計だけ)で済み、より効率的である。同じ問題に対して「具体的な解を構成する貪欲法」と「答えの値だけを求める数式」の両方が存在する好例である
- **クールダウン制約という現実的なモデリング**: CPUのキャッシュ切り替えコスト、API呼び出しのレート制限、ゲームのスキルクールダウンのように、「同じ種類の行動を連続して行えない」という制約は実務でも頻出するパターンであり、この問題はそうした制約下での最適なスケジューリングを考える基本的な題材になっている
- **使いどころ**: CPU/GPUのタスクスケジューリング、APIレート制限下でのリクエストスケジューリング、ゲームにおけるスキル・アビリティのクールダウン管理と行動計画、[優先順位付き掃引法](/algorithms/prioritized-sweeping)のような優先度キューベースのアルゴリズム設計の教育的な題材

## 実装例

```python
from collections import Counter
import heapq

def task_scheduler_min_time(tasks: list[str], n: int) -> int:
    counts = list(Counter(tasks).values())
    max_count = max(counts)
    num_with_max = counts.count(max_count)

    # 最も多い種類を軸に、クールダウン期間を他のタスクで埋める場合の下限
    formula_result = (max_count - 1) * (n + 1) + num_with_max
    return max(len(tasks), formula_result)

def task_scheduler_simulation(tasks: list[str], n: int) -> int:
    counts = Counter(tasks)
    heap = [-c for c in counts.values()]
    heapq.heapify(heap)

    time = 0
    while heap:
        cooling: list[tuple[int, int]] = []
        cycle_used = 0
        for _ in range(n + 1):
            if heap:
                cnt = -heapq.heappop(heap)
                cnt -= 1
                if cnt > 0:
                    cooling.append((cnt, time))
                cycle_used += 1
            time += 1
            if not heap and not cooling:
                break
        for cnt, _ in cooling:
            heapq.heappush(heap, -cnt)

    return time
```

```typescript
function taskSchedulerMinTime(tasks: string[], n: number): number {
  const counts = new Map<string, number>();
  for (const t of tasks) counts.set(t, (counts.get(t) ?? 0) + 1);

  const values = [...counts.values()];
  const maxCount = Math.max(...values);
  const numWithMax = values.filter((c) => c === maxCount).length;

  const formulaResult = (maxCount - 1) * (n + 1) + numWithMax;
  return Math.max(tasks.length, formulaResult);
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>

int taskSchedulerMinTime(const std::vector<std::string>& tasks, int n) {
    std::unordered_map<std::string, int> counts;
    for (auto& t : tasks) counts[t]++;

    int maxCount = 0;
    for (auto& [k, v] : counts) maxCount = std::max(maxCount, v);

    int numWithMax = 0;
    for (auto& [k, v] : counts) if (v == maxCount) numWithMax++;

    int formulaResult = (maxCount - 1) * (n + 1) + numWithMax;
    return std::max(static_cast<int>(tasks.size()), formulaResult);
}
```

```rust
use std::collections::HashMap;

fn task_scheduler_min_time(tasks: &[String], n: i32) -> i32 {
    let mut counts: HashMap<&String, i32> = HashMap::new();
    for t in tasks {
        *counts.entry(t).or_insert(0) += 1;
    }

    let max_count = *counts.values().max().unwrap();
    let num_with_max = counts.values().filter(|&&c| c == max_count).count() as i32;

    let formula_result = (max_count - 1) * (n + 1) + num_with_max;
    formula_result.max(tasks.len() as i32)
}
```

```csharp
static int TaskSchedulerMinTime(List<string> tasks, int n)
{
    var counts = new Dictionary<string, int>();
    foreach (var t in tasks) counts[t] = counts.GetValueOrDefault(t) + 1;

    int maxCount = counts.Values.Max();
    int numWithMax = counts.Values.Count(v => v == maxCount);

    int formulaResult = (maxCount - 1) * (n + 1) + numWithMax;
    return Math.Max(tasks.Count, formulaResult);
}
```
