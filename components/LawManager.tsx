import React, { useMemo, useRef, useState } from 'react';
import { BookPlus, Upload, FileJson, FileText, FileCode2, Save, Trash2, RefreshCw, Database, AlertCircle } from 'lucide-react';
import { LawBook, LawSection } from '../types';
import { deleteCustomBook, getCustomBooks, saveCustomBook, saveCustomLaw } from '../services/dataService';
import { parseLaws } from '../services/lawParser';

interface Props { books: LawBook[]; onChanged: () => void; }

type ImportPreview = { name: string; abbreviation: string; content: string; laws: LawSection[] };

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || `book-${Date.now()}`;

export const LawManager: React.FC<Props> = ({ books, onChanged }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const customBooks = useMemo(() => getCustomBooks(), [books]);

  const clearForm = () => {
    setName(''); setAbbreviation(''); setDescription(''); setSourceUrl(''); setLastUpdated(''); setContent(''); setPreview(null); setMessage('');
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
    const book = saveCustomBook({ id, name: finalName, abbreviation: abbreviation.trim() || preview?.abbreviation || 'กำหนดเอง', description: description.trim() || 'กฎหมายที่ผู้ใช้เพิ่มเอง', sourceUrl: sourceUrl.trim() || undefined, lastUpdated: lastUpdated.trim() || undefined, color: 'bg-law-600', content: finalContent, isCustom: true });
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

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-3 rounded-xl bg-law-50 dark:bg-law-900/40 text-law-600"><BookPlus size={25}/></div>
          <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการกฎหมาย V3</h2><p className="text-sm text-gray-500 mt-1">เพิ่มกฎหมายทั้งเล่มแบบเดียวกับระบบนำเข้าข้อมูล: กรอกเองหรืออัปโหลด TXT / HTML / JSON</p></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อกฎหมาย *" className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700"/>
          <input value={abbreviation} onChange={e=>setAbbreviation(e.target.value)} placeholder="ชื่อย่อ เช่น พ.ร.บ. ..." className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700"/>
          <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="คำอธิบาย" className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700"/>
          <input value={lastUpdated} onChange={e=>setLastUpdated(e.target.value)} placeholder="ข้อมูล ณ วันที่" className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700"/>
          <input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="URL แหล่งข้อมูลทางการ (ถ้ามี)" className="p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-700 md:col-span-2"/>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".txt,.json,.html,.htm,.md,text/plain,application/json,text/html" className="hidden" onChange={e=>e.target.files?.[0] && handleFile(e.target.files[0])}/>
          <button onClick={()=>fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 font-semibold"><Upload size={18}/> นำเข้าไฟล์</button>
          <button onClick={()=>buildPreview(content)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-law-200 text-law-700 dark:text-law-300"><RefreshCw size={18}/> วิเคราะห์มาตรา</button>
        </div>
        <textarea value={content} onChange={e=>{setContent(e.target.value);setPreview(null)}} placeholder={'วางตัวบทกฎหมายได้ที่นี่\nมาตรา 1 ...\nมาตรา 2 ...\nหมวด 1 ...'} className="mt-4 w-full min-h-[260px] p-4 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 font-sarabun leading-relaxed"/>
        {message && <div className="mt-3 flex items-start gap-2 text-sm text-law-700 dark:text-law-300"><AlertCircle size={17} className="mt-0.5"/>{message}</div>}
        {preview && <div className="mt-4 rounded-xl bg-law-50 dark:bg-law-900/20 p-4"><b>ตัวอย่างก่อนบันทึก</b><div className="text-sm mt-1">{preview.name} · ตรวจพบ {preview.laws.length} มาตรา</div>{preview.laws.slice(0,5).map(l=><div key={l.id} className="text-xs mt-1">มาตรา {l.sectionNumber} — {l.content.slice(0,90)}{l.content.length>90?'…':''}</div>)}</div>}
        <div className="mt-5 flex gap-2">
          <button onClick={handleSave} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-law-600 text-white font-bold hover:bg-law-700"><Save size={19}/> บันทึกกฎหมายทั้งเล่ม</button>
          <button onClick={clearForm} className="px-5 py-3 rounded-lg border dark:border-gray-600">ล้าง</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4"><Database size={20} className="text-law-600"/><h3 className="text-lg font-bold">กฎหมายที่ผู้ใช้เพิ่ม</h3></div>
        {customBooks.length === 0 ? <p className="text-sm text-gray-500">ยังไม่มีกฎหมายที่เพิ่มเอง</p> : <div className="space-y-3">{customBooks.map(book=> <div key={book.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border dark:border-gray-700"><div><div className="font-bold">{book.name}</div><div className="text-xs text-gray-500">{book.abbreviation} · {parseLaws(book.content, book.id, book.name).length} มาตรา</div></div><button onClick={()=>removeBook(book.id, book.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="ลบ"><Trash2 size={18}/></button></div>)}</div>}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-xs text-gray-500 flex gap-2"><FileText size={16}/><span>TXT/HTML ใช้ตัวแยก “มาตรา …” ของ Thai-Law-Mate ส่วน JSON รองรับไฟล์สำรอง V3 และข้อมูลกฎหมายแบบ array</span><FileJson size={16}/><FileCode2 size={16}/></div>
    </div>
  );
};
