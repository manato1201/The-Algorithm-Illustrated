---
name: じゃんけんセルオートマトン(循環優性モデル)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(セル数)(1世代)
summary: グー・チョキ・パーのように3種の個体が循環的な優劣関係を持つMay-Leonardモデルで、非推移的な競争関係だけから渦巻き状のパターンが自己組織化する様子を再現するセルオートマトン。
---

## 概要

自然界には、種Aが種Bに強く、種Bが種Cに強く、それでいて種Cが種Aに強いという、じゃんけんのグー・チョキ・パーのような**循環的な(非推移的な)優劣関係**を持つ生態系が実際に存在する——例えばカリフォルニアの一部のトカゲの個体群や、一部の微生物のバクテリオシン産生株の競争関係で観測されている。1975年に生態学者Robert MayとWarren Leonardが定式化した数理モデル(May-Leonardモデル)を格子上のセルオートマトンとして実装したのが、じゃんけんセルオートマトンである。[ライフゲーム](/algorithms/conways-game-of-life)が「生死」という単純な2状態から複雑なパターンを生むのに対し、このモデルは「3すくみ」という循環的な競争関係**だけ**から、時間とともに広がっていく美しい渦巻き状のパターンが自然発生することを示す、非平衡系の自己組織化の代表例として知られている。

## 仕組み

各セルは次のいずれかの状態を取る。

- **グー(0)**: 種0の個体、または空白マス(実装によっては明示的な「空白」状態を別に持つ変種もある)
- **チョキ(1)**: 種1の個体
- **パー(2)**: 種2の個体

優劣関係は循環的に定義される——**グーはチョキに勝ち、チョキはパーに勝ち、パーはグーに勝つ**。各世代の更新は、[ライフゲーム](/algorithms/conways-game-of-life)のように全セルを一斉に計算する方式ではなく、確率的なセル単位の相互作用を多数回繰り返す方式が典型的に使われる。

1. 盤面上のセルをランダムに1つ選ぶ(注目セル)
2. その8近傍(または4近傍)からランダムに1つの近傍セルを選ぶ
3. **捕食判定**: 注目セルの種が近傍セルの種に「勝つ」関係にあれば(例: 注目セルがグー、近傍がチョキ)、一定の確率で近傍セルを注目セルと同じ種に置き換える(捕食による増殖)
4. これを盤面のセル数に比例する回数だけ繰り返して「1世代」とみなす(非同期更新)

同期更新([ライフゲーム](/algorithms/conways-game-of-life)や[WireWorld](/algorithms/wireworld)のように全セルを一斉に更新する方式)で実装する変種もあり、その場合は各セルが近傍のうち自分より優位な種の数・自分が優位に立てる種の数を数え、優位な近傍が一定数以上いれば置き換えられる、といった規則を用いる。いずれの方式でも、**どの種も他の2種のうち一方には勝ち一方には負ける**という循環構造そのものが、特定の種が盤面全体を支配することを妨げ、絶えず変化し続ける動的なパターンを生み出す。

## 特性・トレードオフ

- **計算量**: 非同期更新の場合、1世代相当の更新(セル数に比例する回数の相互作用)はO(セル数)。同期更新方式でも各セルの近傍参照はO(1)なので、全体としてO(セル数)は共通する
- **循環優性による渦巻きパターンの自己組織化**: 3種のうちどれか1種が優勢になると、その種を捕食する種(=その種に負ける種)が局所的に増殖しやすくなり、逆にその種はさらに別の種に押し戻される、という循環的なフィードバックが、時間の経過とともに回転する渦巻き状のパターン(スパイラルウェーブ)を自然に生み出す。これは化学反応系のBelousov-Zhabotinsky反応で見られる渦巻きパターンとも類似した現象として研究されている
- **どの種も絶滅しない多様性の維持**: 推移的な優劣関係(AがBに勝ち、BがCに勝ち、AもCに勝つ)であればいずれ最強の種が盤面を支配して終わるが、循環的な優劣関係では「一人勝ち」が構造的に起こりにくく、生物多様性が長期にわたって維持されるモデルとして、生態学における非推移的競争(intransitive competition)の理論的な説明に用いられる
- **[ライフゲーム](/algorithms/conways-game-of-life)との対比**: ライフゲームが単一種の生死という状態遷移から複雑性を生むのに対し、このモデルは複数種間の**相互作用の非対称性(誰が誰に勝つか)**そのものから複雑なパターンが生まれる点が対照的であり、セルオートマトンにおける複雑性の源泉が「遷移規則の精緻さ」だけでなく「主体間の関係構造」にもあり得ることを示す好例
- **使いどころ**: 生態学における種間競争・生物多様性維持メカニズムの教育的シミュレーション、非平衡統計物理における自己組織化パターンの研究、ゲーム理論における非推移的な戦略関係(じゃんけん型のゲーム理論モデル)の可視化、ジェネラティブアートの題材

## 実装例

セルの状態は `0=グー, 1=チョキ, 2=パー` の整数で表す。`beats(a, b)`は「aがbに勝つか」を判定する関数で、非同期のランダムな相互作用を1世代あたりセル数回繰り返す。

```python
import random


def beats(a: int, b: int) -> bool:
    # 0(グー)は1(チョキ)に勝つ、1(チョキ)は2(パー)に勝つ、2(パー)は0(グー)に勝つ
    return (a - b) % 3 == 1


def rps_step(
    grid: list[list[int]], rng: random.Random, capture_prob: float = 1.0
) -> list[list[int]]:
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    next_grid = [row[:] for row in grid]
    n_interactions = rows * cols

    for _ in range(n_interactions):
        r, c = rng.randrange(rows), rng.randrange(cols)
        dr, dc = rng.choice([(-1, 0), (1, 0), (0, -1), (0, 1)])
        nr, nc = (r + dr) % rows, (c + dc) % cols  # 周期境界

        me, neighbor = next_grid[r][c], next_grid[nr][nc]
        if beats(me, neighbor) and rng.random() < capture_prob:
            next_grid[nr][nc] = me

    return next_grid
```

```typescript
function beats(a: number, b: number): boolean {
  // 0(グー)は1(チョキ)に勝つ、1(チョキ)は2(パー)に勝つ、2(パー)は0(グー)に勝つ
  return (a - b + 3) % 3 === 1;
}

function rpsStep(
  grid: number[][],
  rand: () => number = Math.random,
  captureProb = 1.0,
): number[][] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const next = grid.map((row) => [...row]);
  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const nInteractions = rows * cols;

  for (let k = 0; k < nInteractions; k++) {
    const r = Math.floor(rand() * rows);
    const c = Math.floor(rand() * cols);
    const [dr, dc] = directions[Math.floor(rand() * directions.length)];
    const nr = (r + dr + rows) % rows; // 周期境界
    const nc = (c + dc + cols) % cols;

    const me = next[r][c];
    const neighbor = next[nr][nc];
    if (beats(me, neighbor) && rand() < captureProb) {
      next[nr][nc] = me;
    }
  }

  return next;
}
```
