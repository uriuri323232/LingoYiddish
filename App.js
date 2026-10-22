import React, { useRef, useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, Animated, TextInput, FlatList, StyleSheet, SafeAreaView, ScrollView, StatusBar, Alert, Share, BackHandler, Keyboard, Modal, Vibration, useColorScheme, useWindowDimensions, AppState } from 'react-native';
import * as FS from 'expo-file-system';
import RAW from './vocabulary.json';

/* ───────────── נתונים ───────────── */
// המזהה נשאר תואם לגרסאות קודמות (o = התרגום הישן, אם תוקן) כדי לא לאבד התקדמות
const DATA = RAW.map((w) => ({ ...w, id: w.y + '|' + (w.o || w.h) }));
const FILE = FS.documentDirectory + 'progress.json';
const BYCAT = DATA.reduce((m, w) => { (m[w.c] || (m[w.c] = [])).push(w); return m; }, {});
const SPECIAL = [
  { k: 'all', n: 'הכול', i: '📚' }, { k: 'todo', n: 'עוד לא נלמדו', i: '📖' }, { k: 'fav', n: 'מועדפים', i: '⭐' },
  { k: 'weak', n: 'לחזרה (טעויות)', i: '🔁' }, { k: 'due', n: 'חזרה חכמה', i: '🧠' },
];
const TOPICS = [
  { k: 'greetings', n: 'ברכות', i: '👋' }, { k: 'daily', n: 'חיי יום-יום', i: '🏠' }, { k: 'food', n: 'אוכל', i: '🍞' },
  { k: 'family', n: 'משפחה וחברה', i: '👪' }, { k: 'numbers', n: 'מספרים', i: '🔢' }, { k: 'time', n: 'זמן ולוח', i: '🗓️' },
  { k: 'verbs', n: 'פעלים', i: '🏃' }, { k: 'holidays', n: 'שבת וחגים', i: '🕯️' }, { k: 'shul', n: 'בית כנסת ולימוד', i: '📜' },
  { k: 'nature', n: 'טבע וחיות', i: '🌳' }, { k: 'clothes', n: 'לבוש', i: '🧥' }, { k: 'adj', n: 'תארים וצבעים', i: '🎨' },
  { k: 'questions', n: 'מילות שאלה', i: '❓' }, { k: 'phrases', n: 'משפטים שימושיים', i: '💬' }, { k: 'idioms', n: 'פתגמים', i: '💡' },
  { k: 'travel', n: 'נסיעות ומקומות', i: '🚌' }, { k: 'house', n: 'בית וחפצים', i: '🛋️' }, { k: 'feelings', n: 'רגשות ותכונות', i: '😊' },
  { k: 'work', n: 'עבודה וכסף', i: '💼' }, { k: 'basics', n: 'מילות יסוד ודקדוק', i: '🔤' }, { k: 'body', n: 'גוף ובריאות', i: '🩺' },
];
const CATS = [...SPECIAL, ...TOPICS];
const GEN = { d: 'דער', f: 'די', n: 'דאָס' };
const COL = ['#5B8DEF', '#E07A5F', '#3FA67A', '#9B6BCE', '#E0A100', '#2BA3B8'];
const ACCENTS = ['#F2A900', '#2BA3B8', '#9B6BCE', '#E07A5F'];
const THEMES = {
  light: { bg: '#F1F4F9', card: '#FFFFFF', ink: '#1B2A41', soft: '#64748B', ok: '#2E7D5B', bad: '#B23A48', head: '#1B2A41', back: '#1B2A41', line: '#E2E8F0' },
  dark: { bg: '#0F1624', card: '#1A2438', ink: '#E8EDF5', soft: '#93A1B8', ok: '#3FA67A', bad: '#D1566A', head: '#0A101C', back: '#26354F', line: '#2A3752' },
};
const DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const LEVELS = ['מתחיל', 'לומד', 'מתמיד', 'בקי', 'חריף', 'מומחה', 'בעל מדרגה'];
const INT = [0, 1, 3, 7, 14, 30];

/* ───────────── עזרים ───────────── */
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const norm = (s) => s.normalize('NFD').replace(/[\u0591-\u05C7]/g, '').replace(/\u05F0/g, 'וו').replace(/\u05F1/g, 'וי').replace(/\u05F2/g, 'יי').toLowerCase().trim();
const dayNo = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
const isDue = (S, id) => !!(S.srs && S.srs[id] && S.srs[id][1] <= dayNo());
const isNew = (S, id) => !(S.srs && S.srs[id]);
const lat = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const judge = (inp, w) => { const a = lat(inp); if (!a) return null; const alts = w.t.split('/').map(lat).filter(Boolean); if (alts.includes(a)) return 'ok'; if (alts.some((b) => b.length >= 5 && lev(a, b) <= 1)) return 'near'; return 'bad'; };
const lvlInfo = (xp = 0) => { const lvl = Math.floor(Math.sqrt(xp / 25)) + 1; const lo = 25 * (lvl - 1) ** 2, hi = 25 * lvl ** 2; return { lvl, pct: (xp - lo) / (hi - lo), to: hi - xp, title: LEVELS[Math.min(Math.floor((lvl - 1) / 2), LEVELS.length - 1)] }; };
const poolOf = (cat, S) =>
  cat === 'all' ? DATA : cat === 'fav' ? DATA.filter((w) => S.fav[w.id]) : cat === 'weak' ? DATA.filter((w) => S.weak[w.id]) : cat === 'todo' ? DATA.filter((w) => !S.learned[w.id])
    : cat === 'due' ? [...DATA.filter((w) => isDue(S, w.id)), ...DATA.filter((w) => isNew(S, w.id)).slice(0, 5)] : (BYCAT[cat] || []);
const mkOpts = (w, hard) => {
  const ok = (x) => x.id !== w.id && x.h !== w.h && x.y !== w.y;
  const src = hard ? [...shuffle(DATA.filter((x) => x.c === w.c && ok(x))), ...shuffle(DATA.filter(ok))] : shuffle(DATA.filter(ok));
  const dist = [];
  for (const x of src) { if (dist.length >= 3) break; if (!dist.some((d) => d.h === x.h || d.y === x.y)) dist.push(x); }
  return shuffle([w, ...dist]);
};
const ACH = [
  ['w1', '🌱', 'מילה ראשונה', 'סימנתם מילה ראשונה כנלמדה', (s, m) => m.learned >= 1],
  ['w25', '📘', '25 מילים', 'למדתם 25 מילים', (s, m) => m.learned >= 25],
  ['w100', '📗', '100 מילים', 'למדתם 100 מילים', (s, m) => m.learned >= 100],
  ['w250', '📙', '250 מילים', 'למדתם 250 מילים', (s, m) => m.learned >= 250],
  ['w500', '🏆', '500 מילים', 'למדתם 500 מילים', (s, m) => m.learned >= 500],
  ['w1000', '👑', '1000 מילים', 'למדתם 1000 מילים', (s, m) => m.learned >= 1000],
  ['s3', '🔥', '3 ימים ברצף', 'למדתם 3 ימים ברצף', (s) => (s.streakDays || 0) >= 3],
  ['s7', '🔥', 'שבוע ברצף', 'למדתם 7 ימים ברצף', (s) => (s.streakDays || 0) >= 7],
  ['s30', '🌟', 'חודש ברצף', 'למדתם 30 ימים ברצף', (s) => (s.streakDays || 0) >= 30],
  ['q1', '🎯', 'חידון ראשון', 'השלמתם חידון', (s) => s.stats.played >= 1],
  ['qp', '💯', 'חידון מושלם', 'ענייתם נכון על כל השאלות', (s) => (s.stats.perfect || 0) >= 1],
  ['q10', '🏅', '10 חידונים', 'השלמתם 10 חידונים', (s) => s.stats.played >= 10],
  ['sp', '⏱️', 'ספרינט', 'ענייתם 15 תשובות נכונות בספרינט', (s) => (s.bestSprint || 0) >= 15],
  ['f10', '⭐', '10 מועדפים', 'סימנתם 10 מועדפים', (s, m) => m.fav >= 10],
  ['x1000', '⚡', '1,000 נקודות', 'צברתם 1,000 נקודות', (s) => (s.xp || 0) >= 1000],
];

const Ctx = createContext();
const useApp = () => useContext(Ctx);

/* ───────────── רכיבים קטנים ───────────── */
const Chip = ({ on, label, onPress }) => { const { st } = useApp(); return (
  <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]}><Text style={[st.chipT, on && st.chipTOn]}>{label}</Text></TouchableOpacity>); };
const Btn = ({ label, onPress, alt, grow, off }) => { const { st } = useApp(); return (
  <TouchableOpacity disabled={off} style={[st.btn, alt && st.btnAlt, grow && { flex: 1, paddingHorizontal: 8, marginTop: 6 }, off && { opacity: 0.35 }]} onPress={onPress}><Text style={[st.btnT, alt && st.btnAltT]}>{label}</Text></TouchableOpacity>); };
const Tool = ({ icon, label, on, onPress }) => { const { st } = useApp(); return (
  <TouchableOpacity accessibilityLabel={label} onPress={onPress} style={[st.tool, on && st.toolOn]}>
    <Text style={st.toolI}>{icon}</Text><Text style={[st.toolT, on && { color: '#1B2A41', fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
  </TouchableOpacity>); };
const Empty = ({ msg }) => { const { st } = useApp(); return <View style={st.center}><Text style={st.sub}>{msg || 'אין מילים בקטגוריה הזו. בחרו קטגוריה אחרת.'}</Text></View>; };
const Bar = ({ pct, color }) => { const { st } = useApp(); return <View style={st.bar}><View style={[st.fill, color && { backgroundColor: color }, { width: `${Math.max(0, Math.min(100, pct * 100))}%` }]} /></View>; };
const GenTag = ({ g }) => { const { st } = useApp(); return g ? <Text style={st.gen}>{GEN[g]}</Text> : null; };

function WordModal({ w, onClose }) {
  const { st, S, toggle } = useApp();
  if (!w) return null;
  const cat = CATS.find((c) => c.k === w.c) || {};
  const msg = `${w.y} (${w.t}) = ${w.h}${w.e ? `\n${w.e} — ${w.eh}` : ''}`;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={st.overlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={st.sheet}>
          <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
            <Text style={st.tag2}>{cat.i} {cat.n}</Text>
            <Text style={st.big}>{w.y}</Text>
            <View style={st.rowC}><GenTag g={w.g} /><Text style={st.tr}>{w.t}</Text></View>
            <Text style={st.hebBig}>{w.h}</Text>
            {!!w.n && <Text style={st.note}>💡 {w.n}</Text>}
            {!!w.e && (
              <View style={st.exBox}>
                <Text style={st.exY}>{w.e}</Text>
                <Text style={st.exT}>{w.et}</Text>
                <Text style={st.exH}>{w.eh}</Text>
              </View>
            )}
            <View style={st.row}>
              <Chip on={!!S.fav[w.id]} label={S.fav[w.id] ? '⭐ במועדפים' : '☆ הוסף למועדפים'} onPress={() => toggle('fav', w.id)} />
              <Chip on={!!S.learned[w.id]} label={S.learned[w.id] ? '✅ נלמדה' : '⬜ סמן כנלמדה'} onPress={() => toggle('learned', w.id)} />
            </View>
            <View style={st.row}>
              <Btn alt label="📤 שיתוף" onPress={() => Share.share({ message: msg })} />
              <Btn alt label="🚩 דיווח על שגיאה" onPress={() => Share.share({ message: `בדיקת מילה: ${w.y} | ${w.t} | ${w.h}` })} />
            </View>
            <Btn label="סגירה" onPress={onClose} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/* ───────────── בית ───────────── */
function Home({ pick, go }) {
  const { st, S, openWord } = useApp();
  const wod = DATA[dayNo() % DATA.length];
  const done = DATA.filter((w) => S.learned[w.id]).length;
  const td = S.day === new Date().toDateString() ? S.today : 0;
  const goal = S.goal || 10;
  const dueN = DATA.filter((w) => isDue(S, w.id)).length;
  const weakN = Object.keys(S.weak).length;
  const L = lvlInfo(S.xp);
  const week = [...Array(7)].map((_, i) => { const d = dayNo() - (6 - i); return { v: (S.hist || {})[d] || 0, l: DAYS[new Date(d * 864e5 + 432e5).getUTCDay()] }; });
  const mx = Math.max(10, ...week.map((x) => x.v));
  return (
    <ScrollView contentContainerStyle={st.pad}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => openWord(wod)} style={[st.card, { borderTopWidth: 4, borderTopColor: st.gold }]}>
        <Text style={st.sub}>✨ המילה של היום</Text>
        <Text style={st.big}>{wod.y}</Text>
        <Text style={st.tr}>{wod.t} · {wod.h}</Text>
        {!!wod.e && <Text style={[st.sub, { marginTop: 8 }]}>{wod.e}</Text>}
      </TouchableOpacity>

      <View style={st.card}>
        <View style={st.lvlRow}>
          <Text style={st.lvlN}>רמה {L.lvl} · {L.title}</Text>
          <Text style={st.sub}>{S.xp || 0} נק׳ · עוד {L.to} לרמה הבאה</Text>
        </View>
        <Bar pct={L.pct} color={st.gold} />
        <View style={[st.pills, { marginTop: 12 }]}>
          <View style={st.pill}><Text style={st.pillN}>{done}</Text><Text style={st.pillL}>נלמדו מתוך {DATA.length}</Text></View>
          <View style={st.pill}><Text style={st.pillN}>{Math.min(td, goal)}/{goal}{td >= goal ? ' 🎉' : ''}</Text><Text style={st.pillL}>יעד יומי</Text></View>
          <View style={st.pill}><Text style={st.pillN}>🔥 {S.streakDays || 1}</Text><Text style={st.pillL}>ימים ברצף</Text></View>
        </View>
        <Bar pct={done / DATA.length} />
        <View style={st.week}>
          {week.map((x, i) => (
            <View key={i} style={st.wcol}>
              <View style={st.wbarBg}><View style={[st.wbar, { height: `${Math.max(x.v ? 8 : 0, (x.v / mx) * 100)}%` }, i === 6 && { backgroundColor: st.gold }]} /></View>
              <Text style={st.wl}>{x.l}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={st.row}><Btn label="▶ המשך ללמוד" onPress={() => go('todo', 'cards')} /><Btn label="🎯 חידון מהיר" alt onPress={() => go('all', 'quiz')} /></View>
      <View style={st.row}>
        <Btn label={`🧠 חזרה חכמה${dueN ? ` (${dueN})` : ''}`} alt onPress={() => go('due', 'cards')} />
        {weakN > 0 && <Btn label={`🔁 טעויות (${weakN})`} alt onPress={() => go('weak', 'cards')} />}
      </View>

      <Text style={[st.h1, { marginTop: 14 }]}>תרגול לפי קבוצה</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {SPECIAL.map((c) => <Chip key={c.k} label={`${c.i} ${c.n}`} onPress={() => pick(c.k)} />)}
      </ScrollView>

      <Text style={[st.h1, { marginTop: 10 }]}>קטגוריות</Text>
      <View style={st.grid}>
        {TOPICS.map((c, ix) => {
          const p = poolOf(c.k, S), l = p.filter((w) => S.learned[w.id]).length;
          return (
            <TouchableOpacity key={c.k} style={st.cat} onPress={() => pick(c.k)}>
              <View style={[st.strip, { backgroundColor: COL[ix % 6] }]} /><Text style={st.emoji}>{c.i}</Text>
              <Text style={st.catName}>{c.n}</Text>
              <Text style={st.sub}>{l}/{p.length}</Text>
              <Bar pct={p.length ? l / p.length : 0} color={COL[ix % 6]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ───────────── כרטיסיות ───────────── */
function Cards({ pool }) {
  const { st, S, toggle, rate, openWord } = useApp();
  const { height } = useWindowDimensions();
  const [list, setList] = useState(pool);
  const [shuf, setShuf] = useState(false);
  const [rev, setRev] = useState(false);
  const [i, setI] = useState(0);
  const [flipped, setF] = useState(false);
  const [auto, setAuto] = useState(false);
  const [ses, setSes] = useState({ k: 0, u: 0, miss: [] });
  const [fin, setFin] = useState(false);
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!auto || !list.length || fin) return;
    const tm = setTimeout(() => {
      if (!flipped) { Animated.spring(a, { toValue: 180, friction: 8, tension: 12, useNativeDriver: true }).start(); setF(true); }
      else { a.setValue(0); setF(false); setI((x) => (x + 1) % list.length); }
    }, flipped ? 2200 : 2600);
    return () => clearTimeout(tm);
  }, [auto, flipped, i, fin]);
  if (!list.length) return <Empty />;
  const reset = (l) => { setList(l); setI(0); a.setValue(0); setF(false); setFin(false); setSes({ k: 0, u: 0, miss: [] }); };
  if (fin)
    return (
      <ScrollView contentContainerStyle={st.pad}>
        <Text style={st.big}>סיימתם סבב! 🎉</Text>
        <Text style={st.sub}>ידעתי: {ses.k} · לא ידעתי: {ses.u}</Text>
        <Bar pct={list.length ? ses.k / list.length : 0} />
        {ses.miss.length > 0 && <Text style={st.h1}>כדאי לחזור על</Text>}
        {ses.miss.map((w) => <TouchableOpacity key={w.id} style={st.card} onPress={() => openWord(w)}><Text style={st.itemY}>{w.y}</Text><Text style={st.tr}>{w.t} · {w.h}</Text></TouchableOpacity>)}
        <View style={st.row}>
          {ses.miss.length > 0 && <Btn label="🔁 רק הטעויות" onPress={() => reset(shuffle(ses.miss))} />}
          <Btn alt label="סבב חדש" onPress={() => reset(shuf ? shuffle(pool) : pool)} />
        </View>
      </ScrollView>
    );
  const w = list[i % list.length];
  const flip = () => { Animated.spring(a, { toValue: flipped ? 0 : 180, friction: 8, tension: 12, useNativeDriver: true }).start(); setF(!flipped); };
  const go = (d) => { a.setValue(0); setF(false); setI((i + d + list.length) % list.length); };
  const answer = (ok) => {
    rate(w.id, ok);
    setSes((s) => ({ k: s.k + (ok ? 1 : 0), u: s.u + (ok ? 0 : 1), miss: ok ? s.miss : [...s.miss, w] }));
    if (i + 1 >= list.length) setFin(true); else go(1);
  };
  const mix = () => { setShuf(!shuf); reset(!shuf ? shuffle(pool) : pool); };
  const onlyNew = () => reset(list.filter((x) => !S.learned[x.id]).length ? list.filter((x) => !S.learned[x.id]) : list);
  const rot = (o) => ({ transform: [{ perspective: 1000 }, { rotateY: a.interpolate({ inputRange: [0, 180], outputRange: o }) }] });
  const cardH = Math.max(230, Math.min(330, height * 0.36));
  const cat = CATS.find((c) => c.k === w.c) || {};
  const n = (i % list.length) + 1;
  const showEx = S.ex !== false && !!w.e;
  return (
    <ScrollView contentContainerStyle={st.cardsPage} showsVerticalScrollIndicator={false}>
      <View style={st.prog}>
        <Text style={st.sub}>{n} / {list.length}</Text>
        <Bar pct={n / list.length} color={st.gold} />
      </View>
      <TouchableOpacity activeOpacity={0.95} onPress={flip} style={[st.cardBox, { height: cardH }]}>
        <Animated.View style={[st.face, rot(['0deg', '180deg'])]}>
          <Text style={st.tag}>{cat.i} {cat.n}</Text>
          <Text style={st.big} numberOfLines={3} adjustsFontSizeToFit>{rev ? w.h : w.y}</Text>
          {!rev && <View style={st.rowC}><GenTag g={w.g} />{!S.hideTr && <Text style={st.tr}>{w.t}</Text>}</View>}
          <Text style={[st.sub, { position: 'absolute', bottom: 10 }]}>הקישו להפוך</Text>
        </Animated.View>
        <Animated.View style={[st.face, st.back, rot(['180deg', '360deg'])]}>
          <Text style={[st.big, { color: '#fff' }]} numberOfLines={3} adjustsFontSizeToFit>{rev ? w.y : w.h}</Text>
          {rev && <Text style={[st.tr, { color: st.gold }]}>{w.t}</Text>}
          {!!w.n && <Text style={[st.note, { color: '#cbd5e1' }]} numberOfLines={3}>💡 {w.n}</Text>}
          {showEx && <View style={st.exBack}><Text style={st.exYb} numberOfLines={2}>{w.e}</Text><Text style={st.exHb} numberOfLines={2}>{w.eh}</Text></View>}
        </Animated.View>
      </TouchableOpacity>
      <View style={st.tools}>
        <Tool icon={S.fav[w.id] ? '⭐' : '☆'} label="מועדף" on={!!S.fav[w.id]} onPress={() => toggle('fav', w.id)} />
        <Tool icon="✓" label="נלמד" on={!!S.learned[w.id]} onPress={() => toggle('learned', w.id)} />
        <Tool icon="🔀" label="ערבוב" on={shuf} onPress={mix} />
        <Tool icon={auto ? '⏸' : '▶'} label="אוטומטי" on={auto} onPress={() => setAuto(!auto)} />
        <Tool icon="🔁" label="עברית קודם" on={rev} onPress={() => { setRev(!rev); a.setValue(0); setF(false); }} />
        <Tool icon="🆕" label="רק חדשות" onPress={onlyNew} />
        <Tool icon="⋯" label="עוד" onPress={() => openWord(w)} />
      </View>
      <View style={st.rowFull}>
        <Btn grow alt off={!flipped || auto} label="🔁 לא ידעתי" onPress={() => answer(false)} />
        <Btn grow off={!flipped || auto} label="✓ ידעתי" onPress={() => answer(true)} />
      </View>
      <View style={st.rowFull}>
        <Btn grow alt label="הקודם" onPress={() => go(-1)} />
        <Btn grow alt label="הבא" onPress={() => go(1)} />
      </View>
    </ScrollView>
  );
}

/* ───────────── חידון ───────────── */
function Quiz({ pool }) {
  const { st, S, setS, addXp, buzz, openWord } = useApp();
  const [ph, setPh] = useState('setup');
  const [mode, setMode] = useState('mc');
  const [dir, setDir] = useState('yh');
  const [cnt, setCnt] = useState(10);
  const [hard, setHard] = useState(false);
  const [qs, setQs] = useState([]);
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [run, setRun] = useState(0);
  const [sel, setSel] = useState(null);
  const [txt, setTxt] = useState('');
  const [res, setRes] = useState(null);
  const [hint, setHint] = useState(false);
  const [left, setLeft] = useState(60);
  const [wrong, setWrong] = useState([]);
  const [earned, setEarned] = useState(0);
  const R = useRef({ sc: 0, tot: 0, best: 0, run: 0 });
  const sprint = mode === 'sprint';
  useEffect(() => {
    if (ph !== 'play' || !sprint) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [ph, sprint]);
  useEffect(() => { if (ph === 'play' && sprint && left <= 0) finish(); }, [left]);
  if (!pool.length) return <Empty />;
  const mkQ = (w) => ({ w, d: dir === 'mix' ? (Math.random() < 0.5 ? 'yh' : 'hy') : dir, opts: mode === 'type' ? null : mkOpts(w, hard) });
  const start = () => {
    let base = shuffle(pool);
    if (sprint) { while (base.length < 120) base = base.concat(shuffle(pool)); } else base = base.slice(0, cnt);
    setQs(base.map(mkQ));
    R.current = { sc: 0, tot: 0, best: 0, run: 0 };
    setN(0); setScore(0); setRun(0); setWrong([]); setSel(null); setRes(null); setTxt(''); setHint(false); setLeft(60); setEarned(0); setPh('play');
  };
  const finish = () => {
    const { sc, tot, best } = R.current;
    const perfect = !sprint && tot >= 5 && sc === tot;
    const xp = sc * 2 + (perfect ? 10 : 0);
    setEarned(xp); addXp(xp);
    setS((s) => ({ ...s, bestSprint: sprint ? Math.max(s.bestSprint || 0, sc) : s.bestSprint, stats: { played: s.stats.played + 1, correct: s.stats.correct + sc, total: s.stats.total + tot, streak: Math.max(s.stats.streak, best), perfect: (s.stats.perfect || 0) + (perfect ? 1 : 0) } }));
    setPh('end');
  };
  const record = (ok, w) => {
    const r = R.current; r.tot += 1;
    if (ok) { r.sc += 1; r.run += 1; r.best = Math.max(r.best, r.run); setScore(r.sc); setRun(r.run); setS((s) => { const x = { ...s.weak }; delete x[w.id]; return { ...s, weak: x }; }); }
    else { r.run = 0; setRun(0); setWrong((x) => [...x, w]); setS((s) => ({ ...s, weak: { ...s.weak, [w.id]: 1 } })); }
    buzz(ok);
  };
  const q = qs[n];
  const advance = () => { if (!sprint && n + 1 >= qs.length) finish(); else { setSel(null); setRes(null); setTxt(''); setHint(false); setN(n + 1); } };
  const choose = (o) => {
    if (sel) return;
    setSel(o);
    const ok = o.id === q.w.id;
    record(ok, q.w);
    if (sprint) setTimeout(() => { setSel(null); setN((x) => x + 1); }, 550);
  };
  const check = () => {
    if (res) return;
    const j = judge(txt, q.w);
    if (!j) return;
    setRes(j); record(j !== 'bad', q.w); Keyboard.dismiss();
  };

  if (ph === 'setup')
    return (
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Text style={st.h1}>הגדרות חידון</Text>
        <Text style={st.sub}>סוג</Text>
        <View style={st.row}>
          <Chip on={mode === 'mc'} label="🔘 בחירה" onPress={() => setMode('mc')} />
          <Chip on={mode === 'type'} label="⌨️ הקלדה" onPress={() => setMode('type')} />
          <Chip on={mode === 'sprint'} label="⏱️ ספרינט 60 שניות" onPress={() => setMode('sprint')} />
        </View>
        {mode === 'type' ? <Text style={st.sub}>תראו מילה בעברית ותקלידו את התעתיק הלועזי של היידיש (למשל: gut morgn).</Text> : (
          <>
            <Text style={st.sub}>כיוון</Text>
            <View style={st.row}>
              <Chip on={dir === 'yh'} label="יידיש ← עברית" onPress={() => setDir('yh')} />
              <Chip on={dir === 'hy'} label="עברית ← יידיש" onPress={() => setDir('hy')} />
              <Chip on={dir === 'mix'} label="מעורב" onPress={() => setDir('mix')} />
            </View>
          </>
        )}
        {!sprint && (<><Text style={st.sub}>מספר שאלות</Text><View style={st.row}>{[5, 10, 20, 30].map((c) => <Chip key={c} on={cnt === c} label={String(c)} onPress={() => setCnt(c)} />)}</View></>)}
        {mode !== 'type' && (<><Text style={st.sub}>רמת קושי</Text><View style={st.row}><Chip on={!hard} label="רגיל" onPress={() => setHard(false)} /><Chip on={hard} label="קשה (מאותה קטגוריה)" onPress={() => setHard(true)} /></View></>)}
        <Text style={st.sub}>{pool.length} מילים בקבוצה הנוכחית</Text>
        <Btn label="התחלה" onPress={start} />
      </ScrollView>
    );

  if (ph === 'end') {
    const { sc, tot, best } = R.current;
    return (
      <ScrollView contentContainerStyle={st.pad}>
        <Text style={st.h1}>{sprint ? 'נגמר הזמן! ⏱️' : 'הציון שלכם'}</Text>
        <Text style={st.big}>{sprint ? sc : `${sc} / ${tot}`}</Text>
        <Text style={st.sub}>{sprint ? `תשובות נכונות ב-60 שניות · שיא: ${S.bestSprint || sc}` : `דיוק ${tot ? Math.round((sc / tot) * 100) : 0}%`} · רצף הצלחות: {best}</Text>
        <Text style={st.sub}>+{earned} נקודות ⚡</Text>
        {wrong.length > 0 && <Text style={st.h1}>כדאי לחזור על</Text>}
        {wrong.map((w, k) => <TouchableOpacity key={w.id + k} style={st.card} onPress={() => openWord(w)}><Text style={st.itemY}>{w.y}</Text><Text style={st.tr}>{w.t} · {w.h}</Text></TouchableOpacity>)}
        <View style={st.row}><Btn label="שוב" onPress={start} /><Btn label="הגדרות" alt onPress={() => setPh('setup')} /></View>
      </ScrollView>
    );
  }

  const head = sprint ? `⏱️ ${Math.max(left, 0)} · ✓ ${score}` : `שאלה ${n + 1} מתוך ${qs.length} · ניקוד ${score} · רצף ${run}`;
  if (mode === 'type')
    return (
      <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
        <Text style={st.sub}>{head}</Text>
        <Bar pct={(n + (res ? 1 : 0)) / qs.length} color={st.gold} />
        <Text style={st.sub}>איך אומרים ביידיש?</Text>
        <Text style={st.big}>{q.w.h}</Text>
        <TextInput style={st.input} value={txt} onChangeText={setTxt} editable={!res} autoCapitalize="none" autoCorrect={false} onSubmitEditing={check} placeholder="הקלידו תעתיק לועזי…" placeholderTextColor={st.softC} textAlign="center" />
        {!res && hint && <Text style={st.sub}>רמז: {q.w.t.slice(0, Math.max(1, Math.ceil(q.w.t.length / 3)))}…</Text>}
        {res && (
          <View style={[st.card, { borderTopWidth: 4, borderTopColor: res === 'bad' ? st.badC : st.okC }]}>
            <Text style={[st.h1, { color: res === 'bad' ? st.badC : st.okC, marginTop: 0 }]}>{res === 'ok' ? 'נכון! ✓' : res === 'near' ? 'כמעט — נחשב נכון ✓' : 'לא בדיוק'}</Text>
            <Text style={st.big}>{q.w.y}</Text><Text style={st.tr}>{q.w.t}</Text>
          </View>
        )}
        {!res ? (<View style={st.row}><Btn label="בדיקה" onPress={check} /><Btn alt label="💡 רמז" onPress={() => setHint(true)} /></View>) : <Btn label={n + 1 === qs.length ? 'סיום' : 'הבא'} onPress={advance} />}
      </ScrollView>
    );

  return (
    <ScrollView contentContainerStyle={st.pad}>
      <Text style={st.sub}>{head}</Text>
      {!sprint && <Bar pct={(n + (sel ? 1 : 0)) / qs.length} color={st.gold} />}
      <Text style={st.big}>{q.d === 'yh' ? q.w.y : q.w.h}</Text>
      {q.d === 'yh' && !S.hideTr && <Text style={st.tr}>{q.w.t}</Text>}
      {q.opts.map((o) => {
        const right = sel && o.id === q.w.id, bad = sel === o && o.id !== q.w.id;
        return (
          <TouchableOpacity key={o.id} onPress={() => choose(o)} style={[st.opt, right && { backgroundColor: st.okC }, bad && { backgroundColor: st.badC }]}>
            <Text style={[st.optT, (right || bad) && { color: '#fff' }]}>{q.d === 'yh' ? o.h : o.y}</Text>
          </TouchableOpacity>
        );
      })}
      {sel && !sprint && (
        <View style={st.card}>
          {sel.id !== q.w.id && <Text style={[st.sub, { color: st.badC }]}>התשובה הנכונה: {q.w.y} ({q.w.t}) = {q.w.h}</Text>}
          {!!q.w.e && <><Text style={st.exY}>{q.w.e}</Text><Text style={st.exH}>{q.w.eh}</Text></>}
        </View>
      )}
      {sel && !sprint && <Btn label={n + 1 === qs.length ? 'סיום' : 'הבא'} onPress={advance} />}
    </ScrollView>
  );
}

/* ───────────── זיווג ───────────── */
function Match({ pool }) {
  const { st, S, setS, addXp, buzz } = useApp();
  const [size, setSize] = useState(6);
  const mkR = (sz) => { const ws = shuffle(pool).slice(0, sz); return { ys: shuffle(ws), hs: shuffle(ws) }; };
  const [r, setR] = useState(() => mkR(6));
  const [a, setA] = useState(null);
  const [done, setDone] = useState({});
  const [bad, setBad] = useState(null);
  const [moves, setMoves] = useState(0);
  const [t0, setT0] = useState(0);
  const [sec, setSec] = useState(0);
  const fin = r.ys.length > 0 && Object.keys(done).length === r.ys.length;
  useEffect(() => {
    if (!t0 || fin) return;
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [t0, fin]);
  if (pool.length < 2) return <Empty />;
  const again = (sz = size) => { setR(mkR(sz)); setA(null); setDone({}); setMoves(0); setT0(0); setSec(0); };
  const tap = (side, w) => {
    if (done[w.id]) return;
    if (!t0) setT0(Date.now());
    if (!a || a.side === side) { setA({ side, w }); return; }
    setMoves(moves + 1);
    if (a.w.id === w.id) {
      const nd = { ...done, [w.id]: 1 }; setDone(nd); setA(null); buzz(true);
      if (Object.keys(nd).length === r.ys.length) {
        const t = Math.floor((Date.now() - t0) / 1000); setSec(t); addXp(r.ys.length);
        setS((s) => ({ ...s, bestMatch: { ...(s.bestMatch || {}), [r.ys.length]: Math.min((s.bestMatch || {})[r.ys.length] || 9999, t) } }));
      }
    } else { buzz(false); setBad(w.id); setA(null); setTimeout(() => setBad(null), 500); }
  };
  const cell = (side, w) => {
    const on = a && a.side === side && a.w.id === w.id;
    return (
      <TouchableOpacity key={side + w.id} onPress={() => tap(side, w)} style={[st.opt, { opacity: done[w.id] ? 0.3 : 1 }, on && { backgroundColor: st.gold }, bad === w.id && { backgroundColor: st.badC }]}>
        <Text style={[st.optT, on && { color: '#1B2A41' }]}>{side === 'y' ? w.y : w.h}</Text>
      </TouchableOpacity>
    );
  };
  const best = (S.bestMatch || {})[r.ys.length];
  return (
    <ScrollView contentContainerStyle={st.pad}>
      <Text style={st.h1}>זיווג מילים</Text>
      <View style={st.row}>{[4, 6, 8].map((s) => <Chip key={s} on={size === s} label={`${s} זוגות`} onPress={() => { setSize(s); again(s); }} />)}</View>
      <Text style={st.sub}>{fin ? `כל הכבוד! סיימתם ב-${sec} שניות · ${moves} ניסיונות` : `חברו כל מילה ביידיש לתרגום · ⏱️ ${sec} · ניסיונות ${moves}`}{best ? ` · שיא: ${best} שנ׳` : ''}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>{r.ys.map((w) => cell('y', w))}</View>
        <View style={{ flex: 1 }}>{r.hs.map((w) => cell('h', w))}</View>
      </View>
      <Btn label={fin ? 'משחק חדש' : 'ערבוב מחדש'} onPress={() => again()} />
    </ScrollView>
  );
}

/* ───────────── חיפוש ───────────── */
function Search() {
  const { st, S, toggle, openWord } = useApp();
  const [q, setQ] = useState('');
  const [fc, setFc] = useState('all');
  const [fs, setFs] = useState('all');
  const k = norm(q);
  const res = useMemo(() => {
    let b = fc === 'all' ? DATA : DATA.filter((w) => w.c === fc);
    if (fs === 'learned') b = b.filter((w) => S.learned[w.id]); else if (fs === 'new') b = b.filter((w) => !S.learned[w.id]); else if (fs === 'fav') b = b.filter((w) => S.fav[w.id]);
    return k ? b.filter((w) => norm(w.y).includes(k) || norm(w.h).includes(k) || w.t.toLowerCase().includes(k) || (w.e && norm(w.e).includes(k))) : b;
  }, [k, fc, fs, S.learned, S.fav]);
  return (
    <View style={{ flex: 1 }}>
      <TextInput style={st.input} value={q} onChangeText={setQ} placeholder="חיפוש ביידיש, בעברית או בתעתיק" placeholderTextColor={st.softC} textAlign="right" />
      <View style={{ height: 46 }}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {[['all', 'הכול'], ['new', 'לא נלמדו'], ['learned', 'נלמדו'], ['fav', '⭐ מועדפים']].map(([x, l]) => <Chip key={x} on={fs === x} label={l} onPress={() => setFs(x)} />)}
      </ScrollView></View>
      <View style={{ height: 46 }}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        <Chip on={fc === 'all'} label="📚 כל הקטגוריות" onPress={() => setFc('all')} />
        {TOPICS.map((c) => <Chip key={c.k} on={fc === c.k} label={c.i + ' ' + c.n} onPress={() => setFc(c.k)} />)}
      </ScrollView></View>
      <Text style={st.sub}>{res.length} תוצאות</Text>
      <FlatList data={res} keyExtractor={(w) => w.id} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" initialNumToRender={20}
        ListEmptyComponent={<Text style={st.sub}>לא נמצאו תוצאות. נסו מילה אחרת.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={st.item} onPress={() => openWord(item)}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <View style={st.rowC}><GenTag g={item.g} /><Text style={st.itemY}>{item.y}</Text></View>
              <Text style={st.tr}>{item.t}</Text><Text style={st.itemH}>{item.h}</Text>
            </View>
            <View>
              <TouchableOpacity onPress={() => toggle('fav', item.id)}><Text style={st.ico}>{S.fav[item.id] ? '⭐' : '☆'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => toggle('learned', item.id)}><Text style={st.ico}>{S.learned[item.id] ? '✅' : '⬜'}</Text></TouchableOpacity>
            </View>
          </TouchableOpacity>
        )} />
    </View>
  );
}

/* ───────────── עוד ───────────── */
function More() {
  const { st, S, setS } = useApp();
  const [imp, setImp] = useState('');
  const { played, correct, total, streak } = S.stats;
  const m = { learned: Object.keys(S.learned).length, fav: Object.keys(S.fav).length };
  const L = lvlInfo(S.xp);
  const got = ACH.filter((x) => x[4](S, m)).length;
  const reset = () => Alert.alert('איפוס התקדמות', 'למחוק את כל המילים שנלמדו, המועדפים, הנקודות והסטטיסטיקה?', [
    { text: 'ביטול', style: 'cancel' },
    { text: 'מחיקה', style: 'destructive', onPress: () => setS((s) => ({ ...s, learned: {}, fav: {}, weak: {}, srs: {}, today: 0, xp: 0, hist: {}, bestMatch: {}, bestSprint: 0, stats: { played: 0, correct: 0, total: 0, streak: 0, perfect: 0 } })) },
  ]);
  const exportP = () => Share.share({ message: JSON.stringify({ learned: S.learned, fav: S.fav, weak: S.weak, srs: S.srs || {}, stats: S.stats, goal: S.goal, xp: S.xp || 0, hist: S.hist || {} }) });
  const importP = () => {
    try {
      const p = JSON.parse(imp);
      if (!p || typeof p.learned !== 'object' || !p.learned || typeof p.fav !== 'object' || !p.fav) throw 0;
      const ok = {};
      ['learned', 'fav', 'weak', 'srs', 'hist'].forEach((k) => { if (p[k] && typeof p[k] === 'object') ok[k] = p[k]; });
      if (p.stats && ['played', 'correct', 'total', 'streak'].every((k) => Number.isFinite(p.stats[k]))) ok.stats = { perfect: 0, ...p.stats };
      if (Number.isFinite(p.goal)) ok.goal = p.goal;
      if (Number.isFinite(p.xp)) ok.xp = p.xp;
      setS((s) => ({ ...s, ...ok })); setImp(''); Alert.alert('בוצע', 'ההתקדמות שוחזרה.');
    } catch (e) { Alert.alert('שגיאה', 'קוד הגיבוי אינו תקין.'); }
  };
  const set = (o) => setS((s) => ({ ...s, ...o }));
  return (
    <ScrollView contentContainerStyle={st.pad} keyboardShouldPersistTaps="handled">
      <View style={st.card}>
        <Text style={st.h1}>הסטטיסטיקה שלי</Text>
        <Text style={st.stat}>רמה {L.lvl} · {L.title} · {S.xp || 0} נקודות</Text>
        <Text style={st.stat}>חידונים שהושלמו: {played}</Text>
        <Text style={st.stat}>דיוק כולל: {total ? Math.round((correct / total) * 100) : 0}%</Text>
        <Text style={st.stat}>רצף הצלחות שיא: {streak}</Text>
        <Text style={st.stat}>מילים שנלמדו: {m.learned} מתוך {DATA.length}</Text>
        <Text style={st.stat}>מועדפים: {m.fav}</Text>
        {!!S.bestSprint && <Text style={st.stat}>שיא ספרינט: {S.bestSprint}</Text>}
      </View>
      <View style={st.card}>
        <Text style={st.h1}>הישגים ({got}/{ACH.length})</Text>
        {ACH.map(([id, ic, n, d, f]) => { const on = f(S, m); return (
          <View key={id} style={[st.achRow, !on && { opacity: 0.4 }]}><Text style={st.achI}>{on ? ic : '🔒'}</Text><View style={{ flex: 1 }}><Text style={st.achN}>{n}</Text><Text style={st.achD}>{d}</Text></View></View>); })}
      </View>
      <View style={st.card}>
        <Text style={st.h1}>תצוגה</Text>
        <View style={st.row}>
          <Chip on={(S.theme || 'auto') === 'auto'} label="🌗 אוטומטי" onPress={() => set({ theme: 'auto' })} />
          <Chip on={S.theme === 'light'} label="☀️ בהיר" onPress={() => set({ theme: 'light' })} />
          <Chip on={S.theme === 'dark'} label="🌙 כהה" onPress={() => set({ theme: 'dark' })} />
        </View>
        <Text style={st.sub}>גודל טקסט</Text>
        <View style={st.row}>{[[0.9, 'קטן'], [1, 'רגיל'], [1.2, 'גדול'], [1.4, 'גדול מאוד']].map(([v, l]) => <Chip key={l} on={S.scale === v} label={l} onPress={() => set({ scale: v })} />)}</View>
        <Text style={st.sub}>צבע ראשי</Text>
        <View style={st.row}>{ACCENTS.map((c, i) => <TouchableOpacity key={c} onPress={() => set({ accent: i })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: (S.accent || 0) === i ? 4 : 0, borderColor: st.softC }} />)}</View>
      </View>
      <View style={st.card}>
        <Text style={st.h1}>למידה</Text>
        <Text style={st.sub}>יעד יומי (מילים)</Text>
        <View style={st.row}>{[5, 10, 20, 30].map((g) => <Chip key={g} on={(S.goal || 10) === g} label={String(g)} onPress={() => set({ goal: g })} />)}</View>
        <View style={st.row}>
          <Chip on={!S.hideTr} label={S.hideTr ? 'תעתיק מוסתר' : 'תעתיק מוצג'} onPress={() => set({ hideTr: !S.hideTr })} />
          <Chip on={S.ex !== false} label={S.ex === false ? 'דוגמאות מוסתרות' : 'דוגמאות מוצגות'} onPress={() => set({ ex: S.ex === false })} />
          <Chip on={S.vib !== false} label={S.vib === false ? 'רטט כבוי' : 'רטט פעיל'} onPress={() => set({ vib: S.vib === false })} />
        </View>
      </View>
      <View style={st.card}>
        <Text style={st.h1}>גיבוי ושחזור</Text>
        <Text style={st.sub}>שמרו את ההתקדמות בהודעה/הערה, והדביקו כאן כדי לשחזר (למשל במכשיר חדש).</Text>
        <View style={st.row}><Btn label="📤 ייצוא התקדמות" alt onPress={exportP} /></View>
        <TextInput style={st.input} value={imp} onChangeText={setImp} placeholder="הדביקו כאן קוד גיבוי" placeholderTextColor={st.softC} multiline />
        <Btn label="📥 שחזור" onPress={importP} />
      </View>
      <View style={st.card}>
        <Text style={st.h1}>על האפליקציה</Text>
        <Text style={st.sub}>{DATA.length} מילים וביטויים · התעתיק לפי שיטת YIVO. בין הדיאלקטים קיימים הבדלי הגייה (למשל shabes / shabbos).</Text>
        <Text style={st.sub}>מצאתם טעות? פתחו את המילה ולחצו על "דיווח על שגיאה".</Text>
      </View>
      <Btn label="איפוס התקדמות" alt onPress={reset} />
    </ScrollView>
  );
}

/* ───────────── עיצוב ───────────── */
const mk = (t, f) => ({
  ...StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    head: { backgroundColor: t.head, paddingTop: (StatusBar.currentHeight || 24) + 6, paddingBottom: 12, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    strip: { height: 5, width: 36, borderRadius: 3, marginBottom: 8 },
    title: { color: '#fff', fontSize: 20 * Math.min(f, 1.1), fontWeight: '800' },
    credit: { color: t.gold, marginTop: 2, fontSize: 12.5 * Math.min(f, 1.1), fontWeight: '700' },
    headSub: { color: '#cbd5e1', marginTop: 1, fontSize: 12.5 * Math.min(f, 1.1) },
    pad: { padding: 18, paddingBottom: 30 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
    h1: { fontSize: 20 * f, fontWeight: '800', color: t.ink, textAlign: 'center', marginVertical: 10 },
    sub: { color: t.soft, fontSize: 13 * f, textAlign: 'center', marginVertical: 5 },
    card: { backgroundColor: t.card, borderRadius: 22, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    bar: { alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: t.bg, overflow: 'hidden', marginTop: 4 },
    fill: { height: 10, backgroundColor: t.ok, borderRadius: 5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    cat: { width: '48%', backgroundColor: t.card, borderRadius: 22, padding: 16, marginBottom: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    emoji: { fontSize: 28 }, catName: { fontSize: 15 * f, fontWeight: '700', color: t.ink, marginTop: 4, textAlign: 'center' },
    cardBox: { width: 330, maxWidth: '100%', marginVertical: 10 },
    cardsPage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 14, paddingBottom: 22 },
    prog: { width: 330, maxWidth: '100%' },
    tools: { flexDirection: 'row', gap: 5, width: 330, maxWidth: '100%', marginTop: 2 },
    tool: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.soft + '55' },
    toolOn: { backgroundColor: t.gold, borderColor: t.gold }, toolI: { fontSize: 17 }, toolT: { fontSize: 9.5, color: t.soft, marginTop: 2, maxWidth: '100%' },
    rowFull: { flexDirection: 'row', gap: 10, width: 330, maxWidth: '100%' },
    pills: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
    pill: { flex: 1, backgroundColor: t.bg, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
    pillN: { fontSize: 17 * f, fontWeight: '800', color: t.ink }, pillL: { fontSize: 11 * f, color: t.soft, marginTop: 2, textAlign: 'center' },
    lvlRow: { alignItems: 'center', marginBottom: 4 }, lvlN: { fontSize: 17 * f, fontWeight: '800', color: t.ink },
    week: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 64, marginTop: 12 },
    wcol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    wbarBg: { width: 14, flex: 1, justifyContent: 'flex-end', backgroundColor: t.bg, borderRadius: 7, overflow: 'hidden' },
    wbar: { width: 14, backgroundColor: t.ok, borderRadius: 7 }, wl: { fontSize: 11, color: t.soft, marginTop: 3 },
    face: { position: 'absolute', width: '100%', height: '100%', backgroundColor: t.card, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', elevation: 5, padding: 14 },
    back: { backgroundColor: t.back },
    big: { fontSize: 36 * f, fontWeight: '800', color: t.ink, textAlign: 'center', writingDirection: 'rtl', marginVertical: 4 },
    hebBig: { fontSize: 24 * f, color: t.ink, textAlign: 'center', marginVertical: 8, fontWeight: '600' },
    tag: { position: 'absolute', top: 14, color: t.soft, fontSize: 12 * f, backgroundColor: t.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
    tag2: { color: t.soft, fontSize: 12 * f, backgroundColor: t.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
    gen: { fontSize: 12 * f, color: '#1B2A41', backgroundColor: t.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9, overflow: 'hidden', fontWeight: '700', marginRight: 6, marginTop: 6 },
    rowC: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    tr: { fontSize: 18 * f, color: t.soft, marginTop: 6, textAlign: 'center' },
    note: { fontSize: 13 * f, color: t.soft, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 },
    exBox: { alignSelf: 'stretch', backgroundColor: t.bg, borderRadius: 16, padding: 12, marginVertical: 10, alignItems: 'center' },
    exY: { fontSize: 18 * f, fontWeight: '700', color: t.ink, textAlign: 'center' }, exT: { fontSize: 14 * f, color: t.soft, marginTop: 2, textAlign: 'center' }, exH: { fontSize: 15 * f, color: t.ink, marginTop: 2, textAlign: 'center' },
    exBack: { marginTop: 8, alignItems: 'center', paddingHorizontal: 6 }, exYb: { fontSize: 15 * f, color: t.gold, fontWeight: '700', textAlign: 'center' }, exHb: { fontSize: 13 * f, color: '#cbd5e1', textAlign: 'center' },
    overlay: { flex: 1, backgroundColor: '#000A', justifyContent: 'center', padding: 20 },
    sheet: { backgroundColor: t.card, borderRadius: 26, padding: 18, maxHeight: '88%' },
    row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 6 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
    chipOn: { backgroundColor: t.gold, borderColor: t.gold }, chipT: { color: t.ink, fontSize: 14 * f }, chipTOn: { color: '#1B2A41', fontWeight: '800' },
    btn: { backgroundColor: t.gold, paddingVertical: 12, paddingHorizontal: 26, borderRadius: 16, marginTop: 14, alignSelf: 'center' },
    btnAlt: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.gold },
    btnT: { fontSize: 16 * f, fontWeight: '800', color: '#1B2A41', textAlign: 'center' }, btnAltT: { color: t.ink },
    opt: { backgroundColor: t.card, borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1, borderColor: t.line },
    optT: { fontSize: 18 * f, color: t.ink, textAlign: 'center' },
    input: { backgroundColor: t.card, color: t.ink, margin: 16, padding: 14, borderRadius: 16, fontSize: 16 * f, textAlign: 'right', borderWidth: 1, borderColor: t.line },
    item: { backgroundColor: t.card, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    itemY: { fontSize: 22 * f, fontWeight: '800', color: t.ink, textAlign: 'center' }, itemH: { fontSize: 16 * f, color: t.ink, marginTop: 2 },
    ico: { fontSize: 22, marginHorizontal: 8, marginVertical: 3 },
    stat: { fontSize: 16 * f, color: t.ink, textAlign: 'right', marginVertical: 3 },
    achRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }, achI: { fontSize: 26, marginHorizontal: 10 },
    achN: { fontSize: 15 * f, fontWeight: '700', color: t.ink, textAlign: 'right' }, achD: { fontSize: 12.5 * f, color: t.soft, textAlign: 'right' },
    tabs: { flexDirection: 'row', backgroundColor: t.card, paddingVertical: 6, marginHorizontal: 8, marginBottom: 8, marginTop: 4, borderRadius: 24, elevation: 8 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 1 }, tabPill: { backgroundColor: t.bg, borderRadius: 18, marginHorizontal: 1 }, tabI: { fontSize: 19 },
    tabT: { fontSize: 11, color: t.soft, maxWidth: '100%' }, tabOn: { color: t.ink, fontWeight: '800' },
  }),
  gold: t.gold, okC: t.ok, badC: t.bad, softC: t.soft,
});

const TABS = [['home', '🏠', 'בית'], ['cards', '🃏', 'כרטיסיות'], ['quiz', '🎯', 'חידון'], ['match', '🧩', 'זיווג'], ['search', '🔍', 'חיפוש'], ['more', '⚙️', 'עוד']];
const INIT = { learned: {}, fav: {}, weak: {}, day: '', today: 0, accent: 0, theme: 'auto', scale: 1, srs: {}, xp: 0, hist: {}, bestMatch: {}, stats: { played: 0, correct: 0, total: 0, streak: 0, perfect: 0 } };

export default function App() {
  const scheme = useColorScheme();
  const [S, setS] = useState(INIT);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('home');
  const [cat, setCat] = useState('all');
  const [kb, setKb] = useState(false);
  const [mw, setMw] = useState(null);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setKb(true)), b = Keyboard.addListener('keyboardDidHide', () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (mw) { setMw(null); return true; } if (tab !== 'home') { setTab('home'); return true; } return false; });
    return () => sub.remove();
  }, [tab, mw]);
  useEffect(() => {
    FS.readAsStringAsync(FILE).then((x) => {
      const p = JSON.parse(x);
      if (p.theme === undefined && typeof p.dark === 'boolean') p.theme = p.dark ? 'dark' : 'light';
      setS((s) => ({ ...s, ...p, stats: { ...s.stats, ...(p.stats || {}) } }));
    }).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready) return;
    const d = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
    setS((s) => (s.last === d ? s : { ...s, last: d, streakDays: s.last === y ? (s.streakDays || 0) + 1 : 1 }));
  }, [ready]);
  const SR = useRef(S); SR.current = S;
  const flush = useCallback(() => { FS.writeAsStringAsync(FILE, JSON.stringify(SR.current)).catch(() => {}); }, []);
  useEffect(() => { if (!ready) return; const id = setTimeout(flush, 800); return () => clearTimeout(id); }, [S, ready]);
  useEffect(() => { const sub = AppState.addEventListener('change', (x) => { if (x !== 'active' && ready) flush(); }); return () => sub.remove(); }, [ready]);
  const dark = (S.theme || 'auto') === 'auto' ? scheme === 'dark' : S.theme === 'dark';
  const t = { ...THEMES[dark ? 'dark' : 'light'], gold: ACCENTS[S.accent || 0] };
  const st = useMemo(() => mk(t, S.scale), [dark, S.scale, S.accent]);
  const toggle = (key, id) => setS((s) => { const m = { ...s[key] }; const d = new Date().toDateString(); let today = s.day === d ? s.today : 0; if (m[id]) delete m[id]; else { m[id] = 1; if (key === 'learned') today += 1; } return { ...s, [key]: m, day: d, today }; });
  const addXp = useCallback((n) => setS((s) => { const d = dayNo(), h = s.hist || {}; return { ...s, xp: (s.xp || 0) + n, hist: { ...h, [d]: (h[d] || 0) + n } }; }), []);
  const buzz = (ok) => { if (S.vib === false) return; try { Vibration.vibrate(ok ? 12 : [0, 35, 60, 35]); } catch (e) {} };
  const rate = (id, ok) => { addXp(ok ? 2 : 0); setS((s) => {
    const c = (s.srs || {})[id], box = ok ? Math.min((c ? c[0] : 0) + 1, 5) : 0;
    const learned = { ...s.learned }, weak = { ...s.weak }, d = new Date().toDateString();
    let today = s.day === d ? s.today : 0;
    if (ok) { delete weak[id]; if (box >= 3 && !learned[id]) { learned[id] = 1; today += 1; } } else weak[id] = 1;
    return { ...s, srs: { ...(s.srs || {}), [id]: [box, dayNo() + INT[box]] }, learned, weak, day: d, today };
  }); };
  const pool = poolOf(cat, S);
  const cur = CATS.find((c) => c.k === cat);
  return (
    <Ctx.Provider value={{ st, S, setS, toggle, rate, addXp, buzz, openWord: setMw }}>
      <SafeAreaView style={st.root}>
        <StatusBar barStyle="light-content" backgroundColor={t.head} />
        <View style={st.head}><Text style={st.title}>יידיש אָפליין</Text><Text style={st.credit}>בשיתוף: יהודי לא פשוט @ מתמחים טופ</Text>{tab !== 'home' && tab !== 'more' && tab !== 'search' && <Text style={st.headSub}>{cur.i} {cur.n} · {pool.length} מילים</Text>}</View>
        <View style={{ flex: 1 }}>
          {tab === 'home' && <Home pick={(k) => { setCat(k); setTab('cards'); }} go={(k, t2) => { setCat(k); setTab(t2); }} />}
          {tab === 'cards' && <Cards key={cat} pool={pool} />}
          {tab === 'quiz' && <Quiz key={cat} pool={pool} />}
          {tab === 'match' && <Match key={cat} pool={pool} />}
          {tab === 'search' && <Search />}
          {tab === 'more' && <More />}
        </View>
        {!kb && <View style={st.tabs}>
          {TABS.map(([k, i, n]) => (
            <TouchableOpacity key={k} style={[st.tab, tab === k && st.tabPill]} onPress={() => setTab(k)}>
              <Text style={[st.tabI, tab !== k && { opacity: 0.5 }]}>{i}</Text>
              <Text style={[st.tabT, tab === k && st.tabOn]} numberOfLines={1} adjustsFontSizeToFit>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>}
        <WordModal w={mw} onClose={() => setMw(null)} />
      </SafeAreaView>
    </Ctx.Provider>
  );
}
