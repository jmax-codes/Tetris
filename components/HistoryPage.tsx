
import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const HistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Parallax transforms for Hero
    const heroY = useTransform(smoothProgress, [0, 0.1], [0, -100]);
    const heroOpacity = useTransform(smoothProgress, [0, 0.08], [1, 0]);
    const heroScale = useTransform(smoothProgress, [0, 0.08], [1, 0.8]);

    return (
        <div ref={containerRef} className="bg-black text-white font-mono selection:bg-[#00ff00] selection:text-black overflow-x-hidden">
            {/* Background Architecture */}
            <div className="fixed inset-0 crt-scanline pointer-events-none z-50 opacity-20"></div>
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(0,255,0,0.05)_0%,_transparent_80%)]"></div>
            
            {/* Back Button */}
            <button 
                onClick={() => navigate('/')}
                className="fixed top-8 left-8 z-[100] group flex items-center gap-4 bg-black/50 backdrop-blur-xl px-6 py-3 border border-[#00ff00]/30 hover:border-[#00ff00] transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] rounded-sm"
            >
                <span className="text-[#00ff00] text-xl font-bold group-hover:-translate-x-1 transition-transform">←</span>
                <span className="text-white font-black tracking-[0.2em] text-xs uppercase group-hover:text-[#00ff00]">RETURN</span>
            </button>

            {/* PROGRESS BAR */}
            <motion.div 
                className="fixed top-0 left-0 right-0 h-1 bg-[#00ff00] z-[100] origin-left shadow-[0_0_10px_#00ff00]"
                style={{ scaleX: smoothProgress }}
            />

            {/* PARALLAX BACKGROUND BLOCKS */}
            <BackgroundBlocks progress={smoothProgress} />

            {/* HERO SECTION */}
            <section className="relative h-screen flex flex-col items-center justify-center text-center p-6 overflow-hidden">
                <motion.div 
                    style={{ y: heroY, opacity: heroOpacity, scale: heroScale, perspective: 1000 }}
                    className="relative z-10"
                >
                    <motion.div
                        initial={{ opacity: 0, rotateX: 45, y: 50 }}
                        animate={{ opacity: 1, rotateX: 0, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <h1 className="text-[12vh] md:text-[18vh] font-black italic tracking-tighter leading-none transform -skew-x-12 relative">
                            <span className="absolute inset-0 text-[#00ff00] translate-x-2 translate-y-2 blur-sm opacity-50">TETRIS</span>
                            <span className="absolute inset-0 text-cyan-400 -translate-x-2 -translate-y-2 blur-sm opacity-50">TETRIS</span>
                            <span className="relative drop-shadow-[0_0_20px_white]">TETRIS</span>
                        </h1>
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="mt-8 text-[2vh] md:text-[3vh] font-bold tracking-[0.5em] text-cyan-400 uppercase"
                    >
                        A Comprehensive History
                    </motion.div>
                </motion.div>
            </section>

            {/* 1. THE GENESIS (1984-1985) */}
            <HistorySection 
                id="genesis"
                title="The Genesis (1984–1985)"
                subtitle="The Creator and the Inspiration"
                content="In June 1984, Alexey Pajitnov, a computer programmer at the Dorodnitsyn Computing Centre of the Soviet Academy of Sciences in Moscow, sought to recreate a childhood puzzle game called Pentominoes. Pentominoes involves fitting shapes made of five squares into a box. However, Pajitnov found twelve shapes too complex for a computer game and simplified them into Tetrominoes—shapes made of four squares."
                image="/alexey_pajitnov_retro.png"
                side="left"
            />

            {/* 2. TECHNICAL CONSTRAINTS */}
            <HistorySection 
                id="technical"
                title="Technical Constraints"
                subtitle="The First Version"
                content="Pajitnov was working on an Electronika 60, a Soviet clone of the PDP-11. The machine had no graphical capabilities, so the first version of Tetris used text characters (brackets []) to represent the blocks."
                listItems={[
                    { label: "The Name", value: "Pajitnov combined 'Tetra' (Greek for four) with 'Tennis' (his favorite sport) to create the name Tetris." },
                    { label: "The Gameplay", value: "He realized that if the screen filled up, the game ended too quickly. He implemented the 'line clear' mechanic, where a full horizontal row would disappear, allowing the game to continue indefinitely." }
                ]}
                image="/elektronika_60_tetris.png"
                side="right"
                borderColor="border-cyan-400/40"
            />

            {/* 3. IBM PC PORT */}
            <HistorySection 
                id="ibm-pc"
                title="The IBM PC Port"
                content="Recognizing the game's addictive potential, Pajitnov wanted to port it to the more popular IBM PC. He enlisted the help of Vadim Gerasimov, a 16-year-old prodigy, and Dmitry Pavlovsky. Gerasimov added color, a scoring system, and optimized the code. This version began to spread rapidly across Moscow via floppy disks."
                image="/ussr_tetris_player.png"
                side="left"
            />

            {/* 4. LICENSING CHAOS */}
            <HistorySection 
                id="licensing"
                title="The Licensing Chaos (1986–1988)"
                subtitle="The Hungarian Connection"
                content="In 1986, Robert Stein, the owner of London-based Andromeda Software, saw Tetris at the Institute of Computer Science in Hungary. He immediately saw its potential and contacted Pajitnov via telex. Due to the Soviet system, Pajitnov could not personally sell the rights; they belonged to the state."
                image="/licensing_chaos_stein.png"
                side="right"
            />

            {/* 5. THE MISUNDERSTANDING */}
            <HistorySection 
                id="misunderstanding"
                title="The Misunderstanding"
                content="Stein began negotiating with ELORG (Elektronorgtechnica), the Soviet agency responsible for software exports. Believing he had a deal, Stein sold the rights to Mirrorsoft (UK) and Spectrum HoloByte (US), both owned by media mogul Robert Maxwell. However, Stein had not yet signed a formal contract with the Soviets."
                subtitle="First Western Releases"
                side="left"
                image="/mirrorsoft_maxwells.png"
                listItems={[
                    { label: "1987", value: "Spectrum HoloByte released Tetris for the PC in the US. It featured 'Soviet-themed' graphics (St. Basil's Cathedral, cosmonauts) to capitalize on the game's mysterious origins. It was a massive hit, but the legal foundation was shaky." }
                ]}
            />

            {/* 6. THE 1989 MOSCOW SHOWDOWN */}
            <HistorySection 
                id="showdown"
                title="The 1989 Moscow Showdown"
                content="The year 1989 saw three different parties converge on Moscow, each claiming or seeking the rights to Tetris: Robert Stein, Kevin Maxwell (Mirrorsoft), and Henk Rogers (Bullet-Proof Software) working with Nintendo."
                image="/moscow_showdown_trio.png"
                side="right"
            />

            {/* 7. THE NEGOTIATIONS & MASTERSTROKE */}
            <HistorySection 
                id="negotiations"
                title="The Negotiations"
                subtitle="The Masterstroke"
                content="Henk Rogers bypassed the usual channels and went directly to ELORG. He befriended Pajitnov, which gave him a significant advantage. During the negotiations, ELORG officials revealed that they had never granted Robert Stein the rights for video game consoles or handheld devices—only for 'personal computers.' Rogers secured the handheld rights for Nintendo, which was preparing to launch the Game Boy."
                image="/henk_rogers_alexey_meeting.png"
                side="left"
                borderColor="border-cyan-400/40"
            />

            {/* 8. LEGAL BATTLE: NINTENDO VS ATARI */}
            <HistorySection 
                id="legal-battle"
                title="Nintendo vs. Atari (1989–1990)"
                subtitle="Tengen's Tetris"
                content="Atari, through its subsidiary Tengen, had released an NES version of Tetris many considered superior. Nintendo sued. The case hinged on the definition of a 'computer.' Atari argued consoles were computers; the judge disagreed, ruling in favor of Nintendo. Tengen was forced to destroy hundreds of thousands of cartridges, making 'Tengen Tetris' a rare collector's item."
                image="/nintendo_vs_atari.png"
                side="right"
                borderColor="border-red-500/40"
            />

            {/* 9. GAME BOY PHENOMENON */}
            <HistorySection 
                id="gameboy"
                title="The Game Boy Phenomenon"
                content="Nintendo made the strategic decision to bundle Tetris with every Game Boy sold. This was a masterstroke; while Mario appealed to children, Tetris appealed to everyone."
                image="/gameboy_tetris.png"
                listItems={[
                    { label: "Sales", value: "The Game Boy version sold over 35 million copies." },
                    { label: "The Tetris Effect", value: "Scientific studies began to document the 'Tetris Effect,' where players see falling blocks in their dreams after playing for long periods." }
                ]}
                side="left"
            />

            {/* 10. THE TETRIS COMPANY (1996-PRESENT) */}
            <HistorySection 
                id="ttc"
                title="The Tetris Company (1996–Present)"
                subtitle="Rights Return to Pajitnov"
                content="In 1996, the original 10-year agreement with ELORG expired. Henk Rogers helped Pajitnov regain his rights. Together, they founded The Tetris Company in 1996, introducing the Tetris Guideline to ensure consistency across all versions."
                image="/tetris_company_alexey.png"
                listItems={[
                    { label: "Standardization", value: "The Guideline mandated specific colors (I is cyan, O is yellow), the 'Hold' mechanic, and the Super Rotation System (SRS)." }
                ]}
                side="right"
            />

            {/* 11. MODERN ITERATIONS */}
            <HistorySection 
                id="modern"
                title="Modern Iterations"
                content="Tetris has continued to evolve: 'Tetris Effect' (2018) blends music and visual landscapes; 'Tetris 99' (2019) introduced Battle Royale; and 'The Movie' (2023) starring Taron Egerton dramatized the 1989 battle."
                side="left"
                borderColor="border-cyan-400/40"
            />

            {/* 12. COMPETITIVE TETRIS */}
            <HistorySection 
                id="competitive"
                title="Competitive Tetris & Cultural Legacy"
                content="Starting in 2010, the Classic Tetris World Championship brought the world's best to compete on original NES Tetris, leading to advanced techniques like Hypertapping and Rolling."
                subtitle="The Classic Tetris World Championship"
                image="/ctwc_championship.png"
                listItems={[
                    { label: "DAS", value: "Delayed Auto Shift: the standard movement mode." },
                    { label: "Hypertapping", value: "Rapidly tapping the D-pad to move pieces faster." },
                    { label: "Rolling", value: "A 2021 technique tapping the bottom of the controller for speeds over 20 button presses per second." }
                ]}
                side="right"
            />

            {/* FINAL SECTION */}
            <section className="h-screen flex flex-col items-center justify-center text-center p-6 relative">
                <motion.div 
                    initial={{ opacity: 0, y: 100 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <h2 className="text-4xl md:text-6xl font-black italic tracking-widest text-[#00ff00]">ENDLESS POSSIBILITIES</h2>
                    <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto uppercase tracking-[0.3em]">
                        Created by Pajitnov. <br/> Brought to the world by Rogers. <br/> Played by you.
                    </p>
                </motion.div>

                <div className="mt-20">
                     <button 
                        onClick={() => navigate('/')}
                        className="px-12 py-4 border-2 border-[#00ff00] text-[#00ff00] font-black text-2xl uppercase tracking-[0.5em] hover:bg-[#00ff00] hover:text-black transition-all shadow-[0_0_40px_rgba(0,255,0,0.3)] hover:shadow-[0_0_60px_rgba(0,255,0,0.6)]"
                     >
                        PLAY AGAIN
                     </button>
                </div>

                <div className="absolute bottom-10 left-0 w-full text-center text-gray-700 text-xs tracking-widest">
                    CREATED BY JOHN MAXTA | DATA SOURCE: THE TETRIS COMPANY & ELORG
                </div>
            </section>
        </div>
    );
};

const HistorySection: React.FC<{
    id: string;
    title: string;
    subtitle?: string;
    content: string;
    listItems?: { label: string; value: string }[];
    image?: string;
    side: 'left' | 'right';
    borderColor?: string;
}> = ({ id, title, subtitle, content, listItems, image, side, borderColor = "border-[#00ff00]/40" }) => {
    
    // Parser for highlighting important keywords and fun facts
    const parseContent = (text: string) => {
        const keywords = [
            "Pentominoes", "Tetrominoes", "four squares", "Electronika 60", "brackets []", 
            "line clear", "Vadim Gerasimov", "floppy disks", "Robert Stein", "telex", 
            "ELORG", "Mirrorsoft", "Spectrum HoloByte", "Robert Maxwell", "Henk Rogers", 
            "handheld rights", "Game Boy", "Tengen", "collector's item", "35 million copies", 
            "Tetris Effect", "The Tetris Company", "Tetris Guideline", "Tetris 99", "Hypertapping", "Rolling"
        ];

        let result: (string | JSX.Element)[] = [text];

        keywords.forEach(keyword => {
            const newResult: (string | JSX.Element)[] = [];
            result.forEach(item => {
                if (typeof item === 'string') {
                    const parts = item.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                    parts.forEach((part, i) => {
                        if (part.toLowerCase() === keyword.toLowerCase()) {
                            newResult.push(
                                <span key={`${keyword}-${i}`} className={`font-black tracking-wide px-1 mx-0.5 relative group inline-block`}>
                                    <span className={`absolute inset-0 ${side === 'left' ? 'bg-[#00ff00]' : 'bg-cyan-400'} opacity-10 group-hover:opacity-20 transition-opacity rounded-sm`}></span>
                                    <span className={`${side === 'left' ? 'text-[#00ff00]' : 'text-cyan-400'} drop-shadow-[0_0_8px_currentColor]`}>{part}</span>
                                </span>
                            );
                        } else if (part !== '') {
                            newResult.push(part);
                        }
                    });
                } else {
                    newResult.push(item);
                }
            });
            result = newResult;
        });

        return result;
    };

    return (
        <section className={`min-h-[85vh] py-32 px-6 md:px-24 flex flex-col ${side === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'} items-center justify-center gap-16 md:gap-32 max-w-7xl mx-auto overflow-hidden`}>
            {/* Text Side */}
            <div className="flex-1 space-y-10 z-10 w-full">
                <motion.div
                    initial={{ x: side === 'left' ? -100 : 100, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative"
                >
                    {/* Retro Marker */}
                    <div className={`absolute -left-8 top-0 w-1 h-full ${side === 'left' ? 'bg-[#00ff00]' : 'bg-cyan-400'} opacity-30`}></div>
                    
                    <h2 className={`text-4xl md:text-6xl font-black italic leading-[1.1] transform ${side === 'left' ? '-skew-x-6' : 'skew-x-6'} ${side === 'left' ? 'text-[#00ff00]' : 'text-cyan-400'} drop-shadow-[0_0_15px_currentColor]`}>
                        {title}
                    </h2>
                    {subtitle && (
                         <div className="mt-4 text-sm md:text-base font-black tracking-[0.4em] text-white/50 uppercase border-b border-white/10 pb-2 inline-block">
                             {subtitle}
                         </div>
                    )}
                </motion.div>
                
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="space-y-10"
                >
                    <p className="text-lg md:text-xl leading-relaxed text-gray-300 font-sans font-medium text-justify md:text-left">
                        {parseContent(content)}
                    </p>

                    {listItems && (
                        <div className="grid gap-6 pt-6 relative">
                            {/* Background Texture for List */}
                            <div className="absolute inset-x-[-2rem] inset-y-[-1rem] bg-white/[0.02] -z-10 rounded-lg border border-white/5"></div>
                            
                            {listItems.map((item, idx) => (
                                <div key={idx} className="flex flex-col md:flex-row items-start gap-2 md:gap-8 group">
                                    <div className="flex items-center gap-3 md:w-40 flex-shrink-0">
                                        <div className={`w-2 h-2 rotate-45 ${side === 'left' ? 'bg-[#00ff00]' : 'bg-cyan-400'} shadow-[0_0_8px_currentColor]`}></div>
                                        <span className={`font-black uppercase tracking-widest text-[10px] md:text-xs ${side === 'left' ? 'text-[#00ff00]' : 'text-cyan-400'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    <span className="text-gray-400 font-sans text-sm md:text-base leading-relaxed border-l-2 md:border-l-0 border-white/10 pl-4 md:pl-0 group-hover:text-white transition-colors">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Visual Side */}
            <div className={`flex-1 flex justify-center items-center w-full ${image ? '' : 'min-h-[300px]'}`}>
                {image ? (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0, rotateY: side === 'left' ? 30 : -30 }}
                        whileInView={{ scale: 1, opacity: 1, rotateY: 0 }}
                        transition={{ type: "spring", damping: 15 }}
                        className={`relative group w-full ${id === 'gameboy' ? 'max-w-[280px] md:max-w-[380px]' : 'max-w-xl'}`}
                    >
                        {/* Glow and Aura */}
                        <div className={`absolute -inset-8 bg-gradient-to-r ${side === 'left' ? 'from-[#00ff00]/20 to-cyan-400/20' : 'from-cyan-400/20 to-[#00ff00]/20'} blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000`}></div>
                        
                        <div className={`relative ${id === 'gameboy' ? '' : `border-4 ${borderColor} p-2 bg-black shadow-[20px_20px_60px_-15px_rgba(0,0,0,0.5)]`} overflow-hidden transform perspective-1000 hover:scale-[1.02] transition-transform duration-500`}>
                            {/* Scanline overlay for images */}
                            <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none z-10"></div>
                            
                            <img 
                                src={image} 
                                alt={title} 
                                className={`w-full h-auto object-contain transition-all duration-700 ${(image.includes('alexey') || image.includes('tetris_company') || id === 'licensing' || id === 'misunderstanding' || id === 'showdown') ? 'grayscale group-hover:grayscale-0 brightness-75 group-hover:brightness-110' : 'brightness-90 group-hover:brightness-110'}`} 
                            />
                        </div>

                        {/* Coordinate labels for retro feel */}
                        <div className="absolute -top-4 -right-4 text-[8px] text-white/20 font-mono tracking-tighter">
                            SEC_{id.toUpperCase().slice(0, 4)} // {side.toUpperCase()}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        className="w-full flex justify-center items-center pointer-events-none select-none relative"
                    >
                        {id === 'modern' ? (
                            <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center">
                                {/* Cyberpunk Glow Layers */}
                                <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] animate-pulse"></div>
                                <div className="absolute inset-0 bg-purple-500/5 blur-[120px]"></div>
                                
                                <svg viewBox="0 0 100 100" className="w-full h-full scale-125">
                                    <defs>
                                        <pattern id="grid-large" width="20" height="20" patternUnits="userSpaceOnUse">
                                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(34,211,238,0.05)" strokeWidth="0.5"/>
                                        </pattern>
                                    </defs>
                                    <rect width="100" height="100" fill="url(#grid-large)" />

                                    <g className="drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                                        <rect x="30" y="30" width="12" height="12" fill="#22d3ee" rx="1" />
                                        <rect x="44" y="30" width="12" height="12" fill="#22d3ee" rx="1" />
                                        <rect x="58" y="30" width="12" height="12" fill="#22d3ee" rx="1" />
                                        <rect x="44" y="44" width="12" height="12" fill="#22d3ee" rx="1" />
                                    </g>

                                    <g className="drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
                                        <rect x="15" y="55" width="12" height="12" fill="#a855f7" rx="1" />
                                        <rect x="15" y="69" width="12" height="12" fill="#a855f7" rx="1" />
                                        <rect x="29" y="69" width="12" height="12" fill="#a855f7" rx="1" />
                                        <rect x="43" y="69" width="12" height="12" fill="#a855f7" rx="1" />
                                    </g>

                                    <g className="drop-shadow-[0_0_15px_rgba(0,255,0,0.8)]">
                                        <motion.g
                                            animate={{ y: [0, -10, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <rect x="75" y="20" width="12" height="12" fill="#00ff00" rx="1" />
                                            <rect x="75" y="34" width="12" height="12" fill="#00ff00" rx="1" />
                                            <rect x="75" y="48" width="12" height="12" fill="#00ff00" rx="1" />
                                            <rect x="75" y="62" width="12" height="12" fill="#00ff00" rx="1" />
                                        </motion.g>
                                    </g>

                                    <circle cx="10" cy="10" r="1.5" fill="#22d3ee" className="animate-ping" />
                                    <rect x="85" y="85" width="10" height="2" fill="#22d3ee" opacity="0.5" />
                                    <rect x="85" y="89" width="6" height="2" fill="#22d3ee" opacity="0.3" />
                                </svg>
                            </div>
                        ) : (
                            <span className={`text-[30vh] md:text-[50vh] font-black opacity-10 ${side === 'left' ? 'text-cyan-400' : 'text-[#00ff00]'} select-none blur-[2px]`}>
                                []
                            </span>
                        )}
                    </motion.div>
                )}
            </div>
        </section>
    );
};

const BackgroundBlocks: React.FC<{ progress: any }> = ({ progress }) => {
    // Exactly 7 unique pieces (I, J, L, O, S, T, Z) 
    // Pulling blocks closer (Z range -150 to 150) to ensure high visibility
    const blocks = [
        { type: 'I', x: '10%', yOffset: 5,  z: 100,  scale: 1.4, rotate: 45 }, 
        { type: 'J', x: '85%', yOffset: 15, z: -80,  scale: 0.9, rotate: -20 }, 
        { type: 'L', x: '22%', yOffset: 40, z: -50,  scale: 1.0, rotate: 15 }, 
        { type: 'O', x: '72%', yOffset: 65, z: 120,  scale: 1.3, rotate: 30 }, 
        { type: 'S', x: '42%', yOffset: 32, z: -120, scale: 0.85, rotate: -15 }, 
        { type: 'T', x: '15%', yOffset: 78, z: 20,   scale: 1.1, rotate: 60 }, 
        { type: 'Z', x: '90%', yOffset: 55, z: -100, scale: 0.95, rotate: 10 }, 
    ];

    // Increased global visibility
    const globalOpacity = useTransform(progress, [0, 0.92, 0.94], [0.35, 0.35, 0]);

    return (
        <motion.div 
            style={{ opacity: globalOpacity, perspective: '1000px' }} 
            className="fixed inset-0 pointer-events-none overflow-hidden z-0"
        >
            {blocks.map((block, i) => (
                <ParallaxBlock key={i} block={block} progress={progress} />
            ))}
        </motion.div>
    );
};

const ParallaxBlock: React.FC<{ block: any, progress: any }> = ({ block, progress }) => {
    // 3D Parallax: Speed is proportional to scale/distance
    // By using 'fixed' parent and translating y, they "fall" as you scroll
    const y = useTransform(progress, [0, 1], [`${block.yOffset}vh`, `${block.yOffset + 40}vh`]);
    const rotate = useTransform(progress, [0, 1], [block.rotate, block.rotate + 180]);
    
    // Era Transitions
    const era1 = useTransform(progress, [0, 0.55, 0.61], [1, 1, 0]);
    const era2 = useTransform(progress, [0.55, 0.61, 0.82, 0.88], [0, 1, 1, 0]);
    const era3 = useTransform(progress, [0.82, 0.88], [0, 1]);

    const getLayout = (type: string) => {
        switch(type) {
            case 'I': return [[0,0], [1,0], [2,0], [3,0]];
            case 'J': return [[0,0], [0,1], [1,1], [2,1]];
            case 'L': return [[2,0], [0,1], [1,1], [2,1]];
            case 'O': return [[0,0], [1,0], [0,1], [1,1]];
            case 'S': return [[1,0], [2,0], [0,1], [1,1]];
            case 'T': return [[1,0], [0,1], [1,1], [2,1]];
            case 'Z': return [[0,0], [1,0], [1,1], [2,1]];
            default: return [[0,0], [1,0], [0,1], [1,1]];
        }
    };

    const getEra2Color = (type: string) => {
        switch(type) {
            case 'I': return 'bg-red-600';
            case 'J': return 'bg-white';
            case 'L': return 'bg-purple-600';
            case 'O': return 'bg-blue-600';
            case 'S': return 'bg-green-600';
            case 'T': return 'bg-yellow-500';
            case 'Z': return 'bg-cyan-500';
            default: return 'bg-gray-500';
        }
    };

    const getEra3Color = (type: string) => {
        switch(type) {
            case 'I': return '#ff00ff';
            case 'J': return '#00ffff';
            case 'L': return '#ff6600';
            case 'O': return '#ffff00';
            case 'S': return '#33ff00';
            case 'T': return '#9900ff';
            case 'Z': return '#0066ff';
            default: return '#00ff00';
        }
    };

    const layout = getLayout(block.type);

    return (
        <motion.div
            style={{ 
                left: block.x, 
                y, 
                rotateZ: rotate,
                scale: block.scale,
                translateZ: `${block.z}px`,
                // Farther blocks are more blurred
                filter: `blur(${Math.abs(block.z) / 100}px)`,
                opacity: 1 - Math.abs(block.z) / 1000
            }}
            className="absolute whitespace-pre font-mono leading-none"
        >
            {/* ERA 1: SOVIET */}
            <motion.div style={{ opacity: era1 }} className="text-[#00ff00] text-xl font-black blur-[0.1px] drop-shadow-[0_0_8px_rgba(0,255,0,0.6)] relative w-24 h-24">
                {layout.map(([cx, cy], idx) => (
                    <span key={idx} className="absolute" style={{ left: `${cx * 1.5}rem`, top: `${cy * 1.5}rem`, fontSize: '1.2rem' }}>[]</span>
                ))}
            </motion.div>

            {/* ERA 2: CLASSIC */}
            <motion.div style={{ opacity: era2 }} className="absolute inset-0 w-24 h-24">
                {layout.map(([cx, cy], idx) => (
                    <div key={idx} className={`absolute w-6 h-6 ${getEra2Color(block.type)} border border-white/40 shadow-[3px_3px_0_rgba(0,0,0,0.5)]`} style={{ left: cx * 24, top: cy * 24 }}>
                        <div className="absolute top-0.5 left-0.5 right-1 bottom-1 border-t border-l border-white/30"></div>
                    </div>
                ))}
            </motion.div>

            {/* ERA 3: MODERN */}
            <motion.div style={{ opacity: era3 }} className="absolute inset-0 w-24 h-24">
                {layout.map(([cx, cy], idx) => (
                    <div key={idx} className="absolute w-6 h-6 border-2" style={{ 
                        left: cx * 24, 
                        top: cy * 24,
                        backgroundColor: `${getEra3Color(block.type)}55`,
                        borderColor: getEra3Color(block.type),
                        boxShadow: `0 0 12px ${getEra3Color(block.type)}`
                    }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
                    </div>
                ))}
            </motion.div>
        </motion.div>
    );
};

export default HistoryPage;
