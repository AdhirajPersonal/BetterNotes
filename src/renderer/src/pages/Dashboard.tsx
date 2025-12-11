import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Flame, PenLine, Trash2, MoreHorizontal, CalendarClock } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

const getSmartDate = (isoString: string | number) => {
  const date = new Date(isoString);
  const now = new Date();
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const generateGraphData = (taskList: any[]) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  return last7Days.map(date => {
    const dayName = days[date.getDay()];
    const count = taskList.filter(t => {
      if (!t.done || !t.completedAt) return false;
      const tDate = new Date(t.completedAt);
      return tDate.toDateString() === date.toDateString();
    }).length;
    return { name: dayName, completion: Math.min((count / 5) * 100, 100) };
  });
};

export function Dashboard() {
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [scratchpad, setScratchpad] = useState("");
  const [graphData, setGraphData] = useState<any[]>([]);

  useEffect(() => {
    const handleAiAction = (e: any) => {
      const { tool, value } = e.detail;

      if (tool === 'add_task') {
        const newTaskItem = { 
            id: Date.now(), 
            text: value, 
            done: false, 
            tag: "AI Added", 
            completedAt: null,
            createdAt: Date.now()
        };
        setTasks(prev => [newTaskItem, ...prev]);
      }

      if (tool === 'toggle_task') {
        setTasks(prev => prev.map(t => {
            if (t.text.toLowerCase().includes(value.toLowerCase())) {
                const isNowDone = !t.done;
                return { ...t, done: isNowDone, completedAt: isNowDone ? Date.now() : null };
            }
            return t;
        }));
      }
      
      if (tool === 'delete_task') {
          setTasks(prev => prev.filter(t => !t.text.toLowerCase().includes(value.toLowerCase())));
      }
    };

    window.addEventListener('ai-action', handleAiAction);
    return () => window.removeEventListener('ai-action', handleAiAction);
  }, []);

  useEffect(() => {
    const pendingTasks = tasks.filter(t => !t.done).map(t => `- [ ] ${t.text} (${t.tag})`).join('\n');
    const doneTasks = tasks.filter(t => t.done).map(t => `- [x] ${t.text}`).join('\n');
    
    const contextString = `
      CURRENT PAGE: DASHBOARD
      SCRATCHPAD CONTENT: ${scratchpad}
      
      PENDING TASKS:
      ${pendingTasks}
      
      COMPLETED TASKS:
      ${doneTasks}
    `;
    
    window.dispatchEvent(new CustomEvent('ai-context-update', { detail: contextString }));
  }, [tasks, scratchpad]);

  useEffect(() => {
    const loadData = async () => {
      const savedTasks = await window.api.store.get('my-tasks');
      const loadedTasks = savedTasks || [
        { id: 1, text: "Install BetterNotes", done: true, tag: "System", completedAt: Date.now(), createdAt: Date.now() },
        { id: 2, text: "Test Persistence", done: false, tag: "Test", completedAt: null, createdAt: Date.now() },
      ];
      setTasks(loadedTasks);
      setGraphData(generateGraphData(loadedTasks));

      const savedScratch = await window.api.store.get('my-scratchpad');
      if (savedScratch) setScratchpad(savedScratch);

      setIsLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      window.api.store.set('my-tasks', tasks);
      setGraphData(generateGraphData(tasks));
    }
  }, [tasks, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        window.api.store.set('my-scratchpad', scratchpad);
      }, 1000); 
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [scratchpad, isLoaded]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const isNowDone = !t.done;
        return { 
          ...t, 
          done: isNowDone,
          completedAt: isNowDone ? Date.now() : null 
        };
      }
      return t;
    }));
  };

  const addTask = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTask.trim()) {
      const task = { 
        id: Date.now(), 
        text: newTask, 
        done: false, 
        tag: "General", 
        completedAt: null,
        createdAt: Date.now()
      };
      setTasks([task, ...tasks]);
      setNewTask("");
      setIsAdding(false);
    }
  };

  const deleteTask = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setTasks(tasks.filter(t => t.id !== id));
  };

  const completedCount = tasks.filter(t => t.done).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  
  const hasTaskToday = tasks.some(t => t.done && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString());
  const streak = hasTaskToday ? 4 : 3;

  return (
    <div className="p-10 h-full overflow-hidden flex flex-col text-gray-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-shrink-0 justify-between items-end mb-8 pr-36"
      >
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">System status: <span className="text-emerald-500">Online</span></p>
        </div>
        <div className="flex gap-8 items-end">
          <div className="text-right hidden sm:block">
             <div className="text-orange-500 dark:text-orange-400 font-bold flex items-center justify-end gap-2 mb-1">
                <Flame size={20} className="fill-orange-500 dark:fill-orange-400"/> {streak} Day Streak
             </div>
             <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-widest font-semibold">Consistency</p>
          </div>
          <div className="text-right">
            <motion.p 
              key={progress}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="text-5xl font-bold text-blue-600 dark:text-blue-400"
            >
              {Math.round(progress)}%
            </motion.p>
            <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-widest font-semibold">Daily Goal</p>
          </div>
        </div>
      </motion.header>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 pb-2">
        
        {/* LEFT COLUMN: TASKS */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-7 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-[2rem] p-8 flex flex-col shadow-sm relative overflow-hidden transition-colors duration-500"
        >
          <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Protocol</h3>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAdding(!isAdding)}
              className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${isAdding ? 'bg-gray-200 dark:bg-gray-700 text-gray-600' : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'}`}
            >
              <Plus size={22} className={isAdding ? 'rotate-45 transition-transform' : ''}/>
            </motion.button>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Input new directive..."
                  className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-4 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 transition-all"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={addTask}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3 overflow-y-auto pr-2 flex-1 custom-scrollbar">
            <AnimatePresence mode='popLayout'>
                {tasks.map((task) => {
                  const dateDisplay = getSmartDate(task.createdAt || task.id);
                  const isOverdue = dateDisplay === "Yesterday" && !task.done;
                  
                  return (
                    <motion.div 
                        layout
                        key={task.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => toggleTask(task.id)}
                        className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-colors duration-200 group ${
                        task.done 
                            ? 'bg-gray-50 dark:bg-white/5 border-transparent opacity-50' 
                            : 'bg-white dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-md'
                        }`}
                    >
                        <div className="flex items-center gap-5 overflow-hidden">
                        <div className={`h-6 w-6 min-w-[24px] rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                            task.done ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-500'
                        }`}>
                            {task.done && <Check size={14} className="text-white stroke-[3px]" />}
                        </div>
                        <span className={`text-lg truncate font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                            {task.text}
                        </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${
                                isOverdue 
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' 
                                : 'bg-gray-100 dark:bg-black/30 text-gray-400'
                            }`}>
                                <CalendarClock size={12}/>
                                {dateDisplay}
                            </div>

                            <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-black/30 rounded-lg text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
                                {task.tag}
                            </span>
                            <button 
                                onClick={(e) => deleteTask(e, task.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
            
            {tasks.length === 0 && (
               <div className="text-center text-gray-400 mt-10">No active tasks. Time to relax?</div>
            )}
          </div>
        </motion.div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-5 flex flex-col gap-8 min-h-0">
          
          {/* GRAPH CARD */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm relative overflow-hidden flex flex-col min-h-[300px] transition-colors duration-500"
          >
             <div className="flex justify-between items-center mb-4 z-10">
               <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Productivity Wave</h3>
             </div>
             <div className="w-full flex-1 h-full min-h-[200px]">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={graphData}>
                   <defs>
                     <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Tooltip 
                     cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                     contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                     itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                   />
                   <Area 
                    type="monotone" 
                    dataKey="completion" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorFlow)" 
                   />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </motion.div>

          {/* SCRATCHPAD */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col min-h-[200px] group focus-within:ring-2 ring-blue-500/20 transition-all duration-500"
          >
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-sm font-bold text-gray-700 dark:text-gray-400 flex items-center gap-2 group-focus-within:text-blue-500 transition-colors">
                 <PenLine size={16}/> Scratchpad
               </h3>
               <MoreHorizontal size={16} className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-white transition"/>
            </div>
            <textarea 
              value={scratchpad}
              onChange={(e) => setScratchpad(e.target.value)}
              className="w-full h-full bg-transparent resize-none outline-none text-gray-600 dark:text-gray-300 placeholder:text-gray-300 dark:placeholder:text-gray-700 text-base leading-relaxed no-scrollbar"
              placeholder="Dump your thoughts here..."
            />
          </motion.div>

        </div>
      </div>
    </div>
  );
}