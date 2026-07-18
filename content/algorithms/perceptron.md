---
name: パーセプトロン
category: 機械学習
subcategory: 教師あり学習
complexity: O(nd)(1エポック)
summary: 入力の重み付き和が閾値を超えるかで分類する最も単純なニューラルネット。線形分離不可能な問題を解けない限界が後の研究を導いた。
---

## 概要

1958年にフランク・ローゼンブラットが考案した、現代のニューラルネットワークの直系の祖先にあたる、最も単純な学習モデル。生物の神経細胞(ニューロン)が、複数の入力信号を受け取り、その合計がある閾値を超えたときだけ発火する仕組みを数理モデル化した。単純ながら、「データから自動的に学習する」という発想を初めて具体的なアルゴリズムとして実現した歴史的な意義を持つ。

## 仕組み

1. 各入力に「重み」を割り当て、入力値と重みの積の合計(重み付き和)を計算する
2. その合計値が、ある閾値(バイアス)を超えていれば出力1(あるクラス)、超えていなければ出力0(別のクラス)とする
3. 訓練データに対して予測が間違っていたら、**間違えた方向を修正するように重みを更新する**(正解が1なのに0と予測したら重みを増やす方向に、逆なら減らす方向に)
4. 全ての訓練データについて、正しく分類できるようになるまで(あるいは一定回数)2〜3を繰り返す

この単純な更新規則(パーセプトロン学習規則)は、**もしデータが直線(または超平面)で完全に分離できるなら、有限回の更新で必ず収束する**ことが数学的に証明されている(パーセプトロン収束定理)。

## 特性・トレードオフ

- **計算量**: 1回の学習ステップ(エポック)がO(nd)(n=データ数、d=次元数)
- **線形分離可能な問題にしか対応できない**: 1969年、マービン・ミンスキーとシーモア・パパートが、パーセプトロンが**XOR(排他的論理和)のような単純な非線形問題すら解けない**ことを数学的に示し、これが「第一次AIの冬」と呼ばれる、ニューラルネットワーク研究の停滞期を招いた
- **多層化による復活**: 単一のパーセプトロンでは非線形問題を解けないが、複数のパーセプトロンを層状に重ねた「多層パーセプトロン」(と、それを学習させる誤差逆伝播法の発見)によって、この限界は克服され、現代のディープラーニングへとつながっていく
- **使いどころ**: 現在では単体で実用されることは少ないが、ニューラルネットワークの最も基本的な構成要素(1つのニューロン)として、また機械学習の歴史と限界・発展の物語を理解する教育的な題材として、今なお重要な位置を占めている

## 実装例

```python
def perceptron_train(
    X: list[list[float]], y: list[int], lr: float = 0.1, epochs: int = 20
) -> tuple[list[float], float]:
    n_features = len(X[0])
    weights = [0.0] * n_features
    bias = 0.0

    for _ in range(epochs):
        errors = 0
        for xi, target in zip(X, y):
            activation = sum(w * x for w, x in zip(weights, xi)) + bias
            prediction = 1 if activation >= 0 else 0
            error = target - prediction
            if error != 0:
                errors += 1
                weights = [w + lr * error * x for w, x in zip(weights, xi)]
                bias += lr * error
        if errors == 0:  # 全データを正しく分類できたら早期終了
            break

    return weights, bias


def perceptron_predict(x: list[float], weights: list[float], bias: float) -> int:
    activation = sum(w * xi for w, xi in zip(weights, x)) + bias
    return 1 if activation >= 0 else 0
```

```typescript
function perceptronTrain(
  X: number[][],
  y: number[],
  lr = 0.1,
  epochs = 20,
): [number[], number] {
  const nFeatures = X[0].length;
  let weights = new Array(nFeatures).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    let errors = 0;
    for (let i = 0; i < X.length; i++) {
      const xi = X[i];
      const target = y[i];
      const activation = weights.reduce((sum, w, j) => sum + w * xi[j], 0) + bias;
      const prediction = activation >= 0 ? 1 : 0;
      const error = target - prediction;
      if (error !== 0) {
        errors++;
        weights = weights.map((w, j) => w + lr * error * xi[j]);
        bias += lr * error;
      }
    }
    if (errors === 0) break; // 全データを正しく分類できたら早期終了
  }
  return [weights, bias];
}

function perceptronPredict(x: number[], weights: number[], bias: number): number {
  const activation = weights.reduce((sum, w, j) => sum + w * x[j], 0) + bias;
  return activation >= 0 ? 1 : 0;
}
```

```cpp
#include <vector>

struct PerceptronModel {
    std::vector<double> weights;
    double bias;
};

PerceptronModel perceptronTrain(const std::vector<std::vector<double>>& X, const std::vector<int>& y,
                                 double lr = 0.1, int epochs = 20) {
    size_t nFeatures = X[0].size();
    std::vector<double> weights(nFeatures, 0.0);
    double bias = 0.0;

    for (int epoch = 0; epoch < epochs; epoch++) {
        int errors = 0;
        for (size_t i = 0; i < X.size(); i++) {
            double activation = bias;
            for (size_t j = 0; j < nFeatures; j++) activation += weights[j] * X[i][j];
            int prediction = activation >= 0 ? 1 : 0;
            int error = y[i] - prediction;
            if (error != 0) {
                errors++;
                for (size_t j = 0; j < nFeatures; j++) weights[j] += lr * error * X[i][j];
                bias += lr * error;
            }
        }
        if (errors == 0) break; // 全データを正しく分類できたら早期終了
    }
    return {weights, bias};
}

int perceptronPredict(const std::vector<double>& x, const PerceptronModel& model) {
    double activation = model.bias;
    for (size_t j = 0; j < x.size(); j++) activation += model.weights[j] * x[j];
    return activation >= 0 ? 1 : 0;
}
```

```rust
struct PerceptronModel {
    weights: Vec<f64>,
    bias: f64,
}

fn perceptron_train(x: &[Vec<f64>], y: &[i32], lr: f64, epochs: usize) -> PerceptronModel {
    let n_features = x[0].len();
    let mut weights = vec![0.0; n_features];
    let mut bias = 0.0;

    for _ in 0..epochs {
        let mut errors = 0;
        for (xi, &target) in x.iter().zip(y.iter()) {
            let activation: f64 =
                weights.iter().zip(xi.iter()).map(|(w, xi)| w * xi).sum::<f64>() + bias;
            let prediction = if activation >= 0.0 { 1 } else { 0 };
            let error = target - prediction;
            if error != 0 {
                errors += 1;
                for (w, xi) in weights.iter_mut().zip(xi.iter()) {
                    *w += lr * error as f64 * xi;
                }
                bias += lr * error as f64;
            }
        }
        if errors == 0 {
            break; // 全データを正しく分類できたら早期終了
        }
    }
    PerceptronModel { weights, bias }
}

fn perceptron_predict(x: &[f64], model: &PerceptronModel) -> i32 {
    let activation: f64 =
        model.weights.iter().zip(x.iter()).map(|(w, xi)| w * xi).sum::<f64>() + model.bias;
    if activation >= 0.0 {
        1
    } else {
        0
    }
}
```

```csharp
static (double[] Weights, double Bias) PerceptronTrain(double[][] X, int[] y, double lr = 0.1, int epochs = 20)
{
    int nFeatures = X[0].Length;
    double[] weights = new double[nFeatures];
    double bias = 0;

    for (int epoch = 0; epoch < epochs; epoch++)
    {
        int errors = 0;
        for (int i = 0; i < X.Length; i++)
        {
            double activation = bias;
            for (int j = 0; j < nFeatures; j++) activation += weights[j] * X[i][j];
            int prediction = activation >= 0 ? 1 : 0;
            int error = y[i] - prediction;
            if (error != 0)
            {
                errors++;
                for (int j = 0; j < nFeatures; j++) weights[j] += lr * error * X[i][j];
                bias += lr * error;
            }
        }
        if (errors == 0) break; // 全データを正しく分類できたら早期終了
    }
    return (weights, bias);
}

static int PerceptronPredict(double[] x, double[] weights, double bias)
{
    double activation = bias;
    for (int j = 0; j < weights.Length; j++) activation += weights[j] * x[j];
    return activation >= 0 ? 1 : 0;
}
```
