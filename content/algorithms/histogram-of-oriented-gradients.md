---
name: HOG特徴量(Histogram of Oriented Gradients)
category: コンピュータビジョン
subcategory: エッジ・特徴検出
complexity: O(WH)(W×Hは画像サイズ)
summary: 画像を小さなセルに分割し、各セルの中で輝度勾配の向きの分布(ヒストグラム)を集計することで、人物の輪郭のような「形状のパターン」を照明変化に頑健な特徴ベクトルとして表現する、歩行者検出で広く実用化された特徴抽出手法。
---

## 概要

[ソーベルフィルタ](/algorithms/sobel-filter)は各画素における輝度勾配(エッジの強さと向き)を計算するが、それだけでは「画像に何が写っているか」を判定する手がかりとしては情報量が細かすぎる。2005年にナヴニート・ダラール(Dalal)とビル・トリッグス(Triggs)が発表したHOG特徴量は、画像を小さなセル(例えば8×8画素)に分割し、各セル内の勾配の「向き」を複数のビンに分類して集計したヒストグラムを特徴量として使う。個々の画素の細かい輝度値ではなく「局所的な形状(輪郭線がどの向きにどれだけ集中しているか)」を捉えるため、照明の明暗が変化しても頑健であり、歩行者検出をはじめとする物体検出タスクで深層学習が主流になる以前の標準的な特徴抽出手法として広く実用化された。

## 仕組み

1. 画像全体に対し、[ソーベルフィルタ](/algorithms/sobel-filter)などで各画素の輝度勾配の大きさと向きを計算する
2. 画像を小さなセル(典型的には8×8画素)の格子に分割する
3. 各セル内の全画素について、勾配の向き(0〜180度、符号なしの向きとして扱うのが一般的)を9個程度のビンに分類し、勾配の大きさを重みとしてそのビンに加算する——これにより各セルは「9次元の勾配方向ヒストグラム」で表現される
4. 隣接する複数のセル(典型的には2×2セル)をまとめた「ブロック」単位で、ヒストグラムの値を正規化する——これは局所的な照明変化(部分的な影など)の影響を打ち消すために重要な処理であり、ブロックを画像上でオーバーラップさせながらスライドさせて全てのブロックについて行う
5. 全ブロックの正規化済みヒストグラムを1列に連結したものが、その画像(またはウィンドウ)全体のHOG特徴ベクトルになる。この特徴ベクトルを[サポートベクターマシン](/algorithms/svm)のような分類器に入力することで、「歩行者が写っているか」等の判定を行う

## 特性・トレードオフ

- **計算量**: 画像全体の勾配計算が`O(WH)`、ヒストグラム集計・正規化もセル数・ブロック数に比例した線形時間で済むため、全体として`O(WH)`——リアルタイム処理が要求される歩行者検出用途にも適用できる軽量さを持つ
- **照明変化への頑健性**: ブロック単位での正規化により、画像全体の明暗が変化しても(勾配の「向き」の相対的な分布は保たれるため)特徴量が大きく変わらない——生の画素値をそのまま使うテンプレートマッチングにはない強みになっている
- **[SIFT](/algorithms/sift)との違い**: [SIFT](/algorithms/sift)が「回転不変性・スケール不変性」を持つ局所特徴点を検出・記述するのに対し、HOGは画像全体(または検出ウィンドウ全体)を格子状に分割した固定的な記述であり、主に「決まった向き・スケールの物体(直立した歩行者など)」を検出する用途に特化している
- **深層学習以前の物体検出の標準手法だったという歴史的な位置づけ**: HOG+SVMによる歩行者検出は2000年代後半から2010年代前半にかけて広く実用化され、自動車の先進運転支援システム(ADAS)などにも搭載された。現在は畳み込みニューラルネットワークベースの物体検出器(YOLO等)にほぼ置き換わっているが、計算資源が限られた組み込み機器や、学習データが少ない場面では今なお実用的な選択肢である
- **使いどころ**: 歩行者検出・車両検出などの物体検出(HOG+SVMの組み合わせ)、顔検出の補助特徴量、テクスチャ分類、深層学習モデルが使えない低計算資源環境での物体検出

## 実装例

```python
import math

def compute_gradients(image: list[list[int]]) -> tuple[list[list[float]], list[list[float]]]:
    h, w = len(image), len(image[0])
    mag = [[0.0] * w for _ in range(h)]
    ang = [[0.0] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            gx_prev = image[y][x - 1] if x - 1 >= 0 else image[y][x]
            gx_next = image[y][x + 1] if x + 1 < w else image[y][x]
            gy_prev = image[y - 1][x] if y - 1 >= 0 else image[y][x]
            gy_next = image[y + 1][x] if y + 1 < h else image[y][x]
            gx = gx_next - gx_prev
            gy = gy_next - gy_prev
            mag[y][x] = math.sqrt(gx * gx + gy * gy)
            ang[y][x] = math.degrees(math.atan2(gy, gx)) % 180.0
    return mag, ang


def cell_histogram(mag, ang, y0: int, x0: int, cell_size: int, num_bins: int = 9) -> list[float]:
    hist = [0.0] * num_bins
    bin_width = 180.0 / num_bins
    for dy in range(cell_size):
        for dx in range(cell_size):
            y, x = y0 + dy, x0 + dx
            b = int(ang[y][x] / bin_width) % num_bins
            hist[b] += mag[y][x]
    return hist


def hog_features(image: list[list[int]], cell_size: int = 4, num_bins: int = 9) -> list[float]:
    mag, ang = compute_gradients(image)
    h, w = len(image), len(image[0])
    cells_y, cells_x = h // cell_size, w // cell_size
    cell_hists = [
        [cell_histogram(mag, ang, cy * cell_size, cx * cell_size, cell_size, num_bins) for cx in range(cells_x)]
        for cy in range(cells_y)
    ]

    # 隣接2x2セルを1ブロックとしてスライドさせながら正規化する
    features: list[float] = []
    eps = 1e-6
    for by in range(cells_y - 1):
        for bx in range(cells_x - 1):
            block = cell_hists[by][bx] + cell_hists[by][bx + 1] + cell_hists[by + 1][bx] + cell_hists[by + 1][bx + 1]
            norm = math.sqrt(sum(v * v for v in block) + eps * eps)
            features.extend(v / norm for v in block)
    return features
```

```typescript
function computeGradients(image: number[][]): { mag: number[][]; ang: number[][] } {
  const h = image.length;
  const w = image[0].length;
  const mag: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  const ang: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gxPrev = x - 1 >= 0 ? image[y][x - 1] : image[y][x];
      const gxNext = x + 1 < w ? image[y][x + 1] : image[y][x];
      const gyPrev = y - 1 >= 0 ? image[y - 1][x] : image[y][x];
      const gyNext = y + 1 < h ? image[y + 1][x] : image[y][x];
      const gx = gxNext - gxPrev;
      const gy = gyNext - gyPrev;
      mag[y][x] = Math.sqrt(gx * gx + gy * gy);
      const angle = (((Math.atan2(gy, gx) * 180) / Math.PI) % 180 + 180) % 180;
      ang[y][x] = angle;
    }
  }
  return { mag, ang };
}

function cellHistogram(
  mag: number[][],
  ang: number[][],
  y0: number,
  x0: number,
  cellSize: number,
  numBins: number
): number[] {
  const hist = new Array(numBins).fill(0);
  const binWidth = 180 / numBins;
  for (let dy = 0; dy < cellSize; dy++) {
    for (let dx = 0; dx < cellSize; dx++) {
      const y = y0 + dy;
      const x = x0 + dx;
      const b = Math.floor(ang[y][x] / binWidth) % numBins;
      hist[b] += mag[y][x];
    }
  }
  return hist;
}

function hogFeatures(image: number[][], cellSize = 4, numBins = 9): number[] {
  const { mag, ang } = computeGradients(image);
  const h = image.length;
  const w = image[0].length;
  const cellsY = Math.floor(h / cellSize);
  const cellsX = Math.floor(w / cellSize);
  const cellHists: number[][][] = [];
  for (let cy = 0; cy < cellsY; cy++) {
    const row: number[][] = [];
    for (let cx = 0; cx < cellsX; cx++) {
      row.push(cellHistogram(mag, ang, cy * cellSize, cx * cellSize, cellSize, numBins));
    }
    cellHists.push(row);
  }

  const features: number[] = [];
  const eps = 1e-6;
  for (let by = 0; by < cellsY - 1; by++) {
    for (let bx = 0; bx < cellsX - 1; bx++) {
      const block = [
        ...cellHists[by][bx],
        ...cellHists[by][bx + 1],
        ...cellHists[by + 1][bx],
        ...cellHists[by + 1][bx + 1],
      ];
      const norm = Math.sqrt(block.reduce((s, v) => s + v * v, 0) + eps * eps);
      features.push(...block.map((v) => v / norm));
    }
  }
  return features;
}
```

```cpp
#include <vector>
#include <cmath>

using Grid = std::vector<std::vector<double>>;
constexpr double PI = 3.14159265358979323846;

std::pair<Grid, Grid> computeGradients(const std::vector<std::vector<int>>& image) {
    int h = static_cast<int>(image.size());
    int w = static_cast<int>(image[0].size());
    Grid mag(h, std::vector<double>(w, 0.0));
    Grid ang(h, std::vector<double>(w, 0.0));
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            int gxPrev = (x - 1 >= 0) ? image[y][x - 1] : image[y][x];
            int gxNext = (x + 1 < w) ? image[y][x + 1] : image[y][x];
            int gyPrev = (y - 1 >= 0) ? image[y - 1][x] : image[y][x];
            int gyNext = (y + 1 < h) ? image[y + 1][x] : image[y][x];
            double gx = gxNext - gxPrev;
            double gy = gyNext - gyPrev;
            mag[y][x] = std::sqrt(gx * gx + gy * gy);
            double angle = std::atan2(gy, gx) * 180.0 / PI;
            ang[y][x] = std::fmod(std::fmod(angle, 180.0) + 180.0, 180.0);
        }
    }
    return {mag, ang};
}

std::vector<double> cellHistogram(const Grid& mag, const Grid& ang, int y0, int x0, int cellSize, int numBins) {
    std::vector<double> hist(numBins, 0.0);
    double binWidth = 180.0 / numBins;
    for (int dy = 0; dy < cellSize; dy++) {
        for (int dx = 0; dx < cellSize; dx++) {
            int y = y0 + dy, x = x0 + dx;
            int b = static_cast<int>(ang[y][x] / binWidth) % numBins;
            hist[b] += mag[y][x];
        }
    }
    return hist;
}

std::vector<double> hogFeatures(const std::vector<std::vector<int>>& image, int cellSize = 4, int numBins = 9) {
    auto grads = computeGradients(image);
    const Grid& mag = grads.first;
    const Grid& ang = grads.second;
    int h = static_cast<int>(image.size());
    int w = static_cast<int>(image[0].size());
    int cellsY = h / cellSize, cellsX = w / cellSize;
    std::vector<std::vector<std::vector<double>>> cellHists(cellsY, std::vector<std::vector<double>>(cellsX));
    for (int cy = 0; cy < cellsY; cy++) {
        for (int cx = 0; cx < cellsX; cx++) {
            cellHists[cy][cx] = cellHistogram(mag, ang, cy * cellSize, cx * cellSize, cellSize, numBins);
        }
    }

    std::vector<double> features;
    double eps = 1e-6;
    for (int by = 0; by < cellsY - 1; by++) {
        for (int bx = 0; bx < cellsX - 1; bx++) {
            std::vector<double> block;
            for (const auto* part : {&cellHists[by][bx], &cellHists[by][bx + 1], &cellHists[by + 1][bx], &cellHists[by + 1][bx + 1]}) {
                block.insert(block.end(), part->begin(), part->end());
            }
            double sumSq = 0.0;
            for (double v : block) sumSq += v * v;
            double norm = std::sqrt(sumSq + eps * eps);
            for (double v : block) features.push_back(v / norm);
        }
    }
    return features;
}
```

```rust
fn compute_gradients(image: &[Vec<i32>]) -> (Vec<Vec<f64>>, Vec<Vec<f64>>) {
    let h = image.len();
    let w = image[0].len();
    let mut mag = vec![vec![0.0; w]; h];
    let mut ang = vec![vec![0.0; w]; h];
    for y in 0..h {
        for x in 0..w {
            let gx_prev = if x >= 1 { image[y][x - 1] } else { image[y][x] };
            let gx_next = if x + 1 < w { image[y][x + 1] } else { image[y][x] };
            let gy_prev = if y >= 1 { image[y - 1][x] } else { image[y][x] };
            let gy_next = if y + 1 < h { image[y + 1][x] } else { image[y][x] };
            let gx = (gx_next - gx_prev) as f64;
            let gy = (gy_next - gy_prev) as f64;
            mag[y][x] = (gx * gx + gy * gy).sqrt();
            let angle = gy.atan2(gx).to_degrees();
            ang[y][x] = ((angle % 180.0) + 180.0) % 180.0;
        }
    }
    (mag, ang)
}

fn cell_histogram(mag: &[Vec<f64>], ang: &[Vec<f64>], y0: usize, x0: usize, cell_size: usize, num_bins: usize) -> Vec<f64> {
    let mut hist = vec![0.0; num_bins];
    let bin_width = 180.0 / num_bins as f64;
    for dy in 0..cell_size {
        for dx in 0..cell_size {
            let y = y0 + dy;
            let x = x0 + dx;
            let b = ((ang[y][x] / bin_width) as usize) % num_bins;
            hist[b] += mag[y][x];
        }
    }
    hist
}

fn hog_features(image: &[Vec<i32>], cell_size: usize, num_bins: usize) -> Vec<f64> {
    let (mag, ang) = compute_gradients(image);
    let h = image.len();
    let w = image[0].len();
    let cells_y = h / cell_size;
    let cells_x = w / cell_size;
    let mut cell_hists = vec![vec![Vec::new(); cells_x]; cells_y];
    for cy in 0..cells_y {
        for cx in 0..cells_x {
            cell_hists[cy][cx] = cell_histogram(&mag, &ang, cy * cell_size, cx * cell_size, cell_size, num_bins);
        }
    }

    let mut features = Vec::new();
    let eps = 1e-6;
    for by in 0..cells_y.saturating_sub(1) {
        for bx in 0..cells_x.saturating_sub(1) {
            let mut block = Vec::new();
            block.extend_from_slice(&cell_hists[by][bx]);
            block.extend_from_slice(&cell_hists[by][bx + 1]);
            block.extend_from_slice(&cell_hists[by + 1][bx]);
            block.extend_from_slice(&cell_hists[by + 1][bx + 1]);
            let norm = (block.iter().map(|v| v * v).sum::<f64>() + eps * eps).sqrt();
            features.extend(block.iter().map(|v| v / norm));
        }
    }
    features
}
```

```csharp
static (double[,] mag, double[,] ang) ComputeGradients(int[,] image)
{
    int h = image.GetLength(0), w = image.GetLength(1);
    var mag = new double[h, w];
    var ang = new double[h, w];
    for (int y = 0; y < h; y++)
    {
        for (int x = 0; x < w; x++)
        {
            int gxPrev = x - 1 >= 0 ? image[y, x - 1] : image[y, x];
            int gxNext = x + 1 < w ? image[y, x + 1] : image[y, x];
            int gyPrev = y - 1 >= 0 ? image[y - 1, x] : image[y, x];
            int gyNext = y + 1 < h ? image[y + 1, x] : image[y, x];
            double gx = gxNext - gxPrev;
            double gy = gyNext - gyPrev;
            mag[y, x] = Math.Sqrt(gx * gx + gy * gy);
            double angle = Math.Atan2(gy, gx) * 180.0 / Math.PI;
            ang[y, x] = ((angle % 180.0) + 180.0) % 180.0;
        }
    }
    return (mag, ang);
}

static double[] CellHistogram(double[,] mag, double[,] ang, int y0, int x0, int cellSize, int numBins)
{
    var hist = new double[numBins];
    double binWidth = 180.0 / numBins;
    for (int dy = 0; dy < cellSize; dy++)
        for (int dx = 0; dx < cellSize; dx++)
        {
            int y = y0 + dy, x = x0 + dx;
            int b = (int)(ang[y, x] / binWidth) % numBins;
            hist[b] += mag[y, x];
        }
    return hist;
}

static double[] HogFeatures(int[,] image, int cellSize = 4, int numBins = 9)
{
    var (mag, ang) = ComputeGradients(image);
    int h = image.GetLength(0), w = image.GetLength(1);
    int cellsY = h / cellSize, cellsX = w / cellSize;
    var cellHists = new double[cellsY, cellsX][];
    for (int cy = 0; cy < cellsY; cy++)
        for (int cx = 0; cx < cellsX; cx++)
            cellHists[cy, cx] = CellHistogram(mag, ang, cy * cellSize, cx * cellSize, cellSize, numBins);

    var features = new List<double>();
    double eps = 1e-6;
    for (int by = 0; by < cellsY - 1; by++)
    {
        for (int bx = 0; bx < cellsX - 1; bx++)
        {
            var block = cellHists[by, bx].Concat(cellHists[by, bx + 1]).Concat(cellHists[by + 1, bx]).Concat(cellHists[by + 1, bx + 1]).ToArray();
            double norm = Math.Sqrt(block.Sum(v => v * v) + eps * eps);
            features.AddRange(block.Select(v => v / norm));
        }
    }
    return features.ToArray();
}
```
