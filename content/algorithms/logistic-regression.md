---
name: ロジスティック回帰
category: 機械学習
subcategory: 教師あり学習
complexity: O(nd)(1エポック、n=サンプル数、d=特徴数)
summary: 線形回帰の出力をシグモイド関数に通すことで「確率」として解釈できるようにした分類手法で、[パーセプトロン](/algorithms/perceptron)の単純な0/1判定を、確率的な予測と滑らかな損失関数による最適化に置き換えた、分類問題の標準的な出発点。
---

## 概要

[パーセプトロン](/algorithms/perceptron)は「正か負か」を直接判定する単純なモデルだが、判定が不連続(境界をわずかに超えただけで出力が0から1へ飛ぶ)であるため、[勾配降下法](/algorithms/gradient-descent)のような滑らかな最適化とは相性が悪い。ロジスティック回帰は、[線形回帰](/algorithms/least-squares)と同じ「特徴の重み付き和」を計算した後、その値をシグモイド関数(`σ(z) = 1/(1+e^-z)`、出力を必ず0〜1の範囲に収める滑らかなS字カーブ)に通すことで、出力を「その入力がクラス1に属する確率」として解釈できるようにする。この一手間により、分類問題を「確率分布のパラメータを最尤推定で求める」という統計学的にも扱いやすい問題に変換でき、実務で最も広く使われる分類アルゴリズムの1つとなっている。

## 仕組み

1. 各サンプルの特徴ベクトル`x`に対し、重みベクトル`w`とバイアス`b`を使って線形結合`z = w・x + b`を計算する(ここまでは[線形回帰](/algorithms/least-squares)と同じ)
2. `z`をシグモイド関数に通し、`p = σ(z) = 1/(1+e^-z)`を計算する。`p`は0〜1の値を取り、「このサンプルがクラス1に属する予測確率」として解釈される
3. 正解ラベル`y`(0または1)と予測確率`p`との差を測る損失関数として、交差エントロピー損失`L = -[y log(p) + (1-y) log(1-p)]`を使う——予測が正解から大きく外れているほど損失が急激に大きくなるよう設計されている
4. 全サンプルについての損失の平均を最小化するよう、[勾配降下法](/algorithms/gradient-descent)で`w`と`b`を反復的に更新する(交差エントロピー損失の勾配は驚くほど単純な形`(p-y)x`になり、[誤差逆伝播法](/algorithms/backpropagation)の最も基本的な例としても使われる)
5. 学習後、新しいサンプルに対して`p`が0.5を超えればクラス1、そうでなければクラス0と判定する(閾値0.5は用途に応じて調整できる)

## 特性・トレードオフ

- **計算量**: 1エポックあたり全サンプル・全特徴を1回ずつ処理する`O(nd)`——[線形回帰](/algorithms/least-squares)と同じオーダーで、大規模データにも適用しやすい
- **[パーセプトロン](/algorithms/perceptron)との違い**: [パーセプトロン](/algorithms/perceptron)は「間違えたら更新する」という誤り駆動の学習則で、収束すれば完全に分離できる境界を見つけるが確率は出力しない。ロジスティック回帰は必ず滑らかな損失関数の最小化として定式化されるため、勾配ベースの最適化と相性がよく、かつ「70%の確率でクラス1」のような確信度付きの予測ができる
- **線形分離可能性という制約**: 名前に「回帰」とあるが分類アルゴリズムであり、その決定境界は本質的に線形(特徴空間内の直線・平面)である。線形分離できない複雑なデータには、特徴量の非線形変換や[サポートベクターマシン](/algorithms/svm)のカーネルトリック、あるいは[決定木](/algorithms/decision-tree)・ニューラルネットワークのような非線形モデルが必要になる
- **使いどころ**: 医療診断における発症確率の推定、広告のクリック率(CTR)予測、与信審査における債務不履行確率の推定、[パーセプトロン](/algorithms/perceptron)や[ナイーブベイズ](/algorithms/naive-bayes)と並ぶ、解釈性と実装の単純さから今なお実務で第一の選択肢になる分類手法

## 実装例

交差エントロピー損失の勾配`(p - y) * x`を使った素朴なバッチ勾配降下法で学習する。

```python
import math

def sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    ez = math.exp(z)
    return ez / (1.0 + ez)  # オーバーフロー対策: 負の大きなzでも安定した式に切り替える


def train_logistic_regression(X: list[list[float]], y: list[int], lr: float = 0.1, epochs: int = 1000):
    """勾配降下法でロジスティック回帰のパラメータ(w, b)を学習する。yは0/1のラベル。"""
    n, d = len(X), len(X[0])
    w = [0.0] * d
    b = 0.0
    for _ in range(epochs):
        grad_w = [0.0] * d
        grad_b = 0.0
        for i in range(n):
            z = sum(w[j] * X[i][j] for j in range(d)) + b
            p = sigmoid(z)
            error = p - y[i]  # 交差エントロピー損失の勾配はこの単純な形になる
            for j in range(d):
                grad_w[j] += error * X[i][j]
            grad_b += error
        for j in range(d):
            w[j] -= lr * grad_w[j] / n
        b -= lr * grad_b / n
    return w, b


def predict_proba(w: list[float], b: float, x: list[float]) -> float:
    z = sum(wi * xi for wi, xi in zip(w, x)) + b
    return sigmoid(z)


def predict(w: list[float], b: float, x: list[float], threshold: float = 0.5) -> int:
    return 1 if predict_proba(w, b, x) >= threshold else 0
```

```typescript
function sigmoid(z: number): number {
  if (z >= 0) return 1.0 / (1.0 + Math.exp(-z));
  const ez = Math.exp(z);
  return ez / (1.0 + ez); // オーバーフロー対策: 負の大きなzでも安定した式に切り替える
}

// 勾配降下法でロジスティック回帰のパラメータ(w, b)を学習する。yは0/1のラベル
function trainLogisticRegression(
  X: number[][],
  y: number[],
  lr = 0.1,
  epochs = 1000
): [number[], number] {
  const n = X.length;
  const d = X[0].length;
  const w = new Array(d).fill(0);
  let b = 0;
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const p = sigmoid(z);
      const error = p - y[i]; // 交差エントロピー損失の勾配はこの単純な形になる
      for (let j = 0; j < d; j++) gradW[j] += error * X[i][j];
      gradB += error;
    }
    for (let j = 0; j < d; j++) w[j] -= (lr * gradW[j]) / n;
    b -= (lr * gradB) / n;
  }
  return [w, b];
}

function predictProba(w: number[], b: number, x: number[]): number {
  let z = b;
  for (let j = 0; j < w.length; j++) z += w[j] * x[j];
  return sigmoid(z);
}

function predict(w: number[], b: number, x: number[], threshold = 0.5): number {
  return predictProba(w, b, x) >= threshold ? 1 : 0;
}
```

```cpp
#include <vector>
#include <cmath>

double sigmoid(double z) {
    if (z >= 0) return 1.0 / (1.0 + std::exp(-z));
    double ez = std::exp(z);
    return ez / (1.0 + ez); // オーバーフロー対策
}

// 勾配降下法でロジスティック回帰のパラメータ(w, b)を学習する。yは0/1のラベル
std::pair<std::vector<double>, double> trainLogisticRegression(
    const std::vector<std::vector<double>>& X, const std::vector<int>& y,
    double lr = 0.1, int epochs = 1000) {
    int n = static_cast<int>(X.size());
    int d = static_cast<int>(X[0].size());
    std::vector<double> w(d, 0.0);
    double b = 0.0;
    for (int epoch = 0; epoch < epochs; epoch++) {
        std::vector<double> gradW(d, 0.0);
        double gradB = 0.0;
        for (int i = 0; i < n; i++) {
            double z = b;
            for (int j = 0; j < d; j++) z += w[j] * X[i][j];
            double p = sigmoid(z);
            double error = p - y[i]; // 交差エントロピー損失の勾配はこの単純な形になる
            for (int j = 0; j < d; j++) gradW[j] += error * X[i][j];
            gradB += error;
        }
        for (int j = 0; j < d; j++) w[j] -= lr * gradW[j] / n;
        b -= lr * gradB / n;
    }
    return {w, b};
}

double predictProba(const std::vector<double>& w, double b, const std::vector<double>& x) {
    double z = b;
    for (size_t j = 0; j < w.size(); j++) z += w[j] * x[j];
    return sigmoid(z);
}

int predict(const std::vector<double>& w, double b, const std::vector<double>& x, double threshold = 0.5) {
    return predictProba(w, b, x) >= threshold ? 1 : 0;
}
```

```rust
fn sigmoid(z: f64) -> f64 {
    if z >= 0.0 {
        1.0 / (1.0 + (-z).exp())
    } else {
        let ez = z.exp();
        ez / (1.0 + ez) // オーバーフロー対策
    }
}

// 勾配降下法でロジスティック回帰のパラメータ(w, b)を学習する。yは0/1のラベル
fn train_logistic_regression(x: &[Vec<f64>], y: &[i32], lr: f64, epochs: usize) -> (Vec<f64>, f64) {
    let n = x.len();
    let d = x[0].len();
    let mut w = vec![0.0_f64; d];
    let mut b = 0.0_f64;
    for _ in 0..epochs {
        let mut grad_w = vec![0.0_f64; d];
        let mut grad_b = 0.0_f64;
        for i in 0..n {
            let mut z = b;
            for j in 0..d {
                z += w[j] * x[i][j];
            }
            let p = sigmoid(z);
            let error = p - y[i] as f64; // 交差エントロピー損失の勾配はこの単純な形になる
            for j in 0..d {
                grad_w[j] += error * x[i][j];
            }
            grad_b += error;
        }
        for j in 0..d {
            w[j] -= lr * grad_w[j] / n as f64;
        }
        b -= lr * grad_b / n as f64;
    }
    (w, b)
}

fn predict_proba(w: &[f64], b: f64, x: &[f64]) -> f64 {
    let z: f64 = b + w.iter().zip(x).map(|(wi, xi)| wi * xi).sum::<f64>();
    sigmoid(z)
}

fn predict(w: &[f64], b: f64, x: &[f64], threshold: f64) -> i32 {
    if predict_proba(w, b, x) >= threshold { 1 } else { 0 }
}
```

```csharp
using System;

static class LogisticRegression
{
    static double Sigmoid(double z)
    {
        if (z >= 0) return 1.0 / (1.0 + Math.Exp(-z));
        double ez = Math.Exp(z);
        return ez / (1.0 + ez); // オーバーフロー対策
    }

    // 勾配降下法でロジスティック回帰のパラメータ(w, b)を学習する。yは0/1のラベル
    public static (double[] W, double B) Train(double[][] x, int[] y, double lr = 0.1, int epochs = 1000)
    {
        int n = x.Length, d = x[0].Length;
        var w = new double[d];
        double b = 0.0;
        for (int epoch = 0; epoch < epochs; epoch++)
        {
            var gradW = new double[d];
            double gradB = 0.0;
            for (int i = 0; i < n; i++)
            {
                double z = b;
                for (int j = 0; j < d; j++) z += w[j] * x[i][j];
                double p = Sigmoid(z);
                double error = p - y[i]; // 交差エントロピー損失の勾配はこの単純な形になる
                for (int j = 0; j < d; j++) gradW[j] += error * x[i][j];
                gradB += error;
            }
            for (int j = 0; j < d; j++) w[j] -= lr * gradW[j] / n;
            b -= lr * gradB / n;
        }
        return (w, b);
    }

    public static double PredictProba(double[] w, double b, double[] x)
    {
        double z = b;
        for (int j = 0; j < w.Length; j++) z += w[j] * x[j];
        return Sigmoid(z);
    }

    public static int Predict(double[] w, double b, double[] x, double threshold = 0.5) =>
        PredictProba(w, b, x) >= threshold ? 1 : 0;
}
```
