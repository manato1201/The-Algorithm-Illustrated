---
name: Baby-step Giant-step法
category: 数論・暗号
subcategory: 暗号・鍵交換
complexity: O(√n)
summary: 離散対数問題を、力任せのO(n)から時間・空間トレードオフでO(√n)に高速化する。
---

## 概要

「`g^x ≡ h (mod p)` を満たすxを求めよ」という離散対数問題は、ディフィー・ヘルマン鍵共有をはじめとする暗号方式の安全性の根拠になっている(この問題を効率的に解く方法が見つかっていないからこそ、これらの暗号は安全とされる)。しかし法pがそれほど大きくない場合、Baby-step Giant-step法という**メモリを使って時間を買う**古典的なテクニックで、力任せのO(n)からO(√n)まで解を高速に見つけられてしまう。

## 仕組み

xを `x = i×m + j`(mはおおよそ√nに設定、i, jはそれぞれ0からm未満の整数)という形に分解できることを利用する。

1. **Baby step(小さな一歩)**: `j = 0, 1, ..., m-1` について `g^j mod p` を計算し、その値とjの組を全てハッシュテーブルに保存しておく
2. **Giant step(大きな一歩)**: `h × (g^(-m))^i` を `i = 0, 1, ..., m-1` について計算し、その結果がbaby stepで保存した値の中に見つかるかを確認する
3. 一致するiとjが見つかれば、`x = i×m + j` が求める答えになる

「探索範囲を√nの正方形とみなし、片方の軸(j)は事前に全部計算してテーブル化、もう片方の軸(i)は探索しながらテーブルと照合する」——これにより、n通りの総当たりを√n×√nの2段階の探索に分解し、時間計算量をO(√n)まで削減している(代わりにO(√n)のメモリを消費する)。

## 特性・トレードオフ

- **計算量**: 時間O(√n)、メモリもO(√n)。「メモリを使って時間を買う」時間・空間トレードオフの典型例
- **離散対数問題の"部分的な"弱点**: この手法は法pがそれほど大きくない場合に有効。実用の暗号(pが数百〜数千ビット)では√pでさえ天文学的に大きくなるため、この攻撃は現実的な時間で終わらない——これが暗号として安全に使える理由でもある
- **他の離散対数攻撃との比較**: ポラードのロー法の離散対数版など、O(√n)のメモリすら不要な(だが同じくO(√n)の時間がかかる)代替手法も存在する
- **使いどころ**: 暗号強度の評価(どの程度の鍵長があれば安全か、という基準を定めるための攻撃手法としての研究)、比較的小さなパラメータでの離散対数問題を解く必要がある場面

## 実装例

```python
import math


def baby_step_giant_step(g: int, h: int, p: int) -> int | None:
    """g^x ≡ h (mod p) を満たす最小の非負整数xを求める。"""
    m = math.isqrt(p) + 1

    # baby step: g^j mod p をすべて事前計算してテーブル化
    table: dict[int, int] = {}
    e = 1
    for j in range(m):
        table.setdefault(e, j)
        e = (e * g) % p

    # giant step: h * (g^-m)^i を照合していく
    factor = pow(g, -m, p)
    gamma = h
    for i in range(m):
        if gamma in table:
            return i * m + table[gamma]
        gamma = (gamma * factor) % p

    return None
```

```typescript
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

function babyStepGiantStep(g: number, h: number, p: number): number | null {
  const m = Math.ceil(Math.sqrt(p)) + 1;

  // baby step: g^j mod p をすべて事前計算してテーブル化
  const table = new Map<number, number>();
  let e = 1;
  for (let j = 0; j < m; j++) {
    if (!table.has(e)) table.set(e, j);
    e = (e * g) % p;
  }

  // giant step: h * (g^-m)^i を照合していく
  const factor = Number(modPow(BigInt(g), BigInt(p - 1 - (m % (p - 1))), BigInt(p))); // g^(-m) mod p
  let gamma = h;
  for (let i = 0; i < m; i++) {
    if (table.has(gamma)) return i * m + table.get(gamma)!;
    gamma = (gamma * factor) % p;
  }

  return null;
}
```

```cpp
#include <cstdint>
#include <unordered_map>
#include <cmath>
#include <optional>

using ll = long long;

ll modPow(ll base, ll exp, ll mod) {
    __int128 result = 1;
    __int128 b = base % mod;
    while (exp > 0) {
        if (exp & 1) result = (result * b) % mod;
        b = (b * b) % mod;
        exp >>= 1;
    }
    return static_cast<ll>(result);
}

std::optional<ll> babyStepGiantStep(ll g, ll h, ll p) {
    ll m = static_cast<ll>(std::ceil(std::sqrt(static_cast<double>(p)))) + 1;

    // baby step: g^j mod p をすべて事前計算してテーブル化
    std::unordered_map<ll, ll> table;
    ll e = 1;
    for (ll j = 0; j < m; j++) {
        table.emplace(e, j);
        e = e * g % p;
    }

    // giant step: h * (g^-m)^i を照合していく
    ll factor = modPow(g, p - 1 - m % (p - 1), p); // フェルマーの小定理でg^(-m) mod pを得る
    ll gamma = h;
    for (ll i = 0; i < m; i++) {
        auto it = table.find(gamma);
        if (it != table.end()) return i * m + it->second;
        gamma = gamma * factor % p;
    }

    return std::nullopt;
}
```

```rust
use std::collections::HashMap;

fn mod_pow(base: u64, exp: u64, modulus: u64) -> u64 {
    let mut result: u128 = 1;
    let mut b = base as u128 % modulus as u128;
    let mut e = exp;
    let m = modulus as u128;
    while e > 0 {
        if e & 1 == 1 {
            result = result * b % m;
        }
        b = b * b % m;
        e >>= 1;
    }
    result as u64
}

fn baby_step_giant_step(g: u64, h: u64, p: u64) -> Option<u64> {
    let m = (p as f64).sqrt().ceil() as u64 + 1;

    // baby step: g^j mod p をすべて事前計算してテーブル化
    let mut table: HashMap<u64, u64> = HashMap::new();
    let mut e: u64 = 1;
    for j in 0..m {
        table.entry(e).or_insert(j);
        e = ((e as u128 * g as u128) % p as u128) as u64;
    }

    // giant step: h * (g^-m)^i を照合していく
    let factor = mod_pow(g, p - 1 - m % (p - 1), p); // フェルマーの小定理
    let mut gamma = h;
    for i in 0..m {
        if let Some(&j) = table.get(&gamma) {
            return Some(i * m + j);
        }
        gamma = ((gamma as u128 * factor as u128) % p as u128) as u64;
    }

    None
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Numerics;

static long? BabyStepGiantStep(long g, long h, long p)
{
    long m = (long)Math.Ceiling(Math.Sqrt(p)) + 1;

    // baby step: g^j mod p をすべて事前計算してテーブル化
    var table = new Dictionary<long, long>();
    long e = 1;
    for (long j = 0; j < m; j++)
    {
        if (!table.ContainsKey(e)) table[e] = j;
        e = e * g % p;
    }

    // giant step: h * (g^-m)^i を照合していく
    long factor = (long)BigInteger.ModPow(g, p - 1 - m % (p - 1), p);
    long gamma = h;
    for (long i = 0; i < m; i++)
    {
        if (table.TryGetValue(gamma, out long j)) return i * m + j;
        gamma = gamma * factor % p;
    }

    return null;
}
```
