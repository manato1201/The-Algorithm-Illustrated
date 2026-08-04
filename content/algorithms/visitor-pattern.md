---
name: Visitor(ビジター)
category: デザインパターン
subcategory: 振る舞い
complexity: 振る舞いに関するパターン
summary: データ構造とその上で行う操作を分離し、既存クラスを変更せずに新しい操作を追加できるようにする。
---
## 概要

複数の異なる型を持つ要素からなるデータ構造(木構造やAST=抽象構文木など)に対して、**その構造(要素クラス群)を変更せずに新しい操作を追加できるようにする**ふるまいパターン。通常、要素の種類ごとに処理を分岐させたい場合は各要素クラスにメソッドを追加するが、そのたびに全要素クラスを修正するのはコストが高い。Visitorは「要素側は`accept(visitor)`を1つ持つだけ」にしておき、実際の処理ロジックは外部の「訪問者(Visitor)」クラス側に置くことで、新しい操作の追加を訪問者クラスの追加だけで完結させる。

## 仕組み

1. データ構造を構成する各要素クラス(`NumberNode`、`AddNode`など)に、共通の`accept(visitor)`メソッドを実装させる。このメソッドの中身は`visitor.visitNumberNode(this)`のように、**自分自身の具体的な型に対応するvisitメソッドを呼び返す**だけ(この「呼び返し」の仕組みをダブルディスパッチと呼ぶ)
2. Visitorインターフェースには、対応しうる要素の型ごとに`visitNumberNode()`、`visitAddNode()`のようなメソッドを1つずつ宣言する
3. 具体的な操作(「式を評価する」「式を文字列化する」「式の中の定数を最適化する」)ごとに、Visitorインターフェースを実装する具体的なVisitorクラスを作る
4. データ構造を走査する際、各要素の`accept(visitor)`を呼ぶだけで、要素の具体的な型に応じた正しいvisitメソッドが呼ばれる(要素側が自分の型を`if`文で判定する必要が一切ない)
5. 新しい操作(新しいVisitor)を追加する際、既存の要素クラス群には一切手を入れず、新しいVisitorクラスを1つ追加するだけで済む

## 特性・トレードオフ

- **新しい操作の追加が容易**: データ構造(要素クラス群)を固定したまま、新しい処理ロジックをVisitorクラスの追加だけで実現できる。コンパイラのAST処理(型チェック・コード生成・最適化をそれぞれ別のVisitorとして実装する)は典型的な適用例
- **新しい要素型の追加が困難というトレードオフ**: 逆に、データ構造側に新しい要素の型(`SubtractNode`など)を追加する場合は、既存の全てのVisitor実装クラスに対応するvisitメソッドを追加しなければならず、Factory Methodなど「新しい種類の追加が容易」なパターンとは正反対の特性を持つ。「要素の種類は安定していて、操作の種類が増えていく」場面に向いている
- **カプセル化の一部を犠牲にする**: Visitorが要素の内部データにアクセスして処理する必要があるため、要素側が本来隠しておきたい内部状態をある程度公開せざるを得なくなることがある
- **ダブルディスパッチという実装上の工夫**: 多くのオブジェクト指向言語は引数の実行時型に基づく多重ディスパッチを標準でサポートしないため、`accept`→`visit`という2段階の呼び出しでこれを人為的に実現している
- **使いどころ**: コンパイラ・インタプリタのAST処理(型チェック、最適化、コード生成)、ドキュメント構造(HTML DOM、XMLツリー)に対する複数の走査処理(バリデーション、シリアライズ、レンダリング)、静的解析ツールにおけるコード構造の巡回処理など

## 実装例

`NumberNode`・`AddNode`という2種類の要素からなる式木`(1 + 2) + 3`に対して、「評価する」Visitorと「文字列化する」Visitorをそれぞれ要素クラスを一切変更せずに追加する。

```python
from abc import ABC, abstractmethod


class ExprNode(ABC):
    @abstractmethod
    def accept(self, visitor):
        ...


class NumberNode(ExprNode):
    def __init__(self, value):
        self.value = value

    def accept(self, visitor):
        return visitor.visit_number_node(self)


class AddNode(ExprNode):
    def __init__(self, left, right):
        self.left = left
        self.right = right

    def accept(self, visitor):
        return visitor.visit_add_node(self)


class EvaluateVisitor:
    def visit_number_node(self, node):
        return node.value

    def visit_add_node(self, node):
        return node.left.accept(self) + node.right.accept(self)


class PrintVisitor:
    def visit_number_node(self, node):
        return str(node.value)

    def visit_add_node(self, node):
        return f"({node.left.accept(self)} + {node.right.accept(self)})"


def demo():
    tree = AddNode(AddNode(NumberNode(1), NumberNode(2)), NumberNode(3))
    value = tree.accept(EvaluateVisitor())
    text = tree.accept(PrintVisitor())
    return value, text  # (6, "((1 + 2) + 3)")
```

```typescript
interface Visitor<T> {
  visitNumberNode(node: NumberNode): T;
  visitAddNode(node: AddNode): T;
}

interface ExprNode {
  accept<T>(visitor: Visitor<T>): T;
}

class NumberNode implements ExprNode {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitNumberNode(this);
  }
}

class AddNode implements ExprNode {
  left: ExprNode;
  right: ExprNode;
  constructor(left: ExprNode, right: ExprNode) {
    this.left = left;
    this.right = right;
  }
  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitAddNode(this);
  }
}

class EvaluateVisitor implements Visitor<number> {
  visitNumberNode(node: NumberNode): number {
    return node.value;
  }
  visitAddNode(node: AddNode): number {
    return node.left.accept(this) + node.right.accept(this);
  }
}

class PrintVisitor implements Visitor<string> {
  visitNumberNode(node: NumberNode): string {
    return String(node.value);
  }
  visitAddNode(node: AddNode): string {
    return `(${node.left.accept(this)} + ${node.right.accept(this)})`;
  }
}

function demo(): [number, string] {
  const tree: ExprNode = new AddNode(new AddNode(new NumberNode(1), new NumberNode(2)), new NumberNode(3));
  const value = tree.accept(new EvaluateVisitor());
  const text = tree.accept(new PrintVisitor());
  return [value, text]; // [6, "((1 + 2) + 3)"]
}
```

```cpp
#include <memory>
#include <string>

class NumberNode;
class AddNode;

struct Visitor {
    virtual void visitNumberNode(const NumberNode& node) = 0;
    virtual void visitAddNode(const AddNode& node) = 0;
    virtual ~Visitor() = default;
};

struct ExprNode {
    virtual void accept(Visitor& visitor) const = 0;
    virtual ~ExprNode() = default;
};

class NumberNode : public ExprNode {
public:
    double value;
    explicit NumberNode(double v) : value(v) {}
    void accept(Visitor& visitor) const override { visitor.visitNumberNode(*this); }
};

class AddNode : public ExprNode {
public:
    std::unique_ptr<ExprNode> left, right;
    AddNode(std::unique_ptr<ExprNode> l, std::unique_ptr<ExprNode> r) : left(std::move(l)), right(std::move(r)) {}
    void accept(Visitor& visitor) const override { visitor.visitAddNode(*this); }
};

// 結果はvisitor自身に蓄積する(C++にはVisitor<T>のような戻り値の型引数を
// 仮想関数に持たせられないため、この形が標準的なイディオムになる)
class EvaluateVisitor : public Visitor {
public:
    double result = 0;
    void visitNumberNode(const NumberNode& node) override { result = node.value; }
    void visitAddNode(const AddNode& node) override {
        node.left->accept(*this);
        double left = result;
        node.right->accept(*this);
        result = left + result;
    }
};

class PrintVisitor : public Visitor {
public:
    std::string result;
    void visitNumberNode(const NumberNode& node) override {
        result = std::to_string(static_cast<long long>(node.value));
    }
    void visitAddNode(const AddNode& node) override {
        node.left->accept(*this);
        std::string left = result;
        node.right->accept(*this);
        result = "(" + left + " + " + result + ")";
    }
};
```

```rust
trait Visitor<T> {
    fn visit_number_node(&mut self, node: &NumberNode) -> T;
    fn visit_add_node(&mut self, node: &AddNode) -> T;
}

enum ExprNode {
    Number(NumberNode),
    Add(AddNode),
}

impl ExprNode {
    fn accept<T>(&self, visitor: &mut dyn Visitor<T>) -> T {
        match self {
            ExprNode::Number(n) => visitor.visit_number_node(n),
            ExprNode::Add(a) => visitor.visit_add_node(a),
        }
    }
}

struct NumberNode {
    value: f64,
}

struct AddNode {
    left: Box<ExprNode>,
    right: Box<ExprNode>,
}

struct EvaluateVisitor;

impl Visitor<f64> for EvaluateVisitor {
    fn visit_number_node(&mut self, node: &NumberNode) -> f64 {
        node.value
    }
    fn visit_add_node(&mut self, node: &AddNode) -> f64 {
        node.left.accept(self) + node.right.accept(self)
    }
}

struct PrintVisitor;

impl Visitor<String> for PrintVisitor {
    fn visit_number_node(&mut self, node: &NumberNode) -> String {
        node.value.to_string()
    }
    fn visit_add_node(&mut self, node: &AddNode) -> String {
        format!("({} + {})", node.left.accept(self), node.right.accept(self))
    }
}

fn demo() -> (f64, String) {
    let tree = ExprNode::Add(AddNode {
        left: Box::new(ExprNode::Add(AddNode {
            left: Box::new(ExprNode::Number(NumberNode { value: 1.0 })),
            right: Box::new(ExprNode::Number(NumberNode { value: 2.0 })),
        })),
        right: Box::new(ExprNode::Number(NumberNode { value: 3.0 })),
    });
    let value = tree.accept(&mut EvaluateVisitor);
    let text = tree.accept(&mut PrintVisitor);
    (value, text) // (6.0, "((1 + 2) + 3)")
}
```

```csharp
interface IVisitor<T>
{
    T VisitNumberNode(NumberNode node);
    T VisitAddNode(AddNode node);
}

interface IExprNode
{
    T Accept<T>(IVisitor<T> visitor);
}

class NumberNode : IExprNode
{
    public double Value;
    public NumberNode(double value) { Value = value; }
    public T Accept<T>(IVisitor<T> visitor) => visitor.VisitNumberNode(this);
}

class AddNode : IExprNode
{
    public IExprNode Left, Right;
    public AddNode(IExprNode left, IExprNode right) { Left = left; Right = right; }
    public T Accept<T>(IVisitor<T> visitor) => visitor.VisitAddNode(this);
}

class EvaluateVisitor : IVisitor<double>
{
    public double VisitNumberNode(NumberNode node) => node.Value;
    public double VisitAddNode(AddNode node) => node.Left.Accept(this) + node.Right.Accept(this);
}

class PrintVisitor : IVisitor<string>
{
    public string VisitNumberNode(NumberNode node) => node.Value.ToString();
    public string VisitAddNode(AddNode node) => $"({node.Left.Accept(this)} + {node.Right.Accept(this)})";
}

static class VisitorDemo
{
    public static (double Value, string Text) Demo()
    {
        IExprNode tree = new AddNode(new AddNode(new NumberNode(1), new NumberNode(2)), new NumberNode(3));
        double value = tree.Accept(new EvaluateVisitor());
        string text = tree.Accept(new PrintVisitor());
        return (value, text); // (6, "((1 + 2) + 3)")
    }
}
```
