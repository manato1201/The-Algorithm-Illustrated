---
name: SWIMプロトコル
category: 分散システム
subcategory: 障害検出・選出
complexity: O(1)(1ノードあたりの1ラウンドの通信量)、O(log n)(全体への情報伝播にかかるラウンド数)
summary: 各ノードがランダムに選んだ1台だけをping確認し、応答がなければ他のノードに間接確認を頼み、それでも駄目なら疑わしい状態としてゴシップで伝播させることで、メンバー管理の通信量をノード数に対してほぼ一定に抑える。
---

## 概要

[φ増加型故障検知器](/algorithms/phi-accrual-failure-detector)は「1対1の監視をどう賢く判定するか」を扱うが、クラスタの規模が数百〜数千台に及ぶと、**全ノードが全ノードを直接監視する**という単純な設計は通信量がノード数の2乗で増えてしまい破綻する。SWIM(Scalable Weakly-consistent Infection-style process group Membership)プロトコルは、2002年にコーネル大学の研究者らが提案した手法で、**各ノードは毎ラウンド、全メンバーの中からランダムに選んだ1台だけを確認する**という設計により、1ノードあたりの通信量をメンバー数に依存させずに一定に保つ。疑わしいノードの情報は、噂が広がるように(感染症の伝播になぞらえて"infection-style"と呼ばれる)ゴシップ通信に相乗りさせてクラスタ全体に伝播させることで、全体としては対数オーダーのラウンド数でメンバーシップ情報が行き渡る。Consul、Serf(HashiCorp)など実際の分散システムの基盤として使われている。

## 仕組み

1. **直接ping**: 各ノードは一定間隔(1ラウンド)ごとに、メンバーリストの中からランダムに1台を選んでpingメッセージを送る
2. 一定時間内にpingへの応答(ack)が返れば、そのノードは生存していると確認できる
3. **間接ping(Indirect Ping)**: 応答がなければ、いきなり故障とみなすのではなく、メンバーリストの中からさらにランダムに`k`台を選び、「代わりにこのノードへpingしてくれ」と依頼する。依頼された`k`台がそれぞれ対象ノードへpingし、誰か1台でも応答を受け取れれば、元のping元とのネットワーク経路だけがたまたま不調だっただけで、対象ノードは生存していると判定できる
4. 直接pingも間接pingも全て失敗した場合、そのノードを「疑わしい(Suspect)」状態としてマークし、この情報を**ゴシッププロトコル**([ゴシッププロトコル](/algorithms/gossip-protocol)と同様、他のメッセージに相乗りさせてランダムな相手に伝える方式)でクラスタ全体に広める
5. 疑わしいとマークされたノード自身が「自分はまだ生きている」という反証メッセージを一定時間内に広められなければ、一定のタイムアウト後に正式に「故障(Faulty)」と確定し、メンバーリストから除外される。反証があれば疑いは撤回される

## 特性・トレードオフ

- **通信量がメンバー数に対してスケールする**: 各ラウンドで1ノードが行う直接の通信は「1台へのping+失敗時のk台への間接ping依頼」という定数オーダーで済み、全ノードを総当たりで監視する方式のO(n²)通信量と比べて劇的にスケーラブルになる
- **間接pingによるネットワークの揺らぎへの頑健性**: 直接の経路がたまたま混雑・遅延していても、間接pingが別の経路を試すことで、実際には生きているノードを誤って故障と判定してしまう偽陽性を大きく減らせる
- **弱い一貫性(Weakly-consistent)というトレードオフ**: SWIMという名前が示す通り、ゴシップによる情報伝播には遅延があるため、ある瞬間にクラスタの全ノードが完全に同じメンバーシップ情報を持っているとは限らない(強い一貫性は保証しない)。しかし対数オーダーのラウンド数で情報が伝播するため、実用上は十分な速さで収束する
- **使いどころ**: 大規模分散システムのクラスタメンバーシップ管理(HashiCorp Serf/Consul、Cassandraの一部実装)、P2Pネットワークのノード生存確認、マイクロサービスのサービスディスカバリにおける健全性チェック、[Bullyアルゴリズム](/algorithms/bully-algorithm)のような小規模向けの故障検出をスケールさせる必要がある大規模クラスタ

## 実装例

```python
import random

class SwimNode:
    def __init__(self, node_id: str, members: list[str]):
        self.node_id = node_id
        self.members = [m for m in members if m != node_id]
        self.suspects: set[str] = set()

    def pick_random_target(self) -> str | None:
        alive = [m for m in self.members if m not in self.suspects]
        return random.choice(alive) if alive else None

    def direct_ping(self, target: str, responsive_nodes: set[str]) -> bool:
        return target in responsive_nodes

    def indirect_ping(self, target: str, responsive_nodes: set[str], k: int = 3) -> bool:
        candidates = [m for m in self.members if m != target]
        helpers = random.sample(candidates, min(k, len(candidates)))
        return any(target in responsive_nodes for _ in helpers)  # 簡略化: helperがtargetに届けば成功

    def failure_detection_round(self, responsive_nodes: set[str]) -> None:
        target = self.pick_random_target()
        if target is None:
            return
        if self.direct_ping(target, responsive_nodes):
            self.suspects.discard(target)
            return
        if self.indirect_ping(target, responsive_nodes):
            self.suspects.discard(target)
            return
        self.suspects.add(target)  # 疑わしい状態としてマークし、ゴシップで伝播させる
```

```typescript
class SwimNode {
  members: string[];
  suspects = new Set<string>();
  constructor(
    public nodeId: string,
    allMembers: string[],
  ) {
    this.members = allMembers.filter((m) => m !== nodeId);
  }

  pickRandomTarget(rand: () => number = Math.random): string | null {
    const alive = this.members.filter((m) => !this.suspects.has(m));
    return alive.length > 0 ? alive[Math.floor(rand() * alive.length)] : null;
  }

  directPing(target: string, responsiveNodes: Set<string>): boolean {
    return responsiveNodes.has(target);
  }

  indirectPing(target: string, responsiveNodes: Set<string>): boolean {
    return responsiveNodes.has(target); // 簡略化
  }

  failureDetectionRound(responsiveNodes: Set<string>): void {
    const target = this.pickRandomTarget();
    if (target === null) return;
    if (this.directPing(target, responsiveNodes)) {
      this.suspects.delete(target);
      return;
    }
    if (this.indirectPing(target, responsiveNodes)) {
      this.suspects.delete(target);
      return;
    }
    this.suspects.add(target);
  }
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <random>
#include <algorithm>

class SwimNode {
    std::string nodeId;
    std::vector<std::string> members;
    std::set<std::string> suspects;
    std::mt19937 rng{std::random_device{}()};

public:
    SwimNode(std::string nodeId_, const std::vector<std::string>& allMembers) : nodeId(std::move(nodeId_)) {
        for (auto& m : allMembers) if (m != nodeId) members.push_back(m);
    }

    std::string pickRandomTarget() {
        std::vector<std::string> alive;
        for (auto& m : members) if (!suspects.count(m)) alive.push_back(m);
        if (alive.empty()) return "";
        std::uniform_int_distribution<size_t> dist(0, alive.size() - 1);
        return alive[dist(rng)];
    }

    bool directPing(const std::string& target, const std::set<std::string>& responsiveNodes) {
        return responsiveNodes.count(target) > 0;
    }

    void failureDetectionRound(const std::set<std::string>& responsiveNodes) {
        std::string target = pickRandomTarget();
        if (target.empty()) return;
        if (directPing(target, responsiveNodes)) {
            suspects.erase(target);
            return;
        }
        suspects.insert(target);
    }
};
```

```rust
use std::collections::HashSet;
use rand::seq::SliceRandom;

struct SwimNode {
    node_id: String,
    members: Vec<String>,
    suspects: HashSet<String>,
}

impl SwimNode {
    fn new(node_id: String, all_members: Vec<String>) -> Self {
        let members = all_members.into_iter().filter(|m| m != &node_id).collect();
        SwimNode { node_id, members, suspects: HashSet::new() }
    }

    fn pick_random_target(&self, rng: &mut impl rand::Rng) -> Option<String> {
        let alive: Vec<&String> = self.members.iter().filter(|m| !self.suspects.contains(*m)).collect();
        alive.choose(rng).map(|s| s.to_string())
    }

    fn direct_ping(&self, target: &str, responsive_nodes: &HashSet<String>) -> bool {
        responsive_nodes.contains(target)
    }

    fn failure_detection_round(&mut self, responsive_nodes: &HashSet<String>, rng: &mut impl rand::Rng) {
        let target = match self.pick_random_target(rng) {
            Some(t) => t,
            None => return,
        };
        if self.direct_ping(&target, responsive_nodes) {
            self.suspects.remove(&target);
        } else {
            self.suspects.insert(target);
        }
    }
}
```

```csharp
class SwimNode
{
    public string NodeId;
    List<string> members;
    HashSet<string> suspects = new();
    Random rand = new();

    public SwimNode(string nodeId, List<string> allMembers)
    {
        NodeId = nodeId;
        members = allMembers.Where(m => m != nodeId).ToList();
    }

    string? PickRandomTarget()
    {
        var alive = members.Where(m => !suspects.Contains(m)).ToList();
        return alive.Count > 0 ? alive[rand.Next(alive.Count)] : null;
    }

    bool DirectPing(string target, HashSet<string> responsiveNodes) => responsiveNodes.Contains(target);

    public void FailureDetectionRound(HashSet<string> responsiveNodes)
    {
        var target = PickRandomTarget();
        if (target == null) return;
        if (DirectPing(target, responsiveNodes))
        {
            suspects.Remove(target);
            return;
        }
        suspects.Add(target);
    }
}
```
