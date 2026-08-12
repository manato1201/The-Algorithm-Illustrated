---
name: 砂山モデル(Bak-Tang-Wiesenfeldモデル)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(アバランシェで崩れるセル数)(粒1個の投下あたり)
summary: 閾値を超えたセルが隣接セルへ「粒」を崩し連鎖的に伝播する単純な規則から、崩壊(アバランシェ)のサイズが特定のスケールを持たずべき乗則に従う自己組織化臨界現象が生まれる。
---

## 概要

コップに一粒ずつ砂を落としていくと、最初は静かに積み上がるが、ある高さを超えると突然崩れ、その崩れがどれくらいの規模になるかは予測できない——1987年にPer Bak・Chao Tang・Kurt Wiesenfeldの3人が提案した砂山モデル(BTWモデル)は、この現象をグリッド上のセルオートマトンとして定式化したものである。各セルは「積もった粒の数」という整数値を持ち、閾値を超えると隣接セルへ粒を分配して崩れる、という局所的でごく単純な規則に従うだけなのに、系全体を長時間走らせると**外から特別なパラメータを調整しなくても自然と「臨界状態」に落ち着く**——これが自己組織化臨界性(Self-Organized Criticality, SOC)と呼ばれる現象であり、地震・森林火災・雪崩・株価の暴落など、自然界の様々な「突発的でスケールを持たない崩壊」を理解するための出発点として物理学・複雑系科学で広く参照されている。

## 仕組み

グリッドの各セル`(r, c)`は非負整数の「高さ」`h(r, c)`を持ち、閾値は通常4に設定する(正方格子で隣接セルが4つあるため)。

1. グリッド上のランダムな(または指定の)セルに粒を1つ加える: `h(r, c) += 1`
2. **崩壊判定**: `h(r, c) >= 4` となったセルがあれば、そのセルは崩れる(トポリング)
3. **崩壊処理**: 崩れたセルは自身の高さから4を引き、上下左右の4近傍のセルにそれぞれ1ずつ粒を渡す(グリッド境界の外に出た粒は系の外へ失われる、と定義するのが一般的)
4. 崩壊によって隣接セルの高さが4以上になれば、そのセルも次々に崩れていく——この**連鎖的な崩壊の伝播**が「アバランシェ(雪崩)」であり、どのセルも4未満に落ち着くまで2〜3を繰り返す
5. アバランシェが完全に収まったら1に戻り、次の粒を投下する

| 状態             | 条件           | 遷移                                            |
| ---------------- | -------------- | ----------------------------------------------- |
| 安定             | `h(r, c) < 4`  | 何もしない(次の粒を待つ)                        |
| 崩壊(トポリング) | `h(r, c) >= 4` | `h(r, c) -= 4`、上下左右の4近傍に `+1` ずつ分配 |

一見するとライフゲームのように「全セルを同時に更新する」規則と似ているが、砂山モデルは**閾値を超えたセルがなくなるまで逐次的に崩壊を繰り返す**という点が異なり、1回の粒投下が引き起こす連鎖の長さ(アバランシェサイズ)は毎回大きく変動する。

## 特性・トレードオフ

- **計算量**: 粒1個を投下したときに実際に崩れるセル数に比例する。多くの場合は数個で収まるが、稀に系全体を巻き込む巨大なアバランシェが起きることもあり、1回あたりの処理量は予測できない
- **自己組織化臨界性(SOC)**: 温度や磁場のような外部パラメータを臨界点に細かく調整しなくても、単に粒を落とし続けるだけで系は自然と「臨界状態」——わずかな刺激が時にごく小さな崩壊で終わり、時に系全体を巻き込む巨大な崩壊を引き起こす、予測不能な状態——に収束していく。これは物理学における相転移が特別な条件下でしか起きないのとは対照的な性質である
- **べき乗則に従うアバランシェサイズ**: 崩壊の規模(トポリングが連鎖したセル数)の分布は、特定の「典型的な大きさ」を持たず、`P(サイズ = s) ∝ s^(-τ)` というべき乗則に従う。これは地震のマグニチュード分布(グーテンベルク・リヒター則)や森林火災の延焼面積分布など、自然界の多くの破局的現象と共通する統計的特徴であり、砂山モデルがSOCの「原型」として引用される理由になっている
- **[ライフゲーム](/algorithms/conways-game-of-life)との対比**: ライフゲームは全セルを同期的に一斉更新するのに対し、砂山モデルは閾値を超えたセルだけを非同期的・逐次的に処理し、系が完全に安定するまで内部で何度も緩和計算を行う。「毎世代必ず状態が変わる」ライフゲームと違い、砂山モデルは粒を1つ落としても何も崩れず終わることの方が多い
- **使いどころ**: 地震・雪崩・森林火災・神経発火・交通渋滞といった「臨界現象」の理解のための教育的モデル、複雑系科学における自己組織化臨界性の入門的な題材、べき乗則が支配する現象(いわゆる「スケールフリー」な統計)の直感的なデモンストレーション

## 実装例

```python
from collections import deque
import random

THRESHOLD = 4
DR = [-1, 1, 0, 0]
DC = [0, 0, -1, 1]


def topple(grid: list[list[int]]) -> int:
    """安定するまで崩壊を連鎖させ、崩れたセルの総数(アバランシェサイズ)を返す"""
    rows, cols = len(grid), len(grid[0])
    queue: deque[tuple[int, int]] = deque(
        (r, c) for r in range(rows) for c in range(cols) if grid[r][c] >= THRESHOLD
    )
    avalanche_size = 0
    in_queue = {(r, c) for r, c in queue}

    while queue:
        r, c = queue.popleft()
        in_queue.discard((r, c))
        if grid[r][c] < THRESHOLD:
            continue
        grid[r][c] -= THRESHOLD
        avalanche_size += 1
        for dr, dc in zip(DR, DC):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                grid[nr][nc] += 1
                if grid[nr][nc] >= THRESHOLD and (nr, nc) not in in_queue:
                    queue.append((nr, nc))
                    in_queue.add((nr, nc))
    return avalanche_size


def drop_grain(grid: list[list[int]], r: int, c: int) -> int:
    grid[r][c] += 1
    return topple(grid)


def run_sandpile(size: int, n_grains: int, seed: int = 0) -> list[int]:
    rng = random.Random(seed)
    grid = [[0] * size for _ in range(size)]
    avalanche_sizes = []
    for _ in range(n_grains):
        r, c = rng.randrange(size), rng.randrange(size)
        avalanche_sizes.append(drop_grain(grid, r, c))
    return avalanche_sizes
```

```typescript
const THRESHOLD = 4;
const DR = [-1, 1, 0, 0];
const DC = [0, 0, -1, 1];

function topple(grid: number[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const queue: [number, number][] = [];
  const inQueue = new Set<string>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] >= THRESHOLD) {
        queue.push([r, c]);
        inQueue.add(`${r},${c}`);
      }
    }
  }

  let avalancheSize = 0;
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    inQueue.delete(`${r},${c}`);
    if (grid[r][c] < THRESHOLD) continue;

    grid[r][c] -= THRESHOLD;
    avalancheSize++;

    for (let k = 0; k < 4; k++) {
      const nr = r + DR[k];
      const nc = c + DC[k];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        grid[nr][nc]++;
        const key = `${nr},${nc}`;
        if (grid[nr][nc] >= THRESHOLD && !inQueue.has(key)) {
          queue.push([nr, nc]);
          inQueue.add(key);
        }
      }
    }
  }
  return avalancheSize;
}

function dropGrain(grid: number[][], r: number, c: number): number {
  grid[r][c]++;
  return topple(grid);
}

function runSandpile(
  size: number,
  nGrains: number,
  rand: () => number = Math.random,
): number[] {
  const grid: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(0),
  );
  const avalancheSizes: number[] = [];
  for (let i = 0; i < nGrains; i++) {
    const r = Math.floor(rand() * size);
    const c = Math.floor(rand() * size);
    avalancheSizes.push(dropGrain(grid, r, c));
  }
  return avalancheSizes;
}
```
