---
name: ミニマイザ(Minimizer Sketching)
category: バイオインフォマティクス
subcategory: ゲノムアセンブリ
complexity: O(L)(Lは配列長、スライディングウィンドウ最小値を効率的に求める場合)
summary: 配列中の全てのk-merを保持する代わりに、各ウィンドウ内で最小のハッシュ値を持つk-merだけを「代表」として選び出すことで、[k-merカウント](/algorithms/k-mer-counting)や配列比較に必要なデータ量を大幅に削減しながら、近い配列同士が高い確率で同じ代表k-merを共有するという性質を保つ、大規模ゲノム解析の省メモリ化技術。
---

## 概要

[k-merカウント](/algorithms/k-mer-counting)や[de Bruijnグラフによるアセンブリ](/algorithms/de-bruijn-graph-assembly)は、配列中に現れる全てのk-mer(長さkの部分文字列)を扱うが、次世代シーケンサが出力する数十億塩基対規模のデータでは、全k-merを保持するだけで膨大なメモリを消費してしまう。ミニマイザは、この問題を巧妙に回避する——配列を一定幅の窓(ウィンドウ)でスライドさせながら、各窓の中に含まれる複数のk-merのうち、あらかじめ決めたハッシュ関数で最小値を持つものだけを「代表k-mer(ミニマイザ)」として選び出す。全体のごく一部のk-merしか保持しないにもかかわらず、「2つの配列が似ていれば、選ばれる代表k-merの多くが一致する」という性質を数学的に保証できるため、データ量を大幅に削減しながら配列比較の精度をほとんど落とさずに済む。

## 仕組み

1. 配列を長さ`k`のk-merに分解し(通常の[k-merカウント](/algorithms/k-mer-counting)と同じ準備)、幅`w`のウィンドウ(`w`個の連続するk-merを含む区間)を配列全体にわたってスライドさせる
2. 各ウィンドウ内に含まれる`w`個のk-merそれぞれに、あらかじめ固定したハッシュ関数を適用する
3. そのウィンドウ内でハッシュ値が最小になるk-mer(複数あれば配列上の位置が最も左のものなど、決まったタイブレークルールで1つに絞る)を「ミニマイザ」として選び、記録する
4. ウィンドウを1つずつ右にスライドさせながら、手順2〜3を配列全体について繰り返す(スライディングウィンドウの最小値は、単調キューのようなデータ構造を使えば全体で`O(L)`の償却時間で効率的に計算できる)
5. 選ばれたミニマイザの集合(元のk-mer全体よりずっと少ない)を、その配列の「スケッチ(要約)」として、以降の類似度比較やインデックス構築に使う

## 特性・トレードオフ

- **計算量**: スライディングウィンドウの最小値を単調キューで管理すれば、配列長`L`に対して`O(L)`の線形時間で全てのミニマイザを求められる——素朴に各ウィンドウを毎回スキャンし直すと`O(Lw)`かかるところを、効率的なデータ構造で線形時間に抑えている
- **「似た配列は似たミニマイザを共有する」という数学的な保証**: 2つの配列がある程度似ている(挿入・欠失・置換の変異が少ない)なら、ウィンドウの大部分が両方の配列で一致するため、選ばれるミニマイザの集合も高い確率で大きく重なる——この性質により、ミニマイザ集合同士の重なり具合だけで、元の配列全体を比較せずに類似度を高速に見積もることができる
- **保持するデータ量の大幅な削減**: ウィンドウ幅`w`に対して、保持するk-merの数は理論上`2/(w+1)`程度まで削減できる——ヒトゲノム規模のデータでも、インデックス全体をメモリに載せられる現実的なサイズまで圧縮できる
- **[SimHash](/algorithms/simhash)・[MinHash](/algorithms/minhash-lsh)との類似性**: 「大量のデータを少数の代表値に要約し、それでも類似度の推定ができるようにする」という発想は、情報検索における[SimHash](/algorithms/simhash)や[MinHash局所性鋭敏型ハッシュ](/algorithms/minhash-lsh)と本質的に同じ系統の技術であり、異なる分野(ゲノム解析と文書検索)で独立に発展してきた類似の設計思想が収斂した好例になっている
- **使いどころ**: 長鎖シーケンサ(PacBio・Oxford Nanopore)の出力リードの高速マッピング(minimap2などの実際のツールで採用)、大規模ゲノムアセンブリにおけるオーバーラップ検出の前処理、メタゲノム解析における配列の高速分類、大規模配列データベースの省メモリインデックス構築

## 実装例

単調キュー(デック)によるスライディングウィンドウ最小値を`O(L)`で計算し、各ウィンドウを毎回スキャンし直す素朴な方法と結果が一致することを検証する。

```python
def kmers(seq: str, k: int) -> list[str]:
    return [seq[i:i + k] for i in range(len(seq) - k + 1)]


def simple_hash(s: str) -> int:
    """k-merを整数ハッシュへ変換する簡易多項式ハッシュ"""
    h = 0
    for ch in s:
        h = (h * 131 + ord(ch)) & 0xFFFFFFFF
    return h


def minimizers(seq: str, k: int, w: int) -> list[tuple[int, str]]:
    """幅wのウィンドウ(w個の連続するk-mer)をスライドさせながら、各ウィンドウの最小ハッシュ値の
    k-merを選ぶ。単調キューによりO(L)で計算する。戻り値は(配列上の位置, ミニマイザ文字列)の
    連続する重複を除いたリスト。
    """
    km = kmers(seq, k)
    hashes = [simple_hash(x) for x in km]
    n = len(hashes)
    result = []
    dq: list[int] = []  # インデックスを保持し、対応するハッシュ値が単調非減少になるよう維持する
    last_min_idx = -1

    for i in range(n):
        # 同値の場合は先に入っていた(より左の)要素を残す(タイブレーク: 左優先)
        while dq and hashes[dq[-1]] > hashes[i]:
            dq.pop()
        dq.append(i)
        while dq[0] <= i - w:
            dq.pop(0)
        if i >= w - 1:
            min_idx = dq[0]
            if min_idx != last_min_idx:
                result.append((min_idx, km[min_idx]))
                last_min_idx = min_idx
    return result
```

```typescript
function kmers(seq: string, k: number): string[] {
  const result: string[] = [];
  for (let i = 0; i <= seq.length - k; i++) result.push(seq.slice(i, i + k));
  return result;
}

function simpleHash(s: string): number {
  let h = 0;
  for (const ch of s) {
    h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  }
  return h;
}

function minimizers(seq: string, k: number, w: number): [number, string][] {
  const km = kmers(seq, k);
  const hashes = km.map(simpleHash);
  const n = hashes.length;
  const result: [number, string][] = [];
  const dq: number[] = [];
  let lastMinIdx = -1;
  for (let i = 0; i < n; i++) {
    while (dq.length && hashes[dq[dq.length - 1]] > hashes[i]) dq.pop();
    dq.push(i);
    while (dq[0] <= i - w) dq.shift();
    if (i >= w - 1) {
      const minIdx = dq[0];
      if (minIdx !== lastMinIdx) {
        result.push([minIdx, km[minIdx]]);
        lastMinIdx = minIdx;
      }
    }
  }
  return result;
}
```

```cpp
#include <string>
#include <vector>
#include <deque>

std::vector<std::string> kmers(const std::string& seq, int k) {
    std::vector<std::string> result;
    for (int i = 0; i + k <= static_cast<int>(seq.size()); i++) result.push_back(seq.substr(i, k));
    return result;
}

uint32_t simpleHash(const std::string& s) {
    uint32_t h = 0;
    for (char ch : s) h = h * 131u + static_cast<unsigned char>(ch);
    return h;
}

std::vector<std::pair<int, std::string>> minimizers(const std::string& seq, int k, int w) {
    auto km = kmers(seq, k);
    std::vector<uint32_t> hashes;
    for (auto& s : km) hashes.push_back(simpleHash(s));
    int n = static_cast<int>(hashes.size());
    std::vector<std::pair<int, std::string>> result;
    std::deque<int> dq;
    int lastMinIdx = -1;

    for (int i = 0; i < n; i++) {
        while (!dq.empty() && hashes[dq.back()] > hashes[i]) dq.pop_back();
        dq.push_back(i);
        while (dq.front() <= i - w) dq.pop_front();
        if (i >= w - 1) {
            int minIdx = dq.front();
            if (minIdx != lastMinIdx) {
                result.push_back({minIdx, km[minIdx]});
                lastMinIdx = minIdx;
            }
        }
    }
    return result;
}
```

```rust
fn kmers(seq: &str, k: usize) -> Vec<String> {
    let chars: Vec<char> = seq.chars().collect();
    if chars.len() < k {
        return Vec::new();
    }
    (0..=chars.len() - k).map(|i| chars[i..i + k].iter().collect()).collect()
}

fn simple_hash(s: &str) -> u32 {
    let mut h: u32 = 0;
    for ch in s.chars() {
        h = h.wrapping_mul(131).wrapping_add(ch as u32);
    }
    h
}

fn minimizers(seq: &str, k: usize, w: usize) -> Vec<(usize, String)> {
    let km = kmers(seq, k);
    let hashes: Vec<u32> = km.iter().map(|s| simple_hash(s)).collect();
    let n = hashes.len();
    let mut result = Vec::new();
    let mut dq: Vec<usize> = Vec::new();
    let mut last_min_idx: i64 = -1;

    for i in 0..n {
        while let Some(&back) = dq.last() {
            if hashes[back] > hashes[i] {
                dq.pop();
            } else {
                break;
            }
        }
        dq.push(i);
        while !dq.is_empty() && (dq[0] as i64) <= (i as i64) - (w as i64) {
            dq.remove(0);
        }
        if i + 1 >= w {
            let min_idx = dq[0];
            if min_idx as i64 != last_min_idx {
                result.push((min_idx, km[min_idx].clone()));
                last_min_idx = min_idx as i64;
            }
        }
    }
    result
}
```

```csharp
static List<string> Kmers(string seq, int k)
{
    var result = new List<string>();
    for (int i = 0; i <= seq.Length - k; i++) result.Add(seq.Substring(i, k));
    return result;
}

static uint SimpleHash(string s)
{
    uint h = 0;
    foreach (var ch in s) h = h * 131 + ch;
    return h;
}

static List<(int, string)> Minimizers(string seq, int k, int w)
{
    var km = Kmers(seq, k);
    var hashes = km.Select(SimpleHash).ToList();
    int n = hashes.Count;
    var result = new List<(int, string)>();
    var dq = new List<int>();
    int lastMinIdx = -1;

    for (int i = 0; i < n; i++)
    {
        while (dq.Count > 0 && hashes[dq[^1]] > hashes[i]) dq.RemoveAt(dq.Count - 1);
        dq.Add(i);
        while (dq[0] <= i - w) dq.RemoveAt(0);
        if (i >= w - 1)
        {
            int minIdx = dq[0];
            if (minIdx != lastMinIdx)
            {
                result.Add((minIdx, km[minIdx]));
                lastMinIdx = minIdx;
            }
        }
    }
    return result;
}
```
