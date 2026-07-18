---
name: KMP法(Knuth-Morris-Pratt法)
category: 文字列
subcategory: パターンマッチング
complexity: O(n + m)
summary: 不一致時に照合済み情報を使い、パターンを後戻りさせずに文字列検索する。
---

## 概要

長いテキストの中から特定のパターン文字列を探す「文字列検索」の、最も基本的な素朴な方法(先頭から1文字ずつ総当たりで比較する)はO(nm)かかる。KMP法は、**一度比較して不一致になった情報を捨てずに再利用する**ことで、テキスト側のポインタを一度も後戻りさせずにO(n + m)まで高速化する、文字列アルゴリズムの金字塔。

## 仕組み

KMP法の核心は、パターン文字列自身から事前に計算しておく**「失敗関数(部分一致テーブル)」**にある。

1. **失敗関数の構築**: パターン文字列の各位置iについて、「パターンの先頭からi文字目までの接頭辞」と「同じ範囲の接尾辞」が最大何文字一致するかを表す値を計算しておく(パターン自体の自己相似性を事前分析する)
2. **検索本体**: テキストとパターンを先頭から比較していき、不一致が起きたら、テキスト側のポインタは動かさず、**失敗関数を使ってパターン側のポインタだけを賢く巻き戻す**。「今までの一致部分の中に、次の照合に再利用できる情報がどれだけあるか」を失敗関数が教えてくれるため、既に一致を確認済みの文字を二度と比較し直す必要がない

「不一致が起きたときにどこまで戻ればよいか」を、パターン文字列自身の構造(自己相似性)から事前に計算しておく、という発想がこのアルゴリズムの独創性。

## 特性・トレードオフ

- **計算量**: O(n + m)(n=テキストの長さ、m=パターンの長さ)。テキスト側のポインタが後戻りしないことが、この線形時間の保証につながっている
- **前処理が必要**: 失敗関数の構築にO(m)かかるが、これは検索対象のテキストの長さに関わらず一度だけで済む
- **オートマトンとしての側面**: 失敗関数は、パターンとの照合状態を表す有限オートマトンの遷移規則とみなすこともでき、Aho-Corasick法(複数パターンへの拡張)の理論的な土台にもなっている
- **使いどころ**: テキストエディタの検索機能、`grep`のような文字列検索ツール、DNA配列中の特定パターンの検出など、単一パターンの文字列検索が必要なあらゆる場面の基礎

## 実装例

パターンが出現する全ての開始位置(0-indexed)を返す。

```python
def build_failure_function(pattern: str) -> list[int]:
    m = len(pattern)
    fail = [0] * m
    k = 0
    for i in range(1, m):
        while k > 0 and pattern[i] != pattern[k]:
            k = fail[k - 1]
        if pattern[i] == pattern[k]:
            k += 1
        fail[i] = k
    return fail


def kmp_search(text: str, pattern: str) -> list[int]:
    if not pattern:
        return []
    fail = build_failure_function(pattern)
    result = []
    k = 0
    for i in range(len(text)):
        while k > 0 and text[i] != pattern[k]:
            k = fail[k - 1]  # 不一致時、パターン側だけを賢く巻き戻す
        if text[i] == pattern[k]:
            k += 1
        if k == len(pattern):
            result.append(i - len(pattern) + 1)
            k = fail[k - 1]
    return result
```

```typescript
function buildFailureFunction(pattern: string): number[] {
  const m = pattern.length;
  const fail = new Array(m).fill(0);
  let k = 0;
  for (let i = 1; i < m; i++) {
    while (k > 0 && pattern[i] !== pattern[k]) k = fail[k - 1];
    if (pattern[i] === pattern[k]) k++;
    fail[i] = k;
  }
  return fail;
}

function kmpSearch(text: string, pattern: string): number[] {
  if (pattern.length === 0) return [];
  const fail = buildFailureFunction(pattern);
  const result: number[] = [];
  let k = 0;
  for (let i = 0; i < text.length; i++) {
    while (k > 0 && text[i] !== pattern[k]) k = fail[k - 1]; // 不一致時、パターン側だけを賢く巻き戻す
    if (text[i] === pattern[k]) k++;
    if (k === pattern.length) {
      result.push(i - pattern.length + 1);
      k = fail[k - 1];
    }
  }
  return result;
}
```

```cpp
#include <string>
#include <vector>

std::vector<int> buildFailureFunction(const std::string& pattern) {
    int m = static_cast<int>(pattern.size());
    std::vector<int> fail(m, 0);
    int k = 0;
    for (int i = 1; i < m; i++) {
        while (k > 0 && pattern[i] != pattern[k]) k = fail[k - 1];
        if (pattern[i] == pattern[k]) k++;
        fail[i] = k;
    }
    return fail;
}

std::vector<int> kmpSearch(const std::string& text, const std::string& pattern) {
    std::vector<int> result;
    if (pattern.empty()) return result;
    std::vector<int> fail = buildFailureFunction(pattern);
    int k = 0;
    for (int i = 0; i < static_cast<int>(text.size()); i++) {
        while (k > 0 && text[i] != pattern[k]) k = fail[k - 1]; // 不一致時、パターン側だけを賢く巻き戻す
        if (text[i] == pattern[k]) k++;
        if (k == static_cast<int>(pattern.size())) {
            result.push_back(i - static_cast<int>(pattern.size()) + 1);
            k = fail[k - 1];
        }
    }
    return result;
}
```

```rust
fn build_failure_function(pattern: &[u8]) -> Vec<usize> {
    let m = pattern.len();
    let mut fail = vec![0usize; m];
    let mut k = 0usize;
    for i in 1..m {
        while k > 0 && pattern[i] != pattern[k] {
            k = fail[k - 1];
        }
        if pattern[i] == pattern[k] {
            k += 1;
        }
        fail[i] = k;
    }
    fail
}

fn kmp_search(text: &str, pattern: &str) -> Vec<usize> {
    let text = text.as_bytes();
    let pattern = pattern.as_bytes();
    let mut result = Vec::new();
    if pattern.is_empty() {
        return result;
    }
    let fail = build_failure_function(pattern);
    let mut k = 0usize;
    for i in 0..text.len() {
        while k > 0 && text[i] != pattern[k] {
            k = fail[k - 1]; // 不一致時、パターン側だけを賢く巻き戻す
        }
        if text[i] == pattern[k] {
            k += 1;
        }
        if k == pattern.len() {
            result.push(i + 1 - pattern.len());
            k = fail[k - 1];
        }
    }
    result
}
```

```csharp
static int[] BuildFailureFunction(string pattern)
{
    int m = pattern.Length;
    var fail = new int[m];
    int k = 0;
    for (int i = 1; i < m; i++)
    {
        while (k > 0 && pattern[i] != pattern[k]) k = fail[k - 1];
        if (pattern[i] == pattern[k]) k++;
        fail[i] = k;
    }
    return fail;
}

static List<int> KmpSearch(string text, string pattern)
{
    var result = new List<int>();
    if (pattern.Length == 0) return result;
    var fail = BuildFailureFunction(pattern);
    int k = 0;
    for (int i = 0; i < text.Length; i++)
    {
        while (k > 0 && text[i] != pattern[k]) k = fail[k - 1]; // 不一致時、パターン側だけを賢く巻き戻す
        if (text[i] == pattern[k]) k++;
        if (k == pattern.Length)
        {
            result.Add(i - pattern.Length + 1);
            k = fail[k - 1];
        }
    }
    return result;
}
```
