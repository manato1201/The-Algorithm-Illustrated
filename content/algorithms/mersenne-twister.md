---
name: メルセンヌ・ツイスタ(Mersenne Twister)
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(1)(1個の乱数生成あたり、償却)
summary: 周期2^19937-1という天文学的な長さと623次元均等分布を持つ擬似乱数生成器。速度と統計的品質の高さから、シミュレーションやゲームの標準乱数として広く使われる。
---

## 概要

ゲームのドロップ抽選やシャッフル、モンテカルロシミュレーションでは、大量の乱数を高速に、かつ「あるパターンが特定の周期で繰り返される」ような統計的な偏りなく生成し続ける必要がある。線形合同法のような古典的な擬似乱数生成器は実装が単純な反面、周期が短く、多次元的な分布に偏りが出やすいという弱点があった。メルセンヌ・ツイスタは1997年に松本眞・西村拓士が発表したアルゴリズムで、メルセンヌ素数`2^19937 - 1`に由来する超長周期と、623次元まで均等に分布するという強力な統計的性質を両立しながら、単純なビット演算だけで高速に動作する。C++の`std::mt19937`、Pythonの`random`モジュール、多くのゲームエンジンの既定の乱数生成器として採用されている。

## 仕組み

1. **状態**: 32bit整数を624個並べた配列(合計19937bit)を内部状態として持つ。この状態は「ねじれフィードバック付き線形フィードバックシフトレジスタ(Twisted GFSR)」という漸化式で更新される
2. **初期化**: シード値から624個の状態を、線形合同法に似た単純な漸化式(`state[i] = 1812433253 * (state[i-1] xor (state[i-1] >> 30)) + i`)で埋める
3. **リフレッシュ(twist)**: 状態配列を624個すべて使い切ったら、隣接する状態同士を「上位1bitと下位31bitを組み合わせ、奇数なら特定の定数(タンパリング行列)とXORする」という操作で一斉に更新する。これが「ツイスト」と呼ばれる漸化式で、状態空間全体を巡回する超長周期を生み出す核心部分
4. **出力(tempering)**: 624個のうち1つを取り出し、右シフト・左シフト・AND・XORを組み合わせた「テンパリング」という後処理を施して出力する。このテンパリングが、生成される乱数列の統計的な均等性(検定をパスしやすい性質)を作り出す
5. 624個の状態を使い切るたびに2〜4のリフレッシュを行い、それ以外は3の出力処理だけを繰り返すため、1回あたりの生成コストはO(1)(償却)

## 特性・トレードオフ

- **圧倒的な周期の長さ**: 周期`2^19937 - 1`は宇宙の年齢を秒単位で回しても枯渇しない長さで、実用上「周期切れ」を心配する必要がない
- **623次元均等分布**: 生成した乱数を623個ずつ組にしても統計的な偏りが出にくいことが理論的に保証されており、モンテカルロ法のような多次元サンプリングにも安心して使える
- **暗号用途には不向き**: 内部状態(624個の32bit整数)が出力列からある程度復元可能なため、次に出る乱数を予測できてしまう。ゲームのドロップ抽選やシミュレーションには十分だが、鍵生成やトークン発行のような暗号学的用途にはCSPRNG(暗号論的擬似乱数生成器)を使う必要がある
- **使いどころ**: ゲームのドロップ率抽選・シャッフル・NPCの行動選択、物理シミュレーションやモンテカルロ法、統計的検証が必要な乱数全般。C++標準ライブラリ・Python・多くのゲームエンジンの既定の乱数エンジンとして定着している

## 実装例

```python
class MersenneTwister:
    N, M = 624, 397
    MATRIX_A = 0x9908B0DF
    UPPER_MASK, LOWER_MASK = 0x80000000, 0x7FFFFFFF

    def __init__(self, seed: int):
        self.mt = [0] * self.N
        self.mt[0] = seed & 0xFFFFFFFF
        for i in range(1, self.N):
            self.mt[i] = (1812433253 * (self.mt[i - 1] ^ (self.mt[i - 1] >> 30)) + i) & 0xFFFFFFFF
        self.index = self.N

    def _twist(self) -> None:
        for i in range(self.N):
            y = (self.mt[i] & self.UPPER_MASK) | (self.mt[(i + 1) % self.N] & self.LOWER_MASK)
            self.mt[i] = self.mt[(i + self.M) % self.N] ^ (y >> 1)
            if y % 2 != 0:
                self.mt[i] ^= self.MATRIX_A
        self.index = 0

    def next_u32(self) -> int:
        if self.index >= self.N:
            self._twist()
        y = self.mt[self.index]
        y ^= (y >> 11)
        y ^= (y << 7) & 0x9D2C5680
        y ^= (y << 15) & 0xEFC60000
        y ^= (y >> 18)
        self.index += 1
        return y & 0xFFFFFFFF
```

```typescript
class MersenneTwister {
  private static readonly N = 624;
  private static readonly M = 397;
  private static readonly MATRIX_A = 0x9908b0df;
  private static readonly UPPER_MASK = 0x80000000;
  private static readonly LOWER_MASK = 0x7fffffff;

  private mt: Uint32Array = new Uint32Array(MersenneTwister.N);
  private index: number;

  constructor(seed: number) {
    this.mt[0] = seed >>> 0;
    for (let i = 1; i < MersenneTwister.N; i++) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.index = MersenneTwister.N;
  }

  private twist(): void {
    for (let i = 0; i < MersenneTwister.N; i++) {
      const y =
        (this.mt[i] & MersenneTwister.UPPER_MASK) |
        (this.mt[(i + 1) % MersenneTwister.N] & MersenneTwister.LOWER_MASK);
      this.mt[i] =
        this.mt[(i + MersenneTwister.M) % MersenneTwister.N] ^ (y >>> 1);
      if (y % 2 !== 0) this.mt[i] ^= MersenneTwister.MATRIX_A;
    }
    this.index = 0;
  }

  nextU32(): number {
    if (this.index >= MersenneTwister.N) this.twist();
    let y = this.mt[this.index];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    this.index++;
    return y >>> 0;
  }
}
```

```cpp
#include <cstdint>
#include <array>

class MersenneTwister {
    static constexpr int N = 624, M = 397;
    static constexpr uint32_t MATRIX_A = 0x9908B0DFu;
    static constexpr uint32_t UPPER_MASK = 0x80000000u, LOWER_MASK = 0x7FFFFFFFu;
    std::array<uint32_t, N> mt{};
    int index;

    void twist() {
        for (int i = 0; i < N; i++) {
            uint32_t y = (mt[i] & UPPER_MASK) | (mt[(i + 1) % N] & LOWER_MASK);
            mt[i] = mt[(i + M) % N] ^ (y >> 1);
            if (y % 2 != 0) mt[i] ^= MATRIX_A;
        }
        index = 0;
    }

public:
    explicit MersenneTwister(uint32_t seed) {
        mt[0] = seed;
        for (int i = 1; i < N; i++) {
            mt[i] = 1812433253u * (mt[i - 1] ^ (mt[i - 1] >> 30)) + i;
        }
        index = N;
    }

    uint32_t nextU32() {
        if (index >= N) twist();
        uint32_t y = mt[index];
        y ^= y >> 11;
        y ^= (y << 7) & 0x9D2C5680u;
        y ^= (y << 15) & 0xEFC60000u;
        y ^= y >> 18;
        index++;
        return y;
    }
};
```

```rust
struct MersenneTwister {
    mt: [u32; 624],
    index: usize,
}

const M: usize = 397;
const MATRIX_A: u32 = 0x9908_B0DF;
const UPPER_MASK: u32 = 0x8000_0000;
const LOWER_MASK: u32 = 0x7FFF_FFFF;

impl MersenneTwister {
    fn new(seed: u32) -> Self {
        let mut mt = [0u32; 624];
        mt[0] = seed;
        for i in 1..624 {
            mt[i] = 1812433253u32
                .wrapping_mul(mt[i - 1] ^ (mt[i - 1] >> 30))
                .wrapping_add(i as u32);
        }
        MersenneTwister { mt, index: 624 }
    }

    fn twist(&mut self) {
        for i in 0..624 {
            let y = (self.mt[i] & UPPER_MASK) | (self.mt[(i + 1) % 624] & LOWER_MASK);
            self.mt[i] = self.mt[(i + M) % 624] ^ (y >> 1);
            if y % 2 != 0 {
                self.mt[i] ^= MATRIX_A;
            }
        }
        self.index = 0;
    }

    fn next_u32(&mut self) -> u32 {
        if self.index >= 624 {
            self.twist();
        }
        let mut y = self.mt[self.index];
        y ^= y >> 11;
        y ^= (y << 7) & 0x9D2C5680;
        y ^= (y << 15) & 0xEFC60000;
        y ^= y >> 18;
        self.index += 1;
        y
    }
}
```

```csharp
class MersenneTwister
{
    const int N = 624, M = 397;
    const uint MatrixA = 0x9908B0DF;
    const uint UpperMask = 0x80000000, LowerMask = 0x7FFFFFFF;
    readonly uint[] mt = new uint[N];
    int index;

    public MersenneTwister(uint seed)
    {
        mt[0] = seed;
        for (int i = 1; i < N; i++)
            mt[i] = 1812433253u * (mt[i - 1] ^ (mt[i - 1] >> 30)) + (uint)i;
        index = N;
    }

    void Twist()
    {
        for (int i = 0; i < N; i++)
        {
            uint y = (mt[i] & UpperMask) | (mt[(i + 1) % N] & LowerMask);
            mt[i] = mt[(i + M) % N] ^ (y >> 1);
            if (y % 2 != 0) mt[i] ^= MatrixA;
        }
        index = 0;
    }

    public uint NextU32()
    {
        if (index >= N) Twist();
        uint y = mt[index];
        y ^= y >> 11;
        y ^= (y << 7) & 0x9D2C5680;
        y ^= (y << 15) & 0xEFC60000;
        y ^= y >> 18;
        index++;
        return y;
    }
}
```
