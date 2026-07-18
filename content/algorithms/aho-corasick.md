---
name: Aho-Corasick法
category: 文字列
subcategory: パターンマッチング
complexity: O(n + m + z)
summary: 複数パターンを1本のオートマトンにまとめ、テキストを1回走査するだけで全パターンを検出する。
---

## 概要

「複数のパターン文字列を、1本の長いテキストの中から**同時に**全て見つけたい」という問題に特化したアルゴリズム。KMP法を1つずつ何度も繰り返せば同じことはできるが非効率になる。Aho-Corasick法は、全てのパターンを1つの「オートマトン(状態機械)」にまとめあげ、**テキストをたった1回走査するだけ**で、全パターンの出現箇所を漏れなく検出する。ウイルス対策ソフトのシグネチャ検索の元祖的な技術としても知られる。

## 仕組み

1. **トライ木の構築**: 全てのパターン文字列を1本のトライ木(共通の接頭辞を共有する木構造)にまとめる
2. **失敗リンクの構築**: KMP法の「失敗関数」に相当するものを、トライ木の各ノードに対して構築する。これは「今のノードで文字が一致しなくなったとき、次にどのノードへ移ればよいか(=どのパターンの接頭辞に該当する可能性がまだ残っているか)」を表すリンクで、BFSを使って効率的に構築できる
3. **出力リンク**: 失敗リンクをたどった先に「完成しているパターン」が隠れていることがあるため、それも見逃さないようにリンクしておく
4. **走査**: テキストを先頭から1文字ずつ読みながらオートマトンの状態を遷移させ、パターンの終端に到達するたびに(出力リンクも含めて)一致を報告する

KMP法の失敗関数を「1つのパターン」から「複数パターンのトライ木」へと一般化した、と捉えるとその設計思想がわかりやすい。

## 特性・トレードオフ

- **計算量**: O(n + m + z)(n=テキスト長、m=全パターンの合計長、z=見つかった一致の総数)。パターンの本数に関わらず、テキストは1回だけ走査すればよい
- **前処理コスト**: オートマトン(トライ木+失敗リンク+出力リンク)の構築にO(m)かかるが、これはテキストの長さに依存しない一度きりのコスト
- **KMP法・Rabin-Karp法との比較**: 単一パターンの検索ならKMP法やBoyer-Moore法で十分だが、**多数のパターンを同時に検索する**用途ではAho-Corasick法が圧倒的に有利になる
- **使いどころ**: ウイルス対策ソフトのシグネチャマッチング(既知の不正コードパターンを大量に同時検索)、テキスト中の禁止用語の一括検出、DNA配列中の複数モチーフの同時検索、自然言語処理における辞書ベースの単語分割など

## 実装例

複数パターンのトライ木にBFSで失敗リンクを構築し、テキストを1回走査するだけで全パターンの出現位置(開始位置, パターンのインデックス)を返す。

```python
from collections import deque


class AhoCorasickNode:
    __slots__ = ("children", "fail", "output")

    def __init__(self):
        self.children: dict[str, "AhoCorasickNode"] = {}
        self.fail: "AhoCorasickNode | None" = None
        self.output: list[int] = []  # このノードで終端になっているパターンのインデックス


class AhoCorasick:
    def __init__(self, patterns: list[str]):
        self.patterns = patterns
        self.root = AhoCorasickNode()
        for idx, pattern in enumerate(patterns):
            self._insert(pattern, idx)
        self._build_failure_links()

    def _insert(self, pattern: str, idx: int) -> None:
        node = self.root
        for ch in pattern:
            if ch not in node.children:
                node.children[ch] = AhoCorasickNode()
            node = node.children[ch]
        node.output.append(idx)

    def _build_failure_links(self) -> None:
        queue = deque()
        for child in self.root.children.values():
            child.fail = self.root
            queue.append(child)

        while queue:
            node = queue.popleft()
            for ch, child in node.children.items():
                fail_node = node.fail
                while fail_node is not None and ch not in fail_node.children:
                    fail_node = fail_node.fail
                child.fail = fail_node.children[ch] if fail_node else self.root
                child.output = child.output + child.fail.output  # 出力リンクをマージしておく
                queue.append(child)

    def search(self, text: str) -> list[tuple[int, int]]:
        """(開始位置, パターンのインデックス) の一覧を返す"""
        result = []
        node = self.root
        for i, ch in enumerate(text):
            while node is not self.root and ch not in node.children:
                node = node.fail
            if ch in node.children:
                node = node.children[ch]
            for pattern_idx in node.output:
                start = i - len(self.patterns[pattern_idx]) + 1
                result.append((start, pattern_idx))
        return sorted(result)
```

```typescript
class AhoCorasickNode {
  children: Map<string, AhoCorasickNode> = new Map();
  fail: AhoCorasickNode | null = null;
  output: number[] = []; // このノードで終端になっているパターンのインデックス
}

class AhoCorasick {
  private root = new AhoCorasickNode();
  private patterns: string[];

  constructor(patterns: string[]) {
    this.patterns = patterns;
    patterns.forEach((pattern, idx) => this.insertPattern(pattern, idx));
    this.buildFailureLinks();
  }

  private insertPattern(pattern: string, idx: number): void {
    let node = this.root;
    for (const ch of pattern) {
      if (!node.children.has(ch)) node.children.set(ch, new AhoCorasickNode());
      node = node.children.get(ch)!;
    }
    node.output.push(idx);
  }

  private buildFailureLinks(): void {
    const queue: AhoCorasickNode[] = [];
    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const [ch, child] of node.children) {
        let failNode: AhoCorasickNode | null = node.fail;
        while (failNode !== null && !failNode.children.has(ch))
          failNode = failNode.fail;
        child.fail = failNode ? failNode.children.get(ch)! : this.root;
        child.output = child.output.concat(child.fail.output); // 出力リンクをマージしておく
        queue.push(child);
      }
    }
  }

  search(text: string): [number, number][] {
    const result: [number, number][] = [];
    let node = this.root;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      while (node !== this.root && !node.children.has(ch)) node = node.fail!;
      if (node.children.has(ch)) node = node.children.get(ch)!;
      for (const patternIdx of node.output) {
        const start = i - this.patterns[patternIdx].length + 1;
        result.push([start, patternIdx]);
      }
    }
    return result.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
}
```

```cpp
#include <algorithm>
#include <memory>
#include <queue>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

struct AhoCorasickNode {
    std::unordered_map<char, std::unique_ptr<AhoCorasickNode>> children;
    AhoCorasickNode* fail = nullptr;
    std::vector<int> output; // このノードで終端になっているパターンのインデックス
};

class AhoCorasick {
public:
    explicit AhoCorasick(std::vector<std::string> patterns) : patterns(std::move(patterns)) {
        root = std::make_unique<AhoCorasickNode>();
        for (int idx = 0; idx < static_cast<int>(this->patterns.size()); idx++) {
            insertPattern(this->patterns[idx], idx);
        }
        buildFailureLinks();
    }

    std::vector<std::pair<int, int>> search(const std::string& text) const {
        std::vector<std::pair<int, int>> result;
        AhoCorasickNode* node = root.get();
        for (int i = 0; i < static_cast<int>(text.size()); i++) {
            char ch = text[i];
            while (node != root.get() && node->children.find(ch) == node->children.end()) {
                node = node->fail;
            }
            auto it = node->children.find(ch);
            if (it != node->children.end()) node = it->second.get();
            for (int patternIdx : node->output) {
                int start = i - static_cast<int>(patterns[patternIdx].size()) + 1;
                result.emplace_back(start, patternIdx);
            }
        }
        std::sort(result.begin(), result.end());
        return result;
    }

private:
    std::unique_ptr<AhoCorasickNode> root;
    std::vector<std::string> patterns;

    void insertPattern(const std::string& pattern, int idx) {
        AhoCorasickNode* node = root.get();
        for (char ch : pattern) {
            auto it = node->children.find(ch);
            if (it == node->children.end()) {
                node->children[ch] = std::make_unique<AhoCorasickNode>();
            }
            node = node->children[ch].get();
        }
        node->output.push_back(idx);
    }

    void buildFailureLinks() {
        std::queue<AhoCorasickNode*> q;
        for (auto& [ch, child] : root->children) {
            child->fail = root.get();
            q.push(child.get());
        }

        while (!q.empty()) {
            AhoCorasickNode* node = q.front();
            q.pop();
            for (auto& [ch, child] : node->children) {
                AhoCorasickNode* failNode = node->fail;
                while (failNode != nullptr && failNode->children.find(ch) == failNode->children.end()) {
                    failNode = failNode->fail;
                }
                child->fail = failNode ? failNode->children[ch].get() : root.get();
                // 出力リンクをマージしておく
                child->output.insert(child->output.end(), child->fail->output.begin(), child->fail->output.end());
                q.push(child.get());
            }
        }
    }
};
```

```rust
use std::collections::{HashMap, VecDeque};

#[derive(Default)]
struct AhoCorasickNode {
    children: HashMap<char, usize>,
    fail: usize,
    output: Vec<usize>, // このノードで終端になっているパターンのインデックス
}

struct AhoCorasick {
    nodes: Vec<AhoCorasickNode>,
    patterns: Vec<String>,
}

const ROOT: usize = 0;

impl AhoCorasick {
    fn new(patterns: Vec<String>) -> Self {
        let mut ac = AhoCorasick { nodes: vec![AhoCorasickNode::default()], patterns };
        for idx in 0..ac.patterns.len() {
            let pattern = ac.patterns[idx].clone();
            ac.insert_pattern(&pattern, idx);
        }
        ac.build_failure_links();
        ac
    }

    fn insert_pattern(&mut self, pattern: &str, idx: usize) {
        let mut node = ROOT;
        for ch in pattern.chars() {
            if let Some(&next) = self.nodes[node].children.get(&ch) {
                node = next;
            } else {
                self.nodes.push(AhoCorasickNode::default());
                let next = self.nodes.len() - 1;
                self.nodes[node].children.insert(ch, next);
                node = next;
            }
        }
        self.nodes[node].output.push(idx);
    }

    fn build_failure_links(&mut self) {
        let mut queue = VecDeque::new();
        for (_, &child) in self.nodes[ROOT].children.clone().iter() {
            self.nodes[child].fail = ROOT;
            queue.push_back(child);
        }

        while let Some(node) = queue.pop_front() {
            let children = self.nodes[node].children.clone();
            for (ch, child) in children {
                let mut fail_node = self.nodes[node].fail;
                while fail_node != ROOT && !self.nodes[fail_node].children.contains_key(&ch) {
                    fail_node = self.nodes[fail_node].fail;
                }
                self.nodes[child].fail = match self.nodes[fail_node].children.get(&ch) {
                    Some(&f) if f != child => f,
                    _ => ROOT,
                };
                let fail_output = self.nodes[self.nodes[child].fail].output.clone();
                self.nodes[child].output.extend(fail_output); // 出力リンクをマージしておく
                queue.push_back(child);
            }
        }
    }

    fn search(&self, text: &str) -> Vec<(usize, usize)> {
        let mut result = Vec::new();
        let mut node = ROOT;
        for (i, ch) in text.chars().enumerate() {
            while node != ROOT && !self.nodes[node].children.contains_key(&ch) {
                node = self.nodes[node].fail;
            }
            if let Some(&next) = self.nodes[node].children.get(&ch) {
                node = next;
            }
            for &pattern_idx in &self.nodes[node].output {
                let start = i + 1 - self.patterns[pattern_idx].chars().count();
                result.push((start, pattern_idx));
            }
        }
        result.sort();
        result
    }
}
```

```csharp
class AhoCorasickNode
{
    public Dictionary<char, AhoCorasickNode> Children = new();
    public AhoCorasickNode? Fail;
    public List<int> Output = new(); // このノードで終端になっているパターンのインデックス
}

class AhoCorasick
{
    private readonly AhoCorasickNode _root = new();
    private readonly List<string> _patterns;

    public AhoCorasick(List<string> patterns)
    {
        _patterns = patterns;
        for (int idx = 0; idx < patterns.Count; idx++) InsertPattern(patterns[idx], idx);
        BuildFailureLinks();
    }

    void InsertPattern(string pattern, int idx)
    {
        var node = _root;
        foreach (var ch in pattern)
        {
            if (!node.Children.TryGetValue(ch, out var next))
            {
                next = new AhoCorasickNode();
                node.Children[ch] = next;
            }
            node = next;
        }
        node.Output.Add(idx);
    }

    void BuildFailureLinks()
    {
        var queue = new Queue<AhoCorasickNode>();
        foreach (var child in _root.Children.Values)
        {
            child.Fail = _root;
            queue.Enqueue(child);
        }

        while (queue.Count > 0)
        {
            var node = queue.Dequeue();
            foreach (var (ch, child) in node.Children)
            {
                var failNode = node.Fail;
                while (failNode != null && !failNode.Children.ContainsKey(ch)) failNode = failNode.Fail;
                child.Fail = failNode != null ? failNode.Children[ch] : _root;
                child.Output = child.Output.Concat(child.Fail.Output).ToList(); // 出力リンクをマージしておく
                queue.Enqueue(child);
            }
        }
    }

    public List<(int Start, int PatternIdx)> Search(string text)
    {
        var result = new List<(int, int)>();
        var node = _root;
        for (int i = 0; i < text.Length; i++)
        {
            char ch = text[i];
            while (node != _root && !node.Children.ContainsKey(ch)) node = node.Fail!;
            if (node.Children.ContainsKey(ch)) node = node.Children[ch];
            foreach (var patternIdx in node.Output)
            {
                int start = i - _patterns[patternIdx].Length + 1;
                result.Add((start, patternIdx));
            }
        }
        result.Sort();
        return result;
    }
}
```
