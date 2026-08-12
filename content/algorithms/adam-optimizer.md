---
name: Adamオプティマイザ
category: 機械学習
subcategory: 最適化基礎
complexity: O(1)(1パラメータあたりの更新)
summary: 勾配の1次モーメント(モーメンタムに相当)と2次モーメント(勾配の大きさの分散)の両方を推定し、パラメータごとに異なる学習率を自動調整することで、[モーメンタムSGD](/algorithms/momentum-sgd)より少ないチューニングで安定して収束させる、深層学習で最も広く使われる最適化アルゴリズム。
---

## 概要

[モーメンタムSGD](/algorithms/momentum-sgd)は勾配の「向き」の慣性を利用して谷状の損失地形での振動を抑えたが、全パラメータに同じ学習率`α`を使い続けるため、パラメータによって勾配の大きさが大きく異なる場合(あるパラメータは急な勾配、別のパラメータは緩やかな勾配を持つ)には、最適な学習率が場所によって違うはずなのに一律の値しか使えないという課題が残る。Adam(Adaptive Moment Estimation)は、2014年にディーデリック・キングマとジミー・バが提案した手法で、**勾配の1次モーメント(平均、モーメンタムに相当)** と**2次モーメント(二乗の平均、勾配の大きさのスケールに相当)** の両方を推定し、勾配が大きく変動してきたパラメータには小さい学習率を、安定して小さい勾配が続くパラメータには相対的に大きい学習率を、**パラメータごとに自動調整**して適用する。デフォルトのハイパーパラメータでも幅広いタスクでうまく機能することから、深層学習における事実上の標準的な最適化アルゴリズムになっている。

## 仕組み

1. パラメータ`θ`に加え、1次モーメントの推定値`m`と2次モーメントの推定値`v`を0で初期化し、時刻`t`を0とする
2. 各ステップで`t`を1増やし、現在の勾配`g = ∇L(θ)`を計算する
3. **1次モーメント(勾配の指数移動平均)** を更新する:`m ← β1・m + (1-β1)・g`(`β1`は典型的に0.9)
4. **2次モーメント(勾配の二乗の指数移動平均)** を更新する:`v ← β2・v + (1-β2)・g²`(`β2`は典型的に0.999)
5. **バイアス補正**を行う:`m̂ = m / (1 - β1^t)`、`v̂ = v / (1 - β2^t)`(`m`・`v`を0で初期化したことによる学習初期の偏りを補正する。`t`が小さいほど補正の効果が大きく、`t`が大きくなるにつれて補正はほぼ無視できるようになる)
6. パラメータを更新する:`θ ← θ - α・m̂ / (√v̂ + ε)`(`ε`はゼロ除算を防ぐ微小な定数)。勾配の変動が大きかった(`v̂`が大きい)パラメータほど更新幅が抑えられ、変動が小さく安定しているパラメータには相対的に大きな更新がかかる
7. 2〜6を収束するまで繰り返す

## 特性・トレードオフ

- **パラメータごとの適応的な学習率**: [モーメンタムSGD](/algorithms/momentum-sgd)や[RMSProp](/algorithms/rmsprop)がそれぞれモーメンタムと適応的スケーリングのどちらか一方を扱うのに対し、Adamは両方を組み合わせることで、勾配のスケールが層ごと・パラメータごとに大きく異なる深層ニューラルネットワークでも、学習率の手動調整の手間を大きく減らせる
- **バイアス補正の重要性**: `m`・`v`を0で初期化するため、学習の最初の数ステップでは推定値が実際の値より小さく偏る。この偏りをバイアス補正で明示的に修正することで、学習初期段階での不安定な更新を防いでいる
- **汎化性能に関する議論**: Adamは収束が速く扱いやすい一方、一部の研究では、素の[モーメンタムSGD](/algorithms/momentum-sgd)の方が最終的な汎化性能(未知データへの性能)で上回ることがあると報告されており、タスクによってはSGD+モーメンタムやAdamW(Adamに重み減衰を適切に組み込んだ改良版)が選ばれることもある
- **使いどころ**: 深層ニューラルネットワークの学習全般(画像認識、自然言語処理、Transformerベースのモデルの事実上の標準的な選択肢)、[バックプロパゲーション](/algorithms/backpropagation)で計算した勾配を使うあらゆる勾配ベース学習、ハイパーパラメータ調整の手間を減らしたい実務的な機械学習プロジェクト

## 実装例

```python
def adam_step(
    params: list[float], gradients: list[float], m: list[float], v: list[float], t: int,
    lr: float = 0.001, beta1: float = 0.9, beta2: float = 0.999, eps: float = 1e-8,
) -> tuple[list[float], list[float], list[float]]:
    new_m = [beta1 * mi + (1 - beta1) * g for mi, g in zip(m, gradients)]
    new_v = [beta2 * vi + (1 - beta2) * g * g for vi, g in zip(v, gradients)]

    m_hat = [mi / (1 - beta1 ** t) for mi in new_m]
    v_hat = [vi / (1 - beta2 ** t) for vi in new_v]

    new_params = [p - lr * mh / (v_hat_i ** 0.5 + eps) for p, mh, v_hat_i in zip(params, m_hat, v_hat)]
    return new_params, new_m, new_v

def optimize(
    initial_params: list[float], grad_fn: "Callable[[list[float]], list[float]]",
    lr: float = 0.001, steps: int = 100,
) -> list[float]:
    params = list(initial_params)
    m = [0.0] * len(params)
    v = [0.0] * len(params)
    for t in range(1, steps + 1):
        gradients = grad_fn(params)
        params, m, v = adam_step(params, gradients, m, v, t, lr)
    return params
```

```typescript
function adamStep(
  params: number[],
  gradients: number[],
  m: number[],
  v: number[],
  t: number,
  lr = 0.001,
  beta1 = 0.9,
  beta2 = 0.999,
  eps = 1e-8,
): { params: number[]; m: number[]; v: number[] } {
  const newM = m.map((mi, i) => beta1 * mi + (1 - beta1) * gradients[i]);
  const newV = v.map(
    (vi, i) => beta2 * vi + (1 - beta2) * gradients[i] * gradients[i],
  );

  const mHat = newM.map((mi) => mi / (1 - beta1 ** t));
  const vHat = newV.map((vi) => vi / (1 - beta2 ** t));

  const newParams = params.map(
    (p, i) => p - (lr * mHat[i]) / (Math.sqrt(vHat[i]) + eps),
  );
  return { params: newParams, m: newM, v: newV };
}

function optimize(
  initialParams: number[],
  gradFn: (params: number[]) => number[],
  lr = 0.001,
  steps = 100,
): number[] {
  let params = [...initialParams];
  let m = new Array(params.length).fill(0);
  let v = new Array(params.length).fill(0);
  for (let t = 1; t <= steps; t++) {
    const gradients = gradFn(params);
    ({ params, m, v } = adamStep(params, gradients, m, v, t, lr));
  }
  return params;
}
```

```cpp
#include <vector>
#include <cmath>
#include <functional>

struct AdamState { std::vector<double> params, m, v; };

AdamState adamStep(
    const std::vector<double>& params, const std::vector<double>& gradients,
    const std::vector<double>& m, const std::vector<double>& v, int t,
    double lr = 0.001, double beta1 = 0.9, double beta2 = 0.999, double eps = 1e-8) {
    size_t n = params.size();
    std::vector<double> newM(n), newV(n), newParams(n);
    for (size_t i = 0; i < n; i++) {
        newM[i] = beta1 * m[i] + (1 - beta1) * gradients[i];
        newV[i] = beta2 * v[i] + (1 - beta2) * gradients[i] * gradients[i];
        double mHat = newM[i] / (1 - std::pow(beta1, t));
        double vHat = newV[i] / (1 - std::pow(beta2, t));
        newParams[i] = params[i] - lr * mHat / (std::sqrt(vHat) + eps);
    }
    return {newParams, newM, newV};
}

std::vector<double> optimize(
    std::vector<double> params, std::function<std::vector<double>(const std::vector<double>&)> gradFn,
    double lr = 0.001, int steps = 100) {
    std::vector<double> m(params.size(), 0.0), v(params.size(), 0.0);
    for (int t = 1; t <= steps; t++) {
        auto gradients = gradFn(params);
        auto state = adamStep(params, gradients, m, v, t, lr);
        params = state.params; m = state.m; v = state.v;
    }
    return params;
}
```

```rust
fn adam_step(
    params: &[f64], gradients: &[f64], m: &[f64], v: &[f64], t: i32,
    lr: f64, beta1: f64, beta2: f64, eps: f64,
) -> (Vec<f64>, Vec<f64>, Vec<f64>) {
    let new_m: Vec<f64> = m.iter().zip(gradients).map(|(mi, g)| beta1 * mi + (1.0 - beta1) * g).collect();
    let new_v: Vec<f64> = v.iter().zip(gradients).map(|(vi, g)| beta2 * vi + (1.0 - beta2) * g * g).collect();

    let m_hat: Vec<f64> = new_m.iter().map(|mi| mi / (1.0 - beta1.powi(t))).collect();
    let v_hat: Vec<f64> = new_v.iter().map(|vi| vi / (1.0 - beta2.powi(t))).collect();

    let new_params: Vec<f64> = params
        .iter()
        .zip(m_hat.iter().zip(v_hat.iter()))
        .map(|(p, (mh, vh))| p - lr * mh / (vh.sqrt() + eps))
        .collect();

    (new_params, new_m, new_v)
}

fn optimize(initial_params: Vec<f64>, grad_fn: impl Fn(&[f64]) -> Vec<f64>, lr: f64, steps: i32) -> Vec<f64> {
    let mut params = initial_params;
    let mut m = vec![0.0; params.len()];
    let mut v = vec![0.0; params.len()];
    for t in 1..=steps {
        let gradients = grad_fn(&params);
        let (new_params, new_m, new_v) = adam_step(&params, &gradients, &m, &v, t, lr, 0.9, 0.999, 1e-8);
        params = new_params;
        m = new_m;
        v = new_v;
    }
    params
}
```

```csharp
static (double[] Params, double[] M, double[] V) AdamStep(
    double[] paramsArr, double[] gradients, double[] m, double[] v, int t,
    double lr = 0.001, double beta1 = 0.9, double beta2 = 0.999, double eps = 1e-8)
{
    int n = paramsArr.Length;
    var newM = new double[n];
    var newV = new double[n];
    var newParams = new double[n];
    for (int i = 0; i < n; i++)
    {
        newM[i] = beta1 * m[i] + (1 - beta1) * gradients[i];
        newV[i] = beta2 * v[i] + (1 - beta2) * gradients[i] * gradients[i];
        double mHat = newM[i] / (1 - Math.Pow(beta1, t));
        double vHat = newV[i] / (1 - Math.Pow(beta2, t));
        newParams[i] = paramsArr[i] - lr * mHat / (Math.Sqrt(vHat) + eps);
    }
    return (newParams, newM, newV);
}

static double[] Optimize(double[] initialParams, Func<double[], double[]> gradFn, double lr = 0.001, int steps = 100)
{
    var paramsArr = (double[])initialParams.Clone();
    var m = new double[paramsArr.Length];
    var v = new double[paramsArr.Length];
    for (int t = 1; t <= steps; t++)
    {
        var gradients = gradFn(paramsArr);
        (paramsArr, m, v) = AdamStep(paramsArr, gradients, m, v, t, lr);
    }
    return paramsArr;
}
```
