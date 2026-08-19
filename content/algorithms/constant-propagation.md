---
name: 定数伝播(Constant Propagation)
category: コンパイラ・構文解析
subcategory: コード生成・最適化
complexity: O(n・v)程度(nは命令数、vは変数数。3段の格子で不動点まで反復するデータフロー解析)
summary: ある変数がプログラムのある地点で必ず特定の定数値を持つことをデータフロー解析で追跡し、その変数の使用箇所を直接その定数値に置き換える最適化。
---

## 概要

[定数畳み込み](/algorithms/constant-folding)は`2 + 3`のようにリテラル同士が直接書かれた演算しか畳み込めない。しかし実際のプログラムでは`x = 2; y = x + 3;`のように、定数が一度変数に代入されてから使われることの方が多い。定数伝播は、[3番地コード生成](/algorithms/three-address-code-generation)で得られた中間表現の上で「ある変数がプログラムのある地点に到達したとき、実行パスによらず必ず同じ定数値を持つか」をデータフロー解析によって追跡し、その変数を直接その定数値に置き換える最適化である。単独でも意味があるが、真価を発揮するのは[定数畳み込み](/algorithms/constant-folding)と組み合わせたときで、定数伝播で判明した定数値を使うことで、`y = x + 3`のような変数を経由した間接的な演算までさらに畳み込めるようになる——2つの最適化を交互に(あるいは同時に)繰り返し適用することで、当初はリテラルが1つも隣り合っていなかったコードが芋づる式に定数化されていくことがある。

## 仕組み

1. 各変数について「その時点でどんな値を取りうるか」を3段階の**格子(lattice)**で表す: `⊤`(まだ情報がない/その地点に到達不可能)、具体的な定数値`c`、`⊥`(定数ではなく複数の異なる値を取りうる、あるいは判定を諦めた状態)
2. 制御フローグラフ(CFG)の各基本ブロックの入口・出口ごとに、「各変数がこの格子のどの要素にあるか」を表すデータフロー値(マップ)を保持する
3. **合流演算(meet operator)**: 複数の経路(前任ブロック)が合流する地点では、各変数について「全ての経路で同じ定数`c`なら`c`のまま、異なる定数や`⊥`が混じれば`⊥`、全ての経路で未到達`⊤`ならそのまま`⊤`」という規則で値を統合する
4. 各代入命令`t = a op b`を順に適用しながら、右辺のオペランドが(既に判明している定数伝播の結果を使って)両方とも定数であれば、その場で[定数畳み込み](/algorithms/constant-folding)を行い`t`の値をその結果の定数に更新する。オペランドのどちらかが非定数(`⊥`)なら`t`も`⊥`にする
5. この計算をCFG全体で、どのブロックのデータフロー値も変化しなくなる(不動点に達する)まで反復する。格子の高さがちょうど3段(`⊤ → 具体的な定数 → ⊥`)しかないため、各変数の値は高々2回しか変化せず、反復回数は文法サイズによらず有界であることが保証される
6. 最終的に「変数`x`がプログラムのこの地点で確実に定数`c`である」と判明した箇所では、`x`の使用箇所を直接`c`に書き換える。条件分岐の条件式が定数に確定した場合は「常に真/常に偽」と判定でき、到達不能になった分岐先を[不要コード除去](/algorithms/dead-code-elimination)でさらに削除する足がかりにもなる

## 特性・トレードオフ

- **計算量**: 格子の高さが定数(3段)であるため、各変数のデータフロー値は高々定数回しか変化せず、CFGを反復して不動点に到達するまでの全体コストは、命令数`n`と変数数`v`にほぼ比例する`O(n・v)`程度で収束する
- **[定数畳み込み](/algorithms/constant-folding)との相乗効果**: 定数畳み込み単体で処理できるのはソースコードにリテラルの演算が直接書かれている場合に限られ効果が限定的だが、定数伝播と組み合わせることで「変数を介した間接的な定数演算」も畳み込めるようになる(`x = 2; y = x + 3;`の`x`が伝播で`2`だと判明すれば、`y = 2 + 3`とみなせてさらに`y = 5`まで畳み込める)。実際のコンパイラでは両者を交互に、あるいは条件分岐の到達可能性まで同時に扱う条件付き定数伝播(SCCP: Sparse Conditional Constant Propagation)として統合的に適用する
- **保守性(soundness)の必要性**: 分岐条件や間接的な代入(ポインタ経由の書き込みなど)があると、ある変数が「本当に全ての実行パスで同じ定数か」の判定を誤ってはならない。判定に確信が持てない場合は保守的に`⊥`扱いにする必要があり、複数の変数が同じメモリ領域を指しうる言語(エイリアシング)では、この保守性の確保が特に難しくなる
- **[静的単一代入形式(SSA)](/algorithms/static-single-assignment)との相性**: SSA形式では各変数がプログラム中で一度しか代入されないため、ある変数の定数性の判定は「その唯一の定義がどんな値になるか」だけを見ればよくなり、実装と正当性の議論が大幅に単純化される。SSA上で条件分岐の到達可能性まで同時に解析する発展形(SCCP)は、通常の定数伝播よりも多くの定数を発見できることが知られている
- **使いどころ**: ほぼ全ての実用コンパイラ(GCC、LLVM、JITコンパイラ)で標準的に実装される基本最適化パス。設定値や機能フラグを定数として扱うコード、テンプレート/ジェネリクスの特殊化で生じる冗長な変数経由の演算、[不要コード除去](/algorithms/dead-code-elimination)と組み合わせた到達不能な分岐先の削除

## 実装例

複数の基本ブロックからなる制御フローグラフ上で、`⊤`/定数/`⊥`の3段格子を使ったワークリスト型の前向きデータフロー解析により、各ブロック入口での変数の定数性を不動点まで反復計算する。

```python
from dataclasses import dataclass, field
from typing import Optional, Union

TOP = "⊤"      # 未到達・未確定
BOTTOM = "⊥"   # 定数ではない
Lattice = Union[str, float]  # TOP / BOTTOM / 具体的な定数値


def meet(a: Lattice, b: Lattice) -> Lattice:
    """合流演算: 片方がTOPならもう片方を採用し、値が食い違えばBOTTOMにする"""
    if a == TOP:
        return b
    if b == TOP:
        return a
    return a if a == b else BOTTOM


@dataclass
class Assign:
    dest: str
    op: str  # 'const' | 'copy' | '+' | '-' | '*'
    a: str
    b: Optional[str] = None  # copy/constの場合はNone。定数即値は "#3" のように表記する


@dataclass
class Block:
    name: str
    instrs: list[Assign]
    succs: list[str] = field(default_factory=list)


def eval_operand(operand: str, state: dict[str, Lattice]) -> Lattice:
    if operand.startswith("#"):
        return float(operand[1:])
    return state.get(operand, TOP)


def apply_instr(instr: Assign, state: dict[str, Lattice]) -> dict[str, Lattice]:
    """1命令を適用した後の状態を返す(定数畳み込みと同じ演算を、伝播済みの値に対して行う)"""
    new_state = dict(state)
    if instr.op == "const":
        new_state[instr.dest] = float(instr.a[1:])
    elif instr.op == "copy":
        new_state[instr.dest] = eval_operand(instr.a, state)
    else:
        va, vb = eval_operand(instr.a, state), eval_operand(instr.b, state)
        if va == BOTTOM or vb == BOTTOM:
            new_state[instr.dest] = BOTTOM
        elif va == TOP or vb == TOP:
            new_state[instr.dest] = TOP
        else:
            new_state[instr.dest] = {"+": va + vb, "-": va - vb, "*": va * vb}[instr.op]
    return new_state


def constant_propagation(
    blocks: dict[str, Block], entry: str, all_vars: set[str]
) -> dict[str, dict[str, Lattice]]:
    """各ブロック入口のデータフロー値を不動点まで反復計算するワークリストアルゴリズム"""
    in_state = {name: {v: TOP for v in all_vars} for name in blocks}
    worklist = [entry]
    while worklist:
        name = worklist.pop()
        block = blocks[name]
        state = dict(in_state[name])
        for instr in block.instrs:
            state = apply_instr(instr, state)
        for succ_name in block.succs:
            succ_in = in_state[succ_name]
            merged, changed = {}, False
            for v in all_vars:
                m = meet(succ_in.get(v, TOP), state.get(v, TOP))
                merged[v] = m
                if m != succ_in.get(v, TOP):
                    changed = True
            if changed:
                in_state[succ_name] = merged
                if succ_name not in worklist:
                    worklist.append(succ_name)
    return in_state
```

```typescript
const TOP = "⊤"; // 未到達・未確定
const BOTTOM = "⊥"; // 定数ではない
type Lattice = typeof TOP | typeof BOTTOM | number;

// 合流演算: 片方がTOPならもう片方を採用し、値が食い違えばBOTTOMにする
function meet(a: Lattice, b: Lattice): Lattice {
  if (a === TOP) return b;
  if (b === TOP) return a;
  return a === b ? a : BOTTOM;
}

interface Assign {
  dest: string;
  op: "const" | "copy" | "+" | "-" | "*";
  a: string;
  b?: string; // copy/constの場合はundefined。定数即値は "#3" のように表記する
}

interface Block {
  name: string;
  instrs: Assign[];
  succs: string[];
}

function evalOperand(operand: string, state: Map<string, Lattice>): Lattice {
  if (operand.startsWith("#")) return parseFloat(operand.slice(1));
  return state.get(operand) ?? TOP;
}

// 1命令を適用した後の状態を返す(定数畳み込みと同じ演算を、伝播済みの値に対して行う)
function applyInstr(
  instr: Assign,
  state: Map<string, Lattice>,
): Map<string, Lattice> {
  const newState = new Map(state);
  if (instr.op === "const") {
    newState.set(instr.dest, parseFloat(instr.a.slice(1)));
  } else if (instr.op === "copy") {
    newState.set(instr.dest, evalOperand(instr.a, state));
  } else {
    const va = evalOperand(instr.a, state);
    const vb = evalOperand(instr.b!, state);
    if (va === BOTTOM || vb === BOTTOM) {
      newState.set(instr.dest, BOTTOM);
    } else if (va === TOP || vb === TOP) {
      newState.set(instr.dest, TOP);
    } else {
      const table = { "+": va + vb, "-": va - vb, "*": va * vb };
      newState.set(instr.dest, table[instr.op as "+" | "-" | "*"]);
    }
  }
  return newState;
}

// 各ブロック入口のデータフロー値を不動点まで反復計算するワークリストアルゴリズム
function constantPropagation(
  blocks: Map<string, Block>,
  entry: string,
  allVars: string[],
): Map<string, Map<string, Lattice>> {
  const inState = new Map<string, Map<string, Lattice>>();
  for (const name of blocks.keys()) {
    inState.set(name, new Map(allVars.map((v) => [v, TOP as Lattice])));
  }
  const worklist = [entry];
  while (worklist.length > 0) {
    const name = worklist.pop()!;
    const block = blocks.get(name)!;
    let state = new Map(inState.get(name));
    for (const instr of block.instrs) state = applyInstr(instr, state);
    for (const succName of block.succs) {
      const succIn = inState.get(succName)!;
      const merged = new Map<string, Lattice>();
      let changed = false;
      for (const v of allVars) {
        const m = meet(succIn.get(v) ?? TOP, state.get(v) ?? TOP);
        merged.set(v, m);
        if (m !== (succIn.get(v) ?? TOP)) changed = true;
      }
      if (changed) {
        inState.set(succName, merged);
        if (!worklist.includes(succName)) worklist.push(succName);
      }
    }
  }
  return inState;
}
```
