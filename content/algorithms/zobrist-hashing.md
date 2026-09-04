---
name: ゾブリストハッシュ (Zobrist Hashing)
category: ゲーム
subcategory: ゲームAI・意思決定
complexity: O(1)(1手ごとの差分更新)
summary: 盤面の各マス×駒の組に固定乱数を割り当てXORで合成する、増分更新可能な局面ハッシュ手法。
---

## 概要

置換表(トランスポジションテーブル)で同一局面を素早く検索するには、盤面全体を効率よく1つのハッシュ値に変換する必要がある。1970年にAlbert Zobristが考案したゾブリストハッシュは、盤面の「各マスに各駒が乗っている」という事実1つ1つにあらかじめ固定のランダムなビット列を割り当てておき、現在の盤面に存在する事実に対応するビット列を全てXOR(排他的論理和)で合成することでハッシュ値を作る。XOR演算は結合則・交換則を満たし、かつ自分自身とXORすると元に戻る性質を持つため、駒が1つ動いただけの局面のハッシュ値を、盤面全体を再走査せずに「消える駒のビット列をXOR」「現れる駒のビット列をXOR」の2回の操作だけで差分更新できる。この特性からチェス・将棋・囲碁など、あらゆるボードゲームの置換表実装で標準的に使われている。

## 仕組み

1. 事前準備として、(マス目, 駒の種類)の全組み合わせごとに独立なランダムなビット列(通常64ビット整数)を1つずつ用意しておく。手番の違いを区別する場合は「手番がXであること」にも1つ乱数を割り当てる
2. 初期局面のハッシュ値は、盤面上に実際に置かれている駒それぞれに対応するランダムビット列を全てXORして求める
3. 駒が移動したら、移動元マスの(マス目, 駒)のビット列をXORし(そこに駒がいたという事実を打ち消す)、移動先マスの(マス目, 駒)のビット列をXORする(新たにそこに駒がいるという事実を加える)。取られた駒があれば同様にそのビット列もXORする
4. 手番が変わる場合は「手番」用のビット列もXORしておく。これにより盤面全体を再ハッシュせずO(1)で新局面のハッシュ値が得られる
5. 得られたハッシュ値をキーとして置換表(通常はハッシュテーブル)に評価値・探索深さ・最善手などを記録し、同一局面に再度到達したときに探索を省略する

## 特性・トレードオフ

- **計算量**: 1手あたりの更新はXOR数回、`O(1)`。局面全体を毎回再計算する素朴な方法に比べ圧倒的に高速
- **衝突の可能性**: ハッシュ値が一致しても異なる局面である「衝突」が理論上発生しうる(誕生日のパラドックス)。64ビットハッシュなら実用上は無視できるほど確率が低いが、厳密性が必要な場面では盤面の照合を併用する
- **置換表との相性**: ゾブリストハッシュ値をキーにした置換表は、探索中に同一局面へ異なる手順(トランスポジション)でたどり着いた場合に探索結果を再利用でき、実効的な探索深さを大きく向上させる
- **使いどころ**: チェス・将棋・囲碁・オセロなどあらゆる完全情報ゲームのAI実装。反復深化・[アルファベータ枝刈り](/algorithms/alpha-beta-pruning)と組み合わせて置換表の鍵として使うのがほぼ標準

## 実装例

8x8の盤面(駒種は簡略化して6種×2色)を想定し、初期ハッシュの計算と、1手指した際の差分更新(XOR)を実装する。

```python
import random

random.seed(42)

BOARD_SIZE = 8
NUM_PIECE_TYPES = 12  # 6種 x 2色

# (マス目, 駒種)ごとの固定乱数テーブル
ZOBRIST_TABLE = [
    [random.getrandbits(64) for _ in range(NUM_PIECE_TYPES)] for _ in range(BOARD_SIZE * BOARD_SIZE)
]
ZOBRIST_SIDE_TO_MOVE = random.getrandbits(64)


def compute_hash(board: dict[int, int], white_to_move: bool) -> int:
    """board: {マス目インデックス: 駒種インデックス} の疎な表現から初期ハッシュを計算"""
    h = 0
    for square, piece in board.items():
        h ^= ZOBRIST_TABLE[square][piece]
    if white_to_move:
        h ^= ZOBRIST_SIDE_TO_MOVE
    return h


def make_move_hash(
    h: int, from_square: int, to_square: int, piece: int, captured_piece: int | None
) -> int:
    """駒がfrom→toへ移動した際、盤面全体を見ずにハッシュを差分更新する"""
    h ^= ZOBRIST_TABLE[from_square][piece]  # 移動元から消える
    if captured_piece is not None:
        h ^= ZOBRIST_TABLE[to_square][captured_piece]  # 取られた駒が消える
    h ^= ZOBRIST_TABLE[to_square][piece]  # 移動先に現れる
    h ^= ZOBRIST_SIDE_TO_MOVE  # 手番交代
    return h
```

```typescript
const BOARD_SIZE = 8;
const NUM_PIECE_TYPES = 12; // 6種 x 2色

function randomBigUint64(): bigint {
  const hi = BigInt(Math.floor(Math.random() * 0xffffffff));
  const lo = BigInt(Math.floor(Math.random() * 0xffffffff));
  return (hi << 32n) | lo;
}

// (マス目, 駒種)ごとの固定乱数テーブル
const ZOBRIST_TABLE: bigint[][] = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () =>
  Array.from({ length: NUM_PIECE_TYPES }, () => randomBigUint64()),
);
const ZOBRIST_SIDE_TO_MOVE = randomBigUint64();

function computeHash(board: Map<number, number>, whiteToMove: boolean): bigint {
  // board: マス目インデックス -> 駒種インデックス の疎な表現から初期ハッシュを計算
  let h = 0n;
  for (const [square, piece] of board) {
    h ^= ZOBRIST_TABLE[square][piece];
  }
  if (whiteToMove) h ^= ZOBRIST_SIDE_TO_MOVE;
  return h;
}

function makeMoveHash(
  h: bigint,
  fromSquare: number,
  toSquare: number,
  piece: number,
  capturedPiece: number | null,
): bigint {
  // 駒がfrom→toへ移動した際、盤面全体を見ずにハッシュを差分更新する
  h ^= ZOBRIST_TABLE[fromSquare][piece]; // 移動元から消える
  if (capturedPiece !== null) h ^= ZOBRIST_TABLE[toSquare][capturedPiece]; // 取られた駒が消える
  h ^= ZOBRIST_TABLE[toSquare][piece]; // 移動先に現れる
  h ^= ZOBRIST_SIDE_TO_MOVE; // 手番交代
  return h;
}
```
