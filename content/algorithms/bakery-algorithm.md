---
name: Lamportのベーカリーアルゴリズム
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(n)(1回の臨界区間への出入りあたり、n参加プロセス数)
summary: パン屋の整理券のように各プロセスが番号札を取り、番号の小さい順に臨界区間へ入ることを保証する、任意の数のプロセスに対応した相互排他アルゴリズム。
---

## 概要

[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)は2プロセス間の相互排他を美しく解決するが、3つ以上の任意の数のプロセスに一般化するのは自明ではない。1974年にレスリー・ランポートが発表したベーカリーアルゴリズムは、パン屋(ベーカリー)のレジで客が整理券(番号札)を取り、番号の小さい順に呼ばれるのを待つ、という日常的な仕組みをそのままソフトウェアの相互排他に応用した。専用のハードウェア命令を使わずに、任意の数のプロセスに対して相互排他を保証できる、拡張性の高いアルゴリズムである。

## 仕組み

1. 各プロセス`i`に対して、`choosing[i]`(現在番号を選んでいる最中かを示すフラグ)と`number[i]`(そのプロセスが持つ整理券の番号)という2つの共有配列を用意する
2. プロセス`i`が臨界区間に入りたいとき、まず`choosing[i] = true`とし、現在の全プロセスの`number`の最大値より1大きい番号を自分の`number[i]`として設定する。設定が終わったら`choosing[i] = false`に戻す
3. 他の全プロセス`j`について、まず`choosing[j]`が`false`になるまで待つ(相手が番号を選び終えるのを待つ、番号の比較が整合的に行われることを保証するため)
4. 次に、相手`j`が現在チケットを持っている(`number[j] != 0`)なら、自分の番号`(number[i], i)`と相手の番号`(number[j], j)`を辞書式順序で比較する(番号が同じ場合はプロセスIDの小さい方を優先する、という決め方で必ず順序が一意に定まるようにする)
5. 全ての他プロセスに対して「自分の番号の方が小さい(=先に呼ばれるべき)」ことが確認できたら、臨界区間へ入る。臨界区間を出るときは`number[i] = 0`にリセットする

## 特性・トレードオフ

- **計算量**: 1回の臨界区間への出入りで、他の全`n-1`プロセスの番号と比較する必要があるため`O(n)`。プロセス数が多いと[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)よりコストがかかるが、任意の`n`に対応できる汎用性を得ている
- **公平性(FIFO性)の保証**: 番号の小さい順に必ず臨界区間へ入れることが保証されるため、特定のプロセスだけが不当に待たされ続ける「餓死(starvation)」が起こらない——これは相互排他の正しさに加えて、実用上非常に重要な公平性の性質である
- **番号の重複と`choosing`フラグの役割**: 複数のプロセスがほぼ同時に番号を読み取ると、同じ番号を選んでしまうことがある(番号の割り当て自体はアトミックではない)。`choosing`フラグによって「番号を選んでいる最中の他プロセスがいれば待つ」ことで、この一時的な不整合が比較の結果に影響しないようにしている
- **使いどころ**: 分散システムにおける相互排他アルゴリズムの理論的基盤、[分散システム](/algorithms/raft)の合意形成プロトコルの前提となる基礎概念の理解、任意台数のプロセスが関わる同期問題の教育的な事例。実務では[Compare-and-Swap(CAS)によるロックフリー構造](/algorithms/lock-free-stack-cas)のようなハードウェアサポートを使う手法の方が高速なため直接使われることは少ないが、その理論的重要性は今も高い

## 実装例

```python
class Bakery:
    def __init__(self, n: int):
        self.n = n
        self.choosing = [False] * n
        self.number = [0] * n

    def lock(self, i: int) -> None:
        self.choosing[i] = True
        self.number[i] = max(self.number) + 1
        self.choosing[i] = False
        for j in range(self.n):
            if j == i:
                continue
            while self.choosing[j]:
                pass  # 相手が番号選択中なら待つ
            while self.number[j] != 0 and (self.number[j], j) < (self.number[i], i):
                pass  # 相手の番号の方が若ければ待つ

    def unlock(self, i: int) -> None:
        self.number[i] = 0
```

```typescript
class Bakery {
  private n: number;
  choosing: boolean[];
  number: number[];

  constructor(n: number) {
    this.n = n;
    this.choosing = new Array(n).fill(false);
    this.number = new Array(n).fill(0);
  }

  lock(i: number): void {
    this.choosing[i] = true;
    this.number[i] = Math.max(...this.number) + 1;
    this.choosing[i] = false;
    for (let j = 0; j < this.n; j++) {
      if (j === i) continue;
      while (this.choosing[j]) {
        /* 相手が番号選択中なら待つ */
      }
      while (this.number[j] !== 0 && (this.number[j] < this.number[i] || (this.number[j] === this.number[i] && j < i))) {
        /* 相手の番号の方が若ければ待つ */
      }
    }
  }

  unlock(i: number): void {
    this.number[i] = 0;
  }
}
```

```cpp
#include <algorithm>
#include <atomic>
#include <vector>

class Bakery {
public:
    explicit Bakery(int n) : n_(n), choosing_(n), number_(n) {
        for (int i = 0; i < n; i++) {
            choosing_[i] = false;
            number_[i] = 0;
        }
    }

    void lock(int i) {
        choosing_[i].store(true, std::memory_order_seq_cst);
        int maxNumber = 0;
        for (int j = 0; j < n_; j++) maxNumber = std::max(maxNumber, number_[j].load(std::memory_order_seq_cst));
        number_[i].store(maxNumber + 1, std::memory_order_seq_cst);
        choosing_[i].store(false, std::memory_order_seq_cst);

        for (int j = 0; j < n_; j++) {
            if (j == i) continue;
            while (choosing_[j].load(std::memory_order_seq_cst)) {
                // 相手が番号選択中なら待つ
            }
            while (true) {
                int numJ = number_[j].load(std::memory_order_seq_cst);
                int numI = number_[i].load(std::memory_order_seq_cst);
                if (numJ == 0) break;
                if (numJ > numI || (numJ == numI && j >= i)) break;
                // 相手の番号の方が若ければ待つ
            }
        }
    }

    void unlock(int i) { number_[i].store(0, std::memory_order_seq_cst); }

private:
    int n_;
    std::vector<std::atomic<bool>> choosing_;
    std::vector<std::atomic<int>> number_;
};
```

```rust
use std::sync::atomic::{AtomicBool, AtomicI32, Ordering};

struct Bakery {
    n: usize,
    choosing: Vec<AtomicBool>,
    number: Vec<AtomicI32>,
}

impl Bakery {
    fn new(n: usize) -> Self {
        Bakery {
            n,
            choosing: (0..n).map(|_| AtomicBool::new(false)).collect(),
            number: (0..n).map(|_| AtomicI32::new(0)).collect(),
        }
    }

    fn lock(&self, i: usize) {
        self.choosing[i].store(true, Ordering::SeqCst);
        let max_number = self.number.iter().map(|x| x.load(Ordering::SeqCst)).max().unwrap_or(0);
        self.number[i].store(max_number + 1, Ordering::SeqCst);
        self.choosing[i].store(false, Ordering::SeqCst);

        for j in 0..self.n {
            if j == i {
                continue;
            }
            while self.choosing[j].load(Ordering::SeqCst) {
                // 相手が番号選択中なら待つ
            }
            loop {
                let num_j = self.number[j].load(Ordering::SeqCst);
                let num_i = self.number[i].load(Ordering::SeqCst);
                if num_j == 0 {
                    break;
                }
                if num_j > num_i || (num_j == num_i && j >= i) {
                    break;
                }
                // 相手の番号の方が若ければ待つ
            }
        }
    }

    fn unlock(&self, i: usize) {
        self.number[i].store(0, Ordering::SeqCst);
    }
}
```

```csharp
class Bakery
{
    private readonly int _n;
    public volatile bool[] Choosing;
    public volatile int[] Number;

    public Bakery(int n) { _n = n; Choosing = new bool[n]; Number = new int[n]; }

    public void Lock(int i)
    {
        Choosing[i] = true;
        Number[i] = Number.Max() + 1;
        Choosing[i] = false;
        for (int j = 0; j < _n; j++)
        {
            if (j == i) continue;
            while (Choosing[j]) { Thread.SpinWait(1); } // 相手が番号選択中なら待つ
            while (Number[j] != 0 && (Number[j] < Number[i] || (Number[j] == Number[i] && j < i)))
            {
                Thread.SpinWait(1); // 相手の番号の方が若ければ待つ
            }
        }
    }

    public void Unlock(int i) { Number[i] = 0; }
}
```
