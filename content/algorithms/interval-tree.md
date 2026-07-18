---
name: 区間木(Interval Tree)
category: データ構造
subcategory: 木構造
complexity: O(log n + k)
summary: 多数の区間の中から指定範囲と重なるものを高速に列挙する。
---

## 概要

「9:00〜10:30の会議室予約」のような多数の「区間」データの集合から、「11:00〜11:30と重なる予約はあるか」といった**重なり判定・重なり列挙**を高速に行うための木構造。カレンダーアプリの空き時間検索、ゲノム解析における遺伝子領域の重なり検出など、「区間」を扱う実務データベースの裏側で活躍する。

## 仕組み

各区間を、その**中点**をキーにした平衡二分探索木(赤黒木など)に格納するのが一般的な構成。各ノードにはさらに、その部分木に含まれる区間の**右端の最大値**などの補助情報を持たせる。

1. 木を構築する際、各区間はその中点の値で通常の二分探索木と同様に配置される
2. 各ノードには「自分を根とする部分木に含まれる全区間の中で、最も右まで伸びている区間の右端の値」を追加で記録しておく
3. ある区間と重なる区間を探すときは、根から探索を始め、補助情報(部分木内の最大右端)を使って「この部分木には重なる可能性のある区間が存在しない」と判定できれば、その部分木を丸ごと探索対象から除外できる

この「部分木ごとに、探索する価値があるかを補助情報だけで先に判定する」という枝刈りが、区間木を効率的にする鍵になっている。

## 特性・トレードオフ

- **計算量**: 構築O(n log n)、ある区間と重なる区間の列挙はO(log n + k)(kは実際に重なる区間の個数)
- **セグメント木との違い**: セグメント木は「配列のインデックス範囲」に対するクエリが得意なのに対し、区間木は「任意の実数値の区間同士の重なり判定」に特化している。用途が異なるため使い分けが必要
- **平衡木がベース**: 区間木自体は特定の平衡木(赤黒木など)の上に補助情報を追加しただけの構造であるため、ベースとなる木の平衡性がそのまま性能に反映される
- **使いどころ**: カレンダー・予約システムの空き時間検索、ゲノム解析における遺伝子領域の重なり検出、コンパイラのレジスタ割り当て(変数の生存区間の重なり判定)、CADソフトウェアにおける図形の衝突判定など

## 実装例

各区間の中点をキーとしたBSTに、部分木内の右端最大値(`maxHigh`)を補助情報として持たせる。重なり検索では、`maxHigh`が問い合わせ区間の下限より小さい部分木を丸ごと枝刈りする。

```python
class IntervalNode:
    __slots__ = ("low", "high", "mid", "max_high", "left", "right")

    def __init__(self, low, high):
        self.low = low
        self.high = high
        self.mid = (low + high) / 2
        self.max_high = high
        self.left = None
        self.right = None


class IntervalTree:
    def __init__(self):
        self.root = None

    def insert(self, low, high):
        self.root = self._insert(self.root, low, high)

    def _insert(self, node, low, high):
        if node is None:
            return IntervalNode(low, high)
        mid = (low + high) / 2
        if mid < node.mid:
            node.left = self._insert(node.left, low, high)
        else:
            node.right = self._insert(node.right, low, high)
        node.max_high = max(node.max_high, high)
        return node

    def search_overlaps(self, low, high) -> list[tuple[int, int]]:
        result = []

        def overlaps(a_low, a_high, b_low, b_high):
            return a_low <= b_high and b_low <= a_high

        def visit(node):
            if node is None:
                return
            if overlaps(node.low, node.high, low, high):
                result.append((node.low, node.high))
            # 部分木の最大右端が問い合わせの下限より小さければ、その部分木は探索不要
            if node.left is not None and node.left.max_high >= low:
                visit(node.left)
            if node.right is not None and node.right.max_high >= low:
                visit(node.right)

        visit(self.root)
        return result
```

```typescript
class IntervalNode {
  low: number;
  high: number;
  mid: number;
  maxHigh: number;
  left: IntervalNode | null = null;
  right: IntervalNode | null = null;
  constructor(low: number, high: number) {
    this.low = low;
    this.high = high;
    this.mid = (low + high) / 2;
    this.maxHigh = high;
  }
}

class IntervalTree {
  root: IntervalNode | null = null;

  insert(low: number, high: number): void {
    this.root = this.insertNode(this.root, low, high);
  }

  private insertNode(node: IntervalNode | null, low: number, high: number): IntervalNode {
    if (node === null) return new IntervalNode(low, high);
    const mid = (low + high) / 2;
    if (mid < node.mid) node.left = this.insertNode(node.left, low, high);
    else node.right = this.insertNode(node.right, low, high);
    node.maxHigh = Math.max(node.maxHigh, high);
    return node;
  }

  searchOverlaps(low: number, high: number): [number, number][] {
    const result: [number, number][] = [];
    const overlaps = (aLow: number, aHigh: number, bLow: number, bHigh: number) =>
      aLow <= bHigh && bLow <= aHigh;

    const visit = (node: IntervalNode | null): void => {
      if (node === null) return;
      if (overlaps(node.low, node.high, low, high)) result.push([node.low, node.high]);
      // 部分木の最大右端が問い合わせの下限より小さければ、その部分木は探索不要
      if (node.left !== null && node.left.maxHigh >= low) visit(node.left);
      if (node.right !== null && node.right.maxHigh >= low) visit(node.right);
    };
    visit(this.root);
    return result;
  }
}
```

```cpp
#include <algorithm>
#include <memory>
#include <utility>
#include <vector>

struct IntervalNode {
    int low, high;
    double mid;
    int maxHigh;
    std::unique_ptr<IntervalNode> left;
    std::unique_ptr<IntervalNode> right;
    IntervalNode(int lo, int hi) : low(lo), high(hi), mid((lo + hi) / 2.0), maxHigh(hi) {}
};

class IntervalTree {
public:
    void insert(int low, int high) {
        root = insertNode(std::move(root), low, high);
    }

    std::vector<std::pair<int, int>> searchOverlaps(int low, int high) const {
        std::vector<std::pair<int, int>> result;
        visit(root.get(), low, high, result);
        return result;
    }

private:
    std::unique_ptr<IntervalNode> root;

    static std::unique_ptr<IntervalNode> insertNode(std::unique_ptr<IntervalNode> node, int low, int high) {
        if (!node) return std::make_unique<IntervalNode>(low, high);
        double mid = (low + high) / 2.0;
        if (mid < node->mid) node->left = insertNode(std::move(node->left), low, high);
        else node->right = insertNode(std::move(node->right), low, high);
        node->maxHigh = std::max(node->maxHigh, high);
        return node;
    }

    static bool overlaps(int aLow, int aHigh, int bLow, int bHigh) {
        return aLow <= bHigh && bLow <= aHigh;
    }

    static void visit(const IntervalNode* node, int low, int high, std::vector<std::pair<int, int>>& result) {
        if (!node) return;
        if (overlaps(node->low, node->high, low, high)) result.emplace_back(node->low, node->high);
        // 部分木の最大右端が問い合わせの下限より小さければ、その部分木は探索不要
        if (node->left && node->left->maxHigh >= low) visit(node->left.get(), low, high, result);
        if (node->right && node->right->maxHigh >= low) visit(node->right.get(), low, high, result);
    }
};
```

```rust
struct IntervalNode {
    low: i32,
    high: i32,
    mid: f64,
    max_high: i32,
    left: Option<Box<IntervalNode>>,
    right: Option<Box<IntervalNode>>,
}

impl IntervalNode {
    fn new(low: i32, high: i32) -> Self {
        IntervalNode {
            low,
            high,
            mid: (low + high) as f64 / 2.0,
            max_high: high,
            left: None,
            right: None,
        }
    }
}

#[derive(Default)]
struct IntervalTree {
    root: Option<Box<IntervalNode>>,
}

impl IntervalTree {
    fn insert(&mut self, low: i32, high: i32) {
        self.root = Self::insert_node(self.root.take(), low, high);
    }

    fn insert_node(node: Option<Box<IntervalNode>>, low: i32, high: i32) -> Option<Box<IntervalNode>> {
        let mut node = match node {
            None => return Some(Box::new(IntervalNode::new(low, high))),
            Some(n) => n,
        };
        let mid = (low + high) as f64 / 2.0;
        if mid < node.mid {
            node.left = Self::insert_node(node.left.take(), low, high);
        } else {
            node.right = Self::insert_node(node.right.take(), low, high);
        }
        node.max_high = node.max_high.max(high);
        Some(node)
    }

    fn search_overlaps(&self, low: i32, high: i32) -> Vec<(i32, i32)> {
        let mut result = Vec::new();
        Self::visit(&self.root, low, high, &mut result);
        result
    }

    fn overlaps(a_low: i32, a_high: i32, b_low: i32, b_high: i32) -> bool {
        a_low <= b_high && b_low <= a_high
    }

    fn visit(node: &Option<Box<IntervalNode>>, low: i32, high: i32, result: &mut Vec<(i32, i32)>) {
        if let Some(n) = node {
            if Self::overlaps(n.low, n.high, low, high) {
                result.push((n.low, n.high));
            }
            // 部分木の最大右端が問い合わせの下限より小さければ、その部分木は探索不要
            if n.left.as_ref().map_or(false, |l| l.max_high >= low) {
                Self::visit(&n.left, low, high, result);
            }
            if n.right.as_ref().map_or(false, |r| r.max_high >= low) {
                Self::visit(&n.right, low, high, result);
            }
        }
    }
}
```

```csharp
class IntervalNode
{
    public int Low, High;
    public double Mid;
    public int MaxHigh;
    public IntervalNode? Left, Right;
    public IntervalNode(int low, int high)
    {
        Low = low; High = high; Mid = (low + high) / 2.0; MaxHigh = high;
    }
}

class IntervalTree
{
    public IntervalNode? Root;

    public void Insert(int low, int high) => Root = InsertNode(Root, low, high);

    static IntervalNode InsertNode(IntervalNode? node, int low, int high)
    {
        if (node == null) return new IntervalNode(low, high);
        double mid = (low + high) / 2.0;
        if (mid < node.Mid) node.Left = InsertNode(node.Left, low, high);
        else node.Right = InsertNode(node.Right, low, high);
        node.MaxHigh = Math.Max(node.MaxHigh, high);
        return node;
    }

    public List<(int, int)> SearchOverlaps(int low, int high)
    {
        var result = new List<(int, int)>();
        bool Overlaps(int aLow, int aHigh, int bLow, int bHigh) => aLow <= bHigh && bLow <= aHigh;

        void Visit(IntervalNode? node)
        {
            if (node == null) return;
            if (Overlaps(node.Low, node.High, low, high)) result.Add((node.Low, node.High));
            // 部分木の最大右端が問い合わせの下限より小さければ、その部分木は探索不要
            if (node.Left != null && node.Left.MaxHigh >= low) Visit(node.Left);
            if (node.Right != null && node.Right.MaxHigh >= low) Visit(node.Right);
        }
        Visit(Root);
        return result;
    }
}
```
