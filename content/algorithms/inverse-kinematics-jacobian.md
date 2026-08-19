---
name: ヤコビアン逆運動学(数値解法)
category: 制御・ロボティクス
subcategory: 姿勢・軌道生成
complexity: O(k・n²)(kは反復回数、nは自由度数。ヤコビ行列の擬似逆行列計算が支配的)
summary: 多自由度アームの手先目標位置からヤコビ行列の擬似逆行列を使って関節角速度を反復的に求める数値的な逆運動学解法で、2自由度限定の解析解である[逆運動学(2リンクアーム)](/algorithms/inverse-kinematics-2link)を任意自由度のアームへ一般化したもの。
---

## 概要

[逆運動学(2リンクアームの解析解)](/algorithms/inverse-kinematics-2link)は、肩と肘の2関節だけを持つ単純なアームであれば、余弦定理を使って関節角度を閉形式の数式として直接求められる。しかし人間の腕のような6自由度以上を持つ複雑なロボットアームでは、関節数が増えるにつれて解析的な閉形式解を求めることが極めて困難になる(多くの場合、解析解自体が存在しない)。ヤコビアン逆運動学は、この問題を**数値的な反復計算**で解決する——現在の関節角度における手先位置と目標位置とのずれ(誤差)を、ヤコビ行列(関節角速度と手先速度の関係を表す行列)の擬似逆行列を使って「この誤差を小さくするにはどの関節をどれだけ動かせばよいか」という関節角速度に変換し、その角速度に沿って少しずつ関節角度を更新することを繰り返す。閉形式の数式を一発で解く代わりに、ニュートン法のように「現在の解から少しずつ真の解へ近づいていく」という反復的なアプローチを取ることで、任意の自由度数のアームに一般化できる。

## 仕組み

1. アームの各リンク長・関節角度から、順運動学によって現在の手先位置`x_current`を計算する(各関節角度が決まればアームの形状と手先位置は一意に定まる)
2. 目標位置`x_target`との誤差`e = x_target - x_current`を計算する
3. 現在の関節角度における**ヤコビ行列`J`**を計算する。ヤコビ行列は「各関節の角速度がわずかに変化したときに、手先位置がどの方向にどれだけ変化するか」を表す偏微分の行列であり、`ẋ = J・θ̇`(手先速度は関節角速度の線形変換で表される)という関係を持つ
4. この関係を逆に使い、「手先を誤差`e`の方向に動かすには、関節角速度をどう設定すればよいか」を、ヤコビ行列の**擬似逆行列`J⁺`**(正方行列でない場合や特異な場合でも安定して計算できる一般化された逆行列)を使って`Δθ = J⁺・e`として求める
5. 求めた`Δθ`にステップ幅(学習率のようなスケーリング係数)をかけて関節角度を`θ ← θ + α・Δθ`と更新する
6. 手順1〜5を、誤差`e`が十分小さくなる(手先が目標位置に十分近づく)まで、または最大反復回数に達するまで繰り返す

## 特性・トレードオフ

- **計算量**: 1回の反復あたり、ヤコビ行列の計算と擬似逆行列の計算(特異値分解や`J^T(JJ^T)⁻¹`のような形で計算されることが多い)が自由度数`n`に対しておおむね`O(n²)`〜`O(n³)`程度、これを収束するまで`k`回繰り返すため全体で`O(k・n²)`程度——[逆運動学(2リンクアーム)](/algorithms/inverse-kinematics-2link)の解析解が`O(1)`で即座に厳密解を返すのに対し、反復による近似解法である分、計算コストは高く、また必ずしも収束が保証されるわけではない
- **[逆運動学(2リンクアーム)の解析解](/algorithms/inverse-kinematics-2link)との対比**: 2リンクアームの解析解は特定の(2自由度という)構造に特化した閉形式の数式であり、自由度が変わればゼロから数式を導出し直す必要がある。ヤコビアン逆運動学は「ヤコビ行列を計算し、その擬似逆行列で誤差を関節角速度に変換する」という同一の手続きが、3自由度でも7自由度でも(冗長自由度を持つアームでも)そのまま適用できる汎用性が最大の利点である——ただし解の一意性は失われ、冗長自由度がある場合は誤差を打ち消す関節角速度の組み合わせが無数に存在しうる
- **特異点(singularity)での不安定性**: アームが完全に伸びきった姿勢など、ヤコビ行列がランク落ちする「特異点」付近では、擬似逆行列の計算が不安定になり、関節角速度が非現実的に大きな値を取ることがある——この問題を緩和するため、擬似逆行列の代わりに減衰最小二乗法(damped least squares、`J^T(JJ^T + λI)⁻¹`のように正則化項を加える)を使うことが実務では一般的である
- **局所解と初期姿勢への依存**: [ニュートン法](/algorithms/newton-method)と同様、反復計算は現在の関節角度(初期姿勢)から出発して局所的に誤差を減らしていくため、目標位置によっては望ましくない姿勢の局所解に収束したり、収束自体に失敗したりすることがある——初期姿勢の選び方や、複数の初期値からの再試行が実務上重要になる
- **使いどころ**: 6自由度以上を持つ産業用ロボットアームやヒューマノイドロボットの手先・足先の位置制御、CGアニメーションやゲームでのキャラクターの手足のリアルタイムなIK処理(冗長自由度を活かした自然な姿勢生成)、VR/モーションキャプチャでの骨格へのリターゲティング、宇宙用マニピュレータのような特異点回避が重要な高自由度アームの制御

## 実装例

N関節の平面アーム(各関節が独立に回転する直列リンク)を対象に、数値微分でヤコビ行列を求め、減衰最小二乗法による擬似逆行列で関節角度を反復更新する。

```python
import math

Point = tuple[float, float]


def forward_kinematics(link_lengths: list[float], angles: list[float]) -> Point:
    """各関節の累積角度からアーム先端の位置を計算する。"""
    x, y, cum_angle = 0.0, 0.0, 0.0
    for length, angle in zip(link_lengths, angles):
        cum_angle += angle
        x += length * math.cos(cum_angle)
        y += length * math.sin(cum_angle)
    return x, y


def numerical_jacobian(link_lengths: list[float], angles: list[float], eps: float = 1e-6) -> list[list[float]]:
    """手先位置(x, y)を各関節角度で偏微分した2×nのヤコビ行列を数値微分で求める。"""
    n = len(angles)
    base_x, base_y = forward_kinematics(link_lengths, angles)
    jacobian = [[0.0] * n for _ in range(2)]
    for j in range(n):
        perturbed = angles[:]
        perturbed[j] += eps
        px, py = forward_kinematics(link_lengths, perturbed)
        jacobian[0][j] = (px - base_x) / eps
        jacobian[1][j] = (py - base_y) / eps
    return jacobian


def damped_pseudo_inverse_solve(jacobian: list[list[float]], error: list[float], damping: float = 0.1) -> list[float]:
    """減衰最小二乗法: delta_theta = J^T (J J^T + damping^2 I)^-1 error を2x2の連立方程式として直接解く。"""
    j = jacobian
    jjt00 = j[0][0] ** 2 + j[0][1] ** 2 + damping ** 2
    jjt01 = j[0][0] * j[1][0] + j[0][1] * j[1][1]
    jjt11 = j[1][0] ** 2 + j[1][1] ** 2 + damping ** 2
    det = jjt00 * jjt11 - jjt01 * jjt01
    if abs(det) < 1e-12:
        return [0.0] * len(j[0])
    inv00, inv01, inv11 = jjt11 / det, -jjt01 / det, jjt00 / det
    y0 = inv00 * error[0] + inv01 * error[1]
    y1 = inv01 * error[0] + inv11 * error[1]
    n = len(j[0])
    return [j[0][k] * y0 + j[1][k] * y1 for k in range(n)]


def solve_ik_jacobian(link_lengths: list[float], initial_angles: list[float], target: Point,
                       max_iter: int = 200, step: float = 0.5, tol: float = 1e-4,
                       damping: float = 0.1) -> list[float]:
    angles = initial_angles[:]
    for _ in range(max_iter):
        current = forward_kinematics(link_lengths, angles)
        error = [target[0] - current[0], target[1] - current[1]]
        if math.hypot(*error) < tol:
            break
        jacobian = numerical_jacobian(link_lengths, angles)
        delta = damped_pseudo_inverse_solve(jacobian, error, damping)
        angles = [a + step * d for a, d in zip(angles, delta)]
    return angles
```

```typescript
type Point = [number, number];

function forwardKinematics(linkLengths: number[], angles: number[]): Point {
  let x = 0, y = 0, cumAngle = 0;
  for (let i = 0; i < linkLengths.length; i++) {
    cumAngle += angles[i];
    x += linkLengths[i] * Math.cos(cumAngle);
    y += linkLengths[i] * Math.sin(cumAngle);
  }
  return [x, y];
}

function numericalJacobian(linkLengths: number[], angles: number[], eps = 1e-6): number[][] {
  const n = angles.length;
  const [baseX, baseY] = forwardKinematics(linkLengths, angles);
  const jacobian: number[][] = [new Array(n).fill(0), new Array(n).fill(0)];
  for (let j = 0; j < n; j++) {
    const perturbed = [...angles];
    perturbed[j] += eps;
    const [px, py] = forwardKinematics(linkLengths, perturbed);
    jacobian[0][j] = (px - baseX) / eps;
    jacobian[1][j] = (py - baseY) / eps;
  }
  return jacobian;
}

function dampedPseudoInverseSolve(jacobian: number[][], error: [number, number], damping = 0.1): number[] {
  const j = jacobian;
  const jjt00 = j[0][0] ** 2 + j[0][1] ** 2 + damping ** 2;
  const jjt01 = j[0][0] * j[1][0] + j[0][1] * j[1][1];
  const jjt11 = j[1][0] ** 2 + j[1][1] ** 2 + damping ** 2;
  const det = jjt00 * jjt11 - jjt01 * jjt01;
  const n = j[0].length;
  if (Math.abs(det) < 1e-12) return new Array(n).fill(0);
  const inv00 = jjt11 / det, inv01 = -jjt01 / det, inv11 = jjt00 / det;
  const y0 = inv00 * error[0] + inv01 * error[1];
  const y1 = inv01 * error[0] + inv11 * error[1];
  return Array.from({ length: n }, (_, k) => j[0][k] * y0 + j[1][k] * y1);
}

function solveIkJacobian(
  linkLengths: number[], initialAngles: number[], target: Point,
  maxIter = 200, step = 0.5, tol = 1e-4, damping = 0.1
): number[] {
  let angles = [...initialAngles];
  for (let i = 0; i < maxIter; i++) {
    const current = forwardKinematics(linkLengths, angles);
    const error: [number, number] = [target[0] - current[0], target[1] - current[1]];
    if (Math.hypot(error[0], error[1]) < tol) break;
    const jacobian = numericalJacobian(linkLengths, angles);
    const delta = dampedPseudoInverseSolve(jacobian, error, damping);
    angles = angles.map((a, k) => a + step * delta[k]);
  }
  return angles;
}
```
