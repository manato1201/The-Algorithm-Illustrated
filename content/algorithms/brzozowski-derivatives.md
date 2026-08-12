---
name: 正規表現の微分法によるマッチング(Brzozowski導関数)
category: コンパイラ・構文解析
subcategory: 字句解析
complexity: O(n・|R|)(nは入力長、|R|は正規表現の構文木のサイズ、実装により変動)
summary: 「文字cを読んだ後、正規表現Rが受理する残りの文字列は何か」を表す新しい正規表現R'をRとcから直接構成する導関数の演算を定義し、DFA構築を経ずに入力文字を読むたびに正規表現そのものを書き換えていくことでマッチングを行う。
---

## 概要

[Thompson構成法](/algorithms/thompson-construction)は正規表現からNFAを構築し、[部分集合構成法](/algorithms/subset-construction)でDFAに変換するという、複数の段階を経て初めて効率的なマッチングが可能になる。ヤニス・ブルゾゾフスキーが1964年に示した別のアプローチは、この変換の手順を丸ごと飛び越える——正規表現`R`と文字`c`から、**「文字`c`を読んだ後、`R`が受理する残りの部分に一致する新しい正規表現」** を直接計算する**導関数(derivative)**という演算`∂R/∂c`を定義し、入力文字列を1文字読むたびにこの微分を適用して正規表現そのものを書き換えていくことで、オートマトンを明示的に構築せずにマッチングを行う。

## 仕組み

1. 正規表現`R`の**導関数**`D_c(R)`を、次のような構造的な規則で再帰的に定義する:
   - `D_c(∅) = ∅`(空集合の微分は空集合)
   - `D_c(ε) = ∅`(空文字列の微分は空集合、これ以上何も読めない)
   - `D_c(c) = ε`、`D_c(c') = ∅`(`c' ≠ c`の場合)(単一文字は、その文字自体の微分だけがεになる)
   - `D_c(R1 | R2) = D_c(R1) | D_c(R2)`(選択の微分は、両方の微分の選択)
   - `D_c(R1・R2) = D_c(R1)・R2 | (もしR1がεを受理するなら) D_c(R2)`(連接の微分は、R1側で消費する場合とR1が空文字列を許して即座にR2側に移る場合の合成)
   - `D_c(R*) = D_c(R)・R*`(繰り返しの微分は、1回分Rを消費してから、また繰り返しに戻る)
2. 入力文字列`s = c_1 c_2 ... c_n`に対して、正規表現`R`から始めて`D_{c_1}(R)`、その結果にさらに`D_{c_2}`を適用して`D_{c_2}(D_{c_1}(R))`、というように**1文字読むごとに導関数を取り続ける**
3. 全ての文字を読み終えた後の最終的な正規表現が、**空文字列を受理するかどうか(nullable かどうか)** を判定する。空文字列を受理すれば、元の文字列`s`全体が`R`にマッチしたことになる
4. 実務上の効率化として、微分によって得られる正規表現の同値なものを同一視(正規化)することで、実質的にDFAの状態を都度動的に生成しているのと同じ効果を得つつ、明示的な状態遷移表の事前構築を省略できる

## 特性・トレードオフ

- **オートマトンの明示的な構築が不要**: [Thompson構成法](/algorithms/thompson-construction)→NFA→[部分集合構成法](/algorithms/subset-construction)→DFAという複数段階の変換を経ずに、正規表現の構文的な書き換えだけでマッチングロジックを実装できるため、理論的な見通しが良く、関数型言語での実装と相性が良い
- **拡張正規表現への対応のしやすさ**: 導関数の定義は正規表現の構文規則に対して再帰的に与えられるため、通常の正規表現(選択・連接・繰り返し)だけでなく、否定・交差(AND演算)のような拡張演算子を持つ正規表現(拡張正規表現)にも、対応する微分規則を追加するだけで自然に拡張できる。これはNFA/DFAベースの手法では必ずしも簡単ではない
- **効率的な実装には工夫が必要**: 素朴な実装では、微分の結果として得られる正規表現の構文木がどんどん巨大になっていく可能性があり、同値な正規表現をまとめる正規化やメモ化が実務上重要になる。適切に実装すれば、事実上DFAと同等の効率(状態数に相当する導関数のバリエーションを動的にキャッシュする)を達成できる
- **使いどころ**: 関数型プログラミング言語での正規表現エンジンの実装(Racket、Haskellなどでの理論的にエレガントな実装例として知られる)、拡張正規表現(交差・否定を含む)のマッチングエンジン、[最長一致法](/algorithms/maximal-munch-tokenization)と組み合わせた字句解析器の代替実装、形式言語理論における正規表現の性質の証明・解析

## 実装例

正規表現を代数的なデータ型として表現し、Brzozowski導関数によるマッチングを実装する。

```python
from dataclasses import dataclass
from typing import Union

@dataclass(frozen=True)
class Empty: pass  # 空集合(何も受理しない)

@dataclass(frozen=True)
class Epsilon: pass  # 空文字列のみを受理

@dataclass(frozen=True)
class Char:
    c: str

@dataclass(frozen=True)
class Union_:
    left: "Regex"
    right: "Regex"

@dataclass(frozen=True)
class Concat:
    left: "Regex"
    right: "Regex"

@dataclass(frozen=True)
class Star:
    inner: "Regex"

Regex = Union[Empty, Epsilon, Char, Union_, Concat, Star]

def nullable(r: Regex) -> bool:
    """空文字列を受理するか。"""
    if isinstance(r, Epsilon): return True
    if isinstance(r, Star): return True
    if isinstance(r, Union_): return nullable(r.left) or nullable(r.right)
    if isinstance(r, Concat): return nullable(r.left) and nullable(r.right)
    return False  # Empty, Char

def derivative(r: Regex, c: str) -> Regex:
    if isinstance(r, Empty) or isinstance(r, Epsilon):
        return Empty()
    if isinstance(r, Char):
        return Epsilon() if r.c == c else Empty()
    if isinstance(r, Union_):
        return Union_(derivative(r.left, c), derivative(r.right, c))
    if isinstance(r, Concat):
        d_left = Concat(derivative(r.left, c), r.right)
        if nullable(r.left):
            return Union_(d_left, derivative(r.right, c))
        return d_left
    if isinstance(r, Star):
        return Concat(derivative(r.inner, c), r)
    raise ValueError("未知の正規表現ノード")

def matches(r: Regex, s: str) -> bool:
    for c in s:
        r = derivative(r, c)
    return nullable(r)
```

```typescript
type Regex =
  | { kind: "Empty" }
  | { kind: "Epsilon" }
  | { kind: "Char"; c: string }
  | { kind: "Union"; left: Regex; right: Regex }
  | { kind: "Concat"; left: Regex; right: Regex }
  | { kind: "Star"; inner: Regex };

function nullable(r: Regex): boolean {
  switch (r.kind) {
    case "Epsilon": return true;
    case "Star": return true;
    case "Union": return nullable(r.left) || nullable(r.right);
    case "Concat": return nullable(r.left) && nullable(r.right);
    default: return false;
  }
}

function derivative(r: Regex, c: string): Regex {
  switch (r.kind) {
    case "Empty":
    case "Epsilon":
      return { kind: "Empty" };
    case "Char":
      return r.c === c ? { kind: "Epsilon" } : { kind: "Empty" };
    case "Union":
      return { kind: "Union", left: derivative(r.left, c), right: derivative(r.right, c) };
    case "Concat": {
      const dLeft: Regex = { kind: "Concat", left: derivative(r.left, c), right: r.right };
      return nullable(r.left) ? { kind: "Union", left: dLeft, right: derivative(r.right, c) } : dLeft;
    }
    case "Star":
      return { kind: "Concat", left: derivative(r.inner, c), right: r };
  }
}

function matches(r: Regex, s: string): boolean {
  for (const c of s) r = derivative(r, c);
  return nullable(r);
}
```

```cpp
#include <memory>
#include <string>
#include <variant>

struct Regex;
using RegexPtr = std::shared_ptr<Regex>;

struct Empty {};
struct Epsilon {};
struct Char { char c; };
struct UnionR { RegexPtr left, right; };
struct Concat { RegexPtr left, right; };
struct Star { RegexPtr inner; };

struct Regex {
    std::variant<Empty, Epsilon, Char, UnionR, Concat, Star> node;
};

bool nullable(const RegexPtr& r) {
    if (std::holds_alternative<Epsilon>(r->node)) return true;
    if (std::holds_alternative<Star>(r->node)) return true;
    if (auto* u = std::get_if<UnionR>(&r->node)) return nullable(u->left) || nullable(u->right);
    if (auto* c = std::get_if<Concat>(&r->node)) return nullable(c->left) && nullable(c->right);
    return false;
}

RegexPtr derivative(const RegexPtr& r, char c) {
    if (std::holds_alternative<Empty>(r->node) || std::holds_alternative<Epsilon>(r->node))
        return std::make_shared<Regex>(Regex{Empty{}});
    if (auto* ch = std::get_if<Char>(&r->node))
        return std::make_shared<Regex>(Regex{ch->c == c ? Regex{Epsilon{}} : Regex{Empty{}}});
    if (auto* u = std::get_if<UnionR>(&r->node))
        return std::make_shared<Regex>(Regex{UnionR{derivative(u->left, c), derivative(u->right, c)}});
    if (auto* cc = std::get_if<Concat>(&r->node)) {
        auto dLeft = std::make_shared<Regex>(Regex{Concat{derivative(cc->left, c), cc->right}});
        if (nullable(cc->left)) return std::make_shared<Regex>(Regex{UnionR{dLeft, derivative(cc->right, c)}});
        return dLeft;
    }
    if (auto* s = std::get_if<Star>(&r->node))
        return std::make_shared<Regex>(Regex{Concat{derivative(s->inner, c), r}});
    return std::make_shared<Regex>(Regex{Empty{}});
}
```

```rust
use std::rc::Rc;

enum Regex {
    Empty,
    Epsilon,
    Char(char),
    Union(Rc<Regex>, Rc<Regex>),
    Concat(Rc<Regex>, Rc<Regex>),
    Star(Rc<Regex>),
}

fn nullable(r: &Regex) -> bool {
    match r {
        Regex::Epsilon | Regex::Star(_) => true,
        Regex::Union(l, rr) => nullable(l) || nullable(rr),
        Regex::Concat(l, rr) => nullable(l) && nullable(rr),
        _ => false,
    }
}

fn derivative(r: &Rc<Regex>, c: char) -> Rc<Regex> {
    match r.as_ref() {
        Regex::Empty | Regex::Epsilon => Rc::new(Regex::Empty),
        Regex::Char(rc) => Rc::new(if *rc == c { Regex::Epsilon } else { Regex::Empty }),
        Regex::Union(l, rr) => Rc::new(Regex::Union(derivative(l, c), derivative(rr, c))),
        Regex::Concat(l, rr) => {
            let d_left = Rc::new(Regex::Concat(derivative(l, c), rr.clone()));
            if nullable(l) {
                Rc::new(Regex::Union(d_left, derivative(rr, c)))
            } else {
                d_left
            }
        }
        Regex::Star(inner) => Rc::new(Regex::Concat(derivative(inner, c), r.clone())),
    }
}

fn matches(mut r: Rc<Regex>, s: &str) -> bool {
    for c in s.chars() {
        r = derivative(&r, c);
    }
    nullable(&r)
}
```

```csharp
abstract class Regex { }
class Empty : Regex { }
class Epsilon : Regex { }
class Chr : Regex { public char C; }
class UnionR : Regex { public Regex Left, Right; }
class Concat : Regex { public Regex Left, Right; }
class Star : Regex { public Regex Inner; }

static class RegexOps
{
    public static bool Nullable(Regex r) => r switch
    {
        Epsilon => true,
        Star => true,
        UnionR u => Nullable(u.Left) || Nullable(u.Right),
        Concat c => Nullable(c.Left) && Nullable(c.Right),
        _ => false,
    };

    public static Regex Derivative(Regex r, char c) => r switch
    {
        Empty or Epsilon => new Empty(),
        Chr ch => ch.C == c ? new Epsilon() : new Empty(),
        UnionR u => new UnionR { Left = Derivative(u.Left, c), Right = Derivative(u.Right, c) },
        Concat cc => Nullable(cc.Left)
            ? new UnionR { Left = new Concat { Left = Derivative(cc.Left, c), Right = cc.Right }, Right = Derivative(cc.Right, c) }
            : new Concat { Left = Derivative(cc.Left, c), Right = cc.Right },
        Star s => new Concat { Left = Derivative(s.Inner, c), Right = s },
        _ => new Empty(),
    };

    public static bool Matches(Regex r, string s)
    {
        foreach (char c in s) r = Derivative(r, c);
        return Nullable(r);
    }
}
```
