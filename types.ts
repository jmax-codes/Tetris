
export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Piece {
  type: PieceType;
  position: { x: number; y: number };
  shape: number[][];
}

export type Grid = (string | null)[][];

export interface GameState {
  grid: Grid;
  activePiece: Piece | null;
  nextPiece: PieceType;
  score: number;
  level: number;
  lines: number;
  isPaused: boolean;
  isGameOver: boolean;
}
