---
name: デッドラインモノトニックスケジューリング(DM)
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(n log n)(nタスクの優先度ソート)、スケジューラビリティ判定はO(n)〜O(n²)(応答時間解析を使う場合)
summary: 各タスクの周期そのものではなく締切(デッドライン)の長さに着目し、締切が短いタスクほど高い優先度を静的に割り当てるリアルタイムスケジューリング方式で、締切と周期が一致する特殊ケースではレートモノトニックスケジューリング(RMS)と完全に一致する。
---

## 概要

[レートモノトニックスケジューリング(RMS)](/algorithms/rate-monotonic-scheduling)は「タスクの周期`Tᵢ`が短いほど優先度を高くする」という規則で静的優先度を決めるが、これは暗黙のうちに「タスクは次の周期が始まるまでに処理を終えればよい(締切`Dᵢ` = 周期`Tᵢ`)」という前提を置いている。しかし実際のリアルタイムシステムでは、周期は長くても締切だけは早い(`Dᵢ < Tᵢ`)——例えば「100ミリ秒ごとにセンサー値を読むが、読み取ってから20ミリ秒以内に制御信号を出さなければならない」——というタスクも珍しくない。デッドラインモノトニックスケジューリング(DM、Deadline Monotonic Scheduling)は、リュー(Leung)とホイットヘッド(Whitehead)によって1982年に一般化された方式で、優先度を周期`Tᵢ`ではなく**相対締切`Dᵢ`**の長さに基づいて静的に割り当てる——締切が短いタスクほど高い優先度を持つ。RMSと同様に優先度は起動時に一度決めれば実行中は変更しない静的優先度方式だが、締切が周期と異なりうるより一般的な状況を扱える点がRMSとの違いである。

## 仕組み

1. 各タスク`τᵢ`について、周期`Tᵢ`・実行時間`Cᵢ`に加えて、周期の開始から数えた**相対締切`Dᵢ`**(通常は`Dᵢ ≤ Tᵢ`、次の周期が始まる前により早い期限が課されている状況を想定)があらかじめ分かっているとする
2. 各タスクの優先度を、相対締切`Dᵢ`が短いほど高くなるよう、システム起動時に静的に割り当てる——「締切の短さに単調に対応する優先度付け」であることからデッドラインモノトニックと呼ばれる
3. 実行時には、到着済みタスクの中で最も優先度の高い(締切が最も短い)タスクをCPUに割り当てる、通常の優先度プリエンプティブスケジューリングを行う
4. `Dᵢ = Tᵢ`(締切が周期と一致する)がすべてのタスクで成り立つ特殊ケースでは、締切の順序と周期の順序が完全に一致するため、DMによる優先度割り当ては[RMS](/algorithms/rate-monotonic-scheduling)による割り当てと**完全に同じ結果**になる——DMはRMSを`Dᵢ ≤ Tᵢ`の状況にまで一般化した方式と位置づけられる
5. **スケジューラビリティ判定**: `Dᵢ ≤ Tᵢ`(締切制約モデル)の場合、十分条件としてリューとレイランドの境界を`Tᵢ`の代わりに`Dᵢ`を使う形へ一般化した`Σ(Cᵢ/Dᵢ) ≤ n(2^(1/n) - 1)`が使える。この境界を満たさない場合でも実際にはスケジュール可能なことがあるため、より精密な判定には各タスクの最悪応答時間を反復計算で求める**応答時間解析**(`Rᵢ = Cᵢ + Σⱼ∈hp(i) ⌈Rᵢ/Tⱼ⌉Cⱼ`という再帰式を`Rᵢ`が収束するまで反復し、`Rᵢ ≤ Dᵢ`かを確認する。`hp(i)`はタスク`i`より高優先度のタスク集合)を用いる
6. リューとホイットヘッドは、`Dᵢ ≤ Tᵢ`の締切制約モデルにおいて、**DMが静的優先度方式の中で最適**であることを証明している——つまり、何らかの静的優先度割り当てでスケジュール可能なタスク集合であれば、DMによる割り当てでも必ずスケジュール可能になる

## 特性・トレードオフ

- **計算量**: 優先度の割り当ては締切でソートするだけなので`O(n log n)`。スケジューラビリティ判定は、十分条件の利用率チェックなら`O(n)`、より精密な応答時間解析はタスクごとの反復計算を要するため`O(n²)`程度になりうる
- **[RMS](/algorithms/rate-monotonic-scheduling)との関係**: `Dᵢ = Tᵢ`のときDMとRMSは同一の優先度順序を生成する。締切が周期より短い(`Dᵢ < Tᵢ`)タスクが1つでも混在すると両者は異なる優先度順序になり、RMSをそのまま適用すると本来間に合うはずのタスクが締切に間に合わなくなる場合がある——このギャップを埋めるのがDMの一般化である
- **[最早締切優先(EDF)](/algorithms/earliest-deadline-first)との対比**: [EDF](/algorithms/earliest-deadline-first)は動的優先度方式で、実行時に「現在から見た絶対締切」が最も近いタスクを都度選び直すためCPU使用率100%まで理論上スケジュール可能という最適性を持つ。DMは静的優先度方式である代償として理論上の使用率上限がEDFより低くなるが、優先度を実行中に再計算する必要がなく、割り込みオーバーヘッドが小さく動作の予測可能性が高いという実装上の利点を持つ——「動的最適性」と「静的な単純さ・予測可能性」のトレードオフは、RMSとEDFの関係とそのまま対応する
- **締切制約モデルの一般性**: RMSが暗黙に置いていた「締切=周期」という前提を外し、より現実のリアルタイム要求(センサー読み取りから制御出力までの許容遅延など、周期そのものより短い応答時間が求められる場面)に即した優先度設計ができる。静的優先度方式の枠内では最適という理論的裏付けがあるため、単に「締切が周期と違うから」という理由でEDFのような動的方式へ飛びつく前に検討すべき選択肢になる
- **使いどころ**: センサー入力から制御出力までの応答時間制約が周期そのものより厳しい組み込み制御システム、自動車ECU(Electronic Control Unit)のタスクスケジューリング、[RMS](/algorithms/rate-monotonic-scheduling)の前提(締切=周期)が崩れるあらゆる静的優先度リアルタイムシステムの設計

## 実装例

```python
import math
from functools import reduce


def lcm(a: int, b: int) -> int:
    return a * b // math.gcd(a, b)


def hyperperiod(tasks: list[dict]) -> int:
    return reduce(lcm, (t["period"] for t in tasks), 1)


def response_time_analysis(tasks: list[dict]) -> dict[str, float | None]:
    """締切制約モデル(D <= T)における各タスクの最悪応答時間を反復計算で求める。
    tasks: [{"name", "exec", "period", "deadline"}, ...] を優先度順(deadline昇順)に処理する。
    """
    ordered = sorted(tasks, key=lambda t: t["deadline"])
    results: dict[str, float | None] = {}
    for i, task in enumerate(ordered):
        higher_priority = ordered[:i]  # 締切がより短い=より高優先度のタスク群
        r = task["exec"]
        while True:
            interference = sum(
                math.ceil(r / hp["period"]) * hp["exec"] for hp in higher_priority
            )
            r_next = task["exec"] + interference
            if r_next == r:
                break
            if r_next > task["deadline"]:
                results[task["name"]] = None  # 締切超過が確定
                break
            r = r_next
        else:
            results[task["name"]] = r
        if task["name"] not in results:
            results[task["name"]] = r if r <= task["deadline"] else None
    return results


def deadline_monotonic_priorities(tasks: list[dict]) -> list[dict]:
    """締切(deadline)が短い順に並べ替えたものが、そのままDMの静的優先度順になる。"""
    return sorted(tasks, key=lambda t: t["deadline"])


def simulate_dm(tasks: list[dict]):
    """締切モノトニックな静的優先度でタスクをシミュレートする。"""
    ordered = deadline_monotonic_priorities(tasks)
    horizon = hyperperiod(tasks)
    remaining: dict[tuple[str, int], int] = {}
    jobs = []
    for t in ordered:
        release = 0
        while release < horizon:
            remaining[(t["name"], release)] = t["exec"]
            jobs.append((t["name"], release, release + t["deadline"]))
            release += t["period"]

    finish_times: dict[tuple[str, int], int] = {}
    for time in range(horizon):
        chosen = None
        for t in ordered:  # 締切が短い順に見て、実行中の最高優先度タスクを選ぶ
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
interface DmTask {
  name: string;
  exec: number;
  period: number;
  deadline: number;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}
function hyperperiod(tasks: DmTask[]): number {
  return tasks.reduce((h, t) => lcm(h, t.period), 1);
}

function responseTimeAnalysis(tasks: DmTask[]): Map<string, number | null> {
  const ordered = [...tasks].sort((a, b) => a.deadline - b.deadline);
  const results = new Map<string, number | null>();
  ordered.forEach((task, i) => {
    const higherPriority = ordered.slice(0, i); // 締切がより短い=より高優先度
    let r = task.exec;
    for (let iter = 0; iter < 10_000; iter++) {
      const interference = higherPriority.reduce(
        (sum, hp) => sum + Math.ceil(r / hp.period) * hp.exec,
        0,
      );
      const rNext = task.exec + interference;
      if (rNext > task.deadline) {
        results.set(task.name, null); // 締切超過が確定
        return;
      }
      if (rNext === r) {
        results.set(task.name, r);
        return;
      }
      r = rNext;
    }
    results.set(task.name, r <= task.deadline ? r : null);
  });
  return results;
}

function deadlineMonotonicPriorities(tasks: DmTask[]): DmTask[] {
  return [...tasks].sort((a, b) => a.deadline - b.deadline); // 締切モノトニックな静的優先度
}

function simulateDM(tasks: DmTask[]) {
  const ordered = deadlineMonotonicPriorities(tasks);
  const horizon = hyperperiod(tasks);
  const remaining = new Map<string, number>();
  const jobs: { name: string; release: number; deadline: number }[] = [];
  for (const t of ordered) {
    for (let release = 0; release < horizon; release += t.period) {
      remaining.set(`${t.name}:${release}`, t.exec);
      jobs.push({ name: t.name, release, deadline: release + t.deadline });
    }
  }
  const finishTimes = new Map<string, number>();
  for (let time = 0; time < horizon; time++) {
    let chosenKey: string | null = null;
    for (const t of ordered) {
      const release = Math.floor(time / t.period) * t.period;
      const key = `${t.name}:${release}`;
      if ((remaining.get(key) ?? 0) > 0) {
        chosenKey = key;
        break;
      }
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
