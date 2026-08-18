---
name: BSPモデル(Bulk Synchronous Parallel)
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(w + g・h + L)(1スーパーステップあたり、wは計算量、hは通信量、Lはバリア同期のコスト)
summary: 「ローカル計算」「全体通信」「同期バリア」の3フェーズを繰り返す「スーパーステップ」を単位として並列計算を進めることで、複雑な同期制御を書かずに決定論的な並列アルゴリズムを設計できるようにする計算モデル。
---

## 概要

複数の計算ノードが協調して1つの問題を解く分散・並列計算では、各ノードがいつ・どの相手と・どんな順序でデータをやり取りするかを制御する同期ロジックが、アルゴリズム本体よりも複雑になりがちである。1990年にレスリー・ヴァリアントが提唱したBulk Synchronous Parallel(BSP)モデルは、この複雑さを「**スーパーステップ**」という単純な単位に閉じ込めることで解決する計算モデルである。各スーパーステップは「(1) 各ノードが自分の持つローカルデータだけを使って計算する」「(2) 計算結果を他のノードに向けてメッセージとして送信する」「(3) 全ノードがバリア(関所)で足並みを揃え、全員がこのステップを終えるまで誰も先には進めない」という3つのフェーズから成り、次のスーパーステップに入る前に必ず全メッセージが配送済みであることが保証される。この単純な繰り返し構造のおかげで、プログラマは複雑なロックや条件変数を書くことなく、決定論的で再現性のある並列アルゴリズムを設計できる。BSPは特定の実装ではなく**理論的な計算モデル**であり、[MapReduce](/algorithms/mapreduce)をはじめとする多くの分散計算フレームワークの背後にある理論的基盤になっている——MapReduceの「Map→Shuffle→Reduce」という1ラウンドの流れは、BSPの1スーパーステップに相当すると見ることができる。

## 仕組み

1. 問題を複数の計算ノード(プロセッサ)に分割し、各ノードにデータの一部を割り当てる
2. **計算フェーズ**: 各ノードは、自分に割り当てられたローカルデータと、前のスーパーステップまでに自分宛てに届いたメッセージだけを使って計算を行う。この間、他のノードとの通信は一切発生しない(各ノードは完全に独立に動作できる)
3. **通信フェーズ**: 計算の結果、他のノードへ送る必要があるデータがあれば、非同期にメッセージとして送信する。この時点ではメッセージが実際に届いたかどうかは保証されない
4. **同期バリア**: 全ノードが計算・通信フェーズを終えたら、バリアで足並みを揃える。バリアを通過した時点で、直前のスーパーステップで送信された全メッセージが受信側に確実に届いていることが保証される。1つでもノードが遅れていれば、他の全ノードはそのノードがバリアに到達するまで待つ
5. 手順2〜4を、問題が解けるまで(収束条件を満たすまで、または一定回数)繰り返す。各スーパーステップの終わりに新しいメッセージがローカルの状態に反映され、次のスーパーステップの計算に使われる

## 特性・トレードオフ

- **計算量**: 1スーパーステップのコストは、各ノードの計算量`w`(ワーカー間の最大値)、通信量`h`(送受信するメッセージ数の最大値)にネットワーク性能を表す係数`g`をかけたもの、そしてバリア同期自体のオーバーヘッド`L`の和`O(w + g・h + L)`として理論的にモデル化できる。この単純なコストモデルにより、アルゴリズムの並列性能を実装前に見積もりやすい
- **決定論性とデバッグのしやすさ**: バリアによって各スーパーステップの境界が明確に区切られるため、「いつどのデータが揃っているか」が予測可能で、非同期な並行処理につきものの競合状態やタイミング依存のバグが起きにくい。この単純さがBSPモデルの最大の実務的な価値である
- **バリア同期のコストと遅いノード問題**: 全ノードが最も遅いノードを待つ必要があるため、ノード間の負荷が不均衡だったり、1台でも性能が劣化したノード(いわゆる「掉尾効果」straggler)があると、全体の性能がその1台に引きずられる。頻繁なバリア同期はオーバーヘッドにもなるため、スーパーステップの粒度(1回あたりどれだけの計算をまとめるか)の設計が性能を左右する
- **[MapReduce](/algorithms/mapreduce)との関係**: MapReduceの1ラウンド(Map処理→シャッフル→Reduce処理)はBSPの1スーパーステップと本質的に同じ構造を持つ——「ローカル計算」「全体通信(シャッフル)」「次のラウンドへ進む前の暗黙的な同期」に対応する。GoogleのPregel(グラフ処理フレームワーク)やApache Giraph、Apache Sparkの初期の設計もBSPモデルを直接の理論的基盤としている
- **使いどころ**: 大規模グラフ処理(PageRankの反復計算など)、分散機械学習における勾配同期、科学技術計算での格子ベースのシミュレーション。ノード間の依存関係が「ステップ単位でまとまって」おり、細粒度の非同期通信が不要な問題に適している

## 実装例

`num_nodes`個のノードが分散環境にいることを模した、単一プロセス内でのBSPスーパーステップのシミュレーション。各ノードが隣接ノードとメッセージを交換しながら値を合計していく簡単な例(各ノードは自分の初期値を持ち、リング状に隣へ伝播させて全体の合計を全ノードが知るまで繰り返す)を、スーパーステップの3フェーズ(計算・通信・バリア)として実装する。

```python
from dataclasses import dataclass, field


@dataclass
class Node:
    node_id: int
    value: int
    known_sum: int
    inbox: list[int] = field(default_factory=list)
    outbox: dict[int, int] = field(default_factory=dict)


class BspSimulator:
    def __init__(self, initial_values: list[int]) -> None:
        self.num_nodes = len(initial_values)
        self.nodes = [
            Node(node_id=i, value=v, known_sum=v) for i, v in enumerate(initial_values)
        ]
        self.superstep_count = 0

    def run_superstep(self) -> None:
        # 1) 計算フェーズ: 各ノードは自分のknown_sumを隣(リング上の次)へ送るメッセージを準備する
        for node in self.nodes:
            next_id = (node.node_id + 1) % self.num_nodes
            node.outbox = {next_id: node.known_sum}

        # 2) 通信フェーズ: メッセージを送信する(この時点ではまだ受信側には反映されない)
        pending: dict[int, list[int]] = {i: [] for i in range(self.num_nodes)}
        for node in self.nodes:
            for dest, msg in node.outbox.items():
                pending[dest].append(msg)

        # 3) バリア: 全ノードのメッセージが出揃ってから、一斉にinboxへ反映する
        for node in self.nodes:
            node.inbox = pending[node.node_id]
            for msg in node.inbox:
                node.known_sum += msg
            node.inbox = []

        self.superstep_count += 1

    def run_until_converged(self, max_supersteps: int) -> int:
        total = sum(n.value for n in self.nodes)
        for _ in range(max_supersteps):
            self.run_superstep()
            if all(n.known_sum == total for n in self.nodes):
                break
        return self.superstep_count
```

```typescript
class BspNode {
  knownSum: number;
  outbox: Map<number, number> = new Map();

  constructor(
    public nodeId: number,
    public value: number,
  ) {
    this.knownSum = value;
  }
}

class BspSimulator {
  private nodes: BspNode[];
  private numNodes: number;
  supersteps = 0;

  constructor(initialValues: number[]) {
    this.numNodes = initialValues.length;
    this.nodes = initialValues.map((v, i) => new BspNode(i, v));
  }

  private runSuperstep(): void {
    // 1) 計算フェーズ: 各ノードは自分のknownSumを隣(リング上の次)へ送るメッセージを準備する
    for (const node of this.nodes) {
      const nextId = (node.nodeId + 1) % this.numNodes;
      node.outbox = new Map([[nextId, node.knownSum]]);
    }

    // 2) 通信フェーズ: メッセージを送信する(この時点ではまだ受信側には反映されない)
    const pending: number[][] = Array.from({ length: this.numNodes }, () => []);
    for (const node of this.nodes) {
      for (const [dest, msg] of node.outbox) pending[dest].push(msg);
    }

    // 3) バリア: 全ノードのメッセージが出揃ってから、一斉に反映する
    for (const node of this.nodes) {
      for (const msg of pending[node.nodeId]) node.knownSum += msg;
    }

    this.supersteps++;
  }

  runUntilConverged(maxSupersteps: number): number {
    const total = this.nodes.reduce((s, n) => s + n.value, 0);
    for (let i = 0; i < maxSupersteps; i++) {
      this.runSuperstep();
      if (this.nodes.every((n) => n.knownSum === total)) break;
    }
    return this.supersteps;
  }
}
```
