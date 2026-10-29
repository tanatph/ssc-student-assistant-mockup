/* Store ฝั่งเบราว์เซอร์ = CORE (กฎของระบบ) + ข้อมูลในหน่วยความจำ + backend
   หน้าเว็บ (ui/*) เรียกใช้ Store.* เท่านั้น — ไม่ต้องรู้ว่าข้อมูลมาจาก localStorage หรือ Apps Script */
(function () {
  const backend = CONFIG.BACKEND === 'gas' ? GasBackend : LocalBackend;
  let db = {}, userId = null, recording = null;
  const remote = [], errors = [];
  const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const ctx = {
    env: 'client',
    db: () => db,
    user: () => (userId && db.users && db.users.find(u => u.id === userId)) || null,
    now: () => Date.now(),
    uid: () => { const id = genId(); if (recording) recording.push(id); return id; }
  };
  const S = createCore(ctx);

  /* คำสั่งที่เปลี่ยนข้อมูล: ทำในเบราว์เซอร์ทันที แล้วส่งให้ backend บันทึก */
  CORE.mutations.forEach(name => {
    const fn = S[name];
    S[name] = function (...args) {
      recording = [];
      let result, ids;
      try { result = fn.apply(S, args); } finally { ids = recording; recording = null; }
      backend.commit({ action: name, args, ids });
      return result;
    };
  });

  const hooks = {
    getDb: () => db,
    setDb: (d) => { db = d; S.normalize(); },
    setUser: (id) => { userId = id; },
    emitRemote: () => remote.forEach(f => { try { f(); } catch (e) { console.error(e); } }),
    emitError: (e) => errors.forEach(f => f(e))
  };

  Object.assign(S, {
    mode: backend.name,
    db: () => db,
    uidRaw: genId,
    ready: backend.init(hooks),
    login: (email, password) => backend.login(email, password, S).then(() => ctx.user()),
    registerOfficer: (data) => backend.registerOfficer(data, S),
    register: (data) => backend.register(data, S).then(() => ctx.user()),
    logout: () => backend.logout(),
    reset: () => backend.reset(),
    fileUrl: (ref) => backend.fileUrl(ref),
    pollFast: (on) => backend.pollFast(on),
    /* มีข้อมูลใหม่จาก server / แท็บอื่น */
    onRemote: (f) => remote.push(f),
    /* server ปฏิเสธคำสั่ง */
    onError: (f) => errors.push(f)
  });
  window.Store = S;
})();
