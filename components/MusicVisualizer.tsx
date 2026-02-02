import React from 'react';
import { motion } from 'framer-motion';

interface MusicVisualizerProps {
  isPlaying: boolean;
  isMuted: boolean;
  onToggle: () => void;
  theme: 'electronika' | 'technicolor';
}

const MusicVisualizer: React.FC<MusicVisualizerProps> = ({ isPlaying, isMuted, onToggle, theme }) => {
  const isTechnicolor = theme === 'technicolor';
  
  // Design matching the reference: 5 simple vertical bars
  const bars = Array.from({ length: 5 });
  const statusLabel = isMuted ? 'MUTED' : 'PLAYING';

  return (
    <div 
      className="flex flex-col items-center justify-center cursor-pointer group"
      onClick={onToggle}
      title={isMuted ? "Unmute Music" : "Mute Music"}
    >
      {/* Visualizer Container - Ultra-thin symmetric peak style */}
      <div className="flex items-center justify-center h-[3vh] gap-[1vh]">
        {bars.map((_, i) => (
          <motion.div
            key={i}
            className={`w-[0.2vh] ${isMuted ? 'bg-white/20' : 'bg-white'} shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
            animate={
              !isMuted && isPlaying 
                ? { 
                    height: [
                      `${30 + (i === 0 || i === 4 ? 0 : i === 1 || i === 3 ? 15 : 30)}%`, 
                      `${Math.random() * 40 + (i === 2 ? 60 : 30)}%`, 
                      `${Math.random() * 20 + (i === 2 ? 80 : 20)}%`, 
                      `${20 + (i === 2 ? 80 : 40)}%`
                    ] 
                  }
                : { height: "20%" }
            }
            transition={
              !isMuted && isPlaying
                ? {
                    duration: 0.6 + Math.random() * 0.4,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                    delay: i * 0.12
                  }
                : { duration: 0.3 }
            }
          />
        ))}
      </div>

      {/* Ultra-minimal Center Label */}
      <div className="mt-1 flex flex-col items-center">
          <span className={`text-[0.7vh] font-medium tracking-[0.4em] uppercase ${isMuted ? 'text-white/20' : 'text-white/40'}`}>
              {statusLabel}
          </span>
      </div>
    </div>
  );
};

export default MusicVisualizer;
