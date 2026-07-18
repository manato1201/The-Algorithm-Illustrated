---
name: 決定木
category: 機械学習
subcategory: 教師あり学習
complexity: O(n log n)(構築)
summary: 情報利得やジニ不純度が最大になる条件で再帰的にデータを分割する、人間にも読める予測モデル。
---

## 概要

「もし年齢が30歳以上なら」「もし年収が500万円以上なら」というような、Yes/Noの質問を木構造状に連ねていくことで分類・予測を行う機械学習モデル。ニューラルネットワークのような「ブラックボックス」とは対照的に、**判断の根拠を人間がそのまま読んで理解できる**という透明性が最大の特徴で、医療診断や与信審査のように「なぜその判断に至ったか」の説明責任が求められる場面で重宝される。

## 仕組み

1. 訓練データ全体を根ノードとする
2. 全ての特徴量・全ての分割候補(閾値)の中から、**分割後にデータが最も"きれいに"分かれる条件**を選ぶ。「きれいさ」の指標には、ジニ不純度(分割後の各グループにどれだけ異なるクラスが混ざっているか)や情報利得(分割によってどれだけ不確実性が減るか)が使われる
3. 選んだ条件でデータを2つ(または複数)のグループに分割し、それぞれを子ノードとする
4. 各子ノードに対して、停止条件(木の深さの上限、ノード内のデータ数が一定以下など)を満たすまで、2〜3を再帰的に繰り返す
5. 最終的に、葉ノードに到達したデータ点が、そのノードの多数派クラス(分類)や平均値(回帰)として予測される

「毎回、その時点で最も分割の効果が高い条件を貪欲に選ぶ」というトップダウンの構築方法が一般的で、これは必ずしも大域的に最適な木を作るわけではないが、実用上十分な精度と高速な構築を両立している。

## 特性・トレードオフ

- **計算量**: 構築はおおよそO(n log n)(nは訓練データ数)。予測は木の深さに比例する高速な操作(O(log n)程度)
- **解釈可能性の高さ**: 木をそのまま図示すれば、「なぜこの予測になったか」を人間が追跡できる。この透明性は、規制の厳しい業界(金融・医療など)で特に重視される
- **過学習しやすい**: 木を深くしすぎると、訓練データの細かいノイズまで学習してしまい(過学習)、未知のデータへの汎化性能が落ちる。木の深さの制限や枝刈り(プルーニング)で対策する
- **使いどころ**: 与信審査・医療診断のような説明責任が求められる予測タスク、ランダムフォレストやXGBoostのような、決定木を大量に組み合わせるアンサンブル学習の構成要素としても広く使われている

## 実装例

```python
from collections import Counter


class Node:
    def __init__(self, feature=None, threshold=None, left=None, right=None, label=None):
        self.feature = feature
        self.threshold = threshold
        self.left = left
        self.right = right
        self.label = label  # 葉ノードの場合のみ設定される

    def is_leaf(self) -> bool:
        return self.label is not None


def gini(labels: list[int]) -> float:
    n = len(labels)
    if n == 0:
        return 0.0
    counts = Counter(labels)
    return 1.0 - sum((c / n) ** 2 for c in counts.values())


def best_split(X: list[list[float]], y: list[int]):
    n_samples, n_features = len(X), len(X[0])
    best_gain, best_feature, best_threshold = 0.0, None, None
    parent_impurity = gini(y)

    for feature in range(n_features):
        for threshold in sorted(set(row[feature] for row in X)):
            left_y = [y[i] for i in range(n_samples) if X[i][feature] <= threshold]
            right_y = [y[i] for i in range(n_samples) if X[i][feature] > threshold]
            if not left_y or not right_y:
                continue
            weighted = (len(left_y) / n_samples) * gini(left_y) + (len(right_y) / n_samples) * gini(right_y)
            gain = parent_impurity - weighted
            if gain > best_gain:
                best_gain, best_feature, best_threshold = gain, feature, threshold

    return best_feature, best_threshold, best_gain


def build_tree(X: list[list[float]], y: list[int], depth: int = 0, max_depth: int = 4, min_samples: int = 2) -> Node:
    if len(set(y)) == 1 or len(y) < min_samples or depth >= max_depth:
        return Node(label=Counter(y).most_common(1)[0][0])

    feature, threshold, gain = best_split(X, y)
    if feature is None or gain <= 0:
        return Node(label=Counter(y).most_common(1)[0][0])

    left_idx = [i for i in range(len(X)) if X[i][feature] <= threshold]
    right_idx = [i for i in range(len(X)) if X[i][feature] > threshold]
    left = build_tree([X[i] for i in left_idx], [y[i] for i in left_idx], depth + 1, max_depth, min_samples)
    right = build_tree([X[i] for i in right_idx], [y[i] for i in right_idx], depth + 1, max_depth, min_samples)
    return Node(feature=feature, threshold=threshold, left=left, right=right)


def predict_one(node: Node, x: list[float]) -> int:
    while not node.is_leaf():
        node = node.left if x[node.feature] <= node.threshold else node.right
    return node.label
```

```typescript
type TreeNode = {
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  label?: number;
};

function gini(labels: number[]): number {
  const n = labels.length;
  if (n === 0) return 0;
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let sum = 0;
  for (const c of counts.values()) sum += (c / n) ** 2;
  return 1 - sum;
}

function bestSplit(X: number[][], y: number[]): { feature: number | null; threshold: number | null; gain: number } {
  const nSamples = X.length;
  const nFeatures = X[0].length;
  let bestGain = 0;
  let bestFeature: number | null = null;
  let bestThreshold: number | null = null;
  const parentImpurity = gini(y);

  for (let feature = 0; feature < nFeatures; feature++) {
    const thresholds = Array.from(new Set(X.map((row) => row[feature]))).sort((a, b) => a - b);
    for (const threshold of thresholds) {
      const leftY: number[] = [];
      const rightY: number[] = [];
      for (let i = 0; i < nSamples; i++) {
        (X[i][feature] <= threshold ? leftY : rightY).push(y[i]);
      }
      if (leftY.length === 0 || rightY.length === 0) continue;
      const weighted = (leftY.length / nSamples) * gini(leftY) + (rightY.length / nSamples) * gini(rightY);
      const gain = parentImpurity - weighted;
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = feature;
        bestThreshold = threshold;
      }
    }
  }
  return { feature: bestFeature, threshold: bestThreshold, gain: bestGain };
}

function majorityLabel(y: number[]): number {
  const counts = new Map<number, number>();
  for (const l of y) counts.set(l, (counts.get(l) ?? 0) + 1);
  let best = y[0];
  let bestCount = -1;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

function buildTree(X: number[][], y: number[], depth = 0, maxDepth = 4, minSamples = 2): TreeNode {
  if (new Set(y).size === 1 || y.length < minSamples || depth >= maxDepth) {
    return { label: majorityLabel(y) };
  }

  const { feature, threshold, gain } = bestSplit(X, y);
  if (feature === null || threshold === null || gain <= 0) {
    return { label: majorityLabel(y) };
  }

  const leftX: number[][] = [], leftY: number[] = [], rightX: number[][] = [], rightY: number[] = [];
  for (let i = 0; i < X.length; i++) {
    if (X[i][feature] <= threshold) {
      leftX.push(X[i]);
      leftY.push(y[i]);
    } else {
      rightX.push(X[i]);
      rightY.push(y[i]);
    }
  }

  return {
    feature,
    threshold,
    left: buildTree(leftX, leftY, depth + 1, maxDepth, minSamples),
    right: buildTree(rightX, rightY, depth + 1, maxDepth, minSamples),
  };
}

function predictOne(node: TreeNode, x: number[]): number {
  let current = node;
  while (current.label === undefined) {
    current = x[current.feature!] <= current.threshold! ? current.left! : current.right!;
  }
  return current.label;
}
```

```cpp
#include <vector>
#include <set>
#include <map>
#include <memory>
#include <optional>
#include <algorithm>

struct Node {
    std::optional<int> feature;
    std::optional<double> threshold;
    std::unique_ptr<Node> left, right;
    std::optional<int> label;

    bool isLeaf() const { return label.has_value(); }
};

double gini(const std::vector<int>& labels) {
    if (labels.empty()) return 0.0;
    std::map<int, int> counts;
    for (int l : labels) counts[l]++;
    double sum = 0.0;
    for (auto& [_, c] : counts) {
        double p = static_cast<double>(c) / labels.size();
        sum += p * p;
    }
    return 1.0 - sum;
}

int majorityLabel(const std::vector<int>& y) {
    std::map<int, int> counts;
    for (int l : y) counts[l]++;
    int best = y[0], bestCount = -1;
    for (auto& [label, count] : counts) {
        if (count > bestCount) { best = label; bestCount = count; }
    }
    return best;
}

struct SplitResult { std::optional<int> feature; std::optional<double> threshold; double gain; };

SplitResult bestSplit(const std::vector<std::vector<double>>& X, const std::vector<int>& y) {
    size_t nSamples = X.size(), nFeatures = X[0].size();
    double bestGain = 0.0, parentImpurity = gini(y);
    std::optional<int> bestFeature;
    std::optional<double> bestThreshold;

    for (size_t feature = 0; feature < nFeatures; feature++) {
        std::set<double> values;
        for (auto& row : X) values.insert(row[feature]);
        for (double threshold : values) {
            std::vector<int> leftY, rightY;
            for (size_t i = 0; i < nSamples; i++) {
                (X[i][feature] <= threshold ? leftY : rightY).push_back(y[i]);
            }
            if (leftY.empty() || rightY.empty()) continue;
            double weighted = (static_cast<double>(leftY.size()) / nSamples) * gini(leftY)
                             + (static_cast<double>(rightY.size()) / nSamples) * gini(rightY);
            double gain = parentImpurity - weighted;
            if (gain > bestGain) {
                bestGain = gain;
                bestFeature = static_cast<int>(feature);
                bestThreshold = threshold;
            }
        }
    }
    return { bestFeature, bestThreshold, bestGain };
}

std::unique_ptr<Node> buildTree(const std::vector<std::vector<double>>& X, const std::vector<int>& y,
                                 int depth = 0, int maxDepth = 4, size_t minSamples = 2) {
    std::set<int> distinct(y.begin(), y.end());
    auto leaf = [&]() {
        auto node = std::make_unique<Node>();
        node->label = majorityLabel(y);
        return node;
    };
    if (distinct.size() == 1 || y.size() < minSamples || depth >= maxDepth) return leaf();

    auto [feature, threshold, gain] = bestSplit(X, y);
    if (!feature.has_value() || gain <= 0) return leaf();

    std::vector<std::vector<double>> leftX, rightX;
    std::vector<int> leftY, rightY;
    for (size_t i = 0; i < X.size(); i++) {
        if (X[i][*feature] <= *threshold) { leftX.push_back(X[i]); leftY.push_back(y[i]); }
        else { rightX.push_back(X[i]); rightY.push_back(y[i]); }
    }

    auto node = std::make_unique<Node>();
    node->feature = feature;
    node->threshold = threshold;
    node->left = buildTree(leftX, leftY, depth + 1, maxDepth, minSamples);
    node->right = buildTree(rightX, rightY, depth + 1, maxDepth, minSamples);
    return node;
}

int predictOne(const Node* node, const std::vector<double>& x) {
    while (!node->isLeaf()) {
        node = (x[*node->feature] <= *node->threshold) ? node->left.get() : node->right.get();
    }
    return *node->label;
}
```

```rust
struct Node {
    feature: Option<usize>,
    threshold: Option<f64>,
    left: Option<Box<Node>>,
    right: Option<Box<Node>>,
    label: Option<i32>,
}

impl Node {
    fn is_leaf(&self) -> bool {
        self.label.is_some()
    }
}

fn gini(labels: &[i32]) -> f64 {
    if labels.is_empty() {
        return 0.0;
    }
    let mut counts = std::collections::HashMap::new();
    for &l in labels {
        *counts.entry(l).or_insert(0) += 1;
    }
    let n = labels.len() as f64;
    1.0 - counts.values().map(|&c| (c as f64 / n).powi(2)).sum::<f64>()
}

fn majority_label(y: &[i32]) -> i32 {
    let mut counts = std::collections::HashMap::new();
    for &l in y {
        *counts.entry(l).or_insert(0) += 1;
    }
    *counts.iter().max_by_key(|&(_, &c)| c).unwrap().0
}

fn best_split(x: &[Vec<f64>], y: &[i32]) -> (Option<usize>, Option<f64>, f64) {
    let n_samples = x.len();
    let n_features = x[0].len();
    let parent_impurity = gini(y);
    let mut best_gain = 0.0;
    let mut best_feature = None;
    let mut best_threshold = None;

    for feature in 0..n_features {
        let mut values: Vec<f64> = x.iter().map(|row| row[feature]).collect();
        values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        values.dedup();
        for &threshold in &values {
            let mut left_y = Vec::new();
            let mut right_y = Vec::new();
            for i in 0..n_samples {
                if x[i][feature] <= threshold {
                    left_y.push(y[i]);
                } else {
                    right_y.push(y[i]);
                }
            }
            if left_y.is_empty() || right_y.is_empty() {
                continue;
            }
            let weighted = (left_y.len() as f64 / n_samples as f64) * gini(&left_y)
                + (right_y.len() as f64 / n_samples as f64) * gini(&right_y);
            let gain = parent_impurity - weighted;
            if gain > best_gain {
                best_gain = gain;
                best_feature = Some(feature);
                best_threshold = Some(threshold);
            }
        }
    }
    (best_feature, best_threshold, best_gain)
}

fn build_tree(x: &[Vec<f64>], y: &[i32], depth: usize, max_depth: usize, min_samples: usize) -> Node {
    let distinct: std::collections::HashSet<_> = y.iter().collect();
    if distinct.len() == 1 || y.len() < min_samples || depth >= max_depth {
        return Node { feature: None, threshold: None, left: None, right: None, label: Some(majority_label(y)) };
    }

    let (feature, threshold, gain) = best_split(x, y);
    let (Some(feature), Some(threshold)) = (feature, threshold) else {
        return Node { feature: None, threshold: None, left: None, right: None, label: Some(majority_label(y)) };
    };
    if gain <= 0.0 {
        return Node { feature: None, threshold: None, left: None, right: None, label: Some(majority_label(y)) };
    }

    let mut left_x = Vec::new();
    let mut left_y = Vec::new();
    let mut right_x = Vec::new();
    let mut right_y = Vec::new();
    for i in 0..x.len() {
        if x[i][feature] <= threshold {
            left_x.push(x[i].clone());
            left_y.push(y[i]);
        } else {
            right_x.push(x[i].clone());
            right_y.push(y[i]);
        }
    }

    Node {
        feature: Some(feature),
        threshold: Some(threshold),
        left: Some(Box::new(build_tree(&left_x, &left_y, depth + 1, max_depth, min_samples))),
        right: Some(Box::new(build_tree(&right_x, &right_y, depth + 1, max_depth, min_samples))),
        label: None,
    }
}

fn predict_one(node: &Node, x: &[f64]) -> i32 {
    let mut current = node;
    while !current.is_leaf() {
        current = if x[current.feature.unwrap()] <= current.threshold.unwrap() {
            current.left.as_ref().unwrap()
        } else {
            current.right.as_ref().unwrap()
        };
    }
    current.label.unwrap()
}
```

```csharp
class TreeNode
{
    public int? Feature;
    public double? Threshold;
    public TreeNode? Left;
    public TreeNode? Right;
    public int? Label;
    public bool IsLeaf => Label.HasValue;
}

static class DecisionTree
{
    static double Gini(List<int> labels)
    {
        int n = labels.Count;
        if (n == 0) return 0.0;
        var counts = labels.GroupBy(l => l).Select(g => g.Count());
        return 1.0 - counts.Sum(c => Math.Pow((double)c / n, 2));
    }

    static int MajorityLabel(List<int> y) =>
        y.GroupBy(l => l).OrderByDescending(g => g.Count()).First().Key;

    static (int? feature, double? threshold, double gain) BestSplit(List<double[]> X, List<int> y)
    {
        int nSamples = X.Count, nFeatures = X[0].Length;
        double bestGain = 0.0, parentImpurity = Gini(y);
        int? bestFeature = null;
        double? bestThreshold = null;

        for (int feature = 0; feature < nFeatures; feature++)
        {
            var thresholds = X.Select(row => row[feature]).Distinct().OrderBy(v => v);
            foreach (var threshold in thresholds)
            {
                var leftY = new List<int>();
                var rightY = new List<int>();
                for (int i = 0; i < nSamples; i++)
                    (X[i][feature] <= threshold ? leftY : rightY).Add(y[i]);
                if (leftY.Count == 0 || rightY.Count == 0) continue;
                double weighted = (double)leftY.Count / nSamples * Gini(leftY) + (double)rightY.Count / nSamples * Gini(rightY);
                double gain = parentImpurity - weighted;
                if (gain > bestGain)
                {
                    bestGain = gain;
                    bestFeature = feature;
                    bestThreshold = threshold;
                }
            }
        }
        return (bestFeature, bestThreshold, bestGain);
    }

    public static TreeNode BuildTree(List<double[]> X, List<int> y, int depth = 0, int maxDepth = 4, int minSamples = 2)
    {
        if (y.Distinct().Count() == 1 || y.Count < minSamples || depth >= maxDepth)
            return new TreeNode { Label = MajorityLabel(y) };

        var (feature, threshold, gain) = BestSplit(X, y);
        if (feature is null || gain <= 0)
            return new TreeNode { Label = MajorityLabel(y) };

        var leftX = new List<double[]>(); var leftY = new List<int>();
        var rightX = new List<double[]>(); var rightY = new List<int>();
        for (int i = 0; i < X.Count; i++)
        {
            if (X[i][feature.Value] <= threshold!.Value) { leftX.Add(X[i]); leftY.Add(y[i]); }
            else { rightX.Add(X[i]); rightY.Add(y[i]); }
        }

        return new TreeNode
        {
            Feature = feature,
            Threshold = threshold,
            Left = BuildTree(leftX, leftY, depth + 1, maxDepth, minSamples),
            Right = BuildTree(rightX, rightY, depth + 1, maxDepth, minSamples),
        };
    }

    static int PredictOne(TreeNode node, double[] x)
    {
        var current = node;
        while (!current.IsLeaf)
            current = x[current.Feature!.Value] <= current.Threshold!.Value ? current.Left! : current.Right!;
        return current.Label!.Value;
    }
}
```
