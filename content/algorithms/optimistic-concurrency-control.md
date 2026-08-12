---
name: 楽観的並行性制御(OCC, Optimistic Concurrency Control)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(読み書き集合のサイズ)(検証フェーズあたり)
summary: トランザクション実行中はロックを取らずに自由に読み書きし、コミット直前にのみ他のトランザクションとの競合を検証して、衝突していれば中断・再試行する並行性制御方式。
---

## 概要

複数のトランザクションが同じデータに同時にアクセスするとき、伝統的な**悲観的並行性制御(Pessimistic Concurrency Control)**は「競合が起きるかもしれない」という前提のもと、データにアクセスする前にロックを取得し、他のトランザクションを待たせることで衝突そのものを未然に防ぐ(2相ロックがその代表)。しかしロックの取得・待機・デッドロック検出には無視できないオーバーヘッドが伴い、実際には多くのトランザクションが互いに競合しないワークロードでは、この慎重さが純粋なコストになる。1981年にH. T. KungとJohn T. Robinsonが発表した論文 "On Optimistic Methods for Concurrency Control" は、逆の前提に立つ——「**競合はめったに起きない**」と楽観的に仮定し、ロックなしで自由に読み書きを進めておき、**コミットする直前にだけ本当に競合していないかを検証する**。競合が実際に見つかったときだけ、そのトランザクションを中断して再試行すればよい、という発想である。

## 仕組み

OCCは典型的に3つのフェーズでトランザクションを進める。

1. **読み取りフェーズ(Read Phase)**: トランザクションはロックを一切取得せず、必要なデータを読み、その過程でどのキーを読んだか(**読み取り集合**、read set)を記録する。書き込みはすぐには反映せず、トランザクション専用の作業領域(プライベートワークスペース)に溜めておく
2. **検証フェーズ(Validation Phase)**: コミットしようとするとき、このトランザクションの読み取り集合が、**トランザクション開始後に他の(並行して実行され、先にコミットした)トランザクションによって変更されていないか**を確認する。多くの実装は、各データにバージョン番号やタイムスタンプを持たせておき、「読み取った時点のバージョンと、検証時点のバージョンが一致するか」を比較することでこれを検出する
3. **書き込みフェーズ(Write Phase)**: 検証に通れば、作業領域に溜めていた書き込みを実データへ反映し、対象キーのバージョン番号を更新してコミットを完了する。検証に**失敗**すれば、他のトランザクションと競合したとみなしてトランザクション全体を**中断(アボート)**し、必要であれば最初からやり直す

「ロックで事前に守る」代わりに「バージョン番号で事後に確認する」という比較が、悲観的並行性制御と楽観的並行性制御の本質的な違いになっている。

## 特性・トレードオフ

- **計算量**: 検証フェーズは読み取り集合・書き込み集合のサイズに比例するO(読み書き集合のサイズ)。ロックの取得・解放・待機管理といったコストが一切かからない点が悲観的方式との大きな違い
- **低競合ワークロードでの優位性、高競合ワークロードでの弱点**: 実際に競合するトランザクションが少ない環境では、ロック待ちが一切発生しないため高いスループットが出せる。逆に競合が頻発する環境では、多くのトランザクションが検証フェーズで弾かれて再試行を繰り返し、スループットが著しく悪化する(最悪の場合、再試行同士が繰り返し衝突し続ける**ライブロック**に近い状態にもなりうる)——「競合が少ない」という前提が崩れた瞬間にコストが跳ね上がるのがOCCの弱点
- **MVCC(多版同時実行制御)との関係**: OCCは「いつ競合を検出するか」の戦略であり、「どのように読み取りの一貫性を保つか」の戦略であるMVCC(Multi-Version Concurrency Control)としばしば組み合わされる。MVCCは各データに複数バージョンを保持し、トランザクションは開始時点のスナップショットを一貫して読み続けられるようにする——これによりOCCの読み取りフェーズは他のトランザクションの書き込みで一切ブロックされずに済み、コミット時の検証だけで安全性を担保できる。多くの実用データベース(PostgreSQLのSerializable Snapshot Isolationなど)は、スナップショット分離(MVCCで読み取りの一貫性を確保)と、コミット時の競合検証(OCC的な検証)を組み合わせた設計になっている
- **分散環境での相性の良さ**: ロックを分散環境で保持し続けるのはネットワーク分断・ノード故障のリスクを伴うが、OCCはコミット直前の短い検証だけで済むため、分散トランザクションとの親和性が高い。Googleの分散ストレージシステムPercolator、分散データベースFoundationDB、Gitのようなバージョン管理システムのマージ処理(「あなたが編集を始めた後に他の人が同じ箇所を変更していないか」の確認)も、広い意味でOCCと同じ発想に基づいている
- **使いどころ**: 読み取りが多く書き込みの衝突が少ないWebアプリケーションのデータベーストランザクション(楽天的ロックとしてのバージョンカラム、"compare-and-swap"更新)、分散データベースのトランザクション処理(FoundationDB、CockroachDBなど)、Gitのようなバージョン管理システムにおける並行編集のマージ検証

## 実装例

各キーにバージョン番号を持たせたインメモリストアに対し、読み取り集合を記録し、コミット時に全キーのバージョンが変化していないかを検証するOCCトランザクションを実装する。

```python
from dataclasses import dataclass, field


class Store:
    """バージョン番号付きのキーバリューストア。"""

    def __init__(self) -> None:
        self.data: dict[str, object] = {}
        self.versions: dict[str, int] = {}

    def read(self, key: str) -> tuple[object, int]:
        return self.data.get(key), self.versions.get(key, 0)

    def commit_write(self, key: str, value: object) -> None:
        self.data[key] = value
        self.versions[key] = self.versions.get(key, 0) + 1


@dataclass
class Transaction:
    store: Store
    read_set: dict[str, int] = field(default_factory=dict)   # key -> 読んだ時点のバージョン
    write_set: dict[str, object] = field(default_factory=dict)

    def read(self, key: str) -> object:
        value, version = self.store.read(key)
        self.read_set[key] = version
        # 自分自身がまだコミットしていない書き込みがあればそれを優先して見せる
        return self.write_set.get(key, value)

    def write(self, key: str, value: object) -> None:
        self.write_set[key] = value

    def commit(self) -> bool:
        """検証フェーズ: 読み取り集合のバージョンが変化していないか確認する。
        変化があれば競合とみなして中断し、Falseを返す。"""
        for key, seen_version in self.read_set.items():
            _, current_version = self.store.read(key)
            if current_version != seen_version:
                return False  # 競合を検出、アボート
        # 書き込みフェーズ: 検証を通過したので実データへ反映する
        for key, value in self.write_set.items():
            self.store.commit_write(key, value)
        return True


if __name__ == "__main__":
    store = Store()
    store.commit_write("balance", 100)

    tx1 = Transaction(store)
    tx2 = Transaction(store)

    bal1 = tx1.read("balance")
    bal2 = tx2.read("balance")
    tx1.write("balance", bal1 - 30)
    tx2.write("balance", bal2 - 20)

    assert tx1.commit() is True    # 先にコミットしたtx1は成功
    assert tx2.commit() is False   # tx2はtx1のコミット後にバージョンが変わっており競合、中断
```

```typescript
class Store {
  private data = new Map<string, unknown>();
  private versions = new Map<string, number>();

  read(key: string): [unknown, number] {
    return [this.data.get(key), this.versions.get(key) ?? 0];
  }

  commitWrite(key: string, value: unknown): void {
    this.data.set(key, value);
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
  }
}

class Transaction {
  private readSet = new Map<string, number>(); // key -> 読んだ時点のバージョン
  private writeSet = new Map<string, unknown>();

  constructor(private store: Store) {}

  read(key: string): unknown {
    const [value, version] = this.store.read(key);
    this.readSet.set(key, version);
    // 自分自身がまだコミットしていない書き込みがあればそれを優先して見せる
    return this.writeSet.has(key) ? this.writeSet.get(key) : value;
  }

  write(key: string, value: unknown): void {
    this.writeSet.set(key, value);
  }

  /**
   * 検証フェーズ: 読み取り集合のバージョンが変化していないか確認する。
   * 変化があれば競合とみなして中断し、falseを返す。
   */
  commit(): boolean {
    for (const [key, seenVersion] of this.readSet) {
      const [, currentVersion] = this.store.read(key);
      if (currentVersion !== seenVersion) return false; // 競合を検出、アボート
    }
    // 書き込みフェーズ: 検証を通過したので実データへ反映する
    for (const [key, value] of this.writeSet) {
      this.store.commitWrite(key, value);
    }
    return true;
  }
}

// 使用例
const store = new Store();
store.commitWrite("balance", 100);

const tx1 = new Transaction(store);
const tx2 = new Transaction(store);

const bal1 = tx1.read("balance") as number;
const bal2 = tx2.read("balance") as number;
tx1.write("balance", bal1 - 30);
tx2.write("balance", bal2 - 20);

console.log(tx1.commit()); // true (先にコミットしたtx1は成功)
console.log(tx2.commit()); // false (tx1のコミット後にバージョンが変わっており競合、中断)
```
