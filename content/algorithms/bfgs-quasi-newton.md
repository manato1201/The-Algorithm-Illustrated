---
name: BFGS法(準ニュートン法)
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: 1反復 O(n²)(勾配の評価 + 行列の更新)、メモリ O(n²)
summary: ヘッセ行列(2階微分)を計算せず、勾配の変化から逆ヘッセ行列の近似を更新しながらニュートン法に似た方向へ進む、連続最適化の定番手法。
---

## 概要

滑らかな関数を最小化するとき、[最急降下法](/algorithms/gradient-descent)は勾配だけで進むため、谷が細長いと左右にジグザグして遅い。[ニュートン法](/algorithms/multivariate-newton-method)はヘッセ行列(2階微分)を使って谷の形を考慮した方向に進むので速く収束するが、n 変数ならヘッセ行列が n×n で、その計算と逆行列(または連立方程式の求解 O(n³))が高価で、そもそも2階微分が手に入らない問題も多い。

準ニュートン法は、「**2階微分を直接求めず、勾配が反復の間でどう変わったかから曲率を推定する**」という方針で、この中間を取る。BFGS法は、Broyden、Fletcher、Goldfarb、Shannoが1970年にそれぞれ独立に発表した更新式で、準ニュートン法のなかで最も広く使われる。勾配の計算コストだけで、超1次収束(最急降下より速く、ニュートン法に近い収束)が得られる。

## 仕組み

目的関数 `f(x)`、勾配 `g(x)`、逆ヘッセ行列の近似 `H`(初期値は単位行列)を持つ。

1. 探索方向を `p = −H·g` とする(`H` が単位行列なら最急降下と同じ)
2. **直線探索**: `x + α·p` に沿って、十分な減少(Armijo条件)と曲率の条件(Wolfe条件)を満たす刻み幅 `α` を探す。`α = 1` から始めて、減少が足りなければ縮める(バックトラッキング)
3. 新しい点 `x' = x + α·p` と勾配 `g'` を求め、`s = x' − x`、`y = g' − g` とする
4. 逆ヘッセ行列の近似を更新する(`ρ = 1 / (yᵀs)`)。
   `H' = (I − ρ·s·yᵀ) · H · (I − ρ·y·sᵀ) + ρ·s·sᵀ`
   この式は、`H'·y = s`(割線条件。勾配の変化が、移動に対応するという条件)を満たし、`H` が正定値なら `yᵀs > 0` のとき正定値性が保たれる
5. 勾配が十分小さくなるまで繰り返す

## 特性・トレードオフ

- **2階微分が不要**: 勾配だけ(自動微分や解析式)で動く。勾配すら使えなければ、[ネルダー・ミード法](/algorithms/nelder-mead-simplex-method)などの微分不要法に切り替える
- **超1次収束**: 最適解の近くでは、最急降下法よりずっと少ない反復で収束する。ただし1反復のコストは O(n²)
- **メモリが n²**: 変数が数万を超えると、行列を持てない。そこで直近 m 組の `(s, y)` だけを保持して行列を陽に持たない**L-BFGS**が使われる(メモリ O(mn)で、大規模な連続最適化の標準)
- **直線探索の質が重要**: 曲率条件を満たす刻み幅を選ばないと、`yᵀs ≤ 0` になって更新が壊れる。実装では、条件を満たさない更新を飛ばす、あるいは Wolfe 条件を満たすまで探索を続ける
- **非凸では局所解**: 見つかるのは局所最小。滑らかでない関数(絶対値など)には向かない
- **使いどころ**: 機械学習の古典的なモデル(ロジスティック回帰、CRF)の学習、物理・化学の構造最適化、科学計算ライブラリの `minimize` の標準手法

## 実装例

```python
def rosenbrock(x):
    return (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2


def grad(x):
    return [-2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] ** 2), 200 * (x[1] - x[0] ** 2)]


def mat_vec(m, v):
    return [sum(m[i][j] * v[j] for j in range(len(v))) for i in range(len(m))]


def bfgs(f, g, x0, tol=1e-8, max_iter=200):
    n = len(x0)
    x = list(x0)
    h = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    gx = g(x)
    for k in range(max_iter):
        if sum(v * v for v in gx) ** 0.5 < tol:
            return x, k
        p = [-v for v in mat_vec(h, gx)]
        slope = sum(a * b for a, b in zip(gx, p))
        alpha = 1.0
        while f([xi + alpha * pi for xi, pi in zip(x, p)]) > f(x) + 1e-4 * alpha * slope:
            alpha *= 0.5                      # バックトラッキング(Armijo条件)
        x_new = [xi + alpha * pi for xi, pi in zip(x, p)]
        g_new = g(x_new)
        s = [a - b for a, b in zip(x_new, x)]
        y = [a - b for a, b in zip(g_new, gx)]
        sy = sum(a * b for a, b in zip(s, y))
        if sy > 1e-12:                        # 曲率条件を満たすときだけ更新する
            rho = 1.0 / sy
            hy = mat_vec(h, y)
            yhy = sum(a * b for a, b in zip(y, hy))
            for i in range(n):
                for j in range(n):
                    h[i][j] += (1 + rho * yhy) * rho * s[i] * s[j] - rho * (hy[i] * s[j] + s[i] * hy[j])
        x, gx = x_new, g_new
    return x, max_iter


x, iterations = bfgs(rosenbrock, grad, [-1.2, 1.0])
print([round(v, 4) for v in x], iterations)  # 約 [1.0, 1.0]
```

```typescript
const rosenbrock = (x: number[]): number =>
  (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2;
const grad = (x: number[]): number[] => [
  -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] ** 2),
  200 * (x[1] - x[0] ** 2),
];

const dot = (a: number[], b: number[]): number =>
  a.reduce((s, v, i) => s + v * b[i], 0);
const matVec = (m: number[][], v: number[]): number[] =>
  m.map((row) => dot(row, v));

function bfgs(
  f: (x: number[]) => number,
  g: (x: number[]) => number[],
  x0: number[],
  tol = 1e-8,
  maxIter = 200,
) {
  const n = x0.length;
  let x = [...x0];
  const h = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  let gx = g(x);
  for (let k = 0; k < maxIter; k++) {
    if (Math.sqrt(dot(gx, gx)) < tol) return { x, iterations: k };
    const p = matVec(h, gx).map((v) => -v);
    const slope = dot(gx, p);
    let alpha = 1;
    while (f(x.map((xi, i) => xi + alpha * p[i])) > f(x) + 1e-4 * alpha * slope)
      alpha *= 0.5;
    const xNew = x.map((xi, i) => xi + alpha * p[i]);
    const gNew = g(xNew);
    const s = xNew.map((v, i) => v - x[i]);
    const y = gNew.map((v, i) => v - gx[i]);
    const sy = dot(s, y);
    if (sy > 1e-12) {
      const rho = 1 / sy;
      const hy = matVec(h, y);
      const yhy = dot(y, hy);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          h[i][j] +=
            (1 + rho * yhy) * rho * s[i] * s[j] -
            rho * (hy[i] * s[j] + s[i] * hy[j]);
        }
      }
    }
    x = xNew;
    gx = gNew;
  }
  return { x, iterations: maxIter };
}

const result = bfgs(rosenbrock, grad, [-1.2, 1.0]);
console.log(
  result.x.map((v) => Number(v.toFixed(4))),
  result.iterations,
);
```
