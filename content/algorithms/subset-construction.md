---
name: 部分集合構成法
category: コンパイラ・構文解析
subcategory: 字句解析
complexity: O(2^n)(最悪ケース、nはNFAの状態数。実用上ははるかに少ない)
summary: NFAが「同時にいる可能性のある状態の集合」を1つの状態とみなすことで、非決定性有限オートマトンを決定性有限オートマトンへ機械的に変換する手法。
---

## 概要

[トンプソン構成法](/algorithms/thompson-construction)で得られる非決定性有限オートマトン(NFA)は、同じ入力に対して複数の遷移先を持ちうるため、そのままでは「次にどの状態へ進むべきか」が一意に決まらず、実行時に全ての可能性を並行して追跡する必要があり非効率になりやすい。部分集合構成法(べき集合構成法とも呼ばれる)は、「NFAが取りうる状態の集合」自体を、決定性有限オートマトン(DFA)の1つの状態とみなすという発想の転換によって、NFAを機械的に、かつ入出力の言語を完全に保ったままDFAへ変換する。

## 仕組み

1. NFAの開始状態から、ε遷移だけで到達できる全ての状態の集合(**ε閉包**)を計算し、これをDFAの開始状態とする
2. 未処理のDFA状態(NFAの状態集合)を1つ取り出し、入力アルファベットの各記号`a`について、その集合中のどれかのNFA状態から`a`で遷移できる先の状態全てを集める。さらにそれらの状態からε遷移だけで到達できる状態も加える(ε閉包)——これが、記号`a`を読んだ後にDFAが遷移すべき新しい状態集合になる
3. この新しい状態集合が既に発見済みのDFA状態と同じでなければ、新しいDFA状態として登録し、未処理リストに追加する。既に発見済みならその既存の状態への遷移として記録する
4. 全てのDFA状態と全ての入力記号の組み合わせについて2〜3を繰り返し、未処理の状態集合がなくなるまで続ける
5. NFAの受理状態を1つでも含む状態集合は、DFAでも受理状態として扱う

## 特性・トレードオフ

- **計算量**: 理論上、`n`状態のNFAから最悪`2^n`個のDFA状態が生成されうる(NFAの状態の任意の部分集合が異なるDFA状態になりうるため)。しかし実際の正規表現から生成されるNFAでは、到達可能な状態集合の種類ははるかに少なく、実用上は問題にならないことがほとんど
- **表現力は変わらない**: NFAとDFAは、状態数や実行時の効率は異なっても、**受理できる言語(認識能力)は完全に同じ**であることが理論的に保証されている——部分集合構成法はこの等価性を実際に構成する手続きになっている
- **実行時の効率とのトレードオフ**: DFAは各時点で「今どの1つの状態にいるか」が確定しているため、入力記号ごとに定数時間で次の状態を決められ、実行が非常に高速になる。NFAのまま複数状態を並行追跡する実装と比べ、事前にDFAへ変換しておくコスト(部分集合構成法自体の計算)を払う代わりに実行時の速度を得る、という典型的な前計算とクエリのトレードオフになっている
- **使いどころ**: 字句解析器生成ツールの内部処理(正規表現→NFA→DFAという変換パイプラインの中間ステップ)。生成されたDFAはさらに[DFA最小化](/algorithms/dfa-minimization)で状態数を削減してから、実際の字句解析(トークナイズ)に使われる

## 実装例

[トンプソン構成法](/algorithms/thompson-construction)の要領で簡易な正規表現からNFAを組み立てたあと、その状態集合をDFAの1状態とみなす部分集合構成法でDFA化する。

```python
EPSILON = None


class NfaBuilder:
    """トンプソン構成法の要領で正規表現(連接・|・*・括弧)からNFAを組み立てる"""

    def __init__(self):
        self.next_state = 0
        self.transitions: dict[tuple[int, str | None], set[int]] = {}
        self.alphabet: set[str] = set()

    def new_state(self) -> int:
        s = self.next_state
        self.next_state += 1
        return s

    def add_edge(self, src, symbol, dst) -> None:
        self.transitions.setdefault((src, symbol), set()).add(dst)
        if symbol is not EPSILON:
            self.alphabet.add(symbol)

    def symbol(self, ch):
        s, a = self.new_state(), self.new_state()
        self.add_edge(s, ch, a)
        return (s, a)

    def concat(self, left, right):
        self.add_edge(left[1], EPSILON, right[0])
        return (left[0], right[1])

    def union(self, left, right):
        s, a = self.new_state(), self.new_state()
        self.add_edge(s, EPSILON, left[0])
        self.add_edge(s, EPSILON, right[0])
        self.add_edge(left[1], EPSILON, a)
        self.add_edge(right[1], EPSILON, a)
        return (s, a)

    def star(self, inner):
        s, a = self.new_state(), self.new_state()
        self.add_edge(s, EPSILON, inner[0])
        self.add_edge(s, EPSILON, a)
        self.add_edge(inner[1], EPSILON, inner[0])
        self.add_edge(inner[1], EPSILON, a)
        return (s, a)


def parse_regex(pattern: str, b: NfaBuilder):
    pos = 0

    def peek():
        return pattern[pos] if pos < len(pattern) else None

    def expr():
        nonlocal pos
        left = term()
        while peek() == "|":
            pos += 1
            left = b.union(left, term())
        return left

    def term():
        nonlocal pos
        left = factor()
        while peek() is not None and peek() not in ("|", ")"):
            left = b.concat(left, factor())
        return left

    def factor():
        nonlocal pos
        atom_ = atom()
        while peek() == "*":
            pos += 1
            atom_ = b.star(atom_)
        return atom_

    def atom():
        nonlocal pos
        if peek() == "(":
            pos += 1
            e = expr()
            pos += 1
            return e
        ch = pattern[pos]
        pos += 1
        return b.symbol(ch)

    return expr()


def epsilon_closure(states: set[int], transitions: dict) -> frozenset[int]:
    stack = list(states)
    closure = set(states)
    while stack:
        s = stack.pop()
        for nxt in transitions.get((s, EPSILON), ()):
            if nxt not in closure:
                closure.add(nxt)
                stack.append(nxt)
    return frozenset(closure)


def subset_construction(nfa_start: int, nfa_accept: int, transitions: dict, alphabet: set[str]):
    """NFAの状態集合(ε閉包)をDFAの1状態とみなして、機械的にDFAへ変換する"""
    start = epsilon_closure({nfa_start}, transitions)
    states: list[frozenset[int]] = [start]
    state_index = {start: 0}
    dfa_transitions: dict[tuple[int, str], int] = {}
    unprocessed = [start]

    while unprocessed:
        current = unprocessed.pop()
        current_idx = state_index[current]
        for symbol in alphabet:
            move: set[int] = set()
            for s in current:
                move |= transitions.get((s, symbol), set())
            if not move:
                continue
            next_state = epsilon_closure(move, transitions)
            if next_state not in state_index:
                state_index[next_state] = len(states)
                states.append(next_state)
                unprocessed.append(next_state)
            dfa_transitions[(current_idx, symbol)] = state_index[next_state]

    accepting = {i for i, s in enumerate(states) if nfa_accept in s}
    return states, dfa_transitions, accepting


def dfa_accepts(dfa_transitions: dict, accepting: set[int], text: str) -> bool:
    current = 0  # 開始状態は常にインデックス0
    for ch in text:
        if (current, ch) not in dfa_transitions:
            return False
        current = dfa_transitions[(current, ch)]
    return current in accepting
```

```typescript
const EPSILON = "\0";

type Frag = { start: number; accept: number };

class NfaBuilder {
  nextState = 0;
  transitions = new Map<string, Set<number>>();
  alphabet = new Set<string>();

  newState(): number {
    return this.nextState++;
  }
  addEdge(src: number, symbol: string, dst: number): void {
    const k = `${src}:${symbol}`;
    if (!this.transitions.has(k)) this.transitions.set(k, new Set());
    this.transitions.get(k)!.add(dst);
    if (symbol !== EPSILON) this.alphabet.add(symbol);
  }
  buildSymbol(ch: string): Frag {
    const s = this.newState();
    const a = this.newState();
    this.addEdge(s, ch, a);
    return { start: s, accept: a };
  }
  buildConcat(left: Frag, right: Frag): Frag {
    this.addEdge(left.accept, EPSILON, right.start);
    return { start: left.start, accept: right.accept };
  }
  buildUnion(left: Frag, right: Frag): Frag {
    const s = this.newState();
    const a = this.newState();
    this.addEdge(s, EPSILON, left.start);
    this.addEdge(s, EPSILON, right.start);
    this.addEdge(left.accept, EPSILON, a);
    this.addEdge(right.accept, EPSILON, a);
    return { start: s, accept: a };
  }
  buildStar(inner: Frag): Frag {
    const s = this.newState();
    const a = this.newState();
    this.addEdge(s, EPSILON, inner.start);
    this.addEdge(s, EPSILON, a);
    this.addEdge(inner.accept, EPSILON, inner.start);
    this.addEdge(inner.accept, EPSILON, a);
    return { start: s, accept: a };
  }
}

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
      pos++;
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

function setKey(s: Set<number>): string {
  return [...s].sort((a, b) => a - b).join(",");
}

type Dfa = { states: Set<number>[]; transitions: Map<string, number>; accepting: Set<number> };

// NFAの状態集合(ε閉包)をDFAの1状態とみなして、機械的にDFAへ変換する
function subsetConstruction(nfaStart: number, nfaAccept: number, nfaTransitions: Map<string, Set<number>>, alphabet: Set<string>): Dfa {
  const start = epsilonClosure(new Set([nfaStart]), nfaTransitions);
  const states: Set<number>[] = [start];
  const stateIndex = new Map<string, number>([[setKey(start), 0]]);
  const transitions = new Map<string, number>();
  const unprocessed: Set<number>[] = [start];

  while (unprocessed.length > 0) {
    const current = unprocessed.pop()!;
    const currentIdx = stateIndex.get(setKey(current))!;
    for (const symbol of alphabet) {
      const move = new Set<number>();
      for (const s of current) {
        const targets = nfaTransitions.get(`${s}:${symbol}`);
        if (targets) for (const t of targets) move.add(t);
      }
      if (move.size === 0) continue;
      const next = epsilonClosure(move, nfaTransitions);
      const nk = setKey(next);
      if (!stateIndex.has(nk)) {
        stateIndex.set(nk, states.length);
        states.push(next);
        unprocessed.push(next);
      }
      transitions.set(`${currentIdx}:${symbol}`, stateIndex.get(nk)!);
    }
  }

  const accepting = new Set<number>();
  states.forEach((s, i) => {
    if (s.has(nfaAccept)) accepting.add(i);
  });

  return { states, transitions, accepting };
}

function dfaAccepts(dfa: Dfa, text: string): boolean {
  let current = 0; // 開始状態は常にインデックス0
  for (const ch of text) {
    const k = `${current}:${ch}`;
    if (!dfa.transitions.has(k)) return false;
    current = dfa.transitions.get(k)!;
  }
  return dfa.accepting.has(current);
}
```

```cpp
#include <string>
#include <map>
#include <set>
#include <vector>
#include <optional>
#include <functional>

constexpr char EPSILON = '\0';

struct NfaBuilder {
    int nextState = 0;
    std::map<std::pair<int, char>, std::set<int>> transitions;
    std::set<char> alphabet;

    int newState() { return nextState++; }

    void addEdge(int src, char symbol, int dst) {
        transitions[{src, symbol}].insert(dst);
        if (symbol != EPSILON) alphabet.insert(symbol);
    }

    std::pair<int, int> buildSymbol(char ch) {
        int s = newState(), a = newState();
        addEdge(s, ch, a);
        return {s, a};
    }
    std::pair<int, int> buildConcat(std::pair<int, int> left, std::pair<int, int> right) {
        addEdge(left.second, EPSILON, right.first);
        return {left.first, right.second};
    }
    std::pair<int, int> buildUnion(std::pair<int, int> left, std::pair<int, int> right) {
        int s = newState(), a = newState();
        addEdge(s, EPSILON, left.first);
        addEdge(s, EPSILON, right.first);
        addEdge(left.second, EPSILON, a);
        addEdge(right.second, EPSILON, a);
        return {s, a};
    }
    std::pair<int, int> buildStar(std::pair<int, int> inner) {
        int s = newState(), a = newState();
        addEdge(s, EPSILON, inner.first);
        addEdge(s, EPSILON, a);
        addEdge(inner.second, EPSILON, inner.first);
        addEdge(inner.second, EPSILON, a);
        return {s, a};
    }
};

std::pair<int, int> parseRegex(const std::string& pattern, NfaBuilder& b) {
    size_t pos = 0;
    std::function<std::pair<int, int>()> expr, term, factor, atomFn;
    auto peek = [&]() -> std::optional<char> {
        return pos < pattern.size() ? std::optional<char>(pattern[pos]) : std::nullopt;
    };
    atomFn = [&]() -> std::pair<int, int> {
        if (peek() == '(') { pos++; auto e = expr(); pos++; return e; }
        char ch = pattern[pos]; pos++;
        return b.buildSymbol(ch);
    };
    factor = [&]() -> std::pair<int, int> {
        auto a = atomFn();
        while (peek() == '*') { pos++; a = b.buildStar(a); }
        return a;
    };
    term = [&]() -> std::pair<int, int> {
        auto left = factor();
        while (peek().has_value() && peek() != '|' && peek() != ')') left = b.buildConcat(left, factor());
        return left;
    };
    expr = [&]() -> std::pair<int, int> {
        auto left = term();
        while (peek() == '|') { pos++; left = b.buildUnion(left, term()); }
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
            for (int n : it->second) if (closure.insert(n).second) stack.push_back(n);
        }
    }
    return closure;
}

struct Dfa {
    std::vector<std::set<int>> states;
    std::map<std::pair<int, char>, int> transitions;
    std::set<int> accepting;
};

// NFAの状態集合(ε閉包)をDFAの1状態とみなして、機械的にDFAへ変換する
Dfa subsetConstruction(int nfaStart, int nfaAccept, const std::map<std::pair<int, char>, std::set<int>>& nfaTransitions, const std::set<char>& alphabet) {
    Dfa dfa;
    auto start = epsilonClosure({nfaStart}, nfaTransitions);
    dfa.states.push_back(start);
    std::map<std::set<int>, int> stateIndex{{start, 0}};
    std::vector<std::set<int>> unprocessed{start};

    while (!unprocessed.empty()) {
        auto current = unprocessed.back();
        unprocessed.pop_back();
        int currentIdx = stateIndex[current];
        for (char symbol : alphabet) {
            std::set<int> move;
            for (int s : current) {
                auto it = nfaTransitions.find({s, symbol});
                if (it != nfaTransitions.end()) move.insert(it->second.begin(), it->second.end());
            }
            if (move.empty()) continue;
            auto next = epsilonClosure(move, nfaTransitions);
            if (!stateIndex.count(next)) {
                stateIndex[next] = static_cast<int>(dfa.states.size());
                dfa.states.push_back(next);
                unprocessed.push_back(next);
            }
            dfa.transitions[{currentIdx, symbol}] = stateIndex[next];
        }
    }

    for (size_t i = 0; i < dfa.states.size(); i++) {
        if (dfa.states[i].count(nfaAccept)) dfa.accepting.insert(static_cast<int>(i));
    }
    return dfa;
}

bool dfaAccepts(const Dfa& dfa, const std::string& text) {
    int current = 0;
    for (char ch : text) {
        auto it = dfa.transitions.find({current, ch});
        if (it == dfa.transitions.end()) return false;
        current = it->second;
    }
    return dfa.accepting.count(current) > 0;
}
```

```rust
use std::collections::{BTreeSet, HashMap};

const EPSILON: char = '\0';

#[derive(Default)]
struct NfaBuilder {
    next_state: usize,
    transitions: HashMap<(usize, char), BTreeSet<usize>>,
    alphabet: BTreeSet<char>,
}

impl NfaBuilder {
    fn new_state(&mut self) -> usize {
        let s = self.next_state;
        self.next_state += 1;
        s
    }
    fn add_edge(&mut self, src: usize, symbol: char, dst: usize) {
        self.transitions.entry((src, symbol)).or_default().insert(dst);
        if symbol != EPSILON {
            self.alphabet.insert(symbol);
        }
    }
    fn build_symbol(&mut self, ch: char) -> (usize, usize) {
        let (s, a) = (self.new_state(), self.new_state());
        self.add_edge(s, ch, a);
        (s, a)
    }
    fn build_concat(&mut self, left: (usize, usize), right: (usize, usize)) -> (usize, usize) {
        self.add_edge(left.1, EPSILON, right.0);
        (left.0, right.1)
    }
    fn build_union(&mut self, left: (usize, usize), right: (usize, usize)) -> (usize, usize) {
        let (s, a) = (self.new_state(), self.new_state());
        self.add_edge(s, EPSILON, left.0);
        self.add_edge(s, EPSILON, right.0);
        self.add_edge(left.1, EPSILON, a);
        self.add_edge(right.1, EPSILON, a);
        (s, a)
    }
    fn build_star(&mut self, inner: (usize, usize)) -> (usize, usize) {
        let (s, a) = (self.new_state(), self.new_state());
        self.add_edge(s, EPSILON, inner.0);
        self.add_edge(s, EPSILON, a);
        self.add_edge(inner.1, EPSILON, inner.0);
        self.add_edge(inner.1, EPSILON, a);
        (s, a)
    }
}

struct RegexParser<'a> {
    pattern: &'a [char],
    pos: usize,
    builder: NfaBuilder,
}

impl<'a> RegexParser<'a> {
    fn peek(&self) -> Option<char> {
        self.pattern.get(self.pos).copied()
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
            self.pos += 1;
            return e;
        }
        let ch = self.pattern[self.pos];
        self.pos += 1;
        self.builder.build_symbol(ch)
    }
}

fn epsilon_closure(states: &BTreeSet<usize>, transitions: &HashMap<(usize, char), BTreeSet<usize>>) -> BTreeSet<usize> {
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

struct Dfa {
    num_states: usize,
    transitions: HashMap<(usize, char), usize>,
    accepting: BTreeSet<usize>,
}

// NFAの状態集合(ε閉包)をDFAの1状態とみなして、機械的にDFAへ変換する
fn subset_construction(nfa_start: usize, nfa_accept: usize, nfa_transitions: &HashMap<(usize, char), BTreeSet<usize>>, alphabet: &BTreeSet<char>) -> Dfa {
    let start = epsilon_closure(&BTreeSet::from([nfa_start]), nfa_transitions);
    let mut states: Vec<BTreeSet<usize>> = vec![start.clone()];
    let mut state_index: HashMap<BTreeSet<usize>, usize> = HashMap::from([(start.clone(), 0)]);
    let mut transitions: HashMap<(usize, char), usize> = HashMap::new();
    let mut unprocessed = vec![start];

    while let Some(current) = unprocessed.pop() {
        let current_idx = state_index[&current];
        for &symbol in alphabet {
            let mut mv = BTreeSet::new();
            for &s in &current {
                if let Some(targets) = nfa_transitions.get(&(s, symbol)) {
                    mv.extend(targets);
                }
            }
            if mv.is_empty() {
                continue;
            }
            let next = epsilon_closure(&mv, nfa_transitions);
            let idx = *state_index.entry(next.clone()).or_insert_with(|| {
                states.push(next.clone());
                unprocessed.push(next.clone());
                states.len() - 1
            });
            transitions.insert((current_idx, symbol), idx);
        }
    }

    let accepting = states
        .iter()
        .enumerate()
        .filter(|(_, s)| s.contains(&nfa_accept))
        .map(|(i, _)| i)
        .collect();

    Dfa { num_states: states.len(), transitions, accepting }
}

fn dfa_accepts(dfa: &Dfa, text: &str) -> bool {
    let mut current = 0usize; // 開始状態は常にインデックス0
    for ch in text.chars() {
        match dfa.transitions.get(&(current, ch)) {
            Some(&next) => current = next,
            None => return false,
        }
    }
    dfa.accepting.contains(&current)
}
```

```csharp
class NfaBuilder
{
    public const char Epsilon = '\0';
    public int NextState = 0;
    public Dictionary<(int, char), HashSet<int>> Transitions = new();
    public HashSet<char> Alphabet = new();

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
        if (symbol != Epsilon) Alphabet.Add(symbol);
    }

    public (int start, int accept) BuildSymbol(char ch)
    {
        int s = NewState(), a = NewState();
        AddEdge(s, ch, a);
        return (s, a);
    }
    public (int start, int accept) BuildConcat((int start, int accept) left, (int start, int accept) right)
    {
        AddEdge(left.accept, Epsilon, right.start);
        return (left.start, right.accept);
    }
    public (int start, int accept) BuildUnion((int start, int accept) left, (int start, int accept) right)
    {
        int s = NewState(), a = NewState();
        AddEdge(s, Epsilon, left.start);
        AddEdge(s, Epsilon, right.start);
        AddEdge(left.accept, Epsilon, a);
        AddEdge(right.accept, Epsilon, a);
        return (s, a);
    }
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

static class RegexParser
{
    public static (int start, int accept) Parse(string pattern, NfaBuilder b)
    {
        int pos = 0;
        char? Peek() => pos < pattern.Length ? pattern[pos] : (char?)null;

        (int, int) Expr()
        {
            var left = Term();
            while (Peek() == '|') { pos++; left = b.BuildUnion(left, Term()); }
            return left;
        }
        (int, int) Term()
        {
            var left = Factor();
            while (Peek() != null && Peek() != '|' && Peek() != ')') left = b.BuildConcat(left, Factor());
            return left;
        }
        (int, int) Factor()
        {
            var a = Atom();
            while (Peek() == '*') { pos++; a = b.BuildStar(a); }
            return a;
        }
        (int, int) Atom()
        {
            if (Peek() == '(') { pos++; var e = Expr(); pos++; return e; }
            char ch = pattern[pos]; pos++;
            return b.BuildSymbol(ch);
        }

        return Expr();
    }
}

class Dfa
{
    public List<HashSet<int>> States = new();
    public Dictionary<(int, char), int> Transitions = new();
    public HashSet<int> Accepting = new();
}

static class SubsetConstruction
{
    static HashSet<int> EpsilonClosure(HashSet<int> states, Dictionary<(int, char), HashSet<int>> transitions)
    {
        var stack = new Stack<int>(states);
        var closure = new HashSet<int>(states);
        while (stack.Count > 0)
        {
            int s = stack.Pop();
            if (transitions.TryGetValue((s, NfaBuilder.Epsilon), out var next))
                foreach (var n in next) if (closure.Add(n)) stack.Push(n);
        }
        return closure;
    }

    static string SetKey(HashSet<int> s) => string.Join(",", s.OrderBy(x => x));

    // NFAの状態集合(ε閉包)をDFAの1状態とみなして、機械的にDFAへ変換する
    public static Dfa Build(int nfaStart, int nfaAccept, Dictionary<(int, char), HashSet<int>> nfaTransitions, HashSet<char> alphabet)
    {
        var start = EpsilonClosure(new HashSet<int> { nfaStart }, nfaTransitions);
        var states = new List<HashSet<int>> { start };
        var stateIndex = new Dictionary<string, int> { [SetKey(start)] = 0 };
        var transitions = new Dictionary<(int, char), int>();
        var unprocessed = new Stack<HashSet<int>>();
        unprocessed.Push(start);

        while (unprocessed.Count > 0)
        {
            var current = unprocessed.Pop();
            int currentIdx = stateIndex[SetKey(current)];
            foreach (var symbol in alphabet)
            {
                var move = new HashSet<int>();
                foreach (var s in current)
                    if (nfaTransitions.TryGetValue((s, symbol), out var targets))
                        foreach (var t in targets) move.Add(t);
                if (move.Count == 0) continue;
                var next = EpsilonClosure(move, nfaTransitions);
                var nk = SetKey(next);
                if (!stateIndex.TryGetValue(nk, out var idx))
                {
                    idx = states.Count;
                    stateIndex[nk] = idx;
                    states.Add(next);
                    unprocessed.Push(next);
                }
                transitions[(currentIdx, symbol)] = idx;
            }
        }

        var accepting = new HashSet<int>();
        for (int i = 0; i < states.Count; i++)
            if (states[i].Contains(nfaAccept)) accepting.Add(i);

        return new Dfa { States = states, Transitions = transitions, Accepting = accepting };
    }

    public static bool Accepts(Dfa dfa, string text)
    {
        int current = 0; // 開始状態は常にインデックス0
        foreach (var ch in text)
        {
            if (!dfa.Transitions.TryGetValue((current, ch), out current)) return false;
        }
        return dfa.Accepting.Contains(current);
    }
}
```
