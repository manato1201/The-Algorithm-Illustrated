---
name: NSGA-II(多目的遺伝的アルゴリズム)
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: 1世代あたり O(M·N²)(Mは目的数、Nは個体数)
summary: 複数の目的を同時に最適化し、「どれかを悪くしないと他を良くできない」解の集合(パレートフロント)を、非優越ソートと混雑距離で選別しながら進化させる。
---

## 概要

現実の設計問題は、目的が1つに決まらないことが多い。車の設計なら燃費と加速、機械学習なら精度とモデルの大きさ、ゲームのバランス調整なら難易度と所要時間。どれかを良くすると他が悪くなる、というトレードオフの中で、1つの「最善」は存在しない。重み付けで1つの数値にまとめると、重みの決め方に結果が左右され、トレードオフの全体像も見えなくなる。

多目的最適化では、**パレート最適**(他のどの解にも「すべての目的で同等以上、かつどれか1つ以上で優れる」と言われない解)の集合を求める。NSGA-II(Deb ら、2002年)は、遺伝的アルゴリズムの枠組みで、この集合を**1回の実行で、偏りなく広く**求めることを目指した手法である。前身のNSGAが抱えていた計算量の大きさと、解の多様性を保つための調整パラメータを、**高速な非優越ソート**と**混雑距離**で解決した。

## 仕組み

目的はすべて最小化とする。

1. **初期化**: ランダムな個体の集団 `P`(サイズ N)を作る
2. 各世代で、通常の遺伝的アルゴリズムと同じく、選択・交叉・突然変異で子の集団 `Q`(サイズ N)を作る
3. 親と子を合わせた `R = P ∪ Q`(サイズ 2N)を作り、**非優越ソート**で階層(フロント)に分ける
   - 第1フロント: 他のどの個体にも優越されない個体
   - 第2フロント: 第1フロントを除いたうえで、優越されない個体
   - 以下同様
4. 次世代 `P'` を、フロントの良い順に丸ごと詰める。途中で入りきらないフロントは、**混雑距離**の大きい(周囲に他の個体が少ない)順に、必要な数だけ選ぶ
5. 2〜4を世代数だけ繰り返す。選択(トーナメント)も、「フロントが良い方が勝ち、同じなら混雑距離が大きい方が勝ち」という順序で行う

**混雑距離**は、目的ごとに個体を並べたとき、両隣の個体との目的値の差を足し合わせたもの(両端の個体は無限大)。値が大きい個体は、フロント上でまばらな領域にいる。それを優先して残すことで、解がフロント全体に広がる。

## 特性・トレードオフ

- **パラメータが少ない**: 多様性維持のための共有パラメータが不要になった。個体数・世代数・交叉・突然変異の設定だけ
- **エリート保存**: 親と子を合わせて選ぶので、良い解が世代交代で失われない
- **目的数が増えると弱い**: 目的が4〜5個を超えると、ほとんどの個体が互いに優越し合わなくなり(第1フロントが集団の大半を占める)、選択圧が働かなくなる。そのような場合は参照点を使うNSGA-IIIなどが使われる
- **計算量**: 非優越ソートが O(M·N²)。個体数が数千を超えると重い。適合度の評価が重い問題では、評価回数のほうが支配的になる
- **使いどころ**: 工学設計の多目的最適化(形状・材料・コスト)、ハイパーパラメータ探索での精度と速度の両立、スケジューリングの多目的化、ゲームの自動バランス調整

## 実装例

```python
def dominates(a, b):
    """最小化。a が b を優越する(全目的で a ≤ b かつ、どれかで a < b)。"""
    return all(x <= y for x, y in zip(a, b)) and any(x < y for x, y in zip(a, b))


def non_dominated_sort(objs):
    n = len(objs)
    dominated_by = [[] for _ in range(n)]   # 自分が優越する個体
    count = [0] * n                          # 自分を優越する個体の数
    for p in range(n):
        for q in range(n):
            if dominates(objs[p], objs[q]):
                dominated_by[p].append(q)
            elif dominates(objs[q], objs[p]):
                count[p] += 1
    fronts = [[i for i in range(n) if count[i] == 0]]
    while fronts[-1]:
        nxt = []
        for p in fronts[-1]:
            for q in dominated_by[p]:
                count[q] -= 1
                if count[q] == 0:
                    nxt.append(q)
        fronts.append(nxt)
    return fronts[:-1]


def crowding_distance(front, objs):
    dist = {i: 0.0 for i in front}
    for m in range(len(objs[0])):
        order = sorted(front, key=lambda i: objs[i][m])
        dist[order[0]] = dist[order[-1]] = float("inf")
        span = objs[order[-1]][m] - objs[order[0]][m] or 1.0
        for prev, cur, nxt in zip(order, order[1:], order[2:]):
            dist[cur] += (objs[nxt][m] - objs[prev][m]) / span
    return dist


def select_survivors(objs, size):
    chosen = []
    for front in non_dominated_sort(objs):
        if len(chosen) + len(front) <= size:
            chosen += front
        else:
            d = crowding_distance(front, objs)
            chosen += sorted(front, key=lambda i: -d[i])[: size - len(chosen)]
            break
    return chosen


objs = [(1, 9), (2, 7), (3, 8), (4, 4), (6, 5), (7, 2), (8, 3), (9, 1)]
print(non_dominated_sort(objs))      # [[0, 1, 3, 5, 7], [2, 4, 6]]
print(select_survivors(objs, 6))     # 第1フロント5個 + 混雑距離の大きい第2フロント1個
```

```typescript
type Obj = number[];

const dominates = (a: Obj, b: Obj): boolean =>
  a.every((x, i) => x <= b[i]) && a.some((x, i) => x < b[i]);

function nonDominatedSort(objs: Obj[]): number[][] {
  const n = objs.length;
  const dominatedBy: number[][] = Array.from({ length: n }, () => []);
  const count = new Array<number>(n).fill(0);
  for (let p = 0; p < n; p++) {
    for (let q = 0; q < n; q++) {
      if (dominates(objs[p], objs[q])) dominatedBy[p].push(q);
      else if (dominates(objs[q], objs[p])) count[p]++;
    }
  }
  const fronts: number[][] = [objs.map((_, i) => i).filter((i) => count[i] === 0)];
  while (fronts[fronts.length - 1].length > 0) {
    const next: number[] = [];
    for (const p of fronts[fronts.length - 1]) {
      for (const q of dominatedBy[p]) if (--count[q] === 0) next.push(q);
    }
    fronts.push(next);
  }
  fronts.pop();
  return fronts;
}

function crowdingDistance(front: number[], objs: Obj[]): Map<number, number> {
  const dist = new Map(front.map((i) => [i, 0]));
  for (let m = 0; m < objs[0].length; m++) {
    const order = [...front].sort((a, b) => objs[a][m] - objs[b][m]);
    dist.set(order[0], Infinity);
    dist.set(order[order.length - 1], Infinity);
    const span = objs[order[order.length - 1]][m] - objs[order[0]][m] || 1;
    for (let k = 1; k < order.length - 1; k++) {
      dist.set(order[k], dist.get(order[k])! + (objs[order[k + 1]][m] - objs[order[k - 1]][m]) / span);
    }
  }
  return dist;
}

const objs: Obj[] = [[1, 9], [2, 7], [3, 8], [4, 4], [6, 5], [7, 2], [8, 3], [9, 1]];
console.log(nonDominatedSort(objs)); // [[0, 1, 3, 5, 7], [2, 4, 6]]
console.log(crowdingDistance([0, 1, 3, 5, 7], objs));
```
