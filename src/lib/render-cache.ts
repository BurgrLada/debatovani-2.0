/**
 * Cache vykreslených stránek.
 *
 * Web se od základu generoval staticky: build vyrobil 453 HTML souborů a Node
 * proces obsluhoval jen administraci. Mělo to dvě vlastnosti — web přežil pád
 * administrace a odpovědi byly okamžité — a jednu cenu: **změna se objevila až
 * po dalším buildu**, tedy v řádu minut.
 *
 * Stránky se proto vykreslují na vyžádání a tahle cache jim vrací statickou
 * rychlost. Redaktorovo uložení cache zahodí (`tina/database.ts`,
 * `src/lib/media.ts`), takže návštěvník vidí změnu při dalším načtení.
 *
 * Co se tím ztratilo, ať je to řečeno nahlas: **pád Node procesu teď shodí
 * i web**, ne jen administraci. Bylo to vědomé rozhodnutí proti původnímu
 * návrhu (docs/06, sekce 2) výměnou za okamžitou publikaci.
 *
 * Cache je v paměti procesu, ne na disku. Restart ji vyprázdní a první
 * požadavek na každou stránku se vykreslí znovu — u 453 stránek po ~110 ms
 * je to zanedbatelné a ušetří to starost s neplatnými záznamy na disku.
 */

type Entry = { body: string; contentType: string };

/**
 * Strop je pojistka proti neomezenému růstu, ne ladicí parametr. Web má 453
 * adres, takže se za normálního provozu nedosáhne; kdyby ano, vyhazuje se
 * nejstarší záznam (`Map` drží pořadí vložení).
 */
const MAX_ENTRIES = 1500;

const cache = new Map<string, Entry>();

let hits = 0;
let misses = 0;

export function getCached(key: string): Entry | undefined {
	const entry = cache.get(key);

	if (entry) {
		hits += 1;
	} else {
		misses += 1;
	}

	return entry;
}

export function setCached(key: string, entry: Entry): void {
	if (cache.size >= MAX_ENTRIES) {
		const oldest = cache.keys().next().value;

		if (oldest !== undefined) {
			cache.delete(oldest);
		}
	}

	cache.set(key, entry);
}

/**
 * Zahodí celou cache.
 *
 * Zahazuje se všechno, ne jen dotčená stránka: uložení jednoho dokumentu se
 * může projevit kdekoli — článek se objeví ve výpisu, na úvodní stránce,
 * v RSS i v sitemapě, změna v nastavení webu úplně všude. Vyjmenovat závislosti
 * by šlo, ale platilo by se za to tím, že na jednu se dřív nebo později
 * zapomene a někde zůstane viset starý obsah. Přegenerování je levné.
 */
export function invalidateRenderCache(reason: string): void {
	const size = cache.size;

	cache.clear();

	for (const hook of hooks) {
		hook();
	}

	if (size > 0) {
		console.info(`[cache] Zahozeno ${size} stránek: ${reason}`);
	}
}

type Hook = () => void;

const hooks: Hook[] = [];

/**
 * Zaregistruje další cache, která se má zahodit spolu s vykreslenými
 * stránkami. Používá to `src/lib/data.ts` na výpisy kolekcí — bez toho by
 * první požadavek po každém uložení znovu procházel celou kolekci.
 */
export function onInvalidate(hook: Hook): void {
	hooks.push(hook);
}

/** Pro diagnostiku — kolik toho cache drží a jak jí to jde. */
export function renderCacheStats() {
	return { size: cache.size, hits, misses };
}
