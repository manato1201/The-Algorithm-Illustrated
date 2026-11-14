# 7. 基礎の補強(言語・設計思想・アルゴリズム・用語)

講義と学習資料の**前提になっている知識**を、ここで補います。この図鑑は「アルゴリズム」そのものが主題なので、**アルゴリズムの基礎(計算量・整列・探索・再帰・動的計画法・グラフ)**を、**この図鑑のステップ列を数えながら**、動かして確かめます。

## 1. 言語の基礎: TypeScript と関数の値

### 1.1 関数を「値」として持つ(登録表)

JavaScript / TypeScript では、**関数も値**です。`Record<string, (入力) => 結果>` は、「**文字列から関数への表**」。可視化の登録表(`SORT_VISUALIZERS`)は、これ。**`id` で関数を引いて呼ぶ**ので、`if / else` を並べずに済む。

```javascript
// 実行できる
(async () => {
  const { SORT_VISUALIZERS } = await import("./src/lib/sort-visualizers.ts");
  const id = "insertion-sort";
  const stepsOf = SORT_VISUALIZERS[id];                       // 表から、関数を取り出す
  console.log("関数か:", typeof stepsOf, " コマ数:", stepsOf([3, 1, 2]).length);
  console.log("登録されている id の数が 20 以上:", Object.keys(SORT_VISUALIZERS).length >= 20);
  console.log("無い id は undefined:", SORT_VISUALIZERS["no-such-sort"]);
})();
```

```text
# 出力
関数か: function  コマ数: 10
登録されている id の数が 20 以上: true
無い id は undefined: undefined
```

### 1.2 ジェネリクスと `Partial<Record<…>>`(型の読み方)

`Partial<Record<number, StateColorKey>>` は、「**位置(数)→ 状態色** の表で、**書かなくてもよい**」。`SortFrame` の `highlight` が、これ。**型は、データの形の説明書**。読めると、コードの意図が分かる。

| 書き方 | 意味 |
|---|---|
| `number[]` | 数の配列 |
| `Record<string, T>` | 文字列をキーにした、`T` の表 |
| `Partial<X>` | X の項目が、全部「書かなくてよい」になる |
| `A \| B` | A または B(ユニオン型) |
| `(x: number) => number` | 数を受け取り、数を返す関数の型 |

### 1.3 Web Worker(別のスレッドで計算する)

ステップ列の生成が重くても、**画面が固まらない**ように、**別のスレッド(Worker)**で計算し、**メッセージ(`postMessage`)で結果を受け取る**。Worker と画面は、**メモリを共有せず、データをコピーして渡す**。

## 2. 設計思想

| 原則 | 意味 | この図鑑のどこに出るか | 破るとどうなるか |
|---|---|---|---|
| **実際の計算をシミュレートする** | 見た目だけのアニメーションにしない | ステップ生成(`AGENTS.md`) | 学習者に、嘘を教える |
| **検証を積み上げる** | 申告でなく、再実行できるコード | `verify-visualizations.mjs` | 追試できない |
| **登録するだけで対応する** | 表に足せば、画面が追従 | `*_VISUALIZERS`・`hasVisualizer` | 画面側の修正が増える |
| **唯一の情報源** | 分類の表は 1 か所 | `CATEGORY_TAXONOMY` | 画面ごとに、カテゴリが食い違う |
| **状態色は機能的な意味** | 色に、意味の約束を持たせる | `stateColors` | どの色が何か分からなくなる |
| **発光は少なく** | 注目を示すものは、絞る | `shouldGlow` | どこを見るべきか分からなくなる |
| **計算と描画を分ける** | 純粋関数 + 描画コンポーネント | `src/lib` と `src/components` | 画面なしで検証できない |
| **学ぶ目的を示す** | 速さの競争でなく、「なぜ生まれたか」 | 記事の「概要」・年表 | 暗記になる |

## 3. 関数・アルゴリズムの基礎

### 3.1 計算量(Big-O): 規模が増えたとき、時間はどう増えるか

**入力の大きさ n が増えたとき、手数が、どう増えるか**を表す記法。細かい定数は無視する。

| 記法 | 名前 | n が 2 倍になると | 例 |
|---|---|---|---|
| O(1) | 一定 | 変わらない | 配列の添字の参照・辞書の参照(平均) |
| O(log n) | 対数 | 1 回分だけ増える | **二分探索** |
| O(n) | 線形 | 2 倍 | **線形探索** |
| O(n log n) | 線形対数 | 2 倍より少し多い | **マージソート**・ヒープソート・クイックソート(平均) |
| O(n²) | 2 乗 | **4 倍** | **バブルソート**・挿入ソート |
| O(2ⁿ) / O(n!) | 指数 / 階乗 | 爆発する | 全部の組み合わせ・**ボゴソート** |

**この図鑑の可視化で、数えて確かめます**(「比較中」のコマの数 = 比較の回数)。

```javascript
// 実行できる
(async () => {
  const { SORT_VISUALIZERS: V } = await import("./src/lib/sort-visualizers.ts");
  const make = (n) => Array.from({ length: n }, (_, i) => (i * 7919 + 13) % n);        // 決まった並びの入力
  const comparisons = (id, n) => V[id](make(n)).filter((f) => Object.values(f.highlight).includes("comparing")).length;

  console.log("整列の比較の回数(n = 8 / 16 / 32 / 64)");
  for (const id of ["bubble-sort", "insertion-sort", "merge-sort", "quick-sort", "heap-sort"]) {
    const row = [8, 16, 32, 64].map((n) => comparisons(id, n));
    console.log(id.padEnd(15), row.map((v) => String(v).padStart(5)).join(" "), "  n が 2 倍のときの比:", (row[3] / row[2]).toFixed(2));
  }
  // バブルソートの比較は、n(n-1)/2
  console.log("バブルの理論値 n(n-1)/2:", [8, 16, 32, 64].map((n) => (n * (n - 1)) / 2).join(" "));
})();
```

```text
# 出力
整列の比較の回数(n = 8 / 16 / 32 / 64)
bubble-sort        28   120   496  2016   n が 2 倍のときの比: 4.06
insertion-sort     16    92   276  1028   n が 2 倍のときの比: 3.72
merge-sort         14    40   127   310   n が 2 倍のときの比: 2.44
quick-sort         22   106   166   393   n が 2 倍のときの比: 2.37
heap-sort          26    81   226   570   n が 2 倍のときの比: 2.52
バブルの理論値 n(n-1)/2: 28 120 496 2016
```

- **バブルソートは、n が 2 倍で、比較が約 4 倍**(O(n²))。**マージソートは、約 2.4 倍**(O(n log n))。**規模が大きくなるほど、差が開く**。
- クイックソートの 16 → 32 の増え方が小さいのは、**入力の並びによって、手数が変わる**から(最悪は O(n²))。計算量は、**最悪・平均・最良**を分けて考える。

### 3.2 探索: 線形と二分

**整列済みの配列**なら、**真ん中と比べて、半分を捨てる**(二分探索)。**整列していないと使えない**(前提)。

```javascript
// 実行できる
(async () => {
  const se = await import("./src/lib/search-visualizers.ts");
  const array = se.SEARCH_ARRAY;
  const target = se.SEARCH_TARGET;
  const comparing = (id) => se.SEARCH_VISUALIZERS[id](array, target).filter((f) => JSON.stringify(f).includes("comparing")).length;

  console.log("配列の大きさ:", array.length, " 整列済み:", array.every((v, i) => i === 0 || array[i - 1] <= v));
  console.log("線形探索の比較:", comparing("linear-search"), " 二分探索の比較:", comparing("binary-search"));
  console.log("二分探索の理論値の上限 ⌈log2(n+1)⌉:", Math.ceil(Math.log2(array.length + 1)));

  // 自分で書いた二分探索
  let lo = 0, hi = array.length - 1, steps = 0, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    steps++;
    if (array[mid] === target) { found = mid; break; }
    if (array[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
  console.log("自分の二分探索: 位置", found, " 比較", steps);
})();
```

```text
# 出力
配列の大きさ: 20  整列済み: true
線形探索の比較: 14  二分探索の比較: 4
二分探索の理論値の上限 ⌈log2(n+1)⌉: 5
自分の二分探索: 位置 13  比較 5
```

### 3.3 再帰と動的計画法: 同じ計算を、2 度しない

**再帰**は、「小さい同じ問題に分けて、自分を呼ぶ」。フィボナッチ数は、素直に書くと**同じ値を何度も計算**して遅い。**一度計算した値を覚える(メモ化)**と、速くなる。これが**動的計画法**の核。

```javascript
// 実行できる
let calls = 0;
function fibSlow(n) {
  calls++;
  return n < 2 ? n : fibSlow(n - 1) + fibSlow(n - 2);                 // 同じ n を、何度も計算する
}
let callsMemo = 0;
function fibMemo(n, memo = new Map()) {
  callsMemo++;
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);                                // 計算済みなら、使い回す
  const v = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, v);
  return v;
}

console.log("fib(25):", fibSlow(25), fibMemo(25));
console.log("関数の呼び出し回数 — メモなし:", calls, " メモあり:", callsMemo);
```

```text
# 出力
fib(25): 75025 75025
関数の呼び出し回数 — メモなし: 242785  メモあり: 49
```

### 3.4 グラフ: 幅優先探索(BFS)で最短の手数

**点(ノード)と線(エッジ)**で表した関係が、グラフ。**幅優先探索**は、**近い所から順に**広がるので、**線の数が最小の道**(重みなしの最短路)が見つかる。**キュー**(先に入れたものを先に出す)を使う。

```javascript
// 実行できる
const graph = { A: ["B", "C"], B: ["D"], C: ["D", "E"], D: ["F"], E: ["F"], F: [] };

function bfsShortest(start, goal) {
  const queue = [[start]];                 // 道(経路)を、キューに入れる
  const seen = new Set([start]);
  while (queue.length) {
    const path = queue.shift();            // 先頭から出す(先入れ先出し)
    const node = path[path.length - 1];
    if (node === goal) return path;
    for (const next of graph[node]) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

console.log("A から F の最短:", bfsShortest("A", "F").join(" → "));
console.log("行けない場合:", bfsShortest("F", "A"));
```

```text
# 出力
A から F の最短: A → B → D → F
行けない場合: null
```

### 3.5 この図鑑の 29 カテゴリ(何の話か)

| カテゴリ | 何を扱うか(一言) |
|---|---|
| ソート・探索 | 並べる・見つける(上の例) |
| グラフ・経路探索 | 点と線の関係・最短の道 |
| 動的計画法 | 小さい問題の答えを覚えて、大きい問題を解く |
| 貪欲法 | その場で最良の選択を積み重ねる |
| 文字列 | 照合・接尾辞・圧縮 |
| データ構造 | 木・ヒープ・ハッシュ・トライ |
| 数論・暗号 | 素数・剰余・鍵 |
| 計算幾何 | 点・線・多角形の計算 |
| 最適化・確率的手法 | よい答えを探す(焼きなまし・遺伝的 …) |
| 機械学習・強化学習・NLP・CV | データから学ぶ |
| 情報検索・ランキング | 探して順位をつける |
| 分散システム・並行処理 | 複数の計算機・スレッドの協調 |
| ゲーム・CG・キャラクター AI | 遊びと映像のための計算 |
| 信号処理・制御・数値計算 | 波形・フィードバック・近似の計算 |

## 4. IT・エンタメの用語の補強

| 用語 | 意味 | この図鑑での出番 |
|---|---|---|
| **計算量(時間・空間)** | 手数・メモリの増え方 | 記事の `complexity` |
| **最悪・平均・最良** | 入力の運しだいで変わる手数の評価 | クイックソート |
| **安定ソート** | 同じ値の元の順序を保つ整列 | 比較表 |
| **in-place** | 追加のメモリをほぼ使わない | ソートの特性 |
| **分割統治 / メモ化 / 貪欲** | 分けて解く / 覚える / その場の最良 | 記事の分類 |
| **ヒューリスティック / 近似** | 経験則 / 最適でなくてよい答え | 最適化の記事 |
| **決定論的 / 確率的** | 同じ入力で同じ結果 / 乱数を使う | 乱数は固定シード |
| **擬似コード** | 言語に依存しない手順の記述 | 現在行の強調 |
| **Canvas / WebGL / three.js / pixi.js** | 2D 描画 / GPU 描画 / 3D / 2D の WebGL ライブラリ | 可視化の描画 |
| **Web Worker** | 別のスレッドで動く処理 | ステップ生成 |
| **Edge Function / BFF** | エッジで動く関数 / 画面専用の中継サーバー | 更新情報 |
| **静的生成 / ハイドレーション** | ビルド時に作る / つなぎ込み | Next.js |
| **ゲームの AI(経路探索・ステアリング)/ 手続き生成** | 道を探す・群れの動き / ルールから自動で作る | ゲーム・キャラクター AI のカテゴリ |
| **レンダリング / レイトレーシング** | 3D を画像にする / 光の道筋を追う | CG・3D のカテゴリ |

## 確認問題

1. n が 2 倍になったとき、O(n²) と O(n log n) の手数は、それぞれ約何倍になりますか。
2. 二分探索が使える前提は何ですか。
3. フィボナッチを、メモ化すると速くなるのは、なぜですか。
4. 幅優先探索で、最短の道が見つかるのは、なぜですか。

## 解答

1. O(n²) は約 4 倍、O(n log n) は 2 倍より少し多い(約 2.1〜2.4 倍)。
2. 配列が整列済みであること(半分を捨てる根拠になる)。
3. 同じ値を何度も計算せず、一度求めた値を使い回すから(呼び出しが、指数的から線形に減る)。
4. 近い(手数の少ない)所から順に広がるので、初めてゴールに着いた道が、最短になるから。
