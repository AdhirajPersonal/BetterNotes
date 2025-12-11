import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Search, Plus, ArrowLeft, FileText, Folder, Trash2, X, Check, AlertTriangle, Sparkles, Loader2, Eye, PenLine, Globe, UploadCloud, Heading, List, Minus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiEditNote, aiResearch } from '../services/groq';

const stripMarkdown = (text: string) => {
  if (!text) return "";
  return text.replace(/[#*`_~\[\]]/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, when: "beforeChildren" } },
  exit: { opacity: 0 }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

const editorVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { opacity: 0, x: 50, transition: { duration: 0.2 } }
};

export function Wiki() {
  const [view, setView] = useState<'grid' | 'editor'>('grid');
  const [notes, setNotes] = useState<any[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [suppressDeleteWarning, setSuppressDeleteWarning] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: 'note' | 'folder', id: any } | null>(null);
  const [dontAskTemp, setDontAskTemp] = useState(false);
  
  const [dropModalOpen, setDropModalOpen] = useState(false);
  const [droppedFilesCache, setDroppedFilesCache] = useState<File[]>([]);
  const [dropFolderName, setDropFolderName] = useState("");

  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchQuery, setResearchQuery] = useState("");

  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userHasTyped = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      const savedNotes = await window.api.store.get('my-notes');
      const savedFolders = await window.api.store.get('my-folders');
      const savedSuppress = await window.api.store.get('suppress-delete-warning');

      if (savedNotes) setNotes(savedNotes);
      if (savedFolders) setFolders(savedFolders); else setFolders(['Class Notes', 'Work', 'General']);
      if (savedSuppress) setSuppressDeleteWarning(true);
      setIsLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      window.api.store.set('my-folders', folders);
      window.api.store.set('suppress-delete-warning', suppressDeleteWarning);
      if (userHasTyped.current) {
        setIsSaving(true);
        window.api.store.set('my-notes', notes);
        const timer = setTimeout(() => setIsSaving(false), 800);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [notes, folders, suppressDeleteWarning, isLoaded]);

  useEffect(() => {
    const activeNote = getActiveNote();
    const contextString = `PAGE: WIKI\nFOLDER: ${currentFolder || 'Root'}\nNOTE: ${activeNote.title}\nCONTENT:\n${activeNote.preview || "(Empty)"}`;
    window.dispatchEvent(new CustomEvent('ai-context-update', { detail: contextString }));
  }, [activeNoteId, notes, currentFolder]); 

  useEffect(() => {
    const handleAiAction = (e: any) => {
      const { tool, value } = e.detail;
      if (tool === 'create_note') {
        const parts = value.split('|');
        createNote(parts[0].trim(), parts[1] ? parts[1].trim() : "Created by AI Agent.");
      }
    };
    window.addEventListener('ai-action', handleAiAction);
    return () => window.removeEventListener('ai-action', handleAiAction);
  }, [currentFolder]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (slashMenuOpen) setSlashMenuOpen(false);
    };
    
    // Add listener
    window.addEventListener('click', handleClickOutside);
    
    // Cleanup listener
    return () => window.removeEventListener('click', handleClickOutside);
  }, [slashMenuOpen]);


  const createNote = (overrideTitle?: string, overrideContent?: string, targetFolder?: string) => {
    userHasTyped.current = true;
    const newId = Date.now() + Math.random();
    const newNote = { 
      id: newId, 
      title: overrideTitle || 'Untitled Note', 
      preview: overrideContent || '', 
      date: new Date().toLocaleDateString(), 
      color: 'blue', 
      folder: targetFolder || currentFolder || 'General' 
    };
    setNotes(prev => [newNote, ...prev]);
    return newId;
  };

  const requestDelete = (e: React.MouseEvent, type: 'note' | 'folder', id: any) => {
    e.stopPropagation();
    if (suppressDeleteWarning) performDelete(type, id);
    else {
      setPendingDelete({ type, id });
      setDeleteModalOpen(true);
      setDontAskTemp(false);
    }
  };

  const performDelete = (type: 'note' | 'folder', id: any) => {
    userHasTyped.current = true;
    if (type === 'note') setNotes(prev => prev.filter(n => n.id !== id));
    else {
      setNotes(prev => prev.map(n => n.folder === id ? { ...n, folder: 'General' } : n));
      setFolders(prev => prev.filter(f => f !== id));
    }
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      performDelete(pendingDelete.type, pendingDelete.id);
      if (dontAskTemp) setSuppressDeleteWarning(true);
    }
    setDeleteModalOpen(false);
    setPendingDelete(null);
  };

  const createFolder = () => {
    if (newFolderName.trim()) {
      setFolders(prev => [...prev, newFolderName.trim()]);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const updateNote = (key: string, value: string) => {
    userHasTyped.current = true;
    setNotes(prevNotes => prevNotes.map(n => n.id === activeNoteId ? { ...n, [key]: value } : n));
  };

  const updateSpecificNote = (id: number, key: string, value: string) => {
    userHasTyped.current = true;
    setNotes(prevNotes => prevNotes.map(n => n.id === id ? { ...n, [key]: value } : n));
  };

  const getActiveNote = () => notes.find(n => n.id === activeNoteId) || { title: '', preview: '', folder: '' };
  const getFolderCount = (folder: string) => notes.filter(n => n.folder === folder).length;
  const visibleNotes = currentFolder ? notes.filter(n => n.folder === currentFolder) : notes;

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            const result = await window.api.parseFile({ name: file.name, buffer });
            resolve(result.success ? result.text || "" : `Error: ${result.error}`);
        };
        reader.readAsArrayBuffer(file);
    });
  };

  const processFilesForEditor = async (files: File[]) => {
    setIsAiLoading(true);
    let appendText = "";
    for (const file of files) {
        const text = await readFileContent(file);
        if (text) appendText += `\n\n<details>\n<summary><strong>📄 Attached: ${file.name}</strong> <em>(Click to expand)</em></summary>\n\n${text}\n\n</details>\n`;
    }
    const currentText = getActiveNote().preview;
    updateNote('preview', currentText + appendText);
    setIsAiLoading(false);
  };

  const processFilesForGrid = async (files: File[], targetFolder: string) => {
    setIsAiLoading(true);
    if (!folders.includes(targetFolder) && targetFolder !== 'General') {
        setFolders(prev => [...prev, targetFolder]);
    }
    for (const file of files) {
        const text = await readFileContent(file);
        const formattedContent = `# ${file.name}\n\n<details open>\n<summary>📄 <strong>Source Content</strong></summary>\n\n${text || "Could not read file."}\n\n</details>\n\n## AI Analysis\n*Click "AI Refine" -> "Summarize" to generate insights.*`;
        createNote(file.name, formattedContent, targetFolder);
    }
    setIsAiLoading(false);
    setDropModalOpen(false);
    setDroppedFilesCache([]);
    setDropFolderName("");
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (view === 'editor') processFilesForEditor(files);
      else {
        if (files.length > 1) { setDroppedFilesCache(files); setDropModalOpen(true); }
        else processFilesForGrid(files, currentFolder || 'General');
      }
    } else {
      const text = e.dataTransfer.getData("text");
      if (text && view === 'editor') {
        const currentText = getActiveNote().preview;
        updateNote('preview', currentText + "\n" + text);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Escape') setSlashMenuOpen(false); };
  const handleKeyUp = (e: React.KeyboardEvent) => { if (e.key === '/') setSlashMenuOpen(true); };
  
  const insertMarkdown = (syntax: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start).replace(/\/$/, ''); 
    const after = text.substring(end);
    const newText = before + syntax + after;
    updateNote('preview', newText);
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(before.length + syntax.length, before.length + syntax.length);
    }, 0);
    setSlashMenuOpen(false);
  };

  const handleAiAction = async (action: string) => {
    setAiMenuOpen(false);
    setIsAiLoading(true);
    const currentNote = getActiveNote();
    if (!currentNote.preview) { alert("Please write something first!"); setIsAiLoading(false); return; }

    let prompt = "";
    if (action === 'grammar') prompt = "Fix grammar, spelling, and tone. Keep markdown formatting.";
    if (action === 'summarize') prompt = "Summarize this into a markdown list.";
    if (action === 'expand') prompt = "Expand on these ideas with details.";
    if (action === 'checklist') prompt = "Convert to markdown checklist.";

    try {
      const newContent = await aiEditNote(currentNote.preview, prompt);
      updateNote('preview', newContent);
      setIsEditing(false);
    } catch (error) { alert("AI Error: Check Settings."); } 
    finally { setIsAiLoading(false); }
  };

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setIsResearching(false);
    setIsAiLoading(true);
    
    const newId = createNote(`Research: ${researchQuery}`, "🔍 **Agent is browsing the web...**");
    setActiveNoteId(newId);
    setView('editor');
    setIsEditing(false); 
    
    try {
        const report = await aiResearch(researchQuery);
        updateSpecificNote(newId as number, 'preview', report);
    } catch (error) {
        updateSpecificNote(newId as number, 'preview', "❌ Research Failed.");
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-white dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-500 overflow-y-auto custom-scrollbar p-10 relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <AnimatePresence>
        {isDragging && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-4 border-blue-500 border-dashed rounded-[3rem] m-4 pointer-events-none">
                <UploadCloud size={64} className="text-blue-600 dark:text-blue-400 mb-4" />
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{view === 'editor' ? "Drop to Append" : "Drop to Create Notes"}</span>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dropModalOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-md relative z-10">
               <div className="flex items-center gap-3 text-blue-500 mb-4"><div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full"><Folder size={24} /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Import {droppedFilesCache.length} Files</h3></div>
               <p className="text-gray-500 dark:text-gray-400 mb-6">Create a new folder for these notes?</p>
               <input autoFocus type="text" value={dropFolderName} onChange={(e) => setDropFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && processFilesForGrid(droppedFilesCache, dropFolderName)} placeholder="Folder Name..." className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-4 outline-none focus:border-blue-500 mb-6 transition-all" />
               <div className="flex gap-3"><button onClick={() => setDropModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-white/5">Cancel</button><button onClick={() => processFilesForGrid(droppedFilesCache, dropFolderName || "Imports")} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">Import</button></div>
             </motion.div>
           </div>
        )}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-sm relative z-10">
              <div className="flex items-center gap-3 text-red-500 mb-4"><div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full"><AlertTriangle size={24} /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete {pendingDelete?.type}?</h3></div>
              <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Are you sure? This cannot be undone.</p>
              <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => setDontAskTemp(!dontAskTemp)}><div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${dontAskTemp ? 'bg-blue-500 border-blue-500' : 'border-gray-400 dark:border-gray-600'}`}>{dontAskTemp && <Check size={12} className="text-white"/>}</div><span className="text-sm text-gray-600 dark:text-gray-300 select-none">Don't ask again</span></div>
              <div className="flex gap-3"><button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-white/5">Cancel</button><button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20">Delete</button></div>
            </motion.div>
          </div>
        )}
        {isResearching && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsResearching(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-lg relative z-10">
               <div className="flex items-center gap-3 text-blue-500 mb-4"><div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full"><Globe size={24} /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white">Deep Research</h3></div>
               <p className="text-gray-500 dark:text-gray-400 mb-6">Enter a topic. The AI will browse the web.</p>
               <input autoFocus type="text" value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleResearch()} placeholder="Topic..." className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-4 outline-none focus:border-blue-500 mb-6 transition-all" />
               <div className="flex gap-3"><button onClick={() => setIsResearching(false)} className="flex-1 py-3 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-white/5">Cancel</button><button onClick={handleResearch} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">Start</button></div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      <motion.div layout className="flex justify-between items-center mb-12 pr-36">
        <motion.h1 key={currentFolder || 'root-title'} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold tracking-tight">{currentFolder ? currentFolder : 'MY NOTES'}</motion.h1>
        <div className="flex items-center gap-6">
          <button onClick={() => { setResearchQuery(""); setIsResearching(true); }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-sm font-medium transition-colors text-gray-700 dark:text-gray-300"><Globe size={16} className="text-blue-500"/> Deep Research</button>
          <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} /><input type="text" placeholder="Search..." className="bg-gray-100 dark:bg-[#111] border-none rounded-full py-3 pl-12 pr-6 w-[300px] text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400" /></div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {view === 'grid' && isLoaded && (
          <motion.div key={currentFolder ? `folder-${currentFolder}` : 'root-grid'} variants={containerVariants} initial="hidden" animate="show" exit="exit">
            {currentFolder ? (
                <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => setCurrentFolder(null)} className="mb-8 flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"><ArrowLeft size={20}/> Back to Folders</motion.button>
            ) : (
                <div className="mb-12">
                  <motion.h2 variants={itemVariants} className="text-2xl font-semibold mb-6">Folders</motion.h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {folders.map(folder => (
                        <FolderCard key={folder} title={folder} count={getFolderCount(folder)} onClick={() => setCurrentFolder(folder)} onDelete={(e: any) => requestDelete(e, 'folder', folder)} />
                      ))}
                      {!isCreatingFolder ? (
                        <motion.div variants={itemVariants} initial="hidden" animate="show" onClick={() => setIsCreatingFolder(true)} className="h-40 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                            <div className="h-10 w-10 bg-black dark:bg-white rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Plus size={18} className="text-white dark:text-black" /></div>
                            <span className="text-sm font-medium">New folder</span>
                        </motion.div>
                      ) : (
                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="h-40 rounded-[2rem] border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/10 flex flex-col items-center justify-center p-4">
                            <input autoFocus type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFolder()} placeholder="Name..." className="w-full bg-transparent text-center font-bold outline-none mb-2 text-gray-900 dark:text-white" />
                            <div className="flex gap-2"><button onClick={createFolder} className="p-1 bg-blue-500 rounded-full text-white"><Check size={14}/></button><button onClick={() => setIsCreatingFolder(false)} className="p-1 bg-gray-300 dark:bg-gray-700 rounded-full text-black dark:text-white"><X size={14}/></button></div>
                        </motion.div>
                      )}
                  </div>
                </div>
            )}

            <div>
              <motion.div variants={itemVariants} className="flex justify-between items-end mb-6"><h2 className="text-2xl font-semibold">{currentFolder ? `Notes in ${currentFolder}` : 'All Notes'}</h2></motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleNotes.map((note) => (
                  <NoteCard key={note.id} title={note.title} preview={note.preview} date={note.date} color={note.color} onClick={() => { setActiveNoteId(note.id); setView('editor'); setIsEditing(false); }} onDelete={(e: any) => requestDelete(e, 'note', note.id)} />
                ))}
                 <motion.div variants={itemVariants} initial="hidden" animate="show" onClick={() => { void createNote(); }} className="h-[280px] rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center cursor-pointer transition-colors group hover:bg-gray-50 dark:hover:bg-white/5">
                    <div className="h-12 w-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300"><Plus size={24} className="text-white dark:text-black" /></div>
                    <span className="text-sm font-medium">New Note</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'editor' && (
          <motion.div key="editor" variants={editorVariants} initial="hidden" animate="show" exit="exit" className="h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
               <div className="flex items-center gap-4"><button onClick={() => setView('grid')} className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><ArrowLeft size={24} /></button><span className="text-gray-400">Back</span></div>
               <div className="flex items-center gap-4">
                 <button onClick={() => setIsEditing(!isEditing)} className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-gray-600 dark:text-gray-300" title={isEditing ? "Switch to Reading View" : "Switch to Editing View"}>{isEditing ? <Eye size={20}/> : <PenLine size={20}/>}</button>
                 <div className="relative">
                    <button onClick={() => setAiMenuOpen(!aiMenuOpen)} disabled={isAiLoading} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all disabled:opacity-50">{isAiLoading ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}<span className="text-sm font-bold">AI Refine</span></button>
                    <AnimatePresence>
                        {aiMenuOpen && (
                            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1">
                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Actions</div>
                                <button onClick={() => handleAiAction('grammar')} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2"><span className="text-blue-500">✨</span> Fix Grammar</button>
                                <button onClick={() => handleAiAction('summarize')} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2"><span className="text-purple-500">📝</span> Summarize</button>
                                <button onClick={() => handleAiAction('expand')} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2"><span className="text-green-500">🌱</span> Expand Idea</button>
                                <button onClick={() => handleAiAction('checklist')} className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2"><span className="text-orange-500">✅</span> Make Checklist</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                 </div>
                 <AnimatePresence mode='wait'>{isSaving ? <motion.span key="saving" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-blue-500 text-xs font-medium">Saving...</motion.span> : <motion.span key="saved" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-500 text-xs font-medium">Saved</motion.span>}</AnimatePresence>
               </div>
            </div>
            <motion.div layoutId={`card-${activeNoteId}`} className="flex-1 bg-gray-50 dark:bg-[#111] rounded-[2rem] p-12 shadow-sm border border-gray-100 dark:border-white/10 relative flex flex-col overflow-hidden">
                <input value={getActiveNote().title} onChange={(e) => updateNote('title', e.target.value)} className="w-full text-5xl font-bold bg-transparent outline-none mb-8 text-gray-900 dark:text-white placeholder:text-gray-300 transition-colors shrink-0" placeholder="Note Title" />
                {isEditing ? (
                    <div className="relative w-full h-full">
                        <textarea ref={textareaRef} value={getActiveNote().preview} onChange={(e) => updateNote('preview', e.target.value)} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} className="w-full h-full bg-transparent outline-none text-xl leading-relaxed text-gray-600 dark:text-gray-300 resize-none custom-scrollbar pb-20" placeholder="Type '/' for commands..." autoFocus />
                        <AnimatePresence>
                            {slashMenuOpen && (
                                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute bottom-4 left-0 w-64 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1">
                                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Basic Blocks</div>
                                    <SlashItem icon={<Heading size={16}/>} label="Heading 1" onClick={() => insertMarkdown('# ')} />
                                    <SlashItem icon={<Heading size={14}/>} label="Heading 2" onClick={() => insertMarkdown('## ')} />
                                    <SlashItem icon={<Heading size={12}/>} label="Heading 3" onClick={() => insertMarkdown('### ')} />
                                    <SlashItem icon={<List size={16}/>} label="Bullet List" onClick={() => insertMarkdown('- ')} />
                                    <SlashItem icon={<Check size={16}/>} label="Checklist" onClick={() => insertMarkdown('- [ ] ')} />
                                    <SlashItem icon={<Minus size={16}/>} label="Divider" onClick={() => insertMarkdown('\n---\n')} />
                                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">AI Actions</div>
                                    <SlashItem icon={<Sparkles size={16} className="text-blue-500"/>} label="Summarize" onClick={() => { setSlashMenuOpen(false); handleAiAction('summarize'); }} />
                                    <SlashItem icon={<Sparkles size={16} className="text-purple-500"/>} label="Fix Grammar" onClick={() => { setSlashMenuOpen(false); handleAiAction('grammar'); }} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="w-full h-full overflow-y-auto custom-scrollbar pb-20 break-words">
                        <article className="prose prose-lg dark:prose-invert max-w-none text-xl leading-relaxed text-gray-600 dark:text-gray-300">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{getActiveNote().preview || "*No content*"}</ReactMarkdown>
                        </article>
                    </div>
                )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlashItem({ icon, label, onClick }: any) {
    return (
        <button onClick={onClick} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-3 transition-colors">
            <span className="text-gray-400 dark:text-gray-500">{icon}</span>{label}
        </button>
    )
}

function FolderCard({ title, count, onClick, onDelete }: any) {
  return (
    <motion.div variants={itemVariants} initial="hidden" animate="show" whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }} whileTap={{ scale: 0.98 }} onClick={onClick} className="h-40 bg-white dark:bg-[#111] rounded-[2rem] p-6 relative group cursor-pointer border border-gray-100 dark:border-white/5">
       <div className="flex justify-between items-start mb-8"><div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-orange-50 dark:bg-orange-900/20 text-orange-500"><Folder size={20} className="fill-current" /></div><button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Folder"><Trash2 size={16}/></button></div>
       <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{title}</h3>
       <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{count} Files</p>
    </motion.div>
  )
}

function NoteCard({ title, preview, date, color, onClick, onDelete }: any) {
  const colorMap: any = { yellow: 'bg-[#FEF3C7] dark:bg-[#2A2510]', blue: 'bg-[#E0F2FE] dark:bg-[#172033]' };
  return (
    <motion.div variants={itemVariants} initial="hidden" animate="show" whileHover={{ y: -8, transition: { type: "spring", stiffness: 400 } }} onClick={onClick} className={`h-[280px] ${colorMap[color] || colorMap.blue} rounded-[2rem] p-8 flex flex-col justify-between cursor-pointer border border-transparent dark:border-white/5 group relative`}>
       <div>
         <div className="flex justify-between items-start mb-4"><span className="text-[10px] font-bold text-gray-400 opacity-60">{date}</span><div className="flex gap-2"><div className="h-8 w-8 bg-black/5 dark:bg-white/10 rounded-full flex items-center justify-center"><FileText size={14} className="opacity-50" /></div></div></div>
         <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-3 leading-tight pr-4 line-clamp-2 break-words" title={title}>{title}</h3>
         <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4 opacity-80 break-words">{stripMarkdown(preview) || "No content..."}</p>
       </div>
       <div className="flex items-center justify-between mt-auto"><span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to edit</span><button onClick={onDelete} className="p-2 bg-white/50 dark:bg-black/30 rounded-full text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"><Trash2 size={14}/></button></div>
    </motion.div>
  )
}