---
name: 距離変換(Distance Transform)
category: コンピュータビジョン
subcategory: 画像変換
complexity: O(w・h)(2パス法、w×hは画像サイズ)
summary: 2値画像の各画素に「最も近い前景(または背景)画素までの距離」を割り当てることで、形状の骨格抽出・最近傍検索・領域拡張といった処理を、画素ごとの単純な参照だけで高速に行えるようにする前処理。
---

## 概要

2値化された画像([大津の二値化](/algorithms/otsu-thresholding)のような手法で得られる、前景/背景に分かれた画像)から、「各画素が最も近い前景(または背景)の境界からどれだけ離れているか」という情報を得たい場面は多い——物体の中心軸を求める骨格化、[ウォーターシェッドアルゴリズム](/algorithms/watershed-algorithm)の前処理、経路計画における障害物からの安全マージンの計算など。距離変換は、2値画像の各画素に「最も近い(反対のクラスの)画素までの距離」を割り当てた**距離マップ**を生成する処理である。素朴には各画素について全ての境界画素との距離を計算するとO((wh)²)になってしまうが、**2回の走査(順方向と逆方向)だけで正確な距離マップを計算できる効率的なアルゴリズム**が知られており、[バイラテラルフィルタ](/algorithms/bilateral-filter)と同様、多くの画像処理パイプラインの基礎的な前処理として使われている。

## 仕組み

チェビシェフ距離やマンハッタン距離のような近似では、単純な2パスの走査で十分な精度が得られる(ユークリッド距離の正確な計算にはより工夫が必要だが、同じ2パスの発想を拡張できる)。

1. 各画素に初期値を設定する:前景画素(距離を測りたい対象からの距離がゼロになる基準点)には0を、それ以外には十分大きな値(無限大)を設定する
2. **順方向パス**: 画像を左上から右下へラスタスキャンしながら、各画素について「既に処理済みの近傍画素(左、上、左上、右上など)の距離値+その方向への移動コスト」の最小値で、その画素の距離値を更新する
3. **逆方向パス**: 画像を右下から左上へ逆順にラスタスキャンしながら、同様に「既に処理済みの近傍画素(右、下、右下、左下など)の距離値+移動コスト」の最小値で更新する
4. 2回のパスにより、各画素は上下左右斜めの全方向からの最短距離情報が伝播し尽くし、最終的な距離マップが得られる(1回の走査だけでは、走査順序と逆方向にある最近傍点の情報が伝わらないため、2パスが必要になる)
5. より正確なユークリッド距離変換が必要な場合は、各行・各列に対して1次元の距離変換を独立に適用してから組み合わせる、フェルツェンシュヴァルブ&ハッテンロッカーのアルゴリズムのような、下に凸な放物線の下包絡線を求める手法が使われる

## 特性・トレードオフ

- **境界からの距離情報を画素ごとの参照だけで高速に利用できる**: 一度距離マップを計算しておけば、以降は「この画素は境界からどれだけ離れているか」を単純な配列参照で即座に得られる。都度距離を計算し直す必要がなく、経路計画やモルフォロジー処理の高速化に大きく貢献する
- **骨格化(スケルトン抽出)への応用**: 距離マップの局所的な尾根(周囲より距離値が大きい画素の連なり)を追跡すると、形状の「中心軸」に相当する骨格線が得られる。これは文字認識・指紋認識における特徴抽出の前処理として使われる
- **距離の定義(距離計量)による精度と速度のトレードオフ**: チェビシェフ距離・マンハッタン距離は2パスの単純な走査で正確に計算できるが、実際の幾何学的な距離(ユークリッド距離)とはやや異なる形状の等距離線になる。正確なユークリッド距離変換はやや複雑なアルゴリズムを要するが、より自然な等距離線が得られる
- **使いどころ**: [ウォーターシェッドアルゴリズム](/algorithms/watershed-algorithm)の前処理(重なり合う物体の分離)、文字・指紋認識における骨格抽出、ロボットの経路計画における障害物からの安全マージン計算、[バイラテラルフィルタ](/algorithms/bilateral-filter)や領域成長法と組み合わせた画像セグメンテーション

## 実装例

チェビシェフ距離に基づく2パス距離変換を示す。

```python
def distance_transform(binary_image: list[list[int]]) -> list[list[float]]:
    """binary_image[y][x] = 1が前景(距離0の基準点)、0が背景。"""
    height, width = len(binary_image), len(binary_image[0])
    inf = float("inf")
    dist = [[0.0 if binary_image[y][x] == 1 else inf for x in range(width)] for y in range(height)]

    # 順方向パス(左上から右下)
    for y in range(height):
        for x in range(width):
            if dist[y][x] == 0.0:
                continue
            candidates = [dist[y][x]]
            if x > 0:
                candidates.append(dist[y][x - 1] + 1)
            if y > 0:
                candidates.append(dist[y - 1][x] + 1)
            if x > 0 and y > 0:
                candidates.append(dist[y - 1][x - 1] + 1)
            if x < width - 1 and y > 0:
                candidates.append(dist[y - 1][x + 1] + 1)
            dist[y][x] = min(candidates)

    # 逆方向パス(右下から左上)
    for y in range(height - 1, -1, -1):
        for x in range(width - 1, -1, -1):
            candidates = [dist[y][x]]
            if x < width - 1:
                candidates.append(dist[y][x + 1] + 1)
            if y < height - 1:
                candidates.append(dist[y + 1][x] + 1)
            if x < width - 1 and y < height - 1:
                candidates.append(dist[y + 1][x + 1] + 1)
            if x > 0 and y < height - 1:
                candidates.append(dist[y + 1][x - 1] + 1)
            dist[y][x] = min(candidates)

    return dist
```

```typescript
function distanceTransform(binaryImage: number[][]): number[][] {
  const height = binaryImage.length;
  const width = binaryImage[0].length;
  const dist: number[][] = binaryImage.map((row) => row.map((v) => (v === 1 ? 0 : Infinity)));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (dist[y][x] === 0) continue;
      const candidates = [dist[y][x]];
      if (x > 0) candidates.push(dist[y][x - 1] + 1);
      if (y > 0) candidates.push(dist[y - 1][x] + 1);
      if (x > 0 && y > 0) candidates.push(dist[y - 1][x - 1] + 1);
      if (x < width - 1 && y > 0) candidates.push(dist[y - 1][x + 1] + 1);
      dist[y][x] = Math.min(...candidates);
    }
  }

  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const candidates = [dist[y][x]];
      if (x < width - 1) candidates.push(dist[y][x + 1] + 1);
      if (y < height - 1) candidates.push(dist[y + 1][x] + 1);
      if (x < width - 1 && y < height - 1) candidates.push(dist[y + 1][x + 1] + 1);
      if (x > 0 && y < height - 1) candidates.push(dist[y + 1][x - 1] + 1);
      dist[y][x] = Math.min(...candidates);
    }
  }

  return dist;
}
```

```cpp
#include <vector>
#include <limits>
#include <algorithm>

std::vector<std::vector<double>> distanceTransform(const std::vector<std::vector<int>>& binaryImage) {
    int height = static_cast<int>(binaryImage.size()), width = static_cast<int>(binaryImage[0].size());
    double inf = std::numeric_limits<double>::infinity();
    std::vector<std::vector<double>> dist(height, std::vector<double>(width));
    for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++)
            dist[y][x] = binaryImage[y][x] == 1 ? 0.0 : inf;

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            if (dist[y][x] == 0.0) continue;
            double best = dist[y][x];
            if (x > 0) best = std::min(best, dist[y][x - 1] + 1);
            if (y > 0) best = std::min(best, dist[y - 1][x] + 1);
            if (x > 0 && y > 0) best = std::min(best, dist[y - 1][x - 1] + 1);
            if (x < width - 1 && y > 0) best = std::min(best, dist[y - 1][x + 1] + 1);
            dist[y][x] = best;
        }
    }

    for (int y = height - 1; y >= 0; y--) {
        for (int x = width - 1; x >= 0; x--) {
            double best = dist[y][x];
            if (x < width - 1) best = std::min(best, dist[y][x + 1] + 1);
            if (y < height - 1) best = std::min(best, dist[y + 1][x] + 1);
            if (x < width - 1 && y < height - 1) best = std::min(best, dist[y + 1][x + 1] + 1);
            if (x > 0 && y < height - 1) best = std::min(best, dist[y + 1][x - 1] + 1);
            dist[y][x] = best;
        }
    }

    return dist;
}
```

```rust
fn distance_transform(binary_image: &[Vec<i32>]) -> Vec<Vec<f64>> {
    let height = binary_image.len();
    let width = binary_image[0].len();
    let mut dist: Vec<Vec<f64>> = binary_image
        .iter()
        .map(|row| row.iter().map(|&v| if v == 1 { 0.0 } else { f64::INFINITY }).collect())
        .collect();

    for y in 0..height {
        for x in 0..width {
            if dist[y][x] == 0.0 {
                continue;
            }
            let mut best = dist[y][x];
            if x > 0 {
                best = best.min(dist[y][x - 1] + 1.0);
            }
            if y > 0 {
                best = best.min(dist[y - 1][x] + 1.0);
            }
            if x > 0 && y > 0 {
                best = best.min(dist[y - 1][x - 1] + 1.0);
            }
            if x < width - 1 && y > 0 {
                best = best.min(dist[y - 1][x + 1] + 1.0);
            }
            dist[y][x] = best;
        }
    }

    for y in (0..height).rev() {
        for x in (0..width).rev() {
            let mut best = dist[y][x];
            if x < width - 1 {
                best = best.min(dist[y][x + 1] + 1.0);
            }
            if y < height - 1 {
                best = best.min(dist[y + 1][x] + 1.0);
            }
            if x < width - 1 && y < height - 1 {
                best = best.min(dist[y + 1][x + 1] + 1.0);
            }
            if x > 0 && y < height - 1 {
                best = best.min(dist[y + 1][x - 1] + 1.0);
            }
            dist[y][x] = best;
        }
    }

    dist
}
```

```csharp
static double[][] DistanceTransform(int[][] binaryImage)
{
    int height = binaryImage.Length, width = binaryImage[0].Length;
    var dist = new double[height][];
    for (int y = 0; y < height; y++)
    {
        dist[y] = new double[width];
        for (int x = 0; x < width; x++) dist[y][x] = binaryImage[y][x] == 1 ? 0.0 : double.PositiveInfinity;
    }

    for (int y = 0; y < height; y++)
    {
        for (int x = 0; x < width; x++)
        {
            if (dist[y][x] == 0.0) continue;
            double best = dist[y][x];
            if (x > 0) best = Math.Min(best, dist[y][x - 1] + 1);
            if (y > 0) best = Math.Min(best, dist[y - 1][x] + 1);
            if (x > 0 && y > 0) best = Math.Min(best, dist[y - 1][x - 1] + 1);
            if (x < width - 1 && y > 0) best = Math.Min(best, dist[y - 1][x + 1] + 1);
            dist[y][x] = best;
        }
    }

    for (int y = height - 1; y >= 0; y--)
    {
        for (int x = width - 1; x >= 0; x--)
        {
            double best = dist[y][x];
            if (x < width - 1) best = Math.Min(best, dist[y][x + 1] + 1);
            if (y < height - 1) best = Math.Min(best, dist[y + 1][x] + 1);
            if (x < width - 1 && y < height - 1) best = Math.Min(best, dist[y + 1][x + 1] + 1);
            if (x > 0 && y < height - 1) best = Math.Min(best, dist[y + 1][x - 1] + 1);
            dist[y][x] = best;
        }
    }

    return dist;
}
```
