---
name: シンプレックス法
category: 最適化・確率的手法
subcategory: 厳密最適化
complexity: O(問題依存、実用上高速)
summary: 線形計画問題の実行可能領域(多面体)の頂点を辿りながら最適解を探す。
---

## 概要

「複数の一次不等式の制約のもとで、ある一次式の値を最大化(または最小化)したい」という線形計画問題を解く、1947年にジョージ・ダンツィーグが考案した古典的手法。20世紀で最も重要なアルゴリズムのひとつに数えられ、生産計画・物流・経済学など、限られた資源をどう配分するかという最適化問題の根幹を長年支え続けている。

## 仕組み

線形計画問題の制約条件は、幾何学的には**多面体(実行可能領域)**として表現できる。この多面体のどこかの**頂点**に、必ず最適解が存在する、という重要な性質が理論の出発点になる(制約が全て一次式であるため、目的関数の最適値は多面体の"角"でしか達成されない)。

1. 実行可能領域の、ある頂点(初期実行可能解)から出発する
2. その頂点に隣接する頂点(多面体の辺でつながった頂点)を見て、**目的関数の値がより良くなる方向があれば**、そちらの頂点へ移動する
3. これを繰り返し、**どの隣接頂点に移動しても目的関数が改善しなくなったら**、そこが最適解であると確定する(線形計画問題の性質上、これは局所最適ではなく必ず大域最適になることが保証される)

「多面体の表面を、頂点から頂点へ、常に改善する方向にだけ辿っていく」というシンプルな戦略でありながら、線形計画問題特有の性質(局所最適=大域最適)のおかげで、正しく最適解にたどり着ける。

## 特性・トレードオフ

- **計算量**: 理論上の最悪ケースは指数時間だが(意図的に作られた病的な入力でのみ発生)、**実務で現れるほとんどの問題では非常に高速**に動作することが経験的に知られている。この「理論と実務の乖離」自体が計算複雑性理論の興味深い研究対象になってきた
- **多項式時間アルゴリズムとの関係**: 内点法という、多面体の内部を通って最適解に近づく別のアプローチは、理論上の最悪ケースでも多項式時間が保証される。実務ではシンプレックス法と内点法が、問題の性質に応じて使い分けられる
- **双対性という深い理論**: 全ての線形計画問題には「双対問題」と呼ばれる対になる問題が存在し、両者の最適値が一致するという美しい理論(双対定理)があり、経済学における価格理論(シャドープライス)とも深く結びついている
- **使いどころ**: 生産計画(限られた原材料でどの製品をどれだけ作るか)、物流・輸送計画、栄養計画(予算内で栄養条件を満たす最安の食事)、金融ポートフォリオの最適化など、線形の制約下での資源配分問題全般

## 実装例

以下は「目的関数 `3x + 5y` を最大化、制約 `x ≤ 4`、`2y ≤ 12`、`3x + 2y ≤ 18`(x, y ≥ 0)」という具体例(最適解 `x=2, y=6`、目的関数値`36`)を解けるタブロー単体法の実装。

```python
import math


def simplex(c: list[float], a: list[list[float]], b: list[float]) -> tuple[list[float], float]:
    """maximize c^T x subject to a x <= b, x >= 0(標準形のタブロー単体法)"""
    m, n = len(a), len(c)
    tableau = [[0.0] * (n + m + 1) for _ in range(m + 1)]
    for i in range(m):
        tableau[i][:n] = a[i]
        tableau[i][n + i] = 1.0
        tableau[i][-1] = b[i]
    for j in range(n):
        tableau[m][j] = -c[j]

    def pivot(row: int, col: int) -> None:
        pv = tableau[row][col]
        tableau[row] = [v / pv for v in tableau[row]]
        for r in range(m + 1):
            if r != row and tableau[r][col] != 0:
                factor = tableau[r][col]
                tableau[r] = [tableau[r][k] - factor * tableau[row][k] for k in range(n + m + 1)]

    while min(tableau[m][:n + m]) < -1e-9:
        col = min(range(n + m), key=lambda j: tableau[m][j])
        best_row, best_ratio = -1, math.inf
        for i in range(m):
            if tableau[i][col] > 1e-9:
                ratio = tableau[i][-1] / tableau[i][col]
                if ratio < best_ratio:
                    best_ratio, best_row = ratio, i
        if best_row == -1:
            raise ValueError("unbounded")
        pivot(best_row, col)

    x = [0.0] * n
    for j in range(n):
        col_vals = [tableau[i][j] for i in range(m)]
        if col_vals.count(1.0) == 1 and all(v in (0.0, 1.0) for v in col_vals):
            x[j] = tableau[col_vals.index(1.0)][-1]
    return x, tableau[m][-1]
```

```typescript
function simplex(c: number[], a: number[][], b: number[]): [number[], number] {
  const m = a.length;
  const n = c.length;
  const tableau: number[][] = Array.from({ length: m + 1 }, () => new Array(n + m + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) tableau[i][j] = a[i][j];
    tableau[i][n + i] = 1;
    tableau[i][n + m] = b[i];
  }
  for (let j = 0; j < n; j++) tableau[m][j] = -c[j];

  const pivot = (row: number, col: number) => {
    const pv = tableau[row][col];
    for (let k = 0; k < n + m + 1; k++) tableau[row][k] /= pv;
    for (let r = 0; r <= m; r++) {
      if (r !== row && tableau[r][col] !== 0) {
        const factor = tableau[r][col];
        for (let k = 0; k < n + m + 1; k++) tableau[r][k] -= factor * tableau[row][k];
      }
    }
  };

  while (true) {
    let col = -1;
    let minVal = -1e-9;
    for (let j = 0; j < n + m; j++) {
      if (tableau[m][j] < minVal) {
        minVal = tableau[m][j];
        col = j;
      }
    }
    if (col === -1) break;

    let bestRow = -1;
    let bestRatio = Infinity;
    for (let i = 0; i < m; i++) {
      if (tableau[i][col] > 1e-9) {
        const ratio = tableau[i][n + m] / tableau[i][col];
        if (ratio < bestRatio) {
          bestRatio = ratio;
          bestRow = i;
        }
      }
    }
    if (bestRow === -1) throw new Error("unbounded");
    pivot(bestRow, col);
  }

  const x = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let onesCount = 0;
    let rowIdx = -1;
    let valid = true;
    for (let i = 0; i < m; i++) {
      const v = tableau[i][j];
      if (Math.abs(v - 1) < 1e-9) {
        onesCount++;
        rowIdx = i;
      } else if (Math.abs(v) > 1e-9) {
        valid = false;
      }
    }
    if (onesCount === 1 && valid) x[j] = tableau[rowIdx][n + m];
  }
  return [x, tableau[m][n + m]];
}
```

```cpp
#include <cmath>
#include <limits>
#include <stdexcept>
#include <utility>
#include <vector>

std::pair<std::vector<double>, double> simplex(
    const std::vector<double>& c, const std::vector<std::vector<double>>& a, const std::vector<double>& b) {
    int m = static_cast<int>(a.size());
    int n = static_cast<int>(c.size());
    std::vector<std::vector<double>> tableau(m + 1, std::vector<double>(n + m + 1, 0.0));
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) tableau[i][j] = a[i][j];
        tableau[i][n + i] = 1.0;
        tableau[i][n + m] = b[i];
    }
    for (int j = 0; j < n; j++) tableau[m][j] = -c[j];

    auto pivot = [&](int row, int col) {
        double pv = tableau[row][col];
        for (int k = 0; k < n + m + 1; k++) tableau[row][k] /= pv;
        for (int r = 0; r <= m; r++) {
            if (r != row && tableau[r][col] != 0.0) {
                double factor = tableau[r][col];
                for (int k = 0; k < n + m + 1; k++) tableau[r][k] -= factor * tableau[row][k];
            }
        }
    };

    while (true) {
        int col = -1;
        double minVal = -1e-9;
        for (int j = 0; j < n + m; j++) {
            if (tableau[m][j] < minVal) { minVal = tableau[m][j]; col = j; }
        }
        if (col == -1) break;

        int bestRow = -1;
        double bestRatio = std::numeric_limits<double>::infinity();
        for (int i = 0; i < m; i++) {
            if (tableau[i][col] > 1e-9) {
                double ratio = tableau[i][n + m] / tableau[i][col];
                if (ratio < bestRatio) { bestRatio = ratio; bestRow = i; }
            }
        }
        if (bestRow == -1) throw std::runtime_error("unbounded");
        pivot(bestRow, col);
    }

    std::vector<double> x(n, 0.0);
    for (int j = 0; j < n; j++) {
        int onesCount = 0, rowIdx = -1;
        bool valid = true;
        for (int i = 0; i < m; i++) {
            double v = tableau[i][j];
            if (std::abs(v - 1.0) < 1e-9) { onesCount++; rowIdx = i; }
            else if (std::abs(v) > 1e-9) valid = false;
        }
        if (onesCount == 1 && valid) x[j] = tableau[rowIdx][n + m];
    }
    return {x, tableau[m][n + m]};
}
```

```rust
fn simplex(c: &[f64], a: &[Vec<f64>], b: &[f64]) -> (Vec<f64>, f64) {
    let m = a.len();
    let n = c.len();
    let mut tableau = vec![vec![0.0; n + m + 1]; m + 1];
    for i in 0..m {
        tableau[i][..n].copy_from_slice(&a[i]);
        tableau[i][n + i] = 1.0;
        tableau[i][n + m] = b[i];
    }
    for j in 0..n {
        tableau[m][j] = -c[j];
    }

    loop {
        let mut col: Option<usize> = None;
        let mut min_val = -1e-9;
        for j in 0..(n + m) {
            if tableau[m][j] < min_val {
                min_val = tableau[m][j];
                col = Some(j);
            }
        }
        let col = match col {
            Some(c) => c,
            None => break,
        };

        let mut best_row: Option<usize> = None;
        let mut best_ratio = f64::INFINITY;
        for i in 0..m {
            if tableau[i][col] > 1e-9 {
                let ratio = tableau[i][n + m] / tableau[i][col];
                if ratio < best_ratio {
                    best_ratio = ratio;
                    best_row = Some(i);
                }
            }
        }
        let row = best_row.expect("unbounded");

        let pv = tableau[row][col];
        for k in 0..(n + m + 1) {
            tableau[row][k] /= pv;
        }
        for r in 0..=m {
            if r != row && tableau[r][col] != 0.0 {
                let factor = tableau[r][col];
                for k in 0..(n + m + 1) {
                    tableau[r][k] -= factor * tableau[row][k];
                }
            }
        }
    }

    let mut x = vec![0.0; n];
    for j in 0..n {
        let mut ones_count = 0;
        let mut row_idx = 0;
        let mut valid = true;
        for i in 0..m {
            let v = tableau[i][j];
            if (v - 1.0).abs() < 1e-9 {
                ones_count += 1;
                row_idx = i;
            } else if v.abs() > 1e-9 {
                valid = false;
            }
        }
        if ones_count == 1 && valid {
            x[j] = tableau[row_idx][n + m];
        }
    }
    (x, tableau[m][n + m])
}
```

```csharp
using System;

static (double[] x, double obj) Simplex(double[] c, double[][] a, double[] b)
{
    int m = a.Length, n = c.Length;
    var tableau = new double[m + 1][];
    for (int i = 0; i <= m; i++) tableau[i] = new double[n + m + 1];
    for (int i = 0; i < m; i++)
    {
        for (int j = 0; j < n; j++) tableau[i][j] = a[i][j];
        tableau[i][n + i] = 1;
        tableau[i][n + m] = b[i];
    }
    for (int j = 0; j < n; j++) tableau[m][j] = -c[j];

    void Pivot(int row, int col)
    {
        double pv = tableau[row][col];
        for (int k = 0; k < n + m + 1; k++) tableau[row][k] /= pv;
        for (int r = 0; r <= m; r++)
        {
            if (r != row && tableau[r][col] != 0)
            {
                double factor = tableau[r][col];
                for (int k = 0; k < n + m + 1; k++) tableau[r][k] -= factor * tableau[row][k];
            }
        }
    }

    while (true)
    {
        int col = -1;
        double minVal = -1e-9;
        for (int j = 0; j < n + m; j++)
        {
            if (tableau[m][j] < minVal) { minVal = tableau[m][j]; col = j; }
        }
        if (col == -1) break;

        int bestRow = -1;
        double bestRatio = double.PositiveInfinity;
        for (int i = 0; i < m; i++)
        {
            if (tableau[i][col] > 1e-9)
            {
                double ratio = tableau[i][n + m] / tableau[i][col];
                if (ratio < bestRatio) { bestRatio = ratio; bestRow = i; }
            }
        }
        if (bestRow == -1) throw new InvalidOperationException("unbounded");
        Pivot(bestRow, col);
    }

    var x = new double[n];
    for (int j = 0; j < n; j++)
    {
        int onesCount = 0, rowIdx = -1;
        bool valid = true;
        for (int i = 0; i < m; i++)
        {
            double v = tableau[i][j];
            if (Math.Abs(v - 1) < 1e-9) { onesCount++; rowIdx = i; }
            else if (Math.Abs(v) > 1e-9) valid = false;
        }
        if (onesCount == 1 && valid) x[j] = tableau[rowIdx][n + m];
    }
    return (x, tableau[m][n + m]);
}
```
