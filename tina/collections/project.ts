import type { Collection } from 'tinacms';
import { pageBlocks } from './blocks';
import { DEFAULT_LANG } from '../../src/lib/i18n';
import { localizedRoute } from './routing';

/** Projekty — důležité kvůli povinné publicitě grantů. */
export const ProjectCollection: Collection = {
	name: 'project',
	label: 'Projekty',
	path: 'src/content/project',
	format: 'mdx',
	ui: {
		// Projekty vycházejí jen česky — anglická routa neexistuje.
		router: ({ document }) =>
			localizedRoute(document._sys.breadcrumbs, (slug) => `/projekty/${slug}/`, [
				DEFAULT_LANG,
			]),
	},
	fields: [
		{ type: 'string', name: 'title', label: 'Název projektu', isTitle: true, required: true },
		{ type: 'string', name: 'period', label: 'Období realizace' },
		{ type: 'string', name: 'donor', label: 'Donor / zdroj financování' },
		{ type: 'image', name: 'logo', label: 'Logo programu' },
		{ type: 'string', name: 'perex', label: 'Perex', ui: { component: 'textarea' } },
		{
			type: 'string',
			name: 'status',
			label: 'Stav',
			options: [
				{ label: 'Probíhá', value: 'active' },
				{ label: 'Dokončený', value: 'done' },
			],
		},
		{ type: 'object', list: true, name: 'blocks', label: 'Sekce stránky', templates: pageBlocks },
	],
};
