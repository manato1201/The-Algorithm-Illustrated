---
name: リースベース分散ロック
category: 分散システム
subcategory: 障害検出・選出
complexity: O(合意メッセージ数)(1回のリース取得あたり、下層の合意プロトコルに依存)
summary: 有効期限付きの排他権(リース)をクロックスキューを考慮した安全マージンとともに発行し、保持者が更新に失敗すれば自動的に失効させることで、故障したロック保持者が排他権を永久に握り続ける事態を防ぐ分散ロック機構。
---

## 概要

単一マシン内のロックであれば、プロセスが異常終了すればOSがロックを解放してくれる。しかし分散システムでは、ロックを保持しているノードがクラッシュしたりネットワークから切り離されたりしても、そのノード自身が「もうロックを手放した」と他ノードに知らせる手段がない——ロック保持者が沈黙したまま、誰もそのロックを取得できなくなる**永久ブロック**が起こりうる。リースベース分散ロックは、[Paxos](/algorithms/paxos)や類似の合意プロトコルを使ってロックの取得・解放という操作自体には強い一貫性を持たせつつ、ロックそのものには**有効期限(リース期間)**を持たせることでこの問題を解決する。GoogleのChubbyやApache ZooKeeperで採用されているこの方式は、リースが切れれば保持者の生死に関わらず自動的にロックが解放されるため、「保持者が本当に死んでいるかどうか」を厳密に見極める必要がなく、[φ増加型故障検知器](/algorithms/phi-accrual-failure-detector)のような不完全な故障検知に頼らずとも、システム全体が有限時間内に前進し続けることを保証できる。

## 仕組み

1. ロックを取得したいクライアントは、ロック管理サーバー(内部的には[Paxos](/algorithms/paxos)のような合意プロトコルで複数ノードに複製されている)に対して、リース期間`T`(例: 10秒)を指定してロック取得をリクエストする
2. 現在そのロックを保持しているクライアントがいない、または既存のリースが期限切れであれば、サーバーは新しいリースを発行する。リースには**発行時刻**と**有効期限**(`発行時刻 + T`)が記録され、これが複数ノードに複製されて確定する
3. ロックを保持するクライアントは、リースが切れる前に**更新(renew)**リクエストを送り続けることで、排他権を保持し続けられる。更新に失敗する(応答が来ない、あるいはネットワーク分断で届かない)と、クライアントはリースが切れるタイミングで**自発的にロックの保持者としての振る舞いを止める**必要がある
4. リースの有効期限が過ぎると、サーバー側はそのロックを「空き」とみなし、他のクライアントからの取得リクエストに応じられるようになる——保持者が実際にクラッシュしていたかどうかをサーバー側が確認する必要はなく、時間経過だけで自動的に解放される
5. **クロックスキューへの対処**: クライアントとサーバーの時計が完全に同期しているとは限らないため、実装上はサーバー側の有効期限判定に**安全マージン**を設ける。具体的には、クライアントは「サーバーが有効期限とみなす時刻より十分前に、自分のローカル時計で保守的にリースの失効を仮定して行動を止める」という設計にする(クライアント側の想定有効期限を`サーバー通知の期限 - 最大許容クロックスキュー`のように短く見積もる)。これにより、サーバーとクライアントの時計にズレがあっても、「サーバー視点では期限切れなのにクライアントはまだ有効だと思って排他操作を続ける」という二重取得の危険な状態を避けられる
6. リースを使った排他制御と実際の共有リソースへの操作を安全に結びつけるため、多くの実装では**フェンシングトークン**(リース発行のたびに単調増加する番号)を併用する。リソース側は、受け取った操作のトークンが直近に見た最大値より小さければ、それは失効したリースを持つ古いクライアントからの操作とみなして拒否する

## 特性・トレードオフ

- **[Paxos](/algorithms/paxos)との関係**: リース自体の発行・更新という「誰が今リースを持っているか」という状態は、複数ノードの合意が必要な操作であり、内部的には[Paxos](/algorithms/paxos)やRaftのような合意プロトコルでロック管理サーバー自体を複製し高可用性を持たせるのが一般的な構成である。リースは「合意プロトコルの上に構築された、時間制限付きの排他制御」というレイヤー構造を持つ
- **故障検知の単純化**: 保持者が本当に生きているかを判定する複雑さを、[φ増加型故障検知器](/algorithms/phi-accrual-failure-detector)のような確率的な推定に頼らず、「時間が経てば自動的に失効する」という単純なタイムアウトに還元できる。ただしこれは故障検知の精度を捨てているわけではなく、「多少の誤判定があっても、システム全体が有限時間内に前進し続けること」を優先する設計判断である
- **クロックスキューが安全性の生命線**: リース方式の正しさは、クライアントとサーバーの時計のズレが想定した最大許容範囲を超えないという前提に依存する。ズレがこの前提を超えると、サーバー側では期限切れなのにクライアント側ではまだ有効だと誤認し、2つのクライアントが同時に「自分だけがロックを持っている」と思い込む**二重取得**が起こりうる。実運用ではNTPによる時刻同期の精度と、安全マージンの見積もりが極めて重要になる
- **フェンシングトークンによる保険**: クロックスキューの想定が万一破られた場合でも、フェンシングトークンを使えば、リソース側で「古いトークンを持つ操作を拒否する」という追加の防御層を持てる。リース単体では防ぎきれない稀なレースコンディションに対する、実務上の安全策として広く使われる
- **使いどころ**: Google ChubbyやApache ZooKeeperにおける分散ロックサービス、リーダー選出(選ばれたノードがリーダーである権利をリースとして保持し、更新に失敗すればリーダーシップを失う)、分散システムにおけるリソースの排他アクセス制御(ジョブスケジューラの実行権、共有ストレージへの書き込み権など)

## 実装例

```python
import time


class LeaseServer:
    """単一ノードでの簡略化実装。実運用ではこのサーバー自体をPaxos等で複製する。"""

    def __init__(self, lease_duration: float, clock_skew_margin: float = 0.5):
        self.lease_duration = lease_duration
        self.clock_skew_margin = clock_skew_margin
        self.holder: str | None = None
        self.expires_at: float = 0.0
        self.fencing_token: int = 0

    def acquire(self, client_id: str, now: float) -> tuple[bool, int, float]:
        """取得成功なら (True, フェンシングトークン, サーバー側有効期限) を返す"""
        if self.holder is not None and now < self.expires_at and self.holder != client_id:
            return False, self.fencing_token, self.expires_at  # 既に他クライアントが保持中

        self.holder = client_id
        self.expires_at = now + self.lease_duration
        self.fencing_token += 1
        return True, self.fencing_token, self.expires_at

    def renew(self, client_id: str, now: float) -> tuple[bool, float]:
        if self.holder != client_id or now >= self.expires_at:
            return False, self.expires_at  # 既に失効している、または保持者ではない
        self.expires_at = now + self.lease_duration
        return True, self.expires_at

    def client_safe_deadline(self, server_expires_at: float) -> float:
        """クロックスキューを考慮し、クライアント側は保守的に早めの期限を採用する"""
        return server_expires_at - self.clock_skew_margin


class FencedResource:
    """フェンシングトークンで古いリース保持者からの操作を拒否するリソース側の実装"""

    def __init__(self) -> None:
        self.max_seen_token = 0

    def write(self, fencing_token: int, value: str) -> bool:
        if fencing_token < self.max_seen_token:
            return False  # 失効したリースからの古い操作を拒否
        self.max_seen_token = fencing_token
        return True
```

```typescript
class LeaseServer {
  // 単一ノードでの簡略化実装。実運用ではこのサーバー自体をPaxos等で複製する。
  private holder: string | null = null;
  private expiresAt = 0;
  private fencingToken = 0;

  constructor(
    private leaseDuration: number,
    private clockSkewMargin = 0.5,
  ) {}

  acquire(clientId: string, now: number): { ok: boolean; token: number; expiresAt: number } {
    if (this.holder !== null && now < this.expiresAt && this.holder !== clientId) {
      return { ok: false, token: this.fencingToken, expiresAt: this.expiresAt }; // 既に他クライアントが保持中
    }
    this.holder = clientId;
    this.expiresAt = now + this.leaseDuration;
    this.fencingToken += 1;
    return { ok: true, token: this.fencingToken, expiresAt: this.expiresAt };
  }

  renew(clientId: string, now: number): { ok: boolean; expiresAt: number } {
    if (this.holder !== clientId || now >= this.expiresAt) {
      return { ok: false, expiresAt: this.expiresAt }; // 既に失効している、または保持者ではない
    }
    this.expiresAt = now + this.leaseDuration;
    return { ok: true, expiresAt: this.expiresAt };
  }

  clientSafeDeadline(serverExpiresAt: number): number {
    // クロックスキューを考慮し、クライアント側は保守的に早めの期限を採用する
    return serverExpiresAt - this.clockSkewMargin;
  }
}

class FencedResource {
  // フェンシングトークンで古いリース保持者からの操作を拒否するリソース側の実装
  private maxSeenToken = 0;

  write(fencingToken: number, _value: string): boolean {
    if (fencingToken < this.maxSeenToken) return false; // 失効したリースからの古い操作を拒否
    this.maxSeenToken = fencingToken;
    return true;
  }
}
```
