---
name: ベクタークロック
category: 分散システム
subcategory: データ分散・整合性
complexity: O(ノード数)
summary: 各ノードが持つカウンタの組で、分散システムにおけるイベントの因果関係(並行も含め)を判定する。
---

## 概要

分散システムでは、各ノードが独立した時計を持ち、ネットワーク遅延もばらばらなため、「どのイベントが先に起きたか」を単純な時刻の比較だけでは正しく判定できない。ベクタークロックは、**「因果関係(あるイベントが別のイベントの結果として起きたか)」**と**「並行関係(互いに影響を与えていない、同時に起きたとみなせる関係)」**を、実際の時刻に頼らずに正しく区別するための仕組み。1988年にColin Fidge、Friedemann Matternらが独立に考案した。

## 仕組み

各ノードは、システム内の全ノード分の要素を持つ「ベクタ(数の組)」を管理する。

1. あるノードで新しいイベントが起きるたびに、**そのノード自身に対応する要素だけ**を1増やす
2. あるノードが別のノードにメッセージを送るときは、自分のベクタ全体をメッセージに添付する
3. メッセージを受け取ったノードは、受け取ったベクタと自分のベクタを**要素ごとに大きい方を採用**してマージし、さらに自分自身の要素を1増やす
4. 2つのイベントのベクタを比較するとき、片方が全要素において他方以上であれば「片方がもう片方の原因(またはその後)」、どちらの要素が大きいとも言えなければ「並行(互いに無関係)」と判定できる

「自分のノードでの出来事の回数」と「他のノードから伝わってきた情報の反映」を1つのベクタにまとめることで、メッセージのやり取りを通じて伝播する"因果の連鎖"を正確に追跡できる。

## 特性・トレードオフ

- **計算量**: ベクタのサイズがノード数に比例するため、更新・比較ともにO(ノード数)
- **単純な時刻(タイムスタンプ)との違い**: 単一の数値によるタイムスタンプ(ランポートタイムスタンプ)は「因果関係があるなら順序が保たれる」ことは保証するが、「並行しているイベント」を区別できない。ベクタークロックは、この並行性まで正確に判定できる、より強力な仕組み
- **ノード数増加に伴うスケーラビリティの課題**: ベクタのサイズがノード数に比例して大きくなるため、ノード数が非常に多い大規模システムではオーバーヘッドが無視できなくなる。この問題に対処する圧縮版(バージョンベクタの一種など)も存在する
- **使いどころ**: Amazon Dynamo(分散キーバリューストア)における、複数のレプリカ間でのデータ競合(コンフリクト)の検出、分散バージョン管理システム、CRDT(Conflict-free Replicated Data Type)における因果関係の追跡など

## 実装例

```python
class VectorClockNode:
    def __init__(self, node_index: int, n_nodes: int):
        self.node_index = node_index
        self.clock = [0] * n_nodes

    def tick(self) -> list[int]:
        """自分自身のイベント発生時、自分の要素だけ増やす"""
        self.clock[self.node_index] += 1
        return list(self.clock)

    def send(self) -> list[int]:
        """メッセージ送信時、自分のベクタ全体を添付する"""
        self.tick()
        return list(self.clock)

    def receive(self, incoming: list[int]) -> list[int]:
        """受信時、要素ごとに大きい方を採用してマージし、自分の要素を増やす"""
        self.clock = [max(a, b) for a, b in zip(self.clock, incoming)]
        self.clock[self.node_index] += 1
        return list(self.clock)


def compare(v1: list[int], v2: list[int]) -> str:
    """片方が全要素で他方以上なら因果関係あり、そうでなければ並行"""
    le = all(a <= b for a, b in zip(v1, v2))
    ge = all(a >= b for a, b in zip(v1, v2))
    if v1 == v2:
        return "equal"
    if le:
        return "before"  # v1 happened-before v2
    if ge:
        return "after"
    return "concurrent"
```

```typescript
class VectorClockNode {
  nodeIndex: number;
  clock: number[];
  constructor(nodeIndex: number, nNodes: number) {
    this.nodeIndex = nodeIndex;
    this.clock = new Array(nNodes).fill(0);
  }
  tick(): number[] {
    this.clock[this.nodeIndex]++;
    return [...this.clock];
  }
  send(): number[] {
    this.tick();
    return [...this.clock];
  }
  receive(incoming: number[]): number[] {
    this.clock = this.clock.map((v, i) => Math.max(v, incoming[i]));
    this.clock[this.nodeIndex]++;
    return [...this.clock];
  }
}

function compare(v1: number[], v2: number[]): string {
  const le = v1.every((v, i) => v <= v2[i]);
  const ge = v1.every((v, i) => v >= v2[i]);
  if (JSON.stringify(v1) === JSON.stringify(v2)) return "equal";
  if (le) return "before";
  if (ge) return "after";
  return "concurrent";
}
```

```cpp
#include <vector>
#include <algorithm>
#include <string>

class VectorClockNode {
public:
    VectorClockNode(int nodeIndex, int nNodes) : nodeIndex(nodeIndex), clock(nNodes, 0) {}

    std::vector<int> tick() {
        clock[nodeIndex]++;
        return clock;
    }

    std::vector<int> send() {
        tick();
        return clock;
    }

    std::vector<int> receive(const std::vector<int>& incoming) {
        for (size_t i = 0; i < clock.size(); i++) clock[i] = std::max(clock[i], incoming[i]);
        clock[nodeIndex]++;
        return clock;
    }

private:
    int nodeIndex;
    std::vector<int> clock;
};

std::string compare(const std::vector<int>& v1, const std::vector<int>& v2) {
    bool le = true, ge = true, eq = true;
    for (size_t i = 0; i < v1.size(); i++) {
        if (v1[i] > v2[i]) le = false;
        if (v1[i] < v2[i]) ge = false;
        if (v1[i] != v2[i]) eq = false;
    }
    if (eq) return "equal";
    if (le) return "before";
    if (ge) return "after";
    return "concurrent";
}
```

```rust
struct VectorClockNode {
    node_index: usize,
    clock: Vec<i32>,
}

impl VectorClockNode {
    fn new(node_index: usize, n_nodes: usize) -> Self {
        VectorClockNode { node_index, clock: vec![0; n_nodes] }
    }

    fn tick(&mut self) -> Vec<i32> {
        self.clock[self.node_index] += 1;
        self.clock.clone()
    }

    fn send(&mut self) -> Vec<i32> {
        self.tick()
    }

    fn receive(&mut self, incoming: &[i32]) -> Vec<i32> {
        for i in 0..self.clock.len() {
            self.clock[i] = self.clock[i].max(incoming[i]);
        }
        self.clock[self.node_index] += 1;
        self.clock.clone()
    }
}

#[derive(PartialEq)]
enum Relation {
    Equal,
    Before,
    After,
    Concurrent,
}

fn compare(v1: &[i32], v2: &[i32]) -> Relation {
    let le = v1.iter().zip(v2).all(|(a, b)| a <= b);
    let ge = v1.iter().zip(v2).all(|(a, b)| a >= b);
    if v1 == v2 {
        Relation::Equal
    } else if le {
        Relation::Before
    } else if ge {
        Relation::After
    } else {
        Relation::Concurrent
    }
}
```

```csharp
class VectorClockNode
{
    private readonly int nodeIndex;
    public int[] Clock;
    public VectorClockNode(int nodeIndex, int nNodes) { this.nodeIndex = nodeIndex; Clock = new int[nNodes]; }

    public int[] Tick()
    {
        Clock[nodeIndex]++;
        return (int[])Clock.Clone();
    }

    public int[] Send() => Tick();

    public int[] Receive(int[] incoming)
    {
        for (int i = 0; i < Clock.Length; i++) Clock[i] = Math.Max(Clock[i], incoming[i]);
        Clock[nodeIndex]++;
        return (int[])Clock.Clone();
    }
}

static class VectorClockUtil
{
    public static string Compare(int[] v1, int[] v2)
    {
        bool le = true, ge = true, eq = true;
        for (int i = 0; i < v1.Length; i++)
        {
            if (v1[i] > v2[i]) le = false;
            if (v1[i] < v2[i]) ge = false;
            if (v1[i] != v2[i]) eq = false;
        }
        if (eq) return "equal";
        if (le) return "before";
        if (ge) return "after";
        return "concurrent";
    }
}
```
