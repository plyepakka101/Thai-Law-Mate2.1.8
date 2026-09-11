import { neon } from '@neondatabase/serverless';

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.argv[2];
  if (!dbUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  console.log('Connecting to Neon PostgreSQL...');
  const sql = neon(dbUrl);

  console.log('Creating memorization tables...');
  await sql`
    CREATE TABLE IF NOT EXISTS memorization_decks (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT 'default_user',
      name VARCHAR(255) NOT NULL,
      description TEXT,
      color VARCHAR(32) DEFAULT 'bg-purple-600',
      is_builtin BOOLEAN DEFAULT FALSE,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS memorization_items (
      id VARCHAR(128) PRIMARY KEY,
      deck_id VARCHAR(64) REFERENCES memorization_decks(id) ON DELETE CASCADE,
      law_section_id VARCHAR(128) REFERENCES law_sections(id) ON DELETE CASCADE,
      user_id VARCHAR(64) DEFAULT 'default_user',
      title VARCHAR(255),
      custom_text TEXT,
      keywords JSONB DEFAULT '[]'::jsonb,
      audio_url TEXT,
      repetitions INT DEFAULT 0,
      interval_days INT DEFAULT 1,
      ease_factor NUMERIC(4, 2) DEFAULT 2.50,
      streak INT DEFAULT 0,
      last_quality INT DEFAULT 0,
      last_reviewed_at TIMESTAMP WITH TIME ZONE,
      next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status VARCHAR(32) DEFAULT 'learning',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_deck_section UNIQUE(deck_id, law_section_id)
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_memo_next_review ON memorization_items(user_id, next_review_at);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_memo_deck_id ON memorization_items(deck_id);`;

  await sql`
    CREATE TABLE IF NOT EXISTS memorization_logs (
      id SERIAL PRIMARY KEY,
      item_id VARCHAR(128) REFERENCES memorization_items(id) ON DELETE CASCADE,
      user_id VARCHAR(64) DEFAULT 'default_user',
      quality INT NOT NULL,
      mode VARCHAR(32) DEFAULT 'read',
      time_spent_ms INT DEFAULT 0,
      reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  console.log('Memorization tables created successfully!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
