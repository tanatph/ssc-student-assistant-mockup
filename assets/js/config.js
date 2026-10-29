/* =============================================================
   ตั้งค่าการเชื่อมต่อระบบ — แก้ไฟล์นี้ไฟล์เดียวตอน deploy
   ============================================================= */
var CONFIG = {
  /* 'local' = โหมดสาธิต เก็บข้อมูลในเบราว์เซอร์ (มีข้อมูลตัวอย่าง)
     'gas'   = ระบบจริง เชื่อม Google Apps Script (Sheets + Drive + Gmail) */
  BACKEND: 'local',

  /* URL ของ Web App ที่ได้จาก Apps Script → Deploy → Web app (ลงท้ายด้วย /exec)
     ไม่ต้องใส่ถ้าเปิดหน้าเว็บผ่าน Apps Script โดยตรง (ระบบจะใช้ google.script.run) */
  API_URL: '',

  /* ความถี่ดึงข้อมูลใหม่จาก server (มิลลิวินาที) — หน้าแชทดึงถี่กว่า */
  POLL_MS: 30000,
  POLL_CHAT_MS: 6000
};

/* ถ้าหน้าเว็บถูกเสิร์ฟจาก Apps Script (HtmlService) ให้ใช้โหมด gas อัตโนมัติ */
if (typeof google !== 'undefined' && google.script && google.script.run) CONFIG.BACKEND = 'gas';
