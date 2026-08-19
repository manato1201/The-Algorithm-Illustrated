---
name: スクワッド戦術ポジショニング(カバー地点評価)
category: キャラクターAI・空間AI
subcategory: 群衆・マルチエージェント
complexity: O(m・n)(mはカバー地点候補数、nはスクワッドメンバー数。地点ごとの評価コストは別途O(k)、kは可視性判定対象数)
summary: 複数の敵AIが遮蔽物・視線・仲間との重複を考慮してカバー地点を採点・分担し、個々が独立に動くのではなく集団として連携したポジショニングを取る戦術AI手法。
---

## 概要

シューティングゲームで複数の敵AIが同時に出現するとき、各キャラクターが個別に「一番近い遮蔽物へ逃げ込む」だけでは、全員が同じカバー地点に殺到したり、プレイヤーから丸見えの位置に留まったりと、集団としての知性を感じさせない振る舞いになりがちである。スクワッド戦術ポジショニングは、[Behavior Tree](/algorithms/behavior-tree)や[GOAP](/algorithms/goap)のような個体レベルの意思決定の**上位レイヤー**として働き、マップ上のカバー地点候補を「敵からどれだけ隠れられるか」「目標(プレイヤー)を狙撃できるか」「他のメンバーとどれだけ重複しないか」といった複数の観点でスコアリングし、スクワッド全体として重複の少ない、連携の取れたポジショニングを割り当てる。F.E.A.R.やGears of Warのようなカバーシューターで培われた手法群が代表的で、「個々のAIの賢さ」ではなく「集団としての配置の賢さ」を作ることに主眼を置く。

## 仕組み

1. **カバー地点候補の収集**: レベルの静的なジオメトリを解析し、遮蔽物(壁・障害物)の縁に沿ってカバー地点候補を配置する。事前にレベルデザイン時にオーサリングする方式と、ナビゲーションメッシュの縁や[レイキャストによる視線判定](/algorithms/line-of-sight-raycasting)を使って実行時・ビルド時に自動抽出する方式がある
2. **地点ごとのスコアリング**: 各候補地点`p`について複数の評価項目を計算し、重み付き和でスコア化する
   - **被視認性**: 想定される脅威(プレイヤーの位置)から地点`p`への視線が遮蔽物で遮られるか([視線判定](/algorithms/line-of-sight-raycasting)を利用)。遮られるほど高得点
   - **攻撃可能性**: 地点`p`から脅威への視線が通っているか(隠れつつ反撃できる地点を優先する場合)
   - **移動コスト**: 現在位置から地点`p`までの経路長。近い地点ほど有利
   - **味方との重複ペナルティ**: 既に他のメンバーが確保済み、または確保しようとしている地点との距離が近いほど減点する
3. **スクワッド全体への地点割り当て**: 各メンバーについて上位候補地点を選ぶだけでなく、割り当て済みの地点をブラックボード(共有の意思決定用データストア、[ブラックボードアーキテクチャ](/algorithms/blackboard-architecture)参照)などの共有状態に登録し、他メンバーの評価時にその重複ペナルティへ反映させる。単純には「スコアが高いメンバーから貪欲に地点を確保していく」逐次割り当てで十分実用的な結果が得られる
4. **再評価とロールの分担**: 脅威の位置やメンバーの生存状況が変わるたびに再評価を行い、必要なら地点を再割り当てする。加えて「側面を突く役」「制圧射撃で釘付けにする役」のような戦術的な役割(ロール)を各メンバーに割り当て、ロールに応じて評価式の重みを変える(側面役は移動コストより脅威の死角を重視するなど)ことで、より意図的な連携が生まれる
5. 選ばれた地点へは各メンバーが個別に(ナビゲーションメッシュ上のA*探索などで)移動し、到着後は個体レベルのBehavior Tree/GOAPが射撃・再装填などの戦術行動を制御する

## 特性・トレードオフ

- **集団としての一貫性**: 個々のAIが独立に最善手を選ぶだけでは生まれない「連携している」という印象を、共有状態を介した比較的シンプルな仕組みで作り出せる。実装コストの割に体感上のAI品質への寄与が大きい
- **評価コストとキャッシュ**: カバー地点候補ごとの視認性判定はレイキャストを伴うため、脅威やメンバーが動くたびに全候補を再評価するとコストが高い。実運用では一定間隔での再評価、空間分割による評価対象の絞り込み、地点の静的な特性(視線が通る方向など)の事前計算とキャッシュが必須になる
- **個体AIとの役割分担**: このレイヤーは「どこに位置取るか」だけを決め、「そこで何をするか(発砲・再装填・投擲)」は[Behavior Tree](/algorithms/behavior-tree)や[GOAP](/algorithms/goap)、[Utility AI](/algorithms/utility-ai)のような個体レベルの意思決定に委ねるのが一般的な構成。ポジショニングと個体行動の責務を分離することで、それぞれを独立に調整・デバッグしやすくなる
- **群衆シミュレーションとの違い**: [RVO](/algorithms/reciprocal-velocity-obstacles)や[ソーシャルフォースモデル](/algorithms/social-force-model)が「多数のエージェントが衝突せず移動する」という連続的な運動の問題を扱うのに対し、スクワッド戦術ポジショニングは少人数(数体〜十数体程度)のチームが「離散的な戦術地点をどう分担するか」という割り当て問題を扱う点で計算パラダイムが異なる
- **使いどころ**: カバーシューター・戦術FPSの敵AI、リアルタイムストラテジーの分隊単位の陣形制御、ステルスゲームの警備AIの巡回・包囲行動

## 実装例

```python
import math

Vec2 = tuple[float, float]

class CoverPoint:
    def __init__(self, pos: Vec2, blocks_los_from: list[Vec2]):
        self.pos = pos
        # 遮蔽物によって視線が遮られる方向(簡略化のため脅威位置のリストで表現)
        self.blocks_los_from = blocks_los_from


def is_hidden_from(cover: CoverPoint, threat: Vec2, tolerance: float = 1.5) -> bool:
    return any(math.hypot(threat[0] - t[0], threat[1] - t[1]) < tolerance for t in cover.blocks_los_from)


def score_cover_point(
    cover: CoverPoint,
    agent_pos: Vec2,
    threat_pos: Vec2,
    claimed_positions: list[Vec2],
    w_hidden: float = 5.0,
    w_distance: float = -0.5,
    w_overlap: float = -3.0,
) -> float:
    score = 0.0
    if is_hidden_from(cover, threat_pos):
        score += w_hidden

    dist = math.hypot(cover.pos[0] - agent_pos[0], cover.pos[1] - agent_pos[1])
    score += w_distance * dist

    for claimed in claimed_positions:
        overlap_dist = math.hypot(cover.pos[0] - claimed[0], cover.pos[1] - claimed[1])
        if overlap_dist < 4.0:
            score += w_overlap * (1.0 - overlap_dist / 4.0)

    return score


def assign_cover_points(
    agents: list[Vec2], candidates: list[CoverPoint], threat_pos: Vec2,
) -> dict[int, CoverPoint]:
    """スコアが高い順にエージェントへ貪欲にカバー地点を割り当てる。"""
    assignment: dict[int, CoverPoint] = {}
    claimed: list[Vec2] = []
    remaining = list(range(len(agents)))

    while remaining:
        best_agent_idx = -1
        best_cover: CoverPoint | None = None
        best_score = -math.inf
        for i in remaining:
            for cover in candidates:
                if cover.pos in claimed:
                    continue
                s = score_cover_point(cover, agents[i], threat_pos, claimed)
                if s > best_score:
                    best_score, best_agent_idx, best_cover = s, i, cover
        if best_cover is None:
            break
        assignment[best_agent_idx] = best_cover
        claimed.append(best_cover.pos)
        remaining.remove(best_agent_idx)

    return assignment
```

```typescript
type Vec2 = [number, number];

class CoverPoint {
  constructor(
    public pos: Vec2,
    public blocksLosFrom: Vec2[],
  ) {}
}

function isHiddenFrom(cover: CoverPoint, threat: Vec2, tolerance = 1.5): boolean {
  return cover.blocksLosFrom.some((t) => Math.hypot(threat[0] - t[0], threat[1] - t[1]) < tolerance);
}

function scoreCoverPoint(
  cover: CoverPoint,
  agentPos: Vec2,
  threatPos: Vec2,
  claimedPositions: Vec2[],
  wHidden = 5.0,
  wDistance = -0.5,
  wOverlap = -3.0,
): number {
  let score = 0;
  if (isHiddenFrom(cover, threatPos)) score += wHidden;

  const dist = Math.hypot(cover.pos[0] - agentPos[0], cover.pos[1] - agentPos[1]);
  score += wDistance * dist;

  for (const claimed of claimedPositions) {
    const overlapDist = Math.hypot(cover.pos[0] - claimed[0], cover.pos[1] - claimed[1]);
    if (overlapDist < 4.0) score += wOverlap * (1.0 - overlapDist / 4.0);
  }

  return score;
}

function assignCoverPoints(
  agents: Vec2[],
  candidates: CoverPoint[],
  threatPos: Vec2,
): Map<number, CoverPoint> {
  const assignment = new Map<number, CoverPoint>();
  const claimed: Vec2[] = [];
  const remaining = new Set(agents.map((_, i) => i));

  while (remaining.size > 0) {
    let bestAgentIdx = -1;
    let bestCover: CoverPoint | null = null;
    let bestScore = -Infinity;

    for (const i of remaining) {
      for (const cover of candidates) {
        if (claimed.some((c) => c[0] === cover.pos[0] && c[1] === cover.pos[1])) continue;
        const s = scoreCoverPoint(cover, agents[i], threatPos, claimed);
        if (s > bestScore) {
          bestScore = s;
          bestAgentIdx = i;
          bestCover = cover;
        }
      }
    }
    if (!bestCover) break;
    assignment.set(bestAgentIdx, bestCover);
    claimed.push(bestCover.pos);
    remaining.delete(bestAgentIdx);
  }

  return assignment;
}
```
