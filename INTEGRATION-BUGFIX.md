# วิธีติดตั้งไฟล์แก้บั๊ก "sync ไป Neon เงียบ ๆ ไม่แจ้งเตือน"

## สรุปบั๊กเดิม
`services/dataService.ts` ยิง `fetch(...).catch(e => console.warn(...))` ไปที่
`/api/laws`, `/api/books`, `/api/notes`, `/api/settings` โดยไม่เช็ค `res.ok`
เลย — ถ้า API ตอบ error กลับมา (400/500) โค้ดจะไม่รู้ตัว เพราะ `fetch()`
resolve ปกติแม้ server ตอบ error (มันจะ reject เฉพาะตอนเน็ตหลุด/DNS พังจริง ๆ)
ผลคือข้อมูลเซฟลง localStorage สำเร็จ แอปดูปกติ แต่ไม่เคยไปถึง Neon เลย

## สิ่งที่แก้
- `services/dataService.ts` (แทนที่ไฟล์เดิมทั้งไฟล์) — เพิ่มฟังก์ชันกลาง
  `syncMutation()` ที่เช็ค `res.ok`, log error, บันทึกลง
  `localStorage['thai_law_mate_sync_errors']`, และแจ้งไปยัง listener
  (`onSyncError`) ทุกจุดที่เคยใช้ `.catch(console.warn)` เปลี่ยนมาเรียกผ่าน
  ฟังก์ชันนี้แทนหมด (บันทึกมาตรา, หนังสือ, โน้ต, ตั้งค่า, ลบต่าง ๆ)
- `components/SyncErrorBanner.tsx` (ไฟล์ใหม่) — แบนเนอร์แดงมุมล่างขวา
  โผล่อัตโนมัติเมื่อ sync ล้มเหลว บอก error จริงให้ผู้ใช้เห็น ไม่ใช่แค่ใน
  console เหมือนเดิม

## ขั้นตอนติดตั้ง
1. แทนที่ `services/dataService.ts` เดิมด้วยไฟล์ใหม่ที่แนบมา (โค้ด logic
   เดิมทุกอย่างเหมือนเดิม แค่เพิ่มการเช็ค error)
2. วาง `components/SyncErrorBanner.tsx`
3. ใน `AppV3.tsx` เพิ่ม:
   ```tsx
   import SyncErrorBanner from './components/SyncErrorBanner';
   ```
   แล้ววาง `<SyncErrorBanner />` ไว้ใกล้ ๆ กับ root ของ JSX ที่ return
   (นอก routing ก็ได้ เพราะเป็น fixed-position banner ลอยอยู่แล้ว)
4. Build เช็คว่าผ่าน: `npm run build`
5. Commit + push (หรือใช้ Claude Code ช่วยตามที่คุยกันไว้ก่อนหน้า)

## ผลหลังแก้
ครั้งต่อไปถ้าเพิ่มมาตราแล้ว sync ไป Neon ไม่สำเร็จ (เช่น `DATABASE_URL`
ผิด, cold start error, payload ผิด format) **จะมีแบนเนอร์แดงเด้งขึ้นมาทันที
บอก error จริง** แทนที่จะเงียบเหมือนเดิม ทำให้รู้ตัวได้ตั้งแต่ตอนนั้นเลย
ไม่ต้องมานั่งไล่เช็คใน Neon console แบบที่เพิ่งทำกันไป

## หมายเหตุ
แพตช์นี้แก้แค่ "การมองเห็นปัญหา" (visibility) ยังไม่ใช่ retry อัตโนมัติ —
ถ้าอยากได้ retry queue ด้วย (เก็บรายการที่ sync ไม่ผ่านไว้แล้วลองใหม่ตอน
กลับมาออนไลน์) บอกได้ เดี๋ยวทำเป็นเฟสถัดไปให้
