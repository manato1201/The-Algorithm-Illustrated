---
name: QR分解
category: 数値計算
subcategory: 線形代数計算
complexity: O(n³)(グラム・シュミット法またはハウスホルダー変換、n×n行列)
summary: 任意の行列を「直交行列Q」と「上三角行列R」の積に分解する手法で、[LU分解](/algorithms/lu-decomposition)よりも数値的に安定しており、最小二乗法の求解や固有値計算の反復アルゴリズムの中核として使われる。
---

## 概要

[LU分解](/algorithms/lu-decomposition)は行列を下三角行列と上三角行列に分解するが、ピボット選択に注意しないと数値誤差が増幅されやすいという弱点がある。QR分解は、任意の行列`A`を「直交行列`Q`(列ベクトルが互いに直交し長さ1、`QᵀQ=I`という性質を持つ)」と「上三角行列`R`」の積`A=QR`に分解する。直交行列は掛けても長さや角度を変えない(数値的な誤差を増幅しない)という優れた性質を持つため、QR分解は[LU分解](/algorithms/lu-decomposition)よりも数値的に安定した行列分解として、[最小二乗法](/algorithms/least-squares)の求解や、行列の固有値を求める反復アルゴリズムの中核技術として広く使われている。

## 仕組み

1. `m×n`行列`A`(通常`m≥n`)の列ベクトルを`a₁, a₂, ..., aₙ`とする
2. **グラム・シュミット法による直交化**: `a₁`を正規化して`q₁`とする。`a₂`から`q₁`方向の成分を引き算して`q₁`と直交する成分を取り出し、それを正規化して`q₂`とする。以下同様に、`aₖ`から既に求めた`q₁,...,q_{k-1}`方向の成分を全て引き算してから正規化することで、順に`q₁,...,qₙ`という互いに直交する単位ベクトルの列を作る
3. こうして得られた`q₁,...,qₙ`を列とする行列が`Q`になる
4. `R`は`Q`と`A`の関係`R = QᵀA`から直接計算できる上三角行列になる(`Qᵀ`は`Q`の転置、直交行列なので`Qᵀ=Q⁻¹`が成り立つことを利用している)
5. 実務では素朴なグラム・シュミット法は数値誤差が蓄積しやすいため、ハウスホルダー変換(鏡映変換を繰り返して段階的に列を上三角化する、より数値的に安定した手法)を使うのが標準的

## 特性・トレードオフ

- **計算量**: グラム・シュミット法・ハウスホルダー変換のいずれも`n×n`行列に対して`O(n³)`——[LU分解](/algorithms/lu-decomposition)と同じオーダーだが、定数倍のコストとトレードオフに数値的な安定性を得ている
- **[最小二乗法](/algorithms/least-squares)の求解への応用**: 過剰決定系(方程式の数が未知数より多い)の最小二乗解を求める際、正規方程式`AᵀAx=Aᵀb`を直接解くと`AᵀA`の条件数が悪化し誤差が拡大しやすいが、`A=QR`と分解すれば`Rx=Qᵀb`という上三角の連立方程式を後退代入するだけで数値的に安定して解ける——実務のライブラリ(LAPACK等)が最小二乗法の内部でQR分解を採用する主な理由
- **固有値計算への応用(QRアルゴリズム)**: 行列`A`にQR分解を繰り返し適用し(`A=QR`と分解した後`RQ`を計算し、それを新しい`A`として同じ操作を繰り返す)、収束させることで行列の固有値を求めるQRアルゴリズムは、実用的な固有値計算法の標準的な手法になっている
- **使いどころ**: 統計学における回帰分析の数値計算(最小二乗法の安定した求解)、コンピュータグラフィックスにおける正規直交基底の構築、行列の固有値・特異値分解の内部計算、信号処理におけるカルマンフィルタの数値実装([カルマンフィルタ](/algorithms/kalman-filter)の共分散更新を安定して計算するためにQR分解ベースの実装が使われることがある)

## 実装例

```python
import math


def qr_decomposition(a: list[list[float]]) -> tuple[list[list[float]], list[list[float]]]:
    """グラム・シュミット法によるQR分解。aはm×n行列(行のリスト)"""
    m = len(a)
    n = len(a[0])
    cols = [[a[i][j] for i in range(m)] for j in range(n)]
    q_cols: list[list[float]] = []
    r = [[0.0] * n for _ in range(n)]
    for j in range(n):
        v = cols[j][:]
        for i in range(j):
            r[i][j] = sum(q_cols[i][k] * cols[j][k] for k in range(m))
            v = [v[k] - r[i][j] * q_cols[i][k] for k in range(m)]
        r[j][j] = math.sqrt(sum(x * x for x in v))
        q_cols.append([x / r[j][j] for x in v])
    q = [[q_cols[j][i] for j in range(n)] for i in range(m)]
    return q, r
```

```typescript
function qrDecomposition(a: number[][]): { q: number[][]; r: number[][] } {
  const m = a.length;
  const n = a[0].length;
  const cols = Array.from({ length: n }, (_, j) => a.map((row) => row[j]));
  const qCols: number[][] = [];
  const r: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    let v = [...cols[j]];
    for (let i = 0; i < j; i++) {
      let dot = 0;
      for (let k = 0; k < m; k++) dot += qCols[i][k] * cols[j][k];
      r[i][j] = dot;
      v = v.map((val, k) => val - r[i][j] * qCols[i][k]);
    }
    r[j][j] = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    qCols.push(v.map((x) => x / r[j][j]));
  }
  const q = Array.from({ length: m }, (_, i) => qCols.map((col) => col[i]));
  return { q, r };
}
```

```cpp
#include <vector>
#include <cmath>

std::pair<std::vector<std::vector<double>>, std::vector<std::vector<double>>> qrDecomposition(
    const std::vector<std::vector<double>>& a) {
    int m = static_cast<int>(a.size());
    int n = static_cast<int>(a[0].size());
    std::vector<std::vector<double>> cols(n, std::vector<double>(m));
    for (int j = 0; j < n; j++)
        for (int i = 0; i < m; i++) cols[j][i] = a[i][j];

    std::vector<std::vector<double>> qCols;
    std::vector<std::vector<double>> r(n, std::vector<double>(n, 0.0));
    for (int j = 0; j < n; j++) {
        std::vector<double> v = cols[j];
        for (int i = 0; i < j; i++) {
            double dot = 0.0;
            for (int k = 0; k < m; k++) dot += qCols[i][k] * cols[j][k];
            r[i][j] = dot;
            for (int k = 0; k < m; k++) v[k] -= r[i][j] * qCols[i][k];
        }
        double norm = 0.0;
        for (double x : v) norm += x * x;
        r[j][j] = std::sqrt(norm);
        for (double& x : v) x /= r[j][j];
        qCols.push_back(v);
    }
    std::vector<std::vector<double>> q(m, std::vector<double>(n));
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++) q[i][j] = qCols[j][i];
    return {q, r};
}
```

```rust
fn qr_decomposition(a: &[Vec<f64>]) -> (Vec<Vec<f64>>, Vec<Vec<f64>>) {
    let m = a.len();
    let n = a[0].len();
    let cols: Vec<Vec<f64>> = (0..n).map(|j| (0..m).map(|i| a[i][j]).collect()).collect();

    let mut q_cols: Vec<Vec<f64>> = Vec::new();
    let mut r = vec![vec![0.0; n]; n];
    for j in 0..n {
        let mut v = cols[j].clone();
        for i in 0..j {
            let dot: f64 = (0..m).map(|k| q_cols[i][k] * cols[j][k]).sum();
            r[i][j] = dot;
            for k in 0..m {
                v[k] -= r[i][j] * q_cols[i][k];
            }
        }
        let norm = v.iter().map(|x| x * x).sum::<f64>().sqrt();
        r[j][j] = norm;
        for x in v.iter_mut() {
            *x /= norm;
        }
        q_cols.push(v);
    }
    let mut q = vec![vec![0.0; n]; m];
    for i in 0..m {
        for j in 0..n {
            q[i][j] = q_cols[j][i];
        }
    }
    (q, r)
}
```

```csharp
static (double[][] Q, double[][] R) QrDecomposition(double[][] a)
{
    int m = a.Length;
    int n = a[0].Length;
    var cols = new double[n][];
    for (int j = 0; j < n; j++)
    {
        cols[j] = new double[m];
        for (int i = 0; i < m; i++) cols[j][i] = a[i][j];
    }
    var qCols = new List<double[]>();
    var r = new double[n][];
    for (int i = 0; i < n; i++) r[i] = new double[n];
    for (int j = 0; j < n; j++)
    {
        var v = (double[])cols[j].Clone();
        for (int i = 0; i < j; i++)
        {
            double dot = 0;
            for (int k = 0; k < m; k++) dot += qCols[i][k] * cols[j][k];
            r[i][j] = dot;
            for (int k = 0; k < m; k++) v[k] -= r[i][j] * qCols[i][k];
        }
        r[j][j] = Math.Sqrt(v.Sum(x => x * x));
        qCols.Add(v.Select(x => x / r[j][j]).ToArray());
    }
    var q = new double[m][];
    for (int i = 0; i < m; i++) q[i] = qCols.Select(col => col[i]).ToArray();
    return (q, r);
}
```
