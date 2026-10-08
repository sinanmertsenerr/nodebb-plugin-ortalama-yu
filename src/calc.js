// Yaşar Üniversitesi not sistemi (Ön Lisans ve Lisans Eğitim-Öğretim ve Sınav Yönetmeliği m.21, m.30).
// Katsayılar yüzle çarpılmış tam sayıdır (4,00 -> 400): ortalama kesirli sayı hatası olmadan hesaplanır.
// Ortalama yuvarlanmaz, virgülden sonraki üçüncü basamak atılır (m.21/5): 2,999 -> 2,99.

export const LETTERS = [
	{ id: 'A', k: 400 }, { id: 'A-', k: 370 }, { id: 'B+', k: 330 }, { id: 'B', k: 300 }, { id: 'B-', k: 270 },
	{ id: 'C+', k: 230 }, { id: 'C', k: 200 }, { id: 'C-', k: 170 }, { id: 'D+', k: 130 }, { id: 'D', k: 100 }, { id: 'F', k: 0 },
];

// NA (devamsız) F gibi 0 sayılır; S, U ve W ortalamaya girmez (m.30/2)
export const OTHERS = [{ id: 'NA', k: 0 }, { id: 'S' }, { id: 'U' }, { id: 'W' }];

const K = Object.fromEntries([...LETTERS, ...OTHERS].filter(g => g.k !== undefined).map(g => [g.id, g.k]));

export const counts = grade => K[grade] !== undefined;
export const coefficient = grade => K[grade];
export const MAX = 400;

// AKTS yarım olabilir (2,5): onla çarpılıp tam sayıya çevrilir
const units = akts => Math.round(Number(akts) * 10);

// Dersler: [{ akts, grade }]. Dönüş: puan (katsayı × AKTS × 10), akts (× 10), value (ortalama × 100, not yoksa null)
export function average(entries) {
	let points = 0;
	let akts = 0;
	entries.forEach((e) => {
		if (!counts(e.grade)) return;
		const a = units(e.akts);
		if (!(a > 0)) return;
		points += K[e.grade] * a;
		akts += a;
	});
	return { points, akts, value: akts ? Math.floor(points / akts) : null };
}

export const sum = (...parts) => {
	const points = parts.reduce((n, p) => n + p.points, 0);
	const akts = parts.reduce((n, p) => n + p.akts, 0);
	return { points, akts, value: akts ? Math.floor(points / akts) : null };
};

// Önceki dönemler elle girilir: genel ortalama (× 100) ve tamamlanan AKTS
export function baseline(value, akts) {
	const a = units(akts);
	if (!(a > 0) || !(value >= 0)) return { points: 0, akts: 0, value: null };
	return { points: Math.round(value) * a, akts: a, value: Math.round(value) };
}

// Tekrar alınan ders: eski notu önceki dönemlerin ortalamasından çıkar (son not geçerlidir, m.21/6).
// Eski not ortalamaya girmiyorsa (U, W) çıkarılacak bir şey yoktur.
export function withoutRepeats(base, repeats) {
	let { points, akts } = base;
	repeats.forEach((r) => {
		if (!counts(r.oldGrade)) return;
		const a = units(r.akts);
		points -= K[r.oldGrade] * a;
		akts -= a;
	});
	if (akts <= 0 || points < 0) return { points: 0, akts: 0, value: null };
	return { points, akts, value: Math.floor(points / akts) };
}

// Bütün dönemler girildiyse: aynı ders birden çok dönemde varsa yalnız son notu sayılır.
// semesters: [[{ code, akts, grade }]] (eskiden yeniye). Dönüş: genel toplam ve sayılmayan eski kayıtlar.
export function cumulative(semesters) {
	const last = new Map();
	semesters.forEach((list, si) => list.forEach((e, ei) => {
		if (e.code && counts(e.grade)) last.set(e.code, `${si}:${ei}`);
	}));
	const superseded = new Set();
	const kept = [];
	semesters.forEach((list, si) => list.forEach((e, ei) => {
		if (!counts(e.grade)) return;
		if (e.code && last.get(e.code) !== `${si}:${ei}`) {
			superseded.add(`${si}:${ei}`);
			return;
		}
		kept.push(e);
	}));
	return { total: average(kept), superseded };
}

// Hedef ortalama için kalan derslerden gereken ortalama (× 100).
// done: şimdiye kadarki toplam; remaining: notu girilmemiş derslerin AKTS toplamı.
export function needed(target, done, remainingAkts) {
	const rest = units(remainingAkts);
	if (!(rest > 0)) return { state: 'none' };
	const all = done.akts + rest;
	const best = Math.floor((done.points + MAX * rest) / all);
	const worst = Math.floor(done.points / all);
	if (worst >= target) return { state: 'safe', worst };
	if (best < target) return { state: 'out', best };
	return { state: 'need', value: Math.ceil((target * all - done.points) / rest), best };
}

// 312 -> "3,12"
export const format = value => (value === null || value === undefined ? '' : `${Math.floor(value / 100)},${String(value % 100).padStart(2, '0')}`);

// "3,1" / "3.12" / "3" -> 310 / 312 / 300; geçersizse null
export function parse(text) {
	const m = /^\s*([0-4])(?:[.,](\d{1,2}))?\s*$/.exec(String(text));
	if (!m) return null;
	const value = Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0'));
	return value <= MAX ? value : null;
}
