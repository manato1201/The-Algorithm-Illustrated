---
name: LL(1)構文解析
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: O(n)(nはトークン数)
summary: 次のトークン1つだけを先読みして適用すべき文法規則を一意に決定できる、表駆動型のトップダウン構文解析法。
---

## 概要

[再帰下降構文解析](/algorithms/recursive-descent-parsing)は文法規則を関数として手書きするが、この判断のロジックを自動的に生成できないか、という発想から生まれたのがLL(1)構文解析である。「Left-to-right(左から右に入力を読む)、Leftmost derivation(最左導出)、1トークンの先読み」の頭文字を取ったこの名前が示す通り、入力を左から右へ読み進めながら、次のトークンをたった1つ先読みするだけで、今どの文法規則を適用すべきかが一意に決まる文法(LL(1)文法)に対して、解析表(パーステーブル)を使って機械的に構文解析を行う。

## 仕組み

1. 文法の各非終端記号について、**FIRST集合**(その非終端記号から導出される文字列の先頭に来うる終端記号の集合)と**FOLLOW集合**(その非終端記号の直後に来うる終端記号の集合)を、文法規則から機械的に計算する
2. FIRST集合とFOLLOW集合を使って、「非終端記号`A`が現在の入力トークン`a`を見ているとき、どの規則`A → α`を適用すべきか」を表す**LL(1)解析表**を構築する。同じマス目に2つ以上の規則の候補が入ってしまう場合、その文法はLL(1)文法ではない(曖昧、または先読み1つでは決定できない)ことになる
3. 解析時には、非終端記号を積んだスタックを1つ用意し(トップに開始記号を置く)、入力トークンとスタックのトップを見比べながら進める
4. スタックのトップが非終端記号`A`で入力トークンが`a`なら、解析表`table[A][a]`を引いて適用すべき規則`A → α`を取得し、`A`をポップして`α`の記号列を(逆順で)スタックにプッシュする
5. スタックのトップが終端記号で、それが現在の入力トークンと一致するなら、両方を「消費」して次のトークンへ進む。スタックが空になり入力もすべて消費し終えたら解析成功

## 特性・トレードオフ

- **計算量**: 各トークンに対して解析表の参照とスタック操作が定数時間で行われるため、全体で`O(n)`。表さえ作ってしまえば非常に高速に動作する
- **左再帰・共通接頭辞の除去が必要**: LL(1)文法として解析表を矛盾なく構築するには、文法があらかじめ左再帰を含まず、また異なる規則同士が同じ接頭辞から始まらない(左因子化されている)必要がある——文法の書き換えという事前準備のコストが発生する
- **[LR(0)構文解析](/algorithms/lr0-parsing)との対比**: LL(1)はトップダウン(開始記号から出発し、規則を適用しながら入力に合わせて木を下に広げていく)、[LR(0)構文解析](/algorithms/lr0-parsing)はボトムアップ(入力トークンから出発し、規則の右辺を認識するたびに左辺にまとめて木を上に組み立てていく)という対照的なアプローチを取る。LR系の方が扱える文法のクラスが広い(より多くのプログラミング言語の文法を直接扱える)が、LL(1)は解析表がより直感的で、手書きの[再帰下降構文解析](/algorithms/recursive-descent-parsing)への機械的変換もしやすい
- **使いどころ**: パーサジェネレータ(ANTLR等)によるコンパイラフロントエンドの自動生成、文法の曖昧性チェック(FIRST/FOLLOW集合の計算そのものが文法設計のデバッグに役立つ)、教育用のコンパイラ構成論における構文解析の基礎理論

## 実装例

古典的な算術式文法(`E -> T E'`, `E' -> + T E' | ε`, `T -> F T'`, `T' -> * F T' | ε`, `F -> ( E ) | id`)に対して、FIRST/FOLLOW集合を計算し、解析表を構築してスタックベースで構文解析する。

```python
EPSILON = "ε"
END = "$"

GRAMMAR = {
    "E": [["T", "E'"]],
    "E'": [["+", "T", "E'"], [EPSILON]],
    "T": [["F", "T'"]],
    "T'": [["*", "F", "T'"], [EPSILON]],
    "F": [["(", "E", ")"], ["id"]],
}
START_SYMBOL = "E"
NONTERMINALS = set(GRAMMAR.keys())


def is_terminal(sym: str) -> bool:
    return sym not in NONTERMINALS and sym != EPSILON


def compute_first_sets(grammar):
    first = {nt: set() for nt in grammar}
    changed = True
    while changed:
        changed = False
        for nt, productions in grammar.items():
            for prod in productions:
                nullable_prefix = True
                for sym in prod:
                    if sym == EPSILON:
                        if EPSILON not in first[nt]:
                            first[nt].add(EPSILON); changed = True
                        nullable_prefix = False
                        break
                    if is_terminal(sym):
                        if sym not in first[nt]:
                            first[nt].add(sym); changed = True
                        nullable_prefix = False
                        break
                    before = len(first[nt])
                    first[nt] |= (first[sym] - {EPSILON})
                    if len(first[nt]) != before:
                        changed = True
                    if EPSILON not in first[sym]:
                        nullable_prefix = False
                        break
                if nullable_prefix and (not prod or prod[-1] != EPSILON):
                    if EPSILON not in first[nt]:
                        first[nt].add(EPSILON); changed = True
    return first


def first_of_sequence(seq, first):
    """記号列(生成規則の右辺の一部)のFIRST集合を計算する。"""
    result = set()
    nullable = True
    for sym in seq:
        if sym == EPSILON:
            result.add(EPSILON); break
        if is_terminal(sym):
            result.add(sym); nullable = False; break
        result |= (first[sym] - {EPSILON})
        if EPSILON not in first[sym]:
            nullable = False; break
    if nullable:
        result.add(EPSILON)
    return result


def compute_follow_sets(grammar, first, start_symbol):
    follow = {nt: set() for nt in grammar}
    follow[start_symbol].add(END)
    changed = True
    while changed:
        changed = False
        for nt, productions in grammar.items():
            for prod in productions:
                for i, sym in enumerate(prod):
                    if sym in NONTERMINALS:
                        rest = prod[i + 1:]
                        rest_first = first_of_sequence(rest, first) if rest else {EPSILON}
                        before = len(follow[sym])
                        follow[sym] |= (rest_first - {EPSILON})
                        if EPSILON in rest_first:
                            follow[sym] |= follow[nt]
                        if len(follow[sym]) != before:
                            changed = True
    return follow


def build_parse_table(grammar, first, follow):
    """FIRST/FOLLOW集合からLL(1)解析表(非終端記号, 先読みトークン) -> 生成規則 を構築する。"""
    table = {}
    for nt, productions in grammar.items():
        for prod in productions:
            prod_first = first_of_sequence(prod, first)
            for terminal in prod_first - {EPSILON}:
                key = (nt, terminal)
                if key in table:
                    raise ValueError(f"文法はLL(1)ではない(FIRST/FIRST競合): {key}")
                table[key] = prod
            if EPSILON in prod_first:
                for terminal in follow[nt]:
                    key = (nt, terminal)
                    if key in table:
                        raise ValueError(f"文法はLL(1)ではない(FIRST/FOLLOW競合): {key}")
                    table[key] = prod
    return table


def parse(tokens, table, start_symbol) -> bool:
    """スタックベースの表駆動型LL(1)構文解析。受理すればTrue。"""
    stack = [END, start_symbol]
    tokens = tokens + [END]
    pos = 0
    while stack:
        top = stack.pop()
        cur = tokens[pos]
        if top == END:
            return pos == len(tokens) - 1
        if is_terminal(top):
            if top != cur:
                return False
            pos += 1
        else:
            key = (top, cur)
            if key not in table:
                return False
            prod = table[key]
            if prod != [EPSILON]:
                for sym in reversed(prod):
                    stack.append(sym)
    return pos == len(tokens)
```

```typescript
const EPSILON = "ε";
const END = "$";

const GRAMMAR: Record<string, string[][]> = {
  E: [["T", "E'"]],
  "E'": [["+", "T", "E'"], [EPSILON]],
  T: [["F", "T'"]],
  "T'": [["*", "F", "T'"], [EPSILON]],
  F: [["(", "E", ")"], ["id"]],
};
const START_SYMBOL = "E";
const NONTERMINALS = new Set(Object.keys(GRAMMAR));

function isTerminal(sym: string): boolean {
  return !NONTERMINALS.has(sym) && sym !== EPSILON;
}

function computeFirstSets(grammar: Record<string, string[][]>): Record<string, Set<string>> {
  const first: Record<string, Set<string>> = {};
  for (const nt of Object.keys(grammar)) first[nt] = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [nt, productions] of Object.entries(grammar)) {
      for (const prod of productions) {
        let nullablePrefix = true;
        for (const sym of prod) {
          if (sym === EPSILON) {
            if (!first[nt].has(EPSILON)) { first[nt].add(EPSILON); changed = true; }
            nullablePrefix = false;
            break;
          }
          if (isTerminal(sym)) {
            if (!first[nt].has(sym)) { first[nt].add(sym); changed = true; }
            nullablePrefix = false;
            break;
          }
          const before = first[nt].size;
          for (const s of first[sym]) if (s !== EPSILON) first[nt].add(s);
          if (first[nt].size !== before) changed = true;
          if (!first[sym].has(EPSILON)) { nullablePrefix = false; break; }
        }
        if (nullablePrefix && (prod.length === 0 || prod[prod.length - 1] !== EPSILON)) {
          if (!first[nt].has(EPSILON)) { first[nt].add(EPSILON); changed = true; }
        }
      }
    }
  }
  return first;
}

// 記号列(生成規則の右辺の一部)のFIRST集合を計算する
function firstOfSequence(seq: string[], first: Record<string, Set<string>>): Set<string> {
  const result = new Set<string>();
  let nullable = true;
  for (const sym of seq) {
    if (sym === EPSILON) { result.add(EPSILON); break; }
    if (isTerminal(sym)) { result.add(sym); nullable = false; break; }
    for (const s of first[sym]) if (s !== EPSILON) result.add(s);
    if (!first[sym].has(EPSILON)) { nullable = false; break; }
  }
  if (nullable) result.add(EPSILON);
  return result;
}

function computeFollowSets(
  grammar: Record<string, string[][]>,
  first: Record<string, Set<string>>,
  startSymbol: string
): Record<string, Set<string>> {
  const follow: Record<string, Set<string>> = {};
  for (const nt of Object.keys(grammar)) follow[nt] = new Set();
  follow[startSymbol].add(END);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [nt, productions] of Object.entries(grammar)) {
      for (const prod of productions) {
        for (let i = 0; i < prod.length; i++) {
          const sym = prod[i];
          if (!NONTERMINALS.has(sym)) continue;
          const rest = prod.slice(i + 1);
          const restFirst = rest.length > 0 ? firstOfSequence(rest, first) : new Set([EPSILON]);
          const before = follow[sym].size;
          for (const s of restFirst) if (s !== EPSILON) follow[sym].add(s);
          if (restFirst.has(EPSILON)) for (const s of follow[nt]) follow[sym].add(s);
          if (follow[sym].size !== before) changed = true;
        }
      }
    }
  }
  return follow;
}

type ParseTable = Map<string, string[]>;

// FIRST/FOLLOW集合からLL(1)解析表(非終端記号, 先読みトークン) -> 生成規則 を構築する
function buildParseTable(
  grammar: Record<string, string[][]>,
  first: Record<string, Set<string>>,
  follow: Record<string, Set<string>>
): ParseTable {
  const table: ParseTable = new Map();
  for (const [nt, productions] of Object.entries(grammar)) {
    for (const prod of productions) {
      const prodFirst = firstOfSequence(prod, first);
      for (const terminal of prodFirst) {
        if (terminal === EPSILON) continue;
        const key = `${nt},${terminal}`;
        if (table.has(key)) throw new Error(`文法はLL(1)ではない(FIRST/FIRST競合): ${key}`);
        table.set(key, prod);
      }
      if (prodFirst.has(EPSILON)) {
        for (const terminal of follow[nt]) {
          const key = `${nt},${terminal}`;
          if (table.has(key)) throw new Error(`文法はLL(1)ではない(FIRST/FOLLOW競合): ${key}`);
          table.set(key, prod);
        }
      }
    }
  }
  return table;
}

// スタックベースの表駆動型LL(1)構文解析。受理すればtrue
function parse(tokens: string[], table: ParseTable, startSymbol: string): boolean {
  const stack: string[] = [END, startSymbol];
  const input = [...tokens, END];
  let pos = 0;
  while (stack.length > 0) {
    const top = stack.pop()!;
    const cur = input[pos];
    if (top === END) return pos === input.length - 1;
    if (isTerminal(top)) {
      if (top !== cur) return false;
      pos++;
    } else {
      const key = `${top},${cur}`;
      if (!table.has(key)) return false;
      const prod = table.get(key)!;
      if (!(prod.length === 1 && prod[0] === EPSILON)) {
        for (let i = prod.length - 1; i >= 0; i--) stack.push(prod[i]);
      }
    }
  }
  return pos === input.length;
}
```

```cpp
#include <string>
#include <vector>
#include <map>
#include <set>
#include <stdexcept>

const std::string EPSILON = "e"; // 表示上はεだがASCII文字列として扱う
const std::string END = "$";

using Production = std::vector<std::string>;
using Grammar = std::map<std::string, std::vector<Production>>;

bool isTerminal(const std::string& sym, const std::set<std::string>& nonterminals) {
    return !nonterminals.count(sym) && sym != EPSILON;
}

std::map<std::string, std::set<std::string>> computeFirstSets(const Grammar& grammar, const std::set<std::string>& nonterminals) {
    std::map<std::string, std::set<std::string>> first;
    for (auto& [nt, _] : grammar) first[nt] = {};
    bool changed = true;
    while (changed) {
        changed = false;
        for (auto& [nt, productions] : grammar) {
            for (auto& prod : productions) {
                bool nullablePrefix = true;
                for (auto& sym : prod) {
                    if (sym == EPSILON) {
                        if (!first[nt].count(EPSILON)) { first[nt].insert(EPSILON); changed = true; }
                        nullablePrefix = false;
                        break;
                    }
                    if (isTerminal(sym, nonterminals)) {
                        if (!first[nt].count(sym)) { first[nt].insert(sym); changed = true; }
                        nullablePrefix = false;
                        break;
                    }
                    size_t before = first[nt].size();
                    for (auto& s : first[sym]) if (s != EPSILON) first[nt].insert(s);
                    if (first[nt].size() != before) changed = true;
                    if (!first[sym].count(EPSILON)) { nullablePrefix = false; break; }
                }
                if (nullablePrefix && (prod.empty() || prod.back() != EPSILON)) {
                    if (!first[nt].count(EPSILON)) { first[nt].insert(EPSILON); changed = true; }
                }
            }
        }
    }
    return first;
}

// 記号列(生成規則の右辺の一部)のFIRST集合を計算する
std::set<std::string> firstOfSequence(const Production& seq, const std::map<std::string, std::set<std::string>>& first,
                                       const std::set<std::string>& nonterminals) {
    std::set<std::string> result;
    bool nullable = true;
    for (auto& sym : seq) {
        if (sym == EPSILON) { result.insert(EPSILON); nullable = false; break; }
        if (isTerminal(sym, nonterminals)) { result.insert(sym); nullable = false; break; }
        for (auto& s : first.at(sym)) if (s != EPSILON) result.insert(s);
        if (!first.at(sym).count(EPSILON)) { nullable = false; break; }
    }
    if (nullable) result.insert(EPSILON);
    return result;
}

std::map<std::string, std::set<std::string>> computeFollowSets(
    const Grammar& grammar, const std::map<std::string, std::set<std::string>>& first,
    const std::string& startSymbol, const std::set<std::string>& nonterminals) {
    std::map<std::string, std::set<std::string>> follow;
    for (auto& [nt, _] : grammar) follow[nt] = {};
    follow[startSymbol].insert(END);
    bool changed = true;
    while (changed) {
        changed = false;
        for (auto& [nt, productions] : grammar) {
            for (auto& prod : productions) {
                for (size_t i = 0; i < prod.size(); i++) {
                    const std::string& sym = prod[i];
                    if (!nonterminals.count(sym)) continue;
                    Production rest(prod.begin() + i + 1, prod.end());
                    std::set<std::string> restFirst = rest.empty()
                        ? std::set<std::string>{EPSILON}
                        : firstOfSequence(rest, first, nonterminals);
                    size_t before = follow[sym].size();
                    for (auto& s : restFirst) if (s != EPSILON) follow[sym].insert(s);
                    if (restFirst.count(EPSILON)) for (auto& s : follow[nt]) follow[sym].insert(s);
                    if (follow[sym].size() != before) changed = true;
                }
            }
        }
    }
    return follow;
}

using ParseTable = std::map<std::pair<std::string, std::string>, Production>;

// FIRST/FOLLOW集合からLL(1)解析表(非終端記号, 先読みトークン) -> 生成規則 を構築する
ParseTable buildParseTable(const Grammar& grammar, const std::map<std::string, std::set<std::string>>& first,
                            const std::map<std::string, std::set<std::string>>& follow,
                            const std::set<std::string>& nonterminals) {
    ParseTable table;
    for (auto& [nt, productions] : grammar) {
        for (auto& prod : productions) {
            auto prodFirst = firstOfSequence(prod, first, nonterminals);
            for (auto& terminal : prodFirst) {
                if (terminal == EPSILON) continue;
                auto key = std::make_pair(nt, terminal);
                if (table.count(key)) throw std::runtime_error("文法はLL(1)ではない(FIRST/FIRST競合)");
                table[key] = prod;
            }
            if (prodFirst.count(EPSILON)) {
                for (auto& terminal : follow.at(nt)) {
                    auto key = std::make_pair(nt, terminal);
                    if (table.count(key)) throw std::runtime_error("文法はLL(1)ではない(FIRST/FOLLOW競合)");
                    table[key] = prod;
                }
            }
        }
    }
    return table;
}

// スタックベースの表駆動型LL(1)構文解析。受理すればtrue
bool parseLL1(std::vector<std::string> tokens, const ParseTable& table, const std::string& startSymbol,
              const std::set<std::string>& nonterminals) {
    std::vector<std::string> stack = {END, startSymbol};
    tokens.push_back(END);
    size_t pos = 0;
    while (!stack.empty()) {
        std::string top = stack.back();
        stack.pop_back();
        const std::string& cur = tokens[pos];
        if (top == END) return pos == tokens.size() - 1;
        if (isTerminal(top, nonterminals)) {
            if (top != cur) return false;
            pos++;
        } else {
            auto key = std::make_pair(top, cur);
            auto it = table.find(key);
            if (it == table.end()) return false;
            const Production& prod = it->second;
            if (!(prod.size() == 1 && prod[0] == EPSILON)) {
                for (auto rit = prod.rbegin(); rit != prod.rend(); ++rit) stack.push_back(*rit);
            }
        }
    }
    return pos == tokens.size();
}
```

```rust
use std::collections::{HashMap, HashSet};

const EPSILON: &str = "e"; // 表示上はεだがASCII文字列として扱う
const END: &str = "$";

type Production = Vec<String>;
type Grammar = HashMap<String, Vec<Production>>;

fn is_terminal(sym: &str, nonterminals: &HashSet<String>) -> bool {
    !nonterminals.contains(sym) && sym != EPSILON
}

fn compute_first_sets(grammar: &Grammar, nonterminals: &HashSet<String>) -> HashMap<String, HashSet<String>> {
    let mut first: HashMap<String, HashSet<String>> = grammar.keys().map(|nt| (nt.clone(), HashSet::new())).collect();
    let mut changed = true;
    while changed {
        changed = false;
        for (nt, productions) in grammar {
            for prod in productions {
                let mut nullable_prefix = true;
                for sym in prod {
                    if sym == EPSILON {
                        changed |= first.get_mut(nt).unwrap().insert(EPSILON.to_string());
                        nullable_prefix = false;
                        break;
                    }
                    if is_terminal(sym, nonterminals) {
                        changed |= first.get_mut(nt).unwrap().insert(sym.clone());
                        nullable_prefix = false;
                        break;
                    }
                    let sym_first = first[sym].clone();
                    let before = first[nt].len();
                    for s in sym_first.iter().filter(|s| s.as_str() != EPSILON) {
                        first.get_mut(nt).unwrap().insert(s.clone());
                    }
                    if first[nt].len() != before {
                        changed = true;
                    }
                    if !sym_first.contains(EPSILON) {
                        nullable_prefix = false;
                        break;
                    }
                }
                if nullable_prefix && prod.last().map(|s| s.as_str()) != Some(EPSILON) {
                    changed |= first.get_mut(nt).unwrap().insert(EPSILON.to_string());
                }
            }
        }
    }
    first
}

// 記号列(生成規則の右辺の一部)のFIRST集合を計算する
fn first_of_sequence(seq: &[String], first: &HashMap<String, HashSet<String>>, nonterminals: &HashSet<String>) -> HashSet<String> {
    let mut result = HashSet::new();
    let mut nullable = true;
    for sym in seq {
        if sym == EPSILON {
            result.insert(EPSILON.to_string());
            nullable = false;
            break;
        }
        if is_terminal(sym, nonterminals) {
            result.insert(sym.clone());
            nullable = false;
            break;
        }
        for s in first[sym].iter().filter(|s| s.as_str() != EPSILON) {
            result.insert(s.clone());
        }
        if !first[sym].contains(EPSILON) {
            nullable = false;
            break;
        }
    }
    if nullable {
        result.insert(EPSILON.to_string());
    }
    result
}

fn compute_follow_sets(
    grammar: &Grammar,
    first: &HashMap<String, HashSet<String>>,
    start_symbol: &str,
    nonterminals: &HashSet<String>,
) -> HashMap<String, HashSet<String>> {
    let mut follow: HashMap<String, HashSet<String>> = grammar.keys().map(|nt| (nt.clone(), HashSet::new())).collect();
    follow.get_mut(start_symbol).unwrap().insert(END.to_string());
    let mut changed = true;
    while changed {
        changed = false;
        for (nt, productions) in grammar {
            for prod in productions {
                for i in 0..prod.len() {
                    let sym = &prod[i];
                    if !nonterminals.contains(sym) {
                        continue;
                    }
                    let rest = &prod[i + 1..];
                    let rest_first = if rest.is_empty() {
                        HashSet::from([EPSILON.to_string()])
                    } else {
                        first_of_sequence(rest, first, nonterminals)
                    };
                    let before = follow[sym].len();
                    for s in rest_first.iter().filter(|s| s.as_str() != EPSILON) {
                        follow.get_mut(sym).unwrap().insert(s.clone());
                    }
                    if rest_first.contains(EPSILON) {
                        let nt_follow: Vec<String> = follow[nt].iter().cloned().collect();
                        for s in nt_follow {
                            follow.get_mut(sym).unwrap().insert(s);
                        }
                    }
                    if follow[sym].len() != before {
                        changed = true;
                    }
                }
            }
        }
    }
    follow
}

type ParseTable = HashMap<(String, String), Production>;

// FIRST/FOLLOW集合からLL(1)解析表(非終端記号, 先読みトークン) -> 生成規則 を構築する
fn build_parse_table(
    grammar: &Grammar,
    first: &HashMap<String, HashSet<String>>,
    follow: &HashMap<String, HashSet<String>>,
    nonterminals: &HashSet<String>,
) -> ParseTable {
    let mut table: ParseTable = HashMap::new();
    for (nt, productions) in grammar {
        for prod in productions {
            let prod_first = first_of_sequence(prod, first, nonterminals);
            for terminal in prod_first.iter().filter(|t| t.as_str() != EPSILON) {
                let key = (nt.clone(), terminal.clone());
                assert!(!table.contains_key(&key), "文法はLL(1)ではない(FIRST/FIRST競合)");
                table.insert(key, prod.clone());
            }
            if prod_first.contains(EPSILON) {
                for terminal in &follow[nt] {
                    let key = (nt.clone(), terminal.clone());
                    assert!(!table.contains_key(&key), "文法はLL(1)ではない(FIRST/FOLLOW競合)");
                    table.insert(key, prod.clone());
                }
            }
        }
    }
    table
}

// スタックベースの表駆動型LL(1)構文解析。受理すればtrue
fn parse(tokens: &[String], table: &ParseTable, start_symbol: &str, nonterminals: &HashSet<String>) -> bool {
    let mut stack: Vec<String> = vec![END.to_string(), start_symbol.to_string()];
    let mut input = tokens.to_vec();
    input.push(END.to_string());
    let mut pos = 0usize;
    while let Some(top) = stack.pop() {
        let cur = &input[pos];
        if top == END {
            return pos == input.len() - 1;
        }
        if is_terminal(&top, nonterminals) {
            if &top != cur {
                return false;
            }
            pos += 1;
        } else {
            let key = (top.clone(), cur.clone());
            match table.get(&key) {
                None => return false,
                Some(prod) => {
                    if !(prod.len() == 1 && prod[0] == EPSILON) {
                        for sym in prod.iter().rev() {
                            stack.push(sym.clone());
                        }
                    }
                }
            }
        }
    }
    pos == input.len()
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

// FIRST集合・FOLLOW集合を計算し、LL(1)解析表を構築してスタックベースで構文解析するユーティリティ群
static class Ll1Parser
{
    const string Epsilon = "e"; // 表示上はεだがASCII文字列として扱う
    const string End = "$";

    public static bool IsTerminal(string sym, HashSet<string> nonterminals) =>
        !nonterminals.Contains(sym) && sym != Epsilon;

    public static Dictionary<string, HashSet<string>> ComputeFirstSets(
        Dictionary<string, List<List<string>>> grammar, HashSet<string> nonterminals)
    {
        var first = grammar.Keys.ToDictionary(nt => nt, _ => new HashSet<string>());
        bool changed = true;
        while (changed)
        {
            changed = false;
            foreach (var (nt, productions) in grammar)
            {
                foreach (var prod in productions)
                {
                    bool nullablePrefix = true;
                    foreach (var sym in prod)
                    {
                        if (sym == Epsilon)
                        {
                            if (first[nt].Add(Epsilon)) changed = true;
                            nullablePrefix = false;
                            break;
                        }
                        if (IsTerminal(sym, nonterminals))
                        {
                            if (first[nt].Add(sym)) changed = true;
                            nullablePrefix = false;
                            break;
                        }
                        int before = first[nt].Count;
                        foreach (var s in first[sym]) if (s != Epsilon) first[nt].Add(s);
                        if (first[nt].Count != before) changed = true;
                        if (!first[sym].Contains(Epsilon)) { nullablePrefix = false; break; }
                    }
                    if (nullablePrefix && (prod.Count == 0 || prod[^1] != Epsilon))
                        if (first[nt].Add(Epsilon)) changed = true;
                }
            }
        }
        return first;
    }

    // 記号列(生成規則の右辺の一部)のFIRST集合を計算する
    public static HashSet<string> FirstOfSequence(
        List<string> seq, Dictionary<string, HashSet<string>> first, HashSet<string> nonterminals)
    {
        var result = new HashSet<string>();
        bool nullable = true;
        foreach (var sym in seq)
        {
            if (sym == Epsilon) { result.Add(Epsilon); nullable = false; break; }
            if (IsTerminal(sym, nonterminals)) { result.Add(sym); nullable = false; break; }
            foreach (var s in first[sym]) if (s != Epsilon) result.Add(s);
            if (!first[sym].Contains(Epsilon)) { nullable = false; break; }
        }
        if (nullable) result.Add(Epsilon);
        return result;
    }

    public static Dictionary<string, HashSet<string>> ComputeFollowSets(
        Dictionary<string, List<List<string>>> grammar, Dictionary<string, HashSet<string>> first,
        string startSymbol, HashSet<string> nonterminals)
    {
        var follow = grammar.Keys.ToDictionary(nt => nt, _ => new HashSet<string>());
        follow[startSymbol].Add(End);
        bool changed = true;
        while (changed)
        {
            changed = false;
            foreach (var (nt, productions) in grammar)
            {
                foreach (var prod in productions)
                {
                    for (int i = 0; i < prod.Count; i++)
                    {
                        var sym = prod[i];
                        if (!nonterminals.Contains(sym)) continue;
                        var rest = prod.Skip(i + 1).ToList();
                        var restFirst = rest.Count > 0 ? FirstOfSequence(rest, first, nonterminals) : new HashSet<string> { Epsilon };
                        int before = follow[sym].Count;
                        foreach (var s in restFirst) if (s != Epsilon) follow[sym].Add(s);
                        if (restFirst.Contains(Epsilon)) foreach (var s in follow[nt]) follow[sym].Add(s);
                        if (follow[sym].Count != before) changed = true;
                    }
                }
            }
        }
        return follow;
    }

    // FIRST/FOLLOW集合からLL(1)解析表(非終端記号, 先読みトークン) -> 生成規則 を構築する
    public static Dictionary<(string, string), List<string>> BuildParseTable(
        Dictionary<string, List<List<string>>> grammar, Dictionary<string, HashSet<string>> first,
        Dictionary<string, HashSet<string>> follow, HashSet<string> nonterminals)
    {
        var table = new Dictionary<(string, string), List<string>>();
        foreach (var (nt, productions) in grammar)
        {
            foreach (var prod in productions)
            {
                var prodFirst = FirstOfSequence(prod, first, nonterminals);
                foreach (var terminal in prodFirst.Where(t => t != Epsilon))
                {
                    var key = (nt, terminal);
                    if (table.ContainsKey(key)) throw new InvalidOperationException("文法はLL(1)ではない(FIRST/FIRST競合)");
                    table[key] = prod;
                }
                if (prodFirst.Contains(Epsilon))
                {
                    foreach (var terminal in follow[nt])
                    {
                        var key = (nt, terminal);
                        if (table.ContainsKey(key)) throw new InvalidOperationException("文法はLL(1)ではない(FIRST/FOLLOW競合)");
                        table[key] = prod;
                    }
                }
            }
        }
        return table;
    }

    // スタックベースの表駆動型LL(1)構文解析。受理すればtrue
    public static bool Parse(List<string> tokens, Dictionary<(string, string), List<string>> table,
        string startSymbol, HashSet<string> nonterminals)
    {
        var stack = new Stack<string>();
        stack.Push(End);
        stack.Push(startSymbol);
        var input = new List<string>(tokens) { End };
        int pos = 0;
        while (stack.Count > 0)
        {
            var top = stack.Pop();
            var cur = input[pos];
            if (top == End) return pos == input.Count - 1;
            if (IsTerminal(top, nonterminals))
            {
                if (top != cur) return false;
                pos++;
            }
            else
            {
                var key = (top, cur);
                if (!table.TryGetValue(key, out var prod)) return false;
                if (!(prod.Count == 1 && prod[0] == Epsilon))
                    for (int i = prod.Count - 1; i >= 0; i--) stack.Push(prod[i]);
            }
        }
        return pos == input.Count;
    }
}
```
