import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const articleListBlockSchema: Template = {
	name: 'articleList',
	label: 'Výpis aktualit',
	ui: { defaultItem: { title: 'Aktuality', limit: 3, showMore: true } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{ type: 'number', name: 'limit', label: 'Kolik článků zobrazit' },
		{
			type: 'string',
			name: 'category',
			label: 'Jen z rubriky (slug)',
			description: 'Prázdné = ze všech rubrik.',
		},
		{ type: 'boolean', name: 'showMore', label: 'Zobrazit odkaz na všechny aktuality' },
		...sectionFields(),
	],
};
