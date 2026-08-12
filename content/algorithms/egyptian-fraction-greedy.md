---
name: エジプト分数分解の貪欲法(Fibonacci-Sylvesterアルゴリズム)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(分子の値に依存、最悪の場合は指数的に増えうる)
summary: 任意の分数を「毎回、現在の残りを超えない最大の単位分数(分子が1の分数)を貪欲に取り除く」という単純な操作の繰り返しだけで、相異なる単位分数の和として表現する古代エジプトの記数法の現代的なアルゴリズム化。
---

## 概要

古代エジプトの数学では、分数は`2/3`のような特別な例を除き、`1/2 + 1/3`のように**全て相異なる単位分数(分子が1の分数)の和**として表現された。任意の正の分数`p/q`を、このような単位分数の和に分解する方法は複数知られているが、最も直感的でアルゴリズムとして実装しやすいのが、1202年にフィボナッチが記述した貪欲法(後にシルベスターによって理論的に整理された)である。この方法は、**「現在の残りの分数を超えない範囲で、できるだけ大きい(分母が小さい)単位分数を毎回取り除く」**という単純な貪欲原則を繰り返すだけで、有限回の操作で必ず分解が完了することが保証されている。

## 仕組み

1. 分解したい分数`p/q`(`0 < p/q < 1`と仮定)を用意する
2. 現在の残りの分数`p/q`以下になる、**最大の単位分数**`1/⌈q/p⌉`を求める(`⌈q/p⌉`は`q/p`の切り上げ、これが単位分数の分母になる最小の整数)
3. その単位分数を結果のリストに追加し、残りを`p/q - 1/⌈q/p⌉`に更新する(この引き算を行うと、分子は必ず元の`p`より小さくなることが数学的に証明できる——これが有限回で終了することの根拠になる)
4. 残りがちょうど0になったら終了。そうでなければ、更新した残りの分数について2〜3を繰り返す
5. 得られた単位分数のリストが、元の分数`p/q`の(相異なる単位分数による)エジプト分数分解となる

## 特性・トレードオフ

- **単純な貪欲原則だけで必ず有限回で終了する**: 「取れる中で最大の単位分数を取る」という近視眼的な選択だけを繰り返しているにもかかわらず、各ステップで分子が真に減少していく(フィボナッチが示した性質)ため、アルゴリズムが無限ループに陥ることなく必ず終了することが保証されている。貪欲法の正当性を証明する上での良い教材になっている
- **項数が爆発的に増えることがある**: この貪欲法で得られる分解は、必ずしも項数が最小の分解ではない。分数によっては、分母が非常に急速に大きくなり、項数が想定以上に多くなることがある(有名な例として`5/121`のような分数は、貪欲法だと分母が天文学的な大きさになる項を含む分解になることが知られている)。項数を最小化したい場合は、別のアルゴリズム(分枝限定法による探索など)が必要になる
- **古典的な数論の問題への現代的なアルゴリズムのアプローチ**: エジプト分数分解自体は3000年以上前の記数法に由来する問題だが、それを「貪欲法」という現代のアルゴリズム設計の枠組みで捉え直し、正当性を計算量理論的に議論できる、という点が数学史とアルゴリズム論を橋渡しする興味深い題材になっている
- **使いどころ**: 数論・組合せ論における単位分数分解の教育的な題材、[貪欲集合被覆](/algorithms/set-cover-greedy)のような他の貪欲アルゴリズムと同様の「貪欲選択の正当性証明」のパターンを学ぶ教材、パズル・レクリエーション数学における分数の性質の探求

## 実装例

```python
from fractions import Fraction

def egyptian_fraction_greedy(p: int, q: int) -> list[Fraction]:
    remaining = Fraction(p, q)
    unit_fractions = []

    while remaining.numerator != 0:
        denom = -(-remaining.denominator // remaining.numerator)  # ceil(q/p)
        unit = Fraction(1, denom)
        unit_fractions.append(unit)
        remaining -= unit

    return unit_fractions
```

```typescript
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

type Frac = { num: number; den: number };

function simplify(f: Frac): Frac {
  const g = gcd(Math.abs(f.num), f.den) || 1;
  return { num: f.num / g, den: f.den / g };
}

function subtract(a: Frac, b: Frac): Frac {
  return simplify({ num: a.num * b.den - b.num * a.den, den: a.den * b.den });
}

function egyptianFractionGreedy(p: number, q: number): Frac[] {
  let remaining: Frac = simplify({ num: p, den: q });
  const unitFractions: Frac[] = [];

  while (remaining.num !== 0) {
    const denom = Math.ceil(remaining.den / remaining.num);
    const unit: Frac = { num: 1, den: denom };
    unitFractions.push(unit);
    remaining = subtract(remaining, unit);
  }

  return unitFractions;
}
```

```cpp
#include <vector>
#include <numeric>
#include <utility>
#include <cmath>

using Frac = std::pair<long long, long long>;

Frac simplify(Frac f) {
    long long g = std::gcd(std::abs(f.first), f.second);
    if (g == 0) g = 1;
    return {f.first / g, f.second / g};
}

Frac subtractFrac(Frac a, Frac b) {
    return simplify({a.first * b.second - b.first * a.second, a.second * b.second});
}

std::vector<Frac> egyptianFractionGreedy(long long p, long long q) {
    Frac remaining = simplify({p, q});
    std::vector<Frac> unitFractions;

    while (remaining.first != 0) {
        long long denom = (remaining.second + remaining.first - 1) / remaining.first;  // ceil(q/p)
        Frac unit = {1, denom};
        unitFractions.push_back(unit);
        remaining = subtractFrac(remaining, unit);
    }

    return unitFractions;
}
```

```rust
fn gcd(a: i64, b: i64) -> i64 {
    if b == 0 { a.abs() } else { gcd(b, a % b) }
}

fn simplify(num: i64, den: i64) -> (i64, i64) {
    let g = gcd(num, den).max(1);
    (num / g, den / g)
}

fn subtract_frac(a: (i64, i64), b: (i64, i64)) -> (i64, i64) {
    simplify(a.0 * b.1 - b.0 * a.1, a.1 * b.1)
}

fn egyptian_fraction_greedy(p: i64, q: i64) -> Vec<(i64, i64)> {
    let mut remaining = simplify(p, q);
    let mut unit_fractions = Vec::new();

    while remaining.0 != 0 {
        let denom = (remaining.1 + remaining.0 - 1) / remaining.0; // ceil(q/p)
        let unit = (1, denom);
        unit_fractions.push(unit);
        remaining = subtract_frac(remaining, unit);
    }

    unit_fractions
}
```

```csharp
static long Gcd(long a, long b) => b == 0 ? Math.Abs(a) : Gcd(b, a % b);

static (long num, long den) Simplify((long num, long den) f)
{
    long g = Math.Max(Gcd(f.num, f.den), 1);
    return (f.num / g, f.den / g);
}

static (long, long) SubtractFrac((long num, long den) a, (long num, long den) b)
{
    return Simplify((a.num * b.den - b.num * a.den, a.den * b.den));
}

static List<(long, long)> EgyptianFractionGreedy(long p, long q)
{
    var remaining = Simplify((p, q));
    var unitFractions = new List<(long, long)>();

    while (remaining.Item1 != 0)
    {
        long denom = (remaining.Item2 + remaining.Item1 - 1) / remaining.Item1;
        var unit = (1L, denom);
        unitFractions.Add(unit);
        remaining = SubtractFrac(remaining, unit);
    }

    return unitFractions;
}
```
