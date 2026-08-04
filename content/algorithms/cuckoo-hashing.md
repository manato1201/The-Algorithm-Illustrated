---
name: カッコウハッシュ法(Cuckoo Hashing)
category: データ構造
subcategory: 確率的・キャッシュ構造
complexity: O(1)(最悪時の探索・削除)、O(1)(償却、挿入)
summary: 2つのハッシュ関数と2つのテーブルを使い、衝突が起きたら先住者を「追い出して」別の巣(テーブル)へ移す、カッコウの托卵になぞらえたオープンアドレス法のハッシュテーブル。
---

## 概要

通常のハッシュテーブルは、衝突(異なるキーが同じバケットにハッシュされること)が起きると、線形探索やチェイン(連結リスト)で衝突を解決するため、探索の最悪計算量が`O(n)`まで悪化しうる。2001年にラースマン・パーとフラビオ・ロドリゲスが発表したカッコウハッシュ法は、カッコウが他の鳥の巣に卵を産みつけ、先住の卵(または雛)を巣から追い出すという托卵の習性になぞらえ、「新しいキーが衝突したら、先にそこにいたキーを追い出して、追い出されたキーは自分の**別の**候補位置へ移動する」という玉突き式の再配置を行うことで、最悪でも`O(1)`という探索性能を保証する、オープンアドレス法の一種である。

## 仕組み

1. 2つの独立したハッシュ関数`h1`、`h2`と、それぞれに対応する2つのテーブル`T1`、`T2`を用意する。各キーは、`T1`の`h1(key)`の位置か、`T2`の`h2(key)`の位置のどちらかに格納される
2. **探索**: `T1[h1(key)]`と`T2[h2(key)]`の2箇所だけを調べれば、キーが存在するかどうかが確定する——常にちょうど2回の参照で済むため、最悪でも`O(1)`が保証される
3. **挿入**: キー`x`を`T1[h1(x)]`に置こうとする。その位置が既に別のキー`y`で埋まっていたら、`y`を追い出して`x`をそこに置き、追い出された`y`を今度は`T2[h2(y)]`へ挿入しようとする。そこも埋まっていれば、さらにその先住者を追い出して`T1`へ、という玉突きを繰り返す
4. この玉突きが際限なく続く(閉路にはまり込む)ことがまれに起こりうる——その場合は、新しいハッシュ関数の組を選び直して、テーブル全体を再構築する(リハッシュ)
5. **削除**: 該当するキーがある位置を空にするだけで完了する

## 特性・トレードオフ

- **計算量**: 探索・削除は常に高々2箇所の参照だけで済むため、厳密な最悪計算量`O(1)`を保証する——チェイン法のハッシュテーブルが最悪`O(n)`になりうるのとは対照的な強い保証である。挿入は玉突きが発生することがあるが、テーブルの負荷率(使用率)を50%未満程度に抑えれば、償却計算量で`O(1)`が期待できる
- **玉突きの停止性への配慮が必要**: 挿入時の玉突きが理論上は無限ループに陥る可能性があり(閉路のあるグラフ構造とみなせる)、実装では一定回数以上玉突きが続いたらリハッシュに切り替える、というフェイルセーフが欠かせない
- **負荷率への敏感さ**: 探索の`O(1)`保証と引き換えに、テーブルの空き容量に余裕を持たせる必要があり(通常50%未満の負荷率を保つ)、[チェイン法](/algorithms/lru-cache)のハッシュテーブルよりメモリ効率で劣ることがある
- **使いどころ**: 探索性能の最悪ケース保証が重要なリアルタイムシステム(ネットワークルーターのルーティングテーブル、ハードウェア実装のキャッシュ)、[ブルームフィルタ](/algorithms/bloom-filter)の削除可能な代替として使われるカッコウフィルタ(Cuckoo Filter)の基盤技術

## 実装例

キー(整数)を対象に、2つの乗算ハッシュ関数`h1`・`h2`と、玉突きの上限回数(規定回数を超えたらリハッシュが必要と判定する)を持つ実装。

```python
class CuckooHashTable:
    A1, A2, B2 = 2654435761, 40503, 12345

    def __init__(self, size: int):
        self.size = size
        self.table1: list[int | None] = [None] * size
        self.table2: list[int | None] = [None] * size
        self.max_loop = max(size, 8)

    def _h1(self, key: int) -> int:
        return (key * self.A1) % self.size

    def _h2(self, key: int) -> int:
        return (key * self.A2 + self.B2) % self.size

    def contains(self, key: int) -> bool:
        return self.table1[self._h1(key)] == key or self.table2[self._h2(key)] == key

    def insert(self, key: int) -> bool:
        if self.contains(key):
            return True
        cur = key
        use_table1 = True
        for _ in range(self.max_loop):
            if use_table1:
                idx = self._h1(cur)
                if self.table1[idx] is None:
                    self.table1[idx] = cur
                    return True
                cur, self.table1[idx] = self.table1[idx], cur
            else:
                idx = self._h2(cur)
                if self.table2[idx] is None:
                    self.table2[idx] = cur
                    return True
                cur, self.table2[idx] = self.table2[idx], cur
            use_table1 = not use_table1
        return False  # 玉突きが上限に達した場合、呼び出し側でリハッシュが必要
```

```typescript
class CuckooHashTable {
  size: number;
  table1: (number | null)[];
  table2: (number | null)[];
  maxLoop: number;
  static A1 = 2654435761;
  static A2 = 40503;
  static B2 = 12345;

  constructor(size: number) {
    this.size = size;
    this.table1 = new Array(size).fill(null);
    this.table2 = new Array(size).fill(null);
    this.maxLoop = Math.max(size, 8);
  }

  private h1(key: number): number {
    return (key * CuckooHashTable.A1) % this.size;
  }
  private h2(key: number): number {
    return (key * CuckooHashTable.A2 + CuckooHashTable.B2) % this.size;
  }

  contains(key: number): boolean {
    return this.table1[this.h1(key)] === key || this.table2[this.h2(key)] === key;
  }

  insert(key: number): boolean {
    if (this.contains(key)) return true;
    let cur = key;
    let useTable1 = true;
    for (let i = 0; i < this.maxLoop; i++) {
      if (useTable1) {
        const idx = this.h1(cur);
        if (this.table1[idx] === null) { this.table1[idx] = cur; return true; }
        const tmp = this.table1[idx]!;
        this.table1[idx] = cur;
        cur = tmp;
      } else {
        const idx = this.h2(cur);
        if (this.table2[idx] === null) { this.table2[idx] = cur; return true; }
        const tmp = this.table2[idx]!;
        this.table2[idx] = cur;
        cur = tmp;
      }
      useTable1 = !useTable1;
    }
    return false;
  }
}
```

```cpp
#include <vector>
#include <optional>
#include <cstdint>
#include <algorithm>

class CuckooHashTable {
public:
    explicit CuckooHashTable(int size)
        : size_(size), table1_(size), table2_(size), maxLoop_(std::max(size, 8)) {}

    bool contains(int key) const {
        return table1_[h1(key)] == key || table2_[h2(key)] == key;
    }

    bool insert(int key) {
        if (contains(key)) return true;
        int cur = key;
        bool useTable1 = true;
        for (int i = 0; i < maxLoop_; i++) {
            if (useTable1) {
                int idx = h1(cur);
                if (!table1_[idx].has_value()) { table1_[idx] = cur; return true; }
                std::swap(cur, *table1_[idx]);
            } else {
                int idx = h2(cur);
                if (!table2_[idx].has_value()) { table2_[idx] = cur; return true; }
                std::swap(cur, *table2_[idx]);
            }
            useTable1 = !useTable1;
        }
        return false;  // 玉突きが上限に達した場合、呼び出し側でリハッシュが必要
    }

private:
    static constexpr int64_t A1 = 2654435761;
    static constexpr int64_t A2 = 40503;
    static constexpr int64_t B2 = 12345;

    int h1(int key) const { return static_cast<int>((static_cast<int64_t>(key) * A1) % size_); }
    int h2(int key) const { return static_cast<int>((static_cast<int64_t>(key) * A2 + B2) % size_); }

    int size_;
    std::vector<std::optional<int>> table1_, table2_;
    int maxLoop_;
};
```

```rust
struct CuckooHashTable {
    size: usize,
    table1: Vec<Option<i64>>,
    table2: Vec<Option<i64>>,
    max_loop: usize,
}

impl CuckooHashTable {
    const A1: i64 = 2654435761;
    const A2: i64 = 40503;
    const B2: i64 = 12345;

    fn new(size: usize) -> Self {
        CuckooHashTable {
            size,
            table1: vec![None; size],
            table2: vec![None; size],
            max_loop: size.max(8),
        }
    }

    fn h1(&self, key: i64) -> usize {
        (key * Self::A1).rem_euclid(self.size as i64) as usize
    }
    fn h2(&self, key: i64) -> usize {
        (key * Self::A2 + Self::B2).rem_euclid(self.size as i64) as usize
    }

    fn contains(&self, key: i64) -> bool {
        self.table1[self.h1(key)] == Some(key) || self.table2[self.h2(key)] == Some(key)
    }

    fn insert(&mut self, key: i64) -> bool {
        if self.contains(key) {
            return true;
        }
        let mut cur = key;
        let mut use_table1 = true;
        for _ in 0..self.max_loop {
            if use_table1 {
                let idx = self.h1(cur);
                match self.table1[idx] {
                    None => { self.table1[idx] = Some(cur); return true; }
                    Some(existing) => { self.table1[idx] = Some(cur); cur = existing; }
                }
            } else {
                let idx = self.h2(cur);
                match self.table2[idx] {
                    None => { self.table2[idx] = Some(cur); return true; }
                    Some(existing) => { self.table2[idx] = Some(cur); cur = existing; }
                }
            }
            use_table1 = !use_table1;
        }
        false  // 玉突きが上限に達した場合、呼び出し側でリハッシュが必要
    }
}
```

```csharp
class CuckooHashTable
{
    private const long A1 = 2654435761;
    private const long A2 = 40503;
    private const long B2 = 12345;

    private readonly int size;
    private readonly int?[] table1;
    private readonly int?[] table2;
    private readonly int maxLoop;

    public CuckooHashTable(int size)
    {
        this.size = size;
        table1 = new int?[size];
        table2 = new int?[size];
        maxLoop = Math.Max(size, 8);
    }

    private int H1(int key) => (int)((key * A1) % size);
    private int H2(int key) => (int)(((key * A2) + B2) % size);

    public bool Contains(int key) => table1[H1(key)] == key || table2[H2(key)] == key;

    public bool Insert(int key)
    {
        if (Contains(key)) return true;
        int cur = key;
        bool useTable1 = true;
        for (int i = 0; i < maxLoop; i++)
        {
            if (useTable1)
            {
                int idx = H1(cur);
                if (table1[idx] is null) { table1[idx] = cur; return true; }
                (cur, table1[idx]) = (table1[idx]!.Value, cur);
            }
            else
            {
                int idx = H2(cur);
                if (table2[idx] is null) { table2[idx] = cur; return true; }
                (cur, table2[idx]) = (table2[idx]!.Value, cur);
            }
            useTable1 = !useTable1;
        }
        return false;  // 玉突きが上限に達した場合、呼び出し側でリハッシュが必要
    }
}
```
