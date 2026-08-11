---
name: 線形ブレンドスキニング(Linear Blend Skinning)
category: CG・3Dレンダリング
subcategory: ジオメトリ処理
complexity: O(V・B)(Vは頂点数、Bは1頂点あたりの影響ボーン数)
summary: 各頂点をボーン行列の加重平均で変形し、キャラクターの3Dメッシュを骨格アニメーションに合わせて安価に変形させる、スケルタルアニメーションの基礎技術。
---

## 概要

3Dキャラクターのモデルは1つの固定形状のメッシュ(頂点の集合)として作られるが、これを腕を振ったり歩いたりするアニメーションに合わせて変形させるには、メッシュの各頂点を「骨格(スケルトン)の動きに追従させる」仕組みが必要になる。線形ブレンドスキニング(LBS、単純に「スキニング」とも呼ばれる)は、各頂点があらかじめ複数のボーンからどれだけ影響を受けるか(スキンウェイト)を持ち、各ボーンの変形行列で頂点位置を変換した結果を**その重みで加重平均する**という単純な線形計算で、リアルタイムにメッシュを変形させる。計算がシンプルでGPU(頂点シェーダ)との相性が良いため、ゲームのキャラクターアニメーションのほぼ標準的な変形手法として使われている。

## 仕組み

1. モデリング段階で、メッシュの各頂点に対して「どのボーンからどれだけの重みで影響を受けるか」(スキンウェイト、通常は影響の合計が1になるよう正規化)を設定する(リギング/ウェイトペイントと呼ばれる作業)
2. 各ボーンについて、**バインドポーズ(モデリング時の基準姿勢)からアニメーション後の姿勢への変換行列**`M_b`を求める。これはアニメーションの現在姿勢の行列と、バインドポーズの逆行列を掛け合わせたもの
3. 各頂点`v`について、影響を受けるボーン`b`ごとに`M_b`で変形した座標を計算し、スキンウェイト`w_b`で加重平均する:
   `v' = Σ_b w_b・(M_b・v)`
4. この計算を全頂点・全フレームで行うことで、静止メッシュがボーンの動きに追従して滑らかに変形する。頂点ごとの計算が独立しているため、GPUの頂点シェーダで並列に処理するのに適している

## 特性・トレードオフ

- **計算コストの低さとGPUとの親和性**: 各頂点の計算が他の頂点と独立した単純な行列演算の加重和であるため、頂点シェーダで大量の頂点を並列処理でき、リアルタイムレンダリングの標準技術として定着している
- **「キャンディラッパー」問題**: 関節を大きく曲げる(肘・膝を深く曲げるなど)と、複数のボーンの変形行列を単純に線形補間するため、断面がねじれてくびれる不自然な変形(キャンディの包み紙のような見た目)が起きやすい。これを軽減するために、双四元数スキニング(Dual Quaternion Skinning)のような、回転をより正確に扱う発展手法が使われることもある
- **ウェイト設定の職人芸**: どの頂点がどのボーンからどれだけ影響を受けるかというスキンウェイトの設定は、自然な変形を得るためにアーティストが手作業や補助ツールで調整することが多く、モデルの品質に直結する
- **使いどころ**: ゲーム・映像制作におけるキャラクターの骨格アニメーション全般、VRアバターのリアルタイム変形、モーションキャプチャデータの適用。より高精度な変形が必要な顔アニメーションなどでは、スキニングにブレンドシェイプ(モーフターゲット)を組み合わせることも多い

## 実装例

```python
import numpy as np

def linear_blend_skinning(
    rest_vertices: np.ndarray,      # (V, 3) バインドポーズでの頂点座標
    skin_weights: np.ndarray,       # (V, B) 各頂点・各ボーンへの重み(行の和は1)
    bone_matrices: np.ndarray,      # (B, 4, 4) 各ボーンの「バインドポーズ→現在姿勢」変換行列
) -> np.ndarray:
    v_count, bone_count = skin_weights.shape
    homogeneous = np.hstack([rest_vertices, np.ones((v_count, 1))])  # (V, 4)

    result = np.zeros((v_count, 3))
    for b in range(bone_count):
        transformed = (bone_matrices[b] @ homogeneous.T).T[:, :3]  # (V, 3)
        result += skin_weights[:, b:b + 1] * transformed
    return result
```

```typescript
type Mat4 = number[]; // 16要素、列優先

function mat4MulVec3(
  m: Mat4,
  v: [number, number, number],
): [number, number, number] {
  const [x, y, z] = v;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function linearBlendSkinning(
  restVertices: [number, number, number][],
  skinWeights: number[][], // [vertexIndex][boneIndex]
  boneMatrices: Mat4[],
): [number, number, number][] {
  return restVertices.map((v, vi) => {
    let result: [number, number, number] = [0, 0, 0];
    for (let b = 0; b < boneMatrices.length; b++) {
      const w = skinWeights[vi][b];
      if (w === 0) continue;
      const transformed = mat4MulVec3(boneMatrices[b], v);
      result = [
        result[0] + w * transformed[0],
        result[1] + w * transformed[1],
        result[2] + w * transformed[2],
      ];
    }
    return result;
  });
}
```

```cpp
#include <vector>
#include <array>

using Vec3 = std::array<double, 3>;
using Mat4 = std::array<double, 16>; // 列優先

Vec3 mat4MulVec3(const Mat4& m, const Vec3& v) {
    return {
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
    };
}

std::vector<Vec3> linearBlendSkinning(
    const std::vector<Vec3>& restVertices,
    const std::vector<std::vector<double>>& skinWeights,
    const std::vector<Mat4>& boneMatrices) {
    std::vector<Vec3> result(restVertices.size(), Vec3{0, 0, 0});
    for (size_t vi = 0; vi < restVertices.size(); vi++) {
        for (size_t b = 0; b < boneMatrices.size(); b++) {
            double w = skinWeights[vi][b];
            if (w == 0.0) continue;
            Vec3 transformed = mat4MulVec3(boneMatrices[b], restVertices[vi]);
            for (int k = 0; k < 3; k++) result[vi][k] += w * transformed[k];
        }
    }
    return result;
}
```

```rust
type Vec3 = [f64; 3];
type Mat4 = [f64; 16]; // 列優先

fn mat4_mul_vec3(m: &Mat4, v: &Vec3) -> Vec3 {
    [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
    ]
}

fn linear_blend_skinning(
    rest_vertices: &[Vec3],
    skin_weights: &[Vec<f64>],
    bone_matrices: &[Mat4],
) -> Vec<Vec3> {
    rest_vertices
        .iter()
        .enumerate()
        .map(|(vi, v)| {
            let mut result = [0.0, 0.0, 0.0];
            for (b, mat) in bone_matrices.iter().enumerate() {
                let w = skin_weights[vi][b];
                if w == 0.0 {
                    continue;
                }
                let transformed = mat4_mul_vec3(mat, v);
                for k in 0..3 {
                    result[k] += w * transformed[k];
                }
            }
            result
        })
        .collect()
}
```

```csharp
static double[] Mat4MulVec3(double[] m, double[] v)
{
    return new[]
    {
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
    };
}

static double[][] LinearBlendSkinning(double[][] restVertices, double[][] skinWeights, double[][] boneMatrices)
{
    var result = new double[restVertices.Length][];
    for (int vi = 0; vi < restVertices.Length; vi++)
    {
        var acc = new double[] { 0, 0, 0 };
        for (int b = 0; b < boneMatrices.Length; b++)
        {
            double w = skinWeights[vi][b];
            if (w == 0) continue;
            var transformed = Mat4MulVec3(boneMatrices[b], restVertices[vi]);
            for (int k = 0; k < 3; k++) acc[k] += w * transformed[k];
        }
        result[vi] = acc;
    }
    return result;
}
```
