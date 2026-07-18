---
name: Toom-Cook法(多項式乗算)
category: 数論・暗号
subcategory: 高速演算
complexity: O(n^log(2k-1)/log(k))(k分割の場合。k=3でO(n^1.465))
summary: カラツバ法の「2分割」を「k分割」へ一般化し、より多くの評価点での多項式補間を使うことで、分割数を増やすほど漸近的な指数を1に近づけられる大きな数の高速乗算アルゴリズム。
---

## 概要

[カラツバ法](/algorithms/karatsuba)は大きな数の掛け算を2分割し、3回の乗算(本来必要な4回ではなく)で済ませることで`O(n^1.585)`を達成したが、「そもそもなぜ2分割なのか、3分割やk分割ではどうなるのか」という自然な疑問が生まれる。1963年にアンドレイ・トーム(Toom)が発見し、1966年にスティーブン・クック(Cook)がさらに一般化したこの手法は、まさにその疑問に答える——数を`k`個の断片に分割し、多項式の「評価と補間」という数学的な道具を使うことで、`k`を大きくするほど漸近的な計算量の指数を理論上いくらでも1に近づけられる(ただし定数倍のコストとのトレードオフがある)、[カラツバ法](/algorithms/karatsuba)の完全な一般化になっている。

## 仕組み

1. 掛け合わせたい2つの大きな数`A`、`B`を、それぞれ`k`個の断片(係数)を持つ多項式とみなす(桁を`k`個のブロックに分割し、それぞれをその多項式の係数とする)
2. **評価(Evaluation)**: `2k-1`個の異なる点(`0, 1, -1, 2, -2, ...`のような小さな整数)で、`A`と`B`をそれぞれ多項式として評価する
3. **各点での乗算**: 評価した`2k-1`組の値同士を、対応する点ごとに掛け合わせる。これが`AB`という積の多項式を、同じ`2k-1`点で評価した値になる(2つの`k-1`次多項式の積は`2k-2`次になるため、`2k-1`個の点があれば一意に定まる)
4. **補間(Interpolation)**: `2k-1`個の点とその値のペアから、[ラグランジュ補間](/algorithms/lcs)のような手法で、元の積`AB`を表す多項式の係数を復元する
5. 復元した係数を正しい桁位置に配置し直す(繰り上がりの処理を含む)ことで、最終的な積が得られる

`k`個の断片に分割することで、素朴な`k²`回の乗算が必要なところを、`2k-1`回の乗算(点ごとの評価値の積)で済ませられるのが、この手法の核心的な省力化である。

## 特性・トレードオフ

- **計算量**: `k`分割のToom-Cook法は`O(n^(log(2k-1)/log(k)))`——`k=2`だと[カラツバ法](/algorithms/karatsuba)そのもの(`O(n^log₂3) = O(n^1.585)`)になり、`k=3`(Toom-3)では`O(n^1.465)`まで改善される。`k`を大きくするほど指数は1に近づくが、評価・補間のオーバーヘッド(定数倍のコスト)も増えるため、実用上は`k=3`や`k=4`程度が使われることが多い
- **[カラツバ法](/algorithms/karatsuba)・[高速フーリエ変換(FFT)](/algorithms/fft)との位置づけ**: Toom-Cook法は、`k`を固定した多項式評価・補間ベースの手法という点で[カラツバ法](/algorithms/karatsuba)の直接の一般化だが、`k`を`n`に応じて動的に増やしていく極限を取ると、理論的には[FFT](/algorithms/fft)を使った乗算(準線形時間`O(n log n)`)に繋がる——桁数に応じてカラツバ法・Toom-Cook法・FFT乗算を使い分ける、というのが実用の多倍長演算ライブラリの典型的な戦略になっている
- **実装の複雑さの増大**: `k`を大きくするほど、評価点の選び方・補間の数式が複雑になり、実装・デバッグの難易度が跳ね上がる。多くの多倍長演算ライブラリ(GMP等)は、桁数の範囲に応じて素朴な乗算・カラツバ法・Toom-3・Toom-4・FFTベースの乗算を自動的に切り替える階層的な実装を採用している
- **使いどころ**: 数千〜数万桁クラスの多倍長整数演算(暗号ライブラリの中間サイズの乗算)、多倍長演算ライブラリ(GMP、Python の内部実装等)における[カラツバ法](/algorithms/karatsuba)と[FFT乗算](/algorithms/fft)の中間の桁数域での最適化

## 実装例

以下はToom-3(3分割)を、桁を`base = 1000`ごとの3つの係数に分割して実装したもの。評価点`0, 1, -1, -2, ∞`で評価・各点ごとに乗算・補間という3ステップの流れをそのままコードに落とし込んでいる。

```python
def _evaluate(c0: int, c1: int, c2: int, point: int | str) -> int:
    if point == 0:
        return c0
    if point == 1:
        return c0 + c1 + c2
    if point == -1:
        return c0 - c1 + c2
    if point == -2:
        return c0 - 2 * c1 + 4 * c2
    return c2  # point == "inf"


def toom3_multiply(x: int, y: int, base: int = 1000) -> int:
    a0, a1, a2 = x % base, (x // base) % base, (x // base // base) % base
    b0, b1, b2 = y % base, (y // base) % base, (y // base // base) % base

    points = [0, 1, -1, -2, "inf"]
    va = [_evaluate(a0, a1, a2, pt) for pt in points]
    vb = [_evaluate(b0, b1, b2, pt) for pt in points]
    vc = [va[i] * vb[i] for i in range(5)]

    c0, c1, c_neg1, c_neg2, c_inf = vc
    r0 = c0
    r4 = c_inf
    r3 = (c_neg2 - c1) // 3
    r1 = (c1 - c_neg1) // 2
    r2 = c_neg1 - c0
    r3 = (r2 - r3) // 2 + 2 * r4
    r2 = r2 + r1 - r4
    r1 = r1 - r3

    return sum(coeff * (base ** i) for i, coeff in enumerate([r0, r1, r2, r3, r4]))
```

```typescript
function evaluateToom(
  c0: bigint,
  c1: bigint,
  c2: bigint,
  point: bigint | "inf",
): bigint {
  if (point === "inf") return c2;
  if (point === 0n) return c0;
  if (point === 1n) return c0 + c1 + c2;
  if (point === -1n) return c0 - c1 + c2;
  if (point === -2n) return c0 - 2n * c1 + 4n * c2;
  throw new Error("invalid point");
}

function toom3Multiply(x: bigint, y: bigint, base: bigint = 1000n): bigint {
  const a0 = x % base;
  const a1 = (x / base) % base;
  const a2 = (x / base / base) % base;
  const b0 = y % base;
  const b1 = (y / base) % base;
  const b2 = (y / base / base) % base;

  const points: (bigint | "inf")[] = [0n, 1n, -1n, -2n, "inf"];
  const va = points.map((pt) => evaluateToom(a0, a1, a2, pt));
  const vb = points.map((pt) => evaluateToom(b0, b1, b2, pt));
  const vc = va.map((v, i) => v * vb[i]);

  const [c0, c1, cNeg1, cNeg2, cInf] = vc;
  const r0 = c0;
  const r4 = cInf;
  let r3 = (cNeg2 - c1) / 3n;
  let r1 = (c1 - cNeg1) / 2n;
  let r2 = cNeg1 - c0;
  r3 = (r2 - r3) / 2n + 2n * r4;
  r2 = r2 + r1 - r4;
  r1 = r1 - r3;

  const coeffs = [r0, r1, r2, r3, r4];
  let result = 0n;
  for (let i = 0; i < coeffs.length; i++)
    result += coeffs[i] * base ** BigInt(i);
  return result;
}
```

```cpp
#include <array>
#include <string>

long long evaluateToom(long long c0, long long c1, long long c2, const std::string& point) {
    if (point == "0") return c0;
    if (point == "1") return c0 + c1 + c2;
    if (point == "-1") return c0 - c1 + c2;
    if (point == "-2") return c0 - 2 * c1 + 4 * c2;
    return c2;  // "inf"
}

long long toom3Multiply(long long x, long long y, long long base = 1000) {
    long long a0 = x % base, a1 = (x / base) % base, a2 = (x / base / base) % base;
    long long b0 = y % base, b1 = (y / base) % base, b2 = (y / base / base) % base;

    std::array<std::string, 5> points = {"0", "1", "-1", "-2", "inf"};
    std::array<long long, 5> va{}, vb{}, vc{};
    for (int i = 0; i < 5; i++) va[i] = evaluateToom(a0, a1, a2, points[i]);
    for (int i = 0; i < 5; i++) vb[i] = evaluateToom(b0, b1, b2, points[i]);
    for (int i = 0; i < 5; i++) vc[i] = va[i] * vb[i];

    long long c0 = vc[0], c1 = vc[1], cNeg1 = vc[2], cNeg2 = vc[3], cInf = vc[4];
    long long r0 = c0;
    long long r4 = cInf;
    long long r3 = (cNeg2 - c1) / 3;
    long long r1 = (c1 - cNeg1) / 2;
    long long r2 = cNeg1 - c0;
    r3 = (r2 - r3) / 2 + 2 * r4;
    r2 = r2 + r1 - r4;
    r1 = r1 - r3;

    long long coeffs[5] = {r0, r1, r2, r3, r4};
    long long result = 0, power = 1;
    for (int i = 0; i < 5; i++) {
        result += coeffs[i] * power;
        power *= base;
    }
    return result;
}
```

```rust
enum ToomPoint {
    Value(i64),
    Inf,
}

fn evaluate_toom(c0: i64, c1: i64, c2: i64, point: &ToomPoint) -> i64 {
    match point {
        ToomPoint::Inf => c2,
        ToomPoint::Value(0) => c0,
        ToomPoint::Value(1) => c0 + c1 + c2,
        ToomPoint::Value(-1) => c0 - c1 + c2,
        ToomPoint::Value(-2) => c0 - 2 * c1 + 4 * c2,
        ToomPoint::Value(_) => unreachable!(),
    }
}

fn toom3_multiply(x: i64, y: i64, base: i64) -> i64 {
    let a0 = x % base;
    let a1 = (x / base) % base;
    let a2 = (x / base / base) % base;
    let b0 = y % base;
    let b1 = (y / base) % base;
    let b2 = (y / base / base) % base;

    let points = [
        ToomPoint::Value(0),
        ToomPoint::Value(1),
        ToomPoint::Value(-1),
        ToomPoint::Value(-2),
        ToomPoint::Inf,
    ];
    let va: Vec<i64> = points.iter().map(|pt| evaluate_toom(a0, a1, a2, pt)).collect();
    let vb: Vec<i64> = points.iter().map(|pt| evaluate_toom(b0, b1, b2, pt)).collect();
    let vc: Vec<i64> = va.iter().zip(vb.iter()).map(|(a, b)| a * b).collect();

    let (c0, c1, c_neg1, c_neg2, c_inf) = (vc[0], vc[1], vc[2], vc[3], vc[4]);
    let r0 = c0;
    let r4 = c_inf;
    let mut r3 = (c_neg2 - c1) / 3;
    let mut r1 = (c1 - c_neg1) / 2;
    let mut r2 = c_neg1 - c0;
    r3 = (r2 - r3) / 2 + 2 * r4;
    r2 = r2 + r1 - r4;
    r1 = r1 - r3;

    let coeffs = [r0, r1, r2, r3, r4];
    let mut result: i64 = 0;
    let mut power: i64 = 1;
    for &coeff in &coeffs {
        result += coeff * power;
        power *= base;
    }
    result
}
```

```csharp
using System;
using System.Linq;

static long EvaluateToom(long c0, long c1, long c2, string point)
{
    return point switch
    {
        "0" => c0,
        "1" => c0 + c1 + c2,
        "-1" => c0 - c1 + c2,
        "-2" => c0 - 2 * c1 + 4 * c2,
        "inf" => c2,
        _ => throw new ArgumentException("invalid point")
    };
}

static long Toom3Multiply(long x, long y, long baseVal = 1000)
{
    long a0 = x % baseVal, a1 = (x / baseVal) % baseVal, a2 = (x / baseVal / baseVal) % baseVal;
    long b0 = y % baseVal, b1 = (y / baseVal) % baseVal, b2 = (y / baseVal / baseVal) % baseVal;

    string[] points = { "0", "1", "-1", "-2", "inf" };
    var va = points.Select(pt => EvaluateToom(a0, a1, a2, pt)).ToArray();
    var vb = points.Select(pt => EvaluateToom(b0, b1, b2, pt)).ToArray();
    var vc = va.Zip(vb, (u, v) => u * v).ToArray();

    long c0 = vc[0], c1 = vc[1], cNeg1 = vc[2], cNeg2 = vc[3], cInf = vc[4];
    long r0 = c0;
    long r4 = cInf;
    long r3 = (cNeg2 - c1) / 3;
    long r1 = (c1 - cNeg1) / 2;
    long r2 = cNeg1 - c0;
    r3 = (r2 - r3) / 2 + 2 * r4;
    r2 = r2 + r1 - r4;
    r1 = r1 - r3;

    long[] coeffs = { r0, r1, r2, r3, r4 };
    long result = 0, power = 1;
    for (int i = 0; i < coeffs.Length; i++)
    {
        result += coeffs[i] * power;
        power *= baseVal;
    }
    return result;
}
```
