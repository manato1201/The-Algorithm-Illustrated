---
name: バリア同期(Barrier Synchronization)
category: 並行処理・並列アルゴリズム
subcategory: 同期・相互排他
complexity: O(n)(n=参加スレッド数、集中カウンタ方式の場合)
summary: 複数のスレッドが「全員がこの地点に到達するまで、誰もその先へは進めない」という関所(バリア)を共有することで、並列処理の各フェーズの境界をそろえる同期プリミティブ。
---

## 概要

反復計算を複数のスレッドで並列に進める場合、各イテレーションの結果を次のイテレーションで使う前に、全スレッドが現在のイテレーションを終えていることを保証したい場面が多い。バリア同期は、このような「フェーズの境界」をスレッド間で共有するための基本的な同期プリミティブである。あるスレッドがバリアに到達すると、そのスレッドは他の全参加者が同じバリアに到達するまで待機する。最後の1人が到達した瞬間に、待っていた全員が一斉に解放され、次のフェーズへ進む。[BSPモデル](/algorithms/bulk-synchronous-parallel)の各スーパーステップの境界を実現する基盤技術がまさにバリア同期であり、「計算フェーズ」と「次の計算フェーズ」の間に安全な区切りを作る役割を果たす。

## 仕組み

1. 共有のカウンタ`count`を0で初期化し、参加者数`n`をあらかじめ固定する
2. 各スレッドがバリアに到達するたびに`count`をアトミックにインクリメントする
3. 自分がちょうど`n`番目(最後)の到達者であれば、`count`をリセットして他の全待機スレッドを解放する
4. そうでなければ、自分の「世代」のバリアが解放されるまで待機する
5. バリアを繰り返し再利用できるようにするため、「世代(generation)」番号を導入する。世代が変わったことをもって「このラウンドのバリアは解放済み」と判定し、次のラウンドの到達者と衝突しないようにする(センスリバーシングバリアの発想)

## 特性・トレードオフ

- **計算量**: 単純な集中カウンタ方式では通知・待機のコストがO(n)相当になる。ツリー構造でカウンタの更新・通知を分散させるツリーバリアなどの実装では、O(log n)まで改善できる
- **[BSPモデル](/algorithms/bulk-synchronous-parallel)との関係**: BSPの各スーパーステップの終わりに全メッセージの到達を保証する仕組みは、本質的にバリア同期そのものである
- **遅いスレッド問題**: 1つでも遅いスレッドがいれば、他の全員がそれを待つことになるため、負荷が不均衡だとスループットが大きく低下する(BSPのstraggler問題と同種の弱点)
- **再利用性への配慮**: 世代カウンタを持たない素朴な実装では、全員解放後にカウンタをリセットするタイミングで、次のラウンドの到達者と衝突するレースコンディションが起こりうる。世代カウンタはこれを構造的に防ぐ
- **使いどころ**: OpenMPの`#pragma omp barrier`、CUDAの`__syncthreads()`、[フォーク・ジョインモデル](/algorithms/fork-join-model)における複数ラウンドの反復処理、マルチスレッドの反復アルゴリズムでイテレーション境界を揃える場面全般

## 実装例

```python
import threading


class Barrier:
    def __init__(self, parties: int) -> None:
        self._parties = parties
        self._count = 0
        self._generation = 0
        self._cond = threading.Condition()

    def wait(self) -> None:
        with self._cond:
            gen = self._generation
            self._count += 1
            if self._count == self._parties:
                # 最後の到達者: 全員を解放し、次の世代へ進める
                self._count = 0
                self._generation += 1
                self._cond.notify_all()
            else:
                while gen == self._generation:
                    self._cond.wait()
```

```typescript
class Barrier {
  private count = 0;
  private generation = 0;
  private waiters: Array<() => void> = [];

  constructor(private readonly parties: number) {}

  // 到達を通知し、全員そろったらonReleaseが(自分を含め)全参加者に対して呼ばれる
  arrive(onRelease: () => void): void {
    this.count++;
    if (this.count === this.parties) {
      // 最後の到達者: 全員を解放し、次の世代へ進める
      this.count = 0;
      this.generation++;
      const toRelease = this.waiters;
      this.waiters = [];
      onRelease();
      toRelease.forEach((cb) => cb());
    } else {
      this.waiters.push(onRelease);
    }
  }
}
```
