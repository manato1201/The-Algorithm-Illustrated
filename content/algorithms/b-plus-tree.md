---
name: B+木
category: データ構造
subcategory: 木構造
complexity: O(log n)(探索・挿入・削除)、O(k)(範囲クエリ、kは該当件数)
summary: B木の全データを葉に集約し、葉同士を連結リストで繋ぐことで、点検索の効率を保ったまま範囲検索を大幅に高速化する、データベースのインデックスで最も広く使われる木構造。
---

## 概要

[B木](/algorithms/b-tree)は1ノードに複数キーを持たせることでディスクI/Oを削減する優れた構造だが、「30以上50未満の全レコードを取得する」のような範囲検索を行うと、木の中間ノードと葉を行ったり来たりする必要があり非効率になりがちである。B+木は、B木を実務のデータベース用途に合わせて改良した派生形で、「実際のデータ(レコードへのポインタ)は全て葉ノードにだけ格納し、内部ノードはキーによる道案内(インデックス)専用にする」という設計に加え、「全ての葉ノードを横方向の連結リストで繋ぐ」という工夫を加えることで、点検索の効率をほぼ落とさずに範囲検索を劇的に高速化した、ほぼ全ての実用データベースの標準インデックス構造である。

## 仕組み

1. 内部ノードは、[B木](/algorithms/b-tree)と同様に複数のキーと子へのポインタを持つが、実際のレコードへのポインタは一切持たない——純粋に「次にどの子を辿ればよいか」を判断するための道案内専用の役割に特化する
2. 葉ノードだけが実際のキーとレコードへのポインタ(またはレコード自体)を保持する
3. 全ての葉ノードは、キーの昇順に並んだ横方向の連結リストとして互いに連結されている
4. **点検索**(特定のキーを1つ探す): 根から内部ノードを辿って対応する葉に到達するのは[B木](/algorithms/b-tree)と同じ`O(log n)`
5. **範囲検索**(`a`以上`b`以下の全レコードを取得): まず`a`に対応する葉ノードまで根から`O(log n)`で辿り着いたら、あとは横方向の連結リストを`b`に到達するまでただ辿るだけでよい——内部ノードへ何度も戻る必要がなく、該当件数`k`に比例した`O(k)`の追加コストだけで済む

## 特性・トレードオフ

- **計算量**: 点検索・挿入・削除はいずれも[B木](/algorithms/b-tree)と同じ`O(log n)`。範囲検索は`O(log n + k)`(`k`は取得件数)と、B木で範囲検索のたびに内部ノードとの往復が発生するのに比べて大幅に効率的
- **[B木](/algorithms/b-tree)との使い分け**: レコードへのポインタが内部ノードにも分散するB木は、点検索1回あたりの平均コストがわずかに有利になりうる一方、範囲検索・全件走査(テーブルスキャン)ではB+木が圧倒的に有利——実務のデータベースが範囲検索(`WHERE age BETWEEN 20 AND 30`のようなクエリ)を頻繁に扱うため、ほぼ全ての主要RDBMS(MySQL、PostgreSQL等)がB+木を標準のインデックス構造として採用している
- **ディスクI/Oへの最適化**: [B木](/algorithms/b-tree)と同様、1ノードのサイズをディスクのブロックサイズに合わせることで、木の深さ(=ディスクアクセス回数)を最小限に抑える設計思想を引き継いでいる
- **使いどころ**: リレーショナルデータベースの主キー・セカンダリインデックス、ファイルシステムのディレクトリ構造、範囲検索が頻繁に発生するあらゆる永続化ストレージのインデックス設計におけるデファクトスタンダード

## 実装例

```python
class BPlusNode:
    def __init__(self, leaf: bool = True):
        self.leaf = leaf
        self.keys: list[int] = []
        self.children: list = []  # 内部ノード: BPlusNode、葉ノード: 値
        self.next: "BPlusNode | None" = None  # 葉ノード同士の連結リスト


class BPlusTree:
    def __init__(self, t: int = 3):
        self.t = t
        self.root = BPlusNode(leaf=True)

    def search(self, key: int):
        node = self.root
        while not node.leaf:
            i = 0
            while i < len(node.keys) and key >= node.keys[i]:
                i += 1
            node = node.children[i]
        for i, k in enumerate(node.keys):
            if k == key:
                return node.children[i]
        return None

    def range_query(self, lo: int, hi: int) -> list[tuple[int, object]]:
        node = self.root
        while not node.leaf:
            i = 0
            while i < len(node.keys) and lo >= node.keys[i]:
                i += 1
            node = node.children[i]
        result = []
        while node:
            for i, k in enumerate(node.keys):
                if lo <= k <= hi:
                    result.append((k, node.children[i]))
                elif k > hi:
                    return result
            node = node.next
        return result

    def insert(self, key: int, value) -> None:
        root = self.root
        if len(root.keys) == 2 * self.t - 1:
            new_root = BPlusNode(leaf=False)
            new_root.children.append(root)
            self._split_child(new_root, 0)
            self.root = new_root
            self._insert_non_full(new_root, key, value)
        else:
            self._insert_non_full(root, key, value)

    def _split_child(self, parent: BPlusNode, index: int) -> None:
        t = self.t
        child = parent.children[index]
        new_node = BPlusNode(leaf=child.leaf)

        if child.leaf:
            new_node.keys = child.keys[t - 1 :]
            new_node.children = child.children[t - 1 :]
            child.keys = child.keys[: t - 1]
            child.children = child.children[: t - 1]
            new_node.next = child.next
            child.next = new_node
            sep_key = new_node.keys[0]
        else:
            sep_key = child.keys[t - 1]
            new_node.keys = child.keys[t:]
            new_node.children = child.children[t:]
            child.keys = child.keys[: t - 1]
            child.children = child.children[:t]

        parent.children.insert(index + 1, new_node)
        parent.keys.insert(index, sep_key)

    def _insert_non_full(self, node: BPlusNode, key: int, value) -> None:
        if node.leaf:
            i = 0
            while i < len(node.keys) and key > node.keys[i]:
                i += 1
            if i < len(node.keys) and node.keys[i] == key:
                node.children[i] = value  # 既存キーは値を更新
                return
            node.keys.insert(i, key)
            node.children.insert(i, value)
        else:
            i = 0
            while i < len(node.keys) and key >= node.keys[i]:
                i += 1
            if len(node.children[i].keys) == 2 * self.t - 1:
                self._split_child(node, i)
                if key >= node.keys[i]:
                    i += 1
            self._insert_non_full(node.children[i], key, value)
```

```typescript
class BPlusNode {
  leaf: boolean;
  keys: number[] = [];
  children: (BPlusNode | string)[] = [];
  next: BPlusNode | null = null;
  constructor(leaf: boolean) {
    this.leaf = leaf;
  }
}

class BPlusTree {
  private t: number;
  root: BPlusNode;

  constructor(t: number) {
    this.t = t;
    this.root = new BPlusNode(true);
  }

  search(key: number): string | null {
    let node = this.root;
    while (!node.leaf) {
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      node = node.children[i] as BPlusNode;
    }
    for (let i = 0; i < node.keys.length; i++) {
      if (node.keys[i] === key) return node.children[i] as string;
    }
    return null;
  }

  rangeQuery(lo: number, hi: number): [number, string][] {
    let node = this.root;
    while (!node.leaf) {
      let i = 0;
      while (i < node.keys.length && lo >= node.keys[i]) i++;
      node = node.children[i] as BPlusNode;
    }
    const result: [number, string][] = [];
    let cur: BPlusNode | null = node;
    while (cur) {
      for (let i = 0; i < cur.keys.length; i++) {
        const k = cur.keys[i];
        if (k >= lo && k <= hi) result.push([k, cur.children[i] as string]);
        else if (k > hi) return result;
      }
      cur = cur.next;
    }
    return result;
  }

  insert(key: number, value: string): void {
    const root = this.root;
    if (root.keys.length === 2 * this.t - 1) {
      const newRoot = new BPlusNode(false);
      newRoot.children.push(root);
      this.splitChild(newRoot, 0);
      this.root = newRoot;
      this.insertNonFull(newRoot, key, value);
    } else {
      this.insertNonFull(root, key, value);
    }
  }

  private splitChild(parent: BPlusNode, index: number): void {
    const t = this.t;
    const child = parent.children[index] as BPlusNode;
    const newNode = new BPlusNode(child.leaf);
    let sepKey: number;

    if (child.leaf) {
      newNode.keys = child.keys.slice(t - 1);
      newNode.children = child.children.slice(t - 1);
      child.keys = child.keys.slice(0, t - 1);
      child.children = child.children.slice(0, t - 1);
      newNode.next = child.next;
      child.next = newNode;
      sepKey = newNode.keys[0];
    } else {
      sepKey = child.keys[t - 1];
      newNode.keys = child.keys.slice(t);
      newNode.children = child.children.slice(t);
      child.keys = child.keys.slice(0, t - 1);
      child.children = child.children.slice(0, t);
    }

    parent.children.splice(index + 1, 0, newNode);
    parent.keys.splice(index, 0, sepKey);
  }

  private insertNonFull(node: BPlusNode, key: number, value: string): void {
    if (node.leaf) {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) i++;
      if (i < node.keys.length && node.keys[i] === key) {
        node.children[i] = value;
        return;
      }
      node.keys.splice(i, 0, key);
      node.children.splice(i, 0, value);
    } else {
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      if ((node.children[i] as BPlusNode).keys.length === 2 * this.t - 1) {
        this.splitChild(node, i);
        if (key >= node.keys[i]) i++;
      }
      this.insertNonFull(node.children[i] as BPlusNode, key, value);
    }
  }
}
```

```cpp
#include <memory>
#include <string>
#include <variant>
#include <vector>

struct BPlusNode {
    bool leaf;
    std::vector<int> keys;
    std::vector<std::unique_ptr<BPlusNode>> children;  // 内部ノードのみ使用
    std::vector<std::string> values;                   // 葉ノードのみ使用
    BPlusNode* next = nullptr;                          // 葉ノード同士の連結リスト
    explicit BPlusNode(bool isLeaf) : leaf(isLeaf) {}
};

class BPlusTree {
public:
    explicit BPlusTree(int t) : t_(t), root_(std::make_unique<BPlusNode>(true)) {}

    const std::string* search(int key) const {
        BPlusNode* node = root_.get();
        while (!node->leaf) {
            size_t i = 0;
            while (i < node->keys.size() && key >= node->keys[i]) i++;
            node = node->children[i].get();
        }
        for (size_t i = 0; i < node->keys.size(); i++) {
            if (node->keys[i] == key) return &node->values[i];
        }
        return nullptr;
    }

    std::vector<std::pair<int, std::string>> rangeQuery(int lo, int hi) const {
        BPlusNode* node = root_.get();
        while (!node->leaf) {
            size_t i = 0;
            while (i < node->keys.size() && lo >= node->keys[i]) i++;
            node = node->children[i].get();
        }
        std::vector<std::pair<int, std::string>> result;
        while (node) {
            for (size_t i = 0; i < node->keys.size(); i++) {
                int k = node->keys[i];
                if (k >= lo && k <= hi) {
                    result.emplace_back(k, node->values[i]);
                } else if (k > hi) {
                    return result;
                }
            }
            node = node->next;
        }
        return result;
    }

    void insert(int key, const std::string& value) {
        if (static_cast<int>(root_->keys.size()) == 2 * t_ - 1) {
            auto newRoot = std::make_unique<BPlusNode>(false);
            newRoot->children.push_back(std::move(root_));
            splitChild(newRoot.get(), 0);
            root_ = std::move(newRoot);
        }
        insertNonFull(root_.get(), key, value);
    }

private:
    int t_;
    std::unique_ptr<BPlusNode> root_;

    void splitChild(BPlusNode* parent, int index) {
        BPlusNode* child = parent->children[index].get();
        auto newNode = std::make_unique<BPlusNode>(child->leaf);
        int sepKey;

        if (child->leaf) {
            newNode->keys.assign(child->keys.begin() + (t_ - 1), child->keys.end());
            newNode->values.assign(child->values.begin() + (t_ - 1), child->values.end());
            child->keys.resize(t_ - 1);
            child->values.resize(t_ - 1);
            newNode->next = child->next;
            child->next = newNode.get();
            sepKey = newNode->keys[0];
        } else {
            sepKey = child->keys[t_ - 1];
            newNode->keys.assign(child->keys.begin() + t_, child->keys.end());
            for (size_t i = t_; i < child->children.size(); i++) {
                newNode->children.push_back(std::move(child->children[i]));
            }
            child->keys.resize(t_ - 1);
            child->children.resize(t_);
        }

        parent->children.insert(parent->children.begin() + index + 1, std::move(newNode));
        parent->keys.insert(parent->keys.begin() + index, sepKey);
    }

    void insertNonFull(BPlusNode* node, int key, const std::string& value) {
        if (node->leaf) {
            size_t i = 0;
            while (i < node->keys.size() && key > node->keys[i]) i++;
            if (i < node->keys.size() && node->keys[i] == key) {
                node->values[i] = value;
                return;
            }
            node->keys.insert(node->keys.begin() + i, key);
            node->values.insert(node->values.begin() + i, value);
        } else {
            size_t i = 0;
            while (i < node->keys.size() && key >= node->keys[i]) i++;
            if (static_cast<int>(node->children[i]->keys.size()) == 2 * t_ - 1) {
                splitChild(node, static_cast<int>(i));
                if (key >= node->keys[i]) i++;
            }
            insertNonFull(node->children[i].get(), key, value);
        }
    }
};
```

```rust
struct BPlusNode {
    leaf: bool,
    keys: Vec<i32>,
    children: Vec<Box<BPlusNode>>, // 内部ノードのみ使用
    values: Vec<String>,           // 葉ノードのみ使用
    next: *mut BPlusNode,          // 葉ノード同士の連結リスト(簡略化のため生ポインタで表現)
}

impl BPlusNode {
    fn new(leaf: bool) -> Self {
        BPlusNode { leaf, keys: Vec::new(), children: Vec::new(), values: Vec::new(), next: std::ptr::null_mut() }
    }
}

struct BPlusTree {
    t: usize,
    root: Box<BPlusNode>,
}

impl BPlusTree {
    fn new(t: usize) -> Self {
        BPlusTree { t, root: Box::new(BPlusNode::new(true)) }
    }

    fn search(&self, key: i32) -> Option<&String> {
        let mut node: &BPlusNode = &self.root;
        while !node.leaf {
            let mut i = 0;
            while i < node.keys.len() && key >= node.keys[i] {
                i += 1;
            }
            node = &node.children[i];
        }
        for (i, &k) in node.keys.iter().enumerate() {
            if k == key {
                return Some(&node.values[i]);
            }
        }
        None
    }

    fn range_query(&self, lo: i32, hi: i32) -> Vec<(i32, String)> {
        let mut node: &BPlusNode = &self.root;
        while !node.leaf {
            let mut i = 0;
            while i < node.keys.len() && lo >= node.keys[i] {
                i += 1;
            }
            node = &node.children[i];
        }
        let mut result = Vec::new();
        let mut cur: *const BPlusNode = node as *const BPlusNode;
        while !cur.is_null() {
            let n = unsafe { &*cur };
            for (i, &k) in n.keys.iter().enumerate() {
                if k >= lo && k <= hi {
                    result.push((k, n.values[i].clone()));
                } else if k > hi {
                    return result;
                }
            }
            cur = n.next;
        }
        result
    }

    fn insert(&mut self, key: i32, value: String) {
        if self.root.keys.len() == 2 * self.t - 1 {
            let old_root = std::mem::replace(&mut self.root, Box::new(BPlusNode::new(false)));
            self.root.children.push(old_root);
            Self::split_child(&mut self.root, 0, self.t);
        }
        Self::insert_non_full(&mut self.root, key, value, self.t);
    }

    fn split_child(parent: &mut BPlusNode, index: usize, t: usize) {
        let sep_key;
        let mut new_node;
        {
            let child = &mut parent.children[index];
            new_node = Box::new(BPlusNode::new(child.leaf));
            if child.leaf {
                new_node.keys = child.keys.split_off(t - 1);
                new_node.values = child.values.split_off(t - 1);
                new_node.next = child.next;
                sep_key = new_node.keys[0];
            } else {
                sep_key = child.keys[t - 1];
                new_node.keys = child.keys.split_off(t);
                child.keys.truncate(t - 1);
                new_node.children = child.children.split_off(t);
            }
        }
        if parent.children[index].leaf {
            parent.children[index].next = new_node.as_mut() as *mut BPlusNode;
        }
        parent.children.insert(index + 1, new_node);
        parent.keys.insert(index, sep_key);
    }

    fn insert_non_full(node: &mut BPlusNode, key: i32, value: String, t: usize) {
        if node.leaf {
            let mut i = 0;
            while i < node.keys.len() && key > node.keys[i] {
                i += 1;
            }
            if i < node.keys.len() && node.keys[i] == key {
                node.values[i] = value;
                return;
            }
            node.keys.insert(i, key);
            node.values.insert(i, value);
        } else {
            let mut i = 0;
            while i < node.keys.len() && key >= node.keys[i] {
                i += 1;
            }
            if node.children[i].keys.len() == 2 * t - 1 {
                Self::split_child(node, i, t);
                if key >= node.keys[i] {
                    i += 1;
                }
            }
            Self::insert_non_full(&mut node.children[i], key, value, t);
        }
    }
}
```

```csharp
class BPlusNode
{
    public bool Leaf;
    public List<int> Keys = new();
    public List<object> Children = new(); // 内部ノード: BPlusNode、葉ノード: string値
    public BPlusNode? Next;
    public BPlusNode(bool leaf) { Leaf = leaf; }
}

class BPlusTree
{
    private readonly int _t;
    public BPlusNode Root;

    public BPlusTree(int t) { _t = t; Root = new BPlusNode(true); }

    public string? Search(int key)
    {
        var node = Root;
        while (!node.Leaf)
        {
            int i = 0;
            while (i < node.Keys.Count && key >= node.Keys[i]) i++;
            node = (BPlusNode)node.Children[i];
        }
        for (int i = 0; i < node.Keys.Count; i++) if (node.Keys[i] == key) return (string)node.Children[i];
        return null;
    }

    public List<(int key, string value)> RangeQuery(int lo, int hi)
    {
        var node = Root;
        while (!node.Leaf)
        {
            int i = 0;
            while (i < node.Keys.Count && lo >= node.Keys[i]) i++;
            node = (BPlusNode)node.Children[i];
        }
        var result = new List<(int, string)>();
        BPlusNode? cur = node;
        while (cur != null)
        {
            for (int i = 0; i < cur.Keys.Count; i++)
            {
                int k = cur.Keys[i];
                if (k >= lo && k <= hi) result.Add((k, (string)cur.Children[i]));
                else if (k > hi) return result;
            }
            cur = cur.Next;
        }
        return result;
    }

    public void Insert(int key, string value)
    {
        var root = Root;
        if (root.Keys.Count == 2 * _t - 1)
        {
            var newRoot = new BPlusNode(false);
            newRoot.Children.Add(root);
            SplitChild(newRoot, 0);
            Root = newRoot;
            InsertNonFull(newRoot, key, value);
        }
        else
        {
            InsertNonFull(root, key, value);
        }
    }

    private void SplitChild(BPlusNode parent, int index)
    {
        int t = _t;
        var child = (BPlusNode)parent.Children[index];
        var newNode = new BPlusNode(child.Leaf);
        int sepKey;
        if (child.Leaf)
        {
            newNode.Keys.AddRange(child.Keys.GetRange(t - 1, child.Keys.Count - (t - 1)));
            newNode.Children.AddRange(child.Children.GetRange(t - 1, child.Children.Count - (t - 1)));
            child.Keys.RemoveRange(t - 1, child.Keys.Count - (t - 1));
            child.Children.RemoveRange(t - 1, child.Children.Count - (t - 1));
            newNode.Next = child.Next;
            child.Next = newNode;
            sepKey = newNode.Keys[0];
        }
        else
        {
            sepKey = child.Keys[t - 1];
            newNode.Keys.AddRange(child.Keys.GetRange(t, child.Keys.Count - t));
            newNode.Children.AddRange(child.Children.GetRange(t, child.Children.Count - t));
            child.Keys.RemoveRange(t - 1, child.Keys.Count - (t - 1));
            child.Children.RemoveRange(t, child.Children.Count - t);
        }
        parent.Children.Insert(index + 1, newNode);
        parent.Keys.Insert(index, sepKey);
    }

    private void InsertNonFull(BPlusNode node, int key, string value)
    {
        if (node.Leaf)
        {
            int i = 0;
            while (i < node.Keys.Count && key > node.Keys[i]) i++;
            if (i < node.Keys.Count && node.Keys[i] == key) { node.Children[i] = value; return; }
            node.Keys.Insert(i, key);
            node.Children.Insert(i, value);
        }
        else
        {
            int i = 0;
            while (i < node.Keys.Count && key >= node.Keys[i]) i++;
            if (((BPlusNode)node.Children[i]).Keys.Count == 2 * _t - 1)
            {
                SplitChild(node, i);
                if (key >= node.Keys[i]) i++;
            }
            InsertNonFull((BPlusNode)node.Children[i], key, value);
        }
    }
}
```
