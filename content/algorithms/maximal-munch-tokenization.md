---
name: 最長一致法によるトークン化(Maximal Munch)
category: コンパイラ・構文解析
subcategory: 字句解析
complexity: O(n)(nは入力文字数)
summary: 現在位置から始まる複数のトークン候補のうち、最も長く一致するものを常に選ぶという単純な貪欲原則だけで、「<=」を「<」と「=」に分割してしまうような字句解析の曖昧性を機械的に解消する。
---

## 概要

[Thompson構成法](/algorithms/thompson-construction)や[部分集合構成法](/algorithms/subset-construction)によってトークンの種類ごとにDFA(決定性有限オートマトン)を作れても、実際のソースコードを読み進める際には、「今どこまでが1つのトークンか」を決める必要がある。例えば`<=`という文字列を字句解析する場合、`<`という1文字のトークン(小なり演算子)としても、`<=`という2文字のトークン(以下演算子)としても、文法的には両方とも受理可能な候補になりうる。最長一致法(Maximal Munch、"できるだけ大きく噛みつく"という意味)は、この曖昧性を**「現在位置から始まり、いずれかのトークンパターンに一致する文字列の中で、最も長いものを選ぶ」**という単純な貪欲原則で機械的に解決する。ほぼ全てのプログラミング言語の字句解析器がこの原則を採用しており、字句解析における最も基本的でありながら重要な設計判断の一つである。

## 仕組み

1. 現在の読み取り位置から、入力文字列を1文字ずつ先読みしながら、[部分集合構成法](/algorithms/subset-construction)で構築したDFA(全トークン種別の正規表現を1つに統合したもの)の状態を遷移させていく
2. DFAが**受理状態**(ここまでの文字列が何らかのトークンとして完成している状態)に到達するたびに、その位置を「最後に成功した一致の終端」として記録しておく(この時点でトークン化を確定せず、さらに先を読み進める)
3. これ以上先読みしても、どのトークンパターンにも一致しなくなった時点(DFAがどの受理状態にも遷移できなくなった時点)で先読みを打ち切る
4. 記録しておいた「最後に成功した一致の終端」までを1つのトークンとして確定する。これにより、`<=`を読んでいる途中で`<`(1文字目で受理状態に達する)を早まって確定せず、`<=`全体(2文字目でも受理状態に達する、より長い一致)を優先してトークンとして採用できる
5. 確定したトークンの直後から、1〜4を繰り返して次のトークンを読み取っていく

## 特性・トレードオフ

- **字句解析の曖昧性を単純な規則で解消する**: `<`と`<=`、`+`と`++`、識別子`if`とキーワード`if`のように、複数のトークンパターンが同じ接頭辞を共有する状況は多くの言語で頻出するが、最長一致法という単一の原則を適用するだけで、特別な例外処理を書かずに一貫した挙動を保証できる
- **意図しない解釈を招くことがある**: 最長一致は常に正しい解釈を導くとは限らない。例えばC言語風の言語で`a+++b`と書くと、最長一致法は`a`, `++`, `+`, `b`と分割しようとする(`++`が`+`より長く一致するため優先される)結果、意図とは異なる解釈(`a++ + b`ではなく`a + ++b`ですらない、パーサーが受理できない可能性のある分割)になることがある。こうした曖昧さは言語仕様のレベルで注意深く設計されるか、開発者が空白で明示的に区切ることで回避される
- **キーワードと識別子の区別との組み合わせ**: 最長一致法だけでは`if`という文字列がキーワードなのか、それとも識別子の一部(`ifValue`など)なのかは区別できない。実務の字句解析器では、まず最長一致で「識別子らしき文字列」を切り出してから、それが予約語テーブルに載っているかを別途チェックする、という2段階の処理がよく使われる
- **使いどころ**: ほぼ全てのプログラミング言語の字句解析器(lex/flexのようなツールも最長一致を標準の曖昧性解決規則として採用している)、正規表現エンジンのトークン化処理、[Pratt構文解析](/algorithms/pratt-parsing)や[再帰下降構文解析](/algorithms/recursive-descent-parsing)の前段としての字句解析全般

## 実装例

```python
import re

TOKEN_PATTERNS = [
    ("LE", r"<="),
    ("LT", r"<"),
    ("INCREMENT", r"\+\+"),
    ("PLUS", r"\+"),
    ("NUMBER", r"[0-9]+"),
    ("IDENT", r"[a-zA-Z_][a-zA-Z0-9_]*"),
    ("WHITESPACE", r"\s+"),
]

def tokenize(source: str) -> list[tuple[str, str]]:
    tokens = []
    pos = 0
    while pos < len(source):
        best_match = None
        best_length = 0
        best_type = ""
        for token_type, pattern in TOKEN_PATTERNS:
            match = re.match(pattern, source[pos:])
            if match and len(match.group(0)) > best_length:
                best_length = len(match.group(0))
                best_match = match.group(0)
                best_type = token_type

        if best_match is None:
            raise ValueError(f"字句解析エラー: 位置{pos}で一致するトークンがありません")

        if best_type != "WHITESPACE":
            tokens.append((best_type, best_match))
        pos += best_length

    return tokens
```

```typescript
type TokenPattern = { type: string; regex: RegExp };

const TOKEN_PATTERNS: TokenPattern[] = [
  { type: "LE", regex: /^<=/ },
  { type: "LT", regex: /^</ },
  { type: "INCREMENT", regex: /^\+\+/ },
  { type: "PLUS", regex: /^\+/ },
  { type: "NUMBER", regex: /^[0-9]+/ },
  { type: "IDENT", regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
  { type: "WHITESPACE", regex: /^\s+/ },
];

function tokenize(source: string): [string, string][] {
  const tokens: [string, string][] = [];
  let pos = 0;
  while (pos < source.length) {
    let bestMatch: string | null = null;
    let bestType = "";

    for (const { type, regex } of TOKEN_PATTERNS) {
      const match = source.slice(pos).match(regex);
      if (match && (bestMatch === null || match[0].length > bestMatch.length)) {
        bestMatch = match[0];
        bestType = type;
      }
    }

    if (bestMatch === null) throw new Error(`字句解析エラー: 位置${pos}で一致するトークンがありません`);
    if (bestType !== "WHITESPACE") tokens.push([bestType, bestMatch]);
    pos += bestMatch.length;
  }
  return tokens;
}
```

```cpp
#include <vector>
#include <string>
#include <regex>
#include <stdexcept>

struct TokenPattern { std::string type; std::regex pattern; };

std::vector<std::pair<std::string, std::string>> tokenize(const std::string& source) {
    std::vector<TokenPattern> patterns = {
        {"LE", std::regex("^<=")}, {"LT", std::regex("^<")},
        {"INCREMENT", std::regex("^\\+\\+")}, {"PLUS", std::regex("^\\+")},
        {"NUMBER", std::regex("^[0-9]+")}, {"IDENT", std::regex("^[a-zA-Z_][a-zA-Z0-9_]*")},
        {"WHITESPACE", std::regex("^\\s+")},
    };

    std::vector<std::pair<std::string, std::string>> tokens;
    size_t pos = 0;
    while (pos < source.size()) {
        std::string bestMatch, bestType;
        for (auto& p : patterns) {
            std::smatch m;
            std::string remaining = source.substr(pos);
            if (std::regex_search(remaining, m, p.pattern) && m.position(0) == 0) {
                if (m.str(0).size() > bestMatch.size()) { bestMatch = m.str(0); bestType = p.type; }
            }
        }
        if (bestMatch.empty()) throw std::runtime_error("字句解析エラー");
        if (bestType != "WHITESPACE") tokens.push_back({bestType, bestMatch});
        pos += bestMatch.size();
    }
    return tokens;
}
```

```rust
struct TokenPattern { token_type: &'static str, prefix_len: fn(&str) -> Option<usize> }

fn tokenize(source: &str) -> Result<Vec<(String, String)>, String> {
    let patterns: Vec<(&str, fn(&str) -> Option<usize>)> = vec![
        ("LE", |s| s.starts_with("<=").then_some(2)),
        ("LT", |s| s.starts_with('<').then_some(1)),
        ("INCREMENT", |s| s.starts_with("++").then_some(2)),
        ("PLUS", |s| s.starts_with('+').then_some(1)),
    ];

    let mut tokens = Vec::new();
    let chars: Vec<char> = source.chars().collect();
    let mut pos = 0;
    while pos < chars.len() {
        let remaining: String = chars[pos..].iter().collect();
        let mut best_len = 0;
        let mut best_type = "";
        for (token_type, matcher) in &patterns {
            if let Some(len) = matcher(&remaining) {
                if len > best_len {
                    best_len = len;
                    best_type = token_type;
                }
            }
        }
        if best_len == 0 {
            return Err(format!("字句解析エラー: 位置{}", pos));
        }
        let matched: String = chars[pos..pos + best_len].iter().collect();
        tokens.push((best_type.to_string(), matched));
        pos += best_len;
    }
    Ok(tokens)
}
```

```csharp
using System.Text.RegularExpressions;

static List<(string Type, string Value)> Tokenize(string source)
{
    var patterns = new (string Type, Regex Pattern)[]
    {
        ("LE", new Regex(@"^<=")),
        ("LT", new Regex(@"^<")),
        ("INCREMENT", new Regex(@"^\+\+")),
        ("PLUS", new Regex(@"^\+")),
        ("NUMBER", new Regex(@"^[0-9]+")),
        ("IDENT", new Regex(@"^[a-zA-Z_][a-zA-Z0-9_]*")),
        ("WHITESPACE", new Regex(@"^\s+")),
    };

    var tokens = new List<(string, string)>();
    int pos = 0;
    while (pos < source.Length)
    {
        string bestMatch = "", bestType = "";
        string remaining = source.Substring(pos);
        foreach (var (type, pattern) in patterns)
        {
            var m = pattern.Match(remaining);
            if (m.Success && m.Value.Length > bestMatch.Length)
            {
                bestMatch = m.Value;
                bestType = type;
            }
        }
        if (bestMatch.Length == 0) throw new Exception($"字句解析エラー: 位置{pos}");
        if (bestType != "WHITESPACE") tokens.Add((bestType, bestMatch));
        pos += bestMatch.Length;
    }
    return tokens;
}
```
