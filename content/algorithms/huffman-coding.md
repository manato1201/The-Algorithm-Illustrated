---
name: ハフマン符号化
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: 出現頻度の低い記号ほど長い符号を割り当て、全体の符号長を最小化する。
---

## 概要

モールス信号が「よく使うEやTには短い符号、めったに使わないQやZには長い符号」を割り当てているように、出現頻度に応じて符号の長さを変えることで、全体のデータ量を最小化する可逆圧縮の古典。1952年にデビッド・ハフマンが、当時の学生課題として考案し、それが最適解であることまで証明してしまったという逸話でも知られる。ZIPやJPEG、MP3など、多くの圧縮フォーマットの最終段階で使われている。

## 仕組み

「頻度の低い記号同士を先に結合していく」というボトムアップな貪欲法で、最適な符号の木を組み立てる。

1. 全ての記号を、その出現頻度を重みとした葉ノードとして用意する
2. 最も頻度が低い2つのノードを取り出し、それらを子とする新しいノード(重みは2つの合計)を作る
3. この新しいノードを候補集合に戻し、候補が1つになるまで2を繰り返す
4. 出来上がった木において、根から各葉までの経路(左を0、右を1とする)が、その記号の符号になる

頻度の低い記号ほど、木の深い場所(=長い符号)に配置される。この「毎回、最も軽い2つを貪欲に結合する」という単純な手順が、実は全体として符号長の期待値を最小化する最適解になることが数学的に証明されている。

## 特性・トレードオフ

- **計算量**: O(n log n)(優先度付きキューを使った実装)。記号の種類数nに対して、非常に効率よく最適な符号を構築できる
- **可変長符号でありながら曖昧さがない**: ある記号の符号が別の記号の符号の接頭辞にならない(接頭辞性)という性質を自動的に満たすため、符号の区切りを別途記録しなくても、符号列を先頭から一意に復元できる
- **静的 vs 適応的**: 事前にデータ全体の頻度を数えてから符号表を1回作る「静的ハフマン符号化」が基本形だが、データを読みながら符号表を動的に更新する「適応的ハフマン符号化」という発展形もある
- **使いどころ**: ZIP・GZIP・JPEG・MP3・PNGなど、あらゆる主要な圧縮フォーマットの内部で、他の圧縮技法(LZ77など)と組み合わせて最終段階のエントロピー符号化に使われている

## 実装例

```python
import heapq
from itertools import count


class Node:
    __slots__ = ("freq", "char", "left", "right")

    def __init__(self, freq, char=None, left=None, right=None):
        self.freq = freq
        self.char = char
        self.left = left
        self.right = right


def build_huffman_tree(freqs: dict[str, int]) -> Node:
    tie = count()
    heap = [(f, next(tie), Node(f, ch)) for ch, f in freqs.items()]
    heapq.heapify(heap)
    if len(heap) == 1:
        f, _, only = heap[0]
        return Node(f, left=only)
    while len(heap) > 1:
        f1, _, n1 = heapq.heappop(heap)
        f2, _, n2 = heapq.heappop(heap)
        merged = Node(f1 + f2, left=n1, right=n2)
        heapq.heappush(heap, (merged.freq, next(tie), merged))
    return heap[0][2]


def build_codes(root: Node) -> dict[str, str]:
    codes: dict[str, str] = {}

    def dfs(node: Node | None, prefix: str) -> None:
        if node is None:
            return
        if node.char is not None:
            codes[node.char] = prefix or "0"
            return
        dfs(node.left, prefix + "0")
        dfs(node.right, prefix + "1")

    dfs(root, "")
    return codes


def encode(text: str, codes: dict[str, str]) -> str:
    return "".join(codes[c] for c in text)


def decode(bits: str, root: Node) -> str:
    out = []
    node = root
    for b in bits:
        node = node.left if b == "0" else node.right
        if node.char is not None:
            out.append(node.char)
            node = root
    return "".join(out)
```

```typescript
class HuffNode {
  freq: number;
  char: string | null;
  left: HuffNode | null;
  right: HuffNode | null;
  constructor(
    freq: number,
    char: string | null = null,
    left: HuffNode | null = null,
    right: HuffNode | null = null,
  ) {
    this.freq = freq;
    this.char = char;
    this.left = left;
    this.right = right;
  }
}

function buildHuffmanTree(freqs: Map<string, number>): HuffNode {
  const heap: HuffNode[] = [...freqs.entries()].map(
    ([ch, f]) => new HuffNode(f, ch),
  );
  const pop = (): HuffNode => {
    heap.sort((a, b) => a.freq - b.freq);
    return heap.shift()!;
  };
  if (heap.length === 1) {
    const only = heap[0];
    return new HuffNode(only.freq, null, only, null);
  }
  while (heap.length > 1) {
    const n1 = pop();
    const n2 = pop();
    heap.push(new HuffNode(n1.freq + n2.freq, null, n1, n2));
  }
  return heap[0];
}

function buildCodes(root: HuffNode): Map<string, string> {
  const codes = new Map<string, string>();
  function dfs(node: HuffNode | null, prefix: string) {
    if (!node) return;
    if (node.char !== null) {
      codes.set(node.char, prefix || "0");
      return;
    }
    dfs(node.left, prefix + "0");
    dfs(node.right, prefix + "1");
  }
  dfs(root, "");
  return codes;
}

function encode(text: string, codes: Map<string, string>): string {
  return [...text].map((c) => codes.get(c)!).join("");
}

function decode(bits: string, root: HuffNode): string {
  const out: string[] = [];
  let node = root;
  for (const b of bits) {
    node = b === "0" ? node.left! : node.right!;
    if (node.char !== null) {
      out.push(node.char);
      node = root;
    }
  }
  return out.join("");
}
```

```cpp
#include <string>
#include <unordered_map>
#include <queue>
#include <memory>

struct HuffNode {
    int freq;
    char ch;
    bool isLeaf;
    std::shared_ptr<HuffNode> left, right;
};

struct Compare {
    bool operator()(const std::shared_ptr<HuffNode>& a, const std::shared_ptr<HuffNode>& b) const {
        return a->freq > b->freq;  // 最小ヒープ
    }
};

std::shared_ptr<HuffNode> buildHuffmanTree(const std::unordered_map<char, int>& freqs) {
    std::priority_queue<std::shared_ptr<HuffNode>, std::vector<std::shared_ptr<HuffNode>>, Compare> heap;
    for (auto& [ch, f] : freqs) {
        heap.push(std::make_shared<HuffNode>(HuffNode{f, ch, true, nullptr, nullptr}));
    }
    if (heap.size() == 1) {
        auto only = heap.top();
        return std::make_shared<HuffNode>(HuffNode{only->freq, '\0', false, only, nullptr});
    }
    while (heap.size() > 1) {
        auto n1 = heap.top(); heap.pop();
        auto n2 = heap.top(); heap.pop();
        heap.push(std::make_shared<HuffNode>(HuffNode{n1->freq + n2->freq, '\0', false, n1, n2}));
    }
    return heap.top();
}

void buildCodes(const std::shared_ptr<HuffNode>& node, const std::string& prefix,
                 std::unordered_map<char, std::string>& codes) {
    if (!node) return;
    if (node->isLeaf) {
        codes[node->ch] = prefix.empty() ? "0" : prefix;
        return;
    }
    buildCodes(node->left, prefix + "0", codes);
    buildCodes(node->right, prefix + "1", codes);
}

std::string encode(const std::string& text, const std::unordered_map<char, std::string>& codes) {
    std::string out;
    for (char c : text) out += codes.at(c);
    return out;
}

std::string decode(const std::string& bits, const std::shared_ptr<HuffNode>& root) {
    std::string out;
    auto node = root;
    for (char b : bits) {
        node = (b == '0') ? node->left : node->right;
        if (node->isLeaf) {
            out += node->ch;
            node = root;
        }
    }
    return out;
}
```

```rust
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap};
use std::rc::Rc;

#[derive(Clone)]
enum HuffNode {
    Leaf { freq: u64, ch: char },
    Internal { freq: u64, left: Rc<HuffNode>, right: Rc<HuffNode> },
}

impl HuffNode {
    fn freq(&self) -> u64 {
        match self {
            HuffNode::Leaf { freq, .. } => *freq,
            HuffNode::Internal { freq, .. } => *freq,
        }
    }
}

struct HeapItem(Rc<HuffNode>);
impl PartialEq for HeapItem {
    fn eq(&self, other: &Self) -> bool {
        self.0.freq() == other.0.freq()
    }
}
impl Eq for HeapItem {}
impl Ord for HeapItem {
    fn cmp(&self, other: &Self) -> Ordering {
        other.0.freq().cmp(&self.0.freq()) // 最小ヒープにするため反転
    }
}
impl PartialOrd for HeapItem {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn build_huffman_tree(freqs: &HashMap<char, u64>) -> Rc<HuffNode> {
    let mut heap: BinaryHeap<HeapItem> = freqs
        .iter()
        .map(|(&ch, &freq)| HeapItem(Rc::new(HuffNode::Leaf { freq, ch })))
        .collect();

    if heap.len() == 1 {
        let only = heap.pop().unwrap().0;
        return Rc::new(HuffNode::Internal { freq: only.freq(), left: only.clone(), right: only });
    }

    while heap.len() > 1 {
        let n1 = heap.pop().unwrap().0;
        let n2 = heap.pop().unwrap().0;
        let merged = HuffNode::Internal { freq: n1.freq() + n2.freq(), left: n1, right: n2 };
        heap.push(HeapItem(Rc::new(merged)));
    }
    heap.pop().unwrap().0
}

fn build_codes(node: &Rc<HuffNode>, prefix: String, codes: &mut HashMap<char, String>) {
    match node.as_ref() {
        HuffNode::Leaf { ch, .. } => {
            codes.insert(*ch, if prefix.is_empty() { "0".to_string() } else { prefix });
        }
        HuffNode::Internal { left, right, .. } => {
            build_codes(left, prefix.clone() + "0", codes);
            build_codes(right, prefix + "1", codes);
        }
    }
}

fn encode(text: &str, codes: &HashMap<char, String>) -> String {
    text.chars().map(|c| codes[&c].clone()).collect()
}

fn decode(bits: &str, root: &Rc<HuffNode>) -> String {
    let mut out = String::new();
    let mut node = root;
    for b in bits.chars() {
        node = match node.as_ref() {
            HuffNode::Internal { left, right, .. } => if b == '0' { left } else { right },
            HuffNode::Leaf { .. } => unreachable!(),
        };
        if let HuffNode::Leaf { ch, .. } = node.as_ref() {
            out.push(*ch);
            node = root;
        }
    }
    out
}
```

```csharp
class HuffNode
{
    public int Freq;
    public char? Ch;
    public HuffNode? Left, Right;
}

static HuffNode BuildHuffmanTree(Dictionary<char, int> freqs)
{
    var heap = freqs.Select(kv => new HuffNode { Freq = kv.Value, Ch = kv.Key }).ToList();
    if (heap.Count == 1)
    {
        var only = heap[0];
        return new HuffNode { Freq = only.Freq, Left = only };
    }
    while (heap.Count > 1)
    {
        heap = heap.OrderBy(h => h.Freq).ToList();
        var n1 = heap[0];
        var n2 = heap[1];
        heap.RemoveAt(0);
        heap.RemoveAt(0);
        heap.Add(new HuffNode { Freq = n1.Freq + n2.Freq, Left = n1, Right = n2 });
    }
    return heap[0];
}

static Dictionary<char, string> BuildCodes(HuffNode root)
{
    var codes = new Dictionary<char, string>();
    void Dfs(HuffNode? node, string prefix)
    {
        if (node == null) return;
        if (node.Ch != null) { codes[node.Ch.Value] = prefix.Length > 0 ? prefix : "0"; return; }
        Dfs(node.Left, prefix + "0");
        Dfs(node.Right, prefix + "1");
    }
    Dfs(root, "");
    return codes;
}

static string Encode(string text, Dictionary<char, string> codes) => string.Concat(text.Select(c => codes[c]));

static string Decode(string bits, HuffNode root)
{
    var sb = new StringBuilder();
    var node = root;
    foreach (var b in bits)
    {
        node = b == '0' ? node!.Left : node!.Right;
        if (node!.Ch != null) { sb.Append(node.Ch.Value); node = root; }
    }
    return sb.ToString();
}
```
