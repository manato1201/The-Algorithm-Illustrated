---
name: マーチングキューブ法(Marching Cubes)
category: CG・3Dレンダリング
subcategory: ジオメトリ処理
complexity: O(n)(nはボリュームグリッドのセル数)
summary: 3次元スカラー場を格子状に区切ったセル(立方体)ごとに、8頂点の値がしきい値より大きいか小さいかのビットパターンから、あらかじめ用意した参照テーブルを引いて等値面の三角形を生成し、ボリュームデータを表面メッシュへ変換する手法。
---

## 概要

CTスキャンの医療データ、地形のボクセルデータ、流体シミュレーションの密度場のような**3次元スカラー場(ボリュームデータ)**は、空間の各点に「密度」「濃度」といった数値が定義されている。このスカラー場のうち「値がちょうどある閾値と等しい点の集合」を**等値面(isosurface)**と呼び、これを描画可能な三角形メッシュとして取り出したい場面は多い。マーチングキューブ法(Marching Cubes)は、1987年にウィリアム・ロレンセンとハーベイ・クラインによって提案された手法で、ボリュームデータを格子状の小さな立方体(セル)の集まりとみなし、**各セルの8つの頂点についてスカラー値が閾値より大きいか小さいかを調べ、そのオン/オフのビットパターン(256通り、対称性により実質15パターンに集約可能)から、あらかじめ計算しておいた参照テーブルを引いて、そのセル内に生成すべき三角形の頂点位置と組み合わせを決定する**というアルゴリズムである。全てのセルを1つずつ「行進(march)」しながら処理していくことからこの名がついており、ボリュームデータを表面ジオメトリへ変換する分野で最も広く使われる古典的な標準手法である。

## 仕組み

1. 対象の3次元空間を格子状のセル(立方体)に分割する。各格子点(セルの頂点)には、スカラー場の値(密度・距離場の値など)が定義済み、またはサンプリング関数によって計算できるものとする
2. 1つのセルに着目し、その8つの頂点それぞれについて、スカラー値が閾値以上か未満かを判定する。この8つのオン/オフの組み合わせを1バイト(8ビット)の**インデックス**として符号化する(値が閾値以上の頂点のビットを1にする、など)。全部で256通りの組み合わせがあるが、回転・反転の対称性により実質的に独立なパターンは15種類に分類できる
3. あらかじめ用意しておいた**エッジテーブル**を使い、このインデックスから「セルのどの辺(エッジ)が等値面と交差するか」を調べる(頂点の符号が異なる辺だけが交差する)
4. **トライアングルテーブル**(三角形分割テーブル)を使い、このインデックスから「交差する辺のうちどの組み合わせを結んで三角形を作るべきか」を決定する。このテーブルは256通りの全パターンに対して事前に計算済みの静的なデータとして持っておく
5. 実際に交差する各辺について、辺の両端の頂点のスカラー値を使って線形補間(またはより高次の補間)を行い、閾値とちょうど一致する位置(その辺上のどこに等値面が通るか)を求め、三角形の頂点座標として採用する
6. 全セルについて2〜5を繰り返し、生成された全ての三角形を結合すると、スカラー場全体の等値面を近似する三角形メッシュが得られる。法線はスカラー場の勾配(近傍の差分)から計算できる

## 特性・トレードオフ

- **事前計算されたテーブルによる高速さ**: 各セルの処理は「8ビットのインデックスを計算し、テーブルを引くだけ」というシンプルな定数時間の操作に帰着するため、セル数に対して線形の計算量で等値面を抽出できる。GPU上での並列実装とも相性がよい
- **曖昧なケース(トポロジカルな不整合)**: セルの1つの面の対角にある2頂点だけが閾値を超えているような特定のパターン(いわゆる「鞍点」のケース)では、どちらの対角線で三角形を分割するかによって隣接セルとの整合性が崩れ、メッシュに穴が空くことがある。改良版のマーチングキューブ法や、後継手法である**マーチングテトラヘドラ(セルを四面体に分割することで曖昧さを原理的に排除する)** はこの問題への対処として提案された
- **グリッド解像度と品質のトレードオフ**: セルのサイズを細かくするほど滑らかで正確な等値面が得られるが、セル数(ひいては三角形数)が3乗のオーダーで増大するため、メモリと計算コストが急増する。均一なグリッドではなく、octreeのような適応的な空間分割と組み合わせて、詳細が必要な領域だけ細かくする実装も多い
- **符号付き距離場(SDF)との親和性**: マーチングキューブ法は、CTスキャンのような実測データだけでなく、メタボール(複数の球状の場を合成した滑らかな曲面)や符号付き距離場から生成した滑らかなボリュームの表面化にも広く使われる。滑らかな入力ほど、線形補間による頂点位置の推定精度も高くなる
- **使いどころ**: 医療画像(CT/MRIデータ)からの臓器・骨の3D表面抽出、ボクセルベースの地形・洞窟生成(破壊可能地形を含む)、流体・煙・雲のシミュレーション結果の表面可視化、メタボールを使った有機的な形状のモデリング、[Catmull-Clark細分割曲面](/algorithms/catmull-clark-subdivision)のようなポリゴンメッシュの後処理を前提としたベースメッシュの生成

## 実装例

3次元グリッドの各セルについて8頂点の符号パターンを判定し、辺の交差点を線形補間して三角形を生成する簡略化した実装を示す(実際の実装では256通りの完全なトライアングルテーブルを使うが、ここでは単純化のため代表的なケース(頂点0のみがオン)だけの三角形分割ロジックで骨格を示す)。

```python
import math

Vec3 = tuple[float, float, float]

# セルの8頂点のローカル座標オフセット(標準的なマーチングキューブの頂点順序)
CUBE_CORNERS: list[Vec3] = [
    (0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0),
    (0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1),
]

# 頂点対で結ばれる12本のエッジ(頂点インデックスのペア)
CUBE_EDGES: list[tuple[int, int]] = [
    (0, 1), (1, 2), (2, 3), (3, 0),
    (4, 5), (5, 6), (6, 7), (7, 4),
    (0, 4), (1, 5), (2, 6), (3, 7),
]

def interpolate_edge(p1: Vec3, p2: Vec3, v1: float, v2: float, iso_level: float) -> Vec3:
    """辺の両端のスカラー値からiso_levelと一致する位置を線形補間で求める。"""
    if abs(iso_level - v1) < 1e-6:
        return p1
    if abs(iso_level - v2) < 1e-6:
        return p2
    t = (iso_level - v1) / (v2 - v1)
    return tuple(p1[i] + t * (p2[i] - p1[i]) for i in range(3))

def march_cube(
    cell_origin: Vec3, cell_size: float, sample_fn, iso_level: float,
) -> list[tuple[Vec3, Vec3, Vec3]]:
    """1つのセルについて、頂点の符号パターンからエッジ交差点を計算し、単純な扇形分割で三角形化する。"""
    corners = [tuple(cell_origin[i] + c[i] * cell_size for i in range(3)) for c in CUBE_CORNERS]
    values = [sample_fn(*corner) for corner in corners]

    index = 0
    for i, v in enumerate(values):
        if v > iso_level:
            index |= (1 << i)

    if index == 0 or index == 255:
        return []  # セル全体が内側か外側 → 等値面は通らない

    edge_points: dict[int, Vec3] = {}
    for edge_id, (a, b) in enumerate(CUBE_EDGES):
        a_inside = values[a] > iso_level
        b_inside = values[b] > iso_level
        if a_inside != b_inside:
            edge_points[edge_id] = interpolate_edge(corners[a], corners[b], values[a], values[b], iso_level)

    # 簡略化: 交差した辺の交点を扇形に三角形分割する(厳密な実装は256通りのトライアングルテーブルを使う)
    points = list(edge_points.values())
    triangles = []
    for i in range(1, len(points) - 1):
        triangles.append((points[0], points[i], points[i + 1]))
    return triangles

def march_volume(grid_size: tuple[int, int, int], cell_size: float, sample_fn, iso_level: float):
    triangles = []
    nx, ny, nz = grid_size
    for x in range(nx):
        for y in range(ny):
            for z in range(nz):
                origin = (x * cell_size, y * cell_size, z * cell_size)
                triangles.extend(march_cube(origin, cell_size, sample_fn, iso_level))
    return triangles
```

```typescript
type Vec3 = [number, number, number];

// セルの8頂点のローカル座標オフセット(標準的なマーチングキューブの頂点順序)
const CUBE_CORNERS: Vec3[] = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];

// 頂点対で結ばれる12本のエッジ(頂点インデックスのペア)
const CUBE_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

function interpolateEdge(p1: Vec3, p2: Vec3, v1: number, v2: number, isoLevel: number): Vec3 {
  if (Math.abs(isoLevel - v1) < 1e-6) return p1;
  if (Math.abs(isoLevel - v2) < 1e-6) return p2;
  const t = (isoLevel - v1) / (v2 - v1);
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]), p1[2] + t * (p2[2] - p1[2])];
}

type SampleFn = (x: number, y: number, z: number) => number;
type Triangle = [Vec3, Vec3, Vec3];

function marchCube(
  cellOrigin: Vec3,
  cellSize: number,
  sampleFn: SampleFn,
  isoLevel: number,
): Triangle[] {
  const corners = CUBE_CORNERS.map(
    (c): Vec3 => [
      cellOrigin[0] + c[0] * cellSize,
      cellOrigin[1] + c[1] * cellSize,
      cellOrigin[2] + c[2] * cellSize,
    ],
  );
  const values = corners.map(([x, y, z]) => sampleFn(x, y, z));

  let index = 0;
  values.forEach((v, i) => {
    if (v > isoLevel) index |= 1 << i;
  });

  if (index === 0 || index === 255) return []; // セル全体が内側か外側 → 等値面は通らない

  const edgePoints: Vec3[] = [];
  for (const [a, b] of CUBE_EDGES) {
    const aInside = values[a] > isoLevel;
    const bInside = values[b] > isoLevel;
    if (aInside !== bInside) {
      edgePoints.push(interpolateEdge(corners[a], corners[b], values[a], values[b], isoLevel));
    }
  }

  // 簡略化: 交差した辺の交点を扇形に三角形分割する(厳密な実装は256通りのトライアングルテーブルを使う)
  const triangles: Triangle[] = [];
  for (let i = 1; i < edgePoints.length - 1; i++) {
    triangles.push([edgePoints[0], edgePoints[i], edgePoints[i + 1]]);
  }
  return triangles;
}

function marchVolume(
  gridSize: [number, number, number],
  cellSize: number,
  sampleFn: SampleFn,
  isoLevel: number,
): Triangle[] {
  const triangles: Triangle[] = [];
  const [nx, ny, nz] = gridSize;
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        const origin: Vec3 = [x * cellSize, y * cellSize, z * cellSize];
        triangles.push(...marchCube(origin, cellSize, sampleFn, isoLevel));
      }
    }
  }
  return triangles;
}
```
