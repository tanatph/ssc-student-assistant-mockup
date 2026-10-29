/* CORE: บัญชีเจ้าหน้าที่ (ระบบหลังบ้าน)
   ลงทะเบียนได้เฉพาะอีเมล @g.swu.ac.th → สถานะ "รออนุมัติ" (role: officer_pending) → แอดมินอนุมัติ → role: admin
   นิสิตก็มีอีเมล @g.swu.ac.th จึงต้องให้แอดมินอนุมัติก่อนเข้าระบบหลังบ้านทุกครั้ง
   ระงับบัญชี = role: officer_disabled (เข้าสู่ระบบไม่ได้ แต่ประวัติยังอยู่) */
defineCoreModule(['approveOfficer', 'rejectOfficer', 'setOfficerActive', 'saveMyPrefs', 'updateMyProfile'], function (S, ctx, api) {
  const need = CoreUtil.need;
  const db = () => ctx.db();
  const me = () => ctx.user();
  const needAdmin = () => need(me()?.role === 'admin', 'เฉพาะเจ้าหน้าที่เท่านั้น');
  const OFFICER_ROLES = ['admin', 'officer_pending', 'officer_disabled'];
  const find = (id) => { const u = db().users.find(x => x.id === id && OFFICER_ROLES.includes(x.role)); need(u, 'ไม่พบบัญชีเจ้าหน้าที่'); return u; };

  api({
    OFFICER_DOMAIN: 'g.swu.ac.th',
    OFFICER_TITLES: ['ผู้อำนวยการศูนย์กีฬาสิรินธร', 'รองผู้อำนวยการ', 'หัวหน้างาน', 'นักวิชาการศึกษา', 'นักวิชาการพัสดุ', 'เจ้าหน้าที่บริหารงานทั่วไป', 'ผู้ปฏิบัติงานบริหาร', 'เจ้าหน้าที่ศูนย์ออกกำลังกาย', 'เจ้าหน้าที่สระว่ายน้ำ'],
    officers: () => db().users.filter(u => OFFICER_ROLES.includes(u.role)).sort((a, b) => (a.role === 'officer_pending' ? 0 : 1) - (b.role === 'officer_pending' ? 0 : 1) || b.createdAt - a.createdAt),
    /* ตรวจข้อมูลและสร้างบัญชีรออนุมัติ — backend ส่งรหัสผ่านที่แฮชแล้วมา (passwordHash) */
    _newOfficer(d) {
      const email = String(d.email || '').trim().toLowerCase();
      const name = String(d.name || '').trim(), title = String(d.title || '').trim(), phone = String(d.phone || '').replace(/[-\s]/g, '');
      need(new RegExp('^[^@\\s]+@' + S.OFFICER_DOMAIN.replace('.', '\\.') + '$').test(email), `ลงทะเบียนได้เฉพาะอีเมล @${S.OFFICER_DOMAIN} เท่านั้น`);
      need(name.length >= 4, 'กรุณากรอกชื่อ-นามสกุล');
      need(title, 'กรุณากรอกตำแหน่ง');
      need(/^0\d{8,9}$/.test(phone), 'เบอร์โทรศัพท์ไม่ถูกต้อง (9–10 หลัก ขึ้นต้นด้วย 0)');
      const exist = db().users.find(u => u.email === email);
      need(!exist, exist && exist.role === 'officer_pending' ? 'อีเมลนี้ส่งคำขอไว้แล้ว รอผู้ดูแลระบบอนุมัติ' : 'อีเมลนี้มีบัญชีอยู่แล้ว');
      const u = { id: ctx.uid(), role: 'officer_pending', email, name: name.slice(0, 100), title: title.slice(0, 100), phone, password: d.passwordHash, createdAt: ctx.now() };
      db().users.push(u);
      S._adminIds().forEach(id => {
        S._notify(id, { kind: 'officer', title: 'มีเจ้าหน้าที่ขอเข้าใช้ระบบหลังบ้าน', body: `${u.name} · ${u.title} · ${u.email}`, link: '#/admin/officers' });
        S._email(id, '[ศูนย์กีฬาสิรินธร] คำขอบัญชีเจ้าหน้าที่ใหม่', 'มีเจ้าหน้าที่ขอเข้าใช้ระบบหลังบ้าน ตรวจสอบว่าเป็นเจ้าหน้าที่จริงก่อนอนุมัติ', 'officer', {
          card: { title: 'คำขอบัญชีเจ้าหน้าที่', rows: [['ชื่อ-นามสกุล', u.name], ['ตำแหน่ง', u.title], ['อีเมล', u.email], ['โทร', u.phone]] }, link: '#/admin/officers', button: 'ตรวจสอบและอนุมัติ' });
      });
      return u;
    },
    approveOfficer(id) {
      needAdmin();
      const u = find(id);
      need(u.role === 'officer_pending', 'บัญชีนี้ไม่ได้รออนุมัติ');
      Object.assign(u, { role: 'admin', approvedAt: ctx.now(), approvedBy: me().id });
      S._email(u.id, '[ศูนย์กีฬาสิรินธร] บัญชีเจ้าหน้าที่ได้รับอนุมัติแล้ว', `เรียน ${u.name}\n\nบัญชีเจ้าหน้าที่ของคุณได้รับอนุมัติแล้ว เข้าสู่ระบบหลังบ้านด้วยอีเมล ${u.email} และรหัสผ่านที่ตั้งไว้`, 'officer', { link: '#/admin', button: 'เข้าสู่ระบบหลังบ้าน' });
    },
    /* ไม่อนุมัติ = ลบคำขอ (สมัครใหม่ได้) */
    rejectOfficer(id) {
      needAdmin();
      const u = find(id);
      need(u.role === 'officer_pending', 'ลบได้เฉพาะคำขอที่รออนุมัติ');
      db().users = db().users.filter(x => x.id !== id);
    },
    setOfficerActive(id, active) {
      needAdmin();
      const u = find(id);
      need(u.id !== me().id, 'ระงับบัญชีของตัวเองไม่ได้');
      need(u.role !== 'officer_pending', 'บัญชีนี้ยังรออนุมัติ');
      if (!active) need(db().users.filter(x => x.role === 'admin').length > 1, 'ต้องมีเจ้าหน้าที่ที่ใช้งานได้อย่างน้อย 1 คน');
      u.role = active ? 'admin' : 'officer_disabled';
    },
    /* การตั้งค่าส่วนตัวของผู้ใช้ (เช่น หน้าตาแดชบอร์ด) — บันทึกที่บัญชี ใช้ได้ทุกเครื่อง */
    saveMyPrefs(key, value) {
      const u = me();
      need(u, 'กรุณาเข้าสู่ระบบ');
      need(/^[a-z][\w-]{0,30}$/.test(key), 'ชื่อการตั้งค่าไม่ถูกต้อง');
      need(JSON.stringify(value || null).length < 8000, 'การตั้งค่าใหญ่เกินไป');
      u.prefs = Object.assign({}, u.prefs, { [key]: value });
    },
    /* โปรไฟล์ของฉัน: ชื่อเล่น + รูปโปรไฟล์ (สี่เหลี่ยมจัตุรัสขนาดเล็ก ย่อในเบราว์เซอร์ก่อนส่ง) — แสดงในแชทและตารางเวร */
    updateMyProfile({ nickname, avatar }) {
      const u = me();
      need(u, 'กรุณาเข้าสู่ระบบ');
      if (nickname !== undefined) {
        const n = String(nickname || '').trim().replace(/\s+/g, ' ');
        need(n.length <= 20, 'ชื่อเล่นยาวไม่เกิน 20 ตัวอักษร');
        need(!/[<>]/.test(n), 'ชื่อเล่นมีอักขระที่ไม่อนุญาต');
        u.nickname = n;
      }
      if (avatar !== undefined) {
        need(avatar === null || (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar) && avatar.length <= 24000), 'รูปโปรไฟล์ไม่ถูกต้องหรือใหญ่เกินไป');
        u.avatar = avatar || null;
      }
    },
    avatarOf: (userId) => (db().users.find(x => x.id === userId) || {}).avatar || null,
    myPrefs: (key) => (me() && me().prefs && me().prefs[key]) || null,
    /* ข้อความเมื่อบัญชีเจ้าหน้าที่ยังเข้าระบบไม่ได้ (ใช้ตอน login ทั้งสอง backend) */
    loginBlock(u) {
      if (u.role === 'officer_pending') return 'บัญชีเจ้าหน้าที่ยังรอผู้ดูแลระบบอนุมัติ';
      if (u.role === 'officer_disabled') return 'บัญชีนี้ถูกระงับการใช้งาน ติดต่อผู้ดูแลระบบ';
      return '';
    }
  });
});
