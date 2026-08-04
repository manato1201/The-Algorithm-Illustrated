---
name: ハフ変換
category: コンピュータビジョン
subcategory: 画像変換
complexity: O(n × θの分割数)(nはエッジ画素数)
summary: 各エッジ画素が「通りうる直線」全てに投票し、最も得票数の多いパラメータの組を直線として検出する、投票に基づく図形検出アルゴリズム。
---

## 概要

[Cannyエッジ検出](/algorithms/canny-edge-detection)で得られるのは輪郭を構成する画素の集合であって、「これは直線である」「これは円である」といった幾何学的な図形としての認識ではない。1962年に考案されたハフ変換は、この画素の集合から直線や円のような明示的な図形を検出するための、投票(voting)の仕組みに基づく巧妙な手法である。ノイズや部分的な欠損(輪郭線が途中で途切れている)があっても頑健に図形を検出できるのが最大の特徴で、道路の車線検出や図面の解析など幅広い場面で使われている。

## 仕組み

1. 直線は通常`y = mx + b`と表現されるが、垂直線で`m`が無限大になる問題を避けるため、極座標形式`r = x×cos(θ) + y×sin(θ)`(`r`は原点から直線までの距離、`θ`は法線の角度)を使う
2. `(r, θ)`空間(パラメータ空間、ハフ空間)を格子状に区切った「投票箱」(アキュムレータ配列)を用意し、全て0で初期化する
3. エッジ画素`(x, y)`ごとに、`θ`を0〜180度の範囲で少しずつ変えながら対応する`r = x×cos(θ) + y×sin(θ)`を計算し、その`(r, θ)`の投票箱に1票を投じる——1つの画素は「その画素を通りうる全ての直線」に投票することになる
4. 同一直線上にある複数のエッジ画素は、その直線に対応する同じ`(r, θ)`に繰り返し投票するため、その投票箱の得票数が積み上がっていく
5. 得票数が閾値を超える(局所的に多い)`(r, θ)`を選び出せば、それが検出された直線のパラメータになる

円の検出も同様の発想で、パラメータ空間を`(中心x, 中心y, 半径)`の3次元に拡張すれば実現できる(円ハフ変換)。

## 特性・トレードオフ

- **計算量**: エッジ画素数`n`に対して、各画素が`θ`の分割数だけ投票を行うので`O(n × θの分割数)`。円のようにパラメータ数が増えると、アキュムレータ配列の次元も増え、計算量・メモリ消費が急増する(次元の呪い)
- **途切れたエッジに頑健**: 直線の一部が欠けていても、残ったエッジ画素からの投票が同じ`(r, θ)`に十分集まれば直線として検出できる——[Cannyエッジ検出](/algorithms/canny-edge-detection)の出力がノイズや遮蔽で不完全でも実用上機能しやすい
- **投票箱の分解能とのトレードオフ**: `(r, θ)`の分割を細かくすると検出精度は上がるが、近い角度・距離の直線がそれぞれ別々の投票箱に票を分散させてしまい、かえって検出漏れが起きやすくなる。分割を粗くすると逆に精度が落ちる、というバランス調整が必要
- **使いどころ**: 車線検出(自動運転)、文書画像のスキューやレイアウト解析、円形物体(硬貨、ボール、目の虹彩など)の検出、工業製品の外観検査における直線・円形パターンの検出

## 実装例

```python
import math

def hough_lines(
    points: list[tuple[float, float]], width: float, height: float, theta_steps: int = 180
) -> list[tuple[float, float, int]]:
    max_r = math.hypot(width, height)
    r_bins = 200
    r_scale = r_bins / (2 * max_r)
    accumulator = [[0] * theta_steps for _ in range(r_bins)]

    for (x, y) in points:
        for t in range(theta_steps):
            theta = math.pi * t / theta_steps
            r = x * math.cos(theta) + y * math.sin(theta)
            r_idx = int((r + max_r) * r_scale)
            if 0 <= r_idx < r_bins:
                accumulator[r_idx][t] += 1

    threshold = max(max(row) for row in accumulator)

    detected = []
    for r_idx in range(r_bins):
        for t in range(theta_steps):
            if accumulator[r_idx][t] >= threshold:
                r = r_idx / r_scale - max_r
                theta = math.pi * t / theta_steps
                detected.append((r, math.degrees(theta), accumulator[r_idx][t]))
    return detected
```

```typescript
function houghLines(
  points: [number, number][],
  width: number,
  height: number,
  thetaSteps = 180
): [number, number, number][] {
  const maxR = Math.hypot(width, height);
  const rBins = 200;
  const rScale = rBins / (2 * maxR);
  const accumulator: number[][] = Array.from({ length: rBins }, () => new Array(thetaSteps).fill(0));

  for (const [x, y] of points) {
    for (let t = 0; t < thetaSteps; t++) {
      const theta = (Math.PI * t) / thetaSteps;
      const r = x * Math.cos(theta) + y * Math.sin(theta);
      const rIdx = Math.floor((r + maxR) * rScale);
      if (rIdx >= 0 && rIdx < rBins) {
        accumulator[rIdx][t]++;
      }
    }
  }

  let threshold = 0;
  for (const row of accumulator) for (const v of row) threshold = Math.max(threshold, v);

  const detected: [number, number, number][] = [];
  for (let rIdx = 0; rIdx < rBins; rIdx++) {
    for (let t = 0; t < thetaSteps; t++) {
      if (accumulator[rIdx][t] >= threshold) {
        const r = rIdx / rScale - maxR;
        const theta = (Math.PI * t) / thetaSteps;
        detected.push([r, (theta * 180) / Math.PI, accumulator[rIdx][t]]);
      }
    }
  }
  return detected;
}
```

```cpp
#include <vector>
#include <cmath>
#include <algorithm>
#include <tuple>

constexpr double PI = 3.14159265358979323846;

std::vector<std::tuple<double, double, int>> houghLines(
    const std::vector<std::pair<double, double>>& points, double width, double height, int thetaSteps = 180) {
    double maxR = std::hypot(width, height);
    int rBins = 200;
    double rScale = rBins / (2 * maxR);
    std::vector<std::vector<int>> accumulator(rBins, std::vector<int>(thetaSteps, 0));

    for (const auto& [x, y] : points) {
        for (int t = 0; t < thetaSteps; t++) {
            double theta = PI * t / thetaSteps;
            double r = x * std::cos(theta) + y * std::sin(theta);
            int rIdx = static_cast<int>((r + maxR) * rScale);
            if (rIdx >= 0 && rIdx < rBins) {
                accumulator[rIdx][t]++;
            }
        }
    }

    int threshold = 0;
    for (const auto& row : accumulator)
        for (int v : row) threshold = std::max(threshold, v);

    std::vector<std::tuple<double, double, int>> detected;
    for (int rIdx = 0; rIdx < rBins; rIdx++) {
        for (int t = 0; t < thetaSteps; t++) {
            if (accumulator[rIdx][t] >= threshold) {
                double r = rIdx / rScale - maxR;
                double theta = PI * t / thetaSteps;
                detected.emplace_back(r, theta * 180.0 / PI, accumulator[rIdx][t]);
            }
        }
    }
    return detected;
}
```

```rust
fn hough_lines(points: &[(f64, f64)], width: f64, height: f64, theta_steps: usize) -> Vec<(f64, f64, i32)> {
    let max_r = width.hypot(height);
    let r_bins = 200usize;
    let r_scale = r_bins as f64 / (2.0 * max_r);
    let mut accumulator = vec![vec![0i32; theta_steps]; r_bins];

    for &(x, y) in points {
        for t in 0..theta_steps {
            let theta = std::f64::consts::PI * t as f64 / theta_steps as f64;
            let r = x * theta.cos() + y * theta.sin();
            let r_idx = ((r + max_r) * r_scale) as i64;
            if r_idx >= 0 && (r_idx as usize) < r_bins {
                accumulator[r_idx as usize][t] += 1;
            }
        }
    }

    let threshold = accumulator.iter().flatten().copied().max().unwrap_or(0);

    let mut detected = Vec::new();
    for r_idx in 0..r_bins {
        for t in 0..theta_steps {
            if accumulator[r_idx][t] >= threshold {
                let r = r_idx as f64 / r_scale - max_r;
                let theta = std::f64::consts::PI * t as f64 / theta_steps as f64;
                detected.push((r, theta.to_degrees(), accumulator[r_idx][t]));
            }
        }
    }
    detected
}
```

```csharp
static List<(double r, double thetaDeg, int votes)> HoughLines(
    List<(double x, double y)> points, double width, double height, int thetaSteps = 180)
{
    double maxR = Math.Sqrt(width * width + height * height);
    int rBins = 200;
    double rScale = rBins / (2 * maxR);
    var accumulator = new int[rBins, thetaSteps];

    foreach (var (x, y) in points)
    {
        for (int t = 0; t < thetaSteps; t++)
        {
            double theta = Math.PI * t / thetaSteps;
            double r = x * Math.Cos(theta) + y * Math.Sin(theta);
            int rIdx = (int)((r + maxR) * rScale);
            if (rIdx >= 0 && rIdx < rBins) accumulator[rIdx, t]++;
        }
    }

    int threshold = 0;
    for (int i = 0; i < rBins; i++)
        for (int j = 0; j < thetaSteps; j++)
            threshold = Math.Max(threshold, accumulator[i, j]);

    var detected = new List<(double, double, int)>();
    for (int rIdx = 0; rIdx < rBins; rIdx++)
        for (int t = 0; t < thetaSteps; t++)
            if (accumulator[rIdx, t] >= threshold)
            {
                double r = rIdx / rScale - maxR;
                double theta = Math.PI * t / thetaSteps;
                detected.Add((r, theta * 180.0 / Math.PI, accumulator[rIdx, t]));
            }
    return detected;
}
```
