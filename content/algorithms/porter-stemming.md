---
name: Porterのステミングアルゴリズム
category: 自然言語処理
subcategory: トークン化・前処理
complexity: O(n)(n文字の単語1つあたり)
summary: 単語の語尾に対する一連の書き換えルールを段階的に適用し、"running"と"runs"を"run"にまとめるように語形変化を取り除く、辞書を使わない語幹抽出法。
---

## 概要

「run」「runs」「running」「ran」は文法的には異なる形だが、検索エンジンや文書分類では、これらを同じ語(語幹)として扱いたいことが多い。1980年にマーティン・ポーターが発表したステミングアルゴリズムは、辞書や形態素解析の複雑な仕組みを使わずに、語尾のパターンに対する一連の書き換えルールを機械的に順番に適用するだけで、多くの英単語から接尾辞(-ing、-ed、-s、-ational等)を取り除き、語幹に近い形へ変換する。厳密な言語学的正しさよりも、検索や分類での「同じ語として扱う」という実用性を優先した設計になっている。

## 仕組み

1. 単語を子音(C)と母音(V)の並びとして抽象化し、`[C](VC){m}[V]`という形式で単語の「測度`m`」(母音・子音の交代パターンの繰り返し回数)を定義する——この`m`が、接尾辞を安全に取り除けるかどうかの判定基準として繰り返し使われる
2. アルゴリズムは複数のステップ(Step 1a、1b、1c、2、3、4、5a、5bなど)に分かれており、各ステップは「この語尾パターンに一致し、かつ測度`m`がこの条件を満たすなら、この形に書き換える」というルールの集合になっている
3. 例えばStep 1aでは、`-sses → -ss`(caresses → caress)、`-ies → -i`(ponies → poni)のような複数形の処理を行う
4. Step 2では、`-ational → -ate`(relational → relate)、`-tional → -tion`(conditional → condition)のような、より長い接尾辞の単純化を行う
5. 各ステップを順番に適用し、最終的に得られる短くなった語形が「語幹(ステム)」として採用される

## 特性・トレードオフ

- **計算量**: 各単語に対して固定回数のパターンマッチングとルール適用を行うだけなので、単語長`n`に対して`O(n)`。辞書引きや形態素解析器を使う手法と比べて非常に高速で、事前計算やメモリも軽い
- **言語学的な正しさより実用性を優先**: 生成される「語幹」は、必ずしも辞書に載っている正しい単語形ではない(例えば"running"は"run"になるが、"argument"は"argu"のような非単語になることもある)。これは検索・分類での一致率向上が目的であり、人間が読む文章の生成には向かない
- **ルールベースゆえの言語依存性**: このアルゴリズムは英語の形態論的パターンに特化して設計されており、他言語には直接使えない(言語ごとに専用のステミングルールが必要)。より精密に語の「見出し語(レンマ)」を復元したい場合は、辞書や形態素解析を用いるレンマ化(lemmatization)が使われる
- **使いどころ**: 検索エンジンの索引作成(異なる活用形を同じ語として検索にヒットさせる)、文書分類・情報検索における[TF-IDF](/algorithms/tf-idf)や[BM25](/algorithms/bm25)の前処理、テキストマイニングでの語の正規化。今日でも軽量な前処理として広く実装に組み込まれている

## 実装例

母音・子音の交代パターンの繰り返し回数「測度m」を軸に、Step1〜5の書き換えルールを順番に適用する。`caresses→caress`、`agreed→agre`、`relational→relat`のような、原論文および標準的なPorterステマー実装(Python `nltk.stem.PorterStemmer`)と一致する結果になることを確認した。

```python
VOWELS = set("aeiou")


def is_consonant(word: str, i: int) -> bool:
    ch = word[i]
    if ch in VOWELS:
        return False
    if ch == "y":
        return i == 0 or not is_consonant(word, i - 1)
    return True


def measure(word: str) -> int:
    """[C](VC)^m[V]の形式における繰り返し回数mを数える。"""
    form = "".join("C" if is_consonant(word, i) else "V" for i in range(len(word)))
    groups = []
    for ch in form:
        if not groups or groups[-1] != ch:
            groups.append(ch)
    s = "".join(groups)
    if s.startswith("C"):
        s = s[1:]
    if s.endswith("V"):
        s = s[:-1]
    return len(s) // 2


def contains_vowel(word: str) -> bool:
    return any(not is_consonant(word, i) for i in range(len(word)))


def ends_double_consonant(word: str) -> bool:
    return len(word) >= 2 and word[-1] == word[-2] and is_consonant(word, len(word) - 1)


def ends_cvc(word: str) -> bool:
    if len(word) < 3:
        return False
    a, b, c = len(word) - 3, len(word) - 2, len(word) - 1
    if not (is_consonant(word, a) and not is_consonant(word, b) and is_consonant(word, c)):
        return False
    return word[c] not in ("w", "x", "y")


def replace_suffix(word, suffix, replacement, min_measure=-1, condition=None):
    if not word.endswith(suffix):
        return None
    stem = word[: len(word) - len(suffix)] if suffix else word
    if min_measure >= 0 and measure(stem) < min_measure:
        return None
    if condition is not None and not condition(stem):
        return None
    return stem + replacement


def apply_rules(word: str, rules: list[tuple]) -> str:
    for suffix, replacement, *rest in rules:
        min_m = rest[0] if rest else -1
        cond = rest[1] if len(rest) > 1 else None
        result = replace_suffix(word, suffix, replacement, min_m, cond)
        if result is not None:
            return result
    return word


def step1a(word: str) -> str:
    for suffix, repl in [("sses", "ss"), ("ies", "i"), ("ss", "ss"), ("s", "")]:
        if word.endswith(suffix):
            return word[: len(word) - len(suffix)] + repl
    return word


def _step1b_cleanup(stem: str) -> str:
    for suffix, repl in [("at", "ate"), ("bl", "ble"), ("iz", "ize")]:
        if stem.endswith(suffix):
            return stem + repl[len(suffix):]
    if ends_double_consonant(stem) and stem[-1] not in ("l", "s", "z"):
        return stem[:-1]
    if measure(stem) == 1 and ends_cvc(stem):
        return stem + "e"
    return stem


def step1b(word: str) -> str:
    if word.endswith("eed"):
        stem = word[:-3]
        return stem + "ee" if measure(stem) > 0 else word
    for suffix in ("ed", "ing"):
        if word.endswith(suffix):
            stem = word[: len(word) - len(suffix)]
            return _step1b_cleanup(stem) if contains_vowel(stem) else word
    return word


def step1c(word: str) -> str:
    if word.endswith("y") and len(word) > 1 and contains_vowel(word[:-1]):
        return word[:-1] + "i"
    return word


# Step2/3はm>0(measure>=1)、Step4は全ルールがm>1(measure>=2)を要求する。
STEP2_RULES = [
    ("ational", "ate", 1), ("tional", "tion", 1), ("enci", "ence", 1), ("anci", "ance", 1),
    ("izer", "ize", 1), ("abli", "able", 1), ("alli", "al", 1), ("entli", "ent", 1),
    ("eli", "e", 1), ("ousli", "ous", 1), ("ization", "ize", 1), ("ation", "ate", 1),
    ("ator", "ate", 1), ("alism", "al", 1), ("iveness", "ive", 1), ("fulness", "ful", 1),
    ("ousness", "ous", 1), ("aliti", "al", 1), ("iviti", "ive", 1), ("biliti", "ble", 1),
]
STEP3_RULES = [
    ("icate", "ic", 1), ("ative", "", 1), ("alize", "al", 1), ("iciti", "ic", 1),
    ("ical", "ic", 1), ("ful", "", 1), ("ness", "", 1),
]
STEP4_RULES = [
    ("al", "", 2), ("ance", "", 2), ("ence", "", 2), ("er", "", 2), ("ic", "", 2),
    ("able", "", 2), ("ible", "", 2), ("ant", "", 2), ("ement", "", 2), ("ment", "", 2),
    ("ent", "", 2),
    ("ion", "", 2, lambda stem: len(stem) > 0 and stem[-1] in ("s", "t")),
    ("ou", "", 2), ("ism", "", 2), ("ate", "", 2), ("iti", "", 2), ("ous", "", 2),
    ("ive", "", 2), ("ize", "", 2),
]


def step5a(word: str) -> str:
    if word.endswith("e"):
        stem = word[:-1]
        m = measure(stem)
        if m > 1 or (m == 1 and not ends_cvc(stem)):
            return stem
    return word


def step5b(word: str) -> str:
    if measure(word) > 1 and ends_double_consonant(word) and word.endswith("l"):
        return word[:-1]
    return word


def porter_stem(word: str) -> str:
    word = word.lower()
    if len(word) <= 2:
        return word
    word = step1a(word)
    word = step1b(word)
    word = step1c(word)
    word = apply_rules(word, STEP2_RULES)
    word = apply_rules(word, STEP3_RULES)
    word = apply_rules(word, STEP4_RULES)
    word = step5a(word)
    word = step5b(word)
    return word
```

```typescript
const VOWELS = new Set("aeiou");

function isConsonant(word: string, i: number): boolean {
  const ch = word[i];
  if (VOWELS.has(ch)) return false;
  if (ch === "y") return i === 0 || !isConsonant(word, i - 1);
  return true;
}

function measure(word: string): number {
  let form = "";
  for (let i = 0; i < word.length; i++) form += isConsonant(word, i) ? "C" : "V";
  let s = "";
  for (const ch of form) if (s[s.length - 1] !== ch) s += ch;
  if (s.startsWith("C")) s = s.slice(1);
  if (s.endsWith("V")) s = s.slice(0, -1);
  return Math.floor(s.length / 2);
}

function containsVowel(word: string): boolean {
  for (let i = 0; i < word.length; i++) if (!isConsonant(word, i)) return true;
  return false;
}

function endsDoubleConsonant(word: string): boolean {
  return word.length >= 2 && word[word.length - 1] === word[word.length - 2] && isConsonant(word, word.length - 1);
}

function endsCvc(word: string): boolean {
  if (word.length < 3) return false;
  const a = word.length - 3, b = word.length - 2, c = word.length - 1;
  if (!(isConsonant(word, a) && !isConsonant(word, b) && isConsonant(word, c))) return false;
  return !["w", "x", "y"].includes(word[c]);
}

type Rule = [string, string, number?, ((stem: string) => boolean)?];

function replaceSuffix(word: string, suffix: string, replacement: string, minMeasure = -1, condition?: (s: string) => boolean): string | null {
  if (!word.endsWith(suffix)) return null;
  const stem = suffix ? word.slice(0, word.length - suffix.length) : word;
  if (minMeasure >= 0 && measure(stem) < minMeasure) return null;
  if (condition && !condition(stem)) return null;
  return stem + replacement;
}

function applyRules(word: string, rules: Rule[]): string {
  for (const [suffix, replacement, minM, cond] of rules) {
    const result = replaceSuffix(word, suffix, replacement, minM ?? -1, cond);
    if (result !== null) return result;
  }
  return word;
}

function step1a(word: string): string {
  for (const [suffix, repl] of [["sses", "ss"], ["ies", "i"], ["ss", "ss"], ["s", ""]] as [string, string][]) {
    if (word.endsWith(suffix)) return word.slice(0, word.length - suffix.length) + repl;
  }
  return word;
}

function step1bCleanup(stem: string): string {
  for (const [suffix, repl] of [["at", "ate"], ["bl", "ble"], ["iz", "ize"]] as [string, string][]) {
    if (stem.endsWith(suffix)) return stem + repl.slice(suffix.length);
  }
  if (endsDoubleConsonant(stem) && !["l", "s", "z"].includes(stem[stem.length - 1])) return stem.slice(0, -1);
  if (measure(stem) === 1 && endsCvc(stem)) return stem + "e";
  return stem;
}

function step1b(word: string): string {
  if (word.endsWith("eed")) {
    const stem = word.slice(0, -3);
    return measure(stem) > 0 ? stem + "ee" : word;
  }
  for (const suffix of ["ed", "ing"]) {
    if (word.endsWith(suffix)) {
      const stem = word.slice(0, word.length - suffix.length);
      return containsVowel(stem) ? step1bCleanup(stem) : word;
    }
  }
  return word;
}

function step1c(word: string): string {
  return word.endsWith("y") && word.length > 1 && containsVowel(word.slice(0, -1)) ? word.slice(0, -1) + "i" : word;
}

const STEP2_RULES: Rule[] = [
  ["ational", "ate", 1], ["tional", "tion", 1], ["enci", "ence", 1], ["anci", "ance", 1],
  ["izer", "ize", 1], ["abli", "able", 1], ["alli", "al", 1], ["entli", "ent", 1],
  ["eli", "e", 1], ["ousli", "ous", 1], ["ization", "ize", 1], ["ation", "ate", 1],
  ["ator", "ate", 1], ["alism", "al", 1], ["iveness", "ive", 1], ["fulness", "ful", 1],
  ["ousness", "ous", 1], ["aliti", "al", 1], ["iviti", "ive", 1], ["biliti", "ble", 1],
];
const STEP3_RULES: Rule[] = [
  ["icate", "ic", 1], ["ative", "", 1], ["alize", "al", 1], ["iciti", "ic", 1],
  ["ical", "ic", 1], ["ful", "", 1], ["ness", "", 1],
];
const STEP4_RULES: Rule[] = [
  ["al", "", 2], ["ance", "", 2], ["ence", "", 2], ["er", "", 2], ["ic", "", 2],
  ["able", "", 2], ["ible", "", 2], ["ant", "", 2], ["ement", "", 2], ["ment", "", 2],
  ["ent", "", 2],
  ["ion", "", 2, (stem) => stem.length > 0 && (stem[stem.length - 1] === "s" || stem[stem.length - 1] === "t")],
  ["ou", "", 2], ["ism", "", 2], ["ate", "", 2], ["iti", "", 2], ["ous", "", 2],
  ["ive", "", 2], ["ize", "", 2],
];

function step5a(word: string): string {
  if (word.endsWith("e")) {
    const stem = word.slice(0, -1);
    const m = measure(stem);
    if (m > 1 || (m === 1 && !endsCvc(stem))) return stem;
  }
  return word;
}

function step5b(word: string): string {
  return measure(word) > 1 && endsDoubleConsonant(word) && word.endsWith("l") ? word.slice(0, -1) : word;
}

function porterStem(input: string): string {
  let word = input.toLowerCase();
  if (word.length <= 2) return word;
  word = step1a(word);
  word = step1b(word);
  word = step1c(word);
  word = applyRules(word, STEP2_RULES);
  word = applyRules(word, STEP3_RULES);
  word = applyRules(word, STEP4_RULES);
  word = step5a(word);
  word = step5b(word);
  return word;
}
```

```cpp
#include <string>
#include <vector>
#include <functional>
#include <optional>
#include <algorithm>
#include <cctype>

bool isConsonant(const std::string& word, int i) {
    char ch = word[i];
    if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u') return false;
    if (ch == 'y') return i == 0 || !isConsonant(word, i - 1);
    return true;
}

int measure(const std::string& word) {
    std::string form;
    for (size_t i = 0; i < word.size(); i++) form += isConsonant(word, static_cast<int>(i)) ? 'C' : 'V';
    std::string s;
    for (char ch : form) if (s.empty() || s.back() != ch) s += ch;
    if (!s.empty() && s.front() == 'C') s.erase(0, 1);
    if (!s.empty() && s.back() == 'V') s.pop_back();
    return static_cast<int>(s.size()) / 2;
}

bool containsVowel(const std::string& word) {
    for (size_t i = 0; i < word.size(); i++) if (!isConsonant(word, static_cast<int>(i))) return true;
    return false;
}

bool endsDoubleConsonant(const std::string& word) {
    return word.size() >= 2 && word.back() == word[word.size() - 2] && isConsonant(word, static_cast<int>(word.size()) - 1);
}

bool endsCvc(const std::string& word) {
    if (word.size() < 3) return false;
    int a = static_cast<int>(word.size()) - 3, b = a + 1, c = a + 2;
    if (!(isConsonant(word, a) && !isConsonant(word, b) && isConsonant(word, c))) return false;
    char last = word[c];
    return last != 'w' && last != 'x' && last != 'y';
}

struct Rule {
    std::string suffix, replacement;
    int minMeasure = -1;
    std::function<bool(const std::string&)> condition = nullptr;
};

std::optional<std::string> replaceSuffix(const std::string& word, const Rule& rule) {
    const auto& suffix = rule.suffix;
    if (word.size() < suffix.size() || word.compare(word.size() - suffix.size(), suffix.size(), suffix) != 0)
        return std::nullopt;
    std::string stem = suffix.empty() ? word : word.substr(0, word.size() - suffix.size());
    if (rule.minMeasure >= 0 && measure(stem) < rule.minMeasure) return std::nullopt;
    if (rule.condition && !rule.condition(stem)) return std::nullopt;
    return stem + rule.replacement;
}

std::string applyRules(const std::string& word, const std::vector<Rule>& rules) {
    for (const auto& r : rules) {
        auto result = replaceSuffix(word, r);
        if (result) return *result;
    }
    return word;
}

std::string step1a(const std::string& word) {
    std::vector<std::pair<std::string, std::string>> pairs = {{"sses", "ss"}, {"ies", "i"}, {"ss", "ss"}, {"s", ""}};
    for (auto& [suffix, repl] : pairs) {
        if (word.size() >= suffix.size() && word.compare(word.size() - suffix.size(), suffix.size(), suffix) == 0)
            return word.substr(0, word.size() - suffix.size()) + repl;
    }
    return word;
}

std::string step1bCleanup(const std::string& stem) {
    std::vector<std::pair<std::string, std::string>> pairs = {{"at", "ate"}, {"bl", "ble"}, {"iz", "ize"}};
    for (auto& [suffix, repl] : pairs) {
        if (stem.size() >= suffix.size() && stem.compare(stem.size() - suffix.size(), suffix.size(), suffix) == 0)
            return stem + repl.substr(suffix.size());
    }
    if (endsDoubleConsonant(stem) && stem.back() != 'l' && stem.back() != 's' && stem.back() != 'z')
        return stem.substr(0, stem.size() - 1);
    if (measure(stem) == 1 && endsCvc(stem)) return stem + "e";
    return stem;
}

std::string step1b(const std::string& word) {
    if (word.size() >= 3 && word.compare(word.size() - 3, 3, "eed") == 0) {
        std::string stem = word.substr(0, word.size() - 3);
        return measure(stem) > 0 ? stem + "ee" : word;
    }
    for (const std::string& suffix : {std::string("ed"), std::string("ing")}) {
        if (word.size() >= suffix.size() && word.compare(word.size() - suffix.size(), suffix.size(), suffix) == 0) {
            std::string stem = word.substr(0, word.size() - suffix.size());
            return containsVowel(stem) ? step1bCleanup(stem) : word;
        }
    }
    return word;
}

std::string step1c(const std::string& word) {
    if (!word.empty() && word.back() == 'y' && word.size() > 1 && containsVowel(word.substr(0, word.size() - 1)))
        return word.substr(0, word.size() - 1) + "i";
    return word;
}

std::string step5a(const std::string& word) {
    if (!word.empty() && word.back() == 'e') {
        std::string stem = word.substr(0, word.size() - 1);
        int m = measure(stem);
        if (m > 1 || (m == 1 && !endsCvc(stem))) return stem;
    }
    return word;
}

std::string step5b(const std::string& word) {
    if (measure(word) > 1 && endsDoubleConsonant(word) && !word.empty() && word.back() == 'l')
        return word.substr(0, word.size() - 1);
    return word;
}

std::string porterStem(std::string word) {
    std::transform(word.begin(), word.end(), word.begin(), [](unsigned char c) { return std::tolower(c); });
    if (word.size() <= 2) return word;

    static const std::vector<Rule> step2Rules = {
        {"ational", "ate", 1}, {"tional", "tion", 1}, {"enci", "ence", 1}, {"anci", "ance", 1},
        {"izer", "ize", 1}, {"abli", "able", 1}, {"alli", "al", 1}, {"entli", "ent", 1},
        {"eli", "e", 1}, {"ousli", "ous", 1}, {"ization", "ize", 1}, {"ation", "ate", 1},
        {"ator", "ate", 1}, {"alism", "al", 1}, {"iveness", "ive", 1}, {"fulness", "ful", 1},
        {"ousness", "ous", 1}, {"aliti", "al", 1}, {"iviti", "ive", 1}, {"biliti", "ble", 1},
    };
    static const std::vector<Rule> step3Rules = {
        {"icate", "ic", 1}, {"ative", "", 1}, {"alize", "al", 1}, {"iciti", "ic", 1},
        {"ical", "ic", 1}, {"ful", "", 1}, {"ness", "", 1},
    };
    static const std::vector<Rule> step4Rules = {
        {"al", "", 2}, {"ance", "", 2}, {"ence", "", 2}, {"er", "", 2}, {"ic", "", 2},
        {"able", "", 2}, {"ible", "", 2}, {"ant", "", 2}, {"ement", "", 2}, {"ment", "", 2},
        {"ent", "", 2},
        {"ion", "", 2, [](const std::string& stem) { return !stem.empty() && (stem.back() == 's' || stem.back() == 't'); }},
        {"ou", "", 2}, {"ism", "", 2}, {"ate", "", 2}, {"iti", "", 2}, {"ous", "", 2},
        {"ive", "", 2}, {"ize", "", 2},
    };

    word = step1a(word);
    word = step1b(word);
    word = step1c(word);
    word = applyRules(word, step2Rules);
    word = applyRules(word, step3Rules);
    word = applyRules(word, step4Rules);
    word = step5a(word);
    word = step5b(word);
    return word;
}
```

```rust
fn is_consonant(word: &[u8], i: usize) -> bool {
    let ch = word[i];
    if matches!(ch, b'a' | b'e' | b'i' | b'o' | b'u') {
        return false;
    }
    if ch == b'y' {
        return i == 0 || !is_consonant(word, i - 1);
    }
    true
}

fn measure(word: &str) -> usize {
    let bytes = word.as_bytes();
    let form: Vec<u8> = (0..bytes.len()).map(|i| if is_consonant(bytes, i) { b'C' } else { b'V' }).collect();
    let mut s: Vec<u8> = Vec::new();
    for &ch in &form {
        if s.last() != Some(&ch) {
            s.push(ch);
        }
    }
    if s.first() == Some(&b'C') {
        s.remove(0);
    }
    if s.last() == Some(&b'V') {
        s.pop();
    }
    s.len() / 2
}

fn contains_vowel(word: &str) -> bool {
    let bytes = word.as_bytes();
    (0..bytes.len()).any(|i| !is_consonant(bytes, i))
}

fn ends_double_consonant(word: &str) -> bool {
    let bytes = word.as_bytes();
    bytes.len() >= 2 && bytes[bytes.len() - 1] == bytes[bytes.len() - 2] && is_consonant(bytes, bytes.len() - 1)
}

fn ends_cvc(word: &str) -> bool {
    let bytes = word.as_bytes();
    if bytes.len() < 3 {
        return false;
    }
    let (a, b, c) = (bytes.len() - 3, bytes.len() - 2, bytes.len() - 1);
    if !(is_consonant(bytes, a) && !is_consonant(bytes, b) && is_consonant(bytes, c)) {
        return false;
    }
    !matches!(bytes[c], b'w' | b'x' | b'y')
}

struct Rule {
    suffix: &'static str,
    replacement: &'static str,
    min_measure: i32,
    condition: Option<fn(&str) -> bool>,
}

fn replace_suffix(word: &str, rule: &Rule) -> Option<String> {
    if !word.ends_with(rule.suffix) {
        return None;
    }
    let stem = if rule.suffix.is_empty() { word } else { &word[..word.len() - rule.suffix.len()] };
    if rule.min_measure >= 0 && (measure(stem) as i32) < rule.min_measure {
        return None;
    }
    if let Some(cond) = rule.condition {
        if !cond(stem) {
            return None;
        }
    }
    Some(format!("{stem}{}", rule.replacement))
}

fn apply_rules(word: &str, rules: &[Rule]) -> String {
    for r in rules {
        if let Some(result) = replace_suffix(word, r) {
            return result;
        }
    }
    word.to_string()
}

fn step1a(word: &str) -> String {
    for (suffix, repl) in [("sses", "ss"), ("ies", "i"), ("ss", "ss"), ("s", "")] {
        if word.ends_with(suffix) {
            return format!("{}{}", &word[..word.len() - suffix.len()], repl);
        }
    }
    word.to_string()
}

fn step1b_cleanup(stem: &str) -> String {
    for (suffix, repl) in [("at", "ate"), ("bl", "ble"), ("iz", "ize")] {
        if stem.ends_with(suffix) {
            return format!("{stem}{}", &repl[suffix.len()..]);
        }
    }
    if ends_double_consonant(stem) {
        let last = stem.as_bytes()[stem.len() - 1];
        if last != b'l' && last != b's' && last != b'z' {
            return stem[..stem.len() - 1].to_string();
        }
    }
    if measure(stem) == 1 && ends_cvc(stem) {
        return format!("{stem}e");
    }
    stem.to_string()
}

fn step1b(word: &str) -> String {
    if word.ends_with("eed") {
        let stem = &word[..word.len() - 3];
        return if measure(stem) > 0 { format!("{stem}ee") } else { word.to_string() };
    }
    for suffix in ["ed", "ing"] {
        if word.ends_with(suffix) {
            let stem = &word[..word.len() - suffix.len()];
            return if contains_vowel(stem) { step1b_cleanup(stem) } else { word.to_string() };
        }
    }
    word.to_string()
}

fn step1c(word: &str) -> String {
    if word.ends_with('y') && word.len() > 1 && contains_vowel(&word[..word.len() - 1]) {
        return format!("{}i", &word[..word.len() - 1]);
    }
    word.to_string()
}

fn step5a(word: &str) -> String {
    if word.ends_with('e') {
        let stem = &word[..word.len() - 1];
        let m = measure(stem);
        if m > 1 || (m == 1 && !ends_cvc(stem)) {
            return stem.to_string();
        }
    }
    word.to_string()
}

fn step5b(word: &str) -> String {
    if measure(word) > 1 && ends_double_consonant(word) && word.ends_with('l') {
        return word[..word.len() - 1].to_string();
    }
    word.to_string()
}

fn porter_stem(input: &str) -> String {
    let word = input.to_lowercase();
    if word.len() <= 2 {
        return word;
    }

    let step2_rules = [
        Rule { suffix: "ational", replacement: "ate", min_measure: 1, condition: None },
        Rule { suffix: "tional", replacement: "tion", min_measure: 1, condition: None },
        Rule { suffix: "enci", replacement: "ence", min_measure: 1, condition: None },
        Rule { suffix: "anci", replacement: "ance", min_measure: 1, condition: None },
        Rule { suffix: "izer", replacement: "ize", min_measure: 1, condition: None },
        Rule { suffix: "abli", replacement: "able", min_measure: 1, condition: None },
        Rule { suffix: "alli", replacement: "al", min_measure: 1, condition: None },
        Rule { suffix: "entli", replacement: "ent", min_measure: 1, condition: None },
        Rule { suffix: "eli", replacement: "e", min_measure: 1, condition: None },
        Rule { suffix: "ousli", replacement: "ous", min_measure: 1, condition: None },
        Rule { suffix: "ization", replacement: "ize", min_measure: 1, condition: None },
        Rule { suffix: "ation", replacement: "ate", min_measure: 1, condition: None },
        Rule { suffix: "ator", replacement: "ate", min_measure: 1, condition: None },
        Rule { suffix: "alism", replacement: "al", min_measure: 1, condition: None },
        Rule { suffix: "iveness", replacement: "ive", min_measure: 1, condition: None },
        Rule { suffix: "fulness", replacement: "ful", min_measure: 1, condition: None },
        Rule { suffix: "ousness", replacement: "ous", min_measure: 1, condition: None },
        Rule { suffix: "aliti", replacement: "al", min_measure: 1, condition: None },
        Rule { suffix: "iviti", replacement: "ive", min_measure: 1, condition: None },
        Rule { suffix: "biliti", replacement: "ble", min_measure: 1, condition: None },
    ];
    let step3_rules = [
        Rule { suffix: "icate", replacement: "ic", min_measure: 1, condition: None },
        Rule { suffix: "ative", replacement: "", min_measure: 1, condition: None },
        Rule { suffix: "alize", replacement: "al", min_measure: 1, condition: None },
        Rule { suffix: "iciti", replacement: "ic", min_measure: 1, condition: None },
        Rule { suffix: "ical", replacement: "ic", min_measure: 1, condition: None },
        Rule { suffix: "ful", replacement: "", min_measure: 1, condition: None },
        Rule { suffix: "ness", replacement: "", min_measure: 1, condition: None },
    ];
    fn ends_s_or_t(stem: &str) -> bool {
        matches!(stem.as_bytes().last(), Some(b's') | Some(b't'))
    }
    let step4_rules = [
        Rule { suffix: "al", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ance", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ence", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "er", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ic", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "able", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ible", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ant", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ement", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ment", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ent", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ion", replacement: "", min_measure: 2, condition: Some(ends_s_or_t) },
        Rule { suffix: "ou", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ism", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ate", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "iti", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ous", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ive", replacement: "", min_measure: 2, condition: None },
        Rule { suffix: "ize", replacement: "", min_measure: 2, condition: None },
    ];

    let mut word = step1a(&word);
    word = step1b(&word);
    word = step1c(&word);
    word = apply_rules(&word, &step2_rules);
    word = apply_rules(&word, &step3_rules);
    word = apply_rules(&word, &step4_rules);
    word = step5a(&word);
    word = step5b(&word);
    word
}
```

```csharp
static bool IsConsonant(string word, int i)
{
    char ch = word[i];
    if ("aeiou".Contains(ch)) return false;
    if (ch == 'y') return i == 0 || !IsConsonant(word, i - 1);
    return true;
}

static int Measure(string word)
{
    var form = new System.Text.StringBuilder();
    for (int i = 0; i < word.Length; i++) form.Append(IsConsonant(word, i) ? 'C' : 'V');
    var s = new System.Text.StringBuilder();
    foreach (var ch in form.ToString())
        if (s.Length == 0 || s[^1] != ch) s.Append(ch);
    string result = s.ToString();
    if (result.StartsWith("C")) result = result[1..];
    if (result.EndsWith("V")) result = result[..^1];
    return result.Length / 2;
}

static bool ContainsVowel(string word)
{
    for (int i = 0; i < word.Length; i++) if (!IsConsonant(word, i)) return true;
    return false;
}

static bool EndsDoubleConsonant(string word) =>
    word.Length >= 2 && word[^1] == word[^2] && IsConsonant(word, word.Length - 1);

static bool EndsCvc(string word)
{
    if (word.Length < 3) return false;
    int a = word.Length - 3, b = word.Length - 2, c = word.Length - 1;
    if (!(IsConsonant(word, a) && !IsConsonant(word, b) && IsConsonant(word, c))) return false;
    return word[c] != 'w' && word[c] != 'x' && word[c] != 'y';
}

record Rule(string Suffix, string Replacement, int MinMeasure = -1, Func<string, bool>? Condition = null);

static string? ReplaceSuffix(string word, string suffix, string replacement, int minMeasure, Func<string, bool>? condition)
{
    if (!word.EndsWith(suffix)) return null;
    string stem = suffix.Length > 0 ? word[..^suffix.Length] : word;
    if (minMeasure >= 0 && Measure(stem) < minMeasure) return null;
    if (condition != null && !condition(stem)) return null;
    return stem + replacement;
}

static string ApplyRules(string word, List<Rule> rules)
{
    foreach (var r in rules)
    {
        var result = ReplaceSuffix(word, r.Suffix, r.Replacement, r.MinMeasure, r.Condition);
        if (result != null) return result;
    }
    return word;
}

static string Step1A(string word)
{
    foreach (var (suffix, repl) in new[] { ("sses", "ss"), ("ies", "i"), ("ss", "ss"), ("s", "") })
        if (word.EndsWith(suffix)) return word[..^suffix.Length] + repl;
    return word;
}

static string Step1BCleanup(string stem)
{
    foreach (var (suffix, repl) in new[] { ("at", "ate"), ("bl", "ble"), ("iz", "ize") })
        if (stem.EndsWith(suffix)) return stem + repl[suffix.Length..];
    if (EndsDoubleConsonant(stem) && stem[^1] != 'l' && stem[^1] != 's' && stem[^1] != 'z')
        return stem[..^1];
    if (Measure(stem) == 1 && EndsCvc(stem)) return stem + "e";
    return stem;
}

static string Step1B(string word)
{
    if (word.EndsWith("eed"))
    {
        string stem = word[..^3];
        return Measure(stem) > 0 ? stem + "ee" : word;
    }
    foreach (var suffix in new[] { "ed", "ing" })
    {
        if (word.EndsWith(suffix))
        {
            string stem = word[..^suffix.Length];
            return ContainsVowel(stem) ? Step1BCleanup(stem) : word;
        }
    }
    return word;
}

static string Step1C(string word) =>
    word.EndsWith("y") && word.Length > 1 && ContainsVowel(word[..^1]) ? word[..^1] + "i" : word;

static readonly List<Rule> Step2Rules = new()
{
    new("ational", "ate", 1), new("tional", "tion", 1), new("enci", "ence", 1), new("anci", "ance", 1),
    new("izer", "ize", 1), new("abli", "able", 1), new("alli", "al", 1), new("entli", "ent", 1),
    new("eli", "e", 1), new("ousli", "ous", 1), new("ization", "ize", 1), new("ation", "ate", 1),
    new("ator", "ate", 1), new("alism", "al", 1), new("iveness", "ive", 1), new("fulness", "ful", 1),
    new("ousness", "ous", 1), new("aliti", "al", 1), new("iviti", "ive", 1), new("biliti", "ble", 1),
};

static readonly List<Rule> Step3Rules = new()
{
    new("icate", "ic", 1), new("ative", "", 1), new("alize", "al", 1), new("iciti", "ic", 1),
    new("ical", "ic", 1), new("ful", "", 1), new("ness", "", 1),
};

static readonly List<Rule> Step4Rules = new()
{
    new("al", "", 2), new("ance", "", 2), new("ence", "", 2), new("er", "", 2), new("ic", "", 2),
    new("able", "", 2), new("ible", "", 2), new("ant", "", 2), new("ement", "", 2), new("ment", "", 2),
    new("ent", "", 2),
    new("ion", "", 2, stem => stem.Length > 0 && (stem[^1] == 's' || stem[^1] == 't')),
    new("ou", "", 2), new("ism", "", 2), new("ate", "", 2), new("iti", "", 2), new("ous", "", 2),
    new("ive", "", 2), new("ize", "", 2),
};

static string Step5A(string word)
{
    if (word.EndsWith("e"))
    {
        string stem = word[..^1];
        int m = Measure(stem);
        if (m > 1 || (m == 1 && !EndsCvc(stem))) return stem;
    }
    return word;
}

static string Step5B(string word) =>
    Measure(word) > 1 && EndsDoubleConsonant(word) && word.EndsWith("l") ? word[..^1] : word;

static string PorterStem(string input)
{
    string word = input.ToLowerInvariant();
    if (word.Length <= 2) return word;
    word = Step1A(word);
    word = Step1B(word);
    word = Step1C(word);
    word = ApplyRules(word, Step2Rules);
    word = ApplyRules(word, Step3Rules);
    word = ApplyRules(word, Step4Rules);
    word = Step5A(word);
    word = Step5B(word);
    return word;
}
```
