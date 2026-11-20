---
name: PBFT(実用的ビザンチン障害耐性)
category: 分散システム
subcategory: 合意形成
complexity: 1回の合意あたり O(n²) メッセージ(nはレプリカ数)
summary: 嘘をつく・矛盾した返答をするといった悪意ある故障(ビザンチン障害)を含む最大 f 台が混じっていても、3f+1 台のうち残りの正直な台数で合意を保つ状態機械複製のプロトコル。
---

## 概要

[Paxos](/algorithms/paxos)や[Raft](/algorithms/raft)は、サーバーが止まる(クラッシュする)ことには耐えるが、**サーバーが嘘をつく**ことは想定していない。実際の故障には、ソフトウェアのバグで間違った値を返す、乗っ取られて意図的に矛盾した情報を送る、といったものがある。このような任意の振る舞いをする故障をビザンチン障害と呼ぶ(ビザンチン将軍問題に由来)。

ビザンチン障害に耐える合意の理論的な解は、1980年代から知られていたが、実用的な速度のものがなかった。Miguel CastroとBarbara Liskovが1999年(OSDI)に発表したPBFT(Practical Byzantine Fault Tolerance)は、**非同期のネットワークでも安全性を保ち、現実的な処理速度で動く**最初期のビザンチン耐性プロトコルとして、その後のコンソーシアム型ブロックチェーンの合意(Hyperledger Fabricの初期版での採用や、Tendermintなどの設計への影響)に大きな足跡を残した。

## 仕組み

`n = 3f + 1` 台のレプリカ(サーバー)があれば、`f` 台までのビザンチン故障に耐える。レプリカのうち1台が**主(primary)**、残りが**副(backup)**。クライアントは要求を主に送る。

1. **pre-prepare**: 主が要求に順序番号を付け、「番号 `s` はこの要求」という提案を全副に送る
2. **prepare**: 提案を受けた副は、その内容に同意する意思表示 prepare を、**全レプリカに**送る。あるレプリカが「提案 + 異なるレプリカからの一致する prepare を `2f` 個」集めたとき、その順序で要求を並べることに多数が同意したと判断する(prepared)。この段階で、正直なレプリカの間で、同じ番号に別の要求が prepared になることがない
3. **commit**: prepared になったレプリカは、commit を全レプリカに送る。`2f + 1` 個の一致する commit を集めたら committed となり、要求を実行して結果をクライアントに返す。正直なレプリカの中で、あるレプリカだけが committed になる状況でも、残りが追いつけることを保証するのがこの段階の役割
4. クライアントは、`f + 1` 個の同じ応答を受け取ったら、それを正しい結果として採用する(嘘をつけるのは最大 `f` 台だから)
5. **ビュー変更**: 主が応答しない、または不正な振る舞いをした場合、副が投票して新しい主に交代する。未完了の要求を引き継ぐ手順が、プロトコルの最も複雑な部分

## 特性・トレードオフ

- **耐えられる数**: `n ≥ 3f + 1` が必要十分。たとえば4台で1台の悪意を許す。故障を `f` 台と見込むなら、`3f + 1` 台のレプリカを用意する
- **通信量 O(n²)**: prepare と commit が全対全の通信なので、台数が増えるとメッセージ数が2乗で増える。数十台が実用的な上限で、数百台以上には向かない(そのため後続の研究で通信を減らす改良が多く提案された)
- **安全性と活性**: ネットワークが非同期でも、(正直なレプリカが過半数いる限り)**間違った結果に合意することはない**(安全性)。一方、合意が進む(活性)には、ある程度ネットワークが安定している(部分同期)ことを仮定する
- **メッセージの認証**: 署名または認証コード(MAC)でメッセージの改ざんと成りすましを防ぐ。暗号の計算コストも性能に響く
- **使いどころ**: 参加者が互いに完全には信頼できない場合(コンソーシアム型ブロックチェーン、複数組織が共同運営するシステム)、ミッションクリティカルな制御系。単一の組織が管理するデータセンター内では、クラッシュ故障だけを想定したRaftで十分なことが多い

## 実装例

```python
def pbft_round(n, f, value, byzantine=frozenset(), primary=0):
    """1回の合意を、全員が全員にメッセージを送る同期モデルで数え上げる(通信路・署名・ビュー変更は省略)。
    byzantine に含まれるレプリカは、正しい値と異なる値 "X" を送る。"""
    replicas = range(n)
    honest = [i for i in replicas if i not in byzantine]

    # pre-prepare: 主が全副へ提案(主が不正なら、ここで割れる。この例では主は正直と仮定)
    proposal = {i: value for i in replicas if i != primary}

    # prepare: 副が全員へ送る(不正なレプリカは別の値を送る)
    prepares = {i: [] for i in replicas}          # i が受け取った (送信者, 値)
    for sender in replicas:
        if sender == primary:
            continue
        v = "X" if sender in byzantine else proposal[sender]
        for receiver in replicas:
            prepares[receiver].append((sender, v))

    # prepared: 提案 + 2f 個の一致する prepare
    prepared = {i for i in honest
                if len({s for s, v in prepares[i] if v == value}) >= 2 * f and (i == primary or proposal[i] == value)}

    # commit: prepared のレプリカが全員へ送る(不正なレプリカは別の値)
    commits = {i: [] for i in replicas}
    for sender in replicas:
        if sender in byzantine:
            for receiver in replicas:
                commits[receiver].append((sender, "X"))
        elif sender in prepared:
            for receiver in replicas:
                commits[receiver].append((sender, value))

    # committed: 2f+1 個の一致する commit
    return {i for i in honest if len({s for s, v in commits[i] if v == value}) >= 2 * f + 1}


print(pbft_round(4, 1, "A", byzantine={3}))      # {0, 1, 2} 全ての正直なレプリカが合意する
print(pbft_round(4, 1, "A", byzantine={2, 3}))   # set() f を超える故障では合意できない
```

```typescript
function pbftRound(n: number, f: number, value: string, byzantine: Set<number>, primary = 0): number[] {
  const replicas = Array.from({ length: n }, (_, i) => i);
  const honest = replicas.filter((i) => !byzantine.has(i));

  // prepare: 副が全員へ送る(不正なレプリカは別の値 "X")
  const prepares = new Map<number, [number, string][]>(replicas.map((i) => [i, []]));
  for (const sender of replicas) {
    if (sender === primary) continue;
    const v = byzantine.has(sender) ? "X" : value;
    for (const receiver of replicas) prepares.get(receiver)!.push([sender, v]);
  }
  const prepared = new Set(
    honest.filter((i) => new Set(prepares.get(i)!.filter(([, v]) => v === value).map(([s]) => s)).size >= 2 * f),
  );

  // commit: prepared のレプリカが全員へ送る
  const commits = new Map<number, [number, string][]>(replicas.map((i) => [i, []]));
  for (const sender of replicas) {
    if (byzantine.has(sender)) for (const r of replicas) commits.get(r)!.push([sender, "X"]);
    else if (prepared.has(sender)) for (const r of replicas) commits.get(r)!.push([sender, value]);
  }
  return honest.filter((i) => new Set(commits.get(i)!.filter(([, v]) => v === value).map(([s]) => s)).size >= 2 * f + 1);
}

console.log(pbftRound(4, 1, "A", new Set([3]))); // [0, 1, 2]
console.log(pbftRound(4, 1, "A", new Set([2, 3]))); // []
```
