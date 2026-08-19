---
name: Glushkov構成法(位置オートマトン)
category: コンパイラ・構文解析
subcategory: 字句解析
complexity: O(m^2)(mは正規表現中の文字出現数。線形時間に近づける改良版アルゴリズムも存在する)
summary: 正規表現の各文字の出現位置に番号を振り、ε遷移を一切含まない位置オートマトンを構文木のNullable・First・Last・Follow集合から直接構築する字句解析の基礎技法。
---

## 概要

[トンプソン構成法](/algorithms/thompson-construction)は正規表現を「連接・選択・繰り返し」に分解し、各演算に対応する小さなNFA断片をε遷移で繋ぎ合わせることでNFA全体を組み立てる。この方法は実装がシンプルな反面、生成されるNFAにはε遷移でしか使われない中継用の状態が数多く残る。Glushkov構成法(1961年、McNaughton-Yamada構成法とも呼ばれ1960年に独立に発表されている)は、これとは異なるアプローチを取る——正規表現に現れる文字の**出現1つ1つに一意な位置番号**を振り(同じ文字が複数回現れても別々の位置として区別する)、「ある位置の直後にどの位置が来うるか」という関係を構文木から直接計算することで、**ε遷移を一切含まない**非決定性オートマトン(位置オートマトン)をいきなり組み立てる。状態数が「文字出現数+1」ちょうどに一致するという性質があり、[部分集合構成法](/algorithms/subset-construction)でDFA化する前段階として、トンプソン構成法より小さな初期状態数から出発できる。

## 仕組み

1. 正規表現の構文木を作り、各葉(文字の出現1つ1つ)に`1, 2, 3, ...`という一意な位置番号を振る。例えば`(a|b)*a`なら、最初の`a`、`b`、末尾の`a`にそれぞれ異なる位置番号がつく(同じ文字`a`でも出現ごとに区別される)
2. 構文木の各部分式について、次の3つの集合を再帰的に計算する
   - **Nullable**: その部分式が空文字列にマッチしうるか(真偽値)
   - **First**: その部分式にマッチする文字列の先頭になりうる位置の集合
   - **Last**: その部分式にマッチする文字列の末尾になりうる位置の集合
3. **Follow(p)**(位置`p`の直後に来うる位置の集合)を構文木全体から計算する。連接`AB`では、`Last(A)`に含まれる各位置の`Follow`に`First(B)`を加える。繰り返し`A*`では、`Last(A)`に含まれる各位置の`Follow`に`First(A)`自身を加える(ループして自分自身の先頭に戻ってこられることを表す)
4. 位置オートマトンの状態は「開始状態0(擬似的な初期位置)」と「正規表現内の各位置」からなる。遷移は`Follow`集合そのものから機械的に作れる——開始状態0から`First(全体)`に含まれる各位置`p`へ、`p`が表す文字を読んで遷移する辺を引き、各位置`p`から`Follow(p)`に含まれる各位置`q`へ、`q`が表す文字を読んで遷移する辺を引く
5. `Last(全体)`に含まれる位置を受理状態とし、正規表現全体が空文字列にマッチしうる(`Nullable(全体)`が真)なら開始状態0自身も受理状態に加える
6. この手続きはε遷移を一度も作らないため、得られる位置オートマトンの状態数は常に「正規表現中の文字出現数`m` + 1」ちょうどになる

## 特性・トレードオフ

- **状態数の性質**: 文字出現数が`m`個の正規表現に対し、位置オートマトンの状態数は常に`m + 1`個ちょうどになる。[トンプソン構成法](/algorithms/thompson-construction)はおよそ`2m`個前後の状態を生成し、その多くがε遷移専用の中継点であるのと対照的に、Glushkov構成法は無駄のない最小限の状態数から出発できる
- **計算量**: `Follow`集合の素朴な計算(各位置ペアの関係を愚直に調べる方法)は`O(m^2)`だが、構文木を定数回走査するだけで`Follow`集合を計算できる改良アルゴリズム(Brüggemann-Klein、Ponty et al.など)を使えば、線形に近い計算量まで改善できる
- **[トンプソン構成法](/algorithms/thompson-construction)との違い**: トンプソン構成法は正規表現の演算子ごとに小さなNFA断片を再帰的に組み立ててε遷移で接続するため実装が直感的だが、後続の処理(文字列判定やDFA化)の前にε閉包の計算が必要になる。Glushkov構成法は最初から遷移だけのNFAを直接組み立てるため、ε閉包の計算を省略できる代わりに、Nullable・First・Last・Followという4種の集合を構文木全体から計算する前処理が必要になる——両者は「どこで計算コストを払うか」が異なる、等価な言語を認識する2つの構成法である
- **使いどころ**: 正規表現エンジンやXMLスキーマ(DTD、XML Schemaの内容モデル)の検証、状態数を抑えたNFAをそのまま使いたい字句解析器生成、形式言語理論におけるオートマトン構成法の比較研究の基礎。生成された位置オートマトンは、[部分集合構成法](/algorithms/subset-construction)でDFA化し、[DFA最小化](/algorithms/dfa-minimization)で状態数をさらに減らしてから実行されるのが一般的

## 実装例

連接・選択(`|`)・繰り返し(`*`)・括弧のみをサポートする正規表現から、構文木のNullable/First/Last/Follow集合を計算して位置オートマトンを構築し、文字列がマッチするかを判定する。

```python
from dataclasses import dataclass
from typing import Union as TUnion


@dataclass
class Leaf:
    char: str
    pos: int


@dataclass
class Concat:
    left: "Node"
    right: "Node"


@dataclass
class Alt:
    left: "Node"
    right: "Node"


@dataclass
class Star:
    inner: "Node"


Node = TUnion[Leaf, Concat, Alt, Star]


class RegexParser:
    """expr := term ('|' term)* / term := factor+ / factor := atom '*'? / atom := char | '(' expr ')'"""

    def __init__(self, pattern: str):
        self.pattern = pattern
        self.pos = 0
        self.next_position = 1  # 位置番号は1から始める(0は開始状態用に予約する)

    def peek(self):
        return self.pattern[self.pos] if self.pos < len(self.pattern) else None

    def parse(self) -> Node:
        return self.expr()

    def expr(self) -> Node:
        left = self.term()
        while self.peek() == "|":
            self.pos += 1
            left = Alt(left, self.term())
        return left

    def term(self) -> Node:
        left = self.factor()
        while self.peek() is not None and self.peek() not in ("|", ")"):
            left = Concat(left, self.factor())
        return left

    def factor(self) -> Node:
        atom = self.atom()
        while self.peek() == "*":
            self.pos += 1
            atom = Star(atom)
        return atom

    def atom(self) -> Node:
        if self.peek() == "(":
            self.pos += 1
            e = self.expr()
            self.pos += 1  # ')'
            return e
        ch = self.pattern[self.pos]
        self.pos += 1
        leaf = Leaf(ch, self.next_position)
        self.next_position += 1
        return leaf


def nullable(node: Node) -> bool:
    if isinstance(node, Leaf):
        return False
    if isinstance(node, Concat):
        return nullable(node.left) and nullable(node.right)
    if isinstance(node, Alt):
        return nullable(node.left) or nullable(node.right)
    return True  # Star


def first(node: Node) -> set[int]:
    if isinstance(node, Leaf):
        return {node.pos}
    if isinstance(node, Concat):
        return first(node.left) | (first(node.right) if nullable(node.left) else set())
    if isinstance(node, Alt):
        return first(node.left) | first(node.right)
    return first(node.inner)  # Star


def last(node: Node) -> set[int]:
    if isinstance(node, Leaf):
        return {node.pos}
    if isinstance(node, Concat):
        return last(node.right) | (last(node.left) if nullable(node.right) else set())
    if isinstance(node, Alt):
        return last(node.left) | last(node.right)
    return last(node.inner)  # Star


def compute_follow(node: Node, follow: dict[int, set[int]]) -> None:
    """構文木を再帰的に辿り、連接と繰り返しに対応するFollow集合を書き込む"""
    if isinstance(node, Concat):
        for p in last(node.left):
            follow.setdefault(p, set()).update(first(node.right))
        compute_follow(node.left, follow)
        compute_follow(node.right, follow)
    elif isinstance(node, Alt):
        compute_follow(node.left, follow)
        compute_follow(node.right, follow)
    elif isinstance(node, Star):
        for p in last(node.inner):
            follow.setdefault(p, set()).update(first(node.inner))
        compute_follow(node.inner, follow)


def collect_positions(node: Node, chars: dict[int, str]) -> None:
    if isinstance(node, Leaf):
        chars[node.pos] = node.char
    elif isinstance(node, (Concat, Alt)):
        collect_positions(node.left, chars)
        collect_positions(node.right, chars)
    elif isinstance(node, Star):
        collect_positions(node.inner, chars)


def build_position_automaton(pattern: str):
    """正規表現から位置オートマトン(状態数 = 文字出現数+1)を構築する"""
    root = RegexParser(pattern).parse()
    chars: dict[int, str] = {}
    collect_positions(root, chars)
    follow: dict[int, set[int]] = {p: set() for p in chars}
    compute_follow(root, follow)

    transitions: dict[tuple[int, str], set[int]] = {}
    for p in first(root):
        transitions.setdefault((0, chars[p]), set()).add(p)
    for p, targets in follow.items():
        for q in targets:
            transitions.setdefault((p, chars[q]), set()).add(q)

    accept = set(last(root))
    if nullable(root):
        accept.add(0)
    return transitions, accept


def matches(pattern: str, text: str) -> bool:
    transitions, accept = build_position_automaton(pattern)
    current = {0}
    for ch in text:
        nxt: set[int] = set()
        for s in current:
            nxt |= transitions.get((s, ch), set())
        current = nxt
        if not current:
            return False
    return bool(current & accept)
```

```typescript
type Node =
  | { kind: "leaf"; char: string; pos: number }
  | { kind: "concat"; left: Node; right: Node }
  | { kind: "alt"; left: Node; right: Node }
  | { kind: "star"; inner: Node };

// expr := term ('|' term)* / term := factor+ / factor := atom '*'? / atom := char | '(' expr ')'
class RegexParser {
  pos = 0;
  nextPosition = 1; // 位置番号は1から始める(0は開始状態用に予約する)
  constructor(private pattern: string) {}

  peek(): string | undefined {
    return this.pattern[this.pos];
  }

  parse(): Node {
    return this.expr();
  }

  private expr(): Node {
    let left = this.term();
    while (this.peek() === "|") {
      this.pos++;
      left = { kind: "alt", left, right: this.term() };
    }
    return left;
  }

  private term(): Node {
    let left = this.factor();
    while (this.peek() !== undefined && this.peek() !== "|" && this.peek() !== ")") {
      left = { kind: "concat", left, right: this.factor() };
    }
    return left;
  }

  private factor(): Node {
    let atom = this.atom();
    while (this.peek() === "*") {
      this.pos++;
      atom = { kind: "star", inner: atom };
    }
    return atom;
  }

  private atom(): Node {
    if (this.peek() === "(") {
      this.pos++;
      const e = this.expr();
      this.pos++; // ')'
      return e;
    }
    const ch = this.pattern[this.pos];
    this.pos++;
    return { kind: "leaf", char: ch, pos: this.nextPosition++ };
  }
}

function nullable(node: Node): boolean {
  switch (node.kind) {
    case "leaf": return false;
    case "concat": return nullable(node.left) && nullable(node.right);
    case "alt": return nullable(node.left) || nullable(node.right);
    case "star": return true;
  }
}

function first(node: Node): Set<number> {
  switch (node.kind) {
    case "leaf": return new Set([node.pos]);
    case "concat": {
      const result = first(node.left);
      if (nullable(node.left)) for (const p of first(node.right)) result.add(p);
      return result;
    }
    case "alt": {
      const result = first(node.left);
      for (const p of first(node.right)) result.add(p);
      return result;
    }
    case "star": return first(node.inner);
  }
}

function last(node: Node): Set<number> {
  switch (node.kind) {
    case "leaf": return new Set([node.pos]);
    case "concat": {
      const result = last(node.right);
      if (nullable(node.right)) for (const p of last(node.left)) result.add(p);
      return result;
    }
    case "alt": {
      const result = last(node.left);
      for (const p of last(node.right)) result.add(p);
      return result;
    }
    case "star": return last(node.inner);
  }
}

// 構文木を再帰的に辿り、連接と繰り返しに対応するFollow集合を書き込む
function computeFollow(node: Node, follow: Map<number, Set<number>>): void {
  if (node.kind === "concat") {
    for (const p of last(node.left)) {
      const set = follow.get(p) ?? new Set<number>();
      for (const q of first(node.right)) set.add(q);
      follow.set(p, set);
    }
    computeFollow(node.left, follow);
    computeFollow(node.right, follow);
  } else if (node.kind === "alt") {
    computeFollow(node.left, follow);
    computeFollow(node.right, follow);
  } else if (node.kind === "star") {
    for (const p of last(node.inner)) {
      const set = follow.get(p) ?? new Set<number>();
      for (const q of first(node.inner)) set.add(q);
      follow.set(p, set);
    }
    computeFollow(node.inner, follow);
  }
}

function collectPositions(node: Node, chars: Map<number, string>): void {
  if (node.kind === "leaf") {
    chars.set(node.pos, node.char);
  } else if (node.kind === "concat" || node.kind === "alt") {
    collectPositions(node.left, chars);
    collectPositions(node.right, chars);
  } else {
    collectPositions(node.inner, chars);
  }
}

interface PositionAutomaton {
  transitions: Map<string, Set<number>>; // `${pos}:${char}` -> 遷移先の位置集合
  accept: Set<number>;
}

// 正規表現から位置オートマトン(状態数 = 文字出現数+1)を構築する
function buildPositionAutomaton(pattern: string): PositionAutomaton {
  const root = new RegexParser(pattern).parse();
  const chars = new Map<number, string>();
  collectPositions(root, chars);
  const follow = new Map<number, Set<number>>();
  for (const p of chars.keys()) follow.set(p, new Set());
  computeFollow(root, follow);

  const transitions = new Map<string, Set<number>>();
  const addEdge = (from: number, ch: string, to: number) => {
    const key = `${from}:${ch}`;
    if (!transitions.has(key)) transitions.set(key, new Set());
    transitions.get(key)!.add(to);
  };
  for (const p of first(root)) addEdge(0, chars.get(p)!, p);
  for (const [p, targets] of follow) {
    for (const q of targets) addEdge(p, chars.get(q)!, q);
  }

  const accept = last(root);
  if (nullable(root)) accept.add(0);
  return { transitions, accept };
}

function matches(pattern: string, text: string): boolean {
  const { transitions, accept } = buildPositionAutomaton(pattern);
  let current = new Set<number>([0]);
  for (const ch of text) {
    const next = new Set<number>();
    for (const s of current) {
      const targets = transitions.get(`${s}:${ch}`);
      if (targets) for (const t of targets) next.add(t);
    }
    current = next;
    if (current.size === 0) return false;
  }
  return [...current].some((s) => accept.has(s));
}
```
