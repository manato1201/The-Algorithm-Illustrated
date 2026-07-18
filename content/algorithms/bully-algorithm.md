---
name: ブリー・アルゴリズム(いじめっ子アルゴリズム)
category: 分散システム
subcategory: 障害検出・選出
complexity: O(n²)(最悪)
summary: ノードIDが最大のものが新リーダーになるまでメッセージをやり取りする、分散システムにおけるリーダー選出の古典的手法。
---

## 概要

分散システムで現在のリーダー(調整役)が故障したとき、残ったノードたちだけで新しいリーダーを選び直す必要がある。ブリー・アルゴリズム(1982年にHector Garcia-Molinaが考案)は、「**ノードIDが最も大きい者が、常に新しいリーダーになる**」というシンプルなルールで、この問題を解く古典的な手法。「IDの大きい者が小さい者を"押しのける(bully)"」ような振る舞いからこの名がついた。

## 仕組み

1. あるノードが、現在のリーダーからの応答がないことに気づくと、自分より**IDが大きい**全てのノードに「選挙(ELECTION)」メッセージを送る
2. IDが大きいノードから応答があれば、そのノードが選挙を引き継ぐので、自分は静かに結果を待つ
3. IDが大きいノードから一定時間応答がなければ、そのノードたちは(故障しているか、より優先度の低い状態にあると判断し)、自分こそが新しいリーダーだと確信し、全ノードに「新リーダー(COORDINATOR)」メッセージを送って通知する
4. 最終的に、生きているノードの中で**最もIDが大きいノード**が新しいリーダーとして確定する

「より偉い(IDが大きい)者に判断を仰ぎ、応答がなければ自分が最上位だと宣言する」という、階層構造をベースにしたシンプルな選出ロジックが特徴。

## 特性・トレードオフ

- **計算量**: 最悪ケースでO(n²)のメッセージ交換が必要になりうる(全ノードがほぼ同時に選挙を開始した場合など)。RaftやPaxosに比べると効率面では見劣りする
- **実装のシンプルさ**: 複雑な合意プロトコル(Paxos、Raftなど)に比べ、ルールが直感的で実装しやすい。教育目的や、要件がそこまで厳しくない小規模システムでの採用例がある
- **想定する障害モデルの単純さ**: メッセージが確実に届く(あるいは届かないことが検知できる)という比較的単純なネットワーク障害モデルを前提としており、Paxos/Raftが扱うような、より複雑な分断や遅延のシナリオへの耐性は弱い
- **使いどころ**: 分散システムにおけるリーダー選出の入門的な教材として、また、より高度な合意アルゴリズムを必要としない、障害の少ない小規模クラスタでのシンプルな調整役選出の仕組みとして使われることがある

## 実装例

複数の仮想ノードをオブジェクトのリストとして表現し、単一プロセス内でメッセージのやり取りを関数呼び出しとして模擬するシミュレーション実装。

```python
class Node:
    def __init__(self, node_id: int):
        self.id = node_id
        self.alive = True
        self.leader_id: int | None = None


class BullyCluster:
    def __init__(self, ids: list[int]):
        self.nodes = {i: Node(i) for i in ids}

    def crash(self, node_id: int) -> None:
        self.nodes[node_id].alive = False

    def _higher_alive(self, node_id: int) -> list[int]:
        return sorted(n.id for n in self.nodes.values() if n.id > node_id and n.alive)

    def hold_election(self, initiator_id: int, in_progress: set[int] | None = None) -> int:
        """ノードinitiator_idがリーダー無応答に気づき選挙を開始する"""
        if in_progress is None:
            in_progress = set()
        in_progress.add(initiator_id)

        higher = self._higher_alive(initiator_id)
        if not higher:
            # 自分よりIDが大きいノードが誰も応答しない -> 自分がリーダー
            return self._announce(initiator_id)

        # IDが大きいノードが応答すれば、そのノードが選挙を引き継ぐ
        for candidate in reversed(higher):
            if candidate in in_progress:
                continue
            return self.hold_election(candidate, in_progress)
        return self._announce(initiator_id)

    def _announce(self, leader_id: int) -> int:
        for n in self.nodes.values():
            if n.alive:
                n.leader_id = leader_id
        return leader_id
```

```typescript
class BullyNode {
  id: number;
  alive: boolean;
  leaderId: number | null;
  constructor(id: number) {
    this.id = id;
    this.alive = true;
    this.leaderId = null;
  }
}

class BullyCluster {
  nodes: Map<number, BullyNode>;
  constructor(ids: number[]) {
    this.nodes = new Map(ids.map((id) => [id, new BullyNode(id)]));
  }
  crash(id: number): void {
    this.nodes.get(id)!.alive = false;
  }
  private higherAlive(id: number): number[] {
    return [...this.nodes.values()]
      .filter((n) => n.id > id && n.alive)
      .map((n) => n.id)
      .sort((a, b) => a - b);
  }
  holdElection(initiatorId: number, inProgress: Set<number> = new Set()): number {
    inProgress.add(initiatorId);
    const higher = this.higherAlive(initiatorId);
    if (higher.length === 0) return this.announce(initiatorId);

    for (const candidate of [...higher].reverse()) {
      if (inProgress.has(candidate)) continue;
      return this.holdElection(candidate, inProgress);
    }
    return this.announce(initiatorId);
  }
  private announce(leaderId: number): number {
    for (const n of this.nodes.values()) if (n.alive) n.leaderId = leaderId;
    return leaderId;
  }
}
```

```cpp
#include <map>
#include <vector>
#include <set>
#include <algorithm>

struct BullyNode {
    int id;
    bool alive = true;
    int leaderId = -1;
};

class BullyCluster {
public:
    explicit BullyCluster(const std::vector<int>& ids) {
        for (int id : ids) nodes[id] = BullyNode{id};
    }

    void crash(int id) { nodes[id].alive = false; }

    int holdElection(int initiatorId, std::set<int> inProgress = {}) {
        inProgress.insert(initiatorId);
        auto higher = higherAlive(initiatorId);
        if (higher.empty()) return announce(initiatorId);

        for (auto it = higher.rbegin(); it != higher.rend(); ++it) {
            if (inProgress.count(*it)) continue;
            return holdElection(*it, inProgress);
        }
        return announce(initiatorId);
    }

private:
    std::map<int, BullyNode> nodes;

    std::vector<int> higherAlive(int id) const {
        std::vector<int> result;
        for (auto& [nid, n] : nodes) {
            if (nid > id && n.alive) result.push_back(nid);
        }
        return result;  // mapのキーは昇順なのでソート済み
    }

    int announce(int leaderId) {
        for (auto& [nid, n] : nodes) {
            if (n.alive) n.leaderId = leaderId;
        }
        return leaderId;
    }
};
```

```rust
use std::collections::{HashMap, HashSet};

struct BullyNode {
    id: i32,
    alive: bool,
    leader_id: Option<i32>,
}

struct BullyCluster {
    nodes: HashMap<i32, BullyNode>,
}

impl BullyCluster {
    fn new(ids: &[i32]) -> Self {
        let nodes = ids
            .iter()
            .map(|&id| (id, BullyNode { id, alive: true, leader_id: None }))
            .collect();
        BullyCluster { nodes }
    }

    fn crash(&mut self, id: i32) {
        self.nodes.get_mut(&id).unwrap().alive = false;
    }

    fn higher_alive(&self, id: i32) -> Vec<i32> {
        let mut v: Vec<i32> = self.nodes.values().filter(|n| n.id > id && n.alive).map(|n| n.id).collect();
        v.sort();
        v
    }

    fn hold_election(&mut self, initiator_id: i32, in_progress: &mut HashSet<i32>) -> i32 {
        in_progress.insert(initiator_id);
        let higher = self.higher_alive(initiator_id);
        if higher.is_empty() {
            return self.announce(initiator_id);
        }
        for &candidate in higher.iter().rev() {
            if in_progress.contains(&candidate) {
                continue;
            }
            return self.hold_election(candidate, in_progress);
        }
        self.announce(initiator_id)
    }

    fn announce(&mut self, leader_id: i32) -> i32 {
        for n in self.nodes.values_mut() {
            if n.alive {
                n.leader_id = Some(leader_id);
            }
        }
        leader_id
    }
}
```

```csharp
class BullyNode
{
    public int Id;
    public bool Alive = true;
    public int? LeaderId;
    public BullyNode(int id) { Id = id; }
}

class BullyCluster
{
    public Dictionary<int, BullyNode> Nodes;
    public BullyCluster(List<int> ids) { Nodes = ids.ToDictionary(id => id, id => new BullyNode(id)); }
    public void Crash(int id) { Nodes[id].Alive = false; }

    private List<int> HigherAlive(int id) =>
        Nodes.Values.Where(n => n.Id > id && n.Alive).Select(n => n.Id).OrderBy(x => x).ToList();

    public int HoldElection(int initiatorId, HashSet<int>? inProgress = null)
    {
        inProgress ??= new HashSet<int>();
        inProgress.Add(initiatorId);
        var higher = HigherAlive(initiatorId);
        if (higher.Count == 0) return Announce(initiatorId);

        foreach (var candidate in Enumerable.Reverse(higher))
        {
            if (inProgress.Contains(candidate)) continue;
            return HoldElection(candidate, inProgress);
        }
        return Announce(initiatorId);
    }

    private int Announce(int leaderId)
    {
        foreach (var n in Nodes.Values) if (n.Alive) n.LeaderId = leaderId;
        return leaderId;
    }
}
```
