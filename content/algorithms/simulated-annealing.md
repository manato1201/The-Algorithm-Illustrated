---
name: 焼きなまし法(シミュレーテッド・アニーリング)
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(問題依存)
summary: 温度を下げながら悪化する解も確率的に受け入れ、局所最適から脱出する近似解法。
---

## 概要

金属を高温に熱してからゆっくり冷やすと、原子が整った低エネルギー状態(結晶構造)に落ち着く「焼きなまし(アニーリング)」という工程からヒントを得た最適化手法。1983年にKirkpatrickらが考案した。山登り法のように「改善する方向にしか進まない」戦略は、局所最適(それ以上どちらに動いても悪化する、しかし全体最適ではない場所)に簡単にはまり込んでしまう。焼きなまし法は、**あえて悪化する移動も確率的に受け入れる**ことで、この罠から抜け出す余地を作る。

## 仕組み

1. 「温度」というパラメータを高い値から始める
2. 現在の解の近傍からランダムに次の候補を選び、その候補が現在の解より**良ければ必ず受け入れる**
3. 候補が現在の解より**悪くても、ある確率で受け入れる**。この確率は、「どれだけ悪化するか」と「現在の温度」に依存し、**温度が高いほど、また悪化幅が小さいほど受け入れやすい**(具体的には `exp(-悪化幅 / 温度)` という式でよく計算される)
4. 反復を進めるごとに、温度を徐々に下げていく(冷却スケジュール)
5. 温度が高い序盤は広く探索し(悪化も積極的に受け入れる)、温度が下がるにつれて次第に山登り法に近い、慎重な探索へと移行していく

「最初は大胆に、最後は慎重に」という温度によるメリハリが、探索の広さと精度を両立させる鍵になっている。

## 特性・トレードオフ

- **計算量**: 問題や反復回数、冷却スケジュールに依存する。厳密解の保証はなく、実用的な近似解法として使われる
- **冷却スケジュールの設計が性能を左右する**: 温度を下げるペースが速すぎると局所最適に落ち着いてしまい、遅すぎると計算時間がかかりすぎる。このバランスの取り方が実践上のノウハウになる
- **山登り法との関係**: 温度を常に0に固定すれば、焼きなまし法は山登り法と等価になる。焼きなまし法は、山登り法に「温度による探索の緩急」という1つの軸を追加した一般化と捉えられる
- **使いどころ**: 巡回セールスマン問題のような組み合わせ最適化問題の近似解法、VLSI(集積回路)のレイアウト設計、ニューラルネットワークの重みの初期の学習手法としての応用、スケジューリング問題など

## 実装例

山登り法と同じ地形 `f(x) = -(x-3)^2 + 10` を対象に、温度を下げながら悪化する移動も確率的に受け入れる例で実装する。

```python
import math
import random


def objective(x: float) -> float:
    return -((x - 3) ** 2) + 10


def simulated_annealing(
    start_x: float,
    initial_temperature: float = 100.0,
    cooling_rate: float = 0.95,
    min_temperature: float = 1e-3,
    step_size: float = 1.0,
) -> float:
    current_x = start_x
    current_value = objective(current_x)
    best_x = current_x
    best_value = current_value
    temperature = initial_temperature

    while temperature > min_temperature:
        candidate_x = current_x + random.uniform(-step_size, step_size)
        candidate_value = objective(candidate_x)
        delta = candidate_value - current_value
        if delta > 0 or random.random() < math.exp(delta / temperature):
            current_x = candidate_x
            current_value = candidate_value
            if current_value > best_value:
                best_x, best_value = current_x, current_value
        temperature *= cooling_rate

    return best_x
```

```typescript
function objective(x: number): number {
  return -((x - 3) ** 2) + 10;
}

function simulatedAnnealing(
  startX: number,
  initialTemperature: number = 100.0,
  coolingRate: number = 0.95,
  minTemperature: number = 1e-3,
  stepSize: number = 1.0
): number {
  let currentX = startX;
  let currentValue = objective(currentX);
  let bestX = currentX;
  let bestValue = currentValue;
  let temperature = initialTemperature;

  while (temperature > minTemperature) {
    const candidateX = currentX + (Math.random() * 2 - 1) * stepSize;
    const candidateValue = objective(candidateX);
    const delta = candidateValue - currentValue;
    if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
      currentX = candidateX;
      currentValue = candidateValue;
      if (currentValue > bestValue) {
        bestX = currentX;
        bestValue = currentValue;
      }
    }
    temperature *= coolingRate;
  }

  return bestX;
}
```

```cpp
#include <cmath>
#include <random>

double objective(double x) {
    return -((x - 3) * (x - 3)) + 10;
}

double simulatedAnnealing(
    double startX,
    double initialTemperature = 100.0,
    double coolingRate = 0.95,
    double minTemperature = 1e-3,
    double stepSize = 1.0
) {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<double> uniform(-1.0, 1.0);
    std::uniform_real_distribution<double> uniform01(0.0, 1.0);

    double currentX = startX;
    double currentValue = objective(currentX);
    double bestX = currentX;
    double bestValue = currentValue;
    double temperature = initialTemperature;

    while (temperature > minTemperature) {
        double candidateX = currentX + uniform(gen) * stepSize;
        double candidateValue = objective(candidateX);
        double delta = candidateValue - currentValue;
        if (delta > 0 || uniform01(gen) < std::exp(delta / temperature)) {
            currentX = candidateX;
            currentValue = candidateValue;
            if (currentValue > bestValue) {
                bestX = currentX;
                bestValue = currentValue;
            }
        }
        temperature *= coolingRate;
    }

    return bestX;
}
```

```rust
use std::time::{SystemTime, UNIX_EPOCH};

fn objective(x: f64) -> f64 {
    -((x - 3.0).powi(2)) + 10.0
}

fn next_random(state: &mut u64) -> u64 {
    // xorshift64
    *state ^= *state << 13;
    *state ^= *state >> 7;
    *state ^= *state << 17;
    *state
}

fn next_unit_f64(state: &mut u64) -> f64 {
    (next_random(state) % 1_000_000) as f64 / 1_000_000.0
}

fn simulated_annealing(
    start_x: f64,
    initial_temperature: f64,
    cooling_rate: f64,
    min_temperature: f64,
    step_size: f64,
) -> f64 {
    let seed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;
    let mut state = if seed == 0 { 0x2545F4914F6CDD1D } else { seed };

    let mut current_x = start_x;
    let mut current_value = objective(current_x);
    let mut best_x = current_x;
    let mut best_value = current_value;
    let mut temperature = initial_temperature;

    while temperature > min_temperature {
        let candidate_x = current_x + (next_unit_f64(&mut state) * 2.0 - 1.0) * step_size;
        let candidate_value = objective(candidate_x);
        let delta = candidate_value - current_value;
        if delta > 0.0 || next_unit_f64(&mut state) < (delta / temperature).exp() {
            current_x = candidate_x;
            current_value = candidate_value;
            if current_value > best_value {
                best_x = current_x;
                best_value = current_value;
            }
        }
        temperature *= cooling_rate;
    }

    best_x
}
```

```csharp
static double Objective(double x)
{
    return -Math.Pow(x - 3, 2) + 10;
}

static double SimulatedAnnealing(
    double startX,
    double initialTemperature = 100.0,
    double coolingRate = 0.95,
    double minTemperature = 1e-3,
    double stepSize = 1.0)
{
    var rng = new Random();
    double currentX = startX;
    double currentValue = Objective(currentX);
    double bestX = currentX;
    double bestValue = currentValue;
    double temperature = initialTemperature;

    while (temperature > minTemperature)
    {
        double candidateX = currentX + (rng.NextDouble() * 2 - 1) * stepSize;
        double candidateValue = Objective(candidateX);
        double delta = candidateValue - currentValue;
        if (delta > 0 || rng.NextDouble() < Math.Exp(delta / temperature))
        {
            currentX = candidateX;
            currentValue = candidateValue;
            if (currentValue > bestValue)
            {
                bestX = currentX;
                bestValue = currentValue;
            }
        }
        temperature *= coolingRate;
    }

    return bestX;
}
```
