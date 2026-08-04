---
name: AKS素数判定法
category: 数論・暗号
subcategory: 素数判定・素因数分解
complexity: O((log n)^6)(多項式時間、後の改良でさらに指数を削減)
summary: 「一切の確率的推測を用いず、100%確実に、かつ多項式時間で」素数を判定できることを世界で初めて示した、数論・計算複雑性理論における画期的なアルゴリズム。
---

## 概要

[ミラー・ラビン素数判定法](/algorithms/miller-rabin)や[フェルマー素数判定法](/algorithms/fermat-primality-test)は高速だが、あくまで「高い確率で正しい」確率的アルゴリズムであり、理論上は(極めて低い確率とはいえ)誤り得る。「素数判定は本当に多項式時間で確定的に解けるのか」というのは長年の未解決問題だったが、2002年にインド工科大学カーンプル校のアグラワル・カヤル・サクセナの3人(頭文字を取ってAKS)が、それまで数学界の誰も予想していなかった手法で、確定的な多項式時間アルゴリズムを構成できることを証明した。計算機科学と数論の両分野に大きな衝撃を与えた、21世紀を代表するアルゴリズム的発見のひとつである。

## 仕組み

AKSの正しさの核心は、次の数学的な事実にある——「`n`が素数であることは、`(X + a)^n ≡ X^n + a (mod n)`という多項式合同式が、十分多くの整数`a`について成り立つことと同値である」(フェルマーの小定理を多項式の世界に拡張した関係式)。素朴にこの式を検証するのは非効率だが、AKSは適切に選んだ`r`を法とする多項式環の中でこの式を検証することで、効率的な判定を実現する。

1. `n`が完全べき乗数(`n = a^b`、`b>1`)でないかをまず確認する(完全べき乗数なら合成数と即断できる)
2. `n`と互いに素で、かつ`r`を法とした`n`の乗法的位数(`n^k ≡ 1 (mod r)`となる最小の`k`)が十分大きくなるような`r`を探す
3. `2`から`r`程度までの範囲の`a`について、`gcd(a, n) > 1`となるものがないか確認する(あれば`n`は合成数)
4. `1`からある範囲までの整数`a`について、多項式合同式`(X + a)^n ≡ X^n + a (mod n, X^r - 1)`が成り立つかを検証する。1つでも成り立たない`a`があれば`n`は合成数、全て成り立てば`n`は素数と確定的に判定できる

## 特性・トレードオフ

- **計算量**: 発表当初の証明では`O((log n)^12)`程度だったが、その後の改良で`O((log n)^6)`程度まで削減された。多項式時間であることは理論的に極めて重要な意味を持つが、指数の大きさ(6乗)のため、実際の計算速度では[ミラー・ラビン素数判定法](/algorithms/miller-rabin)にまだ遠く及ばない
- **確定的であることの理論的価値**: [ミラー・ラビン素数判定法](/algorithms/miller-rabin)は理論上ごくわずかな誤り確率を持つ確率的アルゴリズムだが、AKSは一切の誤りの可能性なく確定的に判定する——「PRIMES is in P」(素数判定は多項式時間で解ける決定問題のクラスPに属する)という計算複雑性理論上の重要な結果を確立した
- **実用性より理論的重要性**: 発表から20年以上経った現在も、実務のシステム(暗号ライブラリ等)では依然として高速な[ミラー・ラビン素数判定法](/algorithms/miller-rabin)(必要に応じて複数の証人で誤り確率を天文学的に低くする)が使われ続けている——AKSは「理論的に可能であることを証明した」金字塔であり、実用上の主役ではない、という珍しい位置づけのアルゴリズムである
- **使いどころ**: 計算複雑性理論における決定問題の分類(PRIMES∈Pの証明)の理解、数論的アルゴリズムの理論的限界と実用性のギャップを学ぶ教材、確定的アルゴリズムと確率的アルゴリズムのトレードオフを議論する際の代表的な引用例

## 実装例

```python
import math


def _is_perfect_power(n: int) -> bool:
    if n < 2:
        return False
    b = 2
    while (1 << b) <= n:
        a = round(n ** (1.0 / b))
        for cand in (a - 1, a, a + 1):
            if cand > 1 and cand**b == n:
                return True
        b += 1
    return False


def _multiplicative_order(n: int, r: int) -> int:
    k = 1
    val = n % r
    if val == 0:
        return -1
    while val != 1:
        val = (val * n) % r
        k += 1
        if k > r:
            return -1
    return k


def _euler_phi(n: int) -> int:
    result = n
    m = n
    p = 2
    while p * p <= m:
        if m % p == 0:
            while m % p == 0:
                m //= p
            result -= result // p
        p += 1
    if m > 1:
        result -= result // m
    return result


def _poly_mod_mul(a: list[int], b: list[int], r: int, n: int) -> list[int]:
    result = [0] * r
    for i, ai in enumerate(a):
        if ai == 0:
            continue
        for j, bj in enumerate(b):
            if bj == 0:
                continue
            idx = (i + j) % r
            result[idx] = (result[idx] + ai * bj) % n
    return result


def _poly_mod_pow(base: list[int], exp: int, r: int, n: int) -> list[int]:
    result = [0] * r
    result[0] = 1 % n
    b = base[:]
    while exp > 0:
        if exp & 1:
            result = _poly_mod_mul(result, b, r, n)
        b = _poly_mod_mul(b, b, r, n)
        exp >>= 1
    return result


def aks_is_prime(n: int) -> bool:
    if n < 2:
        return False
    if _is_perfect_power(n):
        return False

    log_n = n.bit_length()
    max_k = log_n * log_n
    r = 2
    found = False
    while not found:
        if math.gcd(n, r) == 1:
            order = _multiplicative_order(n, r)
            if order > max_k:
                found = True
                continue
        r += 1

    for a in range(2, min(r, n - 1) + 1):
        g = math.gcd(a, n)
        if 1 < g < n:
            return False

    if n <= r:
        return True

    phi_r = _euler_phi(r)
    limit = int(math.isqrt(phi_r) * log_n)
    for a in range(1, limit + 1):
        base = [0] * r
        base[1 % r] = (base[1 % r] + 1) % n
        base[0] = (base[0] + a) % n
        lhs = _poly_mod_pow(base, n, r, n)
        rhs = [0] * r
        rhs[n % r] = (rhs[n % r] + 1) % n
        rhs[0] = (rhs[0] + a) % n
        if lhs != rhs:
            return False
    return True
```

```typescript
function gcd(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function isPerfectPower(n: number): boolean {
  if (n < 2) return false;
  let b = 2;
  while (Math.pow(2, b) <= n) {
    const a = Math.round(Math.pow(n, 1 / b));
    for (const cand of [a - 1, a, a + 1]) {
      if (cand > 1 && Math.pow(cand, b) === n) return true;
    }
    b++;
  }
  return false;
}

function multiplicativeOrder(n: number, r: number): number {
  let k = 1;
  let val = n % r;
  if (val === 0) return -1;
  while (val !== 1) {
    val = (val * n) % r;
    k++;
    if (k > r) return -1;
  }
  return k;
}

function eulerPhi(n: number): number {
  let result = n;
  let m = n;
  let p = 2;
  while (p * p <= m) {
    if (m % p === 0) {
      while (m % p === 0) m = Math.floor(m / p);
      result -= Math.floor(result / p);
    }
    p++;
  }
  if (m > 1) result -= Math.floor(result / m);
  return result;
}

function polyModMul(a: number[], b: number[], r: number, n: number): number[] {
  const result = new Array(r).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j < b.length; j++) {
      if (b[j] === 0) continue;
      const idx = (i + j) % r;
      result[idx] = (result[idx] + a[i] * b[j]) % n;
    }
  }
  return result;
}

function polyModPow(base: number[], exp: number, r: number, n: number): number[] {
  let result = new Array(r).fill(0);
  result[0] = 1 % n;
  let b = base.slice();
  while (exp > 0) {
    if (exp & 1) result = polyModMul(result, b, r, n);
    b = polyModMul(b, b, r, n);
    exp = Math.floor(exp / 2);
  }
  return result;
}

function bitLength(n: number): number {
  return n === 0 ? 0 : Math.floor(Math.log2(n)) + 1;
}

function aksIsPrime(n: number): boolean {
  if (n < 2) return false;
  if (isPerfectPower(n)) return false;

  const logN = bitLength(n);
  const maxK = logN * logN;
  let r = 2;
  let found = false;
  while (!found) {
    if (gcd(n, r) === 1) {
      const order = multiplicativeOrder(n, r);
      if (order > maxK) {
        found = true;
        continue;
      }
    }
    r++;
  }

  for (let a = 2; a <= Math.min(r, n - 1); a++) {
    const g = gcd(a, n);
    if (g > 1 && g < n) return false;
  }

  if (n <= r) return true;

  const phiR = eulerPhi(r);
  const limit = Math.floor(Math.sqrt(phiR) * logN);
  for (let a = 1; a <= limit; a++) {
    const base = new Array(r).fill(0);
    base[1 % r] = (base[1 % r] + 1) % n;
    base[0] = (base[0] + a) % n;
    const lhs = polyModPow(base, n, r, n);
    const rhs = new Array(r).fill(0);
    rhs[n % r] = (rhs[n % r] + 1) % n;
    rhs[0] = (rhs[0] + a) % n;
    if (JSON.stringify(lhs) !== JSON.stringify(rhs)) return false;
  }
  return true;
}
```

```cpp
#include <cmath>
#include <cstdint>
#include <vector>

long long gcdN(long long a, long long b) {
    while (b) {
        long long t = b;
        b = a % b;
        a = t;
    }
    return a;
}

bool isPerfectPower(long long n) {
    if (n < 2) return false;
    int b = 2;
    while (std::pow(2, b) <= static_cast<double>(n)) {
        long long a = static_cast<long long>(std::round(std::pow(static_cast<double>(n), 1.0 / b)));
        for (long long cand : {a - 1, a, a + 1}) {
            if (cand > 1 && static_cast<long long>(std::pow(static_cast<double>(cand), b)) == n) return true;
        }
        b++;
    }
    return false;
}

long long multiplicativeOrder(long long n, long long r) {
    long long k = 1;
    long long val = n % r;
    if (val == 0) return -1;
    while (val != 1) {
        val = (val * n) % r;
        k++;
        if (k > r) return -1;
    }
    return k;
}

long long eulerPhi(long long n) {
    long long result = n;
    long long m = n;
    for (long long p = 2; p * p <= m; p++) {
        if (m % p == 0) {
            while (m % p == 0) m /= p;
            result -= result / p;
        }
    }
    if (m > 1) result -= result / m;
    return result;
}

std::vector<long long> polyModMul(const std::vector<long long>& a, const std::vector<long long>& b, int r, long long n) {
    std::vector<long long> result(r, 0);
    for (size_t i = 0; i < a.size(); i++) {
        if (a[i] == 0) continue;
        for (size_t j = 0; j < b.size(); j++) {
            if (b[j] == 0) continue;
            int idx = static_cast<int>((i + j) % r);
            result[idx] = (result[idx] + a[i] * b[j]) % n;
        }
    }
    return result;
}

std::vector<long long> polyModPow(std::vector<long long> base, long long exp, int r, long long n) {
    std::vector<long long> result(r, 0);
    result[0] = 1 % n;
    std::vector<long long> b = base;
    while (exp > 0) {
        if (exp & 1) result = polyModMul(result, b, r, n);
        b = polyModMul(b, b, r, n);
        exp >>= 1;
    }
    return result;
}

int bitLength(long long n) {
    int len = 0;
    while (n > 0) {
        len++;
        n >>= 1;
    }
    return len;
}

bool aksIsPrime(long long n) {
    if (n < 2) return false;
    if (isPerfectPower(n)) return false;

    int logN = bitLength(n);
    long long maxK = static_cast<long long>(logN) * logN;
    long long r = 2;
    bool found = false;
    while (!found) {
        if (gcdN(n, r) == 1) {
            long long order = multiplicativeOrder(n, r);
            if (order > maxK) {
                found = true;
                continue;
            }
        }
        r++;
    }

    for (long long a = 2; a <= std::min(r, n - 1); a++) {
        long long g = gcdN(a, n);
        if (g > 1 && g < n) return false;
    }

    if (n <= r) return true;

    long long phiR = eulerPhi(r);
    long long limit = static_cast<long long>(std::sqrt(static_cast<double>(phiR)) * logN);
    for (long long a = 1; a <= limit; a++) {
        std::vector<long long> base(r, 0);
        base[1 % r] = (base[1 % r] + 1) % n;
        base[0] = (base[0] + a) % n;
        auto lhs = polyModPow(base, n, static_cast<int>(r), n);
        std::vector<long long> rhs(r, 0);
        rhs[n % r] = (rhs[n % r] + 1) % n;
        rhs[0] = (rhs[0] + a) % n;
        if (lhs != rhs) return false;
    }
    return true;
}
```

```rust
fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 {
        a
    } else {
        gcd(b, a % b)
    }
}

fn is_perfect_power(n: u64) -> bool {
    if n < 2 {
        return false;
    }
    let mut b = 2u32;
    while 2u64.pow(b) <= n {
        let a = (n as f64).powf(1.0 / b as f64).round() as i64;
        for cand in [a - 1, a, a + 1] {
            if cand > 1 && (cand as f64).powi(b as i32).round() as u64 == n {
                return true;
            }
        }
        b += 1;
    }
    false
}

fn multiplicative_order(n: u64, r: u64) -> i64 {
    let mut k: i64 = 1;
    let mut val = n % r;
    if val == 0 {
        return -1;
    }
    while val != 1 {
        val = (val * n) % r;
        k += 1;
        if k as u64 > r {
            return -1;
        }
    }
    k
}

fn euler_phi(n: u64) -> u64 {
    let mut result = n;
    let mut m = n;
    let mut p = 2u64;
    while p * p <= m {
        if m % p == 0 {
            while m % p == 0 {
                m /= p;
            }
            result -= result / p;
        }
        p += 1;
    }
    if m > 1 {
        result -= result / m;
    }
    result
}

fn poly_mod_mul(a: &[u64], b: &[u64], r: usize, n: u64) -> Vec<u64> {
    let mut result = vec![0u64; r];
    for (i, &ai) in a.iter().enumerate() {
        if ai == 0 {
            continue;
        }
        for (j, &bj) in b.iter().enumerate() {
            if bj == 0 {
                continue;
            }
            let idx = (i + j) % r;
            result[idx] = (result[idx] + ai * bj) % n;
        }
    }
    result
}

fn poly_mod_pow(base: &[u64], mut exp: u64, r: usize, n: u64) -> Vec<u64> {
    let mut result = vec![0u64; r];
    result[0] = 1 % n;
    let mut b = base.to_vec();
    while exp > 0 {
        if exp & 1 == 1 {
            result = poly_mod_mul(&result, &b, r, n);
        }
        b = poly_mod_mul(&b, &b, r, n);
        exp >>= 1;
    }
    result
}

fn bit_length(n: u64) -> u32 {
    64 - n.leading_zeros()
}

fn aks_is_prime(n: u64) -> bool {
    if n < 2 {
        return false;
    }
    if is_perfect_power(n) {
        return false;
    }

    let log_n = bit_length(n) as u64;
    let max_k = log_n * log_n;
    let mut r: u64 = 2;
    let mut found = false;
    while !found {
        if gcd(n, r) == 1 {
            let order = multiplicative_order(n, r);
            if order > 0 && order as u64 > max_k {
                found = true;
                continue;
            }
        }
        r += 1;
    }

    for a in 2..=r.min(n - 1) {
        let g = gcd(a, n);
        if g > 1 && g < n {
            return false;
        }
    }

    if n <= r {
        return true;
    }

    let phi_r = euler_phi(r);
    let limit = ((phi_r as f64).sqrt() * log_n as f64) as u64;
    for a in 1..=limit {
        let mut base = vec![0u64; r as usize];
        let idx1 = (1 % r) as usize;
        base[idx1] = (base[idx1] + 1) % n;
        base[0] = (base[0] + a) % n;
        let lhs = poly_mod_pow(&base, n, r as usize, n);
        let mut rhs = vec![0u64; r as usize];
        let idxn = (n % r) as usize;
        rhs[idxn] = (rhs[idxn] + 1) % n;
        rhs[0] = (rhs[0] + a) % n;
        if lhs != rhs {
            return false;
        }
    }
    true
}
```

```csharp
static class Aks
{
    static long Gcd(long a, long b) { while (b != 0) { (a, b) = (b, a % b); } return a; }

    static bool IsPerfectPower(long n)
    {
        if (n < 2) return false;
        int b = 2;
        while (Math.Pow(2, b) <= n)
        {
            long a = (long)Math.Round(Math.Pow(n, 1.0 / b));
            foreach (var cand in new[] { a - 1, a, a + 1 })
                if (cand > 1 && (long)Math.Pow(cand, b) == n) return true;
            b++;
        }
        return false;
    }

    static long MultiplicativeOrder(long n, long r)
    {
        long k = 1, val = n % r;
        if (val == 0) return -1;
        while (val != 1) { val = (val * n) % r; k++; if (k > r) return -1; }
        return k;
    }

    static long EulerPhi(long n)
    {
        long result = n, m = n;
        for (long p = 2; p * p <= m; p++)
        {
            if (m % p == 0)
            {
                while (m % p == 0) m /= p;
                result -= result / p;
            }
        }
        if (m > 1) result -= result / m;
        return result;
    }

    static long[] PolyModMul(long[] a, long[] b, int r, long n)
    {
        var result = new long[r];
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] == 0) continue;
            for (int j = 0; j < b.Length; j++)
            {
                if (b[j] == 0) continue;
                int idx = (i + j) % r;
                result[idx] = (result[idx] + a[i] * b[j]) % n;
            }
        }
        return result;
    }

    static long[] PolyModPow(long[] baseArr, long exp, int r, long n)
    {
        var result = new long[r];
        result[0] = 1 % n;
        var b = (long[])baseArr.Clone();
        while (exp > 0)
        {
            if ((exp & 1) == 1) result = PolyModMul(result, b, r, n);
            b = PolyModMul(b, b, r, n);
            exp >>= 1;
        }
        return result;
    }

    static int BitLength(long n)
    {
        int len = 0;
        while (n > 0) { len++; n >>= 1; }
        return len;
    }

    public static bool IsPrime(long n)
    {
        if (n < 2) return false;
        if (IsPerfectPower(n)) return false;

        int logN = BitLength(n);
        long maxK = (long)logN * logN;
        long r = 2;
        bool found = false;
        while (!found)
        {
            if (Gcd(n, r) == 1)
            {
                long order = MultiplicativeOrder(n, r);
                if (order > maxK) { found = true; continue; }
            }
            r++;
        }

        for (long a = 2; a <= Math.Min(r, n - 1); a++)
        {
            long g = Gcd(a, n);
            if (g > 1 && g < n) return false;
        }

        if (n <= r) return true;

        long phiR = EulerPhi(r);
        long limit = (long)(Math.Sqrt(phiR) * logN);
        for (long a = 1; a <= limit; a++)
        {
            var baseArr = new long[r];
            baseArr[1 % r] = (baseArr[1 % r] + 1) % n;
            baseArr[0] = (baseArr[0] + a) % n;
            var lhs = PolyModPow(baseArr, n, (int)r, n);
            var rhs = new long[r];
            rhs[n % r] = (rhs[n % r] + 1) % n;
            rhs[0] = (rhs[0] + a) % n;
            if (!lhs.SequenceEqual(rhs)) return false;
        }
        return true;
    }
}
```
