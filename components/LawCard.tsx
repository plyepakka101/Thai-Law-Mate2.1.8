import React, { useState, useEffect, useRef } from 'react';
import { LawSection, UserNote, AppSettings } from '../types';
import { getOriginalLaw, getBooks } from '../services/dataService';
import { BookOpen, Edit, Save, Trash2, ExternalLink, Star, Share2, Volume2, Square, Scale, History, Search } from 'lucide-react';
import { SECTION_REF_REGEX, thaiToArabic, createHighlightRegex } from '../utils/textUtils';
import { DiffView } from './DiffView';

interface LawCardProps {
  law: LawSection;
  note?: UserNote;
  settings: AppSettings;
  onSaveNote: (note: UserNote) => void;
  onDeleteLaw?: (id: string) => void;
  onNavigateToSection?: (sectionLabel: string) => void;
  officialUrl?: string;
  searchQuery?: string;
}

export const LawCard: React.FC<LawCardProps> = ({ law, note, settings, onSaveNote, onDeleteLaw, onNavigateToSection, officialUrl, searchQuery }) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState((note && note.text) ? note.text : '');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Diff State
  const [showDiff, setShowDiff] = useState(false);
  const originalContent = law.isCustom ? getOriginalLaw(law.id)?.content : null;
  const hasChanges = law.isCustom && originalContent && originalContent !== law.content;
  
  // Refs for TTS management
  const isLoopingRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isHighlighted = note?.isHighlighted || false;

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      isLoopingRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  // Styling classes based on settings
  const fontFamilyClass = settings.fontStyle === 'traditional' ? 'font-serif' : 'font-sans';
  
  const fontSizeClass = {
      1: 'text-sm leading-6',
      2: 'text-base leading-7',
      3: 'text-lg leading-8',
      4: 'text-xl leading-9',
      5: 'text-2xl leading-10'
  }[settings.fontSize] || 'text-base leading-7';

  const handleSaveNote = () => {
    onSaveNote({
      sectionId: law.id,
      text: noteText,
      updatedAt: Date.now(),
      isHighlighted: isHighlighted
    });
    setIsEditingNote(false);
  };

  const toggleHighlight = () => {
      onSaveNote({
          sectionId: law.id,
          text: (note && note.text) ? note.text : '',
          updatedAt: Date.now(),
          isHighlighted: !isHighlighted
      });
  };

  const handleSearchDika = () => {
      // Find book name
      const books = getBooks();
      const currentBook = books.find(b => b.id === law.bookId);
      
      // If book not found (e.g. custom), try to extract from category or default empty
      let lawName = currentBook ? currentBook.name : '';
      if (!lawName && law.category) {
          lawName = law.category.split(' > ')[0];
      }

      // Open Google Search for Dika related to this section
      const query = `คำพิพากษาศาลฎีกา ${lawName} มาตรา ${thaiToArabic(law.sectionNumber)}`.trim().replace(/\s+/g, ' ');
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  }

  const handlePlayTTS = () => {
    if (!('speechSynthesis' in window)) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการอ่านออกเสียง');
      return;
    }

    if (isPlaying) {
      // Stop playing
      isLoopingRef.current = false;
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Start playing
    setIsPlaying(true);
    isLoopingRef.current = true;

    const speak = () => {
        // Normalize numerals for better TTS pronunciation
        const cleanSection = thaiToArabic(law.sectionNumber);
        const textToRead = `มาตรา ${cleanSection} ${law.content}`;
        
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'th-TH';
        utterance.rate = 1.0;

        // Keep reference to prevent garbage collection
        utteranceRef.current = utterance;

        utterance.onend = () => {
            if (isLoopingRef.current) {
                speak();
            } else {
                setIsPlaying(false);
                utteranceRef.current = null;
            }
        };

        utterance.onerror = (e) => {
            // Ignore errors caused by manual cancellation
            if (e.error === 'canceled' || e.error === 'interrupted') {
                isLoopingRef.current = false;
                setIsPlaying(false);
                return;
            }
            
            console.error("TTS Error code:", e.error);
            isLoopingRef.current = false;
            setIsPlaying(false);
            utteranceRef.current = null;
        };

        window.speechSynthesis.cancel(); // Safety clear
        window.speechSynthesis.speak(utterance);
    };

    speak();
  };

  const handleShare = async () => {
    // Generate a clean link hash
    const cleanSection = thaiToArabic(law.sectionNumber).replace(/\s/g, '');
    const shareLink = `${window.location.origin}${window.location.pathname}#/?s=${cleanSection}`;

    const textToShare = `[Thai Law Mate]
มาตรา ${law.sectionNumber} ${isHighlighted ? '⭐️' : ''}

${law.content}

${(note && note.text) ? `📝 โน้ตของฉัน:\n${note.text}\n` : ''}
🔗 ลิงก์: ${shareLink}
${officialUrl ? `\nอ้างอิง: ${officialUrl}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `มาตรา ${law.sectionNumber}`,
          text: textToShare,
          url: shareLink,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToShare);
        alert('คัดลอกเนื้อหาและโน้ตเรียบร้อยแล้ว');
      } catch (err) {
        alert('ไม่สามารถคัดลอกได้');
      }
    }
  };

  // Helper function to highlight text
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query || !query.trim()) return text;
    
    const regex = createHighlightRegex(query);
    if (!regex) return text;

    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-white rounded px-0.5">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Helper to parse links within a single paragraph string
  const renderParagraphContent = (text: string) => {
      const parts: (string | React.ReactNode)[] = [];
      let lastIndex = 0;
      const regex = new RegExp(SECTION_REF_REGEX.source, 'g'); 
      let match;

      while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
              parts.push(text.substring(lastIndex, match.index));
          }
          
          const fullMatch = match[0];
          const sectionNum = match[1];
          
          parts.push(
              <span 
                key={`${match.index}-${sectionNum}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if(onNavigateToSection) onNavigateToSection(sectionNum);
                }}
                className="text-law-600 dark:text-law-400 font-semibold cursor-pointer hover:underline decoration-law-400 hover:bg-law-50 dark:hover:bg-law-900/50 rounded px-0.5 transition-colors"
              >
                  {fullMatch}
              </span>
          );
          
          lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < text.length) {
          parts.push(text.substring(lastIndex));
      }
      
      // After parsing links, apply highlighting to the string parts
      if (searchQuery && searchQuery.trim()) {
          return parts.map(part => {
              if (typeof part === 'string') {
                  return highlightText(part, searchQuery);
              }
              return part;
          });
      }

      return parts.length > 0 ? parts : [text];
  };

  const paragraphs = law.content.split('\n').filter(p => p.trim().length > 0);

  return (
    <div 
      id={`section-${law.id}`} 
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden mb-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group/card 
        ${isHighlighted 
            ? 'border-yellow-400 ring-1 ring-yellow-100 dark:border-yellow-500/50 dark:ring-yellow-900/20' 
            : 'border-gray-200 dark:border-gray-700'}`}
    >
      {/* Highlight Indicator Strip */}
      {isHighlighted && (
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 dark:bg-yellow-500"></div>
      )}

      {/* Minimal Header for Actions & Metadata */}
      <div className={`px-6 pt-4 flex justify-between items-start transition-colors ${isHighlighted ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''}`}>
        <div className="flex-1 min-w-0 mr-4">
           <div className="flex items-center space-x-2">
                {law.category && (
                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium truncate font-sans">
                        {law.category}
                    </span>
                )}
                {law.isCustom && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center space-x-1 ${hasChanges ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'}`}>
                        <span>{hasChanges ? 'แก้ไขแล้ว' : 'กำหนดเอง'}</span>
                    </span>
                )}
           </div>
        </div>
        
        <div className="flex space-x-2">
            <button 
                onClick={toggleHighlight}
                className={`p-1 transition-all duration-200 hover:scale-110 active:scale-90 ${isHighlighted ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'}`}
                title={isHighlighted ? "เลิกเน้นข้อความ" : "เน้นข้อความสำคัญ"}
            >
                <Star size={20} fill={isHighlighted ? "currentColor" : "none"} />
            </button>
            
           {law.isCustom && onDeleteLaw && (
              <button onClick={() => onDeleteLaw(law.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1 opacity-0 group-hover/card:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90" title="คืนค่าเดิม / ลบ">
                  <Trash2 size={14} />
              </button>
           )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className={`px-4 md:px-8 pb-6 pt-2 ${isHighlighted ? 'bg-yellow-50/10 dark:bg-yellow-900/5' : ''}`}>
        
        {/* Diff Toggle Bar */}
        {hasChanges && (
            <div className="mb-4 flex items-center justify-end">
                 <button 
                    onClick={() => setShowDiff(!showDiff)}
                    className={`text-xs flex items-center px-2 py-1 rounded transition-all duration-200 hover:scale-105 active:scale-95 ${showDiff ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}
                 >
                    <History size={12} className="mr-1" />
                    {showDiff ? 'ซ่อนการแก้ไข' : 'ดูสิ่งที่แก้ไข'}
                 </button>
            </div>
        )}

        {showDiff && originalContent ? (
            <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">เปรียบเทียบกับต้นฉบับ:</div>
                <DiffView original={originalContent} modified={law.content} />
            </div>
        ) : (
            <div className={`text-gray-900 dark:text-gray-100 ${fontSizeClass} ${fontFamilyClass}`}>
            {paragraphs.map((paragraph, index) => (
                <p key={index} className="indent-8 md:indent-10 mb-2 text-justify break-words whitespace-pre-wrap">
                    {index === 0 && (
                        <span className="font-bold inline mr-3">
                        มาตรา {searchQuery ? highlightText(law.sectionNumber, searchQuery) : law.sectionNumber}
                        </span>
                    )}
                    {renderParagraphContent(paragraph)}
                </p>
            ))}
            </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 font-sans">
          <button 
            onClick={() => setIsEditingNote(!isEditingNote)}
            className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${isEditingNote || (note && note.text) ? 'text-law-700 bg-law-50 dark:text-law-300 dark:bg-law-900/50' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Edit size={16} />
            <span>{(note && note.text) ? 'แก้ไขโน้ต' : 'โน้ต'}</span>
          </button>

          <button
            onClick={handleSearchDika}
             className="flex items-center space-x-1 text-sm px-3 py-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
             title="ค้นหาคำพิพากษาศาลฎีกาใน Google"
          >
            <Search size={16} />
            <span>ค้นหาฎีกา</span>
          </button>

          <button 
            onClick={handlePlayTTS}
            className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${isPlaying ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-law-600 dark:hover:text-law-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            {isPlaying ? <Square size={16} fill="currentColor" /> : <Volume2 size={16} />}
            <span>{isPlaying ? 'หยุด' : 'ฟังเสียง'}</span>
          </button>

          <button 
            onClick={handleShare}
            className="flex items-center space-x-1 text-sm px-3 py-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-law-600 dark:hover:text-law-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Share2 size={16} />
            <span>แชร์</span>
          </button>

          {officialUrl && !law.isCustom && (
            <a 
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm px-3 py-1.5 rounded-md text-gray-400 hover:text-law-600 hover:bg-gray-50 transition-all duration-200 hover:scale-105 active:scale-95 ml-auto"
              title="ตรวจสอบกับต้นฉบับ"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {/* Note Editor Area */}
        {(isEditingNote || (note && note.text)) && (
          <div className={`mt-4 ${isEditingNote ? 'block' : (note && note.text) ? 'block' : 'hidden'}`}>
            {isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="บันทึกข้อความ..."
                  className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-law-500 focus:ring-1 focus:ring-law-500 text-base min-h-[100px] resize-none outline-none font-sarabun"
                />
                <div className="flex justify-end space-x-2 font-sans">
                  <button 
                    onClick={() => {
                        setIsEditingNote(false);
                        setNoteText((note && note.text) ? note.text : '');
                    }}
                    className="text-gray-600 dark:text-gray-400 text-sm px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={handleSaveNote}
                    className="bg-law-600 text-white text-sm px-4 py-1.5 rounded-md shadow-sm hover:bg-law-700 flex items-center space-x-1 transition-all hover:scale-105 active:scale-95"
                  >
                    <Save size={14} />
                    <span>บันทึก</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingNote(true)}
                className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-700/50 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group relative shadow-sm"
              >
                 <div className="flex items-start space-x-3">
                    <BookOpen className="text-yellow-700 dark:text-yellow-500 mt-1 flex-shrink-0" size={18} />
                    <p className="text-yellow-900 dark:text-yellow-200 text-base font-sarabun leading-relaxed">{(note && note.text) ? note.text : ''}</p>
                 </div>
                 <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 text-xs text-yellow-800 bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 px-1 rounded font-sans transition-opacity">แก้ไข</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};