---
name: WireWorld(論理回路セルオートマトン)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(セル数)(1世代)
summary: 絶縁体・導体・電子ヘッド・電子尾の4状態だけからなる単純な遷移規則で、論理ゲートやメモリまで組み上げられるほど表現力の高いセルオートマトン。
---

## 概要

[ライフゲーム](/algorithms/conways-game-of-life)が「生・死」の2状態から複雑なパターンを生み出したのに対し、WireWorldは1987年にブライアン・シルバーマンが考案した、4状態だけを持つセルオートマトンでありながら、**電子部品の配線や論理ゲートをそのまま模倣できる**という際立った特徴を持つ。セルは「絶縁体」「導体」「電子ヘッド」「電子尾」のいずれかの状態を取り、導体上を電子ヘッドが伝播していく様子はまるで実際の電線を電流が流れるかのように見える。この性質を利用して、AND・OR・NOTといった論理ゲートや、ダイオード、さらにはクロック信号までもがWireWorld上の「回路図」として構築されており、計算機科学の教育やチューリング完全性のデモンストレーションの題材として広く使われている。

## 仕組み

各セルは次の4状態のいずれかを取る。

- **絶縁体(空白)**: 何もない背景。常に絶縁体のまま
- **導体**: 電気を通す「配線」。電子が伝播する経路になる
- **電子ヘッド**: 電子の先頭。導体上を1世代ごとに1マスずつ伝播していく
- **電子尾**: 電子ヘッドが通過した直後の状態。電子ヘッドを再び発火可能にするための「冷却期間」の役割を持つ

全セルについて、8近傍(上下左右斜め)を参照しながら**同時に**次の状態を計算する遷移規則は以下の通り。

| 現在の状態 | 条件                                        | 次の状態         |
| ---------- | ------------------------------------------- | ---------------- |
| 絶縁体     | 常に                                        | 絶縁体のまま     |
| 電子ヘッド | 常に                                        | 電子尾になる     |
| 電子尾     | 常に                                        | 導体になる       |
| 導体       | 8近傍のうち電子ヘッドの数がちょうど1または2 | 電子ヘッドになる |
| 導体       | それ以外(0個、または3個以上)                | 導体のまま       |

導体→電子ヘッドの条件が「1個または2個」に限定されている点が回路として機能するための核心である。もし導体の隣に電子ヘッドが1つだけあれば素直に伝播するが、**2本の配線が合流する地点では、両方から同時に電子ヘッドが来ると2個になり伝播が続き、片方だけなら1個で伝播する一方、3方向から同時に来ると発火しない**——この非対称性を利用して、複数の入力配線を組み合わせるAND/ORゲートが設計できる。電子尾を挟む2世代の「冷却期間」があるおかげで、電子ヘッドが自分自身を追い越して暴走することもなく、規則的なパルス列として配線上を安定して伝播する。

## 特性・トレードオフ

- **計算量**: [ライフゲーム](/algorithms/conways-game-of-life)と同様、1世代の更新は全セル数に比例するO(セル数)。ただし各セルの遷移判定自体は近傍の電子ヘッド数を数えるだけの軽量な処理
- **チューリング完全性**: 導体の分岐・合流だけでAND・OR・NOTゲートとダイオード(一方向にしか電子を通さない配線)を構成できることが示されており、これらを組み合わせれば任意の論理回路——ひいては汎用計算機——をWireWorld上に構築できる。実際にWireWorld上で動作するCPUの実装例も存在する
- **ライフゲームとの対比**: ライフゲームが生死の集団的なバランス(近傍数)から創発的なパターンが生まれるのに対し、WireWorldは4状態と明確な「伝播」の概念を持つため、**設計者が意図した通りの回路を組み立てやすい**。ランダムな初期配置からの偶然の発見よりも、意図的な回路設計に向いたセルオートマトンと言える
- **使いどころ**: 論理回路・計算機科学の教育的デモンストレーション、セルオートマトンの計算能力(チューリング完全性)を実演する題材、離散的なシステムでの信号伝播や回路設計のシミュレーション、パズルゲームの内部エンジン(WireWorld自体をベースにしたパズルも存在する)

## 実装例

セルの状態は `0=絶縁体, 1=電子ヘッド, 2=電子尾, 3=導体` の整数で表す。

```python
EMPTY, HEAD, TAIL, CONDUCTOR = 0, 1, 2, 3


def wireworld_step(grid: list[list[int]]) -> list[list[int]]:
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    next_grid = [[EMPTY] * cols for _ in range(rows)]

    for r in range(rows):
        for c in range(cols):
            cell = grid[r][c]
            if cell == EMPTY:
                next_grid[r][c] = EMPTY
            elif cell == HEAD:
                next_grid[r][c] = TAIL
            elif cell == TAIL:
                next_grid[r][c] = CONDUCTOR
            else:  # CONDUCTOR
                head_neighbors = 0
                for dr in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        if dr == 0 and dc == 0:
                            continue
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == HEAD:
                            head_neighbors += 1
                next_grid[r][c] = HEAD if head_neighbors in (1, 2) else CONDUCTOR

    return next_grid
```

```typescript
const EMPTY = 0;
const HEAD = 1;
const TAIL = 2;
const CONDUCTOR = 3;

function wireworldStep(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const next: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(EMPTY),
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell === EMPTY) {
        next[r][c] = EMPTY;
      } else if (cell === HEAD) {
        next[r][c] = TAIL;
      } else if (cell === TAIL) {
        next[r][c] = CONDUCTOR;
      } else {
        let headNeighbors = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (
              nr >= 0 &&
              nr < rows &&
              nc >= 0 &&
              nc < cols &&
              grid[nr][nc] === HEAD
            ) {
              headNeighbors++;
            }
          }
        }
        next[r][c] =
          headNeighbors === 1 || headNeighbors === 2 ? HEAD : CONDUCTOR;
      }
    }
  }

  return next;
}
```
