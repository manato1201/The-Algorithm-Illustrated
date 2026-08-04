---
name: R木
category: データ構造
subcategory: 空間分割構造
complexity: O(log n)(理想的なケース、最悪はO(n))
summary: 点ではなく矩形(バウンディングボックス)を階層的に包含関係で束ねていくことで、地図データやGISのような矩形・領域オブジェクトの空間検索を効率化する木構造。
---

## 概要

[kd-tree](/algorithms/kd-tree)や[quad-tree](/algorithms/quad-tree)は主に「点」の集合を効率的に扱う空間分割構造だが、地図上の建物・道路区間・国境線のような、それ自体が面積や広がりを持つ「矩形・領域オブジェクト」を扱うには不向きである。1984年にアントニン・グットマンが発表したR木(R-tree)は、各オブジェクトを囲む最小矩形(バウンディングボックス)を階層的にグループ化し、「この矩形の中に、あの矩形たちが全て収まっている」という包含関係の木を構築することで、GIS(地理情報システム)や空間データベースにおける「この範囲に含まれる全ての建物を教えて」といった空間検索を効率的に処理する。

## 仕組み

1. 各葉ノードには、実際のデータオブジェクト(またはそのIDと矩形)が複数個(`m`個から`M`個の範囲、`B木`と同様の下限・上限)格納される
2. 各内部ノードは、その子ノード(または子の矩形群)全てを囲む最小の矩形(MBR: Minimum Bounding Rectangle)を自身の代表矩形として持つ
3. **検索**(ある範囲と重なる全オブジェクトを探す): 根から、クエリ矩形と自分の代表矩形が重なる子ノードだけを再帰的に辿っていく。重ならない子ノード配下は、その中の全オブジェクトが確実にクエリ範囲外であることが保証されるため、探索をまるごと省略できる
4. **挿入**: 新しいオブジェクトの矩形を、既存の各ノードの代表矩形との「拡張が最小で済む」ノードへ、[B木](/algorithms/b-tree)と同様に葉まで降りて追加する。ノードの子の数が上限`M`を超えたら、[B木](/algorithms/b-tree)の分割に相当する「ノード分割」を行うが、どの矩形の組み合わせで分割すれば全体として矩形の重なりや無駄な広がりが最小になるかを考える必要があり、この分割戦略の工夫がR木の性能を大きく左右する

## 特性・トレードオフ

- **計算量**: 理想的な(矩形同士の重なりが少ない)分布では`O(log n)`だが、矩形が互いに大きく重なり合うような分布では、複数の子ノードを同時に辿らざるを得ず、最悪`O(n)`まで悪化することがある——[kd-tree](/algorithms/kd-tree)が空間を明確に分割するのに対し、R木の矩形同士は重なりを許すため、この重なりの管理が性能の鍵になる
- **矩形の重なりを減らす工夫**: 分割時に矩形の重なりや余白を最小化するR*-treeのような改良版が実務では広く使われており、素のR木よりも安定した性能を発揮する
- **[quad-tree](/algorithms/quad-tree)との使い分け**: [quad-tree](/algorithms/quad-tree)は空間全体をあらかじめ規則的に分割するのに対し、R木はデータの実際の分布に応じてボトムアップに矩形をグループ化する——不均一に分布したデータ(都市部に建物が密集し郊外はまばら、など)にはR木の方が適応的に対応しやすい
- **使いどころ**: 地図・GISアプリケーションにおける空間検索(「この地図の表示範囲に含まれる全ての店舗」等)、空間データベース(PostGIS等)のインデックス、コンピュータグラフィックスにおける衝突判定の高速化(バウンディングボックス階層)

## 実装例

```python
Rect = tuple[float, float, float, float]  # xmin, ymin, xmax, ymax
MAX_ENTRIES = 4


def union(a: Rect, b: Rect) -> Rect:
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def area(r: Rect) -> float:
    return max(0.0, r[2] - r[0]) * max(0.0, r[3] - r[1])


def enlargement(r: Rect, new: Rect) -> float:
    return area(union(r, new)) - area(r)


def intersects(a: Rect, b: Rect) -> bool:
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])


class RNode:
    def __init__(self, leaf: bool, entries=None):
        self.leaf = leaf
        self.entries = entries if entries is not None else []  # (rect, id|RNode)

    def mbr(self) -> Rect:
        rects = [e[0] for e in self.entries]
        r = rects[0]
        for rr in rects[1:]:
            r = union(r, rr)
        return r


def split(entries):
    # quadratic split: seed with the pair that wastes the most area if grouped together
    worst, seed_a, seed_b = -1.0, 0, 0
    for i in range(len(entries)):
        for j in range(i + 1, len(entries)):
            d = area(union(entries[i][0], entries[j][0]))
            if d > worst:
                worst, seed_a, seed_b = d, i, j
    group_a, group_b = [entries[seed_a]], [entries[seed_b]]
    rect_a, rect_b = entries[seed_a][0], entries[seed_b][0]
    for k, entry in enumerate(entries):
        if k in (seed_a, seed_b):
            continue
        if enlargement(rect_a, entry[0]) < enlargement(rect_b, entry[0]):
            group_a.append(entry)
            rect_a = union(rect_a, entry[0])
        else:
            group_b.append(entry)
            rect_b = union(rect_b, entry[0])
    return group_a, group_b


class RTree:
    def __init__(self, max_entries: int = MAX_ENTRIES):
        self.max_entries = max_entries
        self.root = RNode(leaf=True)

    def insert(self, rect: Rect, obj_id: int) -> None:
        results = self._insert(self.root, rect, obj_id)
        if len(results) == 1:
            self.root = results[0]
        else:
            self.root = RNode(leaf=False, entries=[(n.mbr(), n) for n in results])

    def _insert(self, node: RNode, rect: Rect, obj_id: int) -> list[RNode]:
        if node.leaf:
            node.entries.append((rect, obj_id))
        else:
            best = min(range(len(node.entries)),
                       key=lambda i: (enlargement(node.entries[i][0], rect), area(node.entries[i][0])))
            child_rect, child = node.entries[best]
            children = self._insert(child, rect, obj_id)
            node.entries[best] = (children[0].mbr(), children[0])
            if len(children) > 1:
                node.entries.append((children[1].mbr(), children[1]))
        if len(node.entries) <= self.max_entries:
            return [node]
        group_a, group_b = split(node.entries)
        return [RNode(node.leaf, group_a), RNode(node.leaf, group_b)]

    def search(self, query_rect: Rect) -> list[int]:
        found: list[int] = []
        self._search(self.root, query_rect, found)
        return found

    def _search(self, node: RNode, query_rect: Rect, found: list[int]) -> None:
        for rect, payload in node.entries:
            if intersects(rect, query_rect):
                if node.leaf:
                    found.append(payload)
                else:
                    self._search(payload, query_rect, found)
```

```typescript
type Rect = [number, number, number, number]; // xmin, ymin, xmax, ymax

function union(a: Rect, b: Rect): Rect {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}
function area(r: Rect): number {
  return Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]);
}
function enlargement(r: Rect, add: Rect): number {
  return area(union(r, add)) - area(r);
}
function intersects(a: Rect, b: Rect): boolean {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}

type Entry = [Rect, RNode | number];

class RNode {
  leaf: boolean;
  entries: Entry[];
  constructor(leaf: boolean, entries: Entry[] = []) {
    this.leaf = leaf;
    this.entries = entries;
  }
  mbr(): Rect {
    return this.entries.slice(1).reduce((acc, e) => union(acc, e[0]), this.entries[0][0]);
  }
}

function split(entries: Entry[]): [Entry[], Entry[]] {
  let worst = -1, seedA = 0, seedB = 0;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const d = area(union(entries[i][0], entries[j][0]));
      if (d > worst) { worst = d; seedA = i; seedB = j; }
    }
  }
  const groupA: Entry[] = [entries[seedA]];
  const groupB: Entry[] = [entries[seedB]];
  let rectA = entries[seedA][0];
  let rectB = entries[seedB][0];
  entries.forEach((entry, k) => {
    if (k === seedA || k === seedB) return;
    if (enlargement(rectA, entry[0]) < enlargement(rectB, entry[0])) {
      groupA.push(entry); rectA = union(rectA, entry[0]);
    } else {
      groupB.push(entry); rectB = union(rectB, entry[0]);
    }
  });
  return [groupA, groupB];
}

class RTree {
  maxEntries: number;
  root: RNode;
  constructor(maxEntries = 4) {
    this.maxEntries = maxEntries;
    this.root = new RNode(true);
  }
  insert(rect: Rect, id: number) {
    const results = this.insertRec(this.root, rect, id);
    this.root = results.length === 1
      ? results[0]
      : new RNode(false, results.map((n) => [n.mbr(), n] as Entry));
  }
  private insertRec(node: RNode, rect: Rect, id: number): RNode[] {
    if (node.leaf) {
      node.entries.push([rect, id]);
    } else {
      let bestIdx = 0, bestScore = Infinity;
      node.entries.forEach((e, i) => {
        const score = enlargement(e[0], rect);
        if (score < bestScore) { bestScore = score; bestIdx = i; }
      });
      const child = node.entries[bestIdx][1] as RNode;
      const children = this.insertRec(child, rect, id);
      node.entries[bestIdx] = [children[0].mbr(), children[0]];
      if (children.length > 1) node.entries.push([children[1].mbr(), children[1]]);
    }
    if (node.entries.length <= this.maxEntries) return [node];
    const [groupA, groupB] = split(node.entries);
    return [new RNode(node.leaf, groupA), new RNode(node.leaf, groupB)];
  }
  search(query: Rect): number[] {
    const found: number[] = [];
    this.searchRec(this.root, query, found);
    return found;
  }
  private searchRec(node: RNode, query: Rect, found: number[]) {
    for (const [rect, payload] of node.entries) {
      if (intersects(rect, query)) {
        if (node.leaf) found.push(payload as number);
        else this.searchRec(payload as RNode, query, found);
      }
    }
  }
}
```

```cpp
#include <vector>
#include <variant>
#include <algorithm>
#include <memory>

struct Rect { double xmin, ymin, xmax, ymax; };

Rect rectUnion(const Rect& a, const Rect& b) {
    return { std::min(a.xmin, b.xmin), std::min(a.ymin, b.ymin), std::max(a.xmax, b.xmax), std::max(a.ymax, b.ymax) };
}
double area(const Rect& r) {
    return std::max(0.0, r.xmax - r.xmin) * std::max(0.0, r.ymax - r.ymin);
}
double enlargement(const Rect& r, const Rect& add) { return area(rectUnion(r, add)) - area(r); }
bool intersects(const Rect& a, const Rect& b) {
    return !(a.xmax < b.xmin || b.xmax < a.xmin || a.ymax < b.ymin || b.ymax < a.ymin);
}

struct RNode;
using Payload = std::variant<int, std::shared_ptr<RNode>>;

struct RNode {
    bool leaf;
    std::vector<std::pair<Rect, Payload>> entries;
    explicit RNode(bool isLeaf) : leaf(isLeaf) {}
    Rect mbr() const {
        Rect r = entries[0].first;
        for (size_t i = 1; i < entries.size(); i++) r = rectUnion(r, entries[i].first);
        return r;
    }
};

std::pair<std::vector<std::pair<Rect, Payload>>, std::vector<std::pair<Rect, Payload>>>
splitEntries(const std::vector<std::pair<Rect, Payload>>& entries) {
    double worst = -1;
    size_t seedA = 0, seedB = 0;
    for (size_t i = 0; i < entries.size(); i++) {
        for (size_t j = i + 1; j < entries.size(); j++) {
            double d = area(rectUnion(entries[i].first, entries[j].first));
            if (d > worst) { worst = d; seedA = i; seedB = j; }
        }
    }
    std::vector<std::pair<Rect, Payload>> groupA{ entries[seedA] }, groupB{ entries[seedB] };
    Rect rectA = entries[seedA].first, rectB = entries[seedB].first;
    for (size_t k = 0; k < entries.size(); k++) {
        if (k == seedA || k == seedB) continue;
        if (enlargement(rectA, entries[k].first) < enlargement(rectB, entries[k].first)) {
            groupA.push_back(entries[k]); rectA = rectUnion(rectA, entries[k].first);
        } else {
            groupB.push_back(entries[k]); rectB = rectUnion(rectB, entries[k].first);
        }
    }
    return { groupA, groupB };
}

class RTree {
public:
    explicit RTree(int maxEntries = 4) : maxEntries_(maxEntries), root_(std::make_shared<RNode>(true)) {}

    void insert(const Rect& rect, int id) {
        auto results = insertRec(root_, rect, id);
        if (results.size() == 1) {
            root_ = results[0];
        } else {
            auto newRoot = std::make_shared<RNode>(false);
            for (auto& n : results) newRoot->entries.push_back({ n->mbr(), n });
            root_ = newRoot;
        }
    }

    std::vector<int> search(const Rect& query) const {
        std::vector<int> found;
        searchRec(root_, query, found);
        return found;
    }

private:
    int maxEntries_;
    std::shared_ptr<RNode> root_;

    std::vector<std::shared_ptr<RNode>> insertRec(std::shared_ptr<RNode> node, const Rect& rect, int id) {
        if (node->leaf) {
            node->entries.push_back({ rect, id });
        } else {
            size_t bestIdx = 0;
            double bestScore = 1e300;
            for (size_t i = 0; i < node->entries.size(); i++) {
                double score = enlargement(node->entries[i].first, rect);
                if (score < bestScore) { bestScore = score; bestIdx = i; }
            }
            auto child = std::get<std::shared_ptr<RNode>>(node->entries[bestIdx].second);
            auto children = insertRec(child, rect, id);
            node->entries[bestIdx] = { children[0]->mbr(), children[0] };
            if (children.size() > 1) node->entries.push_back({ children[1]->mbr(), children[1] });
        }
        if (node->entries.size() <= static_cast<size_t>(maxEntries_)) return { node };
        auto [groupA, groupB] = splitEntries(node->entries);
        auto nodeA = std::make_shared<RNode>(node->leaf);
        auto nodeB = std::make_shared<RNode>(node->leaf);
        nodeA->entries = groupA;
        nodeB->entries = groupB;
        return { nodeA, nodeB };
    }

    void searchRec(const std::shared_ptr<RNode>& node, const Rect& query, std::vector<int>& found) const {
        for (auto& [rect, payload] : node->entries) {
            if (intersects(rect, query)) {
                if (node->leaf) found.push_back(std::get<int>(payload));
                else searchRec(std::get<std::shared_ptr<RNode>>(payload), query, found);
            }
        }
    }
};
```

```rust
#[derive(Clone, Copy)]
struct Rect { xmin: f64, ymin: f64, xmax: f64, ymax: f64 }

fn union(a: Rect, b: Rect) -> Rect {
    Rect {
        xmin: a.xmin.min(b.xmin), ymin: a.ymin.min(b.ymin),
        xmax: a.xmax.max(b.xmax), ymax: a.ymax.max(b.ymax),
    }
}
fn area(r: Rect) -> f64 { (r.xmax - r.xmin).max(0.0) * (r.ymax - r.ymin).max(0.0) }
fn enlargement(r: Rect, add: Rect) -> f64 { area(union(r, add)) - area(r) }
fn intersects(a: Rect, b: Rect) -> bool {
    !(a.xmax < b.xmin || b.xmax < a.xmin || a.ymax < b.ymin || b.ymax < a.ymin)
}

enum Payload { Leaf(i32), Child(Box<RNode>) }

struct RNode {
    leaf: bool,
    entries: Vec<(Rect, Payload)>,
}

impl RNode {
    fn mbr(&self) -> Rect {
        let mut r = self.entries[0].0;
        for e in &self.entries[1..] {
            r = union(r, e.0);
        }
        r
    }
}

fn split(entries: Vec<(Rect, Payload)>) -> (Vec<(Rect, Payload)>, Vec<(Rect, Payload)>) {
    let mut worst = -1.0;
    let (mut seed_a, mut seed_b) = (0, 0);
    for i in 0..entries.len() {
        for j in (i + 1)..entries.len() {
            let d = area(union(entries[i].0, entries[j].0));
            if d > worst { worst = d; seed_a = i; seed_b = j; }
        }
    }
    let mut rect_a = entries[seed_a].0;
    let mut rect_b = entries[seed_b].0;
    let mut group_a = Vec::new();
    let mut group_b = Vec::new();
    for (k, entry) in entries.into_iter().enumerate() {
        if k == seed_a { group_a.push(entry); continue; }
        if k == seed_b { group_b.push(entry); continue; }
        if enlargement(rect_a, entry.0) < enlargement(rect_b, entry.0) {
            rect_a = union(rect_a, entry.0);
            group_a.push(entry);
        } else {
            rect_b = union(rect_b, entry.0);
            group_b.push(entry);
        }
    }
    (group_a, group_b)
}

struct RTree { max_entries: usize, root: RNode }

impl RTree {
    fn new(max_entries: usize) -> Self {
        RTree { max_entries, root: RNode { leaf: true, entries: Vec::new() } }
    }

    fn insert(&mut self, rect: Rect, id: i32) {
        let dummy = RNode { leaf: true, entries: Vec::new() };
        let old_root = std::mem::replace(&mut self.root, dummy);
        let results = Self::insert_rec(old_root, rect, id, self.max_entries);
        self.root = if results.len() == 1 {
            results.into_iter().next().unwrap()
        } else {
            let entries = results.into_iter().map(|n| (n.mbr(), Payload::Child(Box::new(n)))).collect();
            RNode { leaf: false, entries }
        };
    }

    fn insert_rec(mut node: RNode, rect: Rect, id: i32, max_entries: usize) -> Vec<RNode> {
        if node.leaf {
            node.entries.push((rect, Payload::Leaf(id)));
        } else {
            let mut best_idx = 0;
            let mut best_score = f64::MAX;
            for (i, (r, _)) in node.entries.iter().enumerate() {
                let score = enlargement(*r, rect);
                if score < best_score { best_score = score; best_idx = i; }
            }
            let (_, payload) = node.entries.remove(best_idx);
            let child = match payload { Payload::Child(c) => *c, _ => unreachable!() };
            let mut children = Self::insert_rec(child, rect, id, max_entries);
            let second = if children.len() > 1 { Some(children.pop().unwrap()) } else { None };
            let first = children.pop().unwrap();
            node.entries.insert(best_idx, (first.mbr(), Payload::Child(Box::new(first))));
            if let Some(second_node) = second {
                node.entries.push((second_node.mbr(), Payload::Child(Box::new(second_node))));
            }
        }
        if node.entries.len() <= max_entries {
            return vec![node];
        }
        let (group_a, group_b) = split(node.entries);
        vec![RNode { leaf: node.leaf, entries: group_a }, RNode { leaf: node.leaf, entries: group_b }]
    }

    fn search(&self, query: Rect) -> Vec<i32> {
        let mut found = Vec::new();
        Self::search_rec(&self.root, query, &mut found);
        found
    }
    fn search_rec(node: &RNode, query: Rect, found: &mut Vec<i32>) {
        for (rect, payload) in &node.entries {
            if intersects(*rect, query) {
                match payload {
                    Payload::Leaf(id) => found.push(*id),
                    Payload::Child(child) => Self::search_rec(child, query, found),
                }
            }
        }
    }
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

record Rect(double XMin, double YMin, double XMax, double YMax);

static class RTreeGeo
{
    public static Rect Union(Rect a, Rect b) =>
        new(Math.Min(a.XMin, b.XMin), Math.Min(a.YMin, b.YMin), Math.Max(a.XMax, b.XMax), Math.Max(a.YMax, b.YMax));
    public static double Area(Rect r) => Math.Max(0, r.XMax - r.XMin) * Math.Max(0, r.YMax - r.YMin);
    public static double Enlargement(Rect r, Rect add) => Area(Union(r, add)) - Area(r);
    public static bool Intersects(Rect a, Rect b) =>
        !(a.XMax < b.XMin || b.XMax < a.XMin || a.YMax < b.YMin || b.YMax < a.YMin);
}

class RNode
{
    public bool Leaf;
    public List<(Rect Rect, object Payload)> Entries = new();
    public RNode(bool leaf) { Leaf = leaf; }
    public Rect Mbr()
    {
        var r = Entries[0].Rect;
        for (int i = 1; i < Entries.Count; i++) r = RTreeGeo.Union(r, Entries[i].Rect);
        return r;
    }
}

class RTree
{
    readonly int maxEntries;
    public RNode Root;
    public RTree(int maxEntries = 4) { this.maxEntries = maxEntries; Root = new RNode(true); }

    public void Insert(Rect rect, int id)
    {
        var results = InsertRec(Root, rect, id);
        if (results.Count == 1) { Root = results[0]; return; }
        var newRoot = new RNode(false);
        foreach (var n in results) newRoot.Entries.Add((n.Mbr(), n));
        Root = newRoot;
    }

    List<RNode> InsertRec(RNode node, Rect rect, int id)
    {
        if (node.Leaf)
        {
            node.Entries.Add((rect, id));
        }
        else
        {
            int bestIdx = 0;
            double bestScore = double.MaxValue;
            for (int i = 0; i < node.Entries.Count; i++)
            {
                double score = RTreeGeo.Enlargement(node.Entries[i].Rect, rect);
                if (score < bestScore) { bestScore = score; bestIdx = i; }
            }
            var child = (RNode)node.Entries[bestIdx].Payload;
            var children = InsertRec(child, rect, id);
            node.Entries[bestIdx] = (children[0].Mbr(), children[0]);
            if (children.Count > 1) node.Entries.Add((children[1].Mbr(), children[1]));
        }
        if (node.Entries.Count <= maxEntries) return new List<RNode> { node };
        return Split(node);
    }

    List<RNode> Split(RNode node)
    {
        var entries = node.Entries;
        double worst = -1;
        int seedA = 0, seedB = 0;
        for (int i = 0; i < entries.Count; i++)
            for (int j = i + 1; j < entries.Count; j++)
            {
                double d = RTreeGeo.Area(RTreeGeo.Union(entries[i].Rect, entries[j].Rect));
                if (d > worst) { worst = d; seedA = i; seedB = j; }
            }
        var groupA = new RNode(node.Leaf);
        var groupB = new RNode(node.Leaf);
        groupA.Entries.Add(entries[seedA]);
        groupB.Entries.Add(entries[seedB]);
        var rectA = entries[seedA].Rect;
        var rectB = entries[seedB].Rect;
        for (int k = 0; k < entries.Count; k++)
        {
            if (k == seedA || k == seedB) continue;
            if (RTreeGeo.Enlargement(rectA, entries[k].Rect) < RTreeGeo.Enlargement(rectB, entries[k].Rect))
            { groupA.Entries.Add(entries[k]); rectA = RTreeGeo.Union(rectA, entries[k].Rect); }
            else
            { groupB.Entries.Add(entries[k]); rectB = RTreeGeo.Union(rectB, entries[k].Rect); }
        }
        return new List<RNode> { groupA, groupB };
    }

    public List<int> Search(Rect query)
    {
        var found = new List<int>();
        SearchRec(Root, query, found);
        return found;
    }
    void SearchRec(RNode node, Rect query, List<int> found)
    {
        foreach (var (rect, payload) in node.Entries)
        {
            if (RTreeGeo.Intersects(rect, query))
            {
                if (node.Leaf) found.Add((int)payload);
                else SearchRec((RNode)payload, query, found);
            }
        }
    }
}
```
