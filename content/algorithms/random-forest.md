---
name: ランダムフォレスト
category: 機械学習
subcategory: 教師あり学習
complexity: O(m・n log n)(m本の木)
summary: 複数の決定木をデータと特徴の両方をランダムに変えて学習し多数決を取ることで、過学習を抑え精度を上げる。
---

## 概要

決定木は解釈しやすい反面、過学習しやすい(訓練データに過剰に適応してしまう)という弱点を持つ。ランダムフォレストは、「1本の完璧な木を育てる」のではなく、**わざとバラバラな条件で大量の決定木を育て、その多数決を取る**という、集団の知恵(アンサンブル学習)の力で精度と安定性を高める手法。2001年にLeo Breimanが体系化した。

## 仕組み

「ランダム」という名前が示す通り、木を育てる過程に2種類の意図的なランダム性を導入する。

1. **ブートストラップサンプリング**: 元の訓練データから、重複を許してランダムに同じ数だけデータを抽出し、それぞれの決定木の訓練データとする(木ごとに少しずつ異なるデータセットで学習する)
2. **特徴のランダムな部分選択**: 各決定木の各分岐点で、全ての特徴量を検討するのではなく、**ランダムに選んだ一部の特徴量だけ**から最良の分割を探す(木ごとに注目する特徴が偏らないようにする)
3. これらのランダム性を持たせた条件で、多数(数百本規模)の決定木を独立に学習させる
4. 予測時は、全ての木の予測結果を集め、**分類なら多数決、回帰なら平均**を取って最終的な予測とする

「個々の木は多少偏っていても、多数の異なる視点を持つ木の集団の"意見"を集約すると、全体としてはより正確でブレの少ない予測になる」という統計的な効果(分散の低減)が、この手法の核心。

## 特性・トレードオフ

- **計算量**: O(m・n log n)(m=木の本数、n=データ数)。各木は互いに独立に学習できるため、並列計算と非常に相性が良い
- **過学習への強さ**: 単一の決定木に比べ、ランダム性による多様性のおかげで訓練データへの過剰適応が起きにくく、未知のデータへの汎化性能が向上する
- **解釈可能性の低下というトレードオフ**: 単一の決定木の「なぜこの判断か」という透明性は、数百本の木の多数決になった時点でほぼ失われる。予測精度と解釈可能性のトレードオフの典型例
- **使いどころ**: 表形式データの分類・回帰タスク全般(実務データ分析で非常によく使われる)、特徴量の重要度分析(どの特徴が予測に効いているかの評価)、Kaggleなどのデータ分析コンペで安定した性能を出す定番手法として広く使われている

## 実装例

```python
import random
from collections import Counter


class TreeNode:
    def __init__(self, label=None):
        self.feature = None
        self.threshold = None
        self.left = None
        self.right = None
        self.label = label


def gini(labels: list[int]) -> float:
    n = len(labels)
    if n == 0:
        return 0.0
    counts = Counter(labels)
    return 1.0 - sum((c / n) ** 2 for c in counts.values())


def majority_label(labels: list[int]) -> int:
    return Counter(labels).most_common(1)[0][0]


def build_tree(X, y, feature_indices, depth, max_depth, rng) -> TreeNode:
    if depth >= max_depth or len(set(y)) == 1 or len(y) < 2:
        return TreeNode(label=majority_label(y))

    n_try = max(1, int(len(feature_indices) ** 0.5))
    candidates = rng.sample(feature_indices, n_try)  # ランダムな特徴部分集合
    base_impurity = gini(y)
    best_gain, best_feature, best_threshold = -1.0, None, None

    for f in candidates:
        values = sorted(set(row[f] for row in X))
        for i in range(len(values) - 1):
            t = (values[i] + values[i + 1]) / 2
            left_y = [y[i] for i in range(len(X)) if X[i][f] <= t]
            right_y = [y[i] for i in range(len(X)) if X[i][f] > t]
            if not left_y or not right_y:
                continue
            weighted = (len(left_y) * gini(left_y) + len(right_y) * gini(right_y)) / len(y)
            gain = base_impurity - weighted
            if gain > best_gain:
                best_gain, best_feature, best_threshold = gain, f, t

    if best_feature is None or best_gain <= 0:
        return TreeNode(label=majority_label(y))

    node = TreeNode()
    node.feature, node.threshold = best_feature, best_threshold
    left_idx = [i for i in range(len(X)) if X[i][best_feature] <= best_threshold]
    right_idx = [i for i in range(len(X)) if X[i][best_feature] > best_threshold]
    node.left = build_tree([X[i] for i in left_idx], [y[i] for i in left_idx], feature_indices, depth + 1, max_depth, rng)
    node.right = build_tree([X[i] for i in right_idx], [y[i] for i in right_idx], feature_indices, depth + 1, max_depth, rng)
    return node


def predict_tree(node: TreeNode, x) -> int:
    while node.label is None:
        node = node.left if x[node.feature] <= node.threshold else node.right
    return node.label


def bootstrap_sample(X, y, rng):
    n = len(X)
    idx = [rng.randrange(n) for _ in range(n)]  # 重複を許すブートストラップサンプリング
    return [X[i] for i in idx], [y[i] for i in idx]


class RandomForest:
    def __init__(self, n_trees=100, max_depth=6, seed=42):
        self.n_trees = n_trees
        self.max_depth = max_depth
        self.rng = random.Random(seed)
        self.trees: list[TreeNode] = []

    def fit(self, X, y) -> None:
        feature_indices = list(range(len(X[0])))
        self.trees = []
        for _ in range(self.n_trees):
            Xs, ys = bootstrap_sample(X, y, self.rng)
            self.trees.append(build_tree(Xs, ys, feature_indices, 0, self.max_depth, self.rng))

    def predict_one(self, x) -> int:
        votes = [predict_tree(t, x) for t in self.trees]
        return majority_label(votes)  # 多数決で最終予測を決める

    def predict(self, X) -> list[int]:
        return [self.predict_one(x) for x in X]
```

```typescript
interface TreeNode {
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  label?: number;
}

function gini(labels: number[]): number {
  const n = labels.length;
  if (n === 0) return 0;
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let sum = 0;
  for (const c of counts.values()) sum += (c / n) ** 2;
  return 1 - sum;
}
function majorityLabel(labels: number[]): number {
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let best = labels[0], bestCount = -1;
  for (const [label, c] of counts) if (c > bestCount) { best = label; bestCount = c; }
  return best;
}
function sample<T>(arr: T[], k: number, rng: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < k && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function buildTree(X: number[][], y: number[], featureIndices: number[], depth: number, maxDepth: number, rng: () => number): TreeNode {
  if (depth >= maxDepth || new Set(y).size === 1 || y.length < 2) {
    return { label: majorityLabel(y) };
  }
  const nTry = Math.max(1, Math.round(Math.sqrt(featureIndices.length)));
  const candidates = sample(featureIndices, nTry, rng);
  const baseImpurity = gini(y);
  let bestGain = -1, bestFeature = -1, bestThreshold = 0;

  for (const f of candidates) {
    const values = [...new Set(X.map((row) => row[f]))].sort((a, b) => a - b);
    for (let i = 0; i < values.length - 1; i++) {
      const t = (values[i] + values[i + 1]) / 2;
      const leftY = X.map((row, idx) => (row[f] <= t ? y[idx] : null)).filter((v): v is number => v !== null);
      const rightY = X.map((row, idx) => (row[f] > t ? y[idx] : null)).filter((v): v is number => v !== null);
      if (leftY.length === 0 || rightY.length === 0) continue;
      const weighted = (leftY.length * gini(leftY) + rightY.length * gini(rightY)) / y.length;
      const gain = baseImpurity - weighted;
      if (gain > bestGain) { bestGain = gain; bestFeature = f; bestThreshold = t; }
    }
  }
  if (bestFeature === -1 || bestGain <= 0) return { label: majorityLabel(y) };

  const leftIdx: number[] = [], rightIdx: number[] = [];
  X.forEach((row, i) => (row[bestFeature] <= bestThreshold ? leftIdx : rightIdx).push(i));
  return {
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildTree(leftIdx.map((i) => X[i]), leftIdx.map((i) => y[i]), featureIndices, depth + 1, maxDepth, rng),
    right: buildTree(rightIdx.map((i) => X[i]), rightIdx.map((i) => y[i]), featureIndices, depth + 1, maxDepth, rng),
  };
}
function predictTree(node: TreeNode, x: number[]): number {
  while (node.label === undefined) node = x[node.feature!] <= node.threshold! ? node.left! : node.right!;
  return node.label;
}

class RandomForest {
  trees: TreeNode[] = [];
  nTrees: number;
  maxDepth: number;
  rng: () => number;
  constructor(nTrees: number, maxDepth: number, rng: () => number) {
    this.nTrees = nTrees;
    this.maxDepth = maxDepth;
    this.rng = rng;
  }
  fit(X: number[][], y: number[]) {
    const featureIndices = X[0].map((_, i) => i);
    const n = X.length;
    for (let t = 0; t < this.nTrees; t++) {
      const idx = Array.from({ length: n }, () => Math.floor(this.rng() * n));
      const Xs = idx.map((i) => X[i]);
      const ys = idx.map((i) => y[i]);
      this.trees.push(buildTree(Xs, ys, featureIndices, 0, this.maxDepth, this.rng));
    }
  }
  predictOne(x: number[]): number {
    const votes = this.trees.map((t) => predictTree(t, x));
    return majorityLabel(votes);
  }
  predict(X: number[][]): number[] {
    return X.map((x) => this.predictOne(x));
  }
}
```

```cpp
#include <vector>
#include <map>
#include <memory>
#include <set>
#include <cmath>
#include <random>
#include <algorithm>

struct TreeNode {
    int feature = -1;
    double threshold = 0;
    std::unique_ptr<TreeNode> left, right;
    int label = -1;
    bool isLeaf = false;
};

double gini(const std::vector<int>& labels) {
    if (labels.empty()) return 0.0;
    std::map<int, int> counts;
    for (int l : labels) counts[l]++;
    double sum = 0;
    for (auto& [_, c] : counts) sum += std::pow(static_cast<double>(c) / labels.size(), 2);
    return 1.0 - sum;
}
int majorityLabel(const std::vector<int>& labels) {
    std::map<int, int> counts;
    for (int l : labels) counts[l]++;
    int best = labels[0], bestCount = -1;
    for (auto& [label, c] : counts) if (c > bestCount) { best = label; bestCount = c; }
    return best;
}

std::unique_ptr<TreeNode> buildTree(const std::vector<std::vector<double>>& X, const std::vector<int>& y,
                                     const std::vector<int>& featureIndices, int depth, int maxDepth, std::mt19937& rng) {
    std::set<int> uniqueLabels(y.begin(), y.end());
    if (depth >= maxDepth || uniqueLabels.size() == 1 || y.size() < 2) {
        auto leaf = std::make_unique<TreeNode>();
        leaf->isLeaf = true;
        leaf->label = majorityLabel(y);
        return leaf;
    }
    int nTry = std::max(1, static_cast<int>(std::round(std::sqrt(featureIndices.size()))));
    std::vector<int> candidates = featureIndices;
    std::shuffle(candidates.begin(), candidates.end(), rng);
    candidates.resize(std::min<size_t>(nTry, candidates.size()));

    double baseImpurity = gini(y);
    double bestGain = -1;
    int bestFeature = -1;
    double bestThreshold = 0;

    for (int f : candidates) {
        std::set<double> valueSet;
        for (auto& row : X) valueSet.insert(row[f]);
        std::vector<double> values(valueSet.begin(), valueSet.end());
        for (size_t i = 0; i + 1 < values.size(); i++) {
            double t = (values[i] + values[i + 1]) / 2;
            std::vector<int> leftY, rightY;
            for (size_t idx = 0; idx < X.size(); idx++)
                (X[idx][f] <= t ? leftY : rightY).push_back(y[idx]);
            if (leftY.empty() || rightY.empty()) continue;
            double weighted = (leftY.size() * gini(leftY) + rightY.size() * gini(rightY)) / static_cast<double>(y.size());
            double gain = baseImpurity - weighted;
            if (gain > bestGain) { bestGain = gain; bestFeature = f; bestThreshold = t; }
        }
    }
    if (bestFeature == -1 || bestGain <= 0) {
        auto leaf = std::make_unique<TreeNode>();
        leaf->isLeaf = true;
        leaf->label = majorityLabel(y);
        return leaf;
    }

    std::vector<std::vector<double>> leftX, rightX;
    std::vector<int> leftY, rightY;
    for (size_t i = 0; i < X.size(); i++) {
        if (X[i][bestFeature] <= bestThreshold) { leftX.push_back(X[i]); leftY.push_back(y[i]); }
        else { rightX.push_back(X[i]); rightY.push_back(y[i]); }
    }
    auto node = std::make_unique<TreeNode>();
    node->feature = bestFeature;
    node->threshold = bestThreshold;
    node->left = buildTree(leftX, leftY, featureIndices, depth + 1, maxDepth, rng);
    node->right = buildTree(rightX, rightY, featureIndices, depth + 1, maxDepth, rng);
    return node;
}

int predictTree(const TreeNode* node, const std::vector<double>& x) {
    while (!node->isLeaf) node = x[node->feature] <= node->threshold ? node->left.get() : node->right.get();
    return node->label;
}

class RandomForest {
public:
    RandomForest(int nTrees, int maxDepth, unsigned seed) : nTrees_(nTrees), maxDepth_(maxDepth), rng_(seed) {}

    void fit(const std::vector<std::vector<double>>& X, const std::vector<int>& y) {
        std::vector<int> featureIndices(X[0].size());
        for (size_t i = 0; i < featureIndices.size(); i++) featureIndices[i] = static_cast<int>(i);
        std::uniform_int_distribution<size_t> dist(0, X.size() - 1);
        for (int t = 0; t < nTrees_; t++) {
            std::vector<std::vector<double>> Xs;
            std::vector<int> ys;
            for (size_t i = 0; i < X.size(); i++) {
                size_t idx = dist(rng_);
                Xs.push_back(X[idx]);
                ys.push_back(y[idx]);
            }
            trees_.push_back(buildTree(Xs, ys, featureIndices, 0, maxDepth_, rng_));
        }
    }
    int predictOne(const std::vector<double>& x) const {
        std::vector<int> votes;
        for (auto& t : trees_) votes.push_back(predictTree(t.get(), x));
        return majorityLabel(votes);
    }

private:
    int nTrees_, maxDepth_;
    std::mt19937 rng_;
    std::vector<std::unique_ptr<TreeNode>> trees_;
};
```

```rust
use std::collections::{HashMap, HashSet};
use rand::Rng;
use rand::seq::SliceRandom;

enum TreeNode {
    Leaf { label: i32 },
    Split { feature: usize, threshold: f64, left: Box<TreeNode>, right: Box<TreeNode> },
}

fn gini(labels: &[i32]) -> f64 {
    if labels.is_empty() { return 0.0; }
    let mut counts: HashMap<i32, usize> = HashMap::new();
    for &l in labels { *counts.entry(l).or_insert(0) += 1; }
    let n = labels.len() as f64;
    1.0 - counts.values().map(|&c| (c as f64 / n).powi(2)).sum::<f64>()
}
fn majority_label(labels: &[i32]) -> i32 {
    let mut counts: HashMap<i32, usize> = HashMap::new();
    for &l in labels { *counts.entry(l).or_insert(0) += 1; }
    *counts.iter().max_by_key(|(_, &c)| c).unwrap().0
}

fn build_tree(x: &[Vec<f64>], y: &[i32], feature_indices: &[usize], depth: usize, max_depth: usize, rng: &mut impl Rng) -> TreeNode {
    let unique_labels: HashSet<i32> = y.iter().copied().collect();
    if depth >= max_depth || unique_labels.len() == 1 || y.len() < 2 {
        return TreeNode::Leaf { label: majority_label(y) };
    }
    let n_try = ((feature_indices.len() as f64).sqrt().round() as usize).max(1);
    let mut candidates = feature_indices.to_vec();
    candidates.shuffle(rng);
    candidates.truncate(n_try);

    let base_impurity = gini(y);
    let mut best_gain = -1.0;
    let mut best_feature: Option<usize> = None;
    let mut best_threshold = 0.0;

    for &f in &candidates {
        let mut values: Vec<f64> = x.iter().map(|row| row[f]).collect();
        values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        values.dedup();
        for w in values.windows(2) {
            let t = (w[0] + w[1]) / 2.0;
            let left_y: Vec<i32> = (0..x.len()).filter(|&i| x[i][f] <= t).map(|i| y[i]).collect();
            let right_y: Vec<i32> = (0..x.len()).filter(|&i| x[i][f] > t).map(|i| y[i]).collect();
            if left_y.is_empty() || right_y.is_empty() { continue; }
            let weighted = (left_y.len() as f64 * gini(&left_y) + right_y.len() as f64 * gini(&right_y)) / y.len() as f64;
            let gain = base_impurity - weighted;
            if gain > best_gain { best_gain = gain; best_feature = Some(f); best_threshold = t; }
        }
    }

    match best_feature {
        None => TreeNode::Leaf { label: majority_label(y) },
        Some(f) if best_gain <= 0.0 => { let _ = f; TreeNode::Leaf { label: majority_label(y) } }
        Some(f) => {
            let mut left_x = Vec::new(); let mut left_y = Vec::new();
            let mut right_x = Vec::new(); let mut right_y = Vec::new();
            for i in 0..x.len() {
                if x[i][f] <= best_threshold { left_x.push(x[i].clone()); left_y.push(y[i]); }
                else { right_x.push(x[i].clone()); right_y.push(y[i]); }
            }
            TreeNode::Split {
                feature: f,
                threshold: best_threshold,
                left: Box::new(build_tree(&left_x, &left_y, feature_indices, depth + 1, max_depth, rng)),
                right: Box::new(build_tree(&right_x, &right_y, feature_indices, depth + 1, max_depth, rng)),
            }
        }
    }
}

fn predict_tree(node: &TreeNode, x: &[f64]) -> i32 {
    match node {
        TreeNode::Leaf { label } => *label,
        TreeNode::Split { feature, threshold, left, right } => {
            if x[*feature] <= *threshold { predict_tree(left, x) } else { predict_tree(right, x) }
        }
    }
}

struct RandomForest { n_trees: usize, max_depth: usize, trees: Vec<TreeNode> }

impl RandomForest {
    fn new(n_trees: usize, max_depth: usize) -> Self {
        RandomForest { n_trees, max_depth, trees: Vec::new() }
    }
    fn fit(&mut self, x: &[Vec<f64>], y: &[i32], rng: &mut impl Rng) {
        let feature_indices: Vec<usize> = (0..x[0].len()).collect();
        for _ in 0..self.n_trees {
            let idx: Vec<usize> = (0..x.len()).map(|_| rng.gen_range(0..x.len())).collect();
            let xs: Vec<Vec<f64>> = idx.iter().map(|&i| x[i].clone()).collect();
            let ys: Vec<i32> = idx.iter().map(|&i| y[i]).collect();
            self.trees.push(build_tree(&xs, &ys, &feature_indices, 0, self.max_depth, rng));
        }
    }
    fn predict_one(&self, x: &[f64]) -> i32 {
        let votes: Vec<i32> = self.trees.iter().map(|t| predict_tree(t, x)).collect();
        majority_label(&votes)
    }
}
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

class TreeNode
{
    public int Feature = -1;
    public double Threshold;
    public TreeNode? Left, Right;
    public int? Label;
}

static class RandomForestAlgo
{
    static double Gini(List<int> labels)
    {
        int n = labels.Count;
        if (n == 0) return 0;
        return 1 - labels.GroupBy(x => x).Select(g => Math.Pow((double)g.Count() / n, 2)).Sum();
    }
    static int MajorityLabel(List<int> labels) =>
        labels.GroupBy(x => x).OrderByDescending(g => g.Count()).First().Key;

    static List<int> SampleWithoutReplacement(List<int> arr, int k, Random rng)
    {
        var copy = new List<int>(arr);
        var result = new List<int>();
        for (int i = 0; i < k && copy.Count > 0; i++)
        {
            int idx = rng.Next(copy.Count);
            result.Add(copy[idx]);
            copy.RemoveAt(idx);
        }
        return result;
    }

    public static TreeNode BuildTree(List<double[]> x, List<int> y, List<int> featureIndices, int depth, int maxDepth, Random rng)
    {
        if (depth >= maxDepth || y.Distinct().Count() == 1 || y.Count < 2)
            return new TreeNode { Label = MajorityLabel(y) };

        int nTry = Math.Max(1, (int)Math.Round(Math.Sqrt(featureIndices.Count)));
        var candidates = SampleWithoutReplacement(featureIndices, nTry, rng);
        double baseImpurity = Gini(y);
        double bestGain = -1;
        int bestFeature = -1;
        double bestThreshold = 0;

        foreach (var f in candidates)
        {
            var values = x.Select(row => row[f]).Distinct().OrderBy(v => v).ToList();
            for (int i = 0; i < values.Count - 1; i++)
            {
                double t = (values[i] + values[i + 1]) / 2;
                var leftY = new List<int>();
                var rightY = new List<int>();
                for (int idx = 0; idx < x.Count; idx++)
                    (x[idx][f] <= t ? leftY : rightY).Add(y[idx]);
                if (leftY.Count == 0 || rightY.Count == 0) continue;
                double weighted = (leftY.Count * Gini(leftY) + rightY.Count * Gini(rightY)) / y.Count;
                double gain = baseImpurity - weighted;
                if (gain > bestGain) { bestGain = gain; bestFeature = f; bestThreshold = t; }
            }
        }
        if (bestFeature == -1 || bestGain <= 0) return new TreeNode { Label = MajorityLabel(y) };

        var leftIdx = new List<int>();
        var rightIdx = new List<int>();
        for (int i = 0; i < x.Count; i++) (x[i][bestFeature] <= bestThreshold ? leftIdx : rightIdx).Add(i);

        return new TreeNode
        {
            Feature = bestFeature,
            Threshold = bestThreshold,
            Left = BuildTree(leftIdx.Select(i => x[i]).ToList(), leftIdx.Select(i => y[i]).ToList(), featureIndices, depth + 1, maxDepth, rng),
            Right = BuildTree(rightIdx.Select(i => x[i]).ToList(), rightIdx.Select(i => y[i]).ToList(), featureIndices, depth + 1, maxDepth, rng),
        };
    }

    public static int PredictTree(TreeNode node, double[] x)
    {
        while (node.Label == null) node = x[node.Feature] <= node.Threshold ? node.Left! : node.Right!;
        return node.Label.Value;
    }
}

class RandomForest
{
    readonly int nTrees, maxDepth;
    readonly Random rng;
    public List<TreeNode> Trees = new();
    public RandomForest(int nTrees, int maxDepth, Random rng) { this.nTrees = nTrees; this.maxDepth = maxDepth; this.rng = rng; }

    public void Fit(List<double[]> x, List<int> y)
    {
        var featureIndices = Enumerable.Range(0, x[0].Length).ToList();
        int n = x.Count;
        for (int t = 0; t < nTrees; t++)
        {
            var idx = Enumerable.Range(0, n).Select(_ => rng.Next(n)).ToList();
            var xs = idx.Select(i => x[i]).ToList();
            var ys = idx.Select(i => y[i]).ToList();
            Trees.Add(RandomForestAlgo.BuildTree(xs, ys, featureIndices, 0, maxDepth, rng));
        }
    }
    public int PredictOne(double[] x)
    {
        var votes = Trees.Select(t => RandomForestAlgo.PredictTree(t, x)).ToList();
        return votes.GroupBy(v => v).OrderByDescending(g => g.Count()).First().Key;
    }
}
```
