import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, TextInput, FlatList, StyleSheet, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import DATA from './vocabulary.json';

const C = { ink: '#1B2A41', mist: '#EEF2F6', card: '#FFFFFF', gold: '#F2A900', ok: '#2E7D5B', bad: '#B23A48', soft: '#6B7A90' };
const CATS = [
  { k: 'all', n: 'הכול', i: '📚' }, { k: 'greetings', n: 'ברכות', i: '👋' },
  { k: 'daily', n: 'חיי יום-יום', i: '🏠' }, { k: 'food', n: 'אוכל', i: '🍞' },
  { k: 'family', n: 'משפחה', i: '👪' }, { k: 'numbers', n: 'מספרים וזמן', i: '🔢' },
  { k: 'verbs', n: 'פעלים', i: '🏃' },
];
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const norm = (s) => s.replace(/[\u0591-\u05C7]/g, '').toLowerCase().trim();
const poolOf = (cat) => (cat === 'all' ? DATA : DATA.filter((w) => w.c === cat));
const count = (k) => poolOf(k).length;

function Home({ cat, pick }) {
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.h1}>בחרו קטגוריה</Text>
      <View style={s.grid}>
        {CATS.map((c) => (
          <TouchableOpacity key={c.k} style={[s.cat, cat === c.k && s.catOn]} onPress={() => pick(c.k)}>
            <Text style={s.emoji}>{c.i}</Text>
            <Text style={s.catName}>{c.n}</Text>
            <Text style={s.sub}>{count(c.k)} מילים</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function Cards({ pool }) {
  const [i, setI] = useState(0);
  const [flipped, setF] = useState(false);
  const a = useRef(new Animated.Value(0)).current;
  const w = pool[i % pool.length];
  const flip = () => { Animated.spring(a, { toValue: flipped ? 0 : 180, friction: 8, tension: 12, useNativeDriver: true }).start(); setF(!flipped); };
  const go = (d) => { a.setValue(0); setF(false); setI((i + d + pool.length) % pool.length); };
  const rot = (o) => ({ transform: [{ perspective: 1000 }, { rotateY: a.interpolate({ inputRange: [0, 180], outputRange: o }) }] });
  return (
    <View style={s.center}>
      <Text style={s.sub}>{(i % pool.length) + 1} / {pool.length}</Text>
      <TouchableOpacity activeOpacity={0.95} onPress={flip} style={s.cardBox}>
        <Animated.View style={[s.face, rot(['0deg', '180deg'])]}>
          <Text style={s.big}>{w.y}</Text>
          <Text style={s.tr}>{w.t}</Text>
          <Text style={s.sub}>הקישו להפוך</Text>
        </Animated.View>
        <Animated.View style={[s.face, s.back, rot(['180deg', '360deg'])]}>
          <Text style={[s.big, { color: '#fff' }]}>{w.h}</Text>
          <Text style={[s.tr, { color: C.gold }]}>{w.y}</Text>
        </Animated.View>
      </TouchableOpacity>
      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={() => go(-1)}><Text style={s.btnT}>הקודם</Text></TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={() => go(1)}><Text style={s.btnT}>הבא</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Quiz({ pool }) {
  const make = () => shuffle(pool).slice(0, 10).map((w) => ({ w, opts: shuffle([w, ...shuffle(DATA.filter((x) => x.h !== w.h)).slice(0, 3)]) }));
  const [qs, setQs] = useState(make);
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [sel, setSel] = useState(null);
  const restart = () => { setQs(make()); setN(0); setScore(0); setSel(null); };
  if (n >= qs.length)
    return (
      <View style={s.center}>
        <Text style={s.h1}>הציון שלכם</Text>
        <Text style={s.big}>{score} / {qs.length}</Text>
        <TouchableOpacity style={s.btn} onPress={restart}><Text style={s.btnT}>שוב</Text></TouchableOpacity>
      </View>
    );
  const q = qs[n];
  const choose = (o) => { if (sel) return; setSel(o); if (o.h === q.w.h) setScore(score + 1); };
  const next = () => { setSel(null); setN(n + 1); };
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.sub}>שאלה {n + 1} מתוך {qs.length} · ניקוד {score}</Text>
      <Text style={s.big}>{q.w.y}</Text>
      <Text style={s.tr}>{q.w.t}</Text>
      {q.opts.map((o) => {
        const right = sel && o.h === q.w.h, wrong = sel === o && o.h !== q.w.h;
        return (
          <TouchableOpacity key={o.h} onPress={() => choose(o)} style={[s.opt, right && { backgroundColor: C.ok }, wrong && { backgroundColor: C.bad }]}>
            <Text style={[s.optT, (right || wrong) && { color: '#fff' }]}>{o.h}</Text>
          </TouchableOpacity>
        );
      })}
      {sel && <TouchableOpacity style={s.btn} onPress={next}><Text style={s.btnT}>{n + 1 === qs.length ? 'סיום' : 'הבא'}</Text></TouchableOpacity>}
    </ScrollView>
  );
}

function Search() {
  const [q, setQ] = useState('');
  const k = norm(q);
  const res = k ? DATA.filter((w) => norm(w.y).includes(k) || norm(w.h).includes(k) || w.t.includes(k)) : DATA;
  return (
    <View style={{ flex: 1 }}>
      <TextInput style={s.input} value={q} onChangeText={setQ} placeholder="חיפוש ביידיש, בעברית או בתעתיק" textAlign="right" />
      <FlatList data={res} keyExtractor={(w, i) => w.y + i} contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.sub}>לא נמצאו תוצאות. נסו מילה אחרת.</Text>}
        renderItem={({ item }) => (
          <View style={s.item}>
            <Text style={s.itemY}>{item.y}</Text>
            <Text style={s.tr}>{item.t}</Text>
            <Text style={s.itemH}>{item.h}</Text>
          </View>
        )} />
    </View>
  );
}

const TABS = [['home', 'קטגוריות'], ['cards', 'כרטיסיות'], ['quiz', 'חידון'], ['search', 'חיפוש']];

export default function App() {
  const [tab, setTab] = useState('home');
  const [cat, setCat] = useState('all');
  const pool = poolOf(cat);
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />
      <View style={s.head}><Text style={s.title}>יידיש אָפליין</Text><Text style={s.headSub}>{CATS.find((c) => c.k === cat).n}</Text></View>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <Home cat={cat} pick={(k) => { setCat(k); setTab('cards'); }} />}
        {tab === 'cards' && <Cards key={cat} pool={pool} />}
        {tab === 'quiz' && <Quiz key={cat} pool={pool} />}
        {tab === 'search' && <Search />}
      </View>
      <View style={s.tabs}>
        {TABS.map(([k, n]) => (
          <TouchableOpacity key={k} style={s.tab} onPress={() => setTab(k)}>
            <Text style={[s.tabT, tab === k && s.tabOn]}>{n}</Text>
            {tab === k && <View style={s.dot} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.mist },
  head: { backgroundColor: C.ink, paddingTop: 36, paddingBottom: 16, alignItems: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  headSub: { color: C.gold, marginTop: 2 },
  pad: { padding: 20, alignItems: 'stretch' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  h1: { fontSize: 22, fontWeight: '700', color: C.ink, textAlign: 'center', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cat: { width: '48%', backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 14, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  catOn: { borderColor: C.gold },
  emoji: { fontSize: 32 }, catName: { fontSize: 17, fontWeight: '600', color: C.ink, marginTop: 6 },
  sub: { color: C.soft, fontSize: 13, textAlign: 'center', marginVertical: 6 },
  cardBox: { width: 300, height: 320, marginVertical: 18 },
  face: { position: 'absolute', width: '100%', height: '100%', backgroundColor: C.card, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', elevation: 4 },
  back: { backgroundColor: C.ink },
  big: { fontSize: 40, fontWeight: '700', color: C.ink, textAlign: 'center', writingDirection: 'rtl' },
  tr: { fontSize: 20, color: C.soft, marginTop: 8, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  btn: { backgroundColor: C.gold, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, marginTop: 16, alignSelf: 'center' },
  btnT: { fontSize: 16, fontWeight: '700', color: C.ink },
  opt: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginTop: 12 },
  optT: { fontSize: 18, color: C.ink, textAlign: 'center' },
  input: { backgroundColor: C.card, margin: 16, padding: 14, borderRadius: 14, fontSize: 16 },
  item: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, alignItems: 'flex-end' },
  itemY: { fontSize: 24, fontWeight: '700', color: C.ink }, itemH: { fontSize: 17, color: C.ink, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: C.card, paddingVertical: 10 },
  tab: { flex: 1, alignItems: 'center' },
  tabT: { fontSize: 15, color: C.soft }, tabOn: { color: C.ink, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginTop: 4 },
});
