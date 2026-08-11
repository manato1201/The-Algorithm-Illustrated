---
name: Proximal Policy Optimization(PPO)
category: 強化学習
subcategory: 方策勾配法
complexity: O(1)(1ステップの勾配計算あたり)
summary: 新旧の方策の確率比をクリッピングすることで、1回の更新で方策が大きく変わりすぎるのを防ぎ、学習の崩壊を避けながら安定して改善し続けられるようにした、実務で最も広く使われる方策勾配法。
---

## 概要

[Advantage Actor-Critic(A2C)](/algorithms/a2c)のような方策勾配法は、勾配の方向にパラメータを更新するが、**その更新幅が大きすぎると方策が一気に崩れてしまう**という問題を抱える。方策が崩れると、その崩れた方策で集めたデータもまた悪いものになり、学習が二度と立ち直れなくなることがある(破滅的な性能低下)。Proximal Policy Optimization(PPO)は、OpenAIが2017年に提案した手法で、**「更新前の方策と更新後の方策の확率比を一定の範囲にクリッピングする」**という単純な工夫だけで、1回の更新が安全な範囲に収まることを保証する。信頼領域法(TRPO)のような複雑な数学的制約を必要とせず、実装のシンプルさと学習の安定性を両立させたことから、現在最も広く使われる方策勾配法の一つになっている。

## 仕組み

1. 現在の方策`π_θ_old`で一定期間分の軌跡(状態・行動・報酬)を収集する
2. 収集したデータを使って、各時刻のアドバンテージ`A_t`を計算する(GAE: Generalized Advantage Estimationのような手法で、バイアスと分散のバランスを取って推定することが多い)
3. **確率比**`r_t(θ) = π_θ(a_t|s_t) / π_θ_old(a_t|s_t)`を計算する。これは「新しい方策のパラメータ`θ`で、同じ行動をどれだけ選びやすくなったか」を表す
4. **クリップ付き目的関数**を計算する:
   `L(θ) = min(r_t(θ)・A_t, clip(r_t(θ), 1-ε, 1+ε)・A_t)`
   確率比`r_t(θ)`が`[1-ε, 1+ε]`(典型的にはε=0.2)の範囲を超えて変化しようとすると、`clip`によってその効果が頭打ちになる。**アドバンテージが正の場合は確率比が上がりすぎないように、負の場合は下がりすぎないように**、それぞれ別方向にクリップがかかる
5. 収集した同じデータに対して、この目的関数を使って**複数エポック**にわたってパラメータ`θ`を更新する(1回のデータ収集を使い回せる点も、都度データを捨てるA2Cに対するPPOの実務上の利点)
6. 一定回数の更新が終わったら、新しい方策で再びデータを収集し、1〜5を繰り返す

## 特性・トレードオフ

- **信頼領域法に匹敵する安定性を単純な実装で実現**: PPOの前身であるTRPO(Trust Region Policy Optimization)は、KLダイバージェンスに対する制約付き最適化という複雑な数学的枠組みで同様の安定性を実現していたが、PPOはクリッピングという単純な演算だけでほぼ同等の効果を得られる。この単純さが、PPOが実務で広く採用される最大の理由になっている
- **同じデータでの複数エポック更新による効率性**: クリッピングによって「方策が大きく変わりすぎない」ことが保証されているため、1回集めたデータを使って複数回パラメータを更新しても学習が不安定にならない。これによりサンプル効率(集めたデータをどれだけ有効活用できるか)がA2Cより向上する
- **ハイパーパラメータの調整**: クリップ幅`ε`、エポック数、学習率など複数のハイパーパラメータが学習の安定性・速度に影響する。デフォルト値(ε=0.2など)は多くのタスクで良好に機能することが経験的に知られているが、タスクによっては調整が必要になる
- **使いどころ**: ロボット制御・連続行動空間タスクの深層強化学習(OpenAI Fiveの分散型学習にも採用)、ゲームAIの学習(多くの商用・研究用強化学習エージェントの標準的な選択肢)、RLHF(人間のフィードバックからの強化学習、大規模言語モデルのファインチューニング)における方策最適化アルゴリズムとしての採用

## 実装例

```python
def clipped_surrogate_objective(
    old_probs: list[float], new_probs: list[float], advantages: list[float], epsilon: float = 0.2,
) -> float:
    total = 0.0
    for old_p, new_p, adv in zip(old_probs, new_probs, advantages):
        ratio = new_p / max(old_p, 1e-8)
        clipped_ratio = max(1 - epsilon, min(1 + epsilon, ratio))
        total += min(ratio * adv, clipped_ratio * adv)
    return total / len(advantages)

def ppo_gradient_step(
    theta: list[float], old_probs: list[float], actions_taken: list[int],
    advantages: list[float], compute_probs: "Callable[[list[float]], list[list[float]]]",
    learning_rate: float = 0.01, epsilon: float = 0.2,
) -> list[float]:
    """theta更新の単純化した数値勾配版(実運用は自動微分ライブラリで解析的勾配を使う)。"""
    h = 1e-4
    grad = [0.0] * len(theta)
    for i in range(len(theta)):
        theta_plus = list(theta); theta_plus[i] += h
        theta_minus = list(theta); theta_minus[i] -= h

        probs_plus = compute_probs(theta_plus)
        probs_minus = compute_probs(theta_minus)
        new_probs_plus = [probs_plus[t][a] for t, a in enumerate(actions_taken)]
        new_probs_minus = [probs_minus[t][a] for t, a in enumerate(actions_taken)]

        obj_plus = clipped_surrogate_objective(old_probs, new_probs_plus, advantages, epsilon)
        obj_minus = clipped_surrogate_objective(old_probs, new_probs_minus, advantages, epsilon)
        grad[i] = (obj_plus - obj_minus) / (2 * h)

    return [t + learning_rate * g for t, g in zip(theta, grad)]
```

```typescript
function clippedSurrogateObjective(
  oldProbs: number[], newProbs: number[], advantages: number[], epsilon = 0.2,
): number {
  let total = 0;
  for (let i = 0; i < advantages.length; i++) {
    const ratio = newProbs[i] / Math.max(oldProbs[i], 1e-8);
    const clippedRatio = Math.max(1 - epsilon, Math.min(1 + epsilon, ratio));
    total += Math.min(ratio * advantages[i], clippedRatio * advantages[i]);
  }
  return total / advantages.length;
}
```

```cpp
#include <vector>
#include <algorithm>

double clippedSurrogateObjective(
    const std::vector<double>& oldProbs, const std::vector<double>& newProbs,
    const std::vector<double>& advantages, double epsilon = 0.2) {
    double total = 0.0;
    for (size_t i = 0; i < advantages.size(); i++) {
        double ratio = newProbs[i] / std::max(oldProbs[i], 1e-8);
        double clippedRatio = std::max(1 - epsilon, std::min(1 + epsilon, ratio));
        total += std::min(ratio * advantages[i], clippedRatio * advantages[i]);
    }
    return total / advantages.size();
}
```

```rust
fn clipped_surrogate_objective(old_probs: &[f64], new_probs: &[f64], advantages: &[f64], epsilon: f64) -> f64 {
    let mut total = 0.0;
    for i in 0..advantages.len() {
        let ratio = new_probs[i] / old_probs[i].max(1e-8);
        let clipped_ratio = ratio.max(1.0 - epsilon).min(1.0 + epsilon);
        total += (ratio * advantages[i]).min(clipped_ratio * advantages[i]);
    }
    total / advantages.len() as f64
}
```

```csharp
static double ClippedSurrogateObjective(double[] oldProbs, double[] newProbs, double[] advantages, double epsilon = 0.2)
{
    double total = 0;
    for (int i = 0; i < advantages.Length; i++)
    {
        double ratio = newProbs[i] / Math.Max(oldProbs[i], 1e-8);
        double clippedRatio = Math.Max(1 - epsilon, Math.Min(1 + epsilon, ratio));
        total += Math.Min(ratio * advantages[i], clippedRatio * advantages[i]);
    }
    return total / advantages.Length;
}
```
