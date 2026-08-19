---
name: Felsensteinの最尤法による系統樹推定(Maximum Likelihood Phylogeny)
category: バイオインフォマティクス
subcategory: 系統樹・クラスタリング
complexity: O(L×n×s²)(木の尤度計算1回あたり。L=配列長、n=種数、s=置換モデルの状態数)
summary: 塩基やアミノ酸の置換確率モデルのもとで観測配列が得られる尤度を、木の形と枝長に対して最大化することで系統樹を推定する統計的手法で、Felsensteinの枝刈りアルゴリズムにより木全体の尤度を効率よく計算する。
---

## 概要

[近隣結合法](/algorithms/neighbor-joining)や[UPGMA](/algorithms/upgma)は配列間の距離だけを入力とし、[最大節約法](/algorithms/maximum-parsimony)は置換回数を最小化するだけで、いずれも「なぜその置換が起こったのか」を確率的にモデル化してはいない。1981年にジョセフ・フェルゼンシュタインが提案した最尤系統樹推定法は、塩基がどのくらいの確率で他の塩基に置換するかを明示的な統計モデル(Jukes-Cantorモデル、Kimuraの2パラメータモデル、GTRモデルなど)として定義し、「与えられた木のトポロジーと枝長のもとで、観測されたアラインメント済み配列群が得られる確率(尤度)」を最大化する木を探索する。数学的な厳密さと、統計的仮説検定(尤度比検定)やブートストラップ([Bootstrap法による系統樹の信頼度評価](/algorithms/bootstrap-phylogeny))との相性の良さから、現代の分子系統学における標準的な手法のひとつになっている。

## 仕組み

1. 塩基(またはアミノ酸)の置換確率モデルを定める。最も単純なJukes-Cantorモデルでは、4つの塩基が対称に置換すると仮定し、枝の長さ`t`(進化的な時間・距離)から「その枝の両端で塩基が変わらない確率」「別の塩基に変わる確率」を計算できる
2. 木の各内部ノードについて、**Felsensteinの枝刈りアルゴリズム**でボトムアップに「部分尤度」を計算する。葉ノードでは観測された塩基に確率1を、他の塩基に確率0を割り当てる。内部ノードでは、各子ノードの部分尤度を、その子への枝の置換確率で重み付けして合算し、それを子ノードごとに掛け合わせる
3. この計算をアラインメントの全ての列(サイト)について独立に行い、根における各塩基の部分尤度に、その塩基の平衡頻度を掛けて合計すると、そのサイト1列分の尤度が得られる
4. 全サイトの尤度を掛け合わせる(対数を取れば単純な合計になる)ことで、木のトポロジーと枝長全体に対する対数尤度が求まる
5. 固定したトポロジーのもとで、各枝の長さを(勾配法やEMアルゴリズムなどで)尤度が最大になるよう最適化する
6. トポロジーそのものも探索空間の一部であり、NNI(近傍枝交換)やSPR(部分木の再配置)といった木の変形操作を繰り返しながら2〜5を評価し、最も尤度の高いトポロジーを探す(可能なトポロジーの数は種数`n`に対して指数的に増えるため、通常は網羅探索ではなくヒューリスティックな山登り法が使われる)

## 特性・トレードオフ

- **明示的な統計モデルによる厳密さ**: 置換確率を明示的にモデル化しているため、モデル選択(どの置換モデルが最もデータに適合するか)や、尤度比検定による仮説検定、[Bootstrap法](/algorithms/bootstrap-phylogeny)による各枝の信頼度評価など、統計的な裏付けを伴う解析が可能になる。[最大節約法](/algorithms/maximum-parsimony)や距離法にはないこの厳密さが、最尤法が学術的に最も信頼される手法とされる理由である
- **計算コストの高さ**: 固定したトポロジーに対する枝刈りアルゴリズム自体は木のサイズに対して線形(`O(L×n×s²)`)で効率的だが、可能なトポロジーの総数は種数`n`に対して`(2n-5)!!`のオーダーで爆発的に増える。網羅的な探索は現実的に不可能なため、ヒューリスティックな木の探索が必須であり、[近隣結合法](/algorithms/neighbor-joining)や[UPGMA](/algorithms/upgma)よりはるかに計算コストが高い
- **距離法・最大節約法との違い**: [近隣結合法](/algorithms/neighbor-joining)・[UPGMA](/algorithms/upgma)は配列全体を単一の「距離」に要約してから木を作るため計算は速いが、要約の過程で失われる情報がある。[最大節約法](/algorithms/maximum-parsimony)は明示的な置換モデルを持たず、単純に置換(または[Fitchアルゴリズム](/algorithms/fitch-algorithm)で数える変化)の総数を最小化するだけである。最尤法はサイトごとの置換のしやすさの違いまで確率的に考慮するため、理論的には最も情報を活用できるが、その分だけ計算コストを支払う必要がある
- **局所最適への収束リスク**: ヒューリスティックなトポロジー探索は、真に最尤な木ではなく局所最適な木に収束するリスクを常に持つ。実務では複数の初期木から探索を始める、あるいは焼きなまし的な手法を併用するなどの工夫がなされる
- **使いどころ**: 分子系統学における標準的な系統樹推定(RAxML、PhyML、IQ-TREEなどの主要ツールが採用)、種分化の年代推定や分子時計の検証、感染症の伝播経路解析における統計的に裏付けられた系統関係の推定

## 実装例

固定したトポロジーと枝長に対して、Jukes-Cantorモデルのもとでの対数尤度をFelsensteinの枝刈りアルゴリズムで計算する。実際のツールはこの尤度計算を内側のループとして、外側でトポロジーと枝長を探索する。

```python
import math

BASES = "ACGT"


def jukes_cantor_transition(t: float, mu: float = 1.0) -> list[list[float]]:
    """Jukes-Cantorモデル: 4状態が対称に置換すると仮定した最も単純な置換モデル。
    枝の長さtから「同じ塩基のままである確率」「別の塩基に置換する確率」を計算する。"""
    p_same = 0.25 + 0.75 * math.exp(-4 * mu * t / 3)
    p_diff = 0.25 - 0.25 * math.exp(-4 * mu * t / 3)
    return [[p_same if x == y else p_diff for y in range(4)] for x in range(4)]


class TreeNode:
    def __init__(self, name: str | None = None, branch_length: float = 0.0):
        self.name = name
        self.branch_length = branch_length
        self.children: list["TreeNode"] = []

    def add_child(self, child: "TreeNode") -> None:
        self.children.append(child)


def felsenstein_site_likelihood(node: "TreeNode", site: int, sequences: dict[str, str]) -> list[float]:
    """ノードの部分尤度ベクトル: 「このノードを根とする部分木が、観測データを生成する確率」を
    根がその状態sだった場合について、状態ごとに計算するボトムアップの動的計画法(枝刈りアルゴリズム)。"""
    if not node.children:
        observed = sequences[node.name][site]
        return [1.0 if BASES[s] == observed else 0.0 for s in range(4)]

    likelihood = [1.0] * 4
    for child in node.children:
        child_l = felsenstein_site_likelihood(child, site, sequences)
        p = jukes_cantor_transition(child.branch_length)
        for s in range(4):
            likelihood[s] *= sum(p[s][s2] * child_l[s2] for s2 in range(4))
    return likelihood


def tree_log_likelihood(
    root: "TreeNode", sequences: dict[str, str], base_freq: list[float] | None = None
) -> float:
    """全サイト(アラインメントの列)についての対数尤度の合計。サイト間は独立と仮定する。"""
    base_freq = base_freq or [0.25, 0.25, 0.25, 0.25]
    seq_len = len(next(iter(sequences.values())))
    log_l = 0.0
    for site in range(seq_len):
        root_l = felsenstein_site_likelihood(root, site, sequences)
        site_l = sum(base_freq[s] * root_l[s] for s in range(4))
        log_l += math.log(site_l) if site_l > 0 else float("-inf")
    return log_l
```

```typescript
const BASES = "ACGT";

function jukesCantorTransition(t: number, mu = 1.0): number[][] {
  const pSame = 0.25 + 0.75 * Math.exp((-4 * mu * t) / 3);
  const pDiff = 0.25 - 0.25 * Math.exp((-4 * mu * t) / 3);
  return Array.from({ length: 4 }, (_, x) =>
    Array.from({ length: 4 }, (_, y) => (x === y ? pSame : pDiff))
  );
}

class TreeNode {
  children: TreeNode[] = [];
  constructor(
    public name: string | null = null,
    public branchLength = 0.0
  ) {}

  addChild(child: TreeNode): void {
    this.children.push(child);
  }
}

function felsensteinSiteLikelihood(
  node: TreeNode,
  site: number,
  sequences: Map<string, string>
): number[] {
  if (node.children.length === 0) {
    const observed = sequences.get(node.name!)![site];
    return Array.from({ length: 4 }, (_, s) => (BASES[s] === observed ? 1 : 0));
  }

  const likelihood = [1, 1, 1, 1];
  for (const child of node.children) {
    const childL = felsensteinSiteLikelihood(child, site, sequences);
    const p = jukesCantorTransition(child.branchLength);
    for (let s = 0; s < 4; s++) {
      let sum = 0;
      for (let s2 = 0; s2 < 4; s2++) sum += p[s][s2] * childL[s2];
      likelihood[s] *= sum;
    }
  }
  return likelihood;
}

function treeLogLikelihood(
  root: TreeNode,
  sequences: Map<string, string>,
  baseFreq: number[] = [0.25, 0.25, 0.25, 0.25]
): number {
  const seqLen = sequences.values().next().value!.length;
  let logL = 0;
  for (let site = 0; site < seqLen; site++) {
    const rootL = felsensteinSiteLikelihood(root, site, sequences);
    let siteL = 0;
    for (let s = 0; s < 4; s++) siteL += baseFreq[s] * rootL[s];
    logL += siteL > 0 ? Math.log(siteL) : -Infinity;
  }
  return logL;
}
```
