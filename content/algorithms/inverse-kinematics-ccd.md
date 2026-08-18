---
name: CCD法(Cyclic Coordinate Descent)による逆運動学
category: CG・3Dレンダリング
subcategory: アニメーション
complexity: O(n)(nは関節数、1回の反復あたり)
summary: 関節チェーンの末端(エンドエフェクタ)から根元に向かって、各関節を1つずつ「目標に最も近づく角度」へ回転させていくことを繰り返す、行列計算を必要としない古典的な逆運動学の反復解法。
---

## 概要

CCD法(Cyclic Coordinate Descent, 巡回座標降下法)は、関節チェーンの先端(エンドエフェクタ)を目標位置に近づける逆運動学(Inverse Kinematics, IK)の解法の一つで、1990年代からロボティクスやCGアニメーションで使われてきた古典的な反復手法である。[逆運動学(2リンクアームの解析解)](/algorithms/inverse-kinematics-2link)が関節数2のケースを三角関数で厳密に解いたのに対し、CCD法は任意の関節数のチェーンを、**エンドエフェクタに最も近い関節から根元に向かって1関節ずつ順番に、その関節を回転させたときにエンドエフェクタが最も目標に近づく角度を計算して回転させる**という単純な操作の繰り返しで解く。行列の逆行列やヤコビ行列の擬似逆行列といった線形代数を必要とせず、各ステップが「2つのベクトルのなす角を求めて回転させる」という直感的な幾何学計算だけで完結するため、実装が容易で古くから広く使われてきた。[FABRIK法](/algorithms/fabrik-ik)がより新しく収束の速い代替手法として提案されたのは、CCD法が抱えるいくつかの弱点(後述)を克服するためである。

## 仕組み

1. 関節チェーンの各関節の位置`p_0, p_1, ..., p_n`(`p_0`が根本、`p_n`がエンドエフェクタ)と、各関節の現在の回転角(またはローカル姿勢)、目標位置`target`を用意する
2. **エンドエフェクタに最も近い関節から処理を開始する**(`p_{n-1}`、つまりチェーンの末端の1つ手前の関節)。この関節から見て、現在のエンドエフェクタ`p_n`への方向ベクトルと、目標`target`への方向ベクトルをそれぞれ求める
3. この2つのベクトルのなす角度と回転軸を計算し、その関節を「エンドエフェクタが目標方向を向くように」回転させる(3Dの場合、回転軸は2ベクトルの外積、角度は内積から求まる)。関節に可動域の制約があれば、ここで角度をクランプする
4. 1つ根本側の関節(`p_{n-2}`)に処理を移し、同様に「その関節からエンドエフェクタへのベクトル」と「その関節から目標へのベクトル」のなす角度だけ回転させる。これを根本の関節`p_0`まで繰り返す(1回のチェーン全体の処理を「1イテレーション」と呼ぶ)
5. 根本まで到達したら、再びエンドエフェクタに近い関節から同じ処理を繰り返す。エンドエフェクタと目標の距離が十分小さくなるか、最大反復回数に達するまでこれを続ける。各関節の回転は「その時点で最も貪欲にエンドエフェクタを目標へ近づける」ローカルな最適化であり、全体としては目標に単調に近づいていくことが多いが、大域的な最適解を保証するものではない

## 特性・トレードオフ

- **実装の単純さと低メモリ**: 各ステップが2ベクトル間の角度計算だけで完結し、ヤコビ行列や行列分解のような重い線形代数を必要としないため、実装が軽量でメモリ消費も小さい。組み込み向けやリソースが限られる環境でも扱いやすい
- **収束の遅さと不自然な巻きつき**: [FABRIK法](/algorithms/fabrik-ik)と比べ、CCD法は根本に近い関節ほど大きく振れ回るように収束することがあり、特に関節数が多いチェーンでは目標に達するまでに多くの反復を要したり、「らせん状に巻きつく」ような不自然な中間姿勢を経由することがある
- **局所解に陥りやすい**: 各関節を貪欲にエンドエフェクタに最も近づく角度へ回転させる手法であるため、チェーンの構造や目標の位置によっては、大域的にはより良い解があるにもかかわらず局所的な配置に収束してしまうことがある
- **関節制約との相性の良さ**: 1関節ずつ独立に回転を計算するため、各関節に個別の可動域制限(肘は逆に曲がらない、など)を課すのが比較的容易で、ステップ3で角度をクランプするだけで自然に制約を組み込める。この点は、複数関節を同時に扱う手法よりも制約の実装がシンプルになりやすい
- **使いどころ**: ロボットアームの姿勢制御、レガシーなゲームエンジンやツールでの簡易IK実装、関節数が少なく制約が明確なチェーン(指の関節など)、[FABRIK法](/algorithms/fabrik-ik)や[FABRIK法](/algorithms/fabrik-ik)を導入するコストに見合わない小規模なプロジェクトでの手軽なIK解法

## 実装例

2次元平面上の関節チェーンに対するCCD法の中核ロジック(末端から根本に向かって1関節ずつ角度を求めて回転させる処理)を示す。

```python
import math

Vec2 = tuple[float, float]

def subtract(a: Vec2, b: Vec2) -> Vec2:
    return (a[0] - b[0], a[1] - b[1])

def angle_of(v: Vec2) -> float:
    return math.atan2(v[1], v[0])

def rotate_point_around(point: Vec2, pivot: Vec2, delta_angle: float) -> Vec2:
    rel = subtract(point, pivot)
    c, s = math.cos(delta_angle), math.sin(delta_angle)
    rotated = (rel[0] * c - rel[1] * s, rel[0] * s + rel[1] * c)
    return (pivot[0] + rotated[0], pivot[1] + rotated[1])

def distance(a: Vec2, b: Vec2) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])

def ccd_ik(
    joints: list[Vec2], target: Vec2, tolerance: float = 0.01, max_iterations: int = 20,
) -> list[Vec2]:
    """joints[0]が根本、joints[-1]がエンドエフェクタ。骨の長さは各関節間の距離として暗黙的に保持される。"""
    points = list(joints)
    n = len(points)

    for _ in range(max_iterations):
        if distance(points[-1], target) < tolerance:
            break

        # エンドエフェクタに近い関節(n-2)から根本(0)へ向かって1つずつ処理する
        for i in range(n - 2, -1, -1):
            pivot = points[i]
            to_end_effector = subtract(points[-1], pivot)
            to_target = subtract(target, pivot)

            angle_diff = angle_of(to_target) - angle_of(to_end_effector)
            # -pi〜piに正規化
            angle_diff = (angle_diff + math.pi) % (2 * math.pi) - math.pi

            # pivotより先端側(i+1以降)の全関節を、pivotを中心にangle_diffだけ回転させる
            for j in range(i + 1, n):
                points[j] = rotate_point_around(points[j], pivot, angle_diff)

            if distance(points[-1], target) < tolerance:
                break

    return points
```

```typescript
type Vec2 = [number, number];

function subtract(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

function angleOf(v: Vec2): number {
  return Math.atan2(v[1], v[0]);
}

function rotatePointAround(point: Vec2, pivot: Vec2, deltaAngle: number): Vec2 {
  const rel = subtract(point, pivot);
  const c = Math.cos(deltaAngle),
    s = Math.sin(deltaAngle);
  const rotated: Vec2 = [rel[0] * c - rel[1] * s, rel[0] * s + rel[1] * c];
  return [pivot[0] + rotated[0], pivot[1] + rotated[1]];
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function ccdIk(
  joints: Vec2[],
  target: Vec2,
  tolerance = 0.01,
  maxIterations = 20,
): Vec2[] {
  // points[0]が根本、points[points.length-1]がエンドエフェクタ
  const points = [...joints];
  const n = points.length;

  for (let iter = 0; iter < maxIterations; iter++) {
    if (distance(points[n - 1], target) < tolerance) break;

    // エンドエフェクタに近い関節(n-2)から根本(0)へ向かって1つずつ処理する
    for (let i = n - 2; i >= 0; i--) {
      const pivot = points[i];
      const toEndEffector = subtract(points[n - 1], pivot);
      const toTarget = subtract(target, pivot);

      let angleDiff = angleOf(toTarget) - angleOf(toEndEffector);
      // -pi〜piに正規化
      angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

      // pivotより先端側(i+1以降)の全関節を、pivotを中心にangleDiffだけ回転させる
      for (let j = i + 1; j < n; j++) {
        points[j] = rotatePointAround(points[j], pivot, angleDiff);
      }

      if (distance(points[n - 1], target) < tolerance) break;
    }
  }

  return points;
}
```
