---
name: アルファベータ枝刈り
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(b^(d/2))(最良順序時)
summary: ミニマックス法の探索木のうち、結果に影響しない枝を刈り取ることで実質的な探索範囲を半減させる高速化手法。
---

## 概要

[ミニマックス法](/algorithms/minimax)は正しい答えを出すが、分岐数`b`と深さ`d`に対して`O(b^d)`もの局面を律儀に全て評価するため、チェスのような分岐の多いゲームでは深く読めない。しかしよく考えると、「既に見つけている選択肢より確実に悪いとわかった枝」をそれ以上詳しく調べる必要はない——相手が絶対に選ばないとわかっている手を、自分がどれだけ詳しく分析しても結果に影響しないからだ。アルファベータ枝刈りは、探索中に維持する2つの値(α: 自分にとってこれまでに保証できる最良値の下限、β: 相手にとってこれまでに保証できる最良値の上限)を使って、この「調べるだけ無駄な枝」を検出し、探索そのものを打ち切る。

## 仕組み

1. 深さ優先でミニマックス探索を行いながら、経路上でα(最大化側が確保している最良値)とβ(最小化側が確保している最良値)を引き継ぐ
2. 最大化ノードでは子ノードを順に評価し、得られた値でαを更新する。もし`α ≥ β`になったら、そのノードの残りの子はこれ以上調べても意味がない(相手が既にこの枝を選ばせないと決めているため)ので打ち切る(**βカット**)
3. 最小化ノードでも対称に、βを更新しながら`α ≥ β`になった時点で残りの子を打ち切る(**αカット**)
4. 探索が完了した時点での評価値と最善手は、枝刈りなしのミニマックス法と**完全に同じ**になる(結果に影響する枝は一切刈らないため)

## 特性・トレードオフ

- **計算量**: 最悪の場合でも`O(b^d)`(ミニマックス法と同じ)だが、手の順序が良い(有望な手を先に調べる)場合は`O(b^(d/2))`まで改善する——同じ計算資源で実質的に2倍の深さまで読めることを意味する
- **結果を変えない枝刈り**: 近似ではなく、正確に「調べる必要のない部分」だけを除外する厳密な最適化。ミニマックス法と全く同じ最善手を、より少ない探索で得られる
- **手の順序への依存**: 効果の大きさは「先に良い手を試すほど早くカットが効く」という性質に強く依存する。実装では、前回の探索結果や簡易評価でまず手を並べ替えてから探索する工夫(ムーブオーダリング)が定石になっている
- **使いどころ**: 実用的なボードゲームAI(チェス・将棋エンジン等)のほぼすべてがミニマックス法の素の実装ではなくアルファベータ枝刈り版を使う。反復深化・置換表(過去に調べた局面の記憶)と組み合わせるのが標準的

## 実装例

```python
import math


def alpha_beta(leaves: list[int], depth: int, index: int, alpha: float, beta: float, is_maximizing: bool) -> int:
    """深さ固定の二分木をα/βで枝刈りしながら評価する。leavesは葉の評価値(長さ2^depth)"""
    if depth == 0:
        return leaves[index]

    if is_maximizing:
        value = -math.inf
        for child in (index * 2, index * 2 + 1):
            value = max(value, alpha_beta(leaves, depth - 1, child, alpha, beta, False))
            alpha = max(alpha, value)
            if alpha >= beta:
                break  # betaカット: 相手が既にこの枝を選ばせない
        return value
    else:
        value = math.inf
        for child in (index * 2, index * 2 + 1):
            value = min(value, alpha_beta(leaves, depth - 1, child, alpha, beta, True))
            beta = min(beta, value)
            if alpha >= beta:
                break  # alphaカット
        return value
```

```typescript
// 深さ固定の二分木をα/βで枝刈りしながら評価する。leavesは葉の評価値(長さ2^depth)
function alphaBeta(leaves: number[], depth: number, index: number, alpha: number, beta: number, isMaximizing: boolean): number {
  if (depth === 0) return leaves[index];

  if (isMaximizing) {
    let value = -Infinity;
    for (const child of [index * 2, index * 2 + 1]) {
      value = Math.max(value, alphaBeta(leaves, depth - 1, child, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break; // betaカット: 相手が既にこの枝を選ばせない
    }
    return value;
  } else {
    let value = Infinity;
    for (const child of [index * 2, index * 2 + 1]) {
      value = Math.min(value, alphaBeta(leaves, depth - 1, child, alpha, beta, true));
      beta = Math.min(beta, value);
      if (alpha >= beta) break; // alphaカット
    }
    return value;
  }
}
```

```cpp
#include <vector>
#include <algorithm>
#include <limits>

// 深さ固定の二分木をα/βで枝刈りしながら評価する。leavesは葉の評価値(長さ2^depth)
int alphaBeta(const std::vector<int>& leaves, int depth, int index, int alpha, int beta, bool isMaximizing) {
    if (depth == 0) return leaves[index];

    if (isMaximizing) {
        int value = std::numeric_limits<int>::min();
        for (int child : {index * 2, index * 2 + 1}) {
            value = std::max(value, alphaBeta(leaves, depth - 1, child, alpha, beta, false));
            alpha = std::max(alpha, value);
            if (alpha >= beta) break; // betaカット
        }
        return value;
    } else {
        int value = std::numeric_limits<int>::max();
        for (int child : {index * 2, index * 2 + 1}) {
            value = std::min(value, alphaBeta(leaves, depth - 1, child, alpha, beta, true));
            beta = std::min(beta, value);
            if (alpha >= beta) break; // alphaカット
        }
        return value;
    }
}
```

```rust
// 深さ固定の二分木をα/βで枝刈りしながら評価する。leavesは葉の評価値(長さ2^depth)
fn alpha_beta(leaves: &[i32], depth: u32, index: usize, mut alpha: i32, mut beta: i32, is_maximizing: bool) -> i32 {
    if depth == 0 {
        return leaves[index];
    }

    if is_maximizing {
        let mut value = i32::MIN;
        for child in [index * 2, index * 2 + 1] {
            value = value.max(alpha_beta(leaves, depth - 1, child, alpha, beta, false));
            alpha = alpha.max(value);
            if alpha >= beta {
                break; // betaカット
            }
        }
        value
    } else {
        let mut value = i32::MAX;
        for child in [index * 2, index * 2 + 1] {
            value = value.min(alpha_beta(leaves, depth - 1, child, alpha, beta, true));
            beta = beta.min(value);
            if alpha >= beta {
                break; // alphaカット
            }
        }
        value
    }
}
```

```csharp
// 深さ固定の二分木をα/βで枝刈りしながら評価する。leavesは葉の評価値(長さ2^depth)
static int AlphaBeta(int[] leaves, int depth, int index, int alpha, int beta, bool isMaximizing)
{
    if (depth == 0) return leaves[index];

    if (isMaximizing)
    {
        int value = int.MinValue;
        foreach (var child in new[] { index * 2, index * 2 + 1 })
        {
            value = Math.Max(value, AlphaBeta(leaves, depth - 1, child, alpha, beta, false));
            alpha = Math.Max(alpha, value);
            if (alpha >= beta) break; // betaカット
        }
        return value;
    }
    else
    {
        int value = int.MaxValue;
        foreach (var child in new[] { index * 2, index * 2 + 1 })
        {
            value = Math.Min(value, AlphaBeta(leaves, depth - 1, child, alpha, beta, true));
            beta = Math.Min(beta, value);
            if (alpha >= beta) break; // alphaカット
        }
        return value;
    }
}
```
