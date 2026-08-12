---
name: バイラテラルフィルタ(エッジ保存平滑化)
category: コンピュータビジョン
subcategory: 画像変換
complexity: O(w・h・k²)(w×hは画像サイズ、kはフィルタ窓のサイズ)
summary: 通常のガウスぼかしが「空間的な近さ」だけで重みを決めるのに対し、「画素値の近さ」も同時に考慮することで、ノイズは滑らかに除去しながらエッジ(輪郭)をぼかさずに保つ非線形な平滑化フィルタ。
---

## 概要

[ガウスピラミッド](/algorithms/gaussian-pyramid)で使われるような通常のガウスぼかしは、注目画素の周囲にある画素を、その**空間的な距離だけ**に基づいた重みで平均する。この方法はノイズを滑らかに除去できる一方、画像のエッジ(輪郭線、物体の境界)も一緒にぼかしてしまうという避けられない副作用を持つ——エッジの両側の画素値が大きく異なっていても、空間的に近ければ同じように平均されてしまうためである。バイラテラルフィルタは、1998年にカルロ・トマシとロベルト・マンドゥーチが提案した手法で、重みを決める基準を**空間的な近さに加えて「画素値(輝度・色)の近さ」も同時に考慮**することで、この問題を解決する。エッジをまたぐ画素同士は、空間的には近くても画素値が大きく異なるため低い重みしか与えられず、平均計算からほぼ除外される。結果として、平坦な領域のノイズは滑らかに除去されながら、エッジは鮮明に保たれる。

## 仕組み

1. 注目画素`p`について、周囲の窓内の各画素`q`に対して**2種類の重み**を計算する:
   - **空間的な重み**`w_spatial(p,q) = exp(-|p-q|² / (2σ_spatial²))`(通常のガウスぼかしと同じ、距離が近いほど大きい)
   - **画素値の重み**`w_range(p,q) = exp(-|I(p)-I(q)|² / (2σ_range²))`(画素値が近いほど大きい、エッジをまたぐと急激に小さくなる)
2. 2つの重みの**積**`w(p,q) = w_spatial(p,q) × w_range(p,q)`を、その画素ペアの最終的な重みとする
3. 窓内の全画素`q`について、重み付き平均を計算する:`I'(p) = Σ_q w(p,q)・I(q) / Σ_q w(p,q)`
4. 全画素についてこの計算を繰り返すことで、フィルタ後の画像が得られる

## 特性・トレードオフ

- **エッジを保存しながらノイズを除去する非線形フィルタ**: 通常のガウスぼかしのような線形フィルタでは原理的に不可能な「平坦な領域は滑らかに、エッジは鮮明に」という選択的な平滑化を実現する。写真のノイズ除去、絵画調のスタイライゼーション(エッジを残しつつ色を単純化する)など、幅広い画像処理の前処理・後処理に使われる
- **計算コストの高さ**: 各画素ごとに、画素値の重みを窓内の全画素に対して個別に計算する必要があり、通常の分離可能なガウスフィルタ(2回の1次元畳み込みで済む)のような高速化が単純には適用できない。実務では、双方向グリッド(bilateral grid)や近似計算を使った高速化手法が使われることが多い
- **パラメータ`σ_spatial`・`σ_range`のバランス**: `σ_spatial`が大きいほど広い範囲を平滑化し、`σ_range`が大きいほどエッジをまたいだ平均化を許容するようになる(結果的に通常のガウスぼかしに近づく)。両者を適切に設定することで、「ノイズ除去の強さ」と「エッジ保存の厳密さ」のバランスを調整する
- **使いどころ**: デジタルカメラ・スマートフォンの写真ノイズ除去(HDR処理の前処理としても使われる)、[距離変換](/algorithms/distance-transform)や領域分割の前処理としての画像の平滑化、絵画・イラスト風のスタイライゼーションフィルタ、医療画像処理におけるノイズ除去(構造の境界を保ちたい場合)

## 実装例

```python
import math

def bilateral_filter(image: list[list[float]], radius: int, sigma_spatial: float, sigma_range: float) -> list[list[float]]:
    height, width = len(image), len(image[0])
    output = [[0.0] * width for _ in range(height)]

    for y in range(height):
        for x in range(width):
            center_value = image[y][x]
            total_weight = 0.0
            weighted_sum = 0.0

            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    ny, nx = y + dy, x + dx
                    if not (0 <= ny < height and 0 <= nx < width):
                        continue
                    neighbor_value = image[ny][nx]

                    spatial_dist_sq = dx * dx + dy * dy
                    range_dist_sq = (neighbor_value - center_value) ** 2

                    w_spatial = math.exp(-spatial_dist_sq / (2 * sigma_spatial ** 2))
                    w_range = math.exp(-range_dist_sq / (2 * sigma_range ** 2))
                    w = w_spatial * w_range

                    weighted_sum += w * neighbor_value
                    total_weight += w

            output[y][x] = weighted_sum / total_weight if total_weight > 0 else center_value

    return output
```

```typescript
function bilateralFilter(
  image: number[][],
  radius: number,
  sigmaSpatial: number,
  sigmaRange: number,
): number[][] {
  const height = image.length;
  const width = image[0].length;
  const output: number[][] = Array.from({ length: height }, () =>
    new Array(width).fill(0),
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerValue = image[y][x];
      let totalWeight = 0;
      let weightedSum = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy,
            nx = x + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          const neighborValue = image[ny][nx];

          const spatialDistSq = dx * dx + dy * dy;
          const rangeDistSq = (neighborValue - centerValue) ** 2;

          const wSpatial = Math.exp(-spatialDistSq / (2 * sigmaSpatial ** 2));
          const wRange = Math.exp(-rangeDistSq / (2 * sigmaRange ** 2));
          const w = wSpatial * wRange;

          weightedSum += w * neighborValue;
          totalWeight += w;
        }
      }

      output[y][x] = totalWeight > 0 ? weightedSum / totalWeight : centerValue;
    }
  }

  return output;
}
```

```cpp
#include <vector>
#include <cmath>

std::vector<std::vector<double>> bilateralFilter(
    const std::vector<std::vector<double>>& image, int radius, double sigmaSpatial, double sigmaRange) {
    int height = static_cast<int>(image.size()), width = static_cast<int>(image[0].size());
    std::vector<std::vector<double>> output(height, std::vector<double>(width, 0.0));

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            double centerValue = image[y][x];
            double totalWeight = 0.0, weightedSum = 0.0;

            for (int dy = -radius; dy <= radius; dy++) {
                for (int dx = -radius; dx <= radius; dx++) {
                    int ny = y + dy, nx = x + dx;
                    if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
                    double neighborValue = image[ny][nx];

                    double spatialDistSq = dx * dx + dy * dy;
                    double rangeDistSq = (neighborValue - centerValue) * (neighborValue - centerValue);

                    double wSpatial = std::exp(-spatialDistSq / (2 * sigmaSpatial * sigmaSpatial));
                    double wRange = std::exp(-rangeDistSq / (2 * sigmaRange * sigmaRange));
                    double w = wSpatial * wRange;

                    weightedSum += w * neighborValue;
                    totalWeight += w;
                }
            }

            output[y][x] = totalWeight > 0 ? weightedSum / totalWeight : centerValue;
        }
    }

    return output;
}
```

```rust
fn bilateral_filter(image: &[Vec<f64>], radius: i32, sigma_spatial: f64, sigma_range: f64) -> Vec<Vec<f64>> {
    let height = image.len() as i32;
    let width = image[0].len() as i32;
    let mut output = vec![vec![0.0; width as usize]; height as usize];

    for y in 0..height {
        for x in 0..width {
            let center_value = image[y as usize][x as usize];
            let mut total_weight = 0.0;
            let mut weighted_sum = 0.0;

            for dy in -radius..=radius {
                for dx in -radius..=radius {
                    let ny = y + dy;
                    let nx = x + dx;
                    if ny < 0 || ny >= height || nx < 0 || nx >= width {
                        continue;
                    }
                    let neighbor_value = image[ny as usize][nx as usize];

                    let spatial_dist_sq = (dx * dx + dy * dy) as f64;
                    let range_dist_sq = (neighbor_value - center_value).powi(2);

                    let w_spatial = (-spatial_dist_sq / (2.0 * sigma_spatial.powi(2))).exp();
                    let w_range = (-range_dist_sq / (2.0 * sigma_range.powi(2))).exp();
                    let w = w_spatial * w_range;

                    weighted_sum += w * neighbor_value;
                    total_weight += w;
                }
            }

            output[y as usize][x as usize] = if total_weight > 0.0 { weighted_sum / total_weight } else { center_value };
        }
    }

    output
}
```

```csharp
static double[][] BilateralFilter(double[][] image, int radius, double sigmaSpatial, double sigmaRange)
{
    int height = image.Length, width = image[0].Length;
    var output = new double[height][];
    for (int i = 0; i < height; i++) output[i] = new double[width];

    for (int y = 0; y < height; y++)
    {
        for (int x = 0; x < width; x++)
        {
            double centerValue = image[y][x];
            double totalWeight = 0, weightedSum = 0;

            for (int dy = -radius; dy <= radius; dy++)
            {
                for (int dx = -radius; dx <= radius; dx++)
                {
                    int ny = y + dy, nx = x + dx;
                    if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
                    double neighborValue = image[ny][nx];

                    double spatialDistSq = dx * dx + dy * dy;
                    double rangeDistSq = Math.Pow(neighborValue - centerValue, 2);

                    double wSpatial = Math.Exp(-spatialDistSq / (2 * sigmaSpatial * sigmaSpatial));
                    double wRange = Math.Exp(-rangeDistSq / (2 * sigmaRange * sigmaRange));
                    double w = wSpatial * wRange;

                    weightedSum += w * neighborValue;
                    totalWeight += w;
                }
            }

            output[y][x] = totalWeight > 0 ? weightedSum / totalWeight : centerValue;
        }
    }

    return output;
}
```
