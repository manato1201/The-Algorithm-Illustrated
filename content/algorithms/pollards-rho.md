---
name: ポラードのロー法
category: 数論・暗号
subcategory: 素数判定・素因数分解
complexity: O(n^(1/4))(期待値)
summary: サイクル検出の考え方を応用し、大きな合成数の素因数を確率的に高速発見する。
---

## 概要

大きな合成数nの素因数を見つける「素因数分解」は、力任せに小さい数から順に試し割りするとO(√n)かかり、nが暗号で使われるような巨大な数だと非現実的になる。ポラードのロー法は、フロイドの循環検出法(遅いポインタと速いポインタ)と同じ発想を応用し、確率的により少ない試行で素因数を発見する巧妙なアルゴリズム。1975年にジョン・ポラードが考案した。

## 仕組み

「ランダムに見える数列を生成する関数を繰り返し適用すると、鳩の巣原理により、いずれ同じ値に戻ってきてループ(サイクル)を作る」という性質を利用する。

1. `f(x) = (x² + c) mod n`(cは適当な定数)のような疑似ランダムな関数を用意する
2. この関数を繰り返し適用して数列 `x0, x1 = f(x0), x2 = f(x1), ...` を作る
3. フロイドの循環検出法と同様に、遅いポインタと速いポインタでこの数列をたどる
4. ある時点で `gcd(|xi - xj|, n)` を計算する。この最大公約数が1でもnでもない値になれば、それが**nの非自明な約数**——つまり素因数(の倍数)が見つかったことになる

「mod nの世界では見えない構造も、mod p(nの未知の素因数p)の世界だけを見ると、はるかに小さい範囲でサイクルが生じる」という数論的な性質(バースデーパラドックスに近い確率的な直感)が、この手法が高速に動作する理由になっている。ギリシャ文字のρ(ロー)の形——一直線の"尻尾"の先にループがある形——に数列の軌跡が似ていることが名前の由来。

## 特性・トレードオフ

- **計算量**: 期待値でO(n^(1/4))。試し割りのO(√n)よりも大幅に高速で、フロイドの循環検出法のおかげで追加メモリもほぼ不要
- **確率的アルゴリズム**: 運悪く同じ素因数を見つけられないことがあるが、定数cを変えて再試行すれば、実用上は十分高い確率で成功する
- **より高速な手法との比較**: 数百桁を超えるような本当に巨大な数の素因数分解には、数体篩法(GNFS)のようなさらに高度な手法が使われる。ポラードのロー法は中規模(数十桁程度)の数に対して特に実用的
- **使いどころ**: RSA暗号の安全性評価(鍵が十分に安全かを確認するための素因数分解の試み)、暗号解読の研究、計算機代数システムにおける因数分解機能の内部実装

## 実装例

```python
import math


def pollards_rho(n: int) -> int:
    """nの非自明な約数を1つ返す(nが素数でない前提)。"""
    if n % 2 == 0:
        return 2

    def f(x: int, c: int) -> int:
        return (x * x + c) % n

    c = 1
    while True:
        x = y = 2
        d = 1
        while d == 1:
            x = f(x, c)          # 遅いポインタ: 1回進める
            y = f(f(y, c), c)    # 速いポインタ: 2回進める
            d = math.gcd(abs(x - y), n)
        if d != n:
            return d
        c += 1  # サイクルの形が悪ければ定数を変えて再試行
```

```typescript
function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

function pollardsRho(n: bigint): bigint {
  if (n % 2n === 0n) return 2n;
  const f = (x: bigint, c: bigint): bigint => (x * x + c) % n;

  let c = 1n;
  while (true) {
    let x = 2n;
    let y = 2n;
    let d = 1n;
    while (d === 1n) {
      x = f(x, c);
      y = f(f(y, c), c);
      d = gcd(x > y ? x - y : y - x, n);
    }
    if (d !== n) return d;
    c += 1n;
  }
}
```

```cpp
#include <cstdint>

using u64 = uint64_t;

u64 gcdU64(u64 a, u64 b) {
    while (b != 0) {
        u64 t = b;
        b = a % b;
        a = t;
    }
    return a;
}

u64 pollardsRho(u64 n) {
    if (n % 2 == 0) return 2;

    // x*xがu64の範囲を超えるため、計算には__int128を使う
    auto f = [n](__int128 x, __int128 c) -> __int128 {
        return (x * x + c) % n;
    };

    __int128 c = 1;
    while (true) {
        __int128 x = 2, y = 2, d = 1;
        while (d == 1) {
            x = f(x, c);
            y = f(f(y, c), c);
            __int128 diff = x > y ? x - y : y - x;
            d = gcdU64(static_cast<u64>(diff), n);
        }
        if (d != n) return static_cast<u64>(d);
        c += 1;
    }
}
```

```rust
fn gcd(a: u128, b: u128) -> u128 {
    if b == 0 { a } else { gcd(b, a % b) }
}

fn pollards_rho(n: u64) -> u64 {
    if n % 2 == 0 {
        return 2;
    }
    let n128 = n as u128;
    let f = |x: u128, c: u128| -> u128 { (x * x + c) % n128 };

    let mut c: u128 = 1;
    loop {
        let (mut x, mut y, mut d): (u128, u128, u128) = (2, 2, 1);
        while d == 1 {
            x = f(x, c);
            y = f(f(y, c), c);
            let diff = if x > y { x - y } else { y - x };
            d = gcd(diff, n128);
        }
        if d != n128 {
            return d as u64;
        }
        c += 1;
    }
}
```

```csharp
using System.Numerics;

static BigInteger PollardsRho(BigInteger n)
{
    if (n % 2 == 0) return 2;

    BigInteger F(BigInteger x, BigInteger c) => (x * x + c) % n;

    BigInteger c = 1;
    while (true)
    {
        BigInteger x = 2, y = 2, d = 1;
        while (d == 1)
        {
            x = F(x, c);
            y = F(F(y, c), c);
            d = BigInteger.GreatestCommonDivisor(BigInteger.Abs(x - y), n);
        }
        if (d != n) return d;
        c += 1;
    }
}
```
