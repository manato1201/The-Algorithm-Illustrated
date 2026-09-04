---
name: 再入可能ロック(Reentrant Lock)
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回の取得・解放あたり、待機を除く)
summary: 同一スレッドが既に保持しているロックを、そのスレッド自身が再帰呼び出しなどで重ねて取得できるように、所有者スレッドと保持回数(ホールドカウント)を記録して管理する相互排他機構。
---

## 概要

通常のミューテックス(単純な排他ロック)は「誰が保持しているか」を意識しない。そのため、あるスレッドが既にロックを保持している状態で、そのスレッド自身が再帰呼び出しの中で同じロックを再度取得しようとすると、自分自身が保持しているロックの解放を待ち続ける「自己デッドロック」に陥ってしまう。再帰関数の中で同じロックを取る、あるいはロックを取得したメソッドが、同じロックを要求する別の内部メソッドを呼び出す、といった状況は実務のコードで頻繁に起こる。再入可能ロック(リエントラントロック)は、ロックの内部状態に「現在の所有者スレッド」と「何回重ねて取得されたか(ホールドカウント)」を記録することで、この問題を解決する。同じスレッドが再度ロックを要求した場合は、待つことなく即座に取得を許可してホールドカウントを増やし、解放のたびにホールドカウントを減らして、0になった時点で初めて他のスレッドへ明け渡す。

## 仕組み

1. ロックの内部状態として、`owner`(現在の所有者スレッド、未保持ならnull)と`hold_count`(保持回数、初期値0)を持つ
2. **取得(自スレッドが既に保持)**: 呼び出し元のスレッドが`owner`と一致すれば、待たずに`hold_count`をインクリメントするだけで即座に取得できたとみなす
3. **取得(未保持または他スレッドが保持中)**: `owner`がnull(または自分自身)になるまで待機し、その状態になった時点で`owner`を自分に設定し、`hold_count`を1にする
4. **解放**: `hold_count`をデクリメントする。0になった時点で初めて`owner`をnullに戻し、待機中の他スレッドに通知する。0になるまでは所有権を保持し続ける
5. 呼び出し元は「取得した回数と同じ回数だけ解放する」責任を負う。多くの言語では、try-finallyパターンやwithブロック/usingステートメントを使ってこの対称性を構造的に保証する

## 特性・トレードオフ

- **計算量**: 取得・解放とも、待機が発生しなければO(1)(カウンタの比較・増減のみ)
- **再帰・相互呼び出しへの安全性**: 通常のミューテックスでは自己デッドロックの原因になる「同一スレッドによる再取得」を安全に許容できるため、再帰アルゴリズムや、公開メソッドが同じロックで保護された非公開メソッドを内部で呼び出すような設計では実質的に必須になる
- **わずかなオーバーヘッド**: 所有者の比較とホールドカウントの管理という追加コストが常に発生するため、単純なミューテックスよりごくわずかに重い
- **対称性の要求という落とし穴**: 取得回数と解放回数が一致しないと、ロックが永久に他スレッドへ渡らない(解放し忘れ)、あるいは想定より早く他スレッドへ明け渡ってしまう(過剰な解放)というバグを生みやすい
- **使いどころ**: Javaの`ReentrantLock`、C#の`lock`ステートメント(内部的に`Monitor`を使用)、Pythonの`threading.RLock`など、多くの言語の標準ライブラリで再入可能なロックが標準的に提供されている。公開APIと内部実装の両方が同じ排他制御を必要とするオブジェクト指向設計全般

## 実装例

```python
import threading


class ReentrantLock:
    def __init__(self) -> None:
        self._owner: int | None = None
        self._hold_count = 0
        self._cond = threading.Condition()

    def acquire(self) -> None:
        me = threading.get_ident()
        with self._cond:
            while self._owner is not None and self._owner != me:
                self._cond.wait()
            self._owner = me
            self._hold_count += 1

    def release(self) -> None:
        me = threading.get_ident()
        with self._cond:
            if self._owner != me:
                raise RuntimeError("解放できるのは所有スレッドのみ")
            self._hold_count -= 1
            if self._hold_count == 0:
                self._owner = None
                self._cond.notify_all()
```

```typescript
class ReentrantLock {
  private owner: number | null = null;
  private holdCount = 0;

  // 実際のマルチスレッド環境ではブロッキング待機になるが、
  // ここでは呼び出し側のスレッドIDを明示的に渡してロジックを検証する
  tryAcquire(threadId: number): boolean {
    if (this.owner === null || this.owner === threadId) {
      this.owner = threadId;
      this.holdCount++;
      return true;
    }
    return false; // 他スレッドが保持中: 呼び出し側がリトライまたは待機する
  }

  release(threadId: number): void {
    if (this.owner !== threadId) {
      throw new Error("解放できるのは所有スレッドのみ");
    }
    this.holdCount--;
    if (this.holdCount === 0) {
      this.owner = null;
    }
  }
}
```
