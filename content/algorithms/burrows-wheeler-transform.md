---
name: Burrows-Wheeler変換(BWT)
category: 文字列
subcategory: 接尾辞構造
complexity: O(n log n)
summary: 文字列を可逆的に並べ替えて同じ文字を隣接させ、圧縮しやすい形に変換する。bzip2の中核技術。
---

## 概要

文字列そのものを圧縮するのではなく、**圧縮しやすい形に並べ替える**という、少し変わった発想の変換。1994年にマイケル・バロウズとデビッド・ウィーラーが考案した。変換後の文字列は元の文字列と同じ文字を同じ個数だけ含みながら、**同じ文字が連続しやすい**という性質を持つようになり、これがランレングス符号化のような単純な圧縮アルゴリズムの効果を劇的に高める。bzip2のような圧縮ツールの中核技術として使われている。

## 仕組み

1. 元の文字列の末尾に特殊な終端記号を付け、その全ての「回転(先頭の文字を末尾に回す操作を繰り返して作れる文字列群)」を作る
2. それら全ての回転を辞書式順序でソートする
3. ソートされた回転群の、それぞれの**最後の文字**だけを取り出して並べたものが、BWT変換後の文字列になる

なぜ圧縮しやすくなるのか: 回転をソートすると、似た文脈(直前に続く文字列が似ている)を持つ位置が近くに集まる。自然言語やゲノム配列では「ある文字の直前に来やすい文字」に偏りがあることが多く、ソート後は同じ文字が連続しやすくなる。

**復元**: 一見、並べ替えられた情報だけから元に戻せるとは思えないが、「ソートされた回転群の最後の列(=変換結果)」と「その回転群の最初の列(=変換結果をソートしたもの)」の対応関係を使うことで、元の文字列を一意に復元できる(この復元アルゴリズムの正しさの証明自体がBWTの数学的な面白さのひとつ)。

## 特性・トレードオフ

- **計算量**: 接尾辞配列を使った構築でO(n log n)。BWT自体は文字列を圧縮しないため、必ずMTF(move-to-front)符号化やランレングス符号化、ハフマン符号化などの後段の圧縮ステップと組み合わせて使われる
- **可逆性**: 情報を一切失わずに元の文字列に戻せる(可逆変換)ため、ロスレス圧縮の前処理として安心して使える
- **接尾辞配列との関係**: BWTは接尾辞配列と密接な関係にあり、接尾辞配列から直接BWTを構築することもできる。逆に、BWTから接尾辞配列に相当する情報を復元することも可能
- **使いどころ**: bzip2をはじめとするファイル圧縮ツール、バイオインフォマティクスにおけるゲノム配列の高速アラインメントツール(BWA, Bowtieなど、BWTを索引構造として活用する)

## 実装例

```python
def bwt_transform(s: str) -> str:
    s = s + "$"
    n = len(s)
    rotations = sorted(s[i:] + s[:i] for i in range(n))
    return "".join(r[-1] for r in rotations)

def bwt_inverse(bwt: str) -> str:
    n = len(bwt)
    table = [""] * n
    for _ in range(n):
        table = sorted(bwt[i] + table[i] for i in range(n))
    for row in table:
        if row.endswith("$"):
            return row[:-1]
    return ""
```

```typescript
function bwtTransform(input: string): string {
  const s = input + "$";
  const n = s.length;
  const rotations: string[] = [];
  for (let i = 0; i < n; i++) {
    rotations.push(s.slice(i) + s.slice(0, i));
  }
  rotations.sort();
  return rotations.map((r) => r[r.length - 1]).join("");
}

function bwtInverse(bwt: string): string {
  const n = bwt.length;
  let table: string[] = new Array(n).fill("");
  for (let iter = 0; iter < n; iter++) {
    const next: string[] = new Array(n);
    for (let i = 0; i < n; i++) {
      next[i] = bwt[i] + table[i];
    }
    next.sort();
    table = next;
  }
  for (const row of table) {
    if (row.endsWith("$")) {
      return row.slice(0, -1);
    }
  }
  return "";
}
```

```cpp
#include <string>
#include <vector>
#include <algorithm>

std::string bwtTransform(const std::string& input) {
    std::string s = input + "$";
    int n = static_cast<int>(s.size());
    std::vector<std::string> rotations;
    rotations.reserve(n);
    for (int i = 0; i < n; i++) {
        rotations.push_back(s.substr(i) + s.substr(0, i));
    }
    std::sort(rotations.begin(), rotations.end());
    std::string result;
    result.reserve(n);
    for (const auto& r : rotations) result.push_back(r.back());
    return result;
}

std::string bwtInverse(const std::string& bwt) {
    int n = static_cast<int>(bwt.size());
    std::vector<std::string> table(n, "");
    for (int iter = 0; iter < n; iter++) {
        std::vector<std::string> next(n);
        for (int i = 0; i < n; i++) {
            next[i] = bwt[i] + table[i];
        }
        std::sort(next.begin(), next.end());
        table = std::move(next);
    }
    for (const auto& row : table) {
        if (!row.empty() && row.back() == '$') {
            return row.substr(0, row.size() - 1);
        }
    }
    return "";
}
```

```rust
fn bwt_transform(input: &str) -> String {
    let s = format!("{}$", input);
    let n = s.len();
    let bytes: Vec<u8> = s.into_bytes();
    let mut rotations: Vec<Vec<u8>> = Vec::with_capacity(n);
    for i in 0..n {
        let mut rot = bytes[i..].to_vec();
        rot.extend_from_slice(&bytes[..i]);
        rotations.push(rot);
    }
    rotations.sort();
    rotations.iter().map(|r| r[r.len() - 1] as char).collect()
}

fn bwt_inverse(bwt: &str) -> String {
    let bytes: Vec<u8> = bwt.bytes().collect();
    let n = bytes.len();
    let mut table: Vec<Vec<u8>> = vec![Vec::new(); n];
    for _ in 0..n {
        let mut next: Vec<Vec<u8>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut row = vec![bytes[i]];
            row.extend_from_slice(&table[i]);
            next.push(row);
        }
        next.sort();
        table = next;
    }
    for row in &table {
        if row.last() == Some(&b'$') {
            return String::from_utf8(row[..row.len() - 1].to_vec()).unwrap();
        }
    }
    String::new()
}
```

```csharp
static string BwtTransform(string input)
{
    string s = input + "$";
    int n = s.Length;
    var rotations = new List<string>();
    for (int i = 0; i < n; i++) rotations.Add(s.Substring(i) + s.Substring(0, i));
    rotations.Sort(StringComparer.Ordinal);
    var sb = new StringBuilder();
    foreach (var r in rotations) sb.Append(r[^1]);
    return sb.ToString();
}

static string BwtInverse(string bwt)
{
    int n = bwt.Length;
    var table = new string[n];
    for (int i = 0; i < n; i++) table[i] = "";
    for (int iter = 0; iter < n; iter++)
    {
        var next = new string[n];
        for (int i = 0; i < n; i++) next[i] = bwt[i] + table[i];
        Array.Sort(next, StringComparer.Ordinal);
        table = next;
    }
    foreach (var row in table)
    {
        if (row.EndsWith("$")) return row.Substring(0, row.Length - 1);
    }
    return "";
}
```
