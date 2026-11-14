# The-Algorithm-Illustrated

状態分離型のインタラクティブ・**アルゴリズム図鑑**。アルゴリズムが**なぜ生まれ**、**どう動き**、**どこで報われるか**を、可視化と時間の巻き戻しで学べる学習ダッシュボードです(速さを競うランキングではありません)。

**公開 URL**: [the-algorithm-illustrated.vercel.app](https://the-algorithm-illustrated.vercel.app)(`git push` のたびに自動で再デプロイ)

![全体の構成図](docs/diagrams/architecture.svg)

- **記事**: `content/algorithms/*.md`(758 件・29 カテゴリ)。frontmatter + Markdown 本文 + 5 言語の実装例。
- **可視化**: アルゴリズムごとの「**ステップ列を作る純粋関数**」を Web Worker で実行し、1 コマずつ再生(巻き戻し・速度・状態色のタイムライン)。
- **比較**: 最大 4 件を並べる。可視化があれば、実行も並べて見られる。
- **年表 Atlas・依存の地図**: 生まれた目的つきの年表と、記事本文のリンクから読み取ったつながり。

## クイックスタート

```bash
npm install            # Node.js 20 以降(動作確認は 22)
npm run dev            # http://localhost:3000
npm run build
npm run lint
npm run verify               # 可視化の正しさを、独立実装・既知の正解値と突き合わせて検証
npm run verify:categories    # 全記事の frontmatter が分類表と一致するか
npm run stats:categories     # カテゴリ別の収録数・可視化対応数(実データから集計)
```

コードを変えたら、次をまとめて通すと安全です(CI も同じ検証をします)。

```bash
npx tsc --noEmit && npm run lint && npm run verify && npm run verify:categories && npm run build
```

> この Next.js は従来と異なる点があるため、コードを書く前に `node_modules/next/dist/docs/` を確認してください([AGENTS.md](AGENTS.md))。

## 状態と注意

- **可視化の対応は、全体の約半数**(収録数・対応数は `npm run stats:categories` の出力が正本)。
- **可視化の入力は、固定のデモ配列**で、すべての入力(空・負の数など)を想定していません(→ [学習資料 6](docs/learn/06-troubleshooting-maintenance.md))。
- 状態のキャッシュ(IndexedDB)・状態の差分記録は未実装。

## ドキュメント

| 読むもの | 内容 |
|---|---|
| [**講義資料**](docs/lecture/index.md) | **基礎から**(ステップ列・独立した検証・登録表と分類・擬似コードと状態色・入力の前提)。全 6 回・実行できる例つき |
| [**学習資料**](docs/learn/index.md) | **保守・拡張の実務編**(コードの読み方・可視化の足し方・検証・トラブルと既知の問題・用語集) |
| [README の詳細](docs/reference/readme-detail.md) | 旧 README(技術スタック・カテゴリ別の収録状況・プロジェクト構成) |
| [技術解説書](docs/technical-guide.md)・[アーキテクチャ図解](docs/architecture.md) | データモデル・可視化アーキテクチャ・カテゴリ・検証体制 |
| [UI デザイン仕様](docs/design/ui-design.md)・[決定ログ](docs/design/design-log.md) | デザイントークン・決めごと表 |
| [実装状況ノート](docs/progress.md) | 来歴・次にやること |
| [改善計画](IMPROVEMENT_PLAN.md)・[2026-10 の改善書](IMPROVEMENT_PLAN_2026-10.md)・[設計書](IMPROVEMENT_DESIGN_2026-10.md) | 改善の計画と設計 |
