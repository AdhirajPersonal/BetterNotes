import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User, Sparkles, Loader2, Eraser, Zap } from 'lucide-react';
import { aiChat } from '../services/groq';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: string;
}

export function AiChatSidebar({ isOpen, onClose, contextData }: ChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: 'assistant', content: "I'm connected to your notes and dashboard. Ask me to add tasks or summarize notes!" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const fullResponse = await aiChat([...messages, userMsg], contextData);
      
      const actionRegex = /:::([\s\S]*?):::/;
      const match = fullResponse.match(actionRegex);
      
      let cleanResponse = fullResponse;
      let actionCount = 0;

      if (match) {
        try {
            const rawJson = match[1];
            const parsedData = JSON.parse(rawJson);
            
            const actions = parsedData.actions || (parsedData.tool ? [parsedData] : []);

            actions.forEach((action: any, index: number) => {
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('ai-action', { detail: action }));
                }, index * 100);
            });

            actionCount = actions.length;
            
            cleanResponse = fullResponse.replace(actionRegex, '').trim();
        } catch (e) {
            console.error("Failed to execute AI Actions", e);
        }
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
      
      if(actionCount > 0) {
          console.log(`⚡ Executed ${actionCount} AI actions.`);
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Error: Check API Key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.2 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[60]"
          />

          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-[450px] bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl border-l border-gray-200 dark:border-white/10 z-[70] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 pt-14 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20">
               <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Bot size={24} />
                  <span className="font-bold text-lg">BetterNotes AI</span>
                  <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px] font-bold text-blue-600 dark:text-blue-300 flex items-center gap-1">
                    <Zap size={10} fill="currentColor"/> AGENT ACTIVE
                  </div>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => setMessages([{ role: 'assistant', content: "Memory cleared." }])} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500" title="Clear Chat">
                    <Eraser size={20}/>
                 </button>
                 <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500">
                    <X size={20}/>
                 </button>
               </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
               {messages.map((msg, i) => (
                 <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
                        {msg.role === 'user' ? <User size={16}/> : <Sparkles size={16}/>}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm max-w-[85%] shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-gray-100 dark:bg-[#1C1C1E] text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-white/5'
                    }`}>
                        <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                 </div>
               ))}
               
               {isLoading && (
                 <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-white"/></div>
                    <div className="p-4 rounded-2xl bg-gray-100 dark:bg-[#1C1C1E] text-gray-400 text-xs italic flex items-center border border-gray-200 dark:border-white/5">
                        Thinking & Acting...
                    </div>
                 </div>
               )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md">
               <div className="relative">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type 'Add task to buy milk'..." 
                    className="w-full bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-2xl pl-5 pr-14 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm text-gray-900 dark:text-white shadow-lg"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                  >
                    <Send size={18}/>
                  </button>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}