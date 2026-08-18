---
name: MCSロック(キューベーススピンロック)
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回のロック取得・解放あたり、キャッシュコヒーレンストラフィックも含めて)
summary: 各スレッドが自分専用のローカル変数だけをスピンして待機し、ロック解放時には次に並んでいるスレッドだけへ通知することで、キャッシュラインの競合を避けるスケーラブルなキューベースのスピンロック。
---

## 概要

最も単純なスピンロック(1つの共有フラグを全スレッドがビジーウェイトで監視するTest-and-Setロック)は、待機中の全スレッドが同じキャッシュラインを読み書きし続けるため、マルチコアCPU上ではスレッド数が増えるほどキャッシュコヒーレンスプロトコル(キャッシュライン無効化のトラフィック)が爆発的に増加し、著しくスケールしない。1991年にジョン・メラー・クラマーとマイケル・スコットが発表したMCSロック(名前は考案者2人の頭文字に由来)は、この問題を「各スレッドが自分専用のローカル変数だけをスピンする」という設計で根本的に解決する、キューベースのスピンロックである。ロックを待つスレッドたちは、待ち行列(連結リスト)を形成し、それぞれが自分の直前のスレッドから通知を受け取るまで、他の誰とも共有しない自分専用のメモリ位置だけを監視する。この結果、ロック解放時に更新が必要なキャッシュラインは「次に並んでいるスレッド1つ分」だけに限定され、スレッド数が増えてもキャッシュトラフィックが増加しない。

## 仕組み

1. 各スレッドは、ロックを取得しようとするたびに、自分専用の**キューノード**(`locked`フラグと`next`ポインタを持つ小さな構造体)を1つ用意する
2. ロックを取得するとき、共有の`tail`ポインタ(現在キューの末尾にいるスレッドのノードを指す)に対して、自分のノードをアトミックに挿入(swap)し、それまでの`tail`(=直前に並んでいたスレッドのノード、いなければ`null`)を得る
3. もし直前のスレッドが存在すれば(`tail`が`null`でなかった)、自分の`locked`フラグを`true`に設定してから、直前のスレッドの`next`に自分のノードを繋ぎ、その上で**自分の`locked`フラグだけを**スピンして監視し、`false`になるまで待つ(この待機は自分専用のメモリ位置に対してのみ行われる)
4. 直前のスレッドが存在しなければ(自分が唯一の待機者だった)、即座にロックを取得できたとみなす
5. ロックを解放するとき、自分の`next`が`null`であれば(誰も並んでいない)、そのまま`tail`を`null`に戻して解放完了とする。ただし、この間に新しいスレッドが割り込んで自分の後ろに並ぼうとしていた場合の競合はCASで検出し、必要なら`next`が設定されるのを少し待つ。`next`が存在すれば、その次のスレッドの`locked`フラグを`false`に設定して、自分専用のメモリ位置だけを更新することでバトンを渡す

## 特性・トレードオフ

- **計算量**: ロックの取得・解放とも、`tail`ポインタへのアトミック操作と隣接ノードへの定数回のアクセスだけで完結するため`O(1)`。単純なTest-and-Setロックと異なり、この`O(1)`にはキャッシュコヒーレンストラフィックの増加分が含まれない点が本質的な利点である
- **スケーラビリティの飛躍的な向上**: 単純なスピンロックはスレッド数`n`に対して`O(n)`規模のキャッシュライン無効化トラフィックを発生させるが、MCSロックはロック解放のたびに**次のスレッド1つだけ**に通知が及ぶため、スレッド数が増えてもボトルネックにならない。多コアシステム上での高並行度なロック競合において、単純なスピンロックに比べて桁違いの性能を発揮することが知られている
- **公平性(FIFO性)**: キューに並んだ順序(=ロックを要求した順序)通りにロックが渡されるため、[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)と同様に飢餓(starvation)が起こらないことが保証される
- **実装の複雑さとメモリオーバーヘッド**: 各スレッドが自分専用のノードを管理する必要があり、単純なTest-and-Setロックと比べると実装がやや複雑になる。またノード自体のメモリ確保・管理のコストが発生する
- **使いどころ**: Linuxカーネルの`qspinlock`(MCSロックの発展形)、Javaの`AbstractQueuedSynchronizer`の内部実装、高並行度が想定されるサーバーソフトウェアやデータベースエンジンのロック機構。マルチコア環境でのスピンロック実装の事実上の標準的な設計思想であり、[ワークスティーリングスケジューラ](/algorithms/work-stealing-scheduler)のような他の並行データ構造の内部でも同様のキューベースの発想が応用される

## 実装例

```python
import threading
from dataclasses import dataclass


@dataclass
class MCSNode:
    locked: bool = False
    next: "MCSNode | None" = None


class MCSLock:
    def __init__(self) -> None:
        self._tail: MCSNode | None = None
        self._lock = threading.Lock()  # tailの入れ替えをアトミックにするための内部ロック(実機ではCAS命令1つで代替)

    def acquire(self, node: MCSNode) -> None:
        node.locked = False
        node.next = None
        with self._lock:
            predecessor = self._tail
            self._tail = node
        if predecessor is not None:
            node.locked = True
            predecessor.next = node
            while node.locked:
                pass  # 自分専用のフラグだけをスピン監視する

    def release(self, node: MCSNode) -> None:
        if node.next is None:
            with self._lock:
                if self._tail is node:
                    self._tail = None
                    return
            while node.next is None:
                pass  # 割り込んできた次のスレッドがnextを設定するのを待つ
        node.next.locked = False
```

```typescript
class MCSNode {
  locked = false;
  next: MCSNode | null = null;
}

class MCSLock {
  private tail: MCSNode | null = null;

  // tailの入れ替えをアトミックに行う(実機ではCAS命令1つで代替する箇所)
  private swapTail(node: MCSNode | null): MCSNode | null {
    const prev = this.tail;
    this.tail = node;
    return prev;
  }

  acquire(node: MCSNode): void {
    node.locked = false;
    node.next = null;
    const predecessor = this.swapTail(node);
    if (predecessor !== null) {
      node.locked = true;
      predecessor.next = node;
      while (node.locked) {
        // 自分専用のフラグだけをスピン監視する
      }
    }
  }

  release(node: MCSNode): void {
    if (node.next === null) {
      if (this.tail === node) {
        this.tail = null;
        return;
      }
      while (node.next === null) {
        // 割り込んできた次のスレッドがnextを設定するのを待つ
      }
    }
    node.next!.locked = false;
  }
}
```
