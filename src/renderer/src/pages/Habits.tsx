import { motion } from 'framer-motion';

export function Habits() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-8 text-white"
    >
      <h1 className="text-3xl font-bold mb-4">Habit Tracker</h1>
      <div className="p-10 border border-slate-800 border-dashed rounded-xl flex items-center justify-center text-slate-500">
        Work in progress...
      </div>
    </motion.div>
  )
}