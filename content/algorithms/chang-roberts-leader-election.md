---
name: Chang-Robertsのリーダー選出アルゴリズム
category: 並行処理・並列アルゴリズム
subcategory: ロックフリー構造・分散協調
complexity: O(n²)(最悪ケース)、O(n log n)(平均ケース、n参加ノード数)
summary: リング状に接続されたプロセス群が、自分のIDより大きいIDだけを一方向に転送し続けることで、明示的な中央管理なしに最大IDを持つプロセスを唯一のリーダーとして選出する分散アルゴリズム。
---

## 概要

分散システムでは、複数のプロセス(ノード)の中から1つを「リーダー」として選び、調整役を担わせたい場面が多い([分散システム](/algorithms/raft)の合意形成プロトコルにおけるリーダー選出などがその代表例)。1979年にチャンとロバーツが発表したこのアルゴリズムは、各プロセスが一意のID(番号)を持ち、リング状(環状)に一方向に接続されているという単純な仮定のもとで、メッセージを一方向に回覧するだけで、中央の管理者なしに最大のIDを持つプロセスを唯一のリーダーとして選出する、分散協調の教育的な例としてよく引用される手法である。

## 仕組み

1. `n`個のプロセスが、一意のID(番号)を持ち、リング状に接続されているとする(各プロセスは自分の「次」のプロセスにしかメッセージを送れない)
2. 各プロセスは、まず自分自身のIDを、リングの次のプロセスへメッセージとして送信する
3. あるプロセスが、隣から届いたメッセージ中のID`m`を受け取ったとき: (a) `m`が自分のIDより大きければ、そのメッセージをそのまま次のプロセスへ転送する(自分より強い候補がいることを認め、その候補の主張を中継する)、(b) `m`が自分のIDより小さければ、そのメッセージを**破棄**する(自分の方が強いので、弱い候補の主張を潰す)、(c) `m`が自分自身のIDと一致した場合、それは自分が送ったメッセージが一周してリングを回りきって戻ってきたことを意味し、自分こそが最大のIDを持つ唯一のプロセスであることが確定するので、自分をリーダーとして宣言し、その宣言を今度は全プロセスに通知するために再度リングを1周させる
4. IDが小さいプロセスの主張は途中で確実に破棄され、最大のIDを持つプロセスの主張だけが必ずリングを一周して生き残るため、最終的に唯一のリーダーが確定する

## 特性・トレードオフ

- **計算量**: 最悪ケース(IDがリング上で単調増加・減少するように並んでいる場合)ではメッセージ数が`O(n²)`になりうるが、IDがランダムに配置されている典型的な場合の平均メッセージ数は`O(n log n)`程度に抑えられることが解析されている
- **中央管理なしの合意形成**: どのプロセスも「自分が全体の中で最大かどうか」を、局所的な比較(自分と、通りかかったメッセージの値の比較)の繰り返しだけで、全体としては大域的に正しい結論(誰が最大か)に到達できる——分散システムにおける「局所的な情報だけから大域的な合意を導く」という考え方の典型例になっている
- **トポロジー(リング)への依存**: このアルゴリズムはプロセス群がリング状に接続されていることを前提としており、任意のネットワークトポロジーには直接適用できない。[Bullyアルゴリズム](/algorithms/bully-algorithm)のような、より一般的なネットワーク構造を前提とした別のリーダー選出アルゴリズムも存在し、システムの実際のネットワーク構成に応じて使い分けられる
- **使いどころ**: リング型トポロジーを持つ分散システム(トークンリングネットワークなど)でのリーダー選出、分散アルゴリズムの理論教育における「局所的なルールから大域的な合意を導く」設計パターンの例示、分散データベースにおけるプライマリノードの選出プロトコルの理論的基盤

## 実装例

```python
from collections import deque

def chang_roberts_leader_election(ids: list[int]) -> int:
    n = len(ids)
    if n == 0:
        raise ValueError("ids must not be empty")
    queues = [deque([ids[i]]) for i in range(n)]
    leader = None
    progressed = True
    while progressed and leader is None:
        progressed = False
        for i in range(n):
            if not queues[i]:
                continue
            m = queues[i].popleft()
            progressed = True
            p = (i + 1) % n
            if m > ids[p]:
                queues[p].append(m)
            elif m == ids[p]:
                leader = p
                break
    if leader is None:
        raise RuntimeError("no leader found")
    return ids[leader]
```

```typescript
function changRobertsLeaderElection(ids: number[]): number {
  const n = ids.length;
  if (n === 0) throw new Error("ids must not be empty");
  const queues: number[][] = ids.map((id) => [id]);
  let leader: number | null = null;
  let progressed = true;
  while (progressed && leader === null) {
    progressed = false;
    for (let i = 0; i < n; i++) {
      if (queues[i].length === 0) continue;
      const m = queues[i].shift()!;
      progressed = true;
      const p = (i + 1) % n;
      if (m > ids[p]) {
        queues[p].push(m);
      } else if (m === ids[p]) {
        leader = p;
        break;
      }
    }
  }
  if (leader === null) throw new Error("no leader found");
  return ids[leader];
}
```

```cpp
#include <vector>
#include <deque>
#include <stdexcept>

int changRobertsLeaderElection(const std::vector<int>& ids) {
    int n = static_cast<int>(ids.size());
    if (n == 0) throw std::invalid_argument("ids must not be empty");
    std::vector<std::deque<int>> queues(n);
    for (int i = 0; i < n; i++) queues[i].push_back(ids[i]);
    int leader = -1;
    bool progressed = true;
    while (progressed && leader == -1) {
        progressed = false;
        for (int i = 0; i < n; i++) {
            if (queues[i].empty()) continue;
            int m = queues[i].front();
            queues[i].pop_front();
            progressed = true;
            int p = (i + 1) % n;
            if (m > ids[p]) {
                queues[p].push_back(m);
            } else if (m == ids[p]) {
                leader = p;
                break;
            }
        }
    }
    if (leader == -1) throw std::runtime_error("no leader found");
    return ids[leader];
}
```

```rust
use std::collections::VecDeque;

fn chang_roberts_leader_election(ids: &[i64]) -> i64 {
    let n = ids.len();
    assert!(n > 0, "ids must not be empty");
    let mut queues: Vec<VecDeque<i64>> = ids.iter().map(|&id| VecDeque::from(vec![id])).collect();
    let mut leader: Option<usize> = None;
    let mut progressed = true;
    while progressed && leader.is_none() {
        progressed = false;
        for i in 0..n {
            let m = match queues[i].pop_front() {
                Some(v) => v,
                None => continue,
            };
            progressed = true;
            let p = (i + 1) % n;
            if m > ids[p] {
                queues[p].push_back(m);
            } else if m == ids[p] {
                leader = Some(p);
                break;
            }
        }
    }
    ids[leader.expect("no leader found")]
}
```

```csharp
static int ChangRobertsLeaderElection(List<int> ids)
{
    int n = ids.Count;
    if (n == 0) throw new ArgumentException("ids must not be empty");
    var queues = ids.Select(id => new Queue<int>(new[] { id })).ToList();
    int? leader = null;
    bool progressed = true;
    while (progressed && leader == null)
    {
        progressed = false;
        for (int i = 0; i < n; i++)
        {
            if (queues[i].Count == 0) continue;
            int m = queues[i].Dequeue();
            progressed = true;
            int p = (i + 1) % n;
            if (m > ids[p])
            {
                queues[p].Enqueue(m);
            }
            else if (m == ids[p])
            {
                leader = p;
                break;
            }
        }
    }
    if (leader == null) throw new InvalidOperationException("no leader found");
    return ids[leader.Value];
}
```
