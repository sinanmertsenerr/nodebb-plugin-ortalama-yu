'use strict';

// /ortalama sayfasının NodeBB modülü: uygulama her sayfaya gömülmez, yalnızca bu sayfada özetli (önbelleklenen)
// dosyalardan yüklenir ve bağlanır. Sayfadan çıkınca kaldırılır.
define('forum/ortalama', ['hooks'], function (hooks) {
	const Page = {};
	let mounted = false;

	function loadOnce(tag, attrs, key) {
		return new Promise(function (resolve, reject) {
			const existing = document.querySelector(`${tag}[data-ortalama-yu="${key}"]`);
			if (existing) {
				if (existing.dataset.ready === '1') {
					return resolve();
				}
				existing.addEventListener('load', () => resolve());
				existing.addEventListener('error', () => reject(new Error(`ortalama-yu: ${key}`)));
				return;
			}
			const el = document.createElement(tag);
			Object.keys(attrs).forEach((k) => { el.setAttribute(k, attrs[k]); });
			el.dataset.ortalamaYu = key;
			el.addEventListener('load', () => { el.dataset.ready = '1'; resolve(); });
			el.addEventListener('error', () => reject(new Error(`ortalama-yu: ${key}`)));
			document.head.appendChild(el);
		});
	}

	// Stil dosyası şablondaki <link> ile gelir (bilgi bölümü de onunla boyanır); uygulama stil inmeden çizilmez
	function styleReady() {
		return new Promise(function (resolve, reject) {
			const link = document.querySelector('link[data-ortalama-yu="css"]');
			if (!link || link.sheet) {
				return resolve();
			}
			link.addEventListener('load', () => resolve(), { once: true });
			link.addEventListener('error', () => reject(new Error('ortalama-yu: css')), { once: true });
		});
	}

	Page.init = async function () {
		const root = document.getElementById('ort-yu-root');
		if (!root) {
			return;
		}
		try {
			await Promise.all([
				styleReady(),
				loadOnce('script', { src: root.dataset.js, defer: '' }, 'js'),
			]);
			root.innerHTML = '';
			window.YuOrtalama.mount(root, { dataBase: root.dataset.base });
			mounted = true;
		} catch (err) {
			root.innerHTML = '<div class="alert alert-danger m-3">GPA Hesaplayıcı yüklenemedi. Sayfayı yenileyip yeniden dene.</div>';
		}
	};

	hooks.on('action:ajaxify.start', function () {
		if (mounted && window.YuOrtalama) {
			window.YuOrtalama.unmount();
			mounted = false;
		}
	});

	return Page;
});
