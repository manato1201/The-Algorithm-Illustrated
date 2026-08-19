---
name: Sagaパターンによる分散トランザクション
category: 分散システム
subcategory: 合意形成
complexity: O(トランザクションのステップ数)
summary: 長時間ロックを保持する2相コミットの代わりに、一連のローカルトランザクションを順に実行し、途中で失敗したら既に成功した分を補償トランザクションで逆順に打ち消すことで結果整合性を保つ分散トランザクション管理パターン。
---

## 概要

[2相コミット](/algorithms/two-phase-commit)は複数のデータベースにまたがる操作の原子性を厳密に保証する一方、コーディネーターが「コミットせよ」と指示するまで全参加者がロックを保持し続けるため、トランザクションが長時間に及ぶマイクロサービス環境では可用性・スループットを大きく損なう。Sagaパターンは1987年に(単一の巨大なデータベーストランザクションの代替として)提案された考え方で、1つの分散トランザクションを「それぞれが独立にコミットできる、一連の小さなローカルトランザクション」に分解する。途中のどこかのステップが失敗したら、既に成功したステップを逆順に取り消す「補償トランザクション(compensating transaction)」を実行することで、全体として一貫した(結果整合性のある)状態に戻す。

## 仕組み

1. 1つの分散トランザクションを`T1, T2, ..., Tn`という一連のローカルトランザクションに分解する。各`Ti`は1つのサービス・1つのデータベース内で完結し、実行した瞬間にコミットされる(2相コミットのようにロックを保持したまま他ステップの完了を待つことはない)
2. 各`Ti`には、それを打ち消すための補償トランザクション`Ci`をあらかじめ用意しておく(例: 「在庫を1つ減らす」の補償は「在庫を1つ増やす」、「決済する」の補償は「返金する」)
3. `T1`から順に実行していく。各`Ti`が成功したら次の`T(i+1)`に進む
4. どこかの`Tk`が失敗したら、そこまでに成功した`T(k-1), T(k-2), ..., T1`に対応する補償トランザクション`C(k-1), C(k-2), ..., C1`を**逆順に**実行し、システム全体を(擬似的に)トランザクション開始前の状態に戻す
5. 実行順序の制御方式には大きく2種類ある: **オーケストレーション**(中央の調整役が各ステップの呼び出しと失敗時の補償を一元的に指揮する)と、**コレオグラフィ**(中央の調整役を置かず、各サービスがイベントを発行・購読し合って自律的に次のステップや補償を実行する)

## 特性・トレードオフ

- **計算量**: ステップ数`n`に対して`O(n)`のローカルトランザクション実行(失敗時はさらに最大`O(n)`の補償実行が追加される)
- **[2相コミット](/algorithms/two-phase-commit)とのロック保持時間・可用性のトレードオフ**: 2相コミットは「全参加者の合意が取れるまでロックを保持し続ける」ことで強い原子性を得る代わりに、コーディネーター障害時にはロックを持ったまま参加者がブロックされてしまう。Sagaは各ローカルトランザクションを即座にコミットしてロックを解放するため、個々のサービスは常に他の操作を受け付け続けられて可用性が高いが、その代償として「途中経過が一時的に他から観測可能になる」(例: 補償される前の在庫減少が一瞬見えてしまう)という、結果整合性特有の弱い保証しか得られない
- **補償トランザクション設計の難しさという代償**: 全ての操作に「意味のある取り消し操作」を用意できるとは限らない(例: 一度送信した確認メールは取り消せない、外部決済APIへの返金には手数料や遅延が発生する)。補償が必ずしも完全な巻き戻しにならない点への配慮がアプリケーション側の設計に要求される
- **使いどころ**: マイクロサービスアーキテクチャにおける複数サービスをまたがるビジネスプロセス(ECサイトの注文処理: 在庫確保→決済→配送手配、旅行予約の航空券+ホテル+レンタカーの一括予約など)、長時間実行されるワークフロー(Temporal, AWS Step Functionsのようなワークフローオーケストレーションエンジンの典型的な適用対象)

## 実装例

各ステップの実行関数(action)と補償関数(compensate)を組にして登録し、オーケストレーション方式で順に実行、失敗時は完了済みステップを逆順に補償するシミュレーション実装。

```python
from dataclasses import dataclass
from typing import Callable


@dataclass
class SagaStep:
    name: str
    action: Callable[[], bool]  # 成功すれば True を返すローカルトランザクション
    compensate: Callable[[], None]  # 打ち消すための補償トランザクション


class SagaOrchestrator:
    def __init__(self, steps: list[SagaStep]):
        self.steps = steps

    def run(self) -> tuple[bool, list[str]]:
        completed: list[SagaStep] = []
        log: list[str] = []

        for step in self.steps:
            ok = step.action()
            if ok:
                log.append(f"COMMIT {step.name}")
                completed.append(step)
            else:
                log.append(f"FAILED {step.name}")
                # 既に成功したステップを逆順に補償する
                for done in reversed(completed):
                    done.compensate()
                    log.append(f"COMPENSATE {done.name}")
                return False, log

        return True, log
```

```typescript
interface SagaStep {
  name: string;
  action: () => boolean; // 成功すれば true を返すローカルトランザクション
  compensate: () => void; // 打ち消すための補償トランザクション
}

class SagaOrchestrator {
  constructor(private steps: SagaStep[]) {}

  run(): { success: boolean; log: string[] } {
    const completed: SagaStep[] = [];
    const log: string[] = [];

    for (const step of this.steps) {
      const ok = step.action();
      if (ok) {
        log.push(`COMMIT ${step.name}`);
        completed.push(step);
      } else {
        log.push(`FAILED ${step.name}`);
        // 既に成功したステップを逆順に補償する
        for (let i = completed.length - 1; i >= 0; i--) {
          completed[i].compensate();
          log.push(`COMPENSATE ${completed[i].name}`);
        }
        return { success: false, log };
      }
    }

    return { success: true, log };
  }
}
```
