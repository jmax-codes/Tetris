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
  
  // Design color for Technicolor: Red and Cyan offsets with White core
  const bars = Array.from({ length: 20 });
  const statusLabel = isMuted ? '[ MUTED ]' : '[ PLAYING ]';

  return (
    <div 
      className="flex flex-col items-center justify-center cursor-pointer group w-full pb-2"
      onClick={onToggle}
      title={isMuted ? "Unmute Music" : "Mute Music"}
    >
      {/* Visualizer Container */}
      <div className="flex items-end justify-center h-[4vh] gap-[0.5vh] w-full px-[1vh]">
        {bars.map((_, i) => (
          <motion.div
            key={i}
            className={`w-[0.8vh] rounded-t-sm ${isMuted ? 'opacity-30' : 'opacity-80'}`}
            style={isTechnicolor ? {
              backgroundColor: 'white',
              boxShadow: '2px 2px 0px #ef4444, -2px -2px 0px #22d3ee, 0 0 12px rgba(255,255,255,0.6)'
            } : {
              backgroundColor: '#00ff00',
              boxShadow: '0 0 5px #00ff00'
            }}
            animate={
              !isMuted && isPlaying 
                ? { 
                    height: [
                      "10%", 
                      `${Math.random() * 60 + 20}%`, 
                      `${Math.random() * 90 + 10}%`, 
                      "15%"
                    ] 
                  }
                : { height: "10%" }
            }
            transition={
              !isMuted && isPlaying
                ? {
                    duration: 0.4 + Math.random() * 0.4,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: i * 0.05
                  }
                : { duration: 0.3 }
            }
          />
        ))}
      </div>

      {/* Label / Status with Amplified Chromatic Aberration for Technicolor */}
      <div className="mt-2 text-[1.4vh] font-bold tracking-[0.2em] uppercase relative">
        {isTechnicolor ? (
          <div className="relative">
             <span className="absolute inset-0 text-red-500 translate-x-[2px] translate-y-[1.5px] blur-[0.4px] opacity-90">{statusLabel}</span>
             <span className="absolute inset-0 text-cyan-400 -translate-x-[2px] -translate-y-[1.5px] blur-[0.4px] opacity-90">{statusLabel}</span>
             <span className="relative text-white drop-shadow-[0_0_10px_white]">{statusLabel}</span>
          </div>
        ) : (
          <span className="text-[#00ff00] crt-glow">{statusLabel}</span>
        )}
      </div>
    </div>
  );
};

export default MusicVisualizer;
