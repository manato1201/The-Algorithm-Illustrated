---
name: RSA暗号
category: 数論・暗号
subcategory: 暗号・鍵交換
complexity: O(log n)(べき乗剰余)
summary: 素因数分解の困難さを安全性の根拠にした公開鍵暗号。べき乗剰余の高速計算が実装の要。
---

## 概要

「2つの巨大な素数を掛け合わせるのは一瞬でできるが、その積から元の2つの素数を求める(素因数分解)のは、現実的な時間では極めて困難」という数学的な非対称性を安全性の根拠にした、世界で最も広く使われている公開鍵暗号方式。1977年にRivest, Shamir, Adlemanの3人が考案し、頭文字からRSAと名付けられた。暗号化用の「公開鍵」と復号用の「秘密鍵」が異なる、という発想自体がそれまでの暗号(共通鍵暗号)の常識を覆すものだった。

## 仕組み

**鍵の生成**:
1. 2つの巨大な素数p, qを選び、`n = p × q` を計算する(nが公開鍵の一部になる)
2. `φ(n) = (p-1)(q-1)` を計算する(オイラーのトーシェント関数)
3. `φ(n)`と互いに素な整数eを選ぶ(これも公開鍵の一部)
4. 拡張ユークリッドの互除法を使い、`e × d ≡ 1 (mod φ(n))` を満たす秘密鍵dを求める

**暗号化・復号**:
- 暗号化: 平文mを `暗号文 = m^e mod n` で計算する(公開鍵e, nだけで誰でもできる)
- 復号: `平文 = 暗号文^d mod n` で元に戻す(秘密鍵dを知っている人だけができる)

`(m^e)^d mod n = m` が成り立つことは、オイラーの定理という数論の性質から数学的に保証される。安全性は「nから元のp, qを見つける(素因数分解する)ことが計算量的に非現実的である」という前提に完全に依存している。

## 特性・トレードオフ

- **計算量**: べき乗剰余の計算自体は繰り返し二乗法(高速べき乗)を使えばO(log n)で済むが、暗号化・復号1回あたりの実際のコストは、共通鍵暗号(AESなど)に比べると重い
- **公開鍵暗号ならではの利点**: 事前に安全な経路で鍵を共有する必要がない(公開鍵は誰に知られても構わない)。この性質により、初対面の相手ともインターネット越しに安全な通信を開始できる
- **実務では「鍵交換だけ」に使われることが多い**: RSA自体の計算コストの重さから、実際の通信ではRSAで共通鍵を安全に交換し、その後の大量のデータのやり取りは高速な共通鍵暗号(AESなど)で行う、というハイブリッド方式が一般的
- **量子コンピュータへの懸念**: ショアのアルゴリズムという量子アルゴリズムが実用化されれば、素因数分解が高速に解けてしまいRSAの安全性が崩れる可能性があり、量子耐性を持つ暗号方式への移行が研究されている

## 実装例

```python
def egcd(a: int, b: int) -> tuple[int, int, int]:
    if b == 0:
        return a, 1, 0
    g, x1, y1 = egcd(b, a % b)
    return g, y1, x1 - (a // b) * y1


def mod_inverse(e: int, phi: int) -> int:
    g, x, _ = egcd(e, phi)
    if g != 1:
        raise ValueError("eとphiが互いに素ではありません")
    return x % phi


def generate_keys(p: int, q: int, e: int = 17) -> tuple[tuple[int, int], tuple[int, int]]:
    n = p * q
    phi = (p - 1) * (q - 1)
    d = mod_inverse(e, phi)
    return (e, n), (d, n)  # (公開鍵, 秘密鍵)


def rsa_encrypt(m: int, public_key: tuple[int, int]) -> int:
    e, n = public_key
    return pow(m, e, n)


def rsa_decrypt(c: int, private_key: tuple[int, int]) -> int:
    d, n = private_key
    return pow(c, d, n)


# 使用例: p=61, q=53(教科書的な小さい素数の例)
# public_key, private_key = generate_keys(61, 53, 17)
# c = rsa_encrypt(65, public_key)
# m = rsa_decrypt(c, private_key)  # -> 65
```

```typescript
function egcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}

function modInverse(e: bigint, phi: bigint): bigint {
  const [g, x] = egcd(e, phi);
  if (g !== 1n) throw new Error("eとphiが互いに素ではありません");
  return ((x % phi) + phi) % phi;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

function generateKeys(p: bigint, q: bigint, e = 17n): [[bigint, bigint], [bigint, bigint]] {
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  const d = modInverse(e, phi);
  return [[e, n], [d, n]];
}

function rsaEncrypt(m: bigint, publicKey: [bigint, bigint]): bigint {
  const [e, n] = publicKey;
  return modPow(m, e, n);
}

function rsaDecrypt(c: bigint, privateKey: [bigint, bigint]): bigint {
  const [d, n] = privateKey;
  return modPow(c, d, n);
}
```

```cpp
#include <cstdint>
#include <tuple>
#include <stdexcept>

using i64 = int64_t;
using u64 = uint64_t;

std::tuple<i64, i64, i64> extendedGcd(i64 a, i64 b) {
    if (b == 0) return {a, 1, 0};
    auto [g, x1, y1] = extendedGcd(b, a % b);
    return {g, y1, x1 - (a / b) * y1};
}

i64 modInverse(i64 e, i64 phi) {
    auto [g, x, y] = extendedGcd(e, phi);
    if (g != 1) throw std::invalid_argument("eとphiが互いに素ではありません");
    return ((x % phi) + phi) % phi;
}

u64 modPow(u64 base, u64 exp, u64 mod) {
    __int128 result = 1;
    __int128 b = base % mod;
    while (exp > 0) {
        if (exp & 1) result = (result * b) % mod;
        b = (b * b) % mod;
        exp >>= 1;
    }
    return static_cast<u64>(result);
}

struct RsaKeyPair {
    u64 e, d, n;
};

RsaKeyPair generateKeys(u64 p, u64 q, u64 e = 17) {
    u64 n = p * q;
    u64 phi = (p - 1) * (q - 1);
    i64 d = modInverse(static_cast<i64>(e), static_cast<i64>(phi));
    return {e, static_cast<u64>(d), n};
}

u64 rsaEncrypt(u64 m, const RsaKeyPair& keys) {
    return modPow(m, keys.e, keys.n);
}

u64 rsaDecrypt(u64 c, const RsaKeyPair& keys) {
    return modPow(c, keys.d, keys.n);
}
```

```rust
fn extended_gcd(a: i128, b: i128) -> (i128, i128, i128) {
    if b == 0 {
        (a, 1, 0)
    } else {
        let (g, x1, y1) = extended_gcd(b, a % b);
        (g, y1, x1 - (a / b) * y1)
    }
}

fn mod_inverse(e: i128, phi: i128) -> i128 {
    let (g, x, _) = extended_gcd(e, phi);
    assert_eq!(g, 1, "eとphiが互いに素ではありません");
    ((x % phi) + phi) % phi
}

fn mod_pow(base: i128, exp: i128, modulus: i128) -> i128 {
    let mut result: i128 = 1;
    let mut b = base % modulus;
    let mut e = exp;
    while e > 0 {
        if e & 1 == 1 {
            result = result * b % modulus;
        }
        b = b * b % modulus;
        e >>= 1;
    }
    result
}

struct RsaKeyPair {
    e: i128,
    d: i128,
    n: i128,
}

fn generate_keys(p: i128, q: i128, e: i128) -> RsaKeyPair {
    let n = p * q;
    let phi = (p - 1) * (q - 1);
    let d = mod_inverse(e, phi);
    RsaKeyPair { e, d, n }
}

fn rsa_encrypt(m: i128, keys: &RsaKeyPair) -> i128 {
    mod_pow(m, keys.e, keys.n)
}

fn rsa_decrypt(c: i128, keys: &RsaKeyPair) -> i128 {
    mod_pow(c, keys.d, keys.n)
}
```

```csharp
using System;
using System.Numerics;

static (BigInteger g, BigInteger x, BigInteger y) ExtendedGcd(BigInteger a, BigInteger b)
{
    if (b == 0) return (a, 1, 0);
    var (g, x1, y1) = ExtendedGcd(b, a % b);
    return (g, y1, x1 - (a / b) * y1);
}

static BigInteger ModInverse(BigInteger e, BigInteger phi)
{
    var (g, x, _) = ExtendedGcd(e, phi);
    if (g != 1) throw new ArgumentException("eとphiが互いに素ではありません");
    return ((x % phi) + phi) % phi;
}

static ((BigInteger e, BigInteger n) publicKey, (BigInteger d, BigInteger n) privateKey) GenerateKeys(
    BigInteger p, BigInteger q, BigInteger e)
{
    BigInteger n = p * q;
    BigInteger phi = (p - 1) * (q - 1);
    BigInteger d = ModInverse(e, phi);
    return ((e, n), (d, n));
}

static BigInteger RsaEncrypt(BigInteger m, (BigInteger e, BigInteger n) publicKey) =>
    BigInteger.ModPow(m, publicKey.e, publicKey.n);

static BigInteger RsaDecrypt(BigInteger c, (BigInteger d, BigInteger n) privateKey) =>
    BigInteger.ModPow(c, privateKey.d, privateKey.n);
```
