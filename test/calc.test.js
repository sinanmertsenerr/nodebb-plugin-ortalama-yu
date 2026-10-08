'use strict';

const test = require('node:test');
const assert = require('node:assert');

let calc;
test.before(async () => { calc = await import('../src/calc.js'); });

test('ortalama AKTS ile ağırlıklanır', () => {
	const r = calc.average([{ akts: 6, grade: 'A' }, { akts: 4, grade: 'C' }]);
	// (4,00 × 6 + 2,00 × 4) / 10 = 3,20
	assert.strictEqual(r.value, 320);
});

test('ortalama yuvarlanmaz, kesilir', () => {
	// (3,70 × 7 + 3,30 × 5 + 2,70 × 6) / 18 = 58,6 / 18 = 3,2555… -> 3,25
	const r = calc.average([{ akts: 7, grade: 'A-' }, { akts: 5, grade: 'B+' }, { akts: 6, grade: 'B-' }]);
	assert.strictEqual(r.value, 325);
	// 2,996… -> 2,99 (3,00 değil): (3,00 × 299 + 2,70 × 1) / 300 = 2,999
	assert.strictEqual(calc.average([{ akts: 299, grade: 'B' }, { akts: 1, grade: 'B-' }]).value, 299);
});

test('S, U ve W ortalamaya girmez; NA sıfır sayılır', () => {
	const r = calc.average([{ akts: 5, grade: 'A' }, { akts: 5, grade: 'S' }, { akts: 5, grade: 'U' }, { akts: 5, grade: 'W' }]);
	assert.strictEqual(r.value, 400);
	assert.strictEqual(r.akts, 50);
	assert.strictEqual(calc.average([{ akts: 5, grade: 'A' }, { akts: 5, grade: 'NA' }]).value, 200);
});

test('not yoksa ortalama da yoktur', () => {
	assert.strictEqual(calc.average([]).value, null);
	assert.strictEqual(calc.average([{ akts: 5, grade: '' }, { akts: 5, grade: 'W' }]).value, null);
});

test('önceki dönemler ile bu dönem birleşir', () => {
	const base = calc.baseline(250, 60);
	const term = calc.average([{ akts: 30, grade: 'A' }]);
	// (2,50 × 60 + 4,00 × 30) / 90 = 3,00
	assert.strictEqual(calc.sum(base, term).value, 300);
});

test('tekrar alınan derste eski not çıkar, yenisi girer', () => {
	// Önceki: 60 AKTS, 2,50. İçinde 6 AKTS'lik F var. Ders tekrar alınıp B oldu.
	const base = calc.withoutRepeats(calc.baseline(250, 60), [{ akts: 6, oldGrade: 'F' }]);
	const term = calc.average([{ akts: 6, grade: 'B' }]);
	// (150 − 0 + 18) / 60 = 2,80
	const total = calc.sum(base, term);
	assert.strictEqual(total.akts, 600);
	assert.strictEqual(total.value, 280);
	// Eski not W ise önceki ortalamada yoktu: yalnız eklenir
	const w = calc.withoutRepeats(calc.baseline(250, 60), [{ akts: 6, oldGrade: 'W' }]);
	assert.strictEqual(calc.sum(w, term).akts, 660);
});

test('bütün dönemlerde aynı dersin yalnız son notu sayılır', () => {
	const r = calc.cumulative([
		[{ code: 'MATH 1131', akts: 7, grade: 'F' }, { code: 'PHYS 1121', akts: 7, grade: 'B' }],
		[{ code: 'MATH 1131', akts: 7, grade: 'B' }],
	]);
	assert.strictEqual(r.total.value, 300);
	assert.deepStrictEqual([...r.superseded], ['0:0']);
	// Son alış W ise önceki not geçerli kalır
	const w = calc.cumulative([[{ code: 'X 1', akts: 5, grade: 'D' }], [{ code: 'X 1', akts: 5, grade: 'W' }]]);
	assert.strictEqual(w.total.value, 100);
	assert.strictEqual(w.superseded.size, 0);
});

test('hedef: gereken ortalama, ulaşılamaz ve garanti', () => {
	const done = calc.sum(calc.baseline(250, 60), calc.average([{ akts: 12, grade: 'B' }]));
	// 3,00 hedefi, kalan 18 AKTS: (3,00 × 90 − 2,50 × 60 − 3,00 × 12) / 18 = 4,6666 -> ulaşılamaz
	assert.strictEqual(calc.needed(300, done, 18).state, 'out');
	// 2,70 hedefi: (2,70 × 90 − 186) / 18 = 3,1666… -> 3,17
	const n = calc.needed(270, done, 18);
	assert.strictEqual(n.state, 'need');
	assert.strictEqual(n.value, 317);
	// 2,00 hedefi: hepsi F olsa bile (186 / 90 = 2,06) geçilir
	assert.strictEqual(calc.needed(200, done, 18).state, 'safe');
	assert.strictEqual(calc.needed(300, done, 0).state, 'none');
});

test('gereken ortalama alınırsa hedef tutar', () => {
	const done = calc.baseline(287, 90);
	const n = calc.needed(300, done, 30);
	assert.strictEqual(n.state, 'need');
	const reach = (done.points + n.value * 300) / (done.akts + 300);
	assert.ok(Math.floor(reach) >= 300);
	const miss = (done.points + (n.value - 1) * 300) / (done.akts + 300);
	assert.ok(Math.floor(miss) < 300);
});

test('yazım: 312 ↔ "3,12"', () => {
	assert.strictEqual(calc.format(312), '3,12');
	assert.strictEqual(calc.format(300), '3,00');
	assert.strictEqual(calc.format(5), '0,05');
	assert.strictEqual(calc.parse('3,1'), 310);
	assert.strictEqual(calc.parse('3.12'), 312);
	assert.strictEqual(calc.parse('4'), 400);
	assert.strictEqual(calc.parse('4,01'), null);
	assert.strictEqual(calc.parse('abc'), null);
});
