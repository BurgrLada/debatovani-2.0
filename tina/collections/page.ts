import type { Collection } from 'tinacms';
import { pageBlocks } from './blocks';
import { localizedRoute } from './routing';

/**
 * Obsahové stránky.
 *
 * Cesta souboru je zároveň URL: `src/content/page/cs/o-nas/lide.mdx`
 * → `/o-nas/lide/`. Jazyk je první úroveň adresáře, aby se dala anglická
 * verze doplnit bez přejmenovávání (docs/06, sekce 4).
 */
export const PageCollection: Collection = {
	name: 'page',
	label: 'Stránky',
	path: 'src/content/page',
	format: 'mdx',
	ui: {
		router: ({ document }) =>
			localizedRoute(document._sys.breadcrumbs, (path) =>
				path === 'home' ? '/' : `/${path}/`,
			),
	},
	fields: [
		{
			type: 'string',
			name: 'title',
			label: 'Název stránky',
			isTitle: true,
			required: true,
			description: 'Používá se v drobečkové navigaci a jako výchozí titulek v prohlížeči.',
		},
		{
			type: 'object',
			name: 'seo',
			label: 'SEO',
			fields: [
				{ type: 'string', name: 'title', label: 'Titulek pro vyhledávače' },
				{ type: 'string', name: 'description', label: 'Popis', ui: { component: 'textarea' } },
				{ type: 'image', name: 'image', label: 'Náhledový obrázek pro sdílení' },
				{ type: 'boolean', name: 'noindex', label: 'Skrýt před vyhledávači' },
			],
		},
		{
			type: 'object',
			list: true,
			name: 'blocks',
			label: 'Sekce stránky',
			description: 'Viditelný obsah stránky. Sekce jde přetahovat a měnit jejich pořadí.',
			ui: { visualSelector: true },
			templates: pageBlocks,
		},
	],
};
