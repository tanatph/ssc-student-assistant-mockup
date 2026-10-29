/* ระบบรับสมัครนิสิตช่วยงาน ศูนย์กีฬาสิรินธร — หน้าเว็บทั้งหมด (SPA แบบ hash routing) */
(function () {
  const EXT = window.EXT;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const app = $('#app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const posById = (id) => POSITIONS.find(p => p.id === id);

  /* ---------- icons ---------- */
  const ICONS = {
    desk: '<path d="M3 11h18M5 11v9M19 11v9M9 7h6v4H9z"/><circle cx="12" cy="4.5" r="1.5"/>',
    dumbbell: '<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/>',
    ring: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkc: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.01"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    facebook: '<path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
    x_logo: '<path d="M4 4l16 16M20 4 4 20"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    line: '<path d="M21 11c0-4.4-4-8-9-8s-9 3.6-9 8c0 4 3.2 7.2 7.5 7.9L10 22l4-3.2c4-1 7-4 7-7.8z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M15 4h4v16h-4M10 17l-5-5 5-5M5 12h11"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    megaphone: '<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pin: '<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.6A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01"/>',
    shuttle: '<path d="M12 21a2.5 2.5 0 0 1-2.5-2.5V16h5v2.5A2.5 2.5 0 0 1 12 21z"/><path d="M9.5 16 6 4M14.5 16 18 4M12 16V3M7.8 9.5h8.4"/>',
    tennis: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8"/>',
    swim: '<circle cx="16" cy="6" r="2"/><path d="m6 13 4-4 3 2 3-3M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'
  };
  const icon = (n, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const chev = (rev) => `<span class="chev${rev ? ' rev' : ''}" aria-hidden="true"><i></i><i></i><i></i></span>`;

  /* ---------- utils ---------- */
  const fmtDate = (v, o = { day: 'numeric', month: 'long', year: 'numeric' }) => {
    if (!v) return '-';
    const d = typeof v === 'string' && v.length === 10 ? new Date(v + 'T12:00:00+07:00') : new Date(v);
    return d.toLocaleDateString('th-TH', Object.assign({ timeZone: 'Asia/Bangkok' }, o));
  };
  const fmtDateTime = (v) => v ? new Date(v).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
  const dayKey = (ts) => new Date(ts + 7 * 36e5).toISOString().slice(0, 10);
  const badge = (status) => { const s = STATUS[status] || STATUS.draft; return `<span class="badge tone-${s.tone}">${icon(s.icon)}${s.label}</span>`; };
  const maskId = (id) => id ? id.slice(0, 4) + '••••' + id.slice(-3) : '';
  const docsDone = (a) => DOC_TYPES.filter(d => d.required && (a.docs[d.id] || []).length).length;
  const docsReq = DOC_TYPES.filter(d => d.required).length;
  const displayName = (a, u) => a?.profile.fullName || u?.email || '';

  function toast(msg, err) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : '');
    t.innerHTML = icon(err ? 'alert' : 'checkc') + `<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function modal(html) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) back.remove(); });
    document.body.appendChild(back);
    return back;
  }

  /* แหล่งไฟล์: dataURL (โหมดสาธิต/เพิ่งอัปโหลด) หรือ "drive:<id>" (ระบบจริง) → โหลดผ่าน API ตามสิทธิ์ */
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const fsrc = (v) => v && String(v).startsWith('drive:') ? `src="${BLANK}" data-ref="${esc(v)}"` : `src="${esc(v || '')}"`;
  const hydrate = (root) => $$('[data-ref]', root).forEach(el => {
    const ref = el.dataset.ref; el.removeAttribute('data-ref'); el.classList.add('loading-file');
    Store.fileUrl(ref).then(url => { el.src = url; el.classList.remove('loading-file'); }).catch(() => el.classList.replace('loading-file', 'file-error'));
  });
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && hydrate(n.parentNode || n)))).observe(document.body, { childList: true, subtree: true });

  function previewFile(f) {
    const body = f.data
      ? (f.type.startsWith('image/') ? `<img ${fsrc(f.data)} alt="${esc(f.name)}">` : `<iframe ${fsrc(f.data)} style="width:100%;height:70vh;border:0;border-radius:10px"></iframe>`)
      : `<div class="empty">${icon('file')}<p>ไฟล์ตัวอย่าง (ข้อมูลสาธิต) — ไม่มีภาพตัวอย่าง</p></div>`;
    modal(`<div class="flex between mb-2"><b>${esc(f.name)}</b><button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="ปิด">${icon('x')}</button></div>${body}`);
  }

  /* tooltip สำหรับกราฟ */
  const tip = $('#tip');
  document.addEventListener('pointermove', e => {
    const t = e.target.closest?.('[data-tip]');
    if (!t) { tip.classList.remove('show'); return; }
    tip.textContent = t.dataset.tip;
    const w = tip.offsetWidth;
    tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, e.clientX - w / 2)) + 'px';
    tip.style.top = (e.clientY - 40) + 'px';
    tip.classList.add('show');
  });

  /* ---------- layout chrome ---------- */
  function renderChrome(path) {
    const u = Store.currentUser();
    const links = [['#/', 'หน้าแรก', '/'], ['#/positions', 'ตำแหน่งที่เปิดรับ', '/positions'], ['#/rules', 'ระเบียบ', '/rules'], ['#/results', 'ประกาศผล', '/results']];
    $('#navLinks').innerHTML = links.map(([h, t, p]) => `<a href="${h}" class="${path === p ? 'active' : ''}">${t}</a>`).join('');
    let actions = '';
    const rooms = Store.chatRooms(u);
    if (rooms.length) {
      const n = rooms.reduce((s, r) => s + Store.unread(u, r.id), 0);
      actions += `<a class="btn btn-ghost btn-sm btn-icon chat-link ${path === '/chat' ? 'active' : ''}" href="#/chat" aria-label="ห้องแชท" title="ห้องแชท">${icon('chat')}${n ? `<span class="dot-count">${n > 99 ? '99+' : n}</span>` : ''}</a>`;
    }
    actions += EXT.chromeActions.map(f => f(u, path)).join('');
    const logout = `<a class="av-btn" href="#/profile" title="โปรไฟล์ของฉัน" aria-label="โปรไฟล์ของฉัน">${u ? avatar(u.id, 34) : ''}</a><button class="btn btn-ghost btn-sm btn-icon" data-logout title="ออกจากระบบ" aria-label="ออกจากระบบ">${icon('logout')}</button>`;
    if (u && u.role === 'admin') actions += `<a class="btn btn-soft btn-sm" href="#/admin">${icon('chart')}<span class="btn-text">แดชบอร์ด</span></a>${logout}`;
    else if (u && Store.isStaff(u)) actions += `<a class="btn btn-soft btn-sm" href="#/work">${icon('calendar')}<span class="btn-text">งานของฉัน</span></a>${logout}`;
    else if (u) actions += `<a class="btn btn-soft btn-sm" href="#/portal">${icon('user')}<span class="btn-text">ใบสมัครของฉัน</span></a>${logout}`;
    else actions = `<a class="btn btn-ghost btn-sm" href="#/login"><span class="btn-text">เข้าสู่ระบบ</span><span class="sr-only">เข้าสู่ระบบ</span>${icon('user')}</a><a class="btn btn-sm" href="#/register">สมัครเลย</a>`;
    actions += `<button class="btn btn-ghost btn-sm btn-icon menu-btn" id="menuBtn" aria-label="เมนู">${icon('menu')}</button>`;
    $('#navActions').innerHTML = actions;
    EXT.bindChrome.forEach(f => f());
    $('#menuBtn').onclick = () => $('#navLinks').classList.toggle('open');
    renderBottomNav(u, path, links, rooms);
  }

  /* แถบนำทางด้านล่างบนมือถือ — เมนูหลักตามบทบาท + "เมนู" เปิดรายการทั้งหมด */
  function renderBottomNav(u, path, links, rooms) {
    const chatN = rooms.reduce((s, r) => s + Store.unread(u, r.id), 0);
    const notiN = u && Store.unreadNotifications ? Store.unreadNotifications(u.id) : 0;
    const hash = location.hash || '#/';
    const tab = (href, label, ic, n, match) => `<a href="${href}" class="${(match || (h => h === href))(hash) ? 'active' : ''}">${icon(ic)}<span>${label}</span>${n ? `<i class="dot-count">${n > 99 ? '99+' : n}</i>` : ''}</a>`;
    const starts = (p) => (h) => h.startsWith(p);
    let items, more;
    if (u && u.role === 'admin') {
      items = [tab('#/admin', 'ภาพรวม', 'chart', 0), tab('#/admin/applicants', 'ผู้สมัคร', 'users', 0, starts('#/admin/applicants')), tab('#/admin/roster', 'ตารางเวร', 'calendar', 0, starts('#/admin/roster')), tab('#/chat', 'แชท', 'chat', chatN, starts('#/chat'))];
      more = [['#/admin/jobs', 'งานเพิ่มเติม', 'megaphone'], ['#/admin/attendance', 'ลงเวลาทำงาน', 'clock'], ['#/admin/certificates', 'สิ้นสุดการทำงาน / ใบประกาศ', 'award'], ['#/admin/outbox', 'อีเมลแจ้งเตือน', 'send'], ['#/admin/news', 'ประกาศ / ผล', 'megaphone'], ['#/admin/officers', 'เจ้าหน้าที่', 'shield'], ['#/admin/worksettings', 'ตั้งค่างาน', 'settings'], ['#/admin/settings', 'ตั้งค่ารับสมัคร', 'settings'], ['#/notifications', 'การแจ้งเตือน', 'bell'], ['#/profile', 'โปรไฟล์ของฉัน', 'user'], ['#/admin/manual', 'คู่มือการใช้งาน', 'file']];
    } else if (u && Store.isStaff(u)) {
      items = [tab('#/work', 'วันนี้', 'clock', 0), tab('#/work/roster', 'ตารางเวร', 'calendar', 0, starts('#/work/roster')), tab('#/work/jobs', 'งานเพิ่ม', 'megaphone', 0, starts('#/work/jobs')), tab('#/chat', 'แชท', 'chat', chatN, starts('#/chat'))];
      more = [['#/work/history', 'ประวัติลงเวลา', 'file'], ['#/work/notifications', 'การแจ้งเตือน', 'bell'], ['#/work/exit', 'แจ้งสิ้นสุดการทำงาน', 'logout'], ['#/portal', 'ใบสมัครของฉัน', 'user'], ['#/profile', 'โปรไฟล์ของฉัน', 'user'], ['#/manual', 'คู่มือการใช้งาน', 'file']];
    } else if (u) {
      items = [tab('#/', 'หน้าแรก', 'home', 0), tab('#/portal', 'ใบสมัคร', 'user', 0, starts('#/portal')), rooms.length ? tab('#/chat', 'แชท', 'chat', chatN, starts('#/chat')) : tab('#/results', 'ประกาศผล', 'award', 0), tab('#/notifications', 'แจ้งเตือน', 'bell', notiN)];
      more = (Store.myCerts && Store.myCerts(u.id).length ? [['#/certificate', 'ใบประกาศของฉัน', 'award']] : []).concat([['#/profile', 'โปรไฟล์ของฉัน', 'user'], ['#/manual', 'คู่มือการใช้งาน', 'file']]);
    } else {
      items = [tab('#/', 'หน้าแรก', 'home', 0), tab('#/positions', 'ตำแหน่ง', 'users', 0, starts('#/positions')), tab('#/results', 'ประกาศผล', 'award', 0), tab('#/register', 'สมัคร', 'edit', 0)];
      more = [['#/login', 'เข้าสู่ระบบ', 'user']];
    }
    const pub = links.map(([h, t]) => [h, t, h === '#/' ? 'home' : h === '#/positions' ? 'users' : h === '#/rules' ? 'file' : 'award']).concat([['#/verify', 'ตรวจสอบใบประกาศ', 'shield']]);
    const nav = $('#bottomNav');
    nav.innerHTML = items.join('') + `<button type="button" id="moreBtn">${icon('menu')}<span>เมนู</span>${u && u.role === 'admin' && notiN ? `<i class="dot-count">${notiN}</i>` : ''}</button>`;
    const sheet = $('#moreSheet');
    const row = ([h, t, ic]) => `<a href="${h}">${icon(ic)}<span>${t}</span></a>`;
    sheet.innerHTML = `<div class="sheet-card" role="dialog" aria-label="เมนู">
      <div class="sheet-grip"></div>
      ${u ? `<a class="sheet-user" href="#/profile">${avatar(u.id, 46)}<div><b>${esc(Store.chatName(u.id))}${u.role === 'admin' ? '' : ' · ' + esc(Store.appOfUser(u.id)?.profile.fullName || '')}</b><small>${esc(u.email)} · แก้ไขโปรไฟล์ ›</small></div></a>` : ''}
      ${more.length ? `<div class="sheet-grid">${more.map(row).join('')}</div><div class="sheet-sep">ทั่วไป</div>` : ''}
      <div class="sheet-grid">${pub.map(row).join('')}</div>
      ${u ? `<button type="button" class="btn btn-ghost btn-block mt-2" data-logout>${icon('logout')} ออกจากระบบ</button>` : `<a class="btn btn-block mt-2" href="#/register">ลงทะเบียนสมัคร</a>`}
    </div>`;
    const close = () => sheet.classList.remove('open');
    $('#moreBtn').onclick = () => sheet.classList.toggle('open');
    sheet.onclick = (e) => { if (e.target === sheet || e.target.closest('a')) close(); };
    $$('[data-logout]', sheet).forEach(b => b.onclick = () => { close(); Store.logout(); toast('ออกจากระบบแล้ว'); location.hash = '#/'; });
    $$('[data-logout]').forEach(b => b.onclick = () => { Store.logout(); toast('ออกจากระบบแล้ว'); location.hash = '#/'; });
  }

  $('#socials').innerHTML = SITE.socials.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${icon(s.icon === 'x' ? 'x_logo' : s.icon)}${esc(s.label)}</a>`).join('');

  /* ---------- public: home ---------- */
  function periodPill() {
    const s = Store.settings, open = Store.isOpen();
    return `<div class="pill-date${open ? '' : ' closed'}"><b>${open ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}</b>${fmtDate(s.openDate, { day: 'numeric', month: 'short' })} – ${fmtDate(s.closeDate, { day: 'numeric', month: 'short', year: 'numeric' })}</div>`;
  }
  function applyHref() {
    const u = Store.currentUser();
    return u ? (u.role === 'admin' ? '#/admin' : '#/portal') : '#/register';
  }
  const photo = (src, caption) => `<img src="${src}" alt="${esc(caption)}" loading="lazy" data-ph="${esc(caption)}">`;
  /* ถ้ายังไม่มีไฟล์รูป ให้แสดงกรอบตัวอย่างพร้อมบอกตำแหน่งไฟล์ */
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.dataset.ph) return;
    const ph = document.createElement('div');
    ph.className = 'ph';
    ph.innerHTML = `<div>${icon('image')}${esc(img.dataset.ph)}<br><small>วางรูปที่ ${esc(img.getAttribute('src'))}</small></div>`;
    img.replaceWith(ph);
  }, true);

  function viewHome(scrollTo) {
    const s = Store.settings;
    const news = Store.announcements().slice(0, 3);
    app.innerHTML = `
    <section class="hero">
      <div class="container hero-grid">
        <div>
          ${periodPill()}
          <h1>รับสมัคร<span class="red">นิสิตช่วยงาน</span></h1>
          <p class="hero-lead">ร่วมเป็นส่วนหนึ่งของทีม <b>ศูนย์กีฬาสิรินธร</b> คณะพลศึกษา มศว องครักษ์ ปีการศึกษา ${esc(s.academicYear)} — ฝึกทักษะงานบริการ ความรับผิดชอบ และได้รับค่าตอบแทนระหว่างเรียน</p>
          <div class="hero-cta">
            <a class="btn" href="${applyHref()}">${Store.currentUser() ? 'ไปที่ใบสมัครของฉัน' : 'ลงทะเบียนสมัคร'} ${icon('arrow')}</a>
            <a class="btn btn-ghost" href="#/positions">ดูตำแหน่งที่เปิดรับ</a>
          </div>
          <div class="hero-stats">
            <div><b data-count="${POSITIONS.length}">${POSITIONS.length}</b><span>ตำแหน่งที่เปิดรับ</span></div>
            <div><b data-count="3">3</b><span>อาคารให้บริการ</span></div>
            <div><b>16.30 น.</b><span>เริ่มปฏิบัติงาน</span></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-orbit" aria-hidden="true"></div>
          <div class="hero-chev" aria-hidden="true">${chev()}</div>
          <div class="hero-ring">${photo('assets/images/hero.jpg', 'ป้ายศูนย์กีฬาสิรินธร')}</div>
        </div>
      </div>
    </section>

    <section class="section" id="positions">
      <div class="container">
        <div class="section-head">
          <div><div class="eyebrow">${chev()} Positions</div><h2>ตำแหน่งที่เปิดรับสมัคร</h2><div class="accent-line"></div></div>
          <p>เลือกตำแหน่งที่ตรงกับความสามารถ สมัครได้ 1 ตำแหน่งหลัก และเลือกตำแหน่งสำรองได้อีก 1 ตำแหน่ง</p>
        </div>
        <div class="grid grid-4">
          ${POSITIONS.map(p => `
            <a class="card pos-card" href="#/positions/${p.id}">
              <span class="pos-ico">${icon(p.icon)}</span>
              <span class="en">${p.en}</span>
              <h3>${p.th}</h3>
              <p>${p.short}</p>
              <span class="more">รายละเอียดงาน ${icon('arrow')}</span>
            </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <div class="section-head">
          <div><div class="eyebrow">${chev()} How to apply</div><h2>ขั้นตอนการสมัคร</h2><div class="accent-line"></div></div>
          <p>สมัครออนไลน์ทั้งหมด ลงทะเบียนบัญชีก่อน แล้วกลับมาแก้ไขหรืออัปโหลดเอกสารได้ตลอดช่วงรับสมัคร</p>
        </div>
        <div class="steps">
          <div class="step"><b>ลงทะเบียนบัญชี</b><span>ด้วยอีเมล @g.swu.ac.th และรหัสนิสิต</span></div>
          <div class="step"><b>กรอกใบสมัคร</b><span>ข้อมูลส่วนตัว ประสบการณ์ ความสามารถ และตำแหน่ง</span></div>
          <div class="step"><b>อัปโหลดเอกสาร</b><span>บัตรนิสิต บัตรประชาชน สมุดบัญชี SCB</span></div>
          <div class="step"><b>เข้าห้องแชทผู้สมัคร</b><span>รับข่าวนัดสัมภาษณ์ และถาม-ตอบกับพี่ ๆ ในเว็บ</span></div>
          <div class="step"><b>สัมภาษณ์ & ประกาศผล</b><span>สัมภาษณ์ ${fmtDate(s.interviewDate, { day: 'numeric', month: 'short' })} · ประกาศผล ${fmtDate(s.resultDate, { day: 'numeric', month: 'short' })}</span></div>
        </div>
        <div class="grid grid-2 mt-3">
          <div class="card">
            <h3 class="flex">${icon('file')} เอกสารที่ต้องแนบ</h3>
            <ul class="check-list">${DOC_TYPES.map(d => `<li>${icon('check')}<span>${d.label}${d.required ? '' : ' <span class="muted small">(ถ้ามี)</span>'}<br><span class="muted small">${d.hint}</span></span></li>`).join('')}</ul>
          </div>
          <div class="card">
            <h3 class="flex">${icon('calendar')} กำหนดการสำคัญ</h3>
            <ul class="timeline">
              <li class="on"><b>เปิดรับสมัคร</b>${fmtDate(s.openDate)} – ${fmtDate(s.closeDate)}</li>
              <li class="on"><b>ประกาศรายชื่อผู้มีสิทธิ์สัมภาษณ์</b>ทางห้องแชทผู้สมัคร และหน้าประกาศ</li>
              <li class="on"><b>สัมภาษณ์</b>${fmtDate(s.interviewDate)}</li>
              <li class="cur"><b>ประกาศผลการคัดเลือก</b>${fmtDate(s.resultDate)}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div><div class="eyebrow">${chev()} Gallery</div><h2>บรรยากาศการทำงานที่ผ่านมา</h2><div class="accent-line"></div></div>
          <p>ภาพกิจกรรมนิสิตช่วยงานและพื้นที่ให้บริการของศูนย์กีฬาสิรินธรจากปีที่ผ่านมา</p>
        </div>
        <div class="gallery">
          ${GALLERY.map(g => `<figure>${photo(g.src, g.caption)}<figcaption>${g.tag ? `<small>${esc(g.tag)}</small>` : ''}${esc(g.caption)}</figcaption></figure>`).join('')}
        </div>
        <p class="small muted mt-1 mb-0">ภาพ: ศูนย์กีฬาสิรินธร คณะพลศึกษา มศว (sport.swu.ac.th)</p>
      </div>
    </section>

    <section class="section section-alt" id="rules">
      <div class="container">
        <div class="section-head">
          <div><div class="eyebrow">${chev()} Rules</div><h2>ระเบียบกลางนิสิตช่วยงาน</h2><div class="accent-line"></div></div>
          <p>โปรดอ่านก่อนสมัคร ผู้ผ่านการคัดเลือกต้องปฏิบัติตามระเบียบอย่างเคร่งครัด</p>
        </div>
        <div class="grid grid-2">
          <div class="card"><ul class="num-list">${RULES.general.map(r => `<li><span>${r}</span></li>`).join('')}</ul></div>
          <div>
            <div class="cards-row">
              ${RULES.cards.map(c => `<div class="rule-card rule-${c.level}"><span class="tag">${c.label}</span><div class="small muted">${c.text}</div><ul><li>${c.absent}</li><li>${c.leave}</li><li>${c.late}</li></ul></div>`).join('')}
            </div>
            <div class="notice tone-warn mt-2">${icon('clock')}<span>${RULES.lateFine}</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="news">
      <div class="container">
        <div class="section-head">
          <div><div class="eyebrow">${chev()} Announcements</div><h2>ประกาศและผลการคัดเลือก</h2><div class="accent-line"></div></div>
          <a class="btn btn-ghost" href="#/results">ตรวจสอบผลการคัดเลือก ${icon('arrow')}</a>
        </div>
        <div class="card">${news.map(newsItem).join('') || '<div class="empty">ยังไม่มีประกาศ</div>'}</div>
      </div>
    </section>`;
    if (scrollTo) requestAnimationFrame(() => document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function newsItem(n) {
    return `<div class="news-item">
      <div class="news-date"><b>${fmtDate(n.createdAt, { day: 'numeric' })}</b><span>${fmtDate(n.createdAt, { month: 'short', year: '2-digit' })}</span></div>
      <div>${n.pinned ? `<span class="badge tone-bad mb-0">${icon('pin')}ปักหมุด</span>` : ''}<h4>${esc(n.title)}</h4><p>${esc(n.body)}</p></div>
    </div>`;
  }

  /* ---------- public: position detail ---------- */
  function viewPosition(id) {
    const p = posById(id);
    if (!p) return viewHome('positions');
    const s = Store.settings;
    app.innerHTML = `
    <section class="page-hero">
      <div class="container">
        <div class="breadcrumb"><a href="#/">หน้าแรก</a> / <a href="#/positions">ตำแหน่งที่เปิดรับ</a> / ${p.th}</div>
        <div class="flex" style="gap:18px;align-items:flex-start">
          <span class="pos-ico" style="width:64px;height:64px">${icon(p.icon)}</span>
          <div style="flex:1;min-width:220px">
            <div class="eyebrow">${chev()} ${p.en}</div>
            <h1 style="font-size:clamp(28px,4vw,42px)">ฝ่าย${p.th}</h1>
            <p class="muted mb-0">${p.short}</p>
          </div>
        </div>
      </div>
    </section>
    <section class="section" style="padding-top:32px">
      <div class="container detail-grid">
        <div class="grid">
          <div class="card"><h3 class="flex">${icon('shield')} คุณสมบัติผู้สมัคร</h3><p class="mb-0">${p.qualification}</p></div>
          <div class="card"><h3>01 การบริการ</h3><ol class="num-list">${p.service.map(x => `<li><span>${x}</span></li>`).join('')}</ol></div>
          <div class="card"><h3>02 การดำเนินงาน</h3><ol class="num-list">${p.operation.map(x => `<li><span>${x}</span></li>`).join('')}</ol></div>
          <div class="card"><h3>พื้นที่ปฏิบัติงาน</h3><div class="chips">${p.areas.map(a => `<span class="chip">${a}</span>`).join('')}</div></div>
        </div>
        <aside class="grid">
          <div class="card card-shadow">
            ${periodPill()}
            <h3>สนใจตำแหน่งนี้?</h3>
            <p class="muted small">ลงทะเบียนบัญชี แล้วเลือก “${p.th}” เป็นตำแหน่งที่ต้องการสมัคร</p>
            <a class="btn btn-block" href="${applyHref()}">สมัครตำแหน่งนี้ ${icon('arrow')}</a>
            <div class="divider">ประกาศผล ${fmtDate(s.resultDate, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <ul class="check-list small">${DOC_TYPES.filter(d => d.required).map(d => `<li>${icon('check')}<span>${d.label}</span></li>`).join('')}</ul>
          </div>
          <div class="card">
            <b>ตำแหน่งอื่น</b>
            <div class="grid mt-1" style="gap:8px">${POSITIONS.filter(x => x.id !== p.id).map(x => `<a class="flex" href="#/positions/${x.id}" style="color:var(--ink)"><span class="pos-ico" style="width:36px;height:36px;border-radius:10px">${icon(x.icon)}</span>${x.th} <span class="muted small">${x.en}</span></a>`).join('')}</div>
          </div>
        </aside>
      </div>
    </section>`;
  }

  /* ---------- public: results ---------- */
  function viewResults() {
    const s = Store.settings;
    const passed = Store.apps().filter(a => a.status === 'passed' || a.status === 'resigned');
    const groups = POSITIONS.map(p => ({ p, list: passed.filter(a => (a.resultPosition || a.profile.position1) === p.id).sort((a, b) => a.profile.studentId.localeCompare(b.profile.studentId)) }));
    app.innerHTML = `
    <section class="page-hero">
      <div class="container">
        <div class="eyebrow">${chev()} Results</div>
        <h1 style="font-size:clamp(28px,4vw,42px)">ประกาศผลการคัดเลือกนิสิตช่วยงาน</h1>
        <p class="muted">ปีการศึกษา ${esc(s.academicYear)} · ศูนย์กีฬาสิรินธร คณะพลศึกษา มศว</p>
        ${s.resultsPublished ? `
        <form class="lookup mt-2" id="lookup">
          <input class="input" name="q" inputmode="numeric" placeholder="กรอกรหัสนิสิต 11 หลัก เพื่อตรวจสอบผล" aria-label="รหัสนิสิต">
          <button class="btn">${icon('search')} ตรวจสอบ</button>
        </form>
        <div id="lookupResult"></div>` : ''}
      </div>
    </section>
    <section class="section" style="padding-top:32px">
      <div class="container">
        ${s.resultsPublished ? groups.map(({ p, list }) => `
          <div class="result-group">
            <h3><span class="pos-ico" style="width:40px;height:40px;border-radius:12px">${icon(p.icon)}</span>ฝ่าย${p.th} <span class="muted small">(${list.length} คน)</span></h3>
            ${list.length ? `<div class="table-wrap"><table class="table">
              <thead><tr><th>ลำดับ</th><th>รหัสนิสิต</th><th>ชื่อ-นามสกุล</th><th>คณะ / สาขาวิชา</th></tr></thead>
              <tbody>${list.map((a, i) => `<tr><td>${i + 1}</td><td>${maskId(a.profile.studentId)}</td><td>${esc(a.profile.fullName)}</td><td>${esc(a.profile.faculty)}<span class="sub">${esc(a.profile.major)}</span></td></tr>`).join('')}</tbody>
            </table></div>` : '<div class="card empty">ยังไม่มีรายชื่อ</div>'}
          </div>`).join('') : `
          <div class="card empty">${icon('clock')}<h3>ยังไม่ประกาศผลการคัดเลือก</h3><p>จะประกาศผลภายในวันที่ ${fmtDate(s.resultDate)}</p></div>`}
        <h2 class="mt-3">ประกาศทั้งหมด</h2>
        <div class="card">${Store.announcements().map(newsItem).join('') || '<div class="empty">ยังไม่มีประกาศ</div>'}</div>
      </div>
    </section>`;
    const f = $('#lookup');
    if (f) f.onsubmit = (e) => {
      e.preventDefault();
      const q = f.q.value.trim();
      const a = Store.apps().find(x => x.profile.studentId === q && x.status !== 'draft');
      const box = $('#lookupResult');
      if (!/^\d{11}$/.test(q)) { box.innerHTML = `<div class="notice tone-warn mt-2">${icon('alert')}กรุณากรอกรหัสนิสิต 11 หลัก</div>`; return; }
      if (!a) box.innerHTML = `<div class="notice tone-neutral mt-2">${icon('search')}ไม่พบใบสมัครของรหัสนิสิตนี้</div>`;
      else if (a.status === 'passed' || a.status === 'resigned') box.innerHTML = `<div class="notice tone-good mt-2">${icon('award')}<span><b>ยินดีด้วย! ${esc(a.profile.fullName)}</b><br>ผ่านการคัดเลือก ฝ่าย${posById(a.resultPosition || a.profile.position1).th} — โปรดติดตามนัดหมายปฐมนิเทศในห้องแชทนิสิตช่วยงาน</span></div>`;
      else box.innerHTML = `<div class="notice tone-neutral mt-2">${icon('file')}<span>สถานะใบสมัคร: ${badge(a.status)}</span></div>`;
    };
  }

  /* ---------- auth ---------- */
  function viewLogin(forAdmin) {
    const demo = Store.apps().find(a => a.status === 'revise');
    const demoUser = demo && Store.userOf(demo);
    app.innerHTML = `
    <div class="auth-wrap">
      <div class="card card-shadow auth-card"><img class="auth-logo" src="assets/images/ssc-logo.png" alt="ศูนย์กีฬาสิรินธร">
        <div class="eyebrow">${chev()} ${forAdmin ? 'Staff' : 'Sign in'}</div>
        <h2>${forAdmin ? 'เข้าสู่ระบบเจ้าหน้าที่' : 'เข้าสู่ระบบผู้สมัคร'}</h2>
        <p class="muted small">${forAdmin ? 'สำหรับเจ้าหน้าที่ศูนย์กีฬาสิรินธรเพื่อจัดการข้อมูลผู้สมัคร' : 'เข้าสู่ระบบเพื่อกรอกใบสมัคร อัปโหลดเอกสาร และติดตามสถานะ'}</p>
        <form id="loginForm" novalidate>
          <div class="field"><label for="email">อีเมล${forAdmin ? '' : ' หรือ รหัสนิสิต'}</label><input class="input" id="email" name="email" autocomplete="username" required></div>
          <div class="field"><label for="password">รหัสผ่าน</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" required></div>
          <button class="btn btn-block">เข้าสู่ระบบ</button>
        </form>
        ${forAdmin ? `<div class="divider">เจ้าหน้าที่ใหม่?</div><a class="btn btn-ghost btn-block" href="#/officer-register">${icon('users')} ลงทะเบียนเจ้าหน้าที่ (@g.swu.ac.th)</a>`
                   : `<div class="divider">ยังไม่มีบัญชี?</div><a class="btn btn-ghost btn-block" href="#/register">ลงทะเบียนสมัครใหม่</a>`}
        ${Store.mode === 'local' ? `<div class="demo-box mt-2"><b>บัญชีทดลอง (mock up)</b><br>
          ${forAdmin ? 'เจ้าหน้าที่: <code>admin@swu.ac.th</code> / <code>admin1234</code>'
                     : `ผู้สมัคร (รอแก้เอกสาร): <code>${esc(demoUser?.email || '')}</code><br>นิสิตช่วยงาน (ธุรการ): <code>${esc(Store.userOf(Store.staffOf('reception')[0] || {})?.email || '')}</code><br>รหัสผ่านทั้งสองบัญชี <code>demo1234</code>`}
        </div>` : ''}
      </div>
    </div>`;
    $('#loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('button', e.target); btn.disabled = true;
      try {
        const u = await Store.login(e.target.email.value, e.target.password.value);
        if (forAdmin && u.role !== 'admin') { Store.logout(); throw new Error('บัญชีนี้ไม่มีสิทธิ์เจ้าหน้าที่'); }
        toast('เข้าสู่ระบบสำเร็จ');
        const dest = u.role === 'admin' ? '#/admin' : Store.isStaff(u) ? '#/work' : '#/portal';
        if (location.hash === dest) route(); else location.hash = dest;
      } catch (err) { toast(err.message, true); btn.disabled = false; }
    };
  }

  function viewRegister() {
    const open = Store.isOpen();
    app.innerHTML = `
    <div class="auth-wrap">
      <div class="card card-shadow auth-card"><img class="auth-logo" src="assets/images/ssc-logo.png" alt="ศูนย์กีฬาสิรินธร">
        <div class="eyebrow">${chev()} Create account</div>
        <h2>ลงทะเบียนสมัครนิสิตช่วยงาน</h2>
        <p class="muted small">สร้างบัญชีเพื่อเข้าไปกรอกใบสมัครและอัปโหลดเอกสาร สามารถกลับมาแก้ไขได้จนกว่าจะกดยืนยันส่งใบสมัคร</p>
        ${open ? `
        <form id="regForm" novalidate>
          <div class="field"><label for="r-email">อีเมลมหาวิทยาลัย <span class="req">*</span></label><input class="input" id="r-email" name="email" type="email" placeholder="xxxxxxxxxxx@g.swu.ac.th" autocomplete="email"><span class="err">กรุณากรอกอีเมลให้ถูกต้อง</span></div>
          <div class="field"><label for="r-sid">รหัสนิสิต <span class="req">*</span></label><input class="input" id="r-sid" name="studentId" inputmode="numeric" maxlength="11" placeholder="11 หลัก"><span class="err">รหัสนิสิตต้องเป็นตัวเลข 11 หลัก</span></div>
          <div class="field"><label for="r-pw">รหัสผ่าน <span class="req">*</span></label><input class="input" id="r-pw" name="password" type="password" autocomplete="new-password"><span class="hint">อย่างน้อย 8 ตัวอักษร</span><span class="err">รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร</span></div>
          <div class="field"><label for="r-pw2">ยืนยันรหัสผ่าน <span class="req">*</span></label><input class="input" id="r-pw2" name="password2" type="password" autocomplete="new-password"><span class="err">รหัสผ่านไม่ตรงกัน</span></div>
          <div class="field"><div class="checks" style="grid-template-columns:1fr"><label><input type="checkbox" name="consent"> <span class="small">ยินยอมให้ศูนย์กีฬาสิรินธรเก็บและใช้ข้อมูลส่วนบุคคลเพื่อการคัดเลือกนิสิตช่วยงาน (PDPA)</span></label></div><span class="err">กรุณายินยอมการใช้ข้อมูลส่วนบุคคล</span></div>
          <button class="btn btn-block">สร้างบัญชีและเริ่มกรอกใบสมัคร</button>
        </form>
        <div class="divider">มีบัญชีแล้ว?</div>
        <a class="btn btn-ghost btn-block" href="#/login">เข้าสู่ระบบ</a>` : `
        <div class="notice tone-neutral">${icon('clock')}<span>ขณะนี้ปิดรับสมัครแล้ว (${fmtDate(Store.settings.openDate)} – ${fmtDate(Store.settings.closeDate)}) ผู้ที่มีบัญชีแล้วยังเข้าสู่ระบบเพื่อดูสถานะได้</span></div>
        <a class="btn btn-ghost btn-block mt-2" href="#/login">เข้าสู่ระบบ</a>`}
      </div>
    </div>`;
    const f = $('#regForm');
    if (!f) return;
    f.onsubmit = (e) => {
      e.preventDefault();
      const v = { email: f.email.value.trim(), studentId: f.studentId.value.trim(), password: f.password.value };
      const checks = [
        [f.email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)],
        [f.studentId, /^\d{11}$/.test(v.studentId)],
        [f.password, v.password.length >= 8],
        [f.password2, f.password2.value === v.password && v.password.length > 0],
        [f.consent, f.consent.checked]
      ];
      let ok = true;
      checks.forEach(([el, good]) => { el.closest('.field').classList.toggle('invalid', !good); if (!good) ok = false; });
      if (!ok) return;
      const btn = $('button', f); btn.disabled = true;
      Store.register(v).then(() => { toast('สร้างบัญชีสำเร็จ — เริ่มกรอกใบสมัครได้เลย'); location.hash = '#/portal'; })
        .catch(err => { toast(err.message, true); btn.disabled = false; });
    };
  }

  /* ---------- applicant portal ---------- */
  const STEPS = [
    { id: 'info', t: 'ข้อมูลผู้สมัคร', d: 'ประวัติ ความสามารถ ตำแหน่ง' },
    { id: 'docs', t: 'อัปโหลดเอกสาร', d: 'บัตรนิสิต บัตรประชาชน SCB' },
    { id: 'review', t: 'ตรวจสอบและส่ง', d: 'ยืนยันและเข้าห้องแชท' }
  ];

  function profileErrors(p) {
    const e = {};
    if (!p.fullName.trim()) e.fullName = 1;
    if (!p.gender) e.gender = 1;
    if (!/^\d{11}$/.test(p.studentId)) e.studentId = 1;
    if (!p.year) e.year = 1;
    if (!p.faculty.trim()) e.faculty = 1;
    if (!p.major.trim()) e.major = 1;
    if (!p.lineId.trim()) e.lineId = 1;
    if (!/^0\d{8,9}$/.test(p.phone.replace(/[-\s]/g, ''))) e.phone = 1;
    if (!p.experience.trim()) e.experience = 1;
    if (!p.skills.length && !p.skillsOther.trim()) e.skills = 1;
    if (!p.position1) e.position1 = 1;
    return e;
  }

  function viewPortal(step) {
    const u = Store.currentUser();
    if (!u) { location.hash = '#/login'; return; }
    if (u.role === 'admin') { location.hash = '#/admin'; return; }
    const a = Store.myApp();
    const editable = a.status === 'draft' || a.status === 'revise';
    if (!editable) return portalStatus(a, u);
    step = STEPS.some(s => s.id === step) ? step : 'info';
    const infoOk = !Object.keys(profileErrors(a.profile)).length;
    const docsOk = docsDone(a) === docsReq;
    const done = { info: infoOk, docs: docsOk, review: false };
    app.innerHTML = `
    <section class="section" style="padding-top:32px">
      <div class="container">
        <div class="portal-head">
          <div><div class="eyebrow">${chev()} My application</div><h2 class="mb-0">ใบสมัครนิสิตช่วยงาน</h2><span class="muted small">${esc(u.email)} · บันทึกอัตโนมัติ · <a href="#/manual">คู่มือการใช้งาน</a></span></div>
          ${badge(a.status)}
        </div>
        ${a.status === 'revise' ? `<div class="notice tone-warn mt-2">${icon('alert')}<span><b>เจ้าหน้าที่ขอให้แก้ไข/เพิ่มเติม:</b> ${esc(a.adminNote || '-')}<br><span class="small">แก้ไขแล้วกด “ยืนยันส่งใบสมัคร” อีกครั้ง</span></span></div>` : ''}
        <div class="stepper" role="tablist">
          ${STEPS.map((s, i) => `<button role="tab" data-step="${s.id}" class="${s.id === step ? 'active' : ''} ${done[s.id] && s.id !== step ? 'done' : ''}"><span class="n">${done[s.id] && s.id !== step ? icon('check') : i + 1}</span><span class="t"><b>${s.t}</b><small>${s.d}</small></span></button>`).join('')}
        </div>
        <div class="card" id="stepBody"></div>
      </div>
    </section>`;
    $$('.stepper button').forEach(b => b.onclick = () => go(b.dataset.step));
    const body = $('#stepBody');
    if (step === 'info') stepInfo(body, a);
    else if (step === 'docs') stepDocs(body, a);
    else stepReview(body, a);
  }
  const go = (step) => { location.hash = '#/portal/' + step; };

  function stepInfo(body, a) {
    const p = a.profile;
    const f = (name, label, input, opt = {}) => `<div class="field ${opt.full ? 'full' : ''}" data-f="${name}"><label for="f-${name}">${label}${opt.optional ? ' <span class="muted small">(ถ้ามี)</span>' : ' <span class="req">*</span>'}</label>${input}${opt.hint ? `<span class="hint">${opt.hint}</span>` : ''}<span class="err">${opt.err || 'กรุณากรอกข้อมูล'}</span></div>`;
    const txt = (name, extra = '') => `<input class="input" id="f-${name}" name="${name}" value="${esc(p[name])}" ${extra}>`;
    body.innerHTML = `
    <form id="appForm" novalidate>
      <div class="form-section">
        <h3><span class="num">1</span>ข้อมูลส่วนตัว</h3>
        <div class="form-grid">
          ${f('fullName', 'ชื่อ-นามสกุล', txt('fullName', 'placeholder="เช่น นายสมชาย ใจดี" autocomplete="name"'), { full: true, hint: 'ระบุคำนำหน้าชื่อ' })}
          ${f('gender', 'เพศ', `<div class="seg">${['ชาย', 'หญิง', 'ไม่ประสงค์ระบุ'].map(g => `<label><input type="radio" name="gender" value="${g}" ${p.gender === g ? 'checked' : ''}>${g}</label>`).join('')}</div>`, { err: 'กรุณาเลือกเพศ' })}
          ${f('studentId', 'รหัสนิสิต', txt('studentId', 'inputmode="numeric" maxlength="11"'), { err: 'รหัสนิสิตต้องเป็นตัวเลข 11 หลัก' })}
          ${f('year', 'ชั้นปีที่', `<select class="input" id="f-year" name="year"><option value="">เลือกชั้นปี</option>${[1, 2, 3, 4, 5, 6].map(y => `<option value="${y}" ${p.year == y ? 'selected' : ''}>ชั้นปีที่ ${y}</option>`).join('')}</select>`, { err: 'กรุณาเลือกชั้นปี' })}
          ${f('faculty', 'คณะ', txt('faculty', 'list="facultyList" placeholder="พิมพ์หรือเลือกคณะ"') + `<datalist id="facultyList">${FACULTIES.map(x => `<option value="${x}">`).join('')}</datalist>`)}
          ${f('major', 'สาขาวิชา', txt('major'))}
        </div>
      </div>
      <div class="form-section">
        <h3><span class="num">2</span>ช่องทางติดต่อ</h3>
        <div class="form-grid">
          ${f('lineId', 'Line ID', txt('lineId', 'autocapitalize="off"'))}
          ${f('phone', 'เบอร์โทรศัพท์', txt('phone', 'inputmode="tel" placeholder="08x-xxx-xxxx" autocomplete="tel"'), { err: 'กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก' })}
        </div>
      </div>
      <div class="form-section">
        <h3><span class="num">3</span>ประสบการณ์และความสามารถ</h3>
        ${f('experience', 'ประสบการณ์ทำงาน', `<textarea class="input" id="f-experience" name="experience" placeholder="เช่น เคยเป็นนิสิตช่วยงานศูนย์กีฬาสิรินธร ปี 2568 / งานพาร์ทไทม์ / งานกิจกรรมคณะ">${esc(p.experience)}</textarea>`, { hint: 'หากไม่มี ให้ระบุว่า “ไม่มี”' })}
        ${f('skills', 'ลักษณะงานที่สามารถปฏิบัติได้ (ความสามารถพิเศษ)', `<div class="checks">${SKILLS.map(s => `<label><input type="checkbox" name="skills" value="${s}" ${p.skills.includes(s) ? 'checked' : ''}>${s}</label>`).join('')}</div><input class="input mt-1" name="skillsOther" value="${esc(p.skillsOther)}" placeholder="ความสามารถอื่น ๆ (ระบุ)">`, { err: 'กรุณาเลือกอย่างน้อย 1 ข้อ' })}
        ${f('certText', 'เกียรติบัตร หรือใบประกาศจากการอบรมที่เกี่ยวข้อง', `<textarea class="input" id="f-certText" name="certText" placeholder="เช่น ใบผ่านการอบรม Life Guard, CPR & AED, ใบรับรองผู้ฝึกสอนออกกำลังกาย">${esc(p.certText)}</textarea>`, { optional: true, hint: 'แนบไฟล์เกียรติบัตรได้ในขั้นตอนอัปโหลดเอกสาร' })}
      </div>
      <div class="form-section">
        <h3><span class="num">4</span>ตำแหน่งที่ต้องการสมัคร</h3>
        ${f('position1', 'ตำแหน่งหลัก', `<div class="pos-pick">${POSITIONS.map(x => `<label><input type="radio" name="position1" value="${x.id}" ${p.position1 === x.id ? 'checked' : ''}><span class="pos-ico">${icon(x.icon)}</span><span><b>${x.th}</b><small>${x.en}</small></span></label>`).join('')}</div>`, { err: 'กรุณาเลือกตำแหน่ง' })}
        <div class="field" style="max-width:420px"><label for="f-position2">ตำแหน่งสำรอง <span class="muted small">(ถ้ามี)</span></label>
          <select class="input" id="f-position2" name="position2"><option value="">ไม่เลือก</option>${POSITIONS.map(x => `<option value="${x.id}" ${p.position2 === x.id ? 'selected' : ''}>${x.th} (${x.en})</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-actions">
        <span class="muted small flex">${icon('checkc')} ข้อมูลถูกบันทึกอัตโนมัติ</span>
        <div class="right"><button class="btn">ถัดไป: อัปโหลดเอกสาร ${icon('arrow')}</button></div>
      </div>
    </form>`;
    const form = $('#appForm');
    const collect = () => {
      const fd = new FormData(form);
      const prof = Object.assign({}, a.profile, {
        fullName: fd.get('fullName') || '', gender: fd.get('gender') || '', studentId: (fd.get('studentId') || '').trim(),
        year: fd.get('year') || '', faculty: fd.get('faculty') || '', major: fd.get('major') || '',
        lineId: fd.get('lineId') || '', phone: fd.get('phone') || '', experience: fd.get('experience') || '',
        skills: fd.getAll('skills'), skillsOther: fd.get('skillsOther') || '', certText: fd.get('certText') || '',
        position1: fd.get('position1') || '', position2: fd.get('position2') || ''
      });
      if (prof.position2 === prof.position1) prof.position2 = '';
      return prof;
    };
    form.addEventListener('change', () => { Store.updateApp(a.id, { profile: collect() }); });
    form.onsubmit = (e) => {
      e.preventDefault();
      const prof = collect();
      Store.updateApp(a.id, { profile: prof });
      const errs = profileErrors(prof);
      $$('[data-f]', form).forEach(el => el.classList.toggle('invalid', !!errs[el.dataset.f]));
      if (Object.keys(errs).length) {
        toast('กรุณากรอกข้อมูลให้ครบถ้วน', true);
        $('.invalid', form)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      go('docs');
    };
  }

  /* อ่านไฟล์ — รูปภาพย่อขนาดเพื่อให้เก็บในเบราว์เซอร์ได้ (โหมดสาธิต) */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) return reject(new Error('ไฟล์ใหญ่เกิน 10 MB'));
      if (!/^image\/|application\/pdf/.test(file.type)) return reject(new Error('รองรับเฉพาะไฟล์รูปภาพหรือ PDF'));
      const meta = { name: file.name, type: file.type, size: file.size, uploadedAt: Date.now(), data: null };
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
      if (file.type.startsWith('image/')) {
        fr.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 1200, r = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            meta.data = c.toDataURL('image/jpeg', 0.78);
            resolve(meta);
          };
          img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
          img.src = fr.result;
        };
      } else {
        fr.onload = () => { if (file.size <= 1.5 * 1024 * 1024) meta.data = fr.result; resolve(meta); };
      }
      fr.readAsDataURL(file);
    });
  }

  const fileRow = (f, i, removable) => `
    <div class="file">
      ${f.data && f.type.startsWith('image/') ? `<img class="thumb" ${fsrc(f.data)} alt="">` : `<span class="thumb">${f.type.includes('pdf') ? 'PDF' : icon('file')}</span>`}
      <span class="name">${esc(f.name)}<small>${(f.size / 1024).toFixed(0)} KB · ${fmtDateTime(f.uploadedAt)}</small></span>
      <button type="button" class="btn btn-ghost btn-sm btn-icon" data-view="${i}" aria-label="ดูไฟล์">${icon('eye')}</button>
      ${removable ? `<button type="button" class="btn btn-ghost btn-sm btn-icon" data-del="${i}" aria-label="ลบไฟล์">${icon('trash')}</button>` : ''}
    </div>`;

  function stepDocs(body, a) {
    body.innerHTML = `
      <div class="form-section">
        <h3><span class="num">5</span>เอกสารหลักฐาน</h3>
        <p class="muted small">รองรับไฟล์ JPG, PNG หรือ PDF ขนาดไม่เกิน 10 MB · ลากไฟล์มาวางในกรอบ หรือกดปุ่ม “เลือกไฟล์”</p>
        <div class="grid grid-2">
          ${DOC_TYPES.map(d => {
            const files = a.docs[d.id] || [];
            return `<div class="upload ${files.length ? 'ok' : ''}" data-doc="${d.id}">
              <div class="upload-head">
                <span class="pos-ico">${icon(files.length ? 'checkc' : 'file')}</span>
                <div class="info"><b>${d.label}${d.required ? ' <span style="color:var(--red)">*</span>' : ''}</b><span class="muted small">${d.hint}</span></div>
              </div>
              <div class="files">${files.map((f, i) => fileRow(f, i, true)).join('')}</div>
              <label class="btn btn-soft btn-sm mt-1">${icon('upload')} ${files.length && !d.multiple ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
                <input type="file" accept="image/*,application/pdf" ${d.multiple ? 'multiple' : ''} hidden>
              </label>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" data-go="info">${icon('back')} ย้อนกลับ</button>
        <div class="right"><button class="btn" data-go="review">ถัดไป: ตรวจสอบและส่ง ${icon('arrow')}</button></div>
      </div>`;
    $$('[data-go]', body).forEach(b => b.onclick = () => go(b.dataset.go));
    $$('.upload', body).forEach(box => {
      const id = box.dataset.doc, def = DOC_TYPES.find(d => d.id === id);
      const add = async (list) => {
        try {
          const read = await Promise.all(Array.from(list).map(readFile));
          const docs = Object.assign({}, a.docs, { [id]: def.multiple ? (a.docs[id] || []).concat(read) : read.slice(0, 1) });
          Store.updateApp(a.id, { docs });
          toast('อัปโหลด “' + def.label + '” แล้ว');
          viewPortal('docs');
        } catch (err) { toast(err.message, true); }
      };
      $('input[type=file]', box).onchange = (e) => e.target.files.length && add(e.target.files);
      box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('drag'); });
      box.addEventListener('dragleave', () => box.classList.remove('drag'));
      box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('drag'); e.dataTransfer.files.length && add(e.dataTransfer.files); });
      box.addEventListener('click', e => {
        const v = e.target.closest('[data-view]'), d = e.target.closest('[data-del]');
        if (v) previewFile(a.docs[id][+v.dataset.view]);
        if (d) {
          const docs = Object.assign({}, a.docs, { [id]: a.docs[id].filter((_, i) => i !== +d.dataset.del) });
          Store.updateApp(a.id, { docs }); viewPortal('docs');
        }
      });
    });
  }

  function reviewTable(p) {
    const pos2 = posById(p.position2);
    const rows = [
      ['ชื่อ-นามสกุล', p.fullName], ['เพศ', p.gender], ['รหัสนิสิต', p.studentId], ['ชั้นปีที่', p.year],
      ['คณะ', p.faculty], ['สาขาวิชา', p.major], ['Line ID', p.lineId], ['เบอร์โทรศัพท์', p.phone],
      ['ประสบการณ์ทำงาน', p.experience], ['ความสามารถพิเศษ', p.skills.concat(p.skillsOther ? [p.skillsOther] : []).join(', ')],
      ['เกียรติบัตร / ใบประกาศ', p.certText || '-'],
      ['ตำแหน่งที่สมัคร', (posById(p.position1)?.th || '-') + (pos2 ? ` (สำรอง: ${pos2.th})` : '')]
    ];
    return `<table class="review-table">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v || '-')}</td></tr>`).join('')}</table>`;
  }

  /* การ์ดห้องแชท — ก่อนส่งใบสมัครแสดงเป็นข้อมูล หลังส่งแสดงห้องที่เข้าได้พร้อมจำนวนข้อความใหม่ */
  function chatCard() {
    const u = Store.currentUser();
    const rooms = Store.chatRooms(u);
    if (!rooms.length) return `<div class="openchat">
      <span class="ico">${icon('chat')}</span>
      <div class="info"><b>ห้องแชทผู้สมัคร</b><br><span class="small muted">เมื่อกดยืนยันส่งใบสมัคร คุณจะเข้าห้องแชทผู้สมัครอัตโนมัติ เพื่อรับประกาศวันเวลาสัมภาษณ์ และสอบถามพี่ ๆ แอดมินได้โดยตรง</span></div>
    </div>`;
    return rooms.map(r => { const n = Store.unread(u, r.id); return `<a class="openchat" href="#/chat/${r.id}">
      <span class="ico">${icon(r.icon)}</span>
      <div class="info"><b>${r.name}</b>${n ? ` <span class="dot-count static">${n} ข้อความใหม่</span>` : ''}<br><span class="small muted">${r.desc}</span></div>
      <span class="btn btn-sm">เข้าห้องแชท ${icon('arrow')}</span>
    </a>`; }).join('');
  }

  function stepReview(body, a) {
    const errs = profileErrors(a.profile);
    const missingDocs = DOC_TYPES.filter(d => d.required && !(a.docs[d.id] || []).length);
    body.innerHTML = `
      <div class="form-section">
        <h3><span class="num">6</span>ตรวจสอบข้อมูล</h3>
        ${Object.keys(errs).length ? `<div class="notice tone-warn mb-2">${icon('alert')}<span>ข้อมูลผู้สมัครยังไม่ครบ <a href="#/portal/info">กลับไปแก้ไข</a></span></div>` : ''}
        ${missingDocs.length ? `<div class="notice tone-warn mb-2">${icon('alert')}<span>ยังไม่ได้แนบ: ${missingDocs.map(d => d.label).join(', ')} <a href="#/portal/docs">อัปโหลดเอกสาร</a></span></div>` : ''}
        <div class="grid grid-2">
          <div>${reviewTable(a.profile)}</div>
          <div>
            <b>เอกสารแนบ</b>
            <div class="files">${DOC_TYPES.map(d => { const n = (a.docs[d.id] || []).length; return `<div class="file"><span class="thumb" style="background:${n ? 'var(--green-50)' : 'var(--bg)'};color:${n ? 'var(--green)' : 'var(--muted)'}">${icon(n ? 'check' : 'file')}</span><span class="name">${d.label}<small>${n ? n + ' ไฟล์' : d.required ? 'ยังไม่ได้แนบ' : 'ไม่ได้แนบ'}</small></span></div>`; }).join('')}</div>
          </div>
        </div>
      </div>
      <div class="form-section">
        <h3><span class="num">7</span>ห้องแชทผู้สมัคร</h3>
        ${chatCard()}
      </div>
      <div class="checks mb-2" style="grid-template-columns:1fr"><label><input type="checkbox" id="certify"> ข้าพเจ้าขอรับรองว่าข้อมูลและเอกสารทั้งหมดเป็นความจริง และได้อ่านระเบียบกลางนิสิตช่วยงานแล้ว</label></div>
      <div class="form-actions">
        <button class="btn btn-ghost" data-go="docs">${icon('back')} ย้อนกลับ</button>
        <div class="right"><button class="btn" id="submitBtn">${icon('send')} ยืนยันส่งใบสมัคร</button></div>
      </div>`;
    $$('[data-go]', body).forEach(b => b.onclick = () => go(b.dataset.go));
    $('#submitBtn').onclick = () => {
      if (!Store.isOpen()) return toast('ขณะนี้ปิดรับสมัครแล้ว', true);
      if (Object.keys(errs).length || missingDocs.length) return toast('กรุณากรอกข้อมูลและแนบเอกสารให้ครบ', true);
      if (!$('#certify').checked) return toast('กรุณาติ๊กรับรองความถูกต้องของข้อมูล', true);
      try { Store.submitApplication(a.id); } catch (err) { return toast(err.message, true); }
      toast('ส่งใบสมัครเรียบร้อยแล้ว — เข้าห้องแชทผู้สมัครได้เลย');
      renderChrome('/portal');
      viewPortal();
    };
  }

  function portalStatus(a, u) {
    const s = Store.settings;
    const st = STATUS[a.status];
    const order = ['submitted', 'verified', 'interview', 'result'];
    const idx = { submitted: 0, verified: 1, interview: 2, passed: 3, failed: 3 }[a.status] ?? 0;
    const pos = posById(a.resultPosition || a.profile.position1);
    const msg = {
      submitted: 'ใบสมัครของคุณอยู่ระหว่างการตรวจสอบเอกสารโดยเจ้าหน้าที่',
      verified: 'เอกสารครบถ้วน โปรดติดตามประกาศรายชื่อผู้มีสิทธิ์สัมภาษณ์',
      interview: `คุณมีสิทธิ์เข้าสัมภาษณ์ วันที่ ${fmtDate(s.interviewDate)} ณ ศูนย์กีฬาสิรินธร`,
      passed: `ยินดีด้วย! คุณผ่านการคัดเลือกเป็นนิสิตช่วยงาน ฝ่าย${pos?.th || ''}`,
      failed: 'ขอขอบคุณที่ให้ความสนใจ ครั้งนี้คุณยังไม่ผ่านการคัดเลือก',
      resigned: 'ขอบคุณที่ร่วมเป็นส่วนหนึ่งของศูนย์กีฬาสิรินธร — <a href="#/certificate">ดูใบประกาศนียบัตรของคุณ</a>'
    }[a.status];
    app.innerHTML = `
    <section class="section" style="padding-top:32px">
      <div class="container">
        <div class="portal-head mb-3">
          <div><div class="eyebrow">${chev()} My application</div><h2 class="mb-0">สวัสดี, ${esc(displayName(a, u))}</h2><span class="muted small">ส่งใบสมัครเมื่อ ${fmtDateTime(a.submittedAt)} · <a href="#/manual">คู่มือการใช้งาน</a></span></div>
        </div>
        <div class="grid grid-2">
          <div class="grid">
            <div class="card card-shadow status-card">
              <span class="big-ico tone-${st.tone}">${icon(st.icon)}</span>
              <div><span class="muted small">สถานะใบสมัคร</span><h3 class="mb-0">${st.label}</h3><p class="mt-1 mb-0">${msg}</p>${a.adminNote ? `<p class="small muted mt-1 mb-0">หมายเหตุจากเจ้าหน้าที่: ${esc(a.adminNote)}</p>` : ''}</div>
            </div>
            <div class="card">
              <h3>ความคืบหน้า</h3>
              <ul class="timeline">
                ${[['ส่งใบสมัคร', fmtDateTime(a.submittedAt)], ['ตรวจสอบเอกสาร', 'เจ้าหน้าที่ตรวจความครบถ้วน'], ['สัมภาษณ์', fmtDate(s.interviewDate)], ['ประกาศผล', fmtDate(s.resultDate)]]
                  .map(([t, d], i) => `<li class="${i < idx ? 'on' : i === idx ? 'cur' : ''}"><b>${t}</b>${d}</li>`).join('')}
              </ul>
              ${a.status === 'passed' || a.status === 'failed' ? `<a class="btn btn-soft btn-sm" href="#/results">ดูประกาศผล ${icon('arrow')}</a>` : ''}
            </div>
            ${chatCard()}
          </div>
          <div class="card">
            <div class="flex between mb-2"><h3 class="mb-0">ข้อมูลใบสมัคร</h3>${badge(a.status)}</div>
            ${reviewTable(a.profile)}
            <b class="mt-2" style="display:block">เอกสารแนบ</b>
            <div class="files" id="myFiles">${DOC_TYPES.flatMap(d => (a.docs[d.id] || []).map((f, i) => ({ f, d, i }))).map(({ f, d, i }) => fileRow(Object.assign({}, f, { name: d.label + ' — ' + f.name }), d.id + ':' + i, false)).join('')}</div>
          </div>
        </div>
      </div>
    </section>`;
    $('#myFiles').onclick = (e) => {
      const v = e.target.closest('[data-view]'); if (!v) return;
      const [d, i] = v.dataset.view.split(':'); previewFile(a.docs[d][+i]);
    };
  }

  /* ---------- admin ---------- */
  function viewAdmin(sub, id) {
    const u = Store.currentUser();
    if (!u || u.role !== 'admin') return viewLogin(true);
    const tabs = [['', 'ภาพรวม', 'chart'], ['applicants', 'ผู้สมัคร', 'users']]
      .concat(EXT.adminTabs.filter(t => !t.hidden).map(t => [t.id, t.label, t.icon]))
      .concat([['news', 'ประกาศ / ผล', 'megaphone'], ['settings', 'ตั้งค่า', 'settings']]);
    const unread = CHAT_ROOMS.reduce((s, r) => s + Store.unread(u, r.id), 0);
    app.innerHTML = `
    <div class="admin">
      <aside class="admin-side"><nav>${tabs.map(([k, t, ic]) => `<a href="#/admin${k ? '/' + k : ''}" class="${(sub || '') === k ? 'active' : ''}">${icon(ic)}${t}</a>`).join('')}
        <a href="#/chat">${icon('chat')}ห้องแชท${unread ? `<span class="dot-count static" style="margin-left:auto">${unread}</span>` : ''}</a></nav></aside>
      <div class="admin-main" id="adminMain"></div>
    </div>`;
    const main = $('#adminMain');
    if (sub === 'applicants' && id) adminApplicant(main, id);
    else if (sub === 'applicants') adminApplicants(main);
    else if (sub === 'news') adminNews(main);
    else if (sub === 'settings') adminSettings(main);
    else if (EXT.adminTabs.some(t => t.id === sub)) EXT.adminTabs.find(t => t.id === sub).view(main, id);
    else adminDashboard(main);
  }

  const hbars = (rows, unit = 'คน') => {
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="hbars">${rows.map(([l, v], i) => `<div class="hbar" style="--i:${i}"><span class="lab" title="${esc(l)}">${esc(l)}</span><span class="track" data-tip="${esc(l)}: ${v} ${unit}"><span class="fill" style="width:${(v / max) * 100}%"></span></span><span class="val">${v}</span></div>`).join('')}</div>`;
  };

  /* ---------- กราฟ (SVG/HTML ล้วน) ---------- */
  const niceMax = (v) => { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= v) || 10 * p; };
  const CHARTS = new Map();
  let chartSeq = 0;
  /* กราฟเส้น: วาดหลังแทรกลงหน้า (ต้องรู้ความกว้างจริง) + เส้นแนวตั้งและ tooltip ตามเมาส์/นิ้ว */
  function lineChart(spec) { const id = 'lc' + (++chartSeq); CHARTS.set(id, spec); return `<div class="lc" id="${id}" style="height:${spec.height || 220}px"></div>${spec.series.length > 1 ? `<div class="lc-legend">${spec.series.map(s => `<span><i style="--c:${s.color}" class="${s.dash ? 'dash' : ''}"></i>${s.name}</span>`).join('')}</div>` : ''}`; }
  function drawCharts(root) {
    $$('.lc', root).forEach(el => {
      const spec = CHARTS.get(el.id); if (!spec) return;
      const draw = () => {
        const W = el.clientWidth, H = el.clientHeight, P = { l: 30, r: spec.series.length > 1 ? 64 : 16, t: 14, b: 26 };
        if (W < 50) return;
        const n = spec.labels.length, max = niceMax(Math.max(1, ...spec.series.flatMap(s => s.values)));
        const x = i => P.l + (n === 1 ? 0 : i * (W - P.l - P.r) / (n - 1)), y = v => H - P.b - v / max * (H - P.t - P.b);
        const ticks = [0, .25, .5, .75, 1].map(f => max * f).filter(v => Number.isInteger(v));
        const xi = n <= 6 ? [...Array(n).keys()] : [0, Math.round((n - 1) / 4), Math.round((n - 1) / 2), Math.round(3 * (n - 1) / 4), n - 1];
        const path = s => s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
        const s0 = spec.series[0];
        el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="${esc(spec.title || '')}">
          <defs><linearGradient id="g-${el.id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s0.color}" stop-opacity=".18"/><stop offset="1" stop-color="${s0.color}" stop-opacity="0"/></linearGradient></defs>
          ${ticks.map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="lc-grid"/><text x="${P.l - 6}" y="${y(v) + 4}" class="lc-ytick">${v}</text>`).join('')}
          ${xi.map(i => `<text x="${x(i)}" y="${H - 6}" class="lc-xtick" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(spec.fmtX(spec.labels[i]))}</text>`).join('')}
          ${(spec.marks || []).map(m => `<line x1="${x(m.i)}" x2="${x(m.i)}" y1="${P.t}" y2="${H - P.b}" class="lc-mark"/><text x="${x(m.i) - 4}" y="${P.t + 10}" class="lc-mark-t" text-anchor="end">${esc(m.label)}</text>`).join('')}
          ${s0.area ? `<path d="${path(s0)}L${x(n - 1)},${H - P.b}L${x(0)},${H - P.b}Z" fill="url(#g-${el.id})" class="lc-area"/>` : ''}
          ${spec.series.map(s => `<path d="${path(s)}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="5 4"' : 'pathLength="1" class="lc-line"'}/>`).join('')}
          ${spec.series.length > 1 ? spec.series.map(s => `<circle cx="${x(n - 1)}" cy="${y(s.values[n - 1])}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/><text x="${x(n - 1) + 8}" y="${y(s.values[n - 1]) + 4}" class="lc-dlabel">${s.short || s.name} ${s.values[n - 1]}</text>`).join('') : `<circle cx="${x(n - 1)}" cy="${y(s0.values[n - 1])}" r="4" fill="${s0.color}" stroke="#fff" stroke-width="2"/>`}
          <g class="lc-hover" style="display:none"><line y1="${P.t}" y2="${H - P.b}" class="lc-cross"/>${spec.series.map(s => `<circle r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join('')}</g>
          <rect x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}" fill="transparent" class="lc-hit"/>
        </svg><div class="lc-tip" hidden></div>`;
        const hover = $('.lc-hover', el), tipEl = $('.lc-tip', el);
        const move = (e) => {
          const r = el.getBoundingClientRect(), px = e.clientX - r.left;
          const i = Math.max(0, Math.min(n - 1, Math.round((px - P.l) / ((W - P.l - P.r) / Math.max(1, n - 1)))));
          hover.style.display = '';
          $('line', hover).setAttribute('x1', x(i)); $('line', hover).setAttribute('x2', x(i));
          $$('circle', hover).forEach((c, k) => { c.setAttribute('cx', x(i)); c.setAttribute('cy', y(spec.series[k].values[i])); });
          tipEl.hidden = false;
          tipEl.innerHTML = `<b>${esc(spec.fmtTip ? spec.fmtTip(spec.labels[i]) : spec.fmtX(spec.labels[i]))}</b>${spec.series.map(s => `<span><i style="background:${s.color}"></i>${s.name}<b>${s.values[i]}</b></span>`).join('')}${spec.extra ? `<small>${esc(spec.extra(i))}</small>` : ''}`;
          tipEl.style.left = Math.min(W - tipEl.offsetWidth - 4, Math.max(4, x(i) + 12 + tipEl.offsetWidth > W ? x(i) - tipEl.offsetWidth - 12 : x(i) + 12)) + 'px';
        };
        const hit = $('.lc-hit', el);
        hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move);
        hit.addEventListener('pointerleave', () => { hover.style.display = 'none'; tipEl.hidden = true; });
      };
      draw();
      if ('ResizeObserver' in window) { let w = el.clientWidth; new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 4) { w = el.clientWidth; draw(); } }).observe(el); }
    });
  }
  /* กรวยการคัดเลือก: ความกว้างตามจำนวน + อัตราผ่านแต่ละขั้น */
  const funnel = (steps) => `<div class="funnel">${steps.map(([l, v, ic], i) => {
    const w = steps[0][1] ? Math.max(8, v / steps[0][1] * 100) : 0;
    const conv = i && steps[i - 1][1] ? Math.round(v / steps[i - 1][1] * 100) : null;
    return `${conv != null ? `<div class="fn-conv">${icon('arrow')}ไปต่อ ${conv}%</div>` : ''}<div class="fn-row" style="--i:${i}" data-tip="${esc(l)}: ${v} คน"><span class="fn-bar" style="width:${w}%"></span><span class="fn-lab">${icon(ic)}${esc(l)}</span><b>${v}</b></div>`;
  }).join('')}</div>`;
  /* bullet: แถบอ่อน = ผู้สมัคร, แถบเข้ม = ผ่านการคัดเลือก */
  const bullets = (rows) => { const max = Math.max(1, ...rows.map(r => r[1])); return `<div class="bullets">${rows.map(([l, total, got], i) => `<div class="bl" style="--i:${i}"><span class="lab">${esc(l)}</span><span class="track" data-tip="${esc(l)}: สมัคร ${total} · ผ่าน ${got}"><span class="tot" style="width:${total / max * 100}%"></span><span class="got" style="width:${got / max * 100}%"></span></span><span class="val"><b>${got}</b>/${total}<small>${total ? Math.round(got / total * 100) : 0}%</small></span></div>`).join('')}</div>`; };
  const vcols = (rows, unit = 'คน') => { const max = Math.max(1, ...rows.map(r => r[1])); return `<div class="vcols">${rows.map(([l, v], i) => `<div class="vc" style="--i:${i}" data-tip="${esc(l)}: ${v} ${unit}"><b>${v}</b><span class="bar"><i style="height:${v / max * 100}%"></i></span><small>${esc(l)}</small></div>`).join('')}</div>`; };
  const ring = (v, total, label) => { const p = total ? v / total : 0, C = 2 * Math.PI * 42; return `<div class="ring"><svg viewBox="0 0 100 100" role="img" aria-label="${esc(label)} ${Math.round(p * 100)}%"><circle cx="50" cy="50" r="42" class="ring-bg"/><circle cx="50" cy="50" r="42" class="ring-fg" stroke-dasharray="${(p * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/></svg><div class="ring-c"><b>${Math.round(p * 100)}%</b><small>${v}/${total}</small></div></div>`; };

  /* แดชบอร์ดแบบแท็บ + ปรับแต่งได้ อยู่ใน ui/dashboard.js */
  function adminDashboard(main) { window.renderDashboard(main); }

  function applicantTable(list) {
    if (!list.length) return `<div class="card empty">${icon('search')}<p>ไม่พบผู้สมัครตามเงื่อนไข</p></div>`;
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>ผู้สมัคร</th><th>ตำแหน่ง</th><th>คณะ / สาขา</th><th>ชั้นปี</th><th>เอกสาร</th><th>ห้องแชท</th><th>สถานะ</th><th>วันที่ส่ง</th><th></th></tr></thead>
      <tbody>${list.map(a => { const p = a.profile, dn = docsDone(a); return `<tr>
        <td><b>${esc(p.fullName || '(ยังไม่กรอกชื่อ)')}</b><span class="sub">${esc(p.studentId)}</span></td>
        <td>${esc(posById(p.position1)?.th || '-')}${p.position2 ? `<span class="sub">สำรอง: ${esc(posById(p.position2)?.th)}</span>` : ''}</td>
        <td>${esc(p.faculty || '-')}<span class="sub">${esc(p.major)}</span></td>
        <td>${esc(p.year || '-')}</td>
        <td><span class="badge ${dn === docsReq ? 'tone-good' : 'tone-warn'}">${dn}/${docsReq}</span></td>
        <td>${Store.hasJoinedChat(a) ? `<span class="badge tone-good">${icon('check')}เข้าแล้ว</span>` : '<span class="badge tone-neutral">ยังไม่เข้า</span>'}</td>
        <td>${badge(a.status)}</td>
        <td>${fmtDateTime(a.submittedAt)}</td>
        <td><a class="btn btn-ghost btn-sm" href="#/admin/applicants/${a.id}">ดู</a></td>
      </tr>`; }).join('')}</tbody></table></div>`;
  }

  let filters = { q: '', pos: '', status: '', year: '' };
  function adminApplicants(main) {
    main.innerHTML = `
      <div class="admin-head"><div><h2>รายชื่อผู้สมัคร</h2><span class="muted small" id="countLbl"></span></div>
        <button class="btn btn-ghost btn-sm" id="exportBtn">${icon('download')} ส่งออก CSV</button></div>
      <div class="toolbar">
        <input class="input search" id="fq" placeholder="ค้นหาชื่อ รหัสนิสิต คณะ หรือ Line ID" value="${esc(filters.q)}">
        <select class="input" id="fpos"><option value="">ทุกตำแหน่ง</option>${POSITIONS.map(p => `<option value="${p.id}" ${filters.pos === p.id ? 'selected' : ''}>${p.th}</option>`).join('')}</select>
        <select class="input" id="fstatus"><option value="">ทุกสถานะ</option>${Object.entries(STATUS).map(([k, s]) => `<option value="${k}" ${filters.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
        <select class="input" id="fyear"><option value="">ทุกชั้นปี</option>${[1, 2, 3, 4, 5, 6].map(y => `<option value="${y}" ${filters.year == y ? 'selected' : ''}>ชั้นปีที่ ${y}</option>`).join('')}</select>
      </div>
      <div id="tbl"></div>`;
    const apply = () => {
      const q = filters.q.trim().toLowerCase();
      const list = Store.apps().filter(a => {
        const p = a.profile;
        if (filters.pos && p.position1 !== filters.pos && p.position2 !== filters.pos) return false;
        if (filters.status && a.status !== filters.status) return false;
        if (filters.year && p.year != filters.year) return false;
        if (q && ![p.fullName, p.studentId, p.faculty, p.major, p.lineId].join(' ').toLowerCase().includes(q)) return false;
        return true;
      }).sort((a, b) => (b.submittedAt || b.createdAt) - (a.submittedAt || a.createdAt));
      $('#tbl').innerHTML = applicantTable(list);
      $('#countLbl').textContent = `แสดง ${list.length} จาก ${Store.apps().length} รายการ`;
      $('#exportBtn').onclick = () => exportCsv(list);
    };
    $('#fq').oninput = e => { filters.q = e.target.value; apply(); };
    $('#fpos').onchange = e => { filters.pos = e.target.value; apply(); };
    $('#fstatus').onchange = e => { filters.status = e.target.value; apply(); };
    $('#fyear').onchange = e => { filters.year = e.target.value; apply(); };
    apply();
  }

  function adminApplicant(main, id) {
    const a = Store.app(id);
    if (!a) { main.innerHTML = '<div class="empty">ไม่พบใบสมัคร</div>'; return; }
    const u = Store.userOf(a), p = a.profile;
    main.innerHTML = `
      <div class="admin-head">
        <div><a href="#/admin/applicants" class="small">${'← '}กลับไปรายชื่อผู้สมัคร</a><h2>${esc(p.fullName || '(ยังไม่กรอกชื่อ)')}</h2><span class="muted small">${esc(u?.email)} · ส่งเมื่อ ${fmtDateTime(a.submittedAt)}</span></div>
        ${badge(a.status)}
      </div>
      <div class="dash-grid">
        <div class="card span-7">
          <h3>ข้อมูลผู้สมัคร</h3>
          ${reviewTable(p)}
          <p class="small muted mt-1 mb-0">ห้องแชทผู้สมัคร: ${Store.hasJoinedChat(a) ? 'เปิดอ่านแล้ว' : 'ยังไม่เคยเปิด'}${a.status === 'passed' ? ` · ห้องนิสิตช่วยงาน: ${Store.lastRead(a.userId, 'staff') ? 'เปิดอ่านแล้ว' : 'ยังไม่เคยเปิด'}` : ''}</p>
          <h3 class="mt-3">เอกสารหลักฐาน</h3>
          <div class="doc-grid" id="docGrid">
            ${DOC_TYPES.map(d => { const fs = a.docs[d.id] || []; return fs.length ? fs.map((f, i) => `
              <button class="doc-tile" data-doc="${d.id}:${i}" style="text-align:left;cursor:pointer;padding:0">
                <div class="prev">${f.data && f.type.startsWith('image/') ? `<img ${fsrc(f.data)} alt="">` : f.type.includes('pdf') ? 'PDF' : icon('image')}</div>
                <div class="cap"><b>${d.label}</b>${esc(f.name)}</div>
              </button>`).join('') : `<div class="doc-tile"><div class="prev" style="background:${d.required ? 'var(--amber-50)' : 'var(--bg)'};color:${d.required ? 'var(--amber)' : 'var(--muted)'}">${d.required ? 'ยังไม่ได้แนบ' : 'ไม่มี'}</div><div class="cap"><b>${d.label}</b>-</div></div>`; }).join('')}
          </div>
        </div>
        <div class="span-5">
          <div class="card card-shadow" style="position:sticky;top:88px">
            <h3>การพิจารณา</h3>
            <form id="reviewForm">
              <div class="field"><label for="st">สถานะใบสมัคร</label><select class="input" id="st" name="status">${Object.entries(STATUS).map(([k, s]) => `<option value="${k}" ${a.status === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div>
              <div class="field"><label for="rp">ตำแหน่งที่ได้รับคัดเลือก</label><select class="input" id="rp" name="resultPosition"><option value="">ตามตำแหน่งหลัก</option>${POSITIONS.map(x => `<option value="${x.id}" ${a.resultPosition === x.id ? 'selected' : ''}>${x.th}</option>`).join('')}</select><span class="hint">ใช้เมื่อสถานะ “ผ่านการคัดเลือก”</span></div>
              <div class="field"><label for="note">หมายเหตุถึงผู้สมัคร</label><textarea class="input" id="note" name="adminNote" placeholder="เช่น ขอเอกสารเพิ่มเติม / นัดสัมภาษณ์เวลา 13.00 น.">${esc(a.adminNote)}</textarea><span class="hint">ผู้สมัครจะเห็นข้อความนี้ในหน้าใบสมัคร</span></div>
              <button class="btn btn-block">บันทึกผลการพิจารณา</button>
            </form>
            <div class="divider">ทางลัด</div>
            <div class="flex">
              <button class="btn btn-soft btn-sm" data-quick="interview">${icon('calendar')} นัดสัมภาษณ์</button>
              <button class="btn btn-soft btn-sm" data-quick="passed">${icon('award')} ผ่าน</button>
              <button class="btn btn-ghost btn-sm" data-quick="revise">${icon('alert')} ขอเอกสาร</button>
            </div>
          </div>
        </div>
      </div>`;
    $('#docGrid').onclick = e => { const t = e.target.closest('[data-doc]'); if (!t) return; const [d, i] = t.dataset.doc.split(':'); previewFile(a.docs[d][+i]); };
    const f = $('#reviewForm');
    f.onsubmit = e => {
      e.preventDefault();
      const wasPassed = a.status === 'passed';
      Store.reviewApplication(a.id, { status: f.status.value, resultPosition: f.resultPosition.value, adminNote: f.adminNote.value });
      toast(a.status === 'passed' && !wasPassed ? 'บันทึกแล้ว — เพิ่มเข้าห้องนิสิตช่วยงานอัตโนมัติ' : 'บันทึกผลการพิจารณาแล้ว');
      adminApplicant(main, id);
    };
    $$('[data-quick]').forEach(b => b.onclick = () => { f.status.value = b.dataset.quick; f.requestSubmit(); });
  }

  function adminNews(main) {
    const s = Store.settings;
    main.innerHTML = `
      <div class="admin-head"><div><h2>ประกาศ และการประกาศผล</h2><span class="muted small">ข้อความจะแสดงบนหน้าแรกและหน้าประกาศผล</span></div></div>
      <div class="dash-grid">
        <div class="card span-5">
          <h3>การประกาศผลการคัดเลือก</h3>
          <div class="notice ${s.resultsPublished ? 'tone-good' : 'tone-neutral'} mb-2">${icon(s.resultsPublished ? 'checkc' : 'clock')}<span>${s.resultsPublished ? 'กำลังแสดงรายชื่อผู้ผ่านการคัดเลือกบนหน้าเว็บ' : 'ยังไม่เผยแพร่รายชื่อ'} (${Store.apps().filter(a => a.status === 'passed').length} คน)</span></div>
          <button class="btn ${s.resultsPublished ? 'btn-ghost' : ''} btn-block" id="pubBtn">${s.resultsPublished ? 'ยกเลิกการเผยแพร่ผล' : 'เผยแพร่ผลการคัดเลือก'}</button>
          <a class="btn btn-ghost btn-block mt-1" href="#/results" target="_blank">ดูหน้าประกาศผล</a>
          <h3 class="mt-3">เพิ่มประกาศใหม่</h3>
          <form id="newsForm">
            <div class="field"><label for="nt">หัวข้อ</label><input class="input" id="nt" name="title" required></div>
            <div class="field"><label for="nb">รายละเอียด</label><textarea class="input" id="nb" name="body" required></textarea></div>
            <div class="checks mb-2" style="grid-template-columns:1fr"><label><input type="checkbox" name="pinned"> ปักหมุดไว้ด้านบน</label></div>
            <button class="btn btn-block">${icon('megaphone')} เผยแพร่ประกาศ</button>
          </form>
        </div>
        <div class="card span-7">
          <h3>ประกาศทั้งหมด</h3>
          ${Store.announcements().map(n => `<div class="news-item"><div class="news-date"><b>${fmtDate(n.createdAt, { day: 'numeric' })}</b><span>${fmtDate(n.createdAt, { month: 'short', year: '2-digit' })}</span></div>
            <div style="flex:1;min-width:0">${n.pinned ? `<span class="badge tone-bad">${icon('pin')}ปักหมุด</span>` : ''}<h4>${esc(n.title)}</h4><p>${esc(n.body)}</p>
            <div class="flex mt-1"><button class="btn btn-ghost btn-sm" data-pin="${n.id}">${icon('pin')} ${n.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}</button><button class="btn btn-ghost btn-sm" data-del="${n.id}">${icon('trash')} ลบ</button></div></div></div>`).join('') || '<div class="empty">ยังไม่มีประกาศ</div>'}
        </div>
      </div>`;
    $('#pubBtn').onclick = () => { Store.saveSettings({ resultsPublished: !s.resultsPublished }); toast('อัปเดตการประกาศผลแล้ว'); adminNews(main); };
    $('#newsForm').onsubmit = e => {
      e.preventDefault(); const f = e.target;
      Store.addAnnouncement({ title: f.title.value.trim(), body: f.body.value.trim(), pinned: f.pinned.checked });
      toast('เผยแพร่ประกาศแล้ว'); adminNews(main);
    };
    main.onclick = e => {
      const p = e.target.closest('[data-pin]'), d = e.target.closest('[data-del]');
      if (p) { Store.togglePin(p.dataset.pin); adminNews(main); }
      if (d && confirm('ลบประกาศนี้?')) { Store.removeAnnouncement(d.dataset.del); adminNews(main); }
    };
  }

  function adminSettings(main) {
    const s = Store.settings;
    main.innerHTML = `
      <div class="admin-head"><div><h2>ตั้งค่าการรับสมัคร</h2></div></div>
      <div class="card" style="max-width:760px">
        <form id="setForm">
          <div class="form-grid">
            <div class="field"><label for="s-ay">ปีการศึกษา</label><input class="input" id="s-ay" name="academicYear" value="${esc(s.academicYear)}"></div>
            <div></div>
            <div class="field"><label for="s-od">วันเปิดรับสมัคร</label><input class="input" type="date" id="s-od" name="openDate" value="${s.openDate}"></div>
            <div class="field"><label for="s-cd">วันปิดรับสมัคร</label><input class="input" type="date" id="s-cd" name="closeDate" value="${s.closeDate}"></div>
            <div class="field"><label for="s-id">วันสัมภาษณ์</label><input class="input" type="date" id="s-id" name="interviewDate" value="${s.interviewDate}"></div>
            <div class="field"><label for="s-rd">วันประกาศผล</label><input class="input" type="date" id="s-rd" name="resultDate" value="${s.resultDate}"></div>
          </div>
          <div class="checks mb-2" style="grid-template-columns:1fr"><label><input type="checkbox" name="forceOpen" ${s.forceOpen ? 'checked' : ''}> โหมดสาธิต: เปิดรับสมัครตลอดเวลา (ไม่สนใจวันเปิด–ปิด)</label></div>
          <button class="btn">บันทึกการตั้งค่า</button>
        </form>
      </div>
      ${Store.mode !== 'local' ? '' : `<div class="card mt-2" style="max-width:760px">
        <h3>ข้อมูลสาธิต</h3>
        <p class="muted small">ข้อมูลทั้งหมดเก็บในเบราว์เซอร์นี้ (localStorage) เพื่อการทดลองเท่านั้น</p>
        <button class="btn btn-ghost" id="resetBtn">${icon('trash')} รีเซ็ตข้อมูลสาธิต</button>
      </div>`}`;
    $('#setForm').onsubmit = e => {
      e.preventDefault(); const f = e.target;
      Store.saveSettings({
        academicYear: f.academicYear.value, openDate: f.openDate.value, closeDate: f.closeDate.value, interviewDate: f.interviewDate.value,
        resultDate: f.resultDate.value, forceOpen: f.forceOpen.checked
      });
      toast('บันทึกการตั้งค่าแล้ว');
    };
    $('#resetBtn') && ($('#resetBtn').onclick = () => { if (confirm('ล้างข้อมูลทั้งหมดและโหลดข้อมูลตัวอย่างใหม่?')) { Store.reset(); toast('รีเซ็ตข้อมูลแล้ว'); location.hash = '#/'; } });
  }

  function exportCsv(list) {
    const head = ['ชื่อ-นามสกุล', 'เพศ', 'รหัสนิสิต', 'ชั้นปี', 'คณะ', 'สาขาวิชา', 'Line ID', 'เบอร์โทรศัพท์', 'ประสบการณ์ทำงาน', 'ความสามารถพิเศษ', 'เกียรติบัตร/ใบประกาศ', 'ตำแหน่งหลัก', 'ตำแหน่งสำรอง', 'เข้าห้องแชท', 'เอกสารครบ', 'สถานะ', 'ตำแหน่งที่ผ่าน', 'วันที่ส่ง', 'หมายเหตุ'];
    const rows = list.map(a => { const p = a.profile; return [p.fullName, p.gender, p.studentId, p.year, p.faculty, p.major, p.lineId, p.phone, p.experience, p.skills.concat(p.skillsOther ? [p.skillsOther] : []).join(' | '), p.certText, posById(p.position1)?.th || '', posById(p.position2)?.th || '', Store.hasJoinedChat(a) ? 'ใช่' : 'ไม่', `${docsDone(a)}/${docsReq}`, STATUS[a.status].label, a.status === 'passed' ? posById(a.resultPosition || p.position1)?.th : '', fmtDateTime(a.submittedAt), a.adminNote]; });
    const csv = '﻿' + [head].concat(rows).map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `applicants-${dayKey(Date.now())}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /* ---------- motion ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REVEAL = '.section-head, .pos-card, .step, .grid-2 > .card, .gallery figure, .rule-card, .news-item, .result-group, .detail-grid .card, .kpi, .dash-grid > *';

  function countUp(el) {
    const to = +el.dataset.count;
    if (reduceMotion || !to) return;
    const t0 = performance.now(), dur = 900 + Math.min(to, 50) * 10;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const io = 'IntersectionObserver' in window && !reduceMotion && new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(countUp);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

  function animatePage() {
    app.classList.remove('page-in'); void app.offsetWidth; app.classList.add('page-in');
    $$('.hero [data-count]').forEach(countUp);
    if (!io) return;
    $$(REVEAL, app).forEach(el => {
      if (el.closest('.hero')) return;
      // หน่วงเวลาไล่ลำดับตามตำแหน่งในกลุ่มพี่น้องเดียวกัน
      const sibs = Array.from(el.parentNode.children).filter(c => c.matches(REVEAL));
      el.style.setProperty('--d', Math.min(sibs.indexOf(el), 8));
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  const header = $('.site-header'), progress = $('#scrollProgress');
  const onScroll = () => {
    const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('scrolled', y > 8);
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ส่วนขยาย (chat.js, work.js) ใช้ helper ชุดเดียวกันผ่าน UI และลงทะเบียน route/แท็บแอดมินผ่าน EXT */
  /* รูปโปรไฟล์ (หรือวงกลมอักษรแรกถ้ายังไม่มีรูป) */
  const hueOf = (id) => [...String(id || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  function avatar(userId, size = 28, cls = '') {
    const u = Store.users().find(x => x.id === userId);
    if (u && u.avatar) return `<img class="av ${cls}" src="${esc(u.avatar)}" alt="" style="--s:${size}px" loading="lazy">`;
    const n = Store.chatName(userId).replace(/^พี่/, '') || '?';
    return `<span class="av ${cls}" style="--s:${size}px;--h:${hueOf(userId)}" aria-hidden="true">${esc(n.charAt(0))}</span>`;
  }
  const locIcon = (id) => { const l = LOCATIONS.find(x => x.id === id); return l ? `<span class="li" title="${esc(l.name)}">${icon(l.icon || 'home')}</span>` : ''; };
  Object.assign(window.UI, { avatar, locIcon, fsrc, $, $$, app, esc, icon, chev, toast, modal, previewFile, fmtDate, fmtDateTime, dayKey, posById, badge, renderChrome, readFile, route: () => route(),
    lineChart, drawCharts, funnel, bullets, vcols, ring, hbars, applicantTable, exportCsv, docsDone, docsReq });

  /* ---------- router ---------- */
  function route() {
    const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
    const seg = path.split('/').filter(Boolean);
    document.body.classList.remove('in-room');
    Store.pollFast(false);
    $('#moreSheet')?.classList.remove('open');
    renderChrome('/' + (seg[0] === 'positions' && seg[1] ? 'positions' : seg[0] || ''));
    $('#navLinks').classList.remove('open');
    const keepScroll = seg[0] === 'positions' && !seg[1] || seg[0] === 'rules';
    if (!keepScroll) window.scrollTo(0, 0);
    switch (seg[0]) {
      case undefined: viewHome(); break;
      case 'positions': seg[1] ? viewPosition(seg[1]) : viewHome('positions'); break;
      case 'rules': viewHome('rules'); break;
      case 'results': viewResults(); break;
      case 'login': viewLogin(false); break;
      case 'register': viewRegister(); break;
      case 'portal': viewPortal(seg[1]); break;
      case 'admin': viewAdmin(seg[1], seg[2]); break;
      default: EXT.routes[seg[0]] ? EXT.routes[seg[0]](seg.slice(1).map(decodeURIComponent)) : viewHome();
    }
    animatePage();
    onScroll();
  }
  window.addEventListener('hashchange', route);
  Store.onError((e) => { toast(e.message, true); route(); });
  Store.onRemote(() => { if (!location.hash.startsWith('#/chat')) renderChrome('/' + (location.hash.split('/')[1] || '')); });
  /* เปิดจากแคชในเครื่อง → ข้อมูลล่าสุดมาถึง: แสดงหน้าใหม่ (ยกเว้นกำลังพิมพ์/เปิดหน้าต่างอยู่) */
  window.addEventListener('ssc-fresh', () => {
    const busy = document.querySelector('dialog[open]') || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
    if (!busy && !location.hash.startsWith('#/chat')) route();
  });
  app.innerHTML = `<div class="empty" style="padding:120px 16px">${icon('clock')}<p>กำลังโหลด…</p></div>`;
  /* เปิดผ่านลิงก์ Apps Script (หน้าเว็บอยู่ใน iframe): อ่าน #/... จากลิงก์จริง เช่น ลิงก์ในอีเมล */
  const outerHash = () => new Promise(res => {
    try { if (window.google && google.script && google.script.url) return google.script.url.getLocation(loc => res(loc.hash ? '#' + String(loc.hash).replace(/^#/, '') : '')); } catch (e) {}
    res('');
  });
  Store.ready.then(outerHash).then(h => { if (h && h.startsWith('#/') && !location.hash) location.hash = h; else route(); }).catch(e => { app.innerHTML = `<div class="container section"><div class="notice tone-bad">${icon('alert')}<span>เชื่อมต่อระบบไม่สำเร็จ: ${esc(e.message)}<br><small>ตรวจสอบอินเทอร์เน็ต หรือการตั้งค่า assets/js/config.js</small></span></div></div>`; });
})();
