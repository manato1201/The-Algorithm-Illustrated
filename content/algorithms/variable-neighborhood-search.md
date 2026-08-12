---
name: 変数近傍探索法(VNS)
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(反復回数 × 近傍数 × 局所探索1回のコスト)
summary: ある近傍構造のもとでの局所最適が別の近傍構造では局所最適とは限らないという性質を利用し、局所探索が停留するたびに近傍構造そのものを系統的に切り替えて脱出を試みるメタヒューリスティック。
---

## 概要

[山登り法](/algorithms/hill-climbing)のような局所探索は、あらかじめ決めた1種類の近傍(現在の解から「1手」で移動できる範囲)しか見ないため、その近傍の中で身動きが取れなくなる局所最適に容易にはまり込む。変数近傍探索法(VNS)は、1997年にNenad MladenovićとPierre Hansenが提案したメタヒューリスティックで、「ある近傍構造のもとでの局所最適解が、別の(より広い、あるいは形の異なる)近傍構造のもとでも局所最適であるとは限らない」という単純だが強力な観察に基づいている。局所探索が停留したら、探索のやり方(禁止リストや受理確率)を変えるのではなく、**近傍構造そのものを体系的に切り替える**ことで、今いる谷から別の谷へと視点を移し、脱出の糸口を探す。

## 仕組み

1. 近傍構造の列 `N_1, N_2, ..., N_kmax` をあらかじめ定義する。通常、`N_1` が最も狭い(現在の解に近い)近傍で、`k` が大きくなるほど広い近傍になるように設計する
2. 初期解 `x` を用意し、`k = 1` とする
3. **シェイキング**: 近傍 `N_k(x)` の中からランダムに1点 `x'` を選ぶ(ランダムに選ぶことで、同じ局所探索が同じ場所に引き戻されるのを防ぐ)
4. `x'` を出発点として局所探索(山登り法など)を行い、局所最適解 `x''` を得る
5. `x''` が現在の解 `x` より良ければ、`x ← x''` として `k` を1に戻す(最も狭い近傍から探索をやり直す)。改善しなければ `k ← k + 1` として、次の(より広い)近傍でシェイキングをやり直す
6. `k` が `k_max` を超えたら `k = 1` にリセットし、停止条件(反復回数・時間制限など)に達するまで3〜5を繰り返す

「改善したら近傍を狭く戻し、停滞したら近傍を広げる」という単純な制御則によって、狭い範囲を丁寧に磨き上げる局所探索の精度と、遠くの領域へジャンプする探索の広さを、両立させている。

## 特性・トレードオフ

- **[タブーサーチ](/algorithms/tabu-search)との違い**: タブーサーチは同じ近傍構造の中にとどまりながら、直近の移動履歴を禁止リストで管理することでサイクリングを防ぎ局所最適を脱出しようとする。VNSは移動履歴を一切管理せず、代わりに**近傍構造自体を体系的に切り替える**ことで脱出を図る、発想の異なるアプローチである。両者は排他的ではなく、VNSの各近傍内の局所探索としてタブーサーチを使うようなハイブリッドも成立する
- **チューニングパラメータが少ない**: 焼きなまし法の冷却スケジュールやタブーサーチのタブーテニュアのような繊細な調整パラメータを必要とせず、「近傍構造の列をどう定義するか」というほぼ1点に設計労力が集中する。この単純さがVNSの実装・適用のしやすさにつながっている
- **近傍構造の設計が成否を分ける**: 効果を出すには、問題の構造に応じた「意味のある」複数の近傍(例えば経路最適化なら2-opt・3-optのような操作の種類や範囲)を用意する必要があり、この設計自体が問題ごとのノウハウになる
- **使いどころ**: 巡回セールスマン問題、車両配送計画(VRP)、p-メディアン問題のような施設配置、スケジューリング問題など、複数の異なる「動かし方」が自然に定義できる組合せ最適化問題全般で、単一の近傍構造による局所探索よりも高品質な解を得るために使われる

## 実装例

多峰性(局所最適が複数ある)な1次元関数 `f(x) = 8・sin(x/2) - 0.01・(x-20)^2` を対象に、シェイキングの半径を近傍のレベル `k` に応じて広げていく例で実装する。

```python
import math
import random


def objective(x: float) -> float:
    return 8 * math.sin(x / 2) - 0.01 * (x - 20) ** 2


def local_search(x: float, step: float = 0.1, max_steps: int = 300) -> float:
    current = x
    for _ in range(max_steps):
        improved = False
        for direction in (-1, 1):
            candidate = current + direction * step
            if objective(candidate) > objective(current):
                current = candidate
                improved = True
        if not improved:
            break
    return current


def shake(x: float, k: int, rng: random.Random) -> float:
    radius = k * 3.0  # 近傍レベルkが上がるほど、より広い範囲からランダムに飛ぶ
    return x + rng.uniform(-radius, radius)


def variable_neighborhood_search(
    start_x: float,
    k_max: int = 6,
    max_iterations: int = 200,
    seed: int = 1,
) -> float:
    rng = random.Random(seed)
    best_x = local_search(start_x)
    best_value = objective(best_x)

    for _ in range(max_iterations):
        k = 1
        while k <= k_max:
            shaken_x = shake(best_x, k, rng)
            candidate_x = local_search(shaken_x)
            candidate_value = objective(candidate_x)
            if candidate_value > best_value:
                best_x, best_value = candidate_x, candidate_value
                k = 1  # 改善したので最も狭い近傍に戻る
            else:
                k += 1  # 改善しなければ次の(より広い)近傍を試す

    return best_x
```

```typescript
function objective(x: number): number {
  return 8 * Math.sin(x / 2) - 0.01 * (x - 20) ** 2;
}

function localSearch(x: number, step = 0.1, maxSteps = 300): number {
  let current = x;
  for (let i = 0; i < maxSteps; i++) {
    let improved = false;
    for (const direction of [-1, 1]) {
      const candidate = current + direction * step;
      if (objective(candidate) > objective(current)) {
        current = candidate;
        improved = true;
      }
    }
    if (!improved) break;
  }
  return current;
}

function shake(x: number, k: number, rand: () => number): number {
  const radius = k * 3.0; // 近傍レベルkが上がるほど、より広い範囲からランダムに飛ぶ
  return x + (rand() * 2 - 1) * radius;
}

function variableNeighborhoodSearch(
  startX: number,
  kMax: number = 6,
  maxIterations: number = 200,
  rand: () => number = Math.random,
): number {
  let bestX = localSearch(startX);
  let bestValue = objective(bestX);

  for (let iter = 0; iter < maxIterations; iter++) {
    let k = 1;
    while (k <= kMax) {
      const shakenX = shake(bestX, k, rand);
      const candidateX = localSearch(shakenX);
      const candidateValue = objective(candidateX);
      if (candidateValue > bestValue) {
        bestX = candidateX;
        bestValue = candidateValue;
        k = 1; // 改善したので最も狭い近傍に戻る
      } else {
        k += 1; // 改善しなければ次の(より広い)近傍を試す
      }
    }
  }

  return bestX;
}
```
