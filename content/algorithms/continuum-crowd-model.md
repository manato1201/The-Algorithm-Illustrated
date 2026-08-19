---
name: 連続体力学による群衆シミュレーション(Continuum Crowd Model)
category: キャラクターAI・空間AI
subcategory: 群衆・マルチエージェント
complexity: O(W log W)(Wはコスト場を離散化したグリッドセル数。Fast Marching法によるコスト場の計算が支配的)
summary: 個々のエージェントではなく群衆全体を密度場・速度場として連続体力学的に扱い、Eikonal方程式に基づくコスト場を解くことで各地点における移動方向を一括して求める群衆シミュレーション手法。
---

## 概要

[RVO](/algorithms/reciprocal-velocity-obstacles)や[ソーシャルフォースモデル](/algorithms/social-force-model)は「各エージェントが個別に自分の速度や力を計算する」という**個体ベース(agent-based)**のパラダイムに立つのに対し、Continuum Crowd Modelはまったく異なる発想を取る——流体力学が水の流れを個々の水分子ではなく密度場・速度場として扱うように、**群衆全体を連続体(continuum)として扱い、空間全体の「移動コスト場」を一括で解いてから、各エージェントはその場を参照するだけで自分の進むべき方向を得る**。2006年にAdrien Treuille・Seth Cooper・Zoran Popovićが提案したこの手法は、群衆の密度が高くなるほど移動コストが上がるという相互作用をエージェント間のペアワイズな力ではなく空間全体のフィールドとして表現するため、数百〜数千人規模の密な群衆でもエージェント数に比例しない計算量でリアルな流れを生成できる。

## 仕組み

1. **環境の離散化**: シミュレーション対象の平面をグリッド(セル)に分割する。各セルは障害物か否か、そして現在その付近にいるエージェントの密度を保持する
2. **密度場・速度場の推定**: 各グリッドセルについて、近傍のエージェントの位置と速度から局所的な**群衆密度`ρ`**と**平均速度場**をカーネル(重み付き平均)で推定する。密度が高い領域ほど、実際に安全に歩ける速度の上限が下がる(密集した群衆ほど流れが遅くなるという実測に基づく速度-密度関係を使う)
3. **コスト場の構築**: 各セルを通過する「単位距離あたりのコスト」を、地形の移動コスト(基本コスト)・密度による減速コスト・目的地と逆行する向きへのペナルティを合成して定義する。密度が高いセルほど、そこを通るコストが高くなる
4. **Eikonal方程式を解く**: 「目的地からの最短到達コストの場(ポテンシャル場)」を、光の伝搬や波面の到達時間を表すEikonal方程式`|∇φ| = C(x)`(`C(x)`は位置`x`でのコスト、`φ`は目的地からの累積コスト)として定式化し、**Fast Marching Method**(波面をコストの低い側から順に確定させていくダイクストラ法に似たアルゴリズム)でグリッド全体について一括で解く
5. **勾配追従による移動**: 求めたコスト場`φ`の**負の勾配**`-∇φ`が、各地点における「最もコストの低い目的地への進行方向」を表す。各エージェントは自分がいるセル周辺の勾配を補間して読み取り、その方向へ1ステップ移動する。これは事前計算した場を参照するだけなので、エージェント数が増えても1体あたりの追加コストはほぼ一定
6. 目的地が複数ある(異なる目的地を持つ複数の群衆グループがいる)場合は、目的地ごとに別々のコスト場を計算し、各エージェントは自分の目的地に対応する場を参照する。密度場自体は全グループ共通で更新されるため、異なる目的地を持つ群衆同士が互いを避け合う相互作用も自然に表現できる

## 特性・トレードオフ

- **エージェント数に対するスケーラビリティ**: 個体ベースの手法(RVO・ソーシャルフォースモデル)はエージェントのペア同士の相互作用を計算するため素朴にはO(n²)に近いコストがかかるのに対し、Continuum Crowd Modelはグリッドの解像度に依存するコスト場の計算が支配的で、一度場を解けば**エージェント数によらずほぼ一定コストで各エージェントの移動方向を求められる**。数千人規模の密な群衆シーンに強い
- **密度依存の自然な渋滞表現**: 密度が高い領域は自動的に移動コストが上がるため、狭い出入口での自然な渋滞・迂回、密集地帯を避けて空いた経路を選ぶといった振る舞いが、個々のエージェントに複雑なルールを書かなくてもコスト場の解として現れる
- **グリッド解像度と場の更新頻度のトレードオフ**: 精度はグリッドの解像度に依存し、細かすぎるグリッドはコスト場の計算コストを増大させる。また群衆の分布は時々刻々変化するため、コスト場を毎フレーム再計算するか、数フレームおきの更新に間引いて精度と引き換えに計算量を抑えるかの調整が必要になる
- **個体固有の振る舞いの表現しづらさ**: 群衆を連続体として扱う都合上、個々のエージェントの個性(性格・反応速度・局所的な回避判断の癖)を表現しにくい。目立たせたい少数のキャラクターにはRVOやステアリング行動を個別に適用し、背景の群衆にはContinuum Crowd Modelを使うハイブリッド構成が実用上よく取られる
- **使いどころ**: 数百〜数千人規模の大規模群衆シーン(スタジアム・駅・都市シミュレーション)、リアルタイム性が求められるゲームでの背景群衆、避難シミュレーションにおける密度依存のボトルネック解析。個体ベースの[RVO](/algorithms/reciprocal-velocity-obstacles)・[ソーシャルフォースモデル](/algorithms/social-force-model)とは「個体を主語にするか、場を主語にするか」という計算パラダイムの違いとして対比される

## 実装例

簡略化した2Dグリッド上でのコスト場計算(Fast Marching Methodの代わりに、実装がより単純な反復緩和で近似する)と、勾配追従によるエージェント移動を示す。

```python
import math

Grid = list[list[float]]

def build_cost_field(
    walkable: list[list[bool]], density: list[list[float]], density_penalty: float = 4.0,
) -> Grid:
    """各セルの単位距離あたり移動コスト(壁=無限大、密度が高いほど高コスト)。"""
    rows, cols = len(walkable), len(walkable[0])
    cost = [[math.inf] * cols for _ in range(rows)]
    for y in range(rows):
        for x in range(cols):
            if walkable[y][x]:
                cost[y][x] = 1.0 + density_penalty * density[y][x]
    return cost


def solve_potential_field(cost: Grid, goal: tuple[int, int], iterations: int = 200) -> Grid:
    """Eikonal方程式|∇phi|=costを反復緩和で近似的に解く(簡易版、実運用ではFast Marching Methodを使う)。"""
    rows, cols = len(cost), len(cost[0])
    phi = [[math.inf] * cols for _ in range(rows)]
    gy, gx = goal
    phi[gy][gx] = 0.0

    for _ in range(iterations):
        changed = False
        for y in range(rows):
            for x in range(cols):
                if cost[y][x] == math.inf:
                    continue
                neighbors = []
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < rows and 0 <= nx < cols:
                        neighbors.append(phi[ny][nx])
                if not neighbors:
                    continue
                candidate = min(neighbors) + cost[y][x]
                if candidate < phi[y][x]:
                    phi[y][x] = candidate
                    changed = True
        if not changed:
            break
    return phi


def gradient_direction(phi: Grid, y: int, x: int) -> tuple[float, float]:
    """位置(x, y)における負の勾配方向(進むべき方向)。"""
    rows, cols = len(phi), len(phi[0])
    left = phi[y][x - 1] if x > 0 else phi[y][x]
    right = phi[y][x + 1] if x < cols - 1 else phi[y][x]
    up = phi[y - 1][x] if y > 0 else phi[y][x]
    down = phi[y + 1][x] if y < rows - 1 else phi[y][x]
    dx = -(right - left) / 2
    dy = -(down - up) / 2
    mag = math.hypot(dx, dy) or 1e-6
    return (dx / mag, dy / mag)
```

```typescript
type Grid = number[][];

function buildCostField(walkable: boolean[][], density: Grid, densityPenalty = 4.0): Grid {
  const rows = walkable.length;
  const cols = walkable[0].length;
  const cost: Grid = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (walkable[y][x]) cost[y][x] = 1.0 + densityPenalty * density[y][x];
    }
  }
  return cost;
}

function solvePotentialField(cost: Grid, goal: [number, number], iterations = 200): Grid {
  const rows = cost.length;
  const cols = cost[0].length;
  const phi: Grid = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));
  const [gy, gx] = goal;
  phi[gy][gx] = 0;

  for (let iter = 0; iter < iterations; iter++) {
    let changed = false;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (cost[y][x] === Infinity) continue;
        const neighbors: number[] = [];
        for (const [dy, dx] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const ny = y + dy,
            nx = x + dx;
          if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) neighbors.push(phi[ny][nx]);
        }
        if (neighbors.length === 0) continue;
        const candidate = Math.min(...neighbors) + cost[y][x];
        if (candidate < phi[y][x]) {
          phi[y][x] = candidate;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return phi;
}

function gradientDirection(phi: Grid, y: number, x: number): [number, number] {
  const rows = phi.length;
  const cols = phi[0].length;
  const left = x > 0 ? phi[y][x - 1] : phi[y][x];
  const right = x < cols - 1 ? phi[y][x + 1] : phi[y][x];
  const up = y > 0 ? phi[y - 1][x] : phi[y][x];
  const down = y < rows - 1 ? phi[y + 1][x] : phi[y][x];
  const dx = -(right - left) / 2;
  const dy = -(down - up) / 2;
  const mag = Math.hypot(dx, dy) || 1e-6;
  return [dx / mag, dy / mag];
}
```
