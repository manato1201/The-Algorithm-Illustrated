---
name: SplitMix64乱数生成法
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(1)(1個の乱数生成あたり)
summary: 単純な加算とxorshift的なビット混合だけで高速に良質な乱数を生成する手法で、Xoshiro256**などより高品質な乱数生成器の初期シード生成に使われる。
---

## 概要

多くの高品質な擬似乱数生成器(PRNG)は内部状態が複数のワードにまたがるため、ユーザーが与える単一の整数シードから、統計的に偏りのない複数の初期状態を作り出す仕組みが別途必要になる。SplitMix64は、Sebastiano Vignaが考案した、**64bitの内部状態1個をカウンタのように単純増加させ、それを毎回異なる方法でビット混合(mix)することで良質な乱数列を生成する**、非常にシンプルな擬似乱数生成器である。乗算・xor・シフトだけの数命令で1個の64bit乱数を生成できるほど軽量でありながら、出力の統計的品質は高く、**単体の汎用乱数生成器としてもある程度実用に耐える**。ただし実際の主な用途は、[Xoshiro256**乱数生成法](/algorithms/xoshiro256)のような複数ワードの内部状態を持つ生成器に対して、1個のシード値から相関のない複数の初期状態を安全に作り出す「シード展開器」としての役割にある。

## 仕組み

1. **内部状態**: 64bit符号なし整数1個(`state`)のみ。任意のシード値(0でもよい)で初期化できる
2. **状態の更新**: 乱数を1個生成するたびに、状態に**黄金比に由来する定数**`0x9E3779B97F4A7C15`(2^64を黄金比で割った値に近い、加算による周期の偏りを避けるための奇数の増分)を加算する:
   `state = state + 0x9E3779B97F4A7C15`
3. **出力の計算(ビット混合)**: 更新後の`state`をそのまま返すのではなく、以下のような「xorshift+乗算」の混合処理(fmix的な処理)を経てから出力する:
   ```
   z = state
   z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9
   z = (z ^ (z >> 27)) * 0x94D049BB133111EB
   z = z ^ (z >> 31)
   return z
   ```
   単純に増加させただけの`state`は連番的な規則性を持つが、この混合処理によって出力のビット同士の相関がほぼ消え、統計的に良質な乱数となる
4. **シード展開器としての使い方**: [Xoshiro256**乱数生成法](/algorithms/xoshiro256)のように256bit(4つの64bit整数)の初期状態を必要とする生成器を初期化する際、ユーザーが与えた1個のシード値でSplitMix64を初期化し、`next()`を4回呼び出してその出力をそのまま4つの初期状態として使う、というのが典型的な使い方である

## 特性・トレードオフ

- **極めて単純な実装と高速性**: 内部状態がワード1個だけなので初期化コストがほぼゼロで、乱数1個の生成も加算・xor・シフト・乗算数回で完了する。[Xoshiro256**乱数生成法](/algorithms/xoshiro256)や[PCG](/algorithms/pcg-random)と比べても実装がひときわ簡潔
- **シード展開器としての役割**: 複数ワードの内部状態を持つ生成器(Xoshiro/Xoroshiro系など)を、ユーザーが渡した単一の整数シードだけから安全に初期化するために広く使われる。単純に「同じシード値をそのまま複数の状態ワードにコピーする」ような初期化は、状態間に強い相関を生み出し出力品質を落としてしまうが、SplitMix64を経由することでその問題を回避できる
- **周期の短さ**: 内部状態が64bitのカウンタでしかないため、理論周期は`2^64`。[Xoshiro256**乱数生成法](/algorithms/xoshiro256)の`2^256-1`と比べると桁違いに短く、大規模なシミュレーションで大量に消費するメインの乱数源としては力不足になりうる
- **暗号用途には不向き**: 出力から内部状態(単調増加するカウンタ)を推測できる可能性があり、[XorShift法](/algorithms/xorshift)や[メルセンヌ・ツイスタ](/algorithms/mersenne-twister)と同様、暗号学的な安全性を要する用途には使えない
- **使いどころ**: [Xoshiro256**乱数生成法](/algorithms/xoshiro256)・Xoroshiro128系など複数ワードの状態を持つ生成器の初期化、ハッシュテーブルのハッシュ関数の混合ステップへの応用(混合処理そのものが優れたビットミキサーとして単独でも使われることがある)、手早く実装したい小規模な乱数用途

## 実装例

```python
MASK64 = (1 << 64) - 1


class SplitMix64:
    def __init__(self, seed: int) -> None:
        self.state = seed & MASK64

    def next_u64(self) -> int:
        self.state = (self.state + 0x9E3779B97F4A7C15) & MASK64
        z = self.state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & MASK64
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & MASK64
        return z ^ (z >> 31)

    def next_float(self) -> float:
        """[0, 1)の浮動小数点乱数を返す"""
        return (self.next_u64() >> 11) * (1.0 / (1 << 53))


def expand_seed_to_state(seed: int, count: int) -> list[int]:
    """1個のシードから、他の生成器(Xoshiro256**など)向けにcount個の初期状態を展開する"""
    gen = SplitMix64(seed)
    return [gen.next_u64() for _ in range(count)]


if __name__ == "__main__":
    gen = SplitMix64(seed=42)
    print([gen.next_u64() for _ in range(5)])

    # Xoshiro256**の256bit初期状態(4ワード)をシード1個から展開する例
    xoshiro_state = expand_seed_to_state(seed=42, count=4)
    print(xoshiro_state)
```

```typescript
const MASK64 = (1n << 64n) - 1n;

class SplitMix64 {
  private state: bigint;

  constructor(seed: bigint) {
    this.state = seed & MASK64;
  }

  nextU64(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & MASK64;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
    return z ^ (z >> 31n);
  }

  nextFloat(): number {
    // [0, 1) の浮動小数点乱数を返す
    return Number(this.nextU64() >> 11n) * (1.0 / Math.pow(2, 53));
  }
}

function expandSeedToState(seed: bigint, count: number): bigint[] {
  // 1個のシードから、他の生成器(Xoshiro256**など)向けに初期状態を展開する
  const gen = new SplitMix64(seed);
  return Array.from({ length: count }, () => gen.nextU64());
}

// 使用例
const gen = new SplitMix64(42n);
console.log(Array.from({ length: 5 }, () => gen.nextU64()));

// Xoshiro256**の256bit初期状態(4ワード)をシード1個から展開する例
const xoshiroState = expandSeedToState(42n, 4);
console.log(xoshiroState);
```
