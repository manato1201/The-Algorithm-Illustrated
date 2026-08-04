---
name: 主成分分析(PCA)
category: 機械学習
subcategory: 教師なし学習
complexity: 'O(min(n²d, nd²))'
summary: データの分散が最大になる方向を新しい軸として、次元を削減しながら情報の損失を最小限に抑える。
---

## 概要

数百・数千の特徴量を持つ高次元データを、より少ない次元(2次元や3次元など)に圧縮しつつ、**元のデータが持つ情報(ばらつき)をできるだけ保つ**ための、次元削減の代表的な手法。1901年にKarl Pearsonが原型を考案した、統計学における古典的な技法でもある。データの可視化、ノイズ除去、計算コストの削減など、機械学習の前処理として幅広く使われている。

## 仕組み

「情報量が多い」ことを「データのばらつき(分散)が大きい」ことと捉えるのがPCAの基本発想。

1. データを各特徴量の平均が0になるように中心化する
2. データの分散共分散行列(各特徴量同士がどれだけ一緒に変動するかを表す行列)を計算する
3. その行列の**固有ベクトルと固有値**を求める。固有ベクトルは「データが最もばらついている方向」を表し、対応する固有値はその方向の分散の大きさを表す
4. 固有値が大きい順に固有ベクトルを並べる。これらが「第1主成分」「第2主成分」…と呼ばれる新しい軸になる
5. 上位k個の主成分だけを使ってデータを新しい座標系に射影すれば、元の次元よりずっと少ないk次元で、**元のデータの分散(情報量)を最大限保った**圧縮表現が得られる

「データが最もばらついている方向を優先的に残す」ことで、視覚的にもデータの構造をよく捉えた低次元表現が得られるのが特徴。

## 特性・トレードオフ

- **計算量**: O(min(n²d, nd²))(n=データ数、d=元の次元数)。特異値分解(SVD)という別の行列分解手法を使っても同様の結果を効率的に得られる
- **線形変換であることの限界**: PCAはデータの直線的な(線形な)構造しか捉えられない。渦巻き状やS字型のように、非線形な構造を持つデータには、t-SNEやUMAPのような非線形の次元削減手法の方が適していることが多い
- **解釈の難しさ**: 主成分は元の特徴量の線形結合(重み付き和)であるため、「第1主成分とは具体的に何を表しているか」を直感的に説明するのが難しいことがある
- **使いどころ**: 高次元データの可視化(数百次元のデータを2次元・3次元に落として散布図にする)、機械学習モデルの学習前の次元削減(計算コストの削減、過学習の抑制)、画像圧縮、顔認識における特徴抽出(固有顔という古典的な応用例)など

## 実装例

分散共分散行列の固有ベクトルをJacobi法で求め、第1主成分方向にデータを射影する。`y = x`の直線上に(小さなノイズを加えて)分布するデータに対して、第1主成分の方向がほぼ`(1/√2, 1/√2)`に一致し、第1固有値が第2固有値を大きく上回ることを検証する。

```python
import math


def mean_center(data: list[list[float]]) -> tuple[list[list[float]], list[float]]:
    n, d = len(data), len(data[0])
    means = [sum(row[j] for row in data) / n for j in range(d)]
    centered = [[row[j] - means[j] for j in range(d)] for row in data]
    return centered, means


def covariance_matrix(centered: list[list[float]]) -> list[list[float]]:
    n, d = len(centered), len(centered[0])
    return [[sum(row[i] * row[j] for row in centered) / (n - 1) for j in range(d)] for i in range(d)]


def jacobi_eigen(matrix: list[list[float]], iterations: int = 100) -> tuple[list[float], list[list[float]]]:
    n = len(matrix)
    a = [row[:] for row in matrix]
    v = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]

    for _ in range(iterations):
        # 最大の非対角要素を見つけて回転で消去する
        p, q, max_val = 0, 1, 0.0
        for i in range(n):
            for j in range(i + 1, n):
                if abs(a[i][j]) > max_val:
                    max_val, p, q = abs(a[i][j]), i, j
        if max_val < 1e-12:
            break
        theta = math.pi / 4 if a[p][p] == a[q][q] else 0.5 * math.atan2(2 * a[p][q], a[p][p] - a[q][q])
        c, s = math.cos(theta), math.sin(theta)
        app, aqq, apq = a[p][p], a[q][q], a[p][q]
        a[p][p] = c * c * app + s * s * aqq + 2 * s * c * apq
        a[q][q] = s * s * app + c * c * aqq - 2 * s * c * apq
        a[p][q] = a[q][p] = 0.0
        for i in range(n):
            if i != p and i != q:
                aip, aiq = a[i][p], a[i][q]
                a[i][p] = a[p][i] = c * aip + s * aiq
                a[i][q] = a[q][i] = -s * aip + c * aiq
        for i in range(n):
            vip, viq = v[i][p], v[i][q]
            v[i][p] = c * vip + s * viq
            v[i][q] = -s * vip + c * viq

    eigenvalues = [a[i][i] for i in range(n)]
    eigenvectors = [[v[i][j] for i in range(n)] for j in range(n)]  # eigenvectors[j]がj番目の固有ベクトル
    return eigenvalues, eigenvectors


def pca(data: list[list[float]], k: int) -> tuple[list[list[float]], list[float], list[list[float]]]:
    centered, _ = mean_center(data)
    cov = covariance_matrix(centered)
    eigenvalues, eigenvectors = jacobi_eigen(cov)
    order = sorted(range(len(eigenvalues)), key=lambda i: -eigenvalues[i])
    top_k_vectors = [eigenvectors[i] for i in order[:k]]
    projected = [[sum(row[d] * vec[d] for d in range(len(row))) for vec in top_k_vectors] for row in centered]
    return projected, [eigenvalues[i] for i in order[:k]], top_k_vectors
```

```typescript
function meanCenter(data: number[][]): { centered: number[][]; means: number[] } {
  const n = data.length;
  const d = data[0].length;
  const means = Array.from({ length: d }, (_, j) => data.reduce((s, row) => s + row[j], 0) / n);
  const centered = data.map((row) => row.map((v, j) => v - means[j]));
  return { centered, means };
}

function covarianceMatrix(centered: number[][]): number[][] {
  const n = centered.length;
  const d = centered[0].length;
  return Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => centered.reduce((s, row) => s + row[i] * row[j], 0) / (n - 1)),
  );
}

function jacobiEigen(matrix: number[][], iterations = 100): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  const v = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  for (let iter = 0; iter < iterations; iter++) {
    // 最大の非対角要素を見つけて回転で消去する
    let [p, q, maxVal] = [0, 1, 0];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(a[i][j]) > maxVal) [maxVal, p, q] = [Math.abs(a[i][j]), i, j];
      }
    }
    if (maxVal < 1e-12) break;
    const theta = a[p][p] === a[q][q] ? Math.PI / 4 : 0.5 * Math.atan2(2 * a[p][q], a[p][p] - a[q][q]);
    const [c, s] = [Math.cos(theta), Math.sin(theta)];
    const [app, aqq, apq] = [a[p][p], a[q][q], a[p][q]];
    a[p][p] = c * c * app + s * s * aqq + 2 * s * c * apq;
    a[q][q] = s * s * app + c * c * aqq - 2 * s * c * apq;
    a[p][q] = a[q][p] = 0;
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const [aip, aiq] = [a[i][p], a[i][q]];
        a[i][p] = a[p][i] = c * aip + s * aiq;
        a[i][q] = a[q][i] = -s * aip + c * aiq;
      }
    }
    for (let i = 0; i < n; i++) {
      const [vip, viq] = [v[i][p], v[i][q]];
      v[i][p] = c * vip + s * viq;
      v[i][q] = -s * vip + c * viq;
    }
  }

  const eigenvalues = Array.from({ length: n }, (_, i) => a[i][i]);
  const eigenvectors = Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, i) => v[i][j]));
  return { eigenvalues, eigenvectors };
}

function pca(data: number[][], k: number): { projected: number[][]; eigenvalues: number[]; vectors: number[][] } {
  const { centered } = meanCenter(data);
  const cov = covarianceMatrix(centered);
  const { eigenvalues, eigenvectors } = jacobiEigen(cov);
  const order = eigenvalues.map((_, i) => i).sort((x, y) => eigenvalues[y] - eigenvalues[x]);
  const topKVectors = order.slice(0, k).map((i) => eigenvectors[i]);
  const projected = centered.map((row) => topKVectors.map((vec) => row.reduce((s, v, d) => s + v * vec[d], 0)));
  return { projected, eigenvalues: order.slice(0, k).map((i) => eigenvalues[i]), vectors: topKVectors };
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <numeric>

std::pair<std::vector<std::vector<double>>, std::vector<double>> meanCenter(const std::vector<std::vector<double>>& data) {
    int n = static_cast<int>(data.size()), d = static_cast<int>(data[0].size());
    std::vector<double> means(d, 0.0);
    for (int j = 0; j < d; j++) {
        for (const auto& row : data) means[j] += row[j];
        means[j] /= n;
    }
    std::vector<std::vector<double>> centered(n, std::vector<double>(d));
    for (int i = 0; i < n; i++) for (int j = 0; j < d; j++) centered[i][j] = data[i][j] - means[j];
    return {centered, means};
}

std::vector<std::vector<double>> covarianceMatrix(const std::vector<std::vector<double>>& centered) {
    int n = static_cast<int>(centered.size()), d = static_cast<int>(centered[0].size());
    std::vector<std::vector<double>> cov(d, std::vector<double>(d, 0.0));
    for (int i = 0; i < d; i++) {
        for (int j = 0; j < d; j++) {
            double s = 0.0;
            for (const auto& row : centered) s += row[i] * row[j];
            cov[i][j] = s / (n - 1);
        }
    }
    return cov;
}

// Jacobi法: 対称行列の固有値・固有ベクトルを回転操作の繰り返しで求める
std::pair<std::vector<double>, std::vector<std::vector<double>>> jacobiEigen(
    std::vector<std::vector<double>> a, int iterations = 100) {
    int n = static_cast<int>(a.size());
    std::vector<std::vector<double>> v(n, std::vector<double>(n, 0.0));
    for (int i = 0; i < n; i++) v[i][i] = 1.0;

    for (int iter = 0; iter < iterations; iter++) {
        int p = 0, q = 1;
        double maxVal = 0.0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                if (std::abs(a[i][j]) > maxVal) { maxVal = std::abs(a[i][j]); p = i; q = j; }
        if (maxVal < 1e-12) break;

        double theta = (a[p][p] == a[q][q]) ? M_PI / 4 : 0.5 * std::atan2(2 * a[p][q], a[p][p] - a[q][q]);
        double c = std::cos(theta), s = std::sin(theta);
        double app = a[p][p], aqq = a[q][q], apq = a[p][q];
        a[p][p] = c * c * app + s * s * aqq + 2 * s * c * apq;
        a[q][q] = s * s * app + c * c * aqq - 2 * s * c * apq;
        a[p][q] = a[q][p] = 0.0;
        for (int i = 0; i < n; i++) {
            if (i != p && i != q) {
                double aip = a[i][p], aiq = a[i][q];
                a[i][p] = a[p][i] = c * aip + s * aiq;
                a[i][q] = a[q][i] = -s * aip + c * aiq;
            }
        }
        for (int i = 0; i < n; i++) {
            double vip = v[i][p], viq = v[i][q];
            v[i][p] = c * vip + s * viq;
            v[i][q] = -s * vip + c * viq;
        }
    }

    std::vector<double> eigenvalues(n);
    for (int i = 0; i < n; i++) eigenvalues[i] = a[i][i];
    std::vector<std::vector<double>> eigenvectors(n, std::vector<double>(n));
    for (int j = 0; j < n; j++) for (int i = 0; i < n; i++) eigenvectors[j][i] = v[i][j];
    return {eigenvalues, eigenvectors};
}
```

```rust
fn mean_center(data: &[Vec<f64>]) -> (Vec<Vec<f64>>, Vec<f64>) {
    let n = data.len();
    let d = data[0].len();
    let means: Vec<f64> = (0..d).map(|j| data.iter().map(|row| row[j]).sum::<f64>() / n as f64).collect();
    let centered: Vec<Vec<f64>> = data.iter().map(|row| row.iter().zip(&means).map(|(v, m)| v - m).collect()).collect();
    (centered, means)
}

fn covariance_matrix(centered: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let n = centered.len();
    let d = centered[0].len();
    (0..d)
        .map(|i| {
            (0..d)
                .map(|j| centered.iter().map(|row| row[i] * row[j]).sum::<f64>() / (n - 1) as f64)
                .collect()
        })
        .collect()
}

// Jacobi法: 対称行列の固有値・固有ベクトルを回転操作の繰り返しで求める
fn jacobi_eigen(matrix: &[Vec<f64>], iterations: usize) -> (Vec<f64>, Vec<Vec<f64>>) {
    let n = matrix.len();
    let mut a: Vec<Vec<f64>> = matrix.to_vec();
    let mut v: Vec<Vec<f64>> = (0..n).map(|i| (0..n).map(|j| if i == j { 1.0 } else { 0.0 }).collect()).collect();

    for _ in 0..iterations {
        let (mut p, mut q, mut max_val) = (0usize, 1usize, 0.0_f64);
        for i in 0..n {
            for j in (i + 1)..n {
                if a[i][j].abs() > max_val {
                    max_val = a[i][j].abs();
                    p = i;
                    q = j;
                }
            }
        }
        if max_val < 1e-12 {
            break;
        }
        let theta = if a[p][p] == a[q][q] {
            std::f64::consts::FRAC_PI_4
        } else {
            0.5 * (2.0 * a[p][q]).atan2(a[p][p] - a[q][q])
        };
        let (c, s) = (theta.cos(), theta.sin());
        let (app, aqq, apq) = (a[p][p], a[q][q], a[p][q]);
        a[p][p] = c * c * app + s * s * aqq + 2.0 * s * c * apq;
        a[q][q] = s * s * app + c * c * aqq - 2.0 * s * c * apq;
        a[p][q] = 0.0;
        a[q][p] = 0.0;
        for i in 0..n {
            if i != p && i != q {
                let (aip, aiq) = (a[i][p], a[i][q]);
                a[i][p] = c * aip + s * aiq;
                a[p][i] = a[i][p];
                a[i][q] = -s * aip + c * aiq;
                a[q][i] = a[i][q];
            }
        }
        for i in 0..n {
            let (vip, viq) = (v[i][p], v[i][q]);
            v[i][p] = c * vip + s * viq;
            v[i][q] = -s * vip + c * viq;
        }
    }

    let eigenvalues: Vec<f64> = (0..n).map(|i| a[i][i]).collect();
    let eigenvectors: Vec<Vec<f64>> = (0..n).map(|j| (0..n).map(|i| v[i][j]).collect()).collect();
    (eigenvalues, eigenvectors)
}
```

```csharp
static (double[][] Centered, double[] Means) MeanCenter(double[][] data)
{
    int n = data.Length, d = data[0].Length;
    var means = new double[d];
    for (int j = 0; j < d; j++) means[j] = data.Sum(row => row[j]) / n;
    var centered = data.Select(row => row.Select((v, j) => v - means[j]).ToArray()).ToArray();
    return (centered, means);
}

static double[][] CovarianceMatrix(double[][] centered)
{
    int n = centered.Length, d = centered[0].Length;
    var cov = new double[d][];
    for (int i = 0; i < d; i++)
    {
        cov[i] = new double[d];
        for (int j = 0; j < d; j++)
            cov[i][j] = centered.Sum(row => row[i] * row[j]) / (n - 1);
    }
    return cov;
}

// Jacobi法: 対称行列の固有値・固有ベクトルを回転操作の繰り返しで求める
static (double[] Eigenvalues, double[][] Eigenvectors) JacobiEigen(double[][] matrix, int iterations = 100)
{
    int n = matrix.Length;
    var a = matrix.Select(row => (double[])row.Clone()).ToArray();
    var v = new double[n][];
    for (int i = 0; i < n; i++) { v[i] = new double[n]; v[i][i] = 1.0; }

    for (int iter = 0; iter < iterations; iter++)
    {
        int p = 0, q = 1;
        double maxVal = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                if (Math.Abs(a[i][j]) > maxVal) { maxVal = Math.Abs(a[i][j]); p = i; q = j; }
        if (maxVal < 1e-12) break;

        double theta = a[p][p] == a[q][q] ? Math.PI / 4 : 0.5 * Math.Atan2(2 * a[p][q], a[p][p] - a[q][q]);
        double c = Math.Cos(theta), s = Math.Sin(theta);
        double app = a[p][p], aqq = a[q][q], apq = a[p][q];
        a[p][p] = c * c * app + s * s * aqq + 2 * s * c * apq;
        a[q][q] = s * s * app + c * c * aqq - 2 * s * c * apq;
        a[p][q] = a[q][p] = 0;
        for (int i = 0; i < n; i++)
        {
            if (i != p && i != q)
            {
                double aip = a[i][p], aiq = a[i][q];
                a[i][p] = a[p][i] = c * aip + s * aiq;
                a[i][q] = a[q][i] = -s * aip + c * aiq;
            }
        }
        for (int i = 0; i < n; i++)
        {
            double vip = v[i][p], viq = v[i][q];
            v[i][p] = c * vip + s * viq;
            v[i][q] = -s * vip + c * viq;
        }
    }

    var eigenvalues = Enumerable.Range(0, n).Select(i => a[i][i]).ToArray();
    var eigenvectors = Enumerable.Range(0, n).Select(j => Enumerable.Range(0, n).Select(i => v[i][j]).ToArray()).ToArray();
    return (eigenvalues, eigenvectors);
}
```
