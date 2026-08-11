---
name: FABRIK法(逆運動学)
category: CG・3Dレンダリング
subcategory: アニメーション
complexity: O(n)(nは関節数、1回の反復あたり)
summary: 関節の角度ではなく「関節の位置」を直接、目標に向かって前方から後方へ、後方から前方へと交互に引っ張って収束させることで、行列やヤコビ行列を使わずにN関節の逆運動学を解く。
---

## 概要

「腕の先端(手先)をこの位置に持っていきたい」というとき、各関節がどの角度を取るべきかを求める問題を逆運動学(Inverse Kinematics, IK)と呼ぶ。[逆運動学(2リンクアームの解析解)](/algorithms/inverse-kinematics-2link)は関節数が2つの場合に三角関数で厳密に解けたが、関節数が3つ以上に増えると解は一意に定まらず(冗長自由度)、解析的に解くのが難しくなる。従来はヤコビ行列の擬似逆行列を使う数値的手法(CCD法、ヤコビ転置法など)が使われてきたが、FABRIK(Forward And Backward Reaching Inverse Kinematics)は2011年にアリスター・アリソン=ムーアが提案した手法で、**関節の「角度」ではなく「位置」を直接扱い、目標に向かって関節を一本の紐のように引っ張る**という幾何学的に直感的な反復法で、行列演算を一切使わずにN関節のIKを解く。

## 仕組み

1. 関節の位置`p_0, p_1, ..., p_n`(`p_0`が根本、`p_n`が先端)と、各関節間の骨の長さ`d_i = |p_i - p_{i-1}|`(固定)を用意する。目標位置`target`が与えられる
2. 目標が到達可能な範囲内にあるか確認する(全ての骨の長さの合計より目標が遠ければ、単純に全関節を目標方向へ一直線に伸ばして終了する)
3. **前方への反復(Forward Reaching)**: 先端`p_n`を目標位置`target`に強制的に移動させる。次に`p_{n-1}`を、`p_n`から骨の長さ`d_n`だけ離れた位置になるよう、元の`p_{n-1}`から`p_n`への方向線上に移動させる。これを根本に向かって`p_0`まで繰り返す(結果、根本`p_0`は元の位置からずれてしまう)
4. **後方への反復(Backward Reaching)**: 根本`p_0`を元の位置に強制的に戻す。次に`p_1`を、`p_0`から骨の長さ`d_1`だけ離れた位置になるよう、直前の`p_1`から`p_0`への方向線上に移動させる。これを先端に向かって`p_n`まで繰り返す
5. 3〜4を1回の反復として、先端`p_n`と目標`target`の距離が十分小さくなるまで繰り返す。各ステップが「2点間を骨の長さで結び直す」という単純な幾何学的操作だけであるため、収束が速く安定している

## 特性・トレードオフ

- **行列計算を必要としないシンプルさ**: ヤコビ行列やその擬似逆行列の計算を必要とするCCD法・ヤコビ転置法と異なり、FABRIKは「2点間の距離を保つように位置をずらす」という直感的な幾何学操作の繰り返しだけで済むため、実装が単純で理解しやすい
- **収束の速さと自然な姿勢**: 多くの場合、数回の反復で視覚的に十分な精度まで収束する。CCD法が根本から順に1関節ずつ角度を調整していく(ときに不自然な巻きつくような動きになりやすい)のに対し、FABRIKは前方・後方を交互に処理するため、より自然でスムーズな姿勢に収束しやすいとされる
- **関節角度の制約への対応**: 基本形のFABRIKは関節の可動域制限(肘が逆方向に曲がらない、など)を考慮しないため、人体のような現実的な制約を守るには追加の処理(各反復後に角度制約を満たすよう位置を補正する)が必要になる。この点は複雑な制約を統一的に扱えるヤコビ行列ベースの手法に対する弱点でもある
- **使いどころ**: キャラクターの手足・尻尾のようなマルチジョイントチェーンのIK(足を地面に接地させる、手を特定の位置に届かせる)、[モーションマッチング](/algorithms/motion-matching)と組み合わせた足の接地補正、ロボットアームの逆運動学、プロシージャルアニメーションにおけるリアルタイムなIK計算

## 実装例

```python
import math

Vec2 = tuple[float, float]

def distance(a: Vec2, b: Vec2) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])

def move_towards(from_pt: Vec2, to_pt: Vec2, dist: float) -> Vec2:
    d = distance(from_pt, to_pt) or 1e-9
    t = dist / d
    return (to_pt[0] + (from_pt[0] - to_pt[0]) * t, to_pt[1] + (from_pt[1] - to_pt[1]) * t)

def fabrik(
    joints: list[Vec2], bone_lengths: list[float], target: Vec2, tolerance: float = 0.01, max_iterations: int = 10,
) -> list[Vec2]:
    root = joints[0]
    total_length = sum(bone_lengths)

    if distance(root, target) > total_length:
        # 到達不能: 目標方向へ一直線に伸ばす
        result = [root]
        for length in bone_lengths:
            result.append(move_towards(result[-1], target, length))
        return result

    points = list(joints)
    for _ in range(max_iterations):
        if distance(points[-1], target) < tolerance:
            break

        # 前方への反復: 先端を目標へ、根本方向へ骨の長さを保ちつつ引っ張る
        points[-1] = target
        for i in range(len(points) - 2, -1, -1):
            points[i] = move_towards(points[i], points[i + 1], bone_lengths[i])

        # 後方への反復: 根本を元の位置へ、先端方向へ骨の長さを保ちつつ引っ張る
        points[0] = root
        for i in range(1, len(points)):
            points[i] = move_towards(points[i], points[i - 1], bone_lengths[i - 1])

    return points
```

```typescript
type Vec2 = [number, number];

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function moveTowards(from: Vec2, to: Vec2, dist: number): Vec2 {
  const d = distance(from, to) || 1e-9;
  const t = dist / d;
  return [to[0] + (from[0] - to[0]) * t, to[1] + (from[1] - to[1]) * t];
}

function fabrik(
  joints: Vec2[],
  boneLengths: number[],
  target: Vec2,
  tolerance = 0.01,
  maxIterations = 10,
): Vec2[] {
  const root = joints[0];
  const totalLength = boneLengths.reduce((a, b) => a + b, 0);

  if (distance(root, target) > totalLength) {
    const result: Vec2[] = [root];
    for (const length of boneLengths)
      result.push(moveTowards(result[result.length - 1], target, length));
    return result;
  }

  const points = [...joints];
  for (let iter = 0; iter < maxIterations; iter++) {
    if (distance(points[points.length - 1], target) < tolerance) break;

    points[points.length - 1] = target;
    for (let i = points.length - 2; i >= 0; i--) {
      points[i] = moveTowards(points[i], points[i + 1], boneLengths[i]);
    }

    points[0] = root;
    for (let i = 1; i < points.length; i++) {
      points[i] = moveTowards(points[i], points[i - 1], boneLengths[i - 1]);
    }
  }
  return points;
}
```

```cpp
#include <vector>
#include <cmath>
#include <numeric>

using Vec2 = std::pair<double, double>;

double distance(const Vec2& a, const Vec2& b) { return std::hypot(a.first - b.first, a.second - b.second); }

Vec2 moveTowards(const Vec2& from, const Vec2& to, double dist) {
    double d = distance(from, to);
    if (d < 1e-9) d = 1e-9;
    double t = dist / d;
    return {to.first + (from.first - to.first) * t, to.second + (from.second - to.second) * t};
}

std::vector<Vec2> fabrik(
    std::vector<Vec2> joints, const std::vector<double>& boneLengths, Vec2 target,
    double tolerance = 0.01, int maxIterations = 10) {
    Vec2 root = joints[0];
    double totalLength = std::accumulate(boneLengths.begin(), boneLengths.end(), 0.0);

    if (distance(root, target) > totalLength) {
        std::vector<Vec2> result = {root};
        for (double length : boneLengths) result.push_back(moveTowards(result.back(), target, length));
        return result;
    }

    std::vector<Vec2> points = joints;
    for (int iter = 0; iter < maxIterations; iter++) {
        if (distance(points.back(), target) < tolerance) break;

        points.back() = target;
        for (int i = static_cast<int>(points.size()) - 2; i >= 0; i--) {
            points[i] = moveTowards(points[i], points[i + 1], boneLengths[i]);
        }

        points[0] = root;
        for (size_t i = 1; i < points.size(); i++) {
            points[i] = moveTowards(points[i], points[i - 1], boneLengths[i - 1]);
        }
    }
    return points;
}
```

```rust
type Vec2 = (f64, f64);

fn distance(a: Vec2, b: Vec2) -> f64 {
    (a.0 - b.0).hypot(a.1 - b.1)
}

fn move_towards(from: Vec2, to: Vec2, dist: f64) -> Vec2 {
    let d = distance(from, to).max(1e-9);
    let t = dist / d;
    (to.0 + (from.0 - to.0) * t, to.1 + (from.1 - to.1) * t)
}

fn fabrik(joints: &[Vec2], bone_lengths: &[f64], target: Vec2, tolerance: f64, max_iterations: usize) -> Vec<Vec2> {
    let root = joints[0];
    let total_length: f64 = bone_lengths.iter().sum();

    if distance(root, target) > total_length {
        let mut result = vec![root];
        for &length in bone_lengths {
            let last = *result.last().unwrap();
            result.push(move_towards(last, target, length));
        }
        return result;
    }

    let mut points = joints.to_vec();
    for _ in 0..max_iterations {
        if distance(*points.last().unwrap(), target) < tolerance {
            break;
        }

        let n = points.len();
        points[n - 1] = target;
        for i in (0..n - 1).rev() {
            points[i] = move_towards(points[i], points[i + 1], bone_lengths[i]);
        }

        points[0] = root;
        for i in 1..n {
            points[i] = move_towards(points[i], points[i - 1], bone_lengths[i - 1]);
        }
    }
    points
}
```

```csharp
static double Distance((double x, double y) a, (double x, double y) b) => Math.Sqrt(Math.Pow(a.x - b.x, 2) + Math.Pow(a.y - b.y, 2));

static (double x, double y) MoveTowards((double x, double y) from, (double x, double y) to, double dist)
{
    double d = Math.Max(Distance(from, to), 1e-9);
    double t = dist / d;
    return (to.x + (from.x - to.x) * t, to.y + (from.y - to.y) * t);
}

static List<(double x, double y)> Fabrik(
    List<(double x, double y)> joints, List<double> boneLengths, (double x, double y) target,
    double tolerance = 0.01, int maxIterations = 10)
{
    var root = joints[0];
    double totalLength = boneLengths.Sum();

    if (Distance(root, target) > totalLength)
    {
        var result = new List<(double, double)> { root };
        foreach (var length in boneLengths) result.Add(MoveTowards(result[^1], target, length));
        return result;
    }

    var points = new List<(double, double)>(joints);
    for (int iter = 0; iter < maxIterations; iter++)
    {
        if (Distance(points[^1], target) < tolerance) break;

        points[^1] = target;
        for (int i = points.Count - 2; i >= 0; i--)
            points[i] = MoveTowards(points[i], points[i + 1], boneLengths[i]);

        points[0] = root;
        for (int i = 1; i < points.Count; i++)
            points[i] = MoveTowards(points[i], points[i - 1], boneLengths[i - 1]);
    }
    return points;
}
```
