---
name: Tonelli-Shanksのアルゴリズム
category: 数論・暗号
subcategory: 合同算術・剰余系
complexity: O((log p)²)(最悪)、O(log p)(pに応じた多くのケース)
summary: 素数を法とした世界での「平方根」、すなわちx²≡a (mod p)を満たすxを求める、楕円曲線暗号の点の復元などで実用上重要な役割を果たす数論アルゴリズム。
---

## 概要

普通の実数の世界で`x² = a`を解くのは平方根を取るだけの単純な操作だが、「`p`を法とした世界」(`mod p`の世界)で`x² ≡ a (mod p)`を満たす`x`(`a`の「モジュラー平方根」)を求めるのは、一見同じような問題に見えて実は非自明である。1891年にアルベルト・トネッリが原型を示し、1973年にダニエル・シャンクスが再発見・整理したこのアルゴリズムは、`p`が奇素数であるという条件のもとで、このモジュラー平方根を効率的に求める、[楕円曲線暗号(ECC)](/algorithms/elliptic-curve-cryptography)における点の座標復元など、現代暗号の実装で実用上重要な役割を果たす数論アルゴリズムである。

## 仕組み

1. まず、`a`が`p`を法として平方剰余である(つまりそもそも解`x`が存在する)かどうかを、オイラーの規準`a^((p-1)/2) ≡ 1 (mod p)`で確認する(これが1でなければ解なし、`p-1`で割ると`-1`になれば非剰余で解なし)
2. `p - 1 = Q × 2^S`(`Q`は奇数)の形に分解する。これは[ミラー・ラビン素数判定法](/algorithms/miller-rabin)が`n-1`を同じ形に分解する処理と全く同じ構造である
3. **`S = 1`の特殊ケース**(`p ≡ 3 (mod 4)`のとき): この場合は`x = a^((p+1)/4) mod p`という単純な式で直接答えが求まる(実務で頻出する簡単なケース)
4. **一般のケース**: 平方非剰余(オイラーの規準で`-1`になる数)`z`を1つ見つけ、`z`から作った特別な値を使いながら、`S`回程度の反復で候補解を段階的に真の平方根へ収束させていく——各反復で、現在の候補の「ずれ」を表す位数を計算し、それを解消するように候補を更新する
5. 最終的に`x² ≡ a (mod p)`を満たす`x`が得られる(もう一方の解は`p - x`になる)

## 特性・トレードオフ

- **計算量**: 最悪`O((log p)²)`程度だが、`p ≡ 3 (mod 4)`(暗号でよく使われる多くの素数がこの形)のような扱いやすいケースでは、単純なべき乗計算1回、`O(log p)`で済む
- **[ミラー・ラビン素数判定法](/algorithms/miller-rabin)との構造的な類似性**: `p-1`を`Q × 2^S`の形に分解し、`S`段階の反復で答えを絞り込んでいくという骨格は、ミラー・ラビン法の合成数判定プロセスと数学的に深く関連しており、同じ数論的な道具立て(平方剰余の理論)を異なる目的に応用した姉妹アルゴリズムと言える
- **楕円曲線暗号における実用上の必要性**: [楕円曲線暗号](/algorithms/elliptic-curve-cryptography)では、曲線上の点は`(x, y)`の座標を持ち、`y² = x³ + ax + b (mod p)`という関係を満たす。圧縮された公開鍵(`x`座標だけを伝送する形式)から`y`座標を復元する際に、まさにこのTonelli-Shanksのアルゴリズムでモジュラー平方根を計算する必要がある
- **使いどころ**: 楕円曲線暗号における圧縮点の復元、平方剰余に関する数論研究、二次篩法のような高度な素因数分解アルゴリズムの内部計算、[中国剰余定理](/algorithms/chinese-remainder-theorem)と組み合わせた複数の法での連立平方根計算

## 実装例

具体例として`p = 13`、`n = 10`(`x² ≡ 10 (mod 13)`の解は`x = 6`または`7`)、および`p ≡ 1 (mod 4)`となる`p = 41`のケースで検証している。

```python
def tonelli_shanks(n: int, p: int) -> int | None:
    n %= p
    if pow(n, (p - 1) // 2, p) != 1:
        return None  # nはpを法とする平方非剰余

    if p % 4 == 3:
        return pow(n, (p + 1) // 4, p)

    q, s = p - 1, 0
    while q % 2 == 0:
        q //= 2
        s += 1

    z = 2
    while pow(z, (p - 1) // 2, p) != p - 1:
        z += 1

    m, c, t, r = s, pow(z, q, p), pow(n, q, p), pow(n, (q + 1) // 2, p)
    while t != 1:
        i, t2i = 0, t
        while t2i != 1:
            t2i = (t2i * t2i) % p
            i += 1
        b = pow(c, 1 << (m - i - 1), p)
        m = i
        c = (b * b) % p
        t = (t * c) % p
        r = (r * b) % p
    return r
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

function tonelliShanks(n: number, p: number): number | null {
  n = ((n % p) + p) % p;
  if (modPow(n, (p - 1) / 2, p) !== 1) return null;
  if (p % 4 === 3) return modPow(n, (p + 1) / 4, p);

  let q = p - 1;
  let s = 0;
  while (q % 2 === 0) {
    q /= 2;
    s++;
  }

  let z = 2;
  while (modPow(z, (p - 1) / 2, p) !== p - 1) z++;

  let m = s;
  let c = modPow(z, q, p);
  let t = modPow(n, q, p);
  let r = modPow(n, (q + 1) / 2, p);

  while (t !== 1) {
    let i = 0;
    let t2i = t;
    while (t2i !== 1) {
      t2i = (t2i * t2i) % p;
      i++;
    }
    const b = modPow(c, 1 << (m - i - 1), p);
    m = i;
    c = (b * b) % p;
    t = (t * c) % p;
    r = (r * b) % p;
  }
  return r;
}
```

```cpp
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

std::optional<long long> tonelliShanks(long long n, long long p) {
    n = ((n % p) + p) % p;
    if (modPow(n, (p - 1) / 2, p) != 1) return std::nullopt;
    if (p % 4 == 3) return modPow(n, (p + 1) / 4, p);

    long long q = p - 1, s = 0;
    while (q % 2 == 0) { q /= 2; s++; }

    long long z = 2;
    while (modPow(z, (p - 1) / 2, p) != p - 1) z++;

    long long m = s, c = modPow(z, q, p), t = modPow(n, q, p), r = modPow(n, (q + 1) / 2, p);

    while (t != 1) {
        long long i = 0, t2i = t;
        while (t2i != 1) { t2i = (t2i * t2i) % p; i++; }
        long long b = modPow(c, 1LL << (m - i - 1), p);
        m = i;
        c = (b * b) % p;
        t = (t * c) % p;
        r = (r * b) % p;
    }
    return r;
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

fn tonelli_shanks(n: i64, p: i64) -> Option<i64> {
    let n = ((n % p) + p) % p;
    if mod_pow(n, (p - 1) / 2, p) != 1 {
        return None;
    }
    if p % 4 == 3 {
        return Some(mod_pow(n, (p + 1) / 4, p));
    }

    let mut q = p - 1;
    let mut s = 0i64;
    while q % 2 == 0 {
        q /= 2;
        s += 1;
    }

    let mut z = 2i64;
    while mod_pow(z, (p - 1) / 2, p) != p - 1 {
        z += 1;
    }

    let mut m = s;
    let mut c = mod_pow(z, q, p);
    let mut t = mod_pow(n, q, p);
    let mut r = mod_pow(n, (q + 1) / 2, p);

    while t != 1 {
        let mut i = 0;
        let mut t2i = t;
        while t2i != 1 {
            t2i = (t2i * t2i) % p;
            i += 1;
        }
        let b = mod_pow(c, 1i64 << (m - i - 1), p);
        m = i;
        c = (b * b) % p;
        t = (t * c) % p;
        r = (r * b) % p;
    }
    Some(r)
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

static long? TonelliShanks(long n, long p)
{
    n = ((n % p) + p) % p;
    if (ModPow(n, (p - 1) / 2, p) != 1) return null;
    if (p % 4 == 3) return ModPow(n, (p + 1) / 4, p);

    long q = p - 1;
    long s = 0;
    while (q % 2 == 0) { q /= 2; s++; }

    long z = 2;
    while (ModPow(z, (p - 1) / 2, p) != p - 1) z++;

    long m = s, c = ModPow(z, q, p), t = ModPow(n, q, p), r = ModPow(n, (q + 1) / 2, p);

    while (t != 1)
    {
        long i = 0, t2i = t;
        while (t2i != 1) { t2i = (t2i * t2i) % p; i++; }
        long b = ModPow(c, 1L << (int)(m - i - 1), p);
        m = i;
        c = (b * b) % p;
        t = (t * c) % p;
        r = (r * b) % p;
    }
    return r;
}
```
