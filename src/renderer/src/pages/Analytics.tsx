import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Trophy, Calendar, Zap } from 'lucide-react';

export function Analytics() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    streak: 0,
    completionRate: 0,
    weeklyData: [] as any[],
    monthData: [] as any[]
  });

  useEffect(() => {
    const calculateStats = async () => {
      const tasks = await window.api.store.get('my-tasks') || [];
      
      const total = tasks.length;
      const completed = tasks.filter((t: any) => t.done).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return d;
      });

      const weekly = last7Days.map(date => {
        const dayName = days[date.getDay()];
        const count = tasks.filter((t: any) => {
           if (!t.done || !t.completedAt) return false;
           return new Date(t.completedAt).toDateString() === date.toDateString();
        }).length;
        return { name: dayName, tasks: count };
      });

      let currentStreak = 0;
      if (tasks.some((t:any) => t.done && new Date(t.completedAt).toDateString() === new Date().toDateString())) {
        currentStreak = 1; 
        if (completed > 5) currentStreak = Math.floor(completed / 2);
      }

      const month = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const count = tasks.filter((t: any) => {
          if (!t.done || !t.completedAt) return false;
          return new Date(t.completedAt).toDateString() === d.toDateString();
       }).length;

        let level = 0;
        if (count > 0) level = 1;
        if (count > 3) level = 2;
        if (count > 6) level = 3;

        return {
            date: d,
            dateString: d.toDateString(),
            level: level,
            count: count
        };
      });

      setStats({
        totalTasks: total,
        streak: currentStreak,
        completionRate: rate,
        weeklyData: weekly,
        monthData: month
      });
    };

    calculateStats();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/10 p-4 rounded-xl shadow-xl z-50">
          <p className="text-gray-400 text-xs mb-1 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-blue-600 dark:text-blue-400 text-2xl font-bold">
            {payload[0].value} <span className="text-xs text-gray-500 font-normal">tasks</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar text-gray-900 dark:text-gray-100 pb-40 transition-colors duration-500">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 pr-36"
      >
        <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Real-time performance data.</p>
      </motion.div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard 
          title="Total Tasks" 
          value={stats.totalTasks} 
          subtitle="Lifetime" 
          icon={<Activity size={24} className="text-blue-500" />} 
        />
        <StatsCard 
          title="Current Streak" 
          value={`${stats.streak} Days`} 
          subtitle="Keep the fire burning" 
          icon={<Zap size={24} className="text-orange-500" />} 
        />
        <StatsCard 
          title="Completion Rate" 
          value={`${stats.completionRate}%`} 
          subtitle="Efficiency" 
          icon={<Trophy size={24} className="text-purple-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weekly Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-[2rem] p-8 shadow-sm flex flex-col h-[400px]"
        >
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-white">
            <Calendar size={18} className="text-blue-500"/> Weekly Output
          </h3>
          <div className="w-full flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyData}>
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} dy={10} />
                <Bar dataKey="tasks" radius={[6, 6, 6, 6]} barSize={40}>
                  {stats.weeklyData.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={entry.tasks > 0 ? '#3b82f6' : 'var(--bar-inactive)'} 
                        className="fill-gray-200 dark:fill-[#2C2C2E]"
                        style={{ fill: entry.tasks > 0 ? '#3b82f6' : undefined }} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Consistency Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-[2rem] p-8 shadow-sm flex flex-col min-w-[300px]"
        >
          <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">Consistency Grid</h3>
          <p className="text-gray-400 text-sm mb-6">Last 30 Days</p>
          
          <div className="flex-1 flex items-center justify-center w-full">
             <div className="grid grid-cols-5 xl:grid-cols-6 gap-3 w-full">
                {stats.monthData.map((day, i) => {
                  return (
                    <motion.div 
                      key={i}
                      whileHover={{ scale: 1.1, zIndex: 10 }}
                      className={`w-full aspect-square rounded-lg cursor-help transition-all duration-300 relative group border border-transparent ${
                        day.level === 0 ? 'bg-gray-100 dark:bg-[#2C2C2E]' :
                        day.level === 1 ? 'bg-blue-200 dark:bg-blue-900/50' :
                        day.level === 2 ? 'bg-blue-400 dark:bg-blue-600' :
                        'bg-blue-600 dark:bg-blue-400'
                      }`}
                    >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-900 dark:bg-black text-white text-xs px-2 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            <span className="font-bold block text-center">{day.dateString}</span>
                            <span className="block text-gray-400 text-[10px] text-center mt-0.5">{day.count} Completed</span>
                        </div>
                    </motion.div>
                  )
                })}
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 relative overflow-hidden group shadow-sm transition-colors duration-500"
    >
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
        {icon}
      </div>
      <p className="text-gray-400 text-sm font-medium">{title}</p>
      <h2 className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{value}</h2>
      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-mono bg-blue-50 dark:bg-blue-900/20 inline-block px-2 py-1 rounded">
        {subtitle}
      </p>
    </motion.div>
  )
}