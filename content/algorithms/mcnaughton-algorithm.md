---
name: McNaughtonのアルゴリズム
category: スケジューリング
subcategory: タスク・ジョブスケジューリング
complexity: O(n log n)(n作業数、処理時間順のソートが支配的)
summary: m台の同一機械上でプリエンプション(中断・再開)を許す前提のもとで、理論上最小のメイクスパンを厳密に達成する多重処理スケジューリング法。
---

## 概要

[リストスケジューリング](/algorithms/list-scheduling)は、プリエンプション(タスクの中断・再開)を許さない一般的な設定において、最適解の2倍以内という近似的な性能保証しか持たない——タスクをいったん機械に割り当てたら最後まで動かし続ける制約があるため、厳密に最適なスケジュールを組むのは`m`台の機械へのタスク分割問題として本質的に難しい(NP困難)からである。ところが1959年にロバート・マクノートン(Robert McNaughton)が示したように、「タスクを任意の時点で中断し、別の機械で(あるいは同じ機械で)再開してよい」というプリエンプションを許す設定に限れば、話は一変する——McNaughtonのアルゴリズムは、`m`台の同一機械上での最小メイクスパン(全タスクが完了するまでの時間)を、驚くほど単純な手続きで**厳密に**(近似ではなく)達成できることを示した。

## 仕組み

1. `n`個のタスクそれぞれの処理時間`p_1, p_2, ..., p_n`と、利用可能な同一機械の台数`m`が与えられているとする(タスク間の依存関係はなく、どのタスクもどの機械でも同じ時間で処理できる前提)
2. 理論上の最小メイクスパン`T`を、次の2つの下限のうち大きい方として計算する: `T = max( max_i(p_i), (Σp_i) / m )`。1つ目は「どんなに機械を並べても、最も長い単独タスクの処理時間より短くはできない」という下限、2つ目は「全タスクの処理時間の合計を`m`台に均等に割っても、それより短くはできない」という下限である
3. 全タスクを、長さ`T`の「テープ」を`m`本並べたものだと考える(1本のテープが1台の機械に対応し、時間軸に沿って左から右へタスクを敷き詰めていくイメージ)。タスクを任意の順序で選び、現在のテープの空いている位置から処理時間分だけ敷き詰めていく
4. あるタスクを敷いている途中でテープの右端(`T`の位置)に達してしまったら、そのタスクを中断し、残りの処理時間分を**次のテープ(次の機械)の左端**から続けて敷く(これがプリエンプションに対応する、タスクを機械間で分割する操作)
5. 全タスクを敷き終えるまで3〜4を繰り返す。得られる`m`本のテープの敷き詰め方が、そのまま`m`台の機械への具体的なスケジュール(各タスクをどの機械でいつからいつまで実行するか)になり、どのテープも長さ`T`を超えないため、メイクスパンはステップ2で計算した理論上の最小値`T`に厳密に一致する

## 特性・トレードオフ

- **計算量**: 全タスクの処理時間の合計と最大値を求めるのに`O(n)`、テープへの敷き詰め処理も各タスクを高々2つの機械にまたがって配置するだけなので合わせて`O(n)`程度で済む——実務上はタスクを処理時間順にソートしてから敷き詰めることが多く、その場合は`O(n log n)`が支配的になる
- **プリエンプションを許すことによる厳密な最適性**: [リストスケジューリング](/algorithms/list-scheduling)が非プリエンプティブな設定で最適解の高々2倍(グラハムの境界)にとどまるのに対し、McNaughtonのアルゴリズムはプリエンプションという追加の自由度を認めることで、理論上の下限`T`を**必ず**達成する——近似ではなく厳密解が、驚くほど単純な手続きで得られる稀有な例になっている
- **タスク分割コストというトレードオフ**: 1つのタスクが機械の境界をまたいで分割される場合、実世界ではその分割自体にオーバーヘッド(状態の保存・復元、通信コストなど)が発生することがある。McNaughtonのアルゴリズムは「分割は自由かつ無コスト」という理想化された前提のもとでの最適性であり、分割コストが無視できない実務では[リストスケジューリング](/algorithms/list-scheduling)のような非プリエンプティブな近似アルゴリズムの方が現実的な場合もある
- **分割されるタスクの数に上限があるという性質**: 敷き詰めの手順上、機械の境界をまたいで分割されるタスクの数は高々`m-1`個であることが示せる(ほとんどのタスクはどこか1台の機械に収まる)——プリエンプションを許すとはいえ、実際に分割が起こる箇所は限定的である
- **使いどころ**: プリエンプションが低コストで実現できる並列計算資源(CPUコアやクラウドの仮想マシンへのタスク割り当てで、タスクの一時停止・再開が容易な場合)へのジョブ割り当て、[ジョブショップスケジューリング](/algorithms/job-shop-scheduling)や[リストスケジューリング](/algorithms/list-scheduling)のような非プリエンプティブな近似解と比較するための理論上の最適値の算出、プロジェクト管理における「作業を分割してでも全体の完了時間を最短にしたい」場面の理論的基盤

## 実装例

```python
from dataclasses import dataclass


@dataclass
class Task:
    name: str
    duration: float


@dataclass
class Segment:
    task: str
    machine: int
    start: float
    end: float


def mcnaughton_schedule(tasks: list[Task], m: int) -> tuple[float, list[Segment]]:
    """m台の同一機械上でプリエンプションを許した最小メイクスパンスケジュールを構築する。
    戻り値: (最小メイクスパンT, 各機械への割り当てセグメントのリスト)。
    """
    total = sum(t.duration for t in tasks)
    max_single = max((t.duration for t in tasks), default=0.0)
    makespan = max(max_single, total / m)

    segments: list[Segment] = []
    machine = 0
    cursor = 0.0  # 現在の機械上での書き込み位置

    for task in tasks:
        remaining = task.duration
        while remaining > 0:
            space = makespan - cursor
            chunk = min(space, remaining)
            if chunk > 0:
                segments.append(Segment(task.name, machine, cursor, cursor + chunk))
            cursor += chunk
            remaining -= chunk
            if cursor >= makespan and remaining > 1e-9:
                machine += 1
                cursor = 0.0

    return makespan, segments
```

```typescript
interface Task {
  name: string;
  duration: number;
}

interface Segment {
  task: string;
  machine: number;
  start: number;
  end: number;
}

function mcnaughtonSchedule(
  tasks: Task[],
  m: number,
): { makespan: number; segments: Segment[] } {
  const total = tasks.reduce((sum, t) => sum + t.duration, 0);
  const maxSingle = tasks.reduce((max, t) => Math.max(max, t.duration), 0);
  const makespan = Math.max(maxSingle, total / m);

  const segments: Segment[] = [];
  let machine = 0;
  let cursor = 0; // 現在の機械上での書き込み位置

  for (const task of tasks) {
    let remaining = task.duration;
    while (remaining > 0) {
      const space = makespan - cursor;
      const chunk = Math.min(space, remaining);
      if (chunk > 0) {
        segments.push({
          task: task.name,
          machine,
          start: cursor,
          end: cursor + chunk,
        });
      }
      cursor += chunk;
      remaining -= chunk;
      if (cursor >= makespan && remaining > 1e-9) {
        machine += 1;
        cursor = 0;
      }
    }
  }

  return { makespan, segments };
}
```
