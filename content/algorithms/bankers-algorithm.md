---
name: 銀行家のアルゴリズム(デッドロック回避)
category: スケジューリング
subcategory: タスク・ジョブスケジューリング
complexity: O(m×n²)(mは資源の種類数、nはプロセス数、1回の安全性判定)
summary: 銀行が融資を行う際に「全ての顧客に最終的に返済できる余力があるか」を事前に確認するのと同じ発想で、プロセスへの資源割り当てが将来デッドロック(お互いが資源待ちで固まる状態)を引き起こさないかを、割り当てを実行する前に毎回シミュレーションして確認するデッドロック回避アルゴリズム。
---

## 概要

複数のプロセスが複数種類の資源(メモリ、プリンタ、ロックなど)を要求し合う環境では、プロセスAが資源Xを持ちながら資源Yを待ち、プロセスBが資源Yを持ちながら資源Xを待つ、という循環的な待機状態(デッドロック)に陥る危険がある。1965年にエドガー・ダイクストラが発表した銀行家のアルゴリズムは、この問題を「銀行が顧客に融資する際、最悪のシナリオでも全顧客に返済できるだけの現金余力が常に確保されているか」を確認する銀行の与信管理になぞらえて解決する——各プロセスからの資源要求を、実際に割り当てる前に「もしこの要求を許可したら、その後も全プロセスが資源を得て完了できる道筋(安全な状態)が存在するか」をシミュレーションによって確認し、安全であることが確認できた要求だけを実際に許可する。

## 仕組み

1. 各プロセスについて、そのプロセスが将来必要とする可能性がある資源の最大量(最大要求量)を事前に宣言させておく。現在保有している資源量、システム全体で利用可能な資源量も管理する
2. あるプロセスから新たな資源要求が来たとき、まず「その要求が、そのプロセスの申告した最大要求量を超えていないか」「現在システムに利用可能な資源で賄えるか」を確認する
3. 賄える場合、実際に割り当てる前に、仮に割り当てたと仮定した状態から「安全性アルゴリズム」を実行する: 残りの利用可能資源で、最大要求量を完全に満たせるプロセスを探す。見つかれば、そのプロセスは完了して資源を全て解放するとみなし、その分だけ利用可能資源が増える。この「完了できるプロセスを見つけては資源を回収する」操作を繰り返す
4. 全てのプロセスがこの手順でいずれ完了できる順序(安全順序)が見つかれば、その状態は「安全」であり、最初の要求を実際に許可してよいと判断できる
5. 逆に、途中でどのプロセスも完了できない(全プロセスが不足分を待ったまま動けない)状態に至れば、それは「不安全」であり、元の要求は拒否(または要求元のプロセスを待たせる)して、デッドロックに陥りうる割り当てを未然に防ぐ

## 特性・トレードオフ

- **計算量**: 安全性アルゴリズム1回の実行は、資源の種類数`m`とプロセス数`n`に対して`O(m×n²)`(最悪の場合、各ラウンドで全プロセスを調べる必要があり、それを`n`ラウンド繰り返す)——資源要求のたびにこの判定を行うため、プロセス数・資源種類数が多いシステムでは無視できないオーバーヘッドになる
- **デッドロックの「回避」と「検出」の違い**: 銀行家のアルゴリズムは資源を実際に割り当てる**前**に安全性を確認する「事前回避」方式である。これは、デッドロックが実際に発生してから検出・復旧する「事後検出」方式とは根本的に異なるアプローチであり、デッドロックを未然に防げる代わりに、常に安全性判定のコストを払い続ける必要がある
- **各プロセスが事前に最大要求量を正確に申告する必要があるという現実的な制約**: このアルゴリズムは「各プロセスが将来必要とする資源の最大量を、実行前に正確に知っている」ことを前提としているが、実際のシステムでは多くのプロセスが自分の将来の資源需要を事前に正確には把握できない——この非現実的な前提が、銀行家のアルゴリズムが実際のオペレーティングシステムで純粋な形ではあまり採用されない主な理由になっている
- **保守的すぎる判定という代償**: 安全性アルゴリズムは「最悪のシナリオでも破綻しない」ことを保証しようとするため、実際には問題なく完了できたはずの要求まで「不安全」と判定して拒否してしまう(過度に保守的な)ことがある——安全性と資源利用効率のトレードオフを抱えている
- **使いどころ**: オペレーティングシステムの教育におけるデッドロック回避の代表的教材、資源の最大需要量が事前に正確に分かる限定的な組み込みシステム、データベースの分散トランザクション管理における資源ロックの安全性検証の理論的基盤

## 実装例

```python
def compute_need(max_demand: list[list[int]], allocation: list[list[int]]) -> list[list[int]]:
    return [
        [max_demand[i][j] - allocation[i][j] for j in range(len(allocation[0]))]
        for i in range(len(allocation))
    ]


def is_safe(
    available: list[int], allocation: list[list[int]], max_demand: list[list[int]]
) -> tuple[bool, list[int]]:
    n = len(allocation)
    m = len(available)
    need = compute_need(max_demand, allocation)
    work = available[:]
    finished = [False] * n
    safe_sequence = []

    changed = True
    while changed and len(safe_sequence) < n:
        changed = False
        for i in range(n):
            if finished[i]:
                continue
            if all(need[i][j] <= work[j] for j in range(m)):
                for j in range(m):
                    work[j] += allocation[i][j]
                finished[i] = True
                safe_sequence.append(i)
                changed = True

    if all(finished):
        return True, safe_sequence
    return False, []


def request_resources(
    pid: int,
    request: list[int],
    available: list[int],
    allocation: list[list[int]],
    max_demand: list[list[int]],
):
    need = compute_need(max_demand, allocation)
    m = len(available)
    if any(request[j] > need[pid][j] for j in range(m)):
        raise ValueError("申告した最大要求量を超えています")
    if any(request[j] > available[j] for j in range(m)):
        return False, available, allocation  # 現時点では割り当てられない

    new_available = available[:]
    new_allocation = [row[:] for row in allocation]
    for j in range(m):
        new_available[j] -= request[j]
        new_allocation[pid][j] += request[j]

    ok, _ = is_safe(new_available, new_allocation, max_demand)
    if ok:
        return True, new_available, new_allocation
    return False, available, allocation  # 不安全な状態になるため拒否
```

```typescript
function computeNeed(maxDemand: number[][], allocation: number[][]): number[][] {
  return allocation.map((row, i) => row.map((v, j) => maxDemand[i][j] - v));
}

function isSafe(
  available: number[],
  allocation: number[][],
  maxDemand: number[][]
): { safe: boolean; sequence: number[] } {
  const n = allocation.length;
  const m = available.length;
  const need = computeNeed(maxDemand, allocation);
  const work = available.slice();
  const finished = new Array(n).fill(false);
  const sequence: number[] = [];

  let changed = true;
  while (changed && sequence.length < n) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (finished[i]) continue;
      if (need[i].every((v, j) => v <= work[j])) {
        for (let j = 0; j < m; j++) work[j] += allocation[i][j];
        finished[i] = true;
        sequence.push(i);
        changed = true;
      }
    }
  }

  const allDone = finished.every((f) => f);
  return { safe: allDone, sequence: allDone ? sequence : [] };
}

function requestResources(
  pid: number,
  request: number[],
  available: number[],
  allocation: number[][],
  maxDemand: number[][]
): { granted: boolean; available: number[]; allocation: number[][] } {
  const need = computeNeed(maxDemand, allocation);
  const m = available.length;
  if (request.some((v, j) => v > need[pid][j])) {
    throw new Error("申告した最大要求量を超えています");
  }
  if (request.some((v, j) => v > available[j])) {
    return { granted: false, available, allocation };
  }

  const newAvailable = available.slice();
  const newAllocation = allocation.map((row) => row.slice());
  for (let j = 0; j < m; j++) {
    newAvailable[j] -= request[j];
    newAllocation[pid][j] += request[j];
  }

  const { safe } = isSafe(newAvailable, newAllocation, maxDemand);
  if (safe) return { granted: true, available: newAvailable, allocation: newAllocation };
  return { granted: false, available, allocation };
}
```

```cpp
#include <algorithm>
#include <stdexcept>
#include <vector>

std::vector<std::vector<int>> computeNeed(const std::vector<std::vector<int>>& maxDemand,
                                           const std::vector<std::vector<int>>& allocation) {
    size_t n = allocation.size(), m = allocation[0].size();
    std::vector<std::vector<int>> need(n, std::vector<int>(m));
    for (size_t i = 0; i < n; i++)
        for (size_t j = 0; j < m; j++) need[i][j] = maxDemand[i][j] - allocation[i][j];
    return need;
}

struct SafetyResult {
    bool safe;
    std::vector<int> sequence;
};

SafetyResult isSafe(const std::vector<int>& available, const std::vector<std::vector<int>>& allocation,
                     const std::vector<std::vector<int>>& maxDemand) {
    size_t n = allocation.size(), m = available.size();
    auto need = computeNeed(maxDemand, allocation);
    std::vector<int> work = available;
    std::vector<bool> finished(n, false);
    std::vector<int> sequence;

    bool changed = true;
    while (changed && sequence.size() < n) {
        changed = false;
        for (size_t i = 0; i < n; i++) {
            if (finished[i]) continue;
            bool ok = true;
            for (size_t j = 0; j < m; j++) {
                if (need[i][j] > work[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                for (size_t j = 0; j < m; j++) work[j] += allocation[i][j];
                finished[i] = true;
                sequence.push_back(static_cast<int>(i));
                changed = true;
            }
        }
    }

    bool allDone = std::all_of(finished.begin(), finished.end(), [](bool f) { return f; });
    return SafetyResult{allDone, allDone ? sequence : std::vector<int>{}};
}

struct RequestResult {
    bool granted;
    std::vector<int> available;
    std::vector<std::vector<int>> allocation;
};

RequestResult requestResources(int pid, const std::vector<int>& request, const std::vector<int>& available,
                                const std::vector<std::vector<int>>& allocation,
                                const std::vector<std::vector<int>>& maxDemand) {
    auto need = computeNeed(maxDemand, allocation);
    size_t m = available.size();
    for (size_t j = 0; j < m; j++) {
        if (request[j] > need[pid][j]) throw std::invalid_argument("申告した最大要求量を超えています");
    }
    for (size_t j = 0; j < m; j++) {
        if (request[j] > available[j]) return RequestResult{false, available, allocation};
    }

    std::vector<int> newAvailable = available;
    std::vector<std::vector<int>> newAllocation = allocation;
    for (size_t j = 0; j < m; j++) {
        newAvailable[j] -= request[j];
        newAllocation[pid][j] += request[j];
    }

    auto result = isSafe(newAvailable, newAllocation, maxDemand);
    if (result.safe) return RequestResult{true, newAvailable, newAllocation};
    return RequestResult{false, available, allocation};
}
```

```rust
fn compute_need(max_demand: &[Vec<i32>], allocation: &[Vec<i32>]) -> Vec<Vec<i32>> {
    allocation
        .iter()
        .enumerate()
        .map(|(i, row)| row.iter().enumerate().map(|(j, &v)| max_demand[i][j] - v).collect())
        .collect()
}

fn is_safe(available: &[i32], allocation: &[Vec<i32>], max_demand: &[Vec<i32>]) -> (bool, Vec<usize>) {
    let n = allocation.len();
    let m = available.len();
    let need = compute_need(max_demand, allocation);
    let mut work = available.to_vec();
    let mut finished = vec![false; n];
    let mut sequence = Vec::new();

    let mut changed = true;
    while changed && sequence.len() < n {
        changed = false;
        for i in 0..n {
            if finished[i] {
                continue;
            }
            if (0..m).all(|j| need[i][j] <= work[j]) {
                for j in 0..m {
                    work[j] += allocation[i][j];
                }
                finished[i] = true;
                sequence.push(i);
                changed = true;
            }
        }
    }

    let all_done = finished.iter().all(|&f| f);
    if all_done {
        (true, sequence)
    } else {
        (false, Vec::new())
    }
}

fn request_resources(
    pid: usize,
    request: &[i32],
    available: &[i32],
    allocation: &[Vec<i32>],
    max_demand: &[Vec<i32>],
) -> Result<(bool, Vec<i32>, Vec<Vec<i32>>), String> {
    let need = compute_need(max_demand, allocation);
    let m = available.len();
    for j in 0..m {
        if request[j] > need[pid][j] {
            return Err("申告した最大要求量を超えています".to_string());
        }
    }
    for j in 0..m {
        if request[j] > available[j] {
            return Ok((false, available.to_vec(), allocation.to_vec()));
        }
    }

    let mut new_available = available.to_vec();
    let mut new_allocation = allocation.to_vec();
    for j in 0..m {
        new_available[j] -= request[j];
        new_allocation[pid][j] += request[j];
    }

    let (safe, _) = is_safe(&new_available, &new_allocation, max_demand);
    if safe {
        Ok((true, new_available, new_allocation))
    } else {
        Ok((false, available.to_vec(), allocation.to_vec()))
    }
}
```

```csharp
static class BankersAlgorithm
{
    public static int[][] ComputeNeed(int[][] maxDemand, int[][] allocation)
    {
        int n = allocation.Length, m = allocation[0].Length;
        var need = new int[n][];
        for (int i = 0; i < n; i++)
        {
            need[i] = new int[m];
            for (int j = 0; j < m; j++) need[i][j] = maxDemand[i][j] - allocation[i][j];
        }
        return need;
    }

    public static (bool safe, List<int> sequence) IsSafe(int[] available, int[][] allocation, int[][] maxDemand)
    {
        int n = allocation.Length, m = available.Length;
        var need = ComputeNeed(maxDemand, allocation);
        var work = (int[])available.Clone();
        var finished = new bool[n];
        var sequence = new List<int>();
        bool changed = true;
        while (changed && sequence.Count < n)
        {
            changed = false;
            for (int i = 0; i < n; i++)
            {
                if (finished[i]) continue;
                bool ok = true;
                for (int j = 0; j < m; j++) if (need[i][j] > work[j]) { ok = false; break; }
                if (ok)
                {
                    for (int j = 0; j < m; j++) work[j] += allocation[i][j];
                    finished[i] = true;
                    sequence.Add(i);
                    changed = true;
                }
            }
        }
        bool allDone = finished.All(f => f);
        return (allDone, allDone ? sequence : new List<int>());
    }

    public static (bool granted, int[] available, int[][] allocation) RequestResources(
        int pid, int[] request, int[] available, int[][] allocation, int[][] maxDemand)
    {
        var need = ComputeNeed(maxDemand, allocation);
        int m = available.Length;
        for (int j = 0; j < m; j++) if (request[j] > need[pid][j]) throw new ArgumentException("申告した最大要求量を超えています");
        for (int j = 0; j < m; j++) if (request[j] > available[j]) return (false, available, allocation);

        var newAvailable = (int[])available.Clone();
        var newAllocation = allocation.Select(row => (int[])row.Clone()).ToArray();
        for (int j = 0; j < m; j++) { newAvailable[j] -= request[j]; newAllocation[pid][j] += request[j]; }

        var (safe, _) = IsSafe(newAvailable, newAllocation, maxDemand);
        if (safe) return (true, newAvailable, newAllocation);
        return (false, available, allocation);
    }
}
```
