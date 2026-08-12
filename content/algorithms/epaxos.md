---
name: EPaxos(Egalitarian Paxos)
category: 分散システム
subcategory: 合意形成
complexity: O(ノード数)(メッセージ数、競合なしなら1ラウンドトリップで確定)
summary: 固定リーダーを置かず、任意のノードが自分宛のコマンドを提案し、コマンド同士の依存関係だけを合意することで、地理分散環境でも低レイテンシに合意を得るリーダーレス型の合意アルゴリズム。
---

## 概要

[Paxos](/algorithms/paxos)や[Raft](/algorithms/raft)は「常に1つのリーダーが全ての操作を受け付ける」という構造を取る。この構造は理解しやすく安全性の証明もしやすい一方で、**リーダーから地理的に離れたクライアントは、リーダーの近くにいるクライアントより余分なネットワーク往復(ラウンドトリップ)を強いられる**という欠点を持つ。また、リーダーが故障すると新リーダーが選出されるまでシステム全体が書き込みを受け付けられなくなる。EPaxos(Egalitarian Paxos、「平等主義的Paxos」)は、2013年にIulian Moraru・David Andersen・Michael Kaminskyが発表した論文 "There Is More Consensus in Egalitarian Parliaments" で提案された、**リーダーという特別な役割を置かず、どのノードでも自分に届いたコマンドをその場で提案できる**合意アルゴリズムである。合意すべき対象を「操作の内容そのもの」から「操作同士の依存関係(実行順序の制約)」に絞り込むことで、リーダーの偏りに起因するレイテンシの不公平とボトルネックを同時に解消する。

## 仕組み

EPaxosでは、クライアントからコマンドを受け取ったノードが、そのコマンドについての「**コマンドリーダー(command leader)**」として振る舞う。リーダーはコマンドごとに毎回変わりうる(=誰もが平等にリーダーになれる、というのが名前の由来)。

1. **提案(PreAccept)**: コマンドを受け取ったノードは、それを近隣の過半数近く(高速クォーラム、`⌊N/2⌋ + ⌈(F+1)/2⌉`程度のノード数)に転送し、それぞれが「自分が知っている、このコマンドと**競合する**(同じデータに触れるなど、実行順序が結果に影響しうる)既存コマンド一覧」を返してもらう
2. **依存関係の確定**: 提案ノードは、返ってきた依存関係の集合を合わせ、そのコマンドが「どのコマンドより後に実行されるべきか」という依存関係のリストを組み立てる。**全ての応答が同じ依存関係を報告していれば**(競合なし)、この時点で提案は確定し、1回のラウンドトリップだけで合意が完了する(**高速パス、fast path**)
3. **食い違いがある場合(Accept)**: 応答内容が食い違う(=真に競合するコマンドが並行して提案された)場合は、Paxosのフェーズ2に似た追加の1ラウンドを挟んで、依存関係の集合を過半数の合意のもとで確定させる(**低速パス、slow path**)。この場合でも従来のリーダー固定型アルゴリズムと同程度のラウンドトリップ数に収まる
4. **実行**: 各ノードは、確定した依存関係をもとに**コマンド間の有向グラフ**を組み立て、グラフを(閉路がある場合はその閉路=強連結成分をまとめて)トポロジカルソートすることで、安全な実行順序を導き出す。互いに依存しない(競合しない)コマンドは、順序を気にせず並行に実行してよい

固定リーダーがいないため、あるノードが故障しても他のノードの提案には一切影響しない。「合意すべきものを操作の値そのものではなく、操作同士の順序関係に絞り込む」ことで、多くの操作が競合しない現実的なワークロードにおいて、Paxos/Raftより少ないラウンドトリップで済むケースが多くなる。

## 特性・トレードオフ

- **計算量**: 通常ケース(競合なし)ではO(ノード数)のメッセージ交換で1ラウンドトリップのうちに確定する。競合が生じた場合はPaxos同様の追加ラウンドが必要になるが、頻度が低ければ全体としての平均レイテンシはPaxos/Raftより小さくなりやすい
- **[Paxos](/algorithms/paxos)・[Raft](/algorithms/raft)との根本的な違い**: 両者が「常に1人のリーダーだけが操作を受け付ける」という強い制約のもとで安全性を担保するのに対し、EPaxosは**リーダーレス(leaderless)**――どのノードも自分宛のリクエストを自分で処理できる。この結果、(1) 特定のノードにリクエストが集中しない、(2) クライアントは最寄りのノードにリクエストを送ればよく地理的な公平性が高い、(3) 1ノードが落ちてもリーダー再選出による書き込み停止期間(フェイルオーバーのダウンタイム)が発生しない、という利点が生まれる
- **複雑さという代償**: リーダー固定という単純化を捨てた分、依存関係グラフの管理・強連結成分の検出・実行順序の決定といった追加の複雑さを抱える。理解しやすさを最優先したRaftとは対照的に、実装・検証の難易度は高い部類に入る
- **競合の多いワークロードでは恩恵が薄れる**: ほとんどの操作が同じデータに触れて競合するようなワークロードでは、低速パスが頻発し、Paxos/Raftに対する優位性が小さくなる。EPaxosの強みは「多くの操作が互いに独立している」場合に最大化される
- **使いどころ**: 複数リージョンにまたがる地理分散データベースのレプリケーション(CockroachDBの内部設計にも影響を与えた)、リーダー集中によるホットスポットを避けたい高可用ストレージシステム、Multi-Paxosの発展形として低レイテンシ合意を追求する研究・実装

## 実装例

競合判定・依存関係グラフの構築・トポロジカルソートによる実行順序決定という核心部分を、単一プロセス内のシミュレーションとして実装する。

```python
from dataclasses import dataclass, field


@dataclass
class Command:
    id: int
    key: str  # 触れるデータのキー。同じキーに触れるコマンド同士は競合する


class EPaxosCluster:
    def __init__(self, n_replicas: int):
        self.n_replicas = n_replicas
        self.commands: dict[int, Command] = {}
        self.deps: dict[int, set[int]] = {}  # コマンドID -> 依存するコマンドIDの集合

    def _conflicts_with(self, cmd: Command) -> set[int]:
        """既に登録済みのコマンドのうち、同じキーに触れる(競合する)ものを探す。"""
        return {cid for cid, c in self.commands.items() if c.key == cmd.key}

    def propose(self, cmd: Command) -> set[int]:
        """PreAccept: 競合するコマンドを依存関係として記録し、コマンドを登録する。
        高速パス・低速パスの区別は、応答が割れるかどうかの詳細に相当するため、
        本実装では簡略化し「登録時点で分かる競合」を依存関係として確定させる。"""
        deps = self._conflicts_with(cmd)
        self.commands[cmd.id] = cmd
        self.deps[cmd.id] = deps
        return deps

    def execution_order(self) -> list[int]:
        """依存関係グラフをトポロジカルソートし、安全な実行順序を求める。
        循環依存(強連結成分)がある場合はコマンドIDの昇順でまとめて処理する。"""
        visited: set[int] = set()
        order: list[int] = []

        def visit(cid: int, stack: set[int]) -> None:
            if cid in visited:
                return
            visited.add(cid)
            for dep in sorted(self.deps.get(cid, ())):
                if dep not in stack:  # 循環依存は無視して処理を進める
                    visit(dep, stack | {cid})
            order.append(cid)

        for cid in sorted(self.commands):
            visit(cid, set())
        return order


if __name__ == "__main__":
    cluster = EPaxosCluster(n_replicas=5)
    cluster.propose(Command(id=1, key="account:alice"))
    cluster.propose(Command(id=2, key="account:bob"))       # id=1と無関係、並行実行可
    cluster.propose(Command(id=3, key="account:alice"))     # id=1と競合、id=1より後に実行

    print(cluster.execution_order())  # 例: [1, 2, 3] や [2, 1, 3] (1は3より前)
```

```typescript
interface Command {
  id: number;
  key: string; // 触れるデータのキー。同じキーに触れるコマンド同士は競合する
}

class EPaxosCluster {
  private commands = new Map<number, Command>();
  private deps = new Map<number, Set<number>>();

  constructor(private nReplicas: number) {}

  private conflictsWith(cmd: Command): Set<number> {
    const result = new Set<number>();
    for (const [cid, c] of this.commands) {
      if (c.key === cmd.key) result.add(cid);
    }
    return result;
  }

  /**
   * PreAccept: 競合するコマンドを依存関係として記録し、コマンドを登録する。
   * 高速パス・低速パスの区別は応答が割れるかどうかの詳細に相当するため、
   * 本実装では簡略化し「登録時点で分かる競合」を依存関係として確定させる。
   */
  propose(cmd: Command): Set<number> {
    const deps = this.conflictsWith(cmd);
    this.commands.set(cmd.id, cmd);
    this.deps.set(cmd.id, deps);
    return deps;
  }

  /**
   * 依存関係グラフをトポロジカルソートし、安全な実行順序を求める。
   * 循環依存がある場合はコマンドIDの昇順でまとめて処理する。
   */
  executionOrder(): number[] {
    const visited = new Set<number>();
    const order: number[] = [];

    const visit = (cid: number, stack: Set<number>): void => {
      if (visited.has(cid)) return;
      visited.add(cid);
      const deps = [...(this.deps.get(cid) ?? [])].sort((a, b) => a - b);
      for (const dep of deps) {
        if (!stack.has(dep)) visit(dep, new Set([...stack, cid]));
      }
      order.push(cid);
    };

    for (const cid of [...this.commands.keys()].sort((a, b) => a - b)) {
      visit(cid, new Set());
    }
    return order;
  }
}

// 使用例
const cluster = new EPaxosCluster(5);
cluster.propose({ id: 1, key: "account:alice" });
cluster.propose({ id: 2, key: "account:bob" }); // id=1と無関係、並行実行可
cluster.propose({ id: 3, key: "account:alice" }); // id=1と競合、id=1より後に実行

console.log(cluster.executionOrder()); // 例: [1, 2, 3] や [2, 1, 3] (1は3より前)
```
