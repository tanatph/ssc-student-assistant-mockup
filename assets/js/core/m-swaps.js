/* CORE: แลกเวรระหว่างนิสิตช่วยงาน (หลังประกาศตารางเวรแล้ว)
   1) เจ้าของเวรประกาศขอแลก (requestSwap) → เพื่อนในฝ่ายเดียวกันเห็น
   2) เพื่อนกดรับแลก (offerSwap) โดยเลือกเวรของตัวเองที่จะแลกคืน หรือรับแทนโดยไม่แลกคืน
   3) เจ้าของเวรยืนยัน (acceptSwap) → ระบบสลับชื่อในตารางทันที + เก็บประวัติ + แจ้งเตือนทุกฝ่ายและแอดมิน */
defineCoreModule(['requestSwap', 'cancelSwap', 'offerSwap', 'withdrawOffer', 'declineOffer', 'acceptSwap'], function (S, ctx, api) {
  const U = CoreUtil, need = U.need;
  const W = () => ctx.db().work;
  const me = () => ctx.user();
  const findShift = (id) => {
    for (const ym of Object.keys(W().roster)) { const r = W().roster[ym], s = r.shifts.find(x => x.id === id); if (s) return { ym, r, s }; }
    return null;
  };
  const upcoming = (s) => { const t = U.dateKey(ctx.now()); return s.date > t || (s.date === t && U.timeOf(ctx.now()) < W().settings.shiftStart); };
  const busyOn = (userId, date, exceptId) => Object.values(W().roster).some(r => r.shifts.some(x => x.userId === userId && x.date === date && x.id !== exceptId));
  const findSwap = (id) => { const x = W().swaps.find(v => v.id === id); need(x, 'ไม่พบประกาศแลกเวร'); return x; };
  const label = (s) => `${U.thDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${U.locShort(s.location)}`;
  const notify = (userId, title, body, ym) => S._notify(userId, { kind: 'swap', title, body, link: '#/work/roster/' + ym });

  /* ตรวจว่าข้อเสนอยังแลกได้จริง (เวรยังเป็นของเดิม ยังไม่ถึงวัน ไม่ชนวัน) */
  function check(x, o) {
    const a = findShift(x.shiftId);
    need(a && a.r.status === 'confirmed' && a.s.userId === x.userId && upcoming(a.s), 'เวรที่ประกาศแลกเปลี่ยนแปลงหรือผ่านไปแล้ว');
    need(S.posOfUser(o.userId) === x.position, 'แลกได้เฉพาะนิสิตในตำแหน่งเดียวกัน');
    need(!busyOn(o.userId, a.s.date, o.shiftId), `${S.chatName(o.userId)} มีเวรวันที่ ${+a.s.date.slice(8)} อยู่แล้ว`);
    let b = null;
    if (o.shiftId) {
      b = findShift(o.shiftId);
      need(b && b.r.status === 'confirmed' && b.s.userId === o.userId && b.s.position === x.position && upcoming(b.s), 'เวรที่เสนอแลกคืนเปลี่ยนแปลงหรือผ่านไปแล้ว');
      need(!busyOn(x.userId, b.s.date, x.shiftId), `${S.chatName(x.userId)} มีเวรวันที่ ${+b.s.date.slice(8)} อยู่แล้ว`);
    }
    return { a, b };
  }

  api({
    /* สถานะที่แสดงผล: open | done | cancelled | expired */
    swapState(x) {
      if (x.status !== 'open') return x.status;
      const a = findShift(x.shiftId);
      return a && a.s.userId === x.userId && upcoming(a.s) ? 'open' : 'expired';
    },
    swaps: () => W().swaps.slice().sort((a, b) => b.createdAt - a.createdAt),
    swapHistory: (ym) => W().swaps.filter(x => x.status === 'done' && (x.ym === ym || x.giveYm === ym)).sort((a, b) => b.closedAt - a.closedAt),
    swappedShiftIds() { const ids = new Set(); W().swaps.forEach(x => { if (x.status === 'done') { ids.add(x.shiftId); if (x.acceptedShiftId) ids.add(x.acceptedShiftId); } }); return ids; },
    /* เวรของฉันที่ยังมาไม่ถึง (ใช้เลือกแลกคืน) */
    myUpcomingShifts(userId) {
      return Object.entries(W().roster).filter(([, r]) => r.status === 'confirmed')
        .flatMap(([ym, r]) => r.shifts.filter(s => s.userId === userId && upcoming(s)).map(s => Object.assign({ ym }, s)))
        .sort((a, b) => a.date.localeCompare(b.date));
    },

    requestSwap(shiftId, note) {
      const u = me();
      need(S.isStaff(u), 'เฉพาะนิสิตช่วยงาน');
      const f = findShift(shiftId);
      need(f && f.r.status === 'confirmed' && f.s.userId === u.id, 'ไม่ใช่เวรของคุณ');
      need(upcoming(f.s), 'เวรนี้ถึงเวลาทำงานแล้ว แลกไม่ได้');
      need(!W().swaps.some(x => x.shiftId === shiftId && S.swapState(x) === 'open'), 'ประกาศขอแลกเวรนี้ไว้แล้ว');
      const x = { id: ctx.uid(), shiftId, ym: f.ym, date: f.s.date, location: f.s.location, position: f.s.position, userId: u.id,
        note: String(note || '').trim().slice(0, 200), status: 'open', offers: [], createdAt: ctx.now() };
      W().swaps.push(x);
      S.staffOf(x.position).forEach(a => { if (a.userId !== u.id) notify(a.userId, `${S.chatName(u.id)} ขอแลกเวร`, `${label(f.s)}${x.note ? ' — ' + x.note : ''}`, x.ym); });
      S._postCard('pos-' + x.position, { kind: 'swap', ref: x.id, ym: x.ym, title: `ขอแลกเวร ${label(f.s)}`, text: `ฝ่าย${U.posTh(x.position)}${x.note ? ' · ' + x.note : ''}` });
      return x;
    },
    cancelSwap(id) {
      const x = findSwap(id);
      need(x.userId === me()?.id, 'ยกเลิกได้เฉพาะประกาศของตัวเอง');
      need(x.status === 'open', 'ประกาศนี้ปิดแล้ว');
      Object.assign(x, { status: 'cancelled', closedAt: ctx.now() });
      x.offers.forEach(o => notify(o.userId, `${S.chatName(x.userId)} ยกเลิกประกาศแลกเวร`, label(x), x.ym));
    },
    offerSwap(id, myShiftId) {
      const u = me(), x = findSwap(id);
      need(S.swapState(x) === 'open', 'ประกาศนี้ปิดแล้ว');
      need(x.userId !== u?.id, 'นี่คือประกาศของคุณเอง');
      need(!x.offers.some(o => o.userId === u.id), 'คุณเสนอรับแลกเวรนี้ไว้แล้ว');
      const o = { userId: u.id, shiftId: myShiftId || null, ts: ctx.now() };
      const { b } = check(x, o);
      x.offers.push(o);
      notify(x.userId, `${S.chatName(u.id)} ขอรับแลกเวร ${label(x)}`, b ? `แลกกับเวรของเขา ${label(b.s)} — เข้าไปกดยืนยัน` : 'รับเวรแทนโดยไม่แลกคืน — เข้าไปกดยืนยัน', x.ym);
    },
    withdrawOffer(id) {
      const u = me(), x = findSwap(id);
      need(x.status === 'open', 'ประกาศนี้ปิดแล้ว');
      x.offers = x.offers.filter(o => o.userId !== u?.id);
    },
    declineOffer(id, userId) {
      const x = findSwap(id);
      need(x.userId === me()?.id && x.status === 'open', 'ไม่มีสิทธิ์');
      x.offers = x.offers.filter(o => o.userId !== userId);
      notify(userId, `${S.chatName(x.userId)} ไม่รับข้อเสนอแลกเวร`, label(x), x.ym);
    },
    /* ทั้งสองฝ่ายยืนยัน → สลับเวรทันที */
    acceptSwap(id, userId) {
      const x = findSwap(id);
      need(x.userId === me()?.id, 'ยืนยันได้เฉพาะเจ้าของเวร');
      need(S.swapState(x) === 'open', 'ประกาศนี้ปิดหรือหมดเวลาแล้ว');
      const o = x.offers.find(v => v.userId === userId);
      need(o, 'ไม่พบข้อเสนอนี้');
      const { a, b } = check(x, o);
      a.s.userId = o.userId;
      if (b) b.s.userId = x.userId;
      Object.assign(x, { status: 'done', closedAt: ctx.now(), acceptedUserId: o.userId, acceptedShiftId: o.shiftId,
        giveYm: b ? b.ym : null, giveDate: b ? b.s.date : null, giveLocation: b ? b.s.location : null });
      // ประกาศ/ข้อเสนออื่นที่ใช้เวรเหล่านี้ไม่ถูกต้องแล้ว
      W().swaps.forEach(v => {
        if (v === x || v.status !== 'open') return;
        if (b && v.shiftId === b.s.id) Object.assign(v, { status: 'cancelled', closedAt: ctx.now() });
        v.offers = v.offers.filter(p => p.shiftId !== x.shiftId && !(b && p.shiftId === b.s.id));
      });
      const what = b ? `${label(a.s)} ⇄ ${label(b.s)}` : `${label(a.s)} (รับแทน)`;
      notify(o.userId, 'แลกเวรสำเร็จ', `${S.chatName(x.userId)} ยืนยันแล้ว: ${what} — ตารางอัปเดตแล้ว`, x.ym);
      S._email(o.userId, '[ศูนย์กีฬาสิรินธร] แลกเวรสำเร็จ', `แลกเวรกับ ${S.chatName(x.userId)} เรียบร้อย\n${b ? `คุณทำงานแทน: ${U.thDate(a.s.date)} ที่ ${U.locName(a.s.location)}\n${S.chatName(x.userId)} ทำงานแทน: ${U.thDate(b.s.date)} ที่ ${U.locName(b.s.location)}` : `คุณรับทำงาน ${U.thDate(a.s.date)} ที่ ${U.locName(a.s.location)}`}`, 'swap', {
        table: S._shiftTable(o.userId, U.dateKey(ctx.now()), U.dateKey(ctx.now() + 30 * 864e5), 'เวรของคุณหลังแลก (30 วันข้างหน้า)'),
        link: '#/work/roster/' + x.ym, button: 'ดูตารางเวร' });
      x.offers.filter(p => p.userId !== o.userId).forEach(p => notify(p.userId, 'ประกาศแลกเวรปิดแล้ว', `${S.chatName(x.userId)} แลกกับคนอื่นแล้ว: ${label(x)}`, x.ym));
      S._adminIds().forEach(id => S._notify(id, { kind: 'swap', title: `แลกเวร: ${S.chatName(x.userId)} ⇄ ${S.chatName(o.userId)}`, body: what, link: '#/admin/roster/' + x.ym }));
    }
  });
});
