import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { BookMarked, ChevronLeft, Database, Home, Library, List, PlusSquare, Scale, Search, Settings, Star, LogOut, UserCircle, Brain } from 'lucide-react';
import { LawBook, LawSection, UserNote, AppSettings, ViewState } from './types';
import { deleteCustomLaw, getBooks, getLaws, getNotes, getSettings, saveCustomLaw, saveNote, saveSettings } from './services/dataService';
import { Bookshelf } from './components/Bookshelf';
import { LawCard } from './components/LawCard';
import { LawEditor } from './components/LawEditor';
import { LawManager } from './components/LawManager';
import { SettingsView } from './components/SettingsView';
import { TOCView } from './components/TOCView';
import { AdminLoginGuard } from './components/AdminLoginGuard';
import { LoginModal } from './components/LoginModal';
import { MemorizeHub } from './components/MemorizeHub';
import { getCurrentUser, isUserAdmin, logout, AuthUser } from './services/authService';
import { normalizeSearchQuery, thaiToArabic } from './utils/textUtils';
import SyncErrorBanner from './components/SyncErrorBanner';

const AppV3: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.BOOKSHELF);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [laws, setLaws] = useState<LawSection[]>([]);
  const [notes, setNotes] = useState<Record<string, UserNote>>({});
  const [settings, setSettings] = useState<AppSettings>({ darkMode: false, fontSize: 2, fontStyle: 'modern' });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser());
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
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

  const isAdmin = currentUser && isUserAdmin(currentUser);

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-20 md:pb-0 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white dark:bg-gray-800 border-r dark:border-gray-700 h-screen sticky top-0 justify-between">
          <div>
            <div className="p-6 flex items-center gap-3 border-b dark:border-gray-700">
              <div className="bg-law-600 text-white p-2 rounded-lg">
                <Scale size={24}/>
              </div>
              <b className="text-xl">Thai Law Mate <span className="text-xs text-law-600">V3</span></b>
            </div>
            <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
              <button onClick={back} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === ViewState.BOOKSHELF ? 'bg-law-50 text-law-700 font-semibold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <Library size={20}/>
                <span>ห้องสมุดกฎหมาย</span>
              </button>

              <button 
                onClick={() => { setView(ViewState.MEMORIZE); setActiveBookId(null); setQuery(''); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  view === ViewState.MEMORIZE 
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Brain size={20} className="text-purple-600 dark:text-purple-400 shrink-0"/>
                <div className="flex items-center justify-between w-full">
                  <span>ท่องสอบ (เตรียมสอบ)</span>
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-bold">ใหม่</span>
                </div>
              </button>

              {isAdmin && nav(ViewState.MANAGE,'จัดการกฎหมาย V3',Database)}
              {activeBookId && (
                <>
                  <div className="px-4 pt-3 pb-1 text-xs text-gray-400 font-bold flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${activeBook?.color?.startsWith('#') ? '' : activeBook?.color}`} style={activeBook?.color?.startsWith('#') ? { backgroundColor: activeBook?.color } : {}}/>
                    {activeBook?.abbreviation}
                  </div>
                  {nav(ViewState.HOME,'เนื้อหา',Home)}
                  {nav(ViewState.TOC,'สารบัญ',List)}
                  {nav(ViewState.SEARCH,'ค้นหา',Search)}
                  {nav(ViewState.HIGHLIGHTS,'รายการสำคัญ',Star)}
                  {nav(ViewState.NOTES,'บันทึกของฉัน',BookMarked)}
                  {nav(ViewState.ADD,'แก้ไข/เพิ่มเติม',PlusSquare)}
                </>
              )}
              <div className="border-t dark:border-gray-700 mt-3 pt-3">
                {nav(ViewState.SETTINGS,'ตั้งค่า',Settings)}
              </div>
            </nav>
          </div>

          {/* Sidebar User Footer */}
          <div className="p-4 border-t dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
            {currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {currentUser.picture ? (
                    <img src={currentUser.picture} alt="" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0" />
                  ) : (
                    <UserCircle size={24} className="text-slate-400 shrink-0" />
                  )}
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{currentUser.name || currentUser.email}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
                  </div>
                </div>
                <button 
                  onClick={logout} 
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" 
                  title="ออกจากระบบ"
                >
                  <LogOut size={16}/>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <UserCircle size={16} className="text-slate-500"/>
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 max-w-5xl mx-auto w-full md:p-6">
          {/* Desktop Top Bar - Aligned with Deka Search Navbar */}
          <div className="hidden md:flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-law-600 dark:text-law-400">Thai Law Mate V3</span>
              {activeBook && <span className="text-xs text-gray-500 font-medium">/ {activeBook.name}</span>}
            </div>

            <div className="flex items-center gap-4">
              {/* Admin Button in Navbar (like Deka Search import buttons) */}
              {isAdmin && (
                <button
                  onClick={() => setView(ViewState.MANAGE)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                    view === ViewState.MANAGE
                      ? 'bg-law-600 text-white font-medium shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Database size={13} />
                  <span>จัดการกฎหมาย</span>
                </button>
              )}

              {/* Login / Avatar Desktop */}
              <div className="flex items-center gap-3 border-l pl-4 border-slate-200 dark:border-slate-700">
                {currentUser ? (
                  <div className="flex items-center gap-3">
                    {currentUser.picture ? (
                      <img
                        src={currentUser.picture}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                        title={`${currentUser.name || ''} (${currentUser.email})`}
                      />
                    ) : (
                      <UserCircle className="w-6 h-6 text-slate-400" />
                    )}
                    <button
                      onClick={logout}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 rounded-full transition-colors"
                      title="ออกจากระบบ"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-law-600 dark:hover:text-law-400 transition-colors"
                  >
                    <UserCircle size={20} />
                    <span>เข้าสู่ระบบ</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Top Header */}
          <header className="md:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-3 flex justify-between items-center">
            <button onClick={back} className="flex items-center gap-2">
              <ChevronLeft size={22}/>
              <span className="font-bold truncate max-w-[170px]">
                {view === ViewState.MANAGE ? 'จัดการกฎหมาย V3' : activeBook?.name || 'Thai Law Mate'}
              </span>
            </button>
            
            <div className="flex items-center gap-2">
              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <button
                      onClick={() => setView(ViewState.MANAGE)}
                      className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        view === ViewState.MANAGE
                          ? 'bg-law-600 text-white font-medium'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Database size={12} />
                      <span>จัดการ</span>
                    </button>
                  )}
                  {currentUser.picture ? (
                    <img src={currentUser.picture} alt="" className="w-7 h-7 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <UserCircle size={22} className="text-slate-400" />
                  )}
                  <button onClick={logout} className="p-1 text-slate-400 hover:text-red-500" title="ออกจากระบบ">
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-law-600 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors"
                >
                  <UserCircle size={16} />
                  <span>เข้าสู่ระบบ</span>
                </button>
              )}
              <button onClick={() => setView(ViewState.SETTINGS)} className="p-1 text-gray-500 dark:text-gray-400">
                <Settings size={20}/>
              </button>
            </div>
          </header>

          {view === ViewState.BOOKSHELF && (
            <div className="p-4">
              <h2 className="text-2xl font-bold">ห้องสมุดกฎหมาย</h2>
              <p className="text-gray-500 mt-1">เลือกกฎหมายที่ต้องการศึกษา</p>
            </div>
          )}

          {view === ViewState.MANAGE && (
            <div className="p-4">
              <AdminLoginGuard>
                <LawManager books={books} onChanged={refresh}/>
              </AdminLoginGuard>
            </div>
          )}

          {activeBook && view !== ViewState.MANAGE && view !== ViewState.ADD && (
            <div className="p-4 md:p-0 mb-4 flex items-center gap-3">
              <div 
                className={`w-3 h-10 rounded-full ${activeBook.color?.startsWith('#') ? '' : (activeBook.color || 'bg-law-600')} shrink-0`} 
                style={activeBook.color?.startsWith('#') ? { backgroundColor: activeBook.color } : {}}
              />
              <div>
                <h2 className="text-2xl font-bold">{activeBook.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{activeBook.abbreviation} · {filtered.length} รายการ</p>
              </div>
            </div>
          )}

          <div className="px-4 md:px-0">
            {view === ViewState.BOOKSHELF && <Bookshelf books={books} laws={laws} onSelectBook={selectBook}/>} 
            {view === ViewState.MEMORIZE && <MemorizeHub />}
            {view === ViewState.ADD && <LawEditor initialBookId={activeBookId} onSave={saveLaw} onCancel={() => setView(ViewState.HOME)}/>} 
            {view === ViewState.TOC && <TOCView laws={filtered} onNavigate={scrollTo}/>} 
            {view === ViewState.SETTINGS && <SettingsView settings={settings} onUpdateSettings={updateSettings}/>} 
            {view === ViewState.SEARCH && activeBook && (
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                <input 
                  autoFocus 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  placeholder={`ค้นหาใน ${activeBook.abbreviation}`} 
                  className="w-full pl-10 p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm"
                />
              </div>
            )}
            {(view === ViewState.HOME || view === ViewState.SEARCH || view === ViewState.NOTES || view === ViewState.HIGHLIGHTS) && (
              <div className="space-y-4">
                {filtered.length ? (
                  filtered.map(l => (
                    <LawCard 
                      key={l.id} 
                      law={l} 
                      note={notes[l.id]} 
                      settings={settings} 
                      onSaveNote={saveUserNote} 
                      onDeleteLaw={removeLaw} 
                      onNavigateToSection={navigateLabel} 
                      officialUrl={activeBook?.sourceUrl || ''} 
                      searchQuery={view === ViewState.SEARCH ? query : ''}
                    />
                  ))
                ) : (
                  <div className="py-16 text-center text-gray-500">
                    {view === ViewState.SEARCH ? (query ? 'ไม่พบข้อมูลที่ค้นหา' : 'พิมพ์เพื่อค้นหา') : 'ไม่พบข้อมูลกฎหมาย'}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around p-1">
          {activeBookId ? (
            <>
              <button onClick={() => setView(ViewState.HOME)} className={`p-2 ${view === ViewState.HOME ? 'text-law-600' : 'text-gray-400'}`}><Home size={22}/></button>
              <button onClick={() => setView(ViewState.TOC)} className={`p-2 ${view === ViewState.TOC ? 'text-law-600' : 'text-gray-400'}`}><List size={22}/></button>
              <button onClick={() => setView(ViewState.SEARCH)} className={`p-2 ${view === ViewState.SEARCH ? 'text-law-600' : 'text-gray-400'}`}><Search size={22}/></button>
              <button onClick={() => { setView(ViewState.MEMORIZE); setActiveBookId(null); }} className={`p-2 ${view === ViewState.MEMORIZE ? 'text-purple-600' : 'text-gray-400'}`}><Brain size={22}/></button>
              <button onClick={() => setView(ViewState.SETTINGS)} className={`p-2 ${view === ViewState.SETTINGS ? 'text-law-600' : 'text-gray-400'}`}><Settings size={22}/></button>
            </>
          ) : (
            <>
              <button onClick={back} className={`p-2 ${view === ViewState.BOOKSHELF ? 'text-law-600 font-bold' : 'text-gray-400'}`} title="ห้องสมุด"><Library size={22}/></button>
              <button onClick={() => { setView(ViewState.MEMORIZE); setActiveBookId(null); }} className={`p-2 ${view === ViewState.MEMORIZE ? 'text-purple-600 font-bold' : 'text-gray-400'}`} title="ท่องสอบ"><Brain size={22}/></button>
              <button onClick={() => setView(ViewState.SETTINGS)} className={`p-2 ${view === ViewState.SETTINGS ? 'text-law-600 font-bold' : 'text-gray-400'}`} title="ตั้งค่า"><Settings size={22}/></button>
            </>
          )}
        </nav>

        {/* Login Modal Popup */}
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onSuccess={(u) => {
            setCurrentUser(u);
            setShowLoginModal(false);
          }}
        />

        <SyncErrorBanner />
      </div>
    </HashRouter>
  );
};
export default AppV3;
