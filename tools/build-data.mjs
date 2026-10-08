// data/mufredat.json (resmi AKTS kataloğundan derlenmiş veri) -> static/data/<özet>/ altında tarayıcıya giden küçük dosyalar:
//   index.json     bölümler ve müfredat listesi
//   p/<bölüm>.json bir bölümün müfredatları, seçmeli havuzları ve dersleri
//   all.json       "Ders ekle" araması için bütün dersler
// Ders adları katalogda BÜYÜK HARF. Okunur yazıma yalnızca emin olunan yerde çevrilir (bkz. displayName); emin olunmayan ad
// katalogdaki hâliyle kalır, böylece yanlış ı/i üretilmez.
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = async f => JSON.parse(await readFile(path.join(root, 'data', f), 'utf8'));
const muf = await read('mufredat.json');
const tt = await read('timetable-2026-guz.json');
// Otomatik çevrilemeyen adların elle yazılmış hâli (kaynaktaki yazım hataları da düzeltilmiş)
const handFixed = await read('ad-duzeltme.json');

const upTR = s => s.toLocaleUpperCase('tr');
const lowTR = s => s.toLocaleLowerCase('tr');
const squash = s => s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const ROMAN = /^(?:I{1,3}|IV|V|VI{1,3}|IX|X|XI{1,2})$/;
const SMALL_TR = new Set(['ve', 'ile', 'için', 'veya', 'ya', 'da', 'de']);
const SMALL_EN = new Set(['of', 'and', 'the', 'in', 'for', 'to', 'a', 'an', 'on', 'with', 'at', 'by', 'as', 'or']);
// Üç harfe kadar olup kısaltma olmayan sözcükler; bunların dışındaki kısa sözcükler (AB, BM, TV, CAD) büyük kalır
const SHORT_WORDS = new Set(['ve', 'ile', 'bir', 'iki', 'üç', 'iş', 'su', 'dil', 'ses', 'yer', 'göç', 'tür', 'ağ', 'et', 'süt', 'yem', 'bağ', 'tıp', 'kök', 'ısı', 'güç', 'hız', 'yol', 'hak', 'web', 'ek', 'ön', 'üst', 'alt', 'iç', 'dış', 'yan', 'ana', 'son', 'ilk', 'yaz', 'kış', 'güz', 'ara', 'çay', 'şef', 'tat', 'ürün', 'kur', 'not', 'göz', 'el', 'ev', 'kent', 'art', 'new', 'the', 'and', 'for', 'law', 'art', 'tax', 'web', 'use', 'data', 'ya', 'da', 'de', 'mı', 'mi', 'ne', 'bu', 'şu', 'o', 'film', 'of', 'in', 'to', 'on', 'at', 'by', 'as', 'or', 'an', 'a', 'eu', 'air', 'sea', 'oil', 'gas', 'war', 'age', 'era', 'big', 'job', 'pre', 'non', 'bio', 'eko', 'jeo', 'yat', 'gıda', 'bal', 'yağ', 'tuz', 'un', 'şap', 'kas', 'kan', 'ten', 'saç', 'cam', 'taş', 'kil', 'ip', 'dal', 'kol', 'baş', 'yük', 'hat', 'ray', 'uçak', 'gemi', 'ton', 'tez', 'oda', 'ofis', 'kod', 'mod', 'tip', 'tek', 'çok', 'az', 'her', 'tüm', 'yeni', 'eski', 'kısa', 'uzun', 'caz', 'bas', 'tur', 'kat', 'kar', 'boş', 'ağı', 'çim', 'eş', 'iyi', 'gaz', 'rol', 'mix']);

// İngilizce sözlük (macOS): adı İngilizce olan dersleri tanımak için
let english = new Set();
try {
	english = new Set((await readFile('/usr/share/dict/words', 'utf8')).split('\n').map(w => w.toLowerCase()));
} catch (err) { /* sözlük yoksa İngilizce adlar katalogdaki hâliyle kalır */ }

const codes = Object.keys(muf.courses);
const PREFIXES = new Set(codes.map(c => c.split(' ')[0]));
const tokensOf = name => squash(name).split(' ').filter(Boolean);

// Katalogda bazı adlar İ yerine I ile yazılmış (ENERJI, TELEKOMÜNIKASYON). Bir sözcüğün doğru yazımı iki yolla bulunur:
// 1) sıklık: noktalı hâli katalogda daha çok geçiyorsa o doğrudur; 2) ünlü uyumu: ı, ince ünlüden (e, i, ö, ü) sonra gelmez.
const freq = new Map();
for (const c of codes) tokensOf(muf.courses[c].name).forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
// İçinde İ geçen adlar Türkçe klavyeyle yazılmıştır; bu adlardaki sözcükler bilinen yazım sayılır
const trusted = new Set();
for (const c of codes) {
	const n = muf.courses[c].name;
	if (n.includes('İ')) tokensOf(n).forEach(w => trusted.add(w));
}
const breaksHarmony = (w) => {
	let prev = '';
	for (const ch of w) {
		if (ch === 'I' && 'EİÖÜ'.includes(prev)) return true;
		if ('AEIİOÖUÜ'.includes(ch)) prev = ch;
	}
	return false;
};
// Sözcüğün doğru yazımını döndürür; karar verilemiyorsa null
function spell(w, nameIsTyped) {
	if (!w.includes('I')) return w;
	const dotted = w.replace(/I/g, 'İ');
	const a = freq.get(w) || 0;
	const b = freq.get(dotted) || 0;
	if (b > a) return dotted;
	if (breaksHarmony(w)) return dotted;
	if (trusted.has(w) || nameIsTyped) return w;
	return null;
}

const isEnglishName = (name) => {
	if (/[ÇĞİÖŞÜ]/.test(name)) return false;
	const words = tokensOf(name).filter(w => /^[A-Z]{2,}$/.test(w) && !ROMAN.test(w));
	if (!words.length) return false;
	const hits = words.filter(w => english.has(w.toLowerCase())).length;
	return hits / words.length >= 0.6;
};

const capTR = w => (w ? upTR(w[0]) + lowTR(w.slice(1)) : w);
const capEN = w => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);

// Bir sözcüğü (tire, eğik çizgi, parantez içerebilir) parça parça çevirir
function caseToken(tok, first, en, fix) {
	return tok.split(/([-/(&+:.,'’])/).map((part, i, arr) => {
		if (!part || /^[-/(&+:.,'’]$/.test(part)) return part;
		const bare = part.replace(/[)]/g, '');
		const tail = part.slice(bare.length);
		if (/\d/.test(bare) || ROMAN.test(bare) || PREFIXES.has(bare)) return part;
		const word = fix(bare);
		if (word === null) return null;
		const low = en ? word.toLowerCase() : lowTR(word);
		// Kesme işaretinden sonraki ek küçük yazılır (AB'nin)
		if (i > 0 && /^['’]$/.test(arr[i - 1])) return low + tail;
		if ((en ? SMALL_EN : SMALL_TR).has(low) && !(first && i === 0)) return low + tail;
		if (bare.length <= 3 && !SHORT_WORDS.has(low)) return bare + tail;
		return (en ? capEN(word) : capTR(word)) + tail;
	});
}

// Katalogdaki BÜYÜK HARF adı okunur yazıma çevirir; emin olunamazsa null döner
function titleCase(name) {
	const en = isEnglishName(name);
	const fix = w => (en ? w : spell(w, name.includes('İ')));
	const out = [];
	const toks = name.trim().split(/\s+/);
	for (let i = 0; i < toks.length; i += 1) {
		const parts = caseToken(toks[i], i === 0, en, fix);
		if (parts.includes(null)) return null;
		out.push(parts.join(''));
	}
	return out.join(' ');
}

// Timetable'daki ad: harfleri katalogdaki adla birebir aynıysa (büyük/küçük harf dışında) elle yazılmış okunur ad olarak alınır
const ttName = new Map(tt.courses.filter(c => c.katalog).map(c => [c.code.replace(/\s+/g, ' ').trim().toUpperCase(), c.name.replace(/\s+/g, ' ').trim()]));
function fromTimetable(code, name) {
	const t = ttName.get(code);
	if (!t) return null;
	// Baş harfi küçük kalmış ya da tamamı büyük yazılmış adlar alınmaz
	if (t === upTR(t) || t === t.toUpperCase() || t[0] !== upTR(t[0])) return null;
	const want = squash(name);
	const sure = name.includes('İ') || !name.includes('I');
	if (sure && squash(upTR(t)) === want) return t;
	if (!t.includes('ı') && squash(t.toUpperCase()) === want) return t;
	return null;
}

const stats = { timetable: 0, turkce: 0, ingilizce: 0, katalog: 0 };
const keptUpper = [];
function displayName(code, name) {
	if (handFixed[code]) { stats.elle = (stats.elle || 0) + 1; return handFixed[code]; }
	const cased = titleCase(name);
	const t = fromTimetable(code, name);
	if (t) {
		stats.timetable += 1;
		// Timetable'da küçük yazılmış kısaltmalar (Utf, Ab) katalogdaki gibi büyük kalır
		const a = t.split(' ');
		const b = cased ? cased.split(' ') : [];
		if (a.length !== b.length) return t;
		return a.map((w, i) => (upTR(w) === upTR(b[i]) && /\p{Lu}{2}/u.test(b[i]) ? b[i] : w)).join(' ');
	}
	if (cased) { stats[isEnglishName(name) ? 'ingilizce' : 'turkce'] += 1; return cased; }
	stats.katalog += 1;
	keptUpper.push(`${code} | ${name}`);
	return name;
}

const names = {};
for (const c of codes) names[c] = displayName(c, muf.courses[c].name);
const groupName = n => handFixed[`grup:${n}`] || titleCase(n) || n;

// ---------- Müfredat etiketleri ----------
const VARIANT = { 'yabanci-uyruklu': 'yabancı uyruklu', 'yu-coop': 'YU-COOP', erasmus: 'Erasmus' };
function curriculaOf(p) {
	const usable = p.curricula.filter(c => c.semesters.length && VARIANT[c.variant] !== undefined || (c.variant === 'normal' && c.semesters.length));
	const list = usable.map((c) => {
		const years = c.academicYear || String(c.year);
		const base = `${years} müfredatı`;
		return { c, label: VARIANT[c.variant] ? `${base} (${VARIANT[c.variant]})` : base };
	});
	// Aynı etiket iki müfredata düşerse katalogdaki tam ad eklenir
	const seen = {};
	list.forEach((x) => { seen[x.label] = (seen[x.label] || 0) + 1; });
	list.forEach((x) => { if (seen[x.label] > 1) x.label = `${x.label} · ${x.c.label.replace(/^\d{4} \((.*)\)$/, '$1')}`; });
	return list;
}

const hash = createHash('sha256').update(JSON.stringify(muf)).update(JSON.stringify(handFixed)).update(await readFile(new URL(import.meta.url))).digest('hex').slice(0, 10);
const outRoot = path.join(root, 'static', 'data');
await mkdir(outRoot, { recursive: true });
for (const f of await readdir(outRoot)) {
	if (/^[0-9a-f]{10}$/.test(f) && f !== hash) await rm(path.join(outRoot, f), { recursive: true });
}
const out = path.join(outRoot, hash);
await mkdir(path.join(out, 'p'), { recursive: true });

const index = [];
let biggest = 0;
for (const p of muf.programs) {
	if (p.kind !== 'bolum') continue;
	const list = curriculaOf(p);
	if (!list.length) continue;
	const usedPools = {};
	const usedCourses = {};
	const use = (code) => { usedCourses[code] = [names[code], muf.courses[code].akts]; };
	const cur = {};
	for (const { c } of list) {
		cur[c.id] = c.semesters.map(s => s.items.map((i) => {
			if (i.code) {
				use(i.code);
				return i.akts === undefined ? { c: i.code } : { c: i.code, a: i.akts };
			}
			usedPools[i.pool] = muf.pools[i.pool];
			muf.pools[i.pool].forEach(x => use(typeof x === 'string' ? x : x[0]));
			return { g: i.group, n: groupName(i.name), a: i.akts, k: i.count, p: i.pool };
		}));
	}
	const body = JSON.stringify({ id: p.id, cur, pools: usedPools, courses: usedCourses });
	biggest = Math.max(biggest, body.length);
	await writeFile(path.join(out, 'p', `${p.id}.json`), body);
	index.push({ id: p.id, name: p.name, faculty: p.faculty, type: p.type, cur: list.map(({ c, label }) => ({ id: c.id, label, variant: c.variant, sems: c.semesters.length })) });
}

// Bütün dersler + timetable'da olup katalogda olmayan lisans dersleri (AKTS'si timetable'dan)
const all = codes.map(c => [c, names[c], muf.courses[c].akts]);
for (const c of tt.courses) {
	if (!c.katalog && c.akts && / [0-4]\d{3}$/.test(c.code)) all.push([c.code, c.name, c.akts]);
}
all.sort((a, b) => a[0].localeCompare(b[0], 'tr'));

await writeFile(path.join(out, 'index.json'), JSON.stringify({ updated: muf.meta.cekilme, programs: index }));
await writeFile(path.join(out, 'all.json'), JSON.stringify(all));
await writeFile(path.join(outRoot, 'manifest.json'), `${JSON.stringify({ dir: hash }, null, '\t')}\n`);
await mkdir(path.join(root, 'test', 'out'), { recursive: true });
await writeFile(path.join(root, 'test', 'out', 'adlar-katalogdaki-gibi.txt'), `${keptUpper.join('\n')}\n`);
await writeFile(path.join(root, 'test', 'out', 'adlar.txt'), `${codes.map(c => `${c} | ${muf.courses[c].name} | ${names[c]}`).join('\n')}\n`);

console.log(`veri ${hash}: ${index.length} bölüm, ${index.reduce((n, p) => n + p.cur.length, 0)} müfredat, ${all.length} ders; en büyük bölüm dosyası ${(biggest / 1024).toFixed(0)} KB`);
console.log(`ders adları: timetable ${stats.timetable}, Türkçe ${stats.turkce}, İngilizce ${stats.ingilizce}, katalogdaki gibi ${stats.katalog}, elle ${stats.elle || 0}`);
