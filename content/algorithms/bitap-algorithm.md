---
name: Bitap法(シフトOR法)
category: 文字列
subcategory: パターンマッチング
complexity: O(nm/w)(nはテキスト長、mはパターン長、wはワードサイズ、通常は実質O(n))
summary: パターンマッチの「今どこまで一致しているか」という状態をビットマスク1つで表現し、テキストを1文字読むたびにビット演算だけで全パターン位置の一致状況を同時更新する、あいまい検索にも拡張しやすい文字列探索アルゴリズム。
---

## 概要

[KMP法](/algorithms/kmp)や[Boyer-Moore法](/algorithms/boyer-moore)は「不一致が起きた時にどれだけスキップできるか」という前処理情報を使ってマッチングを高速化するのに対し、Bitap法(シフトOR法、Shift-Or法とも呼ばれる)は全く異なる発想を取る——パターンの各位置に対して「その位置まで一致しているかどうか」を1ビットに対応させ、テキストを1文字読むたびに、パターン全体の一致状況をビットシフトとOR演算という定数時間の操作で丸ごと更新していく。ワードサイズ(通常32や64ビット)に収まる長さのパターンであれば、この更新が実質1命令で行えるため非常に高速であり、さらに後述するように「`k`文字までの誤りを許容するあいまい検索」へも自然に拡張できる、他の文字列探索アルゴリズムにはない独自の強みを持つ。

## 仕組み

1. パターン`P`(長さ`m`)の各文字`c`について、「`c`がパターンのどの位置に出現するか」を表すビットマスク`mask[c]`を前計算する(`i`ビット目が1なら、パターンの`i`番目の文字が`c`である)
2. 状態ビットベクトル`R`(初期値は全ビット1、`i`ビット目が0であることが「パターンの先頭`i+1`文字までがテキストの現在位置までと一致している」ことを表す)を用意する
3. テキストを1文字ずつ読みながら、各文字`c`に対して`R = (R << 1) | mask[c]`という更新を行う——これは「1文字シフトして、今読んだ文字がパターンの対応位置と一致していなければビットを立てる(不一致マーク)」という操作をパターン全体について同時に行っていることに相当する
4. 更新後の`R`の`m`番目のビットが0であれば、その時点でパターン全体がテキストのその位置で一致したことを意味し、マッチ位置として報告する
5. **あいまい検索への拡張**: 許容する誤り数`k`ごとに状態ベクトル`R₀, R₁, ..., Rₖ`を並行して保持し、`Rₑ`の更新に「1つ前の誤り数`e-1`の状態からの挿入・削除・置換」を表す追加のOR項を加えることで、`k`文字までの挿入・削除・置換誤りを許容するあいまい検索(agrep等で使われる手法)に自然に拡張できる

## 特性・トレードオフ

- **計算量**: パターン長`m`がワードサイズ`w`(32や64ビット)以内に収まる場合、各文字の処理が定数時間のビット演算で済むため実質`O(n)`(`n`はテキスト長)。`m`が`w`を超える場合は複数ワードに分割する必要があり`O(nm/w)`になる
- **[KMP法](/algorithms/kmp)との比較**: [KMP法](/algorithms/kmp)は「失敗関数」という配列ベースの前処理を使うのに対し、Bitap法はビットマスクという定数サイズの前処理で済み、実装が大幅に単純になる——特にパターンが短い(ワードサイズ以内)場合に真価を発揮する
- **あいまい検索という独自の強みとその代償**: `k`文字までの誤りを許容する検索へ拡張できる点は他の主要な文字列探索アルゴリズムにはあまり見られない特長だが、`k`を増やすごとに並行して保持する状態ベクトルの数が増え、計算コストも`O(nmk/w)`程度まで増加する
- **使いどころ**: `grep`系ツールのあいまい検索オプション(agrep、Unix `grep -F`の内部実装の一部)、DNA配列など短いアルファベットでの近似パターンマッチング、スペルチェッカーの候補検索、短いパターンを大量のテキストに対して高速に検索する場面

## 実装例

```python
def bitap_search(text: str, pattern: str) -> list[int]:
    m = len(pattern)
    if m == 0:
        return list(range(len(text) + 1))
    if m > 64:
        raise ValueError("このBitap実装が扱えるパターン長を超えています")

    mask = {}
    for c in set(text) | set(pattern):
        mask[c] = ~0
    for i, c in enumerate(pattern):
        mask[c] &= ~(1 << i)

    r = ~0
    matches = []
    match_bit = 1 << (m - 1)

    for i, c in enumerate(text):
        char_mask = mask.get(c, ~0)
        r = (r << 1) | char_mask
        if (r & match_bit) == 0:
            matches.append(i - m + 1)
    return matches
```

```typescript
function bitapSearch(text: string, pattern: string): number[] {
  const m = pattern.length;
  if (m === 0) return Array.from({ length: text.length + 1 }, (_, i) => i);
  if (m > 32) throw new Error("この Bitap 実装が扱えるパターン長を超えています");

  const mask = new Map<string, number>();
  for (const c of new Set([...text, ...pattern])) mask.set(c, ~0);
  for (let i = 0; i < m; i++) mask.set(pattern[i], (mask.get(pattern[i]) as number) & ~(1 << i));

  let r = ~0;
  const matches: number[] = [];
  const matchBit = 1 << (m - 1);

  for (let i = 0; i < text.length; i++) {
    const charMask = mask.has(text[i]) ? (mask.get(text[i]) as number) : ~0;
    r = (r << 1) | charMask;
    if ((r & matchBit) === 0) matches.push(i - m + 1);
  }
  return matches;
}
```

```cpp
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

std::vector<int> bitapSearch(const std::string& text, const std::string& pattern) {
    int m = static_cast<int>(pattern.size());
    if (m == 0) {
        std::vector<int> all(text.size() + 1);
        for (size_t i = 0; i <= text.size(); i++) all[i] = static_cast<int>(i);
        return all;
    }
    if (m > 64) throw std::invalid_argument("このBitap実装が扱えるパターン長を超えています");

    std::unordered_map<char, unsigned long long> mask;
    for (char c : text) mask[c] = ~0ULL;
    for (char c : pattern) mask[c] = ~0ULL;
    for (int i = 0; i < m; i++) mask[pattern[i]] &= ~(1ULL << i);

    unsigned long long r = ~0ULL;
    std::vector<int> matches;
    unsigned long long matchBit = 1ULL << (m - 1);

    for (int i = 0; i < static_cast<int>(text.size()); i++) {
        auto it = mask.find(text[i]);
        unsigned long long charMask = (it != mask.end()) ? it->second : ~0ULL;
        r = (r << 1) | charMask;
        if ((r & matchBit) == 0) matches.push_back(i - m + 1);
    }
    return matches;
}
```

```rust
use std::collections::HashMap;

fn bitap_search(text: &str, pattern: &str) -> Vec<i64> {
    let text_chars: Vec<char> = text.chars().collect();
    let pattern_chars: Vec<char> = pattern.chars().collect();
    let m = pattern_chars.len();
    if m == 0 {
        return (0..=text_chars.len() as i64).collect();
    }
    assert!(m <= 64, "この Bitap 実装が扱えるパターン長を超えています");

    let mut mask: HashMap<char, u64> = HashMap::new();
    for &c in text_chars.iter().chain(pattern_chars.iter()) {
        mask.entry(c).or_insert(!0u64);
    }
    for (i, &c) in pattern_chars.iter().enumerate() {
        *mask.get_mut(&c).unwrap() &= !(1u64 << i);
    }

    let mut r: u64 = !0u64;
    let mut matches = Vec::new();
    let match_bit: u64 = 1u64 << (m - 1);

    for (i, &c) in text_chars.iter().enumerate() {
        let char_mask = *mask.get(&c).unwrap_or(&!0u64);
        r = (r << 1) | char_mask;
        if (r & match_bit) == 0 {
            matches.push(i as i64 - m as i64 + 1);
        }
    }
    matches
}
```

```csharp
static class Bitap
{
    public static List<int> Search(string text, string pattern)
    {
        int m = pattern.Length;
        if (m == 0) return Enumerable.Range(0, text.Length + 1).ToList();
        if (m > 64) throw new ArgumentException("この Bitap 実装が扱えるパターン長を超えています");

        var mask = new Dictionary<char, long>();
        foreach (var c in text.Concat(pattern).Distinct()) mask[c] = ~0L;
        for (int i = 0; i < m; i++) mask[pattern[i]] &= ~(1L << i);

        long r = ~0L;
        var matches = new List<int>();
        long matchBit = 1L << (m - 1);

        for (int i = 0; i < text.Length; i++)
        {
            long charMask = mask.TryGetValue(text[i], out var cm) ? cm : ~0L;
            r = (r << 1) | charMask;
            if ((r & matchBit) == 0) matches.Add(i - m + 1);
        }
        return matches;
    }
}
```
