---
name: 置換表 (Transposition Table)
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(1)(検索・登録とも平均、探索全体の計算量を大幅に削減)
summary: 異なる手順で到達した同一局面の探索結果をハッシュテーブルに記録・再利用し重複探索を省くキャッシュ機構。
---

## 概要

チェスや将棋のゲーム木では、「駒Aを動かしてから駒Bを動かす」のと「駒Bを動かしてから駒Aを動かす」のように、異なる手順(move order)が全く同じ局面に合流する**転置(トランスポジション)**が頻繁に発生する。素朴なミニマックス探索やアルファベータ探索はこれを別々のノードとして何度も再計算してしまい、探索の大きな無駄になる。置換表は、探索中に訪れた局面のハッシュ値([ゾブリストハッシュ](/algorithms/zobrist-hashing)で計算するのが標準的)をキーとして、その局面の評価値・探索済み深さ・最善手などをハッシュテーブルに記録しておく仕組みである。同じ局面に別の手順で再度到達したとき、テーブルを引くだけで(条件が揃えば)探索をスキップでき、実効的な探索深さを大幅に向上させる。反復深化探索や[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)と組み合わせることでゲームAIの標準装備として扱われている。

## 仕組み

1. 局面に到達したら、まずゾブリストハッシュ等でその局面のハッシュ値を計算し、置換表を検索する
2. テーブルに同じ局面のエントリが見つかり、かつそのエントリの探索深さが現在必要な深さ以上であれば、記録された評価値をそのまま使って探索を打ち切る(**カットオフ**)
3. エントリの評価値は探索窓との関係で3種類に分類して保存する: **厳密値**(探索窓内に収まった真の評価値)、**下界**(ベータカットが起きて実際の値はこれ以上と分かっているだけ)、**上界**(アルファカットが起きて実際の値はこれ以下と分かっているだけ)。カットオフの可否判定にはこの種別を考慮する
4. 深さが足りない、あるいはエントリが存在しない場合でも、記録されていた「最善手」を[反復深化探索](/algorithms/iterative-deepening-minimax)で最初に試す手として使うことで、アルファベータの枝刈り効率(**手の順序付け**)を大きく改善できる
5. テーブルサイズは有限なので、新しいエントリで古いエントリを上書きする**置換戦略**(探索深さが浅いものから上書きする、常に最新で上書きする等)が必要になる

## 特性・トレードオフ

- **計算量**: 検索・登録は平均`O(1)`。効果はゲーム・局面依存だが、実測で探索ノード数を数分の一〜数十分の一に削減することも珍しくない
- **メモリと衝突のトレードオフ**: テーブルサイズを大きくするほどヒット率が上がるが、メモリを消費する。また異なる局面が同じハッシュ値を持つ「ハッシュ衝突」のリスクもゼロではなく、実運用ではハッシュ値だけでなく検証用の付加情報を併記することもある
- **探索窓依存の評価値**: アルファベータ探索の評価値は探索窓(アルファ・ベータ値)に依存するため、単純に「前回の評価値」を再利用すると誤った判断をしうる。厳密値・上界・下界を区別した慎重な再利用が必要
- **使いどころ**: チェス・将棋・囲碁・オセロなど、あらゆる深さ優先ゲーム木探索の高速化。[反復深化探索](/algorithms/iterative-deepening-minimax)との併用がほぼ前提となる

## 実装例

深さとベータ/アルファ情報を持つエントリをハッシュマップに保存し、アルファベータ探索中に参照・カットオフ判定を行う骨格を示す。

```python
from enum import Enum
from dataclasses import dataclass


class Bound(Enum):
    EXACT = "exact"
    LOWER = "lower"  # ベータカット由来、実際の値はこれ以上
    UPPER = "upper"  # アルファカット由来、実際の値はこれ以下


@dataclass
class TTEntry:
    depth: int
    value: float
    bound: Bound
    best_move: object | None


transposition_table: dict[int, TTEntry] = {}


def probe_tt(hash_key: int, depth: int, alpha: float, beta: float) -> tuple[float | None, object | None]:
    """深さが十分なエントリがあればカットオフ可能な評価値を返す。無ければ(None, 記録済みの最善手)"""
    entry = transposition_table.get(hash_key)
    if entry is None:
        return None, None
    if entry.depth >= depth:
        if entry.bound == Bound.EXACT:
            return entry.value, entry.best_move
        if entry.bound == Bound.LOWER and entry.value >= beta:
            return entry.value, entry.best_move
        if entry.bound == Bound.UPPER and entry.value <= alpha:
            return entry.value, entry.best_move
    return None, entry.best_move


def store_tt(hash_key: int, depth: int, value: float, bound: Bound, best_move: object | None) -> None:
    transposition_table[hash_key] = TTEntry(depth, value, bound, best_move)
```

```typescript
enum Bound {
  Exact = "exact",
  Lower = "lower", // ベータカット由来、実際の値はこれ以上
  Upper = "upper", // アルファカット由来、実際の値はこれ以下
}

interface TTEntry {
  depth: number;
  value: number;
  bound: Bound;
  bestMove: unknown | null;
}

const transpositionTable = new Map<bigint, TTEntry>();

function probeTT(
  hashKey: bigint,
  depth: number,
  alpha: number,
  beta: number,
): { value: number | null; bestMove: unknown | null } {
  // 深さが十分なエントリがあればカットオフ可能な評価値を返す。無ければvalue: null
  const entry = transpositionTable.get(hashKey);
  if (!entry) return { value: null, bestMove: null };

  if (entry.depth >= depth) {
    if (entry.bound === Bound.Exact)
      return { value: entry.value, bestMove: entry.bestMove };
    if (entry.bound === Bound.Lower && entry.value >= beta)
      return { value: entry.value, bestMove: entry.bestMove };
    if (entry.bound === Bound.Upper && entry.value <= alpha)
      return { value: entry.value, bestMove: entry.bestMove };
  }
  return { value: null, bestMove: entry.bestMove };
}

function storeTT(
  hashKey: bigint,
  depth: number,
  value: number,
  bound: Bound,
  bestMove: unknown | null,
): void {
  transpositionTable.set(hashKey, { depth, value, bound, bestMove });
}
```
