---
name: アーク・スタンダード法による遷移依存構文解析
category: 自然言語処理
subcategory: 系列ラベリング・構文解析
complexity: O(n)(n単語の文、貪欲な1パス解析)
summary: スタックとバッファ、shift/left-arc/right-arcの3種類の遷移動作を使い、文を左から右へ1回走査するだけで単語間の依存関係(誰が誰を修飾するか)を組み立てる、効率重視の依存構文解析手法。
---

## 概要

依存構文解析は、文中の各単語が別のどの単語に「係る」かという二項関係(依存関係)の木構造を求めるタスクである。[CKY法](/algorithms/cky-algorithm)に代表されるチャートベースの句構造解析は、文のあらゆる部分区間の組み合わせを動的計画法で網羅的に検討するため`O(n³)`の計算量がかかるが、遷移依存構文解析(transition-based dependency parsing)はまったく異なるアプローチを取る。「スタック」と「未処理の単語を並べたバッファ」という2つのデータ構造を用意し、shift(バッファから単語を読み込む)・left-arc(依存関係を張る)・right-arcという3種類の局所的な遷移動作を、分類器(古典的にはSVMやパーセプトロン、現代的にはニューラルネットワーク)で逐次選択しながら、文を左から右へたった1パスで解析していく。Nivreらによって2000年代に整備されたこのアーク・スタンダード(arc-standard)方式は、構文解析を「木構造の探索問題」から「毎ステップどの遷移を選ぶかという分類問題」へと転換した点が革新的で、線形時間で動作する実用性の高さから、依存構文解析の実装で広く採用されている。

## 仕組み

1. 文の全単語をバッファ(未処理の単語列)に置き、スタックには特別な根(ROOT)ノードだけを積んだ状態から解析を始める
2. 各ステップで、現在のスタックの上位2要素とバッファの先頭要素という局所的な特徴量を見て、3種類の遷移動作のうちどれを実行するかを分類器が選ぶ:
   - **shift**: バッファの先頭の単語をスタックに積む(まだ依存関係を決められない場合)
   - **left-arc**: スタックの上位2つの単語`s2, s1`について、`s1`が`s2`の親であるという依存関係(矢印`s1 → s2`)を張り、`s2`をスタックから取り除く
   - **right-arc**: 逆に`s2`が`s1`の親であるという依存関係(矢印`s2 → s1`)を張り、`s1`をスタックから取り除く
3. left-arc/right-arcを実行するたびに1つの依存関係(アーク)が構文木に追加され、対応する単語がスタックから取り除かれる——このため文全体では単語数`n`に対してちょうど`n`回のshiftと`n`回のarc操作(合計`2n`回程度)で解析が完了し、`O(n)`の線形時間で終わる
4. バッファが空になり、スタックにROOTだけが残った時点で解析終了。その時点までに張られたアークの集合が、文全体の依存構文木となる
5. 訓練時は、正解の依存構文木が与えられた訓練データから「その木を再現するには各ステップでどの遷移を選ぶべきだったか」を逆算した遷移列(oracle)を作り、その遷移列を教師データとして分類器を学習させる

## 特性・トレードオフ

- **計算量**: 各ステップの遷移選択がスタック・バッファの局所的な情報だけで`O(1)`(分類器の推論コストを除く)に決まり、文全体でも遷移回数が単語数`n`に線形なため、解析全体が`O(n)`で完了する。これは`O(n³ × 文法規則数)`かかる[CKY法](/algorithms/cky-algorithm)のようなチャートベース手法と比べて圧倒的に高速で、大規模コーパスの解析やリアルタイム処理に向く
- **貪欲な決定の誤り伝播**: 各ステップで最も確からしい遷移を貪欲に選び、後戻りをしないため、序盤の誤った選択が後続のすべての解析結果に影響を及ぼす(誤り伝播)。ビームサーチで複数の遷移列候補を並行して保持し、最終的に最も良いものを選ぶことでこの弱点をある程度緩和できる
- **CKY法との根本的なアプローチの違い**: [CKY法](/algorithms/cky-algorithm)は「あらゆる部分区間の可能な構造を動的計画法で網羅的に検討し、最終的に最良の構造を選ぶ」というボトムアップの網羅的探索であるのに対し、遷移依存構文解析は「毎ステップ局所的な特徴から次の一手を分類器に決めさせ、後戻りしない」という貪欲な逐次決定である。前者は句構造(構成素)を、後者は依存構造(単語間の二項関係)を求めるという解析対象の違いもある
- **使いどころ**: 高速性が求められる大規模テキスト処理パイプライン(spaCyなど実用的な自然言語処理ライブラリの依存構文解析器の多くがこの方式)、語順の比較的自由な言語(日本語など)の構文解析、[条件付き確率場(CRF)](/algorithms/conditional-random-field)などと組み合わせた品詞タグ付け後の後段処理

## 実装例

```python
from dataclasses import dataclass, field


@dataclass
class ParserState:
    stack: list[int]  # 単語のインデックス(0はROOT)
    buffer: list[int]
    arcs: list[tuple[int, int]] = field(default_factory=list)  # (head, dependent)


def shift(state: ParserState) -> None:
    state.stack.append(state.buffer.pop(0))


def left_arc(state: ParserState) -> None:
    dependent = state.stack.pop(-2)  # s2が子になる
    head = state.stack[-1]
    state.arcs.append((head, dependent))


def right_arc(state: ParserState) -> None:
    dependent = state.stack.pop()  # s1が子になる
    head = state.stack[-1]
    state.arcs.append((head, dependent))


def can_left_arc(state: ParserState) -> bool:
    # ROOT(index 0)は子になれない
    return len(state.stack) >= 2 and state.stack[-2] != 0


def can_right_arc(state: ParserState) -> bool:
    return len(state.stack) >= 2


def oracle_transition(state: ParserState, gold_heads: dict[int, int]) -> str:
    """訓練データの正解ヘッド(gold_heads[dependent] = head)から次に取るべき遷移を逆算する"""
    if can_left_arc(state):
        s1, s2 = state.stack[-1], state.stack[-2]
        if gold_heads.get(s2) == s1 and not _has_pending_children(s2, state, gold_heads):
            return "left-arc"
    if can_right_arc(state):
        s1, s2 = state.stack[-1], state.stack[-2]
        if gold_heads.get(s1) == s2 and not _has_pending_children(s1, state, gold_heads):
            return "right-arc"
    return "shift"


def _has_pending_children(word: int, state: ParserState, gold_heads: dict[int, int]) -> bool:
    # wordを子に持つ単語がまだバッファに残っているなら、まだwordを確定できない
    attached = {d for _, d in state.arcs}
    return any(gold_heads.get(b) == word for b in state.buffer) or any(
        gold_heads.get(w) == word and w not in attached and w != word
        for w in state.stack
        if w != word
    )


def parse(n_words: int, oracle) -> list[tuple[int, int]]:
    state = ParserState(stack=[0], buffer=list(range(1, n_words + 1)))
    while state.buffer or len(state.stack) > 1:
        transition = oracle(state)
        if transition == "left-arc" and can_left_arc(state):
            left_arc(state)
        elif transition == "right-arc" and can_right_arc(state):
            right_arc(state)
        elif state.buffer:
            shift(state)
        else:
            right_arc(state)  # バッファが空でスタックに複数残る場合は強制的にright-arcで畳む
    return state.arcs
```

```typescript
interface ParserState {
  stack: number[]; // 単語のインデックス(0はROOT)
  buffer: number[];
  arcs: Array<[number, number]>; // [head, dependent]
}

function shift(state: ParserState): void {
  state.stack.push(state.buffer.shift()!);
}

function leftArc(state: ParserState): void {
  const dependent = state.stack.splice(-2, 1)[0]; // s2が子になる
  const head = state.stack[state.stack.length - 1];
  state.arcs.push([head, dependent]);
}

function rightArc(state: ParserState): void {
  const dependent = state.stack.pop()!; // s1が子になる
  const head = state.stack[state.stack.length - 1];
  state.arcs.push([head, dependent]);
}

function canLeftArc(state: ParserState): boolean {
  return state.stack.length >= 2 && state.stack[state.stack.length - 2] !== 0;
}

function canRightArc(state: ParserState): boolean {
  return state.stack.length >= 2;
}

function hasPendingChildren(word: number, state: ParserState, goldHeads: Map<number, number>): boolean {
  const attached = new Set(state.arcs.map(([, d]) => d));
  const inBuffer = state.buffer.some((b) => goldHeads.get(b) === word);
  const inStack = state.stack.some((w) => w !== word && goldHeads.get(w) === word && !attached.has(w));
  return inBuffer || inStack;
}

function oracleTransition(state: ParserState, goldHeads: Map<number, number>): "shift" | "left-arc" | "right-arc" {
  if (canLeftArc(state)) {
    const s1 = state.stack[state.stack.length - 1];
    const s2 = state.stack[state.stack.length - 2];
    if (goldHeads.get(s2) === s1 && !hasPendingChildren(s2, state, goldHeads)) return "left-arc";
  }
  if (canRightArc(state)) {
    const s1 = state.stack[state.stack.length - 1];
    const s2 = state.stack[state.stack.length - 2];
    if (goldHeads.get(s1) === s2 && !hasPendingChildren(s1, state, goldHeads)) return "right-arc";
  }
  return "shift";
}

function parse(nWords: number, oracle: (state: ParserState) => "shift" | "left-arc" | "right-arc"): Array<[number, number]> {
  const state: ParserState = { stack: [0], buffer: Array.from({ length: nWords }, (_, i) => i + 1), arcs: [] };
  while (state.buffer.length > 0 || state.stack.length > 1) {
    const transition = oracle(state);
    if (transition === "left-arc" && canLeftArc(state)) {
      leftArc(state);
    } else if (transition === "right-arc" && canRightArc(state)) {
      rightArc(state);
    } else if (state.buffer.length > 0) {
      shift(state);
    } else {
      rightArc(state); // バッファが空でスタックに複数残る場合は強制的にright-arcで畳む
    }
  }
  return state.arcs;
}
```
