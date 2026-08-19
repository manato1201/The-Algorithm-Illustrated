---
name: 区間グラフの貪欲彩色
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: 区間を開始時刻順に処理し、そのとき使用中でない最小番号の色を貪欲に割り当てるだけで、一般のグラフでは困難なグラフ彩色問題が区間グラフに限り最適に解ける。
---

## 概要

グラフ彩色問題(隣接する頂点に同じ色を使わずに、使用する色数を最小化する)は一般にはNP困難であり、最適な色数(彩色数)を厳密に求めるアルゴリズムは指数時間を要する。しかし「区間グラフ」——各頂点が数直線上の区間に対応し、2つの区間が重なるときにだけ辺で結ばれるグラフ——という特殊なクラスに限れば話は一変する。区間の開始時刻順に処理し、そのとき使われていない最小番号の色を貪欲に割り当てるだけの単純なアルゴリズムが、**常に最小の色数(彩色数)で最適に彩色できる**ことが証明できる。

実務的には「会議室割り当て問題」として現れることが多い。複数の会議(区間)があり、時間が重なる会議は別の部屋(色)を使わなければならないとき、必要な最小の部屋数を求める問題と等価である。区間グラフの彩色数は「同時刻に重なっている区間の最大数(最大クリークサイズ)」に一致するため、この貪欲法は自動的にその下限を達成する。

## 仕組み

1. 全ての区間を**開始時刻の早い順**にソートする(同じ開始時刻なら終了時刻順などタイブレークを決める)
2. 各色について「その色を使っている区間の中で最も遅い終了時刻」を管理する(最小ヒープで持つと効率的)
3. ソート順に区間を1つずつ取り出し、**すでに終了している色(=終了時刻が現在の区間の開始時刻以前の色)があれば、その中で番号が最小(あるいは任意)の色を再利用する**。なければ新しい色を割り当てる
4. 選んだ色にその区間を割り当て、その色の「最も遅い終了時刻」を今処理した区間の終了時刻で更新する
5. 全区間を処理し終えたら、使用した色の総数が最小彩色数、各区間への色割り当てが最適な彩色になる

直感的には「開始時刻が来た区間には、空いている部屋(使い終わった部屋)があれば使い回し、なければ新しい部屋を用意する」というホテルのチェックイン処理と同じ手続きであり、[区間スケジューリング問題](/algorithms/interval-scheduling)や[最小会議室数問題](/algorithms/minimum-meeting-rooms)と発想の根が共通している。

## 特性・トレードオフ

- **一般グラフではNP困難、区間グラフでは多項式時間で最適**: グラフ彩色問題は一般には貪欲法で最適解を保証できず(頂点の処理順序によって使う色数が大きく変わってしまう反例が容易に作れる)、厳密解を求めるにはNP困難な計算量が必要になる。しかし区間グラフという構造上の制約があるおかげで、「開始時刻順」という決まった順序で貪欲に処理するだけで最適性が保証される、数少ない特殊ケースの一つ
- **最適性の理由(下限との一致)**: 区間グラフの彩色数は必ず「同時刻に重なる区間の最大数(最大クリークサイズ)」以上必要であり、この貪欲法は常にちょうどその数だけの色しか使わないことが証明できる。下限と貪欲法の出力が一致するため、最適性が言える
- **順序の選び方が本質**: 同じ「貪欲に色を割り当てる」戦略でも、区間を開始時刻順ではなくランダムな順や終了時刻順で処理すると最適性は失われる。「どの順序で処理するか」が貪欲法の正しさを左右する典型例であり、[区間スケジューリング問題](/algorithms/interval-scheduling)が終了時刻順を使うのとは対照的に、彩色問題では開始時刻順が本質的に必要になる
- **使いどころ**: 会議室・教室の割り当て(重なる時間帯の会議には別の部屋を割り当てる、必要な最小部屋数を知りたい)、レジスタ割り当て(コンパイラ最適化で、生存区間が重ならない変数に同じレジスタを再利用する)、リソース予約システムでの資源数の見積もり

## 実装例

```python
import heapq


def greedy_color_interval_graph(
    intervals: list[tuple[int, int]],
) -> tuple[int, list[int]]:
    """区間リストを彩色し、(使用色数, 各区間の色番号リスト)を返す。"""
    order = sorted(range(len(intervals)), key=lambda i: intervals[i][0])

    # (その色の最も遅い終了時刻, 色番号) の最小ヒープ
    free_colors: list[tuple[int, int]] = []
    next_color = 0
    colors = [0] * len(intervals)

    for i in order:
        start, end = intervals[i]
        if free_colors and free_colors[0][0] <= start:
            end_time, color = heapq.heappop(free_colors)
            colors[i] = color
            heapq.heappush(free_colors, (end, color))
        else:
            colors[i] = next_color
            heapq.heappush(free_colors, (end, next_color))
            next_color += 1

    return next_color, colors
```

```typescript
class MinHeap<T> {
  private data: T[] = [];
  constructor(private readonly less: (a: T, b: T) => boolean) {}

  get size(): number {
    return this.data.length;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  push(value: T): void {
    this.data.push(value);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(this.data[i], this.data[parent])) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  pop(): T {
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < this.data.length && this.less(this.data[l], this.data[smallest])) smallest = l;
        if (r < this.data.length && this.less(this.data[r], this.data[smallest])) smallest = r;
        if (smallest === i) break;
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      }
    }
    return top;
  }
}

function greedyColorIntervalGraph(
  intervals: [number, number][],
): { numColors: number; colors: number[] } {
  const order = intervals
    .map((_, i) => i)
    .sort((a, b) => intervals[a][0] - intervals[b][0]);

  // [終了時刻, 色番号] を終了時刻の昇順で保持する最小ヒープ
  const freeColors = new MinHeap<[number, number]>((a, b) => a[0] < b[0]);
  let nextColor = 0;
  const colors = new Array<number>(intervals.length).fill(0);

  for (const i of order) {
    const [start, end] = intervals[i];
    const top = freeColors.peek();
    if (top && top[0] <= start) {
      const [, color] = freeColors.pop();
      colors[i] = color;
      freeColors.push([end, color]);
    } else {
      colors[i] = nextColor;
      freeColors.push([end, nextColor]);
      nextColor += 1;
    }
  }

  return { numColors: nextColor, colors };
}
```
