---
name: BZip2圧縮(BWT+MTF+ハフマン符号のパイプライン)
category: 文字列
subcategory: 回文・圧縮その他
complexity: O(n log n)(BWT構築が支配的。MTF・ハフマン符号化は各O(n)またはO(n log n))
summary: Burrows-Wheeler変換で同じ文字を隣接させ、Move-to-Front変換で頻度分布を偏らせ、最後にハフマン符号でエントロピー符号化するという3段階パイプラインでロスレス圧縮を実現する方式。
---

## 概要

BZip2は、1996年にJulian Sewardが開発した、単一のアルゴリズムではなく**3つの異なるアルゴリズムを直列につないだパイプライン**として動作するロスレス圧縮方式である。それぞれの段階は単独では圧縮効果が限定的、あるいは全く圧縮しないにもかかわらず、「前の段階の出力が次の段階にとって都合の良い形になっている」という設計により、組み合わせ全体として高い圧縮率を実現している。具体的には、①[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)(BWT)で似た文脈を持つ文字を隣接させ、②[Move-to-Front変換](/algorithms/move-to-front-transform)(MTF)でその隣接性を「小さい数値に偏った分布」に変換し、③ハフマン符号でその偏った分布をエントロピー符号化して実際のビット数を削減する、という3段階から成る。gzip(LZ77系)より高い圧縮率を出しやすいことで知られ、Linuxディストリビューションのパッケージ配布などで広く使われてきた。

## 仕組み

**パイプライン全体の流れ**:

1. **ブロック分割**: 入力データを固定サイズ(通常100KB〜900KB)のブロックに分割する。BZip2は「ブロックソート方式」とも呼ばれ、ブロックごとに独立して以下の処理を行う(ストリーミングではなくブロック単位の処理である点がgzipなどとの違い)
2. **BWT(Burrows-Wheeler変換)**: 各ブロックに[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)を適用する。これは接尾辞配列的な考え方で全ての回転をソートし、その最終列を取り出す変換であり、変換自体はデータを圧縮しないが、**同じ文脈を持つ文字が隣接しやすくなる**という重要な性質を作り出す(例えば英文中の "the" の直後に来やすい文字は近い位置に集まる)
3. **MTF(Move-to-Front変換)**: BWTの出力に対して[Move-to-Front変換](/algorithms/move-to-front-transform)を適用する。BWT後の文字列は同じ文字が連続しやすいため、MTFを通すと出力は「0や小さい数字が非常に多い」という強く偏った数列になる
4. **ランレングス符号化(RLE)**: MTF出力に含まれる0の連続(ランレングス符号化と相性が良い)を短く符号化する軽い前処理を挟む(実装によってはBWTの直前にも別のRLEを1段挟み、極端な繰り返しパターンへの耐性を高める)
5. **ハフマン符号化**: 偏った分布を持つ数列に対して、出現頻度の高い値ほど短いビット列を割り当てるハフマン符号を適用し、実際のデータサイズを削減する。BZip2は複数のハフマンテーブルを切り替えながら符号化することで、ブロック内で頻度分布が変化する場合にも適応できるよう工夫されている
6. **復元**: 圧縮時と逆の順序(ハフマン復号 → RLE復元 → MTF逆変換 → BWT逆変換)で処理すれば、元のデータが完全に復元される。各段階が可逆変換であることが、パイプライン全体の可逆性(ロスレス性)を保証している

## 特性・トレードオフ

- **計算量**: BWTの構築が全体のボトルネックで、[接尾辞配列](/algorithms/suffix-array)ベースの構築を使えばO(n log n)(理論上はDC3法のようなO(n)構築も可能)。MTFはO(n × Σ)、ハフマン符号化の構築と適用はO(n log Σ)程度で、BWTに比べれば軽い
- **各段階の役割分担**: BWT単体・MTF単体はいずれもデータを圧縮しない(むしろ同じサイズのまま出力する)。「圧縮するのはハフマン符号化(とRLE)だけ」であり、BWTとMTFの役割は「ハフマン符号化が効きやすいように分布を作り変える前処理」に徹している点がこのパイプラインの設計思想の核心
- **gzip(LZ77系)との比較**: gzipは[LZ77圧縮](/algorithms/lz77-compression)ベースで「過去に出現した部分文字列への参照」を使うのに対し、BZip2はブロック内の統計的な文脈の偏りを利用する。一般にBZip2の方が圧縮率は高くなりやすいが、ブロック単位の処理のため圧縮・展開速度はgzipより遅く、ランダムアクセス性にも劣る
- **ブロックサイズとのトレードオフ**: ブロックを大きくするほど、BWTが活用できる文脈(繰り返しパターンの発見範囲)が広がり圧縮率が向上する傾向があるが、その分メモリ消費と処理時間も増える
- **使いどころ**: `.bz2`/`.tar.bz2`形式のファイル圧縮、Linuxパッケージ(`.deb`の一部など)の配布、ゲノム配列データなど高い圧縮率が求められるテキスト系データの保存。近年はより高圧縮なzstdやxzに置き換わる場面も増えているが、BWTベース圧縮の設計を学ぶ教材として依然として重要

## 実装例

簡略化した実装(ブロック分割・ランレングス符号化・ハフマンテーブルの動的切り替えは省略し、パイプラインの本質である BWT → MTF → ハフマン符号化 の流れを示す)。

```python
import heapq
from collections import Counter


def bwt_transform(s: str) -> tuple[str, int]:
    s = s + "\x00"
    n = len(s)
    rotations = sorted(range(n), key=lambda i: s[i:] + s[:i])
    bwt = "".join(s[(i - 1) % n] for i in rotations)
    original_index = rotations.index(0)
    return bwt, original_index


def mtf_encode(s: str) -> list[int]:
    symbols = sorted(set(s))
    result = []
    for c in s:
        i = symbols.index(c)
        result.append(i)
        symbols.pop(i)
        symbols.insert(0, c)
    return result


def build_huffman_codes(values: list[int]) -> dict[int, str]:
    freq = Counter(values)
    heap = [[w, [v, ""]] for v, w in freq.items()]
    heapq.heapify(heap)
    if len(heap) == 1:
        return {heap[0][1][0]: "0"}
    while len(heap) > 1:
        lo = heapq.heappop(heap)
        hi = heapq.heappop(heap)
        for pair in lo[1:]:
            pair[1] = "0" + pair[1]
        for pair in hi[1:]:
            pair[1] = "1" + pair[1]
        merged = [lo[0] + hi[0]] + lo[1:] + hi[1:]
        heapq.heappush(heap, merged)
    return {v: code for v, code in heap[0][1:]}


def bzip2_like_compress(s: str) -> tuple[str, dict[int, str], int]:
    """BWT -> MTF -> ハフマン符号化 のパイプラインを通し、
    符号化されたビット列・ハフマンテーブル・BWT復元用インデックスを返す"""
    bwt, original_index = bwt_transform(s)
    mtf_values = mtf_encode(bwt)
    codes = build_huffman_codes(mtf_values)
    encoded_bits = "".join(codes[v] for v in mtf_values)
    return encoded_bits, codes, original_index
```

```typescript
function bwtTransform(input: string): { bwt: string; originalIndex: number } {
  const s = input + "\x00";
  const n = s.length;
  const rotationIndices = Array.from({ length: n }, (_, i) => i);
  rotationIndices.sort((a, b) => {
    const ra = s.slice(a) + s.slice(0, a);
    const rb = s.slice(b) + s.slice(0, b);
    return ra < rb ? -1 : ra > rb ? 1 : 0;
  });
  const bwt = rotationIndices.map((i) => s[(i - 1 + n) % n]).join("");
  const originalIndex = rotationIndices.indexOf(0);
  return { bwt, originalIndex };
}

function mtfEncode(s: string): number[] {
  const symbols = Array.from(new Set(s.split(""))).sort();
  const result: number[] = [];
  for (const c of s) {
    const i = symbols.indexOf(c);
    result.push(i);
    symbols.splice(i, 1);
    symbols.unshift(c);
  }
  return result;
}

interface HuffmanNode {
  weight: number;
  value?: number;
  code: string;
  children?: [HuffmanNode, HuffmanNode];
}

function buildHuffmanCodes(values: number[]): Map<number, string> {
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);

  let nodes: HuffmanNode[] = [...freq.entries()].map(([value, weight]) => ({
    weight,
    value,
    code: "",
  }));

  if (nodes.length === 1) {
    return new Map([[nodes[0].value as number, "0"]]);
  }

  while (nodes.length > 1) {
    nodes.sort((a, b) => a.weight - b.weight);
    const lo = nodes.shift() as HuffmanNode;
    const hi = nodes.shift() as HuffmanNode;
    nodes.push({ weight: lo.weight + hi.weight, code: "", children: [lo, hi] });
  }

  const codes = new Map<number, string>();
  const walk = (node: HuffmanNode, prefix: string) => {
    if (node.children) {
      walk(node.children[0], prefix + "0");
      walk(node.children[1], prefix + "1");
    } else {
      codes.set(node.value as number, prefix || "0");
    }
  };
  walk(nodes[0], "");
  return codes;
}

function bzip2LikeCompress(s: string): {
  encodedBits: string;
  codes: Map<number, string>;
  originalIndex: number;
} {
  const { bwt, originalIndex } = bwtTransform(s);
  const mtfValues = mtfEncode(bwt);
  const codes = buildHuffmanCodes(mtfValues);
  const encodedBits = mtfValues.map((v) => codes.get(v) as string).join("");
  return { encodedBits, codes, originalIndex };
}
```
