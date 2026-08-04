---
name: LZ77圧縮
category: 文字列
subcategory: 回文・圧縮その他
complexity: O(n)〜O(n²)(実装依存、スライディングウィンドウのサイズと探索方式による)
summary: 「これまでに出てきた文字列と同じ部分は、その場所への参照(距離・長さ)に置き換える」というシンプルな発想で、ZIP・gzip・PNGなど現代のほぼ全てのロスレス圧縮の基礎になっている辞書式圧縮アルゴリズム。
---

## 概要

[ハフマン符号化](/algorithms/huffman-coding)が「頻度の高い記号に短い符号を割り当てる」という記号レベルの圧縮なのに対し、1977年にアブラハム・レンペル(Lempel)とヤコブ・ジブ(Ziv)が発表したLZ77は全く異なるアプローチを取る——テキスト中に「過去に出てきたのと同じ部分文字列」を見つけたら、その文字列そのものを繰り返し書く代わりに「どれだけ遡った場所に、何文字分同じものがあるか」という(距離, 長さ)のペアに置き換えてしまう。この「繰り返しを参照に変える」という単純明快なアイデアが、ZIP・gzip・PNG・DEFLATE(ひいてはZstandardやBrotliのような現代の圧縮方式の系譜)まで、現代のロスレス圧縮のほぼ全てが土台とする基本原理になっている。

## 仕組み

1. 圧縮したいデータの先頭からある位置までを「スライディングウィンドウ」(既に処理済みの過去のデータ)とし、その直後を「先読みバッファ」(これから符号化する部分)とする
2. 先読みバッファの先頭から始まる文字列が、スライディングウィンドウ内のどこかに一致する箇所がないか探す(最長一致を探すのが理想だが、実装によっては近似的な探索で妥協することもある)
3. 一致が見つかれば、その一致箇所を`(距離, 長さ, 次の1文字)`という3つ組(または実装によっては`(距離, 長さ)`のペア)として出力する——「現在位置から`距離`だけ遡った場所から`長さ`文字分をコピーせよ」という指示になる
4. 一致が見つからなければ、その1文字をそのままリテラルとして出力する
5. ウィンドウを一致した長さ分だけスライドさせ、先読みバッファの新しい先頭から同じ処理を繰り返す
6. 出力された`(距離, 長さ, 文字)`の列とリテラルの列を、多くの実装ではさらに[ハフマン符号化](/algorithms/huffman-coding)にかけることで、参照そのものの表現もさらに圧縮する(これがDEFLATEアルゴリズム、ひいてはgzip・ZIP・PNGの正体である)

## 特性・トレードオフ

- **計算量**: スライディングウィンドウ内での最長一致探索が処理の核であり、素朴な線形探索なら`O(n²)`だが、[Trie木](/algorithms/trie)やハッシュテーブルを使った効率的な実装では実質`O(n)`に近づけられる。ウィンドウサイズを大きくするほど遠くの繰り返しも見つけられるが探索コストも増える、というトレードオフがある
- **[ハフマン符号化](/algorithms/huffman-coding)との相互補完性**: LZ77は「繰り返し構造」を利用した圧縮であり、[ハフマン符号化](/algorithms/huffman-coding)は「記号の出現頻度の偏り」を利用した圧縮である。この2つは利用する冗長性の種類が異なるため組み合わせる相性が良く、LZ77で繰り返しを除去した後の出力を[ハフマン符号化](/algorithms/huffman-coding)でさらに圧縮する、という2段構えがDEFLATEの設計思想になっている
- **[LZWアルゴリズム](/algorithms/lzw-compression)との違い**: LZ77は「過去の生データそのもの」を参照するスライディングウィンドウ方式だが、[LZW](/algorithms/lzw-compression)は明示的な辞書テーブルを動的に構築・参照する方式であり、同じ「繰り返しを利用する」という発想を異なる仕組みで実現している姉妹アルゴリズムと言える
- **使いどころ**: gzip・ZIP・PNG画像圧縮・HTTP圧縮(Content-Encoding: gzip)・Gitのオブジェクト圧縮など、現代のインフラのほぼ至るところで直接・間接に使われている、ロスレス圧縮の基礎技術

## 実装例

`(距離, 長さ, 次の1文字)`の3つ組へのエンコードと、その逆再生によるデコードの往復一致を確認する。

```python
def lz77_encode(data: str, window_size: int = 32) -> list[tuple[int, int, str]]:
    result = []
    i = 0
    n = len(data)
    while i < n:
        best_len = 0
        best_dist = 0
        start = max(0, i - window_size)
        for j in range(start, i):
            length = 0
            while i + length < n and data[j + length] == data[i + length] and length < (i - j):
                length += 1
            if length > best_len:
                best_len = length
                best_dist = i - j
        next_char = data[i + best_len] if i + best_len < n else ""
        result.append((best_dist, best_len, next_char))
        i += best_len + 1
    return result


def lz77_decode(tokens: list[tuple[int, int, str]]) -> str:
    result = []
    for dist, length, ch in tokens:
        start = len(result) - dist
        for k in range(length):
            result.append(result[start + k])
        if ch != "":
            result.append(ch)
    return "".join(result)
```

```typescript
type LZ77Token = [number, number, string];

function lz77Encode(data: string, windowSize = 32): LZ77Token[] {
  const result: LZ77Token[] = [];
  let i = 0;
  const n = data.length;
  while (i < n) {
    let bestLen = 0;
    let bestDist = 0;
    const start = Math.max(0, i - windowSize);
    for (let j = start; j < i; j++) {
      let length = 0;
      while (i + length < n && data[j + length] === data[i + length] && length < i - j) {
        length++;
      }
      if (length > bestLen) {
        bestLen = length;
        bestDist = i - j;
      }
    }
    const nextChar = i + bestLen < n ? data[i + bestLen] : "";
    result.push([bestDist, bestLen, nextChar]);
    i += bestLen + 1;
  }
  return result;
}

function lz77Decode(tokens: LZ77Token[]): string {
  const result: string[] = [];
  for (const [dist, length, ch] of tokens) {
    const start = result.length - dist;
    for (let k = 0; k < length; k++) result.push(result[start + k]);
    if (ch !== "") result.push(ch);
  }
  return result.join("");
}
```

```cpp
#include <string>
#include <vector>
#include <tuple>
#include <algorithm>

std::vector<std::tuple<int, int, char>> lz77Encode(const std::string& data, int windowSize = 32) {
    std::vector<std::tuple<int, int, char>> result;
    int n = static_cast<int>(data.size());
    int i = 0;
    while (i < n) {
        int bestLen = 0, bestDist = 0;
        int start = std::max(0, i - windowSize);
        for (int j = start; j < i; j++) {
            int length = 0;
            while (i + length < n && data[j + length] == data[i + length] && length < i - j) {
                length++;
            }
            if (length > bestLen) {
                bestLen = length;
                bestDist = i - j;
            }
        }
        char nextChar = (i + bestLen < n) ? data[i + bestLen] : '\0';
        result.push_back({bestDist, bestLen, nextChar});
        i += bestLen + 1;
    }
    return result;
}

std::string lz77Decode(const std::vector<std::tuple<int, int, char>>& tokens) {
    std::string result;
    for (const auto& [dist, length, ch] : tokens) {
        size_t start = result.size() - dist;
        for (int k = 0; k < length; k++) result.push_back(result[start + k]);
        if (ch != '\0') result.push_back(ch);
    }
    return result;
}
```

```rust
fn lz77_encode(data: &str, window_size: usize) -> Vec<(usize, usize, Option<char>)> {
    let chars: Vec<char> = data.chars().collect();
    let n = chars.len();
    let mut result = Vec::new();
    let mut i = 0;
    while i < n {
        let mut best_len = 0;
        let mut best_dist = 0;
        let start = if i > window_size { i - window_size } else { 0 };
        for j in start..i {
            let mut length = 0;
            while i + length < n && chars[j + length] == chars[i + length] && length < (i - j) {
                length += 1;
            }
            if length > best_len {
                best_len = length;
                best_dist = i - j;
            }
        }
        let next_char = if i + best_len < n { Some(chars[i + best_len]) } else { None };
        result.push((best_dist, best_len, next_char));
        i += best_len + 1;
    }
    result
}

fn lz77_decode(tokens: &[(usize, usize, Option<char>)]) -> String {
    let mut result: Vec<char> = Vec::new();
    for &(dist, length, ch) in tokens {
        let start = result.len() - dist;
        for k in 0..length {
            result.push(result[start + k]);
        }
        if let Some(c) = ch {
            result.push(c);
        }
    }
    result.into_iter().collect()
}
```

```csharp
static List<(int dist, int len, char? ch)> Lz77Encode(string data, int windowSize = 32)
{
    var result = new List<(int, int, char?)>();
    int i = 0, n = data.Length;
    while (i < n)
    {
        int bestLen = 0, bestDist = 0;
        int start = Math.Max(0, i - windowSize);
        for (int j = start; j < i; j++)
        {
            int length = 0;
            while (i + length < n && data[j + length] == data[i + length] && length < i - j) length++;
            if (length > bestLen) { bestLen = length; bestDist = i - j; }
        }
        char? nextChar = i + bestLen < n ? data[i + bestLen] : null;
        result.Add((bestDist, bestLen, nextChar));
        i += bestLen + 1;
    }
    return result;
}

static string Lz77Decode(List<(int dist, int len, char? ch)> tokens)
{
    var result = new List<char>();
    foreach (var (dist, length, ch) in tokens)
    {
        int start = result.Count - dist;
        for (int k = 0; k < length; k++) result.Add(result[start + k]);
        if (ch.HasValue) result.Add(ch.Value);
    }
    return new string(result.ToArray());
}
```
