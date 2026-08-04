---
name: 再帰下降構文解析
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: O(n)(n はトークン数、バックトラックなしの場合)
summary: 文法規則1つひとつを対応する関数として素直に実装し、非終端記号ごとの相互再帰呼び出しで構文木を組み立てる、最も直感的で手書きしやすい構文解析法。
---

## 概要

プログラミング言語の文法(例えば「式は項の並びであり、項は因子の並びである」)は、しばしば「AはBとCから成る」という再帰的な規則の集まりとして定義される。再帰下降構文解析は、この文法規則をほぼそのままプログラムの関数に翻訳する、最も素直で理解しやすい構文解析の手法である——各非終端記号(「式」「項」「因子」など)に対応する1つの関数を書き、その関数の中で文法規則が指し示す通りに他の関数を呼び出す。手書きでコンパイラやインタプリタを実装する際、[LL(1)構文解析](/algorithms/ll1-parsing)のような表駆動の手法より直感的で、多くの実務のパーサ(JSONパーサ、設定ファイルパーサ等)がこの方式で書かれている。

## 仕組み

1. 文法の各非終端記号に対応する関数を定義する。例えば`式 → 項 (('+' | '-') 項)*`という規則なら、`parseExpression()`関数は「まず`parseTerm()`を呼んで最初の項を読み、その後`+`か`-`が続く限り、演算子を読んで再び`parseTerm()`を呼ぶ」という手続きになる
2. 各関数は、現在の入力トークン(通常はトークン列の先頭を指すポインタで管理)を見て、次にどの規則を適用すべきかを判断する。この判断が1つ先のトークンを見るだけで一意に決まる場合、バックトラック(後戻り)なしで効率的に解析できる
3. 終端記号(具体的なトークン、例えば`+`や数値)に遭遇したら、そのトークンを消費して次のトークンへ進む
4. 非終端記号に遭遇したら、対応する関数を再帰的に呼び出す——[操車場アルゴリズム](/algorithms/shunting-yard-algorithm)のスタックベースの処理とは対照的に、呼び出しスタック(プログラムの関数呼び出しの仕組みそのもの)を構文木の構造の管理に使う
5. 各関数が構文木のノード(部分木)を返すようにしておけば、最上位の関数(通常は`parseProgram()`など)の呼び出しが完了した時点で、入力全体に対応する構文木全体が完成する

## 特性・トレードオフ

- **計算量**: 各トークンを一定回数だけ調べて消費するので`O(n)`(バックトラックを使わない、1トークン先読みで済む文法の場合)。文法が曖昧でバックトラックが必要な場合は、最悪ケースで指数的に遅くなることもある
- **手書きのしやすさ**: 文法規則と実装コードがほぼ1対1に対応するため、パーサジェネレータのような専用ツールを使わずに直接手で書きやすい。エラーメッセージのカスタマイズや特殊なケースへの対応も自由度が高い
- **左再帰への非対応**: 文法規則が`式 → 式 '+' 項`のように自分自身を先頭で呼び出す形(左再帰)になっていると、関数が無限に自分自身を呼び出して停止しなくなる。実用上は文法を左再帰を含まない同値な形に書き換える必要がある([操車場アルゴリズム](/algorithms/shunting-yard-algorithm)や[Pratt構文解析](/algorithms/pratt-parsing)は、この左再帰の問題を演算子の優先順位テーブルで回避する)
- **使いどころ**: プログラミング言語処理系(コンパイラ・インタプリタ)のフロントエンド、JSON・XML・設定ファイルなどの構造化データパーサの手書き実装、[LL(1)構文解析](/algorithms/ll1-parsing)や[LR(0)構文解析](/algorithms/lr0-parsing)のような表駆動の自動生成パーサを使うほどではない、比較的シンプルな文法の解析

## 実装例

四則演算(`式 → 項 (('+'|'-') 項)*`、`項 → 因子 (('*'|'/') 因子)*`)を再帰下降で解析・評価する例。

```python
import re


def tokenize(expr: str) -> list[str]:
    return re.findall(r"\d+\.?\d*|[+\-*/()]", expr)


class Parser:
    def __init__(self, tokens: list[str]):
        self.tokens = tokens
        self.pos = 0

    def peek(self) -> str | None:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def consume(self) -> str:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def parse_expression(self) -> float:
        # 式 -> 項 (('+' | '-') 項)*
        value = self.parse_term()
        while self.peek() in ("+", "-"):
            op = self.consume()
            rhs = self.parse_term()
            value = value + rhs if op == "+" else value - rhs
        return value

    def parse_term(self) -> float:
        # 項 -> 因子 (('*' | '/') 因子)*
        value = self.parse_factor()
        while self.peek() in ("*", "/"):
            op = self.consume()
            rhs = self.parse_factor()
            value = value * rhs if op == "*" else value / rhs
        return value

    def parse_factor(self) -> float:
        # 因子 -> 数値 | '(' 式 ')' | '-' 因子
        tok = self.peek()
        if tok == "(":
            self.consume()
            value = self.parse_expression()
            assert self.consume() == ")", "expected closing parenthesis"
            return value
        if tok == "-":
            self.consume()
            return -self.parse_factor()
        return float(self.consume())


def evaluate(expr: str) -> float:
    parser = Parser(tokenize(expr))
    result = parser.parse_expression()
    assert parser.pos == len(parser.tokens), "unexpected trailing tokens"
    return result
```

```typescript
function tokenize(expr: string): string[] {
  return expr.match(/\d+\.?\d*|[+\-*/()]/g) ?? [];
}

class Parser {
  tokens: string[];
  pos = 0;
  constructor(tokens: string[]) { this.tokens = tokens; }
  peek(): string | undefined { return this.tokens[this.pos]; }
  consume(): string { return this.tokens[this.pos++]; }

  parseExpression(): number {
    let value = this.parseTerm();
    while (this.peek() === "+" || this.peek() === "-") {
      const op = this.consume();
      const rhs = this.parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  parseTerm(): number {
    let value = this.parseFactor();
    while (this.peek() === "*" || this.peek() === "/") {
      const op = this.consume();
      const rhs = this.parseFactor();
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }
  parseFactor(): number {
    const tok = this.peek();
    if (tok === "(") {
      this.consume();
      const value = this.parseExpression();
      if (this.consume() !== ")") throw new Error("expected closing parenthesis");
      return value;
    }
    if (tok === "-") { this.consume(); return -this.parseFactor(); }
    return parseFloat(this.consume());
  }
}

function evaluate(expr: string): number {
  const parser = new Parser(tokenize(expr));
  const result = parser.parseExpression();
  if (parser.pos !== parser.tokens.length) throw new Error("unexpected trailing tokens");
  return result;
}
```

```cpp
#include <string>
#include <vector>
#include <regex>
#include <stdexcept>

std::vector<std::string> tokenize(const std::string& expr) {
    std::regex re(R"(\d+\.?\d*|[+\-*/()])");
    std::vector<std::string> tokens;
    for (auto it = std::sregex_iterator(expr.begin(), expr.end(), re); it != std::sregex_iterator(); ++it)
        tokens.push_back(it->str());
    return tokens;
}

class Parser {
public:
    explicit Parser(std::vector<std::string> tokens) : tokens_(std::move(tokens)) {}

    double parseExpression() {
        double value = parseTerm();
        while (peek() == "+" || peek() == "-") {
            std::string op = consume();
            double rhs = parseTerm();
            value = op == "+" ? value + rhs : value - rhs;
        }
        return value;
    }
    int pos() const { return pos_; }
    int tokenCount() const { return static_cast<int>(tokens_.size()); }

private:
    std::vector<std::string> tokens_;
    int pos_ = 0;

    std::string peek() const { return pos_ < static_cast<int>(tokens_.size()) ? tokens_[pos_] : ""; }
    std::string consume() { return tokens_[pos_++]; }

    double parseTerm() {
        double value = parseFactor();
        while (peek() == "*" || peek() == "/") {
            std::string op = consume();
            double rhs = parseFactor();
            value = op == "*" ? value * rhs : value / rhs;
        }
        return value;
    }
    double parseFactor() {
        std::string tok = peek();
        if (tok == "(") {
            consume();
            double value = parseExpression();
            if (consume() != ")") throw std::runtime_error("expected closing parenthesis");
            return value;
        }
        if (tok == "-") { consume(); return -parseFactor(); }
        return std::stod(consume());
    }
};

double evaluate(const std::string& expr) {
    Parser parser(tokenize(expr));
    double result = parser.parseExpression();
    if (parser.pos() != parser.tokenCount()) throw std::runtime_error("unexpected trailing tokens");
    return result;
}
```

```rust
struct Parser {
    tokens: Vec<String>,
    pos: usize,
}

impl Parser {
    fn new(tokens: Vec<String>) -> Self {
        Parser { tokens, pos: 0 }
    }
    fn peek(&self) -> Option<&str> {
        self.tokens.get(self.pos).map(|s| s.as_str())
    }
    fn consume(&mut self) -> String {
        let tok = self.tokens[self.pos].clone();
        self.pos += 1;
        tok
    }

    fn parse_expression(&mut self) -> f64 {
        let mut value = self.parse_term();
        while matches!(self.peek(), Some("+") | Some("-")) {
            let op = self.consume();
            let rhs = self.parse_term();
            value = if op == "+" { value + rhs } else { value - rhs };
        }
        value
    }
    fn parse_term(&mut self) -> f64 {
        let mut value = self.parse_factor();
        while matches!(self.peek(), Some("*") | Some("/")) {
            let op = self.consume();
            let rhs = self.parse_factor();
            value = if op == "*" { value * rhs } else { value / rhs };
        }
        value
    }
    fn parse_factor(&mut self) -> f64 {
        match self.peek() {
            Some("(") => {
                self.consume();
                let value = self.parse_expression();
                assert_eq!(self.consume(), ")", "expected closing parenthesis");
                value
            }
            Some("-") => {
                self.consume();
                -self.parse_factor()
            }
            _ => self.consume().parse().expect("expected a number"),
        }
    }
}

fn tokenize(expr: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = expr.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c.is_whitespace() {
            i += 1;
        } else if c.is_ascii_digit() || c == '.' {
            let start = i;
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                i += 1;
            }
            tokens.push(chars[start..i].iter().collect());
        } else if "+-*/()".contains(c) {
            tokens.push(c.to_string());
            i += 1;
        } else {
            i += 1;
        }
    }
    tokens
}

fn evaluate(expr: &str) -> f64 {
    let mut parser = Parser::new(tokenize(expr));
    let result = parser.parse_expression();
    assert_eq!(parser.pos, parser.tokens.len(), "unexpected trailing tokens");
    result
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Linq;

class RDParser
{
    List<string> tokens;
    int pos = 0;
    public RDParser(List<string> tokens) { this.tokens = tokens; }
    public int Pos => pos;
    public int TokenCount => tokens.Count;

    string? Peek() => pos < tokens.Count ? tokens[pos] : null;
    string Consume() => tokens[pos++];

    public double ParseExpression()
    {
        double value = ParseTerm();
        while (Peek() == "+" || Peek() == "-")
        {
            var op = Consume();
            double rhs = ParseTerm();
            value = op == "+" ? value + rhs : value - rhs;
        }
        return value;
    }
    double ParseTerm()
    {
        double value = ParseFactor();
        while (Peek() == "*" || Peek() == "/")
        {
            var op = Consume();
            double rhs = ParseFactor();
            value = op == "*" ? value * rhs : value / rhs;
        }
        return value;
    }
    double ParseFactor()
    {
        var tok = Peek();
        if (tok == "(")
        {
            Consume();
            double value = ParseExpression();
            if (Consume() != ")") throw new Exception("expected closing parenthesis");
            return value;
        }
        if (tok == "-") { Consume(); return -ParseFactor(); }
        return double.Parse(Consume());
    }
}

static class RecursiveDescent
{
    public static List<string> Tokenize(string expr) =>
        Regex.Matches(expr, @"\d+\.?\d*|[+\-*/()]").Select(m => m.Value).ToList();

    public static double Evaluate(string expr)
    {
        var parser = new RDParser(Tokenize(expr));
        double result = parser.ParseExpression();
        if (parser.Pos != parser.TokenCount) throw new Exception("unexpected trailing tokens");
        return result;
    }
}
```
