---
name: トンプソン構成法
category: コンパイラ・構文解析
subcategory: 字句解析
complexity: O(m)(mは正規表現の長さ)
summary: 正規表現を「連接・選択・繰り返し」の3種の小さな部品に分解し、それぞれをε遷移で繋いだ非決定性有限オートマトン(NFA)へ機械的に組み立てる字句解析の基礎技法。
---

## 概要

`ab*|c`のような正規表現が「どんな文字列にマッチするか」を実際にコンピュータで判定するには、まずこの正規表現を、状態遷移で文字列を受理・拒否するオートマトンに変換する必要がある。1968年にケン・トンプソンが考案したこの構成法は、正規表現を再帰的に「連接(`AB`)」「選択(`A|B`)」「繰り返し(`A*`)」という3つの基本演算に分解し、それぞれに対応する小さな非決定性有限オートマトン(NFA)のパーツを、何も読まずに遷移できる**ε遷移**で繋ぎ合わせることで、どんな正規表現からも機械的にNFA全体を組み立てられるようにした。字句解析器(レキサー)を生成するツール(lex、flex等)の内部で今なお使われている基本技法である。

## 仕組み

1. **基本記号**: 1文字`a`にマッチする正規表現は、開始状態から`a`を読んで受理状態へ1本の辺を引くだけの最小のNFAになる
2. **連接`AB`**: 正規表現`A`のNFAの受理状態と、正規表現`B`のNFAの開始状態をε遷移で繋ぐ。全体としては`A`のNFAの開始状態から始まり、`B`のNFAの受理状態で終わる
3. **選択`A|B`**: 新しい開始状態を作り、そこから`A`のNFAの開始状態と`B`のNFAの開始状態の両方へε遷移を出す。`A`と`B`それぞれの受理状態から、新しい共通の受理状態へε遷移を引く
4. **繰り返し`A*`**(クリーネスター): 新しい開始状態兼受理状態を作り、そこから`A`のNFAの開始状態へε遷移、`A`のNFAの受理状態から新しい状態へε遷移(0回の繰り返し)、さらに`A`のNFAの受理状態から`A`のNFAの開始状態へもε遷移(2回以上の繰り返し)を引く
5. 正規表現の構文木([再帰下降構文解析](/algorithms/recursive-descent-parsing)や[操車場アルゴリズム](/algorithms/shunting-yard-algorithm)で正規表現自体をパースして得られる)をボトムアップに辿りながら、各部分式に対応するNFAの断片を2〜4のルールで組み立て、最終的に正規表現全体を表す1つのNFAを完成させる

## 特性・トレードオフ

- **計算量**: 正規表現の長さ`m`に対して、生成されるNFAの状態数は`O(m)`(各記号・演算子ごとに定数個の状態が追加されるだけ)——正規表現の長さに対して線形の大きさのNFAが得られる、非常に効率的な構成法
- **非決定性(NFA)であることの意味**: ε遷移や、同じ入力記号に対して複数の遷移先を持ちうる非決定性のため、そのままでは「今どの状態にいるか」が一意に定まらない。実際に文字列を判定するには、全ての可能な状態の集合を同時に追跡するか、[部分集合構成法](/algorithms/subset-construction)で決定性有限オートマトン(DFA)に変換してから判定するのが一般的
- **正規表現とオートマトンの等価性の構成的証明**: この構成法は、単なる実用アルゴリズムであるだけでなく、「正規表現で表現できる言語は、有限オートマトンで認識できる言語と完全に一致する」という形式言語理論の基本定理を、実際に手順として構成的に証明するものでもある
- **使いどころ**: 字句解析器生成ツール(lex/flex、正規表現エンジンの内部実装)の最初のステップ、テキストエディタや検索ツールの正規表現マッチング機能の実装基盤。生成されたNFAは通常[部分集合構成法](/algorithms/subset-construction)でDFAに変換され、さらに[DFA最小化](/algorithms/dfa-minimization)で状態数を減らしてから実行される

## 実装例

連接・選択(`|`)・繰り返し(`*`)・括弧のみをサポートする簡略化した正規表現パーサーで構文木を辿りながら、トンプソン構成法の4つの規則でNFAを組み立てる。

```python
EPSILON = None  # ε遷移を表す特別な記号


class NfaBuilder:
    def __init__(self):
        self.next_state = 0
        self.transitions: dict[tuple[int, str | None], set[int]] = {}

    def new_state(self) -> int:
        s = self.next_state
        self.next_state += 1
        return s

    def add_edge(self, src: int, symbol, dst: int) -> None:
        self.transitions.setdefault((src, symbol), set()).add(dst)

    def build_symbol(self, ch: str) -> tuple[int, int]:
        """基本記号: 1文字にマッチする最小のNFA"""
        s, a = self.new_state(), self.new_state()
        self.add_edge(s, ch, a)
        return (s, a)

    def build_concat(self, left: tuple[int, int], right: tuple[int, int]) -> tuple[int, int]:
        """連接AB: Aの受理状態とBの開始状態をε遷移で繋ぐ"""
        self.add_edge(left[1], EPSILON, right[0])
        return (left[0], right[1])

    def build_union(self, left: tuple[int, int], right: tuple[int, int]) -> tuple[int, int]:
        """選択A|B: 新しい開始・受理状態を作り、両方へε遷移で分岐/合流させる"""
        s, a = self.new_state(), self.new_state()
        self.add_edge(s, EPSILON, left[0])
        self.add_edge(s, EPSILON, right[0])
        self.add_edge(left[1], EPSILON, a)
        self.add_edge(right[1], EPSILON, a)
        return (s, a)

    def build_star(self, inner: tuple[int, int]) -> tuple[int, int]:
        """繰り返しA*: 新しい開始兼受理状態を作り、0回・複数回の繰り返しをε遷移で表現する"""
        s, a = self.new_state(), self.new_state()
        self.add_edge(s, EPSILON, inner[0])
        self.add_edge(s, EPSILON, a)  # 0回の繰り返し
        self.add_edge(inner[1], EPSILON, inner[0])  # 2回以上の繰り返し
        self.add_edge(inner[1], EPSILON, a)
        return (s, a)


def parse_regex(pattern: str, b: NfaBuilder) -> tuple[int, int]:
    """expr := term ('|' term)* / term := factor+ / factor := atom '*'? / atom := char | '(' expr ')'"""
    pos = 0

    def peek():
        return pattern[pos] if pos < len(pattern) else None

    def expr():
        nonlocal pos
        left = term()
        while peek() == "|":
            pos += 1
            left = b.build_union(left, term())
        return left

    def term():
        nonlocal pos
        left = factor()
        while peek() is not None and peek() not in ("|", ")"):
            left = b.build_concat(left, factor())
        return left

    def factor():
        nonlocal pos
        atom_ = atom()
        while peek() == "*":
            pos += 1
            atom_ = b.build_star(atom_)
        return atom_

    def atom():
        nonlocal pos
        if peek() == "(":
            pos += 1
            e = expr()
            pos += 1  # ')'
            return e
        ch = pattern[pos]
        pos += 1
        return b.build_symbol(ch)

    return expr()


def epsilon_closure(states: set[int], transitions: dict) -> set[int]:
    stack = list(states)
    closure = set(states)
    while stack:
        s = stack.pop()
        for nxt in transitions.get((s, EPSILON), ()):
            if nxt not in closure:
                closure.add(nxt)
                stack.append(nxt)
    return closure


def nfa_accepts(start: int, accept: int, transitions: dict, text: str) -> bool:
    current = epsilon_closure({start}, transitions)
    for ch in text:
        nxt: set[int] = set()
        for s in current:
            nxt |= transitions.get((s, ch), set())
        current = epsilon_closure(nxt, transitions)
    return accept in current
```

```typescript
const EPSILON = "\0"; // ε遷移を表す特別な記号(文字集合には現れない値)

type Frag = { start: number; accept: number };

class NfaBuilder {
  nextState = 0;
  transitions = new Map<string, Set<number>>();

  newState(): number {
    return this.nextState++;
  }

  addEdge(src: number, symbol: string, dst: number): void {
    const k = `${src}:${symbol}`;
    if (!this.transitions.has(k)) this.transitions.set(k, new Set());
    this.transitions.get(k)!.add(dst);
  }

  // 基本記号: 1文字にマッチする最小のNFA
  buildSymbol(ch: string): Frag {
    const s = this.newState();
    const a = this.newState();
    this.addEdge(s, ch, a);
    return { start: s, accept: a };
  }

  // 連接AB: Aの受理状態とBの開始状態をε遷移で繋ぐ
  buildConcat(left: Frag, right: Frag): Frag {
    this.addEdge(left.accept, EPSILON, right.start);
    return { start: left.start, accept: right.accept };
  }

  // 選択A|B: 新しい開始・受理状態を作り、両方へε遷移で分岐/合流させる
  buildUnion(left: Frag, right: Frag): Frag {
    const s = this.newState();
    const a = this.newState();
    this.addEdge(s, EPSILON, left.start);
    this.addEdge(s, EPSILON, right.start);
    this.addEdge(left.accept, EPSILON, a);
    this.addEdge(right.accept, EPSILON, a);
    return { start: s, accept: a };
  }

  // 繰り返しA*: 新しい開始兼受理状態を作り、0回・複数回の繰り返しをε遷移で表現する
  buildStar(inner: Frag): Frag {
    const s = this.newState();
    const a = this.newState();
    this.addEdge(s, EPSILON, inner.start);
    this.addEdge(s, EPSILON, a); // 0回の繰り返し
    this.addEdge(inner.accept, EPSILON, inner.start); // 2回以上の繰り返し
    this.addEdge(inner.accept, EPSILON, a);
    return { start: s, accept: a };
  }
}

// expr := term ('|' term)* / term := factor+ / factor := atom '*'? / atom := char | '(' expr ')'
function parseRegex(pattern: string, b: NfaBuilder): Frag {
  let pos = 0;
  const peek = () => (pos < pattern.length ? pattern[pos] : null);

  function expr(): Frag {
    let left = term();
    while (peek() === "|") {
      pos++;
      left = b.buildUnion(left, term());
    }
    return left;
  }
  function term(): Frag {
    let left = factor();
    while (peek() !== null && peek() !== "|" && peek() !== ")") {
      left = b.buildConcat(left, factor());
    }
    return left;
  }
  function factor(): Frag {
    let a = atom();
    while (peek() === "*") {
      pos++;
      a = b.buildStar(a);
    }
    return a;
  }
  function atom(): Frag {
    if (peek() === "(") {
      pos++;
      const e = expr();
      pos++; // ')'
      return e;
    }
    const ch = pattern[pos];
    pos++;
    return b.buildSymbol(ch);
  }

  return expr();
}

function epsilonClosure(states: Set<number>, transitions: Map<string, Set<number>>): Set<number> {
  const stack = [...states];
  const closure = new Set(states);
  while (stack.length > 0) {
    const s = stack.pop()!;
    const next = transitions.get(`${s}:${EPSILON}`);
    if (next) {
      for (const n of next) {
        if (!closure.has(n)) {
          closure.add(n);
          stack.push(n);
        }
      }
    }
  }
  return closure;
}

function nfaAccepts(start: number, accept: number, transitions: Map<string, Set<number>>, text: string): boolean {
  let current = epsilonClosure(new Set([start]), transitions);
  for (const ch of text) {
    const next = new Set<number>();
    for (const s of current) {
      const targets = transitions.get(`${s}:${ch}`);
      if (targets) for (const t of targets) next.add(t);
    }
    current = epsilonClosure(next, transitions);
  }
  return current.has(accept);
}
```

```cpp
#include <string>
#include <map>
#include <set>
#include <vector>
#include <optional>

constexpr char EPSILON = '\0'; // ε遷移を表す特別な記号

struct NfaBuilder {
    int nextState = 0;
    std::map<std::pair<int, char>, std::set<int>> transitions;

    int newState() { return nextState++; }

    void addEdge(int src, char symbol, int dst) {
        transitions[{src, symbol}].insert(dst);
    }

    // 基本記号: 1文字にマッチする最小のNFA
    std::pair<int, int> buildSymbol(char ch) {
        int s = newState(), a = newState();
        addEdge(s, ch, a);
        return {s, a};
    }

    // 連接AB: Aの受理状態とBの開始状態をε遷移で繋ぐ
    std::pair<int, int> buildConcat(std::pair<int, int> left, std::pair<int, int> right) {
        addEdge(left.second, EPSILON, right.first);
        return {left.first, right.second};
    }

    // 選択A|B: 新しい開始・受理状態を作り、両方へε遷移で分岐/合流させる
    std::pair<int, int> buildUnion(std::pair<int, int> left, std::pair<int, int> right) {
        int s = newState(), a = newState();
        addEdge(s, EPSILON, left.first);
        addEdge(s, EPSILON, right.first);
        addEdge(left.second, EPSILON, a);
        addEdge(right.second, EPSILON, a);
        return {s, a};
    }

    // 繰り返しA*: 新しい開始兼受理状態を作り、0回・複数回の繰り返しをε遷移で表現する
    std::pair<int, int> buildStar(std::pair<int, int> inner) {
        int s = newState(), a = newState();
        addEdge(s, EPSILON, inner.first);
        addEdge(s, EPSILON, a);
        addEdge(inner.second, EPSILON, inner.first);
        addEdge(inner.second, EPSILON, a);
        return {s, a};
    }
};

// expr := term ('|' term)* / term := factor+ / factor := atom '*'? / atom := char | '(' expr ')'
std::pair<int, int> parseRegex(const std::string& pattern, NfaBuilder& b) {
    size_t pos = 0;

    std::function<std::pair<int, int>()> expr, term, factor, atomFn;

    auto peek = [&]() -> std::optional<char> {
        return pos < pattern.size() ? std::optional<char>(pattern[pos]) : std::nullopt;
    };

    atomFn = [&]() -> std::pair<int, int> {
        if (peek() == '(') {
            pos++;
            auto e = expr();
            pos++; // ')'
            return e;
        }
        char ch = pattern[pos];
        pos++;
        return b.buildSymbol(ch);
    };

    factor = [&]() -> std::pair<int, int> {
        auto a = atomFn();
        while (peek() == '*') {
            pos++;
            a = b.buildStar(a);
        }
        return a;
    };

    term = [&]() -> std::pair<int, int> {
        auto left = factor();
        while (peek().has_value() && peek() != '|' && peek() != ')') {
            left = b.buildConcat(left, factor());
        }
        return left;
    };

    expr = [&]() -> std::pair<int, int> {
        auto left = term();
        while (peek() == '|') {
            pos++;
            left = b.buildUnion(left, term());
        }
        return left;
    };

    return expr();
}

std::set<int> epsilonClosure(std::set<int> states, const std::map<std::pair<int, char>, std::set<int>>& transitions) {
    std::vector<int> stack(states.begin(), states.end());
    std::set<int> closure = states;
    while (!stack.empty()) {
        int s = stack.back();
        stack.pop_back();
        auto it = transitions.find({s, EPSILON});
        if (it != transitions.end()) {
            for (int n : it->second) {
                if (closure.insert(n).second) stack.push_back(n);
            }
        }
    }
    return closure;
}

bool nfaAccepts(int start, int accept, const std::map<std::pair<int, char>, std::set<int>>& transitions, const std::string& text) {
    auto current = epsilonClosure({start}, transitions);
    for (char ch : text) {
        std::set<int> next;
        for (int s : current) {
            auto it = transitions.find({s, ch});
            if (it != transitions.end()) next.insert(it->second.begin(), it->second.end());
        }
        current = epsilonClosure(next, transitions);
    }
    return current.count(accept) > 0;
}
```

```rust
use std::collections::{HashMap, HashSet};

const EPSILON: char = '\0'; // ε遷移を表す特別な記号

#[derive(Default)]
struct NfaBuilder {
    next_state: usize,
    transitions: HashMap<(usize, char), HashSet<usize>>,
}

impl NfaBuilder {
    fn new_state(&mut self) -> usize {
        let s = self.next_state;
        self.next_state += 1;
        s
    }

    fn add_edge(&mut self, src: usize, symbol: char, dst: usize) {
        self.transitions.entry((src, symbol)).or_default().insert(dst);
    }

    // 基本記号: 1文字にマッチする最小のNFA
    fn build_symbol(&mut self, ch: char) -> (usize, usize) {
        let (s, a) = (self.new_state(), self.new_state());
        self.add_edge(s, ch, a);
        (s, a)
    }

    // 連接AB: Aの受理状態とBの開始状態をε遷移で繋ぐ
    fn build_concat(&mut self, left: (usize, usize), right: (usize, usize)) -> (usize, usize) {
        self.add_edge(left.1, EPSILON, right.0);
        (left.0, right.1)
    }

    // 選択A|B: 新しい開始・受理状態を作り、両方へε遷移で分岐/合流させる
    fn build_union(&mut self, left: (usize, usize), right: (usize, usize)) -> (usize, usize) {
        let (s, a) = (self.new_state(), self.new_state());
        self.add_edge(s, EPSILON, left.0);
        self.add_edge(s, EPSILON, right.0);
        self.add_edge(left.1, EPSILON, a);
        self.add_edge(right.1, EPSILON, a);
        (s, a)
    }

    // 繰り返しA*: 新しい開始兼受理状態を作り、0回・複数回の繰り返しをε遷移で表現する
    fn build_star(&mut self, inner: (usize, usize)) -> (usize, usize) {
        let (s, a) = (self.new_state(), self.new_state());
        self.add_edge(s, EPSILON, inner.0);
        self.add_edge(s, EPSILON, a);
        self.add_edge(inner.1, EPSILON, inner.0);
        self.add_edge(inner.1, EPSILON, a);
        (s, a)
    }
}

// expr := term ('|' term)* / term := factor+ / factor := atom '*'? / atom := char | '(' expr ')'
struct RegexParser<'a> {
    pattern: &'a [char],
    pos: usize,
    builder: NfaBuilder,
}

impl<'a> RegexParser<'a> {
    fn peek(&self) -> Option<char> {
        self.pattern.get(self.pos).copied()
    }

    fn parse(&mut self) -> (usize, usize) {
        self.expr()
    }

    fn expr(&mut self) -> (usize, usize) {
        let mut left = self.term();
        while self.peek() == Some('|') {
            self.pos += 1;
            let right = self.term();
            left = self.builder.build_union(left, right);
        }
        left
    }

    fn term(&mut self) -> (usize, usize) {
        let mut left = self.factor();
        while let Some(c) = self.peek() {
            if c == '|' || c == ')' {
                break;
            }
            let right = self.factor();
            left = self.builder.build_concat(left, right);
        }
        left
    }

    fn factor(&mut self) -> (usize, usize) {
        let mut a = self.atom();
        while self.peek() == Some('*') {
            self.pos += 1;
            a = self.builder.build_star(a);
        }
        a
    }

    fn atom(&mut self) -> (usize, usize) {
        if self.peek() == Some('(') {
            self.pos += 1;
            let e = self.expr();
            self.pos += 1; // ')'
            return e;
        }
        let ch = self.pattern[self.pos];
        self.pos += 1;
        self.builder.build_symbol(ch)
    }
}

fn epsilon_closure(states: &HashSet<usize>, transitions: &HashMap<(usize, char), HashSet<usize>>) -> HashSet<usize> {
    let mut stack: Vec<usize> = states.iter().copied().collect();
    let mut closure = states.clone();
    while let Some(s) = stack.pop() {
        if let Some(next) = transitions.get(&(s, EPSILON)) {
            for &n in next {
                if closure.insert(n) {
                    stack.push(n);
                }
            }
        }
    }
    closure
}

fn nfa_accepts(start: usize, accept: usize, transitions: &HashMap<(usize, char), HashSet<usize>>, text: &str) -> bool {
    let mut current = epsilon_closure(&HashSet::from([start]), transitions);
    for ch in text.chars() {
        let mut next = HashSet::new();
        for &s in &current {
            if let Some(targets) = transitions.get(&(s, ch)) {
                next.extend(targets);
            }
        }
        current = epsilon_closure(&next, transitions);
    }
    current.contains(&accept)
}
```

```csharp
class NfaBuilder
{
    public const char Epsilon = '\0'; // ε遷移を表す特別な記号
    public int NextState = 0;
    public Dictionary<(int, char), HashSet<int>> Transitions = new();

    public int NewState() => NextState++;

    public void AddEdge(int src, char symbol, int dst)
    {
        var key = (src, symbol);
        if (!Transitions.TryGetValue(key, out var set))
        {
            set = new HashSet<int>();
            Transitions[key] = set;
        }
        set.Add(dst);
    }

    // 基本記号: 1文字にマッチする最小のNFA
    public (int start, int accept) BuildSymbol(char ch)
    {
        int s = NewState(), a = NewState();
        AddEdge(s, ch, a);
        return (s, a);
    }

    // 連接AB: Aの受理状態とBの開始状態をε遷移で繋ぐ
    public (int start, int accept) BuildConcat((int start, int accept) left, (int start, int accept) right)
    {
        AddEdge(left.accept, Epsilon, right.start);
        return (left.start, right.accept);
    }

    // 選択A|B: 新しい開始・受理状態を作り、両方へε遷移で分岐/合流させる
    public (int start, int accept) BuildUnion((int start, int accept) left, (int start, int accept) right)
    {
        int s = NewState(), a = NewState();
        AddEdge(s, Epsilon, left.start);
        AddEdge(s, Epsilon, right.start);
        AddEdge(left.accept, Epsilon, a);
        AddEdge(right.accept, Epsilon, a);
        return (s, a);
    }

    // 繰り返しA*: 新しい開始兼受理状態を作り、0回・複数回の繰り返しをε遷移で表現する
    public (int start, int accept) BuildStar((int start, int accept) inner)
    {
        int s = NewState(), a = NewState();
        AddEdge(s, Epsilon, inner.start);
        AddEdge(s, Epsilon, a);
        AddEdge(inner.accept, Epsilon, inner.start);
        AddEdge(inner.accept, Epsilon, a);
        return (s, a);
    }
}

class RegexParser
{
    readonly string pattern;
    int pos = 0;
    readonly NfaBuilder b;

    public RegexParser(string pattern, NfaBuilder b)
    {
        this.pattern = pattern;
        this.b = b;
    }

    char? Peek() => pos < pattern.Length ? pattern[pos] : (char?)null;

    // expr := term ('|' term)* / term := factor+ / factor := atom '*'? / atom := char | '(' expr ')'
    public (int start, int accept) Parse() => Expr();

    (int start, int accept) Expr()
    {
        var left = Term();
        while (Peek() == '|')
        {
            pos++;
            left = b.BuildUnion(left, Term());
        }
        return left;
    }

    (int start, int accept) Term()
    {
        var left = Factor();
        while (Peek() != null && Peek() != '|' && Peek() != ')')
        {
            left = b.BuildConcat(left, Factor());
        }
        return left;
    }

    (int start, int accept) Factor()
    {
        var a = Atom();
        while (Peek() == '*')
        {
            pos++;
            a = b.BuildStar(a);
        }
        return a;
    }

    (int start, int accept) Atom()
    {
        if (Peek() == '(')
        {
            pos++;
            var e = Expr();
            pos++; // ')'
            return e;
        }
        char ch = pattern[pos];
        pos++;
        return b.BuildSymbol(ch);
    }
}

static class Nfa
{
    static HashSet<int> EpsilonClosure(HashSet<int> states, Dictionary<(int, char), HashSet<int>> transitions)
    {
        var stack = new Stack<int>(states);
        var closure = new HashSet<int>(states);
        while (stack.Count > 0)
        {
            int s = stack.Pop();
            if (transitions.TryGetValue((s, NfaBuilder.Epsilon), out var next))
            {
                foreach (var n in next)
                {
                    if (closure.Add(n)) stack.Push(n);
                }
            }
        }
        return closure;
    }

    public static bool Accepts(int start, int accept, Dictionary<(int, char), HashSet<int>> transitions, string text)
    {
        var current = EpsilonClosure(new HashSet<int> { start }, transitions);
        foreach (var ch in text)
        {
            var next = new HashSet<int>();
            foreach (var s in current)
            {
                if (transitions.TryGetValue((s, ch), out var targets))
                {
                    foreach (var t in targets) next.Add(t);
                }
            }
            current = EpsilonClosure(next, transitions);
        }
        return current.Contains(accept);
    }
}
```
