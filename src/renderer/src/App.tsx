import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Wiki } from './pages/Wiki';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { ThemeProvider } from './components/ThemeContext';
import { AiChatSidebar } from './components/AiChatSidebar';
import { Sparkles, MessageSquare } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion';
import { CommandPalette } from './components/CommandPalette';
import { LoadingScreen } from './components/LoadingScreen';

function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [contextData, setContextData] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleContextUpdate = (e: any) => {
      setContextData(e.detail);
    };
    window.addEventListener('ai-context-update', handleContextUpdate);
    return () => window.removeEventListener('ai-context-update', handleContextUpdate);
  }, []);

  return (
    <ThemeProvider>
      
      {/* 1. LOADING SCREEN OVERLAY */}
      <AnimatePresence mode='wait'>
        {isLoading && (
            <LoadingScreen onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      <Router>
        {/* 2. MAIN APP FADE-IN */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoading ? 0 : 1 }}
            transition={{ duration: 0.8 }}
            className="flex h-screen w-full bg-[#FAFAFA] dark:bg-[#000000] text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-500 selection:bg-blue-500/30"
        >
          
          <CommandPalette />
          <Sidebar />
          
          <main className="flex-1 h-full flex flex-col relative">
            
            {/* Window Drag Handle */}
            <div className="h-8 w-[calc(100%-140px)] z-50 absolute top-0 left-0" style={{ WebkitAppRegion: 'drag' } as any}></div>

            {/* GLOBAL AI FLOATING ACTION BUTTON */}
            <div className="absolute bottom-8 right-8 z-40">
               <motion.button 
                 onHoverStart={() => setIsHovered(true)}
                 onHoverEnd={() => setIsHovered(false)}
                 onClick={() => setChatOpen(true)}
                 layout
                 title="Open AI Agent"
                 initial={{ width: "3.5rem" }} 
                 animate={{ width: isHovered ? "auto" : "3.5rem" }}
                 transition={{ type: "spring", stiffness: 400, damping: 25 }}
                 className="flex items-center justify-center bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_0_30px_rgba(59,130,246,0.3)] rounded-full h-14 overflow-hidden group transition-colors hover:border-blue-500/50"
               >
                 <div className="relative flex items-center justify-center min-w-[3.5rem] h-full">
                    <Sparkles size={24} className="text-gray-600 dark:text-white group-hover:text-blue-500 transition-colors relative z-10" />
                    <div className="absolute inset-0 bg-blue-500/50 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {contextData.length > 50 && (
                        <span className="absolute top-3 right-3 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white dark:border-black z-20"></span>
                    )}
                 </div>

                 {/* Text Reveal */}
                 <motion.div 
                    className="overflow-hidden whitespace-nowrap flex items-center pr-1"
                 >
                    <span className="mr-3 font-semibold text-sm text-gray-700 dark:text-gray-200">
                        Ask Agent
                    </span>
                    
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isHovered ? 'bg-blue-500 text-white' : 'bg-transparent text-transparent'}`}>
                        <MessageSquare size={14} />
                    </div>
                 </motion.div>
                 
               </motion.button>
            </div>

            <AiChatSidebar 
               isOpen={chatOpen} 
               onClose={() => setChatOpen(false)} 
               contextData={contextData} 
            />

            <div className="flex-1 overflow-hidden relative z-0 pt-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/wiki" element={<Wiki />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </main>
        </motion.div>
      </Router>
    </ThemeProvider>
  );
}

export default App;