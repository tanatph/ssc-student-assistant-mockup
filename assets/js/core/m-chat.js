/* CORE: ห้องแชท — สิทธิ์เข้าห้องกำหนดใน content.js (CHAT_ROOMS.access) แอดมินเข้าได้ทุกห้อง */
defineCoreModule(['sendMessage', 'deleteMessage', 'pinMessage', 'setLocked', 'markRead'], function (S, ctx, api) {
  const need = CoreUtil.need;
  const db = () => ctx.db();
  const me = () => ctx.user();

  api({
    _normalizeChat() {
      const d = db();
      d.chats ||= {};
      CHAT_ROOMS.forEach(r => { d.chats[r.id] = Object.assign({ pinned: null, locked: false, messages: [] }, d.chats[r.id]); });
      d.chatReads ||= {};
    },
    canChat(user, roomId) {
      if (!user) return false;
      if (user.role === 'admin') return true;
      const room = CHAT_ROOMS.find(r => r.id === roomId);
      return !!room && room.access(S.appOfUser(user.id));
    },
    chatRooms: (user) => CHAT_ROOMS.filter(r => S.canChat(user, r.id)),
    room: (roomId) => db().chats[roomId],
    messages: (roomId) => db().chats[roomId].messages,
    members: (roomId) => db().users.filter(u => S.canChat(u, roomId)),
    chatName(userId) {
      const u = db().users.find(x => x.id === userId);
      if (!u) return 'ผู้ใช้';
      const nick = String(u.nickname || '').trim();
      if (nick) return u.role === 'admin' ? 'พี่' + nick : nick;   // ชื่อเล่นที่ตั้งในโปรไฟล์
      if (u.role === 'admin') { const n = String(u.title ? u.name || '' : '').replace(/^(นางสาว|นาย|นาง|ดร\.|ผศ\.|รศ\.)\s*/, '').trim().split(/\s+/)[0]; return n ? 'พี่' + n : 'พี่แอดมิน'; }
      const n = (S.appOfUser(userId)?.profile.fullName || '').replace(/^(นางสาว|นาย|นาง)/, '').trim();
      return n ? n.split(/\s+/)[0] : (u.email || '').split('@')[0];
    },
    sendMessage(roomId, body) {
      const u = me(), r = db().chats[roomId];
      need(S.canChat(u, roomId), 'คุณไม่มีสิทธิ์ในห้องนี้');
      need(!r.locked || u.role === 'admin', 'ห้องนี้เปิดให้แอดมินส่งข้อความเท่านั้น');
      const type = body.type === 'sticker' ? 'sticker' : body.type === 'announce' && u.role === 'admin' ? 'announce' : 'text';
      const m = { id: ctx.uid(), room: roomId, userId: u.id, ts: ctx.now(), type };
      if (type === 'sticker') m.sticker = String(body.sticker).slice(0, 20);
      else { m.text = String(body.text || '').slice(0, 1000); need(m.text.trim(), 'ข้อความว่าง'); }
      r.messages.push(m);
      if (type === 'announce') r.pinned = m.id;   // ประกาศถูกปักหมุดอัตโนมัติ
      S._markRead(roomId);
      return m;
    },
    /* การ์ดลิงก์ในแชท (ตารางเวร / งานเพิ่มเติม) — card: { kind: 'roster' | 'job', ref, title, text } */
    _postCard(roomId, card) {
      const u = me();
      db().chats[roomId].messages.push({ id: ctx.uid(), room: roomId, userId: u ? u.id : null, ts: ctx.now(), type: 'card', card });
    },
    _systemMessage(roomId, text) { db().chats[roomId].messages.push({ id: ctx.uid(), room: roomId, userId: null, ts: ctx.now(), type: 'system', text }); },
    deleteMessage(roomId, id) {
      const u = me(), r = db().chats[roomId];
      const m = r.messages.find(x => x.id === id);
      need(m && u && (u.role === 'admin' || m.userId === u.id), 'ไม่มีสิทธิ์ลบข้อความนี้');
      Object.assign(m, { type: 'deleted', text: '', sticker: null, deletedBy: u.role === 'admin' && m.userId !== u.id ? 'admin' : 'self' });
      if (r.pinned === id) r.pinned = null;
    },
    pinMessage(roomId, id) { need(me()?.role === 'admin', 'เฉพาะแอดมิน'); const r = db().chats[roomId]; r.pinned = r.pinned === id ? null : id; },
    setLocked(roomId, v) {
      need(me()?.role === 'admin', 'เฉพาะแอดมิน');
      db().chats[roomId].locked = !!v;
      S._systemMessage(roomId, v ? 'แอดมินล็อกห้อง: ส่งข้อความได้เฉพาะแอดมิน' : 'แอดมินเปิดห้องให้ทุกคนส่งข้อความได้แล้ว');
    },
    markRead(roomId) { S._markRead(roomId); },
    _markRead(roomId) { const u = me(); if (u && S.canChat(u, roomId)) (db().chatReads[u.id] ||= {})[roomId] = ctx.now(); },
    lastRead: (userId, roomId) => db().chatReads[userId]?.[roomId] || 0,
    unread(user, roomId) {
      if (!user || !S.canChat(user, roomId)) return 0;
      const t = S.lastRead(user.id, roomId);
      return db().chats[roomId].messages.filter(m => m.ts > t && m.userId !== user.id && m.type !== 'deleted').length;
    },
    readCount: (roomId, m) => S.members(roomId).filter(u => u.id !== m.userId && S.lastRead(u.id, roomId) >= m.ts).length,
    hasJoinedChat: (app) => !!S.lastRead(app.userId, 'applicants')
  });
});
