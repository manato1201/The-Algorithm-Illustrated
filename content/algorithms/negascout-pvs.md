---
name: NegaScout(Principal Variation Search)
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(b^(d/2))(手の順序が良い場合。最悪はO(b^d))
summary: 最初の候補手だけを通常の探索窓で詳しく調べ、残りの手はゼロ幅のヌルウィンドウで「最善手より悪くないか」だけを安く確認し、想定が外れたときだけ再探索する、アルファベータ枝刈りをさらに高速化する探索手法。
---

## 概要

[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)は、手の順序が良ければ`O(b^(d/2))`まで探索範囲を縮められるが、それでも子ノードの1つ1つを同じ`[α, β]`という「通常の幅の窓」で律儀に評価する。しかし反復深化や置換表を使った実装では、多くの局面で「どの手が最善か」の見当が既にある程度ついている。NegaScout(Principal Variation Search、主変化探索とも呼ばれる)は、[ネガマックス法](/algorithms/negamax)の枠組みの上で、最初の(最善と見込まれる)手だけを通常の窓でフルに探索し、残りの手については幅がほぼゼロの「ヌルウィンドウ」で「この手は最善手より悪いはずだ、という仮説を安く検証するだけ」の探索で済ませる。この仮説が外れた(実は最善手より良かった)場合にのみ、その手を通常の窓で改めて再探索する。手の順序付けが優れているほど再探索はまれにしか起きず、アルファベータ枝刈りよりもさらに少ないノード数で同じ結果にたどり着ける。

## 仕組み

1. 最大化ノード(ネガマックス形式では常に自分の視点での最大化)で最初の子ノード(最善と見込まれる、いわゆる主変化候補)を、通常の`(-β, -α)`という**フルウィンドウ**で探索し、その評価値をαの初期候補とする
2. 残りの子ノードは、幅がほぼ1に近い`(-α-1, -α)`という**ヌルウィンドウ**で探索する。このウィンドウでは「その手の評価値がαを超えるかどうか」だけを高速に判定でき、正確な評価値までは求めない
3. ヌルウィンドウ探索の結果がα以下(想定通り最善手より悪い)なら、その手についてはこれ以上調べる必要はなく次の兄弟ノードへ進む
4. ヌルウィンドウ探索の結果がαを超えた(想定が外れ、実はもっと良い手だった)場合は、その手を改めて`(-β, -最良値)`のフルウィンドウで**再探索**し、正確な評価値を得る
5. 全ての子ノードを調べ終えたら、得られた最良値をこのノードの評価値として返す(手の順序が良いほど再探索の発生頻度は低く、全体の探索コストが下がる)

## 特性・トレードオフ

- **計算量**: 最悪ケースの計算量は[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)と同じ`O(b^d)`だが、手の順序付けが良好であれば探索ノード数が実際に減り、`O(b^(d/2))`のオーダーに近づく。ヌルウィンドウ探索は「αを超えるか超えないか」の判定だけなので、フルウィンドウ探索よりも枝刈りが効きやすく高速に終わる
- **手の順序付けへの依存**: 想定した「最善手」が実際には最善でない場合、ヌルウィンドウ探索が失敗して再探索が発生し、その分の探索コストが余分にかかる。したがってNegaScoutは単体で使うよりも、反復深化・置換表・キラーヒューリスティックなど、有望な手を先に並べる仕組みとほぼ必ずセットで使われる
- **[ネガマックス法](/algorithms/negamax)・[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)との関係**: NegaScoutは、ミニマックス法の実装を簡潔にするネガマックス形式と、無駄な枝を刈るアルファベータ枝刈りの両方の上に成り立つ発展形であり、これら2つを理解していないとNegaScout自体の狙いも理解しにくい。実務上は「まずアルファベータ、次にムーブオーダリング、その上でPVS」という積み重ねで実装されることが多い
- **使いどころ**: チェス・将棋・囲碁エンジンなど、実用の二人零和ゲームAIのほぼ標準的な探索フレームワーク。多くの強豪チェスエンジンがネガマックス+アルファベータ+PVSの構成、あるいはこれをさらに拡張した変種(MTD(f)など)を採用している

## 実装例

```python
import math


def negascout(leaves: list[int], depth: int, index: int, alpha: float, beta: float, sign: int) -> float:
    """深さ固定の二分木をNegaScout(PVS)で評価する。leavesは葉の評価値(長さ2^depth)、signは手番を1/-1で表す"""
    if depth == 0:
        return sign * leaves[index]

    children = (index * 2, index * 2 + 1)
    # 最初の子(想定される最善手=主変化)はフルウィンドウで探索する
    best = -negascout(leaves, depth - 1, children[0], -beta, -alpha, -sign)
    alpha = max(alpha, best)

    for child in children[1:]:
        if alpha >= beta:
            break  # 通常のアルファベータ枝刈りと同じカット条件

        # 残りの子はまずヌルウィンドウ[alpha, alpha+1]で「best以下かどうか」だけ安く確認する
        score = -negascout(leaves, depth - 1, child, -alpha - 1, -alpha, -sign)
        if alpha < score < beta:
            # 想定(best以下のはず)が外れた場合のみ、フルウィンドウで正確な値を再探索する
            score = -negascout(leaves, depth - 1, child, -beta, -score, -sign)

        best = max(best, score)
        alpha = max(alpha, best)

    return best


leaves = [3, 5, 2, 9, 12, 5, 23, 7]
depth = 3
result_negascout = negascout(leaves, depth, 0, -math.inf, math.inf, 1)
print(result_negascout)  # 5 -> 通常のネガマックス/アルファベータと同じ結果になる
```

```typescript
function negascout(
  leaves: number[],
  depth: number,
  index: number,
  alpha: number,
  beta: number,
  sign: number,
): number {
  // 深さ固定の二分木をNegaScout(PVS)で評価する。leavesは葉の評価値(長さ2^depth)、signは手番を1/-1で表す
  if (depth === 0) return sign * leaves[index];

  const children = [index * 2, index * 2 + 1];
  // 最初の子(想定される最善手=主変化)はフルウィンドウで探索する
  let best = -negascout(leaves, depth - 1, children[0], -beta, -alpha, -sign);
  alpha = Math.max(alpha, best);

  for (let i = 1; i < children.length; i++) {
    if (alpha >= beta) break; // 通常のアルファベータ枝刈りと同じカット条件

    const child = children[i];
    // 残りの子はまずヌルウィンドウ[alpha, alpha+1]で「best以下かどうか」だけ安く確認する
    let score = -negascout(leaves, depth - 1, child, -alpha - 1, -alpha, -sign);
    if (alpha < score && score < beta) {
      // 想定(best以下のはず)が外れた場合のみ、フルウィンドウで正確な値を再探索する
      score = -negascout(leaves, depth - 1, child, -beta, -score, -sign);
    }

    best = Math.max(best, score);
    alpha = Math.max(alpha, best);
  }

  return best;
}

const leaves = [3, 5, 2, 9, 12, 5, 23, 7];
const result = negascout(leaves, 3, 0, -Infinity, Infinity, 1);
console.log(result); // 5 -> 通常のネガマックス/アルファベータと同じ結果になる
```
