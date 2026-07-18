---
name: 多変数ニュートン法
category: 数値計算
subcategory: 求根アルゴリズム
complexity: O(n³)(1反復あたり、ヤコビ行列に対する連立方程式の求解がO(n³))
summary: 1変数の[ニュートン法](/algorithms/newton-method)を複数の変数・複数の方程式からなる連立非線形方程式系に拡張したもので、微分係数の代わりにヤコビ行列(偏微分の行列)を使って各反復で連立線形方程式を解く。
---

## 概要

[ニュートン法](/algorithms/newton-method)は1変数の方程式`f(x)=0`の根を、接線が0になる点へジャンプし続けることで求めるが、実務上の問題の多くは変数も方程式も複数ある連立非線形方程式(`f₁(x₁,...,xₙ)=0, ..., fₙ(x₁,...,xₙ)=0`)である。多変数ニュートン法は、この拡張を非常に自然な形で実現する——1変数での「接線の傾き(微分係数)」を、多変数での「各方程式の各変数に対する偏微分を並べた行列(ヤコビ行列)」に置き換えるだけで、同じ「線形近似で次の点を予測する」という発想がそのまま多次元へ持ち上がる。ロボットアームの[逆運動学](/algorithms/inverse-kinematics-2link)や電力網の潮流計算など、変数が絡み合う非線形な連立方程式を解く必要がある工学分野で広く使われている。

## 仕組み

1. 求めたい変数ベクトル`x = (x₁,...,xₙ)`と、それらが満たすべき`n`個の方程式`F(x) = (f₁(x),...,fₙ(x)) = 0`が与えられているとする
2. 現在の推定値`x_k`における各方程式の各変数についての偏微分を並べたヤコビ行列`J(x_k)`(`n×n`行列、`J[i][j] = ∂fᵢ/∂xⱼ`)を計算する
3. 1変数の場合の更新式`x_{k+1} = x_k - f(x_k)/f'(x_k)`を多次元に一般化した`x_{k+1} = x_k - J(x_k)⁻¹ F(x_k)`を使いたいところだが、逆行列を直接計算するのは非効率かつ数値的に不安定なため、代わりに連立線形方程式`J(x_k) Δx = -F(x_k)`を([ガウスの消去法](/algorithms/gaussian-elimination)や[LU分解](/algorithms/lu-decomposition)を使って)解き、更新量`Δx`を求める
4. `x_{k+1} = x_k + Δx`として次の推定値を得る
5. `‖F(x_{k+1})‖`(残差のノルム)が十分小さくなるまで、手順2〜4を繰り返す

## 特性・トレードオフ

- **計算量**: 各反復でヤコビ行列を評価する`O(n²)`(各要素の偏微分計算)に加え、連立線形方程式の求解に[ガウスの消去法](/algorithms/gaussian-elimination)を使えば`O(n³)`——変数の数`n`が大きくなるとヤコビ行列を毎回作り直して解くコストが急増する
- **1変数版と同じ2次収束性**: 初期値が真の解に十分近ければ、[ニュートン法](/algorithms/newton-method)と同様に反復ごとに正しい桁数がほぼ倍になる2次収束を示す——多変数化しても、この収束の速さという核心的な利点は保たれる
- **初期値への敏感さがより深刻になる**: 1変数の場合でも初期値の選び方に成否が左右されるが、多変数になると解空間がはるかに複雑になり、ヤコビ行列が特異(逆行列を持たない)になる点に近づくと発散・振動しやすくなる。実務では準ニュートン法(ヤコビ行列を毎回厳密に計算せず近似更新するBroyden法など)や信頼領域法と組み合わせて安定性を高めることが多い
- **使いどころ**: ロボットアームの[逆運動学](/algorithms/inverse-kinematics-2link)(関節角度を求める連立方程式)、電力システムの潮流計算(発電・需要のバランス方程式)、化学平衡計算(複数の反応が絡み合う平衡状態の求解)、機械学習における最適化アルゴリズム(ニュートン法ベースの2次最適化手法)の理論的基盤

## 実装例

```python
from typing import Callable


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


def multivariate_newton(
    f: Callable[[list[float]], list[float]],
    jacobian: Callable[[list[float]], list[list[float]]],
    x0: list[float],
    tol: float = 1e-12,
    max_iter: int = 100,
) -> list[float]:
    x = x0[:]
    for _ in range(max_iter):
        fx = f(x)
        if max(abs(v) for v in fx) < tol:
            break
        jx = jacobian(x)
        # J(x_k) * delta = -F(x_k) を解いて更新量を求める
        delta = gaussian_elimination(jx, [-v for v in fx])
        x = [xi + di for xi, di in zip(x, delta)]
    return x


# 例: x^2 + y^2 = 4 (半径2の円) と xy = 1 の交点を求める
def f_example(x: list[float]) -> list[float]:
    return [x[0] ** 2 + x[1] ** 2 - 4.0, x[0] * x[1] - 1.0]


def jacobian_example(x: list[float]) -> list[list[float]]:
    return [[2 * x[0], 2 * x[1]], [x[1], x[0]]]
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

function multivariateNewton(
  f: (x: number[]) => number[],
  jacobian: (x: number[]) => number[][],
  x0: number[],
  tol = 1e-12,
  maxIter = 100,
): number[] {
  let x = [...x0];
  for (let it = 0; it < maxIter; it++) {
    const fx = f(x);
    if (Math.max(...fx.map(Math.abs)) < tol) break;
    const jx = jacobian(x);
    const delta = gaussianElimination(
      jx,
      fx.map((v) => -v),
    );
    x = x.map((xi, i) => xi + delta[i]);
  }
  return x;
}

// 例: x^2 + y^2 = 4 と xy = 1 の交点を求める
const fExample = (x: number[]): number[] => [
  x[0] ** 2 + x[1] ** 2 - 4,
  x[0] * x[1] - 1,
];
const jacobianExample = (x: number[]): number[][] => [
  [2 * x[0], 2 * x[1]],
  [x[1], x[0]],
];
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <functional>

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

using VecFn = std::function<std::vector<double>(const std::vector<double>&)>;
using MatFn = std::function<std::vector<std::vector<double>>(const std::vector<double>&)>;

std::vector<double> multivariateNewton(VecFn f, MatFn jacobian, std::vector<double> x0,
                                        double tol = 1e-12, int maxIter = 100) {
    std::vector<double> x = x0;
    for (int it = 0; it < maxIter; it++) {
        std::vector<double> fx = f(x);
        double maxAbs = 0.0;
        for (double v : fx) maxAbs = std::max(maxAbs, std::abs(v));
        if (maxAbs < tol) break;
        std::vector<std::vector<double>> jx = jacobian(x);
        std::vector<double> negFx(fx.size());
        for (size_t i = 0; i < fx.size(); i++) negFx[i] = -fx[i];
        std::vector<double> delta = gaussianElimination(jx, negFx);
        for (size_t i = 0; i < x.size(); i++) x[i] += delta[i];
    }
    return x;
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

fn multivariate_newton<F, J>(f: F, jacobian: J, x0: &[f64], tol: f64, max_iter: usize) -> Vec<f64>
where
    F: Fn(&[f64]) -> Vec<f64>,
    J: Fn(&[f64]) -> Vec<Vec<f64>>,
{
    let mut x = x0.to_vec();
    for _ in 0..max_iter {
        let fx = f(&x);
        let max_abs = fx.iter().fold(0.0_f64, |acc, v| acc.max(v.abs()));
        if max_abs < tol {
            break;
        }
        let jx = jacobian(&x);
        let neg_fx: Vec<f64> = fx.iter().map(|v| -v).collect();
        let delta = gaussian_elimination(&jx, &neg_fx);
        for i in 0..x.len() {
            x[i] += delta[i];
        }
    }
    x
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

static double[] MultivariateNewton(
    Func<double[], double[]> f,
    Func<double[], double[][]> jacobian,
    double[] x0, double tol = 1e-12, int maxIter = 100)
{
    var x = (double[])x0.Clone();
    for (int it = 0; it < maxIter; it++)
    {
        var fx = f(x);
        if (fx.Max(v => Math.Abs(v)) < tol) break;
        var jx = jacobian(x);
        var delta = GaussianElimination(jx, fx.Select(v => -v).ToArray());
        x = x.Select((xi, i) => xi + delta[i]).ToArray();
    }
    return x;
}
```
