---
name: ガウスの消去法
category: 数値計算
subcategory: 線形代数計算
complexity: O(n³)(n元連立方程式)
summary: 行の加減算だけで連立一次方程式を上三角形に整形し、後退代入で解を求める線形代数の最も基本的な解法。
---

## 概要

`n`個の未知数を持つ`n`元連立一次方程式を解く方法として、中学校で習う「代入法」や「加減法」を体系的かつ機械的に、どんな元数の方程式にも適用できるように一般化したのがガウスの消去法である。方程式を係数行列として表現し、「ある行を定数倍して別の行に足し引きする」という操作(行基本変形)だけを使って、行列を上三角形(対角線より下が全て0)の形に整形する。こうして得られる上三角行列は、一番下の式から順に代入していくだけで機械的に解ける、非常に扱いやすい形になっている。

## 仕組み

1. 連立方程式を係数行列(拡大係数行列、右辺の定数項も含めた行列)として表現する
2. 1列目に着目し、1行目(ピボット行)を使って、2行目以降の1列目の値が全て0になるように、各行から「1行目の適切な倍数」を引く(**前進消去**)
3. 2列目に着目し、2行目を使って、3行目以降の2列目の値が全て0になるように同様の操作を行う
4. これを最後の列まで繰り返すと、行列は上三角形(対角線より下が全て0)になる
5. 最後の行(1つの未知数だけが残っている)から解が直接求まる。それを1つ上の行に代入して次の未知数を求め、これを一番上まで繰り返す(**後退代入**)

途中でピボット(対角成分)が0になる場合は行の入れ替え(ピボット選択)が必要——数値誤差を抑えるため、実装では絶対値が最大の行を選ぶ**部分ピボット選択**が標準的に使われる。

## 特性・トレードオフ

- **計算量**: `n`元連立方程式に対して`O(n³)`。前進消去だけで`O(n³)`、後退代入は`O(n²)`なので、前進消去が計算コストの大半を占める
- **数値的安定性への配慮が必要**: 対角成分(ピボット)が0や極めて小さい値になると、割り算で誤差が爆発的に拡大する。実用の実装では部分ピボット選択(各列で絶対値最大の行を優先的にピボットに選ぶ)がほぼ必須
- **[LU分解](/algorithms/lu-decomposition)との関係**: 前進消去の過程で行った操作を記録しておくと、同じ係数行列に対して右辺だけ異なる複数の方程式を効率よく解ける[LU分解](/algorithms/lu-decomposition)が得られる。1回だけ解くならガウスの消去法で十分だが、同じ係数行列を繰り返し使う場面ではLU分解の方が効率的
- **使いどころ**: 連立一次方程式を解くあらゆる場面(構造力学のたわみ計算、電気回路のキルヒホッフの法則、最小二乗法の正規方程式など)の基盤。ほぼ全ての数値計算ライブラリの行列演算の内部で使われている

## 実装例

```python
def gaussian_elimination(a: list[list[float]], b: list[float]) -> list[float]:
    n = len(a)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        # 部分ピボット選択: 絶対値最大の行をピボットに選ぶ
        pivot_row = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[pivot_row] = m[pivot_row], m[col]
        pivot = m[col][col]
        for r in range(col + 1, n):
            factor = m[r][col] / pivot
            for c in range(col, n + 1):
                m[r][c] -= factor * m[col][c]
    # 後退代入
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = m[i][n] - sum(m[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / m[i][i]
    return x
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
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

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
```
