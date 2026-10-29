/* สติ๊กเกอร์ "น้องสิริ" — มาสคอตของศูนย์กีฬาสิรินธร วาดด้วย SVG ล้วน (ไม่ต้องใช้ไฟล์รูป) */
(function () {
  const BODY = '#E5323A', SHADE = '#C21F27', INK = '#2B1B1D', CHEEK = '#FF9AA2';

  const arm = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="7.5" ry="11" fill="${SHADE}" transform="rotate(${r} ${x} ${y})"/>`;
  const ARMS = {
    rest: arm(24, 74, 30) + arm(96, 74, -30),
    wave: arm(24, 74, 30) + arm(99, 44, 25),
    up: arm(19, 44, -25) + arm(101, 44, 25),
    together: arm(52, 82, 60) + arm(68, 82, -60),
    salute: arm(24, 74, 30) + arm(88, 40, -65),
    fist: arm(24, 74, 30) + arm(101, 42, 15) + `<circle cx="103" cy="33" r="7" fill="${SHADE}"/>`,
    stop: arm(24, 74, 30) + arm(100, 50, 10) + `<circle cx="102" cy="40" r="8" fill="${SHADE}"/>`
  };

  const dot = (x) => `<circle cx="${x}" cy="58" r="5" fill="${INK}"/><circle cx="${x + 1.6}" cy="56.3" r="1.7" fill="#fff"/>`;
  const arc = (x, up) => `<path d="M${x - 5} 59 Q${x} ${up ? 52 : 63} ${x + 5} 59" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  const heart = (x, y, s = 1, c = '#FF4D6D') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4 C-6 -3 -12 2 -7 8 L0 14 L7 8 C12 2 6 -3 0 4Z" fill="${c}"/>`;
  const sparkle = (x, y, s = 1, c = '#FFC83D') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -8 Q1.5 -1.5 8 0 Q1.5 1.5 0 8 Q-1.5 1.5 -8 0 Q-1.5 -1.5 0 -8Z" fill="${c}"/>`;
  const EYES = {
    dot: dot(46) + dot(74),
    happy: arc(46, true) + arc(74, true),
    closed: arc(46, false) + arc(74, false),
    wink: arc(46, true) + dot(74),
    heart: heart(46, 52, .75) + heart(74, 52, .75),
    star: sparkle(46, 58, .85, '#FFE066') + sparkle(74, 58, .85, '#FFE066'),
    spiral: [46, 74].map(x => `<circle cx="${x}" cy="58" r="6" stroke="${INK}" stroke-width="2.2" fill="#fff"/><circle cx="${x}" cy="58" r="2.4" stroke="${INK}" stroke-width="1.8" fill="none"/>`).join(''),
    shock: [46, 74].map(x => `<circle cx="${x}" cy="57" r="7.5" fill="#fff"/><circle cx="${x}" cy="57" r="2.6" fill="${INK}"/>`).join(''),
    sad: dot(46) + dot(74) + `<path d="M39 50 L51 46 M81 50 L69 46" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    determined: dot(46) + dot(74) + `<path d="M39 49 L52 53 M81 49 L68 53" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
  };
  const MOUTH = {
    smile: `<path d="M53 69 Q60 77 67 69" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
    open: `<path d="M51 68 Q60 84 69 68 Z" fill="${INK}"/><ellipse cx="60" cy="76" rx="4.5" ry="2.6" fill="#FF7A85"/>`,
    small: `<path d="M57 71 Q60 74 63 71" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
    wavy: `<path d="M52 73 q4 -3.5 8 0 t8 0" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
    o: `<ellipse cx="60" cy="73" rx="4" ry="5" fill="${INK}"/>`,
    flat: `<path d="M55 72 h10" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`,
    cat: `<path d="M52 70 q4 4 8 0 q4 4 8 0" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
  };

  const X = {
    motion: `<path d="M108 30 q6 5 3 12 M113 24 q8 7 4 17" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>`,
    sweat: `<path d="M94 34 q-6 9 0 12 q6 -3 0 -12Z" fill="#7CC6FF"/>`,
    headband: `<path d="M27 46 Q60 27 93 46" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="60" cy="36" r="4.2" fill="${BODY}"/><path d="M93 46 l12 -6 M93 46 l11 4" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    zzz: `<text x="88" y="34" font-family="Prompt,sans-serif" font-weight="700" font-size="15" fill="#5B6BD6">Z</text><text x="100" y="22" font-family="Prompt,sans-serif" font-weight="700" font-size="11" fill="#5B6BD6">z</text><text x="108" y="13" font-family="Prompt,sans-serif" font-weight="700" font-size="8" fill="#5B6BD6">z</text>`,
    question: `<text x="94" y="36" font-family="Prompt,sans-serif" font-weight="700" font-size="22" fill="#1D4ED8">?</text><text x="14" y="34" font-family="Prompt,sans-serif" font-weight="700" font-size="16" fill="#1D4ED8" transform="rotate(-15 18 30)">?</text>`,
    speed: `<path d="M4 54 h14 M0 66 h18 M6 78 h12" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity=".5"/>`,
    shockLines: `<path d="M30 22 l5 8 M60 14 v9 M90 22 l-5 8" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`,
    hearts: heart(98, 26, .9) + heart(16, 40, .6, '#FF8FA3') + heart(104, 56, .5, '#FF8FA3'),
    sparkles: sparkle(98, 26, 1) + sparkle(18, 34, .7) + sparkle(106, 58, .5),
    confetti: ['#FFC83D:16:30:20', '#3BC9DB:100:24:-25', '#51CF66:22:56:40', '#845EF7:106:60:-10', '#FF922B:90:14:15']
      .map(s => { const [c, x, y, r] = s.split(':'); return `<rect x="${x}" y="${y}" width="7" height="4" rx="1.5" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`; }).join(''),
    ring: `<ellipse cx="60" cy="86" rx="44" ry="12" fill="none" stroke="#fff" stroke-width="9"/><ellipse cx="60" cy="86" rx="44" ry="12" fill="none" stroke="#FF6B6B" stroke-width="9" stroke-dasharray="17 17"/>
      <path d="M8 100 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" stroke="#4DABF7" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    dumbbell: `<rect x="14" y="20" width="92" height="5" rx="2.5" fill="#495057"/><rect x="8" y="12" width="10" height="21" rx="3" fill="#343A40"/><rect x="102" y="12" width="10" height="21" rx="3" fill="#343A40"/>`,
    bandage: `<g transform="rotate(-25 46 38)"><rect x="32" y="33" width="28" height="10" rx="5" fill="#F6D5B0"/><circle cx="43" cy="38" r="1.2" fill="#D9A877"/><circle cx="49" cy="38" r="1.2" fill="#D9A877"/></g>
      <g transform="translate(96 26)"><rect x="-11" y="-9" width="22" height="18" rx="4" fill="#fff" stroke="#E5323A" stroke-width="2"/><path d="M0 -5 v10 M-5 0 h10" stroke="#E5323A" stroke-width="3" stroke-linecap="round"/></g>`,
    clock: `<g transform="translate(18 30)"><circle r="11" fill="#fff" stroke="${INK}" stroke-width="2.4"/><path d="M0 0 v-6 M0 0 l5 3" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/></g>`,
    whistle: `<path d="M62 76 l14 6" stroke="#FFC83D" stroke-width="2"/><rect x="74" y="78" width="12" height="8" rx="3" fill="#FFC83D"/>`
  };

  const SET = [
    { id: 'hi', label: 'สวัสดี!', eyes: 'happy', mouth: 'open', arms: 'wave', x: ['motion'] },
    { id: 'thanks', label: 'ขอบคุณน้า', eyes: 'closed', mouth: 'cat', arms: 'together', x: ['sparkles'], tilt: -8 },
    { id: 'ok', label: 'รับทราบ!', eyes: 'dot', mouth: 'smile', arms: 'salute', x: [] },
    { id: 'fight', label: 'สู้ๆ!', eyes: 'determined', mouth: 'open', arms: 'fist', x: ['headband'] },
    { id: 'yay', label: 'เย้!', eyes: 'happy', mouth: 'open', arms: 'up', x: ['confetti'] },
    { id: 'love', label: 'รักเลย', eyes: 'heart', mouth: 'smile', arms: 'together', x: ['hearts'] },
    { id: 'sorry', label: 'ขอโทษน้า', eyes: 'sad', mouth: 'wavy', arms: 'together', x: ['sweat'], tilt: 6 },
    { id: 'confused', label: 'งงอ่ะ', eyes: 'spiral', mouth: 'wavy', arms: 'rest', x: ['question'] },
    { id: 'sleepy', label: 'ง่วงแล้ว...', eyes: 'closed', mouth: 'small', arms: 'rest', x: ['zzz'], tilt: 10 },
    { id: 'late', label: 'มาแล้วๆ!', eyes: 'dot', mouth: 'open', arms: 'up', x: ['speed', 'sweat'], tilt: -12 },
    { id: 'omg', label: 'ห๊ะ!?', eyes: 'shock', mouth: 'o', arms: 'up', x: ['shockLines'] },
    { id: 'wait', label: 'รอแป๊บน้า', eyes: 'wink', mouth: 'smile', arms: 'stop', x: ['clock'] },
    { id: 'swim', label: 'ระวังด้วยนะ', eyes: 'dot', mouth: 'smile', arms: 'wave', x: ['ring', 'whistle'] },
    { id: 'gym', label: 'ฟิตปั๋ง!', eyes: 'determined', mouth: 'smile', arms: 'up', x: ['dumbbell', 'sweat'] },
    { id: 'firstaid', label: 'เจ็บตรงไหน?', eyes: 'sad', mouth: 'small', arms: 'rest', x: ['bandage'] },
    { id: 'luck', label: 'โชคดีนะ!', eyes: 'star', mouth: 'open', arms: 'fist', x: ['sparkles'] }
  ];

  function render(s) {
    const under = s.x.filter(k => k === 'dumbbell').map(k => X[k]).join('');
    const over = s.x.filter(k => k !== 'dumbbell').map(k => X[k]).join('');
    return `<svg viewBox="0 0 120 124" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${s.label}">
      <g transform="translate(0 -6)">
        <g transform="rotate(${s.tilt || 0} 60 70)">
          <ellipse cx="45" cy="97" rx="9" ry="5" fill="${SHADE}"/><ellipse cx="75" cy="97" rx="9" ry="5" fill="${SHADE}"/>
          ${under}
          ${ARMS[s.arms]}
          <ellipse cx="60" cy="64" rx="39" ry="35" fill="${BODY}"/>
          <ellipse cx="47" cy="42" rx="11" ry="6" fill="#fff" opacity=".22" transform="rotate(-25 47 42)"/>
          <ellipse cx="37" cy="68" rx="6" ry="3.6" fill="${CHEEK}" opacity=".85"/><ellipse cx="83" cy="68" rx="6" ry="3.6" fill="${CHEEK}" opacity=".85"/>
          ${EYES[s.eyes]}${MOUTH[s.mouth]}
        </g>
        ${over}
      </g>
      <text x="60" y="118" text-anchor="middle" font-family="Prompt,sans-serif" font-weight="700" font-size="14" fill="${INK}" stroke="#fff" stroke-width="5" stroke-linejoin="round" paint-order="stroke">${s.label}</text>
    </svg>`;
  }

  const cache = {};
  window.STICKERS = {
    list: SET,
    svg(id) { const s = SET.find(x => x.id === id); return s ? (cache[id] ||= render(s)) : ''; },
    label(id) { return SET.find(x => x.id === id)?.label || 'สติ๊กเกอร์'; }
  };
})();
