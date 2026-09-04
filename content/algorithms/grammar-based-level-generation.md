---
name: 文法ベースレベル生成 (Grammar-Based Level Generation)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(n)(nは最終的に生成される記号列の長さ、書き換え回数に依存)
summary: 形式文法の書き換え規則を繰り返し適用し記号列からレベル構造を導出する、意味的な制約を組み込みやすいコンテンツ生成手法。
---

## 概要

ノイズや乱数だけでコンテンツを生成すると、見た目は多様でも「鍵を取ってから鍵付きの扉を開ける」「ボス部屋の手前に休憩スペースを置く」といった**意味的な順序・制約**を守らせるのが難しい。文法ベースレベル生成は、[L-System](/algorithms/l-system)のようなコンピュータサイエンスの形式文法の考え方をレベルデザインに応用し、「開始記号」から始めて「非終端記号を、あらかじめ定義した書き換え規則に従ってより具体的な記号列に置き換える」処理を再帰的に繰り返すことでレベルの構造(部屋の並び、ミッションの進行順序など)を導出する。文法の規則自体にデザイナーの意図(「ボス部屋の前には必ず宝部屋を挟む」等)を埋め込めるため、乱数だけの生成よりも人間が設計した「意味のある構造」を保ちながら大量のバリエーションを作れるのが最大の特徴で、`Spelunky`など探索型ゲームのレベル生成で実例が知られている。

## 仕組み

1. レベルの構成要素を表す**終端記号**(実際に配置されるパーツ: 部屋、鍵、扉、敵配置など)と、まだ具体化されていない抽象的な構造を表す**非終端記号**(例: `<ミッション>`, `<試練>`)を定義する
2. 非終端記号をより具体的な記号列に置き換える**書き換え規則**を用意する。1つの非終端記号に対して複数の規則を用意し、確率的に(あるいは条件付きで)どれを適用するか選べるようにすることで多様性を持たせる
3. 開始記号(例: `<ミッション>`)から出発し、記号列中に残っている非終端記号を、対応する規則でランダムに選んだ置き換え先に展開する処理を繰り返す
4. 全ての記号が終端記号になるまで、あるいは指定の展開回数(再帰の深さ)に達するまでステップ3を続ける
5. 得られた終端記号の列を、実際のマップ上の部屋配置・アイテム配置・敵配置に変換する(例えば「鍵→扉→ボス」という記号列を、対応する部屋を順に並べたダンジョンの間取りへマッピングする)

## 特性・トレードオフ

- **計算量**: 展開1回あたりの処理は規則の適用のみで軽量、全体は最終的な記号列の長さ`n`に比例する`O(n)`程度。文法の複雑さ(規則数、再帰の深さ)に依存する
- **意味的制約の表現力**: 「鍵は必ず対応する扉より手前に出現する」のような順序制約や、ミッション構造そのものをルールとして自然に表現できるのが、ノイズベースの手法にない最大の強み
- **文法設計のコスト**: 良い文法規則を設計するにはデザイナーの手作業が必要で、規則が単純すぎると単調に、複雑すぎると制御不能になりやすい。バランスの取れた規則集合を作る反復的な調整が必要になる
- **使いどころ**: ミッション構造やクエストの依存関係を持つダンジョン生成(`Spelunky`のレベル生成が有名な実例)、[手続き型クエスト生成](/algorithms/procedural-quest-generation)、対話木の自動生成など、順序や依存関係が重要なコンテンツ全般

## 実装例

「鍵→扉→宝→ボス」のようなミッション構造を、非終端記号の確率的な書き換えによって導出する簡易的な文法エンジンを実装する。

```python
import random
from typing import Callable

Symbol = str
Rule = list[list[Symbol]]  # 1つの非終端記号に対する複数の置き換え候補


def expand_grammar(
    start: Symbol,
    rules: dict[Symbol, Rule],
    max_steps: int = 50,
    rng: random.Random | None = None,
) -> list[Symbol]:
    """開始記号から出発し、非終端記号をランダムに規則で置き換えて最終的な記号列を返す"""
    rng = rng or random.Random()
    sequence: list[Symbol] = [start]

    for _ in range(max_steps):
        # まだ規則を持つ(=非終端の)記号を探す
        idx = next((i for i, s in enumerate(sequence) if s in rules), None)
        if idx is None:
            break  # 全て終端記号になった
        replacement = rng.choice(rules[sequence[idx]])
        sequence = sequence[:idx] + replacement + sequence[idx + 1 :]

    return sequence


# ミッション文法の例: <ミッション> → 鍵取得→試練 のどちらかの構造に展開される
mission_rules: dict[Symbol, Rule] = {
    "ミッション": [["鍵イベント", "ボス部屋"], ["試練", "宝部屋", "ボス部屋"]],
    "鍵イベント": [["鍵部屋", "扉部屋"]],
    "試練": [["罠部屋", "戦闘部屋"]],
}
```

```typescript
type Symbol = string;
type Rule = Symbol[][]; // 1つの非終端記号に対する複数の置き換え候補

function expandGrammar(
  start: Symbol,
  rules: Record<Symbol, Rule>,
  maxSteps = 50,
  rand: () => number = Math.random,
): Symbol[] {
  // 開始記号から出発し、非終端記号をランダムに規則で置き換えて最終的な記号列を返す
  let sequence: Symbol[] = [start];

  for (let step = 0; step < maxSteps; step++) {
    // まだ規則を持つ(=非終端の)記号を探す
    const idx = sequence.findIndex((s) => s in rules);
    if (idx === -1) break; // 全て終端記号になった
    const candidates = rules[sequence[idx]];
    const replacement = candidates[Math.floor(rand() * candidates.length)];
    sequence = [...sequence.slice(0, idx), ...replacement, ...sequence.slice(idx + 1)];
  }

  return sequence;
}

// ミッション文法の例: ミッション → 鍵取得→試練 のどちらかの構造に展開される
const missionRules: Record<Symbol, Rule> = {
  ミッション: [
    ["鍵イベント", "ボス部屋"],
    ["試練", "宝部屋", "ボス部屋"],
  ],
  鍵イベント: [["鍵部屋", "扉部屋"]],
  試練: [["罠部屋", "戦闘部屋"]],
};
```
