---
name: モンゴメリ乗算
category: 数論・暗号
subcategory: 合同算術・剰余系
complexity: O(1)(1回のモンゴメリ乗算、ワードサイズの整数)
summary: 割り算という遅い演算を一切使わずに、シフトと加算・乗算だけでモジュラー乗算を計算できるよう数をあらかじめ変換しておく、RSA暗号などの実装性能を大きく左右する高速化技法。
---

## 概要

[RSA暗号](/algorithms/rsa)や[Diffie-Hellman鍵共有](/algorithms/diffie-hellman)のような公開鍵暗号は、[繰り返し二乗法](/algorithms/modular-exponentiation)を使って`a^b mod n`を大量に計算する必要があるが、その内部で何度も行われる「`mod n`」という剰余演算(割り算)は、コンピュータのハードウェアにとって加算や乗算よりずっと低速な演算である。1985年にピーター・モンゴメリが発表したこの手法は、数をあらかじめ「モンゴメリ形式」という特殊な表現に変換しておくことで、以降の乗算のたびに必要な剰余演算を、割り算を一切使わない「シフトと加算・乗算」だけの操作に置き換える、暗号ライブラリの実行速度を大きく左右する縁の下の力持ち的な最適化技法である。

## 仕組み

1. 法`n`に対して、`n`と互いに素な`R`(通常はハードウェアのワードサイズに合わせた2のべき乗、例えば`R = 2^64`)を選ぶ
2. 各数`a`を、モンゴメリ形式`ā = a × R mod n`に変換しておく(この変換自体には割り算が必要だが、1回だけ行えばよい)
3. **モンゴメリ乗算**: モンゴメリ形式の2数`ā`、`b̄`の積を求めたいとき、素朴に`ā × b̄ mod n`を計算するのではなく、「モンゴメリ簡約(Montgomery Reduction)」というアルゴリズムを使う——これは`R`が2のべき乗であることを利用し、`mod n`の剰余演算を`R`による(ハードウェア上は単なるビットシフトで実現できる)剰余・除算に置き換えることで、通常の割り算命令を一切使わずに`(ā × b̄) × R⁻¹ mod n`(これがちょうどモンゴメリ形式での積`a×b`の表現になる)を計算する
4. 一連のべき乗計算が全てモンゴメリ形式のまま行える(繰り返し二乗法の各ステップがモンゴメリ乗算に置き換わるだけ)ため、計算の最初と最後だけ通常の形式との変換を行えばよく、途中の割り算のコストを丸ごと削減できる

## 特性・トレードオフ

- **計算量**: 漸近的な計算量のオーダー自体は変わらないが、定数倍の実行速度が大幅に改善される——ハードウェアの除算命令が乗算命令より数倍〜十数倍遅いことを考えると、[繰り返し二乗法](/algorithms/modular-exponentiation)を何百回、何千回と繰り返す公開鍵暗号の実装では、この定数倍の差が実際の処理速度に直結する
- **変換コストとの兼ね合い**: モンゴメリ形式への変換・復元にはそれぞれ1回ずつのコストがかかるため、乗算を1回か2回しか行わないような場面ではメリットが薄い。[繰り返し二乗法](/algorithms/modular-exponentiation)のように同じ法`n`のもとで大量の乗算を繰り返す場面でこそ真価を発揮する
- **タイミング攻撃への耐性という副次的な利点**: 割り算を使わない一定パターンの演算列になるため、実行時間の違いから秘密鍵の情報が漏れる「タイミング攻撃」に対しても、素朴な実装よりも耐性を持たせやすいという、性能面以外の暗号実装上の利点もある
- **使いどころ**: [RSA暗号](/algorithms/rsa)・[Diffie-Hellman鍵共有](/algorithms/diffie-hellman)・[楕円曲線暗号](/algorithms/elliptic-curve-cryptography)といった公開鍵暗号のほぼ全ての実用実装(OpenSSL等の暗号ライブラリ)における[繰り返し二乗法](/algorithms/modular-exponentiation)の内部高速化、大きな数を扱う数論計算全般の性能最適化

## 実装例

```python
def ext_gcd(a: int, b: int) -> tuple[int, int, int]:
    if b == 0:
        return a, 1, 0
    g, x1, y1 = ext_gcd(b, a % b)
    return g, y1, x1 - (a // b) * y1


def mod_inverse(a: int, m: int) -> int:
    _, x, _ = ext_gcd(a, m)
    return x % m


def montgomery_reduce(t: int, n: int, n_inv_neg: int, r: int, r_bits: int) -> int:
    m = ((t & (r - 1)) * n_inv_neg) & (r - 1)
    u = (t + m * n) >> r_bits
    return u - n if u >= n else u


def montgomery_multiply(a: int, b: int, n: int) -> int:
    r_bits = n.bit_length() + 1
    r = 1 << r_bits
    n_inv_neg = (r - mod_inverse(n, r)) % r  # -n^-1 mod r
    a_bar = (a * r) % n
    b_bar = (b * r) % n
    product_bar = montgomery_reduce(a_bar * b_bar, n, n_inv_neg, r, r_bits)
    return montgomery_reduce(product_bar, n, n_inv_neg, r, r_bits)
```

```typescript
function extGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = extGcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}

function modInverse(a: bigint, m: bigint): bigint {
  const [, x] = extGcd(a, m);
  return ((x % m) + m) % m;
}

function bitLength(x: bigint): number {
  let len = 0;
  while (x > 0n) {
    x >>= 1n;
    len++;
  }
  return len;
}

function montgomeryReduce(t: bigint, n: bigint, nInvNeg: bigint, r: bigint, rBits: bigint): bigint {
  const mask = r - 1n;
  const m = ((t & mask) * nInvNeg) & mask;
  const u = (t + m * n) >> rBits;
  return u >= n ? u - n : u;
}

function montgomeryMultiply(a: bigint, b: bigint, n: bigint): bigint {
  const rBits = BigInt(bitLength(n) + 1);
  const r = 1n << rBits;
  const nInvNeg = (r - modInverse(n, r)) % r;
  const aBar = (a * r) % n;
  const bBar = (b * r) % n;
  const productBar = montgomeryReduce(aBar * bBar, n, nInvNeg, r, rBits);
  return montgomeryReduce(productBar, n, nInvNeg, r, rBits);
}
```

```cpp
#include <tuple>

std::tuple<long long, long long, long long> extGcd(long long a, long long b) {
    if (b == 0) return {a, 1, 0};
    auto [g, x1, y1] = extGcd(b, a % b);
    return {g, y1, x1 - (a / b) * y1};
}

long long modInverse(long long a, long long m) {
    auto [g, x, y] = extGcd(a, m);
    return ((x % m) + m) % m;
}

int bitLength(long long x) {
    int len = 0;
    while (x > 0) { x >>= 1; len++; }
    return len;
}

long long montgomeryReduce(__int128 t, long long n, long long nInvNeg, long long r, int rBits) {
    __int128 mask = (__int128)r - 1;
    long long m = static_cast<long long>(((t & mask) * (__int128)nInvNeg) & mask);
    __int128 u = (t + (__int128)m * n) >> rBits;
    long long result = static_cast<long long>(u);
    return result >= n ? result - n : result;
}

long long montgomeryMultiply(long long a, long long b, long long n) {
    int rBits = bitLength(n) + 1;
    long long r = 1LL << rBits;
    long long nInvNeg = (r - modInverse(n, r)) % r;
    long long aBar = (a * r) % n;
    long long bBar = (b * r) % n;
    long long productBar = montgomeryReduce((__int128)aBar * bBar, n, nInvNeg, r, rBits);
    return montgomeryReduce((__int128)productBar, n, nInvNeg, r, rBits);
}
```

```rust
fn ext_gcd(a: i64, b: i64) -> (i64, i64, i64) {
    if b == 0 {
        (a, 1, 0)
    } else {
        let (g, x1, y1) = ext_gcd(b, a % b);
        (g, y1, x1 - (a / b) * y1)
    }
}

fn mod_inverse(a: i64, m: i64) -> i64 {
    let (_, x, _) = ext_gcd(a, m);
    ((x % m) + m) % m
}

fn bit_length(mut x: i64) -> u32 {
    let mut len = 0;
    while x > 0 {
        x >>= 1;
        len += 1;
    }
    len
}

fn montgomery_reduce(t: i128, n: i64, n_inv_neg: i64, r: i64, r_bits: u32) -> i64 {
    let mask = (r as i128) - 1;
    let m = (((t & mask) * n_inv_neg as i128) & mask) as i64;
    let u = (t + m as i128 * n as i128) >> r_bits;
    let result = u as i64;
    if result >= n {
        result - n
    } else {
        result
    }
}

fn montgomery_multiply(a: i64, b: i64, n: i64) -> i64 {
    let r_bits = bit_length(n) + 1;
    let r = 1i64 << r_bits;
    let n_inv_neg = (r - mod_inverse(n, r)) % r;
    let a_bar = (a * r) % n;
    let b_bar = (b * r) % n;
    let product_bar = montgomery_reduce(a_bar as i128 * b_bar as i128, n, n_inv_neg, r, r_bits);
    montgomery_reduce(product_bar as i128, n, n_inv_neg, r, r_bits)
}
```

```csharp
using System.Numerics;

static (BigInteger g, BigInteger x, BigInteger y) ExtGcd(BigInteger a, BigInteger b)
{
    if (b == 0) return (a, 1, 0);
    var (g, x1, y1) = ExtGcd(b, a % b);
    return (g, y1, x1 - (a / b) * y1);
}

static BigInteger ModInverse(BigInteger a, BigInteger m)
{
    var (_, x, _) = ExtGcd(a, m);
    return ((x % m) + m) % m;
}

static int BitLength(BigInteger x)
{
    int len = 0;
    while (x > 0) { x >>= 1; len++; }
    return len;
}

static BigInteger MontgomeryReduce(BigInteger t, BigInteger n, BigInteger nInvNeg, BigInteger r, int rBits)
{
    BigInteger mask = r - 1;
    BigInteger m = ((t & mask) * nInvNeg) & mask;
    BigInteger u = (t + m * n) >> rBits;
    return u >= n ? u - n : u;
}

static BigInteger MontgomeryMultiply(BigInteger a, BigInteger b, BigInteger n)
{
    int rBits = BitLength(n) + 1;
    BigInteger r = BigInteger.One << rBits;
    BigInteger nInvNeg = (r - ModInverse(n, r)) % r;
    BigInteger aBar = (a * r) % n;
    BigInteger bBar = (b * r) % n;
    BigInteger productBar = MontgomeryReduce(aBar * bBar, n, nInvNeg, r, rBits);
    return MontgomeryReduce(productBar, n, nInvNeg, r, rBits);
}
```
