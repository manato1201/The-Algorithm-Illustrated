---
name: ARC(Adaptive Replacement Cache)
category: スケジューリング
subcategory: キャッシュ置換ポリシー
complexity: O(1)(償却、1回のアクセスあたり)
summary: 最近参照されたページのリストと繰り返し参照されたページのリストを2つ同時に管理し、その配分比率をアクセスパターンに応じて自動調整することで、LRUとLFUの利点を状況に応じて自己バランスさせるキャッシュ置換アルゴリズム。
---

## 概要

[LRUキャッシュ](/algorithms/lru-cache)は「最近使われたか」を、[LFUキャッシュ](/algorithms/lfu-cache)は「これまで何回使われたか」を基準にするが、実際のワークロードは時間帯やアクセスパターンによってどちらの基準がより有効かが変わり続ける——一時的な走査が多い時間帯ではLFU寄りの判断が、繰り返しアクセスの多い時間帯ではLRU寄りの判断が有利になる。2003年にIBMのニムロド・メギッド(Nimrod Megiddo)らが発表したARC(Adaptive Replacement Cache)は、「1回だけ参照されたページ」のリストと「複数回参照されたページ」のリストを別々に管理し、さらに追い出したページの履歴(ゴーストリスト)を追跡することで、2つのリストの配分比率をワークロードの変化に合わせて自己調整する、パラメータチューニング不要の適応型キャッシュアルゴリズムである。

## 仕組み

1. キャッシュ容量`c`に対して、実データを保持する2つのリスト`T1`(最近1回だけ参照されたページ、LRU順)と`T2`(直近で複数回参照されたページ、LRU順)を用意する。さらに、実データは持たずページIDの履歴だけを保持する2つのゴーストリスト`B1`(`T1`から追い出されたページの履歴)と`B2`(`T2`から追い出されたページの履歴)を用意する
2. `T1`のうちどこまでを優先的に確保するかを表す目標サイズ`p`(0以上`c`以下)を保持する。初期値は`p = 0`から始める
3. ページ参照が起きたとき、以下のように分岐する: (a) `T1`または`T2`(実データ側)にヒットすれば、そのページを`T2`の最新位置へ移す(2回目の参照になったので「頻繁に使われる」側へ昇格)。(b) `B1`(ゴースト)にヒットすれば、「最近`T1`から追い出したページがまた参照された」という兆候なので、`p`を増やして`T1`側を優先するようバランスを調整し、そのページを`T2`へ実データとして復帰させる。(c) `B2`(ゴースト)にヒットすれば逆に`p`を減らして`T2`側を優先するよう調整し、同様に`T2`へ復帰させる。(d) どこにもヒットしなければ完全な新規ページとして`T1`の先頭に追加する
4. 新規ページを追加してキャッシュが満杯になったときは、現在の`p`の値に従って`T1`と`T2`のどちらから追い出すかを決める(`T1`の実データサイズが`p`を超えていれば`T1`から、そうでなければ`T2`から、それぞれのリストの末尾=最も古いページを追い出し、そのIDだけをゴーストリストへ移す)
5. ゴーストリストにもサイズ上限があり、古い履歴は捨てられる。このゴーストリストへの「ヒット」がステップ3の`p`の調整シグナルとして働くことで、ARCはLRU寄り(`p`が小さい=`T1`重視)とLFU寄り(`p`が大きい=`T2`重視)のバランスを、明示的なパラメータ設定なしにワークロードへ追従させ続ける

## 特性・トレードオフ

- **計算量**: `T1`・`T2`・`B1`・`B2`をいずれも[LRUキャッシュ](/algorithms/lru-cache)と同様のハッシュテーブル+双方向連結リストで実装すれば、参照・追加・追い出しの全操作を償却`O(1)`で行える
- **[LRUキャッシュ](/algorithms/lru-cache)・[LFUキャッシュ](/algorithms/lfu-cache)との位置づけの違い**: [LRUキャッシュ](/algorithms/lru-cache)は最近性のみ、[LFUキャッシュ](/algorithms/lfu-cache)は頻度のみを見る単一指標の戦略だが、ARCは「最近性を示す`T1`」と「頻度を示す`T2`」の両方を同時に保持し、ゴーストリストへのヒットという間接的なフィードバックで両者の配分比率`p`を動的に決める点が本質的に異なる。LRUが弱い一時的な走査パターン(スキャン汚染)にも、LFUが弱い経年劣化(古い人気への固執)にも、`p`の自己調整によって単独の方式より頑健に対応できる
- **パラメータチューニングが不要という実務上の強み**: [LRU-Kページ置換アルゴリズム](/algorithms/lru-k-page-replacement)の`K`のように、人手で調整すべきハイパーパラメータを持たない——ゴーストリストへのヒット率という観測可能な量から`p`を自動導出するため、ワークロードが変化してもデプロイ後にチューニングし直す必要がない
- **メモリオーバーヘッド**: ゴーストリスト`B1`・`B2`は実データを保持しないためデータ自体のメモリコストはかからないが、ページIDのエントリ分だけメタデータのメモリ使用量が[LRUキャッシュ](/algorithms/lru-cache)単体より増える。この追加コストと自己調整能力とのトレードオフを許容できる場面で採用される
- **使いどころ**: ZFS・IBMのストレージシステムなど、ワークロードの性質が時間とともに変化しやすい大規模ストレージのキャッシュ層、データベースのバッファプール管理(頻繁なフルスキャンとホットスポットへの繰り返しアクセスが混在する環境)、CDNのようにアクセスパターンが安定しないキャッシュシステム

## 実装例

`T1`/`T2`/`B1`/`B2`の4リストと目標サイズ`p`を管理する簡略化されたARCの実装。各リストはPythonでは`OrderedDict`(挿入順を保つ辞書)、TypeScriptでは`Map`で表現し、末尾への追加と先頭からの追い出しでLRU順序を保つ。

```python
from collections import OrderedDict


class ArcCache:
    def __init__(self, capacity: int):
        self.c = capacity
        self.p = 0  # T1優先の目標サイズ
        self.t1: OrderedDict = OrderedDict()
        self.t2: OrderedDict = OrderedDict()
        self.b1: OrderedDict = OrderedDict()
        self.b2: OrderedDict = OrderedDict()

    def _replace(self, in_b2: bool) -> None:
        if self.t1 and (len(self.t1) > self.p or (in_b2 and len(self.t1) == self.p)):
            key, _ = self.t1.popitem(last=False)
            self.b1[key] = None
        elif self.t2:
            key, _ = self.t2.popitem(last=False)
            self.b2[key] = None

    def access(self, key) -> bool:
        """既にキャッシュ済みならTrueを返す。"""
        if key in self.t1:
            del self.t1[key]
            self.t2[key] = None
            return True
        if key in self.t2:
            self.t2.move_to_end(key)
            return True

        if key in self.b1:
            self.p = min(self.c, self.p + max(1, len(self.b2) // max(1, len(self.b1))))
            self._replace(in_b2=False)
            del self.b1[key]
            self.t2[key] = None
            return False

        if key in self.b2:
            self.p = max(0, self.p - max(1, len(self.b1) // max(1, len(self.b2))))
            self._replace(in_b2=True)
            del self.b2[key]
            self.t2[key] = None
            return False

        # 完全な新規ページ
        if len(self.t1) + len(self.b1) == self.c:
            if len(self.t1) < self.c:
                self.b1.popitem(last=False)
                self._replace(in_b2=False)
            else:
                self.t1.popitem(last=False)
        elif len(self.t1) + len(self.b1) < self.c <= len(self.t1) + len(self.t2) + len(self.b1) + len(self.b2):
            if len(self.t1) + len(self.t2) + len(self.b1) + len(self.b2) == 2 * self.c:
                self.b2.popitem(last=False)
            self._replace(in_b2=False)
        self.t1[key] = None
        return False
```

```typescript
class ArcCache {
  private p = 0; // T1優先の目標サイズ
  private t1 = new Map<number, null>();
  private t2 = new Map<number, null>();
  private b1 = new Map<number, null>();
  private b2 = new Map<number, null>();

  constructor(private c: number) {}

  private popFront(m: Map<number, null>): number {
    const key = m.keys().next().value as number;
    m.delete(key);
    return key;
  }

  private replace(inB2: boolean): void {
    if (this.t1.size > 0 && (this.t1.size > this.p || (inB2 && this.t1.size === this.p))) {
      this.b1.set(this.popFront(this.t1), null);
    } else if (this.t2.size > 0) {
      this.b2.set(this.popFront(this.t2), null);
    }
  }

  access(key: number): boolean {
    if (this.t1.has(key)) {
      this.t1.delete(key);
      this.t2.set(key, null);
      return true;
    }
    if (this.t2.has(key)) {
      this.t2.delete(key);
      this.t2.set(key, null); // 末尾へ移動
      return true;
    }

    if (this.b1.has(key)) {
      this.p = Math.min(this.c, this.p + Math.max(1, Math.floor(this.b2.size / Math.max(1, this.b1.size))));
      this.replace(false);
      this.b1.delete(key);
      this.t2.set(key, null);
      return false;
    }

    if (this.b2.has(key)) {
      this.p = Math.max(0, this.p - Math.max(1, Math.floor(this.b1.size / Math.max(1, this.b2.size))));
      this.replace(true);
      this.b2.delete(key);
      this.t2.set(key, null);
      return false;
    }

    // 完全な新規ページ
    const t1b1 = this.t1.size + this.b1.size;
    const total = this.t1.size + this.t2.size + this.b1.size + this.b2.size;
    if (t1b1 === this.c) {
      if (this.t1.size < this.c) {
        this.popFront(this.b1);
        this.replace(false);
      } else {
        this.popFront(this.t1);
      }
    } else if (t1b1 < this.c && total >= this.c) {
      if (total === 2 * this.c) this.popFront(this.b2);
      this.replace(false);
    }
    this.t1.set(key, null);
    return false;
  }
}
```
