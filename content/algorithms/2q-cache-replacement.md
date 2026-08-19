---
name: 2Qキャッシュ置換アルゴリズム
category: スケジューリング
subcategory: キャッシュ置換ポリシー
complexity: O(1)(償却、1回のアクセスあたり)
summary: 一度だけ参照されたページ用の短いFIFOキューと、繰り返し参照されたページ用のLRUキューという2つの実キューに、追い出し履歴を追う1つのゴーストキューを組み合わせることで、一時的な走査パターンに強い簡易な2キュー構成のキャッシュ置換アルゴリズム。
---

## 概要

単純な[LRUキャッシュ](/algorithms/lru-cache)は「最後に参照されたのがいつか」だけを基準にするため、一度きりしか使われないページの大量走査(シーケンシャルスキャン)が起きると、本来繰り返しアクセスされる価値の高いページまでキャッシュから押し出されてしまう「スキャン汚染」に弱い。2Qは、1994年にジョンソン(Johnson)とシャシャ(Shasha)によって提案された、この弱点に対する比較的シンプルな解決策で、「一度だけ参照されたページ」と「繰り返し参照されたページ」を最初から別々の2つのキューで管理する——短い**FIFOキュー**`A1in`に新規ページをまず置き、そこで2回目の参照が確認できたページだけを本命の**LRUキュー**`Am`へ昇格させる。さらに、`A1in`から追い出したページのIDだけを保持する小さな**ゴーストキュー**`A1out`を使って、「最近追い出したばかりのページが実は繰り返しアクセスされていた」ことを検知する。後発の[ARC(Adaptive Replacement Cache)](/algorithms/arc-adaptive-replacement-cache)がこの発想をさらに発展させ配分比率を自己調整するのに対し、2Qはキューサイズをあらかじめ固定パラメータとして設定する、より単純な設計を取る。

## 仕組み

1. 3つのキューを用意する: `A1in`(1回だけ参照されたページを保持する短いFIFOキュー、実データあり)、`Am`(繰り返し参照されたページを保持するLRUキュー、実データあり)、`A1out`(`A1in`から追い出されたページのIDだけを保持するゴーストキュー、実データなし)
2. ページ参照が起きたとき、以下のように分岐する
   - **`Am`にヒット**: そのページを`Am`のMRU位置(最新)へ移動する(通常のLRU更新)
   - **`A1in`にヒット**: 何もしない(まだ2回目の参照が確定した扱いにはしない実装が一般的。実装によっては直ちに`Am`へ昇格させるバリエーションもある)
   - **`A1out`(ゴースト)にヒット**: 「最近`A1in`から追い出したページがまた参照された」ので、実データとしてこのページを`Am`へ直接挿入する(2回目の参照が確認できたとみなし、`A1in`を経由せず本命のLRUキューへ昇格)
   - **どこにもヒットしない(完全な新規ページ)**: `A1in`の末尾(MRU側)に新規追加する
3. `A1in`のサイズが設定した閾値`Kin`を超えたら、最も古いページを`A1in`から追い出し、そのIDだけを`A1out`へ移す(実データは破棄)
4. `A1out`のサイズが設定した閾値`Kout`を超えたら、最も古いエントリを`A1out`から破棄する(履歴を無限には保持しない)
5. キャッシュ全体(`A1in` + `Am`)が容量上限に達した状態で新規ページを追加する必要が生じたら、まず`A1in`が空でなければその最古ページを追い出し(手順3のゴースト化を経由)、`A1in`が空なら`Am`の最古(LRU末尾)ページを追い出す——「一度きりのアクセスかもしれないページ」を優先的に手放し、繰り返しアクセスが確認された`Am`のページはできるだけ温存する

## 特性・トレードオフ

- **計算量**: `A1in`・`Am`・`A1out`のいずれもハッシュテーブル+双方向連結リストで実装すれば、参照・追加・追い出しの全操作を償却`O(1)`で行える。これは[LRUキャッシュ](/algorithms/lru-cache)単体と同じオーダーであり、2キュー化によるコスト増は定数倍にとどまる
- **スキャン汚染への耐性**: 一度きりの大量走査によるページはまず`A1in`という小さなキューにしか入らないため、`Am`(繰り返しアクセスされる本命データ)を押し出す影響が`A1in`のサイズに限定される。単純な[LRUキャッシュ](/algorithms/lru-cache)がスキャン一発でキャッシュ全体を汚染しうるのに対し、2Qはこの被害範囲を構造的に抑え込む
- **[ARC(Adaptive Replacement Cache)](/algorithms/arc-adaptive-replacement-cache)との比較**: ARCは`T1`/`T2`/`B1`/`B2`という4つのリストを持ち、ゴーストリストへのヒット率をシグナルとして配分比率`p`を実行時に自動調整する。2Qは`A1in`/`Am`/`A1out`という3つのリストで構成が単純な代わりに、`Kin`(`A1in`の目標サイズ、論文ではキャッシュ全体の約25%を推奨)や`Kout`(`A1out`の目標サイズ、約50%を推奨)といったパラメータを事前に固定する必要があり、ワークロードが変化してもこれらは自動追従しない。「実装の単純さ」と「自己適応能力」のトレードオフの好例であり、2Qは前者を、ARCは後者を優先した設計と言える
- **[LRU-Kページ置換アルゴリズム](/algorithms/lru-k-page-replacement)との位置づけの違い**: LRU-Kは過去K回の参照履歴という情報を1ページごとに保持して優先度を決めるのに対し、2Qは「1回だけ参照されたか、2回以上参照されたか」という2値の粗い分類とFIFO/LRUの組み合わせだけで近い効果を狙う、より軽量な近似と言える
- **使いどころ**: データベースのバッファプール管理(2Qの提案自体、元々はデータベースバッファ管理の文脈で行われた)、ファイルシステムのページキャッシュ、シーケンシャルスキャンとホットスポットへの繰り返しアクセスが混在しうるが、ARCほどの自己調整コストを払いたくないミドルウェアのキャッシュ層

## 実装例

`A1in`・`Am`をそれぞれPythonでは`OrderedDict`、TypeScriptでは`Map`で表現し、末尾への追加(MRU/新しい方)と先頭からの追い出し(LRU/古い方)でキュー順序を保つ。`A1out`は実データを持たないIDだけの集合として、こちらも順序付きで管理する。

```python
from collections import OrderedDict


class TwoQCache:
    def __init__(self, capacity: int, kin_ratio: float = 0.25, kout_ratio: float = 0.5):
        self.capacity = capacity
        self.kin = max(1, int(capacity * kin_ratio))
        self.kout = max(1, int(capacity * kout_ratio))
        self.a1in: OrderedDict = OrderedDict()   # 1回だけ参照されたページ(実データ)
        self.am: OrderedDict = OrderedDict()      # 繰り返し参照されたページ(実データ)
        self.a1out: OrderedDict = OrderedDict()   # a1inから追い出された履歴(IDのみ)

    def _evict_one(self) -> None:
        if self.a1in:
            key, _ = self.a1in.popitem(last=False)
            self.a1out[key] = None
            if len(self.a1out) > self.kout:
                self.a1out.popitem(last=False)
        elif self.am:
            self.am.popitem(last=False)

    def access(self, key) -> bool:
        """既にキャッシュ済み(a1inまたはam)ならTrueを返す。"""
        if key in self.am:
            self.am.move_to_end(key)
            return True
        if key in self.a1in:
            return True

        if key in self.a1out:
            del self.a1out[key]
            if len(self.a1in) + len(self.am) >= self.capacity:
                self._evict_one()
            self.am[key] = None
            return False

        # 完全な新規ページ
        if len(self.a1in) + len(self.am) >= self.capacity:
            self._evict_one()
        self.a1in[key] = None
        if len(self.a1in) > self.kin:
            oldest, _ = self.a1in.popitem(last=False)
            self.a1out[oldest] = None
            if len(self.a1out) > self.kout:
                self.a1out.popitem(last=False)
        return False
```

```typescript
class TwoQCache {
  private kin: number;
  private kout: number;
  private a1in = new Map<number, null>(); // 1回だけ参照されたページ(実データ)
  private am = new Map<number, null>();    // 繰り返し参照されたページ(実データ)
  private a1out = new Map<number, null>(); // a1inから追い出された履歴(IDのみ)

  constructor(private capacity: number, kinRatio = 0.25, koutRatio = 0.5) {
    this.kin = Math.max(1, Math.floor(capacity * kinRatio));
    this.kout = Math.max(1, Math.floor(capacity * koutRatio));
  }

  private popFront(m: Map<number, null>): number {
    const key = m.keys().next().value as number;
    m.delete(key);
    return key;
  }

  private evictOne(): void {
    if (this.a1in.size > 0) {
      const key = this.popFront(this.a1in);
      this.a1out.set(key, null);
      if (this.a1out.size > this.kout) this.popFront(this.a1out);
    } else if (this.am.size > 0) {
      this.popFront(this.am);
    }
  }

  access(key: number): boolean {
    if (this.am.has(key)) {
      this.am.delete(key);
      this.am.set(key, null); // MRU位置へ
      return true;
    }
    if (this.a1in.has(key)) {
      return true;
    }

    if (this.a1out.has(key)) {
      this.a1out.delete(key);
      if (this.a1in.size + this.am.size >= this.capacity) this.evictOne();
      this.am.set(key, null);
      return false;
    }

    // 完全な新規ページ
    if (this.a1in.size + this.am.size >= this.capacity) this.evictOne();
    this.a1in.set(key, null);
    if (this.a1in.size > this.kin) {
      const oldest = this.popFront(this.a1in);
      this.a1out.set(oldest, null);
      if (this.a1out.size > this.kout) this.popFront(this.a1out);
    }
    return false;
  }
}
```
