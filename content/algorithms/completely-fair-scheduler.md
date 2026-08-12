---
name: 完全公平スケジューラ(CFS)
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(log n)(赤黒木への挿入・最小値取得、n実行可能プロセス数)
summary: 各プロセスの仮想実行時間(vruntime)を赤黒木で管理し、常に最もvruntimeの小さい(最も待たされている)プロセスを選び続けることで、タイムスライスを明示的に割り当てずに公平なCPU配分を実現するLinuxカーネルの標準スケジューラ。
---

## 概要

[ラウンドロビンスケジューリング](/algorithms/round-robin-scheduling)は固定のタイムスライスを順番に割り当てることで公平性を担保するが、優先度の異なるプロセスへの配分比率を柔軟に変えたい場合、タイムスライスの長さをプロセスごとに調整する必要があり設計が煩雑になる。完全公平スケジューラ(Completely Fair Scheduler、CFS)は、2007年にLinuxカーネル2.6.23で導入された標準のCPUスケジューラで、発想を大きく転換する——「次にどのプロセスにどれだけの時間を割り当てるか」を考える代わりに、**「理想的には全プロセスが同時に、同じ速さでCPUを共有し続けている」という仮想モデルを想定し、実際の実行が理想からどれだけ遅れているかを表す指標(仮想実行時間、vruntime)を管理し、常に最も遅れているプロセスを選んで実行する**。この「常に最も待たされているものを選ぶ」という選択を効率的に行うために、実行可能な全プロセスを[赤黒木](/algorithms/red-black-tree)というvruntime順に整列した平衡二分探索木で管理する。「完全に公平」という名前は、この理想化されたモデル(全プロセスが無限に細かい時間刻みでCPUを同時共有する)に由来する。

## 仕組み

1. 各プロセスは**vruntime**(仮想実行時間)という値を持つ。プロセスが実際にCPU上で実行された時間は、そのプロセスの優先度(nice値から導かれる重み)に応じて重み付けされ、vruntimeに加算される——優先度が高い(重みが大きい)プロセスほど、同じ実行時間でもvruntimeの増加が小さくなる
2. 実行可能な全プロセスは、vruntimeをキーとした[赤黒木](/algorithms/red-black-tree)で管理される。木の最も左のノード(最小vruntimeを持つノード)が、次にCPUを割り当てるべきプロセスになる
3. スケジューラは、赤黒木から最小vruntimeのプロセスを取り出して(`O(log n)`)実行させる。このプロセスは一度木から外れ、実行中は木の管理対象外になる
4. 実行中のプロセスは、実際にCPU時間を消費するたびにvruntimeが増加していく。ある程度実行してvruntimeが他の待機プロセスを上回った(あるいは一定の実行時間の目安に達した)時点で、プロセスは中断され再び赤黒木に挿入される(`O(log n)`)
5. 1〜4を繰り返すことで、vruntimeの小さいプロセス(=これまであまり実行されておらず、相対的に待たされているプロセス)が優先的に選ばれ続け、結果として全プロセスのvruntimeが均等なペースで増加していく——これが「公平」の実体である
6. 新しく生成されたプロセスやI/O待ちから復帰したプロセスには、既存プロセスの最小vruntime付近の値が初期値として与えられ、極端に有利・不利にならないよう調整される

## 特性・トレードオフ

- **[ラウンドロビン](/algorithms/round-robin-scheduling)との比較**: ラウンドロビンは固定のタイムスライスをキューの順番通りに割り当てる単純さが利点だが、優先度に応じた配分比率の調整が難しい。CFSはタイムスライスという固定概念を持たず、優先度の違いを「vruntimeの増加速度の重み」として自然に組み込めるため、[優先度スケジューリング](/algorithms/priority-scheduling)が抱えていた「エイジングによる補正」のような後付けの仕組みなしに、優先度と公平性を統一的なモデルで扱える
- **計算量**: プロセスの選択(最小vruntimeの取得)・挿入いずれも[赤黒木](/algorithms/red-black-tree)を使うことで`O(log n)`。赤黒木は挿入・削除のたびの回転コストが比較的小さいため、頻繁にプロセスが出入りするスケジューラの実行可能キューという用途に適している——赤黒木の記事でも「Linuxカーネルの完全公平スケジューラ」がその代表的な採用例として挙げられている
- **「タイムスライス」という概念からの脱却**: 従来のスケジューラの多くは「各プロセスに何ミリ秒割り当てるか」を明示的に決めていたが、CFSは「理想的な公平配分からの乖離(vruntimeの差)を最小化し続ける」という目標関数だけを持ち、結果として動的に適切な実行時間が決まる。この設計により、実行可能プロセス数が増減しても公平性の性質が保たれやすい
- **nice値と重みの設計**: プロセスの優先度(nice値、-20〜19)は、vruntimeの増加速度を決める重みに変換される。この重み付けの設計(nice値が1変わるごとにCPU配分比率がおよそ10%変わるよう調整されている)は、公平性と優先度制御を両立させるための実務的なチューニングであり、CFSの理論的な単純さと現実的な要求のバランスを取る部分である
- **使いどころ**: Linuxカーネルの標準プロセススケジューラ(通常のタイムシェアリングプロセス向け)、コンテナオーケストレーション基盤(CgroupsによるCPU配分制限もCFSの仕組みを利用)、マルチテナント環境における公平なリソース配分が求められるあらゆる場面

## 実装例

赤黒木の代わりにソート済みリストへの挿入(`bisect`/二分探索)でvruntime順の管理を模擬し、CFSの本質である「常に最小vruntimeのプロセスを選び、実行時間に応じてvruntimeを重み付き加算する」という選択・更新ロジックをシミュレーションする。

```python
import bisect
from dataclasses import dataclass, field


@dataclass
class CfsProcess:
    pid: str
    weight: float  # nice値から導かれる重み。大きいほど優先度が高い
    vruntime: float = 0.0


class CompletelyFairScheduler:
    def __init__(self) -> None:
        self._runnable: list[CfsProcess] = []  # vruntime昇順を維持する

    def _insert(self, proc: CfsProcess) -> None:
        keys = [p.vruntime for p in self._runnable]
        idx = bisect.bisect_left(keys, proc.vruntime)
        self._runnable.insert(idx, proc)

    def enqueue(self, proc: CfsProcess) -> None:
        if self._runnable:
            min_vruntime = self._runnable[0].vruntime
            proc.vruntime = max(proc.vruntime, min_vruntime)
        self._insert(proc)

    def pick_next(self) -> CfsProcess | None:
        """最小vruntimeのプロセスを木(ここではソート済みリスト)から取り出す"""
        if not self._runnable:
            return None
        return self._runnable.pop(0)

    def run_slice(self, proc: CfsProcess, actual_time: float) -> None:
        """actual_time分だけ実行し、重みに応じてvruntimeを加算してから再挿入する"""
        base_weight = 1.0  # nice=0の基準重み
        proc.vruntime += actual_time * (base_weight / proc.weight)
        self._insert(proc)

    def simulate(self, procs: list[CfsProcess], ticks: int, quantum: float = 1.0) -> list[str]:
        for p in procs:
            self.enqueue(p)
        timeline: list[str] = []
        for _ in range(ticks):
            current = self.pick_next()
            if current is None:
                timeline.append("idle")
                continue
            timeline.append(current.pid)
            self.run_slice(current, quantum)
        return timeline
```

```typescript
interface CfsProcess {
  pid: string;
  weight: number; // nice値から導かれる重み。大きいほど優先度が高い
  vruntime: number;
}

class CompletelyFairScheduler {
  private runnable: CfsProcess[] = []; // vruntime昇順を維持する

  private insert(proc: CfsProcess): void {
    let idx = 0;
    while (idx < this.runnable.length && this.runnable[idx].vruntime <= proc.vruntime) {
      idx++;
    }
    this.runnable.splice(idx, 0, proc);
  }

  enqueue(proc: CfsProcess): void {
    if (this.runnable.length > 0) {
      const minVruntime = this.runnable[0].vruntime;
      proc.vruntime = Math.max(proc.vruntime, minVruntime);
    }
    this.insert(proc);
  }

  pickNext(): CfsProcess | null {
    // 最小vruntimeのプロセスを木(ここではソート済み配列)から取り出す
    return this.runnable.shift() ?? null;
  }

  runSlice(proc: CfsProcess, actualTime: number): void {
    const baseWeight = 1.0; // nice=0の基準重み
    proc.vruntime += actualTime * (baseWeight / proc.weight);
    this.insert(proc);
  }

  simulate(procs: CfsProcess[], ticks: number, quantum = 1.0): string[] {
    for (const p of procs) this.enqueue(p);
    const timeline: string[] = [];
    for (let i = 0; i < ticks; i++) {
      const current = this.pickNext();
      if (current === null) {
        timeline.push("idle");
        continue;
      }
      timeline.push(current.pid);
      this.runSlice(current, quantum);
    }
    return timeline;
  }
}
```
