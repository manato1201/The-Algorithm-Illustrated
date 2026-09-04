---
name: チケットロック(Ticket Lock)
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回のロック取得判定あたり)
summary: 銀行の整理券のように、アトミックにインクリメントされる発券カウンタから自分の順番号を受け取り、その番号が「現在対応中の番号」と一致するまで待つことで、単純な実装で厳密なFIFOの公平性を保証するスピンロック。
---

## 概要

最も単純なスピンロック(Test-and-Setロックのような、1つの共有フラグを全スレッドが奪い合う方式)は実装が簡単な反面、どのスレッドが次にロックを獲得できるかの保証がなく、運が悪いスレッドが長時間ロックを獲得できない「飢餓」が理論上起こりうる。チケットロックは、銀行や役所の窓口でおなじみの「整理券」の仕組みをそのままロックに応用することで、この公平性の問題を解決する。ロックを取得したいスレッドは、まずアトミックにインクリメントされる`next_ticket`という発券カウンタから自分の順番号(チケット)を1枚受け取る。そして、共有変数`now_serving`(現在対応中の番号)が自分のチケット番号と一致するまでスピン待機する。ロックを解放するスレッドは`now_serving`を1つ進めるだけでよく、これによって次の番号を持つスレッドが自動的に呼び出される。[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)と発想は似ているが、チケットロックはハードウェアのfetch-and-add命令1つで発券処理を完結できるため、実装がはるかに単純である。

## 仕組み

1. 共有変数として発券カウンタ`next_ticket`と、対応中の番号を表す`now_serving`を用意し、両方を0で初期化する
2. ロックを取得するとき、`next_ticket`をアトミックにインクリメントし、インクリメント前の値を自分の「チケット番号」として受け取る(このステップはfetch-and-add命令1つでアトミックに行える)
3. 自分のチケット番号と`now_serving`が一致するまでビジーウェイト(スピン)する
4. 一致したらクリティカルセクションに入り、資源を排他的に使用する
5. ロックを解放するとき、`now_serving`を1つインクリメントする。これにより次の番号を持つスレッドのスピンループが終了し、そのスレッドがクリティカルセクションに入る

## 特性・トレードオフ

- **計算量**: ロック取得のチケット発行自体はO(1)だが、自分の番より前に並んでいるスレッド数に比例した時間だけスピン待機する可能性がある
- **公平性**: 発券順(=ロック要求順)通りに必ずロックが渡されるため、厳密なFIFO順が保証され飢餓が起こらない
- **キャッシュライン競合という弱点**: 全スレッドが同じ`now_serving`という1つの共有変数を読み続けるため、ロック解放のたびに全待機スレッドのキャッシュラインが無効化される。待機スレッド数が増えるとキャッシュコヒーレンストラフィックがO(n)で増加し、[MCSロック](/algorithms/mcs-lock)のような各スレッドが専用のローカル変数だけをスピンするキューベースロックに比べてスケーラビリティで劣る
- **実装の単純さ**: 必要な共有状態が2つの整数だけであり、実装が非常にシンプルなためLinuxカーネルの初期のスピンロック実装などで採用されてきた
- **使いどころ**: 待機スレッド数が少数〜中程度で、公平性を重視する軽量ロックが必要な場面。大規模な並行度が想定される場面では[MCSロック](/algorithms/mcs-lock)や[CLHロック](/algorithms/clh-lock)のようなキューベースロックが好まれる

## 実装例

```python
import threading


class TicketLock:
    def __init__(self) -> None:
        self._next_ticket = 0
        self._now_serving = 0
        # カウンタのインクリメントをアトミックにするための内部ロック(実機ではfetch-and-add命令1つで代替)
        self._counter_lock = threading.Lock()

    def acquire(self) -> int:
        with self._counter_lock:
            my_ticket = self._next_ticket
            self._next_ticket += 1
        while self._now_serving != my_ticket:
            pass  # 自分の番号が呼ばれるまでスピン待機
        return my_ticket

    def release(self) -> None:
        self._now_serving += 1
```

```typescript
class TicketLock {
  private nextTicket = 0;
  private nowServing = 0;

  // 発券処理: 実機ではfetch-and-add命令1つでアトミックに行われる
  private drawTicket(): number {
    const ticket = this.nextTicket;
    this.nextTicket += 1;
    return ticket;
  }

  acquire(): number {
    const myTicket = this.drawTicket();
    while (this.nowServing !== myTicket) {
      // 自分の番号が呼ばれるまでスピン待機
    }
    return myTicket;
  }

  release(): void {
    this.nowServing += 1;
  }
}
```
