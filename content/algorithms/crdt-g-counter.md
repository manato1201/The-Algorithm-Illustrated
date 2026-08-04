---
name: CRDT(G-Counter)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(n)(n=ノード数、マージ操作)
summary: 複数のノードが同時に(競合の可能性を気にせず)更新しても、データ構造の数学的な性質(可換・結合・冪等)によって、どんな順序でマージしても必ず同じ結果に自動収束することが保証される、競合解消フリーな複製データ型。
---

## 概要

複数のノードに同じデータを複製して持たせる分散システムでは、各ノードが同時に(お互いの状態を知らないまま)データを更新すると「競合」が発生する。[2相コミット](/algorithms/two-phase-commit)や[Raft](/algorithms/raft)は、この競合をロックや合意形成によって「そもそも起こさない」ようにする強整合性のアプローチを取るが、そのために可用性(一部のノードが到達不能でも書き込みを受け付け続けられるか)を犠牲にする。CRDT(Conflict-free Replicated Data Type、競合解消フリー複製データ型)は全く逆の発想を取る——各ノードが自由に(調整なしで)更新を受け付けることを許し、後で複製同士をマージする際に、データ構造の数学的な性質(演算が可換・結合的・冪等である)を利用することで、マージの順序に関わらず必ず全ノードが同じ結果に収束することを保証する。G-Counter(Grow-only Counter、増加のみカウンタ)はCRDTの中でも最も単純で、この仕組みを直感的に理解できる代表例である。

## 仕組み

1. `n`個のノードそれぞれに、自分専用のカウンタ(整数)を持たせる——ノード`i`は自分の担当するカウンタ`c_i`だけを増加させることができ、他のノードのカウンタを直接書き換えることはない
2. あるノードで「カウントアップ」操作が発生すると、そのノードは自分自身の`c_i`だけを1増やす(他ノードとの通信や調整は一切不要)
3. カウンタの現在の合計値を知りたいときは、全ノードの`c_1, c_2, ..., c_n`を合計する
4. 2つのノードの状態をマージする際は、各ノードのカウンタごとに「大きい方の値」を採用する(`merged.c_i = max(a.c_i, b.c_i)`)——各`c_i`は単調増加(減ることがない)なので、`max`を取る操作は何度繰り返しても、どんな順序で行っても、最終的に同じ結果に収束する
5. この「マージ操作が可換(順序によらない)・結合的(グループ化によらない)・冪等(同じ状態を2回マージしても変わらない)」という3つの数学的性質が、CRDTが「競合解消フリー」であることの理論的な根拠になっている

## 特性・トレードオフ

- **計算量**: マージ操作は各ノードのカウンタを1回ずつ比較するだけなので`O(n)`——非常に軽量な操作で、ネットワーク分断が起きていてもローカルに完結して実行できる
- **可用性と引き換えに「増加のみ」に制限されるという制約**: G-Counterは値を減らす操作をサポートしない(減らす操作を許すと、2つのノードが同時に別々の理由で減らした場合、単純な`max`マージでは正しい結果にならない)。増減両方に対応するには、増加用と減少用の2つのG-Counterを組み合わせるPN-Counterのような、より洗練されたCRDTが必要になる
- **[2相コミット](/algorithms/two-phase-commit)との対比が示すCAP定理の選択**: 2相コミットが一貫性(Consistency)を優先し可用性を犠牲にするのに対し、CRDTは可用性(Availability)と分断耐性(Partition tolerance)を優先し、一貫性は「最終的には一致する(結果整合性)」という弱い形にとどめる——CAP定理が示す根本的なトレードオフに対する、対照的な設計判断の実例になっている
- **使いどころ**: 共同編集ツール(Google DocsやFigmaのような、複数人が同時にオフラインでも編集し続けられるリアルタイム協調編集)、モバイルアプリのオフライン対応(通信が復旧した際の自動的な状態マージ)、分散キャッシュ・分散カウンタ(いいね数のような近似的でよい集計値)、Redis・Riakのような分散データベースにおけるデータ型の実装基盤

## 実装例

```python
class GCounter:
    def __init__(self, node_id: int, num_nodes: int):
        self.node_id = node_id
        self.counts = [0] * num_nodes

    def increment(self) -> None:
        self.counts[self.node_id] += 1

    def value(self) -> int:
        return sum(self.counts)

    def merge(self, other: "GCounter") -> None:
        self.counts = [max(a, b) for a, b in zip(self.counts, other.counts)]
```

```typescript
class GCounter {
  nodeId: number;
  counts: number[];

  constructor(nodeId: number, numNodes: number) {
    this.nodeId = nodeId;
    this.counts = new Array(numNodes).fill(0);
  }

  increment(): void {
    this.counts[this.nodeId] += 1;
  }

  value(): number {
    return this.counts.reduce((a, b) => a + b, 0);
  }

  merge(other: GCounter): void {
    this.counts = this.counts.map((c, i) => Math.max(c, other.counts[i]));
  }
}
```

```cpp
#include <vector>
#include <algorithm>
#include <numeric>

class GCounter {
public:
    GCounter(int nodeId, int numNodes) : nodeId_(nodeId), counts_(numNodes, 0) {}

    void increment() { counts_[nodeId_] += 1; }

    long long value() const {
        return std::accumulate(counts_.begin(), counts_.end(), 0LL);
    }

    void merge(const GCounter& other) {
        for (size_t i = 0; i < counts_.size(); i++) {
            counts_[i] = std::max(counts_[i], other.counts_[i]);
        }
    }

    std::vector<int> counts_;

private:
    int nodeId_;
};
```

```rust
struct GCounter {
    node_id: usize,
    counts: Vec<u64>,
}

impl GCounter {
    fn new(node_id: usize, num_nodes: usize) -> Self {
        GCounter { node_id, counts: vec![0; num_nodes] }
    }

    fn increment(&mut self) {
        self.counts[self.node_id] += 1;
    }

    fn value(&self) -> u64 {
        self.counts.iter().sum()
    }

    fn merge(&mut self, other: &GCounter) {
        for i in 0..self.counts.len() {
            self.counts[i] = self.counts[i].max(other.counts[i]);
        }
    }
}
```

```csharp
class GCounter
{
    public int NodeId;
    public int[] Counts;

    public GCounter(int nodeId, int numNodes)
    {
        NodeId = nodeId;
        Counts = new int[numNodes];
    }

    public void Increment() => Counts[NodeId] += 1;

    public int Value() => Counts.Sum();

    public void Merge(GCounter other)
    {
        for (int i = 0; i < Counts.Length; i++) Counts[i] = Math.Max(Counts[i], other.Counts[i]);
    }
}
```
