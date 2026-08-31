import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const embedBlockSchema: Template = {
	name: 'embed',
	label: 'Vložený obsah (video, mapa, Padlet)',
	ui: { defaultItem: { ratio: '16-9' } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{
			type: 'string',
			name: 'url',
			label: 'Adresa k vložení',
			description: 'YouTube, Google Maps, Padlet… U YouTube stačí běžný odkaz na video.',
		},
		{
			type: 'string',
			name: 'ratio',
			label: 'Poměr stran',
			options: [
				{ label: '16:9 (video)', value: '16-9' },
				{ label: '4:3', value: '4-3' },
				{ label: 'Na výšku', value: 'tall' },
			],
		},
		...sectionFields(),
	],
};
