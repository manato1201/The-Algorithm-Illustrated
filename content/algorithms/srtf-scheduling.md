---
name: 最短残余時間優先(SRTF)スケジューリング
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(log n)(優先度キューでの挿入・取り出し、n待機プロセス数)
summary: 新しく到着したプロセスの残り実行時間が現在実行中のプロセスより短ければ即座に切り替える、最短ジョブ優先(SJF)のプリエンプティブ版で、平均待ち時間をさらに切り詰める代わりに切り替えコストと飢餓リスクを抱えるスケジューリング方式。
---

## 概要

[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)の非プリエンプティブ版は「一度実行を始めたプロセスは完了まで中断しない」という制約のもとで平均待ち時間を最小化するが、もし実行中に「今実行しているプロセスより明らかに短く終わる新しいプロセス」が到着したら、それでも今のプロセスを最後までやり切るべきだろうか。最短残余時間優先(SRTF, Shortest Remaining Time First)は、この問いに「否」と答える——新しく到着したプロセスの実行時間が、現在実行中のプロセスの**残りの**実行時間より短ければ、直ちに実行を中断して新しいプロセスに切り替える、[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)のプリエンプティブ版である。中断・再開を許すことで、非プリエンプティブ版よりもさらに平均待ち時間を切り詰められる可能性がある一方、その代償としてコンテキストスイッチの頻度が増え、飢餓のリスクも高まる。

## 仕組み

1. 各プロセスについて、到着時刻と実行に必要な時間(バースト時間)を把握しておく。実行中のプロセスについては「残り実行時間」を随時追跡する
2. 全ての待機プロセス(到着済みでまだ完了していないもの)を、残り実行時間の短い順に並べる優先度キューで管理する
3. 現在CPU上で実行中のプロセスがあれば、その残り実行時間を1単位時間ごとに減らしていく
4. 新しいプロセスが到着したとき、そのプロセスの実行時間(残り実行時間はまだ丸ごと)と、現在実行中のプロセスの残り実行時間を比較する。新しいプロセスの方が短ければ、実行中のプロセスを直ちに中断して優先度キューへ戻し(残り実行時間はそのまま保持する)、新しいプロセスの実行を開始する
5. 実行中のプロセスの残り実行時間が0になったら完了とし、優先度キューの中から残り実行時間が最短のプロセスを取り出して次に実行する。全プロセスが完了するまで2〜5を繰り返す

## 特性・トレードオフ

- **計算量**: 優先度キュー(ヒープ)を残り実行時間で管理すれば、挿入・取り出しはそれぞれ`O(log n)`——[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)や[優先度スケジューリング](/algorithms/priority-scheduling)と同じ実装基盤を共有できる
- **非プリエンプティブ版よりさらに強い平均待ち時間の最適性**: プリエンプションを許すという条件のもとでは、SRTFが平均待ち時間を最小化することが数学的に証明されている——[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)の非プリエンプティブ版が「一度始めたら中断しない」制約下での最適解であるのに対し、SRTFは「いつでも中断できる」というより緩い制約下での最適解であり、理論上はSJFと同等かそれ以上に平均待ち時間を短縮できる
- **切り替えコストと飢餓リスクの増大というトレードオフ**: プロセスを頻繁に中断・再開することでコンテキストスイッチのオーバーヘッドが[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)の非プリエンプティブ版より増える。また、短いプロセスが次々に到着し続けると、実行途中の長いプロセスが際限なく中断され続け、[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)よりもさらに深刻な飢餓が起こりうる——[最高応答比優先(HRRN)](/algorithms/hrrn-scheduling)のように待ち時間を考慮する仕組みを持たないため、この弱点はSRTF単体では解消されない
- **実行時間の予測という現実的な壁**: [最短ジョブ優先(SJF)](/algorithms/shortest-job-first)と同様、正確な実行時間(バースト時間)が既知であることが理論上の前提であり、実運用では過去の実行履歴からの推定に頼らざるを得ない
- **使いどころ**: 理論的な平均待ち時間の下限を確認するためのベンチマーク、実行時間の見積もりが高精度に得られるバッチ処理環境でのジョブスケジューリング、[ラウンドロビン](/algorithms/round-robin-scheduling)や[最高応答比優先(HRRN)](/algorithms/hrrn-scheduling)のような公平性を重視する方式と比較する際の対照例としてのOS教育

## 実装例

```python
import heapq


def srtf_schedule(processes: list[dict], horizon: int) -> list[str | None]:
    """processes: [{"id", "arrival", "burst"}, ...]。1単位時間ごとの実行プロセスIDのタイムラインを返す。"""
    remaining = {p["id"]: p["burst"] for p in processes}
    by_arrival = sorted(processes, key=lambda p: p["arrival"])
    heap: list[tuple[int, str]] = []  # (残り実行時間, プロセスID)
    timeline: list[str | None] = []
    idx = 0

    for now in range(horizon):
        while idx < len(by_arrival) and by_arrival[idx]["arrival"] <= now:
            pid = by_arrival[idx]["id"]
            heapq.heappush(heap, (remaining[pid], pid))
            idx += 1

        if not heap:
            timeline.append(None)
            continue

        rem, pid = heapq.heappop(heap)
        if remaining[pid] <= 0:
            continue
        remaining[pid] -= 1
        timeline.append(pid)
        if remaining[pid] > 0:
            heapq.heappush(heap, (remaining[pid], pid))

    return timeline
```

```typescript
interface Proc {
  id: string;
  arrival: number;
  burst: number;
}

// 単純な配列ベースの最小ヒープ(残り実行時間で比較)
class MinHeap {
  private items: [number, string][] = [];

  push(item: [number, string]): void {
    this.items.push(item);
    this.items.sort((a, b) => a[0] - b[0]);
  }

  pop(): [number, string] | undefined {
    return this.items.shift();
  }

  get size(): number {
    return this.items.length;
  }
}

function srtfSchedule(processes: Proc[], horizon: number): (string | null)[] {
  const remaining = new Map(processes.map((p) => [p.id, p.burst]));
  const byArrival = [...processes].sort((a, b) => a.arrival - b.arrival);
  const heap = new MinHeap();
  const timeline: (string | null)[] = [];
  let idx = 0;

  for (let now = 0; now < horizon; now++) {
    while (idx < byArrival.length && byArrival[idx].arrival <= now) {
      const pid = byArrival[idx].id;
      heap.push([remaining.get(pid)!, pid]);
      idx++;
    }

    if (heap.size === 0) {
      timeline.push(null);
      continue;
    }

    const [, pid] = heap.pop()!;
    const rem = remaining.get(pid)!;
    if (rem <= 0) continue;
    remaining.set(pid, rem - 1);
    timeline.push(pid);
    if (remaining.get(pid)! > 0) heap.push([remaining.get(pid)!, pid]);
  }

  return timeline;
}
```
