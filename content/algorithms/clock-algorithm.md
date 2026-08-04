---
name: Clockアルゴリズム(LRU近似)
category: スケジューリング
subcategory: キャッシュ置換ポリシー
complexity: O(1)(償却、平均的なケース)
summary: 時計の針のようにページを円環状に巡回し、参照ビットを見ながら追い出す候補を探すことで、真のLRUに近い挙動を軽量なビット操作だけで実現する近似アルゴリズム。
---

## 概要

[LRUキャッシュ](/algorithms/lru-cache)は理論的に優れた挙動を示すが、OSの仮想メモリのページ置換のように、極めて大量のページに対してアクセスのたびに正確な「最近使った順」を厳密に更新し続けるのはオーバーヘッドが大きい。Clockアルゴリズムは、各ページに1ビットの「参照ビット」だけを持たせ、ページを時計の文字盤のように円環状に並べて針(ポインタ)を進めながら置換候補を探すことで、真のLRUを厳密に実装するコストを避けながら、実用上十分に近い挙動を軽量に実現する、近似LRUの代表的な手法である。

## 仕組み

1. 全てのキャッシュ(ページ)フレームを円環状のリストとして並べ、各フレームに1ビットの参照ビット(初期値0)を持たせる。「針」がこの円環上のどこかを指している状態から始める
2. ページが参照される(読み書きされる)たびに、そのページの参照ビットを1に設定する(ハードウェアのメモリ管理ユニットがこの設定を自動的に行うことが多い)
3. 新しいページを追加する必要があり、キャッシュが満杯のとき、針が指しているフレームを調べる: (a) 参照ビットが0なら、そのフレームのページを追い出して新しいページに置き換え、針を次に進める、(b) 参照ビットが1なら、それを0にリセットして(「最近使われたがもう一度チャンスを与える」という意味)、針を次のフレームへ進め、この判定を繰り返す
4. 針は円環を1周する間に、参照ビットが1のフレームを次々に0へリセットしながら進むため、最終的に必ず参照ビットが0のフレーム(=直近1周の間に一度もアクセスされなかったフレーム)に行き当たり、そこが追い出しの対象になる

## 特性・トレードオフ

- **計算量**: 各追い出し判定は、最悪の場合キャッシュ全体を1周するが、償却計算量(ならしの計算量)としては`O(1)`に近い性能が出ることが多い——[LRUキャッシュ](/algorithms/lru-cache)の双方向連結リストのような、アクセスのたびにリストを組み替える重い操作が不要な点が大きな利点になる
- **「セカンドチャンス」の考え方**: 参照ビットが1のページを即座に追い出さず、いったん0にリセットして針を先に進めるだけにする「セカンドチャンス」の仕組みが、Clockアルゴリズムの核心である。頻繁に使われるページは針が一周する間に何度も参照ビットが1に戻され、結果としてなかなか追い出されない——これが真のLRUの「最近使われたものは残す」という性質を、簡易なビット操作だけで近似している
- **真のLRUとの精度の差**: Clockアルゴリズムは「直近1周の間に使われたかどうか」という粗い情報しか持たないため、[LRUキャッシュ](/algorithms/lru-cache)が持つ「正確な使用順序」までは再現できない。しかし実用上、この精度の差がシステム性能に与える影響は小さいことが多く、実装の軽量さとのトレードオフとして広く受け入れられている
- **使いどころ**: オペレーティングシステムの仮想メモリにおけるページ置換アルゴリズム(多くの実用OSがこの方式、またはその改良版(拡張参照ビット付きのClock-Pro等)を採用している)、データベースのバッファプール管理における軽量な近似LRU実装

## 実装例

```python
class ClockCache:
    def __init__(self, capacity: int):
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self.frames: list[int | None] = [None] * capacity
        self.ref_bits = [False] * capacity
        self.index: dict[int, int] = {}
        self.hand = 0

    def access(self, page: int) -> bool:
        """既にキャッシュ済みならTrue(ヒット)、追い出しが発生したらFalseを返す。"""
        if page in self.index:
            self.ref_bits[self.index[page]] = True
            return True
        self._load(page)
        return False

    def _load(self, page: int) -> None:
        while True:
            if self.frames[self.hand] is None:
                self._place(page, self.hand)
                self._advance()
                return
            if not self.ref_bits[self.hand]:
                evicted = self.frames[self.hand]
                del self.index[evicted]
                self._place(page, self.hand)
                self._advance()
                return
            self.ref_bits[self.hand] = False
            self._advance()

    def _place(self, page: int, slot: int) -> None:
        self.frames[slot] = page
        self.ref_bits[slot] = True
        self.index[page] = slot

    def _advance(self) -> None:
        self.hand = (self.hand + 1) % self.capacity
```

```typescript
class ClockCache {
  private capacity: number;
  private frames: (number | null)[];
  private refBits: boolean[];
  private index = new Map<number, number>();
  private hand = 0;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error("capacity must be positive");
    this.capacity = capacity;
    this.frames = new Array(capacity).fill(null);
    this.refBits = new Array(capacity).fill(false);
  }

  access(page: number): boolean {
    if (this.index.has(page)) {
      this.refBits[this.index.get(page)!] = true;
      return true;
    }
    this.load(page);
    return false;
  }

  private load(page: number): void {
    for (;;) {
      if (this.frames[this.hand] === null) {
        this.place(page, this.hand);
        this.advance();
        return;
      }
      if (!this.refBits[this.hand]) {
        const evicted = this.frames[this.hand]!;
        this.index.delete(evicted);
        this.place(page, this.hand);
        this.advance();
        return;
      }
      this.refBits[this.hand] = false;
      this.advance();
    }
  }

  private place(page: number, slot: number): void {
    this.frames[slot] = page;
    this.refBits[slot] = true;
    this.index.set(page, slot);
  }

  private advance(): void {
    this.hand = (this.hand + 1) % this.capacity;
  }
}
```

```cpp
#include <vector>
#include <unordered_map>
#include <optional>
#include <stdexcept>

class ClockCache {
    int capacity;
    std::vector<std::optional<int>> frames;
    std::vector<bool> refBits;
    std::unordered_map<int, int> index;
    int hand = 0;

public:
    explicit ClockCache(int capacity) : capacity(capacity), frames(capacity), refBits(capacity, false) {
        if (capacity <= 0) throw std::invalid_argument("capacity must be positive");
    }

    bool access(int page) {
        auto it = index.find(page);
        if (it != index.end()) {
            refBits[it->second] = true;
            return true;
        }
        load(page);
        return false;
    }

private:
    void load(int page) {
        while (true) {
            if (!frames[hand].has_value()) {
                place(page, hand);
                advance();
                return;
            }
            if (!refBits[hand]) {
                int evicted = frames[hand].value();
                index.erase(evicted);
                place(page, hand);
                advance();
                return;
            }
            refBits[hand] = false;
            advance();
        }
    }

    void place(int page, int slot) {
        frames[slot] = page;
        refBits[slot] = true;
        index[page] = slot;
    }

    void advance() { hand = (hand + 1) % capacity; }
};
```

```rust
use std::collections::HashMap;

struct ClockCache {
    capacity: usize,
    frames: Vec<Option<i64>>,
    ref_bits: Vec<bool>,
    index: HashMap<i64, usize>,
    hand: usize,
}

impl ClockCache {
    fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "capacity must be positive");
        ClockCache {
            capacity,
            frames: vec![None; capacity],
            ref_bits: vec![false; capacity],
            index: HashMap::new(),
            hand: 0,
        }
    }

    fn access(&mut self, page: i64) -> bool {
        if let Some(&slot) = self.index.get(&page) {
            self.ref_bits[slot] = true;
            return true;
        }
        self.load(page);
        false
    }

    fn load(&mut self, page: i64) {
        loop {
            if self.frames[self.hand].is_none() {
                self.place(page, self.hand);
                self.advance();
                return;
            }
            if !self.ref_bits[self.hand] {
                let evicted = self.frames[self.hand].unwrap();
                self.index.remove(&evicted);
                self.place(page, self.hand);
                self.advance();
                return;
            }
            self.ref_bits[self.hand] = false;
            self.advance();
        }
    }

    fn place(&mut self, page: i64, slot: usize) {
        self.frames[slot] = Some(page);
        self.ref_bits[slot] = true;
        self.index.insert(page, slot);
    }

    fn advance(&mut self) {
        self.hand = (self.hand + 1) % self.capacity;
    }
}
```

```csharp
class ClockCache
{
    private readonly int _capacity;
    private readonly int?[] _frames;
    private readonly bool[] _refBits;
    private readonly Dictionary<int, int> _index = new();
    private int _hand;

    public ClockCache(int capacity)
    {
        if (capacity <= 0) throw new ArgumentException("capacity must be positive");
        _capacity = capacity;
        _frames = new int?[capacity];
        _refBits = new bool[capacity];
    }

    public bool Access(int page)
    {
        if (_index.TryGetValue(page, out int slot))
        {
            _refBits[slot] = true;
            return true;
        }
        Load(page);
        return false;
    }

    private void Load(int page)
    {
        while (true)
        {
            if (_frames[_hand] == null)
            {
                Place(page, _hand);
                Advance();
                return;
            }
            if (!_refBits[_hand])
            {
                int evicted = _frames[_hand]!.Value;
                _index.Remove(evicted);
                Place(page, _hand);
                Advance();
                return;
            }
            _refBits[_hand] = false;
            Advance();
        }
    }

    private void Place(int page, int slot)
    {
        _frames[slot] = page;
        _refBits[slot] = true;
        _index[page] = slot;
    }

    private void Advance() => _hand = (_hand + 1) % _capacity;
}
```
