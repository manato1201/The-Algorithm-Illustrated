---
name: レンマ化(見出し語化)
category: 自然言語処理
subcategory: トークン化・前処理
complexity: O(1)(辞書引き、1単語あたり)
summary: '[Porterのステミング法](/algorithms/porter-stemming)が機械的なルールで語尾を削るのに対し、単語の品詞や文脈を考慮して辞書上の正式な見出し語(レンマ)に正規化する前処理手法で、"was"→"be"のようなステミングでは扱えない不規則変化にも対応できる。'
---

## 概要

[Porterのステミング法](/algorithms/porter-stemming)は"running"から接尾辞"-ning"を機械的に削って"run"に近づけるが、この単純なルールベースの操作では、"was"→"be"や"better"→"good"のような、語形が語幹と全く異なる不規則変化には対応できない。レンマ化(Lemmatization)は、より丁寧なアプローチを取る——単語の品詞(名詞・動詞・形容詞など)を考慮しながら、その単語が辞書に載る「見出し語(レンマ)」の形へ正規化する。ステミングが「削って近づける」機械的な処理であるのに対し、レンマ化は「本来あるべき正しい基本形を探し当てる」という、言語学的な正しさを重視した処理である。

## 仕組み

1. 対象の単語について、まず品詞タグ付け(その単語が文中で名詞・動詞・形容詞のどの役割を果たしているか)を行う——同じ綴りの単語でも品詞によって正しいレンマが異なる場合があるため(例えば"leaves"は名詞なら"leaf"の複数形、動詞なら"leave"の三人称単数形)、この文脈情報が正規化の精度を左右する
2. 品詞情報と単語の綴りを手がかりに、あらかじめ用意された形態素辞書(単語とその活用形・レンマの対応表)を引く
3. 規則的な変化(名詞の複数形、動詞の過去形など)については、活用のパターンに基づくルールで基本形を導出する
4. 不規則変化(”went”→”go”、”better”→”good”のような、規則からは導けない特殊な変化)については、あらかじめ登録された例外テーブルを直接参照する
5. 見つかったレンマを、その単語の正規化された表現として後続の処理(検索、統計処理、機械学習の特徴量抽出など)に渡す

## 特性・トレードオフ

- **計算量**: 辞書引きと品詞情報の参照が中心のため、1単語あたり実質`O(1)`(辞書のデータ構造次第では`O(log n)`)——事前に用意する辞書・ルールの構築コストは別として、実行時の処理自体は軽量
- **[Porterのステミング法](/algorithms/porter-stemming)との根本的な違い**: ステミングは語尾の削除ルールを機械的に適用するだけで、結果が実在の単語である保証はない(”studies”→”studi”のような非単語になることがある)。レンマ化は必ず辞書に存在する正しい見出し語を返すため、人間が読んでも意味の通る正規化結果になる——ただし、この精度の高さは品詞タグ付けや形態素辞書という追加のコストを要求する
- **品詞情報への依存という制約**: レンマ化はステミングと違って文脈(品詞)を必要とするため、単語だけを渡されても正しく処理できない場合がある(”leaves”のような多義的な語形)。実務では[条件付き確率場](/algorithms/conditional-random-field)や[ビタビ法](/algorithms/viterbi-algorithm)ベースの品詞タグ付けと組み合わせて使われることが多い
- **言語ごとの複雑さの違い**: 英語は比較的単純な活用体系を持つためレンマ化のルールも扱いやすいが、日本語(用言の活用が複雑)やフィンランド語・トルコ語のような膠着語では、レンマ化に必要な形態素解析自体がはるかに複雑になる
- **使いどころ**: 検索エンジンにおけるクエリと文書の語形統一(”運転する”と”運転した”を同じ検索対象として扱う)、[TF-IDF](/algorithms/tf-idf)や[BM25](/algorithms/bm25)のような統計的手法の前処理(語形のバリエーションによる頻度の分散を防ぐ)、テキストマイニングにおける単語の正規化、機械翻訳・要約システムの前処理

## 実装例

品詞(POS)ごとの規則的な変化ルールと、不規則変化の例外テーブルを組み合わせて見出し語化する。不規則変化テーブルを優先的に参照し、該当しなければ規則ベースの語尾変換を適用する。

```python
IRREGULAR = {
    ("was", "VERB"): "be",
    ("were", "VERB"): "be",
    ("went", "VERB"): "go",
    ("better", "ADJ"): "good",
    ("best", "ADJ"): "good",
    ("mice", "NOUN"): "mouse",
    ("children", "NOUN"): "child",
    ("leaves", "NOUN"): "leaf",  # 名詞としての"leaves"(動詞なら規則変化になる)
}


def _regular_noun(word: str) -> str:
    if word.endswith("ies") and len(word) > 3:
        return word[:-3] + "y"
    if word.endswith(("ses", "xes", "ches", "shes")):
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def _regular_verb(word: str) -> str:
    if word.endswith("ies") and len(word) > 3:
        return word[:-3] + "y"
    if word.endswith("ed") and len(word) > 2:
        stem = word[:-2]
        if len(stem) >= 2 and stem[-1] == stem[-2] and stem[-1] not in "aeiou":
            return stem[:-1]  # 子音重複の解消("stopped" -> "stop")
        return stem
    if word.endswith("ing") and len(word) > 3:
        stem = word[:-3]
        if len(stem) >= 2 and stem[-1] == stem[-2] and stem[-1] not in "aeiou":
            return stem[:-1]
        return stem
    if word.endswith("s") and not word.endswith("ss") and len(word) > 1:
        return word[:-1]
    return word


def _regular_adj(word: str) -> str:
    if word.endswith("er") and len(word) > 2:
        return word[:-2]
    if word.endswith("est") and len(word) > 3:
        return word[:-3]
    return word


_REGULAR_RULES = {"NOUN": _regular_noun, "VERB": _regular_verb, "ADJ": _regular_adj}


def lemmatize(word: str, pos: str) -> str:
    """品詞posを考慮して単語を見出し語(レンマ)に正規化する。
    不規則変化テーブルを最優先で参照し、無ければ品詞ごとの規則的な変化ルールを適用する。
    """
    lower = word.lower()
    if (lower, pos) in IRREGULAR:
        return IRREGULAR[(lower, pos)]
    rule = _REGULAR_RULES.get(pos)
    return rule(lower) if rule else lower
```

```typescript
const IRREGULAR: Record<string, string> = {
  "was|VERB": "be",
  "were|VERB": "be",
  "went|VERB": "go",
  "better|ADJ": "good",
  "best|ADJ": "good",
  "mice|NOUN": "mouse",
  "children|NOUN": "child",
  "leaves|NOUN": "leaf", // 名詞としての"leaves"(動詞なら規則変化になる)
};

function regularNoun(word: string): string {
  if (word.endsWith("ies") && word.length > 3) return word.slice(0, -3) + "y";
  if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("ches") || word.endsWith("shes"))
    return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function regularVerb(word: string): string {
  if (word.endsWith("ies") && word.length > 3) return word.slice(0, -3) + "y";
  if (word.endsWith("ed") && word.length > 2) {
    const stem = word.slice(0, -2);
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2) && !"aeiou".includes(stem.at(-1)!)) {
      return stem.slice(0, -1); // 子音重複の解消("stopped" -> "stop")
    }
    return stem;
  }
  if (word.endsWith("ing") && word.length > 3) {
    const stem = word.slice(0, -3);
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2) && !"aeiou".includes(stem.at(-1)!)) {
      return stem.slice(0, -1);
    }
    return stem;
  }
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 1) return word.slice(0, -1);
  return word;
}

function regularAdj(word: string): string {
  if (word.endsWith("er") && word.length > 2) return word.slice(0, -2);
  if (word.endsWith("est") && word.length > 3) return word.slice(0, -3);
  return word;
}

const REGULAR_RULES: Record<string, (word: string) => string> = {
  NOUN: regularNoun,
  VERB: regularVerb,
  ADJ: regularAdj,
};

function lemmatize(word: string, pos: string): string {
  const lower = word.toLowerCase();
  const key = `${lower}|${pos}`;
  if (key in IRREGULAR) return IRREGULAR[key];
  const rule = REGULAR_RULES[pos];
  return rule ? rule(lower) : lower;
}
```

```cpp
#include <string>
#include <unordered_map>
#include <cctype>
#include <algorithm>

std::string toLower(const std::string& s) {
    std::string r = s;
    std::transform(r.begin(), r.end(), r.begin(), [](unsigned char c) { return std::tolower(c); });
    return r;
}

bool endsWith(const std::string& s, const std::string& suffix) {
    return s.size() >= suffix.size() && s.compare(s.size() - suffix.size(), suffix.size(), suffix) == 0;
}

std::string regularNoun(const std::string& word) {
    if (endsWith(word, "ies") && word.size() > 3) return word.substr(0, word.size() - 3) + "y";
    if (endsWith(word, "ses") || endsWith(word, "xes") || endsWith(word, "ches") || endsWith(word, "shes"))
        return word.substr(0, word.size() - 2);
    if (endsWith(word, "s") && !endsWith(word, "ss")) return word.substr(0, word.size() - 1);
    return word;
}

std::string regularVerb(const std::string& word) {
    if (endsWith(word, "ies") && word.size() > 3) return word.substr(0, word.size() - 3) + "y";
    if (endsWith(word, "ed") && word.size() > 2) {
        std::string stem = word.substr(0, word.size() - 2);
        if (stem.size() >= 2 && stem.back() == stem[stem.size() - 2]
            && std::string("aeiou").find(stem.back()) == std::string::npos) {
            return stem.substr(0, stem.size() - 1); // 子音重複の解消("stopped" -> "stop")
        }
        return stem;
    }
    if (endsWith(word, "ing") && word.size() > 3) {
        std::string stem = word.substr(0, word.size() - 3);
        if (stem.size() >= 2 && stem.back() == stem[stem.size() - 2]
            && std::string("aeiou").find(stem.back()) == std::string::npos) {
            return stem.substr(0, stem.size() - 1);
        }
        return stem;
    }
    if (endsWith(word, "s") && !endsWith(word, "ss") && word.size() > 1) return word.substr(0, word.size() - 1);
    return word;
}

std::string regularAdj(const std::string& word) {
    if (endsWith(word, "er") && word.size() > 2) return word.substr(0, word.size() - 2);
    if (endsWith(word, "est") && word.size() > 3) return word.substr(0, word.size() - 3);
    return word;
}

std::string lemmatize(const std::string& word, const std::string& pos) {
    static const std::unordered_map<std::string, std::string> irregular = {
        {"was|VERB", "be"}, {"were|VERB", "be"}, {"went|VERB", "go"},
        {"better|ADJ", "good"}, {"best|ADJ", "good"},
        {"mice|NOUN", "mouse"}, {"children|NOUN", "child"}, {"leaves|NOUN", "leaf"},
    };
    std::string lower = toLower(word);
    auto it = irregular.find(lower + "|" + pos);
    if (it != irregular.end()) return it->second;
    if (pos == "NOUN") return regularNoun(lower);
    if (pos == "VERB") return regularVerb(lower);
    if (pos == "ADJ") return regularAdj(lower);
    return lower;
}
```

```rust
use std::collections::HashMap;

fn ends_with(word: &str, suffix: &str) -> bool {
    word.ends_with(suffix)
}

fn regular_noun(word: &str) -> String {
    if ends_with(word, "ies") && word.len() > 3 {
        return format!("{}y", &word[..word.len() - 3]);
    }
    if ends_with(word, "ses") || ends_with(word, "xes") || ends_with(word, "ches") || ends_with(word, "shes") {
        return word[..word.len() - 2].to_string();
    }
    if ends_with(word, "s") && !ends_with(word, "ss") {
        return word[..word.len() - 1].to_string();
    }
    word.to_string()
}

fn regular_verb(word: &str) -> String {
    if ends_with(word, "ies") && word.len() > 3 {
        return format!("{}y", &word[..word.len() - 3]);
    }
    if ends_with(word, "ed") && word.len() > 2 {
        let stem = &word[..word.len() - 2];
        let chars: Vec<char> = stem.chars().collect();
        if chars.len() >= 2 && chars[chars.len() - 1] == chars[chars.len() - 2] && !"aeiou".contains(chars[chars.len() - 1]) {
            return chars[..chars.len() - 1].iter().collect(); // 子音重複の解消("stopped" -> "stop")
        }
        return stem.to_string();
    }
    if ends_with(word, "ing") && word.len() > 3 {
        let stem = &word[..word.len() - 3];
        let chars: Vec<char> = stem.chars().collect();
        if chars.len() >= 2 && chars[chars.len() - 1] == chars[chars.len() - 2] && !"aeiou".contains(chars[chars.len() - 1]) {
            return chars[..chars.len() - 1].iter().collect();
        }
        return stem.to_string();
    }
    if ends_with(word, "s") && !ends_with(word, "ss") && word.len() > 1 {
        return word[..word.len() - 1].to_string();
    }
    word.to_string()
}

fn regular_adj(word: &str) -> String {
    if ends_with(word, "er") && word.len() > 2 {
        return word[..word.len() - 2].to_string();
    }
    if ends_with(word, "est") && word.len() > 3 {
        return word[..word.len() - 3].to_string();
    }
    word.to_string()
}

fn lemmatize(word: &str, pos: &str) -> String {
    let irregular: HashMap<&str, &str> = HashMap::from([
        ("was|VERB", "be"), ("were|VERB", "be"), ("went|VERB", "go"),
        ("better|ADJ", "good"), ("best|ADJ", "good"),
        ("mice|NOUN", "mouse"), ("children|NOUN", "child"), ("leaves|NOUN", "leaf"),
    ]);
    let lower = word.to_lowercase();
    let key = format!("{}|{}", lower, pos);
    if let Some(&lemma) = irregular.get(key.as_str()) {
        return lemma.to_string();
    }
    match pos {
        "NOUN" => regular_noun(&lower),
        "VERB" => regular_verb(&lower),
        "ADJ" => regular_adj(&lower),
        _ => lower,
    }
}
```

```csharp
using System;
using System.Collections.Generic;

static class Lemmatizer
{
    static readonly Dictionary<string, string> Irregular = new()
    {
        ["was|VERB"] = "be", ["were|VERB"] = "be", ["went|VERB"] = "go",
        ["better|ADJ"] = "good", ["best|ADJ"] = "good",
        ["mice|NOUN"] = "mouse", ["children|NOUN"] = "child", ["leaves|NOUN"] = "leaf",
    };

    static string RegularNoun(string word)
    {
        if (word.EndsWith("ies") && word.Length > 3) return word[..^3] + "y";
        if (word.EndsWith("ses") || word.EndsWith("xes") || word.EndsWith("ches") || word.EndsWith("shes"))
            return word[..^2];
        if (word.EndsWith("s") && !word.EndsWith("ss")) return word[..^1];
        return word;
    }

    static string RegularVerb(string word)
    {
        if (word.EndsWith("ies") && word.Length > 3) return word[..^3] + "y";
        if (word.EndsWith("ed") && word.Length > 2)
        {
            string stem = word[..^2];
            if (stem.Length >= 2 && stem[^1] == stem[^2] && "aeiou".IndexOf(stem[^1]) < 0)
                return stem[..^1]; // 子音重複の解消("stopped" -> "stop")
            return stem;
        }
        if (word.EndsWith("ing") && word.Length > 3)
        {
            string stem = word[..^3];
            if (stem.Length >= 2 && stem[^1] == stem[^2] && "aeiou".IndexOf(stem[^1]) < 0)
                return stem[..^1];
            return stem;
        }
        if (word.EndsWith("s") && !word.EndsWith("ss") && word.Length > 1) return word[..^1];
        return word;
    }

    static string RegularAdj(string word)
    {
        if (word.EndsWith("er") && word.Length > 2) return word[..^2];
        if (word.EndsWith("est") && word.Length > 3) return word[..^3];
        return word;
    }

    public static string Lemmatize(string word, string pos)
    {
        string lower = word.ToLowerInvariant();
        if (Irregular.TryGetValue($"{lower}|{pos}", out var lemma)) return lemma;
        return pos switch
        {
            "NOUN" => RegularNoun(lower),
            "VERB" => RegularVerb(lower),
            "ADJ" => RegularAdj(lower),
            _ => lower,
        };
    }
}
```
