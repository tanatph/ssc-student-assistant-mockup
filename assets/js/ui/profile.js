/* โปรไฟล์ของฉัน (#/profile): รูปโปรไฟล์ + ชื่อเล่น — แสดงในห้องแชทและตารางเวร */
(function () {
  const U = window.UI;
  const S = window.Store;

  /* ครอปตรงกลางเป็นสี่เหลี่ยมจัตุรัส 128px แล้วบีบอัด JPEG (~5–8 KB) */
  function squareImage(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error('เลือกไฟล์รูปภาพเท่านั้น'));
      if (file.size > 15 * 1024 * 1024) return reject(new Error('ไฟล์ใหญ่เกิน 15 MB'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const side = Math.min(img.width, img.height), c = document.createElement('canvas');
        c.width = c.height = 128;
        c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);
        URL.revokeObjectURL(url);
        let q = 0.82, out = c.toDataURL('image/jpeg', q);
        while (out.length > 22000 && q > 0.4) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
        resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านไฟล์รูปไม่สำเร็จ')); };
      img.src = url;
    });
  }

  function view() {
    const u = S.currentUser();
    if (!u) { location.hash = '#/login'; return; }
    const app = S.appOfUser(u.id);
    const full = u.role === 'admin' ? (u.name || u.email) : (app?.profile.fullName || u.email);
    const sub = u.role === 'admin' ? (u.title || 'เจ้าหน้าที่') : S.isStaff(u) ? 'นิสิตช่วยงาน ฝ่าย' + U.posById(S.posOfUser(u.id)).th : 'ผู้สมัคร';
    U.app.innerHTML = `
      <section class="section" style="padding-top:28px"><div class="container" style="max-width:720px">
        <div class="eyebrow">${U.chev()} Profile</div><h2>โปรไฟล์ของฉัน</h2>
        <div class="card card-shadow">
          <div class="pf-top">
            <div class="pf-av">${U.avatar(u.id, 120)}
              <label class="btn btn-sm pf-cam" title="เปลี่ยนรูป">${U.icon('image')}<input type="file" id="pfFile" accept="image/*" hidden></label></div>
            <div><h3 class="mb-0">${U.esc(full)}</h3><span class="muted">${U.esc(sub)}</span><br><span class="small muted">${U.esc(u.email)}</span>
              ${u.avatar ? `<div class="mt-1"><button class="btn btn-ghost btn-sm" id="pfDel">${U.icon('trash')} ลบรูปโปรไฟล์</button></div>` : ''}</div>
          </div>
          <form id="pfForm" class="mt-3">
            <div class="field"><label for="pfNick">ชื่อเล่น</label><input class="input" id="pfNick" maxlength="20" value="${U.esc(u.nickname || '')}" placeholder="เช่น บีม, ฟ้า, ต้น">
              <span class="hint">แสดงในห้องแชทและตารางเวรแทนชื่อจริง${u.role === 'admin' ? ' (แสดงเป็น “พี่ + ชื่อเล่น”)' : ''} · เว้นว่าง = ใช้ชื่อจริง</span></div>
            <button class="btn">${U.icon('check')} บันทึก</button>
          </form>
        </div>
        <div class="card mt-2"><h3>ตัวอย่างการแสดงผล</h3>
          <div class="pf-preview">
            <div class="msg" style="animation:none">${U.avatar(u.id, 34)}<div class="msg-col"><span class="who">${U.esc(S.chatName(u.id))}</span><div class="msg-row"><div class="bubble">สวัสดีครับ/ค่ะ 👋</div></div></div></div>
            ${S.isStaff(u) ? `<span class="rc-chip pf-chip">${U.locIcon(Object.keys(S.work.staffing[S.posOfUser(u.id)] || {})[0])}${U.avatar(u.id, 16, 'av-xs')}<span class="nm">${U.esc(S.chatName(u.id))}</span></span>` : ''}
          </div>
          <p class="small muted mt-1 mb-0">${U.icon('shield')} รูปโปรไฟล์และชื่อเล่นเห็นได้โดยสมาชิกในห้องแชทเดียวกันและเจ้าหน้าที่ — ใช้รูปที่เหมาะสม</p>
        </div>
      </div></section>`;
    const save = (patch, msg) => { try { S.updateMyProfile(patch); U.toast(msg); U.renderChrome('/profile'); view(); } catch (e) { U.toast(e.message, true); } };
    U.$('#pfFile').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { save({ avatar: await squareImage(f) }, 'อัปเดตรูปโปรไฟล์แล้ว'); } catch (err) { U.toast(err.message, true); }
    };
    U.$('#pfDel') && (U.$('#pfDel').onclick = () => { if (confirm('ลบรูปโปรไฟล์?')) save({ avatar: null }, 'ลบรูปโปรไฟล์แล้ว'); });
    U.$('#pfForm').onsubmit = (e) => { e.preventDefault(); save({ nickname: U.$('#pfNick').value }, 'บันทึกชื่อเล่นแล้ว'); };
  }

  EXT.routes.profile = view;
})();
