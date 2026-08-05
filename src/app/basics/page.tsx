import Link from "next/link";
import { ComplexityBadge } from "@/components/hud/ComplexityBadge";
import styles from "./page.module.css";

type ComplexityRow = {
  notation: string;
  name: string;
  description: string;
  exampleId: string;
  exampleName: string;
};

const COMPLEXITY_TABLE: ComplexityRow[] = [
  {
    notation: "O(1)",
    name: "定数時間",
    description: "入力サイズnによらず一定回数の操作で終わる。配列の添字アクセスや、このサイトのLRUキャッシュのget/put。",
    exampleId: "lru-cache",
    exampleName: "LRUキャッシュ",
  },
  {
    notation: "O(log n)",
    name: "対数時間",
    description: "1回の操作でおおよそ探索範囲が半分になる。データが2倍になっても、必要な手順は+1回程度しか増えない。",
    exampleId: "binary-search",
    exampleName: "二分探索",
  },
  {
    notation: "O(n)",
    name: "線形時間",
    description: "全要素を1回ずつ見る。データが2倍になれば手順も2倍になる、最も直感的な増え方。",
    exampleId: "linear-search",
    exampleName: "線形探索",
  },
  {
    notation: "O(n log n)",
    name: "線形対数時間",
    description: "「分割してそれぞれ処理し、まとめる」型のアルゴリズムに多い。実務で使われる汎用ソートの主流。",
    exampleId: "merge-sort",
    exampleName: "マージソート",
  },
  {
    notation: "O(n²)",
    name: "二乗時間",
    description: "全要素の組ごとに何かをする(二重ループ)。データが2倍になると手順は4倍に増える。",
    exampleId: "bubble-sort",
    exampleName: "バブルソート",
  },
  {
    notation: "O(2ⁿ)",
    name: "指数時間",
    description: "要素を1個増やすたびに手順が2倍になる。「あり/なし」の組み合わせを総当たりするような処理に現れる。",
    exampleId: "subset-construction",
    exampleName: "部分集合構成法(最悪ケース)",
  },
  {
    notation: "O(n!)",
    name: "階乗時間",
    description: "全ての並び順を総当たりする。n=20を超えるだけで現実的な時間では終わらなくなる、最も速く爆発する増え方。",
    exampleId: "shapley-value",
    exampleName: "シャープレイ値(素朴な全順列計算)",
  },
];

/** 1秒あたり10^9回(10億回)の演算ができるコンピュータを仮定した所要時間(秒) */
const OPS_PER_SECOND = 1_000_000_000;

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

function formatDuration(seconds: number): string {
  if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(1)} ns`;
  if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(1)} µs`;
  if (seconds < 1) return `${(seconds * 1e3).toFixed(1)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} 秒`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} 分`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} 時間`;
  const days = seconds / 86400;
  if (days < 365) return `${days.toFixed(1)} 日`;
  const years = days / 365;
  if (years < 1e6) return `${years.toLocaleString("ja-JP", { maximumFractionDigits: 0 })} 年`;
  return `${years.toExponential(2)} 年(想像を絶する長さ)`;
}

type GrowthRow = {
  n: number;
  logN: number;
  n1: number;
  nLogN: number;
  n2: number;
  twoPowN: number;
  nFactorial: number;
};

const GROWTH_TABLE: GrowthRow[] = [10, 20, 30, 40, 50].map((n) => ({
  n,
  logN: Math.log2(n),
  n1: n,
  nLogN: n * Math.log2(n),
  n2: n * n,
  twoPowN: 2 ** n,
  nFactorial: factorial(n),
}));

/**
 * 「アルゴリズムとは何か / 計算量(Big-O記法)とは何か」を説明する入門ページ。
 * /about と同じ静的ページの型(実務モード、装飾を持たない)を踏襲している(docs/design/ui-design.md 3節#5相当)。
 */
export default function BasicsPage() {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← カタログに戻る
      </Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>■ BASICS はじめての方へ</p>
        <h1 className={styles.title}>そもそもアルゴリズムとは? 計算量(Big-O)とは?</h1>
        <p className={styles.lead}>
          このサイトの各詳細ページを読む前に知っておくと理解が早まる、2つの基礎知識をまとめました。
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>■ WHAT そもそもアルゴリズムとは</h2>
        <p className={styles.paragraph}>
          アルゴリズムとは、<strong>与えられた入力から求める出力を得るための、有限回で終わる明確な手順の集まり</strong>です。料理のレシピに例えると分かりやすく、「材料(入力)」から「完成した料理(出力)」に至るまでの、誰が読んでも同じように再現できる手順書がアルゴリズムにあたります。
        </p>
        <p className={styles.paragraph}>良いアルゴリズムの手順は、次の性質を満たしている必要があります。</p>
        <dl className={styles.propertyList}>
          <div className={styles.propertyRow}>
            <dt className={styles.propertyTerm}>入力</dt>
            <dd className={styles.propertyDesc}>0個以上の外部から与えられるデータを受け取る</dd>
          </div>
          <div className={styles.propertyRow}>
            <dt className={styles.propertyTerm}>出力</dt>
            <dd className={styles.propertyDesc}>入力と対応した1個以上の結果を返す</dd>
          </div>
          <div className={styles.propertyRow}>
            <dt className={styles.propertyTerm}>有限性</dt>
            <dd className={styles.propertyDesc}>必ず有限回の手順で終了する(無限ループしない)</dd>
          </div>
          <div className={styles.propertyRow}>
            <dt className={styles.propertyTerm}>明確性</dt>
            <dd className={styles.propertyDesc}>各手順が誰が読んでも一意に解釈できるほど厳密に定義されている</dd>
          </div>
          <div className={styles.propertyRow}>
            <dt className={styles.propertyTerm}>実行可能性</dt>
            <dd className={styles.propertyDesc}>各手順は現実的な資源(時間・メモリ)で実際に実行できる</dd>
          </div>
        </dl>
        <p className={styles.paragraph}>
          例えば「数のリストから最大値を見つける」という問題を考えると、「先頭の数を仮の最大値とし、残りを順番に見て、より大きい数が見つかるたびに仮の最大値を更新し、最後まで見終わったら仮の最大値を答えとして返す」という手順は、上記5条件をすべて満たすためアルゴリズムと呼べます。このサイトの{" "}
          <Link href="/algorithms/linear-search" className={styles.link}>
            線形探索
          </Link>{" "}
          はこの考え方をそのまま応用したものです。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>■ WHY なぜ計算量を考えるのか</h2>
        <p className={styles.paragraph}>
          同じ問題を解くアルゴリズムは1つとは限りません。例えば「配列の中から値を探す」だけでも、先頭から順に見ていく{" "}
          <Link href="/algorithms/linear-search" className={styles.link}>
            線形探索
          </Link>{" "}
          と、範囲を半分ずつ絞り込む{" "}
          <Link href="/algorithms/binary-search" className={styles.link}>
            二分探索
          </Link>{" "}
          の2通りがあります。データが数件しかなければ違いは体感できませんが、データが数百万件になると、どちらを選ぶかで「一瞬で終わる」か「体感できるほど待たされる」かが分かれます。
        </p>
        <p className={styles.paragraph}>
          <strong>計算量</strong>とは、入力のサイズ(データ件数など。慣習的に<code className={styles.code}>n</code>で表す)が大きくなったときに、必要な手順の数(=時間計算量)や使用するメモリ量(=空間計算量)がどのくらいの<strong>ペースで増えていくか</strong>を表す指標です。コンピュータそのものの速さではなく、「データが増えたときにどれだけ辛くなるか」というアルゴリズムの設計そのものの性質を測ります。このサイトの各詳細ページにある<ComplexityBadge notation="O(...)" />のバッジは、原則としてそのアルゴリズムの最悪計算量(時間)を示しており、平均・最良ケースの違いは本文の「特性・トレードオフ」節で補足しています。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>■ NOTATION O記法(Big-O記法)とは</h2>
        <p className={styles.paragraph}>
          <strong>O記法</strong>(Big-O記法)は、この「増え方」を表すための共通言語です。<code className={styles.code}>O(n²)</code>のように書き、定数倍や下位の項を無視して、入力サイズ<code className={styles.code}>n</code>が十分大きくなったときの手順数の増加ペースだけに注目します。厳密には「上限」を表す記法ですが、慣習的に「大体このペースで増える」という意味で使われます。代表的なクラスを、増え方が緩やかな順に並べました。
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">記法</th>
                <th scope="col">呼び方</th>
                <th scope="col">説明</th>
                <th scope="col">代表例</th>
              </tr>
            </thead>
            <tbody>
              {COMPLEXITY_TABLE.map((row) => (
                <tr key={row.notation}>
                  <td>
                    <ComplexityBadge notation={row.notation} />
                  </td>
                  <td className={styles.tableName}>{row.name}</td>
                  <td className={styles.tableDesc}>{row.description}</td>
                  <td>
                    <Link href={`/algorithms/${row.exampleId}`} className={styles.link}>
                      {row.exampleName}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>■ SCALE 増え方のスケール感</h2>
        <p className={styles.paragraph}>
          言葉だけでは実感しづらいので、「1秒間に10億回(10<sup>9</sup>)の演算ができるコンピュータ」を仮定し、入力サイズ<code className={styles.code}>n</code>を増やしたときの各計算量クラスの所要時間を計算してみます。
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">n</th>
                <th scope="col">
                  <ComplexityBadge notation="O(log n)" />
                </th>
                <th scope="col">
                  <ComplexityBadge notation="O(n)" />
                </th>
                <th scope="col">
                  <ComplexityBadge notation="O(n log n)" />
                </th>
                <th scope="col">
                  <ComplexityBadge notation="O(n²)" />
                </th>
                <th scope="col">
                  <ComplexityBadge notation="O(2ⁿ)" />
                </th>
                <th scope="col">
                  <ComplexityBadge notation="O(n!)" />
                </th>
              </tr>
            </thead>
            <tbody>
              {GROWTH_TABLE.map((row) => (
                <tr key={row.n}>
                  <td className={styles.tableName}>{row.n}</td>
                  <td>{formatDuration(row.logN / OPS_PER_SECOND)}</td>
                  <td>{formatDuration(row.n1 / OPS_PER_SECOND)}</td>
                  <td>{formatDuration(row.nLogN / OPS_PER_SECOND)}</td>
                  <td>{formatDuration(row.n2 / OPS_PER_SECOND)}</td>
                  <td>{formatDuration(row.twoPowN / OPS_PER_SECOND)}</td>
                  <td>{formatDuration(row.nFactorial / OPS_PER_SECOND)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.paragraph}>
          <code className={styles.code}>O(log n)</code>や<code className={styles.code}>O(n)</code>はnが50になっても一瞬のままですが、<code className={styles.code}>O(2ⁿ)</code>はn=50で13日、<code className={styles.code}>O(n!)</code>はn=20の時点ですでに77年かかる計算になります。同じ「正しく動くアルゴリズム」でも、どの計算量クラスに属するかで実用になるかどうかがまったく変わってくることが分かります。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>■ NEXT 次に読むと良いページ</h2>
        <p className={styles.paragraph}>
          準備ができたら、
          <Link href="/" className={styles.link}>
            カタログ
          </Link>
          から気になるアルゴリズムを選んで詳細ページを開いてみてください。多くのアルゴリズムは状態遷移を1ステップずつ再生・巻き戻しできる可視化つきで、実際に手を動かしながら「なぜその計算量になるのか」を確かめられます。複数のアルゴリズムを並べて比較したい場合は
          <Link href="/compare" className={styles.link}>
            比較画面
          </Link>
          も活用してください。
        </p>
      </section>
    </div>
  );
}
