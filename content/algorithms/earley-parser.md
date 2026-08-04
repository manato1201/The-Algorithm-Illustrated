---
name: アーリー法(Earley Parser)
category: コンパイラ・構文解析
subcategory: 構文解析
complexity: O(n³)(最悪、n=入力長)、O(n²)(曖昧さのない文法)、O(n)(多くのLR文法)
summary: "[LL(1)構文解析](/algorithms/ll1-parsing)や[LR(0)構文解析](/algorithms/lr0-parsing)が扱える文法のクラスに制限があるのに対し、あらゆる文脈自由文法(左再帰・曖昧な文法を含む)を解析できる、動的計画法に基づく汎用構文解析アルゴリズム。"
---

## 概要

[LL(1)構文解析](/algorithms/ll1-parsing)や[LR(0)構文解析](/algorithms/lr0-parsing)は高速だが、扱える文法のクラスに制約がある(左再帰があるとLL法は無限ループに陥る、曖昧な文法はLR法の構文解析表に競合を生む)。1970年にジェイ・アーリー(Earley)が発表したこのアルゴリズムは、あらゆる文脈自由文法——左再帰や曖昧さを含むものも含めて——を解析できる汎用性を持つ。[CKY法](/algorithms/cky-algorithm)が文法をチョムスキー標準形に変換する必要があるのに対し、アーリー法は任意の文脈自由文法をそのままの形で扱えるという実用上の利便性も持ち、自然言語の構文解析のように文法の曖昧さが避けられない場面で特に重宝される。

## 仕組み

1. 入力文字列の各位置`0,1,...,n`に対応する「状態集合」を用意する。各状態は「今どの生成規則のどこまでを認識しているか」を、規則の右辺の途中にドット`・`を挿入した形(例えば`A → α・β`、αまで認識済みでβはこれから)で表現する
2. 位置`0`の状態集合を、開始記号から導出される規則の初期状態(ドットが右辺の先頭にある状態)で初期化する
3. 各位置の状態集合に対して、3種類の操作を状態が増えなくなるまで繰り返し適用する: **予測(Predict)**——ドットの直後が非終端記号なら、その非終端記号を導出しうる規則の初期状態を追加する。**走査(Scan)**——ドットの直後が終端記号で、それが次の入力文字と一致するなら、ドットを1つ右に進めた状態を次の位置の状態集合に追加する。**完了(Complete)**——ドットが規則の末尾に達した(その規則を最後まで認識できた)なら、その規則を予測するきっかけとなった元の状態のドットを1つ進める
4. 入力の最後の位置まで処理し終えたとき、開始記号の規則全体を認識し終えた状態が存在すれば、その文字列はその文法から導出可能と判定できる
5. 各状態がどの状態から生成されたかを記録しておけば、導出木(構文解析木)を再構成することもできる

## 特性・トレードオフ

- **計算量**: 最悪ケース(高度に曖昧な文法)では`O(n³)`だが、曖昧さのない文法では`O(n²)`、[LR(0)構文解析](/algorithms/lr0-parsing)が扱えるような文法のクラスでは実質`O(n)`まで改善される——文法の性質に応じて計算量が滑らかに変化する適応的な性能を持つ
- **あらゆる文脈自由文法を扱える汎用性**: [LL(1)構文解析](/algorithms/ll1-parsing)や[LR(0)構文解析](/algorithms/lr0-parsing)のように、事前に文法を特定の形(左再帰の除去、競合の解消)に変換しておく必要がない——文法設計の自由度が高く、特に自然言語のように曖昧さを完全には排除できない文法を扱う場面で強みを発揮する
- **プログラミング言語のコンパイラでは採用されにくい理由**: プログラミング言語の文法は通常、曖昧さのない(あるいは意図的に曖昧さを排除した)`LL`または`LR`文法として設計できるため、アーリー法の`O(n³)`の最悪計算量というコストを払ってまで汎用性を求める必要がない——実務のコンパイラでは[LR(0)構文解析](/algorithms/lr0-parsing)やその拡張(LALR等)が好まれ、アーリー法は自然言語処理や、文法があらかじめ完全には分からない汎用パーサジェネレータで使われることが多い
- **[CKY法](/algorithms/cky-algorithm)との比較**: [CKY法](/algorithms/cky-algorithm)も動的計画法ベースで曖昧な文法を扱えるが、文法をチョムスキー標準形に変換する前処理が必須である。アーリー法は任意の文脈自由文法をそのまま扱える分、実装や文法設計の柔軟性で優れる
- **使いどころ**: 自然言語処理における構文解析(曖昧な文法を扱う必要がある)、汎用パーサジェネレータ・言語のプロトタイピング(文法をLL/LRの制約に合わせて調整する手間を省きたい場面)、プログラミング言語の文法設計段階での実験的な構文解析器

## 実装例

括弧の対応を表す左再帰的な文法`S -> ( S ) S | ε`を認識する例。この文法はLL(1)では素朴には扱えないが、アーリー法ならそのまま解析できる。

```python
class EarleyState:
    __slots__ = ("rule_name", "production", "dot", "start")

    def __init__(self, rule_name: str, production: tuple[str, ...], dot: int, start: int):
        self.rule_name = rule_name
        self.production = production
        self.dot = dot
        self.start = start

    def next_symbol(self) -> str | None:
        return self.production[self.dot] if self.dot < len(self.production) else None

    def is_complete(self) -> bool:
        return self.dot == len(self.production)

    def advance(self) -> "EarleyState":
        return EarleyState(self.rule_name, self.production, self.dot + 1, self.start)

    def key(self):
        return (self.rule_name, self.production, self.dot, self.start)


def earley_parse(grammar: dict[str, list[list[str]]], start_symbol: str, tokens: list[str]) -> bool:
    n = len(tokens)
    chart: list[list[EarleyState]] = [[] for _ in range(n + 1)]
    chart_keys: list[set] = [set() for _ in range(n + 1)]

    def add_state(i: int, state: EarleyState) -> None:
        k = state.key()
        if k not in chart_keys[i]:
            chart_keys[i].add(k)
            chart[i].append(state)

    for prod in grammar[start_symbol]:
        add_state(0, EarleyState(start_symbol, tuple(prod), 0, 0))

    for i in range(n + 1):
        j = 0
        while j < len(chart[i]):
            state = chart[i][j]
            sym = state.next_symbol()
            if state.is_complete():
                # 完了: このルールを予測したもとの状態のドットを進める
                for s2 in list(chart[state.start]):
                    if s2.next_symbol() == state.rule_name:
                        add_state(i, s2.advance())
            elif sym in grammar:
                # 予測: 非終端記号を導出しうる規則の初期状態を追加
                for prod in grammar[sym]:
                    add_state(i, EarleyState(sym, tuple(prod), 0, i))
            else:
                # 走査: 終端記号が次の入力と一致すればドットを進める
                if i < n and tokens[i] == sym:
                    add_state(i + 1, state.advance())
            j += 1

    return any(
        s.rule_name == start_symbol and s.is_complete() and s.start == 0
        for s in chart[n]
    )
```

```typescript
interface EarleyStateT {
  ruleName: string;
  production: string[];
  dot: number;
  start: number;
}

function nextSymbol(s: EarleyStateT): string | null {
  return s.dot < s.production.length ? s.production[s.dot] : null;
}
function isComplete(s: EarleyStateT): boolean {
  return s.dot === s.production.length;
}
function advance(s: EarleyStateT): EarleyStateT {
  return { ...s, dot: s.dot + 1 };
}
function stateKey(s: EarleyStateT): string {
  return `${s.ruleName}|${s.production.join(",")}|${s.dot}|${s.start}`;
}

function earleyParse(grammar: Record<string, string[][]>, startSymbol: string, tokens: string[]): boolean {
  const n = tokens.length;
  const chart: EarleyStateT[][] = Array.from({ length: n + 1 }, () => []);
  const chartKeys: Set<string>[] = Array.from({ length: n + 1 }, () => new Set());

  const addState = (i: number, state: EarleyStateT) => {
    const k = stateKey(state);
    if (!chartKeys[i].has(k)) {
      chartKeys[i].add(k);
      chart[i].push(state);
    }
  };

  for (const prod of grammar[startSymbol]) {
    addState(0, { ruleName: startSymbol, production: prod, dot: 0, start: 0 });
  }

  for (let i = 0; i <= n; i++) {
    let j = 0;
    while (j < chart[i].length) {
      const state = chart[i][j];
      const sym = nextSymbol(state);
      if (isComplete(state)) {
        for (const s2 of [...chart[state.start]]) {
          if (nextSymbol(s2) === state.ruleName) addState(i, advance(s2));
        }
      } else if (sym !== null && sym in grammar) {
        for (const prod of grammar[sym]) {
          addState(i, { ruleName: sym, production: prod, dot: 0, start: i });
        }
      } else {
        if (i < n && tokens[i] === sym) addState(i + 1, advance(state));
      }
      j += 1;
    }
  }

  return chart[n].some((s) => s.ruleName === startSymbol && isComplete(s) && s.start === 0);
}
```

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <optional>

struct EarleyState {
    std::string ruleName;
    std::vector<std::string> production;
    int dot;
    int start;

    std::optional<std::string> nextSymbol() const {
        if (dot < static_cast<int>(production.size())) return production[dot];
        return std::nullopt;
    }
    bool isComplete() const { return dot == static_cast<int>(production.size()); }
    EarleyState advance() const { return { ruleName, production, dot + 1, start }; }
    std::string key() const {
        std::string k = ruleName + "|";
        for (const auto& s : production) k += s + ",";
        k += "|" + std::to_string(dot) + "|" + std::to_string(start);
        return k;
    }
};

bool earleyParse(const std::unordered_map<std::string, std::vector<std::vector<std::string>>>& grammar,
                  const std::string& startSymbol, const std::vector<std::string>& tokens) {
    int n = static_cast<int>(tokens.size());
    std::vector<std::vector<EarleyState>> chart(n + 1);
    std::vector<std::unordered_set<std::string>> chartKeys(n + 1);

    auto addState = [&](int i, const EarleyState& state) {
        auto k = state.key();
        if (chartKeys[i].insert(k).second) chart[i].push_back(state);
    };

    for (const auto& prod : grammar.at(startSymbol)) {
        addState(0, { startSymbol, prod, 0, 0 });
    }

    for (int i = 0; i <= n; i++) {
        size_t j = 0;
        while (j < chart[i].size()) {
            EarleyState state = chart[i][j];  // コピー: chart[i]への追加で再配置される可能性があるため
            auto sym = state.nextSymbol();
            if (state.isComplete()) {
                auto startStates = chart[state.start];  // コピーしてから走査(同時追加に対応)
                for (const auto& s2 : startStates) {
                    if (s2.nextSymbol() == state.ruleName) addState(i, s2.advance());
                }
            } else if (sym.has_value() && grammar.count(*sym)) {
                for (const auto& prod : grammar.at(*sym)) {
                    addState(i, { *sym, prod, 0, i });
                }
            } else {
                if (i < n && sym.has_value() && tokens[i] == *sym) addState(i + 1, state.advance());
            }
            j++;
        }
    }

    for (const auto& s : chart[n]) {
        if (s.ruleName == startSymbol && s.isComplete() && s.start == 0) return true;
    }
    return false;
}
```

```rust
use std::collections::{HashMap, HashSet};
use std::rc::Rc;

#[derive(Clone)]
struct EarleyState {
    rule_name: String,
    production: Rc<Vec<String>>,
    dot: usize,
    start: usize,
}

impl EarleyState {
    fn next_symbol(&self) -> Option<&str> {
        self.production.get(self.dot).map(|s| s.as_str())
    }
    fn is_complete(&self) -> bool {
        self.dot == self.production.len()
    }
    fn advance(&self) -> EarleyState {
        EarleyState { rule_name: self.rule_name.clone(), production: Rc::clone(&self.production), dot: self.dot + 1, start: self.start }
    }
    fn key(&self) -> String {
        format!("{}|{}|{}|{}", self.rule_name, self.production.join(","), self.dot, self.start)
    }
}

fn earley_parse(grammar: &HashMap<String, Vec<Rc<Vec<String>>>>, start_symbol: &str, tokens: &[String]) -> bool {
    let n = tokens.len();
    let mut chart: Vec<Vec<EarleyState>> = vec![Vec::new(); n + 1];
    let mut chart_keys: Vec<HashSet<String>> = vec![HashSet::new(); n + 1];

    let mut add_state = |chart: &mut Vec<Vec<EarleyState>>, keys: &mut Vec<HashSet<String>>, i: usize, state: EarleyState| {
        let k = state.key();
        if keys[i].insert(k) {
            chart[i].push(state);
        }
    };

    if let Some(prods) = grammar.get(start_symbol) {
        for prod in prods {
            add_state(&mut chart, &mut chart_keys, 0, EarleyState {
                rule_name: start_symbol.to_string(), production: Rc::clone(prod), dot: 0, start: 0,
            });
        }
    }

    for i in 0..=n {
        let mut j = 0;
        while j < chart[i].len() {
            let state = chart[i][j].clone();
            let sym = state.next_symbol().map(|s| s.to_string());
            if state.is_complete() {
                let start_states = chart[state.start].clone();
                for s2 in &start_states {
                    if s2.next_symbol() == Some(state.rule_name.as_str()) {
                        add_state(&mut chart, &mut chart_keys, i, s2.advance());
                    }
                }
            } else if let Some(sym_str) = &sym {
                if let Some(prods) = grammar.get(sym_str) {
                    for prod in prods {
                        add_state(&mut chart, &mut chart_keys, i, EarleyState {
                            rule_name: sym_str.clone(), production: Rc::clone(prod), dot: 0, start: i,
                        });
                    }
                } else if i < n && &tokens[i] == sym_str {
                    add_state(&mut chart, &mut chart_keys, i + 1, state.advance());
                }
            }
            j += 1;
        }
    }

    chart[n].iter().any(|s| s.rule_name == start_symbol && s.is_complete() && s.start == 0)
}
```

```csharp
class EarleyState
{
    public string RuleName;
    public List<string> Production;
    public int Dot;
    public int Start;

    public EarleyState(string ruleName, List<string> production, int dot, int start)
    {
        RuleName = ruleName; Production = production; Dot = dot; Start = start;
    }

    public string? NextSymbol() => Dot < Production.Count ? Production[Dot] : null;
    public bool IsComplete() => Dot == Production.Count;
    public EarleyState Advance() => new EarleyState(RuleName, Production, Dot + 1, Start);
    public string Key() => $"{RuleName}|{string.Join(",", Production)}|{Dot}|{Start}";
}

static class EarleyParser
{
    public static bool Parse(Dictionary<string, List<List<string>>> grammar, string startSymbol, List<string> tokens)
    {
        int n = tokens.Count;
        var chart = new List<EarleyState>[n + 1];
        var chartKeys = new HashSet<string>[n + 1];
        for (int i = 0; i <= n; i++) { chart[i] = new List<EarleyState>(); chartKeys[i] = new HashSet<string>(); }

        void AddState(int i, EarleyState state)
        {
            var k = state.Key();
            if (chartKeys[i].Add(k)) chart[i].Add(state);
        }

        foreach (var prod in grammar[startSymbol]) AddState(0, new EarleyState(startSymbol, prod, 0, 0));

        for (int i = 0; i <= n; i++)
        {
            int j = 0;
            while (j < chart[i].Count)
            {
                var state = chart[i][j];
                var sym = state.NextSymbol();
                if (state.IsComplete())
                {
                    foreach (var s2 in chart[state.Start].ToList())
                    {
                        if (s2.NextSymbol() == state.RuleName) AddState(i, s2.Advance());
                    }
                }
                else if (sym != null && grammar.ContainsKey(sym))
                {
                    foreach (var prod in grammar[sym]) AddState(i, new EarleyState(sym, prod, 0, i));
                }
                else
                {
                    if (i < n && tokens[i] == sym) AddState(i + 1, state.Advance());
                }
                j += 1;
            }
        }

        return chart[n].Any(s => s.RuleName == startSymbol && s.IsComplete() && s.Start == 0);
    }
}
```
