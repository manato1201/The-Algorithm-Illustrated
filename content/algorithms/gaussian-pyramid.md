---
name: ガウシアンピラミッド(画像ピラミッド)
category: コンピュータビジョン
subcategory: 画像変換
complexity: O(WH)(元画像サイズW×H、ピラミッド全層の合計画素数は元画像の約4/3倍)
summary: 画像をぼかしてから半分に縮小する操作を繰り返すことで、同じ画像の複数の解像度版を積み重ねた「ピラミッド」を作る手法で、[SIFT](/algorithms/sift)のスケール不変性や物体検出のマルチスケール探索を支える基礎的な前処理技術。
---

## 概要

画像の中の物体は、撮影距離によって画面上の大きさ(スケール)が変わる——同じ物体でも近くで撮れば大きく、遠くで撮れば小さく写る。多くのコンピュータビジョンのタスクは、この「物体がどのスケールで写っているか分からない」という問題に対処する必要がある。ガウシアンピラミッドは、この問題への直接的な解決策として、元画像にガウシアンフィルタ(ぼかし処理)をかけてから縦横半分に間引く、という操作を繰り返すことで、同じ画像の解像度がどんどん粗くなっていく一連の画像列(層)を作る。各層は元画像を異なる「スケール」で見たものに相当し、[SIFT](/algorithms/sift)のようなスケール不変な特徴点検出や、物体検出における様々なサイズの探索窓を効率的に扱うための基礎的な前処理として使われる。

## 仕組み

1. 元画像を最下層(層0、最も解像度が高い)とする
2. 現在の層にガウシアンフィルタ(周囲の画素の重み付き平均を取る平滑化処理)を適用し、高周波成分(細かいディテール)を除去してぼかす——この「先にぼかしてから縮小する」という順序が重要で、ぼかさずにいきなり間引くとエイリアシング(縮小時のジャギーやモアレのような偽の模様)が発生してしまう
3. ぼかした画像を縦横それぞれ半分の解像度に間引く(1つおきに画素をサンプリングする)。これにより画像の一辺の長さが半分、画素数は4分の1になる
4. 目的の層数に達するか、画像サイズが十分小さくなるまで、手順2〜3を繰り返す
5. こうしてできた層0(元解像度)から層k(最も粗い解像度)までの画像列全体が「ガウシアンピラミッド」であり、ピラミッド状に積み重ねて図示されることからこの名前が付いている

## 特性・トレードオフ

- **計算量**: 各層のサイズは前の層の1/4になるため、全層の画素数の合計は元画像の`1 + 1/4 + 1/16 + ... ≈ 4/3`倍にとどまる——ピラミッド全体を構築するコストは元画像1枚分の処理とほぼ同じオーダー`O(WH)`で済む
- **[SIFT](/algorithms/sift)のスケール不変性を支える基盤技術**: [SIFT](/algorithms/sift)はガウシアンピラミズムの隣接する層同士の差分(差分ガウシアン、DoG)を計算し、その極値点をスケール不変な特徴点として検出する——ガウシアンピラミッドは単体でも使われるが、より高度な特徴点検出アルゴリズムの前段としても中核的な役割を果たしている
- **ラプラシアンピラミッドとの関係**: ガウシアンピラミッドの隣接層の差分を取ったもの(ラプラシアンピラミッド)は、元画像を各スケールの「詳細情報」に分解したものとみなせ、画像の多重解像度合成(パノラマ画像の継ぎ目をなめらかにするブレンディング等)に使われる
- **先にぼかしてから縮小するという順序の重要性**: ぼかさずに単純に間引くと、画像の細かい模様が縮小後に本来存在しないはずの偽の縞模様(モアレ)として現れてしまう——ガウシアンフィルタによる平滑化は、この標本化定理(ナイキスト周波数)の観点から見て理論的に必要な前処理になっている
- **使いどころ**: [SIFT](/algorithms/sift)・SURF等のスケール不変特徴点検出の内部処理、物体検出におけるマルチスケール探索(異なるサイズの物体を同じ検出窓で見つける)、画像のマルチ解像度合成・ブレンディング、動画圧縮における階層的な符号化

## 実装例

5×5のガウシアンカーネル(重み合計256)で画像をぼかしてから縦横半分に間引く処理を繰り返す。境界は最近傍画素をクランプして扱う。

```python
def gaussian_blur(image: list[list[float]]) -> list[list[float]]:
    kernel = [
        [1, 4, 6, 4, 1],
        [4, 16, 24, 16, 4],
        [6, 24, 36, 24, 6],
        [4, 16, 24, 16, 4],
        [1, 4, 6, 4, 1],
    ]
    ksum = 256
    h, w = len(image), len(image[0])
    out = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            acc = 0.0
            for ky in range(5):
                for kx in range(5):
                    sy = min(max(y + ky - 2, 0), h - 1)
                    sx = min(max(x + kx - 2, 0), w - 1)
                    acc += image[sy][sx] * kernel[ky][kx]
            out[y][x] = acc / ksum
    return out


def downsample(image: list[list[float]]) -> list[list[float]]:
    h, w = len(image), len(image[0])
    return [[image[y][x] for x in range(0, w, 2)] for y in range(0, h, 2)]


def gaussian_pyramid(image: list[list[float]], levels: int) -> list[list[list[float]]]:
    pyramid = [image]
    current = image
    for _ in range(levels - 1):
        current = downsample(gaussian_blur(current))
        pyramid.append(current)
    return pyramid
```

```typescript
function gaussianBlur(image: number[][]): number[][] {
  const kernel = [
    [1, 4, 6, 4, 1],
    [4, 16, 24, 16, 4],
    [6, 24, 36, 24, 6],
    [4, 16, 24, 16, 4],
    [1, 4, 6, 4, 1],
  ];
  const ksum = 256;
  const h = image.length, w = image[0].length;
  const out = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let ky = 0; ky < 5; ky++) {
        for (let kx = 0; kx < 5; kx++) {
          const sy = Math.min(Math.max(y + ky - 2, 0), h - 1);
          const sx = Math.min(Math.max(x + kx - 2, 0), w - 1);
          acc += image[sy][sx] * kernel[ky][kx];
        }
      }
      out[y][x] = acc / ksum;
    }
  }
  return out;
}

function downsample(image: number[][]): number[][] {
  const h = image.length, w = image[0].length;
  const out: number[][] = [];
  for (let y = 0; y < h; y += 2) {
    const row: number[] = [];
    for (let x = 0; x < w; x += 2) row.push(image[y][x]);
    out.push(row);
  }
  return out;
}

function gaussianPyramid(image: number[][], levels: number): number[][][] {
  const pyramid = [image];
  let current = image;
  for (let i = 0; i < levels - 1; i++) {
    current = downsample(gaussianBlur(current));
    pyramid.push(current);
  }
  return pyramid;
}
```

```cpp
#include <vector>
#include <algorithm>

using Image = std::vector<std::vector<double>>;

Image gaussianBlur(const Image& image) {
    static const int kernel[5][5] = {
        {1, 4, 6, 4, 1},
        {4, 16, 24, 16, 4},
        {6, 24, 36, 24, 6},
        {4, 16, 24, 16, 4},
        {1, 4, 6, 4, 1},
    };
    const int ksum = 256;
    int h = static_cast<int>(image.size());
    int w = static_cast<int>(image[0].size());
    Image out(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double acc = 0.0;
            for (int ky = 0; ky < 5; ky++) {
                for (int kx = 0; kx < 5; kx++) {
                    int sy = std::min(std::max(y + ky - 2, 0), h - 1);
                    int sx = std::min(std::max(x + kx - 2, 0), w - 1);
                    acc += image[sy][sx] * kernel[ky][kx];
                }
            }
            out[y][x] = acc / ksum;
        }
    }
    return out;
}

Image downsample(const Image& image) {
    int h = static_cast<int>(image.size());
    int w = static_cast<int>(image[0].size());
    Image out;
    for (int y = 0; y < h; y += 2) {
        std::vector<double> row;
        for (int x = 0; x < w; x += 2) row.push_back(image[y][x]);
        out.push_back(row);
    }
    return out;
}

std::vector<Image> gaussianPyramid(const Image& image, int levels) {
    std::vector<Image> pyramid{image};
    Image current = image;
    for (int i = 0; i < levels - 1; i++) {
        current = downsample(gaussianBlur(current));
        pyramid.push_back(current);
    }
    return pyramid;
}
```

```rust
type Image = Vec<Vec<f64>>;

fn gaussian_blur(image: &Image) -> Image {
    let kernel = [
        [1.0, 4.0, 6.0, 4.0, 1.0],
        [4.0, 16.0, 24.0, 16.0, 4.0],
        [6.0, 24.0, 36.0, 24.0, 6.0],
        [4.0, 16.0, 24.0, 16.0, 4.0],
        [1.0, 4.0, 6.0, 4.0, 1.0],
    ];
    let ksum = 256.0;
    let h = image.len();
    let w = image[0].len();
    let mut out = vec![vec![0.0; w]; h];
    for y in 0..h {
        for x in 0..w {
            let mut acc = 0.0;
            for ky in 0..5 {
                for kx in 0..5 {
                    let sy = (y as i32 + ky - 2).clamp(0, h as i32 - 1) as usize;
                    let sx = (x as i32 + kx - 2).clamp(0, w as i32 - 1) as usize;
                    acc += image[sy][sx] * kernel[ky as usize][kx as usize];
                }
            }
            out[y][x] = acc / ksum;
        }
    }
    out
}

fn downsample(image: &Image) -> Image {
    let h = image.len();
    let w = image[0].len();
    let mut out = Vec::new();
    let mut y = 0;
    while y < h {
        let mut row = Vec::new();
        let mut x = 0;
        while x < w {
            row.push(image[y][x]);
            x += 2;
        }
        out.push(row);
        y += 2;
    }
    out
}

fn gaussian_pyramid(image: &Image, levels: usize) -> Vec<Image> {
    let mut pyramid = vec![image.clone()];
    let mut current = image.clone();
    for _ in 0..levels.saturating_sub(1) {
        current = downsample(&gaussian_blur(&current));
        pyramid.push(current.clone());
    }
    pyramid
}
```

```csharp
static double[][] GaussianBlur(double[][] image)
{
    int[][] kernel =
    {
        new[] {1,4,6,4,1},
        new[] {4,16,24,16,4},
        new[] {6,24,36,24,6},
        new[] {4,16,24,16,4},
        new[] {1,4,6,4,1},
    };
    const int ksum = 256;
    int h = image.Length, w = image[0].Length;
    var outImg = new double[h][];
    for (int y = 0; y < h; y++)
    {
        outImg[y] = new double[w];
        for (int x = 0; x < w; x++)
        {
            double acc = 0;
            for (int ky = 0; ky < 5; ky++)
                for (int kx = 0; kx < 5; kx++)
                {
                    int sy = Math.Min(Math.Max(y + ky - 2, 0), h - 1);
                    int sx = Math.Min(Math.Max(x + kx - 2, 0), w - 1);
                    acc += image[sy][sx] * kernel[ky][kx];
                }
            outImg[y][x] = acc / ksum;
        }
    }
    return outImg;
}

static double[][] Downsample(double[][] image)
{
    int h = image.Length, w = image[0].Length;
    var rows = new List<double[]>();
    for (int y = 0; y < h; y += 2)
    {
        var row = new List<double>();
        for (int x = 0; x < w; x += 2) row.Add(image[y][x]);
        rows.Add(row.ToArray());
    }
    return rows.ToArray();
}

static List<double[][]> GaussianPyramid(double[][] image, int levels)
{
    var pyramid = new List<double[][]> { image };
    var current = image;
    for (int i = 0; i < levels - 1; i++)
    {
        current = Downsample(GaussianBlur(current));
        pyramid.Add(current);
    }
    return pyramid;
}
```
