---
name: 内点法(Interior Point Method)
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: O(n^3.5 L)程度(nは変数数、Lは入力のビット長、多項式時間)
summary: シンプレックス法が実行可能領域の「頂点から頂点へ」多角形の辺をたどって最適解を探すのに対し、実行可能領域の内部を通る滑らかな経路で最適解へ収束していく線形計画法の解法で、最悪計算量が多項式時間であることが保証されている。
---

## 概要

[シンプレックス法](/algorithms/simplex-method)は線形計画問題を、実行可能領域(制約条件を満たす点の集合、多面体になる)の頂点から頂点へ、辺をたどりながら目的関数を改善していく方法で解く。実用上は非常に高速だが、理論上は最悪ケースで指数時間かかる例(クレー・ミンティの例)が存在することが知られている。1984年にナレンドラ・カーマーカー(Karmarkar)が発表した内点法は、全く異なる幾何学的アプローチを取る——実行可能領域の「境界(頂点や辺)」ではなく「内部」を通る滑らかな経路をたどりながら最適解に近づいていく。この発想の転換により、線形計画問題を最悪ケースでも多項式時間で解けることが理論的に保証され、かつ大規模な問題では実務上もシンプレックス法より高速になることがある、線形計画法の理論と実務の両面に大きなインパクトを与えたアルゴリズムである。

## 仕組み

1. 制約条件(不等式)を「バリア関数」(実行可能領域の境界に近づくほど値が急激に大きくなる関数、対数バリア関数がよく使われる)として目的関数に組み込み、「元の制約付き問題」を「バリア項を加えた制約なし(またはより緩い制約の)問題」に変換する
2. バリア項には強さを調整するパラメータ`μ`があり、`μ`が大きいほどバリアの効果が強く、解は実行可能領域の中心寄りに留まろうとする
3. ある`μ`の値のもとで、[ニュートン法](/algorithms/newton-method)を使ってバリア付き目的関数を最小化する点(「中心パス」上の点)を求める
4. `μ`を徐々に0に近づけながら、その都度[ニュートン法](/algorithms/newton-method)で新しい中心パス上の点を求め直す——`μ`が小さくなるにつれてバリアの効果が弱まり、解は実行可能領域の内部から境界(真の最適解、通常は頂点)へと徐々に近づいていく
5. `μ`が十分小さくなった時点で、得られた点が(許容誤差の範囲内で)元の線形計画問題の最適解とみなせる

## 特性・トレードオフ

- **計算量**: `O(n^3.5 L)`程度(`n`は変数数、`L`は入力データのビット長)で多項式時間——[シンプレックス法](/algorithms/simplex-method)が最悪ケースで指数時間になりうるのとは対照的に、理論上の最悪ケース性能が保証されている
- **[シンプレックス法](/algorithms/simplex-method)との使い分け**: 実務では、問題の規模が中程度であれば[シンプレックス法](/algorithms/simplex-method)の方が高速なことが多いが、変数数が非常に多い大規模な線形計画問題では内点法が優位になることがある。現代の商用最適化ソルバー(CPLEX、Gurobi等)は両方の実装を持ち、問題の性質に応じて自動的に(あるいはユーザー指定で)使い分けている
- **[ニュートン法](/algorithms/newton-method)との組み合わせという構造**: 内点法自体は「バリア関数を使って制約なし問題に近似する」という枠組みであり、その中核の反復計算には[ニュートン法](/algorithms/newton-method)が使われる——2つの異なるカテゴリ(数値計算と最適化理論)のアルゴリズムが組み合わさって1つの強力な手法を構成している好例になっている
- **使いどころ**: 大規模な線形計画問題(航空機のスケジューリング、通信ネットワークの帯域割り当てなど数万〜数百万変数規模)、半正定値計画問題や二次計画問題への拡張(内点法の枠組みはこれらのより一般的な凸最適化問題にも拡張できる)、機械学習におけるサポートベクターマシンの学習で使われる二次計画ソルバーの内部実装

## 実装例

以下は「区間`[lo, hi]`内でf(x)=(x-target)²を最小化する」という1変数の不等式制約付き問題を、対数バリア関数と[ニュートン法](/algorithms/newton-method)で解く最小構成の内点法。バリア強度`μ`を外側ループで徐々に0へ近づけながら、各`μ`のもとでニュートン法により中心パス上の点を求める。

```python
def solve_bounded_quadratic(
    target: float, lo: float, hi: float,
    mu0: float = 1.0, mu_factor: float = 0.1, outer_iters: int = 8, newton_iters: int = 20, tol: float = 1e-10,
) -> float:
    x = (lo + hi) / 2.0  # 実行可能領域の内部から出発する
    mu = mu0
    for _ in range(outer_iters):
        for _ in range(newton_iters):
            g1 = x - lo   # g1, g2 >= 0 が制約条件(不等式)
            g2 = hi - x
            # 対数バリア付き目的関数の勾配とヘッセ行列(1変数なのでスカラー)
            grad = 2 * (x - target) - mu * (1.0 / g1 - 1.0 / g2)
            hess = 2 + mu * (1.0 / (g1 * g1) + 1.0 / (g2 * g2))
            step = grad / hess
            x_new = x - step
            # 境界をまたぐ場合はステップを半分にして内部に留める(バリアの前提を守る)
            while x_new <= lo or x_new >= hi:
                step /= 2
                x_new = x - step
            if abs(x_new - x) < tol:
                x = x_new
                break
            x = x_new
        mu *= mu_factor  # バリアを弱めて実行可能領域の境界に近づいていく
    return x
```

```typescript
function solveBoundedQuadratic(
  target: number,
  lo: number,
  hi: number,
  mu0 = 1.0,
  muFactor = 0.1,
  outerIters = 8,
  newtonIters = 20,
  tol = 1e-10
): number {
  let x = (lo + hi) / 2;
  let mu = mu0;
  for (let o = 0; o < outerIters; o++) {
    for (let it = 0; it < newtonIters; it++) {
      const g1 = x - lo;
      const g2 = hi - x;
      const grad = 2 * (x - target) - mu * (1 / g1 - 1 / g2);
      const hess = 2 + mu * (1 / (g1 * g1) + 1 / (g2 * g2));
      let step = grad / hess;
      let xNew = x - step;
      while (xNew <= lo || xNew >= hi) {
        step /= 2;
        xNew = x - step;
      }
      const converged = Math.abs(xNew - x) < tol;
      x = xNew;
      if (converged) break;
    }
    mu *= muFactor;
  }
  return x;
}
```

```cpp
double solveBoundedQuadratic(double target, double lo, double hi,
                              double mu0 = 1.0, double muFactor = 0.1,
                              int outerIters = 8, int newtonIters = 20, double tol = 1e-10) {
    double x = (lo + hi) / 2.0;
    double mu = mu0;
    for (int o = 0; o < outerIters; o++) {
        for (int it = 0; it < newtonIters; it++) {
            double g1 = x - lo, g2 = hi - x;
            double grad = 2 * (x - target) - mu * (1.0 / g1 - 1.0 / g2);
            double hess = 2 + mu * (1.0 / (g1 * g1) + 1.0 / (g2 * g2));
            double step = grad / hess;
            double xNew = x - step;
            while (xNew <= lo || xNew >= hi) {
                step /= 2;
                xNew = x - step;
            }
            bool converged = std::abs(xNew - x) < tol;
            x = xNew;
            if (converged) break;
        }
        mu *= muFactor;
    }
    return x;
}
```

```rust
fn solve_bounded_quadratic(
    target: f64, lo: f64, hi: f64,
    mu0: f64, mu_factor: f64, outer_iters: u32, newton_iters: u32, tol: f64,
) -> f64 {
    let mut x = (lo + hi) / 2.0;
    let mut mu = mu0;
    for _ in 0..outer_iters {
        for _ in 0..newton_iters {
            let g1 = x - lo;
            let g2 = hi - x;
            let grad = 2.0 * (x - target) - mu * (1.0 / g1 - 1.0 / g2);
            let hess = 2.0 + mu * (1.0 / (g1 * g1) + 1.0 / (g2 * g2));
            let mut step = grad / hess;
            let mut x_new = x - step;
            while x_new <= lo || x_new >= hi {
                step /= 2.0;
                x_new = x - step;
            }
            let converged = (x_new - x).abs() < tol;
            x = x_new;
            if converged {
                break;
            }
        }
        mu *= mu_factor;
    }
    x
}
```

```csharp
static double SolveBoundedQuadratic(double target, double lo, double hi,
    double mu0 = 1.0, double muFactor = 0.1, int outerIters = 8, int newtonIters = 20, double tol = 1e-10)
{
    double x = (lo + hi) / 2.0;
    double mu = mu0;
    for (int o = 0; o < outerIters; o++)
    {
        for (int it = 0; it < newtonIters; it++)
        {
            double g1 = x - lo, g2 = hi - x;
            double grad = 2 * (x - target) - mu * (1.0 / g1 - 1.0 / g2);
            double hess = 2 + mu * (1.0 / (g1 * g1) + 1.0 / (g2 * g2));
            double step = grad / hess;
            double xNew = x - step;
            while (xNew <= lo || xNew >= hi)
            {
                step /= 2;
                xNew = x - step;
            }
            bool converged = Math.Abs(xNew - x) < tol;
            x = xNew;
            if (converged) break;
        }
        mu *= muFactor;
    }
    return x;
}
```
