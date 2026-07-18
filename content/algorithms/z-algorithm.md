---
name: Z algorithm
category: 文字列
subcategory: パターンマッチング
complexity: O(n)
summary: 各位置から始まる接頭辞との一致長を、線形時間ですべて求める。
---

## 概要

文字列の各位置について、「その位置から始まる部分文字列」が「文字列全体の先頭(接頭辞)」とどれだけ長く一致するか(この長さを`Z値`と呼ぶ)を、**全ての位置についてまとめて線形時間で計算する**アルゴリズム。この一見地味な情報が、文字列検索・パターンマッチングの様々な問題にそのまま応用できる、汎用性の高い前処理ツールになっている。

## 仕組み

素朴に計算すると各位置でO(n)かけて比較することになり全体でO(n²)かかってしまうが、Z algorithmは**既に計算済みのZ値の情報を再利用する**ことで線形時間を達成する。

1. 「今わかっている中で最も右まで(先頭との一致が)伸びている区間」を`[L, R]`として管理する
2. 新しい位置iを処理するとき、もしiがこの区間`[L, R]`の内側にあれば、**対称の位置(i - L)のZ値を参考にする**ことで、いくつかの比較を省略できる(既にわかっている情報から、Z[i]の下限を即座に求められる)
3. その下限から先は、実際に1文字ずつ比較を続けて確定させる
4. 新しく確定した区間が`[L, R]`より右に伸びていれば、`[L, R]`を更新する

「一致が保証されている区間の情報を、これから計算する位置に"使い回す"」という発想がKMP法の失敗関数の考え方と近く、文字列アルゴリズムに共通する省力化のパターンを示している。

## 特性・トレードオフ

- **計算量**: O(n)。全ての位置のZ値を、テキスト全体をなめる1回分程度のコストでまとめて計算できる
- **文字列検索への応用**: 「パターン + 区切り文字 + テキスト」という1本の文字列を作り、その全体でZ algorithmを実行すると、Z値が「パターンの長さ」と一致する位置こそがテキスト中でのパターンの出現位置になる——KMP法とは違う切り口で同じ文字列検索問題を解ける
- **他のアルゴリズムとの関係**: 実装がKMP法の失敗関数よりも直感的に理解しやすいとされ、競技プログラミングでは同じ目的でZ algorithmが好んで使われることも多い
- **使いどころ**: 文字列検索そのものに加え、文字列の周期性の検出(文字列が同じパターンの繰り返しでできているか)、最長共通接頭辞に関する様々な文字列処理問題の前処理として使われる

## 実装例

「パターン + 区切り文字 + テキスト」を1本の文字列にしてZ配列を計算し、Z値がパターン長と一致する位置を出現位置として返す。

```python
def z_function(s: str) -> list[int]:
    n = len(s)
    z = [0] * n
    if n == 0:
        return z
    z[0] = n
    l, r = 0, 0
    for i in range(1, n):
        if i < r:
            z[i] = min(r - i, z[i - l])  # 既知の区間[l, r)の情報を再利用する
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > r:
            l, r = i, i + z[i]
    return z


def z_search(text: str, pattern: str) -> list[int]:
    if not pattern:
        return []
    combined = pattern + "\x00" + text  # テキストに含まれない区切り文字を挟む
    z = z_function(combined)
    m = len(pattern)
    result = []
    for i in range(m + 1, len(combined)):
        if z[i] == m:
            result.append(i - m - 1)
    return result
```

```typescript
function zFunction(s: string): number[] {
  const n = s.length;
  const z = new Array(n).fill(0);
  if (n === 0) return z;
  z[0] = n;
  let l = 0;
  let r = 0;
  for (let i = 1; i < n; i++) {
    if (i < r) z[i] = Math.min(r - i, z[i - l]); // 既知の区間[l, r)の情報を再利用する
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
    if (i + z[i] > r) {
      l = i;
      r = i + z[i];
    }
  }
  return z;
}

function zSearch(text: string, pattern: string): number[] {
  if (pattern.length === 0) return [];
  const combined = pattern + "\x00" + text; // テキストに含まれない区切り文字を挟む
  const z = zFunction(combined);
  const m = pattern.length;
  const result: number[] = [];
  for (let i = m + 1; i < combined.length; i++) {
    if (z[i] === m) result.push(i - m - 1);
  }
  return result;
}
```

```cpp
#include <algorithm>
#include <string>
#include <vector>

std::vector<int> zFunction(const std::string& s) {
    int n = static_cast<int>(s.size());
    std::vector<int> z(n, 0);
    if (n == 0) return z;
    z[0] = n;
    int l = 0, r = 0;
    for (int i = 1; i < n; i++) {
        if (i < r) z[i] = std::min(r - i, z[i - l]); // 既知の区間[l, r)の情報を再利用する
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > r) {
            l = i;
            r = i + z[i];
        }
    }
    return z;
}

std::vector<int> zSearch(const std::string& text, const std::string& pattern) {
    std::vector<int> result;
    if (pattern.empty()) return result;
    std::string combined = pattern + '\x00' + text; // テキストに含まれない区切り文字を挟む
    std::vector<int> z = zFunction(combined);
    int m = static_cast<int>(pattern.size());
    for (int i = m + 1; i < static_cast<int>(combined.size()); i++) {
        if (z[i] == m) result.push_back(i - m - 1);
    }
    return result;
}
```

```rust
fn z_function(s: &[u8]) -> Vec<usize> {
    let n = s.len();
    let mut z = vec![0usize; n];
    if n == 0 {
        return z;
    }
    z[0] = n;
    let (mut l, mut r) = (0usize, 0usize);
    for i in 1..n {
        if i < r {
            z[i] = (r - i).min(z[i - l]); // 既知の区間[l, r)の情報を再利用する
        }
        while i + z[i] < n && s[z[i]] == s[i + z[i]] {
            z[i] += 1;
        }
        if i + z[i] > r {
            l = i;
            r = i + z[i];
        }
    }
    z
}

fn z_search(text: &str, pattern: &str) -> Vec<usize> {
    let mut result = Vec::new();
    if pattern.is_empty() {
        return result;
    }
    // テキストに含まれない区切り文字(0バイト)を挟んで1本の文字列にする
    let combined: Vec<u8> = pattern.bytes().chain(std::iter::once(0u8)).chain(text.bytes()).collect();
    let z = z_function(&combined);
    let m = pattern.len();
    for i in (m + 1)..combined.len() {
        if z[i] == m {
            result.push(i - m - 1);
        }
    }
    result
}
```

```csharp
static int[] ZFunction(string s)
{
    int n = s.Length;
    var z = new int[n];
    if (n == 0) return z;
    z[0] = n;
    int l = 0, r = 0;
    for (int i = 1; i < n; i++)
    {
        if (i < r) z[i] = Math.Min(r - i, z[i - l]); // 既知の区間[l, r)の情報を再利用する
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
}

static List<int> ZSearch(string text, string pattern)
{
    var result = new List<int>();
    if (pattern.Length == 0) return result;
    string combined = pattern + "\x00" + text; // テキストに含まれない区切り文字を挟む
    var z = ZFunction(combined);
    int m = pattern.Length;
    for (int i = m + 1; i < combined.Length; i++)
    {
        if (z[i] == m) result.Add(i - m - 1);
    }
    return result;
}
```
