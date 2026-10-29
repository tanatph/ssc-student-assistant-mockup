/* แดชบอร์ดแอดมิน: 3 แท็บ (การสมัคร / การปฏิบัติงาน / การลงเวลาและระเบียบ) + ปรับแต่งหน้าตาได้
   ปรับแต่ง = ซ่อน/แสดงวิดเจ็ต เรียงลำดับ (ปุ่มลูกศรหรือลากวาง) และปรับความกว้าง
   บันทึกที่บัญชีผู้ใช้ (Store.saveMyPrefs('dash')) จึงเหมือนกันทุกเครื่อง
   เพิ่มวิดเจ็ตใหม่: เพิ่มรายการใน WIDGETS[แท็บ] { id, title, size, render(ctx) } */
(function () {
  const U = window.UI;
  const S = window.Store;
  const T = S.util;
  const RED = '#D71920', BLUE = '#1D4ED8';
  const SIZES = [[4, '⅓'], [6, '½'], [8, '⅔'], [12, 'เต็ม']];
  const TABS = [['apply', 'ข้อมูลการสมัครทำงาน', 'users'], ['work', 'ข้อมูลการปฏิบัติงาน', 'calendar'], ['disc', 'การลงเวลาและระเบียบ', 'clock']];
  const LEVEL = { yellow: ['ใบเหลือง', '#EAB308'], orange: ['ใบส้ม', '#EA7A0C'], red: ['ใบแดง', RED] };
  const st = { tab: ss('dash-tab') || 'apply', ym: T.dateKey().slice(0, 7), range: ss('dash-range') || 'month', edit: false, all: false };
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  const fmtD = (d) => U.fmtDate(d, { day: 'numeric', month: 'short' });
  const fmtTip = (d) => U.fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
  const name = (id) => S.appOfUser(id)?.profile.fullName || S.chatName(id);
  const kpis = (rows) => `<div class="kpis" style="margin:0">${rows.map(([l, v, d, ic, p]) => `<div class="kpi"><div class="label">${U.icon(ic)}${l}</div><div class="value">${v}</div><div class="delta">${d}</div>${p != null ? `<div class="bar"><i style="width:${p}%"></i></div>` : ''}</div>`).join('')}</div>`;
  const head = (title, right = '') => `<div class="chart-title"><h3>${title}</h3>${right ? `<span>${right}</span>` : ''}</div>`;
  const levelBadge = (lv) => lv ? `<span class="badge lv" style="--lv:${LEVEL[lv][1]}"><i></i>${LEVEL[lv][0]}</span>` : '<span class="badge tone-good">ปกติ</span>';
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  /* ================= ข้อมูลของแต่ละแท็บ ================= */
  function applyCtx() {
    const all = S.apps(), sub = all.filter(a => a.status !== 'draft'), s = S.settings;
    const count = (x) => all.filter(a => a.status === x).length;
    const inSet = (...x) => sub.filter(a => x.includes(a.status)).length;
    const times = sub.map(a => a.submittedAt).filter(Boolean);
    let d0 = Date.parse(s.openDate + 'T12:00:00+07:00'), d1 = Date.parse(s.closeDate + 'T12:00:00+07:00');
    if (times.length) { d0 = Math.min(d0, ...times); d1 = Math.max(d1, ...times); }
    const days = []; for (let t = d0; U.dayKey(t) <= U.dayKey(d1); t += 864e5) days.push(U.dayKey(t));
    const perDay = days.map(d => times.filter(t => U.dayKey(t) === d).length);
    let acc = 0; const cumul = perDay.map(v => acc += v);
    const fac = {}; sub.forEach(a => fac[a.profile.faculty] = (fac[a.profile.faculty] || 0) + 1);
    const facRows = Object.entries(fac).sort((a, b) => b[1] - a[1]);
    const facTop = facRows.slice(0, 6); if (facRows.length > 6) facTop.push(['อื่น ๆ', facRows.slice(6).reduce((n, r) => n + r[1], 0)]);
    return { all, sub, count, inSet, days, perDay, cumul, closeIdx: days.indexOf(s.closeDate), facTop };
  }
  function workCtx() {
    const ym = st.ym, today = T.dateKey(), r = S.roster(ym);
    const sched = r && r.status === 'confirmed' ? r.shifts.filter(x => x.userId) : [];
    // นับเฉพาะวันที่เลิกงานไปแล้ว (วันนี้นับหลังเวลาเลิกงาน) ไม่ให้วันนี้ขึ้นเป็น 0 คน
    const done = (d) => d < today || (d === today && T.timeOf(Date.now()) >= S.work.shiftEnd);
    const past = sched.filter(x => done(x.date));
    const wdays = T.monthDates(ym).filter(d => done(d) && S.work.workDays.includes(T.weekday(d)));
    const att = S.attendance().filter(x => x.date.startsWith(ym) && x.kind === 'shift');
    const mins = (x) => x.out ? (x.out.ts - x.in.ts) / 6e4 : 0;
    const jobs = S.jobs().filter(j => j.date.startsWith(ym));
    return { ym, r, sched, past, wdays, att, mins, jobs, attended: past.filter(x => att.some(a => a.ref === x.id)).length };
  }
  function discCtx() {
    const end = T.monthDates(st.ym).slice(-1)[0];
    const [from, to, label] = st.range === 'all' ? ['2000-01-01', '2999-12-31', 'ทั้งหมด']
      : st.range === '3m' ? [T.addMonth(st.ym, -2) + '-01', end, `${T.thMonth(T.addMonth(st.ym, -2))} – ${T.thMonth(st.ym)}`]
      : [st.ym + '-01', end, T.thMonth(st.ym)];
    const rep = S.disciplineReport(from, to);
    const recs = S.attendance().filter(x => x.kind === 'shift' && x.date >= from && x.date <= to);
    const lateM = recs.map(x => S.lateMinutes(x)).filter(m => m > 0);
    const days = [...new Set(recs.map(x => x.date).concat(rep.flatMap(p => p.absentDates)))].sort();
    return { from, to, label, rep, recs, lateM, days };
  }

  /* ================= วิดเจ็ต ================= */
  const WIDGETS = {
    apply: [
      { id: 'a-kpi', title: 'ตัวเลขสรุปการสมัคร', size: 12, plain: true, render: (c) => kpis([
        ['ส่งใบสมัครแล้ว', c.sub.length, `จากบัญชีที่ลงทะเบียน ${c.all.length} บัญชี`, 'send', 100],
        ['รอตรวจเอกสาร', c.count('submitted') + c.count('revise'), `ขอเอกสารเพิ่ม ${c.count('revise')} ราย`, 'file', pct(c.count('submitted') + c.count('revise'), c.sub.length)],
        ['นัดสัมภาษณ์', c.count('interview') + c.count('verified'), `เอกสารครบ ${c.count('verified')} ราย`, 'calendar', pct(c.count('interview') + c.count('verified'), c.sub.length)],
        ['ผ่านการคัดเลือก', c.count('passed'), `ไม่ผ่าน ${c.count('failed')} ราย`, 'award', pct(c.count('passed'), c.sub.length)]]) },
      { id: 'a-cumul', title: 'ใบสมัครสะสม', size: 8, render: (c) => head('ใบสมัครสะสม', 'หน่วย: ใบ') + U.lineChart({ title: 'ใบสมัครสะสม', labels: c.days,
        series: [{ name: 'ใบสมัครสะสม', values: c.cumul, color: RED, area: true }], fmtX: fmtD, fmtTip, extra: i => `ส่งใหม่วันนี้ ${c.perDay[i]} ใบ`, marks: c.closeIdx >= 0 ? [{ i: c.closeIdx, label: 'ปิดรับสมัคร' }] : [] }) },
      { id: 'a-funnel', title: 'ขั้นตอนการคัดเลือก', size: 4, render: (c) => head('ขั้นตอนการคัดเลือก', `${c.sub.length} ใบสมัคร`) + U.funnel([
        ['ส่งใบสมัคร', c.sub.length, 'send'], ['เอกสารครบถ้วน', c.inSet('verified', 'interview', 'passed', 'failed', 'resigned'), 'file'],
        ['ได้รับสัมภาษณ์', c.inSet('interview', 'passed', 'failed', 'resigned'), 'calendar'], ['ผ่านการคัดเลือก', c.inSet('passed', 'resigned'), 'award']]) },
      { id: 'a-pos', title: 'ผู้สมัครและผู้ผ่าน ตามตำแหน่ง', size: 8, render: (c) => head('ผู้สมัครและผู้ผ่านการคัดเลือก ตามตำแหน่ง', '<span class="lc-legend inline"><span><i style="--c:#F3B9BC"></i>สมัคร</span><span><i style="--c:#D71920"></i>ผ่าน</span></span>')
        + U.bullets(POSITIONS.map(p => [p.th, c.sub.filter(a => a.profile.position1 === p.id).length, c.all.filter(a => ['passed', 'resigned'].includes(a.status) && (a.resultPosition || a.profile.position1) === p.id).length])) },
      { id: 'a-docs', title: 'ความครบถ้วนของเอกสาร', size: 4, render: (c) => { const ok = c.sub.filter(a => U.docsDone(a) === U.docsReq).length; return head('ความครบถ้วนของเอกสาร')
        + `<div class="ring-row">${U.ring(ok, c.sub.length, 'เอกสารครบ')}<ul class="ring-list"><li><b>${ok}</b> ครบ 3 รายการ</li><li><b>${c.sub.length - ok}</b> ยังไม่ครบ</li><li><b>${c.sub.filter(a => (a.docs.certificates || []).length || a.profile.certText).length}</b> มีเกียรติบัตร</li></ul></div>`; } },
      { id: 'a-fac', title: 'ผู้สมัครตามคณะ', size: 6, render: (c) => head('ผู้สมัครตามคณะ', 'หน่วย: คน') + U.hbars(c.facTop) },
      { id: 'a-year', title: 'ผู้สมัครตามชั้นปี', size: 6, render: (c) => head('ผู้สมัครตามชั้นปี', 'หน่วย: คน') + U.vcols([1, 2, 3, 4, 5, 6].map(y => ['ปี ' + y, c.sub.filter(a => a.profile.year == y).length]).filter((r, i) => i < 4 || r[1])) },
      { id: 'a-recent', title: 'ใบสมัครล่าสุด', size: 12, render: (c) => head('ใบสมัครล่าสุด', '<a href="#/admin/applicants">ดูทั้งหมด</a>') + U.applicantTable(c.sub.slice().sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 6)) }
    ],
    work: [
      { id: 'w-kpi', title: 'ตัวเลขสรุปการปฏิบัติงาน', size: 12, plain: true, render: (c) => kpis([
        ['นิสิตช่วยงาน', S.apps().filter(a => a.status === 'passed').length, `สิ้นสุดการทำงานแล้ว ${S.apps().filter(a => a.status === 'resigned').length} คน`, 'users'],
        ['เวรทั้งเดือน', c.sched.length, c.r ? (c.r.status === 'confirmed' ? `ผ่านไปแล้ว ${c.past.length} เวร` : 'ตารางยังไม่ยืนยัน') : 'ยังไม่มีตาราง', 'calendar'],
        ['มาทำงานตามเวร', pct(c.attended, c.past.length) + '%', `${c.attended} จาก ${c.past.length} เวร`, 'checkc', pct(c.attended, c.past.length)],
        ['ชั่วโมงทำงานรวม', Math.round(c.att.reduce((m, x) => m + c.mins(x), 0) / 60), 'ชั่วโมง (เวรประจำ)', 'clock'],
        ['งานเพิ่มเติม', c.jobs.length, `มีผู้รับ ${c.jobs.reduce((n, j) => n + j.takers.length, 0)} จาก ${c.jobs.reduce((n, j) => n + j.slots, 0)} ที่`, 'megaphone']]) },
      { id: 'w-daily', title: 'เวรตามตาราง และการมาทำงานรายวัน', size: 12, render: (c) => head('เวรตามตาราง และการมาทำงานรายวัน', 'วันทำงาน · หน่วย: คน') + (c.wdays.length ? U.lineChart({
        title: 'การมาทำงานรายวัน', labels: c.wdays, height: 240, fmtX: fmtD, fmtTip,
        series: [{ name: 'มาทำงาน', short: 'มา', values: c.wdays.map(d => new Set(c.att.filter(x => x.date === d).map(x => x.userId)).size), color: RED, area: true },
          { name: 'เวรตามตาราง', short: 'เวร', values: c.wdays.map(d => c.past.filter(x => x.date === d).length), color: BLUE, dash: true }] }) : '<p class="muted">ยังไม่มีข้อมูลเดือนนี้</p>') },
      { id: 'w-pos', title: 'การมาทำงานตามฝ่าย', size: 6, render: (c) => head('การมาทำงานตามฝ่าย', '<span class="lc-legend inline"><span><i style="--c:#F3B9BC"></i>เวรที่ผ่านมา</span><span><i style="--c:#D71920"></i>มาทำงาน</span></span>')
        + U.bullets(POSITIONS.map(p => { const ps = c.past.filter(x => x.position === p.id); return [p.th, ps.length, ps.filter(x => c.att.some(a => a.ref === x.id)).length]; })) },
      { id: 'w-loc', title: 'เวรตามสถานที่', size: 6, render: (c) => head('เวรตามสถานที่', 'ทั้งเดือน · หน่วย: เวร') + U.hbars(LOCATIONS.map(l => [l.short, c.sched.filter(x => x.location === l.id).length]).filter(r => r[1]), 'เวร') },
      { id: 'w-hours', title: 'ชั่วโมงทำงานรายคน', size: 6, render: (c) => { const h = {}; c.att.forEach(x => h[x.userId] = (h[x.userId] || 0) + c.mins(x));
        const rows = Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, m]) => [S.chatName(id), Math.round(m / 6) / 10]);
        return head('ชั่วโมงทำงานรายคน', '10 อันดับแรก · หน่วย: ชม.') + (rows.length ? U.hbars(rows, 'ชม.') : '<p class="muted">ยังไม่มีข้อมูล</p>'); } },
      { id: 'w-jobs', title: 'งานเพิ่มเติมของเดือน', size: 6, render: (c) => head('งานเพิ่มเติมของเดือน', '<a href="#/admin/jobs">จัดการงาน</a>') + (c.jobs.length ? `<div class="dw-list">${c.jobs.map(j =>
        `<div class="dw-li"><span><b>${U.esc(j.title)}</b><small class="muted">${fmtTip(j.date)} · ${j.start}–${j.end} น.</small></span><span class="badge ${j.takers.length >= j.slots ? 'tone-good' : 'tone-warn'}">${j.takers.length}/${j.slots} คน</span></div>`).join('')}</div>` : '<p class="muted">ไม่มีงานเพิ่มเติมในเดือนนี้</p>') }
    ],
    disc: [
      { id: 'd-kpi', title: 'ตัวเลขสรุปการลงเวลา', size: 12, plain: true, render: (c) => { const late = c.lateM.length, abs = c.rep.reduce((n, p) => n + p.absent, 0);
        return kpis([
          ['มาตรงเวลา', pct(c.recs.length - late, c.recs.length) + '%', `${c.recs.length - late} จาก ${c.recs.length} ครั้งที่มา`, 'checkc', pct(c.recs.length - late, c.recs.length)],
          ['มาสาย', late, `รวม ${c.lateM.reduce((a, b) => a + b, 0)} นาที`, 'clock'],
          ['ขาดงาน', abs, 'เวรที่ไม่ได้ลงเวลาเข้างาน', 'alert'],
          ['ค่าปรับมาสายรวม', '฿' + c.rep.reduce((n, p) => n + p.fine, 0).toLocaleString(), RULES.lateFine.split('·')[0], 'file'],
          ['ได้รับใบเตือน', c.rep.filter(p => p.level).length + ' คน', `ใบแดง ${c.rep.filter(p => p.level === 'red').length} คน`, 'award']]); } },
      { id: 'd-cards', title: 'สรุปใบเหลือง ใบส้ม ใบแดง', size: 12, render: (c) => head('สรุปใบเหลือง ใบส้ม ใบแดง', c.label) + `<div class="cards-row">${RULES.cards.map(card => {
        const who = c.rep.filter(p => p.level === card.level);
        return `<div class="rule-card rule-${card.level} dw-rule"><div class="flex between"><span class="tag">${card.label}</span><b class="dw-big">${who.length}<small> คน</small></b></div>
          <div class="small muted">${card.text} · ${card.absent} / ${card.late} / ${card.leave}</div>
          <div class="chips mt-1">${who.map(p => `<span class="chip">${U.esc(S.chatName(p.userId))}</span>`).join('') || '<span class="small muted">ไม่มี</span>'}</div></div>`; }).join('')}</div>
        <p class="small muted mt-1 mb-0">${U.icon('alert')} “ลาไม่มีผู้แทน” ยังไม่มีระบบบันทึกการลา จึงคำนวณจากการขาดงานและมาสายเท่านั้น</p>` },
      { id: 'd-watch', title: 'รายชื่อที่ต้องติดตาม', size: 12, render: (c) => { const rows = st.all ? c.rep : c.rep.filter(p => p.absent || p.late);
        const nextTxt = (p) => !p.next ? '—' : `อีก ${p.next.left} ครั้ง (${p.next.kind === 'late' ? 'สาย' : 'ขาด'}) → ${LEVEL[['yellow', 'orange', 'red'][p.level ? ['yellow', 'orange', 'red'].indexOf(p.level) + 1 : 0]][0]}`;
        return head('รายชื่อที่ต้องติดตาม', `<label class="switch small"><input type="checkbox" id="dwAll" ${st.all ? 'checked' : ''}><span></span>แสดงทุกคน</label> <button class="btn btn-ghost btn-sm" id="dwCsv">${U.icon('download')} CSV</button>`)
          + (rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>นิสิต</th><th>ฝ่าย</th><th>เวร</th><th>มา</th><th>ขาด</th><th>สาย</th><th>ค่าปรับ</th><th>ระดับ</th><th>ใกล้ระดับถัดไป</th></tr></thead><tbody>${rows.map(p => `<tr>
            <td><b>${U.esc(name(p.userId))}</b>${p.status === 'resigned' ? '<span class="sub">สิ้นสุดการทำงานแล้ว</span>' : ''}</td><td>${U.esc(T.posTh(p.position))}</td><td>${p.shifts}</td><td>${p.worked}</td>
            <td ${p.absent ? 'class="warn-text"' : ''} title="${p.absentDates.map(fmtD).join(', ')}">${p.absent}</td><td>${p.late}${p.late ? `<span class="sub">${p.lateMinutes} นาที</span>` : ''}</td>
            <td>${p.fine ? '฿' + p.fine : '-'}</td><td>${levelBadge(p.level)}</td><td class="small">${nextTxt(p)}</td></tr>`).join('')}</tbody></table></div>`
          : `<div class="empty">${U.icon('checkc')}<p>ไม่มีนิสิตขาดงานหรือมาสายในช่วงนี้</p></div>`); } },
      { id: 'd-trend', title: 'มาสายและขาดงานรายวัน', size: 8, render: (c) => head('มาสายและขาดงานรายวัน', 'หน่วย: ครั้ง') + (c.days.length > 1 ? U.lineChart({
        title: 'มาสายและขาดงาน', labels: c.days, fmtX: fmtD, fmtTip,
        series: [{ name: 'มาสาย', short: 'สาย', values: c.days.map(d => c.recs.filter(x => x.date === d && S.lateMinutes(x)).length), color: RED, area: true },
          { name: 'ขาดงาน', short: 'ขาด', values: c.days.map(d => c.rep.reduce((n, p) => n + p.absentDates.filter(x => x === d).length, 0)), color: BLUE, dash: true }] }) : '<p class="muted">ยังไม่มีข้อมูล</p>') },
      { id: 'd-late', title: 'มาสายกี่นาที', size: 4, render: (c) => head('มาสายกี่นาที', 'หน่วย: ครั้ง') + U.vcols([['1–5', 1, 5], ['6–15', 6, 15], ['16–30', 16, 30], ['31+', 31, 1e9]].map(([l, a, b]) => [l + ' น.', c.lateM.filter(m => m >= a && m <= b).length]), 'ครั้ง')
        + `<p class="small muted mt-1 mb-0">${RULES.lateFine}</p>` }
    ]
  };

  /* ================= เลย์เอาต์ (บันทึกที่บัญชี) ================= */
  const defaults = (tab) => WIDGETS[tab].map(w => ({ id: w.id, size: w.size, hidden: false }));
  function layoutOf(tab) {
    const saved = (S.myPrefs('dash') || {})[tab] || [];
    const known = saved.filter(x => WIDGETS[tab].some(w => w.id === x.id));
    WIDGETS[tab].forEach(w => { if (!known.some(x => x.id === w.id)) known.push({ id: w.id, size: w.size, hidden: false }); });   // วิดเจ็ตใหม่ต่อท้าย
    return known;
  }
  function saveLayout(tab, list) {
    const all = Object.assign({}, S.myPrefs('dash') || {}, { [tab]: list });
    try { S.saveMyPrefs('dash', all); } catch (e) { U.toast(e.message, true); }
  }

  /* ================= วาดหน้า ================= */
  function render(main) {
    const tab = WIDGETS[st.tab] ? st.tab : 'apply';
    const ctx = tab === 'apply' ? applyCtx() : tab === 'work' ? workCtx() : discCtx();
    const layout = layoutOf(tab);
    const def = (id) => WIDGETS[tab].find(w => w.id === id);
    const shown = layout.filter(x => !x.hidden), hidden = layout.filter(x => x.hidden);
    const period = tab === 'apply' ? `<span class="muted small">ปีการศึกษา ${U.esc(S.settings.academicYear)}</span>`
      : `<div class="flex dw-period"><button class="btn btn-ghost btn-icon btn-sm" data-ym="-1" aria-label="เดือนก่อน">${U.icon('back')}</button><b>${T.thMonth(st.ym)}</b><button class="btn btn-ghost btn-icon btn-sm" data-ym="1" aria-label="เดือนถัดไป">${U.icon('arrow')}</button>
        ${tab === 'disc' ? `<select class="input" id="dwRange" aria-label="ช่วงเวลา"><option value="month" ${st.range === 'month' ? 'selected' : ''}>เฉพาะเดือนนี้</option><option value="3m" ${st.range === '3m' ? 'selected' : ''}>3 เดือนล่าสุด</option><option value="all" ${st.range === 'all' ? 'selected' : ''}>ทั้งหมด</option></select>` : ''}</div>`;
    main.innerHTML = `
      <div class="admin-head">
        <div><h2>แดชบอร์ดรายงาน</h2><span class="muted small">อัปเดต ${U.fmtDateTime(Date.now())}</span></div>
        <div class="flex">${tab === 'apply' ? `<button class="btn btn-ghost btn-sm" id="exportBtn">${U.icon('download')} ส่งออก CSV</button>` : ''}
          ${st.edit ? `<button class="btn btn-ghost btn-sm" id="dwReset">รีเซ็ตแท็บนี้</button><button class="btn btn-sm" id="dwDone">${U.icon('check')} เสร็จสิ้น</button>`
            : `<button class="btn btn-soft btn-sm" id="dwEdit">${U.icon('settings')} ปรับแต่งแดชบอร์ด</button>`}</div>
      </div>
      <nav class="tabs mb-2">${TABS.map(([id, label, ic]) => `<a href="#" data-tab="${id}" class="${id === tab ? 'active' : ''}">${U.icon(ic)}<span>${label}</span></a>`).join('')}</nav>
      <div class="flex between mb-2">${period}${st.edit ? `<span class="small muted">${U.icon('edit')} ลากวิดเจ็ต หรือใช้ปุ่ม ↑ ↓ เพื่อเรียงลำดับ · ปุ่มขนาดเพื่อปรับความกว้าง · ✕ เพื่อซ่อน</span>` : ''}</div>
      ${st.edit && hidden.length ? `<div class="dw-tray"><b class="small">วิดเจ็ตที่ซ่อนไว้:</b>${hidden.map(x => `<button class="btn btn-ghost btn-sm" data-add="${x.id}">+ ${U.esc(def(x.id).title)}</button>`).join('')}</div>` : ''}
      <div class="dash-grid ${st.edit ? 'dw-editing' : ''}" id="dwGrid">
        ${shown.map((x, i) => { const w = def(x.id); return `<section class="dw span-${x.size} ${w.plain ? 'dw-plain' : 'card'}" data-w="${x.id}" ${st.edit ? 'draggable="true"' : ''}>
          ${st.edit ? `<div class="dw-tools"><span class="dw-grip" title="ลากเพื่อย้าย">⠿</span><b>${U.esc(w.title)}</b>
            <button data-act="up" ${i ? '' : 'disabled'} aria-label="เลื่อนขึ้น">↑</button><button data-act="down" ${i < shown.length - 1 ? '' : 'disabled'} aria-label="เลื่อนลง">↓</button>
            <button data-act="size" title="ความกว้าง" aria-label="ความกว้าง">${SIZES.find(s => s[0] === x.size)[1]}</button><button data-act="hide" aria-label="ซ่อน">✕</button></div>` : ''}
          ${w.render(ctx)}</section>`; }).join('') || `<div class="card span-12 empty">${U.icon('eye')}<p>ซ่อนวิดเจ็ตทั้งหมดในแท็บนี้แล้ว — กด “ปรับแต่งแดชบอร์ด” เพื่อเพิ่มกลับ</p></div>`}
      </div>`;
    U.drawCharts(main);
    bind(main, tab, layout, ctx);
  }

  function bind(main, tab, layout, ctx) {
    const rerender = () => render(main);
    const commit = () => { saveLayout(tab, layout); rerender(); };
    const move = (id, to) => { const from = layout.findIndex(x => x.id === id); const [it] = layout.splice(from, 1); layout.splice(to, 0, it); };
    const vis = () => layout.filter(x => !x.hidden);
    U.$$('[data-tab]', main).forEach(a => a.onclick = (e) => { e.preventDefault(); st.tab = a.dataset.tab; ss('dash-tab', st.tab); rerender(); });
    U.$$('[data-ym]', main).forEach(b => b.onclick = () => { st.ym = T.addMonth(st.ym, +b.dataset.ym); rerender(); });
    U.$('#dwRange') && (U.$('#dwRange').onchange = (e) => { st.range = e.target.value; ss('dash-range', st.range); rerender(); });
    U.$('#dwAll') && (U.$('#dwAll').onchange = (e) => { st.all = e.target.checked; rerender(); });
    U.$('#dwCsv') && (U.$('#dwCsv').onclick = () => csv(ctx));
    U.$('#exportBtn') && (U.$('#exportBtn').onclick = () => U.exportCsv(S.apps()));
    U.$('#dwEdit') && (U.$('#dwEdit').onclick = () => { st.edit = true; rerender(); });
    U.$('#dwDone') && (U.$('#dwDone').onclick = () => { st.edit = false; rerender(); U.toast('บันทึกหน้าตาแดชบอร์ดแล้ว'); });
    U.$('#dwReset') && (U.$('#dwReset').onclick = () => { if (confirm('คืนค่าแท็บนี้เป็นค่าเริ่มต้น?')) { layout.splice(0, layout.length, ...defaults(tab)); commit(); } });
    U.$$('[data-add]', main).forEach(b => b.onclick = () => { layout.find(x => x.id === b.dataset.add).hidden = false; commit(); });
    U.$$('.dw-tools button', main).forEach(b => b.onclick = () => {
      const id = b.closest('[data-w]').dataset.w, it = layout.find(x => x.id === id), v = vis(), i = v.indexOf(it);
      if (b.dataset.act === 'up' && i > 0) move(id, layout.indexOf(v[i - 1]));
      if (b.dataset.act === 'down' && i < v.length - 1) move(id, layout.indexOf(v[i + 1]));
      if (b.dataset.act === 'size') { const k = SIZES.findIndex(s => s[0] === it.size); it.size = SIZES[(k + 1) % SIZES.length][0]; }
      if (b.dataset.act === 'hide') it.hidden = true;
      commit();
    });
    /* ลากวาง (คอมพิวเตอร์) */
    let dragId = null;
    U.$$('.dw[draggable]', main).forEach(el => {
      el.addEventListener('dragstart', (e) => { dragId = el.dataset.w; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop'));
      el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drop'); if (dragId && dragId !== el.dataset.w) { move(dragId, layout.findIndex(x => x.id === el.dataset.w)); commit(); } });
    });
  }

  function csv(c) {
    const head = ['ชื่อ-นามสกุล', 'ฝ่าย', 'เวรที่ผ่านมา', 'มาทำงาน', 'ขาดงาน', 'วันที่ขาด', 'มาสาย (ครั้ง)', 'มาสาย (นาที)', 'ค่าปรับ (บาท)', 'ระดับ'];
    const rows = c.rep.map(p => [name(p.userId), T.posTh(p.position), p.shifts, p.worked, p.absent, p.absentDates.join(' '), p.late, p.lateMinutes, p.fine, p.level ? LEVEL[p.level][0] : 'ปกติ']);
    const text = '﻿' + [head].concat(rows).map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = `ระเบียบการลงเวลา_${c.from === '2000-01-01' ? 'ทั้งหมด' : c.from + '_' + c.to}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  window.renderDashboard = render;
})();
