// 1. adım: lisans ya da ön lisans.
import { Icon } from './icons.jsx';

export const LEVELS = [
	{ id: 'lisans', name: 'Lisans', years: 4, unit: 'bölüm' },
	{ id: 'onlisans', name: 'Ön lisans', years: 2, unit: 'program' },
];

export const levelOf = id => LEVELS.find(l => l.id === id) || LEVELS[0];

// "9 fakülte ve yüksekokul", "2 yüksekokul"
export function unitsText(list) {
	const names = [...new Set(list.map(p => p.faculty))];
	const fac = names.filter(n => /Fakülte/.test(n)).length;
	if (fac === names.length) return `${fac} fakülte`;
	if (!fac) return `${names.length} yüksekokul`;
	return `${names.length} fakülte ve yüksekokul`;
}

export function LevelStep({ programs, level, onPick }) {
	return (
		<section class="ort-pane" aria-labelledby="ort-pane-title">
			<h3 class="ort-pane-title" id="ort-pane-title">Hangi programda okuyorsun?</h3>
			<div class="ort-levels">
				{LEVELS.map((l) => {
					const list = programs.filter(p => p.type === l.id);
					return (
						<button key={l.id} type="button" class={`ort-level${level === l.id ? ' is-on' : ''}`} onClick={() => onPick(l.id)}>
							<span class="ort-level-years" aria-hidden="true"><b>{l.years}</b><span>yıl</span></span>
							<span class="ort-level-body">
								<span class="ort-level-name">{l.name}</span>
								<span class="ort-level-meta">
									<span class="ort-visually-hidden">{l.years} yıl, </span>
									{list.length} {l.unit}<span aria-hidden="true"> · </span>{unitsText(list)}
								</span>
							</span>
							<Icon name="right" size={20} />
						</button>
					);
				})}
			</div>
		</section>
	);
}
