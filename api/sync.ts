import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_auth.ts';

const MAX_BOOK_ID_LENGTH = 64;
const MAX_LAW_ID_LENGTH = 128;
const MAX_USER_ID_LENGTH = 64;

function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not configured');
  return neon(dbUrl);
}

function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function validateSyncPayload(books: any[], laws: any[], userId: unknown): string | null {
  if (typeof userId !== 'string' || userId.length > MAX_USER_ID_LENGTH) {
    return `userId ยาวเกินกำหนด (สูงสุด ${MAX_USER_ID_LENGTH} ตัวอักษร)`;
  }

  for (let i = 0; i < books.length; i += 1) {
    const book = books[i];
    if (!book || typeof book.id !== 'string' || !book.id) return `หนังสือรายการที่ ${i + 1} ไม่มี id`;
    if (book.id.length > MAX_BOOK_ID_LENGTH) {
      return `book.id ของ “${book.name || 'ไม่ทราบชื่อ'}” ยาว ${book.id.length} ตัวอักษร ซึ่งเกิน ${MAX_BOOK_ID_LENGTH} ตัวอักษร`;
    }
    if (book.abbreviation != null && String(book.abbreviation).length > MAX_BOOK_ID_LENGTH) {
      return `abbreviation ของ “${book.name || 'ไม่ทราบชื่อ'}” ยาวเกิน ${MAX_BOOK_ID_LENGTH} ตัวอักษร`;
    }
  }

  for (let i = 0; i < laws.length; i += 1) {
    const law = laws[i];
    if (!law || typeof law.id !== 'string' || !law.id) return `มาตรารายการที่ ${i + 1} ไม่มี id`;
    if (law.id.length > MAX_LAW_ID_LENGTH) {
      return `law.id ของมาตรา ${law.sectionNumber || '?'} ยาว ${law.id.length} ตัวอักษร ซึ่งเกิน ${MAX_LAW_ID_LENGTH} ตัวอักษร`;
    }
    const bookId = law.bookId || 'custom';
    if (typeof bookId !== 'string' || bookId.length > MAX_BOOK_ID_LENGTH) {
      return `bookId ของมาตรา ${law.sectionNumber || '?'} ยาวเกิน ${MAX_BOOK_ID_LENGTH} ตัวอักษร`;
    }
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && !requireAdmin(req, res)) return;

  if (!isDbConfigured()) {
    return res.status(200).json({ connected: false, message: 'DATABASE_URL is not configured in Vercel environment variables' });
  }

  try {
    const sql = getDb();

    if (req.method === 'GET') {
      const userId = (req.query.userId as string) || 'default_user';
      const pull = req.query.pull === '1' || req.query.data === 'all';

      const bookCount = await sql`SELECT count(*) FROM law_books;`;
      const sectionCount = await sql`SELECT count(*) FROM law_sections;`;
      const noteCount = await sql`SELECT count(*) FROM user_notes;`;
      const stats = { books: Number(bookCount[0]?.count || 0), sections: Number(sectionCount[0]?.count || 0), notes: Number(noteCount[0]?.count || 0) };

      if (!pull) {
        return res.status(200).json({ connected: true, stats, timestamp: new Date().toISOString() });
      }

      const customBooks = await sql`
        SELECT id, name, abbreviation, description, color, source_url as "sourceUrl", 
               last_updated as "lastUpdated", content, is_custom as "isCustom", sort_order as "sortOrder"
        FROM law_books WHERE is_custom = TRUE ORDER BY sort_order ASC, created_at ASC;
      `;
      const customLaws = await sql`
        SELECT id, book_id as "bookId", section_number as "sectionNumber", content, category, is_custom as "isCustom"
        FROM law_sections WHERE is_custom = TRUE ORDER BY created_at ASC;
      `;
      const noteRows = await sql`
        SELECT section_id as "sectionId", text, is_highlighted as "isHighlighted", text_highlights as "textHighlights", EXTRACT(EPOCH FROM updated_at) * 1000 as "updatedAt"
        FROM user_notes WHERE user_id = ${userId};
      `;
      const notesMap: Record<string, any> = {};
      for (const row of noteRows) {
        notesMap[row.sectionId] = { sectionId: row.sectionId, text: row.text || '', isHighlighted: Boolean(row.isHighlighted), textHighlights: row.textHighlights || [], updatedAt: Math.round(Number(row.updatedAt)) };
      }
      const settingsRows = await sql`
        SELECT dark_mode as "darkMode", font_size as "fontSize", font_style as "fontStyle", voice_uri as "voiceURI", speaking_rate as "speakingRate"
        FROM app_settings WHERE user_id = ${userId};
      `;

      return res.status(200).json({ connected: true, stats, customBooks, customLaws, notes: notesMap, settings: settingsRows[0] || null, timestamp: new Date().toISOString() });
    }

    if (req.method === 'POST') {
      const { books, laws, notes, settings, userId = 'default_user' } = req.body || {};
      const safeBooks = Array.isArray(books) ? books : [];
      const safeLaws = Array.isArray(laws) ? laws : [];
      const validationError = validateSyncPayload(safeBooks, safeLaws, userId);
      if (validationError) return res.status(400).json({ error: validationError });

      let syncedBooks = 0;
      let syncedLaws = 0;
      let syncedNotes = 0;

      if (safeBooks.length > 0) {
        for (const b of safeBooks) {
          await sql`
            INSERT INTO law_books (id, name, abbreviation, description, color, source_url, last_updated, content, is_custom, sort_order)
            VALUES (${b.id}, ${b.name}, ${b.abbreviation || 'กำหนดเอง'}, ${b.description || ''}, ${b.color || 'bg-law-600'}, ${b.sourceUrl || null}, ${b.lastUpdated || null}, ${b.content || ''}, ${b.isCustom ?? true}, ${b.sortOrder || 999})
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name, abbreviation = EXCLUDED.abbreviation, description = EXCLUDED.description, color = EXCLUDED.color,
              source_url = EXCLUDED.source_url, last_updated = EXCLUDED.last_updated, content = EXCLUDED.content,
              is_custom = EXCLUDED.is_custom, updated_at = NOW();
          `;
          syncedBooks += 1;
        }
      }

      if (safeLaws.length > 0) {
        for (const l of safeLaws) {
          const targetBookId = l.bookId || 'custom';
          await sql`
            INSERT INTO law_books (id, name, abbreviation, description, is_custom)
            VALUES (${targetBookId}, ${targetBookId === 'custom' ? 'กฎหมายเพิ่มเติม' : targetBookId}, 'กำหนดเอง', 'กฎหมายกำหนดเอง', TRUE)
            ON CONFLICT (id) DO NOTHING;
          `;
          await sql`
            INSERT INTO law_sections (id, book_id, section_number, content, category, is_custom)
            VALUES (${l.id}, ${targetBookId}, ${l.sectionNumber}, ${l.content}, ${l.category || 'กฎหมายเพิ่มเติม'}, ${l.isCustom ?? true})
            ON CONFLICT (id) DO UPDATE SET
              section_number = EXCLUDED.section_number, content = EXCLUDED.content, category = EXCLUDED.category,
              is_custom = EXCLUDED.is_custom, updated_at = NOW();
          `;
          syncedLaws += 1;
        }
      }

      if (notes && typeof notes === 'object') {
        for (const sectionId of Object.keys(notes)) {
          const n = notes[sectionId];
          if (n.text?.trim() || n.isHighlighted || (n.textHighlights && n.textHighlights.length > 0)) {
            await sql`
              INSERT INTO user_notes (user_id, section_id, text, is_highlighted, text_highlights, updated_at)
              VALUES (${userId}, ${sectionId}, ${n.text || ''}, ${Boolean(n.isHighlighted)}, ${JSON.stringify(n.textHighlights || [])}::jsonb, NOW())
              ON CONFLICT (user_id, section_id) DO UPDATE SET
                text = EXCLUDED.text, is_highlighted = EXCLUDED.is_highlighted, text_highlights = EXCLUDED.text_highlights, updated_at = NOW();
            `;
            syncedNotes += 1;
          }
        }
      }

      if (settings && typeof settings === 'object') {
        await sql`
          INSERT INTO app_settings (user_id, dark_mode, font_size, font_style, voice_uri, speaking_rate, updated_at)
          VALUES (${userId}, ${Boolean(settings.darkMode)}, ${settings.fontSize || 2}, ${settings.fontStyle || 'modern'}, ${settings.voiceURI || null}, ${settings.speakingRate || 1.0}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            dark_mode = EXCLUDED.dark_mode, font_size = EXCLUDED.font_size, font_style = EXCLUDED.font_style,
            voice_uri = EXCLUDED.voice_uri, speaking_rate = EXCLUDED.speaking_rate, updated_at = NOW();
        `;
      }

      return res.status(200).json({ success: true, synced: { books: syncedBooks, laws: syncedLaws, notes: syncedNotes, settings: Boolean(settings) } });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API /sync error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' });
  }
}
