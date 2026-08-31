import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const accordionBlockSchema: Template = {
	name: 'accordion',
	label: 'Rozbalovací seznam (FAQ)',
	ui: { defaultItem: { items: [{ question: 'Otázka?' }] } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis sekce' },
		...headingFields(),
		{
			type: 'object',
			name: 'items',
			label: 'Položky',
			list: true,
			ui: {
				defaultItem: { question: 'Nová otázka' },
				itemProps: (item: { question?: string }) => ({ label: item?.question ?? 'Položka' }),
			},
			fields: [
				{ type: 'string', name: 'question', label: 'Otázka / nadpis' },
				{ type: 'rich-text', name: 'answer', label: 'Odpověď' },
			],
		},
		...sectionFields(),
	],
};
