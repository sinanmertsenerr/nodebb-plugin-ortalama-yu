// Seçimler ve notlar yalnızca bu cihazda saklanır (localStorage); sunucuya gitmez.
const KEY = 'ortalama-yu:v1';

export const emptyState = () => ({
	program: '',
	cur: '',
	level: 'lisans',
	levelSet: false,
	ready: false,
	target: '',
	plans: {},
});

export function loadState() {
	try {
		const saved = JSON.parse(window.localStorage.getItem(KEY) || 'null');
		// Eski kayıtta düzey adımı yoktu: bölüm seçilmişse düzey de seçilmiş sayılır
		if (saved && typeof saved === 'object') return { ...emptyState(), ...saved, levelSet: Boolean(saved.levelSet || saved.ready) };
	} catch (err) { /* bozuk kayıt: boş başla */ }
	return emptyState();
}

let timer = null;
export function saveState(state) {
	clearTimeout(timer);
	timer = setTimeout(() => {
		try {
			window.localStorage.setItem(KEY, JSON.stringify(state));
		} catch (err) { /* kota dolu ya da gizli sekme: kaydetmeden devam */ }
	}, 250);
}

export const planKey = state => `${state.program}/${state.cur}`;

const emptySem = () => ({ grades: {}, picks: {}, extra: [], removed: [] });

// Bir yarıyılın kaydı (yoksa boş)
export function semOf(state, no) {
	const plan = state.plans[planKey(state)] || {};
	return { ...emptySem(), ...(plan[no] || {}) };
}

// Bir yarıyılın kaydını değiştirir, yeni durumu döndürür
export function withSem(state, no, change) {
	const key = planKey(state);
	const plan = state.plans[key] || {};
	const next = change(semOf(state, no));
	return { ...state, plans: { ...state.plans, [key]: { ...plan, [no]: next } } };
}
