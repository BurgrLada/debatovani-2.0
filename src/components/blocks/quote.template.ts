import type { Template } from 'tinacms';
import { sectionFields } from './_shared';

export const quoteBlockSchema: Template = {
	name: 'quote',
	label: 'Citace',
	fields: [
		{ type: 'string', name: 'quote', label: 'Text citace', ui: { component: 'textarea' } },
		{ type: 'string', name: 'author', label: 'Autor' },
		{ type: 'string', name: 'role', label: 'Role / škola' },
		{ type: 'image', name: 'photo', label: 'Fotka' },
		...sectionFields(),
	],
};
