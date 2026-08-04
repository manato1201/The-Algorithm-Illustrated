---
name: 読者・書込者問題
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(1)(1回の読み書きアクセスあたり)
summary: 複数の読み取り操作は同時に許しても安全だが、書き込み操作は他の全アクセスと排他する必要がある、という非対称な同時アクセス制御をセマフォとカウンタで実現する古典問題。
---

## 概要

[生産者消費者問題](/algorithms/producer-consumer-semaphore)のバッファ操作は、読み書きどちらの操作でも共有データへの排他アクセスが必要だったが、共有データベースやファイルシステムのように「複数の読み取りは同時に行っても安全(データが変化しないため矛盾しない)だが、書き込みは他のどんな操作(読み取りも書き込みも)とも同時に行ってはならない」という非対称な要件を持つ場面も多い。読者・書込者問題は、この「読み取り操作同士は並行実行を許すが、書き込みは完全に排他する」という、より緩やかで効率的な同時アクセス制御のパターンを定式化したものである。

## 仕組み

1. 共有カウンタ`readCount`(現在読み取り中のプロセス数)と、`mutex`(`readCount`自体を保護する排他制御用セマフォ)、`writeLock`(書き込み、および最初の読者・最後の読者が管理するセマフォ)を用意する
2. **読者**がデータにアクセスする際: (a) `mutex`のP操作、(b) `readCount`をインクリメントし、これが1になった(自分が最初の読者になった)場合のみ`writeLock`をP操作(書き込みをブロックする)、(c) `mutex`のV操作、(d) データを読み取る、(e) 読み終えたら`mutex`のP操作、`readCount`をデクリメントし、これが0になった(自分が最後の読者だった)場合のみ`writeLock`をV操作(書き込みのブロックを解除)、(f) `mutex`のV操作
3. **書込者**がデータにアクセスする際は単純に: `writeLock`のP操作でデータへの排他アクセス権を取得し、書き込みを行い、`writeLock`のV操作で解放する——読者が誰もいない、かつ他の書込者もいないときにだけ書き込みが許可される
4. 複数の読者が同時に`writeLock`を経由せず読み取りできる(最初の読者だけが書き込みをブロックし、最後の読者だけがブロックを解除する)のがこのパターンの核心で、読み取りの並行性を最大限に活かしている

## 特性・トレードオフ

- **計算量**: 読み書きいずれも定数回のセマフォ操作で済むため`O(1)`。素朴に全アクセスを完全排他する実装と比べ、読み取りが多いワークロードでは並行性が大幅に向上する
- **読者優先版の書込者の餓死問題**: 上記の素朴な実装(読者優先)は、読者が絶え間なく到着し続けると、書込者が永遠に`writeLock`を獲得できない「書込者の餓死」を引き起こす可能性がある。これを防ぐには、書込者が待っている間は新たな読者の参入をブロックする「書込者優先」版や、単純な到着順で公平性を保証する版など、複数の変種が考案されている
- **読者優先と書込者優先のトレードオフ**: 読者優先は読み取りのスループットを最大化するが書込者が待たされやすく、書込者優先は書き込みの反応性を保証するが読み取りのスループットが犠牲になる——どちらを選ぶかはワークロードの性質(読み取りが支配的か、書き込みの即時性が重要か)次第という設計判断になる
- **使いどころ**: データベースの行レベル・テーブルレベルロック、キャッシュシステムの並行アクセス制御、設定ファイルやメタデータのように「頻繁に読まれるが稀に更新される」共有リソースへのアクセス管理。多くのプログラミング言語の標準ライブラリが`ReadWriteLock`のような形でこのパターンを直接提供している

## 実装例

読者優先版の状態遷移を、`mutex`・`writeLock`セマフォの観測可能な効果(`read_count`と書き込みロック中フラグ)に集約した決定論的なモデルとして実装する。

```python
class ReaderWriterLock:
    def __init__(self):
        self.read_count = 0
        self.write_locked = False

    def start_read(self):
        if self.read_count == 0:
            # 最初の読者だけがwrite_lockを奪い合い、書込者をブロックする
            assert not self.write_locked, "invariant violated: read started while writer active"
            self.write_locked = True
        self.read_count += 1

    def end_read(self):
        self.read_count -= 1
        if self.read_count == 0:
            self.write_locked = False  # 最後の読者がwrite_lockを解放する

    def start_write(self):
        assert not self.write_locked, "cannot start write: lock held"
        assert self.read_count == 0, "cannot start write: readers active"
        self.write_locked = True

    def end_write(self):
        self.write_locked = False


def simulate(schedule):
    """schedule: [("R"|"W", "start"|"end", worker_id), ...] という決定論的な順序のイベント列"""
    lock = ReaderWriterLock()
    active_readers = set()
    active_writer = None
    for kind, action, wid in schedule:
        if kind == "R":
            if action == "start":
                lock.start_read()
                active_readers.add(wid)
            else:
                lock.end_read()
                active_readers.discard(wid)
        else:
            if action == "start":
                lock.start_write()
                active_writer = wid
            else:
                lock.end_write()
                active_writer = None
        if active_writer is not None:
            assert len(active_readers) == 0, "writer active concurrently with readers"
```

```typescript
class ReaderWriterLock {
  readCount = 0;
  writeLocked = false;

  startRead() {
    if (this.readCount === 0) {
      if (this.writeLocked)
        throw new Error("invariant violated: read started while writer active");
      this.writeLocked = true; // 最初の読者が書込者をブロックする
    }
    this.readCount += 1;
  }
  endRead() {
    this.readCount -= 1;
    if (this.readCount === 0) this.writeLocked = false; // 最後の読者がブロックを解除する
  }
  startWrite() {
    if (this.writeLocked) throw new Error("cannot start write: lock held");
    if (this.readCount !== 0)
      throw new Error("cannot start write: readers active");
    this.writeLocked = true;
  }
  endWrite() {
    this.writeLocked = false;
  }
}

type Event = ["R" | "W", "start" | "end", number];

function simulate(schedule: Event[]) {
  const lock = new ReaderWriterLock();
  const activeReaders = new Set<number>();
  let activeWriter: number | null = null;
  for (const [kind, action, wid] of schedule) {
    if (kind === "R") {
      if (action === "start") {
        lock.startRead();
        activeReaders.add(wid);
      } else {
        lock.endRead();
        activeReaders.delete(wid);
      }
    } else {
      if (action === "start") {
        lock.startWrite();
        activeWriter = wid;
      } else {
        lock.endWrite();
        activeWriter = null;
      }
    }
    if (activeWriter !== null && activeReaders.size !== 0) {
      throw new Error("writer active concurrently with readers");
    }
  }
}
```

```cpp
#include <stdexcept>
#include <set>
#include <vector>
#include <string>

class ReaderWriterLock {
public:
    int readCount = 0;
    bool writeLocked = false;

    void startRead() {
        if (readCount == 0) {
            if (writeLocked) throw std::runtime_error("invariant violated: read started while writer active");
            writeLocked = true; // 最初の読者が書込者をブロックする
        }
        readCount++;
    }
    void endRead() {
        readCount--;
        if (readCount == 0) writeLocked = false; // 最後の読者がブロックを解除する
    }
    void startWrite() {
        if (writeLocked) throw std::runtime_error("cannot start write: lock held");
        if (readCount != 0) throw std::runtime_error("cannot start write: readers active");
        writeLocked = true;
    }
    void endWrite() { writeLocked = false; }
};

struct Event { char kind; std::string action; int wid; };

void simulate(const std::vector<Event>& schedule) {
    ReaderWriterLock lock;
    std::set<int> activeReaders;
    bool hasActiveWriter = false;

    for (auto& [kind, action, wid] : schedule) {
        if (kind == 'R') {
            if (action == "start") { lock.startRead(); activeReaders.insert(wid); }
            else { lock.endRead(); activeReaders.erase(wid); }
        } else {
            if (action == "start") { lock.startWrite(); hasActiveWriter = true; }
            else { lock.endWrite(); hasActiveWriter = false; }
        }
        if (hasActiveWriter && !activeReaders.empty())
            throw std::runtime_error("writer active concurrently with readers");
    }
}
```

```rust
use std::collections::HashSet;

struct ReaderWriterLock {
    read_count: i32,
    write_locked: bool,
}

impl ReaderWriterLock {
    fn new() -> Self {
        ReaderWriterLock { read_count: 0, write_locked: false }
    }
    fn start_read(&mut self) {
        if self.read_count == 0 {
            assert!(!self.write_locked, "invariant violated: read started while writer active");
            self.write_locked = true; // 最初の読者が書込者をブロックする
        }
        self.read_count += 1;
    }
    fn end_read(&mut self) {
        self.read_count -= 1;
        if self.read_count == 0 {
            self.write_locked = false; // 最後の読者がブロックを解除する
        }
    }
    fn start_write(&mut self) {
        assert!(!self.write_locked, "cannot start write: lock held");
        assert!(self.read_count == 0, "cannot start write: readers active");
        self.write_locked = true;
    }
    fn end_write(&mut self) {
        self.write_locked = false;
    }
}

enum Kind { Read, Write }
struct Event { kind: Kind, is_start: bool, wid: i32 }

fn simulate(schedule: &[Event]) {
    let mut lock = ReaderWriterLock::new();
    let mut active_readers: HashSet<i32> = HashSet::new();
    let mut active_writer: Option<i32> = None;

    for ev in schedule {
        match ev.kind {
            Kind::Read => {
                if ev.is_start {
                    lock.start_read();
                    active_readers.insert(ev.wid);
                } else {
                    lock.end_read();
                    active_readers.remove(&ev.wid);
                }
            }
            Kind::Write => {
                if ev.is_start {
                    lock.start_write();
                    active_writer = Some(ev.wid);
                } else {
                    lock.end_write();
                    active_writer = None;
                }
            }
        }
        if active_writer.is_some() {
            assert!(active_readers.is_empty(), "writer active concurrently with readers");
        }
    }
}
```

```csharp
using System;
using System.Collections.Generic;

class ReaderWriterLock
{
    public int ReadCount = 0;
    public bool WriteLocked = false;

    public void StartRead()
    {
        if (ReadCount == 0)
        {
            if (WriteLocked) throw new InvalidOperationException("invariant violated: read started while writer active");
            WriteLocked = true; // 最初の読者が書込者をブロックする
        }
        ReadCount++;
    }
    public void EndRead()
    {
        ReadCount--;
        if (ReadCount == 0) WriteLocked = false; // 最後の読者がブロックを解除する
    }
    public void StartWrite()
    {
        if (WriteLocked) throw new InvalidOperationException("cannot start write: lock held");
        if (ReadCount != 0) throw new InvalidOperationException("cannot start write: readers active");
        WriteLocked = true;
    }
    public void EndWrite() { WriteLocked = false; }
}

static class ReadersWriters
{
    public static void Simulate(List<(char Kind, string Action, int Wid)> schedule)
    {
        var lockObj = new ReaderWriterLock();
        var activeReaders = new HashSet<int>();
        int? activeWriter = null;

        foreach (var (kind, action, wid) in schedule)
        {
            if (kind == 'R')
            {
                if (action == "start") { lockObj.StartRead(); activeReaders.Add(wid); }
                else { lockObj.EndRead(); activeReaders.Remove(wid); }
            }
            else
            {
                if (action == "start") { lockObj.StartWrite(); activeWriter = wid; }
                else { lockObj.EndWrite(); activeWriter = null; }
            }
            if (activeWriter != null && activeReaders.Count != 0)
                throw new InvalidOperationException("writer active concurrently with readers");
        }
    }
}
```
