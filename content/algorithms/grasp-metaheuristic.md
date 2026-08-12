---
name: GRASP(Greedy Randomized Adaptive Search Procedure)
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(反復回数 × (貪欲構築のコスト + 局所探索のコスト))
summary: 貪欲法にランダム性を加えた候補リストから解を構築し、その解を局所探索で磨き上げる、という2段階を独立に何度も繰り返すマルチスタート型のメタヒューリスティック。
---

## 概要

貪欲法は高速だが、最初の選択の良し悪しがその後の全ての選択を縛ってしまい、多くの場合1つの(あまり良くない)解にしかたどり着けない。GRASP(Greedy Randomized Adaptive Search Procedure)は、1989年にThomas FeoとMauricio Resendeが提案したメタヒューリスティックで、貪欲法の各ステップに**制限された範囲のランダム性**を加えて解を構築し(構築フェーズ)、得られた解を[山登り法](/algorithms/hill-climbing)のような局所探索でさらに磨き上げる(局所探索フェーズ)、という2段階の手続きを独立した反復として何度も繰り返す。反復ごとにゼロから構築し直す**マルチスタート型**の手法であるため、[遺伝的アルゴリズム](/algorithms/genetic-algorithm)のように個体群同士が相互作用することはなく、各反復は完全に独立している。

## 仕組み

1. 停止条件(反復回数や時間制限)に達するまで、以下を繰り返す
2. **貪欲ランダム化構築**: 空の解から始め、各ステップで追加候補となる要素を貪欲関数(その要素を加えたときの見込みの良さ)で評価する。最良の要素だけを選ぶ通常の貪欲法とは異なり、評価値が上位(またはあるしきい値以内)の要素を集めた**制限候補リスト(RCL: Restricted Candidate List)** を作り、その中から**ランダムに1つ**選んで解に加える。要素を加えるたびに残りの候補の貪欲関数の値を**再計算する**(この「適応的」な再評価がAdaptiveの名の由来)ため、単なるランダム化ではなく、常にその時点での有望さを反映した選択になる
3. **局所探索**: 構築フェーズで得た解を初期解として、近傍を調べて改善する[山登り法](/algorithms/hill-climbing)などの局所探索を適用し、局所最適解まで改善する
4. その反復で得られた解が、これまでの最良解を上回れば更新する
5. 反復を終えたら、記録しておいた最良解を返す

RCLのサイズ(またはしきい値パラメータ `α`)を大きくするほどランダム性が強まり多様な出発点を試せる一方、小さくするほど純粋な貪欲法に近づく。この1つのパラメータで「多様性」と「貪欲さ」のバランスを調整できる。

## 特性・トレードオフ

- **貪欲法とランダム性の連続的な調律**: しきい値パラメータ `α = 0` にすれば通常の(決定的な)貪欲法と一致し、`α = 1` にすればほぼ完全にランダムな構築になる。この間を調整することで、問題ごとに適した「賢さ」と「多様さ」の配分を選べる
- **各反復が完全に独立**: 個体群同士が影響し合う[遺伝的アルゴリズム](/algorithms/genetic-algorithm)や、1本の探索軌跡を引き継ぐ[タブーサーチ](/algorithms/tabu-search)・[焼きなまし法](/algorithms/simulated-annealing)とは異なり、GRASPの各反復は互いに独立しているため、複数の反復を並列計算機で同時に走らせるのが極めて容易である
- **局所探索の質に強く依存する**: 構築フェーズ単体では貪欲法をランダム化しただけの解にすぎず、局所探索フェーズによる磨き上げがなければ質の高い解にはたどり着きにくい。実践では、問題に適した強力な局所探索(あるいは近傍構造を切り替える[変数近傍探索法](/algorithms/variable-neighborhood-search))と組み合わせて初めて威力を発揮する
- **使いどころ**: 集合被覆問題、施設配置問題、巡回セールスマン問題、スケジューリング問題など、貪欲法による構築的なヒューリスティックが自然に定義できる組合せ最適化問題全般。構築が高速なため大規模な問題にも適用しやすい

## 実装例

0-1ナップサック問題を題材に、価値密度(価値/重さ)に基づくRCLからランダムに品物を選んで解を構築し、1品目入れ替え(1-swap)の近傍で局所探索する例を実装する。

```python
import random
from dataclasses import dataclass


@dataclass
class Item:
    weight: float
    value: float


def greedy_randomized_construction(
    items: list[Item], capacity: float, alpha: float, rng: random.Random
) -> list[int]:
    """RCL(制限候補リスト)からランダムに選びながら貪欲に解を構築する"""
    selected: list[int] = []
    remaining_capacity = capacity
    candidates = list(range(len(items)))

    while candidates:
        feasible = [i for i in candidates if items[i].weight <= remaining_capacity]
        if not feasible:
            break
        ratios = {i: items[i].value / items[i].weight for i in feasible}
        best_ratio = max(ratios.values())
        worst_ratio = min(ratios.values())
        threshold = best_ratio - alpha * (best_ratio - worst_ratio)
        rcl = [i for i in feasible if ratios[i] >= threshold]

        chosen = rng.choice(rcl)
        selected.append(chosen)
        remaining_capacity -= items[chosen].weight
        candidates.remove(chosen)

    return selected


def local_search(items: list[Item], capacity: float, solution: list[int]) -> list[int]:
    """1品目だけ入れ替える(1-swap)近傍で局所探索する"""
    selected = set(solution)
    improved = True
    while improved:
        improved = False
        weight = sum(items[i].weight for i in selected)
        value = sum(items[i].value for i in selected)
        for out_i in list(selected):
            for in_i in range(len(items)):
                if in_i in selected:
                    continue
                new_weight = weight - items[out_i].weight + items[in_i].weight
                new_value = value - items[out_i].value + items[in_i].value
                if new_weight <= capacity and new_value > value:
                    selected.remove(out_i)
                    selected.add(in_i)
                    improved = True
                    break
            if improved:
                break
    return list(selected)


def grasp_knapsack(
    items: list[Item],
    capacity: float,
    alpha: float = 0.3,
    max_iterations: int = 100,
    seed: int = 1,
) -> list[int]:
    rng = random.Random(seed)
    best_solution: list[int] = []
    best_value = 0.0

    for _ in range(max_iterations):
        constructed = greedy_randomized_construction(items, capacity, alpha, rng)
        refined = local_search(items, capacity, constructed)
        value = sum(items[i].value for i in refined)
        if value > best_value:
            best_solution, best_value = refined, value

    return best_solution
```

```typescript
type Item = { weight: number; value: number };

// RCL(制限候補リスト)からランダムに選びながら貪欲に解を構築する
function greedyRandomizedConstruction(
  items: Item[],
  capacity: number,
  alpha: number,
  rand: () => number,
): number[] {
  const selected: number[] = [];
  let remainingCapacity = capacity;
  let candidates = items.map((_, i) => i);

  while (candidates.length > 0) {
    const feasible = candidates.filter((i) => items[i].weight <= remainingCapacity);
    if (feasible.length === 0) break;

    const ratios = new Map(feasible.map((i) => [i, items[i].value / items[i].weight]));
    const bestRatio = Math.max(...ratios.values());
    const worstRatio = Math.min(...ratios.values());
    const threshold = bestRatio - alpha * (bestRatio - worstRatio);
    const rcl = feasible.filter((i) => (ratios.get(i) as number) >= threshold);

    const chosen = rcl[Math.floor(rand() * rcl.length)];
    selected.push(chosen);
    remainingCapacity -= items[chosen].weight;
    candidates = candidates.filter((i) => i !== chosen);
  }

  return selected;
}

// 1品目だけ入れ替える(1-swap)近傍で局所探索する
function localSearch(items: Item[], capacity: number, solution: number[]): number[] {
  const selected = new Set(solution);
  let improved = true;
  while (improved) {
    improved = false;
    const weight = [...selected].reduce((s, i) => s + items[i].weight, 0);
    const value = [...selected].reduce((s, i) => s + items[i].value, 0);

    outer: for (const outI of [...selected]) {
      for (let inI = 0; inI < items.length; inI++) {
        if (selected.has(inI)) continue;
        const newWeight = weight - items[outI].weight + items[inI].weight;
        const newValue = value - items[outI].value + items[inI].value;
        if (newWeight <= capacity && newValue > value) {
          selected.delete(outI);
          selected.add(inI);
          improved = true;
          break outer;
        }
      }
    }
  }
  return [...selected];
}

function graspKnapsack(
  items: Item[],
  capacity: number,
  alpha: number = 0.3,
  maxIterations: number = 100,
  rand: () => number = Math.random,
): number[] {
  let bestSolution: number[] = [];
  let bestValue = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    const constructed = greedyRandomizedConstruction(items, capacity, alpha, rand);
    const refined = localSearch(items, capacity, constructed);
    const value = refined.reduce((s, i) => s + items[i].value, 0);
    if (value > bestValue) {
      bestSolution = refined;
      bestValue = value;
    }
  }

  return bestSolution;
}
```
