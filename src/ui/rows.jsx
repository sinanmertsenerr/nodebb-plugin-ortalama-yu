// Ders satırı ve not tuş takımı: nota basınca on beş not küçük bir ızgarada açılır, biri seçilince sıradaki ders açılır.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { LETTERS, OTHERS, format } from '../calc.js';
import { Icon } from './icons.jsx';

const SPOKEN = { 'A-': 'A eksi', 'B+': 'B artı', 'B-': 'B eksi', 'C+': 'C artı', 'C-': 'C eksi', 'D+': 'D artı' };
const OTHER_TITLE = { NA: 'Devamsız, 0 sayılır', S: 'Yeterli, ortalamaya girmez', U: 'Yetersiz, ortalamaya girmez', W: 'Çekildim, ortalamaya girmez' };
const KEYS = [...LETTERS, ...OTHERS].map(g => ({ id: g.id, label: OTHER_TITLE[g.id] ? `${g.id}: ${OTHER_TITLE[g.id]}` : `${SPOKEN[g.id] || g.id}, ${format(g.k)}`, other: !LETTERS.includes(g) }));
const COLS = 4;

function Keypad({ value, onPick, onRemove, onClose, anchor }) {
	const box = useRef(null);
	const [up, setUp] = useState(false);

	// Altta yer yoksa yukarı açılır
	useLayoutEffect(() => {
		const r = anchor.current.getBoundingClientRect();
		const h = box.current.offsetHeight;
		setUp(r.bottom + h + 12 > window.innerHeight && r.top - h - 12 > 0);
		const on = box.current.querySelector('.is-on') || box.current.querySelector('button');
		on.focus({ preventScroll: true });
	}, []);

	useEffect(() => {
		const away = (e) => { if (!box.current.contains(e.target) && !anchor.current.contains(e.target)) onClose(false); };
		document.addEventListener('pointerdown', away, true);
		return () => document.removeEventListener('pointerdown', away, true);
	}, []);

	const onKey = (e) => {
		if (e.key === 'Escape') { e.stopPropagation(); onClose(true); return; }
		const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }[e.key];
		if (!move) return;
		const cells = [...box.current.querySelectorAll('.ort-key')];
		const at = cells.indexOf(document.activeElement);
		if (at === -1) return;
		e.preventDefault();
		const next = cells[at + move];
		if (next) next.focus();
	};

	return (
		<div ref={box} class={`ort-pad${up ? ' is-up' : ''}`} role="dialog" aria-label="Not seç" onKeyDown={onKey}>
			<div class="ort-pad-grid">
				{KEYS.map(k => (
					<button key={k.id} type="button" class={`ort-key${k.other ? ' ort-key--other' : ''}${value === k.id ? ' is-on' : ''}`} aria-pressed={value === k.id} aria-label={k.label} title={k.label} onClick={() => onPick(k.id)}>{k.id}</button>
				))}
				<button type="button" class="ort-key ort-key--clear" aria-label="Notu sil" title="Notu sil" disabled={!value} onClick={() => onPick('')}><Icon name="x" size={16} /></button>
			</div>
			<p class="ort-pad-note">S, U ve W ortalamaya girmez. NA 0 sayılır.</p>
			<button type="button" class="ort-link ort-pad-remove" onClick={onRemove}>Dersi listeden çıkar</button>
		</div>
	);
}

export function CourseRow({ row, grade, open, stale, onToggle, onPick, onRemove, onClose, order }) {
	const btn = useRef(null);
	return (
		<li class={`ort-row${open ? ' is-open' : ''}${stale ? ' is-stale' : ''}`} style={{ '--ort-i': order }} data-key={row.key}>
			<div class="ort-row-text">
				<span class="ort-name">{row.name}</span>
				<span class="ort-meta">
					{row.code}<span aria-hidden="true"> · </span>{row.akts === null ? '?' : row.akts} AKTS
					{row.origin === 'pick' ? <span class="ort-tag">seçmeli</span> : null}
					{stale ? <span class="ort-tag">sonra tekrar alındı, sayılmıyor</span> : null}
				</span>
			</div>
			<div class="ort-row-grade">
				<button ref={btn} type="button" class={`ort-grade${grade ? ' has-grade' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={onToggle}>
					<span class="ort-visually-hidden">{row.name}: </span>
					{grade ? <span class="ort-grade-letter" key={grade}>{grade}</span> : <span class="ort-grade-empty">Not</span>}
				</button>
				{open ? <Keypad value={grade} anchor={btn} onPick={onPick} onRemove={onRemove} onClose={(refocus) => { onClose(); if (refocus && btn.current) btn.current.focus(); }} /> : null}
			</div>
		</li>
	);
}

export function GroupRow({ row, onChoose, order }) {
	const left = row.count ? Math.max(0, row.count - row.picked.length) : null;
	const done = row.picked.length > 0 && left === 0;
	return (
		<li class="ort-row ort-row--group" style={{ '--ort-i': order }}>
			<div class="ort-row-text">
				<span class="ort-name">{row.name}</span>
				<span class="ort-meta">
					Seçmeli<span aria-hidden="true"> · </span>{row.akts} AKTS
					{row.count > 1 ? <span class="ort-tag">{row.picked.length}/{row.count} seçildi</span> : null}
				</span>
			</div>
			<div class="ort-row-grade">
				<button type="button" class="ort-pick" onClick={onChoose}>
					<span class="ort-visually-hidden">{row.name}: </span>{done ? 'Değiştir' : 'Ders seç'}
				</button>
			</div>
		</li>
	);
}
