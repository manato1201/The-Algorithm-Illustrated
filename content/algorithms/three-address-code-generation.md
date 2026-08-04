---
name: 3番地コード生成
category: コンパイラ・構文解析
subcategory: コード生成・最適化
complexity: O(n)(nは構文木のノード数)
summary: 抽象構文木を「1命令につき演算子1つ、オペランド最大2つ」という単純な中間表現へ機械的に分解し、後続の最適化・コード生成を容易にするコンパイラの中間言語生成技法。
---

## 概要

[再帰下降構文解析](/algorithms/recursive-descent-parsing)や[LR(0)構文解析](/algorithms/lr0-parsing)で得られる抽象構文木(AST)は、ソースコードの構造を階層的に表現するが、この木構造のままでは最適化(共通部分式の削除、[定数畳み込み](/algorithms/constant-folding)など)や最終的な機械語への変換がやりにくい。3番地コードは、「1つの命令は、高々1つの演算子と2つのオペランド(引数)、1つの結果の格納先」という単純な形式に、あらゆる複雑な式を機械的に分解した中間表現である。この名前は「結果 = 引数1 演算子 引数2」という命令が、最大3つの「番地」(変数・一時変数の名前)を参照することに由来する。

## 仕組み

1. 構文木を、子から親へ向かって(ボトムアップに)走査する
2. 複雑な式のサブツリー(例えば`(a + b) * c`)を処理する際、その部分式の途中結果を保持するための**一時変数**(`t1`、`t2`のような、コンパイラが自動的に導入する変数)を新しく発行する
3. 各演算子ノードについて、その子ノードの計算結果(既に一時変数として得られているか、直接のオペランド)を使い、`tN = 左オペランド 演算子 右オペランド`という形の1つの3番地コード命令を生成する。例えば`(a + b) * c`は、`t1 = a + b`、`t2 = t1 * c`という2つの命令に分解される
4. 制御構造(if文、while文)は、条件分岐命令(`if 条件 goto ラベル`)と無条件分岐命令(`goto ラベル`)、ラベル定義の組み合わせに変換する——構文木の階層的な入れ子構造が、フラットな命令列とジャンプ命令の組み合わせに展開される
5. こうして得られる3番地コードの列全体が、元のプログラムと意味的に等価な、より低レベルで均質な中間表現になる

## 特性・トレードオフ

- **計算量**: 構文木の各ノードを1回ずつ処理して定数個の命令を生成するだけなので、木のノード数`n`に対して`O(n)`
- **最適化のしやすさ**: 全ての命令が「演算子1つ、オペランド2つ」という均質な形式に統一されているため、[定数畳み込み](/algorithms/constant-folding)や[不要コード除去](/algorithms/dead-code-elimination)のような最適化パスを、命令列に対する一様な走査・書き換えとして実装しやすくなる。木構造のままでは各ノードの種類ごとに個別の処理が必要になりがちだが、3番地コードはこれを均一化する
- **機械語への近さと抽象度のバランス**: 実際のCPUの命令(レジスタ、メモリアドレス)とは異なり、一時変数の数を無制限に使える抽象的な表現になっている。この後、[レジスタ割り当て](/algorithms/register-allocation-graph-coloring)によって、無数にある一時変数を有限個の実レジスタへ効率的に割り当てる処理が必要になる
- **使いどころ**: コンパイラのフロントエンド(構文解析)とバックエンド(コード生成・最適化)を繋ぐ中間表現として、GCCやLLVMをはじめほぼ全ての実用コンパイラで採用されている基本的な設計パターン。制御フローグラフ(基本ブロックとジャンプの関係)の構築の土台にもなる

## 実装例

数値・変数・二項演算・代入・if・whileを表す小さなASTから3番地コードを生成する実装例。`(a + b) * c`という式、`if (a < b) {...} else {...}`という分岐、`while (i < n) {...}`というループの3パターンについて、生成されたコード列が期待する命令列と一致することを検証している。

```python
from __future__ import annotations
from abc import ABC, abstractmethod


class Node(ABC):
    pass


class Num(Node):
    def __init__(self, value: int) -> None:
        self.value = value


class Var(Node):
    def __init__(self, name: str) -> None:
        self.name = name


class BinOp(Node):
    def __init__(self, op: str, left: Node, right: Node) -> None:
        self.op = op
        self.left = left
        self.right = right


class Assign(Node):
    def __init__(self, name: str, expr: Node) -> None:
        self.name = name
        self.expr = expr


class If(Node):
    def __init__(self, cond: Node, then_stmts: list[Node], else_stmts: list[Node]) -> None:
        self.cond = cond
        self.then_stmts = then_stmts
        self.else_stmts = else_stmts


class While(Node):
    def __init__(self, cond: Node, body: list[Node]) -> None:
        self.cond = cond
        self.body = body


class TacGenerator:
    def __init__(self) -> None:
        self.code: list[str] = []
        self.temp_count = 0
        self.label_count = 0

    def new_temp(self) -> str:
        self.temp_count += 1
        return f"t{self.temp_count}"

    def new_label(self) -> str:
        self.label_count += 1
        return f"L{self.label_count}"

    def gen_expr(self, node: Node) -> str:
        """式を評価し、結果を保持する場所(変数名/一時変数名)を返す"""
        if isinstance(node, Num):
            return str(node.value)
        if isinstance(node, Var):
            return node.name
        if isinstance(node, BinOp):
            left = self.gen_expr(node.left)
            right = self.gen_expr(node.right)
            temp = self.new_temp()
            self.code.append(f"{temp} = {left} {node.op} {right}")
            return temp
        raise TypeError(f"gen_expr: unsupported node {node}")

    def gen_stmt(self, node: Node) -> None:
        if isinstance(node, Assign):
            place = self.gen_expr(node.expr)
            self.code.append(f"{node.name} = {place}")
        elif isinstance(node, If):
            cond_place = self.gen_expr(node.cond)
            else_label = self.new_label()
            end_label = self.new_label()
            self.code.append(f"ifFalse {cond_place} goto {else_label}")
            for s in node.then_stmts:
                self.gen_stmt(s)
            self.code.append(f"goto {end_label}")
            self.code.append(f"{else_label}:")
            for s in node.else_stmts:
                self.gen_stmt(s)
            self.code.append(f"{end_label}:")
        elif isinstance(node, While):
            start_label = self.new_label()
            end_label = self.new_label()
            self.code.append(f"{start_label}:")
            cond_place = self.gen_expr(node.cond)
            self.code.append(f"ifFalse {cond_place} goto {end_label}")
            for s in node.body:
                self.gen_stmt(s)
            self.code.append(f"goto {start_label}")
            self.code.append(f"{end_label}:")
        else:
            raise TypeError(f"gen_stmt: unsupported node {node}")


def generate(stmts: list[Node]) -> list[str]:
    gen = TacGenerator()
    for s in stmts:
        gen.gen_stmt(s)
    return gen.code
```

```typescript
type Node = Num | Var | BinOp | Assign | If | While;

class Num {
  kind = "Num" as const;
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}
class Var {
  kind = "Var" as const;
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
class BinOp {
  kind = "BinOp" as const;
  op: string;
  left: Node;
  right: Node;
  constructor(op: string, left: Node, right: Node) {
    this.op = op;
    this.left = left;
    this.right = right;
  }
}
class Assign {
  kind = "Assign" as const;
  name: string;
  expr: Node;
  constructor(name: string, expr: Node) {
    this.name = name;
    this.expr = expr;
  }
}
class If {
  kind = "If" as const;
  cond: Node;
  thenStmts: Node[];
  elseStmts: Node[];
  constructor(cond: Node, thenStmts: Node[], elseStmts: Node[]) {
    this.cond = cond;
    this.thenStmts = thenStmts;
    this.elseStmts = elseStmts;
  }
}
class While {
  kind = "While" as const;
  cond: Node;
  body: Node[];
  constructor(cond: Node, body: Node[]) {
    this.cond = cond;
    this.body = body;
  }
}

class TacGenerator {
  code: string[] = [];
  private tempCount = 0;
  private labelCount = 0;

  newTemp(): string {
    this.tempCount++;
    return `t${this.tempCount}`;
  }

  newLabel(): string {
    this.labelCount++;
    return `L${this.labelCount}`;
  }

  genExpr(node: Node): string {
    if (node.kind === "Num") return String(node.value);
    if (node.kind === "Var") return node.name;
    if (node.kind === "BinOp") {
      const left = this.genExpr(node.left);
      const right = this.genExpr(node.right);
      const temp = this.newTemp();
      this.code.push(`${temp} = ${left} ${node.op} ${right}`);
      return temp;
    }
    throw new TypeError("genExpr: unsupported node");
  }

  genStmt(node: Node): void {
    if (node.kind === "Assign") {
      const place = this.genExpr(node.expr);
      this.code.push(`${node.name} = ${place}`);
    } else if (node.kind === "If") {
      const condPlace = this.genExpr(node.cond);
      const elseLabel = this.newLabel();
      const endLabel = this.newLabel();
      this.code.push(`ifFalse ${condPlace} goto ${elseLabel}`);
      for (const s of node.thenStmts) this.genStmt(s);
      this.code.push(`goto ${endLabel}`);
      this.code.push(`${elseLabel}:`);
      for (const s of node.elseStmts) this.genStmt(s);
      this.code.push(`${endLabel}:`);
    } else if (node.kind === "While") {
      const startLabel = this.newLabel();
      const endLabel = this.newLabel();
      this.code.push(`${startLabel}:`);
      const condPlace = this.genExpr(node.cond);
      this.code.push(`ifFalse ${condPlace} goto ${endLabel}`);
      for (const s of node.body) this.genStmt(s);
      this.code.push(`goto ${startLabel}`);
      this.code.push(`${endLabel}:`);
    } else {
      throw new TypeError("genStmt: unsupported node");
    }
  }
}

function generate(stmts: Node[]): string[] {
  const gen = new TacGenerator();
  for (const s of stmts) gen.genStmt(s);
  return gen.code;
}
```

```cpp
#include <string>
#include <vector>
#include <memory>
#include <stdexcept>

struct Node { virtual ~Node() = default; };
using NodePtr = std::shared_ptr<Node>;

struct NumNode : Node { int value; explicit NumNode(int v) : value(v) {} };
struct VarNode : Node { std::string name; explicit VarNode(std::string n) : name(std::move(n)) {} };
struct BinOpNode : Node {
    std::string op;
    NodePtr left, right;
    BinOpNode(std::string op, NodePtr l, NodePtr r) : op(std::move(op)), left(std::move(l)), right(std::move(r)) {}
};
struct AssignNode : Node {
    std::string name;
    NodePtr expr;
    AssignNode(std::string n, NodePtr e) : name(std::move(n)), expr(std::move(e)) {}
};
struct IfNode : Node {
    NodePtr cond;
    std::vector<NodePtr> thenStmts, elseStmts;
    IfNode(NodePtr c, std::vector<NodePtr> t, std::vector<NodePtr> e)
        : cond(std::move(c)), thenStmts(std::move(t)), elseStmts(std::move(e)) {}
};
struct WhileNode : Node {
    NodePtr cond;
    std::vector<NodePtr> body;
    WhileNode(NodePtr c, std::vector<NodePtr> b) : cond(std::move(c)), body(std::move(b)) {}
};

class TacGenerator {
public:
    std::vector<std::string> code;

    std::string genExpr(const NodePtr& node) {
        if (auto n = std::dynamic_pointer_cast<NumNode>(node)) return std::to_string(n->value);
        if (auto v = std::dynamic_pointer_cast<VarNode>(node)) return v->name;
        if (auto b = std::dynamic_pointer_cast<BinOpNode>(node)) {
            std::string left = genExpr(b->left);
            std::string right = genExpr(b->right);
            std::string temp = newTemp();
            code.push_back(temp + " = " + left + " " + b->op + " " + right);
            return temp;
        }
        throw std::runtime_error("genExpr: unsupported node");
    }

    void genStmt(const NodePtr& node) {
        if (auto a = std::dynamic_pointer_cast<AssignNode>(node)) {
            std::string place = genExpr(a->expr);
            code.push_back(a->name + " = " + place);
        } else if (auto ifn = std::dynamic_pointer_cast<IfNode>(node)) {
            std::string condPlace = genExpr(ifn->cond);
            std::string elseLabel = newLabel();
            std::string endLabel = newLabel();
            code.push_back("ifFalse " + condPlace + " goto " + elseLabel);
            for (auto& s : ifn->thenStmts) genStmt(s);
            code.push_back("goto " + endLabel);
            code.push_back(elseLabel + ":");
            for (auto& s : ifn->elseStmts) genStmt(s);
            code.push_back(endLabel + ":");
        } else if (auto w = std::dynamic_pointer_cast<WhileNode>(node)) {
            std::string startLabel = newLabel();
            std::string endLabel = newLabel();
            code.push_back(startLabel + ":");
            std::string condPlace = genExpr(w->cond);
            code.push_back("ifFalse " + condPlace + " goto " + endLabel);
            for (auto& s : w->body) genStmt(s);
            code.push_back("goto " + startLabel);
            code.push_back(endLabel + ":");
        } else {
            throw std::runtime_error("genStmt: unsupported node");
        }
    }

private:
    int tempCount = 0;
    int labelCount = 0;
    std::string newTemp() { return "t" + std::to_string(++tempCount); }
    std::string newLabel() { return "L" + std::to_string(++labelCount); }
};

std::vector<std::string> generate(const std::vector<NodePtr>& stmts) {
    TacGenerator gen;
    for (auto& s : stmts) gen.genStmt(s);
    return gen.code;
}
```

```rust
enum Node {
    Num(i64),
    Var(String),
    BinOp(String, Box<Node>, Box<Node>),
    Assign(String, Box<Node>),
    If(Box<Node>, Vec<Node>, Vec<Node>),
    While(Box<Node>, Vec<Node>),
}

struct TacGenerator {
    code: Vec<String>,
    temp_count: u32,
    label_count: u32,
}

impl TacGenerator {
    fn new() -> Self {
        TacGenerator { code: Vec::new(), temp_count: 0, label_count: 0 }
    }

    fn new_temp(&mut self) -> String {
        self.temp_count += 1;
        format!("t{}", self.temp_count)
    }

    fn new_label(&mut self) -> String {
        self.label_count += 1;
        format!("L{}", self.label_count)
    }

    fn gen_expr(&mut self, node: &Node) -> String {
        match node {
            Node::Num(v) => v.to_string(),
            Node::Var(name) => name.clone(),
            Node::BinOp(op, left, right) => {
                let l = self.gen_expr(left);
                let r = self.gen_expr(right);
                let temp = self.new_temp();
                self.code.push(format!("{} = {} {} {}", temp, l, op, r));
                temp
            }
            _ => panic!("gen_expr: unsupported node"),
        }
    }

    fn gen_stmt(&mut self, node: &Node) {
        match node {
            Node::Assign(name, expr) => {
                let place = self.gen_expr(expr);
                self.code.push(format!("{} = {}", name, place));
            }
            Node::If(cond, then_stmts, else_stmts) => {
                let cond_place = self.gen_expr(cond);
                let else_label = self.new_label();
                let end_label = self.new_label();
                self.code.push(format!("ifFalse {} goto {}", cond_place, else_label));
                for s in then_stmts {
                    self.gen_stmt(s);
                }
                self.code.push(format!("goto {}", end_label));
                self.code.push(format!("{}:", else_label));
                for s in else_stmts {
                    self.gen_stmt(s);
                }
                self.code.push(format!("{}:", end_label));
            }
            Node::While(cond, body) => {
                let start_label = self.new_label();
                let end_label = self.new_label();
                self.code.push(format!("{}:", start_label));
                let cond_place = self.gen_expr(cond);
                self.code.push(format!("ifFalse {} goto {}", cond_place, end_label));
                for s in body {
                    self.gen_stmt(s);
                }
                self.code.push(format!("goto {}", start_label));
                self.code.push(format!("{}:", end_label));
            }
            _ => panic!("gen_stmt: unsupported node"),
        }
    }
}

fn generate(stmts: &[Node]) -> Vec<String> {
    let mut gen = TacGenerator::new();
    for s in stmts {
        gen.gen_stmt(s);
    }
    gen.code
}
```

```csharp
abstract class Node { }
class Num : Node { public int Value; public Num(int v) { Value = v; } }
class Var : Node { public string Name; public Var(string n) { Name = n; } }
class BinOp : Node { public string Op; public Node Left, Right; public BinOp(string op, Node l, Node r) { Op = op; Left = l; Right = r; } }
class Assign : Node { public string Name; public Node Expr; public Assign(string n, Node e) { Name = n; Expr = e; } }
class If : Node { public Node Cond; public List<Node> ThenStmts, ElseStmts; public If(Node c, List<Node> t, List<Node> e) { Cond = c; ThenStmts = t; ElseStmts = e; } }
class While : Node { public Node Cond; public List<Node> Body; public While(Node c, List<Node> b) { Cond = c; Body = b; } }

class TacGenerator
{
    public List<string> Code = new();
    private int tempCount = 0;
    private int labelCount = 0;

    string NewTemp() => $"t{++tempCount}";
    string NewLabel() => $"L{++labelCount}";

    public string GenExpr(Node node)
    {
        switch (node)
        {
            case Num n: return n.Value.ToString();
            case Var v: return v.Name;
            case BinOp b:
                var left = GenExpr(b.Left);
                var right = GenExpr(b.Right);
                var temp = NewTemp();
                Code.Add($"{temp} = {left} {b.Op} {right}");
                return temp;
            default: throw new InvalidOperationException("unsupported node");
        }
    }

    public void GenStmt(Node node)
    {
        switch (node)
        {
            case Assign a:
                var place = GenExpr(a.Expr);
                Code.Add($"{a.Name} = {place}");
                break;
            case If ifn:
                var condPlace = GenExpr(ifn.Cond);
                var elseLabel = NewLabel();
                var endLabel = NewLabel();
                Code.Add($"ifFalse {condPlace} goto {elseLabel}");
                foreach (var s in ifn.ThenStmts) GenStmt(s);
                Code.Add($"goto {endLabel}");
                Code.Add($"{elseLabel}:");
                foreach (var s in ifn.ElseStmts) GenStmt(s);
                Code.Add($"{endLabel}:");
                break;
            case While w:
                var startLabel = NewLabel();
                var wEndLabel = NewLabel();
                Code.Add($"{startLabel}:");
                var wCondPlace = GenExpr(w.Cond);
                Code.Add($"ifFalse {wCondPlace} goto {wEndLabel}");
                foreach (var s in w.Body) GenStmt(s);
                Code.Add($"goto {startLabel}");
                Code.Add($"{wEndLabel}:");
                break;
            default: throw new InvalidOperationException("unsupported node");
        }
    }
}

static List<string> Generate(List<Node> stmts)
{
    var gen = new TacGenerator();
    foreach (var s in stmts) gen.GenStmt(s);
    return gen.Code;
}
```
