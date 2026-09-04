---
name: Chase-Levワークスティーリングデック(Chase-Lev Work-Stealing Deque)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(1)(償却、push/pop/steal各操作あたり)
summary: 各ワーカーが自分の両端キュー(デック)の「自分側の端」をロックなしで高速にpush/popし、暇なワーカーだけが反対側の端からロックフリーに「盗む(steal)」ことで、ワークスティーリングスケジューラの実装で実際に使われる、所有者に対してほぼオーバーヘッドゼロの並行デック。
---

## 概要

[ワークスティーリングスケジューラ](/algorithms/work-stealing-scheduler)は、各ワーカーが自分専用のタスクキューを持ち、それが枯渇すると他のワーカーから盗む、という仕組みだが、この「自分専用のタスクキュー」を実際にどう実装するかは別問題として残る。2005年にデイビッド・チェイスとヤナイ・レブが発表したこのアルゴリズムは、両端キュー(デック)の一方の端(ボトム)を所有者だけがpush/popし、もう一方の端(トップ)を他のワーカーがCASで盗む、という非対称な役割分担によって、所有者側の操作をロックなし・ほぼオーバーヘッドなしの高速なパスにする。所有者は自分のタスクをLIFO順(直近に追加したものから、局所性を活かして先に実行)でボトムから取り出し、盗む側はFIFO順に近い形でトップから奪う。

## 仕組み

1. デックは配列(または動的にリサイズ可能な循環バッファ)として実装され、`bottom`(所有者側のインデックス)と`top`(盗む側のインデックス)という2つの共有カウンタを持つ
2. **所有者によるpush(自分のタスクを追加)**: `bottom`の指す位置にタスクを書き込み、`bottom`をインクリメントする。他のワーカーと競合しないため、CASは不要でメモリフェンスのみで済む
3. **所有者によるpop(自分のタスクを取り出す)**: `bottom`を先にデクリメントしてから`top`と比較する。デックが空でなければタスクを読み出す。最後の1個を取り出す瞬間だけは、他のワーカーが同じ要素をstealしようとする可能性があるため、`top`に対するCASで競合を解決する
4. **他ワーカーによるsteal(盗む)**: `top`を読み取り、`bottom`と比較してデックが空でないことを確認したらタスクを読み出し、`top`をCASでインクリメントする。CASが失敗すれば(他のワーカーに先を越された、または所有者が取り出した)、失敗として扱いリトライまたは諦める
5. 配列が満杯になった場合は、より大きな配列へアトミックにリサイズする処理も必要になる(実装によっては固定長で簡略化される)

## 特性・トレードオフ

- **計算量**: 所有者のpush/popは償却O(1)でほぼオーバーヘッドなし(通常はCAS不要)。stealはO(1)のCAS操作1回
- **所有者優先の非対称設計**: 最も頻繁に呼ばれる所有者自身のpush/popを可能な限り軽量にし、頻度の低いsteal側にCASのコストを寄せるという設計思想が、[ワークスティーリングスケジューラ](/algorithms/work-stealing-scheduler)全体のオーバーヘッドを大きく下げる
- **LIFO対FIFOの使い分けによる局所性**: 所有者はボトム側からLIFO順で取り出すため、直近にフォークしたタスク(キャッシュに乗っている可能性が高い)を優先的に実行でき、キャッシュ局所性が良い。stealはトップ側からFIFO寄りの順で奪うため、粒度の大きい(まだ分割されていない、若い)タスクを盗みやすく、盗んだ側の利得が大きくなりやすい
- **[フォーク・ジョインモデル](/algorithms/fork-join-model)との関係**: フォーク・ジョインモデルで生成される大量の細粒度タスクを各ワーカーへ効率よく分配するための、実際の内部実装として使われる
- **使いどころ**: JavaのFork/Joinフレームワーク(`ForkJoinPool`)、Intel TBB、Rustの`rayon`、Goランタイムのgoroutineスケジューラなど、ワークスティーリングを採用する多くの並列処理ランタイムの内部実装

## 実装例

```python
class AtomicInt:
    def __init__(self, value: int):
        self.value = value

    def compare_and_swap(self, expected: int, new: int) -> bool:
        if self.value == expected:
            self.value = new
            return True
        return False


class ChaseLevDeque:
    def __init__(self, capacity: int = 1024) -> None:
        self._buffer = [None] * capacity
        self._capacity = capacity
        self._bottom = 0  # 所有者だけが読み書きする
        self._top = AtomicInt(0)  # 盗む側とCASで競合しうる

    def push(self, task) -> None:
        # 所有者のみが呼ぶ: CAS不要の高速パス
        self._buffer[self._bottom % self._capacity] = task
        self._bottom += 1

    def pop(self):
        # 所有者のみが呼ぶ
        self._bottom -= 1
        b = self._bottom
        t = self._top.value
        if t > b:
            self._bottom = t  # 既に空(盗まれ尽くした)
            return None
        task = self._buffer[b % self._capacity]
        if t == b:
            # 最後の1個: stealと競合しうるのでCASで決着をつける
            if not self._top.compare_and_swap(t, t + 1):
                task = None  # 盗まれた
            self._bottom = t + 1
        return task

    def steal(self):
        # 他ワーカーが呼ぶ
        t = self._top.value
        b = self._bottom
        if t >= b:
            return None  # 空
        task = self._buffer[t % self._capacity]
        if not self._top.compare_and_swap(t, t + 1):
            return None  # 他のワーカーに先を越された
        return task
```

```typescript
class AtomicInt {
  constructor(public value: number) {}
  compareAndSwap(expected: number, next: number): boolean {
    if (this.value === expected) {
      this.value = next;
      return true;
    }
    return false;
  }
}

class ChaseLevDeque<T> {
  private buffer: (T | undefined)[];
  private bottom = 0; // 所有者だけが読み書きする
  private top = new AtomicInt(0); // 盗む側とCASで競合しうる

  constructor(private readonly capacity = 1024) {
    this.buffer = new Array(capacity);
  }

  push(task: T): void {
    // 所有者のみが呼ぶ: CAS不要の高速パス
    this.buffer[this.bottom % this.capacity] = task;
    this.bottom += 1;
  }

  pop(): T | undefined {
    this.bottom -= 1;
    const b = this.bottom;
    const t = this.top.value;
    if (t > b) {
      this.bottom = t; // 既に空(盗まれ尽くした)
      return undefined;
    }
    let task = this.buffer[b % this.capacity];
    if (t === b) {
      // 最後の1個: stealと競合しうるのでCASで決着をつける
      if (!this.top.compareAndSwap(t, t + 1)) {
        task = undefined; // 盗まれた
      }
      this.bottom = t + 1;
    }
    return task;
  }

  steal(): T | undefined {
    const t = this.top.value;
    const b = this.bottom;
    if (t >= b) return undefined; // 空
    const task = this.buffer[t % this.capacity];
    if (!this.top.compareAndSwap(t, t + 1)) return undefined; // 他のワーカーに先を越された
    return task;
  }
}
```
