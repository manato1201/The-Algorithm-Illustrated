---
name: 線形探査法によるハッシュ探索(Linear Probing)
category: 探索
subcategory: 配列探索
complexity: O(1)(平均)、O(n)(最悪)
summary: ハッシュ値の位置が埋まっていたら次のスロットへ1つずつずらして探す、最も単純なオープンアドレス法のハッシュ探索。
---

## 概要

ハッシュテーブルでキーの衝突が起きたとき、別のリストを吊るして対処する「チェイン法」とは別に、**テーブル自体の中で空きスロットを探す**というアプローチがある。線形探査法はその中で最も単純な方式で、ハッシュ関数が指したスロットが既に使われていたら、隣のスロットを順番に(1つずつずらして)確認していく。追加のポインタやリストを一切必要とせず配列だけで完結するため、メモリ局所性が高く、CPUキャッシュとの相性が良いことから、実用上は理論計算量以上の性能が出ることがある。

## 仕組み

1. キーをハッシュ関数にかけ、テーブル内の初期位置(スロット)を求める
2. **挿入時**: そのスロットが空いていればキーを格納する。既に別のキーで埋まっていれば、次のスロット(末尾まで来たら先頭に戻る)を確認し、空きが見つかるまで繰り返す
3. **探索時**: 初期位置から順にスロットを確認する。目的のキーが見つかれば成功。**空のスロットに到達したら「そのキーは存在しない」と判定して探索を打ち切る**(空スロットより先には絶対に無いという性質を利用する)
4. **削除時の注意**: 単純にスロットを空にすると、それより後ろにあるはずのキーが「空スロットで探索が打ち切られる」ことで見つからなくなる。そのため削除済みスロットには「削除済みマーカー(トゥームストーン)」を置き、探索時はマーカーを飛ばして続行し、挿入時はマーカーの位置を再利用する
5. テーブルの使用率(ロードファクター)が一定(通常0.7前後)を超えたら、より大きなテーブルへ全要素を再ハッシュする

## 特性・トレードオフ

- **計算量**: ロードファクターが低ければ平均O(1)。ただしロードファクターが1に近づくと「クラスタリング」(埋まったスロットが連なり、次の空きを探すための走査が長くなる現象)が急激に悪化し、最悪O(n)になる
- **メモリ局所性が高い**: チェイン法がポインタを辿るためキャッシュミスを起こしやすいのに対し、線形探査は隣接するメモリを順に見るだけなのでCPUキャッシュに乗りやすく、実測性能で有利になることが多い
- **クラスタリングが弱点**: 連続して埋まったスロットの塊(クラスタ)ができると、そのクラスタに衝突するキーが増えるほどクラスタがさらに伸びるという悪循環(プライマリクラスタリング)が起きる。これを緩和する改良として二次探査法やダブルハッシュ法がある
- **削除の実装が煩雑**: トゥームストーンの管理を誤ると探索が正しく打ち切られず性能が劣化する。頻繁な削除が伴う用途ではチェイン法やカッコウハッシュ法の方が扱いやすい場合がある
- **使いどころ**: ロードファクターを低く保てるキャッシュや辞書実装、CPythonのdict実装のような言語処理系の内部データ構造、追加専用に近いキー集合の高速メンバーシップ判定

## 実装例

```python
class LinearProbingTable:
    _EMPTY = object()
    _DELETED = object()

    def __init__(self, capacity: int = 16) -> None:
        self.capacity = capacity
        self.size = 0
        self.slots: list[object] = [self._EMPTY] * capacity
        self.keys: list[int | None] = [None] * capacity

    def _hash(self, key: int) -> int:
        return hash(key) % self.capacity

    def _resize(self) -> None:
        old_keys = [(self.keys[i], self.slots[i]) for i in range(self.capacity)]
        self.capacity *= 2
        self.slots = [self._EMPTY] * self.capacity
        self.keys = [None] * self.capacity
        self.size = 0
        for key, slot in old_keys:
            if slot not in (self._EMPTY, self._DELETED):
                self.insert(key, slot)

    def insert(self, key: int, value: object) -> None:
        if self.size / self.capacity > 0.7:
            self._resize()
        idx = self._hash(key)
        first_deleted = -1
        while self.slots[idx] is not self._EMPTY:
            if self.slots[idx] is self._DELETED and first_deleted == -1:
                first_deleted = idx
            elif self.keys[idx] == key and self.slots[idx] is not self._DELETED:
                self.slots[idx] = value
                return
            idx = (idx + 1) % self.capacity
        target = first_deleted if first_deleted != -1 else idx
        self.keys[target] = key
        self.slots[target] = value
        self.size += 1

    def search(self, key: int) -> object | None:
        idx = self._hash(key)
        start = idx
        while self.slots[idx] is not self._EMPTY:
            if self.slots[idx] is not self._DELETED and self.keys[idx] == key:
                return self.slots[idx]
            idx = (idx + 1) % self.capacity
            if idx == start:
                break
        return None

    def delete(self, key: int) -> bool:
        idx = self._hash(key)
        start = idx
        while self.slots[idx] is not self._EMPTY:
            if self.slots[idx] is not self._DELETED and self.keys[idx] == key:
                self.slots[idx] = self._DELETED
                self.size -= 1
                return True
            idx = (idx + 1) % self.capacity
            if idx == start:
                break
        return False
```

```typescript
const EMPTY = Symbol("empty");
const DELETED = Symbol("deleted");

class LinearProbingTable {
  private capacity: number;
  private size = 0;
  private slots: (unknown | typeof EMPTY | typeof DELETED)[];
  private keys: (number | null)[];

  constructor(capacity = 16) {
    this.capacity = capacity;
    this.slots = new Array(capacity).fill(EMPTY);
    this.keys = new Array(capacity).fill(null);
  }

  private hash(key: number): number {
    // 簡易な整数ハッシュ(実運用ではより良い分散関数を使うこと)
    return Math.abs(key * 2654435761) % this.capacity;
  }

  private resize(): void {
    const old = this.keys.map((k, i) => [k, this.slots[i]] as const);
    this.capacity *= 2;
    this.slots = new Array(this.capacity).fill(EMPTY);
    this.keys = new Array(this.capacity).fill(null);
    this.size = 0;
    for (const [key, slot] of old) {
      if (key !== null && slot !== EMPTY && slot !== DELETED)
        this.insert(key, slot);
    }
  }

  insert(key: number, value: unknown): void {
    if (this.size / this.capacity > 0.7) this.resize();
    let idx = this.hash(key);
    let firstDeleted = -1;
    while (this.slots[idx] !== EMPTY) {
      if (this.slots[idx] === DELETED && firstDeleted === -1) {
        firstDeleted = idx;
      } else if (this.slots[idx] !== DELETED && this.keys[idx] === key) {
        this.slots[idx] = value;
        return;
      }
      idx = (idx + 1) % this.capacity;
    }
    const target = firstDeleted !== -1 ? firstDeleted : idx;
    this.keys[target] = key;
    this.slots[target] = value;
    this.size++;
  }

  search(key: number): unknown | undefined {
    let idx = this.hash(key);
    const start = idx;
    while (this.slots[idx] !== EMPTY) {
      if (this.slots[idx] !== DELETED && this.keys[idx] === key)
        return this.slots[idx];
      idx = (idx + 1) % this.capacity;
      if (idx === start) break;
    }
    return undefined;
  }

  delete(key: number): boolean {
    let idx = this.hash(key);
    const start = idx;
    while (this.slots[idx] !== EMPTY) {
      if (this.slots[idx] !== DELETED && this.keys[idx] === key) {
        this.slots[idx] = DELETED;
        this.size--;
        return true;
      }
      idx = (idx + 1) % this.capacity;
      if (idx === start) break;
    }
    return false;
  }
}
```
