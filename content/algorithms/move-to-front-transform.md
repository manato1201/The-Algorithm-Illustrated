---
name: Move-to-Front変換(MTF)
category: 文字列
subcategory: 回文・圧縮その他
complexity: O(n × Σ)(nは入力長、Σはアルファベットサイズ。連結リスト実装の場合)
summary: 出現した記号をリストの先頭に移動させ続けることで、局所的に繰り返し出現する記号を小さいインデックスへと変換する、圧縮の前処理に使われる可逆変換。
---

## 概要

Move-to-Front変換(MTF)は、それ自体ではデータを圧縮しない、しかし「後段の圧縮アルゴリズムが効きやすい形にデータを変換する」という前処理として使われる手法である。発想は単純で、アルファベット(登場しうる全記号)を並べたリストを1つ用意し、入力を1記号読むたびに「その記号が今リストの何番目にあるか」というインデックスを出力し、その記号をリストの**先頭に移動させる**、という操作を繰り返すだけである。この単純な操作により、**局所的に同じ記号が繰り返し出現する**という性質を持つデータ(自然言語のテキストや、[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)を通した後の文字列など)を、「0や小さい数字が連続しやすい」数列に変換できる。0が連続しやすい数列は、ランレングス符号化やハフマン符号化のようなその後の圧縮ステップの効率を大きく高める。

## 仕組み

1. アルファベット(想定される全ての記号)を何らかの初期順序(例えばASCIIコード順)で並べたリスト`L`を用意する
2. 入力記号列を先頭から1つずつ処理する。記号`c`を読んだら、`L`の中で`c`が現在何番目(0-indexed)にあるかを調べ、そのインデックス`i`を出力する
3. `c`を`L`から取り除き、`L`の先頭に挿入する(これが「Move-to-Front」の名前の由来)
4. 全ての記号を処理し終えると、出力されたインデックス列がMTF変換の結果になる

**復元(逆変換)**も同じ発想で行える。インデックス列を読みながら、その都度「現在のリストの`i`番目の記号」を出力し、その記号をリストの先頭に移動させる操作を繰り返せば、元の記号列が一意に復元できる(可逆変換)。

**なぜ圧縮に効くのか**: ある記号が短い間隔で繰り返し出現する箇所では、2回目以降の出現時にその記号は既にリストの先頭付近にあるため、出力されるインデックスは小さい値(多くは0)になる。逆に、あまり出現しない記号のインデックスは大きい値になる。この結果、出力列は「0が非常に多く、大きい値はまれ」という強く偏った分布になり、ランレングス符号化やハフマン符号化のようなエントロピー符号化が高い圧縮率を発揮できる形に整えられる。

## 特性・トレードオフ

- **計算量**: リストを単純な配列や連結リストで実装した場合、1記号あたり「探索」と「先頭への移動」にO(Σ)(Σはアルファベットサイズ)かかり、全体でO(n × Σ)。アルファベットサイズが256(バイト値)程度であれば実用上は十分高速。より高度な実装(平衡二分木でランクを管理するなど)を使えばO(n log Σ)まで改善できる
- **可逆性**: 情報を一切失わない可逆変換であり、圧縮の前処理として安全に使える(元のデータが完全に復元できることが保証されている)
- **単独では圧縮しない**: MTF自体は入力と同じ長さの数列を出力するだけで、データサイズを縮めるわけではない。実際の圧縮効果は、MTFが作り出した「小さい値に偏った分布」を、後段のランレングス符号化やハフマン符号化が活用することで初めて得られる
- **[Burrows-Wheeler変換](/algorithms/burrows-wheeler-transform)との相性**: BWTは「同じ文字を連続させる」変換であり、この性質はMTFが最も得意とする入力(局所的な繰り返し)と極めてよく噛み合う。bzip2の圧縮パイプラインが「BWT → MTF → ハフマン符号」という順序を採用しているのはこのためであり、[BZip2圧縮](/algorithms/bzip2-compression)で全体のパイプラインを説明する
- **使いどころ**: bzip2などBWTベースの圧縮ツールの中間ステップ、キャッシュのLRU(Least Recently Used)ポリシーの実装とも本質的に同じ「最近使ったものを先頭に寄せる」操作の一種として、リスト自己組織化(self-organizing list)の文脈でも登場する

## 実装例

```python
def mtf_encode(data: bytes, alphabet: list[int] | None = None) -> list[int]:
    symbols = alphabet if alphabet is not None else list(range(256))
    result = []
    for b in data:
        i = symbols.index(b)
        result.append(i)
        symbols.pop(i)
        symbols.insert(0, b)
    return result


def mtf_decode(indices: list[int], alphabet: list[int] | None = None) -> bytes:
    symbols = alphabet if alphabet is not None else list(range(256))
    result = bytearray()
    for i in indices:
        b = symbols[i]
        result.append(b)
        symbols.pop(i)
        symbols.insert(0, b)
    return bytes(result)
```

```typescript
function mtfEncode(data: number[], alphabetSize = 256): number[] {
  const symbols = Array.from({ length: alphabetSize }, (_, i) => i);
  const result: number[] = [];
  for (const b of data) {
    const i = symbols.indexOf(b);
    result.push(i);
    symbols.splice(i, 1);
    symbols.unshift(b);
  }
  return result;
}

function mtfDecode(indices: number[], alphabetSize = 256): number[] {
  const symbols = Array.from({ length: alphabetSize }, (_, i) => i);
  const result: number[] = [];
  for (const i of indices) {
    const b = symbols[i];
    result.push(b);
    symbols.splice(i, 1);
    symbols.unshift(b);
  }
  return result;
}
```
