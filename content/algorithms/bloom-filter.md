---
name: ブルームフィルタ
category: データ構造
subcategory: 確率的・キャッシュ構造
complexity: O(k)
summary: 偽陽性を許容する代わりに、極めて省メモリで「集合に含まれるか」を判定する確率的データ構造。
---

## 概要

「ある要素が集合に含まれているか」を、要素そのものを一切保存せずに、驚くほど省メモリで(近似的に)判定できるデータ構造。1970年にBurton Bloomが考案した。**「含まれていないのに含まれていると誤判定する(偽陽性)」ことはあるが、「含まれているのに含まれていないと誤判定する(偽陰性)」ことは絶対に起きない**、という非対称な性質が特徴的で、この性質を許容できる場面で強力な武器になる。

## 仕組み

1. 固定長のビット配列(最初は全て0)と、**k個の異なるハッシュ関数**を用意する
2. **要素の追加**: 追加したい要素をk個のハッシュ関数それぞれに通し、得られたk個の位置のビットを全て1にする
3. **所属判定**: 判定したい要素を同じくk個のハッシュ関数に通し、対応するk個の位置が**全て1であれば**「おそらく含まれる」、**1つでも0があれば**「絶対に含まれていない」と判定する

「全て1」であっても、それは別々の要素の追加によってたまたま全部1になっていた可能性がある(偽陽性)。しかし「1つでも0」があれば、その要素は一度も追加されていないと確実に言える(そうでなければその位置は必ず1になっているはずだから)——この非対称性がブルームフィルタの正しさの根拠になっている。

## 特性・トレードオフ

- **計算量**: 追加・判定ともにO(k)(k=ハッシュ関数の個数、通常は数個程度の定数)。要素数がどれだけ増えても、この速さは変わらない
- **メモリ効率**: 実際の要素を保存する必要がないため、ハッシュテーブルなどに比べて桁違いに省メモリになる。ビット配列のサイズとハッシュ関数の個数を調整することで、偽陽性率と使用メモリのトレードオフを制御できる
- **削除ができない**: あるビットを0に戻すと、別の要素の判定結果まで壊してしまう可能性があるため、素朴なブルームフィルタは要素の削除に対応できない(カウンティングブルームフィルタなど、削除に対応した派生形も存在する)
- **使いどころ**: Webブラウザの「危険なURLかどうか」の事前チェック(実際のブラックリストへの問い合わせ前のフィルタリング)、データベースのディスクI/O削減(「このキーはそもそも存在しない」と高速に判定してディスクアクセスを省く、Bigtableなどで実際に使われている)、分散システムにおける重複検出など

## 実装例

k個のハッシュ関数は、異なる乗数を使う簡易な文字列ハッシュ(`h = h * prime + charCode`)をk通り用意することで実現する。

```python
class BloomFilter:
    def __init__(self, size: int, hash_count: int = 3):
        self.size = size
        self.hash_count = hash_count
        self.bits = [False] * size

    def _hash(self, item: str, seed: int) -> int:
        h = 0
        prime = 31 + seed * 2
        for ch in item:
            h = (h * prime + ord(ch)) % self.size
        return h

    def insert(self, item: str) -> None:
        for seed in range(self.hash_count):
            index = self._hash(item, seed)
            self.bits[index] = True

    def query(self, item: str) -> bool:
        for seed in range(self.hash_count):
            index = self._hash(item, seed)
            if not self.bits[index]:
                return False
        return True
```

```typescript
class BloomFilter {
  private size: number;
  private hashCount: number;
  private bits: boolean[];

  constructor(size: number, hashCount: number = 3) {
    this.size = size;
    this.hashCount = hashCount;
    this.bits = new Array(size).fill(false);
  }

  private hash(item: string, seed: number): number {
    let h = 0;
    const prime = 31 + seed * 2;
    for (let i = 0; i < item.length; i++) {
      h = (h * prime + item.charCodeAt(i)) % this.size;
    }
    return h;
  }

  insert(item: string): void {
    for (let seed = 0; seed < this.hashCount; seed++) {
      const index = this.hash(item, seed);
      this.bits[index] = true;
    }
  }

  query(item: string): boolean {
    for (let seed = 0; seed < this.hashCount; seed++) {
      const index = this.hash(item, seed);
      if (!this.bits[index]) return false;
    }
    return true;
  }
}
```

```cpp
#include <vector>
#include <string>

class BloomFilter {
public:
    explicit BloomFilter(std::size_t size, int hashCount = 3)
        : size(size), hashCount(hashCount), bits(size, false) {}

    void insert(const std::string& item) {
        for (int seed = 0; seed < hashCount; seed++) {
            bits[hash(item, seed)] = true;
        }
    }

    bool query(const std::string& item) const {
        for (int seed = 0; seed < hashCount; seed++) {
            if (!bits[hash(item, seed)]) return false;
        }
        return true;
    }

private:
    std::size_t size;
    int hashCount;
    std::vector<bool> bits;

    std::size_t hash(const std::string& item, int seed) const {
        std::size_t h = 0;
        std::size_t prime = 31 + static_cast<std::size_t>(seed) * 2;
        for (char ch : item) {
            h = (h * prime + static_cast<unsigned char>(ch)) % size;
        }
        return h;
    }
};
```

```rust
struct BloomFilter {
    size: usize,
    hash_count: usize,
    bits: Vec<bool>,
}

impl BloomFilter {
    fn new(size: usize, hash_count: usize) -> Self {
        BloomFilter { size, hash_count, bits: vec![false; size] }
    }

    fn hash(&self, item: &str, seed: usize) -> usize {
        let mut h: usize = 0;
        let prime = 31 + seed * 2;
        for ch in item.bytes() {
            h = (h.wrapping_mul(prime).wrapping_add(ch as usize)) % self.size;
        }
        h
    }

    fn insert(&mut self, item: &str) {
        for seed in 0..self.hash_count {
            let index = self.hash(item, seed);
            self.bits[index] = true;
        }
    }

    fn query(&self, item: &str) -> bool {
        for seed in 0..self.hash_count {
            let index = self.hash(item, seed);
            if !self.bits[index] {
                return false;
            }
        }
        true
    }
}
```

```csharp
class BloomFilter
{
    private readonly int size;
    private readonly int hashCount;
    private readonly bool[] bits;

    public BloomFilter(int size, int hashCount = 3)
    {
        this.size = size;
        this.hashCount = hashCount;
        bits = new bool[size];
    }

    private int Hash(string item, int seed)
    {
        long h = 0;
        int prime = 31 + seed * 2;
        foreach (char ch in item)
        {
            h = (h * prime + ch) % size;
        }
        return (int)h;
    }

    public void Insert(string item)
    {
        for (int seed = 0; seed < hashCount; seed++)
        {
            int index = Hash(item, seed);
            bits[index] = true;
        }
    }

    public bool Query(string item)
    {
        for (int seed = 0; seed < hashCount; seed++)
        {
            int index = Hash(item, seed);
            if (!bits[index]) return false;
        }
        return true;
    }
}
```
