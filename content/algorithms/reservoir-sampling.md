---
name: リザーバサンプリング(貯水池標本法)
category: ゲーム/競技プログラミング
subcategory: ゲームバランス・乱数制御
complexity: O(n)(nはストリームの全要素数)、O(k)(必要な追加メモリ)
summary: 全体の件数が事前に分からない(あるいは巨大すぎてメモリに載らない)データの流れから、「k個をそれぞれ均等な確率で選んだ」状態を、要素を1つずつ確認しながら「置き換えるかどうか」を確率的に判定するだけで実現する。
---

## 概要

ログファイルから1行、SNSのタイムラインから1件のツイートを「全体から均等な確率で」ランダムサンプリングしたいが、**全体の件数が事前に分からない、あるいはメモリに収まらないほど巨大**という状況は珍しくない。全データを一度メモリに読み込んでから[エイリアス法](/algorithms/alias-method)のような手法で抽選する余裕がない場合、リザーバサンプリング(貯水池標本法)は、**データを1回だけ順番に読み流しながら**、既に見た件数分の情報だけを保持して、最終的に全体から均等な確率で選ばれたことになるサンプル集合を維持できる、驚くほどシンプルなアルゴリズムである。1985年にジェフリー・ヴィッターが理論的な正しさを証明した、ストリーム処理における基本的な乱択アルゴリズムの一つ。

## 仕組み

`k`個のサンプルを、要素数`n`が未知のストリームから均等な確率で選びたいとする(k=1の単純なケースから説明する)。

1. **貯水池(リザーバ)** として、サイズ`k`の配列を用意する。ストリームの最初の`k`個をそのまま貯水池に入れる
2. `k+1`番目以降の要素`x`(今何番目の要素か、を`i`とする、1-indexed)について、確率`k/i`で、貯水池内の要素をランダムに1つ選んで`x`と**置き換える**。確率`1 - k/i`では何もしない(`x`を捨てる)
3. ストリームの最後まで2を繰り返すと、**貯水池に残っている`k`個の要素は、全`n`個の要素の中から均等な確率で選ばれた標本になっている**ことが数学的に証明できる
4. `k=1`の単純な場合(ストリームから1件だけをランダムに選ぶ)では、`i`番目の要素を確率`1/i`で採用(現在の保持要素と置き換え)する、というさらにシンプルな形になる

**なぜこれで均等な確率になるのか**: `i`番目の要素が最終的な貯水池に残る確率は、「`i`番目の時点で選ばれる確率`k/i`」×「それ以降の全てのステップで置き換えられない確率」の積になる。この積を計算すると、`i`の値によらず一律`k/n`になることが数学的に示せる(各ステップの確率が巧妙にキャンセルし合う設計になっている)。

## 特性・トレードオフ

- **全体のサイズを事前に知る必要がない**: [エイリアス法](/algorithms/alias-method)のような重み付き抽選手法は、事前に全ての候補と重みが分かっていることを前提とするが、リザーバサンプリングはストリームの終わりが来るまで全体のサイズ`n`を知らなくても正しく機能する。ログ処理やリアルタイムのデータストリームからのサンプリングに特に向いている
- **メモリ使用量がサンプルサイズ`k`だけに依存する**: 元のデータ全体を保持する必要が一切なく、常に`k`個分のメモリだけで済む。ストリームが数十億件に及ぶような巨大なデータでも、リアルタイムに、一定のメモリ使用量でサンプリングできる
- **重み付きサンプリングへの拡張**: 基本形は各要素が均等な確率で選ばれることを前提とするが、各要素に異なる重みがある場合に拡張した「重み付きリザーバサンプリング(A-Res法など)」も存在し、指数分布に基づく鍵を使うことで、ストリーム処理のまま重み付き抽選を実現できる
- **使いどころ**: ログ・イベントストリームからの代表サンプル抽出、SNS・検索エンジンにおけるランダム表示アイテムの選定、[MinHash/LSH](/algorithms/minhash-lsh)のような近似アルゴリズムの前処理としてのデータサンプリング、大規模データセットに対する統計的推定のための無作為抽出

## 実装例

```python
import random

def reservoir_sample(stream: "Iterable[int]", k: int) -> list[int]:
    reservoir: list[int] = []
    for i, x in enumerate(stream):
        if i < k:
            reservoir.append(x)
        else:
            j = random.randint(0, i)  # 0からiまでの一様乱数
            if j < k:
                reservoir[j] = x
    return reservoir
```

```typescript
function reservoirSample<T>(
  stream: Iterable<T>,
  k: number,
  rand: () => number = Math.random,
): T[] {
  const reservoir: T[] = [];
  let i = 0;
  for (const x of stream) {
    if (i < k) {
      reservoir.push(x);
    } else {
      const j = Math.floor(rand() * (i + 1));
      if (j < k) reservoir[j] = x;
    }
    i++;
  }
  return reservoir;
}
```

```cpp
#include <vector>
#include <random>

template <typename Iterator>
std::vector<typename std::iterator_traits<Iterator>::value_type> reservoirSample(Iterator begin, Iterator end, int k) {
    using T = typename std::iterator_traits<Iterator>::value_type;
    std::vector<T> reservoir;
    std::mt19937 rng(std::random_device{}());

    int i = 0;
    for (auto it = begin; it != end; ++it, ++i) {
        if (i < k) {
            reservoir.push_back(*it);
        } else {
            std::uniform_int_distribution<int> dist(0, i);
            int j = dist(rng);
            if (j < k) reservoir[j] = *it;
        }
    }
    return reservoir;
}
```

```rust
use rand::Rng;

fn reservoir_sample<T: Clone>(stream: impl Iterator<Item = T>, k: usize, rng: &mut impl Rng) -> Vec<T> {
    let mut reservoir: Vec<T> = Vec::with_capacity(k);
    for (i, x) in stream.enumerate() {
        if i < k {
            reservoir.push(x);
        } else {
            let j = rng.gen_range(0..=i);
            if j < k {
                reservoir[j] = x;
            }
        }
    }
    reservoir
}
```

```csharp
static List<T> ReservoirSample<T>(IEnumerable<T> stream, int k, Random rand)
{
    var reservoir = new List<T>(k);
    int i = 0;
    foreach (var x in stream)
    {
        if (i < k)
        {
            reservoir.Add(x);
        }
        else
        {
            int j = rand.Next(i + 1);
            if (j < k) reservoir[j] = x;
        }
        i++;
    }
    return reservoir;
}
```
