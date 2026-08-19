---
name: Lin-Kernighanヒューリスティック
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(問題依存、1回の改善探索は概ねO(n)〜O(n^2))
summary: 巡回セールスマン問題に対し2本や3本の辺の交換を可変長に一般化し、改善が続く限り連鎖的に辺を交換し続ける局所探索法で長年TSPの実用的近似解法の最高水準であり続けた。
---

## 概要

巡回セールスマン問題(TSP)の局所探索法として、最も単純なものは経路上の2本の辺を選んで組み換える**2-opt**、3本を組み換える**3-opt**である。これらは`k`本の辺を固定長で交換するが、`k`を大きくするほど改善の余地は広がる一方で1回の近傍探索のコストが跳ね上がるというトレードオフがある。Lin-Kernighanヒューリスティックは1973年にシェン・リンとブライアン・カーニハンが考案した手法で、交換する辺の本数`k`を**固定せず、改善が見込める限り動的に増やしていく**という発想でこのトレードオフを解決する。1本の辺を切ってから新しい辺をつなぎ直し、その結果としてまだ改善の余地(ゲイン)が残っていれば、さらにもう1本切ってつなぎ直す、という操作を連鎖的に繰り返し、どこかで全体として経路長が短縮できた時点で確定する。この「可変長`k`-opt」というアイデアにより、2-opt/3-optでは届かない改善を、3-opt全探索ほどのコストをかけずに見つけられる。数十年にわたり、TSPの実用的な近似解法として最高水準の解の質を実現し続けてきた手法として知られる(後継のLin-Kernighan-Helsgaunアルゴリズムは、さらに高度な近傍構造と実装上の工夫でこれを凌駕している)。

## 仕組み

1. 初期経路(ランダムまたは貪欲法による構築解)から出発する
2. 経路上の1つの都市`t1`と、それに隣接する辺`(t1, t2)`を選び、この辺を**取り除く**(経路が一時的に途切れる)
3. `t2`から新しい辺`(t2, t3)`を張る候補を探す。この新しい辺は、取り除いた辺より短い(あるいは累積の**ゲイン**(短縮できた長さの合計)が正になる)ことが望ましい
4. `t3`に隣接するもう1本の辺`(t3, t4)`を取り除く。ここで、もし`(t4, t1)`をつないで経路を閉じれば、それまでの一連の交換によって全体の経路長が短縮されているかを確認する(**閉路チェック**)
5. 閉じた時点でのゲインが正(元の経路より短くなった)なら、その交換を**確定**して新しい経路とし、1に戻ってやり直す
6. 閉じてもゲインが正にならない場合、あるいはさらに良い交換の余地がありそうな場合は、`t4`から`t5`へと**さらに1本先の辺の交換**へ進み(3〜4を再帰的に繰り返し)、`k`本の辺を交換する連鎖を続ける。ここで「累積ゲインが常に正である限り続行する」という条件(**正ゲイン基準**)が、この連鎖を無限に広げず打ち切る鍵になる
7. どの深さまで進んでも改善が見つからない場合は、その連鎖を打ち切り、別の初期辺`(t1, t2)`から2からやり直す
8. どの都市を起点にしても改善する交換が見つからなくなった時点で局所最適とみなし、探索を終了する(実用上は複数回のランダム再スタートや、より強力な近傍を使うLKHアルゴリズムと組み合わせて使われることが多い)

「1本切ってつなぎ直すたびに、まだ改善の余地(正のゲイン)が残っているかを逐次判定しながら連鎖を伸ばす」という可変長探索が、固定長の2-opt/3-optにはない柔軟性を生んでいる。

## 特性・トレードオフ

- **2-opt/3-optとの関係**: Lin-Kernighanヒューリスティックは、`k`を2や3に固定した場合の2-opt/3-optを特殊ケースとして含む一般化になっている。固定長`k`-optでは見逃す改善を、必要な深さまで動的に連鎖を伸ばすことで発見できる
- **正ゲイン基準による打ち切りが実用性の鍵**: 理論上は交換の連鎖はいくらでも深くできるが、「累積ゲインが正である限りしか続けない」という基準によって、実際に探索する連鎖の深さは現実的な範囲に収まる。この枝刈りがなければ組み合わせ爆発してしまう
- **局所探索であり大域最適の保証はない**: Lin-Kernighanヒューリスティックも[焼きなまし法](/algorithms/simulated-annealing)や[タブーサーチ](/algorithms/tabu-search)と同様に局所最適に収束する探索法であり、複数回の再スタートや近傍構造の工夫(Or-opt、5-optなど)、あるいはより洗練された変種であるLin-Kernighan-Helsgaunアルゴリズム(LKH)との併用で解の質をさらに高めるのが実務上の定石
- **実装の複雑さと引き換えの高い解の質**: 素朴な2-optに比べて実装は大幅に複雑になるが、その分だけ実際のベンチマークで得られる解の質は高く、数万都市規模のTSPインスタンスでも最適解の1%以内に収まる結果が報告されている
- **使いどころ**: 巡回セールスマン問題そのものの近似解法としてはもちろん、車両配送計画(VRP)・回路配線・DNA配列決定など、TSPに帰着できる組み合わせ最適化問題全般。[遺伝的アルゴリズム](/algorithms/genetic-algorithm)や[焼きなまし法](/algorithms/simulated-annealing)と組み合わせ、Lin-Kernighanを局所改善のサブルーチンとして使う設計もよく見られる

## 実装例

以下は「2-optを起点に、改善が続く限り3本目・4本目の辺交換まで連鎖的に試す」という単純化したLin-Kernighan風の実装(本格的なLKHは近傍候補リストや逐次的なゲイン計算などさらに高度な工夫を持つ)。

```python
def tour_length(tour: list[int], dist: list[list[float]]) -> float:
    n = len(tour)
    return sum(dist[tour[i]][tour[(i + 1) % n]] for i in range(n))


def two_opt_swap(tour: list[int], i: int, j: int) -> list[int]:
    return tour[:i] + tour[i:j + 1][::-1] + tour[j + 1:]


def lin_kernighan_step(tour: list[int], dist: list[list[float]], max_depth: int = 3) -> list[int] | None:
    """1本の辺を切ってから、正のゲインが続く限り連鎖的に辺を交換する改善を1つ探す。"""
    n = len(tour)

    def try_chain(base_tour: list[int], t1_idx: int, depth: int, gain: float) -> list[int] | None:
        if depth > max_depth:
            return None
        for j in range(t1_idx + 1, n):
            candidate = two_opt_swap(base_tour, t1_idx, j)
            new_gain = tour_length(base_tour, dist) - tour_length(candidate, dist)
            if new_gain > 1e-9:
                return candidate  # 累積ゲインが正になった時点で確定
            # まだ改善しないが、さらに深く交換を試す(連鎖)
            deeper = try_chain(candidate, t1_idx, depth + 1, gain + new_gain)
            if deeper is not None:
                return deeper
        return None

    for i in range(n - 1):
        result = try_chain(tour, i, 1, 0.0)
        if result is not None:
            return result
    return None


def lin_kernighan(tour: list[int], dist: list[list[float]], max_iterations: int = 200) -> list[int]:
    current = tour[:]
    for _ in range(max_iterations):
        improved = lin_kernighan_step(current, dist)
        if improved is None:
            break
        current = improved
    return current
```

```typescript
function tourLength(tour: number[], dist: number[][]): number {
  const n = tour.length;
  let total = 0;
  for (let i = 0; i < n; i++) total += dist[tour[i]][tour[(i + 1) % n]];
  return total;
}

function twoOptSwap(tour: number[], i: number, j: number): number[] {
  const reversed = tour.slice(i, j + 1).reverse();
  return [...tour.slice(0, i), ...reversed, ...tour.slice(j + 1)];
}

function linKernighanStep(tour: number[], dist: number[][], maxDepth = 3): number[] | null {
  // 1本の辺を切ってから、正のゲインが続く限り連鎖的に辺を交換する改善を1つ探す
  const n = tour.length;

  function tryChain(baseTour: number[], t1Idx: number, depth: number): number[] | null {
    if (depth > maxDepth) return null;
    for (let j = t1Idx + 1; j < n; j++) {
      const candidate = twoOptSwap(baseTour, t1Idx, j);
      const newGain = tourLength(baseTour, dist) - tourLength(candidate, dist);
      if (newGain > 1e-9) return candidate; // 累積ゲインが正になった時点で確定
      // まだ改善しないが、さらに深く交換を試す(連鎖)
      const deeper = tryChain(candidate, t1Idx, depth + 1);
      if (deeper !== null) return deeper;
    }
    return null;
  }

  for (let i = 0; i < n - 1; i++) {
    const result = tryChain(tour, i, 1);
    if (result !== null) return result;
  }
  return null;
}

function linKernighan(tour: number[], dist: number[][], maxIterations = 200): number[] {
  let current = [...tour];
  for (let iter = 0; iter < maxIterations; iter++) {
    const improved = linKernighanStep(current, dist);
    if (improved === null) break;
    current = improved;
  }
  return current;
}
```
