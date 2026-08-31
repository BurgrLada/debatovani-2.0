import type { Template } from 'tinacms';
import { alignField, headingFields, sectionFields } from './_shared';

export const richTextBlockSchema: Template = {
	name: 'richText',
	label: 'Text',
	ui: { defaultItem: { background: 'none', padding: 'normal', width: 'normal' } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis sekce' },
		...headingFields(),
		{ type: 'rich-text', name: 'body', label: 'Text' },
		alignField('align', 'Zarovnání textu'),
		{
			type: 'string',
			name: 'width',
			label: 'Šířka textu',
			options: [
				{ label: 'Plná', value: 'normal' },
				{ label: 'Zúžená (lepší čitelnost)', value: 'narrow' },
			],
		},
		...sectionFields(),
	],
};
