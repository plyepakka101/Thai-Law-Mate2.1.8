-- =======================================================================
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
