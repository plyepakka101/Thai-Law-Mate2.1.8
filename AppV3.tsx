import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { BookMarked, ChevronLeft, Database, Home, Library, List, PlusSquare, Scale, Search, Settings, Star, ShieldCheck, LogIn, LogOut } from 'lucide-react';
import { LawBook, LawSection, UserNote, AppSettings, ViewState } from './types';
import { deleteCustomLaw, getBooks, getLaws, getNotes, getSettings, saveCustomLaw, saveNote, saveSettings } from './services/dataService';
import { Bookshelf } from './components/Bookshelf';
import { LawCard } from './components/LawCard';
import { LawEditor } from './components/LawEditor';
import { LawManager } from './components/LawManager';
import { SettingsView } from './components/SettingsView';
import { TOCView } from './components/TOCView';
import { AdminLoginGuard } from './components/AdminLoginGuard';
import { getCurrentUser, isUserAdmin, logout, AuthUser } from './services/authService';
import { normalizeSearchQuery, thaiToArabic } from './utils/textUtils';

const AppV3: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.BOOKSHELF);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [laws, setLaws] = useState<LawSection[]>([]);
  const [notes, setNotes] = useState<Record<string, UserNote>>({});
  const [settings, setSettings] = useState<AppSettings>({ darkMode: false, fontSize: 2, fontStyle: 'modern' });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser());
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState(0);

  const books = useMemo(() => getBooks(), [version]);
  const activeBook = books.find(b => b.id === activeBookId);

  const refresh = useCallback(() => { setLaws(getLaws()); setVersion(v => v + 1); }, []);
  useEffect(() => { setLaws(getLaws()); setNotes(getNotes()); setSettings(getSettings()); }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', settings.darkMode); }, [settings.darkMode]);
  useEffect(() => {
    const handleAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('thai_law_mate_auth_changed', handleAuth);
    return () => window.removeEventListener('thai_law_mate_auth_changed', handleAuth);
  }, []);

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
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white dark:bg-gray-800 border-r dark:border-gray-700 h-screen sticky top-0 justify-between">
      <div>
        <div className="p-6 flex items-center gap-3 border-b dark:border-gray-700"><div className="bg-law-600 text-white p-2 rounded-lg"><Scale size={24}/></div><b className="text-xl">Thai Law Mate <span className="text-xs text-law-600">V3</span></b></div>
        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
          <button onClick={back} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Library size={20}/>ห้องสมุดกฎหมาย</button>
          {nav(ViewState.MANAGE,'จัดการกฎหมาย V3',Database)}
          {activeBookId && <><div className="px-4 pt-3 pb-1 text-xs text-gray-400 font-bold flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${activeBook?.color?.startsWith('#') ? '' : activeBook?.color}`} style={activeBook?.color?.startsWith('#') ? { backgroundColor: activeBook?.color } : {}}/>{activeBook?.abbreviation}</div>{nav(ViewState.HOME,'เนื้อหา',Home)}{nav(ViewState.TOC,'สารบัญ',List)}{nav(ViewState.SEARCH,'ค้นหา',Search)}{nav(ViewState.HIGHLIGHTS,'รายการสำคัญ',Star)}{nav(ViewState.NOTES,'บันทึกของฉัน',BookMarked)}{nav(ViewState.ADD,'แก้ไข/เพิ่มเติม',PlusSquare)}</>}
          <div className="border-t mt-3 pt-3">{nav(ViewState.SETTINGS,'ตั้งค่า',Settings)}</div>
        </nav>
      </div>

      {/* Admin User Footer in Sidebar */}
      <div className="p-4 border-t dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
        {currentUser ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.picture ? <img src={currentUser.picture} alt="" className="w-8 h-8 rounded-full" /> : <ShieldCheck size={16}/>}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold truncate">{currentUser.name}</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Admin เข้าสู่ระบบแล้ว</div>
              </div>
            </div>
            <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="ออกจากระบบ"><LogOut size={16}/></button>
          </div>
        ) : (
          <button onClick={()=>setView(ViewState.MANAGE)} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-law-500 hover:bg-law-50 dark:hover:bg-law-900/20 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors">
            <LogIn size={14} className="text-law-600"/>
            <span>เข้าสู่ระบบ Gmail (Admin)</span>
          </button>
        )}
      </div>
    </aside>
    <main className="flex-1 max-w-5xl mx-auto w-full md:p-6">
      {/* Desktop Top Bar with Prominent Gmail Login & User Status */}
      <div className="hidden md:flex items-center justify-between pb-3 mb-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-law-600 dark:text-law-400">Thai Law Mate V3</span>
          {activeBook && <span className="text-xs text-gray-500 font-medium">/ {activeBook.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 py-1.5 px-3 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                {currentUser.picture ? <img src={currentUser.picture} alt="" className="w-6 h-6 rounded-full" /> : <ShieldCheck size={14} />}
              </div>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{currentUser.email}</span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">Admin</span>
              <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="ออกจากระบบ">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView(ViewState.MANAGE)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-law-600 hover:bg-law-700 text-white text-xs font-bold shadow-sm transition-all hover:shadow"
            >
              <LogIn size={15} />
              <span>เข้าสู่ระบบ Gmail (Admin)</span>
            </button>
          )}
        </div>
      </div>

      <header className="md:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-3 flex justify-between items-center">
        <button onClick={back} className="flex items-center gap-2">
          <ChevronLeft size={22}/>
          <span className="font-bold truncate max-w-[170px]">{view===ViewState.MANAGE?'จัดการกฎหมาย V3':activeBook?.name||'Thai Law Mate'}</span>
        </button>
        <div className="flex items-center gap-2">
          {currentUser ? (
            <button onClick={() => setView(ViewState.MANAGE)} className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
              <ShieldCheck size={14} />
              <span>Admin</span>
            </button>
          ) : (
            <button onClick={() => setView(ViewState.MANAGE)} className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-law-600 text-white text-xs font-bold shadow-sm">
              <LogIn size={13} />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}
          <button onClick={()=>setView(ViewState.SETTINGS)} className="p-1 text-gray-500 dark:text-gray-400">
            <Settings size={20}/>
          </button>
        </div>
      </header>
      {view===ViewState.BOOKSHELF && <div className="p-4"><h2 className="text-2xl font-bold">ห้องสมุดกฎหมาย</h2><p className="text-gray-500 mt-1">เลือกกฎหมายที่ต้องการศึกษา</p></div>}
      {view===ViewState.MANAGE && <div className="p-4"><AdminLoginGuard><LawManager books={books} onChanged={refresh}/></AdminLoginGuard></div>}
      {activeBook && view!==ViewState.MANAGE && view!==ViewState.ADD && <div className="p-4 md:p-0 mb-4 flex items-center gap-3"><div className={`w-3 h-10 rounded-full ${activeBook.color?.startsWith('#') ? '' : (activeBook.color || 'bg-law-600')} shrink-0`} style={activeBook.color?.startsWith('#') ? { backgroundColor: activeBook.color } : {}}/><div><h2 className="text-2xl font-bold">{activeBook.name}</h2><p className="text-sm text-gray-500 mt-0.5">{activeBook.abbreviation} · {filtered.length} รายการ</p></div></div>}
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
