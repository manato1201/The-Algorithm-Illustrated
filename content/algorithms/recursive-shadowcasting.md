---
name: 再帰的シャドウキャスティング(視界計算)
category: キャラクターAI・空間AI
subcategory: 空間認識・知覚
complexity: O(視界に入るセル数)(各セルをほぼ1回だけ調べる)
summary: グリッド上の1点から、壁で遮られる影の傾きの範囲を再帰的に狭めながら、見えるセルだけをなぞる。ローグライクの視界(FOV)計算の定番。
---

## 概要

グリッドを使うゲーム(ローグライク、タクティクス)では、プレイヤーや敵の「視界」を計算する必要がある。壁の向こうは見えない、柱の影になった床は見えない、というルールで、どのセルが見えるかを決める。素朴には、見たい各セルまで直線を引いて途中に壁がないかを調べる(レイキャスト)が、セルごとに線を引くので、見える範囲が広いと重くなり、セルの端の扱いによって見え方が非対称になったりする。

再帰的シャドウキャスティング(Björn Bergströmらがローグライクの開発者コミュニティで整理した方法として知られる)は、**壁が作る「影」を、傾きの範囲(スロープ)として管理しながら、視界の中心から外側へ、行ごとにセルをなぞる**。壁に出会うと、その後ろの影の範囲を避けるように、視界を2つに分けて再帰する。各セルを(ほぼ)1回だけ処理するので速く、結果も安定する。

## 仕組み

視点を原点に、平面を**8つの八分円**に分ける(各八分円は、斜め45度の扇形)。八分円ごとに座標を変換して、同じ処理を使い回す。1つの八分円の中では:

1. 視点から距離 `row = 1, 2, 3, ...` の行を順に処理する。見える範囲を、2つのスロープ `start`(広い側、最初は1.0)と `end`(狭い側、最初は0.0)で表す
2. 各行で、`start` から `end` の範囲に入るセルだけを調べる。セルの左右の端の傾き(`(dx − 0.5)/(dy + 0.5)`、`(dx + 0.5)/(dy − 0.5)`)を計算して、範囲に重なるかを判断する
3. 範囲に入ったセルは「見える」とする(半径の範囲内なら)
4. **壁に当たったとき**: そのセルの手前までの範囲(`start` から壁の広い側の傾き)について、1つ先の行以降を**再帰**で処理する。その後、壁の狭い側の傾きを新しい `start` にして、現在の行の残りを続ける。壁が途切れたら、その位置から新しい範囲を始める
5. 範囲が空(`start < end`)になったら、その枝は終了する

セルの中心ではなく、**セルの角から角までの傾き**を使うので、「壁の端のセルがわずかに見える」ような自然な見え方になる。

## 特性・トレードオフ

- **速い**: 各セルを1回(あるいは少数回)調べるだけで、見える全セルが分かる。大きな視界でも、セルごとにレイを飛ばすより軽い
- **対称性の問題**: 「AからBが見える」ことと「BからAが見える」ことが一致しない場合がありうる(壁の角の扱いによる)。厳密な対称性が必要なゲームでは、別の方式(Permissive FOV など)を使うか、結果を後処理する
- **壁は「セル単位」で扱う**: 斜めの壁や、半分だけ遮る障害物は、そのままでは扱えない。細かい形状が必要なら、細かい格子にするか、連続空間のレイキャストを使う
- **八分円の座標変換**: 8方向の変換行列で同じコードを再利用する実装が一般的で、符号のミスがバグの元になる。小さな部屋で、左右・上下対称になるかを確認するとよい
- **半径による打ち切り**: 距離の二乗で視界の半径を制限する。円形の視界にしたいか、正方形でよいかを選べる
- **使いどころ**: ローグライクの視界と「戦場の霧」、敵AIの視認判定、タクティクスの射線、部屋の照明の可視範囲

## 実装例

```python
MULT = [
    [1, 0, 0, -1, -1, 0, 0, 1],
    [0, 1, -1, 0, 0, -1, 1, 0],
    [0, 1, 1, 0, 0, -1, -1, 0],
    [1, 0, 0, 1, -1, 0, 0, -1],
]


def field_of_view(grid, ox, oy, radius):
    """grid[y][x] が '#' なら壁。(ox, oy) から見えるセルの集合を返す。"""
    h, w = len(grid), len(grid[0])
    visible = {(ox, oy)}

    def is_wall(x, y):
        return not (0 <= x < w and 0 <= y < h) or grid[y][x] == "#"

    def cast(row, start, end, xx, xy, yx, yy):
        if start < end:
            return
        new_start = start
        for j in range(row, radius + 1):
            dx, dy = -j - 1, -j
            blocked = False
            while dx <= 0:
                dx += 1
                x, y = ox + dx * xx + dy * xy, oy + dx * yx + dy * yy
                l_slope, r_slope = (dx - 0.5) / (dy + 0.5), (dx + 0.5) / (dy - 0.5)
                if start < r_slope:
                    continue
                if end > l_slope:
                    break
                if dx * dx + dy * dy <= radius * radius and 0 <= x < w and 0 <= y < h:
                    visible.add((x, y))
                if blocked:
                    if is_wall(x, y):
                        new_start = r_slope
                    else:
                        blocked = False
                        start = new_start
                elif is_wall(x, y) and j < radius:
                    blocked = True
                    cast(j + 1, start, l_slope, xx, xy, yx, yy)
                    new_start = r_slope
            if blocked:
                break

    for octant in range(8):
        cast(1, 1.0, 0.0, MULT[0][octant], MULT[1][octant], MULT[2][octant], MULT[3][octant])
    return visible


room = [
    "###########",
    "#.........#",
    "#...#.....#",
    "#...#.....#",
    "#.........#",
    "###########",
]
seen = field_of_view(room, 2, 3, 8)
for y, row in enumerate(room):
    print("".join("@" if (x, y) == (2, 3) else ("o" if (x, y) in seen and c == "." else c) for x, c in enumerate(row)))
# 柱('#')の後ろの影になる床は見えない('.' のまま)
```

```typescript
const MULT = [
  [1, 0, 0, -1, -1, 0, 0, 1],
  [0, 1, -1, 0, 0, -1, 1, 0],
  [0, 1, 1, 0, 0, -1, -1, 0],
  [1, 0, 0, 1, -1, 0, 0, -1],
];

function fieldOfView(grid: string[], ox: number, oy: number, radius: number): Set<string> {
  const h = grid.length;
  const w = grid[0].length;
  const visible = new Set<string>([`${ox},${oy}`]);
  const inBounds = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h;
  const isWall = (x: number, y: number) => !inBounds(x, y) || grid[y][x] === "#";

  const cast = (row: number, start: number, end: number, xx: number, xy: number, yx: number, yy: number): void => {
    if (start < end) return;
    let newStart = start;
    for (let j = row; j <= radius; j++) {
      let dx = -j - 1;
      const dy = -j;
      let blocked = false;
      while (dx <= 0) {
        dx++;
        const x = ox + dx * xx + dy * xy;
        const y = oy + dx * yx + dy * yy;
        const lSlope = (dx - 0.5) / (dy + 0.5);
        const rSlope = (dx + 0.5) / (dy - 0.5);
        if (start < rSlope) continue;
        if (end > lSlope) break;
        if (dx * dx + dy * dy <= radius * radius && inBounds(x, y)) visible.add(`${x},${y}`);
        if (blocked) {
          if (isWall(x, y)) newStart = rSlope;
          else {
            blocked = false;
            start = newStart;
          }
        } else if (isWall(x, y) && j < radius) {
          blocked = true;
          cast(j + 1, start, lSlope, xx, xy, yx, yy);
          newStart = rSlope;
        }
      }
      if (blocked) break;
    }
  };

  for (let o = 0; o < 8; o++) cast(1, 1.0, 0.0, MULT[0][o], MULT[1][o], MULT[2][o], MULT[3][o]);
  return visible;
}

const room = [
  "###########",
  "#.........#",
  "#...#.....#",
  "#...#.....#",
  "#.........#",
  "###########",
];
const seen = fieldOfView(room, 2, 3, 8);
room.forEach((row, y) =>
  console.log([...row].map((c, x) => (x === 2 && y === 3 ? "@" : seen.has(`${x},${y}`) && c === "." ? "o" : c)).join("")),
);
```
