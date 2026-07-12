export type TrieNodeState = "idle" | "visiting" | "inserted";

export type TrieNode = {
  id: string;
  /** ルートは空文字列、それ以外はこの頂点に到達するのに使った1文字。 */
  char: string;
  /** 1文字 → 子頂点IDのマップ(二分木と違い子の数が可変なため配列ではなくマップで持つ)。 */
  children: Record<string, string>;
  isEndOfWord: boolean;
};

export type TrieFrame = {
  nodes: Record<string, TrieNode>;
  rootId: string;
  nodeStates: Record<string, TrieNodeState>;
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

export const TRIE_VISUALIZERS: Record<string, () => TrieFrame[]> = {
  trie: trieSteps,
};
