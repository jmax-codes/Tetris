
import React, { useState, useEffect, useCallback } from 'react';
import { COLS, ROWS, PIECES, INITIAL_SPEED, SPEED_INCREMENT } from '../constants';
import { PieceType, Piece, Grid, GameState } from '../types';
import { useInterval } from '../hooks/useInterval';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import MusicVisualizer from './MusicVisualizer';

const getRows = (theme: 'electronika' | 'technicolor') => theme === 'electronika' ? 24 : 20;

const createEmptyGrid = (theme: 'electronika' | 'technicolor' = 'electronika'): Grid => {
  const rows = getRows(theme);
  return Array.from({ length: rows }, () => Array(COLS).fill(null));
};

const getRandomPiece = (): PieceType => {
  const types: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  return types[Math.floor(Math.random() * types.length)];
};

const TetrisGame: React.FC = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>({
    grid: createEmptyGrid(),
    activePiece: null,
    nextPiece: getRandomPiece(),
    score: 0,
    level: 1,
    lines: 0,
    isPaused: false,
    isGameOver: false,
    theme: 'electronika',
    pieceStats: { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 },
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const initGame = useCallback(() => {
    const theme = localStorage.getItem('tetris-theme') as 'electronika' | 'technicolor' || 'electronika';
    return {
      grid: createEmptyGrid(theme),
      activePiece: null,
      nextPiece: getRandomPiece(),
      score: 0,
      level: 1,
      lines: 0,
      isPaused: false,
      isGameOver: false,
      theme,
      pieceStats: { 'I': 0, 'J': 0, 'L': 0, 'O': 0, 'S': 0, 'T': 0, 'Z': 0 }
    };
  }, []);

  const [dropTime, setDropTime] = useState<number | null>(INITIAL_SPEED);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const isProcessingRef = React.useRef(false); // Debounce ref
  const hardDropTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const prevGameOverRef = React.useRef(false); // Track previous game over state
  
  // Audio Refs
  const audioThemeRef = React.useRef<HTMLAudioElement | null>(null);
  const audioGameOverRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio elements
    try {
      audioThemeRef.current = new Audio('/assets/tetris-theme.mp3');
      audioThemeRef.current.loop = true;
      audioThemeRef.current.volume = 0.4;
      audioThemeRef.current.preload = 'auto';

      audioGameOverRef.current = new Audio('/assets/tetris-gameover.mp3');
      audioGameOverRef.current.volume = 0.8;
      audioGameOverRef.current.preload = 'auto';
      audioGameOverRef.current.addEventListener('loadeddata', () => {
        console.log('🎮 Game over audio loaded successfully');
      });
      audioGameOverRef.current.addEventListener('error', (e) => {
        console.error('❌ Game over audio load error:', e);
      });

      console.log('Audio files initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }

    return () => {
      audioThemeRef.current?.pause();
      audioGameOverRef.current?.pause();
    };
  }, []);

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(async () => {
    if (audioInitialized) return;
    
    const themeAudio = audioThemeRef.current;
    if (!themeAudio) return;

    try {
      // Try to play and immediately pause to unlock audio
      await themeAudio.play();
      themeAudio.pause();
      themeAudio.currentTime = 0;
      setAudioInitialized(true);
      console.log('Audio initialized successfully');
    } catch (error) {
      console.log('Audio initialization pending user interaction:', error);
    }
  }, [audioInitialized]);

  // Audio Control Logic
  useEffect(() => {
    const themeAudio = audioThemeRef.current;
    const gameOverAudio = audioGameOverRef.current;

    if (!themeAudio || !gameOverAudio || !audioInitialized) return;

    // Handle Mute
    themeAudio.muted = isMuted;
    gameOverAudio.muted = isMuted;

    if (gameState.isGameOver) {
       themeAudio.pause();
       themeAudio.currentTime = 0;
       // Reset and play game over sound
       if (!isMuted) {
           gameOverAudio.currentTime = 0;
           gameOverAudio.play().catch(e => console.error("Game over audio failed:", e));
       }
    } else if (gameState.isPaused) {
        themeAudio.pause();
    } else {
        // Game is running
        if (themeAudio.paused && !isMuted) {
            themeAudio.play().catch(e => console.error("Theme audio failed:", e));
        }
    }
  }, [gameState.isGameOver, gameState.isPaused, isMuted, audioInitialized]);

  // Synthetic Game Over Sound (Fallback)
  const playSyntheticGameOver = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square'; // Game Boy style 8-bit sound
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Authentic Game Boy Game Over Jingle (Descending sequence)
      const now = ctx.currentTime;
      
      // Melody: E5 -> D#5 -> D5 -> C#5 -> C5 ... (Chromatic descent)
      // Duration: ~2 seconds
      
      osc.frequency.setValueAtTime(880, now); // Start high
      osc.frequency.linearRampToValueAtTime(55, now + 1.5); // Slide down to low (classic game over slide)
      
      // Volume envelope (Short bursts or sustain)
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.5);

      osc.start(now);
      osc.stop(now + 1.5); // Stop after 1.5s

      console.log('🎹 Playing synthesized Game Over sound (8-bit fallback)');
    } catch (e) {
      console.error('Synthetic audio failed:', e);
    }
  }, []);

  // Dedicated Game Over Sound Effect
  useEffect(() => {
    const gameOverAudio = audioGameOverRef.current;
    
    // Only play when transitioning from not game over to game over
    if (gameState.isGameOver && !prevGameOverRef.current && audioInitialized && !isMuted) {
      console.log('🎮 GAME OVER - Triggering sound');
      
      if (gameOverAudio) {
        gameOverAudio.currentTime = 0;
        gameOverAudio.play()
          .then(() => console.log('✅ Game over file playing'))
          .catch((e) => {
            console.warn('⚠️ Audio file failed, switching to synthesizer:', e);
            playSyntheticGameOver();
          });
      } else {
        playSyntheticGameOver();
      }
    }
    
    // Update previous state
    prevGameOverRef.current = gameState.isGameOver;
  }, [gameState.isGameOver, audioInitialized, isMuted, playSyntheticGameOver]);

  const toggleMute = async () => {
    // Initialize audio if not already done
    if (!audioInitialized) {
      await initializeAudio();
    }
    setIsMuted(prev => !prev);
  };

  // Test function to manually play game over sound
  const testGameOverSound = () => {
    const gameOverAudio = audioGameOverRef.current;
    if (gameOverAudio) {
      console.log('🧪 Testing game over sound manually');
      gameOverAudio.currentTime = 0;
      gameOverAudio.play()
        .then(() => console.log('✅ Test successful - sound playing'))
        .catch(e => console.error('❌ Test failed:', e));
    }
  };

  const checkCollision = (piece: Piece, grid: Grid, moveX = 0, moveY = 0) => {
    const rows = grid.length;
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          const newX = piece.position.x + x + moveX;
          const newY = piece.position.y + y + moveY;

          if (
            newX < 0 ||
            newX >= COLS ||
            newY >= rows ||
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
      if (!prev.activePiece) return prev;

      const newGrid = prev.grid.map(row => [...row]);
      const { shape, position, type } = prev.activePiece;
      const rows = prev.grid.length;

      // Update piece stats
      const newPieceStats = { ...prev.pieceStats };
      newPieceStats[type] = (newPieceStats[type] || 0) + 1;

      shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = position.y + y;
            const gridX = position.x + x;
            if (gridY >= 0 && gridY < rows && gridX >= 0 && gridX < COLS) {
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

      while (filteredGrid.length < rows) {
        filteredGrid.unshift(Array(COLS).fill(null));
      }

      const newLines = prev.lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      const basePoints = [0, 40, 100, 300, 1200];
      const newScore = prev.score + (basePoints[linesCleared] * (prev.level + 1));

      // Atomic spawn logic
      const nextType = prev.nextPiece;
      const nextShape = PIECES[nextType];
      const nextActivePiece: Piece = {
        type: nextType,
        shape: nextShape,
        position: { x: Math.floor(COLS / 2) - Math.floor(nextShape[0].length / 2), y: 0 },
      };

      if (checkCollision(nextActivePiece, filteredGrid)) {
        return {
          ...prev,
          grid: filteredGrid,
          activePiece: null,
          isGameOver: true,
          score: newScore,
          lines: newLines,
          level: newLevel
        };
      }

      return {
        ...prev,
        grid: filteredGrid,
        activePiece: nextActivePiece,
        nextPiece: getRandomPiece(),
        score: newScore,
        lines: newLines,
        level: newLevel,
        pieceStats: newPieceStats
      };
    });
  }, [checkCollision]);

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
  }, [gameState.nextPiece, gameState.grid]);

  const drop = useCallback(() => {
    if (!gameState.activePiece || gameState.isPaused || gameState.isGameOver || isProcessingRef.current) return;

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
    setGameState(prev => {
      if (!prev.activePiece || prev.isPaused || prev.isGameOver) return prev;

      // 1. Calculate drop distance
      let finalY = prev.activePiece.position.y;
      while (!checkCollision(prev.activePiece, prev.grid, 0, finalY - prev.activePiece.position.y + 1)) {
        finalY++;
      }

      const finalPosition = { ...prev.activePiece.position, y: finalY };
      const finalPiece = { ...prev.activePiece, position: finalPosition };
      
      // Update piece stats
      const newPieceStats = { ...prev.pieceStats };
      newPieceStats[finalPiece.type] = (newPieceStats[finalPiece.type] || 0) + 1;

      // 2. Lock piece into grid
      const newGrid = prev.grid.map(row => [...row]);
      const rows = prev.grid.length;
      finalPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = finalPiece.position.y + y;
            const gridX = finalPiece.position.x + x;
            if (gridY >= 0 && gridY < rows && gridX >= 0 && gridX < COLS) {
              newGrid[gridY][gridX] = finalPiece.type;
            }
          }
        });
      });

      // 3. Clear lines
      let linesCleared = 0;
      const filteredGrid = newGrid.filter(row => {
        const isFull = row.every(cell => cell !== null);
        if (isFull) linesCleared++;
        return !isFull;
      });

      while (filteredGrid.length < rows) {
        filteredGrid.unshift(Array(COLS).fill(null));
      }

      // 4. Update stats
      const newLines = prev.lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      const basePoints = [0, 40, 100, 300, 1200];
      const newScore = prev.score + (basePoints[linesCleared] * (prev.level + 1));

      // 5. Atomic spawn logic
      const nextType = prev.nextPiece;
      const nextShape = PIECES[nextType];
      const nextActivePiece: Piece = {
        type: nextType,
        shape: nextShape,
        position: { x: Math.floor(COLS / 2) - Math.floor(nextShape[0].length / 2), y: 0 },
      };

      const isGameOver = checkCollision(nextActivePiece, filteredGrid);

      return {
        ...prev,
        grid: filteredGrid,
        activePiece: isGameOver ? null : nextActivePiece,
        nextPiece: isGameOver ? prev.nextPiece : getRandomPiece(),
        score: newScore,
        lines: newLines,
        level: newLevel,
        isGameOver: isGameOver || prev.isGameOver,
        pieceStats: newPieceStats
      };
    });

    // Reset processing lock immediately (it was set in handleKeyDown)
    isProcessingRef.current = false;
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
    // Initial spawn
    if (!gameState.activePiece && !gameState.isGameOver && gameState.lines === 0 && gameState.score === 0) {
      spawnPiece();
    }
  }, [gameState.activePiece, gameState.isGameOver, gameState.lines, gameState.score, spawnPiece]);

  useEffect(() => {
    setDropTime(INITIAL_SPEED * Math.pow(SPEED_INCREMENT, gameState.level - 1));
  }, [gameState.level]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Initialize audio on first keypress
      if (!audioInitialized) {
        initializeAudio();
      }

      if (gameState.isGameOver) return;
      
      // Debounce hard drop and other critical actions if needed
      if (e.key === ' ' || e.key === '5') {
          if (isProcessingRef.current) return;
      }

      switch (e.key.toLowerCase()) {
        case 'arrowleft': case 'a': case '7': move(-1); break;
        case 'arrowright': case 'd': case '9': move(1); break;
        case 'arrowdown': case 's': case '4': drop(); break;
        case 'arrowup': case 'w': case '8': handleRotate(); break;
        case ' ': case '5': 
            isProcessingRef.current = true;
            hardDrop(); 
            break;
        case 'p': setGameState(prev => ({ ...prev, isPaused: !prev.isPaused })); break;
        case 'r': restartGame(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hardDropTimeoutRef.current) {
        clearTimeout(hardDropTimeoutRef.current);
      }
    };
  }, [gameState.activePiece, gameState.grid, gameState.isPaused, gameState.isGameOver, audioInitialized, initializeAudio]);

  const restartGame = () => {
    // Clear any pending hard drop timeout
    if (hardDropTimeoutRef.current) {
      clearTimeout(hardDropTimeoutRef.current);
      hardDropTimeoutRef.current = null;
    }
    isProcessingRef.current = false;
    
    setGameState(prev => ({
      grid: createEmptyGrid(prev.theme),
      activePiece: null,
      nextPiece: getRandomPiece(),
      score: 0,
      level: 1,
      lines: 0,
      isPaused: false,
      isGameOver: false,
      theme: prev.theme,
      pieceStats: { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 },
    }));

    // Reset Audio
    if (audioThemeRef.current && audioInitialized) {
        audioThemeRef.current.currentTime = 0;
        if (!isMuted) {
          audioThemeRef.current.play().catch(e => console.error("Restart audio failed:", e));
        }
    }
    if (audioGameOverRef.current) {
        audioGameOverRef.current.pause();
        audioGameOverRef.current.currentTime = 0;
    }
  };

  const renderGrid = () => {
    const displayGrid = gameState.grid.map(row => [...row]);
    if (gameState.activePiece) {
      const { shape, position, type } = gameState.activePiece;
      const rows = gameState.grid.length;
      shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gridY = position.y + y;
            const gridX = position.x + x;
            if (gridY >= 0 && gridY < rows && gridX >= 0 && gridX < COLS) {
              displayGrid[gridY][gridX] = type;
            }
          }
        });
      });
    }
    return displayGrid;
  };

  const renderedGrid = renderGrid();
  
  const isTechnicolor = gameState.theme === 'technicolor';
  
  // Optimized size - fits screen while remaining visible
  // Technicolor uses 20 square blocks (3.36x3.36), Electronika 24 rectangular (2.8x3.36)
  // Width: 10 * 3.36 = 33.6vh | Height: 24 * 2.8 = 67.2vh OR 20 * 3.36 = 67.2vh
  const cellHeight = isTechnicolor ? "3.36vh" : "2.8vh"; 
  const cellWidth = "3.36vh"; // Fixed width to keep container stable
  
  const containerHeight = "67.2vh"; 
  const containerWidth = "33.6vh"; 

  // --- Theme Helpers ---
  const setTheme = (theme: 'electronika' | 'technicolor') => {
    setGameState(prev => {
        if (prev.theme === theme) return prev;
        // Reset grid when changing theme to adapt to new COLS count
        return {
            ...prev,
            theme,
            grid: createEmptyGrid(theme),
            activePiece: null,
            nextPiece: getRandomPiece(),
            score: 0,
            level: 1,
            lines: 0,
            isPaused: false,
            isGameOver: false,
            pieceStats: { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 }
        };
    });
  };

  const getPieceColorClass = (type: string) => {
    if (gameState.theme === 'electronika') return 'text-[#00ff00]';
    switch (type) {
      case 'I': return 'bg-red-600 border-2 border-red-800/80 shadow-[0_0_8px_red] text-transparent'; // Red
      case 'J': return 'bg-white border-2 border-gray-300/80 shadow-[0_0_8px_white] text-transparent'; // White
      case 'L': return 'bg-purple-600 border-2 border-purple-800/80 shadow-[0_0_8px_purple] text-transparent'; // Purple
      case 'O': return 'bg-blue-600 border-2 border-blue-800/80 shadow-[0_0_8px_blue] text-transparent'; // Blue
      case 'S': return 'bg-green-500 border-2 border-green-700/80 shadow-[0_0_8px_green] text-transparent'; // Green
      case 'T': return 'bg-yellow-500 border-2 border-yellow-700/80 shadow-[0_0_8px_yellow] text-transparent'; // Yellow
      case 'Z': return 'bg-cyan-500 border-2 border-cyan-700/80 shadow-[0_0_8px_cyan] text-transparent'; // Cyan
      default: return 'bg-gray-500';
    }
  };

  const getBorderChar = (side: 'left' | 'right') => {
    if (gameState.theme === 'electronika') {
        return side === 'left' ? '<!' : '!>';
    }
    return '*'; // Technicolor star border
  };

  const mainTextColor = isTechnicolor ? 'text-white' : 'text-[#00ff00]';
  const glowClass = isTechnicolor ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'crt-glow';
  const borderColor = isTechnicolor ? 'border-white/20' : 'border-[#00ff00]/60';

  // GameBoy Screen Style override
  const gbScreenStyle = {
    backgroundColor: isTechnicolor ? '#050510' : '#9ca04c',
    color: isTechnicolor ? '#fff' : '#000',
    fontFamily: isTechnicolor ? 'monospace' : 'VT323, monospace'
  };

  return (
    <>
      {isMobile ? (
        <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center overflow-hidden select-none touch-none z-[1000]">
          <div className={`gameboy-container transition-colors duration-500 ${isTechnicolor ? 'bg-[#2a2a2e] border-[#1a1a1e]' : 'bg-[#d1d2d4] border-[#a0a1a3]'}`}>
            {/* Top Speaker/Status */}
            <div className="flex justify-between px-4 mb-1 mt-1">
              <div className={`w-16 h-1 rounded transition-colors ${isTechnicolor ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
              <div className="flex gap-1 items-center">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isTechnicolor ? 'bg-cyan-500 shadow-[0_0_8px_cyan]' : 'bg-red-600 shadow-[0_0_5px_red]'}`}></div>
                  <span className={`text-[8px] font-black uppercase tracking-tighter transition-colors ${isTechnicolor ? 'text-cyan-500/70' : 'text-gray-500'}`}>Battery</span>
              </div>
            </div>

            {/* Screen Section */}
            <div className="gameboy-screen-wrapper">
              <div className={`gameboy-screen-inner ${!isTechnicolor ? 'brightness-90 contrast-125' : ''}`} style={gbScreenStyle}>
                {/* Scanlines Effect for Mobile Screen */}
                <div className="absolute inset-0 crt-scanline pointer-events-none z-10 opacity-10"></div>
                
                <div className="p-1 h-full flex flex-col items-center">
                   {/* Mini Header for Mobile */}
                   <div className="w-full flex justify-between items-center mb-0.5 px-1">
                      <div className="text-[9px] font-bold">
                          <div>SCORE</div>
                          <div className="text-[11px] leading-none">{gameState.score.toString().padStart(6, '0')}</div>
                      </div>
                      <div className="flex gap-2 text-[9px] font-bold">
                          <div>LV: {gameState.level}</div>
                          <div>LINES: {gameState.lines}</div>
                   </div>
                   </div>

                   {/* Grid for Mobile */}
                   <div className="relative border-2 border-black/20 flex-1 w-full bg-black/5 flex flex-col items-center justify-center overflow-hidden">
                      {renderedGrid.map((row, y) => (
                          <div key={y} className="flex h-[4%]">
                            {row.map((cell, x) => (
                              <div key={x} 
                                    className={`w-[12px] h-[12px] flex items-center justify-center border-t border-l border-black/5
                                        ${!cell && isTechnicolor ? 'bg-blue-900/10' : ''}
                                     `}>
                                {cell && (
                                  <div className={`w-full h-full ${isTechnicolor ? getPieceColorClass(cell) : 'bg-black'} border border-black/20 shadow-[inset_0_0_2px_rgba(255,255,255,0.3)]`}></div>
                                )}
                                {!cell && !isTechnicolor && (
                                  <div className="w-[1px] h-[1px] bg-black/20 rounded-full"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}

                        {/* Next Piece Mini Overlay */}
                        <div className="absolute top-1 right-1 bg-white/10 p-1 border border-black/10 backdrop-blur-sm">
                          <div className="text-[8px] font-bold mb-1">NEXT</div>
                          <div className="flex flex-col items-center">
                             {PIECES[gameState.nextPiece].map((row, y) => (
                                  <div key={y} className="flex">
                                  {row.map((cell, x) => (
                                      <div key={`${y}-${x}`} className={`w-[6px] h-[6px] ${cell ? (isTechnicolor ? getPieceColorClass(gameState.nextPiece) : 'bg-black') : 'opacity-0'}`}></div>
                                  ))}
                                  </div>
                              ))}
                          </div>
                        </div>

                        {/* Pause/Game Over Overlays for Mobile */}
                        {gameState.isPaused && !gameState.isGameOver && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-20">
                             <div className="text-white font-bold tracking-widest text-[20px] drop-shadow-md">PAUSED</div>
                          </div>
                        )}
                        {gameState.isGameOver && (
                           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 p-4 text-center">
                              <div className="text-red-500 font-bold tracking-widest text-[20px] mb-2 drop-shadow-md">GAME OVER</div>
                              <button onClick={restartGame} className="px-4 py-1 bg-white/20 border border-white/40 text-white rounded text-[12px] active:bg-white/40">RETRY</button>
                           </div>
                        )}
                   </div>
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col items-center mt-2 scale-[0.9] origin-top">
               <div className="flex justify-between w-full px-4 items-center mb-4">
                  {/* D-PAD */}
                  <div className="gameboy-dpad">
                      <div className="dpad-up dpad-btn flex items-center justify-center" onTouchStart={(e) => { e.preventDefault(); handleRotate(); }}>
                           <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-gray-400"></div>
                      </div>
                      <div className="dpad-down dpad-btn flex items-center justify-center" onTouchStart={(e) => { e.preventDefault(); move(0); }}>
                           <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-400"></div>
                      </div>
                      <div className="dpad-left dpad-btn flex items-center justify-center" onTouchStart={(e) => { e.preventDefault(); move(-1); }}>
                           <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-gray-400"></div>
                      </div>
                      <div className="dpad-right dpad-btn flex items-center justify-center" onTouchStart={(e) => { e.preventDefault(); move(1); }}>
                           <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-gray-400"></div>
                      </div>
                      <div className="dpad-center"></div>
                  </div>

                  {/* A/B Buttons */}
                  <div className="gameboy-buttons">
                      <button className="gb-btn flex flex-col items-center justify-center" onTouchStart={(e) => { e.preventDefault(); handleRotate(); }}>
                          <span className="mt-1">A</span>
                      </button>
                      <button className="gb-btn flex flex-col items-center justify-center" onTouchStart={(e) => { e.preventDefault(); hardDrop(); }}>
                          <span className="mt-1">B</span>
                      </button>
                  </div>
               </div>

               {/* Select / Start */}
               <div className="gb-select-start mt-4">
                  <div className="gb-pill-btn" data-label="Mode" onClick={() => setTheme(isTechnicolor ? 'electronika' : 'technicolor')}></div>
                  <div className="gb-pill-btn" data-label="Pause" onClick={() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))}></div>
               </div>

               {/* Navigation for Mobile */}
               <div className="flex gap-4 mt-4">
                  <button 
                      onClick={() => navigate('/history')}
                      className="text-[10px] font-bold text-gray-600 bg-gray-300 px-2 py-0.5 rounded shadow-sm active:shadow-none uppercase"
                  >
                      History
                  </button>
                  <button 
                      onClick={() => navigate('/movies')}
                      className="text-[10px] font-bold text-gray-600 bg-gray-300 px-2 py-0.5 rounded shadow-sm active:shadow-none uppercase"
                  >
                      Movies
                  </button>
               </div>
               
               {/* Logo */}
               <div className={`mt-6 italic font-black tracking-tighter self-start ml-4 transition-colors ${isTechnicolor ? 'text-cyan-500/40' : 'text-[#302058]'}`}>
                  <span className="text-[10px]">Nintendo</span>
                  <span className="text-[14px] ml-1">GAME BOY</span>
                  <span className="text-[6px] align-top ml-0.5">TM</span>
               </div>
            </div>
          </div>
        </div>
      ) : (
    <div className={`h-screen w-screen fixed inset-0 bg-black ${mainTextColor} p-[2vh] font-mono select-none overflow-hidden relative font-bold `} tabIndex={0}>
       {/* Background Scanlines for both modes */}
       <div className="fixed inset-0 crt-scanline pointer-events-none z-0 opacity-20"></div>
       <div className="fixed inset-0 crt-dots pointer-events-none z-0 opacity-10"></div>
       <div className="fixed inset-0 flicker pointer-events-none z-0 opacity-5"></div>
      
      {/* Header */}
      <div className="mb-[1vh] text-center w-full relative z-10">
        {isTechnicolor ? (
          <div className="flex flex-col items-center">
             <h1 className="text-[9vh] tracking-[0.1em] font-black italic relative inline-block transform -skew-x-12">
                <span className="absolute inset-0 text-red-500 translate-x-1 translate-y-1 blur-[1px]">TETRIS</span>
                <span className="absolute inset-0 text-cyan-400 -translate-x-1 -translate-y-1 blur-[1px]">TETRIS</span>
                <span className="relative text-white drop-shadow-[0_0_10px_white]">TETRIS</span>
             </h1>
             <div className="mt-[-1vh] text-[2.5vh] tracking-[0.3em] font-bold italic text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.6)] transform -skew-x-12">
                TETRIS GAME DISK 1 (1988)
             </div>
          </div>
        ) : (
             <h1 className="text-[9vh] tracking-[0.25em] mr-[-0.25em] crt-glow font-bold opacity-90 leading-none inline-block">TETRIS</h1>
        )}

        {!isTechnicolor && (
            <p className="text-[2.5vh] opacity-40 tracking-[0.6em] mr-[-0.6em] uppercase mt-[0.5vh]">ELECTRONIKA 60 REPLICA (1984)</p>
        )}
        
        {!isTechnicolor && ( // Only show restart button in header for Electronika
            <div className="flex justify-center mt-[1.2vh]">
            <button onClick={restartGame} className="border border-[#00ff00]/40 px-[4vh] py-[0.8vh] hover:bg-[#00ff00] hover:text-black transition-all crt-border-glow text-[1.9vh] uppercase tracking-[0.2em] font-bold">
                [ RESTART SYSTEM ]
            </button>
            </div>
        )}
      </div>

      {/* Main Body - Symmetrical 5-Column Layout - Tighter Gap */}
      <div className={`flex flex-row items-start justify-center gap-[1.5vw] w-full max-w-[98vw] relative z-10 ${isTechnicolor ? 'mt-[4.5vh]' : 'mt-[2vh]'}`}>
        
        {/* Left Decoration - Placeholder to preserve grid centering */}
        <div className="hidden xl:block w-[18vw] max-w-[240px]"></div>

        {/* Inner Left Column: Stats/Next Piece */}
        <div className={`flex flex-col gap-[1.8vh] w-[18vw] max-w-[260px] ${isTechnicolor ? 'justify-start' : ''}`} style={{ height: containerHeight }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState.theme + "-left"}
                initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)', filter: 'brightness(3) contrast(2)' }}
                animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)', filter: 'brightness(1) contrast(1)' }}
                exit={{ opacity: 0, clipPath: 'inset(0 0 0 100%)', filter: 'brightness(3) contrast(2)' }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="h-full flex flex-col gap-[1.8vh] relative overflow-hidden"
              >
                {/* PIXEL OVERLAY FOR TRANSITION */}
                <motion.div
                    className="absolute inset-0 z-50 pointer-events-none flex flex-wrap"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease: "steps(6, end)" }}
                >
                    {Array.from({ length: 48 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="bg-black w-1/4 h-[8.33%]"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            exit={{ opacity: 1 }}
                            transition={{ 
                                duration: 0.4, 
                                delay: Math.random() * 0.2, 
                                ease: "steps(4, end)" 
                            }}
                        />
                    ))}
                </motion.div>
                {/* TECHNICOLOR LEFT LAYOUT */}
                {isTechnicolor && (
                    <>
                    {/* Stats Compact */}
                    <div className="flex flex-col gap-1 mb-2 text-white/80 shrink-0">
                         <div className="flex justify-between text-[1.8vh] font-bold"><span className="opacity-70">LEVEL:</span> <span>{gameState.level}</span></div>
                         <div className="flex justify-between text-[1.8vh] font-bold"><span className="opacity-70">LINES:</span> <span>{gameState.lines}</span></div>
                         <div className="flex justify-between text-[2.2vh] font-bold mt-1"><span className="text-yellow-400">SCORE</span> <span className="text-white">{gameState.score.toString().padStart(6, '0')}</span></div>
                    </div>
                    
                    {/* Controls List for Technicolor */}
                    <div className="border-t-2 border-white/20 pt-2 mb-2 shrink-0">
                         <h3 className="uppercase tracking-widest text-[1.8vh] opacity-50 mb-2 text-cyan-300 font-bold drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">Controls</h3>
                         <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[1.6vh] opacity-90 font-bold">
                            <span className="text-cyan-400 drop-shadow-[0_0_3px_rgba(0,255,255,0.5)]">A/←/7</span> <span className="text-white">LEFT</span>
                            <span className="text-cyan-400 drop-shadow-[0_0_3px_rgba(0,255,255,0.5)]">D/→/9</span> <span className="text-white">RIGHT</span>
                            <span className="text-cyan-400 drop-shadow-[0_0_3px_rgba(0,255,255,0.5)]">W/↑/8</span> <span className="text-white">ROT</span>
                            <span className="text-cyan-400 drop-shadow-[0_0_3px_rgba(0,255,255,0.5)]">S/↓/4</span> <span className="text-white">DROP</span>
                            <span className="text-cyan-400 drop-shadow-[0_0_3px_rgba(0,255,255,0.5)]">SPC/5</span> <span className="text-white">HARD</span>
                            <span className="text-cyan-400 drop-shadow-[0_0_3px_rgba(0,255,255,0.5)]">P</span> <span className="text-white">PAUSE</span>
                         </div>
                    </div>

                     {/* Next Piece Technicolor */}
                     <div className="mt-auto shrink-0">
                        <h3 className="uppercase tracking-widest text-[1.8vh] opacity-50 mb-1 font-bold text-yellow-300 drop-shadow-[0_0_5px_rgba(255,255,0,0.5)]">NEXT PIECE:</h3>
                        <div className="flex items-center justify-center min-h-[10vh] border-2 border-white/10 bg-white/5 rounded shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                            <div className="flex flex-col">
                                {PIECES[gameState.nextPiece].map((row, y) => (
                                    <div key={y} className="flex">
                                    {row.map((cell, x) => (
                                        <span key={`${y}-${x}`} className={`w-[2.5vh] h-[2.5vh] ${cell ? getPieceColorClass(gameState.nextPiece) : 'opacity-0'}`}>
                                        {cell ? '' : ''}
                                        </span>
                                    ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>
                     
                     {/* Navigation Buttons */}
                     <div className="mt-[0.8vh] mb-[1vh] flex flex-col gap-2 shrink-0">
                         <button 
                           onClick={() => navigate('/history')}
                           className="border border-blue-500/50 text-blue-400 py-1 hover:bg-blue-500/20 text-[1.8vh] uppercase font-bold transition-colors"
                         >
                           HISTORY
                         </button>
                         <button 
                           onClick={() => navigate('/movies')}
                           className="border border-blue-500/50 text-blue-400 py-1 hover:bg-blue-500/20 text-[1.8vh] uppercase font-bold transition-colors"
                         >
                           MOVIES
                         </button>
                     </div>
                    </>
                )}

                {/* ELECTRONIKA LEFT LAYOUT */}
                {!isTechnicolor && (
                    <>
                    <div className="border border-[#00ff00]/60 p-[2.2vh] crt-border-glow bg-[#00ff00]/5 flex-1 flex flex-col">
                        <div className="flex flex-col gap-[1.8vh] justify-center flex-1 border-b border-[#00ff00]/20 pb-[2vh] mb-[2vh]">
                        <span className="text-center text-[2.8vh] mb-[1vh] crt-glow border-b border-[#00ff00]/40 pb-[1.2vh] tracking-[0.2em] font-bold uppercase leading-none">STATISTICS</span>
                        <div className="flex justify-between items-baseline border-b border-[#00ff00]/20 pb-[0.7vh]">
                            <span className="text-[2.1vh] uppercase font-bold">LINES:</span>
                            <span className="crt-glow font-bold text-[2.8vh]">{gameState.lines}</span>
                        </div>
                        <div className="flex justify-between items-baseline border-b border-[#00ff00]/20 pb-[0.7vh]">
                            <span className="text-[2.1vh] uppercase font-bold">LEVEL:</span>
                            <span className="crt-glow font-bold text-[2.8vh]">{gameState.level}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-[2.1vh] uppercase font-bold">SCORE:</span>
                            <span className="crt-glow font-bold text-[2.8vh]">{gameState.score}</span>
                        </div>
                        </div>

                        {/* Next Piece Electronika */}
                        <div className="flex flex-col items-center justify-center min-h-[16vh]">
                        <h2 className="text-[1.6vh] uppercase opacity-70 mb-[1.2vh] tracking-[0.2em] font-bold">NEXT PIECE:</h2>
                        <div className="flex flex-col items-center justify-center p-[1vh] h-[10vh]">
                            {PIECES[gameState.nextPiece].map((row, y) => (
                                <div key={y} className="flex">
                                {row.map((cell, x) => (
                                    <span key={`${y}-${x}`} className={`w-[2.2vh] h-[2.2vh] flex items-center justify-center ${cell ? 'opacity-100 crt-glow text-[#00ff00]' : 'opacity-0'}`}>
                                    {cell ? '[]' : ''}
                                    </span>
                                ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border border-[#00ff00]/60 p-[2.2vh] pb-[3vh] crt-border-glow bg-[#00ff00]/5 min-h-[15vh] flex flex-col justify-center">
                        <h2 className="text-center text-[2.8vh] mb-[1.5vh] crt-glow tracking-[0.2em] font-bold uppercase border-b border-[#00ff00]/40 pb-[1vh] leading-none">NAVIGATION</h2>
                        <div className="flex flex-col gap-[1.5vh] text-center">
                        <button 
                          onClick={() => navigate('/history')}
                          className="text-[1.6vh] tracking-[0.2em] font-bold uppercase hover:bg-[#00ff00] hover:text-black transition-all py-[0.5vh] border border-[#00ff00]/30 hover:border-[#00ff00]"
                        >
                          HISTORY
                        </button>
                        <button 
                          onClick={() => navigate('/movies')}
                          className="text-[1.6vh] tracking-[0.2em] font-bold uppercase hover:bg-[#00ff00] hover:text-black transition-all py-[0.5vh] border border-[#00ff00]/30 hover:border-[#00ff00]"
                        >
                          MOVIES ABOUT TETRIS
                        </button>
                        </div>
                    </div>
                    </>
                )}
              </motion.div>
            </AnimatePresence>
        </div>

        {/* The Grid (Shared Logic, different styles) */}
        <div className="relative flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={gameState.theme}
              initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)', filter: 'brightness(2) contrast(1.5)' }}
              animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)', filter: 'brightness(1) contrast(1)' }}
              exit={{ opacity: 0, clipPath: 'inset(100% 0 0 0)', filter: 'brightness(2) contrast(1.5)' }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="flex flex-col relative overflow-hidden"
            >
              {/* PIXEL OVERLAY FOR GRID */}
              <motion.div
                className="absolute inset-0 z-50 pointer-events-none flex flex-wrap"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: "steps(6, end)" }}
              >
                  {Array.from({ length: 60 }).map((_, i) => (
                      <motion.div
                          key={i}
                          className="bg-black w-[10%] h-[10%]" // 10x10 grid
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 0 }}
                          exit={{ opacity: 1 }}
                          transition={{ 
                              duration: 0.4, 
                              delay: (i % 10) * 0.03 + Math.floor(i / 10) * 0.03, // Diagonal wipe
                              ease: "steps(4, end)" 
                          }}
                      />
                  ))}
              </motion.div>
              <div className="flex justify-center w-full">
              {/* Left Border */}
               <div className="flex flex-col select-none opacity-40">
                {Array.from({ length: getRows(gameState.theme) }).map((_, i) => (
                  <div key={i} style={{ height: cellHeight, lineHeight: cellHeight }} className={`text-[2.2vh] px-[1vh] font-mono tracking-widest ${isTechnicolor ? 'text-blue-500' : ''}`}>
                      {getBorderChar('left')}
                  </div>
                ))}
              </div>

              <div className={`${isTechnicolor ? 'bg-[#050510]' : 'bg-black/80'} border border-t-0 ${borderColor} relative overflow-hidden flex flex-col shadow-[0_0_4vh_rgba(0,255,0,0.15)]`} 
                   style={{ width: containerWidth, height: containerHeight }}>
                
                <div className="flex-1">
                  {renderedGrid.map((row, y) => (
                    <div key={y} className="flex" style={{ height: cellHeight }}>
                      {row.map((cell, x) => (
                        <div key={x} 
                              style={{ width: cellWidth, height: cellHeight }}
                              className={`flex items-center justify-center relative
                                  ${!cell && isTechnicolor ? 'border border-blue-400/10' : ''}
                               `}>
                          {cell && isTechnicolor && (
                            <div className={`absolute inset-0 ${getPieceColorClass(cell)}`}></div>
                          )}
                          {cell && !isTechnicolor && (
                            <span className="crt-glow scale-110 text-[#00ff00] font-bold text-[2.4vh]">[]</span>
                          )}
                          {!cell && isTechnicolor && (
                            <div className="w-[0.6vh] h-[0.6vh] bg-blue-400/30 rounded-full shadow-[0_0_3px_rgba(34,211,238,0.4)]"></div>
                          )}
                          {!cell && !isTechnicolor && (
                            <span className="opacity-30 text-[#00ff00]/70 text-[2.4vh]">.</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                
                {/* Overlays (Pause/Game Over) */}
                {gameState.isPaused && !gameState.isGameOver && (
                  isTechnicolor ? (
                      // Technicolor Pause Screen
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050510]/90 z-20 backdrop-blur-sm border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                          <div className="text-[6vh] font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transform -skew-x-12">PAUSED</div>
                          <div className="text-[2vh] text-white/80 font-bold mt-[2vh] animate-pulse tracking-widest">PRESS [P] TO RESUME</div>
                      </div>
                  ) : (
                      // Electronika Pause Screen
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20 backdrop-blur-sm border-y-2 border-[#00ff00]/60">
                          <div className="text-[6vh] crt-glow tracking-[0.2em] font-bold leading-none text-center text-[#00ff00]">PAUSED</div>
                          <div className="text-[2vh] tracking-[0.3em] opacity-60 mt-[2vh] animate-pulse uppercase text-center text-[#00ff00]">PRESS [P] TO RESUME</div>
                      </div>
                  )
                )}

                {gameState.isGameOver && (
                  isTechnicolor ? (
                      // Technicolor Game Over Screen
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/95 z-20 border-2 border-red-500/50">
                          <div className="text-[5vh] font-black tracking-widest text-red-500 drop-shadow-[2px_2px_0px_rgba(255,255,255,0.2)] mb-4 transform -rotate-2">
                              GAME OVER
                          </div>
                          <div className="text-[3vh] text-white font-bold mb-8">SCORE: {gameState.score}</div>
                          <button onClick={restartGame} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold tracking-widest hover:scale-105 transition-transform shadow-[0_0_15px_rgba(79,70,229,0.5)] rounded-sm">
                              TRY AGAIN
                          </button>
                      </div>
                  ) : (
                      // Electronika Game Over Screen
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20 w-full">
                          <div className="text-red-500 text-[4.5vh] mb-[1.5vh] font-bold tracking-[0.2em] crt-glow uppercase text-center whitespace-nowrap">GAME OVER</div>
                          <div className="text-[2.6vh] mb-[4vh] opacity-70 tracking-widest uppercase font-bold text-center text-[#00ff00]">SCORE: {gameState.score}</div>
                          <button onClick={restartGame} className="border-2 border-[#00ff00] px-[4vh] py-[1.6vh] hover:bg-[#00ff00] hover:text-black transition-all tracking-[0.3em] font-bold text-[1.8vh] uppercase text-[#00ff00]">RESTART</button>
                      </div>
                  )
                )}
              </div>

              {/* Right Border */}
              <div className="flex flex-col select-none opacity-40">
                {Array.from({ length: getRows(gameState.theme) }).map((_, i) => (
                  <div key={i} style={{ height: cellHeight, lineHeight: cellHeight }} className={`text-[2.2vh] px-[1vh] font-mono tracking-widest ${isTechnicolor ? 'text-blue-500' : ''}`}>
                      {getBorderChar('right')}
                  </div>
                ))}
              </div>
              </div>

               {/* Bottom Border */}
               <div className={`w-full flex justify-center font-mono opacity-40 select-none ${isTechnicolor ? 'text-blue-500' : ''}`}>
                 <div style={{ height: cellHeight, lineHeight: cellHeight }} className="text-[2.2vh] px-[1vh] tracking-widest">{getBorderChar('left')}</div>
                 <div className="flex flex-col overflow-hidden border-x border-transparent" style={{ width: containerWidth }}>
                    <div className="flex" style={{ height: cellHeight }}>
                        {isTechnicolor ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <span key={i} style={{ flex: 1, height: cellHeight, lineHeight: cellHeight }} className="text-center font-bold scale-125">*</span>
                            ))
                        ) : (
                            Array.from({ length: 10 }).map((_, i) => (
                                <span key={i} style={{ flex: 1, height: cellHeight, lineHeight: cellHeight }} className="text-center inline-block font-bold text-[3vh] mt-[-0.5vh] scale-x-125">==</span>
                            ))
                        )}
                    </div>
                    {!isTechnicolor && (
                        <div className="flex text-[3vh] mt-[-0.5vh] leading-none whitespace-nowrap overflow-hidden">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <span key={i} style={{ flex: 1 }} className="text-center font-bold scale-x-125">\/</span>
                        ))}
                        </div>
                    )}
               </div>
                 <div style={{ height: cellHeight, lineHeight: cellHeight }} className="text-[2.2vh] px-[1vh] tracking-widest">{getBorderChar('right')}</div>
               </div>
               
               {/* TECHNICOLOR: BOTTOM FOOTER */}
               {isTechnicolor && (
                   <div className="mt-[1vh] w-full text-center">
                       <span className="text-[#ff0000] font-bold text-[3vh] tracking-[0.1em]" 
                             style={{ 
                                 fontFamily: 'monospace',
                                 textShadow: '0 0 4px rgba(255, 0, 0, 0.4)'
                             }}>
                           Play <span className="tracking-[0.2em] uppercase">TETRIS</span> !
                       </span>
                   </div>
               )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Inner Right Column: Controls OR Piece Stats */}
        <div id="right-panel" className="w-[18vw] max-w-[260px] flex flex-col" style={{ height: containerHeight }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={gameState.theme + "-right"}
              initial={{ opacity: 0, clipPath: 'inset(0 0 0 100%)', filter: 'brightness(3) contrast(2)' }}
              animate={{ opacity: 1, clipPath: 'inset(0 0 0 0%)', filter: 'brightness(1) contrast(1)' }}
              exit={{ opacity: 0, clipPath: 'inset(0 100% 0 0)', filter: 'brightness(3) contrast(2)' }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className={`h-full flex flex-col relative overflow-hidden ${isTechnicolor ? 'p-[2.2vh]' : 'border border-[#00ff00]/60 p-[2.2vh] crt-border-glow bg-[#00ff00]/5'}`}
            >
             {/* PIXEL OVERLAY FOR RIGHT COLUMN */}
             <motion.div
                 className="absolute inset-0 z-50 pointer-events-none flex flex-wrap"
                 initial={{ opacity: 1 }}
                 animate={{ opacity: 0 }}
                 exit={{ opacity: 1 }}
                 transition={{ duration: 0.6, ease: "steps(6, end)" }}
             >
                 {Array.from({ length: 48 }).map((_, i) => (
                     <motion.div
                         key={i}
                         className="bg-black w-1/4 h-[8.33%]"
                         initial={{ opacity: 1 }}
                         animate={{ opacity: 0 }}
                         exit={{ opacity: 1 }}
                         transition={{ 
                             duration: 0.4, 
                             delay: Math.random() * 0.2, 
                             ease: "steps(4, end)" 
                         }}
                     />
                 ))}
             </motion.div>
              {/* TECHNICOLOR: PIECE STATISTICS */}
              {isTechnicolor && (
                <>
                    <h2 className="text-center text-[2.8vh] mb-[2.5vh] font-bold uppercase tracking-[0.2em]" 
                        style={{ 
                            fontFamily: 'monospace',
                            background: 'repeating-linear-gradient(to bottom, #ffffff 0%, #ffffff 50%, #555555 50%, #555555 100%)',
                            backgroundSize: '100% 0.5vh',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0px 2px 0px rgba(0,0,0,0.5))',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '1.2vh'
                        }}>
                        STATISTICS
                    </h2>
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="flex flex-col gap-[1.8vh] justify-start px-2">
                        {['T', 'J', 'Z', 'O', 'S', 'L', 'I'].map(type => {
                            const pieceColorText = (() => {
                                switch (type) {
                                    case 'I': return 'text-red-600';
                                    case 'J': return 'text-white';
                                    case 'L': return 'text-purple-600';
                                    case 'O': return 'text-blue-600';
                                    case 'S': return 'text-green-500';
                                    case 'T': return 'text-yellow-500';
                                    case 'Z': return 'text-cyan-500';
                                    default: return 'text-white';
                                }
                            })();

                            // Filter empty rows for compact display
                            const compactShape = PIECES[type as PieceType].filter(row => row.some(cell => cell !== 0));

                            return (
                            <div key={type} className="grid grid-cols-[8vh_1fr_5vh] gap-2 items-center">
                                 {/* Mini Piece Representation */}
                                 <div className="flex flex-col items-start w-[8vh] mx-auto scale-110">
                                     {compactShape.map((row, y) => (
                                         <div key={y} className="flex">
                                            {row.map((cell, x) => (
                                                <div key={`${y}-${x}`} className={`w-[1.8vh] h-[1.8vh] ${cell ? getPieceColorClass(type) : 'opacity-0'} border-[0.5px] border-black/10`}></div>
                                            ))}
                                         </div>
                                     ))}
                                 </div>
                                 
                                 {/* Dash */}
                                 <div className="flex justify-center">
                                     <span className={`font-bold text-[2.5vh] ${pieceColorText}`}>-</span>
                                 </div>

                                 {/* Count */}
                                 <span className={`font-bold text-[2.6vh] text-right ${pieceColorText}`}>
                                     {gameState.pieceStats[type as PieceType] || 0}
                                 </span>
                            </div>
                        )})}
                        </div>
                        
                        <div className="border-t border-white/10 mt-[3.1vh] pt-2 flex justify-between px-4 font-bold text-[2vh] font-mono">
                            <span className="text-gray-400">Σ </span>
                            <span>:</span>
                            <span className="text-white text-[2.2vh]">{Object.values(gameState.pieceStats).reduce((a: number, b: number) => a + b, 0)}</span>
                        </div>
                        
                        {/* Visualizer for Technicolor - Below Statistics */}
                        <div className="mt-auto border-t border-white/10 pt-[1.5vh] pb-[2.2vh]">
                            <MusicVisualizer 
                                isPlaying={!gameState.isPaused && !gameState.isGameOver} 
                                isMuted={isMuted} 
                                onToggle={toggleMute} 
                                theme="technicolor" 
                            />
                        </div>
                    </div>
                </>
              )}

              {/* ELECTRONIKA: CONTROLS REFERENCE */}
              {!isTechnicolor && (
                <>
                    <h2 className="text-center text-[2.8vh] mb-[2.5vh] crt-glow border-b border-[#00ff00]/40 pb-[1.2vh] tracking-[0.2em] font-bold uppercase leading-none">CONTROLS</h2>
                    <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="space-y-[1.8vh]">
                        <p className="text-[1.8vh] opacity-40 tracking-[0.3em] font-bold uppercase">NAVIGATION:</p>
                        <div className="flex justify-between items-center"><span className="text-[2.2vh] font-bold uppercase">[A / LEFT]</span> <span className="opacity-60 text-[2.0vh] font-bold uppercase">MOVE</span></div>
                        <div className="flex justify-between items-center"><span className="text-[2.2vh] font-bold uppercase">[D / RIGHT]</span> <span className="opacity-60 text-[2.0vh] font-bold uppercase">MOVE</span></div>
                        <div className="flex justify-between items-center"><span className="text-[2.2vh] font-bold uppercase">[W / UP]</span> <span className="opacity-60 text-[2.0vh] font-bold uppercase">ROTATE</span></div>
                        <div className="flex justify-between items-center"><span className="text-[2.2vh] font-bold uppercase">[S / DOWN]</span> <span className="opacity-60 text-[2.0vh] font-bold uppercase">SOFT</span></div>
                        </div>
                        
                        <div className="space-y-[1.8vh] pt-[1.8vh] border-t border-[#00ff00]/20">
                        <div className="flex justify-between items-center font-bold">
                            <span className="text-[#00ff00] crt-glow text-[2.5vh] tracking-widest uppercase">[SPACE / 5]</span> 
                            <span className="opacity-60 text-[2.0vh] uppercase font-bold">HARD DROP</span>
                        </div>
                        </div>
                        <div className="border-t border-[#00ff00]/20 pt-[1.8vh]">
                        <div className="grid grid-cols-3 gap-[1.2vh] text-center font-bold">
                            <div className="border border-[#00ff00]/40 py-[1.2vh] crt-glow bg-[#00ff00]/15 flex items-center justify-center text-[1.6vh] font-black">[5]</div>
                            <div className="border border-[#00ff00]/30 py-[1.2vh] flex items-center justify-center text-[1.6vh] hover:bg-[#00ff00]/10 cursor-pointer uppercase transition-colors">[8] ROT</div>
                            <div className="opacity-10 flex items-center justify-center text-[1.2vh]">6</div>
                            <div className="border border-[#00ff00]/30 py-[1.2vh] flex items-center justify-center text-[1.6vh] hover:bg-[#00ff00]/10 cursor-pointer uppercase transition-colors">[7] L</div>
                            <div className="border border-[#00ff00]/30 py-[1.2vh] flex items-center justify-center text-[1.6vh] hover:bg-[#00ff00]/10 cursor-pointer uppercase transition-colors">[4]</div>
                            <div className="border border-[#00ff00]/30 py-[1.2vh] flex items-center justify-center text-[1.6vh] hover:bg-[#00ff00]/10 cursor-pointer uppercase transition-colors">[9] R</div>
                        </div>
                        </div>
                        <div className="border-t border-[#00ff00]/20 pt-[2vh] flex justify-between text-[1.8vh] opacity-60 font-bold tracking-[0.2em] uppercase">
                            <span className="hover:opacity-100 cursor-pointer px-[0.5vh] transition-all">[P] PAUSE</span>
                            <span className="hover:opacity-100 cursor-pointer px-[0.5vh] transition-all">[R] RESET</span>
                        </div>

                        {/* Visualizer for Electronika - Inside Controls Stack */}
                        <div className="mt-auto border-t border-[#00ff00]/20 pt-[1.5vh] pb-[2.2vh]">
                            <MusicVisualizer 
                                isPlaying={!gameState.isPaused && !gameState.isGameOver} 
                                isMuted={isMuted} 
                                onToggle={toggleMute} 
                                theme="electronika" 
                            />
                        </div>
                    </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

        </div>

        {/* Right Decoration - Placeholder to preserve grid centering if needed */}
        <div className="hidden xl:block w-[18vw] max-w-[240px]"></div>


      </div>

      {/* FIXED MODE NAVIGATION - LEFT SIDE */}
      {/* FIXED MODE NAVIGATION - LEFT SIDE */}
      <div className="hidden xl:flex fixed left-[2vw] top-[50%] -translate-y-1/2 flex-col items-center justify-center select-none z-30 pointer-events-none">
           <div className="relative w-[12vw] max-w-[200px] h-[45vh] flex items-center justify-center">
               {/* Vintage Computer Icon */}
               <motion.button
                 onClick={() => setTheme('electronika')}
                 animate={{
                     y: isTechnicolor ? '-20vh' : '0vh', // Moves Up (Fixed Distance)
                     scale: isTechnicolor ? 0.6 : 1.1, 
                     opacity: isTechnicolor ? 0.4 : 1,
                     filter: isTechnicolor ? 'grayscale(0.8) brightness(0.6)' : 'grayscale(0) brightness(1)'
                 }}
                 transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                 className="absolute outline-none cursor-pointer w-full pointer-events-auto"
                 aria-label="Electronika Mode"
                 style={{ zIndex: !isTechnicolor ? 20 : 10 }}
               >
                 <img 
                   src="/assets/computer.png" 
                   alt="Vintage Computer" 
                   className="w-full h-auto object-contain drop-shadow-xl transition-all duration-300" 
                 />
                 {!isTechnicolor && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute -inset-4 bg-[#00ff00]/20 blur-xl rounded-full -z-10"
                   />
                 )}
               </motion.button>

               {/* Floppy Disk Icon */}
               <motion.button
                 onClick={() => setTheme('technicolor')}
                 animate={{
                     y: isTechnicolor ? '0vh' : '20vh', // Moves Down (Fixed Distance)
                     scale: isTechnicolor ? 1.1 : 0.6, 
                     opacity: isTechnicolor ? 1 : 0.4,
                     filter: isTechnicolor ? 'grayscale(0) brightness(1)' : 'grayscale(0.8) brightness(0.6)'
                 }}
                 whileHover={{ rotate: 3 }} // No scaling, just subtle rotation
                 transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                 className="absolute outline-none cursor-pointer w-[75%] pointer-events-auto"
                 aria-label="Technicolor Mode"
                 style={{ zIndex: isTechnicolor ? 20 : 10 }}
               >
                 <img 
                   src="/assets/floppy.png" 
                   alt="Floppy Disk" 
                   className="w-full h-auto object-contain drop-shadow-xl" 
                 />
                 {isTechnicolor && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute -inset-4 bg-cyan-400/20 blur-xl rounded-full -z-10"
                   />
                 )}
               </motion.button>
           </div>
      </div>

      <div className="fixed inset-0 crt-scanline pointer-events-none z-50 opacity-40"></div>

      {/* FIXED ARROW NAVIGATION */}
      <div className="hidden xl:flex fixed right-[2vw] top-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[6vh] select-none z-30">
        {/* Up Arrow -> Electronika Mode */}
        <button 
          onClick={() => setTheme('electronika')}
          className={`group relative cursor-pointer transform hover:scale-110 active:scale-95 transition-all outline-none focus:outline-none ${!isTechnicolor ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
          aria-label="Electronika Mode"
        >
          <img 
            src="/assets/arcade_arrow.png" 
            alt="UP" 
            className="w-[8vw] max-w-[100px] h-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] filter brightness-95 group-hover:brightness-110 transition-all"
          />
        </button>
        
        {/* Down Arrow -> Technicolor Mode */}
        <button 
          onClick={() => setTheme('technicolor')}
          className={`group relative cursor-pointer transform hover:scale-110 active:scale-95 transition-all outline-none focus:outline-none ${isTechnicolor ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
          aria-label="Technicolor Mode"
        >
          <img 
            src="/assets/arcade_arrow.png" 
            alt="DOWN" 
            className="w-[8vw] max-w-[100px] h-auto rotate-180 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] filter brightness-95 group-hover:brightness-110 transition-all"
          />
        </button>
      </div>
    </div>
    )}
    </>
  );
};

export default TetrisGame;
