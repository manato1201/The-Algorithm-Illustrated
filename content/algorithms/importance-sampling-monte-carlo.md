---
name: 重点サンプリング法(Importance Sampling)
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: O(N)(N個のサンプルに対する重み付き推定)
summary: 稀にしか起こらない事象や裾の重い分布を推定する際、目的の分布ではなくその事象が起きやすい別の提案分布からサンプリングし、確率密度比で重み付け補正することで、少ないサンプル数でも推定値の分散を大きく減らすモンテカルロ分散低減技法。
---

## 概要

[モンテカルロ法](/algorithms/monte-carlo)は乱数サンプリングによって積分や期待値を近似する強力な手法だが、素朴な(目的の確率分布からそのままサンプリングする)実装には弱点がある——推定したい事象が**稀にしか起こらない**場合(例えば「システムが1万回に1回しか起こさない障害の確率」や、金融における「暴落のような極端な損失シナリオの確率」)、素朴なサンプリングではその事象がほとんどサンプルに現れず、莫大な試行回数がなければ安定した推定ができない。重点サンプリング法は、この問題を「サンプリングする分布そのものを、目的の事象が起きやすいように意図的に歪めた**提案分布**に取り替え、その歪みを**重み(確率密度比)で数学的に補正する**」という発想で解決する統計学の古典的な分散低減技法である。目的の分布から直接サンプリングするのが困難・非効率な場面全般で使われ、強化学習の方策評価やベイズ推論、コンピュータグラフィックスのレンダリングなど応用範囲は非常に広い。

## 仕組み

目的の分布`p(x)`のもとでの関数`f(x)`の期待値`E_p[f(x)]`を推定したいとする。

1. `p(x)`とは異なる、サンプリングしやすく、かつ**目的の事象が起きやすい領域を重点的にカバーする**提案分布`q(x)`を選ぶ(この選択が推定精度を左右する最も重要なステップ)
2. `q(x)`から`N`個のサンプル`x_1, ..., x_N`を生成する(`p(x)`からではなく`q(x)`からサンプリングする点が核心)
3. 各サンプルについて、**重要度重み** `w_i = p(x_i) / q(x_i)`(目的分布と提案分布の確率密度比)を計算する。`q(x)`が過剰にサンプリングした領域には小さい重みを、過小にサンプリングした領域には大きい重みを与えることで、分布の歪みを打ち消す
4. 重み付き平均 `Σ w_i・f(x_i) / N` を計算する。これは`E_p[f(x)]`の**不偏推定量**になっている(期待値を取ると数学的に元の`p`のもとでの期待値と一致することが証明できる)——`q(x)`をどう選んでも(`p(x) > 0`となる全ての`x`で`q(x) > 0`である限り)この不偏性は保たれる
5. 分散を抑えたい場合は、`w_i`を`Σw_i`で正規化する**自己正規化重点サンプリング**を使う(バイアスはわずかに生じるが、多くの実務的な場面で分散が安定する)

提案分布`q(x)`を、`f(x)・p(x)`が大きい(つまり「重要」な)領域に確率質量を寄せるように設計できれば、素朴なサンプリングよりはるかに少ないサンプル数で分散の小さい推定が得られる。

## 特性・トレードオフ

- **[モンテカルロ法](/algorithms/monte-carlo)の直接的な分散低減技法**: 素朴なモンテカルロ推定がサンプル数`N`に対して`O(1/√N)`で分散が減っていくのに対し、重点サンプリングは提案分布`q`を賢く選ぶことで同じサンプル数でより小さい分散を達成できる。理論上の最適な`q`は`|f(x)|・p(x)`に比例する分布だが、これは通常`f`の積分値(まさに推定したい量)を要求するため実際には近似的にしか選べない
- **[交差エントロピー法](/algorithms/cross-entropy-method)との関係**: CEMはまさにこの「最適な提案分布探索」問題を、反復的にエリートサンプルへ分布を近づけることで解こうとする手法であり、重点サンプリングの理論(交差エントロピーの最小化によって理想的な提案分布に近づける)をアルゴリズムの内部エンジンとして使っている。CEMは重点サンプリングの適用例の1つと位置づけられる
- **提案分布の選択を誤ると逆効果**: `q(x)`が`p(x)`の裾(重要な領域)を十分にカバーしていないと、重み`w_i = p(x_i)/q(x_i)`が極端に大きくなる稀なサンプルが推定値を支配し、かえって分散が爆発する(悪くすると素朴なサンプリングより悪化する)。提案分布の設計には対象分野の知識が要求され、汎用的な自動選択は難しい
- **オフポリシー強化学習での応用**: ある方策(挙動方策)で集めたデータから、別の方策(目標方策)の価値を評価したい場合、重点サンプリングによって挙動方策のデータに目標方策と挙動方策の確率比で重みを付けることで、目標方策のもとでの期待収益を不偏推定できる。オフポリシー評価・オフライン強化学習の基礎理論として使われる
- **使いどころ**: 稀事象の確率推定(システムの故障確率、金融のテールリスク推定)、ベイズ統計における事後分布からのサンプリングが困難な場合の近似、強化学習のオフポリシー評価、レイトレーシングにおける光源方向のサンプリング効率化、[交差エントロピー法](/algorithms/cross-entropy-method)のような適応的サンプリング手法の理論的基盤

## 実装例

標準正規分布`p`のもとで「`x > 4`となる確率」(素朴なサンプリングでは滅多にヒットしない稀事象)を、`x > 4`付近に重点を置いた提案分布`q`(平均4の正規分布)を使って推定する例を示す。

```python
import random
import math


def normal_pdf(x: float, mean: float = 0.0, std: float = 1.0) -> float:
    return math.exp(-((x - mean) ** 2) / (2 * std**2)) / (std * math.sqrt(2 * math.pi))


def sample_normal(mean: float, std: float) -> float:
    u1, u2 = random.random(), random.random()
    z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
    return mean + std * z


def importance_sampling_tail_probability(
    threshold: float = 4.0,
    proposal_mean: float = 4.0,
    proposal_std: float = 1.0,
    n_samples: int = 10_000,
) -> float:
    """標準正規分布のもとで x > threshold となる確率を重点サンプリングで推定する。"""
    total_weight = 0.0
    for _ in range(n_samples):
        x = sample_normal(proposal_mean, proposal_std)  # 目的分布pではなく提案分布qからサンプリング
        indicator = 1.0 if x > threshold else 0.0
        if indicator == 0.0:
            continue
        weight = normal_pdf(x, 0.0, 1.0) / normal_pdf(x, proposal_mean, proposal_std)  # p(x)/q(x)
        total_weight += indicator * weight

    return total_weight / n_samples
```

```typescript
function normalPdf(x: number, mean = 0.0, std = 1.0): number {
  return (
    Math.exp(-((x - mean) ** 2) / (2 * std ** 2)) / (std * Math.sqrt(2 * Math.PI))
  );
}

function sampleNormal(mean: number, std: number, rand: () => number = Math.random): number {
  const u1 = rand(),
    u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function importanceSamplingTailProbability(
  threshold = 4.0,
  proposalMean = 4.0,
  proposalStd = 1.0,
  nSamples = 10_000,
): number {
  // 標準正規分布のもとで x > threshold となる確率を重点サンプリングで推定する
  let totalWeight = 0;
  for (let i = 0; i < nSamples; i++) {
    const x = sampleNormal(proposalMean, proposalStd); // 目的分布pではなく提案分布qからサンプリング
    if (x <= threshold) continue;
    const weight = normalPdf(x, 0.0, 1.0) / normalPdf(x, proposalMean, proposalStd); // p(x)/q(x)
    totalWeight += weight;
  }

  return totalWeight / nSamples;
}
```
