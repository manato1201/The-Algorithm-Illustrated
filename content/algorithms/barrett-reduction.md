---
name: バレット還元(Barrett Reduction)
category: 数論・暗号
subcategory: 高速演算
complexity: O(1)(1回の還元あたり、乗算2〜3回、除算命令は使わない)
summary: 除算命令が乗算命令より大幅に遅いCPUの特性を利用し、割る数mの逆数を近似する定数をあらかじめ計算しておくことで、剰余演算 a mod m を実際の除算を使わずに乗算とビットシフトだけで計算する。
---

## 概要

[RSA](/algorithms/rsa)や[Diffie-Hellman鍵交換](/algorithms/diffie-hellman)のような公開鍵暗号は、[モジュラー指数演算](/algorithms/modular-exponentiation)を何百〜何千回も繰り返す必要があり、その内部では毎回「大きな数を`m`で割った余り」という剰余演算が発生する。多くのCPUでは、除算命令は乗算命令に比べて数倍から十数倍遅いことが知られており、この剰余演算の遅さが暗号処理全体のボトルネックになりやすい。バレット還元は、1986年にポール・バレットが提案した手法で、**割る数`m`が固定されている(同じ`m`で何度も剰余を取る)という状況を活用**し、`1/m`を近似する定数をあらかじめ1回だけ計算しておくことで、以降の剰余演算を**実際の除算命令を使わず、乗算とビットシフトだけ**で行えるようにする。[モンゴメリ乗算](/algorithms/montgomery-multiplication)と並ぶ、剰余演算高速化の代表的な手法である。

## 仕組み

1. 固定の法`m`(`k`ビットの数とする)に対して、あらかじめ**`μ = ⌊4^k / m⌋`**(`1/m`を固定小数点で近似した定数)を1回だけ計算しておく。この計算には除算が必要だが、`m`が固定されている限り一度計算すれば使い回せる
2. 剰余`a mod m`を求めたいとき(`a`は`2k`ビット程度までの数とする)、まず`a`の近似的な商`q̂`を、`μ`を使った乗算とビットシフトだけで計算する:`q̂ = ⌊(a・μ) / 4^k⌋`(`4^k`で割る操作は、`k`の2倍ビット分の右シフトで実現できるため、これも除算命令を使わない)
3. `q̂`は真の商`⌊a/m⌋`の**近似値**であり、多くの場合一致するが、稀に1〜2小さい値になることがある(`μ`が`1/m`の近似であることに起因する誤差)
4. 近似の余り`r = a - q̂・m`を計算する。`μ`の近似誤差により、`r`が真の剰余`a mod m`より`m`の整数倍だけ大きくなっていることがあるため、`r`が`m`以上であれば`m`を引く、という**補正ステップ**を1〜2回繰り返して、最終的な正しい剰余を得る
5. この一連の手順(乗算2〜3回、シフト、比較・減算数回)は全て除算命令を使わずに実行でき、CPUによっては直接の除算命令より大幅に高速になる

## 特性・トレードオフ

- **除算を乗算へ置き換える古典的な高速化**: 「割る数が固定されているなら、逆数の近似値を事前計算しておいて掛け算で代用する」という発想は、コンパイラの定数除算最適化(`x / 3`のようなコードを、コンパイル時に乗算+シフトの組み合わせへ自動変換する)とも共通する、計算機科学における汎用的な高速化パターンの暗号分野での応用である
- **[モンゴメリ乗算](/algorithms/montgomery-multiplication)との使い分け**: モンゴメリ乗算は「乗算と剰余を同時に行う」演算そのものを別の数体系(モンゴメリ表現)に変換することで除算を回避するのに対し、バレット還元は通常の数表現のまま「剰余演算だけ」を高速化する。モンゴメリ乗算は連続した多数の乗算・剰余演算(モジュラー指数演算全体)に強く、バレット還元は個別の剰余演算を単発で高速化したい場合や、モンゴメリ表現との相互変換のコストを避けたい場合に選ばれる
- **近似誤差の補正が実装の要**: バレット還元の正しさは、近似商`q̂`が真の商からどれだけずれうるかを数学的に厳密に見積もり、その誤差を確実に補正できる回数だけ減算処理を行うことに依存する。この誤差限界の証明と実装への反映が、バレット還元を正しく実装する上での技術的な核心部分である
- **使いどころ**: [RSA](/algorithms/rsa)・[Diffie-Hellman](/algorithms/diffie-hellman)・[楕円曲線暗号](/algorithms/elliptic-curve-cryptography)のような公開鍵暗号における剰余演算の高速化、ハードウェア(暗号アクセラレータ、スマートカード)における除算回路を持たない実装、[モジュラー指数演算](/algorithms/modular-exponentiation)の内部ループの最適化

## 実装例

```python
def compute_barrett_mu(m: int, k: int) -> int:
    """m: 法(kビット程度)、k: mのビット幅の目安。muを事前に1回計算する。"""
    return (1 << (2 * k)) // m

def barrett_reduce(a: int, m: int, mu: int, k: int) -> int:
    q_hat = (a * mu) >> (2 * k)
    r = a - q_hat * m
    while r >= m:
        r -= m
    while r < 0:
        r += m
    return r

def barrett_mod_mul(a: int, b: int, m: int, mu: int, k: int) -> int:
    """乗算した結果に対してバレット還元で剰余を求める。"""
    product = a * b
    return barrett_reduce(product, m, mu, k)
```

```typescript
function computeBarrettMu(m: bigint, k: bigint): bigint {
  return (1n << (2n * k)) / m;
}

function barrettReduce(a: bigint, m: bigint, mu: bigint, k: bigint): bigint {
  let qHat = (a * mu) >> (2n * k);
  let r = a - qHat * m;
  while (r >= m) r -= m;
  while (r < 0n) r += m;
  return r;
}

function barrettModMul(a: bigint, b: bigint, m: bigint, mu: bigint, k: bigint): bigint {
  const product = a * b;
  return barrettReduce(product, m, mu, k);
}
```

```cpp
#include <cstdint>

// 簡略化のため__int128を使った実装例(実運用では多倍長ライブラリを使う)
using u128 = unsigned __int128;

u128 computeBarrettMu(uint64_t m, int k) {
    return (static_cast<u128>(1) << (2 * k)) / m;
}

uint64_t barrettReduce(u128 a, uint64_t m, u128 mu, int k) {
    u128 qHat = (a * mu) >> (2 * k);
    u128 r = a - qHat * m;
    while (r >= m) r -= m;
    return static_cast<uint64_t>(r);
}

uint64_t barrettModMul(uint64_t a, uint64_t b, uint64_t m, u128 mu, int k) {
    u128 product = static_cast<u128>(a) * b;
    return barrettReduce(product, m, mu, k);
}
```

```rust
fn compute_barrett_mu(m: u128, k: u32) -> u128 {
    (1u128 << (2 * k)) / m
}

fn barrett_reduce(a: u128, m: u128, mu: u128, k: u32) -> u128 {
    let q_hat = (a * mu) >> (2 * k);
    let mut r = a.wrapping_sub(q_hat.wrapping_mul(m));
    while r >= m {
        r -= m;
    }
    r
}

fn barrett_mod_mul(a: u64, b: u64, m: u128, mu: u128, k: u32) -> u128 {
    let product = a as u128 * b as u128;
    barrett_reduce(product, m, mu, k)
}
```

```csharp
using System.Numerics;

static BigInteger ComputeBarrettMu(BigInteger m, int k)
{
    return (BigInteger.One << (2 * k)) / m;
}

static BigInteger BarrettReduce(BigInteger a, BigInteger m, BigInteger mu, int k)
{
    BigInteger qHat = (a * mu) >> (2 * k);
    BigInteger r = a - qHat * m;
    while (r >= m) r -= m;
    while (r < 0) r += m;
    return r;
}

static BigInteger BarrettModMul(BigInteger a, BigInteger b, BigInteger m, BigInteger mu, int k)
{
    BigInteger product = a * b;
    return BarrettReduce(product, m, mu, k);
}
```
