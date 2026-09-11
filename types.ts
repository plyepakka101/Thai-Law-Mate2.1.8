export interface LawSection {
  id: string;
  sectionNumber: string;
  content: string;
  category?: string;
  isCustom?: boolean;
  bookId?: string;
}

export interface TextHighlight {
  start: number;
  end: number;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'red';
}

export interface UserNote {
  sectionId: string;
  text: string;
  updatedAt: number;
  isHighlighted?: boolean;
  textHighlights?: TextHighlight[];
}

export interface SearchFilters {
  query: string;
  onlyNotes: boolean;
}

export enum ViewState {
  BOOKSHELF = 'BOOKSHELF',
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  NOTES = 'NOTES',
  HIGHLIGHTS = 'HIGHLIGHTS',
  ADD = 'ADD',
  MANAGE = 'MANAGE',
  SETTINGS = 'SETTINGS',
  TOC = 'TOC',
  MEMORIZE = 'MEMORIZE'
}

export interface BackupData {
  version: number;
  timestamp: number;
  notes: Record<string, UserNote>;
  customLaws: LawSection[];
  customBooks?: LawBook[];
}

export type FontStyle = 'modern' | 'traditional';

export interface AppSettings {
  darkMode: boolean;
  fontSize: number;
  fontStyle: FontStyle;
  voiceURI?: string;
  speakingRate?: number;
}

export interface LawBook {
  id: string;
  name: string;
  content: string;
  abbreviation: string;
  description?: string;
  color: string;
  sourceUrl?: string;
  lastUpdated?: string;
  isCustom?: boolean;
}

// -------------------------------------------------------------
// Legal Memorization System Types
// -------------------------------------------------------------

export type MemorizeStudyMode = 'read' | 'recall' | 'cloze' | 'voice';

export interface ParagraphSlice {
  index: number;
  label: string; // e.g. "วรรคหนึ่ง", "วรรคสอง"
  content: string;
}

export interface MemorizationDeck {
  id: string;
  name: string;
  description?: string;
  color: string;
  isBuiltin?: boolean;
  sortOrder?: number;
  totalItems?: number;
  dueItems?: number;
  masteredItems?: number;
}

export interface MemorizationItem {
  id: string;
  deckId: string;
  sectionId: string;
  title?: string;
  customText?: string;
  keywords?: string[];
  audioUrl?: string;
  
  // Section details joined from law_sections
  sectionNumber?: string;
  content?: string;
  bookId?: string;
  
  // SRS state
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  streak: number;
  lastQuality?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
}

export interface MemorizationStats {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
}

