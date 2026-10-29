/* CORE: แจ้งสิ้นสุดการทำงาน + ใบประกาศนียบัตร (ลายเซ็นผู้อำนวยการแบบอิเล็กทรอนิกส์) */
defineCoreModule(['saveCertSettings', 'requestExit', 'cancelExit', 'rejectExit', 'approveExit'], function (S, ctx, api) {
  const U = CoreUtil, need = U.need;
  const W = () => ctx.db().work;
  const me = () => ctx.user();
  const needAdmin = () => need(me()?.role === 'admin', 'เฉพาะเจ้าหน้าที่เท่านั้น');
  const long = (d) => U.thDate(d, { day: 'numeric', month: 'long', year: 'numeric' });

  api({
    get certSettings() { return W().cert; },
    saveCertSettings(p) {
      needAdmin();
      const c = W().cert;
      ['directorName', 'directorTitle', 'signature', 'autoIssue'].forEach(k => { if (k in p) c[k] = p[k]; });
    },
    exits: () => W().exits.slice().sort((a, b) => b.ts - a.ts),
    myExit: (userId) => W().exits.filter(e => e.userId === userId).sort((a, b) => b.ts - a.ts)[0] || null,
    requestExit({ lastDay, reason }) {
      const u = me();
      need(S.isStaff(u), 'เฉพาะนิสิตช่วยงานเท่านั้น');
      need(/^\d{4}-\d{2}-\d{2}$/.test(lastDay) && String(reason || '').trim(), 'กรอกวันสุดท้ายและเหตุผล');
      const cur = S.myExit(u.id);
      need(!cur || cur.status !== 'pending', 'คุณส่งคำขอแจ้งสิ้นสุดการทำงานไว้แล้ว รอแอดมินอนุมัติ');
      const e = { id: ctx.uid(), userId: u.id, lastDay, reason: String(reason).slice(0, 500), ts: ctx.now(), status: 'pending' };
      W().exits.push(e);
      S._adminIds().forEach(id => S._notify(id, { kind: 'exit', title: `${S.chatName(u.id)} แจ้งสิ้นสุดการทำงาน`, body: `ปฏิบัติงานวันสุดท้าย ${long(lastDay)} — ${e.reason}`, link: '#/admin/certificates' }));
      if (W().cert.autoIssue && W().cert.signature) S._issue(e, 'auto');
      return e;
    },
    cancelExit(id) { const e = W().exits.find(x => x.id === id); need(e && e.userId === me()?.id && e.status === 'pending', 'ยกเลิกไม่ได้'); e.status = 'cancelled'; },
    rejectExit(id, note) {
      needAdmin();
      const e = W().exits.find(x => x.id === id);
      need(e && e.status === 'pending', 'ไม่พบคำขอ');
      Object.assign(e, { status: 'rejected', note: String(note || ''), decidedAt: ctx.now() });
      S._notify(e.userId, { kind: 'exit', title: 'คำขอแจ้งสิ้นสุดการทำงานไม่ได้รับการอนุมัติ', body: e.note || 'โปรดติดต่อพี่แอดมินในห้องแชท', link: '#/work/exit' });
    },
    approveExit(id) {
      needAdmin();
      const e = W().exits.find(x => x.id === id);
      need(e && e.status === 'pending', 'ไม่พบคำขอ');
      return S._issue(e, me().id);
    },
    /* อนุมัติ: สิ้นสุดการทำงาน, ลบเวร/งานหลังวันสุดท้าย, ออกใบประกาศ (ฝังลายเซ็น ณ เวลาที่ออก), แจ้งเตือน + อีเมล */
    _issue(e, by) {
      const a = S.appOfUser(e.userId), c = W().cert;
      need(c.signature, 'ยังไม่ได้อัปโหลดลายเซ็นผู้อำนวยการ (เมนู สิ้นสุดการทำงาน / ใบประกาศ)');
      const pos = a.resultPosition || a.profile.position1;
      const recs = W().attendance.filter(r => r.userId === e.userId && r.in && r.date <= e.lastDay);
      const minutes = recs.reduce((m, r) => m + (r.out ? Math.max(0, (r.out.ts - r.in.ts) / 6e4) : 0), 0);
      const dates = recs.map(r => r.date).sort();
      let removed = 0;
      Object.values(W().roster).forEach(r => { const n = r.shifts.length; r.shifts = r.shifts.filter(s => !(s.userId === e.userId && s.date > e.lastDay)); removed += n - r.shifts.length; });
      W().jobs.forEach(j => { j.takers = j.takers.filter(t => !(t.userId === e.userId && j.date > e.lastDay)); });
      const year = +U.dateKey(ctx.now()).slice(0, 4) + 543;
      const seq = W().certs.filter(x => x.no.endsWith('/' + year)).length + 1;
      const cert = {
        id: ctx.uid(), no: `SSC ${String(seq).padStart(3, '0')}/${year}`, userId: e.userId,
        name: a.profile.fullName, studentId: a.profile.studentId, faculty: a.profile.faculty, position: pos,
        from: dates[0] || U.dateKey(a.updatedAt), to: e.lastDay, hours: Math.round(minutes / 60), days: new Set(dates).size,
        academicYear: S.settings.academicYear, issuedAt: ctx.now(), issuedBy: by,
        signer: { name: c.directorName, title: c.directorTitle, signature: c.signature }
      };
      W().certs.push(cert);
      Object.assign(e, { status: 'approved', decidedAt: ctx.now(), certId: cert.id, removedShifts: removed });
      Object.assign(a, { status: 'resigned', updatedAt: ctx.now() });
      S._notify(e.userId, { kind: 'cert', title: 'ได้รับใบประกาศนียบัตรนิสิตช่วยงานแล้ว', body: `ขอบคุณที่ร่วมเป็นส่วนหนึ่งของศูนย์กีฬาสิรินธร — ใบประกาศเลขที่ ${cert.no}`, link: '#/certificate/' + cert.id });
      S._email(e.userId, `[ศูนย์กีฬาสิรินธร] ใบประกาศนียบัตรนิสิตช่วยงาน เลขที่ ${cert.no}`,
        `เรียน ${a.profile.fullName}\n\nศูนย์กีฬาสิรินธรขอขอบคุณที่ปฏิบัติงานในตำแหน่งนิสิตช่วยงาน ฝ่าย${U.posTh(pos)}\nตั้งแต่ ${long(cert.from)} ถึง ${long(cert.to)} รวม ${cert.hours} ชั่วโมง\n\nดาวน์โหลด/พิมพ์ใบประกาศได้ที่ระบบ เมนู "ใบประกาศของฉัน"\nเลขที่ใบประกาศสำหรับตรวจสอบ: ${cert.no}\n\n${c.directorName}\n${c.directorTitle}`, 'cert', {
          card: { title: 'ใบประกาศนียบัตรนิสิตช่วยงาน', rows: [['เลขที่', cert.no], ['ฝ่าย', U.posTh(pos)], ['ระยะเวลา', `${long(cert.from)} – ${long(cert.to)}`], ['รวม', `${cert.hours} ชั่วโมง`]] },
          link: '#/certificate/' + cert.id, button: 'เปิด / พิมพ์ใบประกาศ' });
      if (removed) S._adminIds().forEach(id => S._notify(id, { kind: 'roster', title: 'ลบเวรของผู้สิ้นสุดการทำงานแล้ว', body: `${S.chatName(e.userId)}: ลบเวรหลังวันสุดท้าย ${removed} เวร — ตรวจตารางเวรเพื่อหาคนแทน`, link: '#/admin/roster' }));
      return cert;
    },
    certs: () => W().certs.slice().sort((a, b) => b.issuedAt - a.issuedAt),
    cert: (id) => W().certs.find(c => c.id === id) || null,
    certByNo: (no) => W().certs.find(c => c.no === no) || null,
    myCerts: (userId) => W().certs.filter(c => c.userId === userId)
  });
});
