---
name: Count-Min Sketch
category: データ構造
subcategory: 確率的・キャッシュ構造
complexity: O(1)(1回の更新・クエリ)、O(w×d)の固定メモリ(w幅、d深さ)
summary: 複数のハッシュ関数で要素をカウンタ配列の複数行にマッピングし、その最小値を頻度の推定値とすることで、巨大なストリームデータの出現頻度を固定メモリで近似的に追跡する確率的データ構造。
---

## 概要

[ブルームフィルタ](/algorithms/bloom-filter)が「集合に含まれるかどうか」を確率的に答えるのに対し、Count-Min Sketchは「その要素がこれまでに何回出現したか」という頻度を、要素の種類数に関わらず固定サイズのメモリで近似的に答える確率的データ構造である。2003年にコーミードとムスタギがEUROPEAN SYMPOSIUM ON ALGORITHMSで発表したこの手法は、Twitterのトレンド検出やネットワークのトラフィック解析のように、巨大でリアルタイムに流れ続けるデータ(ストリーム)から「よく出てくるもの」を効率的に把握する必要がある場面で広く使われている。

## 仕組み

1. `d`個の独立したハッシュ関数と、それぞれに対応する幅`w`のカウンタ配列(合計`d×w`個のカウンタ、全て0で初期化)を用意する
2. **更新(要素`x`の出現を記録)**: `d`個のハッシュ関数それぞれで`x`をハッシュし、対応する`d`個のカウンタ(各行1つずつ)を1ずつ増やす
3. **クエリ(要素`x`の頻度を推定)**: 同じ`d`個のハッシュ関数で`x`をハッシュし、対応する`d`個のカウンタの値を全て見て、その**最小値**を`x`の頻度の推定値として返す
4. 最小値を取るのが精度の鍵になる——複数の異なる要素が同じハッシュ値に衝突すると、そのカウンタは実際より大きい値になってしまう(過大評価は起こりうるが過小評価は起こらない)ため、`d`個の独立したハッシュ関数のうち「最も衝突の影響を受けていなさそうな」最小値を選ぶことで、推定精度を高めている

## 特性・トレードオフ

- **計算量**: 更新・クエリともに`d`個のハッシュ関数の計算だけで済むため`O(d)`(定数)。メモリ使用量は`w×d`個のカウンタで固定されており、要素の種類数がどれだけ多くても増加しない
- **一方向の誤差のみ**: 推定値は必ず真の頻度以上になる(過大評価はありうるが過小評価は絶対に起こらない)ことが数学的に保証されている——[ブルームフィルタ](/algorithms/bloom-filter)の「偽陽性はあるが偽陰性はない」という性質と同じ設計思想の頻度版と言える
- **幅`w`・深さ`d`と精度のトレードオフ**: `w`(各行の幅)を大きくすると衝突が減り精度が上がるが、その分メモリを消費する。`d`(行数)を増やすと、最小値を取ることによる誤差抑制効果が強まるが、更新・クエリのコストも増える——用途に応じたパラメータ調整が実務上の課題になる
- **使いどころ**: SNSのトレンドキーワード検出、ネットワークルーターにおけるヘビーヒッター(大量のトラフィックを占める送信元)の検出、データベースのクエリ最適化における値の頻度分布の推定、ストリーム処理フレームワーク(Apache Flink等)における近似集計

## 実装例

```python
class CountMinSketch:
    def __init__(self, width: int, depth: int):
        self.width = width
        self.depth = depth
        self.table = [[0] * width for _ in range(depth)]
        self.seeds = [i * 2654435761 % 1000000007 for i in range(depth)]

    def _fnv_hash(self, s: str, seed: int) -> int:
        h = (2166136261 ^ seed) & 0xFFFFFFFF
        for ch in s:
            h ^= ord(ch)
            h = (h * 16777619) & 0xFFFFFFFF
        return h

    def _indices(self, item: str) -> list[int]:
        return [self._fnv_hash(item, seed) % self.width for seed in self.seeds]

    def add(self, item: str, count: int = 1) -> None:
        for row, idx in enumerate(self._indices(item)):
            self.table[row][idx] += count

    def estimate(self, item: str) -> int:
        return min(self.table[row][idx] for row, idx in enumerate(self._indices(item)))
```

```typescript
function fnvHash(s: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

class CountMinSketch {
  width: number;
  depth: number;
  table: number[][];
  seeds: number[];

  constructor(width: number, depth: number) {
    this.width = width;
    this.depth = depth;
    this.table = Array.from({ length: depth }, () => new Array(width).fill(0));
    this.seeds = Array.from({ length: depth }, (_, i) => (i * 2654435761) % 1000000007);
  }

  private indices(item: string): number[] {
    return this.seeds.map((seed) => fnvHash(item, seed) % this.width);
  }

  add(item: string, count = 1): void {
    const idxs = this.indices(item);
    for (let row = 0; row < this.depth; row++) {
      this.table[row][idxs[row]] += count;
    }
  }

  estimate(item: string): number {
    const idxs = this.indices(item);
    return Math.min(...idxs.map((idx, row) => this.table[row][idx]));
  }
}
```

```cpp
#include <vector>
#include <string>
#include <cstdint>
#include <algorithm>

class CountMinSketch {
public:
    CountMinSketch(int width, int depth) : width_(width), depth_(depth) {
        table_.assign(depth, std::vector<int>(width, 0));
        seeds_.resize(depth);
        for (int i = 0; i < depth; i++) {
            seeds_[i] = static_cast<uint32_t>((static_cast<int64_t>(i) * 2654435761LL) % 1000000007LL);
        }
    }

    void add(const std::string& item, int count = 1) {
        auto idx = indices(item);
        for (int row = 0; row < depth_; row++) table_[row][idx[row]] += count;
    }

    int estimate(const std::string& item) const {
        auto idx = indices(item);
        int result = table_[0][idx[0]];
        for (int row = 1; row < depth_; row++) result = std::min(result, table_[row][idx[row]]);
        return result;
    }

private:
    static uint32_t fnvHash(const std::string& s, uint32_t seed) {
        uint32_t h = 2166136261u ^ seed;
        for (unsigned char ch : s) {
            h ^= ch;
            h *= 16777619u;
        }
        return h;
    }

    std::vector<int> indices(const std::string& item) const {
        std::vector<int> idx(depth_);
        for (int i = 0; i < depth_; i++) {
            idx[i] = static_cast<int>(fnvHash(item, seeds_[i]) % static_cast<uint32_t>(width_));
        }
        return idx;
    }

    int width_, depth_;
    std::vector<std::vector<int>> table_;
    std::vector<uint32_t> seeds_;
};
```

```rust
struct CountMinSketch {
    width: usize,
    depth: usize,
    table: Vec<Vec<u32>>,
    seeds: Vec<u32>,
}

impl CountMinSketch {
    fn new(width: usize, depth: usize) -> Self {
        let table = vec![vec![0u32; width]; depth];
        let seeds: Vec<u32> = (0..depth)
            .map(|i| ((i as u64 * 2654435761) % 1000000007) as u32)
            .collect();
        CountMinSketch { width, depth, table, seeds }
    }

    fn fnv_hash(s: &str, seed: u32) -> u32 {
        let mut h: u32 = 2166136261u32 ^ seed;
        for b in s.bytes() {
            h ^= b as u32;
            h = h.wrapping_mul(16777619);
        }
        h
    }

    fn indices(&self, item: &str) -> Vec<usize> {
        self.seeds
            .iter()
            .map(|&seed| (Self::fnv_hash(item, seed) % self.width as u32) as usize)
            .collect()
    }

    fn add(&mut self, item: &str, count: u32) {
        let idx = self.indices(item);
        for row in 0..self.depth {
            self.table[row][idx[row]] += count;
        }
    }

    fn estimate(&self, item: &str) -> u32 {
        let idx = self.indices(item);
        (0..self.depth).map(|row| self.table[row][idx[row]]).min().unwrap()
    }
}
```

```csharp
class CountMinSketch
{
    private readonly int width, depth;
    private readonly int[][] table;
    private readonly int[] seeds;

    public CountMinSketch(int width, int depth)
    {
        this.width = width;
        this.depth = depth;
        table = new int[depth][];
        for (int i = 0; i < depth; i++) table[i] = new int[width];
        seeds = new int[depth];
        for (int i = 0; i < depth; i++) seeds[i] = (int)((long)i * 2654435761 % 1000000007);
    }

    private static uint FnvHash(string s, int seed)
    {
        uint h = (uint)(2166136261 ^ seed);
        foreach (char ch in s)
        {
            h ^= ch;
            h *= 16777619;
        }
        return h;
    }

    private int[] Indices(string item)
    {
        var idx = new int[depth];
        for (int i = 0; i < depth; i++) idx[i] = (int)(FnvHash(item, seeds[i]) % (uint)width);
        return idx;
    }

    public void Add(string item, int count = 1)
    {
        var idx = Indices(item);
        for (int row = 0; row < depth; row++) table[row][idx[row]] += count;
    }

    public int Estimate(string item)
    {
        var idx = Indices(item);
        int min = int.MaxValue;
        for (int row = 0; row < depth; row++) min = Math.Min(min, table[row][idx[row]]);
        return min;
    }
}
```
