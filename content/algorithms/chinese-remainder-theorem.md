---
name: 中国剰余定理(CRT)
category: 数論・暗号
subcategory: 合同算術・剰余系
complexity: O(log n)
summary: 複数の合同式から元の値を復元する。RSA復号の高速化にも応用される。
---

## 概要

「3で割ると2余り、5で割ると3余り、7で割ると2余る数は何か」——このような、複数の「割った余り」の条件から元の数を復元する問題を解く、5世紀頃の中国の数学書『孫子算経』にまで遡る古典的な定理。互いに素な法(割る数)の組についてこの問題が常に一意に解けることを保証しており、現代では暗号処理の高速化に実用的に応用されている。

## 仕組み

法 `m1, m2, ..., mk`(全て互いに素)と、それぞれに対する余り `r1, r2, ..., rk` が与えられたとき:

1. 全ての法の積 `M = m1 × m2 × ... × mk` を求める
2. 各iについて、`Mi = M / mi`(自分以外の法を全て掛けた値)を計算する
3. 拡張ユークリッドの互除法を使い、`Mi × yi ≡ 1 (mod mi)`(Miのmiを法とする逆数yi)を求める
4. `x = Σ(ri × Mi × yi) mod M` が求める答えになる

「それぞれの条件を満たす"部品"を個別に作り、それらを足し合わせる」という構成になっており、各部品は自分の担当する法以外では影響を及ぼさないよう巧妙に設計されている(他の法で割ると必ず0になるように作られている)。

## 特性・トレードオフ

- **計算量**: O(log n)(拡張ユークリッドの互除法の計算量に支配される)
- **RSA復号の高速化(CRT-RSA)**: RSA暗号の復号は `c^d mod n`(n = p×q)という計算だが、これを直接計算する代わりに、`c^d mod p` と `c^d mod q` をそれぞれ計算してから中国剰余定理で組み合わせると、**理論上約4倍の高速化**が実現できる(法が半分の桁数になることで、べき乗剰余の計算コストが大きく下がるため)。実務のRSA実装で広く使われている最適化
- **一意性の保証**: 法が互いに素であるという条件のもとでは、解は `0からM-1` の範囲でただ1つに定まることが定理として保証される
- **使いどころ**: CRT-RSAによる暗号処理の高速化、大きな数の計算を複数の小さな法での計算に分割して並列化する手法(モジュラー演算の分散処理)、パズル・暗号解読における連立合同式の解法

## 実装例

```python
def _extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    old_r, r = a, b
    old_x, x = 1, 0
    old_y, y = 0, 1
    while r != 0:
        q = old_r // r
        old_r, r = r, old_r - q * r
        old_x, x = x, old_x - q * x
        old_y, y = y, old_y - q * y
    return old_r, old_x, old_y


def crt(remainders: list[int], moduli: list[int]) -> int:
    """moduliは互いに素であること。戻り値は 0 <= x < M の範囲の唯一解。"""
    M = 1
    for m in moduli:
        M *= m
    x = 0
    for r, m in zip(remainders, moduli):
        Mi = M // m
        _, yi, _ = _extended_gcd(Mi, m)
        x += r * Mi * (yi % m)
    return x % M
```

```typescript
function extendedGcdForCrt(a: number, b: number): [gcd: number, x: number, y: number] {
  let oldR = a, r = b;
  let oldX = 1, x = 0;
  let oldY = 0, y = 1;
  while (r !== 0) {
    const q = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldX, x] = [x, oldX - q * x];
    [oldY, y] = [y, oldY - q * y];
  }
  return [oldR, oldX, oldY];
}

// moduliは互いに素であること。戻り値は 0 <= x < M の範囲の唯一解。
function crt(remainders: number[], moduli: number[]): number {
  const M = moduli.reduce((acc, m) => acc * m, 1);
  let x = 0;
  for (let i = 0; i < remainders.length; i++) {
    const r = remainders[i];
    const m = moduli[i];
    const Mi = M / m;
    const [, yiRaw] = extendedGcdForCrt(Mi, m);
    const yi = ((yiRaw % m) + m) % m;
    x += r * Mi * yi;
  }
  return ((x % M) + M) % M;
}
```

```cpp
#include <vector>
#include <tuple>

std::tuple<long long, long long, long long> extendedGcdForCrt(long long a, long long b) {
    long long oldR = a, r = b;
    long long oldX = 1, x = 0;
    long long oldY = 0, y = 1;
    while (r != 0) {
        long long q = oldR / r;
        long long tmpR = oldR - q * r; oldR = r; r = tmpR;
        long long tmpX = oldX - q * x; oldX = x; x = tmpX;
        long long tmpY = oldY - q * y; oldY = y; y = tmpY;
    }
    return {oldR, oldX, oldY};
}

// moduliは互いに素であること。戻り値は 0 <= x < M の範囲の唯一解。
long long crt(const std::vector<long long>& remainders, const std::vector<long long>& moduli) {
    long long M = 1;
    for (long long m : moduli) M *= m;
    long long x = 0;
    for (size_t i = 0; i < remainders.size(); i++) {
        long long r = remainders[i];
        long long m = moduli[i];
        long long Mi = M / m;
        auto [g, yiRaw, yUnused] = extendedGcdForCrt(Mi, m);
        (void)g; (void)yUnused;
        long long yi = ((yiRaw % m) + m) % m;
        x += r * Mi * yi;
    }
    return ((x % M) + M) % M;
}
```

```rust
fn extended_gcd_for_crt(a: i64, b: i64) -> (i64, i64, i64) {
    let (mut old_r, mut r) = (a, b);
    let (mut old_x, mut x) = (1i64, 0i64);
    let (mut old_y, mut y) = (0i64, 1i64);
    while r != 0 {
        let q = old_r / r;
        let tmp_r = old_r - q * r; old_r = r; r = tmp_r;
        let tmp_x = old_x - q * x; old_x = x; x = tmp_x;
        let tmp_y = old_y - q * y; old_y = y; y = tmp_y;
    }
    (old_r, old_x, old_y)
}

// moduliは互いに素であること。戻り値は 0 <= x < M の範囲の唯一解。
fn crt(remainders: &[i64], moduli: &[i64]) -> i64 {
    let m_total: i64 = moduli.iter().product();
    let mut x = 0i64;
    for (&r, &m) in remainders.iter().zip(moduli.iter()) {
        let mi = m_total / m;
        let (_, yi_raw, _) = extended_gcd_for_crt(mi, m);
        let yi = ((yi_raw % m) + m) % m;
        x += r * mi * yi;
    }
    ((x % m_total) + m_total) % m_total
}
```

```csharp
static (long g, long x, long y) ExtendedGcdForCrt(long a, long b)
{
    long oldR = a, r = b;
    long oldX = 1, x = 0;
    long oldY = 0, y = 1;
    while (r != 0)
    {
        long q = oldR / r;
        (oldR, r) = (r, oldR - q * r);
        (oldX, x) = (x, oldX - q * x);
        (oldY, y) = (y, oldY - q * y);
    }
    return (oldR, oldX, oldY);
}

// moduliは互いに素であること。戻り値は 0 <= x < M の範囲の唯一解。
static long Crt(long[] remainders, long[] moduli)
{
    long M = moduli.Aggregate(1L, (acc, m) => acc * m);
    long x = 0;
    for (int i = 0; i < remainders.Length; i++)
    {
        long r = remainders[i], m = moduli[i];
        long Mi = M / m;
        var (_, yiRaw, _) = ExtendedGcdForCrt(Mi, m);
        long yi = ((yiRaw % m) + m) % m;
        x += r * Mi * yi;
    }
    return ((x % M) + M) % M;
}
```
