import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const cardLinksBlockSchema: Template = {
	name: 'cardLinks',
	label: 'Karty s odkazy (rozcestník)',
	ui: { defaultItem: { columns: '3', items: [{ title: 'Nová karta', href: '/' }] } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis sekce' },
		...headingFields(),
		{
			type: 'string',
			name: 'columns',
			label: 'Počet sloupců',
			options: [
				{ label: '2', value: '2' },
				{ label: '3', value: '3' },
				{ label: '4', value: '4' },
			],
		},
		{
			type: 'object',
			name: 'items',
			label: 'Karty',
			list: true,
			ui: {
				defaultItem: { title: 'Nová karta', href: '/' },
				itemProps: (item: { title?: string }) => ({ label: item?.title ?? 'Karta' }),
			},
			fields: [
				{ type: 'image', name: 'image', label: 'Obrázek' },
				{ type: 'string', name: 'title', label: 'Nadpis' },
				{ type: 'string', name: 'description', label: 'Text', ui: { component: 'textarea' } },
				{ type: 'string', name: 'href', label: 'Odkaz' },
				{ type: 'string', name: 'linkLabel', label: 'Popisek odkazu' },
			],
		},
		...sectionFields(),
	],
};
