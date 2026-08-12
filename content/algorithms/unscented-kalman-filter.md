---
name: アンセンテッドカルマンフィルタ(UKF)
category: 制御・ロボティクス
subcategory: 状態推定
complexity: O(n³)(nは状態変数の次元数、共分散行列の演算に依存)
summary: 非線形な系をヤコビ行列で線形近似する[拡張カルマンフィルタ](/algorithms/extended-kalman-filter)の代わりに、確率分布を代表する少数の「シグマ点」を選んで非線形関数へ直接通すことで、線形化の誤差なしに平均・共分散を伝播させる。
---

## 概要

[拡張カルマンフィルタ(EKF)](/algorithms/extended-kalman-filter)は、非線形なシステムをヤコビ行列(1次のテイラー展開)で線形近似することで[カルマンフィルタ](/algorithms/kalman-filter)の枠組みを非線形系に拡張したが、この線形近似は非線形性が強い(曲がり具合が急な)システムでは無視できない誤差を生み、ヤコビ行列の解析的な導出自体も実装の手間になる。アンセンテッドカルマンフィルタ(UKF)は、1997年にシモン・ジュリエとジェフリー・アールマンが提案した手法で、発想を転換する——**関数を線形近似する代わりに、現在の確率分布(平均と共分散)を代表する少数の「シグマ点」を決定論的に選び、それらの点を非線形関数にそのまま通してから、変換後の点群から新しい平均・共分散を再構成する**。この「アンセンテッド変換」により、ヤコビ行列の導出を必要とせず、非線形性による誤差もEKFより小さく抑えられることが多い。

## 仕組み

1. 現在の状態推定値(平均`x̂`、共分散`P`、次元`n`)から、**`2n+1`個のシグマ点**を決定論的に選ぶ。中心の1点は平均`x̂`そのもの、残り`2n`点は`x̂ ± (√((n+λ)P))_i`(共分散行列の平方根のi列目を、スケーリングパラメータ`λ`で調整して平均からずらした点)として選ぶ。各シグマ点には、平均・共分散の再構成で使う重み`w_i`が割り当てられる
2. **予測ステップ**: 全てのシグマ点を、システムの(非線形な)状態遷移関数`f`にそのまま通す(線形近似は一切行わない)。変換後のシグマ点群の重み付き平均・重み付き共分散を計算することで、予測ステップ後の状態の平均・共分散を得る
3. 同様に、シグマ点群を観測関数`h`に通し、予測される観測値の平均・共分散、および状態と観測の共分散(カルマンゲインの計算に必要)を求める
4. 実際の観測値と、シグマ点から予測した観測値の差(イノベーション)を使い、[カルマンフィルタ](/algorithms/kalman-filter)と同様の形でカルマンゲインを計算し、状態推定値と共分散を更新する
5. 1〜4を観測が得られるたびに繰り返す

## 特性・トレードオフ

- **ヤコビ行列の導出が不要**: [拡張カルマンフィルタ](/algorithms/extended-kalman-filter)では状態遷移関数・観測関数それぞれのヤコビ行列を解析的に(手計算または数式処理で)導出する必要があるが、UKFは非線形関数をそのまま(ブラックボックスとして)評価するだけでよく、実装が単純になる場面が多い
- **非線形性が強い系での精度向上**: シグマ点を実際の非線形関数に通すため、テイラー展開の1次近似では捉えられない非線形性の影響を、ある程度正確に(2次の項まで)捉えられることが理論的に示されている。強い非線形性を持つシステムでは、EKFより推定精度が高くなることが多い
- **計算コストの違い**: UKFは`2n+1`個のシグマ点それぞれについて状態遷移関数・観測関数を評価する必要があり、EKFの1回のヤコビ行列計算+線形変換に比べて、関数評価の回数自体は増える。ただし複雑な非線形関数のヤコビ行列を毎回計算するコストと比べると、実務上はUKFの方が有利になることも多い
- **使いどころ**: 移動ロボット・ドローンの自己位置推定(強い非線形性を持つ運動モデルやセンサーモデルを使う場合)、宇宙機の姿勢推定、金融工学における非線形な状態空間モデルのフィルタリング、[パーティクルフィルタ](/algorithms/particle-filter)ほどの計算コストをかけずに非線形性へ対応したい中間的な選択肢

## 実装例

簡略化した1次元の非線形システムに対するUKFの核心部分(シグマ点の生成と予測ステップ)を示す。

```python
import math

def generate_sigma_points(mean: float, variance: float, kappa: float = 0.0) -> tuple[list[float], list[float]]:
    """1次元版: 3個のシグマ点(中心+左右)とその重みを生成する。"""
    n = 1
    lam = kappa
    sigma_points = [mean, mean + math.sqrt((n + lam) * variance), mean - math.sqrt((n + lam) * variance)]
    weights = [lam / (n + lam), 1 / (2 * (n + lam)), 1 / (2 * (n + lam))]
    return sigma_points, weights

def ukf_predict(
    mean: float, variance: float, process_noise: float,
    state_transition_fn: "Callable[[float], float]",
) -> tuple[float, float]:
    sigma_points, weights = generate_sigma_points(mean, variance)
    transformed = [state_transition_fn(sp) for sp in sigma_points]

    new_mean = sum(w * t for w, t in zip(weights, transformed))
    new_variance = sum(w * (t - new_mean) ** 2 for w, t in zip(weights, transformed)) + process_noise
    return new_mean, new_variance
```

```typescript
function generateSigmaPoints(mean: number, variance: number, kappa = 0.0): { points: number[]; weights: number[] } {
  const n = 1;
  const lam = kappa;
  const points = [mean, mean + Math.sqrt((n + lam) * variance), mean - Math.sqrt((n + lam) * variance)];
  const weights = [lam / (n + lam), 1 / (2 * (n + lam)), 1 / (2 * (n + lam))];
  return { points, weights };
}

function ukfPredict(
  mean: number, variance: number, processNoise: number, stateTransitionFn: (x: number) => number,
): { mean: number; variance: number } {
  const { points, weights } = generateSigmaPoints(mean, variance);
  const transformed = points.map(stateTransitionFn);

  const newMean = weights.reduce((sum, w, i) => sum + w * transformed[i], 0);
  const newVariance =
    weights.reduce((sum, w, i) => sum + w * (transformed[i] - newMean) ** 2, 0) + processNoise;
  return { mean: newMean, variance: newVariance };
}
```

```cpp
#include <vector>
#include <cmath>
#include <functional>

std::pair<std::vector<double>, std::vector<double>> generateSigmaPoints(double mean, double variance, double kappa = 0.0) {
    double n = 1.0, lam = kappa;
    std::vector<double> points = {mean, mean + std::sqrt((n + lam) * variance), mean - std::sqrt((n + lam) * variance)};
    std::vector<double> weights = {lam / (n + lam), 1 / (2 * (n + lam)), 1 / (2 * (n + lam))};
    return {points, weights};
}

std::pair<double, double> ukfPredict(
    double mean, double variance, double processNoise, std::function<double(double)> stateTransitionFn) {
    auto [points, weights] = generateSigmaPoints(mean, variance);
    std::vector<double> transformed;
    for (double p : points) transformed.push_back(stateTransitionFn(p));

    double newMean = 0.0;
    for (size_t i = 0; i < weights.size(); i++) newMean += weights[i] * transformed[i];

    double newVariance = processNoise;
    for (size_t i = 0; i < weights.size(); i++) newVariance += weights[i] * std::pow(transformed[i] - newMean, 2);

    return {newMean, newVariance};
}
```

```rust
fn generate_sigma_points(mean: f64, variance: f64, kappa: f64) -> (Vec<f64>, Vec<f64>) {
    let n = 1.0;
    let lam = kappa;
    let points = vec![mean, mean + ((n + lam) * variance).sqrt(), mean - ((n + lam) * variance).sqrt()];
    let weights = vec![lam / (n + lam), 1.0 / (2.0 * (n + lam)), 1.0 / (2.0 * (n + lam))];
    (points, weights)
}

fn ukf_predict(mean: f64, variance: f64, process_noise: f64, state_transition_fn: impl Fn(f64) -> f64) -> (f64, f64) {
    let (points, weights) = generate_sigma_points(mean, variance, 0.0);
    let transformed: Vec<f64> = points.iter().map(|&p| state_transition_fn(p)).collect();

    let new_mean: f64 = weights.iter().zip(&transformed).map(|(w, t)| w * t).sum();
    let new_variance: f64 =
        weights.iter().zip(&transformed).map(|(w, t)| w * (t - new_mean).powi(2)).sum::<f64>() + process_noise;

    (new_mean, new_variance)
}
```

```csharp
static (List<double> Points, List<double> Weights) GenerateSigmaPoints(double mean, double variance, double kappa = 0.0)
{
    double n = 1.0, lam = kappa;
    var points = new List<double> { mean, mean + Math.Sqrt((n + lam) * variance), mean - Math.Sqrt((n + lam) * variance) };
    var weights = new List<double> { lam / (n + lam), 1 / (2 * (n + lam)), 1 / (2 * (n + lam)) };
    return (points, weights);
}

static (double Mean, double Variance) UkfPredict(double mean, double variance, double processNoise, Func<double, double> stateTransitionFn)
{
    var (points, weights) = GenerateSigmaPoints(mean, variance);
    var transformed = points.Select(stateTransitionFn).ToList();

    double newMean = weights.Select((w, i) => w * transformed[i]).Sum();
    double newVariance = weights.Select((w, i) => w * Math.Pow(transformed[i] - newMean, 2)).Sum() + processNoise;

    return (newMean, newVariance);
}
```
