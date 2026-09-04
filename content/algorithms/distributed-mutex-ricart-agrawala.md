---
name: Ricart-Agrawala分散相互排他アルゴリズム(Ricart-Agrawala Algorithm)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(n)(n=プロセス数。1回のクリティカルセクション獲得あたり2(n-1)通のメッセージ)
summary: 中央のロックマネージャを介さず、クリティカルセクションに入りたいプロセスが全プロセスへ「要求」をブロードキャストし、全員から「許可」の返信が揃うまで待つことで、共有メモリを持たない分散システム上でも相互排他を実現するメッセージパッシング方式のアルゴリズム。
---

## 概要

[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)や[Petersonのアルゴリズム](/algorithms/petersons-algorithm)は共有メモリ(全プロセスが読み書きできる変数)の存在を前提にしているが、ネットワークで結ばれた分散システムのノードは共有メモリを持たず、メッセージの送受信だけで協調する必要がある。1981年にグレン・リカートとアショク・アグラワラが発表したこのアルゴリズムは、Lamportが1978年に提案した(共有メモリなしでの)相互排他アルゴリズムを改良したもので、「クリティカルセクションに入りたいプロセスは、自分のタイムスタンプ付きの要求メッセージを全プロセスに送り、全員から返信(許可)が届くまで待つ」という単純な発想に基づく。各プロセスは、他プロセスからの要求を受け取った際に「自分は今クリティカルセクションを使っていない、または相手の要求の方が優先順位が高い(タイムスタンプが早い)」と判断できれば即座に返信し、そうでなければ自分の処理が終わるまで返信を保留する。この優先順位判定に論理時計(タイムスタンプ+プロセスID)を使うことで、複数プロセスが同時に要求しても矛盾なく順序付けられる。

## 仕組み

1. 各プロセスは論理時計を1つ持ち、送信するメッセージには常に「現在の論理時刻」と「自プロセスID」のペアをタイムスタンプとして添付する
2. クリティカルセクションに入りたいプロセスPは、自分の論理時計を進めてから、そのタイムスタンプを付けた要求(REQUEST)メッセージを自分以外の全プロセスへブロードキャストし、自分の状態を「要求中」に設定する
3. 他のプロセスQが要求メッセージを受け取ったとき、次のいずれかであれば即座に返信(REPLY)を送る: (a) Qがクリティカルセクションを使用中でなく、かつ要求もしていない、(b) Qも要求中だが、自分のタイムスタンプがPのタイムスタンプより新しい(優先順位が低い)場合。それ以外(Qが使用中、または要求中でPより優先順位が高い)であれば、Qは返信を保留し、自分がクリティカルセクションを抜けるまで待つ
4. タイムスタンプの比較は、まず論理時刻の値で比較し、同値であればプロセスIDで比較する(タイブレーク)。これによって全プロセスが同じ優先順位判定を下せる、一貫した全順序が得られる
5. プロセスPは、自分以外の全プロセス(n-1個)からREPLYが揃った時点でクリティカルセクションに入ってよい
6. クリティカルセクションを抜けたら、それまで保留していた全てのREPLYを送り、自分の状態を「アイドル」に戻す

## 特性・トレードオフ

- **計算量**: 1回のクリティカルセクション獲得あたり、REQUESTがn-1通、REPLYがn-1通で、合計2(n-1)通のメッセージ交換が必要になる。プロセス数nの増加とともに通信量が線形に増加する
- **中央調停者が不要**: ロックマネージャのような単一障害点となる中央サーバーを必要とせず、各プロセスが対等な立場でメッセージを交換するだけで相互排他を達成する完全分散型のアルゴリズムである
- **公平性**: タイムスタンプの全順序に基づいて処理されるため、[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)と同様にFIFO順に近い形で飢餓が起こらないことが保証される
- **耐障害性の弱さ**: 1つでもプロセスがダウンする、あるいはメッセージが失われると、そのプロセスからのREPLYが永久に届かず、要求元プロセスが無期限に待たされてしまう。実務ではタイムアウトや障害検出機構を組み合わせる必要がある
- **使いどころ**: 分散データベースにおける分散ロックの理論的基盤、共有メモリを持たないマイクロサービス群での排他制御の設計指針、分散システムの教育におけるメッセージパッシング型相互排他の代表例

## 実装例

```python
from dataclasses import dataclass


@dataclass
class Request:
    timestamp: int
    process_id: int


class RAProcess:
    def __init__(self, process_id: int, num_processes: int) -> None:
        self.process_id = process_id
        self.num_processes = num_processes
        self.clock = 0
        self.requesting = False
        self.my_request: Request | None = None
        self.deferred: list[int] = []
        self.replies_received: set[int] = set()

    def _tick(self) -> int:
        self.clock += 1
        return self.clock

    def _priority(self, req: Request) -> tuple[int, int]:
        return (req.timestamp, req.process_id)

    def request_cs(self) -> list[tuple[int, Request]]:
        """クリティカルセクションを要求し、送信すべき(宛先, リクエスト)の一覧を返す"""
        ts = self._tick()
        self.my_request = Request(ts, self.process_id)
        self.requesting = True
        self.replies_received = set()
        return [
            (p, self.my_request) for p in range(self.num_processes) if p != self.process_id
        ]

    def on_receive_request(self, sender: int, req: Request) -> str:
        """要求を受け取った側の判定: 即座に返信すべきか保留すべきか"""
        self.clock = max(self.clock, req.timestamp) + 1
        i_have_priority = self.requesting and self.my_request is not None and self._priority(
            self.my_request
        ) < self._priority(req)
        if i_have_priority:
            self.deferred.append(sender)
            return "DEFER"
        return "REPLY"

    def on_receive_reply(self, sender: int) -> bool:
        """返信を受け取り、全員から揃ったらTrueを返す(CSに入ってよい)"""
        self.replies_received.add(sender)
        return len(self.replies_received) == self.num_processes - 1

    def release_cs(self) -> list[int]:
        """CSを抜け、保留していた宛先一覧(REPLYを送るべき相手)を返す"""
        self.requesting = False
        self.my_request = None
        deferred, self.deferred = self.deferred, []
        return deferred
```

```typescript
interface RARequest {
  timestamp: number;
  processId: number;
}

class RAProcess {
  private clock = 0;
  private requesting = false;
  private myRequest: RARequest | null = null;
  private deferred: number[] = [];
  private repliesReceived = new Set<number>();

  constructor(
    private readonly processId: number,
    private readonly numProcesses: number,
  ) {}

  private tick(): number {
    this.clock += 1;
    return this.clock;
  }

  private higherPriority(a: RARequest, b: RARequest): boolean {
    return a.timestamp !== b.timestamp
      ? a.timestamp < b.timestamp
      : a.processId < b.processId;
  }

  // クリティカルセクションを要求し、送信すべき(宛先, リクエスト)の一覧を返す
  requestCS(): Array<{ to: number; request: RARequest }> {
    const ts = this.tick();
    this.myRequest = { timestamp: ts, processId: this.processId };
    this.requesting = true;
    this.repliesReceived = new Set();
    const messages: Array<{ to: number; request: RARequest }> = [];
    for (let p = 0; p < this.numProcesses; p++) {
      if (p !== this.processId)
        messages.push({ to: p, request: this.myRequest });
    }
    return messages;
  }

  // 要求を受け取った側の判定: 即座に返信すべきか保留すべきか
  onReceiveRequest(sender: number, req: RARequest): "DEFER" | "REPLY" {
    this.clock = Math.max(this.clock, req.timestamp) + 1;
    if (
      this.requesting &&
      this.myRequest &&
      this.higherPriority(this.myRequest, req)
    ) {
      this.deferred.push(sender);
      return "DEFER";
    }
    return "REPLY";
  }

  // 返信を受け取り、全員から揃ったらtrueを返す(CSに入ってよい)
  onReceiveReply(sender: number): boolean {
    this.repliesReceived.add(sender);
    return this.repliesReceived.size === this.numProcesses - 1;
  }

  // CSを抜け、保留していた宛先一覧(REPLYを送るべき相手)を返す
  releaseCS(): number[] {
    this.requesting = false;
    this.myRequest = null;
    const deferred = this.deferred;
    this.deferred = [];
    return deferred;
  }
}
```
