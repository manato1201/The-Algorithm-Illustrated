---
name: LPT法(最長処理時間順スケジューリング)
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: ジョブを処理時間の長い順に並べ、その都度最も空いている機械へ割り当てるだけで、最適解の4/3倍以内に収まることが証明できる貪欲近似アルゴリズム。
---

## 概要

`m`台の同一機械に`n`個のジョブを割り振り、全機械の中で最も作業が終わるのが遅い機械の完了時刻(メイクスパン)をできるだけ小さくしたい——という問題(多機械スケジューリング問題)は、一般にNP困難であり厳密な最適解を効率よく求めるアルゴリズムは知られていない。LPT法(Longest Processing Time first)は、この問題に対して「処理時間の長いジョブから順に、その時点で最も空いている機械へ割り当てる」という単純な貪欲規則を使う近似アルゴリズムで、1969年にロナルド・グラハムによって導入された。厳密な最適解は保証しないものの、**常に最適解の4/3倍以内**に収まることが証明できる、近似アルゴリズムの黎明期を代表する古典的手法。

## 仕組み

1. 全ジョブを、処理時間の**長い順**にソートする
2. ソート順にジョブを1つずつ取り出し、その時点で**総処理時間が最も少ない機械**(最も手が空いている機械)に割り当てる
3. 割り当てた機械の総処理時間を、そのジョブの処理時間だけ加算する
4. 全ジョブを割り当て終えるまで2〜3を繰り返す
5. 全機械の総処理時間のうち最大のもの(メイクスパン)が、このスケジュールの評価値になる

**なぜ「長い順」が重要なのか**: もし処理時間の短いジョブから割り当ててしまうと、終盤に非常に長いジョブが残ったときに、それを押し込む機械が既に埋まっていて大きな偏りが生まれやすい。先に長いジョブを"骨格"として各機械に配置し、後から短いジョブで隙間を埋めていく方が、機械間のバランスが取りやすい。

**近似比4/3の直感的な証明**: 最適解のメイクスパンを`OPT`とする。LPT法が出す解でボトルネックになる機械に載っている**最後に**割り当てられたジョブの処理時間を`p`とすると、そのジョブが割り当てられた時点でその機械は「その時点で最も空いていた」機械なので、他の全機械の総処理時間は、そのジョブを割り当てる直前の時点でその機械の総処理時間以上あったはずである。この関係と、`OPT`が「1台あたりの平均処理時間」と「最大の単一ジョブの処理時間」のどちらよりも大きいという2つの下界を組み合わせると、LPT法のメイクスパンが`(4/3 - 1/(3m))・OPT`を超えないことが示せる。

## 特性・トレードオフ

- **計算量**: O(n log n)(ソートが支配的)。各ステップでの「最も空いている機械」の探索は優先度付きキューを使えばO(log m)で済み、全体でO(n log n + n log m) = O(n log n)に収まる
- **近似アルゴリズムとしての位置づけ**: 多機械スケジューリング問題自体はNP困難なため、この貪欲法は厳密な最適解を保証しない。しかし常に最適解の4/3倍以内という**近似比の理論的保証**がある点が、単なるヒューリスティックとの違い。マトロイド構造のように貪欲法が厳密に最適になる問題(例えば[区間スケジューリング問題](/algorithms/interval-scheduling)や[分数ナップサック問題](/algorithms/fractional-knapsack))とは異なり、ここでは「最適とは限らないが、どれだけ悪くても許容範囲に収まる」という近似保証がテーマになる
- **反例(最適とは限らないケース)**: `m=2`台、処理時間`[5, 5, 4, 4, 3]`のジョブ群を考える。LPT法は`5,5,4,4,3`の順に割り当て、機械1に`5+4=9`、機械2に`5+4+3=12`となりメイクスパンは12。一方、最適な割り当ては機械1に`5,4,3=12`、機械2に`5,4=9`としても結果は同じだが、より偏りの少ない割り当てが存在する入力では、LPT法の解が真の最適解より真に大きくなる具体例が知られており、4/3の近似比は実際にタイトである(この比に漸近的に近づく入力例が構成できる)
- **使いどころ**: 並列計算機・クラウドのタスクスケジューリング、工場の複数ラインへの作業割り当て、印刷ジョブや配送タスクの負荷分散など、「全体の完了を待つ時間(メイクスパン)を最小化したい」実務上の負荷分散問題全般。より精緻な近似が必要な場合はPTAS(多項式時間近似スキーム)が使われるが、実装の単純さと十分な精度のバランスからLPT法は今でも実用上よく使われる

## 実装例

```python
import heapq

def lpt_scheduling(processing_times: list[int], m: int) -> list[list[int]]:
    # 各機械の総処理時間とインデックスを持つ最小ヒープ
    machines: list[tuple[int, int]] = [(0, i) for i in range(m)]
    heapq.heapify(machines)
    assignment: list[list[int]] = [[] for _ in range(m)]

    for job in sorted(processing_times, reverse=True):
        load, idx = heapq.heappop(machines)
        assignment[idx].append(job)
        heapq.heappush(machines, (load + job, idx))

    return assignment


def makespan(assignment: list[list[int]]) -> int:
    return max(sum(jobs) for jobs in assignment)
```

```typescript
class MinHeap {
  private data: [number, number][] = []; // [load, machineIndex]

  push(item: [number, number]): void {
    this.data.push(item);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent][0] <= this.data[i][0]) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  pop(): [number, number] {
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < this.data.length && this.data[l][0] < this.data[smallest][0])
          smallest = l;
        if (r < this.data.length && this.data[r][0] < this.data[smallest][0])
          smallest = r;
        if (smallest === i) break;
        [this.data[smallest], this.data[i]] = [
          this.data[i],
          this.data[smallest],
        ];
        i = smallest;
      }
    }
    return top;
  }
}

function lptScheduling(processingTimes: number[], m: number): number[][] {
  const heap = new MinHeap();
  for (let i = 0; i < m; i++) heap.push([0, i]);
  const assignment: number[][] = Array.from({ length: m }, () => []);

  const sorted = [...processingTimes].sort((a, b) => b - a);
  for (const job of sorted) {
    const [load, idx] = heap.pop();
    assignment[idx].push(job);
    heap.push([load + job, idx]);
  }
  return assignment;
}

function makespan(assignment: number[][]): number {
  return Math.max(...assignment.map((jobs) => jobs.reduce((a, b) => a + b, 0)));
}
```
