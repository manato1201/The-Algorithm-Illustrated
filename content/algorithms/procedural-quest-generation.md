---
name: 手続き型クエスト生成(グラフ文法によるクエスト木生成)
category: ゲーム
subcategory: 手続き型コンテンツ生成
complexity: O(規則適用回数×規則サイズ)
summary: クエストの目標・報酬・前提条件をノードとするグラフを文法規則の適用によって組み合わせ、多様なクエストを自動生成するグラフ文法ベースの手続き型コンテンツ生成手法。
---

## 概要

RPGのクエストは「モンスターを倒す」「アイテムを届ける」「特定の場所に到達する」といった目標(ゴール)と、その達成に必要な前提条件、達成後に得られる報酬から構成される。これらを1つずつ手作業で設計するのは大規模なオープンワールドゲームでは非現実的なコストになるため、手続き型クエスト生成(Procedural Quest Generation)では、クエストの構成要素をノード、要素間の依存関係(「Aを終えないとBが受けられない」など)を辺とするグラフとして表現し、あらかじめ定義した文法規則(グラフ文法)をノードやサブグラフに繰り返し適用することで、多様でありながら破綻のないクエスト木・クエストグラフを自動生成する。[L-system](/algorithms/l-system)が文字列の書き換えによってフラクタル状の構造を作るのと発想は同じだが、対象が「1次元の文字列」ではなく「ノードとエッジからなるグラフ」である点が本質的な違いであり、クエストの前提条件・並列受注可能性・分岐といった複雑な依存構造を自然に表現できる。

## 仕組み

1. **アトム(基本要素)の定義**: 「敵を討伐する」「アイテムを収集する」「NPCと会話する」「場所へ移動する」といった、それ以上分解できない基本的なクエストゴールの種類をアトムとして用意する。各アトムはパラメータ(対象の敵種族、必要数、報酬量など)を持つ
2. **グラフ文法規則の定義**: 「1つの抽象的な非終端ノード(例: `[討伐クエスト]`)を、複数の具体的なアトムノードとその依存関係(順序・並列・選択)に置き換える」という書き換え規則を複数用意する。例えば`[討伐クエスト] → [雑魚を倒す] → [ボスの手がかりを集める] → [ボスを倒す]`のように、1つの抽象ノードを直列につながる3ノードのサブグラフへ展開する規則を定義できる
3. **開始グラフの用意**: 「メインクエスト」のような最も抽象的な1つのノード(公理に相当)からスタートする
4. **規則の反復適用**: 現在のグラフの中から、規則の左辺(パターン)にマッチする非終端ノードを選び、対応する規則の右辺(具体的なサブグラフ)に置き換える。この置き換えを、グラフ中に非終端ノードがなくなるまで、あるいは規定回数に達するまで繰り返す
5. **制約充足・検証**: 生成されたグラフに対し、「報酬の総量がゲームバランスの範囲内か」「同じNPCに矛盾した依頼が同時に発生していないか」といった制約を検査し、違反していれば別の規則選択でやり直す(バックトラック)か、後処理で修正する
6. **具体化(instantiation)**: 最終的に得られた抽象的なクエストグラフの各ノードに、実際のマップ上の敵配置・アイテム・NPC・報酬アイテムを割り当て、プレイヤーに提示可能な具体的なクエストへ変換する

規則の選択(どの非終端ノードにどの規則を適用するか)を完全ランダムにすれば毎回異なるクエスト構造が生まれ、逆に選択に重み付けやプレイヤーの進行状況に応じた条件を持たせれば、ゲームデザイナーの意図をある程度反映しつつ多様性も確保できる。

## 特性・トレードオフ

- **計算量**: 適用する規則の総数と各規則が展開するサブグラフのサイズに比例するO(規則適用回数×規則サイズ)程度で、通常はクエスト木1本あたりごく短時間で生成できる
- **[L-system](/algorithms/l-system)との違い**: L-systemは1次元の文字列を書き換える文法であり、生成物はタートルグラフィックスなどを介して主に「枝分かれする形状」を表現するのに向いている。手続き型クエスト生成が扱うグラフ文法は、ノード間の任意の依存関係(並列受注、複数の前提条件が揃って初めて解放される、といった非線形な構造)を直接表現できる点で、より複雑な論理構造の生成に適している
- **[Wave Function Collapse](/algorithms/wave-function-collapse)との違い**: WFCは「隣接するタイル同士の局所的な制約」を満たすように空間を埋めていく生成手法であり、主に見た目・配置(タイルマップやテクスチャ)の生成に使われる。手続き型クエスト生成はタイルの空間的配置ではなく、目標・報酬・前提条件という**論理的な依存構造**を生成対象とする点で目的も対象も異なるが、両者とも「局所的な規則の反復適用によって大域的に一貫した構造を作る」という設計思想は共通している
- **多様性と一貫性のトレードオフ**: 規則の適用をランダムにするほど多様なクエストが得られるが、ストーリー上の整合性やゲームバランスを保つための制約充足チェックが複雑になる。逆に制約を厳しくするほど生成結果は安定するが、パターンの単調さ(「代わり映えしない」という印象)が出やすくなる
- **使いどころ**: サイドクエストを大量に必要とするオープンワールドRPGやMMORPGでの反復可能コンテンツの自動生成、プレイヤーごとに動的に変化するクエストラインを提供したいローグライク・サンドボックス系ゲーム。メインストーリーに関わる少数の重要なクエストは、依然として人手によるナラティブデザインが適していることが多い

## 実装例

```python
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class QuestNode:
    id: str
    label: str  # 非終端なら "[討伐クエスト]" のような抽象名、終端ならアトム名
    is_terminal: bool = False
    children: List["QuestNode"] = field(default_factory=list)  # 直列の依存関係


# 文法規則: 非終端ラベル -> 展開後の終端ラベル列(直列につながるサブグラフ)
GRAMMAR: Dict[str, List[List[str]]] = {
    "[討伐クエスト]": [
        ["雑魚を倒す", "手がかりを集める", "ボスを倒す"],
        ["ボスを倒す"],  # 短縮版のバリエーション
    ],
    "[収集クエスト]": [
        ["素材を集める", "NPCに届ける"],
    ],
    "[メインクエスト]": [
        ["[討伐クエスト]", "[収集クエスト]"],
        ["[収集クエスト]", "[討伐クエスト]"],
    ],
}


def expand(node: QuestNode, depth: int = 0, max_depth: int = 6) -> None:
    """非終端ノードを文法規則に従って再帰的に展開する"""
    if node.is_terminal or depth >= max_depth:
        node.is_terminal = True
        return

    rules = GRAMMAR.get(node.label)
    if not rules:
        node.is_terminal = True
        return

    chosen = random.choice(rules)
    for i, label in enumerate(chosen):
        child = QuestNode(id=f"{node.id}-{i}", label=label, is_terminal=label not in GRAMMAR)
        expand(child, depth + 1, max_depth)
        node.children.append(child)


def flatten(node: QuestNode, path: Optional[List[str]] = None) -> List[str]:
    """生成されたクエストグラフを、実行順序のフラットなリストに変換する"""
    path = path or []
    if node.is_terminal:
        return path + [node.label]
    result: List[str] = []
    for child in node.children:
        result.extend(flatten(child, path))
    return result


def generate_quest_chain(seed: Optional[int] = None) -> List[str]:
    if seed is not None:
        random.seed(seed)
    root = QuestNode(id="root", label="[メインクエスト]")
    expand(root)
    return flatten(root)
```

```typescript
interface QuestNode {
  id: string;
  label: string; // 非終端なら "[討伐クエスト]" のような抽象名、終端ならアトム名
  isTerminal: boolean;
  children: QuestNode[];
}

// 文法規則: 非終端ラベル -> 展開後の終端ラベル列(直列につながるサブグラフ)
const GRAMMAR: Record<string, string[][]> = {
  "[討伐クエスト]": [
    ["雑魚を倒す", "手がかりを集める", "ボスを倒す"],
    ["ボスを倒す"], // 短縮版のバリエーション
  ],
  "[収集クエスト]": [["素材を集める", "NPCに届ける"]],
  "[メインクエスト]": [
    ["[討伐クエスト]", "[収集クエスト]"],
    ["[収集クエスト]", "[討伐クエスト]"],
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 非終端ノードを文法規則に従って再帰的に展開する
function expand(node: QuestNode, depth = 0, maxDepth = 6): void {
  if (node.isTerminal || depth >= maxDepth) {
    node.isTerminal = true;
    return;
  }

  const rules = GRAMMAR[node.label];
  if (!rules) {
    node.isTerminal = true;
    return;
  }

  const chosen = pickRandom(rules);
  chosen.forEach((label, i) => {
    const child: QuestNode = {
      id: `${node.id}-${i}`,
      label,
      isTerminal: !(label in GRAMMAR),
      children: [],
    };
    expand(child, depth + 1, maxDepth);
    node.children.push(child);
  });
}

// 生成されたクエストグラフを、実行順序のフラットなリストに変換する
function flatten(node: QuestNode): string[] {
  if (node.isTerminal) return [node.label];
  return node.children.flatMap((child) => flatten(child));
}

function generateQuestChain(): string[] {
  const root: QuestNode = { id: "root", label: "[メインクエスト]", isTerminal: false, children: [] };
  expand(root);
  return flatten(root);
}
```
