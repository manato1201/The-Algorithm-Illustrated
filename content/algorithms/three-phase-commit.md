---
name: 3相コミット(Three-Phase Commit)
category: 分散システム
subcategory: 合意形成
complexity: O(n)(1回のコミットあたりのメッセージ数、nは参加者数)
summary: 2相コミットが「コミット可否を全員に伝える」フェーズの途中でコーディネータが停止すると、参加者がコミットすべきか中断すべきか判断できずブロックしてしまう問題に対し、投票の合意を全参加者に周知するフェーズをもう1段階挟むことで解消する。
---

## 概要

[2相コミット(2PC)](/algorithms/two-phase-commit)は「投票フェーズ」と「コミットフェーズ」の2段階で分散トランザクションの合意を取るが、致命的な弱点を持つ——**全参加者が「コミットしてよい」と投票した後、コーディネータが実際にコミット命令を送る前にクラッシュすると**、投票を終えた参加者たちは「他の参加者が何に投票したか」を知る術がなく、コミットするべきか中断するべきかを自力で判断できず、コーディネータが復旧するまで**ブロックされ続けてしまう**。3相コミット(3PC)は、1981年にデール・スキーンとマイケル・ストーンブレーカーが提案した拡張で、投票フェーズとコミットフェーズの間に**「コミットの合意ができたことを全員に知らせるだけの中間フェーズ」**をもう1段階挟むことで、コーディネータが途中で落ちても、参加者同士の情報だけである程度自律的に状況を判断できるようにする。

## 仕組み

1. **フェーズ1(CanCommit/投票)**: [2相コミット](/algorithms/two-phase-commit)と同様、コーディネータが全参加者に「コミットできるか」を問い合わせ、各参加者はYes/Noで応答する
2. **フェーズ2(PreCommit/合意の通知)**: 全参加者がYesと応答した場合、コーディネータは「PreCommit」というメッセージを全参加者に送る。これは「全員がコミットに同意したことが確定した」という情報だけを伝える通知であり、まだ実際のコミット実行の指示ではない。参加者はPreCommitを受け取ったら、それに応答(ACK)する
3. **フェーズ3(DoCommit/実行)**: コーディネータは、全参加者からのPreCommitへのACKを確認した後、初めて「DoCommit」を送り、実際のコミットを指示する。参加者はコミットを実行し、完了を報告する
4. **タイムアウトによる自律的な判断**: 参加者がPreCommitを受け取った後、DoCommitがなかなか届かずコーディネータの応答が途絶えた場合、参加者は**「少なくとも全参加者がコミットに同意していたことは確実」**という情報を既に持っているため、タイムアウト後に自律的にコミットを完了させる(または、参加者同士で通信し、誰かがPreCommitを受け取っていれば安全にコミットへ進める)という判断ができる。逆にPreCommitを受け取る前にコーディネータが落ちた場合は、安全に中断(ロールバック)できる

## 特性・トレードオフ

- **[2相コミット](/algorithms/two-phase-commit)のブロッキング問題を緩和する**: PreCommitという中間段階を挟むことで、「コミットするか中断するか」の判断材料が参加者間で共有される機会が生まれ、コーディネータの障害時にも(ネットワーク分断がなければ)自律的に正しい判断ができるようになる
- **ネットワーク分断には依然として弱い**: 3PCはコーディネータの単純なクラッシュには対処できるが、**ネットワークが分断され、一部の参加者がPreCommitを受け取り、別の一部が受け取れていない**という状況では、分断された参加者グループがそれぞれ異なる(矛盾した)判断をしてしまう可能性が理論的に残る。この意味で3PCも完全にブロッキングフリーではなく、真に堅牢な合意にはより高度なプロトコル([Paxos](/algorithms/paxos)や[Raft](/algorithms/raft)のような、過半数の合意を明示的に扱う手法)が必要になる
- **通信コストの増加**: フェーズが1段階増えることで、必要なメッセージの往復回数(レイテンシ)も増加する。実務では、ネットワーク分断が比較的稀な環境では2PCで十分とされ、3PCはその理論的な改善案として研究上・教育上の意義が大きい一方、実システムでは[Paxos](/algorithms/paxos)・[Raft](/algorithms/raft)ベースの合意プロトコルが選ばれることの方が多い
- **使いどころ**: 分散トランザクション処理システムの理論的な設計、分散合意プロトコルの発展史における[2相コミット](/algorithms/two-phase-commit)から[Paxos](/algorithms/paxos)への橋渡し的な位置づけの理解、ブロッキング問題を回避する合意プロトコル設計の教育的な題材

## 実装例

```python
from enum import Enum, auto

class ParticipantState(Enum):
    INIT = auto()
    VOTED_YES = auto()
    PRE_COMMITTED = auto()
    COMMITTED = auto()
    ABORTED = auto()

class Participant:
    def __init__(self, participant_id: str, can_commit: bool):
        self.id = participant_id
        self.can_commit = can_commit
        self.state = ParticipantState.INIT

    def receive_can_commit_request(self) -> bool:
        if self.can_commit:
            self.state = ParticipantState.VOTED_YES
        else:
            self.state = ParticipantState.ABORTED
        return self.can_commit

    def receive_pre_commit(self) -> None:
        if self.state == ParticipantState.VOTED_YES:
            self.state = ParticipantState.PRE_COMMITTED

    def receive_do_commit(self) -> None:
        if self.state == ParticipantState.PRE_COMMITTED:
            self.state = ParticipantState.COMMITTED

    def timeout_after_pre_commit(self) -> None:
        """コーディネータからDoCommitが届かない場合、PreCommit済みなら自律的にコミットできる。"""
        if self.state == ParticipantState.PRE_COMMITTED:
            self.state = ParticipantState.COMMITTED

def three_phase_commit(participants: list[Participant]) -> bool:
    votes = [p.receive_can_commit_request() for p in participants]
    if not all(votes):
        return False  # 誰か1人でもNoなら中断

    for p in participants:
        p.receive_pre_commit()

    for p in participants:
        p.receive_do_commit()

    return all(p.state == ParticipantState.COMMITTED for p in participants)
```

```typescript
enum ParticipantState { Init, VotedYes, PreCommitted, Committed, Aborted }

class Participant {
  state = ParticipantState.Init;
  constructor(public id: string, private canCommit: boolean) {}

  receiveCanCommitRequest(): boolean {
    this.state = this.canCommit ? ParticipantState.VotedYes : ParticipantState.Aborted;
    return this.canCommit;
  }

  receivePreCommit(): void {
    if (this.state === ParticipantState.VotedYes) this.state = ParticipantState.PreCommitted;
  }

  receiveDoCommit(): void {
    if (this.state === ParticipantState.PreCommitted) this.state = ParticipantState.Committed;
  }

  timeoutAfterPreCommit(): void {
    if (this.state === ParticipantState.PreCommitted) this.state = ParticipantState.Committed;
  }
}

function threePhaseCommit(participants: Participant[]): boolean {
  const votes = participants.map((p) => p.receiveCanCommitRequest());
  if (!votes.every((v) => v)) return false;

  for (const p of participants) p.receivePreCommit();
  for (const p of participants) p.receiveDoCommit();

  return participants.every((p) => p.state === ParticipantState.Committed);
}
```

```cpp
#include <vector>
#include <string>

enum class ParticipantState { Init, VotedYes, PreCommitted, Committed, Aborted };

struct Participant {
    std::string id;
    bool canCommit;
    ParticipantState state = ParticipantState::Init;

    bool receiveCanCommitRequest() {
        state = canCommit ? ParticipantState::VotedYes : ParticipantState::Aborted;
        return canCommit;
    }

    void receivePreCommit() {
        if (state == ParticipantState::VotedYes) state = ParticipantState::PreCommitted;
    }

    void receiveDoCommit() {
        if (state == ParticipantState::PreCommitted) state = ParticipantState::Committed;
    }
};

bool threePhaseCommit(std::vector<Participant>& participants) {
    bool allYes = true;
    for (auto& p : participants) allYes &= p.receiveCanCommitRequest();
    if (!allYes) return false;

    for (auto& p : participants) p.receivePreCommit();
    for (auto& p : participants) p.receiveDoCommit();

    bool allCommitted = true;
    for (auto& p : participants) allCommitted &= (p.state == ParticipantState::Committed);
    return allCommitted;
}
```

```rust
#[derive(PartialEq, Clone, Copy)]
enum ParticipantState { Init, VotedYes, PreCommitted, Committed, Aborted }

struct Participant {
    id: String,
    can_commit: bool,
    state: ParticipantState,
}

impl Participant {
    fn receive_can_commit_request(&mut self) -> bool {
        self.state = if self.can_commit { ParticipantState::VotedYes } else { ParticipantState::Aborted };
        self.can_commit
    }

    fn receive_pre_commit(&mut self) {
        if self.state == ParticipantState::VotedYes {
            self.state = ParticipantState::PreCommitted;
        }
    }

    fn receive_do_commit(&mut self) {
        if self.state == ParticipantState::PreCommitted {
            self.state = ParticipantState::Committed;
        }
    }
}

fn three_phase_commit(participants: &mut [Participant]) -> bool {
    let all_yes = participants.iter_mut().map(|p| p.receive_can_commit_request()).all(|v| v);
    if !all_yes {
        return false;
    }

    for p in participants.iter_mut() {
        p.receive_pre_commit();
    }
    for p in participants.iter_mut() {
        p.receive_do_commit();
    }

    participants.iter().all(|p| p.state == ParticipantState::Committed)
}
```

```csharp
enum ParticipantState { Init, VotedYes, PreCommitted, Committed, Aborted }

class Participant
{
    public string Id;
    bool canCommit;
    public ParticipantState State = ParticipantState.Init;

    public Participant(string id, bool canCommit) { Id = id; this.canCommit = canCommit; }

    public bool ReceiveCanCommitRequest()
    {
        State = canCommit ? ParticipantState.VotedYes : ParticipantState.Aborted;
        return canCommit;
    }

    public void ReceivePreCommit()
    {
        if (State == ParticipantState.VotedYes) State = ParticipantState.PreCommitted;
    }

    public void ReceiveDoCommit()
    {
        if (State == ParticipantState.PreCommitted) State = ParticipantState.Committed;
    }
}

static class ThreePhaseCommitProtocol
{
    public static bool Run(List<Participant> participants)
    {
        bool allYes = participants.Select(p => p.ReceiveCanCommitRequest()).All(v => v);
        if (!allYes) return false;

        foreach (var p in participants) p.ReceivePreCommit();
        foreach (var p in participants) p.ReceiveDoCommit();

        return participants.All(p => p.State == ParticipantState.Committed);
    }
}
```
