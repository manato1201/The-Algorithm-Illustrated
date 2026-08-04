---
name: 潜在意味解析(LSA)
category: 自然言語処理
subcategory: 言語モデル・分散表現
complexity: O(min(m,n) × m × n)(m×n語×文書行列の特異値分解、素朴な実装)
summary: 単語×文書の巨大な出現頻度行列を低ランクに圧縮することで、同義語や多義語を吸収した「潜在的な意味の次元」を発見する次元削減ベースの自然言語処理手法。
---

## 概要

[TF-IDF](/algorithms/tf-idf)のような単語の出現頻度に基づく文書表現は、「car」と「automobile」のような同義語を全く別の次元として扱ってしまい、意味的なつながりを捉えられない。1990年に提案された潜在意味解析(LSA)は、単語×文書の出現頻度行列に対して[主成分分析(PCA)](/algorithms/pca)に近い次元削減の考え方を適用することで、表面上の単語の違いを超えた「潜在的な意味の次元(トピック)」を発見し、同義語を自動的に同じ意味空間の近い位置にまとめ上げる。

## 仕組み

1. コーパス中の全文書について、単語×文書の行列`A`(各要素は[TF-IDF](/algorithms/tf-idf)スコアなど、単語`i`が文書`j`にどれだけ重要に出現するかを表す)を構築する
2. この行列`A`に**特異値分解(SVD)**を適用する: `A ≈ U Σ Vᵀ`。`U`は単語を潜在的な意味次元で表現した行列、`Σ`は各意味次元の重要度(特異値)を対角に並べた行列、`Vᵀ`は文書を同じ潜在的な意味次元で表現した行列になる(特異値分解自体は[べき乗法](/algorithms/power-iteration)を`AAᵀ`や`AᵀA`に適用することで固有値・固有ベクトルとして計算できる、[主成分分析(PCA)](/algorithms/pca)の計算と同じ数学的基盤を持つ)
3. 特異値の大きい順に上位`k`個だけを残し、残りを切り捨てる(低ランク近似)。この`k`が「潜在的な意味次元の数(トピック数)」に相当する
4. 切り捨てた低ランク近似`Aₖ = Uₖ Σₖ Vₖᵀ`を使うと、単語や文書を`k`次元の潜在意味空間のベクトルとして表現できる。この空間では、表面上の単語の一致がなくても、同じ文脈でよく使われる同義語同士は近い位置に配置される

## 特性・トレードオフ

- **計算量**: 特異値分解は`m×n`行列に対して素朴には`O(min(m,n) × m × n)`程度のコストがかかり、単語数・文書数が非常に大きいコーパスでは計算負荷が大きい。実用にはスパース行列に適した反復解法(疎行列版のべき乗法など)を使う
- **同義語・多義語への対処**: 単語の共起パターンの統計的な構造から潜在的な意味次元を発見するため、「car」と「automobile」のような同義語をある程度自動的に同じ意味的な位置に配置できる。ただし多義語(bankが「銀行」と「土手」の両方の意味を持つ場合)は、複数の意味を1つのベクトルに混ぜてしまう限界もある
- **[Word2Vec(Skip-gram)](/algorithms/word2vec-skip-gram)との関係**: LSAは文書全体の共起行列を一括で低ランク近似する「行列分解ベース」の手法、Word2Vecは局所的な文脈窓での予測タスクを繰り返し学習する「予測ベース」の手法という違いがあるが、どちらも「単語の意味を低次元の連続ベクトルとして表現する」という目的は共通しており、理論的な関連性が研究されている
- **使いどころ**: 文書検索における意味的類似度計算(表記ゆれや同義語を超えた検索)、トピックモデリングの前段、スペルの揺れや言い換えに頑健な文書分類。より確率的に洗練されたトピックモデル(LDA: 潜在ディリクレ配分法)の前身としても位置づけられる

## 実装例

単語×文書行列`A`の特異値分解を、`AAᵀ`に対する[べき乗法](/algorithms/power-iteration)とデフレーション(見つかった成分を取り除いて次の成分を求める)の繰り返しで計算する。

```python
import math
import random

Matrix = list[list[float]]

def _matvec(a: Matrix, v: list[float]) -> list[float]:
    return [sum(a[i][j] * v[j] for j in range(len(v))) for i in range(len(a))]

def _transpose(a: Matrix) -> Matrix:
    rows, cols = len(a), len(a[0])
    return [[a[i][j] for i in range(rows)] for j in range(cols)]

def _matmul(a: Matrix, b: Matrix) -> Matrix:
    n, m, p = len(a), len(b), len(b[0])
    return [[sum(a[i][k] * b[k][j] for k in range(m)) for j in range(p)] for i in range(n)]

def _norm(v: list[float]) -> float:
    return math.sqrt(sum(x * x for x in v))

def _power_iteration(a: Matrix, iterations: int = 200) -> tuple[float, list[float]]:
    """対称行列aの最大固有値と対応する固有ベクトルをべき乗法で求める。"""
    n = len(a)
    v = [random.random() for _ in range(n)]
    v = [x / _norm(v) for x in v]
    for _ in range(iterations):
        w = _matvec(a, v)
        w_norm = _norm(w)
        if w_norm < 1e-15:
            break
        v = [x / w_norm for x in w]
    eigenvalue = sum(vi * wi for vi, wi in zip(v, _matvec(a, v)))
    return eigenvalue, v

def _deflate(a: Matrix, eigenvalue: float, eigenvector: list[float]) -> Matrix:
    """見つかった固有成分を取り除き、次に大きい固有ベクトルをべき乗法で求められるようにする。"""
    n = len(a)
    return [
        [a[i][j] - eigenvalue * eigenvector[i] * eigenvector[j] for j in range(n)]
        for i in range(n)
    ]

def truncated_svd(a: Matrix, k: int, iterations: int = 300):
    """m×n行列aのランクk近似 a ≈ U_k Σ_k V_k^T を求める。戻り値はU, 特異値, V(各列が正規直交)。"""
    m, n = len(a), len(a[0])
    working = _matmul(a, _transpose(a))  # m×m 対称行列 AA^T
    u_cols: list[list[float]] = []
    singular_values: list[float] = []
    for _ in range(k):
        eigval, eigvec = _power_iteration(working, iterations)
        eigval = max(eigval, 0.0)
        singular_values.append(math.sqrt(eigval))
        u_cols.append(eigvec)
        working = _deflate(working, eigval, eigvec)

    at = _transpose(a)
    v_cols: list[list[float]] = []
    for sigma, u in zip(singular_values, u_cols):
        if sigma < 1e-10:
            v_cols.append([0.0] * n)
        else:
            v_cols.append([x / sigma for x in _matvec(at, u)])

    return u_cols, singular_values, v_cols
```

```typescript
type Matrix = number[][];

function matvec(a: Matrix, v: number[]): number[] {
  return a.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
}

function transpose(a: Matrix): Matrix {
  const rows = a.length,
    cols = a[0].length;
  const t: Matrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) t[j][i] = a[i][j];
  return t;
}

function matmul(a: Matrix, b: Matrix): Matrix {
  const n = a.length,
    m = b.length,
    p = b[0].length;
  const r: Matrix = Array.from({ length: n }, () => new Array(p).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let k = 0; k < m; k++) s += a[i][k] * b[k][j];
      r[i][j] = s;
    }
  return r;
}

function norm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

// 対称行列aの最大固有値と対応する固有ベクトルをべき乗法で求める
function powerIteration(a: Matrix, iterations = 200): [number, number[]] {
  const n = a.length;
  let v = Array.from({ length: n }, () => Math.random());
  const v0n = norm(v);
  v = v.map((x) => x / v0n);
  for (let i = 0; i < iterations; i++) {
    const w = matvec(a, v);
    const wn = norm(w);
    if (wn < 1e-15) break;
    v = w.map((x) => x / wn);
  }
  const av = matvec(a, v);
  const eigenvalue = v.reduce((s, x, i) => s + x * av[i], 0);
  return [eigenvalue, v];
}

// 見つかった固有成分を取り除き、次に大きい固有ベクトルをべき乗法で求められるようにする
function deflate(a: Matrix, eigenvalue: number, eigenvector: number[]): Matrix {
  const n = a.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => a[i][j] - eigenvalue * eigenvector[i] * eigenvector[j])
  );
}

// m×n行列aのランクk近似 a ≈ U_k Σ_k V_k^T を求める
function truncatedSvd(a: Matrix, k: number, iterations = 300): [Matrix, number[], Matrix] {
  const n = a[0].length;
  let working = matmul(a, transpose(a)); // m×m 対称行列 AA^T
  const uCols: number[][] = [];
  const singularValues: number[] = [];
  for (let c = 0; c < k; c++) {
    let [eigval, eigvec] = powerIteration(working, iterations);
    eigval = Math.max(eigval, 0);
    singularValues.push(Math.sqrt(eigval));
    uCols.push(eigvec);
    working = deflate(working, eigval, eigvec);
  }

  const at = transpose(a);
  const vCols: number[][] = [];
  for (let c = 0; c < k; c++) {
    const sigma = singularValues[c];
    vCols.push(sigma < 1e-10 ? new Array(n).fill(0) : matvec(at, uCols[c]).map((x) => x / sigma));
  }

  return [uCols, singularValues, vCols];
}
```

```cpp
#include <vector>
#include <cmath>
#include <random>

using Matrix = std::vector<std::vector<double>>;

std::vector<double> matvec(const Matrix& a, const std::vector<double>& v) {
    std::vector<double> r(a.size(), 0.0);
    for (size_t i = 0; i < a.size(); i++)
        for (size_t j = 0; j < v.size(); j++) r[i] += a[i][j] * v[j];
    return r;
}

Matrix transpose(const Matrix& a) {
    size_t rows = a.size(), cols = a[0].size();
    Matrix t(cols, std::vector<double>(rows, 0.0));
    for (size_t i = 0; i < rows; i++)
        for (size_t j = 0; j < cols; j++) t[j][i] = a[i][j];
    return t;
}

Matrix matmul(const Matrix& a, const Matrix& b) {
    size_t n = a.size(), m = b.size(), p = b[0].size();
    Matrix r(n, std::vector<double>(p, 0.0));
    for (size_t i = 0; i < n; i++)
        for (size_t j = 0; j < p; j++)
            for (size_t k = 0; k < m; k++) r[i][j] += a[i][k] * b[k][j];
    return r;
}

double vnorm(const std::vector<double>& v) {
    double s = 0;
    for (double x : v) s += x * x;
    return std::sqrt(s);
}

// 対称行列aの最大固有値と対応する固有ベクトルをべき乗法で求める
std::pair<double, std::vector<double>> powerIteration(const Matrix& a, int iterations = 200) {
    size_t n = a.size();
    std::mt19937 rng(42);
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    std::vector<double> v(n);
    for (auto& x : v) x = dist(rng);
    double v0n = vnorm(v);
    for (auto& x : v) x /= v0n;

    for (int i = 0; i < iterations; i++) {
        auto w = matvec(a, v);
        double wn = vnorm(w);
        if (wn < 1e-15) break;
        for (auto& x : w) x /= wn;
        v = w;
    }
    auto av = matvec(a, v);
    double eigenvalue = 0.0;
    for (size_t i = 0; i < v.size(); i++) eigenvalue += v[i] * av[i];
    return {eigenvalue, v};
}

// 見つかった固有成分を取り除き、次に大きい固有ベクトルをべき乗法で求められるようにする
Matrix deflate(const Matrix& a, double eigenvalue, const std::vector<double>& eigenvector) {
    size_t n = a.size();
    Matrix r(n, std::vector<double>(n, 0.0));
    for (size_t i = 0; i < n; i++)
        for (size_t j = 0; j < n; j++)
            r[i][j] = a[i][j] - eigenvalue * eigenvector[i] * eigenvector[j];
    return r;
}

// m×n行列aのランクk近似 a ≈ U_k Σ_k V_k^T を求める
std::tuple<Matrix, std::vector<double>, Matrix> truncatedSvd(const Matrix& a, int k, int iterations = 300) {
    size_t n = a[0].size();
    Matrix working = matmul(a, transpose(a)); // m×m 対称行列 AA^T
    Matrix uCols;
    std::vector<double> singularValues;
    for (int c = 0; c < k; c++) {
        auto [eigval, eigvec] = powerIteration(working, iterations);
        eigval = std::max(eigval, 0.0);
        singularValues.push_back(std::sqrt(eigval));
        uCols.push_back(eigvec);
        working = deflate(working, eigval, eigvec);
    }

    Matrix at = transpose(a);
    Matrix vCols;
    for (int c = 0; c < k; c++) {
        double sigma = singularValues[c];
        if (sigma < 1e-10) {
            vCols.push_back(std::vector<double>(n, 0.0));
        } else {
            auto v = matvec(at, uCols[c]);
            for (auto& x : v) x /= sigma;
            vCols.push_back(v);
        }
    }
    return {uCols, singularValues, vCols};
}
```

```rust
type Matrix = Vec<Vec<f64>>;

fn matvec(a: &Matrix, v: &[f64]) -> Vec<f64> {
    a.iter().map(|row| row.iter().zip(v).map(|(x, y)| x * y).sum()).collect()
}

fn transpose(a: &Matrix) -> Matrix {
    let rows = a.len();
    let cols = a[0].len();
    (0..cols).map(|j| (0..rows).map(|i| a[i][j]).collect()).collect()
}

fn matmul(a: &Matrix, b: &Matrix) -> Matrix {
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

fn vnorm(v: &[f64]) -> f64 {
    v.iter().map(|x| x * x).sum::<f64>().sqrt()
}

// 対称行列aの最大固有値と対応する固有ベクトルをべき乗法で求める(初期ベクトルは呼び出し側が渡す)
fn power_iteration(a: &Matrix, mut v: Vec<f64>, iterations: usize) -> (f64, Vec<f64>) {
    let v0n = vnorm(&v);
    for x in v.iter_mut() {
        *x /= v0n;
    }
    for _ in 0..iterations {
        let w = matvec(a, &v);
        let wn = vnorm(&w);
        if wn < 1e-15 {
            break;
        }
        v = w.iter().map(|x| x / wn).collect();
    }
    let av = matvec(a, &v);
    let eigenvalue: f64 = v.iter().zip(av.iter()).map(|(x, y)| x * y).sum();
    (eigenvalue, v)
}

// 見つかった固有成分を取り除き、次に大きい固有ベクトルをべき乗法で求められるようにする
fn deflate(a: &Matrix, eigenvalue: f64, eigenvector: &[f64]) -> Matrix {
    let n = a.len();
    (0..n)
        .map(|i| (0..n).map(|j| a[i][j] - eigenvalue * eigenvector[i] * eigenvector[j]).collect())
        .collect()
}

// m×n行列aのランクk近似 a ≈ U_k Σ_k V_k^T を求める(initial_vecsは各成分の初期ベクトル)
fn truncated_svd(a: &Matrix, k: usize, iterations: usize, initial_vecs: &[Vec<f64>]) -> (Matrix, Vec<f64>, Matrix) {
    let n = a[0].len();
    let mut working = matmul(a, &transpose(a)); // m×m 対称行列 AA^T
    let mut u_cols: Matrix = Vec::new();
    let mut singular_values: Vec<f64> = Vec::new();
    for c in 0..k {
        let (mut eigval, eigvec) = power_iteration(&working, initial_vecs[c].clone(), iterations);
        eigval = eigval.max(0.0);
        singular_values.push(eigval.sqrt());
        working = deflate(&working, eigval, &eigvec);
        u_cols.push(eigvec);
    }

    let at = transpose(a);
    let mut v_cols: Matrix = Vec::new();
    for c in 0..k {
        let sigma = singular_values[c];
        if sigma < 1e-10 {
            v_cols.push(vec![0.0; n]);
        } else {
            let v = matvec(&at, &u_cols[c]);
            v_cols.push(v.iter().map(|x| x / sigma).collect());
        }
    }
    (u_cols, singular_values, v_cols)
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

static class Lsa
{
    static double[] MatVec(double[][] a, double[] v)
    {
        var r = new double[a.Length];
        for (int i = 0; i < a.Length; i++)
            for (int j = 0; j < v.Length; j++) r[i] += a[i][j] * v[j];
        return r;
    }

    static double[][] Transpose(double[][] a)
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

    static double VNorm(double[] v) => Math.Sqrt(v.Sum(x => x * x));

    // 対称行列aの最大固有値と対応する固有ベクトルをべき乗法で求める
    static (double, double[]) PowerIteration(double[][] a, double[] v, int iterations = 200)
    {
        double v0n = VNorm(v);
        v = v.Select(x => x / v0n).ToArray();
        for (int i = 0; i < iterations; i++)
        {
            var w = MatVec(a, v);
            double wn = VNorm(w);
            if (wn < 1e-15) break;
            v = w.Select(x => x / wn).ToArray();
        }
        var av = MatVec(a, v);
        double eigenvalue = v.Zip(av, (x, y) => x * y).Sum();
        return (eigenvalue, v);
    }

    // 見つかった固有成分を取り除き、次に大きい固有ベクトルをべき乗法で求められるようにする
    static double[][] Deflate(double[][] a, double eigenvalue, double[] eigenvector)
    {
        int n = a.Length;
        var r = new double[n][];
        for (int i = 0; i < n; i++)
        {
            r[i] = new double[n];
            for (int j = 0; j < n; j++)
                r[i][j] = a[i][j] - eigenvalue * eigenvector[i] * eigenvector[j];
        }
        return r;
    }

    // m×n行列aのランクk近似 a ≈ U_k Σ_k V_k^T を求める(initialVecsは各成分の初期ベクトル)
    public static (double[][] U, double[] S, double[][] V) TruncatedSvd(
        double[][] a, int k, double[][] initialVecs, int iterations = 300)
    {
        int n = a[0].Length;
        var working = MatMul(a, Transpose(a)); // m×m 対称行列 AA^T
        var uCols = new List<double[]>();
        var singularValues = new List<double>();
        for (int c = 0; c < k; c++)
        {
            var (eigvalRaw, eigvec) = PowerIteration(working, initialVecs[c], iterations);
            double eigval = Math.Max(eigvalRaw, 0.0);
            singularValues.Add(Math.Sqrt(eigval));
            working = Deflate(working, eigval, eigvec);
            uCols.Add(eigvec);
        }

        var at = Transpose(a);
        var vCols = new List<double[]>();
        for (int c = 0; c < k; c++)
        {
            double sigma = singularValues[c];
            if (sigma < 1e-10) vCols.Add(new double[n]);
            else vCols.Add(MatVec(at, uCols[c]).Select(x => x / sigma).ToArray());
        }
        return (uCols.ToArray(), singularValues.ToArray(), vCols.ToArray());
    }
}
```
