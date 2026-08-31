import type { Template } from 'tinacms';
import { alignField, sectionFields } from './_shared';

export const imageBlockSchema: Template = {
	name: 'imageBlock',
	label: 'Obrázek',
	ui: { defaultItem: { align: 'center', size: 'full' } },
	fields: [
		{ type: 'image', name: 'image', label: 'Obrázek' },
		{ type: 'string', name: 'alt', label: 'Popis obrázku (alt)' },
		{ type: 'string', name: 'caption', label: 'Titulek pod obrázkem' },
		{ type: 'string', name: 'href', label: 'Odkaz (nepovinný)' },
		alignField(),
		{
			type: 'string',
			name: 'size',
			label: 'Velikost',
			options: [
				{ label: 'Plná šířka', value: 'full' },
				{ label: 'Střední', value: 'medium' },
				{ label: 'Malá', value: 'small' },
			],
		},
		...sectionFields(),
	],
};
