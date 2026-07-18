---
name: LU分解
category: 数値計算
subcategory: 線形代数計算
complexity: O(n³)(分解)+O(n²)(1回の求解)
summary: 行列を下三角行列と上三角行列の積に分解しておくことで、同じ係数の連立方程式を何度でも高速に解けるようにする手法。
---

## 概要

[ガウスの消去法](/algorithms/gaussian-elimination)は連立方程式`Ax = b`を1回解くのに`O(n³)`かかるが、もし同じ係数行列`A`のまま右辺`b`だけが異なる方程式を何度も解きたい場合(シミュレーションで時間ステップごとに右辺が変わる、など)、毎回ガウスの消去法をゼロからやり直すのは無駄が多い。LU分解は、行列`A`を「下三角行列`L`(対角線より上が0)」と「上三角行列`U`(対角線より下が0)」の積`A = LU`にあらかじめ分解しておくことで、この無駄を解消する——一度分解してしまえば、以降は右辺`b`が変わるたびに`O(n²)`の軽い計算だけで解ける。

## 仕組み

1. [ガウスの消去法](/algorithms/gaussian-elimination)の前進消去を`A`に対して実行し、上三角行列`U`を得る。このとき、各行から引いた「倍率」を記録しておくと、それがそのまま下三角行列`L`の対角線より下の成分になる(対角成分は1とする)
2. こうして`A = LU`という分解が得られる(ピボット選択で行を入れ替える場合は、置換行列`P`を使って`PA = LU`と表現する)
3. 連立方程式`Ax = b`を解きたいとき、`LUx = b`と考え、まず`Ly = b`を解いて`y`を求める(**前進代入**、`L`が下三角なので上から順に代入するだけでO(n²)で解ける)
4. 次に`Ux = y`を解いて`x`を求める(**後退代入**、`U`が上三角なので下から順に代入するだけでO(n²)で解ける)

分解自体は`O(n³)`かかるが、これは`A`が変わらない限り1回だけで済み、`b`が変わるたびの再計算は3〜4の`O(n²)`だけで完了する。

## 特性・トレードオフ

- **計算量**: 分解に`O(n³)`(ガウスの消去法と同等)、分解後の1回の求解は`O(n²)`。同じ`A`に対して`k`回解く場合、都度ガウスの消去法を使うと`O(k×n³)`かかるところ、LU分解なら`O(n³) + O(k×n²)`で済む——`k`が大きいほど効果が大きい
- **逆行列の計算にも使える**: `Ax = eᵢ`(`eᵢ`は単位ベクトル)を`i = 1, ..., n`について解くことで逆行列`A⁻¹`の各列が求まる。逆行列を直接計算するより数値的に安定していることが多い
- **行列式の計算にも使える**: 三角行列の行列式は対角成分の積で単純に求まるため、`det(A) = det(L) × det(U)`(置換行列を使った場合は符号の補正が必要)から`A`の行列式を効率的に計算できる
- **使いどころ**: 有限要素法・回路シミュレーションなど「同じ係数行列で右辺だけ変わる」問題を繰り返し解く数値計算全般、逆行列・行列式の計算、統計・機械学習ライブラリの内部の線形代数演算(NumPyのSciPyバックエンドなど)

## 実装例

```python
def lu_decomposition(a: list[list[float]]) -> tuple[list[list[float]], list[list[float]]]:
    n = len(a)
    l = [[0.0] * n for _ in range(n)]
    u = [[0.0] * n for _ in range(n)]
    for i in range(n):
        l[i][i] = 1.0
    for col in range(n):
        for r in range(col, n):
            u[col][r] = a[col][r] - sum(l[col][k] * u[k][r] for k in range(col))
        for r in range(col + 1, n):
            l[r][col] = (a[r][col] - sum(l[r][k] * u[k][col] for k in range(col))) / u[col][col]
    return l, u


def lu_solve(l: list[list[float]], u: list[list[float]], b: list[float]) -> list[float]:
    n = len(b)
    y = [0.0] * n
    for i in range(n):
        y[i] = b[i] - sum(l[i][k] * y[k] for k in range(i))
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (y[i] - sum(u[i][k] * x[k] for k in range(i + 1, n))) / u[i][i]
    return x
```

```typescript
function luDecomposition(a: number[][]): { l: number[][]; u: number[][] } {
  const n = a.length;
  const l: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const u: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) l[i][i] = 1;
  for (let col = 0; col < n; col++) {
    for (let r = col; r < n; r++) {
      let s = 0;
      for (let k = 0; k < col; k++) s += l[col][k] * u[k][r];
      u[col][r] = a[col][r] - s;
    }
    for (let r = col + 1; r < n; r++) {
      let s = 0;
      for (let k = 0; k < col; k++) s += l[r][k] * u[k][col];
      l[r][col] = (a[r][col] - s) / u[col][col];
    }
  }
  return { l, u };
}

function luSolve(l: number[][], u: number[][], b: number[]): number[] {
  const n = b.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= l[i][k] * y[k];
    y[i] = s;
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= u[i][k] * x[k];
    x[i] = s / u[i][i];
  }
  return x;
}
```

```cpp
#include <vector>

std::pair<std::vector<std::vector<double>>, std::vector<std::vector<double>>> luDecomposition(
    const std::vector<std::vector<double>>& a) {
    int n = static_cast<int>(a.size());
    std::vector<std::vector<double>> l(n, std::vector<double>(n, 0.0));
    std::vector<std::vector<double>> u(n, std::vector<double>(n, 0.0));
    for (int i = 0; i < n; i++) l[i][i] = 1.0;
    for (int col = 0; col < n; col++) {
        for (int r = col; r < n; r++) {
            double s = 0.0;
            for (int k = 0; k < col; k++) s += l[col][k] * u[k][r];
            u[col][r] = a[col][r] - s;
        }
        for (int r = col + 1; r < n; r++) {
            double s = 0.0;
            for (int k = 0; k < col; k++) s += l[r][k] * u[k][col];
            l[r][col] = (a[r][col] - s) / u[col][col];
        }
    }
    return {l, u};
}

std::vector<double> luSolve(const std::vector<std::vector<double>>& l,
                             const std::vector<std::vector<double>>& u,
                             const std::vector<double>& b) {
    int n = static_cast<int>(b.size());
    std::vector<double> y(n, 0.0);
    for (int i = 0; i < n; i++) {
        double s = b[i];
        for (int k = 0; k < i; k++) s -= l[i][k] * y[k];
        y[i] = s;
    }
    std::vector<double> x(n, 0.0);
    for (int i = n - 1; i >= 0; i--) {
        double s = y[i];
        for (int k = i + 1; k < n; k++) s -= u[i][k] * x[k];
        x[i] = s / u[i][i];
    }
    return x;
}
```

```rust
fn lu_decomposition(a: &[Vec<f64>]) -> (Vec<Vec<f64>>, Vec<Vec<f64>>) {
    let n = a.len();
    let mut l = vec![vec![0.0; n]; n];
    let mut u = vec![vec![0.0; n]; n];
    for i in 0..n {
        l[i][i] = 1.0;
    }
    for col in 0..n {
        for r in col..n {
            let s: f64 = (0..col).map(|k| l[col][k] * u[k][r]).sum();
            u[col][r] = a[col][r] - s;
        }
        for r in (col + 1)..n {
            let s: f64 = (0..col).map(|k| l[r][k] * u[k][col]).sum();
            l[r][col] = (a[r][col] - s) / u[col][col];
        }
    }
    (l, u)
}

fn lu_solve(l: &[Vec<f64>], u: &[Vec<f64>], b: &[f64]) -> Vec<f64> {
    let n = b.len();
    let mut y = vec![0.0; n];
    for i in 0..n {
        let s: f64 = (0..i).map(|k| l[i][k] * y[k]).sum();
        y[i] = b[i] - s;
    }
    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        let s: f64 = ((i + 1)..n).map(|k| u[i][k] * x[k]).sum();
        x[i] = (y[i] - s) / u[i][i];
    }
    x
}
```

```csharp
static (double[][] L, double[][] U) LuDecomposition(double[][] a)
{
    int n = a.Length;
    var l = new double[n][];
    var u = new double[n][];
    for (int i = 0; i < n; i++) { l[i] = new double[n]; u[i] = new double[n]; }
    for (int i = 0; i < n; i++) l[i][i] = 1.0;
    for (int col = 0; col < n; col++)
    {
        for (int r = col; r < n; r++)
        {
            double s = 0;
            for (int k = 0; k < col; k++) s += l[col][k] * u[k][r];
            u[col][r] = a[col][r] - s;
        }
        for (int r = col + 1; r < n; r++)
        {
            double s = 0;
            for (int k = 0; k < col; k++) s += l[r][k] * u[k][col];
            l[r][col] = (a[r][col] - s) / u[col][col];
        }
    }
    return (l, u);
}

static double[] LuSolve(double[][] l, double[][] u, double[] b)
{
    int n = b.Length;
    var y = new double[n];
    for (int i = 0; i < n; i++)
    {
        double s = b[i];
        for (int k = 0; k < i; k++) s -= l[i][k] * y[k];
        y[i] = s;
    }
    var x = new double[n];
    for (int i = n - 1; i >= 0; i--)
    {
        double s = y[i];
        for (int k = i + 1; k < n; k++) s -= u[i][k] * x[k];
        x[i] = s / u[i][i];
    }
    return x;
}
```
