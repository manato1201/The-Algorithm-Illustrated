---
name: ミニマックス定理
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(戦略数の線形計画法)
summary: 二人零和ゲームでは「自分の最悪を最小化する」戦略と「相手の最善を許した上で最大化する」戦略の価値が一致することを保証する定理と、その計算法。
---

## 概要

二人零和ゲーム([ミニマックス法](/algorithms/minimax)が扱う「片方の得は片方の損」というゲーム)には、一見異なる2つの視点がある。1つは「自分が先に手を明かすとしたら、相手にどれだけ酷い目に遭わされても被害を最小化できるか」という守りの視点(マキシミン: 自分にとっての最悪を最大化)、もう1つは「相手が先に手を明かすとしたら、自分はどれだけ得できるか」という攻めの視点(ミニマックス: 相手にとっての最悪を自分が押し付ける)。ジョン・フォン・ノイマンが1928年に証明したミニマックス定理は、混合戦略(手をランダムな確率で選ぶ戦略)を許せば、**この2つの視点の値が必ず一致する**ことを保証する——ゲーム理論という分野そのものの出発点となった定理である。

## 仕組み

1. 2人のプレイヤーの利得行列(片方の利得が正なら、もう片方は同じ値だけ負になる零和ゲーム)を用意する
2. プレイヤー1が「自分の最悪の結果を最大化する」ように混合戦略(各手を選ぶ確率の分布)を選んだときの保証値を`マキシミン値`とする
3. プレイヤー2が「プレイヤー1にとっての最善を最小限に抑える」ように混合戦略を選んだときの保証値を`ミニマックス値`とする
4. ミニマックス定理は、`マキシミン値 = ミニマックス値`(この共通の値を**ゲームの価値**と呼ぶ)であることを保証する。じゃんけんのように対称なゲームなら価値は0になる
5. この均衡を与える混合戦略の組は、[線形計画法](/algorithms/simplex-method)の双対問題として定式化でき、[シンプレックス法](/algorithms/simplex-method)のようなアルゴリズムで具体的に計算できる

## 特性・トレードオフ

- **[ナッシュ均衡](/algorithms/nash-equilibrium)との関係**: ミニマックス定理が保証する解は、二人零和ゲームに限定したナッシュ均衡の特別な場合であり、零和という強い制約のおかげで「均衡が一意に定まり、かつ効率よく計算できる」という扱いやすさを持つ。一般の非零和ゲームのナッシュ均衡計算が困難なのとは対照的
- **混合戦略が本質的に必要**: じゃんけんのように、純粋戦略(1つの手に固定)だけでは均衡が存在しないゲームでも、確率的に手を選ぶ混合戦略まで許せば必ず均衡(ゲームの価値)が存在する、というのが定理の力強さ
- **線形計画法との等価性**: ミニマックス定理は線形計画法の双対定理と数学的に等価であることが知られており、ゲーム理論と最適化理論を結びつける重要な橋渡しになっている
- **使いどころ**: 二人零和ゲームの理論的な「最適プレイの価値」の算出、ロバスト最適化(最悪ケースに対する保証を求める意思決定)、機械学習における敵対的学習(GANなど)の理論的基盤の一部としても引用される

## 実装例

線形計画法を直接解く代わりに、ロビンソン(1951)が収束を証明したFictitious Play(反復適応学習)で近似的にゲームの価値と混合戦略を求める。じゃんけんのような対称ゲームでは価値が0に収束することを確認する。

```python
def fictitious_play(
    payoff: list[list[float]], iterations: int = 5000
) -> tuple[list[float], list[float], float]:
    """反復適応学習(Fictitious Play)によりミニマックス値と混合戦略を近似的に求める。
    payoff[i][j] はプレイヤー1が戦略i、プレイヤー2が戦略jを選んだときのプレイヤー1の利得(零和)。
    """
    rows = len(payoff)
    cols = len(payoff[0])
    row_counts = [0] * rows
    col_counts = [0] * cols
    row_counts[0] += 1
    col_counts[0] += 1

    for _ in range(iterations):
        # プレイヤー2は、これまでのプレイヤー1の頻度分布に対する最良応答を選ぶ
        col_best, col_best_val = 0, float("inf")
        for j in range(cols):
            val = sum(payoff[i][j] * row_counts[i] for i in range(rows))
            if val < col_best_val:
                col_best_val = val
                col_best = j
        # プレイヤー1は、これまでのプレイヤー2の頻度分布に対する最良応答を選ぶ
        row_best, row_best_val = 0, float("-inf")
        for i in range(rows):
            val = sum(payoff[i][j] * col_counts[j] for j in range(cols))
            if val > row_best_val:
                row_best_val = val
                row_best = i

        row_counts[row_best] += 1
        col_counts[col_best] += 1

    total = iterations + 1
    row_strategy = [c / total for c in row_counts]
    col_strategy = [c / total for c in col_counts]
    game_value = sum(payoff[i][j] * row_strategy[i] * col_strategy[j] for i in range(rows) for j in range(cols))
    return row_strategy, col_strategy, game_value
```

```typescript
function fictitiousPlay(payoff: number[][], iterations = 5000): [number[], number[], number] {
  const rows = payoff.length;
  const cols = payoff[0].length;
  const rowCounts = new Array(rows).fill(0);
  const colCounts = new Array(cols).fill(0);
  rowCounts[0] += 1;
  colCounts[0] += 1;

  for (let iter = 0; iter < iterations; iter++) {
    let colBest = 0,
      colBestVal = Infinity;
    for (let j = 0; j < cols; j++) {
      let val = 0;
      for (let i = 0; i < rows; i++) val += payoff[i][j] * rowCounts[i];
      if (val < colBestVal) {
        colBestVal = val;
        colBest = j;
      }
    }
    let rowBest = 0,
      rowBestVal = -Infinity;
    for (let i = 0; i < rows; i++) {
      let val = 0;
      for (let j = 0; j < cols; j++) val += payoff[i][j] * colCounts[j];
      if (val > rowBestVal) {
        rowBestVal = val;
        rowBest = i;
      }
    }
    rowCounts[rowBest]++;
    colCounts[colBest]++;
  }

  const total = iterations + 1;
  const rowStrategy = rowCounts.map((c: number) => c / total);
  const colStrategy = colCounts.map((c: number) => c / total);
  let gameValue = 0;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) gameValue += payoff[i][j] * rowStrategy[i] * colStrategy[j];
  return [rowStrategy, colStrategy, gameValue];
}
```

```cpp
#include <vector>
#include <limits>
#include <tuple>

std::tuple<std::vector<double>, std::vector<double>, double> fictitiousPlay(
    const std::vector<std::vector<double>>& payoff, int iterations = 5000) {
    size_t rows = payoff.size();
    size_t cols = payoff[0].size();
    std::vector<double> rowCounts(rows, 0.0);
    std::vector<double> colCounts(cols, 0.0);
    rowCounts[0] += 1;
    colCounts[0] += 1;

    for (int iter = 0; iter < iterations; iter++) {
        size_t colBest = 0;
        double colBestVal = std::numeric_limits<double>::infinity();
        for (size_t j = 0; j < cols; j++) {
            double val = 0;
            for (size_t i = 0; i < rows; i++) val += payoff[i][j] * rowCounts[i];
            if (val < colBestVal) { colBestVal = val; colBest = j; }
        }
        size_t rowBest = 0;
        double rowBestVal = -std::numeric_limits<double>::infinity();
        for (size_t i = 0; i < rows; i++) {
            double val = 0;
            for (size_t j = 0; j < cols; j++) val += payoff[i][j] * colCounts[j];
            if (val > rowBestVal) { rowBestVal = val; rowBest = i; }
        }
        rowCounts[rowBest]++;
        colCounts[colBest]++;
    }

    double total = iterations + 1;
    std::vector<double> rowStrategy(rows), colStrategy(cols);
    for (size_t i = 0; i < rows; i++) rowStrategy[i] = rowCounts[i] / total;
    for (size_t j = 0; j < cols; j++) colStrategy[j] = colCounts[j] / total;

    double gameValue = 0;
    for (size_t i = 0; i < rows; i++)
        for (size_t j = 0; j < cols; j++) gameValue += payoff[i][j] * rowStrategy[i] * colStrategy[j];

    return {rowStrategy, colStrategy, gameValue};
}
```

```rust
fn fictitious_play(payoff: &[Vec<f64>], iterations: i32) -> (Vec<f64>, Vec<f64>, f64) {
    let rows = payoff.len();
    let cols = payoff[0].len();
    let mut row_counts = vec![0.0; rows];
    let mut col_counts = vec![0.0; cols];
    row_counts[0] += 1.0;
    col_counts[0] += 1.0;

    for _ in 0..iterations {
        let mut col_best = 0;
        let mut col_best_val = f64::INFINITY;
        for j in 0..cols {
            let mut val = 0.0;
            for i in 0..rows {
                val += payoff[i][j] * row_counts[i];
            }
            if val < col_best_val {
                col_best_val = val;
                col_best = j;
            }
        }
        let mut row_best = 0;
        let mut row_best_val = f64::NEG_INFINITY;
        for i in 0..rows {
            let mut val = 0.0;
            for j in 0..cols {
                val += payoff[i][j] * col_counts[j];
            }
            if val > row_best_val {
                row_best_val = val;
                row_best = i;
            }
        }
        row_counts[row_best] += 1.0;
        col_counts[col_best] += 1.0;
    }

    let total = iterations as f64 + 1.0;
    let row_strategy: Vec<f64> = row_counts.iter().map(|c| c / total).collect();
    let col_strategy: Vec<f64> = col_counts.iter().map(|c| c / total).collect();
    let mut game_value = 0.0;
    for i in 0..rows {
        for j in 0..cols {
            game_value += payoff[i][j] * row_strategy[i] * col_strategy[j];
        }
    }
    (row_strategy, col_strategy, game_value)
}
```

```csharp
static (double[] rowStrategy, double[] colStrategy, double gameValue) FictitiousPlay(
    double[][] payoff, int iterations = 5000)
{
    int rows = payoff.Length, cols = payoff[0].Length;
    var rowCounts = new double[rows];
    var colCounts = new double[cols];
    rowCounts[0] += 1;
    colCounts[0] += 1;

    for (int iter = 0; iter < iterations; iter++)
    {
        int colBest = 0;
        double colBestVal = double.PositiveInfinity;
        for (int j = 0; j < cols; j++)
        {
            double val = 0;
            for (int i = 0; i < rows; i++) val += payoff[i][j] * rowCounts[i];
            if (val < colBestVal) { colBestVal = val; colBest = j; }
        }
        int rowBest = 0;
        double rowBestVal = double.NegativeInfinity;
        for (int i = 0; i < rows; i++)
        {
            double val = 0;
            for (int j = 0; j < cols; j++) val += payoff[i][j] * colCounts[j];
            if (val > rowBestVal) { rowBestVal = val; rowBest = i; }
        }
        rowCounts[rowBest]++;
        colCounts[colBest]++;
    }

    double total = iterations + 1;
    var rowStrategy = rowCounts.Select(c => c / total).ToArray();
    var colStrategy = colCounts.Select(c => c / total).ToArray();
    double gameValue = 0;
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++)
            gameValue += payoff[i][j] * rowStrategy[i] * colStrategy[j];
    return (rowStrategy, colStrategy, gameValue);
}
```
