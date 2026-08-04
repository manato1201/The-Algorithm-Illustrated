---
name: AdaBoost
category: 機械学習
subcategory: 教師あり学習
complexity: O(T・n・d)(Tは弱学習器の数、nはサンプル数、dは特徴数)
summary: 「決定株」のような単純で精度の低い弱学習器を、直前のモデルが間違えたサンプルを重点的に学習させながら何個も直列に積み重ね、それらの重み付き多数決として強力な分類器を作り上げるアンサンブル学習の代表格。
---

## 概要

[決定木](/algorithms/decision-tree)を1本だけ育てて使う代わりに、深さ1の非常に単純な決定木(「決定株」、1つの特徴だけで判定する弱学習器)を何十個も組み合わせたらどうなるだろうか。1996年にヨアフ・フロイント(Freund)とロバート・シャピレ(Schapire)が発表したAdaBoost(Adaptive Boosting)は、この発想を「直前の弱学習器が間違えたサンプルに重みを付けて、次の弱学習器がそこを重点的に学習するよう仕向ける」という巧妙な仕組みで実現する。個々の弱学習器はランダムより少しマシな程度の精度しかなくても、この「間違いに注目し続ける」逐次学習を繰り返し、最終的に全弱学習器の重み付き多数決を取ることで、驚くほど高精度な分類器に育て上げられることが理論的にも実証的にも示されている、ブースティング(boosting)という学習パラダイムの原点となったアルゴリズムである。

## 仕組み

1. 全サンプルに等しい重み`1/n`を割り当てて初期化する
2. 現在のサンプル重みのもとで最も誤り率の低い弱学習器(決定株など)を1つ学習する
3. その弱学習器の誤り率`ε`から、その弱学習器自身の信頼度(重み)`α = (1/2)ln((1-ε)/ε)`を計算する——誤り率が低いほど`α`は大きくなり、最終的な多数決でより強い発言権を持つ
4. 各サンプルの重みを更新する: その弱学習器が正しく分類したサンプルの重みは`e^-α`倍して減らし、誤分類したサンプルの重みは`e^α`倍して増やす。その後、全サンプルの重みの合計が1になるよう正規化する
5. 手順2〜4を指定した回数`T`繰り返し、`T`個の弱学習器`h_1, ..., h_T`とそれぞれの信頼度`α_1, ..., α_T`を得る
6. 最終的な予測は、各弱学習器の予測を信頼度`α`で重み付けした多数決`sign(Σ α_t h_t(x))`で決定する

## 特性・トレードオフ

- **計算量**: 各弱学習器の学習に`O(n・d)`(決定株なら全特徴・全サンプルを1回スキャンする程度)かかり、これを`T`個の弱学習器分繰り返すため`O(T・n・d)`
- **「弱学習器を強学習器に変える」という理論的保証**: 個々の弱学習器がランダムよりわずかでも良い性能(誤り率50%未満)を持ちさえすれば、ブースティングによって訓練誤差を指数関数的に0に近づけられることが数学的に証明されている——この「弱い学習器の集合から強い学習器を構成できる」という定理(PAC学習理論の文脈での「ブースティング可能性」)がAdaBoostの理論的な出発点になっている
- **外れ値・ノイズへの敏感さ**: 誤分類されたサンプルの重みを指数的に増やし続けるため、ラベル付けミスやノイズを含む外れ値サンプルに対しては過度に注目してしまい、過学習を招くことがある——[ランダムフォレスト](/algorithms/random-forest)のようなバギング系のアンサンブル手法と比べてノイズに弱いとされる一因
- **[ランダムフォレスト](/algorithms/random-forest)との対比**: [ランダムフォレスト](/algorithms/random-forest)が独立に学習した複数の木を並列に組み合わせる(バギング)のに対し、AdaBoostは弱学習器を逐次的に、前の学習器の失敗を踏まえて学習する(ブースティング)——アンサンブル学習の2大潮流を代表する好対照な手法になっている
- **使いどころ**: 顔検出(Viola-Jonesアルゴリズムの中核技術として、リアルタイム顔検出を実用化した歴史的な応用例)、スパムメール分類、信用スコアリング、勾配ブースティング(XGBoost・LightGBM等)というAdaBoostをさらに一般化・発展させた手法群の理論的な出発点

## 実装例

```python
import math


def _best_stump(X: list[list[float]], y: list[int], weights: list[float]):
    n, d = len(X), len(X[0])
    best = None  # (error, feature, threshold, polarity)
    for f in range(d):
        values = sorted(set(row[f] for row in X))
        thresholds = [-1e18] + [(values[i] + values[i + 1]) / 2 for i in range(len(values) - 1)] + [1e18]
        for threshold in thresholds:
            for polarity in (1, -1):
                err = 0.0
                for i in range(n):
                    pred = polarity if X[i][f] < threshold else -polarity
                    if pred != y[i]:
                        err += weights[i]
                if best is None or err < best[0]:
                    best = (err, f, threshold, polarity)
    return best


def _stump_predict(stump: tuple[float, int, float, int], x: list[float]) -> int:
    _, feature, threshold, polarity = stump
    return polarity if x[feature] < threshold else -polarity


def adaboost_train(X: list[list[float]], y: list[int], rounds: int):
    n = len(X)
    weights = [1.0 / n] * n
    learners = []  # list of (stump, alpha)
    for _ in range(rounds):
        err, feature, threshold, polarity = _best_stump(X, y, weights)
        err = min(max(err, 1e-10), 1 - 1e-10)
        alpha = 0.5 * math.log((1 - err) / err)
        stump = (err, feature, threshold, polarity)
        new_weights = []
        for i in range(n):
            pred = _stump_predict(stump, X[i])
            w = weights[i] * math.exp(-alpha * y[i] * pred)
            new_weights.append(w)
        total = sum(new_weights)
        weights = [w / total for w in new_weights]
        learners.append((stump, alpha))
    return learners


def adaboost_predict(learners, x: list[float]) -> int:
    total = sum(alpha * _stump_predict(stump, x) for stump, alpha in learners)
    return 1 if total >= 0 else -1
```

```typescript
type Stump = { feature: number; threshold: number; polarity: number };
type WeakLearner = { stump: Stump; alpha: number };

function stumpPredict(stump: Stump, x: number[]): number {
  return x[stump.feature] < stump.threshold ? stump.polarity : -stump.polarity;
}

function bestStump(
  X: number[][],
  y: number[],
  weights: number[],
): { stump: Stump; error: number } {
  const n = X.length;
  const d = X[0].length;
  let best: { stump: Stump; error: number } | null = null;

  for (let f = 0; f < d; f++) {
    const values = Array.from(new Set(X.map((row) => row[f]))).sort(
      (a, b) => a - b,
    );
    const thresholds = [-1e18];
    for (let i = 0; i < values.length - 1; i++) {
      thresholds.push((values[i] + values[i + 1]) / 2);
    }
    thresholds.push(1e18);

    for (const threshold of thresholds) {
      for (const polarity of [1, -1]) {
        let err = 0;
        for (let i = 0; i < n; i++) {
          const pred = X[i][f] < threshold ? polarity : -polarity;
          if (pred !== y[i]) err += weights[i];
        }
        if (best === null || err < best.error) {
          best = { stump: { feature: f, threshold, polarity }, error: err };
        }
      }
    }
  }
  return best!;
}

function adaboostTrain(
  X: number[][],
  y: number[],
  rounds: number,
): WeakLearner[] {
  const n = X.length;
  let weights = new Array(n).fill(1 / n);
  const learners: WeakLearner[] = [];

  for (let t = 0; t < rounds; t++) {
    const { stump, error } = bestStump(X, y, weights);
    const err = Math.min(Math.max(error, 1e-10), 1 - 1e-10);
    const alpha = 0.5 * Math.log((1 - err) / err);

    const newWeights = weights.map((w, i) => {
      const pred = stumpPredict(stump, X[i]);
      return w * Math.exp(-alpha * y[i] * pred);
    });
    const total = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map((w) => w / total);

    learners.push({ stump, alpha });
  }
  return learners;
}

function adaboostPredict(learners: WeakLearner[], x: number[]): number {
  const total = learners.reduce(
    (acc, { stump, alpha }) => acc + alpha * stumpPredict(stump, x),
    0,
  );
  return total >= 0 ? 1 : -1;
}
```

```cpp
#include <cmath>
#include <set>
#include <vector>

struct Stump {
    int feature;
    double threshold;
    int polarity;
};
struct WeakLearner {
    Stump stump;
    double alpha;
};

int stumpPredict(const Stump& stump, const std::vector<double>& x) {
    return x[stump.feature] < stump.threshold ? stump.polarity : -stump.polarity;
}

static Stump bestStump(const std::vector<std::vector<double>>& X, const std::vector<int>& y,
                        const std::vector<double>& weights, double& bestError) {
    int n = static_cast<int>(X.size());
    int d = static_cast<int>(X[0].size());
    Stump best{};
    bestError = 1e300;

    for (int f = 0; f < d; f++) {
        std::set<double> valueSet;
        for (const auto& row : X) valueSet.insert(row[f]);
        std::vector<double> values(valueSet.begin(), valueSet.end());
        std::vector<double> thresholds;
        thresholds.push_back(-1e18);
        for (size_t i = 0; i + 1 < values.size(); i++) thresholds.push_back((values[i] + values[i + 1]) / 2);
        thresholds.push_back(1e18);

        for (double threshold : thresholds) {
            for (int polarity : {1, -1}) {
                double err = 0.0;
                for (int i = 0; i < n; i++) {
                    int pred = X[i][f] < threshold ? polarity : -polarity;
                    if (pred != y[i]) err += weights[i];
                }
                if (err < bestError) {
                    bestError = err;
                    best = Stump{f, threshold, polarity};
                }
            }
        }
    }
    return best;
}

std::vector<WeakLearner> adaboostTrain(const std::vector<std::vector<double>>& X, const std::vector<int>& y, int rounds) {
    int n = static_cast<int>(X.size());
    std::vector<double> weights(n, 1.0 / n);
    std::vector<WeakLearner> learners;

    for (int t = 0; t < rounds; t++) {
        double error = 0.0;
        Stump stump = bestStump(X, y, weights, error);
        double err = std::min(std::max(error, 1e-10), 1 - 1e-10);
        double alpha = 0.5 * std::log((1 - err) / err);

        std::vector<double> newWeights(n);
        double total = 0.0;
        for (int i = 0; i < n; i++) {
            int pred = stumpPredict(stump, X[i]);
            newWeights[i] = weights[i] * std::exp(-alpha * y[i] * pred);
            total += newWeights[i];
        }
        for (int i = 0; i < n; i++) weights[i] = newWeights[i] / total;

        learners.push_back(WeakLearner{stump, alpha});
    }
    return learners;
}

int adaboostPredict(const std::vector<WeakLearner>& learners, const std::vector<double>& x) {
    double total = 0.0;
    for (const auto& learner : learners) total += learner.alpha * stumpPredict(learner.stump, x);
    return total >= 0 ? 1 : -1;
}
```

```rust
#[derive(Clone, Copy)]
struct Stump {
    feature: usize,
    threshold: f64,
    polarity: i32,
}
struct WeakLearner {
    stump: Stump,
    alpha: f64,
}

fn stump_predict(stump: &Stump, x: &[f64]) -> i32 {
    if x[stump.feature] < stump.threshold {
        stump.polarity
    } else {
        -stump.polarity
    }
}

fn best_stump(x: &[Vec<f64>], y: &[i32], weights: &[f64]) -> (Stump, f64) {
    let n = x.len();
    let d = x[0].len();
    let mut best_error = f64::MAX;
    let mut best_stump = Stump { feature: 0, threshold: 0.0, polarity: 1 };

    for f in 0..d {
        let mut values: Vec<f64> = x.iter().map(|row| row[f]).collect();
        values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        values.dedup();
        let mut thresholds = vec![-1e18];
        for i in 0..values.len().saturating_sub(1) {
            thresholds.push((values[i] + values[i + 1]) / 2.0);
        }
        thresholds.push(1e18);

        for &threshold in &thresholds {
            for &polarity in &[1, -1] {
                let mut err = 0.0;
                for i in 0..n {
                    let pred = if x[i][f] < threshold { polarity } else { -polarity };
                    if pred != y[i] {
                        err += weights[i];
                    }
                }
                if err < best_error {
                    best_error = err;
                    best_stump = Stump { feature: f, threshold, polarity };
                }
            }
        }
    }
    (best_stump, best_error)
}

fn adaboost_train(x: &[Vec<f64>], y: &[i32], rounds: usize) -> Vec<WeakLearner> {
    let n = x.len();
    let mut weights = vec![1.0 / n as f64; n];
    let mut learners = Vec::new();

    for _ in 0..rounds {
        let (stump, error) = best_stump(x, y, &weights);
        let err = error.max(1e-10).min(1.0 - 1e-10);
        let alpha = 0.5 * ((1.0 - err) / err).ln();

        let mut new_weights = vec![0.0; n];
        let mut total = 0.0;
        for i in 0..n {
            let pred = stump_predict(&stump, &x[i]);
            new_weights[i] = weights[i] * (-alpha * y[i] as f64 * pred as f64).exp();
            total += new_weights[i];
        }
        for i in 0..n {
            weights[i] = new_weights[i] / total;
        }

        learners.push(WeakLearner { stump, alpha });
    }
    learners
}

fn adaboost_predict(learners: &[WeakLearner], x: &[f64]) -> i32 {
    let total: f64 = learners.iter().map(|l| l.alpha * stump_predict(&l.stump, x) as f64).sum();
    if total >= 0.0 {
        1
    } else {
        -1
    }
}
```

```csharp
record Stump(int Feature, double Threshold, int Polarity);
record WeakLearner(Stump Stump, double Alpha);

static class AdaBoost
{
    public static int StumpPredict(Stump stump, double[] x) =>
        x[stump.Feature] < stump.Threshold ? stump.Polarity : -stump.Polarity;

    private static (Stump stump, double error) BestStump(double[][] X, int[] y, double[] weights)
    {
        int n = X.Length, d = X[0].Length;
        Stump? bestStump = null;
        double bestErr = double.MaxValue;
        for (int f = 0; f < d; f++)
        {
            var values = X.Select(row => row[f]).Distinct().OrderBy(v => v).ToArray();
            var thresholds = new List<double> { -1e18 };
            for (int i = 0; i < values.Length - 1; i++) thresholds.Add((values[i] + values[i + 1]) / 2);
            thresholds.Add(1e18);

            foreach (var threshold in thresholds)
            {
                foreach (var polarity in new[] { 1, -1 })
                {
                    double err = 0;
                    for (int i = 0; i < n; i++)
                    {
                        int pred = X[i][f] < threshold ? polarity : -polarity;
                        if (pred != y[i]) err += weights[i];
                    }
                    if (err < bestErr) { bestErr = err; bestStump = new Stump(f, threshold, polarity); }
                }
            }
        }
        return (bestStump!, bestErr);
    }

    public static List<WeakLearner> Train(double[][] X, int[] y, int rounds)
    {
        int n = X.Length;
        var weights = Enumerable.Repeat(1.0 / n, n).ToArray();
        var learners = new List<WeakLearner>();
        for (int t = 0; t < rounds; t++)
        {
            var (stump, error) = BestStump(X, y, weights);
            double err = Math.Min(Math.Max(error, 1e-10), 1 - 1e-10);
            double alpha = 0.5 * Math.Log((1 - err) / err);
            var newWeights = new double[n];
            for (int i = 0; i < n; i++)
                newWeights[i] = weights[i] * Math.Exp(-alpha * y[i] * StumpPredict(stump, X[i]));
            double total = newWeights.Sum();
            weights = newWeights.Select(w => w / total).ToArray();
            learners.Add(new WeakLearner(stump, alpha));
        }
        return learners;
    }

    public static int Predict(List<WeakLearner> learners, double[] x)
    {
        double total = learners.Sum(l => l.Alpha * StumpPredict(l.Stump, x));
        return total >= 0 ? 1 : -1;
    }
}
```
