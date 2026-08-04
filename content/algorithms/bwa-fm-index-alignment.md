---
name: FM-indexによる配列アラインメント(BWA方式)
category: バイオインフォマティクス
subcategory: 配列アラインメント
complexity: O(m)(mはクエリ配列長、ゲノムサイズに依存しない)
summary: "[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)を利用してゲノム配列全体を圧縮したまま索引化し、数十億塩基対のヒトゲノムに対しても数百万本の短い配列(リード)をクエリ配列長だけに比例する時間で高速にマッピングできるようにした、次世代シーケンサ解析の基盤技術。"
---

## 概要

[Smith-Waterman法](/algorithms/smith-waterman)や[Needleman-Wunsch法](/algorithms/needleman-wunsch)は2本の配列の最適なアラインメントを厳密に求めるが、その計算量`O(nm)`は、次世代シーケンサが1回の実験で生成する数百万〜数十億本の短い配列(リード)を、数十億塩基対のヒトゲノム全体に1本ずつマッピングする用途には全く現実的でない。BWA(Burrows-Wheeler Aligner)に代表されるこの手法は、ゲノム配列全体をあらかじめ[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)によって並び替え、FM-index(Full-text index in Minute space)という圧縮索引構造を構築しておくことで、クエリ(リード)の長さだけに比例する時間でマッチ位置を発見できるようにする——参照ゲノムの大きさが数十億塩基対あっても、1回の検索コストはそれに依存しない、という驚くべき性質を実現している。

## 仕組み

1. 参照ゲノム配列に[Burrows-Wheeler変換(BWT)](/algorithms/burrows-wheeler-transform)を適用し、元の配列を並び替えた文字列を得る(BWTは可逆変換であり、元の配列を完全に復元できる)
2. BWT変換後の文字列に対して、各文字の出現位置を効率的に問い合わせられる補助データ構造(出現頻度テーブル、チェックポイント配列など)を構築する。これらを合わせたものがFM-indexである
3. クエリ配列(リード)をマッチングする際、クエリの末尾の文字から順に、FM-index上で「その文字列が参照ゲノムのどこに出現しうるか」という候補範囲を、1文字処理するごとに絞り込んでいく(後方一致探索、Backward Search)
4. 候補範囲が空になった時点でそのクエリは不一致、最後まで候補範囲が残っていれば、その範囲が実際のマッチ位置に対応する(範囲から実際のゲノム座標への変換にはサフィックス配列の情報を併用する)
5. 実際の配列決定エラーや遺伝的な変異(SNP等)を許容するため、完全一致だけでなく、数文字までの不一致を許すバックトラッキングを組み込んだ近似マッチングも同じFM-index上で行える

## 特性・トレードオフ

- **計算量**: 1回のクエリ(リード)のマッピングにかかる時間は、クエリの長さ`m`だけに比例する`O(m)`——参照ゲノムのサイズ`n`(ヒトゲノムなら約30億塩基対)には依存しない、というのがFM-indexの核心的な強みである
- **索引構築の前処理コストとのトレードオフ**: FM-indexの構築自体には参照ゲノム全体に対する[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)([接尾辞配列](/algorithms/suffix-array)の構築を伴う)が必要で、ヒトゲノム規模では数時間かかることもある。しかし、この索引は参照ゲノムが変わらない限り一度構築すれば何度でも再利用できるため、数百万本のリードをマッピングする実際の解析作業全体で見れば、前処理コストは十分に償却される
- **圧縮された索引というメモリ効率の良さ**: BWT変換後の文字列は同じ文字が連続しやすい性質を持つため圧縮効率が高く、FM-indexは参照ゲノム全体を素朴に保持するよりずっと小さいメモリ量(ヒトゲノム全体で数ギガバイト程度)で済む——一般的なワークステーションでも実行可能な実用性を支えている
- **[Smith-Waterman法](/algorithms/smith-waterman)との組み合わせ**: FM-indexによる高速な候補位置の絞り込みと、[Smith-Waterman法](/algorithms/smith-waterman)による候補位置周辺での厳密なアラインメント計算を組み合わせる2段階の設計が実務では一般的——大まかな絞り込みは高速なFM-index、細かい精密なアラインメントは実績のある動的計画法、という役割分担になっている
- **使いどころ**: 次世代シーケンサ(NGS)の出力リードを参照ゲノムにマッピングする全ゲノム解析パイプライン(BWA・Bowtie・Bowtie2等の実際のツール)、がんゲノム解析における変異検出の前処理、RNA-seq解析における転写産物の定量化

## 実装例

以下は[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)をもとにFM-indexを構築し、後方一致探索(backward search)でパターンの出現位置を求める簡略版の実装。

```python
def build_fm_index(s: str):
    s = s + "$"
    n = len(s)
    sa = sorted(range(n), key=lambda i: s[i:])
    bwt = "".join(s[(i - 1) % n] for i in sa)
    chars = sorted(set(s))
    c_table = {}
    total = 0
    for c in chars:
        c_table[c] = total
        total += bwt.count(c)
    occ = {c: [0] * (n + 1) for c in chars}
    for i, ch in enumerate(bwt):
        for c in chars:
            occ[c][i + 1] = occ[c][i]
        occ[ch][i + 1] += 1
    return sa, bwt, c_table, occ

def backward_search(pattern: str, c_table, occ, bwt_len: int):
    top, bottom = 0, bwt_len - 1
    for ch in reversed(pattern):
        if ch not in c_table:
            return 0, -1
        top = c_table[ch] + occ[ch][top]
        bottom = c_table[ch] + occ[ch][bottom + 1] - 1
        if top > bottom:
            return 0, -1
    return top, bottom

def fm_index_search(text: str, pattern: str) -> list[int]:
    sa, bwt, c_table, occ = build_fm_index(text)
    top, bottom = backward_search(pattern, c_table, occ, len(bwt))
    if top > bottom:
        return []
    return sorted(sa[i] for i in range(top, bottom + 1))
```

```typescript
function buildFmIndex(input: string) {
  const s = input + "$";
  const n = s.length;
  const sa = Array.from({ length: n }, (_, i) => i);
  sa.sort((a, b) => (s.slice(a) < s.slice(b) ? -1 : s.slice(a) > s.slice(b) ? 1 : 0));
  const bwt = sa.map((i) => s[(i - 1 + n) % n]).join("");
  const chars = Array.from(new Set(s.split(""))).sort();
  const cTable: Record<string, number> = {};
  let total = 0;
  for (const c of chars) {
    cTable[c] = total;
    let count = 0;
    for (const ch of bwt) if (ch === c) count++;
    total += count;
  }
  const occ: Record<string, number[]> = {};
  for (const c of chars) occ[c] = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    const ch = bwt[i];
    for (const c of chars) occ[c][i + 1] = occ[c][i];
    occ[ch][i + 1]++;
  }
  return { sa, bwt, cTable, occ };
}

function backwardSearch(
  pattern: string,
  cTable: Record<string, number>,
  occ: Record<string, number[]>,
  bwtLen: number
): [number, number] {
  let top = 0, bottom = bwtLen - 1;
  for (let i = pattern.length - 1; i >= 0; i--) {
    const ch = pattern[i];
    if (!(ch in cTable)) return [0, -1];
    top = cTable[ch] + occ[ch][top];
    bottom = cTable[ch] + occ[ch][bottom + 1] - 1;
    if (top > bottom) return [0, -1];
  }
  return [top, bottom];
}

function fmIndexSearch(text: string, pattern: string): number[] {
  const { sa, bwt, cTable, occ } = buildFmIndex(text);
  const [top, bottom] = backwardSearch(pattern, cTable, occ, bwt.length);
  if (top > bottom) return [];
  const positions: number[] = [];
  for (let i = top; i <= bottom; i++) positions.push(sa[i]);
  return positions.sort((a, b) => a - b);
}
```

```cpp
#include <string>
#include <vector>
#include <map>
#include <set>
#include <algorithm>

struct FmIndex {
    std::vector<int> sa;
    std::string bwt;
    std::map<char, int> cTable;
    std::map<char, std::vector<int>> occ;
};

FmIndex buildFmIndex(const std::string& input) {
    std::string s = input + "$";
    int n = static_cast<int>(s.size());
    std::vector<int> sa(n);
    for (int i = 0; i < n; i++) sa[i] = i;
    std::sort(sa.begin(), sa.end(), [&](int a, int b) {
        return s.substr(a) < s.substr(b);
    });
    std::string bwt(n, ' ');
    for (int i = 0; i < n; i++) bwt[i] = s[(sa[i] - 1 + n) % n];
    std::set<char> charSet(s.begin(), s.end());
    std::map<char, int> cTable;
    int total = 0;
    for (char c : charSet) {
        cTable[c] = total;
        total += static_cast<int>(std::count(bwt.begin(), bwt.end(), c));
    }
    std::map<char, std::vector<int>> occ;
    for (char c : charSet) occ[c] = std::vector<int>(n + 1, 0);
    for (int i = 0; i < n; i++) {
        char ch = bwt[i];
        for (char c : charSet) occ[c][i + 1] = occ[c][i];
        occ[ch][i + 1]++;
    }
    return {sa, bwt, cTable, occ};
}

std::pair<int, int> backwardSearch(const std::string& pattern, const FmIndex& index, int bwtLen) {
    int top = 0, bottom = bwtLen - 1;
    for (int i = static_cast<int>(pattern.size()) - 1; i >= 0; i--) {
        char ch = pattern[i];
        auto it = index.cTable.find(ch);
        if (it == index.cTable.end()) return {0, -1};
        top = it->second + index.occ.at(ch)[top];
        bottom = it->second + index.occ.at(ch)[bottom + 1] - 1;
        if (top > bottom) return {0, -1};
    }
    return {top, bottom};
}

std::vector<int> fmIndexSearch(const std::string& text, const std::string& pattern) {
    FmIndex index = buildFmIndex(text);
    auto [top, bottom] = backwardSearch(pattern, index, static_cast<int>(index.bwt.size()));
    std::vector<int> positions;
    if (top > bottom) return positions;
    for (int i = top; i <= bottom; i++) positions.push_back(index.sa[i]);
    std::sort(positions.begin(), positions.end());
    return positions;
}
```

```rust
use std::collections::{BTreeMap, BTreeSet};

struct FmIndexData {
    sa: Vec<usize>,
    bwt: Vec<u8>,
    c_table: BTreeMap<u8, usize>,
    occ: BTreeMap<u8, Vec<usize>>,
}

fn build_fm_index(input: &str) -> FmIndexData {
    let mut s = input.as_bytes().to_vec();
    s.push(b'$');
    let n = s.len();
    let mut sa: Vec<usize> = (0..n).collect();
    sa.sort_by(|&a, &b| s[a..].cmp(&s[b..]));
    let bwt: Vec<u8> = sa.iter().map(|&i| s[(i + n - 1) % n]).collect();
    let chars: BTreeSet<u8> = s.iter().copied().collect();
    let mut c_table = BTreeMap::new();
    let mut total = 0usize;
    for &c in &chars {
        c_table.insert(c, total);
        total += bwt.iter().filter(|&&ch| ch == c).count();
    }
    let mut occ: BTreeMap<u8, Vec<usize>> = BTreeMap::new();
    for &c in &chars {
        occ.insert(c, vec![0usize; n + 1]);
    }
    for (i, &ch) in bwt.iter().enumerate() {
        for &c in &chars {
            let prev = occ[&c][i];
            occ.get_mut(&c).unwrap()[i + 1] = prev;
        }
        occ.get_mut(&ch).unwrap()[i + 1] += 1;
    }
    FmIndexData { sa, bwt, c_table, occ }
}

fn backward_search(pattern: &str, index: &FmIndexData, bwt_len: usize) -> Option<(usize, usize)> {
    let mut top = 0usize;
    let mut bottom = bwt_len - 1;
    for &ch in pattern.as_bytes().iter().rev() {
        let base = *index.c_table.get(&ch)?;
        let occ_ch = index.occ.get(&ch)?;
        top = base + occ_ch[top];
        let bottom_occ = base + occ_ch[bottom + 1];
        if bottom_occ == 0 {
            return None;
        }
        bottom = bottom_occ - 1;
        if top > bottom {
            return None;
        }
    }
    Some((top, bottom))
}

fn fm_index_search(text: &str, pattern: &str) -> Vec<usize> {
    let index = build_fm_index(text);
    let bwt_len = index.bwt.len();
    match backward_search(pattern, &index, bwt_len) {
        None => Vec::new(),
        Some((top, bottom)) => {
            let mut positions: Vec<usize> = (top..=bottom).map(|i| index.sa[i]).collect();
            positions.sort();
            positions
        }
    }
}
```

```csharp
static (int[] sa, string bwt, Dictionary<char, int> cTable, Dictionary<char, int[]> occ) BuildFmIndex(string input)
{
    string s = input + "$";
    int n = s.Length;
    var sa = Enumerable.Range(0, n).ToArray();
    Array.Sort(sa, (a, b) => string.CompareOrdinal(s.Substring(a), s.Substring(b)));
    var bwtChars = new char[n];
    for (int i = 0; i < n; i++) bwtChars[i] = s[(sa[i] - 1 + n) % n];
    string bwt = new string(bwtChars);
    var chars = s.Distinct().OrderBy(c => c).ToList();
    var cTable = new Dictionary<char, int>();
    int total = 0;
    foreach (var c in chars)
    {
        cTable[c] = total;
        total += bwt.Count(ch => ch == c);
    }
    var occ = new Dictionary<char, int[]>();
    foreach (var c in chars) occ[c] = new int[n + 1];
    for (int i = 0; i < n; i++)
    {
        char ch = bwt[i];
        foreach (var c in chars) occ[c][i + 1] = occ[c][i];
        occ[ch][i + 1]++;
    }
    return (sa, bwt, cTable, occ);
}

static (int top, int bottom) BackwardSearch(string pattern, Dictionary<char, int> cTable, Dictionary<char, int[]> occ, int bwtLen)
{
    int top = 0, bottom = bwtLen - 1;
    for (int i = pattern.Length - 1; i >= 0; i--)
    {
        char ch = pattern[i];
        if (!cTable.ContainsKey(ch)) return (0, -1);
        top = cTable[ch] + occ[ch][top];
        bottom = cTable[ch] + occ[ch][bottom + 1] - 1;
        if (top > bottom) return (0, -1);
    }
    return (top, bottom);
}

static List<int> FmIndexSearch(string text, string pattern)
{
    var (sa, bwt, cTable, occ) = BuildFmIndex(text);
    var (top, bottom) = BackwardSearch(pattern, cTable, occ, bwt.Length);
    if (top > bottom) return new List<int>();
    var positions = new List<int>();
    for (int i = top; i <= bottom; i++) positions.Add(sa[i]);
    positions.Sort();
    return positions;
}
```
