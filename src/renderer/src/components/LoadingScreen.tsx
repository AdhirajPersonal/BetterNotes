import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImg from '../assets/ls.png';

const BOOT_SEQUENCE = [
  "SYSTEM_CHECK_INTEGRITY...",
  "LOADING_NEURAL_ENGINE...",
  "DECRYPTING_LOCAL_VAULT...",
  "ESTABLISHING_SECURE_LINK...",
  "WELCOME_USER"
];

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState(BOOT_SEQUENCE[0]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        const increment = Math.random() * (prev > 80 ? 2 : 15);
        return Math.min(prev + increment, 100);
      });
    }, 150);

    let textIdx = 0;
    const textTimer = setInterval(() => {
      textIdx++;
      if (textIdx < BOOT_SEQUENCE.length) {
        setText(BOOT_SEQUENCE[textIdx]);
      }
    }, 600);

    const finishTimer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearInterval(progressTimer);
      clearInterval(textTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
      exit={{ 
        opacity: 0, 
        scale: 1.1, 
        filter: "blur(20px)",
        transition: { duration: 0.8, ease: "easeInOut" } 
      }}
    >
      
      {/* BACKGROUND GLOW (Subtle ambiance) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black pointer-events-none"></div>

      {/* CENTER LOGO */}
      <div className="relative z-10">
         <motion.img 
            src={logoImg} 
            alt="BetterNotes"
            className="w-32 h-32 object-contain"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
                opacity: 1, 
                scale: 1,
                filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"] 
            }}
            transition={{ 
                opacity: { duration: 0.5 },
                scale: { duration: 0.5, type: "spring" },
                filter: { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }}
         />
      </div>

      {/* APP TITLE (Clean & Modern) */}
      <motion.h1 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-2xl font-bold text-white tracking-[0.2em] uppercase font-sans"
      >
        BetterNotes
      </motion.h1>

      {/* TERMINAL STATUS TEXT */}
      <div className="mt-2 h-6 flex items-center justify-center">
        <AnimatePresence mode='wait'>
            <motion.p 
                key={text}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[10px] text-blue-500 font-mono"
            >
                {">"} {text}
            </motion.p>
        </AnimatePresence>
      </div>

      {/* LOADER BAR (Thin & Elegant) */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900">
         <motion.div 
            className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
            style={{ boxShadow: "0 0 20px #3b82f6" }} 
         />
      </div>

    </motion.div>
  );
}