---
name: モニタ(Monitor)パターン
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回のwait/notifyあたり)
summary: 相互排他ロックと条件変数を1つのオブジェクトにカプセル化し、「一度に1つのスレッドだけが内部状態を操作でき、条件が満たされるまで安全に待機・再開できる」ことを構造的に保証する高水準な同期の抽象化。
---

## 概要

セマフォや生のロックを直接操作するプログラミングは、ロックの取得漏れ・解放漏れや、条件チェックのタイミングミスといったバグの温床になりやすい。1970年代にC.A.R.ホーアとパー・ブリンチ・ハンセンが独立に定式化したモニタは、「共有データ」「そのデータを操作する手続き(メソッド)」「相互排他」「条件変数による待機・通知」を1つの構造にまとめ、モニタ内のメソッド呼び出しは常に排他的に(一度に1スレッドだけが)実行されることを、言語やランタイムが構造的に保証する、という高水準な同期の抽象化である。[dining-philosophers](/algorithms/dining-philosophers)や[producer-consumer-semaphore](/algorithms/producer-consumer-semaphore)のような古典的な同時実行問題は、モニタを使うとロックの明示的な取得・解放を書かずに、条件変数の待機・通知だけで簡潔に表現できる。

## 仕組み

1. モニタは「内部の相互排他ロック」と「1つ以上の条件変数」、そして共有データとそれを操作するメソッド群から構成される
2. モニタのどのメソッドを呼び出す際も、暗黙的に内部ロックが取得される(呼び出し元が明示的にロックを取得する必要がない)。これにより、モニタ内では常に高々1つのスレッドしか実行されないことが保証される
3. メソッド内で「今は処理を進められない条件」に遭遇したら、対応する条件変数に対して`wait()`を呼ぶ。`wait()`は暗黙的にモニタの内部ロックを解放し、そのスレッドを条件変数の待機列に入れてスリープさせる(これにより他のスレッドがモニタに入れるようになる)
4. 別のスレッドが状態を変更して待機条件が満たされるようになったら、同じ条件変数に対して`notify()`(1つのスレッドを起こす)または`notify_all()`(全員を起こす)を呼ぶ
5. 起こされたスレッドは内部ロックを再取得してから`wait()`の直後から実行を再開する。多くの実装(Mesaスタイル)では、起床後に条件が本当に満たされているかを再チェックする(`while`文でラップする)のが安全な作法とされる

## 特性・トレードオフ

- **計算量**: 単一のwait/notify操作はO(1)
- **セマフォとの表現力の違い**: セマフォは単一のカウンタで様々な同期パターンを表現できる汎用プリミティブだが、コードから意図を読み取りにくい。モニタは「このデータへのアクセスはこのロックで守られている」という関係が構造として明確なため、可読性と安全性でセマフォより優れるとされる
- **HoareスタイルとMesaスタイルの違い**: notify直後にスレッドを即座に実行させる厳密な「Hoareモニタ」と、単に実行可能状態に戻すだけで実際の再開が遅延しうる「Mesaモニタ」という2つの意味論があり、後者がJavaやC#など多くの言語で採用されている。Mesaスタイルでは起床後の条件再チェックが安全のために必須になる
- **使いどころ**: Javaの`synchronized`キーワードと`wait()`/`notify()`、C#の`Monitor`クラスと`lock`ステートメント、Pythonの`threading.Condition`はいずれもモニタパターンの直接的な実装である。[readers-writers-problem](/algorithms/readers-writers-problem)や有限バッファの生産者・消費者問題を、ロックの明示操作なしに簡潔に書きたい場合に使われる

## 実装例

```python
import threading
from collections import deque


class BoundedBufferMonitor:
    def __init__(self, capacity: int) -> None:
        self._capacity = capacity
        self._buffer: deque = deque()
        self._lock = threading.Lock()
        self._not_full = threading.Condition(self._lock)
        self._not_empty = threading.Condition(self._lock)

    def put(self, item) -> None:
        with self._not_full:
            while len(self._buffer) == self._capacity:
                self._not_full.wait()  # 内部ロックを解放して待機
            self._buffer.append(item)
            self._not_empty.notify()

    def take(self):
        with self._not_empty:
            while not self._buffer:
                self._not_empty.wait()
            item = self._buffer.popleft()
            self._not_full.notify()
            return item
```

```typescript
class BoundedBufferMonitor<T> {
  private buffer: T[] = [];
  private notFullWaiters: Array<() => void> = [];
  private notEmptyWaiters: Array<() => void> = [];

  constructor(private readonly capacity: number) {}

  async put(item: T): Promise<void> {
    while (this.buffer.length === this.capacity) {
      // wait(): 空きができるまで待機する
      await new Promise<void>((resolve) => this.notFullWaiters.push(resolve));
    }
    this.buffer.push(item);
    this.notEmptyWaiters.shift()?.(); // notify(): 待っている消費者を1人起こす
  }

  async take(): Promise<T> {
    while (this.buffer.length === 0) {
      // wait(): データが入るまで待機する
      await new Promise<void>((resolve) => this.notEmptyWaiters.push(resolve));
    }
    const item = this.buffer.shift()!;
    this.notFullWaiters.shift()?.(); // notify(): 待っている生産者を1人起こす
    return item;
  }
}
```
