---
name: 区間ふるい(セグメント化されたエラトステネスの篩)
category: 数論・暗号
subcategory: 素数判定・素因数分解
complexity: O((R−L) log log R + √R)、追加メモリは O(√R + 区間幅)
summary: 区間[L, R)の素数だけを、√R以下の素数の倍数を消すことで求める。上限が大きくても、区間幅ぶんのメモリで済む。
---

## 概要

[エラトステネスの篩](/algorithms/sieve-of-eratosthenes)は 2 から N までの全整数を表に持つので、N が 10^10 のように大きくなるとメモリが足りなくなる。一方で、必要なのは「10^10 の少し先の、幅 10^6 の区間にある素数」といった**一部の範囲だけ**ということが多い(素因数分解の前処理、素数の統計、区間内の素数の個数を数える問題など)。

区間ふるいは、**合成数 `n` は必ず `√n` 以下の素因数を持つ**という事実を使う。区間の上限 `R` に対して `√R` 以下の素数さえあれば、区間内の合成数はすべてそれらの倍数として消せる。`√R` 以下の素数は普通のふるいで求めておき、その素数だけを使って区間を篩う。メモリは `√R` と区間幅の分で済み、区間ごとに独立に計算できるので、並列化や、キャッシュに収まる大きさでの逐次処理にも向く。

## 仕組み

区間を `[L, R)` とする。

1. `√R` 以下のすべての素数を、通常のエラトステネスの篩で求める(小さな篩)
2. 区間用の真偽配列 `is_prime[0 .. R−L)` を、すべて「素数の候補」で初期化する。添字 `i` は整数 `L + i` を表す
3. `√R` 以下の各素数 `p` について、区間内の `p` の倍数を消す。始点は `max(p², ceil(L / p) · p)`。`p` 自身が区間内にあっても消さないために、始点を `p²` 以上にする(`p²` より小さい倍数は、より小さい素因数で消えているはず)
4. 0 と 1 が区間に含まれるなら、素数ではないので消す
5. 残った候補が、区間内の素数

## 特性・トレードオフ

- **メモリ**: O(√R + (R−L))。N 全体を持つ素朴な篩の O(N) より桁違いに小さく、10^12 付近の区間でも現実的
- **計算量**: 区間幅 `w = R−L` に対し、およそ O(w log log R + √R)。区間を連続して処理すれば、全体では素朴な篩と同程度の演算量で、メモリだけが小さい
- **始点の計算がバグの温床**: `ceil(L/p) · p` を `p` 自身まで切り上げない、`p²` と max を取る、区間の下端が小さいときの 0・1 の扱い、など細部で間違えやすい。小さい範囲で素朴な篩と照合して確かめるとよい
- **使いどころ**: 大きな数付近の素数の列挙、素数の個数(区間の和による π(x) の計算)、数値の素因数分解を試し割りでするときの素数表の用意、ミラー・ラビン検定の前段のふるい落とし

## 実装例

```python
from math import isqrt


def simple_sieve(limit):
    flags = [True] * (limit + 1)
    flags[0:2] = [False, False][: min(2, limit + 1)]
    for i in range(2, isqrt(limit) + 1):
        if flags[i]:
            for j in range(i * i, limit + 1, i):
                flags[j] = False
    return [i for i, f in enumerate(flags) if f]


def segmented_sieve(lo, hi):
    """[lo, hi) の素数を返す。"""
    primes = simple_sieve(isqrt(hi) + 1)
    is_prime = [True] * (hi - lo)
    for p in primes:
        start = max(p * p, (lo + p - 1) // p * p)
        for m in range(start, hi, p):
            is_prime[m - lo] = False
    return [lo + i for i, f in enumerate(is_prime) if f and lo + i >= 2]


print(segmented_sieve(30, 70))
# [31, 37, 41, 43, 47, 53, 59, 61, 67]
```

```typescript
function simpleSieve(limit: number): number[] {
  const flags = new Array<boolean>(limit + 1).fill(true);
  const primes: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (!flags[i]) continue;
    primes.push(i);
    for (let j = i * i; j <= limit; j += i) flags[j] = false;
  }
  return primes;
}

function segmentedSieve(lo: number, hi: number): number[] {
  const primes = simpleSieve(Math.floor(Math.sqrt(hi)) + 1);
  const isPrime = new Array<boolean>(hi - lo).fill(true);
  for (const p of primes) {
    const start = Math.max(p * p, Math.ceil(lo / p) * p);
    for (let m = start; m < hi; m += p) isPrime[m - lo] = false;
  }
  const result: number[] = [];
  isPrime.forEach((f, i) => {
    if (f && lo + i >= 2) result.push(lo + i);
  });
  return result;
}

console.log(segmentedSieve(30, 70));
// [31, 37, 41, 43, 47, 53, 59, 61, 67]
```
