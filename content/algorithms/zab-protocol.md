---
name: ZAB(ZooKeeper Atomic Broadcast)
category: 分散システム
subcategory: 合意形成
complexity: O(ノード数)(メッセージ数)
summary: 単一のプライマリがエポック番号とトランザクションIDを付与した更新を全順序でブロードキャストすることで、Apache ZooKeeperの厳密な順序保証とプライマリ復旧を実現する合意プロトコル。
---

## 概要

Apache ZooKeeperが分散協調サービス(設定管理・リーダー選出・分散ロックなど)の基盤として使う独自の合意プロトコル。Paxosの考え方をベースにしつつ、ZooKeeperが必要とする「全てのクライアントから見て、更新が発行された順序と全く同じ順序で反映される」という強い要求——全順序ブロードキャスト(total order broadcast)——に特化して設計されている。[Raft](/algorithms/raft)と同じく「常に単一のプライマリ(リーダー)がいる」という構造を採るが、ZABは「合意そのもの」よりも「プライマリが提案した一連の更新を、全レプリカに対して正しい順序で欠落なく配信し、プライマリが交代しても順序保証を崩さない」という原子ブロードキャストの実現に焦点を当てている。

## 仕組み

ZABは大きく3つのフェーズで構成される。

1. **発見(Discovery)**: プライマリの障害などでリーダーが不在になると、各サーバーは新しいエポック番号(プライマリの世代を表す通し番号)を提案し合い、過半数の支持を得たサーバーが新しいプライマリになる
2. **同期(Synchronization)**: 新しいプライマリは、自分より新しい(あるいは自分が知らない)未コミットの提案を持つフォロワーがいないか確認し、フォロワー全員のログを自分の最新状態に揃える——過去のプライマリが中途半端にコミットしかけていた提案を、確定させるか破棄するかをここで決着させる
3. **ブロードキャスト(Broadcast)**: 通常運用時、クライアントからの更新要求はすべてプライマリが受け取り、`(エポック番号, トランザクションID)`の組(zxid)を付与した提案としてフォロワーへ送信する
4. 過半数のフォロワーが提案をログに書き込んで確認応答(ACK)を返すと、プライマリはその提案を「コミット」とみなし、全フォロワーへコミット通知を送る。各フォロワーは、通知された順序どおりに(受信した順序ではなく、常にzxidの昇順で)状態機械へ適用する
5. プライマリが交代すると新しいエポック番号が発行され、以降の全ての提案はそのエポック番号を含むzxidで識別される。エポック番号とトランザクションIDの組み合わせにより、異なるプライマリの下で生成された提案同士の前後関係も一意に決定できる

## 特性・トレードオフ

- **計算量**: [Raft](/algorithms/raft)や[Paxos](/algorithms/paxos)と同様、1回のブロードキャストはO(ノード数)のメッセージ交換で完了する
- **Paxos/Raftとの類似点**: 「過半数の合意」を安全性の根拠にする点、単一のプライマリ(リーダー)が更新を提案する点は共通しており、ZABは実質的に「Paxosの考え方を、プライマリバックアップ方式の全順序ブロードキャストという1つの用途に特化させたもの」と位置づけられる
- **Paxos/Raftとの相違点**: PaxosやRaftは「任意の値についての合意」を解く汎用的な問題として設計されているのに対し、ZABは最初から「ZooKeeperが必要とする全順序でのステート変更配信」というただ1つの目的に特化している。この特化によって、プライマリ再選出後に「未決着の提案をどう扱うか」という手続き(同期フェーズ)がプロトコル仕様として明確に定義されており、ZooKeeperのようなミッションクリティカルな協調サービスに求められる厳密な順序保証を実現しやすくなっている
- **使いどころ**: Apache ZooKeeper自身の内部合意プロトコル(設定情報の一貫したレプリケーション、分散ロック・[ブリー・アルゴリズム](/algorithms/bully-algorithm)的なリーダー選出のためのznode管理)。Kafkaも旧バージョンではメタデータ管理をZooKeeperとZABに委ねていた(現行版はKRaftによるRaftベースの実装へ移行済み)

## 実装例

プライマリ(リーダー)と複数のフォロワーを単一プロセス内のオブジェクトとして表現し、エポック選出・提案のブロードキャスト・過半数ACKによるコミットをそのままシミュレートした実装。

```python
class ZabNode:
    def __init__(self, node_id: int):
        self.id = node_id
        self.epoch = 0
        self.log: list[tuple[int, int, str]] = []  # (epoch, txn_id, command)
        self.committed: list[tuple[int, int, str]] = []
        self.alive = True


class ZabEnsemble:
    def __init__(self, ids: list[int]):
        self.nodes = {i: ZabNode(i) for i in ids}
        self.leader_id: int | None = None
        self._next_txn_id = 0

    def elect_primary(self, candidate_id: int) -> int | None:
        """発見フェーズ: 新しいエポック番号を提案し、過半数の支持を得れば
        プライマリになる。プライマリは新エポックを全フォロワーに反映させる。"""
        candidate = self.nodes[candidate_id]
        new_epoch = candidate.epoch + 1
        votes = 1
        for n in self.nodes.values():
            if n.id == candidate_id or not n.alive:
                continue
            if new_epoch > n.epoch:
                votes += 1

        alive_count = sum(1 for n in self.nodes.values() if n.alive)
        majority = alive_count // 2 + 1
        if votes < majority:
            return None

        self.leader_id = candidate_id
        for n in self.nodes.values():
            if n.alive:
                n.epoch = new_epoch
        return candidate_id

    def broadcast(self, command: str) -> bool:
        """ブロードキャストフェーズ: プライマリがzxid(epoch, txn_id)付きの提案を
        フォロワーに送信し、過半数のACKでコミットする。"""
        leader = self.nodes[self.leader_id]
        self._next_txn_id += 1
        proposal = (leader.epoch, self._next_txn_id, command)
        leader.log.append(proposal)

        acks = 1  # プライマリ自身
        for n in self.nodes.values():
            if n.id == leader.id or not n.alive:
                continue
            n.log.append(proposal)
            acks += 1

        alive_count = sum(1 for n in self.nodes.values() if n.alive)
        majority = alive_count // 2 + 1
        if acks >= majority:
            for n in self.nodes.values():
                if n.alive:
                    n.committed.append(proposal)
            return True
        return False
```

```typescript
type Proposal = [epoch: number, txnId: number, command: string];

class ZabNode {
  epoch = 0;
  log: Proposal[] = [];
  committed: Proposal[] = [];
  alive = true;
  constructor(public id: number) {}
}

class ZabEnsemble {
  nodes: Map<number, ZabNode>;
  leaderId: number | null = null;
  private nextTxnId = 0;

  constructor(ids: number[]) {
    this.nodes = new Map(ids.map((id) => [id, new ZabNode(id)]));
  }

  electPrimary(candidateId: number): number | null {
    const candidate = this.nodes.get(candidateId)!;
    const newEpoch = candidate.epoch + 1;
    let votes = 1;
    for (const n of this.nodes.values()) {
      if (n.id === candidateId || !n.alive) continue;
      if (newEpoch > n.epoch) votes++;
    }

    const aliveCount = [...this.nodes.values()].filter((n) => n.alive).length;
    const majority = Math.floor(aliveCount / 2) + 1;
    if (votes < majority) return null;

    this.leaderId = candidateId;
    for (const n of this.nodes.values()) {
      if (n.alive) n.epoch = newEpoch;
    }
    return candidateId;
  }

  broadcast(command: string): boolean {
    const leader = this.nodes.get(this.leaderId!)!;
    this.nextTxnId++;
    const proposal: Proposal = [leader.epoch, this.nextTxnId, command];
    leader.log.push(proposal);

    let acks = 1;
    for (const n of this.nodes.values()) {
      if (n.id === leader.id || !n.alive) continue;
      n.log.push(proposal);
      acks++;
    }

    const aliveCount = [...this.nodes.values()].filter((n) => n.alive).length;
    const majority = Math.floor(aliveCount / 2) + 1;
    if (acks >= majority) {
      for (const n of this.nodes.values()) {
        if (n.alive) n.committed.push(proposal);
      }
      return true;
    }
    return false;
  }
}
```
