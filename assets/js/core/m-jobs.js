/* CORE: งานเพิ่มเติม — แอดมินเปิดรับ (เช่น แทนเจ้าหน้าที่ติดประชุม) นิสิตช่วยงานกดรับตามลำดับก่อน–หลัง */
defineCoreModule(['createJob', 'takeJob', 'leaveJob', 'closeJob', 'deleteJob'], function (S, ctx, api) {
  const U = CoreUtil, need = U.need;
  const W = () => ctx.db().work;
  const me = () => ctx.user();
  const needAdmin = () => need(me()?.role === 'admin', 'เฉพาะเจ้าหน้าที่เท่านั้น');
  const findJob = (id) => { const j = W().jobs.find(x => x.id === id); need(j, 'ไม่พบงานนี้'); return j; };

  api({
    jobs: () => W().jobs.slice().sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)),
    createJob(j) {
      needAdmin();
      need(j.title && j.date && j.start < j.end && +j.slots > 0, 'กรอกข้อมูลงานให้ครบ');
      const job = { id: ctx.uid(), title: String(j.title), detail: String(j.detail || ''), date: j.date, start: j.start, end: j.end, location: String(j.location), slots: Math.min(50, +j.slots), createdAt: ctx.now(), createdBy: me().id, status: 'open', takers: [] };
      W().jobs.push(job);
      const when = `${U.thDate(job.date)} เวลา ${job.start}–${job.end} น.`;
      S._postCard('staff', { kind: 'job', ref: job.id, title: job.title, text: `${U.thDate(job.date, { weekday: 'short', day: 'numeric', month: 'short' })} ${job.start}–${job.end} น. · ${job.location}` });
      S._staffIds().forEach(id => {
        S._notify(id, { kind: 'job', title: 'มีงานเพิ่มเติมเปิดรับ', body: `${job.title} — ${when} (${job.slots} ตำแหน่ง)`, link: '#/work/jobs' });
        S._email(id, `[ศูนย์กีฬาสิรินธร] เปิดรับงานเพิ่มเติม: ${job.title}`, `มีงานเพิ่มเติมเปิดรับ สนใจกด "รับงาน" ในระบบ (รับตามลำดับก่อน–หลัง)${job.detail ? '\n\n' + job.detail : ''}`, 'job', {
          card: { title: job.title, rows: [['วันที่', U.thDate(job.date)], ['เวลา', `${job.start}–${job.end} น.`], ['สถานที่', job.location], ['จำนวนที่รับ', `${job.slots} คน`]] },
          link: '#/work/jobs/' + job.id, button: 'ดู / รับงานนี้' });
      });
      return job;
    },
    /* คืนค่าเวรประจำที่ชนวันเดียวกัน (ถ้ามี) ให้หน้าเว็บเตือน */
    takeJob(jobId) {
      const j = findJob(jobId), u = me();
      need(S.isStaff(u), 'เฉพาะนิสิตช่วยงาน');
      need(!j.takers.some(t => t.userId === u.id), 'คุณรับงานนี้แล้ว');
      need(j.status === 'open' && j.date >= U.dateKey(ctx.now()), 'งานนี้ปิดรับแล้ว');
      need(j.takers.length < j.slots, 'งานนี้มีผู้รับครบแล้ว');
      const clash = S.myShifts(u.id).find(s => s.date === j.date);
      j.takers.push({ userId: u.id, ts: ctx.now() });
      if (j.takers.length >= j.slots) j.status = 'full';
      S._adminIds().forEach(id => S._notify(id, { kind: 'job', title: `${S.chatName(u.id)} รับงานเพิ่มเติม`, body: `${j.title} (${j.takers.length}/${j.slots})`, link: '#/admin/jobs' }));
      S._email(u.id, `[ศูนย์กีฬาสิรินธร] ยืนยันการรับงาน: ${j.title}`, `คุณได้รับงาน "${j.title}" เรียบร้อยแล้ว`, 'job', {
        card: { title: j.title, rows: [['วันที่', U.thDate(j.date)], ['เวลา', `${j.start}–${j.end} น.`], ['สถานที่', j.location]] },
        link: '#/work/jobs/' + j.id, button: 'ดูงานในระบบ' });
      return clash || null;
    },
    leaveJob(jobId) {
      const j = findJob(jobId), u = me();
      need(j.takers.some(t => t.userId === u?.id), 'คุณไม่ได้รับงานนี้');
      need(j.date > U.dateKey(ctx.now()), 'ยกเลิกได้ก่อนวันทำงานเท่านั้น');
      j.takers = j.takers.filter(t => t.userId !== u.id);
      if (j.status === 'full') j.status = 'open';
      S._adminIds().forEach(id => S._notify(id, { kind: 'job', title: `${S.chatName(u.id)} ยกเลิกรับงาน`, body: j.title, link: '#/admin/jobs' }));
    },
    closeJob(jobId) { needAdmin(); const j = findJob(jobId); j.status = j.status === 'closed' ? (j.takers.length >= j.slots ? 'full' : 'open') : 'closed'; },
    deleteJob(jobId) { needAdmin(); W().jobs = W().jobs.filter(x => x.id !== jobId); }
  });
});
