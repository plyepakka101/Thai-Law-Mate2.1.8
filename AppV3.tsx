import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { BookMarked, ChevronLeft, Database, Home, Library, List, PlusSquare, Scale, Search, Settings, Star } from 'lucide-react';
import { LawBook, LawSection, UserNote, AppSettings, ViewState } from './types';
import { deleteCustomLaw, getBooks, getLaws, getNotes, getSettings, saveCustomLaw, saveNote, saveSettings } from './services/dataService';
import { Bookshelf } from './components/Bookshelf';
import { LawCard } from './components/LawCard';
import { LawEditor } from './components/LawEditor';
import { LawManager } from './components/LawManager';
import { SettingsView } from './components/SettingsView';
import { TOCView } from './components/TOCView';
import { normalizeSearchQuery, thaiToArabic } from './utils/textUtils';

const AppV3: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.BOOKSHELF);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [laws, setLaws] = useState<LawSection[]>([]);
  const [notes, setNotes] = useState<Record<string, UserNote>>({});
  const [settings, setSettings] = useState<AppSettings>({ darkMode: false, fontSize: 2, fontStyle: 'modern' });
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState(0);

  const books = useMemo(() => getBooks(), [version]);
  const activeBook = books.find(b => b.id === activeBookId);

  const refresh = useCallback(() => { setLaws(getLaws()); setVersion(v => v + 1); }, []);
  useEffect(() => { setLaws(getLaws()); setNotes(getNotes()); setSettings(getSettings()); }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', settings.darkMode); }, [settings.darkMode]);

  const selectBook = (id: string) => { setActiveBookId(id); setView(ViewState.HOME); setQuery(''); window.scrollTo(0, 0); };
  const back = () => { setActiveBookId(null); setView(ViewState.BOOKSHELF); setQuery(''); };
  const saveLaw = (data: Omit<LawSection, 'id'> & { id?: string }) => { saveCustomLaw({ ...data, bookId: data.bookId || activeBookId || 'custom' }); refresh(); setView(activeBookId ? ViewState.HOME : ViewState.BOOKSHELF); };
  const removeLaw = (id: string) => { if (window.confirm('ต้องการคืนค่าเดิม/ลบกฎหมายข้อนี้หรือไม่?')) { deleteCustomLaw(id); refresh(); } };
  const saveUserNote = (note: UserNote) => setNotes({ ...saveNote(note) });
  const updateSettings = (next: AppSettings) => { setSettings(next); saveSettings(next); };

  const scrollTo = useCallback((id: string) => {
    setView(ViewState.HOME); setQuery('');
    setTimeout(() => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, []);
  const navigateLabel = useCallback((label: string) => {
    const n = thaiToArabic(label).replace(/\s+/g, '').toLowerCase();
    const found = laws.find(l => (!activeBookId || l.bookId === activeBookId) && thaiToArabic(l.sectionNumber).replace(/\s+/g, '').toLowerCase() === n);
    if (found) scrollTo(found.id);
  }, [laws, activeBookId, scrollTo]);

  const filtered = useMemo(() => {
    const scope = activeBookId ? laws.filter(l => l.bookId === activeBookId) : [];
    if (view === ViewState.NOTES) return scope.filter(l => notes[l.id]?.text?.trim());
    if (view === ViewState.HIGHLIGHTS) return scope.filter(l => notes[l.id]?.isHighlighted);
    if (!query.trim()) return view === ViewState.SEARCH ? [] : scope;
    const q = normalizeSearchQuery(query);
    return scope.filter(l => normalizeSearchQuery(l.sectionNumber).includes(q) || normalizeSearchQuery(l.content).includes(q) || normalizeSearchQuery(l.category || '').includes(q));
  }, [laws, activeBookId, notes, view, query]);

  const nav = (v: ViewState, label: string, Icon: any) => <button key={v} onClick={() => { setView(v); if (v !== ViewState.SEARCH) setQuery(''); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${view === v ? 'bg-law-50 text-law-700 font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><Icon size={20}/><span>{label}</span></button>;

  return <HashRouter><div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-20 md:pb-0 flex">
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white dark:bg-gray-800 border-r dark:border-gray-700 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b dark:border-gray-700"><div className="bg-law-600 text-white p-2 rounded-lg"><Scale size={24}/></div><b className="text-xl">Thai Law Mate <span className="text-xs text-law-600">V3</span></b></div>
      <nav className="p-4 space-y-2 overflow-y-auto"><button onClick={back} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Library size={20}/>ห้องสมุดกฎหมาย</button>{nav(ViewState.MANAGE,'จัดการกฎหมาย V3',Database)}{activeBookId && <><div className="px-4 pt-3 pb-1 text-xs text-gray-400 font-bold">{activeBook?.abbreviation}</div>{nav(ViewState.HOME,'เนื้อหา',Home)}{nav(ViewState.TOC,'สารบัญ',List)}{nav(ViewState.SEARCH,'ค้นหา',Search)}{nav(ViewState.HIGHLIGHTS,'รายการสำคัญ',Star)}{nav(ViewState.NOTES,'บันทึกของฉัน',BookMarked)}{nav(ViewState.ADD,'แก้ไข/เพิ่มเติม',PlusSquare)}</>}<div className="border-t mt-3 pt-3">{nav(ViewState.SETTINGS,'ตั้งค่า',Settings)}</div></nav>
    </aside>
    <main className="flex-1 max-w-5xl mx-auto w-full md:p-6">
      <header className="md:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-3 flex justify-between items-center"><button onClick={back} className="flex items-center gap-2"><ChevronLeft size={22}/><span className="font-bold truncate max-w-[250px]">{view===ViewState.MANAGE?'จัดการกฎหมาย V3':activeBook?.name||'Thai Law Mate'}</span></button><button onClick={()=>setView(ViewState.SETTINGS)}><Settings size={20}/></button></header>
      {view===ViewState.BOOKSHELF && <div className="p-4"><h2 className="text-2xl font-bold">ห้องสมุดกฎหมาย</h2><p className="text-gray-500 mt-1">เลือกกฎหมายที่ต้องการศึกษา</p></div>}
      {view===ViewState.MANAGE && <div className="p-4"><LawManager books={books} onChanged={refresh}/></div>}
      {activeBook && view!==ViewState.MANAGE && view!==ViewState.ADD && <div className="p-4 md:p-0 mb-4"><h2 className="text-2xl font-bold">{activeBook.name}</h2><p className="text-sm text-gray-500 mt-1">{activeBook.abbreviation} · {filtered.length} รายการ</p></div>}
      <div className="px-4 md:px-0">
        {view===ViewState.BOOKSHELF && <Bookshelf books={books} laws={laws} onSelectBook={selectBook}/>} 
        {view===ViewState.ADD && <LawEditor initialBookId={activeBookId} onSave={saveLaw} onCancel={()=>setView(ViewState.HOME)}/>} 
        {view===ViewState.TOC && <TOCView laws={filtered} onNavigate={scrollTo}/>} 
        {view===ViewState.SETTINGS && <SettingsView settings={settings} onUpdateSettings={updateSettings}/>} 
        {view===ViewState.SEARCH && activeBook && <div className="mb-4 relative"><Search className="absolute left-3 top-3 text-gray-400" size={20}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder={`ค้นหาใน ${activeBook.abbreviation}`} className="w-full pl-10 p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm"/></div>}
        {(view===ViewState.HOME||view===ViewState.SEARCH||view===ViewState.NOTES||view===ViewState.HIGHLIGHTS) && <div className="space-y-4">{filtered.length ? filtered.map(l=><LawCard key={l.id} law={l} note={notes[l.id]} settings={settings} onSaveNote={saveUserNote} onDeleteLaw={removeLaw} onNavigateToSection={navigateLabel} officialUrl={activeBook?.sourceUrl||''} searchQuery={view===ViewState.SEARCH?query:''}/>) : <div className="py-16 text-center text-gray-500">{view===ViewState.SEARCH?(query?'ไม่พบข้อมูลที่ค้นหา':'พิมพ์เพื่อค้นหา'):'ไม่พบข้อมูลกฎหมาย'}</div>}</div>}
      </div>
    </main>
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around p-1">{activeBookId?<><button onClick={()=>setView(ViewState.HOME)} className="p-2"><Home size={22}/></button><button onClick={()=>setView(ViewState.TOC)} className="p-2"><List size={22}/></button><button onClick={()=>setView(ViewState.SEARCH)} className="p-2"><Search size={22}/></button><button onClick={()=>setView(ViewState.ADD)} className="p-2"><PlusSquare size={22}/></button></>:<><button onClick={back} className="p-2"><Library size={22}/></button><button onClick={()=>setView(ViewState.MANAGE)} className="p-2"><Database size={22}/></button></>}</nav>
  </div></HashRouter>;
};
export default AppV3;
