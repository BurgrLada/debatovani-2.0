/**
 * Sitemapa.
 *
 * Dřív ji skládal `@astrojs/sitemap` při buildu z vygenerovaných HTML souborů.
 * Od přechodu na vykreslování na vyžádání žádné nevznikají, takže by byla
 * prázdná — musí se poskládat z indexu.
 *
 * Vedlejší zisk: sitemapa je teď vždycky aktuální. Dřív byla stará jako
 * poslední build, takže čerstvý článek v ní chvíli chyběl.
 *
 * Vzájemné `hreflang` odkazy se drží stejným pravidlem jako zbytek webu:
 * **překladový pár je stejná cesta v druhé jazykové složce** (docs/15,
 * sekce 4). Kde protějšek není, `hreflang` se nevypisuje — částečný překlad
 * je normální stav, ne chyba.
 */
import type { APIRoute } from 'astro';
import { listArticles, listPages } from '../lib/data';

export const prerender = false;

type Entry = { path: string; alternate?: { lang: string; path: string } };

const escape = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
	const origin = (site ?? new URL('https://debatovani.cz')).origin;

	const [pagesCs, pagesEn, articlesCs, articlesEn] = await Promise.all([
		listPages('cs'),
		listPages('en'),
		listArticles('cs'),
		listArticles('en'),
	]);

	const englishPaths = new Set(pagesEn.map((page) => page.path));
	const czechPaths = new Set(pagesCs.map((page) => page.path));

	const entries: Entry[] = [];

	// Úvodní stránky. `home` má vlastní routu na kořeni, proto se z výpisů
	// stránek vyřazuje a přidává ručně.
	entries.push({ path: '/', alternate: { lang: 'en-GB', path: '/en/' } });
	entries.push({ path: '/en/', alternate: { lang: 'cs-CZ', path: '/' } });

	for (const page of pagesCs) {
		if (page.path === 'home') continue;

		entries.push({
			path: `/${page.path}/`,
			...(englishPaths.has(page.path)
				? { alternate: { lang: 'en-GB', path: `/en/${page.path}/` } }
				: {}),
		});
	}

	for (const page of pagesEn) {
		if (page.path === 'home') continue;

		entries.push({
			path: `/en/${page.path}/`,
			...(czechPaths.has(page.path)
				? { alternate: { lang: 'cs-CZ', path: `/${page.path}/` } }
				: {}),
		});
	}

	// Výpisy aktualit včetně stránkování — stejná velikost strany jako routy.
	const listing = (base: string, count: number) => {
		const last = Math.max(1, Math.ceil(count / 12));

		for (let n = 1; n <= last; n += 1) {
			entries.push({ path: n === 1 ? base : `${base}${n}/` });
		}
	};

	listing('/aktuality/', articlesCs.length);
	listing('/en/aktuality/', articlesEn.length);

	// Články samotné. Anglické nejsou překlady českých, ale původní texty
	// z Debate League, takže se nepárují (docs/15, sekce 4).
	for (const article of articlesCs) {
		entries.push({ path: `/aktuality/${article.slug}/` });
	}

	for (const article of articlesEn) {
		entries.push({ path: `/en/aktuality/${article.slug}/` });
	}

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...entries.map((entry) => {
			const alternate = entry.alternate
				? `<xhtml:link rel="alternate" hreflang="${entry.alternate.lang}" href="${escape(origin + entry.alternate.path)}"/>`
				: '';

			return `<url><loc>${escape(origin + entry.path)}</loc>${alternate}</url>`;
		}),
		'</urlset>',
	].join('\n');

	return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
