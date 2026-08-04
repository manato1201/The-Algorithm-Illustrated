---
name: 線形二次レギュレータ(LQR)
category: 制御・ロボティクス
subcategory: フィードバック制御
complexity: O(n³)(1回のリカッチ方程式の反復求解、nは状態変数の次元数)
summary: "[PID制御](/algorithms/pid-control)のようにゲインを手動で試行錯誤するのではなく、「状態の乱れ」と「制御入力の大きさ」のバランスを数式(コスト関数)で明示的に定義し、そのコストを数学的に最小化するフィードバックゲインを自動的に導出する最適制御手法。"
---

## 概要

[PID制御](/algorithms/pid-control)は比例・積分・微分の3つのゲインを経験則やチューニングで調整するが、システムの状態変数が多く相互に影響し合う複雑なロボット(多関節アームや倒立振子など)では、この試行錯誤によるチューニングが非常に難しくなる。線形二次レギュレータ(LQR)は全く異なるアプローチを取る——「状態が目標からどれだけずれているか」と「制御入力にどれだけのエネルギーを使ったか」の両方にペナルティを課すコスト関数(二次形式)を明示的に定義し、そのコストの合計を数学的に最小化するフィードバックゲインを、リカッチ方程式という行列方程式を解くことで自動的に導出する。「良い制御とは何か」を数式で定義してしまえば、あとは計算がゲインを教えてくれる、という最適制御理論の代表的な成功例である。

## 仕組み

1. 制御したいシステムの状態方程式を、状態ベクトル`x`と制御入力ベクトル`u`を使った線形な形`ẋ = Ax + Bu`(状態の変化率が、現在の状態と入力の線形結合で表される)として定式化する
2. コスト関数`J = ∫(xᵀQx + uᵀRu)dt`を定義する。`Q`は状態のずれ(目標からの逸脱)にどれだけペナルティを課すかを表す行列、`R`は制御入力の大きさ(エネルギー消費や急激な動き)にどれだけペナルティを課すかを表す行列——`Q`を大きくすれば目標への追従を重視し、`R`を大きくすれば省エネで滑らかな制御を重視する、というトレードオフをこの2つの行列で明示的に指定する
3. このコスト`J`を最小化する最適な制御入力`u`は、`u = -Kx`(現在の状態のずれに比例したフィードバック)という単純な線形形式になることが理論的に証明されている
4. 最適なフィードバックゲイン`K`は、`A`・`B`・`Q`・`R`から、代数リカッチ方程式(`AᵀP + PA - PBR⁻¹BᵀP + Q = 0`)を解いて得られる行列`P`から`K = R⁻¹BᵀP`として計算される——このリカッチ方程式の求解には反復計算法が使われる
5. こうして一度計算された`K`を使い、実際の制御ではリアルタイムに現在の状態`x`を観測し、`u = -Kx`によって制御入力を決定し続ける

## 特性・トレードオフ

- **計算量**: リカッチ方程式の反復求解は状態変数の次元数`n`に対して`O(n³)`per反復——この計算はオフラインで(制御を実行する前に)1回だけ行えばよく、実際の制御ループでは単純な行列とベクトルの掛け算`u=-Kx`(`O(n)`)を繰り返すだけなので、リアルタイム制御への応用に支障はない
- **[PID制御](/algorithms/pid-control)との対比**: [PID制御](/algorithms/pid-control)は単一の誤差信号に対する経験則的な補正則であり複数変数の相互作用を明示的には扱わないのに対し、LQRは状態空間全体(複数の状態変数とその相互関係)を行列として扱い、コスト関数の最小化という数学的に厳密な基準でゲインを導出する——多入力多出力(MIMO)システムの制御では、LQRの方が体系的で扱いやすいことが多い
- **モデルの正確さへの依存**: LQRの最適性は、システムの状態方程式(`A`、`B`)が正確に分かっていることを前提としている。実際のロボットや物理システムがこの線形モデルからずれている(非線形性が強い、モデル化誤差がある)場合、理論上の最適性が実際の性能に直結しない可能性があり、モデル誤差に頑健なH∞制御のような発展的手法が使われることもある
- **`Q`・`R`の選び方という設計上の自由度**: コスト関数の`Q`・`R`をどう設定するかは依然として設計者の判断に委ねられており、「良い制御」の定義そのものをどう数式に落とし込むかというセンスが要求される——完全に自動化されているわけではなく、最終的な調整点が「個々のゲイン」から「コスト関数の重み」に移っただけとも言える
- **使いどころ**: 倒立振子・二足歩行ロボットのバランス制御、ドローンの姿勢制御、自動車の車線維持支援システム、[カルマンフィルタ](/algorithms/kalman-filter)と組み合わせた線形二次ガウス制御(LQG、状態推定と最適制御を組み合わせる)

## 実装例

離散時間代数リカッチ方程式`P = Q + AᵀPA - AᵀPB(R + BᵀPB)⁻¹BᵀPA`を、`P`をQから初期化して収束するまで反復計算で解き、フィードバックゲイン`K`を求める。

```python
Matrix = list[list[float]]

def mat_mul(a: Matrix, b: Matrix) -> Matrix:
    n, m, p = len(a), len(b), len(b[0])
    return [[sum(a[i][k] * b[k][j] for k in range(m)) for j in range(p)] for i in range(n)]

def mat_transpose(a: Matrix) -> Matrix:
    rows, cols = len(a), len(a[0])
    return [[a[i][j] for i in range(rows)] for j in range(cols)]

def mat_add(a: Matrix, b: Matrix) -> Matrix:
    return [[a[i][j] + b[i][j] for j in range(len(a[0]))] for i in range(len(a))]

def mat_sub(a: Matrix, b: Matrix) -> Matrix:
    return [[a[i][j] - b[i][j] for j in range(len(a[0]))] for i in range(len(a))]

def mat_inverse(a: Matrix) -> Matrix:
    """ガウス・ジョルダン消去法による正方行列の逆行列計算(小さな行列向けの素朴な実装)。"""
    n = len(a)
    aug = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(a)]
    for col in range(n):
        pivot_row = max(range(col, n), key=lambda r: abs(aug[r][col]))
        aug[col], aug[pivot_row] = aug[pivot_row], aug[col]
        pivot = aug[col][col]
        aug[col] = [x / pivot for x in aug[col]]
        for r in range(n):
            if r != col:
                factor = aug[r][col]
                aug[r] = [aug[r][k] - factor * aug[col][k] for k in range(2 * n)]
    return [row[n:] for row in aug]

def solve_dare(a: Matrix, b: Matrix, q: Matrix, r: Matrix, iterations: int = 500, tol: float = 1e-12) -> Matrix:
    """離散時間代数リカッチ方程式を反復計算で解く: P = Q + AᵀPA - AᵀPB(R + BᵀPB)⁻¹BᵀPA"""
    p = [row[:] for row in q]
    at, bt = mat_transpose(a), mat_transpose(b)
    for _ in range(iterations):
        pa = mat_mul(p, a)
        ptb = mat_mul(p, b)
        s = mat_add(r, mat_mul(bt, ptb))  # R + BᵀPB
        s_inv = mat_inverse(s)
        gain_term = mat_mul(mat_mul(mat_mul(at, ptb), s_inv), mat_mul(bt, pa))
        p_next = mat_sub(mat_add(q, mat_mul(at, pa)), gain_term)
        diff = max(abs(p_next[i][j] - p[i][j]) for i in range(len(p)) for j in range(len(p[0])))
        p = p_next
        if diff < tol:
            break
    return p

def compute_lqr_gain(a: Matrix, b: Matrix, q: Matrix, r: Matrix) -> Matrix:
    """最適フィードバックゲイン K = (R + BᵀPB)⁻¹BᵀPA を計算する。"""
    p = solve_dare(a, b, q, r)
    bt = mat_transpose(b)
    s = mat_add(r, mat_mul(bt, mat_mul(p, b)))
    s_inv = mat_inverse(s)
    return mat_mul(mat_mul(s_inv, bt), mat_mul(p, a))
```

```typescript
type Matrix = number[][];

function matMul(a: Matrix, b: Matrix): Matrix {
  const n = a.length, m = b.length, p = b[0].length;
  const r: Matrix = Array.from({ length: n }, () => new Array(p).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let k = 0; k < m; k++) s += a[i][k] * b[k][j];
      r[i][j] = s;
    }
  return r;
}

function matTranspose(a: Matrix): Matrix {
  const rows = a.length, cols = a[0].length;
  const t: Matrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) t[j][i] = a[i][j];
  return t;
}

function matAdd(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

function matSub(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

// ガウス・ジョルダン消去法による正方行列の逆行列計算(小さな行列向けの素朴な実装)
function matInverse(a: Matrix): Matrix {
  const n = a.length;
  const aug: Matrix = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) pivotRow = r;
    [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    const pivot = aug[col][col];
    aug[col] = aug[col].map((x) => x / pivot);
    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const factor = aug[r][col];
        aug[r] = aug[r].map((x, k) => x - factor * aug[col][k]);
      }
    }
  }
  return aug.map((row) => row.slice(n));
}

// 離散時間代数リカッチ方程式を反復計算で解く: P = Q + AᵀPA - AᵀPB(R + BᵀPB)⁻¹BᵀPA
function solveDare(a: Matrix, b: Matrix, q: Matrix, r: Matrix, iterations = 500, tol = 1e-12): Matrix {
  let p: Matrix = q.map((row) => [...row]);
  const at = matTranspose(a);
  const bt = matTranspose(b);
  for (let iter = 0; iter < iterations; iter++) {
    const pa = matMul(p, a);
    const ptb = matMul(p, b);
    const s = matAdd(r, matMul(bt, ptb));
    const sInv = matInverse(s);
    const gainTerm = matMul(matMul(matMul(at, ptb), sInv), matMul(bt, pa));
    const pNext = matSub(matAdd(q, matMul(at, pa)), gainTerm);
    let diff = 0;
    for (let i = 0; i < p.length; i++)
      for (let j = 0; j < p[0].length; j++) diff = Math.max(diff, Math.abs(pNext[i][j] - p[i][j]));
    p = pNext;
    if (diff < tol) break;
  }
  return p;
}

// 最適フィードバックゲイン K = (R + BᵀPB)⁻¹BᵀPA を計算する
function computeLqrGain(a: Matrix, b: Matrix, q: Matrix, r: Matrix): Matrix {
  const p = solveDare(a, b, q, r);
  const bt = matTranspose(b);
  const s = matAdd(r, matMul(bt, matMul(p, b)));
  const sInv = matInverse(s);
  return matMul(matMul(sInv, bt), matMul(p, a));
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

using Matrix = std::vector<std::vector<double>>;

Matrix matMul(const Matrix& a, const Matrix& b) {
    size_t n = a.size(), m = b.size(), p = b[0].size();
    Matrix r(n, std::vector<double>(p, 0.0));
    for (size_t i = 0; i < n; i++)
        for (size_t j = 0; j < p; j++)
            for (size_t k = 0; k < m; k++) r[i][j] += a[i][k] * b[k][j];
    return r;
}

Matrix matTranspose(const Matrix& a) {
    size_t rows = a.size(), cols = a[0].size();
    Matrix t(cols, std::vector<double>(rows, 0.0));
    for (size_t i = 0; i < rows; i++) for (size_t j = 0; j < cols; j++) t[j][i] = a[i][j];
    return t;
}

Matrix matAdd(const Matrix& a, const Matrix& b) {
    Matrix r = a;
    for (size_t i = 0; i < a.size(); i++) for (size_t j = 0; j < a[0].size(); j++) r[i][j] += b[i][j];
    return r;
}

Matrix matSub(const Matrix& a, const Matrix& b) {
    Matrix r = a;
    for (size_t i = 0; i < a.size(); i++) for (size_t j = 0; j < a[0].size(); j++) r[i][j] -= b[i][j];
    return r;
}

// ガウス・ジョルダン消去法による正方行列の逆行列計算(小さな行列向けの素朴な実装)
Matrix matInverse(const Matrix& a) {
    size_t n = a.size();
    Matrix aug(n, std::vector<double>(2 * n, 0.0));
    for (size_t i = 0; i < n; i++) {
        for (size_t j = 0; j < n; j++) aug[i][j] = a[i][j];
        aug[i][n + i] = 1.0;
    }
    for (size_t col = 0; col < n; col++) {
        size_t pivotRow = col;
        for (size_t r = col + 1; r < n; r++) if (std::abs(aug[r][col]) > std::abs(aug[pivotRow][col])) pivotRow = r;
        std::swap(aug[col], aug[pivotRow]);
        double pivot = aug[col][col];
        for (double& x : aug[col]) x /= pivot;
        for (size_t r = 0; r < n; r++) {
            if (r != col) {
                double factor = aug[r][col];
                for (size_t k = 0; k < 2 * n; k++) aug[r][k] -= factor * aug[col][k];
            }
        }
    }
    Matrix inv(n, std::vector<double>(n));
    for (size_t i = 0; i < n; i++) for (size_t j = 0; j < n; j++) inv[i][j] = aug[i][n + j];
    return inv;
}

// 離散時間代数リカッチ方程式を反復計算で解く: P = Q + AᵀPA - AᵀPB(R + BᵀPB)⁻¹BᵀPA
Matrix solveDare(const Matrix& a, const Matrix& b, const Matrix& q, const Matrix& r,
                  int iterations = 500, double tol = 1e-12) {
    Matrix p = q;
    Matrix at = matTranspose(a), bt = matTranspose(b);
    for (int iter = 0; iter < iterations; iter++) {
        Matrix pa = matMul(p, a);
        Matrix ptb = matMul(p, b);
        Matrix s = matAdd(r, matMul(bt, ptb));
        Matrix sInv = matInverse(s);
        Matrix gainTerm = matMul(matMul(matMul(at, ptb), sInv), matMul(bt, pa));
        Matrix pNext = matSub(matAdd(q, matMul(at, pa)), gainTerm);
        double diff = 0.0;
        for (size_t i = 0; i < p.size(); i++)
            for (size_t j = 0; j < p[0].size(); j++) diff = std::max(diff, std::abs(pNext[i][j] - p[i][j]));
        p = pNext;
        if (diff < tol) break;
    }
    return p;
}

// 最適フィードバックゲイン K = (R + BᵀPB)⁻¹BᵀPA を計算する
Matrix computeLqrGain(const Matrix& a, const Matrix& b, const Matrix& q, const Matrix& r) {
    Matrix p = solveDare(a, b, q, r);
    Matrix bt = matTranspose(b);
    Matrix s = matAdd(r, matMul(bt, matMul(p, b)));
    Matrix sInv = matInverse(s);
    return matMul(matMul(sInv, bt), matMul(p, a));
}
```

```rust
type Matrix = Vec<Vec<f64>>;

fn mat_mul(a: &Matrix, b: &Matrix) -> Matrix {
    let n = a.len();
    let m = b.len();
    let p = b[0].len();
    let mut r = vec![vec![0.0; p]; n];
    for i in 0..n {
        for j in 0..p {
            let mut s = 0.0;
            for k in 0..m {
                s += a[i][k] * b[k][j];
            }
            r[i][j] = s;
        }
    }
    r
}

fn mat_transpose(a: &Matrix) -> Matrix {
    let rows = a.len();
    let cols = a[0].len();
    (0..cols).map(|j| (0..rows).map(|i| a[i][j]).collect()).collect()
}

fn mat_add(a: &Matrix, b: &Matrix) -> Matrix {
    a.iter().zip(b).map(|(ra, rb)| ra.iter().zip(rb).map(|(x, y)| x + y).collect()).collect()
}

fn mat_sub(a: &Matrix, b: &Matrix) -> Matrix {
    a.iter().zip(b).map(|(ra, rb)| ra.iter().zip(rb).map(|(x, y)| x - y).collect()).collect()
}

// ガウス・ジョルダン消去法による正方行列の逆行列計算(小さな行列向けの素朴な実装)
fn mat_inverse(a: &Matrix) -> Matrix {
    let n = a.len();
    let mut aug: Matrix = a
        .iter()
        .enumerate()
        .map(|(i, row)| {
            let mut r = row.clone();
            r.extend((0..n).map(|j| if i == j { 1.0 } else { 0.0 }));
            r
        })
        .collect();
    for col in 0..n {
        let mut pivot_row = col;
        for r in (col + 1)..n {
            if aug[r][col].abs() > aug[pivot_row][col].abs() {
                pivot_row = r;
            }
        }
        aug.swap(col, pivot_row);
        let pivot = aug[col][col];
        for x in aug[col].iter_mut() {
            *x /= pivot;
        }
        for r in 0..n {
            if r != col {
                let factor = aug[r][col];
                for k in 0..(2 * n) {
                    aug[r][k] -= factor * aug[col][k];
                }
            }
        }
    }
    aug.iter().map(|row| row[n..].to_vec()).collect()
}

// 離散時間代数リカッチ方程式を反復計算で解く: P = Q + AᵀPA - AᵀPB(R + BᵀPB)⁻¹BᵀPA
fn solve_dare(a: &Matrix, b: &Matrix, q: &Matrix, r: &Matrix, iterations: usize, tol: f64) -> Matrix {
    let mut p = q.clone();
    let at = mat_transpose(a);
    let bt = mat_transpose(b);
    for _ in 0..iterations {
        let pa = mat_mul(&p, a);
        let ptb = mat_mul(&p, b);
        let s = mat_add(r, &mat_mul(&bt, &ptb));
        let s_inv = mat_inverse(&s);
        let gain_term = mat_mul(&mat_mul(&mat_mul(&at, &ptb), &s_inv), &mat_mul(&bt, &pa));
        let p_next = mat_sub(&mat_add(q, &mat_mul(&at, &pa)), &gain_term);
        let mut diff = 0.0_f64;
        for i in 0..p.len() {
            for j in 0..p[0].len() {
                diff = diff.max((p_next[i][j] - p[i][j]).abs());
            }
        }
        p = p_next;
        if diff < tol {
            break;
        }
    }
    p
}

// 最適フィードバックゲイン K = (R + BᵀPB)⁻¹BᵀPA を計算する
fn compute_lqr_gain(a: &Matrix, b: &Matrix, q: &Matrix, r: &Matrix) -> Matrix {
    let p = solve_dare(a, b, q, r, 500, 1e-12);
    let bt = mat_transpose(b);
    let s = mat_add(r, &mat_mul(&bt, &mat_mul(&p, b)));
    let s_inv = mat_inverse(&s);
    mat_mul(&mat_mul(&s_inv, &bt), &mat_mul(&p, a))
}
```

```csharp
using System;
using System.Linq;

static class Lqr
{
    static double[][] MatMul(double[][] a, double[][] b)
    {
        int n = a.Length, m = b.Length, p = b[0].Length;
        var r = new double[n][];
        for (int i = 0; i < n; i++)
        {
            r[i] = new double[p];
            for (int j = 0; j < p; j++)
            {
                double s = 0;
                for (int k = 0; k < m; k++) s += a[i][k] * b[k][j];
                r[i][j] = s;
            }
        }
        return r;
    }

    static double[][] MatTranspose(double[][] a)
    {
        int rows = a.Length, cols = a[0].Length;
        var t = new double[cols][];
        for (int j = 0; j < cols; j++)
        {
            t[j] = new double[rows];
            for (int i = 0; i < rows; i++) t[j][i] = a[i][j];
        }
        return t;
    }

    static double[][] MatAdd(double[][] a, double[][] b) =>
        a.Select((row, i) => row.Select((v, j) => v + b[i][j]).ToArray()).ToArray();

    static double[][] MatSub(double[][] a, double[][] b) =>
        a.Select((row, i) => row.Select((v, j) => v - b[i][j]).ToArray()).ToArray();

    // ガウス・ジョルダン消去法による正方行列の逆行列計算(小さな行列向けの素朴な実装)
    static double[][] MatInverse(double[][] a)
    {
        int n = a.Length;
        var aug = new double[n][];
        for (int i = 0; i < n; i++)
        {
            aug[i] = new double[2 * n];
            for (int j = 0; j < n; j++) aug[i][j] = a[i][j];
            aug[i][n + i] = 1.0;
        }
        for (int col = 0; col < n; col++)
        {
            int pivotRow = col;
            for (int r = col + 1; r < n; r++) if (Math.Abs(aug[r][col]) > Math.Abs(aug[pivotRow][col])) pivotRow = r;
            (aug[col], aug[pivotRow]) = (aug[pivotRow], aug[col]);
            double pivot = aug[col][col];
            for (int k = 0; k < 2 * n; k++) aug[col][k] /= pivot;
            for (int r = 0; r < n; r++)
            {
                if (r != col)
                {
                    double factor = aug[r][col];
                    for (int k = 0; k < 2 * n; k++) aug[r][k] -= factor * aug[col][k];
                }
            }
        }
        var inv = new double[n][];
        for (int i = 0; i < n; i++)
        {
            inv[i] = new double[n];
            for (int j = 0; j < n; j++) inv[i][j] = aug[i][n + j];
        }
        return inv;
    }

    // 離散時間代数リカッチ方程式を反復計算で解く: P = Q + AᵀPA - AᵀPB(R + BᵀPB)⁻¹BᵀPA
    public static double[][] SolveDare(double[][] a, double[][] b, double[][] q, double[][] r,
        int iterations = 500, double tol = 1e-12)
    {
        var p = q.Select(row => row.ToArray()).ToArray();
        var at = MatTranspose(a);
        var bt = MatTranspose(b);
        for (int iter = 0; iter < iterations; iter++)
        {
            var pa = MatMul(p, a);
            var ptb = MatMul(p, b);
            var s = MatAdd(r, MatMul(bt, ptb));
            var sInv = MatInverse(s);
            var gainTerm = MatMul(MatMul(MatMul(at, ptb), sInv), MatMul(bt, pa));
            var pNext = MatSub(MatAdd(q, MatMul(at, pa)), gainTerm);
            double diff = 0;
            for (int i = 0; i < p.Length; i++)
                for (int j = 0; j < p[0].Length; j++) diff = Math.Max(diff, Math.Abs(pNext[i][j] - p[i][j]));
            p = pNext;
            if (diff < tol) break;
        }
        return p;
    }

    // 最適フィードバックゲイン K = (R + BᵀPB)⁻¹BᵀPA を計算する
    public static double[][] ComputeLqrGain(double[][] a, double[][] b, double[][] q, double[][] r)
    {
        var p = SolveDare(a, b, q, r);
        var bt = MatTranspose(b);
        var s = MatAdd(r, MatMul(bt, MatMul(p, b)));
        var sInv = MatInverse(s);
        return MatMul(MatMul(sInv, bt), MatMul(p, a));
    }
}
```
