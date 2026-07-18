---
name: Paxos
category: 分散システム
subcategory: 合意形成
complexity: O(ノード数)(メッセージ数)
summary: 一部のノードが故障・遅延しても、分散システム全体で1つの値に合意できることを保証する合意アルゴリズムの原典。
---

## 概要

複数のコンピュータ(ノード)が、ネットワーク遅延や一部のノードの故障が起きうる環境で、それでも**全員が同じ1つの値に合意する**ことを保証する「合意アルゴリズム」の元祖。1989年にLeslie Lamportが考案した(ギリシャのパクソス島の議会を比喩にした論文で発表されたことが名前の由来)。分散データベースのレプリケーション、分散ロック、リーダー選出など、あらゆる分散システムの信頼性の根幹を支える理論。

## 仕組み

Paxosには「提案者(Proposer)」「受理者(Acceptor)」「学習者(Learner)」という役割があり、大きく2つのフェーズで進む。

1. **フェーズ1(Prepare)**: 提案者は、これまでより大きい一意な提案番号を選び、過半数の受理者に「この番号で提案してよいか」を問い合わせる。受理者は、それより小さい番号の提案をもう受け付けない、と約束して応答する(既に別の値を受理していれば、その情報も一緒に返す)
2. **フェーズ2(Accept)**: 過半数から返答を得た提案者は、受け取った情報(既に受理された値があればそれを、なければ自分の望む値を)採用して、正式な提案を過半数の受理者に送る。受理者は、フェーズ1で約束した番号より小さくなければこれを受理する
3. 過半数の受理者が同じ値を受理すれば、その値が全体の合意結果として確定する

**「過半数」という仕組みが鍵**: 過半数から同意を得た提案は、他のどの過半数の集合とも必ず1つ以上重なるため、矛盾する2つの値が同時に合意されることは数学的に起こりえない。

## 特性・トレードオフ

- **計算量**: 合意1回あたりO(ノード数)のメッセージ交換
- **正しさと理解しやすさのトレードオフ**: Paxosは正しさの証明が厳密である一方、**実装・理解が難しいことで悪名高い**アルゴリズムとしても知られており、この複雑さが後にRaftのような「理解しやすさ」を主目的にした代替アルゴリズムを生む動機になった
- **CAP定理との関係**: ネットワーク分断が起きても(過半数が生きていれば)一貫性を保てるが、少数派側は合意に参加できなくなる、というCAP定理の一貫性(Consistency)を優先する設計思想を体現している
- **使いどころ**: Google Chubby、Google Spanner、Apache ZooKeeperの内部(実際にはZabという類似アルゴリズムを使用)など、大規模分散システムにおける合意形成・分散ロック・設定管理の基盤技術として、理論・実装の両面で影響を与え続けている

## 実装例

単一の値に対する合意(Single-Decree Paxos)を、提案者(Proposer)と受理者(Acceptor)を単一プロセス内のオブジェクトとして表現し、Prepare/Acceptの2フェーズを関数呼び出しで模擬したシミュレーション実装。

```python
class Acceptor:
    def __init__(self, node_id: int):
        self.id = node_id
        self.promised_id: int | None = None
        self.accepted_id: int | None = None
        self.accepted_value = None
        self.alive = True

    def prepare(self, proposal_id: int):
        """フェーズ1: より小さい番号の提案はもう受け付けないと約束する"""
        if self.promised_id is not None and proposal_id <= self.promised_id:
            return None  # 拒否
        self.promised_id = proposal_id
        return self.accepted_id, self.accepted_value  # 既に受理済みの値があれば返す

    def accept(self, proposal_id: int, value) -> bool:
        """フェーズ2: 約束した番号より小さくなければ受理する"""
        if self.promised_id is not None and proposal_id < self.promised_id:
            return False
        self.promised_id = proposal_id
        self.accepted_id = proposal_id
        self.accepted_value = value
        return True


_proposal_counter = 0


def propose(proposer_id: int, acceptors: list[Acceptor], value):
    global _proposal_counter
    _proposal_counter += 1
    proposal_id = _proposal_counter * 100 + proposer_id  # 一意な提案番号

    alive_acceptors = [a for a in acceptors if a.alive]
    majority = len(acceptors) // 2 + 1

    # フェーズ1: Prepare
    promises = []
    for a in alive_acceptors:
        resp = a.prepare(proposal_id)
        if resp is not None:
            promises.append((a, resp))
    if len(promises) < majority:
        return None  # 過半数の約束が得られなかった

    # 既に受理された値があれば、その中で最大の受理番号を持つ値を採用する
    chosen_value = value
    highest_accepted_id = -1
    for _, (acc_id, acc_val) in promises:
        if acc_id is not None and acc_id > highest_accepted_id:
            highest_accepted_id = acc_id
            chosen_value = acc_val

    # フェーズ2: Accept
    accepts = sum(1 for a, _ in promises if a.accept(proposal_id, chosen_value))
    return chosen_value if accepts >= majority else None
```

```typescript
class Acceptor {
  id: number;
  promisedId: number | null = null;
  acceptedId: number | null = null;
  acceptedValue: string | null = null;
  alive = true;
  constructor(id: number) {
    this.id = id;
  }
  prepare(proposalId: number): [number | null, string | null] | null {
    if (this.promisedId !== null && proposalId <= this.promisedId) return null;
    this.promisedId = proposalId;
    return [this.acceptedId, this.acceptedValue];
  }
  accept(proposalId: number, value: string): boolean {
    if (this.promisedId !== null && proposalId < this.promisedId) return false;
    this.promisedId = proposalId;
    this.acceptedId = proposalId;
    this.acceptedValue = value;
    return true;
  }
}

let proposalCounter = 0;

function propose(proposerId: number, acceptors: Acceptor[], value: string): string | null {
  proposalCounter++;
  const proposalId = proposalCounter * 100 + proposerId;
  const alive = acceptors.filter((a) => a.alive);
  const majority = Math.floor(acceptors.length / 2) + 1;

  // フェーズ1: Prepare
  const promises: [Acceptor, [number | null, string | null]][] = [];
  for (const a of alive) {
    const resp = a.prepare(proposalId);
    if (resp !== null) promises.push([a, resp]);
  }
  if (promises.length < majority) return null;

  let chosenValue = value;
  let highestAcceptedId = -1;
  for (const [, [accId, accVal]] of promises) {
    if (accId !== null && accId > highestAcceptedId) {
      highestAcceptedId = accId;
      chosenValue = accVal!;
    }
  }

  // フェーズ2: Accept
  let accepts = 0;
  for (const [a] of promises) if (a.accept(proposalId, chosenValue)) accepts++;

  return accepts >= majority ? chosenValue : null;
}
```

```cpp
#include <vector>
#include <optional>
#include <string>

struct Acceptor {
    int id;
    std::optional<int> promisedId;
    std::optional<int> acceptedId;
    std::optional<std::string> acceptedValue;
    bool alive = true;

    std::optional<std::pair<std::optional<int>, std::optional<std::string>>> prepare(int proposalId) {
        if (promisedId.has_value() && proposalId <= *promisedId) return std::nullopt;  // 拒否
        promisedId = proposalId;
        return std::make_pair(acceptedId, acceptedValue);
    }

    bool accept(int proposalId, const std::string& value) {
        if (promisedId.has_value() && proposalId < *promisedId) return false;
        promisedId = proposalId;
        acceptedId = proposalId;
        acceptedValue = value;
        return true;
    }
};

std::optional<std::string> propose(int proposerId, std::vector<Acceptor>& acceptors, const std::string& value) {
    static int proposalCounter = 0;
    proposalCounter++;
    int proposalId = proposalCounter * 100 + proposerId;
    int majority = static_cast<int>(acceptors.size()) / 2 + 1;

    // フェーズ1: Prepare
    std::vector<std::pair<Acceptor*, std::pair<std::optional<int>, std::optional<std::string>>>> promises;
    for (auto& a : acceptors) {
        if (!a.alive) continue;
        auto resp = a.prepare(proposalId);
        if (resp.has_value()) promises.emplace_back(&a, *resp);
    }
    if (static_cast<int>(promises.size()) < majority) return std::nullopt;

    std::string chosenValue = value;
    int highestAcceptedId = -1;
    for (auto& [a, resp] : promises) {
        auto& [accId, accVal] = resp;
        if (accId.has_value() && *accId > highestAcceptedId) {
            highestAcceptedId = *accId;
            chosenValue = *accVal;
        }
    }

    // フェーズ2: Accept
    int accepts = 0;
    for (auto& [a, resp] : promises) {
        if (a->accept(proposalId, chosenValue)) accepts++;
    }
    if (accepts >= majority) return chosenValue;
    return std::nullopt;
}
```

```rust
struct Acceptor {
    promised_id: Option<i32>,
    accepted_id: Option<i32>,
    accepted_value: Option<String>,
    alive: bool,
}

impl Acceptor {
    fn new() -> Self {
        Acceptor { promised_id: None, accepted_id: None, accepted_value: None, alive: true }
    }

    fn prepare(&mut self, proposal_id: i32) -> Option<(Option<i32>, Option<String>)> {
        if let Some(p) = self.promised_id {
            if proposal_id <= p {
                return None; // 拒否
            }
        }
        self.promised_id = Some(proposal_id);
        Some((self.accepted_id, self.accepted_value.clone()))
    }

    fn accept(&mut self, proposal_id: i32, value: String) -> bool {
        if let Some(p) = self.promised_id {
            if proposal_id < p {
                return false;
            }
        }
        self.promised_id = Some(proposal_id);
        self.accepted_id = Some(proposal_id);
        self.accepted_value = Some(value);
        true
    }
}

fn propose(proposer_id: i32, proposal_counter: &mut i32, acceptors: &mut [Acceptor], value: &str) -> Option<String> {
    *proposal_counter += 1;
    let proposal_id = *proposal_counter * 100 + proposer_id;
    let majority = acceptors.len() / 2 + 1;

    // フェーズ1: Prepare
    let mut promises: Vec<(usize, Option<i32>, Option<String>)> = Vec::new();
    for (i, a) in acceptors.iter_mut().enumerate() {
        if !a.alive {
            continue;
        }
        if let Some((acc_id, acc_val)) = a.prepare(proposal_id) {
            promises.push((i, acc_id, acc_val));
        }
    }
    if promises.len() < majority {
        return None;
    }

    let mut chosen_value = value.to_string();
    let mut highest_accepted_id = -1;
    for (_, acc_id, acc_val) in &promises {
        if let Some(id) = acc_id {
            if *id > highest_accepted_id {
                highest_accepted_id = *id;
                chosen_value = acc_val.clone().unwrap();
            }
        }
    }

    // フェーズ2: Accept
    let mut accepts = 0;
    for (i, _, _) in &promises {
        if acceptors[*i].accept(proposal_id, chosen_value.clone()) {
            accepts += 1;
        }
    }

    if accepts >= majority {
        Some(chosen_value)
    } else {
        None
    }
}
```

```csharp
class Acceptor
{
    public int Id;
    public int? PromisedId;
    public int? AcceptedId;
    public string? AcceptedValue;
    public bool Alive = true;
    public Acceptor(int id) { Id = id; }

    public (int? accId, string? accVal)? Prepare(int proposalId)
    {
        if (PromisedId != null && proposalId <= PromisedId) return null;  // 拒否
        PromisedId = proposalId;
        return (AcceptedId, AcceptedValue);
    }

    public bool Accept(int proposalId, string value)
    {
        if (PromisedId != null && proposalId < PromisedId) return false;
        PromisedId = proposalId;
        AcceptedId = proposalId;
        AcceptedValue = value;
        return true;
    }
}

static class Paxos
{
    private static int _proposalCounter = 0;

    public static string? Propose(int proposerId, List<Acceptor> acceptors, string value)
    {
        _proposalCounter++;
        int proposalId = _proposalCounter * 100 + proposerId;
        var alive = acceptors.Where(a => a.Alive).ToList();
        int majority = acceptors.Count / 2 + 1;

        // フェーズ1: Prepare
        var promises = new List<(Acceptor a, int? accId, string? accVal)>();
        foreach (var a in alive)
        {
            var resp = a.Prepare(proposalId);
            if (resp != null) promises.Add((a, resp.Value.accId, resp.Value.accVal));
        }
        if (promises.Count < majority) return null;

        string chosenValue = value;
        int highestAcceptedId = -1;
        foreach (var (_, accId, accVal) in promises)
        {
            if (accId != null && accId > highestAcceptedId) { highestAcceptedId = accId.Value; chosenValue = accVal!; }
        }

        // フェーズ2: Accept
        int accepts = 0;
        foreach (var (a, _, _) in promises) if (a.Accept(proposalId, chosenValue)) accepts++;

        return accepts >= majority ? chosenValue : null;
    }
}
```
