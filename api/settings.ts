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
    const userId = (req.query.userId as string) || (req.body?.userId as string) || 'default_user';

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT dark_mode as "darkMode", font_size as "fontSize", font_style as "fontStyle", 
               voice_uri as "voiceURI", speaking_rate as "speakingRate"
        FROM app_settings
        WHERE user_id = ${userId};
      `;

      if (rows.length === 0) {
        return res.status(200).json({ darkMode: false, fontSize: 2, fontStyle: 'modern' });
      }

      return res.status(200).json(rows[0]);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const settings = req.body;
      if (!settings) {
        return res.status(400).json({ error: 'Settings object required' });
      }

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

      return res.status(200).json({ success: true, settings });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API /settings error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' });
  }
}
