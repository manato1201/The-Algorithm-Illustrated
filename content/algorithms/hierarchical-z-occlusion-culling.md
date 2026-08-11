---
name: 階層的Zバッファ法によるオクルージョンカリング(Hi-Z Occlusion Culling)
category: CG・3Dレンダリング
subcategory: 可視性・最適化
complexity: O(log(画面解像度))(1オブジェクトあたりの判定)
summary: 深度バッファのミップマップ(階層的Zバッファ)を使い、オブジェクトが手前の物体に完全に隠れているかをGPU上で高速に判定し、無駄な描画命令を発行前に間引く。
---

## 概要

[フラスタムカリング](/algorithms/frustum-culling)はカメラの視野外にあるオブジェクトを除外するが、視野内にあっても**他の物体の裏に完全に隠れていて画面には一切映らないオブジェクト**(例: 建物の裏側にある家具、山の向こう側にある村)は除外できない。このようなオブジェクトを描画してしまうと、ラスタライズ・ピクセルシェーダの処理を行った上で、結局は手前の物体に上書きされて捨てられる「無駄な描画(オーバードロー)」が発生する。階層的Zバッファ法(Hi-Z Occlusion Culling)は、通常の深度バッファ(Zバッファ)を**縮小率の異なる複数の解像度(ミップマップ)として保持**し、あるオブジェクトの領域全体が既存の深度値より確実に奥にあるかどうかを、低解像度のミップレベルを使って**少ない比較回数で高速に**判定する。GPUドリブンレンダリングの代表的な最適化技術として現代の3Dエンジンで広く使われている。

## 仕組み

1. 通常のZバッファ(各ピクセルの深度値を記録するバッファ)を、画像のミップマップと同様に**段階的に縮小した複数の解像度のバッファ(Hi-Zピラミッド)** として保持する。各レベルの1テクセルは、1つ下のレベルの2×2テクセルのうち**最も奥にある(最大の)深度値**を格納する(通常のミップマップが平均を取るのと異なり、Hi-Zでは「保守的に、最も遠い深度」を採用する)
2. 判定したいオブジェクトのバウンディングボックスを画面空間に投影し、それが画面上で占める矩形領域(スクリーン空間AABB)と、その領域内で最も手前にある深度値(オブジェクトの最近点の深度)を求める
3. その矩形領域の大きさに対応する適切なHi-Zのミップレベルを選ぶ(領域が広いほど、より粗い=低解像度のミップレベルを使うことで比較回数を抑える)
4. 選んだミップレベルの該当テクセルが持つ深度値(その領域で最も奥にある既存の深度)と、オブジェクトの最近点の深度を比較する。オブジェクトの最近点でさえ既存の深度より奥にあれば、そのオブジェクト全体が完全に隠れていると判定できる
5. 隠れていないと判定されたオブジェクトだけを実際の描画パイプラインに送る。この判定自体は多くの場合コンピュートシェーダでGPU上で並列に行われ(GPUドリブンカリング)、CPU-GPU間の描画命令発行のオーバーヘッドも削減できる

## 特性・トレードオフ

- **少ない比較回数で保守的な判定ができる**: 「最も奥の深度値」を採用したミップマップを使うことで、粗いミップレベル1回の比較だけで「その領域全体が確実に隠れているか」を判定でき、フルスクリーン解像度でピクセル単位に比較するより桁違いに高速になる
- **偽陰性は起こらないが、偽陽性(無駄な描画)は残りうる**: Hi-Zは「保守的に最も奥の深度」を使うため、実際には隠れているのに誤って「隠れていない」と判定してしまう(結果的に無駄な描画をしてしまう)ことはあっても、実際に見えているオブジェクトを誤って除外してしまうことは原理上起きない
- **前フレームの情報を使う実装が多い**: 現在フレームのHi-Zを構築してから同じフレーム内のカリングに使うと、Hi-Z自体の構築と利用の順序に制約が生じるため、実務では「前フレームの最終的なHi-Zピラミッドを使って今フレームのカリングを行う」という時間差を許容した実装(temporal reprojectionを併用することもある)がよく使われる
- **使いどころ**: 大規模都市シーン・屋内外を行き来するオープンワールドゲームの描画最適化、GPUドリブンレンダリングパイプライン(Nanite等)のカリング段階、建築ビジュアライゼーションのような密なオクルージョンが多いシーン

## 実装例

```python
import math

def build_hi_z_pyramid(depth_buffer: list[list[float]]) -> list[list[list[float]]]:
    """レベル0=元の深度バッファ、以降各レベルは2x2ブロックの最大値(最も奥)を取って縮小する。"""
    pyramid = [depth_buffer]
    current = depth_buffer
    while len(current) > 1 or len(current[0]) > 1:
        h, w = len(current), len(current[0])
        nh, nw = max(1, h // 2), max(1, w // 2)
        next_level = [[0.0] * nw for _ in range(nh)]
        for y in range(nh):
            for x in range(nw):
                block = [
                    current[min(2 * y + dy, h - 1)][min(2 * x + dx, w - 1)]
                    for dy in range(2) for dx in range(2)
                ]
                next_level[y][x] = max(block)  # 最も奥の深度を採用(保守的)
        pyramid.append(next_level)
        current = next_level
    return pyramid

def is_occluded(
    pyramid: list[list[list[float]]], screen_rect: tuple[int, int, int, int], nearest_depth: float,
) -> bool:
    """screen_rect=(x0,y0,x1,y1)は画面空間での矩形領域。矩形の大きさに応じたミップレベルを選ぶ。"""
    x0, y0, x1, y1 = screen_rect
    size = max(x1 - x0, y1 - y0, 1)
    level = min(len(pyramid) - 1, max(0, int(math.log2(size))))
    scale = 2 ** level
    lx0, ly0 = x0 // scale, y0 // scale
    lx1, ly1 = min(len(pyramid[level][0]) - 1, x1 // scale), min(len(pyramid[level]) - 1, y1 // scale)

    farthest_existing = max(
        pyramid[level][y][x] for y in range(ly0, ly1 + 1) for x in range(lx0, lx1 + 1)
    )
    return nearest_depth > farthest_existing  # オブジェクトの最近点でさえ既存の最遠深度より奥
```

```typescript
function buildHiZPyramid(depthBuffer: number[][]): number[][][] {
  const pyramid: number[][][] = [depthBuffer];
  let current = depthBuffer;
  while (current.length > 1 || current[0].length > 1) {
    const h = current.length, w = current[0].length;
    const nh = Math.max(1, Math.floor(h / 2));
    const nw = Math.max(1, Math.floor(w / 2));
    const nextLevel: number[][] = Array.from({ length: nh }, () => new Array(nw).fill(0));
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        let maxDepth = -Infinity;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const py = Math.min(2 * y + dy, h - 1);
            const px = Math.min(2 * x + dx, w - 1);
            maxDepth = Math.max(maxDepth, current[py][px]);
          }
        }
        nextLevel[y][x] = maxDepth;
      }
    }
    pyramid.push(nextLevel);
    current = nextLevel;
  }
  return pyramid;
}

function isOccluded(
  pyramid: number[][][], screenRect: [number, number, number, number], nearestDepth: number,
): boolean {
  const [x0, y0, x1, y1] = screenRect;
  const size = Math.max(x1 - x0, y1 - y0, 1);
  const level = Math.min(pyramid.length - 1, Math.max(0, Math.floor(Math.log2(size))));
  const scale = 2 ** level;
  const lx0 = Math.floor(x0 / scale), ly0 = Math.floor(y0 / scale);
  const lx1 = Math.min(pyramid[level][0].length - 1, Math.floor(x1 / scale));
  const ly1 = Math.min(pyramid[level].length - 1, Math.floor(y1 / scale));

  let farthestExisting = -Infinity;
  for (let y = ly0; y <= ly1; y++) {
    for (let x = lx0; x <= lx1; x++) farthestExisting = Math.max(farthestExisting, pyramid[level][y][x]);
  }
  return nearestDepth > farthestExisting;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <cmath>
#include <limits>

std::vector<std::vector<std::vector<double>>> buildHiZPyramid(const std::vector<std::vector<double>>& depthBuffer) {
    std::vector<std::vector<std::vector<double>>> pyramid = {depthBuffer};
    auto current = depthBuffer;
    while (current.size() > 1 || current[0].size() > 1) {
        int h = static_cast<int>(current.size()), w = static_cast<int>(current[0].size());
        int nh = std::max(1, h / 2), nw = std::max(1, w / 2);
        std::vector<std::vector<double>> next(nh, std::vector<double>(nw, 0.0));
        for (int y = 0; y < nh; y++) {
            for (int x = 0; x < nw; x++) {
                double maxDepth = -std::numeric_limits<double>::infinity();
                for (int dy = 0; dy < 2; dy++)
                    for (int dx = 0; dx < 2; dx++)
                        maxDepth = std::max(maxDepth, current[std::min(2 * y + dy, h - 1)][std::min(2 * x + dx, w - 1)]);
                next[y][x] = maxDepth;
            }
        }
        pyramid.push_back(next);
        current = next;
    }
    return pyramid;
}

bool isOccluded(const std::vector<std::vector<std::vector<double>>>& pyramid,
                 int x0, int y0, int x1, int y1, double nearestDepth) {
    int size = std::max({x1 - x0, y1 - y0, 1});
    int level = std::min(static_cast<int>(pyramid.size()) - 1, std::max(0, static_cast<int>(std::log2(size))));
    int scale = 1 << level;
    int lx0 = x0 / scale, ly0 = y0 / scale;
    int lx1 = std::min(static_cast<int>(pyramid[level][0].size()) - 1, x1 / scale);
    int ly1 = std::min(static_cast<int>(pyramid[level].size()) - 1, y1 / scale);

    double farthestExisting = -std::numeric_limits<double>::infinity();
    for (int y = ly0; y <= ly1; y++)
        for (int x = lx0; x <= lx1; x++)
            farthestExisting = std::max(farthestExisting, pyramid[level][y][x]);
    return nearestDepth > farthestExisting;
}
```

```rust
fn build_hi_z_pyramid(depth_buffer: &[Vec<f64>]) -> Vec<Vec<Vec<f64>>> {
    let mut pyramid = vec![depth_buffer.to_vec()];
    let mut current = depth_buffer.to_vec();
    while current.len() > 1 || current[0].len() > 1 {
        let h = current.len();
        let w = current[0].len();
        let nh = (h / 2).max(1);
        let nw = (w / 2).max(1);
        let mut next = vec![vec![0.0; nw]; nh];
        for y in 0..nh {
            for x in 0..nw {
                let mut max_depth = f64::MIN;
                for dy in 0..2 {
                    for dx in 0..2 {
                        let py = (2 * y + dy).min(h - 1);
                        let px = (2 * x + dx).min(w - 1);
                        max_depth = max_depth.max(current[py][px]);
                    }
                }
                next[y][x] = max_depth;
            }
        }
        pyramid.push(next.clone());
        current = next;
    }
    pyramid
}

fn is_occluded(pyramid: &[Vec<Vec<f64>>], x0: usize, y0: usize, x1: usize, y1: usize, nearest_depth: f64) -> bool {
    let size = (x1 - x0).max(y1 - y0).max(1);
    let level = ((size as f64).log2() as usize).min(pyramid.len() - 1);
    let scale = 1usize << level;
    let lx0 = x0 / scale;
    let ly0 = y0 / scale;
    let lx1 = (x1 / scale).min(pyramid[level][0].len() - 1);
    let ly1 = (y1 / scale).min(pyramid[level].len() - 1);

    let mut farthest_existing = f64::MIN;
    for y in ly0..=ly1 {
        for x in lx0..=lx1 {
            farthest_existing = farthest_existing.max(pyramid[level][y][x]);
        }
    }
    nearest_depth > farthest_existing
}
```

```csharp
static List<double[][]> BuildHiZPyramid(double[][] depthBuffer)
{
    var pyramid = new List<double[][]> { depthBuffer };
    var current = depthBuffer;
    while (current.Length > 1 || current[0].Length > 1)
    {
        int h = current.Length, w = current[0].Length;
        int nh = Math.Max(1, h / 2), nw = Math.Max(1, w / 2);
        var next = new double[nh][];
        for (int y = 0; y < nh; y++)
        {
            next[y] = new double[nw];
            for (int x = 0; x < nw; x++)
            {
                double maxDepth = double.NegativeInfinity;
                for (int dy = 0; dy < 2; dy++)
                    for (int dx = 0; dx < 2; dx++)
                        maxDepth = Math.Max(maxDepth, current[Math.Min(2 * y + dy, h - 1)][Math.Min(2 * x + dx, w - 1)]);
                next[y][x] = maxDepth;
            }
        }
        pyramid.Add(next);
        current = next;
    }
    return pyramid;
}

static bool IsOccluded(List<double[][]> pyramid, int x0, int y0, int x1, int y1, double nearestDepth)
{
    int size = Math.Max(Math.Max(x1 - x0, y1 - y0), 1);
    int level = Math.Min(pyramid.Count - 1, Math.Max(0, (int)Math.Log2(size)));
    int scale = 1 << level;
    int lx0 = x0 / scale, ly0 = y0 / scale;
    int lx1 = Math.Min(pyramid[level][0].Length - 1, x1 / scale);
    int ly1 = Math.Min(pyramid[level].Length - 1, y1 / scale);

    double farthestExisting = double.NegativeInfinity;
    for (int y = ly0; y <= ly1; y++)
        for (int x = lx0; x <= lx1; x++)
            farthestExisting = Math.Max(farthestExisting, pyramid[level][y][x]);
    return nearestDepth > farthestExisting;
}
```
