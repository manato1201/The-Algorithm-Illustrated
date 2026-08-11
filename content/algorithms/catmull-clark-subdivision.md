---
name: Catmull-Clark細分割曲面
category: CG・3Dレンダリング
subcategory: ジオメトリ処理
complexity: O(F+E+V)(1回の細分割あたり、F=面数、E=辺数、V=頂点数)
summary: 粗いポリゴンメッシュに「面点・辺点・頂点の再配置」という3種類の規則的な操作を繰り返し適用することで、任意のメッシュを滑らかな曲面へ収束させる、CGの標準的な細分割曲面アルゴリズム。
---

## 概要

低ポリゴンのメッシュ(制御メッシュ)を、アーティストが直感的に編集しやすい粗い形状のまま扱いつつ、レンダリング時には滑らかな曲面として表示したい、という要求は3DCG制作の随所で生じる。Catmull-Clark細分割曲面は、1978年にエドウィン・キャットマルとジム・クラークが提案した手法で、任意の四角形(または多角形)メッシュに対して**「各面の中心に新しい点を打つ」「各辺の中点に新しい点を打つ」「元の頂点を周囲の点の加重平均で置き換える」**という3種類の操作を1回の細分割ステップとして定義する。この操作を繰り返し適用すると、ポリゴン数は指数的に増えながら、形状は数学的に厳密なスプライン曲面(境界のない領域ではB-スプライン曲面に一致する)へ収束していく。Pixarのレンダリングパイプライン(OpenSubdiv)をはじめ、映画・ゲームの3Dモデリングツールで標準的に使われている。

## 仕組み

1つの細分割ステップは、次の3種類の新しい点を計算することで構成される。

1. **面点(Face Point)**: 各面について、その面を構成する全頂点の平均座標を新しい点とする
2. **辺点(Edge Point)**: 各辺について、「辺の両端点」と「その辺を共有する2つの面の面点」、合計4点の平均座標を新しい点とする(境界の辺の場合は両端点の中点を使う)
3. **頂点の更新**: 元の各頂点`v`について、周囲の面点の平均`F`、周囲の辺の中点の平均`R`、頂点自身の位置`P`、隣接する面の数`n`を使い、`v' = (F + 2R + (n-3)P) / n`という加重平均で新しい位置を計算する
4. 新しく計算した面点・辺点・頂点を使い、元の各面を「面点を中心に、各辺点と元の頂点を結んで」複数の小さな四角形に分割する。四角形の面であれば4つの小さな四角形に、多角形であれば頂点数と同じ数の四角形に分割される
5. 1〜4を1回の細分割として、望む滑らかさが得られるまで繰り返す。理論的には無限回繰り返すと厳密な極限曲面に収束するが、実務では数回(2〜4回程度)の細分割で十分滑らかな見た目が得られる

## 特性・トレードオフ

- **任意のトポロジーに対応できる汎用性**: 三角形分割ベースの細分割曲面(ループ細分割など)とは異なり、Catmull-Clarkは四角形主体のメッシュ(モデリングで最も一般的)に対して自然に定義され、5本以上の辺が集まる特異点(Extraordinary Vertex)を含む任意のメッシュにも適用できる
- **制御メッシュと最終形状の分離**: アーティストは粗いポリゴン数の制御メッシュを直感的に編集し、実際のレンダリング(または[LOD](/algorithms/level-of-detail)の高精細版)では細分割後の滑らかな曲面を使うという役割分担ができる。制御メッシュを動かせば、細分割された曲面もそれに追従して変形する
- **細分割レベルと計算コストのトレードオフ**: 1回の細分割でポリゴン数はおよそ4倍に増える。レンダリング時にGPU上でリアルタイムに適応的な細分割レベルを計算する(画面上での見かけの大きさに応じて細分割回数を変える、[LOD](/algorithms/level-of-detail)の考え方に近い)ことで、必要な部分にだけ計算コストをかける最適化が実務では重要になる
- **使いどころ**: 映画・アニメーションのキャラクター・オブジェクトモデリング(Pixarの作品はほぼ全てCatmull-Clark曲面をベースにしている)、ゲームエンジンのハードウェアテッセレーション機能、3Dモデリングソフト(Blender、Mayaなど)の標準的なサブディビジョンサーフェスモディファイア

## 実装例

四角形メッシュに対する1回のCatmull-Clark細分割の核となる計算(面点・辺点・頂点更新)を示す。

```python
from collections import defaultdict

Vec3 = tuple[float, float, float]

def add(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])

def scale(a: Vec3, s: float) -> Vec3:
    return (a[0] * s, a[1] * s, a[2] * s)

def average(points: list[Vec3]) -> Vec3:
    n = len(points)
    total = (0.0, 0.0, 0.0)
    for p in points:
        total = add(total, p)
    return scale(total, 1.0 / n)

def catmull_clark_step(
    vertices: list[Vec3], faces: list[list[int]],
) -> tuple[list[Vec3], list[list[int]]]:
    face_points = [average([vertices[i] for i in face]) for face in faces]

    edge_to_faces: dict[frozenset, list[int]] = defaultdict(list)
    for fi, face in enumerate(faces):
        n = len(face)
        for i in range(n):
            edge = frozenset({face[i], face[(i + 1) % n]})
            edge_to_faces[edge].append(fi)

    edge_points: dict[frozenset, Vec3] = {}
    for edge, adjacent_faces in edge_to_faces.items():
        endpoints = [vertices[i] for i in edge]
        adjacent_face_pts = [face_points[fi] for fi in adjacent_faces]
        edge_points[edge] = average(endpoints + adjacent_face_pts)

    vertex_neighbor_faces: dict[int, list[int]] = defaultdict(list)
    vertex_neighbor_edges: dict[int, list[frozenset]] = defaultdict(list)
    for fi, face in enumerate(faces):
        n = len(face)
        for i, v in enumerate(face):
            vertex_neighbor_faces[v].append(fi)
            vertex_neighbor_edges[v].append(frozenset({face[i], face[(i + 1) % n]}))
            vertex_neighbor_edges[v].append(frozenset({face[i - 1], face[i]}))

    new_vertices = list(vertices)
    for v_idx, v_pos in enumerate(vertices):
        adjacent_faces = vertex_neighbor_faces[v_idx]
        n = len(adjacent_faces)
        if n == 0:
            continue
        avg_face = average([face_points[fi] for fi in adjacent_faces])
        adjacent_edges = list(set(vertex_neighbor_edges[v_idx]))
        avg_edge_midpoint = average([average([vertices[i] for i in e]) for e in adjacent_edges])
        new_pos = scale(add(add(avg_face, scale(avg_edge_midpoint, 2.0)), scale(v_pos, n - 3)), 1.0 / n)
        new_vertices[v_idx] = new_pos

    return new_vertices, faces  # 面の再分割(4分割)は省略した簡易版
```

```typescript
type Vec3 = [number, number, number];

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function average(points: Vec3[]): Vec3 {
  const total = points.reduce((acc, p) => add(acc, p), [0, 0, 0] as Vec3);
  return scale(total, 1 / points.length);
}

function facePoints(vertices: Vec3[], faces: number[][]): Vec3[] {
  return faces.map((face) => average(face.map((i) => vertices[i])));
}
```

```cpp
#include <array>
#include <vector>

using Vec3 = std::array<double, 3>;

Vec3 add(const Vec3& a, const Vec3& b) { return {a[0] + b[0], a[1] + b[1], a[2] + b[2]}; }
Vec3 scale(const Vec3& a, double s) { return {a[0] * s, a[1] * s, a[2] * s}; }

Vec3 average(const std::vector<Vec3>& points) {
    Vec3 total = {0, 0, 0};
    for (auto& p : points) total = add(total, p);
    return scale(total, 1.0 / points.size());
}

std::vector<Vec3> facePoints(const std::vector<Vec3>& vertices, const std::vector<std::vector<int>>& faces) {
    std::vector<Vec3> result;
    for (auto& face : faces) {
        std::vector<Vec3> pts;
        for (int i : face) pts.push_back(vertices[i]);
        result.push_back(average(pts));
    }
    return result;
}
```

```rust
type Vec3 = [f64; 3];

fn add(a: Vec3, b: Vec3) -> Vec3 {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
fn scale(a: Vec3, s: f64) -> Vec3 {
    [a[0] * s, a[1] * s, a[2] * s]
}
fn average(points: &[Vec3]) -> Vec3 {
    let total = points.iter().fold([0.0, 0.0, 0.0], |acc, &p| add(acc, p));
    scale(total, 1.0 / points.len() as f64)
}

fn face_points(vertices: &[Vec3], faces: &[Vec<usize>]) -> Vec<Vec3> {
    faces
        .iter()
        .map(|face| {
            let pts: Vec<Vec3> = face.iter().map(|&i| vertices[i]).collect();
            average(&pts)
        })
        .collect()
}
```

```csharp
static double[] Add(double[] a, double[] b) => new[] { a[0] + b[0], a[1] + b[1], a[2] + b[2] };
static double[] Scale(double[] a, double s) => new[] { a[0] * s, a[1] * s, a[2] * s };

static double[] Average(List<double[]> points)
{
    var total = new double[] { 0, 0, 0 };
    foreach (var p in points) total = Add(total, p);
    return Scale(total, 1.0 / points.Count);
}

static List<double[]> FacePoints(List<double[]> vertices, List<List<int>> faces)
{
    var result = new List<double[]>();
    foreach (var face in faces)
    {
        var pts = face.Select(i => vertices[i]).ToList();
        result.Add(Average(pts));
    }
    return result;
}
```
