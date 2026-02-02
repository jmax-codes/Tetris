
import React, { useState, useEffect, useCallback } from 'react';
import { COLS, ROWS, PIECES, INITIAL_SPEED, SPEED_INCREMENT } from '../constants';
import { PieceType, Piece, Grid, GameState } from '../types';
import { useInterval } from '../hooks/useInterval';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import MusicVisualizer from './MusicVisualizer';

const getRows = (theme: 'electronika' | 'technicolor', isMobile: boolean) => (theme === 'electronika' && !isMobile) ? 24 : 20;

const createEmptyGrid = (theme: 'electronika' | 'technicolor' = 'electronika', isMobile: boolean = false): Grid => {
  const rows = getRows(theme, isMobile);
  return Array.from({ length: rows }, () => Array(COLS).fill(null));
};

const getRandomPiece = (): PieceType => {
  const types: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  return types[Math.floor(Math.random() * types.length)];
};

const TetrisGame: React.FC = () => {
  const navigate = useNavigate();
  /* INITIALIZATION HELPER */
  const getInitialState = (): GameState => {
      let theme: 'electronika' | 'technicolor' = 'electronika';
      let mobileInitially = false;
      try {
          if (typeof window !== 'undefined') {
              const stored = localStorage.getItem('tetris-theme');
              if (stored === 'electronika' || stored === 'technicolor') {
                  theme = stored;
              }
              mobileInitially = window.innerWidth <= 768;
          }
      } catch (e) {
          console.warn('LocalStorage access failed', e);
      }

      return {
          grid: createEmptyGrid(theme, mobileInitially),
          activePiece: null,
          nextPieces: [getRandomPiece(), getRandomPiece(), getRandomPiece()],
          score: 0,
          level: 1,
          lines: 0,
          isPaused: false,
          isGameOver: false,
          theme,
          pieceStats: { I: 0, J: 0, L: 0, O: 0, S: 0, T: 0, Z: 0 },
      };
  };

  const [gameState, setGameState] = useState<GameState>(getInitialState);

  const [isMuted, setIsMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
      if (typeof window !== 'undefined') {
          return window.innerWidth <= 768;
      }
      return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    // Initial check is handled by state initializer, but we keep listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Re-use logic for reset
  const initGame = useCallback(() => {
     return getInitialState();
  }, []);

  const [dropTime, setDropTime] = useState<number | null>(INITIAL_SPEED);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const isProcessingRef = React.useRef(false); // Debounce ref
  const lastActionTimeRef = React.useRef<number>(0);
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
      const nextType = prev.nextPieces[0];
      const nextShape = PIECES[nextType];
      const nextActivePiece: Piece = {
        type: nextType,
        shape: nextShape,
        position: { x: Math.floor(COLS / 2) - Math.floor(nextShape[0].length / 2), y: 0 },
      };

      const newNextPieces = [...prev.nextPieces.slice(1), getRandomPiece()];

      if (checkCollision(nextActivePiece, filteredGrid)) {
        return {
          ...prev,
          grid: filteredGrid,
          activePiece: null,
          isGameOver: true,
          score: newScore,
          lines: newLines,
          level: newLevel,
          nextPieces: newNextPieces
        };
      }

      return {
        ...prev,
        grid: filteredGrid,
        activePiece: nextActivePiece,
        nextPieces: newNextPieces,
        score: newScore,
        lines: newLines,
        level: newLevel,
        pieceStats: newPieceStats
      };
    });
  }, [checkCollision]);

  const spawnPiece = useCallback(() => {
    const type = gameState.nextPieces[0];
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
            nextPieces: [...prev.nextPieces.slice(1), getRandomPiece()]
        }
    });
  }, [gameState.nextPieces, gameState.grid]);

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
      const nextType = prev.nextPieces[0];
      const nextShape = PIECES[nextType];
      const nextActivePiece: Piece = {
        type: nextType,
        shape: nextShape,
        position: { x: Math.floor(COLS / 2) - Math.floor(nextShape[0].length / 2), y: 0 },
      };
      const newNextPieces = [...prev.nextPieces.slice(1), getRandomPiece()];

      const isGameOver = checkCollision(nextActivePiece, filteredGrid);

      return {
        ...prev,
        grid: filteredGrid,
        activePiece: isGameOver ? null : nextActivePiece,
        nextPieces: isGameOver ? prev.nextPieces : newNextPieces,
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

  const handleRotateCCW = () => {
    if (!gameState.activePiece || gameState.isPaused || gameState.isGameOver) return;
    const rotateShapeCCW = (shape: number[][]) => {
        // Transpose and then reverse rows (or 3 right rotations)
        // Easier: reverse columns then transpose
        return shape[0].map((_, index) => shape.map(col => col[col.length - 1 - index]));
    };
    const rotatedShape = rotateShapeCCW(gameState.activePiece.shape);
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
        case 'arrowleft': case 'a': case '7': case '4': move(-1); break;
        case 'arrowright': case 'd': case '9': case '6': move(1); break;
        case 'arrowdown': case 's': case '2': drop(); break;
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
      ...prev,
      grid: createEmptyGrid(prev.theme, isMobile),
      activePiece: null,
      nextPieces: [getRandomPiece(), getRandomPiece(), getRandomPiece()],
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
  
  const containerHeight = isMobile ? "60vh" : "67.2vh"; 
  const containerWidth = "33.6vh"; 

  // --- Theme Helpers ---
  const setTheme = (theme: 'electronika' | 'technicolor') => {
    setGameState(prev => {
        if (prev.theme === theme) return prev;
        // Reset grid when changing theme to adapt to new COLS count
        return {
            ...prev,
            theme,
            grid: createEmptyGrid(theme, isMobile),
            activePiece: null,
            nextPieces: [getRandomPiece(), getRandomPiece(), getRandomPiece()],
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

  // Helper to prevent double-firing on mobile
  const handleControlAction = useCallback((action: () => void) => (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    // Prevent default browser behavior (scrolling/zooming/emulated clicks)
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    // 60ms threshold to block accidental double-triggering
    if (now - lastActionTimeRef.current < 60) return;
    lastActionTimeRef.current = now;

    action();
  }, []);

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

        <div className={`fixed inset-0 bg-black overflow-hidden flex flex-col ${mainTextColor} font-mono select-none touch-none z-[1000]`}>
           {/* Mobile Background Effects */}
           <div className="absolute inset-0 crt-scanline pointer-events-none z-0 opacity-20"></div>
           <div className="absolute inset-0 crt-dots pointer-events-none z-0 opacity-10"></div>
           <div className="absolute inset-0 flicker pointer-events-none z-0 opacity-5"></div>

           {/* --- TOP SECTION (THE SCREEN) --- */}
           <div className="flex-none h-[60vh] flex flex-col w-full px-2 pt-2 relative">
               
                {/* 1. Header (Title & Subtitle) - Fixed Height to prevent shift */}
                <div className="flex-none flex flex-col items-center justify-center h-[7vh] mb-1 shrink-0">
                    {isTechnicolor ? (
                        <>
                            <h1 className="text-[4.8vh] leading-none font-black italic relative inline-block transform -skew-x-12">
                                <span className="absolute inset-0 text-red-500 translate-x-[2px] translate-y-[1px] blur-[0.5px] opacity-80">TETRIS</span>
                                <span className="absolute inset-0 text-cyan-400 -translate-x-[2px] -translate-y-[1px] blur-[0.5px] opacity-80">TETRIS</span>
                                <span className="relative text-white drop-shadow-[0_0_10px_white] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,1)_0px,rgba(255,255,255,1)_2px,rgba(255,255,255,0.4)_2px,rgba(255,255,255,0.4)_4px)] bg-clip-text text-transparent">TETRIS</span>
                            </h1>
                            <div className="text-[1.3vh] leading-tight font-bold tracking-[0.4em] text-cyan-400 italic transform -skew-x-12 mt-1 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
                                TETRIS GAME DISK 1 (1988)
                            </div>
                        </>
                    ) : (
                        <>
                            <h1 className="text-[3.5vh] leading-none font-bold tracking-[0.2em] text-[#00ff00] crt-glow inline-block">
                                TETRIS
                            </h1>
                            <div className="text-[1vh] leading-tight font-bold tracking-[0.3em] opacity-40 uppercase mt-1">
                                ELECTRONIKA 60 REPLICA (1984)
                            </div>
                        </>
                    )}
                </div>

               {/* 2. Main 3-Column Display */}
               <div className="flex-1 flex flex-row items-stretch justify-center gap-1 overflow-hidden">
                   
                   {/* COLUMN 1: LEFT (Stats, Icons, Nav) */}
                   <div className="flex flex-col flex-1 items-start justify-start pt-2 gap-2">
                       {/* Stats Group */}
                       <div className="w-full flex flex-col gap-2">
                            <div className={`border-b ${isTechnicolor ? 'border-cyan-500/50' : 'border-[#00ff00]/30'} pb-0.5 mb-1`}>
                                <span className={`${isTechnicolor ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#00ff00]/10 text-[#00ff00]'} px-1 py-0.5 text-[1.2vh] font-bold tracking-wider`}>
                                    STATS
                                </span>
                            </div>
                            
                            <div className="flex flex-col gap-0.5">
                                <span className={`text-[1vh] font-bold ${isTechnicolor ? 'text-white' : 'opacity-70'}`}>LINES:</span>
                                <span className="text-[1.8vh] leading-none">{gameState.lines}</span>
                            </div>

                             <div className="flex flex-col gap-0.5">
                                <span className={`text-[1vh] font-bold ${isTechnicolor ? 'text-white' : 'opacity-70'}`}>LEVEL:</span>
                                <span className="text-[1.8vh] leading-none">{gameState.level}</span>
                            </div>

                             <div className="flex flex-col gap-0.5">
                                <span className={`text-[1.1vh] font-bold ${isTechnicolor ? 'text-yellow-500' : 'opacity-70'}`}>SCORE:</span>
                                <span className={`text-[1.8vh] leading-none ${isTechnicolor ? 'text-white font-mono' : ''}`}>
                                    {isTechnicolor ? gameState.score.toString().padStart(6, '0') : gameState.score}
                                </span>
                            </div>
                       </div>

                                                                       <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.8, ease: "circOut" }}
                            className="flex flex-col gap-4 items-center justify-center mt-2 w-full px-1"
                        >
                            <motion.img 
                                src="/assets/computer.png" 
                                whileTap={{ scale: 0.85 }}
                                animate={{ 
                                    scale: isTechnicolor ? 0.75 : 1.1,
                                    opacity: isTechnicolor ? 0.4 : 1,
                                    filter: isTechnicolor 
                                        ? 'brightness(1.1) contrast(1.1) drop-shadow(0 0 0px rgba(0,0,0,0))' 
                                        : 'brightness(1.2) contrast(1.4) drop-shadow(0 0 15px rgba(0, 255, 0, 0.6))'
                                }}
                                transition={{ duration: 0.5 }}
                                className="w-[6.5vh] h-[6.5vh] object-contain flex-none" 
                                alt="PC" 
                             />
                            <motion.img 
                                src="/assets/floppy.png" 
                                whileTap={{ scale: 0.85, rotate: -12 }}
                                animate={{ 
                                    scale: isTechnicolor ? 1.1 : 0.75,
                                    opacity: isTechnicolor ? 1 : 0.4,
                                    filter: isTechnicolor 
                                        ? 'brightness(1.1) contrast(1.1) drop-shadow(0 0 15px rgba(6, 182, 212, 0.6))' 
                                        : 'brightness(1) contrast(1.2) drop-shadow(0 0 0px rgba(0,0,0,0))'
                                }}
                                transition={{ duration: 0.5 }}
                                className="w-[4.2vh] h-[4.2vh] object-contain flex-none" 
                                alt="Disk" 
                             />
                            <div className="mt-1 w-full flex justify-center">
                               <MusicVisualizer 
                                   isPlaying={!gameState.isPaused && !gameState.isGameOver} 
                                   isMuted={isMuted} 
                                   onToggle={toggleMute} 
                                   theme={gameState.theme}
                               />
                            </div>
                        </motion.div>
                        
                    </div>

                   {/* COLUMN 2: CENTER (The GRID) */}
                   {/* COLUMN 2: CENTER (The GRID) - DESKTOP CLONE */}
                   <div className="flex flex-col items-center justify-start flex-none relative pt-1">
                       
                       {/* 1. Main Flex Container (Left Border | Grid | Right Border) */}
                       <div className="flex justify-center w-full">
                           
                           {/* Left Border Column - Fixed Width to prevent shift */}
                           <div className="flex flex-col select-none opacity-40 flex-none w-[2.5vh]">
                                {Array.from({ length: getRows(gameState.theme, isMobile) }).map((_, i) => (
                                  <div key={i} className={`${isTechnicolor ? 'text-[2.2vh] font-bold' : 'text-[1.2vh]'} h-[2.15vh] leading-[2.15vh] w-full text-center font-mono tracking-widest ${isTechnicolor ? 'text-blue-500' : 'text-[#00ff00]'}`}>
                                      {getBorderChar('left')}
                                  </div>
                                ))}
                           </div>

                           {/* The Main Grid Box */}
                           <div className={`
                                ${isTechnicolor ? 'bg-[#050510]' : 'bg-black/90'} 
                                border ${isTechnicolor ? 'border-blue-500/30' : 'border-[#00ff00]/40'} 
                                border-t-0 relative overflow-hidden flex flex-col flex-none
                                shadow-[0_0_15px_rgba(0,0,0,0.5)]
                                w-[calc(2.15vh*10+2px)]
                            `}>
                                <div className="flex-1 flex flex-col">
                                    {renderedGrid.map((row, y) => (
                                        <div key={y} className="flex">
                                            {row.map((cell, x) => (
                                                <div key={x} 
                                                    className={`
                                                        w-[2.15vh] h-[2.15vh] flex items-center justify-center relative
                                                        ${!cell && isTechnicolor ? 'border border-blue-400/10' : ''}
                                                    `}>
                                                    {cell && isTechnicolor && (
                                                        <div className={`absolute inset-0 ${getPieceColorClass(cell)}`}></div>
                                                    )}
                                                    {cell && !isTechnicolor && (
                                                        <span className="crt-glow scale-110 text-[#00ff00] font-bold text-[2.15vh] leading-none">[]</span>
                                                    )}
                                                    {!cell && isTechnicolor && (
                                                        <div className="w-[0.5vh] h-[0.5vh] bg-blue-400/30 rounded-full shadow-[0_0_3px_rgba(34,211,238,0.4)]"></div>
                                                    )}
                                                    {!cell && !isTechnicolor && (
                                                        <span className="opacity-30 text-[#00ff00] text-[2.15vh] leading-none">.</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>

                                {/* Overlays inside the box */}
                                {gameState.isPaused && !gameState.isGameOver && (
                                    <div className={`absolute inset-0 z-50 flex items-center justify-center ${isTechnicolor ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/80'}`}>
                                        <span className={`text-[3vh] font-bold tracking-widest blink ${isTechnicolor ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-[#00ff00] border-y border-[#00ff00] w-full text-center py-2'}`}>
                                            PAUSED
                                        </span>
                                    </div>
                                )}
                                                                {gameState.isGameOver && (
                                     isTechnicolor ? (
                                         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4 text-center">
                                             <div className="flex flex-col mb-4">
                                                 <div className="text-[5vh] leading-none font-black tracking-widest text-[#ff3333] drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)] uppercase">GAME</div>
                                                 <div className="text-[5vh] leading-none font-black tracking-widest text-[#ff3333] drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)] uppercase">OVER</div>
                                             </div>
                                             <div className="text-[2.2vh] text-white font-bold mb-8 tracking-tight uppercase font-mono">SCORE: {gameState.score}</div>
                                             <button 
                                                 onPointerDown={handleControlAction(restartGame)}
                                                 className="px-8 py-3 bg-gradient-to-r from-[#4f46e5] to-[#9333ea] text-white font-bold tracking-widest shadow-[0_0_15px_rgba(79,70,229,0.4)] rounded-md uppercase text-[1.6vh]"
                                             >
                                                 TRY AGAIN
                                             </button>
                                         </div>
                                     ) : (
                                         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm px-2 text-center">
                                             <div className="flex flex-col mb-6">
                                                 <div className="text-[4.5vh] leading-tight font-bold text-red-500 crt-glow" style={{ textShadow: '0 0 12px #00ff00' }}>GAME</div>
                                                 <div className="text-[4.5vh] leading-tight font-bold text-red-500 crt-glow" style={{ textShadow: '0 0 12px #00ff00' }}>OVER</div>
                                             </div>
                                             <div className="text-[2.2vh] text-[#00ff00] font-bold mb-10 tracking-[0.2em] uppercase font-mono">SCORE: {gameState.score}</div>
                                             <button 
                                                 onPointerDown={handleControlAction(restartGame)}
                                                 className="w-full max-w-[18vh] py-4 border-2 border-[#00ff00] text-[#00ff00] font-bold tracking-[0.2em] active:bg-[#00ff00]/20 transition-colors uppercase text-[1.8vh]"
                                             >
                                                 RESTART
                                             </button>
                                         </div>
                                     )
                                 )}

                           </div>

                           {/* Right Border Column - Fixed Width to prevent shift */}
                           <div className="flex flex-col select-none opacity-40 flex-none w-[2.5vh]">
                                {Array.from({ length: getRows(gameState.theme, isMobile) }).map((_, i) => (
                                  <div key={i} className={`${isTechnicolor ? 'text-[2.2vh] font-bold' : 'text-[1.2vh]'} h-[2.15vh] leading-[2.15vh] w-full text-center font-mono tracking-widest ${isTechnicolor ? 'text-blue-500' : 'text-[#00ff00]'}`}>
                                      {getBorderChar('right')}
                                  </div>
                                ))}
                           </div>
                       </div>

                        {/* Bottom Decoration (Desktop Style) */}
                        <div className={`w-full flex justify-center font-mono opacity-40 select-none mt-1 ${isTechnicolor ? 'text-blue-500' : 'text-[#00ff00]'}`}>
                             {isTechnicolor ? (
                                  /* Technicolor Star Row - Fixed Width Alignment with Upper Columns */
                                  <div className="flex font-bold text-[2.2vh] items-center" style={{ width: 'calc(2.5vh + 2.15vh * 10 + 2.5vh + 2px)', transform: 'translateX(-0.1vh)' }}>
                                      {/* Left Corner Star (Aligned with Left Border) */}
                                      <div className="w-[2.5vh] flex justify-center flex-none">*</div>
                                      
                                      {/* Grid Bottom Stars (Aligned with 10 Columns) */}
                                      <div style={{ width: 'calc(2.15vh * 10 + 2px)' }} className="flex flex-none">
                                          <div className="w-[1px] invisible" /> {/* Left Grid Border 1px */}
                                          {Array.from({ length: 10 }).map((_, i) => (
                                              <div key={i} className="w-[2.15vh] flex justify-center flex-none">*</div>
                                          ))}
                                          <div className="w-[1px] invisible" /> {/* Right Grid Border 1px */}
                                      </div>
                                      
                                      {/* Right Corner Star (Aligned with Right Border) */}
                                      <div className="w-[2.5vh] flex justify-center flex-none">*</div>
                                  </div>
                              ) : (
                                 <div className="flex flex-col items-center">
                                     <div className="flex text-[1.5vh] leading-none tracking-tighter">
                                         {Array.from({ length: 10 }).map((_, i) => (
                                             <span key={i} className="scale-x-150 inline-block text-center w-[2.15vh]">==</span>
                                         ))}
                                     </div>
                                     <div className="flex text-[1.5vh] leading-none tracking-tighter">
                                         {Array.from({ length: 10 }).map((_, i) => (
                                             <span key={i} className="scale-x-150 inline-block text-center w-[2.15vh]">\/</span>
                                         ))}
                                     </div>
                                 </div>
                             )}
                        </div>

                    </div>

                   {/* COLUMN 3: RIGHT (Next, Mode) */}
                   <div className="flex flex-col flex-1 items-end justify-start pt-2 gap-4">
                       
                       {/* Next Pieces - BIGGER */}
                       <div className="flex flex-col items-end gap-1 w-full">
                            <div className={`text-[1.5vh] font-bold ${isTechnicolor ? 'text-yellow-500' : 'opacity-80'} mb-1 w-full text-right`}>
                                {isTechnicolor ? 'NEXT PIECE:' : 'NEXT'}
                            </div>
                           {gameState.nextPieces.slice(0, 3).map((type, i) => (
                                 type && PIECES[type] ? (
                                 <div key={i} className={`relative w-[10vh] h-[5vh] flex items-center justify-center border-2 ${isTechnicolor ? 'border-white/20 bg-white/5' : 'border-[#00ff00]/30 bg-[#00ff00]/5'}`}>
                                    <div className={`scale-100 flex flex-col items-center justify-center`}>
                                         {PIECES[type]
                                            .filter(row => row.some(cell => cell !== 0))
                                            .map((row, y) => (
                                              <div key={y} className="flex">
                                               {row.map((cell, x) => (
                                                   <div key={`${y}-${x}`} className={`w-[1.1vh] h-[1.1vh] flex items-center justify-center ${cell ? '' : 'opacity-0'}`}>
                                                        {cell && (
                                                            isTechnicolor ? (
                                                                <div className={`w-full h-full ${getPieceColorClass(type)}`}></div>
                                                            ) : (
                                                                <span className="text-[#00ff00] crt-glow font-bold text-[1.1vh] leading-none">[]</span>
                                                            )
                                                        )}
                                                   </div>
                                               ))}
                                              </div>
                                          ))}
                                    </div>
                                 </div>
                                 ) : null
                            ))}
                       </div>

                       {/* Mode Arrows - BIGGER */}
                       <div className="flex flex-col items-center gap-2 mt-4 pr-1">
                           <button onClick={() => setTheme('electronika')} className={`${!isTechnicolor ? 'opacity-100' : 'opacity-30'} active:scale-90 transition-transform`}>
                               <img src="/assets/arcade_arrow.png" className={`w-[8vh] h-[8vh] object-contain rotate-0 filter brightness-110`} />
                           </button>
                           <button onClick={() => setTheme('technicolor')} className={`${isTechnicolor ? 'opacity-100' : 'opacity-30'} active:scale-90 transition-transform`}>
                               <img src="/assets/arcade_arrow.png" className={`w-[8vh] h-[8vh] object-contain rotate-180 filter brightness-110`} />
                           </button>
                       </div>

                    </div>
                </div>

                {/* Compact Footer */}
                <div className="flex-none h-2 w-full"></div>
            </div>

           {/* --- BOTTOM SECTION (CONTROLS) --- */}
           <div className="flex-none h-[40vh] relative bg-gradient-to-t from-[#151515] to-transparent z-20">
               
               <div className="h-full w-full max-w-lg mx-auto grid grid-cols-3 relative px-2 pb-4">
                   
                     {/* Left: D-Pad - Console Style */}
                     <div className="flex items-start justify-start pl-4 pt-[4vh]">
                        <div className="relative w-[12vh] h-[12vh]">
                            {/* D-Pad Background Cross */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[3.8vh] h-[12vh] bg-[#222] rounded-md shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"></div>
                                <div className="w-[12vh] h-[3.8vh] bg-[#222] rounded-md absolute shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"></div>
                            </div>
                            
                            {/* Up - Hard Drop */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[3.8vh] h-[4.2vh] bg-[#2a2a2a] active:bg-[#111] rounded-t-md flex items-center justify-center active:scale-95 shadow-lg border-t border-x border-gray-600/20"
                                 onPointerDown={handleControlAction(hardDrop)}>
                                <span className="text-[0.7vh] font-bold text-gray-500 uppercase tracking-tighter">Hard</span>
                            </div>
                            
                            {/* Down - Soft Drop */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[3.8vh] h-[4.2vh] bg-[#2a2a2a] active:bg-[#111] rounded-b-md flex items-center justify-center active:scale-95 shadow-lg border-b border-x border-gray-600/20"
                                 onPointerDown={handleControlAction(drop)}>
                                 <span className="text-[1.8vh] text-gray-400">▼</span>
                            </div>

                            {/* Left */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4.2vh] h-[3.8vh] bg-[#2a2a2a] active:bg-[#111] rounded-l-md flex items-center justify-center active:scale-95 shadow-lg border-y border-l border-gray-600/20"
                                 onPointerDown={handleControlAction(() => move(-1))}>
                                 <span className="text-[1.8vh] text-gray-400">◀</span>
                            </div>

                            {/* Right */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[4.2vh] h-[3.8vh] bg-[#2a2a2a] active:bg-[#111] rounded-r-md flex items-center justify-center active:scale-95 shadow-lg border-y border-r border-gray-600/20"
                                 onPointerDown={handleControlAction(() => move(1))}>
                                 <span className="text-[1.8vh] text-gray-400">▶</span>
                            </div>

                            {/* Center indentation */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2.8vh] h-[2.8vh] bg-[#1a1a1a] rounded-full shadow-[inset_0_0_5px_black]"></div>
                        </div>
                    </div>

                     {/* Center: Special Buttons & Select/Start Pill Buttons */}
                    <div className="flex flex-col items-center justify-start pt-[2vh] gap-7">
                         {/* Special Feature Buttons - Hardware Circle Style */}
                         <div className="flex gap-4 select-none">
                             <div className="flex flex-col items-center gap-2">
                                 <button 
                                     onClick={() => navigate('/history')}
                                     onPointerDown={handleControlAction(() => navigate('/history'))}
                                     className={`w-[4.8vh] h-[4.8vh] rounded-full transition-all active:scale-90 touch-none border-2 shadow-lg ${isTechnicolor ? 'bg-[#222b35] border-cyan-400/40 shadow-cyan-900/20' : 'bg-[#1a221a] border-[#00ff00]/40 shadow-green-900/20'}`}
                                 >
                                 </button>
                                 <span className={`text-[0.9vh] font-bold tracking-[0.1em] uppercase ${isTechnicolor ? 'text-cyan-400/70' : 'text-[#00ff00]/70 font-mono'}`}>HISTORY</span>
                             </div>
                             <div className="flex flex-col items-center gap-2">
                                 <button 
                                     onClick={() => navigate('/movies')}
                                     onPointerDown={handleControlAction(() => navigate('/movies'))}
                                     className={`w-[4.8vh] h-[4.8vh] rounded-full transition-all active:scale-90 touch-none border-2 shadow-lg ${isTechnicolor ? 'bg-[#2b2235] border-purple-400/40 shadow-purple-900/20' : 'bg-[#1a221a] border-[#00ff00]/40 shadow-green-900/20'}`}
                                 >
                                 </button>
                                 <span className={`text-[0.9vh] font-bold tracking-[0.1em] uppercase ${isTechnicolor ? 'text-purple-400/70' : 'text-[#00ff00]/70 font-mono'}`}>MOVIES</span>
                             </div>
                         </div>

                         <div className="flex gap-3 transform rotate-[-25deg] mt-2">
                             <div className="flex flex-col items-center gap-1">
                                 <button className="w-9 h-3 rounded-full bg-[#3a3a3a] border-b-2 border-[#1a1a1a] active:border-b-0 active:translate-y-[1px] shadow-lg"
                                      onPointerDown={handleControlAction(() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused })))}></button>
                                 <span className="text-[0.7vh] font-black text-gray-500 tracking-widest uppercase">Select</span>
                             </div>
                             <div className="flex flex-col items-center gap-1">
                                 <button className="w-9 h-3 rounded-full bg-[#3a3a3a] border-b-2 border-[#1a1a1a] active:border-b-0 active:translate-y-[1px] shadow-lg"
                                      onPointerDown={handleControlAction(restartGame)}></button>
                                 <span className="text-[0.7vh] font-black text-gray-500 tracking-widest uppercase">Start</span>
                             </div>
                         </div>
                    </div>

                    {/* Right: A/B Buttons - Red Circles Staggered */}
                    <div className="flex items-start justify-end pr-4 pt-[1.25vh]">
                        <div className="relative w-[16vh] h-[12vh]">
                            {/* B Button (Left/Lower) */}
                            <div className="absolute left-0 bottom-0 flex flex-col items-center group">
                                <button 
                                    className="w-[6.5vh] h-[6.5vh] rounded-full bg-[#a31a34] border-b-4 border-[#6b1122] active:border-b-0 active:translate-y-1 shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex items-center justify-center"
                                    onPointerDown={handleControlAction(handleRotateCCW)}
                                >
                                    <span className="text-[2.5vh] font-black text-white/50">B</span>
                                </button>
                            </div>

                            {/* A Button (Right/Higher) */}
                            <div className="absolute right-0 top-0 flex flex-col items-center group">
                                <button 
                                    className="w-[6.5vh] h-[6.5vh] rounded-full bg-[#a31a34] border-b-4 border-[#6b1122] active:border-b-0 active:translate-y-1 shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex items-center justify-center"
                                    onPointerDown={handleControlAction(handleRotate)}
                                >
                                    <span className="text-[2.5vh] font-black text-white/50">A</span>
                                </button>
                            </div>
                        </div>
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
                                {gameState.nextPieces[0] && PIECES[gameState.nextPieces[0]] ? PIECES[gameState.nextPieces[0]].map((row, y) => (
                                    <div key={y} className="flex">
                                    {row.map((cell, x) => (
                                        <span key={`${y}-${x}`} className={`w-[2.5vh] h-[2.5vh] ${cell ? getPieceColorClass(gameState.nextPieces[0]) : 'opacity-0'}`}>
                                        {cell ? '' : ''}
                                        </span>
                                    ))}
                                    </div>
                                )) : null}
                            </div>
                        </div>
                     </div>
                     
                     {/* Navigation Buttons */}
                     <div className="mt-[0.8vh] mb-[1vh] flex flex-col gap-2 shrink-0">
                         <button 
                           onClick={() => navigate('/history')}
                           className="border border-blue-500/50 text-blue-400 py-1 hover:bg-blue-500/20 text-[1.8vh] uppercase font-bold transition-colors w-full"
                         >
                           HISTORY
                         </button>
                         <button 
                           onClick={() => navigate('/movies')}
                           className="border border-blue-500/50 text-blue-400 py-1 hover:bg-blue-500/20 text-[1.8vh] uppercase font-bold transition-colors w-full"
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
                            {gameState.nextPieces[0] && PIECES[gameState.nextPieces[0]] ? PIECES[gameState.nextPieces[0]].map((row, y) => (
                                <div key={y} className="flex">
                                {row.map((cell, x) => (
                                    <span key={`${y}-${x}`} className={`w-[2.2vh] h-[2.2vh] flex items-center justify-center ${cell ? 'opacity-100 crt-glow text-[#00ff00]' : 'opacity-0'}`}>
                                    {cell ? '[]' : ''}
                                    </span>
                                ))}
                                    </div>
                                )) : null}
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
                {Array.from({ length: getRows(gameState.theme, isMobile) }).map((_, i) => (
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
                {Array.from({ length: getRows(gameState.theme, isMobile) }).map((_, i) => (
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
                    <h2 className="text-center text-[2.8vh] mb-[1.5vh] font-bold uppercase tracking-[0.2em]" 
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

                    {/* Technicolor Special Buttons - Circle Style */}
                    <div className="flex justify-center gap-[1.5vh] mb-[3vh] px-1 mt-[1vh]">
                        <div className="flex flex-col items-center gap-2">
                            <button 
                                onClick={() => navigate('/history')}
                                className="w-[5vh] h-[5vh] rounded-full bg-[#222b35] border-2 border-cyan-400/50 shadow-lg shadow-cyan-900/40 active:scale-95 transition-all"
                            ></button>
                            <span className="text-[1.1vh] font-black italic text-cyan-400/80 tracking-widest">HISTORY</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <button 
                                onClick={() => navigate('/movies')}
                                className="w-[5vh] h-[5vh] rounded-full bg-[#2b2235] border-2 border-purple-400/50 shadow-lg shadow-purple-900/40 active:scale-95 transition-all"
                            ></button>
                            <span className="text-[1.1vh] font-black italic text-purple-400/80 tracking-widest">MOVIES</span>
                        </div>
                    </div>
                    
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
                        
                        <div className="border-t border-white/10 mt-[3.1vh] pt-2 flex justify-between px-4 font-bold text-[2vh] font-mono mb-[1.5vh]">
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
                     <h2 className="text-center text-[2.8vh] mb-[1.5vh] crt-glow border-b border-[#00ff00]/40 pb-[1.2vh] tracking-[0.2em] font-bold uppercase leading-none">CONTROLS</h2>
                    
                     {/* Electronika Special Buttons - Hardware Circle Style */}
                    <div className="flex justify-center gap-[1.5vh] mb-[3vh] w-full px-2 mt-[1vh]">
                        <div className="flex flex-col items-center gap-2">
                            <button 
                                onClick={() => navigate('/history')}
                                className="w-[5vh] h-[5vh] rounded-full bg-[#1a221a] border-2 border-[#00ff00]/40 shadow-lg shadow-green-950/50 active:scale-95 transition-all crt-glow"
                            ></button>
                            <span className="text-[1.1vh] font-mono font-bold text-[#00ff00]/70 tracking-[0.2em]">HISTORY</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <button 
                                onClick={() => navigate('/movies')}
                                className="w-[5vh] h-[5vh] rounded-full bg-[#1a221a] border-2 border-[#00ff00]/40 shadow-lg shadow-green-950/50 active:scale-95 transition-all crt-glow"
                            ></button>
                            <span className="text-[1.1vh] font-mono font-bold text-[#00ff00]/70 tracking-[0.2em]">MOVIES</span>
                        </div>
                    </div>
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
