import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, isDbConfigured } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isDbConfigured()) {
    return res.status(200).json({ 
      connected: false, 
      message: 'DATABASE_URL is not set' 
    });
  }

  try {
    const sql = getDb();

    if (req.method === 'GET') {
      // Health check and statistics
      const bookCount = await sql`SELECT count(*) FROM law_books;`;
      const sectionCount = await sql`SELECT count(*) FROM law_sections;`;
      const noteCount = await sql`SELECT count(*) FROM user_notes;`;

      return res.status(200).json({
        connected: true,
        stats: {
          books: Number(bookCount[0].count),
          sections: Number(sectionCount[0].count),
          notes: Number(noteCount[0].count)
        },
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      // Bulk sync from local client to Neon (e.g. during first-time sync or user backup upload)
      const { books, laws, notes, settings, userId = 'default_user' } = req.body || {};

      let syncedBooks = 0;
      let syncedLaws = 0;
      let syncedNotes = 0;

      if (Array.isArray(books) && books.length > 0) {
        for (const b of books) {
          await sql`
            INSERT INTO law_books (id, name, abbreviation, description, color, source_url, last_updated, content, is_custom, sort_order)
            VALUES (${b.id}, ${b.name}, ${b.abbreviation || 'กำหนดเอง'}, ${b.description || ''}, 
                    ${b.color || 'bg-law-600'}, ${b.sourceUrl || null}, ${b.lastUpdated || null}, 
                    ${b.content || ''}, ${b.isCustom ?? true}, ${b.sortOrder || 999})
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              abbreviation = EXCLUDED.abbreviation,
              content = EXCLUDED.content,
              updated_at = NOW();
          `;
          syncedBooks++;
        }
      }

      if (Array.isArray(laws) && laws.length > 0) {
        for (const l of laws) {
          await sql`
            INSERT INTO law_sections (id, book_id, section_number, content, category, is_custom)
            VALUES (${l.id}, ${l.bookId || 'custom'}, ${l.sectionNumber}, ${l.content}, ${l.category || 'กฎหมายเพิ่มเติม'}, ${l.isCustom ?? true})
            ON CONFLICT (id) DO UPDATE SET
              section_number = EXCLUDED.section_number,
              content = EXCLUDED.content,
              category = EXCLUDED.category,
              updated_at = NOW();
          `;
          syncedLaws++;
        }
      }

      if (notes && typeof notes === 'object') {
        for (const sectionId of Object.keys(notes)) {
          const n = notes[sectionId];
          if (n.text?.trim() || n.isHighlighted || (n.textHighlights && n.textHighlights.length > 0)) {
            await sql`
              INSERT INTO user_notes (user_id, section_id, text, is_highlighted, text_highlights, updated_at)
              VALUES (${userId}, ${sectionId}, ${n.text || ''}, ${Boolean(n.isHighlighted)}, 
                      ${JSON.stringify(n.textHighlights || [])}::jsonb, NOW())
              ON CONFLICT (user_id, section_id) DO UPDATE SET
                text = EXCLUDED.text,
                is_highlighted = EXCLUDED.is_highlighted,
                text_highlights = EXCLUDED.text_highlights,
                updated_at = NOW();
            `;
            syncedNotes++;
          }
        }
      }

      if (settings && typeof settings === 'object') {
        await sql`
          INSERT INTO app_settings (user_id, dark_mode, font_size, font_style, voice_uri, speaking_rate, updated_at)
          VALUES (${userId}, ${Boolean(settings.darkMode)}, ${settings.fontSize || 2}, 
                  ${settings.fontStyle || 'modern'}, ${settings.voiceURI || null}, 
                  ${settings.speakingRate || 1.0}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            dark_mode = EXCLUDED.dark_mode,
            font_size = EXCLUDED.font_size,
            font_style = EXCLUDED.font_style,
            voice_uri = EXCLUDED.voice_uri,
            speaking_rate = EXCLUDED.speaking_rate,
            updated_at = NOW();
        `;
      }

      return res.status(200).json({
        success: true,
        synced: {
          books: syncedBooks,
          laws: syncedLaws,
          notes: syncedNotes,
          settings: Boolean(settings)
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API /sync error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' });
  }
}
