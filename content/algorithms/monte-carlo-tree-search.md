---
name: モンテカルロ木探索(MCTS)
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(反復回数 × 1手あたりの平均深さ)
summary: ランダムなプレイアウトの統計から有望な手を絞り込む探索法。囲碁AI(AlphaGoなど)で広く使われた。
---

## 概要

囲碁のように分岐数`b`が非常に大きく(19×19盤面ではおよそ200)、かつ良い評価関数を作るのが難しいゲームでは、[ミニマックス法](/algorithms/minimax)や[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)のような「深さを決めて全展開する」探索は現実的ではない。モンテカルロ木探索(MCTS)は発想を転換し、「終局までランダムにプレイアウト(シミュレーション)して勝敗を記録する」ことを何度も繰り返し、その統計(勝率)から有望な手を徐々に絞り込んでいく。評価関数を人手で設計しなくても、プレイアウトの結果だけから強さを学習的に見積もれるのが最大の特徴で、2016年のAlphaGoがプロ棋士に勝利した際の中核技術としても知られる。

## 仕組み

1. **選択(Selection)**: 探索木の根から、UCB1のような「これまでの勝率が高く、かつあまり試していない手」を優先するスコアで子ノードを辿り、まだ十分に展開していないノードに到達する
2. **展開(Expansion)**: そのノードに未展開の子(まだ試していない手)があれば、1つ新しいノードとして木に追加する
3. **シミュレーション(Simulation/Playout)**: 追加したノードから終局まで、ランダム(または簡易な方策)に手を進めて勝敗を決める
4. **逆伝播(Backpropagation)**: シミュレーションの結果(勝敗)を、根までの経路上の全ノードの訪問回数・勝利回数に反映する
5. 1〜4を持ち時間の許す限り繰り返し、最終的に根で最も訪問回数の多い(=最も有望と判断された)手を選ぶ

## 特性・トレードオフ

- **評価関数が不要**: ランダムプレイアウトの統計だけで手の良し悪しを見積もれるため、評価関数の設計が難しいゲームに強い。ただしプレイアウトの質(完全ランダムか、簡易な方策を使うか)が精度に直結する
- **探索と活用のトレードオフ**: UCB1のようなスコアは「有望な手を深く調べる(活用)」と「まだ調べていない手を試す(探索)」のバランスを取る。このバランスが崩れると局所的な好手に固執したり、逆に浅く広く調べすぎたりする
- **時間に応じて精度が滑らかに向上する**: 反復回数を増やすほど木の統計が正確になり、いつ打ち切っても「その時点までで一番マシな手」が得られる(ミニマックス法は指定した深さまで読み切らないと答えが出ない)
- **使いどころ**: 囲碁AI(AlphaGo/AlphaZero)、分岐数が巨大で評価関数の設計が難しいゲーム全般。深層学習による方策ネットワーク・価値ネットワークと組み合わせることで、ランダムプレイアウトをより賢い見積もりに置き換える発展形が主流になっている

## 実装例

石取りゲーム(1〜3個ずつ石を取り、最後の石を取ったプレイヤーが勝ち)を題材に、選択→展開→シミュレーション→逆伝播の1サイクルをUCB1で反復するMCTSを示す。

```python
import math
import random


class NimState:
    def __init__(self, stones: int, current_player: int):
        self.stones = stones
        self.current_player = current_player  # 0 または 1

    def legal_moves(self) -> list[int]:
        return [m for m in (1, 2, 3) if m <= self.stones]

    def apply_move(self, move: int) -> "NimState":
        return NimState(self.stones - move, 1 - self.current_player)

    def is_terminal(self) -> bool:
        return self.stones == 0

    def winner(self) -> int:
        return 1 - self.current_player  # 石を0にした、直前の手番のプレイヤーが勝者


class Node:
    def __init__(self, state: NimState, parent: "Node | None" = None, move: int | None = None):
        self.state = state
        self.parent = parent
        self.move = move
        self.children: list[Node] = []
        self.untried_moves = state.legal_moves()
        self.visits = 0
        self.wins = 0.0
        self.player_just_moved = 1 - state.current_player

    def ucb1(self, c: float = 1.41421356) -> float:
        if self.visits == 0:
            return math.inf
        exploitation = self.wins / self.visits
        exploration = c * math.sqrt(math.log(self.parent.visits) / self.visits)
        return exploitation + exploration

    def select_child(self) -> "Node":
        return max(self.children, key=lambda n: n.ucb1())

    def expand(self) -> "Node":
        move = self.untried_moves.pop(random.randrange(len(self.untried_moves)))
        child = Node(self.state.apply_move(move), parent=self, move=move)
        self.children.append(child)
        return child

    def is_fully_expanded(self) -> bool:
        return len(self.untried_moves) == 0


def rollout(state: NimState) -> int:
    while not state.is_terminal():
        state = state.apply_move(random.choice(state.legal_moves()))
    return state.winner()


def backpropagate(node: Node | None, winner: int) -> None:
    while node is not None:
        node.visits += 1
        if winner == node.player_just_moved:
            node.wins += 1
        node = node.parent


def mcts_search(root_state: NimState, iterations: int) -> int:
    root = Node(root_state)

    for _ in range(iterations):
        node = root
        # 1. 選択(Selection): 展開済みノードをUCB1で辿る
        while node.is_fully_expanded() and node.children:
            node = node.select_child()
        # 2. 展開(Expansion): 未展開の手があれば1つ追加する
        if not node.state.is_terminal() and not node.is_fully_expanded():
            node = node.expand()
        # 3. シミュレーション(Simulation): 終局までランダムに進める
        winner = rollout(node.state) if not node.state.is_terminal() else node.state.winner()
        # 4. 逆伝播(Backpropagation): 根までの経路の統計を更新する
        backpropagate(node, winner)

    return max(root.children, key=lambda n: n.visits).move
```

```typescript
class NimState {
  stones: number;
  currentPlayer: number;

  constructor(stones: number, currentPlayer: number) {
    this.stones = stones;
    this.currentPlayer = currentPlayer;
  }

  legalMoves(): number[] {
    return [1, 2, 3].filter((m) => m <= this.stones);
  }
  applyMove(move: number): NimState {
    return new NimState(this.stones - move, 1 - this.currentPlayer);
  }
  isTerminal(): boolean {
    return this.stones === 0;
  }
  winner(): number {
    return 1 - this.currentPlayer; // 石を0にした、直前の手番のプレイヤーが勝者
  }
}

class Node {
  state: NimState;
  parent: Node | null;
  move: number | null;
  children: Node[] = [];
  untriedMoves: number[];
  visits = 0;
  wins = 0;
  playerJustMoved: number;

  constructor(state: NimState, parent: Node | null = null, move: number | null = null) {
    this.state = state;
    this.parent = parent;
    this.move = move;
    this.untriedMoves = state.legalMoves();
    this.playerJustMoved = 1 - state.currentPlayer;
  }

  ucb1(c = Math.SQRT2): number {
    if (this.visits === 0) return Infinity;
    const exploitation = this.wins / this.visits;
    const exploration = c * Math.sqrt(Math.log(this.parent!.visits) / this.visits);
    return exploitation + exploration;
  }

  selectChild(): Node {
    return this.children.reduce((best, n) => (n.ucb1() > best.ucb1() ? n : best));
  }

  expand(rand: () => number): Node {
    const i = Math.floor(rand() * this.untriedMoves.length);
    const move = this.untriedMoves.splice(i, 1)[0];
    const child = new Node(this.state.applyMove(move), this, move);
    this.children.push(child);
    return child;
  }

  isFullyExpanded(): boolean {
    return this.untriedMoves.length === 0;
  }
}

function rollout(state: NimState, rand: () => number): number {
  while (!state.isTerminal()) {
    const moves = state.legalMoves();
    state = state.applyMove(moves[Math.floor(rand() * moves.length)]);
  }
  return state.winner();
}

function backpropagate(node: Node | null, winner: number): void {
  while (node !== null) {
    node.visits += 1;
    if (winner === node.playerJustMoved) node.wins += 1;
    node = node.parent;
  }
}

function mctsSearch(rootState: NimState, iterations: number, rand: () => number): number {
  const root = new Node(rootState);

  for (let i = 0; i < iterations; i++) {
    let node = root;
    // 1. 選択(Selection)
    while (node.isFullyExpanded() && node.children.length > 0) {
      node = node.selectChild();
    }
    // 2. 展開(Expansion)
    if (!node.state.isTerminal() && !node.isFullyExpanded()) {
      node = node.expand(rand);
    }
    // 3. シミュレーション(Simulation)
    const winner = node.state.isTerminal() ? node.state.winner() : rollout(node.state, rand);
    // 4. 逆伝播(Backpropagation)
    backpropagate(node, winner);
  }

  return root.children.reduce((best, n) => (n.visits > best.visits ? n : best)).move!;
}
```

```cpp
#include <vector>
#include <memory>
#include <cmath>
#include <limits>
#include <random>
#include <algorithm>

struct NimState {
    int stones;
    int currentPlayer; // 0 または 1

    std::vector<int> legalMoves() const {
        std::vector<int> moves;
        for (int m : {1, 2, 3}) if (m <= stones) moves.push_back(m);
        return moves;
    }
    NimState applyMove(int move) const { return { stones - move, 1 - currentPlayer }; }
    bool isTerminal() const { return stones == 0; }
    int winner() const { return 1 - currentPlayer; } // 石を0にした、直前の手番のプレイヤーが勝者
};

struct Node {
    NimState state;
    Node* parent;
    int move;
    std::vector<std::unique_ptr<Node>> children;
    std::vector<int> untriedMoves;
    int visits = 0;
    double wins = 0.0;
    int playerJustMoved;

    Node(NimState s, Node* p, int m) : state(s), parent(p), move(m), untriedMoves(s.legalMoves()) {
        playerJustMoved = 1 - s.currentPlayer;
    }

    double ucb1(double c) const {
        if (visits == 0) return std::numeric_limits<double>::infinity();
        double exploitation = wins / visits;
        double exploration = c * std::sqrt(std::log(static_cast<double>(parent->visits)) / visits);
        return exploitation + exploration;
    }

    Node* selectChild() {
        Node* best = children[0].get();
        for (auto& c : children) if (c->ucb1(std::sqrt(2.0)) > best->ucb1(std::sqrt(2.0))) best = c.get();
        return best;
    }

    Node* expand(std::mt19937& rng) {
        std::uniform_int_distribution<size_t> dist(0, untriedMoves.size() - 1);
        size_t i = dist(rng);
        int move = untriedMoves[i];
        untriedMoves.erase(untriedMoves.begin() + i);
        children.push_back(std::make_unique<Node>(state.applyMove(move), this, move));
        return children.back().get();
    }

    bool isFullyExpanded() const { return untriedMoves.empty(); }
};

int rollout(NimState state, std::mt19937& rng) {
    while (!state.isTerminal()) {
        auto moves = state.legalMoves();
        std::uniform_int_distribution<size_t> dist(0, moves.size() - 1);
        state = state.applyMove(moves[dist(rng)]);
    }
    return state.winner();
}

void backpropagate(Node* node, int winner) {
    while (node != nullptr) {
        node->visits += 1;
        if (winner == node->playerJustMoved) node->wins += 1;
        node = node->parent;
    }
}

int mctsSearch(NimState rootState, int iterations, std::mt19937& rng) {
    auto root = std::make_unique<Node>(rootState, nullptr, -1);

    for (int i = 0; i < iterations; i++) {
        Node* node = root.get();
        // 1. 選択(Selection)
        while (node->isFullyExpanded() && !node->children.empty()) {
            node = node->selectChild();
        }
        // 2. 展開(Expansion)
        if (!node->state.isTerminal() && !node->isFullyExpanded()) {
            node = node->expand(rng);
        }
        // 3. シミュレーション(Simulation)
        int winner = node->state.isTerminal() ? node->state.winner() : rollout(node->state, rng);
        // 4. 逆伝播(Backpropagation)
        backpropagate(node, winner);
    }

    Node* best = root->children[0].get();
    for (auto& c : root->children) if (c->visits > best->visits) best = c.get();
    return best->move;
}
```

```rust
use std::f64;
use rand::Rng;
use rand::rngs::ThreadRng;

#[derive(Clone, Copy)]
struct NimState {
    stones: u32,
    current_player: u32, // 0 または 1
}

impl NimState {
    fn legal_moves(&self) -> Vec<u32> {
        [1, 2, 3].into_iter().filter(|&m| m <= self.stones).collect()
    }
    fn apply_move(&self, mv: u32) -> NimState {
        NimState { stones: self.stones - mv, current_player: 1 - self.current_player }
    }
    fn is_terminal(&self) -> bool {
        self.stones == 0
    }
    fn winner(&self) -> u32 {
        1 - self.current_player // 石を0にした、直前の手番のプレイヤーが勝者
    }
}

struct Node {
    state: NimState,
    parent: Option<usize>,
    mv: Option<u32>,
    children: Vec<usize>,
    untried_moves: Vec<u32>,
    visits: u32,
    wins: f64,
    player_just_moved: u32,
}

struct Tree {
    nodes: Vec<Node>,
}

impl Tree {
    fn new(root_state: NimState) -> Self {
        let untried = root_state.legal_moves();
        let player_just_moved = 1 - root_state.current_player;
        Tree { nodes: vec![Node { state: root_state, parent: None, mv: None, children: vec![], untried_moves: untried, visits: 0, wins: 0.0, player_just_moved }] }
    }

    fn ucb1(&self, idx: usize, c: f64) -> f64 {
        let node = &self.nodes[idx];
        if node.visits == 0 {
            return f64::INFINITY;
        }
        let parent_visits = self.nodes[node.parent.unwrap()].visits;
        let exploitation = node.wins / node.visits as f64;
        let exploration = c * ((parent_visits as f64).ln() / node.visits as f64).sqrt();
        exploitation + exploration
    }

    fn select_child(&self, idx: usize) -> usize {
        *self.nodes[idx].children.iter().max_by(|&&a, &&b| self.ucb1(a, 2f64.sqrt()).partial_cmp(&self.ucb1(b, 2f64.sqrt())).unwrap()).unwrap()
    }

    fn expand(&mut self, idx: usize, rng: &mut ThreadRng) -> usize {
        let i = rng.gen_range(0..self.nodes[idx].untried_moves.len());
        let mv = self.nodes[idx].untried_moves.remove(i);
        let next_state = self.nodes[idx].state.apply_move(mv);
        let player_just_moved = 1 - next_state.current_player;
        let untried = next_state.legal_moves();
        let new_idx = self.nodes.len();
        self.nodes.push(Node { state: next_state, parent: Some(idx), mv: Some(mv), children: vec![], untried_moves: untried, visits: 0, wins: 0.0, player_just_moved });
        self.nodes[idx].children.push(new_idx);
        new_idx
    }

    fn is_fully_expanded(&self, idx: usize) -> bool {
        self.nodes[idx].untried_moves.is_empty()
    }

    fn backpropagate(&mut self, mut idx: Option<usize>, winner: u32) {
        while let Some(i) = idx {
            self.nodes[i].visits += 1;
            if winner == self.nodes[i].player_just_moved {
                self.nodes[i].wins += 1.0;
            }
            idx = self.nodes[i].parent;
        }
    }
}

fn rollout(mut state: NimState, rng: &mut ThreadRng) -> u32 {
    while !state.is_terminal() {
        let moves = state.legal_moves();
        let mv = moves[rng.gen_range(0..moves.len())];
        state = state.apply_move(mv);
    }
    state.winner()
}

fn mcts_search(root_state: NimState, iterations: u32, rng: &mut ThreadRng) -> u32 {
    let mut tree = Tree::new(root_state);

    for _ in 0..iterations {
        let mut idx = 0usize;
        // 1. 選択(Selection)
        while tree.is_fully_expanded(idx) && !tree.nodes[idx].children.is_empty() {
            idx = tree.select_child(idx);
        }
        // 2. 展開(Expansion)
        if !tree.nodes[idx].state.is_terminal() && !tree.is_fully_expanded(idx) {
            idx = tree.expand(idx, rng);
        }
        // 3. シミュレーション(Simulation)
        let winner = if tree.nodes[idx].state.is_terminal() {
            tree.nodes[idx].state.winner()
        } else {
            rollout(tree.nodes[idx].state, rng)
        };
        // 4. 逆伝播(Backpropagation)
        tree.backpropagate(Some(idx), winner);
    }

    let best = *tree.nodes[0].children.iter().max_by_key(|&&c| tree.nodes[c].visits).unwrap();
    tree.nodes[best].mv.unwrap()
}
```

```csharp
class NimState
{
    public int Stones;
    public int CurrentPlayer; // 0 または 1

    public NimState(int stones, int currentPlayer)
    {
        Stones = stones;
        CurrentPlayer = currentPlayer;
    }

    public List<int> LegalMoves() => new[] { 1, 2, 3 }.Where(m => m <= Stones).ToList();
    public NimState ApplyMove(int move) => new NimState(Stones - move, 1 - CurrentPlayer);
    public bool IsTerminal() => Stones == 0;
    public int Winner() => 1 - CurrentPlayer; // 石を0にした、直前の手番のプレイヤーが勝者
}

class McNode
{
    public NimState State;
    public McNode? Parent;
    public int? Move;
    public List<McNode> Children = new();
    public List<int> UntriedMoves;
    public int Visits = 0;
    public double Wins = 0;
    public int PlayerJustMoved;

    public McNode(NimState state, McNode? parent = null, int? move = null)
    {
        State = state;
        Parent = parent;
        Move = move;
        UntriedMoves = state.LegalMoves();
        PlayerJustMoved = 1 - state.CurrentPlayer;
    }

    public double Ucb1(double c)
    {
        if (Visits == 0) return double.PositiveInfinity;
        double exploitation = Wins / Visits;
        double exploration = c * Math.Sqrt(Math.Log(Parent!.Visits) / Visits);
        return exploitation + exploration;
    }

    public McNode SelectChild() => Children.OrderByDescending(n => n.Ucb1(Math.Sqrt(2))).First();

    public McNode Expand(Random rand)
    {
        int i = rand.Next(UntriedMoves.Count);
        int move = UntriedMoves[i];
        UntriedMoves.RemoveAt(i);
        var child = new McNode(State.ApplyMove(move), this, move);
        Children.Add(child);
        return child;
    }

    public bool IsFullyExpanded() => UntriedMoves.Count == 0;
}

static class Mcts
{
    static int Rollout(NimState state, Random rand)
    {
        while (!state.IsTerminal())
        {
            var moves = state.LegalMoves();
            state = state.ApplyMove(moves[rand.Next(moves.Count)]);
        }
        return state.Winner();
    }

    static void Backpropagate(McNode? node, int winner)
    {
        while (node is not null)
        {
            node.Visits += 1;
            if (winner == node.PlayerJustMoved) node.Wins += 1;
            node = node.Parent;
        }
    }

    public static int Search(NimState rootState, int iterations, Random rand)
    {
        var root = new McNode(rootState);

        for (int i = 0; i < iterations; i++)
        {
            var node = root;
            // 1. 選択(Selection)
            while (node.IsFullyExpanded() && node.Children.Count > 0)
                node = node.SelectChild();
            // 2. 展開(Expansion)
            if (!node.State.IsTerminal() && !node.IsFullyExpanded())
                node = node.Expand(rand);
            // 3. シミュレーション(Simulation)
            int winner = node.State.IsTerminal() ? node.State.Winner() : Rollout(node.State, rand);
            // 4. 逆伝播(Backpropagation)
            Backpropagate(node, winner);
        }

        return root.Children.OrderByDescending(n => n.Visits).First().Move!.Value;
    }
}
```
