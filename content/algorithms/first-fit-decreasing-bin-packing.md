---
name: 貪欲ビンパッキング(First-Fit Decreasing)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: アイテムを大きい順に並べ、容量が許す最初のビンへ順に詰めていく近似アルゴリズムで、最適なビン数の11/9倍+αに収まることが証明されている。
---

## 概要

容量が決まった箱(ビン)に、様々な大きさの荷物をできるだけ**少ない個数のビンに**詰め込みたい——というビンパッキング問題は、厳密な最適解を求めるのがNP困難な組合せ最適化問題の代表例。First-Fit Decreasing(FFD)は、この問題に対して「荷物を大きい順に並べ、それぞれを"今すでに開いているビンの中で、その荷物が入る最初のビン"に詰める。どのビンにも入らなければ新しいビンを開ける」という単純な貪欲規則を適用する近似アルゴリズムで、実装の容易さと高い実用精度から広く使われている。理論的にも、必要なビン数が最適解の**11/9倍+6/9(実質的に約1.22倍程度)**を超えないことが証明されている。

## 仕組み

1. 全ての荷物を、サイズの**大きい順**にソートする
2. 現在開いているビンを1つも持たない状態から開始する
3. ソート順に荷物を取り出し、既に開いているビンを先頭から順に調べ、**その荷物が入る余地がある最初のビン**に詰める(First Fit)
4. どのビンにも入らなければ、新しいビンを1つ開けてそこに詰める
5. 全ての荷物を詰め終えるまで3〜4を繰り返し、使用したビンの総数が答えになる

**なぜ「大きい順」が有効なのか**: 小さい荷物から詰めると、後から来る大きな荷物のためのまとまった空間がビンに残りにくく、ビンの間に細切れの隙間が量産されやすい。先に大きな荷物でビンの"骨格"を作り、後から小さな荷物でその隙間を埋めていく方が、全体としての詰め込み効率が上がりやすい([LPT法](/algorithms/lpt-scheduling-greedy)が処理時間の長いジョブを先に割り当てるのと同じ発想)。

## 特性・トレードオフ

- **計算量**: O(n log n)。ソートがO(n log n)、各荷物に対して開いているビンを線形探索する部分は最悪でO(n)だが、平衡二分探索木などで管理すれば全体をO(n log n)に抑えられる
- **近似アルゴリズムとしての位置づけ**: ビンパッキング問題自体がNP困難であるため、FFDは厳密な最適解を保証しない。しかし「最適なビン数を`OPT`とすると、FFDが使うビン数は常に`(11/9)・OPT + 6/9`以下」という近似比の理論的な上界が証明されており、単なるヒューリスティックではなく**保証付きの近似アルゴリズム**である点が、区間スケジューリングのような貪欲法が厳密に最適解を導く問題(マトロイド構造を持つ問題)とは異なる立ち位置になる
- **反例(最適とは限らないケース)**: 容量10のビンに対し、サイズ`[6, 5, 5, 4, 4]`の荷物を考える。FFDは大きい順に`6→新ビン1`、`5→新ビン2(6+5=11>10で入らないため)`、`5→ビン2(5+5=10で収まる)`、`4→新ビン3`、`4→ビン3(4+4=8で収まる)`と詰めて合計3ビンを使うが、実は`{6,4}`と`{5,5}`と`{4}`のように組み合わせを工夫しても3ビンが必要な場合もあれば、荷物の値によっては貪欲な詰め方が真の最適個数より1つ多いビンを要求する具体例が知られている。「大きい順に詰める」という局所的な判断の積み重ねが、必ずしも大域的に最小のビン数を導くとは限らない
- **他のビンパッキング戦略との比較**: ソートをしない素朴なFirst Fit(到着順)は近似比が約1.7倍まで悪化しうるのに対し、事前に大きい順へソートするだけのFFDは近似比を約1.22倍まで改善できる。荷物ごとに「最も余裕が少なくなるビン」を選ぶBest-Fit Decreasing(BFD)も同程度の近似比を持つ
- **使いどころ**: コンテナ・トラックへの荷物の積み付け計画、クラウドサーバーへの仮想マシンの割り当て(メモリ・CPU容量が「ビン」)、動画・音声データのディスクへの格納、CPUタイムスロットへのタスクの詰め込みなど、「限られた容量の箱に、できるだけ少ない箱数でアイテムを詰めたい」実務上のリソース割り当て問題全般

## 実装例

```python
def first_fit_decreasing(items: list[int], capacity: int) -> list[list[int]]:
    sorted_items = sorted(items, reverse=True)
    bins: list[list[int]] = []
    remaining: list[int] = []

    for item in sorted_items:
        placed = False
        for i, room in enumerate(remaining):
            if room >= item:
                bins[i].append(item)
                remaining[i] -= item
                placed = True
                break
        if not placed:
            bins.append([item])
            remaining.append(capacity - item)

    return bins
```

```typescript
function firstFitDecreasing(items: number[], capacity: number): number[][] {
  const sortedItems = [...items].sort((a, b) => b - a);
  const bins: number[][] = [];
  const remaining: number[] = [];

  for (const item of sortedItems) {
    let placed = false;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] >= item) {
        bins[i].push(item);
        remaining[i] -= item;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push([item]);
      remaining.push(capacity - item);
    }
  }

  return bins;
}
```
