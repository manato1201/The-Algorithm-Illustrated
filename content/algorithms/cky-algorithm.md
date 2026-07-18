---
name: CKY法(Cocke-Younger-Kasami法)
category: 自然言語処理
subcategory: 系列ラベリング・構文解析
complexity: O(n³ × |文法規則数|)(n単語の文)
summary: 文をあらゆる部分区間に分割し、それぞれがどの文法カテゴリになりうるかを表に埋めていくことで、文脈自由文法に基づく構文解析を効率的に行う動的計画法。
---

## 概要

「時 蝿を 好む」のような文がどの単語がどの単語を修飾しているかという構文構造(構文木)を明らかにするのが構文解析である。文脈自由文法(CFG)に基づく構文解析は、素朴には文の分割の仕方が指数的に多く組み合わせ爆発を起こすが、1965年前後にCocke・Younger・笠原がそれぞれ独立に考案したCKY法は、[動的計画法](/algorithms/lcs)の考え方を使い、文のあらゆる「連続する部分区間」について「この区間はどの文法カテゴリになりうるか」を小さい区間から大きい区間へ順に埋めていくことで、多項式時間で構文解析を実現する。

## 仕組み

1. 文法をチョムスキー標準形(CNF: 全ての規則が`A → B C`または`A → 単語`の形)に変換しておく——CKY法はこの標準形を前提とする
2. `n`単語の文に対して、`table[i][j]`(区間`[i, j)`)に「その区間の単語列が生成しうる文法カテゴリの集合」を格納する`n×n`の表を用意する
3. 長さ1の区間(各単語)について、`A → 単語`の規則に一致する文法カテゴリを`table[i][i+1]`に登録する(表の対角線を埋める)
4. 長さ`L`の区間`[i, i+L)`について、その区間を2つに分割する点`k`(`i < k < i+L`)を全て試し、左側`[i, k)`のカテゴリの集合`table[i][k]`と右側`[k, i+L)`のカテゴリの集合`table[k][i+L]`の組み合わせのうち、`A → B C`という規則に一致する`A`を`table[i][i+L]`に追加する——これは[LCS](/algorithms/lcs)や[行列連鎖乗算](/algorithms/matrix-chain-multiplication)における「分割点を全て試す区間DP」と全く同じ構造
5. 長さの短い区間から長い区間へ順に表を埋めていき、最終的に文全体`table[0][n]`に開始記号(文全体を表すカテゴリ、通常"S")が含まれていれば、その文はこの文法で生成可能であり、表の埋め方を逆に辿ることで構文木を復元できる

## 特性・トレードオフ

- **計算量**: `n`単語の文に対して、区間の選び方が`O(n²)`通り、各区間の分割点が`O(n)`通り、文法規則の照合に`O(文法規則数)`かかるので、全体で`O(n³ × 文法規則数)`。文脈自由文法の構文解析としては効率的な部類に入る
- **[行列連鎖乗算](/algorithms/matrix-chain-multiplication)との構造的な類似性**: 「区間を全ての分割点で2つに割り、それぞれの部分解を組み合わせる」という区間DPの骨格は、行列連鎖乗算の最適な括弧付け問題と全く同じであり、対象がテキストか行列の並びかが違うだけである
- **チョムスキー標準形への変換コスト**: CKY法を使うには文法を事前にCNFへ変換する必要があり、この変換によって元の文法規則よりも規則数が増えることがある(計算量の`文法規則数`の項に影響する)
- **使いどころ**: 自然言語の構文解析(統計的自然言語処理における基礎的な構文解析アルゴリズム)、プログラミング言語のパーサジェネレータの理論的基盤の一部、RNA二次構造予測([Nussinov法](/algorithms/nussinov-algorithm)よりも文法的な制約を表現できる、確率文脈自由文法を使った予測手法)にも構造的に近い考え方が応用される

## 実装例

```python
def cky_parse(
    words: list[str],
    grammar_binary: dict[tuple[str, str], set[str]],  # A -> B C
    grammar_unary: dict[str, set[str]],  # A -> word
) -> list[list[set[str]]]:
    n = len(words)
    table: list[list[set[str]]] = [[set() for _ in range(n + 1)] for _ in range(n + 1)]
    for i in range(n):
        table[i][i + 1] = set(grammar_unary.get(words[i], set()))
    for length in range(2, n + 1):
        for i in range(0, n - length + 1):
            j = i + length
            cell: set[str] = set()
            for k in range(i + 1, j):  # 分割点kを全て試す
                for b in table[i][k]:
                    for c in table[k][j]:
                        cell |= grammar_binary.get((b, c), set())
            table[i][j] = cell
    return table


# 文法: S -> NP VP, VP -> V NP, NP -> Det N | 'John'
grammar_unary = {"John": {"NP"}, "saw": {"V"}, "the": {"Det"}, "dog": {"N"}, "telescope": {"N"}}
grammar_binary = {("NP", "VP"): {"S"}, ("V", "NP"): {"VP"}, ("Det", "N"): {"NP"}}
```

```typescript
function ckyParse(
  words: string[],
  grammarBinary: Map<string, Set<string>>, // "B,C" -> {A}  (A -> B C)
  grammarUnary: Map<string, Set<string>> // word -> {A}  (A -> word)
): Set<string>[][] {
  const n = words.length;
  const table: Set<string>[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: n + 1 }, () => new Set<string>())
  );
  for (let i = 0; i < n; i++) table[i][i + 1] = new Set(grammarUnary.get(words[i]) ?? []);
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i <= n - length; i++) {
      const j = i + length;
      const cell = new Set<string>();
      for (let k = i + 1; k < j; k++) {
        for (const b of table[i][k]) {
          for (const c of table[k][j]) {
            const results = grammarBinary.get(`${b},${c}`);
            if (results) for (const r of results) cell.add(r);
          }
        }
      }
      table[i][j] = cell;
    }
  }
  return table;
}
```

```cpp
#include <vector>
#include <string>
#include <set>
#include <map>

std::vector<std::vector<std::set<std::string>>> ckyParse(
    const std::vector<std::string>& words,
    const std::map<std::pair<std::string, std::string>, std::set<std::string>>& grammarBinary,
    const std::map<std::string, std::set<std::string>>& grammarUnary) {
    int n = static_cast<int>(words.size());
    std::vector<std::vector<std::set<std::string>>> table(n + 1, std::vector<std::set<std::string>>(n + 1));
    for (int i = 0; i < n; i++) {
        auto it = grammarUnary.find(words[i]);
        if (it != grammarUnary.end()) table[i][i + 1] = it->second;
    }
    for (int length = 2; length <= n; length++) {
        for (int i = 0; i <= n - length; i++) {
            int j = i + length;
            std::set<std::string> cell;
            for (int k = i + 1; k < j; k++) {
                for (const auto& b : table[i][k]) {
                    for (const auto& c : table[k][j]) {
                        auto it = grammarBinary.find({b, c});
                        if (it != grammarBinary.end()) cell.insert(it->second.begin(), it->second.end());
                    }
                }
            }
            table[i][j] = cell;
        }
    }
    return table;
}
```

```rust
use std::collections::{HashMap, HashSet};

fn cky_parse(
    words: &[&str],
    grammar_binary: &HashMap<(String, String), HashSet<String>>,
    grammar_unary: &HashMap<String, HashSet<String>>,
) -> Vec<Vec<HashSet<String>>> {
    let n = words.len();
    let mut table: Vec<Vec<HashSet<String>>> = vec![vec![HashSet::new(); n + 1]; n + 1];
    for i in 0..n {
        if let Some(cats) = grammar_unary.get(words[i]) {
            table[i][i + 1] = cats.clone();
        }
    }
    for length in 2..=n {
        for i in 0..=(n - length) {
            let j = i + length;
            let mut cell = HashSet::new();
            for k in (i + 1)..j {
                for b in table[i][k].clone() {
                    for c in table[k][j].clone() {
                        if let Some(results) = grammar_binary.get(&(b.clone(), c.clone())) {
                            cell.extend(results.iter().cloned());
                        }
                    }
                }
            }
            table[i][j] = cell;
        }
    }
    table
}
```

```csharp
static HashSet<string>[,] CkyParse(
    string[] words,
    Dictionary<(string, string), HashSet<string>> grammarBinary,
    Dictionary<string, HashSet<string>> grammarUnary)
{
    int n = words.Length;
    var table = new HashSet<string>[n + 1, n + 1];
    for (int i = 0; i <= n; i++)
        for (int j = 0; j <= n; j++) table[i, j] = new HashSet<string>();

    for (int i = 0; i < n; i++)
        table[i, i + 1] = grammarUnary.TryGetValue(words[i], out var v) ? new HashSet<string>(v) : new HashSet<string>();

    for (int length = 2; length <= n; length++)
    {
        for (int i = 0; i <= n - length; i++)
        {
            int j = i + length;
            var cell = new HashSet<string>();
            for (int k = i + 1; k < j; k++)
                foreach (var b in table[i, k])
                    foreach (var c in table[k, j])
                        if (grammarBinary.TryGetValue((b, c), out var results))
                            cell.UnionWith(results);
            table[i, j] = cell;
        }
    }
    return table;
}
```
