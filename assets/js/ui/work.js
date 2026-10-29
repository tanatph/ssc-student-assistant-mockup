/* งานนิสิตช่วยงาน: ตารางเวร, งานเพิ่มเติม, ลงเวลาด้วยการสแกนหน้า + GPS, ใบลงเวลา Excel, แจ้งเตือน/อีเมล, สิ้นสุดการทำงาน + ใบประกาศ */
(function () {
  const U = window.UI;
  const S = window.Store;
  const T = S.util;
  const posTh = (id) => id === 'job' ? 'งานเพิ่มเติม' : (POSITIONS.find(p => p.id === id)?.th || id);
  const LOC_SHORT = (id) => LOCATIONS.find(l => l.id === id)?.short || id;
  const fullName = (userId) => S.appOfUser(userId)?.profile.fullName || S.chatName(userId);
  const dur = (min) => `${Math.floor(min / 60)}:${T.pad(Math.round(min % 60))}`;
  const recMinutes = (r) => r?.in && r?.out ? Math.max(0, (r.out.ts - r.in.ts) / 6e4) : 0;
  const thShort = (d) => T.thDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
  const thLong = (d) => T.thDate(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const MONTH_NAV = (ym, base) => `<div class="month-nav">
      <a class="btn btn-ghost btn-icon btn-sm" href="${base}/${T.addMonth(ym, -1)}" aria-label="เดือนก่อน">${U.icon('back')}</a>
      <b>${T.thMonth(ym)}</b>
      <a class="btn btn-ghost btn-icon btn-sm" href="${base}/${T.addMonth(ym, 1)}" aria-label="เดือนถัดไป">${U.icon('arrow')}</a></div>`;
  const loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('โหลดไลบรารีไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต')); document.head.appendChild(s);
  });
  const lateBadge = (r) => { const m = S.lateMinutes(r); return m ? `<span class="badge tone-warn">สาย ${m} นาที</span>` : (r?.in && r.kind === 'shift' ? '<span class="badge tone-good">ตรงเวลา</span>' : ''); };

  /* =========================================================
     สแกนใบหน้า + GPS — ขอสิทธิ์กล้อง/ตำแหน่งเฉพาะตอนกดลงเวลา และปิดทันทีหลังเสร็จ
     ========================================================= */
  const FACE_LIB = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
  const FACE_MODEL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
  let faceReady = null;
  // ใช้ WebGL ถ้ามี (เร็ว) — เครื่องที่ไม่รองรับ WebGL ใช้ CPU แทน (ช้ากว่าแต่ทำงานได้)
  const pickBackend = async () => { const tf = faceapi.tf; try { if (!(await tf.setBackend('webgl'))) throw 0; } catch (e) { await tf.setBackend('cpu'); } await tf.ready(); };
  const loadFace = () => faceReady ||= loadScript(FACE_LIB).then(pickBackend).then(() => Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODEL),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL)
  ])).catch(e => { faceReady = null; throw e; });

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('อุปกรณ์นี้ไม่รองรับ GPS'));
      navigator.geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
        e => reject(new Error(e.code === 1 ? 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — เปิดสิทธิ์ Location ให้เว็บไซต์นี้แล้วลองใหม่' : 'หาตำแหน่งไม่สำเร็จ ลองออกไปที่โล่งแล้วลองใหม่')),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }

  function scanFlow(task, mode, done) {
    const me = S.currentUser();
    const ref = S.faceRef(me.id);
    const w = S.work;
    let stream = null, timer = null, closed = false;
    const stop = () => { clearInterval(timer); timer = null; stream?.getTracks().forEach(t => t.stop()); stream = null; };
    const m = U.modal(`
      <div class="scan">
        <div class="flex between"><h3 class="mb-0">${mode === 'in' ? 'สแกนหน้าเข้างาน' : 'สแกนหน้าออกงาน'}</h3><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="ปิด">${U.icon('x')}</button></div>
        <p class="muted small mb-2">${U.esc(task.title)} · ${task.start}–${task.end} น.</p>
        <ol class="scan-steps"><li id="stGps">${U.icon('globe')}<span>ตรวจตำแหน่ง GPS</span></li><li id="stFace">${U.icon('user')}<span>${ref ? 'ยืนยันใบหน้า' : 'ลงทะเบียนใบหน้า (ครั้งแรก)'}</span></li><li id="stSave">${U.icon('check')}<span>บันทึกเวลา</span></li></ol>
        <div class="cam" id="cam"><video id="vid" playsinline muted></video><div class="cam-guide"></div><div class="cam-msg" id="camMsg"></div></div>
        <div id="scanInfo" class="notice tone-neutral small">${U.icon('shield')}<span>ระบบจะขอใช้ <b>กล้อง</b> และ <b>ตำแหน่ง GPS</b> เฉพาะตอนลงเวลานี้เท่านั้น และปิดกล้องทันทีเมื่อสแกนเสร็จ ภาพใบหน้าใช้เพื่อยืนยันตัวตนการเข้างานเท่านั้น</span></div>
        <div class="flex mt-2" id="scanActions"><button class="btn btn-block" id="startScan">${U.icon('eye')} เริ่มสแกน</button></div>
      </div>`);
    const modalEl = m;
    const info = (html, tone = 'neutral') => { const el = U.$('#scanInfo', modalEl); el.className = `notice tone-${tone} small`; el.innerHTML = html; };
    const step = (id, state) => { const el = U.$('#' + id, modalEl); el.className = state; };
    const camMsg = (t) => { U.$('#camMsg', modalEl).textContent = t; };
    const close = () => { closed = true; stop(); modalEl.remove(); window.removeEventListener('hashchange', close); };
    modalEl.addEventListener('click', e => { if (e.target === modalEl || e.target.closest('[data-close]')) { e.stopPropagation(); close(); } }, true);
    window.addEventListener('hashchange', close);
    loadFace().catch(() => {}); // โหลดโมเดลล่วงหน้าระหว่างรอ GPS

    U.$('#startScan', modalEl).onclick = async () => {
      U.$('#scanActions', modalEl).innerHTML = '';
      if (!window.isSecureContext) { info(`${U.icon('alert')}<span>กล้องและ GPS ใช้ได้เฉพาะเว็บที่เปิดผ่าน <b>https://</b> หรือ <b>localhost</b> เท่านั้น</span>`, 'warn'); return; }
      // 1) GPS
      step('stGps', 'cur'); info(`${U.icon('globe')}<span>กำลังหาตำแหน่ง…</span>`);
      let gps;
      try { gps = await getPosition(); } catch (e) { step('stGps', 'bad'); info(`${U.icon('alert')}<span>${e.message}</span>`, 'warn'); retryBtn(); return; }
      if (closed) return;
      const dist = S.distanceM(gps.lat, gps.lng, w.geo.lat, w.geo.lng);
      const inside = dist <= w.geo.radius;
      if (!inside && !w.allowOutside) { step('stGps', 'bad'); info(`${U.icon('alert')}<span>คุณอยู่นอกพื้นที่ศูนย์กีฬา (ห่าง ${dist.toLocaleString()} ม. เกินรัศมี ${w.geo.radius} ม.) ไม่สามารถลงเวลาได้</span>`, 'warn'); retryBtn(); return; }
      step('stGps', inside ? 'on' : 'warn');
      // 2) กล้อง + ใบหน้า
      step('stFace', 'cur');
      info(`${U.icon('user')}<span>${inside ? `อยู่ในพื้นที่ (ห่าง ${dist} ม.)` : `<b>นอกพื้นที่</b> ห่าง ${dist.toLocaleString()} ม. — จะบันทึกพร้อมหมายเหตุ`} · เปิดกล้อง…</span>`, inside ? 'good' : 'warn');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      } catch (e) { step('stFace', 'bad'); info(`${U.icon('alert')}<span>เปิดกล้องไม่ได้ — อนุญาตการใช้กล้องให้เว็บไซต์นี้แล้วลองใหม่</span>`, 'warn'); retryBtn(); return; }
      if (closed) return stop();
      const vid = U.$('#vid', modalEl);
      vid.srcObject = stream; await vid.play().catch(() => {});
      U.$('#cam', modalEl).classList.add('on');
      camMsg('กำลังโหลดระบบจดจำใบหน้า…');
      let faceOk = true;
      try { await loadFace(); } catch (e) { faceOk = false; }
      if (closed) return stop();
      if (!faceOk) { // ออฟไลน์/โหลดโมเดลไม่ได้ → ถ่ายรูปให้แอดมินตรวจภายหลัง
        camMsg('');
        info(`${U.icon('alert')}<span>โหลดระบบจดจำใบหน้าไม่ได้ ถ่ายภาพเพื่อให้แอดมินตรวจสอบภายหลังได้</span>`, 'warn');
        U.$('#scanActions', modalEl).innerHTML = `<button class="btn btn-block" id="snap">${U.icon('image')} ถ่ายภาพ</button>`;
        U.$('#snap', modalEl).onclick = () => finish(null, true);
        return;
      }
      camMsg('มองกล้อง ให้ใบหน้าอยู่ในกรอบ');
      const started = Date.now();
      let hits = 0, best = null, busy = false, lastDesc = null;
      timer = setInterval(async () => {
        if (busy || !stream) return; busy = true;
        try {
          const det = await faceapi.detectSingleFace(vid, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })).withFaceLandmarks(true).withFaceDescriptor();
          if (closed || !stream) return;
          if (!det) { hits = 0; camMsg(Date.now() - started > 4000 ? 'ไม่พบใบหน้า — เพิ่มแสง และหันหน้าตรงเข้ากล้อง' : 'มองกล้อง ให้ใบหน้าอยู่ในกรอบ'); return; }
          const desc = Array.from(det.descriptor);
          if (!ref) { hits++; camMsg('พบใบหน้า ถือค้างไว้…'); if (hits >= 3) finish(desc); return; }
          const d = faceapi.euclideanDistance(desc, ref.descriptor);
          best = best == null ? d : Math.min(best, d);
          if (d < w.faceThreshold) { hits++; camMsg('ใบหน้าตรงกัน ✓'); if (hits >= 2) finish(desc); }
          else { hits = 0; lastDesc = desc; camMsg('ใบหน้าไม่ตรงกับที่ลงทะเบียนไว้'); }
          if (Date.now() - started > 15000) {
            clearInterval(timer);
            info(`${U.icon('alert')}<span>ยืนยันใบหน้าไม่สำเร็จ (ความต่าง ${best?.toFixed(2)}) ลองใหม่ในที่แสงสว่าง หรือส่งภาพให้แอดมินตรวจ</span>`, 'warn');
            U.$('#scanActions', modalEl).innerHTML = `<button class="btn btn-ghost" id="again">ลองใหม่</button><button class="btn" id="manual">ส่งให้แอดมินตรวจ</button>`;
            U.$('#again', modalEl).onclick = () => { close(); scanFlow(task, mode, done); };
            U.$('#manual', modalEl).onclick = () => finish(lastDesc, true);
          }
        } finally { busy = false; }
      }, 350);

      /* ส่ง descriptor + พิกัด + ภาพ ให้ CORE ตัดสิน (เวลา ระยะห่าง และผลเทียบใบหน้าคำนวณซ้ำที่ server) */
      function finish(descriptor, manual) {
        clearInterval(timer);
        const c = document.createElement('canvas');
        const vw = vid.videoWidth || 640, vh = vid.videoHeight || 480, sc = 320 / vw;
        c.width = 320; c.height = Math.round(vh * sc);
        const ctx = c.getContext('2d'); ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(vid, 0, 0, c.width, c.height);
        const photo = c.toDataURL('image/jpeg', 0.6);
        stop(); // ปิดกล้องทันที
        U.$('#cam', modalEl).classList.remove('on');
        U.$('#cam', modalEl).innerHTML = `<img src="${photo}" alt="ภาพขณะลงเวลา">`;
        step('stSave', 'cur');
        try {
          const scan = { lat: gps.lat, lng: gps.lng, acc: gps.acc, descriptor: descriptor ? Array.from(descriptor) : null, manual: !!manual, photo };
          const rec = mode === 'in' ? S.checkIn(task.ref, scan) : S.checkOut(task.ref, scan);
          const res = mode === 'in' ? rec.in : rec.out, face = res.face;
          step('stFace', face.matched === true ? 'on' : 'warn');
          step('stSave', 'on');
          const late = mode === 'in' ? S.lateMinutes(rec) : 0;
          info(`${U.icon('checkc')}<span><b>${mode === 'in' ? 'ลงเวลาเข้างาน' : 'ลงเวลาออกงาน'} ${T.timeOf(res.ts)} น. สำเร็จ</b>${face.enrolled ? ' · ลงทะเบียนใบหน้าแล้ว' : ''}${late ? ` · มาสาย ${late} นาที` : ''}${mode === 'out' ? ` · รวม ${dur(recMinutes(rec))} ชม.` : ''}${!res.inside ? ' · บันทึกว่านอกพื้นที่' : ''}${face.matched !== true ? ' · รอแอดมินตรวจภาพ' : ''}<br><span class="muted">ปิดกล้องและหยุดใช้ตำแหน่งแล้ว</span></span>`, late || !res.inside || face.matched !== true ? 'warn' : 'good');
          U.$('#scanActions', modalEl).innerHTML = `<button class="btn btn-block" data-close>เสร็จสิ้น</button>`;
          done && done();
        } catch (e) { step('stSave', 'bad'); info(`${U.icon('alert')}<span>${e.message}</span>`, 'warn'); }
      }
    };
    function retryBtn() {
      stop();
      U.$('#scanActions', modalEl).innerHTML = `<button class="btn btn-block" id="startAgain">ลองอีกครั้ง</button>`;
      U.$('#startAgain', modalEl).onclick = () => { close(); scanFlow(task, mode, done); };
    }
  }

  /* =========================================================
     หน้า "งานของฉัน" (นิสิตช่วยงาน)
     ========================================================= */
  const WORK_TABS = [['', 'วันนี้', 'clock'], ['roster', 'ตารางเวร', 'calendar'], ['jobs', 'งานเพิ่มเติม', 'megaphone'], ['history', 'ประวัติลงเวลา', 'file'], ['notifications', 'แจ้งเตือน', 'bell'], ['exit', 'แจ้งสิ้นสุดการทำงาน', 'logout']];

  function viewWork(seg) {
    const u = S.currentUser();
    if (!u) { location.hash = '#/login'; return; }
    if (u.role === 'admin') { location.hash = '#/admin/roster'; return; }
    const app = S.appOfUser(u.id);
    if (!S.isStaff(u)) {
      if (app?.status === 'resigned' || S.myCerts(u.id).length) { location.hash = '#/certificate'; return; }
      U.app.innerHTML = `<section class="section"><div class="container"><div class="card empty">${U.icon('lock')}<h3>สำหรับนิสิตช่วยงานเท่านั้น</h3><p>หน้านี้เปิดให้หลังจากผ่านการคัดเลือก</p><a class="btn" href="#/portal">ไปที่ใบสมัคร</a></div></div></section>`;
      return;
    }
    const tab = WORK_TABS.some(t => t[0] === seg[0]) ? seg[0] : '';
    const pos = S.posOfUser(u.id);
    const nUnread = S.unreadNotifications(u.id);
    const openJobs = S.jobs().filter(j => j.status === 'open' && j.date >= T.dateKey() && !j.takers.some(t => t.userId === u.id)).length;
    U.app.innerHTML = `
      <section class="section" style="padding-top:28px">
        <div class="container">
          <div class="portal-head mb-2">
            <div><div class="eyebrow">${U.chev()} Staff</div><h2 class="mb-0 flex" style="gap:12px"><a href="#/profile" title="แก้ไขโปรไฟล์">${U.avatar(u.id, 44)}</a>งานของฉัน</h2><span class="muted small">${U.esc(fullName(u.id))} · นิสิตช่วยงาน ฝ่าย${posTh(pos)}</span></div>
            <div class="flex"><a class="btn btn-ghost btn-sm" href="#/manual">${U.icon('file')} คู่มือ</a><a class="btn btn-soft btn-sm" href="#/chat/staff">${U.icon('chat')} ห้องนิสิตช่วยงาน</a></div>
          </div>
          <nav class="tabs" role="tablist">${WORK_TABS.map(([k, t, ic]) => `<a role="tab" href="#/work${k ? '/' + k : ''}" class="${tab === k ? 'active' : ''}">${U.icon(ic)}<span>${t}</span>${k === 'notifications' && nUnread ? `<span class="dot-count static">${nUnread}</span>` : ''}${k === 'jobs' && openJobs ? `<span class="dot-count static">${openJobs}</span>` : ''}</a>`).join('')}</nav>
          <div id="workBody" class="mt-2"></div>
        </div>
      </section>`;
    const body = U.$('#workBody');
    ({ '': workToday, roster: workRoster, jobs: workJobs, history: workHistory, notifications: workNotifs, exit: workExit })[tab](body, u, seg.slice(1));
  }

  function workToday(body, u) {
    const today = T.dateKey();
    const tasks = S.todayTasks(u.id);
    const face = S.faceRef(u.id);
    const ym = today.slice(0, 7);
    const monthRecs = S.attendance().filter(r => r.userId === u.id && r.date.startsWith(ym));
    const myMonth = S.myShifts(u.id, ym);
    const next = S.myShifts(u.id).find(s => s.date > today);
    body.innerHTML = `
      <div class="grid grid-2">
        <div class="grid">
          <div class="card card-shadow">
            <div class="flex between"><h3 class="mb-0">${T.thDate(today)}</h3><span class="badge tone-info">${U.icon('clock')}${T.timeOf(Date.now())} น.</span></div>
            ${tasks.length ? tasks.map((t, i) => {
              const r = t.record;
              return `<div class="task ${r?.out ? 'done' : r ? 'working' : ''}">
                <div class="task-head"><span class="pos-ico">${U.icon(t.kind === 'job' ? 'megaphone' : 'home')}</span>
                  <div><b>${U.esc(t.title)}</b><small class="muted">${t.kind === 'job' ? 'งานเพิ่มเติม · ' + U.esc(t.location) : 'เวรประจำวัน'} · ${t.start}–${t.end} น.</small></div></div>
                <div class="task-times">
                  <div><small>เข้างาน</small><b>${r ? T.timeOf(r.in.ts) : '--:--'}</b>${lateBadge(r)}</div>
                  <div><small>ออกงาน</small><b>${r?.out ? T.timeOf(r.out.ts) : '--:--'}</b></div>
                  <div><small>รวม</small><b>${r?.out ? dur(recMinutes(r)) : '-'}</b></div>
                </div>
                ${r?.out ? `<div class="notice tone-good small">${U.icon('checkc')}ลงเวลาครบแล้ว ขอบคุณที่ตั้งใจทำงานวันนี้</div>`
                  : `<button class="btn btn-block" data-scan="${i}" data-mode="${r ? 'out' : 'in'}">${U.icon('eye')} ${r ? 'สแกนหน้าออกงาน' : 'สแกนหน้าเข้างาน'}</button>`}
              </div>`; }).join('')
            : `<div class="empty">${U.icon('calendar')}<p>วันนี้ไม่มีเวร${next ? `<br><span class="small">เวรถัดไป: ${thShort(next.date)} · ${T.locName(next.location)}</span>` : ''}</p></div>`}
            <p class="small muted mb-0 mt-1">${U.icon('shield')} กล้องและ GPS จะถูกเปิดเฉพาะตอนกดสแกนลงเวลาเท่านั้น</p>
          </div>
          <div class="card status-card">
            <span class="big-ico ${face ? 'tone-good' : 'tone-neutral'}">${face ? `<img ${U.fsrc(face.photo)} alt="" class="face-thumb">` : U.icon('user')}</span>
            <div><span class="muted small">ใบหน้าสำหรับลงเวลา</span><h3 class="mb-0">${face ? 'ลงทะเบียนแล้ว' : 'ยังไม่ได้ลงทะเบียน'}</h3>
            <p class="small muted mb-0">${face ? `ลงทะเบียนเมื่อ ${U.fmtDateTime(face.ts)} หากเปลี่ยนลุคมากจนสแกนไม่ผ่าน แจ้งพี่แอดมินเพื่อรีเซ็ตได้` : 'ระบบจะบันทึกใบหน้าของคุณอัตโนมัติในการสแกนเข้างานครั้งแรก'}</p></div>
          </div>
        </div>
        <div class="grid">
          <div class="kpis" style="margin:0">
            <div class="kpi"><div class="label">${U.icon('calendar')}เวรเดือนนี้</div><div class="value">${myMonth.length}</div><div class="delta">มาทำงานแล้ว ${new Set(monthRecs.map(r => r.date)).size} วัน</div></div>
            <div class="kpi"><div class="label">${U.icon('clock')}ชั่วโมงเดือนนี้</div><div class="value">${dur(monthRecs.reduce((m, r) => m + recMinutes(r), 0))}</div><div class="delta">ชั่วโมง:นาที</div></div>
            <div class="kpi"><div class="label">${U.icon('alert')}มาสายเดือนนี้</div><div class="value">${monthRecs.filter(r => S.lateMinutes(r)).length}</div><div class="delta">${RULES.lateFine.split('·')[0]}</div></div>
          </div>
          <div class="card">
            <div class="flex between mb-2"><h3 class="mb-0">เวรที่จะถึง</h3><a href="#/work/roster" class="small">ดูตารางทั้งเดือน</a></div>
            ${S.myShifts(u.id).filter(s => s.date >= today).slice(0, 5).map(s => `<div class="shift-row"><span class="date-chip"><b>${+s.date.slice(8)}</b><small>${T.thDate(s.date, { month: 'short' })}</small></span><span><b>${T.locName(s.location)}</b><small class="muted">${T.thDate(s.date, { weekday: 'long' })} · ${S.work.shiftStart}–${S.work.shiftEnd} น.</small></span>${U.locIcon(s.location)}</div>`).join('') || '<p class="muted">ยังไม่มีเวรที่ยืนยันแล้ว</p>'}
          </div>
        </div>
      </div>`;
    U.$$('[data-scan]', body).forEach(b => b.onclick = () => scanFlow(tasks[+b.dataset.scan], b.dataset.mode, () => { if (location.hash.startsWith('#/work')) viewWork(['']); }));
  }

  function calendar(ym, cell, clickable) {
    const dates = T.monthDates(ym);
    const lead = T.weekday(dates[0]);
    const today = T.dateKey();
    return `<div class="cal">
      ${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => `<div class="cal-h">${d}</div>`).join('')}
      ${'<div class="cal-d empty"></div>'.repeat(lead)}
      ${dates.map(d => `<div class="cal-d ${d === today ? 'today' : ''} ${S.work.workDays.includes(T.weekday(d)) ? '' : 'off'} ${clickable ? 'click' : ''}"${clickable ? ` data-date="${d}" role="button" tabindex="0" aria-label="${T.thDate(d)}"` : ''}><span class="n">${+d.slice(8)}</span>${cell(d)}</div>`).join('')}
    </div>`;
  }

  function workRoster(body, u, seg) {
    const ym = /^\d{4}-\d{2}$/.test(seg[0]) ? seg[0] : T.dateKey().slice(0, 7);
    const r = S.roster(ym);
    const pos = S.posOfUser(u.id);
    // ดูตารางของฝ่ายอื่นได้ (อ่านอย่างเดียว) — แลกเวรได้เฉพาะฝ่ายตัวเอง
    const vpos = POSITIONS.some(p => p.id === sessionStorage.getItem('roster-view')) ? sessionStorage.getItem('roster-view') : pos;
    const own = vpos === pos;
    const showAll = !own || sessionStorage.getItem('roster-all') === '1';
    const confirmed = r && r.status === 'confirmed';
    const mine = confirmed ? r.shifts.filter(s => s.userId === u.id) : [];
    const swapped = S.swappedShiftIds();
    const lbl = (d, loc) => `${T.thDate(d, { weekday: 'short', day: 'numeric', month: 'short' })} · ${LOC_SHORT(loc)}`;
    const swaps = S.swaps().filter(x => x.position === pos);
    const open = swaps.filter(x => S.swapState(x) === 'open');
    const history = S.swapHistory(ym);
    const upcoming = S.myUpcomingShifts(u.id).filter(s => s.ym === ym);
    const myLocs = Object.keys(S.work.staffing[pos] || {});
    const viewLocs = Object.keys(S.work.staffing[vpos] || {});
    body.innerHTML = `
      <div class="card">
        <div class="flex between mb-2">${MONTH_NAV(ym, '#/work/roster')}
          ${confirmed && own ? `<label class="switch"><input type="checkbox" id="allToggle" ${showAll ? 'checked' : ''}><span></span>ดูทั้งฝ่าย</label>` : ''}</div>
        ${confirmed ? `<nav class="tabs mb-2">${POSITIONS.map(p => `<a href="#" data-vpos="${p.id}" class="${p.id === vpos ? 'active' : ''}">${U.icon(p.icon)}<span>${p.th}${p.id === pos ? ' (ฝ่ายของฉัน)' : ''}</span></a>`).join('')}</nav>
          ${own ? '' : `<div class="notice tone-info small mb-2">${U.icon('eye')}<span>ดูตารางฝ่าย${posTh(vpos)} (อ่านอย่างเดียว) — แลกเวรได้เฉพาะกับเพื่อนในฝ่าย${posTh(pos)}</span></div>`}` : ''}
        ${!r ? `<div class="empty">${U.icon('calendar')}<p>ยังไม่มีตารางเวรเดือนนี้</p></div>`
        : !confirmed ? `<div class="empty">${U.icon('clock')}<h3>ตารางเวรกำลังจัดทำ</h3><p>พี่แอดมินกำลังตรวจตารางเวร${T.thMonth(ym)} จะแจ้งเตือนผ่านระบบและอีเมลเมื่อยืนยันแล้ว</p></div>`
        : `${calendar(ym, d => {
              const list = r.shifts.filter(s => s.date === d && s.userId && (showAll ? s.position === vpos : s.userId === u.id));
              return list.map(s => `<span class="cal-chip ${s.userId === u.id ? 'me' : ''} ${showAll ? '' : 'loc-only'}" title="${U.esc(S.chatName(s.userId))} · ${T.locName(s.location)}${swapped.has(s.id) ? ' · แลกเวรแล้ว' : ''}">${U.locIcon(s.location)}${showAll ? U.avatar(s.userId, 16, 'av-xs') : ''}<span class="nm">${swapped.has(s.id) ? '⇄ ' : ''}${showAll ? U.esc(S.chatName(s.userId)) : LOC_SHORT(s.location)}</span></span>`).join('');
            })}
            <div class="legend mt-2">${viewLocs.map(l => `<span>${U.locIcon(l)}${T.locName(l)}</span>`).join('')}<span>⇄ = แลกเวรแล้ว</span></div>
            <p class="small muted mt-1 mb-0">ยืนยันเมื่อ ${U.fmtDateTime(r.confirmedAt)} · เดือนนี้คุณมีเวร <b>${mine.length}</b> วัน${myLocs.length > 1 ? ` (${myLocs.map(l => `${LOC_SHORT(l)} ${mine.filter(s => s.location === l).length}`).join(' · ')})` : ''}</p>`}
      </div>
      ${confirmed && own ? `
      <div class="grid grid-2 mt-2">
        <div class="card">
          <h3 class="flex">${U.icon('send')} ประกาศขอแลกเวร <small class="muted">ฝ่าย${posTh(pos)}</small></h3>
          ${open.length ? open.map(x => {
            const minex = x.userId === u.id, myOffer = x.offers.find(o => o.userId === u.id);
            return `<div class="swap ${minex ? 'mine' : ''}" id="swap-${x.id}">
              <div class="flex between"><span class="who-cell">${U.avatar(x.userId, 24)}<span><b>${U.esc(minex ? 'ประกาศของคุณ' : S.chatName(x.userId))}</b> ขอแลก <b>${lbl(x.date, x.location)}</b></span></span><small class="muted">${U.fmtDateTime(x.createdAt)}</small></div>
              ${x.note ? `<p class="small mb-0">“${U.esc(x.note)}”</p>` : ''}
              ${minex ? `${x.offers.length ? x.offers.map(o => `<div class="offer"><span><b>${U.esc(S.chatName(o.userId))}</b> ${o.shiftId ? `แลกกับเวรของเขา <b>${(() => { const sh = S.myUpcomingShifts(o.userId).find(v => v.id === o.shiftId); return sh ? lbl(sh.date, sh.location) : '(เวรเปลี่ยนแล้ว)'; })()}</b>` : 'รับเวรแทน (ไม่แลกคืน)'}</span>
                  <span class="flex" style="flex-wrap:nowrap"><button class="btn btn-sm" data-accept="${x.id}" data-user="${o.userId}">${U.icon('check')} ยืนยันแลก</button><button class="btn btn-ghost btn-sm" data-decline="${x.id}" data-user="${o.userId}">ปฏิเสธ</button></span></div>`).join('')
                  : '<p class="small muted mb-0">ยังไม่มีคนเสนอรับแลก — ระบบแจ้งเพื่อนในฝ่ายและห้องแชทแล้ว</p>'}
                <button class="btn btn-ghost btn-sm mt-1" data-cancel="${x.id}">ยกเลิกประกาศ</button>`
              : myOffer ? `<div class="flex between mt-1"><span class="badge tone-info">${U.icon('clock')}รอ ${U.esc(S.chatName(x.userId))} ยืนยัน</span><button class="btn btn-ghost btn-sm" data-withdraw="${x.id}">ถอนข้อเสนอ</button></div>`
              : `<button class="btn btn-soft btn-sm mt-1" data-offer="${x.id}">${U.icon('users')} รับแลกเวรนี้</button>`}
            </div>`; }).join('') : `<p class="muted small">ยังไม่มีประกาศขอแลกเวรในฝ่ายนี้</p>`}
        </div>
        <div class="card">
          <h3 class="flex">${U.icon('calendar')} เวรของฉันที่จะถึง</h3>
          ${upcoming.length ? upcoming.map(s => { const req = open.find(x => x.shiftId === s.id);
            return `<div class="shift-row"><span class="date-chip"><b>${+s.date.slice(8)}</b><small>${T.thDate(s.date, { month: 'short' })}</small></span><span><b>${T.locName(s.location)}</b><small class="muted">${T.thDate(s.date, { weekday: 'long' })}</small></span>
              ${req ? `<span class="badge tone-warn">ประกาศแลกแล้ว</span>` : `<button class="btn btn-ghost btn-sm" data-request="${s.id}">⇄ ขอแลก</button>`}</div>`; }).join('') : '<p class="muted small">ไม่มีเวรที่จะถึงในเดือนนี้</p>'}
          <p class="small muted mt-1 mb-0">แลกได้เฉพาะกับเพื่อนในฝ่ายเดียวกัน และก่อนเวลาเริ่มงาน · เมื่อทั้งสองฝ่ายยืนยัน ตารางจะอัปเดตทันที</p>
        </div>
      </div>
      <div class="card mt-2">
        <h3 class="flex">${U.icon('file')} ประวัติการแลกเวร ${T.thMonth(ym)}</h3>
        ${history.length ? `<div class="swap-hist">${history.map(x => `<div class="sh-row">
          <span class="sh-ico">⇄</span>
          <span><b>${U.esc(S.chatName(x.userId))}</b> ${x.giveDate ? '⇄' : '→'} <b>${U.esc(S.chatName(x.acceptedUserId))}</b><br>
            <small>${U.esc(S.chatName(x.acceptedUserId))} ทำแทน ${lbl(x.date, x.location)}${x.giveDate ? ` · ${U.esc(S.chatName(x.userId))} ทำแทน ${lbl(x.giveDate, x.giveLocation)}` : ' (รับแทนไม่แลกคืน)'}</small></span>
          <small class="muted">${U.fmtDateTime(x.closedAt)}</small></div>`).join('')}</div>` : '<p class="muted small mb-0">ยังไม่มีการแลกเวรในเดือนนี้</p>'}
      </div>` : ''}`;
    const rerender = () => workRoster(body, u, seg);
    const run = (fn, msg) => { try { fn(); U.toast(msg); rerender(); } catch (e) { U.toast(e.message, true); } };
    U.$$('[data-vpos]', body).forEach(a => a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('roster-view', a.dataset.vpos); rerender(); });
    U.$('#allToggle') && (U.$('#allToggle').onchange = (e) => { sessionStorage.setItem('roster-all', e.target.checked ? '1' : '0'); rerender(); });
    body.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.request) swapRequestDialog(d.request, rerender);
      if (d.offer) swapOfferDialog(S.swaps().find(x => x.id === d.offer), u, rerender);
      if (d.cancel && confirm('ยกเลิกประกาศขอแลกเวรนี้?')) run(() => S.cancelSwap(d.cancel), 'ยกเลิกประกาศแล้ว');
      if (d.withdraw) run(() => S.withdrawOffer(d.withdraw), 'ถอนข้อเสนอแล้ว');
      if (d.decline) run(() => S.declineOffer(d.decline, d.user), 'ปฏิเสธข้อเสนอแล้ว');
      if (d.accept && confirm(`ยืนยันแลกเวรกับ ${S.chatName(d.user)}? ตารางเวรจะเปลี่ยนทันที`)) run(() => S.acceptSwap(d.accept, d.user), 'แลกเวรสำเร็จ — ตารางอัปเดตแล้ว');
    };
    const focus = seg[1] && document.getElementById('swap-' + seg[1]);   // เปิดจากการ์ดในแชท
    if (focus) { focus.classList.add('flash-card'); setTimeout(() => focus.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }
  }

  function swapRequestDialog(shiftId, done) {
    const s = S.myUpcomingShifts(S.currentUser().id).find(x => x.id === shiftId);
    const m = U.modal(`<div class="flex between mb-1"><h3 class="mb-0">ประกาศขอแลกเวร</h3><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="ปิด">${U.icon('x')}</button></div>
      <p class="mb-2"><b>${T.thDate(s.date)}</b> · ${T.locName(s.location)} · ${S.work.shiftStart}–${S.work.shiftEnd} น.</p>
      <div class="field"><label for="swNote">ข้อความถึงเพื่อน <span class="muted small">(ไม่บังคับ)</span></label><textarea class="input" id="swNote" maxlength="200" placeholder="เช่น ติดสอบย่อยวันนั้น ใครว่างช่วยแลกหน่อยน้า"></textarea></div>
      <p class="small muted">เพื่อนในฝ่าย${posTh(s.position)}จะได้รับแจ้งเตือน และประกาศจะขึ้นในห้องแชทนิสิตช่วยงาน</p>
      <button class="btn btn-block" id="swGo">${U.icon('send')} ประกาศขอแลกเวร</button>`);
    U.$('#swGo', m).onclick = () => { try { S.requestSwap(shiftId, U.$('#swNote', m).value); m.remove(); U.toast('ประกาศขอแลกเวรแล้ว'); done(); } catch (e) { U.toast(e.message, true); } };
  }

  function swapOfferDialog(x, u, done) {
    const lbl = (d, loc) => `${T.thDate(d, { weekday: 'short', day: 'numeric', month: 'short' })} · ${LOC_SHORT(loc)}`;
    const mineShifts = S.myUpcomingShifts(u.id).filter(s => s.position === x.position);
    const m = U.modal(`<div class="flex between mb-1"><h3 class="mb-0">รับแลกเวร</h3><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="ปิด">${U.icon('x')}</button></div>
      <p>คุณจะทำงานแทน <b>${U.esc(S.chatName(x.userId))}</b> ใน <b>${T.thDate(x.date)}</b> · ${T.locName(x.location)}</p>
      <div class="field"><span class="label">แลกคืนด้วยเวรของคุณ</span><div class="checks" style="grid-template-columns:1fr">
        ${mineShifts.map((s, i) => `<label><input type="radio" name="give" value="${s.id}" ${i ? '' : 'checked'}> ${lbl(s.date, s.location)}</label>`).join('')}
        <label><input type="radio" name="give" value="" ${mineShifts.length ? '' : 'checked'}> รับแทนโดยไม่แลกคืน</label></div></div>
      <p class="small muted">${U.esc(S.chatName(x.userId))} ต้องกดยืนยันก่อน ตารางจึงจะเปลี่ยน</p>
      <button class="btn btn-block" id="ofGo">${U.icon('check')} ส่งข้อเสนอแลกเวร</button>`);
    U.$('#ofGo', m).onclick = () => { try { S.offerSwap(x.id, U.$('input[name=give]:checked', m).value || null); m.remove(); U.toast('ส่งข้อเสนอแล้ว รอเพื่อนยืนยัน'); done(); } catch (e) { U.toast(e.message, true); } };
  }

  function jobCard(j, u, admin) {
    const mine = j.takers.some(t => t.userId === u.id);
    const past = j.date < T.dateKey();
    const st = j.status === 'closed' ? ['ปิดรับ', 'neutral'] : past ? ['ผ่านไปแล้ว', 'neutral'] : j.status === 'full' ? ['ครบแล้ว', 'warn'] : ['เปิดรับ', 'good'];
    return `<div class="card job ${mine ? 'mine' : ''}" id="job-${j.id}">
      <div class="flex between"><span class="badge tone-${st[1]}">${st[0]}</span><small class="muted">ประกาศ ${U.fmtDateTime(j.createdAt)}</small></div>
      <h3 class="mt-1">${U.esc(j.title)}</h3>
      <p class="muted small">${U.esc(j.detail)}</p>
      <div class="job-meta"><span>${U.icon('calendar')}${T.thDate(j.date)}</span><span>${U.icon('clock')}${j.start}–${j.end} น.</span><span>${U.icon('home')}${U.esc(j.location)}</span></div>
      <div class="slots"><div class="bar"><i style="width:${Math.min(100, j.takers.length / j.slots * 100)}%"></i></div><small>${j.takers.length}/${j.slots} คน</small></div>
      ${j.takers.length ? `<div class="takers">${j.takers.map(t => `<span class="chip">${U.esc(admin ? fullName(t.userId) : S.chatName(t.userId))}${admin ? ` <small class="muted">${U.fmtDateTime(t.ts)}</small>` : ''}</span>`).join('')}</div>` : ''}
      ${admin ? `<div class="flex mt-2"><button class="btn btn-ghost btn-sm" data-close-job="${j.id}">${j.status === 'closed' ? 'เปิดรับอีกครั้ง' : 'ปิดรับ'}</button><button class="btn btn-ghost btn-sm" data-del-job="${j.id}">${U.icon('trash')} ลบ</button></div>`
        : past ? '' : mine ? `<div class="flex between mt-2"><span class="badge tone-good">${U.icon('check')}คุณรับงานนี้แล้ว</span><button class="btn btn-ghost btn-sm" data-leave="${j.id}">ยกเลิก</button></div>`
        : j.status === 'open' ? `<button class="btn btn-block mt-2" data-take="${j.id}">${U.icon('check')} รับงานนี้</button>` : ''}
    </div>`;
  }

  function workJobs(body, u, seg = []) {
    const jobs = S.jobs().filter(j => j.date >= T.dateKey() || j.takers.some(t => t.userId === u.id));
    body.innerHTML = `<p class="muted">งานพิเศษที่พี่ ๆ เปิดรับเพิ่ม (เช่น แทนเจ้าหน้าที่ที่ติดประชุม) กดรับได้ทันที รับตามลำดับก่อน–หลัง</p>
      <div class="grid grid-2">${jobs.map(j => jobCard(j, u)).join('') || `<div class="card empty">${U.icon('megaphone')}<p>ยังไม่มีงานเพิ่มเติมในขณะนี้</p></div>`}</div>`;
    const focus = seg[0] && document.getElementById('job-' + seg[0]);   // เปิดจากการ์ดในแชท → เลื่อนไปที่งานนั้น
    if (focus) { focus.classList.add('flash-card'); setTimeout(() => focus.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }
    body.onclick = (e) => {
      const t = e.target.closest('[data-take]'), l = e.target.closest('[data-leave]');
      try {
        if (t) { const clash = S.takeJob(t.dataset.take); U.toast(clash ? 'รับงานแล้ว — วันนั้นคุณมีเวรประจำด้วย ตรวจเวลาให้ดีนะ' : 'รับงานเรียบร้อย ระบบส่งอีเมลยืนยันให้แล้ว'); viewWork(['jobs']); }
        if (l && confirm('ยกเลิกการรับงานนี้?')) { S.leaveJob(l.dataset.leave); U.toast('ยกเลิกแล้ว'); viewWork(['jobs']); }
      } catch (err) { U.toast(err.message, true); viewWork(['jobs']); }
    };
  }

  function workHistory(body, u) {
    const recs = S.attendance().filter(r => r.userId === u.id).sort((a, b) => b.in.ts - a.in.ts);
    body.innerHTML = `<div class="table-wrap"><table class="table">
      <thead><tr><th>วันที่</th><th>งาน / สถานที่</th><th>เข้างาน</th><th>ออกงาน</th><th>รวม</th><th>สถานะ</th></tr></thead>
      <tbody>${recs.map(r => `<tr><td>${thShort(r.date)}</td><td>${U.esc(r.kind === 'job' ? r.title : T.locName(r.location))}<span class="sub">${posTh(r.kind === 'job' ? 'job' : r.position)}</span></td>
        <td>${T.timeOf(r.in.ts)}</td><td>${r.out ? T.timeOf(r.out.ts) : '-'}</td><td>${r.out ? dur(recMinutes(r)) : '-'}</td><td>${lateBadge(r)} ${r.in.inside === false ? '<span class="badge tone-warn">นอกพื้นที่</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">ยังไม่มีประวัติ</td></tr>'}</tbody></table></div>`;
  }

  function notifList(list) {
    const ico = { shift: 'calendar', job: 'megaphone', roster: 'calendar', cert: 'award', exit: 'logout' };
    return list.map(n => `<a class="notif ${n.read ? '' : 'unread'}" href="${n.link || '#'}"><span class="pos-ico">${U.icon(ico[n.kind] || 'bell')}</span><span><b>${U.esc(n.title)}</b><small>${U.esc(n.body).replace(/\n/g, '<br>')}</small><small class="muted">${U.fmtDateTime(n.ts)}</small></span></a>`).join('')
      || `<div class="empty">${U.icon('bell')}<p>ยังไม่มีการแจ้งเตือน</p></div>`;
  }
  function workNotifs(body, u) {
    body.innerHTML = `<div class="card">${notifList(S.notifications(u.id))}</div>`;
    S.readNotifications(u.id);
    U.renderChrome('/work');
  }

  function workExit(body, u) {
    const e = S.myExit(u.id);
    const today = T.dateKey();
    body.innerHTML = `<div class="grid grid-2">
      <div class="card">
        <h3>แจ้งสิ้นสุดการทำงาน</h3>
        ${e && e.status === 'pending' ? `<div class="notice tone-info">${U.icon('clock')}<span>ส่งคำขอเมื่อ ${U.fmtDateTime(e.ts)} · วันสุดท้าย ${thLong(e.lastDay)}<br>รอพี่แอดมินอนุมัติ เมื่ออนุมัติแล้วระบบจะส่งใบประกาศนียบัตรให้ทางระบบและอีเมล</span></div><button class="btn btn-ghost mt-2" id="cancelExit">ยกเลิกคำขอ</button>`
        : `${e && e.status === 'rejected' ? `<div class="notice tone-warn mb-2">${U.icon('alert')}<span>คำขอก่อนหน้าไม่ได้รับอนุมัติ: ${U.esc(e.note || '-')}</span></div>` : ''}
          <p class="muted small">เมื่อพี่แอดมินอนุมัติ ระบบจะลบเวรหลังวันสุดท้ายของคุณออกจากตาราง และออก <b>ใบประกาศนียบัตร</b> พร้อมลายเซ็นผู้อำนวยการศูนย์กีฬาสิรินธร ส่งให้ในระบบและทางอีเมล</p>
          <form id="exitForm">
            <div class="field"><label for="lastDay">วันสุดท้ายที่ปฏิบัติงาน <span class="req">*</span></label><input class="input" type="date" id="lastDay" name="lastDay" value="${today}" required></div>
            <div class="field"><label for="reason">เหตุผล <span class="req">*</span></label><textarea class="input" id="reason" name="reason" required placeholder="เช่น ฝึกงาน / ตารางเรียนไม่ว่าง / สำเร็จการศึกษา"></textarea></div>
            <div class="checks mb-2" style="grid-template-columns:1fr"><label><input type="checkbox" name="ok" required> ฉันได้แจ้งพี่ ๆ และส่งต่องานที่รับผิดชอบเรียบร้อยแล้ว</label></div>
            <button class="btn">${U.icon('send')} ส่งคำขอแจ้งสิ้นสุดการทำงาน</button>
          </form>`}
      </div>
      <div class="card"><h3>สรุปการปฏิบัติงานของคุณ</h3>${workSummary(u.id)}</div>
    </div>`;
    U.$('#cancelExit') && (U.$('#cancelExit').onclick = () => { S.cancelExit(e.id); U.toast('ยกเลิกคำขอแล้ว'); viewWork(['exit']); });
    const f = U.$('#exitForm');
    f && (f.onsubmit = (ev) => {
      ev.preventDefault();
      if (!confirm('ยืนยันแจ้งสิ้นสุดการทำงาน?')) return;
      try { const r = S.requestExit({ lastDay: f.lastDay.value, reason: f.reason.value.trim() }); U.toast(r.status === 'approved' ? 'อนุมัติอัตโนมัติ — ได้รับใบประกาศแล้ว' : 'ส่งคำขอแล้ว รอแอดมินอนุมัติ'); r.status === 'approved' ? (location.hash = '#/certificate/' + r.certId) : viewWork(['exit']); }
      catch (err) { U.toast(err.message, true); }
    });
  }
  function workSummary(userId) {
    const recs = S.attendance().filter(r => r.userId === userId && r.in);
    const mins = recs.reduce((m, r) => m + recMinutes(r), 0);
    const dates = recs.map(r => r.date).sort();
    return `<table class="review-table"><tr><th>เริ่มปฏิบัติงาน</th><td>${dates[0] ? thLong(dates[0]) : '-'}</td></tr><tr><th>จำนวนวันที่มาทำงาน</th><td>${new Set(dates).size} วัน</td></tr><tr><th>รวมชั่วโมง</th><td>${Math.round(mins / 60)} ชั่วโมง</td></tr><tr><th>มาสาย</th><td>${recs.filter(r => S.lateMinutes(r)).length} ครั้ง</td></tr></table>`;
  }

  /* =========================================================
     ใบประกาศนียบัตร
     ========================================================= */
  function certHtml(c, sample) {
    const p = POSITIONS.find(x => x.id === c.position);
    return `<div class="cert ${sample ? 'sample' : ''}">
      <div class="cert-in">
        <div class="cert-top"><img class="cert-seal" src="assets/images/swu-logo.jpg" alt=""><img class="cert-ssc" src="assets/images/ssc-logo.png" alt=""><span class="cert-org"><b>ศูนย์กีฬาสิรินธร</b><small>คณะพลศึกษา มหาวิทยาลัยศรีนครินทรวิโรฒ</small></span><span class="cert-no">เลขที่ ${U.esc(c.no)}</span></div>
        <div class="cert-title">ประกาศนียบัตร</div>
        <div class="cert-sub">${U.chev()} ให้ไว้เพื่อแสดงว่า ${U.chev(true)}</div>
        <div class="cert-name">${U.esc(c.name)}</div>
        <div class="cert-body">ได้ปฏิบัติหน้าที่ <b>นิสิตช่วยงาน ฝ่าย${p?.th || ''} (${p?.en || ''})</b> ศูนย์กีฬาสิรินธร<br>
          ตั้งแต่วันที่ ${thLong(c.from)} ถึงวันที่ ${thLong(c.to)} รวม ${c.hours.toLocaleString()} ชั่วโมง<br>ด้วยความรับผิดชอบ มีจิตบริการ และเป็นแบบอย่างที่ดี ขอให้มีความสุข ความเจริญ สืบไป</div>
        <div class="cert-date">ให้ไว้ ณ วันที่ ${thLong(T.dateKey(c.issuedAt))}</div>
        <div class="cert-sign">
          ${c.signer.signature ? `<img ${U.fsrc(c.signer.signature)} alt="ลายเซ็น">` : '<div class="sig-ph">ลายเซ็นผู้อำนวยการ</div>'}
          <div class="sig-line"></div>
          <b>(${U.esc(c.signer.name || '..............................................')})</b>
          <span>${U.esc(c.signer.title)}</span>
        </div>
        <div class="cert-verify">ตรวจสอบใบประกาศ: เมนู "ตรวจสอบใบประกาศ" เลขที่ ${U.esc(c.no)}</div>
      </div>
    </div>`;
  }

  function viewCertificate(seg) {
    const u = S.currentUser();
    if (!u) { location.hash = '#/login'; return; }
    const list = u.role === 'admin' ? S.certs() : S.myCerts(u.id);
    const c = seg[0] ? S.cert(seg[0]) : list[0];
    if (c && u.role !== 'admin' && c.userId !== u.id) { location.hash = '#/verify/' + encodeURIComponent(c.no); return; }
    U.app.innerHTML = `<section class="section" style="padding-top:28px"><div class="container">
      <div class="portal-head mb-2 no-print"><div><div class="eyebrow">${U.chev()} Certificate</div><h2 class="mb-0">${u.role === 'admin' ? 'ใบประกาศนียบัตร' : 'ใบประกาศของฉัน'}</h2></div>
        ${c ? `<button class="btn" id="printCert">${U.icon('download')} พิมพ์ / บันทึกเป็น PDF</button>` : ''}</div>
      ${c ? `<div class="cert-wrap">${certHtml(c)}</div>
        <p class="small muted mt-2 no-print">กด “พิมพ์ / บันทึกเป็น PDF” แล้วเลือกปลายทาง “บันทึกเป็น PDF” (ขนาด A4 แนวนอน)</p>`
        : `<div class="card empty">${U.icon('award')}<p>ยังไม่มีใบประกาศ — ใบประกาศจะออกให้หลังจากแจ้งสิ้นสุดการทำงานและได้รับอนุมัติ</p></div>`}
      ${list.length > 1 ? `<div class="card mt-2 no-print"><b>ใบประกาศทั้งหมด</b>${list.map(x => `<a class="shift-row" href="#/certificate/${x.id}"><span class="date-chip">${U.icon('award')}</span><span><b>${U.esc(x.name)}</b><small class="muted">${x.no} · ${U.fmtDateTime(x.issuedAt)}</small></span></a>`).join('')}</div>` : ''}
    </div></section>`;
    U.$('#printCert') && (U.$('#printCert').onclick = () => window.print());
  }

  function viewVerify(seg) {
    const no = seg[0] || '';
    const c = no && S.certByNo(no);
    const masked = (n) => n.replace(/^(นางสาว|นาย|นาง)/, '$1 ').split(' ').map((w, i) => i === 2 ? w.charAt(0) + '•••' : w).join(' ');
    U.app.innerHTML = `<div class="auth-wrap"><div class="card card-shadow auth-card"><img class="auth-logo" src="assets/images/ssc-logo.png" alt="ศูนย์กีฬาสิรินธร">
      <div class="eyebrow">${U.chev()} Verify</div><h2>ตรวจสอบใบประกาศนียบัตร</h2>
      <form class="lookup" id="vf"><input class="input" name="no" value="${U.esc(no)}" placeholder="เช่น SSC 001/2569" aria-label="เลขที่ใบประกาศ"><button class="btn">${U.icon('search')}</button></form>
      ${no ? (c ? `<div class="notice tone-good mt-2">${U.icon('checkc')}<span><b>ใบประกาศถูกต้อง</b><br>${U.esc(masked(c.name))}<br>นิสิตช่วยงาน ฝ่าย${posTh(c.position)} · ${thLong(c.from)} – ${thLong(c.to)}<br>ออกเมื่อ ${thLong(T.dateKey(c.issuedAt))}</span></div>`
        : `<div class="notice tone-bad mt-2">${U.icon('x')}<span>ไม่พบใบประกาศเลขที่นี้ในระบบ</span></div>`) : ''}
    </div></div>`;
    U.$('#vf').onsubmit = (e) => { e.preventDefault(); location.hash = '#/verify/' + encodeURIComponent(e.target.no.value.trim()); };
  }

  /* =========================================================
     แอดมิน: ตารางเวร
     ========================================================= */
  function adminRoster(main, seg) {
    const ym = /^\d{4}-\d{2}$/.test(seg) ? seg : T.dateKey().slice(0, 7);
    const r = S.roster(ym);
    const pos = sessionStorage.getItem('roster-pos') || 'reception';
    const draft = r && r.status === 'draft';
    const staff = S.staffOf(pos);
    const need = S.work.staffing[pos] || {};
    const perDay = Object.values(need).reduce((a, b) => a + b, 0);
    const issues = r ? S.rosterIssues(ym) : [];
    const issueIds = new Set(issues.filter(i => i.shift).map(i => i.shift.id));
    const counts = {}; staff.forEach(a => counts[a.userId] = { total: 0 });
    r && r.shifts.filter(s => s.position === pos && s.userId).forEach(s => { const c = counts[s.userId] ||= { total: 0 }; c.total++; c[s.location] = (c[s.location] || 0) + 1; });
    const posIssues = issues.filter(i => !i.shift || i.shift.position === pos);
    const swappedIds = S.swappedShiftIds();
    main.innerHTML = `
      <div class="admin-head">
        <div><h2>ตารางเวรนิสิตช่วยงาน</h2><span class="muted small">${S.work.shiftStart}–${S.work.shiftEnd} น. · วันทำงาน ${S.work.workDays.map(d => ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][d]).join(' ')} · <a href="#/admin/worksettings">ตั้งค่า</a></span></div>
        ${MONTH_NAV(ym, '#/admin/roster')}
      </div>
      <div class="card mb-2 roster-bar">
        <div>${r ? (draft ? `<span class="badge tone-warn">${U.icon('edit')}ฉบับร่าง — กดที่วันเพื่อแก้ไข</span>` : `<span class="badge tone-good">${U.icon('lock')}ยืนยันแล้ว ${U.fmtDateTime(r.confirmedAt)}</span>`) : '<span class="badge tone-neutral">ยังไม่มีตาราง</span>'}
          ${r ? `<small class="muted">${r.shifts.filter(s => s.userId).length} เวร · ${issues.length ? `<span style="color:var(--amber)">พบ ${issues.length} จุดที่ควรตรวจ</span>` : 'ไม่พบปัญหา ✓'}</small>` : ''}</div>
        <div class="flex">
          <button class="btn btn-ghost btn-sm" id="staffBtn">${U.icon('users')} ตั้งจำนวนคน</button>
          ${!r || draft ? `<button class="btn btn-ghost btn-sm" id="genBtn">${U.icon('settings')} ${r ? 'จัดเวรใหม่อัตโนมัติ' : 'สร้างตารางอัตโนมัติ'}</button>` : ''}
          ${draft ? `<button class="btn btn-sm" id="confirmBtn">${U.icon('check')} ยืนยันเวรและแจ้งนิสิต</button>` : ''}
          ${r && !draft ? `<button class="btn btn-ghost btn-sm" id="remindBtn">${U.icon('bell')} ส่งแจ้งเตือนเวรวันนี้</button><button class="btn btn-ghost btn-sm" id="unlockBtn">${U.icon('unlock')} ปลดล็อกเพื่อแก้ไข</button>` : ''}
        </div>
      </div>
      ${r ? `
      <nav class="tabs mb-2">${POSITIONS.map(p => `<a href="#" data-pos="${p.id}" class="${p.id === pos ? 'active' : ''}">${U.icon(p.icon)}<span>${p.th}</span><small class="muted">${Object.values(S.work.staffing[p.id] || {}).reduce((a, b) => a + b, 0)} คน/วัน</small></a>`).join('')}</nav>
      <div class="dash-grid">
        <div class="card span-8 rc-card">
          <div class="legend mb-2">${Object.keys(need).map(l => `<span>${U.locIcon(l)}${T.locName(l)}${need[l] > 1 ? ` × ${need[l]}` : ''}</span>`).join('')}</div>
          ${calendar(ym, d => {
            const list = r.shifts.filter(s => s.date === d && s.position === pos);
            const filled = list.filter(s => s.userId);
            const work = S.work.workDays.includes(T.weekday(d));
            if (!list.length && !work) return '';
            return `<div class="rc-list">${list.map(s => `<span class="rc-chip ${s.userId ? '' : 'empty'} ${issueIds.has(s.id) ? 'warn' : ''}" title="${U.esc(T.locName(s.location))}${swappedIds.has(s.id) ? ' · แลกเวรแล้ว' : ''}">${U.locIcon(s.location)}${s.userId ? U.avatar(s.userId, 16, 'av-xs') : ''}<span class="nm">${swappedIds.has(s.id) ? '⇄ ' : ''}${s.userId ? U.esc(S.chatName(s.userId)) : 'ว่าง'}</span></span>`).join('')}</div>
              <span class="rc-count ${filled.length < perDay && work ? 'short' : ''}">${filled.length}/${perDay}</span>`;
          }, true)}
          <p class="small muted mt-2 mb-0">${U.icon('edit')} กดที่วันในปฏิทินเพื่อดูรายชื่อ${draft ? 'และเปลี่ยนคนทำงาน' : ''} — สีของชื่อ = สถานที่</p>
        </div>
        <div class="span-4 grid" style="align-content:start">
          <div class="card"><h3>เวรต่อคน — ฝ่าย${posTh(pos)}</h3>
            <div class="table-wrap" style="border:0"><table class="table compact"><thead><tr><th>ชื่อ</th><th>รวม</th>${Object.keys(need).map(l => `<th title="${T.locName(l)}" aria-label="${T.locName(l)}">${U.locIcon(l)}</th>`).join('')}</tr></thead>
            <tbody>${staff.map(a => `<tr><td><span class="who-cell">${U.avatar(a.userId, 22)}${U.esc(S.chatName(a.userId))}</span></td><td><b>${counts[a.userId]?.total || 0}</b></td>${Object.keys(need).map(l => `<td>${counts[a.userId]?.[l] || 0}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="6" class="muted">ไม่มีนิสิตในฝ่ายนี้</td></tr>'}</tbody></table></div>
            ${staff.length < perDay ? `<div class="notice tone-warn small mt-1">${U.icon('alert')}<span>ฝ่ายนี้มีนิสิต ${staff.length} คน แต่ต้องการ ${perDay} คน/วัน</span></div>` : ''}
          </div>
          <div class="card"><h3>ประวัติการแลกเวร</h3>${(() => { const h = S.swapHistory(ym).filter(x => x.position === pos); const L = (d, l) => `${T.thDate(d, { day: 'numeric', month: 'short' })} ${LOC_SHORT(l)}`;
            return h.length ? `<div class="swap-hist">${h.map(x => `<div class="sh-row"><span class="sh-ico">⇄</span><span><b>${U.esc(S.chatName(x.userId))}</b> ${x.giveDate ? '⇄' : '→'} <b>${U.esc(S.chatName(x.acceptedUserId))}</b><br><small>${L(x.date, x.location)}${x.giveDate ? ' ↔ ' + L(x.giveDate, x.giveLocation) : ' (รับแทน)'}</small></span><small class="muted">${U.fmtDateTime(x.closedAt)}</small></div>`).join('')}</div>` : '<p class="small muted mb-0">ยังไม่มีการแลกเวรของฝ่ายนี้ในเดือนนี้</p>'; })()}
            <p class="small muted mt-1 mb-0">⇄ ในปฏิทิน = เวรที่นิสิตแลกกันเอง (ยืนยันทั้งสองฝ่ายแล้ว)</p></div>
          <div class="card"><h3>ตรวจตาราง</h3>${posIssues.length ? `<ul class="issue-list">${posIssues.map(i => `<li>${U.icon('alert')}${U.esc(i.text)}</li>`).join('')}</ul>` : `<div class="notice tone-good small">${U.icon('checkc')}ฝ่ายนี้ไม่พบเวรซ้ำ สถานที่ซ้ำติดกัน หรือจำนวนเวรไม่เท่ากัน</div>`}</div>
        </div>
      </div>` : `<div class="card empty">${U.icon('calendar')}<p>ยังไม่มีตารางเวร${T.thMonth(ym)} กด “สร้างตารางอัตโนมัติ” เพื่อเริ่มจัดเวร</p></div>`}`;

    const rerender = () => adminRoster(main, ym);
    const activeTab = U.$('.tabs .active', main); if (activeTab) activeTab.parentNode.scrollLeft = activeTab.offsetLeft - activeTab.parentNode.offsetLeft - 16;   // เลื่อนแถบฝ่ายให้เห็นฝ่ายที่เลือก (มือถือ)
    U.$$('[data-pos]', main).forEach(a => a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('roster-pos', a.dataset.pos); rerender(); });
    U.$$('.cal-d[data-date]', main).forEach(c => { c.onclick = () => rosterDay(ym, c.dataset.date, pos, rerender); c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } }; });
    U.$('#staffBtn').onclick = () => staffingDialog(ym, pos, rerender);
    U.$('#genBtn') && (U.$('#genBtn').onclick = () => { if (r && !confirm('จัดเวรใหม่ทั้งเดือน? การแก้ไขด้วยมือจะหายไป')) return; S.generateRoster(ym); U.toast('จัดเวรอัตโนมัติแล้ว ตรวจและแก้ไขได้ก่อนยืนยัน'); rerender(); });
    U.$('#confirmBtn') && (U.$('#confirmBtn').onclick = () => {
      const msg = issues.length ? `ยังมี ${issues.length} จุดที่ควรตรวจ ต้องการยืนยันเลยหรือไม่?` : `ยืนยันตารางเวร${T.thMonth(ym)}? ระบบจะแจ้งนิสิตช่วยงานทุกคนทางระบบและอีเมล`;
      if (!confirm(msg)) return;
      S.confirmRoster(ym); U.toast('ยืนยันเวรแล้ว — ส่งแจ้งเตือนและอีเมลถึงนิสิตแล้ว'); rerender();
    });
    U.$('#unlockBtn') && (U.$('#unlockBtn').onclick = () => { if (confirm('ปลดล็อกตารางที่ยืนยันแล้ว? นิสิตจะไม่เห็นตารางจนกว่าจะยืนยันอีกครั้ง')) { S.unlockRoster(ym); rerender(); } });
    U.$('#remindBtn') && (U.$('#remindBtn').onclick = () => { const n = S.runDailyReminders(true); U.toast(n ? `ส่งแจ้งเตือนเวรวันนี้ ${n} รายการ (ระบบ + อีเมล)` : 'วันนี้ส่งแจ้งเตือนครบแล้ว หรือไม่มีเวร'); });
  }

  /* หน้าต่างรายวัน: รายชื่อคนทำงานแยกตามจุด เลือกทีละฝ่าย
     ฉบับร่าง: เปลี่ยนคน / เพิ่มคนที่จุดใดก็ได้ / ลบช่องที่ไม่ใช้ — ปรับตามหน้างานเป็นรายวัน */
  function rosterDay(ym, date, pos, onChange) {
    const m = U.modal('');
    m.classList.add('roster-day');
    const render = () => {
      const r = S.roster(ym), draft = r.status === 'draft';
      const need = S.work.staffing[pos] || {};
      const staff = S.staffOf(pos);
      const dayShifts = r.shifts.filter(s => s.date === date);
      const mine = dayShifts.filter(s => s.position === pos);
      const issueIds = new Set(S.rosterIssues(ym).filter(i => i.shift).map(i => i.shift.id));
      const monthCount = (uid) => r.shifts.filter(s => s.userId === uid).length;
      const prevLoc = (uid) => { const p = r.shifts.filter(s => s.userId === uid && s.date < date).sort((a, b) => b.date.localeCompare(a.date))[0]; return p && p.location; };
      const work = S.work.workDays.includes(T.weekday(date));
      // จุดที่แสดง: จุดตามตั้งค่าของฝ่าย + จุดที่มีเวรอยู่แล้ว
      const locs = [...new Set(Object.keys(need).concat(mine.map(s => s.location)))];
      const label = (a, s, loc) => {
        const busy = dayShifts.some(x => x.userId === a.userId && x !== s);
        const same = pos === 'reception' && prevLoc(a.userId) === loc;
        return `${S.chatName(a.userId)} · เดือนนี้ ${monthCount(a.userId)} เวร${busy ? ' · ⚠ มีเวรแล้ววันนี้' : ''}${same ? ' · ↻ จุดเดิมเวรก่อน' : ''}`;
      };
      const select = (s, loc) => `<select class="input rd-sel" data-id="${s ? s.id : ''}" data-loc="${loc}"><option value="">— ว่าง —</option>${staff.map(a => `<option value="${a.userId}" ${s && s.userId === a.userId ? 'selected' : ''}>${U.esc(label(a, s, loc))}</option>`).join('')}</select>`;
      const groups = locs.map(loc => {
        const at = mine.filter(s => s.location === loc);
        const want = need[loc] || 0;
        // ยังไม่มีเวรของฝ่ายนี้ในวันนี้เลย → แสดงช่องว่างตามจำนวนที่ตั้งไว้ให้เลือกคนได้ทันที
        const rows = at.length || mine.length ? at.map(s => ({ s })) : Array.from({ length: want }, () => ({ s: null }));
        const short = at.filter(s => s.userId).length;
        return `<div class="rd-group">
          <div class="rd-head"><span>${U.locIcon(loc)}<b>${T.locName(loc)}</b></span>
            <small class="${short < want && work ? 'warn-text' : 'muted'}">${short}/${want} คน${!want ? ' (เพิ่มพิเศษ)' : ''}</small></div>
          ${rows.map((row, i) => {
            const s = row.s, uid = s ? s.userId : '';
            return `<div class="rd-row ${s && issueIds.has(s.id) ? 'warn' : ''}">
              <small class="muted rd-no">${i + 1}</small>${s && s.userId ? U.avatar(s.userId, 28) : '<span class="av av-empty" style="--s:28px"></span>'}
              ${draft ? select(s, loc) : `<span class="name-chip ${uid ? '' : 'empty'}">${uid ? U.esc(fullName(uid)) : 'ว่าง'}</span>`}
              ${draft && s ? `<button class="btn btn-ghost btn-icon btn-sm" data-rm="${s.id}" title="ลบช่องนี้" aria-label="ลบช่องนี้">${U.icon('x')}</button>` : ''}
            </div>`;
          }).join('')}
          ${draft ? `<button class="btn btn-ghost btn-sm rd-add" data-add="${loc}">${U.icon('users')} + เพิ่มคนที่จุดนี้</button>` : ''}
        </div>`;
      }).join('');
      const otherLocs = LOCATIONS.filter(l => !locs.includes(l.id));
      U.$('.modal', m).innerHTML = `
        <div class="flex between mb-1"><div><h3 class="mb-0">${T.thDate(date)}</h3><span class="small muted">${work ? `${S.work.shiftStart}–${S.work.shiftEnd} น.` : 'วันหยุด — เพิ่มเวรพิเศษได้'}</span></div>
          <button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="ปิด">${U.icon('x')}</button></div>
        <nav class="tabs mb-2">${POSITIONS.map(p => { const n = dayShifts.filter(s => s.position === p.id && s.userId).length, t = Object.values(S.work.staffing[p.id] || {}).reduce((a, b) => a + b, 0); return `<a href="#" data-dpos="${p.id}" class="${p.id === pos ? 'active' : ''}">${U.icon(p.icon)}<span>${p.th}</span><small class="${n < t && work ? 'warn-text' : 'muted'}">${n}/${t}</small></a>`; }).join('')}</nav>
        ${draft ? '' : `<div class="notice tone-info small mb-2">${U.icon('lock')}<span>ตารางเดือนนี้ยืนยันแล้ว — กด “ปลดล็อกเพื่อแก้ไข” ที่หน้าตารางเวรก่อนเปลี่ยนคน</span></div>`}
        <div class="rd-list">${groups || `<p class="muted">ฝ่ายนี้ยังไม่ได้กำหนดจุดปฏิบัติงาน</p>`}</div>
        ${draft && otherLocs.length ? `<div class="flex mt-2"><select class="input" id="rdNewLoc" style="flex:1;min-height:40px">${otherLocs.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}</select><button class="btn btn-soft btn-sm" id="rdAddLoc">+ เพิ่มคนที่จุดอื่น</button></div>` : ''}
        <p class="small muted mt-2 mb-0">ปรับเฉพาะวันนี้ได้ตามหน้างาน · จำนวนมาตรฐานของทุกวันตั้งที่ปุ่ม “ตั้งจำนวนคน”${pos === 'reception' ? ' · ↻ = อยู่จุดเดิมกับเวรก่อนหน้า' : ''}</p>`;
      const changed = (msg) => { U.toast(msg); render(); onChange(); };
      const run = (fn, msg) => { try { fn(); changed(msg); } catch (e) { U.toast(e.message, true); } };
      U.$$('[data-dpos]', m).forEach(a => a.onclick = (e) => { e.preventDefault(); pos = a.dataset.dpos; sessionStorage.setItem('roster-pos', pos); render(); onChange(); });
      U.$$('.rd-sel', m).forEach(sel => sel.onchange = () => run(() => {
        if (sel.dataset.id) S.updateShift(ym, sel.dataset.id, { userId: sel.value });
        else if (sel.value) S.addShift(ym, { date, position: pos, location: sel.dataset.loc, userId: sel.value });
      }, 'บันทึกการเปลี่ยนเวรแล้ว'));
      U.$$('[data-rm]', m).forEach(b => b.onclick = () => run(() => S.removeShift(ym, b.dataset.rm), 'ลบช่องเวรแล้ว'));
      U.$$('[data-add]', m).forEach(b => b.onclick = () => run(() => S.addShift(ym, { date, position: pos, location: b.dataset.add, userId: '' }), 'เพิ่มช่องแล้ว — เลือกคนได้เลย'));
      U.$('#rdAddLoc', m) && (U.$('#rdAddLoc', m).onclick = () => run(() => S.addShift(ym, { date, position: pos, location: U.$('#rdNewLoc', m).value, userId: '' }), 'เพิ่มจุดแล้ว — เลือกคนได้เลย'));
    };
    render();
  }

  /* ตั้งจำนวนคนมาตรฐานต่อจุดต่อวัน ของแต่ละฝ่าย (ใช้ตอนจัดเวรอัตโนมัติ) */
  function staffingDialog(ym, pos, onSaved) {
    const m = U.modal('');
    const draftStaff = JSON.parse(JSON.stringify(S.work.staffing));
    const render = () => {
      const r = S.roster(ym);
      const rows = draftStaff[pos] || (draftStaff[pos] = {});
      const total = Object.values(rows).reduce((a, b) => a + b, 0), have = S.staffOf(pos).length;
      U.$('.modal', m).innerHTML = `
        <div class="flex between mb-1"><h3 class="mb-0">ตั้งจำนวนคนต่อวัน</h3><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="ปิด">${U.icon('x')}</button></div>
        <p class="small muted">จำนวนมาตรฐานที่ใช้จัดเวรอัตโนมัติทุกวันทำงาน — ถ้าเฉพาะบางวันต้องการมาก/น้อยกว่านี้ ให้ปรับในหน้าต่างของวันนั้น</p>
        <nav class="tabs mb-2">${POSITIONS.map(p => `<a href="#" data-spos="${p.id}" class="${p.id === pos ? 'active' : ''}">${U.icon(p.icon)}<span>${p.th}</span><small class="muted">${Object.values(draftStaff[p.id] || {}).reduce((a, b) => a + b, 0)}</small></a>`).join('')}</nav>
        <div class="st-list">${LOCATIONS.map(l => `<div class="st-row ${rows[l.id] ? 'on' : ''}">
          <span>${U.locIcon(l.id)}${l.name}</span>
          <span class="stepper-n"><button class="btn btn-ghost btn-icon btn-sm" data-dec="${l.id}" aria-label="ลด">−</button><b>${rows[l.id] || 0}</b><button class="btn btn-ghost btn-icon btn-sm" data-inc="${l.id}" aria-label="เพิ่ม">+</button></span>
        </div>`).join('')}</div>
        <div class="notice ${total > have ? 'tone-warn' : 'tone-neutral'} small mt-2">${U.icon(total > have ? 'alert' : 'users')}<span>ฝ่าย${posTh(pos)}: ต้องการ <b>${total}</b> คน/วัน · มีนิสิต ${have} คน${total > have ? ' — ไม่พอ บางช่องจะว่าง' : ` · แต่ละคนทำงานเฉลี่ย ~${have ? Math.round(total / have * S.work.workDays.length * 10) / 10 : 0} วัน/สัปดาห์`}</span></div>
        <div class="form-actions mt-2" style="border:0;padding-top:8px">
          <button class="btn btn-ghost" data-close>ยกเลิก</button>
          <div class="right">${r && r.status === 'draft' ? `<button class="btn btn-soft" id="stSaveGen">บันทึก + จัดเวร${T.thMonth(ym)}ใหม่</button>` : ''}<button class="btn" id="stSave">บันทึก</button></div>
        </div>`;
      U.$$('[data-spos]', m).forEach(a => a.onclick = (e) => { e.preventDefault(); pos = a.dataset.spos; render(); });
      U.$$('[data-inc]', m).forEach(b => b.onclick = () => { rows[b.dataset.inc] = Math.min(10, (rows[b.dataset.inc] || 0) + 1); render(); });
      U.$$('[data-dec]', m).forEach(b => b.onclick = () => { const k = b.dataset.dec; rows[k] = Math.max(0, (rows[k] || 0) - 1); if (!rows[k]) delete rows[k]; render(); });
      const save = (regen) => {
        try {
          S.saveWorkSettings({ staffing: draftStaff });
          if (regen) S.generateRoster(ym);
          m.remove(); U.toast(regen ? 'บันทึกและจัดเวรใหม่แล้ว' : 'บันทึกจำนวนคนแล้ว — มีผลกับการจัดเวรครั้งถัดไป'); onSaved();
        } catch (e) { U.toast(e.message, true); }
      };
      U.$('#stSave', m).onclick = () => save(false);
      U.$('#stSaveGen', m) && (U.$('#stSaveGen', m).onclick = () => { if (confirm('จัดเวรเดือนนี้ใหม่ทั้งหมด? การแก้ไขด้วยมือจะหายไป')) save(true); });
    };
    render();
  }

  /* ---------- แอดมิน: งานเพิ่มเติม ---------- */
  function adminJobs(main) {
    const u = S.currentUser();
    main.innerHTML = `
      <div class="admin-head"><div><h2>งานเพิ่มเติม</h2><span class="muted small">เปิดรับนิสิตช่วยงานกรณีเจ้าหน้าที่ติดภารกิจ — ระบบส่งแจ้งเตือนและอีเมลถึงนิสิตช่วยงานทุกคน (${S.apps().filter(a => a.status === 'passed').length} คน)</span></div></div>
      <div class="dash-grid">
        <div class="card span-5" style="align-self:start">
          <h3>เปิดรับงานใหม่</h3>
          <form id="jobForm">
            <div class="field"><label for="jt">ชื่องาน <span class="req">*</span></label><input class="input" id="jt" name="title" required placeholder="เช่น ดูแลเคาน์เตอร์แทนเจ้าหน้าที่"></div>
            <div class="field"><label for="jd">รายละเอียด <span class="req">*</span></label><textarea class="input" id="jd" name="detail" required placeholder="หน้าที่ สิ่งที่ต้องเตรียม การแต่งกาย"></textarea></div>
            <div class="form-grid">
              <div class="field full"><label for="jdate">วันที่ <span class="req">*</span></label><input class="input" type="date" id="jdate" name="date" required min="${T.dateKey()}"></div>
              <div class="field"><label for="js">เวลาเริ่ม</label><input class="input" type="time" id="js" name="start" value="13:00" required></div>
              <div class="field"><label for="je">เวลาสิ้นสุด</label><input class="input" type="time" id="je" name="end" value="16:30" required></div>
              <div class="field full"><label for="jl">สถานที่ <span class="req">*</span></label><input class="input" id="jl" name="location" list="locList" required placeholder="เลือกหรือพิมพ์สถานที่"><datalist id="locList">${LOCATIONS.map(l => `<option value="${l.name}">`).join('')}<option value="ห้องประชุมศูนย์กีฬาสิรินธร"></datalist></div>
              <div class="field"><label for="jn">จำนวนที่รับ (คน)</label><input class="input" type="number" id="jn" name="slots" min="1" max="50" value="1" required></div>
            </div>
            <button class="btn btn-block">${U.icon('send')} เปิดรับและแจ้งนิสิตทุกคน</button>
          </form>
        </div>
        <div class="span-7"><div class="grid" id="jobList">${S.jobs().reverse().map(j => jobCard(j, u, true)).join('') || `<div class="card empty">${U.icon('megaphone')}<p>ยังไม่มีงานเพิ่มเติม</p></div>`}</div></div>
      </div>`;
    U.$('#jobForm').onsubmit = (e) => {
      e.preventDefault(); const f = e.target;
      if (f.end.value <= f.start.value) return U.toast('เวลาสิ้นสุดต้องหลังเวลาเริ่ม', true);
      S.createJob({ title: f.title.value.trim(), detail: f.detail.value.trim(), date: f.date.value, start: f.start.value, end: f.end.value, location: f.location.value.trim(), slots: +f.slots.value });
      U.toast('เปิดรับงานแล้ว — ส่งแจ้งเตือนและอีเมลถึงนิสิตช่วยงานทุกคน'); adminJobs(main);
    };
    U.$('#jobList').onclick = (e) => {
      const c = e.target.closest('[data-close-job]'), d = e.target.closest('[data-del-job]');
      if (c) { S.closeJob(c.dataset.closeJob); adminJobs(main); }
      if (d && confirm('ลบงานนี้?')) { S.deleteJob(d.dataset.delJob); adminJobs(main); }
    };
  }

  /* ---------- แอดมิน: ลงเวลาทำงาน + Excel ---------- */
  let attF = null;
  function adminAttendance(main) {
    const today = T.dateKey();
    attF ||= { from: T.dateKey(Date.now() - 5 * 864e5), to: today, pos: '' };
    const recs = S.attendance().filter(r => r.date >= attF.from && r.date <= attF.to && (!attF.pos || r.position === attF.pos)).sort((a, b) => b.in.ts - a.in.ts);
    const late = recs.filter(r => S.lateMinutes(r)).length, outside = recs.filter(r => r.in.inside === false || r.out?.inside === false).length;
    const review = recs.filter(r => r.in.face?.matched !== true || (r.out && r.out.face?.matched !== true)).length;
    main.innerHTML = `
      <div class="admin-head"><div><h2>ลงเวลาปฏิบัติงาน</h2><span class="muted small">บันทึกจากการสแกนใบหน้า + GPS ของนิสิตช่วยงาน</span></div>
        <button class="btn" id="xlsxBtn">${U.icon('download')} ส่งออกใบลงเวลา (Excel)</button></div>
      <div class="toolbar">
        <label class="field-inline">ตั้งแต่<input class="input" type="date" id="af" value="${attF.from}"></label>
        <label class="field-inline">ถึง<input class="input" type="date" id="at" value="${attF.to}"></label>
        <select class="input" id="ap"><option value="">ทุกฝ่าย</option>${POSITIONS.map(p => `<option value="${p.id}" ${attF.pos === p.id ? 'selected' : ''}>${p.th}</option>`).concat(`<option value="job" ${attF.pos === 'job' ? 'selected' : ''}>งานเพิ่มเติม</option>`).join('')}</select>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="label">${U.icon('checkc')}รายการลงเวลา</div><div class="value">${recs.length}</div><div class="delta">${new Set(recs.map(r => r.userId)).size} คน</div></div>
        <div class="kpi"><div class="label">${U.icon('clock')}มาสาย</div><div class="value">${late}</div><div class="delta">หลัง ${S.work.lateAfter} น.</div></div>
        <div class="kpi"><div class="label">${U.icon('globe')}นอกพื้นที่</div><div class="value">${outside}</div><div class="delta">รัศมี ${S.work.geo.radius} ม.</div></div>
        <div class="kpi"><div class="label">${U.icon('eye')}ต้องตรวจใบหน้า</div><div class="value">${review}</div><div class="delta">สแกนไม่ผ่าน/ถ่ายภาพเอง</div></div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>วันที่</th><th>นิสิต</th><th>งาน / สถานที่</th><th>เข้างาน</th><th>ออกงาน</th><th>รวม</th><th>ตรวจสอบ</th></tr></thead>
        <tbody>${recs.map(r => `<tr>
          <td>${thShort(r.date)}</td>
          <td><b>${U.esc(fullName(r.userId))}</b><span class="sub">${posTh(r.kind === 'job' ? 'job' : r.position)}</span></td>
          <td>${U.esc(r.kind === 'job' ? r.title : T.locName(r.location))}</td>
          <td>${scanCell(r.in, r)}</td><td>${r.out ? scanCell(r.out) : '<span class="muted">ยังไม่ออก</span>'}</td>
          <td>${r.out ? dur(recMinutes(r)) : '-'}</td>
          <td>${[r.in, r.out].filter(Boolean).map(x => x.face?.matched === true ? '' : x.face?.manual ? '<span class="badge tone-warn">ถ่ายภาพเอง</span>' : '<span class="badge tone-bad">ใบหน้าไม่ตรง</span>').join(' ') || '<span class="badge tone-good">ผ่าน</span>'}</td>
        </tr>`).join('') || '<tr><td colspan="7" class="muted">ไม่มีข้อมูลในช่วงนี้</td></tr>'}</tbody></table></div>`;
    const reload = () => { attF = { from: U.$('#af').value, to: U.$('#at').value, pos: U.$('#ap').value }; adminAttendance(main); };
    ['#af', '#at', '#ap'].forEach(s => U.$(s).onchange = reload);
    main.querySelector('tbody').onclick = (e) => { const p = e.target.closest('[data-photo]'); if (p) U.modal(`<div class="flex between mb-2"><b>ภาพขณะลงเวลา</b><button class="btn btn-ghost btn-icon btn-sm" data-close>${U.icon('x')}</button></div><img ${U.fsrc(p.dataset.photo)} alt="" style="width:100%;max-width:420px">`); };
    U.$('#xlsxBtn').onclick = () => exportDialog();
  }
  const scanCell = (x, rec) => `<span class="scan-cell">${x.photo ? `<img ${U.fsrc(x.photo)} data-photo="${U.esc(x.photo)}" alt="" title="ดูภาพ">` : `<span class="ph-mini">${U.icon('user')}</span>`}<span><b>${T.timeOf(x.ts)}</b>${rec ? lateBadge(rec) : ''}<small class="${x.inside === false ? 'warn-text' : 'muted'}">${x.inside === false ? 'นอกพื้นที่ ' : ''}${x.dist != null ? x.dist.toLocaleString() + ' ม.' : ''}</small></span></span>`;

  function exportDialog() {
    const m = U.modal(`<div class="flex between mb-2"><h3 class="mb-0">ส่งออกใบลงเวลาปฏิบัติงาน</h3><button class="btn btn-ghost btn-icon btn-sm" data-close>${U.icon('x')}</button></div>
      <form id="xf">
        <div class="form-grid">
          <div class="field"><label for="xfrom">ตั้งแต่วันที่</label><input class="input" type="date" id="xfrom" name="from" value="${attF.from}" required></div>
          <div class="field"><label for="xto">ถึงวันที่</label><input class="input" type="date" id="xto" name="to" value="${attF.to}" required></div>
        </div>
        <div class="field"><span class="label">ฝ่าย (1 ชีตต่อ 1 ฝ่าย)</span><div class="checks">${POSITIONS.map(p => `<label><input type="checkbox" name="pos" value="${p.id}" checked>${p.th} (${p.en})</label>`).join('')}<label><input type="checkbox" name="pos" value="job" checked>งานเพิ่มเติม</label></div></div>
        <div class="checks mb-2" style="grid-template-columns:1fr"><label><input type="checkbox" name="workOnly" checked> แสดงเฉพาะวันทำงาน (ตามตั้งค่า)</label></div>
        <p class="small muted">รูปแบบตามใบลงชื่อปฏิบัติงาน: ลำดับที่ · ชื่อ-สกุล · ลงนาม · เวลามา · ลงนาม · เวลากลับ · รวมเวลา · รวมผู้ปฏิบัติงาน พร้อมช่องลงชื่อผู้ตรวจ (${U.esc(S.work.signerTitle)})</p>
        <button class="btn btn-block" id="xgo">${U.icon('download')} ดาวน์โหลดไฟล์ .xlsx</button>
      </form>`);
    U.$('#xf', m).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      const pos = U.$$('input[name=pos]:checked', f).map(i => i.value);
      if (!pos.length) return U.toast('เลือกอย่างน้อย 1 ฝ่าย', true);
      if (f.to.value < f.from.value) return U.toast('ช่วงวันที่ไม่ถูกต้อง', true);
      const b = U.$('#xgo', m); b.disabled = true; b.textContent = 'กำลังสร้างไฟล์…';
      try { await exportTimesheet(f.from.value, f.to.value, pos, f.workOnly.checked); m.remove(); U.toast('ดาวน์โหลดใบลงเวลาแล้ว'); }
      catch (err) { U.toast(err.message, true); b.disabled = false; b.textContent = 'ลองอีกครั้ง'; }
    };
  }

  /* ใบลงชื่อปฏิบัติงานแบบเดียวกับแบบฟอร์มกระดาษของศูนย์ฯ — ใช้ ExcelJS (โหลดเฉพาะตอนส่งออก) */
  async function exportTimesheet(from, to, positions, workOnly) {
    await loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js');
    const SHEET = { reception: 'Reception', trainer: 'Trainer', lifeguard: 'Lifeguard', firstaid: 'First Aid', job: 'งานเพิ่มเติม' };
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ศูนย์กีฬาสิรินธร'; wb.created = new Date();
    const dates = [];
    for (let d = from; d <= to; d = T.dateKey(Date.parse(d + 'T12:00:00+07:00') + 864e5)) if (!workOnly || S.work.workDays.includes(T.weekday(d))) dates.push(d);
    const today = T.dateKey();
    const font = (o = {}) => Object.assign({ name: 'TH SarabunPSK', size: 14 }, o);
    const thin = { style: 'thin', color: { argb: 'FF000000' } };
    const box = { top: thin, left: thin, bottom: thin, right: thin };
    const rangeTitle = (() => {
      const a = new Date(from + 'T12:00:00+07:00'), b = new Date(to + 'T12:00:00+07:00');
      const m = (d) => d.toLocaleDateString('th-TH', { month: 'long', timeZone: 'Asia/Bangkok' }), y = (d) => d.toLocaleDateString('th-TH', { year: 'numeric', timeZone: 'Asia/Bangkok' }).replace(/\D/g, '');
      if (from === to) return `วันที่ ${a.getDate()} ${m(a)} พ.ศ. ${y(a)}`;
      if (from.slice(0, 7) === to.slice(0, 7)) return `วันที่ ${+from.slice(8)} - ${+to.slice(8)} ${m(a)} พ.ศ. ${y(a)}`;
      return `วันที่ ${+from.slice(8)} ${m(a)} ${from.slice(0, 4) === to.slice(0, 4) ? '' : 'พ.ศ. ' + y(a) + ' '}- ${+to.slice(8)} ${m(b)} พ.ศ. ${y(b)}`;
    })();
    const dayTitle = (d) => `วันที่ ${+d.slice(8)} ${T.thDate(d, { month: 'long' })} พ.ศ. ${+d.slice(0, 4) + 543}`;

    positions.forEach(pos => {
      const ws = wb.addWorksheet(SHEET[pos], { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .4, right: .4, top: .5, bottom: .5, header: .2, footer: .2 } } });
      ws.columns = [8, 26, 9, 9, 9, 9, 8, 12].map(width => ({ width }));
      ws.mergeCells('A1:H1'); ws.getCell('A1').value = `บัญชีลงเวลาปฏิบัติงาน (นิสิตช่วยงาน) ${SHEET[pos]}`;
      ws.mergeCells('A2:H2'); ws.getCell('A2').value = rangeTitle;
      ['A1', 'A2'].forEach(c => { ws.getCell(c).font = font({ size: 16, bold: true }); ws.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' }; });
      ws.getRow(1).height = 24; ws.getRow(2).height = 22;
      const head = ws.getRow(3);
      head.values = ['ลำดับที่', 'ชื่อ - สกุล', 'ลงนาม', 'เวลามา', 'ลงนาม', 'เวลากลับ', 'รวม\nเวลา', 'รวม\nผู้ปฏิบัติงาน'];
      head.height = 36;
      head.eachCell(c => { c.font = font({ bold: true }); c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = box; });
      let row = 4;
      dates.forEach(d => {
        // รายชื่อ: คนที่มีเวรตามตาราง (ยืนยันแล้ว) + คนที่สแกนเข้างานจริง
        const recs = S.attendance().filter(r => r.date === d && (pos === 'job' ? r.kind === 'job' : r.kind === 'shift' && r.position === pos));
        const roster = S.roster(d.slice(0, 7));
        const sched = pos === 'job' ? [] : (roster && roster.status === 'confirmed' ? roster.shifts.filter(s => s.date === d && s.position === pos && s.userId) : []);
        const people = [];
        sched.forEach(s => { if (!people.some(p => p.userId === s.userId)) people.push({ userId: s.userId, rec: recs.find(r => r.userId === s.userId) }); });
        recs.forEach(r => { if (!people.some(p => p.userId === r.userId && (pos !== 'job' || p.rec === r))) people.push({ userId: r.userId, rec: r }); });
        const band = ws.getRow(row);
        ws.mergeCells(row, 1, row, 7);
        band.getCell(1).value = dayTitle(d);
        band.getCell(1).font = font({ bold: true });
        band.getCell(1).alignment = { vertical: 'middle' };
        for (let c = 1; c <= 8; c++) { band.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; band.getCell(c).border = box; }
        row++;
        const first = row, n = Math.max(6, people.length);
        for (let i = 0; i < n; i++) {
          const p = people[i], r = ws.getRow(row), rec = p?.rec;
          const late = rec ? S.lateMinutes(rec) : 0;
          const absent = p && !rec && d < today;
          r.values = [i + 1, p ? fullName(p.userId) + (pos === 'job' && rec ? ` (${rec.title})` : '') : '',
            rec ? 'สแกนหน้า ✓' : '', rec ? T.timeOf(rec.in.ts) : (absent ? 'ขาดงาน' : ''),
            rec?.out ? 'สแกนหน้า ✓' : '', rec?.out ? T.timeOf(rec.out.ts) : '',
            rec?.out ? dur(recMinutes(rec)) : '', null];
          r.height = 20;
          for (let c = 1; c <= 8; c++) {
            const cell = r.getCell(c);
            cell.border = box; cell.font = font(); cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle' };
          }
          [3, 5].forEach(c => { r.getCell(c).font = font({ size: 11, color: { argb: 'FF0F8F66' } }); });
          if (late) { r.getCell(4).font = font({ color: { argb: 'FFC00000' }, bold: true }); r.getCell(4).note = `มาสาย ${late} นาที`; }
          if (absent) r.getCell(4).font = font({ color: { argb: 'FFC00000' } });
          if (rec && (rec.in.inside === false)) r.getCell(4).note = (r.getCell(4).note ? r.getCell(4).note + ' / ' : '') + `นอกพื้นที่ ${rec.in.dist} ม.`;
          row++;
        }
        ws.mergeCells(first, 8, row - 1, 8);
        const worked = people.filter(p => p.rec).length;
        const tot = ws.getCell(first, 8);
        tot.value = worked ? `${worked} คน` : '';
        tot.font = font({ bold: true }); tot.alignment = { horizontal: 'center', vertical: 'middle' }; tot.border = box;
      });
      row += 1;
      ws.getCell(row, 5).value = 'ลงชื่อ'; ws.getCell(row, 5).alignment = { horizontal: 'right' };
      ws.mergeCells(row, 6, row, 7); ws.getCell(row, 6).border = { bottom: { style: 'dotted' } };
      ws.getCell(row, 8).value = 'ผู้ตรวจ';
      row += 1;
      ws.mergeCells(row, 5, row, 8); ws.getCell(row, 5).value = '(.................................................)'; ws.getCell(row, 5).alignment = { horizontal: 'center' };
      row += 1;
      ws.mergeCells(row, 5, row, 8); ws.getCell(row, 5).value = S.work.signerTitle; ws.getCell(row, 5).alignment = { horizontal: 'center' };
      for (let r = row - 2; r <= row; r++) ws.getRow(r).eachCell(c => { c.font = font(); });
      ws.views = [{ state: 'frozen', ySplit: 3 }];
      ws.pageSetup.printTitlesRow = '1:3';
    });
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `ใบลงเวลานิสิตช่วยงาน_${from}_${to}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- แอดมิน: ใบประกาศ ---------- */
  function adminCerts(main) {
    const c = S.certSettings;
    const pending = S.exits().filter(e => e.status === 'pending');
    const sample = { no: 'SSC 000/2569', name: 'นางสาวตัวอย่าง ใจดี', position: 'reception', from: T.dateKey(Date.now() - 200 * 864e5), to: T.dateKey(), hours: 312, issuedAt: Date.now(), signer: { name: c.directorName, title: c.directorTitle, signature: c.signature } };
    main.innerHTML = `
      <div class="admin-head"><div><h2>สิ้นสุดการทำงาน & ใบประกาศนียบัตร</h2><span class="muted small">อนุมัติคำขอแจ้งสิ้นสุดการทำงาน แล้วระบบออกใบประกาศพร้อมลายเซ็นอิเล็กทรอนิกส์ ส่งให้ในระบบและอีเมล</span></div></div>
      <div class="dash-grid">
        <div class="span-7 grid" style="align-content:start">
          <div class="card"><h3>คำขอแจ้งสิ้นสุดการทำงาน ${pending.length ? `<span class="dot-count static">${pending.length}</span>` : ''}</h3>
            ${pending.map(e => `<div class="exit-item">
              <div><b>${U.esc(fullName(e.userId))}</b> <span class="muted small">ฝ่าย${posTh(S.posOfUser(e.userId))}</span><br>
              <span class="small">วันสุดท้าย ${thLong(e.lastDay)} · ส่งเมื่อ ${U.fmtDateTime(e.ts)}</span><br><span class="small muted">“${U.esc(e.reason)}”</span></div>
              <div class="flex"><button class="btn btn-sm" data-approve="${e.id}">${U.icon('award')} อนุมัติ & ออกใบประกาศ</button><button class="btn btn-ghost btn-sm" data-reject="${e.id}">ไม่อนุมัติ</button></div>
            </div>`).join('') || '<p class="muted mb-0">ไม่มีคำขอที่รออนุมัติ</p>'}
          </div>
          <div class="card"><h3>ใบประกาศที่ออกแล้ว</h3>
            <div class="table-wrap" style="border:0"><table class="table compact"><thead><tr><th>เลขที่</th><th>ชื่อ</th><th>ฝ่าย</th><th>ชั่วโมง</th><th>วันที่ออก</th><th></th></tr></thead>
            <tbody>${S.certs().map(x => `<tr><td>${x.no}</td><td>${U.esc(x.name)}</td><td>${posTh(x.position)}</td><td>${x.hours}</td><td>${U.fmtDateTime(x.issuedAt)}</td><td><a class="btn btn-ghost btn-sm" href="#/certificate/${x.id}">ดู</a></td></tr>`).join('') || '<tr><td colspan="6" class="muted">ยังไม่มี</td></tr>'}</tbody></table></div>
          </div>
          <div class="card"><h3>ตัวอย่างใบประกาศ</h3><div class="cert-wrap">${certHtml(sample, true)}</div></div>
        </div>
        <div class="span-5">
          <div class="card card-shadow" style="position:sticky;top:88px">
            <h3>ลายเซ็นผู้อำนวยการ</h3>
            <div class="sig-box">${c.signature ? `<img ${U.fsrc(c.signature)} alt="ลายเซ็น">` : `<span class="muted small">${U.icon('edit')} ยังไม่มีลายเซ็น</span>`}</div>
            <form id="certForm">
              <div class="field"><label class="btn btn-soft btn-sm" style="justify-self:start">${U.icon('upload')} อัปโหลดลายเซ็น (PNG/JPG)<input type="file" id="sigFile" accept="image/png,image/jpeg" hidden></label>
                <span class="hint">แนะนำ: เซ็นบนกระดาษขาวด้วยปากกาสีน้ำเงินเข้ม/ดำ แล้วถ่ายหรือสแกน ระบบลบพื้นหลังสีขาวให้อัตโนมัติ</span></div>
              ${c.signature ? `<button type="button" class="btn btn-ghost btn-sm mb-2" id="sigDel">${U.icon('trash')} ลบลายเซ็น</button>` : ''}
              <div class="field"><label for="dn">ชื่อผู้อำนวยการ (สำหรับพิมพ์ใต้ลายเซ็น)</label><input class="input" id="dn" name="directorName" value="${U.esc(c.directorName)}" placeholder="เช่น ผู้ช่วยศาสตราจารย์ ดร. ..."></div>
              <div class="field"><label for="dt">ตำแหน่ง</label><input class="input" id="dt" name="directorTitle" value="${U.esc(c.directorTitle)}"></div>
              <div class="checks mb-2" style="grid-template-columns:1fr"><label><input type="checkbox" name="autoIssue" ${c.autoIssue ? 'checked' : ''}> ออกใบประกาศอัตโนมัติทันทีเมื่อนิสิตแจ้งสิ้นสุดการทำงาน (ไม่ต้องรออนุมัติ)</label></div>
              <button class="btn btn-block">บันทึก</button>
            </form>
            <p class="small muted mt-2 mb-0">${U.icon('shield')} ลายเซ็นจะถูกฝังลงในใบประกาศ ณ เวลาที่ออก การเปลี่ยนลายเซ็นภายหลังจะไม่กระทบใบที่ออกไปแล้ว</p>
          </div>
        </div>
      </div>`;
    main.onclick = (e) => {
      const a = e.target.closest('[data-approve]'), r = e.target.closest('[data-reject]');
      try {
        if (a && confirm('อนุมัติสิ้นสุดการทำงานและออกใบประกาศ? ระบบจะลบเวรหลังวันสุดท้าย และส่งใบประกาศทางระบบ + อีเมล')) { const cert = S.approveExit(a.dataset.approve); U.toast(`ออกใบประกาศ ${cert.no} แล้ว`); adminCerts(main); }
        if (r) { const note = prompt('เหตุผลที่ไม่อนุมัติ (แจ้งนิสิต)'); if (note !== null) { S.rejectExit(r.dataset.reject, note); adminCerts(main); } }
      } catch (err) { U.toast(err.message, true); }
    };
    U.$('#sigFile').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try { S.saveCertSettings({ signature: await cleanSignature(file) }); U.toast('อัปโหลดลายเซ็นแล้ว'); adminCerts(main); }
      catch (err) { U.toast(err.message, true); }
    };
    U.$('#sigDel') && (U.$('#sigDel').onclick = () => { if (confirm('ลบลายเซ็น?')) { S.saveCertSettings({ signature: null }); adminCerts(main); } });
    U.$('#certForm').onsubmit = (e) => { e.preventDefault(); const f = e.target; S.saveCertSettings({ directorName: f.directorName.value.trim(), directorTitle: f.directorTitle.value.trim(), autoIssue: f.autoIssue.checked }); U.toast('บันทึกแล้ว'); adminCerts(main); };
  }
  /* ย่อขนาด + ลบพื้นหลังขาว → PNG โปร่งใส */
  function cleanSignature(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 8 * 1024 * 1024) return reject(new Error('ไฟล์ใหญ่เกิน 8 MB'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const sc = Math.min(1, 700 / img.width), c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
        const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
        for (let i = 0; i < p.length; i += 4) {
          const l = (p[i] + p[i + 1] + p[i + 2]) / 3;
          if (l > 200) p[i + 3] = 0; else if (l > 150) p[i + 3] = Math.round((200 - l) / 50 * p[i + 3]);
        }
        x.putImageData(d, 0, 0);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
      img.src = url;
    });
  }

  /* ---------- แอดมิน: อีเมล/แจ้งเตือนที่ส่ง ---------- */
  function adminOutbox(main) {
    const list = S.outbox();
    const stLabel = { queued: 'รอส่ง', sent: 'ส่งแล้ว', failed: 'ส่งไม่สำเร็จ' };
    const kinds = { daily: 'แจ้งเวรประจำวัน', roster: 'ตารางเวร', job: 'งานเพิ่มเติม', cert: 'ใบประกาศ', swap: 'แลกเวร', officer: 'บัญชีเจ้าหน้าที่' };
    main.innerHTML = `
      <div class="admin-head"><div><h2>อีเมลแจ้งเตือน</h2><span class="muted small">บันทึกอีเมลที่ระบบส่ง (${list.length} ฉบับ) · แจ้งเวรประจำวันส่งทุกวันเวลา ${S.work.reminderTime} น.</span></div></div>
      ${S.mode === 'local' ? `<div class="notice tone-warn mb-2">${U.icon('alert')}<span>โหมดสาธิต: ระบบบันทึกอีเมลไว้ในรายการนี้แต่ไม่ได้ส่งออกจริง — โหมดจริง (Apps Script) ส่งด้วย Gmail ของบัญชีที่ deploy</span></div>` : `<div class="notice tone-info mb-2">${U.icon('send')}<span>ส่งจริงด้วย Gmail ของบัญชีที่ deploy ระบบ · สถานะ “queued” = รอส่ง (เกินโควตารายวันจะส่งต่อรอบถัดไปอัตโนมัติ)</span></div>`}
      <div class="table-wrap"><table class="table"><thead><tr><th>เวลา</th><th>ถึง</th><th>ประเภท</th><th>หัวเรื่อง</th><th></th></tr></thead>
      <tbody>${list.slice(0, 200).map(m => `<tr><td>${U.fmtDateTime(m.ts)}</td><td>${U.esc(m.toName)}<span class="sub">${U.esc(m.to)}</span></td><td><span class="badge tone-info">${kinds[m.kind] || m.kind}</span></td><td style="white-space:normal;min-width:240px">${U.esc(m.subject)}</td><td><button class="btn btn-ghost btn-sm" data-mail="${m.id}">อ่าน</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">ยังไม่มีอีเมล</td></tr>'}</tbody></table></div>`;
    main.querySelector('tbody').onclick = (e) => {
      const b = e.target.closest('[data-mail]'); if (!b) return;
      const m = list.find(x => x.id === b.dataset.mail);
      U.modal(`<div class="flex between mb-2"><b>${U.esc(m.subject)}</b><button class="btn btn-ghost btn-icon btn-sm" data-close>${U.icon('x')}</button></div>
        <p class="small muted">ถึง: ${U.esc(m.toName)} &lt;${U.esc(m.to)}&gt; · ${U.fmtDateTime(m.ts)} · ${stLabel[m.status] || m.status}${m.error ? ' — ' + U.esc(m.error) : ''}</p>
        <iframe class="mail-frame" title="ตัวอย่างอีเมล" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>`);
      // แสดงอีเมล HTML แบบเดียวกับที่ผู้รับเห็น (iframe แยก ไม่ให้ style ปนกับหน้าเว็บ)
      const fr = document.querySelector('.mail-frame');
      fr.srcdoc = '<base target="_blank">' + S.emailHtml(m, location.href.split('#')[0]);
      fr.onload = () => { try { fr.style.height = fr.contentDocument.body.scrollHeight + 20 + 'px'; } catch (e) {} };
    };
  }

  /* ---------- แอดมิน: ตั้งค่างาน ---------- */
  function adminWorkSettings(main) {
    const w = S.work;
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const staff = S.apps().filter(a => a.status === 'passed');
    main.innerHTML = `
      <div class="admin-head"><div><h2>ตั้งค่างานนิสิตช่วยงาน</h2></div></div>
      <form id="wsForm" class="dash-grid">
        <div class="card span-6">
          <h3>วันและเวลาทำงาน</h3>
          <div class="field"><span class="label">วันทำงาน</span><div class="checks">${days.map((d, i) => `<label><input type="checkbox" name="workDays" value="${i}" ${w.workDays.includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</div></div>
          <div class="form-grid">
            <div class="field"><label for="ws1">เริ่มงาน</label><input class="input" type="time" id="ws1" name="shiftStart" value="${w.shiftStart}"></div>
            <div class="field"><label for="ws2">เลิกงาน</label><input class="input" type="time" id="ws2" name="shiftEnd" value="${w.shiftEnd}"></div>
            <div class="field"><label for="ws3">นับว่ามาสายหลัง</label><input class="input" type="time" id="ws3" name="lateAfter" value="${w.lateAfter}"></div>
            <div class="field"><label for="ws4">ส่งแจ้งเตือนเวรประจำวัน</label><input class="input" type="time" id="ws4" name="reminderTime" value="${w.reminderTime}"></div>
          </div>
          <h3 class="mt-2">จำนวนคนต่อจุดต่อวัน</h3>
          <div class="table-wrap" style="border:0"><table class="table compact"><thead><tr><th>ฝ่าย</th>${LOCATIONS.map(l => `<th>${l.short}</th>`).join('')}</tr></thead>
          <tbody>${POSITIONS.map(p => `<tr><td>${p.th}</td>${LOCATIONS.map(l => `<td><input class="input staff-n" type="number" min="0" max="10" name="st-${p.id}-${l.id}" value="${(w.staffing[p.id] || {})[l.id] || 0}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        </div>
        <div class="card span-6">
          <h3>พื้นที่ลงเวลา (GPS)</h3>
          <div class="form-grid">
            <div class="field"><label for="g1">ละติจูด</label><input class="input" id="g1" name="lat" inputmode="decimal" value="${w.geo.lat}"></div>
            <div class="field"><label for="g2">ลองจิจูด</label><input class="input" id="g2" name="lng" inputmode="decimal" value="${w.geo.lng}"></div>
            <div class="field"><label for="g3">รัศมี (เมตร)</label><input class="input" type="number" id="g3" name="radius" min="50" max="5000" value="${w.geo.radius}"></div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm mb-2" id="hereBtn">${U.icon('globe')} ใช้ตำแหน่งปัจจุบันของฉัน (กดขณะอยู่ที่ศูนย์กีฬา)</button>
          <p class="small muted">พิกัดเริ่มต้นเป็นค่าตัวอย่าง — โปรดตั้งพิกัดจริงของศูนย์กีฬาสิรินธรก่อนใช้งาน</p>
          <div class="checks mb-2" style="grid-template-columns:1fr"><label><input type="checkbox" name="allowOutside" ${w.allowOutside ? 'checked' : ''}> อนุญาตลงเวลานอกพื้นที่ (บันทึกว่า “นอกพื้นที่”) — ปิดเมื่อใช้งานจริง</label></div>
          <h3>การยืนยันใบหน้า</h3>
          <div class="field"><label for="ft">ความเข้มงวด (ค่าความต่างสูงสุด)</label><input class="input" type="number" step="0.05" min="0.3" max="0.7" id="ft" name="faceThreshold" value="${w.faceThreshold}"><span class="hint">น้อย = เข้มงวด (แนะนำ 0.45–0.55)</span></div>
          <h3>ใบลงเวลา (Excel)</h3>
          <div class="field"><label for="sg">ตำแหน่งผู้ตรวจ</label><input class="input" id="sg" name="signerTitle" value="${U.esc(w.signerTitle)}"></div>
        </div>
        <div class="span-12"><button class="btn">บันทึกการตั้งค่า</button></div>
      </form>
      <div class="card mt-3"><h3>ใบหน้าที่ลงทะเบียน</h3>
        <div class="table-wrap" style="border:0"><table class="table compact"><thead><tr><th>นิสิต</th><th>ฝ่าย</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>${staff.map(a => { const f = S.faceRef(a.userId); return `<tr><td>${U.esc(a.profile.fullName)}</td><td>${posTh(a.resultPosition || a.profile.position1)}</td><td>${f ? `<span class="scan-cell"><img ${U.fsrc(f.photo)} alt="">ลงทะเบียน ${U.fmtDateTime(f.ts)}</span>` : '<span class="muted">ยังไม่ลงทะเบียน (ลงอัตโนมัติตอนสแกนครั้งแรก)</span>'}</td><td>${f ? `<button class="btn btn-ghost btn-sm" data-reset="${a.userId}">รีเซ็ต</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
      </div>`;
    U.$('#hereBtn').onclick = async () => {
      try { const p = await getPosition(); U.$('#g1').value = p.lat.toFixed(6); U.$('#g2').value = p.lng.toFixed(6); U.toast(`ได้พิกัดแล้ว (แม่นยำ ±${p.acc} ม.) กดบันทึกเพื่อใช้งาน`); }
      catch (e) { U.toast(e.message, true); }
    };
    main.querySelector('tbody').closest('.card') && main.addEventListener('click', (e) => {
      const r = e.target.closest('[data-reset]');
      if (r && confirm('รีเซ็ตใบหน้า? นิสิตจะลงทะเบียนใหม่ในการสแกนครั้งถัดไป')) { S.resetFace(r.dataset.reset); adminWorkSettings(main); }
    });
    U.$('#wsForm').onsubmit = (e) => {
      e.preventDefault(); const f = e.target;
      const staffing = {};
      POSITIONS.forEach(p => { staffing[p.id] = {}; LOCATIONS.forEach(l => { const n = +f[`st-${p.id}-${l.id}`].value; if (n > 0) staffing[p.id][l.id] = n; }); });
      const lat = parseFloat(f.lat.value), lng = parseFloat(f.lng.value);
      if (!isFinite(lat) || !isFinite(lng)) return U.toast('พิกัดไม่ถูกต้อง', true);
      S.saveWorkSettings({
        workDays: U.$$('input[name=workDays]:checked', f).map(i => +i.value), shiftStart: f.shiftStart.value, shiftEnd: f.shiftEnd.value,
        lateAfter: f.lateAfter.value, reminderTime: f.reminderTime.value, staffing, geo: { lat, lng, radius: +f.radius.value },
        allowOutside: f.allowOutside.checked, faceThreshold: +f.faceThreshold.value, signerTitle: f.signerTitle.value.trim()
      });
      U.toast('บันทึกการตั้งค่าแล้ว — ตารางเวรที่สร้างใหม่จะใช้ค่านี้');
    };
  }

  /* ---------- หน้าแจ้งเตือน (ทุกบทบาท) + กระดิ่งบนหัวเว็บ ---------- */
  function viewNotifications() {
    const u = S.currentUser(); if (!u) { location.hash = '#/login'; return; }
    U.app.innerHTML = `<section class="section" style="padding-top:28px"><div class="container" style="max-width:760px"><h2>การแจ้งเตือน</h2><div class="card">${notifList(S.notifications(u.id))}</div></div></section>`;
    S.readNotifications(u.id); U.renderChrome('/notifications');
  }
  EXT.chromeActions.push((u) => {
    if (!u) return '';
    const n = S.unreadNotifications(u.id);
    const cert = !S.isStaff(u) && u.role !== 'admin' && S.myCerts(u.id).length ? `<a class="btn btn-ghost btn-sm btn-icon" href="#/certificate" title="ใบประกาศของฉัน" aria-label="ใบประกาศของฉัน">${U.icon('award')}</a>` : '';
    return `${cert}<span class="bell-wrap"><button class="btn btn-ghost btn-sm btn-icon" id="bellBtn" aria-label="การแจ้งเตือน" title="การแจ้งเตือน">${U.icon('bell')}${n ? `<span class="dot-count">${n > 99 ? '99+' : n}</span>` : ''}</button><div class="bell-panel" id="bellPanel" hidden></div></span>`;
  });
  EXT.bindChrome.push(() => {
    const b = U.$('#bellBtn'), p = U.$('#bellPanel'); if (!b) return;
    b.onclick = (e) => {
      e.stopPropagation();
      const u = S.currentUser();
      if (p.hidden) {
        p.innerHTML = `<div class="flex between"><b>การแจ้งเตือน</b><a href="#/notifications" class="small">ดูทั้งหมด</a></div>${notifList(S.notifications(u.id).slice(0, 6))}`;
        p.hidden = false;
        S.readNotifications(u.id);
        U.$('.dot-count', b)?.remove();
      } else p.hidden = true;
    };
    document.addEventListener('click', (e) => { if (!e.target.closest('.bell-wrap')) p.hidden = true; }, { once: true });
  });

  Object.assign(EXT.routes, { work: viewWork, certificate: viewCertificate, verify: viewVerify, notifications: viewNotifications });
  EXT.adminTabs.push(
    { id: 'roster', label: 'ตารางเวร', icon: 'calendar', view: adminRoster },
    { id: 'jobs', label: 'งานเพิ่มเติม', icon: 'megaphone', view: adminJobs },
    { id: 'attendance', label: 'ลงเวลาทำงาน', icon: 'clock', view: adminAttendance },
    { id: 'certificates', label: 'สิ้นสุดการทำงาน / ใบประกาศ', icon: 'award', view: adminCerts },
    { id: 'outbox', label: 'อีเมลแจ้งเตือน', icon: 'send', view: adminOutbox },
    { id: 'worksettings', label: 'ตั้งค่างาน', icon: 'settings', view: adminWorkSettings }
  );
})();
