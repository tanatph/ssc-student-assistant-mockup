/* CORE: ลงเวลาเข้า–ออกงาน (สแกนใบหน้า + GPS)
   ค่าที่ชี้ขาดคำนวณที่นี่ (เวลา, ระยะห่าง, ผลเทียบใบหน้า) — server ไม่เชื่อค่าที่ส่งมาจากเบราว์เซอร์
   ใบหน้า: เบราว์เซอร์สกัด descriptor (128 ค่า) ด้วย face-api แล้วส่งมา — สแกนครั้งแรกใช้เป็นใบหน้าอ้างอิง */
defineCoreModule(['checkIn', 'checkOut', 'resetFace'], function (S, ctx, api) {
  const U = CoreUtil, need = U.need;
  const W = () => ctx.db().work;
  const me = () => ctx.user();

  function evaluate(scan, userId) {
    const w = W().settings;
    const lat = +scan.lat, lng = +scan.lng;
    need(isFinite(lat) && isFinite(lng), 'ไม่มีข้อมูลตำแหน่ง GPS');
    const dist = U.distanceM(lat, lng, w.geo.lat, w.geo.lng);
    const inside = dist <= w.geo.radius;
    need(inside || w.allowOutside, `คุณอยู่นอกพื้นที่ศูนย์กีฬา (ห่าง ${dist.toLocaleString()} ม.) ไม่สามารถลงเวลาได้`);
    const ref = W().faces[userId];
    const desc = Array.isArray(scan.descriptor) && scan.descriptor.length === 128 ? scan.descriptor.map(Number) : null;
    let face;
    if (desc && !ref) { W().faces[userId] = { descriptor: desc, photo: scan.photo || null, ts: ctx.now() }; face = { matched: true, enrolled: true, distance: 0 }; }
    else if (desc && ref) { const d = U.euclid(desc, ref.descriptor); face = { matched: d < w.faceThreshold, distance: +d.toFixed(2), manual: !!scan.manual && d >= w.faceThreshold }; }
    else face = { matched: null, manual: true };
    return { ts: ctx.now(), lat: +lat.toFixed(6), lng: +lng.toFixed(6), acc: Math.round(+scan.acc || 0), dist, inside, face, photo: scan.photo || null };
  }

  api({
    attendance: () => W().attendance,
    /* งานของผู้ใช้วันนี้: เวรตามตาราง + งานเพิ่มเติมที่รับไว้ */
    todayTasks(userId, date = U.dateKey(ctx.now())) {
      const w = W().settings;
      const t = S.myShifts(userId).filter(s => s.date === date).map(s => ({ kind: 'shift', ref: s.id, position: s.position, location: s.location, title: U.locName(s.location), start: w.shiftStart, end: w.shiftEnd }));
      W().jobs.filter(j => j.date === date && j.takers.some(x => x.userId === userId)).forEach(j => t.push({ kind: 'job', ref: j.id, position: 'job', location: j.location, title: j.title, start: j.start, end: j.end }));
      return t.map(x => Object.assign(x, { record: W().attendance.find(r => r.userId === userId && r.ref === x.ref && r.date === date) || null }));
    },
    faceRef: (userId) => W().faces[userId] || null,
    resetFace(userId) { need(me()?.role === 'admin', 'เฉพาะเจ้าหน้าที่'); delete W().faces[userId]; },
    checkIn(ref, scan) {
      const u = me();
      need(u, 'กรุณาเข้าสู่ระบบ');
      const task = S.todayTasks(u.id).find(t => t.ref === ref);
      need(task, 'วันนี้คุณไม่มีงานนี้');
      need(!task.record, 'ลงเวลาเข้างานแล้ว');
      const rec = { id: ctx.uid(), userId: u.id, date: U.dateKey(ctx.now()), kind: task.kind, ref: task.ref, position: task.position, location: task.location, title: task.title, in: evaluate(scan, u.id) };
      W().attendance.push(rec);
      return rec;
    },
    checkOut(ref, scan) {
      const u = me();
      const rec = W().attendance.find(r => r.userId === u?.id && r.ref === ref && r.date === U.dateKey(ctx.now()));
      need(rec, 'ยังไม่ได้ลงเวลาเข้างาน');
      need(!rec.out, 'ลงเวลาออกงานแล้ว');
      rec.out = evaluate(scan, u.id);
      return rec;
    },
    /* รายงานระเบียบ (ใบเหลือง/ส้ม/แดง) ช่วงวันที่ from–to (YYYY-MM-DD)
       ขาดงาน = มีเวรในตารางที่ยืนยันแล้ว เลยเวลาเลิกงานแล้ว แต่ไม่มีการลงเวลาเข้างาน
       ลาไม่มีผู้แทน = ยังไม่มีระบบลา จึงนับเป็น 0 */
    disciplineReport(from, to) {
      const w = W().settings, now = ctx.now(), today = U.dateKey(now);
      const th = RULES.thresholds, LV = ['yellow', 'orange', 'red'];
      const over = (s) => s.date < today || (s.date === today && U.timeOf(now) >= w.shiftEnd);
      const shifts = Object.values(W().roster).filter(r => r.status === 'confirmed').flatMap(r => r.shifts)
        .filter(s => s.userId && s.date >= from && s.date <= to && over(s));
      const recs = W().attendance.filter(r => r.kind === 'shift' && r.date >= from && r.date <= to);
      const ids = new Set(shifts.map(s => s.userId).concat(recs.map(r => r.userId)));
      return [...ids].map(userId => {
        const mine = shifts.filter(s => s.userId === userId), rs = recs.filter(r => r.userId === userId);
        const absentList = mine.filter(s => !rs.some(r => r.ref === s.id)).map(s => s.date);
        const lates = rs.map(r => S.lateMinutes(r)).filter(m => m > 0);
        const fine = lates.reduce((sum, m) => sum + RULES.lateFines.find(f => m <= f.upTo).baht, 0);
        const c = { absent: absentList.length, leave: 0, late: lates.length };
        let level = -1;
        Object.keys(th).forEach(k => th[k].forEach((v, i) => { if (c[k] >= v) level = Math.max(level, i); }));
        // ใกล้ระดับถัดไป: เกณฑ์ที่เหลือน้อยที่สุด
        let next = null;
        if (level < 2) Object.keys(th).forEach(k => { if (k === 'leave') return; const left = th[k][level + 1] - c[k]; if (!next || left < next.left) next = { kind: k, left }; });
        const app = S.appOfUser(userId);
        return { userId, position: app ? (app.resultPosition || app.profile.position1) : '', status: app ? app.status : '',
          shifts: mine.length, worked: rs.length, absent: c.absent, absentDates: absentList, leave: 0, late: c.late,
          lateMinutes: lates.reduce((a, b) => a + b, 0), lateList: lates, fine, level: level >= 0 ? LV[level] : '', next };
      }).sort((a, b) => LV.indexOf(b.level) - LV.indexOf(a.level) || b.absent - a.absent || b.late - a.late);
    },
    lateMinutes(rec) { if (!rec?.in || rec.kind !== 'shift') return 0; return Math.max(0, Math.round((rec.in.ts - U.at(rec.date, W().settings.lateAfter)) / 6e4)); },
    distanceM: U.distanceM
  });
});
