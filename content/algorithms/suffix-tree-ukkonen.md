---
name: Ukkonenのアルゴリズム(接尾辞木構築)
category: 文字列
subcategory: 接尾辞構造
complexity: O(n)(オンライン構築、n=テキスト長)
summary: テキストの全接尾辞を1本の圧縮木にまとめ上げる接尾辞木を、末尾に文字を追加していく「オンライン」な方式で線形時間のうちに構築する、文字列アルゴリズムの中でも屈指の技巧的なアルゴリズム。
---

## 概要

[Trie木](/algorithms/trie)がテキストの全接尾辞をそのまま格納すると、`n`文字のテキストに対して`O(n²)`のノード数になってしまう(各接尾辞が平均`n/2`文字あるため)。接尾辞木は、Trie木上で分岐のない一本道のパスを1つの辺に圧縮する(パス圧縮Trie)ことで、このノード数を`O(n)`に抑えた構造だが、素朴に構築しようとすると各接尾辞を1本ずつ挿入するのに`O(n²)`かかってしまう。1995年にエスコ・ウッコネン(Esko Ukkonen)が発表したこのアルゴリズムは、テキストを先頭から1文字ずつ読みながら、常に「今までに読んだプレフィックスの接尾辞木」を維持し続ける「オンライン」な構築方式によって、驚くべきことに全体をたった`O(n)`の線形時間で構築してしまう——文字列アルゴリズムの中でも特に精妙な技巧を要することで知られる名アルゴリズムである。

## 仕組み

1. テキストの各文字を左から順に処理していく「フェーズ」を`n`回繰り返す。各フェーズでは、それまでに構築した木に新しい文字を反映させ、木を「今読んだところまでの全接尾辞」に対応する状態へ更新する
2. 素朴に考えれば各フェーズで最大`n`個の接尾辞を1つずつ更新する必要があり全体で`O(n²)`になってしまうが、Ukkonenのアルゴリズムは3つの巧妙な高速化技法を組み合わせることでこれを回避する
3. **接尾辞リンク(Suffix Link)**: ある文字列`xα`に対応するノードから、その`α`(先頭の1文字を除いた文字列)に対応するノードへの直接のポインタを維持する。これにより、1つの接尾辞を更新した直後に次の(1文字短い)接尾辞へジャンプする際、木の根からたどり直す必要がなくなる
4. **暗黙の拡張(implicit extension)**: 既にある葉ノードへ続く辺は、新しい文字が来ても自動的に伸びたものとみなせる(明示的な更新が不要)という性質を利用し、多くの更新をスキップする
5. **一括更新(rule 3の早期終了)**: すでにその文字列が木の別の場所に暗黙的に存在している場合、それ以上そのフェーズでの更新を打ち切ってよいという規則により、実際に明示的な操作が必要な回数を全フェーズ通算で`O(n)`に抑える

これら3つの仕組みの組み合わせにより、見かけ上`O(n²)`回必要に見える更新操作全体が、償却計算量の議論を通じて`O(n)`に収まることが証明されている。

## 特性・トレードオフ

- **計算量**: `O(n)`のオンライン構築だが、定数倍が大きく実装も非常に複雑——接尾辞リンク・暗黙の拡張・早期終了規則の3つを正確に実装する必要があり、文字列アルゴリズムの中でも実装難易度が特に高いことで知られる
- **[接尾辞配列](/algorithms/suffix-array)との比較**: 同じ情報(全接尾辞に関する構造)を表現できるが、接尾辞木は明示的な木構造としてポインタベースで実装され、各ノードあたりのメモリオーバーヘッドが大きい。実務では、同等の機能を持ちながらメモリ効率が良く実装も単純な[接尾辞配列](/algorithms/suffix-array)+[LCP配列](/algorithms/lcp-array)の組み合わせが好まれることが多い
- **オンライン性という独自の強み**: テキストを最後まで読み切らなくても、途中経過の木が常に「これまでのプレフィックス」に対する正しい接尾辞木になっている——ストリーミングデータや、テキストが徐々に追加されていくような場面に理論上適している
- **使いどころ**: バイオインフォマティクスにおけるゲノム配列の高速検索・反復配列検出、複数文字列の最長共通部分文字列検出、[Trie木](/algorithms/trie)ベースの検索を大規模テキストに適用する場面の理論的基盤、データ圧縮アルゴリズムの内部構造

## 実装例

接尾辞リンク・アクティブポイント(active node/edge/length)・暗黙の拡張・早期終了規則(rule 3)を実装したUkkonenのアルゴリズム。ランダムな文字列(小さいアルファベット・繰り返しの多いパターンを含む)に対して、木が受理する文字列が、その文字列の全ての部分文字列の集合(愚直な二重ループで列挙)と完全に一致すること、および部分文字列でないパターンは正しく拒否されることを検証している。

```python
class SuffixTree:
    def __init__(self, text: str) -> None:
        self.text = text + "$"  # 全ての接尾辞が明示的な葉になるよう一意な終端記号を付加する
        self.starts: list[int] = []
        self.ends: list[int] = []  # -1は葉を表し、常にleaf_end(現在位置)を参照する
        self.children: list[dict[str, int]] = []
        self.suffix_link: list[int] = []

        self.root = self._new_node(-1, -2)
        self.suffix_link[self.root] = self.root

        self.active_node = self.root
        self.active_edge = -1
        self.active_length = 0
        self.remaining = 0
        self.leaf_end = -1
        self.last_new_node = -1

        for i in range(len(self.text)):
            self._extend(i)

    def _new_node(self, start: int, end: int) -> int:
        idx = len(self.starts)
        self.starts.append(start)
        self.ends.append(end)
        self.children.append({})
        self.suffix_link.append(-1)
        return idx

    def _edge_end(self, node: int) -> int:
        return self.leaf_end if self.ends[node] == -1 else self.ends[node]

    def _edge_length(self, node: int) -> int:
        return self._edge_end(node) - self.starts[node] + 1

    def _walk_down(self, node: int) -> bool:
        """暗黙の拡張: アクティブ長がこの辺の長さ以上ならアクティブポイントを辺の先まで進める"""
        length = self._edge_length(node)
        if self.active_length >= length:
            self.active_edge += length
            self.active_length -= length
            self.active_node = node
            return True
        return False

    def _extend(self, pos: int) -> None:
        self.leaf_end = pos  # 全ての葉のendを一括更新(暗黙の拡張の核心)
        self.remaining += 1
        self.last_new_node = -1

        while self.remaining > 0:
            if self.active_length == 0:
                self.active_edge = pos

            edge_char = self.text[self.active_edge]
            if edge_char not in self.children[self.active_node]:
                # ルール2: この文字で始まる辺がないので新しい葉を作る
                leaf = self._new_node(pos, -1)
                self.children[self.active_node][edge_char] = leaf
                if self.last_new_node != -1:
                    self.suffix_link[self.last_new_node] = self.active_node
                    self.last_new_node = -1
            else:
                nxt = self.children[self.active_node][edge_char]
                if self._walk_down(nxt):
                    continue
                if self.text[self.starts[nxt] + self.active_length] == self.text[pos]:
                    # ルール3(早期終了): この文字は既に木に暗黙的に存在する
                    if self.last_new_node != -1:
                        self.suffix_link[self.last_new_node] = self.active_node
                        self.last_new_node = -1
                    self.active_length += 1
                    break
                # ルール2(分割): 既存の辺を分割して新しい内部ノード+葉を作る
                split_end = self.starts[nxt] + self.active_length - 1
                split = self._new_node(self.starts[nxt], split_end)
                self.children[self.active_node][edge_char] = split
                leaf = self._new_node(pos, -1)
                self.children[split][self.text[pos]] = leaf
                self.starts[nxt] += self.active_length
                self.children[split][self.text[self.starts[nxt]]] = nxt
                if self.last_new_node != -1:
                    self.suffix_link[self.last_new_node] = split
                self.last_new_node = split

            self.remaining -= 1

            if self.active_node == self.root and self.active_length > 0:
                self.active_length -= 1
                self.active_edge = pos - self.remaining + 1
            elif self.active_node != self.root:
                self.active_node = self.suffix_link[self.active_node]  # 接尾辞リンクで木を遡り直す手間を省く

    def contains(self, pattern: str) -> bool:
        if pattern == "":
            return True
        node = self.root
        i = 0
        m = len(pattern)
        while i < m:
            ch = pattern[i]
            if ch not in self.children[node]:
                return False
            child = self.children[node][ch]
            end = self._edge_end(child)
            j = self.starts[child]
            while j <= end and i < m:
                if pattern[i] != self.text[j]:
                    return False
                i += 1
                j += 1
            node = child
        return True
```

```typescript
class SuffixTree {
  text: string;
  starts: number[] = [];
  ends: number[] = [];
  children: Map<string, number>[] = [];
  suffixLink: number[] = [];
  root: number;
  activeNode: number;
  activeEdge = -1;
  activeLength = 0;
  remaining = 0;
  leafEnd = -1;
  lastNewNode = -1;

  constructor(text: string) {
    this.text = text + "$";
    this.root = this.newNode(-1, -2);
    this.suffixLink[this.root] = this.root;
    this.activeNode = this.root;

    for (let i = 0; i < this.text.length; i++) {
      this.extend(i);
    }
  }

  private newNode(start: number, end: number): number {
    const idx = this.starts.length;
    this.starts.push(start);
    this.ends.push(end);
    this.children.push(new Map());
    this.suffixLink.push(-1);
    return idx;
  }

  private edgeEnd(node: number): number {
    return this.ends[node] === -1 ? this.leafEnd : this.ends[node];
  }

  private edgeLength(node: number): number {
    return this.edgeEnd(node) - this.starts[node] + 1;
  }

  private walkDown(node: number): boolean {
    const length = this.edgeLength(node);
    if (this.activeLength >= length) {
      this.activeEdge += length;
      this.activeLength -= length;
      this.activeNode = node;
      return true;
    }
    return false;
  }

  private extend(pos: number): void {
    this.leafEnd = pos;
    this.remaining += 1;
    this.lastNewNode = -1;

    while (this.remaining > 0) {
      if (this.activeLength === 0) {
        this.activeEdge = pos;
      }

      const edgeChar = this.text[this.activeEdge];
      if (!this.children[this.activeNode].has(edgeChar)) {
        const leaf = this.newNode(pos, -1);
        this.children[this.activeNode].set(edgeChar, leaf);
        if (this.lastNewNode !== -1) {
          this.suffixLink[this.lastNewNode] = this.activeNode;
          this.lastNewNode = -1;
        }
      } else {
        const nxt = this.children[this.activeNode].get(edgeChar)!;
        if (this.walkDown(nxt)) {
          continue;
        }
        if (this.text[this.starts[nxt] + this.activeLength] === this.text[pos]) {
          if (this.lastNewNode !== -1) {
            this.suffixLink[this.lastNewNode] = this.activeNode;
            this.lastNewNode = -1;
          }
          this.activeLength += 1;
          break;
        }
        const splitEnd = this.starts[nxt] + this.activeLength - 1;
        const split = this.newNode(this.starts[nxt], splitEnd);
        this.children[this.activeNode].set(edgeChar, split);
        const leaf = this.newNode(pos, -1);
        this.children[split].set(this.text[pos], leaf);
        this.starts[nxt] += this.activeLength;
        this.children[split].set(this.text[this.starts[nxt]], nxt);
        if (this.lastNewNode !== -1) {
          this.suffixLink[this.lastNewNode] = split;
        }
        this.lastNewNode = split;
      }

      this.remaining -= 1;

      if (this.activeNode === this.root && this.activeLength > 0) {
        this.activeLength -= 1;
        this.activeEdge = pos - this.remaining + 1;
      } else if (this.activeNode !== this.root) {
        this.activeNode = this.suffixLink[this.activeNode];
      }
    }
  }

  contains(pattern: string): boolean {
    if (pattern === "") return true;
    let node = this.root;
    let i = 0;
    const m = pattern.length;
    while (i < m) {
      const ch = pattern[i];
      if (!this.children[node].has(ch)) return false;
      const child = this.children[node].get(ch)!;
      const end = this.edgeEnd(child);
      let j = this.starts[child];
      while (j <= end && i < m) {
        if (pattern[i] !== this.text[j]) return false;
        i += 1;
        j += 1;
      }
      node = child;
    }
    return true;
  }
}
```

```cpp
#include <string>
#include <vector>
#include <unordered_map>

class SuffixTree {
public:
    explicit SuffixTree(const std::string& s) : text(s + "$") {
        root = newNode(-1, -2);
        suffixLink[root] = root;
        activeNode = root;
        for (int i = 0; i < static_cast<int>(text.size()); i++) extend(i);
    }

    bool contains(const std::string& pattern) const {
        if (pattern.empty()) return true;
        int node = root;
        int i = 0;
        int m = static_cast<int>(pattern.size());
        while (i < m) {
            char ch = pattern[i];
            auto it = children[node].find(ch);
            if (it == children[node].end()) return false;
            int child = it->second;
            int end = edgeEnd(child);
            int j = starts[child];
            while (j <= end && i < m) {
                if (pattern[i] != text[j]) return false;
                i++;
                j++;
            }
            node = child;
        }
        return true;
    }

private:
    std::string text;
    std::vector<int> starts;
    std::vector<int> ends;
    std::vector<std::unordered_map<char, int>> children;
    std::vector<int> suffixLink;
    int root;
    int activeNode;
    int activeEdge = -1;
    int activeLength = 0;
    int remaining = 0;
    int leafEnd = -1;
    int lastNewNode = -1;

    int newNode(int start, int end) {
        int idx = static_cast<int>(starts.size());
        starts.push_back(start);
        ends.push_back(end);
        children.emplace_back();
        suffixLink.push_back(-1);
        return idx;
    }

    int edgeEnd(int node) const { return ends[node] == -1 ? leafEnd : ends[node]; }
    int edgeLength(int node) const { return edgeEnd(node) - starts[node] + 1; }

    bool walkDown(int node) {
        int length = edgeLength(node);
        if (activeLength >= length) {
            activeEdge += length;
            activeLength -= length;
            activeNode = node;
            return true;
        }
        return false;
    }

    void extend(int pos) {
        leafEnd = pos;
        remaining += 1;
        lastNewNode = -1;

        while (remaining > 0) {
            if (activeLength == 0) activeEdge = pos;

            char edgeChar = text[activeEdge];
            auto it = children[activeNode].find(edgeChar);
            if (it == children[activeNode].end()) {
                int leaf = newNode(pos, -1);
                children[activeNode][edgeChar] = leaf;
                if (lastNewNode != -1) {
                    suffixLink[lastNewNode] = activeNode;
                    lastNewNode = -1;
                }
            } else {
                int nxt = it->second;
                if (walkDown(nxt)) continue;
                if (text[starts[nxt] + activeLength] == text[pos]) {
                    if (lastNewNode != -1) {
                        suffixLink[lastNewNode] = activeNode;
                        lastNewNode = -1;
                    }
                    activeLength += 1;
                    break;
                }
                int splitEnd = starts[nxt] + activeLength - 1;
                int split = newNode(starts[nxt], splitEnd);
                children[activeNode][edgeChar] = split;
                int leaf = newNode(pos, -1);
                children[split][text[pos]] = leaf;
                starts[nxt] += activeLength;
                children[split][text[starts[nxt]]] = nxt;
                if (lastNewNode != -1) suffixLink[lastNewNode] = split;
                lastNewNode = split;
            }

            remaining -= 1;

            if (activeNode == root && activeLength > 0) {
                activeLength -= 1;
                activeEdge = pos - remaining + 1;
            } else if (activeNode != root) {
                activeNode = suffixLink[activeNode];
            }
        }
    }
};
```

```rust
use std::collections::HashMap;

struct SuffixTree {
    text: Vec<u8>,
    starts: Vec<i32>,
    ends: Vec<i32>,
    children: Vec<HashMap<u8, usize>>,
    suffix_link: Vec<usize>,
    root: usize,
    active_node: usize,
    active_edge: i32,
    active_length: i32,
    remaining: i32,
    leaf_end: i32,
    last_new_node: i32, // -1は「なし」を表すセンチネル
}

impl SuffixTree {
    fn new(s: &str) -> Self {
        let mut text = s.as_bytes().to_vec();
        text.push(b'$');
        let mut tree = SuffixTree {
            text,
            starts: Vec::new(),
            ends: Vec::new(),
            children: Vec::new(),
            suffix_link: Vec::new(),
            root: 0,
            active_node: 0,
            active_edge: -1,
            active_length: 0,
            remaining: 0,
            leaf_end: -1,
            last_new_node: -1,
        };
        let root = tree.new_node(-1, -2);
        tree.root = root;
        tree.suffix_link[root] = root;
        tree.active_node = root;

        let n = tree.text.len();
        for i in 0..n {
            tree.extend(i as i32);
        }
        tree
    }

    fn new_node(&mut self, start: i32, end: i32) -> usize {
        let idx = self.starts.len();
        self.starts.push(start);
        self.ends.push(end);
        self.children.push(HashMap::new());
        self.suffix_link.push(0);
        idx
    }

    fn edge_end(&self, node: usize) -> i32 {
        if self.ends[node] == -1 { self.leaf_end } else { self.ends[node] }
    }

    fn edge_length(&self, node: usize) -> i32 {
        self.edge_end(node) - self.starts[node] + 1
    }

    fn walk_down(&mut self, node: usize) -> bool {
        let length = self.edge_length(node);
        if self.active_length >= length {
            self.active_edge += length;
            self.active_length -= length;
            self.active_node = node;
            true
        } else {
            false
        }
    }

    fn extend(&mut self, pos: i32) {
        self.leaf_end = pos;
        self.remaining += 1;
        self.last_new_node = -1;

        while self.remaining > 0 {
            if self.active_length == 0 {
                self.active_edge = pos;
            }

            let edge_char = self.text[self.active_edge as usize];
            if !self.children[self.active_node].contains_key(&edge_char) {
                let leaf = self.new_node(pos, -1);
                self.children[self.active_node].insert(edge_char, leaf);
                if self.last_new_node != -1 {
                    self.suffix_link[self.last_new_node as usize] = self.active_node;
                    self.last_new_node = -1;
                }
            } else {
                let nxt = self.children[self.active_node][&edge_char];
                if self.walk_down(nxt) {
                    continue;
                }
                if self.text[(self.starts[nxt] + self.active_length) as usize] == self.text[pos as usize] {
                    if self.last_new_node != -1 {
                        self.suffix_link[self.last_new_node as usize] = self.active_node;
                        self.last_new_node = -1;
                    }
                    self.active_length += 1;
                    break;
                }
                let split_end = self.starts[nxt] + self.active_length - 1;
                let split = self.new_node(self.starts[nxt], split_end);
                self.children[self.active_node].insert(edge_char, split);
                let leaf = self.new_node(pos, -1);
                let pos_char = self.text[pos as usize];
                self.children[split].insert(pos_char, leaf);
                self.starts[nxt] += self.active_length;
                let nxt_char = self.text[self.starts[nxt] as usize];
                self.children[split].insert(nxt_char, nxt);
                if self.last_new_node != -1 {
                    self.suffix_link[self.last_new_node as usize] = split;
                }
                self.last_new_node = split as i32;
            }

            self.remaining -= 1;

            if self.active_node == self.root && self.active_length > 0 {
                self.active_length -= 1;
                self.active_edge = pos - self.remaining + 1;
            } else if self.active_node != self.root {
                self.active_node = self.suffix_link[self.active_node];
            }
        }
    }

    fn contains(&self, pattern: &str) -> bool {
        let pattern = pattern.as_bytes();
        if pattern.is_empty() {
            return true;
        }
        let mut node = self.root;
        let mut i = 0usize;
        let m = pattern.len();
        while i < m {
            let ch = pattern[i];
            let child = match self.children[node].get(&ch) {
                Some(&c) => c,
                None => return false,
            };
            let end = self.edge_end(child);
            let mut j = self.starts[child];
            while j <= end && i < m {
                if pattern[i] != self.text[j as usize] {
                    return false;
                }
                i += 1;
                j += 1;
            }
            node = child;
        }
        true
    }
}
```

```csharp
class SuffixTree
{
    private readonly string text;
    private readonly List<int> starts = new();
    private readonly List<int> ends = new();
    private readonly List<Dictionary<char, int>> children = new();
    private readonly List<int> suffixLink = new();
    private readonly int root;
    private int activeNode;
    private int activeEdge = -1;
    private int activeLength = 0;
    private int remaining = 0;
    private int leafEnd = -1;
    private int lastNewNode = -1;

    public SuffixTree(string s)
    {
        text = s + "$";
        root = NewNode(-1, -2);
        suffixLink[root] = root;
        activeNode = root;
        for (int i = 0; i < text.Length; i++) Extend(i);
    }

    private int NewNode(int start, int end)
    {
        int idx = starts.Count;
        starts.Add(start);
        ends.Add(end);
        children.Add(new Dictionary<char, int>());
        suffixLink.Add(-1);
        return idx;
    }

    private int EdgeEnd(int node) => ends[node] == -1 ? leafEnd : ends[node];
    private int EdgeLength(int node) => EdgeEnd(node) - starts[node] + 1;

    private bool WalkDown(int node)
    {
        int length = EdgeLength(node);
        if (activeLength >= length)
        {
            activeEdge += length;
            activeLength -= length;
            activeNode = node;
            return true;
        }
        return false;
    }

    private void Extend(int pos)
    {
        leafEnd = pos;
        remaining += 1;
        lastNewNode = -1;

        while (remaining > 0)
        {
            if (activeLength == 0) activeEdge = pos;

            char edgeChar = text[activeEdge];
            if (!children[activeNode].ContainsKey(edgeChar))
            {
                int leaf = NewNode(pos, -1);
                children[activeNode][edgeChar] = leaf;
                if (lastNewNode != -1)
                {
                    suffixLink[lastNewNode] = activeNode;
                    lastNewNode = -1;
                }
            }
            else
            {
                int nxt = children[activeNode][edgeChar];
                if (WalkDown(nxt)) continue;
                if (text[starts[nxt] + activeLength] == text[pos])
                {
                    if (lastNewNode != -1)
                    {
                        suffixLink[lastNewNode] = activeNode;
                        lastNewNode = -1;
                    }
                    activeLength += 1;
                    break;
                }
                int splitEnd = starts[nxt] + activeLength - 1;
                int split = NewNode(starts[nxt], splitEnd);
                children[activeNode][edgeChar] = split;
                int leaf = NewNode(pos, -1);
                children[split][text[pos]] = leaf;
                starts[nxt] += activeLength;
                children[split][text[starts[nxt]]] = nxt;
                if (lastNewNode != -1) suffixLink[lastNewNode] = split;
                lastNewNode = split;
            }

            remaining -= 1;

            if (activeNode == root && activeLength > 0)
            {
                activeLength -= 1;
                activeEdge = pos - remaining + 1;
            }
            else if (activeNode != root)
            {
                activeNode = suffixLink[activeNode];
            }
        }
    }

    public bool Contains(string pattern)
    {
        if (pattern.Length == 0) return true;
        int node = root;
        int i = 0;
        int m = pattern.Length;
        while (i < m)
        {
            char ch = pattern[i];
            if (!children[node].ContainsKey(ch)) return false;
            int child = children[node][ch];
            int end = EdgeEnd(child);
            int j = starts[child];
            while (j <= end && i < m)
            {
                if (pattern[i] != text[j]) return false;
                i++;
                j++;
            }
            node = child;
        }
        return true;
    }
}
```
