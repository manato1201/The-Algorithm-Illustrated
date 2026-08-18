---
name: ディファードシェーディング(Deferred Shading)
category: CG・3Dレンダリング
subcategory: ライティング・シェーディング
complexity: O(w・h・(g + l))(w×hは画面の画素数、gはGバッファ書き込みコスト、lは光源数)
summary: ジオメトリ情報(法線・アルベド・深度など)を一度Gバッファへ書き出してから、画面空間で全ライトの照明計算をまとめて行うことで、光源数がシェーディングコストに与える影響をポリゴン数から切り離すレンダリング手法。
---

## 概要

通常のフォワードレンダリング(Forward Rendering)では、1つのオブジェクトを描画するたびに、そのオブジェクトに影響する全ての光源についての照明計算をピクセルシェーダー内で行う。光源が3つあれば3回、10個あれば10回、同じピクセルに対して照明計算を繰り返すことになり、コストは「描画するポリゴン数 × 光源数」に比例して増大する。ディファードシェーディング(Deferred Shading, 遅延シェーディング)は、この照明計算を「ジオメトリの描画」から切り離し、後回し(defer)にすることでこの問題を解決する。第1パスでは照明を一切計算せず、各ピクセルの法線・アルベド(基本色)・深度・鏡面反射率といった**ジオメトリ属性だけ**を複数枚のテクスチャ(**Gバッファ、Geometry Buffer**)に書き出す。第2パスでは、Gバッファに記録された情報だけを使い、画面上の各ピクセルに対して1回だけ全光源の照明計算をまとめて行う。この結果、照明計算のコストは「シーンのポリゴン数」ではなく「画面のピクセル数 × 光源数」で決まるようになり、多数の光源を扱うシーン(都市の夜景、多数の爆発や魔法エフェクトが飛び交うゲームなど)においてフォワードレンダリングより圧倒的に効率的になる。

## 仕組み

1. **ジオメトリパス(Gバッファ生成)**: カメラ視点でシーンの全オブジェクトを1回描画する。ただしピクセルシェーダーでは照明計算を一切行わず、各ピクセルの法線・アルベド色・深度(または位置)・スペキュラ強度やラフネスなどのマテリアル属性を、複数のレンダーターゲット(MRT, Multiple Render Targets)に同時に書き込む
2. Gバッファは通常、法線用テクスチャ・アルベド用テクスチャ・深度用テクスチャ・マテリアルパラメータ用テクスチャなど、複数枚のテクスチャの組として構成される。深度バッファがあれば、画面座標と深度から各ピクセルのワールド座標を逆算できるため、位置情報を別途保存しなくてもよい
3. **ライティングパス**: ジオメトリの描画は完了しているので、以降は純粋に画面空間(スクリーンスペース)の処理になる。各光源について、その光源が影響を及ぼす範囲(点光源ならその影響半径に対応する球や、画面を覆う矩形)だけを対象にGバッファを読み取り、光源の位置・色・減衰特性とGバッファの法線・アルベドを使って照明計算を行い、結果を蓄積バッファに加算合成する
4. 点光源やスポットライトのように影響範囲が限定される光源は、その範囲に相当するジオメトリ(球や円錐)だけを描画してGPUのラスタライザにピクセル範囲を絞り込ませる、あるいはタイルベースでライトを画面上のタイルごとに割り当てる(**タイルドディファードシェーディング**)ことで、無関係な光源の計算を大幅に削減できる
5. 全光源の寄与を蓄積したら、最終的な色に対してトーンマッピングやポストプロセス([ブルームポストエフェクト](/algorithms/bloom-post-effect)など)を適用して画面に出力する

## 特性・トレードオフ

- **多光源シーンでの圧倒的な優位性**: フォワードレンダリングのコストが「ポリゴン数×光源数」であるのに対し、ディファードシェーディングは「ピクセル数×影響を受ける光源数」であるため、数十〜数百個の局所光源を扱うシーンで特に有利になる。オーバードローの多いシーン(重なり合うポリゴンが多いシーン)でも、無駄な照明計算はGバッファ書き込みの段階では発生しない
- **半透明オブジェクトが苦手**: Gバッファは各ピクセルにつき1つのジオメトリ情報しか保持できないため、半透明オブジェクト(重なり合う複数の面を同時に描画したい)をそのまま扱えない。多くの実装では半透明部分だけを別途フォワードレンダリングで描画する、いわゆる**フォワード+ディファードのハイブリッド構成**を取る
- **メモリ帯域幅のコスト**: Gバッファは複数枚のフルスクリーンテクスチャで構成されるため、メモリ帯域幅(バンド幅)の消費が大きい。高解像度・複数のGバッファチャンネルを持つ実装ほどこのコストが増大し、モバイルGPUのような帯域幅が限られる環境では不利になりやすい
- **アンチエイリアシングとの相性**: 照明計算がジオメトリのラスタライズと切り離されているため、MSAA(マルチサンプルアンチエイリアシング)をそのまま適用しづらい。実際には[テンポラルアンチエイリアシング](/algorithms/temporal-anti-aliasing)のようなポストプロセス型のアンチエイリアシング手法と組み合わせるのが一般的
- **使いどころ**: 多数の動的光源を扱う現代の3Dゲームエンジン(Unreal Engineの標準パイプライン、多くのAAAタイトル)、都市シーンや室内シーンのように局所光源が密集する環境、[スクリーンスペース・アンビエントオクルージョン](/algorithms/screen-space-ambient-occlusion)のような画面空間エフェクトと組み合わせやすい設計が求められる場面

## 実装例

Gバッファへの属性書き込みと、複数の点光源を画面空間で合成するライティングパスの中核ロジックを示す(実際のGPUパイプラインではシェーダー言語で実装するが、ここではCPU側のロジックとして単純化している)。

```python
import math

class GBufferPixel:
    def __init__(self, albedo, normal, world_pos, specular=0.5):
        self.albedo = albedo          # (r, g, b)
        self.normal = normal          # 正規化済み (x, y, z)
        self.world_pos = world_pos    # (x, y, z)
        self.specular = specular

def write_gbuffer(scene_objects, camera_rays):
    """ジオメトリパス: 各画面座標に最も近いオブジェクトの属性をGバッファへ書き出す。"""
    gbuffer = {}
    for pixel_coord, ray_hit in camera_rays.items():
        if ray_hit is None:
            continue
        gbuffer[pixel_coord] = GBufferPixel(
            albedo=ray_hit["albedo"],
            normal=ray_hit["normal"],
            world_pos=ray_hit["position"],
            specular=ray_hit.get("specular", 0.5),
        )
    return gbuffer

def dot3(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

def normalize3(v):
    length = math.sqrt(dot3(v, v)) or 1e-9
    return (v[0] / length, v[1] / length, v[2] / length)

def shade_point_light(pixel: GBufferPixel, light_pos, light_color, light_radius):
    to_light = (
        light_pos[0] - pixel.world_pos[0],
        light_pos[1] - pixel.world_pos[1],
        light_pos[2] - pixel.world_pos[2],
    )
    distance = math.sqrt(dot3(to_light, to_light))
    if distance > light_radius:
        return (0.0, 0.0, 0.0)  # 影響範囲外なので計算をスキップ

    light_dir = normalize3(to_light)
    ndotl = max(0.0, dot3(pixel.normal, light_dir))
    attenuation = max(0.0, 1.0 - distance / light_radius) ** 2
    return tuple(pixel.albedo[i] * light_color[i] * ndotl * attenuation for i in range(3))

def lighting_pass(gbuffer: dict, lights: list) -> dict:
    """ライティングパス: Gバッファと光源リストから、各ピクセルの最終色を画面空間で計算する。"""
    result = {}
    for pixel_coord, pixel in gbuffer.items():
        accumulated = [0.0, 0.0, 0.0]
        for light in lights:
            contribution = shade_point_light(
                pixel, light["position"], light["color"], light["radius"]
            )
            for i in range(3):
                accumulated[i] += contribution[i]
        result[pixel_coord] = tuple(accumulated)
    return result
```

```typescript
type Vec3 = [number, number, number];

interface GBufferPixel {
  albedo: Vec3;
  normal: Vec3;
  worldPos: Vec3;
  specular: number;
}

interface Light {
  position: Vec3;
  color: Vec3;
  radius: number;
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize3(v: Vec3): Vec3 {
  const length = Math.sqrt(dot3(v, v)) || 1e-9;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function writeGBuffer(
  cameraRays: Map<string, { albedo: Vec3; normal: Vec3; position: Vec3; specular?: number } | null>,
): Map<string, GBufferPixel> {
  const gbuffer = new Map<string, GBufferPixel>();
  for (const [coord, hit] of cameraRays) {
    if (!hit) continue;
    gbuffer.set(coord, {
      albedo: hit.albedo,
      normal: hit.normal,
      worldPos: hit.position,
      specular: hit.specular ?? 0.5,
    });
  }
  return gbuffer;
}

function shadePointLight(pixel: GBufferPixel, light: Light): Vec3 {
  const toLight: Vec3 = [
    light.position[0] - pixel.worldPos[0],
    light.position[1] - pixel.worldPos[1],
    light.position[2] - pixel.worldPos[2],
  ];
  const distance = Math.sqrt(dot3(toLight, toLight));
  if (distance > light.radius) return [0, 0, 0]; // 影響範囲外はスキップ

  const lightDir = normalize3(toLight);
  const ndotl = Math.max(0, dot3(pixel.normal, lightDir));
  const attenuation = Math.max(0, 1 - distance / light.radius) ** 2;
  return [
    pixel.albedo[0] * light.color[0] * ndotl * attenuation,
    pixel.albedo[1] * light.color[1] * ndotl * attenuation,
    pixel.albedo[2] * light.color[2] * ndotl * attenuation,
  ];
}

function lightingPass(gbuffer: Map<string, GBufferPixel>, lights: Light[]): Map<string, Vec3> {
  const result = new Map<string, Vec3>();
  for (const [coord, pixel] of gbuffer) {
    const accumulated: Vec3 = [0, 0, 0];
    for (const light of lights) {
      const contribution = shadePointLight(pixel, light);
      accumulated[0] += contribution[0];
      accumulated[1] += contribution[1];
      accumulated[2] += contribution[2];
    }
    result.set(coord, accumulated);
  }
  return result;
}
```
