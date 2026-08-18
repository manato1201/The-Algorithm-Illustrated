---
name: サザーランド・ホッジマン法(ポリゴンクリッピング)
category: 計算幾何
subcategory: 凸包・多角形
complexity: O(n・m)(nは被クリップ多角形の頂点数、mはクリップ領域の辺数)
summary: 凸なクリップ領域の各辺で被クリップ多角形の頂点列を順に切り詰めていくことで、2つの多角形の交差領域を求めるポリゴンクリッピング手法。
---

## 概要

コンピュータグラフィックスでは、「画面(ビューポート)の外にはみ出た図形を、画面の内側だけに切り詰める」という処理(クリッピング)が頻繁に必要になる。Ivan SutherlandとGary Hodgmanが1974年に発表したこのアルゴリズムは、**任意の(凹んでいてもよい)多角形を、凸なクリップ領域(通常は矩形のビューポート)との交差領域に切り詰める**手法で、CGパイプラインにおけるクリッピング処理の古典的な標準解法として広く使われてきた。「クリップ領域の辺1本ごとに、多角形全体を切り詰める」という操作を繰り返すだけのシンプルな設計でありながら、ハードウェア実装にも向く効率的なアルゴリズムである。

## 仕組み

1. クリップ領域(凸多角形、m辺)の辺を1本ずつ順番に処理する。それぞれの辺は「この辺の内側」という半平面を定義する
2. **現在の被クリップ多角形の頂点列**を、その辺の半平面で切り詰める。具体的には、多角形の各辺(頂点`current`から次の頂点`next`)について、以下の4パターンで出力頂点を決める:
   - `current`が内側、`next`も内側 → `next`をそのまま出力
   - `current`が内側、`next`が外側 → 半平面の境界線との交点を出力(`next`自体は出力しない)
   - `current`が外側、`next`が内側 → 境界線との交点、続けて`next`を出力
   - `current`も`next`も外側 → 何も出力しない
3. この処理で得られた新しい頂点列を「次のクリップ辺で処理する多角形」として、クリップ領域の全ての辺(m本)について2を繰り返す
4. 全ての辺での切り詰めが終わった時点の頂点列が、被クリップ多角形とクリップ領域の交差領域(凸多角形)になる

この「辺ごとに多角形全体を切り詰める」という操作は、[半平面交差](/algorithms/half-plane-intersection)における「凸多角形を1つの半平面でクリッピングする」核心の処理と全く同じものであり、実際に半平面交差のアルゴリズムはサザーランド・ホッジマン法のクリッピング処理を繰り返し適用することで実装されることが多い。

## 特性・トレードオフ

- **計算量**: O(n・m)。クリップ領域のm本の辺それぞれについて、被クリップ多角形の全頂点(最大n個、クリッピングが進むごとに増減する)を走査するため。クリップ領域がビューポートのような矩形(m=4)であれば、実質O(n)で動作する
- **クリップ領域は凸でなければならない**: このアルゴリズムは「各辺が定義する半平面での逐次的な切り詰め」に依存しているため、**クリップ領域自体は凸多角形である必要がある**(被クリップ側の多角形は凹んでいてもよい)。凹なクリップ領域を扱うには、Weiler-Athertonアルゴリズムなど別の手法が必要になる
- **退化のリスク**: 被クリップ多角形が完全にクリップ領域の外側にある場合、交差領域は空になるべきだが、実装によっては意図しない縮退した頂点列(面積0の多角形など)が残ることがあり、後段の処理で頂点数0または面積0のケースを明示的にケアする必要がある
- **使いどころ**: CG・ゲームエンジンにおけるビューポートクリッピング(画面外のポリゴンの切り詰め)、地図データにおける表示範囲外の地物のクリッピング、CADソフトウェアでの図形の部分抽出、[半平面交差](/algorithms/half-plane-intersection)の実装における凸多角形同士の交差計算の核として

## 実装例

```python
Point = tuple[float, float]


def is_inside(p: Point, edge_a: Point, edge_b: Point) -> bool:
    """クリップ辺(edge_a, edge_b)の左側を「内側」とする。"""
    return (edge_b[0] - edge_a[0]) * (p[1] - edge_a[1]) - (edge_b[1] - edge_a[1]) * (p[0] - edge_a[0]) >= 0


def line_intersection(p1: Point, p2: Point, edge_a: Point, edge_b: Point) -> Point:
    x1, y1 = p1
    x2, y2 = p2
    x3, y3 = edge_a
    x4, y4 = edge_b
    denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))


def clip_edge(subject: list[Point], edge_a: Point, edge_b: Point) -> list[Point]:
    """多角形subjectを、クリップ辺(edge_a, edge_b)が定める半平面で切り詰める。"""
    if not subject:
        return []
    output: list[Point] = []
    n = len(subject)
    for i in range(n):
        current, nxt = subject[i], subject[(i + 1) % n]
        cur_in, nxt_in = is_inside(current, edge_a, edge_b), is_inside(nxt, edge_a, edge_b)
        if cur_in:
            output.append(current)
            if not nxt_in:
                output.append(line_intersection(current, nxt, edge_a, edge_b))
        elif nxt_in:
            output.append(line_intersection(current, nxt, edge_a, edge_b))
    return output


def sutherland_hodgman(subject_polygon: list[Point], clip_polygon: list[Point]) -> list[Point]:
    """clip_polygon(凸多角形、反時計回り)でsubject_polygonを切り詰める。"""
    output = subject_polygon
    m = len(clip_polygon)
    for i in range(m):
        if not output:
            break
        edge_a, edge_b = clip_polygon[i], clip_polygon[(i + 1) % m]
        output = clip_edge(output, edge_a, edge_b)
    return output
```

```typescript
type Point = [number, number];

// クリップ辺(edgeA, edgeB)の左側を「内側」とする
function isInside(p: Point, edgeA: Point, edgeB: Point): boolean {
  return (edgeB[0] - edgeA[0]) * (p[1] - edgeA[1]) - (edgeB[1] - edgeA[1]) * (p[0] - edgeA[0]) >= 0;
}

function lineIntersection(p1: Point, p2: Point, edgeA: Point, edgeB: Point): Point {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const [x3, y3] = edgeA;
  const [x4, y4] = edgeB;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}

// 多角形subjectを、クリップ辺(edgeA, edgeB)が定める半平面で切り詰める
function clipEdge(subject: Point[], edgeA: Point, edgeB: Point): Point[] {
  if (subject.length === 0) return [];
  const output: Point[] = [];
  const n = subject.length;
  for (let i = 0; i < n; i++) {
    const current = subject[i];
    const next = subject[(i + 1) % n];
    const curIn = isInside(current, edgeA, edgeB);
    const nextIn = isInside(next, edgeA, edgeB);
    if (curIn) {
      output.push(current);
      if (!nextIn) output.push(lineIntersection(current, next, edgeA, edgeB));
    } else if (nextIn) {
      output.push(lineIntersection(current, next, edgeA, edgeB));
    }
  }
  return output;
}

// clipPolygon(凸多角形、反時計回り)でsubjectPolygonを切り詰める
function sutherlandHodgman(subjectPolygon: Point[], clipPolygon: Point[]): Point[] {
  let output = subjectPolygon;
  const m = clipPolygon.length;
  for (let i = 0; i < m; i++) {
    if (output.length === 0) break;
    const edgeA = clipPolygon[i];
    const edgeB = clipPolygon[(i + 1) % m];
    output = clipEdge(output, edgeA, edgeB);
  }
  return output;
}
```
