---
name: ブライアンの脳(Brian's Brain)
category: シミュレーション・群知能
subcategory: セルオートマトン
complexity: O(セル数)(1世代)
summary: 「発火」「消えかけ」「静止」の3状態を持ち、発火セルが必ず1ステップで消えかけに遷移するため定常パターンが存在せず、常に揺らめき続けるセルオートマトン。
---

## 概要

[ライフゲーム](/algorithms/conways-game-of-life)は生死2状態のセルが「生き続ける」ことができるため、静止物体や振動子のような**安定したパターン**が数多く存在する。それに対しブライアンの脳は、1990年代初頭にブライアン・シルバーマン(WireWorldの考案者でもある)が考案した3状態のセルオートマトンで、決定的な違いを持つ——**発火したセルは、周囲の状況に関わらず必ず次の世代で「消えかけ」になる**というルールがあるため、どんな初期配置を与えても、いつまでも同じ形のまま留まり続けるパターンは(全セルが静止状態の自明な場合を除いて)存在し得ない。この「強制的な減衰」の仕組みにより、盤面は絶えず明滅と伝播を繰り返す、神経細胞の発火が脳内を駆け巡るような落ち着きのない視覚的パターンを生み出す。名前の「脳」はこのちらつきが神経活動を連想させることに由来する。

## 仕組み

各セルは次の3状態のいずれかを取る。

- **発火(on)**: 今まさに発火しているセル
- **消えかけ(dying / refractory)**: 発火した直後、1世代だけ経由する「冷却期間」の状態
- **静止(off)**: 何も起きていない休止状態

全セルについて、8近傍(上下左右斜め)を参照しながら**同時に**次の状態を計算する遷移規則は以下の通り。

| 現在の状態 | 条件                       | 次の状態   |
| ---------- | -------------------------- | ---------- |
| 発火       | 常に                       | 消えかけ   |
| 消えかけ   | 常に                       | 静止       |
| 静止       | 8近傍のうち発火がちょうど2 | 発火       |
| 静止       | それ以外(2以外)            | 静止のまま |

ここでの核心は最初の2行——**発火セルには「生き続ける」という選択肢が一切与えられていない**点にある。ライフゲームの「過疎」「生存」「過密」のようなセルの寿命に関する条件分岐は存在せず、発火は必ず1世代限りで終わり、消えかけを経て静止に戻る。誕生条件も「近傍がちょうど2」という単一の値のみで、ライフゲームの「2か3」よりも狭い。この単純さと強制減衰の組み合わせが、後述する「定常パターンが原理的に存在しない」という特性を生む。

## 特性・トレードオフ

- **計算量**: 1世代の更新は全セル数に比例するO(セル数)。近傍の発火数を数えるだけの軽量な処理で、[ライフゲーム](/algorithms/conways-game-of-life)や[WireWorld](/algorithms/wireworld)と同様のコストで実装できる
- **定常パターンが存在しない**: 発火セルが例外なく1ステップで消えかけに遷移する規則上、あるセルが「発火」状態のまま2世代以上とどまることは決してない。ライフゲームには不変のまま存在し続ける「静止物体」があるが、ブライアンの脳には(全セルが恒久的に静止のままという自明なケースを除き)そうした固定点が存在せず、有限の盤面でも多くの初期配置がグライダーのような伝播パターンや、消えては生まれるちらつきを永続的に繰り返す
- **消えかけ状態が担う不応期**: 発火直後に即座に静止へ戻さず1世代の消えかけを挟むのは、神経細胞の不応期(発火直後は再発火しにくい期間)を模した設計であり、これによって同じ場所で発火が無秩序に連鎖するのを防ぎ、パターンが規則的な伝播構造(すり抜けるように移動する「グライダー」的な塊)を持ちやすくなる
- **[WireWorld](/algorithms/wireworld)との対比**: どちらも3〜4状態・「冷却期間」を持つ点で似ているが、WireWorldは導体上を電子ヘッドが一方向に伝播するよう**設計されている**ため回路として機能するのに対し、ブライアンの脳は近傍数のみに基づく対称的な規則であり、意図的な回路設計よりもランダムな初期配置からのカオス的で予測しづらい明滅パターンの観察に向く
- **使いどころ**: セルオートマトンにおける「安定性の欠如」そのものを教材として示すデモンストレーション、ジェネラティブアート・スクリーンセーバー的な視覚表現、複雑系における永続的な非平衡状態の単純なモデルとして

## 実装例

セルの状態は `0=静止, 1=発火, 2=消えかけ` の整数で表す。

```python
OFF, ON, DYING = 0, 1, 2


def brians_brain_step(grid: list[list[int]]) -> list[list[int]]:
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    next_grid = [[OFF] * cols for _ in range(rows)]

    for r in range(rows):
        for c in range(cols):
            cell = grid[r][c]
            if cell == ON:
                next_grid[r][c] = DYING
            elif cell == DYING:
                next_grid[r][c] = OFF
            else:  # OFF
                on_neighbors = 0
                for dr in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        if dr == 0 and dc == 0:
                            continue
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == ON:
                            on_neighbors += 1
                next_grid[r][c] = ON if on_neighbors == 2 else OFF

    return next_grid
```

```typescript
const OFF = 0;
const ON = 1;
const DYING = 2;

function briansBrainStep(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const next: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(OFF),
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell === ON) {
        next[r][c] = DYING;
      } else if (cell === DYING) {
        next[r][c] = OFF;
      } else {
        let onNeighbors = 0;
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
              grid[nr][nc] === ON
            ) {
              onNeighbors++;
            }
          }
        }
        next[r][c] = onNeighbors === 2 ? ON : OFF;
      }
    }
  }

  return next;
}
```
