---
name: CRDT(LWW-Register)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(1)(1回の書き込み・マージあたり)
summary: 各書き込みにタイムスタンプを付与し、マージ時にタイムスタンプが最大の書き込みを勝者として採用することで、単調増加しない任意の値でも競合を自動解決できる結果整合的なレジスタ型CRDT。
---

## 概要

[CRDT G-Counter](/algorithms/crdt-g-counter)は「増加のみ」というごく限られた操作にしか対応できないが、実際のアプリケーションでは「ユーザー名を変更する」「設定値を上書きする」のように、**過去の値と無関係な任意の値で置き換える**書き込みを扱いたい場面の方が多い。LWW-Register(Last-Write-Wins Register、最終書き込み優先レジスタ)は、単一の値を保持するレジスタに対して、複数のノードが調整なしに(オフラインでも)自由に書き込みを行い、後で複製同士をマージする際に「**タイムスタンプが最も新しい書き込みだけを残す**」という単純なルールで競合を解決するCRDTである。マージが可換・結合的・冪等であるという性質はG-Counterと同じだが、その根拠が「`max`を取ってもカウンタは減らない」という単調性ではなく、「タイムスタンプの全順序において必ず1つの最大値が決まる」という全順序性に置き換わっている点が異なる。

## 仕組み

各レプリカ(ノード)は、レジスタの値`value`と、その値が書き込まれた時刻を表す`timestamp`の組を保持する。

1. **書き込み**: ノードがレジスタに新しい値`v`を書き込むとき、現在時刻(または[ランポート論理時計](/algorithms/lamport-logical-clock)のような論理時刻)`t`を取得し、`(value, timestamp) ← (v, t)`とローカルに反映する。他ノードへの同期・確認は一切不要
2. **マージ**: 2つのレプリカの状態`(v1, t1)`と`(v2, t2)`をマージするときは、**タイムスタンプが大きい方をそのまま採用**する。`t1 > t2`なら`(v1, t1)`、`t1 < t2`なら`(v2, t2)`を結果とする
3. **タイムスタンプの同点をどう扱うか**: 物理時計はノード間で完全には同期しないため、`t1 == t2`となることがある。この場合はノードIDのような一意な値をタイブレークに使い(例えば`(timestamp, node_id)`のペアを辞書式順序で比較する)、**全ノードが必ず同じ勝者を選ぶ**ようにする。これがないと、ノードごとにマージ結果が食い違ってCRDTの前提(どんな順序でマージしても同じ結果に収束する)が崩れる

`max`を取るという操作自体はG-Counterの各要素と同じ「べき等・可換・結合的」な演算であり、これがLWW-Registerの結果整合性(結果整合的に全レプリカが同じ値へ収束すること)を保証する数学的な根拠になっている。

## 特性・トレードオフ

- **計算量**: 書き込み・マージともにタイムスタンプの比較だけなのでO(1)。G-Counterの`O(ノード数)`のマージ(全要素をmax)に対し、LWW-Registerは値が1個分だけなので、単純さの面ではさらに軽量
- **[CRDT G-Counter](/algorithms/crdt-g-counter)との違い**: G-Counterはノードごとのカウンタを**個別に**単調増加させ、値を読むときに全ノード分を合算する「増加のみ」の制約付きデータ型だった。LWW-Registerはその制約を外し、**任意の値への上書き**を許す代わりに、複数ノードの書き込みのうち1つだけを勝者として選び、他は失われる(**Last-Write-Wins**、最後の書き込みが勝つ)という設計になっている。表現力は上がるが、その代償として「敗者側の書き込みが黙って消える」という弱点を負う
- **因果関係を無視することの代償**: 2つの書き込みが実際には因果関係にある(片方がもう片方を見て行われた)のか、単に並行に起きただけなのかをLWW-Register自体は区別しない。物理時計のズレ(クロックスキュー)によって、実際には後に行われた書き込みの方が古いタイムスタンプを持ってしまい、意図に反して上書きされる("因果関係の逆転")リスクがある。この問題を厳密に避けたい場合は、[ベクタークロック](/algorithms/vector-clocks)で因果関係を追跡し、真に並行な書き込みに対してのみ何らかのマージ規則(あるいはアプリケーション側での競合提示)を適用するMV-Register(Multi-Value Register)のような、より慎重な設計が使われる
- **状態ベース(CvRDT)と操作ベース(CmRDT)**: ここで示した「状態全体を送ってマージする」実装は状態ベースCRDT(state-based、CvRDT)。ネットワーク帯域を節約するため「書き込み操作そのもの」を他ノードへブロードキャストする操作ベースCRDT(op-based、CmRDT)という設計も存在し、Shapiro らの2011年の調査論文でCRDT全般の理論的枠組みとして整理されている
- **使いどころ**: Redisクラスタやリモートキーバリューストアにおける単純な値の複製、モバイルアプリのオフライン編集からの復帰時の設定同期、分散データベース(Riak、Cassandraの一部機能)における「最後の書き込みを優先する」competing writes解決方針の実装、CRDTベースの共同編集ツールにおける、テキスト以外の単純なメタデータ(タイトルやフラグなど)の同期

## 実装例

```python
from dataclasses import dataclass


@dataclass
class LWWRegister:
    node_id: int
    value: object = None
    timestamp: float = float("-inf")

    def write(self, value: object, timestamp: float) -> None:
        """ローカルに新しい値を書き込む。同期や確認は不要。"""
        if (timestamp, self.node_id) >= (self.timestamp, self.node_id):
            self.value = value
            self.timestamp = timestamp

    def merge(self, other: "LWWRegister") -> None:
        """他レプリカの状態とマージし、タイムスタンプが大きい方を採用する。
        同点の場合はnode_idの大小をタイブレークに使い、全レプリカで結果を一致させる。"""
        mine = (self.timestamp, self.node_id)
        theirs = (other.timestamp, other.node_id)
        if theirs > mine:
            self.value = other.value
            self.timestamp = other.timestamp


if __name__ == "__main__":
    a = LWWRegister(node_id=1)
    b = LWWRegister(node_id=2)

    a.write("Alice", timestamp=10)
    b.write("Bob", timestamp=12)   # bの方が新しい書き込み

    a.merge(b)
    b.merge(a)

    assert a.value == b.value == "Bob"  # どちらも新しい方の値に収束
    assert a.timestamp == b.timestamp == 12
```

```typescript
class LWWRegister<T> {
  value: T | null = null;
  timestamp = -Infinity;
  constructor(public readonly nodeId: number) {}

  /** ローカルに新しい値を書き込む。同期や確認は不要。 */
  write(value: T, timestamp: number): void {
    if ([timestamp, this.nodeId] >= [this.timestamp, this.nodeId]) {
      this.value = value;
      this.timestamp = timestamp;
    }
  }

  /**
   * 他レプリカの状態とマージし、タイムスタンプが大きい方を採用する。
   * 同点の場合はnodeIdの大小をタイブレークに使い、全レプリカで結果を一致させる。
   */
  merge(other: LWWRegister<T>): void {
    const mine: [number, number] = [this.timestamp, this.nodeId];
    const theirs: [number, number] = [other.timestamp, other.nodeId];
    const isTheirsGreater =
      theirs[0] > mine[0] || (theirs[0] === mine[0] && theirs[1] > mine[1]);
    if (isTheirsGreater) {
      this.value = other.value;
      this.timestamp = other.timestamp;
    }
  }
}

// 使用例
const a = new LWWRegister<string>(1);
const b = new LWWRegister<string>(2);

a.write("Alice", 10);
b.write("Bob", 12); // bの方が新しい書き込み

a.merge(b);
b.merge(a);

console.log(a.value, b.value); // "Bob" "Bob" どちらも新しい方の値に収束
```
