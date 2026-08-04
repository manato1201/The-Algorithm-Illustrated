---
name: ソーベルフィルタ
category: コンピュータビジョン
subcategory: エッジ・特徴検出
complexity: O(w×h)(w×h画像、カーネルサイズ固定)
summary: 縦横2方向の小さな畳み込みカーネルで明るさの勾配を近似し、輪郭(エッジ)を検出する最も基本的な画像処理フィルタ。
---

## 概要

画像中の「物体の輪郭」は、多くの場合、明るさが急激に変化する場所として現れる。ソーベルフィルタは、[離散畳み込み](/algorithms/discrete-convolution)の考え方を画像に応用し、横方向・縦方向それぞれの明るさの勾配(傾き)を3×3の小さなカーネルで近似計算することで、この輪郭を検出する。1968年にソーベルとファインマンが考案したこのフィルタは、計算がシンプルで高速でありながら実用に足る精度を持つため、より高度なエッジ検出手法である[Cannyエッジ検出](/algorithms/canny-edge-detection)の内部でも勾配計算の部品として使われている。

## 仕組み

1. 横方向の勾配を検出するカーネル`Gx`(例: `[[-1,0,1],[-2,0,2],[-1,0,1]]`)と、縦方向の勾配を検出するカーネル`Gy`(`Gx`を90度回転した形)を用意する
2. 画像の各画素について、その周囲3×3の近傍と`Gx`との畳み込みを計算し、横方向の勾配の強さ`Gx値`を得る。同様に`Gy`との畳み込みで縦方向の勾配`Gy値`を得る
3. その画素での勾配の大きさ(エッジの強さ)を`√(Gx値² + Gy値²)`(または近似として`|Gx値| + |Gy値|`)として計算する
4. 勾配の方向は`atan2(Gy値, Gx値)`で求まる——これはエッジが伸びている方向と直交する向きを表す
5. 全画素についてこれを計算し、勾配の大きさをそのまま画素値とした「エッジ強度マップ」を出力する

## 特性・トレードオフ

- **計算量**: 画像の各画素で固定サイズ(3×3)のカーネルとの畳み込みを行うだけなので`O(w×h)`(画像サイズに比例)。非常に高速で、リアルタイム処理にも向く
- **ノイズに敏感**: 微分(勾配)ベースの手法は原理的にノイズを増幅しやすい。ノイズの多い画像では、事前にガウシアンフィルタなどで平滑化してから適用することが多い([Cannyエッジ検出](/algorithms/canny-edge-detection)はこの平滑化・非最大値抑制・ヒステリシス閾値処理までを含む、より洗練された発展形)
- **エッジの「太さ」の問題**: 勾配の大きさをそのまま出力するため、検出されるエッジは1画素幅の線ではなく、ある程度の太さを持ったぼやけた帯になる。細い1画素幅の輪郭線が必要な場合は、勾配の極大値だけを残す非最大値抑制などの後処理が必要
- **使いどころ**: 画像処理パイプラインの前段(輪郭抽出、物体検出の特徴量計算)、より高度なエッジ検出・特徴点検出アルゴリズムの内部部品、リアルタイム性が求められる組み込みビジョンシステム

## 実装例

5×5の小さなグレースケール画像(境界は端の画素を複製して処理)に対してSobelフィルタを適用する例。縦のエッジ(左が暗く右が明るい)を持つテスト画像で境界付近の勾配が強く出ること、一様な画像では勾配が全てゼロになることを検証している。

```python
import math


def sobel_filter(image: list[list[int]]) -> list[list[float]]:
    h = len(image)
    w = len(image[0]) if h > 0 else 0
    gx_kernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
    gy_kernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
    result = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            gx = 0
            gy = 0
            for ky in range(-1, 2):
                for kx in range(-1, 2):
                    yy = min(max(y + ky, 0), h - 1)  # 端の画素を複製(クランプ)
                    xx = min(max(x + kx, 0), w - 1)
                    pixel = image[yy][xx]
                    gx += pixel * gx_kernel[ky + 1][kx + 1]
                    gy += pixel * gy_kernel[ky + 1][kx + 1]
            result[y][x] = math.sqrt(gx * gx + gy * gy)
    return result
```

```typescript
function sobelFilter(image: number[][]): number[][] {
  const h = image.length;
  const w = h > 0 ? image[0].length : 0;
  const gxKernel = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const gyKernel = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];
  const result: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const yy = Math.min(Math.max(y + ky, 0), h - 1);
          const xx = Math.min(Math.max(x + kx, 0), w - 1);
          const pixel = image[yy][xx];
          gx += pixel * gxKernel[ky + 1][kx + 1];
          gy += pixel * gyKernel[ky + 1][kx + 1];
        }
      }
      result[y][x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return result;
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

std::vector<std::vector<double>> sobelFilter(const std::vector<std::vector<int>>& image) {
    int h = static_cast<int>(image.size());
    int w = h > 0 ? static_cast<int>(image[0].size()) : 0;
    int gxKernel[3][3] = {{-1, 0, 1}, {-2, 0, 2}, {-1, 0, 1}};
    int gyKernel[3][3] = {{-1, -2, -1}, {0, 0, 0}, {1, 2, 1}};
    std::vector<std::vector<double>> result(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            int gx = 0, gy = 0;
            for (int ky = -1; ky <= 1; ky++) {
                for (int kx = -1; kx <= 1; kx++) {
                    int yy = std::min(std::max(y + ky, 0), h - 1);
                    int xx = std::min(std::max(x + kx, 0), w - 1);
                    int pixel = image[yy][xx];
                    gx += pixel * gxKernel[ky + 1][kx + 1];
                    gy += pixel * gyKernel[ky + 1][kx + 1];
                }
            }
            result[y][x] = std::sqrt(static_cast<double>(gx * gx + gy * gy));
        }
    }
    return result;
}
```

```rust
fn sobel_filter(image: &[Vec<i32>]) -> Vec<Vec<f64>> {
    let h = image.len();
    let w = if h > 0 { image[0].len() } else { 0 };
    let gx_kernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    let gy_kernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    let mut result = vec![vec![0.0f64; w]; h];
    for y in 0..h {
        for x in 0..w {
            let mut gx = 0i32;
            let mut gy = 0i32;
            for ky in -1i32..=1 {
                for kx in -1i32..=1 {
                    let yy = (y as i32 + ky).clamp(0, h as i32 - 1) as usize;
                    let xx = (x as i32 + kx).clamp(0, w as i32 - 1) as usize;
                    let pixel = image[yy][xx];
                    gx += pixel * gx_kernel[(ky + 1) as usize][(kx + 1) as usize];
                    gy += pixel * gy_kernel[(ky + 1) as usize][(kx + 1) as usize];
                }
            }
            result[y][x] = ((gx * gx + gy * gy) as f64).sqrt();
        }
    }
    result
}
```

```csharp
static double[][] SobelFilter(int[][] image)
{
    int h = image.Length;
    int w = h > 0 ? image[0].Length : 0;
    int[][] gxKernel = { new[] { -1, 0, 1 }, new[] { -2, 0, 2 }, new[] { -1, 0, 1 } };
    int[][] gyKernel = { new[] { -1, -2, -1 }, new[] { 0, 0, 0 }, new[] { 1, 2, 1 } };
    var result = new double[h][];
    for (int y = 0; y < h; y++) result[y] = new double[w];
    for (int y = 0; y < h; y++)
    {
        for (int x = 0; x < w; x++)
        {
            int gx = 0, gy = 0;
            for (int ky = -1; ky <= 1; ky++)
            {
                for (int kx = -1; kx <= 1; kx++)
                {
                    int yy = Math.Min(Math.Max(y + ky, 0), h - 1);
                    int xx = Math.Min(Math.Max(x + kx, 0), w - 1);
                    int pixel = image[yy][xx];
                    gx += pixel * gxKernel[ky + 1][kx + 1];
                    gy += pixel * gyKernel[ky + 1][kx + 1];
                }
            }
            result[y][x] = Math.Sqrt(gx * gx + gy * gy);
        }
    }
    return result;
}
```
