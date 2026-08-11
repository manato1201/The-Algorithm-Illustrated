---
name: REINFORCEアルゴリズム
category: 強化学習
subcategory: 方策勾配法
complexity: O(エピソード長 × パラメータ数)(1エピソードの更新あたり)
summary: 行動価値を経由せず、方策(行動を選ぶ確率分布)そのものをパラメータ化し、得られた収益で重み付けした勾配で直接方策を改善するモンテカルロ方策勾配法の原型。
---

## 概要

[Q学習](/algorithms/q-learning)のような価値ベースの手法は「各行動の価値を推定し、価値が最大の行動を選ぶ」という間接的な方法で方策を決める。これに対し、方策勾配法は「行動を選ぶ確率分布(方策)`π_θ(a|s)`そのものをパラメータ`θ`で表し、期待収益を直接最大化するように`θ`を勾配上昇法で更新する」というアプローチを取る。REINFORCEは1992年にロナルド・ウィリアムズが提案した最も基本的な方策勾配法で、「1エピソード分プレイして得た実際の収益」をそのまま重みとして、そのエピソードで取った行動の確率を収益に比例して押し上げる(または押し下げる)という直感的な更新則を持つ。連続的な行動空間(ロボットの関節角度など)にも自然に拡張できる点が価値ベース手法にはない強みである。

## 仕組み

1. 方策をパラメータ`θ`を持つ確率分布`π_θ(a|s)`として定義する(離散行動ならソフトマックス、連続行動なら正規分布のパラメータなど)
2. 現在の方策`π_θ`に従って1エピソード分行動し、状態・行動・報酬の系列`(s_0,a_0,r_1), (s_1,a_1,r_2), ...`を得る
3. 各時刻`t`について、そこから終端までの割引累積収益(リターン)`G_t = r_{t+1} + γ・r_{t+2} + γ²・r_{t+3} + ...`を計算する
4. **方策勾配定理**により、期待収益を増やす方向の勾配は`∇_θ J(θ) ≈ Σ_t G_t・∇_θ log π_θ(a_t|s_t)`で近似できる。直感的には「収益`G_t`が大きかった行動`a_t`ほど、その行動を選ぶ確率`π_θ(a_t|s_t)`を強く押し上げる」という更新
5. `θ ← θ + α・Σ_t G_t・∇_θ log π_θ(a_t|s_t)`でパラメータを更新し、1エピソード分の学習を終える。これを多数のエピソードにわたって繰り返す

## 特性・トレードオフ

- **連続行動空間への自然な拡張**: 方策を確率分布として直接表現するため、Q学習のように「全行動のQ値の最大値を取る」操作を必要とせず、連続値の行動(ロボット制御など)にもそのまま適用できる
- **分散の大きさが学習の不安定さにつながる**: 1エピソード全体の実測収益`G_t`をそのまま使う**モンテカルロ推定**であるため、エピソードごとの運(たまたま良い/悪い結果になった)による分散が大きく、学習が不安定になりやすい。ベースライン(状態価値の推定値)を引いて分散を減らす改良(REINFORCE with baseline)や、状態価値関数を別に学習して収益推定に使う[Actor-Critic法](/algorithms/actor-critic)が、この弱点を軽減する発展形として提案されている
- **エピソード終了を待つ必要がある**: Q学習が1ステップごとに更新できるのに対し、素のREINFORCEはエピソードが終わるまで収益`G_t`が確定しないため、1ステップごとのオンライン更新ができない
- **使いどころ**: 方策勾配法・Actor-Critic系(A2C, PPOなど)の理論的な出発点、連続制御タスク、ロボティクスの方策学習、対話システムの応答生成のようなテキスト生成タスクの強化学習的な微調整(RLHFの基礎理論としても登場する)

## 実装例

ソフトマックス方策(状態ごとの行動スコアから確率を計算)を持つ簡易なREINFORCEの1エピソード分の更新を示す。

```python
import math
import random

def softmax(scores: list[float]) -> list[float]:
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]

def reinforce_update(
    theta: list[list[float]],  # theta[state][action] = スコアパラメータ
    episode: list[tuple[int, int, float]],  # (state, action, reward) の系列
    alpha: float = 0.1, gamma: float = 0.99,
) -> None:
    n = len(episode)
    returns = [0.0] * n
    g = 0.0
    for t in range(n - 1, -1, -1):
        _, _, reward = episode[t]
        g = reward + gamma * g
        returns[t] = g

    for t, (state, action, _) in enumerate(episode):
        probs = softmax(theta[state])
        for a in range(len(theta[state])):
            grad_log_pi = (1.0 if a == action else 0.0) - probs[a]
            theta[state][a] += alpha * returns[t] * grad_log_pi

def sample_action(theta: list[list[float]], state: int) -> int:
    probs = softmax(theta[state])
    r = random.random()
    cumulative = 0.0
    for a, p in enumerate(probs):
        cumulative += p
        if r <= cumulative:
            return a
    return len(probs) - 1
```

```typescript
function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

function reinforceUpdate(
  theta: number[][],
  episode: [number, number, number][],
  alpha = 0.1,
  gamma = 0.99,
): void {
  const n = episode.length;
  const returns = new Array(n).fill(0);
  let g = 0;
  for (let t = n - 1; t >= 0; t--) {
    const [, , reward] = episode[t];
    g = reward + gamma * g;
    returns[t] = g;
  }

  for (let t = 0; t < n; t++) {
    const [state, action] = episode[t];
    const probs = softmax(theta[state]);
    for (let a = 0; a < theta[state].length; a++) {
      const gradLogPi = (a === action ? 1 : 0) - probs[a];
      theta[state][a] += alpha * returns[t] * gradLogPi;
    }
  }
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <tuple>

std::vector<double> softmaxVec(const std::vector<double>& scores) {
    double m = *std::max_element(scores.begin(), scores.end());
    std::vector<double> exps(scores.size());
    double total = 0.0;
    for (size_t i = 0; i < scores.size(); i++) {
        exps[i] = std::exp(scores[i] - m);
        total += exps[i];
    }
    for (auto& e : exps) e /= total;
    return exps;
}

void reinforceUpdate(
    std::vector<std::vector<double>>& theta,
    const std::vector<std::tuple<int, int, double>>& episode,
    double alpha = 0.1, double gamma = 0.99) {
    int n = static_cast<int>(episode.size());
    std::vector<double> returns(n);
    double g = 0.0;
    for (int t = n - 1; t >= 0; t--) {
        double reward = std::get<2>(episode[t]);
        g = reward + gamma * g;
        returns[t] = g;
    }
    for (int t = 0; t < n; t++) {
        auto [state, action, reward] = episode[t];
        auto probs = softmaxVec(theta[state]);
        for (size_t a = 0; a < theta[state].size(); a++) {
            double gradLogPi = (static_cast<int>(a) == action ? 1.0 : 0.0) - probs[a];
            theta[state][a] += alpha * returns[t] * gradLogPi;
        }
    }
}
```

```rust
fn softmax(scores: &[f64]) -> Vec<f64> {
    let m = scores.iter().cloned().fold(f64::MIN, f64::max);
    let exps: Vec<f64> = scores.iter().map(|s| (s - m).exp()).collect();
    let total: f64 = exps.iter().sum();
    exps.iter().map(|e| e / total).collect()
}

fn reinforce_update(
    theta: &mut [Vec<f64>],
    episode: &[(usize, usize, f64)],
    alpha: f64, gamma: f64,
) {
    let n = episode.len();
    let mut returns = vec![0.0; n];
    let mut g = 0.0;
    for t in (0..n).rev() {
        let (_, _, reward) = episode[t];
        g = reward + gamma * g;
        returns[t] = g;
    }

    for t in 0..n {
        let (state, action, _) = episode[t];
        let probs = softmax(&theta[state]);
        for a in 0..theta[state].len() {
            let grad_log_pi = if a == action { 1.0 } else { 0.0 } - probs[a];
            theta[state][a] += alpha * returns[t] * grad_log_pi;
        }
    }
}
```

```csharp
static double[] Softmax(double[] scores)
{
    double m = scores.Max();
    var exps = scores.Select(s => Math.Exp(s - m)).ToArray();
    double total = exps.Sum();
    return exps.Select(e => e / total).ToArray();
}

static void ReinforceUpdate(double[][] theta, (int state, int action, double reward)[] episode, double alpha = 0.1, double gamma = 0.99)
{
    int n = episode.Length;
    var returns = new double[n];
    double g = 0;
    for (int t = n - 1; t >= 0; t--)
    {
        g = episode[t].reward + gamma * g;
        returns[t] = g;
    }

    for (int t = 0; t < n; t++)
    {
        var (state, action, _) = episode[t];
        var probs = Softmax(theta[state]);
        for (int a = 0; a < theta[state].Length; a++)
        {
            double gradLogPi = (a == action ? 1.0 : 0.0) - probs[a];
            theta[state][a] += alpha * returns[t] * gradLogPi;
        }
    }
}
```
