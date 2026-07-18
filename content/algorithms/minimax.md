---
name: ミニマックス法
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(b^d)
summary: 自分の得点を最大化し相手の得点を最小化する交互再帰探索。二人零和ゲームAIの基礎。
---

## 概要

三目並べやチェスのような「自分が得すれば相手が損する」二人零和ゲームでは、相手も自分と同じくらい賢く最善手を指してくると仮定するのが安全な戦略になる。ミニマックス法は、自分の手番では評価値を最大化する手を、相手の手番では評価値を最小化する手を選ぶという単純なルールを、ゲーム木の末端(勝敗が決まる局面、または探索の深さ制限)まで再帰的に適用する。「相手が最善を尽くしても防げない最良の結果」を保証する、ゲームAIの最も基本的な意思決定アルゴリズムである。

## 仕組み

1. 現在の局面から指せる全ての手を洗い出し、それぞれの手を指した後の局面を子ノードとするゲーム木を(概念的に)作る
2. 末端局面(ゲーム終了、または探索の深さ制限に達した局面)に評価関数で得点をつける。自分に有利なら高い値、相手に有利なら低い値になるよう設計する
3. 木を末端から根に向かって遡りながら、自分の手番のノードでは子ノードの評価値の**最大値**を、相手の手番のノードでは子ノードの評価値の**最小値**を、そのノードの評価値として採用する(相手が自分にとって最悪の手を選ぶと仮定する)
4. 根まで遡って得られた評価値が最大になる手が、現在の最善手になる

## 特性・トレードオフ

- **計算量**: 分岐数(1手あたりの選択肢数)を`b`、探索の深さを`d`とすると`O(b^d)`。チェスのように`b`が大きいゲームでは深く読めず、実用にはアルファベータ枝刈りとの併用がほぼ必須
- **前提条件**: 二人零和(片方の得は片方の損)かつ完全情報(隠れた情報がない)ゲームを前提とする。運の要素があるゲームには[エクスペクティマックス法](/algorithms/expectimax)、非零和ゲームには別の枠組み([ナッシュ均衡](/algorithms/nash-equilibrium)等)が必要
- **評価関数への依存**: 探索を途中で打ち切る場合、末端局面の「良さ」を数値化する評価関数の精度がAIの強さを直接左右する。完全読み切りができないゲームでは評価関数の設計が本質的に重要になる
- **使いどころ**: 三目並べ・オセロ・チェス・将棋などのボードゲームAIの理論的基盤。[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)や反復深化と組み合わせて実用化される

## 実装例

```python
def minimax(leaves: list[int], depth: int, index: int, is_maximizing: bool) -> int:
    """深さ固定の二分木を末端から根に向かって評価する。leavesは葉の評価値(長さ2^depth)"""
    if depth == 0:
        return leaves[index]

    left = minimax(leaves, depth - 1, index * 2, not is_maximizing)
    right = minimax(leaves, depth - 1, index * 2 + 1, not is_maximizing)
    return max(left, right) if is_maximizing else min(left, right)
```

```typescript
// 深さ固定の二分木を末端から根に向かって評価する。leavesは葉の評価値(長さ2^depth)
function minimax(leaves: number[], depth: number, index: number, isMaximizing: boolean): number {
  if (depth === 0) return leaves[index];

  const left = minimax(leaves, depth - 1, index * 2, !isMaximizing);
  const right = minimax(leaves, depth - 1, index * 2 + 1, !isMaximizing);
  return isMaximizing ? Math.max(left, right) : Math.min(left, right);
}
```

```cpp
#include <vector>
#include <algorithm>

// 深さ固定の二分木を末端から根に向かって評価する。leavesは葉の評価値(長さ2^depth)
int minimax(const std::vector<int>& leaves, int depth, int index, bool isMaximizing) {
    if (depth == 0) return leaves[index];

    int left = minimax(leaves, depth - 1, index * 2, !isMaximizing);
    int right = minimax(leaves, depth - 1, index * 2 + 1, !isMaximizing);
    return isMaximizing ? std::max(left, right) : std::min(left, right);
}
```

```rust
// 深さ固定の二分木を末端から根に向かって評価する。leavesは葉の評価値(長さ2^depth)
fn minimax(leaves: &[i32], depth: u32, index: usize, is_maximizing: bool) -> i32 {
    if depth == 0 {
        return leaves[index];
    }

    let left = minimax(leaves, depth - 1, index * 2, !is_maximizing);
    let right = minimax(leaves, depth - 1, index * 2 + 1, !is_maximizing);
    if is_maximizing {
        left.max(right)
    } else {
        left.min(right)
    }
}
```

```csharp
// 深さ固定の二分木を末端から根に向かって評価する。leavesは葉の評価値(長さ2^depth)
static int Minimax(int[] leaves, int depth, int index, bool isMaximizing)
{
    if (depth == 0) return leaves[index];

    int left = Minimax(leaves, depth - 1, index * 2, !isMaximizing);
    int right = Minimax(leaves, depth - 1, index * 2 + 1, !isMaximizing);
    return isMaximizing ? Math.Max(left, right) : Math.Min(left, right);
}
```
