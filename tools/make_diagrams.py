"""docs/diagrams/ の構成図(SVG)を作る。`python tools/make_diagrams.py` で作り直す。部品は tools/svgkit.py。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from svgkit import Diagram  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "docs" / "diagrams"


def architecture() -> Diagram:
    d = Diagram(1560, 780, "The-Algorithm-Illustrated の構成",
                "アルゴリズム図鑑。content/algorithms の Markdown(758 件)と、アルゴリズムごとの「ステップ列を作る純粋関数」(src/lib/*-visualizers.ts)を、"
                "登録表(has-visualizer.ts)でつなぎ、Web Worker が実行して、可視化コンポーネントが 1 コマずつ再生する。"
                "scripts/verify-visualizations.mjs が、独立した計算や正解値と突き合わせて検査する。")
    d.text(40, 44, "The-Algorithm-Illustrated — 構成", cls="hd")
    d.text(40, 66, "青=主な流れ / 灰の破線=補助。ステップ列は純粋関数、可視化の正しさは独立した検査で守る", cls="note")

    d.group(40, 100, 300, 600, "CONTENT", color="orange")
    md = d.card(190, 250, "doc", "content/algorithms", "記事 758 件(Markdown)\nカテゴリ 29")
    at = d.card(190, 470, "clock", "content/atlas", "年表(milestones.json)\n出典と「生まれた目的」が必須")

    d.group(400, 100, 380, 600, "LIB — 純粋関数", color="teal")
    vz = d.card(590, 220, "branch", "*-visualizers.ts", "ステップ列(フレーム)を作る\nソート・探索・グラフ・DP …")
    rg = d.card(590, 400, "tag", "has-visualizer.ts", "登録表(id in 表)\nカテゴリ表 CATEGORY_TAXONOMY")
    ps = d.card(590, 580, "list", "pseudo-code・design-tokens", "擬似コードの現在行・状態色\n(発光は確定と比較中だけ)")

    d.group(840, 100, 360, 600, "APP — Next.js(静的生成)", color="blue")
    wk = d.card(1020, 220, "gear", "algorithm-worker.ts", "Web Worker\nステップ列を作って返す")
    pg = d.card(1020, 400, "browser", "カタログ・詳細・比較・Atlas", "/algorithms/[id]・/compare\n/atlas・/map")
    vp = d.card(1020, 580, "film", "可視化と再生", "Canvas・HTML+CSS・WebGL\n巻き戻し・速度・タイムライン")

    d.group(1260, 100, 260, 600, "CHECK", color="gray")
    vf = d.card(1390, 300, "check", "verify-visualizations.mjs", "独立実装・既知の正解値\nと突き合わせる(1508 件)")
    vc = d.card(1390, 500, "check", "verify-categories.mjs", "frontmatter と分類表の一致")

    d.arrow([md.top, (190, 150), (930, 150), (930, 400), pg.left], "読む", at=1, dy=-10)
    d.arrow([rg.right, (810, 400)], "", kind="secondary")
    d.arrow([vz.right, (810, 220), wk.left], "実行", at=0, dy=-10)
    d.arrow([wk.right, (1140, 220), (1140, 340), (1020, 340), pg.top], "")
    d.arrow([pg.right, (1160, 400), (1160, 520), (1020, 520), vp.top], "")
    d.arrow([vf.left, (1230, 300), (1230, 688), (810, 688), (810, 250), (782, 250)], "検査", kind="secondary", at=3, dy=-10)
    return d


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "architecture.svg").write_text(architecture().svg(), encoding="utf-8")
    print("wrote", OUT / "architecture.svg")


if __name__ == "__main__":
    main()
