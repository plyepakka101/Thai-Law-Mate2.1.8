import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_ADMIN_EMAILS = [
  'pramot.thamwi@gmail.com',
  'plyepakka@gmail.com',
];

function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const raw = (process.env.ADMIN_EMAILS || '').trim();
  let list: string[] = [];
  try {
    if (raw.startsWith('[') && raw.endsWith(']')) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.map((v: unknown) => String(v).trim().toLowerCase().replace(/^["']|["']$/g, ''));
      }
    }
  } catch {}
  if (list.length === 0 && raw) {
    list = raw
      .replace(/[\[\]"']/g, '')
      .split(/[,;\n\s]+/)
      .map((v: string) => v.trim().toLowerCase())
      .filter(Boolean);
  }
  const adminList = Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...list]));
  return adminList.includes(cleanEmail);
}

function requireAdmin(req: VercelRequest, res: VercelResponse) {
  try {
    const secret = (process.env.AUTH_SESSION_SECRET || '').trim().replace(/^["']|["']$/g, '');
    if (!secret || secret.length < 32) {
      res.status(503).json({ error: 'AUTH_SESSION_SECRET is not configured' });
      return null;
    }
    const cookieHeader = req.headers.cookie || '';
    const cookieList = cookieHeader.split(';').map((s: string) => s.trim());
    const cookieEntry = cookieList.find(
      (s: string) => s.startsWith('tlm_session=') || s.startsWith('__Host-tlm_session=')
    );
    if (!cookieEntry) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
      return null;
    }
    const raw = cookieEntry.slice(cookieEntry.indexOf('=') + 1);
    const [encoded, providedSignature] = (raw || '').split('.');
    if (!encoded || !providedSignature) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
      return null;
    }
    const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      res.status(401).json({ error: 'Session ไม่ถูกต้อง' });
      return null;
    }
    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!session?.email || session.isAdmin !== true || (session.exp && session.exp <= Math.floor(Date.now() / 1000))) {
      res.status(401).json({ error: 'Session หมดอายุ' });
      return null;
    }
    if (!isAdminEmail(session.email)) {
      res.status(403).json({ error: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ' });
      return null;
    }
    return session;
  } catch {
    res.status(401).json({ error: 'การตรวจสอบสิทธิ์ล้มเหลว' });
    return null;
  }
}

const MAX_BOOK_ID_LENGTH = 64;
const MAX_LAW_ID_LENGTH = 128;

function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not configured');
  return neon(dbUrl);
}

function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function validateLawItem(item: any): string | null {
  if (!item || !item.id) return 'แต่ละมาตราต้องมี id';
  if (typeof item.id !== 'string' || item.id.length > MAX_LAW_ID_LENGTH) {
    return `law.id ยาวเกินกำหนด (สูงสุด ${MAX_LAW_ID_LENGTH} ตัวอักษร)`;
  }
  const bookId = item.bookId || 'custom';
  if (typeof bookId !== 'string' || bookId.length > MAX_BOOK_ID_LENGTH) {
    return `bookId ยาวเกินกำหนด: ${typeof bookId === 'string' ? bookId.length : 0} ตัวอักษร (สูงสุด ${MAX_BOOK_ID_LENGTH})`;
  }
  if (item.sectionNumber == null) return 'แต่ละมาตราต้องมี sectionNumber';
  if (item.content == null) return 'แต่ละมาตราต้องมี content';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && !requireAdmin(req, res)) return;

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
      if (!body) return res.status(400).json({ error: 'Request body required' });

      if (Array.isArray(body)) {
        for (let index = 0; index < body.length; index += 1) {
          const item = body[index];
          const validationError = validateLawItem(item);
          if (validationError) {
            return res.status(400).json({ error: `${validationError} (รายการที่ ${index + 1})` });
          }
        }

        for (const item of body) {
          const targetBookId = item.bookId || 'custom';
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

      const validationError = validateLawItem(body);
      if (validationError) return res.status(400).json({ error: validationError });

      const targetBookId = body.bookId || 'custom';
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
      if (!id) return res.status(400).json({ error: 'id parameter is required' });
      await sql`DELETE FROM law_sections WHERE id = ${id};`;
      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API /laws error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' });
  }
}
