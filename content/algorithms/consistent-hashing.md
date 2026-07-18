---
name: 一貫性ハッシュ法
category: 分散システム
subcategory: データ分散・整合性
complexity: O(log n)
summary: ハッシュ空間を環状に扱うことで、ノードの追加・削除時に再配置が必要なデータを最小限に抑える。分散キャッシュやDHTの基礎。
---

## 概要

複数のサーバーにデータを分散配置したいとき、素朴に「ハッシュ値 mod サーバー台数」で担当サーバーを決めると、**サーバーが1台増減しただけで、ほぼ全てのデータの担当が入れ替わってしまう**という問題が起きる(1000台中1台を増やすと、999台分のデータが再配置対象になる)。一貫性ハッシュ法は、この問題を「ハッシュ空間を輪(リング)として扱う」という発想で解決し、**サーバーの増減時に影響を受けるデータをごく一部に限定する**。1997年にDavid Karger達が考案した。

## 仕組み

1. ハッシュ関数の出力範囲(0からある最大値まで)を、両端がつながった円環(リング)とみなす
2. 各サーバーも、そのIDなどをハッシュ化した値でリング上の1点に配置する(実務では、1台のサーバーを複数の"仮想ノード"としてリング上に散らし、負荷を均等にすることが多い)
3. 各データも同様にハッシュ化してリング上の1点に対応させ、**そのデータの担当は、リング上を時計回りに進んで最初に出会うサーバー**とする
4. サーバーが追加されると、そのサーバーの直前(リング上で反時計回り)にあったデータの一部だけが新サーバーに移動する。他のサーバーが担当するデータには一切影響がない
5. サーバーが削除されると、そのサーバーが担当していたデータだけが、リング上で次のサーバーに引き継がれる

「担当範囲を"リング上の隣接区間"として局所化する」ことで、増減の影響がリング全体に及ばず、変化した箇所の近くだけに収まるのが本質。

## 特性・トレードオフ

- **計算量**: 担当サーバーの検索は、リング上の点を二分探索的に探せばO(log n)
- **再配置コストの劇的な削減**: サーバー数がN台のとき、素朴なmod方式では1台の増減で約100%のデータが再配置されるのに対し、一貫性ハッシュ法では平均して**約1/N程度**の再配置で済む
- **仮想ノードによる負荷分散**: 1台のサーバーを1点だけでリングに配置すると、たまたま担当範囲が偏ることがある。1台を多数の仮想ノードとしてリング上に散らばせることで、負荷をより均等にできる
- **使いどころ**: Amazon DynamoやApache Cassandraのような分散データベースのデータ配置、Memcachedのような分散キャッシュのシャーディング、CDNにおけるコンテンツの配置、分散ハッシュテーブル(DHT)全般の基礎技術

## 実装例

ハッシュ関数には、外部ライブラリなしでどの言語からも扱える FNV-1a を使用している。

```python
import bisect


def fnv1a(s: str) -> int:
    h = 2166136261
    for byte in s.encode("utf-8"):
        h ^= byte
        h = (h * 16777619) & 0xFFFFFFFF
    return h


class ConsistentHashRing:
    def __init__(self, virtual_nodes: int = 100):
        self.virtual_nodes = virtual_nodes
        self.ring: dict[int, str] = {}
        self.sorted_keys: list[int] = []

    def add_node(self, node: str) -> None:
        for i in range(self.virtual_nodes):
            h = fnv1a(f"{node}#{i}")
            if h not in self.ring:
                self.ring[h] = node
                bisect.insort(self.sorted_keys, h)

    def remove_node(self, node: str) -> None:
        for i in range(self.virtual_nodes):
            h = fnv1a(f"{node}#{i}")
            if h in self.ring:
                del self.ring[h]
                idx = bisect.bisect_left(self.sorted_keys, h)
                self.sorted_keys.pop(idx)

    def get_node(self, key: str) -> str:
        if not self.ring:
            raise ValueError("ring is empty")
        h = fnv1a(key)
        # リング上を時計回りに進んで最初に出会うサーバーを探す(二分探索)
        idx = bisect.bisect_right(self.sorted_keys, h) % len(self.sorted_keys)
        return self.ring[self.sorted_keys[idx]]
```

```typescript
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

class ConsistentHashRing {
  virtualNodes: number;
  ring: Map<number, string>;
  sortedKeys: number[];
  constructor(virtualNodes = 100) {
    this.virtualNodes = virtualNodes;
    this.ring = new Map();
    this.sortedKeys = [];
  }
  private insertSorted(h: number) {
    let lo = 0,
      hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid] < h) lo = mid + 1;
      else hi = mid;
    }
    this.sortedKeys.splice(lo, 0, h);
  }
  addNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const h = fnv1a(`${node}#${i}`);
      if (!this.ring.has(h)) {
        this.ring.set(h, node);
        this.insertSorted(h);
      }
    }
  }
  removeNode(node: string): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const h = fnv1a(`${node}#${i}`);
      if (this.ring.has(h)) {
        this.ring.delete(h);
        const idx = this.sortedKeys.indexOf(h);
        if (idx >= 0) this.sortedKeys.splice(idx, 1);
      }
    }
  }
  getNode(key: string): string {
    if (this.ring.size === 0) throw new Error("ring is empty");
    const h = fnv1a(key);
    let lo = 0,
      hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid] <= h) lo = mid + 1;
      else hi = mid;
    }
    const idx = lo % this.sortedKeys.length;
    return this.ring.get(this.sortedKeys[idx])!;
  }
}
```

```cpp
#include <map>
#include <string>
#include <cstdint>
#include <stdexcept>

uint32_t fnv1a(const std::string& s) {
    uint32_t h = 0x811c9dc5;
    for (unsigned char c : s) {
        h ^= c;
        h *= 0x01000193;
    }
    return h;
}

class ConsistentHashRing {
public:
    explicit ConsistentHashRing(int virtualNodes = 100) : virtualNodes(virtualNodes) {}

    void addNode(const std::string& node) {
        for (int i = 0; i < virtualNodes; i++) {
            uint32_t h = fnv1a(node + "#" + std::to_string(i));
            ring[h] = node;
        }
    }

    void removeNode(const std::string& node) {
        for (int i = 0; i < virtualNodes; i++) {
            uint32_t h = fnv1a(node + "#" + std::to_string(i));
            ring.erase(h);
        }
    }

    std::string getNode(const std::string& key) const {
        if (ring.empty()) throw std::runtime_error("ring is empty");
        uint32_t h = fnv1a(key);
        auto it = ring.lower_bound(h);  // 時計回りに進んで最初に出会うサーバー
        if (it == ring.end()) it = ring.begin();
        return it->second;
    }

private:
    int virtualNodes;
    std::map<uint32_t, std::string> ring;  // キー昇順に自動ソートされる
};
```

```rust
use std::collections::BTreeMap;

fn fnv1a(s: &str) -> u32 {
    let mut h: u32 = 0x811c9dc5;
    for b in s.bytes() {
        h ^= b as u32;
        h = h.wrapping_mul(0x01000193);
    }
    h
}

struct ConsistentHashRing {
    virtual_nodes: u32,
    ring: BTreeMap<u32, String>,
}

impl ConsistentHashRing {
    fn new(virtual_nodes: u32) -> Self {
        ConsistentHashRing { virtual_nodes, ring: BTreeMap::new() }
    }

    fn add_node(&mut self, node: &str) {
        for i in 0..self.virtual_nodes {
            let h = fnv1a(&format!("{node}#{i}"));
            self.ring.insert(h, node.to_string());
        }
    }

    fn remove_node(&mut self, node: &str) {
        for i in 0..self.virtual_nodes {
            let h = fnv1a(&format!("{node}#{i}"));
            self.ring.remove(&h);
        }
    }

    fn get_node(&self, key: &str) -> Option<&String> {
        if self.ring.is_empty() {
            return None;
        }
        let h = fnv1a(key);
        // リング上を時計回りに進んで最初に出会うサーバーを探す
        self.ring
            .range(h..)
            .next()
            .or_else(|| self.ring.iter().next())
            .map(|(_, v)| v)
    }
}
```

```csharp
class ConsistentHashRing
{
    private readonly int virtualNodes;
    private readonly SortedDictionary<uint, string> ring = new();

    public ConsistentHashRing(int virtualNodes = 100) { this.virtualNodes = virtualNodes; }

    private static uint Fnv1a(string s)
    {
        uint h = 0x811c9dc5;
        foreach (var c in s) { h ^= c; h *= 0x01000193; }
        return h;
    }

    public void AddNode(string node)
    {
        for (int i = 0; i < virtualNodes; i++)
        {
            uint h = Fnv1a($"{node}#{i}");
            ring[h] = node;
        }
    }

    public void RemoveNode(string node)
    {
        for (int i = 0; i < virtualNodes; i++)
        {
            uint h = Fnv1a($"{node}#{i}");
            ring.Remove(h);
        }
    }

    public string GetNode(string key)
    {
        if (ring.Count == 0) throw new InvalidOperationException("ring is empty");
        uint h = Fnv1a(key);
        foreach (var kv in ring)
            if (kv.Key >= h) return kv.Value;
        return ring.First().Value;  // リングを一周した場合は先頭に戻る
    }
}
```
