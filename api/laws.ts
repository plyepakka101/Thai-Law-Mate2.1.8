import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not configured');
  return neon(dbUrl);
}

function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isDbConfigured()) {
    return res.status(503).json({ error: 'DATABASE_URL is not configured' });
  }

  try {
    const sql = getDb();

    if (req.method === 'GET') {
      const bookId = req.query.bookId as string | undefined;
      const q = req.query.q as string | undefined;
      const isCustomOnly = req.query.custom === 'true' || req.query.custom === '1';
      const limit = parseInt(req.query.limit as string) || 5000;
      const offset = parseInt(req.query.offset as string) || 0;

      let rows;
      if (isCustomOnly) {
        rows = await sql`
          SELECT id, book_id as "bookId", section_number as "sectionNumber", content, category, is_custom as "isCustom"
          FROM law_sections
          WHERE is_custom = TRUE
          ORDER BY created_at ASC
          LIMIT ${limit} OFFSET ${offset};
        `;
      } else if (bookId && q) {
        const searchPattern = `%${q}%`;
        rows = await sql`
          SELECT id, book_id as "bookId", section_number as "sectionNumber", content, category, is_custom as "isCustom"
          FROM law_sections
          WHERE book_id = ${bookId} AND (section_number ILIKE ${searchPattern} OR content ILIKE ${searchPattern} OR category ILIKE ${searchPattern})
          LIMIT ${limit} OFFSET ${offset};
        `;
      } else if (bookId) {
        rows = await sql`
          SELECT id, book_id as "bookId", section_number as "sectionNumber", content, category, is_custom as "isCustom"
          FROM law_sections
          WHERE book_id = ${bookId}
          LIMIT ${limit} OFFSET ${offset};
        `;
      } else if (q) {
        const searchPattern = `%${q}%`;
        rows = await sql`
          SELECT id, book_id as "bookId", section_number as "sectionNumber", content, category, is_custom as "isCustom"
          FROM law_sections
          WHERE section_number ILIKE ${searchPattern} OR content ILIKE ${searchPattern} OR category ILIKE ${searchPattern}
          LIMIT ${limit} OFFSET ${offset};
        `;
      } else {
        rows = await sql`
          SELECT id, book_id as "bookId", section_number as "sectionNumber", content, category, is_custom as "isCustom"
          FROM law_sections
          LIMIT ${limit} OFFSET ${offset};
        `;
      }

      return res.status(200).json(rows);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body;
      if (!body) {
        return res.status(400).json({ error: 'Request body required' });
      }

      // Support batch upsert
      if (Array.isArray(body)) {
        for (const item of body) {
          const targetBookId = item.bookId || 'custom';
          // Ensure parent book exists in law_books to satisfy foreign key constraint
          await sql`
            INSERT INTO law_books (id, name, abbreviation, description, is_custom)
            VALUES (${targetBookId}, ${targetBookId === 'custom' ? 'กฎหมายเพิ่มเติม' : targetBookId}, 'กำหนดเอง', 'กฎหมายกำหนดเอง', TRUE)
            ON CONFLICT (id) DO NOTHING;
          `;

          await sql`
            INSERT INTO law_sections (id, book_id, section_number, content, category, is_custom)
            VALUES (${item.id}, ${targetBookId}, ${item.sectionNumber}, ${item.content}, ${item.category || 'กฎหมายเพิ่มเติม'}, ${item.isCustom ?? true})
            ON CONFLICT (id) DO UPDATE SET
              section_number = EXCLUDED.section_number,
              content = EXCLUDED.content,
              category = EXCLUDED.category,
              is_custom = EXCLUDED.is_custom,
              updated_at = NOW();
          `;
        }
        return res.status(200).json({ success: true, count: body.length });
      }

      // Single item upsert
      const targetBookId = body.bookId || 'custom';
      // Ensure parent book exists in law_books to satisfy foreign key constraint
      await sql`
        INSERT INTO law_books (id, name, abbreviation, description, is_custom)
        VALUES (${targetBookId}, ${targetBookId === 'custom' ? 'กฎหมายเพิ่มเติม' : targetBookId}, 'กำหนดเอง', 'กฎหมายกำหนดเอง', TRUE)
        ON CONFLICT (id) DO NOTHING;
      `;

      await sql`
        INSERT INTO law_sections (id, book_id, section_number, content, category, is_custom)
        VALUES (${body.id}, ${targetBookId}, ${body.sectionNumber}, ${body.content}, ${body.category || 'กฎหมายเพิ่มเติม'}, ${body.isCustom ?? true})
        ON CONFLICT (id) DO UPDATE SET
          section_number = EXCLUDED.section_number,
          content = EXCLUDED.content,
          category = EXCLUDED.category,
          is_custom = EXCLUDED.is_custom,
          updated_at = NOW();
      `;
      return res.status(200).json({ success: true, law: body });
    }

    if (req.method === 'DELETE') {
      const id = (req.query.id as string) || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'id parameter is required' });
      }

      await sql`DELETE FROM law_sections WHERE id = ${id};`;
      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API /laws error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' });
  }
}
