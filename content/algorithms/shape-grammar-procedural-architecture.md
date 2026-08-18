---
name: シェイプグラマーによる手続き型建築生成
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(ルール適用回数)(生成規模・分割の深さに依存)
summary: 建物の塊(マス)を表す図形そのものを、階への分割・ファサードのパネル分割といった書き換え規則で再帰的に細分化していくことで、建築物やレベルレイアウトを自動生成する手続き型生成手法。
---

## 概要

シェイプグラマー(shape grammar)は、1971年にジョージ・スティニーとジェームズ・ギップスが提唱した「図形そのものを書き換え規則の対象にする」形式文法で、2006年にPascal Müllerらが発表したCGA Shape(のちのゲームエンジン・都市生成ツールCityEngineの中核技術)によって手続き型建築生成の標準的な手法として広く知られるようになった。建物全体を表す1つの直方体(マス)から出発し、「階数分だけ縦に繰り返し分割する」「ファサードを窓・壁のパネルへ横方向に分割する」「屋根の形状に応じて先端を変形する」といった規則を、幾何形状(直方体や面)そのものに対して直接、再帰的に適用していくことで、最終的に具体的な壁・窓・ドアなどのジオメトリへと落とし込む。[L-system](/algorithms/l-system)が文字列を書き換え、それをタートルグラフィックスとして事後的に解釈するのに対し、シェイプグラマーは形状そのものを規則の対象として直接操作する点が本質的に異なる。

## 仕組み

1. 建物全体の体積を表す非終端記号(例: `Mass`)を、指定の幅・高さ・奥行きを持つ直方体として用意する
2. **反復(repeat)**規則: `Mass`を、階高で割った回数だけ縦方向に等分し、各区画を`Floor`という非終端記号に置き換える
3. **分割(split)**規則: 各`Floor`のファサード(正面)を、指定したパネル幅で横方向に分割し、各パネルを確率的に`Window`(窓)または`Wall`(壁)という終端記号に置き換える
4. 非終端記号が残っている限り、対応する規則を再帰的に適用し続ける。全てのシェイプが終端記号(具体的なジオメトリを持つパネル)になったら生成完了
5. 終端シェイプにマテリアルやテクスチャを割り当て、最終的な3Dメッシュとして書き出す

## 特性・トレードオフ

- **[L-system](/algorithms/l-system)との違い**: L-systemは文字列を書き換え規則で展開し、その文字列を後からタートルグラフィックスの命令として解釈することで初めて形状になる(木の枝分かれのような「線分の連なり」の表現に強い)。シェイプグラマーは、はじめから直方体や面といった幾何形状そのものを規則の対象とし、それを直接分割・置換していく——「箱を階や窓へと分割していく」建築物・都市のレイアウトのような構造の表現に向く
- **設計者による制御のしやすさ**: 規則の中に「階高」「窓の配置間隔」「屋根の勾配」といった建築的な制約をそのまま埋め込めるため、純粋にランダムな生成手法よりも設計者の意図を反映しやすい。パラメータ化された規則(確率・数値レンジ)を使うことで、小さな規則セットから多様なバリエーションの建物を大量に生成できる
- **計算量**: 規則の適用回数(≒シェイプの分割の深さと個数)に比例するため、都市1つ分の建物群であってもリアルタイムに近い速度で生成できることが多く、大規模な仮想都市の構築に実用化されている
- **使いどころ**: CityEngineに代表される都市・建物のプロシージャル生成ツール、オープンワールドゲームの背景建築物の大量生成、SF風宇宙ステーションやダンジョンの部屋割りなど「大きな塊を規則的に細分化する」構造全般。[ダイヤモンド・スクエア法](/algorithms/diamond-square-terrain)や[パーリンノイズ](/algorithms/perlin-noise)が地形のような連続的な起伏を生成するのに対し、シェイプグラマーは建築物のような離散的・階層的な構造の生成に向く

## 実装例

```python
import random
from dataclasses import dataclass


@dataclass
class Shape:
    """軸並行な直方体としての建築形状。symbolは未展開の規則名、terminal=Trueなら描画対象の終端形状"""

    x: float
    y: float
    z: float
    w: float  # 幅
    h: float  # 高さ
    d: float  # 奥行き
    symbol: str
    terminal: bool = False


def split_floors(mass: Shape, floor_height: float) -> list[Shape]:
    """Mass規則: 建物の塊を、指定した階高でFloorへ繰り返し分割する(repeat操作)"""
    n_floors = max(1, int(mass.h // floor_height))
    return [
        Shape(mass.x, mass.y + i * floor_height, mass.z, mass.w, floor_height, mass.d, "Floor")
        for i in range(n_floors)
    ]


def split_facade(rng: random.Random, floor: Shape, panel_width: float, window_ratio: float = 0.4) -> list[Shape]:
    """Floor規則: 1フロアのファサードを、指定幅のパネルへ繰り返し分割する(split操作)。
    各パネルはwindow_ratioの確率でWindow(窓)、それ以外はWall(壁)という終端記号になる"""
    n_panels = max(1, int(floor.w // panel_width))
    actual_width = floor.w / n_panels
    panels = []
    for i in range(n_panels):
        symbol = "Window" if rng.random() < window_ratio else "Wall"
        panels.append(
            Shape(
                floor.x + i * actual_width, floor.y, floor.z,
                actual_width, floor.h, floor.d, symbol, terminal=True,
            )
        )
    return panels


def generate_building(
    width: float, height: float, depth: float, floor_height: float, panel_width: float, seed: int = 0
) -> list[Shape]:
    """Mass -> Floor* -> (Wall|Window)* という規則を、根の非終端記号から終端記号まで再帰的に適用する"""
    rng = random.Random(seed)
    mass = Shape(0, 0, 0, width, height, depth, "Mass")
    terminals: list[Shape] = []
    for floor in split_floors(mass, floor_height):
        terminals.extend(split_facade(rng, floor, panel_width))
    return terminals


building = generate_building(width=20, height=15, depth=10, floor_height=3, panel_width=2, seed=1)
print(f"{len(building)}枚の終端パネル(壁/窓)を生成")
```

```typescript
interface Shape {
  x: number;
  y: number;
  z: number;
  w: number; // 幅
  h: number; // 高さ
  d: number; // 奥行き
  symbol: string;
  terminal: boolean;
}

function splitFloors(mass: Shape, floorHeight: number): Shape[] {
  // Mass規則: 建物の塊を、指定した階高でFloorへ繰り返し分割する(repeat操作)
  const nFloors = Math.max(1, Math.floor(mass.h / floorHeight));
  return Array.from({ length: nFloors }, (_, i) => ({
    x: mass.x,
    y: mass.y + i * floorHeight,
    z: mass.z,
    w: mass.w,
    h: floorHeight,
    d: mass.d,
    symbol: "Floor",
    terminal: false,
  }));
}

function splitFacade(
  rand: () => number,
  floor: Shape,
  panelWidth: number,
  windowRatio = 0.4,
): Shape[] {
  // Floor規則: 1フロアのファサードを、指定幅のパネルへ繰り返し分割する(split操作)。
  // 各パネルはwindowRatioの確率でWindow(窓)、それ以外はWall(壁)という終端記号になる
  const nPanels = Math.max(1, Math.floor(floor.w / panelWidth));
  const actualWidth = floor.w / nPanels;
  const panels: Shape[] = [];
  for (let i = 0; i < nPanels; i++) {
    const symbol = rand() < windowRatio ? "Window" : "Wall";
    panels.push({
      x: floor.x + i * actualWidth,
      y: floor.y,
      z: floor.z,
      w: actualWidth,
      h: floor.h,
      d: floor.d,
      symbol,
      terminal: true,
    });
  }
  return panels;
}

function generateBuilding(
  width: number,
  height: number,
  depth: number,
  floorHeight: number,
  panelWidth: number,
  rand: () => number = Math.random,
): Shape[] {
  // Mass -> Floor* -> (Wall|Window)* という規則を、根の非終端記号から終端記号まで再帰的に適用する
  const mass: Shape = { x: 0, y: 0, z: 0, w: width, h: height, d: depth, symbol: "Mass", terminal: false };
  const terminals: Shape[] = [];
  for (const floor of splitFloors(mass, floorHeight)) {
    terminals.push(...splitFacade(rand, floor, panelWidth));
  }
  return terminals;
}

const building = generateBuilding(20, 15, 10, 3, 2);
console.log(`${building.length}枚の終端パネル(壁/窓)を生成`);
```
