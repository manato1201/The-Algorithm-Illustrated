---
name: 回文木(Eertree / Palindromic Tree)
category: 文字列
subcategory: 回文・圧縮その他
complexity: O(n)
summary: 文字列中に現れる相異なる回文部分文字列すべてをトライ状の木として管理し、追加のたびに新しい回文をO(1)償却で発見・登録するデータ構造。
---

## 概要

[Manacherのアルゴリズム](/algorithms/manacher)は「最も長い回文部分文字列はどこか」という**単一の答え**を線形時間で求めるアルゴリズムだった。一方で、「文字列中に現れる相異なる回文部分文字列を全て列挙したい」「それぞれの回文が何回出現するか数えたい」といった問題には、Manacherのアルゴリズムだけでは対応できない。回文木(Eertree、または Palindromic Tree)は、文字列を1文字ずつ末尾に追加していきながら、その時点までに現れた**相異なる回文部分文字列すべて**をノードとして管理するデータ構造であり、2014年にMikhail Rubinchikらによって考案された。驚くべきことに、文字列の長さ`n`に対して相異なる回文の種類数は最大でも`n`個しかないという事実(後述)に支えられ、全体の構築を線形時間で行える。

## 仕組み

回文木は2本の根を持つ特殊な木構造として実装される。

1. **2つの根ノード**: 長さ`-1`の仮想的な根(奇数長の回文の起点)と、長さ`0`の空文字列を表す根(偶数長の回文の起点)を用意する。それぞれの根から、1文字追加した回文へ向かう辺が伸びていく
2. **サフィックスリンク**: 各ノード(=ある回文)は、「自分より真に短い最長の回文サフィックス(自分自身の末尾から始まる、真部分文字列である最長の回文)」を指すサフィックスリンクを持つ。これはKMP法の失敗関数や[Aho-Corasick法](/algorithms/aho-corasick)のフェイルリンクに相当する仕組みで、新しい回文を効率よく探索するための土台になる
3. **1文字追加する処理**: 文字列の末尾に新しい文字`c`を追加するとき、「現在の文字列全体の末尾に一致する最長の回文」のサフィックスリンクを辿りながら、「その回文の両端に`c`を足すとまた回文になる」ノードを探す。見つかったら、そのノードから`c`を両側に足した新しい回文へ辺を張り(まだ存在しなければ新規ノードを作成する)、これが今回追加した文字を末尾とする最長回文サフィックスになる
4. **なぜ相異なる回文の数はO(n)個か**: 文字列に1文字を追加すると、新しく出現する回文は高々1つしか増えない(「一度の追加で2つ以上の新しい回文が同時に生まれることはない」という回文特有の性質による)。したがって長さ`n`の文字列に含まれる相異なる回文の総数は最大`n`個(+2つの仮想根)に収まり、木のノード数もO(n)で抑えられる
5. **償却計算量がO(1)である理由**: サフィックスリンクを辿る操作は一見1文字あたりO(文字列長)かかりそうに見えるが、「現在の最長回文サフィックスの長さ」がリンクを1回辿るごとに真に短くなり、かつ新規ノード作成のたびにこの長さがたかだか2増えるだけであることから、ならしてO(1)(全体でO(n))に収まることが示せる

## 特性・トレードオフ

- **計算量**: 構築全体でO(n)(アルファベットサイズを`Σ`として、各ノードの子への遷移を配列で持てばO(n)、ハッシュマップで持てばO(n)ただし定数がやや重い)。木の構築後は、各ノードに出現回数のカウンタを持たせれば「相異なる回文の総数」「各回文の出現回数」「最長回文」などをO(n)で全て求められる
- **Manacherのアルゴリズムとの違い**: [Manacherのアルゴリズム](/algorithms/manacher)は「最長の回文」という1つの値を求めることに特化しており、相異なる回文を列挙する用途には向かない。回文木は木構造としてノード数がO(n)に収まる保証があるため、「全ての相異なる回文」を明示的に列挙・カウント・追跡する問題に本質的に適している
- **オンライン性**: 文字列の末尾に1文字ずつ追加しながら構築できる(オンラインアルゴリズム)。ストリーミング的に到着する文字列に対しても、その都度回文の情報を更新できる
- **接尾辞木・接尾辞配列との違い**: [接尾辞配列](/algorithms/suffix-array)や接尾辞木は「文字列の全ての部分文字列」を扱う汎用構造だが、回文木は「回文である部分文字列」だけに特化しているため、ノード数がO(n)に収まるという強い保証を持ち、回文が絡む問題ではより単純かつ高速に動作する
- **使いどころ**: 相異なる回文部分文字列の個数を数える問題、各位置を右端とする回文の個数を数える問題、文字列を回文の並びに分割する動的計画法の高速化、バイオインフォマティクスにおけるDNA配列中のヘアピン構造(回文的な二次構造)の検出など

## 実装例

```python
class EertreeNode:
    __slots__ = ("length", "link", "children")

    def __init__(self, length: int, link: int):
        self.length = length
        self.link = link
        self.children: dict[str, int] = {}


class Eertree:
    def __init__(self):
        # ノード0: 長さ-1の仮想根(奇数長回文の起点)
        # ノード1: 長さ0の根(偶数長回文の起点)
        self.nodes = [EertreeNode(-1, 0), EertreeNode(0, 0)]
        self.s: list[str] = []
        self.last = 1  # 直前までの文字列の末尾を接尾辞とする最長回文のノード

    def _get_suffix_link(self, node_idx: int) -> int:
        n = len(self.s)
        node = self.nodes[node_idx]
        while (
            n - node.length - 2 < 0
            or self.s[n - node.length - 2] != self.s[-1]
        ):
            node_idx = node.link
            node = self.nodes[node_idx]
        return node_idx

    def add_char(self, c: str) -> bool:
        """文字cを追加する。新しい相異なる回文が生まれたらTrueを返す"""
        self.s.append(c)
        cur = self._get_suffix_link(self.last)

        if c in self.nodes[cur].children:
            self.last = self.nodes[cur].children[c]
            return False

        new_length = self.nodes[cur].length + 2
        new_idx = len(self.nodes)
        if new_length == 1:
            link = 1  # 長さ1の回文のサフィックスリンクは空文字列(ノード1)
        else:
            link_source = self._get_suffix_link(self.nodes[cur].link)
            link = self.nodes[link_source].children[c]

        self.nodes.append(EertreeNode(new_length, link))
        self.nodes[cur].children[c] = new_idx
        self.last = new_idx
        return True

    def distinct_palindrome_count(self) -> int:
        return len(self.nodes) - 2  # 2つの仮想根を除く
```

```typescript
class EertreeNode {
  length: number;
  link: number;
  children: Map<string, number> = new Map();

  constructor(length: number, link: number) {
    this.length = length;
    this.link = link;
  }
}

class Eertree {
  nodes: EertreeNode[] = [new EertreeNode(-1, 0), new EertreeNode(0, 0)];
  private s: string[] = [];
  private last = 1; // 直前までの文字列の末尾を接尾辞とする最長回文のノード

  private getSuffixLink(nodeIdx: number): number {
    const n = this.s.length;
    let node = this.nodes[nodeIdx];
    while (
      n - node.length - 2 < 0 ||
      this.s[n - node.length - 2] !== this.s[this.s.length - 1]
    ) {
      nodeIdx = node.link;
      node = this.nodes[nodeIdx];
    }
    return nodeIdx;
  }

  /** 文字cを追加する。新しい相異なる回文が生まれたらtrueを返す */
  addChar(c: string): boolean {
    this.s.push(c);
    const cur = this.getSuffixLink(this.last);

    const existing = this.nodes[cur].children.get(c);
    if (existing !== undefined) {
      this.last = existing;
      return false;
    }

    const newLength = this.nodes[cur].length + 2;
    const newIdx = this.nodes.length;
    let link: number;
    if (newLength === 1) {
      link = 1; // 長さ1の回文のサフィックスリンクは空文字列(ノード1)
    } else {
      const linkSource = this.getSuffixLink(this.nodes[cur].link);
      link = this.nodes[linkSource].children.get(c) as number;
    }

    this.nodes.push(new EertreeNode(newLength, link));
    this.nodes[cur].children.set(c, newIdx);
    this.last = newIdx;
    return true;
  }

  distinctPalindromeCount(): number {
    return this.nodes.length - 2; // 2つの仮想根を除く
  }
}
```
