import { LayoutGrid, BookOpen, BarChart3, Settings, Moon, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png'; 

export function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState("User");

  useEffect(() => {
    const loadUser = async () => {
      const name = await window.api.store.get('user-name');
      if (name) setUsername(name);
    };
    loadUser();
  }, []);

  const menuItems = [
    { icon: LayoutGrid, label: 'Mission Control', path: '/' },
    { icon: BookOpen, label: 'Wiki & Notes', path: '/wiki' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <aside className="w-[280px] h-full bg-white dark:bg-[#050505] border-r border-gray-100 dark:border-white/5 flex flex-col p-6 transition-colors duration-500 z-50">
      
      {/* BRANDING AREA */}
      <div className="flex items-center gap-3 mb-10 px-2">
        {/* Replaced generic B with Logo */}
        <img 
            src={logoImg} 
            alt="Logo" 
            className="h-9 w-9 rounded-lg shadow-md object-contain bg-black" 
        />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">BetterNotes</h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="block group">
              <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-blue-50 dark:bg-white/10 text-[#3b82f6] dark:text-white font-medium' 
                  : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-300'
              }`}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User & Settings Section */}
      <div className="space-y-2 pt-6 border-t border-gray-100 dark:border-white/5">
        
        {/* User Profile */}
        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-gray-50 dark:bg-white/5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {username.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{username}</p>
                <p className="text-xs text-gray-500 truncate">Free Plan</p>
            </div>
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300"
        >
          <span className="text-sm font-medium">Theme</span>
          <div className={`relative w-10 h-5 bg-gray-200 dark:bg-black rounded-full p-0.5 flex items-center shadow-inner ${theme === 'dark' ? 'justify-end' : 'justify-start'}`}>
             <motion.div 
               layout 
               transition={{ type: "spring", stiffness: 700, damping: 30 }}
               className="h-4 w-4 rounded-full shadow-sm flex items-center justify-center bg-white dark:bg-gray-700"
             >
                {theme === 'light' ? <Sun size={10} className="text-orange-400"/> : <Moon size={10} className="text-white"/>}
             </motion.div>
          </div>
        </button>

        {/* Settings Link */}
        <Link to="/settings" className="block">
            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                location.pathname === '/settings' 
                ? 'text-blue-600 dark:text-white bg-blue-50 dark:bg-white/10' 
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}>
                <Settings size={20} />
                <span className="text-sm font-medium">Settings</span>
            </div>
        </Link>
      </div>
    </aside>
  );
}