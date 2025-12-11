import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Sun, Download, Trash2, Cpu, Save, Check, ExternalLink, Eye, EyeOff, Upload } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  
  const [username, setUsername] = useState("User");
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const name = await window.api.store.get('user-name');
      const key = await window.api.store.get('groq-api-key');
      if (name) setUsername(name);
      if (key) setApiKey(key);
    };
    load();
  }, []);

  const handleSaveName = (name: string) => {
    setUsername(name);
    window.api.store.set('user-name', name);
  };

  const handleSaveKey = (key: string) => {
    const cleanKey = key.trim();
    setApiKey(cleanKey);
    window.api.store.set('groq-api-key', cleanKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExport = async () => {
    const notes = await window.api.store.get('my-notes') || [];
    const tasks = await window.api.store.get('my-tasks') || [];
    const folders = await window.api.store.get('my-folders') || [];
    
    const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        notes,
        tasks,
        folders
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `betternotes_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);

            if (!data.notes && !data.tasks) {
                alert("Invalid backup file.");
                return;
            }

            if (confirm("This will overwrite your current data with the backup. Continue?")) {
                if (data.notes) await window.api.store.set('my-notes', data.notes);
                if (data.tasks) await window.api.store.set('my-tasks', data.tasks);
                if (data.folders) await window.api.store.set('my-folders', data.folders);
                
                alert("Backup restored successfully! Reloading...");
                window.location.reload();
            }
        } catch (error) {
            alert("Failed to parse backup file.");
            console.error(error);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const handleReset = () => {
    if (confirm("Are you sure? This will PERMANENTLY DELETE all notes, tasks, and settings. This cannot be undone.")) {
      window.api.store.set('my-notes', []);
      window.api.store.set('my-tasks', []);
      window.api.store.set('my-folders', []);
      window.api.store.set('user-name', '');
      window.location.reload();
    }
  };

  return (
    <div className="h-full w-full bg-white dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-500 overflow-y-auto custom-scrollbar p-10 pb-20">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your preferences and data.</p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-3xl space-y-8"
      >
        
        <SettingsCard title="Profile" icon={<User size={20} className="text-blue-500"/>}>
           <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-[#111] flex items-center justify-center border border-gray-200 dark:border-white/10">
                 <User size={32} className="text-gray-400"/>
              </div>
              <div className="flex-1">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Display Name</label>
                 <input 
                   type="text" 
                   value={username}
                   onChange={(e) => handleSaveName(e.target.value)}
                   className="w-full bg-transparent text-xl font-medium border-b border-gray-200 dark:border-white/10 pb-2 focus:border-blue-500 outline-none transition-colors"
                 />
              </div>
           </div>
        </SettingsCard>

        <SettingsCard title="Appearance" icon={<Sun size={20} className="text-orange-500"/>}>
           <div className="flex items-center justify-between py-2">
              <div>
                 <h4 className="font-medium text-lg">App Theme</h4>
                 <p className="text-sm text-gray-500">Toggle between Light and Dark mode.</p>
              </div>
              <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
           </div>
        </SettingsCard>

        <SettingsCard title="Groq Intelligence" icon={<Cpu size={20} className="text-purple-500"/>}>
           <div className="space-y-4">
              <div>
                 <div className="flex justify-between items-center mb-1">
                    <h4 className="font-medium text-lg">Groq API Key</h4>
                    <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        Get Key <ExternalLink size={10}/>
                    </a>
                 </div>
                 <p className="text-sm text-gray-500 mb-4">Required for Auto-Complete, Summarization, and Grammar fixes.</p>
                 
                 <div className="relative">
                    <input 
                        type={showKey ? "text" : "password"} 
                        placeholder="gsk_..." 
                        value={apiKey}
                        onChange={(e) => handleSaveKey(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                    />
                    
                    <button 
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                    >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                        {isSaved && <Check size={18} />}
                    </div>
                 </div>
                 
                 <p className="text-xs text-gray-400 mt-2">
                    Your key is stored locally on your device. We use the <b>gpt-oss-120b</b> model for edits.
                 </p>
              </div>
           </div>
        </SettingsCard>

        <SettingsCard title="Data & Storage" icon={<Save size={20} className="text-emerald-500"/>}>
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div>
                    <h4 className="font-medium text-lg">Backup & Restore</h4>
                    <p className="text-sm text-gray-500">Save your data locally or restore from a file.</p>
                 </div>
                 <div className="flex gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg font-medium transition-colors"
                    >
                        <Download size={16}/> Export
                    </button>

                    <button 
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg font-medium transition-colors"
                    >
                        <Upload size={16}/> Import
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json" 
                        className="hidden" 
                    />
                 </div>
              </div>

              <div className="h-[1px] bg-gray-100 dark:bg-white/5 w-full"></div>

              <div className="flex items-center justify-between">
                 <div>
                    <h4 className="font-medium text-lg text-red-500">Danger Zone</h4>
                    <p className="text-sm text-gray-500">Permanently delete all data and reset the app.</p>
                 </div>
                 <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg font-medium transition-colors"
                 >
                    <Trash2 size={16}/> Reset App
                 </button>
              </div>
           </div>
        </SettingsCard>

      </motion.div>
    </div>
  );
}

function SettingsCard({ title, icon, children }: any) {
    return (
        <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-[2rem] p-8 shadow-sm"
        >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">{icon}</div>
                <h3 className="text-xl font-bold">{title}</h3>
            </div>
            {children}
        </motion.div>
    )
}

function Toggle({ checked, onChange }: any) {
    return (
        <div 
            onClick={onChange}
            className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
        >
            <motion.div 
                className="w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ x: checked ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        </div>
    )
}