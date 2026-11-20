---
name: Chord(分散ハッシュテーブル)
category: 分散システム
subcategory: データ分散・整合性
complexity: 検索 O(log N) ホップ(Nはノード数)、各ノードの経路表 O(log N)
summary: ノードと鍵を同じ円環上のIDに並べ、各ノードが「2のべき乗ずつ先」のノードを知っておくことで、中央のサーバーなしに O(log N) ホップで鍵の担当ノードに辿り着く。
---

## 概要

2000年前後のピアツーピア(P2P)のファイル共有は、中央サーバーに索引を持たせる方式(Napster)や、問い合わせを隣接ノード全体にばらまく方式(初期のGnutella)だった。前者はサーバーが単一障害点で、後者はノード数が増えると通信が爆発する。

Chord(Stoica、Morris、Karger、Kaashoek、Balakrishnanら、2001年、SIGCOMM)は、**分散ハッシュテーブル(DHT)**の代表として、「`N` 台のノードのうち、任意の鍵を担当するノードを、中央に頼らず `O(log N)` 回の問い合わせで見つける」仕組みを示した。ノードも鍵も同じ `m` ビットのIDに写して円環状に並べ、鍵はその時計回りで最初に来るノード(後続者、successor)が担当する。[コンシステントハッシュ法](/algorithms/consistent-hashing)の考えを、全ノードの一覧を持たなくても検索できるようにしたもの、と見ることができる。

## 仕組み

IDの空間を `0 .. 2^m − 1` の円環とする。ノードのIDは、アドレスなどのハッシュ値とする。

1. **担当**: 鍵 `k` は、`k` 以上で最小のIDを持つノード(`successor(k)`、円環で時計回りに最初に出会うノード)が担当する
2. **指表(finger table)**: ノード `n` は、`i = 0 .. m−1` について `finger[i] = successor(n + 2^i)` を持つ。つまり、自分から `1, 2, 4, 8, ...` 先の位置を担当するノード。近くは細かく、遠くは粗く知っている
3. **検索 find_successor(k)**:
   - `k` が自分と自分の後続者の間(`(n, successor]`)に入るなら、後続者が答え
   - そうでなければ、指表の中で `k` を越えない最も遠いノード(closest preceding finger)に問い合わせを転送する
   - 毎回、`k` までの残りの距離がおよそ半分以下になるので、`O(log N)` ホップで着く
4. **参加・離脱**: 新しいノードは、既存のノードに自分の後続者を聞いて円環に加わる。各ノードは定期的に「安定化(stabilize)」を行い、後続者・前任者のポインタと指表を修正する。複数の後続者を持たせて、障害に耐える

## 特性・トレードオフ

- **検索が対数ホップ**: 全ノードを知らなくても、`log₂ N` ホップ(平均ではその半分程度)で到達できる。ノード数1000で約10回
- **負荷の分散**: ハッシュ値が一様なので、鍵はほぼ均等にノードへ割り振られる(仮想ノードを使うとさらに均す)。ノードの参加・離脱では、隣接するノードの鍵だけが移動する
- **完全一致の検索のみ**: ハッシュで位置を決めるので、「範囲検索」や「前方一致」には向かない
- **ネットワークの距離を考えない**: 論理的な円環上の隣が、物理的に遠いことがある。近接性を考えるPastryやKademliaなどの設計が続いた
- **保守が複雑**: 同時に多数のノードが参加・離脱する(churn)と、ポインタの整合を保つのが難しい。実運用では、Dynamoなどが全ノードの一覧を持つ方式で簡略化している
- **使いどころ**: P2Pのファイル共有、分散ストレージの鍵の割当、分散システム設計の教材。実運用の大規模システムでは、後続のKademlia系(BitTorrentのDHTなど)や、コンシステントハッシュ法が使われることが多い

## 実装例

```python
M = 6                  # IDは 0〜63
RING = 1 << M


def between(x, a, b):
    """x が (a, b] にある(円環上)。"""
    return (a < x <= b) if a < b else (x > a or x <= b)


class Ring:
    def __init__(self, node_ids):
        self.nodes = sorted(node_ids)
        self.fingers = {n: [self.successor((n + (1 << i)) % RING) for i in range(M)] for n in self.nodes}

    def successor(self, key):
        for n in self.nodes:
            if n >= key:
                return n
        return self.nodes[0]           # 円環を一周して先頭へ

    def lookup(self, start, key):
        """start から key の担当ノードを探す。経路(ホップ数)も返す。"""
        path = [start]
        n = start
        while True:
            succ = self.fingers[n][0]
            if between(key, n, succ):
                path.append(succ)
                return succ, path
            # key を越えない、最も遠い指を選ぶ
            for f in reversed(self.fingers[n]):
                if f != key and between(f, n, key) and f != n:
                    n = f
                    break
            else:
                n = succ
            path.append(n)


ring = Ring([1, 8, 14, 21, 32, 38, 42, 48, 51, 56])
owner, path = ring.lookup(8, 54)
print(owner, path)  # 56 [8, 42, 51, 56]
```

```typescript
const M = 6;
const RING = 1 << M;

const between = (x: number, a: number, b: number): boolean => (a < b ? x > a && x <= b : x > a || x <= b);

class Ring {
  readonly nodes: number[];
  private fingers = new Map<number, number[]>();
  constructor(ids: number[]) {
    this.nodes = [...ids].sort((a, b) => a - b);
    for (const n of this.nodes) {
      this.fingers.set(n, Array.from({ length: M }, (_, i) => this.successor((n + (1 << i)) % RING)));
    }
  }
  successor(key: number): number {
    return this.nodes.find((n) => n >= key) ?? this.nodes[0];
  }
  lookup(start: number, key: number): { owner: number; path: number[] } {
    const path = [start];
    let n = start;
    for (;;) {
      const finger = this.fingers.get(n)!;
      const succ = finger[0];
      if (between(key, n, succ)) {
        path.push(succ);
        return { owner: succ, path };
      }
      const next = [...finger].reverse().find((f) => f !== key && f !== n && between(f, n, key));
      n = next ?? succ;
      path.push(n);
    }
  }
}

const ring = new Ring([1, 8, 14, 21, 32, 38, 42, 48, 51, 56]);
console.log(ring.lookup(8, 54)); // { owner: 56, path: [8, 42, 51, 56] }
```
