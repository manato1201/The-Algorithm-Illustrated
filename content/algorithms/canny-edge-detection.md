---
name: Cannyエッジ検出
category: コンピュータビジョン
subcategory: エッジ・特徴検出
complexity: O(w×h)(w×h画像)
summary: 平滑化・勾配計算・非最大値抑制・ヒステリシス閾値処理の4段階を経て、細く連続した輪郭線を検出する高精度なエッジ検出手法。
---

## 概要

[ソーベルフィルタ](/algorithms/sobel-filter)のような単純な勾配ベースの手法は、ノイズに弱く、検出されるエッジも太くぼやけがちである。1986年にジョン・キャニーが提案したCannyエッジ検出は、「良いエッジ検出とは何か」を数学的に定式化した上で、複数の処理段階を組み合わせることで、ノイズを抑えつつ細く途切れない輪郭線を得る、今なお画像処理の教科書に必ず登場する定番手法である。

## 仕組み

1. **ノイズ除去**: ガウシアンフィルタで画像全体を平滑化し、微分計算がノイズに過敏に反応するのを防ぐ
2. **勾配計算**: [ソーベルフィルタ](/algorithms/sobel-filter)などで各画素の勾配の大きさと方向を計算する
3. **非最大値抑制**: 各画素について、勾配の方向に沿った前後の画素と比較し、自分が局所的な最大値でなければその画素の値を0にする。これにより、太かったエッジが1画素幅の細い線に絞り込まれる
4. **ヒステリシス閾値処理**: 高い閾値`Thigh`と低い閾値`Tlow`の2つを用意する。勾配の強さが`Thigh`を超える画素は確実にエッジとして採用する。`Tlow`と`Thigh`の間の画素は、確実なエッジ画素と連結している(隣接している)場合にのみエッジとして採用し、孤立している場合は棄却する——これにより、弱いが連続したエッジは保持しつつ、孤立したノイズは除去できる

## 特性・トレードオフ

- **計算量**: 各段階が画像サイズに比例する処理なので、全体でも`O(w×h)`。[ソーベルフィルタ](/algorithms/sobel-filter)単体より処理段階は多いが、依然として実用上高速
- **2つの閾値の調整が必要**: `Thigh`・`Tlow`の設定次第で検出されるエッジの量・質が大きく変わる。閾値が低すぎるとノイズを拾い、高すぎると重要な輪郭を見逃す——画像の内容やノイズレベルに応じた調整が実用上の課題になる
- **ヒステリシスの効果**: 単一閾値の手法(強いエッジだけを採用、あるいは弱いエッジも全て採用)と比べ、「強いエッジに繋がっている弱いエッジは残す」という連結性の考慮によって、途切れの少ない自然な輪郭線が得られる
- **使いどころ**: 物体検出・画像セグメンテーションの前処理、医療画像診断における病変の輪郭抽出、OCR(文字認識)の文字領域抽出、自動運転の車線・障害物検出の基礎処理として広く使われる、画像処理の実務におけるデファクトスタンダードのひとつ

## 実装例

グレースケール画像を表す2次元配列に対して、ガウシアン平滑化→[ソーベルフィルタ](/algorithms/sobel-filter)による勾配計算→非最大値抑制→ヒステリシス閾値処理の4段階を適用する。

```python
import math

def gaussian_blur(img: list[list[int]]) -> list[list[float]]:
    kernel = [[1, 2, 1], [2, 4, 2], [1, 2, 1]]
    ksum = 16
    h, w = len(img), len(img[0])
    out = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            total = 0.0
            for ky in range(-1, 2):
                for kx in range(-1, 2):
                    yy = min(max(y + ky, 0), h - 1)
                    xx = min(max(x + kx, 0), w - 1)
                    total += img[yy][xx] * kernel[ky + 1][kx + 1]
            out[y][x] = total / ksum
    return out

def sobel_gradients(img: list[list[float]]):
    gx_kernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
    gy_kernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
    h, w = len(img), len(img[0])
    mag = [[0.0] * w for _ in range(h)]
    ang = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            gx = gy = 0.0
            for ky in range(-1, 2):
                for kx in range(-1, 2):
                    yy = min(max(y + ky, 0), h - 1)
                    xx = min(max(x + kx, 0), w - 1)
                    gx += img[yy][xx] * gx_kernel[ky + 1][kx + 1]
                    gy += img[yy][xx] * gy_kernel[ky + 1][kx + 1]
            mag[y][x] = math.hypot(gx, gy)
            ang[y][x] = math.degrees(math.atan2(gy, gx)) % 180
    return mag, ang

def non_max_suppression(mag, ang):
    h, w = len(mag), len(mag[0])
    out = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            angle, m = ang[y][x], mag[y][x]
            if angle < 22.5 or angle >= 157.5:
                n1 = mag[y][x - 1] if x > 0 else 0.0
                n2 = mag[y][x + 1] if x < w - 1 else 0.0
            elif angle < 67.5:
                n1 = mag[y - 1][x + 1] if y > 0 and x < w - 1 else 0.0
                n2 = mag[y + 1][x - 1] if y < h - 1 and x > 0 else 0.0
            elif angle < 112.5:
                n1 = mag[y - 1][x] if y > 0 else 0.0
                n2 = mag[y + 1][x] if y < h - 1 else 0.0
            else:
                n1 = mag[y - 1][x - 1] if y > 0 and x > 0 else 0.0
                n2 = mag[y + 1][x + 1] if y < h - 1 and x < w - 1 else 0.0
            out[y][x] = m if m >= n1 and m >= n2 else 0.0
    return out

def hysteresis_threshold(img, low: float, high: float) -> list[list[int]]:
    h, w = len(img), len(img[0])
    weak = [[low <= img[y][x] < high for x in range(w)] for y in range(h)]
    result = [[1 if img[y][x] >= high else 0 for x in range(w)] for y in range(h)]
    changed = True
    while changed:
        changed = False
        for y in range(h):
            for x in range(w):
                if weak[y][x] and not result[y][x]:
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = y + dy, x + dx
                            if 0 <= yy < h and 0 <= xx < w and result[yy][xx]:
                                result[y][x] = 1
                                changed = True
                                break
                        if result[y][x]:
                            break
    return result

def canny_edge_detection(img: list[list[int]], low: float = 50, high: float = 100) -> list[list[int]]:
    blurred = gaussian_blur(img)
    mag, ang = sobel_gradients(blurred)
    suppressed = non_max_suppression(mag, ang)
    return hysteresis_threshold(suppressed, low, high)
```

```typescript
function gaussianBlur(img: number[][]): number[][] {
  const kernel = [[1, 2, 1], [2, 4, 2], [1, 2, 1]];
  const ksum = 16;
  const h = img.length, w = img[0].length;
  const out: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let total = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const yy = Math.min(Math.max(y + ky, 0), h - 1);
          const xx = Math.min(Math.max(x + kx, 0), w - 1);
          total += img[yy][xx] * kernel[ky + 1][kx + 1];
        }
      }
      out[y][x] = total / ksum;
    }
  }
  return out;
}

function sobelGradients(img: number[][]): { mag: number[][]; ang: number[][] } {
  const gxKernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const gyKernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  const h = img.length, w = img[0].length;
  const mag: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  const ang: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const yy = Math.min(Math.max(y + ky, 0), h - 1);
          const xx = Math.min(Math.max(x + kx, 0), w - 1);
          gx += img[yy][xx] * gxKernel[ky + 1][kx + 1];
          gy += img[yy][xx] * gyKernel[ky + 1][kx + 1];
        }
      }
      mag[y][x] = Math.hypot(gx, gy);
      let deg = (Math.atan2(gy, gx) * 180) / Math.PI;
      ang[y][x] = ((deg % 180) + 180) % 180;
    }
  }
  return { mag, ang };
}

function nonMaxSuppression(mag: number[][], ang: number[][]): number[][] {
  const h = mag.length, w = mag[0].length;
  const out: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const angle = ang[y][x], m = mag[y][x];
      let n1 = 0, n2 = 0;
      if (angle < 22.5 || angle >= 157.5) {
        n1 = x > 0 ? mag[y][x - 1] : 0;
        n2 = x < w - 1 ? mag[y][x + 1] : 0;
      } else if (angle < 67.5) {
        n1 = y > 0 && x < w - 1 ? mag[y - 1][x + 1] : 0;
        n2 = y < h - 1 && x > 0 ? mag[y + 1][x - 1] : 0;
      } else if (angle < 112.5) {
        n1 = y > 0 ? mag[y - 1][x] : 0;
        n2 = y < h - 1 ? mag[y + 1][x] : 0;
      } else {
        n1 = y > 0 && x > 0 ? mag[y - 1][x - 1] : 0;
        n2 = y < h - 1 && x < w - 1 ? mag[y + 1][x + 1] : 0;
      }
      out[y][x] = m >= n1 && m >= n2 ? m : 0;
    }
  }
  return out;
}

function hysteresisThreshold(img: number[][], low: number, high: number): number[][] {
  const h = img.length, w = img[0].length;
  const weak = img.map((row) => row.map((v) => v >= low && v < high));
  const result: number[][] = img.map((row) => row.map((v) => (v >= high ? 1 : 0)));
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (weak[y][x] && !result[y][x]) {
          let found = false;
          for (let dy = -1; dy <= 1 && !found; dy++) {
            for (let dx = -1; dx <= 1 && !found; dx++) {
              const yy = y + dy, xx = x + dx;
              if (yy >= 0 && yy < h && xx >= 0 && xx < w && result[yy][xx]) found = true;
            }
          }
          if (found) {
            result[y][x] = 1;
            changed = true;
          }
        }
      }
    }
  }
  return result;
}

function cannyEdgeDetection(img: number[][], low = 50, high = 100): number[][] {
  const blurred = gaussianBlur(img);
  const { mag, ang } = sobelGradients(blurred);
  const suppressed = nonMaxSuppression(mag, ang);
  return hysteresisThreshold(suppressed, low, high);
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>

using Grid = std::vector<std::vector<double>>;
using IntGrid = std::vector<std::vector<int>>;
constexpr double kPi = 3.14159265358979323846;

Grid gaussianBlur(const IntGrid& img) {
    int kernel[3][3] = {{1, 2, 1}, {2, 4, 2}, {1, 2, 1}};
    int ksum = 16;
    int h = static_cast<int>(img.size()), w = static_cast<int>(img[0].size());
    Grid out(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double total = 0.0;
            for (int ky = -1; ky <= 1; ky++) {
                for (int kx = -1; kx <= 1; kx++) {
                    int yy = std::min(std::max(y + ky, 0), h - 1);
                    int xx = std::min(std::max(x + kx, 0), w - 1);
                    total += img[yy][xx] * kernel[ky + 1][kx + 1];
                }
            }
            out[y][x] = total / ksum;
        }
    }
    return out;
}

void sobelGradients(const Grid& img, Grid& mag, Grid& ang) {
    int gxKernel[3][3] = {{-1, 0, 1}, {-2, 0, 2}, {-1, 0, 1}};
    int gyKernel[3][3] = {{-1, -2, -1}, {0, 0, 0}, {1, 2, 1}};
    int h = static_cast<int>(img.size()), w = static_cast<int>(img[0].size());
    mag.assign(h, std::vector<double>(w, 0.0));
    ang.assign(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double gx = 0.0, gy = 0.0;
            for (int ky = -1; ky <= 1; ky++) {
                for (int kx = -1; kx <= 1; kx++) {
                    int yy = std::min(std::max(y + ky, 0), h - 1);
                    int xx = std::min(std::max(x + kx, 0), w - 1);
                    gx += img[yy][xx] * gxKernel[ky + 1][kx + 1];
                    gy += img[yy][xx] * gyKernel[ky + 1][kx + 1];
                }
            }
            mag[y][x] = std::sqrt(gx * gx + gy * gy);
            double deg = std::atan2(gy, gx) * 180.0 / kPi;
            ang[y][x] = std::fmod(std::fmod(deg, 180.0) + 180.0, 180.0);
        }
    }
}

Grid nonMaxSuppression(const Grid& mag, const Grid& ang) {
    int h = static_cast<int>(mag.size()), w = static_cast<int>(mag[0].size());
    Grid out(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            double angle = ang[y][x], m = mag[y][x];
            double n1 = 0.0, n2 = 0.0;
            if (angle < 22.5 || angle >= 157.5) {
                n1 = x > 0 ? mag[y][x - 1] : 0.0;
                n2 = x < w - 1 ? mag[y][x + 1] : 0.0;
            } else if (angle < 67.5) {
                n1 = (y > 0 && x < w - 1) ? mag[y - 1][x + 1] : 0.0;
                n2 = (y < h - 1 && x > 0) ? mag[y + 1][x - 1] : 0.0;
            } else if (angle < 112.5) {
                n1 = y > 0 ? mag[y - 1][x] : 0.0;
                n2 = y < h - 1 ? mag[y + 1][x] : 0.0;
            } else {
                n1 = (y > 0 && x > 0) ? mag[y - 1][x - 1] : 0.0;
                n2 = (y < h - 1 && x < w - 1) ? mag[y + 1][x + 1] : 0.0;
            }
            out[y][x] = (m >= n1 && m >= n2) ? m : 0.0;
        }
    }
    return out;
}

IntGrid hysteresisThreshold(const Grid& img, double low, double high) {
    int h = static_cast<int>(img.size()), w = static_cast<int>(img[0].size());
    std::vector<std::vector<bool>> weak(h, std::vector<bool>(w, false));
    IntGrid result(h, std::vector<int>(w, 0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            weak[y][x] = img[y][x] >= low && img[y][x] < high;
            result[y][x] = img[y][x] >= high ? 1 : 0;
        }
    }
    bool changed = true;
    while (changed) {
        changed = false;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (weak[y][x] && result[y][x] == 0) {
                    bool found = false;
                    for (int dy = -1; dy <= 1 && !found; dy++) {
                        for (int dx = -1; dx <= 1 && !found; dx++) {
                            int yy = y + dy, xx = x + dx;
                            if (yy >= 0 && yy < h && xx >= 0 && xx < w && result[yy][xx] == 1) found = true;
                        }
                    }
                    if (found) {
                        result[y][x] = 1;
                        changed = true;
                    }
                }
            }
        }
    }
    return result;
}

IntGrid cannyEdgeDetection(const IntGrid& img, double low = 50.0, double high = 100.0) {
    Grid blurred = gaussianBlur(img);
    Grid mag, ang;
    sobelGradients(blurred, mag, ang);
    Grid suppressed = nonMaxSuppression(mag, ang);
    return hysteresisThreshold(suppressed, low, high);
}
```

```rust
type Grid = Vec<Vec<f64>>;
type IntGrid = Vec<Vec<i32>>;

fn gaussian_blur(img: &IntGrid) -> Grid {
    let kernel = [[1.0, 2.0, 1.0], [2.0, 4.0, 2.0], [1.0, 2.0, 1.0]];
    let ksum = 16.0;
    let h = img.len();
    let w = img[0].len();
    let mut out = vec![vec![0.0; w]; h];
    for y in 0..h {
        for x in 0..w {
            let mut total = 0.0;
            for ky in -1i32..=1 {
                for kx in -1i32..=1 {
                    let yy = (y as i32 + ky).clamp(0, h as i32 - 1) as usize;
                    let xx = (x as i32 + kx).clamp(0, w as i32 - 1) as usize;
                    total += img[yy][xx] as f64 * kernel[(ky + 1) as usize][(kx + 1) as usize];
                }
            }
            out[y][x] = total / ksum;
        }
    }
    out
}

fn sobel_gradients(img: &Grid) -> (Grid, Grid) {
    let gx_kernel = [[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]];
    let gy_kernel = [[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]];
    let h = img.len();
    let w = img[0].len();
    let mut mag = vec![vec![0.0; w]; h];
    let mut ang = vec![vec![0.0; w]; h];
    for y in 0..h {
        for x in 0..w {
            let mut gx = 0.0;
            let mut gy = 0.0;
            for ky in -1i32..=1 {
                for kx in -1i32..=1 {
                    let yy = (y as i32 + ky).clamp(0, h as i32 - 1) as usize;
                    let xx = (x as i32 + kx).clamp(0, w as i32 - 1) as usize;
                    gx += img[yy][xx] * gx_kernel[(ky + 1) as usize][(kx + 1) as usize];
                    gy += img[yy][xx] * gy_kernel[(ky + 1) as usize][(kx + 1) as usize];
                }
            }
            mag[y][x] = (gx * gx + gy * gy).sqrt();
            let deg = gy.atan2(gx).to_degrees();
            ang[y][x] = ((deg % 180.0) + 180.0) % 180.0;
        }
    }
    (mag, ang)
}

fn non_max_suppression(mag: &Grid, ang: &Grid) -> Grid {
    let h = mag.len();
    let w = mag[0].len();
    let mut out = vec![vec![0.0; w]; h];
    for y in 0..h {
        for x in 0..w {
            let angle = ang[y][x];
            let m = mag[y][x];
            let (n1, n2): (f64, f64);
            if angle < 22.5 || angle >= 157.5 {
                n1 = if x > 0 { mag[y][x - 1] } else { 0.0 };
                n2 = if x < w - 1 { mag[y][x + 1] } else { 0.0 };
            } else if angle < 67.5 {
                n1 = if y > 0 && x < w - 1 { mag[y - 1][x + 1] } else { 0.0 };
                n2 = if y < h - 1 && x > 0 { mag[y + 1][x - 1] } else { 0.0 };
            } else if angle < 112.5 {
                n1 = if y > 0 { mag[y - 1][x] } else { 0.0 };
                n2 = if y < h - 1 { mag[y + 1][x] } else { 0.0 };
            } else {
                n1 = if y > 0 && x > 0 { mag[y - 1][x - 1] } else { 0.0 };
                n2 = if y < h - 1 && x < w - 1 { mag[y + 1][x + 1] } else { 0.0 };
            }
            out[y][x] = if m >= n1 && m >= n2 { m } else { 0.0 };
        }
    }
    out
}

fn hysteresis_threshold(img: &Grid, low: f64, high: f64) -> IntGrid {
    let h = img.len();
    let w = img[0].len();
    let mut weak = vec![vec![false; w]; h];
    let mut result = vec![vec![0; w]; h];
    for y in 0..h {
        for x in 0..w {
            weak[y][x] = img[y][x] >= low && img[y][x] < high;
            result[y][x] = if img[y][x] >= high { 1 } else { 0 };
        }
    }
    let mut changed = true;
    while changed {
        changed = false;
        for y in 0..h {
            for x in 0..w {
                if weak[y][x] && result[y][x] == 0 {
                    let mut found = false;
                    for dy in -1i32..=1 {
                        for dx in -1i32..=1 {
                            let yy = y as i32 + dy;
                            let xx = x as i32 + dx;
                            if yy >= 0 && yy < h as i32 && xx >= 0 && xx < w as i32
                                && result[yy as usize][xx as usize] == 1
                            {
                                found = true;
                            }
                        }
                    }
                    if found {
                        result[y][x] = 1;
                        changed = true;
                    }
                }
            }
        }
    }
    result
}

fn canny_edge_detection(img: &IntGrid, low: f64, high: f64) -> IntGrid {
    let blurred = gaussian_blur(img);
    let (mag, ang) = sobel_gradients(&blurred);
    let suppressed = non_max_suppression(&mag, &ang);
    hysteresis_threshold(&suppressed, low, high)
}
```

```csharp
static double[,] GaussianBlur(int[,] img)
{
    int[,] kernel = { { 1, 2, 1 }, { 2, 4, 2 }, { 1, 2, 1 } };
    int ksum = 16;
    int h = img.GetLength(0), w = img.GetLength(1);
    var outp = new double[h, w];
    for (int y = 0; y < h; y++)
    {
        for (int x = 0; x < w; x++)
        {
            double total = 0;
            for (int ky = -1; ky <= 1; ky++)
                for (int kx = -1; kx <= 1; kx++)
                {
                    int yy = Math.Min(Math.Max(y + ky, 0), h - 1);
                    int xx = Math.Min(Math.Max(x + kx, 0), w - 1);
                    total += img[yy, xx] * kernel[ky + 1, kx + 1];
                }
            outp[y, x] = total / ksum;
        }
    }
    return outp;
}

static (double[,] mag, double[,] ang) SobelGradients(double[,] img)
{
    int[,] gxKernel = { { -1, 0, 1 }, { -2, 0, 2 }, { -1, 0, 1 } };
    int[,] gyKernel = { { -1, -2, -1 }, { 0, 0, 0 }, { 1, 2, 1 } };
    int h = img.GetLength(0), w = img.GetLength(1);
    var mag = new double[h, w];
    var ang = new double[h, w];
    for (int y = 0; y < h; y++)
    {
        for (int x = 0; x < w; x++)
        {
            double gx = 0, gy = 0;
            for (int ky = -1; ky <= 1; ky++)
                for (int kx = -1; kx <= 1; kx++)
                {
                    int yy = Math.Min(Math.Max(y + ky, 0), h - 1);
                    int xx = Math.Min(Math.Max(x + kx, 0), w - 1);
                    gx += img[yy, xx] * gxKernel[ky + 1, kx + 1];
                    gy += img[yy, xx] * gyKernel[ky + 1, kx + 1];
                }
            mag[y, x] = Math.Sqrt(gx * gx + gy * gy);
            double deg = Math.Atan2(gy, gx) * 180.0 / Math.PI;
            ang[y, x] = ((deg % 180) + 180) % 180;
        }
    }
    return (mag, ang);
}

static double[,] NonMaxSuppression(double[,] mag, double[,] ang)
{
    int h = mag.GetLength(0), w = mag.GetLength(1);
    var outp = new double[h, w];
    for (int y = 0; y < h; y++)
    {
        for (int x = 0; x < w; x++)
        {
            double angle = ang[y, x], m = mag[y, x];
            double n1, n2;
            if (angle < 22.5 || angle >= 157.5)
            {
                n1 = x > 0 ? mag[y, x - 1] : 0;
                n2 = x < w - 1 ? mag[y, x + 1] : 0;
            }
            else if (angle < 67.5)
            {
                n1 = (y > 0 && x < w - 1) ? mag[y - 1, x + 1] : 0;
                n2 = (y < h - 1 && x > 0) ? mag[y + 1, x - 1] : 0;
            }
            else if (angle < 112.5)
            {
                n1 = y > 0 ? mag[y - 1, x] : 0;
                n2 = y < h - 1 ? mag[y + 1, x] : 0;
            }
            else
            {
                n1 = (y > 0 && x > 0) ? mag[y - 1, x - 1] : 0;
                n2 = (y < h - 1 && x < w - 1) ? mag[y + 1, x + 1] : 0;
            }
            outp[y, x] = (m >= n1 && m >= n2) ? m : 0;
        }
    }
    return outp;
}

static int[,] HysteresisThreshold(double[,] img, double low, double high)
{
    int h = img.GetLength(0), w = img.GetLength(1);
    var weak = new bool[h, w];
    var result = new int[h, w];
    for (int y = 0; y < h; y++)
        for (int x = 0; x < w; x++)
        {
            weak[y, x] = img[y, x] >= low && img[y, x] < high;
            result[y, x] = img[y, x] >= high ? 1 : 0;
        }
    bool changed = true;
    while (changed)
    {
        changed = false;
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                if (weak[y, x] && result[y, x] == 0)
                {
                    bool found = false;
                    for (int dy = -1; dy <= 1 && !found; dy++)
                        for (int dx = -1; dx <= 1 && !found; dx++)
                        {
                            int yy = y + dy, xx = x + dx;
                            if (yy >= 0 && yy < h && xx >= 0 && xx < w && result[yy, xx] == 1) found = true;
                        }
                    if (found)
                    {
                        result[y, x] = 1;
                        changed = true;
                    }
                }
            }
    }
    return result;
}

static int[,] CannyEdgeDetection(int[,] img, double low = 50, double high = 100)
{
    var blurred = GaussianBlur(img);
    var (mag, ang) = SobelGradients(blurred);
    var suppressed = NonMaxSuppression(mag, ang);
    return HysteresisThreshold(suppressed, low, high);
}
```
