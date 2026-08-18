---
name: レーベンシュタインオートマトン(Levenshtein Automaton)
category: 文字列
subcategory: パターンマッチング
complexity: O(n × min(m, k))(1単語あたりの走査。nは単語長、mはクエリ長、kは許容編集距離)
summary: 編集距離k以内の文字列をすべて受理する有限オートマトンを構築し、辞書やトライを1回走査するだけで編集距離k以内の候補すべてを高速に列挙できるようにする、あいまい検索の基盤技術。
---

## 概要

「クエリ文字列`Q`から編集距離(挿入・削除・置換の最小回数)がk以内であるような単語を、辞書の中から全て見つけたい」というあいまい検索(スペル訂正、近似文字列検索)の問題を考える。素朴には辞書中の各単語について動的計画法で編集距離を計算すればよいが(1単語あたりO(nm)、動的計画法による編集距離の計算そのものについては、より一般のバイオインフォマティクス文脈で[配列アラインメント](/algorithms/needleman-wunsch)系のアルゴリズムが詳しい)、辞書が巨大な場合これは非常に遅い。レーベンシュタインオートマトンは、クエリ`Q`と許容編集距離`k`から**「`Q`から編集距離k以内の文字列を全て、かつそれだけを受理する」有限オートマトン**を構築し、これを辞書のトライ構造と同時に走査することで、辞書全体を高速に(実質的に辞書のサイズにほぼ比例する時間で)探索できるようにする手法である。ElasticsearchやLuceneの`fuzzy`検索、スペルチェッカーの候補提示などで実用されている。

## 仕組み

1. **状態の設計**: レーベンシュタインオートマトンの状態は、クエリ`Q`(長さ`m`)に対する動的計画法の編集距離テーブルの**1行分**に相当する情報を持つ。具体的には、辞書側の文字列を1文字読み進めるたびに「その時点までの各プレフィックス長`j`に対する編集距離が`k`以下かどうか、実際の値はいくつか」という情報の集合を状態として管理する
2. **遷移**: ある状態(=動的計画法テーブルのある行)で新しい文字`c`を読むと、通常の編集距離DPの漸化式(挿入・削除・置換の3通りの最小値を取る)に従って次の行を計算でき、これが次の状態への遷移になる。この遷移はクエリ`Q`と許容誤り数`k`だけから決まり、**辞書側の文字列とは独立に事前計算できる**
3. **受理状態**: ある状態(行)の中に、`Q`の全長`m`に対応する列の値が`k`以下であるものが含まれていれば、その状態は受理状態であり、そこまでに読んだ辞書側の文字列は`Q`から編集距離`k`以内であることを意味する
4. **状態数の抑制**: 素朴には状態(行全体の値の組み合わせ)の数は膨大になりうるが、「編集距離k以内かどうか」だけに関心があるため、行の値のうち`k`を超える部分は全て「枝刈り」でき、実際に到達しうる状態数はクエリ長`m`に依存せず**`k`のみに依存する形(状態数がO(1)、正確には`k`に応じた定数個)**に落とし込める。これにより、辞書側の文字を1文字読むたびの遷移がO(1)〜O(k)で行える
5. **トライとの同時走査**: 辞書全体を[トライ](/algorithms/trie)(接頭辞木)として構築しておき、レーベンシュタインオートマトンの状態遷移をトライの各辺をたどるのと**同時に**進めていく。この「積オートマトン」的な探索により、共通の接頭辞を持つ辞書中の単語群に対する計算が共有され、辞書全体をO(辞書サイズ)程度の実質的な計算量で走査しながら、編集距離k以内の全ての単語を効率よく列挙できる

## 特性・トレードオフ

- **計算量**: 状態数が`k`のみに依存する(クエリ長`m`に依存しない)ため、レーベンシュタインオートマトン単体の遷移コストは各文字あたりO(k)程度に抑えられる。辞書をトライと組み合わせて走査する場合、全体としては辞書のサイズ(トライのノード数)にほぼ比例する時間で編集距離k以内の候補を全て求められる
- **前処理と再利用性**: オートマトンの構築自体はクエリ`Q`と`k`のみに依存し、辞書の中身には依存しない。そのため一度構築すれば、同じクエリに対して複数の辞書やインデックスに対して使い回せる
- **編集距離DPとの関係**: レーベンシュタインオートマトンは、素朴な編集距離の動的計画法を「辞書中の全単語について毎回計算し直す」のではなく、「クエリ側の計算をオートマトンとして1回だけ構築し、辞書側の探索と同時並行に進める」ことで無駄な再計算を省く、という発想の転換に基づく。KMP法が「パターン側の自己相似性を事前解析する」のと同様に、「クエリ側の情報を先に構造化しておく」という設計思想を共有している
- **Damerau-Levenshtein距離への拡張**: 転置(隣接2文字の入れ替え)も1回の編集として数える拡張版の編集距離に対しても、同様の考え方でオートマトンを構築できる(状態にわずかな追加情報を持たせる必要がある)
- **使いどころ**: Elasticsearch/Luceneの`fuzzy`クエリ(あいまい検索)、スペルチェッカー・入力補完における候補提示、DNA配列の近似マッチング、大規模辞書に対する高速なあいまい文字列検索全般

## 実装例

簡略化のため、状態を「動的計画法の行全体(配列)」として素朴に表現し、トライと同時に深さ優先探索する実装を示す(実用実装では状態を圧縮してハッシュ化・キャッシュすることで、同じ状態への遷移計算を再利用しさらに高速化する)。

```python
class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


def build_trie(words: list[str]) -> TrieNode:
    root = TrieNode()
    for w in words:
        node = root
        for c in w:
            node = node.children.setdefault(c, TrieNode())
        node.is_word = True
    return root


def _initial_row(m: int) -> list[int]:
    return list(range(m + 1))


def _next_row(prev_row: list[int], query: str, char: str) -> list[int]:
    m = len(query)
    row = [prev_row[0] + 1]
    for j in range(1, m + 1):
        cost = 0 if query[j - 1] == char else 1
        row.append(
            min(
                row[j - 1] + 1,       # 挿入
                prev_row[j] + 1,      # 削除
                prev_row[j - 1] + cost,  # 置換(または一致)
            )
        )
    return row


def levenshtein_automaton_search(words: list[str], query: str, k: int) -> list[str]:
    """レーベンシュタインオートマトンをトライと同時に走査し、
    queryから編集距離k以内の単語を全て返す"""
    trie = build_trie(words)
    results: list[str] = []
    initial_row = _initial_row(len(query))

    def dfs(node: TrieNode, prefix: str, row: list[int]) -> None:
        if min(row) > k:
            return  # このプレフィックス以降、編集距離k以内には絶対に到達できない(枝刈り)
        if node.is_word and row[-1] <= k:
            results.append(prefix)
        for c, child in node.children.items():
            next_row = _next_row(row, query, c)
            dfs(child, prefix + c, next_row)

    dfs(trie, "", initial_row)
    return results
```

```typescript
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isWord = false;
}

function buildTrie(words: string[]): TrieNode {
  const root = new TrieNode();
  for (const w of words) {
    let node = root;
    for (const c of w) {
      if (!node.children.has(c)) node.children.set(c, new TrieNode());
      node = node.children.get(c) as TrieNode;
    }
    node.isWord = true;
  }
  return root;
}

function initialRow(m: number): number[] {
  return Array.from({ length: m + 1 }, (_, i) => i);
}

function nextRow(prevRow: number[], query: string, char: string): number[] {
  const m = query.length;
  const row = [prevRow[0] + 1];
  for (let j = 1; j <= m; j++) {
    const cost = query[j - 1] === char ? 0 : 1;
    row.push(
      Math.min(
        row[j - 1] + 1, // 挿入
        prevRow[j] + 1, // 削除
        prevRow[j - 1] + cost, // 置換(または一致)
      ),
    );
  }
  return row;
}

/** レーベンシュタインオートマトンをトライと同時に走査し、queryから編集距離k以内の単語を全て返す */
function levenshteinAutomatonSearch(
  words: string[],
  query: string,
  k: number,
): string[] {
  const trie = buildTrie(words);
  const results: string[] = [];
  const initial = initialRow(query.length);

  const dfs = (node: TrieNode, prefix: string, row: number[]): void => {
    if (Math.min(...row) > k) return; // このプレフィックス以降、編集距離k以内には絶対に到達できない(枝刈り)
    if (node.isWord && row[row.length - 1] <= k) {
      results.push(prefix);
    }
    for (const [c, child] of node.children) {
      const next = nextRow(row, query, c);
      dfs(child, prefix + c, next);
    }
  };

  dfs(trie, "", initial);
  return results;
}
```
