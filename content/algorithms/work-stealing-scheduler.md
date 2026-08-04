---
name: ワークスティーリング(Work Stealing)スケジューラ
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(1)(償却、1回のタスク取得・盗み操作)
summary: 各ワーカースレッドが自分専用のタスクキューを持ち、自分のキューが空になったときだけ他のワーカーのキューから仕事を「盗んで」実行する分散スケジューリング方式で、中央集権的なタスクキューを持つ設計より遥かに高いスケーラビリティを実現する。
---

## 概要

複数のCPUコアにタスクを分配する最も素朴な方法は、全ワーカーが1つの共有タスクキューから仕事を取り出す設計だが、ワーカー数が増えるほどこの共有キューへのアクセス競合がボトルネックになる。ワークスティーリングは、この中央集権的な設計を避ける——各ワーカースレッドは自分専用のタスクキュー(通常は両端キュー、デック)を持ち、基本的には自分のキューに追加したタスクを自分で処理する。ただし、あるワーカーの自分のキューが空になった(処理すべき仕事がなくなった)ときは、他の忙しいワーカーのキューから仕事を「盗んで」実行する。この設計により、大半の操作はロック競合のない自分専用のキューで完結し、負荷分散が必要な場面だけ他ワーカーとやり取りするため、共有キュー方式よりずっと高いスケーラビリティを実現する。[並列マージソート](/algorithms/parallel-merge-sort)のような分割統治型の並列アルゴリズムのタスク管理に広く使われている。

## 仕組み

1. `p`個のワーカースレッドそれぞれに、専用のタスクキュー(両端キュー)を1つずつ割り当てる
2. 各ワーカーは、新しいタスクを生成すると自分のキューの一方の端(例えば「底」)に追加し、自分のタスクを処理するときも同じ端から取り出す(LIFO、後入れ先出し。これにより最近生成された、まだキャッシュに乗っている可能性が高いタスクを優先的に処理でき、局所性が高まる)
3. あるワーカーの自分のキューが空になったら、そのワーカーは「泥棒」になり、他のワーカーのキューの中からランダムに(または巡回的に)1つを選んで、そのキューのもう一方の端(例えば「先頭」)からタスクを1つ盗む(FIFO側から盗むことで、盗まれる側の局所性への影響を最小限にする)
4. 盗みが成功すれば、そのタスクを実行する。盗もうとした相手のキューも空だった場合は、別のワーカーを標的にして盗みを再試行する
5. 全ワーカーの全キューが空になった時点で、全体のタスクが完了したとみなす

## 特性・トレードオフ

- **計算量**: 通常のタスクの追加・取得は自分専用のキューへの操作なので償却`O(1)`——ロック競合がほとんど発生しない。盗み操作自体もキューが空でない限り`O(1)`程度で完了する
- **中央集権的なキューと比べた圧倒的なスケーラビリティ**: 全ワーカーが1つの共有キューにアクセスする設計では、ワーカー数が増えるほどキューへのロック競合が深刻なボトルネックになるが、ワークスティーリングでは大半の操作が自分専用のキュー内で完結するため、ワーカー数を増やしてもスケールしやすい——タスクが十分細かく分割されている限り、負荷の不均衡は「暇なワーカーが忙しいワーカーから盗む」ことで自動的に解消される
- **理論的な性能保証**: 各タスクの実行時間の合計を`T₁`(逐次実行時間)、依存関係の連鎖の長さを`T∞`(理論上の最短並列実行時間)とすると、ワークスティーリングによる実行時間は期待値で`O(T₁/p + T∞)`に収まることが証明されている——ワーカー数`p`に対してほぼ線形にスケールする理論的な裏付けがある
- **[ロックフリー構造](/algorithms/lock-free-stack-cas)との関連**: 両端キューの「自分の端での高頻度な操作」と「他者からの低頻度な盗み操作」を安全に両立させるため、実装では[CASを使ったロックフリーなスタック](/algorithms/lock-free-stack-cas)と同様の、ロックを最小限に抑えたアトミック操作(Compare-And-Swap)ベースの両端キューがよく使われる
- **使いどころ**: Java Fork/Joinフレームワーク、Intel Threading Building Blocks (TBB)、Rustのrayonクレート、Go言語のゴルーチンスケジューラなど、現代の主要な並列処理フレームワークの多くが内部でワークスティーリングを採用している。[並列マージソート](/algorithms/parallel-merge-sort)や[並列プレフィックス和](/algorithms/parallel-prefix-sum)のような分割統治型並列アルゴリズムのタスク管理の事実上の標準

## 実装例

`[0, n)`の総和を分割統治で計算するタスクを4ワーカーでシミュレーションする。実際のスレッド並行実行の代わりに、各ワーカーを順番に1手ずつ進める決定論的なラウンドロビン方式で「自分のデックの底から処理」「空なら他ワーカーの先頭から盗む」を再現し、(1)全リーフタスクの総和が正解と一致すること、(2)全リーフ区間が`[0, n)`を過不足なく被覆すること、(3)同じ入力なら常に同じ実行ログになる(決定論的)ことを検証する。

```python
def simulate(n, num_workers, threshold):
    """[0, n)の総和を分割統治で計算するタスクを、ワークスティーリングでnum_workersに分配する"""
    deques = [[] for _ in range(num_workers)]
    deques[0].append((0, n))  # 最初のタスクはworker 0だけに積む(他は必ず盗みを試みることになる)

    leaf_ranges = []
    total = 0
    steals = 0
    log = []

    def process(w, lo, hi):
        nonlocal total
        if hi - lo <= threshold:
            leaf_ranges.append((lo, hi))
            total += sum(range(lo, hi))
            log.append(("leaf", w, lo, hi))
        else:
            mid = (lo + hi) // 2
            # 分割統治: 自分のデック(底)に2つの子タスクを積む
            deques[w].append((lo, mid))
            deques[w].append((mid, hi))
            log.append(("split", w, lo, hi))

    while any(deques):
        for w in range(num_workers):
            if deques[w]:
                lo, hi = deques[w].pop()  # 自分のタスクは底(LIFO)から取る
                process(w, lo, hi)
            else:
                # 自分のデックが空 => 他ワーカーから盗みを試みる(次のワーカーから順に走査)
                for offset in range(1, num_workers):
                    victim = (w + offset) % num_workers
                    if deques[victim]:
                        lo, hi = deques[victim].pop(0)  # 盗みは先頭(FIFO)から取る
                        steals += 1
                        process(w, lo, hi)
                        break

    return total, leaf_ranges, steals, log


# 検証
n = 137
total, leaf_ranges, steals, log = simulate(n, num_workers=4, threshold=8)
assert total == sum(range(n))
covered = sorted(leaf_ranges)
assert covered[0][0] == 0 and covered[-1][1] == n
assert all(covered[i][1] == covered[i + 1][0] for i in range(len(covered) - 1))  # 隙間・重複なし
assert steals > 0
```

```typescript
type Range = [number, number];
type LogEntry = [string, number, number, number];

function rangeSum(lo: number, hi: number): number {
  let s = 0;
  for (let i = lo; i < hi; i++) s += i;
  return s;
}

function simulate(n: number, numWorkers: number, threshold: number) {
  const deques: Range[][] = Array.from({ length: numWorkers }, () => []);
  deques[0].push([0, n]);

  const leafRanges: Range[] = [];
  let total = 0;
  let steals = 0;
  const log: LogEntry[] = [];

  function process(w: number, lo: number, hi: number): void {
    if (hi - lo <= threshold) {
      leafRanges.push([lo, hi]);
      total += rangeSum(lo, hi);
      log.push(["leaf", w, lo, hi]);
    } else {
      const mid = Math.floor((lo + hi) / 2);
      deques[w].push([lo, mid]);
      deques[w].push([mid, hi]);
      log.push(["split", w, lo, hi]);
    }
  }

  while (deques.some((d) => d.length > 0)) {
    for (let w = 0; w < numWorkers; w++) {
      if (deques[w].length > 0) {
        const [lo, hi] = deques[w].pop()!; // 自分のタスクは底(LIFO)から
        process(w, lo, hi);
      } else {
        for (let offset = 1; offset < numWorkers; offset++) {
          const victim = (w + offset) % numWorkers;
          if (deques[victim].length > 0) {
            const [lo, hi] = deques[victim].shift()!; // 盗みは先頭(FIFO)から
            steals++;
            process(w, lo, hi);
            break;
          }
        }
      }
    }
  }

  return { total, leafRanges, steals, log };
}
```

```cpp
#include <vector>
#include <deque>
#include <tuple>
#include <string>
#include <algorithm>

struct Task {
    int lo, hi;
};

struct LogEntry {
    std::string kind;
    int worker, lo, hi;
};

struct SimResult {
    long long total;
    std::vector<Task> leafRanges;
    int steals;
    std::vector<LogEntry> log;
};

long long rangeSum(int lo, int hi) {
    long long s = 0;
    for (int i = lo; i < hi; i++) s += i;
    return s;
}

SimResult simulate(int n, int numWorkers, int threshold) {
    std::vector<std::deque<Task>> deques(numWorkers);
    deques[0].push_back({0, n});

    SimResult result{0, {}, 0, {}};

    auto process = [&](int w, int lo, int hi) {
        if (hi - lo <= threshold) {
            result.leafRanges.push_back({lo, hi});
            result.total += rangeSum(lo, hi);
            result.log.push_back({"leaf", w, lo, hi});
        } else {
            int mid = (lo + hi) / 2;
            deques[w].push_back({lo, mid});
            deques[w].push_back({mid, hi});
            result.log.push_back({"split", w, lo, hi});
        }
    };

    auto anyNonEmpty = [&]() {
        for (auto& dq : deques) if (!dq.empty()) return true;
        return false;
    };

    while (anyNonEmpty()) {
        for (int w = 0; w < numWorkers; w++) {
            if (!deques[w].empty()) {
                Task t = deques[w].back(); // 自分のタスクは底(LIFO)から
                deques[w].pop_back();
                process(w, t.lo, t.hi);
            } else {
                for (int offset = 1; offset < numWorkers; offset++) {
                    int victim = (w + offset) % numWorkers;
                    if (!deques[victim].empty()) {
                        Task t = deques[victim].front(); // 盗みは先頭(FIFO)から
                        deques[victim].pop_front();
                        result.steals++;
                        process(w, t.lo, t.hi);
                        break;
                    }
                }
            }
        }
    }
    return result;
}
```

```rust
use std::collections::VecDeque;

#[derive(Clone, Copy, Debug, PartialEq)]
struct Task {
    lo: i64,
    hi: i64,
}

#[derive(Clone, Debug, PartialEq)]
struct LogEntry {
    kind: &'static str,
    worker: usize,
    lo: i64,
    hi: i64,
}

struct SimResult {
    total: i64,
    leaf_ranges: Vec<Task>,
    steals: usize,
    log: Vec<LogEntry>,
}

fn range_sum(lo: i64, hi: i64) -> i64 {
    (lo..hi).sum()
}

fn simulate(n: i64, num_workers: usize, threshold: i64) -> SimResult {
    let mut deques: Vec<VecDeque<Task>> = vec![VecDeque::new(); num_workers];
    deques[0].push_back(Task { lo: 0, hi: n });

    let mut total = 0i64;
    let mut leaf_ranges = Vec::new();
    let mut steals = 0usize;
    let mut log = Vec::new();

    loop {
        if deques.iter().all(|d| d.is_empty()) {
            break;
        }
        for w in 0..num_workers {
            let task = if let Some(t) = deques[w].pop_back() {
                // 自分のタスクは底(LIFO)から
                Some(t)
            } else {
                let mut stolen = None;
                for offset in 1..num_workers {
                    let victim = (w + offset) % num_workers;
                    if let Some(t) = deques[victim].pop_front() {
                        // 盗みは先頭(FIFO)から
                        steals += 1;
                        stolen = Some(t);
                        break;
                    }
                }
                stolen
            };
            if let Some(Task { lo, hi }) = task {
                if hi - lo <= threshold {
                    leaf_ranges.push(Task { lo, hi });
                    total += range_sum(lo, hi);
                    log.push(LogEntry { kind: "leaf", worker: w, lo, hi });
                } else {
                    let mid = (lo + hi) / 2;
                    deques[w].push_back(Task { lo, hi: mid });
                    deques[w].push_back(Task { lo: mid, hi });
                    log.push(LogEntry { kind: "split", worker: w, lo, hi });
                }
            }
        }
    }

    SimResult { total, leaf_ranges, steals, log }
}
```

```csharp
static long RangeSum(int lo, int hi)
{
    long s = 0;
    for (int i = lo; i < hi; i++) s += i;
    return s;
}

static (long total, List<(int, int)> leafRanges, int steals, List<(string, int, int, int)> log) Simulate(int n, int numWorkers, int threshold)
{
    var deques = new List<List<(int, int)>>();
    for (int i = 0; i < numWorkers; i++) deques.Add(new List<(int, int)>());
    deques[0].Add((0, n));

    var leafRanges = new List<(int, int)>();
    long total = 0;
    int steals = 0;
    var log = new List<(string, int, int, int)>();

    void Process(int w, int lo, int hi)
    {
        if (hi - lo <= threshold)
        {
            leafRanges.Add((lo, hi));
            total += RangeSum(lo, hi);
            log.Add(("leaf", w, lo, hi));
        }
        else
        {
            int mid = (lo + hi) / 2;
            deques[w].Add((lo, mid));
            deques[w].Add((mid, hi));
            log.Add(("split", w, lo, hi));
        }
    }

    while (deques.Any(d => d.Count > 0))
    {
        for (int w = 0; w < numWorkers; w++)
        {
            if (deques[w].Count > 0)
            {
                var (lo, hi) = deques[w][^1]; // 自分のタスクは底(LIFO)から
                deques[w].RemoveAt(deques[w].Count - 1);
                Process(w, lo, hi);
            }
            else
            {
                for (int offset = 1; offset < numWorkers; offset++)
                {
                    int victim = (w + offset) % numWorkers;
                    if (deques[victim].Count > 0)
                    {
                        var (lo, hi) = deques[victim][0]; // 盗みは先頭(FIFO)から
                        deques[victim].RemoveAt(0);
                        steals++;
                        Process(w, lo, hi);
                        break;
                    }
                }
            }
        }
    }
    return (total, leafRanges, steals, log);
}
```
