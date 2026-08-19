---
name: 二段階スケジューリング(Two-Level Scheduling)
category: スケジューリング
subcategory: CPUスケジューリング
complexity: 長期スケジューラの実行はO(n)(n待機ジョブ数)、短期スケジューラの選択は採用する方式に依存(例えばラウンドロビンならO(1)、優先度キューならO(log n))
summary: メモリに収まりきらないほど多くのプロセスが存在する状況で、どのプロセスをメモリに載せるかを低頻度に決める長期スケジューラと、メモリ上のプロセス間でCPUをどう配分するかを高頻度に決める短期スケジューラとに責務を分離する、階層構造のスケジューリング構成。
---

## 概要

初期の多重プログラミングOSは、投入されるジョブの数がメモリ容量をはるかに上回るという制約と常に向き合っていた——全ジョブを同時にメモリへ載せることはできないため、「どのジョブを今メモリに置くか」という判断が「メモリ上のどのプロセスに今CPUを渡すか」という判断とは別に必要になる。二段階スケジューリング(Two-Level Scheduling)は、この2つの判断を明確に異なる階層・異なる頻度で行う構成を取る——**長期スケジューラ(ジョブスケジューラ)**は、ディスク上のジョブプールから「どのジョブをメモリに読み込むか」を数秒〜数分に一度という低頻度で決定し、**短期スケジューラ(CPUスケジューラ)**は、既にメモリ上にある実行可能プロセスの中から「次にどれへCPUを渡すか」を数ミリ秒に一度という高頻度で決定する。この頻度差そのものが二段階構成の核心であり、長期スケジューラは実行コストの高い精緻な判断を許され、短期スケジューラは極めて軽量でなければならないという、異なる設計制約を持つ2つの問題として整理できる。

## 仕組み

1. 新しいジョブが投入されると、まずディスク上のジョブプール(バッチキュー)に置かれる。ただちにメモリへは載らない
2. **長期スケジューラ**は、メモリに空きができたタイミング(既存プロセスの終了時など)で低頻度に起動し、ジョブプールの中から次にメモリへ読み込むジョブを選ぶ。この選択では、多重度(同時にメモリ上に存在させるプロセス数)を制御しつつ、CPUバウンドなジョブとI/Oバウンドなジョブの比率を適切に混ぜる(ジョブミックスのバランシング)ことで、CPUとI/Oデバイスの両方を稼働させ続け、システム全体のスループットを最大化しようとする
3. 選ばれたジョブはメモリに読み込まれ、実行可能プロセスとして**短期スケジューラ**の管理下に入る
4. **短期スケジューラ**は、メモリ上の実行可能プロセスの中から次にCPUを割り当てるプロセスを高頻度(数ミリ秒〜数十ミリ秒ごと)に選ぶ。この選択アルゴリズム自体には[ラウンドロビンスケジューリング](/algorithms/round-robin-scheduling)・[優先度スケジューリング](/algorithms/priority-scheduling)・[完全公平スケジューラ(CFS)](/algorithms/completely-fair-scheduler)など、任意のCPUスケジューリング方式を採用できる——二段階スケジューリングは「短期スケジューラの中身」を規定するものではなく、その外側の階層構造を定義するものである
5. 拡張として、メモリ圧迫時に実行中のプロセスを一時的にディスクへ退避し(スワップアウト)、後で復帰させる**中期スケジューラ**を挟む3段階構成も広く使われる。中期スケジューラは長期スケジューラより高頻度・短期スケジューラより低頻度で動作し、メモリ上に置く多重度を動的に調整する役割を担う

## 特性・トレードオフ

- **責務と頻度の分離**: 長期スケジューラは低頻度ゆえに、ジョブの特性(推定実行時間、CPUバウンド/I/Oバウンドの分類など)を考慮した比較的コストの高い判断を行える。短期スケジューラは高頻度ゆえに、判断のコストそのものがオーバーヘッドとしてシステム全体の性能に直結するため、[ラウンドロビン](/algorithms/round-robin-scheduling)のような軽量な方式や、[完全公平スケジューラ](/algorithms/completely-fair-scheduler)のように`O(log n)`で選択できる構造が求められる
- **多重度の制御によるスラッシング回避**: 長期スケジューラがメモリに同時に置くプロセス数(多重度)を適切に制御することで、メモリ不足によるページフォールトの多発(スラッシング)を未然に防げる。多重度を上げすぎるとメモリ圧迫でシステム全体が遅くなり、下げすぎるとCPU・I/Oデバイスの稼働率が下がるため、この調整は長期スケジューラの重要な役割になる
- **ジョブミックスのバランシング**: CPUバウンドなジョブばかりを admit するとI/Oデバイスが遊び、I/Oバウンドなジョブばかりだと逆にCPUが遊ぶ。長期スケジューラが両者を適切に混ぜて選ぶことで、システム資源全体の稼働率を高く保てる
- **現代の汎用OSでは長期スケジューラが実質省略されがち**: 仮想メモリの普及により、プロセス全体をメモリに載せなくても実行を開始できるようになったため、LinuxやWindowsのような汎用OSでは投入されたプロセスはほぼ即座に admit され、明示的な長期スケジューラの出番は薄い。メモリ圧迫への対応は主に中期スケジューラ(スワッピング)が担う。このため、古典的な二段階スケジューリングの概念は主にバッチシステムや、HPCクラスタのジョブスケジューラ(SLURM・PBSなど、投入されたジョブをいつどのノードで実行するか決める部分が長期スケジューラに相当する)、リアルタイムシステムのタスク受け入れ判定(admission control)といった文脈で今も生きている
- **使いどころ**: バッチ処理中心の初期OS設計、HPC・クラウド環境のジョブ/クラスタスケジューラ(ジョブの受け入れ判定と実行ノードへの配置)、リアルタイムシステムでの新規タスク受け入れ可否判定、コネクションプールのように「受け入れ制御」と「実際の処理割り当て」を階層的に分離したい一般的なキューイングシステムの設計モデル

## 実装例

長期スケジューラは、空きスロットができるたびにジョブプールからCPU/I/Oバウンドの比率を考慮してジョブをメモリへadmitし、短期スケジューラはメモリ上のプロセスに対して単純なラウンドロビンでCPUティックを配る、という2階層構成をシミュレートする。

```python
from collections import deque
from dataclasses import dataclass


@dataclass
class Job:
    name: str
    kind: str  # "cpu" または "io"
    remaining: int


class LongTermScheduler:
    """メモリに空きができたとき、ジョブプールからCPU/IOバランスを見て admit する"""

    def __init__(self, memory_capacity: int):
        self.memory_capacity = memory_capacity
        self.job_pool: deque[Job] = deque()

    def submit(self, job: Job) -> None:
        self.job_pool.append(job)

    def admit(self, resident: list[Job]) -> Job | None:
        if len(resident) >= self.memory_capacity or not self.job_pool:
            return None
        cpu_count = sum(1 for j in resident if j.kind == "cpu")
        io_count = len(resident) - cpu_count
        # 現在のミックスで不足している種類を優先的に選ぶ
        preferred_kind = "io" if cpu_count > io_count else "cpu"
        for i, job in enumerate(self.job_pool):
            if job.kind == preferred_kind:
                del self.job_pool[i]
                return job
        return self.job_pool.popleft()


class ShortTermScheduler:
    """メモリ上の実行可能プロセスにラウンドロビンでCPUティックを配る"""

    def __init__(self, quantum: int = 1):
        self.quantum = quantum
        self.ready: deque[Job] = deque()

    def add(self, job: Job) -> None:
        self.ready.append(job)

    def run_tick(self) -> str:
        if not self.ready:
            return "idle"
        job = self.ready.popleft()
        run = min(self.quantum, job.remaining)
        job.remaining -= run
        label = job.name
        if job.remaining > 0:
            self.ready.append(job)
        return label


def simulate_two_level(jobs: list[Job], memory_capacity: int, ticks: int) -> list[str]:
    long_term = LongTermScheduler(memory_capacity)
    for j in jobs:
        long_term.submit(j)
    short_term = ShortTermScheduler()
    resident: list[Job] = []
    timeline: list[str] = []

    for _ in range(ticks):
        admitted = long_term.admit(resident)
        if admitted is not None:
            resident.append(admitted)
            short_term.add(admitted)
        label = short_term.run_tick()
        timeline.append(label)
        resident = [j for j in resident if j.remaining > 0]

    return timeline
```

```typescript
interface Job {
  name: string;
  kind: "cpu" | "io";
  remaining: number;
}

class LongTermScheduler {
  private jobPool: Job[] = [];

  constructor(private memoryCapacity: number) {}

  submit(job: Job): void {
    this.jobPool.push(job);
  }

  admit(resident: Job[]): Job | null {
    if (resident.length >= this.memoryCapacity || this.jobPool.length === 0) return null;
    const cpuCount = resident.filter((j) => j.kind === "cpu").length;
    const ioCount = resident.length - cpuCount;
    const preferredKind: Job["kind"] = cpuCount > ioCount ? "io" : "cpu";
    const idx = this.jobPool.findIndex((j) => j.kind === preferredKind);
    if (idx >= 0) return this.jobPool.splice(idx, 1)[0];
    return this.jobPool.shift() ?? null;
  }
}

class ShortTermScheduler {
  private ready: Job[] = [];

  constructor(private quantum = 1) {}

  add(job: Job): void {
    this.ready.push(job);
  }

  runTick(): string {
    const job = this.ready.shift();
    if (!job) return "idle";
    const run = Math.min(this.quantum, job.remaining);
    job.remaining -= run;
    if (job.remaining > 0) this.ready.push(job);
    return job.name;
  }
}

function simulateTwoLevel(jobs: Job[], memoryCapacity: number, ticks: number): string[] {
  const longTerm = new LongTermScheduler(memoryCapacity);
  for (const j of jobs) longTerm.submit(j);
  const shortTerm = new ShortTermScheduler();
  let resident: Job[] = [];
  const timeline: string[] = [];

  for (let i = 0; i < ticks; i++) {
    const admitted = longTerm.admit(resident);
    if (admitted) {
      resident.push(admitted);
      shortTerm.add(admitted);
    }
    timeline.push(shortTerm.runTick());
    resident = resident.filter((j) => j.remaining > 0);
  }

  return timeline;
}
```
