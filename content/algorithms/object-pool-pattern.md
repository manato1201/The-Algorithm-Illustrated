---
name: Object Poolパターン
category: デザインパターン
subcategory: 生成
complexity: 取得・返却とも O(1)(空きの管理に配列やスタックを使う場合)
summary: 生成コストの高いオブジェクトを使い捨てにせず、あらかじめ作って貸し出し、使い終わったら回収して再利用する。生成・破棄の負荷とGCの揺れを抑える。
---

## 概要

接続を確立する、巨大なバッファを確保する、ゲームで弾やパーティクルを毎フレーム大量に出し入れする。こうした場面で、オブジェクトを必要になるたびに作って使い終わったら捨てると、生成と破棄のコストが積み重なる。ガベージコレクション(GC)を持つ言語では、まとめて回収される瞬間に処理が止まり、フレームレートが乱れる原因にもなる。

Object Poolパターンは、**オブジェクトを先にまとめて作って「プール」に入れておき、必要な側に貸し出し、使い終わったら返してもらって次に再利用する**。GoF(Gang of Four)の23パターンには含まれないが、データベース接続プール、スレッドプール、ゲームの弾やエフェクトの管理など、実務で最もよく出会う設計のひとつである。

## 仕組み

1. **プールの初期化**: 容量(あるいは初期個数)を決め、オブジェクトを生成して「空き」の入れ物(スタックやリスト)に入れる。生成の仕方は、ファクトリ関数として注入する
2. **取得(acquire)**: 空きがあれば1つ取り出して返す。空きがない場合の方針を決める
   - 新しく生成して増やす(上限があればそこまで)
   - 待つ(別の利用者が返すまでブロック)
   - エラーにする、または古いものを強制的に再利用する
3. **返却(release)**: 利用者がオブジェクトを返す。**状態を初期値に戻して(reset)**から空きに入れる。前の利用者の状態が残ったまま次の利用者に渡るのが、このパターン最大の事故の元
4. **破棄**: アプリケーションの終了時、または一定時間使われなかったものを間引くときに、プール側がまとめて解放する

## 特性・トレードオフ

- **生成コストと負荷の平準化**: 生成が高価なもの(ネットワーク接続、スレッド、大きな配列)ほど効果が大きい。ゲームでは、毎フレームの生成・破棄をなくして、フレーム時間のばらつきを抑えられる
- **状態の持ち越しバグ**: 返却時のリセット漏れで、前の利用者のデータが次に見えてしまう。セキュリティ(別ユーザーの情報の漏洩)にも関わる
- **返し忘れ(リーク)**: 返却されないオブジェクトは永遠に貸し出し中になり、プールが枯渇する。`with` 文・`try/finally`・RAII のように、返却を言語機能で保証する形にする
- **二重返却・返却後の使用**: 返したあとも参照を持ち続けると、別の利用者と同じオブジェクトを同時に触る。返却後は参照を捨てる
- **現代の言語では必要かを検討**: 軽いオブジェクトの生成はGCが十分速く、プールを入れると複雑さだけが増すことがある。生成が高価、または破棄が遅い、あるいはレイテンシのばらつきが許されない場合に限って導入する
- **使いどころ**: DB・HTTP接続プール、スレッドプール、バッファの再利用、ゲームの弾・パーティクル・敵キャラクタ

## 実装例

```python
from contextlib import contextmanager


class Connection:
    created = 0

    def __init__(self):
        Connection.created += 1
        self.id = Connection.created
        self.query_count = 0

    def reset(self):
        self.query_count = 0


class ObjectPool:
    def __init__(self, factory, size):
        self._free = [factory() for _ in range(size)]

    def acquire(self):
        if not self._free:
            raise RuntimeError("プールが空です(全て貸し出し中)")
        return self._free.pop()

    def release(self, obj):
        obj.reset()               # 前の利用者の状態を持ち越さない
        self._free.append(obj)

    @contextmanager
    def lease(self):
        obj = self.acquire()
        try:
            yield obj
        finally:
            self.release(obj)     # 例外が起きても必ず返す


pool = ObjectPool(Connection, size=2)
for _ in range(5):
    with pool.lease() as conn:
        conn.query_count += 1
print("生成数:", Connection.created)  # 5回使っても 2(プールの初期個数のまま)
```

```typescript
class Connection {
  static created = 0;
  readonly id: number;
  queryCount = 0;
  constructor() {
    Connection.created++;
    this.id = Connection.created;
  }
  reset(): void {
    this.queryCount = 0;
  }
}

class ObjectPool<T extends { reset(): void }> {
  private free: T[];
  constructor(factory: () => T, size: number) {
    this.free = Array.from({ length: size }, factory);
  }
  acquire(): T {
    const obj = this.free.pop();
    if (obj === undefined) throw new Error("プールが空です(全て貸し出し中)");
    return obj;
  }
  release(obj: T): void {
    obj.reset(); // 前の利用者の状態を持ち越さない
    this.free.push(obj);
  }
  lease<R>(use: (obj: T) => R): R {
    const obj = this.acquire();
    try {
      return use(obj);
    } finally {
      this.release(obj); // 例外が起きても必ず返す
    }
  }
}

const pool = new ObjectPool(() => new Connection(), 2);
for (let i = 0; i < 5; i++) pool.lease((c) => c.queryCount++);
console.log("生成数:", Connection.created); // 2
```
