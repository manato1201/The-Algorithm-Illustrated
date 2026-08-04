---
name: 操車場アルゴリズム(Shunting-yard algorithm)
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: O(n)(nはトークン数)
summary: 演算子をスタックに一時退避させながら優先順位に従って出力へ送り出す、中置記法の数式を後置記法(逆ポーランド記法)へ変換するスタックベースのアルゴリズム。
---

## 概要

人間が普段書く数式`3 + 4 × 2`(中置記法)は、演算子の優先順位や括弧を考慮しないと正しく計算できない。1961年にエドガー・ダイクストラが考案した操車場アルゴリズムは、この中置記法の数式を、優先順位を考える必要がなく機械的に評価できる後置記法(逆ポーランド記法、`3 4 2 × +`)へ変換する。名前の由来は、鉄道の操車場(シャンティングヤード)で貨車を一時的な側線に退避させながら順序を組み替える様子になぞらえたもので、演算子をスタックに退避させながら優先順位の高い演算子から先に出力へ送り出す仕組みがこの比喩に対応する。

## 仕組み

1. 出力キュー(結果の後置記法の並び)と演算子スタックを空の状態で用意する
2. 入力トークンを左から順に読んでいく:
   - 数値(オペランド)が来たら、そのまま出力キューへ送る
   - 演算子が来たら、スタックの先頭にある演算子の優先順位が今読んだ演算子以上である限り、スタックからポップして出力キューへ送り続ける。その後、今読んだ演算子をスタックにプッシュする(優先順位の高い演算子ほど後まで残り、後で先に処理されることになる)
   - 開き括弧`(`が来たら、そのままスタックにプッシュする
   - 閉じ括弧`)`が来たら、スタックの先頭が開き括弧になるまで演算子をポップして出力キューへ送り続け、最後に開き括弧自体を捨てる(括弧の対応関係の管理)
3. 入力を全て読み終えたら、スタックに残っている演算子を全てポップして出力キューへ送る
4. 完成した出力キューが、元の中置記法の数式と等価な後置記法の並びになっている

後置記法は、スタックを使って左から1回走査するだけで(演算子が来たらスタックから2つポップして計算し結果をプッシュする)評価できるため、優先順位や括弧の判断を評価時に一切考える必要がなくなる、という利点がある。

## 特性・トレードオフ

- **計算量**: 各トークンをスタックに高々1回プッシュ・ポップするだけなので`O(n)`。極めて効率的で、電卓アプリや簡易な数式インタプリタの実装で好んで使われる
- **[再帰下降構文解析](/algorithms/recursive-descent-parsing)との対比**: 再帰下降構文解析が関数呼び出しの再帰(暗黙のスタック)で構造を表現するのに対し、操車場アルゴリズムは明示的なスタックを使い、演算子の優先順位という単純な数値比較だけで、左再帰を含む文法(算術式)を反復的に(再帰なしで)処理できる
- **[Pratt構文解析](/algorithms/pratt-parsing)への一般化**: 操車場アルゴリズムは算術式の中置演算子の処理に特化しているが、この「優先順位を使ってスタック/再帰の処理順を決める」という考え方を、前置演算子・後置演算子・より複雑な構文要素まで扱えるように一般化したのがPratt構文解析(トップダウン演算子優先順位解析)である
- **使いどころ**: 電卓・数式評価エンジンの実装、スプレッドシートの数式パーサ、単純な算術式・論理式を含むドメイン特化言語(DSL)のインタプリタ、コンパイラの式解析部分の軽量な代替実装

## 実装例

```python
import re

PRECEDENCE = {"+": 1, "-": 1, "*": 2, "/": 2}


def tokenize(expr: str) -> list[str]:
    return re.findall(r"\d+\.?\d*|[+\-*/()]", expr)


def to_postfix(tokens: list[str]) -> list[str]:
    output: list[str] = []
    stack: list[str] = []
    for tok in tokens:
        if tok not in PRECEDENCE and tok not in "()":
            output.append(tok)
        elif tok in PRECEDENCE:
            while stack and stack[-1] in PRECEDENCE and PRECEDENCE[stack[-1]] >= PRECEDENCE[tok]:
                output.append(stack.pop())
            stack.append(tok)
        elif tok == "(":
            stack.append(tok)
        elif tok == ")":
            while stack and stack[-1] != "(":
                output.append(stack.pop())
            assert stack and stack[-1] == "(", "mismatched parentheses"
            stack.pop()
    while stack:
        assert stack[-1] != "(", "mismatched parentheses"
        output.append(stack.pop())
    return output


def eval_postfix(postfix: list[str]) -> float:
    stack: list[float] = []
    for tok in postfix:
        if tok in PRECEDENCE:
            b, a = stack.pop(), stack.pop()
            stack.append({"+": a + b, "-": a - b, "*": a * b, "/": a / b}[tok])
        else:
            stack.append(float(tok))
    result = stack.pop()
    assert not stack, "leftover values on stack"
    return result


def evaluate(expr: str) -> float:
    return eval_postfix(to_postfix(tokenize(expr)))
```

```typescript
const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

function tokenize(expr: string): string[] {
  return expr.match(/\d+\.?\d*|[+\-*/()]/g) ?? [];
}

function toPostfix(tokens: string[]): string[] {
  const output: string[] = [];
  const stack: string[] = [];
  for (const tok of tokens) {
    if (!(tok in PRECEDENCE) && tok !== "(" && tok !== ")") {
      output.push(tok);
    } else if (tok in PRECEDENCE) {
      while (stack.length && stack[stack.length - 1] in PRECEDENCE && PRECEDENCE[stack[stack.length - 1]] >= PRECEDENCE[tok]) {
        output.push(stack.pop()!);
      }
      stack.push(tok);
    } else if (tok === "(") {
      stack.push(tok);
    } else {
      while (stack.length && stack[stack.length - 1] !== "(") output.push(stack.pop()!);
      if (!stack.length || stack[stack.length - 1] !== "(") throw new Error("mismatched parentheses");
      stack.pop();
    }
  }
  while (stack.length) {
    if (stack[stack.length - 1] === "(") throw new Error("mismatched parentheses");
    output.push(stack.pop()!);
  }
  return output;
}

function evalPostfix(postfix: string[]): number {
  const stack: number[] = [];
  for (const tok of postfix) {
    if (tok in PRECEDENCE) {
      const b = stack.pop()!, a = stack.pop()!;
      stack.push(tok === "+" ? a + b : tok === "-" ? a - b : tok === "*" ? a * b : a / b);
    } else {
      stack.push(parseFloat(tok));
    }
  }
  const result = stack.pop()!;
  if (stack.length) throw new Error("leftover values on stack");
  return result;
}

function evaluate(expr: string): number {
  return evalPostfix(toPostfix(tokenize(expr)));
}
```

```cpp
#include <string>
#include <vector>
#include <map>
#include <regex>
#include <stdexcept>

const std::map<std::string, int> PRECEDENCE = { {"+", 1}, {"-", 1}, {"*", 2}, {"/", 2} };

std::vector<std::string> tokenize(const std::string& expr) {
    std::regex re(R"(\d+\.?\d*|[+\-*/()])");
    std::vector<std::string> tokens;
    for (auto it = std::sregex_iterator(expr.begin(), expr.end(), re); it != std::sregex_iterator(); ++it)
        tokens.push_back(it->str());
    return tokens;
}

std::vector<std::string> toPostfix(const std::vector<std::string>& tokens) {
    std::vector<std::string> output;
    std::vector<std::string> stack;
    for (auto& tok : tokens) {
        bool isOp = PRECEDENCE.count(tok) > 0;
        if (!isOp && tok != "(" && tok != ")") {
            output.push_back(tok);
        } else if (isOp) {
            while (!stack.empty() && PRECEDENCE.count(stack.back()) && PRECEDENCE.at(stack.back()) >= PRECEDENCE.at(tok)) {
                output.push_back(stack.back());
                stack.pop_back();
            }
            stack.push_back(tok);
        } else if (tok == "(") {
            stack.push_back(tok);
        } else {
            while (!stack.empty() && stack.back() != "(") { output.push_back(stack.back()); stack.pop_back(); }
            if (stack.empty() || stack.back() != "(") throw std::runtime_error("mismatched parentheses");
            stack.pop_back();
        }
    }
    while (!stack.empty()) {
        if (stack.back() == "(") throw std::runtime_error("mismatched parentheses");
        output.push_back(stack.back());
        stack.pop_back();
    }
    return output;
}

double evalPostfix(const std::vector<std::string>& postfix) {
    std::vector<double> stack;
    for (auto& tok : postfix) {
        if (PRECEDENCE.count(tok)) {
            double b = stack.back(); stack.pop_back();
            double a = stack.back(); stack.pop_back();
            if (tok == "+") stack.push_back(a + b);
            else if (tok == "-") stack.push_back(a - b);
            else if (tok == "*") stack.push_back(a * b);
            else stack.push_back(a / b);
        } else {
            stack.push_back(std::stod(tok));
        }
    }
    double result = stack.back();
    stack.pop_back();
    if (!stack.empty()) throw std::runtime_error("leftover values on stack");
    return result;
}

double evaluate(const std::string& expr) {
    return evalPostfix(toPostfix(tokenize(expr)));
}
```

```rust
use std::collections::HashMap;

fn precedence(op: &str) -> Option<i32> {
    match op {
        "+" | "-" => Some(1),
        "*" | "/" => Some(2),
        _ => None,
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

fn to_postfix(tokens: &[String]) -> Vec<String> {
    let mut output = Vec::new();
    let mut stack: Vec<String> = Vec::new();
    for tok in tokens {
        if precedence(tok).is_none() && tok != "(" && tok != ")" {
            output.push(tok.clone());
        } else if let Some(p) = precedence(tok) {
            while let Some(top) = stack.last() {
                if let Some(top_p) = precedence(top) {
                    if top_p >= p {
                        output.push(stack.pop().unwrap());
                        continue;
                    }
                }
                break;
            }
            stack.push(tok.clone());
        } else if tok == "(" {
            stack.push(tok.clone());
        } else {
            while let Some(top) = stack.last() {
                if top == "(" { break; }
                output.push(stack.pop().unwrap());
            }
            assert_eq!(stack.pop().as_deref(), Some("("), "mismatched parentheses");
        }
    }
    while let Some(top) = stack.pop() {
        assert_ne!(top, "(", "mismatched parentheses");
        output.push(top);
    }
    output
}

fn eval_postfix(postfix: &[String]) -> f64 {
    let mut stack: Vec<f64> = Vec::new();
    for tok in postfix {
        if let Some(_) = precedence(tok) {
            let b = stack.pop().unwrap();
            let a = stack.pop().unwrap();
            stack.push(match tok.as_str() {
                "+" => a + b,
                "-" => a - b,
                "*" => a * b,
                _ => a / b,
            });
        } else {
            stack.push(tok.parse().expect("expected a number"));
        }
    }
    let result = stack.pop().expect("empty expression");
    assert!(stack.is_empty(), "leftover values on stack");
    result
}

fn evaluate(expr: &str) -> f64 {
    eval_postfix(&to_postfix(&tokenize(expr)))
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

static class ShuntingYard
{
    static readonly Dictionary<string, int> Precedence = new() { ["+"] = 1, ["-"] = 1, ["*"] = 2, ["/"] = 2 };

    public static List<string> Tokenize(string expr) =>
        Regex.Matches(expr, @"\d+\.?\d*|[+\-*/()]").Select(m => m.Value).ToList();

    public static List<string> ToPostfix(List<string> tokens)
    {
        var output = new List<string>();
        var stack = new Stack<string>();
        foreach (var tok in tokens)
        {
            if (!Precedence.ContainsKey(tok) && tok != "(" && tok != ")")
            {
                output.Add(tok);
            }
            else if (Precedence.ContainsKey(tok))
            {
                while (stack.Count > 0 && Precedence.ContainsKey(stack.Peek()) && Precedence[stack.Peek()] >= Precedence[tok])
                    output.Add(stack.Pop());
                stack.Push(tok);
            }
            else if (tok == "(")
            {
                stack.Push(tok);
            }
            else
            {
                while (stack.Count > 0 && stack.Peek() != "(") output.Add(stack.Pop());
                if (stack.Count == 0 || stack.Peek() != "(") throw new Exception("mismatched parentheses");
                stack.Pop();
            }
        }
        while (stack.Count > 0)
        {
            if (stack.Peek() == "(") throw new Exception("mismatched parentheses");
            output.Add(stack.Pop());
        }
        return output;
    }

    public static double EvalPostfix(List<string> postfix)
    {
        var stack = new Stack<double>();
        foreach (var tok in postfix)
        {
            if (Precedence.ContainsKey(tok))
            {
                double b = stack.Pop(), a = stack.Pop();
                stack.Push(tok == "+" ? a + b : tok == "-" ? a - b : tok == "*" ? a * b : a / b);
            }
            else stack.Push(double.Parse(tok));
        }
        double result = stack.Pop();
        if (stack.Count > 0) throw new Exception("leftover values on stack");
        return result;
    }

    public static double Evaluate(string expr) => EvalPostfix(ToPostfix(Tokenize(expr)));
}
```
