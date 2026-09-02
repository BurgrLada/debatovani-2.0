/**
 * Obsluha cache vykreslených stránek.
 *
 * Stránky se od přechodu na okamžitou publikaci vykreslují na vyžádání
 * (`src/lib/render-cache.ts` vysvětluje proč). Bez cache by každý požadavek
 * znamenal dotaz do indexu a vykreslení komponent — řádově 100 ms. S ní je
 * druhé a další načtení stejně rychlé jako dřív statický soubor.
 *
 * Ukládá se jen to, co je pro všechny návštěvníky stejné:
 *  - metoda `GET` a odpověď 200,
 *  - adresa **bez query stringu** — parametry mění výsledek a klíčovat podle
 *    nich by z cache udělala smetiště, které jde zvenčí libovolně nafouknout,
 *  - žádná administrace: `/admin`, `/api/*` ani `/tina-island` sem nepatří,
 *    první dvě jsou za přihlášením a `/tina-island` vrací rozdělaný obsah.
 *
 * Statické soubory (`/media`, `/_astro`) middleware neřeší — ty servíruje
 * adaptér ze souborového systému dřív, než se sem požadavek dostane.
 */
import type { MiddlewareHandler } from 'astro';
import { getCached, setCached } from './lib/render-cache';

/** Cesty, které patří administraci, ne veřejnému webu. */
const PRIVATE_PREFIXES = ['/admin', '/api/', '/tina-island'];

const isCacheable = (pathname: string) =>
	!PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

export const onRequest: MiddlewareHandler = async (context, next) => {
	const { request, url } = context;

	if (request.method !== 'GET' || url.search || !isCacheable(url.pathname)) {
		return next();
	}

	const cached = getCached(url.pathname);

	if (cached) {
		return new Response(cached.body, {
			status: 200,
			headers: { 'content-type': cached.contentType, 'x-render-cache': 'hit' },
		});
	}

	const response = await next();

	if (response.status !== 200) {
		return response;
	}

	const contentType = response.headers.get('content-type') ?? '';

	// Jen textové odpovědi, které vznikly vykreslením. Obrázek nebo soubor ke
	// stažení by cache nafoukl a nic by to neušetřilo — ty servíruje adaptér.
	if (!/^(text\/html|application\/xml|text\/xml|application\/json|application\/rss)/.test(contentType)) {
		return response;
	}

	// Tělo se čte celé, takže se odpověď musí složit znovu — `Response` jde
	// přečíst jen jednou.
	const body = await response.text();

	setCached(url.pathname, { body, contentType });

	const headers = new Headers(response.headers);
	headers.set('x-render-cache', 'miss');

	return new Response(body, { status: 200, headers });
};
