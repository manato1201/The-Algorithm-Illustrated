---
name: 並列リデュース(Parallel Reduce)
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(n/p + log p)(n=要素数、p=プロセッサ数。結合律を満たす演算の場合)
summary: 結合律を満たす二項演算(加算・最大値など)であれば、要素を各プロセッサへ分割して局所的に集約し、その部分結果どうしを木構造に統合していくことで、逐次O(n)の畳み込みをO(n/p + log p)へ高速化できる並列計算パターン。
---

## 概要

合計・最大値・論理積のような「結合律を満たす二項演算」による畳み込み(リデュース)は、演算の順序を自由に入れ替えられるという性質から、並列化が非常に自然に行える。並列リデュースは、要素の集合を複数のプロセッサに分割し、各プロセッサが担当分をローカルに逐次リデュースした後、得られた部分結果どうしを木構造(トーナメント方式)で段階的に統合していく。この2段階構造(ローカル集約+木構造統合)により、逐次だとO(n)かかる処理をO(n/p + log p)まで短縮できる。[parallel-prefix-sum](/algorithms/parallel-prefix-sum)が「途中経過の累積結果すべて」を保持するのに対し、並列リデュースは「最終結果1つだけ」を求める点が異なり、その分だけ単純で高速である。

## 仕組み

1. n個の要素をp個のプロセッサに(できるだけ均等に)分割する
2. 各プロセッサは自分が担当する区間を逐次的にリデュース(畳み込み)し、1つの部分結果を得る(このステップがO(n/p))
3. p個の部分結果を、木構造(トーナメント)で段階的にペアごとに統合していく——1段階ごとに統合が必要な要素数が半分になるため、この統合フェーズはO(log p)段階で完了する
4. 最終的に1つの結果に統合されたら、それが全体のリデュース結果である
5. 演算が結合律を満たしてさえいれば(可換律は不要)、どの順序でペアを組んでも結果は変わらない

## 特性・トレードオフ

- **計算量**: `O(n/p + log p)`(ローカル集約がn/p、木構造統合がlog p段階)。逐次のO(n)に対し、pが十分大きければ大幅な高速化が得られる
- **適用条件**: 演算が結合律(`(a op b) op c = a op (b op c)`)を満たすことが必須である。可換律(順序を入れ替えられる)は必須ではないが、満たしていれば分割方法の自由度が上がる
- **[フォーク・ジョインモデル](/algorithms/fork-join-model)との関係**: 木構造での統合はフォーク・ジョインモデルの再帰的な分割・統合構造そのものであり、並列リデュースはフォーク・ジョインパターンの典型的な応用例の1つと見なせる
- **[parallel-prefix-sum](/algorithms/parallel-prefix-sum)との違い**: プレフィックスサムは各位置までの累積結果すべてを必要とするため2フェーズ(アップスイープ・ダウンスイープ)が必要だが、最終結果だけでよいリデュースは木構造の統合(アップスイープに相当する部分)だけで完結する、より単純な問題である
- **使いどころ**: [MapReduce](/algorithms/mapreduce)のreduceフェーズの局所的な実装、GPUプログラミングにおけるウォープ内リダクション、大規模データの集約統計(合計・最大値・平均)の並列計算

## 実装例

```python
from concurrent.futures import ThreadPoolExecutor
import operator
from functools import reduce


def parallel_reduce(data: list[int], op=operator.add, num_workers: int = 4) -> int:
    if not data:
        raise ValueError("空のリストはリデュースできない")
    chunk_size = max(1, len(data) // num_workers)
    chunks = [data[i : i + chunk_size] for i in range(0, len(data), chunk_size)]

    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        # 1段階目: 各プロセッサがローカルにチャンクを逐次リデュース
        partials = list(executor.map(lambda c: reduce(op, c), chunks))

    # 2段階目: 部分結果を木構造(トーナメント)で段階的に統合
    while len(partials) > 1:
        next_level = []
        for i in range(0, len(partials), 2):
            if i + 1 < len(partials):
                next_level.append(op(partials[i], partials[i + 1]))
            else:
                next_level.append(partials[i])
        partials = next_level
    return partials[0]
```

```typescript
type BinaryOp<T> = (a: T, b: T) => T;

async function parallelReduce<T>(data: T[], op: BinaryOp<T>, numWorkers = 4): Promise<T> {
  if (data.length === 0) throw new Error("空の配列はリデュースできない");
  const chunkSize = Math.max(1, Math.ceil(data.length / numWorkers));
  const chunks: T[][] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }

  // 1段階目: 各チャンクを「並列に」ローカルリデュース(Promise.allで模擬)
  let partials = await Promise.all(chunks.map((chunk) => Promise.resolve(chunk.reduce(op))));

  // 2段階目: 部分結果を木構造(トーナメント)で段階的に統合
  while (partials.length > 1) {
    const nextLevel: T[] = [];
    for (let i = 0; i < partials.length; i += 2) {
      nextLevel.push(i + 1 < partials.length ? op(partials[i], partials[i + 1]) : partials[i]);
    }
    partials = nextLevel;
  }
  return partials[0];
}
```
