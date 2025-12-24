
import React, { useState, useEffect, useCallback } from 'react';
import { COLS, ROWS, PIECES, INITIAL_SPEED, SPEED_INCREMENT } from '../constants';
import { PieceType, Piece, Grid, GameState } from '../types';
import { useInterval } from '../hooks/useInterval';

const createEmptyGrid = (): Grid => 
  Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const getRandomPiece = (): PieceType => {
  const types: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  return types[Math.floor(Math.random() * types.length)];
};

const TetrisGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    grid: createEmptyGrid(),
    activePiece: null,
    nextPiece: getRandomPiece(),
    score: 0,
    level: 1,
    lines: 0,
    isPaused: false,
    isGameOver: false,
  });

  const [dropTime, setDropTime] = useState<number | null>(INITIAL_SPEED);

  const checkCollision = (piece: Piece, grid: Grid, moveX = 0, moveY = 0) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          const newX = piece.position.x + x + moveX;
          const newY = piece.position.y + y + moveY;

          if (
            newX < 0 ||
            newX >= COLS ||
            newY >= ROWS ||
            (newY >= 0 && grid[newY][newX] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const lockPiece = useCallback(() => {
    setGameState(prev => {
      // ROOT CAUSE FIX: Safety guard against null activePiece during race conditions
      if (!prev.activePiece) return prev;

      const newGrid = prev.grid.map(row => [...row]);
      const { shape, position } = prev.activePiece;

      shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = position.y + y;
            const gridX = position.x + x;
            if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
              newGrid[gridY][gridX] = prev.activePiece!.type;
            }
          }
        });
      });

      let linesCleared = 0;
      const filteredGrid = newGrid.filter(row => {
        const isFull = row.every(cell => cell !== null);
        if (isFull) linesCleared++;
        return !isFull;
      });

      while (filteredGrid.length < ROWS) {
        filteredGrid.unshift(Array(COLS).fill(null));
      }

      const newLines = prev.lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      const scoreTable = [0, 40, 100, 300, 1200];
      const newScore = prev.score + (scoreTable[linesCleared] * newLevel);

      return {
        ...prev,
        grid: filteredGrid,
        activePiece: null, // Piece is now locked, trigger next spawn
        score: newScore,
        lines: newLines,
        level: newLevel
      };
    });
  }, []);

  const spawnPiece = useCallback(() => {
    const type = gameState.nextPiece;
    const shape = PIECES[type];
    const newPiece: Piece = {
      type,
      shape,
      position: { x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 },
    };

    setGameState(prev => {
        if (checkCollision(newPiece, prev.grid)) {
            return { ...prev, isGameOver: true };
        }
        return {
            ...prev,
            activePiece: newPiece,
            nextPiece: getRandomPiece()
        }
    });
  }, [gameState.nextPiece]);

  const drop = useCallback(() => {
    if (!gameState.activePiece || gameState.isPaused || gameState.isGameOver) return;

    if (!checkCollision(gameState.activePiece, gameState.grid, 0, 1)) {
      setGameState(prev => ({
        ...prev,
        activePiece: prev.activePiece ? {
          ...prev.activePiece,
          position: { ...prev.activePiece.position, y: prev.activePiece.position.y + 1 }
        } : null
      }));
    } else {
      lockPiece();
    }
  }, [gameState.activePiece, gameState.grid, gameState.isPaused, gameState.isGameOver, lockPiece]);

  const hardDrop = () => {
    if (!gameState.activePiece || gameState.isPaused || gameState.isGameOver) return;
    
    setGameState(prev => {
      if (!prev.activePiece) return prev;
      
      let offset = 0;
      while (!checkCollision(prev.activePiece, prev.grid, 0, offset + 1)) {
        offset++;
      }
      
      // Perform move and lock in one step to prevent race conditions
      const finalPosition = { ...prev.activePiece.position, y: prev.activePiece.position.y + offset };
      const finalPiece = { ...prev.activePiece, position: finalPosition };
      
      const newGrid = prev.grid.map(row => [...row]);
      finalPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = finalPiece.position.y + y;
            const gridX = finalPiece.position.x + x;
            if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
              newGrid[gridY][gridX] = finalPiece.type;
            }
          }
        });
      });

      let linesCleared = 0;
      const filteredGrid = newGrid.filter(row => {
        const isFull = row.every(cell => cell !== null);
        if (isFull) linesCleared++;
        return !isFull;
      });

      while (filteredGrid.length < ROWS) {
        filteredGrid.unshift(Array(COLS).fill(null));
      }

      const newLines = prev.lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      const scoreTable = [0, 40, 100, 300, 1200];
      const newScore = prev.score + (scoreTable[linesCleared] * newLevel);

      return {
        ...prev,
        grid: filteredGrid,
        activePiece: null,
        score: newScore,
        lines: newLines,
        level: newLevel
      };
    });
  };

  const handleRotate = () => {
    if (!gameState.activePiece || gameState.isPaused || gameState.isGameOver) return;
    const rotateShape = (shape: number[][]) => shape[0].map((_, index) => shape.map(col => col[index]).reverse());
    const rotatedShape = rotateShape(gameState.activePiece.shape);
    const rotatedPiece = { ...gameState.activePiece, shape: rotatedShape };
    
    if (!checkCollision(rotatedPiece, gameState.grid)) {
      setGameState(prev => ({ ...prev, activePiece: rotatedPiece }));
    }
  };

  const move = (dir: number) => {
    if (!gameState.activePiece || gameState.isPaused || gameState.isGameOver) return;
    if (!checkCollision(gameState.activePiece, gameState.grid, dir, 0)) {
      setGameState(prev => ({
        ...prev,
        activePiece: prev.activePiece ? {
          ...prev.activePiece,
          position: { ...prev.activePiece.position, x: prev.activePiece.position.x + dir }
        } : null
      }));
    }
  };

  useInterval(() => {
    drop();
  }, dropTime);

  useEffect(() => {
    if (!gameState.activePiece && !gameState.isGameOver) {
      spawnPiece();
    }
  }, [gameState.activePiece, gameState.isGameOver, spawnPiece]);

  useEffect(() => {
    setDropTime(INITIAL_SPEED * Math.pow(SPEED_INCREMENT, gameState.level - 1));
  }, [gameState.level]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.isGameOver) return;
      switch (e.key.toLowerCase()) {
        case 'arrowleft': case 'a': case '7': move(-1); break;
        case 'arrowright': case 'd': case '9': move(1); break;
        case 'arrowdown': case 's': drop(); break;
        case 'arrowup': case 'w': case '8': handleRotate(); break;
        case ' ': case '5': hardDrop(); break;
        case 'p': setGameState(prev => ({ ...prev, isPaused: !prev.isPaused })); break;
        case 'r': restartGame(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.activePiece, gameState.grid, gameState.isPaused, gameState.isGameOver]);

  const restartGame = () => {
    setGameState({
      grid: createEmptyGrid(),
      activePiece: null,
      nextPiece: getRandomPiece(),
      score: 0,
      level: 1,
      lines: 0,
      isPaused: false,
      isGameOver: false,
    });
  };

  const renderGrid = () => {
    const displayGrid = gameState.grid.map(row => row.map(cell => cell ? '[]' : '. '));
    if (gameState.activePiece) {
      const { shape, position } = gameState.activePiece;
      shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = position.y + y;
            const gridX = position.x + x;
            if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
              displayGrid[gridY][gridX] = '[]';
            }
          }
        });
      });
    }
    return displayGrid;
  };

  const renderedGrid = renderGrid();
  
  // EVEN BIGGER: Increased to 3.5vh for maximum screen usage without overflow
  const cellHeight = "3.5vh"; 
  const containerHeight = `calc(${ROWS} * ${cellHeight})`;
  const containerWidth = `calc(${COLS} * ${cellHeight} * 1.2)`; 

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black overflow-hidden select-none p-[1.5vh]">
      
      {/* Header - More compact to allow bigger grid */}
      <div className="mb-[1.5vh] text-center w-full">
        <h1 className="text-[6.5vh] tracking-[0.4em] crt-glow font-bold opacity-90 leading-none">TETRIS</h1>
        <p className="text-[1.2vh] opacity-40 tracking-[0.6em] uppercase mt-[0.5vh]">ELECTRONIKA 60 REPLICA (1984)</p>
        
        <div className="flex justify-center mt-[1.5vh]">
          <button onClick={restartGame} className="border border-[#00ff00]/40 px-[5vh] py-[0.8vh] hover:bg-[#00ff00] hover:text-black transition-all crt-border-glow text-[1.4vh] uppercase tracking-[0.3em] font-bold">
            [ RESTART SYSTEM ]
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-row items-stretch justify-center gap-[3vw]">
        
        {/* Left Stats */}
        <div className="flex flex-col gap-[2vh] w-[15vw] max-w-[220px]" style={{ height: containerHeight }}>
          <div className="border border-[#00ff00]/60 p-[2.5vh] crt-border-glow bg-[#00ff00]/5 flex-1 flex flex-col justify-center">
            <div className="flex flex-col gap-[2vh]">
              <span className="opacity-40 text-[1.1vh] tracking-widest uppercase font-bold">STATISTICS</span>
              <div className="flex justify-between items-baseline border-b border-[#00ff00]/20 pb-[0.8vh]">
                <span className="text-[2vh] uppercase">LINES:</span>
                <span className="crt-glow font-bold text-[2.8vh]">{gameState.lines}</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-[#00ff00]/20 pb-[0.8vh]">
                <span className="text-[2vh] uppercase">LEVEL:</span>
                <span className="crt-glow font-bold text-[2.8vh]">{gameState.level}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[2vh] uppercase">SCORE:</span>
                <span className="crt-glow font-bold text-[2.8vh]">{gameState.score}</span>
              </div>
            </div>
          </div>
          <div className="border border-[#00ff00]/60 p-[2.5vh] crt-border-glow bg-[#00ff00]/5 h-[15vh] flex flex-col justify-center text-center">
            <h2 className="text-[1.1vh] uppercase opacity-40 mb-[1.5vh] tracking-[0.2em] font-bold">NEXT PIECE:</h2>
            <div className="flex items-center justify-center text-[5vh] tracking-[0.2em] font-bold crt-glow">[{gameState.nextPiece}]</div>
          </div>
        </div>

        {/* The Grid */}
        <div className="relative flex flex-col">
          <div className="flex">
            <div className="flex flex-col select-none opacity-40">
              {Array.from({ length: ROWS }).map((_, i) => (
                <div key={i} style={{ height: cellHeight, lineHeight: cellHeight }} className="text-[2vh] px-[1.5vh] font-mono">&lt; !</div>
              ))}
            </div>

            <div className="bg-black/80 border border-[#00ff00]/50 relative overflow-hidden flex flex-col shadow-[0_0_4vh_rgba(0,255,0,0.15)]" 
                 style={{ width: containerWidth, height: containerHeight }}>
              
              <div className="flex-1">
                {renderedGrid.map((row, y) => (
                  <div key={y} className="flex" style={{ height: cellHeight }}>
                    {row.map((cell, x) => (
                      <span key={x} 
                            style={{ width: `calc(${containerWidth} / ${COLS})`, height: cellHeight, lineHeight: cellHeight }}
                            className={`text-center inline-block whitespace-pre font-bold text-[2.2vh] transition-all duration-75 ${cell === '[]' ? 'crt-glow scale-110 text-[#00ff00]' : 'opacity-10 text-[#00ff00]/70'}`}>
                        {cell}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              
              {gameState.isPaused && !gameState.isGameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20 backdrop-blur-sm border-y-2 border-[#00ff00]/60 my-auto h-[18vh]">
                  <div className="text-[6vh] crt-glow tracking-[0.4em] font-bold leading-none">PAUSED</div>
                  <div className="text-[1.2vh] tracking-[0.4em] opacity-60 mt-[2.5vh] animate-pulse uppercase">PRESS [P] TO RESUME</div>
                </div>
              )}

              {gameState.isGameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20">
                  <div className="text-red-500 text-[5vh] mb-[1.5vh] font-bold tracking-[0.2em] crt-glow uppercase">GAME OVER</div>
                  <div className="text-[2.5vh] mb-[5vh] opacity-70 tracking-widest uppercase font-bold">SCORE: {gameState.score}</div>
                  <button onClick={restartGame} className="border-2 border-[#00ff00] px-[4vh] py-[1.8vh] hover:bg-[#00ff00] hover:text-black transition-all tracking-[0.3em] font-bold text-[1.8vh] uppercase">RESTART</button>
                </div>
              )}
            </div>

            <div className="flex flex-col select-none opacity-40">
              {Array.from({ length: ROWS }).map((_, i) => (
                <div key={i} style={{ height: cellHeight, lineHeight: cellHeight }} className="text-[2vh] px-[1.5vh] font-mono">! &gt;</div>
              ))}
            </div>
          </div>
          <div className="mt-[1vh] flex flex-col items-center opacity-40 select-none font-mono">
             <div className="text-[2vh] tracking-tighter leading-none">&lt;!========================!&gt;</div>
             <div className="text-[2vh] tracking-[0.3em] mt-[0.5vh] leading-none">\/\/\/\/\/\/\/\/\/\/\/\</div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="w-[22vw] max-w-[320px] border border-[#00ff00]/60 p-[3.5vh] crt-border-glow text-sm bg-[#00ff00]/5 flex flex-col" style={{ height: containerHeight }}>
          <h2 className="text-center text-[3vh] mb-[4vh] crt-glow border-b border-[#00ff00]/40 pb-[1.5vh] tracking-[0.2em] font-bold uppercase leading-none">CONTROLS</h2>
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-[2vh]">
              <p className="text-[1vh] opacity-40 tracking-[0.3em] font-bold uppercase">NAVIGATION:</p>
              <div className="flex justify-between items-center"><span className="text-[2.2vh] font-bold uppercase">[A / LEFT]</span> <span className="opacity-40 text-[1vh] font-bold uppercase">MOVE</span></div>
              <div className="flex justify-between items-center"><span className="text-[2.2vh] font-bold uppercase">[D / RIGHT]</span> <span className="opacity-40 text-[1vh] font-bold uppercase">MOVE</span></div>
              <div className="flex justify-between items-center"><span className="text-[2.2vh] font-bold uppercase">[W / UP]</span> <span className="opacity-40 text-[1vh] font-bold uppercase">ROTATE</span></div>
              <div className="flex justify-between items-center"><span className="text-[2.2vh] font-bold uppercase">[S / DOWN]</span> <span className="opacity-40 text-[1vh] font-bold uppercase">SOFT</span></div>
            </div>
            <div className="space-y-[2vh] pt-[2vh] border-t border-[#00ff00]/20">
              <div className="flex justify-between items-center font-bold">
                <span className="text-[#00ff00] crt-glow text-[2.6vh] tracking-widest uppercase">[SPACE / 5]</span> 
                <span className="opacity-60 text-[1vh] uppercase font-bold">HARD DROP</span>
              </div>
            </div>
            <div className="border-t border-[#00ff00]/20 pt-[2vh]">
              <div className="grid grid-cols-3 gap-[1.2vh] text-center font-bold">
                <div className="opacity-10 flex items-center justify-center text-[1vh]">4</div>
                <div className="border border-[#00ff00]/30 py-[1.5vh] flex items-center justify-center text-[1.4vh] hover:bg-[#00ff00]/10 cursor-pointer uppercase transition-colors">[8] ROT</div>
                <div className="opacity-10 flex items-center justify-center text-[1vh]">6</div>
                <div className="border border-[#00ff00]/30 py-[1.5vh] flex items-center justify-center text-[1.4vh] hover:bg-[#00ff00]/10 cursor-pointer uppercase transition-colors">[7] L</div>
                <div className="border border-[#00ff00]/40 py-[1.5vh] crt-glow bg-[#00ff00]/15 flex items-center justify-center text-[1.4vh] font-black">[5]</div>
                <div className="border border-[#00ff00]/30 py-[1.5vh] flex items-center justify-center text-[1.4vh] hover:bg-[#00ff00]/10 cursor-pointer uppercase transition-colors">[9] R</div>
              </div>
            </div>
            <div className="border-t border-[#00ff00]/20 pt-[2.5vh] flex justify-between text-[1.3vh] opacity-60 font-bold tracking-[0.2em] uppercase">
              <span className="hover:opacity-100 cursor-pointer px-[0.5vh] transition-all">[P] PAUSE</span>
              <span className="hover:opacity-100 cursor-pointer px-[0.5vh] transition-all">[R] RESET</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[2vh] text-center text-[0.9vh] tracking-[0.6em] opacity-25 uppercase select-none space-y-[0.5vh] max-w-2xl border-t border-[#00ff00]/10 pt-[2vh]">
        <p>ARROWS, WASD, AND NUMPAD ACTIVE.</p>
        <p>PAJITNOV ALGORITHM REPLICA — 1984</p>
      </div>
      <div className="fixed inset-0 crt-scanline pointer-events-none z-50 opacity-40"></div>
    </div>
  );
};

export default TetrisGame;
