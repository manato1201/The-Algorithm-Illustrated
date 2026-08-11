---
name: 頂点アニメーションテクスチャ(VAT)
category: CG・3Dレンダリング
subcategory: アニメーション
complexity: O(1)(1頂点あたり、テクスチャルックアップのみ)
summary: 各頂点の時系列の位置(または法線)をテクスチャの画素として焼き込み、GPUでのボーン計算を丸ごと省いてアニメーションを再生する、群衆・破壊表現向けの技法。
---

## 概要

[線形ブレンドスキニング](/algorithms/linear-blend-skinning)はキャラクター1体ごとに骨格とスキンウェイトを持ち、CPU/GPUでボーン行列の加重平均を毎フレーム計算する。この方式は表現力が高い一方、**大量のキャラクターを同時に動かす群衆シーン**や、布・破片のように骨格では表現しづらい非剛体のシミュレーション結果を再生する用途では、1体あたりの計算コストがボトルネックになりやすい。頂点アニメーションテクスチャ(VAT)は発想を転換し、「アニメーションの全フレーム分の頂点位置をあらかじめ計算し、その結果を**普通のテクスチャ画像として焼き込んでおく**」ことで、再生時はテクスチャルックアップだけでアニメーションを再現する。ボーン計算を丸ごと省けるため、数百〜数千体規模の群衆や、物理シミュレーション結果の再生に多用される。

## 仕組み

1. オフライン(ゲーム実行前)に、対象メッシュのアニメーション(骨格アニメーションでも、布シミュレーションのような頂点キャッシュアニメーションでも構わない)を全フレーム分計算し、各頂点の位置(必要なら法線も)を記録する
2. 記録したデータを**テクスチャの画素として書き出す**。典型的には、横軸を「メッシュの頂点インデックス」、縦軸を「アニメーションのフレーム番号」とする2次元テクスチャを用意し、各画素のRGB値に頂点座標のx,y,zを(頂点位置の範囲でスケーリング/オフセットして)エンコードする
3. 実行時、頂点シェーダで「今どのメッシュインスタンスの、どのアニメーション時刻を再生しているか」から、対応するテクスチャ座標`(頂点インデックス, 現在フレーム)`を計算する
4. そのテクスチャ座標でVATをサンプリングし、得られたRGB値をデコードして頂点位置(または法線)として使う。ボーン行列の乗算・加重平均といった計算は一切不要で、**テクスチャの読み出し1回だけ**で変形後の頂点位置が求まる
5. フレーム間の中間時刻を再生する場合は、隣接する2フレーム分のテクスチャ値を線形補間(またはテクスチャのバイリニアフィルタリングをそのまま利用)して滑らかな動きを得る

## 特性・トレードオフ

- **GPU側の計算コストが劇的に下がる**: ボーン行列の乗算・加重平均が不要になり、頂点シェーダの負荷はテクスチャサンプリング数回程度まで下がる。同じ計算コストで桁違いに多いインスタンス数(群衆、破片、草木の揺れなど)を同時に描画できる
- **メモリと引き換えの高速化**: 全フレーム・全頂点の位置をテクスチャとして事前に焼き込むため、アニメーションが長い・頂点数が多いほどテクスチャサイズが大きくなる。動的にアニメーションを切り替える(パラメータ化する)自由度も、骨格アニメーションに比べて制限されやすい
- **骨格アニメーションでは扱いにくい変形にも対応できる**: VATは「頂点位置の時系列データ」であれば起源を問わないため、布シミュレーション・流体・破壊シミュレーションのような、骨格構造を前提としない変形結果もそのまま再生できる
- **使いどころ**: 大規模な群衆シーン(観客・軍隊など)、破壊・崩落エフェクトの再生、草木の風揺れのような環境アニメーション、Niagara(Unreal Engine)やVFX Graph(Unity)のようなGPUパーティクルシステムとの組み合わせ

## 実装例

VATのエンコード(オフライン)とデコード(再生時、頂点シェーダ相当の処理)を示す。

```python
def encode_vat(frames: list[list[tuple[float, float, float]]], bounds: tuple[float, float]) -> list[list[tuple[int, int, int]]]:
    """frames[frame][vertexIndex] = (x, y, z)。bounds = (min, max) で全軸を正規化してから8bitにエンコードする。"""
    lo, hi = bounds
    span = hi - lo
    texture = []
    for frame in frames:
        row = []
        for x, y, z in frame:
            r = round((x - lo) / span * 255)
            g = round((y - lo) / span * 255)
            b = round((z - lo) / span * 255)
            row.append((max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))))
        texture.append(row)
    return texture

def sample_vat(
    texture: list[list[tuple[int, int, int]]], vertex_index: int, time: float, bounds: tuple[float, float]
) -> tuple[float, float, float]:
    lo, hi = bounds
    span = hi - lo
    frame_count = len(texture)
    f = time * (frame_count - 1)
    f0, f1 = int(f), min(int(f) + 1, frame_count - 1)
    t = f - f0
    r0, g0, b0 = texture[f0][vertex_index]
    r1, g1, b1 = texture[f1][vertex_index]
    decode = lambda c0, c1: (c0 * (1 - t) + c1 * t) / 255 * span + lo
    return decode(r0, r1), decode(g0, g1), decode(b0, b1)
```

```typescript
type Vec3 = [number, number, number];

function encodeVat(frames: Vec3[][], bounds: [number, number]): [number, number, number][][] {
  const [lo, hi] = bounds;
  const span = hi - lo;
  return frames.map((frame) =>
    frame.map(([x, y, z]) => [
      Math.max(0, Math.min(255, Math.round(((x - lo) / span) * 255))),
      Math.max(0, Math.min(255, Math.round(((y - lo) / span) * 255))),
      Math.max(0, Math.min(255, Math.round(((z - lo) / span) * 255))),
    ]),
  );
}

function sampleVat(
  texture: [number, number, number][][], vertexIndex: number, time: number, bounds: [number, number],
): Vec3 {
  const [lo, hi] = bounds;
  const span = hi - lo;
  const frameCount = texture.length;
  const f = time * (frameCount - 1);
  const f0 = Math.floor(f);
  const f1 = Math.min(f0 + 1, frameCount - 1);
  const t = f - f0;
  const [r0, g0, b0] = texture[f0][vertexIndex];
  const [r1, g1, b1] = texture[f1][vertexIndex];
  const decode = (c0: number, c1: number) => ((c0 * (1 - t) + c1 * t) / 255) * span + lo;
  return [decode(r0, r1), decode(g0, g1), decode(b0, b1)];
}
```

```cpp
#include <vector>
#include <array>
#include <algorithm>
#include <cmath>

using Vec3 = std::array<double, 3>;
using Rgb = std::array<int, 3>;

std::vector<std::vector<Rgb>> encodeVat(const std::vector<std::vector<Vec3>>& frames, double lo, double hi) {
    double span = hi - lo;
    std::vector<std::vector<Rgb>> texture;
    for (const auto& frame : frames) {
        std::vector<Rgb> row;
        for (const auto& v : frame) {
            Rgb rgb;
            for (int k = 0; k < 3; k++) {
                int c = static_cast<int>(std::round((v[k] - lo) / span * 255));
                rgb[k] = std::clamp(c, 0, 255);
            }
            row.push_back(rgb);
        }
        texture.push_back(row);
    }
    return texture;
}

Vec3 sampleVat(const std::vector<std::vector<Rgb>>& texture, int vertexIndex, double time, double lo, double hi) {
    double span = hi - lo;
    int frameCount = static_cast<int>(texture.size());
    double f = time * (frameCount - 1);
    int f0 = static_cast<int>(f);
    int f1 = std::min(f0 + 1, frameCount - 1);
    double t = f - f0;
    Vec3 result;
    for (int k = 0; k < 3; k++) {
        double c0 = texture[f0][vertexIndex][k];
        double c1 = texture[f1][vertexIndex][k];
        result[k] = (c0 * (1 - t) + c1 * t) / 255.0 * span + lo;
    }
    return result;
}
```

```rust
type Vec3 = [f64; 3];
type Rgb = [i32; 3];

fn encode_vat(frames: &[Vec<Vec3>], lo: f64, hi: f64) -> Vec<Vec<Rgb>> {
    let span = hi - lo;
    frames
        .iter()
        .map(|frame| {
            frame
                .iter()
                .map(|v| {
                    let mut rgb = [0i32; 3];
                    for k in 0..3 {
                        let c = (((v[k] - lo) / span) * 255.0).round() as i32;
                        rgb[k] = c.clamp(0, 255);
                    }
                    rgb
                })
                .collect()
        })
        .collect()
}

fn sample_vat(texture: &[Vec<Rgb>], vertex_index: usize, time: f64, lo: f64, hi: f64) -> Vec3 {
    let span = hi - lo;
    let frame_count = texture.len();
    let f = time * (frame_count - 1) as f64;
    let f0 = f as usize;
    let f1 = (f0 + 1).min(frame_count - 1);
    let t = f - f0 as f64;
    let mut result = [0.0; 3];
    for k in 0..3 {
        let c0 = texture[f0][vertex_index][k] as f64;
        let c1 = texture[f1][vertex_index][k] as f64;
        result[k] = (c0 * (1.0 - t) + c1 * t) / 255.0 * span + lo;
    }
    result
}
```

```csharp
static int[][][] EncodeVat(double[][][] frames, double lo, double hi)
{
    double span = hi - lo;
    var texture = new int[frames.Length][][];
    for (int f = 0; f < frames.Length; f++)
    {
        texture[f] = new int[frames[f].Length][];
        for (int i = 0; i < frames[f].Length; i++)
        {
            var v = frames[f][i];
            var rgb = new int[3];
            for (int k = 0; k < 3; k++)
                rgb[k] = Math.Clamp((int)Math.Round((v[k] - lo) / span * 255), 0, 255);
            texture[f][i] = rgb;
        }
    }
    return texture;
}

static double[] SampleVat(int[][][] texture, int vertexIndex, double time, double lo, double hi)
{
    double span = hi - lo;
    int frameCount = texture.Length;
    double f = time * (frameCount - 1);
    int f0 = (int)f;
    int f1 = Math.Min(f0 + 1, frameCount - 1);
    double t = f - f0;
    var result = new double[3];
    for (int k = 0; k < 3; k++)
    {
        double c0 = texture[f0][vertexIndex][k];
        double c1 = texture[f1][vertexIndex][k];
        result[k] = (c0 * (1 - t) + c1 * t) / 255.0 * span + lo;
    }
    return result;
}
```
