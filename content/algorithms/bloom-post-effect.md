---
name: ブルームポストエフェクト(Bloom)
category: CG・3Dレンダリング
subcategory: ライティング・シェーディング
complexity: O(w・h)(w×hは画像の画素数、ぼかし段数は定数)
summary: 画面内の明るすぎる領域だけを抽出してぼかし、元の映像に加算合成することで、カメラのレンズで実際に起こる光のにじみを再現するポストプロセスエフェクト。
---

## 概要

現実のカメラで太陽や光源を撮影すると、レンズの光学的な限界により、明るい部分の光が周囲ににじみ出て、ふわっとした光の輪(グレア)が写る。この現象を再現するのがブルーム(Bloom)エフェクトである。3Dレンダリングでは、[順序ディザリング](/algorithms/ordered-dithering)がバンディング対策として量子化前の階調を扱うのに対し、ブルームは**HDR(高ダイナミックレンジ)レンダリングの結果から、輝度がしきい値を超える領域だけを抽出してぼかし、元の映像に加算する**という比較的単純な画像処理の組み合わせで、光のにじみを演出する。低コストながら視覚的なインパクトが大きく、HDRレンダリングパイプラインではほぼ標準的に組み込まれているポストプロセスエフェクトである。

## 仕組み

1. シーンをHDR(輝度が0〜1に制限されない浮動小数点フォーマット)でレンダリングする。太陽や光源、金属の強い反射など、実際には非常に明るい部分の値がそのまま保持される
2. **輝度抽出(Bright Pass)**: レンダリング結果から、輝度が指定したしきい値を超えるピクセルだけを抽出した画像を作る(しきい値以下のピクセルは黒にする、またはしきい値からの超過分だけを残す「ソフトしきい値」を使うことが多い)
3. 抽出した明るい領域の画像を、複数回**ガウスぼかし**にかける。効率化のため、水平方向・垂直方向に分離した2パスのガウスぼかしを使う(2次元のガウスぼかしは分離可能で、O(n²)の畳み込みをO(n)×2回に落とせる)ことが一般的
4. さらに、画像を段階的に縮小しながら複数の解像度でぼかしを繰り返す(ミップチェーンを使ったマルチスケールブラー)ことで、少ない計算量で広い範囲に自然に減衰する光のにじみを表現する手法もよく使われる(Unreal EngineやUnityのブルーム実装はこの方式に近い)
5. ぼかした明るい領域の画像を、元のHDRレンダリング結果に**加算合成**する。最後にトーンマッピングを適用してHDRからLDR(通常のディスプレイの輝度範囲)へ変換し、最終的な画面出力を得る

## 特性・トレードオフ

- **低コストで説得力のある光の演出**: 実際の光学系のシミュレーション(レイトレーシングによるレンズフレアの物理計算など)に比べ、輝度抽出+ぼかし+加算という単純な画像処理の組み合わせだけで、まぶしさ・光源の存在感を強く演出できる。GPUのポストプロセスパイプラインとの親和性も高い
- **HDRレンダリングが前提**: しきい値を超える輝度を正しく抽出するには、輝度の情報が1.0でクリップされないHDRフォーマットでのレンダリングが必要になる。8bit LDRのレンダリング結果からは、本来非常に明るい部分とそうでない部分の区別がつかず、ブルームの効果が正しく機能しない
- **過剰演出になりやすい**: ブルームの強さ・しきい値の調整を誤ると、画面全体がぼやけた眩しい印象になりすぎ、視認性を損なう。ゲームでは演出の強さをアートディレクションで慎重に調整するパラメータの一つになっている
- **使いどころ**: HDRレンダリングパイプラインのほぼ標準的な仕上げエフェクト、太陽・ネオンサイン・爆発のような強い光源の演出、写真的なリアリズムを狙った映像制作、ゲームエンジン(Unity・Unreal Engine)の標準ポストプロセススタックに組み込み済みの機能

## 実装例

輝度抽出→ガウスぼかし(分離可能な水平/垂直2パス)→加算合成までの一連の流れを示す。

```python
import math

def luminance(r: float, g: float, b: float) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def bright_pass(image: list[list[tuple[float, float, float]]], threshold: float) -> list[list[tuple[float, float, float]]]:
    h, w = len(image), len(image[0])
    out = [[(0.0, 0.0, 0.0)] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b = image[y][x]
            excess = max(0.0, luminance(r, g, b) - threshold)
            scale = excess / max(luminance(r, g, b), 1e-6)
            out[y][x] = (r * scale, g * scale, b * scale)
    return out

def gaussian_kernel(radius: int, sigma: float) -> list[float]:
    kernel = [math.exp(-(i ** 2) / (2 * sigma ** 2)) for i in range(-radius, radius + 1)]
    total = sum(kernel)
    return [k / total for k in kernel]

def blur_horizontal(image: list[list[tuple[float, float, float]]], kernel: list[float]) -> list[list[tuple[float, float, float]]]:
    h, w = len(image), len(image[0])
    radius = len(kernel) // 2
    out = [[(0.0, 0.0, 0.0)] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r = g = b = 0.0
            for k, weight in enumerate(kernel):
                sx = min(max(x + k - radius, 0), w - 1)
                pr, pg, pb = image[y][sx]
                r += pr * weight; g += pg * weight; b += pb * weight
            out[y][x] = (r, g, b)
    return out

def add_bloom(base: list[list[tuple[float, float, float]]], bloom: list[list[tuple[float, float, float]]]) -> list[list[tuple[float, float, float]]]:
    h, w = len(base), len(base[0])
    return [
        [(base[y][x][0] + bloom[y][x][0], base[y][x][1] + bloom[y][x][1], base[y][x][2] + bloom[y][x][2]) for x in range(w)]
        for y in range(h)
    ]
```

```typescript
type Rgb = [number, number, number];

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function brightPass(image: Rgb[][], threshold: number): Rgb[][] {
  return image.map((row) =>
    row.map(([r, g, b]) => {
      const lum = luminance([r, g, b]);
      const excess = Math.max(0, lum - threshold);
      const scale = excess / Math.max(lum, 1e-6);
      return [r * scale, g * scale, b * scale] as Rgb;
    }),
  );
}

function gaussianKernel(radius: number, sigma: number): number[] {
  const kernel = Array.from({ length: 2 * radius + 1 }, (_, i) =>
    Math.exp(-((i - radius) ** 2) / (2 * sigma ** 2)),
  );
  const total = kernel.reduce((a, b) => a + b, 0);
  return kernel.map((k) => k / total);
}

function blurHorizontal(image: Rgb[][], kernel: number[]): Rgb[][] {
  const h = image.length,
    w = image[0].length;
  const radius = Math.floor(kernel.length / 2);
  const out: Rgb[][] = Array.from({ length: h }, () =>
    new Array(w).fill([0, 0, 0]),
  );
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0;
      kernel.forEach((weight, k) => {
        const sx = Math.min(Math.max(x + k - radius, 0), w - 1);
        const [pr, pg, pb] = image[y][sx];
        r += pr * weight;
        g += pg * weight;
        b += pb * weight;
      });
      out[y][x] = [r, g, b];
    }
  }
  return out;
}
```

```cpp
#include <vector>
#include <array>
#include <cmath>
#include <algorithm>

using Rgb = std::array<double, 3>;

double luminance(const Rgb& c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }

std::vector<std::vector<Rgb>> brightPass(const std::vector<std::vector<Rgb>>& image, double threshold) {
    std::vector<std::vector<Rgb>> out = image;
    for (auto& row : out) {
        for (auto& px : row) {
            double lum = luminance(px);
            double excess = std::max(0.0, lum - threshold);
            double scale = excess / std::max(lum, 1e-6);
            px = {px[0] * scale, px[1] * scale, px[2] * scale};
        }
    }
    return out;
}

std::vector<double> gaussianKernel(int radius, double sigma) {
    std::vector<double> kernel(2 * radius + 1);
    double total = 0.0;
    for (int i = -radius; i <= radius; i++) {
        kernel[i + radius] = std::exp(-(i * i) / (2 * sigma * sigma));
        total += kernel[i + radius];
    }
    for (auto& k : kernel) k /= total;
    return kernel;
}
```

```rust
type Rgb = [f64; 3];

fn luminance(c: &Rgb) -> f64 {
    0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

fn bright_pass(image: &[Vec<Rgb>], threshold: f64) -> Vec<Vec<Rgb>> {
    image
        .iter()
        .map(|row| {
            row.iter()
                .map(|px| {
                    let lum = luminance(px);
                    let excess = (lum - threshold).max(0.0);
                    let scale = excess / lum.max(1e-6);
                    [px[0] * scale, px[1] * scale, px[2] * scale]
                })
                .collect()
        })
        .collect()
}

fn gaussian_kernel(radius: i32, sigma: f64) -> Vec<f64> {
    let kernel: Vec<f64> = (-radius..=radius)
        .map(|i| (-((i * i) as f64) / (2.0 * sigma * sigma)).exp())
        .collect();
    let total: f64 = kernel.iter().sum();
    kernel.iter().map(|k| k / total).collect()
}
```

```csharp
static double Luminance((double r, double g, double b) c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

static (double, double, double)[][] BrightPass((double r, double g, double b)[][] image, double threshold)
{
    int h = image.Length, w = image[0].Length;
    var outArr = new (double, double, double)[h][];
    for (int y = 0; y < h; y++)
    {
        outArr[y] = new (double, double, double)[w];
        for (int x = 0; x < w; x++)
        {
            var px = image[y][x];
            double lum = Luminance(px);
            double excess = Math.Max(0, lum - threshold);
            double scale = excess / Math.Max(lum, 1e-6);
            outArr[y][x] = (px.r * scale, px.g * scale, px.b * scale);
        }
    }
    return outArr;
}

static double[] GaussianKernel(int radius, double sigma)
{
    var kernel = new double[2 * radius + 1];
    double total = 0;
    for (int i = -radius; i <= radius; i++)
    {
        kernel[i + radius] = Math.Exp(-(i * i) / (2.0 * sigma * sigma));
        total += kernel[i + radius];
    }
    for (int i = 0; i < kernel.Length; i++) kernel[i] /= total;
    return kernel;
}
```
