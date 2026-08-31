import type { Template } from 'tinacms';
import { headingFields, sectionFields } from './_shared';

export const upcomingEventsBlockSchema: Template = {
	name: 'upcomingEvents',
	label: 'Nejbližší akce (z debata21)',
	ui: {
		defaultItem: { title: 'Aktuální události', limit: 3, background: 'alt' },
		itemProps: () => ({ label: 'Nejbližší akce' }),
	},
	fields: [
		{ type: 'string', name: 'title', label: 'Nadpis' },
		...headingFields(),
		{ type: 'string', name: 'intro', label: 'Úvodní text', ui: { component: 'textarea' } },
		{
			type: 'number',
			name: 'limit',
			label: 'Kolik akcí zobrazit',
			description: 'Prázdné = všechny nadcházející.',
		},
		{ type: 'string', name: 'emptyText', label: 'Text, když žádná akce neběží' },
		...sectionFields(),
	],
};
