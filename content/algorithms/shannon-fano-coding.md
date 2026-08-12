---
name: シャノン・ファノ符号(Shannon-Fano Coding)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: 出現頻度でソートした記号列を累積確率がほぼ半分になる位置で再帰的に二分し、トップダウンに可変長符号を構成する貪欲的な符号化法。
---

## 概要

[ハフマン符号化](/algorithms/huffman-coding)がボトムアップ(頻度の低い記号同士を結合していく)に符号木を組み立てるのに対し、シャノン・ファノ符号は逆にトップダウンで木を組み立てる、より古い可変長符号化法。1948年にクロード・シャノンが、1949年にロバート・ファノがそれぞれ独立に考案した(名前の由来)。「記号を頻度順に並べ、累積確率がちょうど半分になるあたりで2つのグループに分割する」という操作を再帰的に繰り返すことで符号を作る、直感的でわかりやすい貪欲法だが、**ハフマン符号ほど最適ではない**という弱点があり、現在では歴史的・教育的な位置づけの手法になっている。

## 仕組み

1. 全ての記号を、出現頻度(または確率)の**降順**にソートする
2. ソートされた記号列を、**累積頻度がなるべく半分ずつになる位置**で2つのグループに分割する
3. 上位グループに属する記号には符号の先頭ビットとして`0`を、下位グループには`1`を割り当てる
4. それぞれのグループに対して、グループ内の記号が1つになるまで2〜3を再帰的に繰り返す
5. 各記号について、根から辿った0/1の列がその記号の符号になる

**分割位置の選び方が貪欲法である理由**: 各分割ステップで「その時点で最も均等に近い分割点」を局所的に選ぶだけで、それ以降の分割が全体としてどうなるかは考慮しない。この「今できる最善の分割を貪欲に選ぶ」という近視眼的な戦略が、シャノン・ファノ符号の特徴であり、同時に弱点でもある。

## 特性・トレードオフ

- **計算量**: O(n log n)(ソートが支配的)。木の構築自体は再帰的な分割でO(n)程度
- **ハフマン符号との違い**: ハフマン符号は「頻度の低い2つを常に先に結合する」というボトムアップな貪欲法で、これは各記号の符号長が理論上の情報量(エントロピー)にできる限り近づくことが数学的に証明されている**最適**な構成法。一方シャノン・ファノ符号のトップダウンな二分割は、局所的に「今この時点で最も均等な分割」を選んでも、木全体で見たときに最適な符号長の割り当てにならない場合がある
- **シャノン・ファノ符号が最適とは限らない理由(反例)**: 頻度が`{A:0.35, B:0.17, C:0.17, D:0.16, E:0.15}`のような例で、シャノン・ファノ符号のトップダウン分割は「Aだけ」と「B,C,D,E」という分割(累積0.35 vs 0.65)を選びがちだが、ハフマン符号は逆に頻度の低いD,Eを先に結合するため、記号によっては符号長が1ビット短くなる組み合わせが生まれる。このように、**各分割ステップでの局所最適な二分割の積み重ねが、木全体での符号長の総和(=平均符号長)を最小化する保証にはならない**——これが貪欲法としてのシャノン・ファノ符号の限界であり、ハフマン符号のような「各ステップの局所最適な結合が全体最適の符号を導く」というマトロイド的な構造を持たない
- **接頭辞性は保たれる**: 分割の仕方によらず、木構造から符号を生成する限り、ある記号の符号が別の記号の符号の接頭辞になることはないため、[ハフマン符号化](/algorithms/huffman-coding)と同様に符号の区切りを別途記録しなくても復元できる
- **使いどころ**: 現在の実務では圧縮率で優るハフマン符号(あるいはさらに進んだ算術符号化)に置き換えられており実用上使われることは少ないが、情報理論の教育において「トップダウンな貪欲分割」と「ボトムアップな貪欲結合」の違いを対比する題材として、また一部のレガシーな圧縮フォーマット(初期のJPEG規格の一部など)で歴史的に採用されてきた

## 実装例

```python
from dataclasses import dataclass, field


@dataclass
class SFNode:
    char: str | None = None
    left: "SFNode | None" = None
    right: "SFNode | None" = None


def _split(symbols: list[tuple[str, int]]) -> SFNode:
    if len(symbols) == 1:
        return SFNode(char=symbols[0][0])

    total = sum(freq for _, freq in symbols)
    running = 0
    best_idx = 1
    best_diff = float("inf")
    # 累積頻度が全体の半分に最も近くなる分割位置を探す
    for i in range(1, len(symbols)):
        running += symbols[i - 1][1]
        diff = abs(2 * running - total)
        if diff < best_diff:
            best_diff = diff
            best_idx = i

    left = _split(symbols[:best_idx])
    right = _split(symbols[best_idx:])
    return SFNode(left=left, right=right)


def build_shannon_fano_tree(freqs: dict[str, int]) -> SFNode:
    symbols = sorted(freqs.items(), key=lambda p: p[1], reverse=True)
    return _split(symbols)


def build_codes(root: SFNode) -> dict[str, str]:
    codes: dict[str, str] = {}

    def dfs(node: SFNode | None, prefix: str) -> None:
        if node is None:
            return
        if node.char is not None:
            codes[node.char] = prefix or "0"
            return
        dfs(node.left, prefix + "0")
        dfs(node.right, prefix + "1")

    dfs(root, "")
    return codes


def encode(text: str, codes: dict[str, str]) -> str:
    return "".join(codes[c] for c in text)
```

```typescript
interface SFNode {
  char: string | null;
  left: SFNode | null;
  right: SFNode | null;
}

function split(symbols: [string, number][]): SFNode {
  if (symbols.length === 1) {
    return { char: symbols[0][0], left: null, right: null };
  }

  const total = symbols.reduce((sum, [, freq]) => sum + freq, 0);
  let running = 0;
  let bestIdx = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < symbols.length; i++) {
    running += symbols[i - 1][1];
    const diff = Math.abs(2 * running - total);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  const left = split(symbols.slice(0, bestIdx));
  const right = split(symbols.slice(bestIdx));
  return { char: null, left, right };
}

function buildShannonFanoTree(freqs: Map<string, number>): SFNode {
  const symbols = [...freqs.entries()].sort((a, b) => b[1] - a[1]);
  return split(symbols);
}

function buildCodes(root: SFNode): Map<string, string> {
  const codes = new Map<string, string>();
  function dfs(node: SFNode | null, prefix: string): void {
    if (!node) return;
    if (node.char !== null) {
      codes.set(node.char, prefix || "0");
      return;
    }
    dfs(node.left, prefix + "0");
    dfs(node.right, prefix + "1");
  }
  dfs(root, "");
  return codes;
}

function encode(text: string, codes: Map<string, string>): string {
  return [...text].map((c) => codes.get(c)!).join("");
}
```
