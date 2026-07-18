---
name: トリープ(Treap)
category: データ構造
subcategory: 木構造
complexity: O(log n)(期待値)
summary: 各ノードにランダムな優先度を持たせ、二分探索木の順序とヒープの優先度を同時に満たすことで平衡を確率的に保証する。
---

## 概要

「Tree(木)」と「Heap(ヒープ)」を組み合わせた名前が示す通り、二分探索木としての性質(キーの順序)と、ヒープとしての性質(優先度)を**同時に**満たす木構造。各ノードにキーとは別にランダムな優先度を割り当てることで、赤黒木やAVL木のような明示的な回転ルールを持たずとも、統計的に平衡した木がほぼ自動的に出来上がる、という発想の面白さが魅力。

## 仕組み

各ノードは「キー」と「ランダムに割り当てられた優先度」の2つの値を持つ。

1. **キーに関して**は通常の二分探索木と同じ順序を保つ(左は小さく、右は大きく)
2. **優先度に関して**は、親は必ず子より優先度が高い、というヒープの性質を保つ
3. 新しい要素を挿入するときは、まず通常の二分探索木として挿入し、その後、優先度のルールが破れていれば**回転**で修復する(自分の優先度が親より高ければ、親と位置を入れ替える回転を繰り返す)

優先度をランダムに割り当てるということは、「その要素がどの順番で挿入されても、木の形は"ランダムな順序で挿入したときの二分探索木"と統計的に同じになる」ことを意味する。ランダムな順序での挿入は、平均的には木の高さがO(log n)になることが知られているため、これがトリープの平衡の理論的根拠になっている。

## 特性・トレードオフ

- **計算量**: 期待値でO(log n)。赤黒木・AVL木のような最悪ケースの厳密な保証はないが、実用上は十分高速
- **実装のシンプルさ**: 「優先度が壊れていたら回転する」というルールだけで実装でき、赤黒木の色のルールやAVL木の平衡係数のような複雑な場合分けが不要
- **分割・併合が得意**: キーの範囲でトリープを2つに分割する(split)、2つのトリープを1つに結合する(merge)操作が比較的単純に実装できるため、これらの操作が頻繁に必要な場面で好まれる
- **使いどころ**: 競技プログラミングにおける平衡二分探索木の実装(実装の速さと十分な性能のバランスが良い)、分割・併合を多用するデータ構造(永続的なデータ構造の実装など)

## 実装例

```python
import random


class TreapNode:
    __slots__ = ("key", "priority", "left", "right")

    def __init__(self, key, priority):
        self.key = key
        self.priority = priority
        self.left = None
        self.right = None


class Treap:
    def __init__(self, seed=42):
        self.root = None
        self._rng = random.Random(seed)

    def _rotate_right(self, node):
        left = node.left
        node.left = left.right
        left.right = node
        return left

    def _rotate_left(self, node):
        right = node.right
        node.right = right.left
        right.left = node
        return right

    def insert(self, key):
        priority = self._rng.random()
        self.root = self._insert(self.root, key, priority)

    def _insert(self, node, key, priority):
        if node is None:
            return TreapNode(key, priority)
        if key < node.key:
            node.left = self._insert(node.left, key, priority)
            if node.left.priority > node.priority:  # ヒープ条件が崩れたら回転
                node = self._rotate_right(node)
        elif key > node.key:
            node.right = self._insert(node.right, key, priority)
            if node.right.priority > node.priority:
                node = self._rotate_left(node)
        return node

    def inorder(self) -> list[int]:
        result = []

        def visit(node):
            if node is None:
                return
            visit(node.left)
            result.append(node.key)
            visit(node.right)

        visit(self.root)
        return result
```

```typescript
class TreapNode {
  key: number;
  priority: number;
  left: TreapNode | null = null;
  right: TreapNode | null = null;
  constructor(key: number, priority: number) {
    this.key = key;
    this.priority = priority;
  }
}

class Treap {
  root: TreapNode | null = null;

  private rotateRight(node: TreapNode): TreapNode {
    const left = node.left!;
    node.left = left.right;
    left.right = node;
    return left;
  }

  private rotateLeft(node: TreapNode): TreapNode {
    const right = node.right!;
    node.right = right.left;
    right.left = node;
    return right;
  }

  insert(key: number): void {
    const priority = Math.random();
    this.root = this.insertNode(this.root, key, priority);
  }

  private insertNode(node: TreapNode | null, key: number, priority: number): TreapNode {
    if (node === null) return new TreapNode(key, priority);
    if (key < node.key) {
      node.left = this.insertNode(node.left, key, priority);
      if (node.left.priority > node.priority) node = this.rotateRight(node); // ヒープ条件が崩れたら回転
    } else if (key > node.key) {
      node.right = this.insertNode(node.right, key, priority);
      if (node.right.priority > node.priority) node = this.rotateLeft(node);
    }
    return node;
  }

  inorder(): number[] {
    const result: number[] = [];
    const visit = (node: TreapNode | null): void => {
      if (node === null) return;
      visit(node.left);
      result.push(node.key);
      visit(node.right);
    };
    visit(this.root);
    return result;
  }
}
```

```cpp
#include <memory>
#include <random>
#include <vector>

struct TreapNode {
    int key;
    double priority;
    std::unique_ptr<TreapNode> left;
    std::unique_ptr<TreapNode> right;
    TreapNode(int k, double p) : key(k), priority(p) {}
};

class Treap {
public:
    explicit Treap(unsigned seed = 42) : rng(seed), dist(0.0, 1.0) {}

    void insert(int key) {
        double priority = dist(rng);
        root = insertNode(std::move(root), key, priority);
    }

    std::vector<int> inorder() const {
        std::vector<int> result;
        visit(root.get(), result);
        return result;
    }

private:
    std::unique_ptr<TreapNode> root;
    std::mt19937 rng;
    std::uniform_real_distribution<double> dist;

    static std::unique_ptr<TreapNode> rotateRight(std::unique_ptr<TreapNode> node) {
        std::unique_ptr<TreapNode> left = std::move(node->left);
        node->left = std::move(left->right);
        left->right = std::move(node);
        return left;
    }

    static std::unique_ptr<TreapNode> rotateLeft(std::unique_ptr<TreapNode> node) {
        std::unique_ptr<TreapNode> right = std::move(node->right);
        node->right = std::move(right->left);
        right->left = std::move(node);
        return right;
    }

    static std::unique_ptr<TreapNode> insertNode(std::unique_ptr<TreapNode> node, int key, double priority) {
        if (!node) return std::make_unique<TreapNode>(key, priority);
        if (key < node->key) {
            node->left = insertNode(std::move(node->left), key, priority);
            if (node->left->priority > node->priority) node = rotateRight(std::move(node)); // ヒープ条件が崩れたら回転
        } else if (key > node->key) {
            node->right = insertNode(std::move(node->right), key, priority);
            if (node->right->priority > node->priority) node = rotateLeft(std::move(node));
        }
        return node;
    }

    static void visit(const TreapNode* node, std::vector<int>& result) {
        if (!node) return;
        visit(node->left.get(), result);
        result.push_back(node->key);
        visit(node->right.get(), result);
    }
};
```

```rust
use rand::Rng;

struct TreapNode {
    key: i32,
    priority: f64,
    left: Option<Box<TreapNode>>,
    right: Option<Box<TreapNode>>,
}

impl TreapNode {
    fn new(key: i32, priority: f64) -> Self {
        TreapNode { key, priority, left: None, right: None }
    }
}

fn rotate_right(mut node: Box<TreapNode>) -> Box<TreapNode> {
    let mut left = node.left.take().unwrap();
    node.left = left.right.take();
    left.right = Some(node);
    left
}

fn rotate_left(mut node: Box<TreapNode>) -> Box<TreapNode> {
    let mut right = node.right.take().unwrap();
    node.right = right.left.take();
    right.left = Some(node);
    right
}

#[derive(Default)]
struct Treap {
    root: Option<Box<TreapNode>>,
}

impl Treap {
    fn insert(&mut self, key: i32) {
        let priority: f64 = rand::thread_rng().gen();
        self.root = Self::insert_node(self.root.take(), key, priority);
    }

    fn insert_node(node: Option<Box<TreapNode>>, key: i32, priority: f64) -> Option<Box<TreapNode>> {
        let mut node = match node {
            None => return Some(Box::new(TreapNode::new(key, priority))),
            Some(n) => n,
        };
        if key < node.key {
            node.left = Self::insert_node(node.left.take(), key, priority);
            if node.left.as_ref().unwrap().priority > node.priority {
                node = rotate_right(node); // ヒープ条件が崩れたら回転
            }
        } else if key > node.key {
            node.right = Self::insert_node(node.right.take(), key, priority);
            if node.right.as_ref().unwrap().priority > node.priority {
                node = rotate_left(node);
            }
        }
        Some(node)
    }

    fn inorder(&self) -> Vec<i32> {
        let mut result = Vec::new();
        Self::visit(&self.root, &mut result);
        result
    }

    fn visit(node: &Option<Box<TreapNode>>, result: &mut Vec<i32>) {
        if let Some(n) = node {
            Self::visit(&n.left, result);
            result.push(n.key);
            Self::visit(&n.right, result);
        }
    }
}
```

```csharp
class TreapNode
{
    public int Key;
    public double Priority;
    public TreapNode? Left, Right;
    public TreapNode(int key, double priority) { Key = key; Priority = priority; }
}

class Treap
{
    public TreapNode? Root;
    private readonly Random _rng;

    public Treap(int seed = 42) { _rng = new Random(seed); }

    static TreapNode RotateRight(TreapNode node)
    {
        var left = node.Left!;
        node.Left = left.Right;
        left.Right = node;
        return left;
    }

    static TreapNode RotateLeft(TreapNode node)
    {
        var right = node.Right!;
        node.Right = right.Left;
        right.Left = node;
        return right;
    }

    public void Insert(int key)
    {
        double priority = _rng.NextDouble();
        Root = InsertNode(Root, key, priority);
    }

    static TreapNode InsertNode(TreapNode? node, int key, double priority)
    {
        if (node == null) return new TreapNode(key, priority);
        if (key < node.Key)
        {
            node.Left = InsertNode(node.Left, key, priority);
            if (node.Left.Priority > node.Priority) node = RotateRight(node); // ヒープ条件が崩れたら回転
        }
        else if (key > node.Key)
        {
            node.Right = InsertNode(node.Right, key, priority);
            if (node.Right.Priority > node.Priority) node = RotateLeft(node);
        }
        return node;
    }

    public List<int> Inorder()
    {
        var result = new List<int>();
        void Visit(TreapNode? node)
        {
            if (node == null) return;
            Visit(node.Left);
            result.Add(node.Key);
            Visit(node.Right);
        }
        Visit(Root);
        return result;
    }
}
```
