---
name: 特異値分解(Singular Value Decomposition, SVD)
category: 数値計算
subcategory: 線形代数計算
complexity: O(mn²)(m×n行列、m≥nの場合)
summary: 任意の(正方でなくてもよい)行列を「直交行列・対角行列(特異値)・直交行列」の積に分解し、低ランク近似や擬似逆行列の計算を可能にする最も汎用性の高い行列分解手法。
---

## 概要

[QR分解](/algorithms/qr-decomposition)や[べき乗法](/algorithms/power-iteration)は正方行列を前提とした手法だが、実世界のデータ(画像・アンケートの回答行列・単語文書行列など)は行数と列数が異なる長方形の行列であることがほとんどで、そもそも固有値という概念自体が正方行列にしか定義されない。特異値分解(SVD)は、`m×n`の任意の行列`A`(正方である必要はない)を`A = UΣVᵀ`——`U`(`m×m`の直交行列)、`Σ`(対角成分に「特異値」と呼ばれる非負の値が大きい順に並ぶ`m×n`の疑似対角行列)、`V`(`n×n`の直交行列)——という3つの行列の積に分解する。特異値分解は線形代数における「最も強力な行列分解」とも呼ばれ、次元削減(主成分分析の内部計算)・画像圧縮・レコメンドシステム・擬似逆行列の計算など極めて広い応用を持つ。

## 仕組み

1. 行列`A`(`m×n`)に対して`AᵀA`(`n×n`の対称半正定値行列)を考えると、その固有ベクトルが`V`の列(**右特異ベクトル**)になり、固有値の平方根が特異値`σ₁≥σ₂≥...≥σₙ≥0`になる
2. 同様に`AAᵀ`(`m×m`の対称半正定値行列)の固有ベクトルが`U`の列(**左特異ベクトル**)になる。`AᵀA`と`AAᵀ`は非ゼロ固有値を共有するため、両者の固有ベクトルとその固有値から`U`・`Σ`・`V`が一貫して求まる
3. 実務上は`AᵀA`を陽に計算せず(数値誤差が拡大するため)、**片側ヤコビ法**などの数値的に安定したアルゴリズムで直接`A`から求めるのが一般的: `A`の列ベクトルのペア`(aₚ, aq)`ごとに、内積`aₚ・aq`をゼロに近づける回転(ヤコビ回転)を繰り返し適用する。全ての列ペアが十分直交すると収束し、そのときの各列の**ノルムが特異値**、正規化した列ベクトルが`U`、累積した回転行列が`V`になる
4. `Σ`は対角成分に特異値`σ₁,...,σᵣ`(`r`は行列のランク)が並び、それ以外は0の疑似対角行列。特異値が大きい成分ほど「元の行列の情報を多く担っている」方向を表す

## 特性・トレードオフ

- **任意の行列に適用できる汎用性**: 正方行列限定の[QR分解](/algorithms/qr-decomposition)・[べき乗法](/algorithms/power-iteration)(固有値分解)と異なり、`m≠n`の長方形行列にもそのまま適用できる。実データの多くは長方形行列であるため、応用範囲が非常に広い
- **低ランク近似**: 特異値の大きい上位`k`個とそれに対応する`U`・`V`の列だけを使って`A`を再構成する(`A ≈ Uₖ Σₖ Vₖᵀ`)と、元の行列を最もよく近似する階数`k`の行列が得られる(Eckart-Youngの定理)。画像圧縮・ノイズ除去・レコメンドシステムの協調フィルタリングの基礎になる
- **擬似逆行列(ムーア・ペンローズ逆行列)の計算**: 正方でない、または特異(逆行列を持たない)行列に対しても`A⁺ = VΣ⁺Uᵀ`(`Σ⁺`は非ゼロ特異値を逆数にした対角行列)として擬似逆行列を定義でき、[最小二乗法](/algorithms/least-squares)の最小ノルム解を数値的に安定して求められる
- **計算コストは重い**: `O(mn²)`(`m≥n`の場合)で、[LU分解](/algorithms/lu-decomposition)や[QR分解](/algorithms/qr-decomposition)よりも定数倍のコストが大きい。正方行列の固有値だけが必要なら[べき乗法](/algorithms/power-iteration)やQRアルゴリズムの方が軽量な場合が多い
- **使いどころ**: 主成分分析(PCA)の内部計算(データ行列を中心化してSVDすると主成分が特異ベクトルとして得られる)、レコメンドシステムの行列分解、画像・信号のノイズ除去と圧縮、[最小二乗法](/algorithms/least-squares)における条件数の悪い問題の安定した求解

## 実装例(片側ヤコビ法によるSVD)

```python
import math


def svd_jacobi(a: list[list[float]], max_sweeps: int = 60, tol: float = 1e-12):
    """片側ヤコビ法によるSVD。a (m×n, m>=n) を U, singular_values, V に分解する"""
    m = len(a)
    n = len(a[0])
    u = [row[:] for row in a]  # 反復後、列ベクトルが σ・(左特異ベクトル) になる
    v = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]

    for _ in range(max_sweeps):
        converged = True
        for p in range(n - 1):
            for q in range(p + 1, n):
                alpha = sum(u[i][p] ** 2 for i in range(m))
                beta = sum(u[i][q] ** 2 for i in range(m))
                gamma = sum(u[i][p] * u[i][q] for i in range(m))
                if abs(gamma) < tol * math.sqrt(alpha * beta + 1e-30):
                    continue
                converged = False
                zeta = (beta - alpha) / (2.0 * gamma)
                t = math.copysign(1.0, zeta) / (abs(zeta) + math.sqrt(1.0 + zeta * zeta))
                c = 1.0 / math.sqrt(1.0 + t * t)
                s = c * t
                for i in range(m):
                    up, uq = u[i][p], u[i][q]
                    u[i][p] = c * up - s * uq
                    u[i][q] = s * up + c * uq
                for i in range(n):
                    vp, vq = v[i][p], v[i][q]
                    v[i][p] = c * vp - s * vq
                    v[i][q] = s * vp + c * vq
        if converged:
            break

    singular_values = [math.sqrt(sum(u[i][j] ** 2 for i in range(m))) for j in range(n)]
    for j in range(n):
        if singular_values[j] > 1e-300:
            for i in range(m):
                u[i][j] /= singular_values[j]
    return u, singular_values, v
```

```typescript
function svdJacobi(
  a: number[][],
  maxSweeps: number = 60,
  tol: number = 1e-12,
): { u: number[][]; singularValues: number[]; v: number[][] } {
  const m = a.length;
  const n = a[0].length;
  const u = a.map((row) => [...row]);
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let converged = true;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        let alpha = 0,
          beta = 0,
          gamma = 0;
        for (let i = 0; i < m; i++) {
          alpha += u[i][p] * u[i][p];
          beta += u[i][q] * u[i][q];
          gamma += u[i][p] * u[i][q];
        }
        if (Math.abs(gamma) < tol * Math.sqrt(alpha * beta + 1e-30)) continue;
        converged = false;
        const zeta = (beta - alpha) / (2 * gamma);
        const t =
          Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (let i = 0; i < m; i++) {
          const up = u[i][p],
            uq = u[i][q];
          u[i][p] = c * up - s * uq;
          u[i][q] = s * up + c * uq;
        }
        for (let i = 0; i < n; i++) {
          const vp = v[i][p],
            vq = v[i][q];
          v[i][p] = c * vp - s * vq;
          v[i][q] = s * vp + c * vq;
        }
      }
    }
    if (converged) break;
  }

  const singularValues = Array.from({ length: n }, (_, j) => {
    let sum = 0;
    for (let i = 0; i < m; i++) sum += u[i][j] * u[i][j];
    return Math.sqrt(sum);
  });
  for (let j = 0; j < n; j++) {
    if (singularValues[j] > 1e-300) {
      for (let i = 0; i < m; i++) u[i][j] /= singularValues[j];
    }
  }
  return { u, singularValues, v };
}
```
