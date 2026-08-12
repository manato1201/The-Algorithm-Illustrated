---
name: ベジェ曲線による軌道生成
category: 制御・ロボティクス
subcategory: 姿勢・軌道生成
complexity: O(n)(1点の評価、nは制御点数)
summary: 少数の制御点をde Casteljauのアルゴリズムで再帰的に線形補間することで、制御点を動かすだけで直感的に形を編集できる滑らかな曲線を生成し、ロボットの経路やCGのアニメーションパスとして使う。
---

## 概要

[最小加加速度軌道](/algorithms/minimum-jerk-trajectory)は始点・終点の条件から数学的に最適な軌道を導出するが、デザイナーやエンジニアが**曲線の形を直感的に、対話的に編集したい**場面では、少数の「制御点」をドラッグするだけで曲線の形が変わる、より視覚的に扱いやすい表現が便利になる。ベジェ曲線は、1960年代にピエール・ベジェ(自動車メーカーのボディ設計)とポール・ド・カステリョ(独立に類似の理論を発見)によって開発された、**少数の制御点から滑らかな曲線を生成する**表現方法である。制御点を結ぶ折れ線(制御多角形)の形が、生成される曲線の概形を直感的に予測できる形で反映されるため、CADソフトウェア、CGのアニメーションパス、フォントのアウトラインなど、幅広い分野で標準的に使われている。

## 仕組み

1. `n+1`個の制御点`P_0, P_1, ..., P_n`を用意する(3点なら2次ベジェ曲線、4点なら3次ベジェ曲線)
2. **de Casteljauのアルゴリズム**を使い、パラメータ`t`(0から1)における曲線上の点を求める。これは制御点列に対して**線形補間を繰り返し適用する**再帰的な手続きである:
   - 隣接する制御点のペア`(P_i, P_{i+1})`を、パラメータ`t`で線形補間した新しい点`Q_i = (1-t)・P_i + t・P_{i+1}`を全ペアについて計算し、点の数を1つ減らす
   - 得られた新しい点列に対して同じ補間操作を繰り返す
   - 最終的に点が1つだけ残ったとき、それが曲線上のパラメータ`t`における点である
3. `t`を0から1まで変化させながら2を繰り返すことで、曲線全体の形が得られる
4. 3次ベジェ曲線(制御点4つ)の場合、始点`P_0`と終点`P_3`は必ず曲線が通過し、中間の制御点`P_1`, `P_2`は曲線の接線方向と曲率をコントロールする「引力」として働く(曲線自体は通らない)

## 特性・トレードオフ

- **直感的で対話的な形状編集**: 制御点を動かすだけで曲線の形が予測可能な形で変化するため、CADやCGツールでデザイナーが視覚的に軌道・曲線を編集する用途に非常に適している。ロボットの経路計画でも、障害物を避けるように制御点を配置するだけで滑らかな迂回経路を作れる
- **接続時の滑らかさの管理が必要**: 複数のベジェ曲線を繋いで長い経路を作る場合、各区間の境界で接線方向・曲率が一致するように制御点を配置しないと、繋ぎ目でカクついた不自然な軌道になる。この「区分的に繋いだ滑らかな曲線」という考え方は[3次スプライン軌道](/algorithms/cubic-spline-trajectory)とも共通する
- **速度・時間のパラメータ化とは独立**: ベジェ曲線のパラメータ`t`は曲線上の「位置の割合」を表すだけで、実際の移動速度とは直接対応しない(`t`を一定速度で進めても、曲線上の実際の移動速度は場所によって変化する)。ロボット制御で一定速度で軌道をなぞりたい場合は、弧長パラメータ化(弧長に応じて`t`を再マッピングする)などの追加処理が必要になる
- **使いどころ**: CADソフトウェア・グラフィックデザインツールの曲線編集、CGアニメーションのモーションパス、フォントのアウトライン表現、ロボットアームの障害物回避経路の生成、自動運転車の車線変更・レーンチェンジ軌道の生成

## 実装例

de Casteljauのアルゴリズムによる、任意次数のベジェ曲線の評価を示す。

```python
Point = tuple[float, float]

def lerp(a: Point, b: Point, t: float) -> Point:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

def de_casteljau(control_points: list[Point], t: float) -> Point:
    points = list(control_points)
    while len(points) > 1:
        points = [lerp(points[i], points[i + 1], t) for i in range(len(points) - 1)]
    return points[0]

def bezier_curve(control_points: list[Point], n_samples: int = 50) -> list[Point]:
    return [de_casteljau(control_points, i / (n_samples - 1)) for i in range(n_samples)]
```

```typescript
type Point = [number, number];

function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function deCasteljau(controlPoints: Point[], t: number): Point {
  let points = [...controlPoints];
  while (points.length > 1) {
    points = points.slice(0, -1).map((p, i) => lerp(p, points[i + 1], t));
  }
  return points[0];
}

function bezierCurve(controlPoints: Point[], nSamples = 50): Point[] {
  return Array.from({ length: nSamples }, (_, i) =>
    deCasteljau(controlPoints, i / (nSamples - 1)),
  );
}
```

```cpp
#include <vector>
#include <utility>

using Point = std::pair<double, double>;

Point lerp(const Point& a, const Point& b, double t) {
    return {a.first + (b.first - a.first) * t, a.second + (b.second - a.second) * t};
}

Point deCasteljau(std::vector<Point> points, double t) {
    while (points.size() > 1) {
        std::vector<Point> next;
        for (size_t i = 0; i < points.size() - 1; i++) next.push_back(lerp(points[i], points[i + 1], t));
        points = next;
    }
    return points[0];
}

std::vector<Point> bezierCurve(const std::vector<Point>& controlPoints, int nSamples = 50) {
    std::vector<Point> result;
    for (int i = 0; i < nSamples; i++) {
        double t = static_cast<double>(i) / (nSamples - 1);
        result.push_back(deCasteljau(controlPoints, t));
    }
    return result;
}
```

```rust
type Point = (f64, f64);

fn lerp(a: Point, b: Point, t: f64) -> Point {
    (a.0 + (b.0 - a.0) * t, a.1 + (b.1 - a.1) * t)
}

fn de_casteljau(control_points: &[Point], t: f64) -> Point {
    let mut points = control_points.to_vec();
    while points.len() > 1 {
        points = (0..points.len() - 1).map(|i| lerp(points[i], points[i + 1], t)).collect();
    }
    points[0]
}

fn bezier_curve(control_points: &[Point], n_samples: usize) -> Vec<Point> {
    (0..n_samples)
        .map(|i| de_casteljau(control_points, i as f64 / (n_samples - 1) as f64))
        .collect()
}
```

```csharp
static (double x, double y) Lerp((double x, double y) a, (double x, double y) b, double t)
    => (a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

static (double, double) DeCasteljau(List<(double x, double y)> points, double t)
{
    var current = new List<(double, double)>(points);
    while (current.Count > 1)
    {
        var next = new List<(double, double)>();
        for (int i = 0; i < current.Count - 1; i++) next.Add(Lerp(current[i], current[i + 1], t));
        current = next;
    }
    return current[0];
}

static List<(double, double)> BezierCurve(List<(double x, double y)> controlPoints, int nSamples = 50)
{
    var result = new List<(double, double)>();
    for (int i = 0; i < nSamples; i++)
    {
        double t = (double)i / (nSamples - 1);
        result.Add(DeCasteljau(controlPoints, t));
    }
    return result;
}
```
