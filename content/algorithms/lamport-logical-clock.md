---
name: ランポート論理時計(Lamport Logical Clock)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(1)(1イベントあたりの更新)
summary: 各プロセスが単一の整数カウンタだけを使って、分散システムのイベント間に「happened-before」関係と矛盾しない順序を与える、論理時計の最も基本的な形。
---

## 概要

分散システムでは各ノードが独立した物理時計を持ち、時計のズレ(クロックスキュー)やネットワーク遅延のせいで、実時刻をそのまま比較しても「どのイベントが本当に先に起きたか」を正しく判定できない。1978年にLeslie Lamportが発表した論文 "Time, Clocks, and the Ordering of Events in a Distributed System" は、この問題に対して**物理時計に頼らず、イベント間の因果関係だけから一貫した順序を作る**という発想を持ち込んだ。その中核が、各プロセスが持つ単一の整数カウンタだけで実現する論理時計であり、後のあらゆる分散システムの時刻・順序づけの議論の出発点になっている。

Lamportはまず「happened-before(→)」という関係を定義する。(1) 同じプロセス内で`a`が`b`より先に実行されればa→b、(2) あるプロセスがメッセージを送るイベントは、別プロセスがそれを受信するイベントよりhappened-before、(3) →は推移的。この関係で比較できない2つのイベントは「並行(concurrent)」と呼ばれる。ランポート論理時計は、この半順序と矛盾しないように整数を割り振る仕組みである。

## 仕組み

各プロセス`P`は、自分専用の整数カウンタ`C`を0で初期化し、以下の規則だけで更新する。

1. **内部イベント発生時**: `C ← C + 1`
2. **メッセージ送信時**: まず`C ← C + 1`し、その値をタイムスタンプとしてメッセージに添付して送る
3. **メッセージ受信時**: 受信したタイムスタンプ`t`と自分の`C`を比べ、`C ← max(C, t) + 1`とする

この3つの規則だけで、「**a→bならばC(a) < C(b)**」という性質(クロック条件)が常に成り立つ。同じプロセス内のイベントは規則1により単調増加し、メッセージのやり取りは規則2・3により「送信より受信の方が必ず大きい値を持つ」ことが保証されるため、因果的に繋がった2つのイベントのタイムスタンプは必ず正しい大小関係になる。

全ノードのイベントに単一の全順序を与えたい場合は、`(C(a), プロセスID)`のペアを辞書式順序で比較するタイブレークを使うことが多い(**全順序化**)。ただしこれはあくまで人為的な順序であり、タイムスタンプが等しくない2つのイベントが実際には因果関係を持たない「並行」なイベントである可能性を排除しない点に注意が必要。

## 特性・トレードオフ

- **計算量とオーバーヘッド**: 更新はO(1)、メッセージに添付する情報も整数1個だけであり、通信・保存コストが極めて小さい
- **[ベクタークロック](/algorithms/vector-clocks)との違いが本質**: ランポート論理時計は「a→b ⟹ C(a) < C(b)」という**一方向の含意**しか保証しない。C(a) < C(b)であっても、実際にはaとbが並行(互いに無関係)である可能性があり、タイムスタンプの大小だけから因果関係を逆推定することはできない。またタイブレークを使わない限り全順序も得られない。これに対しベクタークロックはノード数個の要素を持つベクタを比較することで、「因果関係がある」のか「並行である」のかを正確に判定できる——その代わりベクタのサイズがノード数に比例し、通信・保存コストが増える。**「軽量だが因果関係の逆推定ができない」ランポート論理時計と、「重いが正確に判定できる」ベクタークロック**という明確なトレードオフの関係にある
- **並行イベントの区別ができない**: 上記の通り、タイムスタンプが異なっていても因果関係があるとは限らないため、「本当に競合しているデータ更新」を検出する用途にはベクタークロックやCRDTのような、より強い仕組みが必要になる
- **使いどころ**: 分散ログのグローバルな順序付け(全順序化と組み合わせて)、分散システムのデバッグ・トレーシングにおけるイベント順の可視化、Cassandraのようなタイムスタンプベースの最終書き込み優先(Last-Write-Wins)方式での競合解決の基礎、また[CRDT LWW-Register](/algorithms/crdt-lww-register)のようなCRDTがタイムスタンプ比較で書き込みの優劣を決める際の理論的裏付け

## 実装例

```python
from dataclasses import dataclass, field


@dataclass
class LamportClock:
    process_id: int
    counter: int = 0

    def tick(self) -> int:
        """内部イベント発生時に呼ぶ。カウンタを1増やして返す。"""
        self.counter += 1
        return self.counter

    def send(self) -> int:
        """メッセージ送信時に呼ぶ。カウンタを1増やし、添付するタイムスタンプを返す。"""
        self.counter += 1
        return self.counter

    def receive(self, incoming_timestamp: int) -> int:
        """メッセージ受信時に呼ぶ。max(自分, 受信値) + 1 に更新する。"""
        self.counter = max(self.counter, incoming_timestamp) + 1
        return self.counter


@dataclass(order=True)
class TotalOrderKey:
    """タイムスタンプとプロセスIDの辞書式順序で全順序化するためのキー。"""
    timestamp: int
    process_id: int = field(compare=True)


def total_order_key(clock_value: int, process_id: int) -> TotalOrderKey:
    return TotalOrderKey(timestamp=clock_value, process_id=process_id)


if __name__ == "__main__":
    p1 = LamportClock(process_id=1)
    p2 = LamportClock(process_id=2)

    p1.tick()                      # P1: C=1 (内部イベント)
    ts = p1.send()                 # P1: C=2 (送信)
    p2.tick()                      # P2: C=1 (無関係な内部イベント、並行して発生)
    p2.receive(ts)                 # P2: C=max(1,2)+1=3 (受信、P1のイベントより後だと確定)

    # p1のtick(C=1)とp2のtick(C=1)は値が同じでも並行イベントであり、
    # ランポート論理時計だけではこの2つの因果関係(無関係)を判定できない。
    print(p1.counter, p2.counter)  # 2, 3
```

```typescript
class LamportClock {
  counter = 0;
  constructor(public readonly processId: number) {}

  /** 内部イベント発生時に呼ぶ。カウンタを1増やして返す。 */
  tick(): number {
    this.counter += 1;
    return this.counter;
  }

  /** メッセージ送信時に呼ぶ。カウンタを1増やし、添付するタイムスタンプを返す。 */
  send(): number {
    this.counter += 1;
    return this.counter;
  }

  /** メッセージ受信時に呼ぶ。max(自分, 受信値) + 1 に更新する。 */
  receive(incomingTimestamp: number): number {
    this.counter = Math.max(this.counter, incomingTimestamp) + 1;
    return this.counter;
  }
}

/** タイムスタンプとプロセスIDの辞書式順序で全順序化するための比較関数。 */
function compareTotalOrder(
  a: { timestamp: number; processId: number },
  b: { timestamp: number; processId: number },
): number {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  return a.processId - b.processId;
}

// 使用例
const p1 = new LamportClock(1);
const p2 = new LamportClock(2);

p1.tick(); // P1: C=1 (内部イベント)
const ts = p1.send(); // P1: C=2 (送信)
p2.tick(); // P2: C=1 (無関係な内部イベント、並行して発生)
p2.receive(ts); // P2: C=max(1,2)+1=3 (受信、P1のイベントより後だと確定)

// p1のtick(C=1)とp2のtick(C=1)は値が同じでも並行イベントであり、
// ランポート論理時計だけではこの2つの因果関係(無関係)を判定できない。
console.log(p1.counter, p2.counter); // 2, 3
```
