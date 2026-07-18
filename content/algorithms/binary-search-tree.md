---
name: 二分探索木
category: データ構造
subcategory: 木構造
complexity: O(log n) 〜 O(n)
summary: 左小右大の性質で探索・挿入・削除をこなす。偏ると性能が線形に劣化する弱点を持つ。
---

## 概要

各ノードが「左の子孫は自分より小さい、右の子孫は自分より大きい」という性質を保つ木構造。この単純なルールだけで、探索・挿入・削除を根から葉に向かって効率的に行えるようになる。多くの平衡木(赤黒木、AVL木など)の土台になっている、木構造データベースの出発点。

## 仕組み

- **探索**: 根から始め、目的の値が現在のノードより小さければ左の子へ、大きければ右の子へ進む。これを繰り返し、値が一致すれば発見、子がなければ「存在しない」と判定する
- **挿入**: 探索と同じ手順で「本来あるべき位置」までたどり、そこに新しいノードを子として追加する
- **削除**: 削除するノードに子が0〜1個なら単純に付け替えるだけだが、子が2つある場合は「右部分木の最小値(または左部分木の最大値)」を探し、それを削除位置に持ってきてから元の位置を削除する、という一手間が必要になる

木を根から葉までたどる回数が、そのまま操作の速さを決める。木の高さが低ければ低いほど速い。

## 特性・トレードオフ

- **計算量**: 木が平衡している(左右のバランスが取れている)場合はO(log n)だが、**挿入順序によっては木が偏り、最悪の場合は一本道の連結リストのようになってO(n)まで劣化する**(例えば1, 2, 3, 4, 5...と昇順のまま挿入すると、木は右にどんどん伸びていくだけになる)
- **平衡木への発展**: この「偏りによる劣化」を防ぐために、赤黒木・AVL木・スプレー木・トリープなど、様々な自己平衡の工夫を加えた発展形が考案されている
- **中間順巡回でソート**: 二分探索木を「左の子→自分→右の子」の順に巡回する(中間順巡回)と、格納されている値が昇順で得られる。これは木の構造自体がソート済みの情報を保持していることの表れ
- **使いどころ**: 単体で使うことは少なく、多くの場合は平衡が保証された発展形(赤黒木など)が実務では採用される。学習の入り口として、木構造データベースの基礎概念を理解するのに最適

## 実装例

```python
class BSTNode:
    __slots__ = ("key", "left", "right")

    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None


class BinarySearchTree:
    def __init__(self):
        self.root = None

    def insert(self, key):
        if self.root is None:
            self.root = BSTNode(key)
            return
        node = self.root
        while True:
            if key < node.key:
                if node.left is None:
                    node.left = BSTNode(key)
                    return
                node = node.left
            elif key > node.key:
                if node.right is None:
                    node.right = BSTNode(key)
                    return
                node = node.right
            else:
                return  # 重複は無視

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
class BSTNode {
  key: number;
  left: BSTNode | null = null;
  right: BSTNode | null = null;
  constructor(key: number) {
    this.key = key;
  }
}

class BinarySearchTree {
  root: BSTNode | null = null;

  insert(key: number): void {
    if (this.root === null) {
      this.root = new BSTNode(key);
      return;
    }
    let node = this.root;
    while (true) {
      if (key < node.key) {
        if (node.left === null) {
          node.left = new BSTNode(key);
          return;
        }
        node = node.left;
      } else if (key > node.key) {
        if (node.right === null) {
          node.right = new BSTNode(key);
          return;
        }
        node = node.right;
      } else {
        return; // 重複は無視
      }
    }
  }

  inorder(): number[] {
    const result: number[] = [];
    const visit = (node: BSTNode | null): void => {
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
#include <vector>

struct BSTNode {
    int key;
    std::unique_ptr<BSTNode> left;
    std::unique_ptr<BSTNode> right;
    explicit BSTNode(int k) : key(k) {}
};

class BinarySearchTree {
public:
    void insert(int key) {
        if (!root) {
            root = std::make_unique<BSTNode>(key);
            return;
        }
        BSTNode* node = root.get();
        while (true) {
            if (key < node->key) {
                if (!node->left) {
                    node->left = std::make_unique<BSTNode>(key);
                    return;
                }
                node = node->left.get();
            } else if (key > node->key) {
                if (!node->right) {
                    node->right = std::make_unique<BSTNode>(key);
                    return;
                }
                node = node->right.get();
            } else {
                return; // 重複は無視
            }
        }
    }

    std::vector<int> inorder() const {
        std::vector<int> result;
        visit(root.get(), result);
        return result;
    }

private:
    std::unique_ptr<BSTNode> root;

    static void visit(const BSTNode* node, std::vector<int>& result) {
        if (!node) return;
        visit(node->left.get(), result);
        result.push_back(node->key);
        visit(node->right.get(), result);
    }
};
```

```rust
struct BSTNode {
    key: i32,
    left: Option<Box<BSTNode>>,
    right: Option<Box<BSTNode>>,
}

impl BSTNode {
    fn new(key: i32) -> Self {
        BSTNode { key, left: None, right: None }
    }
}

#[derive(Default)]
struct BinarySearchTree {
    root: Option<Box<BSTNode>>,
}

impl BinarySearchTree {
    fn insert(&mut self, key: i32) {
        Self::insert_node(&mut self.root, key);
    }

    fn insert_node(node: &mut Option<Box<BSTNode>>, key: i32) {
        match node {
            None => *node = Some(Box::new(BSTNode::new(key))),
            Some(n) => {
                if key < n.key {
                    Self::insert_node(&mut n.left, key);
                } else if key > n.key {
                    Self::insert_node(&mut n.right, key);
                }
                // 等しい場合は重複として無視
            }
        }
    }

    fn inorder(&self) -> Vec<i32> {
        let mut result = Vec::new();
        Self::visit(&self.root, &mut result);
        result
    }

    fn visit(node: &Option<Box<BSTNode>>, result: &mut Vec<i32>) {
        if let Some(n) = node {
            Self::visit(&n.left, result);
            result.push(n.key);
            Self::visit(&n.right, result);
        }
    }
}
```

```csharp
class BstNode
{
    public int Key;
    public BstNode? Left, Right;
    public BstNode(int key) { Key = key; }
}

class BinarySearchTree
{
    public BstNode? Root;

    public void Insert(int key)
    {
        if (Root == null) { Root = new BstNode(key); return; }
        var node = Root;
        while (true)
        {
            if (key < node.Key)
            {
                if (node.Left == null) { node.Left = new BstNode(key); return; }
                node = node.Left;
            }
            else if (key > node.Key)
            {
                if (node.Right == null) { node.Right = new BstNode(key); return; }
                node = node.Right;
            }
            else return; // 重複は無視
        }
    }

    public List<int> Inorder()
    {
        var result = new List<int>();
        void Visit(BstNode? node)
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
