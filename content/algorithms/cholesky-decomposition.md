---
name: コレスキー分解(Cholesky Decomposition)
category: 数値計算
subcategory: 線形代数計算
complexity: O(n³/3)(分解)+O(n²)(1回の求解)
summary: 対称正定値行列を下三角行列とその転置の積に分解することで、[LU分解](/algorithms/lu-decomposition)より約2倍少ない計算量とメモリで連立方程式を解ける特化型の行列分解手法。
---

## 概要

[LU分解](/algorithms/lu-decomposition)は任意の正方行列を下三角行列`L`と上三角行列`U`の積に分解できる汎用的な手法だが、対称正定値行列(転置しても変わらず、かつ全ての固有値が正である行列——物理シミュレーションの剛性行列や統計の共分散行列など、実務で頻出する重要なクラス)に対しては、この対称性を活かさない分もったいない。コレスキー分解は、対称正定値行列`A`に限定することで`A = LLᵀ`(下三角行列`L`とその転置の積)というさらにシンプルな形の分解を可能にし、`U`を別途持つ必要がなくなる分だけ計算量とメモリの両方をおよそ半分に削減する。1900年代初頭にフランスの測地学者アンドレ゠ルイ・コレスキーが三角測量の最小二乗計算のために考案した。

## 仕組み

1. 対称正定値行列`A`(`n×n`)に対し、下三角行列`L`を`A = LLᵀ`となるように求める
2. `L`の成分は、`A`の成分と`L`自身の既に確定した成分から**列ごとに逐次計算**できる。対角成分は
   `Lᵢᵢ = √(Aᵢᵢ - Σₖ₌₀^{i-1} Lᵢₖ²)`
   非対角成分(`j > i`)は
   `Lⱼᵢ = (Aⱼᵢ - Σₖ₌₀^{i-1} Lⱼₖ・Lᵢₖ) / Lᵢᵢ`
   という漸化式で求まる(列`i`を左上から右下に向かって順に埋めていく)
3. 対角成分の計算で平方根の中身が負になることはない——これは`A`が正定値であることの数学的な帰結であり、逆に平方根の中身が負になった(または0で割ることになった)場合は、その行列が正定値でないことの証拠になる(**正定値性のチェック**として利用できる)
4. 連立方程式`Ax = b`を解く場合は`LLᵀx = b`とみなし、[LU分解](/algorithms/lu-decomposition)と同様に前進代入で`Ly = b`から`y`を求め、後退代入で`Lᵀx = y`から`x`を求める(いずれも`O(n²)`)

## 特性・トレードオフ

- **計算量・メモリの効率**: 分解の計算量は`O(n³/3)`で、[LU分解](/algorithms/lu-decomposition)の`O(n³/3×2)`(実質`2n³/3`)のおよそ半分。保持する三角行列も`L`一つだけで済むため、メモリも半分で済む——対称正定値行列という前提が使える場面では明確に有利
- **適用範囲は限定的**: 対称正定値行列にしか使えない。非対称な行列や、対称でも正定値でない(不定値・半正定値)行列には適用できず、その場合は[LU分解](/algorithms/lu-decomposition)や固有値分解など別の手法が必要になる
- **数値的安定性**: ピボット選択(行の入れ替え)なしでも常に安定して計算できる。これは正定値性から対角成分が常に正であることが保証されているためで、[LU分解](/algorithms/lu-decomposition)がピボット選択を必要とするのと対照的
- **使いどころ**: 有限要素法・構造解析の剛性行列の求解、統計・機械学習における共分散行列を使った多変量正規分布のサンプリング(`L`を使って無相関な乱数を相関のある分布に変換する)、[最小二乗法](/algorithms/least-squares)の正規方程式`AᵀAx=Aᵀb`(`AᵀA`は自動的に対称半正定値になる)の求解、カルマンフィルタや最適化アルゴリズム内部の行列演算

## 実装例

```python
import math


def cholesky_decomposition(a: list[list[float]]) -> list[list[float]]:
    """対称正定値行列 a を A = L Lᵀ に分解し、下三角行列 L を返す"""
    n = len(a)
    l = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(l[i][k] * l[j][k] for k in range(j))
            if i == j:
                l[i][j] = math.sqrt(a[i][i] - s)
            else:
                l[i][j] = (a[i][j] - s) / l[j][j]
    return l


def cholesky_solve(l: list[list[float]], b: list[float]) -> list[float]:
    n = len(b)
    y = [0.0] * n
    for i in range(n):
        y[i] = (b[i] - sum(l[i][k] * y[k] for k in range(i))) / l[i][i]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = sum(l[k][i] * x[k] for k in range(i + 1, n))
        x[i] = (y[i] - s) / l[i][i]
    return x


# 例: A = [[4, 12, -16], [12, 37, -43], [-16, -43, 98]] は対称正定値
a = [[4, 12, -16], [12, 37, -43], [-16, -43, 98]]
l = cholesky_decomposition(a)
```

```typescript
function choleskyDecomposition(a: number[][]): number[][] {
  const n = a.length;
  const l: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += l[i][k] * l[j][k];
      if (i === j) {
        l[i][j] = Math.sqrt(a[i][i] - s);
      } else {
        l[i][j] = (a[i][j] - s) / l[j][j];
      }
    }
  }
  return l;
}

function choleskySolve(l: number[][], b: number[]): number[] {
  const n = b.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= l[i][k] * y[k];
    y[i] = s / l[i][i];
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= l[k][i] * x[k];
    x[i] = s / l[i][i];
  }
  return x;
}

// 例: A = [[4, 12, -16], [12, 37, -43], [-16, -43, 98]] は対称正定値
const a = [
  [4, 12, -16],
  [12, 37, -43],
  [-16, -43, 98],
];
const l = choleskyDecomposition(a);
```

```cpp
#include <vector>
#include <cmath>

std::vector<std::vector<double>> choleskyDecomposition(const std::vector<std::vector<double>>& a) {
    int n = static_cast<int>(a.size());
    std::vector<std::vector<double>> l(n, std::vector<double>(n, 0.0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j <= i; j++) {
            double s = 0.0;
            for (int k = 0; k < j; k++) s += l[i][k] * l[j][k];
            if (i == j) {
                l[i][j] = std::sqrt(a[i][i] - s);
            } else {
                l[i][j] = (a[i][j] - s) / l[j][j];
            }
        }
    }
    return l;
}

std::vector<double> choleskySolve(const std::vector<std::vector<double>>& l, const std::vector<double>& b) {
    int n = static_cast<int>(b.size());
    std::vector<double> y(n, 0.0);
    for (int i = 0; i < n; i++) {
        double s = b[i];
        for (int k = 0; k < i; k++) s -= l[i][k] * y[k];
        y[i] = s / l[i][i];
    }
    std::vector<double> x(n, 0.0);
    for (int i = n - 1; i >= 0; i--) {
        double s = y[i];
        for (int k = i + 1; k < n; k++) s -= l[k][i] * x[k];
        x[i] = s / l[i][i];
    }
    return x;
}
```
