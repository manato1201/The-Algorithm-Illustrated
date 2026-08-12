---
name: Rendezvousハッシュ法(HRWハッシュ)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(n)(n=ノード数、1回のルックアップあたり)
summary: キーとノードの組み合わせごとにハッシュ値を計算し、最大値を得たノードをそのキーの担当とすることで、リング構造や仮想ノードなしにノード増減時の再配置を最小限に抑える分散配置方式。
---

## 概要

[一貫性ハッシュ法](/algorithms/consistent-hashing)は「ハッシュ空間をリング(円環)として扱う」という構造を導入することで、ノードの増減時に再配置されるデータを最小限に抑えた。Rendezvousハッシュ法(HRWハッシュ、Highest Random Weight ハッシュ)は、1996年にDavid ThalerとChinya Ravishankarが発表した、**リングという構造を一切使わずに同じ目的を達成する**、まったく異なるアプローチである。発想はシンプルで、「あるキーについて、全ノードそれぞれとの組み合わせでハッシュ値(重み)を計算し、最も大きい重みを得たノードをそのキーの担当にする」というだけ。この単純な規則だけで、一貫性ハッシュ法と同等の「増減時の局所的な再配置」という性質が自然に導かれる。

## 仕組み

1. キー`k`の担当ノードを決めるとき、**現在生きている全ノード**`n_1, n_2, ..., n_m`それぞれについて、`weight_i = hash(k, n_i)`という組み合わせハッシュ値を計算する(`hash`はキーとノード識別子を混ぜて一様な擬似乱数値を出す関数)
2. `weight_i`が**最大**となったノード`n_i`を、キー`k`の担当として選ぶ
3. **ノードが追加される**と、新ノード`n_new`についても`weight_new = hash(k, n_new)`を計算し、これが既存の最大値を上回るキーだけが新ノードに移動する。上回らないキーの担当は一切変わらない
4. **ノードが削除される**と、そのノードが担当していたキーだけが、残りのノードの中で最大の重みを持つノードに引き継がれる。他のノードが担当していたキーの担当は変わらない(削除されたノードの重みがどうであれ、生存ノード同士の重みの大小関係はそのノードの削除と無関係だから)

一貫性ハッシュ法が「リング上の位置」という幾何学的な構造でこの性質を実現するのに対し、Rendezvousハッシュ法は「**キーとノードのペアごとに独立な乱数を割り当て、最大値を選ぶ**」という統計的な性質だけでこれを実現する——構造を持たない分、実装は単純だが、担当ノードを決めるには毎回全ノード分のハッシュ計算が必要になる。

## 特性・トレードオフ

- **計算量**: ルックアップ(担当ノードの決定)は全ノードの重みを計算して最大値を探すのでO(n)(nはノード数)。[一貫性ハッシュ法](/algorithms/consistent-hashing)がソート済みリング上の二分探索でO(log n)なのに比べると、ノード数が非常に多い場合は不利になる
- **[一貫性ハッシュ法](/algorithms/consistent-hashing)との違い**: 一貫性ハッシュ法はリング構造とその上のソート済みデータ構造(ハッシュ値でソートされた配列や木)を維持する必要があり、負荷を均等にするには1台のノードを多数の「仮想ノード」に分身させる工夫が要る。Rendezvousハッシュ法は**リングもソート構造も仮想ノードも不要**——キーとノードの組み合わせごとのハッシュ関数が十分に一様であれば、それだけで負荷は自然に均等分散される。構造を持たない代わりにO(n)の全探索が必要という、シンプルさと検索効率のトレードオフになっている
- **決定性と分散合意との相性の良さ**: 同じキーとノード集合が与えられれば、通信なしにどのノードでも独立に同じ担当ノードを計算できる(**決定的**)。この性質から、キャッシュのメンバーシップを事前調整なしで揃えたい分散システムでよく使われる
- **重み付け(容量差への対応)**: ノードごとに処理能力や容量が異なる場合、`weight_i`の計算にノードの重み係数を掛け合わせることで、能力の高いノードほど多くのキーを担当するように調整できる(**Weighted Rendezvous Hashing**)。一貫性ハッシュ法における「仮想ノードの数を能力に応じて増減させる」手法と同じ目的を、より直接的なパラメータ調整で実現できる
- **使いどころ**: CDN(コンテンツ配信網)におけるオリジンサーバーの選択、分散キャッシュ・負荷分散システムにおけるサーバー割り当て(Apache CassandraやCephの一部機能、IPVS(Linux仮想サーバー)の負荷分散アルゴリズムの1つとしても採用)、マルチキャストにおけるランデブーポイントの選出(名前の由来でもある)

## 実装例

ハッシュ関数には外部ライブラリなしで扱えるFNV-1aを使用し、キーとノードIDを結合してハッシュ化する。

```python
def fnv1a(s: str) -> int:
    h = 2166136261
    for byte in s.encode("utf-8"):
        h ^= byte
        h = (h * 16777619) & 0xFFFFFFFF
    return h


class RendezvousHash:
    def __init__(self) -> None:
        self.nodes: set[str] = set()

    def add_node(self, node: str) -> None:
        self.nodes.add(node)

    def remove_node(self, node: str) -> None:
        self.nodes.discard(node)

    def get_node(self, key: str) -> str:
        """キーとノードの組み合わせごとに重みを計算し、最大値を得たノードを返す。"""
        if not self.nodes:
            raise ValueError("no nodes registered")
        return max(self.nodes, key=lambda node: fnv1a(f"{key}:{node}"))

    def get_node_weighted(self, key: str, weights: dict[str, float]) -> str:
        """ノードごとの容量比(weights)を反映した重み付き版。
        重みが大きいノードほど多くのキーを引き受けやすくなる。"""

        def score(node: str) -> float:
            # ハッシュ値を[0, 1)の一様乱数とみなし、-ln(x)/weight を最小化するノードを選ぶ
            # (Weighted Rendezvous Hashingの標準的な定式化)
            import math

            x = (fnv1a(f"{key}:{node}") + 1) / (0xFFFFFFFF + 2)  # (0, 1)に収める
            return -math.log(x) / weights.get(node, 1.0)

        return min(self.nodes, key=score)
```

```typescript
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

class RendezvousHash {
  private nodes = new Set<string>();

  addNode(node: string): void {
    this.nodes.add(node);
  }

  removeNode(node: string): void {
    this.nodes.delete(node);
  }

  /** キーとノードの組み合わせごとに重みを計算し、最大値を得たノードを返す。 */
  getNode(key: string): string {
    if (this.nodes.size === 0) throw new Error("no nodes registered");
    let best: string | null = null;
    let bestWeight = -1;
    for (const node of this.nodes) {
      const w = fnv1a(`${key}:${node}`);
      if (w > bestWeight) {
        bestWeight = w;
        best = node;
      }
    }
    return best!;
  }

  /**
   * ノードごとの容量比(weights)を反映した重み付き版。
   * 重みが大きいノードほど多くのキーを引き受けやすくなる。
   */
  getNodeWeighted(key: string, weights: Map<string, number>): string {
    let best: string | null = null;
    let bestScore = Infinity;
    for (const node of this.nodes) {
      // ハッシュ値を(0,1)の一様乱数とみなし、-ln(x)/weight を最小化するノードを選ぶ
      const x = (fnv1a(`${key}:${node}`) + 1) / (0xffffffff + 2);
      const score = -Math.log(x) / (weights.get(node) ?? 1.0);
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }
    return best!;
  }
}
```
