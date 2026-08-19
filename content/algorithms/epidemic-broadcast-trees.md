---
name: 疫学的ブロードキャスト木(Epidemic Broadcast Trees, Plumtree)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(ノード数)(通常運用時のメッセージ数)
summary: 通常はスパニングツリーに沿って各メッセージを1回ずつ効率的に配送し、障害でツリーが壊れたときだけゴシッププロトコル的な冗長経路で自己修復する、木構造の効率性とゴシップの頑健性を組み合わせたブロードキャスト手法。
---

## 概要

[ゴシッププロトコル](/algorithms/gossip-protocol)は単一障害点を持たず高い耐障害性を実現するが、その代償として、全ノードに情報が伝わるまでの間、同じメッセージが何度も重複して送受信されるという冗長性(帯域の無駄)を常に抱えている。逆に、あらかじめ計算したスパニングツリー(木構造)に沿ってメッセージを配送すれば、各ノードは各メッセージをちょうど1回ずつしか受け取らず極めて効率的だが、木構造は1本のリンクやノードが切れただけでツリー全体が分断され、配送が止まってしまう脆さを持つ。Epidemic Broadcast Trees(Plumtreeとも呼ばれ、2007年に提案)は、この2つを組み合わせる——**通常運用時は効率的な木構造でメッセージを配送し、木が壊れたときだけゴシップ的な冗長経路を使って自己修復する**ことで、平常時の効率性と障害時の頑健性を両立させる。

## 仕組み

1. 各ノードは他のノードとの間に2種類のリンクを持つ: **eagerリンク**(スパニングツリーを構成する、メッセージを即座にフルコンテンツで転送するリンク)と**lazyリンク**(木には含まれないが、メッセージのID(ダイジェスト)だけを間欠的に交換しておくバックアップのリンク)
2. **通常運用(木に沿った配送)**: あるノードが新しいメッセージを受信すると、eagerリンクで接続された隣接ノード全員に即座にフルコンテンツを転送する。既に受信済みのメッセージを重複して受け取ったノードは、その送信元とのリンクを「非効率(木の本来の形から外れている)」とみなしてlazyリンクへ格下げする——この過程を繰り返すことで、ネットワーク全体が自然に効率的なスパニングツリーへ収束していく
3. **lazyリンクでの補完**: 各ノードは定期的に、lazyリンクで接続された隣接ノードへ「自分が知っているメッセージIDの一覧(ダイジェスト)」だけを送る(本文は送らないため帯域コストが低い)
4. **木の自己修復**: ノードは、lazyリンク経由のダイジェスト通知で「自分がまだ持っていないメッセージID」を知ると、そのlazyリンクに本文を要求する。一定時間eagerリンク経由でそのメッセージが届かなければ(木のどこかが切れて配送が止まっている兆候)、そのlazyリンクをeagerリンクへ昇格させて配送経路を修復する
5. この「重複を検知して木を整形する」「タイムアウトで欠損を検知してlazyリンクから復旧する」という2つのフィードバックループにより、明示的な障害検出やグローバルな木の再計算なしに、ネットワークの変化に応じてツリー構造が動的に修復され続ける

## 特性・トレードオフ

- **計算量**: 平常時はツリーに沿った配送のため、メッセージ1件あたりの総送信回数はおおむね`O(ノード数)`(木のエッジ数)に収まり、[ゴシッププロトコル](/algorithms/gossip-protocol)が持つ`O(n log n)`規模の冗長送信より大幅に少ない。障害発生時の修復も、その周辺の少数のlazyリンクの昇格で局所的に完了する
- **ゴシッププロトコルとの効率性の違い**: 純粋なゴシッププロトコルは、全ノードが常に「複数の宛先へ重複して」メッセージを転送し続けるため帯域コストが高いが、その分どの経路が壊れても他の経路で伝播が続くという頑健性を持つ。Plumtreeは平常時の帯域コストをツリー並みに切り詰めつつ、lazyリンクという「薄いゴシップ層」を保険として持つことで、木構造単体にはない自己修復力を獲得している——「効率性」と「頑健性」のトレードオフにおいて、両方の良いところを状況に応じて使い分ける設計
- **収束にかかる時間という代償**: 木が壊れてから修復されるまでの間は、影響を受けたノードへの配送がタイムアウト待ちの分だけ遅延する。この遅延をどれだけ許容できるかが、タイムアウト値のチューニングにおけるレイテンシと帯域コストのトレードオフになる
- **使いどころ**: Riakなどの分散データベースにおけるクラスタ内メッセージ配送、大規模Pub/Subシステムのブロードキャスト層、ブロックチェーンネットワークにおけるブロック伝播の効率化(純粋なゴシップより低遅延・低帯域を狙う実装)

## 実装例

各ノードにeagerリンクの集合とlazyリンクの集合を持たせ、eagerリンクに沿ったブロードキャストと、届かなかったノードをlazyリンク経由で修復する処理をそれぞれ関数として実装したシミュレーション。

```python
from dataclasses import dataclass, field


@dataclass
class PeerNode:
    id: int
    eager: set[int] = field(default_factory=set)
    lazy: set[int] = field(default_factory=set)
    received: set[str] = field(default_factory=set)


class PlumtreeNetwork:
    def __init__(self, nodes: dict[int, PeerNode]):
        self.nodes = nodes

    def broadcast(self, source: int, msg_id: str) -> set[int]:
        """eagerリンクに沿ってメッセージをフラッディングする。壊れたeagerリンクの
        先には届かないため、届いたノード集合を返す(未到達ノードはrepairで補完する)。"""
        self.nodes[source].received.add(msg_id)
        delivered = {source}
        frontier = [source]
        while frontier:
            next_frontier = []
            for node_id in frontier:
                for peer_id in self.nodes[node_id].eager:
                    peer = self.nodes[peer_id]
                    if msg_id not in peer.received:
                        peer.received.add(msg_id)
                        delivered.add(peer_id)
                        next_frontier.append(peer_id)
            frontier = next_frontier
        return delivered

    def repair(self, msg_id: str) -> None:
        """一定時間経ってもeager経由で届かなかったノードを、lazyリンク経由で
        修復する。届いている隣接ノードが見つかれば、そのlazyリンクをeagerへ昇格させる。"""
        for node in self.nodes.values():
            if msg_id in node.received:
                continue
            for peer_id in node.lazy:
                peer = self.nodes[peer_id]
                if msg_id in peer.received:
                    node.received.add(msg_id)
                    node.eager.add(peer_id)
                    node.lazy.discard(peer_id)
                    peer.eager.add(node.id)
                    peer.lazy.discard(node.id)
                    break
```

```typescript
class PeerNode {
  eager = new Set<number>();
  lazy = new Set<number>();
  received = new Set<string>();
  constructor(public id: number) {}
}

class PlumtreeNetwork {
  constructor(private nodes: Map<number, PeerNode>) {}

  // eagerリンクに沿ってメッセージをフラッディングする。壊れたeagerリンクの
  // 先には届かないため、届いたノード集合を返す(未到達ノードはrepairで補完する)。
  broadcast(source: number, msgId: string): Set<number> {
    this.nodes.get(source)!.received.add(msgId);
    const delivered = new Set<number>([source]);
    let frontier = [source];

    while (frontier.length > 0) {
      const nextFrontier: number[] = [];
      for (const nodeId of frontier) {
        for (const peerId of this.nodes.get(nodeId)!.eager) {
          const peer = this.nodes.get(peerId)!;
          if (!peer.received.has(msgId)) {
            peer.received.add(msgId);
            delivered.add(peerId);
            nextFrontier.push(peerId);
          }
        }
      }
      frontier = nextFrontier;
    }
    return delivered;
  }

  // 一定時間経ってもeager経由で届かなかったノードを、lazyリンク経由で修復する。
  // 届いている隣接ノードが見つかれば、そのlazyリンクをeagerへ昇格させる。
  repair(msgId: string): void {
    for (const node of this.nodes.values()) {
      if (node.received.has(msgId)) continue;
      for (const peerId of node.lazy) {
        const peer = this.nodes.get(peerId)!;
        if (peer.received.has(msgId)) {
          node.received.add(msgId);
          node.eager.add(peerId);
          node.lazy.delete(peerId);
          peer.eager.add(node.id);
          peer.lazy.delete(node.id);
          break;
        }
      }
    }
  }
}
```
