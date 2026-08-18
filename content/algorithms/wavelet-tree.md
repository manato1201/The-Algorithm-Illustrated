---
name: ウェーブレット木(Wavelet Tree)
category: 文字列
subcategory: 接尾辞構造
complexity: O(log Σ)(1クエリあたり。Σはアルファベットサイズ)
summary: 文字列をビットベクトルの木として再帰的に分解し、任意区間内の特定文字の出現回数(rank)やk番目の出現位置(select)を対数時間で答えられるようにする圧縮索引構造。
---

## 概要

文字列に対して「区間`[l, r]`の中に文字`c`は何回出現するか(rankクエリ)」「文字`c`のk番目の出現位置はどこか(selectクエリ)」「位置`i`の文字は何か(accessクエリ)」といった問い合わせに、元の文字列とほぼ同じサイズのメモリで**対数時間**に答えられるようにする索引構造がウェーブレット木である。2003年にRoberto Grossiらによって提案された。文字列をアルファベットの半分ずつに繰り返し分割していく二分木構造を作り、各ノードにビットベクトル(0/1の配列に対して高速なrank/select操作ができる補助構造)を持たせることで実現する。[接尾辞配列](/algorithms/suffix-array)や[LCP配列](/algorithms/lcp-array)が「文字列の接尾辞間の関係」を扱うのに対し、ウェーブレット木は「文字列中の文字の出現パターン」を扱う、圧縮全文索引の重要な構成要素の一つである。

## 仕組み

1. **アルファベットの二分割**: 文字列`S`が使用するアルファベット`Σ`(例えば `a` から `z`)を、辞書式順序で半分ずつに分割する。ルートノードでは、`S`の各文字がアルファベットの前半に属するか後半に属するかを、位置ごとに0/1のビットベクトルとして記録する
2. **再帰的な分割**: 前半に属する文字だけを集めて左の子ノードへ、後半に属する文字だけを集めて右の子ノードへ渡す。それぞれの子ノードで、さらにその範囲のアルファベットを半分に分割し、同様にビットベクトルを作る、という処理を**アルファベットが1文字になるまで**再帰的に繰り返す
3. **木の深さ**: アルファベットを毎回半分に分割するため、木の深さはO(log Σ)になる。各層のビットベクトルの長さの合計はちょうど`n`(元の文字列長)になるため、木全体のサイズはO(n log Σ)ビット程度に収まる
4. **rankクエリ(区間内の文字の出現回数)**: 目的の文字`c`が「アルファベットの前半か後半か」を根から順に判定し、対応する子へ降りていく。各ノードで「その区間に何文字が前半(または後半)に属するか」をビットベクトルの`rank`操作(あるビットパターンが特定位置までに何回現れるかを問うクエリ。ビットベクトルに前計算しておくことでO(1)で答えられる)で求めながら、対象区間を子ノードでの対応する区間へと変換していく。木の深さ分(O(log Σ)回)これを繰り返せば、最終的に葉ノードで区間の長さがそのまま出現回数になる
5. **selectクエリ・accessクエリ**: 同様に、根から葉、あるいは葉から根へとビットベクトルの`rank`/`select`操作を辿ることで、k番目の出現位置や、ある位置の文字が何かをそれぞれO(log Σ)で求められる

## 特性・トレードオフ

- **計算量**: rank・select・accessの全てのクエリがO(log Σ)で答えられる。構築はO(n log Σ)。各ノードのビットベクトルに高速な`rank`/`select`をO(1)〜O(log log n)で提供する補助データ構造(例えば[Fenwick木](/algorithms/fenwick-tree)や専用のsuccinctなビットベクトル構造)を組み合わせて初めてこの計算量が達成される
- **空間効率**: 単純にアルファベットの種類数分だけ配列を持つ(各文字ごとに出現位置のリストを持つなど)方式に比べ、ウェーブレット木は元の文字列とほぼ同じ情報量(エントロピーに近いビット数)で同等以上のクエリ能力を提供できる、圧縮索引としての強みを持つ
- **[Fenwick木](/algorithms/fenwick-tree)・[Sparse Table](/algorithms/sparse-table)との違い**: これらのデータ構造は「数値の区間和・区間最小値」といった単一の集約値に特化しているのに対し、ウェーブレット木は「区間内の任意の文字(値)ごとの出現回数・位置」という、より高次元的な問い合わせに答えられる。文字列や整数列に対する2次元的な範囲クエリ(区間かつ値の範囲)に応用できる点が独自の強み
- **接尾辞配列との組み合わせ**: [接尾辞配列](/algorithms/suffix-array)にウェーブレット木を組み合わせると、FM-index(BWTベースの圧縮全文索引)のような、圧縮された形のまま任意パターンの出現回数・出現位置を高速に答えられる索引構造を構築できる
- **使いどころ**: 圧縮全文索引(FM-indexの構成要素)、バイオインフォマティクスにおけるゲノム配列の高速検索(BWA等のリードアラインメントツール)、地理情報システムにおける2次元範囲クエリ、ランキング集計(ある区間で最も頻出する要素を求める問題)など

## 実装例

簡略化のため、各ノードのビットベクトルへの`rank`はO(区間長)の線形走査で実装している(実用実装では前計算によりO(1)〜O(log log n)にする)。

```python
class WaveletTreeNode:
    def __init__(self, bits: list[bool], lo: int, hi: int, left=None, right=None):
        self.bits = bits  # このノードの区間で「後半アルファベットに属するか」を表すビット列
        self.lo = lo
        self.hi = hi
        self.left = left
        self.right = right


def build_wavelet_tree(seq: list[int], lo: int, hi: int) -> WaveletTreeNode | None:
    if not seq or lo == hi:
        return WaveletTreeNode([], lo, hi) if seq else None
    mid = (lo + hi) // 2
    bits = [x > mid for x in seq]
    left_seq = [x for x in seq if x <= mid]
    right_seq = [x for x in seq if x > mid]
    left = build_wavelet_tree(left_seq, lo, mid)
    right = build_wavelet_tree(right_seq, mid + 1, hi)
    return WaveletTreeNode(bits, lo, hi, left, right)


def _rank_bits(bits: list[bool], pos: int, value: bool) -> int:
    """bits[0:pos)の中でvalueと一致する個数(線形走査。実用実装ではO(1)に前計算する)"""
    return sum(1 for b in bits[:pos] if b == value)


def wavelet_rank(node: WaveletTreeNode | None, c: int, pos: int) -> int:
    """区間[0, pos)の中で文字cが出現する回数"""
    if node is None or pos <= 0:
        return 0
    if node.lo == node.hi:
        return pos
    mid = (node.lo + node.hi) // 2
    if c <= mid:
        zeros = _rank_bits(node.bits, pos, False)
        return wavelet_rank(node.left, c, zeros)
    else:
        ones = _rank_bits(node.bits, pos, True)
        return wavelet_rank(node.right, c, ones)


def wavelet_access(node: WaveletTreeNode | None, pos: int) -> int:
    """位置posの文字を返す"""
    if node.lo == node.hi:
        return node.lo
    mid = (node.lo + node.hi) // 2
    if not node.bits[pos]:
        zeros = _rank_bits(node.bits, pos, False)
        return wavelet_access(node.left, zeros)
    else:
        ones = _rank_bits(node.bits, pos, True)
        return wavelet_access(node.right, ones)
```

```typescript
class WaveletTreeNode {
  bits: boolean[]; // このノードの区間で「後半アルファベットに属するか」を表すビット列
  lo: number;
  hi: number;
  left: WaveletTreeNode | null;
  right: WaveletTreeNode | null;

  constructor(
    bits: boolean[],
    lo: number,
    hi: number,
    left: WaveletTreeNode | null = null,
    right: WaveletTreeNode | null = null,
  ) {
    this.bits = bits;
    this.lo = lo;
    this.hi = hi;
    this.left = left;
    this.right = right;
  }
}

function buildWaveletTree(
  seq: number[],
  lo: number,
  hi: number,
): WaveletTreeNode | null {
  if (seq.length === 0) return null;
  if (lo === hi) return new WaveletTreeNode([], lo, hi);
  const mid = Math.floor((lo + hi) / 2);
  const bits = seq.map((x) => x > mid);
  const leftSeq = seq.filter((x) => x <= mid);
  const rightSeq = seq.filter((x) => x > mid);
  const left = buildWaveletTree(leftSeq, lo, mid);
  const right = buildWaveletTree(rightSeq, mid + 1, hi);
  return new WaveletTreeNode(bits, lo, hi, left, right);
}

function rankBits(bits: boolean[], pos: number, value: boolean): number {
  // bits[0:pos) の中で value と一致する個数(線形走査。実用実装ではO(1)に前計算する)
  let count = 0;
  for (let i = 0; i < pos; i++) if (bits[i] === value) count++;
  return count;
}

function waveletRank(
  node: WaveletTreeNode | null,
  c: number,
  pos: number,
): number {
  // 区間[0, pos)の中で文字cが出現する回数
  if (node === null || pos <= 0) return 0;
  if (node.lo === node.hi) return pos;
  const mid = Math.floor((node.lo + node.hi) / 2);
  if (c <= mid) {
    const zeros = rankBits(node.bits, pos, false);
    return waveletRank(node.left, c, zeros);
  } else {
    const ones = rankBits(node.bits, pos, true);
    return waveletRank(node.right, c, ones);
  }
}

function waveletAccess(node: WaveletTreeNode, pos: number): number {
  if (node.lo === node.hi) return node.lo;
  const mid = Math.floor((node.lo + node.hi) / 2);
  if (!node.bits[pos]) {
    const zeros = rankBits(node.bits, pos, false);
    return waveletAccess(node.left as WaveletTreeNode, zeros);
  } else {
    const ones = rankBits(node.bits, pos, true);
    return waveletAccess(node.right as WaveletTreeNode, ones);
  }
}
```
