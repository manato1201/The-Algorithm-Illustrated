---
name: ゴシッププロトコル(Gossip Protocol)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(log n)(ラウンド数、全ノードへ情報が伝播するまで)
summary: 各ノードが定期的にランダムに選んだ他のノードと情報を交換するだけで、中央調整役を一切必要とせず、疫病の伝染のように指数関数的な速さで情報がクラスタ全体に伝播していく、単純さと耐障害性を両立した情報伝播の仕組み。
---

## 概要

[Raft](/algorithms/raft)や[Paxos](/algorithms/paxos)がリーダーを選出して集中的に合意を形成するのに対し、ゴシッププロトコル(疫病アルゴリズムとも呼ばれる)は正反対の発想を取る——特定のリーダーや調整役を一切置かず、各ノードが定期的に「ランダムに選んだ数個の他のノードとだけ」自分の持つ情報を交換する、という極めて単純な局所的操作だけを繰り返す。人間社会の噂話(ゴシップ)が、特定の発信源から放送されるのではなく人から人へランダムに伝わっていくうちに驚くほど速く広まる様子になぞらえて名付けられており、実際に感染症の伝播モデル(疫学のSIRモデル)と同じ数学的構造を持つ。中央集権的な調整を避けたいこと、そしてノードの一部が故障・脱落しても情報伝播が止まらない耐障害性が、大規模分散システムで重宝される理由になっている。

## 仕組み

1. 各ノードは、自分が知っている情報(更新されたデータ、クラスタメンバーシップの変化など)を保持する
2. 一定の間隔(ラウンド)ごとに、各ノードはクラスタ内から`k`個(典型的には1〜3個程度)のノードをランダムに選び、自分の持つ情報を送信する
3. 情報を受け取ったノードは、それが自分がまだ知らない新しい情報であれば取り込み、次のラウンドで自分もその情報を(ランダムに選んだ別のノードへ)ゴシップする側になる
4. この「情報を知っているノードの数」は、各ラウンドでおよそ2倍に増えていく(疫病の感染者数が指数関数的に増えるのと同じ数理モデル)——`n`個のノード全体に情報が行き渡るまでのラウンド数は`O(log n)`程度で済む
5. 一定期間経過後、全ノードが同じ情報を保持した状態(結果整合性)に収束する

## 特性・トレードオフ

- **計算量**: 情報が全ノードに伝播するまでのラウンド数は`O(log n)`——ノード数が倍になってもラウンド数はわずかしか増えない、スケーラビリティに優れた伝播特性を持つ
- **単一障害点が存在しないという耐障害性**: [Raft](/algorithms/raft)や[Paxos](/algorithms/paxos)、[ブリー・アルゴリズム](/algorithms/bully-algorithm)のようなリーダーベースの手法は、リーダー選出や合意形成のプロトコルそのものが複雑になりがちだが、ゴシッププロトコルは各ノードが対等な立場で動作するため、ノードの一部が故障してもプロトコル自体は破綻せず情報伝播が(遅くなりこそすれ)継続する
- **強整合性ではなく結果整合性しか保証できない**: 全ノードが同じ情報を持つまでには時間差(遅延)があり、その間はノードによって見えているデータが異なる可能性がある——強い一貫性が必要な合意形成には[Raft](/algorithms/raft)や[Paxos](/algorithms/paxos)が必要であり、ゴシッププロトコルは「最終的に全員が知っていればよい」情報の拡散に用途が限定される
- **使いどころ**: Amazon DynamoやCassandraのようなNoSQLデータベースにおけるクラスタメンバーシップ管理・障害検出の情報伝播、Bitcoinなどのブロックチェーンにおけるトランザクション・ブロックの伝播、大規模サービスにおける設定変更の分散配信、[マークル木](/algorithms/merkle-tree)と組み合わせた効率的な差分同期(反エントロピー、Anti-Entropy)

## 実装例

`n`ノード中1ノードだけが情報を知っている状態から出発し、各ラウンドで情報を知っている全ノードがランダムに`fanout`個のノードへ伝える、というシミュレーション。ノード数が200でも収束は`O(log n)`程度のラウンド数で済む。

```python
import random


def gossip_spread(n: int, fanout: int, rng: random.Random) -> int:
    informed = [False] * n
    informed[0] = True
    informed_count = 1
    rounds = 0
    while informed_count < n:
        rounds += 1
        currently_informed = [i for i in range(n) if informed[i]]
        for node in currently_informed:
            targets = rng.sample(range(n), min(fanout, n))
            for t in targets:
                if not informed[t]:
                    informed[t] = True
                    informed_count += 1
    return rounds
```

```typescript
function gossipSpread(n: number, fanout: number, rng: () => number): number {
  const informed = new Array(n).fill(false);
  informed[0] = true;
  let informedCount = 1;
  let rounds = 0;

  const sample = (k: number): number[] => {
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, k);
  };

  while (informedCount < n) {
    rounds++;
    const currentlyInformed = [];
    for (let i = 0; i < n; i++) if (informed[i]) currentlyInformed.push(i);
    for (const node of currentlyInformed) {
      const targets = sample(Math.min(fanout, n));
      for (const t of targets) {
        if (!informed[t]) {
          informed[t] = true;
          informedCount++;
        }
      }
    }
  }
  return rounds;
}
```

```cpp
#include <vector>
#include <algorithm>
#include <random>

int gossipSpread(int n, int fanout, std::mt19937& rng) {
    std::vector<bool> informed(n, false);
    informed[0] = true;
    int informedCount = 1;
    int rounds = 0;

    while (informedCount < n) {
        rounds++;
        std::vector<int> currentlyInformed;
        for (int i = 0; i < n; i++) if (informed[i]) currentlyInformed.push_back(i);

        for (int node : currentlyInformed) {
            std::vector<int> idx(n);
            for (int i = 0; i < n; i++) idx[i] = i;
            std::shuffle(idx.begin(), idx.end(), rng);
            int k = std::min(fanout, n);
            for (int i = 0; i < k; i++) {
                int t = idx[i];
                if (!informed[t]) {
                    informed[t] = true;
                    informedCount++;
                }
            }
        }
    }
    return rounds;
}
```

```rust
use rand::seq::SliceRandom;
use rand::Rng;

fn gossip_spread(n: usize, fanout: usize, rng: &mut impl Rng) -> u32 {
    let mut informed = vec![false; n];
    informed[0] = true;
    let mut informed_count = 1;
    let mut rounds = 0;

    while informed_count < n {
        rounds += 1;
        let currently_informed: Vec<usize> = (0..n).filter(|&i| informed[i]).collect();

        for _ in &currently_informed {
            let mut idx: Vec<usize> = (0..n).collect();
            idx.shuffle(rng);
            for &t in idx.iter().take(fanout.min(n)) {
                if !informed[t] {
                    informed[t] = true;
                    informed_count += 1;
                }
            }
        }
    }
    rounds
}
```

```csharp
static int GossipSpread(int n, int fanout, Random rng)
{
    var informed = new bool[n];
    informed[0] = true;
    int informedCount = 1;
    int rounds = 0;

    while (informedCount < n)
    {
        rounds++;
        var currentlyInformed = Enumerable.Range(0, n).Where(i => informed[i]).ToList();
        foreach (var node in currentlyInformed)
        {
            var targets = Enumerable.Range(0, n).OrderBy(_ => rng.Next()).Take(Math.Min(fanout, n));
            foreach (var t in targets)
            {
                if (!informed[t]) { informed[t] = true; informedCount++; }
            }
        }
    }
    return rounds;
}
```
