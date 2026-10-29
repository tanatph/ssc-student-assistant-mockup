/* หน้าคู่มือการใช้งาน (หลังเข้าสู่ระบบ) — เนื้อหาอยู่ใน manual-data.js
   ภาพหน้าจอ: assets/manual/*.jpg (npm run manual) · วิดีโอ: assets/manual/video/*.webm (npm run manual:video) */
(function () {
  const U = window.UI;
  const IMG = 'assets/manual/';
  const mk = (html) => html.replace(/\{(\d+)\}/g, '<span class="mk">$1</span>');
  const videos = () => (typeof MANUAL_VIDEOS !== 'undefined' ? MANUAL_VIDEOS : {});

  function videoBlock(id, title) {
    const v = videos()[id];
    if (!v) return '';
    return `<div class="mv">
      <video controls preload="metadata" playsinline src="${IMG}video/${id}.webm" poster="${IMG}video/${id}.jpg"></video>
      <div><h3>▶ วิดีโอสอน: ${U.esc(title)} <small class="muted">(ประมาณ ${Math.max(1, Math.round(v.sec / 10) * 10)} วินาที)</small></h3>
        <ul><li>ทำตามขั้นตอนบนหน้าจอจริง ตัวเลขในวิดีโอตรงกับข้อด้านล่าง</li><li>มีเสียงบรรยายภาษาไทยและคำบรรยายบนจอ · ไม่ได้ยินเสียง? ตรวจว่าเปิดเสียงเครื่องแล้ว</li></ul></div>
    </div>`;
  }

  function render(target, kind, opts = {}) {
    const M = MANUAL[kind];
    const overview = kind === 'student' ? `
      <section class="m-part" id="m-overview">
        <div class="m-ph"><span class="no">★</span><div><h2>ภาพรวม</h2><p>เส้นทางของนิสิตช่วยงานในระบบ</p></div></div>
        <div class="m-flow">${['สมัคร + แนบเอกสาร', 'ห้องแชทผู้สมัคร / สัมภาษณ์', 'ผ่านการคัดเลือก', 'ทำงานตามตารางเวร + สแกนหน้า', 'แจ้งสิ้นสุดการทำงาน → ใบประกาศ'].map((t, i) => `${i ? '<span class="arrow">→</span>' : ''}<span class="st">${t}</span>`).join('')}</div>
        <div class="m-cols">
          <div class="m-role r1"><b>ผู้สมัคร</b><p>ลงทะเบียน กรอกใบสมัคร แนบเอกสาร ติดตามสถานะ และถาม-ตอบในห้องผู้สมัคร</p></div>
          <div class="m-role r2"><b>นิสิตช่วยงาน</b><p>ดูเวร ลงเวลาเข้า–ออกด้วยสแกนหน้า รับงานเพิ่มเติม คุยในห้องนิสิตช่วยงาน</p></div>
          <div class="m-role r3"><b>พี่ ๆ แอดมิน</b><p>คัดเลือก จัดเวร ตรวจการลงเวลา ประกาศข่าว และออกใบประกาศ</p></div>
        </div>
        <div class="box warn"><b>ระเบียบสำคัญ</b><ul>${RULES.general.slice(0, 4).map(r => `<li>${r}</li>`).join('')}<li>${RULES.lateFine}</li></ul></div>
      </section>` : '';
    target.innerHTML = `
      <div class="manual ${opts.embedded ? 'embedded' : ''}">
        <header class="m-top"><div class="wrap">
          <div class="m-logos"><img src="assets/images/ssc-logo.png" alt="ศูนย์กีฬาสิรินธร"><img src="assets/images/swu-logo.jpg" alt="มศว"></div>
          <div class="eyebrow" style="color:#fff">${U.chev()} Manual</div>
          <h1>${M.title}</h1><p>${M.sub}</p>
          <div class="flex mt-2">${opts.switcher ? `<a class="btn btn-sm m-sw" href="#/admin/manual-student">คู่มือนิสิตช่วยงาน</a><a class="btn btn-sm m-sw" href="#/admin/manual">คู่มือแอดมิน</a>` : ''}<button class="btn btn-sm m-sw" id="mPrint">${U.icon('download')} พิมพ์ / PDF</button></div>
        </div></header>
        <nav class="m-toc"><div class="wrap">${kind === 'student' ? '<a href="#m-overview" data-jump>ภาพรวม</a>' : ''}${M.parts.map((p, i) => `<a href="#m-${p.id}" data-jump>${i + 1}. ${p.title}</a>`).join('')}<a href="#m-faq" data-jump>คำถามที่พบบ่อย</a></div></nav>
        <div class="wrap">
          ${overview}
          ${M.parts.map((p, i) => `
          <section class="m-part" id="m-${p.id}">
            <div class="m-ph"><span class="no">${i + 1}</span><div><h2>${p.title}</h2><p>${p.lead}</p></div></div>
            ${videoBlock(p.id, p.title)}
            <div class="m-steps">${p.steps.map((s, j) => `
              <article class="m-step ${s.shot && s.shot.size === 'd' ? 'wide' : ''}">
                <figure><img src="${IMG}${s.img}.jpg" alt="${U.esc(s.title)}" loading="lazy" onerror="this.closest('figure').classList.add('noimg')"><figcaption>ภาพหน้าจอ — กดเพื่อขยาย</figcaption></figure>
                <div><div class="t"><span class="n">${j + 1}</span><h3>${s.title}</h3></div>
                  <p>${mk(s.html)}</p>
                  ${s.note ? `<div class="m-note ${s.note[0]}">${mk(s.note[1])}</div>` : ''}</div>
              </article>`).join('')}</div>
          </section>`).join('')}
          <section class="m-part" id="m-faq">
            <div class="m-ph"><span class="no">?</span><div><h2>คำถามที่พบบ่อย</h2><p>ยังติดปัญหา? ถามพี่ ๆ ในห้องแชทได้เลย</p></div></div>
            ${M.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
          </section>
        </div>
        <div class="m-lb" id="mLb" hidden><img alt=""></div>
      </div>`;
    const lb = U.$('#mLb', target);
    target.querySelector('.manual').addEventListener('click', (e) => {
      const im = e.target.closest('.m-step img');
      if (im) { U.$('img', lb).src = im.src; lb.hidden = false; return; }
      if (e.target.closest('#mLb')) lb.hidden = true;
      const j = e.target.closest('[data-jump]');
      if (j) { e.preventDefault(); document.querySelector(j.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    /* WebM ที่บันทึกจากเบราว์เซอร์ไม่มีความยาวในไฟล์ → กระโดดไปท้ายไฟล์ 1 ครั้งให้เบราว์เซอร์รู้ความยาว แถบเลื่อนจึงใช้ได้ */
    U.$$('.mv video', target).forEach(v => v.addEventListener('loadedmetadata', () => {
      if (v.duration !== Infinity) return;
      v.currentTime = 1e7;
      v.addEventListener('timeupdate', function fix() { v.removeEventListener('timeupdate', fix); v.currentTime = 0; });
    }, { once: true }));
    U.$('#mPrint', target).onclick = () => window.print();
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.hidden = true; }, { once: true });
  }

  /* นิสิต/ผู้สมัคร: #/manual · แอดมิน: แท็บในหน้าแอดมิน */
  EXT.routes.manual = () => {
    const u = Store.currentUser();
    if (!u) { U.toast('กรุณาเข้าสู่ระบบเพื่อดูคู่มือ', true); location.hash = '#/login'; return; }
    if (u.role === 'admin') { location.hash = '#/admin/manual'; return; }
    render(U.app, 'student');
  };
  EXT.adminTabs.push(
    { id: 'manual', label: 'คู่มือการใช้งาน', icon: 'file', view: (main) => render(main, 'admin', { embedded: true, switcher: true }) },
    { id: 'manual-student', label: '', icon: 'file', hidden: true, view: (main) => render(main, 'student', { embedded: true, switcher: true }) }
  );
  window.renderManual = render;
})();
