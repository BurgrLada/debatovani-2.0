// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import node from '@astrojs/node';
import tina from '@tinacms/astro/integration';
import { tinaAdminDevRedirect } from '@tinacms/astro/vite';
import tailwindcss from '@tailwindcss/vite';

import articleRedirects from './src/data/redirects.json' with { type: 'json' };

/**
 * Trvalá přesměrování ze starých WordPress adres.
 *
 * Články měly URL podle data (`/2026/08/21/slug/`), nový web je má pod
 * `/aktuality/slug/`. Bez přesměrování by se ztratily pozice ve vyhledávačích
 * i odkazy z cizích webů (docs/02, sekce 3). Mapu generuje
 * `scripts/migrate-articles.mjs`, takže se drží aktuální i po doběhnutí
 * migrace těsně před spuštěním.
 */
const redirects = {
	...articleRedirects,
	// Stránky, které v novém webu nahradila jiná routa nebo zanikly.
	'/prehled-aktualit/': '/aktuality/',
	'/home-pumori/': '/',
};

// **Obsahové stránky se vykreslují na vyžádání** (`prerender = false`) a Node
// proces jim před sebou drží cache vykresleného HTML (`src/middleware.ts`).
// Uložení v administraci cache zahodí, takže je změna vidět hned — původní
// statický build ji ukázal až po dalším nasazení, tedy za minuty.
//
// Cena je vědomá a jde proti docs/06 sekci 2: dřív web přežil pád Node
// procesu, teď s ním spadne taky. Zdůvodnění a ústupová cesta jsou v docs/18.
//
// `output: 'static'` zůstává, protože předgenerovat je pořád co — 404, portál
// a administrace. Routy, které čtou obsah, se z toho vyjímají jednotlivě.
export default defineConfig({
	site: process.env.SITE_URL ?? 'https://debatovani.cz',
	output: 'static',
	adapter: node({ mode: 'standalone' }),
	redirects,
	integrations: [
		mdx(),
		icon(),
		tina(),
	],
	build: { inlineStylesheets: 'always' },
	image: {
		layout: 'constrained',
		remotePatterns: [{ protocol: 'https', hostname: 'assets.tina.io' }],
	},
	vite: {
		plugins: [tailwindcss(), tinaAdminDevRedirect()],
		// Bez tohoto se @tinacms/astro resolvuje per-modul na každý studený
		// request a Vite pokaždé znovu kompiluje .astro zdroje balíčku.
		//
		// `tinacms` je tu z jiného důvodu: serverový build ho reálně potřebuje
		// jen kvůli `import 'tinacms/dist/client'` v `tina/database.ts` (přes
		// `@tinacms/datalayer`) — malému souboru bez vlastních závislostí. Když
		// zůstane externí, `pnpm prune --prod` musí v `node_modules` nechat celý
		// balíček i s Reactovou administrací a mermaidem (235 MB). Zabalením sem
		// se ten jeden soubor otiskne do výstupu a `tinacms` může do dev.
		ssr: { noExternal: ['@tinacms/astro', '@tinacms/bridge', 'tinacms'] },
	},
});
