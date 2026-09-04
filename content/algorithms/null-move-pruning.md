---
name: ヌルムーブ枝刈り (Null-Move Pruning)
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(b^d)(定数倍の削減、実測で大幅な高速化)
summary: 「1手パスしても相手が有利にならないなら本物の手を探す必要はない」という仮定で不利でない局面を早期に枝刈りする前方枝刈り手法。
---

## 概要

ゲーム木探索において、「自分が1手パスして何もしなくても、それでもなお相手はこちらを上回れない」ほど自分が優勢な局面では、実際の手を丁寧に調べるまでもなく安全に枝刈りしてよいだろう、という直感がある。ヌルムーブ枝刈りは、この直感を実装したアルファベータ探索の**前方枝刈り**(ミニマックス的に厳密ではない、リスクを取った高速化)技術で、探索中の各局面で実際に手を指す代わりに一時的に手番だけを相手に渡す「ヌルムーブ(何もしない手)」を試し、浅い深さで探索した結果がベータ値以上(自分が十分優勢)であれば、その局面全体を「調べるまでもなく良い局面」として打ち切る。1手パスすることは通常どの局面でも不利にしかならない(**ヌルムーブ仮説**)という前提に基づいており、チェスエンジンの探索を数倍高速化する非常に効果の大きい技術として広く採用されている。

## 仕組み

1. 通常のアルファベータ探索の各ノードで、実際の候補手を調べる前に、まず手番だけを相手に譲る「ヌルムーブ」を仮に指す
2. ヌルムーブを指した局面に対して、通常より浅い深さ(例えば`depth - 1 - R`、`R`は削減幅でリダクション値と呼ばれ通常2〜3)でアルファベータ探索を(手番を反転させた形で)実行し評価値を得る
3. 得られた評価値がベータ値以上であれば、「相手に手番を1回タダで渡してさえこの局面は自分に有利」と判断し、この局面の詳細な探索を打ち切って早期にベータカットする
4. ベータ未満であれば安全と判断できないため、通常通り実際の候補手を1つずつ試す本探索に戻る
5. ツークツワンク(手を指すこと自体が不利になる終盤の局面等、特にチェスの終盤)ではヌルムーブ仮説が破れるため、駒が少ない終盤やそもそも王手がかかっている局面ではヌルムーブ枝刈りを無効化するのが実装上の定石

## 特性・トレードオフ

- **計算量**: 探索ノード数を実測で数分の一に削減できることが多く、その分だけ同じ時間でより深く読めるようになる。ただし削減幅`R`の選び方に探索の正確さと速度のトレードオフがある
- **非厳密性のリスク**: ヌルムーブ仮説が成り立たない局面(ツークツワンク)では誤って有望な手を見逃す危険がある。将棋のように駒を打てるゲームでも一部局面でヌルムーブ仮説が崩れることが知られており、ゲームごとに適用条件を調整する必要がある
- **他の枝刈りとの相性**: [静止探索](/algorithms/quiescence-search)や置換表と組み合わせて使うのが一般的。特に置換表からヌルムーブ探索の結果自体をキャッシュして再利用することも多い
- **使いどころ**: チェス・将棋・囲碁などのエンジン実装で標準的な高速化技術。序盤・中盤で特に効果が大きく、終盤やツークツワンクが疑われる局面では無効化される

## 実装例

ネガマックス形式のアルファベータ探索にヌルムーブ枝刈りを組み込んだ骨格を示す。手番を反転しつつ削減した深さで再帰する点に注目する。

```python
from typing import Callable

REDUCTION = 2  # ヌルムーブ探索での深さ削減幅R

def negamax_with_null_move(
    node: object,
    depth: int,
    alpha: float,
    beta: float,
    evaluate: Callable[[object], float],
    generate_moves: Callable[[object], list[object]],
    apply_move: Callable[[object, object], object],
    is_zugzwang_risk: Callable[[object], bool],
) -> float:
    if depth <= 0:
        return evaluate(node)

    # ツークツワンクの疑いがなく、十分な深さが残っている場合のみヌルムーブを試す
    if depth >= REDUCTION + 1 and not is_zugzwang_risk(node):
        null_child = apply_move(node, None)  # 手番だけ渡す(実際の手は指さない)
        score = -negamax_with_null_move(
            null_child, depth - 1 - REDUCTION, -beta, -beta + 1,
            evaluate, generate_moves, apply_move, is_zugzwang_risk,
        )
        if score >= beta:
            return beta  # パスしてさえ優勢なので詳細探索を打ち切る

    best = float("-inf")
    for move in generate_moves(node):
        child = apply_move(node, move)
        score = -negamax_with_null_move(
            child, depth - 1, -beta, -alpha, evaluate, generate_moves, apply_move, is_zugzwang_risk,
        )
        best = max(best, score)
        alpha = max(alpha, score)
        if alpha >= beta:
            break
    return best
```

```typescript
const REDUCTION = 2; // ヌルムーブ探索での深さ削減幅R

function negamaxWithNullMove(
  node: unknown,
  depth: number,
  alpha: number,
  beta: number,
  evaluate: (n: unknown) => number,
  generateMoves: (n: unknown) => unknown[],
  applyMove: (n: unknown, m: unknown | null) => unknown,
  isZugzwangRisk: (n: unknown) => boolean,
): number {
  if (depth <= 0) return evaluate(node);

  // ツークツワンクの疑いがなく、十分な深さが残っている場合のみヌルムーブを試す
  if (depth >= REDUCTION + 1 && !isZugzwangRisk(node)) {
    const nullChild = applyMove(node, null); // 手番だけ渡す(実際の手は指さない)
    const score = -negamaxWithNullMove(
      nullChild,
      depth - 1 - REDUCTION,
      -beta,
      -beta + 1,
      evaluate,
      generateMoves,
      applyMove,
      isZugzwangRisk,
    );
    if (score >= beta) return beta; // パスしてさえ優勢なので詳細探索を打ち切る
  }

  let best = -Infinity;
  for (const move of generateMoves(node)) {
    const child = applyMove(node, move);
    const score = -negamaxWithNullMove(
      child,
      depth - 1,
      -beta,
      -alpha,
      evaluate,
      generateMoves,
      applyMove,
      isZugzwangRisk,
    );
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}
```
