---
name: ゼロ和ゲームの線形計画法による解法
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(n^3.5 log(1/ε))(線形計画法、単体法は実務上高速だが最悪指数時間)
summary: 二人零和ゲームの最適混合戦略を、線形計画問題として定式化しシンプレックス法などで厳密に解く手法。
---

## 概要

[ミニマックス法](/algorithms/minimax)は探索木を辿ることで手番制ゲームの最善手を求めるが、じゃんけんのように「双方が同時に手を選ぶ」利得行列形式の二人零和ゲームでは木探索は使えない。しかし1928年にジョン・フォン・ノイマンが証明した**ミニマックス定理**により、二人零和ゲームには必ず最適な混合戦略(確率的に手を選ぶ戦略)の組が存在し、そのときの期待利得が一意に定まることが保証されている([ミニマックス定理](/algorithms/minimax-theorem)を参照)。この最適混合戦略は、実は線形計画問題(線形の目的関数を線形の制約下で最大化・最小化する問題)として定式化でき、[シンプレックス法](/algorithms/simplex-method)のような汎用の線形計画法ソルバーで厳密に、かつ効率的に解くことができる。ゲーム理論と最適化理論を結びつけるこの事実は、ミニマックス定理の構成的な証明としても、また現実の混合戦略を数値的に求める実用手法としても重要である。

## 仕組み

1. 二人零和ゲームの利得行列`A`(行プレイヤーの利得。列プレイヤーの利得は`-A`)を用意する
2. 行プレイヤー(利得を最大化したい側)の問題を「列プレイヤーがどんな手を選んでも保証できる期待利得`v`を最大化する、手を選ぶ確率分布`x`を求めよ」という線形計画問題として定式化する: `maximize v subject to Σx_i A_ij ≥ v (∀j), Σx_i = 1, x_i ≥ 0`
3. 同様に列プレイヤーの問題も「行プレイヤーがどんな手を選んでも損失を`w`以下に抑える確率分布`y`を求めよ」という双対の線形計画問題として定式化する
4. これら2つの線形計画問題は互いに**双対**の関係にあり、双対定理により最適値が一致する(`v = w`)ことがミニマックス定理の主張そのものになる
5. [シンプレックス法](/algorithms/simplex-method)や内点法などの汎用LPソルバーでどちらか一方(通常は変数の少ない方)を解けば、最適な混合戦略とゲームの値が同時に得られる

## 特性・トレードオフ

- **計算量**: 線形計画法自体はシンプレックス法で実務上高速(多くの入力で多項式時間相当)だが理論上の最悪計算量は指数時間になりうる。内点法を使えば多項式時間`O(n^3.5 log(1/ε))`程度が保証される
- **厳密解が保証される**: ミニマックス探索が近似(深さ制限)を伴うのに対し、線形計画法による解法は問題サイズが手に負える範囲であれば真に最適な混合戦略を厳密に求められる
- **同時手番ゲームへの適用**: 手番が交互ではなく同時に手を選ぶゲーム(じゃんけん、カードゲームの読み合いなど)は木探索では扱えないが、利得行列さえ書ければこの手法で解ける
- **使いどころ**: じゃんけん系の読み合いゲームのAI、カードゲームのブラフ判断、セキュリティゲーム(警備配置のような対人リソース配分)の最適戦略計算など。多人数・非零和ゲームには[ナッシュ均衡](/algorithms/nash-equilibrium)の計算など別の枠組みが必要

## 実装例

小規模な利得行列(じゃんけん等)に対し、線形計画法を直接実装する代わりに、確率単体上を反復的に探索するフィクティシャス・プレイに近い簡易な数値解法(乗算重み更新法)で近似的な最適混合戦略を求める実装を示す。

```python
import numpy as np


def solve_zero_sum_mwu(payoff: np.ndarray, iterations: int = 5000, eta: float = 0.05) -> tuple[np.ndarray, np.ndarray]:
    """乗算重み更新法(Multiplicative Weights Update)で二人零和ゲームの近似混合戦略を求める。
    payoff[i][j]: 行プレイヤーの手iと列プレイヤーの手jに対する行プレイヤーの利得"""
    n_rows, n_cols = payoff.shape
    row_weights = np.ones(n_rows)
    col_weights = np.ones(n_cols)

    for _ in range(iterations):
        row_probs = row_weights / row_weights.sum()
        col_probs = col_weights / col_weights.sum()

        # 相手の現在の混合戦略に対する各手の期待利得で重みを更新する
        row_gain = payoff @ col_probs
        col_loss = row_probs @ payoff  # 列プレイヤーは -payoff を最大化したい

        row_weights *= np.exp(eta * row_gain)
        col_weights *= np.exp(-eta * col_loss)

    return row_weights / row_weights.sum(), col_weights / col_weights.sum()


# じゃんけん: グー・チョキ・パーの利得行列(行プレイヤー視点)
rps_payoff = np.array([[0, 1, -1], [-1, 0, 1], [1, -1, 0]], dtype=float)
row_strategy, col_strategy = solve_zero_sum_mwu(rps_payoff)
print(row_strategy)  # おおよそ [1/3, 1/3, 1/3] に収束する
```

```typescript
function solveZeroSumMWU(
  payoff: number[][],
  iterations = 5000,
  eta = 0.05,
): { rowStrategy: number[]; colStrategy: number[] } {
  // 乗算重み更新法(Multiplicative Weights Update)で二人零和ゲームの近似混合戦略を求める。
  // payoff[i][j]: 行プレイヤーの手iと列プレイヤーの手jに対する行プレイヤーの利得
  const nRows = payoff.length;
  const nCols = payoff[0].length;
  let rowWeights = new Array<number>(nRows).fill(1);
  let colWeights = new Array<number>(nCols).fill(1);

  const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

  for (let iter = 0; iter < iterations; iter++) {
    const rowTotal = sum(rowWeights);
    const colTotal = sum(colWeights);
    const rowProbs = rowWeights.map((w) => w / rowTotal);
    const colProbs = colWeights.map((w) => w / colTotal);

    // 相手の現在の混合戦略に対する各手の期待利得で重みを更新する
    const rowGain = payoff.map((row) => row.reduce((s, v, j) => s + v * colProbs[j], 0));
    const colLoss = new Array<number>(nCols).fill(0).map((_, j) =>
      rowProbs.reduce((s, p, i) => s + p * payoff[i][j], 0),
    );

    rowWeights = rowWeights.map((w, i) => w * Math.exp(eta * rowGain[i]));
    colWeights = colWeights.map((w, j) => w * Math.exp(-eta * colLoss[j]));
  }

  const rowTotal = sum(rowWeights);
  const colTotal = sum(colWeights);
  return {
    rowStrategy: rowWeights.map((w) => w / rowTotal),
    colStrategy: colWeights.map((w) => w / colTotal),
  };
}

// じゃんけん: グー・チョキ・パーの利得行列(行プレイヤー視点)
const rpsPayoff = [
  [0, 1, -1],
  [-1, 0, 1],
  [1, -1, 0],
];
const { rowStrategy } = solveZeroSumMWU(rpsPayoff);
console.log(rowStrategy); // おおよそ [1/3, 1/3, 1/3] に収束する
```
