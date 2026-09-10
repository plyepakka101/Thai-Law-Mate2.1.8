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
  TOC = 'TOC'
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
