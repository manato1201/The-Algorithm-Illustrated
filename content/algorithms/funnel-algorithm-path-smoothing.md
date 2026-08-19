---
name: ファネルアルゴリズムによる経路平滑化(Funnel Algorithm / String Pulling)
category: キャラクターAI・空間AI
subcategory: 空間認識・知覚
complexity: O(n)(nは経路が通過する三角形の数)
summary: ナビゲーションメッシュの三角形の連なりから、各三角形の共有辺を狭めていく「漏斗(ファネル)」の操作で、ジグザグしない視認上自然な最短の直線的経路を復元する後処理アルゴリズム。
---

## 概要

[ナビゲーションメッシュ生成](/algorithms/navmesh-generation)で得られた三角形メッシュの上で[A*探索](/algorithms/a-star)を実行すると、得られる結果は「スタート地点からゴール地点までに、どの三角形をどの順で通過するか」という**三角形の列**でしかない。これを素朴に各三角形の中心点を直線でつないで経路とすると、実際には障害物がなく直進できる区間でもジグザグした不自然な経路になってしまう。ファネルアルゴリズム(通称String Pulling、「紐を引っ張る」の意)は、この三角形の列から、視認上自然でかつ幾何学的に最短の**折れ線経路**を復元する後処理手法である。名前の由来は、経路を「漏斗(ファネル)」に見立て、通過する三角形の共有辺を順に見ていきながら漏斗の開口部を狭めていく操作にある。NavMeshベースの経路探索を採用するほぼ全てのゲームエンジン・ミドルウェアで標準的に使われている。

## 仕組み

1. **共有辺(ポータル)の列を作る**: A*が求めた三角形の列から、隣接する三角形同士が共有する辺を順番に取り出す。この辺は「次の三角形へ抜けるための通過口」という意味で**ポータル**と呼ばれる。各ポータルは左端点`left`と右端点`right`のペアとして表される
2. **ファネルの初期化**: スタート地点を「頂点(apex)」とし、暫定的な左の境界線`left_leg`・右の境界線`right_leg`をどちらもスタート地点自身に初期化する
3. **各ポータルを順に処理する**: 新しいポータルの左端点`left`・右端点`right`について、それぞれがファネルを**狭める方向**に動くか**広げる方向**に動くかを、頂点から見た外積(左右判定)で調べる
   - 新しい右端点がファネルの右側の境界を狭める(内側に入る)場合、右の境界線を更新する。もし更新後の右の境界線が左の境界線を追い越してしまったら、これは「左の境界線が確定した経路の頂点である」ことを意味する。左の境界線の先端(=左端点)を経路に確定して新たな頂点(apex)とし、その頂点からファネルを再構築して処理をやり直す
   - 左側についても対称に同じ処理を行う
   - どちらの境界も追い越されなければ、狭まった方向だけを更新してそのまま次のポータルへ進む
4. **ゴール地点の処理**: 最後のポータル(ゴールそのもの)まで処理を終えたら、ゴール地点を経路の最後の点として確定する
5. 確定された頂点(apex)の列が、そのまま「視認上自然で最短な」折れ線経路になる。各三角形内部は障害物がないことがナビゲーションメッシュの性質上保証されているため、こうして得た経路は隣接する頂点間を直線で結んでも障害物と交差しないことが幾何学的に保証される

## 特性・トレードオフ

- **線形時間で最短の折れ線経路を復元**: 通過する三角形の数`n`に対してO(n)というA*探索本体よりずっと軽い後処理コストで、視覚的にも自然でかつ数学的にも(与えられた三角形の列を通過する経路の中で)最短な折れ線経路を得られる。三角形の中心点をつなぐだけの素朴な方法と比べて、ジグザグの解消による見た目の改善だけでなく実際の移動距離も短縮される
- **[ナビゲーションメッシュ](/algorithms/navmesh-generation)との組み合わせが前提**: ファネルアルゴリズムは「各三角形の内部は障害物なしで直進できる」という凸多角形メッシュの性質に強く依存しており、[ウェイポイントグラフ](/algorithms/waypoint-graph-navigation)のような疎なグラフ表現には(そのままでは)適用できない。NavMesh上の経路探索とセットで使われる後処理として位置づけられる
- **三角形列の質への依存**: ファネルアルゴリズムが復元できるのはあくまで「A*が選んだ三角形の列の中での最短経路」であり、A*が別の(より短い経路につながる)三角形列を選んでいれば結果も変わる。したがって最終的な経路の質はA*の探索結果(どの三角形を通るか)にも依存する
- **後処理としての位置づけ**: このアルゴリズムはあくまで「グラフ探索で得た粗い経路を、実際に移動可能な滑らかな経路に変換する」役割であり、動的な障害物回避([RVO](/algorithms/reciprocal-velocity-obstacles)など)や局所的な操舵([ステアリング行動](/algorithms/steering-behaviors)のarrive/seek)は別レイヤーで扱う必要がある。パイプラインとしては「NavMesh生成 → A*で三角形列を求める → ファネルアルゴリズムで折れ線経路に変換 → ステアリング行動/RVOで実際に移動」という多層構成になるのが一般的
- **使いどころ**: NavMeshベースの経路探索を行う3Dゲームのキャラクター移動全般(事実上の標準的な後処理)、ロボティクスにおける三角形分割された自由空間上の経路平滑化

## 実装例

```python
Vec2 = tuple[float, float]

def _cross(o: Vec2, a: Vec2, b: Vec2) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def funnel(start: Vec2, goal: Vec2, portals: list[tuple[Vec2, Vec2]]) -> list[Vec2]:
    """portalsは三角形列の共有辺の(left, right)のリスト。最後にgoalそのものを含む1点のポータルを渡す想定。"""
    path = [start]
    apex, left, right = start, start, start
    apex_idx = left_idx = right_idx = 0

    all_portals = [(start, start)] + portals + [(goal, goal)]

    i = 1
    while i < len(all_portals):
        pl, pr = all_portals[i]

        # 右側の更新
        if _cross(apex, right, pr) <= 0.0:
            if apex == right or _cross(apex, left, pr) > 0.0:
                right = pr
                right_idx = i
            else:
                path.append(left)
                apex, right = left, left
                apex_idx = right_idx = left_idx
                i = apex_idx
                i += 1
                continue

        # 左側の更新
        if _cross(apex, left, pl) >= 0.0:
            if apex == left or _cross(apex, right, pl) < 0.0:
                left = pl
                left_idx = i
            else:
                path.append(right)
                apex, left = right, right
                apex_idx = left_idx = right_idx
                i = apex_idx
                i += 1
                continue

        i += 1

    if path[-1] != goal:
        path.append(goal)
    return path
```

```typescript
type Vec2 = [number, number];

function cross(o: Vec2, a: Vec2, b: Vec2): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function vecEq(a: Vec2, b: Vec2): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function funnel(start: Vec2, goal: Vec2, portals: [Vec2, Vec2][]): Vec2[] {
  const path: Vec2[] = [start];
  let apex = start;
  let left = start;
  let right = start;
  let apexIdx = 0;
  let leftIdx = 0;
  let rightIdx = 0;

  const allPortals: [Vec2, Vec2][] = [[start, start], ...portals, [goal, goal]];

  let i = 1;
  while (i < allPortals.length) {
    const [pl, pr] = allPortals[i];

    // 右側の更新
    if (cross(apex, right, pr) <= 0.0) {
      if (vecEq(apex, right) || cross(apex, left, pr) > 0.0) {
        right = pr;
        rightIdx = i;
      } else {
        path.push(left);
        apex = left;
        right = left;
        apexIdx = rightIdx = leftIdx;
        i = apexIdx;
        i++;
        continue;
      }
    }

    // 左側の更新
    if (cross(apex, left, pl) >= 0.0) {
      if (vecEq(apex, left) || cross(apex, right, pl) < 0.0) {
        left = pl;
        leftIdx = i;
      } else {
        path.push(right);
        apex = right;
        left = right;
        apexIdx = leftIdx = rightIdx;
        i = apexIdx;
        i++;
        continue;
      }
    }

    i++;
  }

  if (!vecEq(path[path.length - 1], goal)) path.push(goal);
  return path;
}
```
