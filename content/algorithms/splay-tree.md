---
name: スプレー木
category: データ構造
subcategory: 木構造
complexity: O(log n)(償却)
summary: アクセスしたノードを回転で根まで持ち上げる。局所性の高いアクセスパターンで特に高速。
---

## 概要

「最近アクセスしたデータは、また近いうちにアクセスされやすい」という経験則(局所性)を、木構造そのものに組み込んだ、少し変わった発想の平衡二分探索木。アクセスしたノードを**そのたびに回転で根まで持ち上げる**ことで、頻繁にアクセスされる要素ほど根の近くに留まり、結果として平均的なアクセス速度が向上する。1985年にダニエル・スリータとロバート・タージャンが考案した。

## 仕組み

「スプレー操作」と呼ばれる、探索したノードを根まで持ち上げる一連の回転が全ての基本になる。

1. 目的のノードを通常の二分探索木の手順で探す
2. 見つかったノード(あるいは、見つからなかった場合に最後にたどり着いたノード)を、**回転を繰り返して根の位置まで移動させる**
3. この回転には、親と祖父の位置関係に応じて「一直線状のジグザグでない場合(zig-zig)」「ジグザグの場合(zig-zag)」など複数のパターンがあり、単純な1段階の回転より2段階まとめた回転の方が理論上の性能保証につながることが示されている

「探索・挿入・削除、どの操作を行っても、対象のノードが最終的に根に来る」という統一されたルールがスプレー木の特徴で、他の平衡木のように「平衡が崩れたときだけ」ではなく、**アクセスするたびに必ず木の形が変化する**。

## 特性・トレードオフ

- **計算量**: 個々の操作の最悪ケースはO(n)まで悪化しうるが、**一連の操作全体で平均するとO(log n)**であることが理論的に保証されている(償却計算量)。単発の最悪ケースを許容できる代わりに、長期的な性能は他の平衡木と遜色ない
- **局所性の活用**: 同じ要素や近い要素に繰り返しアクセスするパターン(キャッシュ的な用途)では、その要素が根付近に留まり続けるため、他の平衡木より実測で高速になることがある
- **単純さと引き換えの不安定さ**: 明示的な平衡条件(色や高さ)を持たないため実装は比較的単純だが、リアルタイム性が求められる(1回1回の操作の最悪ケースを保証したい)システムには不向き
- **使いどころ**: キャッシュシステム、ガベージコレクタの内部データ構造、データ圧縮アルゴリズム(頻出データを木の根付近に保つ)、ネットワークルータのルーティングテーブルなど、アクセスパターンに強い偏りがあることが期待される場面

## 実装例

```python
class SplayNode:
    __slots__ = ("key", "left", "right", "parent")

    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.parent = None


class SplayTree:
    def __init__(self):
        self.root = None

    def _rotate(self, x):
        p = x.parent
        g = p.parent
        if p.left is x:
            p.left = x.right
            if x.right:
                x.right.parent = p
            x.right = p
        else:
            p.right = x.left
            if x.left:
                x.left.parent = p
            x.left = p
        p.parent = x
        x.parent = g
        if g:
            if g.left is p:
                g.left = x
            else:
                g.right = x

    def _splay(self, x):
        while x.parent:
            p = x.parent
            g = p.parent
            if g is None:
                self._rotate(x)  # zig
            elif (g.left is p) == (p.left is x):
                self._rotate(p)  # zig-zig
                self._rotate(x)
            else:
                self._rotate(x)  # zig-zag
                self._rotate(x)
        self.root = x

    def insert(self, key):
        if self.root is None:
            self.root = SplayNode(key)
            return
        cur = self.root
        parent = None
        while cur:
            parent = cur
            if key < cur.key:
                cur = cur.left
            elif key > cur.key:
                cur = cur.right
            else:
                self._splay(cur)  # 既存のキーでもアクセスしたので根に上げる
                return
        node = SplayNode(key)
        node.parent = parent
        if key < parent.key:
            parent.left = node
        else:
            parent.right = node
        self._splay(node)

    def find(self, key) -> bool:
        cur = self.root
        last = None
        while cur:
            last = cur
            if key == cur.key:
                self._splay(cur)
                return True
            elif key < cur.key:
                cur = cur.left
            else:
                cur = cur.right
        if last:
            self._splay(last)  # 見つからなくても最後にたどり着いたノードを根に上げる
        return False

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
class SplayNode {
  key: number;
  left: SplayNode | null = null;
  right: SplayNode | null = null;
  parent: SplayNode | null = null;
  constructor(key: number) {
    this.key = key;
  }
}

class SplayTree {
  root: SplayNode | null = null;

  private rotate(x: SplayNode): void {
    const p = x.parent!;
    const g = p.parent;
    if (p.left === x) {
      p.left = x.right;
      if (x.right) x.right.parent = p;
      x.right = p;
    } else {
      p.right = x.left;
      if (x.left) x.left.parent = p;
      x.left = p;
    }
    p.parent = x;
    x.parent = g;
    if (g) {
      if (g.left === p) g.left = x;
      else g.right = x;
    }
  }

  private splay(x: SplayNode): void {
    while (x.parent) {
      const p = x.parent;
      const g = p.parent;
      if (g === null) {
        this.rotate(x); // zig
      } else if ((g.left === p) === (p.left === x)) {
        this.rotate(p); // zig-zig
        this.rotate(x);
      } else {
        this.rotate(x); // zig-zag
        this.rotate(x);
      }
    }
    this.root = x;
  }

  insert(key: number): void {
    if (this.root === null) {
      this.root = new SplayNode(key);
      return;
    }
    let cur: SplayNode | null = this.root;
    let parent: SplayNode | null = null;
    while (cur) {
      parent = cur;
      if (key < cur.key) cur = cur.left;
      else if (key > cur.key) cur = cur.right;
      else {
        this.splay(cur); // 既存のキーでもアクセスしたので根に上げる
        return;
      }
    }
    const node = new SplayNode(key);
    node.parent = parent;
    if (key < parent!.key) parent!.left = node;
    else parent!.right = node;
    this.splay(node);
  }

  find(key: number): boolean {
    let cur = this.root;
    let last: SplayNode | null = null;
    while (cur) {
      last = cur;
      if (key === cur.key) {
        this.splay(cur);
        return true;
      } else if (key < cur.key) cur = cur.left;
      else cur = cur.right;
    }
    if (last) this.splay(last); // 見つからなくても最後にたどり着いたノードを根に上げる
    return false;
  }

  inorder(): number[] {
    const result: number[] = [];
    const visit = (node: SplayNode | null): void => {
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

struct SplayNode {
    int key;
    SplayNode* left = nullptr;
    SplayNode* right = nullptr;
    SplayNode* parent = nullptr;
    explicit SplayNode(int k) : key(k) {}
};

class SplayTree {
public:
    ~SplayTree() { destroy(root); }

    void insert(int key) {
        if (!root) {
            root = new SplayNode(key);
            return;
        }
        SplayNode* cur = root;
        SplayNode* parent = nullptr;
        while (cur) {
            parent = cur;
            if (key < cur->key) cur = cur->left;
            else if (key > cur->key) cur = cur->right;
            else { splay(cur); return; } // 既存のキーでもアクセスしたので根に上げる
        }
        SplayNode* node = new SplayNode(key);
        node->parent = parent;
        if (key < parent->key) parent->left = node;
        else parent->right = node;
        splay(node);
    }

    bool find(int key) {
        SplayNode* cur = root;
        SplayNode* last = nullptr;
        while (cur) {
            last = cur;
            if (key == cur->key) { splay(cur); return true; }
            else if (key < cur->key) cur = cur->left;
            else cur = cur->right;
        }
        if (last) splay(last); // 見つからなくても最後にたどり着いたノードを根に上げる
        return false;
    }

    std::vector<int> inorder() const {
        std::vector<int> result;
        visit(root, result);
        return result;
    }

private:
    SplayNode* root = nullptr;

    void rotate(SplayNode* x) {
        SplayNode* p = x->parent;
        SplayNode* g = p->parent;
        if (p->left == x) {
            p->left = x->right;
            if (x->right) x->right->parent = p;
            x->right = p;
        } else {
            p->right = x->left;
            if (x->left) x->left->parent = p;
            x->left = p;
        }
        p->parent = x;
        x->parent = g;
        if (g) {
            if (g->left == p) g->left = x;
            else g->right = x;
        }
    }

    void splay(SplayNode* x) {
        while (x->parent) {
            SplayNode* p = x->parent;
            SplayNode* g = p->parent;
            if (!g) {
                rotate(x); // zig
            } else if ((g->left == p) == (p->left == x)) {
                rotate(p); // zig-zig
                rotate(x);
            } else {
                rotate(x); // zig-zag
                rotate(x);
            }
        }
        root = x;
    }

    static void visit(const SplayNode* node, std::vector<int>& result) {
        if (!node) return;
        visit(node->left, result);
        result.push_back(node->key);
        visit(node->right, result);
    }

    static void destroy(SplayNode* node) {
        if (!node) return;
        destroy(node->left);
        destroy(node->right);
        delete node;
    }
};
```

```rust
// 親ポインタを持つ木はアリーナ(Vec)+添字方式で実装する(borrow checkerと相性がよい)。
struct SplayNode {
    key: i32,
    left: Option<usize>,
    right: Option<usize>,
    parent: Option<usize>,
}

#[derive(Default)]
struct SplayTree {
    nodes: Vec<SplayNode>,
    root: Option<usize>,
}

impl SplayTree {
    fn rotate(&mut self, x: usize) {
        let p = self.nodes[x].parent.unwrap();
        let g = self.nodes[p].parent;
        if self.nodes[p].left == Some(x) {
            self.nodes[p].left = self.nodes[x].right;
            if let Some(xr) = self.nodes[x].right {
                self.nodes[xr].parent = Some(p);
            }
            self.nodes[x].right = Some(p);
        } else {
            self.nodes[p].right = self.nodes[x].left;
            if let Some(xl) = self.nodes[x].left {
                self.nodes[xl].parent = Some(p);
            }
            self.nodes[x].left = Some(p);
        }
        self.nodes[p].parent = Some(x);
        self.nodes[x].parent = g;
        if let Some(g) = g {
            if self.nodes[g].left == Some(p) {
                self.nodes[g].left = Some(x);
            } else {
                self.nodes[g].right = Some(x);
            }
        }
    }

    fn splay(&mut self, mut x: usize) {
        while let Some(p) = self.nodes[x].parent {
            match self.nodes[p].parent {
                None => self.rotate(x), // zig
                Some(g) => {
                    let zig_zig = (self.nodes[g].left == Some(p)) == (self.nodes[p].left == Some(x));
                    if zig_zig {
                        self.rotate(p); // zig-zig
                        self.rotate(x);
                    } else {
                        self.rotate(x); // zig-zag
                        self.rotate(x);
                    }
                }
            }
        }
        self.root = Some(x);
    }

    fn insert(&mut self, key: i32) {
        if self.root.is_none() {
            self.nodes.push(SplayNode { key, left: None, right: None, parent: None });
            self.root = Some(0);
            return;
        }
        let mut cur = self.root;
        let mut parent = None;
        while let Some(c) = cur {
            parent = Some(c);
            if key < self.nodes[c].key {
                cur = self.nodes[c].left;
            } else if key > self.nodes[c].key {
                cur = self.nodes[c].right;
            } else {
                self.splay(c); // 既存のキーでもアクセスしたので根に上げる
                return;
            }
        }
        let idx = self.nodes.len();
        let p = parent.unwrap();
        self.nodes.push(SplayNode { key, left: None, right: None, parent: Some(p) });
        if key < self.nodes[p].key {
            self.nodes[p].left = Some(idx);
        } else {
            self.nodes[p].right = Some(idx);
        }
        self.splay(idx);
    }

    fn find(&mut self, key: i32) -> bool {
        let mut cur = self.root;
        let mut last = None;
        while let Some(c) = cur {
            last = Some(c);
            if key == self.nodes[c].key {
                self.splay(c);
                return true;
            } else if key < self.nodes[c].key {
                cur = self.nodes[c].left;
            } else {
                cur = self.nodes[c].right;
            }
        }
        if let Some(l) = last {
            self.splay(l); // 見つからなくても最後にたどり着いたノードを根に上げる
        }
        false
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
class SplayNode
{
    public int Key;
    public SplayNode? Left, Right, Parent;
    public SplayNode(int key) { Key = key; }
}

class SplayTree
{
    public SplayNode? Root;

    void Rotate(SplayNode x)
    {
        var p = x.Parent!;
        var g = p.Parent;
        if (p.Left == x)
        {
            p.Left = x.Right;
            if (x.Right != null) x.Right.Parent = p;
            x.Right = p;
        }
        else
        {
            p.Right = x.Left;
            if (x.Left != null) x.Left.Parent = p;
            x.Left = p;
        }
        p.Parent = x;
        x.Parent = g;
        if (g != null)
        {
            if (g.Left == p) g.Left = x;
            else g.Right = x;
        }
    }

    void Splay(SplayNode x)
    {
        while (x.Parent != null)
        {
            var p = x.Parent;
            var g = p.Parent;
            if (g == null)
            {
                Rotate(x); // zig
            }
            else if ((g.Left == p) == (p.Left == x))
            {
                Rotate(p); // zig-zig
                Rotate(x);
            }
            else
            {
                Rotate(x); // zig-zag
                Rotate(x);
            }
        }
        Root = x;
    }

    public void Insert(int key)
    {
        if (Root == null) { Root = new SplayNode(key); return; }
        SplayNode? cur = Root;
        SplayNode? parent = null;
        while (cur != null)
        {
            parent = cur;
            if (key < cur.Key) cur = cur.Left;
            else if (key > cur.Key) cur = cur.Right;
            else { Splay(cur); return; } // 既存のキーでもアクセスしたので根に上げる
        }
        var node = new SplayNode(key) { Parent = parent };
        if (key < parent!.Key) parent.Left = node;
        else parent.Right = node;
        Splay(node);
    }

    public bool Find(int key)
    {
        var cur = Root;
        SplayNode? last = null;
        while (cur != null)
        {
            last = cur;
            if (key == cur.Key) { Splay(cur); return true; }
            else if (key < cur.Key) cur = cur.Left;
            else cur = cur.Right;
        }
        if (last != null) Splay(last); // 見つからなくても最後にたどり着いたノードを根に上げる
        return false;
    }

    public List<int> Inorder()
    {
        var result = new List<int>();
        void Visit(SplayNode? node)
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
