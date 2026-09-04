---
name: CLHロック(Craig, Landin, and Hagersten Lock)
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回のロック取得・解放あたり)
summary: 各スレッドが事前に用意したノードをtailポインタへアトミックに繋ぎ替えるだけで暗黙の待ち行列を形成し、直前のスレッドのノードだけをスピン監視することで、MCSロックに匹敵する公平性とスケーラビリティをより単純な構造で実現するキューベースのスピンロック。
---

## 概要

[MCSロック](/algorithms/mcs-lock)は、待機スレッドたちが明示的な連結リストを形成し、各スレッドが自分専用のローカル変数だけをスピンすることでキャッシュライン競合を避ける、スケーラブルなキューベースロックである。1993年にトラビス・クレイグ、そして独立にピーター・ランディンとエリック・ハガーステンが考案したCLHロックは、同じ目的をさらに単純な構造で達成する。MCSロックが「自分のノードのフラグ」を監視し、解放時に「次のスレッドのノード」へ明示的に通知するのに対し、CLHロックは「直前のスレッドのノード」を監視する。ノード同士を結ぶ明示的な`next`ポインタが不要になり、共有のtailポインタをアトミックに交換(swap)するだけで暗黙の待ち行列ができあがるため、実装がより簡潔になる。

## 仕組み

1. 各スレッドは、ロックを取得しようとするたびに自分用の**キューノード**(`locked`フラグを持つ小さな構造体)を用意し、`locked`を`true`に設定する
2. 共有の`tail`ポインタに対して、自分のノードをアトミックに交換(swap)し、それまでの`tail`(直前に並んでいたスレッドのノード)を`predecessor`(先行ノード)として受け取る
3. `predecessor`の`locked`フラグが`false`になるまでスピン監視する(MCSロックが「自分のノード」を監視するのに対し、CLHロックは「先行ノードそのもの」を監視する点が構造的な違い)
4. `predecessor`の`locked`が`false`になったら、クリティカルセクションに入ってよい
5. ロックを解放するとき、自分の`locked`フラグを`false`に設定するだけでよい(次のスレッドへの明示的な通知は不要——次のスレッドは自分自身のスピンループでこの変化を検知する)。自分の古いノードは、次回自分がロックを取得するときの新しいノードとして再利用されることが多い

## 特性・トレードオフ

- **計算量**: 取得・解放ともO(1)(tailへのアトミックなswapと、先行ノード1つへの定数回のアクセスだけで完結する)
- **[MCSロック](/algorithms/mcs-lock)との構造的な違い**: 明示的な`next`ポインタの管理が不要な分、実装がより単純になる。ただし「自分のノードではなく先行ノードを監視する」ため、NUMAアーキテクチャ(メモリへのアクセス距離がコアごとに異なる環境)では先行ノードが物理的に遠いメモリ上にあるとリモートアクセスが発生しやすく、MCSロックより不利になる場合がある——逆に共有バス型のUMAアーキテクチャではCLHロックの方が有利とされる
- **公平性(FIFO性)**: tailへのswap順(=ロック要求順)通りにロックが渡されるため、[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)と同様に飢餓が起こらない
- **ノードの再利用**: 自分のノードを次回の取得時に再利用する実装が一般的で、ノードのメモリ確保コストを償却できる
- **使いどころ**: Javaの`java.util.concurrent.locks`パッケージの基盤である`AbstractQueuedSynchronizer`(AQS)は、CLHロックの変種を内部キューとして採用している。汎用的で公平なロックプリミティブとして、高並行度な環境全般で使われる

## 実装例

```python
import threading
from dataclasses import dataclass


@dataclass
class CLHNode:
    locked: bool = True


class CLHLock:
    def __init__(self) -> None:
        self._tail = CLHNode(locked=False)  # 初期状態の番兵ノード
        self._swap_lock = threading.Lock()  # tailの交換をアトミックにする(実機ではswap命令1つで代替)

    def acquire(self) -> CLHNode:
        my_node = CLHNode(locked=True)
        with self._swap_lock:
            predecessor = self._tail
            self._tail = my_node
        while predecessor.locked:
            pass  # 先行ノードのフラグだけをスピン監視する
        return my_node  # release時に必要になるので返す

    def release(self, my_node: CLHNode) -> None:
        my_node.locked = False  # 次のスレッドは自身のスピンループでこの変化を検知する
```

```typescript
class CLHNode {
  locked = true;
}

class CLHLock {
  // 初期状態の番兵ノード
  private tail = new CLHNode();

  constructor() {
    this.tail.locked = false;
  }

  // tailの交換: 実機ではアトミックなswap命令1つで代替される
  private swapTail(node: CLHNode): CLHNode {
    const prev = this.tail;
    this.tail = node;
    return prev;
  }

  acquire(): CLHNode {
    const myNode = new CLHNode();
    const predecessor = this.swapTail(myNode);
    while (predecessor.locked) {
      // 先行ノードのフラグだけをスピン監視する
    }
    return myNode; // releaseで必要になるので返す
  }

  release(myNode: CLHNode): void {
    myNode.locked = false; // 次のスレッドは自身のスピンループでこの変化を検知する
  }
}
```
