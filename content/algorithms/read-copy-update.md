---
name: RCU(Read-Copy-Update)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(1)(読み取り)、O(データサイズ)(更新時のコピー)
summary: 読み取りスレッドには一切の同期コストを課さず、更新は「新しいコピーを作って公開してから、誰も古い版を参照していないことを確認して解放する」という手順で行うことで、読み取りが極めて多いワークロードに特化した並行制御を実現する。
---

## 概要

[ハザードポインタ](/algorithms/hazard-pointers)はスレッドが「今アクセス中」を明示的に宣言することで安全なメモリ回収を実現したが、この宣言自体にわずかなコストがかかる。RCU(Read-Copy-Update)は、Linuxカーネルで広く使われている同期機構で、**読み取りが圧倒的に多く、書き込みが稀なワークロード**に特化した発想を取る——読み取りスレッドは**ロックも、ハザードポインタの宣言も一切行わずに**、ポインタを辿ってデータへアクセスするだけでよい。更新したいスレッドは、データ構造を直接書き換えるのではなく、**新しいコピーを作って変更を加え、そのコピーへのポインタをアトミックに差し替えることで公開する**。古いバージョンのデータは、既にそれを読み始めているかもしれない読み取りスレッドが読み終わるのを待つ「猶予期間(グレースピリオド)」を経てから、安全に解放される。

## 仕組み

1. データ構造への参照は、常に1つの共有ポインタ`ptr`を通してアクセスする
2. **読み取り側**: スレッドは`ptr`を1回読み、それが指すデータ構造をそのまま辿って読み取る。ロックの取得もハザードポインタの宣言も不要——ただしこの区間を「RCU読み取りクリティカルセクション」として、システムに暗黙的に知らせておく必要がある(多くの実装ではスレッドローカルなカウンタや、CPUごとの実行状態の記録で、暗黙的に管理される)
3. **更新側**: 元のデータ構造の**コピー**を作り、そのコピーに変更を加える。変更が終わったら、共有ポインタ`ptr`を**アトミックに(1回の操作で)** 新しいコピーへ差し替える。この瞬間から、新たに読み取りを始めるスレッドは全て新しいバージョンを見るようになる
4. 古いバージョンのデータはまだ即座には解放しない——**差し替え前から読み取りを続けていたスレッドが、そのクリティカルセクションを抜けるまで**、古いバージョンを参照し続けている可能性があるためである
5. 更新側は、**全てのCPU(またはスレッド)が、差し替え前に開始した読み取りクリティカルセクションを抜けたことが保証されるまで待つ(グレースピリオドの経過を待つ)**。これが確認できたら、古いバージョンのデータを安全に解放する

## 特性・トレードオフ

- **読み取りコストがほぼゼロ**: RCUの最大の特徴は、読み取り側に同期のためのアトミック操作や明示的な宣言が一切不要な点にある。[ハザードポインタ](/algorithms/hazard-pointers)がスレッドごとにポインタを書き込む必要があるのに対し、RCUの読み取りは通常のポインタ参照とほぼ同じコストで済み、読み取りが支配的なワークロードでは劇的な性能向上をもたらす
- **更新コストとメモリオーバーヘッドの増加**: 更新のたびにデータ構造全体(または変更が及ぶ範囲)をコピーする必要があり、書き込みが頻繁なワークロードには向かない。またグレースピリオドが経過するまで古いバージョンと新しいバージョンの両方がメモリ上に共存するため、一時的なメモリ使用量が増える
- **[ハザードポインタ](/algorithms/hazard-pointers)との住み分け**: 両者とも「メモリをいつ安全に回収するか」という同じ問題に取り組むが、RCUは「時間(グレースピリオド)」ベースで判定し読み取りを極限まで軽くする設計、ハザードポインタは「明示的な追跡」ベースで判定し読み取りにわずかなコストを許容する設計、というアプローチの違いがある。読み取りが圧倒的に多い場面ではRCU、読み取り・書き込みのバランスが取れている場面ではハザードポインタが選ばれやすい
- **使いどころ**: Linuxカーネルのルーティングテーブル・プロセス管理データ構造(RCUが最も広く実用化されている場面)、読み取りが支配的な設定情報・キャッシュの並行アクセス、リアルタイム性が求められるシステムでの低レイテンシな読み取りアクセスの実現

## 実装例

```python
import threading
import time

class RcuProtected:
    def __init__(self, initial_data: dict):
        self._data = initial_data
        self._lock = threading.Lock()  # 更新側同士の排他制御のみに使う(読み取りには使わない)
        self._readers_in_section = 0
        self._readers_lock = threading.Lock()

    def read(self) -> dict:
        """読み取り側: 現在のスナップショットへの参照を取得するだけ(コピーもロックもしない)。"""
        with self._readers_lock:
            self._readers_in_section += 1
        try:
            return self._data
        finally:
            with self._readers_lock:
                self._readers_in_section -= 1

    def update(self, mutator) -> None:
        """更新側: コピーを作って変更し、猶予期間を待ってから差し替える。"""
        with self._lock:
            new_data = dict(self._data)  # コピーを作成
            mutator(new_data)
            old_data = self._data
            self._data = new_data  # アトミックな差し替え(公開)

            # 猶予期間: 読み取り中のスレッドがいなくなるまで待つ(簡略化した待機)
            while self._readers_in_section > 0:
                time.sleep(0.001)
            del old_data  # 古いバージョンを安全に解放
```

```typescript
class RcuProtected<T extends object> {
  private data: T;
  private readersInSection = 0;

  constructor(initialData: T) {
    this.data = initialData;
  }

  read(): T {
    this.readersInSection++;
    try {
      return this.data;
    } finally {
      this.readersInSection--;
    }
  }

  async update(mutator: (copy: T) => void): Promise<void> {
    const newData = { ...this.data };
    mutator(newData);
    this.data = newData; // 差し替え(公開)

    while (this.readersInSection > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    // 古いバージョンはガベージコレクションに委ねる
  }
}
```

```cpp
#include <atomic>
#include <memory>
#include <thread>
#include <chrono>

template <typename T>
class RcuProtected {
    std::atomic<std::shared_ptr<T>> data;
    std::atomic<int> readersInSection{0};

public:
    explicit RcuProtected(std::shared_ptr<T> initial) : data(initial) {}

    std::shared_ptr<T> read() {
        readersInSection.fetch_add(1);
        auto snapshot = data.load();
        readersInSection.fetch_sub(1);
        return snapshot;
    }

    template <typename Mutator>
    void update(Mutator mutator) {
        auto oldData = data.load();
        auto newData = std::make_shared<T>(*oldData);
        mutator(*newData);
        data.store(newData);

        while (readersInSection.load() > 0) {
            std::this_thread::sleep_for(std::chrono::microseconds(100));
        }
        // oldDataはshared_ptrの参照カウントが0になった時点で自動解放される
    }
};
```

```rust
use std::sync::atomic::{AtomicI32, AtomicPtr, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

struct RcuProtected<T> {
    data: AtomicPtr<Arc<T>>,
    readers_in_section: AtomicI32,
}

impl<T: Clone> RcuProtected<T> {
    fn read(&self) -> Arc<T> {
        self.readers_in_section.fetch_add(1, Ordering::SeqCst);
        let ptr = self.data.load(Ordering::SeqCst);
        let snapshot = unsafe { (*ptr).clone() };
        self.readers_in_section.fetch_sub(1, Ordering::SeqCst);
        snapshot
    }

    fn update(&self, mutator: impl FnOnce(&mut T)) {
        let old_ptr = self.data.load(Ordering::SeqCst);
        let mut new_data = unsafe { (*(*old_ptr)).clone() };
        mutator(&mut new_data);
        let new_arc = Box::into_raw(Box::new(Arc::new(new_data)));
        self.data.store(new_arc, Ordering::SeqCst);

        while self.readers_in_section.load(Ordering::SeqCst) > 0 {
            thread::sleep(Duration::from_micros(100));
        }
    }
}
```

```csharp
using System.Collections.Concurrent;

class RcuProtected<T> where T : class
{
    volatile T data;
    int readersInSection = 0;

    public RcuProtected(T initialData)
    {
        data = initialData;
    }

    public T Read()
    {
        Interlocked.Increment(ref readersInSection);
        try
        {
            return data;
        }
        finally
        {
            Interlocked.Decrement(ref readersInSection);
        }
    }

    public void Update(Action<T> mutator, Func<T, T> cloneFn)
    {
        var newData = cloneFn(data);
        mutator(newData);
        data = newData; // 差し替え(公開)

        while (Volatile.Read(ref readersInSection) > 0)
        {
            Thread.Sleep(1);
        }
    }
}
```
