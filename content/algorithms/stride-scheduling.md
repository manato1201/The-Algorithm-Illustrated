---
name: ストライドスケジューリング
category: スケジューリング
subcategory: CPUスケジューリング
complexity: 1回の選択 O(log n)(優先度付きキュー)、割り当ての誤差は常に O(1) 個分の時間枠
summary: 各プロセスにチケット数に反比例する歩幅(stride)を持たせ、進み具合(pass)が最も小さいものを実行して歩幅だけ進める。くじ引きと同じ比例配分を、乱数なしで決定的に実現する。
---

## 概要

「プロセスAには60%、Bには30%、Cには10%のCPU時間を割り当てたい」という比例配分のスケジューリングは、仮想マシンやサーバーの資源の分配、マルチメディア処理の品質保証などで必要になる。[宝くじスケジューリング](/algorithms/lottery-scheduling)は、チケットを持つプロセスを乱数で選ぶので、長い時間で見れば比例配分になる。しかし乱数なので、短い時間では偏り、割り当ての誤差は実行回数 `n` に対して O(√n) で増える。

ストライドスケジューリング(Waldspurger と Weihl、1995年)は、同じ著者らが前年に提案した宝くじスケジューリングの**決定的な版**である。乱数の代わりに、各プロセスに「次に走る順番」を表す数(pass 値)を持たせ、毎回それが最小のプロセスを選ぶ。比例配分の誤差が、実行回数に関係なく**常にたかだか1〜数個の時間枠**で抑えられる。

## 仕組み

1. 十分に大きな定数 `L`(たとえば `2^20`)を決める
2. 各プロセス `i` のチケット数を `t_i` とし、**歩幅(stride)** `s_i = L / t_i` を求める。チケットが多いほど歩幅が小さい
3. 各プロセスは **pass 値**を持つ。最初は0(あるいは歩幅)
4. スケジューラが選ぶたびに:
   - pass 値が**最小**のプロセスを選ぶ(同点なら番号などで決める)
   - 選ばれたプロセスが1つの時間枠(クォンタム)だけ実行される
   - 実行後、そのプロセスの pass 値に歩幅 `s_i` を足す
5. 3〜4を繰り返す

直感: pass 値は「そのプロセスがこれまでに受けた仮想的な走行距離」。歩幅が小さい(チケットが多い)プロセスは、同じ時間枠でも進む距離が短いので、pass 値が小さいまま保たれ、頻繁に選ばれる。長い目で見ると、各プロセスの選ばれる回数は `1 / s_i`、つまりチケット数に比例する。

プロセスの参加・離脱では、新しいプロセスの pass 値を「全プロセスの pass 値の最小(または平均)」に合わせて、不当に有利・不利にならないようにする。チケット数を変えるときは、残りの pass の差を新しい歩幅に比例して調整する。

## 特性・トレードオフ

- **決定的で誤差が小さい**: 比例配分からのずれが、実行回数によらず O(1) 時間枠に収まる。くじ引きの O(√n) より、短い時間でもずっと正確
- **選択が O(log n)**: pass 値の最小を取り出すのに、ヒープ(優先度付きキュー)が要る。くじ引きは、チケットの合計から乱数を選ぶだけで、実装がより単純
- **整数の丸め**: `L / t_i` を整数にすると誤差が出る。`L` を大きく取る、あるいは剰余を保持して誤差が累積しないようにする
- **公平さの保証**: チケット数が重みとして働くので、「少ない権利のプロセスも必ず実行される」(飢餓がない)。優先度の厳密な高低ではなく、割合の配分が目的
- **後継**: Linuxの[CFS](/algorithms/completely-fair-scheduler)は、仮想実行時間(vruntime)が最小のタスクを選ぶ点で、同系統の考え方(重みに反比例した進み方、最小のものを選ぶ)を使っている
- **使いどころ**: 仮想化基盤のCPU配分、ネットワークの帯域の比例分配(パケットスケジューラ)、組込み機器の資源分配、教育用のOS実装

## 実装例

```python
import heapq

L = 1 << 20


def stride_schedule(tickets, quanta):
    """tickets: {名前: チケット数}。quanta 回の時間枠の割り当て順を返す。"""
    stride = {name: L // t for name, t in tickets.items()}
    heap = [(0, name) for name in tickets]            # (pass 値, 名前)
    heapq.heapify(heap)
    order = []
    for _ in range(quanta):
        p, name = heapq.heappop(heap)                 # pass 値が最小のプロセス
        order.append(name)
        heapq.heappush(heap, (p + stride[name], name))  # 歩幅だけ進める
    return order


order = stride_schedule({"A": 3, "B": 2, "C": 1}, 12)
print("".join(order))                         # ABCABAABCABA(順序は pass 値の同点処理による)
print({n: order.count(n) for n in "ABC"})     # {'A': 6, 'B': 4, 'C': 2} チケット比 3:2:1
```

```typescript
const L = 1 << 20;

function strideSchedule(tickets: Record<string, number>, quanta: number): string[] {
  const names = Object.keys(tickets);
  const stride = Object.fromEntries(names.map((n) => [n, Math.floor(L / tickets[n])]));
  const pass = Object.fromEntries(names.map((n) => [n, 0]));
  const order: string[] = [];
  for (let q = 0; q < quanta; q++) {
    // pass 値が最小のプロセス(同点は名前の順)。実用ではヒープを使う
    const next = names.reduce((best, n) => (pass[n] < pass[best] ? n : best));
    order.push(next);
    pass[next] += stride[next];
  }
  return order;
}

const order = strideSchedule({ A: 3, B: 2, C: 1 }, 12);
console.log(order.join(""));
console.log(["A", "B", "C"].map((n) => `${n}:${order.filter((x) => x === n).length}`)); // A:6 B:4 C:2
```
