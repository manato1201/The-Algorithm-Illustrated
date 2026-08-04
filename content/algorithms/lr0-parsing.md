---
name: LR(0)構文解析(Shift-Reduce構文解析)
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: O(n)(nはトークン数)
summary: 入力を読み進めながらスタック上のトークン列を文法規則の右辺と照合し、一致したら左辺にまとめる操作を繰り返す、ボトムアップ型の構文解析法。
---

## 概要

[LL(1)構文解析](/algorithms/ll1-parsing)は開始記号から文法規則を適用して構文木を下に広げていくトップダウン方式だが、LR構文解析はその逆、入力トークンの並びから出発し、文法規則の右辺のパターンが見つかるたびに対応する左辺の非終端記号へまとめていくボトムアップ方式を取る。「Left-to-right、Rightmost derivation(最右導出)」の頭文字からLRと呼ばれるこの方式は、LL系よりも扱える文法のクラスが広く(左再帰を含む一般的なプログラミング言語の文法をそのまま扱える)、yaccやBisonのようなパーサジェネレータの標準的な理論的基盤になっている。最も単純なLR(0)は先読みを一切使わない基本形で、ここから実用的なSLR・LALR・LR(1)へと発展していく。

## 仕組み

1. 解析中の状態(スタック)には、既に確定した記号(終端・非終端)の列を積んでいく。動作は基本的に**シフト**(次の入力トークンをスタックに積む)と**還元**(reduce、スタックの先頭が文法規則の右辺と一致したら、それらをポップして対応する左辺の非終端記号1つをプッシュする)の2種類の操作だけからなる
2. どのタイミングでシフトすべきか還元すべきかを判断するため、LR(0)オートマトンを構築する。これは「文法規則のどこまでを読み終えたか」を表す**アイテム**(例えば`E → E . + T`は「`E`の後に`.`の位置まで読み終え、次に`+ T`が来ることを期待している」ことを表す)を状態として持つ有限オートマトンで、[部分集合構成法](/algorithms/subset-construction)に近い手続きで機械的に構築できる
3. アイテム集合の中に「規則全体を読み終えた」アイテム(`.`が末尾にある)が含まれる状態では還元操作を行い、そうでなければ次の入力記号に応じてシフトする(この判断がLR(0)では先読みなしに、その状態のアイテム集合だけから決まる——ただし1つの状態にシフトと還元の両方の候補がある場合(シフト・還元競合)や、複数の還元候補がある場合(還元・還元競合)は、その文法は真にLR(0)では扱えず、先読みを使うSLR・LALR・LR(1)への拡張が必要になる)
4. 入力を1トークンずつシフトしながら、還元できるタイミングでスタックをまとめていき、最終的にスタックが開始記号1つだけになり入力を全て読み終えたら解析成功

## 特性・トレードオフ

- **計算量**: シフト・還元それぞれのトークンの処理が定数時間の状態遷移で行われるため、全体で`O(n)`。LR系のパーサはLL系と同様に高速に動作する
- **文法の表現力**: LR(0)自体は先読みなしのため実用上は制約が強いが、その拡張形(特にLALR(1))は、LL(1)では直接扱えない左再帰を含む文法や、より広いクラスのプログラミング言語文法をそのまま扱えるため、実務のコンパイラでは伝統的にLR系(特にyacc/BisonのLALR)が好まれてきた
- **手書きの困難さと自動生成の重要性**: LR(0)オートマトンの状態数は文法によって非常に多くなることがあり、[LL(1)構文解析](/algorithms/ll1-parsing)以上に手書きでの実装は現実的でない。パーサジェネレータによる自動生成が前提の技術になっている
- **使いどころ**: yacc/Bison・GNU Bisonなどのパーサジェネレータが生成するコンパイラのパーサ部分、プログラミング言語の文法設計における文法の曖昧性・競合の検出(生成時にシフト・還元競合が報告されることで、文法の問題点を発見できる)

## 実装例

真にLR(0)な(先読みなしでシフト/還元が一意に決まる)最小の文法`S' -> S`、`S -> ( S ) | a`に対して、正準LR(0)項集合族(オートマトン)を構築し、シフト・還元構文解析を行う。

```python
# 文法: S' -> S (拡張開始記号) / S -> ( S ) | a
PRODUCTIONS = [
    ("S'", ["S"]),           # 0: 拡張開始規則
    ("S", ["(", "S", ")"]),  # 1
    ("S", ["a"]),             # 2
]
NONTERMINALS = {"S'", "S"}


def symbol_at_dot(prod_index, dot):
    _, rhs = PRODUCTIONS[prod_index]
    return rhs[dot] if dot < len(rhs) else None


def closure(items):
    """アイテム集合をクロージャ拡張する: ドットの次が非終端記号なら、その規則の先頭ドット付きアイテムを加える。"""
    items = set(items)
    changed = True
    while changed:
        changed = False
        for prod_index, dot in list(items):
            sym = symbol_at_dot(prod_index, dot)
            if sym in NONTERMINALS:
                for j, (lhs, _) in enumerate(PRODUCTIONS):
                    if lhs == sym and (j, 0) not in items:
                        items.add((j, 0))
                        changed = True
    return frozenset(items)


def goto(items, symbol):
    moved = {(p, d + 1) for (p, d) in items if symbol_at_dot(p, d) == symbol}
    return closure(moved) if moved else frozenset()


def build_automaton():
    """正準LR(0)項集合族を構築する。戻り値: (states, transitions)。"""
    start_state = closure({(0, 0)})
    states = [start_state]
    transitions = {}  # (state_index, symbol) -> state_index
    changed = True
    while changed:
        changed = False
        for i, state in enumerate(states):
            symbols = {symbol_at_dot(p, d) for (p, d) in state if symbol_at_dot(p, d) is not None}
            for sym in symbols:
                target = goto(state, sym)
                if not target:
                    continue
                if target not in states:
                    states.append(target)
                    changed = True
                transitions[(i, sym)] = states.index(target)
    return states, transitions


def build_action_table(states, transitions):
    """各状態を「シフト状態」か「還元状態」に分類する。LR(0)なので、
    完了アイテム(ドットが末尾)を含む状態は無条件に還元し、そうでなければ次の記号でシフトする。
    """
    reduce_at = {}  # state_index -> production_index(LR(0)なので状態ごとに高々1つ)
    accept_states = set()
    for i, state in enumerate(states):
        for p, d in state:
            lhs, rhs = PRODUCTIONS[p]
            if d == len(rhs):
                if p == 0:
                    accept_states.add(i)
                else:
                    if i in reduce_at and reduce_at[i] != p:
                        raise ValueError(f"還元・還元競合: 状態{i}")
                    reduce_at[i] = p
    for i in reduce_at:  # シフト・還元競合の検出
        for (state_index, sym) in transitions:
            if state_index == i:
                raise ValueError(f"シフト・還元競合: 状態{i}, 記号{sym}")
    return reduce_at, accept_states


def parse(tokens, transitions, reduce_at, accept_states) -> bool:
    """スタックベースのシフト・還元構文解析。受理すればTrue。"""
    stack = [0]  # 状態のスタック
    pos = 0
    tokens = tokens + ["$"]
    while True:
        state = stack[-1]
        if state in accept_states:
            return pos == len(tokens) - 1
        if state in reduce_at:
            lhs, rhs = PRODUCTIONS[reduce_at[state]]
            for _ in rhs:
                stack.pop()
            prev_state = stack[-1]
            if (prev_state, lhs) not in transitions:
                return False
            stack.append(transitions[(prev_state, lhs)])
        else:
            cur = tokens[pos]
            if (state, cur) not in transitions:
                return False
            stack.append(transitions[(state, cur)])
            pos += 1
```

```typescript
type Production = [string, string[]];

const PRODUCTIONS: Production[] = [
  ["S'", ["S"]],
  ["S", ["(", "S", ")"]],
  ["S", ["a"]],
];
const NONTERMINALS = new Set(["S'", "S"]);

type Item = [number, number]; // [production_index, dot_position]

function symbolAtDot(prodIndex: number, dot: number): string | null {
  const [, rhs] = PRODUCTIONS[prodIndex];
  return dot < rhs.length ? rhs[dot] : null;
}

function itemKey(item: Item): string {
  return `${item[0]},${item[1]}`;
}

function itemSetKey(items: Item[]): string {
  return items.map(itemKey).sort().join("|");
}

// アイテム集合をクロージャ拡張する: ドットの次が非終端記号なら、その規則の先頭ドット付きアイテムを加える
function closure(items: Item[]): Item[] {
  const set = new Map<string, Item>();
  for (const it of items) set.set(itemKey(it), it);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [p, d] of [...set.values()]) {
      const sym = symbolAtDot(p, d);
      if (sym !== null && NONTERMINALS.has(sym)) {
        PRODUCTIONS.forEach(([lhs], j) => {
          if (lhs === sym) {
            const key = itemKey([j, 0]);
            if (!set.has(key)) {
              set.set(key, [j, 0]);
              changed = true;
            }
          }
        });
      }
    }
  }
  return [...set.values()];
}

function gotoState(items: Item[], symbol: string): Item[] {
  const moved: Item[] = [];
  for (const [p, d] of items) if (symbolAtDot(p, d) === symbol) moved.push([p, d + 1]);
  return moved.length > 0 ? closure(moved) : [];
}

interface Automaton {
  states: Item[][];
  transitions: Map<string, number>; // `${stateIndex},${symbol}` -> stateIndex
}

// 正準LR(0)項集合族を構築する
function buildAutomaton(): Automaton {
  const startState = closure([[0, 0]]);
  const states: Item[][] = [startState];
  const stateKeys: string[] = [itemSetKey(startState)];
  const transitions = new Map<string, number>();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < states.length; i++) {
      const symbols = new Set<string>();
      for (const [p, d] of states[i]) {
        const sym = symbolAtDot(p, d);
        if (sym !== null) symbols.add(sym);
      }
      for (const sym of symbols) {
        const target = gotoState(states[i], sym);
        if (target.length === 0) continue;
        const key = itemSetKey(target);
        let j = stateKeys.indexOf(key);
        if (j === -1) {
          states.push(target);
          stateKeys.push(key);
          j = states.length - 1;
          changed = true;
        }
        transitions.set(`${i},${sym}`, j);
      }
    }
  }
  return { states, transitions };
}

interface ActionTable {
  reduceAt: Map<number, number>; // stateIndex -> productionIndex
  acceptStates: Set<number>;
}

// 各状態を「シフト状態」か「還元状態」に分類する。LR(0)なので、完了アイテムを含む状態は無条件に還元する
function buildActionTable(states: Item[][], transitions: Map<string, number>): ActionTable {
  const reduceAt = new Map<number, number>();
  const acceptStates = new Set<number>();
  states.forEach((state, i) => {
    for (const [p, d] of state) {
      const [, rhs] = PRODUCTIONS[p];
      if (d === rhs.length) {
        if (p === 0) acceptStates.add(i);
        else {
          if (reduceAt.has(i) && reduceAt.get(i) !== p) throw new Error(`還元・還元競合: 状態${i}`);
          reduceAt.set(i, p);
        }
      }
    }
  });
  for (const i of reduceAt.keys()) {
    for (const key of transitions.keys()) {
      if (Number(key.split(",")[0]) === i) throw new Error(`シフト・還元競合: 状態${i}`);
    }
  }
  return { reduceAt, acceptStates };
}

// スタックベースのシフト・還元構文解析。受理すればtrue
function parse(
  tokens: string[],
  transitions: Map<string, number>,
  reduceAt: Map<number, number>,
  acceptStates: Set<number>
): boolean {
  const stack: number[] = [0];
  let pos = 0;
  const input = [...tokens, "$"];
  while (true) {
    const state = stack[stack.length - 1];
    if (acceptStates.has(state)) return pos === input.length - 1;
    if (reduceAt.has(state)) {
      const [lhs, rhs] = PRODUCTIONS[reduceAt.get(state)!];
      for (let i = 0; i < rhs.length; i++) stack.pop();
      const key = `${stack[stack.length - 1]},${lhs}`;
      if (!transitions.has(key)) return false;
      stack.push(transitions.get(key)!);
    } else {
      const key = `${state},${input[pos]}`;
      if (!transitions.has(key)) return false;
      stack.push(transitions.get(key)!);
      pos++;
    }
  }
}
```

```cpp
#include <string>
#include <vector>
#include <set>
#include <map>
#include <stdexcept>

using Production = std::pair<std::string, std::vector<std::string>>;
using Item = std::pair<int, int>; // (production_index, dot_position)

const std::vector<Production> PRODUCTIONS = {
    {"S'", {"S"}},
    {"S", {"(", "S", ")"}},
    {"S", {"a"}},
};
const std::set<std::string> NONTERMINALS = {"S'", "S"};

std::string symbolAtDot(int prodIndex, int dot) {
    const auto& rhs = PRODUCTIONS[prodIndex].second;
    return dot < static_cast<int>(rhs.size()) ? rhs[dot] : "";
}

// アイテム集合をクロージャ拡張する: ドットの次が非終端記号なら、その規則の先頭ドット付きアイテムを加える
std::set<Item> closure(std::set<Item> items) {
    bool changed = true;
    while (changed) {
        changed = false;
        for (auto [p, d] : std::set<Item>(items)) {
            std::string sym = symbolAtDot(p, d);
            if (!sym.empty() && NONTERMINALS.count(sym)) {
                for (size_t j = 0; j < PRODUCTIONS.size(); j++) {
                    if (PRODUCTIONS[j].first == sym) {
                        Item newItem = {static_cast<int>(j), 0};
                        if (!items.count(newItem)) { items.insert(newItem); changed = true; }
                    }
                }
            }
        }
    }
    return items;
}

std::set<Item> gotoState(const std::set<Item>& items, const std::string& symbol) {
    std::set<Item> moved;
    for (auto [p, d] : items) {
        if (symbolAtDot(p, d) == symbol) moved.insert({p, d + 1});
    }
    return moved.empty() ? std::set<Item>{} : closure(moved);
}

using Transitions = std::map<std::pair<int, std::string>, int>;

// 正準LR(0)項集合族を構築する
void buildAutomaton(std::vector<std::set<Item>>& states, Transitions& transitions) {
    states.push_back(closure({{0, 0}}));
    bool changed = true;
    while (changed) {
        changed = false;
        for (size_t i = 0; i < states.size(); i++) {
            std::set<std::string> symbols;
            for (auto [p, d] : states[i]) {
                std::string sym = symbolAtDot(p, d);
                if (!sym.empty()) symbols.insert(sym);
            }
            for (const auto& sym : symbols) {
                auto target = gotoState(states[i], sym);
                if (target.empty()) continue;
                auto it = std::find(states.begin(), states.end(), target);
                int j;
                if (it == states.end()) {
                    states.push_back(target);
                    j = static_cast<int>(states.size()) - 1;
                    changed = true;
                } else {
                    j = static_cast<int>(it - states.begin());
                }
                transitions[{static_cast<int>(i), sym}] = j;
            }
        }
    }
}

// 各状態を「シフト状態」か「還元状態」に分類する。LR(0)なので、完了アイテムを含む状態は無条件に還元する
void buildActionTable(const std::vector<std::set<Item>>& states, const Transitions& transitions,
                       std::map<int, int>& reduceAt, std::set<int>& acceptStates) {
    for (size_t i = 0; i < states.size(); i++) {
        for (auto [p, d] : states[i]) {
            const auto& rhs = PRODUCTIONS[p].second;
            if (d == static_cast<int>(rhs.size())) {
                if (p == 0) {
                    acceptStates.insert(static_cast<int>(i));
                } else {
                    auto it = reduceAt.find(static_cast<int>(i));
                    if (it != reduceAt.end() && it->second != p) throw std::runtime_error("還元・還元競合");
                    reduceAt[static_cast<int>(i)] = p;
                }
            }
        }
    }
    for (const auto& [state_i, prod] : reduceAt) {
        for (const auto& [key, target] : transitions) {
            if (key.first == state_i) throw std::runtime_error("シフト・還元競合");
        }
    }
}

// スタックベースのシフト・還元構文解析。受理すればtrue
bool parseLR0(std::vector<std::string> tokens, const Transitions& transitions,
              const std::map<int, int>& reduceAt, const std::set<int>& acceptStates) {
    std::vector<int> stack = {0};
    size_t pos = 0;
    tokens.push_back("$");
    while (true) {
        int state = stack.back();
        if (acceptStates.count(state)) return pos == tokens.size() - 1;
        auto reduceIt = reduceAt.find(state);
        if (reduceIt != reduceAt.end()) {
            const auto& [lhs, rhs] = PRODUCTIONS[reduceIt->second];
            for (size_t k = 0; k < rhs.size(); k++) stack.pop_back();
            auto key = std::make_pair(stack.back(), lhs);
            auto it = transitions.find(key);
            if (it == transitions.end()) return false;
            stack.push_back(it->second);
        } else {
            auto key = std::make_pair(state, tokens[pos]);
            auto it = transitions.find(key);
            if (it == transitions.end()) return false;
            stack.push_back(it->second);
            pos++;
        }
    }
}
```

```rust
use std::collections::{BTreeSet, HashMap};

type Item = (usize, usize); // (production_index, dot_position)

fn productions() -> Vec<(&'static str, Vec<&'static str>)> {
    vec![
        ("S'", vec!["S"]),
        ("S", vec!["(", "S", ")"]),
        ("S", vec!["a"]),
    ]
}

fn symbol_at_dot(prods: &[(&str, Vec<&str>)], prod_index: usize, dot: usize) -> Option<String> {
    let rhs = &prods[prod_index].1;
    if dot < rhs.len() { Some(rhs[dot].to_string()) } else { None }
}

// アイテム集合をクロージャ拡張する: ドットの次が非終端記号なら、その規則の先頭ドット付きアイテムを加える
fn closure(prods: &[(&str, Vec<&str>)], nonterminals: &BTreeSet<&str>, items: BTreeSet<Item>) -> BTreeSet<Item> {
    let mut items = items;
    let mut changed = true;
    while changed {
        changed = false;
        for (p, d) in items.clone() {
            if let Some(sym) = symbol_at_dot(prods, p, d) {
                if nonterminals.contains(sym.as_str()) {
                    for (j, (lhs, _)) in prods.iter().enumerate() {
                        if *lhs == sym.as_str() && items.insert((j, 0)) {
                            changed = true;
                        }
                    }
                }
            }
        }
    }
    items
}

fn goto_state(prods: &[(&str, Vec<&str>)], nonterminals: &BTreeSet<&str>, items: &BTreeSet<Item>, symbol: &str) -> BTreeSet<Item> {
    let moved: BTreeSet<Item> = items
        .iter()
        .filter_map(|&(p, d)| {
            if symbol_at_dot(prods, p, d).as_deref() == Some(symbol) { Some((p, d + 1)) } else { None }
        })
        .collect();
    if moved.is_empty() { moved } else { closure(prods, nonterminals, moved) }
}

// 正準LR(0)項集合族を構築する
fn build_automaton(
    prods: &[(&str, Vec<&str>)],
    nonterminals: &BTreeSet<&str>,
) -> (Vec<BTreeSet<Item>>, HashMap<(usize, String), usize>) {
    let mut states = vec![closure(prods, nonterminals, BTreeSet::from([(0, 0)]))];
    let mut transitions: HashMap<(usize, String), usize> = HashMap::new();
    let mut changed = true;
    while changed {
        changed = false;
        for i in 0..states.len() {
            let mut symbols: BTreeSet<String> = BTreeSet::new();
            for &(p, d) in &states[i] {
                if let Some(sym) = symbol_at_dot(prods, p, d) {
                    symbols.insert(sym);
                }
            }
            for sym in symbols {
                let target = goto_state(prods, nonterminals, &states[i], &sym);
                if target.is_empty() {
                    continue;
                }
                let j = match states.iter().position(|s| *s == target) {
                    Some(idx) => idx,
                    None => {
                        states.push(target);
                        changed = true;
                        states.len() - 1
                    }
                };
                transitions.insert((i, sym), j);
            }
        }
    }
    (states, transitions)
}

// 各状態を「シフト状態」か「還元状態」に分類する。LR(0)なので、完了アイテムを含む状態は無条件に還元する
fn build_action_table(
    prods: &[(&str, Vec<&str>)],
    states: &[BTreeSet<Item>],
    transitions: &HashMap<(usize, String), usize>,
) -> (HashMap<usize, usize>, BTreeSet<usize>) {
    let mut reduce_at: HashMap<usize, usize> = HashMap::new();
    let mut accept_states: BTreeSet<usize> = BTreeSet::new();
    for (i, state) in states.iter().enumerate() {
        for &(p, d) in state {
            let rhs_len = prods[p].1.len();
            if d == rhs_len {
                if p == 0 {
                    accept_states.insert(i);
                } else {
                    if let Some(&existing) = reduce_at.get(&i) {
                        assert_eq!(existing, p, "還元・還元競合: 状態{}", i);
                    }
                    reduce_at.insert(i, p);
                }
            }
        }
    }
    for &state_i in reduce_at.keys() {
        for (state_idx, _) in transitions.keys() {
            assert_ne!(*state_idx, state_i, "シフト・還元競合: 状態{}", state_i);
        }
    }
    (reduce_at, accept_states)
}

// スタックベースのシフト・還元構文解析。受理すればtrue
fn parse(
    prods: &[(&str, Vec<&str>)],
    tokens: &[&str],
    transitions: &HashMap<(usize, String), usize>,
    reduce_at: &HashMap<usize, usize>,
    accept_states: &BTreeSet<usize>,
) -> bool {
    let mut stack: Vec<usize> = vec![0];
    let mut pos = 0usize;
    let mut input: Vec<&str> = tokens.to_vec();
    input.push("$");
    loop {
        let state = *stack.last().unwrap();
        if accept_states.contains(&state) {
            return pos == input.len() - 1;
        }
        if let Some(&prod_index) = reduce_at.get(&state) {
            let (lhs, rhs) = &prods[prod_index];
            for _ in 0..rhs.len() {
                stack.pop();
            }
            let prev_state = *stack.last().unwrap();
            match transitions.get(&(prev_state, lhs.to_string())) {
                Some(&next) => stack.push(next),
                None => return false,
            }
        } else {
            let cur = input[pos];
            match transitions.get(&(state, cur.to_string())) {
                Some(&next) => {
                    stack.push(next);
                    pos += 1;
                }
                None => return false,
            }
        }
    }
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

record Production(string Lhs, string[] Rhs);

static class Lr0Parser
{
    static readonly Production[] Productions =
    {
        new("S'", new[] { "S" }),
        new("S", new[] { "(", "S", ")" }),
        new("S", new[] { "a" }),
    };
    static readonly HashSet<string> Nonterminals = new() { "S'", "S" };

    static string? SymbolAtDot(int prodIndex, int dot)
    {
        var rhs = Productions[prodIndex].Rhs;
        return dot < rhs.Length ? rhs[dot] : null;
    }

    static string ItemSetKey(IEnumerable<(int, int)> items) =>
        string.Join("|", items.Select(it => $"{it.Item1},{it.Item2}").OrderBy(s => s));

    // アイテム集合をクロージャ拡張する: ドットの次が非終端記号なら、その規則の先頭ドット付きアイテムを加える
    static HashSet<(int, int)> Closure(IEnumerable<(int, int)> items)
    {
        var set = new HashSet<(int, int)>(items);
        bool changed = true;
        while (changed)
        {
            changed = false;
            foreach (var (p, d) in set.ToList())
            {
                var sym = SymbolAtDot(p, d);
                if (sym != null && Nonterminals.Contains(sym))
                {
                    for (int j = 0; j < Productions.Length; j++)
                    {
                        if (Productions[j].Lhs == sym && set.Add((j, 0))) changed = true;
                    }
                }
            }
        }
        return set;
    }

    static HashSet<(int, int)> GotoState(HashSet<(int, int)> items, string symbol)
    {
        var moved = items.Where(it => SymbolAtDot(it.Item1, it.Item2) == symbol)
            .Select(it => (it.Item1, it.Item2 + 1)).ToHashSet();
        return moved.Count > 0 ? Closure(moved) : moved;
    }

    // 正準LR(0)項集合族を構築する
    public static (List<HashSet<(int, int)>> States, Dictionary<(int, string), int> Transitions) BuildAutomaton()
    {
        var states = new List<HashSet<(int, int)>> { Closure(new[] { (0, 0) }) };
        var stateKeys = new List<string> { ItemSetKey(states[0]) };
        var transitions = new Dictionary<(int, string), int>();
        bool changed = true;
        while (changed)
        {
            changed = false;
            for (int i = 0; i < states.Count; i++)
            {
                var symbols = states[i].Select(it => SymbolAtDot(it.Item1, it.Item2)).Where(s => s != null).Distinct();
                foreach (var sym in symbols)
                {
                    var target = GotoState(states[i], sym!);
                    if (target.Count == 0) continue;
                    var key = ItemSetKey(target);
                    int j = stateKeys.IndexOf(key);
                    if (j == -1)
                    {
                        states.Add(target);
                        stateKeys.Add(key);
                        j = states.Count - 1;
                        changed = true;
                    }
                    transitions[(i, sym!)] = j;
                }
            }
        }
        return (states, transitions);
    }

    // 各状態を「シフト状態」か「還元状態」に分類する。LR(0)なので、完了アイテムを含む状態は無条件に還元する
    public static (Dictionary<int, int> ReduceAt, HashSet<int> AcceptStates) BuildActionTable(
        List<HashSet<(int, int)>> states, Dictionary<(int, string), int> transitions)
    {
        var reduceAt = new Dictionary<int, int>();
        var acceptStates = new HashSet<int>();
        for (int i = 0; i < states.Count; i++)
        {
            foreach (var (p, d) in states[i])
            {
                if (d == Productions[p].Rhs.Length)
                {
                    if (p == 0) acceptStates.Add(i);
                    else
                    {
                        if (reduceAt.TryGetValue(i, out var existing) && existing != p)
                            throw new InvalidOperationException($"還元・還元競合: 状態{i}");
                        reduceAt[i] = p;
                    }
                }
            }
        }
        foreach (var stateIndex in reduceAt.Keys)
        {
            if (transitions.Keys.Any(k => k.Item1 == stateIndex))
                throw new InvalidOperationException($"シフト・還元競合: 状態{stateIndex}");
        }
        return (reduceAt, acceptStates);
    }

    // スタックベースのシフト・還元構文解析。受理すればtrue
    public static bool Parse(List<string> tokens, Dictionary<(int, string), int> transitions,
        Dictionary<int, int> reduceAt, HashSet<int> acceptStates)
    {
        var stack = new List<int> { 0 };
        int pos = 0;
        var input = new List<string>(tokens) { "$" };
        while (true)
        {
            int state = stack[^1];
            if (acceptStates.Contains(state)) return pos == input.Count - 1;
            if (reduceAt.TryGetValue(state, out var prodIndex))
            {
                var prod = Productions[prodIndex];
                stack.RemoveRange(stack.Count - prod.Rhs.Length, prod.Rhs.Length);
                if (!transitions.TryGetValue((stack[^1], prod.Lhs), out var next)) return false;
                stack.Add(next);
            }
            else
            {
                if (!transitions.TryGetValue((state, input[pos]), out var next)) return false;
                stack.Add(next);
                pos++;
            }
        }
    }
}
```
