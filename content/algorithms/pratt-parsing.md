---
name: Pratt構文解析(トップダウン演算子優先順位解析)
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: O(n)(nはトークン数)
summary: 各トークンに「前置として現れたときの処理」と「中置として現れたときの結合力」を持たせることで、優先順位や結合則の異なる多様な演算子を再帰下降の枠組みの中で簡潔に扱う構文解析法。
---

## 概要

[操車場アルゴリズム](/algorithms/shunting-yard-algorithm)は算術式の中置演算子をスタックで処理するが、前置演算子(単項マイナス`-x`)、後置演算子(階乗`x!`)、三項演算子(`a ? b : c`)、関数呼び出しなど、より多様な構文要素を含む式を扱うには力不足になる。1973年にヴォーン・プラットが発表したPratt構文解析は、[再帰下降構文解析](/algorithms/recursive-descent-parsing)の枠組みの中に「演算子の優先順位」という数値の比較を組み込むことで、これらの多様な構文要素を統一的かつ簡潔に扱えるようにした、実用のインタプリタで広く採用されている手法である。

## 仕組み

1. 各トークン(演算子や識別子)に対して、「前置位置(式の先頭)に現れたときにどう構文木のノードを作るか」を定める**nud**(null denotation)関数と、「中置位置(既に読んだ左側の式の後)に現れたときにどう構文木のノードを作るか」を定める**led**(left denotation)関数、そして中置演算子としての**結合力**(優先順位を表す数値)を割り当てる
2. 式を解析する中心の関数`parseExpression(最小結合力)`は、まず現在のトークンの`nud`を呼んで左側の式を得る
3. その後、次のトークンが中置演算子であり、かつその演算子の結合力が引数の`最小結合力`より大きい間、その演算子の`led`関数を呼び出す。`led`関数は通常、右側の部分式を`parseExpression(自分の結合力)`で再帰的に解析し、左側の式と組み合わせて新しいノードを作る
4. この「今の演算子の結合力が、これから読もうとしている外側の文脈の最小結合力を上回っているか」というシンプルな数値比較だけで、`3 + 4 * 2`のような優先順位の異なる演算子の混在や、`2 ^ 3 ^ 2`のような右結合の演算子(結合力の比較で`+1`か`-1`かをずらすだけで右結合・左結合を切り替えられる)を統一的に扱える

## 特性・トレードオフ

- **計算量**: [再帰下降構文解析](/algorithms/recursive-descent-parsing)と同じく、各トークンを定数回処理するだけなので`O(n)`
- **[操車場アルゴリズム](/algorithms/shunting-yard-algorithm)からの一般化**: 操車場アルゴリズムがスタックによる反復処理で中置演算子だけを扱うのに対し、Pratt構文解析は再帰呼び出しを使うことで前置・中置・後置演算子、さらには関数呼び出しの引数リストのような複雑な構文まで、同じ「結合力」という単一の概念で統一的に表現できる
- **拡張性の高さ**: 新しい演算子を追加したいとき、対応する`nud`/`led`関数と結合力を1つ登録するだけで済む(演算子ごとに解析ロジック全体を書き換える必要がない)。この拡張のしやすさから、電卓やDSL(ドメイン特化言語)のような「後から演算子を足したくなる」インタプリタの実装でよく採用される
- **使いどころ**: プログラミング言語処理系における式(expression)の解析、正規表現エンジンや設定ファイル言語のような小規模なDSLのパーサ実装。JavaScriptエンジンV8の一部やPythonの一部の実装など、実務のコンパイラ・インタプリタでも採用例が多い、実践的でバランスの取れた構文解析技法

## 実装例

`+` `-` `*` `/` `^`(右結合)と単項マイナス・括弧を持つ四則演算式を評価する。`2 ^ 3 ^ 2`が右結合により`2^(3^2)=512`と評価され、`(2^3)^2=64`にならないことを確認している。

```python
import re


class Parser:
    # 中置演算子の結合力: (左結合力, 右結合力)。^だけ右結合力を左結合力より小さくして右結合にする
    INFIX_BP = {
        "+": (10, 11), "-": (10, 11),
        "*": (20, 21), "/": (20, 21),
        "^": (31, 30),
    }

    def __init__(self, tokens: list[str]) -> None:
        self.tokens = tokens
        self.pos = 0

    def peek(self) -> str | None:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def next(self) -> str:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def parse_expression(self, min_bp: int = 0) -> float:
        left = self.nud()
        while True:
            tok = self.peek()
            if tok is None or tok not in self.INFIX_BP:
                break
            left_bp, right_bp = self.INFIX_BP[tok]
            if left_bp < min_bp:
                break
            self.next()
            right = self.parse_expression(right_bp)
            left = self.apply_op(tok, left, right)
        return left

    def nud(self) -> float:
        """前置位置に現れたトークンの処理(null denotation)。"""
        tok = self.next()
        if tok == "-":
            return -self.parse_expression(25)  # 単項マイナスは+-より強く結合する
        if tok == "(":
            value = self.parse_expression(0)
            if self.next() != ")":
                raise ValueError("expected ')'")
            return value
        return float(tok)

    def apply_op(self, op: str, left: float, right: float) -> float:
        return {"+": left + right, "-": left - right, "*": left * right,
                "/": left / right, "^": left ** right}[op]


def tokenize(expr: str) -> list[str]:
    return re.findall(r"\d+\.\d+|\d+|[()+\-*/^]", expr.replace(" ", ""))


def evaluate(expr: str) -> float:
    parser = Parser(tokenize(expr))
    result = parser.parse_expression(0)
    if parser.pos != len(parser.tokens):
        raise ValueError("unexpected trailing tokens")
    return result
```

```typescript
const INFIX_BP: Record<string, [number, number]> = {
  "+": [10, 11], "-": [10, 11],
  "*": [20, 21], "/": [20, 21],
  "^": [31, 30], // 右結合: 右結合力 < 左結合力
};

class Parser {
  tokens: string[];
  pos = 0;
  constructor(tokens: string[]) {
    this.tokens = tokens;
  }
  peek(): string | undefined {
    return this.tokens[this.pos];
  }
  next(): string {
    return this.tokens[this.pos++];
  }
  parseExpression(minBp: number): number {
    let left = this.nud();
    for (;;) {
      const tok = this.peek();
      if (tok === undefined || !(tok in INFIX_BP)) break;
      const [leftBp, rightBp] = INFIX_BP[tok];
      if (leftBp < minBp) break;
      this.next();
      const right = this.parseExpression(rightBp);
      left = this.applyOp(tok, left, right);
    }
    return left;
  }
  nud(): number {
    const tok = this.next();
    if (tok === "-") return -this.parseExpression(25);
    if (tok === "(") {
      const value = this.parseExpression(0);
      if (this.next() !== ")") throw new Error("expected ')'");
      return value;
    }
    return parseFloat(tok);
  }
  applyOp(op: string, left: number, right: number): number {
    switch (op) {
      case "+": return left + right;
      case "-": return left - right;
      case "*": return left * right;
      case "/": return left / right;
      case "^": return Math.pow(left, right);
      default: throw new Error(`unknown operator ${op}`);
    }
  }
}

function tokenize(expr: string): string[] {
  return expr.replace(/\s+/g, "").match(/\d+\.\d+|\d+|[()+\-*/^]/g) ?? [];
}

function evaluate(expr: string): number {
  const parser = new Parser(tokenize(expr));
  const result = parser.parseExpression(0);
  if (parser.pos !== parser.tokens.length) throw new Error("unexpected trailing tokens");
  return result;
}
```

```cpp
#include <string>
#include <vector>
#include <map>
#include <regex>
#include <cmath>
#include <stdexcept>

class Parser {
public:
    std::vector<std::string> tokens;
    size_t pos = 0;

    explicit Parser(std::vector<std::string> tokens) : tokens(std::move(tokens)) {}

    std::map<std::string, std::pair<int, int>> infixBp = {
        {"+", {10, 11}}, {"-", {10, 11}}, {"*", {20, 21}}, {"/", {20, 21}}, {"^", {31, 30}},
    };

    std::string next() { return tokens[pos++]; }
    bool hasNext() const { return pos < tokens.size(); }
    std::string peek() const { return hasNext() ? tokens[pos] : ""; }

    double parseExpression(int minBp) {
        double left = nud();
        while (hasNext()) {
            std::string tok = peek();
            auto it = infixBp.find(tok);
            if (it == infixBp.end()) break;
            auto [leftBp, rightBp] = it->second;
            if (leftBp < minBp) break;
            next();
            double right = parseExpression(rightBp);
            left = applyOp(tok, left, right);
        }
        return left;
    }

    double nud() {
        std::string tok = next();
        if (tok == "-") return -parseExpression(25);
        if (tok == "(") {
            double value = parseExpression(0);
            if (next() != ")") throw std::runtime_error("expected ')'");
            return value;
        }
        return std::stod(tok);
    }

    static double applyOp(const std::string& op, double left, double right) {
        if (op == "+") return left + right;
        if (op == "-") return left - right;
        if (op == "*") return left * right;
        if (op == "/") return left / right;
        if (op == "^") return std::pow(left, right);
        throw std::runtime_error("unknown operator " + op);
    }
};

std::vector<std::string> tokenize(const std::string& expr) {
    std::string stripped;
    for (char c : expr) if (!std::isspace(static_cast<unsigned char>(c))) stripped += c;
    std::regex re(R"(\d+\.\d+|\d+|[()+\-*/^])");
    std::vector<std::string> tokens;
    for (auto it = std::sregex_iterator(stripped.begin(), stripped.end(), re); it != std::sregex_iterator(); ++it)
        tokens.push_back(it->str());
    return tokens;
}

double evaluate(const std::string& expr) {
    Parser parser(tokenize(expr));
    double result = parser.parseExpression(0);
    if (parser.pos != parser.tokens.size()) throw std::runtime_error("unexpected trailing tokens");
    return result;
}
```

```rust
use std::collections::HashMap;

struct Parser {
    tokens: Vec<String>,
    pos: usize,
    infix_bp: HashMap<&'static str, (u8, u8)>,
}

impl Parser {
    fn new(tokens: Vec<String>) -> Self {
        let infix_bp = HashMap::from([
            ("+", (10, 11)), ("-", (10, 11)),
            ("*", (20, 21)), ("/", (20, 21)),
            ("^", (31, 30)), // 右結合
        ]);
        Parser { tokens, pos: 0, infix_bp }
    }

    fn peek(&self) -> Option<&str> {
        self.tokens.get(self.pos).map(|s| s.as_str())
    }

    fn next(&mut self) -> String {
        let tok = self.tokens[self.pos].clone();
        self.pos += 1;
        tok
    }

    fn parse_expression(&mut self, min_bp: u8) -> f64 {
        let mut left = self.nud();
        loop {
            let tok = match self.peek() {
                Some(t) => t.to_string(),
                None => break,
            };
            let (left_bp, right_bp) = match self.infix_bp.get(tok.as_str()) {
                Some(&bp) => bp,
                None => break,
            };
            if left_bp < min_bp {
                break;
            }
            self.next();
            let right = self.parse_expression(right_bp);
            left = Self::apply_op(&tok, left, right);
        }
        left
    }

    fn nud(&mut self) -> f64 {
        let tok = self.next();
        if tok == "-" {
            return -self.parse_expression(25);
        }
        if tok == "(" {
            let value = self.parse_expression(0);
            if self.next() != ")" {
                panic!("expected ')'");
            }
            return value;
        }
        tok.parse().unwrap()
    }

    fn apply_op(op: &str, left: f64, right: f64) -> f64 {
        match op {
            "+" => left + right,
            "-" => left - right,
            "*" => left * right,
            "/" => left / right,
            "^" => left.powf(right),
            _ => panic!("unknown operator {op}"),
        }
    }
}

fn tokenize(expr: &str) -> Vec<String> {
    let stripped: String = expr.chars().filter(|c| !c.is_whitespace()).collect();
    let mut tokens = Vec::new();
    let chars: Vec<char> = stripped.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c.is_ascii_digit() {
            let start = i;
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                i += 1;
            }
            tokens.push(chars[start..i].iter().collect());
            continue;
        }
        if "()+-*/^".contains(c) {
            tokens.push(c.to_string());
        }
        i += 1;
    }
    tokens
}

fn evaluate(expr: &str) -> f64 {
    let mut parser = Parser::new(tokenize(expr));
    let result = parser.parse_expression(0);
    if parser.pos != parser.tokens.len() {
        panic!("unexpected trailing tokens");
    }
    result
}
```

```csharp
class Parser
{
    static readonly Dictionary<string, (int left, int right)> InfixBp = new()
    {
        ["+"] = (10, 11), ["-"] = (10, 11), ["*"] = (20, 21), ["/"] = (20, 21), ["^"] = (31, 30),
    };

    List<string> tokens; public int Pos = 0;
    public Parser(List<string> tokens) { this.tokens = tokens; }
    public string? Peek() => Pos < tokens.Count ? tokens[Pos] : null;
    public string Next() => tokens[Pos++];
    public int Count => tokens.Count;

    public double ParseExpression(int minBp)
    {
        double left = Nud();
        while (true)
        {
            var tok = Peek();
            if (tok == null || !InfixBp.ContainsKey(tok)) break;
            var (leftBp, rightBp) = InfixBp[tok];
            if (leftBp < minBp) break;
            Next();
            double right = ParseExpression(rightBp);
            left = ApplyOp(tok, left, right);
        }
        return left;
    }

    double Nud()
    {
        var tok = Next();
        if (tok == "-") return -ParseExpression(25);
        if (tok == "(")
        {
            double value = ParseExpression(0);
            if (Next() != ")") throw new Exception("expected ')'");
            return value;
        }
        return double.Parse(tok);
    }

    static double ApplyOp(string op, double left, double right) => op switch
    {
        "+" => left + right,
        "-" => left - right,
        "*" => left * right,
        "/" => left / right,
        "^" => Math.Pow(left, right),
        _ => throw new Exception($"unknown operator {op}"),
    };
}

static class PrattParser
{
    static List<string> Tokenize(string expr)
    {
        var tokens = new List<string>();
        var matches = System.Text.RegularExpressions.Regex.Matches(expr.Replace(" ", ""), @"\d+\.\d+|\d+|[()+\-*/^]");
        foreach (System.Text.RegularExpressions.Match m in matches) tokens.Add(m.Value);
        return tokens;
    }

    public static double Evaluate(string expr)
    {
        var parser = new Parser(Tokenize(expr));
        double result = parser.ParseExpression(0);
        if (parser.Pos != parser.Count) throw new Exception("unexpected trailing tokens");
        return result;
    }
}
```
