---
name: シェリングの分居モデル
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: 1ステップ O(セル数)(不満な主体の探索 + 空きセルの選択)
summary: 「自分と同じ種類の隣人が3割以上いれば満足」というわずかな選好だけで、格子上の住民が移動するうちに、はっきりと分かれた居住パターンが自然に生まれることを示す古典的モデル。
---

## 概要

都市に見られる人種や所得による居住の分断は、「同じ属性の人と暮らしたい」という強い偏見の結果だと考えるのが自然に思える。経済学者トーマス・シェリング(Thomas Schelling)は、1960年代末から1970年代初めにかけて、これを疑った。**個々人はそれほど強い選好を持っていなくても、全体では強く分離した状態が生まれうる**というのだ。

モデルは単純である。格子上のセルに、2種類の主体(たとえば赤と青)がまばらに住み、残りは空きセルにしておく。各主体は、隣り合う8セルの隣人のうち、自分と同じ種類の割合が閾値(たとえば 1/3)以上なら満足し、未満なら不満で、空きセルへ引っ越す。これだけで、最初はランダムに混ざっていたものが、数十ステップで同種のかたまりに分かれていく。個人の選好が「少数派になりすぎるのは嫌だ」という穏やかなものでも、集団の結果は「完全な分離」に近づく。この結果は、社会現象の全体像が個人の意図の総和では説明できない**創発**の代表例として、複雑系や社会シミュレーションの入門で必ず取り上げられる(シェリングは2005年にノーベル経済学賞を受賞したが、受賞理由はゲーム理論の分析を通じた対立と協調の理解への貢献で、このモデルはその研究の一部として知られる)。

## 仕組み

1. `N×N` の格子を用意する。各セルは「空き」「種類A」「種類B」のどれか。たとえば空きを10〜20%、残りをAとBに半々でランダムに配置する
2. 閾値 `t`(0〜1)を決める
3. 各ステップで、すべての主体について、周囲8セル(ムーア近傍)の隣人のうち、同種の割合 `同種 / (同種 + 異種)` を数える。隣人がいなければ満足とする
4. 割合が `t` 未満の主体を「不満」とする
5. 不満な主体を(順番をランダムに決めて)1つずつ、空きセルの1つ(ランダム、または最も近いもの)へ移す
6. 不満な主体がいなくなるか、一定のステップに達するまで、3〜5を繰り返す

結果の分離の度合いは、「全主体の同種の隣人の割合の平均」で測る。最初のランダム配置では約0.5前後だが、`t = 1/3` でも最終的には 0.65〜0.75 程度(実装例の乱数では0.68〜0.75)に上がる。

## 特性・トレードオフ

- **ミクロとマクロの食い違い**: 個人の選好(閾値)が低くても、全体の分離は強くなる。移動によって近隣の構成が変わると、それを見た別の人の満足度も連鎖的に変わるため、小さな偏りが増幅される
- **完全なセルオートマトンではない**: 状態の更新が近傍だけで決まる点は同じだが、移動先を「全体の空きセル」から選ぶので、更新は局所的ではない(エージェントベースモデルに近い)。この図鑑では、格子上の局所ルールの代表例として、セルオートマトンの項に置いている
- **現実の説明には慎重に**: モデルは「分離が起こりうる」ことを示す思考実験で、実際の都市の分断の原因(差別的な制度、住宅価格、歴史)を再現するものではない。シェリング自身も、これで差別を許容してよいとは述べていない
- **パラメータへの敏感さ**: 閾値が低すぎると動かず、高すぎると誰も満足できず永遠に動き続ける。空きセルの割合も、動きやすさに影響する
- **使いどころ**: 社会シミュレーションの入門、エージェントベースモデリングの基本課題、創発現象の教材、ゲームでの住民配置の自然な分布の生成

## 実装例

```python
import random

EMPTY = 0


def make_grid(n, empty_ratio, seed):
    rng = random.Random(seed)
    cells = [EMPTY] * int(n * n * empty_ratio)
    rest = n * n - len(cells)
    cells += [1] * (rest // 2) + [2] * (rest - rest // 2)
    rng.shuffle(cells)
    return [cells[i * n:(i + 1) * n] for i in range(n)], rng


def same_ratio(grid, r, c):
    n = len(grid)
    me = grid[r][c]
    same = other = 0
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if (dr, dc) == (0, 0):
                continue
            v = grid[(r + dr) % n][(c + dc) % n]  # 端はつながっている(トーラス)
            if v == EMPTY:
                continue
            if v == me:
                same += 1
            else:
                other += 1
    return 1.0 if same + other == 0 else same / (same + other)


def mean_similarity(grid):
    n = len(grid)
    ratios = [same_ratio(grid, r, c) for r in range(n) for c in range(n) if grid[r][c] != EMPTY]
    return sum(ratios) / len(ratios)


def step(grid, threshold, rng):
    n = len(grid)
    unhappy = [(r, c) for r in range(n) for c in range(n)
               if grid[r][c] != EMPTY and same_ratio(grid, r, c) < threshold]
    rng.shuffle(unhappy)
    for r, c in unhappy:
        empties = [(i, j) for i in range(n) for j in range(n) if grid[i][j] == EMPTY]
        i, j = rng.choice(empties)
        grid[i][j], grid[r][c] = grid[r][c], EMPTY
    return len(unhappy)


grid, rng = make_grid(20, 0.15, seed=1)
print("最初の同種の隣人の割合:", round(mean_similarity(grid), 3))
for t in range(100):
    if step(grid, 1 / 3, rng) == 0:
        break
print(f"{t}ステップ後:", round(mean_similarity(grid), 3))
```

```typescript
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const EMPTY = 0;

function shuffle<T>(a: T[], rng: () => number): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function makeGrid(
  n: number,
  emptyRatio: number,
  rng: () => number,
): number[][] {
  const empties = Math.floor(n * n * emptyRatio);
  const rest = n * n - empties;
  const cells = [
    ...new Array(empties).fill(EMPTY),
    ...new Array(Math.floor(rest / 2)).fill(1),
    ...new Array(rest - Math.floor(rest / 2)).fill(2),
  ];
  shuffle(cells, rng);
  return Array.from({ length: n }, (_, i) => cells.slice(i * n, (i + 1) * n));
}

function sameRatio(grid: number[][], r: number, c: number): number {
  const n = grid.length;
  let same = 0;
  let other = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const v = grid[(r + dr + n) % n][(c + dc + n) % n];
      if (v === EMPTY) continue;
      if (v === grid[r][c]) same++;
      else other++;
    }
  }
  return same + other === 0 ? 1 : same / (same + other);
}

function meanSimilarity(grid: number[][]): number {
  const ratios: number[] = [];
  grid.forEach((row, r) =>
    row.forEach((v, c) => v !== EMPTY && ratios.push(sameRatio(grid, r, c))),
  );
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

function step(grid: number[][], threshold: number, rng: () => number): number {
  const n = grid.length;
  const unhappy: [number, number][] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++)
      if (grid[r][c] !== EMPTY && sameRatio(grid, r, c) < threshold)
        unhappy.push([r, c]);
  }
  shuffle(unhappy, rng);
  for (const [r, c] of unhappy) {
    const empties: [number, number][] = [];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (grid[i][j] === EMPTY) empties.push([i, j]);
    const [i, j] = empties[Math.floor(rng() * empties.length)];
    grid[i][j] = grid[r][c];
    grid[r][c] = EMPTY;
  }
  return unhappy.length;
}

const rng = makeRng(1);
const grid = makeGrid(20, 0.15, rng);
console.log("最初:", meanSimilarity(grid).toFixed(3));
for (let t = 0; t < 100; t++) if (step(grid, 1 / 3, rng) === 0) break;
console.log("収束後:", meanSimilarity(grid).toFixed(3));
```
