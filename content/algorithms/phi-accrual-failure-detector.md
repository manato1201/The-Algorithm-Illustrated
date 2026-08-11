---
name: φ増加型故障検知器(Phi Accrual Failure Detector)
category: 分散システム
subcategory: 障害検出・選出
complexity: O(1)(1回の疑わしさ評価あたり、償却)
summary: 「生きている/死んでいる」という二値判定の代わりに、ハートビートの到着間隔の統計分布から「今この瞬間に相手が故障している疑わしさ」を連続値φとして算出し、固定タイムアウトが抱えるジレンマを解消する。
---

## 概要

[Bullyアルゴリズム](/algorithms/bully-algorithm)のような分散システムの障害検出は、多くの場合「一定時間ハートビート(生存確認)が届かなければ故障とみなす」という固定タイムアウト方式に頼るが、これには根本的なジレンマがある——タイムアウトを短くすると、ネットワークの一時的な遅延だけで正常なノードを誤って故障と判定してしまう(偽陽性)。タイムアウトを長くすると、実際に故障したノードの検出が遅れる。φ増加型故障検知器は、2004年にナウマン・ヘイズドゥスとタッカイネンが提案した手法で、二値の「生きている/死んでいる」という判定を捨て、代わりに**「相手が故障している疑わしさ」を連続的に増加する数値φとして出力**する。φの値をどう解釈し、いつ「故障」と判断するかは、φを利用するアプリケーション側の判断に委ねられる、より柔軟な設計である。

## 仕組み

1. 監視対象のノードから、周期的にハートビート(生存を知らせる小さなメッセージ)を受信する
2. 過去に受信したハートビートの**到着間隔**(前回の受信から今回の受信までの時間)を、一定数分の履歴としてスライディングウィンドウに記録する
3. 記録した到着間隔の分布から、平均`μ`と標準偏差`σ`を計算する(正規分布を仮定することが多い)
4. 現在時刻`t_now`と最後にハートビートを受信した時刻`t_last`の差(経過時間)`Δ = t_now - t_last`を計算する
5. **φ値**を、「これまでの到着間隔の統計分布のもとで、これだけの時間ハートビートが来ない確率」の対数として計算する:`φ(t_now) = -log10(P_later(Δ))`(`P_later(Δ)`は、正規分布の累積分布関数を使って「間隔が`Δ`以上になる確率」を求める)。ハートビートが来ない時間が長引くほど、その確率はどんどん小さくなり、φは指数的に増加していく
6. アプリケーション側は、このφ値があるしきい値(例えば`φ > 8`)を超えたら「故障している可能性が非常に高い」と判断する、という形で利用する。しきい値の選び方によって、検出の速さと誤検出率のバランスを自由に調整できる

## 特性・トレードオフ

- **固定タイムアウトのジレンマからの解放**: 「何秒待てば故障とみなすか」という単一の閾値を最初から決め打ちする代わりに、過去の通信パターン(ネットワークの揺らぎの大きさ)に適応した「疑わしさ」を連続値で提供するため、ネットワーク環境ごとに手動でタイムアウト値をチューニングする必要が減る
- **アプリケーションごとに異なる許容度を反映できる**: あるサービスは誤検出を絶対に避けたい(φのしきい値を高く設定する)一方、別のサービスは多少の誤検出を許容してでも早期検出を優先したい(しきい値を低く設定する)、という異なる要求に、同じ検出メカニズムのまま対応できる
- **統計的な仮定への依存**: 到着間隔が正規分布に従うという仮定は、実際のネットワークの遅延分布(しばしば裾の重い分布になる)と厳密には一致しないことがある。この点を改善した、ヒストグラムベースでノンパラメトリックにP_laterを推定する変種も提案されている(Cassandra、Akkaなどの実システムで使われるφ Accrualの実装はこうした改良を含む)
- **使いどころ**: 分散データベース(Apache Cassandra)やアクターシステム(Akka)のクラスタメンバーシップ管理、マイクロサービス間のヘルスチェック、[Bullyアルゴリズム](/algorithms/bully-algorithm)や[Raft](/algorithms/raft)のようなリーダー選出プロトコルの障害検出部分の高度化

## 実装例

```python
import math
from collections import deque

class PhiAccrualFailureDetector:
    def __init__(self, window_size: int = 100, min_std_dev: float = 0.01):
        self.intervals: deque[float] = deque(maxlen=window_size)
        self.last_heartbeat: float | None = None
        self.min_std_dev = min_std_dev

    def heartbeat(self, timestamp: float) -> None:
        if self.last_heartbeat is not None:
            self.intervals.append(timestamp - self.last_heartbeat)
        self.last_heartbeat = timestamp

    def phi(self, now: float) -> float:
        if self.last_heartbeat is None or len(self.intervals) < 2:
            return 0.0

        mean = sum(self.intervals) / len(self.intervals)
        variance = sum((x - mean) ** 2 for x in self.intervals) / len(self.intervals)
        std_dev = max(math.sqrt(variance), self.min_std_dev)

        elapsed = now - self.last_heartbeat
        # 正規分布を仮定したP_later(elapsedより長い間隔が起きる確率)の近似計算
        y = (elapsed - mean) / std_dev
        p_later = 0.5 * math.erfc(y / math.sqrt(2))
        p_later = max(p_later, 1e-10)
        return -math.log10(p_later)
```

```typescript
class PhiAccrualFailureDetector {
  private intervals: number[] = [];
  private lastHeartbeat: number | null = null;
  constructor(
    private windowSize = 100,
    private minStdDev = 0.01,
  ) {}

  heartbeat(timestamp: number): void {
    if (this.lastHeartbeat !== null) {
      this.intervals.push(timestamp - this.lastHeartbeat);
      if (this.intervals.length > this.windowSize) this.intervals.shift();
    }
    this.lastHeartbeat = timestamp;
  }

  private erfc(x: number): number {
    const t = 1 / (1 + 0.5 * Math.abs(x));
    const tau =
      t *
      Math.exp(
        -x * x -
          1.26551223 +
          t *
            (1.00002368 +
              t *
                (0.37409196 +
                  t *
                    (0.09678418 +
                      t *
                        (-0.18628806 +
                          t *
                            (0.27886807 +
                              t *
                                (-1.13520398 +
                                  t *
                                    (1.48851587 +
                                      t * (-0.82215223 + t * 0.17087277)))))))),
      );
    return x >= 0 ? tau : 2 - tau;
  }

  phi(now: number): number {
    if (this.lastHeartbeat === null || this.intervals.length < 2) return 0;

    const mean =
      this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
    const variance =
      this.intervals.reduce((s, x) => s + (x - mean) ** 2, 0) /
      this.intervals.length;
    const stdDev = Math.max(Math.sqrt(variance), this.minStdDev);

    const elapsed = now - this.lastHeartbeat;
    const y = (elapsed - mean) / stdDev;
    const pLater = Math.max(0.5 * this.erfc(y / Math.SQRT2), 1e-10);
    return -Math.log10(pLater);
  }
}
```

```cpp
#include <deque>
#include <cmath>
#include <algorithm>

class PhiAccrualFailureDetector {
    std::deque<double> intervals;
    size_t windowSize;
    double minStdDev;
    bool hasLast = false;
    double lastHeartbeat = 0.0;

public:
    explicit PhiAccrualFailureDetector(size_t windowSize_ = 100, double minStdDev_ = 0.01)
        : windowSize(windowSize_), minStdDev(minStdDev_) {}

    void heartbeat(double timestamp) {
        if (hasLast) {
            intervals.push_back(timestamp - lastHeartbeat);
            if (intervals.size() > windowSize) intervals.pop_front();
        }
        lastHeartbeat = timestamp;
        hasLast = true;
    }

    double phi(double now) {
        if (!hasLast || intervals.size() < 2) return 0.0;

        double mean = 0.0;
        for (double x : intervals) mean += x;
        mean /= intervals.size();

        double variance = 0.0;
        for (double x : intervals) variance += (x - mean) * (x - mean);
        variance /= intervals.size();
        double stdDev = std::max(std::sqrt(variance), minStdDev);

        double elapsed = now - lastHeartbeat;
        double y = (elapsed - mean) / stdDev;
        double pLater = std::max(0.5 * std::erfc(y / std::sqrt(2.0)), 1e-10);
        return -std::log10(pLater);
    }
};
```

```rust
use std::collections::VecDeque;

struct PhiAccrualFailureDetector {
    intervals: VecDeque<f64>,
    window_size: usize,
    min_std_dev: f64,
    last_heartbeat: Option<f64>,
}

impl PhiAccrualFailureDetector {
    fn heartbeat(&mut self, timestamp: f64) {
        if let Some(last) = self.last_heartbeat {
            self.intervals.push_back(timestamp - last);
            if self.intervals.len() > self.window_size {
                self.intervals.pop_front();
            }
        }
        self.last_heartbeat = Some(timestamp);
    }

    fn erfc(x: f64) -> f64 {
        let t = 1.0 / (1.0 + 0.5 * x.abs());
        let tau = t
            * (-x * x - 1.26551223
                + t * (1.00002368
                    + t * (0.37409196
                        + t * (0.09678418
                            + t * (-0.18628806
                                + t * (0.27886807
                                    + t * (-1.13520398
                                        + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))))
            .exp();
        if x >= 0.0 { tau } else { 2.0 - tau }
    }

    fn phi(&self, now: f64) -> f64 {
        let last = match self.last_heartbeat {
            Some(l) if self.intervals.len() >= 2 => l,
            _ => return 0.0,
        };

        let mean: f64 = self.intervals.iter().sum::<f64>() / self.intervals.len() as f64;
        let variance: f64 =
            self.intervals.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / self.intervals.len() as f64;
        let std_dev = variance.sqrt().max(self.min_std_dev);

        let elapsed = now - last;
        let y = (elapsed - mean) / std_dev;
        let p_later = (0.5 * Self::erfc(y / 2f64.sqrt())).max(1e-10);
        -p_later.log10()
    }
}
```

```csharp
class PhiAccrualFailureDetector
{
    Queue<double> intervals = new();
    int windowSize;
    double minStdDev;
    double? lastHeartbeat;

    public PhiAccrualFailureDetector(int windowSize = 100, double minStdDev = 0.01)
    {
        this.windowSize = windowSize;
        this.minStdDev = minStdDev;
    }

    public void Heartbeat(double timestamp)
    {
        if (lastHeartbeat.HasValue)
        {
            intervals.Enqueue(timestamp - lastHeartbeat.Value);
            if (intervals.Count > windowSize) intervals.Dequeue();
        }
        lastHeartbeat = timestamp;
    }

    static double Erfc(double x)
    {
        double t = 1.0 / (1.0 + 0.5 * Math.Abs(x));
        double tau = t * Math.Exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
            t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
            t * (-0.82215223 + t * 0.17087277)))))))));
        return x >= 0 ? tau : 2 - tau;
    }

    public double Phi(double now)
    {
        if (!lastHeartbeat.HasValue || intervals.Count < 2) return 0;

        double mean = intervals.Average();
        double variance = intervals.Average(x => Math.Pow(x - mean, 2));
        double stdDev = Math.Max(Math.Sqrt(variance), minStdDev);

        double elapsed = now - lastHeartbeat.Value;
        double y = (elapsed - mean) / stdDev;
        double pLater = Math.Max(0.5 * Erfc(y / Math.Sqrt(2)), 1e-10);
        return -Math.Log10(pLater);
    }
}
```
