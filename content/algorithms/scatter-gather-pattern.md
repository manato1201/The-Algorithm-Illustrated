---
name: スキャッター・ギャザーパターン(Scatter-Gather Pattern)
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(n/p + p)(scatter/gatherの通信コストを含めた概算。nはデータ量、pはワーカー数)
summary: 1つの大きな入力を複数のワーカーに分配(スキャッター)し、各ワーカーが独立に処理した結果を後で1箇所に集約(ギャザー)するという、分散・並列処理で最も基本的なデータ分配・集約の往復パターン。
---

## 概要

大きな仕事を複数のワーカーへ分けて任せ、結果が出そろったら1つにまとめる——この単純な往復こそが、分散・並列処理における最も基本的な設計パターンの1つ、スキャッター・ギャザーである。検索エンジンが複数のインデックスシャードへ同時に問い合わせを送り、返ってきた結果をマージしてランキングし直す処理や、MPI(Message Passing Interface)の`MPI_Scatter`/`MPI_Gather`のような集団通信プリミティブは、いずれもこのパターンの実例である。[MapReduce](/algorithms/mapreduce)がMap処理の後にキーに基づく「シャッフル(データの再配置)」を挟むのに対し、スキャッター・ギャザーはワーカー間の通信を必要としないシンプルな1往復(配布→独立処理→集約)である点が特徴的で、各ワーカーが互いに無関係に処理できる問題に適している。

## 仕組み

1. 中央のコーディネータ(または呼び出し元)が、入力データを複数のワーカーに分配できる単位に分割する(スキャッター)
2. 各断片を対応するワーカーに送信する。ワーカーはそれぞれ独立に(互いに通信することなく)自分に割り当てられた断片を処理する
3. 各ワーカーは処理結果をコーディネータに送り返す
4. コーディネータは全ワーカーからの結果が揃うのを待ち(ギャザー)、それらを1つの最終結果へ統合する(単純結合、マージ、集約演算など、統合方法は用途に依存する)
5. 一部のワーカーが遅延・失敗する場合に備えて、タイムアウトや部分結果での妥協(全ワーカーの応答を待たずに一定数が揃った時点で打ち切るなど)を組み込むこともある

## 特性・トレードオフ

- **計算量**: 理想的には`O(n/p)`(各ワーカーの処理時間)に、スキャッター・ギャザー自体の通信オーバーヘッド`O(p)`を加えたコストとしてモデル化できる
- **[MapReduce](/algorithms/mapreduce)との違い**: MapReduceは「Map→シャッフル→Reduce」という3段階を持ち、途中でキーに基づくデータの再分配(シャッフル)が発生するのに対し、スキャッター・ギャザーはワーカー間の通信を必要としないシンプルな1往復である。MapReduceよりも単純だが、ワーカー間でデータを再編成する必要がある問題には適用できない
- **耐障害性の必要性**: 分散環境では一部のワーカーが応答しない、遅い、失敗するといった状況が現実に起こるため、実務の実装では単純に「全員を待つ」だけでなく、タイムアウトや冗長化(同じ仕事を複数ワーカーに投げ、最初に返ってきた結果を使う)を組み込むことが多い
- **負荷分散**: 各断片のサイズが不均等だと、最も処理時間の長いワーカーがボトルネックになる([バリア同期](/algorithms/barrier-synchronization)や[BSPモデル](/algorithms/bulk-synchronous-parallel)のstraggler問題と同様の課題)
- **使いどころ**: MPIの集団通信プリミティブ、分散検索エンジンでの複数シャードへのクエリファンアウトと結果マージ、マイクロサービスアーキテクチャでの複数バックエンドへの並列問い合わせ集約、GPUプログラミングにおけるホスト・デバイス間のデータ分配

## 実装例

```python
from concurrent.futures import ThreadPoolExecutor
from collections import Counter


def _process_chunk(chunk: list[str]) -> Counter:
    return Counter(chunk)  # 各ワーカーは独立に、自分の断片だけを処理する


def scatter_gather_word_count(words: list[str], num_workers: int = 4) -> Counter:
    chunk_size = max(1, len(words) // num_workers)
    chunks = [words[i : i + chunk_size] for i in range(0, len(words), chunk_size)]

    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        # スキャッター: 各断片を独立したワーカーに配布して処理させる
        partial_counts = list(executor.map(_process_chunk, chunks))

    # ギャザー: 全ワーカーの結果を1つに集約する
    total = Counter()
    for partial in partial_counts:
        total.update(partial)
    return total
```

```typescript
function processChunk(chunk: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of chunk) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

async function scatterGatherWordCount(
  words: string[],
  numWorkers = 4,
): Promise<Map<string, number>> {
  const chunkSize = Math.max(1, Math.ceil(words.length / numWorkers));
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize));
  }

  // スキャッター: 各断片を独立に(並列に)処理させる
  const partialResults = await Promise.all(
    chunks.map((chunk) => Promise.resolve(processChunk(chunk))),
  );

  // ギャザー: 全ワーカーの結果を1つに集約する
  const total = new Map<string, number>();
  for (const partial of partialResults) {
    for (const [word, count] of partial) {
      total.set(word, (total.get(word) ?? 0) + count);
    }
  }
  return total;
}
```
