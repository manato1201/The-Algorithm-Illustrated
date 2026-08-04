---
name: LFUキャッシュ(最小使用頻度)
category: スケジューリング
subcategory: キャッシュ置換ポリシー
complexity: O(1)(適切なデータ構造を使った場合)
summary: 各要素の参照回数を記録し、キャッシュが満杯になったら最も参照回数の少ない要素を追い出す、アクセス頻度に基づくキャッシュ置換戦略。
---

## 概要

[LRUキャッシュ](/algorithms/lru-cache)が「直近使われていない」ことを追い出しの基準にするのに対し、LFU(Least Frequently Used)キャッシュは「これまでの累計でどれだけ参照されたか」という頻度を基準にする。直感的には、たまに何度も参照される「人気の」データを、最近少し触っただけの「一時的な」データより優先的に保持したい場面で有効であり、時間的な近さよりも参照される頻度そのものを重視する設計思想を持つ。

## 仕組み

1. 各キャッシュ要素に、その要素が参照された累計回数を記録するカウンタを持たせる
2. 要素へのアクセス(取得)があるたびに、その要素のカウンタをインクリメントする
3. 新しい要素をキャッシュに追加する際、キャッシュが満杯であれば、現在カウンタの値が最も小さい要素を追い出す(**同率の場合はどれを追い出すかの追加ルールが必要**——多くの実装では、同じ頻度の中でも最も長く使われていない要素を優先的に追い出す、[LRUキャッシュ](/algorithms/lru-cache)の考え方を組み合わせたタイブレークを行う)
4. `O(1)`で実装するには、頻度ごとに要素をグループ化した「頻度バケット」の仕組みが使われる: 各頻度`f`に対応する[LRUキャッシュ](/algorithms/lru-cache)と同じ構造の双方向連結リストを用意し、要素は自分の現在の頻度に対応するリストに属する。要素の参照時は、そのリストから取り除き、頻度を1増やして次のリストの先頭に挿入する。全体の最小頻度を追跡する変数を1つ持てば、追い出す際にどのリストを見ればよいか即座にわかる

## 特性・トレードオフ

- **計算量**: 頻度バケットとハッシュテーブルを組み合わせた実装により、取得・追加・追い出しの全ての操作を`O(1)`で実現できる——[LRUキャッシュ](/algorithms/lru-cache)と同等の効率性を持つ
- **[LRUキャッシュ](/algorithms/lru-cache)との使い分け**: LRUは「最近のアクセスパターンの変化」に素早く適応する(直近人気のものをすぐに保持する)一方、LFUは「長期的に安定して人気があるもの」を優先する。アクセスパターンが時間とともに大きく変化するワークロードではLRUが、常に一部のデータが繰り返しアクセスされ続けるワークロードではLFUが有利になりやすい
- **「カウンタの飽和」問題**: 単純なLFUでは、過去に大量にアクセスされたが今は全く使われなくなった要素のカウンタが高いまま残り続け、実際には有用でなくなったデータを不当に長く保持してしまう(古い人気に固執する)ことがある。この対策として、一定時間ごとに全カウンタを減衰させる(半分にする等)手法がよく使われる
- **使いどころ**: データベースのバッファプール管理、CDN(コンテンツ配信ネットワーク)におけるキャッシュ戦略、長期的な人気パターンが安定しているコンテンツ配信システム。[LRUキャッシュ](/algorithms/lru-cache)と組み合わせたハイブリッド戦略(ARC: Adaptive Replacement Cacheなど)も実務では広く使われている

## 実装例

頻度ごとに要素をグループ化した「頻度バケット」(挿入順を保つ辞書)を使い、取得・追加・追い出しをすべて`O(1)`で行う。

```python
from collections import OrderedDict


class LFUCache:
    """頻度バケットを使ったO(1)のLFUキャッシュ。同一頻度内では最も長く使われていない要素を優先的に追い出す。"""

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.min_freq = 0
        self.key_to_val: dict = {}
        self.key_to_freq: dict = {}
        self.freq_to_keys: dict[int, OrderedDict] = {}

    def _touch(self, key):
        freq = self.key_to_freq[key]
        del self.freq_to_keys[freq][key]
        if not self.freq_to_keys[freq]:
            del self.freq_to_keys[freq]
            if self.min_freq == freq:
                self.min_freq += 1
        new_freq = freq + 1
        self.key_to_freq[key] = new_freq
        self.freq_to_keys.setdefault(new_freq, OrderedDict())[key] = None

    def get(self, key):
        if key not in self.key_to_val:
            return -1
        self._touch(key)
        return self.key_to_val[key]

    def put(self, key, value):
        if self.capacity <= 0:
            return
        if key in self.key_to_val:
            self.key_to_val[key] = value
            self._touch(key)
            return
        if len(self.key_to_val) >= self.capacity:
            evict_key, _ = self.freq_to_keys[self.min_freq].popitem(last=False)
            if not self.freq_to_keys[self.min_freq]:
                del self.freq_to_keys[self.min_freq]
            del self.key_to_val[evict_key]
            del self.key_to_freq[evict_key]
        self.key_to_val[key] = value
        self.key_to_freq[key] = 1
        self.freq_to_keys.setdefault(1, OrderedDict())[key] = None
        self.min_freq = 1
```

```typescript
class LFUCache {
  private capacity: number;
  private minFreq = 0;
  private keyToVal = new Map<number, number>();
  private keyToFreq = new Map<number, number>();
  private freqToKeys = new Map<number, Map<number, null>>(); // Mapは挿入順を保持するのでLRU的な順序として使える

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  private touch(key: number): void {
    const freq = this.keyToFreq.get(key)!;
    const bucket = this.freqToKeys.get(freq)!;
    bucket.delete(key);
    if (bucket.size === 0) {
      this.freqToKeys.delete(freq);
      if (this.minFreq === freq) this.minFreq++;
    }
    const newFreq = freq + 1;
    this.keyToFreq.set(key, newFreq);
    if (!this.freqToKeys.has(newFreq)) this.freqToKeys.set(newFreq, new Map());
    this.freqToKeys.get(newFreq)!.set(key, null);
  }

  get(key: number): number {
    if (!this.keyToVal.has(key)) return -1;
    this.touch(key);
    return this.keyToVal.get(key)!;
  }

  put(key: number, value: number): void {
    if (this.capacity <= 0) return;
    if (this.keyToVal.has(key)) {
      this.keyToVal.set(key, value);
      this.touch(key);
      return;
    }
    if (this.keyToVal.size >= this.capacity) {
      const bucket = this.freqToKeys.get(this.minFreq)!;
      const evictKey = bucket.keys().next().value as number;
      bucket.delete(evictKey);
      if (bucket.size === 0) this.freqToKeys.delete(this.minFreq);
      this.keyToVal.delete(evictKey);
      this.keyToFreq.delete(evictKey);
    }
    this.keyToVal.set(key, value);
    this.keyToFreq.set(key, 1);
    if (!this.freqToKeys.has(1)) this.freqToKeys.set(1, new Map());
    this.freqToKeys.get(1)!.set(key, null);
    this.minFreq = 1;
  }
}
```

```cpp
#include <unordered_map>
#include <list>

class LFUCache {
public:
    explicit LFUCache(int capacity) : capacity_(capacity), minFreq_(0) {}

    int get(int key) {
        auto it = keyToVal_.find(key);
        if (it == keyToVal_.end()) return -1;
        touch(key);
        return it->second;
    }

    void put(int key, int value) {
        if (capacity_ <= 0) return;
        auto it = keyToVal_.find(key);
        if (it != keyToVal_.end()) {
            it->second = value;
            touch(key);
            return;
        }
        if (static_cast<int>(keyToVal_.size()) >= capacity_) {
            auto& bucket = freqToKeys_[minFreq_];
            int evictKey = bucket.front();
            bucket.pop_front();
            if (bucket.empty()) freqToKeys_.erase(minFreq_);
            keyToVal_.erase(evictKey);
            keyToFreq_.erase(evictKey);
            keyToIter_.erase(evictKey);
        }
        keyToVal_[key] = value;
        keyToFreq_[key] = 1;
        freqToKeys_[1].push_back(key);
        keyToIter_[key] = std::prev(freqToKeys_[1].end());
        minFreq_ = 1;
    }

private:
    void touch(int key) {
        int freq = keyToFreq_[key];
        auto& bucket = freqToKeys_[freq];
        bucket.erase(keyToIter_[key]);
        if (bucket.empty()) {
            freqToKeys_.erase(freq);
            if (minFreq_ == freq) minFreq_++;
        }
        int newFreq = freq + 1;
        keyToFreq_[key] = newFreq;
        freqToKeys_[newFreq].push_back(key);
        keyToIter_[key] = std::prev(freqToKeys_[newFreq].end());
    }

    int capacity_;
    int minFreq_;
    std::unordered_map<int, int> keyToVal_;
    std::unordered_map<int, int> keyToFreq_;
    std::unordered_map<int, std::list<int>> freqToKeys_;
    std::unordered_map<int, std::list<int>::iterator> keyToIter_;
};
```

```rust
use std::collections::HashMap;

// キーの挿入順を保つ単純な連結リストの代わりに、Vecベースの順序付きバケットで代用する
// (要素数が少ない用途を想定した簡略実装。大規模用途にはより洗練された連結リストが必要)
pub struct LfuCache {
    capacity: usize,
    min_freq: u64,
    key_to_val: HashMap<i64, i64>,
    key_to_freq: HashMap<i64, u64>,
    freq_to_keys: HashMap<u64, Vec<i64>>, // 先頭が最も古い(最初にそのバケットに入った)要素
}

impl LfuCache {
    pub fn new(capacity: usize) -> Self {
        LfuCache {
            capacity,
            min_freq: 0,
            key_to_val: HashMap::new(),
            key_to_freq: HashMap::new(),
            freq_to_keys: HashMap::new(),
        }
    }

    fn touch(&mut self, key: i64) {
        let freq = *self.key_to_freq.get(&key).unwrap();
        let bucket = self.freq_to_keys.get_mut(&freq).unwrap();
        bucket.retain(|&k| k != key);
        if bucket.is_empty() {
            self.freq_to_keys.remove(&freq);
            if self.min_freq == freq {
                self.min_freq += 1;
            }
        }
        let new_freq = freq + 1;
        self.key_to_freq.insert(key, new_freq);
        self.freq_to_keys.entry(new_freq).or_default().push(key);
    }

    pub fn get(&mut self, key: i64) -> i64 {
        if !self.key_to_val.contains_key(&key) {
            return -1;
        }
        self.touch(key);
        self.key_to_val[&key]
    }

    pub fn put(&mut self, key: i64, value: i64) {
        if self.capacity == 0 {
            return;
        }
        if self.key_to_val.contains_key(&key) {
            self.key_to_val.insert(key, value);
            self.touch(key);
            return;
        }
        if self.key_to_val.len() >= self.capacity {
            let bucket = self.freq_to_keys.get_mut(&self.min_freq).unwrap();
            let evict_key = bucket.remove(0);
            if bucket.is_empty() {
                self.freq_to_keys.remove(&self.min_freq);
            }
            self.key_to_val.remove(&evict_key);
            self.key_to_freq.remove(&evict_key);
        }
        self.key_to_val.insert(key, value);
        self.key_to_freq.insert(key, 1);
        self.freq_to_keys.entry(1).or_default().push(key);
        self.min_freq = 1;
    }
}
```

```csharp
using System.Collections.Generic;
using System.Linq;

class LfuCache
{
    private readonly int _capacity;
    private int _minFreq;
    private readonly Dictionary<int, int> _keyToVal = new();
    private readonly Dictionary<int, int> _keyToFreq = new();
    private readonly Dictionary<int, LinkedList<int>> _freqToKeys = new();
    private readonly Dictionary<int, LinkedListNode<int>> _keyToNode = new();

    public LfuCache(int capacity) { _capacity = capacity; }

    private void Touch(int key)
    {
        int freq = _keyToFreq[key];
        var bucket = _freqToKeys[freq];
        bucket.Remove(_keyToNode[key]);
        if (bucket.Count == 0)
        {
            _freqToKeys.Remove(freq);
            if (_minFreq == freq) _minFreq++;
        }
        int newFreq = freq + 1;
        _keyToFreq[key] = newFreq;
        if (!_freqToKeys.TryGetValue(newFreq, out var newBucket))
        {
            newBucket = new LinkedList<int>();
            _freqToKeys[newFreq] = newBucket;
        }
        _keyToNode[key] = newBucket.AddLast(key);
    }

    public int Get(int key)
    {
        if (!_keyToVal.ContainsKey(key)) return -1;
        Touch(key);
        return _keyToVal[key];
    }

    public void Put(int key, int value)
    {
        if (_capacity <= 0) return;
        if (_keyToVal.ContainsKey(key))
        {
            _keyToVal[key] = value;
            Touch(key);
            return;
        }
        if (_keyToVal.Count >= _capacity)
        {
            var bucket = _freqToKeys[_minFreq];
            int evictKey = bucket.First!.Value;
            bucket.RemoveFirst();
            if (bucket.Count == 0) _freqToKeys.Remove(_minFreq);
            _keyToVal.Remove(evictKey);
            _keyToFreq.Remove(evictKey);
            _keyToNode.Remove(evictKey);
        }
        _keyToVal[key] = value;
        _keyToFreq[key] = 1;
        if (!_freqToKeys.TryGetValue(1, out var bucket1))
        {
            bucket1 = new LinkedList<int>();
            _freqToKeys[1] = bucket1;
        }
        _keyToNode[key] = bucket1.AddLast(key);
        _minFreq = 1;
    }
}
```
