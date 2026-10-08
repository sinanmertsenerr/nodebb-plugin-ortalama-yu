// Yerel önizleme sunucusu (yalnızca 127.0.0.1). Canlı foruma hiçbir şey yazmaz, yalnızca okur.
//   /            forumun gerçek sayfasının yerel kopyası: araç forumun içinde, forumun kendi CSS'iyle görünür
//   /harness     forumun dışında çıplak test sayfası
// Kullanım: node test/dev-server.mjs [port]  ->  http://127.0.0.1:4481/?tema=dark   (açık tema: ?tema=light)
// Adres ekleri: &demo=1 örnek notlarla açar, &fresh=1 kayıtlı seçimi siler, &duzey=lisans|onlisans bölüm seçiminden başlar.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 4481;
const ORIGIN = process.env.FORUM || 'https://yu.uniforum.app';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2' };

// Forum menüsündeki kırmızı kart: canlıya alınırken nodebb-plugin-yasar-forum'un custom.scss dosyasına taşınır
// (Timetable mavi, CV yeşil, PDF mor, Erasmus+ sarı kartlarının eşi). Açıkta #b91c1c (beyazda 6,5:1), koyuda #fca5a5.
const NAV_CSS = `
#main-nav a.nav-link[href$="/ortalama"] { --yort: 185, 28, 28; overflow: hidden; border: 1px solid rgba(var(--yort), .26); border-radius: 10px; background-color: var(--bs-body-bg) !important; color: rgb(var(--yort)) !important; box-shadow: 0 1px 2px rgba(16, 32, 42, .06); transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease; }
#main-nav a.nav-link[href$="/ortalama"] .nav-text, #main-nav a.nav-link[href$="/ortalama"] .ynav-ico, #main-nav a.nav-link[href$="/ortalama"] i { color: rgb(var(--yort)) !important; }
#main-nav a.nav-link[href$="/ortalama"] .nav-text { font-weight: 600 !important; }
#main-nav a.nav-link[href$="/ortalama"]:hover { border-color: rgba(var(--yort), .45); background-color: rgba(var(--yort), .07) !important; box-shadow: 0 6px 14px -8px rgba(var(--yort), .55); }
#main-nav a.nav-link[href$="/ortalama"]::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 45%; background: linear-gradient(90deg, transparent, rgba(220, 38, 38, .2), transparent); transform: skewX(-20deg); pointer-events: none; }
#main-nav a.nav-link[href$="/ortalama"]:hover::after { animation: ynav-sheen .7s ease-out; }
[data-theme="dark"] #main-nav a.nav-link[href$="/ortalama"] { --yort: 252, 165, 165; border-color: rgba(var(--yort), .32); background-color: rgba(var(--yort), .08) !important; box-shadow: none; }
[data-theme="dark"] #main-nav a.nav-link[href$="/ortalama"]:hover { background-color: rgba(var(--yort), .14) !important; }
`;

// Sayfanın gövdesi, şablondaki (static/templates/ortalama.tpl) ile aynı kuruluş: uygulamanın bağlandığı kök ve
// altında sunucuda çizilen bilgi bölümü (partials/ortalama/info.tpl)
const INFO = path.join(root, 'static/templates/partials/ortalama/info.tpl');
const pageHtml = async () => `<div class="ort-yu-page"><h1 class="ort-visually-hidden">GPA Hesaplayıcı: Yaşar Üniversitesi not ortalaması hesaplama</h1><div class="ort-yu-mount" id="ort-yu-root"></div>${await readFile(INFO, 'utf8')}</div>`;

let forum = { at: 0, html: '' };

async function shell() {
	if (Date.now() - forum.at > 5 * 60 * 1000) {
		forum = { at: Date.now(), html: await (await fetch(`${ORIGIN}/akademik-takvim`, { headers: { 'Accept-Language': 'tr' } })).text() };
	}
	const manifest = JSON.parse(await readFile(path.join(root, 'static/dist/manifest.json'), 'utf8'));
	let html = forum.html;
	// Forumun dosyaları bu sunucunun /__forum/ yolundan gelir (forum başka kökene dosya vermiyor)
	html = html.replace(/(href|src)="\/(?!\/)/g, '$1="/__forum/').split(`${ORIGIN}/`).join('/__forum/');
	html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
	html = html.replace(/<link[^>]+rel="(?:preload|modulepreload)"[^>]+as="script"[^>]*>/gi, '');

	// Menü birden çok yerde çizilir (kenar çubuğu, mobil menü): her Timetable öğesinin hemen altına yeni öğe eklenir
	const items = html.match(/<li class="nav-item[^"]*"[^>]*title="Timetable">[\s\S]*?<\/li>/g) || [];
	items.forEach((li) => {
		const copy = li.replace(/Timetable/g, 'GPA Hesaplayıcı').replace('href="/__forum/timetable"', 'href="/ortalama"').replace(/fa-calendar/g, 'fa-calculator');
		html = html.replace(li, `${li}\n${copy}`);
	});
	html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>GPA Hesaplayıcı | Yaşar Forum (önizleme)</title>');

	const page = await pageHtml();
	const mount = `
<style>${NAV_CSS}</style>
<link rel="stylesheet" href="/static/dist/${manifest.css}">
<script src="/static/dist/${manifest.js}"></script>
<script>
(function () {
	var q = new URLSearchParams(location.search);
	var tema = q.get('tema');
	if (tema === 'dark' || tema === 'light') {
		document.documentElement.setAttribute('data-theme', tema);
		document.documentElement.setAttribute('data-bs-theme', tema);
	}
	if (q.get('fresh')) localStorage.removeItem('ortalama-yu:v1');
	if (q.get('duzey')) localStorage.setItem('ortalama-yu:v1', JSON.stringify({ level: q.get('duzey'), levelSet: true }));
	if (q.get('demo')) {
		localStorage.setItem('ortalama-yu:v1', JSON.stringify({
			program: 'lis-71', cur: '402794', level: 'lisans', ready: true, target: '3,00',
					plans: { 'lis-71/402794': { 1: { grades: { 'MATH 1100': 'B+', 'MATH 1131': 'B', 'PHYS 1121': 'C+', 'SE 1105': 'A', 'SOFL 1101': 'A-', 'UMFD 1020': 'A' }, picks: {}, extra: [], removed: [] }, 2: { grades: { 'COMP 1202': 'B', 'MATH 1132': 'B-' }, picks: {}, extra: [], removed: [] } } }
		}));
	}
	var content = document.querySelector('#content');
	content.querySelectorAll('[data-widget-area]').forEach(function (el) { el.remove(); });
	content.innerHTML = ${JSON.stringify(page)};
	window.YuOrtalama.mount(document.getElementById('ort-yu-root'), { dataBase: '/static/data/${manifest.data}' });
}());
</script>`;
	return html.replace(/<\/body>/i, `${mount}\n</body>`);
}

// Canlı forum sekmesinde önizleme: forum sayfasında çalışır, aracın dosyalarını bu sunucudan (https tünel üzerinden) alıp
// sayfanın içerik alanına bağlar ve menüye kırmızı kartı ekler. Yalnızca o sekmeyi değiştirir; sunucuya hiçbir şey yazmaz,
// sayfa yenilenince gider. Kullanım: cloudflared tunnel --url http://127.0.0.1:4481, sonra forum sekmesinde
//   fetch('<tünel>/loader.js').then(r => r.text()).then(c => (0, eval)(c))
const CALC_ICON = '<svg class="ynav-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>';
const loader = (base, page) => `(async () => {
	const B = ${JSON.stringify(base)};
	const get = u => fetch(B + u, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); });
	const m = JSON.parse(await get('/static/dist/manifest.json'));
	const [css, js] = await Promise.all([get('/static/dist/' + m.css), get('/static/dist/' + m.js)]);
	let style = document.getElementById('ort-live-css');
	if (!style) { style = document.createElement('style'); style.id = 'ort-live-css'; document.head.appendChild(style); }
	style.textContent = ${JSON.stringify(NAV_CSS)} + css;
	if (window.YuOrtalama) window.YuOrtalama.unmount();
	(0, eval)(js);
	document.querySelectorAll('a.nav-link[href$="/timetable"]').forEach((tt) => {
		const item = tt.closest('li');
		if (!item || item.parentNode.querySelector('a[href$="/ortalama"]')) return;
		const li = item.cloneNode(true);
		const a = li.querySelector('a');
		a.setAttribute('href', '/ortalama');
		a.setAttribute('aria-label', 'GPA Hesaplayıcı');
		a.classList.remove('active', 'ynav-current');
		li.setAttribute('title', 'GPA Hesaplayıcı');
		li.removeAttribute('data-original-title');
		const text = li.querySelector('.nav-text');
		if (text) text.textContent = 'GPA Hesaplayıcı';
		const ico = li.querySelector('.ynav-ico') || li.querySelector('i.fa, i[class*="fa-"]');
		if (ico) ico.outerHTML = ${JSON.stringify(CALC_ICON)};
		a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
		item.after(li);
	});
	document.querySelectorAll('#main-nav a.nav-link.ynav-current, #main-nav a.nav-link.active').forEach(a => a.classList.remove('ynav-current', 'active'));
	const content = document.querySelector('#content');
	content.innerHTML = ${JSON.stringify(page)};
	document.title = 'GPA Hesaplayıcı | Yaşar Forum';
	window.YuOrtalama.mount(document.getElementById('ort-yu-root'), { dataBase: B + '/static/data/' + m.data });
	const old = document.getElementById('ort-preview-bar');
	if (old) old.remove();
	localStorage.removeItem('ortalama-yu:secenek');
	return 'ok';
})()`;

createServer(async (req, res) => {
	try {
		const url = new URL(req.url, 'http://127.0.0.1');
		const local = /^127\.0\.0\.1(:\d+)?$/.test(req.headers.host || '');
		res.setHeader('Access-Control-Allow-Origin', ORIGIN);
		if (url.pathname === '/loader.js') {
			res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' }).end(loader(local ? '' : `https://${req.headers.host}`, await pageHtml()));
			return;
		}
		// Tünelden gelen istekler yalnızca aracın derlenmiş dosyalarını ve ders verisini alır; depo, forum kopyası ve vekil yerelde kalır
		if (!local && !/^\/static\/(dist|data)\/[\w./-]+$/.test(url.pathname)) {
			res.writeHead(404).end('yok');
			return;
		}
		if (url.pathname === '/' || url.pathname === '/ortalama') {
			res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' }).end(await shell());
			return;
		}
		if (url.pathname === '/harness') {
			res.writeHead(302, { Location: '/static/dist/harness.html' }).end();
			return;
		}
		if (url.pathname.startsWith('/__forum/')) {
			const upstream = await fetch(`${ORIGIN}/${url.pathname.slice('/__forum/'.length)}${url.search}`);
			const type = upstream.headers.get('content-type') || 'application/octet-stream';
			let body = Buffer.from(await upstream.arrayBuffer());
			if (/text\/css/.test(type)) {
				body = Buffer.from(body.toString('utf8').replace(/url\((['"]?)\//g, 'url($1/__forum/').split(`${ORIGIN}/`).join('/__forum/'));
			}
			res.writeHead(upstream.status, { 'Content-Type': type, 'Cache-Control': 'max-age=3600' }).end(body);
			return;
		}
		const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
		if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
		const body = await readFile(file);
		res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
	} catch (err) {
		res.writeHead(404).end('yok');
	}
}).listen(port, '127.0.0.1', () => console.log(`forum kopyası: http://127.0.0.1:${port}/?tema=light   test sayfası: http://127.0.0.1:${port}/harness`));
