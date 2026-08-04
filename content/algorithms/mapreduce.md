---
name: MapReduce
category: 並行処理・並列アルゴリズム
subcategory: 並列計算パターン
complexity: O(データサイズ / ノード数)(理想的な負荷分散時)
summary: 「独立に変換する(Map)」と「同じキーごとに集約する(Reduce)」という2つの単純な操作の組み合わせに計算を落とし込むことで、大規模データ処理を数千台のマシンに自動分散させるプログラミングモデル。
---

## 概要

数十億件のWebページから単語の出現頻度を数える、といった超大規模なデータ処理を、1台のマシンで行うのは現実的でない。2004年にGoogleのジェフリー・ディーンとサンジェイ・ゲマワットが発表したMapReduceは、こうした大規模データ処理の多くが「各データ片を独立に何らかの形に変換する」処理と「同じキーを持つ結果同士を集約する」処理の組み合わせとして表現できるという洞察に基づき、この2つの操作(Map・Reduce)だけをプログラマが定義すれば、データの分散配置・並列実行・障害からの回復・結果の集約といった分散処理の困難な部分を全てフレームワークが自動的に処理してくれる、というプログラミングモデルである。関数型プログラミングの`map`と`fold(reduce)`という馴染み深い概念を、大規模分散システムのスケールに引き上げたものと理解できる。

## 仕組み

1. **Map フェーズ**: 入力データを多数の断片(スプリット)に分割し、それぞれを異なるマシン(ワーカー)に割り当てる。各ワーカーは、担当する断片の各レコードに対してユーザー定義の`map`関数を適用し、`(キー, 値)`のペアを出力する(単語カウントの例なら、テキスト中の各単語について`(その単語, 1)`というペアを出力する)
2. **シャッフル・ソート**: 全ワーカーが出力した`(キー, 値)`ペアを、同じキーを持つものが同じReducerワーカーに集まるように、ネットワーク越しに再配置する(ハッシュ関数でキーからReducerを決定する)。各Reducerでは、受け取ったペアをキーでソートし、同じキーのペアをグループ化する([並列マージソート](/algorithms/parallel-merge-sort)のような並列ソート技術がこの段階の実装で使われる)
3. **Reduce フェーズ**: 各Reducerワーカーは、担当するキーごとに、そのキーに紐づく全ての値のリストに対してユーザー定義の`reduce`関数を適用し、最終結果を出力する(単語カウントの例なら、各単語について、その単語に紐づく`1`のリストの合計を計算する)
4. フレームワークは、各ワーカーの生存監視、失敗したタスクの別マシンでの再実行、データの局所性を考慮したタスク配置(データが既にあるマシンでMap処理を実行する)といった分散処理の煩雑な部分を全て裏側で自動的に管理する

## 特性・トレードオフ

- **計算量**: 理想的にはデータサイズをノード数で割った分だけの処理を各ノードが担当するため、ノード数を増やすほど処理時間が短縮される(線形スケーラビリティ)。ただしシャッフルフェーズのネットワーク通信コストがボトルネックになりやすく、実際のスケーラビリティはこの通信量に大きく左右される
- **障害耐性**: 数千台規模のマシンで長時間の処理を行うと、一部のマシンが途中で故障することは避けられない。MapReduceは各タスクの結果を冪等(同じタスクを再実行しても結果が変わらない)に保つ設計により、故障したタスクを他のマシンで単純に再実行するだけで全体の処理を継続できる、シンプルながら強力な障害耐性を実現している
- **プログラミングモデルの制約とのトレードオフ**: 計算をMap/Reduceの2段階に押し込める制約は、多くのバッチ処理には適合するが、[並列プレフィックス和](/algorithms/parallel-prefix-sum)のような要素間の依存関係が複雑な計算や、反復的なアルゴリズム(グラフ探索、機械学習の勾配降下法の繰り返し)には表現しにくい場面もあり、これらの制約を緩和したSpark等の後継フレームワークが発展した
- **使いどころ**: 大規模ログ解析、検索インデックスの構築(元々Googleが検索インデックス作成のために開発した)、大規模データセットに対する集計・変換処理全般。Hadoop MapReduceをはじめ、多くのオープンソース分散処理フレームワークの設計思想の原点になっている

## 実装例

単一プロセス内でMap・Shuffle・Reduceの3フェーズを関数として分離し、単語カウントを例に模擬したシミュレーション実装。

```python
from collections import defaultdict


def map_phase(documents: list[str]) -> list[tuple[str, int]]:
    """各ドキュメントを独立に処理し、(単語, 1) のペアを出力する"""
    pairs = []
    for doc in documents:
        for word in doc.lower().split():
            pairs.append((word, 1))
    return pairs


def shuffle_phase(pairs: list[tuple[str, int]]) -> dict[str, list[int]]:
    """同じキーを持つペアを、そのキーに紐づくReducerへ集約する"""
    grouped: dict[str, list[int]] = defaultdict(list)
    for key, value in pairs:
        grouped[key].append(value)
    return grouped


def reduce_phase(grouped: dict[str, list[int]]) -> dict[str, int]:
    """各キーごとに値のリストを集約する"""
    return {key: sum(values) for key, values in grouped.items()}


def map_reduce(documents: list[str]) -> dict[str, int]:
    return reduce_phase(shuffle_phase(map_phase(documents)))
```

```typescript
function mapPhase(documents: string[]): [string, number][] {
  const pairs: [string, number][] = [];
  for (const doc of documents) {
    for (const word of doc.toLowerCase().split(/\s+/).filter(Boolean)) {
      pairs.push([word, 1]);
    }
  }
  return pairs;
}

function shufflePhase(pairs: [string, number][]): Map<string, number[]> {
  const grouped = new Map<string, number[]>();
  for (const [key, value] of pairs) {
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(value);
  }
  return grouped;
}

function reducePhase(grouped: Map<string, number[]>): Map<string, number> {
  const result = new Map<string, number>();
  for (const [key, values] of grouped) {
    result.set(
      key,
      values.reduce((a, b) => a + b, 0)
    );
  }
  return result;
}

function mapReduce(documents: string[]): Map<string, number> {
  return reducePhase(shufflePhase(mapPhase(documents)));
}
```

```cpp
#include <string>
#include <vector>
#include <unordered_map>
#include <sstream>
#include <algorithm>
#include <cctype>

std::vector<std::pair<std::string, int>> mapPhase(const std::vector<std::string>& documents) {
    std::vector<std::pair<std::string, int>> pairs;
    for (const auto& doc : documents) {
        std::string lower = doc;
        std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
        std::istringstream iss(lower);
        std::string word;
        while (iss >> word) pairs.push_back({word, 1});
    }
    return pairs;
}

std::unordered_map<std::string, std::vector<int>> shufflePhase(
    const std::vector<std::pair<std::string, int>>& pairs) {
    std::unordered_map<std::string, std::vector<int>> grouped;
    for (const auto& [key, value] : pairs) grouped[key].push_back(value);
    return grouped;
}

std::unordered_map<std::string, int> reducePhase(
    const std::unordered_map<std::string, std::vector<int>>& grouped) {
    std::unordered_map<std::string, int> result;
    for (const auto& [key, values] : grouped) {
        int sum = 0;
        for (int v : values) sum += v;
        result[key] = sum;
    }
    return result;
}

std::unordered_map<std::string, int> mapReduce(const std::vector<std::string>& documents) {
    return reducePhase(shufflePhase(mapPhase(documents)));
}
```

```rust
use std::collections::HashMap;

fn map_phase(documents: &[&str]) -> Vec<(String, i32)> {
    let mut pairs = Vec::new();
    for doc in documents {
        for word in doc.to_lowercase().split_whitespace() {
            pairs.push((word.to_string(), 1));
        }
    }
    pairs
}

fn shuffle_phase(pairs: Vec<(String, i32)>) -> HashMap<String, Vec<i32>> {
    let mut grouped: HashMap<String, Vec<i32>> = HashMap::new();
    for (key, value) in pairs {
        grouped.entry(key).or_insert_with(Vec::new).push(value);
    }
    grouped
}

fn reduce_phase(grouped: HashMap<String, Vec<i32>>) -> HashMap<String, i32> {
    grouped.into_iter().map(|(k, v)| (k, v.iter().sum())).collect()
}

fn map_reduce(documents: &[&str]) -> HashMap<String, i32> {
    reduce_phase(shuffle_phase(map_phase(documents)))
}
```

```csharp
static List<(string word, int count)> MapPhase(List<string> documents)
{
    var pairs = new List<(string, int)>();
    foreach (var doc in documents)
        foreach (var word in doc.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            pairs.Add((word, 1));
    return pairs;
}

static Dictionary<string, List<int>> ShufflePhase(List<(string word, int count)> pairs)
{
    var grouped = new Dictionary<string, List<int>>();
    foreach (var (key, value) in pairs)
    {
        if (!grouped.ContainsKey(key)) grouped[key] = new List<int>();
        grouped[key].Add(value);
    }
    return grouped;
}

static Dictionary<string, int> ReducePhase(Dictionary<string, List<int>> grouped)
{
    return grouped.ToDictionary(kv => kv.Key, kv => kv.Value.Sum());
}

static Dictionary<string, int> MapReduce(List<string> documents)
{
    return ReducePhase(ShufflePhase(MapPhase(documents)));
}
```
