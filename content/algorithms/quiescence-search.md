---
name: 静止探索 (Quiescence Search)
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(b_q^d_q)(戦術的な手のみに分岐を絞った追加探索)
summary: 探索を打ち切る末端が駒の取り合いの最中でないか確認し、局面が「静止」するまで戦術的な手だけを延長探索する手法。
---

## 概要

固定の深さでミニマックス探索を打ち切ると、たまたま探索の限界がちょうど「駒を取られる直前」の局面に当たった場合、評価関数はまだ盤上にあるその駒を守れる駒として評価してしまい、実際には次の1手で失われるはずの駒的価値を誤って高く見積もる。この現象は**地平線効果(horizon effect)**と呼ばれる。静止探索は、通常探索の末端に到達した際、その局面が取り合いや王手のような不安定(non-quiet)な状態でないかを確認し、不安定であればキャプチャ(駒取り)や王手など戦術的に重要な手だけに手の候補を絞ってさらに探索を延長する。これにより「駒得したように見えたが実は取り返されて損をする」といった評価の見誤りを防ぎ、より信頼できる評価値で通常探索を打ち切れるようにする。

## 仕組み

1. 通常のアルファベータ探索が指定の深さに到達したら、まずその局面の**静的評価値**(何もしない場合の評価関数の値)を求める
2. 静的評価値をアルファベータの下限として使い(**スタンドパット**)、これが既にベータ値以上ならこの時点でカットオフする(これ以上調べても損はしないと判断できるため)
3. 局面から生成できる手のうち、キャプチャ・プロモーション・王手(および王手回避)など「戦術的」な手だけを候補として抽出する(静かな手は対象外にすることで探索範囲を絞る)
4. それらの手を1手ずつ試し、再帰的に静止探索を続ける。これを、それ以上有効な戦術手がない(局面が「静止」した)地点まで繰り返す
5. 最終的に得られた評価値を通常探索の末端評価値として使うことで、駒の取り合いの途中で探索を打ち切ることによる誤評価を防ぐ

## 特性・トレードオフ

- **計算量**: 通常探索よりずっと分岐数を絞る(戦術手のみ)ため木は浅く済むことが多いが、局面によっては連鎖的な取り合いが続き探索コストが読みにくい。実装では最大延長深さの上限を設けることが多い
- **地平線効果の緩和**: 固定深さ打ち切りだけの探索に比べ評価の信頼性が大きく向上する。特にチェスや将棋のような駒取りが頻発するゲームでは事実上必須の技術
- **スタンドパットの前提**: 「何もしない手(パス)」を選択肢に含めるスタンドパットは、ツークツワンク(動くこと自体が不利になる局面、チェスの終盤等)がある場合には正しく機能しないことがある
- **使いどころ**: [アルファベータ枝刈り](/algorithms/alpha-beta-pruning)や[ネガスカウト](/algorithms/negascout-pvs)など深さ優先のゲーム木探索全般。[null-move pruning](/algorithms/null-move-pruning)などの前方枝刈りと組み合わせて実用エンジンを構成する

## 実装例

キャプチャ手のみを対象に静止探索を行う、ネガマックス形式の骨格を示す。

```python
from typing import Callable

def quiescence_search(
    node: object,
    alpha: float,
    beta: float,
    evaluate: Callable[[object], float],
    generate_captures: Callable[[object], list[object]],
    apply_move: Callable[[object, object], object],
) -> float:
    stand_pat = evaluate(node)  # 何もしなかった場合の静的評価値
    if stand_pat >= beta:
        return beta  # スタンドパットで十分ならこれ以上調べる必要がない
    alpha = max(alpha, stand_pat)

    for move in generate_captures(node):  # 駒を取る手だけに絞って延長探索
        child = apply_move(node, move)
        score = -quiescence_search(child, -beta, -alpha, evaluate, generate_captures, apply_move)
        if score >= beta:
            return beta
        alpha = max(alpha, score)

    return alpha
```

```typescript
function quiescenceSearch(
  node: unknown,
  alpha: number,
  beta: number,
  evaluate: (n: unknown) => number,
  generateCaptures: (n: unknown) => unknown[],
  applyMove: (n: unknown, m: unknown) => unknown,
): number {
  const standPat = evaluate(node); // 何もしなかった場合の静的評価値
  if (standPat >= beta) return beta; // スタンドパットで十分ならこれ以上調べる必要がない
  alpha = Math.max(alpha, standPat);

  for (const move of generateCaptures(node)) {
    // 駒を取る手だけに絞って延長探索
    const child = applyMove(node, move);
    const score = -quiescenceSearch(
      child,
      -beta,
      -alpha,
      evaluate,
      generateCaptures,
      applyMove,
    );
    if (score >= beta) return beta;
    alpha = Math.max(alpha, score);
  }

  return alpha;
}
```
