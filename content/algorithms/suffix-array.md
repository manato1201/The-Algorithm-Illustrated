---
name: 接尾辞配列(Suffix Array)
category: 文字列
subcategory: 接尾辞構造
complexity: O(n log n)
summary: 全ての接尾辞をソートした配列。文字列検索や最長共通部分文字列の土台になる。
---

## 概要

ある文字列の「接尾辞(ある位置から末尾までの部分文字列)」を全て取り出し、辞書式順序でソートした配列。例えば "banana" の接尾辞は "banana", "anana", "nana", "ana", "na", "a" の6つがあり、これをソートすると "a", "ana", "anana", "banana", "na", "nana" になる。この一見単純なデータ構造が、文字列検索・最長共通部分文字列・繰り返しパターンの検出など、多くの文字列処理問題の土台として機能する。

## 仕組み

**素朴な構築**: 全ての接尾辞(O(n)個)を実際に文字列として比較しながらソートすると、比較1回にO(n)かかるためO(n² log n)になり、長い文字列では非現実的になる。

**高速な構築(倍々法)**:

1. 最初は各文字1文字だけでランクをつける
2. 「先頭k文字でのランク」がわかっている状態から、「先頭2k文字でのランク」を、既存のランクのペア(先頭k文字のランク, 次のk文字のランク)をソートすることで求める
3. kを2倍、4倍、8倍...と倍々に増やしながらこれを繰り返すと、O(log n)回の反復で全体の順序が確定する

この「倍々に比較範囲を広げる」テクニックにより、全体をO(n log n)(各反復のソートにO(n log n)かかり、それをO(log n)回繰り返す設計だと本来O(n log²n)になるが、基数ソートなど工夫すればO(n log n)まで改善できる)で構築できる。

## 特性・トレードオフ

- **計算量**: 構築にO(n log n)。構築後の検索(ある文字列がテキストに含まれるか)は、ソート済み配列上の二分探索でO(m log n)(mはパターンの長さ)で行える
- **接尾辞木との比較**: 同じ目的(接尾辞の情報の活用)を果たす「接尾辞木」というデータ構造もあり、理論上はより高速な操作ができるが、実装が複雑でメモリ消費も大きい。接尾辞配列はメモリ効率で有利なため、実用上はこちらが好まれることが多い
- **LCP配列との組み合わせ**: 隣接する接尾辞同士の「最長共通接頭辞の長さ」を記録したLCP(Longest Common Prefix)配列を併用すると、最長共通部分文字列の発見や、文字列中の繰り返しパターンの検出など、応用の幅がさらに広がる
- **使いどころ**: 全文検索エンジン(`grep`より高度な、事前索引を使った高速検索)、バイオインフォマティクスにおけるゲノム配列の解析、データ圧縮(Burrows-Wheeler変換の構築にも接尾辞配列の考え方が使われる)など

## 実装例

```python
def build_suffix_array(s: str) -> list[int]:
    n = len(s)
    suffixes = [(s[i:], i) for i in range(n)]
    suffixes.sort()
    return [idx for _, idx in suffixes]
```

```typescript
function buildSuffixArray(s: string): number[] {
  const n = s.length;
  const suffixes: [string, number][] = [];
  for (let i = 0; i < n; i++) suffixes.push([s.slice(i), i]);
  suffixes.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return suffixes.map(([, idx]) => idx);
}
```

```cpp
#include <algorithm>
#include <numeric>
#include <string>
#include <vector>

std::vector<int> buildSuffixArray(const std::string& s) {
    int n = static_cast<int>(s.size());
    std::vector<int> sa(n);
    std::iota(sa.begin(), sa.end(), 0);
    std::sort(sa.begin(), sa.end(), [&](int i, int j) {
        return s.substr(i) < s.substr(j);
    });
    return sa;
}
```

```rust
fn build_suffix_array(s: &str) -> Vec<usize> {
    let n = s.len();
    let mut sa: Vec<usize> = (0..n).collect();
    sa.sort_by(|&i, &j| s[i..].cmp(&s[j..]));
    sa
}
```

```csharp
using System;
using System.Linq;

static int[] BuildSuffixArray(string s)
{
    int n = s.Length;
    var suffixes = new (string suf, int idx)[n];
    for (int i = 0; i < n; i++) suffixes[i] = (s.Substring(i), i);
    Array.Sort(suffixes, (x, y) => string.CompareOrdinal(x.suf, y.suf));
    return suffixes.Select(t => t.idx).ToArray();
}
```
