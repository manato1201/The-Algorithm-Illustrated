---
name: 隠れマルコフモデルによる遺伝子予測(HMM Gene Prediction)
category: バイオインフォマティクス
subcategory: 構造予測
complexity: O(L×S²)(ビタビ法によるデコード。L=配列長、S=隠れ状態数)
summary: ゲノム配列上のエクソン・イントロン・遺伝子間領域を隠れ状態として表現した隠れマルコフモデルを構築し、ビタビアルゴリズムで最も尤もらしい状態の系列を求めることで、配列だけから遺伝子の構造を予測する手法。
---

## 概要

ゲノム配列上のどこが遺伝子で、遺伝子の中のどこがタンパク質に翻訳されるエクソンで、どこが転写後に取り除かれるイントロンなのかは、単純なパターンマッチングでは判別できない——スプライス部位(イントロンの開始・終了)の配列的な特徴は緩やかな傾向でしかなく、決定的なシグナルではないからである。隠れマルコフモデル(HMM)による遺伝子予測は、ゲノム配列を「遺伝子間領域」「エクソン」「イントロン」といった隠れた状態が塩基を1つずつ出力しながら遷移していく確率過程としてモデル化し、観測された配列全体を最もよく説明する隠れ状態の系列を[ビタビ法](/algorithms/viterbi-algorithm)で求める。この状態系列がそのまま予測された遺伝子構造(どこからどこまでがエクソンか)になる。GENSCANやAUGUSTUSといった代表的なab initio(相同性情報に頼らない)遺伝子予測ツールは、この枠組みをベースに、より高次のマルコフ連鎖や状態の滞在長分布を扱う一般化隠れマルコフモデル(GHMM)へと拡張したものを使っている。

## 仕組み

1. ゲノム配列上で起こりうる要素を隠れ状態として定義する: 遺伝子間領域、エクソン(読み枠のずれを保つため3つの位相を持つ場合が多い)、イントロン、さらに開始コドン・終止コドン・スプライスドナー/アクセプター部位のような境界を表す状態を加えることもある
2. 各状態について、塩基(`A`, `C`, `G`, `T`)ごとの出力確率を、実際の遺伝子アノテーションが既知な訓練データから推定する。エクソン領域ではコドン使用頻度の偏りを反映するため、単純な1塩基ごとの分布ではなく数塩基分の文脈を考慮した高次マルコフモデルを使うことが多い
3. 状態間の遷移確率には、生物学的な「文法」を組み込む——例えばエクソンからイントロンへはスプライスドナー部位でしか遷移できない、イントロンからエクソンへの復帰時には読み枠(リーディングフレーム)の位相を正しく保つ必要がある、といった制約を遷移確率の設計に反映する
4. 与えられたゲノム配列に対して[ビタビ法](/algorithms/viterbi-algorithm)を適用し、その配列を生成したと考えたときに最も尤もらしい隠れ状態の系列を、動的計画法で1回のパスで求める
5. 得られた状態系列を「どこからどこまでが同じ状態(エクソン/イントロン/遺伝子間領域)か」に基づいて区間に分割し、そのまま予測された遺伝子構造(エクソン・イントロンの座標)として出力する

## 特性・トレードオフ

- **遺伝子予測を「デコード問題」に還元できる**: 「配列から最も尤もらしい構造を求める」という一見あいまいな問題を、[ビタビ法](/algorithms/viterbi-algorithm)という確立された動的計画法で厳密に解ける形に定式化できるのが、この手法の最大の利点である。計算量も配列長`L`と状態数`S`に対して`O(L×S²)`と効率的
- **状態滞在長のモデリングの限界**: 単純なHMMでは、ある状態にとどまる長さ(例えばイントロンの長さ)は幾何分布に従うと仮定されるが、実際のイントロン長・エクソン長の分布は幾何分布とは大きく異なる。この問題に対処するため、実用的な遺伝子予測ツールの多くは、状態ごとに任意の滞在長分布を明示的に扱える一般化隠れマルコフモデル(GHMM、あるいはセミマルコフモデル)を採用し、精度を高めている
- **[プロファイル隠れマルコフモデル](/algorithms/profile-hidden-markov-model)との違い**: プロファイルHMMは既知のタンパク質ファミリー(固定長の多重配列アラインメント)に対する「型」をモデル化するのに対し、遺伝子予測HMMはゲノム配列全体の構成(遺伝子間領域・エクソン・イントロンがどう並ぶか)という文法的な構造をモデル化する。どちらも「隠れ状態からの生成確率+[ビタビ法](/algorithms/viterbi-algorithm)によるデコード」という同じ数学的枠組みを、異なる生物学的問題に応用したものである
- **ab initio予測の精度限界**: 配列情報だけに頼る予測は、特にエクソンの正確な境界(スプライス部位)の同定において誤りを起こしやすい。現代のアノテーションパイプラインでは、HMMによるab initio予測の結果を、RNA-seqデータや近縁種との相同性検索といった外部証拠と組み合わせて精度を高めるのが標準的である
- **使いどころ**: 新規に配列決定されたゲノム(特に十分な近縁種の参照情報がない非モデル生物)の遺伝子アノテーション、GENSCAN・AUGUSTUS・GeneMarkなどのab initio遺伝子予測ツールの内部エンジン、既知の遺伝子構造との比較によるアノテーションの品質評価

## 実装例

遺伝子間領域・エクソン・イントロンの3状態からなる単純なHMMを例に、[ビタビ法](/algorithms/viterbi-algorithm)で最も尤もらしい状態系列を求め、その系列を遺伝子構造の区間リストに変換する。

```python
import math

STATES = ["intergenic", "exon", "intron"]
NEG_INF = float("-inf")


def log(x: float) -> float:
    return math.log(x) if x > 0 else NEG_INF


def viterbi_gene_prediction(
    sequence: str,
    emission: dict[str, dict[str, float]],
    transition: dict[str, dict[str, float]],
    start_prob: dict[str, float],
) -> list[str]:
    """遺伝子構造予測を「観測された塩基配列から、それを生成した最も尤もらしい
    隠れ状態(遺伝子間領域/エクソン/イントロン)の系列を求める」デコード問題として解く。"""
    n = len(sequence)
    dp = [{s: NEG_INF for s in STATES} for _ in range(n)]
    backptr: list[dict[str, str]] = [{} for _ in range(n)]

    for s in STATES:
        dp[0][s] = log(start_prob[s]) + log(emission[s][sequence[0]])

    for i in range(1, n):
        for s in STATES:
            best_score, best_prev = NEG_INF, STATES[0]
            for prev in STATES:
                score = dp[i - 1][prev] + log(transition[prev][s])
                if score > best_score:
                    best_score, best_prev = score, prev
            dp[i][s] = best_score + log(emission[s][sequence[i]])
            backptr[i][s] = best_prev

    last_state = max(STATES, key=lambda s: dp[n - 1][s])
    path = [last_state]
    for i in range(n - 1, 0, -1):
        path.append(backptr[i][path[-1]])
    path.reverse()
    return path


def path_to_segments(path: list[str]) -> list[tuple[str, int, int]]:
    """状態列を(状態名, 開始位置, 終了位置)の区間リストに変換し、遺伝子構造として読める形にする。"""
    segments = []
    start = 0
    for i in range(1, len(path) + 1):
        if i == len(path) or path[i] != path[start]:
            segments.append((path[start], start, i - 1))
            start = i
    return segments
```

```typescript
const STATES = ["intergenic", "exon", "intron"] as const;
type State = (typeof STATES)[number];
const NEG_INF = -Infinity;

function logp(x: number): number {
  return x > 0 ? Math.log(x) : NEG_INF;
}

function viterbiGenePrediction(
  sequence: string,
  emission: Record<State, Record<string, number>>,
  transition: Record<State, Record<State, number>>,
  startProb: Record<State, number>
): State[] {
  const n = sequence.length;
  const dp: Record<State, number>[] = Array.from(
    { length: n },
    () => Object.fromEntries(STATES.map((s) => [s, NEG_INF])) as Record<State, number>
  );
  const backptr: Record<State, State>[] = Array.from({ length: n }, () => ({}) as Record<State, State>);

  for (const s of STATES) {
    dp[0][s] = logp(startProb[s]) + logp(emission[s][sequence[0]]);
  }

  for (let i = 1; i < n; i++) {
    for (const s of STATES) {
      let bestScore = NEG_INF;
      let bestPrev: State = STATES[0];
      for (const prev of STATES) {
        const score = dp[i - 1][prev] + logp(transition[prev][s]);
        if (score > bestScore) {
          bestScore = score;
          bestPrev = prev;
        }
      }
      dp[i][s] = bestScore + logp(emission[s][sequence[i]]);
      backptr[i][s] = bestPrev;
    }
  }

  let lastState = STATES[0];
  for (const s of STATES) if (dp[n - 1][s] > dp[n - 1][lastState]) lastState = s;
  const path: State[] = [lastState];
  for (let i = n - 1; i > 0; i--) path.push(backptr[i][path[path.length - 1]]);
  path.reverse();
  return path;
}

function pathToSegments(path: State[]): Array<[State, number, number]> {
  const segments: Array<[State, number, number]> = [];
  let start = 0;
  for (let i = 1; i <= path.length; i++) {
    if (i === path.length || path[i] !== path[start]) {
      segments.push([path[start], start, i - 1]);
      start = i;
    }
  }
  return segments;
}
```
