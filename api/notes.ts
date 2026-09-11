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
    const userId = (req.query.userId as string) || (req.body?.userId as string) || 'default_user';

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT section_id as "sectionId", text, is_highlighted as "isHighlighted", 
               text_highlights as "textHighlights", 
               EXTRACT(EPOCH FROM updated_at) * 1000 as "updatedAt"
        FROM user_notes
        WHERE user_id = ${userId};
      `;

      // Convert to map format expected by frontend: Record<string, UserNote>
      const notesMap: Record<string, any> = {};
      for (const row of rows) {
        notesMap[row.sectionId] = {
          sectionId: row.sectionId,
          text: row.text || '',
          isHighlighted: Boolean(row.isHighlighted),
          textHighlights: row.textHighlights || [],
          updatedAt: Math.round(Number(row.updatedAt))
        };
      }

      return res.status(200).json(notesMap);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const note = req.body;
      if (!note || !note.sectionId) {
        return res.status(400).json({ error: 'sectionId is required' });
      }

      if (!note.text?.trim() && !note.isHighlighted && (!note.textHighlights || note.textHighlights.length === 0)) {
        // Delete note if empty
        await sql`DELETE FROM user_notes WHERE user_id = ${userId} AND section_id = ${note.sectionId};`;
        return res.status(200).json({ success: true, deleted: true });
      }

      await sql`
        INSERT INTO user_notes (user_id, section_id, text, is_highlighted, text_highlights, updated_at)
        VALUES (${userId}, ${note.sectionId}, ${note.text || ''}, ${Boolean(note.isHighlighted)}, 
                ${JSON.stringify(note.textHighlights || [])}::jsonb, NOW())
        ON CONFLICT (user_id, section_id) DO UPDATE SET
          text = EXCLUDED.text,
          is_highlighted = EXCLUDED.is_highlighted,
          text_highlights = EXCLUDED.text_highlights,
          updated_at = NOW();
      `;

      return res.status(200).json({ success: true, note });
    }

    if (req.method === 'DELETE') {
      const sectionId = (req.query.sectionId as string) || req.body?.sectionId;
      if (!sectionId) {
        return res.status(400).json({ error: 'sectionId is required' });
      }

      await sql`DELETE FROM user_notes WHERE user_id = ${userId} AND section_id = ${sectionId};`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API /notes error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' });
  }
}
