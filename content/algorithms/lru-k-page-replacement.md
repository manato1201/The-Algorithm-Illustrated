---
name: LRU-Kページ置換アルゴリズム
category: スケジューリング
subcategory: キャッシュ置換ポリシー
complexity: O(log n)(1回の参照処理、優先度付きキューで管理する場合)
summary: 通常のLRU(最も長く使われていないものを追い出す)が「1回前の参照時刻」しか見ないのに対し、各ページの「過去K回目の参照時刻」まで遡って考慮することで、一時的にしかアクセスされない「間欠的な人気」に惑わされにくい、より賢いキャッシュ置換ポリシー。
---

## 概要

通常のLRU(Least Recently Used)は「最後に参照されたのがいつか」という1つの情報だけでページを追い出す判断をするが、この単純な基準には弱点がある——1回だけ大量のページを走査するようなクエリ(例えばデータベースの全表スキャン)が発生すると、本来頻繁に使われている重要なページ群が、一時的な走査によって全て「最近使われた」ことになってしまったページ群に押し出されてしまう(キャッシュ汚染)。1993年にエリザベス・オニール(O'Neil)らが発表したLRU-Kは、この問題に対処するため、各ページについて「最後に参照された時刻」ではなく「過去K回目に参照された時刻」を追跡する——1回や2回のアクセスでは真に「頻繁に使われている」とは認めず、K回目の参照がどれだけ最近だったかを見ることで、一時的な人気と持続的な人気を区別する。

## 仕組み

1. 各ページについて、そのページが参照された時刻の履歴を(直近K回分まで)記録しておく
2. ページフォールトが発生し、追い出すページを選ぶ必要が生じたとき、各ページの「K回目に新しい参照時刻(Backward K-distance)」——つまり、そのページが過去に何回参照されたかを遡って、ちょうどK回前の参照がいつだったか——を計算する
3. まだK回参照されたことのないページについては、Backward K-distanceを無限大とみなす(参照回数が足りない、真に人気があるかまだ分からないページとして扱う)
4. Backward K-distanceが最も大きい(K回目の参照が最も昔である、つまり最も「真に不人気」らしい)ページを追い出し対象として選ぶ
5. `K=1`とすると通常のLRU(最後の参照時刻だけを見る)と完全に一致する——LRU-Kは通常のLRUを`K=1`の特殊ケースとして含む、より一般化された枠組みになっている

## 特性・トレードオフ

- **計算量**: 各ページの参照履歴を優先度付きキューやソート済み構造で管理すれば、1回の参照処理は`O(log n)`——履歴をK個分保持する分だけ通常のLRU(`O(1)`で実装できることが多い)よりメモリ・処理コストが増える
- **「一時的な人気」と「持続的な人気」を区別できるという核心的な利点**: `K≥2`にすることで、1回きりのアクセス(大量走査によるノイズ)ではキャッシュの優先順位が動かず、複数回にわたって繰り返しアクセスされているページだけが「本当に重要」と評価される——データベースのバッファプール管理において、この一時的な走査によるキャッシュ汚染を防ぐ効果が特に重視される
- **`K`の値をどう選ぶかというトレードオフ**: `K`を大きくするほど「真に頻繁に使われるページ」をより正確に識別できるが、各ページの参照履歴をより多く保持する必要がありメモリオーバーヘッドが増える。実務では`K=2`(LRU-2)が、オーバーヘッドと精度のバランスが良いとして広く採用されている
- **[LFUキャッシュ](/algorithms/lfu-cache)との違い**: [LFUキャッシュ](/algorithms/lfu-cache)は「単純な参照回数」を基準にするため、過去に大量にアクセスされたが最近は全く使われていないページを不当に優遇し続けてしまう問題(経年劣化への対応が難しい)があるのに対し、LRU-Kは「K回目の参照が最近かどうか」という時間情報を組み込んでいるため、この経年劣化の問題を自然に緩和できる
- **使いどころ**: データベース管理システムのバッファプール管理(PostgreSQL・SQL Serverなど、実際にLRU-K系のアルゴリズムを採用しているシステムがある)、大規模ストレージシステムのキャッシュ層、CDN(コンテンツ配信network)におけるキャッシュ効率の最適化

## 実装例

```python
class LRUKCache:
    def __init__(self, capacity: int, k: int):
        self.capacity = capacity
        self.k = k
        self.cache: dict[int, int] = {}
        self.history: dict[int, list[int]] = {}
        self.clock = 0

    def _backward_k_distance(self, page: int) -> float:
        """過去K回目の参照時刻までの距離。K回未満しか参照されていなければ無限大扱い。"""
        hist = self.history[page]
        if len(hist) < self.k:
            return float("inf")
        return self.clock - hist[-self.k]

    def access(self, page: int) -> bool:
        """ページを参照する。戻り値はヒットしたかどうか。"""
        self.clock += 1
        hit = page in self.cache
        hist = self.history.setdefault(page, [])
        hist.append(self.clock)
        if len(hist) > self.k:
            hist.pop(0)

        if not hit:
            if len(self.cache) >= self.capacity:
                self._evict()
            self.cache[page] = page
        return hit

    def _evict(self) -> None:
        """Backward K-distanceが最大(タイならより長く触られていない方)のページを追い出す"""
        victim = max(
            self.cache,
            key=lambda p: (self._backward_k_distance(p), -self.history[p][-1]),
        )
        del self.cache[victim]
```

```typescript
class LRUKCache {
  capacity: number;
  k: number;
  cache: Map<number, number> = new Map();
  history: Map<number, number[]> = new Map();
  clock = 0;

  constructor(capacity: number, k: number) {
    this.capacity = capacity;
    this.k = k;
  }

  private backwardKDistance(page: number): number {
    const hist = this.history.get(page)!;
    if (hist.length < this.k) return Infinity;
    return this.clock - hist[hist.length - this.k];
  }

  access(page: number): boolean {
    this.clock++;
    const hit = this.cache.has(page);
    const hist = this.history.get(page) ?? [];
    hist.push(this.clock);
    if (hist.length > this.k) hist.shift();
    this.history.set(page, hist);

    if (!hit) {
      if (this.cache.size >= this.capacity) this.evict();
      this.cache.set(page, page);
    }
    return hit;
  }

  private evict(): void {
    let victim = -1;
    let bestKey: [number, number] | null = null;
    for (const p of this.cache.keys()) {
      const hist = this.history.get(p)!;
      const key: [number, number] = [this.backwardKDistance(p), -hist[hist.length - 1]];
      if (bestKey === null || key[0] > bestKey[0] || (key[0] === bestKey[0] && key[1] > bestKey[1])) {
        bestKey = key;
        victim = p;
      }
    }
    this.cache.delete(victim);
  }
}
```

```cpp
#include <unordered_map>
#include <vector>
#include <limits>

class LRUKCache {
public:
    LRUKCache(int capacity, int k) : capacity(capacity), k(k), clock(0) {}

    bool access(int page) {
        clock++;
        bool hit = cache.count(page) > 0;
        auto& hist = history[page];
        hist.push_back(clock);
        if (static_cast<int>(hist.size()) > k) hist.erase(hist.begin());

        if (!hit) {
            if (static_cast<int>(cache.size()) >= capacity) evict();
            cache[page] = page;
        }
        return hit;
    }

private:
    int capacity;
    int k;
    std::unordered_map<int, int> cache;
    std::unordered_map<int, std::vector<long long>> history;
    long long clock;

    double backwardKDistance(int page) const {
        const auto& hist = history.at(page);
        if (static_cast<int>(hist.size()) < k) return std::numeric_limits<double>::infinity();
        return static_cast<double>(clock - hist[hist.size() - k]);
    }

    void evict() {
        int victim = -1;
        double bestDist = -1;
        long long bestRecent = 0;
        bool first = true;
        for (const auto& [p, _] : cache) {
            double dist = backwardKDistance(p);
            long long recent = history.at(p).back();
            if (first || dist > bestDist || (dist == bestDist && -recent > -bestRecent)) {
                bestDist = dist;
                bestRecent = recent;
                victim = p;
                first = false;
            }
        }
        cache.erase(victim);
    }
};
```

```rust
use std::collections::HashMap;

struct LruKCache {
    capacity: usize,
    k: usize,
    cache: HashMap<i32, i32>,
    history: HashMap<i32, Vec<i64>>,
    clock: i64,
}

impl LruKCache {
    fn new(capacity: usize, k: usize) -> Self {
        LruKCache { capacity, k, cache: HashMap::new(), history: HashMap::new(), clock: 0 }
    }

    fn backward_k_distance(&self, page: i32) -> f64 {
        let hist = &self.history[&page];
        if hist.len() < self.k {
            f64::INFINITY
        } else {
            (self.clock - hist[hist.len() - self.k]) as f64
        }
    }

    fn access(&mut self, page: i32) -> bool {
        self.clock += 1;
        let hit = self.cache.contains_key(&page);
        let hist = self.history.entry(page).or_insert_with(Vec::new);
        hist.push(self.clock);
        if hist.len() > self.k {
            hist.remove(0);
        }
        if !hit {
            if self.cache.len() >= self.capacity {
                self.evict();
            }
            self.cache.insert(page, page);
        }
        hit
    }

    fn evict(&mut self) {
        let mut victim = None;
        let mut best: (f64, i64) = (f64::NEG_INFINITY, i64::MIN);
        for &p in self.cache.keys() {
            let dist = self.backward_k_distance(p);
            let last = *self.history[&p].last().unwrap();
            let key = (dist, -last);
            if victim.is_none() || key.0 > best.0 || (key.0 == best.0 && key.1 > best.1) {
                best = key;
                victim = Some(p);
            }
        }
        if let Some(v) = victim {
            self.cache.remove(&v);
        }
    }
}
```

```csharp
class LRUKCache
{
    private readonly int capacity;
    private readonly int k;
    public Dictionary<int, int> Cache = new();
    private readonly Dictionary<int, List<long>> history = new();
    private long clock = 0;

    public LRUKCache(int capacity, int k) { this.capacity = capacity; this.k = k; }

    private double BackwardKDistance(int page)
    {
        var hist = history[page];
        if (hist.Count < k) return double.PositiveInfinity;
        return clock - hist[hist.Count - k];
    }

    public bool Access(int page)
    {
        clock++;
        bool hit = Cache.ContainsKey(page);
        if (!history.ContainsKey(page)) history[page] = new List<long>();
        var hist = history[page];
        hist.Add(clock);
        if (hist.Count > k) hist.RemoveAt(0);

        if (!hit)
        {
            if (Cache.Count >= capacity) Evict();
            Cache[page] = page;
        }
        return hit;
    }

    private void Evict()
    {
        int victim = -1;
        (double dist, long recent) best = (double.NegativeInfinity, long.MinValue);
        bool first = true;
        foreach (var p in Cache.Keys)
        {
            var hist = history[p];
            var key = (dist: BackwardKDistance(p), recent: -hist[^1]);
            if (first || key.dist > best.dist || (key.dist == best.dist && key.recent > best.recent))
            {
                best = key;
                victim = p;
                first = false;
            }
        }
        Cache.Remove(victim);
    }
}
```
