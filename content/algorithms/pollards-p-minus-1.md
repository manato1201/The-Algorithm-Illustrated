---
name: ポラードのp-1法
category: 数論・暗号
subcategory: 素数判定・素因数分解
complexity: O(B log B log n)(Bは滑らかさの上限)
summary: 「求める素因数pに対してp-1が小さな素因数だけで構成されている(B-滑らか)」という特殊な性質を持つ合成数に対して、フェルマーの小定理を応用して驚くほど高速に素因数を発見する分解法。
---

## 概要

[ポラードのロー法](/algorithms/pollards-rho)は合成数の素因数分解に汎用的に使える手法だが、1974年にジョン・ポラードが発表したこの「p-1法」は、求めたい素因数`p`に特有の構造的な弱点(`p-1`が小さな素因数だけで割り切れる「B-滑らか」という性質)を持つ場合に限り、他のどの汎用的な手法よりも劇的に高速に素因数を発見できる、特殊だが強力な分解法である。フェルマーの小定理`a^(p-1) ≡ 1 (mod p)`を、`p-1`の代わりに「`p-1`を確実に割り切るであろう大きな数」でべき乗することで、`p`を直接知らなくても`p`の倍数を人工的に作り出す、という巧妙な発想に基づく。

## 仕組み

1. 上限`B`(滑らかさの基準)を決め、`B`以下の全ての素数`q`について、`q`の`n`以下での最大べき`q^k`(`q^k ≤ n`)を掛け合わせた数`M = ∏ q^k`を計算する
2. 適当な底`a`(通常`a=2`)を選び、[繰り返し二乗法](/algorithms/modular-exponentiation)を使って`a^M mod n`を計算する
3. `d = gcd(a^M - 1, n)`(ユークリッドの互除法で計算)を求める
4. もし求めたい素因数`p`について、`p-1`が`B`以下の素数だけで構成される(B-滑らかである)なら、`p-1`は`M`を割り切る。すると`a^M ≡ 1 (mod p)`となり(フェルマーの小定理より`a^(p-1) ≡ 1 (mod p)`で`M`は`p-1`の倍数だから)、`p`は`a^M - 1`を割り切る。したがって`gcd(a^M - 1, n)`は`p`の倍数(多くの場合`p`自身、あるいは`n`と`p`の他の倍数との積)として得られる
5. `1 < d < n`であれば、`d`(または`n/d`)が求める非自明な素因数になる。`d = 1`ならBを大きくして再試行、`d = n`なら底`a`を変えて再試行する

## 特性・トレードオフ

- **計算量**: `O(B log B log n)`程度で、`B`が小さければ非常に高速。[ポラードのロー法](/algorithms/pollards-rho)の`O(n^(1/4))`と比べても、条件が合致すれば圧倒的に速い
- **成功が`p-1`の構造に強く依存する**: この手法が高速に成功するのは、求める素因数`p`について`p-1`がB-滑らか(小さな素因数だけで構成される)という特殊な条件が満たされる場合に限られる。`p-1`が大きな素因数を1つでも含む(滑らかでない)場合、この手法は事実上機能しない——汎用性では[ポラードのロー法](/algorithms/pollards-rho)に劣る
- **暗号設計への実務的な影響**: この弱点が知られているため、[RSA暗号](/algorithms/rsa)の鍵生成では、選ぶ素数`p`について`p-1`が大きな素因数を持つ「安全素数(strong prime)」を意図的に選ぶ実装上の配慮が(歴史的には)行われてきた——攻撃手法の存在が暗号の実装指針に直接影響を与えた好例になっている
- **使いどころ**: 特定の構造を持つ合成数の素因数分解(暗号解読の研究、脆弱な鍵の検証)、[ポラードのロー法](/algorithms/pollards-rho)のような汎用分解法と組み合わせ、まず高速なp-1法で「運よく見つかる」素因数を探してから汎用手法に切り替える多段階の素因数分解パイプラインの初期段階

## 実装例

具体例として`n = 8051 = 83 × 97`を分解する。`q = 97`は`q - 1 = 96 = 2^5 × 3`と非常に滑らかなため、上限`B = 5`だけで`97`が見つかる(`p = 83`は`p - 1 = 82 = 2 × 41`のため`B = 5`では見つからない)。

```python
import math


def is_prime(x: int) -> bool:
    if x < 2:
        return False
    return all(x % d != 0 for d in range(2, int(x ** 0.5) + 1))


def pollards_p_minus_1(n: int, bound: int) -> int | None:
    a = 2
    for p in range(2, bound + 1):
        if is_prime(p):
            power = p
            while power * p <= n:
                power *= p
            a = pow(a, power, n)
    d = math.gcd(a - 1, n)
    return d if 1 < d < n else None
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

function isPrime(x: number): boolean {
  if (x < 2) return false;
  for (let d = 2; d * d <= x; d++) if (x % d === 0) return false;
  return true;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function pollardsPMinus1(n: number, bound: number): number | null {
  let a = 2;
  for (let p = 2; p <= bound; p++) {
    if (isPrime(p)) {
      let power = p;
      while (power * p <= n) power *= p;
      a = modPow(a, power, n);
    }
  }
  const d = gcd(a - 1, n);
  return d > 1 && d < n ? d : null;
}
```

```cpp
#include <numeric>
#include <optional>

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

bool isPrime(long long x) {
    if (x < 2) return false;
    for (long long d = 2; d * d <= x; d++) if (x % d == 0) return false;
    return true;
}

std::optional<long long> pollardsPMinus1(long long n, long long bound) {
    long long a = 2;
    for (long long p = 2; p <= bound; p++) {
        if (isPrime(p)) {
            long long power = p;
            while (power * p <= n) power *= p;
            a = modPow(a, power, n);
        }
    }
    long long d = std::gcd(a - 1, n);
    if (d > 1 && d < n) return d;
    return std::nullopt;
}
```

```rust
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

fn is_prime(x: i64) -> bool {
    if x < 2 {
        return false;
    }
    let mut d = 2;
    while d * d <= x {
        if x % d == 0 {
            return false;
        }
        d += 1;
    }
    true
}

fn gcd(a: i64, b: i64) -> i64 {
    if b == 0 {
        a
    } else {
        gcd(b, a % b)
    }
}

fn pollards_p_minus_1(n: i64, bound: i64) -> Option<i64> {
    let mut a = 2i64;
    for p in 2..=bound {
        if is_prime(p) {
            let mut power = p;
            while power * p <= n {
                power *= p;
            }
            a = mod_pow(a, power, n);
        }
    }
    let d = gcd(a - 1, n);
    if d > 1 && d < n {
        Some(d)
    } else {
        None
    }
}
```

```csharp
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

static bool IsPrime(long x)
{
    if (x < 2) return false;
    for (long d = 2; d * d <= x; d++) if (x % d == 0) return false;
    return true;
}

static long Gcd(long a, long b) => b == 0 ? a : Gcd(b, a % b);

static long? PollardsPMinus1(long n, long bound)
{
    long a = 2;
    for (long p = 2; p <= bound; p++)
    {
        if (IsPrime(p))
        {
            long power = p;
            while (power * p <= n) power *= p;
            a = ModPow(a, power, n);
        }
    }
    long d = Gcd(a - 1, n);
    return (d > 1 && d < n) ? d : (long?)null;
}
```

