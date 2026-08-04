---
name: 八分木(Octree)
category: データ構造
subcategory: 空間分割構造
complexity: O(log n)(深さ方向の探索、平衡が取れている場合)
summary: 2次元平面を4分割するquad-treeの発想を3次元空間にそのまま拡張し、各領域を8個の子立方体に再帰的に分割することで3Dオブジェクトの空間検索・衝突判定を効率化する木構造。
---

## 概要

[quad-tree](/algorithms/quad-tree)が2次元平面を4分割して階層的に管理するのに対し、八分木(Octree)はこの発想をそのまま3次元空間に拡張し、各立方体の領域を8個の子立方体(2×2×2)に再帰的に分割する。3Dゲームエンジン・CGソフトウェア・ロボティクスのような、3次元空間内のオブジェクトを扱う分野で、[quad-tree](/algorithms/quad-tree)が2Dゲームで果たすのと同じ役割——「この視界範囲・この衝突判定範囲に含まれるオブジェクトだけを高速に絞り込む」——を担う。

## 仕組み

1. 対象となる3次元空間全体を包む1つの立方体を根ノードとする
2. ある立方体領域に含まれるオブジェクトの数が閾値を超えたら、その立方体をX軸・Y軸・Z軸それぞれの中点で分割し、8個の同じ大きさの子立方体(オクタント)を作る
3. 各オブジェクトを、それが属する子立方体へ振り分ける(複数の子立方体にまたがるオブジェクトは、親ノードに留めるか、複数の子に重複登録するかの設計判断が必要になる)
4. 子立方体内のオブジェクト数がまだ閾値を超えていれば、その子立方体をさらに8分割する——これを再帰的に繰り返し、各領域のオブジェクト数が十分少なくなるか、あらかじめ決めた最大深度に達するまで続ける
5. **範囲検索・視錐台カリング**(カメラに映る範囲だけを描画対象にする処理): クエリ範囲(視錐台や衝突判定範囲)と重ならない立方体は、その配下の全オブジェクトを含めて探索をまるごと省略できる

## 特性・トレードオフ

- **計算量**: オブジェクトの分布が比較的均一で木が平衡していれば、範囲検索は`O(log n)`程度に収まる。[quad-tree](/algorithms/quad-tree)と同様、極端に偏った分布(1点にオブジェクトが密集する等)では深さが偏り、性能が悪化することがある
- **[quad-tree](/algorithms/quad-tree)からの次元拡張**: 発想・実装ロジックのほとんどが[quad-tree](/algorithms/quad-tree)と共通しており、「次元数`d`に対して`2^d`個の子を持つ」という一般化された空間分割木の考え方の3次元版として理解すると見通しがよい
- **メモリと深度のトレードオフ**: 3次元では1回の分割で子が8個に増えるため、2次元のquad-treeより深さあたりのメモリ消費が大きくなりやすい。実務では最大深度やオブジェクト数の閾値を適切に設定し、過度に細かい分割を避ける調整が重要になる
- **使いどころ**: 3Dゲームエンジンの視錐台カリング・衝突判定の高速化、3Dモデリングソフトウェアにおけるボクセルデータ(3次元格子状のデータ)の効率的な表現、点群データ(LiDARスキャン等)の空間インデックス、ロボティクスにおける3次元環境地図(occupancy grid map)の階層的表現

## 実装例

3D点群を挿入し、軸並行境界ボックスによる範囲検索を行う。結果が全点を舐める総当たり探索と一致することを検証する。

```python
Point3 = tuple[float, float, float]


class OctreeNode:
    def __init__(self, cx: float, cy: float, cz: float, half: float, depth: int = 0, max_points: int = 4, max_depth: int = 6):
        self.cx, self.cy, self.cz, self.half = cx, cy, cz, half
        self.depth, self.max_points, self.max_depth = depth, max_points, max_depth
        self.points: list[Point3] = []
        self.children: list["OctreeNode"] | None = None

    def contains(self, p: Point3) -> bool:
        x, y, z = p
        return (
            self.cx - self.half <= x <= self.cx + self.half
            and self.cy - self.half <= y <= self.cy + self.half
            and self.cz - self.half <= z <= self.cz + self.half
        )

    def insert(self, p: Point3) -> bool:
        if not self.contains(p):
            return False
        if self.children is None:
            if len(self.points) < self.max_points or self.depth >= self.max_depth:
                self.points.append(p)
                return True
            self._subdivide()
        return any(child.insert(p) for child in self.children)

    def _subdivide(self) -> None:
        h = self.half / 2
        self.children = [
            OctreeNode(self.cx + dx, self.cy + dy, self.cz + dz, h, self.depth + 1, self.max_points, self.max_depth)
            for dx in (-h, h) for dy in (-h, h) for dz in (-h, h)
        ]
        old_points, self.points = self.points, []
        for p in old_points:
            for child in self.children:
                if child.insert(p):
                    break

    def range_query(self, qmin: Point3, qmax: Point3, out: list[Point3] | None = None) -> list[Point3]:
        out = out if out is not None else []
        if not self._intersects(qmin, qmax):
            return out
        out.extend(p for p in self.points if all(qmin[i] <= p[i] <= qmax[i] for i in range(3)))
        if self.children:
            for child in self.children:
                child.range_query(qmin, qmax, out)
        return out

    def _intersects(self, qmin: Point3, qmax: Point3) -> bool:
        return not (
            qmax[0] < self.cx - self.half or qmin[0] > self.cx + self.half
            or qmax[1] < self.cy - self.half or qmin[1] > self.cy + self.half
            or qmax[2] < self.cz - self.half or qmin[2] > self.cz + self.half
        )
```

```typescript
type Point3 = [number, number, number];

class OctreeNode {
  cx: number; cy: number; cz: number; half: number;
  depth: number; maxPoints: number; maxDepth: number;
  points: Point3[] = [];
  children: OctreeNode[] | null = null;

  constructor(cx: number, cy: number, cz: number, half: number, depth = 0, maxPoints = 4, maxDepth = 6) {
    this.cx = cx; this.cy = cy; this.cz = cz; this.half = half;
    this.depth = depth; this.maxPoints = maxPoints; this.maxDepth = maxDepth;
  }

  contains(p: Point3): boolean {
    const [x, y, z] = p;
    return (
      x >= this.cx - this.half && x <= this.cx + this.half &&
      y >= this.cy - this.half && y <= this.cy + this.half &&
      z >= this.cz - this.half && z <= this.cz + this.half
    );
  }

  insert(p: Point3): boolean {
    if (!this.contains(p)) return false;
    if (this.children === null) {
      if (this.points.length < this.maxPoints || this.depth >= this.maxDepth) {
        this.points.push(p);
        return true;
      }
      this.subdivide();
    }
    return this.children!.some((child) => child.insert(p));
  }

  private subdivide(): void {
    const h = this.half / 2;
    this.children = [];
    for (const dx of [-h, h]) {
      for (const dy of [-h, h]) {
        for (const dz of [-h, h]) {
          this.children.push(new OctreeNode(this.cx + dx, this.cy + dy, this.cz + dz, h, this.depth + 1, this.maxPoints, this.maxDepth));
        }
      }
    }
    const oldPoints = this.points;
    this.points = [];
    for (const p of oldPoints) {
      for (const child of this.children) if (child.insert(p)) break;
    }
  }

  rangeQuery(qmin: Point3, qmax: Point3, out: Point3[] = []): Point3[] {
    if (!this.intersects(qmin, qmax)) return out;
    for (const p of this.points) {
      if (qmin[0] <= p[0] && p[0] <= qmax[0] && qmin[1] <= p[1] && p[1] <= qmax[1] && qmin[2] <= p[2] && p[2] <= qmax[2]) {
        out.push(p);
      }
    }
    if (this.children) for (const child of this.children) child.rangeQuery(qmin, qmax, out);
    return out;
  }

  private intersects(qmin: Point3, qmax: Point3): boolean {
    return !(
      qmax[0] < this.cx - this.half || qmin[0] > this.cx + this.half ||
      qmax[1] < this.cy - this.half || qmin[1] > this.cy + this.half ||
      qmax[2] < this.cz - this.half || qmin[2] > this.cz + this.half
    );
  }
}
```

```cpp
#include <vector>
#include <array>
#include <memory>

using Point3 = std::array<double, 3>;

class OctreeNode {
public:
    double cx, cy, cz, half;
    int depth, maxPoints, maxDepth;
    std::vector<Point3> points;
    std::vector<std::unique_ptr<OctreeNode>> children;

    OctreeNode(double cx, double cy, double cz, double half, int depth = 0, int maxPoints = 4, int maxDepth = 6)
        : cx(cx), cy(cy), cz(cz), half(half), depth(depth), maxPoints(maxPoints), maxDepth(maxDepth) {}

    bool contains(const Point3& p) const {
        return p[0] >= cx - half && p[0] <= cx + half &&
               p[1] >= cy - half && p[1] <= cy + half &&
               p[2] >= cz - half && p[2] <= cz + half;
    }

    bool insert(const Point3& p) {
        if (!contains(p)) return false;
        if (children.empty()) {
            if (static_cast<int>(points.size()) < maxPoints || depth >= maxDepth) {
                points.push_back(p);
                return true;
            }
            subdivide();
        }
        for (auto& child : children) if (child->insert(p)) return true;
        return false;
    }

    void rangeQuery(const Point3& qmin, const Point3& qmax, std::vector<Point3>& out) const {
        if (!intersects(qmin, qmax)) return;
        for (const auto& p : points) {
            if (qmin[0] <= p[0] && p[0] <= qmax[0] && qmin[1] <= p[1] && p[1] <= qmax[1] && qmin[2] <= p[2] && p[2] <= qmax[2]) {
                out.push_back(p);
            }
        }
        for (const auto& child : children) child->rangeQuery(qmin, qmax, out);
    }

private:
    void subdivide() {
        double h = half / 2;
        for (double dx : {-h, h}) {
            for (double dy : {-h, h}) {
                for (double dz : {-h, h}) {
                    children.push_back(std::make_unique<OctreeNode>(cx + dx, cy + dy, cz + dz, h, depth + 1, maxPoints, maxDepth));
                }
            }
        }
        auto oldPoints = std::move(points);
        points.clear();
        for (const auto& p : oldPoints) {
            for (auto& child : children) if (child->insert(p)) break;
        }
    }

    bool intersects(const Point3& qmin, const Point3& qmax) const {
        return !(qmax[0] < cx - half || qmin[0] > cx + half ||
                 qmax[1] < cy - half || qmin[1] > cy + half ||
                 qmax[2] < cz - half || qmin[2] > cz + half);
    }
};
```

```rust
type Point3 = (f64, f64, f64);

struct OctreeNode {
    cx: f64, cy: f64, cz: f64, half: f64,
    depth: i32, max_points: usize, max_depth: i32,
    points: Vec<Point3>,
    children: Option<Vec<OctreeNode>>,
}

impl OctreeNode {
    fn new(cx: f64, cy: f64, cz: f64, half: f64, depth: i32, max_points: usize, max_depth: i32) -> Self {
        OctreeNode { cx, cy, cz, half, depth, max_points, max_depth, points: Vec::new(), children: None }
    }

    fn contains(&self, p: Point3) -> bool {
        p.0 >= self.cx - self.half && p.0 <= self.cx + self.half &&
        p.1 >= self.cy - self.half && p.1 <= self.cy + self.half &&
        p.2 >= self.cz - self.half && p.2 <= self.cz + self.half
    }

    fn insert(&mut self, p: Point3) -> bool {
        if !self.contains(p) { return false; }
        if self.children.is_none() {
            if self.points.len() < self.max_points || self.depth >= self.max_depth {
                self.points.push(p);
                return true;
            }
            self.subdivide();
        }
        self.children.as_mut().unwrap().iter_mut().any(|child| child.insert(p))
    }

    fn subdivide(&mut self) {
        let h = self.half / 2.0;
        let mut children = Vec::with_capacity(8);
        for &dx in &[-h, h] {
            for &dy in &[-h, h] {
                for &dz in &[-h, h] {
                    children.push(OctreeNode::new(self.cx + dx, self.cy + dy, self.cz + dz, h, self.depth + 1, self.max_points, self.max_depth));
                }
            }
        }
        let old_points = std::mem::take(&mut self.points);
        for p in old_points {
            for child in children.iter_mut() {
                if child.insert(p) { break; }
            }
        }
        self.children = Some(children);
    }

    fn range_query(&self, qmin: Point3, qmax: Point3, out: &mut Vec<Point3>) {
        if !self.intersects(qmin, qmax) { return; }
        for &p in &self.points {
            if qmin.0 <= p.0 && p.0 <= qmax.0 && qmin.1 <= p.1 && p.1 <= qmax.1 && qmin.2 <= p.2 && p.2 <= qmax.2 {
                out.push(p);
            }
        }
        if let Some(children) = &self.children {
            for child in children { child.range_query(qmin, qmax, out); }
        }
    }

    fn intersects(&self, qmin: Point3, qmax: Point3) -> bool {
        !(qmax.0 < self.cx - self.half || qmin.0 > self.cx + self.half ||
          qmax.1 < self.cy - self.half || qmin.1 > self.cy + self.half ||
          qmax.2 < self.cz - self.half || qmin.2 > self.cz + self.half)
    }
}
```

```csharp
class OctreeNode
{
    public double Cx, Cy, Cz, Half;
    public int Depth, MaxPoints, MaxDepth;
    public List<(double, double, double)> Points = new();
    public List<OctreeNode>? Children;

    public OctreeNode(double cx, double cy, double cz, double half, int depth = 0, int maxPoints = 4, int maxDepth = 6)
    {
        (Cx, Cy, Cz, Half, Depth, MaxPoints, MaxDepth) = (cx, cy, cz, half, depth, maxPoints, maxDepth);
    }

    public bool Contains((double, double, double) p)
    {
        var (x, y, z) = p;
        return x >= Cx - Half && x <= Cx + Half && y >= Cy - Half && y <= Cy + Half && z >= Cz - Half && z <= Cz + Half;
    }

    public bool Insert((double, double, double) p)
    {
        if (!Contains(p)) return false;
        if (Children == null)
        {
            if (Points.Count < MaxPoints || Depth >= MaxDepth)
            {
                Points.Add(p);
                return true;
            }
            Subdivide();
        }
        foreach (var child in Children!) if (child.Insert(p)) return true;
        return false;
    }

    void Subdivide()
    {
        double h = Half / 2;
        Children = new List<OctreeNode>();
        foreach (var dx in new[] { -h, h })
            foreach (var dy in new[] { -h, h })
                foreach (var dz in new[] { -h, h })
                    Children.Add(new OctreeNode(Cx + dx, Cy + dy, Cz + dz, h, Depth + 1, MaxPoints, MaxDepth));
        var old = Points;
        Points = new List<(double, double, double)>();
        foreach (var p in old)
            foreach (var child in Children)
                if (child.Insert(p)) break;
    }

    public List<(double, double, double)> RangeQuery((double, double, double) qmin, (double, double, double) qmax, List<(double, double, double)>? outList = null)
    {
        outList ??= new List<(double, double, double)>();
        if (!Intersects(qmin, qmax)) return outList;
        foreach (var p in Points)
            if (qmin.Item1 <= p.Item1 && p.Item1 <= qmax.Item1 && qmin.Item2 <= p.Item2 && p.Item2 <= qmax.Item2 && qmin.Item3 <= p.Item3 && p.Item3 <= qmax.Item3)
                outList.Add(p);
        if (Children != null) foreach (var child in Children) child.RangeQuery(qmin, qmax, outList);
        return outList;
    }

    bool Intersects((double, double, double) qmin, (double, double, double) qmax) =>
        !(qmax.Item1 < Cx - Half || qmin.Item1 > Cx + Half ||
          qmax.Item2 < Cy - Half || qmin.Item2 > Cy + Half ||
          qmax.Item3 < Cz - Half || qmin.Item3 > Cz + Half);
}
```
