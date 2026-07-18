---
name: 二相コミット(2PC)
category: 分散システム
subcategory: 合意形成
complexity: O(ノード数)
summary: 準備フェーズとコミットフェーズに分けることで分散トランザクションの原子性を保証する。コーディネーター障害に弱い。
---

## 概要

複数のデータベース(あるいはサービス)にまたがる操作を、「全て成功する」か「全て失敗する」かのどちらかに必ずなるように保証したい——銀行口座間の送金のように、片方だけ処理されては困る操作に対して使われる、分散トランザクションの最も基本的なプロトコル。1人の「コーディネーター」が全参加者の足並みを揃える、というシンプルな構造を持つ。

## 仕組み

コーディネーターと、複数の参加者(各データベースやサービス)の間で、名前の通り2つのフェーズを踏む。

1. **フェーズ1(準備・投票)**: コーディネーターが全参加者に「この操作を実行する準備はできているか」を問い合わせる。各参加者は、実際にコミットできる状態まで処理を進めた上で(ただし確定はせず)、「準備OK」または「準備NG」を返答する
2. **フェーズ2(コミット・実行)**: 全参加者が「準備OK」と答えれば、コーディネーターは全員に「コミットせよ」と指示する。1人でも「準備NG」と答えれば、全員に「ロールバックせよ」と指示する

「全員の同意が揃うまでは誰も確定しない」という二段構えにより、分散トランザクションの原子性(All or Nothing)が保証される。

## 特性・トレードオフ

- **計算量**: O(ノード数)のメッセージ交換
- **コーディネーター障害という弱点**: フェーズ2の途中でコーディネーターが故障すると、「準備OK」と答えて待機している参加者は、コミットすべきかロールバックすべきかわからないまま**ブロックされ続けてしまう**(この状態を"不確定状態"と呼ぶ)。この単一障害点の弱さが2PCの最大の欠点として知られる
- **三相コミット(3PC)という改良**: 準備フェーズとコミットフェーズの間に「プリコミット」フェーズを追加し、コーディネーター障害時のブロッキングを緩和する発展形もあるが、それでも完全には解決しない
- **使いどころ**: 複数のデータベースにまたがるトランザクション(分散データベースの内部実装)、マイクロサービス間の一貫性のある操作(ただし現代では、より障害耐性の高いSagaパターンなどが好まれることも多い)、XAトランザクション(複数のリソースマネージャーにまたがる標準的なトランザクション処理)

## 実装例

コーディネーターと複数の参加者を単一プロセス内のオブジェクトとして表現し、フェーズ1(準備・投票)とフェーズ2(コミット・実行)をそのまま関数として実装したシミュレーション。

```python
class Participant:
    def __init__(self, name: str, will_agree: bool = True):
        self.name = name
        self.will_agree = will_agree
        self.state = "INIT"  # INIT -> PREPARED -> COMMITTED/ABORTED

    def vote_request(self) -> bool:
        if self.will_agree:
            self.state = "PREPARED"
            return True
        self.state = "ABORTED"
        return False

    def commit(self) -> None:
        self.state = "COMMITTED"

    def rollback(self) -> None:
        self.state = "ABORTED"


class Coordinator:
    def run_transaction(self, participants: list[Participant]) -> str:
        # フェーズ1: 準備・投票
        votes = [p.vote_request() for p in participants]

        # フェーズ2: コミット・実行
        if all(votes):
            for p in participants:
                p.commit()
            return "COMMIT"
        else:
            for p in participants:
                if p.state != "ABORTED":
                    p.rollback()
            return "ROLLBACK"
```

```typescript
class Participant {
  name: string;
  willAgree: boolean;
  state: string;
  constructor(name: string, willAgree = true) {
    this.name = name;
    this.willAgree = willAgree;
    this.state = "INIT";
  }
  voteRequest(): boolean {
    if (this.willAgree) {
      this.state = "PREPARED";
      return true;
    }
    this.state = "ABORTED";
    return false;
  }
  commit(): void {
    this.state = "COMMITTED";
  }
  rollback(): void {
    this.state = "ABORTED";
  }
}

class Coordinator {
  runTransaction(participants: Participant[]): string {
    // フェーズ1: 準備・投票
    const votes = participants.map((p) => p.voteRequest());

    // フェーズ2: コミット・実行
    if (votes.every((v) => v)) {
      for (const p of participants) p.commit();
      return "COMMIT";
    } else {
      for (const p of participants) if (p.state !== "ABORTED") p.rollback();
      return "ROLLBACK";
    }
  }
}
```

```cpp
#include <vector>
#include <string>
#include <algorithm>

class Participant {
public:
    Participant(std::string name, bool willAgree = true)
        : name(std::move(name)), willAgree(willAgree), state("INIT") {}

    bool voteRequest() {
        state = willAgree ? "PREPARED" : "ABORTED";
        return willAgree;
    }
    void commit() { state = "COMMITTED"; }
    void rollback() { state = "ABORTED"; }

    std::string name;
    bool willAgree;
    std::string state;
};

class Coordinator {
public:
    std::string runTransaction(std::vector<Participant>& participants) {
        // フェーズ1: 準備・投票
        std::vector<bool> votes;
        for (auto& p : participants) votes.push_back(p.voteRequest());

        // フェーズ2: コミット・実行
        bool allAgreed = std::all_of(votes.begin(), votes.end(), [](bool v) { return v; });
        if (allAgreed) {
            for (auto& p : participants) p.commit();
            return "COMMIT";
        } else {
            for (auto& p : participants) {
                if (p.state != "ABORTED") p.rollback();
            }
            return "ROLLBACK";
        }
    }
};
```

```rust
struct Participant {
    name: String,
    will_agree: bool,
    state: String,
}

impl Participant {
    fn new(name: &str, will_agree: bool) -> Self {
        Participant { name: name.to_string(), will_agree, state: "INIT".to_string() }
    }
    fn vote_request(&mut self) -> bool {
        self.state = if self.will_agree { "PREPARED" } else { "ABORTED" }.to_string();
        self.will_agree
    }
    fn commit(&mut self) {
        self.state = "COMMITTED".to_string();
    }
    fn rollback(&mut self) {
        self.state = "ABORTED".to_string();
    }
}

fn run_transaction(participants: &mut [Participant]) -> &'static str {
    // フェーズ1: 準備・投票
    let votes: Vec<bool> = participants.iter_mut().map(|p| p.vote_request()).collect();

    // フェーズ2: コミット・実行
    if votes.iter().all(|&v| v) {
        for p in participants.iter_mut() {
            p.commit();
        }
        "COMMIT"
    } else {
        for p in participants.iter_mut() {
            if p.state != "ABORTED" {
                p.rollback();
            }
        }
        "ROLLBACK"
    }
}
```

```csharp
class Participant
{
    public string Name;
    public bool WillAgree;
    public string State = "INIT";
    public Participant(string name, bool willAgree = true) { Name = name; WillAgree = willAgree; }

    public bool VoteRequest()
    {
        State = WillAgree ? "PREPARED" : "ABORTED";
        return WillAgree;
    }
    public void Commit() => State = "COMMITTED";
    public void Rollback() => State = "ABORTED";
}

class Coordinator
{
    public string RunTransaction(List<Participant> participants)
    {
        // フェーズ1: 準備・投票
        var votes = participants.Select(p => p.VoteRequest()).ToList();

        // フェーズ2: コミット・実行
        if (votes.All(v => v))
        {
            foreach (var p in participants) p.Commit();
            return "COMMIT";
        }
        foreach (var p in participants) if (p.State != "ABORTED") p.Rollback();
        return "ROLLBACK";
    }
}
```
