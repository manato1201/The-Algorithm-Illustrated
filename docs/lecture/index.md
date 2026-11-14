# The-Algorithm-Illustrated 講義(基礎から・実行して確かめる)

「アルゴリズムを**ステップ列**にして見せる」仕組みを、**コードを動かして**学ぶ講義です。各回の例は `node` で実行します(`tests/test_docs.py` が、ずれと出力を検査します)。アルゴリズムそのものの解説は、図鑑の記事(`content/algorithms/`)を読んでください。

| 回 | 題 | 学ぶこと | 目安 |
|---|---|---|---|
| [0](00-introduction.md) | 全体の見取り図 | 記事・ステップ列・Worker・再生 | 1 h |
| [1](01-steps.md) | アルゴリズムを「コマ」にする | フレーム・状態色・ハイライト・`description` | 2.5 h |
| [2](02-independent-verification.md) | 独立した検証 | **別の方法で作った正解と突き合わせる**・性質で守る | 3 h |
| [3](03-registry-taxonomy.md) | 登録表と分類 | `id in 表`・分類表・全記事の整合 | 2 h |
| [4](04-pseudo-code-tokens.md) | 擬似コードと状態色 | 状態から現在行を引く・発光のルール | 2 h |
| [5](05-input-assumptions.md) | 入力の前提と乱数 | **入力の前提を疑う**・`Math.random` の扱い・演習 | 2.5 h |

例は、リポジトリのルートで `node --experimental-strip-types` が動かします(TypeScript をそのまま読み込めます。Node 22 以上)。先に `npm install` を済ませてください。講義のあとは [学習資料](../learn/index.md)。
