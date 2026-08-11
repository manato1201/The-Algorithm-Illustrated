---
name: フラスタムカリング(Frustum Culling)
category: CG・3Dレンダリング
subcategory: 可視性・最適化
complexity: O(n)(nはオブジェクト数、単純な全探索の場合)
summary: カメラの視錐台(フラスタム)を6枚の平面として表現し、各平面との位置関係を調べるだけで画面に映らないオブジェクトを描画対象から高速に除外する。
---

## 概要

3Dシーンには画面に映らないオブジェクト(カメラの後ろ・視野外・遠すぎる位置にあるもの)も大量に存在するが、それらをそのままGPUに送って描画命令を発行すると、頂点処理・ラスタライズのコストが無駄になる。フラスタムカリングは、カメラが見ている範囲を表す錐台形状(視錐台、フラスタム)を**6枚の平面(上下左右・近clip・遠clip)** として定式化し、各オブジェクトの境界(バウンディングスフィアやAABB)がこれらの平面に対してどちら側にあるかを調べるだけで、「完全に視野外にあり描画する必要がないオブジェクト」を安価に除外する、リアルタイムレンダリングにおける最も基本的な可視性判定の一つ。

## 仕組み

1. カメラのビュー行列とプロジェクション行列を掛け合わせた**ビュープロジェクション行列**から、視錐台を構成する6枚の平面(それぞれ「法線ベクトル+原点からの距離」で表現)の係数を抽出する
2. 各オブジェクトについて、その境界を表す**バウンディングボリューム**(最も単純なのはバウンディングスフィア: 中心座標+半径)を用意する
3. 6枚の平面それぞれについて、バウンディングスフィアの中心から平面までの符号付き距離を計算する。距離が`-半径`より小さければ(平面の裏側に完全に入っていれば)、そのオブジェクトは視錐台の外にあると判定できる
4. 6枚のうち1枚でも「完全に外側」と判定されれば、そのオブジェクトは描画リストから除外する(早期終了できるため、全ての平面をチェックする前に打ち切れることが多い)
5. 除外されなかったオブジェクトだけを実際の描画パイプラインに送る。シーン全体で見ればO(n)の判定だが、大規模シーンでは判定自体もBVH(バウンディングボリューム階層)などの空間構造と組み合わせて、視野外のオブジェクト群をまとめて枝刈りすることでさらに高速化される

## 特性・トレードオフ

- **描画コストの大幅な削減**: 特に広いオープンワールドや高いカメラ視野角のシーンでは、画面に映るオブジェクトはシーン全体のごく一部であることが多く、フラスタムカリングだけで描画対象を大きく絞り込める
- **保守的な近似であること**: バウンディングスフィア/AABBは実際の形状を包含する近似形状であるため、「境界は視錐台と交差しているが実物は視野外」というケースでは無駄な描画が残ることがある(偽陰性は起きないが、偽陽性による過剰な描画は起きうる、という安全側に倒した近似)
- **他の可視性カリングとの併用**: フラスタムカリングは「カメラの向いていない方向」を除外するだけで、視野内にあっても他の物体の後ろに完全に隠れているオブジェクト(オクルージョン)は除外できない。実際のエンジンでは階層的Zバッファ法によるオクルージョンカリングなどと組み合わせて多段階に可視性を絞り込む
- **使いどころ**: ゲームエンジンのレンダリングパイプラインのほぼ全て(Unity、Unreal Engineなどが標準機能として搭載)、大規模3Dシーンの描画最適化、シャドウマップ生成時のライト視点でのカリング

## 実装例

```python
import math

def extract_frustum_planes(view_proj: list[list[float]]) -> list[tuple[float, float, float, float]]:
    """4x4のビュープロジェクション行列(行優先)から6平面(a,b,c,d; ax+by+cz+d=0、内側が正)を抽出する。"""
    m = view_proj
    rows = [m[3], m[3], m[3], m[3], m[3], m[3]]
    signs = [1, -1, 1, -1, 1, -1]
    sources = [m[0], m[0], m[1], m[1], m[2], m[2]]
    planes = []
    for row, sign, src in zip(rows, signs, sources):
        plane = tuple(r + sign * s for r, s in zip(row, src))
        a, b, c, d = plane
        length = math.hypot(a, b, c)
        planes.append((a / length, b / length, c / length, d / length))
    return planes

def is_sphere_outside_frustum(
    planes: list[tuple[float, float, float, float]], center: tuple[float, float, float], radius: float
) -> bool:
    for a, b, c, d in planes:
        distance = a * center[0] + b * center[1] + c * center[2] + d
        if distance < -radius:
            return True  # 完全にこの平面の外側 → 視錐台の外
    return False
```

```typescript
type Plane = [number, number, number, number]; // a, b, c, d

function isSphereOutsideFrustum(
  planes: Plane[], center: [number, number, number], radius: number,
): boolean {
  for (const [a, b, c, d] of planes) {
    const distance = a * center[0] + b * center[1] + c * center[2] + d;
    if (distance < -radius) return true; // 完全にこの平面の外側
  }
  return false;
}

function cullObjects<T extends { center: [number, number, number]; radius: number }>(
  planes: Plane[], objects: T[],
): T[] {
  return objects.filter((obj) => !isSphereOutsideFrustum(planes, obj.center, obj.radius));
}
```

```cpp
#include <array>
#include <vector>
#include <cmath>

struct Plane { double a, b, c, d; };
struct Sphere { double x, y, z, radius; };

bool isSphereOutsideFrustum(const std::array<Plane, 6>& planes, const Sphere& s) {
    for (const auto& p : planes) {
        double distance = p.a * s.x + p.b * s.y + p.c * s.z + p.d;
        if (distance < -s.radius) return true;
    }
    return false;
}

std::vector<Sphere> cullSpheres(const std::array<Plane, 6>& planes, const std::vector<Sphere>& objects) {
    std::vector<Sphere> visible;
    for (const auto& obj : objects) {
        if (!isSphereOutsideFrustum(planes, obj)) visible.push_back(obj);
    }
    return visible;
}
```

```rust
#[derive(Clone, Copy)]
struct Plane { a: f64, b: f64, c: f64, d: f64 }

#[derive(Clone, Copy)]
struct Sphere { x: f64, y: f64, z: f64, radius: f64 }

fn is_sphere_outside_frustum(planes: &[Plane; 6], s: &Sphere) -> bool {
    planes.iter().any(|p| {
        let distance = p.a * s.x + p.b * s.y + p.c * s.z + p.d;
        distance < -s.radius
    })
}

fn cull_spheres(planes: &[Plane; 6], objects: &[Sphere]) -> Vec<Sphere> {
    objects
        .iter()
        .filter(|obj| !is_sphere_outside_frustum(planes, obj))
        .cloned()
        .collect()
}
```

```csharp
struct Plane { public double A, B, C, D; }
struct Sphere { public double X, Y, Z, Radius; }

static bool IsSphereOutsideFrustum(Plane[] planes, Sphere s)
{
    foreach (var p in planes)
    {
        double distance = p.A * s.X + p.B * s.Y + p.C * s.Z + p.D;
        if (distance < -s.Radius) return true;
    }
    return false;
}

static List<Sphere> CullSpheres(Plane[] planes, List<Sphere> objects)
{
    var visible = new List<Sphere>();
    foreach (var obj in objects)
    {
        if (!IsSphereOutsideFrustum(planes, obj)) visible.Add(obj);
    }
    return visible;
}
```
