---
name: LCP配列(最長共通接頭辞配列)
category: 文字列
subcategory: 接尾辞構造
complexity: O(n)(Kasaiのアルゴリズム、接尾辞配列が既知の場合)
summary: 接尾辞配列で隣り合う接尾辞同士が「先頭から何文字一致しているか」を記録した補助配列で、これを組み合わせるだけで最長共通部分文字列や繰り返し文字列の検出など多くの文字列問題が劇的に高速化できる。
---

## 概要

[接尾辞配列](/algorithms/suffix-array)はテキストの全接尾辞をソートした順序を教えてくれるが、それだけでは「ソート順で隣り合う2つの接尾辞が、実際にどれだけ似ているか」という情報が欠けている。LCP配列(Longest Common Prefix Array)は、まさにその欠けたピースを埋める補助データ構造で、接尾辞配列上で隣接する接尾辞同士が先頭から何文字一致しているかを記録するだけの単純な配列でありながら、これを[接尾辞配列](/algorithms/suffix-array)と組み合わせることで、最長共通部分文字列・最長回文部分文字列・異なる部分文字列の個数といった、素朴に解けば`O(n²)`かかる多くの文字列問題を`O(n log n)`や`O(n)`まで高速化できる、接尾辞配列の「相棒」的な存在である。

## 仕組み

1. テキスト`T`の[接尾辞配列](/algorithms/suffix-array)`SA`(全接尾辞をソートした順序)が既に得られているとする
2. `LCP[i]`を「ソート順で`i-1`番目と`i`番目の接尾辞が共有する最長の共通接頭辞の長さ」と定義する(`LCP[0]`は未定義または0とする)
3. **素朴な計算**: 各`i`について、2つの接尾辞の文字を先頭から愚直に比較していけば`LCP[i]`は求まるが、これだと最悪`O(n²)`かかってしまう
4. **Kasaiのアルゴリズム**: 「テキスト上で位置`i`の接尾辞と位置`i+1`の接尾辞のLCP値が`h`だったなら、位置`i+1`の接尾辞と(ソート順で)その次の接尾辞のLCP値は少なくとも`h-1`以上である」という単調性の性質を利用する。テキスト上の位置順(接尾辞配列のソート順ではなく)に`i`を回しながら、前回の`h`の値から1ずつ減らしたところから比較を再開することで、各文字が比較され直す回数を償却的に定数回に抑え、全体を`O(n)`で計算する
5. こうして得られた`LCP`配列と`SA`配列を組み合わせることで、様々な文字列クエリを高速に処理できるようになる

## 特性・トレードオフ

- **計算量**: Kasaiのアルゴリズムを使えば[接尾辞配列](/algorithms/suffix-array)が既知の状態から`O(n)`でLCP配列を構築できる——素朴な`O(n²)`から大幅な改善
- **最長共通部分文字列問題への応用**: 2つの文字列を`#`のような区切り文字で連結して結合接尾辞配列を作り、LCP配列上で「異なる元の文字列に由来する隣接接尾辞ペア」の中で最大のLCP値を探すだけで、動的計画法による`O(nm)`の素朴な解法を`O(n log n)`(接尾辞配列構築のコストが支配的)まで高速化できる
- **[Trie木](/algorithms/trie)との関係**: LCP配列は本質的に、全接尾辞から構成される「接尾辞木」(圧縮Trie)の構造を、木を明示的に構築せずに配列だけで表現したものと見なせる——接尾辞木のメモリオーバーヘッドを避けながら同等の情報を扱えるという実務上の利点がある
- **使いどころ**: 最長共通部分文字列・最長回文部分文字列の検出、テキスト中の異なる部分文字列の個数の数え上げ、2つの文字列間の編集距離に関連する高速アルゴリズム、[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)を用いた圧縮アルゴリズムの内部データ構造、バイオインフォマティクスにおける反復配列(リピート)の検出

## 実装例

接尾辞配列(ここでは素朴な`O(n² log n)`のソートで構築)に対してKasaiのアルゴリズムでLCP配列を`O(n)`構築する。

```python
def build_suffix_array(s: str) -> list[int]:
    n = len(s)
    return sorted(range(n), key=lambda i: s[i:])


def kasai_lcp(s: str, sa: list[int]) -> list[int]:
    """接尾辞配列が既知の状態からO(n)でLCP配列を構築する(Kasaiのアルゴリズム)。
    lcp[i] = SA上でi-1番目とi番目の接尾辞が共有する最長共通接頭辞の長さ。lcp[0] = 0。
    """
    n = len(s)
    rank = [0] * n
    for i, suf in enumerate(sa):
        rank[suf] = i
    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1  # 単調性: 次の文字のLCPは高々h-1までしか減らない
        else:
            h = 0
    return lcp
```

```typescript
function buildSuffixArray(s: string): number[] {
  const n = s.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((a, b) => (s.slice(a) < s.slice(b) ? -1 : s.slice(a) > s.slice(b) ? 1 : 0));
  return idx;
}

// 接尾辞配列が既知の状態からO(n)でLCP配列を構築する(Kasaiのアルゴリズム)
function kasaiLcp(s: string, sa: number[]): number[] {
  const n = s.length;
  const rank = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) rank[sa[i]] = i;
  const lcp = new Array<number>(n).fill(0);
  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] > 0) {
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
      lcp[rank[i]] = h;
      if (h > 0) h--; // 単調性: 次の文字のLCPは高々h-1までしか減らない
    } else {
      h = 0;
    }
  }
  return lcp;
}
```

```cpp
#include <string>
#include <vector>
#include <numeric>
#include <algorithm>

std::vector<int> buildSuffixArray(const std::string& s) {
    int n = static_cast<int>(s.size());
    std::vector<int> sa(n);
    std::iota(sa.begin(), sa.end(), 0);
    std::sort(sa.begin(), sa.end(), [&](int a, int b) {
        return s.compare(a, std::string::npos, s, b, std::string::npos) < 0;
    });
    return sa;
}

// 接尾辞配列が既知の状態からO(n)でLCP配列を構築する(Kasaiのアルゴリズム)
std::vector<int> kasaiLcp(const std::string& s, const std::vector<int>& sa) {
    int n = static_cast<int>(s.size());
    std::vector<int> rank(n), lcp(n, 0);
    for (int i = 0; i < n; i++) rank[sa[i]] = i;
    int h = 0;
    for (int i = 0; i < n; i++) {
        if (rank[i] > 0) {
            int j = sa[rank[i] - 1];
            while (i + h < n && j + h < n && s[i + h] == s[j + h]) h++;
            lcp[rank[i]] = h;
            if (h > 0) h--; // 単調性: 次の文字のLCPは高々h-1までしか減らない
        } else {
            h = 0;
        }
    }
    return lcp;
}
```

```rust
fn build_suffix_array(s: &[u8]) -> Vec<usize> {
    let n = s.len();
    let mut sa: Vec<usize> = (0..n).collect();
    sa.sort_by(|&a, &b| s[a..].cmp(&s[b..]));
    sa
}

// 接尾辞配列が既知の状態からO(n)でLCP配列を構築する(Kasaiのアルゴリズム)
fn kasai_lcp(s: &[u8], sa: &[usize]) -> Vec<usize> {
    let n = s.len();
    let mut rank = vec![0usize; n];
    for (i, &suf) in sa.iter().enumerate() {
        rank[suf] = i;
    }
    let mut lcp = vec![0usize; n];
    let mut h = 0usize;
    for i in 0..n {
        if rank[i] > 0 {
            let j = sa[rank[i] - 1];
            while i + h < n && j + h < n && s[i + h] == s[j + h] {
                h += 1;
            }
            lcp[rank[i]] = h;
            if h > 0 {
                h -= 1; // 単調性: 次の文字のLCPは高々h-1までしか減らない
            }
        } else {
            h = 0;
        }
    }
    lcp
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

static class LcpArray
{
    public static int[] BuildSuffixArray(string s)
    {
        int n = s.Length;
        var sa = Enumerable.Range(0, n).ToArray();
        Array.Sort(sa, (a, b) => string.CompareOrdinal(s.Substring(a), s.Substring(b)));
        return sa;
    }

    // 接尾辞配列が既知の状態からO(n)でLCP配列を構築する(Kasaiのアルゴリズム)
    public static int[] KasaiLcp(string s, int[] sa)
    {
        int n = s.Length;
        var rank = new int[n];
        for (int i = 0; i < n; i++) rank[sa[i]] = i;
        var lcp = new int[n];
        int h = 0;
        for (int i = 0; i < n; i++)
        {
            if (rank[i] > 0)
            {
                int j = sa[rank[i] - 1];
                while (i + h < n && j + h < n && s[i + h] == s[j + h]) h++;
                lcp[rank[i]] = h;
                if (h > 0) h--; // 単調性: 次の文字のLCPは高々h-1までしか減らない
            }
            else
            {
                h = 0;
            }
        }
        return lcp;
    }
}
```
