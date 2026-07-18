---
name: フェルマー素数判定法
category: 数論・暗号
subcategory: 素数判定・素因数分解
complexity: O(log n)(1回の判定、繰り返し二乗法使用時)
summary: フェルマーの小定理「pが素数ならa^(p-1)≡1 (mod p)」の対偶的な性質を使い、この等式が成り立たない証人を1つ見つけるだけで合成数と判定する、確率的素数判定の原点となる手法。
---

## 概要

「フェルマーの小定理」は、`p`が素数であれば、`p`と互いに素な任意の整数`a`について`a^(p-1) ≡ 1 (mod p)`が成り立つことを示す整数論の基本定理である。フェルマー素数判定法は、この定理を逆向きに使う——ある`n`について、適当な`a`を選んで`a^(n-1) mod n`を計算し、もし1にならなければ、`n`は確実に合成数である(対偶が成り立つ)と判定する。この判定法自体は[ミラー・ラビン素数判定法](/algorithms/miller-rabin)ほど信頼性は高くないが、その直接の前身であり、確率的素数判定というアイデアの原点として今なお重要な位置を占めている。

## 仕組み

1. 判定したい奇数`n`(`n > 2`)に対して、`1 < a < n-1`の範囲からランダムに底`a`を選ぶ
2. [繰り返し二乗法](/algorithms/modular-exponentiation)を使って`a^(n-1) mod n`を効率的に計算する
3. 計算結果が1でなければ、`n`は確実に合成数である(フェルマーの小定理の対偶により証明終わり)
4. 計算結果が1であれば、`n`は素数「かもしれない」(この`a`はフェルマーテストに合格しただけで、素数であることの証明にはならない)
5. 異なる`a`を何度も選んで2〜4を繰り返し、全て1になれば、`n`が素数である確信度を上げていく

## 特性・トレードオフ

- **計算量**: 1回の判定は[繰り返し二乗法](/algorithms/modular-exponentiation)により`O(log n)`。何回の試行を行うかによって全体のコストと信頼度が変わる
- **カーマイケル数という致命的な弱点**: 一部の合成数(561、1105など、カーマイケル数と呼ばれる特殊な合成数)は、**ほぼ全ての**底`a`についてフェルマーテストに合格してしまい、何回試行を繰り返してもほぼ確実に(誤って)素数と判定されてしまう——これがフェルマーテストの決定的な弱点であり、[ミラー・ラビン素数判定法](/algorithms/miller-rabin)がこの弱点を克服するために「平方根に関する追加のチェック」を組み込んで改良された理由である
- **[ミラー・ラビン素数判定法](/algorithms/miller-rabin)との関係**: ミラー・ラビン法はフェルマーテストの直接の拡張であり、`n-1`を`2^s × d`(`d`は奇数)の形に分解し、平方根を取る過程で`1`の非自明な平方根(`±1`以外で2乗すると1になる数)が現れないかを追加でチェックすることで、カーマイケル数を含む全ての合成数を高い確率で正しく検出できるようにしている
- **使いどころ**: 素数判定アルゴリズムの歴史的・教育的な出発点としての理解、カーマイケル数という数論の興味深い病的な例を通じて「確率的アルゴリズムは慎重に設計しないと系統的に間違えることがある」という教訓を学ぶ題材。実務での素数判定には、この弱点を克服した[ミラー・ラビン素数判定法](/algorithms/miller-rabin)が使われる

## 実装例

```python
import random


def fermat_primality_test(n: int, k: int = 10) -> bool:
    if n < 4:
        return n in (2, 3)
    for _ in range(k):
        a = random.randint(2, n - 2)
        if pow(a, n - 1, n) != 1:
            return False
    return True
```

```typescript
function modPow(base: number, exp: number, mod: number): number {
  let result = 1;
  base = ((base % mod) + mod) % mod;
  while (exp > 0) {
    if (exp % 2 === 1) result = (result * base) % mod;
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return result;
}

function fermatPrimalityTest(n: number, k: number = 10): boolean {
  if (n < 4) return n === 2 || n === 3;
  for (let i = 0; i < k; i++) {
    const a = 2 + Math.floor(Math.random() * (n - 3));
    if (modPow(a, n - 1, n) !== 1) return false;
  }
  return true;
}
```

```cpp
#include <random>

long long modPow(long long base, long long exp, long long mod) {
    long long result = 1;
    base %= mod;
    if (base < 0) base += mod;
    while (exp > 0) {
        if (exp & 1) result = static_cast<long long>((__int128)result * base % mod);
        exp >>= 1;
        base = static_cast<long long>((__int128)base * base % mod);
    }
    return result;
}

bool fermatPrimalityTest(long long n, int k = 10, unsigned seed = 42) {
    if (n < 4) return n == 2 || n == 3;
    std::mt19937_64 rng(seed);
    std::uniform_int_distribution<long long> dist(2, n - 2);
    for (int i = 0; i < k; i++) {
        long long a = dist(rng);
        if (modPow(a, n - 1, n) != 1) return false;
    }
    return true;
}
```

```rust
use rand::Rng;

fn mod_pow(mut base: i64, mut exp: i64, modulus: i64) -> i64 {
    let mut result: i64 = 1;
    base = ((base % modulus) + modulus) % modulus;
    while exp > 0 {
        if exp & 1 == 1 {
            result = (result as i128 * base as i128 % modulus as i128) as i64;
        }
        exp >>= 1;
        base = (base as i128 * base as i128 % modulus as i128) as i64;
    }
    result
}

fn fermat_primality_test(n: i64, k: u32, rng: &mut impl Rng) -> bool {
    if n < 4 {
        return n == 2 || n == 3;
    }
    for _ in 0..k {
        let a = rng.gen_range(2..=n - 2);
        if mod_pow(a, n - 1, n) != 1 {
            return false;
        }
    }
    true
}
```

```csharp
using System;

static long ModPow(long baseVal, long exp, long mod)
{
    long result = 1;
    baseVal = ((baseVal % mod) + mod) % mod;
    while (exp > 0)
    {
        if ((exp & 1) == 1) result = (long)((System.Numerics.BigInteger)result * baseVal % mod);
        exp >>= 1;
        baseVal = (long)((System.Numerics.BigInteger)baseVal * baseVal % mod);
    }
    return result;
}

static bool FermatPrimalityTest(long n, int k = 10)
{
    if (n < 4) return n == 2 || n == 3;
    var rnd = new Random();
    for (int i = 0; i < k; i++)
    {
        long a = rnd.NextInt64(2, n - 2);
        if (ModPow(a, n - 1, n) != 1) return false;
    }
    return true;
}
```
