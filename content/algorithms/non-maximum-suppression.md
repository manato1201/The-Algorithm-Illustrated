---
name: 非最大値抑制(Non-Maximum Suppression, NMS)
category: コンピュータビジョン
subcategory: エッジ・特徴検出
complexity: O(n log n)(バウンディングボックス版、n個の候補をスコア順にソート) / O(w×h)(エッジ細線化版)
summary: 局所領域内で最も強い応答値を持つ点や領域だけを残し、近傍の弱い応答を抑制することで検出結果を細く・疎に絞り込む後処理手法。
---

## 概要

多くの検出アルゴリズムは、真に検出したい対象の周辺にも「ほぼ同じくらい強い」応答をいくつも生み出してしまう——エッジ検出では1本の輪郭線の周りに数画素幅のぼやけた応答帯ができ、物体検出では1つの物体に対して微妙に位置やサイズがずれた候補ボックスが何十個も出力される。非最大値抑制(NMS)は、こうした冗長な応答の中から「その局所領域で最も応答が強いもの」だけを残し、残りを抑制(ゼロにする、または除外する)ことで、検出結果を1本の細い線、あるいは1つの代表ボックスへと絞り込む、非常に汎用的な後処理のアイデアである。名前の通り「極大値(maximum)でない点を抑制する」という単純な原理だが、[Cannyエッジ検出](/algorithms/canny-edge-detection)のエッジ細線化から現代の物体検出モデルのバウンディングボックス統合まで、コンピュータビジョンのほぼ全領域で使われる基礎技術になっている。

## 仕組み

NMSの適用対象によって具体的な処理は異なるが、共通する骨格は「各候補について、近傍の候補と比較し、自分が最大でなければ捨てる」という点にある。代表的な2つの適用例を示す。

**エッジ細線化版(Cannyエッジ検出などで使用)**:

1. 各画素について、その点での勾配の強さ(エッジらしさ)と、勾配方向(エッジに垂直な方向)を求める
2. 勾配方向に沿った前後の画素(通常は最も近い2画素、線形補間で求めることもある)の勾配強度と比較する
3. 自分の勾配強度が前後の画素より強ければそのまま残し、そうでなければゼロに抑制する——これにより数画素幅の太いエッジ帯が、勾配方向に垂直な1画素幅の細い線に絞り込まれる

**バウンディングボックス版(物体検出で使用)**:

1. 検出された全ての候補ボックスを、信頼度スコア(そのボックスが対象物体である確信度)の高い順にソートする
2. 最もスコアの高いボックスを採用リストに追加し、候補リストから取り除く
3. 残りの候補ボックスのうち、採用したボックスとの重なり度合い(IoU: Intersection over Union、2つの矩形の重なり面積÷和集合面積)が一定の閾値を超えるものを全て候補リストから除去する(同じ物体を指している可能性が高いため)
4. 候補リストが空になるまで手順2〜3を繰り返す。最終的に採用リストに残ったボックスが、重複のない検出結果になる

## 特性・トレードオフ

- **汎用性の高さ**: 「局所的な極大値だけを残す」という発想自体はエッジ・コーナー・ブロブ・物体検出ボックスなど、応答値やスコアを持つあらゆる検出結果に適用できる汎用的な後処理であり、[Harrisコーナー検出](/algorithms/harris-corner-detection)のコーナー選定や[LoGによるブロブ検出](/algorithms/laplacian-of-gaussian-blob-detection)のスケール空間極値点検出も本質的には同じ考え方に基づいている
- **計算量**: バウンディングボックス版はスコアでのソートに`O(n log n)`、各ボックスとのIoU計算を素朴に行うと最悪`O(n²)`かかる(nは候補ボックス数)。エッジ細線化版は各画素で定数時間の比較を行うだけなので`O(w×h)`
- **閾値の設計がトレードオフを生む**: バウンディングボックス版のIoU閾値を低く(厳しく)すると、近接する別々の物体のボックスまで誤って統合してしまう可能性があり、高く(緩く)すると同一物体に対する重複ボックスが除去しきれず残ってしまう。用途に応じたチューニングが必要
- **Soft-NMS等の発展形**: 閾値を超えたボックスを一律に除去する代わりに、重なり度合いに応じてスコアを滑らかに減衰させるSoft-NMSのような改良版もあり、密集した物体が写る画像(群衆の人物検出など)での取りこぼしを減らす工夫がされている
- **使いどころ**: [Cannyエッジ検出](/algorithms/canny-edge-detection)のエッジ細線化、[Harrisコーナー検出](/algorithms/harris-corner-detection)や[SIFT](/algorithms/sift)・[ORB特徴量](/algorithms/orb-feature-descriptor)の特徴点候補の間引き、物体検出モデル(YOLO・Faster R-CNN等)が出力する大量の重複バウンディングボックスの統合、[Hough変換](/algorithms/hough-transform)で検出された直線・円の重複除去

## 実装例

エッジ細線化版(勾配方向に沿った前後1画素との比較)と、バウンディングボックス版(スコア順採用とIoUによる重複除去)の両方を実装する。

```python
import math


def gradient_direction_nms(magnitude: list[list[float]], gx: list[list[float]], gy: list[list[float]]) -> list[list[float]]:
    """勾配方向に沿った前後画素と比較し、極大でない画素をゼロに抑制する(Cannyのエッジ細線化)"""
    h, w = len(magnitude), len(magnitude[0])
    out = [[0.0] * w for _ in range(h)]
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            angle = math.atan2(gy[y][x], gx[y][x])
            deg = (math.degrees(angle) + 180) % 180  # 0〜180度に正規化(勾配は直線の向きとして扱う)

            if deg < 22.5 or deg >= 157.5:
                n1, n2 = magnitude[y][x - 1], magnitude[y][x + 1]
            elif deg < 67.5:
                n1, n2 = magnitude[y - 1][x + 1], magnitude[y + 1][x - 1]
            elif deg < 112.5:
                n1, n2 = magnitude[y - 1][x], magnitude[y + 1][x]
            else:
                n1, n2 = magnitude[y - 1][x - 1], magnitude[y + 1][x + 1]

            if magnitude[y][x] >= n1 and magnitude[y][x] >= n2:
                out[y][x] = magnitude[y][x]
    return out


Box = tuple[float, float, float, float]  # (x1, y1, x2, y2)


def iou(a: Box, b: Box) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def nms_boxes(boxes: list[Box], scores: list[float], iou_threshold: float = 0.5) -> list[int]:
    """スコアの高い順に採用し、重なりの大きい候補を除去する。採用したボックスのインデックス列を返す"""
    order = sorted(range(len(boxes)), key=lambda i: scores[i], reverse=True)
    keep = []
    while order:
        current = order.pop(0)
        keep.append(current)
        order = [i for i in order if iou(boxes[current], boxes[i]) <= iou_threshold]
    return keep
```

```typescript
function gradientDirectionNms(
  magnitude: number[][],
  gx: number[][],
  gy: number[][],
): number[][] {
  const h = magnitude.length,
    w = magnitude[0].length;
  const out: number[][] = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const angle = Math.atan2(gy[y][x], gx[y][x]);
      const deg = ((angle * 180) / Math.PI + 180) % 180;

      let n1: number, n2: number;
      if (deg < 22.5 || deg >= 157.5) {
        n1 = magnitude[y][x - 1];
        n2 = magnitude[y][x + 1];
      } else if (deg < 67.5) {
        n1 = magnitude[y - 1][x + 1];
        n2 = magnitude[y + 1][x - 1];
      } else if (deg < 112.5) {
        n1 = magnitude[y - 1][x];
        n2 = magnitude[y + 1][x];
      } else {
        n1 = magnitude[y - 1][x - 1];
        n2 = magnitude[y + 1][x + 1];
      }

      if (magnitude[y][x] >= n1 && magnitude[y][x] >= n2) {
        out[y][x] = magnitude[y][x];
      }
    }
  }
  return out;
}

type Box = [number, number, number, number]; // [x1, y1, x2, y2]

function iou(a: Box, b: Box): number {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const areaA = (ax2 - ax1) * (ay2 - ay1);
  const areaB = (bx2 - bx1) * (by2 - by1);
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
}

function nmsBoxes(
  boxes: Box[],
  scores: number[],
  iouThreshold = 0.5,
): number[] {
  let order = boxes.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const keep: number[] = [];
  while (order.length > 0) {
    const current = order.shift()!;
    keep.push(current);
    order = order.filter((i) => iou(boxes[current], boxes[i]) <= iouThreshold);
  }
  return keep;
}
```
