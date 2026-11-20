---
name: カッコウフィルタ
category: データ構造
subcategory: 確率的・キャッシュ構造
complexity: 検索 O(1)(2つのバケットを見るだけ)、挿入は償却 O(1)
summary: 要素そのものではなく短い指紋だけを2つの候補バケットに置く確率的集合。ブルームフィルタと違って削除でき、偽陽性率が低いときは省メモリになりやすい。
---

## 概要

[ブルームフィルタ](/algorithms/bloom-filter)は「入っていないことは確実、入っているかもしれない」を省メモリで答える確率的集合だが、**要素を削除できない**(ビットを下ろすと他の要素まで巻き込む)という弱点がある。カウンタ付きの拡張はメモリが数倍に膨らむ。

カッコウフィルタ(Fan、Andersen、Kaminsky、Mitzenmacher、2014年)は、[カッコウハッシュ法](/algorithms/cuckoo-hashing)の「どちらか2つの場所に入る」という発想を、要素ではなく**数ビットの指紋(fingerprint)**に適用した。指紋を表に入れておけば、削除は指紋を1つ消すだけで済み、検索は2つのバケットを調べるだけで済む。偽陽性率が数%以下の領域では、ブルームフィルタよりも1要素あたりのビット数が小さくなることが多い。

## 仕組み

表は `m` 個のバケットで、各バケットに指紋を最大 `b` 個(典型的には4個)置ける。`m` は2のべき乗にする。

1. 要素 `x` から指紋 `f = fingerprint(x)` と第1バケット `i1 = hash(x) mod m` を求める
2. 第2バケットを `i2 = i1 XOR hash(f)` とする(**部分キー・カッコウハッシュ**)。XORは自分自身の逆なので、`i2` から同じ式で `i1` に戻れる。つまり、元の要素を知らなくても、指紋と現在のバケットだけで「もう一方の候補」が分かる
3. **挿入**: `i1`・`i2` のどちらかに空きがあれば指紋を置く。両方埋まっていれば、どちらかのバケットから指紋を1つ選んで追い出し、その指紋を「もう一方の候補バケット」へ移す。移った先も満杯ならさらに追い出す。これを一定回数(例: 500回)繰り返しても空きが見つからなければ挿入失敗(表が満杯に近い)とみなす
4. **検索**: `i1`・`i2` のどちらかに指紋 `f` があれば「あるかもしれない」、なければ「ない」
5. **削除**: `i1`・`i2` のどちらかから指紋 `f` を1つ消す

## 特性・トレードオフ

- **削除できる**: ただし「実際に挿入した要素だけ」を消す前提。入っていない要素の削除を許すと、同じ指紋を持つ別の要素を消してしまい、偽陰性が生じる
- **偽陽性率**: 指紋が `f` ビット、バケットが `b` 個なら、偽陽性率はおおよそ `2b / 2^f` に比例する。指紋を長くするほど下がる
- **負荷率の上限**: バケットサイズ4なら、表の95%程度まで埋められる。ブルームフィルタのように、要素数を超えると徐々に精度が落ちるのではなく、満杯付近で急に挿入が失敗する。事前の容量設計が必要
- **同じ要素の重複挿入に注意**: 同じ指紋が同じ2バケットに溜まり、最大 `2b` 回までしか入らない
- **使いどころ**: ネットワーク機器のルックアップ表、キャッシュの存在確認(「ディスクにあるか」を先に安く判定する)、削除を伴う重複排除、ストレージの読み取り前フィルタ

## 実装例

```python
class CuckooFilter:
    def __init__(self, buckets=16, bucket_size=2, max_kicks=100):
        assert buckets & (buckets - 1) == 0, "バケット数は2のべき乗"
        self.m = buckets
        self.b = bucket_size
        self.max_kicks = max_kicks
        self.table = [[] for _ in range(buckets)]
        self.state = 12345  # 追い出しの選択に使う固定シードの乱数

    @staticmethod
    def _h(data: str) -> int:
        h = 0x811C9DC5  # FNV-1a (32bit)
        for ch in data.encode():
            h = ((h ^ ch) * 0x01000193) & 0xFFFFFFFF
        return h

    def _fp(self, item):
        return self._h("fp:" + item) % 15 + 1        # 1..15 (0 は空きの意味に取っておく)

    def _alt(self, index, fp):
        return (index ^ self._h(str(fp))) % self.m   # XOR なので往復できる

    def _rand(self):
        self.state = (1103515245 * self.state + 12345) & 0x7FFFFFFF
        return self.state >> 16

    def insert(self, item):
        fp = self._fp(item)
        i1 = self._h(item) % self.m
        i2 = self._alt(i1, fp)
        for i in (i1, i2):
            if len(self.table[i]) < self.b:
                self.table[i].append(fp)
                return True
        i = (i1, i2)[self._rand() & 1]
        for _ in range(self.max_kicks):
            slot = self._rand() % self.b
            fp, self.table[i][slot] = self.table[i][slot], fp  # 追い出す
            i = self._alt(i, fp)                                # 追い出された指紋のもう一方の候補へ
            if len(self.table[i]) < self.b:
                self.table[i].append(fp)
                return True
        return False

    def contains(self, item):
        fp = self._fp(item)
        i1 = self._h(item) % self.m
        return fp in self.table[i1] or fp in self.table[self._alt(i1, fp)]

    def delete(self, item):
        fp = self._fp(item)
        i1 = self._h(item) % self.m
        for i in (i1, self._alt(i1, fp)):
            if fp in self.table[i]:
                self.table[i].remove(fp)
                return True
        return False


cf = CuckooFilter()
words = ["apple", "banana", "cherry", "date", "elder", "fig", "grape", "honey"]
print(all(cf.insert(w) for w in words), all(cf.contains(w) for w in words))  # True True
cf.delete("fig")
print(cf.contains("fig"))  # 通常 False(偽陽性なら True になりうる)
```

```typescript
class CuckooFilter {
  private table: number[][];
  private state = 12345;
  private readonly m: number;
  private readonly b: number;
  private readonly maxKicks: number;
  constructor(m = 16, b = 2, maxKicks = 100) {
    this.m = m;
    this.b = b;
    this.maxKicks = maxKicks;
    this.table = Array.from({ length: m }, () => []);
  }

  private h(data: string): number {
    let h = 0x811c9dc5;
    for (const byte of new TextEncoder().encode(data)) {
      h = Math.imul(h ^ byte, 0x01000193) >>> 0;
    }
    return h;
  }
  private fp(item: string): number {
    return (this.h("fp:" + item) % 15) + 1;
  }
  private alt(index: number, fp: number): number {
    return (index ^ this.h(String(fp))) % this.m;
  }
  private rand(): number {
    this.state = (Math.imul(1103515245, this.state) + 12345) & 0x7fffffff;
    return this.state >> 16;
  }

  insert(item: string): boolean {
    let fp = this.fp(item);
    const i1 = this.h(item) % this.m;
    const i2 = this.alt(i1, fp);
    for (const i of [i1, i2]) {
      if (this.table[i].length < this.b) {
        this.table[i].push(fp);
        return true;
      }
    }
    let i = [i1, i2][this.rand() & 1];
    for (let k = 0; k < this.maxKicks; k++) {
      const slot = this.rand() % this.b;
      [fp, this.table[i][slot]] = [this.table[i][slot], fp];
      i = this.alt(i, fp);
      if (this.table[i].length < this.b) {
        this.table[i].push(fp);
        return true;
      }
    }
    return false;
  }

  contains(item: string): boolean {
    const fp = this.fp(item);
    const i1 = this.h(item) % this.m;
    return this.table[i1].includes(fp) || this.table[this.alt(i1, fp)].includes(fp);
  }
}

const cf = new CuckooFilter();
const words = ["apple", "banana", "cherry", "date", "elder", "fig", "grape", "honey"];
console.log(words.every((w) => cf.insert(w)), words.every((w) => cf.contains(w))); // true true
```
