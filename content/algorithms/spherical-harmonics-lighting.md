---
name: 球面調和関数照明(Spherical Harmonics Lighting)
category: CG・3Dレンダリング
subcategory: ライティング・シェーディング
complexity: O(1)(1点あたりの照明評価、係数の数は定数)
summary: 全方向から降り注ぐ環境光を、球面上の関数を近似する少数の基底関数(球面調和関数)の係数へ圧縮しておくことで、複雑な環境照明をリアルタイムに安価な内積計算だけで再現する。
---

## 概要

[シャドウマッピング](/algorithms/shadow-mapping)が太陽や電球のような直接光の影を扱うのに対し、現実の照明には空や周囲の壁からの反射光のように**あらゆる方向から降り注ぐ間接的な環境光**も大きく寄与している。この環境光を正確に扱うには、本来は球面上の全方向について明るさを記録する必要があるが、そのままでは情報量が膨大になる。球面調和関数照明は、フーリエ変換が任意の波形を少数のサイン波の合成で近似できるのと同じように、**球面上の任意の光の分布を、少数の「球面調和関数」の係数だけで近似的に表現**する。低次(2次、9係数)の球面調和関数でも、多くの拡散的な環境照明を十分な精度で再現でき、リアルタイムレンダリングにおける環境光・間接光表現の実用的な標準技法として使われている。

## 仕組み

1. **球面調和関数(SH基底)**: 球面上で定義された直交関数の集合で、次数`l`・位数`m`によって`Y_l^m(θ,φ)`として定義される(通常のフーリエ級数における「サイン・コサイン波」の球面版に相当する)。次数0(1個)、次数1(3個)、次数2(5個)…と、次数を上げるほどより高周波(細かい変化)を表現できる
2. ある方向`(θ,φ)`から降り注ぐ環境光の強さ`L(θ,φ)`(360度パノラマの環境マップなど)を、SH基底関数の線形結合で近似する:`L(θ,φ) ≈ Σ_l Σ_m c_l^m・Y_l^m(θ,φ)`。この近似の**係数`c_l^m`だけを事前計算して保持**する(2次までなら9個の係数、通常はRGB各チャンネルごとに9個ずつ、合計27個の数値で環境光全体を表現できる)
3. 拡散反射(ランバート反射)のような単純な反射モデルでは、ある法線方向`n`を持つ表面が受け取る環境光の総量(間接照明の寄与)は、環境光のSH係数`c_l^m`と、法線方向を球面調和関数で評価した値`Y_l^m(n)`の**内積**として、積分計算なしに解析的に求まることが知られている(球面調和関数の直交性・回転不変性による数学的な性質)
4. レンダリング時、各ピクセル(または各頂点)の法線方向についてこの内積を計算するだけで、複雑な環境照明のもとでの拡散光の寄与が得られる。動的なオブジェクトの回転・移動があっても、SH係数を再計算する必要はなく、法線方向とSH基底の内積を都度計算するだけでよい
5. より高度な用途では、ライトプローブ(シーン内の複数地点で環境光をSH係数として事前計算しておく仕組み)と組み合わせ、動くオブジェクトが今いる位置に最も近いライトプローブのSH係数を使ってリアルタイムに間接光を近似する

## 特性・トレードオフ

- **膨大な環境光の情報を少数の係数へ圧縮**: 全方向の光の分布という本来は連続的で情報量の多いデータを、わずか数個〜数十個の係数に圧縮しながら、拡散的な照明であれば視覚的に十分な精度を保てる。事前計算とリアルタイム評価の分離により、複雑な環境照明を毎フレームのコストほぼゼロで扱える
- **低周波成分に強く、鋭い反射やハイライトには弱い**: 球面調和関数は次数が低いほど滑らかな(低周波の)光の変化しか表現できず、次数を上げれば表現力は増すが係数の数も急増する。実務で使われる2〜3次程度の低次SHは、拡散反射のような滑らかな間接光には十分だが、鏡面反射のような鋭いハイライトの表現には向かず、別の手法(環境マッピング、リアルタイムレイトレーシングなど)と組み合わせて使われる
- **ライトプローブによる空間的な補間**: シーン全体で1組のSH係数だけでは、部屋ごとに明るさが異なるような空間的な変化を表現できない。複数地点にライトプローブを配置し、オブジェクトの位置に応じて近傍のプローブのSH係数を補間して使う設計が、ゲームエンジン(Unity、Unreal Engineとも標準機能として搭載)で一般的である
- **使いどころ**: ゲームエンジンのグローバルイルミネーション近似(ライトプローブ、Precomputed Radiance Transfer)、動的オブジェクトへの環境光反映、映画・アニメーションのプリコンピュートされた間接照明、太陽光・空の色を反映した屋外シーンの拡散光表現

## 実装例

2次(9係数)の球面調和関数を使い、法線方向に対する拡散照明を評価する簡略版を示す。

```python
import math

def sh_basis(nx: float, ny: float, nz: float) -> list[float]:
    """2次(9個)の球面調和基底関数を、単位法線ベクトル(nx,ny,nz)について評価する。"""
    return [
        0.282095,                      # l=0
        0.488603 * ny,                 # l=1
        0.488603 * nz,
        0.488603 * nx,
        1.092548 * nx * ny,             # l=2
        1.092548 * ny * nz,
        0.315392 * (3 * nz * nz - 1),
        1.092548 * nx * nz,
        0.546274 * (nx * nx - ny * ny),
    ]

def evaluate_sh_lighting(sh_coeffs: list[float], normal: tuple[float, float, float]) -> float:
    """sh_coeffs: 環境光を近似した9個のSH係数。法線方向の拡散照明強度を返す。"""
    basis = sh_basis(*normal)
    return sum(c * b for c, b in zip(sh_coeffs, basis))
```

```typescript
function shBasis(nx: number, ny: number, nz: number): number[] {
  return [
    0.282095,
    0.488603 * ny,
    0.488603 * nz,
    0.488603 * nx,
    1.092548 * nx * ny,
    1.092548 * ny * nz,
    0.315392 * (3 * nz * nz - 1),
    1.092548 * nx * nz,
    0.546274 * (nx * nx - ny * ny),
  ];
}

function evaluateShLighting(shCoeffs: number[], normal: [number, number, number]): number {
  const basis = shBasis(...normal);
  return shCoeffs.reduce((sum, c, i) => sum + c * basis[i], 0);
}
```

```cpp
#include <array>
#include <cmath>

std::array<double, 9> shBasis(double nx, double ny, double nz) {
    return {
        0.282095,
        0.488603 * ny,
        0.488603 * nz,
        0.488603 * nx,
        1.092548 * nx * ny,
        1.092548 * ny * nz,
        0.315392 * (3 * nz * nz - 1),
        1.092548 * nx * nz,
        0.546274 * (nx * nx - ny * ny),
    };
}

double evaluateShLighting(const std::array<double, 9>& shCoeffs, double nx, double ny, double nz) {
    auto basis = shBasis(nx, ny, nz);
    double sum = 0.0;
    for (int i = 0; i < 9; i++) sum += shCoeffs[i] * basis[i];
    return sum;
}
```

```rust
fn sh_basis(nx: f64, ny: f64, nz: f64) -> [f64; 9] {
    [
        0.282095,
        0.488603 * ny,
        0.488603 * nz,
        0.488603 * nx,
        1.092548 * nx * ny,
        1.092548 * ny * nz,
        0.315392 * (3.0 * nz * nz - 1.0),
        1.092548 * nx * nz,
        0.546274 * (nx * nx - ny * ny),
    ]
}

fn evaluate_sh_lighting(sh_coeffs: &[f64; 9], normal: (f64, f64, f64)) -> f64 {
    let basis = sh_basis(normal.0, normal.1, normal.2);
    sh_coeffs.iter().zip(basis.iter()).map(|(c, b)| c * b).sum()
}
```

```csharp
static double[] ShBasis(double nx, double ny, double nz)
{
    return new[]
    {
        0.282095,
        0.488603 * ny,
        0.488603 * nz,
        0.488603 * nx,
        1.092548 * nx * ny,
        1.092548 * ny * nz,
        0.315392 * (3 * nz * nz - 1),
        1.092548 * nx * nz,
        0.546274 * (nx * nx - ny * ny),
    };
}

static double EvaluateShLighting(double[] shCoeffs, (double x, double y, double z) normal)
{
    var basis = ShBasis(normal.x, normal.y, normal.z);
    double sum = 0;
    for (int i = 0; i < 9; i++) sum += shCoeffs[i] * basis[i];
    return sum;
}
```
