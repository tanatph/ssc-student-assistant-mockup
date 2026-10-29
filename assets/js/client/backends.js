/* Backend ของ Store — เลือกด้วย CONFIG.BACKEND
   ทุก backend มีหน้าที่เดียวกัน: โหลดข้อมูล, ส่งคำสั่งที่เปลี่ยนข้อมูล (mutation), เข้า/ออกระบบ, เปิดไฟล์ */

/* ---------- โหมดสาธิต: localStorage (ไม่ต้องมี server) ---------- */
var LocalBackend = (function () {
  const KEY = 'ssc-recruit-v7', SESSION = 'ssc-session';
  // แฮชแบบง่ายพอสำหรับสาธิตเท่านั้น — ระบบจริงแฮชฝั่ง server (gas/Auth.js)
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'h' + (h >>> 0).toString(36); };
  const ss = { get: () => { try { return sessionStorage.getItem(SESSION); } catch (e) { return null; } }, set: (v) => { try { v ? sessionStorage.setItem(SESSION, v) : sessionStorage.removeItem(SESSION); } catch (e) {} } };
  let store;   // Store hooks: { getDb, setDb, setUser, emitRemote }
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(store.getDb())); }
    catch (e) { throw new Error('พื้นที่จัดเก็บของเบราว์เซอร์เต็ม — ลองลดขนาดไฟล์แล้วอัปโหลดใหม่'); }
  };
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
  return {
    name: 'local',
    async init(hooks) {
      store = hooks;
      let db = read();
      if (!db || !db.users) { db = buildDemoDb(hash); }
      store.setDb(db);
      store.setUser(ss.get());
      persist();
      // ข้อความ/ข้อมูลใหม่จากแท็บอื่น (ทดลองแชทหลายบัญชีพร้อมกัน)
      window.addEventListener('storage', (e) => { if (e.key === KEY && e.newValue) { store.setDb(JSON.parse(e.newValue)); store.emitRemote(); } });
    },
    commit() { persist(); return Promise.resolve(); },
    async login(email, password, core) {
      email = email.trim().toLowerCase();
      const u = store.getDb().users.find(x => (x.email === email || x.studentId === email) && x.password === hash(password));
      if (!u) throw new Error('อีเมล/รหัสนิสิต หรือรหัสผ่านไม่ถูกต้อง');
      const block = core.loginBlock(u); if (block) throw new Error(block);
      ss.set(u.id); store.setUser(u.id);
    },
    async register({ email, studentId, password }, core) {
      const db = store.getDb();
      email = email.trim().toLowerCase();
      if (db.users.some(u => u.email === email)) throw new Error('อีเมลนี้ถูกใช้ลงทะเบียนแล้ว');
      if (db.users.some(u => u.studentId === studentId)) throw new Error('รหัสนิสิตนี้มีบัญชีอยู่แล้ว');
      const u = { id: core.uidRaw(), role: 'applicant', email, studentId, password: hash(password), createdAt: Date.now() };
      db.users.push(u);
      db.applications.push(core.emptyApp(u));
      persist(); ss.set(u.id); store.setUser(u.id);
    },
    /* ลงทะเบียนเจ้าหน้าที่ → รออนุมัติ (ไม่เข้าสู่ระบบอัตโนมัติ) */
    async registerOfficer(data, core) {
      if (String(data.password || '').length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      core._newOfficer(Object.assign({}, data, { passwordHash: hash(data.password) }));
      persist();
    },
    logout() { ss.set(null); store.setUser(null); },
    reset() { localStorage.removeItem(KEY); ss.set(null); store.setDb(buildDemoDb(hash)); store.setUser(null); persist(); },
    fileUrl: (ref) => Promise.resolve(ref),
    pollFast() {}
  };
})();

/* ---------- ระบบจริง: Google Apps Script ----------
   เรียก API ผ่าน google.script.run (เมื่อหน้าเว็บเสิร์ฟจาก Apps Script) หรือ fetch ไปที่ CONFIG.API_URL
   คำสั่งเปลี่ยนข้อมูลทำงานในเบราว์เซอร์ทันที (ตอบสนองเร็ว) แล้วส่งไปให้ server ทำซ้ำและบันทึกจริง
   ถ้า server ปฏิเสธ (สิทธิ์ไม่พอ/ข้อมูลไม่ถูกต้อง) จะดึงข้อมูลล่าสุดกลับมาแทนและแจ้งผู้ใช้ */
var GasBackend = (function () {
  const TOKEN = 'ssc-token', SNAP = 'ssc-snap';
  let store, queue = Promise.resolve(), pending = 0, timer = null, fast = false;
  let epoch = 0;   // เพิ่มทุกครั้งที่เข้า/ออกระบบ — คำตอบที่ส่งก่อนหน้านั้นจะถูกทิ้ง (กันข้อมูลเก่าทับสถานะใหม่)
  const files = new Map();
  const token = { get: () => { try { return localStorage.getItem(TOKEN); } catch (e) { return null; } }, set: (v) => { try { v ? localStorage.setItem(TOKEN, v) : localStorage.removeItem(TOKEN); } catch (e) {} } };

  const checked = (r) => { if (r && r.error) { if (r.code === 'AUTH') { token.set(null); snap.clear(); store.setUser(null); } throw new Error(r.error); } return r; };
  function call(payload) {
    payload.token = token.get();
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      return new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej).api(JSON.stringify(payload))).then(checked);
    }
    if (!CONFIG.API_URL) return Promise.reject(new Error('ยังไม่ได้ตั้งค่า CONFIG.API_URL (assets/js/config.js)'));
    // text/plain = ไม่ต้องมี CORS preflight (Apps Script รองรับ)
    return fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(r => r.json()).then(checked);
  }
  /* แคชข้อมูลล่าสุดไว้ในเครื่อง: เปิดเว็บครั้งถัดไปแสดงผลได้ทันที แล้วค่อยอัปเดตจาก server เบื้องหลัง */
  const snap = {
    get() { try { const c = JSON.parse(localStorage.getItem(SNAP) || 'null'); return c && c.tok === token.get() ? c : null; } catch (e) { return null; } },
    set(r) { try { localStorage.setItem(SNAP, JSON.stringify({ tok: token.get(), snapshot: r.snapshot, me: r.me || null })); } catch (e) { snap.clear(); } },
    clear() { try { localStorage.removeItem(SNAP); } catch (e) {} }
  };
  function apply(r, silent, e) {
    if (e !== undefined && e !== epoch) return;
    if (r.snapshot) { store.setDb(r.snapshot); snap.set(r); }
    store.setUser(r.me || null);
    if (!silent) store.emitRemote();
  }
  async function sync(silent) { if (pending) return; const e = epoch; apply(await call({ action: 'sync' }), silent, e); }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (document.visibilityState === 'visible') { try { await sync(false); } catch (e) { console.warn(e); } }
      schedule();
    }, fast ? CONFIG.POLL_CHAT_MS : CONFIG.POLL_MS);
  }
  return {
    name: 'gas',
    async init(hooks) {
      store = hooks;
      const c = snap.get();
      if (!c) { apply(await call({ action: 'sync' }), true); schedule(); return; }
      apply(c, true);
      /* ข้อมูลจริงมาถึงแล้ว → แจ้งหน้าเว็บให้แสดงใหม่ (ssc-fresh) */
      const e = epoch;
      call({ action: 'sync' }).then(r => { apply(r, false, e); window.dispatchEvent(new Event('ssc-fresh')); }).catch(err => console.warn(err)).then(schedule);
    },
    /* ส่งคำสั่งตามลำดับ — ids = id ที่สร้างในเบราว์เซอร์ ให้ server ใช้ id เดียวกัน */
    commit(m) {
      pending++;
      const e = epoch;
      queue = queue.then(() => call({ action: m.action, args: m.args, ids: m.ids }))
        .then(r => { pending--; if (!pending) apply(r, true, e); })
        .catch(async (e) => { pending--; store.emitError(e); try { await sync(false); } catch (x) {} });
      return queue;
    },
    async login(email, password) { const e = ++epoch; const r = await call({ action: 'login', args: [email, password] }); if (e !== epoch) return; token.set(r.token); apply(r, true); },
    async registerOfficer(data) { return call({ action: 'registerOfficer', args: [data] }); },
    async register(data) { const e = ++epoch; const r = await call({ action: 'register', args: [data] }); if (e !== epoch) return; token.set(r.token); apply(r, true); },
    logout() { call({ action: 'logout' }).catch(() => {}); token.set(null); snap.clear(); epoch++; store.setUser(null); sync(false).catch(() => {}); },
    reset() { throw new Error('ระบบจริงไม่มีการรีเซ็ตข้อมูลสาธิต'); },
    /* ไฟล์ใน Google Drive ("drive:<id>") — ขอผ่าน API เพื่อตรวจสิทธิ์ แล้วแคชไว้ */
    fileUrl(ref) {
      if (!ref || !String(ref).startsWith('drive:')) return Promise.resolve(ref);
      if (!files.has(ref)) files.set(ref, call({ action: 'getFile', args: [ref] }).then(r => r.dataUrl).catch(e => { files.delete(ref); throw e; }));
      return files.get(ref);
    },
    pollFast(on) { if (fast !== on) { fast = on; schedule(); } }
  };
})();
