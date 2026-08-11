---
name: 球面線形補間によるスケルタルアニメーションブレンディング(Slerp)
category: CG・3Dレンダリング
subcategory: アニメーション
complexity: O(B)(Bはボーン数、1フレームあたり)
summary: ボーンの回転をクォータニオンで表現し、2つのアニメーション間を球面上で最短距離を保って補間(Slerp)することで、歩行から走行への遷移などを不自然な歪みなく滑らかにつなぐ。
---

## 概要

[線形ブレンドスキニング](/algorithms/linear-blend-skinning)は「ある瞬間のボーンの姿勢」からメッシュの頂点位置を求める仕組みだったが、実際のゲームでは「歩きアニメーションから走りアニメーションへ」のように、**複数のアニメーション同士を滑らかに遷移させる**必要がある。各ボーンの回転をオイラー角(X/Y/Z軸それぞれの回転角度)で持ったまま単純に数値を線形補間すると、ジンバルロック(特定の姿勢で自由度が失われる現象)や、回転の経路が不自然にねじれる問題が起きる。この問題を避けるため、実務ではボーンの回転を**クォータニオン(四元数)** で表現し、2つの回転の間を「回転を表す4次元空間の単位球面上で、最短経路をたどりながら」補間する**球面線形補間(Slerp: Spherical Linear Interpolation)** を使う。ケン・シューメイクが1985年にCG分野に導入したこの手法は、以後スケルタルアニメーションのブレンディングにおける事実上の標準になっている。

## 仕組み

1. 各ボーンの回転をクォータニオン`q = (w, x, y, z)`(単位四元数、`|q|=1`)として表現する。クォータニオンは3次元の回転を、ジンバルロックを起こさずに滑らかに表現できる数学的な道具である
2. 2つのアニメーション(例: 歩行の姿勢`q1`と走行の姿勢`q2`)の間を、補間係数`t`(0=完全に`q1`、1=完全に`q2`)でブレンドしたい
3. 2つのクォータニオンの内積`cos(θ) = q1・q2`を計算する。これは4次元単位球面上での2点間の角度`θ`に相当する
4. 内積が負の場合は、`q2`を`-q2`に反転する(クォータニオンは`q`と`-q`が同じ回転を表すため、短い方の経路を選ぶための処理)
5. **Slerpの公式**を適用する:`slerp(q1, q2, t) = [sin((1-t)θ)/sin θ]・q1 + [sin(tθ)/sin θ]・q2`。これにより、単位球面上を**一定の角速度で**移動する経路が得られる(単純な線形補間`(1-t)q1 + t・q2`を正規化しただけでは、球面上での移動速度が場所によって不均一になり、アニメーションの速度にムラが出る)
6. `θ`が非常に小さい(ほぼ同じ回転)場合は、数値的な不安定さを避けるため通常の線形補間(Nlerp、正規化線形補間)にフォールバックする
7. 全てのボーンについて1〜6を行い、ブレンドされたポーズでスキニングを行うことで、2つのアニメーション間の滑らかな遷移が得られる

## 特性・トレードオフ

- **ジンバルロックの回避**: オイラー角による補間は、特定の姿勢で1つの回転軸が失われる「ジンバルロック」を起こしうるが、クォータニオンによるSlerpはこの問題を原理的に持たない。3Dキャラクターアニメーションでオイラー角ではなくクォータニオンが標準的に使われる最大の理由の一つ
- **等角速度の補間**: Slerpは球面上を一定の角速度でたどるため、回転の速さが補間係数`t`に対して均一になる。単純な線形補間+正規化(Nlerp)は経路の始点・終点付近で速度が速くなる歪みを持つが、実務上はNlerpの方が計算コストが低く、視覚的な差が小さい場面ではNlerpで代用されることも多い(Slerpは三角関数の計算が必要でわずかに重い)
- **複数アニメーションのブレンドへの拡張**: 2つのポーズ間のSlerpを応用し、複数のアニメーション(歩行・走行・しゃがみなど)を状態遷移やブレンドツリー(Blend Tree)として組み合わせることで、パラメータ(移動速度など)に応じて滑らかに変化するアニメーションを構築できる。この仕組みはUnityのAnimatorやUnreal EngineのAnimation Blueprintの中核をなす
- **使いどころ**: 3Dゲームキャラクターのアニメーション遷移(歩行↔走行、待機↔攻撃)、カメラワークの滑らかな回転補間、ロボティクスにおける姿勢制御の軌道生成、VRアバターの追従アニメーション

## 実装例

```python
import math

def quat_dot(q1: tuple[float, float, float, float], q2: tuple[float, float, float, float]) -> float:
    return sum(a * b for a, b in zip(q1, q2))

def quat_negate(q: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    return tuple(-c for c in q)

def slerp(
    q1: tuple[float, float, float, float], q2: tuple[float, float, float, float], t: float,
) -> tuple[float, float, float, float]:
    dot = quat_dot(q1, q2)
    if dot < 0.0:
        q2 = quat_negate(q2)
        dot = -dot

    dot = min(1.0, dot)
    theta = math.acos(dot)

    if theta < 1e-6:
        # ほぼ同じ回転: 線形補間+正規化(Nlerp)にフォールバックする
        blended = tuple((1 - t) * a + t * b for a, b in zip(q1, q2))
        norm = math.sqrt(sum(c * c for c in blended))
        return tuple(c / norm for c in blended)

    sin_theta = math.sin(theta)
    w1 = math.sin((1 - t) * theta) / sin_theta
    w2 = math.sin(t * theta) / sin_theta
    return tuple(w1 * a + w2 * b for a, b in zip(q1, q2))
```

```typescript
type Quat = [number, number, number, number];

function quatDot(q1: Quat, q2: Quat): number {
  return q1.reduce((sum, v, i) => sum + v * q2[i], 0);
}

function slerp(q1: Quat, q2v: Quat, t: number): Quat {
  let dot = quatDot(q1, q2v);
  let q2 = q2v;
  if (dot < 0) {
    q2 = q2.map((c) => -c) as Quat;
    dot = -dot;
  }
  dot = Math.min(1, dot);
  const theta = Math.acos(dot);

  if (theta < 1e-6) {
    const blended = q1.map((a, i) => (1 - t) * a + t * q2[i]) as Quat;
    const norm = Math.sqrt(blended.reduce((s, c) => s + c * c, 0));
    return blended.map((c) => c / norm) as Quat;
  }

  const sinTheta = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sinTheta;
  const w2 = Math.sin(t * theta) / sinTheta;
  return q1.map((a, i) => w1 * a + w2 * q2[i]) as Quat;
}
```

```cpp
#include <array>
#include <cmath>
#include <algorithm>

using Quat = std::array<double, 4>;

double quatDot(const Quat& q1, const Quat& q2) {
    double s = 0.0;
    for (int i = 0; i < 4; i++) s += q1[i] * q2[i];
    return s;
}

Quat slerp(const Quat& q1, Quat q2, double t) {
    double dot = quatDot(q1, q2);
    if (dot < 0.0) {
        for (auto& c : q2) c = -c;
        dot = -dot;
    }
    dot = std::min(1.0, dot);
    double theta = std::acos(dot);

    if (theta < 1e-6) {
        Quat blended;
        double norm = 0.0;
        for (int i = 0; i < 4; i++) {
            blended[i] = (1 - t) * q1[i] + t * q2[i];
            norm += blended[i] * blended[i];
        }
        norm = std::sqrt(norm);
        for (auto& c : blended) c /= norm;
        return blended;
    }

    double sinTheta = std::sin(theta);
    double w1 = std::sin((1 - t) * theta) / sinTheta;
    double w2 = std::sin(t * theta) / sinTheta;
    Quat result;
    for (int i = 0; i < 4; i++) result[i] = w1 * q1[i] + w2 * q2[i];
    return result;
}
```

```rust
type Quat = [f64; 4];

fn quat_dot(q1: &Quat, q2: &Quat) -> f64 {
    q1.iter().zip(q2.iter()).map(|(a, b)| a * b).sum()
}

fn slerp(q1: &Quat, q2_in: &Quat, t: f64) -> Quat {
    let mut dot = quat_dot(q1, q2_in);
    let mut q2 = *q2_in;
    if dot < 0.0 {
        q2 = q2.map(|c| -c);
        dot = -dot;
    }
    dot = dot.min(1.0);
    let theta = dot.acos();

    if theta < 1e-6 {
        let mut blended = [0.0; 4];
        let mut norm = 0.0;
        for i in 0..4 {
            blended[i] = (1.0 - t) * q1[i] + t * q2[i];
            norm += blended[i] * blended[i];
        }
        norm = norm.sqrt();
        return blended.map(|c| c / norm);
    }

    let sin_theta = theta.sin();
    let w1 = ((1.0 - t) * theta).sin() / sin_theta;
    let w2 = (t * theta).sin() / sin_theta;
    let mut result = [0.0; 4];
    for i in 0..4 {
        result[i] = w1 * q1[i] + w2 * q2[i];
    }
    result
}
```

```csharp
static double QuatDot(double[] q1, double[] q2)
{
    double s = 0;
    for (int i = 0; i < 4; i++) s += q1[i] * q2[i];
    return s;
}

static double[] Slerp(double[] q1, double[] q2In, double t)
{
    double dot = QuatDot(q1, q2In);
    var q2 = (double[])q2In.Clone();
    if (dot < 0)
    {
        for (int i = 0; i < 4; i++) q2[i] = -q2[i];
        dot = -dot;
    }
    dot = Math.Min(1.0, dot);
    double theta = Math.Acos(dot);

    if (theta < 1e-6)
    {
        var blended = new double[4];
        double norm = 0;
        for (int i = 0; i < 4; i++)
        {
            blended[i] = (1 - t) * q1[i] + t * q2[i];
            norm += blended[i] * blended[i];
        }
        norm = Math.Sqrt(norm);
        for (int i = 0; i < 4; i++) blended[i] /= norm;
        return blended;
    }

    double sinTheta = Math.Sin(theta);
    double w1 = Math.Sin((1 - t) * theta) / sinTheta;
    double w2 = Math.Sin(t * theta) / sinTheta;
    var result = new double[4];
    for (int i = 0; i < 4; i++) result[i] = w1 * q1[i] + w2 * q2[i];
    return result;
}
```
