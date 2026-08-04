---
name: 蟻コロニー最適化(ACO)
category: シミュレーション・群知能
subcategory: 群知能最適化
complexity: O(問題依存)
summary: フェロモンの蓄積と蒸発を模した確率的探索で、巡回セールスマン問題などの近似解を集団的に見つける。
---

## 概要

実際のアリの群れが、餌場から巣までの最短経路を、個々のアリの知能では到底不可能な精度で見つけ出す仕組み——「歩いた道にフェロモンを残し、他のアリはフェロモンが濃い道を選びやすい」という単純な仕組みから、群れ全体として最短経路が浮かび上がる——をアルゴリズムに落とし込んだ最適化手法。1992年にマルコ・ドリゴが考案した。巡回セールスマン問題のような、厳密解を求めるのが困難な組み合わせ最適化問題の近似解法として使われる。

## 仕組み

1. 複数の「仮想アリ」を用意し、それぞれが確率的に経路を構築する。次にどの都市へ進むかは、**フェロモンの濃さ**と**距離の近さ**の両方を考慮した確率で選ばれる(フェロモンが濃い、または距離が近い道ほど選ばれやすい)
2. 全てのアリが経路を完成させたら、各アリの経路の長さに応じてフェロモンを道に追加する(短い経路を通ったアリほど、多くのフェロモンを残す)
3. 時間が経つにつれて、全ての道のフェロモンを一定割合**蒸発**させる(古い情報を忘れさせ、局所最適に固執しすぎないようにする)
4. これを何世代も繰り返すと、良い経路により多くのフェロモンが蓄積されていき、群れ全体が徐々に良い解へ収束していく

「フェロモンの蓄積(良い解の強化)」と「フェロモンの蒸発(多様性の維持)」という2つの相反する力のバランスが、局所最適に陥らずに探索を続けられる鍵になっている。

## 特性・トレードオフ

- **計算量**: 問題やパラメータ(アリの数、反復回数)に大きく依存する。厳密解を保証するアルゴリズムではなく、**実用的な時間で十分良い近似解を見つける**ことを目的とする
- **分散的な探索の強み**: 複数のアリが並行して異なる経路を試すため、局所最適解に囚われにくく、探索空間を広くカバーできる。並列計算との相性も良い
- **他の群知能アルゴリズムとの共通性**: フェロモンによる間接的なコミュニケーション(スティグマジー)という発想は、シロアリの巣作りなど他の社会性昆虫の行動モデルにも見られ、粒子群最適化や遺伝的アルゴリズムと並ぶ「自然にヒントを得た最適化(Nature-inspired optimization)」の一角を成す
- **使いどころ**: 巡回セールスマン問題、配送計画・ルーティング問題、ネットワークルーティングの動的最適化、スケジューリング問題など、組み合わせ爆発する探索空間から実用的な時間で良い解を見つけたい場面

## 実装例

```python
import math
import random


def tour_length(tour: list[int], dist: list[list[float]]) -> float:
    n = len(tour)
    return sum(dist[tour[i]][tour[(i + 1) % n]] for i in range(n))


def ant_colony_optimization(
    dist: list[list[float]],
    n_ants: int = 10,
    n_iterations: int = 100,
    alpha: float = 1.0,
    beta: float = 3.0,
    evaporation: float = 0.5,
    q: float = 100.0,
    seed: int = 0,
):
    n = len(dist)
    rng = random.Random(seed)
    pheromone = [[1.0 for _ in range(n)] for _ in range(n)]
    best_tour = None
    best_length = math.inf

    for _ in range(n_iterations):
        all_tours = []
        for _ in range(n_ants):
            visited = [False] * n
            start = rng.randrange(n)
            tour = [start]
            visited[start] = True
            for _ in range(n - 1):
                current = tour[-1]
                probs = []
                total = 0.0
                for j in range(n):
                    if not visited[j] and dist[current][j] > 0:
                        val = (pheromone[current][j] ** alpha) * ((1.0 / dist[current][j]) ** beta)
                        probs.append((j, val))
                        total += val
                if total == 0.0 or not probs:
                    remaining = [j for j in range(n) if not visited[j]]
                    nxt = rng.choice(remaining)
                else:
                    r = rng.uniform(0, total)
                    cum = 0.0
                    nxt = probs[-1][0]
                    for j, val in probs:
                        cum += val
                        if cum >= r:
                            nxt = j
                            break
                tour.append(nxt)
                visited[nxt] = True
            length = tour_length(tour, dist)
            all_tours.append((tour, length))
            if length < best_length:
                best_length = length
                best_tour = tour

        for i in range(n):
            for j in range(n):
                pheromone[i][j] *= 1.0 - evaporation

        for tour, length in all_tours:
            deposit = q / length
            for i in range(n):
                a, b = tour[i], tour[(i + 1) % n]
                pheromone[a][b] += deposit
                pheromone[b][a] += deposit

    return best_tour, best_length
```

```typescript
function tourLength(tour: number[], dist: number[][]): number {
  const n = tour.length;
  let total = 0;
  for (let i = 0; i < n; i++) total += dist[tour[i]][tour[(i + 1) % n]];
  return total;
}

function antColonyOptimization(
  dist: number[][],
  nAnts: number,
  nIterations: number,
  alpha: number,
  beta: number,
  evaporation: number,
  q: number,
  seed: number
): { bestTour: number[] | null; bestLength: number } {
  const n = dist.length;
  let state = seed;
  const rng = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const randInt = (max: number) => Math.floor(rng() * max);

  const pheromone: number[][] = Array.from({ length: n }, () => new Array(n).fill(1.0));
  let bestTour: number[] | null = null;
  let bestLength = Infinity;

  for (let iter = 0; iter < nIterations; iter++) {
    const allTours: { tour: number[]; length: number }[] = [];
    for (let a = 0; a < nAnts; a++) {
      const visited = new Array(n).fill(false);
      const start = randInt(n);
      const tour = [start];
      visited[start] = true;
      for (let step = 0; step < n - 1; step++) {
        const current = tour[tour.length - 1];
        const probs: [number, number][] = [];
        let total = 0;
        for (let j = 0; j < n; j++) {
          if (!visited[j] && dist[current][j] > 0) {
            const val = Math.pow(pheromone[current][j], alpha) * Math.pow(1.0 / dist[current][j], beta);
            probs.push([j, val]);
            total += val;
          }
        }
        let next: number;
        if (total === 0 || probs.length === 0) {
          const remaining = [];
          for (let j = 0; j < n; j++) if (!visited[j]) remaining.push(j);
          next = remaining[randInt(remaining.length)];
        } else {
          const r = rng() * total;
          let cum = 0;
          next = probs[probs.length - 1][0];
          for (const [j, val] of probs) {
            cum += val;
            if (cum >= r) {
              next = j;
              break;
            }
          }
        }
        tour.push(next);
        visited[next] = true;
      }
      const length = tourLength(tour, dist);
      allTours.push({ tour, length });
      if (length < bestLength) {
        bestLength = length;
        bestTour = tour;
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pheromone[i][j] *= 1.0 - evaporation;
    for (const { tour, length } of allTours) {
      const deposit = q / length;
      for (let i = 0; i < n; i++) {
        const a = tour[i];
        const b = tour[(i + 1) % n];
        pheromone[a][b] += deposit;
        pheromone[b][a] += deposit;
      }
    }
  }
  return { bestTour, bestLength };
}
```

```cpp
#include <cmath>
#include <limits>
#include <random>
#include <vector>

double tourLength(const std::vector<int>& tour, const std::vector<std::vector<double>>& dist) {
    int n = static_cast<int>(tour.size());
    double total = 0.0;
    for (int i = 0; i < n; i++) total += dist[tour[i]][tour[(i + 1) % n]];
    return total;
}

struct AcoResult {
    std::vector<int> bestTour;
    double bestLength;
};

AcoResult antColonyOptimization(const std::vector<std::vector<double>>& dist, int nAnts, int nIterations,
                                 double alpha, double beta, double evaporation, double q, unsigned seed) {
    int n = static_cast<int>(dist.size());
    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> unif(0.0, 1.0);

    std::vector<std::vector<double>> pheromone(n, std::vector<double>(n, 1.0));
    std::vector<int> bestTour;
    double bestLength = std::numeric_limits<double>::infinity();

    for (int iter = 0; iter < nIterations; iter++) {
        std::vector<std::pair<std::vector<int>, double>> allTours;
        for (int a = 0; a < nAnts; a++) {
            std::vector<bool> visited(n, false);
            int start = static_cast<int>(unif(rng) * n);
            std::vector<int> tour = {start};
            visited[start] = true;
            for (int step = 0; step < n - 1; step++) {
                int current = tour.back();
                std::vector<std::pair<int, double>> probs;
                double total = 0.0;
                for (int j = 0; j < n; j++) {
                    if (!visited[j] && dist[current][j] > 0) {
                        double val = std::pow(pheromone[current][j], alpha) * std::pow(1.0 / dist[current][j], beta);
                        probs.emplace_back(j, val);
                        total += val;
                    }
                }
                int next;
                if (total == 0.0 || probs.empty()) {
                    std::vector<int> remaining;
                    for (int j = 0; j < n; j++)
                        if (!visited[j]) remaining.push_back(j);
                    next = remaining[static_cast<size_t>(unif(rng) * remaining.size())];
                } else {
                    double r = unif(rng) * total;
                    double cum = 0.0;
                    next = probs.back().first;
                    for (const auto& [j, val] : probs) {
                        cum += val;
                        if (cum >= r) {
                            next = j;
                            break;
                        }
                    }
                }
                tour.push_back(next);
                visited[next] = true;
            }
            double length = tourLength(tour, dist);
            allTours.emplace_back(tour, length);
            if (length < bestLength) {
                bestLength = length;
                bestTour = tour;
            }
        }
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) pheromone[i][j] *= 1.0 - evaporation;
        for (const auto& [tour, length] : allTours) {
            double deposit = q / length;
            for (int i = 0; i < n; i++) {
                int a = tour[i], b = tour[(i + 1) % n];
                pheromone[a][b] += deposit;
                pheromone[b][a] += deposit;
            }
        }
    }
    return AcoResult{bestTour, bestLength};
}
```

```rust
struct AcoResult {
    best_tour: Vec<usize>,
    best_length: f64,
}

fn tour_length(tour: &[usize], dist: &[Vec<f64>]) -> f64 {
    let n = tour.len();
    (0..n).map(|i| dist[tour[i]][tour[(i + 1) % n]]).sum()
}

// simple xorshift PRNG so the routine has no external dependencies
struct Rng(u64);
impl Rng {
    fn next_f64(&mut self) -> f64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 >> 11) as f64 / (1u64 << 53) as f64
    }
    fn next_usize(&mut self, max: usize) -> usize {
        (self.next_f64() * max as f64) as usize
    }
}

fn ant_colony_optimization(
    dist: &[Vec<f64>],
    n_ants: usize,
    n_iterations: usize,
    alpha: f64,
    beta: f64,
    evaporation: f64,
    q: f64,
    seed: u64,
) -> AcoResult {
    let n = dist.len();
    let mut rng = Rng(seed.max(1));
    let mut pheromone = vec![vec![1.0f64; n]; n];
    let mut best_tour: Vec<usize> = Vec::new();
    let mut best_length = f64::INFINITY;

    for _ in 0..n_iterations {
        let mut all_tours: Vec<(Vec<usize>, f64)> = Vec::new();
        for _ in 0..n_ants {
            let mut visited = vec![false; n];
            let start = rng.next_usize(n);
            let mut tour = vec![start];
            visited[start] = true;
            for _ in 0..n.saturating_sub(1) {
                let current = *tour.last().unwrap();
                let mut probs: Vec<(usize, f64)> = Vec::new();
                let mut total = 0.0;
                for j in 0..n {
                    if !visited[j] && dist[current][j] > 0.0 {
                        let val = pheromone[current][j].powf(alpha) * (1.0 / dist[current][j]).powf(beta);
                        probs.push((j, val));
                        total += val;
                    }
                }
                let next = if total == 0.0 || probs.is_empty() {
                    let remaining: Vec<usize> = (0..n).filter(|&j| !visited[j]).collect();
                    remaining[rng.next_usize(remaining.len())]
                } else {
                    let r = rng.next_f64() * total;
                    let mut cum = 0.0;
                    let mut chosen = probs.last().unwrap().0;
                    for &(j, val) in &probs {
                        cum += val;
                        if cum >= r {
                            chosen = j;
                            break;
                        }
                    }
                    chosen
                };
                tour.push(next);
                visited[next] = true;
            }
            let length = tour_length(&tour, dist);
            if length < best_length {
                best_length = length;
                best_tour = tour.clone();
            }
            all_tours.push((tour, length));
        }
        for i in 0..n {
            for j in 0..n {
                pheromone[i][j] *= 1.0 - evaporation;
            }
        }
        for (tour, length) in &all_tours {
            let deposit = q / length;
            for i in 0..n {
                let a = tour[i];
                let b = tour[(i + 1) % n];
                pheromone[a][b] += deposit;
                pheromone[b][a] += deposit;
            }
        }
    }
    AcoResult { best_tour, best_length }
}
```

```csharp
static class AntColonyOptimization
{
    public static double TourLength(int[] tour, double[][] dist)
    {
        int n = tour.Length;
        double total = 0;
        for (int i = 0; i < n; i++) total += dist[tour[i]][tour[(i + 1) % n]];
        return total;
    }

    public static (int[]? tour, double length) Run(double[][] dist, int nAnts, int nIterations,
        double alpha, double beta, double evaporation, double q, int seed)
    {
        int n = dist.Length;
        var rng = new Random(seed);
        var pheromone = new double[n][];
        for (int i = 0; i < n; i++) { pheromone[i] = new double[n]; Array.Fill(pheromone[i], 1.0); }
        int[]? bestTour = null;
        double bestLength = double.PositiveInfinity;

        for (int iter = 0; iter < nIterations; iter++)
        {
            var allTours = new List<(int[] tour, double length)>();
            for (int a = 0; a < nAnts; a++)
            {
                var visited = new bool[n];
                int start = rng.Next(n);
                var tour = new List<int> { start };
                visited[start] = true;
                for (int step = 0; step < n - 1; step++)
                {
                    int current = tour[^1];
                    var probs = new List<(int j, double val)>();
                    double total = 0;
                    for (int j = 0; j < n; j++)
                    {
                        if (!visited[j] && dist[current][j] > 0)
                        {
                            double val = Math.Pow(pheromone[current][j], alpha) * Math.Pow(1.0 / dist[current][j], beta);
                            probs.Add((j, val));
                            total += val;
                        }
                    }
                    int next;
                    if (total == 0 || probs.Count == 0)
                    {
                        var remaining = Enumerable.Range(0, n).Where(j => !visited[j]).ToArray();
                        next = remaining[rng.Next(remaining.Length)];
                    }
                    else
                    {
                        double r = rng.NextDouble() * total;
                        double cum = 0;
                        next = probs[^1].j;
                        foreach (var (j, val) in probs) { cum += val; if (cum >= r) { next = j; break; } }
                    }
                    tour.Add(next);
                    visited[next] = true;
                }
                var tourArr = tour.ToArray();
                double length = TourLength(tourArr, dist);
                allTours.Add((tourArr, length));
                if (length < bestLength) { bestLength = length; bestTour = tourArr; }
            }
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++) pheromone[i][j] *= 1.0 - evaporation;
            foreach (var (tour, length) in allTours)
            {
                double deposit = q / length;
                for (int i = 0; i < n; i++)
                {
                    int a2 = tour[i], b2 = tour[(i + 1) % n];
                    pheromone[a2][b2] += deposit;
                    pheromone[b2][a2] += deposit;
                }
            }
        }
        return (bestTour, bestLength);
    }
}
```
