---
name: パラノイド探索 (Paranoid Search)
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(b^d)
summary: 多人数ゲームを「全員が自分だけを狙って結託している」と仮定し二人零和の枠組みに落とし込む探索手法。
---

## 概要

ミニマックス法は二人零和ゲームを前提とするが、麻雀やリスク(Risk)のようなプレイヤーが3人以上いるゲームでは、単純に「各プレイヤーが自分の評価値を最大化する」という**マックスn探索**に拡張すると、評価値の比較ができず枝刈りがほとんど効かなくなる問題が生じる。パラノイド探索は、この難点を回避するための実用的な単純化として、「自分以外の全プレイヤーが結託して自分を負かそうとしている」という悲観的(パラノイア的)な仮定を置く。こうすることで多人数ゲームを実質的な二人零和ゲーム(自分 vs 残り全員)として扱えるようになり、アルファベータ枝刈りをそのまま適用できる。現実の対戦相手が本当に結託するとは限らないため理論上は最適な意思決定ではないが、探索効率と実装の単純さの両立を評価され、多人数ボードゲームAIで広く使われてきた。

## 仕組み

1. 手番を「自分(最大化プレイヤー)」と「自分以外の全員(最小化プレイヤーとして扱う連合)」の2グループに分ける
2. 自分の手番のノードでは、通常のミニマックスと同様に子ノードの評価値の最大値を選ぶ
3. 自分以外のプレイヤーの手番のノードでは、そのプレイヤーが実際にどう考えるかに関わらず、常に「自分の評価値を最小化する」ように行動すると仮定して子ノードの評価値の最小値を選ぶ
4. この単純化により評価値が単調な二人零和探索と同じ構造になるため、[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)がそのまま適用でき、深く読める
5. 実戦では相手同士が必ずしも協力しないため、実際の対局結果との乖離を補うために評価関数側にプレイヤー間の対立度を反映させたり、[エクスペクティマックス法](/algorithms/expectimax)や後述のパラノイア以外の枠組み(ベストリプライ探索等)と使い分ける

## 特性・トレードオフ

- **計算量**: 通常のミニマックス+アルファベータと同じ`O(b^d)`(最良の枝刈り時は`O(b^(d/2))`)。マックスn探索より大幅に効率的
- **仮定の悲観性**: 「全員が結託して自分を狙う」という前提は最悪の場合を想定しており、実際のプレイヤーは互いにも敵対するため、AIが過度に防御的・悲観的な手を選ぶ傾向がある
- **拡張性**: 3人以上のプレイヤーが存在するゲームであれば人数に関わらず二人零和の探索技術(置換表、反復深化等)をそのまま流用できるのが最大の利点
- **使いどころ**: リスク・麻雀・多人数カードゲームなど3人以上が参加するボードゲームAI。より正確なモデル化にはベストリプライ探索や各プレイヤーの利得を個別に保持するマックスn探索が使われる

## 実装例

3人ゲームを想定し、自分(プレイヤー0)の手番では最大化、それ以外の手番(プレイヤー1・2をまとめて「敵陣営」とみなす)では最小化を行う探索を実装する。

```python
from typing import Callable

def paranoid_search(
    node: object,
    depth: int,
    is_terminal: Callable[[object], bool],
    children: Callable[[object], list[object]],
    evaluate: Callable[[object], float],
    current_player: int,  # 0 = 自分, 1..n-1 = 敵陣営とみなす
) -> float:
    """current_player == 0 のときのみ最大化、それ以外は常に最小化する"""
    if depth == 0 or is_terminal(node):
        return evaluate(node)

    next_players = [(current_player + 1) % 3]  # 3人ゲームの手番巡回を想定
    child_nodes = children(node)

    if current_player == 0:
        best = float("-inf")
        for child in child_nodes:
            value = paranoid_search(child, depth - 1, is_terminal, children, evaluate, next_players[0])
            best = max(best, value)
        return best
    else:
        best = float("inf")
        for child in child_nodes:
            value = paranoid_search(child, depth - 1, is_terminal, children, evaluate, next_players[0])
            best = min(best, value)
        return best
```

```typescript
type SearchNode = unknown;

function paranoidSearch(
  node: SearchNode,
  depth: number,
  isTerminal: (n: SearchNode) => boolean,
  children: (n: SearchNode) => SearchNode[],
  evaluate: (n: SearchNode) => number,
  currentPlayer: number, // 0 = 自分, 1..n-1 = 敵陣営とみなす
): number {
  if (depth === 0 || isTerminal(node)) return evaluate(node);

  const nextPlayer = (currentPlayer + 1) % 3; // 3人ゲームの手番巡回を想定
  const childNodes = children(node);

  if (currentPlayer === 0) {
    let best = -Infinity;
    for (const child of childNodes) {
      const value = paranoidSearch(
        child,
        depth - 1,
        isTerminal,
        children,
        evaluate,
        nextPlayer,
      );
      best = Math.max(best, value);
    }
    return best;
  } else {
    let best = Infinity;
    for (const child of childNodes) {
      const value = paranoidSearch(
        child,
        depth - 1,
        isTerminal,
        children,
        evaluate,
        nextPlayer,
      );
      best = Math.min(best, value);
    }
    return best;
  }
}
```
