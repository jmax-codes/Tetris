import React from 'react';
import { motion } from 'framer-motion';

interface MusicVisualizerProps {
  isPlaying: boolean;
  isMuted: boolean;
  onToggle: () => void;
  theme: 'electronika' | 'technicolor';
  isMobile?: boolean;
}

const MusicVisualizer: React.FC<MusicVisualizerProps> = ({ isPlaying, isMuted, onToggle, theme, isMobile = false }) => {
  const isTechnicolor = theme === 'technicolor';
  
  // Desktop: 7 bars, Mobile: 5 bars
  const barCount = isMobile ? 5 : 7;
  const bars = Array.from({ length: barCount });
  const statusLabel = isMuted ? 'MUTED' : 'PLAYING';

  // Theme-specific colors
  const getBarColor = () => {
    if (isMuted) return 'bg-white/20';
    if (isTechnicolor) {
      // Technicolor uses chromatic aberration effect (cyan/red)
      return 'bg-gradient-to-t from-red-500 via-white to-cyan-400';
    }
    // Electronika uses neon green
    return 'bg-[#00ff00]';
  };

  const getBarShadow = () => {
    if (isMuted) return 'shadow-[0_0_10px_rgba(255,255,255,0.2)]';
    if (isTechnicolor) {
      return 'shadow-[0_0_15px_rgba(34,211,238,0.6)]';
    }
    return 'shadow-[0_0_15px_rgba(0,255,0,0.8)]';
  };

  const getLabelColor = () => {
    if (isMuted) return 'text-white/20';
    if (isTechnicolor) return 'text-cyan-400/60';
    return 'text-[#00ff00]/60';
  };

  // Desktop is bigger
  const containerHeight = isMobile ? 'h-[3vh]' : 'h-[5vh]';
  const barWidth = isMobile ? 'w-[0.2vh]' : 'w-[0.35vh]';
  const barGap = isMobile ? 'gap-[1vh]' : 'gap-[1.2vh]';
  const labelSize = isMobile ? 'text-[0.7vh]' : 'text-[1vh]';

  return (
    <div 
      className="flex flex-col items-center justify-center cursor-pointer group"
      onClick={onToggle}
      title={isMuted ? "Unmute Music" : "Mute Music"}
    >
      {/* Visualizer Container */}
      <div className={`flex items-center justify-center ${containerHeight} ${barGap}`}>
        {bars.map((_, i) => (
          <motion.div
            key={i}
            className={`${barWidth} ${getBarColor()} ${getBarShadow()}`}
            animate={
              !isMuted && isPlaying 
                ? { 
                    height: [
                      `${30 + (i === 0 || i === barCount - 1 ? 0 : i === 1 || i === barCount - 2 ? 15 : 30)}%`, 
                      `${Math.random() * 40 + (i === Math.floor(barCount / 2) ? 60 : 30)}%`, 
                      `${Math.random() * 20 + (i === Math.floor(barCount / 2) ? 80 : 20)}%`, 
                      `${20 + (i === Math.floor(barCount / 2) ? 80 : 40)}%`
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

      {/* Label */}
      <div className="mt-1 flex flex-col items-center">
          <span className={`${labelSize} font-medium tracking-[0.4em] uppercase ${getLabelColor()}`}>
              {statusLabel}
          </span>
      </div>
    </div>
  );
};

export default MusicVisualizer;
