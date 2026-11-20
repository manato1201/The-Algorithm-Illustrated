---
name: 転置インデックス
category: 情報検索・ランキング
subcategory: スコアリング
complexity: 構築 O(総語数)、AND検索 O(各語のposting長の和)
summary: 「文書→語」ではなく「語→その語を含む文書のリスト」を引ける索引。全文検索エンジンの土台で、複数語の検索はリストの共通部分(交差)で求める。
---

## 概要

文書が何百万件もあって、「検索」「アルゴリズム」の両方を含む文書を探したいとする。全文書を端から読んで文字列を探せば、文書数に比例する時間がかかる。検索のたびにこれをやるのは現実的でない。

本の巻末の索引は、語から出現ページを引ける。これをそのままコンピュータに持ち込んだものが**転置インデックス(inverted index)**である。「文書が語を持つ」という元の関係を**ひっくり返し**、「語が文書を持つ」形にしたので、そう呼ぶ。語を1つ引けば、その語を含む文書の一覧(posting list、ポスティングリスト)が直接得られる。全文検索エンジン(Lucene、Elasticsearch など)や、Web検索の中核の仕組みである。

## 仕組み

1. **解析(analysis)**: 文書を語(トークン)に分ける。小文字化、語幹抽出、ストップワードの除去などを施す。日本語では形態素解析や n-gram で分かち書きする
2. **索引の構築**: 各語について、その語を含む文書の ID を**昇順**に並べた posting list を作る。必要に応じて、語の出現回数(TF)や出現位置も添える
3. **検索**:
   - 1語: その語の posting list を返す
   - AND(両方含む): 2つの昇順リストを**同時に走査して共通部分を取る**(マージ)。短いリストから処理すると速い
   - OR(どちらかを含む): 2つのリストの和集合
   - フレーズ(語がこの順に連続する): 出現位置も持たせ、位置が1つずれて並ぶものを探す
4. **ランキング**: 一致した文書を、TF-IDF や BM25 などのスコアで並べ替える(索引に語頻度・文書長を持たせておく)

## 特性・トレードオフ

- **検索が速い**: 検索時の計算は、クエリの語の posting list の長さにしか依存しない。文書全体を読む必要がない
- **更新が重い**: 文書を追加すると、含まれる語の posting list それぞれに挿入が要る。実装では小さな索引を新しく作り、定期的に併合(マージ)する方式が一般的
- **サイズの圧縮が重要**: 文書IDは昇順なので、差分(隣との差)を取って可変長整数で符号化すると、大きく圧縮できる。メモリ・ディスク・キャッシュ効率のどれにも効く
- **交差を速くする工夫**: 長いリストの中でスキップできる「スキップポインタ」、リストを二分探索で飛び越える方法、ビットマップとの併用などがある
- **使いどころ**: 全文検索、ログ検索、メールや文書管理、データベースの全文索引、リコメンドの語の逆引き。画像や特徴ベクトルでは、似た考え方の[IVF](/algorithms/ivf-inverted-file-index)が使われる

## 実装例

```python
from collections import defaultdict


def tokenize(text):
    return text.lower().split()


def build_index(docs):
    index = defaultdict(list)
    for doc_id, text in enumerate(docs):
        for term in sorted(set(tokenize(text))):
            index[term].append(doc_id)       # doc_id は昇順に追加されるので、リストは昇順
    return index


def intersect(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            out.append(a[i])
            i += 1
            j += 1
        elif a[i] < b[j]:
            i += 1
        else:
            j += 1
    return out


def search_and(index, query):
    lists = sorted((index.get(t, []) for t in tokenize(query)), key=len)  # 短いリストから
    result = lists[0]
    for lst in lists[1:]:
        result = intersect(result, lst)
    return result


docs = [
    "sorting algorithms and data structures",
    "graph algorithms for shortest paths",
    "data structures for search engines",
    "search algorithms on graphs",
]
index = build_index(docs)
print(dict(index)["algorithms"])               # [0, 1, 3]
print(search_and(index, "search algorithms"))  # [3]
```

```typescript
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

function buildIndex(docs: string[]): Map<string, number[]> {
  const index = new Map<string, number[]>();
  docs.forEach((text, docId) => {
    for (const term of new Set(tokenize(text))) {
      const list = index.get(term) ?? [];
      list.push(docId); // docId は昇順に追加される
      index.set(term, list);
    }
  });
  return index;
}

function intersect(a: number[], b: number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push(a[i]);
      i++;
      j++;
    } else if (a[i] < b[j]) i++;
    else j++;
  }
  return out;
}

function searchAnd(index: Map<string, number[]>, query: string): number[] {
  const lists = tokenize(query)
    .map((t) => index.get(t) ?? [])
    .sort((x, y) => x.length - y.length);
  return lists.reduce((acc, lst) => intersect(acc, lst));
}

const docs = [
  "sorting algorithms and data structures",
  "graph algorithms for shortest paths",
  "data structures for search engines",
  "search algorithms on graphs",
];
const index = buildIndex(docs);
console.log(index.get("algorithms")); // [0, 1, 3]
console.log(searchAnd(index, "search algorithms")); // [3]
```
