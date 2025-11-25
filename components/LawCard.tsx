
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LawSection, UserNote, AppSettings, TextHighlight } from '../types';
import { getOriginalLaw, getBooks } from '../services/dataService';
import { BookOpen, Edit, Save, Trash2, ExternalLink, Star, Share2, Volume2, Square, Scale, History, Search, Highlighter, X } from 'lucide-react';
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

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'red';

export const LawCard: React.FC<LawCardProps> = ({ law, note, settings, onSaveNote, onDeleteLaw, onNavigateToSection, officialUrl, searchQuery }) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const initialNoteText = (note && note.text) ? note.text : '';
  const [noteText, setNoteText] = useState(initialNoteText);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Diff State
  const [showDiff, setShowDiff] = useState(false);
  const originalContent = law.isCustom ? getOriginalLaw(law.id)?.content : null;
  const hasChanges = law.isCustom && originalContent && originalContent !== law.content;
  
  // Refs for TTS management
  const isLoopingRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Highlighting State
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, start: number, end: number, isExisting?: boolean } | null>(null);

  const isHighlighted = note?.isHighlighted || false;

  useEffect(() => {
    return () => {
      isLoopingRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  // Clear selection menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectionMenu && contentRef.current && !contentRef.current.contains(e.target as Node)) {
         const menuEl = document.getElementById('highlight-menu');
         if (menuEl && menuEl.contains(e.target as Node)) return;
         
         setSelectionMenu(null);
         window.getSelection()?.removeAllRanges();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionMenu]);

  const fontFamilyClass = settings.fontStyle === 'traditional' ? 'font-serif' : 'font-sans';
  
  const fontSizeClass = {
      1: 'text-sm leading-6',
      2: 'text-base leading-7',
      3: 'text-lg leading-8',
      4: 'text-xl leading-9',
      5: 'text-2xl leading-10'
  }[settings.fontSize] || 'text-base leading-7';

  const handleSaveNote = (overrideNoteText?: string, overrideHighlights?: TextHighlight[], overrideIsHighlighted?: boolean) => {
    onSaveNote({
      sectionId: law.id,
      text: overrideNoteText !== undefined ? overrideNoteText : noteText,
      updatedAt: Date.now(),
      isHighlighted: overrideIsHighlighted !== undefined ? overrideIsHighlighted : isHighlighted,
      textHighlights: overrideHighlights !== undefined ? overrideHighlights : note?.textHighlights
    });
    if (overrideNoteText === undefined) setIsEditingNote(false);
  };

  const toggleHighlight = () => {
      handleSaveNote(undefined, undefined, !isHighlighted);
  };

  const handleSearchDika = () => {
      const books = getBooks();
      const currentBook = books.find(b => b.id === law.bookId);
      let lawName = currentBook ? currentBook.name : '';
      if (!lawName && law.category) {
          lawName = law.category.split(' > ')[0];
      }
      const query = `คำพิพากษาศาลฎีกา ${lawName} มาตรา ${thaiToArabic(law.sectionNumber)}`.trim().replace(/\s+/g, ' ');
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  }

  const handlePlayTTS = () => {
    if (!('speechSynthesis' in window)) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการอ่านออกเสียง');
      return;
    }

    if (isPlaying) {
      isLoopingRef.current = false;
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    isLoopingRef.current = true;

    const speak = () => {
        const cleanSection = thaiToArabic(law.sectionNumber);
        const textToRead = `มาตรา ${cleanSection} ${law.content}`;
        
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'th-TH';
        utterance.rate = 1.0;
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
            if (e.error === 'canceled' || e.error === 'interrupted') {
                isLoopingRef.current = false;
                setIsPlaying(false);
                return;
            }
            isLoopingRef.current = false;
            setIsPlaying(false);
            utteranceRef.current = null;
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    speak();
  };

  const handleShare = async () => {
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
        // User cancelled
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

  // --- Text Selection & Highlighting Logic ---

  const getParagraphOffset = (pNode: HTMLElement, targetNode: Node, targetOffset: number) => {
      const range = document.createRange();
      range.selectNodeContents(pNode);
      range.setEnd(targetNode, targetOffset);
      let pOffset = range.toString().length;
      
      // Check for prefix in first paragraph
      const prefixSpan = pNode.querySelector('.law-section-prefix');
      if (prefixSpan) {
          const prefixLen = prefixSpan.textContent?.length || 0;
          pOffset -= prefixLen;
      }
      return Math.max(0, pOffset);
  };

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = contentRef.current;

    if (!container || !container.contains(range.commonAncestorContainer)) {
      setSelectionMenu(null);
      return;
    }

    // Find start and end paragraphs by traversing up from text nodes
    const findP = (node: Node): HTMLElement | null => {
        let curr: Node | null = node;
        while(curr && curr !== container) {
            if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).tagName === 'P' && (curr as HTMLElement).hasAttribute('data-index')) {
                return curr as HTMLElement;
            }
            curr = curr.parentNode;
        }
        return null;
    };

    const startP = findP(range.startContainer);
    const endP = findP(range.endContainer);

    if (!startP || !endP) {
         setSelectionMenu(null);
         return;
    }

    const startPIndex = parseInt(startP.getAttribute('data-index') || '0');
    const endPIndex = parseInt(endP.getAttribute('data-index') || '0');

    const startPOffset = getParagraphOffset(startP, range.startContainer, range.startOffset);
    const endPOffset = getParagraphOffset(endP, range.endContainer, range.endOffset);

    // Calculate global offsets based on law.content structure (split by \n)
    const lines = law.content.split('\n');
    
    const getGlobalOffset = (pIndex: number, pOffset: number) => {
        let global = 0;
        for(let i=0; i<pIndex; i++) {
            global += lines[i].length + 1; // +1 for the newline char
        }
        return global + pOffset;
    };

    const start = getGlobalOffset(startPIndex, startPOffset);
    const end = getGlobalOffset(endPIndex, endPOffset);

    if (start >= end) {
        setSelectionMenu(null);
        return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position relative to the card content container
    const relativeX = (rect.left + rect.width / 2) - containerRect.left;
    const relativeY = rect.top - containerRect.top;

    setSelectionMenu({
      x: relativeX,
      y: relativeY,
      start,
      end,
      isExisting: false
    });

  }, [law.content]);

  const handleHighlightClick = (e: React.MouseEvent, highlight: TextHighlight) => {
      e.stopPropagation();
      if (!contentRef.current) return;
      
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const containerRect = contentRef.current.getBoundingClientRect();
      
      const relativeX = (rect.left + rect.width / 2) - containerRect.left;
      const relativeY = rect.top - containerRect.top;

      setSelectionMenu({
          x: relativeX,
          y: relativeY,
          start: highlight.start,
          end: highlight.end,
          isExisting: true
      });
  };

  const addHighlight = (color: HighlightColor) => {
      if (!selectionMenu) return;
      
      const newHighlight: TextHighlight = {
          start: selectionMenu.start,
          end: selectionMenu.end,
          color
      };
      
      const currentHighlights = note?.textHighlights || [];
      // Remove overlaps
      const updatedHighlights = currentHighlights.filter(h => 
          !(h.start < newHighlight.end && h.end > newHighlight.start)
      );
      
      updatedHighlights.push(newHighlight);
      updatedHighlights.sort((a, b) => a.start - b.start);

      handleSaveNote(undefined, updatedHighlights);
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
  };

  const clearHighlightSelection = () => {
      if (!selectionMenu) return;
      
      const currentHighlights = note?.textHighlights || [];
      const updatedHighlights = currentHighlights.filter(h => 
          !(h.start < selectionMenu.end && h.end > selectionMenu.start)
      );
      
      handleSaveNote(undefined, updatedHighlights);
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
  };

  // --- Advanced Rendering Logic ---

  const getBgClass = (color: string) => {
      switch(color) {
          case 'yellow': return 'bg-yellow-200 dark:bg-yellow-700/50';
          case 'green': return 'bg-green-200 dark:bg-green-700/50';
          case 'blue': return 'bg-blue-200 dark:bg-blue-700/50';
          case 'pink': return 'bg-pink-200 dark:bg-pink-700/50';
          case 'red': return 'bg-red-200 dark:bg-red-700/50';
          default: return 'bg-yellow-200 dark:bg-yellow-700/50';
      }
  };

  const renderContentWithFeatures = () => {
      const text = law.content;
      const highlights = note?.textHighlights || [];
      const paragraphs = text.split('\n');
      
      let globalOffset = 0;

      return paragraphs.map((paraText, pIndex) => {
          const paraStart = globalOffset;
          const paraEnd = globalOffset + paraText.length;
          
          interface Segment {
              start: number;
              end: number;
              type: 'text' | 'highlight' | 'search' | 'link';
              data?: any;
          }
          
          let segments: Segment[] = [];

          // 1. User Highlights
          highlights.forEach(h => {
              const start = Math.max(h.start, paraStart);
              const end = Math.min(h.end, paraEnd);
              if (start < end) {
                  segments.push({ start: start - paraStart, end: end - paraStart, type: 'highlight', data: { color: h.color, original: h } });
              }
          });

          // 2. Search Query
          if (searchQuery && searchQuery.trim()) {
              const regex = createHighlightRegex(searchQuery);
              if (regex) {
                  let match;
                  while ((match = regex.exec(paraText)) !== null) {
                      segments.push({ 
                          start: match.index, 
                          end: match.index + match[0].length, 
                          type: 'search' 
                      });
                  }
              }
          }

          // 3. Section Links
          const linkRegex = new RegExp(SECTION_REF_REGEX.source, 'g');
          let match;
          while ((match = linkRegex.exec(paraText)) !== null) {
              segments.push({
                  start: match.index,
                  end: match.index + match[0].length,
                  type: 'link',
                  data: match[1]
              });
          }

          segments.sort((a, b) => a.start - b.start);

          const points = new Set<number>([0, paraText.length]);
          segments.forEach(s => {
              points.add(s.start);
              points.add(s.end);
          });
          const sortedPoints = Array.from(points).sort((a, b) => a - b);
          
          const renderSegments: React.ReactNode[] = [];
          
          for (let i = 0; i < sortedPoints.length - 1; i++) {
              const pStart = sortedPoints[i];
              const pEnd = sortedPoints[i + 1];
              const segmentText = paraText.substring(pStart, pEnd);
              
              const activeHighlight = segments.find(s => s.type === 'highlight' && s.start <= pStart && s.end >= pEnd);
              const activeSearch = (searchQuery && searchQuery.trim()) ? segments.find(s => s.type === 'search' && s.start <= pStart && s.end >= pEnd) : undefined;
              const activeLink = segments.find(s => s.type === 'link' && s.start <= pStart && s.end >= pEnd);

              let element: React.ReactNode = segmentText;

              if (activeLink) {
                  element = (
                      <span 
                        className="text-law-600 dark:text-law-400 font-semibold cursor-pointer hover:underline decoration-law-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateToSection) onNavigateToSection(activeLink.data);
                        }}
                      >
                          {element}
                      </span>
                  );
              }

              if (activeSearch) {
                  element = (
                      <span className="bg-yellow-400/50 dark:bg-yellow-600/80 rounded px-0.5 text-black dark:text-white">
                          {element}
                      </span>
                  );
              }

              if (activeHighlight) {
                  element = (
                      <span 
                        className={`${getBgClass(activeHighlight.data.color)} rounded-sm decoration-clone box-decoration-clone pb-0.5 cursor-pointer hover:brightness-95 dark:hover:brightness-110`}
                        onClick={(e) => handleHighlightClick(e, activeHighlight.data.original)}
                      >
                          {element}
                      </span>
                  );
              }

              renderSegments.push(<React.Fragment key={i}>{element}</React.Fragment>);
          }

          globalOffset += paraText.length + 1; // +1 for newline

          return (
            <p key={pIndex} data-index={pIndex} className="indent-8 md:indent-10 mb-2 text-justify break-words whitespace-pre-wrap relative">
                {pIndex === 0 && (
                    <span className="law-section-prefix font-bold inline mr-3">
                     มาตรา {law.sectionNumber}
                    </span>
                )}
                {renderSegments}
            </p>
          );
      });
  };

  const hasNoteContent = note && note.text && note.text.length > 0;

  return (
    <div 
      id={`section-${law.id}`} 
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-visible mb-6 transition-all duration-300 hover:shadow-md group/card 
        ${isHighlighted 
            ? 'border-yellow-400 ring-1 ring-yellow-100 dark:border-yellow-500/50 dark:ring-yellow-900/20' 
            : 'border-gray-200 dark:border-gray-700'}`}
    >
      {/* Highlight Indicator Strip */}
      {isHighlighted && (
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 dark:bg-yellow-500 rounded-l-lg"></div>
      )}

      {/* Highlight Menu Popover */}
      {selectionMenu && (
          <div 
            id="highlight-menu"
            className="absolute z-50 flex items-center bg-gray-900 dark:bg-gray-700 rounded-full shadow-xl px-2 py-1.5 -translate-x-1/2 transform transition-all animate-in fade-in zoom-in duration-200"
            style={{ 
                left: selectionMenu.x, 
                top: selectionMenu.y - 45 
            }}
          >
              <div className="flex space-x-1">
                  <button onClick={() => addHighlight('yellow')} className="w-6 h-6 rounded-full bg-yellow-400 hover:scale-110 transition-transform border-2 border-transparent hover:border-white"></button>
                  <button onClick={() => addHighlight('green')} className="w-6 h-6 rounded-full bg-green-400 hover:scale-110 transition-transform border-2 border-transparent hover:border-white"></button>
                  <button onClick={() => addHighlight('blue')} className="w-6 h-6 rounded-full bg-blue-400 hover:scale-110 transition-transform border-2 border-transparent hover:border-white"></button>
                  <button onClick={() => addHighlight('pink')} className="w-6 h-6 rounded-full bg-pink-400 hover:scale-110 transition-transform border-2 border-transparent hover:border-white"></button>
                  {(selectionMenu.isExisting) && (
                    <>
                        <div className="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                        <button onClick={clearHighlightSelection} className="p-1 text-gray-300 hover:text-red-400 hover:scale-110 transition-transform">
                            <Trash2 size={14} />
                        </button>
                    </>
                  )}
                  <div className="w-px h-4 bg-gray-600 mx-1 self-center"></div>
                  <button onClick={() => { setSelectionMenu(null); window.getSelection()?.removeAllRanges(); }} className="p-1 text-gray-400 hover:text-white">
                      <X size={14} />
                  </button>
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
          </div>
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
            <div 
                ref={contentRef}
                onMouseUp={handleTextSelection}
                className={`text-gray-900 dark:text-gray-100 ${fontSizeClass} ${fontFamilyClass} selection:bg-law-200 dark:selection:bg-law-800`}
            >
                {renderContentWithFeatures()}
            </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 font-sans">
          <button 
            onClick={() => setIsEditingNote(!isEditingNote)}
            className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${isEditingNote || hasNoteContent ? 'text-law-700 bg-law-50 dark:text-law-300 dark:bg-law-900/50' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <Edit size={16} />
            <span>{hasNoteContent ? 'แก้ไขโน้ต' : 'โน้ต'}</span>
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
        {(isEditingNote || hasNoteContent) && (
          <div className={`mt-4 ${isEditingNote ? 'block' : hasNoteContent ? 'block' : 'hidden'}`}>
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
                    onClick={() => handleSaveNote()}
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
                    <p className="text-yellow-900 dark:text-yellow-200 text-base font-sarabun leading-relaxed">{note ? note.text : ''}</p>
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
