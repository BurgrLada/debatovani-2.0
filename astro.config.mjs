// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
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

// Web je statický; jedinou routou na vyžádání je /tina-island (endpoint
// vizuální editace), kterou obsluhuje Node adaptér. Když Node proces spadne,
// staticky vygenerovaný web běží dál — viz docs/06, sekce 2.
export default defineConfig({
	site: process.env.SITE_URL ?? 'https://debatovani.cz',
	output: 'static',
	adapter: node({ mode: 'standalone' }),
	redirects,
	integrations: [
		mdx(),
		// Čeština běží na kořeni, angličtina pod `/en/`. Sitemap z toho poskládá
		// vzájemné `hreflang` odkazy u stránek, které mají obě jazykové verze.
		sitemap({ i18n: { defaultLocale: 'cs', locales: { cs: 'cs-CZ', en: 'en-GB' } } }),
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
		ssr: { noExternal: ['@tinacms/astro', '@tinacms/bridge'] },
	},
});
