---
name: Trust Region Policy Optimization(TRPO)
category: 強化学習
subcategory: 方策勾配法
complexity: O(パラメータ数^2)(共役勾配法によるフィッシャー情報行列とベクトルの積の計算あたり、近似的にはパラメータ数に対しほぼ線形)
summary: 更新前後の方策間のKLダイバージェンスを制約として明示的に課すことで、方策勾配法が陥りやすい「1回の更新で性能が壊滅的に落ちる」問題を理論的な単調改善保証とともに防いだ信頼領域法。
---

## 概要

素朴な方策勾配法(REINFORCEなど)は、パラメータ空間での勾配の方向にステップを踏むが、**パラメータ空間での小さな変化が、方策の挙動(行動確率分布)においては大きな変化を引き起こすことがある**。学習率を少し大きく取っただけで方策が崩壊し、その崩れた方策で集めたデータがさらに学習を悪化させるという負のスパイラルに陥りやすい。Trust Region Policy Optimization(TRPO)は、Schulmanらが2015年に提案した手法で、「パラメータ空間での距離」ではなく「**方策そのものの確率分布としての距離**(KLダイバージェンス)」を制約として明示的に課すことで、この問題を解決する。更新後の方策が更新前の方策から(KLダイバージェンスで測って)一定範囲を超えて離れないように制約した上で目的関数を最大化するため、**理論的には方策の性能が単調に改善し続けることが保証される**。この「信頼領域(Trust Region)」の考え方は、後により実装が簡単な[PPO](/algorithms/ppo)へと発展し、PPOはTRPOの直接の後継として広く使われるようになった。

## 仕組み

1. 現在の方策`π_θ_old`で軌跡(状態・行動・報酬)を収集し、各時刻のアドバンテージ`A_t`を推定する
2. **代理目的関数(Surrogate Objective)**を定義する。これは方策改善の方向を表す:
   `L(θ) = E_t[ (π_θ(a_t|s_t) / π_θ_old(a_t|s_t)) ・ A_t ]`
   確率比`π_θ/π_θ_old`にアドバンテージを掛けたものの期待値であり、これを素朴に最大化しようとするとPPOのクリッピングがない分、確率比がいくらでも大きくなり得る
3. **KLダイバージェンス制約**を課す。更新後の方策`π_θ`と更新前の方策`π_θ_old`の間の(期待)KLダイバージェンスが、小さな定数`δ`以下に収まるという制約のもとで、代理目的関数を最大化する制約付き最適化問題を立てる:
   `maximize_θ  L(θ)   subject to   E_t[ KL(π_θ_old(・|s_t) || π_θ(・|s_t)) ] ≤ δ`
4. この制約付き最適化を解くために、目的関数を1次近似(勾配`g`)、KL制約を2次近似(**フィッシャー情報行列`F`**、KLダイバージェンスのヘッセ行列に相当)する。これにより問題は「`F`を計量とした信頼領域内で線形目的関数を最大化する」形に帰着し、最適な更新方向は自然勾配 `Δθ = F^{-1}g` に(スケーリングを除いて)一致する
5. パラメータ数が大きいとフィッシャー情報行列`F`を陽に構成・逆行列計算するのは非現実的なため、**共役勾配法(Conjugate Gradient)**を使い、`F`を明示的に作らずに`F・x`という行列ベクトル積だけを繰り返し計算することで近似的に`Δθ`を求める
6. 求めた更新方向`Δθ`をそのまま使うと2次近似の誤差でKL制約を実際には超えてしまうことがあるため、**直線探索(line search)**を行う。`Δθ`にステップサイズ`α`(1から始めて半分ずつ縮小)を掛けて実際に方策を更新し、(a)代理目的関数`L(θ)`が改善しているか、(b)実際のKLダイバージェンスが`δ`以下に収まっているか、の両方を満たすまで`α`を縮小しながら探索する
7. 条件を満たす更新が見つかったらパラメータを更新し、1に戻って新しい方策でデータを再収集する

## 特性・トレードオフ

- **単調改善の理論的保証**: TRPOの元になった理論(保守的方策反復、Conservative Policy Iteration)は、適切な条件下で「更新のたびに方策の真の性能が(悪化せず)改善し続ける」ことを保証する下界を導出している。TRPOはこの理論を実用的な近似アルゴリズムに落とし込んだものであり、素朴な方策勾配法にはないロバスト性を持つ
- **実装・計算コストの高さ**: フィッシャー情報行列を扱うための共役勾配法、直線探索、KLダイバージェンスの2次近似計算など、実装すべき要素が多く、1回の更新に必要な計算量もPPOより大きい。この複雑さが、より単純なクリッピングで同等の効果を狙う[PPO](/algorithms/ppo)が開発された直接の動機になった
- **PPOとの関係**: [PPO](/algorithms/ppo)はTRPOの「信頼領域内に更新を収める」という発想を継承しつつ、制約付き最適化・共役勾配法・直線探索という重い機構を、確率比のクリッピングという単純な演算1つで代替する。実務上はPPOがほぼTRPOを置き換えたが、TRPOの理論(単調改善保証、自然勾配との関係)は方策勾配法全体の理解の基礎になっている
- **自然勾配法としての側面**: フィッシャー情報行列の逆行列を掛けるという操作は、パラメータ空間のユークリッド距離ではなく、方策の確率分布としての距離(情報幾何的な計量)に基づいて勾配を補正する自然勾配法(Natural Policy Gradient)の一種と見なせる。これにより、パラメータのわずかな変化が方策の挙動を大きく変えてしまう「病的な」方向への過剰な更新を自動的に抑制する
- **使いどころ**: 更新の安定性が特に重要な連続制御タスク(ロボティクスのシミュレーションなど)、PPO以前の深層強化学習の標準的ベースライン、自然勾配法や信頼領域法の考え方を学ぶ教材として、また[PPO](/algorithms/ppo)がなぜクリッピングという設計を選んだのかを理解するための比較対象

## 実装例

```python
def surrogate_objective(old_probs: list[float], new_probs: list[float], advantages: list[float]) -> float:
    """クリッピングなしの素のTRPO代理目的関数。"""
    total = 0.0
    for old_p, new_p, adv in zip(old_probs, new_probs, advantages):
        ratio = new_p / max(old_p, 1e-8)
        total += ratio * adv
    return total / len(advantages)


def kl_divergence(old_probs: list[list[float]], new_probs: list[list[float]]) -> float:
    """離散行動分布間の平均KLダイバージェンス KL(old || new)。"""
    total = 0.0
    for old_dist, new_dist in zip(old_probs, new_probs):
        for p_old, p_new in zip(old_dist, new_dist):
            if p_old > 1e-8:
                total += p_old * (
                    __import__("math").log(max(p_old, 1e-8) / max(p_new, 1e-8))
                )
    return total / len(old_probs)


def trpo_update_step(
    theta: list[float],
    old_action_probs: list[float],
    old_full_dists: list[list[float]],
    actions_taken: list[int],
    advantages: list[float],
    compute_dists: "Callable[[list[float]], list[list[float]]]",
    delta: float = 0.01,
    max_backtracks: int = 10,
) -> list[float]:
    """直線探索による簡略化したTRPO更新(共役勾配法の代わりに数値勾配を使う説明用実装)。"""
    h = 1e-4
    grad = [0.0] * len(theta)
    for i in range(len(theta)):
        theta_plus = list(theta); theta_plus[i] += h
        theta_minus = list(theta); theta_minus[i] -= h

        dists_plus = compute_dists(theta_plus)
        dists_minus = compute_dists(theta_minus)
        probs_plus = [dists_plus[t][a] for t, a in enumerate(actions_taken)]
        probs_minus = [dists_minus[t][a] for t, a in enumerate(actions_taken)]

        obj_plus = surrogate_objective(old_action_probs, probs_plus, advantages)
        obj_minus = surrogate_objective(old_action_probs, probs_minus, advantages)
        grad[i] = (obj_plus - obj_minus) / (2 * h)

    step_size = 1.0
    base_obj = surrogate_objective(
        old_action_probs,
        [compute_dists(theta)[t][a] for t, a in enumerate(actions_taken)],
        advantages,
    )

    for _ in range(max_backtracks):
        candidate = [t + step_size * g for t, g in zip(theta, grad)]
        candidate_dists = compute_dists(candidate)
        candidate_probs = [candidate_dists[t][a] for t, a in enumerate(actions_taken)]

        new_obj = surrogate_objective(old_action_probs, candidate_probs, advantages)
        kl = kl_divergence(old_full_dists, candidate_dists)

        if new_obj > base_obj and kl <= delta:
            return candidate
        step_size *= 0.5

    return theta  # 条件を満たす更新が見つからなければ据え置き
```

```typescript
function surrogateObjective(oldProbs: number[], newProbs: number[], advantages: number[]): number {
  let total = 0;
  for (let i = 0; i < advantages.length; i++) {
    const ratio = newProbs[i] / Math.max(oldProbs[i], 1e-8);
    total += ratio * advantages[i];
  }
  return total / advantages.length;
}

function klDivergence(oldDists: number[][], newDists: number[][]): number {
  let total = 0;
  for (let t = 0; t < oldDists.length; t++) {
    for (let k = 0; k < oldDists[t].length; k++) {
      const pOld = oldDists[t][k];
      const pNew = newDists[t][k];
      if (pOld > 1e-8) {
        total += pOld * Math.log(Math.max(pOld, 1e-8) / Math.max(pNew, 1e-8));
      }
    }
  }
  return total / oldDists.length;
}

function trpoUpdateStep(
  theta: number[],
  oldActionProbs: number[],
  oldFullDists: number[][],
  actionsTaken: number[],
  advantages: number[],
  computeDists: (theta: number[]) => number[][],
  delta = 0.01,
  maxBacktracks = 10,
): number[] {
  const h = 1e-4;
  const grad = new Array(theta.length).fill(0);
  for (let i = 0; i < theta.length; i++) {
    const thetaPlus = [...theta]; thetaPlus[i] += h;
    const thetaMinus = [...theta]; thetaMinus[i] -= h;

    const distsPlus = computeDists(thetaPlus);
    const distsMinus = computeDists(thetaMinus);
    const probsPlus = actionsTaken.map((a, t) => distsPlus[t][a]);
    const probsMinus = actionsTaken.map((a, t) => distsMinus[t][a]);

    const objPlus = surrogateObjective(oldActionProbs, probsPlus, advantages);
    const objMinus = surrogateObjective(oldActionProbs, probsMinus, advantages);
    grad[i] = (objPlus - objMinus) / (2 * h);
  }

  let stepSize = 1.0;
  const baseDists = computeDists(theta);
  const baseProbs = actionsTaken.map((a, t) => baseDists[t][a]);
  const baseObj = surrogateObjective(oldActionProbs, baseProbs, advantages);

  for (let b = 0; b < maxBacktracks; b++) {
    const candidate = theta.map((t, i) => t + stepSize * grad[i]);
    const candidateDists = computeDists(candidate);
    const candidateProbs = actionsTaken.map((a, t) => candidateDists[t][a]);

    const newObj = surrogateObjective(oldActionProbs, candidateProbs, advantages);
    const kl = klDivergence(oldFullDists, candidateDists);

    if (newObj > baseObj && kl <= delta) {
      return candidate;
    }
    stepSize *= 0.5;
  }

  return theta;
}
```
