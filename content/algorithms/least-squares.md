---
name: 最小二乗法
category: 数値計算
subcategory: 線形代数計算
complexity: O(n × m²)(n点のm次多項式フィッティング、正規方程式法)
summary: 誤差の二乗和を最小にする直線・曲線を見つけることで、ノイズを含む観測データから背後の傾向を推定する回帰の基礎手法。
---

## 概要

実験や観測で得られるデータ点は、測定誤差やノイズのために完全に一直線・一曲線には乗らないことがほとんどである。最小二乗法は、「全てのデータ点を通る」ことをあきらめる代わりに、「各データ点と予測直線(または曲線)との縦方向のズレ(残差)の二乗の合計」を最小にするような直線・曲線を見つける、という考え方でこの問題を解く。二乗を使うのは、正負の誤差を打ち消し合わせず全て「悪さ」として蓄積させるため、かつ後述のように微分によって最適解を解析的に導きやすいためである。19世紀初頭にガウスとルジャンドルがそれぞれ独立に考案し、統計学・機械学習における回帰分析の基礎になっている。

## 仕組み

1. `n`個のデータ点`(x₁, y₁), ..., (xₙ, yₙ)`と、当てはめたいモデル(例えば直線`y = a + bx`)を用意する
2. 各データ点における残差(予測値と実測値の差)の二乗の合計`Σ(yᵢ - (a + bxᵢ))²`を、パラメータ`a, b`の関数として考える
3. この二乗和を最小にする`a, b`を求めるには、それぞれのパラメータで偏微分してゼロと置いた連立方程式(**正規方程式**)を解く。直線フィッティングの場合、この連立方程式は[ガウスの消去法](/algorithms/gaussian-elimination)や[LU分解](/algorithms/lu-decomposition)で効率的に解ける小さな線形代数の問題に帰着する
4. 多項式や複数の説明変数を持つ重回帰の場合も、モデルを行列`Xβ = y`の形に一般化し、正規方程式`XᵀXβ = Xᵀy`を同様に解くことで係数`β`が求まる

## 特性・トレードオフ

- **計算量**: `m`個のパラメータを持つモデルを`n`点にフィットする場合、正規方程式の構築と求解でおおよそ`O(n × m²)`(データ点数に比例、パラメータ数の2乗に比例)
- **外れ値への弱さ**: 誤差を二乗するため、他のデータ点から大きく外れた値(外れ値)の影響を不釣り合いに強く受ける。1点の外れ値がフィット結果全体を大きく歪めることがあり、外れ値に頑健な手法(絶対値誤差を使うロバスト回帰等)が必要な場面もある
- **正規方程式の数値的不安定性**: `XᵀX`の計算は数値誤差を増幅しやすく、変数間の相関が強い(多重共線性がある)場合は不安定になりやすい。実務のライブラリではQR分解や特異値分解(SVD)を使ったより安定な解法が好まれることも多い
- **使いどころ**: 統計学・機械学習の線形回帰の理論的基盤、実験データからの物理法則の推定(ばね定数、反応速度など)、[主成分分析(PCA)](/algorithms/pca)や[パーセプトロン](/algorithms/perceptron)のような機械学習手法の損失関数設計の原型としても頻繁に引用される

## 実装例

```python
def gaussian_elimination(a: list[list[float]], b: list[float]) -> list[float]:
    n = len(a)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot_row = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[pivot_row] = m[pivot_row], m[col]
        pivot = m[col][col]
        for r in range(col + 1, n):
            factor = m[r][col] / pivot
            for c in range(col, n + 1):
                m[r][c] -= factor * m[col][c]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = m[i][n] - sum(m[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / m[i][i]
    return x


def least_squares_linear(xs: list[float], ys: list[float]) -> tuple[float, float]:
    """y = a + b*x の形の直線を、正規方程式を解いてフィッティングする"""
    n = len(xs)
    sxx = sum(x * x for x in xs)
    sx = sum(xs)
    sxy = sum(x * y for x, y in zip(xs, ys))
    sy = sum(ys)
    # 正規方程式 [[n, Σx], [Σx, Σx²]] [a, b] = [Σy, Σxy]
    a, b = gaussian_elimination([[float(n), sx], [sx, sxx]], [sy, sxy])
    return a, b
```

```typescript
function gaussianElimination(a: number[][], b: number[]): number[] {
  const n = a.length;
  const m: number[][] = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivotRow][col])) pivotRow = r;
    }
    [m[col], m[pivotRow]] = [m[pivotRow], m[col]];
    const pivot = m[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = m[r][col] / pivot;
      for (let c = col; c <= n; c++) {
        m[r][c] -= factor * m[col][c];
      }
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = m[i][n];
    for (let j = i + 1; j < n; j++) s -= m[i][j] * x[j];
    x[i] = s / m[i][i];
  }
  return x;
}

function leastSquaresLinear(xs: number[], ys: number[]): [number, number] {
  const n = xs.length;
  const sxx = xs.reduce((s, x) => s + x * x, 0);
  const sx = xs.reduce((s, x) => s + x, 0);
  const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sy = ys.reduce((s, y) => s + y, 0);
  const [a, b] = gaussianElimination(
    [
      [n, sx],
      [sx, sxx],
    ],
    [sy, sxy]
  );
  return [a, b];
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <numeric>

std::vector<double> gaussianElimination(std::vector<std::vector<double>> a, std::vector<double> b) {
    int n = static_cast<int>(a.size());
    std::vector<std::vector<double>> m(n, std::vector<double>(n + 1));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) m[i][j] = a[i][j];
        m[i][n] = b[i];
    }
    for (int col = 0; col < n; col++) {
        int pivotRow = col;
        for (int r = col + 1; r < n; r++) {
            if (std::abs(m[r][col]) > std::abs(m[pivotRow][col])) pivotRow = r;
        }
        std::swap(m[col], m[pivotRow]);
        double pivot = m[col][col];
        for (int r = col + 1; r < n; r++) {
            double factor = m[r][col] / pivot;
            for (int c = col; c <= n; c++) {
                m[r][c] -= factor * m[col][c];
            }
        }
    }
    std::vector<double> x(n, 0.0);
    for (int i = n - 1; i >= 0; i--) {
        double s = m[i][n];
        for (int j = i + 1; j < n; j++) s -= m[i][j] * x[j];
        x[i] = s / m[i][i];
    }
    return x;
}

std::pair<double, double> leastSquaresLinear(const std::vector<double>& xs, const std::vector<double>& ys) {
    int n = static_cast<int>(xs.size());
    double sxx = 0.0, sx = 0.0, sxy = 0.0, sy = 0.0;
    for (int i = 0; i < n; i++) {
        sxx += xs[i] * xs[i];
        sx += xs[i];
        sxy += xs[i] * ys[i];
        sy += ys[i];
    }
    auto sol = gaussianElimination({{static_cast<double>(n), sx}, {sx, sxx}}, {sy, sxy});
    return {sol[0], sol[1]};
}
```

```rust
fn gaussian_elimination(a: &[Vec<f64>], b: &[f64]) -> Vec<f64> {
    let n = a.len();
    let mut m: Vec<Vec<f64>> = a
        .iter()
        .enumerate()
        .map(|(i, row)| {
            let mut r = row.clone();
            r.push(b[i]);
            r
        })
        .collect();
    for col in 0..n {
        let mut pivot_row = col;
        for r in (col + 1)..n {
            if m[r][col].abs() > m[pivot_row][col].abs() {
                pivot_row = r;
            }
        }
        m.swap(col, pivot_row);
        let pivot = m[col][col];
        for r in (col + 1)..n {
            let factor = m[r][col] / pivot;
            for c in col..=n {
                m[r][c] -= factor * m[col][c];
            }
        }
    }
    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        let mut s = m[i][n];
        for j in (i + 1)..n {
            s -= m[i][j] * x[j];
        }
        x[i] = s / m[i][i];
    }
    x
}

fn least_squares_linear(xs: &[f64], ys: &[f64]) -> (f64, f64) {
    let n = xs.len();
    let sxx: f64 = xs.iter().map(|x| x * x).sum();
    let sx: f64 = xs.iter().sum();
    let sxy: f64 = xs.iter().zip(ys.iter()).map(|(x, y)| x * y).sum();
    let sy: f64 = ys.iter().sum();
    let sol = gaussian_elimination(&[vec![n as f64, sx], vec![sx, sxx]], &[sy, sxy]);
    (sol[0], sol[1])
}
```

```csharp
static double[] GaussianElimination(double[][] a, double[] b)
{
    int n = a.Length;
    var m = new double[n][];
    for (int i = 0; i < n; i++)
    {
        m[i] = new double[n + 1];
        Array.Copy(a[i], m[i], n);
        m[i][n] = b[i];
    }
    for (int col = 0; col < n; col++)
    {
        int pivotRow = col;
        for (int r = col + 1; r < n; r++)
            if (Math.Abs(m[r][col]) > Math.Abs(m[pivotRow][col])) pivotRow = r;
        (m[col], m[pivotRow]) = (m[pivotRow], m[col]);
        double pivot = m[col][col];
        for (int r = col + 1; r < n; r++)
        {
            double factor = m[r][col] / pivot;
            for (int c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
        }
    }
    var x = new double[n];
    for (int i = n - 1; i >= 0; i--)
    {
        double s = m[i][n];
        for (int j = i + 1; j < n; j++) s -= m[i][j] * x[j];
        x[i] = s / m[i][i];
    }
    return x;
}

static (double A, double B) LeastSquaresLinear(double[] xs, double[] ys)
{
    int n = xs.Length;
    double sxx = xs.Sum(x => x * x);
    double sx = xs.Sum();
    double sxy = xs.Zip(ys, (x, y) => x * y).Sum();
    double sy = ys.Sum();
    var sol = GaussianElimination(new double[][] { new double[] { n, sx }, new double[] { sx, sxx } }, new double[] { sy, sxy });
    return (sol[0], sol[1]);
}
```
