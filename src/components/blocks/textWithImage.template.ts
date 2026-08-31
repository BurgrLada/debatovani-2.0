import type { Template } from 'tinacms';
import { buttonListField, headingFields, sectionFields } from './_shared';

export const textWithImageBlockSchema: Template = {
	name: 'textWithImage',
	label: 'Text s obrázkem',
	ui: { defaultItem: { imagePosition: 'right', background: 'none', padding: 'normal' } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{ type: 'rich-text', name: 'body', label: 'Text' },
		{ type: 'image', name: 'image', label: 'Obrázek' },
		{ type: 'string', name: 'alt', label: 'Popis obrázku (alt)' },
		{
			type: 'string',
			name: 'imagePosition',
			label: 'Obrázek',
			options: [
				{ label: 'Vpravo', value: 'right' },
				{ label: 'Vlevo', value: 'left' },
			],
		},
		{
			type: 'string',
			name: 'imageWidth',
			label: 'Šířka obrázku',
			options: [
				{ label: 'Poloviční', value: 'half' },
				{ label: 'Třetinová', value: 'third' },
				{ label: 'Dvě třetiny', value: 'two-thirds' },
			],
		},
		buttonListField(),
		...sectionFields(),
	],
};
