---
name: Xoshiro256**乱数生成法
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(1)(1個の乱数生成あたり)
summary: 256bitの内部状態とxor・シフト・回転(rotate)だけの単純な演算で、xorshift系を上回る統計的品質と現代的なCPUに適した速度を両立する擬似乱数生成器。
---

## 概要

[XorShift法](/algorithms/xorshift)は状態が小さく高速だが、低ビットの統計的検定でやや弱いという弱点があった。Xoshiro256**(「エクソシロ」または「ゾシロ」と読まれる、xor/shift/rotateの頭文字に由来)は、David BlackmanとSebastiano Vignaが2018年に発表した、XorShift系の後継にあたる擬似乱数生成器である。**256bit(64bit整数4つ)の内部状態**を持ち、xorshiftの状態更新に加えて**回転(bit rotation)**を組み合わせ、最後に出力段で`**`スクランブラー(乗算ベースの後処理)を適用することで、BigCrushをはじめとする厳しい統計的検定をパスする品質と、乗算・除算に頼らないシンプルな演算による高速性を両立している。Rustの`rand`クレートやいくつかの言語の標準ライブラリでも採用されており、[PCG](/algorithms/pcg-random)と並んで現代的な非暗号用途の乱数生成器の代表格である。

## 仕組み

1. **内部状態**: 64bit符号なし整数を4個(`s[0], s[1], s[2], s[3]`)、合計256bitを内部状態として持つ。全てが0の状態は避ける必要があり、通常はSplitMix64のような別の軽量な生成器でシードから4個の初期状態を作る
2. **出力関数(`**`スクランブラー)**: 状態を更新する前に、現在の状態から出力値を計算する:
   `result = rotl(s[1] * 5, 7) * 9`
   ここで`rotl(x, k)`は`x`を`k`bit左に循環回転(rotate left)する操作。単純なxorshiftの出力をそのまま使うのではなく、乗算と回転を組み合わせた「スクランブラー」を通すことで、統計的な均等性が大きく改善される
3. **状態の更新**: 以下の手順で`s[0..3]`を次の状態に更新する:
   ```
   t = s[1] << 17
   s[2] ^= s[0]
   s[3] ^= s[1]
   s[1] ^= s[2]
   s[0] ^= s[3]
   s[2] ^= t
   s[3] = rotl(s[3], 45)
   ```
4. **周期とジャンプ関数**: 状態空間が256bitあるため理論周期は`2^256 - 1`。加えて、状態を`2^128`回分・`2^192`回分先送りする「ジャンプ関数」があらかじめ用意されており、これを使うことで**1つのシードから複数の独立した乱数ストリームを瞬時に作り出せる**(並列シミュレーションの各スレッドに異なるジャンプ済みストリームを割り当てる、といった使い方ができる)

## 特性・トレードオフ

- **統計品質と速度の両立**: [XorShift法](/algorithms/xorshift)の弱点だった低ビットの統計的な偏りを、出力段の`**`スクランブラーで補正し、BigCrushなど厳しい統計検定にパスする品質を実現しながら、演算はxor・シフト・回転・乗算のみで浮動小数点演算を使わないため高速に動作する
- **[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)との比較**: 内部状態がわずか32byte(メルセンヌ・ツイスタは約2.5KB)と非常に小さく、CPUキャッシュに乗りやすい。初期化コストも小さく、大量の独立した生成器インスタンスを持ちたい場合(エンティティごとに専用の乱数列を持たせるなど)に有利
- **並列化への強さ**: ジャンプ関数によって、1つのマスターシードから互いに統計的に独立な複数のストリームを効率的に分岐できる。マルチスレッドでの物理演算や大規模なモンテカルロシミュレーションで、スレッドごとに独立な乱数列を割り当てる用途に適している
- **暗号用途には不向き**: [XorShift法](/algorithms/xorshift)や[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)と同様、出力から内部状態を復元できる可能性があるため、暗号学的な安全性を要する鍵生成やトークン発行には使えない
- **使いどころ**: Rustの`rand`クレートの既定生成器の系譜、大量の乱数を消費する物理シミュレーション・パーティクルエフェクト、マルチスレッドでの並列モンテカルロ法、ゲームのプロシージャル生成での高速な乱数供給

## 実装例

```python
MASK64 = (1 << 64) - 1


def rotl(x: int, k: int) -> int:
    return ((x << k) | (x >> (64 - k))) & MASK64


def splitmix64(state: int):
    def gen():
        nonlocal state
        state = (state + 0x9E3779B97F4A7C15) & MASK64
        z = state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & MASK64
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & MASK64
        return z ^ (z >> 31)
    return gen


class Xoshiro256StarStar:
    def __init__(self, seed: int) -> None:
        sm = splitmix64(seed & MASK64)
        self.s = [sm() for _ in range(4)]

    def next_u64(self) -> int:
        s0, s1, s2, s3 = self.s
        result = (rotl((s1 * 5) & MASK64, 7) * 9) & MASK64

        t = (s1 << 17) & MASK64
        s2 ^= s0
        s3 ^= s1
        s1 ^= s2
        s0 ^= s3
        s2 ^= t
        s3 = rotl(s3, 45)

        self.s = [s0, s1, s2, s3]
        return result
```

```typescript
const MASK64 = (1n << 64n) - 1n;

function rotl(x: bigint, k: bigint): bigint {
  return ((x << k) | (x >> (64n - k))) & MASK64;
}

function makeSplitMix64(seed: bigint): () => bigint {
  let state = seed & MASK64;
  return () => {
    state = (state + 0x9e3779b97f4a7c15n) & MASK64;
    let z = state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
    return z ^ (z >> 31n);
  };
}

class Xoshiro256StarStar {
  private s: [bigint, bigint, bigint, bigint];

  constructor(seed: bigint) {
    const sm = makeSplitMix64(seed);
    this.s = [sm(), sm(), sm(), sm()];
  }

  nextU64(): bigint {
    let [s0, s1, s2, s3] = this.s;
    const result = (rotl((s1 * 5n) & MASK64, 7n) * 9n) & MASK64;

    const t = (s1 << 17n) & MASK64;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 45n);

    this.s = [s0, s1, s2, s3];
    return result;
  }
}
```

```cpp
#include <cstdint>
#include <array>

class Xoshiro256StarStar {
    std::array<uint64_t, 4> s;

    static uint64_t rotl(uint64_t x, int k) {
        return (x << k) | (x >> (64 - k));
    }

    static uint64_t splitmix64(uint64_t& state) {
        state += 0x9E3779B97F4A7C15ULL;
        uint64_t z = state;
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
        return z ^ (z >> 31);
    }

public:
    explicit Xoshiro256StarStar(uint64_t seed) {
        for (auto& v : s) v = splitmix64(seed);
    }

    uint64_t nextU64() {
        uint64_t result = rotl(s[1] * 5, 7) * 9;

        uint64_t t = s[1] << 17;
        s[2] ^= s[0];
        s[3] ^= s[1];
        s[1] ^= s[2];
        s[0] ^= s[3];
        s[2] ^= t;
        s[3] = rotl(s[3], 45);

        return result;
    }
};
```

```rust
struct Xoshiro256StarStar {
    s: [u64; 4],
}

fn rotl(x: u64, k: u32) -> u64 {
    x.rotate_left(k)
}

fn splitmix64(state: &mut u64) -> u64 {
    *state = state.wrapping_add(0x9E3779B97F4A7C15);
    let mut z = *state;
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
    z ^ (z >> 31)
}

impl Xoshiro256StarStar {
    fn new(seed: u64) -> Self {
        let mut state = seed;
        let s = [
            splitmix64(&mut state),
            splitmix64(&mut state),
            splitmix64(&mut state),
            splitmix64(&mut state),
        ];
        Xoshiro256StarStar { s }
    }

    fn next_u64(&mut self) -> u64 {
        let result = rotl(self.s[1].wrapping_mul(5), 7).wrapping_mul(9);

        let t = self.s[1] << 17;
        self.s[2] ^= self.s[0];
        self.s[3] ^= self.s[1];
        self.s[1] ^= self.s[2];
        self.s[0] ^= self.s[3];
        self.s[2] ^= t;
        self.s[3] = rotl(self.s[3], 45);

        result
    }
}
```

```csharp
class Xoshiro256StarStar
{
    ulong[] s = new ulong[4];

    static ulong Rotl(ulong x, int k) => (x << k) | (x >> (64 - k));

    static ulong SplitMix64(ref ulong state)
    {
        state += 0x9E3779B97F4A7C15UL;
        ulong z = state;
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9UL;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EBUL;
        return z ^ (z >> 31);
    }

    public Xoshiro256StarStar(ulong seed)
    {
        for (int i = 0; i < 4; i++) s[i] = SplitMix64(ref seed);
    }

    public ulong NextU64()
    {
        ulong result = Rotl(s[1] * 5, 7) * 9;

        ulong t = s[1] << 17;
        s[2] ^= s[0];
        s[3] ^= s[1];
        s[1] ^= s[2];
        s[0] ^= s[3];
        s[2] ^= t;
        s[3] = Rotl(s[3], 45);

        return result;
    }
}
```
