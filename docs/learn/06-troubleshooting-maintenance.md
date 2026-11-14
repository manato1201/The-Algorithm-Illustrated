# 6. トラブルと保守

## 症状から探す

| 症状 | 原因の候補 | 確かめ方・直し方 |
|---|---|---|
| ビルドが YAML のエラーで落ちる | 記事の `summary` の先頭が `[` | 引用符で囲むか、書き出しを変える |
| `verify:categories` が落ちる | `category`・`subcategory` が `CATEGORY_TAXONOMY` と不一致 | 一字一句そろえる |
| `verify` が落ちる | 可視化の結果が、独立した正解と違う・id が重複 | 出力の理由を読む |
| 可視化が出ない | 登録表に id が無い | `*_VISUALIZERS` の表 |
| 「あると出るのに描けない」 | 新しい種類で、4 か所のどこかに足し忘れ | 学習資料 3 の表 |
| 集計(`stats:categories`)だけ合わない | `category-stats.mjs` に、新しい種類を足していない | 同左 |
| 左ペインが固定されない | 祖先要素に `overflow: hidden/auto` | `overflow-x: clip` にする |
| 更新情報が出ない | 外部 RSS・Edge Function の問題 | `/api/updates` を直接開く |
| 文書の検査が落ちる | ソースが変わって、引用・実行例の出力が古い | `python tools/check_docs.py --update` のあと、**差分を読む** |

## 既知の問題・注意(読んで見つけたもの。コードは変えていない)

1. **基数ソートが、負の数で誤った結果**になる(要素が欠ける。例: `[-1,3,2]` → `[2,3,0]`)。桁ごとの分配が、非負の整数を前提にしている。
2. **計数ソートが、空の配列で例外**(`Invalid array length`)になる。
3. **ボゴソートが `Math.random` を使う**。`AGENTS.md` の「乱数は固定シードにする」から外れ、実行ごとにコマ数が変わる(`verify` で再現できる検査は、最終結果だけ)。
4. **可視化の入力は固定のデモ**で、前提の検査が無い(1・2 は、画面からは起きない)。
5. **新しい可視化の「種類」を足すには、4 か所 + `step-timeline.ts` に書き写す**必要がある。`category-stats.mjs` は `has-visualizer.ts` の判定を**書き写している**(足し忘れると集計だけ合わない)。`has-visualizer.ts` は、拡張子なしの import を使うので、Node から直接は試せない。
6. **状態色が、TypeScript(`design-tokens.ts`)と CSS(`globals.css`)の 2 か所**にある(手動で同期)。
7. **可視化の対応は、全体の約半数**(収録 758 件)。残りは記事だけ。
8. **`package.json` に `"type": "module"` が無い**ので、`verify` の実行で、TypeScript のファイルを ES モジュールとして**再解析**する(警告と、わずかな遅さ)。`--experimental-strip-types` という実験的な機能に依存している。
9. **README のカテゴリ表は手で貼り直す**(`stats:categories` の出力)。貼り忘れると、実データとずれる。
10. **状態のキャッシュ(IndexedDB)・状態の差分記録は未実装**。

```javascript
// 実行できる
(async () => {
  const { SORT_VISUALIZERS: V } = await import("./src/lib/sort-visualizers.ts");
  const ok = (id, input) => {
    try {
      const f = V[id](input);
      return JSON.stringify(f[f.length - 1].array) === JSON.stringify([...input].sort((a, b) => a - b)) ? "正しい" : "誤り";
    } catch (e) {
      return "例外";
    }
  };
  // 既知の問題 1・2
  console.log("基数ソート [-1,3,2]:", ok("radix-sort", [-1, 3, 2]), " 計数ソート []:", ok("counting-sort", []));
  console.log("基数ソート [3,1,2]:", ok("radix-sort", [3, 1, 2]), " 計数ソート [3,1,2]:", ok("counting-sort", [3, 1, 2]));
})();
```

```text
# 出力
基数ソート [-1,3,2]: 誤り  計数ソート []: 例外
基数ソート [3,1,2]: 正しい  計数ソート [3,1,2]: 正しい
```

## 定期の保守

| いつ | 何を |
|---|---|
| 月に 1 回 | `npm audit`・依存の更新(**Next.js は脆弱性が出やすい**)。更新後に CI と同じ検証 |
| Next.js を上げたとき | `node_modules/next/dist/docs/` の変更を読む(`AGENTS.md`)。`build` と主要ページを目で確認 |
| 記事・可視化を足したとき | `verify`・`verify:categories`・`stats:categories`(README の表を貼り直す) |
| three.js・pixi.js を上げたとき | 3D・粒子の演出を目で確認 |
| 外部 RSS が変わったとき | `/api/updates` の整形 |
| 文書を触ったとき | `python tools/check_docs.py` |

## 直す前の確認

1. **見た目だけのアニメーションにしない**(実際の計算をシミュレート)。
2. **乱数は固定シード**。
3. **状態色を変えない**(機能的な意味)。発光は確定・比較中だけ。**色だけで区別しない**。
4. **新しい種類を足すなら、4 か所 + `step-timeline.ts`**。
