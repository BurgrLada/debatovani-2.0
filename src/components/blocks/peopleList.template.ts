import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const peopleListBlockSchema: Template = {
	name: 'peopleList',
	label: 'Lidé',
	ui: { defaultItem: { columns: '4' } },
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis sekce' },
		...headingFields(),
		{
			type: 'string',
			name: 'group',
			label: 'Jen skupina',
			description: 'Např. „Výkonná rada“. Prázdné = všichni.',
		},
		{
			type: 'string',
			name: 'variant',
			label: 'Podoba',
			options: [
				{ label: 'Jen fotka a jméno', value: 'compact' },
				{ label: 'S funkcí nad fotkou a medailonkem', value: 'detailed' },
			],
		},
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
		...sectionFields(),
	],
};
