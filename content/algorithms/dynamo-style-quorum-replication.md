---
name: Dynamoスタイルのクォーラムレプリケーション(N/W/Rクォーラム)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(N)(レプリカ数、読み書きのメッセージ数)
summary: レプリカ数N・書き込み成功に必要な数W・読み込み時に問い合わせる数RをW+R>Nとなるよう選ぶことで、強い一貫性寄りか可用性寄りかを操作ごとに調整できるレプリケーション方式。
---

## 概要

Amazon Dynamo論文(2007年)で提案され、Cassandra・Riak・Voldemortなど多くのNoSQLデータベースに採用された、レプリケーションにおける一貫性と可用性のバランスをパラメータで調整できる方式。[2相コミット](/algorithms/two-phase-commit)のように全レプリカの合意を待つのでも、[ゴシッププロトコル](/algorithms/gossip-protocol)のように結果整合性だけに頼るのでもなく、「読み書きのたびに一定数以上のレプリカに問い合わせる」というクォーラム(定足数)の考え方によって、一貫性の強さを連続的に選べるようにする。

## 仕組み

1. 各データは`N`個のレプリカ(典型的には[コンシステントハッシュ法](/algorithms/consistent-hashing)によって決まる連続する`N`台のノード)に複製される
2. **書き込み**: クライアントは書き込み要求を該当する`N`台に送り、そのうち`W`台(書き込みクォーラム)から成功応答が返った時点で「書き込み成功」とみなす。各コピーにはバージョン情報(ベクタークロックやタイムスタンプ)を付与する
3. **読み込み**: クライアントは読み込み要求を`N`台に送り、そのうち`R`台(読み込みクォーラム)から応答を集める。複数の異なるバージョンが返ってきた場合は、バージョン情報を使って最新版(あるいは未解決の分岐すべて)をクライアント側またはサーバー側で解決する
4. `W + R > N`となるように`W`と`R`を選ぶと、書き込みクォーラムと読み込みクォーラムが少なくとも1台のノードで必ず重なることが数学的に保証される——つまり、どんな読み込みも直近の書き込みを反映したレプリカを最低1つは含む(強い一貫性に近づく)
5. `W + R <= N`の場合は重なりが保証されず、直近の書き込みを読み込みが見逃す可能性がある(結果整合性寄りになる代わりに、可用性・レイテンシが向上する)。典型的な設定は`N=3, W=2, R=2`(`W+R=4 > N=3`)で、書き込み・読み込みともに1台の障害に耐えつつ強い一貫性に近い挙動を得る

## 特性・トレードオフ

- **計算量**: 読み書きともに`N`台への問い合わせなので`O(N)`のメッセージ交換。`N`は通常3〜5程度の小さな定数に固定されるため、クラスタ全体のノード数が増えても1回の操作あたりのコストは変わらない
- **一貫性と可用性を連続的に調整できるパラメータ化**: [2相コミット](/algorithms/two-phase-commit)は全参加者の合意を必要とし、1台でも不通だと操作全体がブロックされるが、Dynamoスタイルのクォーラムは「`N`台中`W`台(または`R`台)」という緩い条件のため、一部のレプリカが落ちていても`W`または`R`を満たせれば操作を継続できる——CAP定理が示す一貫性(C)と可用性(A)のトレードオフを、システム全体で固定するのではなく操作ごとに(あるいはデータの種類ごとに)選べる
- **読み書きどちらを軽くするかも選べる**: `W`を小さくして書き込みを速くする代わりに読み込み側で多くのレプリカを見て最新版を判定する(read-heavyなワークロード向け)、逆に`R`を小さくして読み込みを速くする(write-heavyなワークロード向け)、というようにアプリケーションの特性に応じてチューニングできる
- **使いどころ**: Amazon DynamoDB・Apache Cassandra・Riakのようなワイドカラム/KVS型NoSQLデータベースのレプリケーション層、可用性を最優先しつつも読み込み時にある程度の一貫性を求めたい大規模Webサービスのデータストア

## 実装例

`N`台のノードのうち書き込みが実際に到達できた集合と、読み込みが問い合わせる集合を明示的に分けてシミュレートし、`W + R > N`が保証する「必ず1台は重なる」性質を確認できる実装。

```python
from dataclasses import dataclass


@dataclass
class VersionedValue:
    value: object
    version: int


class Node:
    def __init__(self):
        self.stored: VersionedValue | None = None


class QuorumReplicaSet:
    def __init__(self, n: int, w: int, r: int):
        if w + r <= n:
            raise ValueError("W + R > N を満たす必要があります(強い一貫性を保証できません)")
        self.n, self.w, self.r = n, w, r
        self.nodes = [Node() for _ in range(n)]

    def write(self, value: object, version: int, reachable: set[int]) -> bool:
        """reachable: 実際に書き込みが到達できたノードのインデックス集合。"""
        for i in reachable:
            self.nodes[i].stored = VersionedValue(value, version)
        return len(reachable) >= self.w

    def read(self, queried: set[int]) -> VersionedValue:
        """queried: 読み込みが問い合わせるノードのインデックス集合。"""
        responses = [self.nodes[i].stored for i in queried if self.nodes[i].stored is not None]
        if len(responses) < self.r:
            raise RuntimeError("読み込みクォーラムを満たすレスポンスがありません")
        # 複数バージョンが混在していれば、最も新しいバージョンを採用する
        return max(responses, key=lambda v: v.version)
```

```typescript
interface VersionedValue {
  value: unknown;
  version: number;
}

class Node {
  stored: VersionedValue | null = null;
}

class QuorumReplicaSet {
  nodes: Node[];

  constructor(
    private n: number,
    private w: number,
    private r: number,
  ) {
    if (w + r <= n) {
      throw new Error("W + R > N を満たす必要があります(強い一貫性を保証できません)");
    }
    this.nodes = Array.from({ length: n }, () => new Node());
  }

  // reachable: 実際に書き込みが到達できたノードのインデックス集合
  write(value: unknown, version: number, reachable: Set<number>): boolean {
    for (const i of reachable) {
      this.nodes[i].stored = { value, version };
    }
    return reachable.size >= this.w;
  }

  // queried: 読み込みが問い合わせるノードのインデックス集合
  read(queried: Set<number>): VersionedValue {
    const responses: VersionedValue[] = [];
    for (const i of queried) {
      const v = this.nodes[i].stored;
      if (v !== null) responses.push(v);
    }
    if (responses.length < this.r) {
      throw new Error("読み込みクォーラムを満たすレスポンスがありません");
    }
    // 複数バージョンが混在していれば、最も新しいバージョンを採用する
    return responses.reduce((a, b) => (b.version > a.version ? b : a));
  }
}
```
