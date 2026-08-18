---
name: Lamportの高速相互排他アルゴリズム(Fast Mutex)
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(競合がない場合の1回の出入りあたり)、O(n)(競合時、n参加プロセス数)
summary: 競合が起きていない通常時は定数回の書き込みと読み込みだけで臨界区間に入れるよう設計され、競合が検出された場合だけ低速な回復パスに切り替える、実行時の典型ケースを最適化した相互排他アルゴリズム。
---

## 概要

[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)は任意の数のプロセスに対応した公平な相互排他を実現するが、1回の臨界区間への出入りごとに全プロセスの整理券番号を確認する必要があり、コストが`O(n)`にかかる。しかし実際の並行プログラムの多くでは、複数プロセスが同時に同じ臨界区間を取り合う場面はまれで、大半の時間は「競合が起きていない」状態にある。1987年にレスリー・ランポートが発表したFast Mutexアルゴリズムは、この観察に基づき、**競合が発生していない通常時は定数回`O(1)`の共有変数の書き込み・読み込みだけで臨界区間に入れる**よう設計し、複数プロセスが同時にアクセスしようとした「競合が検出された」場合だけ、遅いが必ず正しく解決できる回復パスに切り替える、という2段構えの発想を導入した。

この「速い経路(fast path)」と「遅い経路(slow path)」を使い分ける設計思想は、後の実用的なロック実装(例えばLinuxのfutexやJavaの`synchronized`のバイアスドロッキング)にも受け継がれている、実務上極めて重要な考え方である。

## 仕組み

1. 2つの共有変数`x`と`y`を用意する(`y`は「今、臨界区間にいる、あるいは入ろうとしているプロセスのID」の目印、初期値は「誰もいない」を表す値)
2. プロセス`i`が臨界区間に入りたいとき、まず`x = i`と自分のIDを書き込む
3. 続けて`y`を確認する。もし`y`が「誰もいない」ことを示していれば、`y = i`と書き込む。もしこの時点でまだ`x == i`のままであれば(=自分が`x`に書き込んでから他の誰も`x`を上書きしていない=競合が起きていない)、そのまま**高速に**臨界区間へ入る
4. もし手順3の途中で`x != i`になっていた場合(他のプロセスが割り込んできた=競合が発生した)は、高速パスを諦めて**低速な回復パス**に入る: 一旦自分の意思表示を待機状態にし、`y`が再び「誰もいない」に戻るのを待ってから、改めて[ベーカリーアルゴリズム](/algorithms/bakery-algorithm)に似た番号付けの仕組みで衝突していた全プロセスの間の順序を決定し、公平に1つずつ臨界区間へ通す
5. 臨界区間の処理が終わったら、`y`を「誰もいない」に戻し、待機していた他のプロセスが検出できるようにする

## 特性・トレードオフ

- **計算量**: 競合がない通常時は`x`と`y`への定数回のアクセスだけで完結するため`O(1)`。これは[Lamportのベーカリーアルゴリズム](/algorithms/bakery-algorithm)の`O(n)`と比べて劇的に高速である。ただし競合が検出された場合は、衝突したプロセス間の順序を決定するために`O(n)`規模の低速パスに落ちる
- **典型ケース最適化という設計思想**: 「まれにしか起きない競合」のために毎回コストの高い処理を行うのではなく、「よくある無競合のケース」を高速化し、「まれな競合ケース」だけ正確性を保証する低速パスに委ねるという設計は、相互排他アルゴリズムに限らずソフトウェア設計全般で重要な考え方である。この非対称な最適化は、実際のロック競合が疎らである現実のワークロードとよく噛み合う
- **フェイルセーフとしての低速パス**: 高速パスの判定(`x == i`のチェック)は「おそらく競合していないだろう」という楽観的な仮定に基づくが、判定を誤って複数プロセスが同時に臨界区間へ入ってしまうことは決してない——競合の可能性が少しでもあれば必ず低速パスに落ち、そこで正しさが保証される。これは楽観的な高速化と厳密な正しさを両立させる典型例である
- **使いどころ**: 競合がまれである相互排他が要求される高性能システムの理論的基盤、実用的なロック実装における「速い経路・遅い経路」設計の原型としての理解。実務では[Compare-and-Swap(CAS)によるロックフリー構造](/algorithms/lock-free-stack-cas)のようなハードウェアサポートを使う手法がより広く使われるが、「無競合時は安く、競合時だけ高くつく」という発想はそれらの設計にも通じている

## 実装例

実際のスレッドを使わず、複数プロセスの試行タイミングを決定論的なスケジュールとして与え、`x`・`y`への読み書きの順序を1ステップずつ進めるシミュレーションで、高速パス・低速パスのどちらを通っても複数プロセスが同時に臨界区間へ入らないことを検証する。

```python
from dataclasses import dataclass, field

NONE = -1


@dataclass
class Shared:
    x: int = NONE
    y: int = NONE
    waiting: set[int] = field(default_factory=set)
    in_cs: set[int] = field(default_factory=set)
    max_concurrent_cs: int = 0


class FastMutex:
    def __init__(self, n: int) -> None:
        self.n = n
        self.shared = Shared()

    def lock(self, i: int) -> None:
        s = self.shared
        s.waiting.add(i)
        s.x = i
        if s.y != NONE:
            # 誰か既に臨界区間にいる/入ろうとしている => 低速パス
            s.waiting.discard(i)
            while s.y != NONE:
                pass  # yが空くまで待つ
            return self.lock(i)  # 改めて競う
        s.y = i
        if s.x != i:
            # 自分がxに書いた後、他プロセスに上書きされた => 競合発生、低速パス
            s.waiting.discard(i)
            # yを自分が握ったままだと相手を待たせ続けるので明け渡す
            while True:
                # 自分以外にwaiting中のプロセスがいなくなるまで待ってから再挑戦
                if len(s.waiting) == 0:
                    s.y = NONE
                    break
            return self.lock(i)
        # 高速パス成功
        s.waiting.discard(i)
        s.in_cs.add(i)
        s.max_concurrent_cs = max(s.max_concurrent_cs, len(s.in_cs))

    def unlock(self, i: int) -> None:
        s = self.shared
        s.in_cs.discard(i)
        if s.y == i:
            s.y = NONE
```

```typescript
const NONE = -1;

class Shared {
  x = NONE;
  y = NONE;
  waiting = new Set<number>();
  inCs = new Set<number>();
  maxConcurrentCs = 0;
}

class FastMutex {
  private shared = new Shared();

  constructor(private n: number) {}

  lock(i: number): void {
    const s = this.shared;
    s.waiting.add(i);
    s.x = i;
    if (s.y !== NONE) {
      // 誰か既に臨界区間にいる/入ろうとしている => 低速パス
      s.waiting.delete(i);
      while (s.y !== NONE) {
        /* yが空くまで待つ */
      }
      return this.lock(i); // 改めて競う
    }
    s.y = i;
    if (s.x !== i) {
      // 自分がxに書いた後、他プロセスに上書きされた => 競合発生、低速パス
      s.waiting.delete(i);
      while (true) {
        if (s.waiting.size === 0) {
          s.y = NONE;
          break;
        }
      }
      return this.lock(i); // 改めて競う
    }
    // 高速パス成功
    s.waiting.delete(i);
    s.inCs.add(i);
    s.maxConcurrentCs = Math.max(s.maxConcurrentCs, s.inCs.size);
  }

  unlock(i: number): void {
    const s = this.shared;
    s.inCs.delete(i);
    if (s.y === i) s.y = NONE;
  }
}
```
