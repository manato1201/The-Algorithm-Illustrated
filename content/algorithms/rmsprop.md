---
name: RMSProp
category: 機械学習
subcategory: 最適化基礎
complexity: O(1)(1パラメータあたりの更新)
summary: 各パラメータの勾配の二乗を指数移動平均で追跡し、勾配が大きく変動してきたパラメータほど更新幅を縮めることで、パラメータごとに異なる学習率を自動的に実現する適応的勾配法。
---

## 概要

[モーメンタムSGD](/algorithms/momentum-sgd)が勾配の「方向」の慣性を利用するのに対し、RMSProp(Root Mean Square Propagation)は勾配の「大きさ」に着目した適応的学習率の手法である。ジェフリー・ヒントンが2012年の講義で紹介したこの手法は、各パラメータについて**勾配の二乗の指数移動平均**を計算し続け、その平方根で更新幅を割ることで、**勾配が継続的に大きい(変動が激しい)パラメータには小さい実効学習率を、勾配が小さく安定しているパラメータには相対的に大きい実効学習率**を自動的に割り当てる。それ以前に提案されていたAdaGradという手法が「学習が進むにつれて実効学習率が単調に縮み続け、いずれ更新がほぼ止まってしまう」という弱点を持っていたのに対し、RMSPropは指数移動平均を使うことで、直近の勾配の大きさに適応し続けながらこの問題を回避する。[Adamオプティマイザ](/algorithms/adam-optimizer)はこのRMSPropの適応的スケーリングの仕組みに、モーメンタムの要素を組み合わせたものと理解できる。

## 仕組み

1. パラメータ`θ`に加え、**勾配の二乗の指数移動平均**`s`を0で初期化する
2. 各ステップで、現在の勾配`g = ∇L(θ)`を計算する
3. `s`を更新する:`s ← β・s + (1-β)・g²`(`β`は典型的に0.9、直近の勾配の大きさをどれだけ重視するかを決める減衰率)
4. パラメータを更新する:`θ ← θ - α・g / (√s + ε)`(`α`は基準となる学習率、`ε`はゼロ除算を防ぐ微小な定数)。`s`が大きい(最近の勾配が大きく変動している)パラメータほど、割る数が大きくなり実効的な更新幅が小さくなる
5. 2〜4を収束するまで繰り返す

## 特性・トレードオフ

- **AdaGradの「学習が止まる」問題への対処**: AdaGradは勾配の二乗を最初から**全て累積**するため、学習が進むほど累積値が単調に増加し続け、実効学習率がどんどん小さくなって最終的にほぼ更新が止まってしまう。RMSPropは指数移動平均(直近の勾配をより重視し、古い勾配の影響を徐々に忘れる)を使うことで、学習が長く続いても適応的な学習率を維持できる
- **パラメータごとの自動スケーリング**: ニューラルネットワークの層によって勾配のスケールが大きく異なることは珍しくなく(浅い層と深い層で勾配の大きさが数桁違うこともある)、RMSPropはこの違いをパラメータごとの`s`の値に反映させることで、層ごとに手動で学習率を調整する手間を減らす
- **モーメンタムを持たないという制約**: RMSProp自体は勾配の「方向」の慣性([モーメンタムSGD](/algorithms/momentum-sgd)が扱う要素)を持たないため、谷状の損失地形での振動を抑える効果は限定的である。この制約を解消し、モーメンタムと適応的スケーリングの両方を組み合わせたのが[Adamオプティマイザ](/algorithms/adam-optimizer)であり、実務では多くの場合RMSPropよりAdamが選ばれる
- **使いどころ**: リカレントニューラルネットワーク(RNN)の学習(RMSPropは元々RNNの学習の不安定さに対処するために提案された経緯がある)、[Adamオプティマイザ](/algorithms/adam-optimizer)の内部で使われる適応的スケーリング機構の理論的基盤、勾配のスケールが大きく変動するタスクでの安定した学習

## 実装例

```python
def rmsprop_step(
    params: list[float], gradients: list[float], s: list[float],
    lr: float = 0.001, beta: float = 0.9, eps: float = 1e-8,
) -> tuple[list[float], list[float]]:
    new_s = [beta * si + (1 - beta) * g * g for si, g in zip(s, gradients)]
    new_params = [p - lr * g / (si ** 0.5 + eps) for p, g, si in zip(params, gradients, new_s)]
    return new_params, new_s

def optimize(
    initial_params: list[float], grad_fn: "Callable[[list[float]], list[float]]",
    lr: float = 0.001, steps: int = 100,
) -> list[float]:
    params = list(initial_params)
    s = [0.0] * len(params)
    for _ in range(steps):
        gradients = grad_fn(params)
        params, s = rmsprop_step(params, gradients, s, lr)
    return params
```

```typescript
function rmspropStep(
  params: number[],
  gradients: number[],
  s: number[],
  lr = 0.001,
  beta = 0.9,
  eps = 1e-8,
): { params: number[]; s: number[] } {
  const newS = s.map(
    (si, i) => beta * si + (1 - beta) * gradients[i] * gradients[i],
  );
  const newParams = params.map(
    (p, i) => p - (lr * gradients[i]) / (Math.sqrt(newS[i]) + eps),
  );
  return { params: newParams, s: newS };
}

function optimize(
  initialParams: number[],
  gradFn: (params: number[]) => number[],
  lr = 0.001,
  steps = 100,
): number[] {
  let params = [...initialParams];
  let s = new Array(params.length).fill(0);
  for (let i = 0; i < steps; i++) {
    const gradients = gradFn(params);
    ({ params, s } = rmspropStep(params, gradients, s, lr));
  }
  return params;
}
```

```cpp
#include <vector>
#include <cmath>
#include <functional>

std::pair<std::vector<double>, std::vector<double>> rmspropStep(
    const std::vector<double>& params, const std::vector<double>& gradients,
    const std::vector<double>& s, double lr = 0.001, double beta = 0.9, double eps = 1e-8) {
    std::vector<double> newS(params.size()), newParams(params.size());
    for (size_t i = 0; i < params.size(); i++) {
        newS[i] = beta * s[i] + (1 - beta) * gradients[i] * gradients[i];
        newParams[i] = params[i] - lr * gradients[i] / (std::sqrt(newS[i]) + eps);
    }
    return {newParams, newS};
}

std::vector<double> optimize(
    std::vector<double> params, std::function<std::vector<double>(const std::vector<double>&)> gradFn,
    double lr = 0.001, int steps = 100) {
    std::vector<double> s(params.size(), 0.0);
    for (int i = 0; i < steps; i++) {
        auto gradients = gradFn(params);
        std::tie(params, s) = rmspropStep(params, gradients, s, lr);
    }
    return params;
}
```

```rust
fn rmsprop_step(
    params: &[f64], gradients: &[f64], s: &[f64], lr: f64, beta: f64, eps: f64,
) -> (Vec<f64>, Vec<f64>) {
    let new_s: Vec<f64> = s.iter().zip(gradients).map(|(si, g)| beta * si + (1.0 - beta) * g * g).collect();
    let new_params: Vec<f64> = params
        .iter()
        .zip(gradients.iter().zip(new_s.iter()))
        .map(|(p, (g, si))| p - lr * g / (si.sqrt() + eps))
        .collect();
    (new_params, new_s)
}

fn optimize(initial_params: Vec<f64>, grad_fn: impl Fn(&[f64]) -> Vec<f64>, lr: f64, steps: usize) -> Vec<f64> {
    let mut params = initial_params;
    let mut s = vec![0.0; params.len()];
    for _ in 0..steps {
        let gradients = grad_fn(&params);
        let (new_params, new_s) = rmsprop_step(&params, &gradients, &s, lr, 0.9, 1e-8);
        params = new_params;
        s = new_s;
    }
    params
}
```

```csharp
static (double[] Params, double[] S) RmspropStep(
    double[] paramsArr, double[] gradients, double[] s, double lr = 0.001, double beta = 0.9, double eps = 1e-8)
{
    var newS = new double[paramsArr.Length];
    var newParams = new double[paramsArr.Length];
    for (int i = 0; i < paramsArr.Length; i++)
    {
        newS[i] = beta * s[i] + (1 - beta) * gradients[i] * gradients[i];
        newParams[i] = paramsArr[i] - lr * gradients[i] / (Math.Sqrt(newS[i]) + eps);
    }
    return (newParams, newS);
}

static double[] Optimize(double[] initialParams, Func<double[], double[]> gradFn, double lr = 0.001, int steps = 100)
{
    var paramsArr = (double[])initialParams.Clone();
    var s = new double[paramsArr.Length];
    for (int i = 0; i < steps; i++)
    {
        var gradients = gradFn(paramsArr);
        (paramsArr, s) = RmspropStep(paramsArr, gradients, s, lr);
    }
    return paramsArr;
}
```
