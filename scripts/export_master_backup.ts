import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BOOKS } from '../services/dataService';
import { parseLaws } from '../services/lawParser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.resolve(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('--- Starting Thai Law Mate Master Backup Extraction ---');

const backupData = {
  version: 3,
  exportedAt: new Date().toISOString(),
  totalBooks: BOOKS.length,
  books: [] as any[],
  totalSections: 0,
  sections: [] as any[]
};

function escapeSql(str: string | undefined | null): string {
  if (str === undefined || str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

let sqlSeed = `-- =======================================================================
-- Thai Law Mate Master Seed Data for Neon PostgreSQL
-- Exported: ${backupData.exportedAt}
-- =======================================================================

`;

// Append schema creation to seed file
sqlSeed += `-- 1. Schema Definition
CREATE TABLE IF NOT EXISTS law_books (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(64) NOT NULL,
    description TEXT,
    color VARCHAR(32) DEFAULT 'bg-law-600',
    source_url TEXT,
    last_updated VARCHAR(64),
    content TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS law_sections (
    id VARCHAR(128) PRIMARY KEY,
    book_id VARCHAR(64) REFERENCES law_books(id) ON DELETE CASCADE,
    section_number TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_book_id ON law_sections(book_id);
CREATE INDEX IF NOT EXISTS idx_sections_section_num ON law_sections(section_number);

CREATE TABLE IF NOT EXISTS user_notes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) DEFAULT 'default_user',
    section_id VARCHAR(128) NOT NULL,
    text TEXT,
    is_highlighted BOOLEAN DEFAULT FALSE,
    text_highlights JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_user_section UNIQUE(user_id, section_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
    user_id VARCHAR(64) PRIMARY KEY DEFAULT 'default_user',
    dark_mode BOOLEAN DEFAULT FALSE,
    font_size INT DEFAULT 2,
    font_style VARCHAR(32) DEFAULT 'modern',
    voice_uri VARCHAR(255),
    speaking_rate NUMERIC(3, 2) DEFAULT 1.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================================================================
-- 2. Insert Law Books
-- =======================================================================
`;

for (let i = 0; i < BOOKS.length; i++) {
  const book = BOOKS[i];
  const sections = parseLaws(book.content, book.id, book.name);

  console.log(`[${i + 1}/${BOOKS.length}] ${book.name} (${book.abbreviation}): ${sections.length} sections`);

  backupData.books.push({
    id: book.id,
    name: book.name,
    abbreviation: book.abbreviation,
    description: book.description || '',
    color: book.color,
    sourceUrl: book.sourceUrl || '',
    lastUpdated: book.lastUpdated || '',
    content: book.content,
    isCustom: false,
    sortOrder: i + 1,
    sectionsCount: sections.length
  });

  sqlSeed += `INSERT INTO law_books (id, name, abbreviation, description, color, source_url, last_updated, content, is_custom, sort_order)
VALUES (${escapeSql(book.id)}, ${escapeSql(book.name)}, ${escapeSql(book.abbreviation)}, ${escapeSql(book.description)}, ${escapeSql(book.color)}, ${escapeSql(book.sourceUrl)}, ${escapeSql(book.lastUpdated)}, ${escapeSql(book.content)}, FALSE, ${i + 1})
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  abbreviation = EXCLUDED.abbreviation,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  source_url = EXCLUDED.source_url,
  last_updated = EXCLUDED.last_updated,
  content = EXCLUDED.content,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();\n\n`;

  backupData.sections.push(...sections);
}

backupData.totalSections = backupData.sections.length;

// Generate Section inserts in chunks
sqlSeed += `-- =======================================================================
-- 3. Insert Law Sections (${backupData.totalSections} sections)
-- =======================================================================
`;

const chunkSize = 100;
for (let i = 0; i < backupData.sections.length; i += chunkSize) {
  const chunk = backupData.sections.slice(i, i + chunkSize);
  sqlSeed += `INSERT INTO law_sections (id, book_id, section_number, content, category, is_custom) VALUES\n`;
  const values = chunk.map(s => `  (${escapeSql(s.id)}, ${escapeSql(s.bookId)}, ${escapeSql(s.sectionNumber)}, ${escapeSql(s.content)}, ${escapeSql(s.category)}, FALSE)`);
  sqlSeed += values.join(',\n') + `\nON CONFLICT (id) DO UPDATE SET\n  content = EXCLUDED.content,\n  category = EXCLUDED.category,\n  updated_at = NOW();\n\n`;
}

// Write JSON backup
const jsonPath = path.join(backupDir, 'thai_law_mate_master_backup.json');
fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), 'utf-8');
console.log(`\nSuccessfully exported master JSON backup: ${jsonPath}`);
console.log(`Total Books: ${backupData.totalBooks}`);
console.log(`Total Sections: ${backupData.totalSections}`);

// Write SQL Seed
const sqlPath = path.join(backupDir, 'seed_neon_data.sql');
fs.writeFileSync(sqlPath, sqlSeed, 'utf-8');
console.log(`Successfully generated Neon SQL seed: ${sqlPath} (${(fs.statSync(sqlPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// Write Schema SQL
const schemaPath = path.join(backupDir, 'init_neon_schema.sql');
const schemaOnly = `-- =======================================================================
-- Thai Law Mate - PostgreSQL Schema for Neon
-- =======================================================================

CREATE TABLE IF NOT EXISTS law_books (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(64) NOT NULL,
    description TEXT,
    color VARCHAR(32) DEFAULT 'bg-law-600',
    source_url TEXT,
    last_updated VARCHAR(64),
    content TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS law_sections (
    id VARCHAR(128) PRIMARY KEY,
    book_id VARCHAR(64) REFERENCES law_books(id) ON DELETE CASCADE,
    section_number VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(255),
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_book_id ON law_sections(book_id);
CREATE INDEX IF NOT EXISTS idx_sections_section_num ON law_sections(section_number);

CREATE TABLE IF NOT EXISTS user_notes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) DEFAULT 'default_user',
    section_id VARCHAR(128) NOT NULL,
    text TEXT,
    is_highlighted BOOLEAN DEFAULT FALSE,
    text_highlights JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_user_section UNIQUE(user_id, section_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
    user_id VARCHAR(64) PRIMARY KEY DEFAULT 'default_user',
    dark_mode BOOLEAN DEFAULT FALSE,
    font_size INT DEFAULT 2,
    font_style VARCHAR(32) DEFAULT 'modern',
    voice_uri VARCHAR(255),
    speaking_rate NUMERIC(3, 2) DEFAULT 1.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;
fs.writeFileSync(schemaPath, schemaOnly, 'utf-8');
console.log(`Successfully generated Schema DDL: ${schemaPath}`);
