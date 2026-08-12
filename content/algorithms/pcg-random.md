---
name: PCG(Permuted Congruential Generator)乱数生成法
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(1)(1個の乱数生成あたり)
summary: 内部状態は[線形合同法](/algorithms/xorshift)並みに小さく高速に保ちながら、出力段階でビットのシャッフル(順列変換)を挟むことで、[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)に匹敵する統計的品質を実現する現代的な擬似乱数生成器。
---

## 概要

[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)は優れた統計的性質を持つが624個の32bit整数という大きな内部状態を必要とし、[XorShift法](/algorithms/xorshift)は状態が小さく高速だが統計的品質でメルセンヌ・ツイスタに劣る、というトレードオフが長らく擬似乱数生成器の設計における悩みどころだった。PCG(Permuted Congruential Generator)は、2014年にメリッサ・オニールが提案した手法で、この2つの利点を両立させる——**内部状態の更新には、実装が単純で高速な線形合同法(LCG)を使いながら、その出力をそのまま返すのではなく、状態のビットに「順列変換(パーミュテーション)」を施してから出力する**ことで、LCG単体が持つ既知の統計的な弱点(下位ビットの周期性が短いなど)を隠蔽し、メルセンヌ・ツイスタに匹敵する、あるいは上回る統計的品質を実現する。

## 仕組み

1. **状態の更新**: 内部状態`state`を、単純な線形合同法の漸化式で更新する:`state ← state × multiplier + increment (mod 2^64)`。この部分は[XorShift法](/algorithms/xorshift)と同様、演算コストが非常に低い
2. 線形合同法単体の出力(特に下位ビット)には、周期性や統計的な偏りが存在することが数学的に知られている。この弱点をそのまま出力に反映させないため、**出力段階で追加の変換**を施す
3. 具体的には、更新後の状態の**上位ビットを使って、下位ビットに対する回転(ローテーション)量を決定**し、その回転量だけ状態のビット列を右回転(ビットローテーション)させてから出力する。この「可変量の回転」という操作が、LCGの規則的なパターンを効果的に破壊する「順列変換」の役割を果たす
4. 各世代のPCGにはこの変換の具体的な組み合わせ(XSH-RR, XSH-RS, RXS-M-XSなど)にバリエーションがあり、出力ビット幅や統計的検定の厳しさに応じて選択できる
5. 生成された出力は、[XorShift法](/algorithms/xorshift)と同程度の軽量な計算コストでありながら、統計的検定スイート(TestU01のBigCrushなど)において、[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)を含む多くの既存の乱数生成器より高い評価を得ている

## 特性・トレードオフ

- **軽量な状態と高い統計的品質の両立**: [メルセンヌ・ツイスタ](/algorithms/mersenne-twister)の624ワードという大きな状態に対し、PCGは64bitまたは128bit程度の非常にコンパクトな状態で、同等以上の統計的品質を達成する。メモリ制約が厳しい環境(組み込み機器、大量のインスタンスを持つゲームのパーティクルシステムなど)でも扱いやすい
- **ストリーム分離(複数の独立した乱数系列)という実用的な機能**: PCGは、`increment`の値を変えるだけで、同じ`multiplier`を使いながら**互いに統計的に独立な複数の乱数ストリーム**を簡単に作れるという設計上の特徴を持つ。並列シミュレーションで、各スレッド・各エージェントに独立したストリームを割り当てたい場合に便利である
- **[XorShift法](/algorithms/xorshift)との比較**: XorShift法(の基本形)は演算がシンプルな分、統計的品質でPCGに劣ることが知られている。PCGは出力段階の変換という追加コストを払うことで、その品質の差を埋めている。PCGの発展形であるXoshiro256++系のアルゴリズムも、同様に「軽量な状態+出力変換」というアプローチで高品質と高速性を両立させている
- **使いどころ**: モダンなゲームエンジン・シミュレーションソフトウェアの標準乱数生成器(NumPyのデフォルト乱数生成器がPCG64を採用するなど、科学計算分野でも普及が進んでいる)、統計的品質と速度の両方が求められるモンテカルロシミュレーション、複数の独立した乱数ストリームが必要な並列処理

## 実装例

```python
class Pcg32:
    MULTIPLIER = 6364136223846793005
    MASK64 = (1 << 64) - 1

    def __init__(self, seed: int, sequence: int = 1):
        self.state = 0
        self.increment = ((sequence << 1) | 1) & self.MASK64
        self._step()
        self.state = (self.state + seed) & self.MASK64
        self._step()

    def _step(self) -> None:
        self.state = (self.state * self.MULTIPLIER + self.increment) & self.MASK64

    def next_u32(self) -> int:
        old_state = self.state
        self._step()
        xorshifted = (((old_state >> 18) ^ old_state) >> 27) & 0xFFFFFFFF
        rot = (old_state >> 59) & 0xFFFFFFFF
        return ((xorshifted >> rot) | (xorshifted << ((-rot) & 31))) & 0xFFFFFFFF
```

```typescript
class Pcg32 {
  private state = 0n;
  private increment: bigint;
  private static readonly MULTIPLIER = 6364136223846793005n;
  private static readonly MASK64 = (1n << 64n) - 1n;

  constructor(seed: bigint, sequence = 1n) {
    this.increment = ((sequence << 1n) | 1n) & Pcg32.MASK64;
    this.step();
    this.state = (this.state + seed) & Pcg32.MASK64;
    this.step();
  }

  private step(): void {
    this.state =
      (this.state * Pcg32.MULTIPLIER + this.increment) & Pcg32.MASK64;
  }

  nextU32(): number {
    const oldState = this.state;
    this.step();
    const xorshifted = (((oldState >> 18n) ^ oldState) >> 27n) & 0xffffffffn;
    const rot = (oldState >> 59n) & 0xffffffffn;
    const result = (xorshifted >> rot) | (xorshifted << (-rot & 31n));
    return Number(result & 0xffffffffn);
  }
}
```

```cpp
#include <cstdint>

class Pcg32 {
    uint64_t state;
    uint64_t increment;
    static constexpr uint64_t MULTIPLIER = 6364136223846793005ULL;

    void step() { state = state * MULTIPLIER + increment; }

public:
    Pcg32(uint64_t seed, uint64_t sequence = 1) : state(0) {
        increment = (sequence << 1u) | 1u;
        step();
        state += seed;
        step();
    }

    uint32_t nextU32() {
        uint64_t oldState = state;
        step();
        uint32_t xorshifted = static_cast<uint32_t>(((oldState >> 18u) ^ oldState) >> 27u);
        uint32_t rot = static_cast<uint32_t>(oldState >> 59u);
        return (xorshifted >> rot) | (xorshifted << ((-rot) & 31));
    }
};
```

```rust
struct Pcg32 {
    state: u64,
    increment: u64,
}

const MULTIPLIER: u64 = 6364136223846793005;

impl Pcg32 {
    fn new(seed: u64, sequence: u64) -> Self {
        let mut pcg = Pcg32 { state: 0, increment: (sequence << 1) | 1 };
        pcg.step();
        pcg.state = pcg.state.wrapping_add(seed);
        pcg.step();
        pcg
    }

    fn step(&mut self) {
        self.state = self.state.wrapping_mul(MULTIPLIER).wrapping_add(self.increment);
    }

    fn next_u32(&mut self) -> u32 {
        let old_state = self.state;
        self.step();
        let xorshifted = (((old_state >> 18) ^ old_state) >> 27) as u32;
        let rot = (old_state >> 59) as u32;
        xorshifted.rotate_right(rot)
    }
}
```

```csharp
class Pcg32
{
    ulong state;
    ulong increment;
    const ulong Multiplier = 6364136223846793005UL;

    public Pcg32(ulong seed, ulong sequence = 1)
    {
        state = 0;
        increment = (sequence << 1) | 1;
        Step();
        state += seed;
        Step();
    }

    void Step() => state = state * Multiplier + increment;

    public uint NextU32()
    {
        ulong oldState = state;
        Step();
        uint xorshifted = (uint)(((oldState >> 18) ^ oldState) >> 27);
        int rot = (int)(oldState >> 59);
        return (xorshifted >> rot) | (xorshifted << ((-rot) & 31));
    }
}
```
