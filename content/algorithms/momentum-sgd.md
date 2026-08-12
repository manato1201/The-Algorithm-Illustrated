---
name: モーメンタム法(Momentum SGD)
category: 機械学習
subcategory: 最適化基礎
complexity: O(1)(1パラメータあたりの更新)
summary: パラメータの更新方向に「これまでの更新方向の慣性(速度)」を蓄積して加えることで、勾配降下法が谷底で振動したり平坦な領域で停滞したりする問題を、物理的なボールが坂を転がる比喩で軽減する。
---

## 概要

[勾配降下法](/algorithms/gradient-descent)は各ステップで現在の勾配の方向にだけパラメータを更新するが、損失関数の等高線が細長い谷のような形をしていると、谷の斜面を左右に振動しながらゆっくりとしか谷底方向へ進まないという問題が起きやすい。モーメンタム法は、この問題を**物理的な「慣性」の比喩**で解決する——現在の勾配だけでなく、**これまでの更新でどちらの方向に動いてきたか(速度)**も記憶しておき、新しい更新方向は「現在の勾配」と「これまでの速度」を合成して決める。斜面を転がるボールが、急な勾配だけでなくそれまでの勢いも保ったまま加速していくのと同じ発想で、谷の方向には勢いがどんどん積み重なり、振動する方向には勾配の符号が反転するたびに打ち消し合って収まっていく。深層学習の最適化における最も基本的な改良の一つで、[Adamオプティマイザ](/algorithms/adam-optimizer)のような発展的な手法にもこの「速度」の概念が受け継がれている。

## 仕組み

1. パラメータ`θ`に加えて、**速度(velocity)**`v`を0で初期化する
2. 各ステップで、現在の勾配`g = ∇L(θ)`を計算する
3. 速度を更新する:`v ← β・v + (1-β)・g`(または実装によっては`v ← β・v + g`という正規化なしの形も使われる)。`β`(典型的には0.9程度)は「これまでの速度をどれだけ保持し続けるか」を表す慣性の強さで、`β`が大きいほど過去の勢いが長く影響を残す
4. パラメータを速度の方向に更新する:`θ ← θ - α・v`(`α`は学習率)
5. 2〜4を収束するまで繰り返す。勾配が同じ方向を指し続ける区間(緩やかな谷の方向)では速度がどんどん加速し、勾配の符号が反転する区間(振動しやすい方向)では速度が打ち消し合って小さくなる

## 特性・トレードオフ

- **谷状の損失地形での収束の高速化**: 素の[勾配降下法](/algorithms/gradient-descent)が振動しながらゆっくり進む状況でも、モーメンタム法は振動方向の動きを打ち消しつつ、一貫した方向への動きを加速するため、同じ学習率でもより速く収束することが多い
- **局所的な平坦領域・鞍点の通過**: 勾配がほぼゼロになる平坦な領域(プラトー)や鞍点でも、これまでに蓄積した速度によって惰性で通過できることがあり、素の勾配降下法が停滞してしまう状況を緩和する
- **オーバーシュートのリスク**: 勢いがつきすぎると、最適解を通り過ぎてしまう(オーバーシュート)ことがあり、その後揺り戻すように振動しながら収束することもある。この点を改善した「Nesterovの加速勾配法」は、現在位置ではなく「速度の方向へ少し進んだ先」で勾配を評価することで、オーバーシュートをより抑えた更新を行う発展形として知られる
- **使いどころ**: 深層ニューラルネットワークの学習(SGD+モーメンタムは今も多くの学習で標準的な選択肢)、[Adamオプティマイザ](/algorithms/adam-optimizer)・[RMSProp](/algorithms/rmsprop)のような適応的学習率手法の構成要素、谷状・振動しやすい損失地形を持つ最適化問題全般

## 実装例

```python
def momentum_sgd_step(
    params: list[float], gradients: list[float], velocity: list[float],
    lr: float = 0.01, beta: float = 0.9,
) -> tuple[list[float], list[float]]:
    new_velocity = [beta * v + (1 - beta) * g for v, g in zip(velocity, gradients)]
    new_params = [p - lr * v for p, v in zip(params, new_velocity)]
    return new_params, new_velocity

def optimize(
    initial_params: list[float], grad_fn: "Callable[[list[float]], list[float]]",
    lr: float = 0.01, beta: float = 0.9, steps: int = 100,
) -> list[float]:
    params = list(initial_params)
    velocity = [0.0] * len(params)
    for _ in range(steps):
        gradients = grad_fn(params)
        params, velocity = momentum_sgd_step(params, gradients, velocity, lr, beta)
    return params
```

```typescript
function momentumSgdStep(
  params: number[],
  gradients: number[],
  velocity: number[],
  lr = 0.01,
  beta = 0.9,
): { params: number[]; velocity: number[] } {
  const newVelocity = velocity.map(
    (v, i) => beta * v + (1 - beta) * gradients[i],
  );
  const newParams = params.map((p, i) => p - lr * newVelocity[i]);
  return { params: newParams, velocity: newVelocity };
}

function optimize(
  initialParams: number[],
  gradFn: (params: number[]) => number[],
  lr = 0.01,
  beta = 0.9,
  steps = 100,
): number[] {
  let params = [...initialParams];
  let velocity = new Array(params.length).fill(0);
  for (let i = 0; i < steps; i++) {
    const gradients = gradFn(params);
    ({ params, velocity } = momentumSgdStep(
      params,
      gradients,
      velocity,
      lr,
      beta,
    ));
  }
  return params;
}
```

```cpp
#include <vector>
#include <functional>

std::pair<std::vector<double>, std::vector<double>> momentumSgdStep(
    const std::vector<double>& params, const std::vector<double>& gradients,
    const std::vector<double>& velocity, double lr = 0.01, double beta = 0.9) {
    std::vector<double> newVelocity(params.size()), newParams(params.size());
    for (size_t i = 0; i < params.size(); i++) {
        newVelocity[i] = beta * velocity[i] + (1 - beta) * gradients[i];
        newParams[i] = params[i] - lr * newVelocity[i];
    }
    return {newParams, newVelocity};
}

std::vector<double> optimize(
    std::vector<double> params, std::function<std::vector<double>(const std::vector<double>&)> gradFn,
    double lr = 0.01, double beta = 0.9, int steps = 100) {
    std::vector<double> velocity(params.size(), 0.0);
    for (int i = 0; i < steps; i++) {
        auto gradients = gradFn(params);
        std::tie(params, velocity) = momentumSgdStep(params, gradients, velocity, lr, beta);
    }
    return params;
}
```

```rust
fn momentum_sgd_step(
    params: &[f64], gradients: &[f64], velocity: &[f64], lr: f64, beta: f64,
) -> (Vec<f64>, Vec<f64>) {
    let new_velocity: Vec<f64> = velocity.iter().zip(gradients).map(|(v, g)| beta * v + (1.0 - beta) * g).collect();
    let new_params: Vec<f64> = params.iter().zip(&new_velocity).map(|(p, v)| p - lr * v).collect();
    (new_params, new_velocity)
}

fn optimize(
    initial_params: Vec<f64>, grad_fn: impl Fn(&[f64]) -> Vec<f64>, lr: f64, beta: f64, steps: usize,
) -> Vec<f64> {
    let mut params = initial_params;
    let mut velocity = vec![0.0; params.len()];
    for _ in 0..steps {
        let gradients = grad_fn(&params);
        let (new_params, new_velocity) = momentum_sgd_step(&params, &gradients, &velocity, lr, beta);
        params = new_params;
        velocity = new_velocity;
    }
    params
}
```

```csharp
static (double[] Params, double[] Velocity) MomentumSgdStep(
    double[] paramsArr, double[] gradients, double[] velocity, double lr = 0.01, double beta = 0.9)
{
    var newVelocity = new double[paramsArr.Length];
    var newParams = new double[paramsArr.Length];
    for (int i = 0; i < paramsArr.Length; i++)
    {
        newVelocity[i] = beta * velocity[i] + (1 - beta) * gradients[i];
        newParams[i] = paramsArr[i] - lr * newVelocity[i];
    }
    return (newParams, newVelocity);
}

static double[] Optimize(double[] initialParams, Func<double[], double[]> gradFn, double lr = 0.01, double beta = 0.9, int steps = 100)
{
    var paramsArr = (double[])initialParams.Clone();
    var velocity = new double[paramsArr.Length];
    for (int i = 0; i < steps; i++)
    {
        var gradients = gradFn(paramsArr);
        (paramsArr, velocity) = MomentumSgdStep(paramsArr, gradients, velocity, lr, beta);
    }
    return paramsArr;
}
```
