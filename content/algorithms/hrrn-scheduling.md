---
name: 最高応答比優先(HRRN)スケジューリング
category: スケジューリング
subcategory: CPUスケジューリング
complexity: O(n)(1回のスケジューリング判定あたり、n待機プロセス数の線形走査)
summary: 「(待ち時間+実行時間)/実行時間」で計算される応答比が最大のプロセスを次に実行することで、短いプロセスを優先しつつも待たされ続けたプロセスを自動的に救い上げる、非プリエンプティブなCPUスケジューリング方式。
---

## 概要

[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)は平均待ち時間を理論上最小化する魅力的な方式だが、実行時間の短いプロセスが次々に到着し続けると、実行時間の長いプロセスがいつまでも後回しにされる飢餓(starvation)が起こりうるという実用上の弱点を抱えている。1968年にエドワード・G・コフマン(Edward G. Coffman)らが提案した最高応答比優先(HRRN, Highest Response Ratio Next)スケジューリングは、実行時間の短さだけでなく「これまでどれだけ待たされたか」も同時に考慮する応答比という指標を導入することで、[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)の効率性を保ちながら、飢餓問題を実用的なレベルまで緩和する非プリエンプティブな方式である。

## 仕組み

1. 各プロセスについて、到着時刻と実行に必要な時間(バースト時間)を把握しておく
2. CPUが空くたびに、その時点で到着済み(待機中)の全プロセスについて、応答比を次の式で計算する: `応答比 = (待ち時間 + 実行時間) / 実行時間`。ここで「待ち時間」は、そのプロセスが到着してから現在までに経過した時間を指す
3. 応答比が最大のプロセスを選んで実行する。一度選ばれたプロセスは完了まで中断されない(非プリエンプティブ)
4. 応答比の式を見ると、実行時間が短いプロセスほど分母が小さく応答比が大きくなりやすい([最短ジョブ優先](/algorithms/shortest-job-first)的な性質を内包する)一方、待ち時間が長くなるほど分子(待ち時間+実行時間)が増え続けるため、実行時間が長いプロセスであっても待たされ続ければいずれ応答比が他を上回る瞬間が訪れる(時間経過によって優先度が自然に押し上げられる、[優先度スケジューリング](/algorithms/priority-scheduling)における「エイジング」を数式に組み込んだ形と見なせる)
5. 選ばれたプロセスが完了したら、CPUが再び空いた時点で残りの待機プロセスについて2〜4を繰り返す

## 特性・トレードオフ

- **計算量**: 応答比はプロセスが選ばれるたびにその場で全待機プロセスに対して計算し直す必要があるため、1回の判定に`O(n)`かかる——[最短ジョブ優先(SJF)](/algorithms/shortest-job-first)や[優先度スケジューリング](/algorithms/priority-scheduling)がヒープで`O(log n)`を実現できるのと異なり、応答比が時間の経過とともに刻々と変化する(静的な優先度ではない)ため、単純なヒープでは維持できず、都度の線形走査か、より複雑な時間依存の構造が必要になる
- **飢餓の実用的な緩和という核心的な利点**: [最短ジョブ優先(SJF)](/algorithms/shortest-job-first)が理論上の最適性と引き換えに長いプロセスの飢餓を許してしまうのに対し、HRRNは待ち時間が応答比の分子に直接加算される設計により、どれだけ実行時間が長いプロセスでも待ち続ければ必ず応答比が上昇し、いずれ選ばれることが保証される——[優先度スケジューリング](/algorithms/priority-scheduling)における明示的なエイジング補正を、追加の仕組みなしに応答比の定義そのものに組み込んでいる点が設計上の工夫である
- **非プリエンプティブゆえの単純さと限界**: 一度実行を始めたプロセスは完了まで中断されないため、[ラウンドロビン](/algorithms/round-robin-scheduling)のような対話的な応答性は持たない。実行時間の長いプロセスが実行を始めてしまうと、その間は他のプロセスの応答比がどれだけ高くなっても割り込めない
- **実行時間の予測という現実的な壁**: [最短ジョブ優先(SJF)](/algorithms/shortest-job-first)と同様、応答比の計算にはプロセスの実行時間(バースト時間)が既知であることが前提になる。実運用では過去の実行履歴からの推定値を使う近似的な適用にとどまることが多い
- **使いどころ**: バッチ処理システムにおけるジョブスケジューリング(実行時間の見積もりが可能で、かつ飢餓を避けたい場合)、[最短ジョブ優先](/algorithms/shortest-job-first)の飢餓問題を教育的に説明する題材、印刷ジョブやバッチ変換タスクのように「短いジョブを優先しつつも長いジョブを塩漬けにしたくない」実務的なキュー管理

## 実装例

```python
def hrrn_schedule(processes: list[dict]) -> list[str]:
    """processes: [{"name", "arrival", "burst"}, ...]。実行順序(プロセス名のリスト)を返す。"""
    remaining = sorted(processes, key=lambda p: p["arrival"])
    order: list[str] = []
    time = remaining[0]["arrival"]

    while remaining:
        available = [p for p in remaining if p["arrival"] <= time]
        if not available:
            # まだ誰も到着していなければ、次の到着時刻までジャンプする
            time = min(p["arrival"] for p in remaining)
            continue

        def response_ratio(p: dict) -> float:
            wait = time - p["arrival"]
            return (wait + p["burst"]) / p["burst"]

        current = max(available, key=response_ratio)
        order.append(current["name"])
        time += current["burst"]
        remaining.remove(current)

    return order
```

```typescript
interface Proc {
  name: string;
  arrival: number;
  burst: number;
}

function hrrnSchedule(processes: Proc[]): string[] {
  let remaining = [...processes].sort((a, b) => a.arrival - b.arrival);
  const order: string[] = [];
  let time = remaining[0].arrival;

  while (remaining.length > 0) {
    const available = remaining.filter((p) => p.arrival <= time);
    if (available.length === 0) {
      time = Math.min(...remaining.map((p) => p.arrival));
      continue;
    }

    const responseRatio = (p: Proc): number => {
      const wait = time - p.arrival;
      return (wait + p.burst) / p.burst;
    };

    const current = available.reduce((a, b) => (responseRatio(b) > responseRatio(a) ? b : a));
    order.push(current.name);
    time += current.burst;
    remaining = remaining.filter((p) => p !== current);
  }

  return order;
}
```
