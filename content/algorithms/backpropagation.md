---
name: 誤差逆伝播法(バックプロパゲーション)
category: 機械学習
subcategory: 教師あり学習
complexity: O(重み数)(1反復)
summary: 出力層の誤差を連鎖律で入力側に伝播させ、ニューラルネットワークの全重みの勾配を効率的に計算する。
---

## 概要

ニューラルネットワークを勾配降下法で学習させるには、**何百万・何十億もある全ての重みについて、勾配(その重みを変えると損失がどう変わるか)**を計算する必要がある。誤差逆伝播法は、この膨大な計算を、微分の連鎖律を使って**出力層から入力層へ向かって効率よく伝播させる**ことで、現実的な時間で行えるようにするアルゴリズム。1986年にRumelhart、Hinton、Williamsらの論文で広く知られるようになり、深層学習(ディープラーニング)を実用的な技術に押し上げた立役者。

## 仕組み

ニューラルネットワークは、入力から出力まで、複数の層を通じて計算を行う(順伝播)。誤差逆伝播法は、この逆方向に誤差の情報を伝えていく。

1. **順伝播**: 入力データをネットワークに通し、最終的な出力(予測)を計算する
2. 予測と正解の差から、**出力層での誤差(損失)**を計算する
3. **逆伝播**: 微分の連鎖律を使い、出力層の誤差を、1つ手前の層の各ニューロンの「誤差への寄与度」に分解して伝える。これを入力層に向かって層ごとに繰り返していく
4. 各層を通過する際、その層の重みについての勾配(損失をその重みで微分した値)が、この伝播の過程で自動的に計算される
5. 得られた全ての重みの勾配を使い、勾配降下法でパラメータを更新する

「出力の誤差を、原因となった各重みに"責任配分"していく」という発想を、微分の連鎖律という数学的に厳密な枠組みで実現しているのが本質。ネットワークがどれだけ深くても(層が多くても)、この伝播を繰り返すだけで全ての勾配が求まる。

## 特性・トレードオフ

- **計算量**: 1回の順伝播+逆伝播が、ネットワークの重みの総数にほぼ比例するO(重み数)で済む。個々の重みについて別々に数値微分するナイーブな方法(重み数の2乗以上かかる)に比べ圧倒的に効率的
- **勾配消失・爆発という課題**: ネットワークが深くなるほど、逆伝播の過程で勾配が極端に小さく(消失)、あるいは大きく(爆発)なりやすく、学習がうまく進まなくなることがある。活性化関数の工夫(ReLUなど)や正規化手法が、この問題への対策として発展してきた
- **自動微分としての一般化**: 現代の深層学習フレームワーク(PyTorch, TensorFlowなど)は、誤差逆伝播法の考え方を「自動微分」という、任意の計算グラフに対して微分を自動計算する仕組みとして一般化している
- **使いどころ**: 画像認識・自然言語処理・音声認識をはじめとする、あらゆるニューラルネットワークの学習の中核技術。ディープラーニングの実用化を支えた、最も重要なアルゴリズムのひとつ

## 実装例

以下は2層(入力層→隠れ層→出力層)のシンプルな全結合ネットワークに対する誤差逆伝播法の実装。

```python
import math
import random


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def sigmoid_derivative(y: float) -> float:
    return y * (1 - y)


class NeuralNetwork:
    def __init__(self, n_input: int, n_hidden: int, n_output: int, seed: int = 42):
        rng = random.Random(seed)
        self.w1 = [[rng.uniform(-1, 1) for _ in range(n_input)] for _ in range(n_hidden)]
        self.b1 = [0.0] * n_hidden
        self.w2 = [[rng.uniform(-1, 1) for _ in range(n_hidden)] for _ in range(n_output)]
        self.b2 = [0.0] * n_output

    def forward(self, x: list[float]) -> tuple[list[float], list[float]]:
        hidden = [sigmoid(sum(w * xi for w, xi in zip(row, x)) + b) for row, b in zip(self.w1, self.b1)]
        output = [sigmoid(sum(w * h for w, h in zip(row, hidden)) + b) for row, b in zip(self.w2, self.b2)]
        return hidden, output

    def train_step(self, x: list[float], target: list[float], lr: float = 0.5) -> float:
        hidden, output = self.forward(x)

        # 出力層の誤差とデルタ(連鎖律の最初の1段)
        output_errors = [t - o for t, o in zip(target, output)]
        output_deltas = [err * sigmoid_derivative(o) for err, o in zip(output_errors, output)]

        # 出力層のデルタを隠れ層に逆伝播させる
        hidden_errors = [
            sum(self.w2[k][j] * output_deltas[k] for k in range(len(output_deltas)))
            for j in range(len(hidden))
        ]
        hidden_deltas = [err * sigmoid_derivative(h) for err, h in zip(hidden_errors, hidden)]

        # 出力層の重み更新
        for k in range(len(self.w2)):
            for j in range(len(self.w2[k])):
                self.w2[k][j] += lr * output_deltas[k] * hidden[j]
            self.b2[k] += lr * output_deltas[k]

        # 隠れ層の重み更新
        for j in range(len(self.w1)):
            for i in range(len(self.w1[j])):
                self.w1[j][i] += lr * hidden_deltas[j] * x[i]
            self.b1[j] += lr * hidden_deltas[j]

        return sum(e ** 2 for e in output_errors)
```

```typescript
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function sigmoidDerivative(y: number): number {
  return y * (1 - y);
}

class NeuralNetwork {
  w1: number[][];
  b1: number[];
  w2: number[][];
  b2: number[];

  constructor(nInput: number, nHidden: number, nOutput: number, rng: () => number = Math.random) {
    this.w1 = Array.from({ length: nHidden }, () => Array.from({ length: nInput }, () => rng() * 2 - 1));
    this.b1 = new Array(nHidden).fill(0);
    this.w2 = Array.from({ length: nOutput }, () => Array.from({ length: nHidden }, () => rng() * 2 - 1));
    this.b2 = new Array(nOutput).fill(0);
  }

  forward(x: number[]): [number[], number[]] {
    const hidden = this.w1.map((row, i) => sigmoid(row.reduce((s, w, j) => s + w * x[j], 0) + this.b1[i]));
    const output = this.w2.map((row, i) => sigmoid(row.reduce((s, w, j) => s + w * hidden[j], 0) + this.b2[i]));
    return [hidden, output];
  }

  trainStep(x: number[], target: number[], lr = 0.5): number {
    const [hidden, output] = this.forward(x);

    // 出力層の誤差とデルタ(連鎖律の最初の1段)
    const outputErrors = target.map((t, i) => t - output[i]);
    const outputDeltas = outputErrors.map((err, i) => err * sigmoidDerivative(output[i]));

    // 出力層のデルタを隠れ層に逆伝播させる
    const hiddenErrors = hidden.map((_, j) => this.w2.reduce((s, row, k) => s + row[j] * outputDeltas[k], 0));
    const hiddenDeltas = hiddenErrors.map((err, j) => err * sigmoidDerivative(hidden[j]));

    for (let k = 0; k < this.w2.length; k++) {
      for (let j = 0; j < this.w2[k].length; j++) {
        this.w2[k][j] += lr * outputDeltas[k] * hidden[j];
      }
      this.b2[k] += lr * outputDeltas[k];
    }

    for (let j = 0; j < this.w1.length; j++) {
      for (let i = 0; i < this.w1[j].length; i++) {
        this.w1[j][i] += lr * hiddenDeltas[j] * x[i];
      }
      this.b1[j] += lr * hiddenDeltas[j];
    }

    return outputErrors.reduce((s, e) => s + e * e, 0);
  }
}
```

```cpp
#include <vector>
#include <utility>
#include <cmath>
#include <random>

double sigmoid(double x) { return 1.0 / (1.0 + std::exp(-x)); }
double sigmoidDerivative(double y) { return y * (1.0 - y); }

class NeuralNetwork {
public:
    NeuralNetwork(int nInput, int nHidden, int nOutput, unsigned seed = 42) {
        std::mt19937 rng(seed);
        std::uniform_real_distribution<double> dist(-1.0, 1.0);
        w1_.assign(nHidden, std::vector<double>(nInput));
        for (auto& row : w1_) for (auto& v : row) v = dist(rng);
        b1_.assign(nHidden, 0.0);
        w2_.assign(nOutput, std::vector<double>(nHidden));
        for (auto& row : w2_) for (auto& v : row) v = dist(rng);
        b2_.assign(nOutput, 0.0);
    }

    std::pair<std::vector<double>, std::vector<double>> forward(const std::vector<double>& x) const {
        std::vector<double> hidden(w1_.size());
        for (size_t i = 0; i < w1_.size(); i++) {
            double sum = b1_[i];
            for (size_t j = 0; j < x.size(); j++) sum += w1_[i][j] * x[j];
            hidden[i] = sigmoid(sum);
        }
        std::vector<double> output(w2_.size());
        for (size_t i = 0; i < w2_.size(); i++) {
            double sum = b2_[i];
            for (size_t j = 0; j < hidden.size(); j++) sum += w2_[i][j] * hidden[j];
            output[i] = sigmoid(sum);
        }
        return {hidden, output};
    }

    double trainStep(const std::vector<double>& x, const std::vector<double>& target, double lr = 0.5) {
        auto [hidden, output] = forward(x);

        // 出力層の誤差とデルタ(連鎖律の最初の1段)
        std::vector<double> outputErrors(output.size()), outputDeltas(output.size());
        for (size_t i = 0; i < output.size(); i++) {
            outputErrors[i] = target[i] - output[i];
            outputDeltas[i] = outputErrors[i] * sigmoidDerivative(output[i]);
        }

        // 出力層のデルタを隠れ層に逆伝播させる
        std::vector<double> hiddenErrors(hidden.size(), 0.0);
        for (size_t j = 0; j < hidden.size(); j++) {
            for (size_t k = 0; k < w2_.size(); k++) hiddenErrors[j] += w2_[k][j] * outputDeltas[k];
        }
        std::vector<double> hiddenDeltas(hidden.size());
        for (size_t j = 0; j < hidden.size(); j++) hiddenDeltas[j] = hiddenErrors[j] * sigmoidDerivative(hidden[j]);

        for (size_t k = 0; k < w2_.size(); k++) {
            for (size_t j = 0; j < w2_[k].size(); j++) w2_[k][j] += lr * outputDeltas[k] * hidden[j];
            b2_[k] += lr * outputDeltas[k];
        }
        for (size_t j = 0; j < w1_.size(); j++) {
            for (size_t i = 0; i < w1_[j].size(); i++) w1_[j][i] += lr * hiddenDeltas[j] * x[i];
            b1_[j] += lr * hiddenDeltas[j];
        }

        double loss = 0.0;
        for (double e : outputErrors) loss += e * e;
        return loss;
    }

private:
    std::vector<std::vector<double>> w1_, w2_;
    std::vector<double> b1_, b2_;
};
```

```rust
fn sigmoid(x: f64) -> f64 {
    1.0 / (1.0 + (-x).exp())
}

fn sigmoid_derivative(y: f64) -> f64 {
    y * (1.0 - y)
}

struct NeuralNetwork {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

impl NeuralNetwork {
    // rngは0.0〜1.0の一様乱数を返すクロージャ(実務ではrandクレート等を利用する)
    fn new(n_input: usize, n_hidden: usize, n_output: usize, mut rng: impl FnMut() -> f64) -> Self {
        let mut uniform = |rng: &mut dyn FnMut() -> f64| -1.0 + rng() * 2.0;
        let w1 = (0..n_hidden).map(|_| (0..n_input).map(|_| uniform(&mut rng)).collect()).collect();
        let w2 = (0..n_output).map(|_| (0..n_hidden).map(|_| uniform(&mut rng)).collect()).collect();
        NeuralNetwork { w1, b1: vec![0.0; n_hidden], w2, b2: vec![0.0; n_output] }
    }

    fn forward(&self, x: &[f64]) -> (Vec<f64>, Vec<f64>) {
        let hidden: Vec<f64> = self.w1.iter().zip(self.b1.iter())
            .map(|(row, &b)| sigmoid(row.iter().zip(x.iter()).map(|(w, xi)| w * xi).sum::<f64>() + b))
            .collect();
        let output: Vec<f64> = self.w2.iter().zip(self.b2.iter())
            .map(|(row, &b)| sigmoid(row.iter().zip(hidden.iter()).map(|(w, h)| w * h).sum::<f64>() + b))
            .collect();
        (hidden, output)
    }

    fn train_step(&mut self, x: &[f64], target: &[f64], lr: f64) -> f64 {
        let (hidden, output) = self.forward(x);

        // 出力層の誤差とデルタ(連鎖律の最初の1段)
        let output_errors: Vec<f64> = target.iter().zip(output.iter()).map(|(t, o)| t - o).collect();
        let output_deltas: Vec<f64> = output_errors.iter().zip(output.iter())
            .map(|(err, &o)| err * sigmoid_derivative(o))
            .collect();

        // 出力層のデルタを隠れ層に逆伝播させる
        let hidden_errors: Vec<f64> = (0..hidden.len())
            .map(|j| (0..output_deltas.len()).map(|k| self.w2[k][j] * output_deltas[k]).sum())
            .collect();
        let hidden_deltas: Vec<f64> = hidden_errors.iter().zip(hidden.iter())
            .map(|(err, &h)| err * sigmoid_derivative(h))
            .collect();

        for k in 0..self.w2.len() {
            for j in 0..self.w2[k].len() {
                self.w2[k][j] += lr * output_deltas[k] * hidden[j];
            }
            self.b2[k] += lr * output_deltas[k];
        }

        for j in 0..self.w1.len() {
            for i in 0..self.w1[j].len() {
                self.w1[j][i] += lr * hidden_deltas[j] * x[i];
            }
            self.b1[j] += lr * hidden_deltas[j];
        }

        output_errors.iter().map(|e| e * e).sum()
    }
}
```

```csharp
using System;
using System.Linq;

static double Sigmoid(double x) => 1 / (1 + Math.Exp(-x));
static double SigmoidDerivative(double y) => y * (1 - y);

class NeuralNetwork
{
    private readonly double[][] _w1, _w2;
    private readonly double[] _b1, _b2;

    public NeuralNetwork(int nInput, int nHidden, int nOutput, int seed = 42)
    {
        var rng = new Random(seed);
        _w1 = Enumerable.Range(0, nHidden).Select(_ => Enumerable.Range(0, nInput).Select(_ => rng.NextDouble() * 2 - 1).ToArray()).ToArray();
        _b1 = new double[nHidden];
        _w2 = Enumerable.Range(0, nOutput).Select(_ => Enumerable.Range(0, nHidden).Select(_ => rng.NextDouble() * 2 - 1).ToArray()).ToArray();
        _b2 = new double[nOutput];
    }

    public (double[] Hidden, double[] Output) Forward(double[] x)
    {
        var hidden = new double[_w1.Length];
        for (int i = 0; i < _w1.Length; i++)
        {
            double sum = _b1[i];
            for (int j = 0; j < x.Length; j++) sum += _w1[i][j] * x[j];
            hidden[i] = Sigmoid(sum);
        }
        var output = new double[_w2.Length];
        for (int i = 0; i < _w2.Length; i++)
        {
            double sum = _b2[i];
            for (int j = 0; j < hidden.Length; j++) sum += _w2[i][j] * hidden[j];
            output[i] = Sigmoid(sum);
        }
        return (hidden, output);
    }

    public double TrainStep(double[] x, double[] target, double lr = 0.5)
    {
        var (hidden, output) = Forward(x);

        // 出力層の誤差とデルタ(連鎖律の最初の1段)
        var outputErrors = new double[output.Length];
        var outputDeltas = new double[output.Length];
        for (int i = 0; i < output.Length; i++)
        {
            outputErrors[i] = target[i] - output[i];
            outputDeltas[i] = outputErrors[i] * SigmoidDerivative(output[i]);
        }

        // 出力層のデルタを隠れ層に逆伝播させる
        var hiddenErrors = new double[hidden.Length];
        for (int j = 0; j < hidden.Length; j++)
        {
            double sum = 0;
            for (int k = 0; k < _w2.Length; k++) sum += _w2[k][j] * outputDeltas[k];
            hiddenErrors[j] = sum;
        }
        var hiddenDeltas = new double[hidden.Length];
        for (int j = 0; j < hidden.Length; j++) hiddenDeltas[j] = hiddenErrors[j] * SigmoidDerivative(hidden[j]);

        for (int k = 0; k < _w2.Length; k++)
        {
            for (int j = 0; j < _w2[k].Length; j++) _w2[k][j] += lr * outputDeltas[k] * hidden[j];
            _b2[k] += lr * outputDeltas[k];
        }

        for (int j = 0; j < _w1.Length; j++)
        {
            for (int i = 0; i < _w1[j].Length; i++) _w1[j][i] += lr * hiddenDeltas[j] * x[i];
            _b1[j] += lr * hiddenDeltas[j];
        }

        return outputErrors.Sum(e => e * e);
    }
}
```
