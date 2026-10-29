/* CORE: แจ้งเตือนในระบบ + อีเมล + แจ้งเวรประจำวัน
   อีเมลเข้าคิว outbox — ฝั่ง server (gas/Mail.js) ส่งจริงด้วย MailApp, โหมดสาธิตบันทึกไว้เฉย ๆ */
defineCoreModule(['readNotifications', 'runDailyReminders'], function (S, ctx, api) {
  const U = CoreUtil;
  const W = () => ctx.db().work;
  const me = () => ctx.user();

  api({
    _notify(userId, n) { W().notifications.push(Object.assign({ id: ctx.uid(), userId, ts: ctx.now(), read: false }, n)); },
    /* opt (ไม่บังคับ) แนบในอีเมลแบบ HTML:
       card:  { title, rows: [[หัวข้อ, ค่า], ...] }       กล่องสรุปข้อมูล
       table: { title, head: [...], rows: [[...], ...] } ตาราง เช่น ตารางเวร
       link:  '#/work/roster'  button: 'ดูตารางเวร'      ปุ่มลิงก์เข้าระบบ */
    _email(userId, subject, body, kind, opt) {
      const u = ctx.db().users.find(x => x.id === userId);
      if (!u || !u.email) return;
      const o = opt || {};
      W().outbox.push({ id: ctx.uid(), userId, to: u.email, toName: S.chatName(userId), subject, body, kind, ts: ctx.now(),
        card: o.card || null, table: o.table || null, link: o.link || null, button: o.button || null,
        status: ctx.env === 'server' ? 'queued' : 'ส่งแล้ว (จำลอง)' });
    },
    /* อีเมล HTML (inline style ให้แสดงถูกในโปรแกรมอีเมล) — baseUrl = ที่อยู่หน้าเว็บของระบบ */
    emailHtml(m, baseUrl) {
      const e = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const RED = '#D71920', F = "font-family:'Noto Sans Thai',Tahoma,Arial,sans-serif;";
      const url = m.link && baseUrl ? String(baseUrl).split('#')[0] + m.link : '';
      const card = m.card ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:18px 0;border:1px solid #F3D4D6;border-radius:10px;background:#FFF7F7">
          ${m.card.title ? `<tr><td colspan="2" style="${F}padding:12px 16px 4px;font-weight:700;color:${RED};font-size:15px">${e(m.card.title)}</td></tr>` : ''}
          ${m.card.rows.map(([k, v]) => `<tr><td style="${F}padding:6px 16px;color:#6B7280;font-size:14px;width:38%;vertical-align:top">${e(k)}</td><td style="${F}padding:6px 16px;color:#1C1F24;font-size:14px;font-weight:600">${e(v)}</td></tr>`).join('')}
          <tr><td colspan="2" style="height:8px"></td></tr></table>` : '';
      const table = m.table && m.table.rows.length ? `<p style="${F}margin:18px 0 6px;font-weight:700;color:#1C1F24;font-size:15px">${e(m.table.title || '')}</p>
          <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px">
          <tr>${m.table.head.map(h => `<th style="${F}text-align:left;padding:8px 10px;background:#F5F5F6;color:#454B54;border-bottom:2px solid ${RED}">${e(h)}</th>`).join('')}</tr>
          ${m.table.rows.map((r, i) => `<tr>${r.map(c => `<td style="${F}padding:8px 10px;border-bottom:1px solid #E5E7EB;${i % 2 ? 'background:#FAFAFB;' : ''}">${e(c)}</td>`).join('')}</tr>`).join('')}</table>` : '';
      const btn = url ? `<table role="presentation" style="margin:22px 0 6px"><tr><td style="border-radius:999px;background:${RED}"><a href="${e(url)}" style="${F}display:inline-block;padding:12px 26px;color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:999px">${e(m.button || 'เปิดในระบบ')} →</a></td></tr></table>
          <p style="${F}font-size:12px;color:#9CA3AF;margin:4px 0 0">หรือคัดลอกลิงก์: <a href="${e(url)}" style="color:#9CA3AF">${e(url)}</a></p>` : '';
      return `<div style="background:#F5F5F6;padding:20px 10px"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border-collapse:collapse">
        <tr><td style="${F}background:${RED};color:#fff;padding:16px 22px;font-weight:700;font-size:16px">ศูนย์กีฬาสิรินธร มศว <span style="font-weight:400;opacity:.85">· ระบบนิสิตช่วยงาน</span></td></tr>
        <tr><td style="${F}padding:22px;color:#1C1F24;font-size:15px;line-height:1.7">
          <p style="margin:0 0 6px">สวัสดี${e(m.toName ? ' ' + m.toName : '')}</p>
          <p style="margin:0">${e(m.body).replace(/\n/g, '<br>')}</p>${card}${table}${btn}</td></tr>
        <tr><td style="${F}padding:14px 22px;background:#FAFAFB;color:#9CA3AF;font-size:12px">อีเมลอัตโนมัติจากระบบนิสิตช่วยงาน ศูนย์กีฬาสิรินธร คณะพลศึกษา มศว — ไม่ต้องตอบกลับ</td></tr>
      </table></div>`;
    },
    /* ตารางเวรของผู้ใช้ช่วงวันที่ (ใช้แนบอีเมล) */
    _shiftTable(userId, from, to, title) {
      const w = W().settings;
      const rows = Object.values(W().roster).filter(r => r.status === 'confirmed').flatMap(r => r.shifts)
        .filter(s => s.userId === userId && s.date >= from && s.date <= to).sort((a, b) => a.date.localeCompare(b.date))
        .map(s => [U.thDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' }), U.locName(s.location), `${w.shiftStart}–${w.shiftEnd} น.`]);
      return { title, head: ['วันที่', 'สถานที่', 'เวลา'], rows };
    },
    _staffIds: () => S.apps().filter(a => a.status === 'passed').map(a => a.userId),
    _adminIds: () => ctx.db().users.filter(u => u.role === 'admin').map(u => u.id),

    notifications: (userId) => W().notifications.filter(n => n.userId === userId).sort((a, b) => b.ts - a.ts),
    unreadNotifications: (userId) => W().notifications.filter(n => n.userId === userId && !n.read).length,
    readNotifications() { const id = me()?.id; W().notifications.forEach(n => { if (n.userId === id) n.read = true; }); },
    outbox: () => W().outbox.slice().sort((a, b) => b.ts - a.ts),

    /* ส่งแจ้งเตือนเวร/งานเพิ่มเติมของวันนี้ (ครั้งเดียวต่อเวร) — server เรียกจาก time trigger ทุกเช้า
       force = แอดมินกดส่งเองก่อนเวลา */
    runDailyReminders(force) {
      const w = W(), now = ctx.now(), today = U.dateKey(now);
      if (me() && me().role !== 'admin') return 0;
      if (!force && U.timeOf(now) < w.settings.reminderTime) return 0;
      const r = w.roster[today.slice(0, 7)];
      let n = 0;
      if (r && r.status === 'confirmed') r.shifts.filter(s => s.date === today && s.userId).forEach(s => {
        const key = `${today}:${s.id}`;
        if (w.reminded[key]) return;
        w.reminded[key] = now;
        const body = `วันนี้ (${U.thDate(today)}) คุณมีเวรปฏิบัติงานที่ ${U.locName(s.location)} เวลา ${w.settings.shiftStart}–${w.settings.shiftEnd} น.\nกรุณาลงเวลาเข้างานก่อน ${w.settings.lateAfter} น. ด้วยการสแกนใบหน้าในระบบ`;
        S._notify(s.userId, { kind: 'shift', title: `วันนี้ทำงานที่ ${U.locShort(s.location)}`, body, link: '#/work' });
        S._email(s.userId, `[ศูนย์กีฬาสิรินธร] แจ้งเวรวันนี้ — ${U.locName(s.location)}`, body, 'daily', {
          card: { title: 'เวรวันนี้', rows: [['วันที่', U.thDate(today)], ['สถานที่', U.locName(s.location)], ['เวลา', `${w.settings.shiftStart}–${w.settings.shiftEnd} น.`], ['ลงเวลาเข้างานก่อน', `${w.settings.lateAfter} น.`]] },
          table: S._shiftTable(s.userId, U.dateKey(now + 864e5), U.dateKey(now + 7 * 864e5), 'เวรของคุณใน 7 วันข้างหน้า'),
          link: '#/work', button: 'เปิดหน้าลงเวลา (สแกนหน้า)' });
        n++;
      });
      w.jobs.filter(j => j.date === today).forEach(j => j.takers.forEach(t => {
        const key = `${today}:job:${j.id}:${t.userId}`;
        if (w.reminded[key]) return;
        w.reminded[key] = now;
        const body = `วันนี้คุณมีงานเพิ่มเติม "${j.title}" ที่ ${j.location} เวลา ${j.start}–${j.end} น.`;
        S._notify(t.userId, { kind: 'job', title: `งานเพิ่มเติมวันนี้: ${j.title}`, body, link: '#/work/jobs' });
        S._email(t.userId, `[ศูนย์กีฬาสิรินธร] งานเพิ่มเติมวันนี้ — ${j.title}`, body, 'daily', {
          card: { title: j.title, rows: [['วันที่', U.thDate(j.date)], ['เวลา', `${j.start}–${j.end} น.`], ['สถานที่', j.location]] },
          link: '#/work', button: 'เปิดหน้าลงเวลา (สแกนหน้า)' });
        n++;
      }));
      // ล้างประวัติการแจ้งเก่ากว่า 14 วัน ไม่ให้ข้อมูลโตไม่สิ้นสุด
      const cutoff = U.dateKey(now - 14 * 864e5);
      Object.keys(w.reminded).forEach(k => { if (k.slice(0, 10) < cutoff) delete w.reminded[k]; });
      return n;
    }
  });
});
