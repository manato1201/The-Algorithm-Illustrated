---
name: Viewstamped Replication
category: 分散システム
subcategory: 合意形成
complexity: O(n)(1回の合意あたりのメッセージ数、nはレプリカ数)
summary: 各操作に「ビュー番号+その中の連番」というタイムスタンプを刻みながら、プライマリが操作を過半数のレプリカに複製してから確定させ、プライマリが故障すると次のビューへ選挙で移行することで、[Raft](/algorithms/raft)や[Paxos](/algorithms/paxos)と並ぶ複製状態機械の合意を実現する。
---

## 概要

Viewstamped Replication(VR)は、1988年にバーバラ・リスコフとブライアン・オキが提案した、[Raft](/algorithms/raft)や[Paxos](/algorithms/paxos)よりも歴史的に古い、複製状態機械のための合意プロトコルである。基本的な設計思想は[Raft](/algorithms/raft)と非常に近く——**1台のプライマリ(リーダー)が全ての操作の順序を決め、それをバックアップ(フォロワー)に複製する**、**プライマリが故障したら新しいプライマリへの切り替え(ビューチェンジ)が起きる**という構造を共有している。VRは「ビュー(View)」という概念を中心に据え、システムの時間を「あるプライマリが率いる期間」ごとの区切り(ビュー)として捉える点が特徴的で、この考え方は後の[Raft](/algorithms/raft)の「タームNumber」の概念に直接影響を与えたとされる。

## 仕組み

1. システムは常に、ある**ビュー番号`v`**のもとで動作しており、そのビューには1台の**プライマリ**(担当レプリカを`v mod n`のような規則で機械的に決める)と、残りの**バックアップ**が存在する
2. クライアントから操作(コマンド)を受け取ったプライマリは、その操作に**ビュー番号+ビュー内の連番**からなる一意な識別子(view-stamp)を付与し、全バックアップに複製メッセージとして送る
3. **過半数**のバックアップがこの操作を受け取り、ログに記録したことを確認したら、プライマリはその操作を「確定(コミット)」とみなし、実行結果をクライアントに返す
4. バックアップは、プライマリからの定期的な生存確認(ハートビート)が一定時間途絶えると、プライマリが故障したと判断し、**ビューチェンジ**を開始する——新しいビュー番号`v+1`への移行を提案し、過半数のレプリカがこれに同意すれば、新しいプライマリ(`v+1`に対応するレプリカ)のもとで運用が再開される
5. ビューチェンジの際、新しいプライマリは各レプリカが持つログの状態を集約し、**最新かつ最も進んだログ**を持つレプリカの状態を新しいビューでの正しい状態として採用することで、故障の前後でログの一貫性を保つ

## 特性・トレードオフ

- **[Raft](/algorithms/raft)との強い類似性と歴史的な先行性**: プライマリ(リーダー)による操作順序の決定、過半数複製によるコミット、リーダー故障時の新リーダー選出という構造は、20年以上後に登場した[Raft](/algorithms/raft)とほぼ同じ設計思想を持つ。VRは分かりやすさを重視した合意プロトコルの先駆けとして、後発のプロトコル設計に大きな影響を与えたと評価されている
- **[Paxos](/algorithms/paxos)との対比**: [Paxos](/algorithms/paxos)がより抽象的で汎用的な合意の枠組み(単一の値についての合意)から出発するのに対し、VRは最初から「複製状態機械(操作のログを順序付けて複製する)」という具体的な目的に特化して設計されている。この具体性が、VRや[Raft](/algorithms/raft)が実装しやすく理解しやすいとされる理由の一つである
- **ビューチェンジの正しさの証明の複雑さ**: プライマリの切り替え時に、故障したプライマリが一部のバックアップにしか複製していなかった「宙に浮いた」操作をどう扱うかという処理は、合意プロトコル全般に共通する繊細な部分であり、VRもこの点に多くの工夫を払っている(最新のログを持つレプリカの状態を正としてビューを引き継ぐ、という規則がその一例)
- **使いどころ**: 分散データベース・分散ファイルシステムにおける複製状態機械の実装、MITのフレキシブルペーシングやMongoDBの一部の複製プロトコルの理論的背景、[Raft](/algorithms/raft)を学ぶ上での歴史的な前身としての比較対象

## 実装例

```python
from dataclasses import dataclass, field

@dataclass
class LogEntry:
    view: int
    seq: int
    command: str

class Replica:
    def __init__(self, replica_id: int, total_replicas: int):
        self.id = replica_id
        self.total_replicas = total_replicas
        self.view = 0
        self.log: list[LogEntry] = []
        self.is_primary = self._compute_primary(0) == replica_id

    def _compute_primary(self, view: int) -> int:
        return view % self.total_replicas

    def propose_as_primary(self, command: str) -> LogEntry:
        if not self.is_primary:
            raise RuntimeError("プライマリではないため提案できない")
        entry = LogEntry(self.view, len(self.log), command)
        self.log.append(entry)
        return entry

    def receive_replicated_entry(self, entry: LogEntry) -> bool:
        if entry.view != self.view:
            return False
        self.log.append(entry)
        return True

    def start_view_change(self) -> int:
        self.view += 1
        self.is_primary = self._compute_primary(self.view) == self.id
        return self.view

def commit_if_majority(replicas: list[Replica], entry: LogEntry) -> bool:
    acks = sum(1 for r in replicas if r.receive_replicated_entry(entry))
    return acks >= (len(replicas) // 2 + 1)
```

```typescript
type LogEntry = { view: number; seq: number; command: string };

class Replica {
  view = 0;
  log: LogEntry[] = [];
  isPrimary: boolean;

  constructor(public id: number, private totalReplicas: number) {
    this.isPrimary = this.computePrimary(0) === id;
  }

  private computePrimary(view: number): number {
    return view % this.totalReplicas;
  }

  proposeAsPrimary(command: string): LogEntry {
    if (!this.isPrimary) throw new Error("プライマリではないため提案できない");
    const entry: LogEntry = { view: this.view, seq: this.log.length, command };
    this.log.push(entry);
    return entry;
  }

  receiveReplicatedEntry(entry: LogEntry): boolean {
    if (entry.view !== this.view) return false;
    this.log.push(entry);
    return true;
  }

  startViewChange(): number {
    this.view++;
    this.isPrimary = this.computePrimary(this.view) === this.id;
    return this.view;
  }
}

function commitIfMajority(replicas: Replica[], entry: LogEntry): boolean {
  const acks = replicas.filter((r) => r.receiveReplicatedEntry(entry)).length;
  return acks >= Math.floor(replicas.length / 2) + 1;
}
```

```cpp
#include <vector>
#include <string>
#include <stdexcept>

struct LogEntry { int view; int seq; std::string command; };

class Replica {
    int totalReplicas;
public:
    int id;
    int view = 0;
    std::vector<LogEntry> log;
    bool isPrimary;

    Replica(int id_, int totalReplicas_) : totalReplicas(totalReplicas_), id(id_) {
        isPrimary = computePrimary(0) == id;
    }

    int computePrimary(int v) const { return v % totalReplicas; }

    LogEntry proposeAsPrimary(const std::string& command) {
        if (!isPrimary) throw std::runtime_error("プライマリではないため提案できない");
        LogEntry entry{view, static_cast<int>(log.size()), command};
        log.push_back(entry);
        return entry;
    }

    bool receiveReplicatedEntry(const LogEntry& entry) {
        if (entry.view != view) return false;
        log.push_back(entry);
        return true;
    }

    int startViewChange() {
        view++;
        isPrimary = computePrimary(view) == id;
        return view;
    }
};

bool commitIfMajority(std::vector<Replica>& replicas, const LogEntry& entry) {
    int acks = 0;
    for (auto& r : replicas) if (r.receiveReplicatedEntry(entry)) acks++;
    return acks >= static_cast<int>(replicas.size()) / 2 + 1;
}
```

```rust
struct LogEntry { view: i32, seq: i32, command: String }

struct Replica {
    id: i32,
    total_replicas: i32,
    view: i32,
    log: Vec<LogEntry>,
    is_primary: bool,
}

impl Replica {
    fn new(id: i32, total_replicas: i32) -> Self {
        let is_primary = (0 % total_replicas) == id;
        Replica { id, total_replicas, view: 0, log: Vec::new(), is_primary }
    }

    fn compute_primary(&self, view: i32) -> i32 {
        view % self.total_replicas
    }

    fn propose_as_primary(&mut self, command: String) -> Result<LogEntry, &'static str> {
        if !self.is_primary {
            return Err("プライマリではないため提案できない");
        }
        let entry = LogEntry { view: self.view, seq: self.log.len() as i32, command };
        self.log.push(LogEntry { view: entry.view, seq: entry.seq, command: entry.command.clone() });
        Ok(entry)
    }

    fn receive_replicated_entry(&mut self, entry: LogEntry) -> bool {
        if entry.view != self.view {
            return false;
        }
        self.log.push(entry);
        true
    }

    fn start_view_change(&mut self) -> i32 {
        self.view += 1;
        self.is_primary = self.compute_primary(self.view) == self.id;
        self.view
    }
}
```

```csharp
class LogEntry { public int View, Seq; public string Command = ""; }

class Replica
{
    int totalReplicas;
    public int Id, View = 0;
    public List<LogEntry> Log = new();
    public bool IsPrimary;

    public Replica(int id, int totalReplicas)
    {
        Id = id;
        this.totalReplicas = totalReplicas;
        IsPrimary = ComputePrimary(0) == id;
    }

    int ComputePrimary(int v) => v % totalReplicas;

    public LogEntry ProposeAsPrimary(string command)
    {
        if (!IsPrimary) throw new InvalidOperationException("プライマリではないため提案できない");
        var entry = new LogEntry { View = View, Seq = Log.Count, Command = command };
        Log.Add(entry);
        return entry;
    }

    public bool ReceiveReplicatedEntry(LogEntry entry)
    {
        if (entry.View != View) return false;
        Log.Add(entry);
        return true;
    }

    public int StartViewChange()
    {
        View++;
        IsPrimary = ComputePrimary(View) == Id;
        return View;
    }
}

static class ViewstampedReplicationOps
{
    public static bool CommitIfMajority(List<Replica> replicas, LogEntry entry)
    {
        int acks = replicas.Count(r => r.ReceiveReplicatedEntry(entry));
        return acks >= replicas.Count / 2 + 1;
    }
}
```
