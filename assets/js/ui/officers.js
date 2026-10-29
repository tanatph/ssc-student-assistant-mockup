/* บัญชีเจ้าหน้าที่: หน้าลงทะเบียน (#/officer-register) + แท็บแอดมิน "เจ้าหน้าที่" สำหรับอนุมัติ/ระงับ */
(function () {
  const U = window.UI;
  const S = window.Store;
  const ROLE = {
    officer_pending: ['รออนุมัติ', 'warn', 'clock'],
    admin: ['ใช้งานได้', 'good', 'checkc'],
    officer_disabled: ['ระงับการใช้งาน', 'neutral', 'lock']
  };
  const roleBadge = (r) => { const x = ROLE[r]; return `<span class="badge tone-${x[1]}">${U.icon(x[2])}${x[0]}</span>`; };

  function viewRegister() {
    if (S.currentUser()) { location.hash = S.currentUser().role === 'admin' ? '#/admin' : '#/'; return; }
    const dom = S.OFFICER_DOMAIN;
    U.app.innerHTML = `
    <div class="auth-wrap">
      <div class="card card-shadow auth-card" style="max-width:480px"><img class="auth-logo" src="assets/images/ssc-logo.png" alt="ศูนย์กีฬาสิรินธร">
        <div class="eyebrow">${U.chev()} Staff register</div>
        <h2>ลงทะเบียนเจ้าหน้าที่</h2>
        <p class="muted small">สำหรับเจ้าหน้าที่ศูนย์กีฬาสิรินธรเพื่อเข้าใช้ระบบหลังบ้าน ใช้อีเมล <b>@${dom}</b> เท่านั้น — เมื่อส่งแล้ว ผู้ดูแลระบบจะตรวจสอบและอนุมัติบัญชีก่อนใช้งาน</p>
        <form id="ofForm" novalidate>
          <div class="field"><label for="of-name">ชื่อ-นามสกุล <span class="req">*</span></label><input class="input" id="of-name" name="fullName" autocomplete="name" placeholder="เช่น นางสาวสมศรี ใจงาม"><span class="err">กรุณากรอกชื่อ-นามสกุล</span></div>
          <div class="field"><label for="of-title">ตำแหน่ง <span class="req">*</span></label><input class="input" id="of-title" name="jobTitle" list="ofTitles" placeholder="พิมพ์หรือเลือกตำแหน่ง"><datalist id="ofTitles">${S.OFFICER_TITLES.map(t => `<option value="${t}">`).join('')}</datalist><span class="err">กรุณากรอกตำแหน่ง</span></div>
          <div class="field"><label for="of-phone">เบอร์โทรติดต่อ <span class="req">*</span></label><input class="input" id="of-phone" name="phone" inputmode="tel" autocomplete="tel" placeholder="08x-xxx-xxxx"><span class="err">เบอร์โทร 9–10 หลัก ขึ้นต้นด้วย 0</span></div>
          <div class="field"><label for="of-email">อีเมลมหาวิทยาลัย <span class="req">*</span></label><input class="input" id="of-email" name="email" type="email" autocomplete="email" placeholder="ชื่อ@${dom}"><span class="hint">ใช้เป็นชื่อผู้ใช้สำหรับเข้าสู่ระบบ</span><span class="err">ต้องเป็นอีเมล @${dom} เท่านั้น</span></div>
          <div class="field"><label for="of-pw">รหัสผ่าน <span class="req">*</span></label><input class="input" id="of-pw" name="password" type="password" autocomplete="new-password"><span class="hint">อย่างน้อย 8 ตัวอักษร</span><span class="err">รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร</span></div>
          <div class="field"><label for="of-pw2">ยืนยันรหัสผ่าน <span class="req">*</span></label><input class="input" id="of-pw2" name="password2" type="password" autocomplete="new-password"><span class="err">รหัสผ่านไม่ตรงกัน</span></div>
          <button class="btn btn-block">${U.icon('send')} ส่งคำขอลงทะเบียน</button>
        </form>
        <div class="divider">มีบัญชีแล้ว?</div>
        <a class="btn btn-ghost btn-block" href="#/admin">เข้าสู่ระบบเจ้าหน้าที่</a>
      </div>
    </div>`;
    const f = U.$('#ofForm');
    const domRe = new RegExp('^[^@\\s]+@' + dom.replace('.', '\\.') + '$', 'i');
    f.email.addEventListener('blur', () => { const v = f.email.value.trim(); if (v && !v.includes('@')) f.email.value = v + '@' + dom; });
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = { name: f.fullName.value.trim(), title: f.jobTitle.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), password: f.password.value };
      const checks = [[f.fullName, v.name.length >= 4], [f.jobTitle, !!v.title], [f.phone, /^0\d{8,9}$/.test(v.phone.replace(/[-\s]/g, ''))],
        [f.email, domRe.test(v.email)], [f.password, v.password.length >= 8], [f.password2, f.password2.value === v.password && !!v.password]];
      let ok = true;
      checks.forEach(([el, good]) => { el.closest('.field').classList.toggle('invalid', !good); if (!good) ok = false; });
      if (!ok) return;
      const btn = U.$('button', f); btn.disabled = true;
      try {
        const res = await S.registerOfficer(v);
        if (res && res.bootstrap) { U.toast('สร้างบัญชีผู้ดูแลระบบคนแรกแล้ว'); await S.login(v.email, v.password); location.hash = '#/admin'; return; }
        U.$('.auth-card').innerHTML = `
          <div class="status-card"><span class="big-ico tone-good">${U.icon('checkc')}</span>
            <div><h3 class="mb-0">ส่งคำขอลงทะเบียนแล้ว</h3>
              <p class="mt-1">ผู้ดูแลระบบจะได้รับแจ้งเตือนและตรวจสอบบัญชีของ <b>${U.esc(v.name)}</b> — เมื่ออนุมัติแล้วจะมีอีเมลแจ้งไปที่ <b>${U.esc(v.email.toLowerCase())}</b></p>
              <p class="small muted mb-0">จากนั้นเข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ตั้งไว้</p></div></div>
          <a class="btn btn-block mt-3" href="#/admin">ไปหน้าเข้าสู่ระบบเจ้าหน้าที่</a>`;
      } catch (err) { U.toast(err.message, true); btn.disabled = false; }
    };
  }

  function adminOfficers(main) {
    const me = S.currentUser();
    const list = S.officers();
    const pending = list.filter(u => u.role === 'officer_pending');
    const others = list.filter(u => u.role !== 'officer_pending');
    const row = (u) => `<tr>
      <td><b>${U.esc(u.name || '(ไม่ระบุชื่อ)')}</b>${u.id === me.id ? ' <span class="badge tone-info">คุณ</span>' : ''}<span class="sub">${U.esc(u.email)}</span></td>
      <td>${U.esc(u.title || '-')}</td><td>${U.esc(u.phone || '-')}</td><td>${roleBadge(u.role)}</td>
      <td>${U.fmtDateTime(u.approvedAt || u.createdAt)}</td>
      <td>${u.role === 'officer_pending' ? `<div class="flex" style="flex-wrap:nowrap"><button class="btn btn-sm" data-approve="${u.id}">${U.icon('check')} อนุมัติ</button><button class="btn btn-ghost btn-sm" data-reject="${u.id}">ไม่อนุมัติ</button></div>`
        : u.id === me.id ? '' : u.role === 'admin' ? `<button class="btn btn-ghost btn-sm" data-off="${u.id}">${U.icon('lock')} ระงับ</button>` : `<button class="btn btn-soft btn-sm" data-on="${u.id}">${U.icon('unlock')} เปิดใช้งาน</button>`}</td></tr>`;
    const table = (rows) => `<div class="table-wrap"><table class="table"><thead><tr><th>ชื่อ / อีเมล</th><th>ตำแหน่ง</th><th>เบอร์โทร</th><th>สถานะ</th><th>วันที่</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    main.innerHTML = `
      <div class="admin-head"><div><h2>บัญชีเจ้าหน้าที่</h2><span class="muted small">ผู้ใช้ระบบหลังบ้าน · ลงทะเบียนได้เฉพาะอีเมล @${S.OFFICER_DOMAIN} และต้องได้รับอนุมัติก่อนใช้งาน</span></div>
        <button class="btn btn-ghost btn-sm" id="copyReg">${U.icon('send')} คัดลอกลิงก์ลงทะเบียน</button></div>
      <h3 class="flex">คำขอรออนุมัติ ${pending.length ? `<span class="dot-count static">${pending.length}</span>` : ''}</h3>
      ${pending.length ? table(pending.map(row).join('')) : `<div class="card empty" style="padding:24px">${U.icon('checkc')}<p class="mb-0">ไม่มีคำขอที่รออนุมัติ</p></div>`}
      <div class="notice tone-warn small mt-2">${U.icon('shield')}<span>นิสิตก็มีอีเมล @${S.OFFICER_DOMAIN} — ตรวจชื่อและตำแหน่งให้ตรงกับเจ้าหน้าที่จริงก่อนอนุมัติ เพราะเจ้าหน้าที่เห็นเอกสารส่วนตัวของผู้สมัครทั้งหมด</span></div>
      <h3 class="mt-3">เจ้าหน้าที่ทั้งหมด (${others.length})</h3>
      ${table(others.map(row).join(''))}`;
    const act = (fn, msg) => { try { fn(); U.toast(msg); adminOfficers(main); U.renderChrome('/admin'); } catch (e) { U.toast(e.message, true); } };
    main.onclick = (e) => {
      const b = e.target.closest('[data-approve],[data-reject],[data-off],[data-on]'); if (!b) return;
      const u = list.find(x => x.id === (b.dataset.approve || b.dataset.reject || b.dataset.off || b.dataset.on));
      if (b.dataset.approve && confirm(`อนุมัติ ${u.name} (${u.title}) เป็นเจ้าหน้าที่? จะเข้าถึงข้อมูลหลังบ้านได้ทั้งหมด`)) act(() => S.approveOfficer(u.id), 'อนุมัติแล้ว — ส่งอีเมลแจ้งเจ้าหน้าที่แล้ว');
      if (b.dataset.reject && confirm(`ไม่อนุมัติและลบคำขอของ ${u.name}?`)) act(() => S.rejectOfficer(u.id), 'ลบคำขอแล้ว');
      if (b.dataset.off && confirm(`ระงับบัญชี ${u.name}? จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง`)) act(() => S.setOfficerActive(u.id, false), 'ระงับบัญชีแล้ว');
      if (b.dataset.on) act(() => S.setOfficerActive(u.id, true), 'เปิดใช้งานบัญชีแล้ว');
    };
    U.$('#copyReg').onclick = () => {
      const url = location.href.split('#')[0] + '#/officer-register';
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => U.toast('คัดลอกลิงก์แล้ว')).catch(() => prompt('ลิงก์ลงทะเบียนเจ้าหน้าที่', url));
    };
  }

  EXT.routes['officer-register'] = viewRegister;
  EXT.adminTabs.push({ id: 'officers', label: 'เจ้าหน้าที่', icon: 'shield', view: adminOfficers });
})();
