import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const iconListBlockSchema: Template = {
	name: 'iconList',
	label: 'Seznam s ikonami',
	ui: { defaultItem: { icon: 'fa6-solid:check', items: [{ label: 'První položka' }] } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{
			type: 'string',
			name: 'icon',
			label: 'Výchozí ikona',
			description: 'Název ikony z Iconify, např. fa6-solid:check.',
		},
		{
			type: 'object',
			name: 'items',
			label: 'Položky',
			list: true,
			ui: {
				defaultItem: { label: 'Nová položka' },
				itemProps: (item: { label?: string }) => ({ label: item?.label ?? 'Položka' }),
			},
			fields: [
				{ type: 'string', name: 'label', label: 'Text' },
				{ type: 'string', name: 'href', label: 'Odkaz (nepovinný)' },
				{ type: 'string', name: 'icon', label: 'Vlastní ikona (nepovinná)' },
			],
		},
		{
			type: 'string',
			name: 'columns',
			label: 'Počet sloupců',
			options: [
				{ label: '1', value: '1' },
				{ label: '2', value: '2' },
				{ label: '3', value: '3' },
			],
		},
		...sectionFields(),
	],
};
