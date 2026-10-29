/* ข้อมูลตัวอย่างสำหรับโหมดสาธิต (CONFIG.BACKEND = 'local') เท่านั้น — ระบบจริงไม่ใช้ไฟล์นี้ */
function buildDemoDb(hash) {
  const U = CoreUtil;
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const db = { users: [], applications: [], announcements: [] };
  let actor = null;
  const S = createCore({ env: 'client', db: () => db, user: () => actor, now: () => Date.now(), uid });
  const asAdmin = (fn) => { const prev = actor; actor = db.users.find(u => u.role === 'admin'); try { return fn(); } finally { actor = prev; } };
  const at = (s) => Date.parse(s + '+07:00');

  /* ---- ผู้สมัคร ---- */
  const first = ['ณัฐวุฒิ','ปิยะพร','กิตติพัศ','ศุภิสรา','ธนกฤต','พิมพ์ชนก','ภูริณัฐ','ชนิดาภา','วรเมธ','อริสา','ธีรภัทร','กัญญาณัฐ','ปณิธิ','สุพิชญา','ณภัทร','จิรัชยา','ภาคิน','ณัฐณิชา','พีรวิชญ์','เบญญาภา','ศิวกร','ปาริชาต','ธนพล','ชญานิษฐ์','รัชพล','ภัทรวดี','กฤตเมธ','วริศรา','สิรวิชญ์','พรรษา','อนุชิต','ญาณิศา','ตะวัน','ลลิตา','ปกรณ์','มนัสนันท์'];
  const last = ['ศรีสุข','วงศ์ใหญ่','แก้วมณี','ทองดี','สุขประเสริฐ','จันทร์เพ็ญ','บุญมา','รุ่งเรือง','พงษ์ศิริ','ใจดี','ศักดิ์สิทธิ์','มั่นคง'];
  const plan = [
    { pos: 'reception', fac: ['คณะศึกษาศาสตร์','คณะมนุษยศาสตร์','คณะสังคมศาสตร์','คณะเศรษฐศาสตร์','คณะวิศวกรรมศาสตร์','คณะวิทยาศาสตร์'], major: ['การศึกษาปฐมวัย','ภาษาอังกฤษ','การจัดการ','เศรษฐศาสตร์','วิศวกรรมคอมพิวเตอร์','เคมี'] },
    { pos: 'trainer', fac: ['คณะพลศึกษา'], major: ['วิทยาศาสตร์การกีฬา','พลศึกษา','การจัดการกีฬา'] },
    { pos: 'lifeguard', fac: ['คณะพลศึกษา'], major: ['พลศึกษา','นันทนาการ','วิทยาศาสตร์การกีฬา'] },
    { pos: 'firstaid', fac: ['คณะพยาบาลศาสตร์','คณะแพทยศาสตร์','คณะเภสัชศาสตร์','คณะกายภาพบำบัด'], major: ['พยาบาลศาสตร์','แพทยศาสตร์','เภสัชศาสตร์','กายภาพบำบัด'] }
  ];
  const statuses = ['passed','passed','passed','interview','verified','submitted','submitted','revise','failed','passed','verified','draft'];
  const start = at('2026-08-17T09:00:00');
  db.users.push({ id: 'admin', role: 'admin', email: 'admin@swu.ac.th', name: 'เจ้าหน้าที่ศูนย์กีฬา', password: hash('admin1234'), createdAt: start });
  // ตัวอย่างคำขอบัญชีเจ้าหน้าที่ที่รออนุมัติ (เมนู เจ้าหน้าที่)
  db.users.push({ id: uid(), role: 'officer_pending', email: 'somsri.j@g.swu.ac.th', name: 'นางสาวสมศรี ใจงาม', title: 'นักวิชาการศึกษา', phone: '0812223344', password: hash('demo1234'), createdAt: Date.now() - 36e5 * 3 });
  // ผู้สมัคร 64 คน (ชื่อ × นามสกุลหมุนเวียน) — พอให้มีนิสิตช่วยงานฝ่ายละ 10 คน และยังเหลือผู้สมัครสถานะอื่นให้ทดลอง
  Array.from({ length: 64 }, (_, i) => first[i % first.length]).forEach((f, i) => {
    const p = plan[i % 4 === 3 && i % 3 === 0 ? 0 : i % 4];
    const sid = '6' + (5 + (i % 4)) + '1' + String(100000000 + i * 7919).slice(-8);
    const userId = uid(), created = start + i * 36e5 * 11, status = statuses[i % statuses.length];
    db.users.push({ id: userId, role: 'applicant', email: `${sid}@g.swu.ac.th`, studentId: sid, password: hash('demo1234'), createdAt: created });
    const docsOk = status !== 'draft' && status !== 'revise';
    const doc = (name) => [{ name, type: 'image/jpeg', size: 182000, data: null, uploadedAt: created + 36e5 }];
    db.applications.push({
      id: uid(), userId, status, createdAt: created, submittedAt: status === 'draft' ? null : created + 36e5 * 2, updatedAt: created + 36e5 * 30,
      profile: {
        fullName: `${i % 2 ? 'นางสาว' : 'นาย'}${f} ${last[(i + Math.floor(i / first.length) * 5) % last.length]}`, gender: i % 2 ? 'หญิง' : 'ชาย', studentId: sid,
        year: String(1 + (i % 4)), faculty: p.fac[i % p.fac.length], major: p.major[i % p.major.length],
        lineId: 'line_' + sid.slice(-4), phone: '08' + String(10000000 + i * 271828).slice(-8),
        experience: i % 3 ? 'เคยเป็นนิสิตช่วยงานศูนย์กีฬาสิรินธร ปี 2568' : 'ช่วยงานกิจกรรมคณะ และงานกีฬามหาวิทยาลัย',
        skills: [SKILLS[i % SKILLS.length], SKILLS[(i + 3) % SKILLS.length]], skillsOther: '',
        certText: p.pos === 'lifeguard' ? 'ใบผ่านการอบรม Life Guard' : p.pos === 'firstaid' ? 'CPR & AED Basic Life Support' : '',
        position1: p.pos, position2: i % 5 === 0 ? 'reception' : ''
      },
      docs: docsOk ? { studentCard: doc('student-card.jpg'), idCard: doc('id-card.jpg'), bankBook: doc('scb-book.jpg'), certificates: [] }
                   : { studentCard: doc('student-card.jpg'), idCard: [], bankBook: [], certificates: [] },
      adminNote: status === 'revise' ? 'กรุณาแนบหน้าสมุดบัญชี SCB ให้เห็นเลขบัญชีชัดเจน' : '',
      resultPosition: status === 'passed' ? p.pos : ''
    });
  });
  // ให้มีนิสิตช่วยงานพอสำหรับจัดเวร (มากกว่าจำนวนต่อวัน เพื่อให้เห็นการหมุนเวียน)
  const TARGET = { reception: 10, trainer: 10, lifeguard: 10, firstaid: 10 };   // นิสิตช่วยงานฝ่ายละ 10 คน
  const pool = () => db.applications.filter(a => ['interview', 'verified', 'submitted'].includes(a.status));
  Object.keys(TARGET).forEach(pos => {
    let need = TARGET[pos] - db.applications.filter(a => a.status === 'passed' && a.resultPosition === pos).length;
    pool().sort((a, b) => (b.profile.position1 === pos) - (a.profile.position1 === pos)).forEach(a => {
      if (need-- <= 0) return;
      Object.assign(a, { status: 'passed', resultPosition: pos }); a.profile.position1 = pos;
    });
    // เกินจำนวน → ย้ายไปรอสัมภาษณ์
    db.applications.filter(a => a.status === 'passed' && a.resultPosition === pos).slice(TARGET[pos]).forEach(a => Object.assign(a, { status: 'interview', resultPosition: '' }));
  });

  Object.assign(db.settings = {}, { forceOpen: true, resultsPublished: true });
  db.announcements = [
    { id: uid(), title: 'ประกาศรายชื่อผู้ผ่านการคัดเลือกนิสิตช่วยงาน ปีการศึกษา 2569', body: 'ผู้ผ่านการคัดเลือกเข้าร่วมปฐมนิเทศและอบรมนิสิตช่วยงาน ณ ศูนย์กีฬาสิรินธร ตามวันเวลาที่แจ้งในห้องแชทนิสิตช่วยงาน', pinned: true, createdAt: at('2026-09-12T10:00:00') },
    { id: uid(), title: 'ประกาศรายชื่อผู้มีสิทธิ์สัมภาษณ์', body: 'สัมภาษณ์วันที่ 8 กันยายน 2569 ณ อาคารศูนย์กีฬาสิรินธร โปรดแต่งกายด้วยชุดนิสิตให้เรียบร้อย', pinned: false, createdAt: at('2026-09-05T10:00:00') },
    { id: uid(), title: 'เปิดรับสมัครนิสิตช่วยงาน 17 สิงหาคม – 2 กันยายน 2569', body: 'รับสมัคร 4 ตำแหน่ง ได้แก่ ธุรการ ผู้ฝึกสอนออกกำลังกาย ชีวภัยทางน้ำ และปฐมพยาบาล', pinned: false, createdAt: at('2026-08-17T09:00:00') }
  ];
  S.normalize();
  db.work.settings.allowOutside = true;   // สาธิตจากที่ไหนก็ได้

  /* ---- แชท ---- */
  const adminId = 'admin';
  const sub = db.applications.filter(a => a.status !== 'draft'), passed = db.applications.filter(a => a.status === 'passed');
  const pick = (list, i) => list[i % list.length];
  const kr = (a) => a.profile.gender === 'หญิง' ? 'ค่ะ' : 'ครับ', ka = (a) => a.profile.gender === 'หญิง' ? 'คะ' : 'ครับ';
  const add = (room, ts, userId, body) => { const m = Object.assign({ id: uid(), room, userId, ts: at(ts), type: 'text' }, body); db.chats[room].messages.push(m); return m; };
  const A = (i) => pick(sub, i), P = (i) => pick(passed, i);
  add('applicants', '2026-08-17T09:00:00', null, { type: 'system', text: 'เปิดห้องผู้สมัครนิสิตช่วยงาน ปีการศึกษา 2569' });
  add('applicants', '2026-08-17T09:05:00', adminId, { type: 'announce', text: 'ยินดีต้อนรับน้อง ๆ ผู้สมัครนิสิตช่วยงาน ศูนย์กีฬาสิรินธร ปีการศึกษา 2569\nห้องนี้ใช้แจ้งข่าวสาร วันเวลาสัมภาษณ์ และตอบคำถามก่อนสัมภาษณ์ สงสัยอะไรถามได้เลยนะ' });
  add('applicants', '2026-08-17T09:06:00', adminId, { type: 'sticker', sticker: 'hi' });
  add('applicants', '2026-08-18T19:12:00', A(0).userId, { text: `สวัสดี${kr(A(0))} ขอสอบถามว่าสำเนาบัตรนิสิตต้องเซ็นรับรองสำเนาถูกต้องไหม${ka(A(0))}` });
  add('applicants', '2026-08-18T19:30:00', adminId, { text: 'ต้องเซ็นรับรองสำเนาถูกต้องทุกฉบับนะ ถ่ายรูปให้ชัด เห็นตัวหนังสือครบ' });
  add('applicants', '2026-08-18T19:31:00', A(0).userId, { type: 'sticker', sticker: 'thanks' });
  add('applicants', '2026-08-21T20:02:00', A(1).userId, { text: `ถ้ายังไม่มีบัญชี SCB ต้องทำยังไง${ka(A(1))}` });
  add('applicants', '2026-08-21T20:15:00', adminId, { text: 'เปิดบัญชี SCB ใหม่ได้เลย ใช้สำหรับโอนค่าตอบแทน แนบหน้าสมุดบัญชีให้ทันก่อนวันปิดรับสมัคร (2 ก.ย.) นะ' });
  add('applicants', '2026-08-21T20:16:00', A(1).userId, { type: 'sticker', sticker: 'ok' });
  db.chats.applicants.pinned = add('applicants', '2026-09-05T10:00:00', adminId, { type: 'announce', text: 'นัดสัมภาษณ์ วันอังคารที่ 8 กันยายน 2569 เวลา 13.00 น.\nณ ศูนย์กีฬาสิรินธร มศว องครักษ์\n- แต่งกายชุดนิสิตให้เรียบร้อย และนำบัตรนิสิตมาด้วย\n- ตำแหน่ง Life Guard มีทดสอบว่ายน้ำ เตรียมชุดว่ายน้ำมาด้วย' }).id;
  add('applicants', '2026-09-05T10:20:00', A(2).userId, { type: 'sticker', sticker: 'fight' });
  add('applicants', '2026-09-05T21:40:00', A(3).userId, { text: `ต้องเตรียมอะไรไปสัมภาษณ์เพิ่มไหม${ka(A(3))}` });
  add('applicants', '2026-09-05T21:52:00', adminId, { text: 'เตรียมแนะนำตัวสั้น ๆ และเล่าว่าทำไมอยากทำตำแหน่งที่สมัคร มีใบอบรมหรือเกียรติบัตรนำมาด้วยได้เลย' });
  add('applicants', '2026-09-05T21:53:00', A(3).userId, { type: 'sticker', sticker: 'omg' });
  add('applicants', '2026-09-07T20:00:00', adminId, { type: 'sticker', sticker: 'luck' });
  add('staff', '2026-09-12T10:05:00', null, { type: 'system', text: 'เปิดห้องนิสิตช่วยงาน ปีการศึกษา 2569' });
  db.chats.staff.pinned = add('staff', '2026-09-12T10:10:00', adminId, { type: 'announce', text: 'ยินดีต้อนรับนิสิตช่วยงานปี 2569 ทุกคน\nปฐมนิเทศ วันอังคารที่ 15 กันยายน 2569 เวลา 16.00 น. ห้องประชุมศูนย์กีฬาสิรินธร\nอ่านระเบียบกลางบนหน้าเว็บให้เรียบร้อยก่อนเข้าปฐมนิเทศนะ' }).id;
  add('staff', '2026-09-12T10:12:00', P(0).userId, { type: 'sticker', sticker: 'yay' });
  add('staff', '2026-09-12T10:14:00', P(1).userId, { type: 'sticker', sticker: 'love' });
  add('staff', '2026-10-06T19:48:00', P(2).userId, { text: `วันนี้สนามแบดคนเยอะมาก ปิดสนาม 20.20 น. ตามเดิมใช่ไหม${ka(P(2))}` });
  add('staff', '2026-10-06T19:55:00', adminId, { text: 'ใช่ แจ้งปิด 20.20 น. แล้วปิดไฟสนามกับประตูบานเลื่อนด้วยนะ' });
  add('staff', '2026-10-14T12:30:00', P(3).userId, { text: `ขอแลกเวรวันพฤหัสนี้${kr(P(3))} มีใครว่างไหม${ka(P(3))}` });
  add('staff', '2026-10-14T12:41:00', P(4).userId, { text: `ว่าง${kr(P(4))} เดี๋ยวแลกให้` });
  add('staff', '2026-10-14T12:42:00', P(3).userId, { type: 'sticker', sticker: 'thanks' });
  add('staff', '2026-10-20T16:20:00', P(5).userId, { text: `ตรวจ AED ที่ศูนย์ออกกำลังกายแล้ว พร้อมใช้งาน${kr(P(5))}` });
  add('staff', '2026-10-20T16:25:00', adminId, { type: 'sticker', sticker: 'ok' });
  add('staff', '2026-10-27T16:21:00', P(6).userId, { type: 'sticker', sticker: 'late' });
  add('staff', '2026-10-27T17:05:00', adminId, { text: 'วันนี้ฝนตก ช่วงปิดบริการอย่าลืมปิดประตูทางเข้าอาคารกีฬา 2 ด้วยนะ' });
  // ห้องแยกตามฝ่าย
  const POS_MSG = { reception: 'ใครเห็นกุญแจล็อกเกอร์เบอร์ 12 บ้างไหม หายไปจากเคาน์เตอร์', trainer: 'ลู่วิ่งเครื่องที่ 3 มีเสียงดัง แจ้งพี่ ๆ แล้วนะ ช่วยแปะป้ายงดใช้ไว้ก่อน', lifeguard: 'พรุ่งนี้มีคลาสว่ายน้ำเด็ก ช่วยเตรียมโฟมแท่งเพิ่มด้วยน้า', firstaid: 'ชุดปฐมพยาบาลที่สระ ผ้าก๊อซใกล้หมดแล้ว เดี๋ยวเบิกเพิ่มให้' };
  POSITIONS.forEach((p, k) => {
    const m = passed.filter(a => (a.resultPosition || a.profile.position1) === p.id);
    if (m.length < 2) return;
    add('pos-' + p.id, `2026-10-2${k + 4}T18:1${k}:00`, m[0].userId, { text: POS_MSG[p.id] });
    add('pos-' + p.id, `2026-10-2${k + 4}T18:2${k}:00`, m[1].userId, { type: 'sticker', sticker: 'ok' });
  });
  sub.forEach(a => { db.chatReads[a.userId] = { applicants: at('2026-09-07T21:00:00') }; });
  passed.forEach(a => { db.chatReads[a.userId].staff = at('2026-10-20T17:00:00'); });
  const NICK = ['บีม', 'ฟ้า', 'ต้น', 'มิ้นท์', 'เจ', 'แพรว', 'ภูมิ', 'ใบเตย', 'กัน', 'น้ำหวาน', 'ไอซ์', 'ปาล์ม', 'ออม', 'เฟิร์น', 'บอส', 'แป้ง', 'โอ๊ต', 'ขิม', 'ก้อง', 'มายด์', 'เต้', 'จูน', 'พลอย', 'นัท', 'ข้าวหอม', 'ตูน', 'แนน', 'ฟลุ๊ค', 'เมย์', 'ปั้น', 'อิง', 'โฟกัส', 'ฝ้าย', 'ไผ่', 'กิ๊ฟ', 'เอิร์ธ', 'ปุยฝ้าย', 'บิว', 'น้ำ', 'ต่อ'];
  db.applications.filter(a => a.status === 'passed').forEach((a, i) => { if (i % 4 !== 3) db.users.find(u => u.id === a.userId).nickname = NICK[i % NICK.length]; });   // บางคนไม่ตั้งชื่อเล่น
  db.chatReads[adminId] = { applicants: at('2026-09-08T00:00:00'), staff: at('2026-10-27T12:00:00') };

  /* ---- ตารางเวร: เดือนก่อน + เดือนนี้ยืนยันแล้ว, เดือนหน้าเป็นฉบับร่าง ---- */
  const thisMonth = U.dateKey(Date.now()).slice(0, 7), prev = U.addMonth(thisMonth, -1), next = U.addMonth(thisMonth, 1), next2 = U.addMonth(thisMonth, 2);
  // เดือนก่อน/เดือนนี้/เดือนหน้า ยืนยันแล้ว (ลองแลกเวรได้) · เดือนถัดไปอีกเป็นฉบับร่าง (ลองจัดเวรได้)
  [prev, thisMonth, next].forEach(ym => { db.work.roster[ym] = { status: 'confirmed', generatedAt: U.at(ym + '-01', '09:00') - 7 * 864e5, confirmedAt: U.at(ym + '-01', '09:00') - 5 * 864e5, confirmedBy: adminId, shifts: S._generate(ym) }; });
  db.work.roster[next2] = { status: 'draft', generatedAt: Date.now() - 36e5, shifts: S._generate(next2) };

  /* ---- ประวัติลงเวลา ---- */
  const today = U.dateKey(Date.now()), nowT = U.timeOf(Date.now());
  let k = 1;
  [prev, thisMonth].forEach(ym => db.work.roster[ym].shifts.forEach(s => {
    k = (k * 48271) % 2147483647;
    const r = k / 2147483647;
    if (s.date > today || (s.date === today && nowT < '16:40') || r < 0.03) return;
    const inMin = 16 * 60 + 8 + Math.floor(r * 26) + (r > 0.93 ? 12 : 0), outMin = 20 * 60 + 24 + Math.floor((r * 997 % 1) * 14);
    const hm = (m) => `${U.pad(Math.floor(m / 60))}:${U.pad(m % 60)}`;
    const g = () => ({ lat: 14.1062 + (r - .5) * .002, lng: 100.9907 + (r - .5) * .002, acc: 12 + Math.round(r * 20), dist: Math.round(40 + r * 160), inside: true });
    const rec = { id: uid(), userId: s.userId, date: s.date, kind: 'shift', ref: s.id, position: s.position, location: s.location, title: U.locName(s.location),
      in: Object.assign({ ts: U.at(s.date, hm(inMin)), face: { matched: true, distance: +(0.28 + r * 0.15).toFixed(2) }, photo: null }, g()) };
    if (s.date < today || nowT >= '20:40') rec.out = Object.assign({ ts: U.at(s.date, hm(outMin)), face: { matched: true, distance: +(0.3 + r * 0.12).toFixed(2) }, photo: null }, g());
    db.work.attendance.push(rec);
  }));

  /* ---- งานเพิ่มเติม + แจ้งเตือน + คำขอสิ้นสุดการทำงาน ---- */
  const plus = (n) => U.dateKey(Date.now() + n * 864e5);
  const staffIds = passed.map(a => a.userId).concat(db.applications.filter(a => a.status === 'passed' && !passed.includes(a)).map(a => a.userId));
  asAdmin(() => {
    const j1 = S.createJob({ title: 'ช่วยงานรับลงทะเบียน แข่งขันว่ายน้ำ SWU Open', detail: 'เจ้าหน้าที่ติดประชุม ต้องการนิสิตช่วยรับลงทะเบียนนักกีฬาและแจกเบอร์ ณ โต๊ะหน้าอาคาร', date: plus(3), start: '08:00', end: '12:00', location: 'อาคารฝึกปฏิบัติการกีฬาทางน้ำ', slots: 3 });
    j1.takers.push({ userId: staffIds[0], ts: Date.now() - 80e6 });
    S.createJob({ title: 'ดูแลเคาน์เตอร์ศูนย์ออกกำลังกาย (แทนเจ้าหน้าที่)', detail: 'เจ้าหน้าที่ประจำเคาน์เตอร์ติดประชุมคณะ ช่วยแจกบัตรคิวและเก็บค่าบริการ', date: plus(6), start: '13:00', end: '16:30', location: 'ศูนย์ออกกำลังกาย มศว', slots: 1 });
  });
  db.work.outbox = [];   // ไม่นับอีเมลตอนสร้างข้อมูลตัวอย่าง
  // การ์ดตารางเวรเดือนนี้ในห้องนิสิตช่วยงาน (ตามเวลาที่ยืนยัน) แล้วเรียงข้อความตามเวลา
  db.chats.staff.messages.push({ id: uid(), room: 'staff', userId: adminId, ts: db.work.roster[thisMonth].confirmedAt, type: 'card',
    card: { kind: 'roster', ref: thisMonth, title: `ตารางเวรเดือน${U.thMonth(thisMonth)} ยืนยันแล้ว`, text: 'เวลา 16:30–20:30 น. · กดเพื่อดูวันและสถานที่ทำงานของคุณ' } });
  db.chats.staff.messages.sort((a, b) => a.ts - b.ts);
  // ตัวอย่างประกาศขอแลกเวร 1 รายการ (ธุรการ เดือนหน้า)
  const swapper = S.staffOf('reception')[2];
  const swShift = swapper && db.work.roster[next].shifts.find(s => s.userId === swapper.userId);
  if (swShift) { actor = db.users.find(u => u.id === swapper.userId); try { S.requestSwap(swShift.id, 'ติดสอบกลางภาควันนั้น ใครว่างช่วยแลกหน่อยน้า 🙏'); } finally { actor = null; } }
  staffIds.forEach(id => S._notify(id, { kind: 'roster', title: `ตารางเวรเดือน${U.thMonth(thisMonth)} ยืนยันแล้ว`, body: 'เข้าไปดูตารางเวรของคุณได้ที่เมนู "งานของฉัน"', link: '#/work/roster', ts: db.work.roster[thisMonth].confirmedAt, read: true }));
  const leaver = staffIds[staffIds.length - 1];
  db.work.exits.push({ id: uid(), userId: leaver, lastDay: plus(-1), reason: 'ฝึกงานต่างจังหวัดภาคเรียนหน้า ไม่สะดวกปฏิบัติงานต่อ', ts: Date.now() - 36e5 * 20, status: 'pending' });
  S._notify(adminId, { kind: 'exit', title: `${S.chatName(leaver)} แจ้งสิ้นสุดการทำงาน`, body: 'ฝึกงานต่างจังหวัดภาคเรียนหน้า ไม่สะดวกปฏิบัติงานต่อ', link: '#/admin/certificates', ts: Date.now() - 36e5 * 20 });
  S.runDailyReminders();
  return db;
}
