import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './AppV3';
import { bootstrapNeonData } from './services/neonBootstrap';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

const startApp = async () => {
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;color:#334155;background:#f8fafc">
      <div style="text-align:center;padding:24px">
        <div style="font-size:18px;font-weight:600;margin-bottom:8px">กำลังเชื่อมต่อฐานข้อมูลกฎหมาย</div>
        <div style="font-size:14px;color:#64748b">กำลังโหลดข้อมูลจาก Neon...</div>
      </div>
    </div>
  `;

  try {
    await Promise.race([
      bootstrapNeonData(),
      new Promise<void>(resolve => setTimeout(resolve, 5000))
    ]);
  } catch (error) {
    console.warn('Neon bootstrap skipped:', error);
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode><App /></React.StrictMode>
  );
};

void startApp();
