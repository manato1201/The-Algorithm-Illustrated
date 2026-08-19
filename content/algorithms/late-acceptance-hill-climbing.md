---
name: 遅延受理山登り法(Late Acceptance Hill Climbing)
category: 最適化・確率的手法
subcategory: 局所探索
complexity: O(問題依存、履歴バッファの管理はO(1))
summary: 現在の解を直前の解ではなくLステップ前の解の評価値と比較して改善または同等なら受理する、パラメータ調整が少なく実装が単純なメタヒューリスティック。
---

## 概要

[山登り法](/algorithms/hill-climbing)は「現在の解より良い候補だけを受理する」という単純な戦略のために局所最適に容易に陥る。[焼きなまし法](/algorithms/simulated-annealing)はこれを「温度」というパラメータで確率的に悪化を受け入れることで解決するが、冷却スケジュールの設計に手間がかかる。遅延受理山登り法(Late Acceptance Hill Climbing、LAHC)は2008年頃にエドマンド・バークとイェンド・バイコフによって提案された手法で、**受理判定の基準を「直前の解」ではなく「Lステップ前の解」に置き換える**という一点だけで局所最適からの脱出力を得る。具体的には、過去`L`回分の評価値を記録するリングバッファ(履歴)を持ち、新しい候補解を「1つ前の解」ではなく「`L`ステップ前に見ていた解」の評価値と比較し、それを上回るか同等であれば受理する。温度・冷却スケジュール・確率分布といったパラメータ設計が一切不要で、実質的に調整すべきパラメータが履歴長`L`ただ1つしかないという単純さが最大の特徴であり、実装が容易で他のメタヒューリスティックへの導入コストが低い。

## 仕組み

1. 初期解を1つ用意し、その評価値を長さ`L`の履歴バッファ`f[0], f[1], ..., f[L-1]`全てに初期値として格納する
2. 反復カウンタ`i`を0から始める
3. 現在の解の近傍から候補解を1つ生成し、その評価値`candidate_value`を計算する
4. `candidate_value`を、履歴バッファの`i mod L`番目に格納されている値`f[i mod L]`(これは「`L`ステップ前の解」の評価値に相当する)と比較する。**`candidate_value`が`f[i mod L]`以上に良い(または同等)なら候補解を受理**し、現在の解を更新する。そうでなければ棄却し、現在の解はそのまま維持する
5. 履歴バッファの`i mod L`番目を、**受理されたかどうかに関わらず**現在の解の評価値で更新する(これにより履歴は常に「直近`L`ステップの評価値の推移」を保持し続ける)
6. `i`を1つ増やし、終了条件(反復回数の上限や十分な収束)を満たすまで3〜5を繰り返す
7. 探索中に見つかった最良の解を別途記録しておき、それを最終的な出力とする

`L=1`の場合、履歴バッファは常に「直前の解の評価値」だけを保持することになり、これは通常の[山登り法](/algorithms/hill-climbing)と完全に一致する。`L`を大きくするほど「少し前の(今より悪かったかもしれない)水準」との比較になるため、一時的な悪化を伴う移動も受理されやすくなり、局所最適から抜け出す余地が広がる。

## 特性・トレードオフ

- **[焼きなまし法](/algorithms/simulated-annealing)との受理基準の違い**: 焼きなまし法は「悪化幅」と「温度」から計算される**確率**(`exp(-悪化幅/温度)`)に基づいて確率的に悪化を受理するのに対し、遅延受理山登り法は「`L`ステップ前の評価値」という**決定的な基準値**と比較するだけで、確率計算も温度スケジュールも一切必要としない。乱数を使う箇所は近傍候補の生成にのみ限定され、受理判定自体は決定的である
- **パラメータが履歴長`L`の1つだけ**: 焼きなまし法の冷却スケジュール(初期温度・冷却率・停止温度)や、[タブーサーチ](/algorithms/tabu-search)のタブー期間・アスピレーション基準といった複数パラメータの調整に比べ、調整すべきものが`L`のみと少なく、実務上のチューニングコストが低い。ただし`L`が小さすぎると山登り法に近づき局所最適に陥りやすく、大きすぎると悪化した解を受理し続けて収束が遅れるため、`L`の選定自体は依然として経験的な調整が必要になる
- **実装の単純さ**: 固定長の配列(リングバッファ)を1つ追加するだけで既存の山登り法の実装を拡張できるため、他の局所探索アルゴリズムへの組み込みが容易であり、スケジューリング問題のコンペティション(車両配送、ナーススケジューリングなど)でも高い実用性が報告されている
- **[タブーサーチ](/algorithms/tabu-search)との違い**: タブーサーチが「直近に訪れた状態・操作」そのものを禁止リストで管理するのに対し、遅延受理山登り法は状態そのものではなく「過去の評価値の水準」だけを履歴として保持する。状態空間の構造(近傍の逆操作など)を意識せずに済む分、実装がより軽量になる
- **使いどころ**: スケジューリング問題(ナーススケジューリング、車両配送計画、授業時間割編成など)、焼きなまし法のパラメータ調整が難しい・時間をかけられない状況での代替、他のメタヒューリスティックの受理戦略部分だけを差し替える軽量な改良として

## 実装例

[山登り法](/algorithms/hill-climbing)・[焼きなまし法](/algorithms/simulated-annealing)・[タブーサーチ](/algorithms/tabu-search)と同じ地形`f(x) = -(x-3)^2 + 10`を対象に、整数の近傍(x±1)を動きながら、履歴バッファに基づいて受理を判定する例で実装する。

```python
def objective(x: int) -> float:
    return -((x - 3) ** 2) + 10


def late_acceptance_hill_climbing(
    start_x: int,
    history_length: int = 5,
    neighborhood_range: int = 1,
    max_iterations: int = 200,
) -> int:
    current_x = start_x
    current_value = objective(current_x)
    best_x = current_x
    best_value = current_value

    # 履歴バッファを現在の評価値で初期化する
    history = [current_value] * history_length

    for i in range(max_iterations):
        deltas = [d for d in range(-neighborhood_range, neighborhood_range + 1) if d != 0]
        candidate_x = current_x + deltas[i % len(deltas)]
        candidate_value = objective(candidate_x)

        # Lステップ前の評価値と比較する(直前の解とは比較しない点が山登り法との違い)
        reference_value = history[i % history_length]
        if candidate_value >= reference_value:
            current_x = candidate_x
            current_value = candidate_value
            if current_value > best_value:
                best_x, best_value = current_x, current_value

        # 受理されたかどうかに関わらず、履歴バッファは現在の評価値で更新する
        history[i % history_length] = current_value

    return best_x
```

```typescript
function objective(x: number): number {
  return -((x - 3) ** 2) + 10;
}

function lateAcceptanceHillClimbing(
  startX: number,
  historyLength = 5,
  neighborhoodRange = 1,
  maxIterations = 200,
): number {
  let currentX = startX;
  let currentValue = objective(currentX);
  let bestX = currentX;
  let bestValue = currentValue;

  // 履歴バッファを現在の評価値で初期化する
  const history: number[] = new Array(historyLength).fill(currentValue);

  const deltas: number[] = [];
  for (let d = -neighborhoodRange; d <= neighborhoodRange; d++)
    if (d !== 0) deltas.push(d);

  for (let i = 0; i < maxIterations; i++) {
    const candidateX = currentX + deltas[i % deltas.length];
    const candidateValue = objective(candidateX);

    // Lステップ前の評価値と比較する(直前の解とは比較しない点が山登り法との違い)
    const referenceValue = history[i % historyLength];
    if (candidateValue >= referenceValue) {
      currentX = candidateX;
      currentValue = candidateValue;
      if (currentValue > bestValue) {
        bestX = currentX;
        bestValue = currentValue;
      }
    }

    // 受理されたかどうかに関わらず、履歴バッファは現在の評価値で更新する
    history[i % historyLength] = currentValue;
  }

  return bestX;
}
```
