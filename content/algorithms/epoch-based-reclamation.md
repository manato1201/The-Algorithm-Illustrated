---
name: エポックベースメモリ回収(Epoch-Based Reclamation)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(1)(1回の操作あたりの償却)、O(スレッド数)(1回のエポック前進判定あたり)
summary: 全スレッドが現在参加している「エポック」という時間区間の中で最も古いものを追跡し、それより古いエポックで削除されたメモリだけをまとめて安全に解放する、ポインタ単位ではなく時間区間単位で管理するロックフリーメモリ回収手法。
---

## 概要

[ハザードポインタ](/algorithms/hazard-pointers)は、ロックフリーデータ構造からノードを削除した後、いつそのメモリを安全に解放してよいかという問題を、「今アクセス中のノードへのポインタを明示的に公開する」という**ポインタ単位**の追跡で解決する。これに対してエポックベースメモリ回収(EBR)は、同じ問題により粗い粒度、すなわち**時間区間(エポック)単位**で取り組むアプローチである。全体で共有される「現在のエポック番号」というグローバルカウンタを用意し、各スレッドはデータ構造にアクセスする前に「今どのエポックに参加しているか」を宣言する。あるスレッドが削除したノードは、削除が起きたエポック番号と紐づけて退避リストに保持される。システム全体が「もう誰もそのエポックより古い状態を見ていない」と判定できたとき、そのエポックに紐づく退避済みノードをまとめて一括で解放する。ポインタ1つ1つを個別に追跡するのではなく、「今この瞬間、参照されている可能性がある最古の時点はどこか」という**時間の下限**だけを追跡すればよいため、ハザードポインタよりも実装がシンプルで、スレッドあたりのオーバーヘッドも小さい傾向がある。

## 仕組み

1. システム全体で共有される**グローバルエポックカウンタ**(通常0, 1, 2の3値を巡回する小さな整数)を1つ用意する
2. 各スレッドは、共有データ構造にアクセスを始める(クリティカルセクションに入る)前に、その時点のグローバルエポック番号を読み取り、自分専用の「今参加中のエポック番号」として公開する。アクセスが終わったら、この宣言を解除する
3. あるスレッドがノードを削除するとき、そのノードを即座に解放するのではなく、**現在のグローバルエポック番号に紐づけた退避リスト**に登録する
4. 定期的に、全スレッドが現在公開している「参加中のエポック番号」を確認する。全てのアクティブなスレッドが最新のグローバルエポックに追いついている(=誰も古いエポックの状態を参照していない)と判定できたら、グローバルエポックを1つ前進させる
5. グローバルエポックが前進したことで、それより2つ以上古いエポックに紐づく退避リストの内容は「もう誰からも参照されていない」ことが保証されるため、その退避リストのノードをまとめて一括で解放する

## 特性・トレードオフ

- **計算量**: 通常の読み書き操作は自分のエポック番号を公開するだけの定数コスト`O(1)`(償却)。エポックを前進させられるかどうかの判定は全スレッドのエポック番号を確認する必要があるため`O(スレッド数)`だが、この判定は頻繁に行う必要はなく、バッチ処理的にまとめて実行できる
- **[ハザードポインタ](/algorithms/hazard-pointers)との違い**: ハザードポインタは「どのノードを今指しているか」をポインタ単位で明示的に宣言・照合するのに対し、エポックベース回収は「今どの時間区間(エポック)に参加しているか」だけを宣言し、実際にどのノードを見ているかは追跡しない。この違いにより、EBRはアクセスのたびに個別のポインタを公開・解除する必要がなく、宣言のオーバーヘッドがハザードポインタより小さくなりやすい。一方で、あるスレッドが1つの古いエポックに長時間留まり続けると(例えば処理が長引く、あるいはスレッドがハングする)、そのエポックに紐づく退避済みノードが際限なく解放されずに溜まり続けるという弱点がある——ハザードポインタはノード単位で解放判定するため、この種の「1スレッドの停滞が全体の回収を止める」問題の影響がより限定的である
- **実装のシンプルさとオーバーヘッドの小ささ**: エポック番号という単純な整数の管理で済むため、ハザードポインタのような「全スレッドのポインタスロットを毎回走査する」処理が不要で、実装・運用コストが低い。この単純さから、多くの実用的なロックフリーライブラリで採用されている
- **使いどころ**: Rustの`crossbeam-epoch`クレート(ロックフリーデータ構造の標準的なメモリ回収機構として広く使われる)、Linuxカーネルの[Read-Copy-Update(RCU)](/algorithms/read-copy-update)(グレースピリオドという概念がエポックに近い発想)、データベースエンジンやJVMの一部のロックフリー構造。[ロックフリースタック](/algorithms/lock-free-stack-cas)や[Michael-Scottキュー](/algorithms/michael-scott-queue)のような既存のロックフリー構造にメモリ回収機構を追加する際の実用的な選択肢の1つ

## 実装例

```python
from dataclasses import dataclass, field

NUM_EPOCHS = 3  # 0, 1, 2 を巡回する


@dataclass
class EpochManager:
    global_epoch: int = 0
    thread_epochs: dict[int, int | None] = field(default_factory=dict)
    garbage: list[list[object]] = field(default_factory=lambda: [[] for _ in range(NUM_EPOCHS)])

    def enter(self, thread_id: int) -> int:
        self.thread_epochs[thread_id] = self.global_epoch
        return self.global_epoch

    def exit(self, thread_id: int) -> None:
        self.thread_epochs[thread_id] = None

    def retire(self, node: object) -> None:
        self.garbage[self.global_epoch].append(node)

    def try_advance(self) -> list[object]:
        # 全アクティブスレッドが現在のグローバルエポックに参加しているか確認する
        active = [e for e in self.thread_epochs.values() if e is not None]
        if any(e != self.global_epoch for e in active):
            return []  # 誰かまだ古いエポックにいるので前進できない

        old_epoch = self.global_epoch
        self.global_epoch = (self.global_epoch + 1) % NUM_EPOCHS

        # 2つ前のエポック(=巡回上、新しいエポックのさらに1つ前)のごみは
        # もう誰からも参照されていないので回収してよい
        reclaim_epoch = (self.global_epoch + 1) % NUM_EPOCHS
        reclaimed = self.garbage[reclaim_epoch]
        self.garbage[reclaim_epoch] = []
        return reclaimed
```

```typescript
const NUM_EPOCHS = 3; // 0, 1, 2 を巡回する

class EpochManager {
  globalEpoch = 0;
  private threadEpochs = new Map<number, number | null>();
  private garbage: unknown[][] = Array.from({ length: NUM_EPOCHS }, () => []);

  enter(threadId: number): number {
    this.threadEpochs.set(threadId, this.globalEpoch);
    return this.globalEpoch;
  }

  exit(threadId: number): void {
    this.threadEpochs.set(threadId, null);
  }

  retire(node: unknown): void {
    this.garbage[this.globalEpoch].push(node);
  }

  tryAdvance(): unknown[] {
    // 全アクティブスレッドが現在のグローバルエポックに参加しているか確認する
    const active = [...this.threadEpochs.values()].filter((e) => e !== null);
    if (active.some((e) => e !== this.globalEpoch)) {
      return []; // 誰かまだ古いエポックにいるので前進できない
    }

    this.globalEpoch = (this.globalEpoch + 1) % NUM_EPOCHS;

    // 2つ前のエポックのごみは、もう誰からも参照されていないので回収してよい
    const reclaimEpoch = (this.globalEpoch + 1) % NUM_EPOCHS;
    const reclaimed = this.garbage[reclaimEpoch];
    this.garbage[reclaimEpoch] = [];
    return reclaimed;
  }
}
```
