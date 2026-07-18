---
name: AVL木
category: データ構造
subcategory: 木構造
complexity: O(log n)
summary: 左右の高さの差を1以内に保つことで自己平衡する、最初に発明された平衡二分探索木。
---

## 概要

二分探索木が挿入順序によって偏ってしまう問題に対して、**世界で最初に考案された解決策**。1962年にソ連の数学者ゲオルギー・アデルソン=ヴェルスキーとエフゲニー・ランディスが発表し、2人の頭文字から「AVL木」と名付けられた。「各ノードにおいて、左部分木と右部分木の高さの差が1以内である」という厳密なルールを常に維持することで、木の高さをO(log n)に保証する。

## 仕組み

各ノードは「平衡係数(左部分木の高さ - 右部分木の高さ)」を管理し、これが常に-1, 0, 1のいずれかになるよう維持する。

1. 通常の二分探索木と同じ手順で要素を挿入する
2. 挿入した位置から根に向かって、各祖先ノードの平衡係数を再計算する
3. もし平衡係数が-2または2になってしまったノードがあれば、**回転**(部分木の構造を組み替える操作)によってその場で平衡を回復する。回転には「左回転」「右回転」と、それらを組み合わせた「左右回転」「右左回転」の4パターンがあり、崩れ方に応じて使い分ける
4. 削除の場合も同様に、削除後に祖先をたどりながら平衡係数をチェックし、必要なら回転する

「高さの差1以内」という厳密な条件のおかげで、木の高さは常に理論上の最小値に非常に近く保たれる。

## 特性・トレードオフ

- **計算量**: 探索・挿入・削除いずれもO(log n)が保証される
- **赤黒木との比較**: AVL木は赤黒木より平衡がより厳密(高さの差1以内 vs 最大2倍)なため、**探索がわずかに高速**になる傾向がある。一方で、挿入・削除のたびに必要な回転の回数は赤黒木より多くなりがちで、**更新が頻繁な場面ではやや不利**とされる
- **「読み取り重視」なシステムでの優位性**: 一度構築したらあまり更新せず、検索を大量に行うようなデータ(辞書データなど)には、平衡の厳密さがそのまま活きるAVL木が向いていることがある
- **使いどころ**: データベースのインデックス構造の一部、メモリ内の辞書構造、赤黒木ほど更新頻度が高くない読み取り中心のシステム。実務では赤黒木の方が採用例は多いが、平衡木の基本原理を学ぶ入り口として最も重要な存在

## 実装例

```python
class AVLNode:
    __slots__ = ("key", "left", "right", "height")

    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.height = 1


def _h(node):
    return node.height if node else 0


def _update_height(node):
    node.height = 1 + max(_h(node.left), _h(node.right))


def _balance_factor(node):
    return _h(node.left) - _h(node.right)


def _rotate_left(z):
    y = z.right
    t2 = y.left
    y.left = z
    z.right = t2
    _update_height(z)
    _update_height(y)
    return y


def _rotate_right(z):
    y = z.left
    t3 = y.right
    y.right = z
    z.left = t3
    _update_height(z)
    _update_height(y)
    return y


class AVLTree:
    def __init__(self):
        self.root = None

    def insert(self, key):
        self.root = self._insert(self.root, key)

    def _insert(self, node, key):
        if node is None:
            return AVLNode(key)
        if key < node.key:
            node.left = self._insert(node.left, key)
        elif key > node.key:
            node.right = self._insert(node.right, key)
        else:
            return node  # 重複は無視

        _update_height(node)
        balance = _balance_factor(node)

        if balance > 1 and key < node.left.key:  # 左左
            return _rotate_right(node)
        if balance < -1 and key > node.right.key:  # 右右
            return _rotate_left(node)
        if balance > 1 and key > node.left.key:  # 左右
            node.left = _rotate_left(node.left)
            return _rotate_right(node)
        if balance < -1 and key < node.right.key:  # 右左
            node.right = _rotate_right(node.right)
            return _rotate_left(node)
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
class AVLNode {
  key: number;
  left: AVLNode | null = null;
  right: AVLNode | null = null;
  height = 1;
  constructor(key: number) {
    this.key = key;
  }
}

function height(node: AVLNode | null): number {
  return node ? node.height : 0;
}

function updateHeight(node: AVLNode): void {
  node.height = 1 + Math.max(height(node.left), height(node.right));
}

function balanceFactor(node: AVLNode): number {
  return height(node.left) - height(node.right);
}

function rotateLeft(z: AVLNode): AVLNode {
  const y = z.right!;
  const t2 = y.left;
  y.left = z;
  z.right = t2;
  updateHeight(z);
  updateHeight(y);
  return y;
}

function rotateRight(z: AVLNode): AVLNode {
  const y = z.left!;
  const t3 = y.right;
  y.right = z;
  z.left = t3;
  updateHeight(z);
  updateHeight(y);
  return y;
}

class AVLTree {
  root: AVLNode | null = null;

  insert(key: number): void {
    this.root = this.insertNode(this.root, key);
  }

  private insertNode(node: AVLNode | null, key: number): AVLNode {
    if (node === null) return new AVLNode(key);
    if (key < node.key) node.left = this.insertNode(node.left, key);
    else if (key > node.key) node.right = this.insertNode(node.right, key);
    else return node; // 重複は無視

    updateHeight(node);
    const balance = balanceFactor(node);

    if (balance > 1 && key < node.left!.key) return rotateRight(node); // 左左
    if (balance < -1 && key > node.right!.key) return rotateLeft(node); // 右右
    if (balance > 1 && key > node.left!.key) {
      // 左右
      node.left = rotateLeft(node.left!);
      return rotateRight(node);
    }
    if (balance < -1 && key < node.right!.key) {
      // 右左
      node.right = rotateRight(node.right!);
      return rotateLeft(node);
    }
    return node;
  }

  inorder(): number[] {
    const result: number[] = [];
    const visit = (node: AVLNode | null): void => {
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
#include <algorithm>
#include <memory>
#include <vector>

struct AVLNode {
    int key;
    int height = 1;
    std::unique_ptr<AVLNode> left;
    std::unique_ptr<AVLNode> right;
    explicit AVLNode(int k) : key(k) {}
};

class AVLTree {
public:
    void insert(int key) {
        root = insertNode(std::move(root), key);
    }

    std::vector<int> inorder() const {
        std::vector<int> result;
        visit(root.get(), result);
        return result;
    }

private:
    std::unique_ptr<AVLNode> root;

    static int height(const AVLNode* n) { return n ? n->height : 0; }

    static void updateHeight(AVLNode* n) {
        n->height = 1 + std::max(height(n->left.get()), height(n->right.get()));
    }

    static int balanceFactor(const AVLNode* n) {
        return height(n->left.get()) - height(n->right.get());
    }

    static std::unique_ptr<AVLNode> rotateLeft(std::unique_ptr<AVLNode> z) {
        std::unique_ptr<AVLNode> y = std::move(z->right);
        z->right = std::move(y->left);
        updateHeight(z.get());
        y->left = std::move(z);
        updateHeight(y.get());
        return y;
    }

    static std::unique_ptr<AVLNode> rotateRight(std::unique_ptr<AVLNode> z) {
        std::unique_ptr<AVLNode> y = std::move(z->left);
        z->left = std::move(y->right);
        updateHeight(z.get());
        y->right = std::move(z);
        updateHeight(y.get());
        return y;
    }

    static std::unique_ptr<AVLNode> insertNode(std::unique_ptr<AVLNode> node, int key) {
        if (!node) return std::make_unique<AVLNode>(key);
        if (key < node->key) {
            node->left = insertNode(std::move(node->left), key);
        } else if (key > node->key) {
            node->right = insertNode(std::move(node->right), key);
        } else {
            return node; // 重複は無視
        }

        updateHeight(node.get());
        int balance = balanceFactor(node.get());

        if (balance > 1 && key < node->left->key) return rotateRight(std::move(node)); // 左左
        if (balance < -1 && key > node->right->key) return rotateLeft(std::move(node)); // 右右
        if (balance > 1 && key > node->left->key) { // 左右
            node->left = rotateLeft(std::move(node->left));
            return rotateRight(std::move(node));
        }
        if (balance < -1 && key < node->right->key) { // 右左
            node->right = rotateRight(std::move(node->right));
            return rotateLeft(std::move(node));
        }
        return node;
    }

    static void visit(const AVLNode* node, std::vector<int>& result) {
        if (!node) return;
        visit(node->left.get(), result);
        result.push_back(node->key);
        visit(node->right.get(), result);
    }
};
```

```rust
struct AvlNode {
    key: i32,
    height: i32,
    left: Option<Box<AvlNode>>,
    right: Option<Box<AvlNode>>,
}

impl AvlNode {
    fn new(key: i32) -> Self {
        AvlNode { key, height: 1, left: None, right: None }
    }
}

fn height(node: &Option<Box<AvlNode>>) -> i32 {
    node.as_ref().map_or(0, |n| n.height)
}

fn update_height(node: &mut AvlNode) {
    node.height = 1 + height(&node.left).max(height(&node.right));
}

fn balance_factor(node: &AvlNode) -> i32 {
    height(&node.left) - height(&node.right)
}

fn rotate_left(mut z: Box<AvlNode>) -> Box<AvlNode> {
    let mut y = z.right.take().unwrap();
    z.right = y.left.take();
    update_height(&mut z);
    y.left = Some(z);
    update_height(&mut y);
    y
}

fn rotate_right(mut z: Box<AvlNode>) -> Box<AvlNode> {
    let mut y = z.left.take().unwrap();
    z.left = y.right.take();
    update_height(&mut z);
    y.right = Some(z);
    update_height(&mut y);
    y
}

#[derive(Default)]
struct AvlTree {
    root: Option<Box<AvlNode>>,
}

impl AvlTree {
    fn insert(&mut self, key: i32) {
        self.root = Self::insert_node(self.root.take(), key);
    }

    fn insert_node(node: Option<Box<AvlNode>>, key: i32) -> Option<Box<AvlNode>> {
        let mut node = match node {
            None => return Some(Box::new(AvlNode::new(key))),
            Some(n) => n,
        };

        if key < node.key {
            node.left = Self::insert_node(node.left.take(), key);
        } else if key > node.key {
            node.right = Self::insert_node(node.right.take(), key);
        } else {
            return Some(node); // 重複は無視
        }

        update_height(&mut node);
        let balance = balance_factor(&node);

        if balance > 1 && key < node.left.as_ref().unwrap().key {
            return Some(rotate_right(node)); // 左左
        }
        if balance < -1 && key > node.right.as_ref().unwrap().key {
            return Some(rotate_left(node)); // 右右
        }
        if balance > 1 && key > node.left.as_ref().unwrap().key {
            // 左右
            node.left = Some(rotate_left(node.left.take().unwrap()));
            return Some(rotate_right(node));
        }
        if balance < -1 && key < node.right.as_ref().unwrap().key {
            // 右左
            node.right = Some(rotate_right(node.right.take().unwrap()));
            return Some(rotate_left(node));
        }
        Some(node)
    }

    fn inorder(&self) -> Vec<i32> {
        let mut result = Vec::new();
        Self::visit(&self.root, &mut result);
        result
    }

    fn visit(node: &Option<Box<AvlNode>>, result: &mut Vec<i32>) {
        if let Some(n) = node {
            Self::visit(&n.left, result);
            result.push(n.key);
            Self::visit(&n.right, result);
        }
    }
}
```

```csharp
class AvlNode
{
    public int Key;
    public AvlNode? Left, Right;
    public int Height = 1;
    public AvlNode(int key) { Key = key; }
}

class AvlTree
{
    public AvlNode? Root;

    static int H(AvlNode? n) => n?.Height ?? 0;
    static void UpdateHeight(AvlNode n) => n.Height = 1 + Math.Max(H(n.Left), H(n.Right));
    static int BalanceFactor(AvlNode n) => H(n.Left) - H(n.Right);

    static AvlNode RotateLeft(AvlNode z)
    {
        var y = z.Right!;
        var t2 = y.Left;
        y.Left = z;
        z.Right = t2;
        UpdateHeight(z);
        UpdateHeight(y);
        return y;
    }

    static AvlNode RotateRight(AvlNode z)
    {
        var y = z.Left!;
        var t3 = y.Right;
        y.Right = z;
        z.Left = t3;
        UpdateHeight(z);
        UpdateHeight(y);
        return y;
    }

    public void Insert(int key) => Root = InsertNode(Root, key);

    static AvlNode InsertNode(AvlNode? node, int key)
    {
        if (node == null) return new AvlNode(key);
        if (key < node.Key) node.Left = InsertNode(node.Left, key);
        else if (key > node.Key) node.Right = InsertNode(node.Right, key);
        else return node; // 重複は無視

        UpdateHeight(node);
        int balance = BalanceFactor(node);

        if (balance > 1 && key < node.Left!.Key) return RotateRight(node); // 左左
        if (balance < -1 && key > node.Right!.Key) return RotateLeft(node); // 右右
        if (balance > 1 && key > node.Left!.Key) // 左右
        {
            node.Left = RotateLeft(node.Left!);
            return RotateRight(node);
        }
        if (balance < -1 && key < node.Right!.Key) // 右左
        {
            node.Right = RotateRight(node.Right!);
            return RotateLeft(node);
        }
        return node;
    }

    public List<int> Inorder()
    {
        var result = new List<int>();
        void Visit(AvlNode? node)
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
