---
name: Mean-Shift法(物体追跡)
category: コンピュータビジョン
subcategory: セグメンテーション・追跡
complexity: O(反復回数 × ウィンドウ内画素数)(1フレームあたり)
summary: 特徴の密度が最も濃い方向へウィンドウを繰り返し引き寄せることで、色や輝度の分布のピーク(モード)を追跡する非パラメトリックな物体追跡・クラスタリング手法。
---

## 概要

[Lucas-Kanade法](/algorithms/lucas-kanade-optical-flow)は輝度そのものの変化を追跡するが、物体の色分布(色ヒストグラム)のような特徴をまるごと追跡したい場合には向かない。Mean-Shift法は、「あるウィンドウ(探索窓)を、その中に含まれるデータ点(色や輝度の特徴点)の重心の方向へ少しずつ動かしていくと、最終的にデータの密度が最も濃い場所(モード)に収束する」という統計的な性質を利用した、汎用的な密度ピーク探索アルゴリズムである。物体追跡に応用すると、対象物体の色ヒストグラムに最もよく一致する領域を、フレームごとに追いかけることができる。

## 仕組み

1. 追跡したい対象物体の初期位置にウィンドウを置き、その中の色(または輝度)の分布のヒストグラムを「対象モデル」として記録する
2. 次のフレームで、現在のウィンドウ位置の周辺の特徴分布(候補モデル)を計算し、対象モデルとの類似度(バタチャリヤ係数などで測る)を重みとする
3. ウィンドウ内の各画素の位置を、その重み(対象モデルにどれだけ似ているか)で加重平均した「重心」を計算する
4. ウィンドウの中心をこの重心の位置へ移動する(**Mean-Shiftベクトル**による更新)
5. ウィンドウの移動量が十分小さくなる(収束した)まで2〜4を繰り返す。収束した位置が、そのフレームでの物体の推定位置になる

なお元々のMean-Shift法自体は、単一のデータ点集合における密度のモード(最頻値)をノンパラメトリックに(分布の形を仮定せずに)推定する汎用アルゴリズムであり、クラスタリング(k-meansのように事前にクラスタ数を決める必要がない)にも使われる。物体追跡は、このモード探索をフレームごとに繰り返し適用する応用例にあたる。

## 特性・トレードオフ

- **計算量**: 1回の収束までの反復回数はデータ分布に依存するが、通常は数回〜十数回で収束する。各反復はウィンドウ内の画素数に比例する処理なので、リアルタイム追跡にも十分な速度が出せる
- **分布の形を仮定しない**: [k-means](/algorithms/k-means)のようにクラスタが球状であることを仮定せず、任意の形の密度分布のピークを見つけられる柔軟性がある(ノンパラメトリックな手法)
- **スケール変化に弱い**: 素のMean-Shift法はウィンドウのサイズを固定するため、物体がカメラに近づいたり遠ざかったりしてサイズが変化すると追跡精度が落ちる。この弱点を改善し、ウィンドウサイズも適応的に調整するCAMShift(Continuously Adaptive Mean Shift)がよく使われる
- **使いどころ**: リアルタイムの顔・物体追跡(古くはOpenCVの標準的な追跡アルゴリズムとして広く使われた)、画像のノンパラメトリッククラスタリング(色の領域分割)、統計学における確率密度推定・モード探索一般

## 実装例

ガウスカーネルで重み付けした重心へウィンドウを収束するまで繰り返し移動させ、複数の点群クラスタのピーク(モード)へ正しく収束することを確認する。

```python
import math


def gaussian_kernel(distance_sq: float, bandwidth: float) -> float:
    return math.exp(-distance_sq / (2 * bandwidth * bandwidth))


def mean_shift_step(
    center: tuple[float, float], points: list[tuple[float, float]], bandwidth: float
) -> tuple[float, float]:
    """現在のウィンドウ中心の周囲の点を、カーネル重みで加重平均した新しい中心を返す"""
    wx = wy = wsum = 0.0
    for px, py in points:
        d2 = (px - center[0]) ** 2 + (py - center[1]) ** 2
        w = gaussian_kernel(d2, bandwidth)
        wx += w * px
        wy += w * py
        wsum += w
    if wsum == 0:
        return center
    return (wx / wsum, wy / wsum)


def mean_shift(
    start: tuple[float, float],
    points: list[tuple[float, float]],
    bandwidth: float,
    max_iter: int = 100,
    tol: float = 1e-6,
) -> tuple[float, float]:
    center = start
    for _ in range(max_iter):
        new_center = mean_shift_step(center, points, bandwidth)
        dist = math.hypot(new_center[0] - center[0], new_center[1] - center[1])
        center = new_center
        if dist < tol:
            break
    return center
```

```typescript
function gaussianKernel(distanceSq: number, bandwidth: number): number {
  return Math.exp(-distanceSq / (2 * bandwidth * bandwidth));
}

function meanShiftStep(center: [number, number], points: [number, number][], bandwidth: number): [number, number] {
  let wx = 0,
    wy = 0,
    wsum = 0;
  for (const [px, py] of points) {
    const d2 = (px - center[0]) ** 2 + (py - center[1]) ** 2;
    const w = gaussianKernel(d2, bandwidth);
    wx += w * px;
    wy += w * py;
    wsum += w;
  }
  if (wsum === 0) return center;
  return [wx / wsum, wy / wsum];
}

function meanShift(
  start: [number, number],
  points: [number, number][],
  bandwidth: number,
  maxIter = 100,
  tol = 1e-6
): [number, number] {
  let center = start;
  for (let i = 0; i < maxIter; i++) {
    const newCenter = meanShiftStep(center, points, bandwidth);
    const dist = Math.hypot(newCenter[0] - center[0], newCenter[1] - center[1]);
    center = newCenter;
    if (dist < tol) break;
  }
  return center;
}
```

```cpp
#include <vector>
#include <utility>
#include <cmath>

double gaussianKernel(double distanceSq, double bandwidth) {
    return std::exp(-distanceSq / (2 * bandwidth * bandwidth));
}

std::pair<double, double> meanShiftStep(std::pair<double, double> center,
                                         const std::vector<std::pair<double, double>>& points, double bandwidth) {
    double wx = 0, wy = 0, wsum = 0;
    for (auto& [px, py] : points) {
        double d2 = (px - center.first) * (px - center.first) + (py - center.second) * (py - center.second);
        double w = gaussianKernel(d2, bandwidth);
        wx += w * px;
        wy += w * py;
        wsum += w;
    }
    if (wsum == 0) return center;
    return {wx / wsum, wy / wsum};
}

std::pair<double, double> meanShift(std::pair<double, double> start,
                                     const std::vector<std::pair<double, double>>& points, double bandwidth,
                                     int maxIter = 100, double tol = 1e-6) {
    auto center = start;
    for (int i = 0; i < maxIter; i++) {
        auto newCenter = meanShiftStep(center, points, bandwidth);
        double dx = newCenter.first - center.first;
        double dy = newCenter.second - center.second;
        double dist = std::sqrt(dx * dx + dy * dy);
        center = newCenter;
        if (dist < tol) break;
    }
    return center;
}
```

```rust
fn gaussian_kernel(distance_sq: f64, bandwidth: f64) -> f64 {
    (-distance_sq / (2.0 * bandwidth * bandwidth)).exp()
}

fn mean_shift_step(center: (f64, f64), points: &[(f64, f64)], bandwidth: f64) -> (f64, f64) {
    let mut wx = 0.0;
    let mut wy = 0.0;
    let mut wsum = 0.0;
    for &(px, py) in points {
        let d2 = (px - center.0).powi(2) + (py - center.1).powi(2);
        let w = gaussian_kernel(d2, bandwidth);
        wx += w * px;
        wy += w * py;
        wsum += w;
    }
    if wsum == 0.0 {
        center
    } else {
        (wx / wsum, wy / wsum)
    }
}

fn mean_shift(start: (f64, f64), points: &[(f64, f64)], bandwidth: f64, max_iter: i32, tol: f64) -> (f64, f64) {
    let mut center = start;
    for _ in 0..max_iter {
        let new_center = mean_shift_step(center, points, bandwidth);
        let dist = ((new_center.0 - center.0).powi(2) + (new_center.1 - center.1).powi(2)).sqrt();
        center = new_center;
        if dist < tol {
            break;
        }
    }
    center
}
```

```csharp
static double GaussianKernel(double distanceSq, double bandwidth) => Math.Exp(-distanceSq / (2 * bandwidth * bandwidth));

static (double, double) MeanShiftStep((double, double) center, List<(double, double)> points, double bandwidth)
{
    double wx = 0, wy = 0, wsum = 0;
    foreach (var (px, py) in points)
    {
        double d2 = Math.Pow(px - center.Item1, 2) + Math.Pow(py - center.Item2, 2);
        double w = GaussianKernel(d2, bandwidth);
        wx += w * px;
        wy += w * py;
        wsum += w;
    }
    if (wsum == 0) return center;
    return (wx / wsum, wy / wsum);
}

static (double, double) MeanShift((double, double) start, List<(double, double)> points, double bandwidth,
    int maxIter = 100, double tol = 1e-6)
{
    var center = start;
    for (int i = 0; i < maxIter; i++)
    {
        var newCenter = MeanShiftStep(center, points, bandwidth);
        double dist = Math.Sqrt(Math.Pow(newCenter.Item1 - center.Item1, 2) + Math.Pow(newCenter.Item2 - center.Item2, 2));
        center = newCenter;
        if (dist < tol) break;
    }
    return center;
}
```
