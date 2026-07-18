---
name: ElGamal暗号
category: 数論・暗号
subcategory: 暗号・鍵交換
complexity: O(log n)(暗号化・復号、繰り返し二乗法使用時)
summary: 離散対数問題の困難性を根拠に、Diffie-Hellman鍵共有の考え方をそのまま公開鍵暗号方式へ拡張した、暗号文が確率的に変化する(同じ平文でも毎回異なる暗号文になる)古典的な公開鍵暗号。
---

## 概要

[Diffie-Hellman鍵共有](/algorithms/diffie-hellman)は2者間で共通の秘密鍵を安全に作る手順だが、それ自体はメッセージを暗号化する方式ではない。1985年にターヘル・エルガマルが発表したElGamal暗号は、Diffie-Hellman鍵共有と同じ数学的基盤(離散対数問題の困難性)を使いながら、実際にメッセージを暗号化・復号できる公開鍵暗号方式へと拡張したものである。[RSA暗号](/algorithms/rsa)が素因数分解の困難性に依拠するのに対し、ElGamal暗号は離散対数問題(`g^x mod p`から`x`を逆算する困難さ)に依拠する、暗号の理論的基盤という点でも対照的な存在になっている。

## 仕組み

1. **鍵生成**: 大きな素数`p`と、その原始根`g`を選ぶ(公開情報)。秘密鍵として`1 < x < p-1`をランダムに選び、公開鍵`h = g^x mod p`を計算する
2. **暗号化**: メッセージ`m`を送りたい人は、送信のたびに使い捨ての乱数`k`をランダムに選ぶ(これが「確率的」暗号方式である所以で、同じ`m`でも`k`が違えば暗号文が毎回変わる)。暗号文は2つの値の組`(c1, c2)`として計算される: `c1 = g^k mod p`、`c2 = m × h^k mod p`
3. **復号**: 受信者は秘密鍵`x`を使って共有鍵相当の値`s = c1^x mod p`を計算する(これは`g^(kx) mod p`に等しく、送信者側で`h^k = (g^x)^k = g^(kx)`として使った値と同じになる、[Diffie-Hellman鍵共有](/algorithms/diffie-hellman)と全く同じ数学的な一致の仕組み)。`m = c2 × s⁻¹ mod p`(`s`の逆元を掛ける)を計算すると、元のメッセージ`m`が復元される

## 特性・トレードオフ

- **計算量**: 暗号化・復号ともに[繰り返し二乗法](/algorithms/modular-exponentiation)による`O(log n)`回のべき乗計算が中心で、[RSA暗号](/algorithms/rsa)と同程度の計算コストになる
- **確率的暗号方式であることの意味**: 暗号化のたびにランダムな`k`を使うため、同じ平文を2回暗号化しても異なる暗号文が生成される(意味論的安全性)。素のRSA暗号(ランダム性を加えない場合)が同じ平文から常に同じ暗号文を生成してしまうのとは対照的な利点で、暗号文の一致から平文の一致を推測されるパターン解析攻撃への耐性が高い
- **暗号文の膨張という代償**: 暗号文が`(c1, c2)`という2つの値の組になるため、暗号文のサイズが平文の2倍になる——RSA暗号の暗号文サイズが平文とほぼ同じであるのと比べたトレードオフ
- **使いどころ**: [Diffie-Hellman鍵共有](/algorithms/diffie-hellman)と組み合わせたハイブリッド暗号方式の理論的基盤、GnuPGなどのメール暗号化ソフトウェアの鍵交換部分、電子投票システムにおける準同型性(暗号文同士の演算が平文の演算に対応する性質)を利用した票の集計、[楕円曲線暗号](/algorithms/elliptic-curve-cryptography)上でのElGamal暗号の変種(楕円曲線ElGamal)としても現代の暗号システムに応用されている

## 実装例

具体例として`p = 23`(素数)、原始根`g = 5`、秘密鍵`x = 6`、平文`m = 10`、使い捨て乱数`k = 3`で暗号化・復号を行うと、正しく`m = 10`が復元される。

```python
def elgamal_generate_public_key(p: int, g: int, x: int) -> int:
    return pow(g, x, p)


def elgamal_encrypt(p: int, g: int, h: int, m: int, k: int) -> tuple[int, int]:
    c1 = pow(g, k, p)
    c2 = (m * pow(h, k, p)) % p
    return c1, c2


def elgamal_decrypt(p: int, x: int, c1: int, c2: int) -> int:
    s = pow(c1, x, p)
    s_inv = pow(s, p - 2, p)  # フェルマーの小定理によるmod逆元
    return (c2 * s_inv) % p
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

function elgamalGeneratePublicKey(p: number, g: number, x: number): number {
  return modPow(g, x, p);
}

function elgamalEncrypt(p: number, g: number, h: number, m: number, k: number): [number, number] {
  const c1 = modPow(g, k, p);
  const c2 = (m * modPow(h, k, p)) % p;
  return [c1, c2];
}

function elgamalDecrypt(p: number, x: number, c1: number, c2: number): number {
  const s = modPow(c1, x, p);
  const sInv = modPow(s, p - 2, p);
  return (c2 * sInv) % p;
}
```

```cpp
#include <utility>

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

long long elgamalGeneratePublicKey(long long p, long long g, long long x) {
    return modPow(g, x, p);
}

std::pair<long long, long long> elgamalEncrypt(long long p, long long g, long long h, long long m, long long k) {
    long long c1 = modPow(g, k, p);
    long long c2 = (m * modPow(h, k, p)) % p;
    return {c1, c2};
}

long long elgamalDecrypt(long long p, long long x, long long c1, long long c2) {
    long long s = modPow(c1, x, p);
    long long sInv = modPow(s, p - 2, p);
    return (c2 * sInv) % p;
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

fn elgamal_generate_public_key(p: i64, g: i64, x: i64) -> i64 {
    mod_pow(g, x, p)
}

fn elgamal_encrypt(p: i64, g: i64, h: i64, m: i64, k: i64) -> (i64, i64) {
    let c1 = mod_pow(g, k, p);
    let c2 = (m * mod_pow(h, k, p)) % p;
    (c1, c2)
}

fn elgamal_decrypt(p: i64, x: i64, c1: i64, c2: i64) -> i64 {
    let s = mod_pow(c1, x, p);
    let s_inv = mod_pow(s, p - 2, p);
    (c2 * s_inv) % p
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

static long ElGamalGeneratePublicKey(long p, long g, long x) => ModPow(g, x, p);

static (long c1, long c2) ElGamalEncrypt(long p, long g, long h, long m, long k)
{
    long c1 = ModPow(g, k, p);
    long c2 = (m * ModPow(h, k, p)) % p;
    return (c1, c2);
}

static long ElGamalDecrypt(long p, long x, long c1, long c2)
{
    long s = ModPow(c1, x, p);
    long sInv = ModPow(s, p - 2, p);
    return (c2 * sInv) % p;
}
```
