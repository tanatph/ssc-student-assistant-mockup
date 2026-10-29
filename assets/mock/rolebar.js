/* แถบสลับบทบาท (เฉพาะเว็บทดสอบ mockup) — สลับเป็นแอดมิน / ผู้สมัคร / นิสิตช่วยงานแต่ละฝ่ายได้ในคลิกเดียว
   ลากย้ายตำแหน่งได้ (จำตำแหน่งไว้) · ย่อเหลือปุ่มเล็กได้ · build-mock.mjs ใส่ไฟล์นี้ให้เอง ระบบจริงไม่มี */
(function () {
  const POS_KEY = 'mock-bar-pos', MIN_KEY = 'mock-bar-min';
  const mem = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const bar = document.createElement('div');
  bar.className = 'mock-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'แถบสลับบทบาทสำหรับทดสอบ');
  document.body.appendChild(bar);

  const ROLE_TH = { admin: 'แอดมิน', applicant: 'ผู้สมัคร', officer_pending: 'เจ้าหน้าที่ (รออนุมัติ)' };
  function who() {
    const u = Store.currentUser();
    if (!u) return 'ผู้เยี่ยมชม (ยังไม่เข้าระบบ)';
    if (u.role === 'admin') return 'แอดมิน · ' + (u.name || u.email);
    const a = Store.apps().find(x => x.userId === u.id);
    if (a && a.status === 'passed') {
      const p = POSITIONS.find(x => x.id === (a.resultPosition || a.profile.position1)) || {};
      return 'นิสิตช่วยงาน' + (p.th || '') + ' · ' + Store.chatName(u.id);
    }
    return (ROLE_TH[u.role] || u.role) + ' · ' + ((a && a.profile.fullName) || u.email);
  }
  function staffOptions() {
    return POSITIONS.map(p => `<optgroup label="${esc(p.th)} (${Store.staffOf(p.id).length} คน)">` +
      Store.staffOf(p.id).map(a => {
        const u = Store.userOf(a) || {};
        return `<option value="${esc(u.email)}">${esc((u.nickname ? u.nickname + ' · ' : '') + a.profile.fullName)}</option>`;
      }).join('') + '</optgroup>').join('');
  }
  function applicantOptions() {
    const ST = { draft: 'ร่าง', submitted: 'ส่งแล้ว', revise: 'รอแก้เอกสาร', verified: 'ตรวจแล้ว', interview: 'รอสัมภาษณ์', failed: 'ไม่ผ่าน' };
    return Store.apps().filter(a => a.status !== 'passed').map(a => {
      const u = Store.userOf(a) || {};
      return `<option value="${esc(u.email)}">${esc(a.profile.fullName || u.email)} · ${esc(ST[a.status] || a.status)}</option>`;
    }).join('');
  }

  function render() {
    const min = mem.get(MIN_KEY) === '1';
    bar.classList.toggle('is-min', min);
    if (min) {
      bar.innerHTML = `<span class="mock-grip" title="ลากเพื่อย้าย">⠿</span><button type="button" class="mock-open" data-act="expand" title="เปิดแถบสลับบทบาท">ทดสอบ · ${esc(who())}</button>`;
      return;
    }
    bar.innerHTML = `
      <div class="mock-head"><span class="mock-grip" title="ลากเพื่อย้าย">⠿</span><b>เวอร์ชันทดสอบ</b><small>${esc(window.MOCK_STAMP || '')}</small>
        <button type="button" class="mock-x" data-act="min" title="ย่อแถบ">–</button></div>
      <div class="mock-who">กำลังใช้เป็น: <b>${esc(who())}</b></div>
      <div class="mock-row">
        <button type="button" data-act="guest">ผู้เยี่ยมชม</button>
        <button type="button" data-act="admin">แอดมิน</button>
      </div>
      <label>นิสิตช่วยงาน (ฝ่ายละ 10 คน)<select data-pick="staff"><option value="">— เลือกคน —</option>${staffOptions()}</select></label>
      <label>ผู้สมัคร<select data-pick="applicant"><option value="">— เลือกคน —</option>${applicantOptions()}</select></label>
      <button type="button" class="mock-reset" data-act="reset">ล้างข้อมูลทดสอบ</button>`;
  }

  async function become(email, password, target) {
    Store.logout();
    if (email) {
      try { await Store.login(email, password); } catch (e) { alert(e.message); }
    }
    if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
    else location.hash = target;
    render();
  }
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'min' || act === 'expand') { mem.set(MIN_KEY, act === 'min' ? '1' : '0'); render(); place(); }
    if (act === 'guest') become(null, null, '#/');
    if (act === 'admin') become('admin@swu.ac.th', 'admin1234', '#/admin');
    if (act === 'reset' && confirm('ล้างข้อมูลทดสอบในเบราว์เซอร์นี้ แล้วเริ่มใหม่ด้วยข้อมูลตัวอย่าง?')) { Store.reset(); location.hash = '#/'; location.reload(); }
  });
  bar.addEventListener('change', (e) => {
    const s = e.target.closest('[data-pick]');
    if (!s || !s.value) return;
    become(s.value, 'demo1234', s.dataset.pick === 'staff' ? '#/work' : '#/portal');
  });

  /* ---- ลากย้าย (เมาส์และนิ้ว) ---- */
  function clamp(x, y) {
    const r = bar.getBoundingClientRect();
    return [Math.max(4, Math.min(x, innerWidth - r.width - 4)), Math.max(4, Math.min(y, innerHeight - r.height - 4))];
  }
  function place() {
    let p = null;
    try { p = JSON.parse(mem.get(POS_KEY)); } catch (e) {}
    const r = bar.getBoundingClientRect();
    const [x, y] = clamp(p ? p.x : 12, p ? p.y : innerHeight - r.height - (innerWidth <= 860 ? 84 : 12));
    bar.style.left = x + 'px'; bar.style.top = y + 'px';
  }
  bar.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.mock-grip, .mock-head') || e.target.closest('button')) return;
    e.preventDefault();
    const r = bar.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('is-drag');
    const move = (ev) => { const [x, y] = clamp(ev.clientX - dx, ev.clientY - dy); bar.style.left = x + 'px'; bar.style.top = y + 'px'; };
    const up = () => {
      bar.classList.remove('is-drag');
      bar.removeEventListener('pointermove', move);
      mem.set(POS_KEY, JSON.stringify({ x: parseFloat(bar.style.left), y: parseFloat(bar.style.top) }));
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up, { once: true });
  });
  addEventListener('resize', place);

  Store.ready.then(() => {
    render(); place();
    addEventListener('hashchange', () => { if (!bar.contains(document.activeElement)) render(); });
    Store.onRemote(render);
  });
})();
