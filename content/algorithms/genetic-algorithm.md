---
name: 遺伝的アルゴリズム
category: 最適化・確率的手法
subcategory: 進化的・確率的手法
complexity: O(問題依存)
summary: 選択・交叉・突然変異を模した確率的探索で、厳密解が難しい問題の近似解を探る。
---

## 概要

生物の進化——「環境に適した個体が生き残り、子孫を残し、その過程で偶然の変異と交配によって、世代を重ねるごとに集団全体がより環境に適応していく」——という自然のプロセスを、最適化問題の探索アルゴリズムに応用したもの。1970年代にJohn Hollandが体系化した。1つの解を追い求めるのではなく、**多数の候補解の"集団(個体群)"を同時に進化させていく**という発想が特徴的。

## 仕組み

1. ランダムな候補解の集団(個体群)を初期状態として生成する。各候補解は、遺伝子のように符号化された表現(ビット列や数値の配列など)で表される
2. 各個体の「適応度(その解がどれだけ良いか)」を評価する
3. **選択**: 適応度が高い個体ほど、次の世代の親として選ばれやすくする(ルーレット選択やトーナメント選択などの方式がある)
4. **交叉**: 選ばれた2つの親個体の遺伝子を部分的に組み合わせ、新しい子個体を作る
5. **突然変異**: 一定の低い確率で、子個体の遺伝子の一部をランダムに変化させる(集団全体の多様性を保ち、局所最適への収束を防ぐ)
6. 新しい世代の個体群ができたら、2〜5を何世代も繰り返す。世代を重ねるごとに、集団全体の適応度が向上していく

「集団全体で並行して探索する」という点が、単一の解を1つずつ改善していく山登り法や焼きなまし法との大きな違いで、多様な解を同時に試すことで、探索空間の異なる領域を幅広くカバーできる。

## 特性・トレードオフ

- **計算量**: 個体数・世代数・適応度評価のコストに依存し、問題ごとに大きく異なる。厳密解の保証はない近似解法
- **表現の設計が成否を分ける**: 候補解をどのような「遺伝子」の形で符号化するか、交叉・突然変異の操作をどう定義するかが、探索の効率と質を大きく左右する。この設計自体が問題ごとの工夫のしどころになる
- **多様性の維持**: 集団が早い段階で似たような解に収束してしまう(早熟収束)と、局所最適から抜け出せなくなる。突然変異率の調整や、多様性を保つ工夫が実践上の課題になる
- **使いどころ**: 巡回セールスマン問題やスケジューリングのような組み合わせ最適化問題、ニューラルネットワークの構造探索(ニューロエボリューション)、ゲームAIの行動戦略の進化、工学設計における形状最適化など

## 実装例

ビット列の1の数を最大化する「OneMax問題」を題材にした、選択(トーナメント選択)・交叉(一点交叉)・突然変異を1サイクルとする実装。

```python
import random


def fitness(individual: list[int]) -> int:
    return sum(individual)


def selection(population: list[list[int]], fitnesses: list[int], rng: random.Random) -> list[int]:
    # トーナメント選択: ランダムに2個体を選び、適応度が高い方を親にする
    i, j = rng.sample(range(len(population)), 2)
    return population[i] if fitnesses[i] > fitnesses[j] else population[j]


def crossover(
    parent1: list[int], parent2: list[int], rng: random.Random
) -> tuple[list[int], list[int]]:
    point = rng.randint(1, len(parent1) - 1)
    child1 = parent1[:point] + parent2[point:]
    child2 = parent2[:point] + parent1[point:]
    return child1, child2


def mutate(individual: list[int], rng: random.Random, rate: float = 0.01) -> list[int]:
    return [1 - gene if rng.random() < rate else gene for gene in individual]


def genetic_algorithm(
    gene_length: int = 20, pop_size: int = 50, generations: int = 100, seed: int = 1
) -> list[int]:
    rng = random.Random(seed)
    population = [[rng.randint(0, 1) for _ in range(gene_length)] for _ in range(pop_size)]

    for _ in range(generations):
        fitnesses = [fitness(ind) for ind in population]
        new_population = []
        while len(new_population) < pop_size:
            parent1 = selection(population, fitnesses, rng)
            parent2 = selection(population, fitnesses, rng)
            child1, child2 = crossover(parent1, parent2, rng)
            new_population.append(mutate(child1, rng))
            new_population.append(mutate(child2, rng))
        population = new_population[:pop_size]

    return max(population, key=fitness)
```

```typescript
function fitness(individual: number[]): number {
  return individual.reduce((sum, gene) => sum + gene, 0);
}

function selection(population: number[][], fitnesses: number[]): number[] {
  // トーナメント選択: ランダムに2個体を選び、適応度が高い方を親にする
  const i = Math.floor(Math.random() * population.length);
  let j = Math.floor(Math.random() * population.length);
  while (j === i) j = Math.floor(Math.random() * population.length);
  return fitnesses[i] > fitnesses[j] ? population[i] : population[j];
}

function crossover(parent1: number[], parent2: number[]): [number[], number[]] {
  const point = 1 + Math.floor(Math.random() * (parent1.length - 1));
  const child1 = [...parent1.slice(0, point), ...parent2.slice(point)];
  const child2 = [...parent2.slice(0, point), ...parent1.slice(point)];
  return [child1, child2];
}

function mutate(individual: number[], rate = 0.01): number[] {
  return individual.map((gene) => (Math.random() < rate ? 1 - gene : gene));
}

function geneticAlgorithm(geneLength = 20, popSize = 50, generations = 100): number[] {
  let population = Array.from({ length: popSize }, () =>
    Array.from({ length: geneLength }, () => Math.round(Math.random())),
  );

  for (let gen = 0; gen < generations; gen++) {
    const fitnesses = population.map(fitness);
    const newPopulation: number[][] = [];
    while (newPopulation.length < popSize) {
      const parent1 = selection(population, fitnesses);
      const parent2 = selection(population, fitnesses);
      const [child1, child2] = crossover(parent1, parent2);
      newPopulation.push(mutate(child1));
      newPopulation.push(mutate(child2));
    }
    population = newPopulation.slice(0, popSize);
  }

  return population.reduce((best, ind) => (fitness(ind) > fitness(best) ? ind : best));
}
```

```cpp
#include <vector>
#include <random>
#include <algorithm>
#include <numeric>
#include <utility>

using Individual = std::vector<int>;

int fitness(const Individual& individual) {
    return std::accumulate(individual.begin(), individual.end(), 0);
}

Individual selection(const std::vector<Individual>& population, const std::vector<int>& fitnesses,
                      std::mt19937& rng) {
    // トーナメント選択: ランダムに2個体を選び、適応度が高い方を親にする
    std::uniform_int_distribution<size_t> dist(0, population.size() - 1);
    size_t i = dist(rng);
    size_t j = dist(rng);
    while (j == i) j = dist(rng);
    return fitnesses[i] > fitnesses[j] ? population[i] : population[j];
}

std::pair<Individual, Individual> crossover(const Individual& parent1, const Individual& parent2,
                                             std::mt19937& rng) {
    std::uniform_int_distribution<size_t> dist(1, parent1.size() - 1);
    size_t point = dist(rng);
    Individual child1(parent1.begin(), parent1.begin() + point);
    child1.insert(child1.end(), parent2.begin() + point, parent2.end());
    Individual child2(parent2.begin(), parent2.begin() + point);
    child2.insert(child2.end(), parent1.begin() + point, parent1.end());
    return {child1, child2};
}

Individual mutate(Individual individual, std::mt19937& rng, double rate = 0.01) {
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    for (auto& gene : individual) {
        if (dist(rng) < rate) gene = 1 - gene;
    }
    return individual;
}

Individual geneticAlgorithm(int geneLength = 20, int popSize = 50, int generations = 100, unsigned seed = 1) {
    std::mt19937 rng(seed);
    std::uniform_int_distribution<int> bit(0, 1);

    std::vector<Individual> population(popSize, Individual(geneLength));
    for (auto& ind : population) for (auto& gene : ind) gene = bit(rng);

    for (int gen = 0; gen < generations; gen++) {
        std::vector<int> fitnesses(popSize);
        for (int i = 0; i < popSize; i++) fitnesses[i] = fitness(population[i]);

        std::vector<Individual> newPopulation;
        newPopulation.reserve(popSize);
        while (static_cast<int>(newPopulation.size()) < popSize) {
            Individual parent1 = selection(population, fitnesses, rng);
            Individual parent2 = selection(population, fitnesses, rng);
            auto [child1, child2] = crossover(parent1, parent2, rng);
            newPopulation.push_back(mutate(child1, rng));
            newPopulation.push_back(mutate(child2, rng));
        }
        newPopulation.resize(popSize);
        population = std::move(newPopulation);
    }

    return *std::max_element(population.begin(), population.end(),
                              [](const Individual& a, const Individual& b) { return fitness(a) < fitness(b); });
}
```

```rust
use rand::Rng;

type Individual = Vec<u8>;

fn fitness(individual: &Individual) -> u32 {
    individual.iter().map(|&g| g as u32).sum()
}

fn selection<'a>(population: &'a [Individual], fitnesses: &[u32], rng: &mut impl Rng) -> &'a Individual {
    // トーナメント選択: ランダムに2個体を選び、適応度が高い方を親にする
    let i = rng.gen_range(0..population.len());
    let mut j = rng.gen_range(0..population.len());
    while j == i {
        j = rng.gen_range(0..population.len());
    }
    if fitnesses[i] > fitnesses[j] { &population[i] } else { &population[j] }
}

fn crossover(parent1: &Individual, parent2: &Individual, rng: &mut impl Rng) -> (Individual, Individual) {
    let point = rng.gen_range(1..parent1.len());
    let mut child1 = parent1[..point].to_vec();
    child1.extend_from_slice(&parent2[point..]);
    let mut child2 = parent2[..point].to_vec();
    child2.extend_from_slice(&parent1[point..]);
    (child1, child2)
}

fn mutate(mut individual: Individual, rng: &mut impl Rng, rate: f64) -> Individual {
    for gene in individual.iter_mut() {
        if rng.gen::<f64>() < rate {
            *gene = 1 - *gene;
        }
    }
    individual
}

fn genetic_algorithm(gene_length: usize, pop_size: usize, generations: usize, rng: &mut impl Rng) -> Individual {
    let mut population: Vec<Individual> = (0..pop_size)
        .map(|_| (0..gene_length).map(|_| rng.gen_range(0..=1) as u8).collect())
        .collect();

    for _ in 0..generations {
        let fitnesses: Vec<u32> = population.iter().map(fitness).collect();
        let mut new_population = Vec::with_capacity(pop_size);
        while new_population.len() < pop_size {
            let parent1 = selection(&population, &fitnesses, rng).clone();
            let parent2 = selection(&population, &fitnesses, rng).clone();
            let (child1, child2) = crossover(&parent1, &parent2, rng);
            new_population.push(mutate(child1, rng, 0.01));
            new_population.push(mutate(child2, rng, 0.01));
        }
        new_population.truncate(pop_size);
        population = new_population;
    }

    population.into_iter().max_by_key(|ind| fitness(ind)).unwrap()
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

static int Fitness(int[] individual) => individual.Sum();

static int[] Selection(List<int[]> population, int[] fitnesses, Random rng)
{
    // トーナメント選択: ランダムに2個体を選び、適応度が高い方を親にする
    int i = rng.Next(population.Count);
    int j = rng.Next(population.Count);
    while (j == i) j = rng.Next(population.Count);
    return fitnesses[i] > fitnesses[j] ? population[i] : population[j];
}

static (int[] Child1, int[] Child2) Crossover(int[] parent1, int[] parent2, Random rng)
{
    int point = 1 + rng.Next(parent1.Length - 1);
    var child1 = parent1.Take(point).Concat(parent2.Skip(point)).ToArray();
    var child2 = parent2.Take(point).Concat(parent1.Skip(point)).ToArray();
    return (child1, child2);
}

static int[] Mutate(int[] individual, Random rng, double rate = 0.01) =>
    individual.Select(gene => rng.NextDouble() < rate ? 1 - gene : gene).ToArray();

static int[] GeneticAlgorithm(int geneLength = 20, int popSize = 50, int generations = 100, int seed = 1)
{
    var rng = new Random(seed);
    var population = Enumerable.Range(0, popSize)
        .Select(_ => Enumerable.Range(0, geneLength).Select(_ => rng.Next(2)).ToArray())
        .ToList();

    for (int gen = 0; gen < generations; gen++)
    {
        var fitnesses = population.Select(Fitness).ToArray();
        var newPopulation = new List<int[]>();
        while (newPopulation.Count < popSize)
        {
            var parent1 = Selection(population, fitnesses, rng);
            var parent2 = Selection(population, fitnesses, rng);
            var (child1, child2) = Crossover(parent1, parent2, rng);
            newPopulation.Add(Mutate(child1, rng));
            newPopulation.Add(Mutate(child2, rng));
        }
        population = newPopulation.Take(popSize).ToList();
    }

    return population.OrderByDescending(Fitness).First();
}
```
