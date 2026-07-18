---
name: Boyer-Moore法
category: 文字列
subcategory: パターンマッチング
complexity: O(n/m) 〜 O(nm)
summary: パターンの末尾から比較し、大きくスキップすることで実用上高速な文字列検索を実現する。
---

## 概要

KMP法が「テキストを先頭から1文字ずつ、後戻りなく」進むのに対し、Boyer-Moore法は発想が真逆に近い——**パターンの末尾から比較を始め、不一致が起きたら大きく前方にジャンプする**ことで、多くの文字を比較すらせずに読み飛ばす。実用上は多くの文字列検索ツール(`grep`の実装など)で採用されており、平均的にはテキストの全文字を調べる必要すらない、非常に高速な文字列検索アルゴリズム。

## 仕組み

Boyer-Moore法は2つのヒューリスティック(発見的な高速化ルール)を組み合わせる。

1. **不一致文字ヒューリスティック**: パターンを末尾から比較していき、不一致が起きたとき、その不一致文字がパターン中のどこに現れるかを事前に調べたテーブルを使い、パターンを一気に右へずらす(不一致文字がパターン中に存在しなければ、パターンの長さ分まるごとスキップできる)
2. **良い接尾辞ヒューリスティック**: 不一致が起きるまでに一致していた部分(接尾辞)が、パターンの他の場所にも現れるかを利用して、より賢いずらし幅を計算する
3. 2つのヒューリスティックで計算されたずらし幅のうち、**より大きい方**を採用してパターンを右にずらし、再び末尾から比較を再開する

「末尾から比較する」ことで、たとえ先頭付近が一致していても末尾ですぐに不一致とわかれば、その情報だけで大きくスキップできる——これが、テキスト全体を舐めるように調べる素朴な方法より圧倒的に高速な理由になっている。

## 特性・トレードオフ

- **計算量**: 最良ケースではO(n/m)(パターンが長いほど1回のスキップ幅が大きくなるため、むしろ高速化する)、最悪ケースではO(nm)。実用上のテキスト(自然言語やアルファベットが多様なデータ)では最良に近い性能が出ることが多い
- **アルファベットが大きいほど有利**: 不一致文字ヒューリスティックの効果は、使われる文字の種類が多い(英語のテキストなど)ほど大きくなる。DNA配列(A/T/G/Cの4種類しかない)のような小さいアルファベットでは効果が薄れる
- **前処理が必要**: 2つのヒューリスティックのテーブルを事前に構築するコストがかかるが、パターンの長さに対してのみ依存し、テキストの長さには依存しない
- **使いどころ**: `grep`をはじめとするテキスト検索ツールの内部実装、大規模なテキストからの高速なパターン検索。実用上のパフォーマンスの良さから、多くの実装系でKMP法よりも好んで採用される

## 実装例

不一致文字ヒューリスティックと良い接尾辞ヒューリスティックの両方を実装し、大きい方のずらし幅を採用する。

```python
def _bad_char_table(pattern: str) -> dict[str, int]:
    table: dict[str, int] = {}
    for i, ch in enumerate(pattern):
        table[ch] = i  # パターン中で最後に現れた位置を記録
    return table


def _good_suffix_table(pattern: str) -> list[int]:
    m = len(pattern)
    shift = [0] * (m + 1)
    border_pos = [0] * (m + 1)

    i, j = m, m + 1
    border_pos[i] = j
    while i > 0:
        while j <= m and pattern[i - 1] != pattern[j - 1]:
            if shift[j] == 0:
                shift[j] = j - i
            j = border_pos[j]
        i -= 1
        j -= 1
        border_pos[i] = j

    j = border_pos[0]
    for i in range(m + 1):
        if shift[i] == 0:
            shift[i] = j
        if i == j:
            j = border_pos[j]
    return shift


def boyer_moore_search(text: str, pattern: str) -> list[int]:
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    bad_char = _bad_char_table(pattern)
    good_suffix = _good_suffix_table(pattern)
    result = []
    s = 0
    while s <= n - m:
        j = m - 1
        while j >= 0 and pattern[j] == text[s + j]:
            j -= 1  # パターンの末尾から比較する
        if j < 0:
            result.append(s)
            s += good_suffix[0]
        else:
            bad_char_shift = j - bad_char.get(text[s + j], -1)
            good_suffix_shift = good_suffix[j + 1]
            s += max(bad_char_shift, good_suffix_shift, 1)  # 大きい方のずらし幅を採用
    return result
```

```typescript
function badCharTable(pattern: string): Map<string, number> {
  const table = new Map<string, number>();
  for (let i = 0; i < pattern.length; i++) table.set(pattern[i], i); // パターン中で最後に現れた位置を記録
  return table;
}

function goodSuffixTable(pattern: string): number[] {
  const m = pattern.length;
  const shift = new Array(m + 1).fill(0);
  const borderPos = new Array(m + 1).fill(0);

  let i = m;
  let j = m + 1;
  borderPos[i] = j;
  while (i > 0) {
    while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
      if (shift[j] === 0) shift[j] = j - i;
      j = borderPos[j];
    }
    i--;
    j--;
    borderPos[i] = j;
  }

  j = borderPos[0];
  for (i = 0; i <= m; i++) {
    if (shift[i] === 0) shift[i] = j;
    if (i === j) j = borderPos[j];
  }
  return shift;
}

function boyerMooreSearch(text: string, pattern: string): number[] {
  const n = text.length;
  const m = pattern.length;
  if (m === 0 || m > n) return [];
  const badChar = badCharTable(pattern);
  const goodSuffix = goodSuffixTable(pattern);
  const result: number[] = [];
  let s = 0;
  while (s <= n - m) {
    let j = m - 1;
    while (j >= 0 && pattern[j] === text[s + j]) j--; // パターンの末尾から比較する
    if (j < 0) {
      result.push(s);
      s += goodSuffix[0];
    } else {
      const badCharShift = j - (badChar.get(text[s + j]) ?? -1);
      const goodSuffixShift = goodSuffix[j + 1];
      s += Math.max(badCharShift, goodSuffixShift, 1); // 大きい方のずらし幅を採用
    }
  }
  return result;
}
```

```cpp
#include <algorithm>
#include <string>
#include <unordered_map>
#include <vector>

std::unordered_map<char, int> badCharTable(const std::string& pattern) {
    std::unordered_map<char, int> table;
    for (int i = 0; i < static_cast<int>(pattern.size()); i++) table[pattern[i]] = i;
    return table;
}

std::vector<int> goodSuffixTable(const std::string& pattern) {
    int m = static_cast<int>(pattern.size());
    std::vector<int> shift(m + 1, 0);
    std::vector<int> borderPos(m + 1, 0);

    int i = m, j = m + 1;
    borderPos[i] = j;
    while (i > 0) {
        while (j <= m && pattern[i - 1] != pattern[j - 1]) {
            if (shift[j] == 0) shift[j] = j - i;
            j = borderPos[j];
        }
        i--;
        j--;
        borderPos[i] = j;
    }

    j = borderPos[0];
    for (i = 0; i <= m; i++) {
        if (shift[i] == 0) shift[i] = j;
        if (i == j) j = borderPos[j];
    }
    return shift;
}

std::vector<int> boyerMooreSearch(const std::string& text, const std::string& pattern) {
    int n = static_cast<int>(text.size());
    int m = static_cast<int>(pattern.size());
    std::vector<int> result;
    if (m == 0 || m > n) return result;
    auto badChar = badCharTable(pattern);
    auto goodSuffix = goodSuffixTable(pattern);
    int s = 0;
    while (s <= n - m) {
        int j = m - 1;
        while (j >= 0 && pattern[j] == text[s + j]) j--; // パターンの末尾から比較する
        if (j < 0) {
            result.push_back(s);
            s += goodSuffix[0];
        } else {
            auto it = badChar.find(text[s + j]);
            int lastOccurrence = (it != badChar.end()) ? it->second : -1;
            int badCharShift = j - lastOccurrence;
            int goodSuffixShift = goodSuffix[j + 1];
            s += std::max({badCharShift, goodSuffixShift, 1}); // 大きい方のずらし幅を採用
        }
    }
    return result;
}
```

```rust
use std::collections::HashMap;

fn bad_char_table(pattern: &[u8]) -> HashMap<u8, i32> {
    let mut table = HashMap::new();
    for (i, &ch) in pattern.iter().enumerate() {
        table.insert(ch, i as i32); // パターン中で最後に現れた位置を記録
    }
    table
}

fn good_suffix_table(pattern: &[u8]) -> Vec<i32> {
    let m = pattern.len();
    let mut shift = vec![0i32; m + 1];
    let mut border_pos = vec![0i32; m + 1];

    let mut i = m as i32;
    let mut j = (m + 1) as i32;
    border_pos[i as usize] = j;
    while i > 0 {
        while j <= m as i32 && pattern[(i - 1) as usize] != pattern[(j - 1) as usize] {
            if shift[j as usize] == 0 {
                shift[j as usize] = j - i;
            }
            j = border_pos[j as usize];
        }
        i -= 1;
        j -= 1;
        border_pos[i as usize] = j;
    }

    j = border_pos[0];
    for i in 0..=m as i32 {
        if shift[i as usize] == 0 {
            shift[i as usize] = j;
        }
        if i == j {
            j = border_pos[j as usize];
        }
    }
    shift
}

fn boyer_moore_search(text: &str, pattern: &str) -> Vec<usize> {
    let text = text.as_bytes();
    let pattern = pattern.as_bytes();
    let n = text.len();
    let m = pattern.len();
    let mut result = Vec::new();
    if m == 0 || m > n {
        return result;
    }
    let bad_char = bad_char_table(pattern);
    let good_suffix = good_suffix_table(pattern);
    let mut s: i32 = 0;
    while s <= (n - m) as i32 {
        let mut j = m as i32 - 1;
        while j >= 0 && pattern[j as usize] == text[(s + j) as usize] {
            j -= 1; // パターンの末尾から比較する
        }
        if j < 0 {
            result.push(s as usize);
            s += good_suffix[0];
        } else {
            let last_occurrence = *bad_char.get(&text[(s + j) as usize]).unwrap_or(&-1);
            let bad_char_shift = j - last_occurrence;
            let good_suffix_shift = good_suffix[(j + 1) as usize];
            s += bad_char_shift.max(good_suffix_shift).max(1); // 大きい方のずらし幅を採用
        }
    }
    result
}
```

```csharp
static Dictionary<char, int> BadCharTable(string pattern)
{
    var table = new Dictionary<char, int>();
    for (int i = 0; i < pattern.Length; i++) table[pattern[i]] = i; // パターン中で最後に現れた位置を記録
    return table;
}

static int[] GoodSuffixTable(string pattern)
{
    int m = pattern.Length;
    var shift = new int[m + 1];
    var borderPos = new int[m + 1];

    int i = m, j = m + 1;
    borderPos[i] = j;
    while (i > 0)
    {
        while (j <= m && pattern[i - 1] != pattern[j - 1])
        {
            if (shift[j] == 0) shift[j] = j - i;
            j = borderPos[j];
        }
        i--; j--;
        borderPos[i] = j;
    }

    j = borderPos[0];
    for (i = 0; i <= m; i++)
    {
        if (shift[i] == 0) shift[i] = j;
        if (i == j) j = borderPos[j];
    }
    return shift;
}

static List<int> BoyerMooreSearch(string text, string pattern)
{
    var result = new List<int>();
    int n = text.Length, m = pattern.Length;
    if (m == 0 || m > n) return result;
    var badChar = BadCharTable(pattern);
    var goodSuffix = GoodSuffixTable(pattern);
    int s = 0;
    while (s <= n - m)
    {
        int j = m - 1;
        while (j >= 0 && pattern[j] == text[s + j]) j--; // パターンの末尾から比較する
        if (j < 0)
        {
            result.Add(s);
            s += goodSuffix[0];
        }
        else
        {
            int badCharShift = j - (badChar.TryGetValue(text[s + j], out var idx) ? idx : -1);
            int goodSuffixShift = goodSuffix[j + 1];
            s += Math.Max(Math.Max(badCharShift, goodSuffixShift), 1); // 大きい方のずらし幅を採用
        }
    }
    return result;
}
```
