---
name: 拡張ユークリッドの互除法
category: 数論・暗号
subcategory: 合同算術・剰余系
complexity: 'O(log min(a,b))'
summary: '最大公約数に加え、ax + by = gcd(a,b) を満たす係数まで同時に求める。'
---

## 概要

ユークリッドの互除法が「最大公約数の"値"」だけを求めるのに対し、拡張ユークリッドの互除法は、その最大公約数を**2つの整数の整数係数の組み合わせでどう表せるか**(`ax + by = gcd(a, b)` を満たす整数x, y)まで同時に求める。この一見地味な追加情報が、暗号理論における「モジュラ逆数」の計算に直結する、実務上極めて重要な副産物になる。

## 仕組み

通常のユークリッドの互除法の再帰を、逆方向にたどりながら係数を組み立てていく。

1. ユークリッドの互除法と同様に `a = b×q + r` を繰り返し、最終的に余りが0になるまで計算を進める(このとき`gcd(a, b)`が求まる)
2. **再帰の底(余りが0になった地点)から、逆方向にさかのぼりながら**、各段階の商qを使って係数x, yを更新していく: ある段階の `gcd = a×x + b×y` が求まっていれば、1つ前の段階の係数は `x' = y`、`y' = x - q×y` という関係式で計算できる
3. 最終的に、最初のa, bに対応するx, yが得られ、`a×x + b×y = gcd(a, b)` が成り立つ

「割り算の商を記録しながら進み、後から逆算して係数を組み立て直す」という構造は、多くの分割統治アルゴリズムに共通する「行きと帰りで別の仕事をする」という設計パターンの一例でもある。

## 特性・トレードオフ

- **計算量**: O(log min(a,b))。ユークリッドの互除法と同じオーダーで、追加の係数計算はほぼコストを増やさない
- **モジュラ逆数の計算への応用**: `a`と`m`が互いに素であれば、拡張ユークリッドの互除法で `a×x + m×y = 1` を満たすxを求めることで、xが「aのmを法とする逆数」になる。これはRSA暗号の秘密鍵の計算(公開鍵の逆数を求める)に直接使われる
- **一次不定方程式の解法**: `ax + by = c` の形の整数解を持つ方程式(cがgcd(a,b)の倍数の場合に限り解が存在する)を解く、数論の古典的な問題そのものにも使える
- **使いどころ**: RSA暗号における秘密鍵の生成、中国剰余定理の実装の内部、一般に「モジュラ逆数が必要な暗号・数論の計算」のほぼ全てで使われる基礎部品

## 実装例

```python
def extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    """gcd(a, b) と、a*x + b*y = gcd(a, b) を満たす x, y を返す"""
    old_r, r = a, b
    old_x, x = 1, 0
    old_y, y = 0, 1
    while r != 0:
        q = old_r // r
        old_r, r = r, old_r - q * r
        old_x, x = x, old_x - q * x
        old_y, y = y, old_y - q * y
    return old_r, old_x, old_y
```

```typescript
// gcd(a, b) と、a*x + b*y = gcd(a, b) を満たす x, y を返す
function extendedGcd(a: number, b: number): [gcd: number, x: number, y: number] {
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
```

```cpp
#include <tuple>

// gcd(a, b) と、a*x + b*y = gcd(a, b) を満たす x, y を返す
std::tuple<long long, long long, long long> extendedGcd(long long a, long long b) {
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
```

```rust
// gcd(a, b) と、a*x + b*y = gcd(a, b) を満たす x, y を返す
fn extended_gcd(a: i64, b: i64) -> (i64, i64, i64) {
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
```

```csharp
// gcd(a, b) と、a*x + b*y = gcd(a, b) を満たす x, y を返す
static (long g, long x, long y) ExtendedGcd(long a, long b)
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
```
