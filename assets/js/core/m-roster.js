/* CORE: ตั้งค่างาน + ตารางเวร
   จัดเวรอัตโนมัติ: เลือกคนที่มีเวรน้อยสุดก่อน (เฉลี่ยเท่ากัน ±1) แล้วจับคู่คนกับจุดด้วยต้นทุนต่ำสุด
   ต้นทุน = อยู่จุดเดิมกับเวรก่อน (หนักมาก) + เคยอยู่จุดนี้บ่อย → ธุรการวนสถานที่ไม่ซ้ำและกระจายเท่ากัน */
defineCoreModule(['saveWorkSettings', 'generateRoster', 'updateShift', 'addShift', 'removeShift', 'confirmRoster', 'unlockRoster'], function (S, ctx, api) {
  const U = CoreUtil, need = U.need;
  const W = () => ctx.db().work;
  const needAdmin = () => need(ctx.user()?.role === 'admin', 'เฉพาะเจ้าหน้าที่เท่านั้น');

  const WORK_DEFAULTS = {
    workDays: [1, 2, 3, 4, 5],                 // 0 = อาทิตย์ ... 6 = เสาร์
    shiftStart: '16:30', shiftEnd: '20:30',
    lateAfter: '16:30',
    reminderTime: '07:00',
    staffing: {                                // จำนวนคนต่อจุดต่อวัน
      reception: { badminton: 1, fitness: 1, tennis: 1, aquatic: 1 },   // ธุรการ 4 คน
      trainer: { fitness: 3 },                                          // ผู้ฝึกสอน 3 คน
      firstaid: { fitness: 1, aquatic: 1 },                             // ปฐมพยาบาล 2 คน
      lifeguard: { aquatic: 3 }                                         // ชีวภัยทางน้ำ 3 คน
    },
    geo: { lat: 14.1062, lng: 100.9907, radius: 500 },   // ⚠ พิกัดตัวอย่าง ตั้งค่าจริงในหน้า "ตั้งค่างาน"
    allowOutside: false,
    faceThreshold: 0.5,
    signerTitle: 'นักวิชาการศึกษา'
  };

  function permute(arr) {
    if (arr.length <= 1 || arr.length > 7) return [arr];
    const out = [], seen = new Set();
    arr.forEach((x, i) => permute(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(rest => {
      const p = [x].concat(rest), k = p.join();
      if (!seen.has(k)) { seen.add(k); out.push(p); }
    }));
    return out;
  }

  api({
    _normalizeWork() {
      const d = ctx.db();
      d.work ||= {};
      const w = d.work;
      w.settings = Object.assign({}, WORK_DEFAULTS, w.settings);
      w.roster ||= {}; w.jobs ||= []; w.attendance ||= []; w.notifications ||= []; w.outbox ||= [];
      w.reminded ||= {}; w.faces ||= {}; w.exits ||= []; w.certs ||= []; w.swaps ||= [];
      w.cert = Object.assign({ directorName: '', directorTitle: 'ผู้อำนวยการศูนย์กีฬาสิรินธร', signature: null, autoIssue: false }, w.cert);
    },
    get work() { return W().settings; },
    saveWorkSettings(p) { needAdmin(); Object.assign(W().settings, p); },
    util: U,

    posOfUser(userId) { const a = S.appOfUser(userId); return a && a.status === 'passed' ? (a.resultPosition || a.profile.position1) : null; },
    isStaff: (u) => !!u && u.role !== 'admin' && !!S.posOfUser(u.id),
    staffOf: (pos) => S.apps().filter(a => a.status === 'passed' && (a.resultPosition || a.profile.position1) === pos),

    _generate(ym) {
      const s = W().settings;
      const dates = U.monthDates(ym).filter(d => s.workDays.includes(U.weekday(d)));
      const shifts = [];
      let seed = ym.split('-').reduce((a, b) => a * 31 + +b, 7);
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      POSITIONS.forEach(p => {
        const slots = Object.entries(s.staffing[p.id] || {}).flatMap(([loc, n]) => Array(+n || 0).fill(loc));
        const staff = S.staffOf(p.id).map(a => ({ id: a.userId, total: 0, per: {}, last: null, tie: rnd() }));
        if (!slots.length || !staff.length) return;
        dates.forEach(date => {
          const k = Math.min(slots.length, staff.length);
          const chosen = staff.slice().sort((a, b) => a.total - b.total || a.tie - b.tie).slice(0, k);
          const cost = (st, loc) => (st.last === loc ? 100 : 0) + (st.per[loc] || 0) * 3;
          let best = null, bestCost = Infinity;
          permute(slots.slice(0, k)).forEach(perm => {
            const c = perm.reduce((sum, loc, i) => sum + cost(chosen[i], loc), 0);
            if (c < bestCost) { bestCost = c; best = perm; }
          });
          best.forEach((loc, i) => {
            const st = chosen[i];
            st.total++; st.per[loc] = (st.per[loc] || 0) + 1; st.last = loc; st.tie = rnd();
            shifts.push({ id: ctx.uid(), date, position: p.id, location: loc, userId: st.id });
          });
        });
      });
      return shifts;
    },

    roster: (ym) => W().roster[ym] || null,
    rosterMonths: () => Object.keys(W().roster).sort(),
    generateRoster(ym) {
      needAdmin();
      need(/^\d{4}-\d{2}$/.test(ym), 'เดือนไม่ถูกต้อง');
      const r = W().roster[ym];
      need(!r || r.status !== 'confirmed', 'เดือนนี้ยืนยันเวรแล้ว ต้องปลดล็อกก่อน');
      W().roster[ym] = { status: 'draft', generatedAt: ctx.now(), shifts: S._generate(ym) };
      return W().roster[ym];
    },
    updateShift(ym, shiftId, patch) {
      needAdmin();
      const r = W().roster[ym];
      need(r && r.status !== 'confirmed', 'ยืนยันเวรแล้ว แก้ไขไม่ได้');
      const s = r.shifts.find(x => x.id === shiftId);
      need(s, 'ไม่พบเวร');
      s.userId = String(patch.userId || '');
      r.editedAt = ctx.now();
    },
    addShift(ym, shift) {
      needAdmin();
      const r = W().roster[ym];
      need(r && r.status !== 'confirmed', 'ยืนยันเวรแล้ว แก้ไขไม่ได้');
      need(/^\d{4}-\d{2}-\d{2}$/.test(shift.date) && POSITIONS.some(p => p.id === shift.position) && LOCATIONS.some(l => l.id === shift.location), 'ข้อมูลเวรไม่ถูกต้อง');
      r.shifts.push({ id: ctx.uid(), date: shift.date, position: shift.position, location: shift.location, userId: String(shift.userId || '') });
      r.editedAt = ctx.now();
    },
    /* ลบช่องเวร (เช่น วันนี้ไม่ต้องใช้คนที่จุดนี้) */
    removeShift(ym, shiftId) {
      needAdmin();
      const r = W().roster[ym];
      need(r && r.status !== 'confirmed', 'ยืนยันเวรแล้ว แก้ไขไม่ได้');
      r.shifts = r.shifts.filter(s => s.id !== shiftId);
      r.editedAt = ctx.now();
    },
    /* ตรวจคุณภาพตาราง: เวรซ้ำในวันเดียว / ธุรการอยู่จุดเดิมติดกัน / จำนวนเวรต่างกันเกิน 1 */
    rosterIssues(ym) {
      const r = W().roster[ym]; if (!r) return [];
      const out = [], byDayUser = {};
      r.shifts.filter(s => s.userId).forEach(s => {
        const k = s.date + s.userId;
        if (byDayUser[k]) out.push({ type: 'double', shift: s, text: `${S.chatName(s.userId)} มีเวรซ้ำ 2 จุดในวันที่ ${+s.date.slice(8)}` });
        byDayUser[k] = 1;
      });
      POSITIONS.forEach(p => {
        const list = r.shifts.filter(s => s.position === p.id && s.userId).sort((a, b) => a.date.localeCompare(b.date));
        const last = {}, count = {};
        S.staffOf(p.id).forEach(a => count[a.userId] = 0);
        list.forEach(s => {
          count[s.userId] = (count[s.userId] || 0) + 1;
          if (p.id === 'reception' && last[s.userId] === s.location) out.push({ type: 'repeat', shift: s, text: `${S.chatName(s.userId)} อยู่ ${U.locShort(s.location)} ติดกัน 2 เวร (วันที่ ${+s.date.slice(8)})` });
          last[s.userId] = s.location;
        });
        const v = Object.values(count);
        if (v.length && Math.max(...v) - Math.min(...v) > 1) out.push({ type: 'balance', text: `ฝ่าย${p.th}: จำนวนเวรต่อคนต่างกัน ${Math.min(...v)}–${Math.max(...v)} เวร` });
      });
      return out;
    },
    /* ยืนยันเวร → นิสิตเห็นตาราง + แจ้งเตือนในระบบและอีเมลรายคน */
    confirmRoster(ym) {
      needAdmin();
      const r = W().roster[ym];
      need(r && r.status === 'draft', 'ไม่มีตารางฉบับร่าง');
      Object.assign(r, { status: 'confirmed', confirmedAt: ctx.now(), confirmedBy: ctx.user().id });
      S._postCard('staff', { kind: 'roster', ref: ym, title: `ตารางเวรเดือน${U.thMonth(ym)} ยืนยันแล้ว`, text: `เวลา ${W().settings.shiftStart}–${W().settings.shiftEnd} น. · กดเพื่อดูวันและสถานที่ทำงานของคุณ` });
      const byUser = {};
      r.shifts.forEach(s => (byUser[s.userId] ||= []).push(s));
      const w = W().settings;
      S._staffIds().forEach(id => {
        const mine = (byUser[id] || []).sort((a, b) => a.date.localeCompare(b.date));
        const lines = mine.map(s => `- ${U.thDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}  ${U.locName(s.location)}`).join('\n');
        S._notify(id, { kind: 'roster', title: `ตารางเวรเดือน${U.thMonth(ym)} ยืนยันแล้ว`, body: `คุณมีเวร ${mine.length} วัน เข้าไปดูรายละเอียดได้ที่ "งานของฉัน"`, link: '#/work/roster' });
        S._email(id, `[ศูนย์กีฬาสิรินธร] ตารางเวรเดือน${U.thMonth(ym)}`, mine.length ? `ตารางเวรเดือน${U.thMonth(ym)} ยืนยันแล้ว คุณมีเวร ${mine.length} วัน (รายละเอียดด้านล่าง)` : `ตารางเวรเดือน${U.thMonth(ym)} ยืนยันแล้ว เดือนนี้คุณไม่มีเวร`, 'roster', {
          table: S._shiftTable(id, ym + '-01', ym + '-31', `ตารางเวรของคุณ เดือน${U.thMonth(ym)}`), link: '#/work/roster/' + ym, button: 'ดูตารางเวรในระบบ' });
      });
    },
    unlockRoster(ym) { needAdmin(); const r = W().roster[ym]; need(r, 'ไม่พบตาราง'); r.status = 'draft'; r.unlockedAt = ctx.now(); },
    myShifts: (userId, ym) => Object.entries(W().roster).filter(([k, r]) => r.status === 'confirmed' && (!ym || k === ym))
      .flatMap(([, r]) => r.shifts.filter(s => s.userId === userId)).sort((a, b) => a.date.localeCompare(b.date))
  });
});
