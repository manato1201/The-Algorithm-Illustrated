---
name: Ridge/Lasso正則化回帰
category: 機械学習
subcategory: 教師あり学習
complexity: O(nd)(1エポック、n=サンプル数、d=特徴数。座標降下法や勾配降下法で学習する場合)
summary: 損失関数に係数の大きさへのペナルティ項(L2ノルムまたはL1ノルム)を加えることで過学習を抑え、特にLassoでは不要な特徴量の係数を厳密にゼロへ縮小してスパースなモデルを作る回帰の正則化手法。
---

## 概要

[線形回帰](/algorithms/least-squares)を訓練データに対して素直に最小二乗法で解くと、特徴量の数が多い、あるいは特徴量同士に強い相関がある(多重共線性)場合に、係数が異常に大きな値へ発散し、訓練データにだけ過剰に適合した(過学習した)脆いモデルができやすい。Ridge回帰とLasso回帰は、どちらも「損失関数(二乗誤差)に、係数の大きさそのものに対するペナルティ項を追加する」という共通のアイデアで過学習を抑える正則化手法だが、ペナルティの測り方が異なる。Ridge回帰は係数の**L2ノルム(二乗和)**にペナルティを課し、係数全体をなだらかに縮小する。Lasso回帰(Least Absolute Shrinkage and Selection Operator)は係数の**L1ノルム(絶対値の和)**にペナルティを課し、その幾何学的な性質により重要度の低い特徴量の係数を**厳密にゼロ**まで縮小する——つまり自動的な特徴選択を副産物として得られる。この2つを組み合わせたElastic Netという発展形も広く使われている。

## 仕組み

1. 通常の線形回帰の目的関数は二乗誤差の和`Σ(y_i - w・x_i - b)²`を最小化するだけだが、これに正則化項を加える
2. **Ridge回帰**: 目的関数を`Σ(y_i - w・x_i - b)² + λ Σ w_j²`とする。第2項が係数`w`のL2ノルム(二乗和)へのペナルティで、`λ`(正則化の強さを決めるハイパーパラメータ)が大きいほど係数は全体的に0に近づくよう縮小される
3. **Lasso回帰**: 目的関数を`Σ(y_i - w・x_i - b)² + λ Σ |w_j|`とする。第2項が係数のL1ノルム(絶対値の和)へのペナルティであり、この項は原点で微分不可能な「尖った」形状を持つため、最適化の結果として**重要度の低い係数がちょうど0になる**という性質を持つ(Ridgeの二乗ペナルティでは係数は0に近づくが厳密には0にならない)
4. Ridge回帰は目的関数が滑らかな二次形式のままなので、解析的に閉じた形の解(正規方程式に`λI`を加えた形)が存在し、行列演算で直接解ける
5. Lasso回帰は目的関数が微分不可能な点を含むため解析解が存在せず、**座標降下法**(1つの係数だけを動かして最適化し、それを全係数について順に繰り返す)や劣勾配法などの反復的な数値最適化で解く
6. `λ`はクロスバリデーションなどで訓練データとは別に検証し、汎化性能が最も良くなる値を選ぶ——`λ=0`なら通常の線形回帰に一致し、`λ`を大きくするほど正則化が強く働く

## 特性・トレードオフ

- **計算量**: どちらも1エポックあたり`O(nd)`程度で、[線形回帰](/algorithms/least-squares)と同オーダー。Ridgeは行列の逆行列計算(`O(d³)`)で解析的に解ける一方、Lassoは座標降下法などの反復法が必要になる
- **バイアス・バリアンス トレードオフ**: 正則化は訓練データへの当てはまり(バイアスの低さ)を多少犠牲にする代わりに、係数の値を抑えることでモデルの複雑さ(バリアンスの高さ)を下げ、未知データへの汎化性能を上げる——これが正則化の中心的な狙いである
- **Ridge対Lassoの使い分け**: 特徴量の多くが予測に関係している(どれも少しずつ寄与する)と考えられる場合はRidgeが係数を穏やかに縮小して安定した予測を作りやすい。一方、特徴量の中に予測に無関係なものが多く混在していると考えられる場合はLassoが不要な特徴量の係数をゼロにして自動的にモデルを単純化してくれる。両方の利点を得るElastic Net(L1とL2のペナルティを両方加える)も実務でよく使われる
- **多重共線性への対処**: 強く相関した特徴量の集合があるとき、通常の最小二乗法では係数が不安定になりやすいが、Ridgeは相関した特徴量群の係数を互いに近い値へ縮小して安定させる。Lassoは相関した特徴量群からランダムに1つだけを選び他をゼロにする傾向があり、どの特徴が選ばれるかが不安定になることがある
- **使いどころ**: 特徴量数がサンプル数に対して多い高次元データ(遺伝子発現データ、テキストのbag-of-words表現など)、多重共線性が疑われる経済・金融データの回帰分析、Lassoによる自動特徴選択が有用なスパースなモデルが望ましい場面全般

## 実装例

Ridge回帰は正規方程式に`λI`を加えた閉形式の解を、Lasso回帰は軟閾値作用素(soft-thresholding)を使った座標降下法で解く。

```python
def ridge_fit(X: list[list[float]], y: list[float], lam: float = 1.0) -> list[float]:
    """正規方程式 (X^T X + λI) w = X^T y をガウスの消去法で解く。Xの先頭列は切片用の1で構成する。"""
    n, d = len(X), len(X[0])
    XtX = [[sum(X[k][i] * X[k][j] for k in range(n)) for j in range(d)] for i in range(d)]
    for i in range(1, d):  # 切片(0列目)には正則化をかけない
        XtX[i][i] += lam
    Xty = [sum(X[k][i] * y[k] for k in range(n)) for i in range(d)]
    return _solve_linear_system(XtX, Xty)


def _solve_linear_system(A: list[list[float]], b: list[float]) -> list[float]:
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[pivot] = M[pivot], M[col]
        piv_val = M[col][col]
        for j in range(col, n + 1):
            M[col][j] /= piv_val
        for r in range(n):
            if r != col:
                factor = M[r][col]
                for j in range(col, n + 1):
                    M[r][j] -= factor * M[col][j]
    return [M[i][n] for i in range(n)]


def _soft_threshold(z: float, gamma: float) -> float:
    if z > gamma:
        return z - gamma
    if z < -gamma:
        return z + gamma
    return 0.0


def lasso_fit(X: list[list[float]], y: list[float], lam: float = 1.0, iterations: int = 1000) -> list[float]:
    """座標降下法でLasso回帰を学習する。Xの各列(特徴量)は標準化済みと仮定する。"""
    n, d = len(X), len(X[0])
    w = [0.0] * d
    col_sq = [sum(X[k][j] ** 2 for k in range(n)) for j in range(d)]
    for _ in range(iterations):
        for j in range(d):
            residual_without_j = [
                y[k] - sum(w[m] * X[k][m] for m in range(d) if m != j) for k in range(n)
            ]
            rho = sum(X[k][j] * residual_without_j[k] for k in range(n))
            if j == 0:  # 切片項は正則化しない
                w[j] = rho / col_sq[j] if col_sq[j] > 0 else 0.0
            else:
                w[j] = _soft_threshold(rho, lam) / col_sq[j] if col_sq[j] > 0 else 0.0
    return w
```

```typescript
// 正規方程式 (X^T X + λI) w = X^T y をガウスの消去法で解く。Xの先頭列は切片用の1で構成する
function ridgeFit(X: number[][], y: number[], lam = 1.0): number[] {
  const n = X.length;
  const d = X[0].length;
  const XtX = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * X[k][j];
      return s;
    }),
  );
  for (let i = 1; i < d; i++) XtX[i][i] += lam; // 切片(0列目)には正則化をかけない
  const Xty = Array.from({ length: d }, (_, i) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += X[k][i] * y[k];
    return s;
  });
  return solveLinearSystem(XtX, Xty);
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pivVal = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= pivVal;
    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const factor = M[r][col];
        for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
      }
    }
  }
  return M.map((row) => row[n]);
}

function softThreshold(z: number, gamma: number): number {
  if (z > gamma) return z - gamma;
  if (z < -gamma) return z + gamma;
  return 0;
}

// 座標降下法でLasso回帰を学習する。Xの各列(特徴量)は標準化済みと仮定する
function lassoFit(
  X: number[][],
  y: number[],
  lam = 1.0,
  iterations = 1000,
): number[] {
  const n = X.length;
  const d = X[0].length;
  const w = new Array(d).fill(0);
  const colSq = Array.from({ length: d }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += X[k][j] ** 2;
    return s;
  });
  for (let iter = 0; iter < iterations; iter++) {
    for (let j = 0; j < d; j++) {
      const residualWithoutJ = Array.from({ length: n }, (_, k) => {
        let pred = 0;
        for (let m = 0; m < d; m++) if (m !== j) pred += w[m] * X[k][m];
        return y[k] - pred;
      });
      let rho = 0;
      for (let k = 0; k < n; k++) rho += X[k][j] * residualWithoutJ[k];
      if (j === 0) {
        w[j] = colSq[j] > 0 ? rho / colSq[j] : 0; // 切片項は正則化しない
      } else {
        w[j] = colSq[j] > 0 ? softThreshold(rho, lam) / colSq[j] : 0;
      }
    }
  }
  return w;
}
```
