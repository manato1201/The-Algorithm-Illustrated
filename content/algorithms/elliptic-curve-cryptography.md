---
name: 楕円曲線暗号(ECC)
category: 数論・暗号
subcategory: 暗号・鍵交換
complexity: O(log n)(スカラー倍算、繰り返し二乗法と同様の二進法展開を使用)
summary: 通常の整数の掛け算の代わりに楕円曲線上の「点の加算」という独自の演算を使うことで、RSA暗号よりずっと短い鍵長で同等の安全性を実現する現代暗号の主流技術。
---

## 概要

[RSA暗号](/algorithms/rsa)や[ElGamal暗号](/algorithms/elgamal-encryption)は「大きな数の掛け算・べき乗」という通常の数論演算に依拠するが、楕円曲線暗号(ECC)は全く異なる数学的世界——`y² = x³ + ax + b`という方程式で定義される楕円曲線上の点に、「加算」という独自のルールを定義し、その点の加算を繰り返す「スカラー倍算」を暗号の基本演算として使う。楕円曲線上の離散対数問題(ある点`P`を何回加算すれば別の点`Q`になるかを求める問題)は、通常の整数の離散対数問題よりもさらに解読が困難であると考えられており、この結果、RSA暗号よりもはるかに短い鍵長で同等の安全性を達成でき、現代のTLS通信・スマートフォン・ブロックチェーン(Bitcoinの署名等)で広く採用されている。

## 仕組み

1. 楕円曲線`E: y² = x³ + ax + b (mod p)`と、その曲線上の「基点」`G`を、公開パラメータとして定める
2. **点の加算**: 曲線上の異なる2点`P`、`Q`を通る直線を引き、その直線が曲線と交わる3点目を`x`軸に対して反転させたものを`P+Q`と定義する(`P`と`Q`が同じ点の場合は接線を使う「点の倍加」になる)。この幾何学的な操作が、実は`mod p`の世界での有理関数の計算として代数的に定式化でき、コンピュータで効率的に計算できる
3. **スカラー倍算**`kP`(点`P`を`k`回加算する): `k`を2進数展開し、[繰り返し二乗法](/algorithms/modular-exponentiation)と全く同じ「倍加と加算」の二進法アルゴリズムを、通常の乗算の代わりに点の加算・倍加に置き換えて適用する
4. **鍵生成**: 秘密鍵として乱数`d`を選び、公開鍵`Q = dG`(基点`G`を`d`回加算した点)を計算する。`Q`から`d`を逆算すること(楕円曲線離散対数問題)が計算量的に極めて困難であることが安全性の根拠になる
5. この`kP`のスカラー倍算を基本演算として、[Diffie-Hellman鍵共有](/algorithms/diffie-hellman)の楕円曲線版(ECDH)や、デジタル署名(ECDSA)が構成される

## 特性・トレードオフ

- **計算量**: スカラー倍算は[繰り返し二乗法](/algorithms/modular-exponentiation)と同じ`O(log k)`回の点演算で計算できる。同じ安全性強度を得るのに必要な鍵長が、RSA暗号のおよそ1/6〜1/10程度で済む(256ビットのECC鍵が3072ビットのRSA鍵に匹敵するとされる)
- **短い鍵長がもたらす実務上の利点**: 鍵が短いほど、鍵の生成・保存・通信の負荷、および署名・暗号化演算自体の計算コストが下がる——特にスマートフォンやIoTデバイスのような計算資源が限られる環境で大きなメリットになる
- **`y`座標の復元が必要になる場面**: 通信量を減らすため`x`座標だけを送る「点の圧縮」がよく使われるが、受信側で`y`座標を復元するには[Tonelli-Shanksのアルゴリズム](/algorithms/tonelli-shanks)でモジュラー平方根を計算する必要がある——数論の様々な道具が組み合わさって実用システムを構成している好例になっている
- **使いどころ**: TLS/SSL通信の鍵交換・署名(現代のWebブラウザのほぼ全てが対応)、Bitcoinをはじめとする暗号通貨のデジタル署名(ECDSA)、SSH鍵、スマートフォン・IoTデバイスにおける軽量な暗号実装

## 実装例

具体例として教科書でよく使われる小さな曲線`E: y² = x³ + 2x + 2 (mod 17)`、基点`G = (5, 1)`(位数19)を使う。`19G`は無限遠点になり、`7G`も曲線上の点になることを検証している。

```python
Point = tuple[int, int] | None


def ec_point_add(p1: Point, p2: Point, a: int, p: int) -> Point:
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2 and (y1 + y2) % p == 0:
        return None  # 無限遠点
    if p1 == p2:
        m = (3 * x1 * x1 + a) * pow(2 * y1, p - 2, p) % p
    else:
        m = (y2 - y1) * pow(x2 - x1, p - 2, p) % p
    x3 = (m * m - x1 - x2) % p
    y3 = (m * (x1 - x3) - y1) % p
    return (x3, y3)


def ec_scalar_multiply(k: int, point: Point, a: int, p: int) -> Point:
    result: Point = None
    addend = point
    while k > 0:
        if k & 1:
            result = ec_point_add(result, addend, a, p)
        addend = ec_point_add(addend, addend, a, p)
        k >>= 1
    return result
```

```typescript
type Point = [number, number] | null;

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

function ecPointAdd(p1: Point, p2: Point, a: number, p: number): Point {
  if (p1 === null) return p2;
  if (p2 === null) return p1;
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  if (x1 === x2 && (y1 + y2) % p === 0) return null;
  let m: number;
  if (x1 === x2 && y1 === y2) {
    m = ((3 * x1 * x1 + a) * modPow(2 * y1, p - 2, p)) % p;
  } else {
    m = ((y2 - y1) * modPow(x2 - x1, p - 2, p)) % p;
  }
  m = ((m % p) + p) % p;
  const x3 = (((m * m - x1 - x2) % p) + p) % p;
  const y3 = (((m * (x1 - x3) - y1) % p) + p) % p;
  return [x3, y3];
}

function ecScalarMultiply(k: number, point: Point, a: number, p: number): Point {
  let result: Point = null;
  let addend = point;
  while (k > 0) {
    if (k % 2 === 1) result = ecPointAdd(result, addend, a, p);
    addend = ecPointAdd(addend, addend, a, p);
    k = Math.floor(k / 2);
  }
  return result;
}
```

```cpp
#include <optional>
#include <utility>

using Point = std::optional<std::pair<long long, long long>>;

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

Point ecPointAdd(const Point& p1, const Point& p2, long long a, long long p) {
    if (!p1) return p2;
    if (!p2) return p1;
    auto [x1, y1] = *p1;
    auto [x2, y2] = *p2;
    if (x1 == x2 && (y1 + y2) % p == 0) return std::nullopt;
    long long m;
    if (x1 == x2 && y1 == y2) {
        m = (3 * x1 * x1 + a) * modPow(2 * y1, p - 2, p) % p;
    } else {
        m = (y2 - y1) * modPow(x2 - x1, p - 2, p) % p;
    }
    m = ((m % p) + p) % p;
    long long x3 = (((m * m - x1 - x2) % p) + p) % p;
    long long y3 = (((m * (x1 - x3) - y1) % p) + p) % p;
    return std::make_pair(x3, y3);
}

Point ecScalarMultiply(long long k, Point point, long long a, long long p) {
    Point result = std::nullopt;
    Point addend = point;
    while (k > 0) {
        if (k & 1) result = ecPointAdd(result, addend, a, p);
        addend = ecPointAdd(addend, addend, a, p);
        k >>= 1;
    }
    return result;
}
```

```rust
type Point = Option<(i64, i64)>;

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

fn ec_point_add(p1: Point, p2: Point, a: i64, p: i64) -> Point {
    let (x1, y1) = match p1 {
        Some(v) => v,
        None => return p2,
    };
    let (x2, y2) = match p2 {
        Some(v) => v,
        None => return p1,
    };
    if x1 == x2 && (y1 + y2) % p == 0 {
        return None;
    }
    let m = if x1 == x2 && y1 == y2 {
        (3 * x1 * x1 + a) * mod_pow(2 * y1, p - 2, p) % p
    } else {
        (y2 - y1) * mod_pow(x2 - x1, p - 2, p) % p
    };
    let m = ((m % p) + p) % p;
    let x3 = (((m * m - x1 - x2) % p) + p) % p;
    let y3 = (((m * (x1 - x3) - y1) % p) + p) % p;
    Some((x3, y3))
}

fn ec_scalar_multiply(mut k: i64, point: Point, a: i64, p: i64) -> Point {
    let mut result: Point = None;
    let mut addend = point;
    while k > 0 {
        if k & 1 == 1 {
            result = ec_point_add(result, addend, a, p);
        }
        addend = ec_point_add(addend, addend, a, p);
        k >>= 1;
    }
    result
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

static (long x, long y)? EcPointAdd((long x, long y)? p1, (long x, long y)? p2, long a, long p)
{
    if (p1 == null) return p2;
    if (p2 == null) return p1;
    var (x1, y1) = p1.Value;
    var (x2, y2) = p2.Value;
    if (x1 == x2 && (y1 + y2) % p == 0) return null;
    long m;
    if (x1 == x2 && y1 == y2)
        m = (3 * x1 * x1 + a) * ModPow(2 * y1, p - 2, p) % p;
    else
        m = (y2 - y1) * ModPow(x2 - x1, p - 2, p) % p;
    m = ((m % p) + p) % p;
    long x3 = (((m * m - x1 - x2) % p) + p) % p;
    long y3 = (((m * (x1 - x3) - y1) % p) + p) % p;
    return (x3, y3);
}

static (long x, long y)? EcScalarMultiply(long k, (long x, long y)? point, long a, long p)
{
    (long x, long y)? result = null;
    var addend = point;
    while (k > 0)
    {
        if ((k & 1) == 1) result = EcPointAdd(result, addend, a, p);
        addend = EcPointAdd(addend, addend, a, p);
        k >>= 1;
    }
    return result;
}
```
