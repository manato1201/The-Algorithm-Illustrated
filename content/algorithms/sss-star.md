---
name: SSS*アルゴリズム
category: 探索
subcategory: グラフ・経路探索
complexity: O(b^d)(最悪ケース、bは分岐数、dは深さ。実測ではミニマックス探索木のノード展開数がalpha-beta法以下)
summary: ゲーム木を「最良の解の候補から順に確定させていく」最良優先探索として扱い、alpha-beta法と同じ結果を、証明可能に同じかそれより少ないノード展開で求める状態空間探索アルゴリズム。
---

## 概要

ミニマックス探索とalpha-beta法は、ゲーム木を深さ優先でたどりながら枝刈りを行う。1979年にGeorge Stockmanが発表したSSS*(State Space Search、あるいはStockmanのアルゴリズムの略とされる)は、ゲーム木の探索を深さ優先ではなく**最良優先探索(best-first search)として定式化し直す**という発想の転換によって、alpha-beta法と全く同じ最終結果(最善手)を、**理論的に証明可能な形でalpha-beta法以下のノード展開数**で求められることを示した。グラフ探索の最良優先探索(A*やbest-first search)の考え方をゲーム木・AND-ORグラフの探索に応用した代表例として、ゲーム木探索と状態空間探索の橋渡しをするアルゴリズムに位置づけられる。

## 仕組み

1. ゲーム木を「MAXノード(自分の手番、最大値を選ぶ)」と「MINノード(相手の手番、最小値を選ぶ)」からなるAND-ORグラフとみなす
2. 探索の状態を「(現在検討しているノード, そのノードに残っている未展開の子ノード集合, 暫定的な評価値の上界)」という**"solution tree"の断片(部分解)**として表現し、これらをすべて優先度付きキュー(OPENリスト)で管理する
3. 各状態に対して、その部分解が持つ評価値の上界(merit値)を計算し、**merit値が最も高い(有望な)部分解を優先的に展開する**(A*が`f`値最小のノードを優先するのと対称的に、SSS*はゲームの評価値なので最大のものを優先する)
4. MAXノードでは、子ノードのうち1つを選んで深く探索を進める。MINノードでは、**全ての子ノードの評価値がそろって初めてそのノードの値が確定する**ため、まだ評価されていない兄弟ノードがあればそれらも探索候補としてキューに積む
5. ルートノードの値が確定した(それ以上良い可能性のある部分解がキューに残っていない)時点で探索を終了し、確定した最善手を返す
6. 途中で「今の暫定評価値より良くなり得ない」と判明した部分解は、A*探索と同様にキューから捨てられ、それ以上展開されない(ゲーム木のalpha-beta法の枝刈りに相当する効果を、最良優先探索の枠組みの中で自然に実現している)

## 特性・トレードオフ

- **計算量**: 最悪ケースの計算量オーダーはalpha-beta法と同じくO(b^d)だが、**Stockmanにより「SSS*が展開するノード数は、同じゲーム木に対するalpha-beta法が展開するノード数を超えない」ことが数学的に証明されている**。実測でも同等か少ないノード数で済むことが多い
- **メモリ消費が大きい**: alpha-beta法が深さ優先で再帰呼び出しのスタック分のメモリしか使わないのに対し、SSS*は最良優先探索のため多数の部分解を同時にOPENリストに保持する必要があり、メモリ使用量が大幅に増える。この実用上の欠点が、探索ノード数の優位性にもかかわらずゲームAI実装での普及を妨げた大きな要因
- _*DUAL*・MTD(f)との関係_*: SSS*が抱えるメモリ問題を緩和する目的で、後にAlpha-Beta法の反復深化的な使い方であるMTD(f)などが実用上はより広く採用されるようになった。SSS*とalpha-beta法の等価性は、後の研究(Plaat, Schaeffer, Pijls, de Bruinら)によって「メモリ拘束版のalpha-beta法(MT-SSS*)」として再定式化され、実用的なメモリ使用量でSSS*相当の探索を行えることが示されている
- **状態空間探索としての一般性**: 単純な二人ゲームだけでなく、AND-ORグラフとして表現できる問題(定理証明、計画問題など)全般に理論上適用できる最良優先型の探索の枠組みを提供する
- **使いどころ**: ゲーム木探索アルゴリズムの理論的な下界・比較研究、alpha-beta法のノード展開効率を評価するベンチマーク、メモリに余裕がある環境での探索効率最優先のゲームAI(実務ではメモリ効率の良いMTD(f)や反復深化alpha-beta法が主流)

## 実装例

```python
import heapq
from dataclasses import dataclass, field
from typing import Callable

Node = str


@dataclass(order=True)
class PartialSolution:
    merit: float
    node: Node = field(compare=False)
    status: str = field(compare=False)  # "live"(未確定) or "solved"


def sss_star(
    root: Node,
    children_fn: Callable[[Node], list[Node]],
    is_max_node: Callable[[Node], bool],
    is_leaf: Callable[[Node], bool],
    evaluate: Callable[[Node], float],
) -> float:
    """簡略化したSSS*: 最良優先探索でゲーム木の値を確定させる"""
    # OPENリストはmerit値の降順(最大値優先)で取り出したいので符号を反転して管理する
    open_heap: list[PartialSolution] = [PartialSolution(-float("inf"), root, "live")]
    open_heap[0].merit = float("inf")
    heapq.heapify(open_heap)
    best_children: dict[Node, float] = {}

    while open_heap:
        # 最大のmerit値を持つ部分解を取り出す(ヒープは最小値優先のため符号反転)
        current = max(open_heap, key=lambda s: s.merit)
        open_heap.remove(current)
        heapq.heapify(open_heap)

        node, status = current.node, current.status

        if node == root and status == "solved":
            return current.merit

        if is_leaf(node):
            heapq.heappush(open_heap, PartialSolution(evaluate(node), node, "solved"))
            heapq.heapify(open_heap)
            continue

        if is_max_node(node):
            if status == "live":
                for child in children_fn(node):
                    heapq.heappush(open_heap, PartialSolution(current.merit, child, "live"))
            else:
                best = best_children.get(node, -float("inf"))
                best = max(best, current.merit)
                best_children[node] = best
                heapq.heappush(open_heap, PartialSolution(best, node, "solved"))
        else:
            children = children_fn(node)
            if status == "live":
                heapq.heappush(open_heap, PartialSolution(current.merit, children[0], "live"))
            else:
                heapq.heappush(open_heap, PartialSolution(min(current.merit, current.merit), node, "solved"))

    return 0.0
```

```typescript
type Node = string;

interface PartialSolution {
  merit: number;
  node: Node;
  status: "live" | "solved";
}

function ssStar(
  root: Node,
  childrenFn: (n: Node) => Node[],
  isMaxNode: (n: Node) => boolean,
  isLeaf: (n: Node) => boolean,
  evaluate: (n: Node) => number,
): number {
  let open: PartialSolution[] = [
    { merit: Infinity, node: root, status: "live" },
  ];
  const bestChildren = new Map<Node, number>();

  while (open.length > 0) {
    open.sort((a, b) => b.merit - a.merit);
    const current = open.shift()!;
    const { node, status } = current;

    if (node === root && status === "solved") {
      return current.merit;
    }

    if (isLeaf(node)) {
      open.push({ merit: evaluate(node), node, status: "solved" });
      continue;
    }

    if (isMaxNode(node)) {
      if (status === "live") {
        for (const child of childrenFn(node)) {
          open.push({ merit: current.merit, node: child, status: "live" });
        }
      } else {
        const best = Math.max(
          bestChildren.get(node) ?? -Infinity,
          current.merit,
        );
        bestChildren.set(node, best);
        open.push({ merit: best, node, status: "solved" });
      }
    } else {
      const children = childrenFn(node);
      if (status === "live") {
        open.push({ merit: current.merit, node: children[0], status: "live" });
      } else {
        open.push({ merit: current.merit, node, status: "solved" });
      }
    }
  }

  return 0;
}
```
