---
name: SIFT(Scale-Invariant Feature Transform)
category: コンピュータビジョン
subcategory: エッジ・特徴検出
complexity: O(w×h×スケール数)(特徴点検出部分)
summary: 画像の拡大縮小・回転・照明変化があっても同じ特徴点を安定して見つけ出せる、局所特徴量抽出のデファクトスタンダード。
---

## 概要

[Harrisコーナー検出](/algorithms/harris-corner-detection)は画像が回転しても安定だが、拡大縮小(スケール変化)には弱い——遠くから撮った写真と近くから撮った写真では、同じ物体のコーナーらしさの見え方が変わってしまう。2004年にデイビッド・ロウが発表したSIFTは、画像を様々なスケールでぼかしながら特徴点を探すことでスケール不変性を獲得し、さらに各特徴点に「見た目の指紋」とも言える特徴量ベクトル(記述子)を割り当てることで、拡大縮小・回転・照明変化があっても同一の点として対応付けられる、極めて頑健な局所特徴量を実現した。

## 仕組み

1. **スケール空間の構築**: 画像をガウシアンフィルタで様々な強さでぼかした画像の系列(オクターブ)を作り、隣接するぼかし度の差分(DoG: Difference of Gaussian)を計算する——これは[離散畳み込み](/algorithms/discrete-convolution)による平滑化を段階的なスケールで繰り返す操作にあたる
2. **極値点の検出**: DoG画像の各点について、同じスケール内の8近傍と上下のスケールの各9近傍(合計26点)と比較し、極大値または極小値になっている点を候補として検出する——これがスケール方向にも安定な特徴点候補になる
3. **候補点の絞り込み**: コントラストが低い(ノイズの可能性が高い)点や、[Harrisコーナー検出](/algorithms/harris-corner-detection)と同様の考え方でエッジ上の不安定な点を除外する
4. **主方向の割り当て**: 各特徴点の周囲の勾配方向のヒストグラムを作り、最も頻度の高い方向をその特徴点の「基準方向」とする——これにより画像が回転しても特徴量を回転に合わせて正規化でき、回転不変性が得られる
5. **特徴量記述子の生成**: 特徴点周囲の領域を格子状に分割し、各格子内の勾配方向のヒストグラムを集めた128次元のベクトルを生成する。これが「見た目の指紋」として、異なる画像間での対応点マッチングに使われる

## 特性・トレードオフ

- **計算量**: スケール空間の構築が画像サイズ×スケール数に比例するため、[ソーベルフィルタ](/algorithms/sobel-filter)や[Harrisコーナー検出](/algorithms/harris-corner-detection)よりも計算コストが高い。リアルタイム処理には工夫や高速な近似手法(ORB、SURF等)が使われることも多い
- **スケール・回転・照明変化への頑健性**: SIFTの最大の強みは、拡大縮小・回転・ある程度の照明変化があっても同じ特徴点を安定して検出・マッチングできる点にある。パノラマ合成や物体認識で異なる条件で撮影された画像同士を対応付けられるのはこの性質のおかげ
- **特許・ライセンスの歴史**: SIFTは長らく特許で保護されており商用利用に制約があったが、2020年に特許が失効し自由に利用できるようになった。特許期間中はORB(Oriented FAST and Rotated BRIEF)のような特許フリーの代替手法も広く使われた
- **使いどころ**: パノラマ画像の自動合成、物体認識・画像検索(似た画像の検索)、カメラの位置・姿勢推定(Structure from Motion、SLAM)における画像間の対応点探索。[RANSAC](/algorithms/ransac)と組み合わせて、誤対応点を除去しながら画像間の変換(ホモグラフィ)を頑健に推定する用途で頻繁に使われる

## 実装例

小さな2次元配列に対して、ガウシアンぼかしの差分(DoG)によるスケール空間極値点検出の中核部分だけを実装した例(主方向割り当て・記述子生成は省略)。中心に明るいブロブを持つ17×17のテスト画像で、ブロブの中心付近に極値点が検出されること、一様な画像では極値点が検出されないことを検証している。

```python
import math


def gaussian_kernel_1d(sigma: float, radius: int) -> list[float]:
    kernel = [math.exp(-(x * x) / (2 * sigma * sigma)) for x in range(-radius, radius + 1)]
    s = sum(kernel)
    return [k / s for k in kernel]


def gaussian_blur(image: list[list[float]], sigma: float) -> list[list[float]]:
    radius = max(1, round(3 * sigma))
    kernel = gaussian_kernel_1d(sigma, radius)
    h, w = len(image), len(image[0])
    temp = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            total = 0.0
            for k in range(-radius, radius + 1):
                xx = min(max(x + k, 0), w - 1)
                total += image[y][xx] * kernel[k + radius]
            temp[y][x] = total
    result = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            total = 0.0
            for k in range(-radius, radius + 1):
                yy = min(max(y + k, 0), h - 1)
                total += temp[yy][x] * kernel[k + radius]
            result[y][x] = total
    return result


def build_dog_pyramid(image: list[list[float]], num_scales: int = 5, sigma0: float = 1.0) -> list[list[list[float]]]:
    k = 2.0 ** 0.5
    blurred = [gaussian_blur(image, sigma0 * (k ** i)) for i in range(num_scales)]
    h, w = len(image), len(image[0])
    dog = []
    for i in range(num_scales - 1):
        d = [[blurred[i + 1][y][x] - blurred[i][y][x] for x in range(w)] for y in range(h)]
        dog.append(d)
    return dog


def find_scale_space_extrema(dog: list[list[list[float]]]) -> list[tuple[int, int, int]]:
    """DoGピラミッドから極値点(layer, y, x)を検出する"""
    num_layers = len(dog)
    h, w = len(dog[0]), len(dog[0][0])
    keypoints = []
    for layer in range(1, num_layers - 1):
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                val = dog[layer][y][x]
                is_max, is_min = True, True
                for dl in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            if dl == 0 and dy == 0 and dx == 0:
                                continue
                            neighbor = dog[layer + dl][y + dy][x + dx]
                            if neighbor >= val:
                                is_max = False
                            if neighbor <= val:
                                is_min = False
                if is_max or is_min:
                    keypoints.append((layer, y, x))
    return keypoints
```

```typescript
function gaussianKernel1d(sigma: number, radius: number): number[] {
  const kernel: number[] = [];
  for (let x = -radius; x <= radius; x++) {
    kernel.push(Math.exp(-(x * x) / (2 * sigma * sigma)));
  }
  const s = kernel.reduce((a, b) => a + b, 0);
  return kernel.map((k) => k / s);
}

function gaussianBlur(image: number[][], sigma: number): number[][] {
  const radius = Math.max(1, Math.round(3 * sigma));
  const kernel = gaussianKernel1d(sigma, radius);
  const h = image.length;
  const w = image[0].length;
  const temp: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let total = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(Math.max(x + k, 0), w - 1);
        total += image[y][xx] * kernel[k + radius];
      }
      temp[y][x] = total;
    }
  }
  const result: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let total = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(Math.max(y + k, 0), h - 1);
        total += temp[yy][x] * kernel[k + radius];
      }
      result[y][x] = total;
    }
  }
  return result;
}

function buildDogPyramid(image: number[][], numScales = 5, sigma0 = 1.0): number[][][] {
  const k = Math.SQRT2;
  const blurred = Array.from({ length: numScales }, (_, i) => gaussianBlur(image, sigma0 * Math.pow(k, i)));
  const h = image.length;
  const w = image[0].length;
  const dog: number[][][] = [];
  for (let i = 0; i < numScales - 1; i++) {
    const d: number[][] = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => blurred[i + 1][y][x] - blurred[i][y][x])
    );
    dog.push(d);
  }
  return dog;
}

function findScaleSpaceExtrema(dog: number[][][]): [number, number, number][] {
  const numLayers = dog.length;
  const h = dog[0].length;
  const w = dog[0][0].length;
  const keypoints: [number, number, number][] = [];
  for (let layer = 1; layer < numLayers - 1; layer++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const val = dog[layer][y][x];
        let isMax = true;
        let isMin = true;
        for (let dl = -1; dl <= 1; dl++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dl === 0 && dy === 0 && dx === 0) continue;
              const neighbor = dog[layer + dl][y + dy][x + dx];
              if (neighbor >= val) isMax = false;
              if (neighbor <= val) isMin = false;
            }
          }
        }
        if (isMax || isMin) keypoints.push([layer, y, x]);
      }
    }
  }
  return keypoints;
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <tuple>

std::vector<double> gaussianKernel1d(double sigma, int radius) {
    std::vector<double> kernel(2 * radius + 1);
    double sum = 0.0;
    for (int x = -radius; x <= radius; x++) {
        double v = std::exp(-(x * x) / (2 * sigma * sigma));
        kernel[x + radius] = v;
        sum += v;
    }
    for (auto& v : kernel) v /= sum;
    return kernel;
}

std::vector<std::vector<double>> gaussianBlur(const std::vector<std::vector<double>>& image, double sigma) {
    int radius = std::max(1, static_cast<int>(std::round(3 * sigma)));
    auto kernel = gaussianKernel1d(sigma, radius);
    int h = static_cast<int>(image.size());
    int w = static_cast<int>(image[0].size());
    std::vector<std::vector<double>> temp(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double total = 0.0;
            for (int k = -radius; k <= radius; k++) {
                int xx = std::min(std::max(x + k, 0), w - 1);
                total += image[y][xx] * kernel[k + radius];
            }
            temp[y][x] = total;
        }
    }
    std::vector<std::vector<double>> result(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double total = 0.0;
            for (int k = -radius; k <= radius; k++) {
                int yy = std::min(std::max(y + k, 0), h - 1);
                total += temp[yy][x] * kernel[k + radius];
            }
            result[y][x] = total;
        }
    }
    return result;
}

std::vector<std::vector<std::vector<double>>> buildDogPyramid(const std::vector<std::vector<double>>& image, int numScales = 5, double sigma0 = 1.0) {
    double k = std::sqrt(2.0);
    std::vector<std::vector<std::vector<double>>> blurred;
    for (int i = 0; i < numScales; i++) blurred.push_back(gaussianBlur(image, sigma0 * std::pow(k, i)));
    int h = static_cast<int>(image.size());
    int w = static_cast<int>(image[0].size());
    std::vector<std::vector<std::vector<double>>> dog;
    for (int i = 0; i < numScales - 1; i++) {
        std::vector<std::vector<double>> d(h, std::vector<double>(w, 0.0));
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                d[y][x] = blurred[i + 1][y][x] - blurred[i][y][x];
        dog.push_back(d);
    }
    return dog;
}

std::vector<std::tuple<int, int, int>> findScaleSpaceExtrema(const std::vector<std::vector<std::vector<double>>>& dog) {
    int numLayers = static_cast<int>(dog.size());
    int h = static_cast<int>(dog[0].size());
    int w = static_cast<int>(dog[0][0].size());
    std::vector<std::tuple<int, int, int>> keypoints;
    for (int layer = 1; layer < numLayers - 1; layer++) {
        for (int y = 1; y < h - 1; y++) {
            for (int x = 1; x < w - 1; x++) {
                double val = dog[layer][y][x];
                bool isMax = true, isMin = true;
                for (int dl = -1; dl <= 1; dl++) {
                    for (int dy = -1; dy <= 1; dy++) {
                        for (int dx = -1; dx <= 1; dx++) {
                            if (dl == 0 && dy == 0 && dx == 0) continue;
                            double neighbor = dog[layer + dl][y + dy][x + dx];
                            if (neighbor >= val) isMax = false;
                            if (neighbor <= val) isMin = false;
                        }
                    }
                }
                if (isMax || isMin) keypoints.emplace_back(layer, y, x);
            }
        }
    }
    return keypoints;
}
```

```rust
fn gaussian_kernel_1d(sigma: f64, radius: i32) -> Vec<f64> {
    let mut kernel: Vec<f64> = (-radius..=radius)
        .map(|x| (-((x * x) as f64) / (2.0 * sigma * sigma)).exp())
        .collect();
    let sum: f64 = kernel.iter().sum();
    for v in kernel.iter_mut() {
        *v /= sum;
    }
    kernel
}

fn gaussian_blur(image: &[Vec<f64>], sigma: f64) -> Vec<Vec<f64>> {
    let radius = (3.0 * sigma).round().max(1.0) as i32;
    let kernel = gaussian_kernel_1d(sigma, radius);
    let h = image.len();
    let w = image[0].len();
    let mut temp = vec![vec![0.0f64; w]; h];
    for y in 0..h {
        for x in 0..w {
            let mut total = 0.0;
            for k in -radius..=radius {
                let xx = (x as i32 + k).clamp(0, w as i32 - 1) as usize;
                total += image[y][xx] * kernel[(k + radius) as usize];
            }
            temp[y][x] = total;
        }
    }
    let mut result = vec![vec![0.0f64; w]; h];
    for y in 0..h {
        for x in 0..w {
            let mut total = 0.0;
            for k in -radius..=radius {
                let yy = (y as i32 + k).clamp(0, h as i32 - 1) as usize;
                total += temp[yy][x] * kernel[(k + radius) as usize];
            }
            result[y][x] = total;
        }
    }
    result
}

fn build_dog_pyramid(image: &[Vec<f64>], num_scales: usize, sigma0: f64) -> Vec<Vec<Vec<f64>>> {
    let k = std::f64::consts::SQRT_2;
    let blurred: Vec<Vec<Vec<f64>>> = (0..num_scales).map(|i| gaussian_blur(image, sigma0 * k.powi(i as i32))).collect();
    let h = image.len();
    let w = image[0].len();
    let mut dog = Vec::new();
    for i in 0..num_scales - 1 {
        let mut d = vec![vec![0.0f64; w]; h];
        for y in 0..h {
            for x in 0..w {
                d[y][x] = blurred[i + 1][y][x] - blurred[i][y][x];
            }
        }
        dog.push(d);
    }
    dog
}

fn find_scale_space_extrema(dog: &[Vec<Vec<f64>>]) -> Vec<(usize, usize, usize)> {
    let num_layers = dog.len();
    let h = dog[0].len();
    let w = dog[0][0].len();
    let mut keypoints = Vec::new();
    for layer in 1..num_layers - 1 {
        for y in 1..h - 1 {
            for x in 1..w - 1 {
                let val = dog[layer][y][x];
                let mut is_max = true;
                let mut is_min = true;
                for dl in -1i32..=1 {
                    for dy in -1i32..=1 {
                        for dx in -1i32..=1 {
                            if dl == 0 && dy == 0 && dx == 0 {
                                continue;
                            }
                            let neighbor = dog[(layer as i32 + dl) as usize][(y as i32 + dy) as usize][(x as i32 + dx) as usize];
                            if neighbor >= val {
                                is_max = false;
                            }
                            if neighbor <= val {
                                is_min = false;
                            }
                        }
                    }
                }
                if is_max || is_min {
                    keypoints.push((layer, y, x));
                }
            }
        }
    }
    keypoints
}
```

```csharp
static double[] GaussianKernel1D(double sigma, int radius)
{
    var kernel = new double[2 * radius + 1];
    for (int x = -radius; x <= radius; x++) kernel[x + radius] = Math.Exp(-(x * x) / (2 * sigma * sigma));
    double s = kernel.Sum();
    for (int i = 0; i < kernel.Length; i++) kernel[i] /= s;
    return kernel;
}

static double[][] GaussianBlur(double[][] image, double sigma)
{
    int radius = Math.Max(1, (int)Math.Round(3 * sigma));
    var kernel = GaussianKernel1D(sigma, radius);
    int h = image.Length, w = image[0].Length;
    var temp = new double[h][];
    for (int y = 0; y < h; y++) temp[y] = new double[w];
    for (int y = 0; y < h; y++)
    {
        for (int x = 0; x < w; x++)
        {
            double total = 0;
            for (int k = -radius; k <= radius; k++)
            {
                int xx = Math.Min(Math.Max(x + k, 0), w - 1);
                total += image[y][xx] * kernel[k + radius];
            }
            temp[y][x] = total;
        }
    }
    var result = new double[h][];
    for (int y = 0; y < h; y++) result[y] = new double[w];
    for (int y = 0; y < h; y++)
    {
        for (int x = 0; x < w; x++)
        {
            double total = 0;
            for (int k = -radius; k <= radius; k++)
            {
                int yy = Math.Min(Math.Max(y + k, 0), h - 1);
                total += temp[yy][x] * kernel[k + radius];
            }
            result[y][x] = total;
        }
    }
    return result;
}

static double[][][] BuildDogPyramid(double[][] image, int numScales = 5, double sigma0 = 1.0)
{
    double k = Math.Sqrt(2.0);
    var blurred = new double[numScales][][];
    for (int i = 0; i < numScales; i++) blurred[i] = GaussianBlur(image, sigma0 * Math.Pow(k, i));
    int h = image.Length, w = image[0].Length;
    var dog = new double[numScales - 1][][];
    for (int i = 0; i < numScales - 1; i++)
    {
        dog[i] = new double[h][];
        for (int y = 0; y < h; y++)
        {
            dog[i][y] = new double[w];
            for (int x = 0; x < w; x++) dog[i][y][x] = blurred[i + 1][y][x] - blurred[i][y][x];
        }
    }
    return dog;
}

static List<(int, int, int)> FindScaleSpaceExtrema(double[][][] dog)
{
    int numLayers = dog.Length;
    int h = dog[0].Length, w = dog[0][0].Length;
    var keypoints = new List<(int, int, int)>();
    for (int layer = 1; layer < numLayers - 1; layer++)
    {
        for (int y = 1; y < h - 1; y++)
        {
            for (int x = 1; x < w - 1; x++)
            {
                double val = dog[layer][y][x];
                bool isMax = true, isMin = true;
                for (int dl = -1; dl <= 1; dl++)
                    for (int dy = -1; dy <= 1; dy++)
                        for (int dx = -1; dx <= 1; dx++)
                        {
                            if (dl == 0 && dy == 0 && dx == 0) continue;
                            double neighbor = dog[layer + dl][y + dy][x + dx];
                            if (neighbor >= val) isMax = false;
                            if (neighbor <= val) isMin = false;
                        }
                if (isMax || isMin) keypoints.Add((layer, y, x));
            }
        }
    }
    return keypoints;
}
```
