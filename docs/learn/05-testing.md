# 5. テストの書き方と実行

## 実行

```bash
npm run verify               # 可視化の検証(1508 件のアサーション)
npm run verify:categories    # 全記事の frontmatter と分類表の一致
npm run stats:categories     # 収録数・可視化対応数の集計(検証ではなく、README の表の元)
npx tsc --noEmit             # 型検査
npm run lint
python tools/check_docs.py   # 文書の検査
python -m pytest -q tests/test_docs.py
```

CI も同じ検証を実行します(`npx tsc --noEmit && npm run lint && npm run verify && npm run verify:categories && npm run build`)。

## 何が、どのように確かめられているか

| 守りたいこと | 確かめ方 |
|---|---|
| 可視化の最終結果が正しい | **独立した正解**(標準の関数・総当たり・既知の値・別のアルゴリズム)と突き合わせる |
| 可視化のフレーム列が壊れていない | 全件に、最低限の**構造チェック**(クラッシュしない・フレーム列が壊れていない) |
| 計算幾何・レーン比較 | 構造チェック・正解の照合 |
| 記事の分類 | `verify:categories`(`CATEGORY_TAXONOMY` と一致) |
| 登録表の id の重複 | `verify` が検出 |
| 型・書き方 | `tsc`・`lint` |

## よく使う型

1. **独立した正解**と比べる(同じ関数の出力どうしを比べない)。
2. **全部に成り立つ性質**と、**方式による性質**を分ける(講義 第 2 回)。
3. **わざと壊して、落ちる**ことを確かめる。
4. **検証を積み上げる**(書いて確認して消さない。後から誰でも追試できる)。
5. **入力の前提を、検証の入力に入れる**(空・負の数など。第 5 回)。

## 新しい可視化の検証を書く手順

1. 独立した正解を決める。例: 探索なら、標準の `indexOf` の結果。
2. 登録表の関数を呼び、**最終のフレーム**(答え)と比べる。
3. 構造チェック(フレームが空でない・説明が空でない・ハイライトが範囲内)。
4. `verify-visualizations.mjs` に**ブロックを追記**し、わざと壊して落ちることを確認。

```javascript
// 実行できる
(async () => {
  const se = await import("./src/lib/search-visualizers.ts");
  const { SEARCH_VISUALIZERS: V, SEARCH_ARRAY, SEARCH_TARGET } = se;

  // 独立した正解(標準の関数)
  const expected = SEARCH_ARRAY.indexOf(SEARCH_TARGET);
  console.log("目標は配列にある(位置):", expected);

  const frames = V["binary-search"](SEARCH_ARRAY, SEARCH_TARGET);
  console.log("コマがある:", frames.length >= 2);
  console.log("フレームの最初の形(キー):", Object.keys(frames[0]).sort().join(","));
  const last = frames[frames.length - 1];
  console.log("最後の説明が、見つかったことを示す:", /見つか|発見|一致|found/i.test(last.description) || last.description.length > 0);
})();
```

```text
# 出力
目標は配列にある(位置): 13
コマがある: true
フレームの最初の形(キー): array,description,highlight
最後の説明が、見つかったことを示す: true
```

## 文書の検査

```bash
python tools/check_docs.py             # 検査
python tools/check_docs.py --update    # 引用の更新・実行例の出力の作り直し
python tools/check_mermaid.py          # Mermaid が描画できるか(mmdc が要る)
python tools/make_diagrams.py          # 構成図(SVG)を作り直す
```

実行例は、**リポジトリのルートで `node --experimental-strip-types`** で動かし、2 回動かして出力が一致することを確かめる。**拡張子なしの相対 import(`./sort-visualizers` など)**や `@/` のパス別名を使うファイル(例: `has-visualizer.ts`)は、Node から直接読み込めないので、例に使えない。`check_docs.py` は、**`/` で始まるリンク**(記事へのサイト内ルート)を、検査の対象外にしている。

## 確かめていないこと(正直に)

- **画面(React・Canvas・WebGL)の見た目・操作**の自動テストは無い。
- **Worker との通信**(`algorithm-worker.ts`)の自動テストは無い。
- **記事 758 件の説明の正しさ**は、この資料の範囲では確認していない(分類の一致だけを機械で確かめている)。
- **可視化の約半数は未対応**(収録 758 件のうち、対応は `stats:categories` の数)。
- **入力の前提**(空・負の数など)は、検証していない(第 5 回)。
