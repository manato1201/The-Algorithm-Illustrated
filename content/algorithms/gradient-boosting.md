---
name: 勾配ブースティング(Gradient Boosting)
category: 機械学習
subcategory: 教師あり学習
complexity: O(T・n・d・log n)(Tは弱学習器の数、nはサンプル数、dは特徴数。決定木を弱学習器とする場合)
summary: 各段階で「これまでの予測の誤差(残差)」を新しい弱学習器で近似するように順に追加していく、勾配降下法の枠組みで損失関数を直接最小化するアンサンブル学習手法。
---

## 概要

[AdaBoost](/algorithms/adaboost)は「直前の弱学習器が間違えたサンプルの重みを上げる」という仕組みで逐次的にモデルを改善するブースティング手法だが、この考え方をより一般的な最適化の枠組みに拡張したのが勾配ブースティングである。1999年頃にジェローム・フリードマンによって定式化されたこの手法は、「モデルの予測を改善する」という問題を「損失関数の勾配を下る」という[勾配降下法](/algorithms/gradient-descent)の言葉で捉え直す——ただしパラメータ空間ではなく**関数空間**で勾配降下を行う。各段階で、現在のモデル全体の予測が正解からどれだけ、どの方向にずれているか(=損失関数の負の勾配、二乗誤差の場合は単純に「残差」)を計算し、その「ずれ」を予測するよう新しい弱学習器(多くの場合、浅い決定木)を学習して、既存のモデルに足し合わせる。この操作を繰り返すことで、モデル全体が損失関数を最小化する方向に段階的に近づいていく。XGBoost・LightGBM・CatBoostといった、実務の表形式データコンペで圧倒的な強さを誇る手法群はすべてこの勾配ブースティングの発展形である。

## 仕組み

1. 初期モデル`F_0(x)`を、単純な定数(例えば全訓練データの目的変数の平均)で初期化する
2. 各段階`m = 1, ..., M`について以下を繰り返す:
   a. 現在のモデル`F_{m-1}`の予測に対する損失関数`L`の**負の勾配**(疑似残差)`r_i = -∂L(y_i, F_{m-1}(x_i)) / ∂F_{m-1}(x_i)`を各サンプル`i`について計算する(二乗誤差損失`L = (1/2)(y-F)²`の場合、これは単純に`r_i = y_i - F_{m-1}(x_i)`、つまり「これまでの予測の残差」そのものになる)
   b. この疑似残差`r_i`を目的変数とみなし、新しい弱学習器(通常は深さの浅い決定木)`h_m(x)`を学習して残差のパターンを近似させる
   c. `h_m`を最適な係数(ステップサイズ)`γ_m`とともにモデルに追加する: `F_m(x) = F_{m-1}(x) + γ_m・h_m(x)`(`γ_m`は損失をさらに減らすよう1次元の最適化で求める)
3. `M`個の弱学習器を追加し終えたら、最終モデルは`F_M(x) = F_0(x) + Σ_{m=1}^{M} γ_m・h_m(x)`となる
4. 過学習を防ぐため、各弱学習器の寄与を割り引く学習率`η`(`F_m = F_{m-1} + η・γ_m・h_m`、`η < 1`)を導入するのが一般的(shrinkage)

## 特性・トレードオフ

- **計算量**: 決定木を弱学習器とする場合、1本の木の学習に`O(n・d・log n)`程度かかり、これを`T`回繰り返すため全体で`O(T・n・d・log n)`。[AdaBoost](/algorithms/adaboost)より1段階あたりの計算コストは高くなりがちだが、実装(XGBoost等)ではヒストグラムベースの高速な分割探索などで大幅に最適化されている
- **[AdaBoost](/algorithms/adaboost)との違い**: AdaBoostは「サンプルの重みを更新し、誤分類されたサンプルを次の弱学習器に重点的に学習させる」という手続き的な仕組みで改善を進めるのに対し、勾配ブースティングは「任意の微分可能な損失関数の負の勾配(残差)を直接フィットする」という最適化理論に基づく一般的な枠組みを持つ。この一般性により、回帰・分類・ランキングなど損失関数を差し替えるだけで多様なタスクに適用できる——AdaBoostは指数損失を使う勾配ブースティングの特殊ケースと見なすこともできる
- **過学習への感受性**: 弱学習器を追加し続けるほど訓練誤差は下がり続けるため、木の数`T`が多すぎる・学習率`η`が大きすぎる・個々の木が深すぎると訓練データに過剰適合しやすい。学習率を小さくして木の本数を増やす、木の深さを制限する、検証データでの性能が悪化し始めたら学習を打ち切る(early stopping)といった正則化が重要になる
- **[ランダムフォレスト](/algorithms/random-forest)との対比**: ランダムフォレストは独立に学習した木を並列に平均するバギング手法で、個々の木は深く育てて分散を下げるのに対し、勾配ブースティングは浅い木を逐次的に追加してバイアスを下げていく——並列化のしやすさではランダムフォレストが有利だが、慎重にチューニングされた勾配ブースティングはしばしばより高い予測精度を達成する
- **使いどころ**: Kaggleなどのデータ分析コンペでの表形式データに対する第一選択肢、与信スコアリング・需要予測・ランキング学習など実務の予測タスク全般、XGBoost・LightGBM・CatBoostという高度に最適化された実装群の理論的基盤

## 実装例

二乗誤差損失(残差=疑似残差)のもとで、非常に浅い回帰木(深さ1の決定株に近い単純な分割器)を弱学習器として使う勾配ブースティングを実装する。

```python
def _best_split(X: list[list[float]], residuals: list[float]) -> tuple[int, float, float, float]:
    """1特徴・1閾値で残差を最もよく分割する決定株を、二乗誤差最小化で探す。"""
    n, d = len(X), len(X[0])
    best = None  # (sse, feature, threshold, left_value, right_value)
    for f in range(d):
        thresholds = sorted(set(row[f] for row in X))
        for threshold in thresholds:
            left = [residuals[i] for i in range(n) if X[i][f] <= threshold]
            right = [residuals[i] for i in range(n) if X[i][f] > threshold]
            if not left or not right:
                continue
            left_val = sum(left) / len(left)
            right_val = sum(right) / len(right)
            sse = sum((v - left_val) ** 2 for v in left) + sum((v - right_val) ** 2 for v in right)
            if best is None or sse < best[0]:
                best = (sse, f, threshold, left_val, right_val)
    return best[1], best[2], best[3], best[4]


def _stump_predict(stump: tuple[int, float, float, float], x: list[float]) -> float:
    feature, threshold, left_val, right_val = stump
    return left_val if x[feature] <= threshold else right_val


def gradient_boosting_train(
    X: list[list[float]], y: list[float], n_estimators: int = 50, learning_rate: float = 0.1,
) -> tuple[float, list[tuple[int, float, float, float]]]:
    n = len(X)
    f0 = sum(y) / n  # 初期モデルは目的変数の平均
    predictions = [f0] * n
    stumps = []
    for _ in range(n_estimators):
        residuals = [y[i] - predictions[i] for i in range(n)]  # 二乗誤差損失の負の勾配=残差
        stump = _best_split(X, residuals)
        stumps.append(stump)
        for i in range(n):
            predictions[i] += learning_rate * _stump_predict(stump, X[i])
    return f0, stumps


def gradient_boosting_predict(
    f0: float, stumps: list[tuple[int, float, float, float]], x: list[float], learning_rate: float = 0.1,
) -> float:
    return f0 + sum(learning_rate * _stump_predict(stump, x) for stump in stumps)
```

```typescript
type Stump = { feature: number; threshold: number; leftVal: number; rightVal: number };

// 1特徴・1閾値で残差を最もよく分割する決定株を、二乗誤差最小化で探す
function bestSplit(X: number[][], residuals: number[]): Stump {
  const n = X.length;
  const d = X[0].length;
  let best: { sse: number; stump: Stump } | null = null;

  for (let f = 0; f < d; f++) {
    const thresholds = Array.from(new Set(X.map((row) => row[f]))).sort((a, b) => a - b);
    for (const threshold of thresholds) {
      const left: number[] = [];
      const right: number[] = [];
      for (let i = 0; i < n; i++) {
        (X[i][f] <= threshold ? left : right).push(residuals[i]);
      }
      if (left.length === 0 || right.length === 0) continue;
      const leftVal = left.reduce((a, b) => a + b, 0) / left.length;
      const rightVal = right.reduce((a, b) => a + b, 0) / right.length;
      const sse =
        left.reduce((s, v) => s + (v - leftVal) ** 2, 0) +
        right.reduce((s, v) => s + (v - rightVal) ** 2, 0);
      if (best === null || sse < best.sse) {
        best = { sse, stump: { feature: f, threshold, leftVal, rightVal } };
      }
    }
  }
  return best!.stump;
}

function stumpPredict(stump: Stump, x: number[]): number {
  return x[stump.feature] <= stump.threshold ? stump.leftVal : stump.rightVal;
}

function gradientBoostingTrain(
  X: number[][],
  y: number[],
  nEstimators = 50,
  learningRate = 0.1,
): { f0: number; stumps: Stump[] } {
  const n = X.length;
  const f0 = y.reduce((a, b) => a + b, 0) / n; // 初期モデルは目的変数の平均
  const predictions = new Array(n).fill(f0);
  const stumps: Stump[] = [];
  for (let t = 0; t < nEstimators; t++) {
    const residuals = y.map((yi, i) => yi - predictions[i]); // 二乗誤差損失の負の勾配=残差
    const stump = bestSplit(X, residuals);
    stumps.push(stump);
    for (let i = 0; i < n; i++) {
      predictions[i] += learningRate * stumpPredict(stump, X[i]);
    }
  }
  return { f0, stumps };
}

function gradientBoostingPredict(
  f0: number,
  stumps: Stump[],
  x: number[],
  learningRate = 0.1,
): number {
  return f0 + stumps.reduce((sum, stump) => sum + learningRate * stumpPredict(stump, x), 0);
}
```
