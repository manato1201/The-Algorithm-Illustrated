---
name: 相関均衡 (Correlated Equilibrium)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(問題依存、線形計画法で多項式時間)
summary: 各プレイヤーが共通の外部信号(交通信号のような相関装置)に従うことでナッシュ均衡より高い利得を達成できる、より一般的な均衡概念。
---

## 概要

[ナッシュ均衡](/algorithms/nash-equilibrium)は各プレイヤーが独立に戦略を選ぶことを前提とするが、現実には信号機や仲裁人のような「全員が観測できる共通のシグナル」が存在し、それに従って行動を協調させることでより良い結果を得られる場面が多い。ロバート・オーマンが1974年に提唱した相関均衡は、こうした状況を定式化したもので、「各プレイヤーが、外部の相関装置(たとえば公正なコイン)から受け取った私的な推奨手に従うことが、他のプレイヤーも同様に従うと信じる限り自分にとっても最適である」という条件を満たす確率分布として定義される。交差点の信号機の例が典型で、「赤なら止まれ、青なら進め」という相関した推奨に両者が従うことは、単純な混合戦略のナッシュ均衡よりも高い期待利得(事故を避けつつスムーズに交差できる)を達成できる。あらゆるナッシュ均衡は相関均衡の特殊ケースであり、より広い解の集合を与える。

## 仕組み

1. 相関装置が、プレイヤーたちの行動の組み合わせ(結合戦略)に対する確率分布`p`から1つの組を選び、各プレイヤーには「自分の行動」だけを私的に(他人には見えない形で)推奨として伝える
2. 各プレイヤーは自分に推奨された行動しか観測できないが、確率分布`p`自体は共有知識(全員が知っている)であるため、推奨を受け取った時点で「他のプレイヤーが何を推奨されている可能性が高いか」の条件付き確率を推測できる
3. 分布`p`が相関均衡であるための条件は、「どのプレイヤーについても、自分が推奨された行動から一方的に別の行動へ逸脱しても、条件付き期待利得が改善しない」こと(**誘因両立性**)である
4. この条件は分布`p`の各成分に関する**線形不等式制約**として書き下せるため、相関均衡を求める問題はナッシュ均衡の計算(一般に非線形で計算困難)と異なり線形計画問題に帰着し、多項式時間で解くことができる
5. 社会的厚生(全プレイヤーの利得の合計)を最大化する相関均衡を、この線形計画の目的関数として設定して求めることも可能で、これによりナッシュ均衡より効率的な結果を選び出せる

## 特性・トレードオフ

- **計算量**: 相関均衡の集合は線形不等式で定義される凸多面体(**相関均衡多面体**)であり、線形計画法で多項式時間で求解・最適化できる。ナッシュ均衡の計算(PPAD完全)より計算的に扱いやすい
- **ナッシュ均衡の一般化**: 各プレイヤーが独立に自分の戦略を確率的に選ぶ(相関装置を使わない)特殊ケースがナッシュ均衡に一致するため、相関均衡はナッシュ均衡を含む、より広く豊かな解の集合になる
- **社会的厚生の改善**: 交通信号やオークションの割当ルールのように、外部の調整機構を導入することで、各人が独立に行動する場合より全体の効率(利得の合計)を改善できることが多い
- **使いどころ**: 交通制御、通信プロトコルのスケジューリング、複数エージェントの協調行動設計、経済学における市場の調整メカニズム設計など、共有シグナルによる協調が可能な状況のモデル化

## 実装例

「チキンゲーム」を例に、信号機のような相関装置を使った相関均衡の期待利得を、単純な結合確率分布として設定し検証する簡易実装を示す(線形計画法の完全な実装は行わず、既知の分布が誘因両立性を満たすかを検証する)。

```python
import numpy as np

# チキンゲーム: 行動0=譲る, 行動1=強行。行プレイヤーの利得行列と列プレイヤーの利得行列
payoff_row = np.array([[6, 2], [7, 0]], dtype=float)
payoff_col = np.array([[6, 7], [2, 0]], dtype=float)


def is_correlated_equilibrium(joint_dist: np.ndarray, payoff_row: np.ndarray, payoff_col: np.ndarray) -> bool:
    """joint_dist[i][j] = 行動(i, j)が推奨される確率。誘因両立性(逸脱して得しないこと)を検証する"""
    n_actions = joint_dist.shape[0]

    # 行プレイヤーの検証: 推奨された行動iから行動i'に逸脱して得をしないか
    for i in range(n_actions):
        prob_i = joint_dist[i, :].sum()
        if prob_i == 0:
            continue
        for i_prime in range(n_actions):
            if i_prime == i:
                continue
            current = sum(joint_dist[i, j] * payoff_row[i, j] for j in range(n_actions))
            deviate = sum(joint_dist[i, j] * payoff_row[i_prime, j] for j in range(n_actions))
            if deviate > current + 1e-9:
                return False

    # 列プレイヤーも同様に検証(役割を転置して同じロジックを適用)
    for j in range(n_actions):
        prob_j = joint_dist[:, j].sum()
        if prob_j == 0:
            continue
        for j_prime in range(n_actions):
            if j_prime == j:
                continue
            current = sum(joint_dist[i, j] * payoff_col[i, j] for i in range(n_actions))
            deviate = sum(joint_dist[i, j] * payoff_col[i, j_prime] for i in range(n_actions))
            if deviate > current + 1e-9:
                return False

    return True


# 信号機的な相関装置: (譲る,強行)と(強行,譲る)を半々に推奨し、両者が強行する組は絶対に選ばない
traffic_light_dist = np.array([[0.0, 0.5], [0.5, 0.0]])
print(is_correlated_equilibrium(traffic_light_dist, payoff_row, payoff_col))  # True
```

```typescript
// チキンゲーム: 行動0=譲る, 行動1=強行。行プレイヤーの利得行列と列プレイヤーの利得行列
const payoffRow = [
  [6, 2],
  [7, 0],
];
const payoffCol = [
  [6, 7],
  [2, 0],
];

function isCorrelatedEquilibrium(
  jointDist: number[][],
  payoffRow: number[][],
  payoffCol: number[][],
): boolean {
  // jointDist[i][j] = 行動(i, j)が推奨される確率。誘因両立性(逸脱して得しないこと)を検証する
  const nActions = jointDist.length;

  // 行プレイヤーの検証: 推奨された行動iから行動i'に逸脱して得をしないか
  for (let i = 0; i < nActions; i++) {
    const probI = jointDist[i].reduce((a, b) => a + b, 0);
    if (probI === 0) continue;
    for (let iPrime = 0; iPrime < nActions; iPrime++) {
      if (iPrime === i) continue;
      let current = 0;
      let deviate = 0;
      for (let j = 0; j < nActions; j++) {
        current += jointDist[i][j] * payoffRow[i][j];
        deviate += jointDist[i][j] * payoffRow[iPrime][j];
      }
      if (deviate > current + 1e-9) return false;
    }
  }

  // 列プレイヤーも同様に検証(役割を転置して同じロジックを適用)
  for (let j = 0; j < nActions; j++) {
    let probJ = 0;
    for (let i = 0; i < nActions; i++) probJ += jointDist[i][j];
    if (probJ === 0) continue;
    for (let jPrime = 0; jPrime < nActions; jPrime++) {
      if (jPrime === j) continue;
      let current = 0;
      let deviate = 0;
      for (let i = 0; i < nActions; i++) {
        current += jointDist[i][j] * payoffCol[i][j];
        deviate += jointDist[i][j] * payoffCol[i][jPrime];
      }
      if (deviate > current + 1e-9) return false;
    }
  }

  return true;
}

// 信号機的な相関装置: (譲る,強行)と(強行,譲る)を半々に推奨し、両者が強行する組は絶対に選ばない
const trafficLightDist = [
  [0.0, 0.5],
  [0.5, 0.0],
];
console.log(isCorrelatedEquilibrium(trafficLightDist, payoffRow, payoffCol)); // true
```
