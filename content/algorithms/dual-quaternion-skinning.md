---
name: デュアルクォータニオンスキニング(Dual Quaternion Skinning)
category: CG・3Dレンダリング
subcategory: ジオメトリ処理
complexity: O(V・B)(Vは頂点数、Bは1頂点あたりの影響ボーン数)
summary: ボーンの変形を回転行列ではなく双四元数(デュアルクォータニオン)で表現・補間することで、線形ブレンドスキニングが関節を深く曲げた際に起こす「キャンディラッパー」変形を解消する。
---

## 概要

[線形ブレンドスキニング](/algorithms/linear-blend-skinning)は、各頂点をボーンの変形行列で計算した結果を単純に加重平均するが、この「行列を線形補間する」という操作そのものに問題がある——回転行列を線形補間すると、補間の途中で回転成分が正しく保存されず、関節を大きく曲げた部分の断面が細くねじれてしまう(キャンディラッパー/candy-wrapper問題と呼ばれる)。デュアルクォータニオンスキニング(DQS)は、ボーンの変形を通常の4×4行列ではなく**双四元数(デュアルクォータニオン)**という数学的表現で扱うことで、回転を保ったまま補間できるようにし、この問題を解決する。[球面線形補間(Slerp)](/algorithms/skeletal-animation-slerp-blending)がクォータニオンによって回転の補間を正しく扱ったのと同じ発想を、スキニングの重み付き平均という別の場面に応用したものといえる。

## 仕組み

1. **双四元数とは何か**: 双四元数は、通常のクォータニオン(回転を表す)`q_r`と、平行移動の情報を埋め込んだ「双対部分」`q_d`のペア`(q_r, q_d)`として、剛体変換(回転+平行移動)全体を1つの代数的な対象として表現する(4×4行列が持つ16個の数値の代わりに、8個の数値で剛体変換を表せる)
2. 各ボーンの「バインドポーズから現在姿勢への変換」を、通常の4×4行列の代わりに双四元数`(q_r, q_d)`として計算する
3. 各頂点について、影響を受ける各ボーンの双四元数を、スキンウェイトで**加重平均**する。ここが[線形ブレンドスキニング](/algorithms/linear-blend-skinning)との決定的な違いで、行列の要素を直接平均するのではなく、双四元数の成分を平均してから正規化する。この演算が、回転成分に関しては球面線形補間に近い性質を持つため、関節が大きく曲がっても断面が細くねじれない
4. 加重平均して正規化した双四元数を使い、頂点座標を変換する(双四元数から頂点への変換公式を適用する)
5. 全頂点についてこれを繰り返すことで、[線形ブレンドスキニング](/algorithms/linear-blend-skinning)よりも自然な関節の変形を持つメッシュが得られる

## 特性・トレードオフ

- **キャンディラッパー問題の解消**: 肘・膝のように大きく曲がる関節でも、断面がくびれたりねじれたりせず、ボリュームが保たれたまま自然に変形する。行列の線形補間ではなく双四元数の補間を使うことの直接的な利点である
- **計算コストは[線形ブレンドスキニング](/algorithms/linear-blend-skinning)よりやや高い**: 双四元数の演算(正規化、頂点変換の公式)は単純な行列の加重和よりも計算量が多く、GPU上での実装もやや複雑になる。ただし現代のGPUの性能では実用上のボトルネックになることは少なく、多くのゲームエンジンが選択可能なスキニング方式として両方を提供している
- **拡大縮小成分の扱いに制約がある**: 双四元数は回転と平行移動(剛体変換)を厳密に表現できるが、非一様なスケーリング(ボーンごとに縦横比が異なる伸縮)をそのまま扱うことは基本形では難しく、拡張的な工夫が必要になる。この点は任意の4×4行列を扱える線形ブレンドスキニングに対する制約となる
- **使いどころ**: 関節の可動域が大きいキャラクター(格闘ゲーム、ファンタジー生物)のスキニング、[線形ブレンドスキニング](/algorithms/linear-blend-skinning)でキャンディラッパー問題が目立つモデルの改善、Unreal Engineなど主要ゲームエンジンが標準機能として提供するスキニング方式の選択肢の一つ

## 実装例

簡略化した2ボーン(単純な回転+平行移動)のデュアルクォータニオンブレンドを示す。

```python
import math

def quat_mul(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    w1, x1, y1, z1 = a
    w2, x2, y2, z2 = b
    return (
        w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
        w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
        w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
        w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    )

def make_dual_quaternion(
    rotation: tuple[float, float, float, float], translation: tuple[float, float, float],
) -> tuple[tuple[float, float, float, float], tuple[float, float, float, float]]:
    tx, ty, tz = translation
    t_quat = (0.0, tx, ty, tz)
    dual = tuple(0.5 * v for v in quat_mul(t_quat, rotation))
    return rotation, dual

def blend_dual_quaternions(
    dqs: list[tuple[tuple[float, float, float, float], tuple[float, float, float, float]]], weights: list[float],
) -> tuple[tuple[float, float, float, float], tuple[float, float, float, float]]:
    real_sum = [0.0, 0.0, 0.0, 0.0]
    dual_sum = [0.0, 0.0, 0.0, 0.0]
    for (real, dual), w in zip(dqs, weights):
        for i in range(4):
            real_sum[i] += w * real[i]
            dual_sum[i] += w * dual[i]

    norm = math.sqrt(sum(c * c for c in real_sum)) or 1.0
    real_normalized = tuple(c / norm for c in real_sum)
    dual_normalized = tuple(c / norm for c in dual_sum)
    return real_normalized, dual_normalized

def transform_vertex_dq(
    dq: tuple[tuple[float, float, float, float], tuple[float, float, float, float]], v: tuple[float, float, float],
) -> tuple[float, float, float]:
    real, dual = dq
    w, x, y, z = real
    # 回転部分の適用(クォータニオン回転)
    vx, vy, vz = v
    rot = quat_mul(quat_mul(real, (0.0, vx, vy, vz)), (w, -x, -y, -z))
    # 平行移動部分(双対部分から抽出)
    tw, tx, ty, tz = quat_mul(dual, (w, -x, -y, -z))
    translation = (2 * tx, 2 * ty, 2 * tz)
    return (rot[1] + translation[0], rot[2] + translation[1], rot[3] + translation[2])
```

```typescript
type Quat = [number, number, number, number];

function quatMul(a: Quat, b: Quat): Quat {
  const [w1, x1, y1, z1] = a;
  const [w2, x2, y2, z2] = b;
  return [
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
  ];
}

function makeDualQuaternion(
  rotation: Quat,
  translation: [number, number, number],
): [Quat, Quat] {
  const [tx, ty, tz] = translation;
  const tQuat: Quat = [0, tx, ty, tz];
  const dual = quatMul(tQuat, rotation).map((v) => 0.5 * v) as Quat;
  return [rotation, dual];
}

function blendDualQuaternions(
  dqs: [Quat, Quat][],
  weights: number[],
): [Quat, Quat] {
  const realSum: Quat = [0, 0, 0, 0];
  const dualSum: Quat = [0, 0, 0, 0];
  dqs.forEach(([real, dual], i) => {
    for (let k = 0; k < 4; k++) {
      realSum[k] += weights[i] * real[k];
      dualSum[k] += weights[i] * dual[k];
    }
  });
  const norm = Math.sqrt(realSum.reduce((s, c) => s + c * c, 0)) || 1;
  return [
    realSum.map((c) => c / norm) as Quat,
    dualSum.map((c) => c / norm) as Quat,
  ];
}
```

```cpp
#include <array>
#include <vector>
#include <cmath>

using Quat = std::array<double, 4>;

Quat quatMul(const Quat& a, const Quat& b) {
    return {
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
        a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    };
}

std::pair<Quat, Quat> makeDualQuaternion(const Quat& rotation, const std::array<double, 3>& translation) {
    Quat tQuat = {0.0, translation[0], translation[1], translation[2]};
    Quat product = quatMul(tQuat, rotation);
    Quat dual = {product[0] * 0.5, product[1] * 0.5, product[2] * 0.5, product[3] * 0.5};
    return {rotation, dual};
}

std::pair<Quat, Quat> blendDualQuaternions(const std::vector<std::pair<Quat, Quat>>& dqs, const std::vector<double>& weights) {
    Quat realSum = {0, 0, 0, 0}, dualSum = {0, 0, 0, 0};
    for (size_t i = 0; i < dqs.size(); i++) {
        for (int k = 0; k < 4; k++) {
            realSum[k] += weights[i] * dqs[i].first[k];
            dualSum[k] += weights[i] * dqs[i].second[k];
        }
    }
    double norm = std::sqrt(realSum[0] * realSum[0] + realSum[1] * realSum[1] + realSum[2] * realSum[2] + realSum[3] * realSum[3]);
    if (norm < 1e-9) norm = 1.0;
    for (int k = 0; k < 4; k++) { realSum[k] /= norm; dualSum[k] /= norm; }
    return {realSum, dualSum};
}
```

```rust
type Quat = [f64; 4];

fn quat_mul(a: &Quat, b: &Quat) -> Quat {
    [
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
        a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    ]
}

fn make_dual_quaternion(rotation: Quat, translation: [f64; 3]) -> (Quat, Quat) {
    let t_quat = [0.0, translation[0], translation[1], translation[2]];
    let product = quat_mul(&t_quat, &rotation);
    let dual = [product[0] * 0.5, product[1] * 0.5, product[2] * 0.5, product[3] * 0.5];
    (rotation, dual)
}

fn blend_dual_quaternions(dqs: &[(Quat, Quat)], weights: &[f64]) -> (Quat, Quat) {
    let mut real_sum = [0.0; 4];
    let mut dual_sum = [0.0; 4];
    for (i, (real, dual)) in dqs.iter().enumerate() {
        for k in 0..4 {
            real_sum[k] += weights[i] * real[k];
            dual_sum[k] += weights[i] * dual[k];
        }
    }
    let norm = real_sum.iter().map(|c| c * c).sum::<f64>().sqrt().max(1e-9);
    for k in 0..4 {
        real_sum[k] /= norm;
        dual_sum[k] /= norm;
    }
    (real_sum, dual_sum)
}
```

```csharp
static double[] QuatMul(double[] a, double[] b)
{
    return new[]
    {
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
        a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    };
}

static (double[] real, double[] dual) MakeDualQuaternion(double[] rotation, double[] translation)
{
    var tQuat = new[] { 0.0, translation[0], translation[1], translation[2] };
    var product = QuatMul(tQuat, rotation);
    var dual = product.Select(v => v * 0.5).ToArray();
    return (rotation, dual);
}

static (double[] real, double[] dual) BlendDualQuaternions(List<(double[] real, double[] dual)> dqs, double[] weights)
{
    var realSum = new double[4];
    var dualSum = new double[4];
    for (int i = 0; i < dqs.Count; i++)
    {
        for (int k = 0; k < 4; k++)
        {
            realSum[k] += weights[i] * dqs[i].real[k];
            dualSum[k] += weights[i] * dqs[i].dual[k];
        }
    }
    double norm = Math.Sqrt(realSum.Sum(c => c * c));
    if (norm < 1e-9) norm = 1.0;
    for (int k = 0; k < 4; k++) { realSum[k] /= norm; dualSum[k] /= norm; }
    return (realSum, dualSum);
}
```
