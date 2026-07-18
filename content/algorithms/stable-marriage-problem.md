---
name: 安定結婚問題(Gale-Shapley法)
category: グラフ
subcategory: 最大流・マッチング
complexity: O(n²)(n組のペア)
summary: 双方が相手に対する選好順位を持つ状況で、誰も「今のペアより両想いで魅力的な相手」に乗り換えたくならない、不安定な組み合わせが一切存在しないマッチングを必ず見つける古典的アルゴリズム。
---

## 概要

[ハンガリアン法](/algorithms/hungarian-algorithm)がコストの総和を最適化するのに対し、安定結婚問題は全く異なる種類の「良さ」を追求する——`n`人の男性と`n`人の女性がそれぞれ相手全員に対する好みの順位を持っているとき、「男性Aと女性Bが、今のパートナーよりお互いを好んでいる」というペアが1組も存在しない(そのようなペアがあれば2人は駆け落ちしてしまう、という意味で不安定)マッチングを求める問題である。1962年にデイヴィッド・ゲールとロイド・シャプレーが発表したこのアルゴリズムは、そのような「安定マッチング」が必ず存在し、しかも効率的に構成できることを示した、マッチング理論の金字塔である(シャプレーは2012年にこの功績でノーベル経済学賞を受賞した)。

## 仕組み

1. 全員が未婚(未マッチング)の状態から始める
2. 未婚の男性が1人でもいる限り、以下を繰り返す: (a) 未婚の男性`A`を1人選び、`A`がまだプロポーズしていない女性の中で最も好みの女性`B`にプロポーズする
3. `B`が誰とも婚約していなければ、`A`と`B`は仮の婚約をする
4. `B`が既に誰か`C`と仮の婚約をしている場合、`B`は`A`と`C`のうち好みの高い方を選ぶ——`A`の方が好みなら`A`と婚約し直し、`C`は未婚に戻る。`C`の方が好みならそのまま`C`との婚約を維持し、`A`は振られる
5. 全員が婚約するまで2〜4を繰り返す。最終的な婚約の組がそのまま安定マッチングになる

プロポーズする側(この例では男性)は、自分の希望順に上から順番に断られない限りアプローチし続け、プロポーズされる側は「今より良い相手が来たら乗り換える」という単純なルールだけで、驚くべきことに必ず安定な結果に収束する。

## 特性・トレードオフ

- **計算量**: 最悪`O(n²)`回のプロポーズで収束することが保証されている(全ペアの組み合わせ数が`n²`であり、同じ相手に2度プロポーズすることはないため)
- **安定性の必然的な存在**: どんな選好順位の組み合わせであっても、安定マッチングが少なくとも1つは必ず存在し、このアルゴリズムはそれを構成的に見つけ出す——存在するかどうか分からない解を探索するのではなく、必ず見つかることが理論的に保証されている点が数学的に美しい
- **プロポーズする側が有利**: このアルゴリズムで得られる安定マッチングは、プロポーズする側にとって「複数存在しうる安定マッチングの中で最も良い」結果になり、プロポーズされる側にとっては「最も悪い」結果になることが知られている——どちらの立場でアルゴリズムを回すかで結果が変わる非対称性がある
- **使いどころ**: 研修医と病院のマッチング(米国の全国レジデントマッチングプログラムで実際に使われている)、学校選択制度における生徒と学校の割り当て、腎臓移植のドナー・レシピエントのペアリング、大学の部活動やゼミの配属決定など、双方の選好を尊重した公平な割り当てが求められる実社会の制度設計に広く応用されている

## 実装例

```python
def stable_marriage(men_prefs: list[list[int]], women_prefs: list[list[int]]) -> list[int]:
    """men_prefs[m]は男性mの好み順(先頭が最も好き)の女性リスト、women_prefsも同様。
    戻り値match[m]は男性mとマッチした女性のインデックス。"""
    n = len(men_prefs)
    women_rank = [[0] * n for _ in range(n)]
    for w in range(n):
        for rank, m in enumerate(women_prefs[w]):
            women_rank[w][m] = rank

    next_proposal = [0] * n  # 各男性が次にプロポーズする女性のインデックス(好み順の何番目か)
    woman_partner = [-1] * n  # 各女性の現在の婚約相手、-1は未婚
    free_men = list(range(n))

    while free_men:
        m = free_men.pop()
        w = men_prefs[m][next_proposal[m]]
        next_proposal[m] += 1
        current = woman_partner[w]
        if current == -1:
            woman_partner[w] = m
        elif women_rank[w][m] < women_rank[w][current]:
            woman_partner[w] = m
            free_men.append(current)
        else:
            free_men.append(m)

    match = [0] * n
    for w in range(n):
        match[woman_partner[w]] = w
    return match
```

```typescript
function stableMarriage(menPrefs: number[][], womenPrefs: number[][]): number[] {
  const n = menPrefs.length;
  const womenRank: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let w = 0; w < n; w++) {
    womenPrefs[w].forEach((m, rank) => (womenRank[w][m] = rank));
  }

  const nextProposal = new Array(n).fill(0);
  const womanPartner = new Array(n).fill(-1);
  const freeMen: number[] = Array.from({ length: n }, (_, i) => i);

  while (freeMen.length > 0) {
    const m = freeMen.pop()!;
    const w = menPrefs[m][nextProposal[m]];
    nextProposal[m]++;
    const current = womanPartner[w];
    if (current === -1) {
      womanPartner[w] = m;
    } else if (womenRank[w][m] < womenRank[w][current]) {
      womanPartner[w] = m;
      freeMen.push(current);
    } else {
      freeMen.push(m);
    }
  }

  const match = new Array(n).fill(0);
  for (let w = 0; w < n; w++) match[womanPartner[w]] = w;
  return match;
}
```

```cpp
#include <vector>

std::vector<int> stableMarriage(const std::vector<std::vector<int>>& menPrefs,
                                 const std::vector<std::vector<int>>& womenPrefs) {
    int n = static_cast<int>(menPrefs.size());
    std::vector<std::vector<int>> womenRank(n, std::vector<int>(n));
    for (int w = 0; w < n; w++) {
        for (int rank = 0; rank < n; rank++) {
            womenRank[w][womenPrefs[w][rank]] = rank;
        }
    }

    std::vector<int> nextProposal(n, 0);
    std::vector<int> womanPartner(n, -1);
    std::vector<int> freeMen(n);
    for (int i = 0; i < n; i++) freeMen[i] = i;

    while (!freeMen.empty()) {
        int m = freeMen.back();
        freeMen.pop_back();
        int w = menPrefs[m][nextProposal[m]];
        nextProposal[m]++;
        int current = womanPartner[w];
        if (current == -1) {
            womanPartner[w] = m;
        } else if (womenRank[w][m] < womenRank[w][current]) {
            womanPartner[w] = m;
            freeMen.push_back(current);
        } else {
            freeMen.push_back(m);
        }
    }

    std::vector<int> match(n);
    for (int w = 0; w < n; w++) match[womanPartner[w]] = w;
    return match;
}
```

```rust
fn stable_marriage(men_prefs: &[Vec<usize>], women_prefs: &[Vec<usize>]) -> Vec<usize> {
    let n = men_prefs.len();
    let mut women_rank = vec![vec![0usize; n]; n];
    for w in 0..n {
        for (rank, &m) in women_prefs[w].iter().enumerate() {
            women_rank[w][m] = rank;
        }
    }

    let mut next_proposal = vec![0usize; n];
    let mut woman_partner: Vec<i32> = vec![-1; n];
    let mut free_men: Vec<usize> = (0..n).collect();

    while let Some(m) = free_men.pop() {
        let w = men_prefs[m][next_proposal[m]];
        next_proposal[m] += 1;
        let current = woman_partner[w];
        if current == -1 {
            woman_partner[w] = m as i32;
        } else if women_rank[w][m] < women_rank[w][current as usize] {
            woman_partner[w] = m as i32;
            free_men.push(current as usize);
        } else {
            free_men.push(m);
        }
    }

    let mut match_result = vec![0usize; n];
    for w in 0..n {
        match_result[woman_partner[w] as usize] = w;
    }
    match_result
}
```

```csharp
static int[] StableMarriage(int[][] menPrefs, int[][] womenPrefs)
{
    int n = menPrefs.Length;
    var womenRank = new int[n, n];
    for (int w = 0; w < n; w++)
    {
        for (int rank = 0; rank < n; rank++)
        {
            womenRank[w, womenPrefs[w][rank]] = rank;
        }
    }

    var nextProposal = new int[n];
    var womanPartner = new int[n];
    Array.Fill(womanPartner, -1);
    var freeMen = new List<int>(Enumerable.Range(0, n));

    while (freeMen.Count > 0)
    {
        int m = freeMen[^1];
        freeMen.RemoveAt(freeMen.Count - 1);
        int w = menPrefs[m][nextProposal[m]];
        nextProposal[m]++;
        int current = womanPartner[w];
        if (current == -1)
        {
            womanPartner[w] = m;
        }
        else if (womenRank[w, m] < womenRank[w, current])
        {
            womanPartner[w] = m;
            freeMen.Add(current);
        }
        else
        {
            freeMen.Add(m);
        }
    }

    var match = new int[n];
    for (int w = 0; w < n; w++) match[womanPartner[w]] = w;
    return match;
}
```
