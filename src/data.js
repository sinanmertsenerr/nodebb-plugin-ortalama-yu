// Ders verisi küçük dosyalar hâlinde gelir: önce bölüm listesi, bölüm seçilince yalnız o bölümün dersleri.
// İnen dosya bellekte de tutulur (ready): ikinci kez açılınca bekleme ekranı hiç görünmez.
const cache = new Map();
const ready = new Map();
let base = '';

export const setDataBase = (url) => { base = url.replace(/\/$/, ''); };

function load(name) {
	if (!cache.has(name)) {
		const req = fetch(`${base}/${name}`, { credentials: 'same-origin' }).then((res) => {
			if (!res.ok) throw new Error(`${name}: ${res.status}`);
			return res.json();
		}).then((data) => {
			ready.set(name, data);
			return data;
		});
		// Hata önbelleğe alınmaz: "Yeniden dene" gerçekten yeniden ister
		req.catch(() => cache.delete(name));
		cache.set(name, req);
	}
	return cache.get(name);
}

export const loadIndex = () => load('index.json');
export const loadProgram = id => load(`p/${id}.json`);
export const loadAll = () => load('all.json');

// Yüklenmişse verinin kendisi, yoksa undefined (bekletmeden çizmek için)
export const peekProgram = id => ready.get(`p/${id}.json`);
export const peekIndex = () => ready.get('index.json');

// Öğrenci seçmeden önce indirilir (fakülte seçilince, bölümün üstüne gelince): tıklayınca dersler hemen açılır
export function prefetchProgram(id) {
	if (id && !cache.has(`p/${id}.json`)) load(`p/${id}.json`).catch(() => {});
}

// Müfredattaki bir yarıyılı, öğrencinin seçimleriyle birlikte satırlara çevirir.
// Dönüş: [{ type: 'course', key, code, name, akts, origin } | { type: 'group', key, code, name, akts, count, pool, picked }]
export function rowsOf(program, curId, no, sem) {
	const items = (program.cur[curId] || [])[no - 1] || [];
	const course = code => program.courses[code] || [code, null];
	const rows = [];
	items.forEach((item) => {
		if (item.c) {
			if (sem.removed.includes(item.c)) return;
			const [name, akts] = course(item.c);
			rows.push({ type: 'course', key: item.c, code: item.c, name, akts: item.a === undefined ? akts : item.a, origin: 'plan' });
			return;
		}
		const pool = (program.pools[item.p] || []).map(x => (typeof x === 'string' ? [x, course(x)[1]] : x));
		const picked = (sem.picks[item.g] || []).filter(code => pool.some(x => x[0] === code));
		rows.push({ type: 'group', key: `g:${item.g}`, code: item.g, name: item.n, akts: item.a, count: item.k, pool, picked });
		picked.forEach((code) => {
			const hit = pool.find(x => x[0] === code);
			rows.push({ type: 'course', key: `${item.g}/${code}`, code, name: course(code)[0], akts: hit[1], origin: 'pick', group: item.g });
		});
	});
	sem.extra.forEach((x) => {
		rows.push({ type: 'course', key: `x:${x.code}`, code: x.code, name: x.name, akts: x.akts, origin: 'extra' });
	});
	return rows;
}
