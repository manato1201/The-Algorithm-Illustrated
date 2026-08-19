---
name: 正準ハフマン符号(Canonical Huffman Codes)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: ハフマン木そのものではなく各記号の符号長だけを記録し、記号を符号長順に並べ替えて機械的に符号を再構成することで、符号表の保存コストを劇的に圧縮する手法。
---

## 概要

[ハフマン符号化](/algorithms/huffman-coding)は、頻度の低い記号ほど長い符号を貪欲に割り当てることで最適な圧縮率を達成するが、実用上は見落とされがちな問題がある。それは「復号する側が同じ符号表を持っていなければ復号できない」という点だ。素朴には、木構造そのもの(各ノードのポインタや形状)をファイルに埋め込んで送る必要があるが、記号数が多いと木の記述だけで無視できないオーバーヘッドになる。

正準ハフマン符号(canonical Huffman code)は、この問題を「木を送るのではなく、**各記号の符号長だけを送る**」という発想で解決する。驚くべきことに、記号を(1)符号長の昇順、(2)同じ長さなら記号の辞書順、で並べ替えさえすれば、木の形状情報を一切使わずに、決まった規則だけで一意に符号を再構成できる。DEFLATE(ZIPやgzip、PNGの内部)やJPEGのハフマンテーブルは、まさにこの正準形式で符号長のリストだけを保存している。

## 仕組み

1. 通常のハフマン木構築アルゴリズム(頻度の低い2ノードを繰り返し併合する貪欲法)で、各記号の**符号長**(木の根から葉までの深さ)だけを求める。木そのものは使い捨てて構わない
2. 記号を「符号長が短い順」→「同じ長さなら記号(のインデックスやコード)の辞書順」でソートする
3. 最初の記号(最短の符号長を持つ最初の記号)には `0` を並べた符号長ぶんのビット列(全て0)を割り当てる
4. 以降、ソート順に記号を処理し、**直前の符号に1を足し、その後で目的の符号長までビットを左シフト**する、という規則的な手続きで次々に符号を生成する:
   ```
   code = 0
   for i in sorted symbols:
       assign code (with length[i] bits) to symbol i
       code = (code + 1) << (length[i+1] - length[i])
   ```
5. 復号側は「各符号長ごとに何個の記号があるか」というごく短いテーブル(あるいは記号数の配列)さえあれば、この規則から符号表全体を再構成できる

木構造を復元しているわけではないが、同じ規則で符号を機械的に再生成しているだけなので、結果として得られる符号長の組み合わせは元のハフマン木と(接頭辞性を保ったまま)完全に等価な符号になる。

## 特性・トレードオフ

- **符号表の圧縮**: 木のポインタ構造をそのまま保存すると記号数`n`に対してO(n)個のノード情報(左右の子への参照など)が必要だが、正準形式では「各記号の符号長」というO(n)個の小さな整数(多くは4〜15程度に収まる)だけで済み、さらに符号長ごとの記号数として差分符号化すればより小さくなる。DEFLATEでは符号長のリスト自体をさらにハフマン符号化するほど、この圧縮効果が重視されている
- **貪欲法としての位置づけ**: 符号長を決める段階(通常のハフマン木構築)は[ハフマン符号化](/algorithms/huffman-coding)と全く同じ「最も軽い2つを毎回貪欲に結合する」戦略であり、これが大域最適な符号長の割り当てになることは証明済み。正準化はその最適解を「保存・伝送しやすい形」に変換するだけの後処理であり、符号長の割り当て自体を変えるわけではない(貪欲法の最適性は正準化によって損なわれない)
- **符号自体は元のハフマン符号と異なりうる**: 正準符号は元の木が生成した符号のビットパターンとは一致しないことが多いが、各記号の符号長は完全に一致し、接頭辞性(ある符号が他の符号の先頭部分にならない)も保たれるため、圧縮率は元のハフマン符号と全く同じになる。「どのビット列を使うか」ではなく「どの長さを使うか」だけが圧縮率を決めるという点が本質
- **使いどころ**: DEFLATE(ZIP・gzip・PNG)、JPEG、多くのフォント埋め込み形式など、符号表そのものを繰り返し(あるいはファイルごとに)送信・保存する必要がある実用的な圧縮フォーマットのほぼ全てで採用されている標準的な実装技法

## 実装例

```python
def code_lengths_from_freqs(freqs: dict[str, int]) -> dict[str, int]:
    """通常のハフマン木構築で各記号の符号長だけを求める。"""
    import heapq
    from itertools import count

    tie = count()
    heap = [[f, next(tie), [ch]] for ch, f in freqs.items()]
    heapq.heapify(heap)
    lengths: dict[str, int] = {ch: 0 for ch in freqs}

    if len(heap) == 1:
        lengths[heap[0][2][0]] = 1
        return lengths

    while len(heap) > 1:
        f1, _, syms1 = heapq.heappop(heap)
        f2, _, syms2 = heapq.heappop(heap)
        for s in syms1 + syms2:
            lengths[s] += 1
        heapq.heappush(heap, [f1 + f2, next(tie), syms1 + syms2])

    return lengths


def build_canonical_codes(lengths: dict[str, int]) -> dict[str, str]:
    """符号長の辞書から正準ハフマン符号を機械的に再構成する。"""
    # 符号長が短い順、同じ長さなら記号の辞書順にソート
    symbols = sorted(lengths.keys(), key=lambda s: (lengths[s], s))

    codes: dict[str, str] = {}
    code = 0
    prev_len = 0
    for sym in symbols:
        length = lengths[sym]
        code <<= (length - prev_len)
        codes[sym] = format(code, f"0{length}b")
        code += 1
        prev_len = length

    return codes


def encode(text: str, codes: dict[str, str]) -> str:
    return "".join(codes[c] for c in text)


def decode(bits: str, codes: dict[str, str]) -> str:
    rev = {v: k for k, v in codes.items()}
    out, buf = [], ""
    for b in bits:
        buf += b
        if buf in rev:
            out.append(rev[buf])
            buf = ""
    return "".join(out)
```

```typescript
function codeLengthsFromFreqs(freqs: Map<string, number>): Map<string, number> {
  type HeapNode = { freq: number; syms: string[] };
  const heap: HeapNode[] = [...freqs.entries()].map(([ch, f]) => ({
    freq: f,
    syms: [ch],
  }));
  const lengths = new Map<string, number>([...freqs.keys()].map((s) => [s, 0]));

  const pop = (): HeapNode => {
    heap.sort((a, b) => a.freq - b.freq);
    return heap.shift()!;
  };

  if (heap.length === 1) {
    lengths.set(heap[0].syms[0], 1);
    return lengths;
  }

  while (heap.length > 1) {
    const n1 = pop();
    const n2 = pop();
    for (const s of [...n1.syms, ...n2.syms]) {
      lengths.set(s, (lengths.get(s) ?? 0) + 1);
    }
    heap.push({ freq: n1.freq + n2.freq, syms: [...n1.syms, ...n2.syms] });
  }

  return lengths;
}

function buildCanonicalCodes(lengths: Map<string, number>): Map<string, string> {
  const symbols = [...lengths.keys()].sort((a, b) => {
    const lenA = lengths.get(a)!;
    const lenB = lengths.get(b)!;
    return lenA !== lenB ? lenA - lenB : a < b ? -1 : 1;
  });

  const codes = new Map<string, string>();
  let code = 0;
  let prevLen = 0;
  for (const sym of symbols) {
    const length = lengths.get(sym)!;
    code <<= length - prevLen;
    codes.set(sym, code.toString(2).padStart(length, "0"));
    code += 1;
    prevLen = length;
  }

  return codes;
}

function encode(text: string, codes: Map<string, string>): string {
  return [...text].map((c) => codes.get(c)!).join("");
}

function decode(bits: string, codes: Map<string, string>): string {
  const rev = new Map([...codes.entries()].map(([k, v]) => [v, k]));
  const out: string[] = [];
  let buf = "";
  for (const b of bits) {
    buf += b;
    if (rev.has(buf)) {
      out.push(rev.get(buf)!);
      buf = "";
    }
  }
  return out.join("");
}
```
