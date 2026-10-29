/* =============================================================
   CORE — กฎและข้อมูลของระบบ (business logic) ใช้ร่วมกันทั้งเบราว์เซอร์และ Google Apps Script
   ห้ามใช้ window / document / localStorage / fetch ในโฟลเดอร์ core/
   -------------------------------------------------------------
   util.js: ตัวช่วยกลาง + ทะเบียนโมดูล (CORE.modules) + createCore()
   ============================================================= */
var CORE = CORE || { modules: [], mutations: [] };

/* ลงทะเบียนโมดูล: mutations = ชื่อเมธอดที่เปลี่ยนข้อมูล (ฝั่ง client จะส่งไปบันทึกที่ server) */
function defineCoreModule(mutations, factory) {
  CORE.mutations.push.apply(CORE.mutations, mutations);
  CORE.modules.push(factory);
}

/* สร้าง API ของระบบ
   ctx = { db(): ข้อมูลทั้งหมด, user(): ผู้ใช้ปัจจุบันหรือ null, now(): เวลา (ms), uid(): สร้าง id,
           env: 'client' | 'server', hash(pw)?: ใช้เฉพาะโหมดสาธิต } */
function createCore(ctx) {
  const S = {};
  const api = (o) => Object.defineProperties(S, Object.getOwnPropertyDescriptors(o));
  CORE.modules.forEach(m => m(S, ctx, api));
  S.normalize();
  return S;
}

var CoreUtil = (function () {
  const pad = (n) => String(n).padStart(2, '0');
  const bkk = (ts) => new Date(ts + 7 * 36e5);   // เวลาไทย (UTC+7) เสมอ ไม่ขึ้นกับเครื่อง
  const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const MONTHS_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const DAYS_S = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const U = {
    pad,
    dateKey: (ts = Date.now()) => bkk(ts).toISOString().slice(0, 10),
    timeOf: (ts) => { const d = bkk(ts); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; },
    at: (date, hhmm) => Date.parse(`${date}T${hhmm}:00+07:00`),
    weekday: (date) => new Date(date + 'T12:00:00Z').getUTCDay(),
    daysInMonth: (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); },
    monthDates: (ym) => Array.from({ length: U.daysInMonth(ym) }, (_, i) => `${ym}-${pad(i + 1)}`),
    addMonth: (ym, n) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); },
    /* วันที่ภาษาไทย (พ.ศ.) โดยไม่พึ่ง Intl — ใช้ได้เหมือนกันบน Apps Script
       o: { weekday: 'long'|'short', day: 'numeric', month: 'long'|'short', year: 'numeric'|'2-digit' } */
    thDate(date, o = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
      const [y, m, d] = date.split('-').map(Number), wd = U.weekday(date);
      const parts = [];
      if (o.weekday === 'long') parts.push(o.day ? `วัน${DAYS[wd]}ที่` : `วัน${DAYS[wd]}`);
      if (o.weekday === 'short') parts.push(DAYS_S[wd]);
      if (o.day) parts.push(String(d));
      if (o.month) parts.push(o.month === 'short' ? MONTHS_S[m - 1] : MONTHS[m - 1]);
      if (o.year) parts.push(o.year === '2-digit' ? String((y + 543) % 100).padStart(2, '0') : String(y + 543));
      return parts.join(' ');
    },
    thMonth: (ym) => U.thDate(ym + '-15', { month: 'long', year: 'numeric' }),
    distanceM(lat1, lng1, lat2, lng2) {
      const R = 6371000, r = Math.PI / 180, dl = (lat2 - lat1) * r, dn = (lng2 - lng1) * r;
      const a = Math.sin(dl / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dn / 2) ** 2;
      return Math.round(2 * R * Math.asin(Math.sqrt(a)));
    },
    euclid(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s); },
    need(cond, msg) { if (!cond) throw new Error(msg); },
    locName: (id) => (LOCATIONS.find(l => l.id === id) || {}).name || id,
    locShort: (id) => (LOCATIONS.find(l => l.id === id) || {}).short || id,
    posTh: (id) => id === 'job' ? 'งานเพิ่มเติม' : ((POSITIONS.find(p => p.id === id) || {}).th || id)
  };
  return U;
})();
