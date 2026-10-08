'use strict';

// Bilgi bölümü (static/templates/partials/ortalama/info.tpl) elle yazılır ve herkese yayınlanır: içindeki sayılar
// kaynak veriyle (data/not-sistemi.json) ve hesap motoruyla (src/calc.js) aynı olmalı.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'static/templates/partials/ortalama/info.tpl'), 'utf8');
const rules = JSON.parse(fs.readFileSync(path.join(root, 'data/not-sistemi.json'), 'utf8'));

const tr = n => n.toFixed(2).replace('.', ',');
const text = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tableAfter = (heading) => {
	const at = html.indexOf(heading);
	assert.ok(at !== -1, `başlık yok: ${heading}`);
	const table = html.slice(at, html.indexOf('</table>', at));
	return [...table.matchAll(/<tr>(.*?)<\/tr>/gs)].map(m => [...m[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map(c => text(c[1])));
};

let calc;
test.before(async () => { calc = await import('../src/calc.js'); });

test('harf notu tablosu yönetmelikteki katsayı ve puan aralıklarıyla aynı', () => {
	const rows = tableAfter('Harf notları ve katsayıları').slice(1);
	assert.deepStrictEqual(
		rows,
		rules.harfNotlari.map(g => [g.harf, tr(g.katsayi), `${g.yuzde[0]}–${g.yuzde[1]}`])
	);
	// Hesap motoru da aynı katsayıları kullanır
	rules.harfNotlari.forEach(g => assert.strictEqual(calc.coefficient(g.harf), Math.round(g.katsayi * 100), g.harf));
});

test('örnek hesap, hesap motorunun verdiği sonuçla aynı', () => {
	const rows = tableAfter('Örnek hesap');
	const courses = rows.slice(1, -1).map(([, akts, grade, product]) => ({ akts: Number(akts), grade, product }));
	courses.forEach((c) => {
		const points = calc.coefficient(c.grade) * c.akts / 100;
		assert.strictEqual(c.product, `${tr(calc.coefficient(c.grade) / 100)} × ${c.akts} = ${tr(points)}`);
	});
	const total = rows[rows.length - 1];
	const akts = courses.reduce((n, c) => n + c.akts, 0);
	const points = courses.reduce((n, c) => n + calc.coefficient(c.grade) * c.akts, 0) / 100;
	assert.deepStrictEqual([total[1], total[3]], [String(akts), tr(points)]);

	const result = calc.format(calc.average(courses).value);
	const line = text(html.slice(html.indexOf('ort-info-result'), html.indexOf('</p>', html.indexOf('ort-info-result'))));
	assert.ok(line.includes(`${tr(points)} ÷ ${akts}`), line);
	assert.ok(line.includes(`Dönem ortalaması ${result} olur`), `${line} / beklenen ${result}`);
});

test('eşikler kaynak veriyle aynı ortalamaları gösterir', () => {
	const rows = tableAfter('Hangi ortalama ne için gerekir?').slice(1);
	const byValue = Object.fromEntries(rows);
	const expect = [
		[rules.mezuniyet.genelOrtalamaEnAz, 'Mezuniyet'],
		[rules.mezuniyet.derece.genelOrtalamaEnAz, 'mezuniyet derecesi'],
		...rules.esikler.map(e => [e.genelOrtalamaEnAz, {
			'Çift anadal başvurusu': 'Çift anadal başvurusu',
			'Çift anadala devam': 'çift anadala devam',
			'Çift anadaldan mezuniyet': 'Çift anadal programından mezuniyet',
			'Yan dal başvurusu': 'Yan dal başvurusu',
			'Yan dala devam': 'Yan dal programına devam',
			'Akademik başarı bursu değerlendirmesi': 'akademik başarı bursu değerlendirmesi',
			'YU-COOP başvurusu (lisans)': 'YU-COOP başvurusu (lisans)',
			'YU-COOP başvurusu (ön lisans)': 'YU-COOP başvurusu (ön lisans)',
		}[e.ad]]),
	];
	expect.forEach(([value, phrase]) => {
		assert.ok(phrase, `eşik için metin tanımlı değil (${value})`);
		const cell = byValue[tr(value)];
		assert.ok(cell && cell.includes(phrase), `${tr(value)} satırında "${phrase}" yok: ${cell}`);
	});
	// Sınamalı sınırı ve ders yükü
	assert.ok(byValue[tr(rules.mezuniyet.genelOrtalamaEnAz)].includes(`${tr(rules.statu.sinamali.genelOrtalamaEnFazla)} ve altında`));
	assert.ok(byValue[tr(rules.mezuniyet.genelOrtalamaEnAz)].includes(`${rules.statu.sinamali.donemAktsEnFazla} AKTS`));
});

test('ortalamaya girmeyen notlar kaynak veriyle aynı', () => {
	const at = html.indexOf('Ortalamaya girmeyen notlar');
	const line = text(html.slice(at, html.indexOf('</p>', at)));
	rules.ortalama.ortalamayaGirmeyenler.forEach(g => assert.ok(new RegExp(`\\b${g} \\(`).test(line), `${g} yok: ${line}`));
	assert.ok(line.includes('NA (devamsız)') && line.includes('0,00'));
});

test('şablon ayraçları yok (benchpress metni değişken sanmasın)', () => {
	assert.ok(!/[{}]/.test(html));
});
