---
name: 3次スプライン軌道生成
category: 制御・ロボティクス
subcategory: 姿勢・軌道生成
complexity: O(n)(n個の経由点、三重対角行列の求解)
summary: 複数の経由点を、速度・加速度まで滑らかに連続する3次多項式の連なりで結ぶことで、ロボットの関節や機体に急激な力のショックを与えない実行可能な軌道を生成する手法。
---

## 概要

[RRT](/algorithms/rrt)や[A*探索](/algorithms/a-star)で得られる経路は、通過すべき点(ウェイポイント)を折れ線でつないだだけの、幾何学的な「道筋」に過ぎない。実際にロボットを動かすには、各時刻にどの位置・速度・加速度であるべきかという滑らかな軌道(タイムパラメータ化された経路)に変換する必要がある——折れ線をそのまま辿ろうとすると、各経由点で速度や加速度が不連続に変化し、モーターに急激な負荷(ジャーク)がかかったり、機体が振動したりする。3次スプライン軌道生成は、経由点の間を3次多項式で結び、隣接する区間同士で位置だけでなく速度・加速度までもが連続的に繋がるように多項式の係数を決めることで、滑らかで実行可能な軌道を生成する。

## 仕組み

1. `n`個の経由点`(t0,x0), (t1,x1), ..., (tn,xn)`(各時刻`ti`にどの位置`xi`を通過すべきか)が与えられているとする
2. 各区間`[ti, ti+1]`ごとに、独立した3次多項式`Si(t) = ai + bi(t-ti) + ci(t-ti)² + di(t-ti)³`を割り当てる。多項式の係数`ai, bi, ci, di`が、各区間の軌道の形を決める未知数になる
3. 各区間の3次多項式は、区間の両端で経由点の位置を正確に通ることを要求する(`Si(ti)=xi`、`Si(ti+1)=xi+1`)
4. 隣接する区間同士の境界で、位置だけでなく1階微分(速度)と2階微分(加速度)も一致するという連続性の制約を課す(`Si'(ti+1) = S(i+1)'(ti+1)`、`Si''(ti+1) = S(i+1)''(ti+1)`)
5. これらの制約を全区間について連立させると、未知の係数(特に各経由点での2階微分の値)に関する[三重対角行列](/algorithms/gaussian-elimination)の連立方程式が得られる。これは[ガウスの消去法](/algorithms/gaussian-elimination)を三重対角行列に特化させたトーマスのアルゴリズム(標準的な[LU分解](/algorithms/lu-decomposition)より高速に解ける特殊な形)で効率的に解ける
6. 求まった係数から、各区間の3次多項式が確定し、任意の時刻`t`における位置・速度・加速度を、対応する区間の多項式とその微分から計算できる

## 特性・トレードオフ

- **計算量**: 三重対角行列の連立方程式は、経由点の数`n`に対して`O(n)`という非常に効率的な専用解法(トーマスのアルゴリズム)で解ける——一般の[ガウスの消去法](/algorithms/gaussian-elimination)の`O(n³)`より大幅に高速なのは、三重対角という疎な(ほとんどの要素が0の)構造を活かしているため
- **滑らかさの度合いと実行可能性のトレードオフ**: 3次スプラインは速度・加速度の連続性を保証するが、3階微分(加加速度、ジャーク)までは連続性を保証しない。より高い滑らかさ(ジャークの連続性)が必要な高精度な用途では、5次多項式(クインティックスプライン)のようなより高次の補間が使われることもあるが、その分だけ計算コストと制約条件の複雑さが増す
- **経由点の通過を厳密に要求する制約**: スプラインは経由点を正確に通過することを要求するため、経由点自体にノイズや誤差が含まれる場合、その誤差もそのまま軌道に反映されてしまう。[最小二乗法](/algorithms/least-squares)のように「近似的に通る」滑らかな曲線を求めたい場合は、スプライン補間ではなく回帰(曲線フィッティング)のアプローチが適している
- **使いどころ**: ロボットアーム・自動運転車の実行可能な滑らかな軌道生成、CGアニメーションにおけるキャラクター・カメラの滑らかな動きの補間、CNC工作機械の切削経路生成における急激な速度変化の回避

## 実装例

以下は自然3次スプライン(両端点の2階微分を0とする境界条件)を、三重対角行列に特化したトーマスのアルゴリズムで解く実装。`M`は各経由点における2階微分(たわみ)の値。

```python
def cubic_spline_coefficients(ts: list[float], xs: list[float]) -> tuple[list[float], list[float]]:
    n = len(ts) - 1
    h = [ts[i + 1] - ts[i] for i in range(n)]

    a = [0.0] * (n + 1)  # 三重対角の下副対角
    b = [0.0] * (n + 1)  # 対角
    c = [0.0] * (n + 1)  # 上副対角
    d = [0.0] * (n + 1)  # 右辺

    b[0] = 1.0  # 自然境界条件: M0 = 0
    b[n] = 1.0  # 自然境界条件: Mn = 0

    for i in range(1, n):
        a[i] = h[i - 1]
        b[i] = 2 * (h[i - 1] + h[i])
        c[i] = h[i]
        d[i] = 6 * ((xs[i + 1] - xs[i]) / h[i] - (xs[i] - xs[i - 1]) / h[i - 1])

    # トーマスのアルゴリズム(前進消去)
    cp = [0.0] * (n + 1)
    dp = [0.0] * (n + 1)
    cp[0] = c[0] / b[0]
    dp[0] = d[0] / b[0]
    for i in range(1, n + 1):
        m = b[i] - a[i] * cp[i - 1]
        cp[i] = c[i] / m if i < n else 0.0
        dp[i] = (d[i] - a[i] * dp[i - 1]) / m

    # 後退代入
    M = [0.0] * (n + 1)
    M[n] = dp[n]
    for i in range(n - 1, -1, -1):
        M[i] = dp[i] - cp[i] * M[i + 1]

    return M, h


def spline_eval(t: float, ts: list[float], xs: list[float], M: list[float], h: list[float]) -> float:
    n = len(ts) - 1
    i = n - 1
    for k in range(n):
        if ts[k] <= t <= ts[k + 1]:
            i = k
            break

    hi = h[i]
    A = (ts[i + 1] - t) / hi
    B = (t - ts[i]) / hi
    term1 = A * xs[i] + B * xs[i + 1]
    term2 = ((A**3 - A) * M[i] + (B**3 - B) * M[i + 1]) * (hi**2) / 6
    return term1 + term2
```

```typescript
function cubicSplineCoefficients(ts: number[], xs: number[]): { M: number[]; h: number[] } {
  const n = ts.length - 1;
  const h = Array.from({ length: n }, (_, i) => ts[i + 1] - ts[i]);

  const a = new Array(n + 1).fill(0);
  const b = new Array(n + 1).fill(0);
  const c = new Array(n + 1).fill(0);
  const d = new Array(n + 1).fill(0);

  b[0] = 1; d[0] = 0;
  b[n] = 1; d[n] = 0;

  for (let i = 1; i < n; i++) {
    a[i] = h[i - 1];
    b[i] = 2 * (h[i - 1] + h[i]);
    c[i] = h[i];
    d[i] = 6 * ((xs[i + 1] - xs[i]) / h[i] - (xs[i] - xs[i - 1]) / h[i - 1]);
  }

  const cp = new Array(n + 1).fill(0);
  const dp = new Array(n + 1).fill(0);
  cp[0] = c[0] / b[0];
  dp[0] = d[0] / b[0];
  for (let i = 1; i <= n; i++) {
    const m = b[i] - a[i] * cp[i - 1];
    cp[i] = i < n ? c[i] / m : 0;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
  }

  const M = new Array(n + 1).fill(0);
  M[n] = dp[n];
  for (let i = n - 1; i >= 0; i--) {
    M[i] = dp[i] - cp[i] * M[i + 1];
  }

  return { M, h };
}

function splineEval(t: number, ts: number[], xs: number[], M: number[], h: number[]): number {
  const n = ts.length - 1;
  let i = n - 1;
  for (let k = 0; k < n; k++) {
    if (ts[k] <= t && t <= ts[k + 1]) { i = k; break; }
  }
  const hi = h[i];
  const A = (ts[i + 1] - t) / hi;
  const B = (t - ts[i]) / hi;
  const term1 = A * xs[i] + B * xs[i + 1];
  const term2 = ((A ** 3 - A) * M[i] + (B ** 3 - B) * M[i + 1]) * (hi ** 2) / 6;
  return term1 + term2;
}
```

```cpp
#include <vector>
#include <cmath>

struct SplineCoefficients {
    std::vector<double> M;
    std::vector<double> h;
};

SplineCoefficients cubicSplineCoefficients(const std::vector<double>& ts, const std::vector<double>& xs) {
    int n = static_cast<int>(ts.size()) - 1;
    std::vector<double> h(n);
    for (int i = 0; i < n; i++) h[i] = ts[i + 1] - ts[i];

    std::vector<double> a(n + 1, 0.0), b(n + 1, 0.0), c(n + 1, 0.0), d(n + 1, 0.0);
    b[0] = 1.0; d[0] = 0.0;
    b[n] = 1.0; d[n] = 0.0;

    for (int i = 1; i < n; i++) {
        a[i] = h[i - 1];
        b[i] = 2 * (h[i - 1] + h[i]);
        c[i] = h[i];
        d[i] = 6 * ((xs[i + 1] - xs[i]) / h[i] - (xs[i] - xs[i - 1]) / h[i - 1]);
    }

    std::vector<double> cp(n + 1, 0.0), dp(n + 1, 0.0);
    cp[0] = c[0] / b[0];
    dp[0] = d[0] / b[0];
    for (int i = 1; i <= n; i++) {
        double m = b[i] - a[i] * cp[i - 1];
        cp[i] = (i < n) ? c[i] / m : 0.0;
        dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
    }

    std::vector<double> M(n + 1, 0.0);
    M[n] = dp[n];
    for (int i = n - 1; i >= 0; i--) M[i] = dp[i] - cp[i] * M[i + 1];

    return { M, h };
}

double splineEval(double t, const std::vector<double>& ts, const std::vector<double>& xs,
                   const std::vector<double>& M, const std::vector<double>& h) {
    int n = static_cast<int>(ts.size()) - 1;
    int i = n - 1;
    for (int k = 0; k < n; k++) {
        if (ts[k] <= t && t <= ts[k + 1]) { i = k; break; }
    }
    double hi = h[i];
    double A = (ts[i + 1] - t) / hi;
    double B = (t - ts[i]) / hi;
    double term1 = A * xs[i] + B * xs[i + 1];
    double term2 = ((A * A * A - A) * M[i] + (B * B * B - B) * M[i + 1]) * (hi * hi) / 6.0;
    return term1 + term2;
}
```

```rust
struct SplineCoefficients {
    m: Vec<f64>,
    h: Vec<f64>,
}

fn cubic_spline_coefficients(ts: &[f64], xs: &[f64]) -> SplineCoefficients {
    let n = ts.len() - 1;
    let mut h = vec![0.0; n];
    for i in 0..n {
        h[i] = ts[i + 1] - ts[i];
    }

    let mut a = vec![0.0; n + 1];
    let mut b = vec![0.0; n + 1];
    let mut c = vec![0.0; n + 1];
    let mut d = vec![0.0; n + 1];

    b[0] = 1.0;
    b[n] = 1.0;

    for i in 1..n {
        a[i] = h[i - 1];
        b[i] = 2.0 * (h[i - 1] + h[i]);
        c[i] = h[i];
        d[i] = 6.0 * ((xs[i + 1] - xs[i]) / h[i] - (xs[i] - xs[i - 1]) / h[i - 1]);
    }

    let mut cp = vec![0.0; n + 1];
    let mut dp = vec![0.0; n + 1];
    cp[0] = c[0] / b[0];
    dp[0] = d[0] / b[0];
    for i in 1..=n {
        let m = b[i] - a[i] * cp[i - 1];
        cp[i] = if i < n { c[i] / m } else { 0.0 };
        dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
    }

    let mut m_vec = vec![0.0; n + 1];
    m_vec[n] = dp[n];
    for i in (0..n).rev() {
        m_vec[i] = dp[i] - cp[i] * m_vec[i + 1];
    }

    SplineCoefficients { m: m_vec, h }
}

fn spline_eval(t: f64, ts: &[f64], xs: &[f64], m: &[f64], h: &[f64]) -> f64 {
    let n = ts.len() - 1;
    let mut i = n - 1;
    for k in 0..n {
        if ts[k] <= t && t <= ts[k + 1] {
            i = k;
            break;
        }
    }
    let hi = h[i];
    let a = (ts[i + 1] - t) / hi;
    let b = (t - ts[i]) / hi;
    let term1 = a * xs[i] + b * xs[i + 1];
    let term2 = ((a.powi(3) - a) * m[i] + (b.powi(3) - b) * m[i + 1]) * (hi * hi) / 6.0;
    term1 + term2
}
```

```csharp
static class CubicSplineTrajectory
{
    public static (double[] M, double[] H) Coefficients(double[] ts, double[] xs)
    {
        int n = ts.Length - 1;
        var h = new double[n];
        for (int i = 0; i < n; i++) h[i] = ts[i + 1] - ts[i];

        var a = new double[n + 1];
        var b = new double[n + 1];
        var c = new double[n + 1];
        var d = new double[n + 1];

        b[0] = 1; d[0] = 0;
        b[n] = 1; d[n] = 0;

        for (int i = 1; i < n; i++)
        {
            a[i] = h[i - 1];
            b[i] = 2 * (h[i - 1] + h[i]);
            c[i] = h[i];
            d[i] = 6 * ((xs[i + 1] - xs[i]) / h[i] - (xs[i] - xs[i - 1]) / h[i - 1]);
        }

        var cp = new double[n + 1];
        var dp = new double[n + 1];
        cp[0] = c[0] / b[0];
        dp[0] = d[0] / b[0];
        for (int i = 1; i <= n; i++)
        {
            double m = b[i] - a[i] * cp[i - 1];
            cp[i] = i < n ? c[i] / m : 0;
            dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
        }

        var M = new double[n + 1];
        M[n] = dp[n];
        for (int i = n - 1; i >= 0; i--) M[i] = dp[i] - cp[i] * M[i + 1];

        return (M, h);
    }

    public static double Evaluate(double t, double[] ts, double[] xs, double[] M, double[] h)
    {
        int n = ts.Length - 1;
        int i = n - 1;
        for (int k = 0; k < n; k++)
        {
            if (ts[k] <= t && t <= ts[k + 1]) { i = k; break; }
        }
        double hi = h[i];
        double A = (ts[i + 1] - t) / hi;
        double B = (t - ts[i]) / hi;
        double term1 = A * xs[i] + B * xs[i + 1];
        double term2 = ((Math.Pow(A, 3) - A) * M[i] + (Math.Pow(B, 3) - B) * M[i + 1]) * (hi * hi) / 6;
        return term1 + term2;
    }
}
```
