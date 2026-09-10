import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.argv[2];
  if (!dbUrl) {
    console.error('Error: Please provide DATABASE_URL either as an environment variable or as a script argument.');
    console.error('Usage: npx tsx scripts/seed_to_neon.ts "postgresql://user:pass@host/dbname?sslmode=require"');
    process.exit(1);
  }

  console.log('Connecting to Neon PostgreSQL...');
  const sql = neon(dbUrl);

  console.log('Creating database schema if not exists...');
  await sql`
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
  `;

  await sql`
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
  `;

  // Ensure columns are TEXT in case the table was created earlier with VARCHAR(255)
  try {
    await sql`ALTER TABLE law_sections ALTER COLUMN category TYPE TEXT;`;
    await sql`ALTER TABLE law_sections ALTER COLUMN section_number TYPE TEXT;`;
  } catch (e) {
    // ignore if already TEXT
  }

  await sql`CREATE INDEX IF NOT EXISTS idx_sections_book_id ON law_sections(book_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sections_section_num ON law_sections(section_number);`;

  await sql`
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
  `;

  await sql`
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

  console.log('Schema ready. Loading master backup data...');
  const backupJsonPath = path.resolve(__dirname, '../backups/thai_law_mate_master_backup.json');
  const backup = JSON.parse(fs.readFileSync(backupJsonPath, 'utf-8'));

  console.log(`Inserting/Updating ${backup.books.length} law books...`);
  for (const book of backup.books) {
    await sql`
      INSERT INTO law_books (id, name, abbreviation, description, color, source_url, last_updated, content, is_custom, sort_order)
      VALUES (${book.id}, ${book.name}, ${book.abbreviation}, ${book.description}, ${book.color}, ${book.sourceUrl}, ${book.lastUpdated}, ${book.content}, FALSE, ${book.sortOrder})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        abbreviation = EXCLUDED.abbreviation,
        description = EXCLUDED.description,
        color = EXCLUDED.color,
        source_url = EXCLUDED.source_url,
        last_updated = EXCLUDED.last_updated,
        content = EXCLUDED.content,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW();
    `;
    process.stdout.write('.');
  }
  console.log('\nBooks seeded successfully.');

  console.log(`Inserting/Updating ${backup.sections.length} law sections...`);
  const chunkSize = 100;
  for (let i = 0; i < backup.sections.length; i += chunkSize) {
    const chunk = backup.sections.slice(i, i + chunkSize);
    // Batch inserts
    for (const s of chunk) {
      await sql`
        INSERT INTO law_sections (id, book_id, section_number, content, category, is_custom)
        VALUES (${s.id}, ${s.bookId}, ${s.sectionNumber}, ${s.content}, ${s.category}, FALSE)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          category = EXCLUDED.category,
          updated_at = NOW();
      `;
    }
    const percent = Math.round(((i + chunk.length) / backup.sections.length) * 100);
    process.stdout.write(`\rProgress: ${i + chunk.length}/${backup.sections.length} sections (${percent}%)`);
  }

  console.log('\n\n--- SEED COMPLETED SUCCESSFULLY! ---');
  console.log('Summary:');
  const bookCount = await sql`SELECT count(*) FROM law_books;`;
  const sectionCount = await sql`SELECT count(*) FROM law_sections;`;
  console.log(`law_books count: ${bookCount[0].count}`);
  console.log(`law_sections count: ${sectionCount[0].count}`);
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
