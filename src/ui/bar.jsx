// Üstte yapışık kalan sonuç çubuğu: genel ortalama (rakamlar sayaç gibi döner), 0-4 cetveli, AKTS, hedef ve yıl sekmeleri.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { format, parse } from '../calc.js';
import { Icon } from './icons.jsx';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Sayaç: her rakam 0-9 şeridinde kendi yerine kayar (design-mcp kataloğundaki assistant-ui "number-roll" bileşeninden
// uyarlandı: Preact, forumun yazı tipi ve tabular rakamlar). Ekran okuyucu şeridi değil, yanındaki gizli metni okur.
export function Roll({ value }) {
	if (value === null) return <span class="ort-roll" aria-hidden="true">–</span>;
	return (
		<span class="ort-roll" aria-hidden="true">
			{format(value).split('').map((ch, i) => (/\d/.test(ch) ? (
				<span class="ort-roll-d" key={i} style={{ '--ort-d': Number(ch) }}>
					<span class="ort-roll-strip">{DIGITS.map(n => <span key={n}>{n}</span>)}</span>
				</span>
			) : <span key={i}>{ch}</span>))}
		</span>
	);
}

function Scale({ value }) {
	return (
		<div class="ort-scale" style={{ '--ort-p': value === null ? 0 : value / 400 }} aria-hidden="true">
			<div class="ort-scale-track">
				<span class="ort-scale-fill" />
				<span class="ort-scale-mark" style={{ left: '50%' }} />
				<span class="ort-scale-mark" style={{ left: '75%' }} />
				{value === null ? null : <span class="ort-scale-pos"><span class="ort-scale-dot" /></span>}
			</div>
			<div class="ort-scale-nums">
				<span style={{ left: 0 }}>0</span>
				<span style={{ left: '50%' }}><b>2,00</b><i>mezuniyet</i></span>
				<span style={{ left: '75%' }}><b>3,00</b><i>burs, ÇAP</i></span>
				<span style={{ left: '100%' }}>4,00</span>
			</div>
		</div>
	);
}

function TargetLine({ need }) {
	if (!need || need.state === 'none') return <p class="ort-target-out">Notu girilmemiş ders kalmadı.</p>;
	if (need.state === 'safe') return <p class="ort-target-out is-good"><Icon name="check" size={16} />Hedefin şimdiden garanti.</p>;
	if (need.state === 'out') return <p class="ort-target-out"><Icon name="alert" size={16} /><span>Ulaşılamıyor: kalanların hepsi A olsa en çok <b>{format(need.best)}</b> olur.</span></p>;
	return <p class="ort-target-out"><span>Kalan derslerden ortalama <b>{format(need.value)}</b> gerekir.</span></p>;
}

// Yıl sekmeleri: sayfa kaydıkça bulunulan yıl işaretlenir, alttaki çizgi o sekmeye kayar (design-mcp kataloğundaki
// microkit "sliding-underline-tabs" bileşeninden uyarlandı). Sekmeye basınca o yıla gidilir.
function YearTabs({ years, active, onJump }) {
	const box = useRef(null);
	const [line, setLine] = useState(null);
	useLayoutEffect(() => {
		const el = box.current;
		if (!el) return undefined;
		const measure = () => {
			const tab = el.querySelectorAll('.ort-ytab')[active];
			if (tab) setLine({ x: tab.offsetLeft, w: tab.offsetWidth });
		};
		measure();
		if (typeof ResizeObserver === 'undefined') return undefined;
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [active, years.map(y => y.avg).join()]);
	return (
		<nav class="ort-ytabs" aria-label="Yıllar" ref={box}>
			{years.map((y, i) => (
				<button key={y.id} type="button" class={`ort-ytab${i === active ? ' is-on' : ''}`} aria-controls={y.id} aria-current={i === active ? 'location' : undefined} onClick={() => onJump(i)}>
					{y.label}
					{y.avg === null ? null : <span class="ort-ytab-avg"><span class="ort-visually-hidden">, ortalama </span>{format(y.avg)}</span>}
				</button>
			))}
			{line ? <span class="ort-ytabs-line" style={{ transform: `translateX(${line.x}px)`, width: `${line.w}px` }} aria-hidden="true" /> : null}
		</nav>
	);
}

export function Bar({ total, plannedAkts, target, onTarget, need, years, active, onJump, barRef }) {
	const [open, setOpen] = useState(Boolean(target));
	const value = total.value;
	const bad = target.trim() !== '' && parse(target) === null;
	return (
		<section class="ort-bar" aria-label="Sonuç" ref={barRef}>
			<div class="ort-bar-row">
				<div class="ort-bar-gpa">
					<h3 class="ort-bar-label">Genel ortalama</h3>
					<p class="ort-bar-value">
						<Roll value={value} />
						<span class="ort-visually-hidden" role="status" aria-live="polite">{value === null ? 'Henüz not girilmedi' : `Genel ortalama ${format(value)}`}</span>
						{value === null ? null : (
							<span class={`ort-status ${value < 200 ? 'is-bad' : 'is-good'}`}>
								<span class="ort-status-dot" aria-hidden="true" />{value < 200 ? 'Sınamalı' : 'Başarılı'}
							</span>
						)}
					</p>
				</div>
				<div class="ort-bar-scale">
					<Scale value={value} />
				</div>
				<div class="ort-bar-side">
					<span class="ort-bar-akts"><b>{total.akts / 10}</b> / {plannedAkts} AKTS</span>
					<button type="button" class="ort-link" aria-expanded={open} aria-controls="ort-target" onClick={() => setOpen(v => !v)}>Hedef<Icon name="down" size={15} /></button>
				</div>
			</div>
			{value === null ? <p class="ort-bar-hint">Derslerinin notunu seçtikçe ortalaman burada görünür.</p> : null}
			<div class={`ort-fold${open ? ' is-open' : ''}`} id="ort-target" inert={!open}>
				<div class="ort-target">
					<label class="ort-target-field">
						<span>Genel ortalamam şu olsun</span>
						<input class={`ort-input ort-input--sm${bad ? ' is-bad' : ''}`} type="text" inputmode="decimal" placeholder="3,00" autocomplete="off" value={target} aria-invalid={bad} onInput={e => onTarget(e.currentTarget.value)} />
					</label>
					{bad ? <p class="ort-err" role="alert">Hedefi 0 ile 4,00 arasında yaz (örnek: 3,00).</p> : null}
					{!bad && parse(target) !== null ? <TargetLine need={need} /> : null}
				</div>
			</div>
			{years.length > 1 ? <YearTabs years={years} active={active} onJump={onJump} /> : null}
		</section>
	);
}
