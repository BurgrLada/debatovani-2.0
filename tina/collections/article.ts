import type { Collection } from 'tinacms';
import { DEFAULT_LANG } from '../../src/lib/i18n';
import { localizedRoute } from './routing';

/** Aktuality — 356 článků migrovaných z WordPressu. */
export const ArticleCollection: Collection = {
	name: 'article',
	label: 'Aktuality',
	path: 'src/content/article',
	format: 'mdx',
	defaultItem: () => ({ date: new Date().toISOString() }),
	ui: {
		// Aktuality zatím vycházejí jen česky — anglická routa neexistuje.
		router: ({ document }) =>
			localizedRoute(document._sys.breadcrumbs, (slug) => `/aktuality/${slug}/`, [
				DEFAULT_LANG,
			]),
		filename: {
			// Slug drží staré URL, aby po přechodu neztratily platnost odkazy
			// a pozice ve vyhledávačích.
			slugify: (values) =>
				(values?.title ?? '')
					.toLowerCase()
					.normalize('NFD')
					.replace(/[̀-ͯ]/g, '')
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, ''),
		},
	},
	fields: [
		{ type: 'string', name: 'title', label: 'Titulek', isTitle: true, required: true },
		{ type: 'datetime', name: 'date', label: 'Datum vydání', required: true },
		{ type: 'string', name: 'perex', label: 'Perex', ui: { component: 'textarea' } },
		{ type: 'image', name: 'cover', label: 'Úvodní obrázek' },
		{ type: 'string', name: 'coverAlt', label: 'Popis úvodního obrázku (alt)' },
		{ type: 'string', name: 'author', label: 'Autor' },
		{ type: 'string', name: 'categories', label: 'Rubriky', list: true },
		{ type: 'boolean', name: 'draft', label: 'Rozpracované (nepublikovat)' },
		{ type: 'rich-text', name: 'body', label: 'Text', isBody: true },
	],
};
