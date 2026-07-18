---
name: トライ木
category: データ構造
subcategory: 木構造
complexity: O(文字数)
summary: 共通の接頭辞を共有して文字列集合を格納する木。前方一致検索や入力補完に向く。
---

## 概要

大量の文字列を格納しつつ、「ある接頭辞から始まる単語は何があるか」を高速に answer するための木構造。名前は「retrieval(検索)」に由来する(「トライ」と発音するのが一般的)。各文字が木の1段ずつに対応し、共通の接頭辞を持つ単語同士は木の上部を共有する——この構造が、検索エンジンの入力補完や辞書アプリの高速な前方一致検索を支えている。

## 仕組み

1. 根は空文字列を表す
2. 各エッジには1文字が対応し、根から葉(または特定のノード)までのパスをたどると、1つの単語が読み取れる
3. 単語を挿入するときは、根から1文字ずつ既存の経路をたどり、経路がなければ新しいノードを作る。単語の末尾には「ここで単語が終わる」という印(フラグ)を立てる
4. ある単語がトライに含まれるかを調べるときは、根から1文字ずつたどり、途中で経路が途切れなければ、かつ末尾フラグが立っていれば「含まれる」と判定できる
5. ある接頭辞から始まる全単語を知りたければ、その接頭辞までたどった後のノードを根とみなし、その部分木を深さ優先で探索すればよい

"CAT"、"CAR"、"CARD" という3単語を格納すると、"CA"までの経路が共有され、そこから"T"と"R"に枝分かれし、さらに"R"の先に"D"が続く——というように、木の形そのものが文字列集合の構造を視覚的に表現する。

## 特性・トレードオフ

- **計算量**: 挿入・検索ともに単語の長さに比例するO(L)(Lは文字数)。**格納されている単語の"総数"にはほぼ依存しない**のが大きな特徴(ハッシュテーブルによる完全一致検索と対照的に、前方一致検索が得意)
- **メモリ消費**: 共通の接頭辞を共有することでメモリを節約できる場面がある一方、各ノードが「取りうる文字の数」分の子へのポインタを持つ実装では、疎な文字集合に対してメモリを浪費しやすい(この問題を解決する圧縮版が「radix木(パトリシア木)」など)
- **前方一致検索への特化**: ハッシュテーブルは「完全一致」の判定は高速だが「前方一致」の列挙は苦手。トライ木はその逆で、「〜から始まる単語」の列挙を得意とする
- **使いどころ**: 検索エンジン・IMEの入力補完(オートコンプリート)、スペルチェッカー、IPルーティングテーブル(IPアドレスの前方一致によるルーティング)、Aho-Corasick法の内部構造としても使われる

## 実装例

単語の挿入、完全一致検索(`search`)、前方一致判定(`startsWith`)ができるトライ木。

```python
class TrieNode:
    __slots__ = ("children", "is_end")

    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_end = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        return self._find_node(prefix) is not None

    def _find_node(self, s: str) -> TrieNode | None:
        node = self.root
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node
```

```typescript
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd = false;
}

class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
  }

  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }

  private findNode(s: string): TrieNode | null {
    let node = this.root;
    for (const ch of s) {
      const next = node.children.get(ch);
      if (!next) return null;
      node = next;
    }
    return node;
  }
}
```

```cpp
#include <memory>
#include <string>
#include <unordered_map>

struct TrieNode {
    std::unordered_map<char, std::unique_ptr<TrieNode>> children;
    bool isEnd = false;
};

class Trie {
public:
    void insert(const std::string& word) {
        TrieNode* node = root.get();
        for (char ch : word) {
            auto it = node->children.find(ch);
            if (it == node->children.end()) {
                node->children[ch] = std::make_unique<TrieNode>();
            }
            node = node->children[ch].get();
        }
        node->isEnd = true;
    }

    bool search(const std::string& word) const {
        const TrieNode* node = findNode(word);
        return node != nullptr && node->isEnd;
    }

    bool startsWith(const std::string& prefix) const {
        return findNode(prefix) != nullptr;
    }

private:
    std::unique_ptr<TrieNode> root = std::make_unique<TrieNode>();

    const TrieNode* findNode(const std::string& s) const {
        const TrieNode* node = root.get();
        for (char ch : s) {
            auto it = node->children.find(ch);
            if (it == node->children.end()) return nullptr;
            node = it->second.get();
        }
        return node;
    }
};
```

```rust
use std::collections::HashMap;

#[derive(Default)]
struct TrieNode {
    children: HashMap<char, TrieNode>,
    is_end: bool,
}

#[derive(Default)]
struct Trie {
    root: TrieNode,
}

impl Trie {
    fn insert(&mut self, word: &str) {
        let mut node = &mut self.root;
        for ch in word.chars() {
            node = node.children.entry(ch).or_insert_with(TrieNode::default);
        }
        node.is_end = true;
    }

    fn search(&self, word: &str) -> bool {
        match self.find_node(word) {
            Some(node) => node.is_end,
            None => false,
        }
    }

    fn starts_with(&self, prefix: &str) -> bool {
        self.find_node(prefix).is_some()
    }

    fn find_node(&self, s: &str) -> Option<&TrieNode> {
        let mut node = &self.root;
        for ch in s.chars() {
            node = node.children.get(&ch)?;
        }
        Some(node)
    }
}
```

```csharp
class TrieNode
{
    public Dictionary<char, TrieNode> Children = new();
    public bool IsEnd;
}

class Trie
{
    private readonly TrieNode _root = new();

    public void Insert(string word)
    {
        var node = _root;
        foreach (var ch in word)
        {
            if (!node.Children.TryGetValue(ch, out var next))
            {
                next = new TrieNode();
                node.Children[ch] = next;
            }
            node = next;
        }
        node.IsEnd = true;
    }

    public bool Search(string word)
    {
        var node = FindNode(word);
        return node != null && node.IsEnd;
    }

    public bool StartsWith(string prefix) => FindNode(prefix) != null;

    TrieNode? FindNode(string s)
    {
        var node = _root;
        foreach (var ch in s)
        {
            if (!node.Children.TryGetValue(ch, out var next)) return null;
            node = next;
        }
        return node;
    }
}
```
