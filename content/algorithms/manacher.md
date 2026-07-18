---
name: Manacherのアルゴリズム
category: 文字列
subcategory: 回文・圧縮その他
complexity: O(n)
summary: すべての中心について最長回文半径を線形時間で求める。
---

## 概要

文字列の中から最も長い「回文になっている連続した部分文字列」を見つける問題(最長回文部分文字列)を、線形時間O(n)で解くアルゴリズム。素朴には各位置を中心に左右へ広げながら確認していく方法(O(n²))で解けるが、Manacherのアルゴリズムは「一度見つけた回文の対称性を再利用する」ことで、この計算量を劇的に改善する。

## 仕組み

回文の長さが偶数・奇数どちらでも扱えるよう、文字と文字の間に区切り文字(`#`など)を挿入した文字列に変換してから処理するのが一般的な実装の工夫。

1. 「今わかっている中で最も右まで伸びている回文」の中心Cと右端Rを管理する
2. 新しい中心iを処理する際、もしiがこの回文の範囲`[C, R]`の内側にあれば、**Cを中心にiと対称な位置の回文半径**を参考にできる(対称性より、その値がiの回文半径の下限になる。ただしRをはみ出す部分は改めて確認が必要)
3. その下限から先を、実際に1文字ずつ左右に広げて確認し、iの正確な回文半径を確定させる
4. 新しく確定した回文がRより右に伸びていれば、CとRを更新する
5. 全ての位置について確定した回文半径の中から、最大のものが最長回文部分文字列になる

Z algorithmと同じく、「既にわかっている対称性の情報を、新しい位置の計算に使い回す」ことで、各位置の再計算コストを摊却(ならして)線形時間に抑えている。

## 特性・トレードオフ

- **計算量**: O(n)。DPで解く最長回文部分文字列(O(n²))より高速
- **最長回文"部分列"とは別問題**: 連続していない部分列を対象にする「最長回文部分列」(LCSに帰着して解く問題)とは異なり、こちらは**連続した部分文字列**が対象。似た名前だが解法も答えも異なる別の問題である点に注意
- **実装の工夫**: 区切り文字を挿入して奇数長・偶数長の回文を統一的に扱う前処理が、実装上の理解のハードルになりやすいが、この工夫自体もアルゴリズム設計の良い教材になる
- **使いどころ**: バイオインフォマティクスにおけるDNA配列中の回文構造(パリンドローム配列は制限酵素の認識部位になりやすい)の検出、テキスト処理における回文検索など

## 実装例(最長回文部分文字列を返す)

```python
def longest_palindromic_substring(s: str) -> str:
    if not s:
        return ""
    t = "#" + "#".join(s) + "#"
    n = len(t)
    p = [0] * n
    c, r = 0, 0
    for i in range(n):
        if i < r:
            p[i] = min(r - i, p[2 * c - i])
        while i - p[i] - 1 >= 0 and i + p[i] + 1 < n and t[i - p[i] - 1] == t[i + p[i] + 1]:
            p[i] += 1
        if i + p[i] > r:
            c, r = i, i + p[i]
    max_len, center_index = max((v, i) for i, v in enumerate(p))
    start = (center_index - max_len) // 2
    return s[start:start + max_len]
```

```typescript
function longestPalindromicSubstring(s: string): string {
  if (s.length === 0) return "";
  const t = "#" + s.split("").join("#") + "#";
  const n = t.length;
  const p = new Array<number>(n).fill(0);
  let c = 0;
  let r = 0;
  for (let i = 0; i < n; i++) {
    if (i < r) {
      p[i] = Math.min(r - i, p[2 * c - i]);
    }
    while (
      i - p[i] - 1 >= 0 &&
      i + p[i] + 1 < n &&
      t[i - p[i] - 1] === t[i + p[i] + 1]
    ) {
      p[i]++;
    }
    if (i + p[i] > r) {
      c = i;
      r = i + p[i];
    }
  }
  let maxLen = 0;
  let centerIndex = 0;
  for (let i = 0; i < n; i++) {
    if (p[i] > maxLen) {
      maxLen = p[i];
      centerIndex = i;
    }
  }
  const start = (centerIndex - maxLen) / 2;
  return s.slice(start, start + maxLen);
}
```

```cpp
#include <string>
#include <vector>
#include <algorithm>

std::string longestPalindromicSubstring(const std::string& s) {
    if (s.empty()) return "";
    std::string t = "#";
    for (char ch : s) {
        t += ch;
        t += '#';
    }
    int n = static_cast<int>(t.size());
    std::vector<int> p(n, 0);
    int c = 0, r = 0;
    for (int i = 0; i < n; i++) {
        if (i < r) {
            p[i] = std::min(r - i, p[2 * c - i]);
        }
        while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n &&
               t[i - p[i] - 1] == t[i + p[i] + 1]) {
            p[i]++;
        }
        if (i + p[i] > r) {
            c = i;
            r = i + p[i];
        }
    }
    int maxLen = 0, centerIndex = 0;
    for (int i = 0; i < n; i++) {
        if (p[i] > maxLen) {
            maxLen = p[i];
            centerIndex = i;
        }
    }
    int start = (centerIndex - maxLen) / 2;
    return s.substr(start, maxLen);
}
```

```rust
fn longest_palindromic_substring(s: &str) -> String {
    if s.is_empty() {
        return String::new();
    }
    let chars: Vec<char> = s.chars().collect();
    let mut t = vec!['#'];
    for &ch in &chars {
        t.push(ch);
        t.push('#');
    }
    let n = t.len();
    let mut p = vec![0i32; n];
    let (mut c, mut r) = (0i32, 0i32);
    for i in 0..n as i32 {
        if i < r {
            p[i as usize] = (r - i).min(p[(2 * c - i) as usize]);
        }
        while i - p[i as usize] - 1 >= 0
            && (i + p[i as usize] + 1) < n as i32
            && t[(i - p[i as usize] - 1) as usize] == t[(i + p[i as usize] + 1) as usize]
        {
            p[i as usize] += 1;
        }
        if i + p[i as usize] > r {
            c = i;
            r = i + p[i as usize];
        }
    }
    let (mut max_len, mut center_index) = (0i32, 0i32);
    for i in 0..n as i32 {
        if p[i as usize] > max_len {
            max_len = p[i as usize];
            center_index = i;
        }
    }
    let start = ((center_index - max_len) / 2) as usize;
    chars[start..start + max_len as usize].iter().collect()
}
```

```csharp
static string LongestPalindromicSubstring(string s)
{
    if (s.Length == 0) return "";
    var sb = new StringBuilder();
    sb.Append('#');
    foreach (var ch in s)
    {
        sb.Append(ch);
        sb.Append('#');
    }
    string t = sb.ToString();
    int n = t.Length;
    var p = new int[n];
    int c = 0, r = 0;
    for (int i = 0; i < n; i++)
    {
        if (i < r)
        {
            p[i] = Math.Min(r - i, p[2 * c - i]);
        }
        while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n &&
               t[i - p[i] - 1] == t[i + p[i] + 1])
        {
            p[i]++;
        }
        if (i + p[i] > r)
        {
            c = i;
            r = i + p[i];
        }
    }
    int maxLen = 0, centerIndex = 0;
    for (int i = 0; i < n; i++)
    {
        if (p[i] > maxLen)
        {
            maxLen = p[i];
            centerIndex = i;
        }
    }
    int start = (centerIndex - maxLen) / 2;
    return s.Substring(start, maxLen);
}
```
