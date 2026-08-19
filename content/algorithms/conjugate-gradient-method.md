---
name: 共役勾配法(Conjugate Gradient Method)
category: 数値計算
subcategory: 線形代数計算
complexity: O(n)反復×O(nnz)(疎行列の場合、理論上n回で収束)
summary: 対称正定値な連立一次方程式を、互いに共役な探索方向を順に選びながら反復的に解き、理論上はn回の反復で厳密解に到達する反復法。
---

## 概要

[ガウスの消去法](/algorithms/gaussian-elimination)や[LU分解](/algorithms/lu-decomposition)は連立方程式`Ax=b`を有限回の演算で厳密に解く「直接法」だが、`n`が数百万を超えるような大規模な疎行列(非ゼロ要素が少ない行列、有限要素法や偏微分方程式の離散化で頻出する)では`O(n³)`の計算量もメモリも現実的でなくなる。共役勾配法は、`A`が対称正定値であるという条件のもとで、`Ax=b`を解くことを「二次形式`f(x) = ½xᵀAx - bᵀx`を最小化する」問題として捉え直し、互いに`A`に関して**共役**(直交の一般化)な探索方向を1つずつ選んで最小値へ進んでいく反復法である。理論上は高々`n`回の反復で厳密解に到達することが数学的に保証されており、実務上は疎行列であれば数十〜数百回程度のはるかに少ない反復で十分な精度に達することが多い。1952年にヘスティネスとスティーフェルによって考案された。

## 仕組み

1. 初期推定値`x₀`(通常はゼロベクトル)を選び、初期残差`r₀ = b - Ax₀`と初期探索方向`p₀ = r₀`を設定する
2. 各反復`k`で以下を計算する:
   - ステップ幅: `αₖ = (rₖᵀrₖ) / (pₖᵀApₖ)`(現在の探索方向`pₖ`に沿ってどれだけ進むかを、二次形式を最小化するように選ぶ)
   - 解の更新: `xₖ₊₁ = xₖ + αₖpₖ`
   - 残差の更新: `rₖ₊₁ = rₖ - αₖApₖ`(`Ax`の再計算を避け、既に計算済みの`Apₖ`から差分で更新する)
3. 残差`rₖ₊₁`のノルムが十分小さければ収束したとみなして終了する
4. 次の探索方向を、これまでの探索方向と`A`に関して共役になるように選ぶ: `βₖ = (rₖ₊₁ᵀrₖ₊₁) / (rₖᵀrₖ)`、`pₖ₊₁ = rₖ₊₁ + βₖpₖ`
5. 2〜4を、収束するか`n`回の反復に達するまで繰り返す

各反復で必要な計算は行列ベクトル積`Apₖ`が1回だけであり、疎行列であれば`Apₖ`は非ゼロ要素の数`nnz`に比例したコストで計算できる。

## 特性・トレードオフ

- **直接法との使い分け**: [ガウスの消去法](/algorithms/gaussian-elimination)は`A`が密行列で`n`が小さい場合には確実で高速だが、疎行列で`n`が非常に大きい場合はメモリ・計算量の両方で破綻しやすい。共役勾配法は行列を明示的に保持せず「ベクトルとの積」さえ計算できればよいため、疎行列や、行列を陽に構成できない(演算子としてしか定義されない)大規模問題に強い
- **収束の速さは条件数に依存**: 反復回数は理論上`n`回で確定的に収束するが、実用上の収束速度は`A`の条件数(最大固有値/最小固有値)に依存し、条件数が悪いと収束が遅くなる。これを改善するために対角成分などで前処理を施す**前処理付き共役勾配法(PCG)**が実務では標準的に使われる
- **対称正定値行列に限定**: [コレスキー分解](/algorithms/cholesky-decomposition)と同様、対称正定値行列という前提が必要。非対称な行列には一般化共役勾配法(GMRES、BiCGSTABなど)が使われる
- **メモリ効率**: 各反復で保持するのは`x`・`r`・`p`・`Ap`程度のベクトルのみで、行列の分解結果(`L`や`U`など)を保持する必要がない——大規模疎行列では[コレスキー分解](/algorithms/cholesky-decomposition)より圧倒的にメモリ効率が良い
- **使いどころ**: 有限要素法・有限差分法による偏微分方程式の大規模疎行列の求解、機械学習における大規模な二次計画問題の最適化、画像処理における正則化付き逆問題(ノイズ除去・超解像など)の求解

## 実装例(密行列表現、疎行列でも同じロジックが使える)

```python
def conjugate_gradient(
    a: list[list[float]], b: list[float], x0: list[float] | None = None,
    tol: float = 1e-10, max_iter: int | None = None
) -> list[float]:
    n = len(b)
    x = x0[:] if x0 is not None else [0.0] * n
    max_iter = max_iter or n

    def matvec(v: list[float]) -> list[float]:
        return [sum(a[i][j] * v[j] for j in range(n)) for i in range(n)]

    def dot(u: list[float], v: list[float]) -> float:
        return sum(ui * vi for ui, vi in zip(u, v))

    r = [b[i] - ax for i, ax in enumerate(matvec(x))]
    p = r[:]
    rs_old = dot(r, r)

    for _ in range(max_iter):
        if rs_old ** 0.5 < tol:
            break
        ap = matvec(p)
        alpha = rs_old / dot(p, ap)
        x = [x[i] + alpha * p[i] for i in range(n)]
        r = [r[i] - alpha * ap[i] for i in range(n)]
        rs_new = dot(r, r)
        beta = rs_new / rs_old
        p = [r[i] + beta * p[i] for i in range(n)]
        rs_old = rs_new

    return x


# 例: 対称正定値行列 A に対して Ax = b を解く
a = [[4, 1], [1, 3]]
b = [1, 2]
x = conjugate_gradient(a, b)
```

```typescript
function conjugateGradient(
  a: number[][],
  b: number[],
  x0?: number[],
  tol: number = 1e-10,
  maxIter?: number,
): number[] {
  const n = b.length;
  let x = x0 ? [...x0] : new Array(n).fill(0);
  const iterLimit = maxIter ?? n;

  const matvec = (v: number[]): number[] =>
    a.map((row) => row.reduce((s, aij, j) => s + aij * v[j], 0));

  const dot = (u: number[], v: number[]): number =>
    u.reduce((s, ui, i) => s + ui * v[i], 0);

  let r = b.map((bi, i) => bi - matvec(x)[i]);
  let p = [...r];
  let rsOld = dot(r, r);

  for (let iter = 0; iter < iterLimit; iter++) {
    if (Math.sqrt(rsOld) < tol) break;
    const ap = matvec(p);
    const alpha = rsOld / dot(p, ap);
    x = x.map((xi, i) => xi + alpha * p[i]);
    r = r.map((ri, i) => ri - alpha * ap[i]);
    const rsNew = dot(r, r);
    const beta = rsNew / rsOld;
    p = r.map((ri, i) => ri + beta * p[i]);
    rsOld = rsNew;
  }

  return x;
}

// 例: 対称正定値行列 A に対して Ax = b を解く
const a = [
  [4, 1],
  [1, 3],
];
const b = [1, 2];
const x = conjugateGradient(a, b);
```
