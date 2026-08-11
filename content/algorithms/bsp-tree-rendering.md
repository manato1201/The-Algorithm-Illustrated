---
name: BSPツリーによる描画順序決定
category: CG・3Dレンダリング
subcategory: 可視性・最適化
complexity: O(n log n)(木の構築)、O(n)(1回の描画順序取得)
summary: 空間を平面で再帰的に分割する二分木(BSPツリー)を事前構築しておき、カメラがどちら側にいるかを木を辿るだけで判定することで、Zバッファなしでも正しい奥行き順にポリゴンを並べ替えられる。
---

## 概要

Zバッファ(深度バッファ)が普及する以前の3Dグラフィックスでは、「奥にあるものから手前に順番に描画する」というペインターアルゴリズムによって正しい重なりを実現する必要があったが、シーンが複雑になると「どの順番で描くべきか」を求めること自体が難しい問題になる。BSP(Binary Space Partitioning)ツリーは、1969年に空間分割の理論として提案され、1990年代の『Doom』『Quake』でリアルタイム3Dレンダリングに応用されたことで広く知られるようになった手法である。シーンのジオメトリを**平面で再帰的に2分割**する二分木をオフラインで構築しておくと、実行時には「カメラが各分割平面のどちら側にいるか」を判定するだけで、**Zバッファを使わずとも数学的に正しい奥行き順**でポリゴンを描画できる。

## 仕組み

1. **BSPツリーの構築(オフライン)**: シーン中のポリゴンから1つを選び、それが乗っている平面でシーン全体を「表側」「裏側」の2つの領域に分割する。この平面をノードとして木に登録し、平面をまたぐポリゴンは平面上で分割してそれぞれの側に振り分ける
2. 表側・裏側それぞれの領域に含まれるポリゴンについて、再帰的に1の分割を繰り返す(領域内のポリゴンが1つ以下になるか、分割の効果が薄くなるまで)。これにより、シーン全体が二分木として表現される
3. **描画順序の決定(実行時)**: 木の根から辿り、各ノードの分割平面に対してカメラが表側・裏側のどちらにいるかを判定する
4. カメラと**反対側**の子ノード(カメラから遠い側)を先に再帰的に描画し、次にそのノードの分割平面上のポリゴンを描画し、最後にカメラと**同じ側**の子ノード(カメラに近い側)を描画する。この順序で木を辿ると、常に「奥から手前へ」という正しいペインターアルゴリズムの順序が得られることが幾何学的に保証される
5. カメラの位置が変わっても、木を辿り直すだけで(木自体は再構築せず)常に正しい描画順序が瞬時に求まる

## 特性・トレードオフ

- **Zバッファなしで厳密な奥行きソートができる**: 半透明オブジェクトの描画順序(Zバッファだけでは正しく処理できない、奥から手前への厳密な順序が必要な場面)や、初期のハードウェアでZバッファが使えない・高価だった時代において、BSPツリーは奥行き順序問題を厳密に解く数学的な保証を提供した
- **[ポータルカリング](/algorithms/portal-culling)や[フラスタムカリング](/algorithms/frustum-culling)との組み合わせ**: BSPツリーは描画順序を決定する一方、木構造そのものが空間の階層的な分割でもあるため、視錐台と交差しない部分木を丸ごとスキップする、というカリングの機能も同時に持たせやすい。『Doom』のエンジンはBSPツリーを可視性判定と描画順序の両方に活用していた
- **静的なシーンに特化した前処理コスト**: BSPツリーの構築はオフラインで行われ、シーンのジオメトリが変わらないことを前提とする。動くオブジェクト(キャラクターなど)は別途扱う必要があり、シーン全体が動的に変化するような用途には向かない。現代のゲームエンジンでは、動的な物体が多い一般的なシーンにはZバッファ+[階層的Zバッファ法](/algorithms/hierarchical-z-occlusion-culling)のような手法が主流になっている
- **使いどころ**: 初期の3D FPSゲームのレンダリングエンジン(Doom、Quakeが歴史的に有名)、半透明オブジェクトの正しい奥行きソートが必要な現代のレンダリングパイプラインの一部、衝突判定・可視性判定のための空間分割構造としての応用(BSPは描画以外の用途にも広く使われる)

## 実装例

2D平面上の線分(3Dの簡略化版として)を使ったBSPツリーの構築と、カメラ位置からの描画順序取得を示す。

```python
from dataclasses import dataclass, field

@dataclass
class Segment:
    x0: float; y0: float; x1: float; y1: float

@dataclass
class BspNode:
    segment: Segment
    front: "BspNode | None" = None
    back: "BspNode | None" = None

def side_of_line(seg: Segment, px: float, py: float) -> float:
    """点(px,py)が線分segの左右どちら側にあるかを符号で返す(正=表側)。"""
    return (seg.x1 - seg.x0) * (py - seg.y0) - (seg.y1 - seg.y0) * (px - seg.x0)

def build_bsp(segments: list[Segment]) -> BspNode | None:
    if not segments:
        return None
    root_seg = segments[0]
    front_segs, back_segs = [], []
    for seg in segments[1:]:
        mid_x, mid_y = (seg.x0 + seg.x1) / 2, (seg.y0 + seg.y1) / 2
        if side_of_line(root_seg, mid_x, mid_y) >= 0:
            front_segs.append(seg)
        else:
            back_segs.append(seg)
    node = BspNode(root_seg)
    node.front = build_bsp(front_segs)
    node.back = build_bsp(back_segs)
    return node

def draw_order(node: BspNode | None, cam_x: float, cam_y: float) -> list[Segment]:
    """カメラから見て奥から手前の順にセグメントを並べたリストを返す。"""
    if node is None:
        return []
    if side_of_line(node.segment, cam_x, cam_y) >= 0:
        return draw_order(node.back, cam_x, cam_y) + [node.segment] + draw_order(node.front, cam_x, cam_y)
    else:
        return draw_order(node.front, cam_x, cam_y) + [node.segment] + draw_order(node.back, cam_x, cam_y)
```

```typescript
type Segment = { x0: number; y0: number; x1: number; y1: number };
type BspNode = { segment: Segment; front: BspNode | null; back: BspNode | null };

function sideOfLine(seg: Segment, px: number, py: number): number {
  return (seg.x1 - seg.x0) * (py - seg.y0) - (seg.y1 - seg.y0) * (px - seg.x0);
}

function buildBsp(segments: Segment[]): BspNode | null {
  if (segments.length === 0) return null;
  const rootSeg = segments[0];
  const frontSegs: Segment[] = [];
  const backSegs: Segment[] = [];
  for (const seg of segments.slice(1)) {
    const midX = (seg.x0 + seg.x1) / 2, midY = (seg.y0 + seg.y1) / 2;
    (sideOfLine(rootSeg, midX, midY) >= 0 ? frontSegs : backSegs).push(seg);
  }
  return { segment: rootSeg, front: buildBsp(frontSegs), back: buildBsp(backSegs) };
}

function drawOrder(node: BspNode | null, camX: number, camY: number): Segment[] {
  if (node === null) return [];
  if (sideOfLine(node.segment, camX, camY) >= 0) {
    return [...drawOrder(node.back, camX, camY), node.segment, ...drawOrder(node.front, camX, camY)];
  }
  return [...drawOrder(node.front, camX, camY), node.segment, ...drawOrder(node.back, camX, camY)];
}
```

```cpp
#include <vector>
#include <memory>

struct Segment { double x0, y0, x1, y1; };

struct BspNode {
    Segment segment;
    std::unique_ptr<BspNode> front, back;
};

double sideOfLine(const Segment& seg, double px, double py) {
    return (seg.x1 - seg.x0) * (py - seg.y0) - (seg.y1 - seg.y0) * (px - seg.x0);
}

std::unique_ptr<BspNode> buildBsp(std::vector<Segment> segments) {
    if (segments.empty()) return nullptr;
    Segment rootSeg = segments[0];
    std::vector<Segment> frontSegs, backSegs;
    for (size_t i = 1; i < segments.size(); i++) {
        double midX = (segments[i].x0 + segments[i].x1) / 2, midY = (segments[i].y0 + segments[i].y1) / 2;
        (sideOfLine(rootSeg, midX, midY) >= 0 ? frontSegs : backSegs).push_back(segments[i]);
    }
    auto node = std::make_unique<BspNode>();
    node->segment = rootSeg;
    node->front = buildBsp(frontSegs);
    node->back = buildBsp(backSegs);
    return node;
}

void drawOrder(const BspNode* node, double camX, double camY, std::vector<Segment>& out) {
    if (!node) return;
    if (sideOfLine(node->segment, camX, camY) >= 0) {
        drawOrder(node->back.get(), camX, camY, out);
        out.push_back(node->segment);
        drawOrder(node->front.get(), camX, camY, out);
    } else {
        drawOrder(node->front.get(), camX, camY, out);
        out.push_back(node->segment);
        drawOrder(node->back.get(), camX, camY, out);
    }
}
```

```rust
struct Segment { x0: f64, y0: f64, x1: f64, y1: f64 }

struct BspNode {
    segment: Segment,
    front: Option<Box<BspNode>>,
    back: Option<Box<BspNode>>,
}

fn side_of_line(seg: &Segment, px: f64, py: f64) -> f64 {
    (seg.x1 - seg.x0) * (py - seg.y0) - (seg.y1 - seg.y0) * (px - seg.x0)
}

fn build_bsp(segments: Vec<Segment>) -> Option<Box<BspNode>> {
    if segments.is_empty() {
        return None;
    }
    let mut iter = segments.into_iter();
    let root_seg = iter.next().unwrap();
    let mut front_segs = Vec::new();
    let mut back_segs = Vec::new();
    for seg in iter {
        let mid_x = (seg.x0 + seg.x1) / 2.0;
        let mid_y = (seg.y0 + seg.y1) / 2.0;
        if side_of_line(&root_seg, mid_x, mid_y) >= 0.0 {
            front_segs.push(seg);
        } else {
            back_segs.push(seg);
        }
    }
    Some(Box::new(BspNode {
        front: build_bsp(front_segs),
        back: build_bsp(back_segs),
        segment: root_seg,
    }))
}

fn draw_order(node: &Option<Box<BspNode>>, cam_x: f64, cam_y: f64, out: &mut Vec<(f64, f64, f64, f64)>) {
    if let Some(n) = node {
        if side_of_line(&n.segment, cam_x, cam_y) >= 0.0 {
            draw_order(&n.back, cam_x, cam_y, out);
            out.push((n.segment.x0, n.segment.y0, n.segment.x1, n.segment.y1));
            draw_order(&n.front, cam_x, cam_y, out);
        } else {
            draw_order(&n.front, cam_x, cam_y, out);
            out.push((n.segment.x0, n.segment.y0, n.segment.x1, n.segment.y1));
            draw_order(&n.back, cam_x, cam_y, out);
        }
    }
}
```

```csharp
class Segment { public double X0, Y0, X1, Y1; }

class BspNode
{
    public Segment Segment = null!;
    public BspNode? Front, Back;
}

static double SideOfLine(Segment seg, double px, double py) =>
    (seg.X1 - seg.X0) * (py - seg.Y0) - (seg.Y1 - seg.Y0) * (px - seg.X0);

static BspNode? BuildBsp(List<Segment> segments)
{
    if (segments.Count == 0) return null;
    var rootSeg = segments[0];
    var frontSegs = new List<Segment>();
    var backSegs = new List<Segment>();
    for (int i = 1; i < segments.Count; i++)
    {
        double midX = (segments[i].X0 + segments[i].X1) / 2, midY = (segments[i].Y0 + segments[i].Y1) / 2;
        (SideOfLine(rootSeg, midX, midY) >= 0 ? frontSegs : backSegs).Add(segments[i]);
    }
    return new BspNode { Segment = rootSeg, Front = BuildBsp(frontSegs), Back = BuildBsp(backSegs) };
}

static void DrawOrder(BspNode? node, double camX, double camY, List<Segment> outList)
{
    if (node == null) return;
    if (SideOfLine(node.Segment, camX, camY) >= 0)
    {
        DrawOrder(node.Back, camX, camY, outList);
        outList.Add(node.Segment);
        DrawOrder(node.Front, camX, camY, outList);
    }
    else
    {
        DrawOrder(node.Front, camX, camY, outList);
        outList.Add(node.Segment);
        DrawOrder(node.Back, camX, camY, outList);
    }
}
```
