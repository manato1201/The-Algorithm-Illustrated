---
name: ディフィー・ヘルマン鍵共有
category: 数論・暗号
subcategory: 暗号・鍵交換
complexity: O(log n)(べき乗剰余)
summary: 離散対数問題の困難さを利用し、盗聴者がいる通信路上で共通鍵を安全に共有する。
---

## 概要

「盗聴されている可能性のある通信路の上で、事前に何も共有していない2人が、盗聴者にはわからない共通の秘密(鍵)を作り出せるか」という、一見不可能に思える問題を解決した、公開鍵暗号の歴史における画期的な発明。1976年にホイットフィールド・ディフィーとマーティン・ヘルマンが発表し、それまで「暗号鍵は安全な経路で事前に共有しておくもの」という常識を覆した。

## 仕組み

離散対数問題(`g^x mod p` からxを求めるのは困難だが、xからg^xを計算するのは簡単、という非対称性)を利用する。

1. 全員が知っていてよい公開のパラメータとして、大きな素数pと、その原始根gを決めておく
2. Aliceはランダムな秘密の数aを選び、`A = g^a mod p` を計算してBobに送る(aは誰にも送らない)
3. Bobもランダムな秘密の数bを選び、`B = g^b mod p` を計算してAliceに送る
4. Aliceは受け取ったBを使い、`B^a mod p = g^(ab) mod p` を計算する
5. Bobも受け取ったAを使い、`A^b mod p = g^(ab) mod p` を計算する
6. 両者とも同じ値 `g^(ab) mod p` にたどり着くが、**これを傍受しただけの第三者は、A, B, g, pしか知らないため、離散対数問題を解かない限りabを求められず、共通鍵を再現できない**

通信路を流れるのはA, Bという「計算結果」だけで、秘密の数a, bそのものは一度も送信されない、というのが安全性の核心。

## 特性・トレードオフ

- **計算量**: べき乗剰余の計算はO(log n)(繰り返し二乗法)で高速に行える
- **RSAとの違い**: RSAが「暗号化・復号」のための仕組みなのに対し、ディフィー・ヘルマンは「共通鍵をどう安全に作るか」に特化した**鍵共有**プロトコルである点が異なる。実務では、この方法で共通鍵を作った後、実際の通信は高速な共通鍵暗号(AESなど)で行うことが多い
- **中間者攻撃への弱さ**: この基本形は「通信相手が本当に本人か」を検証する仕組みを持たないため、通信の途中に割り込む攻撃者が両者になりすませてしまう(中間者攻撃)。実用のプロトコル(TLSなど)では、デジタル署名による認証と組み合わせて使われる
- **使いどころ**: HTTPS(TLS)における鍵交換、VPN接続の確立、メッセージングアプリのEnd-to-End暗号化における初期鍵共有など、現代のインターネット通信のセキュリティの根幹を支える技術

## 実装例

```python
def dh_public_value(g: int, p: int, secret: int) -> int:
    """公開パラメータg, pと秘密の数secretから、相手に送る公開値を計算する"""
    return pow(g, secret, p)


def dh_shared_secret(other_public: int, secret: int, p: int) -> int:
    """相手の公開値と自分の秘密の数から、共通鍵(g^(ab) mod p)を計算する"""
    return pow(other_public, secret, p)


# 例: p=23, g=5 は原始根の組。Aliceの秘密=6, Bobの秘密=15
p, g = 23, 5
alice_public = dh_public_value(g, p, 6)   # = 8
bob_public = dh_public_value(g, p, 15)    # = 19
alice_key = dh_shared_secret(bob_public, 6, p)   # = 2
bob_key = dh_shared_secret(alice_public, 15, p)  # = 2 (一致する)
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

// 公開パラメータg, pと秘密の数secretから、相手に送る公開値を計算する
function dhPublicValue(g: bigint, p: bigint, secret: bigint): bigint {
  return modPow(g, secret, p);
}

// 相手の公開値と自分の秘密の数から、共通鍵(g^(ab) mod p)を計算する
function dhSharedSecret(otherPublic: bigint, secret: bigint, p: bigint): bigint {
  return modPow(otherPublic, secret, p);
}
```

```cpp
#include <cstdint>

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

// 公開パラメータg, pと秘密の数secretから、相手に送る公開値を計算する
uint64_t dhPublicValue(uint64_t g, uint64_t p, uint64_t secret) {
    return modPow(g, secret, p);
}

// 相手の公開値と自分の秘密の数から、共通鍵(g^(ab) mod p)を計算する
uint64_t dhSharedSecret(uint64_t otherPublic, uint64_t secret, uint64_t p) {
    return modPow(otherPublic, secret, p);
}
```

```rust
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

// 公開パラメータg, pと秘密の数secretから、相手に送る公開値を計算する
fn dh_public_value(g: u64, p: u64, secret: u64) -> u64 {
    mod_pow(g, secret, p)
}

// 相手の公開値と自分の秘密の数から、共通鍵(g^(ab) mod p)を計算する
fn dh_shared_secret(other_public: u64, secret: u64, p: u64) -> u64 {
    mod_pow(other_public, secret, p)
}
```

```csharp
using System.Numerics;

// 公開パラメータg, pと秘密の数secretから、相手に送る公開値を計算する
static BigInteger DhPublicValue(BigInteger g, BigInteger p, BigInteger secret)
    => BigInteger.ModPow(g, secret, p);

// 相手の公開値と自分の秘密の数から、共通鍵(g^(ab) mod p)を計算する
static BigInteger DhSharedSecret(BigInteger otherPublic, BigInteger secret, BigInteger p)
    => BigInteger.ModPow(otherPublic, secret, p);
```
