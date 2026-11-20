---
name: ロビンフッドハッシュ法
category: データ構造
subcategory: 確率的・キャッシュ構造
complexity: 挿入・検索が平均 O(1)、探索長のばらつきが小さい
summary: オープンアドレス法の衝突解決で、「本来の位置から遠くに押し出されている要素」を優先して場所を譲らせ、探索距離のばらつきを抑えるハッシュ表。
---

## 概要

オープンアドレス法の線形探索(linear probing)は、衝突したら隣のスロットを順に見るだけの単純で高速な方式だが、運の悪い要素だけが長く探されることがある。連続して埋まった区間(クラスタ)に当たった要素は、遠くまで探索しないと見つからない。平均の探索長は小さくても、**最悪の要素の探索長が大きい**のが弱点になる。

ロビンフッドハッシュ法(Celis、Larson、Munro、1985年)は、挿入の際に「より恵まれている(本来の位置に近い)要素から場所を奪い、より恵まれていない(遠くに追いやられている)要素に譲る」という名前通りの規則で、探索長の分布を均す。総合の平均は変わらないが、**ばらつき(分散)が小さくなる**ので、最悪ケースの検索が速くなり、キャッシュ上でも予測しやすい。

## 仕組み

各スロットは、格納した要素の**本来の位置(ハッシュ値)からの距離(DIB: distance from initial bucket)**を持つ。

- **挿入**: ハッシュ値の位置から線形に探索し、自分の現在の距離 `d` を数えながら進む。あるスロットで、そこにいる要素の距離 `e` が自分の `d` より**小さい**なら、その要素と入れ替える(金持ちから奪う)。追い出された要素は、同じ規則で次のスロット以降に挿入し直す。空きスロットに着いたら置いて終了
- **検索**: 同じようにたどる。現在の自分の距離 `d` より、スロットの要素の距離が小さくなった時点で、「もしここまでに存在するならすでに見つかっているはず」なので、**見つからないと判定して早期に打ち切れる**
- **削除**: 後ろのスロットを1つ前へ詰める(後退シフト削除)。直後の要素の距離が0または空きになるまで、1つずつ前にずらして距離を1減らす。墓石(tombstone)を残さなくてよい

## 特性・トレードオフ

- **探索長の分散が小さい**: 平均は線形探索と同じでも、最長の探索が短くなる。負荷率が高くても性能が落ちにくい
- **失敗検索が速い**: 距離の比較で早期に打ち切れるので、存在しない要素の検索が速い(線形探索では空きスロットまで読む必要がある)
- **挿入はやや重い**: 入れ替えと再挿入が走るため、挿入1回あたりの書き込みが増える。要素が大きい場合は、スロットを間接参照にするなどの工夫が要る
- **負荷率の上限は必要**: 満杯に近づくと全体が遅くなるので、一定の負荷率(目安として 0.8 から 0.9 前後)で表を拡張する
- **使いどころ**: Rust の初期の `HashMap`(後に別方式へ移行)など、性能の予測しやすさを重視するハッシュ表。キャッシュ効率を重視する組込み・ゲームのデータ構造

## 実装例

```python
class RobinHoodTable:
    def __init__(self, capacity=16):
        self.cap = capacity
        self.slots = [None] * capacity   # (key, value, dib)

    def _home(self, key):
        return hash(key) % self.cap

    def put(self, key, value):
        i = self._home(key)
        item = (key, value, 0)
        while True:
            cur = self.slots[i]
            if cur is None:
                self.slots[i] = item
                return
            if cur[0] == item[0]:
                self.slots[i] = (item[0], item[1], cur[2])
                return
            if cur[2] < item[2]:              # 現在の要素のほうが恵まれている
                self.slots[i], item = item, cur  # 奪って、追い出された方を挿入し直す
            i = (i + 1) % self.cap
            item = (item[0], item[1], item[2] + 1)

    def get(self, key):
        i = self._home(key)
        dib = 0
        while True:
            cur = self.slots[i]
            if cur is None or cur[2] < dib:
                return None
            if cur[0] == key:
                return cur[1]
            i = (i + 1) % self.cap
            dib += 1


t = RobinHoodTable(8)
for k in range(5):
    t.put(k * 8, k)          # すべて同じ位置にぶつかる
print([t.get(k * 8) for k in range(5)], t.get(99))  # [0, 1, 2, 3, 4] None
```

```typescript
type Slot = { key: number; value: number; dib: number } | null;

class RobinHoodTable {
  private slots: Slot[];
  private cap: number;
  constructor(cap = 16) {
    this.cap = cap;
    this.slots = new Array<Slot>(cap).fill(null);
  }
  private home(key: number): number {
    return ((key % this.cap) + this.cap) % this.cap;
  }

  put(key: number, value: number): void {
    let i = this.home(key);
    let item = { key, value, dib: 0 };
    for (;;) {
      const cur = this.slots[i];
      if (cur === null) {
        this.slots[i] = item;
        return;
      }
      if (cur.key === item.key) {
        cur.value = item.value;
        return;
      }
      if (cur.dib < item.dib) {
        this.slots[i] = item;
        item = cur;
      }
      i = (i + 1) % this.cap;
      item = { ...item, dib: item.dib + 1 };
    }
  }

  get(key: number): number | undefined {
    let i = this.home(key);
    for (let dib = 0; ; dib++) {
      const cur = this.slots[i];
      if (cur === null || cur.dib < dib) return undefined;
      if (cur.key === key) return cur.value;
      i = (i + 1) % this.cap;
    }
  }
}

const t = new RobinHoodTable(8);
for (let k = 0; k < 5; k++) t.put(k * 8, k);
console.log(
  [0, 1, 2, 3, 4].map((k) => t.get(k * 8)),
  t.get(99),
); // [0, 1, 2, 3, 4] undefined
```
