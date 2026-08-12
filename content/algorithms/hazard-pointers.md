---
name: ハザードポインタ(ロックフリーメモリ回収)
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(スレッド数)(1回の回収判定あたり)
summary: あるスレッドが今まさにアクセス中のノードを「ハザードポインタ」として宣言・公開し、他のスレッドはノードを解放する前に全スレッドのハザードポインタと照合することで、ロックなしに安全なメモリ回収を実現する。
---

## 概要

[ロックフリースタック](/algorithms/lock-free-stack-cas)や[Michael-Scottキュー](/algorithms/michael-scott-queue)のようなロックフリーデータ構造では、あるスレッドがノードを削除(スタックからpop、キューからdequeue)した後、そのメモリをいつ安全に解放してよいかという問題が残る——**削除された瞬間、別のスレッドがまだそのノードを読んでいる最中かもしれない**ため、即座に解放すると、そのスレッドが解放済みメモリにアクセスしてしまう(use-after-free)。ロックを使えばこの問題は「削除中は他のスレッドを待たせる」ことで簡単に避けられるが、それではロックフリーの利点が失われてしまう。ハザードポインタは、マグド・ミカエルが2004年に提案した手法で、**各スレッドが「今アクセス中のノードへのポインタ」を、他の全スレッドから見える共有領域に明示的に公開(宣言)しておく**ことで、ノードを解放する前に「誰かがハザードポインタとしてまだ指しているか」を確認できるようにする。

## 仕組み

1. 各スレッドは、あらかじめ確保された**ハザードポインタスロット**(全スレッド分の配列やリスト)の中から、自分専用のスロットを1つ(またはアルゴリズムが必要とする数だけ)持つ
2. あるスレッドが共有データ構造のノード`p`にアクセスしようとする前に、自分のハザードポインタスロットに`p`を書き込む(「今から`p`を触るので、勝手に解放しないでほしい」という宣言)
3. ノードへのアクセスが終わったら、ハザードポインタスロットをクリアする(null に戻す)
4. あるスレッドが、データ構造からノード`q`を削除したとき、**即座に解放するのではなく**、削除したノードを「後で回収するリスト(Retire List)」に一時的に保持しておく
5. 定期的に(またはRetire Listが一定数溜まったタイミングで)、Retire List中の各ノードについて、**全スレッドのハザードポインタスロットを走査し**、そのノードを指しているスレッドが1つもなければ、そのノードは安全に解放できると判断して実際にメモリを解放する。まだどこかのスレッドのハザードポインタが指していれば、解放を先送りする

## 特性・トレードオフ

- **ロックを一切使わずに安全なメモリ回収を実現**: ガベージコレクションを持たない言語(C++、Rustなど)でロックフリーデータ構造を実装する際、ハザードポインタは「解放していいタイミング」を明示的な公開情報から機械的に判定できる、実用上重要な技法である
- **走査コストとメモリオーバーヘッド**: ノードを解放してよいか判定するために全スレッドのハザードポインタを走査する必要があり、スレッド数に比例したコストがかかる。またRetire Listに一時的に溜まったノードは実際にはまだメモリを占有し続けるため、即座に解放する場合に比べてメモリ使用量にオーバーヘッドが生じる
- **[Read-Copy-Update(RCU)](/algorithms/read-copy-update)との比較**: RCUも同様に「メモリをいつ安全に回収するか」という問題に取り組む技法だが、RCUは「猶予期間(グレースピリオド)」という時間ベースの仕組みで回収タイミングを判定するのに対し、ハザードポインタは「誰が今アクセス中か」を明示的なポインタで追跡する点が異なる。RCUは読み取りが極めて高速な代わりに書き込み側のコストが高く、ハザードポインタは逆に読み取り側に明示的な宣言のオーバーヘッドがある、というトレードオフの違いがある
- **使いどころ**: C++の`std::atomic`ベースのロックフリーデータ構造の実装(Boost.LockfreeやFacebookのFollyライブラリが採用)、リアルタイム性が求められる並行データ構造(ガベージコレクションの一時停止を避けたい場面)、[ロックフリースタック](/algorithms/lock-free-stack-cas)や[Michael-Scottキュー](/algorithms/michael-scott-queue)のような既存のロックフリー構造への実用的な拡張

## 実装例

```python
import threading

class HazardPointerManager:
    def __init__(self, max_threads: int):
        self.hazard_pointers: dict[int, object | None] = {}
        self.retire_lists: dict[int, list[object]] = {}
        self.lock = threading.Lock()

    def set_hazard(self, thread_id: int, node: object) -> None:
        with self.lock:
            self.hazard_pointers[thread_id] = node

    def clear_hazard(self, thread_id: int) -> None:
        with self.lock:
            self.hazard_pointers[thread_id] = None

    def retire(self, thread_id: int, node: object) -> None:
        with self.lock:
            self.retire_lists.setdefault(thread_id, []).append(node)

    def scan_and_reclaim(self, thread_id: int) -> list[object]:
        with self.lock:
            active_hazards = set(v for v in self.hazard_pointers.values() if v is not None)
            retire_list = self.retire_lists.get(thread_id, [])
            still_hazardous = [n for n in retire_list if n in active_hazards]
            reclaimed = [n for n in retire_list if n not in active_hazards]
            self.retire_lists[thread_id] = still_hazardous
            return reclaimed  # ここで実際のメモリ解放処理を行う
```

```typescript
class HazardPointerManager {
  private hazardPointers = new Map<number, unknown | null>();
  private retireLists = new Map<number, unknown[]>();

  setHazard(threadId: number, node: unknown): void {
    this.hazardPointers.set(threadId, node);
  }

  clearHazard(threadId: number): void {
    this.hazardPointers.set(threadId, null);
  }

  retire(threadId: number, node: unknown): void {
    const list = this.retireLists.get(threadId) ?? [];
    list.push(node);
    this.retireLists.set(threadId, list);
  }

  scanAndReclaim(threadId: number): unknown[] {
    const activeHazards = new Set(
      [...this.hazardPointers.values()].filter((v) => v !== null),
    );
    const retireList = this.retireLists.get(threadId) ?? [];
    const stillHazardous = retireList.filter((n) => activeHazards.has(n));
    const reclaimed = retireList.filter((n) => !activeHazards.has(n));
    this.retireLists.set(threadId, stillHazardous);
    return reclaimed;
  }
}
```

```cpp
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <mutex>

template <typename T>
class HazardPointerManager {
    std::unordered_map<int, T*> hazardPointers;
    std::unordered_map<int, std::vector<T*>> retireLists;
    std::mutex mtx;

public:
    void setHazard(int threadId, T* node) {
        std::lock_guard<std::mutex> lock(mtx);
        hazardPointers[threadId] = node;
    }

    void clearHazard(int threadId) {
        std::lock_guard<std::mutex> lock(mtx);
        hazardPointers[threadId] = nullptr;
    }

    void retire(int threadId, T* node) {
        std::lock_guard<std::mutex> lock(mtx);
        retireLists[threadId].push_back(node);
    }

    std::vector<T*> scanAndReclaim(int threadId) {
        std::lock_guard<std::mutex> lock(mtx);
        std::unordered_set<T*> activeHazards;
        for (auto& [id, ptr] : hazardPointers) if (ptr) activeHazards.insert(ptr);

        std::vector<T*> stillHazardous, reclaimed;
        for (T* node : retireLists[threadId]) {
            if (activeHazards.count(node)) stillHazardous.push_back(node);
            else reclaimed.push_back(node);
        }
        retireLists[threadId] = stillHazardous;
        return reclaimed;
    }
};
```

```rust
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

struct HazardPointerManager<T> {
    hazard_pointers: Mutex<HashMap<i32, Option<*const T>>>,
    retire_lists: Mutex<HashMap<i32, Vec<*const T>>>,
}

impl<T> HazardPointerManager<T> {
    fn set_hazard(&self, thread_id: i32, node: *const T) {
        self.hazard_pointers.lock().unwrap().insert(thread_id, Some(node));
    }

    fn clear_hazard(&self, thread_id: i32) {
        self.hazard_pointers.lock().unwrap().insert(thread_id, None);
    }

    fn retire(&self, thread_id: i32, node: *const T) {
        self.retire_lists.lock().unwrap().entry(thread_id).or_default().push(node);
    }

    fn scan_and_reclaim(&self, thread_id: i32) -> Vec<*const T> {
        let hazards = self.hazard_pointers.lock().unwrap();
        let active_hazards: HashSet<*const T> = hazards.values().filter_map(|v| *v).collect();

        let mut retire_lists = self.retire_lists.lock().unwrap();
        let retire_list = retire_lists.entry(thread_id).or_default();
        let (still_hazardous, reclaimed): (Vec<_>, Vec<_>) =
            retire_list.drain(..).partition(|n| active_hazards.contains(n));
        *retire_list = still_hazardous;
        reclaimed
    }
}
```

```csharp
class HazardPointerManager<T> where T : class
{
    Dictionary<int, T?> hazardPointers = new();
    Dictionary<int, List<T>> retireLists = new();
    readonly object lockObj = new();

    public void SetHazard(int threadId, T node)
    {
        lock (lockObj) hazardPointers[threadId] = node;
    }

    public void ClearHazard(int threadId)
    {
        lock (lockObj) hazardPointers[threadId] = null;
    }

    public void Retire(int threadId, T node)
    {
        lock (lockObj)
        {
            if (!retireLists.ContainsKey(threadId)) retireLists[threadId] = new List<T>();
            retireLists[threadId].Add(node);
        }
    }

    public List<T> ScanAndReclaim(int threadId)
    {
        lock (lockObj)
        {
            var activeHazards = new HashSet<T>(hazardPointers.Values.Where(v => v != null)!);
            var retireList = retireLists.GetValueOrDefault(threadId, new List<T>());
            var stillHazardous = retireList.Where(n => activeHazards.Contains(n)).ToList();
            var reclaimed = retireList.Where(n => !activeHazards.Contains(n)).ToList();
            retireLists[threadId] = stillHazardous;
            return reclaimed;
        }
    }
}
```
