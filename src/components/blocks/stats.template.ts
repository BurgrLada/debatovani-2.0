import type { Template } from 'tinacms';
import { buttonListField, headingFields, sectionFields } from './_shared';

export const statsBlockSchema: Template = {
	name: 'stats',
	label: 'Čísla / statistiky',
	ui: {
		defaultItem: {
			items: [
				{ value: '628', label: 'odehraných debat' },
				{ value: '400', label: 'členů' },
				{ value: '44', label: 'debatních klubů' },
			],
		},
	},
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{ type: 'string', name: 'eyebrow', label: 'Popisek nad nadpisem' },
		{ type: 'rich-text', name: 'text', label: 'Text vedle čísel' },
		{
			type: 'string',
			name: 'layout',
			label: 'Rozvržení',
			options: [
				{ label: 'Čísla vedle sebe, text pod nimi', value: 'row' },
				{ label: 'Čísla pod sebou, text vedle nich', value: 'column' },
			],
		},
		{ type: 'boolean', name: 'titleUppercase', label: 'Nadpis verzálkami' },
		{
			type: 'object',
			name: 'items',
			label: 'Čísla',
			list: true,
			ui: {
				defaultItem: { value: '0', label: 'popisek' },
				itemProps: (item: { value?: string; label?: string }) => ({
					label: `${item?.value ?? ''} ${item?.label ?? ''}`.trim() || 'Číslo',
				}),
			},
			fields: [
				{ type: 'string', name: 'value', label: 'Číslo' },
				{ type: 'string', name: 'suffix', label: 'Přípona (např. +, %)' },
				{ type: 'string', name: 'label', label: 'Popisek' },
			],
		},
		buttonListField(),
		...sectionFields(),
	],
};
