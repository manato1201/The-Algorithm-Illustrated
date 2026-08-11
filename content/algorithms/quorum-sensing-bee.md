---
name: 蜂群クオーラムセンシング意思決定
category: シミュレーション・群知能
subcategory: 群れ行動シミュレーション
complexity: O(n・c)(nは偵察バチの数、cは候補地の数)
summary: 中央の指揮者がいない蜂の群れが、複数の偵察バチが持ち帰る「支持の強さ」を比較し、ある候補地への支持者数が閾値(定足数)を超えた瞬間に集団全体でその決定に合意する分散的な意思決定モデル。
---

## 概要

ミツバチの分蜂(巣別れ)では、新しい巣の場所を数十〜数百匹の偵察バチが探し回り、複数の候補地の中から**中央の指揮者なしに、群れ全体として1つの候補地に合意する**という驚くべき集団的意思決定が行われる。この現象は、トーマス・シーリーらの研究によって「クオーラムセンシング(定足数感知)」という機構で説明されることが分かっている——各偵察バチは見つけた候補地の質に応じた強さで「尻振りダンス」による支持を表明し、ある候補地に居合わせる支持者の数が一定の**閾値(定足数)**を超えると、その候補地への合意が一気に確定する。この分散的でありながら質の高い候補地に収束しやすい意思決定メカニズムは、群知能の代表例として、[Boidsアルゴリズム](/algorithms/boids)のような移動の群れモデルとは異なる「集団的な選択」のモデルとして研究されている。

## 仕組み

1. 複数の候補地(巣の場所)があり、それぞれに「質」(広さ、日当たり、外敵からの安全性など)のスコアが割り当てられているとする
2. 各偵察バチをランダムに候補地の一つへ「発見」に向かわせ、発見した候補地の質に応じた強さで、その候補地を「支持」する状態にする(質が高いほど、そのバチは長く・熱心に支持行動を続ける)
3. 支持していないバチ(まだ未発見、または支持をやめた)は、他の支持中のバチの「ダンス」を観察し、観察した候補地の質に比例した確率で、自分もその候補地の支持に**乗り換える**
4. 各候補地について、現在その候補地を支持しているバチの数を数える。ある候補地の支持者数が**定足数(クオーラム)**の閾値を超えた瞬間、群れ全体がその候補地に「合意した」と判定し、意思決定が確定する
5. 定足数に達する候補地がまだなければ、2〜4を繰り返し、支持者数の分布を時間発展させる

## 特性・トレードオフ

- **中央の指揮者を必要としない分散合意**: どのバチも群れ全体の状況を把握しているわけではなく、局所的な観察(近くのダンスを見る)と単純な確率的判断(質に応じて乗り換える)だけで行動しているにもかかわらず、群れ全体としては質の高い候補地に収束しやすいという性質を持つ。この「局所的な単純規則から大域的に賢い意思決定が創発する」という構造は、他の群知能アルゴリズム([人工蜂コロニー](/algorithms/artificial-bee-colony)、[アリコロニー最適化](/algorithms/ant-colony-optimization))とも共通する
- **定足数(クオーラム)による決定の速さと質のバランス**: 定足数の閾値を低く設定すると意思決定は速くなるが、まだ十分な情報が集まる前に質の低い候補地で合意してしまうリスクが高まる。閾値を高くすると質の高い決定に収束しやすくなるが、意思決定に時間がかかる。この速さと質のトレードオフの調整が、モデルの重要なパラメータになっている
- **分散システムのリーダー選出との対比**: [分散システム](/algorithms/bully-algorithm)における合意形成(リーダー選出、合意プロトコル)がしばしば明示的なメッセージ交換プロトコルとして設計されるのに対し、蜂群のクオーラムセンシングは「観察と確率的な行動選択」という生物学的にずっと単純な仕組みだけで、機能的には類似した合意形成を実現している点が興味深い
- **使いどころ**: 群知能アルゴリズムとしての分散的な最適化問題への応用、マルチロボットシステムにおける中央制御なしの合意形成、集合知・群衆の意思決定モデルの研究、生物学的な集団的意思決定の理解とそのアルゴリズム化

## 実装例

```python
import random

def quorum_sensing_step(
    supporters: dict[int, list[int]],  # site_id -> 支持しているバチのIDリスト
    site_quality: dict[int, float], unassigned_bees: list[int], quorum_threshold: int,
) -> tuple[dict[int, list[int]], int | None]:
    all_sites = list(site_quality.keys())

    # まだどこも支持していないバチは、質に比例した確率でどこかの候補地に加わる
    for bee in list(unassigned_bees):
        weights = [site_quality[s] for s in all_sites]
        total = sum(weights)
        r = random.random() * total
        cumulative = 0.0
        for site, w in zip(all_sites, weights):
            cumulative += w
            if r <= cumulative:
                supporters[site].append(bee)
                unassigned_bees.remove(bee)
                break

    # 定足数に達した候補地があれば意思決定確定
    for site, bees in supporters.items():
        if len(bees) >= quorum_threshold:
            return supporters, site

    return supporters, None
```

```typescript
function quorumSensingStep(
  supporters: Map<number, number[]>,
  siteQuality: Map<number, number>,
  unassignedBees: number[],
  quorumThreshold: number,
  rand: () => number = Math.random,
): { supporters: Map<number, number[]>; decidedSite: number | null } {
  const allSites = [...siteQuality.keys()];

  for (const bee of [...unassignedBees]) {
    const weights = allSites.map((s) => siteQuality.get(s)!);
    const total = weights.reduce((a, b) => a + b, 0);
    const r = rand() * total;
    let cumulative = 0;
    for (let i = 0; i < allSites.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) {
        supporters.get(allSites[i])!.push(bee);
        unassignedBees.splice(unassignedBees.indexOf(bee), 1);
        break;
      }
    }
  }

  for (const [site, bees] of supporters) {
    if (bees.length >= quorumThreshold)
      return { supporters, decidedSite: site };
  }

  return { supporters, decidedSite: null };
}
```

```cpp
#include <vector>
#include <map>
#include <random>
#include <algorithm>
#include <optional>

std::optional<int> quorumSensingStep(
    std::map<int, std::vector<int>>& supporters, const std::map<int, double>& siteQuality,
    std::vector<int>& unassignedBees, int quorumThreshold, std::mt19937& rng) {
    std::vector<int> allSites;
    for (auto& [s, q] : siteQuality) allSites.push_back(s);

    std::uniform_real_distribution<double> uni(0.0, 1.0);
    for (auto it = unassignedBees.begin(); it != unassignedBees.end();) {
        double total = 0.0;
        for (int s : allSites) total += siteQuality.at(s);
        double r = uni(rng) * total;
        double cumulative = 0.0;
        bool assigned = false;
        for (int s : allSites) {
            cumulative += siteQuality.at(s);
            if (r <= cumulative) {
                supporters[s].push_back(*it);
                it = unassignedBees.erase(it);
                assigned = true;
                break;
            }
        }
        if (!assigned) ++it;
    }

    for (auto& [site, bees] : supporters) {
        if (static_cast<int>(bees.size()) >= quorumThreshold) return site;
    }
    return std::nullopt;
}
```

```rust
use rand::Rng;
use std::collections::HashMap;

fn quorum_sensing_step(
    supporters: &mut HashMap<i32, Vec<i32>>, site_quality: &HashMap<i32, f64>,
    unassigned_bees: &mut Vec<i32>, quorum_threshold: usize, rng: &mut impl Rng,
) -> Option<i32> {
    let all_sites: Vec<i32> = site_quality.keys().cloned().collect();

    let mut i = 0;
    while i < unassigned_bees.len() {
        let total: f64 = all_sites.iter().map(|s| site_quality[s]).sum();
        let r = rng.gen::<f64>() * total;
        let mut cumulative = 0.0;
        let mut assigned = false;
        for &s in &all_sites {
            cumulative += site_quality[&s];
            if r <= cumulative {
                supporters.entry(s).or_default().push(unassigned_bees[i]);
                unassigned_bees.remove(i);
                assigned = true;
                break;
            }
        }
        if !assigned {
            i += 1;
        }
    }

    for (&site, bees) in supporters.iter() {
        if bees.len() >= quorum_threshold {
            return Some(site);
        }
    }
    None
}
```

```csharp
static int? QuorumSensingStep(
    Dictionary<int, List<int>> supporters, Dictionary<int, double> siteQuality,
    List<int> unassignedBees, int quorumThreshold, Random rand)
{
    var allSites = siteQuality.Keys.ToList();

    foreach (var bee in unassignedBees.ToList())
    {
        double total = allSites.Sum(s => siteQuality[s]);
        double r = rand.NextDouble() * total;
        double cumulative = 0;
        foreach (var s in allSites)
        {
            cumulative += siteQuality[s];
            if (r <= cumulative)
            {
                supporters[s].Add(bee);
                unassignedBees.Remove(bee);
                break;
            }
        }
    }

    foreach (var (site, bees) in supporters)
    {
        if (bees.Count >= quorumThreshold) return site;
    }
    return null;
}
```
