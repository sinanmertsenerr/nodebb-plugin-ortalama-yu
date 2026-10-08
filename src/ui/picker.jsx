// Ders seçme penceresi (tarayıcının kendi <dialog> öğesi): seçmeli havuzundan ya da bütün derslerden arayarak seçilir.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Icon } from './icons.jsx';

// Aramada Türkçe harfler ve büyük/küçük harf fark etmez: "muhendislik" Mühendislik'i bulur
export const fold = s => String(s).toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');

const LIMIT = 60;

export function Picker({ title, items, loading, failed, onRetry, picked = [], multi, onPick, onClose, onManual }) {
	const ref = useRef(null);
	const [query, setQuery] = useState('');
	const [manual, setManual] = useState(false);
	const [name, setName] = useState('');
	const [akts, setAkts] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		const el = ref.current;
		if (el && !el.open) el.showModal();
		return () => { if (el && el.open) el.close(); };
	}, []);

	const folded = useMemo(() => (items || []).map(x => [x, fold(`${x[0]} ${x[1]}`)]), [items]);
	const q = fold(query.trim());
	const hits = useMemo(() => folded.filter(([, text]) => !q || q.split(/\s+/).every(part => text.includes(part))).map(([x]) => x), [folded, q]);
	const shown = hits.slice(0, LIMIT);

	const addManual = (e) => {
		e.preventDefault();
		const value = Number(String(akts).replace(',', '.'));
		if (!name.trim()) { setError('Dersin adını yaz.'); return; }
		if (!(value > 0 && value <= 60)) { setError('AKTS 1 ile 60 arasında bir sayı olmalı.'); return; }
		onManual({ name: name.trim(), akts: value });
	};

	return (
		<dialog ref={ref} class="ort-dialog" aria-labelledby="ort-dialog-title" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
			<div class="ort-dialog-box">
				<header class="ort-dialog-head">
					<h3 id="ort-dialog-title">{title}</h3>
					<button type="button" class="ort-icon-btn" aria-label="Kapat" onClick={() => ref.current.close()}><Icon name="x" size={20} /></button>
				</header>
				{manual ? (
					<form class="ort-manual" onSubmit={addManual}>
						<label class="ort-field">
							<span>Ders adı</span>
							<input class="ort-input" type="text" value={name} autocomplete="off" onInput={(e) => { setName(e.currentTarget.value); setError(''); }} />
						</label>
						<label class="ort-field">
							<span>AKTS</span>
							<input class="ort-input ort-input--sm" type="text" inputmode="decimal" value={akts} autocomplete="off" onInput={(e) => { setAkts(e.currentTarget.value); setError(''); }} />
						</label>
						{error ? <p class="ort-err" role="alert">{error}</p> : null}
						<div class="ort-dialog-foot">
							<button type="button" class="ort-btn ort-btn--ghost" onClick={() => setManual(false)}>Listeye dön</button>
							<button type="submit" class="ort-btn">Dersi ekle</button>
						</div>
					</form>
				) : (
					<>
						<label class="ort-search">
							<Icon name="search" size={18} />
							<span class="ort-visually-hidden">Ders ara</span>
							<input class="ort-input" type="search" placeholder="Kod ya da ad ara" value={query} autocomplete="off" onInput={e => setQuery(e.currentTarget.value)} />
						</label>
						<div class="ort-dialog-list" tabindex="-1">
							{loading ? <ul class="ort-skel" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(i => <li key={i} />)}</ul> : null}
							{loading ? <p class="ort-visually-hidden" role="status">Dersler yükleniyor</p> : null}
							{failed ? <div class="ort-empty" role="alert"><p>Ders listesi yüklenemedi. Bağlantını kontrol et.</p><button type="button" class="ort-btn ort-btn--ghost" onClick={onRetry}>Yeniden dene</button></div> : null}
							{!loading && !failed && !shown.length ? <p class="ort-empty" role="status">Bu aramaya uyan ders yok.</p> : null}
							{!loading && !failed && shown.length ? (
								<ul class="ort-opts">
									{shown.map((x) => {
										const on = picked.includes(x[0]);
										return (
											<li key={x[0]}>
												<button type="button" class={`ort-opt${on ? ' is-on' : ''}`} aria-pressed={multi ? on : undefined} onClick={() => onPick(x[0], x)}>
													<span class="ort-code">{x[0]}</span>
													<span class="ort-name">{x[1]}</span>
													<span class="ort-akts">{x[2] === null ? '?' : x[2]} AKTS</span>
													<span class="ort-opt-check" aria-hidden="true">{on ? <Icon name="check" size={16} /> : null}</span>
												</button>
											</li>
										);
									})}
								</ul>
							) : null}
							{hits.length > LIMIT ? <p class="ort-hint ort-more">{hits.length - LIMIT} ders daha var. Aramayı daralt.</p> : null}
						</div>
						<div class="ort-dialog-foot">
							{onManual ? <button type="button" class="ort-link" onClick={() => setManual(true)}>Listede yok, elle ekle</button> : <span />}
							{multi ? <button type="button" class="ort-btn" onClick={() => ref.current.close()}>Tamam</button> : null}
						</div>
					</>
				)}
			</div>
		</dialog>
	);
}
