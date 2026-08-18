---
name: しっぺ返し戦略(繰り返し囚人のジレンマ)
category: ゲーム
subcategory: 数理ゲーム理論
complexity: O(1)(1手あたり)
summary: 初手は協調し、以降は相手の直前の手をそのまま真似るだけの単純な戦略が、繰り返し囚人のジレンマのコンピュータトーナメントで最も高い成績を収め続けたことで知られる研究。
---

## 概要

1回限りの[囚人のジレンマ](/algorithms/nash-equilibrium)では、相手がどう出ようと自分は裏切った方が得なため、両者とも裏切り合う「相互裏切り」が唯一の[ナッシュ均衡](/algorithms/nash-equilibrium)になる——たとえ協調し合った方が双方にとって望ましくても、それは実現しない。しかし同じ相手と何度も繰り返しゲームをプレイする場合、話は変わる。「今裏切れば、次回以降ずっと相手から報復される」という**未来の影(shadow of the future)**が生まれ、協調が合理的になりうる。1980年、政治学者ロバート・アクセルロッドが「繰り返し囚人のジレンマ」の総当たりコンピュータトーナメントを開催し、世界中の研究者から寄せられた洗練された戦略群を抑えて、「初手は協調し、以降は相手が直前に取った手をそのまま真似るだけ」という極めてシンプルな**しっぺ返し(Tit-for-Tat)戦略**が最高の成績を収めたことで、ゲーム理論・進化生物学の両分野に大きな影響を与えた。

## 仕組み

1. 同じ2人のプレイヤーが、囚人のジレンマ(協調し合えば双方それなり、裏切り合えば双方微妙、片方だけ裏切れば裏切った側が最大の得をする利得構造)を、終了回数が不確定な状態で何度も繰り返しプレイする(繰り返し回数が事前に確定・共有知識だと、最終回から逆算する後ろ向き帰納法によって協調が崩れてしまうため、この「未来が不確定であること」は理論上重要な前提になる)
2. しっぺ返し戦略のルールはただ2つ: (a) 初手では必ず協調する、(b) 2手目以降は、直前の対戦で相手が取った手をそのまま自分の手として選ぶ
3. アクセルロッドのトーナメントで、しっぺ返しをはじめとする上位戦略に共通していた性質が分析された: **上品さ**(自分から先に裏切らない)、**報復性**(裏切られたら即座に報復する)、**寛容さ**(相手が協調に戻ればすぐ自分も協調に戻り、恨みを引きずらない)、**わかりやすさ**(単純で相手にも予測しやすく、結果として相手も協調するインセンティブを持ちやすい)
4. これらの性質を全て備えた戦略が、長期的な繰り返し対戦において高い平均利得を安定して稼ぐことをトーナメント結果が示した

## 特性・トレードオフ

- **「未来の影」の必要性**: しっぺ返しが機能するのは、ゲームがいつまで続くか分からない(または十分に高い確率で継続する)という前提があってこそである。繰り返し回数が確定していて双方に既知の場合、最終回には報復を恐れる理由がなくなるため裏切りが合理的になり、それを見越して最終回の1つ前も裏切りが合理的になり……と後ろ向きに崩れていき、結局初回から協調が成立しなくなる(後ろ向き帰納法によるアンラベリング)
- **ノイズへの弱さ**: 通信の誤りや誤解によって「協調したつもりが裏切りと誤認識される」ノイズが混入する環境では、しっぺ返し同士が一度の誤解をきっかけに報復の連鎖に陥り、抜け出せなくなる弱点がある(エコー効果)。これを緩和するため、一定確率で相手の裏切りを見逃す「寛容なしっぺ返し(Generous Tit-for-Tat)」や、直前の自分の手と結果が良ければ継続・悪ければ変更する「パブロフ戦略(Win-Stay, Lose-Shift)」といった改良版が提案されている
- **[進化的に安定な戦略(ESS)](/algorithms/evolutionary-stable-strategy)との関係**: アクセルロッドはウィリアム・ハミルトンとの共同研究で、しっぺ返しが優勢な集団に「常に裏切る」戦略の変異体が侵入しても、未来の影が十分強ければ増殖できないことを示した——これは進化ゲーム理論における[ESS](/algorithms/evolutionary-stable-strategy)の考え方と直結しており、「互恵的な協力は、意図的な道徳観念なしに、単なる繰り返しの構造だけから進化的に安定して立ち上がりうる」という進化生物学上の重要な知見(互恵的利他主義)につながった
- **使いどころ**: 国家間の貿易・軍縮交渉のモデル化、生物における互恵的利他行動(血縁関係のない個体同士の協力)の説明、マルチエージェント強化学習における協調行動のベースライン戦略、繰り返し取引・オークションにおけるエージェント設計の指針

## 実装例

```python
from enum import Enum


class Move(Enum):
    COOPERATE = "C"
    DEFECT = "D"


class TitForTat:
    """しっぺ返し戦略: 初手は協調、以降は相手の直前の手をそのまま真似る"""

    def __init__(self) -> None:
        self.opponent_last_move: Move | None = None

    def next_move(self) -> Move:
        if self.opponent_last_move is None:
            return Move.COOPERATE
        return self.opponent_last_move

    def observe(self, opponent_move: Move) -> None:
        self.opponent_last_move = opponent_move


class AlwaysDefect:
    """常に裏切る戦略。しっぺ返しの「報復性」を確認するための比較対象"""

    def next_move(self) -> Move:
        return Move.DEFECT

    def observe(self, opponent_move: Move) -> None:
        pass


PAYOFF = {
    (Move.COOPERATE, Move.COOPERATE): (3, 3),
    (Move.COOPERATE, Move.DEFECT): (0, 5),
    (Move.DEFECT, Move.COOPERATE): (5, 0),
    (Move.DEFECT, Move.DEFECT): (1, 1),
}


def play_iterated_game(strategy_a, strategy_b, rounds: int) -> tuple[int, int]:
    score_a, score_b = 0, 0
    for _ in range(rounds):
        move_a = strategy_a.next_move()
        move_b = strategy_b.next_move()
        payoff_a, payoff_b = PAYOFF[(move_a, move_b)]
        score_a += payoff_a
        score_b += payoff_b
        strategy_a.observe(move_b)
        strategy_b.observe(move_a)
    return score_a, score_b


# 常に裏切る相手には初手の1回だけ協調して損をするが、以降は即座に報復し損失を最小限に抑える
score_vs_defector = play_iterated_game(TitForTat(), AlwaysDefect(), rounds=10)
print(score_vs_defector)  # (9, 14) -> 初手の被害以外は互角の裏切り合いに収束する

# しっぺ返し同士は初手から協調が続き、繰り返し回数に比例して高い利得を得る
score_vs_self = play_iterated_game(TitForTat(), TitForTat(), rounds=10)
print(score_vs_self)  # (30, 30) -> 全ラウンドで協調が維持される
```

```typescript
enum Move {
  Cooperate = "C",
  Defect = "D",
}

interface Strategy {
  nextMove(): Move;
  observe(opponentMove: Move): void;
}

class TitForTat implements Strategy {
  // しっぺ返し戦略: 初手は協調、以降は相手の直前の手をそのまま真似る
  private opponentLastMove: Move | null = null;

  nextMove(): Move {
    return this.opponentLastMove ?? Move.Cooperate;
  }

  observe(opponentMove: Move): void {
    this.opponentLastMove = opponentMove;
  }
}

class AlwaysDefect implements Strategy {
  // 常に裏切る戦略。しっぺ返しの「報復性」を確認するための比較対象
  nextMove(): Move {
    return Move.Defect;
  }
  observe(_opponentMove: Move): void {}
}

const PAYOFF: Record<string, [number, number]> = {
  [`${Move.Cooperate},${Move.Cooperate}`]: [3, 3],
  [`${Move.Cooperate},${Move.Defect}`]: [0, 5],
  [`${Move.Defect},${Move.Cooperate}`]: [5, 0],
  [`${Move.Defect},${Move.Defect}`]: [1, 1],
};

function playIteratedGame(strategyA: Strategy, strategyB: Strategy, rounds: number): [number, number] {
  let scoreA = 0;
  let scoreB = 0;
  for (let i = 0; i < rounds; i++) {
    const moveA = strategyA.nextMove();
    const moveB = strategyB.nextMove();
    const [payoffA, payoffB] = PAYOFF[`${moveA},${moveB}`];
    scoreA += payoffA;
    scoreB += payoffB;
    strategyA.observe(moveB);
    strategyB.observe(moveA);
  }
  return [scoreA, scoreB];
}

// 常に裏切る相手には初手の1回だけ協調して損をするが、以降は即座に報復し損失を最小限に抑える
console.log(playIteratedGame(new TitForTat(), new AlwaysDefect(), 10)); // [9, 14]

// しっぺ返し同士は初手から協調が続き、繰り返し回数に比例して高い利得を得る
console.log(playIteratedGame(new TitForTat(), new TitForTat(), 10)); // [30, 30]
```
