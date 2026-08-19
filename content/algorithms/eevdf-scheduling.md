---
name: EEVDF(最早適格仮想締切優先)スケジューリング
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(log n)(赤黒木への挿入・最小仮想締切の取得、n実行可能プロセス数)
summary: 各タスクに「公平配分に追いついて実行を許される適格時刻」と「要求した実行量に基づく仮想締切」を計算し、適格なタスクの中で仮想締切が最も早いものを選び続けることで、完全公平スケジューラ(CFS)より厳密なレイテンシ制御を実現し、Linuxカーネル6.6でCFSの後継として採用されたスケジューリング方式。
---

## 概要

[完全公平スケジューラ(CFS)](/algorithms/completely-fair-scheduler)は、各プロセスの仮想実行時間(vruntime)を[赤黒木](/algorithms/red-black-tree)で管理し、常に最もvruntimeの小さいプロセスを選ぶことで公平性を実現してきた。しかしCFSの選択基準は「これまでどれだけ実行が遅れているか」だけを見ており、「今どれだけの量の実行を要求しているか」という情報を考慮しない——そのため、ごく短い処理を求めているレイテンシに敏感なタスクが、たまたまvruntimeがわずかに小さいだけの別の(実は長時間CPUを使いたい)タスクの後ろに回されてしまう場合があり、最悪ケースのレイテンシを厳密には保証しにくいという弱点があった。EEVDF(Earliest Eligible Virtual Deadline First、最早適格仮想締切優先)は、1995年にストイカ(Stoica)とアブデルワハブ(Abdel-Wahab)によって提案されたアルゴリズムで、各タスクに「公平配分に追いついて実行可能になる時刻(適格時刻)」と「要求した実行量をもとに算出される仮想締切」の2つの値を持たせ、**適格なタスクの中で仮想締切が最も早いもの**を選ぶことで、CFSより明示的にレイテンシを制御できるようにする。この設計がLinuxカーネル開発者に評価され、2023年リリースのLinuxカーネル6.6で、20年近く標準スケジューラの座にあったCFSを置き換える形で正式に採用された。

## 仕組み

1. 各タスクは、[完全公平スケジューラ](/algorithms/completely-fair-scheduler)と同様に優先度(nice値)から導かれる**重み**を持ち、実際に消費したCPU時間を重みで割り引いた**仮想時間**の概念を使う
2. 各タスクについて、そのタスクが「理想的な公平配分モデルの上でどれだけ実行を受け取るべきだったか」と「実際にどれだけ受け取ったか」の差分を**ラグ(lag)**として追跡する。ラグが0以上(理想以上に実行できている、または追いついている)のタスクを**適格(eligible)**と呼ぶ
3. タスクが新たに実行要求を出す(スケジューラのキューに入る)たびに、要求する実行量(スライス長)を重みで割った時間を、現在の仮想時間に加えた値を**仮想締切(virtual deadline)**として計算する——「これだけの量を要求しているのだから、遅くともこの仮想時刻までには一区切りついているべきだ」という締切に相当する
4. スケジューラは、実行可能なタスクの中から**適格なタスクに限定した上で、仮想締切が最も早いもの**を選んで実行する。適格性のフィルタとその中での締切優先という2段階の基準を組み合わせる点がCFSの単純な「最小vruntime選択」との違いである
5. Linuxの実装では、CFSと同様に実行可能タスクを[赤黒木](/algorithms/red-black-tree)(仮想締切をキーとする)で管理しつつ、各部分木で「その部分木内の最小仮想締切」も併せて保持する拡張(augmented tree)を使うことで、適格タスクの中から最小仮想締切を持つものを`O(log n)`で見つけられるようにしている
6. タスクが実行を終える、あるいは自分の要求スライスを使い切ると、ラグと仮想時間が更新され、次の要求に応じて新しい仮想締切が再計算されて木に再挿入される。これがCFSの「実行後にvruntimeを更新して再挿入する」手順に相当する部分である

## 特性・トレードオフ

- **計算量**: [完全公平スケジューラ](/algorithms/completely-fair-scheduler)と同じく、選択・挿入いずれも[赤黒木](/algorithms/red-black-tree)ベースの構造で`O(log n)`——EEVDFへの移行はアルゴリズム全体の漸近計算量を悪化させることなく、より精密なレイテンシ制御を得られる設計になっている
- **[CFS](/algorithms/completely-fair-scheduler)との本質的な違い**: CFSは「これまでどれだけ待たされたか(vruntime)」のみに基づいて選択するのに対し、EEVDFは「要求している実行量に対して締切をどれだけ守れそうか(仮想締切)」を明示的にモデル化する。この違いにより、少量の実行を求めるレイテンシ敏感なタスク(対話的な処理、音声・入力処理など)が、大きな実行量を求める別のタスクの後ろに不必要に長く待たされる状況をより確実に避けられる
- **タスクごとのスライス長の指定**: EEVDFの設計では、タスクが自分の要求スライス長を(スケジューラ属性を通じて)ある程度指定でき、それが仮想締切の計算に反映される。CFSが「ターゲットレイテンシ」というシステム全体でほぼ一律のヒューリスティックにスライスの目安を委ねていたのに対し、EEVDFはタスク単位で応答性とスループットのバランスを調整できる余地を持つ
- **Linuxカーネルでの採用経緯**: EEVDFはLinux 6.6(2023年)で、20年近くデフォルトだったCFSの後継として採用された。基本的な木構造による管理方式はCFSから引き継ぎつつ、選択基準を「最小vruntime」から「適格タスクの中での最早仮想締切」に置き換えることで、ゲームや対話的用途などレイテンシに敏感なワークロードでの応答性改善が主な採用動機とされている
- **設計の系譜**: EEVDFの理論自体は1995年に発表された古いアルゴリズムであり、公平キューイング(Fair Queuing)の系譜——ネットワークのパケットスケジューリングにおける加重公平キューイング(WFQ)などとも思想的に近い——に位置する。CPUスケジューラとしての実装が広く使われるようになったのは、Linuxカーネルへの採用という比較的最近の出来事である
- **使いどころ**: Linuxカーネル6.6以降の標準CPUスケジューラ(通常のタイムシェアリングプロセス向け)、対話的な応答性が重視されるデスクトップ・ゲーミング用途、レイテンシ要求の異なる多様なワークロードが混在するサーバ環境

## 実装例

赤黒木の代わりにソート済みリストへの挿入で仮想締切順の管理を模擬し、EEVDFの核である「ラグから適格性を判定し、適格なタスクの中で最小仮想締切のものを選ぶ」という選択ロジックをシミュレーションする。

```python
from dataclasses import dataclass


@dataclass
class EevdfTask:
    name: str
    weight: float          # nice値から導かれる重み。大きいほど優先度が高い
    virtual_time: float = 0.0   # このタスクの仮想時間(消費した実時間を重みで割ったもの)
    lag: float = 0.0             # 理想配分との差分。0以上なら適格
    virtual_deadline: float = 0.0


class EevdfScheduler:
    def __init__(self) -> None:
        self.tasks: list[EevdfTask] = []
        self.system_virtual_time = 0.0  # 全タスクの重み付き平均進行度の近似

    def _is_eligible(self, task: EevdfTask) -> bool:
        return task.lag >= 0.0

    def enqueue(self, task: EevdfTask, requested_slice: float) -> None:
        """要求スライス長(実時間換算)から仮想締切を計算してキューへ入れる。"""
        task.virtual_deadline = task.virtual_time + requested_slice / task.weight
        self.tasks.append(task)

    def pick_next(self) -> EevdfTask | None:
        """適格なタスクの中で仮想締切が最も早いものを選ぶ。"""
        eligible = [t for t in self.tasks if self._is_eligible(t)]
        pool = eligible if eligible else self.tasks
        if not pool:
            return None
        return min(pool, key=lambda t: t.virtual_deadline)

    def run(self, task: EevdfTask, actual_time: float) -> None:
        """actual_time分だけ実行し、仮想時間とラグを更新する。"""
        base_weight = 1.0  # nice=0の基準重み
        delta_virtual = actual_time * (base_weight / task.weight)
        task.virtual_time += delta_virtual
        self.system_virtual_time += actual_time / max(1, len(self.tasks))
        # 理想配分(system_virtual_time相当)との差を近似的にラグへ反映する
        task.lag = self.system_virtual_time - task.virtual_time

    def simulate(self, tasks: list[tuple[EevdfTask, float]], ticks: int, quantum: float = 1.0) -> list[str]:
        for task, req_slice in tasks:
            self.enqueue(task, req_slice)
        timeline: list[str] = []
        for _ in range(ticks):
            current = self.pick_next()
            if current is None:
                timeline.append("idle")
                continue
            timeline.append(current.name)
            self.run(current, quantum)
        return timeline
```

```typescript
interface EevdfTask {
  name: string;
  weight: number; // nice値から導かれる重み。大きいほど優先度が高い
  virtualTime: number; // このタスクの仮想時間
  lag: number; // 理想配分との差分。0以上なら適格
  virtualDeadline: number;
}

class EevdfScheduler {
  private tasks: EevdfTask[] = [];
  private systemVirtualTime = 0; // 全タスクの重み付き平均進行度の近似

  private isEligible(task: EevdfTask): boolean {
    return task.lag >= 0;
  }

  enqueue(task: EevdfTask, requestedSlice: number): void {
    // 要求スライス長(実時間換算)から仮想締切を計算してキューへ入れる
    task.virtualDeadline = task.virtualTime + requestedSlice / task.weight;
    this.tasks.push(task);
  }

  pickNext(): EevdfTask | null {
    const eligible = this.tasks.filter((t) => this.isEligible(t));
    const pool = eligible.length > 0 ? eligible : this.tasks;
    if (pool.length === 0) return null;
    return pool.reduce((best, t) => (t.virtualDeadline < best.virtualDeadline ? t : best));
  }

  run(task: EevdfTask, actualTime: number): void {
    const baseWeight = 1.0; // nice=0の基準重み
    const deltaVirtual = actualTime * (baseWeight / task.weight);
    task.virtualTime += deltaVirtual;
    this.systemVirtualTime += actualTime / Math.max(1, this.tasks.length);
    // 理想配分(systemVirtualTime相当)との差を近似的にラグへ反映する
    task.lag = this.systemVirtualTime - task.virtualTime;
  }

  simulate(tasks: [EevdfTask, number][], ticks: number, quantum = 1.0): string[] {
    for (const [task, reqSlice] of tasks) this.enqueue(task, reqSlice);
    const timeline: string[] = [];
    for (let i = 0; i < ticks; i++) {
      const current = this.pickNext();
      if (current === null) {
        timeline.push("idle");
        continue;
      }
      timeline.push(current.name);
      this.run(current, quantum);
    }
    return timeline;
  }
}
```
