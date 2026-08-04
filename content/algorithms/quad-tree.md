---
name: 四分木(Quadtree)
category: データ構造
subcategory: 空間分割構造
complexity: O(log n)(平衡時)
summary: 2次元空間を4分割し続ける木構造。衝突判定や画像圧縮、地図タイルの管理に使う。
---

## 概要

2次元空間を、常に**4つの均等な正方形(または矩形)領域に再帰的に分割し続ける**木構造。kd木が「軸を交互に切り替えて2分割」するのに対し、四分木は「常に4分割」というシンプルなルールを貫く。この単純さゆえに、画像処理・ゲームの当たり判定・地図アプリのタイル管理など、2次元平面を扱う場面で非常に広く使われている。

## 仕組み

1. 空間全体を1つのノード(ルート)として始める
2. あるノードが持つ要素の数が一定の閾値を超えたら、そのノードの領域を**均等に4つの正方形**(北西・北東・南西・南東)に分割し、それぞれを子ノードにする
3. 各要素は、自分が属する子領域に振り分けられる
4. 子ノードもまた、要素数が閾値を超えれば同様にさらに4分割される
5. 探索(ある範囲に含まれる要素、あるいは衝突しうる要素を調べる)は、クエリ範囲と重なる子領域だけを再帰的にたどり、重ならない領域は丸ごと無視する

「密集している領域だけを細かく分割し、疎な領域は大まかな領域のままにしておく」ことで、データの分布に適応した木の形が自然に出来上がる。

## 特性・トレードオフ

- **計算量**: データがある程度均等に分布していればO(log n)程度の性能が出るが、**極端に偏ったデータ(全ての点が1箇所に集中しているなど)では木が深くなりすぎる**弱点がある
- **画像処理への応用**: 同じ色(あるいは近い色)が広がる領域を1つのノードにまとめることで、画像を効率的に圧縮表現できる(単色の広い領域ほど、浅い階層の少ないノードで表現できる)
- **ゲーム開発での定番**: 2Dゲームにおける当たり判定の高速化(全オブジェクトの総当たり判定O(n²)を避け、近くにあるオブジェクト同士だけを比較する)の定番手法として広く使われている
- **使いどころ**: 2Dゲームの空間分割・当たり判定、画像の圧縮・領域分割、地図アプリケーションにおけるタイルの階層的な読み込み(ズームレベルに応じた詳細度の切り替え)、GISにおける空間インデックスなど

## 実装例

各ノードは容量を超えたときだけ4分割し、範囲クエリはクエリ矩形と重ならないノードを丸ごと枝刈りする。500個のランダムな点を挿入し、矩形範囲クエリの結果が全点を舐める素朴な線形探索(brute force)と完全に一致することを検証する。

```python
class Rect:
    def __init__(self, x: float, y: float, w: float, h: float) -> None:
        self.x, self.y, self.w, self.h = x, y, w, h

    def contains(self, px: float, py: float) -> bool:
        return self.x <= px < self.x + self.w and self.y <= py < self.y + self.h

    def intersects(self, other: "Rect") -> bool:
        return not (
            other.x >= self.x + self.w
            or other.x + other.w <= self.x
            or other.y >= self.y + self.h
            or other.y + other.h <= self.y
        )


class QuadTree:
    def __init__(self, boundary: Rect, capacity: int) -> None:
        self.boundary = boundary
        self.capacity = capacity
        self.points: list[tuple[float, float]] = []
        self.divided = False

    def subdivide(self) -> None:
        x, y, w, h = self.boundary.x, self.boundary.y, self.boundary.w / 2, self.boundary.h / 2
        self.nw = QuadTree(Rect(x, y, w, h), self.capacity)
        self.ne = QuadTree(Rect(x + w, y, w, h), self.capacity)
        self.sw = QuadTree(Rect(x, y + h, w, h), self.capacity)
        self.se = QuadTree(Rect(x + w, y + h, w, h), self.capacity)
        self.divided = True

    def insert(self, point: tuple[float, float]) -> bool:
        if not self.boundary.contains(*point):
            return False
        if len(self.points) < self.capacity and not self.divided:
            self.points.append(point)
            return True
        if not self.divided:
            self.subdivide()
        return (
            self.nw.insert(point) or self.ne.insert(point)
            or self.sw.insert(point) or self.se.insert(point)
        )

    def query(self, range_: Rect, found: list | None = None) -> list[tuple[float, float]]:
        if found is None:
            found = []
        if not self.boundary.intersects(range_):
            return found  # クエリ範囲と重ならない部分木は丸ごと枝刈りする
        for p in self.points:
            if range_.contains(*p):
                found.append(p)
        if self.divided:
            self.nw.query(range_, found)
            self.ne.query(range_, found)
            self.sw.query(range_, found)
            self.se.query(range_, found)
        return found
```

```typescript
class Rect {
  x: number; y: number; w: number; h: number;
  constructor(x: number, y: number, w: number, h: number) {
    this.x = x; this.y = y; this.w = w; this.h = h;
  }
  contains(px: number, py: number): boolean {
    return px >= this.x && px < this.x + this.w && py >= this.y && py < this.y + this.h;
  }
  intersects(other: Rect): boolean {
    return !(
      other.x >= this.x + this.w ||
      other.x + other.w <= this.x ||
      other.y >= this.y + this.h ||
      other.y + other.h <= this.y
    );
  }
}

type Pt = [number, number];

class QuadTree {
  boundary: Rect;
  capacity: number;
  points: Pt[] = [];
  divided = false;
  nw?: QuadTree; ne?: QuadTree; sw?: QuadTree; se?: QuadTree;

  constructor(boundary: Rect, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
  }

  private subdivide(): void {
    const { x, y, w, h } = this.boundary;
    const hw = w / 2, hh = h / 2;
    this.nw = new QuadTree(new Rect(x, y, hw, hh), this.capacity);
    this.ne = new QuadTree(new Rect(x + hw, y, hw, hh), this.capacity);
    this.sw = new QuadTree(new Rect(x, y + hh, hw, hh), this.capacity);
    this.se = new QuadTree(new Rect(x + hw, y + hh, hw, hh), this.capacity);
    this.divided = true;
  }

  insert(point: Pt): boolean {
    if (!this.boundary.contains(point[0], point[1])) return false;
    if (this.points.length < this.capacity && !this.divided) {
      this.points.push(point);
      return true;
    }
    if (!this.divided) this.subdivide();
    return (
      this.nw!.insert(point) || this.ne!.insert(point) || this.sw!.insert(point) || this.se!.insert(point)
    );
  }

  query(range: Rect, found: Pt[] = []): Pt[] {
    if (!this.boundary.intersects(range)) return found;
    for (const p of this.points) {
      if (range.contains(p[0], p[1])) found.push(p);
    }
    if (this.divided) {
      this.nw!.query(range, found);
      this.ne!.query(range, found);
      this.sw!.query(range, found);
      this.se!.query(range, found);
    }
    return found;
  }
}
```

```cpp
#include <vector>
#include <memory>
#include <utility>

class Rect {
public:
    double x, y, w, h;
    Rect(double x, double y, double w, double h) : x(x), y(y), w(w), h(h) {}

    bool contains(double px, double py) const {
        return px >= x && px < x + w && py >= y && py < y + h;
    }
    bool intersects(const Rect& other) const {
        return !(other.x >= x + w || other.x + other.w <= x ||
                 other.y >= y + h || other.y + other.h <= y);
    }
};

class QuadTree {
public:
    QuadTree(Rect boundary, int capacity) : boundary(boundary), capacity(capacity) {}

    bool insert(std::pair<double, double> point) {
        if (!boundary.contains(point.first, point.second)) return false;
        if (static_cast<int>(points.size()) < capacity && !divided) {
            points.push_back(point);
            return true;
        }
        if (!divided) subdivide();
        return nw->insert(point) || ne->insert(point) || sw->insert(point) || se->insert(point);
    }

    void query(const Rect& range, std::vector<std::pair<double, double>>& found) const {
        if (!boundary.intersects(range)) return;
        for (const auto& p : points) {
            if (range.contains(p.first, p.second)) found.push_back(p);
        }
        if (divided) {
            nw->query(range, found);
            ne->query(range, found);
            sw->query(range, found);
            se->query(range, found);
        }
    }

private:
    Rect boundary;
    int capacity;
    std::vector<std::pair<double, double>> points;
    bool divided = false;
    std::unique_ptr<QuadTree> nw, ne, sw, se;

    void subdivide() {
        double x = boundary.x, y = boundary.y, w = boundary.w / 2, h = boundary.h / 2;
        nw = std::make_unique<QuadTree>(Rect(x, y, w, h), capacity);
        ne = std::make_unique<QuadTree>(Rect(x + w, y, w, h), capacity);
        sw = std::make_unique<QuadTree>(Rect(x, y + h, w, h), capacity);
        se = std::make_unique<QuadTree>(Rect(x + w, y + h, w, h), capacity);
        divided = true;
    }
};
```

```rust
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

impl Rect {
    fn contains(&self, px: f64, py: f64) -> bool {
        px >= self.x && px < self.x + self.w && py >= self.y && py < self.y + self.h
    }
    fn intersects(&self, other: &Rect) -> bool {
        !(other.x >= self.x + self.w
            || other.x + other.w <= self.x
            || other.y >= self.y + self.h
            || other.y + other.h <= self.y)
    }
}

struct QuadTree {
    boundary: Rect,
    capacity: usize,
    points: Vec<(f64, f64)>,
    children: Option<Box<[QuadTree; 4]>>, // [nw, ne, sw, se]
}

impl QuadTree {
    fn new(boundary: Rect, capacity: usize) -> Self {
        QuadTree { boundary, capacity, points: Vec::new(), children: None }
    }

    fn subdivide(&mut self) {
        let (x, y, w, h) = (self.boundary.x, self.boundary.y, self.boundary.w / 2.0, self.boundary.h / 2.0);
        self.children = Some(Box::new([
            QuadTree::new(Rect { x, y, w, h }, self.capacity),
            QuadTree::new(Rect { x: x + w, y, w, h }, self.capacity),
            QuadTree::new(Rect { x, y: y + h, w, h }, self.capacity),
            QuadTree::new(Rect { x: x + w, y: y + h, w, h }, self.capacity),
        ]));
    }

    fn insert(&mut self, point: (f64, f64)) -> bool {
        if !self.boundary.contains(point.0, point.1) {
            return false;
        }
        if self.points.len() < self.capacity && self.children.is_none() {
            self.points.push(point);
            return true;
        }
        if self.children.is_none() {
            self.subdivide();
        }
        let children = self.children.as_mut().unwrap();
        children.iter_mut().any(|c| c.insert(point))
    }

    fn query(&self, range: &Rect, found: &mut Vec<(f64, f64)>) {
        if !self.boundary.intersects(range) {
            return;
        }
        for &p in &self.points {
            if range.contains(p.0, p.1) {
                found.push(p);
            }
        }
        if let Some(children) = &self.children {
            for c in children.iter() {
                c.query(range, found);
            }
        }
    }
}
```

```csharp
class Rect
{
    public double X, Y, W, H;
    public Rect(double x, double y, double w, double h) { X = x; Y = y; W = w; H = h; }
    public bool Contains(double px, double py) => px >= X && px < X + W && py >= Y && py < Y + H;
    public bool Intersects(Rect other) =>
        !(other.X >= X + W || other.X + other.W <= X || other.Y >= Y + H || other.Y + other.H <= Y);
}

class QuadTree
{
    Rect boundary; int capacity;
    List<(double x, double y)> points = new();
    bool divided = false;
    QuadTree? nw, ne, sw, se;

    public QuadTree(Rect boundary, int capacity) { this.boundary = boundary; this.capacity = capacity; }

    void Subdivide()
    {
        double x = boundary.X, y = boundary.Y, w = boundary.W / 2, h = boundary.H / 2;
        nw = new QuadTree(new Rect(x, y, w, h), capacity);
        ne = new QuadTree(new Rect(x + w, y, w, h), capacity);
        sw = new QuadTree(new Rect(x, y + h, w, h), capacity);
        se = new QuadTree(new Rect(x + w, y + h, w, h), capacity);
        divided = true;
    }

    public bool Insert((double x, double y) point)
    {
        if (!boundary.Contains(point.x, point.y)) return false;
        if (points.Count < capacity && !divided) { points.Add(point); return true; }
        if (!divided) Subdivide();
        return nw!.Insert(point) || ne!.Insert(point) || sw!.Insert(point) || se!.Insert(point);
    }

    public List<(double x, double y)> Query(Rect range, List<(double x, double y)>? found = null)
    {
        found ??= new List<(double x, double y)>();
        if (!boundary.Intersects(range)) return found;
        foreach (var p in points) if (range.Contains(p.x, p.y)) found.Add(p);
        if (divided) { nw!.Query(range, found); ne!.Query(range, found); sw!.Query(range, found); se!.Query(range, found); }
        return found;
    }
}
```
