---
name: Raft
category: 分散システム
subcategory: 合意形成
complexity: O(ノード数)(メッセージ数)
summary: リーダー選出とログ複製を分離して理解しやすく設計した合意アルゴリズム。「Paxosより分かりやすい」ことを目標に生まれた。
---

## 概要

Paxosが理論的に正しい一方で「実装者にとって理解しにくい」という批判を受け続けたことを受け、2014年にDiego OngaroとJohn Ousterhoutが**「理解しやすさ」を設計目標の中心に据えて**開発した合意アルゴリズム。Paxosと同等の安全性を保証しながら、「常に1人のリーダーがいる」という直感的な構造にすることで、実装・教育のしやすさを大きく向上させた。

## 仕組み

Raftのノードは常に「リーダー」「フォロワー」「候補者」のいずれかの状態にあり、処理を3つの独立した問題に分割している。

1. **リーダー選出**: リーダーからの定期的な信号(ハートビート)が一定時間届かないと、フォロワーは「候補者」になり、他のノードに投票を依頼する。過半数の票を得た候補者が新しいリーダーになる
2. **ログ複製**: クライアントからの操作は全てリーダーが受け付け、リーダーは自分のログにその操作を追加してから、フォロワーたちに複製するよう指示する。過半数のフォロワーが複製に成功すれば、その操作は「確定(コミット)」される
3. **安全性**: リーダー選出のルールに「ログが最も新しい候補者しかリーダーになれない」という制約を設けることで、確定済みの操作が後から失われることがないよう保証する

Paxosが「誰でも提案できる」柔軟な構造だったのに対し、Raftは「常に1人のリーダーだけが操作を受け付ける」という強い制約を課すことで、システム全体の動きが直感的に追いやすくなっている。

## 特性・トレードオフ

- **計算量**: Paxosと同様、O(ノード数)のメッセージ交換
- **理解しやすさが実用上の価値になった好例**: 理論的な優劣ではなく「実装者・運用者が正しく理解し、正しく実装できるか」がシステムの信頼性に直結するという教訓を体現しており、公開当初から急速に多くの実装(etcd, Consul, CockroachDBなど)に採用された
- **リーダーへの依存**: 常に1つのリーダーに操作が集中するため、リーダーがボトルネックになりうる。一方でこの構造のシンプルさが、障害時の挙動を予測しやすくしている
- **使いどころ**: etcd(Kubernetesの構成データストア)、Consul(サービスディスカバリ)、CockroachDBやTiDBのような分散データベースのレプリケーション機構など、現代のクラウドインフラの根幹で広く採用されている

## 実装例

単一プロセス内で複数のノードをオブジェクトとして表現し、リーダー選出とログ複製を関数呼び出しとして模擬したシミュレーション実装。

```python
class RaftNode:
    def __init__(self, node_id: int):
        self.id = node_id
        self.state = "follower"  # follower | candidate | leader
        self.current_term = 0
        self.voted_for: int | None = None
        self.log: list[tuple[int, str]] = []  # (term, command)
        self.alive = True

    def last_log_term(self) -> int:
        return self.log[-1][0] if self.log else 0

    def last_log_index(self) -> int:
        return len(self.log) - 1


class RaftCluster:
    def __init__(self, ids: list[int]):
        self.nodes = {i: RaftNode(i) for i in ids}
        self.leader_id: int | None = None

    def elect_leader(self, candidate_id: int) -> int | None:
        """リーダー選出: 候補者は自分に投票し、他ノードに投票を依頼する。
        過半数の票を得れば新しいリーダーになる。"""
        candidate = self.nodes[candidate_id]
        candidate.state = "candidate"
        candidate.current_term += 1
        candidate.voted_for = candidate_id
        votes = 1  # 自分自身への投票

        for n in self.nodes.values():
            if n.id == candidate_id or not n.alive:
                continue
            # ログが自分より新しいか同等の候補者にのみ投票する(安全性の担保)
            grant = (
                (n.voted_for is None or n.current_term < candidate.current_term)
                and candidate.current_term >= n.current_term
                and (
                    candidate.last_log_term() > n.last_log_term()
                    or (
                        candidate.last_log_term() == n.last_log_term()
                        and candidate.last_log_index() >= n.last_log_index()
                    )
                )
            )
            if grant:
                n.current_term = candidate.current_term
                n.voted_for = candidate_id
                votes += 1

        alive_count = sum(1 for n in self.nodes.values() if n.alive)
        majority = alive_count // 2 + 1
        if votes >= majority:
            candidate.state = "leader"
            self.leader_id = candidate_id
            for n in self.nodes.values():
                if n.alive and n.id != candidate_id:
                    n.state = "follower"
                    n.current_term = candidate.current_term
            return candidate_id
        candidate.state = "follower"
        return None

    def replicate(self, command: str) -> bool:
        """ログ複製: リーダーが自分のログに追加し、フォロワーに複製を指示する。
        過半数が複製に成功すればコミット確定。"""
        leader = self.nodes[self.leader_id]
        entry = (leader.current_term, command)
        leader.log.append(entry)

        ack = 1  # リーダー自身
        for n in self.nodes.values():
            if n.id == leader.id or not n.alive:
                continue
            n.log.append(entry)
            ack += 1

        alive_count = sum(1 for n in self.nodes.values() if n.alive)
        majority = alive_count // 2 + 1
        return ack >= majority
```

```typescript
type LogEntry = [number, string];

class RaftNode {
  id: number;
  state: string;
  currentTerm: number;
  votedFor: number | null;
  log: LogEntry[];
  alive: boolean;
  constructor(id: number) {
    this.id = id;
    this.state = "follower";
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
    this.alive = true;
  }
  lastLogTerm(): number {
    return this.log.length ? this.log[this.log.length - 1][0] : 0;
  }
  lastLogIndex(): number {
    return this.log.length - 1;
  }
}

class RaftCluster {
  nodes: Map<number, RaftNode>;
  leaderId: number | null = null;
  constructor(ids: number[]) {
    this.nodes = new Map(ids.map((id) => [id, new RaftNode(id)]));
  }

  electLeader(candidateId: number): number | null {
    const candidate = this.nodes.get(candidateId)!;
    candidate.state = "candidate";
    candidate.currentTerm++;
    candidate.votedFor = candidateId;
    let votes = 1;

    for (const n of this.nodes.values()) {
      if (n.id === candidateId || !n.alive) continue;
      const grant =
        (n.votedFor === null || n.currentTerm < candidate.currentTerm) &&
        candidate.currentTerm >= n.currentTerm &&
        (candidate.lastLogTerm() > n.lastLogTerm() ||
          (candidate.lastLogTerm() === n.lastLogTerm() && candidate.lastLogIndex() >= n.lastLogIndex()));
      if (grant) {
        n.currentTerm = candidate.currentTerm;
        n.votedFor = candidateId;
        votes++;
      }
    }

    const aliveCount = [...this.nodes.values()].filter((n) => n.alive).length;
    const majority = Math.floor(aliveCount / 2) + 1;
    if (votes >= majority) {
      candidate.state = "leader";
      this.leaderId = candidateId;
      for (const n of this.nodes.values()) {
        if (n.alive && n.id !== candidateId) {
          n.state = "follower";
          n.currentTerm = candidate.currentTerm;
        }
      }
      return candidateId;
    }
    candidate.state = "follower";
    return null;
  }

  replicate(command: string): boolean {
    const leader = this.nodes.get(this.leaderId!)!;
    const entry: LogEntry = [leader.currentTerm, command];
    leader.log.push(entry);
    let ack = 1;
    for (const n of this.nodes.values()) {
      if (n.id === leader.id || !n.alive) continue;
      n.log.push(entry);
      ack++;
    }
    const aliveCount = [...this.nodes.values()].filter((n) => n.alive).length;
    const majority = Math.floor(aliveCount / 2) + 1;
    return ack >= majority;
  }
}
```

```cpp
#include <map>
#include <vector>
#include <string>
#include <optional>

struct RaftNode {
    int id;
    std::string state = "follower";
    int currentTerm = 0;
    std::optional<int> votedFor;
    std::vector<std::pair<int, std::string>> log;  // (term, command)
    bool alive = true;

    int lastLogTerm() const { return log.empty() ? 0 : log.back().first; }
    int lastLogIndex() const { return static_cast<int>(log.size()) - 1; }
};

class RaftCluster {
public:
    explicit RaftCluster(const std::vector<int>& ids) {
        for (int id : ids) nodes[id] = RaftNode{id};
    }

    std::optional<int> electLeader(int candidateId) {
        auto& candidate = nodes[candidateId];
        candidate.state = "candidate";
        candidate.currentTerm++;
        candidate.votedFor = candidateId;
        int votes = 1;

        for (auto& [id, n] : nodes) {
            if (id == candidateId || !n.alive) continue;
            bool grant = (!n.votedFor.has_value() || n.currentTerm < candidate.currentTerm) &&
                         candidate.currentTerm >= n.currentTerm &&
                         (candidate.lastLogTerm() > n.lastLogTerm() ||
                          (candidate.lastLogTerm() == n.lastLogTerm() && candidate.lastLogIndex() >= n.lastLogIndex()));
            if (grant) {
                n.currentTerm = candidate.currentTerm;
                n.votedFor = candidateId;
                votes++;
            }
        }

        int aliveCount = 0;
        for (auto& [id, n] : nodes) if (n.alive) aliveCount++;
        int majority = aliveCount / 2 + 1;

        if (votes >= majority) {
            candidate.state = "leader";
            leaderId = candidateId;
            for (auto& [id, n] : nodes) {
                if (n.alive && id != candidateId) {
                    n.state = "follower";
                    n.currentTerm = candidate.currentTerm;
                }
            }
            return candidateId;
        }
        candidate.state = "follower";
        return std::nullopt;
    }

    bool replicate(const std::string& command) {
        auto& leader = nodes[*leaderId];
        auto entry = std::make_pair(leader.currentTerm, command);
        leader.log.push_back(entry);
        int ack = 1;
        for (auto& [id, n] : nodes) {
            if (id == leader.id || !n.alive) continue;
            n.log.push_back(entry);
            ack++;
        }
        int aliveCount = 0;
        for (auto& [id, n] : nodes) if (n.alive) aliveCount++;
        int majority = aliveCount / 2 + 1;
        return ack >= majority;
    }

private:
    std::map<int, RaftNode> nodes;
    std::optional<int> leaderId;
};
```

```rust
use std::collections::HashMap;

struct RaftNode {
    id: i32,
    state: String,
    current_term: i32,
    voted_for: Option<i32>,
    log: Vec<(i32, String)>, // (term, command)
    alive: bool,
}

impl RaftNode {
    fn new(id: i32) -> Self {
        RaftNode { id, state: "follower".into(), current_term: 0, voted_for: None, log: Vec::new(), alive: true }
    }
    fn last_log_term(&self) -> i32 {
        self.log.last().map(|(t, _)| *t).unwrap_or(0)
    }
    fn last_log_index(&self) -> i32 {
        self.log.len() as i32 - 1
    }
}

struct RaftCluster {
    nodes: HashMap<i32, RaftNode>,
    leader_id: Option<i32>,
}

impl RaftCluster {
    fn new(ids: &[i32]) -> Self {
        let nodes = ids.iter().map(|&id| (id, RaftNode::new(id))).collect();
        RaftCluster { nodes, leader_id: None }
    }

    fn elect_leader(&mut self, candidate_id: i32) -> Option<i32> {
        let (cand_term, cand_last_log_term, cand_last_log_index) = {
            let candidate = self.nodes.get_mut(&candidate_id).unwrap();
            candidate.state = "candidate".into();
            candidate.current_term += 1;
            candidate.voted_for = Some(candidate_id);
            (candidate.current_term, candidate.last_log_term(), candidate.last_log_index())
        };
        let mut votes = 1;

        for n in self.nodes.values_mut() {
            if n.id == candidate_id || !n.alive {
                continue;
            }
            let grant = (n.voted_for.is_none() || n.current_term < cand_term)
                && cand_term >= n.current_term
                && (cand_last_log_term > n.last_log_term()
                    || (cand_last_log_term == n.last_log_term() && cand_last_log_index >= n.last_log_index()));
            if grant {
                n.current_term = cand_term;
                n.voted_for = Some(candidate_id);
                votes += 1;
            }
        }

        let alive_count = self.nodes.values().filter(|n| n.alive).count();
        let majority = alive_count / 2 + 1;

        if votes >= majority {
            let candidate = self.nodes.get_mut(&candidate_id).unwrap();
            candidate.state = "leader".into();
            self.leader_id = Some(candidate_id);
            for n in self.nodes.values_mut() {
                if n.alive && n.id != candidate_id {
                    n.state = "follower".into();
                    n.current_term = cand_term;
                }
            }
            Some(candidate_id)
        } else {
            self.nodes.get_mut(&candidate_id).unwrap().state = "follower".into();
            None
        }
    }

    fn replicate(&mut self, command: &str) -> bool {
        let leader_id = self.leader_id.unwrap();
        let leader_term = self.nodes[&leader_id].current_term;
        let entry = (leader_term, command.to_string());
        self.nodes.get_mut(&leader_id).unwrap().log.push(entry.clone());

        let mut ack = 1;
        for n in self.nodes.values_mut() {
            if n.id == leader_id || !n.alive {
                continue;
            }
            n.log.push(entry.clone());
            ack += 1;
        }
        let alive_count = self.nodes.values().filter(|n| n.alive).count();
        let majority = alive_count / 2 + 1;
        ack >= majority
    }
}
```

```csharp
class RaftNode
{
    public int Id;
    public string State = "follower";
    public int CurrentTerm = 0;
    public int? VotedFor;
    public List<(int term, string cmd)> Log = new();
    public bool Alive = true;
    public RaftNode(int id) { Id = id; }
    public int LastLogTerm() => Log.Count > 0 ? Log[^1].term : 0;
    public int LastLogIndex() => Log.Count - 1;
}

class RaftCluster
{
    public Dictionary<int, RaftNode> Nodes;
    public int? LeaderId;
    public RaftCluster(List<int> ids) { Nodes = ids.ToDictionary(id => id, id => new RaftNode(id)); }

    public int? ElectLeader(int candidateId)
    {
        var candidate = Nodes[candidateId];
        candidate.State = "candidate";
        candidate.CurrentTerm++;
        candidate.VotedFor = candidateId;
        int votes = 1;

        foreach (var n in Nodes.Values)
        {
            if (n.Id == candidateId || !n.Alive) continue;
            bool grant = (n.VotedFor == null || n.CurrentTerm < candidate.CurrentTerm)
                && candidate.CurrentTerm >= n.CurrentTerm
                && (candidate.LastLogTerm() > n.LastLogTerm()
                    || (candidate.LastLogTerm() == n.LastLogTerm() && candidate.LastLogIndex() >= n.LastLogIndex()));
            if (grant) { n.CurrentTerm = candidate.CurrentTerm; n.VotedFor = candidateId; votes++; }
        }

        int aliveCount = Nodes.Values.Count(n => n.Alive);
        int majority = aliveCount / 2 + 1;
        if (votes >= majority)
        {
            candidate.State = "leader";
            LeaderId = candidateId;
            foreach (var n in Nodes.Values)
                if (n.Alive && n.Id != candidateId) { n.State = "follower"; n.CurrentTerm = candidate.CurrentTerm; }
            return candidateId;
        }
        candidate.State = "follower";
        return null;
    }

    public bool Replicate(string command)
    {
        var leader = Nodes[LeaderId!.Value];
        var entry = (leader.CurrentTerm, command);
        leader.Log.Add(entry);
        int ack = 1;
        foreach (var n in Nodes.Values)
        {
            if (n.Id == leader.Id || !n.Alive) continue;
            n.Log.Add(entry);
            ack++;
        }
        int aliveCount = Nodes.Values.Count(n => n.Alive);
        int majority = aliveCount / 2 + 1;
        return ack >= majority;
    }
}
```
