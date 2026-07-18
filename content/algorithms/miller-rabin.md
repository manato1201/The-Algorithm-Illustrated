---
name: ミラー・ラビン素数判定法
category: 数論・暗号
subcategory: 素数判定・素因数分解
complexity: O(k log³ n)
summary: 確率的に大きな数の素数判定を行う。RSA暗号の鍵生成などで実用される。
---

## 概要

RSA暗号のような公開鍵暗号は、数百桁にもなる巨大な素数を必要とするが、そんな大きな数に対してエラトステネスの篩や試し割りを使うのは非現実的。ミラー・ラビン素数判定法は、**「絶対に正しい」保証は放棄する代わりに、実用上ほぼ確実な精度で、驚くほど高速に**巨大な数の素数判定を行える、確率的アルゴリズムの代表格。

## 仕組み

フェルマーの小定理を拡張した性質を利用する。判定したい数nが奇数の素数であれば、`n - 1 = 2^s × d`(dは奇数)と表したとき、ランダムに選んだ数aについて特定の合同式のパターンが必ず成り立つ、という数論的性質がある。

1. 判定したい数nから1を引き、`n - 1 = 2^s × d`(dは奇数)の形に分解する
2. ランダムに底の値aを選び、`a^d mod n` を計算する
3. その結果が1、または `n - 1` であれば、このラウンドは「素数の疑いが晴れない(=合格)」と判定する
4. そうでなければ、値を2乗しながらs-1回まで `n-1` になるかを確認する。一度もならなければ、nは**確実に合成数**と判定できる
5. このテストをk回(異なるランダムな底aで)繰り返し、**全てのラウンドで合格すれば「おそらく素数」**と判定する

「合成数なのに毎回運悪く合格し続ける」確率は、テスト回数kを増やすごとに指数的に下がっていく(1回あたり最大でも1/4以下)。実用上は数十回程度のテストで、誤判定の確率は天文学的に低くなる。

## 特性・トレードオフ

- **計算量**: O(k log³ n)(kはテスト回数)。エラトステネスの篩のような決定的手法では扱えない桁数の数でも、現実的な時間で判定できる
- **確率的アルゴリズムであることの意味**: 「素数と判定されたが実は合成数だった」という偽陽性の確率はテスト回数で自在にコントロールできるが、ゼロにはできない。実務上は「暗号鍵の生成に使うには十分すぎるほど低い確率」まで下げて使う
- **決定的な判定法との使い分け**: メルセンヌ数のような特殊な形の数には、ルーカス・レーマー・テストのような決定的(確率に頼らない)手法が存在する。ミラー・ラビン法は「任意の一般的な数」を高速に判定したい場面で選ばれる
- **使いどころ**: RSA暗号やディフィー・ヘルマン鍵共有における巨大な素数の生成、暗号ライブラリの内部実装のほぼ全てで使われている、現代暗号の実務基盤

## 実装例

```python
import random


def is_probable_prime(n: int, k: int = 20) -> bool:
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29):
        if n == p:
            return True
        if n % p == 0:
            return False

    # n - 1 = 2^s * d (dは奇数) の形に分解する
    d = n - 1
    s = 0
    while d % 2 == 0:
        d //= 2
        s += 1

    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(s - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False  # 合成数と確定
    return True
```

```typescript
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}

function randomBigInt(min: bigint, max: bigint): bigint {
  const range = max - min + 1n;
  const rand = BigInt(Math.floor(Math.random() * Number(range)));
  return min + rand;
}

function isProbablePrime(n: bigint, k = 20): boolean {
  if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n]) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }

  // n - 1 = 2^s * d (dは奇数) の形に分解する
  let d = n - 1n;
  let s = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    s += 1n;
  }

  for (let i = 0; i < k; i++) {
    const a = randomBigInt(2n, n - 2n);
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let r = 0n; r < s - 1n; r++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }
    if (composite) return false; // 合成数と確定
  }
  return true;
}
```

```cpp
#include <cstdint>
#include <random>

// __uint128_t で乗算のオーバーフローを避ける(GCC/Clang拡張)
uint64_t modPow(uint64_t base, uint64_t exp, uint64_t mod) {
    uint64_t result = 1 % mod;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) {
            result = static_cast<uint64_t>(static_cast<__uint128_t>(result) * base % mod);
        }
        base = static_cast<uint64_t>(static_cast<__uint128_t>(base) * base % mod);
        exp >>= 1;
    }
    return result;
}

bool isProbablePrime(uint64_t n, int k = 20) {
    if (n < 2) return false;
    for (uint64_t p : {2ULL, 3ULL, 5ULL, 7ULL, 11ULL, 13ULL, 17ULL, 19ULL, 23ULL, 29ULL}) {
        if (n == p) return true;
        if (n % p == 0) return false;
    }

    // n - 1 = 2^s * d (dは奇数) の形に分解する
    uint64_t d = n - 1;
    int s = 0;
    while (d % 2 == 0) {
        d /= 2;
        s++;
    }

    std::mt19937_64 rng(std::random_device{}());
    for (int i = 0; i < k; i++) {
        std::uniform_int_distribution<uint64_t> dist(2, n - 2);
        uint64_t a = dist(rng);
        uint64_t x = modPow(a, d, n);
        if (x == 1 || x == n - 1) continue;
        bool composite = true;
        for (int r = 0; r < s - 1; r++) {
            x = modPow(x, 2, n);
            if (x == n - 1) {
                composite = false;
                break;
            }
        }
        if (composite) return false;  // 合成数と確定
    }
    return true;
}
```

```rust
// 標準ライブラリのみで完結させるための簡易xorshift乱数生成器
struct SimpleRng {
    state: u64,
}

impl SimpleRng {
    fn new(seed: u64) -> Self {
        Self { state: if seed == 0 { 0x9E3779B97F4A7C15 } else { seed } }
    }

    fn next_u64(&mut self) -> u64 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        self.state
    }

    fn gen_range(&mut self, lo: u64, hi: u64) -> u64 {
        lo + self.next_u64() % (hi - lo + 1)
    }
}

// u128 で乗算のオーバーフローを避ける
fn mod_pow(base: u64, exp: u64, modulus: u64) -> u64 {
    let m = modulus as u128;
    let mut result: u128 = 1 % m;
    let mut b = base as u128 % m;
    let mut e = exp;
    while e > 0 {
        if e & 1 == 1 {
            result = result * b % m;
        }
        b = b * b % m;
        e >>= 1;
    }
    result as u64
}

fn is_probable_prime(n: u64, k: u32, seed: u64) -> bool {
    if n < 2 {
        return false;
    }
    for &p in &[2, 3, 5, 7, 11, 13, 17, 19, 23, 29] {
        if n == p {
            return true;
        }
        if n % p == 0 {
            return false;
        }
    }

    // n - 1 = 2^s * d (dは奇数) の形に分解する
    let mut d = n - 1;
    let mut s = 0;
    while d % 2 == 0 {
        d /= 2;
        s += 1;
    }

    let mut rng = SimpleRng::new(seed);
    'witness: for _ in 0..k {
        let a = rng.gen_range(2, n - 2);
        let mut x = mod_pow(a, d, n);
        if x == 1 || x == n - 1 {
            continue;
        }
        for _ in 0..s - 1 {
            x = mod_pow(x, 2, n);
            if x == n - 1 {
                continue 'witness;
            }
        }
        return false; // 合成数と確定
    }
    true
}
```

```csharp
using System.Numerics;

static bool IsProbablePrime(long n, int k = 20)
{
    if (n < 2) return false;
    foreach (var p in new long[] { 2, 3, 5, 7, 11, 13, 17, 19, 23, 29 })
    {
        if (n == p) return true;
        if (n % p == 0) return false;
    }

    // n - 1 = 2^s * d (dは奇数) の形に分解する
    long d = n - 1;
    long s = 0;
    while (d % 2 == 0)
    {
        d /= 2;
        s++;
    }

    var rand = new Random();
    for (int i = 0; i < k; i++)
    {
        long a = 2 + (long)(rand.NextDouble() * (n - 4));
        long x = (long)BigInteger.ModPow(a, d, n);
        if (x == 1 || x == n - 1) continue;
        bool composite = true;
        for (long r = 0; r < s - 1; r++)
        {
            x = (long)BigInteger.ModPow(x, 2, n);
            if (x == n - 1)
            {
                composite = false;
                break;
            }
        }
        if (composite) return false; // 合成数と確定
    }
    return true;
}
```
