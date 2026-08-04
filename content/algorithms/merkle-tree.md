---
name: マークル木(Merkle Tree)
category: 分散システム
subcategory: データ分散・整合性
complexity: O(log n)(改ざん検証、n=葉ノード数)、O(n)(木の構築)
summary: 大量のデータをハッシュ値の二分木として階層的に要約し、木の根(ルートハッシュ)を1つ比較するだけで大量データ全体の一致・不一致を検証でき、不一致があった場合も対数時間でどの部分が異なるかを特定できる木構造。
---

## 概要

2つのノードが持つ大量のデータ(例えば数百万件のレコード)が完全に一致しているかを確認したい場合、素朴には全データを転送して比較する必要があり、通信量が膨大になる。1979年にラルフ・マークル(Merkle)が発表したマークル木は、この問題を巧妙に解決する——各データブロックのハッシュ値を葉ノードとして持ち、隣接する2つのノードのハッシュ値をさらにハッシュ化したものを親ノードとする、という操作を木の根に到達するまで繰り返す二分木を構築する。すると「木の根のハッシュ値(ルートハッシュ)」というたった1つの値を比較するだけで、配下の全データが完全に一致しているかどうかを検証でき、もし不一致があった場合も、木を根から葉へたどるだけで対数時間で「どの部分のデータが異なるか」まで特定できる。ビットコインのブロックチェーンにおけるトランザクションの検証や、Gitのコミット履歴の整合性保証など、現代の分散システムの根幹を支える構造である。

## 仕組み

1. 検証したいデータを複数のブロック(ファイルの断片、トランザクションのリストなど)に分割する
2. 各データブロックにハッシュ関数(SHA-256等)を適用し、そのハッシュ値を木の葉ノードとする
3. 隣接する2つの葉ノードのハッシュ値を連結し、それに再びハッシュ関数を適用した値を、その2つの葉の親ノードとする
4. この「隣接する2つのハッシュを連結してハッシュ化する」操作を、1つの根ノード(ルートハッシュ)に到達するまで繰り返す(葉の数が奇数の場合は最後の1つを複製するなどの調整を行う)
5. **検証**: 2つのシステムがルートハッシュを比較するだけで、配下の全データが完全に一致しているかどうかが分かる(ハッシュ関数の衝突耐性により、データが1ビットでも異なればルートハッシュもほぼ確実に異なる)
6. **不一致箇所の特定(マークル証明)**: ルートハッシュが異なる場合、両者は木を根から辿りながら、左右の子ノードのハッシュ値を比較する。異なる方の部分木だけを再帰的に降りていくことで、`O(log n)`回の比較だけで実際に異なるデータブロックまで特定できる

## 特性・トレードオフ

- **計算量**: 木の構築自体は全データを1回ずつハッシュ化する`O(n)`。ルートハッシュが一致するかどうかの検証は`O(1)`(1回のハッシュ比較)、不一致箇所の特定は木の高さに比例する`O(log n)`——大量データの整合性検証を対数時間まで圧縮できる点が最大の価値
- **[ゴシッププロトコル](/algorithms/gossip-protocol)との組み合わせによる効率的な同期**: 分散データベース(CassandraやDynamoなど)では、各ノードが保持するデータのマークル木を構築し、ノード間でルートハッシュから比較を始めて不一致のある部分木だけをたどることで、[ゴシッププロトコル](/algorithms/gossip-protocol)による反エントロピー(データ同期)の際に転送するデータ量を大幅に削減できる
- **改ざん検知の強さ**: ハッシュ関数の一方向性(衝突を意図的に作るのが計算量的に困難)により、悪意のある者がデータの一部を改ざんしても、ルートハッシュを元のまま保つことは事実上不可能——この性質がブロックチェーンにおけるトランザクション改ざん防止の根幹を支えている
- **使いどころ**: ビットコイン・イーサリアムなどブロックチェーンにおけるブロック内トランザクションの整合性検証(ライトクライアントが全トランザクションをダウンロードせずに特定の1件だけを検証できる「SPV検証」の基盤)、Gitにおけるコミット履歴・ファイルツリーの整合性保証、分散ファイルシステム(IPFS等)におけるファイルの重複排除と検証、P2Pファイル共有(BitTorrent)における部分ダウンロードの検証

## 実装例

木の構築・ルートハッシュの改ざん検知・マークル証明による対数時間検証の3点を確認する(ハッシュ関数は暗号学的な強度ではなく仕組みの説明を優先し、FNV-1aで代用している)。

```python
def _fnv1a(s: str) -> int:
    h = 2166136261
    for byte in s.encode("utf-8"):
        h ^= byte
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _hash(s: str) -> str:
    return format(_fnv1a(s), "08x")


def build_merkle_tree(blocks: list[str]) -> list[list[str]]:
    """各レベルのハッシュ値リストを返す(levels[0]が葉、levels[-1]がルート1件)"""
    level = [_hash(b) for b in blocks]
    levels = [level]
    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]  # 葉の数が奇数なら最後を複製して偶数に揃える
        next_level = []
        for i in range(0, len(level), 2):
            next_level.append(_hash(level[i] + level[i + 1]))
        levels.append(next_level)
        level = next_level
    return levels


def merkle_root(blocks: list[str]) -> str:
    return build_merkle_tree(blocks)[-1][0]


def get_proof(blocks: list[str], index: int) -> list[tuple[str, bool]]:
    """指定した葉のマークル証明(兄弟ハッシュと、自分が右側の子かどうかの列)を返す"""
    levels = build_merkle_tree(blocks)
    proof = []
    idx = index
    for level in levels[:-1]:
        lvl = level if len(level) % 2 == 0 else level + [level[-1]]
        is_right = idx % 2 == 1
        sibling_idx = idx - 1 if is_right else idx + 1
        proof.append((lvl[sibling_idx], is_right))
        idx //= 2
    return proof


def verify_proof(leaf_hash: str, proof: list[tuple[str, bool]], root: str) -> bool:
    """証明に沿って葉から根までハッシュを再構築し、ルートハッシュと一致するか確認する"""
    h = leaf_hash
    for sibling, is_right in proof:
        h = _hash(sibling + h) if is_right else _hash(h + sibling)
    return h == root
```

```typescript
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hashHex(s: string): string {
  return fnv1a(s).toString(16).padStart(8, "0");
}

function buildMerkleTree(blocks: string[]): string[][] {
  let level = blocks.map((b) => hashHex(b));
  const levels: string[][] = [level];
  while (level.length > 1) {
    if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      nextLevel.push(hashHex(level[i] + level[i + 1]));
    }
    levels.push(nextLevel);
    level = nextLevel;
  }
  return levels;
}

function merkleRoot(blocks: string[]): string {
  const levels = buildMerkleTree(blocks);
  return levels[levels.length - 1][0];
}

function getProof(blocks: string[], index: number): [string, boolean][] {
  const levels = buildMerkleTree(blocks);
  const proof: [string, boolean][] = [];
  let idx = index;
  for (let li = 0; li < levels.length - 1; li++) {
    let lvl = levels[li];
    if (lvl.length % 2 === 1) lvl = [...lvl, lvl[lvl.length - 1]];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    proof.push([lvl[siblingIdx], isRight]);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

function verifyProof(leafHash: string, proof: [string, boolean][], root: string): boolean {
  let h = leafHash;
  for (const [sibling, isRight] of proof) {
    h = isRight ? hashHex(sibling + h) : hashHex(h + sibling);
  }
  return h === root;
}
```

```cpp
#include <string>
#include <vector>
#include <cstdint>
#include <sstream>
#include <iomanip>

uint32_t fnv1a(const std::string& s) {
    uint32_t h = 0x811c9dc5;
    for (unsigned char c : s) {
        h ^= c;
        h *= 0x01000193u;
    }
    return h;
}

std::string hashHex(const std::string& s) {
    std::ostringstream oss;
    oss << std::hex << std::setw(8) << std::setfill('0') << fnv1a(s);
    return oss.str();
}

std::vector<std::vector<std::string>> buildMerkleTree(const std::vector<std::string>& blocks) {
    std::vector<std::string> level;
    for (auto& b : blocks) level.push_back(hashHex(b));
    std::vector<std::vector<std::string>> levels{level};
    while (level.size() > 1) {
        if (level.size() % 2 == 1) level.push_back(level.back());
        std::vector<std::string> nextLevel;
        for (size_t i = 0; i < level.size(); i += 2) {
            nextLevel.push_back(hashHex(level[i] + level[i + 1]));
        }
        levels.push_back(nextLevel);
        level = nextLevel;
    }
    return levels;
}

std::string merkleRoot(const std::vector<std::string>& blocks) {
    auto levels = buildMerkleTree(blocks);
    return levels.back()[0];
}

std::vector<std::pair<std::string, bool>> getProof(const std::vector<std::string>& blocks, int index) {
    auto levels = buildMerkleTree(blocks);
    std::vector<std::pair<std::string, bool>> proof;
    int idx = index;
    for (size_t li = 0; li + 1 < levels.size(); li++) {
        auto lvl = levels[li];
        if (lvl.size() % 2 == 1) lvl.push_back(lvl.back());
        bool isRight = idx % 2 == 1;
        int siblingIdx = isRight ? idx - 1 : idx + 1;
        proof.push_back({lvl[siblingIdx], isRight});
        idx /= 2;
    }
    return proof;
}

bool verifyProof(const std::string& leafHash, const std::vector<std::pair<std::string, bool>>& proof,
                  const std::string& root) {
    std::string h = leafHash;
    for (auto& [sibling, isRight] : proof) {
        h = isRight ? hashHex(sibling + h) : hashHex(h + sibling);
    }
    return h == root;
}
```

```rust
fn fnv1a(s: &str) -> u32 {
    let mut h: u32 = 0x811c9dc5;
    for b in s.bytes() {
        h ^= b as u32;
        h = h.wrapping_mul(0x01000193);
    }
    h
}

fn hash_hex(s: &str) -> String {
    format!("{:08x}", fnv1a(s))
}

fn build_merkle_tree(blocks: &[String]) -> Vec<Vec<String>> {
    let mut level: Vec<String> = blocks.iter().map(|b| hash_hex(b)).collect();
    let mut levels = vec![level.clone()];
    while level.len() > 1 {
        if level.len() % 2 == 1 {
            let last = level.last().unwrap().clone();
            level.push(last);
        }
        let mut next_level = Vec::new();
        let mut i = 0;
        while i < level.len() {
            next_level.push(hash_hex(&format!("{}{}", level[i], level[i + 1])));
            i += 2;
        }
        levels.push(next_level.clone());
        level = next_level;
    }
    levels
}

fn merkle_root(blocks: &[String]) -> String {
    let levels = build_merkle_tree(blocks);
    levels[levels.len() - 1][0].clone()
}

fn get_proof(blocks: &[String], index: usize) -> Vec<(String, bool)> {
    let levels = build_merkle_tree(blocks);
    let mut proof = Vec::new();
    let mut idx = index;
    for li in 0..levels.len() - 1 {
        let mut lvl = levels[li].clone();
        if lvl.len() % 2 == 1 {
            let last = lvl.last().unwrap().clone();
            lvl.push(last);
        }
        let is_right = idx % 2 == 1;
        let sibling_idx = if is_right { idx - 1 } else { idx + 1 };
        proof.push((lvl[sibling_idx].clone(), is_right));
        idx /= 2;
    }
    proof
}

fn verify_proof(leaf_hash: &str, proof: &[(String, bool)], root: &str) -> bool {
    let mut h = leaf_hash.to_string();
    for (sibling, is_right) in proof {
        h = if *is_right { hash_hex(&format!("{}{}", sibling, h)) } else { hash_hex(&format!("{}{}", h, sibling)) };
    }
    h == root
}
```

```csharp
static uint Fnv1a(string s)
{
    uint h = 0x811c9dc5;
    foreach (var b in Encoding.UTF8.GetBytes(s))
    {
        h ^= b;
        h *= 0x01000193;
    }
    return h;
}

static string HashHex(string s) => Fnv1a(s).ToString("x8");

static List<List<string>> BuildMerkleTree(List<string> blocks)
{
    var level = blocks.Select(HashHex).ToList();
    var levels = new List<List<string>> { level };
    while (level.Count > 1)
    {
        if (level.Count % 2 == 1) level = level.Append(level[^1]).ToList();
        var nextLevel = new List<string>();
        for (int i = 0; i < level.Count; i += 2)
            nextLevel.Add(HashHex(level[i] + level[i + 1]));
        levels.Add(nextLevel);
        level = nextLevel;
    }
    return levels;
}

static string MerkleRoot(List<string> blocks)
{
    var levels = BuildMerkleTree(blocks);
    return levels[^1][0];
}

static List<(string, bool)> GetProof(List<string> blocks, int index)
{
    var levels = BuildMerkleTree(blocks);
    var proof = new List<(string, bool)>();
    int idx = index;
    for (int li = 0; li < levels.Count - 1; li++)
    {
        var lvl = levels[li];
        if (lvl.Count % 2 == 1) lvl = lvl.Append(lvl[^1]).ToList();
        bool isRight = idx % 2 == 1;
        int siblingIdx = isRight ? idx - 1 : idx + 1;
        proof.Add((lvl[siblingIdx], isRight));
        idx /= 2;
    }
    return proof;
}

static bool VerifyProof(string leafHash, List<(string, bool)> proof, string root)
{
    string h = leafHash;
    foreach (var (sibling, isRight) in proof)
        h = isRight ? HashHex(sibling + h) : HashHex(h + sibling);
    return h == root;
}
```
