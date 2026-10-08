// src/ altındaki uygulamayı static/dist/ altına derler: JS (esbuild, Preact) ve CSS (sass).
// Dosya adlarına içerik özeti eklenir; library.js bunları static/dist/manifest.json'dan okur.
// Ders verisi ayrı derlenir: npm run data (tools/build-data.mjs -> static/data/<özet>/).
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import * as esbuild from 'esbuild';
import * as sass from 'sass';

const watch = process.argv.includes('--watch');
const dist = 'static/dist';
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 10);

async function buildOnce() {
	await mkdir(dist, { recursive: true });
	for (const f of await readdir(dist)) {
		if (/^ortalama\.[0-9a-f]{10}\.(js|css)$/.test(f)) await rm(path.join(dist, f));
	}
	const res = await esbuild.build({
		entryPoints: ['src/main.jsx'],
		bundle: true,
		minify: true,
		sourcemap: false,
		format: 'iife',
		target: ['es2020'],
		jsx: 'automatic',
		jsxImportSource: 'preact',
		write: false,
		legalComments: 'none',
		define: { 'process.env.NODE_ENV': '"production"' },
	});
	const jsText = res.outputFiles[0].text;
	const css = sass.compile('src/styles/app.scss', { style: 'compressed' }).css;
	const jsName = `ortalama.${hash(jsText)}.js`;
	const cssName = `ortalama.${hash(css)}.css`;
	const data = JSON.parse(await readFile('static/data/manifest.json', 'utf8')).dir;
	await writeFile(path.join(dist, jsName), jsText);
	await writeFile(path.join(dist, cssName), css);
	await writeFile(path.join(dist, 'manifest.json'), `${JSON.stringify({ js: jsName, css: cssName, data }, null, '\t')}\n`);

	// NodeBB dışında açılan test sayfası
	const harness = (await readFile('test/harness.template.html', 'utf8')).replace('{{css}}', cssName).replace('{{js}}', jsName).replace('{{data}}', data);
	await writeFile(path.join(dist, 'harness.html'), harness);
	console.log(`${jsName} ${(jsText.length / 1024).toFixed(0)} KB, ${cssName} ${(css.length / 1024).toFixed(0)} KB, veri ${data}`);
}

await buildOnce();

if (watch) {
	const { watch: fsWatch } = await import('node:fs');
	let timer = null;
	fsWatch('src', { recursive: true }, () => {
		clearTimeout(timer);
		timer = setTimeout(() => buildOnce().catch(err => console.error(err.message)), 150);
	});
	console.log('watching src/');
}
