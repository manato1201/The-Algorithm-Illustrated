// 「アルゴリズム追加50件」(2026-11)で足した可視化の検証。verify-visualizations.mjs から呼ばれる。
// どのチェックも、可視化コードそのものを信頼せず、このファイルで独立に書いた参照計算
// (総当たり・定義式・別実装)と最終フレーム・途中フレームを突き合わせる。

import * as BAR from "../src/lib/bar-visualizers.ts";
import * as VK from "../src/lib/visual-kind.ts";
import * as STR from "../src/lib/structure-visualizers.ts";
import { GRAPH_VISUALIZERS, GRAPH_DATASETS } from "../src/lib/graph-visualizers.ts";
import * as GX from "../src/lib/graph-extra-visualizers.ts";
import { STRING_VISUALIZERS } from "../src/lib/string-visualizers.ts";
import * as SX from "../src/lib/string-extra-visualizers.ts";
import { GEOMETRY_VISUALIZERS, GEOMETRY_DATASETS } from "../src/lib/geometry-visualizers.ts";
import * as GEX from "../src/lib/geometry-extra-visualizers.ts";
import * as EST from "../src/lib/estimate-visualizers.ts";
import * as RANKV from "../src/lib/ranking-visualizers.ts";
import { SIGNAL_VISUALIZERS, SIGNAL_META } from "../src/lib/signal-visualizers.ts";
import * as SGX from "../src/lib/signal-extra-visualizers.ts";

const sorted = (a) => [...a].sort((x, y) => x - y);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const STR_BRESENHAM = (pts) => pts.map(([, y]) => y);

export function runAddedChecks({ check, section, checkWellFormed }) {
  // =========================================================================
  section("追加分(構造): バイトニックソート・二分ヒープ・ロビンフッドハッシュ・SOS DP");
  // =========================================================================
  {
    const group = BAR.BAR_GROUPS.structure;
    const ids = ["bitonic-sort", "binary-heap", "robin-hood-hashing", "sos-dp"];
    check("追加(構造): 棒グラフのグループ structure に登録され、種類は search", ids.every((id) => id in group && BAR.barGroupOf(id) === "structure" && VK.visualKindOf(id) === "search"));
    for (const id of ids) checkWellFormed(id, group[id]());

    // ---- バイトニックソート ----
    {
      const frames = group["bitonic-sort"]();
      const input = STR.BITONIC_INPUT;
      const n = input.length;
      // 比較交換の組と向きを、定義から独立に作る
      const comparators = [];
      for (let k = 2; k <= n; k *= 2) {
        for (let j = k / 2; j >= 1; j /= 2) {
          for (let i = 0; i < n; i++) {
            const l = i ^ j;
            if (l > i) comparators.push({ i, l, asc: (i & k) === 0 });
          }
        }
      }
      const apply = (arr, c) => {
        const out = [...arr];
        if (c.asc ? out[c.i] > out[c.l] : out[c.i] < out[c.l]) [out[c.i], out[c.l]] = [out[c.l], out[c.i]];
        return out;
      };
      check("bitonic-sort: 比較交換の数が 段数×n/2、フレーム数が 1+比較数+1", comparators.length === (STR.bitonicStageCount(n) * n) / 2 && frames.length === comparators.length + 2);
      let replay = [...input];
      let ok = true;
      comparators.forEach((c, idx) => {
        replay = apply(replay, c);
        const f = frames[idx + 1];
        const keys = Object.keys(f.highlight).map(Number).sort((a, b) => a - b);
        if (!same(keys, [c.i, c.l]) || !same(f.array, replay)) ok = false;
      });
      check("bitonic-sort: 各フレームが、独立に作った比較交換の列(組・向き)を順に適用した配列と一致", ok);
      check("bitonic-sort: 最終の配列が昇順で、全要素が確定", same(frames.at(-1).array, sorted(input)) && Object.keys(frames.at(-1).highlight).length === n);
      // 0-1原理: 全ての0/1入力を整列できるネットワークは、全ての入力を整列できる
      let all01 = true;
      for (let bits = 0; bits < 1 << n; bits++) {
        let arr = Array.from({ length: n }, (_, b) => (bits >> b) & 1);
        for (const c of comparators) arr = apply(arr, c);
        if (!same(arr, sorted(arr))) all01 = false;
      }
      check(`bitonic-sort: 比較ネットワークが、${1 << n}通りの0/1入力をすべて整列する(0-1原理)`, all01);
    }

    // ---- 二分ヒープ ----
    {
      const { frames, sizes, stable } = STR.binaryHeapTrace();
      const input = STR.HEAP_INPUT;
      const N = input.length;
      const asc = sorted(input);
      check("binary-heap: sizes・stable がフレームと同じ長さ", sizes.length === frames.length && stable.length === frames.length);
      let heapOk = true;
      let multisetOk = true;
      let tailOk = true;
      frames.forEach((f, idx) => {
        const a = f.array;
        const size = sizes[idx];
        if (stable[idx]) {
          for (let i = 1; i < size; i++) if (a[(i - 1) >> 1] > a[i]) heapOk = false;
        }
        const nonzero = a.filter((v) => v !== 0);
        // 追加の途中は先頭から c 個の入力、取り出しの途中は全入力
        if (!same(sorted(nonzero), sorted(input.slice(0, nonzero.length)))) multisetOk = false;
        if (nonzero.length === N && size < N) {
          if (!same(a.slice(size), asc.slice(0, N - size).reverse())) tailOk = false;
        }
      });
      check("binary-heap: 調整が終わったフレームでは、先頭 size 個が最小ヒープの条件(親≦子)を満たす", heapOk);
      check("binary-heap: どのフレームでも値の多重集合が入力(の先頭から)と一致(値が失われない・増えない)", multisetOk);
      check("binary-heap: 取り出し済みの末尾が、小さい順に末尾から並ぶ", tailOk);
      check("binary-heap: 最終の配列が降順(=昇順に取り出し、末尾から並べた)で全要素が確定", same(frames.at(-1).array, asc.slice().reverse()) && Object.keys(frames.at(-1).highlight).length === N);
      check("binary-heap: 追加が終わった時点の根が入力の最小値", (() => {
        const idx = sizes.findIndex((s, i) => s === N && stable[i]);
        return idx >= 0 && frames[idx].array[0] === asc[0];
      })());
    }

    // ---- ロビンフッドハッシュ ----
    {
      const frames = group["robin-hood-hashing"]();
      const SIZE = STR.ROBIN_HOOD_SIZE;
      const keys = STR.ROBIN_HOOD_KEYS;
      // 別実装: 押し出された鍵を再帰で挿入する
      const table = Array(SIZE).fill(null);
      const insert = (key, dib, pos) => {
        const cur = table[pos];
        if (cur === null) {
          table[pos] = { key, dib };
          return;
        }
        if (cur.dib < dib) {
          table[pos] = { key, dib };
          insert(cur.key, cur.dib + 1, (pos + 1) % SIZE);
        } else insert(key, dib + 1, (pos + 1) % SIZE);
      };
      keys.forEach((k) => insert(k, 0, k % SIZE));
      const expectedBars = table.map((s) => (s === null ? 0 : s.dib + 1));
      const last = frames.at(-1);
      check(`robin-hood-hashing: 最終の棒(距離+1)が、別実装の再帰挿入の結果(${expectedBars.join(",")})と一致`, same(last.array, expectedBars), String(last.array));
      check("robin-hood-hashing: 最終の表が、全ての鍵を1回ずつ含む", same(sorted(table.filter(Boolean).map((s) => s.key)), sorted(keys)));
      const distance = (key, pos) => (pos - (key % SIZE) + SIZE) % SIZE;
      check("robin-hood-hashing: 各スロットの距離が、鍵の本来の位置からの実際の距離に一致", table.every((s, pos) => s === null || s.dib === distance(s.key, pos)));
      // 検索が成立する条件: 鍵の本来の位置から実際の位置までの各スロットの距離が、そこまでの道のり以上
      check("robin-hood-hashing: 全ての鍵について、道のり上の各スロットの距離が道のり以上(ロビンフッド不変条件)", table.every((s) => {
        if (s === null) return true;
        for (let t = 0; t < s.dib; t++) {
          const slot = table[((s.key % SIZE) + t) % SIZE];
          if (slot === null || slot.dib < t) return false;
        }
        return true;
      }));
      const find = (key) => {
        let pos = key % SIZE;
        for (let dib = 0; dib < SIZE; dib++) {
          const slot = table[pos];
          if (slot === null || slot.dib < dib) return false;
          if (slot.key === key) return true;
          pos = (pos + 1) % SIZE;
        }
        return false;
      };
      check("robin-hood-hashing: 挿入した鍵は全て検索で見つかり、存在しない鍵(15・42)は見つからない", keys.every(find) && !find(15) && !find(42));
      check("robin-hood-hashing: 押し出し(swapping)が実際に起きる例を含む", frames.some((f) => Object.values(f.highlight).includes("swapping")) && frames.some((f) => f.description.includes("押し出す")));
      check("robin-hood-hashing: 表の一周(0番スロットへの折り返し)を含む", table[0] !== null && table[0].key % SIZE !== 0);
      check("robin-hood-hashing: ライブラリの最終表(robinHoodTable)が別実装と一致", same(STR.robinHoodTable().map((s) => (s === null ? 0 : s.dib + 1)), expectedBars));
    }

    // ---- SOS DP ----
    {
      const frames = group["sos-dp"]();
      const n = STR.SOS_BITS;
      const size = 1 << n;
      const a = STR.SOS_INPUT;
      const brute = Array.from({ length: size }, (_, s) => {
        let sum = 0;
        for (let t = 0; t < size; t++) if ((t & s) === t) sum += a[t];
        return sum;
      });
      check("sos-dp: 最終の各マスの値が、部分集合を全部たどる総当たりの合計と一致", same(frames.at(-1).array, brute), String(frames.at(-1).array));
      check(`sos-dp: フレーム数が 1+ビット数×(1+${size / 2})+1`, frames.length === 1 + n * (1 + size / 2) + 1);
      let inter = true;
      for (let i = 0; i < n; i++) {
        // ビット i までを処理した時点: 下位 i+1 ビットの部分集合だけを足し合わせた値
        const f = frames[(i + 1) * (1 + size / 2)];
        const hiMask = ~((1 << (i + 1)) - 1);
        const expected = Array.from({ length: size }, (_, s) => {
          let sum = 0;
          for (let t = 0; t < size; t++) if ((t & s) === t && (t & hiMask) === (s & hiMask)) sum += a[t];
          return sum;
        });
        if (!same(f.array, expected)) inter = false;
      }
      check("sos-dp: ビットごとの処理が終わった時点の値が「そのビットまでの部分集合の和」と一致", inter);
      check("sos-dp: 全マスが確定", Object.keys(frames.at(-1).highlight).length === size);
    }
  }

  // =========================================================================
  section("追加分(グラフ): コサラジュ法・ブロン・ケルボッシュ法");
  // =========================================================================
  {
    for (const id of ["kosaraju-scc", "bron-kerbosch"]) {
      const frames = GRAPH_VISUALIZERS[id]();
      const dataset = GRAPH_DATASETS[id];
      checkWellFormed(id, frames);
      check(`${id}: データセットが登録され、種類は graph`, dataset !== undefined && VK.visualKindOf(id) === "graph");
      const nodeIds = new Set(dataset.nodes.map((n) => n.id));
      const edgeIds = new Set(dataset.edges.map((e) => e.id));
      check(`${id}: フレームが参照する頂点・辺が全てデータセットにある`, frames.every((f) => Object.keys(f.nodeStates).every((k) => nodeIds.has(k)) && Object.keys(f.edgeStates).every((k) => edgeIds.has(k))));
      check(`${id}: 2回生成しても同一(決定的)`, same(GRAPH_VISUALIZERS[id](), frames));
    }
    // ---- コサラジュ法: 相互到達可能性(推移閉包)から強連結成分を求めて比べる ----
    {
      const nodes = GX.KOSARAJU_NODES.map((n) => n.id);
      const idx = new Map(nodes.map((id, i) => [id, i]));
      const reach = nodes.map((_, i) => nodes.map((_, j) => i === j));
      for (const e of GX.KOSARAJU_EDGES) reach[idx.get(e.from)][idx.get(e.to)] = true;
      for (let k = 0; k < nodes.length; k++) for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) if (reach[i][k] && reach[k][j]) reach[i][j] = true;
      const expected = new Map();
      nodes.forEach((v, i) => {
        const comp = nodes.filter((_, j) => reach[i][j] && reach[j][i]).join(",");
        expected.set(comp, true);
      });
      const frames = GRAPH_VISUALIZERS["kosaraju-scc"]();
      const last = frames.at(-1);
      const found = [...last.description.matchAll(/\{([A-Z,]+)\}/g)].map((m) => m[1]);
      check(`kosaraju-scc: 最終の強連結成分(${found.join(" ")})が、相互到達可能性から求めた成分と一致`, same(found.sort(), [...expected.keys()].sort()), found.join(" "));
      check("kosaraju-scc: 全頂点が確定", Object.values(last.nodeStates).every((s) => s === "settled"));
      // 見つかった順は、成分間の辺の向き(上流→下流)に沿う
      const order = [...last.description.matchAll(/\{([A-Z,]+)\}/g)].map((m) => m[1].split(","));
      const compOf = new Map();
      order.forEach((c, i) => c.forEach((v) => compOf.set(v, i)));
      check("kosaraju-scc: 成分の見つかった順が、成分間の辺の向き(上流から下流)に沿っている", GX.KOSARAJU_EDGES.every((e) => compOf.get(e.from) <= compOf.get(e.to)));
      check("kosaraju-scc: 1回目の終了順の記述が、全頂点を1回ずつ含む", (() => {
        const done = frames.filter((f) => f.description.includes("探索が終わった")).length;
        return done === nodes.length;
      })());
    }
    // ---- ブロン・ケルボッシュ法: 全部分集合を調べる総当たり ----
    {
      const ids = GX.CLIQUE_NODES.map((n) => n.id);
      const edge = new Set(GX.CLIQUE_EDGES.flatMap((e) => [`${e.from}${e.to}`, `${e.to}${e.from}`]));
      const isClique = (set) => set.every((u) => set.every((v) => u === v || edge.has(`${u}${v}`)));
      const cliques = [];
      for (let m = 1; m < 1 << ids.length; m++) {
        const set = ids.filter((_, i) => (m >> i) & 1);
        if (isClique(set)) cliques.push(set);
      }
      const maximal = cliques.filter((c) => !cliques.some((d) => d.length > c.length && c.every((v) => d.includes(v)))).map((c) => c.join(",")).sort();
      const frames = GRAPH_VISUALIZERS["bron-kerbosch"]();
      const reported = frames.flatMap((f) => [...f.description.matchAll(/→ \{([A-Z,]+)\} は極大クリーク/g)].map((m) => m[1])).sort();
      check(`bron-kerbosch: 報告された極大クリーク(${reported.join(" ")})が、全部分集合の総当たりで求めた極大クリークと一致(重複なし)`, same(reported, maximal), `${reported} vs ${maximal}`);
      check("bron-kerbosch: ピボットを選ぶフレームがある", frames.some((f) => f.description.includes("ピボット")));
    }
  }

  // =========================================================================
  section("追加分(文字列): ホースプール法・デュヴァル法");
  // =========================================================================
  {
    for (const id of ["boyer-moore-horspool", "duval-lyndon-factorization"]) {
      const frames = STRING_VISUALIZERS[id]();
      checkWellFormed(id, frames);
      check(`${id}: 種類は string・決定的・文字の添字が範囲内`, VK.visualKindOf(id) === "string" && same(STRING_VISUALIZERS[id](), frames) && frames.every((f) => Object.keys(f.textHighlight).every((k) => Number(k) < f.text.length) && Object.keys(f.patternHighlight).every((k) => Number(k) < Math.max(f.pattern.length, 1))));
    }
    // ---- ホースプール ----
    {
      const frames = STRING_VISUALIZERS["boyer-moore-horspool"]();
      const text = SX.HORSPOOL_TEXT;
      const pat = SX.HORSPOOL_PATTERN;
      const naive = [];
      for (let s = 0; s + pat.length <= text.length; s++) if (text.startsWith(pat, s)) naive.push(s);
      const matchedStarts = frames.filter((f) => Object.values(f.textHighlight).filter((v) => v === "matched").length === pat.length).map((f) => f.patternOffset);
      check(`horspool: 一致の報告位置(${matchedStarts})が、素朴な全探索(${naive})と一致`, same(matchedStarts, naive));
      // ずらし幅: 窓の末尾の文字が、パターン末尾を除く部分に最後に現れる位置から末尾までの距離(無ければ m)
      const shiftOf = (c) => {
        const k = pat.slice(0, -1).lastIndexOf(c);
        return k < 0 ? pat.length : pat.length - 1 - k;
      };
      const offsets = [...new Set(frames.slice(1, -1).map((f) => f.patternOffset))];
      check("horspool: 隣り合う窓の位置の差が、窓の末尾の文字から決まるずらし幅に一致", offsets.every((s, i) => i === offsets.length - 1 || offsets[i + 1] - s === shiftOf(text[s + pat.length - 1])), String(offsets));
      check(`horspool: 窓の数(${offsets.length})が全位置(${text.length - pat.length + 1})より少ない(スキップが効いている)`, offsets.length < text.length - pat.length + 1);
    }
    // ---- デュヴァル ----
    {
      const frames = STRING_VISUALIZERS["duval-lyndon-factorization"]();
      const s = SX.DUVAL_INPUT;
      const out = frames.at(-1).pattern.split("|");
      // 定義による別実装: 最長のリンドン語の接頭辞を繰り返し切り出す
      const isLyndon = (w) => w.length > 0 && Array.from({ length: w.length - 1 }, (_, i) => w.slice(i + 1)).every((suf) => suf > w);
      const byDefinition = [];
      for (let rest = s; rest.length > 0; ) {
        let len = rest.length;
        while (!isLyndon(rest.slice(0, len))) len--;
        byDefinition.push(rest.slice(0, len));
        rest = rest.slice(len);
      }
      check(`duval: 出力の因子(${out.join("|")})が、定義(最長のリンドン語の接頭辞を切り出す)による分解(${byDefinition.join("|")})と一致`, same(out, byDefinition));
      check("duval: 因子をつなぐと入力に一致し、各因子はリンドン語で、辞書順で弱い降順", out.join("") === s && out.every(isLyndon) && out.every((f, i) => i === 0 || out[i - 1] >= f));
      check("duval: ライブラリの分解(duvalFactors)も同じ結果", same(SX.duvalFactors(s), byDefinition));
      let totalOk = true;
      for (const t of ["banana", "abababc", "aaaa", "zyx", "abcabcabc", "bab", "a", "abaabaaabaababaaab"]) {
        const ref = [];
        for (let rest = t; rest.length > 0; ) {
          let len = rest.length;
          while (!isLyndon(rest.slice(0, len))) len--;
          ref.push(rest.slice(0, len));
          rest = rest.slice(len);
        }
        if (!same(SX.duvalFactors(t), ref)) totalOk = false;
      }
      check("duval: 8通りの別の文字列でも、デュヴァル法の分解が定義による分解と一致", totalOk);
    }
  }

  // =========================================================================
  section("追加分(2): 区間ふるい・カッコウフィルタ・ラマー・ダグラス・ポイカー法");
  // =========================================================================
  {
    const group = BAR.BAR_GROUPS.structure;
    for (const id of ["segmented-sieve", "cuckoo-filter"]) {
      checkWellFormed(id, group[id]());
      check(`${id}: 棒グラフのグループ structure に登録され、種類は search`, BAR.barGroupOf(id) === "structure" && VK.visualKindOf(id) === "search");
    }
    // ---- 区間ふるい ----
    {
      const frames = group["segmented-sieve"]();
      const lo = STR.SEGMENT_LO;
      const hi = STR.SEGMENT_HI;
      const isPrime = (n) => n >= 2 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d !== 0);
      const expected = Array.from({ length: hi - lo }, (_, i) => lo + i).filter(isPrime);
      const last = frames.at(-1);
      const survivors = last.array.filter((_, i) => last.highlight[i] === "settled");
      check(`segmented-sieve: 最後に確定した数(${survivors.join(",")})が、試し割りで求めた素数と一致`, same(survivors, expected));
      check("segmented-sieve: 棒の値が区間の整数そのもの(変化しない)", frames.every((f) => same(f.array, Array.from({ length: hi - lo }, (_, i) => lo + i))));
      check("segmented-sieve: 消されたもの(swapping)と確定したもの(settled)で区間全体を過不足なく分けている", Object.keys(last.highlight).length === hi - lo);
      const smallPrimes = [];
      for (let q = 2; q * q < hi; q++) if (isPrime(q)) smallPrimes.push(q);
      let stageOk = true;
      smallPrimes.forEach((p, k) => {
        const f = frames[2 + 2 * k];
        const upto = smallPrimes.slice(0, k + 1);
        const expectedCrossed = Array.from({ length: hi - lo }, (_, i) => lo + i).filter((n) => upto.some((q) => n % q === 0 && n >= q * q));
        const got = Object.entries(f.highlight).filter(([, v]) => v === "swapping").map(([i]) => lo + Number(i));
        if (!same(got.sort((a, b) => a - b), expectedCrossed)) stageOk = false;
        const start = Math.max(p * p, Math.ceil(lo / p) * p);
        if (!frames[1 + 2 * k].description.includes(`= ${start}。`)) stageOk = false;
      });
      check("segmented-sieve: 各素数の処理後に消されている数が「その素数以下の素数の、p²以上の倍数」と一致し、最初の倍数の計算も一致", stageOk);
      check("segmented-sieve: フレーム数が 1+2×(√上限以下の素数の数)+1", frames.length === 2 + 2 * smallPrimes.length);
    }
    // ---- カッコウフィルタ ----
    {
      const run = STR.cuckooFilterRun();
      const { frames, table, inserted } = run;
      check("cuckoo-filter: 全部の挿入が成功している(この入力・負荷率で失敗しない)", run.failed.length === 0 && inserted.length === STR.CUCKOO_ITEMS.length);
      check("cuckoo-filter: どのバケットもスロット数を超えない・指紋は1〜15", table.every((bucket) => bucket.length <= STR.CUCKOO_BUCKET_SIZE && bucket.every((fp) => fp >= 1 && fp <= 15)));
      check("cuckoo-filter: 格納した指紋の総数が挿入に成功した要素数に一致(失われず、増えない)", table.flat().length === inserted.length);
      // 指紋だけから往復できる(部分キー・カッコウハッシュの性質)
      let involution = true;
      for (let fp = 1; fp <= 15; fp++) for (let i = 0; i < STR.CUCKOO_BUCKETS; i++) if (STR.cuckooAlt(STR.cuckooAlt(i, fp), fp) !== i) involution = false;
      check("cuckoo-filter: もう一方の候補バケットを2回求めると元に戻る(XOR)", involution);
      // 偽陰性がない: 挿入した要素の指紋は、必ず2つの候補バケットのどちらかにある
      const bag = table.map((bucket) => [...bucket]);
      const present = (item) => {
        const fp = STR.cuckooFingerprint(item);
        const i1 = STR.cuckooBucket1(item);
        return bag[i1].includes(fp) || bag[STR.cuckooAlt(i1, fp)].includes(fp);
      };
      check("cuckoo-filter: 挿入した全要素について、指紋が2つの候補バケットのどちらかにある(偽陰性なし)", inserted.every(present));
      // 独立の確認: 各要素に1つずつ指紋を割り当てられる(重複を含む多重集合として、全要素の指紋が表に過不足なく含まれる)
      const need = inserted.map((it) => STR.cuckooFingerprint(it)).sort((a, b) => a - b);
      check("cuckoo-filter: 表の指紋の多重集合が、挿入した要素の指紋の多重集合と一致", same(table.flat().sort((a, b) => a - b), need));
      const nonZero = frames.map((f) => f.array.filter((v) => v !== 0).length);
      check("cuckoo-filter: 格納数がフレームを通じて減らない", nonZero.every((c, i) => i === 0 || c >= nonZero[i - 1]));
      check("cuckoo-filter: 追い出し(swapping)が実際に起きている", frames.some((f) => Object.values(f.highlight).includes("swapping")));
      check("cuckoo-filter: 最終の棒が表の内容と一致", same(frames.at(-1).array, Array.from({ length: STR.CUCKOO_BUCKETS * STR.CUCKOO_BUCKET_SIZE }, (_, k) => table[Math.floor(k / STR.CUCKOO_BUCKET_SIZE)][k % STR.CUCKOO_BUCKET_SIZE] ?? 0)));
    }
    // ---- ラマー・ダグラス・ポイカー ----
    {
      const id = "ramer-douglas-peucker";
      const frames = GEOMETRY_VISUALIZERS[id]();
      checkWellFormed(id, frames);
      check(`${id}: データセットが登録され、種類は geometry`, GEOMETRY_DATASETS[id] !== undefined && VK.visualKindOf(id) === "geometry");
      const pts = GEX.RDP_POINTS;
      const eps = GEX.RDP_EPSILON;
      // 独立実装: 明示的なスタックで、弦から最も遠い点を調べる
      const dist = (p, a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        return len === 0 ? Math.hypot(p.x - a.x, p.y - a.y) : Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y)) / len;
      };
      const keep = new Set([0, pts.length - 1]);
      const stack = [[0, pts.length - 1]];
      while (stack.length) {
        const [lo, hi] = stack.pop();
        let far = -1, dm = -1;
        for (let i = lo + 1; i < hi; i++) {
          const d = dist(pts[i], pts[lo], pts[hi]);
          if (d > dm) { dm = d; far = i; }
        }
        if (far >= 0 && dm > eps) {
          keep.add(far);
          stack.push([lo, far], [far, hi]);
        }
      }
      const last = frames.at(-1);
      const hull = pts.map((p, i) => i).filter((i) => last.pointStates[pts[i].id] === "hull");
      check(`${id}: 残った点(${hull.join(",")})が、独立実装(明示的スタック)の結果(${[...keep].sort((a, b) => a - b).join(",")})と一致`, same(hull, [...keep].sort((a, b) => a - b)));
      const keptSorted = [...keep].sort((a, b) => a - b);
      check(`${id}: 除外した点がすべて、両隣の残った点を結ぶ弦から ε 以内`, pts.every((p, i) => {
        if (keep.has(i)) return true;
        const lo = Math.max(...keptSorted.filter((k) => k < i));
        const hi = Math.min(...keptSorted.filter((k) => k > i));
        return dist(p, pts[lo], pts[hi]) <= eps;
      }));
      check(`${id}: 残した内部の点は、そこで二分した弦から ε を超えている(必要な点だけを残している)`, keptSorted.slice(1, -1).every((i) => {
        // その点を除いたとき、両隣の残った点を結ぶ弦からの距離が ε を超える、とは限らないため、再帰で選ばれた時点の弦を再現して確かめる
        let lo = 0, hi = pts.length - 1;
        for (;;) {
          let far = -1, dm = -1;
          for (let k = lo + 1; k < hi; k++) { const d = dist(pts[k], pts[lo], pts[hi]); if (d > dm) { dm = d; far = k; } }
          if (far === i) return dm > eps;
          if (far < 0) return false;
          if (i < far) hi = far; else lo = far;
        }
      }));
      check(`${id}: 最終フレームの確定線分(final)が、残した点を順につないだものと一致`, (() => {
        const finals = last.segments.filter((s) => s.state === "final").map((s) => `${s.from}-${s.to}`).sort();
        const expectedSegs = keptSorted.slice(1).map((k, i) => `P${keptSorted[i]}-P${k}`).sort();
        return same(finals, expectedSegs);
      })());
    }
  }


  // =========================================================================
  section("追加分(3): スプレイグ・グランディ・Isolation Forest・ウィルソンスコア");
  // =========================================================================
  {
    const est = BAR.BAR_GROUPS.estimate;
    for (const id of ["sprague-grundy-nim", "isolation-forest"]) {
      checkWellFormed(id, est[id]());
      check(`${id}: 棒グラフのグループ estimate に登録され、種類は search`, BAR.barGroupOf(id) === "estimate" && VK.visualKindOf(id) === "search");
    }
    // ---- スプレイグ・グランディ ----
    {
      const frames = est["sprague-grundy-nim"]();
      const moves = EST.GRUNDY_MOVES;
      const N = EST.GRUNDY_MAX;
      // 全探索で勝敗を求める(手番の者が動けなければ負け)
      const wins = [];
      for (let n = 0; n <= N; n++) wins[n] = moves.some((m) => n >= m && !wins[n - m]);
      // 別実装のGrundy数: 到達先の値を配列に集めて最小の欠けている数を探す
      const g = [];
      for (let n = 0; n <= N; n++) {
        const reach = moves.filter((m) => n >= m).map((m) => g[n - m]);
        let v = 0;
        while (reach.includes(v)) v++;
        g[n] = v;
      }
      const last = frames.at(-1);
      check(`sprague-grundy-nim: 最終の棒が、別実装のGrundy数(${g.join(",")})と一致`, same(last.array, g), String(last.array));
      check("sprague-grundy-nim: g(n)=0 ⇔ 手番の者が負け(全探索の勝敗と一致)", g.every((v, n) => (v === 0) === !wins[n]));
      check("sprague-grundy-nim: 周期7で繰り返す(g(n)=g(n+7))", g.every((v, n) => n + 7 > N || g[n + 7] === v));
      // 2つの山の和: Grundy数のXORが0 ⇔ 全探索で負け
      const M = 14;
      const sumWins = Array.from({ length: M + 1 }, () => Array(M + 1).fill(false));
      for (let a = 0; a <= M; a++) for (let b = 0; b <= M; b++) {
        let win = false;
        for (const m of moves) {
          if (a >= m && !sumWins[a - m][b]) win = true;
          if (b >= m && !sumWins[a][b - m]) win = true;
        }
        sumWins[a][b] = win;
      }
      check(`sprague-grundy-nim: 2つの山(0〜${M}個ずつ)の和で、XORが0 ⇔ 手番の者が負け(全探索と一致)`, g.slice(0, M + 1).every((ga, a) => g.slice(0, M + 1).every((gb, b) => ((ga ^ gb) === 0) === !sumWins[a][b])));
      check("sprague-grundy-nim: n=1..20 を1フレームずつ(1+1+20+1)・各フレームで計算済みの棒は変わらない", frames.length === N + 3 && frames.slice(1).every((f, i) => i === 0 || f.array.slice(0, i).every((v, k) => v === frames[i].array[k]) ));
    }
    // ---- Isolation Forest ----
    {
      const run = EST.isolationForestRun();
      const { frames, trees, depths, scores } = run;
      const data = EST.ISOLATION_DATA;
      const c = (n) => (n <= 1 ? 0 : 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n);
      let structureOk = true;
      let depthOk = true;
      trees.forEach((nodes, t) => {
        const derived = Array(data.length).fill(null);
        for (const node of nodes) {
          const vals = node.members.map((i) => data[i]);
          if (node.split === null) {
            for (const i of node.members) derived[i] = node.depth + c(node.members.length);
            if (!(node.depth >= EST.ISOLATION_DEPTH_LIMIT || node.members.length <= 1 || Math.min(...vals) === Math.max(...vals))) structureOk = false;
          } else {
            if (!(node.split > Math.min(...vals) && node.split < Math.max(...vals))) structureOk = false;
            const l = node.members.filter((i) => data[i] < node.split);
            const r = node.members.filter((i) => data[i] >= node.split);
            if (!same(l, node.left) || !same(r, node.right) || l.length + r.length !== node.members.length) structureOk = false;
          }
        }
        if (derived.some((d, i) => d === null || Math.abs(d - depths[t][i]) > 1e-12)) depthOk = false;
      });
      check("isolation-forest: 全ノードで、分割値が点の範囲の内側・左右が分割値で正しく分かれる・葉の条件(1点・深さ上限・同値)を満たす", structureOk);
      check("isolation-forest: 各木・各点の経路長が、記録した分割から独立に求めた「深さ + c(葉の点数)」と一致", depthOk);
      const mean = data.map((_, i) => depths.reduce((s, d) => s + d[i], 0) / depths.length);
      const expectedScores = mean.map((h) => 2 ** (-h / c(data.length)));
      check("isolation-forest: 異常スコアが 2^(−平均経路長/c(10)) と一致", expectedScores.every((v, i) => Math.abs(v - scores[i]) < 1e-12));
      check("isolation-forest: 外れ値(40)のスコアが最大で、平均経路長が最小", scores.indexOf(Math.max(...scores)) === data.indexOf(40) && mean.indexOf(Math.min(...mean)) === data.indexOf(40));
      check("isolation-forest: 外れ値のスコアが他のどの点より 0.2 以上大きい", scores.every((s, i) => i === data.indexOf(40) || scores[data.indexOf(40)] - s > 0.2));
      let running = true;
      for (let t = 0; t < depths.length; t++) {
        const avg = data.map((_, i) => depths.slice(0, t + 1).reduce((s, d) => s + d[i], 0) / (t + 1));
        if (!avg.every((v, i) => Math.abs(v - frames[t + 1].array[i]) < 1e-12)) running = false;
      }
      check("isolation-forest: 途中の棒が、そこまでの木の平均経路長と一致", running);
      check("isolation-forest: 最終の棒が スコア×100(小数1桁)", frames.at(-1).array.every((v, i) => Math.abs(v - Math.round(scores[i] * 1000) / 10) < 1e-9));
      check("isolation-forest: スコアがすべて 0 と 1 の間", scores.every((s) => s > 0 && s < 1));
    }
    // ---- ウィルソンスコア ----
    {
      const id = "wilson-score-interval";
      const group = BAR.BAR_GROUPS.ranking;
      const frames = group[id]();
      checkWellFormed(id, frames);
      check(`${id}: 棒グラフのグループ ranking に登録され、種類は search`, BAR.barGroupOf(id) === "ranking" && VK.visualKindOf(id) === "search");
      const items = RANKV.WILSON_ITEMS;
      const z = RANKV.WILSON_Z;
      // 別の導出: 二次方程式 (1+z²/n)p² − (2p̂+z²/n)p + p̂² = 0 の小さい方の解が下限
      const lowerByQuadratic = (k, n) => {
        const ph = k / n;
        const a = 1 + (z * z) / n;
        const b = -(2 * ph + (z * z) / n);
        const cc = ph * ph;
        return (-b - Math.sqrt(b * b - 4 * a * cc)) / (2 * a);
      };
      const last = frames.at(-1);
      check("wilson-score-interval: 最終の棒が、二次方程式の解として独立に求めた下限(%)と一致(小数1桁)", items.every((it, i) => Math.abs(last.array[i] - lowerByQuadratic(it.positive, it.total) * 100) <= 0.05 + 1e-9), String(last.array));
      check("wilson-score-interval: 下限が観測した割合より小さい", items.every((it, i) => last.array[i] < (it.positive / it.total) * 100));
      const rankNaive = items.map((it, i) => i).sort((a, b) => items[b].positive / items[b].total - items[a].positive / items[a].total);
      const rankWilson = items.map((it, i) => i).sort((a, b) => last.array[b] - last.array[a]);
      check("wilson-score-interval: 割合の順の1位は A(2件の満点)、下限の順の1位は E(1000件の92%)", items[rankNaive[0]].name === "A" && items[rankWilson[0]].name === "E");
      // 同じ割合(90%)なら、評価が多いほど下限が大きい
      const ninety = items.map((it, i) => [it, last.array[i]]).filter(([it]) => Math.abs(it.positive / it.total - 0.9) < 1e-9).sort((a, b) => a[0].total - b[0].total);
      check("wilson-score-interval: 同じ割合(90%)の項目では、評価が多いほど下限が大きい", ninety.length >= 3 && ninety.every(([, v], i) => i === 0 || v > ninety[i - 1][1]));
      check("wilson-score-interval: フレーム数が 1+項目数+1", frames.length === items.length + 2);
    }
  }


  // =========================================================================
  section("追加分(4): ガウス・ザイデル法・Soundex・メディアンフィルタ");
  // =========================================================================
  {
    // ---- ガウス・ザイデル法 ----
    {
      const id = "gauss-seidel-method";
      const est = BAR.BAR_GROUPS.estimate;
      checkWellFormed(id, est[id]());
      check(`${id}: 棒グラフのグループ estimate に登録され、種類は search`, BAR.barGroupOf(id) === "estimate" && VK.visualKindOf(id) === "search");
      const { frames, sweeps } = EST.gaussSeidelRun();
      const A = EST.GS_MATRIX;
      const b = EST.GS_RHS;
      const n = b.length;
      // 独立の解: 掃き出し法(部分ピボット選択つきガウスの消去法)
      const aug = A.map((row, i) => [...row, b[i]]);
      for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[p][c])) p = r;
        [aug[c], aug[p]] = [aug[p], aug[c]];
        for (let r = 0; r < n; r++) {
          if (r === c) continue;
          const f = aug[r][c] / aug[c][c];
          for (let k = c; k <= n; k++) aug[r][k] -= f * aug[c][k];
        }
      }
      const exact = aug.map((row, i) => row[n] / row[i]);
      const last = frames.at(-1);
      check(`gauss-seidel-method: 最終の解(${last.array.map((v) => v.toFixed(4))})が、ガウスの消去法による厳密解(${exact})に 1e-3 以内で一致`, last.array.every((v, i) => Math.abs(v - exact[i]) < 1e-3));
      check("gauss-seidel-method: 定数 GS_EXACT が、独立に求めた厳密解と一致", EST.GS_EXACT.every((v, i) => Math.abs(v - exact[i]) < 1e-9));
      // 各フレームの更新を、直前のフレームの配列から式どおりに再計算して比べる(更新済みの値を使う)
      let replayOk = true;
      for (let f = 1; f < frames.length - 1; f++) {
        const i = (f - 1) % n;
        const prev = frames[f - 1].array;
        let s = 0;
        for (let j = 0; j < n; j++) if (j !== i) s += A[i][j] * prev[j];
        const expected = prev.map((v, k) => (k === i ? (b[i] - s) / A[i][i] : v));
        if (!expected.every((v, k) => Math.abs(v - frames[f].array[k]) < 1e-12)) replayOk = false;
      }
      check("gauss-seidel-method: 全フレームの更新が、直前の配列(更新済みの成分を含む)から式どおりに再計算した値と一致", replayOk);
      const errs = sweeps.map((x) => Math.max(...x.map((v, i) => Math.abs(v - exact[i]))));
      check(`gauss-seidel-method: 各周の後の最大誤差が単調に減る(狭義対角優位なので収束する): ${errs.map((e) => e.toExponential(1)).join(" → ")}`, errs.every((e, i) => i === 0 || e < errs[i - 1]));
      check("gauss-seidel-method: フレーム数が 1+周数×4+1", frames.length === 1 + sweeps.length * n + 1);
      // ヤコビ法(別実装)より少ない周数で同じ許容誤差に達する
      let x = Array(n).fill(0);
      let jacobi = 0;
      for (; jacobi < 1000; jacobi++) {
        const next = x.map((_, i) => (b[i] - A[i].reduce((s, a, j) => (j === i ? s : s + a * x[j]), 0)) / A[i][i]);
        const change = Math.max(...next.map((v, i) => Math.abs(v - x[i])));
        x = next;
        if (change < EST.GS_TOLERANCE) break;
      }
      check(`gauss-seidel-method: ヤコビ法(${jacobi + 1}周)より少ない周数(${sweeps.length}周)で収束する`, sweeps.length < jacobi + 1);
    }
    // ---- Soundex ----
    {
      const id = "soundex-phonetic-encoding";
      const frames = STRING_VISUALIZERS[id]();
      checkWellFormed(id, frames);
      check(`${id}: 種類は string・決定的`, VK.visualKindOf(id) === "string" && same(STRING_VISUALIZERS[id](), frames));
      // 別の導出: H・W を取り除く → 数字に写す → 連続する同じ値を1つにする → 先頭の数字・母音の印を除く
      const digitOf = (ch) => ({ B: 1, F: 1, P: 1, V: 1, C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2, D: 3, T: 3, L: 4, M: 5, N: 5, R: 6 })[ch] ?? 0;
      const reference = (name) => {
        const up = name.toUpperCase();
        const rest = [...up.slice(1)].filter((c) => c !== "H" && c !== "W");
        const seq = [up[0], ...rest].map(digitOf);
        const collapsed = seq.filter((v, i) => i === 0 || v !== seq[i - 1]);
        const digits = collapsed.slice(1).filter((v) => v !== 0);
        return (up[0] + digits.join("") + "000").slice(0, 4);
      };
      // 公開されている代表的な値(独立した既知の答え)
      const known = { Robert: "R163", Rupert: "R163", Rubin: "R150", Ashcraft: "A261", Tymczak: "T522", Pfister: "P236", Honeyman: "H555", Washington: "W252", Lee: "L000", Gutierrez: "G362", Jackson: "J250" };
      check("soundex: 代表的な11個の名前で、公開されている既知の符号と一致", Object.entries(known).every(([name, code]) => SX.soundexCode(name) === code), JSON.stringify(Object.entries(known).filter(([n, c]) => SX.soundexCode(n) !== c)));
      const names = ["Smith", "Smythe", "Schmidt", "Lloyd", "Pfeiffer", "Wright", "Whitney", "Kuhn", "Cooper", "Ng", "Oxford", "Burroughs", "Vanderbilt"];
      check("soundex: 別の導出(H・W除去→数字化→連続の併合)と、13個の名前で一致", names.every((nm) => SX.soundexCode(nm) === reference(nm)), names.filter((nm) => SX.soundexCode(nm) !== reference(nm)).join(","));
      check(`soundex: 最終フレームの符号(${frames.at(-1).pattern})が、可視化の名前(${SX.SOUNDEX_NAME})の符号と一致`, frames.at(-1).pattern === SX.soundexCode(SX.SOUNDEX_NAME) && frames.at(-1).pattern === reference(SX.SOUNDEX_NAME));
      check("soundex: フレーム数が 1+文字数+1(先頭の文字と、続く文字ごとに1つ、最後の整形)", frames.length === 1 + SX.SOUNDEX_NAME.length + 1);
      check("soundex: 符号が追加される文字はすべて「matched」で印が付く", frames.slice(1, -1).every((f, i) => i === 0 || f.pattern.length === frames[i].pattern.length || Object.keys(f.textHighlight).every((k) => f.textHighlight[k] === "matched")));
    }
    // ---- メディアンフィルタ ----
    {
      const id = "median-filter";
      const frames = SIGNAL_VISUALIZERS[id]();
      checkWellFormed(id, frames);
      check(`${id}: SIGNAL_METAのチップがあり、種類は signal`, (SIGNAL_META[id]?.chips.length ?? 0) > 0 && VK.visualKindOf(id) === "signal");
      const input = SGX.medianInput();
      const N = input.length;
      const median = input.map((_, k) => {
        const w = [];
        for (let t = -2; t <= 2; t++) w.push(input[Math.min(Math.max(k + t, 0), N - 1)]);
        return w.sort((a, c) => a - c)[2];
      });
      const mean = input.map((_, k) => {
        let s = 0;
        for (let t = -2; t <= 2; t++) s += input[Math.min(Math.max(k + t, 0), N - 1)];
        return s / 5;
      });
      const last = frames.at(-1);
      const panel = (fr, pid) => fr.panels.find((p) => p.id === pid).values;
      check("median-filter: 最終フレームのメディアンのパネルが、窓を並べ替える総当たりの中央値と一致", same(panel(last, "median"), median));
      check("median-filter: 最終フレームの移動平均のパネルが、窓の合計を窓幅で割った値と一致", panel(last, "mean").every((v, k) => Math.abs(v - mean[k]) < 1e-12));
      const clean = input.map((v, k) => v - (SGX.MEDIAN_SPIKES[k] ?? 0));
      check("median-filter: 外れ値は窓の半分未満なので、メディアンは外れ値の無い元の階段と完全に一致する(階段の角も保たれる)", same(median, clean));
      check("median-filter: 移動平均は元の階段から 1 以上ずれる点がある(外れ値が広がる)", mean.some((v, k) => Math.abs(v - clean[k]) >= 1));
      check("median-filter: 時刻ごとに1フレームずつ進む(フレーム数 N+2)", frames.length === N + 2);
    }
  }


  // =========================================================================
  section("追加分(5): ストライド・UCB1・トンプソン・ブレゼンハム・Zバッファ・α-β・ゲルツェル・FM合成");
  // =========================================================================
  {
    const est = BAR.BAR_GROUPS.estimate;
    const structure = BAR.BAR_GROUPS.structure;
    for (const id of ["stride-scheduling", "ucb1-bandit", "thompson-sampling", "bresenham-line-algorithm"]) {
      checkWellFormed(id, est[id]());
      check(`${id}: 棒グラフのグループ estimate に登録され、種類は search`, BAR.barGroupOf(id) === "estimate" && VK.visualKindOf(id) === "search");
    }
    checkWellFormed("z-buffer", structure["z-buffer"]());
    check("z-buffer: 棒グラフのグループ structure に登録され、種類は search", BAR.barGroupOf("z-buffer") === "structure" && VK.visualKindOf("z-buffer") === "search");

    // ---- ストライドスケジューリング ----
    {
      const { frames, schedule, passes } = EST.strideRun();
      const tickets = EST.STRIDE_TICKETS.map((p) => p.tickets);
      const total = tickets.reduce((a, b) => a + b, 0);
      // 別実装: 配列を毎回全探索して pass 最小(同点は小さい番号)を選ぶ
      const pass = tickets.map(() => 0);
      const expected = [];
      for (let q = 0; q < EST.STRIDE_QUANTA; q++) {
        let best = 0;
        for (let i = 1; i < pass.length; i++) if (pass[i] < pass[best]) best = i;
        expected.push(best);
        pass[best] += EST.STRIDE_L / tickets[best];
      }
      check(`stride-scheduling: 割り当ての順(${schedule.map((i) => "ABC"[i]).join("")})が、別実装の「pass最小を選んで歩幅だけ進める」と一致`, same(schedule, expected));
      let share = true;
      const counts = tickets.map(() => 0);
      schedule.forEach((who, q) => {
        counts[who]++;
        tickets.forEach((t, i) => {
          if (Math.abs(counts[i] - ((q + 1) * t) / total) >= 1) share = false;
        });
      });
      check("stride-scheduling: どの時点でも、各プロセスの実行回数が理想の配分(回数×チケット/合計)から1枠未満のずれ", share);
      check(`stride-scheduling: ${EST.STRIDE_QUANTA}枠の回数がチケット比 ${tickets.join(":")} に一致`, same(counts, tickets.map((t) => (EST.STRIDE_QUANTA * t) / total)));
      check("stride-scheduling: 各フレームの棒が pass 値(最小を実行した直後の値)と一致し、実行したプロセスだけが歩幅ぶん増える", passes.every((p, q) => frames[q + 1].array.every((v, i) => v === p[i])) && passes.every((p, q) => p.every((v, i) => v - (q > 0 ? passes[q - 1][i] : 0) === (i === schedule[q] ? EST.STRIDE_L / tickets[i] : 0))));
    }
    // ---- UCB1 ----
    {
      const { frames, history } = EST.ucb1Run();
      const k = EST.BANDIT_PROBS.length;
      const counts = Array(k).fill(0);
      const sums = Array(k).fill(0);
      let ok = true;
      let barsOk = true;
      history.forEach(({ arm, reward }, idx) => {
        const t = idx + 1;
        if (t <= k) {
          if (arm !== t - 1) ok = false;
        } else {
          const scores = sums.map((s, i) => s / counts[i] + Math.sqrt((2 * Math.log(t)) / counts[i]));
          if (arm !== scores.indexOf(Math.max(...scores))) ok = false;
          if (!scores.every((v, i) => Math.abs(v - frames[t].array[i]) < 1e-12)) barsOk = false;
        }
        counts[arm]++;
        sums[arm] += reward;
      });
      check("ucb1-bandit: 全ラウンドの選択が、履歴から再計算した「平均 + √(2 ln n / 回数)」の最大の腕と一致(最初の3回は1腕ずつ)", ok);
      check("ucb1-bandit: 各フレームの棒が、その時点の履歴から再計算したUCBスコアと一致", barsOk);
      check("ucb1-bandit: 報酬は0か1、引いた回数の合計がラウンド数", history.every((h) => h.reward === 0 || h.reward === 1) && counts.reduce((a, b) => a + b, 0) === EST.BANDIT_ROUNDS);
      check(`ucb1-bandit: 最も当たりやすい腕(確率0.7)が最も多く引かれ、全部の腕が2回以上は引かれている(${counts})`, counts.indexOf(Math.max(...counts)) === EST.BANDIT_PROBS.indexOf(Math.max(...EST.BANDIT_PROBS)) && counts.every((c) => c >= 2));
      const last = frames.at(-1);
      check("ucb1-bandit: 最終の棒が、履歴から求めた各腕の平均報酬", last.array.every((v, i) => Math.abs(v - sums[i] / counts[i]) < 1e-12));
    }
    // ---- トンプソンサンプリング ----
    {
      const { frames, history, samples } = EST.thompsonRun();
      const k = EST.BANDIT_PROBS.length;
      let argmaxOk = true;
      let barsOk = true;
      const wins = Array(k).fill(1);
      const losses = Array(k).fill(1);
      history.forEach(({ arm, reward }, idx) => {
        if (arm !== samples[idx].indexOf(Math.max(...samples[idx]))) argmaxOk = false;
        if (!samples[idx].every((v, i) => same(v, frames[idx + 1].array[i]) && v > 0 && v < 1)) barsOk = false;
        wins[arm] += reward;
        losses[arm] += 1 - reward;
      });
      check("thompson-sampling: 全ラウンドで、引いた標本が最大の腕が選ばれている", argmaxOk);
      check("thompson-sampling: 各フレームの棒が引いた標本で、すべて 0 と 1 の間", barsOk);
      const last = frames.at(-1);
      check("thompson-sampling: 最終の棒が、履歴から求めた事後平均 (当たり+1)/(試行+2)", last.array.every((v, i) => Math.abs(v - wins[i] / (wins[i] + losses[i])) < 1e-12));
      const pulls = [0, 1, 2].map((a) => history.filter((h) => h.arm === a).length);
      check(`thompson-sampling: 最も当たりやすい腕が最も多く引かれる(${pulls})`, pulls.indexOf(Math.max(...pulls)) === 2 && history.length === EST.BANDIT_ROUNDS);
      // Beta標本器そのものの検証: 平均 a/(a+b)、分散 ab/((a+b)²(a+b+1)) に近い
      let momentsOk = true;
      for (const [a, b] of [[1, 1], [3, 7], [0.5, 0.5], [20, 5]]) {
        const sample = EST.makeBetaSampler(EST.makeRng(2024));
        const xs = Array.from({ length: 40000 }, () => sample(a, b));
        const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
        const variance = xs.reduce((s, v) => s + (v - mean) ** 2, 0) / xs.length;
        const em = a / (a + b);
        const ev = (a * b) / ((a + b) ** 2 * (a + b + 1));
        if (Math.abs(mean - em) > 0.01 || Math.abs(variance - ev) > 0.005 || xs.some((v) => v < 0 || v > 1)) momentsOk = false;
      }
      check("thompson-sampling: Beta標本器の平均・分散が、Beta(1,1)・(3,7)・(0.5,0.5)・(20,5) の理論値に近い(4万個)", momentsOk);
    }
    // ---- ブレゼンハム ----
    {
      const frames = est["bresenham-line-algorithm"]();
      const { x0, y0, x1, y1 } = EST.BRESENHAM_LINE;
      const last = frames.at(-1);
      const slope = (y1 - y0) / (x1 - x0);
      const exact = Array.from({ length: x1 - x0 + 1 }, (_, i) => Math.floor(y0 + slope * i + 0.5)); // 理想の線を四捨五入
      check(`bresenham-line-algorithm: 各列の y(${last.array})が、理想の線 y=${slope}·x の四捨五入と一致(浮動小数点の参照)`, same(last.array, exact));
      check("bresenham-line-algorithm: どの列も理想の線から 0.5 以内、始点・終点を厳密に通り、y は 0 か 1 だけ進む", last.array.every((y, i) => Math.abs(y - (y0 + slope * i)) <= 0.5 + 1e-12) && last.array[0] === y0 && last.array.at(-1) === y1 && last.array.every((y, i) => i === 0 || y - last.array[i - 1] === 0 || y - last.array[i - 1] === 1));
      // 別の定式化(対称形の誤差項)を使うライブラリ関数とも一致
      const sym = STR_BRESENHAM(EST.bresenhamPoints(x0, y0, x1, y1));
      check("bresenham-line-algorithm: 対称形の誤差項による別の定式化(bresenhamPoints)と、全ての点で一致", same(sym, last.array));
      // 反対向き・急な傾き・水平・垂直・斜めでも、(浮動小数点で丸めた)最近傍の点と 0.5 以内
      let all = true;
      for (const [a, b, c, d] of [[0, 0, 4, 10], [5, 5, 0, 0], [0, 7, 9, 7], [3, 0, 3, 8], [0, 0, 6, 6], [9, 2, 1, 6], [-3, -2, 4, 5]]) {
        const pts = EST.bresenhamPoints(a, b, c, d);
        const n = Math.max(Math.abs(c - a), Math.abs(d - b));
        if (pts.length !== n + 1 || !same(pts[0], [a, b]) || !same(pts.at(-1), [c, d])) all = false;
        for (const [px, py] of pts) {
          const t = n === 0 ? 0 : Math.abs(c - a) >= Math.abs(d - b) ? (px - a) / (c - a) : (py - b) / (d - b);
          const ix = a + t * (c - a), iy = b + t * (d - b);
          if (Math.abs(px - ix) > 0.5 + 1e-9 || Math.abs(py - iy) > 0.5 + 1e-9) all = false;
        }
      }
      check("bresenham-line-algorithm: 7通りの向き・傾き(急・水平・垂直・斜め・負の座標)で、点の数が max(|Δx|,|Δy|)+1 で、理想の線から半ピクセル以内", all);
    }
    // ---- Zバッファ ----
    {
      const frames = structure["z-buffer"]();
      const W = STR.ZBUFFER_WIDTH;
      const spans = STR.ZBUFFER_SPANS;
      const expectedDepth = Array.from({ length: W }, (_, x) => {
        let best = STR.ZBUFFER_FAR;
        for (const s of spans) if (x >= s.x0 && x <= s.x1) best = Math.min(best, s.z0 + ((s.z1 - s.z0) * (x - s.x0)) / (s.x1 - s.x0));
        return best;
      });
      const last = frames.at(-1);
      check("z-buffer: 最終の深度が、各ピクセルで面の深度の最小(独立の計算)と一致", last.array.every((v, x) => Math.abs(v - expectedDepth[x]) < 1e-12));
      const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      check("z-buffer: 6通りの描画順で、最終の深度が完全に同じ(順序に依存しない)", perms.every((p) => STR.zBufferResult(p).depth.every((v, x) => Math.abs(v - expectedDepth[x]) < 1e-12)));
      check("z-buffer: どの面にも覆われないピクセルは最も遠い深度のまま、覆われたピクセルだけが確定", last.array.every((v, x) => (v === STR.ZBUFFER_FAR) === (last.highlight[x] === undefined)));
      check("z-buffer: 深度が描画の途中で増えない(上書きは手前に向かうだけ)", frames.every((f, i) => i === 0 || f.array.every((v, x) => v <= frames[i - 1].array[x] + 1e-12)));
      check("z-buffer: 奥の面が手前の面に隠される(捨てられる)ピクセルと、上書きされるピクセルの両方がある", frames.some((f) => Object.values(f.highlight).includes("swapping")) && frames.some((f) => Object.values(f.highlight).includes("pivot")));
    }

    // ---- 信号: α-βフィルタ・ゲルツェル・FM合成 ----
    for (const id of ["alpha-beta-filter", "goertzel-algorithm", "fm-synthesis"]) {
      checkWellFormed(id, SIGNAL_VISUALIZERS[id]());
      check(`${id}: SIGNAL_METAのチップがあり、種類は signal`, (SIGNAL_META[id]?.chips.length ?? 0) > 0 && VK.visualKindOf(id) === "signal");
    }
    const panelOf = (fr, pid) => fr.panels.find((p) => p.id === pid).values;
    {
      const frames = SIGNAL_VISUALIZERS["alpha-beta-filter"]();
      const last = frames.at(-1);
      const z = panelOf(last, "z");
      const { alpha, beta, dt, velocity } = SGX.ALPHA_BETA;
      // 別実装: 測定列だけから、定義どおりにフィルタを回し直す
      let x = 0, v = 0;
      const xs = [], vs = [];
      for (const m of z) {
        const pred = x + v * dt;
        const r = m - pred;
        x = pred + alpha * r;
        v += (beta / dt) * r;
        xs.push(x);
        vs.push(v);
      }
      check("alpha-beta-filter: 最終フレームの位置・速度のパネルが、測定列から定義どおりに再計算した推定と一致", xs.every((e, i) => Math.abs(e - panelOf(last, "x")[i]) < 1e-9) && vs.every((e, i) => Math.abs(e - panelOf(last, "v")[i]) < 1e-9));
      const rms = (arr) => Math.sqrt(arr.slice(10).reduce((s, a, i) => s + (a - velocity * (i + 10) * dt) ** 2, 0) / (arr.length - 10));
      check("alpha-beta-filter: 10ステップ以降の位置の誤差(RMS)が、測定値そのものの誤差より小さい", rms(xs) < rms(z), `${rms(xs).toFixed(2)} vs ${rms(z).toFixed(2)}`);
      check("alpha-beta-filter: 最後の速度の推定が真の速度に 0.5 以内", Math.abs(vs.at(-1) - velocity) < 0.5, String(vs.at(-1)));
      check("alpha-beta-filter: 時刻ごとに1フレームずつ進む(ステップ数+2)", frames.length === SGX.ALPHA_BETA.steps + 2);
    }
    {
      const frames = SIGNAL_VISUALIZERS["goertzel-algorithm"]();
      const last = frames.at(-1);
      const { fs, n } = SGX.GOERTZEL;
      const freqs = SGX.GOERTZEL_FREQS;
      const input = panelOf(last, "x");
      // 別実装: DFTの1ビンを三角関数の和で直接計算した、パワー
      const dftPower = (freq) => {
        const k = (freq * n) / fs;
        let re = 0, im = 0;
        input.forEach((xv, i) => {
          re += xv * Math.cos((2 * Math.PI * k * i) / n);
          im -= xv * Math.sin((2 * Math.PI * k * i) / n);
        });
        return re * re + im * im;
      };
      const finalPower = panelOf(last, "power");
      check("goertzel-algorithm: 最終フレームの8つのパワーが、DFTの1ビンを直接計算した値と相対誤差 1e-9 以内で一致", freqs.every((f, i) => Math.abs(finalPower[i] - dftPower(f)) <= 1e-9 * Math.max(1, dftPower(f))));
      const rowBest = finalPower.slice(0, 4).indexOf(Math.max(...finalPower.slice(0, 4)));
      const colBest = finalPower.slice(4).indexOf(Math.max(...finalPower.slice(4)));
      check("goertzel-algorithm: パワーが最大の行・列から、DTMFのキー「5」と判定される", SGX.GOERTZEL.keys[rowBest][colBest] === "5");
      const others = finalPower.filter((_, i) => i !== 1 && i !== 5);
      check("goertzel-algorithm: 鳴っていない6つの周波数のパワーが、鳴っている2つの 1/10 未満", others.every((p) => p < Math.min(finalPower[1], finalPower[5]) / 10));
      check("goertzel-algorithm: 入力が 770Hz+1336Hz の合成音そのもの", input.every((xv, i) => Math.abs(xv - (Math.sin((2 * Math.PI * 770 * i) / fs) + Math.sin((2 * Math.PI * 1336 * i) / fs))) < 1e-12));
      // 漸化式の状態が、指定の式(x[n] + coeff·s[n−1] − s[n−2])を満たす
      const s770 = panelOf(last, "s770");
      const coeff = 2 * Math.cos((2 * Math.PI * 770) / fs);
      check("goertzel-algorithm: 770Hz の状態が漸化式 s[n] = x[n] + coeff·s[n−1] − s[n−2] を満たす(coeff = 2cos(2π·f/fs))", s770.every((s, i) => Math.abs(s - (input[i] + coeff * (i > 0 ? s770[i - 1] : 0) - (i > 1 ? s770[i - 2] : 0))) < 1e-9));
      check("goertzel-algorithm: 時刻ごとに1フレームずつ進む(サンプル数+2)", frames.length === n + 2);
    }
    {
      const frames = SIGNAL_VISUALIZERS["fm-synthesis"]();
      const last = frames.at(-1);
      const { fs, fc, fm, index, steps, spectrumN, sidebands } = SGX.FM;
      const y = panelOf(last, "y");
      check("fm-synthesis: 出力が sin(2π·fc·t + I·sin(2π·fm·t)) の定義式と一致", y.every((v, i) => Math.abs(v - Math.sin((2 * Math.PI * fc * i) / fs + index * Math.sin((2 * Math.PI * fm * i) / fs))) < 1e-12) && y.length === steps);
      // ベッセル関数(べき級数)の独立計算
      const fact = (m) => (m <= 1 ? 1 : m * fact(m - 1));
      const J = (order, x) => Array.from({ length: 30 }, (_, m) => (((-1) ** m) / (fact(m) * fact(m + order))) * (x / 2) ** (2 * m + order)).reduce((a, b) => a + b, 0);
      const spectrum = panelOf(last, "spectrum");
      // 低い側の端(fc−4fm=200Hz)には、負の周波数の側波帯(fc−6fm=−200Hz)の折り返しが J_6(2)≒0.001 だけ混ざるので、許容は 3e-3
      check("fm-synthesis: スペクトルの各側波帯 fc±n·fm の振幅が、ベッセル関数 |J_n(I)| と 3e-3 以内で一致(n=0..4、両側)", spectrum.every((a, i) => Math.abs(a - Math.abs(J(Math.abs(i - sidebands), index))) < 3e-3), spectrum.map((a) => a.toFixed(3)).join(","));
      check("fm-synthesis: 側波帯の振幅が中心について左右対称(折り返しの混入を除き 3e-3 以内)", spectrum.every((a, i) => Math.abs(a - spectrum[2 * sidebands - i]) < 3e-3));
      // 全エネルギーの保存: Σ J_n² = 1 なので、側波帯(n=−4..4)の2乗和はほぼ 1/2 の振幅2乗の和 ≒ 1
      const energy = spectrum.reduce((s, a) => s + a * a, 0);
      check(`fm-synthesis: 側波帯の振幅の2乗和が約1(ベッセル関数の恒等式 ΣJ_n² = 1。得られた値 ${energy.toFixed(3)})`, Math.abs(energy - 1) < 0.01);
      check("fm-synthesis: 時刻ごとに1フレームずつ進む(ステップ数+2)", frames.length === steps + 2 && spectrumN === 1024);
    }
  }

}
