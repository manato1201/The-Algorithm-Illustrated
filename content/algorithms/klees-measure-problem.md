---
name: クリーの尺度問題(矩形の合併面積・走査線法)
category: 計算幾何
subcategory: 分割統治・走査
complexity: O(n log n)
summary: 重なり合う可能性のある多数の矩形の「合併された面積」を、矩形の境界だけをイベントとして左から右へ走査し、区間木で「現在何%の高さがカバーされているか」を管理しながら求める古典的な走査線アルゴリズム。
---

## 概要

平面上に多数の矩形が重なり合って配置されているとき、それらが覆う領域の合計面積(重なっている部分は二重に数えない)を求める問題を、1977年にヴィクター・クリーが提起したことから「クリーの尺度問題」と呼ぶ。素朴に考えると、ピクセル単位で領域を離散化して数える方法は精度と計算量の両方で非効率であり、矩形のペアごとに重なりを計算して包除原理で足し引きする方法は矩形数の増加とともに組み合わせ爆発を起こす。この問題は、**走査線(スイープライン)を左端から右端へ動かしながら、走査線が矩形の境界を通過するたびに「現在の高さ方向のカバー状態」を更新する**という掃引線アルゴリズムの手法で、O(n log n)まで効率化できる。[線分交差検出の走査線法](/algorithms/line-sweep-intersection)や[最近点対問題](/algorithms/closest-pair-of-points)と同じ「掃引しながらイベントを処理する」という計算幾何の基本パターンの応用例である。

## 仕組み

1. 各矩形の**左端**と**右端**のx座標を、それぞれ「区間`[y_low, y_high]`を追加するイベント」「区間を削除するイベント」としてリストアップし、x座標の昇順にソートする(同じx座標なら追加を先に処理する、といった規約を決めておく)
2. y軸方向を、全矩形のy座標の値(座標圧縮した値)を使って**区間木**(または座圧した配列上のセグメント木)で管理する準備をする。この木は「現在アクティブな矩形群によって、y軸のどの区間が何回覆われているか」を管理する
3. x座標の小さい順にイベントを処理していく。**追加イベント**なら区間木上でその`y`範囲のカバー回数を+1し、**削除イベント**ならカバー回数を-1する
4. 各イベント処理の直後、区間木から「現在カバー回数が1回以上のy区間の合計長(カバーされている高さ)」を取得する
5. **直前のイベントから今回のイベントまでのx方向の幅** × **その間ずっと保たれていたカバー高さ**を面積に加算する。全イベントを処理し終えたときの合計が、矩形群の合併面積となる

## 特性・トレードオフ

- **掃引線+区間木という計算幾何の定番の組み合わせ**: 「x軸方向に走査しながら、y軸方向の状態をデータ構造で管理する」という設計は、[線分交差検出](/algorithms/line-sweep-intersection)や多くの矩形演算問題に共通するパターンであり、この問題はその典型例として計算幾何の教科書で頻繁に扱われる
- **カバー回数のオーバーラップを正しく扱う工夫**: 区間木の各ノードに「その区間が何回カバーされているか」のカウンタと「カバーされている実際の長さ」の両方を持たせ、カウンタが0より大きければ区間全体がカバー長になる、というテクニックで、O(log n)の更新・クエリを実現する。この設計は単なる合計値の管理より一段階複雑だが、掃引線アルゴリズムにおける定番の実装パターンである
- **3次元(体積)への拡張**: 同じ考え方は3次元の直方体の合併体積を求める問題にも拡張でき、その場合はx軸方向の走査に加えて、各x区間ごとにy-z平面上での2次元の合併面積問題を解く、という形で次元を1つ落として再帰的に扱う(計算量はO(n² log n)程度に増える)
- **使いどころ**: CADソフトウェアにおける図形の重なり面積計算、画像処理におけるバウンディングボックス群の合併領域の算出、VLSI設計におけるレイアウトの被覆面積検証、広告表示領域やUI要素の重なり検出

## 実装例

```python
def rectangle_union_area(rectangles: list[tuple[float, float, float, float]]) -> float:
    """rectangles: [(x0, y0, x1, y1), ...]"""
    events = []
    y_coords = set()
    for x0, y0, x1, y1 in rectangles:
        events.append((x0, y0, y1, 1))   # 追加
        events.append((x1, y0, y1, -1))  # 削除
        y_coords.add(y0)
        y_coords.add(y1)
    events.sort(key=lambda e: e[0])
    sorted_ys = sorted(y_coords)
    y_index = {y: i for i, y in enumerate(sorted_ys)}

    count = [0] * (len(sorted_ys) - 1)

    def covered_length() -> float:
        total = 0.0
        for i in range(len(count)):
            if count[i] > 0:
                total += sorted_ys[i + 1] - sorted_ys[i]
        return total

    area = 0.0
    prev_x = events[0][0]
    for x, y0, y1, delta in events:
        area += (x - prev_x) * covered_length()
        for i in range(y_index[y0], y_index[y1]):
            count[i] += delta
        prev_x = x
    return area
```

```typescript
function rectangleUnionArea(
  rectangles: [number, number, number, number][],
): number {
  type Event = [number, number, number, number];
  const events: Event[] = [];
  const yCoordsSet = new Set<number>();
  for (const [x0, y0, x1, y1] of rectangles) {
    events.push([x0, y0, y1, 1]);
    events.push([x1, y0, y1, -1]);
    yCoordsSet.add(y0);
    yCoordsSet.add(y1);
  }
  events.sort((a, b) => a[0] - b[0]);
  const sortedYs = [...yCoordsSet].sort((a, b) => a - b);
  const yIndex = new Map(sortedYs.map((y, i) => [y, i]));

  const count = new Array(sortedYs.length - 1).fill(0);
  const coveredLength = () => {
    let total = 0;
    for (let i = 0; i < count.length; i++)
      if (count[i] > 0) total += sortedYs[i + 1] - sortedYs[i];
    return total;
  };

  let area = 0;
  let prevX = events[0][0];
  for (const [x, y0, y1, delta] of events) {
    area += (x - prevX) * coveredLength();
    for (let i = yIndex.get(y0)!; i < yIndex.get(y1)!; i++) count[i] += delta;
    prevX = x;
  }
  return area;
}
```

```cpp
#include <vector>
#include <set>
#include <map>
#include <algorithm>
#include <tuple>

double rectangleUnionArea(const std::vector<std::tuple<double, double, double, double>>& rectangles) {
    std::vector<std::tuple<double, double, double, int>> events;
    std::set<double> yCoordsSet;
    for (auto& [x0, y0, x1, y1] : rectangles) {
        events.push_back({x0, y0, y1, 1});
        events.push_back({x1, y0, y1, -1});
        yCoordsSet.insert(y0);
        yCoordsSet.insert(y1);
    }
    std::sort(events.begin(), events.end());
    std::vector<double> sortedYs(yCoordsSet.begin(), yCoordsSet.end());
    std::map<double, int> yIndex;
    for (size_t i = 0; i < sortedYs.size(); i++) yIndex[sortedYs[i]] = static_cast<int>(i);

    std::vector<int> count(sortedYs.size() - 1, 0);
    auto coveredLength = [&]() {
        double total = 0.0;
        for (size_t i = 0; i < count.size(); i++) if (count[i] > 0) total += sortedYs[i + 1] - sortedYs[i];
        return total;
    };

    double area = 0.0;
    double prevX = std::get<0>(events[0]);
    for (auto& [x, y0, y1, delta] : events) {
        area += (x - prevX) * coveredLength();
        for (int i = yIndex[y0]; i < yIndex[y1]; i++) count[i] += delta;
        prevX = x;
    }
    return area;
}
```

```rust
use std::collections::BTreeSet;

fn rectangle_union_area(rectangles: &[(f64, f64, f64, f64)]) -> f64 {
    let mut events: Vec<(f64, f64, f64, i32)> = Vec::new();
    let mut y_coords_set: BTreeSet<u64> = BTreeSet::new();
    for &(x0, y0, x1, y1) in rectangles {
        events.push((x0, y0, y1, 1));
        events.push((x1, y0, y1, -1));
        y_coords_set.insert(y0.to_bits());
        y_coords_set.insert(y1.to_bits());
    }
    events.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
    let sorted_ys: Vec<f64> = y_coords_set.iter().map(|&bits| f64::from_bits(bits)).collect();
    let y_index = |y: f64| sorted_ys.iter().position(|&v| v == y).unwrap();

    let mut count = vec![0i32; sorted_ys.len().saturating_sub(1)];
    let covered_length = |count: &[i32]| -> f64 {
        let mut total = 0.0;
        for i in 0..count.len() {
            if count[i] > 0 {
                total += sorted_ys[i + 1] - sorted_ys[i];
            }
        }
        total
    };

    let mut area = 0.0;
    let mut prev_x = events[0].0;
    for &(x, y0, y1, delta) in &events {
        area += (x - prev_x) * covered_length(&count);
        for i in y_index(y0)..y_index(y1) {
            count[i] += delta;
        }
        prev_x = x;
    }
    area
}
```

```csharp
static double RectangleUnionArea(List<(double x0, double y0, double x1, double y1)> rectangles)
{
    var events = new List<(double x, double y0, double y1, int delta)>();
    var yCoordsSet = new SortedSet<double>();
    foreach (var (x0, y0, x1, y1) in rectangles)
    {
        events.Add((x0, y0, y1, 1));
        events.Add((x1, y0, y1, -1));
        yCoordsSet.Add(y0);
        yCoordsSet.Add(y1);
    }
    events.Sort((a, b) => a.x.CompareTo(b.x));
    var sortedYs = yCoordsSet.ToList();
    var yIndex = sortedYs.Select((y, i) => (y, i)).ToDictionary(p => p.y, p => p.i);

    var count = new int[sortedYs.Count - 1];
    double CoveredLength()
    {
        double total = 0;
        for (int i = 0; i < count.Length; i++) if (count[i] > 0) total += sortedYs[i + 1] - sortedYs[i];
        return total;
    }

    double area = 0;
    double prevX = events[0].x;
    foreach (var (x, y0, y1, delta) in events)
    {
        area += (x - prevX) * CoveredLength();
        for (int i = yIndex[y0]; i < yIndex[y1]; i++) count[i] += delta;
        prevX = x;
    }
    return area;
}
```
