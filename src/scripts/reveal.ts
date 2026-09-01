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

/*
 * Ve vizuálním editoru se neanimuje.
 *
 * Tina vykresluje stránku v iframu a po každé úpravě překreslí editovanou
 * oblast — vzniknou nové elementy s `data-reveal`, které původní
 * IntersectionObserver nesleduje. Zůstaly by skryté a editor by ukazoval
 * prázdnou stránku. Odhalování je navíc v editoru spíš na překážku: redakce
 * potřebuje obsah vidět hned.
 */
const inEditor = () => {
	try {
		return window.self !== window.top;
	} catch {
		// Cizí původ v iframu vyhodí výjimku — pak jsme taky vloženi.
		return true;
	}
};

function reveal() {
	const blocks = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
	if (blocks.length === 0 || reduced.matches || inEditor()) return;

	document.documentElement.classList.add('js-reveal');

	const show = (block: HTMLElement) => {
		block.classList.add('is-visible');
		observer.unobserve(block);
	};

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) show(entry.target as HTMLElement);
			}
		},
		// Blok se odhalí, jakmile do něj kus zasahuje — ne až celý, jinak by
		// blok vyšší než okno zůstal schovaný.
		{ rootMargin: '0px 0px -10% 0px', threshold: 0 },
	);

	for (const block of blocks) observer.observe(block);

	/*
	 * Pojistka. Kdyby observer z jakéhokoli důvodu nedoběhl — zahlcený
	 * prohlížeč, vložená stránka, chyba v callbacku — odhalíme po chvíli
	 * všechno, co je zrovna vidět. Skrytý obsah je horší než chybějící
	 * animace.
	 */
	window.setTimeout(() => {
		for (const block of blocks) {
			if (block.classList.contains('is-visible')) continue;
			const box = block.getBoundingClientRect();
			if (box.top < window.innerHeight && box.bottom > 0) show(block);
		}
	}, 1500);
}

reveal();

// Když někdo zapne omezení pohybu za běhu, zbytek se dorovná.
reduced.addEventListener('change', () => {
	if (!reduced.matches) return;
	document.documentElement.classList.remove('js-reveal');
});
