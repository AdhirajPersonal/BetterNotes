import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { 
  Search, FileText, LayoutGrid, BarChart3, Settings, Moon, Sun, Sparkles, ArrowRight, Plus 
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open) {
      const loadNotes = async () => {
        const savedNotes = await window.api.store.get('my-notes') || [];
        setNotes(savedNotes);
      };
      loadNotes();
    }
  }, [open]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div 
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animation-fade-in"
        onClick={() => setOpen(false)} 
    >
      
      {/* PREVENT CLOSE ON MODAL CLICK */}
      <div 
        className="w-full max-w-lg shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
          <Command 
            className="w-full bg-white dark:bg-[#161618] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col"
            loop
          >
            {/* INPUT */}
            <div className="flex items-center border-b border-gray-100 dark:border-white/5 px-4">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <Command.Input 
                autoFocus
                placeholder="What do you need?..."
                value={search}
                onValueChange={setSearch}
                className="flex-1 h-14 bg-transparent outline-none text-lg text-gray-800 dark:text-white placeholder:text-gray-400"
              />
              <div className="flex gap-1">
                <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500 px-2 py-1 rounded">ESC</span>
              </div>
            </div>

            {/* LIST */}
            <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
              <Command.Empty className="py-6 text-center text-sm text-gray-500">
                No results found.
              </Command.Empty>

              <Command.Group heading="Navigation" className="text-xs font-bold text-gray-400 px-2 mb-2 mt-2">
                <Item icon={<LayoutGrid />} onSelect={() => runCommand(() => navigate('/'))}>Mission Control</Item>
                <Item icon={<BarChart3 />} onSelect={() => runCommand(() => navigate('/analytics'))}>Analytics</Item>
                <Item icon={<Settings />} onSelect={() => runCommand(() => navigate('/settings'))}>Settings</Item>
              </Command.Group>

              <Command.Group heading="Notes" className="text-xs font-bold text-gray-400 px-2 mb-2 mt-2">
                {notes.map((note) => (
                  <Item 
                    key={note.id} 
                    icon={<FileText />} 
                    onSelect={() => runCommand(() => navigate('/wiki'))} 
                  >
                    <div className="flex flex-col">
                        <span>{note.title || "Untitled"}</span>
                        <span className="text-[10px] font-normal opacity-50 truncate max-w-[200px]">{note.preview || "No content"}</span>
                    </div>
                  </Item>
                ))}
                <Item icon={<Plus />} onSelect={() => runCommand(() => navigate('/wiki'))}>Create New Note</Item>
              </Command.Group>

              <Command.Group heading="System" className="text-xs font-bold text-gray-400 px-2 mb-2 mt-2">
                <Item icon={theme === 'dark' ? <Sun /> : <Moon />} onSelect={() => runCommand(toggleTheme)}>Toggle Theme</Item>
                <Item icon={<Sparkles className="text-blue-500" />} onSelect={() => runCommand(() => {
                    const aiBtn = document.querySelector('button[title="Open AI Agent"]') as HTMLButtonElement; 
                    if(aiBtn) aiBtn.click();
                })}>
                  Ask AI Agent
                </Item>
              </Command.Group>
            </Command.List>

            {/* FOOTER */}
            <div className="h-10 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">BetterNotes v1.0</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">Move <kbd className="font-sans">↓↑</kbd></span>
                    <span className="flex items-center gap-1">Select <kbd className="font-sans">↵</kbd></span>
                </div>
            </div>
          </Command>
      </div>
    </div>
  );
}

function Item({ children, icon, onSelect }: any) {
  return (
    <Command.Item 
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 aria-selected:bg-blue-500 aria-selected:text-white transition-colors group"
    >
      <div className="text-gray-400 group-aria-selected:text-white transition-colors">
        {icon && typeof icon === 'object' ? React.cloneElement(icon, { size: 18 }) : icon}
      </div>
      <div className="flex-1">{children}</div>
      <ArrowRight size={14} className="opacity-0 group-aria-selected:opacity-100 transition-opacity" />
    </Command.Item>
  );
}