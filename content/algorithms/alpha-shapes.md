---
name: アルファシェイプ(Alpha Shapes)
category: 計算幾何
subcategory: 三角形分割・分割図
complexity: O(n log n)(ドロネー三角形分割の構築が支配的)
summary: ドロネー三角形分割から外接円の半径がパラメータαより大きい三角形を取り除くことで、点群が持つ穴や凹みを含む「形状」の輪郭を復元する手法。
---

## 概要

[凸包](/algorithms/graham-scan)は点群を過不足なく包む最小の凸多角形を求めるが、実際の点群が表す形状はドーナツ状に穴が開いていたり、三日月のように凹んでいたりすることが多く、凸包ではその「本当の形」を表現できない。EdelsbrunnerとMückeらが1983年に提案したアルファシェイプは、[ドロネー三角形分割](/algorithms/delaunay-triangulation)を出発点に、パラメータ`α`(アルファ)を使って**穴や凹みを保持したまま点群の形状を復元する**手法である。`α`を無限大にすると凸包に一致し、`α`を小さくしていくと徐々に形状が「痩せて」いき、点群のクラスタ構造や輪郭がより忠実に浮かび上がってくる。

## 仕組み

1. まず、点群全体の[ドロネー三角形分割](/algorithms/delaunay-triangulation)を求める。ドロネー三角形分割は、各三角形の外接円の内部に他の点を含まないという性質を持ち、全ての三角形の候補を漏れなく列挙している
2. 各三角形について、その**外接円の半径`r`**を計算する
3. パラメータ`α`を1つ定め、`r > α`となる三角形(=外接円が大きすぎる、つまり「疎らな領域」を覆っている三角形)を取り除く
4. 残った三角形の集合(および、辺・頂点も同様の基準で選別する)が、パラメータ`α`に対応するアルファシェイプの形状となる

**直感的な理解**: 半径`α`の円を点群の隙間に転がすことをイメージすると分かりやすい。円がある三角形の外接円よりも小さい(=`α`が小さい)なら、その円はその三角形の内部を"通り抜けられる"ため、そこは「形状の外側(穴・境界の外)」とみなされ三角形は除去される。逆に円が通り抜けられない密な領域の三角形は残る。`α = ∞`のときは全ての三角形が残り、これは[凸包](/algorithms/graham-scan)の三角形分割そのものに一致する。`α`を徐々に小さくしていくと、疎らな部分から順に穴が開いていき、最終的には点群がバラバラの点の集合(全ての三角形が除去された状態)になる。

## 特性・トレードオフ

- **凸包しか求まらない手法との違い**: 凸包は常に「へこみのない」単一の凸多角形を返すが、アルファシェイプは`α`の値次第で、複数の連結成分・穴(ドーナツ状の構造)・鋭い凹みを含む、より複雑で現実に即した形状を表現できる。点群クラスタリングの結果を可視化する際や、非凸な物体の輪郭を復元したい場合に不可欠
- **パラメータ`α`の選び方が結果を左右する**: `α`が大きすぎると凸包に近づき細部の凹みが失われ、小さすぎると本来つながっているべき領域まで分断されてしまう。適切な`α`は点群の密度に依存するため、点間の平均距離などを参考に試行錯誤で決めることが多い(全ての`α`に対する変化を追跡する「アルファ複体のフィルトレーション」という発展的な手法もあり、パーシステントホモロジーなどトポロジカルデータ解析の基礎になっている)
- **計算量**: ドロネー三角形分割の構築がO(n log n)で支配的。三角形ごとの外接円半径の計算と閾値によるフィルタリングはO(n)で済むため、全体としてO(n log n)を保てる
- **使いどころ**: 点群データ(3Dスキャン、GPSトラッキング点列など)からの形状復元、地理情報システムにおける非凸な領域(海岸線、行政区域の飛び地)の輪郭抽出、クラスタリング結果の可視化、分子生物学におけるタンパク質表面のモデリング

## 実装例

```python
import math
from itertools import combinations

Point = tuple[float, float]
Triangle = tuple[int, int, int]


def circumradius(a: Point, b: Point, c: Point) -> float:
    """三角形a, b, cの外接円の半径を求める(退化(面積0)なら無限大を返す)。"""
    ax, ay = a
    bx, by = b
    cx, cy = c
    area2 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
    if abs(area2) < 1e-12:
        return math.inf
    la = math.dist(b, c)
    lb = math.dist(a, c)
    lc = math.dist(a, b)
    return (la * lb * lc) / (2 * abs(area2))


def alpha_shape(points: list[Point], triangles: list[Triangle], alpha: float) -> list[Triangle]:
    """ドロネー三角形分割(triangles: 頂点インデックスの3つ組のリスト)から、
    外接円の半径がalpha以下の三角形だけを残す。"""
    kept = []
    for tri in triangles:
        a, b, c = (points[i] for i in tri)
        if circumradius(a, b, c) <= alpha:
            kept.append(tri)
    return kept


def boundary_edges(triangles: list[Triangle]) -> set[tuple[int, int]]:
    """アルファシェイプに残った三角形集合から、境界(=1つの三角形にしか属さない辺)を抽出する。"""
    edge_count: dict[tuple[int, int], int] = {}
    for a, b, c in triangles:
        for u, v in ((a, b), (b, c), (c, a)):
            key = (u, v) if u < v else (v, u)
            edge_count[key] = edge_count.get(key, 0) + 1
    return {e for e, cnt in edge_count.items() if cnt == 1}
```

```typescript
type Point = [number, number];
type Triangle = [number, number, number];

function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

// 三角形a, b, cの外接円の半径を求める(退化(面積0)なら無限大を返す)
function circumradius(a: Point, b: Point, c: Point): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const [cx, cy] = c;
  const area2 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area2) < 1e-12) return Infinity;
  const la = dist(b, c);
  const lb = dist(a, c);
  const lc = dist(a, b);
  return (la * lb * lc) / (2 * Math.abs(area2));
}

// ドロネー三角形分割(triangles: 頂点インデックスの3つ組のリスト)から、
// 外接円の半径がalpha以下の三角形だけを残す
function alphaShape(points: Point[], triangles: Triangle[], alpha: number): Triangle[] {
  return triangles.filter((tri) => {
    const [a, b, c] = tri.map((i) => points[i]);
    return circumradius(a, b, c) <= alpha;
  });
}

// アルファシェイプに残った三角形集合から、境界(=1つの三角形にしか属さない辺)を抽出する
function boundaryEdges(triangles: Triangle[]): Set<string> {
  const edgeCount = new Map<string, number>();
  for (const [a, b, c] of triangles) {
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as [number, number][]) {
      const key = u < v ? `${u},${v}` : `${v},${u}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
    }
  }
  const boundary = new Set<string>();
  for (const [key, count] of edgeCount) if (count === 1) boundary.add(key);
  return boundary;
}
```
