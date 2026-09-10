import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, isDbConfigured } from './db';

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
      const rows = await sql`
        SELECT id, name, abbreviation, description, color, source_url as "sourceUrl", 
               last_updated as "lastUpdated", content, is_custom as "isCustom", sort_order as "sortOrder"
        FROM law_books
        ORDER BY sort_order ASC, created_at ASC;
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const book = req.body;
      if (!book || !book.id || !book.name) {
        return res.status(400).json({ error: 'id and name are required' });
      }

      await sql`
        INSERT INTO law_books (id, name, abbreviation, description, color, source_url, last_updated, content, is_custom, sort_order)
        VALUES (${book.id}, ${book.name}, ${book.abbreviation || 'กำหนดเอง'}, ${book.description || ''}, 
                ${book.color || 'bg-law-600'}, ${book.sourceUrl || null}, ${book.lastUpdated || null}, 
                ${book.content || ''}, ${book.isCustom ?? true}, ${book.sortOrder || 999})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          abbreviation = EXCLUDED.abbreviation,
          description = EXCLUDED.description,
          color = EXCLUDED.color,
          source_url = EXCLUDED.source_url,
          last_updated = EXCLUDED.last_updated,
          content = EXCLUDED.content,
          is_custom = EXCLUDED.is_custom,
          updated_at = NOW();
      `;
      return res.status(200).json({ success: true, book });
    }

    if (req.method === 'DELETE') {
      const id = (req.query.id as string) || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'id parameter is required' });
      }

      await sql`DELETE FROM law_books WHERE id = ${id};`;
      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API /books error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' });
  }
}
