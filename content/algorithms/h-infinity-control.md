---
name: H∞制御(H-infinity Control)
category: 制御・ロボティクス
subcategory: フィードバック制御
complexity: O(n³)(1回のリカッチ方程式求解、nは状態変数の次元数。γに関する反復探索を伴う)
summary: モデルの不確かさや外乱に対する最悪ケースの影響(伝達関数のH∞ノルム)を最小化するように設計する頑健制御手法で、統計的な期待値ベースの最適制御である[LQR](/algorithms/lqr-control)とは頑健性の考え方と想定する不確かさの種類が異なる。
---

## 概要

[LQR](/algorithms/lqr-control)は「状態のずれ」と「制御入力の大きさ」を重み付けしたコスト関数の**期待値**(あるいは積分値)を最小化するという、平均的・統計的な性能を最適化する制御手法である。しかし、この最適性は前提としたシステムモデル(`A`、`B`)が正確であることに強く依存しており、モデル化しきれない誤差や予測できない外乱が、最悪の場合にどれだけ性能を悪化させうるかについては何も保証しない。H∞制御は、この弱点に正面から取り組む頑健制御(ロバスト制御)理論の代表格である——外乱から制御性能に関わる出力までの伝達関数について、あらゆる周波数にわたる最悪ケースの増幅率(**H∞ノルム**、伝達関数のゲインの周波数特性における最大値)を最小化するように制御器を設計する。「平均的にうまくいく」ことを目指すLQRに対し、H∞制御は「最悪の場合でもここまでしか悪化しない」という保証を数学的に組み込む、より保守的だが頑健な設計哲学を取る。

## 仕組み

1. 制御対象のシステムを、通常の制御入力`u`に加えて、モデル化されていない外乱や不確かさを表す入力`w`(worst-case disturbance)を明示的に含む形で定式化する。また、制御性能を評価したい出力(誤差や制御入力の大きさなど)を`z`(evaluation output)として定義する
2. `w`から`z`までの伝達関数`T_zw`を考える。この伝達関数の**H∞ノルム**(すべての周波数にわたるゲインの最大値、`||T_zw||∞`)は、「外乱`w`がどんな周波数成分・どんな大きさで入ってきても、評価出力`z`への影響がどれだけ増幅されうるか」という最悪ケースの感度を表す
3. この`||T_zw||∞`を、ある閾値`γ`より小さく抑えられる制御器`K`が存在するかどうかを判定する問題(`γ`抑制問題)として定式化する——`γ`が小さいほど厳しい頑健性の要求になる
4. `γ`抑制問題は、2つのリカッチ方程式(LQRの代数リカッチ方程式を拡張した形)を解くことに帰着する。与えられた`γ`に対してこれらのリカッチ方程式が適切な解(正定対称解)を持つかどうかを確認し、持つ場合はその解から制御器`K`のゲインを構成できる
5. 実現可能な最小の`γ`(達成可能な最良の頑健性)を求めるため、`γ`の値を二分探索的に反復して試し、リカッチ方程式が解を持つ最小の`γ`とそのときの制御器を求める(この反復を伴う点が、LQRの1回のリカッチ方程式求解と異なる)

## 特性・トレードオフ

- **計算量**: 1つの`γ`に対するリカッチ方程式の求解は状態変数の次元数`n`に対して[LQR](/algorithms/lqr-control)と同様`O(n³)`程度だが、H∞制御では最適な`γ`を求めるためにこの求解を`γ`を変えながら複数回(二分探索的に)繰り返す必要があり、全体の設計コストはLQRより高い——ただしこれもオフラインで(制御実行前に)1回だけ行えばよく、実際の制御ループでの計算負荷はLQRと同様に軽い
- **[LQR](/algorithms/lqr-control)との頑健性の考え方の違い**: LQRは外乱や誤差を統計的な性質(ガウス性のノイズなど、[カルマンフィルタ](/algorithms/kalman-filter)と組み合わせるLQGの文脈でよく仮定される)を持つものとして扱い、コストの**期待値**を最小化する——平均的にはよい性能が出るが、極端な外乱や大きなモデル誤差に対しては性能の保証がない。H∞制御は外乱を「エネルギーが有界な、任意の(最悪の)信号」として扱い、その**最悪ケース**の影響を最小化する——結果として、モデル誤差や予測できない外乱に対して数学的に保証された頑健性を持つが、平均的な性能(外乱が穏やかな典型的な状況での性能)はLQRに劣ることが多い、という設計上のトレードオフがある
- **想定する不確かさの種類の違い**: LQRが正確なモデルを前提とした上で確率的なノイズにのみ対処するのに対し、H∞制御は「システムのモデル自体が、ある範囲内で真の系とずれているかもしれない」という**構造化・非構造化不確かさ**を明示的に扱える枠組みを持つ(小ゲイン定理に基づく頑健安定性解析と結びつく)。この違いから、H∞制御はモデル化誤差が大きい、あるいはシステムのパラメータが運用中に変動しうる系(温度変化で特性が変わる機械系、負荷変動のある航空機など)により適している
- **保守性という代償**: 最悪ケースを保証するという性質上、H∞制御器はしばしば「起こりうる最悪の状況」に備えて過度に慎重な(ゲインを抑えた、あるいは応答を遅くした)制御則になりやすく、実際にはめったに起こらない最悪ケースのために平常時の性能を犠牲にしているとも言える——この保守性をどこまで許容するかは、`γ`の選び方や設計時の重み付け関数の選定という形で設計者の判断に委ねられる
- **使いどころ**: 航空機やロケットのように運用条件(高度、速度、積載量)によって力学特性が大きく変動する系の頑健な姿勢制御、外乱やモデル誤差の影響が致命的になりうる精密機器・半導体製造装置の振動抑制制御、パラメータの不確かさが大きい産業プラントの制御、[LQR](/algorithms/lqr-control)やLQGでは頑健性が不足すると判断された場合の代替設計

## 実装例

`γ`抑制問題を、正定対称行列`P`に関するリカッチ方程式`AᵀP + PA + P(γ⁻²BwBwᵀ - BuBuᵀ)P + Q = 0`の反復解法(値反復)で近似的に解き、フィードバックゲイン`K = -BuᵀP`を構成する簡易実装。`Bw`は外乱入力の行列、`Bu`は制御入力の行列。

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


def mat_scale(a: Matrix, s: float) -> Matrix:
    return [[a[i][j] * s for j in range(len(a[0]))] for i in range(len(a))]


def solve_hinf_riccati(a: Matrix, bu: Matrix, bw: Matrix, q: Matrix, gamma: float,
                        iterations: int = 3000, dt: float = 1e-3) -> Matrix:
    """Aリカッチ方程式の右辺をP方向の勾配とみなし、P <- P + dt*(勾配)で数値的に定常解へ収束させる。"""
    n = len(a)
    p = [[0.0] * n for _ in range(n)]
    at = mat_transpose(a)
    but = mat_transpose(bu)
    bwt = mat_transpose(bw)
    bu_but = mat_mul(bu, but)
    bw_bwt = mat_mul(bw, bwt)
    disturbance_term = mat_scale(bw_bwt, 1.0 / (gamma ** 2))
    for _ in range(iterations):
        pa = mat_mul(p, a)
        p_mid = mat_sub(disturbance_term, bu_but)
        p_p_mid_p = mat_mul(mat_mul(p, p_mid), p)
        residual = mat_add(mat_add(mat_mul(at, p), pa), mat_add(p_p_mid_p, q))
        p = mat_add(p, mat_scale(residual, dt))
    return p


def compute_hinf_gain(a: Matrix, bu: Matrix, bw: Matrix, q: Matrix, gamma: float) -> Matrix:
    """フィードバックゲイン K = -BuT P (制御則 u = Kx) を計算する。"""
    p = solve_hinf_riccati(a, bu, bw, q, gamma)
    but = mat_transpose(bu)
    return mat_scale(mat_mul(but, p), -1.0)
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

function matScale(a: Matrix, s: number): Matrix {
  return a.map((row) => row.map((v) => v * s));
}

// Aリカッチ方程式の右辺をP方向の勾配とみなし、P <- P + dt*(勾配)で数値的に定常解へ収束させる
function solveHinfRiccati(
  a: Matrix, bu: Matrix, bw: Matrix, q: Matrix, gamma: number,
  iterations = 3000, dt = 1e-3
): Matrix {
  const n = a.length;
  let p: Matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  const at = matTranspose(a);
  const but = matTranspose(bu);
  const bwt = matTranspose(bw);
  const buBut = matMul(bu, but);
  const bwBwt = matMul(bw, bwt);
  const disturbanceTerm = matScale(bwBwt, 1 / (gamma * gamma));
  for (let iter = 0; iter < iterations; iter++) {
    const pa = matMul(p, a);
    const pMid = matSub(disturbanceTerm, buBut);
    const pPMidP = matMul(matMul(p, pMid), p);
    const residual = matAdd(matAdd(matMul(at, p), pa), matAdd(pPMidP, q));
    p = matAdd(p, matScale(residual, dt));
  }
  return p;
}

// フィードバックゲイン K = -BuT P (制御則 u = Kx) を計算する
function computeHinfGain(a: Matrix, bu: Matrix, bw: Matrix, q: Matrix, gamma: number): Matrix {
  const p = solveHinfRiccati(a, bu, bw, q, gamma);
  const but = matTranspose(bu);
  return matScale(matMul(but, p), -1);
}
```
