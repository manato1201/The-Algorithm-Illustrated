---
name: M推定(ロバスト回帰のためのM推定量)
category: コンピュータビジョン
subcategory: ロバスト推定
complexity: O(n・反復回数)(nはデータ点数)
summary: 通常の最小二乗法が使う「誤差の二乗」の代わりに、外れ値の影響を頭打ちにする損失関数を使い、反復重み付き最小二乗法で解くことで、外れ値が混じっていても大きく歪まないパラメータ推定を行う。
---

## 概要

[RANSAC](/algorithms/ransac)は「外れ値を積極的に除外してから、残った点だけで最小二乗法を当てはめる」というアプローチでロバスト推定を行うが、M推定(Maximum likelihood-type estimator)は発想が異なる——**外れ値を明示的に取り除くのではなく、誤差関数(損失関数)自体を、大きな誤差の影響が頭打ちになるように設計する**ことで、外れ値の影響を自然に抑える。通常の最小二乗法は「誤差の二乗」を最小化するため、1つの外れ値が持つ巨大な誤差が二乗されてさらに強調され、フィッティング結果全体を大きく歪めてしまう。M推定は、誤差が小さいうちは二乗誤差に近い振る舞いをしつつ、誤差が一定以上大きくなると損失の増加を頭打ちにする(あるいは減少させる)損失関数を使うことで、外れ値1つ1つの影響力を制限する。

## 仕組み

1. 通常の最小二乗法が最小化する目的関数`Σ r_i²`(`r_i`は各データ点の残差)の代わりに、**ロバストな損失関数`ρ(r_i)`** を使った`Σ ρ(r_i)`を最小化する。`ρ`の代表的な選択肢には次のようなものがある:
   - **Huber損失**: 誤差が小さい範囲では二乗誤差、大きい範囲では絶対値誤差(線形)に切り替わる、滑らかに繋がった関数
   - **Tukeyのbiweight**: 誤差が一定の閾値を超えると、損失への寄与がゼロになる(完全に無視される)関数
2. この目的関数は、通常の最小二乗法のように単純な線形方程式を解くだけでは最小化できないため、**反復重み付き最小二乗法(IRLS: Iteratively Reweighted Least Squares)** で解く。まず通常の最小二乗法で初期パラメータを求め、各データ点の残差`r_i`を計算する
3. 各データ点に、その残差の大きさに応じた**重み`w_i = ψ(r_i)/r_i`** を割り当てる(`ψ = ρ'`は損失関数の導関数)。残差が大きい(外れ値らしい)点ほど重みが小さくなる
4. 割り当てた重みを使った**重み付き最小二乗法**でパラメータを再推定する
5. 新しいパラメータで残差を再計算し、3〜4を、パラメータの変化が十分小さくなるまで(収束するまで)繰り返す

## 特性・トレードオフ

- **外れ値を明示的に除外せず、影響力を連続的に減衰させる**: [RANSAC](/algorithms/ransac)が「インライアかアウトライアか」という二値的な判定をするのに対し、M推定は各点の寄与を連続的に(重みという形で)調整するため、外れ値と正常値の境界が曖昧な状況にも滑らかに対応できる
- **反復計算のコストと初期値への依存**: IRLSは反復計算を必要とし、目的関数が非凸(Tukeyのbiweightなど)である場合、初期値によっては局所最適解に収束してしまうことがある。実務では、まず通常の最小二乗法や他の頑健な初期推定([最小メディアン二乗法](/algorithms/least-median-of-squares)など)で妥当な初期値を得てから、M推定で仕上げの精密化を行う、という2段階のアプローチもよく使われる
- **損失関数の選択による頑健性の違い**: Huber損失は外れ値の影響を線形に抑えるが、完全には無視しない(緩やかなロバスト性)。Tukeyのbiweightは十分大きな外れ値の影響を完全にゼロにできる(強いロバスト性)一方、目的関数が非凸になり最適化が難しくなる、というトレードオフがある
- **使いどころ**: カメラキャリブレーション・[SIFT](/algorithms/sift)特徴点マッチング後の外れ値に頑健なモデルフィッティング、統計学における頑健回帰分析全般、センサーデータのノイズ・スパイク除去、[SLAM](/algorithms/extended-kalman-filter)におけるロバストな姿勢グラフ最適化

## 実装例

Huber損失を使った1次元の頑健な平均値推定(IRLS)を示す。

```python
def huber_weight(r: float, delta: float = 1.345) -> float:
    abs_r = abs(r)
    if abs_r <= delta:
        return 1.0
    return delta / abs_r

def robust_mean_irls(data: list[float], delta: float = 1.345, iterations: int = 20) -> float:
    estimate = sum(data) / len(data)  # 初期値: 通常の平均
    for _ in range(iterations):
        residuals = [x - estimate for x in data]
        weights = [huber_weight(r, delta) for r in residuals]
        total_weight = sum(weights)
        estimate = sum(w * x for w, x in zip(weights, data)) / total_weight
    return estimate
```

```typescript
function huberWeight(r: number, delta = 1.345): number {
  const absR = Math.abs(r);
  return absR <= delta ? 1.0 : delta / absR;
}

function robustMeanIrls(
  data: number[],
  delta = 1.345,
  iterations = 20,
): number {
  let estimate = data.reduce((a, b) => a + b, 0) / data.length;
  for (let iter = 0; iter < iterations; iter++) {
    const residuals = data.map((x) => x - estimate);
    const weights = residuals.map((r) => huberWeight(r, delta));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    estimate =
      weights.reduce((sum, w, i) => sum + w * data[i], 0) / totalWeight;
  }
  return estimate;
}
```

```cpp
#include <vector>
#include <cmath>
#include <numeric>

double huberWeight(double r, double delta = 1.345) {
    double absR = std::abs(r);
    return absR <= delta ? 1.0 : delta / absR;
}

double robustMeanIrls(const std::vector<double>& data, double delta = 1.345, int iterations = 20) {
    double estimate = std::accumulate(data.begin(), data.end(), 0.0) / data.size();
    for (int iter = 0; iter < iterations; iter++) {
        std::vector<double> weights;
        double totalWeight = 0.0, weightedSum = 0.0;
        for (double x : data) {
            double w = huberWeight(x - estimate, delta);
            totalWeight += w;
            weightedSum += w * x;
        }
        estimate = weightedSum / totalWeight;
    }
    return estimate;
}
```

```rust
fn huber_weight(r: f64, delta: f64) -> f64 {
    let abs_r = r.abs();
    if abs_r <= delta { 1.0 } else { delta / abs_r }
}

fn robust_mean_irls(data: &[f64], delta: f64, iterations: usize) -> f64 {
    let mut estimate = data.iter().sum::<f64>() / data.len() as f64;
    for _ in 0..iterations {
        let mut total_weight = 0.0;
        let mut weighted_sum = 0.0;
        for &x in data {
            let w = huber_weight(x - estimate, delta);
            total_weight += w;
            weighted_sum += w * x;
        }
        estimate = weighted_sum / total_weight;
    }
    estimate
}
```

```csharp
static double HuberWeight(double r, double delta = 1.345)
{
    double absR = Math.Abs(r);
    return absR <= delta ? 1.0 : delta / absR;
}

static double RobustMeanIrls(double[] data, double delta = 1.345, int iterations = 20)
{
    double estimate = data.Average();
    for (int iter = 0; iter < iterations; iter++)
    {
        double totalWeight = 0, weightedSum = 0;
        foreach (double x in data)
        {
            double w = HuberWeight(x - estimate, delta);
            totalWeight += w;
            weightedSum += w * x;
        }
        estimate = weightedSum / totalWeight;
    }
    return estimate;
}
```
