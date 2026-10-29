/* CORE: ผู้ใช้ ใบสมัคร ประกาศ และการตั้งค่ารับสมัคร
   สิทธิ์ถูกตรวจในนี้ทั้งหมด จึงปลอดภัยเมื่อ server เรียกใช้โค้ดเดียวกัน */
defineCoreModule(['saveSettings', 'updateApp', 'submitApplication', 'reviewApplication', 'addAnnouncement', 'removeAnnouncement', 'togglePin'], function (S, ctx, api) {
  const U = CoreUtil, need = U.need;
  const db = () => ctx.db();
  const me = () => ctx.user();
  const isAdmin = () => me()?.role === 'admin';
  const needAdmin = () => need(isAdmin(), 'เฉพาะเจ้าหน้าที่เท่านั้น');

  const DEFAULT_SETTINGS = {
    academicYear: '2569', openDate: '2026-08-17', closeDate: '2026-09-02', interviewDate: '2026-09-08', resultDate: '2026-09-12',
    forceOpen: false,            // โหมดสาธิต: เปิดรับสมัครตลอด
    resultsPublished: false,
    allowedDomain: ''            // เช่น 'g.swu.ac.th' — จำกัดอีเมลผู้สมัคร (ว่าง = ไม่จำกัด)
  };

  api({
    /* เติมโครงสร้างข้อมูลที่ขาด (ข้อมูลเก่า / snapshot ที่ถูกตัดตามสิทธิ์) */
    normalize() {
      const d = db();
      d.users ||= []; d.applications ||= []; d.announcements ||= [];
      d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings);
      S._normalizeChat?.(); S._normalizeWork?.();
    },
    emptyApp(user) {
      return {
        id: ctx.uid(), userId: user.id, status: 'draft', createdAt: ctx.now(), submittedAt: null, updatedAt: ctx.now(),
        profile: { fullName: '', gender: '', studentId: user.studentId || '', year: '', faculty: '', major: '', lineId: '', phone: '', experience: '', skills: [], skillsOther: '', certText: '', position1: '', position2: '' },
        docs: { studentCard: [], idCard: [], bankBook: [], certificates: [] },
        adminNote: '', resultPosition: ''
      };
    },

    get settings() { return db().settings; },
    saveSettings(s) { needAdmin(); Object.assign(db().settings, s); },
    isOpen() {
      const s = db().settings;
      if (s.forceOpen) return true;
      const now = ctx.now();
      return now >= U.at(s.openDate, '00:00') && now <= U.at(s.closeDate, '23:59');
    },

    currentUser: () => me(),
    users: () => db().users,
    apps: () => db().applications,
    app: (id) => db().applications.find(x => x.id === id),
    appOfUser: (userId) => db().applications.find(a => a.userId === userId) || null,
    userOf: (app) => db().users.find(u => u.id === app.userId),
    myApp() { const u = me(); return u ? S.appOfUser(u.id) : null; },

    /* ผู้สมัครแก้ได้เฉพาะ profile/docs ของตัวเองตอนเป็นร่างหรือถูกขอแก้ — แอดมินแก้ได้ทุกช่อง */
    updateApp(id, patch) {
      const a = S.app(id);
      need(a, 'ไม่พบใบสมัคร');
      if (!isAdmin()) {
        need(a.userId === me()?.id, 'ไม่มีสิทธิ์แก้ไขใบสมัครนี้');
        need(['draft', 'revise'].includes(a.status), 'ใบสมัครถูกส่งแล้ว แก้ไขไม่ได้');
        need(Object.keys(patch).every(k => k === 'profile' || k === 'docs'), 'แก้ไขได้เฉพาะข้อมูลผู้สมัครและเอกสาร');
      }
      Object.assign(a, patch, { updatedAt: ctx.now() });
      return a;
    },
    submitApplication(id) {
      const a = S.app(id);
      need(a && a.userId === me()?.id, 'ไม่มีสิทธิ์');
      need(['draft', 'revise'].includes(a.status), 'ส่งใบสมัครแล้ว');
      need(S.isOpen(), 'ขณะนี้ปิดรับสมัครแล้ว');
      const first = a.status === 'draft';
      Object.assign(a, { status: 'submitted', submittedAt: ctx.now(), updatedAt: ctx.now() });
      if (first) S._systemMessage('applicants', `${S.chatName(a.userId)} เข้าร่วมห้องแล้ว`);
      return a;
    },
    /* แอดมินพิจารณา — ผ่านการคัดเลือกแล้วเข้าห้องนิสิตช่วยงานอัตโนมัติ */
    reviewApplication(id, { status, resultPosition, adminNote }) {
      needAdmin();
      const a = S.app(id);
      need(a && STATUS[status], 'ข้อมูลไม่ถูกต้อง');
      const wasPassed = a.status === 'passed';
      Object.assign(a, { status, resultPosition: resultPosition || '', adminNote: adminNote || '', updatedAt: ctx.now() });
      if (!wasPassed && status === 'passed') S._systemMessage('staff', `${S.chatName(a.userId)} เข้าร่วมห้องนิสิตช่วยงานแล้ว`);
      return a;
    },

    announcements() { return db().announcements.slice().sort((a, b) => (b.pinned - a.pinned) || (b.createdAt - a.createdAt)); },
    addAnnouncement(a) { needAdmin(); db().announcements.push({ id: ctx.uid(), createdAt: ctx.now(), pinned: !!a.pinned, title: String(a.title), body: String(a.body) }); },
    removeAnnouncement(id) { needAdmin(); db().announcements = db().announcements.filter(a => a.id !== id); },
    togglePin(id) { needAdmin(); const a = db().announcements.find(x => x.id === id); if (a) a.pinned = !a.pinned; }
  });
});
