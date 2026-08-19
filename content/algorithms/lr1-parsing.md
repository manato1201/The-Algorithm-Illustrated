---
name: LR(1)構文解析
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: O(n)(構文解析自体はnをトークン数として線形。ただしLR(1)オートマトンの状態数は文法サイズに対し指数的に増えうる)
summary: 各状態のアイテムに1トークン先読みの完全な文脈(先読み記号)を持たせることで、LR(0)構文解析よりもreduce-reduce競合やshift-reduce競合を大幅に減らせる、決定性文脈自由文法に対する最も強力なボトムアップ構文解析法。
---

## 概要

[LR(0)構文解析](/algorithms/lr0-parsing)は先読みを一切使わないため、多くの実用的な文法で還元(reduce)のタイミングが一意に決まらない競合が頻発する。LR(1)構文解析は、正準LR(0)アイテム`A → α . β`に「この規則を還元した後、次に現れうる終端記号(先読み記号)」の情報を追加した**LR(1)アイテム** `[A → α . β, a]` を状態として持つオートマトンを構築することで、この問題を根本的に解決する——還元すべきかどうかの判断を、その状態に到達するまでの文脈全体（実際にどの規則からその状態に来たか）に応じた先読み記号ごとに個別に行えるため、LR(0)やSLR(1)では区別できなかった還元の候補を区別できるようになる。理論的には、決定性の文脈自由文法（LR文法）全体を扱える最も強力なボトムアップ構文解析法だが、その代償として状態数が文法サイズに対して指数的に膨れ上がりやすいという実務上の弱点があり、この弱点を克服する折衷案として同じコアを持つ状態をマージした**LALR(1)構文解析**（yacc/Bisonが標準的に採用する方式）が広く使われている。

## 仕組み

1. **LR(1)アイテム**は `[A → α . β, a]` の形式を取る。`A → α . β` はLR(0)と同じ「ドットの位置」を表すアイテムだが、これに加えて `a` という先読み記号（この規則を最終的に還元した直後に現れると想定される終端記号1つ）を組にして持つ
2. **クロージャ操作**: アイテム `[A → α . B β, a]` があるとき（`B`が非終端記号）、`B` の各規則 `B → γ` について、`FIRST(βa)`（`β`の後に`a`が続く記号列の先頭になりうる終端記号の集合）に含まれる各終端記号 `b` に対して `[B → . γ, b]` をクロージャに追加する。この`FIRST(βa)`の計算が、LR(0)にはなかった「文脈に応じた先読み」の核心部分になる
3. **goto操作**: LR(0)と同様、記号`X`でドットを1つ進めた新しいアイテム集合を計算し、必要ならクロージャを取って新しい状態にする
4. こうして得られる**正準LR(1)項集合族**（オートマトン）を出発状態から反復的に構築し、各状態について、完了したアイテム`[A → α ., a]`があれば「先読み記号が`a`のときだけ`A → α`で還元する」というACTION表のエントリを登録する。これがLR(0)との決定的な違いで、LR(0)では「その状態に完了アイテムがあれば無条件に還元」だったのに対し、LR(1)では**アイテムに紐づいた先読み記号ごとに**還元の可否を判断するため、同じ状態内に複数の完了アイテムがあっても先読み記号が異なれば競合しない
5. 入力をシフト・還元しながら処理し、スタックが開始記号1つになり入力を読み終えたら受理する手順自体は[LR(0)構文解析](/algorithms/lr0-parsing)と同じ
6. **LALR(1)への発展**: 正準LR(1)オートマトンは、ドット位置と生成規則の組（コア）が同じ状態が先読み記号違いで大量に複製されるため状態数が爆発しやすい。LALR(1)は同じコアを持つLR(1)状態をすべて1つにマージし、先読み記号集合だけを和集合で統合することで、状態数をLR(0)相当（正準LR(1)よりずっと少ない）に抑えつつ、実務上ほとんどの文法でLR(1)と同等の解析能力を保つ。ごく稀にマージによって本来なかったはずの還元・還元競合が新たに生じる文法もあるが、実用上遭遇することは少なく、この折衷案がyacc・Bison・多くのパーサジェネレータで標準になっている理由である

## 特性・トレードオフ

- **計算量**: 構文解析そのものはシフト・還元がそれぞれ定数時間の状態遷移で行われるため`O(n)`。ただし正準LR(1)オートマトンの構築コストは状態数に依存し、文法によっては状態数が[LR(0)構文解析](/algorithms/lr0-parsing)よりはるかに多くなる（最悪の場合、文法サイズに対して指数的に増える）
- **表現力**: 決定性の文脈自由文法（一般に「LR文法」と呼ばれるクラス）全体を、先読み1トークンだけで扱える。LR(0)やSLR(1)で還元・還元競合や還元・シフト競合が起きていた文法の多くは、先読み記号を文脈ごとに厳密に持つLR(1)なら競合なく扱える
- **状態数爆発という実務上の弱点**: 理論上の強力さと引き換えに、正準LR(1)は生成する状態数が非常に多くなりやすく、実務のコンパイラでそのまま採用されることは少ない。この弱点への対処として、コアが同一の状態をマージするLALR(1)が広く実用化されている——LALR(1)は状態数をLR(0)並みに抑えつつ、LR(1)の先読み精度のほとんどを保持する
- **使いどころ**: 決定性構文解析の理論的な上限を扱う研究・教育、CUPなど一部のパーサジェネレータでの厳密なLR(1)テーブル生成、LALR(1)では解決できない稀な還元・還元競合が実際に問題になる文法の解析。実務では[LR(0)構文解析](/algorithms/lr0-parsing)の項で触れたLALR(1)が最も一般的な選択肢になる

## 実装例

SLR(1)ですら扱えない古典的な例（文法 `S' -> S`, `S -> C C`, `C -> c C | d`）に対して正準LR(1)項集合族を構築し、ACTION/GOTO表を作ってシフト・還元構文解析を行う。

```python
PRODUCTIONS = [
    ("S'", ["S"]),      # 0: 拡張開始規則
    ("S", ["C", "C"]),  # 1
    ("C", ["c", "C"]),  # 2
    ("C", ["d"]),        # 3
]
NONTERMINALS = {"S'", "S", "C"}


def is_terminal(sym: str) -> bool:
    return sym not in NONTERMINALS


def compute_first_sets() -> dict[str, set[str]]:
    """非終端記号ごとのFIRST集合を計算する(このデモ文法にε生成規則はない)"""
    first: dict[str, set[str]] = {nt: set() for nt in NONTERMINALS}
    changed = True
    while changed:
        changed = False
        for lhs, rhs in PRODUCTIONS:
            sym = rhs[0]
            if is_terminal(sym):
                if sym not in first[lhs]:
                    first[lhs].add(sym); changed = True
            else:
                before = len(first[lhs])
                first[lhs] |= first[sym]
                if len(first[lhs]) != before:
                    changed = True
    return first


FIRST = compute_first_sets()


def first_of_symbol(sym: str) -> set[str]:
    return {sym} if is_terminal(sym) else FIRST[sym]


def symbol_at_dot(p: int, d: int):
    _, rhs = PRODUCTIONS[p]
    return rhs[d] if d < len(rhs) else None


Item = tuple[int, int, str]  # (production_index, dot_position, lookahead)


def closure(items: set[Item]) -> frozenset[Item]:
    """LR(1)アイテム集合をクロージャ拡張する。先読み記号もFIRST集合から計算して伝播させる"""
    items = set(items)
    changed = True
    while changed:
        changed = False
        for (p, d, la) in list(items):
            sym = symbol_at_dot(p, d)
            if sym is not None and not is_terminal(sym):
                beta = PRODUCTIONS[p][1][d + 1:]
                lookaheads = first_of_symbol(beta[0]) if beta else {la}
                for j, (lhs, _) in enumerate(PRODUCTIONS):
                    if lhs == sym:
                        for b in lookaheads:
                            item = (j, 0, b)
                            if item not in items:
                                items.add(item); changed = True
    return frozenset(items)


def goto(items: frozenset[Item], symbol: str) -> frozenset[Item]:
    moved = {(p, d + 1, la) for (p, d, la) in items if symbol_at_dot(p, d) == symbol}
    return closure(moved) if moved else frozenset()


def build_automaton():
    """正準LR(1)項集合族を構築する。戻り値: (states, transitions)"""
    start = closure({(0, 0, "$")})
    states = [start]
    transitions: dict[tuple[int, str], int] = {}
    changed = True
    while changed:
        changed = False
        for i, state in enumerate(states):
            symbols = {symbol_at_dot(p, d) for (p, d, la) in state if symbol_at_dot(p, d) is not None}
            for sym in symbols:
                target = goto(state, sym)
                if not target:
                    continue
                if target not in states:
                    states.append(target); changed = True
                transitions[(i, sym)] = states.index(target)
    return states, transitions


def build_tables(states, transitions):
    """ACTION表(シフト/還元/受理)とGOTO表を構築する。先読み記号ごとに還元を判断する点がLR(0)との違い"""
    action: dict[tuple[int, str], tuple] = {}
    goto_table: dict[tuple[int, str], int] = {}
    for (i, sym), j in transitions.items():
        if is_terminal(sym):
            action[(i, sym)] = ("shift", j)
        else:
            goto_table[(i, sym)] = j
    for i, state in enumerate(states):
        for (p, d, la) in state:
            lhs, rhs = PRODUCTIONS[p]
            if d == len(rhs):
                if p == 0:
                    action[(i, "$")] = ("accept",)
                else:
                    key = (i, la)
                    if key in action and action[key] != ("reduce", p):
                        raise ValueError(f"競合: 状態{i}, 先読み{la}: {action[key]} vs ('reduce', {p})")
                    action[key] = ("reduce", p)
    return action, goto_table


def parse(tokens: list[str], action, goto_table) -> bool:
    """スタックベースのLR(1)シフト・還元構文解析。受理すればTrue"""
    stack = [0]
    pos = 0
    tokens = tokens + ["$"]
    while True:
        state = stack[-1]
        cur = tokens[pos]
        act = action.get((state, cur))
        if act is None:
            return False
        if act[0] == "accept":
            return True
        if act[0] == "shift":
            stack.append(act[1])
            pos += 1
        else:
            _, prod_index = act
            lhs, rhs = PRODUCTIONS[prod_index]
            for _ in rhs:
                stack.pop()
            stack.append(goto_table[(stack[-1], lhs)])
```

```typescript
type Production = [string, string[]];

const PRODUCTIONS: Production[] = [
  ["S'", ["S"]],
  ["S", ["C", "C"]],
  ["C", ["c", "C"]],
  ["C", ["d"]],
];
const NONTERMINALS = new Set(["S'", "S", "C"]);

function isTerminal(sym: string): boolean {
  return !NONTERMINALS.has(sym);
}

// 非終端記号ごとのFIRST集合を計算する(このデモ文法にε生成規則はない)
function computeFirstSets(): Map<string, Set<string>> {
  const first = new Map<string, Set<string>>();
  for (const nt of NONTERMINALS) first.set(nt, new Set());
  let changed = true;
  while (changed) {
    changed = false;
    for (const [lhs, rhs] of PRODUCTIONS) {
      const sym = rhs[0];
      const set = first.get(lhs)!;
      if (isTerminal(sym)) {
        if (!set.has(sym)) { set.add(sym); changed = true; }
      } else {
        const before = set.size;
        for (const s of first.get(sym)!) set.add(s);
        if (set.size !== before) changed = true;
      }
    }
  }
  return first;
}

const FIRST = computeFirstSets();

function firstOfSymbol(sym: string): Set<string> {
  return isTerminal(sym) ? new Set([sym]) : FIRST.get(sym)!;
}

function symbolAtDot(p: number, d: number): string | null {
  const [, rhs] = PRODUCTIONS[p];
  return d < rhs.length ? rhs[d] : null;
}

type Item = [number, number, string]; // [production_index, dot_position, lookahead]

function itemKey([p, d, la]: Item): string {
  return `${p},${d},${la}`;
}

function itemSetKey(items: Item[]): string {
  return items.map(itemKey).sort().join("|");
}

// LR(1)アイテム集合をクロージャ拡張する。先読み記号もFIRST集合から計算して伝播させる
function closure(items: Item[]): Item[] {
  const set = new Map<string, Item>();
  for (const it of items) set.set(itemKey(it), it);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [p, d, la] of [...set.values()]) {
      const sym = symbolAtDot(p, d);
      if (sym !== null && !isTerminal(sym)) {
        const beta = PRODUCTIONS[p][1].slice(d + 1);
        const lookaheads = beta.length > 0 ? firstOfSymbol(beta[0]) : new Set([la]);
        PRODUCTIONS.forEach(([lhs], j) => {
          if (lhs === sym) {
            for (const b of lookaheads) {
              const item: Item = [j, 0, b];
              const key = itemKey(item);
              if (!set.has(key)) { set.set(key, item); changed = true; }
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
  for (const [p, d, la] of items) if (symbolAtDot(p, d) === symbol) moved.push([p, d + 1, la]);
  return moved.length > 0 ? closure(moved) : [];
}

interface Automaton {
  states: Item[][];
  transitions: Map<string, number>; // `${stateIndex},${symbol}` -> stateIndex
}

// 正準LR(1)項集合族を構築する
function buildAutomaton(): Automaton {
  const start = closure([[0, 0, "$"]]);
  const states: Item[][] = [start];
  const stateKeys: string[] = [itemSetKey(start)];
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

type Action = ["shift", number] | ["reduce", number] | ["accept"];

interface Tables {
  action: Map<string, Action>;
  gotoTable: Map<string, number>;
}

// ACTION表(シフト/還元/受理)とGOTO表を構築する。先読み記号ごとに還元を判断する点がLR(0)との違い
function buildTables(states: Item[][], transitions: Map<string, number>): Tables {
  const action = new Map<string, Action>();
  const gotoTable = new Map<string, number>();
  for (const [key, j] of transitions) {
    const sym = key.split(",")[1];
    if (isTerminal(sym)) action.set(key, ["shift", j]);
    else gotoTable.set(key, j);
  }
  states.forEach((state, i) => {
    for (const [p, d, la] of state) {
      const [, rhs] = PRODUCTIONS[p];
      if (d === rhs.length) {
        if (p === 0) {
          action.set(`${i},$`, ["accept"]);
        } else {
          const key = `${i},${la}`;
          const existing = action.get(key);
          if (existing && (existing[0] !== "reduce" || existing[1] !== p))
            throw new Error(`競合: 状態${i}, 先読み${la}`);
          action.set(key, ["reduce", p]);
        }
      }
    }
  });
  return { action, gotoTable };
}

// スタックベースのLR(1)シフト・還元構文解析。受理すればtrue
function parse(tokens: string[], action: Map<string, Action>, gotoTable: Map<string, number>): boolean {
  const stack: number[] = [0];
  let pos = 0;
  const input = [...tokens, "$"];
  while (true) {
    const state = stack[stack.length - 1];
    const cur = input[pos];
    const act = action.get(`${state},${cur}`);
    if (!act) return false;
    if (act[0] === "accept") return true;
    if (act[0] === "shift") {
      stack.push(act[1]);
      pos++;
    } else {
      const [, prodIndex] = act;
      const [lhs, rhs] = PRODUCTIONS[prodIndex];
      for (let k = 0; k < rhs.length; k++) stack.pop();
      const j = gotoTable.get(`${stack[stack.length - 1]},${lhs}`);
      if (j === undefined) return false;
      stack.push(j);
    }
  }
}
```
