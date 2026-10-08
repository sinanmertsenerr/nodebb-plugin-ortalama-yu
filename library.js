'use strict';

const path = require('node:path');

const nconf = nodebb.require('nconf');
const routeHelpers = nodebb.require('./src/routes/helpers');

const manifest = require('./static/dist/manifest.json');

const plugin = module.exports;

// Uygulama dosyaları (JS, CSS) ve ders verisi NodeBB'nin /assets klasörüne kopyalanmaz, bu yoldan verilir
// (PDF Araçları ve CV Oluşturucu gibi). Herkese açıktır: ortalama hesaplamak giriş istemez, notlar tarayıcıda kalır.
// Aracı kimin göreceğine forum karar verir; dosyaların kendisi kimlik sormaz. Adlar içerik özetli: uzun süre saklanır.
const APP_PATH = '/ortalama/app';
const STATIC_DIR = path.join(__dirname, 'static');
const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const HASH = /^[0-9a-f]{10}$/;
const assetBase = () => `${nconf.get('relative_path')}${APP_PATH}`;

function send(res, file) {
	// Özetli adlar değişmez: tarayıcı ve ara önbellekler 60 gün saklar
	res.sendFile(file, {
		root: STATIC_DIR,
		dotfiles: 'deny',
		cacheControl: false,
		headers: { 'Cache-Control': 'public, max-age=5184000, immutable', 'X-Content-Type-Options': 'nosniff' },
	}, (err) => {
		if (err && !res.headersSent) {
			res.status(err.status === 404 || err.code === 'ENOENT' ? 404 : 500).end();
		}
	});
}

plugin.init = async function (params) {
	const { router } = params;
	routeHelpers.setupPageRoute(router, '/ortalama', renderPage);

	router.get(`${APP_PATH}/dist/:file`, (req, res) => {
		if (!SAFE_FILE.test(req.params.file)) {
			return res.status(404).end();
		}
		send(res, `dist/${req.params.file}`);
	});
	// Ders verisi: data/<özet>/index.json, all.json ve p/<bölüm>.json
	router.get(`${APP_PATH}/data/:hash/:file`, (req, res) => {
		const { hash, file } = req.params;
		if (!HASH.test(hash) || !SAFE_FILE.test(file)) {
			return res.status(404).end();
		}
		send(res, `data/${hash}/${file}`);
	});
	router.get(`${APP_PATH}/data/:hash/p/:file`, (req, res) => {
		const { hash, file } = req.params;
		if (!HASH.test(hash) || !SAFE_FILE.test(file)) {
			return res.status(404).end();
		}
		send(res, `data/${hash}/p/${file}`);
	});
};

// Sayfa kabuğu: uygulama yalnızca bu sayfada, özetli dosyalardan yüklenir; altındaki bilgi bölümü (harf notları,
// örnek hesap, eşikler) şablonda, sunucuda çizilir. Notlar öğrencinin tarayıcısında kalır; bu eklentinin veritabanı
// ya da yazan bir API'si yoktur.
async function renderPage(req, res) {
	const dataBase = `${assetBase()}/data/${manifest.data}`;
	res.render('ortalama', {
		title: '[[ortalama-yu:title]]',
		breadcrumbs: [{ text: '[[global:home]]', url: `${nconf.get('relative_path')}/` }, { text: '[[ortalama-yu:title]]' }],
		js: `${assetBase()}/dist/${manifest.js}`,
		css: `${assetBase()}/dist/${manifest.css}`,
		dataBase,
		index: `${dataBase}/index.json`,
	});
}
