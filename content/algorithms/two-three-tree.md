---
name: 2-3木
category: データ構造
subcategory: 木構造
complexity: O(log n)(探索・挿入・削除)
summary: 各ノードが2個または3個の子を持つことを許し、葉の深さを常に揃えることで、回転操作を使わずに完全な平衡を維持するB木の最も単純な特殊ケース。
---

## 概要

[AVL木](/algorithms/avl-tree)や[赤黒木](/algorithms/red-black-tree)は、通常の二分木に「回転」という補正操作を加えることで平衡を保つが、2-3木は発想を変え、そもそも「1ノードに1つのキーだけ」という二分木の制約を緩めることで平衡を保証する。各ノードは2個の子(2-ノード、1つのキーを持つ)か3個の子(3-ノード、2つのキーを持つ)のどちらかを持つことができ、この柔軟性のおかげで、新しいキーの挿入時に木の高さを増やさずに吸収できる場面が増え、結果として全ての葉が常に同じ深さに揃う、という強い平衡性を回転操作なしで実現する。[B木](/algorithms/b-tree)の次数(1ノードあたりの子の数)を最小の3に固定した特殊ケースと位置づけられる。

## 仕組み

1. **2-ノード**: 1つのキー`k`と2つの子(`k`未満の子、`k`以上の子)を持つ、通常の二分探索木のノードと同じ形
2. **3-ノード**: 2つのキー`k1 < k2`と3つの子(`k1`未満、`k1`以上`k2`未満、`k2`以上の3つの範囲にそれぞれ対応)を持つ
3. **探索**: 根から、各ノードのキーと比較しながら該当する子へ降りていく。2-ノードなら2択、3-ノードなら3択の分岐になる
4. **挿入**: 適切な葉ノードにキーを追加する。追加先が2-ノードなら3-ノードになるだけで済むが、既に3-ノードだった場合は、そのノードを2つに分割し、中央のキーを親ノードへ押し上げる(この押し上げが親を3-ノードから4-ノード相当にしてしまう場合は、さらに親を分割して1つ上へ押し上げる、という連鎖が根まで続くことがある)。根が分割されると木全体の高さが1増える——これが2-3木で木の高さが増える唯一のタイミングであり、常に根から全ての葉まで同じ深さになる理由である
5. **削除**: 挿入の逆で、ノードのキーが0個になりそうな場合、隣接する兄弟ノードからキーを借りるか、兄弟と統合(マージ)して親からキーを1つ引き下ろす、という調整を行う

## 特性・トレードオフ

- **計算量**: 木の高さが常に`O(log n)`に保たれるため、探索・挿入・削除いずれも`O(log n)`——[AVL木](/algorithms/avl-tree)や[赤黒木](/algorithms/red-black-tree)と同じ計算量のクラスだが、達成の仕方(ノードあたりのキー数を増やす vs. 回転で調整する)が異なる
- **[B木](/algorithms/b-tree)の特殊ケースとしての位置づけ**: 2-3木は、1ノードに最大2つのキー(最大3つの子)を持てる[B木](/algorithms/b-tree)そのものであり、B木の一般論(次数を大きくするほどディスクI/O回数が減る)を理解する最も単純な入り口になる
- **実装の複雑さ**: 2種類のノード(2-ノードと3-ノード)を区別して扱う必要があり、[赤黒木](/algorithms/red-black-tree)(2-3木を二分木として実装したものと理論的に同値)の方が、統一的な二分木のノード構造のまま実装できるため、実務では[赤黒木](/algorithms/red-black-tree)が選ばれることが多い
- **使いどころ**: 平衡木の理論を学ぶ際の[B木](/algorithms/b-tree)・[赤黒木](/algorithms/red-black-tree)双方への橋渡しとしての教育的価値、関数型言語における永続データ構造(2-3-4木の変種であるfinger treeなど)の理論的基盤

## 実装例

```python
class Node:
    __slots__ = ("keys", "children")

    def __init__(self, keys, children=None):
        self.keys = keys
        self.children = children or []

    def is_leaf(self):
        return len(self.children) == 0


class TwoThreeTree:
    def __init__(self):
        self.root = None

    def insert(self, key):
        if self.root is None:
            self.root = Node([key])
            return
        new_root, split = self._insert(self.root, key)
        if split is None:
            self.root = new_root
        else:
            promoted, right = split
            self.root = Node([promoted], [new_root, right])

    def _insert(self, node, key):
        if node.is_leaf():
            if key in node.keys:
                return node, None
            node.keys.append(key)
            node.keys.sort()
        else:
            i = 0
            while i < len(node.keys) and key > node.keys[i]:
                i += 1
            if i < len(node.keys) and node.keys[i] == key:
                return node, None
            new_child, split = self._insert(node.children[i], key)
            node.children[i] = new_child
            if split is None:
                return node, None
            promoted, right = split
            node.keys.insert(i, promoted)
            node.children.insert(i + 1, right)
        if len(node.keys) <= 2:
            return node, None
        return self._split(node)

    def _split(self, node):
        # 3キーになった過剰ノードを2つに割り、中央のキーを親へ押し上げる
        promoted = node.keys[1]
        if node.is_leaf():
            left = Node([node.keys[0]])
            right = Node([node.keys[2]])
        else:
            left = Node([node.keys[0]], node.children[:2])
            right = Node([node.keys[2]], node.children[2:])
        return left, (promoted, right)

    def search(self, key) -> bool:
        node = self.root
        while node is not None:
            i = 0
            while i < len(node.keys) and key > node.keys[i]:
                i += 1
            if i < len(node.keys) and node.keys[i] == key:
                return True
            if node.is_leaf():
                return False
            node = node.children[i]
        return False

    def inorder(self) -> list[int]:
        result = []

        def visit(node):
            if node is None:
                return
            if node.is_leaf():
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
class Node {
  keys: number[];
  children: Node[];
  constructor(keys: number[], children: Node[] = []) {
    this.keys = keys;
    this.children = children;
  }
  isLeaf(): boolean {
    return this.children.length === 0;
  }
}

type Split = [number, Node] | null;

class TwoThreeTree {
  root: Node | null = null;

  insert(key: number): void {
    if (this.root === null) {
      this.root = new Node([key]);
      return;
    }
    const [newRoot, split] = this.insertNode(this.root, key);
    if (split === null) {
      this.root = newRoot;
    } else {
      const [promoted, right] = split;
      this.root = new Node([promoted], [newRoot, right]);
    }
  }

  private insertNode(node: Node, key: number): [Node, Split] {
    if (node.isLeaf()) {
      if (node.keys.includes(key)) return [node, null];
      node.keys.push(key);
      node.keys.sort((a, b) => a - b);
    } else {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) i++;
      if (i < node.keys.length && node.keys[i] === key) return [node, null];
      const [newChild, split] = this.insertNode(node.children[i], key);
      node.children[i] = newChild;
      if (split === null) return [node, null];
      const [promoted, right] = split;
      node.keys.splice(i, 0, promoted);
      node.children.splice(i + 1, 0, right);
    }
    if (node.keys.length <= 2) return [node, null];
    return this.split(node);
  }

  private split(node: Node): [Node, Split] {
    const promoted = node.keys[1];
    const left = node.isLeaf() ? new Node([node.keys[0]]) : new Node([node.keys[0]], node.children.slice(0, 2));
    const right = node.isLeaf() ? new Node([node.keys[2]]) : new Node([node.keys[2]], node.children.slice(2));
    return [left, [promoted, right]];
  }

  search(key: number): boolean {
    let node = this.root;
    while (node !== null) {
      let i = 0;
      while (i < node.keys.length && key > node.keys[i]) i++;
      if (i < node.keys.length && node.keys[i] === key) return true;
      if (node.isLeaf()) return false;
      node = node.children[i];
    }
    return false;
  }

  inorder(): number[] {
    const result: number[] = [];
    const visit = (node: Node | null): void => {
      if (node === null) return;
      if (node.isLeaf()) {
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
#include <optional>
#include <utility>
#include <vector>
#include <algorithm>

struct Node {
    std::vector<int> keys;
    std::vector<std::unique_ptr<Node>> children;
    bool isLeaf() const { return children.empty(); }
};

using SplitResult = std::optional<std::pair<int, std::unique_ptr<Node>>>;

std::pair<std::unique_ptr<Node>, SplitResult> splitNode(std::unique_ptr<Node> node) {
    int promoted = node->keys[1];
    auto left = std::make_unique<Node>();
    auto right = std::make_unique<Node>();
    left->keys = {node->keys[0]};
    right->keys = {node->keys[2]};
    if (!node->isLeaf()) {
        left->children.push_back(std::move(node->children[0]));
        left->children.push_back(std::move(node->children[1]));
        right->children.push_back(std::move(node->children[2]));
        right->children.push_back(std::move(node->children[3]));
    }
    return {std::move(left), std::make_optional(std::make_pair(promoted, std::move(right)))};
}

std::pair<std::unique_ptr<Node>, SplitResult> insertNode(std::unique_ptr<Node> node, int key) {
    if (node->isLeaf()) {
        if (std::find(node->keys.begin(), node->keys.end(), key) != node->keys.end()) {
            return {std::move(node), std::nullopt};
        }
        node->keys.push_back(key);
        std::sort(node->keys.begin(), node->keys.end());
    } else {
        int i = 0;
        while (i < static_cast<int>(node->keys.size()) && key > node->keys[i]) i++;
        if (i < static_cast<int>(node->keys.size()) && node->keys[i] == key) {
            return {std::move(node), std::nullopt};
        }
        auto [newChild, split] = insertNode(std::move(node->children[i]), key);
        node->children[i] = std::move(newChild);
        if (!split) return {std::move(node), std::nullopt};
        auto [promoted, right] = std::move(*split);
        node->keys.insert(node->keys.begin() + i, promoted);
        node->children.insert(node->children.begin() + i + 1, std::move(right));
    }
    if (node->keys.size() <= 2) return {std::move(node), std::nullopt};
    return splitNode(std::move(node));
}

class TwoThreeTree {
public:
    void insert(int key) {
        if (!root) {
            root = std::make_unique<Node>();
            root->keys = {key};
            return;
        }
        auto [newRoot, split] = insertNode(std::move(root), key);
        if (!split) {
            root = std::move(newRoot);
        } else {
            auto [promoted, right] = std::move(*split);
            auto newRootNode = std::make_unique<Node>();
            newRootNode->keys = {promoted};
            newRootNode->children.push_back(std::move(newRoot));
            newRootNode->children.push_back(std::move(right));
            root = std::move(newRootNode);
        }
    }

    bool search(int key) const {
        Node* node = root.get();
        while (node) {
            int i = 0;
            while (i < static_cast<int>(node->keys.size()) && key > node->keys[i]) i++;
            if (i < static_cast<int>(node->keys.size()) && node->keys[i] == key) return true;
            if (node->isLeaf()) return false;
            node = node->children[i].get();
        }
        return false;
    }

    std::vector<int> inorder() const {
        std::vector<int> result;
        visit(root.get(), result);
        return result;
    }

private:
    std::unique_ptr<Node> root;

    static void visit(const Node* node, std::vector<int>& result) {
        if (!node) return;
        if (node->isLeaf()) {
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
struct Node {
    keys: Vec<i32>,
    children: Vec<usize>, // アリーナへのインデックス。空なら葉
}

#[derive(Default)]
struct TwoThreeTree {
    arena: Vec<Node>,
    root: Option<usize>,
}

impl TwoThreeTree {
    fn insert(&mut self, key: i32) {
        let root_idx = match self.root {
            None => {
                let idx = self.arena.len();
                self.arena.push(Node { keys: vec![key], children: vec![] });
                self.root = Some(idx);
                return;
            }
            Some(idx) => idx,
        };
        if let Some((promoted, right_idx)) = self.insert_node(root_idx, key) {
            let new_root_idx = self.arena.len();
            self.arena.push(Node { keys: vec![promoted], children: vec![root_idx, right_idx] });
            self.root = Some(new_root_idx);
        }
    }

    fn insert_node(&mut self, idx: usize, key: i32) -> Option<(i32, usize)> {
        let is_leaf = self.arena[idx].children.is_empty();
        if is_leaf {
            if self.arena[idx].keys.contains(&key) {
                return None;
            }
            self.arena[idx].keys.push(key);
            self.arena[idx].keys.sort();
        } else {
            let mut i = 0;
            while i < self.arena[idx].keys.len() && key > self.arena[idx].keys[i] {
                i += 1;
            }
            if i < self.arena[idx].keys.len() && self.arena[idx].keys[i] == key {
                return None;
            }
            let child_idx = self.arena[idx].children[i];
            let split = self.insert_node(child_idx, key);
            match split {
                Some((promoted, right_idx)) => {
                    self.arena[idx].keys.insert(i, promoted);
                    self.arena[idx].children.insert(i + 1, right_idx);
                }
                None => return None,
            }
        }
        if self.arena[idx].keys.len() <= 2 {
            return None;
        }
        Some(self.split_node(idx))
    }

    fn split_node(&mut self, idx: usize) -> (i32, usize) {
        let promoted = self.arena[idx].keys[1];
        let is_leaf = self.arena[idx].children.is_empty();
        let right_key = self.arena[idx].keys[2];
        let right_children = if is_leaf {
            vec![]
        } else {
            vec![self.arena[idx].children[2], self.arena[idx].children[3]]
        };
        let right_idx = self.arena.len();
        self.arena.push(Node { keys: vec![right_key], children: right_children });

        let left_key = self.arena[idx].keys[0];
        let left_children = if is_leaf {
            vec![]
        } else {
            vec![self.arena[idx].children[0], self.arena[idx].children[1]]
        };
        self.arena[idx].keys = vec![left_key];
        self.arena[idx].children = left_children;

        (promoted, right_idx)
    }

    fn search(&self, key: i32) -> bool {
        let mut cur = self.root;
        while let Some(idx) = cur {
            let node = &self.arena[idx];
            let mut i = 0;
            while i < node.keys.len() && key > node.keys[i] {
                i += 1;
            }
            if i < node.keys.len() && node.keys[i] == key {
                return true;
            }
            if node.children.is_empty() {
                return false;
            }
            cur = Some(node.children[i]);
        }
        false
    }

    fn inorder(&self) -> Vec<i32> {
        let mut result = Vec::new();
        if let Some(idx) = self.root {
            self.visit(idx, &mut result);
        }
        result
    }

    fn visit(&self, idx: usize, result: &mut Vec<i32>) {
        let node = &self.arena[idx];
        if node.children.is_empty() {
            result.extend_from_slice(&node.keys);
            return;
        }
        for i in 0..node.keys.len() {
            self.visit(node.children[i], result);
            result.push(node.keys[i]);
        }
        self.visit(*node.children.last().unwrap(), result);
    }
}
```

```csharp
class Node
{
    public List<int> Keys;
    public List<Node> Children;
    public Node(List<int> keys, List<Node>? children = null)
    {
        Keys = keys;
        Children = children ?? new List<Node>();
    }
    public bool IsLeaf => Children.Count == 0;
}

class TwoThreeTree
{
    public Node? Root;

    public void Insert(int key)
    {
        if (Root == null) { Root = new Node(new List<int> { key }); return; }
        var (newRoot, split) = InsertNode(Root, key);
        if (split == null) { Root = newRoot; }
        else
        {
            var (promoted, right) = split.Value;
            Root = new Node(new List<int> { promoted }, new List<Node> { newRoot, right });
        }
    }

    static (Node, (int, Node)?) InsertNode(Node node, int key)
    {
        if (node.IsLeaf)
        {
            if (node.Keys.Contains(key)) return (node, null);
            node.Keys.Add(key);
            node.Keys.Sort();
        }
        else
        {
            int i = 0;
            while (i < node.Keys.Count && key > node.Keys[i]) i++;
            if (i < node.Keys.Count && node.Keys[i] == key) return (node, null);
            var (newChild, split) = InsertNode(node.Children[i], key);
            node.Children[i] = newChild;
            if (split == null) return (node, null);
            var (promoted, right) = split.Value;
            node.Keys.Insert(i, promoted);
            node.Children.Insert(i + 1, right);
        }
        if (node.Keys.Count <= 2) return (node, null);
        return SplitNode(node);
    }

    static (Node, (int, Node)?) SplitNode(Node node)
    {
        int promoted = node.Keys[1];
        var left = new Node(new List<int> { node.Keys[0] });
        var right = new Node(new List<int> { node.Keys[2] });
        if (!node.IsLeaf)
        {
            left.Children = new List<Node> { node.Children[0], node.Children[1] };
            right.Children = new List<Node> { node.Children[2], node.Children[3] };
        }
        return (left, (promoted, right));
    }

    public bool Search(int key)
    {
        Node? node = Root;
        while (node != null)
        {
            int i = 0;
            while (i < node.Keys.Count && key > node.Keys[i]) i++;
            if (i < node.Keys.Count && node.Keys[i] == key) return true;
            if (node.IsLeaf) return false;
            node = node.Children[i];
        }
        return false;
    }

    public List<int> Inorder()
    {
        var result = new List<int>();
        void Visit(Node? node)
        {
            if (node == null) return;
            if (node.IsLeaf) { result.AddRange(node.Keys); return; }
            for (int i = 0; i < node.Keys.Count; i++)
            {
                Visit(node.Children[i]);
                result.Add(node.Keys[i]);
            }
            Visit(node.Children[^1]);
        }
        Visit(Root);
        return result;
    }
}
```
