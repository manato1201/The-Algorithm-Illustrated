---
name: ウェイポイントグラフによる経路探索(Waypoint Graph Navigation)
category: キャラクターAI・空間AI
subcategory: 空間認識・知覚
complexity: O(E log V)(V・Eはウェイポイントグラフの頂点数・辺数、A*/ダイクストラによる探索が支配的)
summary: レベルデザイナーが手動で配置した通行可能点(ウェイポイント)とその連結関係を疎なグラフとして表現し、その上でA*などの探索を行う、ナビゲーションメッシュ以前から使われる古典的な空間表現手法。
---

## 概要

キャラクターに「どこを歩けるか」を教える方法として、[ナビゲーションメッシュ生成](/algorithms/navmesh-generation)が地形の形状から歩行可能領域を自動的に多角形として抽出するのに対し、ウェイポイントグラフはより素朴で歴史の古いアプローチを取る——**レベルデザイナーやツールがマップ上に「ここは通れる」という点(ウェイポイント)を手動または簡易な自動配置で置き、通行可能な点同士を辺で結んだグラフ**を空間表現として使う。1990年代から2000年代初頭のFPS・RTS・アドベンチャーゲームで広く使われた手法で、地形全体を細かく解析する必要がなく、頂点数十〜数百程度の疎なグラフに対して[A*探索](/algorithms/a-star)やダイクストラ法を直接適用できるという実装の単純さが最大の利点だった。今日ではNavMeshが主流になったものの、巡回ルート・パトロールポイント・カバーポイントのような「意味のある地点」を明示的に扱いたい場面では、NavMeshと併用する形で今も使われ続けている。

## 仕組み

1. **ウェイポイントの配置**: マップ上の通行可能な地点にノードを配置する。手動配置(レベルデザイナーがエディタ上でクリックして置く)、グリッド上に等間隔で配置してから壁の中の点を除去する、あるいはナビゲーションメッシュの各多角形の中心点を自動的にウェイポイントとして使う、といった複数の配置方法がある
2. **エッジ(連結関係)の構築**: 2つのウェイポイント間を、障害物に遮られずに直線移動できる場合に辺で結ぶ。これはレイキャストによる[視線判定](/algorithms/line-of-sight-raycasting)で「両点を結ぶ線分が壁や障害物と交差しないか」を確認することで機械的に判定できる。辺の重みには通常2点間のユークリッド距離を使うが、地形の移動コスト(泥地は遅い、階段は時間がかかるなど)を加味した重みにすることも多い
3. **キャラクターの現在位置・目的地の接続**: キャラクターは通常ウェイポイントそのものの上にいるとは限らないため、探索の前後に「現在位置から見える最寄りのウェイポイント」「目的地から見える最寄りのウェイポイント」を視線判定で見つけ、そこをグラフへの仮の出入り口とする
4. **グラフ探索**: 構築したグラフに対して[A*探索](/algorithms/a-star)(ヒューリスティックには目的地までのユークリッド距離を使うのが一般的)を実行し、経由するウェイポイントの列を求める
5. **経路の追従**: 求めたウェイポイント列に沿って、各区間を[ステアリング行動](/algorithms/steering-behaviors)のseek/arriveで移動する。角を曲がる際に次のウェイポイントが視線内にあれば早めに次の区間へ切り替える「経路のショートカット」処理を入れると、カクカクした折れ線移動を滑らかにできる

## 特性・トレードオフ

- **実装と探索の単純さ**: グラフ自体が疎(頂点数十〜数百)であるため、A*の実装・デバッグが容易で、経路探索の計算コストも小さい。地形解析による自動生成パイプラインを必要とせず、レベル制作と並行して人手で配置・調整できる
- **表現力の低さと保守コスト**: ウェイポイントは離散的な点でしかないため、点と点の間の広い開けた領域での自然な移動(斜めのショートカット、複数エージェントがすれ違う際の横のスペース活用)を表現しづらく、経路がカクカクした折れ線になりやすい。また地形を変更するたびにウェイポイントとエッジを手動で調整し直す必要があり、大規模・動的なレベルでは保守コストが増大する
- **[ナビゲーションメッシュ](/algorithms/navmesh-generation)との対比**: NavMeshは地形の連続的な歩行可能領域を多角形で網羅的に表現するため、任意の2点間で障害物なしの直線移動が幾何学的に保証され、より自然で高精度な経路が得られる。一方でNavMeshは生成パイプラインが複雑で、動的な地形変化への追従に部分再生成などの追加実装が要る。ウェイポイントグラフは「表現力より単純さ・保守性・意味的な地点の明示」を優先する場面で今も選ばれる
- **使いどころ**: 巡回ルート・パトロールAIの経路指定、カバーポイント間の移動、レトロ・軽量なゲームや教育目的の実装、[ナビゲーションメッシュ](/algorithms/navmesh-generation)の大域経路計画結果を人間が読める意味的な地点(会議室の入口、拠点の防衛ラインなど)と紐づけるためのメタ情報レイヤー

## 実装例

```python
import heapq
import math

Vec2 = tuple[float, float]

class WaypointGraph:
    def __init__(self):
        self.positions: dict[str, Vec2] = {}
        self.edges: dict[str, dict[str, float]] = {}

    def add_waypoint(self, name: str, pos: Vec2) -> None:
        self.positions[name] = pos
        self.edges.setdefault(name, {})

    def add_edge(self, a: str, b: str) -> None:
        dist = math.hypot(self.positions[a][0] - self.positions[b][0], self.positions[a][1] - self.positions[b][1])
        self.edges[a][b] = dist
        self.edges[b][a] = dist

    def find_path(self, start: str, goal: str) -> list[str] | None:
        def heuristic(n: str) -> float:
            gx, gy = self.positions[goal]
            nx, ny = self.positions[n]
            return math.hypot(gx - nx, gy - ny)

        open_set = [(heuristic(start), 0.0, start, None)]
        best_g: dict[str, float] = {start: 0.0}
        came_from: dict[str, str] = {}

        while open_set:
            _, g, node, parent = heapq.heappop(open_set)
            if node in came_from and g > best_g.get(node, math.inf):
                continue
            if parent is not None:
                came_from[node] = parent
            if node == goal:
                path = [node]
                while path[-1] in came_from:
                    path.append(came_from[path[-1]])
                return list(reversed(path))
            for neighbor, weight in self.edges.get(node, {}).items():
                new_g = g + weight
                if new_g < best_g.get(neighbor, math.inf):
                    best_g[neighbor] = new_g
                    heapq.heappush(open_set, (new_g + heuristic(neighbor), new_g, neighbor, node))
        return None
```

```typescript
type Vec2 = [number, number];

class WaypointGraph {
  positions = new Map<string, Vec2>();
  edges = new Map<string, Map<string, number>>();

  addWaypoint(name: string, pos: Vec2): void {
    this.positions.set(name, pos);
    if (!this.edges.has(name)) this.edges.set(name, new Map());
  }

  addEdge(a: string, b: string): void {
    const [ax, ay] = this.positions.get(a)!;
    const [bx, by] = this.positions.get(b)!;
    const dist = Math.hypot(ax - bx, ay - by);
    this.edges.get(a)!.set(b, dist);
    this.edges.get(b)!.set(a, dist);
  }

  findPath(start: string, goal: string): string[] | null {
    const [gx, gy] = this.positions.get(goal)!;
    const heuristic = (n: string): number => {
      const [nx, ny] = this.positions.get(n)!;
      return Math.hypot(gx - nx, gy - ny);
    };

    const bestG = new Map<string, number>([[start, 0]]);
    const cameFrom = new Map<string, string>();
    const open: { f: number; g: number; node: string }[] = [
      { f: heuristic(start), g: 0, node: start },
    ];

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const { g, node } = open.shift()!;
      if (g > (bestG.get(node) ?? Infinity)) continue;
      if (node === goal) {
        const path = [node];
        let cur = node;
        while (cameFrom.has(cur)) {
          cur = cameFrom.get(cur)!;
          path.push(cur);
        }
        return path.reverse();
      }
      for (const [neighbor, weight] of this.edges.get(node) ?? []) {
        const newG = g + weight;
        if (newG < (bestG.get(neighbor) ?? Infinity)) {
          bestG.set(neighbor, newG);
          cameFrom.set(neighbor, node);
          open.push({ f: newG + heuristic(neighbor), g: newG, node: neighbor });
        }
      }
    }
    return null;
  }
}
```
