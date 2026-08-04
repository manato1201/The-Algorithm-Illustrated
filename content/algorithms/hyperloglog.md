---
name: HyperLogLog
category: データ構造
subcategory: 確率的・キャッシュ構造
complexity: O(1)(1回の追加)、O(m)の固定メモリ(mはレジスタ数、通常数KB程度)
summary: ハッシュ値の先頭に連続するゼロが何個続くかという確率的な性質を利用し、数十億件のユニークな要素数をわずか数KBのメモリで高精度に推定するカーディナリティ推定アルゴリズム。
---

## 概要

「このWebサイトのユニーク訪問者数は何人か」「このログに含まれる異なるIPアドレスは何種類か」というカーディナリティ(集合の相異なる要素数)の推定は、素朴には全要素をハッシュセットに記録する必要があり、要素数が数十億に達するとメモリを膨大に消費する。2007年にフラジョレとその共同研究者が発表したHyperLogLogは、「公平なコインを投げ続けたとき、連続して表が出る回数の最大値から、大まかに何回コインを投げたかを逆算できる」という確率論的な観察を応用し、わずか数KBのメモリで数十億件規模のカーディナリティを誤差1〜2%程度で推定する、驚異的に効率的なアルゴリズムである。

## 仕組み

1. 各要素をハッシュ関数で一様なビット列に変換する
2. ハッシュ値の先頭数ビットを使って、`m`個の「レジスタ」のどれに割り当てるかを決める(`m`個に振り分けることで推定精度を上げる、[Count-Min Sketch](/algorithms/count-min-sketch)の複数ハッシュ関数と似た多重化の発想)
3. 残りのビット列について、「先頭から連続する0の個数+1」(これを`ρ`とする)を計算する。公平なコインを投げ続けて表が`k`回連続する確率は`(1/2)^k`と非常に低いため、`ρ`が大きい値を観測できたということは、それだけ多くの異なる要素をハッシュした証拠になる、という直感がこのアルゴリズムの核心である
4. 各レジスタには、そのレジスタに割り当てられた要素の中で観測された`ρ`の**最大値**だけを記録する(1バイト未満の情報量で済む)
5. 全レジスタの値から、調和平均をベースにした統計的な補正式を使って、集合全体のカーディナリティ(相異なる要素数)を推定する。`m`個のレジスタに分散して観測することで、1つのレジスタだけを見るより推定のばらつきを大幅に抑えられる

## 特性・トレードオフ

- **計算量**: 要素の追加は対応するレジスタの最大値更新だけなので`O(1)`。メモリ使用量は要素数に一切依存せず、レジスタ数`m`(通常数千程度)だけで決まる固定サイズ——数十億件のデータでもわずか数KBで済む
- **驚異的な省メモリ性**: 素朴なハッシュセットで同じ精度の集合を管理すると数百MB〜数GB必要になる場面でも、HyperLogLogならわずか1.5KB程度(標準誤差2%の設定)で済むことが知られている——確率的データ構造の中でも特に劇的な省メモリ効果を持つ代表例
- **推定値には常に誤差が伴う**: 統計的な推定であるため、真の値と厳密に一致することは保証されない(標準誤差はレジスタ数`m`の平方根に反比例し、`m`を増やせば精度は上がるがメモリも増える)。正確なカウントが必須の場面(課金など)には使えない
- **和集合演算の容易さ**: 複数のHyperLogLogは、各レジスタの最大値同士を比較して大きい方を取るだけで簡単に「和集合」のカーディナリティ推定に統合できる——分散システムで各サーバーが個別に集計した結果を後から統合する用途に理想的に適している
- **使いどころ**: Webサイトのユニークビジター数のリアルタイム集計、データベース(Redis、PostgreSQL等)に組み込まれた近似カーディナリティ関数、大規模分散ログ解析における相異なる値の種類数の推定

## 実装例

```python
MASK32 = 0xFFFFFFFF

def hash32(s: str) -> int:
    """言語間で挙動が揃う決定的なFNV-1aハッシュ(組み込みhash()はプロセスごとに変わるため使わない)"""
    h = 0x811C9DC5
    for byte in s.encode("utf-8"):
        h ^= byte
        h = (h * 0x01000193) & MASK32
    return h


class HyperLogLog:
    def __init__(self, b: int = 8):  # b桁のレジスタインデックス -> m = 2^b 個のレジスタ
        self.b = b
        self.m = 1 << b
        self.registers = [0] * self.m
        if self.m == 16:
            self.alpha = 0.673
        elif self.m == 32:
            self.alpha = 0.697
        elif self.m == 64:
            self.alpha = 0.709
        else:
            self.alpha = 0.7213 / (1 + 1.079 / self.m)

    def add(self, item: str) -> None:
        x = hash32(item)
        idx = x >> (32 - self.b)
        rest = (x << self.b) & MASK32
        rho = 1
        while rest & 0x80000000 == 0 and rho <= (32 - self.b):
            rest = (rest << 1) & MASK32
            rho += 1
        if rho > self.registers[idx]:
            self.registers[idx] = rho

    def estimate(self) -> float:
        z = sum(2.0 ** (-r) for r in self.registers)
        return self.alpha * self.m * self.m / z
```

```typescript
const MASK32 = 0xffffffff;

function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

class HyperLogLog {
  private b: number;
  private m: number;
  private registers: number[];
  private alpha: number;

  constructor(b = 8) {
    this.b = b;
    this.m = 1 << b;
    this.registers = new Array(this.m).fill(0);
    if (this.m === 16) this.alpha = 0.673;
    else if (this.m === 32) this.alpha = 0.697;
    else if (this.m === 64) this.alpha = 0.709;
    else this.alpha = 0.7213 / (1 + 1.079 / this.m);
  }

  add(item: string): void {
    const x = hash32(item);
    const idx = x >>> (32 - this.b);
    let rest = (x << this.b) >>> 0;
    let rho = 1;
    while ((rest & 0x80000000) === 0 && rho <= 32 - this.b) {
      rest = (rest << 1) >>> 0;
      rho++;
    }
    if (rho > this.registers[idx]) this.registers[idx] = rho;
  }

  estimate(): number {
    let z = 0;
    for (const r of this.registers) z += Math.pow(2, -r);
    return (this.alpha * this.m * this.m) / z;
  }
}
```

```cpp
#include <vector>
#include <string>
#include <cstdint>
#include <cmath>

uint32_t hash32(const std::string& s) {
    uint32_t h = 0x811C9DC5u;
    for (unsigned char c : s) {
        h ^= c;
        h *= 0x01000193u;
    }
    return h;
}

class HyperLogLog {
public:
    explicit HyperLogLog(int b = 8) : b_(b), m_(1u << b) {
        registers_.assign(m_, 0);
        if (m_ == 16) alpha_ = 0.673;
        else if (m_ == 32) alpha_ = 0.697;
        else if (m_ == 64) alpha_ = 0.709;
        else alpha_ = 0.7213 / (1 + 1.079 / m_);
    }

    void add(const std::string& item) {
        uint32_t x = hash32(item);
        uint32_t idx = x >> (32 - b_);
        uint32_t rest = x << b_;
        int rho = 1;
        while ((rest & 0x80000000u) == 0 && rho <= 32 - b_) {
            rest <<= 1;
            rho++;
        }
        if (rho > registers_[idx]) registers_[idx] = rho;
    }

    double estimate() const {
        double z = 0.0;
        for (int r : registers_) z += std::pow(2.0, -r);
        return alpha_ * m_ * m_ / z;
    }

private:
    int b_;
    uint32_t m_;
    std::vector<int> registers_;
    double alpha_;
};
```

```rust
fn hash32(s: &str) -> u32 {
    let mut h: u32 = 0x811C9DC5;
    for b in s.as_bytes() {
        h ^= *b as u32;
        h = h.wrapping_mul(0x01000193);
    }
    h
}

struct HyperLogLog {
    b: u32,
    m: usize,
    registers: Vec<u8>,
    alpha: f64,
}

impl HyperLogLog {
    fn new(b: u32) -> Self {
        let m = 1usize << b;
        let alpha = if m == 16 {
            0.673
        } else if m == 32 {
            0.697
        } else if m == 64 {
            0.709
        } else {
            0.7213 / (1.0 + 1.079 / m as f64)
        };
        HyperLogLog { b, m, registers: vec![0; m], alpha }
    }

    fn add(&mut self, item: &str) {
        let x = hash32(item);
        let idx = (x >> (32 - self.b)) as usize;
        let mut rest = x << self.b;
        let mut rho: u8 = 1;
        while (rest & 0x8000_0000) == 0 && (rho as u32) <= 32 - self.b {
            rest <<= 1;
            rho += 1;
        }
        if rho > self.registers[idx] {
            self.registers[idx] = rho;
        }
    }

    fn estimate(&self) -> f64 {
        let z: f64 = self.registers.iter().map(|&r| 2f64.powi(-(r as i32))).sum();
        self.alpha * (self.m as f64) * (self.m as f64) / z
    }
}
```

```csharp
static uint Hash32(string s)
{
    uint h = 0x811C9DC5;
    foreach (byte b in System.Text.Encoding.UTF8.GetBytes(s))
    {
        h ^= b;
        h = unchecked(h * 0x01000193);
    }
    return h;
}

class HyperLogLog
{
    private readonly int b;
    private readonly int m;
    private readonly int[] registers;
    private readonly double alpha;

    public HyperLogLog(int b = 8)
    {
        this.b = b;
        m = 1 << b;
        registers = new int[m];
        if (m == 16) alpha = 0.673;
        else if (m == 32) alpha = 0.697;
        else if (m == 64) alpha = 0.709;
        else alpha = 0.7213 / (1 + 1.079 / m);
    }

    public void Add(string item)
    {
        uint x = Hash32(item);
        int idx = (int)(x >> (32 - b));
        uint rest = unchecked(x << b);
        int rho = 1;
        while ((rest & 0x80000000) == 0 && rho <= 32 - b)
        {
            rest = unchecked(rest << 1);
            rho++;
        }
        if (rho > registers[idx]) registers[idx] = rho;
    }

    public double Estimate()
    {
        double z = 0;
        foreach (var r in registers) z += Math.Pow(2, -r);
        return alpha * m * m / z;
    }
}
```
