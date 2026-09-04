---
name: 証明数探索 (Proof-Number Search)
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(1)(1ステップあたり、全体は探索木サイズに依存)
summary: 局面の「勝ちを証明する容易さ」を表す証明数・反証数を使い最も有望なノードから展開するAND/OR木探索。
---

## 概要

詰将棋やコネクトフォーの必勝手順の証明のように「この局面から先手必勝(あるいは後手必勝)であることを証明したい」という問いは、評価値の大小を比較するミニマックス探索とは性質が異なる。証明数探索(Victor AllisとLouis Victor Allisらが1994年頃に発展させた手法)は、各ノードに「あとどれだけの葉ノードを勝ちと確定させれば、このノードの勝ちを証明できるか」を表す**証明数**と、その逆に「負けを証明するのに必要な数」を表す**反証数**を割り当て、常に最も証明数(または反証数)が小さい、つまり最も証明に近いノードを優先して展開していく。深さ優先のミニマックスと違い探索順序を動的に選べるため、必至や必勝手順のような「勝敗が明確に確定する」問題を効率よく解くのに適している。

## 仕組み

1. ゲーム木をAND/OR木(OR: 自分が手を選べるノード、AND: 相手が手を選べるノード)として捉える
2. 各ノードに証明数(pn: 証明に必要な残り葉数の下限)と反証数(dn: 反証に必要な残り葉数の下限)を割り当てる。末端では、勝ち確定ノードは`pn=0, dn=∞`、負け確定ノードは`pn=∞, dn=0`、未展開ノードは`pn=1, dn=1`で初期化する
3. OR(自分)ノードの証明数は子の**最小**証明数、反証数は子の**合計**反証数として計算する(1つでも証明できる子があれば親も証明できる)。ANDノードはその逆(証明数は合計、反証数は最小)
4. ルートから、証明数が最も小さい子をたどって「最も証明しやすそうな」未展開の葉(**最も証拠能力のあるノード, Most Proving Node**)を選び、それを展開する
5. 新しく生まれた子ノードの値を末端から親へ伝播(バックアップ)し、証明数・反証数を再計算する。ルートの証明数が0になれば証明成功、反証数が0になれば反証成功として探索を終了する

## 特性・トレードオフ

- **計算量**: 1回のイテレーション(最証明ノードの選択・展開・逆伝播)は`O(木の深さ)`。全体の探索量は問題依存で、証明が容易な局面ほど早く終わる
- **深さ優先探索との違い**: 固定深さを均等に読むミニマックスと異なり、証明数探索は「証明に近い」枝を深く、それ以外を浅く読むため、探索の重心が動的に偏る不均一な木を作る
- **メモリコスト**: 証明数・反証数を全ノードで管理するため、ミニマックス系の探索よりメモリ使用量が大きくなりやすい。実装では置換表と組み合わせて重複局面をまとめる工夫が一般的
- **使いどころ**: 詰将棋ソルバー、コネクトフォーやオセロの完全解析、囲碁の詰碁ソルバーなど「勝敗の証明」自体が目的の探索。評価値による優劣判定が目的のミニマックスとは使い分ける

## 実装例

単純化のため、勝敗のみを持つ二分木(OR/ANDが交互に現れる)に対して証明数・反証数を計算し、最証明ノードを選んで展開するループの骨格を示す。

```python
from dataclasses import dataclass, field

INFINITY = float("inf")


@dataclass
class PnNode:
    is_or_node: bool  # True: OR(自分の手番), False: AND(相手の手番)
    children: list["PnNode"] = field(default_factory=list)
    proof: int = 1
    disproof: int = 1
    expanded: bool = False
    is_leaf_result: bool | None = None  # 末端での勝敗が確定済みならTrue/False


def update_numbers(node: PnNode) -> None:
    if not node.children:
        if node.is_leaf_result is True:
            node.proof, node.disproof = 0, INFINITY
        elif node.is_leaf_result is False:
            node.proof, node.disproof = INFINITY, 0
        return

    if node.is_or_node:
        node.proof = min(c.proof for c in node.children)
        node.disproof = sum(c.disproof for c in node.children)
    else:
        node.proof = sum(c.proof for c in node.children)
        node.disproof = min(c.disproof for c in node.children)


def select_most_proving_child(node: PnNode) -> PnNode:
    """OR節点は証明数最小、AND節点は反証数最小の子をたどる"""
    if node.is_or_node:
        return min(node.children, key=lambda c: c.proof)
    return min(node.children, key=lambda c: c.disproof)
```

```typescript
const INFINITY = Number.POSITIVE_INFINITY;

interface PnNode {
  isOrNode: boolean; // true: OR(自分の手番), false: AND(相手の手番)
  children: PnNode[];
  proof: number;
  disproof: number;
  isLeafResult?: boolean; // 末端での勝敗が確定済みならtrue/false
}

function updateNumbers(node: PnNode): void {
  if (node.children.length === 0) {
    if (node.isLeafResult === true) {
      node.proof = 0;
      node.disproof = INFINITY;
    } else if (node.isLeafResult === false) {
      node.proof = INFINITY;
      node.disproof = 0;
    }
    return;
  }

  if (node.isOrNode) {
    node.proof = Math.min(...node.children.map((c) => c.proof));
    node.disproof = node.children.reduce((sum, c) => sum + c.disproof, 0);
  } else {
    node.proof = node.children.reduce((sum, c) => sum + c.proof, 0);
    node.disproof = Math.min(...node.children.map((c) => c.disproof));
  }
}

function selectMostProvingChild(node: PnNode): PnNode {
  // OR節点は証明数最小、AND節点は反証数最小の子をたどる
  if (node.isOrNode) {
    return node.children.reduce((best, c) => (c.proof < best.proof ? c : best));
  }
  return node.children.reduce((best, c) => (c.disproof < best.disproof ? c : best));
}
```
