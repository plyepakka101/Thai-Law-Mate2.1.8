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

// Ensure tables exist
async function ensureTables(sql: any) {
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
}

// Built-in starter decks
const BUILTIN_DECKS = [
  {
    id: 'deck-crim-essential',
    name: '🔥 มาตราสำคัญ อาญา (ภาค 1 & ภาคความผิด)',
    description: 'มาตราหัวใจที่ออกสอบเนติบัณฑิต อัยการ และผู้ช่วยผู้พิพากษาบ่อยที่สุด (ม. 59, 68, 80, 83, 288, 334)',
    color: 'bg-red-500',
    sortOrder: 1,
    sections: [
      { sectionId: 'crim-59', title: 'มาตรา 59 - เจตนาและประมาท' },
      { sectionId: 'crim-60', title: 'มาตรา 60 - การกระทำโดยพลาด' },
      { sectionId: 'crim-68', title: 'มาตรา 68 - ป้องกันโดยชอบด้วยกฎหมาย' },
      { sectionId: 'crim-80', title: 'มาตรา 80 - พยายามกระทำความผิด' },
      { sectionId: 'crim-83', title: 'มาตรา 83 - ตัวการร่วม' },
      { sectionId: 'crim-84', title: 'มาตรา 84 - ผู้ใช้ให้กระทำความผิด' },
      { sectionId: 'crim-288', title: 'มาตรา 288 - ความผิดฐานฆ่าผู้อื่น' },
      { sectionId: 'crim-289', title: 'มาตรา 289 - ฆ่าผู้อื่นโดยมีเหตุฉกรรจ์' },
      { sectionId: 'crim-334', title: 'มาตรา 334 - ความผิดฐานลักทรัพย์' },
      { sectionId: 'crim-335', title: 'มาตรา 335 - ลักทรัพย์เหตุฉกรรจ์' },
      { sectionId: 'crim-339', title: 'มาตรา 339 - ความผิดฐานชิงทรัพย์' },
      { sectionId: 'crim-340', title: 'มาตรา 340 - ความผิดฐานปล้นทรัพย์' }
    ]
  },
  {
    id: 'deck-civil-essential',
    name: '📘 มาตราสำคัญ แพ่งและพาณิชย์ (นิติกรรม-หนี้-ละเมิด)',
    description: 'หลักกฎหมายแพ่งพื้นฐานและมาตราสำคัญยอดฮิต (ม. 149, 150, 420, 213)',
    color: 'bg-blue-500',
    sortOrder: 2,
    sections: [
      { sectionId: 'civil-149', title: 'มาตรา 149 - ความหมายของนิติกรรม' },
      { sectionId: 'civil-150', title: 'มาตรา 150 - นิติกรรมที่มีวัตถุประสงค์ต้องห้าม' },
      { sectionId: 'civil-213', title: 'มาตรา 213 - การบังคับชำระหนี้' },
      { sectionId: 'civil-420', title: 'มาตรา 420 - ละเมิด' },
      { sectionId: 'civil-425', title: 'มาตรา 425 - นายจ้างร่วมรับผิดกับลูกจ้าง' }
    ]
  },
  {
    id: 'deck-crimproc-essential',
    name: '🏛️ มาตราสำคัญ วิ.อาญา (สอบสวน & ฟ้องคดี)',
    description: 'มาตราออกสอบบ่อย วิ.อาญา (ม. 2(4), 28, 39, 134, 140, 158)',
    color: 'bg-orange-600',
    sortOrder: 3,
    sections: [
      { sectionId: 'crim_proc-2', title: 'มาตรา 2 - คำนิยาม (ผู้เสียหาย, ผู้ต้องหา)' },
      { sectionId: 'crim_proc-28', title: 'มาตรา 28 - ผู้มีอำนาจฟ้องคดีอาญา' },
      { sectionId: 'crim_proc-39', title: 'มาตรา 39 - สิทธินำคดีอาญามาฟ้องระงับ' },
      { sectionId: 'crim_proc-158', title: 'มาตรา 158 - แบบของคำฟ้อง' }
    ]
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isDbConfigured()) {
    return res.status(200).json({ 
      connected: false, 
      message: 'DATABASE_URL is not configured in Vercel environment variables' 
    });
  }

  try {
    const sql = getDb();
    await ensureTables(sql);

    const userId = (req.query.userId as string) || (req.body?.userId as string) || 'default_user';

    // -------------------------------------------------------------
    // GET: Query Decks, Items, Due Reviews, and Stats
    // -------------------------------------------------------------
    if (req.method === 'GET') {
      const view = (req.query.view as string) || 'all';
      const deckId = req.query.deckId as string | undefined;

      // Seed builtin decks if user has 0 decks
      const deckCount = await sql`SELECT count(*) FROM memorization_decks WHERE user_id = ${userId};`;
      if (Number(deckCount[0]?.count || 0) === 0) {
        for (const d of BUILTIN_DECKS) {
          await sql`
            INSERT INTO memorization_decks (id, user_id, name, description, color, is_builtin, sort_order)
            VALUES (${d.id}, ${userId}, ${d.name}, ${d.description}, ${d.color}, TRUE, ${d.sortOrder})
            ON CONFLICT (id) DO NOTHING;
          `;

          for (const s of d.sections) {
            const itemId = `${d.id}_${s.sectionId}`;
            // Check if section exists in law_sections
            const secExists = await sql`SELECT id, content FROM law_sections WHERE id = ${s.sectionId} LIMIT 1;`;
            if (secExists.length > 0) {
              await sql`
                INSERT INTO memorization_items (id, deck_id, law_section_id, user_id, title, status)
                VALUES (${itemId}, ${d.id}, ${s.sectionId}, ${userId}, ${s.title}, 'new')
                ON CONFLICT (deck_id, law_section_id) DO NOTHING;
              `;
            }
          }
        }
      }

      // 1. Fetch Decks with item counts and due counts
      const decks = await sql`
        SELECT d.id, d.name, d.description, d.color, d.is_builtin as "isBuiltin", d.sort_order as "sortOrder",
               COUNT(i.id)::int as "totalItems",
               COUNT(CASE WHEN i.next_review_at <= NOW() THEN 1 END)::int as "dueItems",
               COUNT(CASE WHEN i.status = 'mastered' THEN 1 END)::int as "masteredItems"
        FROM memorization_decks d
        LEFT JOIN memorization_items i ON d.id = i.deck_id
        WHERE d.user_id = ${userId}
        GROUP BY d.id
        ORDER BY d.sort_order ASC, d.created_at ASC;
      `;

      if (view === 'decks') {
        return res.status(200).json({ decks });
      }

      // 2. Fetch Items (optionally filtered by deckId or due status)
      let itemsQuery;
      if (view === 'due') {
        itemsQuery = sql`
          SELECT i.id, i.deck_id as "deckId", i.law_section_id as "sectionId", i.title,
                 i.custom_text as "customText", i.keywords, i.audio_url as "audioUrl",
                 i.repetitions, i.interval_days as "intervalDays", i.ease_factor as "easeFactor",
                 i.streak, i.last_quality as "lastQuality",
                 i.last_reviewed_at as "lastReviewedAt", i.next_review_at as "nextReviewAt",
                 i.status, s.section_number as "sectionNumber", s.content, s.book_id as "bookId"
          FROM memorization_items i
          JOIN law_sections s ON i.law_section_id = s.id
          WHERE i.user_id = ${userId} AND i.next_review_at <= NOW()
          ORDER BY i.next_review_at ASC;
        `;
      } else if (deckId) {
        itemsQuery = sql`
          SELECT i.id, i.deck_id as "deckId", i.law_section_id as "sectionId", i.title,
                 i.custom_text as "customText", i.keywords, i.audio_url as "audioUrl",
                 i.repetitions, i.interval_days as "intervalDays", i.ease_factor as "easeFactor",
                 i.streak, i.last_quality as "lastQuality",
                 i.last_reviewed_at as "lastReviewedAt", i.next_review_at as "nextReviewAt",
                 i.status, s.section_number as "sectionNumber", s.content, s.book_id as "bookId"
          FROM memorization_items i
          JOIN law_sections s ON i.law_section_id = s.id
          WHERE i.user_id = ${userId} AND i.deck_id = ${deckId}
          ORDER BY i.next_review_at ASC, i.created_at ASC;
        `;
      } else {
        itemsQuery = sql`
          SELECT i.id, i.deck_id as "deckId", i.law_section_id as "sectionId", i.title,
                 i.custom_text as "customText", i.keywords, i.audio_url as "audioUrl",
                 i.repetitions, i.interval_days as "intervalDays", i.ease_factor as "easeFactor",
                 i.streak, i.last_quality as "lastQuality",
                 i.last_reviewed_at as "lastReviewedAt", i.next_review_at as "nextReviewAt",
                 i.status, s.section_number as "sectionNumber", s.content, s.book_id as "bookId"
          FROM memorization_items i
          JOIN law_sections s ON i.law_section_id = s.id
          WHERE i.user_id = ${userId}
          ORDER BY i.next_review_at ASC;
        `;
      }

      const items = await itemsQuery;

      // 3. User overall stats
      const statsRow = await sql`
        SELECT 
          COUNT(*)::int as "total",
          COUNT(CASE WHEN next_review_at <= NOW() THEN 1 END)::int as "dueToday",
          COUNT(CASE WHEN status = 'mastered' THEN 1 END)::int as "mastered",
          COUNT(CASE WHEN status = 'learning' OR status = 'new' THEN 1 END)::int as "learning"
        FROM memorization_items
        WHERE user_id = ${userId};
      `;

      return res.status(200).json({
        connected: true,
        decks,
        items,
        stats: statsRow[0] || { total: 0, dueToday: 0, mastered: 0, learning: 0 }
      });
    }

    // -------------------------------------------------------------
    // POST: Actions (record review / add item / add deck)
    // -------------------------------------------------------------
    if (req.method === 'POST') {
      const { action, payload } = req.body || {};

      // 1. Record Review & Update SM-2 SRS Algorithm
      if (action === 'review') {
        const { itemId, quality, mode = 'read', timeSpentMs = 0 } = payload || {};
        if (!itemId || typeof quality !== 'number') {
          return res.status(400).json({ error: 'itemId and quality (1-4) are required' });
        }

        // Fetch current item stats
        const currentItem = await sql`
          SELECT id, repetitions, interval_days, ease_factor, streak
          FROM memorization_items
          WHERE id = ${itemId} AND user_id = ${userId}
          LIMIT 1;
        `;

        if (currentItem.length === 0) {
          return res.status(404).json({ error: 'Item not found' });
        }

        const item = currentItem[0];
        let repetitions = Number(item.repetitions || 0);
        let intervalDays = Number(item.interval_days || 1);
        let easeFactor = Number(item.ease_factor || 2.5);
        let streak = Number(item.streak || 0);
        let status = 'learning';

        // SuperMemo SM-2 calculation:
        // quality: 1: Again (จำไม่ได้เลย), 2: Hard (ยาก), 3: Good (จำได้), 4: Easy (จำได้แม่นยำ)
        if (quality < 2) {
          // Again / Fail: reset streak and repetitions, review in 10-15 minutes or tomorrow
          streak = 0;
          repetitions = 0;
          intervalDays = 0.01; // ~15 minutes
          status = 'learning';
        } else {
          // Success
          streak += 1;
          repetitions += 1;

          if (repetitions === 1) {
            intervalDays = quality === 4 ? 3 : 1;
          } else if (repetitions === 2) {
            intervalDays = quality === 4 ? 7 : 3;
          } else {
            intervalDays = Math.round(intervalDays * easeFactor);
          }

          // Adjust Ease Factor based on quality
          // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
          const qScore = quality === 4 ? 5 : (quality === 3 ? 4 : 3);
          easeFactor = easeFactor + (0.1 - (5 - qScore) * (0.08 + (5 - qScore) * 0.02));
          if (easeFactor < 1.3) easeFactor = 1.3;

          if (repetitions >= 4 && streak >= 3) {
            status = 'mastered';
          } else {
            status = 'review';
          }
        }

        const nextReviewDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

        // Update memorization_items
        await sql`
          UPDATE memorization_items
          SET repetitions = ${repetitions},
              interval_days = ${Math.max(1, Math.round(intervalDays))},
              ease_factor = ${easeFactor},
              streak = ${streak},
              last_quality = ${quality},
              last_reviewed_at = NOW(),
              next_review_at = ${nextReviewDate.toISOString()},
              status = ${status},
              updated_at = NOW()
          WHERE id = ${itemId};
        `;

        // Record log
        await sql`
          INSERT INTO memorization_logs (item_id, user_id, quality, mode, time_spent_ms)
          VALUES (${itemId}, ${userId}, ${quality}, ${mode}, ${timeSpentMs});
        `;

        return res.status(200).json({
          success: true,
          item: {
            id: itemId,
            repetitions,
            intervalDays: Math.max(1, Math.round(intervalDays)),
            easeFactor,
            streak,
            nextReviewAt: nextReviewDate.toISOString(),
            status
          }
        });
      }

      // 2. Add Item to Deck
      if (action === 'add_item') {
        const { deckId, sectionId, title } = payload || {};
        if (!deckId || !sectionId) {
          return res.status(400).json({ error: 'deckId and sectionId are required' });
        }

        const id = `${deckId}_${sectionId}`;
        await sql`
          INSERT INTO memorization_items (id, deck_id, law_section_id, user_id, title, status)
          VALUES (${id}, ${deckId}, ${sectionId}, ${userId}, ${title || null}, 'new')
          ON CONFLICT (deck_id, law_section_id) DO UPDATE SET
            title = COALESCE(EXCLUDED.title, memorization_items.title),
            updated_at = NOW();
        `;

        return res.status(200).json({ success: true, id });
      }

      // 3. Remove Item
      if (action === 'remove_item') {
        const { itemId } = payload || {};
        if (!itemId) return res.status(400).json({ error: 'itemId required' });
        await sql`DELETE FROM memorization_items WHERE id = ${itemId} AND user_id = ${userId};`;
        return res.status(200).json({ success: true });
      }

      // 4. Save/Create Deck
      if (action === 'save_deck') {
        const { id, name, description, color = 'bg-purple-600' } = payload || {};
        if (!name) return res.status(400).json({ error: 'Deck name required' });
        const deckId = id || `custom-deck-${Date.now()}`;

        await sql`
          INSERT INTO memorization_decks (id, user_id, name, description, color, is_builtin)
          VALUES (${deckId}, ${userId}, ${name}, ${description || ''}, ${color}, FALSE)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            color = EXCLUDED.color,
            updated_at = NOW();
        `;

        return res.status(200).json({ success: true, deckId });
      }

      // 5. Delete Deck
      if (action === 'delete_deck') {
        const { deckId } = payload || {};
        if (!deckId) return res.status(400).json({ error: 'deckId required' });
        await sql`DELETE FROM memorization_decks WHERE id = ${deckId} AND user_id = ${userId};`;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API /memorize error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' });
  }
}
