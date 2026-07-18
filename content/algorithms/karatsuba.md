---
name: カラツバ法
category: 数論・暗号
subcategory: 高速演算
complexity: O(n^1.585)
summary: 大きな数の掛け算を3回の乗算に分割統治することで、筆算より高速化する。
---

## 概要

小学校で習う筆算による掛け算はO(n²)かかる(桁数nの数同士を掛けると、n×n回の1桁同士の掛け算が必要になる)。カラツバ法は、この掛け算を分割統治法で高速化する、初めて「筆算より理論的に速い」ことが証明された乗算アルゴリズム。1960年、当時23歳の学生だったアナトリー・カラツバがわずか1週間で考案し、それまで「掛け算はO(n²)が限界」と考えられていた常識を覆した。

## 仕組み

n桁の数を2つに分割し、それぞれ半分の桁数の数として扱う。例えば `x = x1×10^(n/2) + x0`、`y = y1×10^(n/2) + y0` と分割すると、素朴には `x×y` の計算に4回の半分サイズの乗算(x1y1, x1y0, x0y1, x0y0)が必要に見える。

しかしカラツバは、次の3つの積だけで同じ結果を導けることを示した:
1. `z2 = x1 × y1`
2. `z0 = x0 × y0`
3. `z1 = (x1 + x0) × (y1 + y0) - z2 - z0`(これが `x1y0 + x0y1` に等しくなる)

`x × y = z2 × 10^n + z1 × 10^(n/2) + z0` として組み立てれば、**4回ではなく3回の乗算**(足し算・引き算は掛け算よりずっと軽い演算なので無視できる)で答えが求まる。この「4回を3回に減らす」というわずかな工夫が、再帰的に適用されることで漸近的な計算量を大きく変える。

## 特性・トレードオフ

- **計算量**: O(n^log₂3) ≈ O(n^1.585)。「4分割して4回乗算する」再帰だとO(n²)のままだが、「3回の乗算で済ませる」ことで指数部が2からlog₂3(約1.585)に下がる
- **さらに高速な手法との関係**: カラツバ法は乗算の分割数を増やすToom-Cook法や、FFTベースの乗算(桁数が非常に大きい場合に有利)へと発展していく、多倍長乗算アルゴリズムの系譜の出発点にあたる
- **小さい桁数では逆に不利**: 分割・再帰のオーバーヘッドがあるため、桁数が小さい場合は素朴な筆算の方が実測で速いことが多い。実用の多倍長演算ライブラリでは、ある桁数を境に筆算とカラツバ法を切り替えるハイブリッドな実装が一般的
- **使いどころ**: 暗号ライブラリにおける大きな整数(数百〜数千ビット)の乗算、多倍長演算ライブラリ(GMPなど)の内部実装、円周率などの超高精度計算

## 実装例

```python
def karatsuba(x: int, y: int) -> int:
    if x < 10 or y < 10:
        return x * y

    n = max(len(str(x)), len(str(y)))
    m = n // 2

    high1, low1 = divmod(x, 10 ** m)
    high2, low2 = divmod(y, 10 ** m)

    z2 = karatsuba(high1, high2)
    z0 = karatsuba(low1, low2)
    z1 = karatsuba(high1 + low1, high2 + low2) - z2 - z0

    return z2 * 10 ** (2 * m) + z1 * 10 ** m + z0
```

```typescript
function karatsuba(x: bigint, y: bigint): bigint {
  if (x < 10n || y < 10n) return x * y;

  const n = Math.max(x.toString().length, y.toString().length);
  const m = BigInt(Math.floor(n / 2));
  const base = 10n ** m;

  const high1 = x / base, low1 = x % base;
  const high2 = y / base, low2 = y % base;

  const z2 = karatsuba(high1, high2);
  const z0 = karatsuba(low1, low2);
  const z1 = karatsuba(high1 + low1, high2 + low2) - z2 - z0;

  return z2 * 10n ** (2n * m) + z1 * base + z0;
}
```

```cpp
#include <algorithm>

// 演算範囲は__int128(概ね38桁)まで。それ以上の桁数を扱うには
// 桁配列(vector<int>など)によるビッグインテガー表現への置き換えが必要。
using Int128 = __int128;

int digitCount(Int128 x) {
    if (x == 0) return 1;
    int count = 0;
    while (x > 0) {
        count++;
        x /= 10;
    }
    return count;
}

Int128 pow10(int n) {
    Int128 result = 1;
    for (int i = 0; i < n; i++) result *= 10;
    return result;
}

Int128 karatsuba(Int128 x, Int128 y) {
    if (x < 10 || y < 10) return x * y;

    int n = std::max(digitCount(x), digitCount(y));
    int m = n / 2;
    Int128 base = pow10(m);

    Int128 high1 = x / base, low1 = x % base;
    Int128 high2 = y / base, low2 = y % base;

    Int128 z2 = karatsuba(high1, high2);
    Int128 z0 = karatsuba(low1, low2);
    Int128 z1 = karatsuba(high1 + low1, high2 + low2) - z2 - z0;

    return z2 * pow10(2 * m) + z1 * base + z0;
}
```

```rust
// 演算範囲はi128(概ね38桁)まで。それ以上の桁数を扱うには
// 桁配列によるビッグインテガー表現への置き換えが必要。
fn digit_count(mut x: i128) -> u32 {
    if x == 0 {
        return 1;
    }
    let mut count = 0;
    while x > 0 {
        count += 1;
        x /= 10;
    }
    count
}

fn pow10(n: u32) -> i128 {
    10i128.pow(n)
}

fn karatsuba(x: i128, y: i128) -> i128 {
    if x < 10 || y < 10 {
        return x * y;
    }

    let n = digit_count(x).max(digit_count(y));
    let m = n / 2;
    let base = pow10(m);

    let (high1, low1) = (x / base, x % base);
    let (high2, low2) = (y / base, y % base);

    let z2 = karatsuba(high1, high2);
    let z0 = karatsuba(low1, low2);
    let z1 = karatsuba(high1 + low1, high2 + low2) - z2 - z0;

    z2 * pow10(2 * m) + z1 * base + z0
}
```

```csharp
using System;
using System.Numerics;

static BigInteger Karatsuba(BigInteger x, BigInteger y)
{
    if (x < 10 || y < 10) return x * y;

    int n = Math.Max(x.ToString().Length, y.ToString().Length);
    int m = n / 2;
    BigInteger baseVal = BigInteger.Pow(10, m);

    BigInteger high1 = BigInteger.DivRem(x, baseVal, out BigInteger low1);
    BigInteger high2 = BigInteger.DivRem(y, baseVal, out BigInteger low2);

    BigInteger z2 = Karatsuba(high1, high2);
    BigInteger z0 = Karatsuba(low1, low2);
    BigInteger z1 = Karatsuba(high1 + low1, high2 + low2) - z2 - z0;

    return z2 * BigInteger.Pow(10, 2 * m) + z1 * baseVal + z0;
}
```
