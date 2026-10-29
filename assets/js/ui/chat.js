/* ห้องแชทในเว็บ (แทน LINE Open Chat): ห้องผู้สมัคร + ห้องนิสิตช่วยงาน, สติ๊กเกอร์, เครื่องมือแอดมิน
   อัปเดตสดข้ามแท็บผ่าน storage event — ระบบจริงให้เปลี่ยนเป็น WebSocket / Firestore realtime */
(function () {
  const U = window.UI;
  let current = null;            // ห้องที่เปิดอยู่
  let announceMode = false;

  const initial = (name) => (name || '?').trim().charAt(0);
  const hue = (id) => [...(id || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const avatar = (userId) => {
    const u = Store.db().users.find(x => x.id === userId);
    if (u && u.avatar) return U.avatar(userId, 34, 'ava');   // รูปโปรไฟล์
    const isAdmin = u?.role === 'admin';
    return isAdmin
      ? `<span class="ava ava-admin" aria-hidden="true">${U.icon('shield')}</span>`
      : `<span class="ava" style="--h:${hue(userId)}" aria-hidden="true">${U.esc(initial(Store.chatName(userId)))}</span>`;
  };
  const time = (ts) => new Date(ts).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
  const dayLabel = (ts) => {
    const k = U.dayKey(ts), today = U.dayKey(Date.now()), yest = U.dayKey(Date.now() - 864e5);
    return k === today ? 'วันนี้' : k === yest ? 'เมื่อวาน' : U.fmtDate(ts, { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
  };
  const linkify = (s) => U.esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
  const snippet = (m) => m.type === 'sticker' ? '[สติ๊กเกอร์] ' + STICKERS.label(m.sticker)
    : m.type === 'card' ? ({ roster: '[ตารางเวร] ', job: '[งานเพิ่มเติม] ', swap: '[แลกเวร] ' }[m.card.kind] || '') + m.card.title
    : String(m.text || '').split('\n')[0];

  /* การ์ดตารางเวร / งานเพิ่มเติม — สถานะคำนวณสดจากข้อมูลล่าสุด กดแล้วไปหน้านั้น */
  function cardHtml(c, u) {
    const admin = u.role === 'admin';
    let href, kind, ico, btn, line = '';
    if (c.kind === 'swap') {
      kind = 'ขอแลกเวร'; ico = 'users'; btn = admin ? 'ดูตารางเวร' : 'ดู / รับแลก';
      href = admin ? '#/admin/roster/' + c.ym : '#/work/roster/' + c.ym + '/' + c.ref;
      const x = Store.swaps().find(v => v.id === c.ref), state = x ? Store.swapState(x) : 'cancelled';
      line = state === 'open' ? (x.userId === u.id ? `ประกาศของคุณ · มีผู้เสนอ ${x.offers.length} คน` : x.offers.some(o => o.userId === u.id) ? '✓ คุณเสนอรับแลกแล้ว' : 'ยังเปิดรับแลก')
        : state === 'done' ? `แลกกับ ${Store.chatName(x.acceptedUserId)} เรียบร้อยแล้ว` : state === 'expired' ? 'หมดเวลาแลกแล้ว' : 'ปิดประกาศแล้ว';
    } else if (c.kind === 'roster') {
      kind = 'ตารางเวร'; ico = 'calendar'; btn = 'ดูตารางเวร';
      href = admin ? '#/admin/roster/' + c.ref : '#/work/roster/' + c.ref;
      if (!admin && Store.isStaff(u)) { const n = Store.myShifts(u.id, c.ref).length; line = n ? `เดือนนี้คุณมีเวร ${n} วัน` : 'เดือนนี้คุณยังไม่มีเวร'; }
    } else {
      kind = 'งานเพิ่มเติม'; ico = 'megaphone'; btn = admin ? 'ดูผู้รับงาน' : 'ดู / รับงาน';
      href = admin ? '#/admin/jobs' : '#/work/jobs/' + c.ref;
      const j = Store.jobs().find(x => x.id === c.ref);
      if (!j) line = 'งานนี้ถูกยกเลิกแล้ว';
      else if (j.takers.some(t => t.userId === u.id)) line = '✓ คุณรับงานนี้แล้ว';
      else line = j.status === 'open' ? `ยังว่าง ${j.slots - j.takers.length} จาก ${j.slots} ที่` : j.status === 'full' ? 'มีผู้รับครบแล้ว' : 'ปิดรับแล้ว';
    }
    return `<a class="chat-card cc-${c.kind}" href="${href}">
      <span class="cc-top">${U.icon(ico)}${kind}</span>
      <b>${U.esc(c.title)}</b><span class="cc-text">${U.esc(c.text)}</span>
      ${line ? `<span class="cc-line">${U.esc(line)}</span>` : ''}
      <span class="cc-btn">${btn} ${U.icon('arrow')}</span></a>`;
  }

  function view(seg) {
    const u = Store.currentUser();
    if (!u) { location.hash = '#/login'; return; }
    const rooms = Store.chatRooms(u);
    if (!rooms.length) {
      U.app.innerHTML = `<section class="section"><div class="container"><div class="card empty">${U.icon('lock')}<h3>ยังไม่มีห้องแชทสำหรับคุณ</h3><p>ห้องผู้สมัครจะเปิดให้หลังจากกดยืนยันส่งใบสมัคร</p><a class="btn" href="#/portal">ไปที่ใบสมัคร</a></div></div></section>`;
      return;
    }
    const roomId = seg[0];
    if (roomId && !Store.canChat(u, roomId)) { U.toast('คุณไม่มีสิทธิ์เข้าห้องนี้', true); location.hash = '#/chat'; return; }
    current = roomId || (window.innerWidth > 860 ? rooms[0].id : null);
    document.body.classList.toggle('in-room', !!roomId);
    Store.pollFast(true);
    U.app.innerHTML = `
      <div class="chat-shell ${current ? 'has-room' : ''}">
        <aside class="chat-list">
          <div class="chat-list-head"><h2>ห้องแชท</h2>${u.role === 'admin' ? '<span class="badge tone-bad">แอดมิน</span>' : ''}</div>
          <div id="roomList"></div>
          <p class="small muted chat-hint">${U.icon('lock')} ห้องแชทเห็นเฉพาะสมาชิกและพี่ ๆ แอดมินศูนย์กีฬาสิรินธร</p>
        </aside>
        <section class="chat-room" id="chatRoom">${current ? '' : `<div class="empty">${U.icon('chat')}<p>เลือกห้องแชท</p></div>`}</section>
      </div>`;
    renderRooms();
    if (current) renderRoom();
  }

  function renderRooms() {
    const u = Store.currentUser(), el = U.$('#roomList');
    if (!el) return;
    // ห้องแยกฝ่าย (hidden) แสดงเฉพาะคนที่มีสิทธิ์
    el.innerHTML = CHAT_ROOMS.filter(r => !r.hidden || Store.canChat(u, r.id)).map(r => {
      const can = Store.canChat(u, r.id);
      const msgs = Store.messages(r.id).filter(m => m.type !== 'system');
      const last = msgs[msgs.length - 1];
      const n = can ? Store.unread(u, r.id) : 0;
      const preview = !last ? 'ยังไม่มีข้อความ' : last.type === 'deleted' ? 'ข้อความถูกลบ' : `${last.userId === u.id ? 'คุณ' : Store.chatName(last.userId)}: ${snippet(last)}`;
      return can ? `<a class="room-item ${r.id === current ? 'active' : ''}" href="#/chat/${r.id}">
          <span class="room-ico">${U.icon(r.icon)}</span>
          <span class="room-txt"><b>${r.name}${Store.room(r.id).locked ? ` ${U.icon('lock', 'tiny')}` : ''}</b><small>${U.esc(preview)}</small></span>
          <span class="room-meta">${last ? `<small>${dayLabel(last.ts) === 'วันนี้' ? time(last.ts) : dayLabel(last.ts)}</small>` : ''}${n ? `<span class="dot-count static">${n}</span>` : ''}</span>
        </a>`
        : `<div class="room-item locked"><span class="room-ico">${U.icon('lock')}</span><span class="room-txt"><b>${r.name}</b><small>สำหรับ${r.who}</small></span></div>`;
    }).join('');
  }

  function renderRoom(keepScroll) {
    const u = Store.currentUser(), room = CHAT_ROOMS.find(r => r.id === current), state = Store.room(current);
    const el = U.$('#chatRoom'); if (!el) return;
    const isAdmin = u.role === 'admin';
    const members = Store.members(current);
    const pinned = state.pinned && Store.messages(current).find(m => m.id === state.pinned);
    const draft = U.$('#chatInput')?.value || '';
    const canSend = !state.locked || isAdmin;
    el.innerHTML = `
      <header class="room-head">
        <a class="btn btn-ghost btn-icon btn-sm back-btn" href="#/chat" aria-label="กลับ">${U.icon('back')}</a>
        <span class="room-ico">${U.icon(room.icon)}</span>
        <div class="room-title"><b>${room.name}</b><small>${members.filter(m => m.role !== 'admin').length} สมาชิก · ${room.desc}</small></div>
        ${isAdmin ? `<button class="btn btn-ghost btn-sm" id="lockBtn" title="${state.locked ? 'เปิดให้ทุกคนพิมพ์' : 'ให้เฉพาะแอดมินพิมพ์'}">${U.icon(state.locked ? 'lock' : 'unlock')}<span class="btn-text">${state.locked ? 'ล็อกอยู่' : 'ล็อกห้อง'}</span></button>` : ''}
      </header>
      ${pinned ? `<button class="pin-bar" data-jump="${pinned.id}">${U.icon('pin')}<span><b>ประกาศที่ปักหมุด</b>${U.esc(snippet(pinned))}</span></button>` : ''}
      <div class="msgs" id="msgs" aria-live="polite">${messagesHtml(u)}</div>
      <div class="sticker-panel" id="stickerPanel" hidden>
        <div class="sticker-head"><b>น้องสิริ</b><small class="muted">สติ๊กเกอร์ศูนย์กีฬาสิรินธร</small></div>
        <div class="sticker-grid">${STICKERS.list.map(s => `<button type="button" data-sticker="${s.id}" title="${s.label}">${STICKERS.svg(s.id)}</button>`).join('')}</div>
      </div>
      ${canSend ? `<form class="composer" id="composer">
        <button type="button" class="btn btn-ghost btn-icon" id="stickerBtn" aria-label="สติ๊กเกอร์" title="สติ๊กเกอร์">${U.icon('smile')}</button>
        ${isAdmin ? `<button type="button" class="btn btn-ghost btn-icon ${announceMode ? 'on' : ''}" id="announceBtn" aria-label="ส่งเป็นประกาศ" title="ส่งเป็นประกาศ (ปักหมุดอัตโนมัติ)">${U.icon('megaphone')}</button>` : ''}
        <textarea id="chatInput" rows="1" placeholder="${announceMode ? 'พิมพ์ประกาศ (จะปักหมุดไว้ด้านบน)…' : 'พิมพ์ข้อความ…'}" maxlength="1000">${U.esc(draft)}</textarea>
        <button class="btn btn-icon" aria-label="ส่ง">${U.icon('send')}</button>
      </form>` : `<div class="composer locked">${U.icon('lock')} ห้องนี้เปิดให้พี่แอดมินส่งข้อความเท่านั้น</div>`}`;
    const box = U.$('#msgs');
    box.scrollTop = keepScroll ? keepScroll : box.scrollHeight;
    if (Store.unread(u, current)) Store.markRead(current);   // ส่งไป server เฉพาะเมื่อมีข้อความใหม่
    renderRooms();
    bindRoom();
  }

  function messagesHtml(u) {
    const list = Store.messages(current);
    const lastRead = Store.lastRead(u.id, current);
    let html = '', lastDay = '', prev = null, unreadShown = false;
    list.forEach(m => {
      const d = U.dayKey(m.ts);
      if (d !== lastDay) { html += `<div class="day-sep"><span>${dayLabel(m.ts)}</span></div>`; lastDay = d; prev = null; }
      if (!unreadShown && lastRead && m.ts > lastRead && m.userId !== u.id && m.type !== 'system') { html += `<div class="unread-sep"><span>ข้อความใหม่</span></div>`; unreadShown = true; }
      if (m.type === 'system') { html += `<div class="sys-msg">${U.esc(m.text)}</div>`; prev = null; return; }
      const mine = m.userId === u.id;
      const grouped = prev && prev.userId === m.userId && m.ts - prev.ts < 5 * 6e4 && prev.type !== 'announce' && m.type !== 'announce';
      const isAdminMsg = Store.db().users.find(x => x.id === m.userId)?.role === 'admin';
      const canDel = m.type !== 'deleted' && (mine || u.role === 'admin');
      const canPin = u.role === 'admin' && m.type !== 'deleted';
      const reads = mine && m.type !== 'deleted' ? Store.readCount(current, m) : 0;
      let body;
      if (m.type === 'deleted') body = `<div class="bubble deleted">${U.icon('trash')} ${m.deletedBy === 'admin' ? 'ข้อความถูกลบโดยแอดมิน' : 'ยกเลิกข้อความแล้ว'}</div>`;
      else if (m.type === 'card') body = cardHtml(m.card, u);
      else if (m.type === 'sticker') body = `<div class="sticker-msg">${STICKERS.svg(m.sticker)}</div>`;
      else if (m.type === 'announce') body = `<div class="bubble announce"><span class="ann-tag">${U.icon('megaphone')} ประกาศ</span>${linkify(m.text)}</div>`;
      else body = `<div class="bubble">${linkify(m.text)}</div>`;
      html += `<div class="msg ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''}" id="m-${m.id}" data-id="${m.id}">
        ${mine ? '' : grouped ? '<span class="ava-space"></span>' : avatar(m.userId)}
        <div class="msg-col">
          ${!mine && !grouped ? `<span class="who">${U.esc(Store.chatName(m.userId))}${isAdminMsg ? ' <span class="badge tone-bad">แอดมิน</span>' : ''}</span>` : ''}
          <div class="msg-row">
            ${body}
            <span class="meta">${reads ? `<span>อ่านแล้ว ${reads}</span>` : ''}<span>${time(m.ts)}</span></span>
            ${canDel || canPin ? `<span class="msg-actions">
              ${canPin ? `<button type="button" data-pin="${m.id}" title="${Store.room(current).pinned === m.id ? 'เลิกปักหมุด' : 'ปักหมุด'}" aria-label="ปักหมุด">${U.icon('pin')}</button>` : ''}
              ${canDel ? `<button type="button" data-del="${m.id}" title="${mine ? 'ยกเลิกข้อความ' : 'ลบข้อความ'}" aria-label="ลบ">${U.icon('trash')}</button>` : ''}
            </span>` : ''}
          </div>
        </div>
      </div>`;
      prev = m;
    });
    return html || `<div class="empty">${U.icon('chat')}<p>เริ่มบทสนทนาได้เลย</p></div>`;
  }

  function send(body) {
    try {
      Store.sendMessage(current, body);
      renderRoom();
      U.renderChrome('/chat');
    } catch (e) { U.toast(e.message, true); }
  }

  function bindRoom() {
    const form = U.$('#composer'), input = U.$('#chatInput'), panel = U.$('#stickerPanel'), box = U.$('#msgs');
    U.$('#lockBtn') && (U.$('#lockBtn').onclick = () => {
      const v = !Store.room(current).locked;
      Store.setLocked(current, v);
      renderRoom();
    });
    U.$('.pin-bar') && (U.$('.pin-bar').onclick = (e) => {
      const t = U.$('#m-' + e.currentTarget.dataset.jump);
      if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1400); }
    });
    box.onclick = (e) => {
      const p = e.target.closest('[data-pin]'), d = e.target.closest('[data-del]');
      if (p) { Store.pinMessage(current, p.dataset.pin); renderRoom(box.scrollTop); }
      if (d && confirm('ลบข้อความนี้?')) { Store.deleteMessage(current, d.dataset.del); renderRoom(box.scrollTop); }
      const m = e.target.closest('.msg');
      U.$$('.msg.show-actions').forEach(x => x !== m && x.classList.remove('show-actions'));
      if (m && !p && !d) m.classList.toggle('show-actions');
    };
    if (!form) return;
    const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
    input.oninput = grow; grow();
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
    form.onsubmit = (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      const isAnn = announceMode;
      announceMode = false;
      send({ type: isAnn ? 'announce' : 'text', text });
      U.$('#chatInput')?.focus();
    };
    U.$('#stickerBtn').onclick = () => { panel.hidden = !panel.hidden; U.$('#stickerBtn').classList.toggle('on', !panel.hidden); };
    panel.onclick = (e) => { const b = e.target.closest('[data-sticker]'); if (b) send({ type: 'sticker', sticker: b.dataset.sticker }); };
    U.$('#announceBtn') && (U.$('#announceBtn').onclick = () => { announceMode = !announceMode; renderRoom(box.scrollTop); U.$('#chatInput').focus(); });
  }

  /* ข้อความใหม่จาก server / แท็บอื่น */
  Store.onRemote(() => {
    const onChat = location.hash.startsWith('#/chat');
    if (onChat && current && U.$('#msgs')) {
      const box = U.$('#msgs');
      const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      renderRoom(atBottom ? 0 : box.scrollTop);
      if (atBottom) box.scrollTop = box.scrollHeight;
    } else if (onChat) renderRooms();
    U.renderChrome('/' + (location.hash.split('/')[1] || ''));
  });

  EXT.routes.chat = view;
})();
