---
name: B木
category: データ構造
subcategory: 木構造
complexity: O(log n)
summary: 1ノードに複数キーを持たせ木を浅く保つ。ディスクI/Oを最小化するためデータベースやファイルシステムで多用される。
---

## 概要

赤黒木やAVL木は「メモリ上での」平衡木として優秀だが、データがディスク(あるいはSSD)に保存されている場合は事情が異なる。ディスクへの1回のアクセスは、メモリアクセスに比べて桁違いに遅い。B木は、**1つのノードに複数のキーを持たせる**ことで木を大幅に「浅く」し、目的のデータにたどり着くまでの**ディスクアクセス回数そのものを最小化する**ことに特化した木構造。データベースやファイルシステムの根幹を支えている。

## 仕組み

B木の各ノードは、二分探索木のように1つのキーだけでなく、**複数のキー(と、その間を埋める複数の子へのポインタ)**を持つ。

1. 1つのノードが持てるキーの数には上限(次数によって決まる)があり、これを超えそうになると、ノードを2つに分割し、中央のキーを親ノードへ押し上げる
2. これにより木は常に「下から上に成長する」形になり、全ての葉が同じ深さに揃った、非常に浅くバランスの取れた木構造が維持される
3. 探索は根から始め、各ノード内で「どの子ポインタへ進むべきか」をキーの範囲で判定しながら降りていく

「1ノードあたりのキー数を増やす」ことで木の高さを対数の底を大きくする形で圧縮する——これにより、数百万件のレコードがあっても、目的のデータまで数回のディスクアクセスで到達できるようになる。1ノードのサイズをディスクの1ブロック(ページ)のサイズに合わせて設計するのが実装上の定石。

## 特性・トレードオフ

- **計算量**: O(log n)だが、対数の底がノードの次数(数十〜数百になることもある)に比例するため、**実際の木の高さが赤黒木などより遥かに低くなる**。これが「ディスクアクセス回数の最小化」に直結する
- **B+木という発展形**: 実務のデータベースでは、全てのデータを葉ノードだけに持たせ、内部ノードは索引専用にする「B+木」がさらに広く使われている。範囲検索(ある値からある値までを列挙する)がしやすくなる利点がある
- **メモリ上の木との使い分け**: メモリ上だけで完結するデータには赤黒木やAVL木の方が適していることが多い。B木/B+木の真価は「ディスクI/Oのコストが支配的」な状況で発揮される
- **使いどころ**: MySQLやPostgreSQLなどのRDBMSのインデックス構造、ファイルシステム(NTFS、ext4など)のディレクトリ構造、ほぼ全ての永続化ストレージシステムの根幹技術

## 実装例

```python
class BTreeNode:
    def __init__(self, leaf: bool = True):
        self.keys: list[int] = []
        self.children: list["BTreeNode"] = []
        self.leaf = leaf


class BTree:
    def __init__(self, t: int = 3):
        self.t = t  # 最小次数
        self.root = BTreeNode(leaf=True)

    def search(self, key: int) -> bool:
        return self._search(self.root, key)

    def _search(self, node: BTreeNode, key: int) -> bool:
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        if i < len(node.keys) and node.keys[i] == key:
            return True
        if node.leaf:
            return False
        return self._search(node.children[i], key)

    def insert(self, key: int) -> None:
        root = self.root
        if len(root.keys) == 2 * self.t - 1:
            new_root = BTreeNode(leaf=False)
            new_root.children.append(root)
            self._split_child(new_root, 0)
            self.root = new_root
            self._insert_non_full(new_root, key)
        else:
            self._insert_non_full(root, key)

    def _split_child(self, parent: BTreeNode, index: int) -> None:
        t = self.t
        child = parent.children[index]
        new_node = BTreeNode(leaf=child.leaf)
        mid_key = child.keys[t - 1]

        new_node.keys = child.keys[t:]
        child.keys = child.keys[: t - 1]

        if not child.leaf:
            new_node.children = child.children[t:]
            child.children = child.children[:t]

        parent.children.insert(index + 1, new_node)
        parent.keys.insert(index, mid_key)

    def _insert_non_full(self, node: BTreeNode, key: int) -> None:
        i = len(node.keys) - 1
        if node.leaf:
            node.keys.append(0)
            while i >= 0 and key < node.keys[i]:
                node.keys[i + 1] = node.keys[i]
                i -= 1
            node.keys[i + 1] = key
        else:
            while i >= 0 and key < node.keys[i]:
                i -= 1
            i += 1
            if len(node.children[i].keys) == 2 * self.t - 1:
                self._split_child(node, i)
                if key > node.keys[i]:
                    i += 1
            self._insert_non_full(node.children[i], key)

    def inorder(self) -> list[int]:
        result: list[int] = []

        def visit(node: BTreeNode) -> None:
            if node.leaf:
                result.extend(node.keys)
                return
            for i, k in enumerate(node.keys):
                visit(node.children[i])
                result.append(k)
            visit(node.children[-1])

        visit(self.root)
        return result
```

```typescript
class BTreeNode {
  keys: number[] = [];
  children: BTreeNode[] = [];
  leaf: boolean;
  constructor(leaf: boolean) {
    this.leaf = leaf;
  }
}

class BTree {
  private t: number;
  root: BTreeNode;

  constructor(t: number) {
    this.t = t;
    this.root = new BTreeNode(true);
  }

  search(key: number): boolean {
    return this.searchNode(this.root, key);
  }
  private searchNode(node: BTreeNode, key: number): boolean {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    if (i < node.keys.length && node.keys[i] === key) return true;
    if (node.leaf) return false;
    return this.searchNode(node.children[i], key);
  }

  insert(key: number): void {
    const root = this.root;
    if (root.keys.length === 2 * this.t - 1) {
      const newRoot = new BTreeNode(false);
      newRoot.children.push(root);
      this.splitChild(newRoot, 0);
      this.root = newRoot;
      this.insertNonFull(newRoot, key);
    } else {
      this.insertNonFull(root, key);
    }
  }

  private splitChild(parent: BTreeNode, index: number): void {
    const t = this.t;
    const child = parent.children[index];
    const newNode = new BTreeNode(child.leaf);
    const midKey = child.keys[t - 1];

    newNode.keys = child.keys.slice(t);
    child.keys = child.keys.slice(0, t - 1);

    if (!child.leaf) {
      newNode.children = child.children.slice(t);
      child.children = child.children.slice(0, t);
    }

    parent.children.splice(index + 1, 0, newNode);
    parent.keys.splice(index, 0, midKey);
  }

  private insertNonFull(node: BTreeNode, key: number): void {
    let i = node.keys.length - 1;
    if (node.leaf) {
      node.keys.push(0);
      while (i >= 0 && key < node.keys[i]) {
        node.keys[i + 1] = node.keys[i];
        i--;
      }
      node.keys[i + 1] = key;
    } else {
      while (i >= 0 && key < node.keys[i]) i--;
      i++;
      if (node.children[i].keys.length === 2 * this.t - 1) {
        this.splitChild(node, i);
        if (key > node.keys[i]) i++;
      }
      this.insertNonFull(node.children[i], key);
    }
  }

  inorder(): number[] {
    const result: number[] = [];
    const visit = (node: BTreeNode) => {
      if (node.leaf) {
        result.push(...node.keys);
        return;
      }
      for (let i = 0; i < node.keys.length; i++) {
        visit(node.children[i]);
        result.push(node.keys[i]);
      }
      visit(node.children[node.children.length - 1]);
    };
    visit(this.root);
    return result;
  }
}
```

```cpp
#include <memory>
#include <vector>

struct BTreeNode {
    std::vector<int> keys;
    std::vector<std::unique_ptr<BTreeNode>> children;
    bool leaf;
    explicit BTreeNode(bool isLeaf) : leaf(isLeaf) {}
};

class BTree {
public:
    explicit BTree(int t) : t_(t), root_(std::make_unique<BTreeNode>(true)) {}

    bool search(int key) const { return searchNode(root_.get(), key); }

    void insert(int key) {
        if (static_cast<int>(root_->keys.size()) == 2 * t_ - 1) {
            auto newRoot = std::make_unique<BTreeNode>(false);
            newRoot->children.push_back(std::move(root_));
            splitChild(newRoot.get(), 0);
            root_ = std::move(newRoot);
        }
        insertNonFull(root_.get(), key);
    }

    std::vector<int> inorder() const {
        std::vector<int> result;
        visit(root_.get(), result);
        return result;
    }

private:
    int t_;
    std::unique_ptr<BTreeNode> root_;

    bool searchNode(const BTreeNode* node, int key) const {
        size_t i = 0;
        while (i < node->keys.size() && key > node->keys[i]) i++;
        if (i < node->keys.size() && node->keys[i] == key) return true;
        if (node->leaf) return false;
        return searchNode(node->children[i].get(), key);
    }

    void splitChild(BTreeNode* parent, int index) {
        BTreeNode* child = parent->children[index].get();
        auto newNode = std::make_unique<BTreeNode>(child->leaf);
        int midKey = child->keys[t_ - 1];

        newNode->keys.assign(child->keys.begin() + t_, child->keys.end());
        child->keys.resize(t_ - 1);

        if (!child->leaf) {
            newNode->children.reserve(child->children.size() - t_);
            for (size_t i = t_; i < child->children.size(); i++) {
                newNode->children.push_back(std::move(child->children[i]));
            }
            child->children.resize(t_);
        }

        parent->children.insert(parent->children.begin() + index + 1, std::move(newNode));
        parent->keys.insert(parent->keys.begin() + index, midKey);
    }

    void insertNonFull(BTreeNode* node, int key) {
        int i = static_cast<int>(node->keys.size()) - 1;
        if (node->leaf) {
            node->keys.push_back(0);
            while (i >= 0 && key < node->keys[i]) {
                node->keys[i + 1] = node->keys[i];
                i--;
            }
            node->keys[i + 1] = key;
        } else {
            while (i >= 0 && key < node->keys[i]) i--;
            i++;
            if (static_cast<int>(node->children[i]->keys.size()) == 2 * t_ - 1) {
                splitChild(node, i);
                if (key > node->keys[i]) i++;
            }
            insertNonFull(node->children[i].get(), key);
        }
    }

    void visit(const BTreeNode* node, std::vector<int>& result) const {
        if (node->leaf) {
            result.insert(result.end(), node->keys.begin(), node->keys.end());
            return;
        }
        for (size_t i = 0; i < node->keys.size(); i++) {
            visit(node->children[i].get(), result);
            result.push_back(node->keys[i]);
        }
        visit(node->children.back().get(), result);
    }
};
```

```rust
struct BTreeNode {
    keys: Vec<i32>,
    children: Vec<Box<BTreeNode>>,
    leaf: bool,
}

impl BTreeNode {
    fn new(leaf: bool) -> Self {
        BTreeNode { keys: Vec::new(), children: Vec::new(), leaf }
    }
}

struct BTree {
    t: usize,
    root: Box<BTreeNode>,
}

impl BTree {
    fn new(t: usize) -> Self {
        BTree { t, root: Box::new(BTreeNode::new(true)) }
    }

    fn search(&self, key: i32) -> bool {
        Self::search_node(&self.root, key)
    }
    fn search_node(node: &BTreeNode, key: i32) -> bool {
        let mut i = 0;
        while i < node.keys.len() && key > node.keys[i] {
            i += 1;
        }
        if i < node.keys.len() && node.keys[i] == key {
            return true;
        }
        if node.leaf {
            return false;
        }
        Self::search_node(&node.children[i], key)
    }

    fn insert(&mut self, key: i32) {
        if self.root.keys.len() == 2 * self.t - 1 {
            let old_root = std::mem::replace(&mut self.root, Box::new(BTreeNode::new(false)));
            self.root.children.push(old_root);
            Self::split_child(&mut self.root, 0, self.t);
        }
        Self::insert_non_full(&mut self.root, key, self.t);
    }

    fn split_child(parent: &mut BTreeNode, index: usize, t: usize) {
        let mid_key;
        let mut new_node;
        {
            let child = &mut parent.children[index];
            new_node = Box::new(BTreeNode::new(child.leaf));
            mid_key = child.keys[t - 1];
            new_node.keys = child.keys.split_off(t);
            child.keys.truncate(t - 1);
            if !child.leaf {
                new_node.children = child.children.split_off(t);
            }
        }
        parent.children.insert(index + 1, new_node);
        parent.keys.insert(index, mid_key);
    }

    fn insert_non_full(node: &mut BTreeNode, key: i32, t: usize) {
        if node.leaf {
            let mut i = node.keys.len();
            node.keys.push(0);
            while i > 0 && key < node.keys[i - 1] {
                node.keys[i] = node.keys[i - 1];
                i -= 1;
            }
            node.keys[i] = key;
        } else {
            let mut i = node.keys.len();
            while i > 0 && key < node.keys[i - 1] {
                i -= 1;
            }
            if node.children[i].keys.len() == 2 * t - 1 {
                Self::split_child(node, i, t);
                if key > node.keys[i] {
                    i += 1;
                }
            }
            Self::insert_non_full(&mut node.children[i], key, t);
        }
    }

    fn inorder(&self) -> Vec<i32> {
        let mut result = Vec::new();
        Self::visit(&self.root, &mut result);
        result
    }
    fn visit(node: &BTreeNode, result: &mut Vec<i32>) {
        if node.leaf {
            result.extend_from_slice(&node.keys);
            return;
        }
        for (i, &k) in node.keys.iter().enumerate() {
            Self::visit(&node.children[i], result);
            result.push(k);
        }
        Self::visit(node.children.last().unwrap(), result);
    }
}
```

```csharp
class BTreeNode
{
    public List<int> Keys = new();
    public List<BTreeNode> Children = new();
    public bool Leaf;
    public BTreeNode(bool leaf) { Leaf = leaf; }
}

class BTree
{
    private readonly int _t;
    public BTreeNode Root;

    public BTree(int t) { _t = t; Root = new BTreeNode(true); }

    public bool Search(int key) => SearchNode(Root, key);
    private bool SearchNode(BTreeNode node, int key)
    {
        int i = 0;
        while (i < node.Keys.Count && key > node.Keys[i]) i++;
        if (i < node.Keys.Count && node.Keys[i] == key) return true;
        if (node.Leaf) return false;
        return SearchNode(node.Children[i], key);
    }

    public void Insert(int key)
    {
        var root = Root;
        if (root.Keys.Count == 2 * _t - 1)
        {
            var newRoot = new BTreeNode(false);
            newRoot.Children.Add(root);
            SplitChild(newRoot, 0);
            Root = newRoot;
            InsertNonFull(newRoot, key);
        }
        else
        {
            InsertNonFull(root, key);
        }
    }

    private void SplitChild(BTreeNode parent, int index)
    {
        int t = _t;
        var child = parent.Children[index];
        var newNode = new BTreeNode(child.Leaf);
        int midKey = child.Keys[t - 1];
        newNode.Keys.AddRange(child.Keys.GetRange(t, child.Keys.Count - t));
        child.Keys.RemoveRange(t - 1, child.Keys.Count - (t - 1));
        if (!child.Leaf)
        {
            newNode.Children.AddRange(child.Children.GetRange(t, child.Children.Count - t));
            child.Children.RemoveRange(t, child.Children.Count - t);
        }
        parent.Children.Insert(index + 1, newNode);
        parent.Keys.Insert(index, midKey);
    }

    private void InsertNonFull(BTreeNode node, int key)
    {
        int i = node.Keys.Count - 1;
        if (node.Leaf)
        {
            node.Keys.Add(0);
            while (i >= 0 && key < node.Keys[i]) { node.Keys[i + 1] = node.Keys[i]; i--; }
            node.Keys[i + 1] = key;
        }
        else
        {
            while (i >= 0 && key < node.Keys[i]) i--;
            i++;
            if (node.Children[i].Keys.Count == 2 * _t - 1)
            {
                SplitChild(node, i);
                if (key > node.Keys[i]) i++;
            }
            InsertNonFull(node.Children[i], key);
        }
    }

    public List<int> InOrder()
    {
        var result = new List<int>();
        void Visit(BTreeNode node)
        {
            if (node.Leaf) { result.AddRange(node.Keys); return; }
            for (int i = 0; i < node.Keys.Count; i++) { Visit(node.Children[i]); result.Add(node.Keys[i]); }
            Visit(node.Children[^1]);
        }
        Visit(Root);
        return result;
    }
}
```
