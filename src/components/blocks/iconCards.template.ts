import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const iconCardsBlockSchema: Template = {
	name: 'iconCards',
	label: 'Karty s ikonou',
	ui: {
		defaultItem: {
			columns: '3',
			items: [
				{ icon: 'fa6-solid:brain', title: 'Kritické myšlení' },
				{ icon: 'fa6-solid:bullhorn', title: 'Mediální gramotnost' },
				{ icon: 'fa6-solid:comments', title: 'Argumentace' },
			],
		},
	},
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis sekce' },
		...headingFields(),
		{ type: 'string', name: 'intro', label: 'Úvodní text', ui: { component: 'textarea' } },
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
				defaultItem: { icon: 'fa6-solid:star', title: 'Nadpis karty' },
				itemProps: (item: { title?: string }) => ({ label: item?.title ?? 'Karta' }),
			},
			fields: [
				{
					type: 'string',
					name: 'icon',
					label: 'Ikona',
					description: 'Název ikony z Iconify, např. fa6-solid:brain. Prázdné = bez ikony.',
				},
				{ type: 'image', name: 'image', label: 'Obrázek místo ikony' },
				{ type: 'string', name: 'title', label: 'Nadpis' },
				{ type: 'rich-text', name: 'text', label: 'Text' },
				{ type: 'string', name: 'href', label: 'Odkaz (nepovinný)' },
			],
		},
		...sectionFields(),
	],
};
