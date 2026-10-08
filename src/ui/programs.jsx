// 2. adım: bölüm (ön lisansta program) seçimi, iki panel: solda fakülteler, sağda seçili fakültenin bölümleri
// (canlı önizlemede üç düzen denendi, kullanıcı bunu seçti). Arama yazılınca bütün eşleşen bölümler kart olarak gelir.
// Fakülte rengi ve ikonu forumun kategori kutularıyla aynı dil: koyu dolgu, beyaz ikon.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { prefetchProgram } from '../data.js';
import { Icon } from './icons.jsx';
import { fold } from './picker.jsx';
import { levelOf, unitsText } from './setup.jsx';
import { BackButton } from './steps.jsx';

const FACULTY_LOOK = [
	[/^Hukuk|Adalet/, '#b30024', 'scale'],
	[/İletişim/, '#bf5600', 'megaphone'],
	[/İnsan ve Toplum/, '#77276e', 'users'],
	[/İşletme/, '#0067d6', 'briefcase'],
	[/Mimarlık/, '#a05846', 'building'],
	[/Mühendislik/, '#267e94', 'cpu'],
	[/Sanat ve Tasarım/, '#be185d', 'palette'],
	[/Tarım/, '#3f7d22', 'sprout'],
	[/Uygulamalı Bilimler/, '#86650a', 'compass'],
	[/Meslek Yüksekokulu/, '#0f766e', 'wrench'],
];
const lookOf = faculty => (FACULTY_LOOK.find(([re]) => re.test(faculty)) || [null, '#4b5563', 'cap']).slice(1);

// "Mühendislik Fakültesi" -> "Mühendislik"; yüksekokullar adıyla kalır
const shortFaculty = f => f.replace(/ Fakültesi$/, '').replace(/^Uygulamalı Bilimler Yüksekokulu$/, 'Uygulamalı Bilimler');

// "Müzik (%30 İngilizce)" -> ["Müzik", "%30 İngilizce"]
const splitName = (name) => {
	const m = /^(.*?)\s*\(((?:%\d+ )?İngilizce)\)$/.exec(name);
	return m ? [m[1], m[2]] : [name, ''];
};

const byName = (a, b) => a.name.localeCompare(b.name, 'tr');

export function FacIcon({ faculty, size = 40 }) {
	const [color, icon] = lookOf(faculty);
	return (
		<span class="ort-fico" style={{ '--ort-fc': color, '--ort-fs': `${size}px` }} aria-hidden="true">
			<Icon name={icon} size={Math.round(size * 0.5)} />
		</span>
	);
}

// Bölüm kartı: ikon, ad, altında fakülte ve dil; hepsi aynı boyda
function Tile({ p, current, onPick, showFaculty = true }) {
	const [name, tag] = splitName(p.name);
	const on = current === p.id;
	const meta = [showFaculty ? shortFaculty(p.faculty) : '', tag].filter(Boolean).join(', ');
	return (
		<button type="button" class={`ort-tile${on ? ' is-on' : ''}`} style={{ '--ort-fc': lookOf(p.faculty)[0] }} aria-current={on ? 'true' : undefined} onPointerEnter={() => prefetchProgram(p.id)} onFocus={() => prefetchProgram(p.id)} onClick={() => onPick(p)}>
			<FacIcon faculty={p.faculty} size={40} />
			<span class="ort-tile-text">
				<span class="ort-tile-name">{name}</span>
				{meta ? <span class="ort-tile-meta">{meta}</span> : null}
			</span>
			<Icon name={on ? 'check' : 'right'} size={18} />
		</button>
	);
}

const Tiles = ({ list, current, onPick, showFaculty }) => (
	<ul class="ort-tiles">
		{list.map((p, i) => <li key={p.id} style={{ '--ort-i': i }}><Tile p={p} current={current} onPick={onPick} showFaculty={showFaculty} /></li>)}
	</ul>
);

function groupsOf(list) {
	const out = [];
	list.forEach((p) => {
		let g = out.find(x => x.faculty === p.faculty);
		if (!g) { g = { faculty: p.faculty, items: [] }; out.push(g); }
		g.items.push(p);
	});
	return out;
}

const Empty = ({ query, unit, onClear }) => (
	<div class="ort-empty ort-facs-empty" role="status">
		<p>"{query.trim()}" adında bir {unit} yok.</p>
		<button type="button" class="ort-btn ort-btn--ghost" onClick={onClear}>Aramayı temizle</button>
	</div>
);

function TwoPane({ groups, current, onPick, unit }) {
	const start = groups.find(g => g.items.some(p => p.id === current)) || groups[0];
	const [sel, setSel] = useState(start ? start.faculty : '');
	const g = groups.find(x => x.faculty === sel) || groups[0];
	const [color] = lookOf(g.faculty);
	// Seçili fakültenin bölümleri boşta indirilir: hangisine basılırsa dersleri beklemeden açılır
	useEffect(() => {
		const ids = g.items.map(p => p.id);
		const run = () => ids.forEach(prefetchProgram);
		if (typeof window.requestIdleCallback === 'function') {
			const h = window.requestIdleCallback(run, { timeout: 800 });
			return () => window.cancelIdleCallback(h);
		}
		const t = setTimeout(run, 200);
		return () => clearTimeout(t);
	}, [g.faculty]);
	// Telefonda fakülteler yatay şerit: seçili olan görünür yere (ortaya) kayar; sayfa kaymaz
	const nav = useRef(null);
	useLayoutEffect(() => {
		const el = nav.current;
		const on = el && el.querySelector('.ort-tp-fac.is-on');
		if (!on || el.scrollWidth <= el.clientWidth) return;
		el.scrollLeft = on.offsetLeft - el.offsetLeft - (el.clientWidth - on.offsetWidth) / 2;
	}, [g.faculty]);
	return (
		<div class="ort-tp">
			<nav class="ort-tp-nav" aria-label="Fakülteler" ref={nav}>
				{groups.map(x => (
					<button key={x.faculty} type="button" class={`ort-tp-fac${x === g ? ' is-on' : ''}`} style={{ '--ort-fc': lookOf(x.faculty)[0] }} aria-current={x === g ? 'true' : undefined} onClick={() => setSel(x.faculty)}>
						<FacIcon faculty={x.faculty} size={32} />
						<span class="ort-tp-name">{shortFaculty(x.faculty)}</span>
						<span class="ort-tp-count">{x.items.length}</span>
					</button>
				))}
			</nav>
			<section class="ort-tp-panel" key={g.faculty} style={{ '--ort-fc': color }} aria-labelledby="ort-tp-title">
				<header class="ort-tp-head">
					<FacIcon faculty={g.faculty} size={48} />
					<div>
						<h4 id="ort-tp-title">{g.faculty}</h4>
						<p>{g.items.length} {unit}</p>
					</div>
				</header>
				<Tiles list={g.items} current={current} onPick={onPick} showFaculty={false} />
			</section>
		</div>
	);
}

export function ProgramStep({ programs, level, current, onPick, onBack }) {
	const [query, setQuery] = useState('');
	const l = levelOf(level);
	const all = useMemo(() => programs.filter(p => p.type === level), [programs, level]);
	const q = fold(query.trim());
	const list = q ? all.filter(p => q.split(/\s+/).every(w => fold(`${p.name} ${p.faculty}`).includes(w))) : all;
	const groups = useMemo(() => groupsOf(list), [list]);
	const title = level === 'onlisans' ? 'Programını seç' : 'Bölümünü seç';

	return (
		<section class="ort-pane" aria-labelledby="ort-pane-title">
			<div class="ort-pane-top">
				<div class="ort-pane-lead">
					<BackButton label="Düzey seçimine dön" onClick={onBack} />
					<div class="ort-pane-head">
						<h3 class="ort-pane-title" id="ort-pane-title">{title}</h3>
						<p class="ort-hint">{l.name}: {all.length} {l.unit}, {unitsText(all)}</p>
					</div>
				</div>
				<label class="ort-search">
					<Icon name="search" size={18} />
					<span class="ort-visually-hidden">{l.unit === 'program' ? 'Program ara' : 'Bölüm ara'}</span>
					<input class="ort-input" type="search" placeholder={l.unit === 'program' ? 'Program ara' : 'Bölüm ara'} value={query} autocomplete="off" onInput={e => setQuery(e.currentTarget.value)} />
				</label>
			</div>
			{!list.length ? <Empty query={query} unit={l.unit} onClear={() => setQuery('')} /> : null}
			{list.length && q ? <Tiles list={[...list].sort(byName)} current={current} onPick={onPick} /> : null}
			{list.length && !q ? <TwoPane groups={groups} current={current} onPick={onPick} unit={l.unit} /> : null}
		</section>
	);
}
