// Üstteki üç adım: Düzey → Bölüm → Notlar. design-mcp kataloğundaki react-bits "Stepper" bileşeninden uyarlandı:
// motion kütüphanesi yerine CSS geçişi ve forumun renkleri. Biten adımda tik çizilir, aradaki çizgi soldan dolar.
// Her adım bir düğmedir; geri dönmek seçimleri ve notları silmez.
import { Icon } from './icons.jsx';

// Önceki adıma dönüş: başlığın solunda çerçeveli, oklu düğme ve ince ayırıcı (2. adım başlığı, not ekranındaki bölüm).
// Dar alanda yalnız ok kalır; adı aria-label'da.
export function BackButton({ label, onClick }) {
	return (
		<>
			<button type="button" class="ort-btn ort-btn--ghost ort-back" onClick={onClick} aria-label={label} title={label}>
				<Icon name="left" />
				<span class="ort-back-text">{label}</span>
			</button>
			<span class="ort-back-sep" aria-hidden="true" />
		</>
	);
}

export function Steps({ steps, current, onGo }) {
	return (
		<nav class="ort-steps" aria-label="Adımlar">
			<ol>
				{steps.map((s, i) => {
					const no = i + 1;
					const state = no < current ? 'done' : (no === current ? 'now' : 'next');
					return (
						<li key={no} class={`ort-step is-${state}`}>
							<button
								type="button"
								class="ort-step-btn"
								disabled={!s.reachable}
								aria-current={no === current ? 'step' : undefined}
								onClick={() => { if (no !== current) onGo(no); }}
							>
								<span class="ort-step-dot" aria-hidden="true">
									{state === 'done' ? (
										<svg viewBox="0 0 24 24" width="16" height="16"><path class="ort-step-tick" d="M5 13l4 4L19 7" /></svg>
									) : (state === 'now' ? <span class="ort-step-core" /> : no)}
								</span>
								<span class="ort-step-text">
									<span class="ort-step-label">{s.label}</span>
									<span class="ort-step-value">{s.value}</span>
								</span>
							</button>
							{no < steps.length ? <span class="ort-step-line" aria-hidden="true"><span class={no < current ? 'is-full' : ''} /></span> : null}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
