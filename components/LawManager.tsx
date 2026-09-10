import React, { useMemo, useRef, useState } from 'react';
import { BookPlus, Upload, FileJson, FileText, FileCode2, Save, Trash2, RefreshCw, Database, AlertCircle, Check, Palette } from 'lucide-react';
import { LawBook, LawSection } from '../types';
import { deleteCustomBook, getCustomBooks, saveCustomBook, saveCustomLaw, updateBookColor } from '../services/dataService';
import { parseLaws } from '../services/lawParser';

interface Props { books: LawBook[]; onChanged: () => void; }

type ImportPreview = { name: string; abbreviation: string; content: string; laws: LawSection[] };

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || `book-${Date.now()}`;

export const COLOR_OPTIONS = [
  { name: 'Red', value: 'bg-red-500', hex: '#ef4444' },
  { name: 'Blue', value: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'Green', value: 'bg-green-500', hex: '#22c55e' },
  { name: 'Yellow', value: 'bg-yellow-500', hex: '#eab308' },
  { name: 'Purple', value: 'bg-purple-500', hex: '#a855f7' },
  { name: 'Indigo', value: 'bg-indigo-500', hex: '#6366f1' },
  { name: 'Pink', value: 'bg-pink-500', hex: '#ec4899' },
  { name: 'Teal', value: 'bg-teal-500', hex: '#14b8a6' },
  { name: 'Orange', value: 'bg-orange-500', hex: '#f97316' },
  { name: 'Slate', value: 'bg-slate-600', hex: '#475569' },
];

export const LawManager: React.FC<Props> = ({ books, onChanged }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [color, setColor] = useState('bg-blue-500');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingColorBookId, setEditingColorBookId] = useState<string | null>(null);

  const customBooks = useMemo(() => getCustomBooks(), [books]);

  const clearForm = () => {
    setName(''); setAbbreviation(''); setDescription(''); setSourceUrl(''); setLastUpdated(''); setColor('bg-blue-500'); setContent(''); setPreview(null); setMessage('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const buildPreview = (text: string, suggestedName?: string) => {
    const clean = text.replace(/\r\n/g, '\n').trim();
    const bookName = name.trim() || suggestedName || 'กฎหมายใหม่';
    const bookId = `preview-${slugify(bookName)}`;
    const laws = parseLaws(clean, bookId, bookName);
    setContent(clean);
    setPreview({ name: bookName, abbreviation: abbreviation.trim() || 'กำหนดเอง', content: clean, laws });
    setMessage(laws.length ? `ตรวจพบ ${laws.length} มาตรา` : 'ยังตรวจไม่พบคำว่า “มาตรา …” โปรดตรวจรูปแบบข้อมูล');
  };

  const handleFile = async (file: File) => {
    setBusy(true); setMessage('กำลังอ่านไฟล์…');
    try {
      const text = await file.text();
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'json') {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          const laws = data as LawSection[];
          const inferredName = name || 'กฎหมายนำเข้า';
          const raw = laws.map(l => `มาตรา ${l.sectionNumber} ${l.content}`).join('\n');
          setName(inferredName); setContent(raw); setPreview({ name: inferredName, abbreviation: abbreviation || 'กำหนดเอง', content: raw, laws });
          setMessage(`อ่าน JSON สำเร็จ ${laws.length} มาตรา`);
        } else {
          const book = data.book || data;
          const raw = book.content || '';
          setName(book.name || name); setAbbreviation(book.abbreviation || abbreviation); setDescription(book.description || description); setSourceUrl(book.sourceUrl || sourceUrl); setLastUpdated(book.lastUpdated || lastUpdated);
          if (book.color) setColor(book.color);
          const laws = Array.isArray(data.laws) ? data.laws : parseLaws(raw, `preview-${Date.now()}`, book.name || 'กฎหมายใหม่');
          setContent(raw); setPreview({ name: book.name || name || 'กฎหมายใหม่', abbreviation: book.abbreviation || abbreviation || 'กำหนดเอง', content: raw, laws });
          setMessage(`อ่าน JSON สำเร็จ ${laws.length} มาตรา`);
        }
      } else {
        buildPreview(text, file.name.replace(/\.(txt|html?|md)$/i, ''));
      }
    } catch (error) {
      setMessage(`นำเข้าไม่สำเร็จ: ${error instanceof Error ? error.message : 'ไฟล์ไม่ถูกต้อง'}`);
    } finally { setBusy(false); }
  };

  const handleSave = () => {
    const finalName = name.trim() || preview?.name || '';
    const finalContent = content.trim() || preview?.content || '';
    if (!finalName || !finalContent) { setMessage('กรุณาระบุชื่อกฎหมายและเนื้อหา'); return; }
    const id = `custom-book-${slugify(finalName)}-${Date.now()}`;
    const book = saveCustomBook({ 
      id, 
      name: finalName, 
      abbreviation: abbreviation.trim() || preview?.abbreviation || 'กำหนดเอง', 
      description: description.trim() || 'กฎหมายที่ผู้ใช้เพิ่มเอง', 
      sourceUrl: sourceUrl.trim() || undefined, 
      lastUpdated: lastUpdated.trim() || undefined, 
      color: color || 'bg-law-600', 
      content: finalContent, 
      isCustom: true 
    });
    const laws = parseLaws(finalContent, book.id, book.name);
    laws.forEach(law => saveCustomLaw(law));
    onChanged();
    setMessage(`บันทึก “${book.name}” แล้ว ${laws.length} มาตรา`);
    clearForm();
  };

  const removeBook = (id: string, bookName: string) => {
    if (!window.confirm(`ต้องการลบ “${bookName}” และข้อมูลมาตราทั้งหมดของเล่มนี้หรือไม่?`)) return;
    deleteCustomBook(id); onChanged(); setMessage(`ลบ ${bookName} แล้ว`);
  };

  const handleChangeBookColor = (bookId: string, newColor: string) => {
    updateBookColor(bookId, newColor);
    onChanged();
    setEditingColorBookId(null);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-3 rounded-xl bg-law-50 dark:bg-law-900/40 text-law-600"><BookPlus size={25}/></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการกฎหมาย V3</h2>
            <p className="text-sm text-gray-500 mt-1">เพิ่มกฎหมายทั้งเล่ม กำหนดสีสัญลักษณ์ และนำเข้าข้อมูลไฟล์ TXT / HTML / JSON</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อกฎหมาย *" className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"/>
          <input value={abbreviation} onChange={e=>setAbbreviation(e.target.value)} placeholder="ชื่อย่อ เช่น พ.ร.บ. ..." className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"/>
          <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="คำอธิบาย" className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"/>
          <input value={lastUpdated} onChange={e=>setLastUpdated(e.target.value)} placeholder="ข้อมูล ณ วันที่" className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"/>
          <input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="URL แหล่งข้อมูลทางการ (ถ้ามี)" className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm md:col-span-2"/>
          
          {/* Color Picker (Similar to Deka Search) */}
          <div className="space-y-2 md:col-span-2 p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Palette size={16} className="text-law-600" />
              <span>สีสัญลักษณ์ของกฎหมาย</span>
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {COLOR_OPTIONS.map(c => {
                const isSelected = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-full ${c.value} flex items-center justify-center transition-transform hover:scale-110 focus:outline-none ${isSelected ? 'ring-2 ring-offset-2 ring-law-500 shadow-md scale-105' : ''}`}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
              
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1"></div>
              
              {/* Custom Color Picker Input */}
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 shadow-sm transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-law-500" title="เลือกสีอื่นๆ (กำหนดเอง)">
                <input
                  type="color"
                  value={color.startsWith('#') ? color : '#3b82f6'}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 w-16 h-16 -top-2 -left-2 cursor-pointer border-0 p-0"
                />
                {color.startsWith('#') && <Check className="w-4 h-4 text-white absolute pointer-events-none drop-shadow-md" />}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {color.startsWith('#') ? `สีกำหนดเอง: ${color}` : 'เลือกสีหลักหรือกดปุ่มเพื่อกำหนดรหัสสีเอง'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".txt,.json,.html,.htm,.md,text/plain,application/json,text/html" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(e.target.files[0])}/>
          <button onClick={()=>fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 font-semibold text-sm"><Upload size={18}/> นำเข้าไฟล์</button>
          <button onClick={()=>buildPreview(content)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-law-200 text-law-700 dark:text-law-300 text-sm"><RefreshCw size={18}/> วิเคราะห์มาตรา</button>
        </div>
        <textarea value={content} onChange={e=>{setContent(e.target.value);setPreview(null)}} placeholder={'วางตัวบทกฎหมายได้ที่นี่\nมาตรา 1 ...\nมาตรา 2 ...\nหมวด 1 ...'} className="mt-4 w-full min-h-[240px] p-4 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 font-sarabun leading-relaxed text-sm"/>
        {message && <div className="mt-3 flex items-start gap-2 text-sm text-law-700 dark:text-law-300"><AlertCircle size={17} className="mt-0.5"/>{message}</div>}
        {preview && <div className="mt-4 rounded-xl bg-law-50 dark:bg-law-900/20 p-4"><b>ตัวอย่างก่อนบันทึก</b><div className="text-sm mt-1">{preview.name} · ตรวจพบ {preview.laws.length} มาตรา</div>{preview.laws.slice(0,5).map(l=><div key={l.id} className="text-xs mt-1">มาตรา {l.sectionNumber} — {l.content.slice(0,90)}{l.content.length>90?'…':''}</div>)}</div>}
        <div className="mt-5 flex gap-2">
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-law-600 text-white font-bold hover:bg-law-700 text-sm shadow-sm"><Save size={19}/> บันทึกกฎหมายทั้งเล่ม</button>
          <button onClick={clearForm} className="px-5 py-3 rounded-lg border dark:border-gray-600 text-sm">ล้าง</button>
        </div>
      </div>

      {/* Book Management & Color Customization for All Books */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-law-600"/>
            <h3 className="text-lg font-bold">กำหนดสีและจัดการเล่มกฎหมายในระบบ</h3>
          </div>
          <span className="text-xs text-gray-500">{books.length} เล่มทั้งหมด</span>
        </div>

        <div className="space-y-3">
          {books.map(book => {
            const isHex = book.color?.startsWith('#');
            const colorClass = isHex ? '' : (book.color || 'bg-gray-500');
            const colorStyle = isHex ? { backgroundColor: book.color } : {};
            const isEditingColor = editingColorBookId === book.id;

            return (
              <div key={book.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-10 h-10 rounded-lg ${colorClass} text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0`}
                    style={colorStyle}
                  >
                    {book.abbreviation.slice(0, 4)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{book.name}</span>
                      {book.isCustom ? (
                        <span className="px-2 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded font-medium">เพิ่มเอง</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded font-medium">กฎหมายหลัก</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{book.abbreviation} · {book.description || 'ไม่มีคำอธิบาย'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Color Selector Popover / Trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setEditingColorBookId(isEditingColor ? null : book.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium"
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${colorClass}`} style={colorStyle}></span>
                      <span>เปลี่ยนสี</span>
                    </button>

                    {isEditingColor && (
                      <div className="absolute right-0 top-10 z-20 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl flex flex-wrap gap-2 w-64 animate-in fade-in zoom-in duration-150">
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-300 w-full mb-1">เลือกสีใหม่สำหรับ {book.abbreviation}</div>
                        {COLOR_OPTIONS.map(c => (
                          <button
                            key={c.value}
                            onClick={() => handleChangeBookColor(book.id, c.value)}
                            className={`w-6 h-6 rounded-full ${c.value} hover:scale-110 transition-transform ${book.color === c.value ? 'ring-2 ring-offset-1 ring-law-500' : ''}`}
                            title={c.name}
                          />
                        ))}
                        <div className="w-full flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-600 mt-1">
                          <label className="text-[11px] text-gray-500 dark:text-gray-300">สีกำหนดเอง:</label>
                          <input
                            type="color"
                            value={isHex ? book.color : '#3b82f6'}
                            onChange={(e) => handleChangeBookColor(book.id, e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {book.isCustom && (
                    <button onClick={()=>removeBook(book.id, book.name)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="ลบเล่มนี้">
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-xs text-gray-500 flex gap-2">
        <FileText size={16} className="shrink-0"/>
        <span>TXT/HTML ใช้ตัวแยก “มาตรา …” ของ Thai-Law-Mate ส่วน JSON รองรับไฟล์สำรอง V3 และข้อมูลกฎหมายแบบ array</span>
      </div>
    </div>
  );
};
