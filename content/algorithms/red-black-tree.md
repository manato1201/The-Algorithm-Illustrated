---
name: 赤黒木
category: データ構造
subcategory: 木構造
complexity: O(log n)
summary: 色と回転規則で自己平衡を保つ二分探索木。多くの言語の標準ライブラリの内部実装に採用されている。
---

## 概要

二分探索木の「挿入順序によって木が偏る」弱点を、各ノードに「赤」か「黒」の色を持たせ、いくつかの色に関するルールを常に満たすように調整することで解決する平衡二分探索木。AVL木ほど厳密に平衡させない代わりに、挿入・削除の際の調整(回転)が少なく済むという特徴があり、C++のstd::map/std::set、Javaの TreeMap、Linuxカーネルのスケジューラなど、実務で最も広く使われている平衡木のひとつ。

## 仕組み

赤黒木は、常に以下のルールを満たすように維持される:

1. 各ノードは赤か黒のどちらか
2. 根は必ず黒
3. 赤いノードの子は必ず黒(赤が2つ連続してはいけない)
4. 任意のノードから葉までの経路に含まれる黒ノードの数は、どの経路を通っても同じ

このルールにより、「最も長い経路」は「最も短い経路」の高々2倍までしか長くならないことが数学的に保証される。挿入・削除のたびに、これらのルールが破られていないかチェックし、破られていれば**色の塗り替え**と**回転(部分木の構造を組み替える操作)**で修復する。AVL木のように「高さの差が1以内」という厳密な条件ではなく、「最悪でも2倍」というやや緩い条件にすることで、修復にかかる手間(回転の回数)を抑えているのが設計上の工夫。

## 特性・トレードオフ

- **計算量**: 探索・挿入・削除いずれもO(log n)が保証される
- **AVL木との比較**: AVL木はより厳密に平衡するため探索がわずかに速い傾向があるが、挿入・削除のたびの回転回数が多くなりがち。赤黒木は平衡の厳密さを緩める代わりに更新系の操作が平均的に速く、**読み書きのバランスが取れた実務向け**とされる
- **実装の複雑さ**: 色のルールと回転パターンの場合分けが多く、ゼロから実装するのは平衡木の中でも難易度が高いとされる。多くの場合、標準ライブラリの実装をそのまま利用する
- **使いどころ**: 順序付きの連想配列・集合(std::map/std::setなど)の内部実装、データベースのインデックス、Linuxカーネルの完全公平スケジューラ(CFS)など、挿入・削除・探索がバランス良く発生する場面の定番選択肢

## 実装例

```python
RED = "RED"
BLACK = "BLACK"


class RBNode:
    __slots__ = ("key", "color", "left", "right", "parent")

    def __init__(self, key, color=RED):
        self.key = key
        self.color = color
        self.left = None
        self.right = None
        self.parent = None


class RedBlackTree:
    def __init__(self):
        self.root = None

    def _rotate_left(self, x):
        y = x.right
        x.right = y.left
        if y.left:
            y.left.parent = x
        y.parent = x.parent
        if x.parent is None:
            self.root = y
        elif x is x.parent.left:
            x.parent.left = y
        else:
            x.parent.right = y
        y.left = x
        x.parent = y

    def _rotate_right(self, x):
        y = x.left
        x.left = y.right
        if y.right:
            y.right.parent = x
        y.parent = x.parent
        if x.parent is None:
            self.root = y
        elif x is x.parent.right:
            x.parent.right = y
        else:
            x.parent.left = y
        y.right = x
        x.parent = y

    def insert(self, key):
        node = RBNode(key)
        parent = None
        cur = self.root
        while cur:
            parent = cur
            if node.key < cur.key:
                cur = cur.left
            elif node.key > cur.key:
                cur = cur.right
            else:
                return  # 重複は無視
        node.parent = parent
        if parent is None:
            self.root = node
        elif node.key < parent.key:
            parent.left = node
        else:
            parent.right = node
        self._fix_insert(node)

    def _fix_insert(self, z):
        while z.parent and z.parent.color == RED:
            grandparent = z.parent.parent
            if z.parent is grandparent.left:
                uncle = grandparent.right
                if uncle and uncle.color == RED:
                    z.parent.color = BLACK
                    uncle.color = BLACK
                    grandparent.color = RED
                    z = grandparent
                else:
                    if z is z.parent.right:
                        z = z.parent
                        self._rotate_left(z)
                    z.parent.color = BLACK
                    grandparent.color = RED
                    self._rotate_right(grandparent)
            else:
                uncle = grandparent.left
                if uncle and uncle.color == RED:
                    z.parent.color = BLACK
                    uncle.color = BLACK
                    grandparent.color = RED
                    z = grandparent
                else:
                    if z is z.parent.left:
                        z = z.parent
                        self._rotate_right(z)
                    z.parent.color = BLACK
                    grandparent.color = RED
                    self._rotate_left(grandparent)
        self.root.color = BLACK

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
type Color = "RED" | "BLACK";

class RBNode {
  key: number;
  color: Color = "RED";
  left: RBNode | null = null;
  right: RBNode | null = null;
  parent: RBNode | null = null;
  constructor(key: number) {
    this.key = key;
  }
}

class RedBlackTree {
  root: RBNode | null = null;

  private rotateLeft(x: RBNode): void {
    const y = x.right!;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (x.parent === null) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  private rotateRight(x: RBNode): void {
    const y = x.left!;
    x.left = y.right;
    if (y.right) y.right.parent = x;
    y.parent = x.parent;
    if (x.parent === null) this.root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
  }

  insert(key: number): void {
    const node = new RBNode(key);
    let parent: RBNode | null = null;
    let cur = this.root;
    while (cur) {
      parent = cur;
      if (node.key < cur.key) cur = cur.left;
      else if (node.key > cur.key) cur = cur.right;
      else return; // 重複は無視
    }
    node.parent = parent;
    if (parent === null) this.root = node;
    else if (node.key < parent.key) parent.left = node;
    else parent.right = node;
    this.fixInsert(node);
  }

  private fixInsert(z: RBNode): void {
    while (z.parent && z.parent.color === "RED") {
      const grandparent = z.parent.parent!;
      if (z.parent === grandparent.left) {
        const uncle = grandparent.right;
        if (uncle && uncle.color === "RED") {
          z.parent.color = "BLACK";
          uncle.color = "BLACK";
          grandparent.color = "RED";
          z = grandparent;
        } else {
          if (z === z.parent.right) {
            z = z.parent;
            this.rotateLeft(z);
          }
          z.parent!.color = "BLACK";
          grandparent.color = "RED";
          this.rotateRight(grandparent);
        }
      } else {
        const uncle = grandparent.left;
        if (uncle && uncle.color === "RED") {
          z.parent.color = "BLACK";
          uncle.color = "BLACK";
          grandparent.color = "RED";
          z = grandparent;
        } else {
          if (z === z.parent.left) {
            z = z.parent;
            this.rotateRight(z);
          }
          z.parent!.color = "BLACK";
          grandparent.color = "RED";
          this.rotateLeft(grandparent);
        }
      }
    }
    this.root!.color = "BLACK";
  }

  inorder(): number[] {
    const result: number[] = [];
    const visit = (node: RBNode | null): void => {
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
#include <vector>

enum class Color { Red, Black };

struct RBNode {
    int key;
    Color color = Color::Red;
    RBNode* left = nullptr;
    RBNode* right = nullptr;
    RBNode* parent = nullptr;
    explicit RBNode(int k) : key(k) {}
};

class RedBlackTree {
public:
    ~RedBlackTree() { destroy(root); }

    void insert(int key) {
        RBNode* node = new RBNode(key);
        RBNode* parent = nullptr;
        RBNode* cur = root;
        while (cur) {
            parent = cur;
            if (node->key < cur->key) cur = cur->left;
            else if (node->key > cur->key) cur = cur->right;
            else { delete node; return; } // 重複は無視
        }
        node->parent = parent;
        if (!parent) root = node;
        else if (node->key < parent->key) parent->left = node;
        else parent->right = node;
        fixInsert(node);
    }

    std::vector<int> inorder() const {
        std::vector<int> result;
        visit(root, result);
        return result;
    }

private:
    RBNode* root = nullptr;

    void rotateLeft(RBNode* x) {
        RBNode* y = x->right;
        x->right = y->left;
        if (y->left) y->left->parent = x;
        y->parent = x->parent;
        if (!x->parent) root = y;
        else if (x == x->parent->left) x->parent->left = y;
        else x->parent->right = y;
        y->left = x;
        x->parent = y;
    }

    void rotateRight(RBNode* x) {
        RBNode* y = x->left;
        x->left = y->right;
        if (y->right) y->right->parent = x;
        y->parent = x->parent;
        if (!x->parent) root = y;
        else if (x == x->parent->right) x->parent->right = y;
        else x->parent->left = y;
        y->right = x;
        x->parent = y;
    }

    void fixInsert(RBNode* z) {
        while (z->parent && z->parent->color == Color::Red) {
            RBNode* grandparent = z->parent->parent;
            if (z->parent == grandparent->left) {
                RBNode* uncle = grandparent->right;
                if (uncle && uncle->color == Color::Red) {
                    z->parent->color = Color::Black;
                    uncle->color = Color::Black;
                    grandparent->color = Color::Red;
                    z = grandparent;
                } else {
                    if (z == z->parent->right) {
                        z = z->parent;
                        rotateLeft(z);
                    }
                    z->parent->color = Color::Black;
                    grandparent->color = Color::Red;
                    rotateRight(grandparent);
                }
            } else {
                RBNode* uncle = grandparent->left;
                if (uncle && uncle->color == Color::Red) {
                    z->parent->color = Color::Black;
                    uncle->color = Color::Black;
                    grandparent->color = Color::Red;
                    z = grandparent;
                } else {
                    if (z == z->parent->left) {
                        z = z->parent;
                        rotateRight(z);
                    }
                    z->parent->color = Color::Black;
                    grandparent->color = Color::Red;
                    rotateLeft(grandparent);
                }
            }
        }
        root->color = Color::Black;
    }

    static void visit(const RBNode* node, std::vector<int>& result) {
        if (!node) return;
        visit(node->left, result);
        result.push_back(node->key);
        visit(node->right, result);
    }

    static void destroy(RBNode* node) {
        if (!node) return;
        destroy(node->left);
        destroy(node->right);
        delete node;
    }
};
```

```rust
// 親ポインタを持つ木はRustではRc<RefCell<>>よりも「アリーナ(Vec)+添字」で
// 書く方がborrow checkerと相性がよいため、ここではその方式を採用する。
#[derive(PartialEq, Clone, Copy)]
enum Color {
    Red,
    Black,
}

struct RbNode {
    key: i32,
    color: Color,
    left: Option<usize>,
    right: Option<usize>,
    parent: Option<usize>,
}

#[derive(Default)]
struct RedBlackTree {
    nodes: Vec<RbNode>,
    root: Option<usize>,
}

impl RedBlackTree {
    fn insert(&mut self, key: i32) {
        let mut parent = None;
        let mut cur = self.root;
        while let Some(c) = cur {
            parent = Some(c);
            if key < self.nodes[c].key {
                cur = self.nodes[c].left;
            } else if key > self.nodes[c].key {
                cur = self.nodes[c].right;
            } else {
                return; // 重複は無視
            }
        }

        let idx = self.nodes.len();
        self.nodes.push(RbNode { key, color: Color::Red, left: None, right: None, parent });
        match parent {
            None => self.root = Some(idx),
            Some(p) => {
                if key < self.nodes[p].key {
                    self.nodes[p].left = Some(idx);
                } else {
                    self.nodes[p].right = Some(idx);
                }
            }
        }
        self.fix_insert(idx);
    }

    fn rotate_left(&mut self, x: usize) {
        let y = self.nodes[x].right.unwrap();
        self.nodes[x].right = self.nodes[y].left;
        if let Some(yl) = self.nodes[y].left {
            self.nodes[yl].parent = Some(x);
        }
        self.nodes[y].parent = self.nodes[x].parent;
        match self.nodes[x].parent {
            None => self.root = Some(y),
            Some(p) if self.nodes[p].left == Some(x) => self.nodes[p].left = Some(y),
            Some(p) => self.nodes[p].right = Some(y),
        }
        self.nodes[y].left = Some(x);
        self.nodes[x].parent = Some(y);
    }

    fn rotate_right(&mut self, x: usize) {
        let y = self.nodes[x].left.unwrap();
        self.nodes[x].left = self.nodes[y].right;
        if let Some(yr) = self.nodes[y].right {
            self.nodes[yr].parent = Some(x);
        }
        self.nodes[y].parent = self.nodes[x].parent;
        match self.nodes[x].parent {
            None => self.root = Some(y),
            Some(p) if self.nodes[p].right == Some(x) => self.nodes[p].right = Some(y),
            Some(p) => self.nodes[p].left = Some(y),
        }
        self.nodes[y].right = Some(x);
        self.nodes[x].parent = Some(y);
    }

    fn fix_insert(&mut self, mut z: usize) {
        loop {
            let zp = match self.nodes[z].parent {
                Some(p) if self.nodes[p].color == Color::Red => p,
                _ => break,
            };
            let gp = self.nodes[zp].parent.unwrap(); // 親が赤なら親は根ではないので祖父は必ず存在する
            if self.nodes[gp].left == Some(zp) {
                let uncle = self.nodes[gp].right;
                if let Some(u) = uncle {
                    if self.nodes[u].color == Color::Red {
                        self.nodes[zp].color = Color::Black;
                        self.nodes[u].color = Color::Black;
                        self.nodes[gp].color = Color::Red;
                        z = gp;
                        continue;
                    }
                }
                let mut z = z;
                let mut zp = zp;
                if self.nodes[zp].right == Some(z) {
                    z = zp;
                    self.rotate_left(z);
                    zp = self.nodes[z].parent.unwrap();
                }
                self.nodes[zp].color = Color::Black;
                self.nodes[gp].color = Color::Red;
                self.rotate_right(gp);
            } else {
                let uncle = self.nodes[gp].left;
                if let Some(u) = uncle {
                    if self.nodes[u].color == Color::Red {
                        self.nodes[zp].color = Color::Black;
                        self.nodes[u].color = Color::Black;
                        self.nodes[gp].color = Color::Red;
                        z = gp;
                        continue;
                    }
                }
                let mut z = z;
                let mut zp = zp;
                if self.nodes[zp].left == Some(z) {
                    z = zp;
                    self.rotate_right(z);
                    zp = self.nodes[z].parent.unwrap();
                }
                self.nodes[zp].color = Color::Black;
                self.nodes[gp].color = Color::Red;
                self.rotate_left(gp);
            }
        }
        let root = self.root.unwrap();
        self.nodes[root].color = Color::Black;
    }

    fn inorder(&self) -> Vec<i32> {
        let mut result = Vec::new();
        self.visit(self.root, &mut result);
        result
    }

    fn visit(&self, node: Option<usize>, result: &mut Vec<i32>) {
        if let Some(n) = node {
            self.visit(self.nodes[n].left, result);
            result.push(self.nodes[n].key);
            self.visit(self.nodes[n].right, result);
        }
    }
}
```

```csharp
enum RbColor { Red, Black }

class RbNode
{
    public int Key;
    public RbColor Color = RbColor.Red;
    public RbNode? Left, Right, Parent;
    public RbNode(int key) { Key = key; }
}

class RedBlackTree
{
    public RbNode? Root;

    void RotateLeft(RbNode x)
    {
        var y = x.Right!;
        x.Right = y.Left;
        if (y.Left != null) y.Left.Parent = x;
        y.Parent = x.Parent;
        if (x.Parent == null) Root = y;
        else if (x == x.Parent.Left) x.Parent.Left = y;
        else x.Parent.Right = y;
        y.Left = x;
        x.Parent = y;
    }

    void RotateRight(RbNode x)
    {
        var y = x.Left!;
        x.Left = y.Right;
        if (y.Right != null) y.Right.Parent = x;
        y.Parent = x.Parent;
        if (x.Parent == null) Root = y;
        else if (x == x.Parent.Right) x.Parent.Right = y;
        else x.Parent.Left = y;
        y.Right = x;
        x.Parent = y;
    }

    public void Insert(int key)
    {
        var node = new RbNode(key);
        RbNode? parent = null;
        var cur = Root;
        while (cur != null)
        {
            parent = cur;
            if (node.Key < cur.Key) cur = cur.Left;
            else if (node.Key > cur.Key) cur = cur.Right;
            else return; // 重複は無視
        }
        node.Parent = parent;
        if (parent == null) Root = node;
        else if (node.Key < parent.Key) parent.Left = node;
        else parent.Right = node;
        FixInsert(node);
    }

    void FixInsert(RbNode z)
    {
        while (z.Parent != null && z.Parent.Color == RbColor.Red)
        {
            var grandparent = z.Parent.Parent!;
            if (z.Parent == grandparent.Left)
            {
                var uncle = grandparent.Right;
                if (uncle != null && uncle.Color == RbColor.Red)
                {
                    z.Parent.Color = RbColor.Black;
                    uncle.Color = RbColor.Black;
                    grandparent.Color = RbColor.Red;
                    z = grandparent;
                }
                else
                {
                    if (z == z.Parent.Right)
                    {
                        z = z.Parent;
                        RotateLeft(z);
                    }
                    z.Parent!.Color = RbColor.Black;
                    grandparent.Color = RbColor.Red;
                    RotateRight(grandparent);
                }
            }
            else
            {
                var uncle = grandparent.Left;
                if (uncle != null && uncle.Color == RbColor.Red)
                {
                    z.Parent.Color = RbColor.Black;
                    uncle.Color = RbColor.Black;
                    grandparent.Color = RbColor.Red;
                    z = grandparent;
                }
                else
                {
                    if (z == z.Parent.Left)
                    {
                        z = z.Parent;
                        RotateRight(z);
                    }
                    z.Parent!.Color = RbColor.Black;
                    grandparent.Color = RbColor.Red;
                    RotateLeft(grandparent);
                }
            }
        }
        Root!.Color = RbColor.Black;
    }

    public List<int> Inorder()
    {
        var result = new List<int>();
        void Visit(RbNode? node)
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
