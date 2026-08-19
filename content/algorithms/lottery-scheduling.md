---
name: くじ引きスケジューリング(Lottery Scheduling)
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(n)(線形探索でくじ券を辿る場合)、累積配列+二分探索を使えばO(log n)(nは実行可能プロセス数)
summary: 各プロセスに優先度に応じた枚数のくじ券を配り、スケジューリングのたびに当選券を1枚抽選してその保持プロセスへCPUを割り当てる確率的なスケジューリング手法で、長期的には保有券の比率に応じたCPU配分へ統計的に収束する公平性を持つ。
---

## 概要

[優先度スケジューリング](/algorithms/priority-scheduling)や[完全公平スケジューラ(CFS)](/algorithms/completely-fair-scheduler)は、決定論的な計算(最も優先度が高いものを選ぶ、最もvruntimeが小さいものを選ぶ)によって次に実行するプロセスを一意に決める。くじ引きスケジューリング(Lottery Scheduling)は、1994年にワルドスプルガー(Waldspurger)とワインバーグ(Weihl)によって提案された、これとは発想の異なるアプローチを取る——各プロセスに、望ましいCPU配分比率に応じた枚数の**くじ券**を配布し、スケジューラは毎回のスケジューリング時点で全体のくじ券からランダムに1枚を抽選し、その券を保持するプロセスにCPUを割り当てる。個々の抽選結果は確率的でばらつきがあるが、**大数の法則**により、十分な回数の抽選を繰り返せば各プロセスが実際に得るCPU時間の割合は、そのプロセスが保有するくじ券の割合へと統計的に収束する。決定論的なアルゴリズムが複雑な特殊処理(飢餓防止のためのエイジングなど)を必要としがちなのに対し、くじ引きスケジューリングは「ランダム性そのもの」を使って自然に飢餓を回避しつつ比例配分を実現する点が特徴的である。

## 仕組み

1. 各プロセス`i`に、望ましいCPU配分比率に比例した枚数のくじ券`tᵢ`を割り当てる。全プロセスの券の合計を`T = Σtᵢ`とする
2. スケジューリングのタイミングごとに、`1`から`T`までの一様乱数`w`を1つ生成する
3. 全プロセスのくじ券を(概念的に)連番で並べ、`w`番目の券を保持しているプロセスを当選者として選ぶ——実装上は、プロセスを配列に並べて累積券数を管理し、`w`が収まる区間を探せば良い(線形探索なら`O(n)`、累積配列に対する二分探索なら`O(log n)`)
4. 当選したプロセスに1タイムクオンタム分のCPUを割り当てて実行する
5. これを繰り返すことで、各プロセスがCPUを得る**期待値**はその保有券数`tᵢ`に比例する(`tᵢ/T`)。実行回数が増えるほど実際の配分比率はこの期待値に近づいていく(大数の法則による統計的収束)
6. **くじ券の受け渡し(ticket transfer)**という拡張もある——例えばクライアントプロセスがサーバプロセスに処理を依頼して待機する場合、自分のくじ券を一時的にサーバへ譲渡することで、サーバは依頼元の優先度を引き継いで動作できる(優先度逆転問題への対処に応用できる)
7. **通貨(currency)の概念**もある——プロセスのグループごとに独立した「通貨」でくじ券を発行し、グループ内での配分比率とグループ間での配分比率を階層的に制御できる(ある通貨のインフレ・デフレがそのグループ内の相対配分にのみ影響し、他グループに波及しない)

## 特性・トレードオフ

- **確率的な公平性**: 保有券数に比例した長期的なCPU配分が統計的に保証される一方、短期的(抽選回数が少ない状況)には分散(ばらつき)が生じる——ごく少数の抽選回数では、比率通りに配分されない試行が普通に起こり得る。[レートモノトニックスケジューリング](/algorithms/rate-monotonic-scheduling)や[最早締切優先(EDF)](/algorithms/earliest-deadline-first)のような、個々のタスクについて決定論的な締切保証が必要なハードリアルタイムシステムには向かない
- **実装の単純さと飢餓の自然な回避**: くじ券を1枚でも持っていれば当選する可能性は常にゼロにならないため、[優先度スケジューリング](/algorithms/priority-scheduling)で必要になるような「長時間待たされたプロセスの優先度を人為的に上げる」エイジング機構を明示的に実装しなくても、確率的に飢餓が回避される
- **決定論的な後継アルゴリズムとの関係**: 同じ著者らは、乱数を使わずに同様の比例配分特性を決定論的に実現する**ストライドスケジューリング(Stride Scheduling)**も提案している。各プロセスに「くじ券数に反比例するストライド値」を割り当て、常に最も進んでいない(累積パス値が最小の)プロセスを選ぶ方式で、くじ引き方式より短期的な公平性のばらつきが小さい代わりに実装がやや複雑になる
- **くじ券の受け渡し・通貨機構による柔軟性**: 単純な比例配分だけでなく、プロセス間の依存関係(クライアント・サーバ間の優先度継承)やグループ単位の階層的なリソース管理を、追加の特殊ケースを増やさずにくじ券というひとつの通貨で統一的に表現できる
- **使いどころ**: リソース管理の研究用OS(元々の提案はLottery SchedulingがVMSやMachベースの実験的OSで実装された)、仮想化基盤におけるVMへのCPU配分比率の制御、優先度を確率的な比率として扱いたいマルチテナントシステムでの概念的なモデル

## 実装例

```python
import random
from dataclasses import dataclass


@dataclass
class LotteryProcess:
    pid: str
    tickets: int


class LotteryScheduler:
    def __init__(self) -> None:
        self.processes: list[LotteryProcess] = []

    def add(self, proc: LotteryProcess) -> None:
        self.processes.append(proc)

    def remove(self, pid: str) -> None:
        self.processes = [p for p in self.processes if p.pid != pid]

    def _total_tickets(self) -> int:
        return sum(p.tickets for p in self.processes)

    def draw(self) -> LotteryProcess | None:
        """くじ券を1枚抽選し、当選プロセスを返す"""
        total = self._total_tickets()
        if total == 0:
            return None
        winning_number = random.randint(1, total)
        cumulative = 0
        for proc in self.processes:
            cumulative += proc.tickets
            if winning_number <= cumulative:
                return proc
        return self.processes[-1]  # 丸め誤差対策のフォールバック

    def simulate(self, rounds: int) -> dict[str, int]:
        """rounds回抽選し、各プロセスが当選した回数を集計する(比率が収束することを確認できる)"""
        wins: dict[str, int] = {p.pid: 0 for p in self.processes}
        for _ in range(rounds):
            winner = self.draw()
            if winner is not None:
                wins[winner.pid] += 1
        return wins
```

```typescript
interface LotteryProcess {
  pid: string;
  tickets: number;
}

class LotteryScheduler {
  private processes: LotteryProcess[] = [];

  add(proc: LotteryProcess): void {
    this.processes.push(proc);
  }

  remove(pid: string): void {
    this.processes = this.processes.filter((p) => p.pid !== pid);
  }

  private totalTickets(): number {
    return this.processes.reduce((sum, p) => sum + p.tickets, 0);
  }

  draw(rand: () => number = Math.random): LotteryProcess | null {
    const total = this.totalTickets();
    if (total === 0) return null;
    const winningNumber = Math.floor(rand() * total) + 1;
    let cumulative = 0;
    for (const proc of this.processes) {
      cumulative += proc.tickets;
      if (winningNumber <= cumulative) return proc;
    }
    return this.processes[this.processes.length - 1] ?? null; // 丸め誤差対策のフォールバック
  }

  simulate(rounds: number): Map<string, number> {
    const wins = new Map<string, number>(this.processes.map((p) => [p.pid, 0]));
    for (let i = 0; i < rounds; i++) {
      const winner = this.draw();
      if (winner) wins.set(winner.pid, (wins.get(winner.pid) ?? 0) + 1);
    }
    return wins;
  }
}
```
