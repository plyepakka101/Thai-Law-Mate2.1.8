import React, { useState, useEffect } from 'react';
import { 
  Brain, Sparkles, Flame, CheckCircle2, Clock, Plus, Play, 
  Trash2, BookOpen, Layers, Star, RotateCcw, AlertCircle, Search, X 
} from 'lucide-react';
import { MemorizationDeck, MemorizationItem, MemorizationStats, LawSection } from '../types';
import { 
  fetchDecks, fetchItems, fetchDueItems, getLocalDecks, 
  getLocalItems, getLocalDueItems, getMemorizeStats, 
  saveDeck, deleteDeck, removeItem, addSectionToDeck, onMemorizeDataChanged 
} from '../services/memorizeService';
import { getLaws } from '../services/dataService';
import { formatNextReview } from '../services/srsEngine';
import { thaiToArabic } from '../utils/textUtils';
import { MemorizePlayer } from './MemorizePlayer';

export const MemorizeHub: React.FC = () => {
  const [decks, setDecks] = useState<MemorizationDeck[]>(getLocalDecks());
  const [items, setItems] = useState<MemorizationItem[]>(getLocalItems());
  const [dueItems, setDueItems] = useState<MemorizationItem[]>(getLocalDueItems());
  const [stats, setStats] = useState<MemorizationStats>(getMemorizeStats());
  const [loading, setLoading] = useState(false);

  // Active study session
  const [activeSession, setActiveSession] = useState<{
    items: MemorizationItem[];
    deckTitle: string;
  } | null>(null);

  // Filter & Search in Items List
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedDeckFilter, setSelectedDeckFilter] = useState('all');

  // New deck modal
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newDeckColor, setNewDeckColor] = useState('bg-purple-600');

  // Add Item to Deck Modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addModalTargetDeck, setAddModalTargetDeck] = useState('');
  const [addModalSearch, setAddModalSearch] = useState('');
  const [allLaws, setAllLaws] = useState<LawSection[]>([]);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());

  const reloadData = async () => {
    setLoading(true);
    const [loadedDecks, loadedItems, loadedDue] = await Promise.all([
      fetchDecks(),
      fetchItems(),
      fetchDueItems()
    ]);
    setDecks(loadedDecks);
    setItems(loadedItems);
    setDueItems(loadedDue);
    setStats(getMemorizeStats());
    setLoading(false);
  };

  useEffect(() => {
    reloadData();
    setAllLaws(getLaws());
    return onMemorizeDataChanged(() => {
      setDecks(getLocalDecks());
      setItems(getLocalItems());
      setDueItems(getLocalDueItems());
      setStats(getMemorizeStats());
    });
  }, []);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    await saveDeck({
      name: newDeckName.trim(),
      description: newDeckDesc.trim() || undefined,
      color: newDeckColor
    });
    setNewDeckName('');
    setNewDeckDesc('');
    setShowNewDeckModal(false);
    reloadData();
  };

  const handleDeleteDeck = async (deckId: string, name: string) => {
    if (!window.confirm(`ต้องการลบชุดท่อง "${name}" และรายการทั้งหมดในชุดนี้หรือไม่?`)) return;
    await deleteDeck(deckId);
    reloadData();
  };

  const handleRemoveItem = async (itemId: string, sectionNumber?: string) => {
    if (!window.confirm(`ต้องการนำมาตรา ${sectionNumber || ''} ออกจากชุดท่องสอบหรือไม่?`)) return;
    await removeItem(itemId);
    reloadData();
  };

  const handleOpenAddModal = (deckId?: string) => {
    setAddModalTargetDeck(deckId || decks[0]?.id || '');
    setAddModalSearch('');
    setShowAddItemModal(true);
  };

  const handleAddSectionToDeck = async (law: LawSection) => {
    const targetDeckId = addModalTargetDeck || decks[0]?.id;
    if (!targetDeckId) return;

    await addSectionToDeck(targetDeckId, law.id, `มาตรา ${law.sectionNumber}`);
    setAddedItemIds(prev => new Set(prev).add(law.id));
    reloadData();
  };

  // If in active study session, render player
  if (activeSession) {
    return (
      <MemorizePlayer
        items={activeSession.items}
        deckTitle={activeSession.deckTitle}
        onFinish={() => { setActiveSession(null); reloadData(); }}
        onBack={() => { setActiveSession(null); reloadData(); }}
      />
    );
  }

  // Filter items for the table
  const filteredItems = items.filter(item => {
    if (selectedDeckFilter !== 'all' && item.deckId !== selectedDeckFilter) return false;
    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.trim().toLowerCase();
      const matchSection = (item.sectionNumber || '').toLowerCase().includes(q);
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchContent = (item.content || '').toLowerCase().includes(q);
      if (!matchSection && !matchTitle && !matchContent) return false;
    }
    return true;
  });

  // Filter laws in Add Item modal
  const searchedLaws = allLaws.filter(l => {
    if (!addModalSearch.trim()) return false;
    const q = addModalSearch.trim().toLowerCase();
    const cleanSection = thaiToArabic(l.sectionNumber).toLowerCase();
    const matchSec = cleanSection.includes(q) || l.sectionNumber.includes(q);
    const matchContent = l.content.toLowerCase().includes(q);
    return matchSec || matchContent;
  }).slice(0, 20);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-law-700 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold">
            <Brain size={15} />
            <span>ระบบท่องกฎหมายเพื่อเตรียมสอบ (Active Recall & SRS)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ท่องตัวบทแม่นยำ ไม่ลืมก่อนเข้าห้องสอบ
          </h1>
          <p className="text-purple-100 text-sm leading-relaxed">
            ระบบคำนวณรอบทบทวนอัตโนมัติตามหลักความจำ Spaced Repetition เลือกท่องทีละวรรค เติมคำสำคัญ หรือท่องพร้อมเสียงเฉลย
          </p>
        </div>

        {/* Decorative background element */}
        <div className="absolute right-4 bottom-2 opacity-15 pointer-events-none">
          <Brain size={240} />
        </div>
      </div>

      {/* Stats & Daily Review CTA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">ต้องทบทวนวันนี้</div>
          <div className="text-2xl font-black text-red-500">{dueItems.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">มาตรา</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">กำลังเรียนรู้</div>
          <div className="text-2xl font-black text-amber-500">
            {items.filter(i => i.status === 'learning' || i.status === 'new').length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">มาตรา</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">จำได้ขึ้นใจแล้ว</div>
          <div className="text-2xl font-black text-emerald-600">
            {items.filter(i => i.status === 'mastered').length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">มาตรา</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
          <div className="text-xs font-semibold text-gray-400 mb-1">มาตราในชุดท่อง</div>
          <div className="text-2xl font-black text-law-600">{items.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">มาตรา</div>
        </div>
      </div>

      {/* Start Daily Review Button */}
      {dueItems.length > 0 && (
        <div className="p-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Flame size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                มี {dueItems.length} มาตราที่ถึงกำหนดต้องทบทวนวันนี้!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ทบทวนเพียง 5-10 นาทีต่อวัน ช่วยให้จำตัวบทได้ยาวนานและแม่นยำที่สุด
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSession({ items: dueItems, deckTitle: 'ทบทวนมาตราประจำวัน' })}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 shrink-0"
          >
            <Play size={18} />
            <span>เริ่มทบทวนมาตราวันนี้ ({dueItems.length})</span>
          </button>
        </div>
      )}

      {/* Decks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-law-600" size={22} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">ชุดท่องมาตรา (Decks)</h2>
          </div>
          <button
            onClick={() => setShowNewDeckModal(true)}
            className="py-2 px-3.5 rounded-xl bg-law-600 hover:bg-law-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus size={16} />
            <span>สร้างชุดท่องใหม่</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map(deck => {
            const deckItems = items.filter(i => i.deckId === deck.id);
            const deckDue = deckItems.filter(i => !i.nextReviewAt || new Date(i.nextReviewAt).getTime() <= Date.now());

            return (
              <div
                key={deck.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition group relative overflow-hidden"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`w-3 h-3 rounded-full ${deck.color || 'bg-purple-600'}`} />
                    {deck.isBuiltin ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300">
                        ชุดมาตรฐาน
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteDeck(deck.id, deck.name)}
                        className="text-gray-300 hover:text-red-500 transition"
                        title="ลบชุดท่องนี้"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-law-600 transition">
                    {deck.name}
                  </h3>

                  {deck.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {deck.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    <span className="font-bold text-gray-800 dark:text-gray-200">{deckItems.length}</span> มาตรา
                    {deckDue.length > 0 && (
                      <span className="ml-2 text-red-500 font-bold">(ถึงคิว {deckDue.length})</span>
                    )}
                  </div>

                  <button
                    disabled={deckItems.length === 0}
                    onClick={() => setActiveSession({ items: deckItems, deckTitle: deck.name })}
                    className="py-1.5 px-4 rounded-xl bg-law-50 hover:bg-law-600 text-law-600 hover:text-white dark:bg-law-950/50 dark:text-law-300 dark:hover:bg-law-600 dark:hover:text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Play size={14} />
                    <span>เริ่มท่อง</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Law Section List in Memorize Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="text-law-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              มาตราในระบบท่องสอบ ({filteredItems.length}/{items.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search items */}
            <div className="relative min-w-[180px]">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={itemSearchQuery}
                onChange={e => setItemSearchQuery(e.target.value)}
                placeholder="ค้นหามาตรา..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:border-law-500"
              />
            </div>

            {/* Deck filter dropdown */}
            <select
              value={selectedDeckFilter}
              onChange={e => setSelectedDeckFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:border-law-500"
            >
              <option value="all">ทุกชุดท่อง</option>
              {decks.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <button
              onClick={() => handleOpenAddModal()}
              className="py-1.5 px-3 rounded-xl bg-law-600 hover:bg-law-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm shrink-0"
            >
              <Plus size={14} />
              <span>เพิ่มมาตรา</span>
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 space-y-2">
            <div>ไม่พบมาตราในชุดท่องตามเงื่อนไข</div>
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-1 text-xs font-bold text-law-600 hover:underline"
            >
              <Plus size={14} />
              <span>คลิกที่นี่เพื่อค้นหาและเพิ่มมาตราเข้าชุดท่อง</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {filteredItems.map(item => {
              const reviewStatus = formatNextReview(item.nextReviewAt);
              const deck = decks.find(d => d.id === item.deckId);

              return (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-gray-50/50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-law-600 shrink-0">ม. {item.sectionNumber}</span>
                    <div className="min-w-0">
                      <div className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-xs sm:max-w-md">
                        {item.title || item.content?.slice(0, 60)}...
                      </div>
                      {deck && (
                        <div className="text-[10px] text-gray-400 truncate">
                          ชุด: {deck.name}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className={`font-semibold hidden sm:inline ${reviewStatus.color}`}>
                      {reviewStatus.label}
                    </span>
                    <button
                      onClick={() => setActiveSession({ items: [item], deckTitle: `ท่องมาตรา ${item.sectionNumber}` })}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-law-600 hover:text-white transition"
                      title="ท่องมาตรานี้ทันที"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id, item.sectionNumber)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                      title="ลบมาตรานี้ออกจากชุดท่อง"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="text-law-600" size={18} />
                <span>เพิ่มมาตราเข้าชุดท่องสอบ</span>
              </h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">เลือกชุดท่องเป้าหมาย</label>
                <select
                  value={addModalTargetDeck}
                  onChange={e => setAddModalTargetDeck(e.target.value)}
                  className="w-full p-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-law-500"
                >
                  {decks.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ค้นหากฎหมาย</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={addModalSearch}
                    onChange={e => setAddModalSearch(e.target.value)}
                    placeholder="พิมพ์เลขมาตรา เช่น 288, 59 หรือคำสำคัญ เช่น โดยเจตนา..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-law-500"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 divide-y divide-gray-100 dark:divide-gray-700">
              {!addModalSearch.trim() ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  พิมพ์เลขมาตราหรือเนื้อหาเพื่อค้นหากฎหมายที่ต้องการท่อง
                </div>
              ) : searchedLaws.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  ไม่พบมาตราที่ตรงกับคำค้นหา
                </div>
              ) : (
                searchedLaws.map(law => {
                  const alreadyInThisDeck = items.some(i => i.deckId === addModalTargetDeck && i.sectionId === law.id) || addedItemIds.has(law.id);

                  return (
                    <div key={law.id} className="pt-2 pb-2 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-law-600">ม. {law.sectionNumber}</span>
                          {(law.category || law.bookId) && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                              {law.category ? law.category.split(' > ')[0] : law.bookId}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {law.content}
                        </p>
                      </div>

                      <div className="shrink-0 pt-1">
                        {alreadyInThisDeck ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-bold px-2 py-1 rounded bg-green-50 dark:bg-green-950">
                            <CheckCircle2 size={12} /> เพิ่มแล้ว
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddSectionToDeck(law)}
                            className="px-3 py-1 rounded-lg bg-law-600 hover:bg-law-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm"
                          >
                            <Plus size={13} />
                            <span>เพิ่ม</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="py-2 px-5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Deck Modal */}
      {showNewDeckModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold">สร้างชุดท่องกฎหมายใหม่</h3>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อชุดท่อง *</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={e => setNewDeckName(e.target.value)}
                  placeholder="เช่น มาตราสำคัญ อาญา ภาค 2, ฎีกาเด็ด ป.วิ.อ."
                  className="w-full p-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-law-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">คำอธิบาย</label>
                <input
                  type="text"
                  value={newDeckDesc}
                  onChange={e => setNewDeckDesc(e.target.value)}
                  placeholder="เช่น เตรียมสอบเนติบัณฑิต สมัย 77"
                  className="w-full p-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none focus:border-law-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDeckModal(false)}
                  className="py-2 px-4 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-law-600 hover:bg-law-700 text-white text-sm font-bold shadow-md transition"
                >
                  สร้างชุดท่อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
