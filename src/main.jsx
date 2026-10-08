// Uygulama kökü, üç adım: 1) lisans ya da ön lisans, 2) fakültelere göre dizilmiş bölümler, 3) bölümün bütün yarıyılları
// alt alta; notlar girildikçe genel ortalama üstte yapışık çubukta görünür. window.YuOrtalama.mount/unmount ile bağlanır.
import { render } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { average, cumulative, format, needed, parse } from './calc.js';
import { loadAll, loadIndex, loadProgram, peekIndex, peekProgram, prefetchProgram, rowsOf, setDataBase } from './data.js';
import { emptyState, loadState, planKey, saveState, semOf, withSem } from './store.js';
import { Bar } from './ui/bar.jsx';
import { Icon } from './ui/icons.jsx';
import { Picker } from './ui/picker.jsx';
import { CourseRow, GroupRow } from './ui/rows.jsx';
import { FacIcon, ProgramStep } from './ui/programs.jsx';
import { LevelStep, levelOf } from './ui/setup.jsx';
import { Steps } from './ui/steps.jsx';

// Bir isteğin durumu: { status: 'idle' | 'loading' | 'ok' | 'error', data }.
// peek: veri zaten inmişse ilk çizimde doğrudan kullanılır, "yükleniyor" ekranı bir an bile görünmez.
function useLoad(loader, key, peek) {
	const now = () => {
		if (key === null) return { status: 'idle', data: null, key };
		const data = peek ? peek() : undefined;
		return data === undefined ? { status: 'loading', data: null, key } : { status: 'ok', data, key };
	};
	const [state, setState] = useState(now);
	const [turn, setTurn] = useState(0);
	useEffect(() => {
		const first = now();
		setState(first);
		if (key === null || first.status === 'ok') return undefined;
		let alive = true;
		loader().then(data => alive && setState({ status: 'ok', data, key }), () => alive && setState({ status: 'error', data: null, key }));
		return () => { alive = false; };
	}, [key, turn]);
	// Anahtar değiştiyse eski veri gösterilmez (effect çalışana kadarki tek çizimde de)
	const live = state.key === key ? state : now();
	return [live, () => setTurn(n => n + 1)];
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const longDate = (iso) => {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
	return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
};

// Sayfanın girişi (1. ve 2. adımda): ne olduğu, kimin için ve verinin kaynağı
function Hero({ programs, updated }) {
	const count = id => programs.filter(p => p.type === id).length;
	return (
		<header class="ort-hero">
			<div class="ort-hero-main">
				<h2 class="ort-title" id="ort-title">Ortalamanı kendi müfredatınla hesapla</h2>
				<p class="ort-lead">Yaşar Üniversitesi'nin ders kataloğundaki AKTS'lerle ve yönetmelikteki not kurallarıyla.</p>
				{programs.length ? (
					<p class="ort-meta-line">{count('lisans')} lisans, {count('onlisans')} ön lisans programı<span aria-hidden="true"> · </span>katalog {longDate(updated)}</p>
				) : null}
			</div>
			<aside class="ort-note" aria-label="Gizlilik">
				<b>Notların sende kalır</b>
				<span>Girdiğin notlar yalnızca bu cihazda saklanır, foruma gönderilmez.</span>
			</aside>
		</header>
	);
}

function Skeleton() {
	return (
		<div class="ort-card" aria-hidden="true">
			<ul class="ort-skel">{[0, 1, 2, 3, 4, 5, 6].map(i => <li key={i} />)}</ul>
		</div>
	);
}

function Failed({ what, onRetry }) {
	return (
		<div class="ort-card ort-empty" role="alert">
			<p>{what} yüklenemedi. Bağlantını kontrol edip yeniden dene.</p>
			<button type="button" class="ort-btn ort-btn--ghost" onClick={onRetry}>Yeniden dene</button>
		</div>
	);
}

function SemesterCard({ s, openKey, stale, onToggle, onPick, onRemove, onClose, onChoose, onAdd }) {
	const courses = s.rows.filter(r => r.type === 'course');
	const avg = average(courses.map(r => ({ akts: r.akts, grade: s.sem.grades[r.key] || '' })));
	return (
		<section class="ort-card ort-sem" aria-labelledby={`ort-sem-${s.no}`}>
			<header class="ort-sem-head">
				<h4 class="ort-sem-title" id={`ort-sem-${s.no}`}>{s.no}. yarıyıl</h4>
				<span class="ort-sem-meta">
					{avg.value === null ? null : <span class="ort-sem-avg">Dönem <b>{format(avg.value)}</b></span>}
					<span>{s.planned} AKTS</span>
				</span>
			</header>
			{s.rows.length ? (
				<ul class="ort-rows">
					{s.rows.map((r, i) => (r.type === 'group' ? (
						<GroupRow key={r.key} row={r} order={i} onChoose={() => onChoose(s.no, r)} />
					) : (
						<CourseRow
							key={r.key}
							row={r}
							order={i}
							grade={s.sem.grades[r.key] || ''}
							open={openKey === `${s.no}|${r.key}`}
							stale={stale.has(`${s.no}|${r.key}`)}
							onToggle={() => onToggle(s.no, r)}
							onPick={g => onPick(s.no, r, g)}
							onRemove={() => onRemove(s.no, r)}
							onClose={onClose}
						/>
					)))}
				</ul>
			) : <p class="ort-empty">Bu yarıyıl için katalogda ders yok.</p>}
			<footer class="ort-sem-foot">
				<button type="button" class="ort-link" onClick={() => onAdd(s.no)}><Icon name="plus" size={16} />Ders ekle<span class="ort-visually-hidden">: {s.no}. yarıyıl</span></button>
			</footer>
		</section>
	);
}

function Workspace({ meta, program, state, set, onGpa, levelName }) {
	const curMeta = meta.cur.find(c => c.id === state.cur) || meta.cur[0];
	const [openKey, setOpenKey] = useState(null);
	const [dialog, setDialog] = useState(null);
	const [all, retryAll] = useLoad(loadAll, dialog && dialog.kind === 'add' ? 'all' : null);
	const [undo, setUndo] = useState(null);
	const listBox = useRef(null);

	const sems = useMemo(() => Array.from({ length: curMeta.sems }, (_, i) => {
		const sem = semOf(state, i + 1);
		const rows = rowsOf(program, curMeta.id, i + 1, sem);
		const planned = rows.reduce((n, r) => n + (r.type === 'group' ? (r.picked.length ? 0 : r.akts) : (r.akts || 0)), 0);
		return { no: i + 1, sem, rows, planned };
	}), [program, state.plans, state.program, curMeta.id, curMeta.sems]);
	const coursesOf = s => s.rows.filter(r => r.type === 'course');
	const entriesOf = s => coursesOf(s).map(r => ({ code: r.code, akts: r.akts, grade: s.sem.grades[r.key] || '' }));

	// Aynı ders iki yarıyılda varsa yalnız son notu sayılır
	const { total, superseded } = cumulative(sems.map(entriesOf));
	const stale = new Set();
	superseded.forEach((id) => {
		const [si, ei] = id.split(':').map(Number);
		stale.add(`${sems[si].no}|${coursesOf(sems[si])[ei].key}`);
	});
	const plannedAkts = sems.reduce((n, s) => n + s.planned, 0);
	const restAkts = sems.reduce((n, s) => n + coursesOf(s).filter(r => !s.sem.grades[r.key]).reduce((m, r) => m + (r.akts || 0), 0), 0);
	const targetValue = parse(state.target);
	const need = targetValue === null ? null : needed(targetValue, total, restAkts);
	const hasAny = Object.keys(state.plans[planKey(state)] || {}).length > 0;

	useEffect(() => { onGpa(total.value); }, [total.value]);

	const years = [];
	sems.forEach((s, i) => { if (i % 2 === 0) years.push([s]); else years[years.length - 1].push(s); });
	const yearTabs = years.map((pair, yi) => ({
		id: `ort-y-${yi + 1}`,
		label: `${yi + 1}. yıl`,
		avg: average(pair.flatMap(s => entriesOf(s))).value,
	}));

	// Yapışık çubuğun yüksekliği: yıla atlarken başlık çubuğun altında kalmasın
	const bar = useRef(null);
	const [barH, setBarH] = useState(0);
	useLayoutEffect(() => {
		const el = bar.current;
		if (!el || typeof ResizeObserver === 'undefined') return undefined;
		const ro = new ResizeObserver(() => setBarH(Math.round(el.getBoundingClientRect().height)));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// Sayfa kaydıkça çubuğun altına gelen yıl işaretlenir
	const [activeYear, setActiveYear] = useState(0);
	useEffect(() => {
		let frame = 0;
		const spy = () => {
			frame = 0;
			const box = listBox.current;
			const b = bar.current;
			if (!box || !b) return;
			const edge = b.getBoundingClientRect().bottom + 24;
			const secs = [...box.querySelectorAll('.ort-year')];
			let at = 0;
			secs.forEach((el, i) => { if (el.getBoundingClientRect().top <= edge) at = i; });
			// Sayfanın sonuna gelindiyse son yıl
			if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) at = secs.length - 1;
			setActiveYear(at);
		};
		const onScroll = () => { if (!frame) frame = requestAnimationFrame(spy); };
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		spy();
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			if (frame) cancelAnimationFrame(frame);
		};
	}, [curMeta.id]);

	const jump = (i) => {
		const el = document.getElementById(yearTabs[i].id);
		if (!el) return;
		const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
		const h = el.querySelector('h3');
		if (h) h.focus({ preventScroll: true });
	};

	useEffect(() => {
		if (!undo) return undefined;
		const t = setTimeout(() => setUndo(null), 7000);
		return () => clearTimeout(t);
	}, [undo]);

	const change = (no, fn) => set(prev => withSem(prev, no, fn));

	const pick = (no, row, grade) => {
		const s = sems[no - 1];
		const filling = !s.sem.grades[row.key];
		change(no, (sem) => {
			const grades = { ...sem.grades };
			if (grade) grades[row.key] = grade; else delete grades[row.key];
			return { ...sem, grades };
		});
		// İlk kez not girilirken sıradaki notsuz ders açılır: notlar art arda, tek dokunuşla girilir
		const list = coursesOf(s);
		const next = grade && filling ? list.slice(list.findIndex(r => r.key === row.key) + 1).find(r => !s.sem.grades[r.key]) : null;
		setOpenKey(next ? `${no}|${next.key}` : null);
		if (!next && listBox.current) {
			const el = listBox.current.querySelector(`#ort-sem-${no}`);
			const li = el && [...el.closest('.ort-sem').querySelectorAll('.ort-row')].find(x => x.dataset.key === row.key);
			const btn = li && li.querySelector('.ort-grade');
			if (btn) btn.focus({ preventScroll: true });
		}
	};

	const remove = (no, row) => {
		const before = state;
		change(no, (sem) => {
			const grades = { ...sem.grades };
			delete grades[row.key];
			if (row.origin === 'plan') return { ...sem, grades, removed: [...sem.removed, row.code] };
			if (row.origin === 'pick') return { ...sem, grades, picks: { ...sem.picks, [row.group]: (sem.picks[row.group] || []).filter(c => c !== row.code) } };
			return { ...sem, grades, extra: sem.extra.filter(x => x.code !== row.code) };
		});
		setOpenKey(null);
		setUndo({ text: `${row.name} çıkarıldı.`, back: () => set(() => before) });
	};

	const chooseFromGroup = (code) => {
		const { no, row } = dialog;
		const single = !(row.count > 1);
		change(no, (sem) => {
			const now = sem.picks[row.code] || [];
			const next = single ? [code] : (now.includes(code) ? now.filter(c => c !== code) : [...now, code]);
			return { ...sem, picks: { ...sem.picks, [row.code]: next } };
		});
		if (single) setDialog(null);
	};

	const addExtra = (item) => {
		const { no } = dialog;
		change(no, (sem) => {
			if (sem.extra.some(x => x.code === item.code)) return sem;
			return { ...sem, extra: [...sem.extra, item], removed: sem.removed.filter(c => c !== item.code) };
		});
		setDialog(null);
	};

	const clear = () => {
		const before = state;
		set((prev) => {
			const plans = { ...prev.plans };
			delete plans[planKey(prev)];
			return { ...prev, plans, target: '' };
		});
		setOpenKey(null);
		setUndo({ text: 'Notlar temizlendi.', back: () => set(() => before) });
	};

	const cardProps = {
		openKey,
		stale,
		onToggle: (no, r) => setOpenKey(k => (k === `${no}|${r.key}` ? null : `${no}|${r.key}`)),
		onPick: pick,
		onRemove: remove,
		onClose: () => setOpenKey(null),
		onChoose: (no, row) => setDialog({ kind: 'group', no, row }),
		onAdd: no => setDialog({ kind: 'add', no }),
	};
	const dialogRow = dialog && dialog.kind === 'group' ? sems[dialog.no - 1].rows.find(r => r.key === dialog.row.key) : null;
	const taken = dialog ? coursesOf(sems[dialog.no - 1]).map(r => r.code) : [];
	return (
		<div class="ort-work" style={{ '--ort-bar-h': `${barH}px` }}>
			<header class="ort-ctx">
				<FacIcon faculty={meta.faculty} size={44} />
				<div class="ort-ctx-text">
					<h2 class="ort-ctx-name" id="ort-title">{meta.name}</h2>
					<p class="ort-ctx-meta">{levelName}<span aria-hidden="true"> · </span>{meta.faculty}</p>
				</div>
			</header>

			<Bar
				barRef={bar}
				total={total}
				plannedAkts={plannedAkts}
				target={state.target}
				onTarget={target => set(prev => ({ ...prev, target }))}
				need={need}
				years={yearTabs}
				active={activeYear}
				onJump={jump}
			/>

			<div class="ort-tools">
				<label class="ort-tools-cur">
					<span class="ort-label">Müfredat</span>
					<span class="ort-select">
						<select class="ort-input" value={curMeta.id} onChange={(e) => { const cur = e.currentTarget.value; set(prev => ({ ...prev, cur })); setOpenKey(null); }}>
							{meta.cur.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
						</select>
						<Icon name="down" size={16} />
					</span>
				</label>
				<p class="ort-hint">Okula girdiğin yılın müfredatını seç; dersler ve AKTS'ler ona göre gelir.</p>
			</div>

			<div class="ort-years" ref={listBox} key={curMeta.id}>
				{years.map((pair, yi) => (
					<section key={yi} class="ort-year" id={yearTabs[yi].id} aria-labelledby={`${yearTabs[yi].id}-t`}>
						<h3 class="ort-rule" id={`${yearTabs[yi].id}-t`} tabindex="-1"><span>{yi + 1}. yıl</span></h3>
						<div class="ort-year-grid">
							{pair.map(s => <SemesterCard key={s.no} s={s} {...cardProps} />)}
						</div>
					</section>
				))}
			</div>

			<footer class="ort-foot">
				<details class="ort-how">
					<summary>Nasıl hesaplanıyor?<Icon name="down" size={16} /></summary>
					<ul>
						<li>Her notun katsayısı dersin AKTS'siyle çarpılır, toplam AKTS'ye bölünür.</li>
						<li>Ortalama yuvarlanmaz: 2,999 çıkarsa 2,99 yazılır.</li>
						<li>Tekrar aldığın derste son notunu gir; yalnız o sayılır.</li>
						<li>S, U ve W ortalamaya girmez. NA, F gibi 0 sayılır.</li>
					</ul>
					<p>Kaynak: <a href="https://www.mevzuat.gov.tr/File/GeneratePdf?mevzuatNo=22754&mevzuatTur=UniversiteYonetmeligi&mevzuatTertip=5" target="_blank" rel="noopener">Yaşar Üniversitesi Ön Lisans ve Lisans Yönetmeliği</a> (m. 21, m. 30). Dersler ve AKTS'ler üniversitenin kataloğundan, 8 Ekim 2026. Notların yalnızca bu cihazda saklanır.</p>
				</details>
				{hasAny ? <button type="button" class="ort-link ort-clear" onClick={clear}>Notları temizle</button> : null}
			</footer>

			{undo ? (
				<div class="ort-toast" role="status">
					<span>{undo.text}</span>
					<button type="button" class="ort-link" onClick={() => { undo.back(); setUndo(null); }}>Geri al</button>
				</div>
			) : null}

			{dialog && dialog.kind === 'group' && dialogRow ? (
				<Picker
					title={dialogRow.name}
					items={dialogRow.pool.map(x => [x[0], (program.courses[x[0]] || [x[0]])[0], x[1]])}
					picked={dialogRow.picked}
					multi={dialogRow.count > 1}
					onPick={chooseFromGroup}
					onClose={() => setDialog(null)}
				/>
			) : null}
			{dialog && dialog.kind === 'add' ? (
				<Picker
					title={`${dialog.no}. yarıyıla ders ekle`}
					items={all.status === 'ok' ? all.data.filter(x => !taken.includes(x[0])) : []}
					loading={all.status === 'loading'}
					failed={all.status === 'error'}
					onRetry={retryAll}
					onPick={(code, x) => addExtra({ code, name: x[1], akts: x[2] })}
					onManual={x => addExtra({ code: `Ek ${Date.now().toString(36).slice(-4).toUpperCase()}`, name: x.name, akts: x.akts })}
					onClose={() => setDialog(null)}
				/>
			) : null}
		</div>
	);
}

// Bölüm seçilince açılacak müfredat: en yeni normal müfredat (YU-COOP ya da yabancı uyruklu değil)
const defaultCur = p => (p.cur.find(c => c.variant === 'normal') || p.cur[0]).id;

function App() {
	const [state, setState] = useState(loadState);
	const [index, retryIndex] = useLoad(loadIndex, 'index', peekIndex);
	const programs = index.status === 'ok' ? index.data.programs : [];
	const meta = programs.find(p => p.id === state.program) || null;
	const usable = Boolean(state.ready && meta && meta.type === state.level);
	const [program, retryProgram] = useLoad(() => loadProgram(state.program), usable ? state.program : null, () => peekProgram(state.program));
	const [gpa, setGpa] = useState(null);
	// Kayıtlı bölüm varsa dersleri hemen indir: 3. adıma dönüş beklemesiz olur
	useEffect(() => { if (index.status === 'ok' && state.program) prefetchProgram(state.program); }, [index.status]);

	// Hangi adımda olunduğu cihazda saklanmaz: kayıtlı bölüm varsa doğrudan notlar açılır
	const [view, setView] = useState(() => (state.ready && state.program ? 3 : (state.levelSet ? 2 : 1)));
	const [dir, setDir] = useState(1);
	const step = index.status === 'ok' && view === 3 && !usable ? (state.levelSet ? 2 : 1) : view;

	// Yerleşim, sayfanın değil aracın kendi genişliğine göre değişir (forumun kenar çubukları açık ya da kapalı olabilir)
	const box = useRef(null);
	const [width, setWidth] = useState(1000);
	useEffect(() => {
		const el = box.current;
		if (!el || typeof ResizeObserver === 'undefined') return undefined;
		const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
		ro.observe(el);
		setWidth(Math.round(el.getBoundingClientRect().width));
		return () => ro.disconnect();
	}, []);

	// Yapışık çubuğun üstündeki örtü sayfanın gerçek zemin rengini alır (masaüstünde beyaz/koyu, telefonda gri):
	// en yakın dolu zeminli üst öğeden okunur, tema değişince yeniden okunur
	useEffect(() => {
		const el = box.current;
		if (!el) return undefined;
		const clear = c => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
		const paint = () => {
			let n = el.parentElement;
			while (n && clear(getComputedStyle(n).backgroundColor)) n = n.parentElement;
			el.style.setProperty('--ort-page-bg', n ? getComputedStyle(n).backgroundColor : '');
		};
		paint();
		let t = 0;
		const mo = new MutationObserver(() => { paint(); clearTimeout(t); t = setTimeout(paint, 400); });
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
		return () => { mo.disconnect(); clearTimeout(t); };
	}, []);

	const set = (fn) => setState((prev) => {
		const next = fn(prev);
		saveState(next);
		return next;
	});

	const go = (to) => {
		if (to === step) return;
		setDir(to > step ? 1 : -1);
		setView(to);
		// Yeni adımın başı ekranda olsun
		const el = box.current;
		if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
	};

	const pickLevel = (level) => {
		set(prev => ({ ...prev, level, levelSet: true }));
		go(2);
	};
	const pickProgram = (p) => {
		set(prev => ({ ...prev, program: p.id, cur: prev.program === p.id && p.cur.some(c => c.id === prev.cur) ? prev.cur : defaultCur(p), level: p.type, levelSet: true, ready: true }));
		go(3);
	};

	const level = levelOf(state.level);
	const steps = [
		{ label: 'Düzey', value: state.levelSet ? level.name : 'Seçiliyor', reachable: true },
		{ label: level.id === 'onlisans' ? 'Program' : 'Bölüm', value: usable ? meta.name : (step === 2 ? 'Seçiliyor' : 'Seçilmedi'), reachable: Boolean(state.levelSet) },
		{
			label: 'Notlar',
			value: step === 3 ? (gpa === null ? 'Henüz not yok' : `Ortalama ${format(gpa)}`) : (usable ? 'Kaldığın yerden devam et' : `${level.id === 'onlisans' ? 'Program' : 'Bölüm'} seçince açılır`),
			reachable: usable,
		},
	];

	let body;
	if (index.status === 'loading') {
		body = <><Skeleton /><p class="ort-visually-hidden" role="status">Bölümler yükleniyor</p></>;
	} else if (index.status === 'error') {
		body = <Failed what="Bölüm listesi" onRetry={retryIndex} />;
	} else if (step === 1) {
		body = <LevelStep programs={programs} level={state.levelSet ? state.level : ''} onPick={pickLevel} />;
	} else if (step === 2) {
		body = <ProgramStep programs={programs} level={state.level} current={usable ? state.program : ''} onPick={pickProgram} />;
	} else if (program.status === 'ok') {
		body = <Workspace meta={meta} program={program.data} state={state} set={set} onGpa={setGpa} levelName={level.name} />;
	} else if (program.status === 'error') {
		body = <Failed what="Dersler" onRetry={retryProgram} />;
	} else {
		body = <><Skeleton /><p class="ort-visually-hidden" role="status">Dersler yükleniyor</p></>;
	}

	return (
		<div class={`ort-app${width >= 860 ? ' is-wide' : ''}${width >= 560 ? ' is-mid' : ''}`} ref={box}>
			{step === 1 ? <Hero programs={programs} updated={index.status === 'ok' ? index.data.updated : ''} /> : null}
			{step === 2 || (step === 3 && program.status !== 'ok') ? <h2 class="ort-visually-hidden">GPA Hesaplayıcı</h2> : null}
			<Steps steps={steps} current={step} onGo={go} />
			{/* Geri yolu adım çubuğundan başka belirgin bir düğmeyle de görünsün; seçimler ve notlar silinmez */}
			{step > 1 && index.status === 'ok' ? (
				<button type="button" class="ort-btn ort-btn--ghost ort-back" onClick={() => go(step - 1)}>
					<Icon name="left" />
					{step === 2 ? 'Düzey seçimine dön' : `${level.id === 'onlisans' ? 'Program' : 'Bölüm'} listesine dön`}
				</button>
			) : null}
			<div class={`ort-view ${dir > 0 ? 'is-fwd' : 'is-back'}`} key={step}>{body}</div>
		</div>
	);
}

let mountedRoot = null;
window.YuOrtalama = {
	mount(root, ctx) {
		mountedRoot = root;
		setDataBase(ctx.dataBase);
		root.classList.add('ort-yu-mounted');
		render(<App />, root);
	},
	unmount() {
		if (mountedRoot) {
			render(null, mountedRoot);
			mountedRoot = null;
		}
	},
};
