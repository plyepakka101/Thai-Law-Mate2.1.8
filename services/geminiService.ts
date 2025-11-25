declare const process: any;

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const searchDika = async (sectionNumber: string, content: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "กรุณาตั้งค่า API Key เพื่อใช้งานฟีเจอร์ AI";
  }

  try {
    const prompt = `
      บทบาท: คุณเป็นผู้เชี่ยวชาญด้านกฎหมายไทยและการค้นคว้าคำพิพากษาศาลฎีกา
      บริบท: ผู้ใช้ต้องการทราบแนวคำพิพากษาศาลฎีกาที่เกี่ยวข้องกับมาตรานี้
      
      ข้อมูลมาตรา:
      - เลขมาตรา: ${sectionNumber}
      - เนื้อหา: "${content}"
      
      คำสั่ง:
      1. ค้นหาและสรุปคำพิพากษาศาลฎีกาที่สำคัญ หรือวางบรรทัดฐานเกี่ยวกับมาตรานี้ 2-3 เรื่อง
      2. ระบุเลขฎีกาและปี พ.ศ. ให้ชัดเจน (ถ้ามีข้อมูล)
      3. สรุปสาระสำคัญของคำตัดสินนั้นว่าศาลตีความอย่างไร หรือตัดสินลงโทษอย่างไรในกรณีนั้น
      4. ใช้ Google Search เพื่อค้นหาข้อมูลฎีกาที่ถูกต้อง
      
      รูปแบบการตอบ:
      - ฎีกาที่ [เลขที่/ปี]: [สรุปย่อ]
      - ฎีกาที่ [เลขที่/ปี]: [สรุปย่อ]
      
      หากไม่พบฎีกาตรงๆ ให้อธิบายแนวปฏิบัติของศาลเกี่ยวกับมาตรานี้
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "คุณคือผู้ช่วยค้นคว้ากฎหมายที่เน้นความถูกต้องของข้อมูลอ้างอิง"
      }
    });

    return response.text || "ไม่พบข้อมูลคำพิพากษาฎีกาที่เกี่ยวข้องในขณะนี้";
  } catch (error) {
    console.error("Gemini Dika Error:", error);
    return "เกิดข้อผิดพลาดในการค้นหาฎีกา โปรดลองใหม่อีกครั้ง";
  }
};