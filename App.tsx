import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { ViewState, LawSection, UserNote, AppSettings, LawBook } from './types';
import { getLaws, getNotes, saveNote, saveCustomLaw, deleteCustomLaw, getSettings, saveSettings, getBooks } from './services/dataService';
import { LawCard } from './components/LawCard';
import { LawEditor } from './components/LawEditor';
import { TOCView } from './components/TOCView';
import { SettingsView } from './components/SettingsView';
import { Bookshelf } from './components/Bookshelf';
import { Home, Search, BookMarked, PlusSquare, Scale, ExternalLink, List, Star, Settings, Library, ChevronLeft, Info } from 'lucide-react';
import { normalizeSearchQuery, thaiToArabic } from './utils/textUtils';

const OFFICIAL_SOURCE_URL = 'https://searchlaw.ocs.go.th/council-of-state/#/public/doc/cGFqZ1lmZFpjSzUyM3BFY0Z2TVJ0Zz09';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.BOOKSHELF);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  
  const [laws, setLaws] = useState<LawSection[]>([]);
  const [notes, setNotes] = useState<Record<string, UserNote>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AppSettings>({ darkMode: false, fontSize: 2, fontStyle: 'modern' });
  
  const books = useMemo(() => getBooks(), []);
  const activeBook = useMemo(() => books.find(b => b.id === activeBookId), [activeBookId, books]);

  // Initial Data Load
  useEffect(() => {
    setLaws(getLaws());
    setNotes(getNotes());
    const savedSettings = getSettings();
    setSettings(savedSettings);
  }, []);

  // Parse deep link for sharing
  useEffect(() => {
      const handleHashChange = () => {
          const hash = window.location.hash;
          if (hash.includes('?s=')) {
              const params = new URLSearchParams(hash.split('?')[1]);
              const section = params.get('s');
              if (section) {
                  // Need to determine which book this section belongs to if possible
                  // For now, deep linking might default to search or handle differently
                  // Simplified: If section exists in current laws, navigate.
                  setTimeout(() => {
                      navigateToSectionLabel(section);
                  }, 500);
              }
          }
      };
      handleHashChange();
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [laws]); 

  // Apply Dark Mode effect
  useEffect(() => {
      if (settings.darkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [settings.darkMode]);

  const handleSaveNote = (note: UserNote) => {
    const updatedNotes = saveNote(note);
    setNotes({...updatedNotes});
  };

  const handleSaveLaw = (newLawData: Omit<LawSection, 'id'> & { id?: string }) => {
    const saved = saveCustomLaw({
      ...newLawData,
      bookId: newLawData.bookId || activeBookId || 'custom'
    });
    setLaws(getLaws()); 
    setView(ViewState.HOME); 
    
    // If we edited a specific law, scroll to it
    setTimeout(() => {
        if(saved.id) scrollToSection(saved.id);
    }, 100);
  };

  const handleDeleteLaw = (id: string) => {
      if(window.confirm('ต้องการคืนค่าเดิม (หรือลบ) กฎหมายข้อนี้ใช่หรือไม่?')) {
          deleteCustomLaw(id);
          setLaws(getLaws());
      }
  }

  const handleCancelEdit = () => {
      // If we were in a book, go back to home, else bookshelf
      if (activeBookId) {
          setView(ViewState.HOME);
      } else {
          setView(ViewState.BOOKSHELF);
      }
  }

  const handleUpdateSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      saveSettings(newSettings);
  }

  const openOfficialSource = () => {
    const url = activeBook?.sourceUrl || OFFICIAL_SOURCE_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBookSelect = (bookId: string) => {
    setActiveBookId(bookId);
    setView(ViewState.HOME);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToBookshelf = () => {
    setActiveBookId(null);
    setView(ViewState.BOOKSHELF);
    setSearchQuery('');
  };

  const scrollToSection = useCallback((id: string) => {
      // Ensure we are in HOME view
      if (view !== ViewState.HOME) {
          setView(ViewState.HOME);
      }
      setSearchQuery(''); 
      
      setTimeout(() => {
          const element = document.getElementById(`section-${id}`);
          if (element) {
              const headerOffset = 90; 
              const elementPosition = element.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.scrollY - headerOffset;

              window.scrollTo({
                  top: offsetPosition,
                  behavior: "smooth"
              });

              element.classList.add('ring-2', 'ring-law-500', 'shadow-lg', 'scale-[1.02]', 'z-10', 'bg-law-50', 'dark:bg-law-900/40');
              
              setTimeout(() => {
                   element.classList.remove('ring-2', 'ring-law-500', 'shadow-lg', 'scale-[1.02]', 'z-10', 'bg-law-50', 'dark:bg-law-900/40');
              }, 1500);
          }
      }, 200);
  }, [view]);

  const navigateToSectionLabel = useCallback((sectionLabel: string) => {
     const targetNum = thaiToArabic(sectionLabel).replace(/\s+/g, '').toLowerCase();
     
     // Search globally if no active book, or within active book
     const targetLaw = laws.find(l => {
         if (activeBookId && l.bookId !== activeBookId) return false;
         const lNum = thaiToArabic(l.sectionNumber).replace(/\s+/g, '').toLowerCase();
         return lNum === targetNum;
     });

     if (targetLaw) {
         scrollToSection(targetLaw.id);
     }
  }, [laws, activeBookId, scrollToSection]);

  // Filtering Logic
  const filteredLaws = useMemo(() => {
    // 1. Filter by Book first (unless we want global search features later)
    let scopeLaws = laws;
    if (activeBookId) {
        scopeLaws = laws.filter(l => l.bookId === activeBookId);
    } else {
        if (view === ViewState.BOOKSHELF) return [];
    }

    if (view === ViewState.NOTES) {
      return scopeLaws.filter(law => {
          const note = notes[law.id];
          return note && note.text && note.text.trim().length > 0;
      });
    }

    if (view === ViewState.HIGHLIGHTS) {
        return scopeLaws.filter(law => notes[law.id]?.isHighlighted);
    }

    if (!searchQuery.trim() && view !== ViewState.SEARCH) {
      return scopeLaws; 
    }
    
    if (!searchQuery.trim() && view === ViewState.SEARCH) {
        return []; 
    }

    const q = normalizeSearchQuery(searchQuery);
    
    return scopeLaws.filter(law => {
      const sectionNum = normalizeSearchQuery(law.sectionNumber);
      const content = normalizeSearchQuery(law.content);
      const category = law.category ? normalizeSearchQuery(law.category) : '';
      return sectionNum.includes(q) || content.includes(q) || category.includes(q);
    });
  }, [laws, notes, searchQuery, view, activeBookId]);

  const NavItem = ({ targetView, icon: Icon, label, onClick }: { targetView?: ViewState, icon: any, label: string, onClick?: () => void }) => (
    <button
      onClick={() => {
          if (onClick) onClick();
          else if (targetView) {
              setView(targetView);
              if(targetView !== ViewState.SEARCH) setSearchQuery('');
          }
      }}
      className={`flex flex-col items-center justify-center w-full py-2 space-y-1 transition-colors ${view === targetView ? 'text-law-600 dark:text-law-400' : 'text-gray-400 dark:text-gray-500 hover:text-law-500'}`}
    >
      <Icon size={24} strokeWidth={view === targetView ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 md:pb-0 flex flex-col md:flex-row transition-colors duration-200">
        
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0">
          <div className="p-6 flex items-center space-x-3 border-b border-gray-100 dark:border-gray-700">
            <div className="bg-law-600 text-white p-2 rounded-lg">
              <Scale size={24} />
            </div>
            <h1 className="text-xl font-bold text-law-900 dark:text-law-100 font-sans">Thai Law Mate</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
                onClick={handleBackToBookshelf}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all font-sans ${view === ViewState.BOOKSHELF ? 'bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
                <Library size={20} />
                <span>ห้องสมุดกฎหมาย</span>
            </button>
            
            {activeBookId && (
                <>
                    <div className="pt-2 pb-1 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {activeBook?.abbreviation || 'เมนูหลัก'}
                    </div>
                    {[
                    { v: ViewState.HOME, l: 'เนื้อหา', i: Home },
                    { v: ViewState.TOC, l: 'สารบัญ', i: List },
                    { v: ViewState.SEARCH, l: 'ค้นหา', i: Search },
                    { v: ViewState.HIGHLIGHTS, l: 'รายการสำคัญ', i: Star },
                    { v: ViewState.NOTES, l: 'บันทึกของฉัน', i: BookMarked },
                    { v: ViewState.ADD, l: 'แก้ไข/เพิ่มเติม', i: PlusSquare },
                    ].map((item) => (
                    <button
                        key={item.v}
                        onClick={() => {
                            setView(item.v);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all font-sans ${view === item.v ? 'bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <item.i size={20} />
                        <span>{item.l}</span>
                    </button>
                    ))}
                </>
            )}
            
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                 <button
                    onClick={() => setView(ViewState.SETTINGS)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all font-sans ${view === ViewState.SETTINGS ? 'bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <Settings size={20} />
                    <span>ตั้งค่า</span>
                </button>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 max-w-3xl mx-auto w-full md:p-6">
          
          {/* Mobile Header */}
          <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20 p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
             {view === ViewState.BOOKSHELF ? (
                <div className="flex items-center space-x-2" onClick={() => setView(ViewState.BOOKSHELF)}>
                    <Scale className="text-law-600" size={24} />
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 font-sans">Thai Law Mate</h1>
                </div>
             ) : (
                 <div className="flex items-center space-x-2 overflow-hidden">
                    <button onClick={handleBackToBookshelf} className="mr-1 text-gray-500">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-gray-800 dark:text-gray-100 font-sans truncate max-w-[200px]">
                            {activeBook?.name}
                        </h1>
                        <span className="text-[10px] text-gray-500">{activeBook?.abbreviation}</span>
                    </div>
                 </div>
             )}
            <div className="flex items-center space-x-2">
                 <button 
                    onClick={() => setView(ViewState.SETTINGS)}
                    className={`p-2 rounded-full ${view === ViewState.SETTINGS ? 'bg-law-50 dark:bg-law-900/30 text-law-600' : 'text-gray-500 dark:text-gray-400'}`}
                 >
                    <Settings size={20} />
                 </button>
            </div>
          </header>

          {/* Dynamic Header / Title Bar */}
          {view !== ViewState.BOOKSHELF && activeBook && view !== ViewState.ADD && (
             <div className="p-4 md:p-0 md:mb-6 sticky md:static top-[60px] z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur md:bg-transparent font-sans">
                {view === ViewState.HOME && (
                <div className="space-y-3">
                    <div className="flex flex-col">
                        <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 hidden md:block">{activeBook.name}</h2>
                                {activeBook.lastUpdated && (
                                    <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
                                        <Info size={12} />
                                        <span>ข้อมูล ณ วันที่ {activeBook.lastUpdated}</span>
                                    </div>
                                )}
                             </div>
                             
                             <button 
                                onClick={openOfficialSource}
                                className="hidden md:flex items-center space-x-1 text-xs text-law-600 dark:text-law-400 bg-law-50 dark:bg-law-900/50 px-2 py-1 rounded hover:bg-law-100 dark:hover:bg-law-900/80 transition-colors"
                            >
                                <span>ฉบับล่าสุดจากกฤษฎีกา</span>
                                <ExternalLink size={10} />
                             </button>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 md:mt-0">เรียกดูมาตราทั้งหมด ({filteredLaws.length} มาตรา)</p>
                    </div>
                    
                     {/* Mobile Only Official Link */}
                     <div className="md:hidden">
                        <button 
                                onClick={openOfficialSource}
                                className="flex w-full justify-center items-center space-x-2 text-xs text-law-600 dark:text-law-400 bg-law-50 dark:bg-law-900/50 px-3 py-2 rounded hover:bg-law-100 dark:hover:bg-law-900/80 transition-colors"
                            >
                                <span>ตรวจสอบฉบับล่าสุดจากกฤษฎีกา</span>
                                <ExternalLink size={12} />
                        </button>
                     </div>
                </div>
                )}
                
                {view === ViewState.NOTES && (
                <div className="flex flex-col space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">บันทึกของฉัน</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{activeBook.abbreviation} - {filteredLaws.length} รายการ</p>
                </div>
                )}
                
                {view === ViewState.HIGHLIGHTS && (
                <div className="flex flex-col space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-yellow-600 dark:text-yellow-500 flex items-center">
                        <Star className="mr-2" fill="currentColor" />
                        รายการสำคัญ
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{activeBook.abbreviation} - {filteredLaws.length} รายการ</p>
                </div>
                )}

                {view === ViewState.TOC && (
                <div className="flex flex-col space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">สารบัญ</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">เลือกหัวข้อเพื่อไปยังส่วนที่ต้องการ</p>
                </div>
                )}

                {view === ViewState.SEARCH && (
                <div className="relative">
                    <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`ค้นหาใน ${activeBook.abbreviation} (เช่น 288) หรือ เนื้อหา...`}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-0 shadow-md text-gray-800 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-law-400 outline-none"
                    />
                    <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                </div>
                )}
            </div>
          )}
          
          {view === ViewState.BOOKSHELF && (
             <div className="p-4 md:p-0 md:mb-8">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center md:text-left">ห้องสมุดกฎหมาย</h2>
                 <p className="text-gray-500 text-center md:text-left mt-2">เลือกกฎหมายที่ต้องการศึกษา</p>
             </div>
          )}

          {/* Content Feed */}
          <div className="px-4 md:px-0 space-y-4">
            {view === ViewState.BOOKSHELF && (
                <Bookshelf books={books} laws={laws} onSelectBook={handleBookSelect} />
            )}

            {view === ViewState.ADD && (
              <LawEditor 
                initialBookId={activeBookId}
                onSave={handleSaveLaw} 
                onCancel={handleCancelEdit}
              />
            )}
            
            {view === ViewState.TOC && (
               <TOCView laws={filteredLaws} onNavigate={scrollToSection} />
            )}

            {view === ViewState.SETTINGS && (
               <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} />
            )}
            
            {(view === ViewState.HOME || view === ViewState.SEARCH || view === ViewState.NOTES || view === ViewState.HIGHLIGHTS) && (
              <>
                {filteredLaws.length > 0 ? (
                  filteredLaws.map(law => (
                    <LawCard
                      key={law.id}
                      law={law}
                      note={notes[law.id]}
                      settings={settings}
                      onSaveNote={handleSaveNote}
                      onDeleteLaw={handleDeleteLaw}
                      onNavigateToSection={navigateToSectionLabel}
                      officialUrl={activeBook?.sourceUrl || OFFICIAL_SOURCE_URL}
                      searchQuery={view === ViewState.SEARCH ? searchQuery : ''}
                    />
                  ))
                ) : (
                  <div className="text-center py-20">
                    <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      {view === ViewState.SEARCH ? <Search className="text-gray-400" size={32}/> : 
                       view === ViewState.HIGHLIGHTS ? <Star className="text-gray-400" size={32} /> :
                       <BookMarked className="text-gray-400" size={32} />}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-sans">
                      {view === ViewState.SEARCH 
                        ? (searchQuery ? "ไม่พบข้อมูลที่ค้นหา" : "พิมพ์เพื่อเริ่มค้นหา") 
                        : view === ViewState.NOTES 
                          ? "คุณยังไม่มีบันทึกในเล่มนี้" 
                          : view === ViewState.HIGHLIGHTS 
                          ? "คุณยังไม่ได้เน้นข้อความสำคัญในเล่มนี้"
                          : "ไม่พบข้อมูลกฎหมาย"}
                    </p>
                     {view === ViewState.SEARCH && searchQuery && (
                        <button 
                            onClick={openOfficialSource}
                            className="mt-4 text-law-600 dark:text-law-400 hover:underline text-sm"
                        >
                            ค้นหาต่อในฐานข้อมูลกฤษฎีกา
                        </button>
                     )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center px-2 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {activeBookId ? (
                <>
                    <NavItem targetView={ViewState.HOME} icon={Home} label="เนื้อหา" />
                    <NavItem targetView={ViewState.TOC} icon={List} label="สารบัญ" />
                    <NavItem targetView={ViewState.HIGHLIGHTS} icon={Star} label="สำคัญ" />
                    <NavItem targetView={ViewState.SEARCH} icon={Search} label="ค้นหา" />
                </>
            ) : (
                // Simple nav for bookshelf view
                 <>
                    <NavItem targetView={ViewState.BOOKSHELF} icon={Library} label="ห้องสมุด" />
                    <NavItem targetView={ViewState.SETTINGS} icon={Settings} label="ตั้งค่า" />
                 </>
            )}
        </nav>
      </div>
    </HashRouter>
  );
};

export default App;