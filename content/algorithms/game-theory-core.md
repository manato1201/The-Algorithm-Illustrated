---
name: コア(協力ゲーム理論における安定配分集合)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(2^n)(全提携についてのコア条件を検証する場合)
summary: 提携ゲームにおいて、どの提携グループも単独で離脱しても得をしない配分の集合を指す協力ゲーム理論の解概念で、一意の点ではなく空にもなりうる集合として定義される点が特徴。
---

## 概要

複数のプレイヤーが協力して共同の利益(提携価値)を生み出す協力ゲームでは、「生み出した利益をどう分配するか」が問題になる。[シャープレイ値](/algorithms/shapley-value)は「あらゆる参加順序での平均的な貢献度」に基づいて一意の分配点を計算するが、コア(core)は全く異なる角度から安定性を定義する解概念で、「配分`x`のもとで、どんな部分グループ(提携)`S`も、自分たちだけで独立して行動した場合の価値`v(S)`より多くを、その配分`x`から受け取っている」という条件を満たす配分の**集合**を指す。言い換えれば、コアに属する配分は「誰も、どんな部分集団も、離脱して自分たちだけでやり直す動機を持たない」という意味で安定している。1953年にドナルド・ギリースが定式化し、その後ロイド・シャープレイらによって理論が整備された、協力ゲーム理論のもう一つの中心的な解概念である。

## 仕組み

1. `n`人のプレイヤーの集合`N`と、任意の部分集合(提携)`S⊆N`が単独でどれだけの価値`v(S)`を生み出せるかを定める特性関数`v`が与えられているとする
2. 配分`x = (x_1, ..., x_n)`が**効率的**であるとは、全体の価値をちょうど分配しきっていること、すなわち`Σx_i = v(N)`を満たすことを指す
3. 効率的な配分`x`が**コアに属する**とは、空でないあらゆる提携`S`(`S ⊊ N`を含む)について`Σ_{i∈S} x_i ≥ v(S)`が成り立つことを指す——どの部分集団も、配分`x`から受け取る合計が、自分たちだけでやった場合に稼げる価値`v(S)`を下回らない、という条件である。`S`が単一プレイヤーの場合の特別ケースは「個人合理性」と呼ばれる
4. コアに属するかどうかの素朴な判定は、`N`のあらゆる部分集合(`2^n - 2`通り)についてこの不等式を検証する必要があるため`O(2^n)`かかる
5. コアが空でないかどうかは、線形計画法として定式化して解くことでも判定できる(**Bondareva–Shapleyの定理**:ゲームが「均衡的(balanced)」であることがコアの非空性と同値)。特に、任意の提携の限界貢献度がプレイヤー数の増加とともに単調に増加する「凸ゲーム」では、コアは常に非空であり、[シャープレイ値](/algorithms/shapley-value)がその中に含まれることが保証されている

## 特性・トレードオフ

- **[シャープレイ値](/algorithms/shapley-value)との違い**: シャープレイ値は「あらゆるゲームに対して常に一意に定まる1つの配分点」だが、コアは「安定性の条件を満たす配分の集合」であり、複数の配分が同時にコアに属することも、コアそのものが**空集合**になることもある(下記の多数決ゲームが典型例)。前者は「公平性」の公理から一意解を導く枠組み、後者は「離脱への耐性」という安定性そのものを問う枠組みであり、協力ゲーム理論における2つの異なる問いに対応する
- **空集合になりうる**: 対称な3人多数決ゲーム(どの2人が組んでも価値1、単独では0、全体でも1)のように、どんな効率的配分を試みても必ずどこかの2人組が「自分たちだけでやった方が得だ」と感じてしまい、安定な配分が一切存在しないケースがある。このときコアは空であり、「安定な分配は原理的に存在しない」という強い結論を意味する
- **計算量**: 素朴な判定は`O(2^n)`でプレイヤー数に対して指数的。コアが空でないかどうかを線形計画法で判定する方が実用的だが、それでも制約数(部分集合の数)自体が指数的に増える点は変わらない。凸ゲームなど特別な構造を持つゲームでは、コアが非空であることが理論的に保証され、計算も容易になる
- **使いどころ**: 複数企業の共同事業や自治体連合のコスト・利益分担で「誰も抜けたがらない」安定な配分案を探す場面、輸送・物流の共同配送コスト分担、連合形成ゲーム(coalition formation)を扱うマルチエージェントシステムの分析、公共財の費用分担など、離脱インセンティブの有無そのものが問題になる状況

## 実装例

対称な3人多数決ゲーム(コアが空になる典型例)と、凸ゲーム(シャープレイ値がコアに含まれる例)の両方で、配分がコアの条件を満たすかどうかを検証する。

```python
from itertools import combinations


def is_in_core(
    allocation: dict[int, float], v, players: list[int], tol: float = 1e-9
) -> bool:
    """配分allocationが、特性関数vのもとでコアに属するかを判定する"""
    total = sum(allocation.values())
    if abs(total - v(frozenset(players))) > tol:
        return False  # 効率性(全体の価値をちょうど配分しきっているか)を満たさない
    for size in range(1, len(players)):
        for subset in combinations(players, size):
            s = frozenset(subset)
            if sum(allocation[i] for i in subset) + tol < v(s):
                return False  # 提携sが単独離脱で配分xより得をしてしまう
    return True


def v_majority_game(coalition: frozenset) -> float:
    # 対称な3人多数決ゲーム: どの2人が組んでも価値1、単独では0
    return 1.0 if len(coalition) >= 2 else 0.0


def v_convex_game(coalition: frozenset) -> float:
    # 限界貢献度がプレイヤー数とともに増加する凸ゲームの例
    singles = {frozenset({1}): 1.0, frozenset({2}): 1.0, frozenset({3}): 1.0}
    pairs = {
        frozenset({1, 2}): 4.0,
        frozenset({1, 3}): 4.0,
        frozenset({2, 3}): 4.0,
    }
    if len(coalition) == 0:
        return 0.0
    if len(coalition) == 3:
        return 9.0
    return pairs.get(coalition, singles.get(coalition, 0.0))


players = [1, 2, 3]

# 対称多数決ゲーム: 全体を分配しようとすると必ずどこかのペアが不満を持つ(コアは空)
assert not is_in_core({1: 1 / 3, 2: 1 / 3, 3: 1 / 3}, v_majority_game, players)

# 凸ゲーム: シャープレイ値(対称なゲームなので均等配分の3,3,3)がそのままコアに含まれる
shapley_equal_split = {1: 3.0, 2: 3.0, 3: 3.0}
assert is_in_core(shapley_equal_split, v_convex_game, players)

# コアの条件を破る配分(1人に偏りすぎ)は当然コアに属さない
assert not is_in_core({1: 7.0, 2: 1.0, 3: 1.0}, v_convex_game, players)
```

```typescript
type Coalition = ReadonlySet<number>;

function coalitionKey(coalition: Coalition): string {
  return [...coalition].sort((a, b) => a - b).join(",");
}

function subsetsOfSize(players: number[], size: number): number[][] {
  if (size === 0) return [[]];
  if (players.length < size) return [];
  const [first, ...rest] = players;
  const withFirst = subsetsOfSize(rest, size - 1).map((s) => [first, ...s]);
  const withoutFirst = subsetsOfSize(rest, size);
  return [...withFirst, ...withoutFirst];
}

function isInCore(
  allocation: Map<number, number>,
  v: (coalition: Coalition) => number,
  players: number[],
  tol = 1e-9,
): boolean {
  const total = [...allocation.values()].reduce((a, b) => a + b, 0);
  const grandTotal = v(new Set(players));
  if (Math.abs(total - grandTotal) > tol) return false; // 効率性を満たさない

  for (let size = 1; size < players.length; size++) {
    for (const subset of subsetsOfSize(players, size)) {
      const s = new Set(subset);
      const subTotal = subset.reduce((acc, i) => acc + allocation.get(i)!, 0);
      if (subTotal + tol < v(s)) return false; // 提携sが単独離脱で得をしてしまう
    }
  }
  return true;
}

// 対称な3人多数決ゲーム: どの2人が組んでも価値1、単独では0
function vMajorityGame(coalition: Coalition): number {
  return coalition.size >= 2 ? 1.0 : 0.0;
}

// 限界貢献度がプレイヤー数とともに増加する凸ゲームの例
function vConvexGame(coalition: Coalition): number {
  const key = coalitionKey(coalition);
  const singles: Record<string, number> = { "1": 1, "2": 1, "3": 1 };
  const pairs: Record<string, number> = { "1,2": 4, "1,3": 4, "2,3": 4 };
  if (coalition.size === 0) return 0;
  if (coalition.size === 3) return 9;
  return pairs[key] ?? singles[key] ?? 0;
}

const players = [1, 2, 3];

// 対称多数決ゲーム: 全体を分配しようとすると必ずどこかのペアが不満を持つ(コアは空)
const majoritySplit = new Map([[1, 1 / 3], [2, 1 / 3], [3, 1 / 3]]);
console.log(isInCore(majoritySplit, vMajorityGame, players)); // false

// 凸ゲーム: シャープレイ値(均等配分の3,3,3)がそのままコアに含まれる
const shapleyEqualSplit = new Map([[1, 3], [2, 3], [3, 3]]);
console.log(isInCore(shapleyEqualSplit, vConvexGame, players)); // true

// コアの条件を破る配分(1人に偏りすぎ)は当然コアに属さない
const skewedSplit = new Map([[1, 7], [2, 1], [3, 1]]);
console.log(isInCore(skewedSplit, vConvexGame, players)); // false
```
