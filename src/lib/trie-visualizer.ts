export type TrieNodeState = "idle" | "visiting" | "inserted" | "matched";

export type TrieNode = {
  id: string;
  /** ルートは空文字列、それ以外はこの頂点に到達するのに使った1文字。 */
  char: string;
  /** 1文字 → 子頂点IDのマップ(二分木と違い子の数が可変なため配列ではなくマップで持つ)。 */
  children: Record<string, string>;
  isEndOfWord: boolean;
  /** この頂点で終端になっている単語そのもの(Aho-Corasick法のみ使用。複数パターンの識別に使う)。 */
  word?: string;
  /** 失敗リンク(Aho-Corasick法のみ使用)。マッチ失敗時に飛ぶ先の頂点ID。 */
  fail?: string;
};

export type TrieFrame = {
  nodes: Record<string, TrieNode>;
  rootId: string;
  nodeStates: Record<string, TrieNodeState>;
  /** 失敗リンクを辺として描画するための一覧(Aho-Corasick法のみ使用)。[from, to]のペア。 */
  failEdges?: [string, string][];
  description: string;
};

function cloneNodes(nodes: Record<string, TrieNode>): Record<string, TrieNode> {
  const clone: Record<string, TrieNode> = {};
  for (const [id, node] of Object.entries(nodes)) {
    clone[id] = { ...node, children: { ...node.children } };
  }
  return clone;
}

export const TRIE_WORDS = ["CAT", "CAR", "CARD", "CARE", "DOG"];

/**
 * トライ木(接頭辞木)への単語挿入シーケンスのステップ列を生成する。
 * 二分探索木・AVL木等が「値の大小で左右どちらかに1つ進む」のに対し、
 * トライ木は「1文字ずつ、既存の子があれば辿り、なければ新規作成する」という形で経路を伸ばす。
 * "CAT"→"CAR"→"CARD"→"CARE"の順に挿入すると、"CAR"までの経路が共有されていく様子が見える。
 */
export function trieSteps(): TrieFrame[] {
  const nodes: Record<string, TrieNode> = {};
  let nextId = 0;
  const createNode = (char: string): string => {
    const id = `n${nextId}`;
    nextId++;
    nodes[id] = { id, char, children: {}, isEndOfWord: false };
    return id;
  };

  const rootId = createNode("");
  const frames: TrieFrame[] = [];
  const snapshot = (nodeStates: Record<string, TrieNodeState>, description: string): TrieFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    description,
  });

  frames.push(snapshot({}, "初期状態(ルートのみの空のトライ木)"));

  for (const word of TRIE_WORDS) {
    let curId = rootId;
    const visited: string[] = [curId];

    for (const ch of word) {
      const existed = ch in nodes[curId].children;
      if (!existed) {
        const newId = createNode(ch);
        nodes[curId].children[ch] = newId;
      }
      curId = nodes[curId].children[ch];
      visited.push(curId);

      const highlight: Record<string, TrieNodeState> = {};
      visited.forEach((v) => {
        highlight[v] = "visiting";
      });
      frames.push(
        snapshot(
          highlight,
          existed ? `"${word}": 文字'${ch}'は既存の経路をたどる` : `"${word}": 文字'${ch}'の新しい頂点を作成`,
        ),
      );
    }

    nodes[curId].isEndOfWord = true;
    frames.push(snapshot({ [curId]: "inserted" }, `"${word}"の挿入完了(単語の終端としてマーク)`));
  }

  frames.push(snapshot({}, `挿入完了。${TRIE_WORDS.length}語("${TRIE_WORDS.join('", "')}")からなるトライ木が完成`));
  return frames;
}

export const AHO_CORASICK_PATTERNS = ["HE", "SHE", "HIS", "HERS"];
export const AHO_CORASICK_TEXT = "USHERS";

/**
 * Aho-Corasick法のステップ列を生成する。複数パターンを1本のトライ木にまとめて挿入したうえで、
 * 各頂点に「マッチに失敗したときに飛ぶ先」を示す失敗リンク(fail link)をBFSで構築する。
 * 失敗リンクは、KMP法の部分一致テーブルをトライ木全体に拡張したものに相当し、
 * テキストを1回走査するだけで登録した全パターンの出現位置を同時に検出できる
 * (各パターンごとに個別にKMP法を走らせる必要がない)のが最大の特徴。
 * 出現検出時には、現在の頂点から失敗リンクを根までたどり、単語終端の頂点を
 * 全て報告する(出力リンクの併合最適化はせず、素直にfailチェーンを辿る簡略版)。
 */
export function ahoCorasickSteps(): TrieFrame[] {
  const nodes: Record<string, TrieNode> = {};
  let nextId = 0;
  const createNode = (char: string): string => {
    const id = `n${nextId}`;
    nextId++;
    nodes[id] = { id, char, children: {}, isEndOfWord: false };
    return id;
  };

  const rootId = createNode("");
  nodes[rootId].fail = rootId;
  const frames: TrieFrame[] = [];
  const snapshot = (
    nodeStates: Record<string, TrieNodeState>,
    description: string,
    failEdges?: [string, string][],
  ): TrieFrame => ({
    nodes: cloneNodes(nodes),
    rootId,
    nodeStates: { ...nodeStates },
    failEdges: failEdges ? [...failEdges] : undefined,
    description,
  });

  frames.push(snapshot({}, `初期状態(ルートのみの空のトライ木)。パターン: ${AHO_CORASICK_PATTERNS.map((w) => `"${w}"`).join(", ")}`));

  for (const word of AHO_CORASICK_PATTERNS) {
    let curId = rootId;
    const visited: string[] = [curId];

    for (const ch of word) {
      const existed = ch in nodes[curId].children;
      if (!existed) {
        const newId = createNode(ch);
        nodes[curId].children[ch] = newId;
      }
      curId = nodes[curId].children[ch];
      visited.push(curId);

      const highlight: Record<string, TrieNodeState> = {};
      visited.forEach((v) => {
        highlight[v] = "visiting";
      });
      frames.push(
        snapshot(
          highlight,
          existed ? `"${word}": 文字'${ch}'は既存の経路をたどる` : `"${word}": 文字'${ch}'の新しい頂点を作成`,
        ),
      );
    }

    nodes[curId].isEndOfWord = true;
    nodes[curId].word = word;
    frames.push(snapshot({ [curId]: "inserted" }, `"${word}"の挿入完了(単語の終端としてマーク)`));
  }

  frames.push(snapshot({}, `${AHO_CORASICK_PATTERNS.length}個のパターンからなるトライ木が完成。続けて失敗リンクをBFSで構築する`));

  const failEdges: [string, string][] = [];
  const queue: string[] = [];
  for (const [, childId] of Object.entries(nodes[rootId].children)) {
    nodes[childId].fail = rootId;
    failEdges.push([childId, rootId]);
    queue.push(childId);
  }
  frames.push(
    snapshot(
      {},
      "ルート直下の頂点は全て失敗リンクをルートに設定(1文字だけではどこにも接頭辞が一致しないため)",
      failEdges,
    ),
  );

  while (queue.length > 0) {
    const uId = queue.shift()!;
    const u = nodes[uId];
    for (const [ch, vId] of Object.entries(u.children)) {
      queue.push(vId);
      let fId = u.fail!;
      while (fId !== rootId && !(ch in nodes[fId].children)) {
        fId = nodes[fId].fail!;
      }
      const candidate = nodes[fId].children[ch];
      const vFail = candidate !== undefined && candidate !== vId ? candidate : rootId;
      nodes[vId].fail = vFail;
      failEdges.push([vId, vFail]);
      frames.push(
        snapshot(
          { [vId]: "visiting", [vFail]: "visiting" },
          `頂点${vId}(文字'${ch}')の失敗リンクを頂点${vFail}(文字'${nodes[vFail].char || "∅"}')に設定`,
          failEdges,
        ),
      );
    }
  }

  frames.push(snapshot({}, "失敗リンクの構築が完了。続けてテキストを走査し、全パターンの出現を同時に検出する", failEdges));

  let curId = rootId;
  const matchedNodes = new Set<string>();
  const foundMatches: string[] = [];
  for (let i = 0; i < AHO_CORASICK_TEXT.length; i++) {
    const ch = AHO_CORASICK_TEXT[i];

    while (curId !== rootId && !(ch in nodes[curId].children)) {
      const before = curId;
      curId = nodes[curId].fail!;
      frames.push(
        snapshot(
          { ...Object.fromEntries([...matchedNodes].map((n) => [n, "matched" as const])), [before]: "visiting", [curId]: "visiting" },
          `テキスト[${i}]='${ch}': 頂点${before}に'${ch}'への経路がないので失敗リンクをたどり頂点${curId}へ`,
          failEdges,
        ),
      );
    }
    if (ch in nodes[curId].children) {
      curId = nodes[curId].children[ch];
    }
    frames.push(
      snapshot(
        { ...Object.fromEntries([...matchedNodes].map((n) => [n, "matched" as const])), [curId]: "visiting" },
        `テキスト[${i}]='${ch}'を読み、頂点${curId}に移動`,
        failEdges,
      ),
    );

    let temp = curId;
    while (temp !== rootId) {
      if (nodes[temp].isEndOfWord) {
        matchedNodes.add(temp);
        const endIndex = i;
        const word = nodes[temp].word!;
        foundMatches.push(`"${word}"(終端インデックス${endIndex})`);
        frames.push(
          snapshot(
            { ...Object.fromEntries([...matchedNodes].map((n) => [n, "matched" as const])) },
            `出力リンク(失敗リンク)をたどってパターン"${word}"がテキストの[${endIndex - word.length + 1}, ${endIndex}]で一致`,
            failEdges,
          ),
        );
      }
      temp = nodes[temp].fail!;
    }
  }

  frames.push(
    snapshot(
      { ...Object.fromEntries([...matchedNodes].map((n) => [n, "matched" as const])) },
      `走査完了。テキスト"${AHO_CORASICK_TEXT}"中で検出したパターン: ${foundMatches.join(", ") || "なし"}`,
      failEdges,
    ),
  );

  return frames;
}

export const TRIE_VISUALIZERS: Record<string, () => TrieFrame[]> = {
  trie: trieSteps,
  "aho-corasick": ahoCorasickSteps,
};
