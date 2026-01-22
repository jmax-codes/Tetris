import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const TiltCard: React.FC<{ children: React.ReactNode; index: number }> = ({ children, index }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const springConfig = { damping: 20, stiffness: 300 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000,
        rotateX: springRotateX,
        rotateY: springRotateY,
      }}
      className="relative group w-full"
    >
      {children}
    </motion.div>
  );
};

const MoviesPage: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const movies = [
    {
      title: "Tetris (2023)",
      description: "A biographical thriller starring Taron Egerton as Henk Rogers. It dramatizes the high-stakes legal battle to secure the game's global licensing rights from the Soviet Union during the Cold War.",
      year: "2023",
      tag: "FEATURE"
    },
    {
      title: "Tetris: From Russia with Love (2004)",
      description: "A TV documentary that explores the historical and legal background of the game's creation and distribution.",
      year: "2004",
      tag: "DOCUMENTARY"
    },
    {
      title: "Atari: Game Over (2014)",
      description: "Covers video game history including early arcade influences, with tangential ties to puzzle games like Tetris.",
      year: "2014",
      tag: "DOCUMENTARY"
    },
    {
      title: "Ecstasy of Order: The Tetris Masters (2012)",
      description: "A documentary focusing on the world's greatest Tetris players as they prepare for the inaugural Classic Tetris World Championship.\n\n2011 (Festival Premiere): The film had its world premiere at the Austin Film Festival on October 21, 2011, where it won the Audience Award. It spent the remainder of 2011 and early 2012 screening at various international film festivals.\n\n2012 (Public Release): The film made its official debut for the general public on DVD and Video On Demand (VOD) on August 21, 2012.",
      year: "2012",
      tag: "THE MASTERCLASS"
    }
  ];

  const features = [
    {
      title: "The Wizard (1989)",
      description: "Kids compete in a tournament featuring Tetris on Game Boy.",
      color: "border-purple-500"
    },
    {
      title: "Atomic Blonde (2017)",
      description: "Features extended Tetris gameplay in a tense Berlin sequence.",
      color: "border-pink-500"
    },
    {
      title: "8-Bit Christmas (2021)",
      description: "References Nintendo era with Tetris nods.",
      color: "border-blue-500"
    }
  ];

  return (
    <div ref={containerRef} className="relative min-h-screen w-full bg-[#020205] text-white font-mono selection:bg-[#00ff00] selection:text-black overflow-x-hidden">
      {/* Interactive Background */}
      <div className="fixed inset-0 crt-scanline pointer-events-none z-50 opacity-15"></div>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(34,211,238,0.1)_0%,_transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_rgba(34,197,94,0.1)_0%,_transparent_50%)]"></div>
      </div>

      {/* Floating Interactive Shapes */}
      <motion.div 
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, -200]) }}
        className="fixed top-1/4 -right-10 text-[20vh] font-black text-white/5 pointer-events-none select-none z-0"
      >
        []
      </motion.div>
      <motion.div 
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 300]) }}
        className="fixed bottom-1/4 -left-10 text-[15vh] font-black text-[#00ff00]/5 pointer-events-none select-none z-0"
      >
        [][]
      </motion.div>

      <div className="max-w-4xl mx-auto relative z-10 px-6 py-20">
        {/* Header with Parallax */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-24 text-center transform -skew-x-2"
        >
            <motion.h1 
                className="text-[6vh] md:text-[9vh] font-black italic inline-block relative group"
            >
                <span className="absolute inset-0 text-[#00ff00] translate-x-[4px] translate-y-[4px] blur-[2px] opacity-40 group-hover:translate-x-[6px] transition-transform">MOVIES ABOUT TETRIS</span>
                <span className="absolute inset-0 text-cyan-400 -translate-x-[4px] -translate-y-[4px] blur-[2px] opacity-40 group-hover:-translate-x-[6px] transition-transform">MOVIES ABOUT TETRIS</span>
                <span className="relative text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">MOVIES ABOUT TETRIS</span>
            </motion.h1>
            <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-[#00ff00] to-transparent mt-4 shadow-[0_0_10px_#00ff00]"></div>
        </motion.header>

        {/* Floating Return Button */}
        <motion.button 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: 5, backgroundColor: "rgba(0, 255, 0, 0.1)" }}
            onClick={() => navigate('/')}
            className="fixed top-8 left-8 z-[100] group flex items-center gap-4 bg-black/40 backdrop-blur-xl px-6 py-3 border border-white/10 hover:border-[#00ff00]/50 transition-all rounded-sm"
        >
            <span className="text-[#00ff00] text-xl font-bold transition-transform">←</span>
            <span className="text-white/70 font-black tracking-[0.2em] text-xs uppercase group-hover:text-white">BACK TO ARCADE</span>
        </motion.button>

        {/* Main Stack with 3D Interaction */}
        <div className="flex flex-col gap-12 mb-24">
            {movies.map((movie, index) => (
                <TiltCard key={index} index={index}>
                    {/* Retro-Futurist Bloom Backdrop */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400/0 to-cyan-500/0 group-hover:via-cyan-400/20 group-hover:opacity-100 blur-2xl transition-all duration-700 opacity-0 -z-10"></div>
                    
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-[#00ff00]/10 transform translate-x-2 translate-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
                    
                    <div className="relative bg-[#05050a]/95 backdrop-blur-md border border-[#00ff00]/30 p-8 md:p-12 
                        group-hover:border-cyan-400 transition-all duration-500 
                        shadow-[0_0_20px_rgba(0,0,0,0.8)]
                        group-hover:shadow-[0_0_40px_rgba(34,211,238,0.3),_inset_0_0_20px_rgba(34,211,238,0.1)]
                        overflow-hidden">
                        
                        {/* Retro scanline overlay specifically for hovered card */}
                        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] transition-opacity duration-500"></div>

                        {/* Interactive Corner Decor with Glow Points */}
                        <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-[#00ff00]/20 group-hover:border-cyan-400 transition-colors duration-500">
                            <div className="absolute top-[-2px] right-[-2px] w-1.5 h-1.5 bg-[#00ff00] group-hover:bg-cyan-400 shadow-[0_0_8px_currentColor] transition-colors"></div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-[#00ff00]/20 group-hover:border-cyan-400 transition-colors duration-500">
                            <div className="absolute bottom-[-2px] left-[-2px] w-1.5 h-1.5 bg-[#00ff00] group-hover:bg-cyan-400 shadow-[0_0_8px_currentColor] transition-colors"></div>
                        </div>
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 border-b border-white/10 pb-6">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-black italic text-[#00ff00] group-hover:text-cyan-400 transition-colors leading-tight drop-shadow-[0_0_8px_rgba(0,255,0,0.4)] group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                                    {movie.title}
                                </h2>
                                <div className="mt-2 text-xs font-black tracking-[0.3em] text-[#00ff00] opacity-60 group-hover:text-cyan-400 group-hover:opacity-80 uppercase transition-all">{movie.tag}</div>
                            </div>
                            <div className="text-sm font-black bg-white/5 px-4 py-2 text-[#00ff00] border border-[#00ff00]/30 group-hover:text-cyan-400 group-hover:border-cyan-400/50 transition-all shadow-[0_0_10px_rgba(0,255,0,0.15)] group-hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                EST. {movie.year}
                            </div>
                        </div>
                        
                        <motion.p 
                          initial={{ opacity: 0.8 }}
                          whileHover={{ opacity: 1 }}
                          className="text-gray-400 group-hover:text-gray-200 leading-relaxed font-sans text-base md:text-lg transition-colors whitespace-pre-wrap"
                        >
                            {movie.description}
                        </motion.p>
                    </div>
                </TiltCard>
            ))}
        </div>

        {/* Interactive Feature Section */}
        <div className="relative border-t-2 border-white/5 pt-24 mb-20">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              className="mb-16 text-center"
            >
              <h3 className="text-4xl font-black italic text-white tracking-widest uppercase mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-[0_0_10px_rgba(192,38,211,0.3)]">
                  CULTURAL IMPACT
                </span>
              </h3>
              <p className="text-gray-500 font-bold tracking-widest text-xs uppercase">Cameos & Notable Appearances</p>
            </motion.div>
            
            <div className="flex flex-col gap-6">
                {features.map((feature, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02, x: 10 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className={`bg-white/5 p-8 border-l-8 ${feature.color} group hover:bg-white/10 transition-all cursor-crosshair`}
                    >
                        <h4 className="text-white font-black text-xl mb-3 tracking-wide group-hover:text-[#00ff00] transition-colors uppercase italic">{feature.title}</h4>
                        <p className="text-gray-400 group-hover:text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Footer with Subtle Animation */}
        <footer className="mt-32 text-center pb-12 opacity-30 hover:opacity-100 transition-opacity">
            <motion.div 
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="h-px w-24 mx-auto bg-white/20 mb-8"
            ></motion.div>
            <p className="font-black tracking-[0.5em] text-xs">AUTHORIZED ACCESS ONLY</p>
            <p className="mt-4 text-xs font-bold text-[#00ff00]">CREATED BY JOHN MAXTA</p>
        </footer>
      </div>
    </div>
  );
};

export default MoviesPage;
