---
name: フォーク・ジョインモデル(Fork-Join Model)
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(T1/p + T∞)(ワークスティーリングを用いた場合。T1=総仕事量、T∞=クリティカルパス長、p=プロセッサ数)
summary: 1つのタスクを「フォーク(再帰的に複数の部分タスクへ分割)」し、それぞれを並列実行した後に「ジョイン(結果を合流・統合)」するという2操作の組み合わせだけで、分割統治アルゴリズムを自然に並列化できる計算モデル。
---

## 概要

分割統治法(マージソートやクイックソートなど)は、問題をより小さな部分問題に再帰的に分割し、それぞれを解いてから結果を統合するという構造を持つ。この構造は、部分問題どうしが互いに依存しないという性質から、本質的に並列実行と相性がよい。フォーク・ジョインモデルは、この考え方をそのまま並列プログラミングのAPIに落とし込んだもので、「fork」で新しい並列タスクを生成し、「join」でそのタスクの完了と結果を待ち合わせるという、2つの単純な操作だけでスケーラブルな並列アルゴリズムを記述できるようにする。[ワークスティーリングスケジューラ](/algorithms/work-stealing-scheduler)は、このモデルで生成される大量の細粒度タスクを効率よくプロセッサへ割り当てるための、事実上標準的なスケジューリング機構になっている。JavaのFork/Joinフレームワークや、多くの言語の`parallel_invoke`系APIの理論的基盤である。

## 仕組み

1. 問題が十分小さければ(基底ケース)、そのまま逐次的に解く
2. そうでなければ、問題を2つ以上の独立した部分問題に分割し、それぞれを新しい並列タスクとして「フォーク」する
3. フォークされた各タスクは再帰的に同じ手順(基底ケースなら逐次実行、そうでなければさらにフォーク)を繰り返す
4. フォークした全ての子タスクの完了を「ジョイン」で待ち合わせる
5. 子タスクの結果を統合(マージ、合計など)して、自分の呼び出し元に結果を返す

## 特性・トレードオフ

- **理論的な実行時間**: グリーディスケジューラのもとでの期待実行時間は`O(T1/p + T∞)`で近似できる(T1は逐次実行した場合の総仕事量、T∞は依存関係の連鎖で決まる最長のクリティカルパス長、pはプロセッサ数)。並列度が仕事量に対して十分あれば、実行時間はほぼ`T1/p`に近づく
- **粒度の設計が性能を左右する**: フォークの分割を基底ケースまで無限に細かくすると、タスク生成・スケジューリングのオーバーヘッドが計算そのものを上回ってしまう。実務では「一定サイズ以下になったら逐次実行に切り替える」という閾値(カットオフ)を設けるのが定石になっている
- **[ワークスティーリングスケジューラ](/algorithms/work-stealing-scheduler)との関係**: フォーク・ジョインで大量に生成される細粒度タスクを、各プロセッサへ動的かつ負荷分散よく割り当てる仕組みとして、ワークスティーリングが事実上の標準的な実装になっている
- **他の並列パターンの骨格**: [parallel-reduce](/algorithms/parallel-reduce)や[parallel-quicksort](/algorithms/parallel-quicksort)、[parallel-merge-sort](/algorithms/parallel-merge-sort)など、多くの並列アルゴリズムパターンの共通の骨格になっている汎用的なモデルである
- **使いどころ**: Javaの`ForkJoinPool`/`RecursiveTask`、C++の`cilk_spawn`/`cilk_sync`、.NETの`Parallel.Invoke`、Rustの`rayon::join`。分割統治的に表現できる並列アルゴリズム全般

## 実装例

```python
from concurrent.futures import ThreadPoolExecutor

THRESHOLD = 1000


def fork_join_sum(arr: list[int], executor: ThreadPoolExecutor) -> int:
    if len(arr) <= THRESHOLD:
        return sum(arr)  # 基底ケース: 逐次実行に切り替える
    mid = len(arr) // 2
    left_future = executor.submit(fork_join_sum, arr[:mid], executor)  # フォーク
    right_result = fork_join_sum(arr[mid:], executor)  # 自スレッドは右半分を担当
    left_result = left_future.result()  # ジョイン: 左側の完了を待つ
    return left_result + right_result


def parallel_sum(arr: list[int]) -> int:
    with ThreadPoolExecutor() as executor:
        return fork_join_sum(arr, executor)
```

```typescript
const THRESHOLD = 1000;

async function forkJoinSum(arr: number[]): Promise<number> {
  if (arr.length <= THRESHOLD) {
    return arr.reduce((a, b) => a + b, 0); // 基底ケース: 逐次実行に切り替える
  }
  const mid = Math.floor(arr.length / 2);
  const leftTask = forkJoinSum(arr.slice(0, mid)); // フォーク
  const rightTask = forkJoinSum(arr.slice(mid)); // フォーク
  const [leftResult, rightResult] = await Promise.all([leftTask, rightTask]); // ジョイン
  return leftResult + rightResult;
}
```
