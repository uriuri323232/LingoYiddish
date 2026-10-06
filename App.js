import React, { useRef, useState, useEffect, useMemo, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, Animated, TextInput, FlatList, StyleSheet, SafeAreaView, ScrollView, StatusBar, Alert } from 'react-native';
import * as FS from 'expo-file-system';
import RAW from './vocabulary.json';

const DATA = RAW.map((w) => ({ ...w, id: w.y + '|' + w.h }));
const FILE = FS.documentDirectory + 'progress.json';
const CATS = [
  { k: 'all', n: 'הכול', i: '📚' }, { k: 'todo', n: 'עוד לא נלמדו', i: '📖' }, { k: 'fav', n: 'מועדפים', i: '⭐' },
  { k: 'greetings', n: 'ברכות', i: '👋' }, { k: 'daily', n: 'חיי יום-יום', i: '🏠' }, { k: 'food', n: 'אוכל', i: '🍞' },
  { k: 'family', n: 'משפחה', i: '👪' }, { k: 'numbers', n: 'מספרים וזמן', i: '🔢' }, { k: 'verbs', n: 'פעלים', i: '🏃' },
  { k: 'holidays', n: 'שבת וחגים', i: '🕯️' }, { k: 'nature', n: 'טבע וחיות', i: '🌳' }, { k: 'clothes', n: 'לבוש', i: '🧥' },
  { k: 'adj', n: 'תארים וצבעים', i: '🎨' }, { k: 'questions', n: 'מילות שאלה', i: '❓' }, { k: 'phrases', n: 'משפטים שימושיים', i: '💬' },
];
const THEMES = {
  light: { bg: '#EEF2F6', card: '#FFFFFF', ink: '#1B2A41', soft: '#6B7A90', gold: '#F2A900', ok: '#2E7D5B', bad: '#B23A48', head: '#1B2A41', back: '#1B2A41' },
  dark: { bg: '#0F1624', card: '#1A2438', ink: '#E8EDF5', soft: '#93A1B8', gold: '#F2B93B', ok: '#3FA67A', bad: '#D1566A', head: '#0A101C', back: '#26354F' },
};
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const norm = (s) => s.replace(/[\u0591-\u05C7]/g, '').toLowerCase().trim();
const poolOf = (cat, S) =>
  cat === 'all' ? DATA : cat === 'fav' ? DATA.filter((w) => S.fav[w.id]) : cat === 'todo' ? DATA.filter((w) => !S.learned[w.id]) : DATA.filter((w) => w.c === cat);
const Ctx = createContext();
const useApp = () => useContext(Ctx);

const Chip = ({ on, label, onPress }) => { const { st } = useApp(); return (
  <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]}><Text style={[st.chipT, on && st.chipTOn]}>{label}</Text></TouchableOpacity>); };
const Btn = ({ label, onPress, alt }) => { const { st } = useApp(); return (
  <TouchableOpacity style={[st.btn, alt && st.btnAlt]} onPress={onPress}><Text style={[st.btnT, alt && st.btnAltT]}>{label}</Text></TouchableOpacity>); };
const Empty = () => { const { st } = useApp(); return <View style={st.center}><Text style={st.sub}>אין מילים בקטגוריה הזו. בחרו קטגוריה אחרת.</Text></View>; };

function Home({ pick }) {
  const { st, S } = useApp();
  const wod = DATA[Math.floor(Date.now() / 864e5) % DATA.length];
  const done = DATA.filter((w) => S.learned[w.id]).length;
  return (
    <ScrollView contentContainerStyle={st.pad}>
      <View style={st.card}>
        <Text style={st.sub}>המילה של היום</Text>
        <Text style={st.big}>{wod.y}</Text>
        <Text style={st.tr}>{wod.t} · {wod.h}</Text>
      </View>
      <View style={st.card}>
        <Text style={st.sub}>התקדמות: נלמדו {done} מתוך {DATA.length}</Text>
        <View style={st.bar}><View style={[st.fill, { width: `${(done / DATA.length) * 100}%` }]} /></View>
      </View>
      <View style={st.grid}>
        {CATS.map((c) => {
          const p = poolOf(c.k, S);
          return (
            <TouchableOpacity key={c.k} style={st.cat} onPress={() => pick(c.k)}>
              <Text style={st.emoji}>{c.i}</Text>
              <Text style={st.catName}>{c.n}</Text>
              <Text style={st.sub}>{p.filter((w) => S.learned[w.id]).length}/{p.length}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Cards({ pool }) {
  const { st, S, toggle } = useApp();
  const [list, setList] = useState(pool);
  const [shuf, setShuf] = useState(false);
  const [rev, setRev] = useState(false);
  const [i, setI] = useState(0);
  const [flipped, setF] = useState(false);
  const a = useRef(new Animated.Value(0)).current;
  if (!list.length) return <Empty />;
  const w = list[i % list.length];
  const flip = () => { Animated.spring(a, { toValue: flipped ? 0 : 180, friction: 8, tension: 12, useNativeDriver: true }).start(); setF(!flipped); };
  const go = (d) => { a.setValue(0); setF(false); setI((i + d + list.length) % list.length); };
  const mix = () => { setShuf(!shuf); setList(!shuf ? shuffle(pool) : pool); setI(0); a.setValue(0); setF(false); };
  const rot = (o) => ({ transform: [{ perspective: 1000 }, { rotateY: a.interpolate({ inputRange: [0, 180], outputRange: o }) }] });
  return (
    <View style={st.center}>
      <Text style={st.sub}>{(i % list.length) + 1} / {list.length}</Text>
      <TouchableOpacity activeOpacity={0.95} onPress={flip} style={st.cardBox}>
        <Animated.View style={[st.face, rot(['0deg', '180deg'])]}>
          <Text style={st.big}>{rev ? w.h : w.y}</Text>
          {!rev && <Text style={st.tr}>{w.t}</Text>}
          <Text style={st.sub}>הקישו להפוך</Text>
        </Animated.View>
        <Animated.View style={[st.face, st.back, rot(['180deg', '360deg'])]}>
          <Text style={[st.big, { color: '#fff' }]}>{rev ? w.y : w.h}</Text>
          {rev && <Text style={[st.tr, { color: st.gold }]}>{w.t}</Text>}
        </Animated.View>
      </TouchableOpacity>
      <View style={st.row}>
        <Chip on={!!S.fav[w.id]} label="⭐ מועדף" onPress={() => toggle('fav', w.id)} />
        <Chip on={!!S.learned[w.id]} label="✓ נלמד" onPress={() => toggle('learned', w.id)} />
        <Chip on={shuf} label="🔀 ערבוב" onPress={mix} />
        <Chip on={rev} label="🔁 עברית קודם" onPress={() => { setRev(!rev); a.setValue(0); setF(false); }} />
      </View>
      <View style={st.row}><Btn label="הקודם" alt onPress={() => go(-1)} /><Btn label="הבא" onPress={() => go(1)} /></View>
    </View>
  );
}

function Quiz({ pool }) {
  const { st, setS } = useApp();
  const [ph, setPh] = useState('setup');
  const [dir, setDir] = useState('yh');
  const [cnt, setCnt] = useState(10);
  const [qs, setQs] = useState([]);
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [sel, setSel] = useState(null);
  const [run, setRun] = useState(0);
  const [best, setBest] = useState(0);
  const [wrong, setWrong] = useState([]);
  if (!pool.length) return <Empty />;
  const start = () => {
    setQs(shuffle(pool).slice(0, cnt).map((w) => ({ w, opts: shuffle([w, ...shuffle(DATA.filter((x) => x.h !== w.h && x.y !== w.y)).slice(0, 3)]) })));
    setN(0); setScore(0); setRun(0); setBest(0); setWrong([]); setSel(null); setPh('play');
  };
  const q = qs[n];
  const choose = (o) => {
    if (sel) return;
    setSel(o);
    if (o.id === q.w.id) { setScore(score + 1); setRun(run + 1); setBest(Math.max(best, run + 1)); }
    else { setRun(0); setWrong([...wrong, q.w]); }
  };
  const next = () => {
    if (n + 1 >= qs.length) {
      setS((s) => ({ ...s, stats: { played: s.stats.played + 1, correct: s.stats.correct + score, total: s.stats.total + qs.length, streak: Math.max(s.stats.streak, best) } }));
      setPh('end');
    } else { setSel(null); setN(n + 1); }
  };
  if (ph === 'setup')
    return (
      <ScrollView contentContainerStyle={st.pad}>
        <Text style={st.h1}>הגדרות חידון</Text>
        <Text style={st.sub}>כיוון</Text>
        <View style={st.row}><Chip on={dir === 'yh'} label="יידיש ← עברית" onPress={() => setDir('yh')} /><Chip on={dir === 'hy'} label="עברית ← יידיש" onPress={() => setDir('hy')} /></View>
        <Text style={st.sub}>מספר שאלות</Text>
        <View style={st.row}>{[5, 10, 20].map((c) => <Chip key={c} on={cnt === c} label={String(c)} onPress={() => setCnt(c)} />)}</View>
        <Btn label="התחלה" onPress={start} />
      </ScrollView>
    );
  if (ph === 'end')
    return (
      <ScrollView contentContainerStyle={st.pad}>
        <Text style={st.h1}>הציון שלכם</Text>
        <Text style={st.big}>{score} / {qs.length}</Text>
        <Text style={st.sub}>רצף הצלחות הארוך ביותר: {best}</Text>
        {wrong.length > 0 && <Text style={st.h1}>כדאי לחזור על</Text>}
        {wrong.map((w) => <View key={w.id} style={st.card}><Text style={st.itemY}>{w.y}</Text><Text style={st.tr}>{w.t} · {w.h}</Text></View>)}
        <View style={st.row}><Btn label="שוב" onPress={start} /><Btn label="הגדרות" alt onPress={() => setPh('setup')} /></View>
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={st.pad}>
      <Text style={st.sub}>שאלה {n + 1} מתוך {qs.length} · ניקוד {score} · רצף {run}</Text>
      <Text style={st.big}>{dir === 'yh' ? q.w.y : q.w.h}</Text>
      {dir === 'yh' && <Text style={st.tr}>{q.w.t}</Text>}
      {q.opts.map((o) => {
        const right = sel && o.id === q.w.id, bad = sel === o && o.id !== q.w.id;
        return (
          <TouchableOpacity key={o.id} onPress={() => choose(o)} style={[st.opt, right && { backgroundColor: st.okC }, bad && { backgroundColor: st.badC }]}>
            <Text style={[st.optT, (right || bad) && { color: '#fff' }]}>{dir === 'yh' ? o.h : o.y}</Text>
          </TouchableOpacity>
        );
      })}
      {sel && <Btn label={n + 1 === qs.length ? 'סיום' : 'הבא'} onPress={next} />}
    </ScrollView>
  );
}

function Search() {
  const { st, S, toggle } = useApp();
  const [q, setQ] = useState('');
  const k = norm(q);
  const res = k ? DATA.filter((w) => norm(w.y).includes(k) || norm(w.h).includes(k) || w.t.includes(k)) : DATA;
  return (
    <View style={{ flex: 1 }}>
      <TextInput style={st.input} value={q} onChangeText={setQ} placeholder="חיפוש ביידיש, בעברית או בתעתיק" placeholderTextColor={st.softC} textAlign="right" />
      <FlatList data={res} keyExtractor={(w) => w.id} contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={st.sub}>לא נמצאו תוצאות. נסו מילה אחרת.</Text>}
        renderItem={({ item }) => (
          <View style={st.item}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={st.itemY}>{item.y}</Text><Text style={st.tr}>{item.t}</Text><Text style={st.itemH}>{item.h}</Text>
            </View>
            <View>
              <TouchableOpacity onPress={() => toggle('fav', item.id)}><Text style={st.ico}>{S.fav[item.id] ? '⭐' : '☆'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => toggle('learned', item.id)}><Text style={st.ico}>{S.learned[item.id] ? '✅' : '⬜'}</Text></TouchableOpacity>
            </View>
          </View>
        )} />
    </View>
  );
}

function More() {
  const { st, S, setS } = useApp();
  const { played, correct, total, streak } = S.stats;
  const reset = () => Alert.alert('איפוס התקדמות', 'למחוק את כל המילים שנלמדו, המועדפים והסטטיסטיקה?', [
    { text: 'ביטול', style: 'cancel' },
    { text: 'מחיקה', style: 'destructive', onPress: () => setS((s) => ({ ...s, learned: {}, fav: {}, stats: { played: 0, correct: 0, total: 0, streak: 0 } })) },
  ]);
  return (
    <ScrollView contentContainerStyle={st.pad}>
      <View style={st.card}>
        <Text style={st.h1}>הסטטיסטיקה שלי</Text>
        <Text style={st.stat}>חידונים שהושלמו: {played}</Text>
        <Text style={st.stat}>דיוק כולל: {total ? Math.round((correct / total) * 100) : 0}%</Text>
        <Text style={st.stat}>רצף הצלחות שיא: {streak}</Text>
        <Text style={st.stat}>מילים שנלמדו: {Object.keys(S.learned).length}</Text>
        <Text style={st.stat}>מועדפים: {Object.keys(S.fav).length}</Text>
      </View>
      <View style={st.card}>
        <Text style={st.h1}>תצוגה</Text>
        <View style={st.row}><Chip on={!S.dark} label="☀️ בהיר" onPress={() => setS({ ...S, dark: false })} /><Chip on={S.dark} label="🌙 כהה" onPress={() => setS({ ...S, dark: true })} /></View>
        <Text style={st.sub}>גודל טקסט</Text>
        <View style={st.row}>{[[0.9, 'קטן'], [1, 'רגיל'], [1.2, 'גדול']].map(([v, l]) => <Chip key={l} on={S.scale === v} label={l} onPress={() => setS({ ...S, scale: v })} />)}</View>
      </View>
      <Btn label="איפוס התקדמות" alt onPress={reset} />
    </ScrollView>
  );
}

const mk = (t, f) => ({
  ...StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    head: { backgroundColor: t.head, paddingTop: 36, paddingBottom: 14, alignItems: 'center' },
    title: { color: '#fff', fontSize: 24 * f, fontWeight: '700' },
    headSub: { color: t.gold, marginTop: 2, fontSize: 14 * f },
    pad: { padding: 18 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
    h1: { fontSize: 20 * f, fontWeight: '700', color: t.ink, textAlign: 'center', marginVertical: 10 },
    sub: { color: t.soft, fontSize: 13 * f, textAlign: 'center', marginVertical: 5 },
    card: { backgroundColor: t.card, borderRadius: 18, padding: 16, marginBottom: 12 },
    bar: { height: 10, borderRadius: 5, backgroundColor: t.bg, overflow: 'hidden', marginTop: 4 },
    fill: { height: 10, backgroundColor: t.ok },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    cat: { width: '48%', backgroundColor: t.card, borderRadius: 18, padding: 14, marginBottom: 12, alignItems: 'center' },
    emoji: { fontSize: 28 }, catName: { fontSize: 15 * f, fontWeight: '600', color: t.ink, marginTop: 4, textAlign: 'center' },
    cardBox: { width: 300, height: 280, marginVertical: 14 },
    face: { position: 'absolute', width: '100%', height: '100%', backgroundColor: t.card, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', elevation: 4, padding: 12 },
    back: { backgroundColor: t.back },
    big: { fontSize: 38 * f, fontWeight: '700', color: t.ink, textAlign: 'center', writingDirection: 'rtl' },
    tr: { fontSize: 18 * f, color: t.soft, marginTop: 6, textAlign: 'center' },
    row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 6 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.soft },
    chipOn: { backgroundColor: t.gold, borderColor: t.gold }, chipT: { color: t.ink, fontSize: 14 * f }, chipTOn: { color: '#1B2A41', fontWeight: '700' },
    btn: { backgroundColor: t.gold, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, marginTop: 14, alignSelf: 'center' },
    btnAlt: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.gold },
    btnT: { fontSize: 16 * f, fontWeight: '700', color: '#1B2A41' }, btnAltT: { color: t.ink },
    opt: { backgroundColor: t.card, borderRadius: 14, padding: 16, marginTop: 10 },
    optT: { fontSize: 18 * f, color: t.ink, textAlign: 'center' },
    input: { backgroundColor: t.card, color: t.ink, margin: 16, padding: 14, borderRadius: 14, fontSize: 16 * f },
    item: { backgroundColor: t.card, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    itemY: { fontSize: 22 * f, fontWeight: '700', color: t.ink }, itemH: { fontSize: 16 * f, color: t.ink, marginTop: 2 },
    ico: { fontSize: 22, marginHorizontal: 8, marginVertical: 3 },
    stat: { fontSize: 16 * f, color: t.ink, textAlign: 'right', marginVertical: 3 },
    tabs: { flexDirection: 'row', backgroundColor: t.card, paddingVertical: 8 },
    tab: { flex: 1, alignItems: 'center' }, tabI: { fontSize: 20 },
    tabT: { fontSize: 12 * f, color: t.soft }, tabOn: { color: t.ink, fontWeight: '700' },
  }),
  gold: t.gold, okC: t.ok, badC: t.bad, softC: t.soft,
});

const TABS = [['home', '🏠', 'בית'], ['cards', '🃏', 'כרטיסיות'], ['quiz', '🎯', 'חידון'], ['search', '🔍', 'חיפוש'], ['more', '⚙️', 'עוד']];

export default function App() {
  const [S, setS] = useState({ learned: {}, fav: {}, dark: false, scale: 1, stats: { played: 0, correct: 0, total: 0, streak: 0 } });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('home');
  const [cat, setCat] = useState('all');
  useEffect(() => { FS.readAsStringAsync(FILE).then((x) => setS((s) => ({ ...s, ...JSON.parse(x) }))).catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => { if (ready) FS.writeAsStringAsync(FILE, JSON.stringify(S)).catch(() => {}); }, [S, ready]);
  const t = THEMES[S.dark ? 'dark' : 'light'];
  const st = useMemo(() => mk(t, S.scale), [S.dark, S.scale]);
  const toggle = (key, id) => setS((s) => { const m = { ...s[key] }; if (m[id]) delete m[id]; else m[id] = 1; return { ...s, [key]: m }; });
  const pool = poolOf(cat, S);
  return (
    <Ctx.Provider value={{ st, S, setS, toggle }}>
      <SafeAreaView style={st.root}>
        <StatusBar barStyle="light-content" backgroundColor={t.head} />
        <View style={st.head}><Text style={st.title}>יידיש אָפליין</Text><Text style={st.headSub}>{CATS.find((c) => c.k === cat).n}</Text></View>
        <View style={{ flex: 1 }}>
          {tab === 'home' && <Home pick={(k) => { setCat(k); setTab('cards'); }} />}
          {tab === 'cards' && <Cards key={cat} pool={pool} />}
          {tab === 'quiz' && <Quiz key={cat} pool={pool} />}
          {tab === 'search' && <Search />}
          {tab === 'more' && <More />}
        </View>
        <View style={st.tabs}>
          {TABS.map(([k, i, n]) => (
            <TouchableOpacity key={k} style={st.tab} onPress={() => setTab(k)}>
              <Text style={[st.tabI, tab !== k && { opacity: 0.5 }]}>{i}</Text>
              <Text style={[st.tabT, tab === k && st.tabOn]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </Ctx.Provider>
  );
}
