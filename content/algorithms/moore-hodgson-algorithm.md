---
name: Moore-Hodgsonのアルゴリズム
category: 貪欲法
subcategory: 基本貪欲法
complexity: O(n log n)
summary: 締切付き単一機械スケジューリングで遅延ジョブ数を最小化する問題を、締切順の貪欲な挿入と最悪ジョブの除去の組み合わせで厳密に最適解を求める。
---

## 概要

単一の機械で複数のジョブを処理するとき、各ジョブには「処理時間」と「締切」が定められている。全てのジョブを1つずつ順番に処理していく中で、**締切に間に合わなかった(遅延した)ジョブの本数**をできるだけ少なくするには、どの順序で処理すべきか——という問題(1||ΣUj問題として知られる)。一見、動的計画法が必要になりそうな最適化問題だが、Moore-Hodgsonのアルゴリズムは「締切の早い順に貪欲にジョブを挿入し、間に合わなくなったら**それまでに挿入した中で最も処理時間が長いジョブを除外する**」という比較的単純な手順で、O(n log n)の厳密な最適解を導く。1968年にJ.M. Moore、後にTed Hodgsonによって整理された古典的な結果。

## 仕組み

1. 全てのジョブを、**締切の早い順**にソートする
2. 「現在採用しているジョブの集合」を空で初期化し、その総処理時間を0とする
3. ソート順にジョブを1つずつ取り出し、いったん採用集合に追加する(このとき、優先度付きキューにも処理時間をキーとして登録しておく)
4. 追加した結果、**採用集合の総処理時間がそのジョブの締切を超えてしまった**場合、採用集合の中で**処理時間が最も長いジョブ**を1つ選んで除外する(優先度付きキューから最大値を取り出す)。除外したジョブは「遅延ジョブ」として別集合に回す
5. 全てのジョブを処理し終えるまで3〜4を繰り返す
6. 最終的な採用集合が「締切内に処理できるジョブ」、除外されたジョブが「遅延させてよいジョブ」の最適な組であり、遅延ジョブ数が最小化されている

**なぜ「最も処理時間が長いジョブ」を除外するのが最善なのか**(交換論法による直感): 締切をオーバーした時点で、必ず誰か1つを遅延ジョブに回さなければならない。このとき、採用集合の中で最も処理時間が長いジョブを抜けば、残りのジョブ全体の総処理時間が最大幅で減少し、以降のジョブがそれぞれの締切に間に合う余地を最大限に確保できる。処理時間の短いジョブを残しておく方が、後続のジョブにとって"場所を空けやすい"という直感が、この規則の正しさの背景にある。

## 特性・トレードオフ

- **計算量**: O(n log n)。締切でのソートにO(n log n)、各ジョブの挿入・除外を優先度付きキューで管理すればO(log n)ずつなので、全体でO(n log n)に収まる
- **貪欲法が"証明付きで"最適になる稀有な例**: 「締切順に貪欲に挿入し、超過したら最大処理時間のジョブを除く」という手順が、遅延ジョブ数を厳密に最小化することは交換論法で証明できる。単一機械・単一締切の枠組みという条件下でのみ成り立つ結果であり、[区間スケジューリング問題](/algorithms/interval-scheduling)や[貪欲法による区間点被覆問題](/algorithms/greedy-interval-point-cover)と同じく、貪欲法の正しさを数学的に保証できる希少な最適化問題の一つ
- **関連する[ジョブの締切スケジューリング問題](/algorithms/job-sequencing-with-deadlines)との違い**: 締切付きジョブ選択問題では「各ジョブに利益があり、締切内に処理できるジョブの利益合計を最大化する」ことが目的で、処理時間は一律1単位という単純化がされることが多い。一方Moore-Hodgsonのアルゴリズムは、ジョブごとに異なる処理時間を許し、目的も「遅延ジョブの**本数**の最小化」である点が異なる。より複雑な設定(遅延に対して重み付きのペナルティを課す、処理時間も考慮したコストを最小化するなど)になると単純な貪欲法では解けなくなり、動的計画法やより高度な組合せ最適化の手法が必要になる
- **反例として注意すべき前提**: この結果が成り立つのは「単一機械・全ジョブが時刻0で到着可能・目的関数が遅延ジョブ数の単純な合計」という比較的限定された設定下でのみ。機械が複数台になる、ジョブに到着時刻の制約が加わる、遅延に対して重み付きコストがかかる、といった一般化を行うと、この問題は途端にNP困難になり、単純な貪欲法では最適性が保証されなくなる
- **使いどころ**: 工場の単一生産ラインにおける締切付き受注のスケジューリング、CPUの単一コアでのリアルタイムタスク処理(締切を守れないタスクの数を最小化したい場合)、印刷・出荷業務における納期遵守率の最大化など

## 実装例

```python
import heapq


def moore_hodgson(jobs: list[tuple[int, int]]) -> tuple[list[int], list[int]]:
    """
    jobs: (processing_time, deadline) のリスト
    戻り値: (締切内に処理できるジョブのインデックス列, 遅延させるジョブのインデックス列)
    """
    order = sorted(range(len(jobs)), key=lambda i: jobs[i][1])
    accepted: list[int] = []
    late: list[int] = []
    heap: list[tuple[int, int]] = []  # (-processing_time, index) の最大ヒープ代用
    total_time = 0

    for idx in order:
        p, d = jobs[idx]
        accepted.append(idx)
        heapq.heappush(heap, (-p, idx))
        total_time += p

        if total_time > d:
            worst_neg_p, worst_idx = heapq.heappop(heap)
            worst_p = -worst_neg_p
            total_time -= worst_p
            accepted.remove(worst_idx)
            late.append(worst_idx)

    return accepted, late
```

```typescript
class MaxHeap {
  private data: [number, number][] = []; // [processingTime, index]

  push(item: [number, number]): void {
    this.data.push(item);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent][0] >= this.data[i][0]) break;
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
        let largest = i;
        if (l < this.data.length && this.data[l][0] > this.data[largest][0])
          largest = l;
        if (r < this.data.length && this.data[r][0] > this.data[largest][0])
          largest = r;
        if (largest === i) break;
        [this.data[largest], this.data[i]] = [this.data[i], this.data[largest]];
        i = largest;
      }
    }
    return top;
  }

  get size(): number {
    return this.data.length;
  }
}

function mooreHodgson(
  jobs: [number, number][], // [processingTime, deadline]
): { accepted: number[]; late: number[] } {
  const order = jobs.map((_, i) => i).sort((a, b) => jobs[a][1] - jobs[b][1]);
  const acceptedSet = new Set<number>();
  const late: number[] = [];
  const heap = new MaxHeap();
  let totalTime = 0;

  for (const idx of order) {
    const [p, d] = jobs[idx];
    acceptedSet.add(idx);
    heap.push([p, idx]);
    totalTime += p;

    if (totalTime > d) {
      const [worstP, worstIdx] = heap.pop();
      totalTime -= worstP;
      acceptedSet.delete(worstIdx);
      late.push(worstIdx);
    }
  }

  return { accepted: [...acceptedSet], late };
}
```
