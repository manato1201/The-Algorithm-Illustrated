---
name: ベクタークロック(Vector Clock)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(n)(nはプロセス数。1イベントあたりの更新・比較コスト)
summary: 各プロセスが「全プロセス分の要素を持つカウンタの配列」を保持し、メッセージ送受信のたびにその配列を更新・合成することで、単一カウンタの論理時計では区別できない「因果的に無関係な(並行な)イベント」までも正確に検出できる分散システムの論理時計。
---

## 概要

分散システムの各プロセスが独立したクロックしか持たない状況で、イベントどうしの因果関係(どちらが先に起きたか)を判定する仕組みとして、単一の整数カウンタだけを使う論理時計([lamport-logical-clock](/algorithms/lamport-logical-clock))がある。しかしこの方式には限界があり、2つのイベントのタイムスタンプを比較しても、それらが本当に因果的に関係しているのか、それとも単に無関係(並行)なのに偶然近い値になっただけなのかを区別できない。1988年頃にコリン・フィジャー、ヴィルジル・マティアス、フリードマン・シュムエリらによって独立に考案されたベクタークロックは、各プロセスに「全プロセス分の要素を持つカウンタの配列(ベクター)」を持たせることで、この弱点を克服する。ベクター全体を比較することで、2つのイベントが「片方がもう片方より真に先行している」のか、それとも「互いに因果的な影響を及ぼしていない並行なイベント」なのかを、正確に判定できるようになる。

## 仕組み

1. n個のプロセスそれぞれが、自分専用の長さnの整数配列`V[1..n]`を持ち、全要素を0で初期化する。`V[i]`はプロセスiが認識している「プロセスiが起こしたイベント数」を表す
2. 各プロセスは、自分の内部イベント(送受信を伴わない処理)が起こるたびに、自分の担当する要素(自プロセス番号のインデックス)だけをインクリメントする
3. メッセージを送信するとき、その時点の自分のベクタークロック全体をメッセージに添えて送る
4. メッセージを受信したとき、まず自分の担当要素をインクリメントし、その後、受信したベクターと自分のベクターの各要素について「大きい方」を採用する要素ごとの最大値合成(merge)を行う
5. 2つのベクタークロック`Va`と`Vb`を比較する: 全要素で`Va[k] ≤ Vb[k]`かつどこか1つでも`Va[k] < Vb[k]`であれば「Vaが起きた後にVbが起きた」(happened-before)と判定できる。どちらの方向の不等式も成り立たない(一部の要素はVaが大きく、別の要素はVbが大きい)場合は、その2つのイベントは「並行(concurrent)」——因果的に無関係——であると判定できる

## 特性・トレードオフ

- **計算量**: 1イベントあたりの更新・比較はO(n)(nはプロセス数)。プロセス数が非常に多い分散システムでは、ベクター全体を毎回のメッセージに添付するオーバーヘッド(通信量・保存量ともO(n))が無視できなくなる
- **[lamport-logical-clock](/algorithms/lamport-logical-clock)との決定的な違い**: 単一の整数だけの論理時計は「happened-before」の必要条件しか与えず、並行性の判定ができない。ベクタークロックはn個の要素すべてを比較することで、この「並行性の判定」まで正確に行える点が本質的な強みである
- **スケーラビリティの限界**: ベクターのサイズがプロセス数に比例して増えるため、動的にプロセスが参加・離脱する大規模システムでは、間引き(dotted version vectorなど)や近似手法が実務では使われることが多い
- **使いどころ**: Amazon Dynamoのような分散データストアにおける複数レプリカ間の更新の因果関係の検出と競合解決、分散デバッグにおけるイベント順序の可視化、[chandy-lamport-snapshot](/algorithms/chandy-lamport-snapshot)のような分散スナップショットアルゴリズムの前提となる因果関係の理論的基盤、バージョン管理システムでのブランチ間の祖先関係判定

## 実装例

```python
class VectorClock:
    def __init__(self, process_id: int, num_processes: int) -> None:
        self.process_id = process_id
        self.clock = [0] * num_processes

    def tick(self) -> list[int]:
        """内部イベント、または送信直前に自分の要素だけを進める"""
        self.clock[self.process_id] += 1
        return list(self.clock)

    def send(self) -> list[int]:
        """メッセージ送信: 自分の要素を進めて、現在のベクター全体を返す"""
        return self.tick()

    def receive(self, incoming: list[int]) -> list[int]:
        """メッセージ受信: 自分の要素を進めた上で、要素ごとの最大値を採用する"""
        self.clock[self.process_id] += 1
        self.clock = [max(a, b) for a, b in zip(self.clock, incoming)]
        return list(self.clock)

    @staticmethod
    def happened_before(a: list[int], b: list[int]) -> bool:
        """a が b より因果的に先行するか(a -> b)"""
        return all(x <= y for x, y in zip(a, b)) and any(x < y for x, y in zip(a, b))

    @staticmethod
    def is_concurrent(a: list[int], b: list[int]) -> bool:
        """a と b が因果的に無関係(並行)か"""
        return not VectorClock.happened_before(a, b) and not VectorClock.happened_before(b, a)
```

```typescript
class VectorClock {
  private clock: number[];

  constructor(
    private readonly processId: number,
    numProcesses: number,
  ) {
    this.clock = new Array(numProcesses).fill(0);
  }

  // 内部イベント、または送信直前に自分の要素だけを進める
  tick(): number[] {
    this.clock[this.processId] += 1;
    return [...this.clock];
  }

  // メッセージ送信: 自分の要素を進めて、現在のベクター全体を返す
  send(): number[] {
    return this.tick();
  }

  // メッセージ受信: 自分の要素を進めた上で、要素ごとの最大値を採用する
  receive(incoming: number[]): number[] {
    this.clock[this.processId] += 1;
    this.clock = this.clock.map((v, i) => Math.max(v, incoming[i]));
    return [...this.clock];
  }

  // a が b より因果的に先行するか(a -> b)
  static happenedBefore(a: number[], b: number[]): boolean {
    const allLte = a.every((x, i) => x <= b[i]);
    const someLt = a.some((x, i) => x < b[i]);
    return allLte && someLt;
  }

  // a と b が因果的に無関係(並行)か
  static isConcurrent(a: number[], b: number[]): boolean {
    return !VectorClock.happenedBefore(a, b) && !VectorClock.happenedBefore(b, a);
  }
}
```
