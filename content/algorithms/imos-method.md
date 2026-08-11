---
name: いもす法(差分配列による区間加算)
category: ゲーム/競技プログラミング
subcategory: 競技プログラミング典型
complexity: O(n + q)(nは配列長、qはクエリ数)
summary: 「区間に値を足す」クエリを差分配列への2点更新だけで記録しておき、最後に1回だけ累積和を取ることで、全クエリ処理後の配列をO(n+q)で復元する。
---

## 概要

「配列の区間`[l, r)`全体に値`v`を加算する」というクエリがq回与えられ、全クエリ処理後の配列を求めたいとする。素朴に各クエリごとに区間の全要素へ加算すると、1クエリあたりO(区間長)かかり、最悪でO(n・q)になってしまう。いもす法(競技プログラミングコミュニティでの通称、考案者のハンドルネームに由来)は、**区間への加算を「両端2点だけの差分更新」に変換し、全クエリの処理が終わった後に1回だけ累積和を取る**ことで、区間加算をO(1)償却、全体でO(n+q)まで高速化する。[座標圧縮](/algorithms/coordinate-compression)と同様、多くの競技プログラミングの典型テクニックの中でも特に基本的で応用範囲の広い技法の一つである。

## 仕組み

1. 元の配列と同じ長さ(+1)の**差分配列**`diff`を全て0で初期化する
2. 区間`[l, r)`に値`v`を加算するクエリが来るたびに、実際の配列を更新する代わりに`diff[l] += v`、`diff[r] -= v`という**2点だけの更新**を行う
3. 全てのクエリの処理が終わったら、`diff`配列の**累積和**を先頭から計算する:`result[i] = result[i-1] + diff[i]`
4. この累積和`result`が、全クエリを適用した後の元の配列と一致する。直感的には、`diff[l] += v`が「位置`l`から効果が始まる」ことを、`diff[r] -= v`が「位置`r`でその効果が終わる」ことを表しており、累積和を取ることでその「効果が続いている区間」が正しく足し合わされる
5. 1クエリあたりの更新がO(1)、最後の累積和がO(n)であるため、全体でO(n+q)となる

## 特性・トレードオフ

- **区間加算をO(1)償却に落とす発想の転換**: セグメント木や[Fenwick木(BIT)](/algorithms/fenwick-tree)のような対数時間のデータ構造を使わずとも、「全クエリを処理してから一括で答えを求める」というオフラインの制約さえ許容できれば、驚くほど単純な配列操作だけで区間加算が高速化できる
- **オフライン処理が前提**: いもす法は「全てのクエリが先に与えられていて、最後にまとめて答えを求める」オフラインの設定でのみ使える。クエリの合間に途中経過の値を参照する必要がある(オンラインクエリ)場合は使えず、その場合はセグメント木や[Fenwick木](/algorithms/fenwick-tree)のような、更新のたびに正しい状態を保つデータ構造が必要になる
- **多次元への拡張**: いもす法は2次元(矩形領域への加算)、3次元にも自然に拡張できる。2次元の場合は矩形の4隅に`±v`を配置し、行方向・列方向の2回累積和を取ることで矩形加算がO(1)償却で処理できる
- **使いどころ**: 期間が重なるイベントの集計(スケジュールの混雑度計算)、ゲームのバフ・デバフが一定期間有効なシステムの効果集計、競技プログラミングでの区間更新クエリの前処理、画像処理での矩形領域への一括加算

## 実装例

```python
def range_add_queries(n: int, queries: list[tuple[int, int, int]]) -> list[int]:
    """queries: [(l, r, v), ...] は区間[l, r)にvを加算するクエリ。"""
    diff = [0] * (n + 1)
    for l, r, v in queries:
        diff[l] += v
        diff[r] -= v

    result = [0] * n
    running = 0
    for i in range(n):
        running += diff[i]
        result[i] = running
    return result
```

```typescript
function rangeAddQueries(n: number, queries: [number, number, number][]): number[] {
  const diff = new Array(n + 1).fill(0);
  for (const [l, r, v] of queries) {
    diff[l] += v;
    diff[r] -= v;
  }

  const result = new Array(n).fill(0);
  let running = 0;
  for (let i = 0; i < n; i++) {
    running += diff[i];
    result[i] = running;
  }
  return result;
}
```

```cpp
#include <vector>
#include <tuple>

std::vector<long long> rangeAddQueries(int n, const std::vector<std::tuple<int, int, long long>>& queries) {
    std::vector<long long> diff(n + 1, 0);
    for (auto& [l, r, v] : queries) {
        diff[l] += v;
        diff[r] -= v;
    }

    std::vector<long long> result(n);
    long long running = 0;
    for (int i = 0; i < n; i++) {
        running += diff[i];
        result[i] = running;
    }
    return result;
}
```

```rust
fn range_add_queries(n: usize, queries: &[(usize, usize, i64)]) -> Vec<i64> {
    let mut diff = vec![0i64; n + 1];
    for &(l, r, v) in queries {
        diff[l] += v;
        diff[r] -= v;
    }

    let mut result = vec![0i64; n];
    let mut running = 0i64;
    for i in 0..n {
        running += diff[i];
        result[i] = running;
    }
    result
}
```

```csharp
static long[] RangeAddQueries(int n, List<(int l, int r, long v)> queries)
{
    var diff = new long[n + 1];
    foreach (var (l, r, v) in queries)
    {
        diff[l] += v;
        diff[r] -= v;
    }

    var result = new long[n];
    long running = 0;
    for (int i = 0; i < n; i++)
    {
        running += diff[i];
        result[i] = running;
    }
    return result;
}
```
