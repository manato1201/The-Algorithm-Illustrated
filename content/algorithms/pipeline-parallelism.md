---
name: パイプライン並列化(Pipeline Parallelism)
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(n/p + p)(定常状態でのスループット換算。nはデータ項目数、pはパイプラインの段数)
summary: 処理全体を複数の独立したステージに分割し、各ステージを別々のワーカーに固定的に割り当てて、複数のデータ項目をベルトコンベアのように段階的に流し込むことで、1項目あたりのレイテンシは変えずに全体のスループットを段数分だけ高める並列化パターン。
---

## 概要

工場の組み立てラインが、1台の完成品を作り終えてから次の部品の加工に取りかかるのではなく、各作業員が担当工程だけを繰り返しながら複数の製品を同時並行に流していくのと同じ発想が、パイプライン並列化である。処理全体をいくつかの独立したステージ(段階)に分割し、各ステージを専用のワーカーに固定的に割り当てる。データ項目を1つずつパイプラインへ投入すると、ステージ1がある項目の処理を終えて次のステージへ渡すと同時に、ステージ1自身は次の項目の処理へ取りかかれる——全ステージが同時に別々の項目を処理している「定常状態」に至れば、1項目を処理し終えるまでの時間(レイテンシ)は変わらないまま、単位時間あたりに処理できる項目数(スループット)がステージ数に応じて向上する。CPUの命令パイプライン(フェッチ・デコード・実行・書き戻し)はこの考え方をハードウェアレベルで実現した代表例である。

## 仕組み

1. 処理全体をk個の独立したステージに分割する。各ステージは前段の出力を入力として受け取り、次段への出力を生成する
2. 各ステージを専用のワーカー(スレッドまたはプロセッサ)に割り当て、ステージ間をキュー(バッファ)で接続する
3. データ項目を1つずつパイプラインに投入する。あるステージがある項目の処理を終えたら、その結果を次のステージへ渡すと同時に、自分は次の項目の処理に取りかかる
4. 複数の項目が異なるステージで同時に処理されている定常状態に達すると、パイプライン全体のスループットが最大化される(最も処理時間の長いステージがボトルネックになる)
5. 最後のステージから出力された項目が、全処理を終えた最終結果として得られる

## 特性・トレードオフ

- **計算量とスループット**: 定常状態では1項目あたりの処理時間(レイテンシ)は変わらないが、複数項目を同時に流し込めるためスループットが向上する。理想的には`O(n/p + p)`(nは項目数、後半のpはパイプラインを満たすまでの立ち上がりコスト)で近似できる
- **ボトルネックステージへの依存**: パイプライン全体のスループットは、最も処理時間の長いステージによって制約される。ステージ間の作業量が不均衡だと理論上の性能が得られず、ステージ分割の設計そのものが性能を左右する
- **データ並列化との違い**: データ並列化は「同じ処理を異なるデータに対して同時に適用する」のに対し、パイプライン並列化は「異なる処理(ステージ)を異なるデータに対して同時に適用する」——両者は組み合わせて使われることも多い(各ステージ内部をさらにデータ並列化するなど)
- **バッファリングとバックプレッシャー**: ステージ間の処理速度の差を吸収するためにキューを挟むのが一般的だが、あるステージが詰まると後続のバッファが溢れる(バックプレッシャー)問題への対処が必要になる
- **使いどころ**: CPUの命令パイプライン、GPUのグラフィックスパイプライン、動画・画像処理のストリーミング処理、Unixのシェルパイプでつながれたコマンドチェーン、Apache Kafkaのようなストリーム処理基盤、コンパイラの多段階処理(字句解析→構文解析→コード生成)

## 実装例

```python
import threading
import queue

_SENTINEL = object()


def _make_stage(input_q: queue.Queue, output_q: queue.Queue, func) -> threading.Thread:
    def worker() -> None:
        while True:
            item = input_q.get()
            if item is _SENTINEL:
                output_q.put(_SENTINEL)
                return
            output_q.put(func(item))

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    return t


def run_pipeline(data: list[int], stages: list) -> list[int]:
    queues = [queue.Queue() for _ in range(len(stages) + 1)]
    for item in data:
        queues[0].put(item)
    queues[0].put(_SENTINEL)

    threads = [_make_stage(queues[i], queues[i + 1], stages[i]) for i in range(len(stages))]

    results = []
    while True:
        item = queues[-1].get()
        if item is _SENTINEL:
            break
        results.append(item)
    for t in threads:
        t.join()
    return results
```

```typescript
type Stage<In, Out> = (input: In) => Out;

async function* runStage<In, Out>(
  source: AsyncIterable<In>,
  fn: Stage<In, Out>,
): AsyncGenerator<Out> {
  for await (const item of source) {
    yield fn(item); // 実際には他ステージと並行に実行されるが、ここでは処理の連鎖構造を表現する
  }
}

async function runPipeline<T>(
  data: T[],
  stages: Array<Stage<any, any>>,
): Promise<any[]> {
  async function* sourceGen() {
    for (const item of data) yield item;
  }

  let stream: AsyncIterable<any> = sourceGen();
  for (const stage of stages) {
    stream = runStage(stream, stage);
  }

  const results: any[] = [];
  for await (const item of stream) {
    results.push(item);
  }
  return results;
}
```
