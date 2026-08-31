/**
 * Odhalování bloků při scrollování.
 *
 * Skript nejdřív označí dokument třídou `js-reveal` — teprve ta v CSS zapne
 * skrytý výchozí stav. Kdyby se skript nenačetl nebo spadl, zůstane obsah
 * normálně vidět.
 *
 * Bloky označuje `Blocks.astro` atributem `data-reveal`; úvodní pás se
 * vynechává, ten má být vidět hned.
 */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function reveal() {
	const blocks = document.querySelectorAll<HTMLElement>('[data-reveal]');
	if (blocks.length === 0 || reduced.matches) return;

	document.documentElement.classList.add('js-reveal');

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				entry.target.classList.add('is-visible');
				observer.unobserve(entry.target);
			}
		},
		// Blok se odhalí, jakmile do něj kus zasahuje — ne až celý, jinak by
		// blok vyšší než okno zůstal schovaný.
		{ rootMargin: '0px 0px -10% 0px', threshold: 0 },
	);

	for (const block of blocks) observer.observe(block);
}

reveal();

// Když někdo zapne omezení pohybu za běhu, zbytek se dorovná.
reduced.addEventListener('change', () => {
	if (!reduced.matches) return;
	document.documentElement.classList.remove('js-reveal');
});
