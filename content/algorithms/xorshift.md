---
name: XorShift法
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(1)(1個の乱数生成あたり)
summary: 排他的論理和とビットシフトの組み合わせだけで次の乱数を生成する、状態がごく小さく極めて高速な擬似乱数生成器。品質は中程度だが速度優先の場面で重宝される。
---

## 概要

[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)が624個の32bit整数という大きな内部状態を持ち、優れた統計的性質を提供する一方、状態のサイズや初期化コストがネックになる場面もある。XorShift法は、ジョージ・マルサグリアが2003年に提案した、内部状態がわずか1〜4個の整数だけで済む極めて軽量な擬似乱数生成器である。名前の通り、**排他的論理和(XOR)とビットシフトだけ**を組み合わせて次の乱数を生成するというシンプルさながら、周期の長さ(状態が32bitなら最大`2^32-1`、64bitなら`2^64-1`)や統計的な均等性は実用上十分な水準を持つ。C言語での実装がわずか数行で済む手軽さから、ゲームのパーティクルエフェクトのような「大量に、高速に、それなりの品質で」乱数が必要な場面で広く使われている。

## 仕組み

1. 32bit(または64bit)の整数`x`を内部状態として持つ(初期値はシード値、0以外である必要がある——全bitが0だとXorShiftはその状態から抜け出せなくなる)
2. 次の乱数を生成する際、`x`に対して**左シフト+XOR、右シフト+XOR、左シフト+XOR**という3回の「シフトしてXORする」操作を、決められたシフト量(例えば13, 17, 5)で順に適用する:
   ```
   x ^= x << 13
   x ^= x >> 17
   x ^= x << 5
   ```
3. 更新後の`x`がそのまま次の乱数として出力され、同時に次回呼び出し時の内部状態にもなる
4. シフト量の組み合わせは、生成される乱数列の周期が最大化される(全ての非ゼロ状態を1周期で巡る)ように、数論的な性質(GF(2)上の多項式が原始多項式になるように)を満たすものが選ばれている。ランダムに選んだシフト量では、この性質を満たさず周期が短くなることがある

## 特性・トレードオフ

- **極めて軽量な状態と高速性**: 内部状態が1つの整数だけで済むため、メモリ使用量が小さく、キャッシュにも乗りやすい。演算もXORとシフトのみで浮動小数点演算や乗算すら使わないため、多くのプラットフォームで非常に高速に動作する
- **統計的品質は[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)に劣る**: 基本形のXorShiftは、一部の統計的検定(特に低bitのパターンや多次元均等性に関する検定)でメルセンヌ・ツイスタほどの性能は示さない。この弱点を改良した発展形(XorShift128+、Xoshiro256++など)が、より高品質かつ依然として高速な代替として広く使われている
- **暗号用途には不向き**: [メルセンヌ・ツイスタ](/algorithms/mersenne-twister)と同様、内部状態から次の出力が予測可能であるため、暗号学的な安全性は持たない
- **使いどころ**: パーティクルシステムのような大量の乱数を高速に消費するゲームエフェクト、乱数品質より速度を優先したいシミュレーション、組み込み機器のような計算資源が限られた環境での乱数生成、ハッシュ関数の構成要素としての利用(XorShiftの発展形はハッシュ関数の内部でも使われる)

## 実装例

```python
class XorShift32:
    def __init__(self, seed: int):
        self.state = seed & 0xFFFFFFFF or 1  # 0は許されないため、0なら1にフォールバック

    def next_u32(self) -> int:
        x = self.state
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= (x >> 17)
        x ^= (x << 5) & 0xFFFFFFFF
        self.state = x & 0xFFFFFFFF
        return self.state
```

```typescript
class XorShift32 {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  nextU32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }
}
```

```cpp
#include <cstdint>

class XorShift32 {
    uint32_t state;

public:
    explicit XorShift32(uint32_t seed) : state(seed ? seed : 1) {}

    uint32_t nextU32() {
        uint32_t x = state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        state = x;
        return state;
    }
};
```

```rust
struct XorShift32 {
    state: u32,
}

impl XorShift32 {
    fn new(seed: u32) -> Self {
        XorShift32 { state: if seed == 0 { 1 } else { seed } }
    }

    fn next_u32(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        x
    }
}
```

```csharp
class XorShift32
{
    uint state;

    public XorShift32(uint seed)
    {
        state = seed == 0 ? 1 : seed;
    }

    public uint NextU32()
    {
        uint x = state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        state = x;
        return state;
    }
}
```
