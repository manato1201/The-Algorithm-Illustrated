---
name: Harrisコーナー検出
category: コンピュータビジョン
subcategory: エッジ・特徴検出
complexity: O(w×h)(w×h画像)
summary: あらゆる方向にウィンドウをずらしたときの明るさの変化量から、直線的なエッジとは異なる「角」を数学的に特定する特徴点検出法。
---

## 概要

画像から物体を追跡したりパノラマ合成のために対応点を見つけたりする際、「エッジ(輪郭線)」よりも「コーナー(角)」の方が優れた目印になる——エッジ上の点はエッジに沿ってずれても見た目が変わらないため位置の特定が曖昧になるが、コーナーはどの方向にずれても見た目が変化する、位置を一意に特定しやすい点だからである。1988年にハリスとスティーブンスが提案したこの手法は、「小さなウィンドウを画像上の様々な方向にわずかにずらしたとき、ウィンドウ内の明るさがどれだけ変化するか」を数学的に定式化し、あらゆる方向への移動で大きく変化する点だけをコーナーとして検出する。

## 仕組み

1. 画像の各画素`(x, y)`について、その周囲の小さなウィンドウを方向`(u, v)`にずらしたときの明るさの変化量`E(u, v) = Σ w(x,y) × [I(x+u, y+v) - I(x, y)]²`を考える(`w`はウィンドウ内の重み、`I`は画素の明るさ)
2. この`E(u, v)`をテイラー展開で近似すると、`E(u, v) ≈ [u, v] M [u, v]ᵀ`という2次形式になる。ここで`M`は画素の勾配(`Ix`、`Iy`、[ソーベルフィルタ](/algorithms/sobel-filter)等で計算)から作られる2×2の構造テンソル行列
3. 行列`M`の2つの固有値`λ₁`、`λ₂`(数値計算では[べき乗法](/algorithms/power-iteration)等で近似計算できるが、Harrisの手法では固有値分解を避けて`M`の行列式とトレースから直接コーナー応答スコア`R = det(M) - k × trace(M)²`(`k`は経験的な定数、通常0.04〜0.06)を計算する
4. `R`が大きい(2方向とも明るさの変化が大きい)点はコーナー、片方向だけ大きい点はエッジ、両方とも小さい点は平坦な領域と判定できる
5. `R`の値が閾値を超え、かつ近傍で局所最大値になっている点を最終的なコーナーとして採用する(非最大値抑制)

## 特性・トレードオフ

- **計算量**: 各画素で固定サイズの構造テンソルとスコア`R`を計算するだけなので`O(w×h)`。固有値分解を避けて行列式とトレースだけで判定できる点が、計算コストを抑える工夫になっている
- **回転に対して不変**: 画像が回転しても、コーナーの応答スコア`R`は(近似的に)変わらないため、同じコーナーを異なる角度からでも安定して検出できる
- **スケール変化には弱い**: 画像を拡大・縮小すると、同じウィンドウサイズで見たときのコーナーらしさが変わってしまう。この弱点を克服し、拡大縮小しても同じ特徴点を検出できるようにしたのが[SIFT](/algorithms/sift)のようなスケール不変特徴量である
- **使いどころ**: 画像のパノラマ合成・物体追跡・カメラの姿勢推定(Structure from Motion)における対応点探索の第一段階、[Lucas-Kanade法](/algorithms/lucas-kanade-optical-flow)によるオプティカルフロー追跡の追跡対象点(トラッキングポイント)の選定

## 実装例

[ソーベルフィルタ](/algorithms/sobel-filter)で勾配`Ix`・`Iy`を求め、構造テンソルの行列式とトレースからコーナー応答`R`を計算する。白い正方形を背景に置いた合成画像でテストすると、4つの角のコーナー応答スコアが辺や平坦部より明確に大きくなる。

```python
def sobel_gradients(img: list[list[float]]) -> tuple[list[list[float]], list[list[float]]]:
    h, w = len(img), len(img[0])
    gx_k = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
    gy_k = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
    ix = [[0.0] * w for _ in range(h)]
    iy = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            sx = sy = 0.0
            for ky in range(3):
                for kx in range(3):
                    py = min(max(y + ky - 1, 0), h - 1)
                    px = min(max(x + kx - 1, 0), w - 1)
                    sx += img[py][px] * gx_k[ky][kx]
                    sy += img[py][px] * gy_k[ky][kx]
            ix[y][x] = sx
            iy[y][x] = sy
    return ix, iy


def harris_response(img: list[list[float]], k: float = 0.04, window: int = 1) -> list[list[float]]:
    h, w = len(img), len(img[0])
    ix, iy = sobel_gradients(img)
    ixx = [[ix[y][x] ** 2 for x in range(w)] for y in range(h)]
    iyy = [[iy[y][x] ** 2 for x in range(w)] for y in range(h)]
    ixy = [[ix[y][x] * iy[y][x] for x in range(w)] for y in range(h)]

    response = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            sxx = syy = sxy = 0.0
            for dy in range(-window, window + 1):
                for dx in range(-window, window + 1):
                    py = min(max(y + dy, 0), h - 1)
                    px = min(max(x + dx, 0), w - 1)
                    sxx += ixx[py][px]
                    syy += iyy[py][px]
                    sxy += ixy[py][px]
            det = sxx * syy - sxy * sxy
            trace = sxx + syy
            response[y][x] = det - k * trace * trace
    return response
```

```typescript
function sobelGradients(img: number[][]): [number[][], number[][]] {
  const h = img.length, w = img[0].length;
  const gxK = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const gyK = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  const ix = Array.from({ length: h }, () => new Array(w).fill(0));
  const iy = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx = 0, sy = 0;
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const py = Math.min(Math.max(y + ky - 1, 0), h - 1);
          const px = Math.min(Math.max(x + kx - 1, 0), w - 1);
          sx += img[py][px] * gxK[ky][kx];
          sy += img[py][px] * gyK[ky][kx];
        }
      }
      ix[y][x] = sx;
      iy[y][x] = sy;
    }
  }
  return [ix, iy];
}

function harrisResponse(img: number[][], k = 0.04, window = 1): number[][] {
  const h = img.length, w = img[0].length;
  const [ix, iy] = sobelGradients(img);
  const ixx = ix.map((row, y) => row.map((v) => v * v));
  const iyy = iy.map((row, y) => row.map((v) => v * v));
  const ixy = ix.map((row, y) => row.map((v, x) => v * iy[y][x]));

  const response = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sxx = 0, syy = 0, sxy = 0;
      for (let dy = -window; dy <= window; dy++) {
        for (let dx = -window; dx <= window; dx++) {
          const py = Math.min(Math.max(y + dy, 0), h - 1);
          const px = Math.min(Math.max(x + dx, 0), w - 1);
          sxx += ixx[py][px];
          syy += iyy[py][px];
          sxy += ixy[py][px];
        }
      }
      const det = sxx * syy - sxy * sxy;
      const trace = sxx + syy;
      response[y][x] = det - k * trace * trace;
    }
  }
  return response;
}
```

```cpp
#include <vector>
#include <algorithm>

using Image = std::vector<std::vector<double>>;

std::pair<Image, Image> sobelGradients(const Image& img) {
    int h = static_cast<int>(img.size()), w = static_cast<int>(img[0].size());
    static const int gxK[3][3] = {{-1, 0, 1}, {-2, 0, 2}, {-1, 0, 1}};
    static const int gyK[3][3] = {{-1, -2, -1}, {0, 0, 0}, {1, 2, 1}};
    Image ix(h, std::vector<double>(w, 0.0)), iy(h, std::vector<double>(w, 0.0));

    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double sx = 0, sy = 0;
            for (int ky = 0; ky < 3; ky++) {
                for (int kx = 0; kx < 3; kx++) {
                    int py = std::min(std::max(y + ky - 1, 0), h - 1);
                    int px = std::min(std::max(x + kx - 1, 0), w - 1);
                    sx += img[py][px] * gxK[ky][kx];
                    sy += img[py][px] * gyK[ky][kx];
                }
            }
            ix[y][x] = sx;
            iy[y][x] = sy;
        }
    }
    return {ix, iy};
}

Image harrisResponse(const Image& img, double k = 0.04, int window = 1) {
    int h = static_cast<int>(img.size()), w = static_cast<int>(img[0].size());
    auto [ix, iy] = sobelGradients(img);
    Image ixx(h, std::vector<double>(w)), iyy(h, std::vector<double>(w)), ixy(h, std::vector<double>(w));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            ixx[y][x] = ix[y][x] * ix[y][x];
            iyy[y][x] = iy[y][x] * iy[y][x];
            ixy[y][x] = ix[y][x] * iy[y][x];
        }
    }

    Image response(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double sxx = 0, syy = 0, sxy = 0;
            for (int dy = -window; dy <= window; dy++) {
                for (int dx = -window; dx <= window; dx++) {
                    int py = std::min(std::max(y + dy, 0), h - 1);
                    int px = std::min(std::max(x + dx, 0), w - 1);
                    sxx += ixx[py][px];
                    syy += iyy[py][px];
                    sxy += ixy[py][px];
                }
            }
            double det = sxx * syy - sxy * sxy;
            double trace = sxx + syy;
            response[y][x] = det - k * trace * trace;
        }
    }
    return response;
}
```

```rust
type Image = Vec<Vec<f64>>;

fn sobel_gradients(img: &Image) -> (Image, Image) {
    let h = img.len();
    let w = img[0].len();
    let gx_k = [[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]];
    let gy_k = [[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]];
    let mut ix = vec![vec![0.0; w]; h];
    let mut iy = vec![vec![0.0; w]; h];

    for y in 0..h {
        for x in 0..w {
            let mut sx = 0.0;
            let mut sy = 0.0;
            for ky in 0..3i32 {
                for kx in 0..3i32 {
                    let py = (y as i32 + ky - 1).clamp(0, h as i32 - 1) as usize;
                    let px = (x as i32 + kx - 1).clamp(0, w as i32 - 1) as usize;
                    sx += img[py][px] * gx_k[ky as usize][kx as usize];
                    sy += img[py][px] * gy_k[ky as usize][kx as usize];
                }
            }
            ix[y][x] = sx;
            iy[y][x] = sy;
        }
    }
    (ix, iy)
}

fn harris_response(img: &Image, k: f64, window: i32) -> Image {
    let h = img.len();
    let w = img[0].len();
    let (ix, iy) = sobel_gradients(img);
    let mut ixx = vec![vec![0.0; w]; h];
    let mut iyy = vec![vec![0.0; w]; h];
    let mut ixy = vec![vec![0.0; w]; h];
    for y in 0..h {
        for x in 0..w {
            ixx[y][x] = ix[y][x] * ix[y][x];
            iyy[y][x] = iy[y][x] * iy[y][x];
            ixy[y][x] = ix[y][x] * iy[y][x];
        }
    }

    let mut response = vec![vec![0.0; w]; h];
    for y in 0..h {
        for x in 0..w {
            let mut sxx = 0.0;
            let mut syy = 0.0;
            let mut sxy = 0.0;
            for dy in -window..=window {
                for dx in -window..=window {
                    let py = (y as i32 + dy).clamp(0, h as i32 - 1) as usize;
                    let px = (x as i32 + dx).clamp(0, w as i32 - 1) as usize;
                    sxx += ixx[py][px];
                    syy += iyy[py][px];
                    sxy += ixy[py][px];
                }
            }
            let det = sxx * syy - sxy * sxy;
            let trace = sxx + syy;
            response[y][x] = det - k * trace * trace;
        }
    }
    response
}
```

```csharp
static (double[][] ix, double[][] iy) SobelGradients(double[][] img)
{
    int h = img.Length, w = img[0].Length;
    int[][] gxK = { new[] {-1,0,1}, new[] {-2,0,2}, new[] {-1,0,1} };
    int[][] gyK = { new[] {-1,-2,-1}, new[] {0,0,0}, new[] {1,2,1} };
    var ix = new double[h][];
    var iy = new double[h][];
    for (int y = 0; y < h; y++)
    {
        ix[y] = new double[w];
        iy[y] = new double[w];
        for (int x = 0; x < w; x++)
        {
            double sx = 0, sy = 0;
            for (int ky = 0; ky < 3; ky++)
                for (int kx = 0; kx < 3; kx++)
                {
                    int py = Math.Min(Math.Max(y + ky - 1, 0), h - 1);
                    int px = Math.Min(Math.Max(x + kx - 1, 0), w - 1);
                    sx += img[py][px] * gxK[ky][kx];
                    sy += img[py][px] * gyK[ky][kx];
                }
            ix[y][x] = sx;
            iy[y][x] = sy;
        }
    }
    return (ix, iy);
}

static double[][] HarrisResponse(double[][] img, double k = 0.04, int window = 1)
{
    int h = img.Length, w = img[0].Length;
    var (ix, iy) = SobelGradients(img);
    var ixx = new double[h][]; var iyy = new double[h][]; var ixy = new double[h][];
    for (int y = 0; y < h; y++)
    {
        ixx[y] = new double[w]; iyy[y] = new double[w]; ixy[y] = new double[w];
        for (int x = 0; x < w; x++)
        {
            ixx[y][x] = ix[y][x] * ix[y][x];
            iyy[y][x] = iy[y][x] * iy[y][x];
            ixy[y][x] = ix[y][x] * iy[y][x];
        }
    }

    var response = new double[h][];
    for (int y = 0; y < h; y++)
    {
        response[y] = new double[w];
        for (int x = 0; x < w; x++)
        {
            double sxx = 0, syy = 0, sxy = 0;
            for (int dy = -window; dy <= window; dy++)
                for (int dx = -window; dx <= window; dx++)
                {
                    int py = Math.Min(Math.Max(y + dy, 0), h - 1);
                    int px = Math.Min(Math.Max(x + dx, 0), w - 1);
                    sxx += ixx[py][px]; syy += iyy[py][px]; sxy += ixy[py][px];
                }
            double det = sxx * syy - sxy * sxy;
            double trace = sxx + syy;
            response[y][x] = det - k * trace * trace;
        }
    }
    return response;
}
```
