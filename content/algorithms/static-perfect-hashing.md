---
name: 静的完全ハッシュ探索(FKS法)
category: 探索
subcategory: 配列探索
complexity: O(1)(最悪ケースの探索)、O(n)(期待構築時間)
summary: あらかじめ分かっているキー集合に対し、2段階のハッシュ関数を使って衝突を完全に排除し、最悪ケースでもO(1)の探索を保証する静的ハッシュ構造。
---

## 概要

通常のハッシュテーブルは衝突が起きうる以上、最悪ケースの探索時間はO(n)になりうる。しかし、**探索対象のキー集合があらかじめ全て分かっていて、後から変更されない(静的)**という条件が満たせるなら話は別である。1984年にFredman、Komlós、Szemerédi(頭文字を取ってFKS法と呼ばれる)が発表した手法は、2段階のハッシュ構造を用いることで、事前計算にO(n)の期待時間をかける代わりに、**構築後の探索は最悪ケースでも常にO(1)** という強力な保証を実現する。辞書コンパイラのキーワード判定や、静的なルックアップテーブルなど、「作るのは1回、引くのは何百万回」という用途に理想的な構造である。

## 仕組み

1. n個のキー全体に対し、1段目のハッシュ関数hを使って、n個のバケットに分配する(通常のチェイン法と同様、この時点では複数キーが同じバケットに衝突しうる)
2. 各バケットiについて、そこに入ったキーの個数を mᵢ とする
3. **各バケットごとに、個別の2段目ハッシュテーブル**を用意する。テーブルサイズを mᵢ² にし、そのバケット内のmᵢ個のキーを**衝突なく**配置できる2段目のハッシュ関数 hᵢ をランダムに選び直す(「鳩の巣原理」的な確率計算により、テーブルサイズをmᵢ²にすれば、ランダムなハッシュ関数を選んだときに衝突が起きない確率が1/2以上になることが保証されている——見つかるまで選び直せばよい)
4. 全体のバケットサイズの2乗和 Σmᵢ² が期待値でO(n)に収まるように1段目のハッシュ関数hも(必要なら)選び直す
5. 探索時は、まずキーを1段目のハッシュ関数hにかけてバケット番号を求め、そのバケット専用の2段目ハッシュ関数hᵢにかければ**一意にスロットが決まり、1回の比較で存在確認ができる**

「衝突を許すハッシュテーブルを、衝突しないハッシュテーブルの集まりとして入れ子にする」という二段構えの発想が、最悪ケースO(1)を実現する核心である。

## 特性・トレードオフ

- **計算量**: 構築は期待O(n)(ハッシュ関数の選び直しを含む乱択アルゴリズムのため)。一度構築すれば探索は**常に厳密にO(1)**(ハッシュ計算2回+比較1回)で、最悪ケースの保証がある点が通常のハッシュテーブルとの決定的な違い
- **静的性が絶対条件**: キーの追加・削除には対応できない。集合が変わるたびに再構築(O(n))が必要になる。動的な更新が頻繁な用途にはカッコウハッシュ法や線形探査法の方が適している
- **メモリオーバーヘッド**: 各バケットのテーブルサイズをmᵢ²にするため、単純なハッシュテーブルよりも多くのメモリを消費する(ただし全体の期待値はO(n)に収まるよう設計されている)
- **完全ハッシュ関数(perfect hash function)の代表例**: 「衝突が起きない」ことを保証するハッシュ関数を完全ハッシュ関数と呼び、FKS法はその構築法の古典的な一つ。gperfのようなツールはコンパイル時にキーワード集合向けの完全ハッシュ関数を生成する
- **使いどころ**: プログラミング言語のコンパイラにおける予約語・キーワード判定、DNS/ルーティングテーブルのような読み取り専用の巨大な静的辞書、組み込みシステムでの最悪応答時間保証が必要なルックアップ

## 実装例

```python
import random


class StaticPerfectHash:
    def __init__(self, keys: list[int]) -> None:
        self.n = len(keys)
        self.outer_size = max(1, self.n)
        self.outer_a, self.outer_b, self.p = self._pick_hash_params()

        buckets: list[list[int]] = [[] for _ in range(self.outer_size)]
        for k in keys:
            buckets[self._outer_hash(k)].append(k)

        # 各バケットごとに衝突しない第2段ハッシュを見つける
        self.inner_tables: list[list[int | None]] = []
        self.inner_params: list[tuple[int, int]] = []
        for bucket in buckets:
            table, params = self._build_inner(bucket)
            self.inner_tables.append(table)
            self.inner_params.append(params)

    def _pick_hash_params(self) -> tuple[int, int, int]:
        p = 1_000_000_007  # 十分大きな素数
        a = random.randint(1, p - 1)
        b = random.randint(0, p - 1)
        return a, b, p

    def _outer_hash(self, key: int) -> int:
        return ((self.outer_a * key + self.outer_b) % self.p) % self.outer_size

    def _build_inner(self, bucket: list[int]) -> tuple[list[int | None], tuple[int, int]]:
        m = len(bucket)
        if m == 0:
            return [], (0, 0)
        size = max(1, m * m)
        p = 1_000_000_007
        while True:
            a = random.randint(1, p - 1)
            b = random.randint(0, p - 1)
            table: list[int | None] = [None] * size
            ok = True
            for key in bucket:
                idx = ((a * key + b) % p) % size
                if table[idx] is not None:
                    ok = False
                    break
                table[idx] = key
            if ok:
                return table, (a, b)

    def contains(self, key: int) -> bool:
        outer_idx = self._outer_hash(key)
        a, b = self.inner_params[outer_idx]
        table = self.inner_tables[outer_idx]
        if not table:
            return False
        p = 1_000_000_007
        idx = ((a * key + b) % p) % len(table)
        return table[idx] == key
```

```typescript
class StaticPerfectHash {
  private n: number;
  private outerSize: number;
  private p = 1_000_000_007;
  private outerA: number;
  private outerB: number;
  private innerTables: (number | null)[][] = [];
  private innerParams: [number, number][] = [];

  constructor(keys: number[]) {
    this.n = keys.length;
    this.outerSize = Math.max(1, this.n);
    [this.outerA, this.outerB] = this.pickHashParams();

    const buckets: number[][] = Array.from(
      { length: this.outerSize },
      () => [],
    );
    for (const k of keys) buckets[this.outerHash(k)].push(k);

    for (const bucket of buckets) {
      const [table, params] = this.buildInner(bucket);
      this.innerTables.push(table);
      this.innerParams.push(params);
    }
  }

  private pickHashParams(): [number, number] {
    const a = 1 + Math.floor(Math.random() * (this.p - 1));
    const b = Math.floor(Math.random() * this.p);
    return [a, b];
  }

  private outerHash(key: number): number {
    return (
      Number(
        (((BigInt(this.outerA) * BigInt(key) + BigInt(this.outerB)) %
          BigInt(this.p)) +
          BigInt(this.p)) %
          BigInt(this.p),
      ) % this.outerSize
    );
  }

  private buildInner(bucket: number[]): [(number | null)[], [number, number]] {
    const m = bucket.length;
    if (m === 0) return [[], [0, 0]];
    const size = Math.max(1, m * m);
    while (true) {
      const a = 1 + Math.floor(Math.random() * (this.p - 1));
      const b = Math.floor(Math.random() * this.p);
      const table: (number | null)[] = new Array(size).fill(null);
      let ok = true;
      for (const key of bucket) {
        const idx =
          Number(
            (((BigInt(a) * BigInt(key) + BigInt(b)) % BigInt(this.p)) +
              BigInt(this.p)) %
              BigInt(this.p),
          ) % size;
        if (table[idx] !== null) {
          ok = false;
          break;
        }
        table[idx] = key;
      }
      if (ok) return [table, [a, b]];
    }
  }

  contains(key: number): boolean {
    const outerIdx = this.outerHash(key);
    const [a, b] = this.innerParams[outerIdx];
    const table = this.innerTables[outerIdx];
    if (table.length === 0) return false;
    const idx =
      Number(
        (((BigInt(a) * BigInt(key) + BigInt(b)) % BigInt(this.p)) +
          BigInt(this.p)) %
          BigInt(this.p),
      ) % table.length;
    return table[idx] === key;
  }
}
```
