---
name: セマフォによる生産者消費者問題
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回の生成・消費操作あたり)
summary: 有限サイズのバッファを共有する生産者と消費者のスレッド群を、3種類のセマフォ(空き数・詰まり数・排他制御)の組み合わせだけで安全かつ効率的に同期させる古典的な並行処理パターン。
---

## 概要

データを生成する「生産者」スレッドと、それを消費する「消費者」スレッドが、有限サイズのバッファ(キュー)を介して協調動作する状況は、実務のソフトウェアで非常に頻繁に現れる(ログの書き込みと出力、動画のエンコードとネットワーク送信など)。バッファが満杯のときに生産者が待たされ、空のときに消費者が待たされる必要があるが、この待機と再開のタイミングを正しく管理しないと、データの欠落・重複や、[食事する哲学者の問題](/algorithms/dining-philosophers)のようなデッドロックが発生しうる。1965年にダイクストラが導入したセマフォ(整数カウンタに対するP操作(デクリメントし、0未満ならブロックして待つ)とV操作(インクリメントし、待っているプロセスがあれば1つ起こす)の2つの操作だけを持つ同期プリミティブ)を3つ組み合わせることで、この問題をエレガントに解決できる。

## 仕組み

1. 3つのセマフォを用意する: `empty`(バッファの空きスロット数、初期値はバッファサイズ`n`)、`full`(バッファに詰まっているデータの数、初期値0)、`mutex`(バッファ操作自体の排他制御用、初期値1)
2. **生産者**は、データを1つ作るたびに次の手順を踏む: (a) `empty`をP操作(空きスロットを1つ確保、空きがなければブロックして待つ)、(b) `mutex`をP操作(バッファへの排他アクセス権を取得)、(c) バッファにデータを追加する、(d) `mutex`をV操作(排他アクセス権を解放)、(e) `full`をV操作(詰まっているデータが1つ増えたことを通知し、待っている消費者を起こす)
3. **消費者**は対称的な手順を踏む: (a) `full`をP操作(データが1つあることを確認、なければブロックして待つ)、(b) `mutex`をP操作、(c) バッファからデータを1つ取り出す、(d) `mutex`をV操作、(e) `empty`をV操作(空きスロットが1つ増えたことを通知し、待っている生産者を起こす)
4. `empty`と`full`のP操作が、それぞれ「空きがなければ生産者を待たせる」「データがなければ消費者を待たせる」という条件同期の役割を果たし、`mutex`がバッファへの同時アクセスによるデータ破損を防ぐ役割を分担している

## 特性・トレードオフ

- **計算量**: 各生成・消費操作がセマフォの定数回の操作で完結するため`O(1)`。ビジーウェイト(条件をループで確認し続ける)ではなく、OSのスケジューラによってブロック・再開が管理されるため、[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)のようなスピンロックよりCPU資源を無駄にしない
- **`mutex`の獲得順序に注意が必要**: `empty`(または`full`)のP操作を`mutex`のP操作より**先に**行う必要がある——順序を間違えて`mutex`を先に獲得すると、バッファが満杯で`empty`が0のときに`mutex`を保持したままブロックしてしまい、消費者が`mutex`を獲得できずデッドロックに陥る
- **条件同期と排他制御の分離という設計の美しさ**: 「何かが起こるまで待つ」(条件同期、`empty`/`full`)と「同時に触らせない」(排他制御、`mutex`)という、性質の異なる2つの同期の目的を、同じセマフォという道具立てで、しかし役割を明確に分けて組み合わせている点が、このパターンの教育的価値を高めている
- **使いどころ**: マルチスレッドプログラムにおけるプロデューサー・コンシューマーキューの実装(ロギングシステム、タスクキュー、ストリーミング処理のバッファリング)、OSのI/Oバッファ管理、[MapReduce](/algorithms/mapreduce)のようなデータ並列処理フレームワークにおけるステージ間のデータ受け渡し

## 実装例

[ピーターソンのアルゴリズム](/algorithms/petersons-algorithm)と同様、実スレッドではなく生産者・消費者それぞれを小さな状態機械として表現し、スケジューラが1ステップずつ交互に進める決定論的シミュレーションで検証する。`empty`/`full`/`mutex`の3セマフォがバッファサイズを一度も超えず(オーバーフロー)、空バッファから取り出すこともない(アンダーフロー)ことをアサーションで確認する。

```python
class Semaphore:
    def __init__(self, value: int) -> None:
        self.value = value

    def try_acquire(self) -> bool:
        if self.value > 0:
            self.value -= 1
            return True
        return False

    def release(self) -> None:
        self.value += 1


P_EMPTY, P_MUTEX, P_ADD, P_VMUTEX, P_VFULL, P_DONE = range(6)
C_FULL, C_MUTEX, C_REMOVE, C_VMUTEX, C_VEMPTY, C_DONE = range(6)


class Producer:
    def __init__(self, items: list[str]) -> None:
        self.items = list(items)
        self.state = P_EMPTY
        self.produced: list[str] = []

    def step(self, buf, capacity, empty, full, mutex) -> None:
        if self.state == P_DONE:
            return
        if not self.items and self.state == P_EMPTY:
            self.state = P_DONE
            return
        if self.state == P_EMPTY:
            if empty.try_acquire():
                self.state = P_MUTEX
        elif self.state == P_MUTEX:
            if mutex.try_acquire():
                self.state = P_ADD
        elif self.state == P_ADD:
            item = self.items.pop(0)
            assert len(buf) < capacity, "buffer overflow!"
            buf.append(item)
            self.produced.append(item)
            self.state = P_VMUTEX
        elif self.state == P_VMUTEX:
            mutex.release()
            self.state = P_VFULL
        elif self.state == P_VFULL:
            full.release()
            self.state = P_EMPTY


class Consumer:
    def __init__(self, count: int) -> None:
        self.remaining = count
        self.state = C_FULL
        self.consumed: list[str] = []

    def step(self, buf, empty, full, mutex) -> None:
        if self.state == C_DONE:
            return
        if self.remaining == 0 and self.state == C_FULL:
            self.state = C_DONE
            return
        if self.state == C_FULL:
            if full.try_acquire():
                self.state = C_MUTEX
        elif self.state == C_MUTEX:
            if mutex.try_acquire():
                self.state = C_REMOVE
        elif self.state == C_REMOVE:
            assert len(buf) > 0, "buffer underflow!"
            item = buf.pop(0)
            self.consumed.append(item)
            self.remaining -= 1
            self.state = C_VMUTEX
        elif self.state == C_VMUTEX:
            mutex.release()
            self.state = C_VEMPTY
        elif self.state == C_VEMPTY:
            empty.release()
            self.state = C_FULL


def run_simulation(capacity, producer_items, consumer_count, schedule):
    buf: list[str] = []
    empty, full, mutex = Semaphore(capacity), Semaphore(0), Semaphore(1)
    producer = Producer(producer_items)
    consumer = Consumer(consumer_count)
    max_buf_len = 0

    idx = 0
    while producer.state != P_DONE or consumer.state != C_DONE:
        who = schedule[idx % len(schedule)]
        idx += 1
        if who == "prod" and producer.state != P_DONE:
            producer.step(buf, capacity, empty, full, mutex)
        elif who == "cons" and consumer.state != C_DONE:
            consumer.step(buf, empty, full, mutex)
        max_buf_len = max(max_buf_len, len(buf))

    assert max_buf_len <= capacity, f"buffer exceeded capacity: {max_buf_len} > {capacity}"
    return producer.produced, consumer.consumed
```

```typescript
class Semaphore {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  tryAcquire(): boolean {
    if (this.value > 0) {
      this.value--;
      return true;
    }
    return false;
  }
  release(): void {
    this.value++;
  }
}

const P_EMPTY = 0, P_MUTEX = 1, P_ADD = 2, P_VMUTEX = 3, P_VFULL = 4, P_DONE = 5;
const C_FULL = 0, C_MUTEX = 1, C_REMOVE = 2, C_VMUTEX = 3, C_VEMPTY = 4, C_DONE = 5;

class Producer {
  items: string[];
  state = P_EMPTY;
  produced: string[] = [];
  constructor(items: string[]) {
    this.items = [...items];
  }
  step(buf: string[], capacity: number, empty: Semaphore, full: Semaphore, mutex: Semaphore): void {
    if (this.state === P_DONE) return;
    if (this.items.length === 0 && this.state === P_EMPTY) {
      this.state = P_DONE;
      return;
    }
    if (this.state === P_EMPTY) {
      if (empty.tryAcquire()) this.state = P_MUTEX;
    } else if (this.state === P_MUTEX) {
      if (mutex.tryAcquire()) this.state = P_ADD;
    } else if (this.state === P_ADD) {
      const item = this.items.shift()!;
      if (buf.length >= capacity) throw new Error("buffer overflow!");
      buf.push(item);
      this.produced.push(item);
      this.state = P_VMUTEX;
    } else if (this.state === P_VMUTEX) {
      mutex.release();
      this.state = P_VFULL;
    } else if (this.state === P_VFULL) {
      full.release();
      this.state = P_EMPTY;
    }
  }
}

class Consumer {
  remaining: number;
  state = C_FULL;
  consumed: string[] = [];
  constructor(count: number) {
    this.remaining = count;
  }
  step(buf: string[], empty: Semaphore, full: Semaphore, mutex: Semaphore): void {
    if (this.state === C_DONE) return;
    if (this.remaining === 0 && this.state === C_FULL) {
      this.state = C_DONE;
      return;
    }
    if (this.state === C_FULL) {
      if (full.tryAcquire()) this.state = C_MUTEX;
    } else if (this.state === C_MUTEX) {
      if (mutex.tryAcquire()) this.state = C_REMOVE;
    } else if (this.state === C_REMOVE) {
      if (buf.length === 0) throw new Error("buffer underflow!");
      const item = buf.shift()!;
      this.consumed.push(item);
      this.remaining--;
      this.state = C_VMUTEX;
    } else if (this.state === C_VMUTEX) {
      mutex.release();
      this.state = C_VEMPTY;
    } else if (this.state === C_VEMPTY) {
      empty.release();
      this.state = C_FULL;
    }
  }
}

function runSimulation(
  capacity: number, producerItems: string[], consumerCount: number, schedule: string[]
): { produced: string[]; consumed: string[] } {
  const buf: string[] = [];
  const empty = new Semaphore(capacity);
  const full = new Semaphore(0);
  const mutex = new Semaphore(1);
  const producer = new Producer(producerItems);
  const consumer = new Consumer(consumerCount);
  let maxBufLen = 0;

  let idx = 0;
  while (producer.state !== P_DONE || consumer.state !== C_DONE) {
    const who = schedule[idx % schedule.length];
    idx++;
    if (who === "prod" && producer.state !== P_DONE) producer.step(buf, capacity, empty, full, mutex);
    else if (who === "cons" && consumer.state !== C_DONE) consumer.step(buf, empty, full, mutex);
    maxBufLen = Math.max(maxBufLen, buf.length);
  }
  if (maxBufLen > capacity) throw new Error("buffer exceeded capacity");
  return { produced: producer.produced, consumed: consumer.consumed };
}
```

```cpp
#include <vector>
#include <string>
#include <deque>
#include <stdexcept>
#include <algorithm>

class Semaphore {
public:
    int value;
    explicit Semaphore(int value) : value(value) {}
    bool tryAcquire() { if (value > 0) { value--; return true; } return false; }
    void release() { value++; }
};

enum PState { P_EMPTY, P_MUTEX, P_ADD, P_VMUTEX, P_VFULL, P_DONE };
enum CState { C_FULL, C_MUTEX, C_REMOVE, C_VMUTEX, C_VEMPTY, C_DONE };

struct Producer {
    std::deque<std::string> items;
    PState state = P_EMPTY;
    std::vector<std::string> produced;

    explicit Producer(const std::vector<std::string>& items) : items(items.begin(), items.end()) {}

    void step(std::vector<std::string>& buf, int capacity, Semaphore& empty, Semaphore& full, Semaphore& mutex) {
        if (state == P_DONE) return;
        if (items.empty() && state == P_EMPTY) { state = P_DONE; return; }
        if (state == P_EMPTY) { if (empty.tryAcquire()) state = P_MUTEX; }
        else if (state == P_MUTEX) { if (mutex.tryAcquire()) state = P_ADD; }
        else if (state == P_ADD) {
            std::string item = items.front(); items.pop_front();
            if (static_cast<int>(buf.size()) >= capacity) throw std::runtime_error("buffer overflow!");
            buf.push_back(item);
            produced.push_back(item);
            state = P_VMUTEX;
        } else if (state == P_VMUTEX) { mutex.release(); state = P_VFULL; }
        else if (state == P_VFULL) { full.release(); state = P_EMPTY; }
    }
};

struct Consumer {
    int remaining;
    CState state = C_FULL;
    std::vector<std::string> consumed;

    explicit Consumer(int count) : remaining(count) {}

    void step(std::vector<std::string>& buf, Semaphore& empty, Semaphore& full, Semaphore& mutex) {
        if (state == C_DONE) return;
        if (remaining == 0 && state == C_FULL) { state = C_DONE; return; }
        if (state == C_FULL) { if (full.tryAcquire()) state = C_MUTEX; }
        else if (state == C_MUTEX) { if (mutex.tryAcquire()) state = C_REMOVE; }
        else if (state == C_REMOVE) {
            if (buf.empty()) throw std::runtime_error("buffer underflow!");
            std::string item = buf.front();
            buf.erase(buf.begin());
            consumed.push_back(item);
            remaining--;
            state = C_VMUTEX;
        } else if (state == C_VMUTEX) { mutex.release(); state = C_VEMPTY; }
        else if (state == C_VEMPTY) { empty.release(); state = C_FULL; }
    }
};

std::pair<std::vector<std::string>, std::vector<std::string>> runSimulation(
    int capacity, const std::vector<std::string>& producerItems, int consumerCount, const std::vector<std::string>& schedule) {
    std::vector<std::string> buf;
    Semaphore empty(capacity), full(0), mutex(1);
    Producer producer(producerItems);
    Consumer consumer(consumerCount);
    size_t maxBufLen = 0;
    size_t idx = 0;
    while (producer.state != P_DONE || consumer.state != C_DONE) {
        const std::string& who = schedule[idx % schedule.size()];
        idx++;
        if (who == "prod" && producer.state != P_DONE) producer.step(buf, capacity, empty, full, mutex);
        else if (who == "cons" && consumer.state != C_DONE) consumer.step(buf, empty, full, mutex);
        maxBufLen = std::max(maxBufLen, buf.size());
    }
    if (maxBufLen > static_cast<size_t>(capacity)) throw std::runtime_error("buffer exceeded capacity");
    return {producer.produced, consumer.consumed};
}
```

```rust
struct Semaphore {
    value: i32,
}

impl Semaphore {
    fn new(value: i32) -> Self {
        Semaphore { value }
    }
    fn try_acquire(&mut self) -> bool {
        if self.value > 0 {
            self.value -= 1;
            true
        } else {
            false
        }
    }
    fn release(&mut self) {
        self.value += 1;
    }
}

#[derive(PartialEq, Clone, Copy)]
enum PState { Empty, Mutex, Add, VMutex, VFull, Done }
#[derive(PartialEq, Clone, Copy)]
enum CState { Full, Mutex, Remove, VMutex, VEmpty, Done }

struct Producer {
    items: std::collections::VecDeque<String>,
    state: PState,
    produced: Vec<String>,
}

impl Producer {
    fn new(items: Vec<String>) -> Self {
        Producer { items: items.into(), state: PState::Empty, produced: Vec::new() }
    }

    fn step(&mut self, buf: &mut Vec<String>, capacity: usize, empty: &mut Semaphore, full: &mut Semaphore, mutex: &mut Semaphore) {
        match self.state {
            PState::Done => {}
            PState::Empty if self.items.is_empty() => self.state = PState::Done,
            PState::Empty => {
                if empty.try_acquire() {
                    self.state = PState::Mutex;
                }
            }
            PState::Mutex => {
                if mutex.try_acquire() {
                    self.state = PState::Add;
                }
            }
            PState::Add => {
                let item = self.items.pop_front().unwrap();
                assert!(buf.len() < capacity, "buffer overflow!");
                buf.push(item.clone());
                self.produced.push(item);
                self.state = PState::VMutex;
            }
            PState::VMutex => {
                mutex.release();
                self.state = PState::VFull;
            }
            PState::VFull => {
                full.release();
                self.state = PState::Empty;
            }
        }
    }
}

struct Consumer {
    remaining: i32,
    state: CState,
    consumed: Vec<String>,
}

impl Consumer {
    fn new(count: i32) -> Self {
        Consumer { remaining: count, state: CState::Full, consumed: Vec::new() }
    }

    fn step(&mut self, buf: &mut Vec<String>, empty: &mut Semaphore, full: &mut Semaphore, mutex: &mut Semaphore) {
        match self.state {
            CState::Done => {}
            CState::Full if self.remaining == 0 => self.state = CState::Done,
            CState::Full => {
                if full.try_acquire() {
                    self.state = CState::Mutex;
                }
            }
            CState::Mutex => {
                if mutex.try_acquire() {
                    self.state = CState::Remove;
                }
            }
            CState::Remove => {
                assert!(!buf.is_empty(), "buffer underflow!");
                let item = buf.remove(0);
                self.consumed.push(item);
                self.remaining -= 1;
                self.state = CState::VMutex;
            }
            CState::VMutex => {
                mutex.release();
                self.state = CState::VEmpty;
            }
            CState::VEmpty => {
                empty.release();
                self.state = CState::Full;
            }
        }
    }
}

fn run_simulation(
    capacity: usize, producer_items: Vec<String>, consumer_count: i32, schedule: &[&str],
) -> (Vec<String>, Vec<String>) {
    let mut buf: Vec<String> = Vec::new();
    let mut empty = Semaphore::new(capacity as i32);
    let mut full = Semaphore::new(0);
    let mut mutex = Semaphore::new(1);
    let mut producer = Producer::new(producer_items);
    let mut consumer = Consumer::new(consumer_count);
    let mut max_buf_len = 0;

    let mut idx = 0;
    while producer.state != PState::Done || consumer.state != CState::Done {
        let who = schedule[idx % schedule.len()];
        idx += 1;
        if who == "prod" && producer.state != PState::Done {
            producer.step(&mut buf, capacity, &mut empty, &mut full, &mut mutex);
        } else if who == "cons" && consumer.state != CState::Done {
            consumer.step(&mut buf, &mut empty, &mut full, &mut mutex);
        }
        max_buf_len = max_buf_len.max(buf.len());
    }
    assert!(max_buf_len <= capacity, "buffer exceeded capacity");
    (producer.produced, consumer.consumed)
}
```

```csharp
class Semaphore
{
    public int Value;
    public Semaphore(int value) { Value = value; }
    public bool TryAcquire() { if (Value > 0) { Value--; return true; } return false; }
    public void Release() => Value++;
}

static class ProducerConsumer
{
    const int P_EMPTY = 0, P_MUTEX = 1, P_ADD = 2, P_VMUTEX = 3, P_VFULL = 4, P_DONE = 5;
    const int C_FULL = 0, C_MUTEX = 1, C_REMOVE = 2, C_VMUTEX = 3, C_VEMPTY = 4, C_DONE = 5;

    class Producer
    {
        public Queue<string> Items; public int State = P_EMPTY; public List<string> Produced = new();
        public Producer(List<string> items) { Items = new Queue<string>(items); }

        public void Step(List<string> buf, int capacity, Semaphore empty, Semaphore full, Semaphore mutex)
        {
            if (State == P_DONE) return;
            if (Items.Count == 0 && State == P_EMPTY) { State = P_DONE; return; }
            if (State == P_EMPTY) { if (empty.TryAcquire()) State = P_MUTEX; }
            else if (State == P_MUTEX) { if (mutex.TryAcquire()) State = P_ADD; }
            else if (State == P_ADD)
            {
                var item = Items.Dequeue();
                if (buf.Count >= capacity) throw new Exception("buffer overflow!");
                buf.Add(item); Produced.Add(item);
                State = P_VMUTEX;
            }
            else if (State == P_VMUTEX) { mutex.Release(); State = P_VFULL; }
            else if (State == P_VFULL) { full.Release(); State = P_EMPTY; }
        }
    }

    class Consumer
    {
        public int Remaining; public int State = C_FULL; public List<string> Consumed = new();
        public Consumer(int count) { Remaining = count; }

        public void Step(List<string> buf, Semaphore empty, Semaphore full, Semaphore mutex)
        {
            if (State == C_DONE) return;
            if (Remaining == 0 && State == C_FULL) { State = C_DONE; return; }
            if (State == C_FULL) { if (full.TryAcquire()) State = C_MUTEX; }
            else if (State == C_MUTEX) { if (mutex.TryAcquire()) State = C_REMOVE; }
            else if (State == C_REMOVE)
            {
                if (buf.Count == 0) throw new Exception("buffer underflow!");
                var item = buf[0]; buf.RemoveAt(0);
                Consumed.Add(item); Remaining--;
                State = C_VMUTEX;
            }
            else if (State == C_VMUTEX) { mutex.Release(); State = C_VEMPTY; }
            else if (State == C_VEMPTY) { empty.Release(); State = C_FULL; }
        }
    }

    public static (List<string> produced, List<string> consumed) RunSimulation(
        int capacity, List<string> producerItems, int consumerCount, List<string> schedule)
    {
        var buf = new List<string>();
        var empty = new Semaphore(capacity);
        var full = new Semaphore(0);
        var mutex = new Semaphore(1);
        var producer = new Producer(producerItems);
        var consumer = new Consumer(consumerCount);
        int maxBufLen = 0;
        int idx = 0;
        while (producer.State != P_DONE || consumer.State != C_DONE)
        {
            var who = schedule[idx % schedule.Count];
            idx++;
            if (who == "prod" && producer.State != P_DONE) producer.Step(buf, capacity, empty, full, mutex);
            else if (who == "cons" && consumer.State != C_DONE) consumer.Step(buf, empty, full, mutex);
            maxBufLen = Math.Max(maxBufLen, buf.Count);
        }
        if (maxBufLen > capacity) throw new Exception("buffer exceeded capacity");
        return (producer.Produced, consumer.Consumed);
    }
}
```
